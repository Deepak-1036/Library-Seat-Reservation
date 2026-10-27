const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "library_super_secret_jwt_key_2026";

// Protect routes: Verifies JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, JWT_SECRET);

            const user = await User.findById(decoded.id).select("-password -resetPasswordOtp -resetPasswordExpires");
            if (!user) {
                return res.status(401).json({ success: false, message: "User not found or token invalid." });
            }

            req.user = user;
            return next();
        } catch (error) {
            console.error("JWT Verification failed:", error.message);
            return res.status(401).json({ success: false, message: "Not authorized, token failed or expired." });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized, no token provided." });
    }
};

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user ? req.user.role : "guest"}' is not authorized to access this resource.`
            });
        }
        next();
    };
};

module.exports = {
    protect,
    authorize,
    adminOnly: authorize("admin"),
    facultyOrAdmin: authorize("faculty", "admin"),
    JWT_SECRET
};
