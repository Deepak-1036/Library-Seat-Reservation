const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/library_reservation";
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.warn("⚠️ TIP: Make sure your MongoDB service is running locally, or configure MONGODB_URI in backend/.env with your MongoDB Atlas connection string.");
        // We do not exit process so server can still serve static files and provide health status
    }
};

module.exports = connectDB;
