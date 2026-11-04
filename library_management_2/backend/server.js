require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const seedDatabase = require("./utils/seeder");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const queueRoutes = require("./routes/queueRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
    // Seed default users and resources if database is empty
    seedDatabase();
});

// Middleware
app.use(cors({
    origin: "*", // Allows requests from LiveServer, local ports, or deployed domains
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/users", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Library Seat & Resource Reservation API is running smoothly!",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString()
    });
});

// API Overview endpoint
app.get("/api", (req, res) => {
    res.json({
        name: "Library Seat & Resource Reservation Backend API",
        version: "1.0.0",
        architecture: "MVC (Model-View-Controller)",
        endpoints: {
            auth: [
                "POST /api/auth/register",
                "POST /api/auth/login",
                "POST /api/auth/google",
                "POST /api/auth/forgot-password",
                "POST /api/auth/reset-password",
                "GET  /api/auth/me"
            ],
            resources: [
                "GET    /api/resources",
                "GET    /api/resources/:id",
                "POST   /api/resources (Admin)",
                "PUT    /api/resources/:id (Admin)",
                "DELETE /api/resources/:id (Admin)"
            ],
            reservations: [
                "GET /api/reservations",
                "GET /api/reservations/slots",
                "POST /api/reservations",
                "PUT /api/reservations/:id/cancel"
            ],
            queue: [
                "GET    /api/queue",
                "POST   /api/queue",
                "DELETE /api/queue/:id"
            ],
            users: [
                "GET /api/users/profile",
                "PUT /api/users/profile",
                "GET /api/users/notifications",
                "PUT /api/users/notifications/:id/read",
                "PUT /api/users/notifications/read-all",
                "GET /api/users (Admin)"
            ]
        }
    });
});

// Fallback to frontend index.htm for client routing
app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, message: "API endpoint not found" });
    }
    const requestedFile = path.join(frontendPath, req.path);
    res.sendFile(requestedFile, (err) => {
        if (err) {
            res.sendFile(path.join(frontendPath, "index.htm"));
        }
    });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Frontend accessible at http://localhost:${PORT}`);
    console.log(`📑 API Documentation endpoint: http://localhost:${PORT}/api`);
});

module.exports = app;
