const Queue = require("../models/Queue");
const Resource = require("../models/Resource");
const Notification = require("../models/Notification");

// @desc    Get queue requests
// @route   GET /api/queue
// @access  Private (JWT protected)
exports.getQueue = async (req, res, next) => {
    try {
        const { resourceId, mine, status } = req.query;
        let query = {};

        // Filter by status if specified, otherwise include waiting and served for visibility
        if (status && status !== "all") {
            query.status = status;
        }

        // Students can see full queue or their own
        if (mine === "true" || req.user.role === "student") {
            if (mine === "true") {
                query.userId = { $in: [req.user._id, String(req.user._id)] };
            }
        }

        if (resourceId) {
            query.resourceId = { $in: [resourceId, String(resourceId), Number(resourceId)] };
        }

        const queueList = await Queue.find(query).sort({ status: 1, priority: -1, createdAt: 1 });

        res.json({
            success: true,
            count: queueList.length,
            data: queueList
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Join the waiting queue with preferred date & time slot
// @route   POST /api/queue
// @access  Private (JWT protected)
exports.joinQueue = async (req, res, next) => {
    try {
        const { resourceId, date, time, duration, reason, priority } = req.body;

        if (!resourceId) {
            return res.status(400).json({ success: false, message: "resourceId is required." });
        }

        // Find resource details
        let resource;
        if (!isNaN(resourceId)) {
            resource = await Resource.findOne({ legacyId: Number(resourceId) });
        }
        if (!resource) {
            resource = await Resource.findById(resourceId).catch(() => null);
        }

        const normalizedResId = resource ? (resource.legacyId || resource._id) : resourceId;
        const resourceName = resource ? resource.name : `Resource #${resourceId}`;

        // Check if user already waiting for this resource on this date
        const existingWaiting = await Queue.findOne({
            userId: { $in: [req.user._id, String(req.user._id)] },
            resourceId: { $in: [normalizedResId, String(normalizedResId), Number(normalizedResId)] },
            ...(date ? { date } : {}),
            status: "waiting"
        });

        if (existingWaiting) {
            return res.status(400).json({
                success: false,
                message: `You are already on the waiting list for ${resourceName}${date ? ` on ${date}` : ""}.`
            });
        }

        // Compute priority: faculty defaults to 3, urgent requests 2, normal 1
        let calcPriority = Number(priority) || 1;
        if (req.user.role === "faculty" && calcPriority < 3) {
            calcPriority = 3;
        }

        // Today's date fallback if not supplied
        let targetDate = date;
        if (!targetDate) {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            targetDate = `${y}-${m}-${d}`;
        }

        let targetTime = time || "10:00";
        let targetDuration = Number(duration) || 1;

        const newQueueItem = await Queue.create({
            userId: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            studentId: req.user.studentId || "",
            resourceId: normalizedResId,
            resourceName,
            date: targetDate,
            time: targetTime,
            duration: targetDuration,
            reason: reason || "Auto-waitlist from reservation conflict",
            priority: calcPriority,
            status: "waiting"
        });

        // Calculate queue position
        const aheadCount = await Queue.countDocuments({
            resourceId: { $in: [normalizedResId, String(normalizedResId), Number(normalizedResId)] },
            status: "waiting",
            $or: [
                { priority: { $gt: calcPriority } },
                { priority: calcPriority, createdAt: { $lt: newQueueItem.createdAt } }
            ]
        });

        const queuePosition = aheadCount + 1;

        res.status(201).json({
            success: true,
            message: `Successfully joined waitlist for ${resourceName} on ${targetDate} at ${targetTime}! You are #${queuePosition} in line.`,
            position: queuePosition,
            data: newQueueItem
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel / Leave queue
// @route   DELETE /api/queue/:id
// @access  Private (JWT protected)
exports.cancelQueue = async (req, res, next) => {
    try {
        const { id } = req.params;
        const queueItem = await Queue.findById(id);

        if (!queueItem) {
            return res.status(404).json({ success: false, message: "Queue entry not found." });
        }

        const isOwner = String(queueItem.userId) === String(req.user._id);
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: "Not authorized to cancel this queue request." });
        }

        queueItem.status = "cancelled";
        await queueItem.save();

        res.json({
            success: true,
            message: "Removed from waiting list successfully."
        });
    } catch (error) {
        next(error);
    }
};
