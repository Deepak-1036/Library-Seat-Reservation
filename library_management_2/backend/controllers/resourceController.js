const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");

// Helper to check if resource has active reservation right now
const isResourceInUseNow = async (resourceId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const activeToday = await Reservation.find({
        $or: [{ resourceId: resourceId }, { resourceId: String(resourceId) }],
        date: todayStr,
        status: "active"
    });

    return activeToday.some(r => {
        const [h, m] = r.time.split(":").map(Number);
        const startMin = (h || 0) * 60 + (m || 0);
        const endMin = startMin + (Number(r.duration) || 1) * 60;
        return currentMin >= startMin && currentMin < endMin;
    });
};

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public
exports.getResources = async (req, res, next) => {
    try {
        const { search, category, status } = req.query;
        let query = {};

        if (category && category !== "all") {
            query.category = category;
        }

        if (status && status !== "all") {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ];
        }

        let resources = await Resource.find(query).sort({ legacyId: 1, createdAt: 1 });

        // Augment with realtime usage status
        const augmented = await Promise.all(resources.map(async (doc) => {
            const obj = doc.toObject();
            obj.id = doc.legacyId || doc._id;
            obj.inUse = await isResourceInUseNow(doc.legacyId || doc._id);
            return obj;
        }));

        res.json({
            success: true,
            count: augmented.length,
            data: augmented
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single resource by ID
// @route   GET /api/resources/:id
// @access  Public
exports.getResourceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        let resource;

        if (!isNaN(id)) {
            resource = await Resource.findOne({ legacyId: Number(id) });
        }
        if (!resource) {
            resource = await Resource.findById(id).catch(() => null);
        }

        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }

        const obj = resource.toObject();
        obj.id = resource.legacyId || resource._id;
        obj.inUse = await isResourceInUseNow(obj.id);

        res.json({ success: true, data: obj });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new resource
// @route   POST /api/resources
// @access  Private (Admin only)
exports.createResource = async (req, res, next) => {
    try {
        const { name, category, location, description, status, capacity } = req.body;

        if (!name || !category || !location) {
            return res.status(400).json({ success: false, message: "Name, category, and location are required." });
        }

        // Generate next legacyId
        const count = await Resource.countDocuments();
        const legacyId = count + 1;

        const resource = await Resource.create({
            name: name.trim(),
            category,
            location: location.trim(),
            description: description || "",
            status: status || "Available",
            capacity: capacity || 1,
            legacyId
        });

        const obj = resource.toObject();
        obj.id = resource.legacyId || resource._id;

        res.status(201).json({
            success: true,
            message: "Resource created successfully",
            data: obj
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private (Admin only)
exports.updateResource = async (req, res, next) => {
    try {
        const { id } = req.params;
        let resource;

        if (!isNaN(id)) {
            resource = await Resource.findOne({ legacyId: Number(id) });
        }
        if (!resource) {
            resource = await Resource.findById(id).catch(() => null);
        }

        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }

        const { name, category, location, description, status, capacity } = req.body;
        if (name) resource.name = name.trim();
        if (category) resource.category = category;
        if (location) resource.location = location.trim();
        if (description !== undefined) resource.description = description;
        if (status) resource.status = status;
        if (capacity) resource.capacity = capacity;

        await resource.save();

        const obj = resource.toObject();
        obj.id = resource.legacyId || resource._id;

        res.json({
            success: true,
            message: "Resource updated successfully",
            data: obj
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private (Admin only)
exports.deleteResource = async (req, res, next) => {
    try {
        const { id } = req.params;
        let resource;

        if (!isNaN(id)) {
            resource = await Resource.findOneAndDelete({ legacyId: Number(id) });
        }
        if (!resource) {
            resource = await Resource.findByIdAndDelete(id).catch(() => null);
        }

        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }

        res.json({
            success: true,
            message: "Resource deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
