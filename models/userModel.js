const mongoose = require("mongoose");

const AvailabilitySchema = new mongoose.Schema({
  date: { type: String, required: true },  // Format: "YYYY-MM-DD"
  times: [{ type: String, required: true }] // e.g. ["3:30 PM", "4:00 PM"]
}, { _id: false });

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  serviceAddress: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  homeType: { type: String, enum: ['house', 'apartment'], default: 'apartment', required: true },
  homeSize: {
    bedrooms: { type: Number, enum: [1, 2, 3, 4, 5, 6, 7, 8, 9], required: true },
    bathrooms: { type: Number, enum: [1, 2, 3, 4, 5, 6, 7, 8, 9], required: true },
  },
  cleaningPrice: { type: Number },
  availability: {
    type: [AvailabilitySchema],
    default: []
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
