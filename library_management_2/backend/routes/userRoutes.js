const express = require("express");
const router = express.Router();
const {
    getProfile,
    updateProfile,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getAllUsers
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// User Profile
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// User Notifications
router.get("/notifications", protect, getNotifications);
router.put("/notifications/read-all", protect, markAllNotificationsRead);
router.put("/notifications/:id/read", protect, markNotificationRead);

// Admin-only user list
router.get("/", protect, adminOnly, getAllUsers);

module.exports = router;
