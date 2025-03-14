const express = require("express");
const { processPayment, getSavedCards } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/pay", protect, processPayment); // Secure payment route
router.get("/saved-cards", protect, getSavedCards); // ✅ Securely fetch user's saved cards

module.exports = router;