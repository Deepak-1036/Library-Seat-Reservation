const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        ref: "User"
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["info", "success", "warning", "reservation", "queue"],
        default: "info"
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

notificationSchema.virtual("id").get(function () {
    return this._id;
});

module.exports = mongoose.model("Notification", notificationSchema);
