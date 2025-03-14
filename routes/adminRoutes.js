const express = require("express");
const { setAvailability, getAvailability, getAdminId, updateAvailability, deleteAvailability } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Set Availability (Admin Only)
router.post("/set-availability", protect, setAvailability);

// ✅ Get Availability
router.get("/get-availability", protect, getAvailability);

// ✅ Update Availability (Admin Only)
router.put("/update-availability", protect, updateAvailability);

// ✅ Delete Availability (Admin Only)
router.delete("/delete-availability", protect, deleteAvailability);

// ✅ Retrieve Admin ID
router.get("/admin-id", getAdminId);

module.exports = router;