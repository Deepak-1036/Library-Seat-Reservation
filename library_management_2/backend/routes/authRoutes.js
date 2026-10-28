const express = require("express");
const router = express.Router();
const {
    register,
    login,
    googleLogin,
    forgotPassword,
    resetPassword,
    getMe
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/me", protect, getMe);

module.exports = router;
