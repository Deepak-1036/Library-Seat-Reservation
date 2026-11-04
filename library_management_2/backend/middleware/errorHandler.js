// Centralized error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error("Server Error:", err.stack || err.message);

    // Mongoose bad ObjectId
    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: `Resource not found with id ${err.value}`
        });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(400).json({
            success: false,
            message: `An account with this ${field} already exists.`
        });
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            message: messages.join(", ")
        });
    }

    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
};

module.exports = errorHandler;
