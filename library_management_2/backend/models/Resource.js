const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Resource name is required"],
        trim: true
    },
    category: {
        type: String,
        required: [true, "Category is required"],
        enum: ["Seat", "Computer", "Book", "Room", "Equipment"],
        default: "Seat"
    },
    location: {
        type: String,
        required: [true, "Location is required"],
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Available", "Maintenance", "Reserved"],
        default: "Available"
    },
    capacity: {
        type: Number,
        default: 1
    },
    legacyId: {
        type: Number,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual id field for compatibility with frontend expectations
resourceSchema.virtual("id").get(function () {
    return this.legacyId || this._id;
});

module.exports = mongoose.model("Resource", resourceSchema);
