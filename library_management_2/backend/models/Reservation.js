const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.Mixed, // allows ObjectId or legacy string/number
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
    resourceId: {
        type: mongoose.Schema.Types.Mixed, // allows ObjectId or legacy number
        required: true,
        ref: "Resource"
    },
    resourceName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: "Seat"
    },
    location: {
        type: String,
        default: ""
    },
    date: {
        type: String, // YYYY-MM-DD
        required: [true, "Reservation date is required"]
    },
    time: {
        type: String, // HH:MM
        required: [true, "Reservation time is required"]
    },
    duration: {
        type: Number, // in hours
        required: true,
        min: 1,
        max: 8,
        default: 1
    },
    status: {
        type: String,
        enum: ["active", "completed", "cancelled"],
        default: "active"
    },
    fromQueue: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

reservationSchema.virtual("id").get(function () {
    return this._id;
});

module.exports = mongoose.model("Reservation", reservationSchema);
