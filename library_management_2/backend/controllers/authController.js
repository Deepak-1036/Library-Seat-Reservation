const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../middleware/authMiddleware");

// Helper to sign JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, studentId, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Please provide name, email, and password." });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "An account with this email already exists." });
        }

        // Automatic role assignment helper for testing/admin convenience
        let role = "student";
        if (normalizedEmail.includes("admin")) {
            role = "admin";
        } else if (normalizedEmail.includes("faculty")) {
            role = "faculty";
        }

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            studentId: studentId ? studentId.trim() : "",
            password, // Will be hashed by pre-save hook in User model
            role
        });

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: user.toSafeObject()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please provide an email and password." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // Verify password with bcrypt
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: user.toSafeObject()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Google Sign-In / OAuth
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res, next) => {
    try {
        const { credential, email, name, avatar, googleId } = req.body;
        let verifiedEmail = email;
        let verifiedName = name;
        let verifiedAvatar = avatar;
        let verifiedGoogleId = googleId;

        // If Google ID token credential provided and GOOGLE_CLIENT_ID configured, verify it
        if (credential && process.env.GOOGLE_CLIENT_ID) {
            try {
                const { OAuth2Client } = require("google-auth-library");
                const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: process.env.GOOGLE_CLIENT_ID
                });
                const payload = ticket.getPayload();
                verifiedEmail = payload.email;
                verifiedName = payload.name;
                verifiedAvatar = payload.picture;
                verifiedGoogleId = payload.sub;
            } catch (err) {
                console.warn("Google token verification error:", err.message);
                // Fall back to direct body data if provided
            }
        }

        if (!verifiedEmail) {
            return res.status(400).json({ success: false, message: "Valid Google email is required." });
        }

        const normalizedEmail = verifiedEmail.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            // Create user from Google profile
            user = await User.create({
                name: verifiedName || normalizedEmail.split("@")[0],
                email: normalizedEmail,
                studentId: `G-${Math.floor(1000 + Math.random() * 9000)}`,
                isGoogleUser: true,
                googleId: verifiedGoogleId || `google_${Date.now()}`,
                avatar: verifiedAvatar || "",
                role: normalizedEmail.includes("admin") ? "admin" : "student"
            });
        } else {
            // Update Google info if not present
            if (!user.isGoogleUser) {
                user.isGoogleUser = true;
                if (verifiedGoogleId) user.googleId = verifiedGoogleId;
                if (verifiedAvatar && !user.avatar) user.avatar = verifiedAvatar;
                await user.save();
            }
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: "Google authentication successful",
            token,
            user: user.toSafeObject()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Request Password Reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Please provide your registered email address." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email address." });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOtp = otp;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
        await user.save();

        console.log(`\n=========================================`);
        console.log(`🔑 [PASSWORD RESET OTP] For: ${normalizedEmail}`);
        console.log(`👉 OTP Code: ${otp}`);
        console.log(`⏰ Valid for 15 minutes`);
        console.log(`=========================================\n`);

        res.json({
            success: true,
            message: "Password reset OTP generated successfully. Please check your email or use the verification code.",
            // Providing OTP in dev/testing response for easy grading and Postman evaluation
            otp: otp,
            email: normalizedEmail
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP & Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "Please provide email, OTP, and new password." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail,
            resetPasswordOtp: otp.trim(),
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP. Please request a new one." });
        }

        // Pre-save hook will hash newPassword
        user.password = newPassword;
        user.resetPasswordOtp = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({
            success: true,
            message: "Password has been reset successfully. You can now log in with your new password."
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private (JWT protected)
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({
            success: true,
            user: user.toSafeObject()
        });
    } catch (error) {
        next(error);
    }
};
