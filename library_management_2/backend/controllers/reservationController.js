const Reservation = require("../models/Reservation");
const Resource = require("../models/Resource");
const Queue = require("../models/Queue");
const Notification = require("../models/Notification");

// Helper to convert HH:MM to minutes
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
};

const formatMinutesToTime = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Auto-update expired active reservations
const autoUpdateExpired = async () => {
    try {
        const now = new Date();
        const activeReservations = await Reservation.find({ status: "active" });

        for (const res of activeReservations) {
            if (!res.date || !res.time) continue;
            const dateParts = res.date.split("-").map(Number);
            const timeParts = res.time.split(":").map(Number);
            const duration = Number(res.duration) || 1;
            const endDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0] + duration, timeParts[1], 0);

            if (now >= endDateTime) {
                res.status = "completed";
                await res.save();
            }
        }
    } catch (e) {
        console.error("Error auto-updating expired reservations:", e.message);
    }
};

// @desc    Get user reservations or all (if admin)
// @route   GET /api/reservations
// @access  Private (JWT protected)
exports.getReservations = async (req, res, next) => {
    try {
        await autoUpdateExpired();

        const { status, all } = req.query;
        let query = {};

        // If not admin, or if student, only show user's own reservations
        if (req.user.role !== "admin" || (all !== "true" && req.query.mine === "true")) {
            query.userId = { $in: [req.user._id, String(req.user._id)] };
        }

        if (status && status !== "all") {
            query.status = status;
        }

        const reservations = await Reservation.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: reservations.length,
            data: reservations
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get occupied slots for a resource on a specific date
// @route   GET /api/reservations/slots
// @access  Public
exports.getOccupiedSlots = async (req, res, next) => {
    try {
        await autoUpdateExpired();
        const { resourceId, date } = req.query;

        if (!resourceId || !date) {
            return res.status(400).json({ success: false, message: "resourceId and date are required." });
        }

        const activeReservations = await Reservation.find({
            $or: [{ resourceId: resourceId }, { resourceId: String(resourceId) }],
            date: date,
            status: "active"
        });

        const slots = activeReservations.map(r => {
            const startM = parseTimeToMinutes(r.time);
            const endM = startM + Number(r.duration) * 60;
            return {
                id: r._id,
                time: r.time,
                duration: r.duration,
                endTime: formatMinutesToTime(endM)
            };
        }).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

        res.json({ success: true, count: slots.length, data: slots });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new reservation
// @route   POST /api/reservations
// @access  Private (JWT protected)
exports.createReservation = async (req, res, next) => {
    try {
        await autoUpdateExpired();

        const { resourceId, date, time, duration } = req.body;

        if (!resourceId || !date || !time) {
            return res.status(400).json({ success: false, message: "Please provide resourceId, date, and start time." });
        }

        const durationNum = Number(duration) || 1;
        if (durationNum < 1 || durationNum > 8) {
            return res.status(400).json({ success: false, message: "Duration must be between 1 and 8 hours." });
        }

        // Strict past date/time check
        const now = new Date();
        const dateParts = date.split("-").map(Number);
        const timeParts = time.split(":").map(Number);
        const selectedDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0);

        if (selectedDateTime <= now) {
            return res.status(400).json({
                success: false,
                message: "Cannot book a reservation for a past date or time. Please choose an upcoming slot."
            });
        }

        // Find resource
        let resource;
        if (!isNaN(resourceId)) {
            resource = await Resource.findOne({ legacyId: Number(resourceId) });
        }
        if (!resource) {
            resource = await Resource.findById(resourceId).catch(() => null);
        }

        if (!resource) {
            return res.status(404).json({ success: false, message: "Selected resource not found." });
        }

        if (resource.status === "Maintenance") {
            return res.status(400).json({ success: false, message: "This resource is currently under maintenance." });
        }

        // Check for time slot overlap
        const startMin = parseTimeToMinutes(time);
        const endMin = startMin + durationNum * 60;

        const activeReservations = await Reservation.find({
            $or: [{ resourceId: resource.legacyId }, { resourceId: resource._id }, { resourceId: String(resourceId) }],
            date: date,
            status: "active"
        });

        for (const existing of activeReservations) {
            const exStartMin = parseTimeToMinutes(existing.time);
            const exEndMin = exStartMin + Number(existing.duration) * 60;

            if (startMin < exEndMin && exStartMin < endMin) {
                return res.status(409).json({
                    success: false,
                    message: `Conflict: ${resource.name} is already reserved from ${existing.time} to ${formatMinutesToTime(exEndMin)} on ${date}. Please pick another time.`,
                    conflictWith: {
                        start: existing.time,
                        end: formatMinutesToTime(exEndMin)
                    }
                });
            }
        }

        // Create reservation
        const newReservation = await Reservation.create({
            userId: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            resourceId: resource.legacyId || resource._id,
            resourceName: resource.name,
            category: resource.category,
            location: resource.location,
            date,
            time,
            duration: durationNum,
            status: "active"
        });

        // Create user notification
        await Notification.create({
            userId: req.user._id,
            title: "Reservation Confirmed",
            message: `Your reservation for "${resource.name}" on ${date} at ${time} is confirmed.`,
            type: "reservation"
        });

        res.status(201).json({
            success: true,
            message: "Reservation confirmed successfully!",
            data: newReservation
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel reservation (auto-promotes queue if waiting)
// @route   PUT /api/reservations/:id/cancel
// @access  Private (JWT protected)
exports.cancelReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reservation = await Reservation.findById(id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: "Reservation not found." });
        }

        // Verify permission: user owns it or is admin
        const isOwner = String(reservation.userId) === String(req.user._id);
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: "Not authorized to cancel this reservation." });
        }

        reservation.status = "cancelled";
        await reservation.save();

        // Check if anyone is waiting in queue for this resource
        const resId = reservation.resourceId;
        const resIdQueries = [resId, String(resId)];
        if (!isNaN(resId)) resIdQueries.push(Number(resId));

        // Prioritize candidates waiting for this exact date first
        let waitingQueue = await Queue.find({
            resourceId: { $in: resIdQueries },
            date: reservation.date,
            status: "waiting"
        }).sort({ priority: -1, createdAt: 1 });

        // If none found for this exact date, check any waiting candidate for this resource
        if (waitingQueue.length === 0) {
            waitingQueue = await Queue.find({
                resourceId: { $in: resIdQueries },
                status: "waiting"
            }).sort({ priority: -1, createdAt: 1 });
        }

        let promotedUser = null;
        if (waitingQueue.length > 0) {
            const nextCandidate = waitingQueue[0];
            nextCandidate.status = "served";
            await nextCandidate.save();

            // Auto-create reservation for next in line
            const bookingDate = nextCandidate.date || reservation.date;
            const bookingTime = nextCandidate.time || reservation.time;
            const bookingDuration = nextCandidate.duration || reservation.duration;

            const promotedRes = await Reservation.create({
                userId: nextCandidate.userId,
                userName: nextCandidate.userName,
                userEmail: nextCandidate.userEmail,
                resourceId: reservation.resourceId,
                resourceName: reservation.resourceName,
                category: reservation.category,
                location: reservation.location,
                date: bookingDate,
                time: bookingTime,
                duration: bookingDuration,
                status: "active",
                fromQueue: true
            });

            // Notify promoted user
            await Notification.create({
                userId: nextCandidate.userId,
                title: "Queue Spot Assigned!",
                message: `A slot opened for "${reservation.resourceName}"! Your reservation has been automatically booked for ${bookingDate} at ${bookingTime}.`,
                type: "queue"
            });

            promotedUser = nextCandidate.userName;
        }

        res.json({
            success: true,
            message: promotedUser
                ? `Reservation cancelled. Next student in queue (${promotedUser}) was automatically promoted!`
                : "Reservation cancelled successfully.",
            data: reservation
        });
    } catch (error) {
        next(error);
    }
};
