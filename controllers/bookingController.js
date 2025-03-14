const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const { processRefund } = require("../utils/paymentService"); // Assume this handles Stripe/Square refunds
const { sendBookingConfirmationEmail } = require('../utils/emailService');

const getBookingsByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required." });
    }

    const bookings = await Booking.find({ date });
    res.status(200).json({ bookings });

  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    res.status(500).json({ message: "Error fetching bookings", error });
  }
};

const bookCleaning = async (req, res) => {
  try {
    const { userId, selectedDate, selectedTime, addOns } = req.body;

    console.log("🔹 Received Booking Request:", req.body);

    if (!userId) {
      console.error("❌ User ID is missing in request body:", req.body);
      return res.status(400).json({ message: "User ID is missing. Please log in again." });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error("❌ User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ User Found:", user.firstName, user.lastName);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const today = new Date().toISOString().split("T")[0];
    if (selectedDate < today) {
      return res.status(400).json({ message: "You cannot select a past date. Please choose a future date." });
    }

    const admin = await User.findOne({ role: "admin" }).select("availability");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    let availabilityData = admin.availability instanceof Map
      ? Object.fromEntries(admin.availability)
      : { ...admin.availability };

    if (!availabilityData[selectedDate] || !Array.isArray(availabilityData[selectedDate])) {
      return res.status(400).json({ message: `No availability set for ${selectedDate}. Please choose another date.` });
    }

    const formattedTime = selectedTime.trim();
    const availableTimes = availabilityData[selectedDate].map(time => time.trim());

    if (!availableTimes.includes(formattedTime)) {
      return res.status(400).json({ message: `Selected time (${formattedTime}) is not available on ${selectedDate}.` });
    }

    const existingBooking = await Booking.findOne({
      date: selectedDate,
      time: formattedTime,
    });

    if (existingBooking) {
      return res.status(400).json({ message: `The time slot ${formattedTime} on ${selectedDate} is already booked. Please select another time.` });
    }

    const newBooking = new Booking({
      userId, // ✅ Store only userId
      adminId: admin._id,
      date: selectedDate,
      time: formattedTime,
      serviceAddress: user.serviceAddress,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      addOns: Array.isArray(addOns) ? addOns : [],
    });

    await newBooking.save();
    console.log("✅ Booking saved to database:", newBooking);

    let timeSlotsToKeep = [];

    if (formattedTime === "3:30 PM") {
      timeSlotsToKeep = ["6:30 PM"]; // ✅ Only keep 6:30 PM if 3:30 PM is booked
    } else if (formattedTime === "6:30 PM") {
      timeSlotsToKeep = ["3:30 PM"]; // ✅ Only keep 3:30 PM if 6:30 PM is booked
    } else {
      timeSlotsToKeep = []; // ✅ Remove all times for that day if any other time is booked
    }

    console.log("🔹 Updated Available Times to Keep:", timeSlotsToKeep);

    // ✅ Filter out booked and non-allowed times
    availabilityData[selectedDate] = availabilityData[selectedDate].filter(time => timeSlotsToKeep.includes(time));

    console.log("🔹 Final Updated Availability:", availabilityData[selectedDate]);

    await User.findByIdAndUpdate(admin._id, {
      $set: { [`availability.${selectedDate}`]: availabilityData[selectedDate] }
    }, { new: true });

    console.log("✅ Availability Updated After Booking:", availabilityData);

    await sendBookingConfirmationEmail(user, newBooking);

    res.status(200).json({
      message: "✅ Booking successful!",
      booking: newBooking,
      updatedAvailability: availabilityData,
    });

  } catch (error) {
    console.error("❌ Booking error:", error);
    res.status(500).json({ message: "Error processing booking", error });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is missing. Please log in again." });
    }

    const bookings = await Booking.find({ userId })
      .sort({ date: -1 })  // Sort by most recent date
      .select('date time serviceAddress city state zipCode');

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    res.status(500).json({ message: "Error fetching bookings", error });
  }
};

const getAllBookings = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins can view all bookings." });
    }

    // ✅ Fetch all bookings with user details sorted by most recent
    const bookings = await Booking.find()
      .populate("userId", "firstName lastName email") // ✅ Fetch user details
      .sort({ date: -1 }) // ✅ Sort by most recent date
      .select("date time serviceAddress city state zipCode addOns createdAt userId");

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found." });
    }

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("❌ Error fetching all bookings:", error);
    res.status(500).json({ message: "Error fetching all bookings", error: error.message });
  }
};



const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params; // ✅ Get bookingId from params

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required." });
    }

    // ✅ Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    console.log(`🔹 Logged-in User ID: ${req.user.id}`);
    console.log(`🔹 Booking Owner ID: ${booking.userId.toString()}`);

    // ✅ Ensure the user requesting the cancellation is the owner of the booking
    if (req.user.id.toString() !== booking.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can only cancel your own bookings." });
    }

    // ✅ Calculate time difference from now
    const currentTime = new Date();
    const bookingTime = new Date(`${booking.date} ${booking.time}`);
    const timeDifference = (bookingTime - currentTime) / (1000 * 60 * 60); // Convert to hours

    console.log(`🔹 Booking Time: ${bookingTime}`);
    console.log(`🔹 Current Time: ${currentTime}`);
    console.log(`🔹 Time Difference: ${timeDifference} hours`);

    // ❌ Same-day cancellations → No refund
    if (timeDifference < 0) {
      return res.status(400).json({ message: "You cannot cancel a past or same-day appointment." });
    }

    // ❌ If within 24 hours → No refund
    let refundEligible = timeDifference > 24;
    let refundResponse = null;

    if (refundEligible && booking.paymentId) {
      // ✅ Process refund if a payment exists
      refundResponse = await processRefund(booking.paymentId, booking.amountPaid);
    } else if (!booking.paymentId) {
      refundResponse = { message: "No payment was made for this booking, so no refund is necessary." };
    }

    // ✅ Delete booking after cancellation
    await Booking.findByIdAndDelete(bookingId);

    res.status(200).json({
      message: "Booking canceled successfully.",
      refund: refundEligible
        ? (booking.paymentId ? "Refund issued." : "No payment was made, so no refund is necessary.")
        : "No refund as cancellation was within 24 hours.",
      refundResponse
    });

  } catch (error) {
    console.error("❌ Error canceling booking:", error);
    res.status(500).json({ message: "Error canceling booking", error: error.message });
  }
};


const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required." });
    }

    // ✅ Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    console.log(`🔹 Logged-in User Role: ${req.user.role}`);

    // ✅ Ensure only admins can delete any booking
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins can delete bookings." });
    }

    // ✅ Delete booking
    await Booking.findByIdAndDelete(bookingId);

    res.status(200).json({ message: "Booking deleted successfully." });

  } catch (error) {
    console.error("❌ Error deleting booking:", error);
    res.status(500).json({ message: "Error deleting booking", error: error.message });
  }
};


// ✅ Ensure all functions are properly exported
module.exports = { bookCleaning, getUserBookings, getBookingsByDate, getAllBookings, cancelBooking, deleteBooking };
