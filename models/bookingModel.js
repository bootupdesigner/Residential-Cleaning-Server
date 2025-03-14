const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // Stored in YYYY-MM-DD format
  time: { type: String, required: true }, // "3:30 PM"
  serviceAddress: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  addOns: { type: [String], default: [] }, // ✅ Store selected add-ons
  createdAt: { type: Date, default: Date.now },
});

// Ensure unique bookings for the same admin, date, and time
BookingSchema.index({ adminId: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model("Booking", BookingSchema);
