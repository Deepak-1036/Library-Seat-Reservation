const express = require("express");
const router = express.Router();
const {
    getReservations,
    getOccupiedSlots,
    createReservation,
    cancelReservation
} = require("../controllers/reservationController");
const { protect } = require("../middleware/authMiddleware");

// Public slot availability helper
router.get("/slots", getOccupiedSlots);

// Protected reservation endpoints
router.get("/", protect, getReservations);
router.post("/", protect, createReservation);
router.put("/:id/cancel", protect, cancelReservation);

module.exports = router;
