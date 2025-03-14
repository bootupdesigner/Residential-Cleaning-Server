const express = require('express');
const { bookCleaning, getBookingsByDate,getAllBookings, cancelBooking, deleteBooking ,getUserBookings} = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/book', protect, bookCleaning); // User must be logged in to book
router.get("/get-bookings", protect, getBookingsByDate);
router.get('/user-bookings', protect, getUserBookings);
router.delete("/cancel/:bookingId", protect, cancelBooking);
router.delete("/delete", protect, adminOnly, deleteBooking);
router.get('/all', protect, adminOnly, getAllBookings); // ✅ Add new route for admin

module.exports = router;

