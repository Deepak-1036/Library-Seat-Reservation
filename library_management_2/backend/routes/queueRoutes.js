const express = require("express");
const router = express.Router();
const {
    getQueue,
    joinQueue,
    cancelQueue
} = require("../controllers/queueController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getQueue);
router.post("/", protect, joinQueue);
router.delete("/:id", protect, cancelQueue);

module.exports = router;
