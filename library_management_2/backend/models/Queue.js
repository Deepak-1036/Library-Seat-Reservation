const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        ref: "User"
    },
    userName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        default: ""
    },
    studentId: {
        type: String,
        default: ""
    },
    resourceId: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        ref: "Resource"
    },
    resourceName: {
        type: String,
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        default: ""
    },
    time: {
        type: String, // HH:MM
        default: ""
    },
    duration: {
        type: Number, // in hours
        default: 1
    },
    reason: {
        type: String,
        default: "General study request"
    },
    priority: {
        type: Number,
        default: 1 // 1 = Standard, 2 = Medium, 3 = High
    },
    status: {
        type: String,
        enum: ["waiting", "served", "cancelled"],
        default: "waiting"
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

queueSchema.virtual("id").get(function () {
    return this._id;
});

module.exports = mongoose.model("Queue", queueSchema);
