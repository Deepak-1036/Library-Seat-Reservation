# 📚 Library Seat & Resource Reservation System

A full-stack web application for students and faculty to browse, reserve, and manage library seats, computer terminals, books, study rooms, and presentation equipment.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js (v5), MongoDB (Mongoose)
- **Auth:** JWT, Bcrypt, Google OAuth
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **API Testing:** Postman & Thunder Client collections included

## 📁 Folder Structure

```
Library-Seat-Reservation/
├── frontend/                    # Original frontend (evaluation 1)
├── README.md
└── library_management_2/        # Full-stack project (evaluation 2)
    ├── backend/                 # Express API server
    │   ├── config/              # MongoDB connection
    │   ├── controllers/         # Auth, resource, reservation, queue, user
    │   ├── middleware/          # JWT auth & error handling
    │   ├── models/              # Mongoose schemas
    │   ├── routes/              # RESTful API routes
    │   ├── utils/               # Database seeder
    │   ├── server.js            # App entry point
    │   └── package.json
    ├── frontend/                # HTML/CSS/JS client
    │   ├── css/                 # Page-specific stylesheets
    │   ├── js/                  # API calls, auth, page scripts
    │   └── assets/              # Icons and images
    ├── postman_collection.json  # Postman API tests
    └── thunder_collection.json  # Thunder Client API tests
```

## 🚀 Quick Start

```bash
cd library_management_2/backend
npm install
npm start
```

The server starts on `http://localhost:5000`.

## 🌟 Key Features

- **MVC Architecture:** Clean separation of models, controllers, and routes
- **Secure Authentication:** Registration, login, JWT tokens, Google OAuth, OTP password reset
- **Resource Management:** Real-time availability, status indicators, search and filter
- **Smart Reservations:** Time-overlap collision prevention, past-date booking prevention
- **Priority Queue:** Faculty-prioritized waitlist with auto-promotion on cancellation
- **User Dashboard:** Active reservations, booking history, notification center

## 🔑 Demo Credentials

| Role      | Email                  | Password      |
|-----------|------------------------|---------------|
| Student   | `student@library.com`  | `password123` |
| Faculty   | `faculty@library.com`  | `faculty123`  |
| Admin     | `admin@library.com`    | `admin123`    |

## 👥 Team Modules

| Module         | Description                                      |
|----------------|--------------------------------------------------|
| **Resources**  | CRUD operations for library resources             |
| **Reservations** | Booking system with conflict detection          |
| **Queue**      | Priority-based waitlist with auto-promotion       |
| **Auth**       | Registration, login, JWT, Google OAuth, OTP reset |
| **User**       | Profile management and admin user controls        |

