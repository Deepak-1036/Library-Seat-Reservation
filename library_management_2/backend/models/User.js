const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },
    studentId: {
        type: String,
        trim: true,
        default: ""
    },
    password: {
        type: String,
        required: function () {
            return !this.isGoogleUser;
        },
        minlength: [6, "Password must be at least 6 characters"]
    },
    role: {
        type: String,
        enum: ["student", "admin", "faculty"],
        default: "student"
    },
    isGoogleUser: {
        type: Boolean,
        default: false
    },
    googleId: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: ""
    },
    resetPasswordOtp: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Hash password with bcrypt before saving if modified
userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Safe JSON serialization (hides password & OTP from output)
userSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        _id: this._id,
        name: this.name,
        email: this.email,
        studentId: this.studentId,
        role: this.role,
        isGoogleUser: this.isGoogleUser,
        avatar: this.avatar,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model("User", userSchema);
