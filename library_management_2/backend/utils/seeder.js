const User = require("../models/User");
const Resource = require("../models/Resource");

const defaultUsers = [
    {
        name: "Alex Student",
        email: "student@library.com",
        studentId: "STU-1001",
        password: "password123",
        role: "student"
    },
    {
        name: "Admin User",
        email: "admin@library.com",
        studentId: "ADM-001",
        password: "admin123",
        role: "admin"
    },
    {
        name: "Dr. Eleanor Smith",
        email: "faculty@library.com",
        studentId: "FAC-101",
        password: "faculty123",
        role: "faculty"
    }
];

const defaultResources = [
    { legacyId: 1, name: "Study Seat A-101", category: "Seat", location: "Floor 1", description: "Individual study seat near the window.", status: "Available", capacity: 1 },
    { legacyId: 2, name: "Study Seat B-204", category: "Seat", location: "Floor 2", description: "Quiet study seat in the silent zone.", status: "Available", capacity: 1 },
    { legacyId: 3, name: "Computer PC-05", category: "Computer", location: "Computer Lab", description: "Desktop computer with internet access and IDEs.", status: "Available", capacity: 1 },
    { legacyId: 4, name: "Reference Book - DBMS", category: "Book", location: "Floor 2", description: "Database Management Systems reference book.", status: "Available", capacity: 1 },
    { legacyId: 5, name: "Study Room R-03", category: "Room", location: "Floor 3", description: "Private study room suitable for group projects.", status: "Available", capacity: 6 },
    { legacyId: 6, name: "Projector P-02", category: "Equipment", location: "Floor 3", description: "HD projector available for academic presentations.", status: "Available", capacity: 1 }
];

const seedDatabase = async () => {
    try {
        // Seed default users if missing
        for (const u of defaultUsers) {
            const exists = await User.findOne({ email: u.email });
            if (!exists) {
                await User.create(u);
                console.log(`👤 Seeded user: ${u.email} (${u.role})`);
            }
        }

        // Seed default resources if collection is empty
        const resourceCount = await Resource.countDocuments();
        if (resourceCount === 0) {
            await Resource.insertMany(defaultResources);
            console.log(`📚 Seeded ${defaultResources.length} default library resources`);
        }
    } catch (error) {
        console.error("Seeder error:", error.message);
    }
};

module.exports = seedDatabase;
