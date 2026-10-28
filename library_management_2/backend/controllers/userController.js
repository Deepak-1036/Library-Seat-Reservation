const User = require("../models/User");
const Reservation = require("../models/Reservation");
const Queue = require("../models/Queue");
const Notification = require("../models/Notification");

// @desc    Get user profile and statistics
// @route   GET /api/users/profile
// @access  Private (JWT protected)
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("-password -resetPasswordOtp -resetPasswordExpires");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const reservations = await Reservation.find({
            userId: { $in: [user._id, String(user._id)] }
        });
        const activeReservations = reservations.filter(r => r.status === "active").length;
        const completedReservations = reservations.filter(r => r.status === "completed").length;

        const queueCount = await Queue.countDocuments({
            userId: { $in: [user._id, String(user._id)] },
            status: "waiting"
        });

        res.json({
            success: true,
            data: {
                user: user.toSafeObject(),
                stats: {
                    totalReservations: reservations.length,
                    activeReservations,
                    completedReservations,
                    queueCount
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private (JWT protected)
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email, studentId } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (name) user.name = name.trim();
        if (studentId !== undefined) user.studentId = studentId.trim();

        if (email && email.trim().toLowerCase() !== user.email) {
            const normalizedEmail = email.trim().toLowerCase();
            const emailInUse = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
            if (emailInUse) {
                return res.status(400).json({ success: false, message: "This email is already in use by another account." });
            }
            user.email = normalizedEmail;
        }

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully.",
            data: user.toSafeObject()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private (JWT protected)
exports.getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({
            userId: { $in: [req.user._id, String(req.user._id)] }
        }).sort({ createdAt: -1 });

        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.json({
            success: true,
            count: notifications.length,
            unreadCount,
            data: notifications
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private (JWT protected)
exports.markNotificationRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            userId: { $in: [req.user._id, String(req.user._id)] }
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        notification.isRead = true;
        await notification.save();

        res.json({ success: true, message: "Notification marked as read." });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/users/notifications/read-all
// @access  Private (JWT protected)
exports.markAllNotificationsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { userId: { $in: [req.user._id, String(req.user._id)] } },
            { $set: { isRead: true } }
        );

        res.json({ success: true, message: "All notifications marked as read." });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select("-password -resetPasswordOtp -resetPasswordExpires").sort({ createdAt: -1 });
        res.json({
            success: true,
            count: users.length,
            data: users.map(u => u.toSafeObject())
        });
    } catch (error) {
        next(error);
    }
};
