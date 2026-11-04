const express = require("express");
const router = express.Router();
const {
    getResources,
    getResourceById,
    createResource,
    updateResource,
    deleteResource
} = require("../controllers/resourceController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public endpoints (or authenticated)
router.get("/", getResources);
router.get("/:id", getResourceById);

// Admin-only management endpoints
router.post("/", protect, adminOnly, createResource);
router.put("/:id", protect, adminOnly, updateResource);
router.delete("/:id", protect, adminOnly, deleteResource);

module.exports = router;
