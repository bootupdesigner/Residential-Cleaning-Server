const User = require('../models/userModel');
const moment = require("moment");

// ✅ Set or Update Admin Availability
const setAvailability = async (req, res) => {
  console.log("🔹 Received Availability Request:", req.body);

  try {
    let { availability } = req.body;

    // ✅ Validate input format
    if (!availability || typeof availability !== "object" || Array.isArray(availability)) {
      return res.status(400).json({ message: "Invalid format. Availability should be an object with date keys and time arrays." });
    }

    // ✅ Ensure all dates and times are valid
    const formattedAvailability = {};
    for (const [date, times] of Object.entries(availability)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: `Invalid date format for ${date}. Use YYYY-MM-DD.` });
      }
      if (!Array.isArray(times) || times.some(time => typeof time !== "string")) {
        return res.status(400).json({ message: `Invalid times format for ${date}. Expected an array of string times.` });
      }
      formattedAvailability[date] = times.map(time => time.trim()); // ✅ Normalize time values
    }

    // ✅ Find Admin
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    console.log("🔹 Existing Availability (Before Update):", admin.availability);

    // ✅ Merge with existing availability
    let existingAvailability = admin.availability || {};

    let updatedAvailability = { ...existingAvailability };

    for (const [date, times] of Object.entries(formattedAvailability)) {
      updatedAvailability[date] = [...new Set([...(existingAvailability[date] || []), ...times])]; // ✅ Prevent duplicates
    }

    // ✅ Save new availability
    admin.availability = updatedAvailability;
    await admin.save();

    console.log("✅ Availability updated:", updatedAvailability);
    res.status(200).json({ message: "Availability updated successfully", availability: updatedAvailability });

  } catch (error) {
    console.error("❌ Error updating availability:", error);
    res.status(500).json({ message: "Error updating availability", error: error.message });
  }
};

// Get Admin Availability
const getAvailability = async (req, res) => {
  try {
    console.log("🔹 Fetching admin availability...");

    const admin = await User.findOne({ role: "admin" }).select("availability");
    console.log("✅ Retrieved Admin Document:", admin);

    if (!admin || !admin.availability || Object.keys(admin.availability).length === 0) {
      console.error("❌ No availability data found in database.");
      return res.status(200).json({ availability: {} }); // ✅ Return empty object instead of error
    }

    let availabilityData = admin.availability;

    console.log("✅ Retrieved Full Availability:", availabilityData);
    return res.status(200).json({ availability: availabilityData });

  } catch (error) {
    console.error("❌ Error fetching availability:", error);
    return res.status(500).json({ message: "Error fetching availability", error: error.message });
  }
};

// ✅ Get Admin ID
const getAdminId = async (req, res) => {
  console.log("🔹 Function `getAdminId` is running...");
  try {
    const admin = await User.findOne({ role: "admin" }).select("_id email");
    if (!admin) {
      return res.status(404).json({ message: "No admin found" });
    }
    res.status(200).json({ adminId: admin._id, email: admin.email });
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin ID", error: error.message });
  }
};

// ✅ Debugging: Log module exports
console.log("🔹 Exporting functions from `adminController.js`:", { setAvailability, getAvailability, getAdminId });

const updateAvailability = async (req, res) => {
  try {
    console.log("🔹 Incoming Request Data:", req.body);

    let { date, times } = req.body;

    // ✅ Ensure the date is a string
    if (typeof date !== "string") {
      console.error("❌ Date is not a string:", date);
      return res.status(400).json({ message: "Date must be a string in YYYY-MM-DD format." });
    }

    // ✅ Validate date format
    if (!moment(date, "YYYY-MM-DD", true).isValid()) {
      console.error("❌ Invalid Date Format:", date);
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    // ✅ Ensure times is an array of strings
    if (!Array.isArray(times) || times.some(time => typeof time !== "string")) {
      console.error("❌ Invalid Times Format:", times);
      return res.status(400).json({ message: "Invalid time format. Expected an array of strings." });
    }

    // ✅ Find Admin
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.error("❌ Admin Not Found");
      return res.status(404).json({ message: "Admin not found" });
    }

    console.log("🔹 Current Availability (Before Update):", admin.availability);

    // ✅ Convert Map to Object if needed
    let availabilityData = admin.availability instanceof Map
      ? Object.fromEntries(admin.availability)
      : { ...admin.availability };

    // ✅ Ensure times are stored as an array of strings
    availabilityData[date] = times.map(time => time.trim());

    console.log("🔹 Updated Availability Data:", availabilityData);

    // ✅ Convert back to Map before saving
    admin.availability = availabilityData;
    await admin.save();

    console.log("✅ Availability updated successfully");
    res.status(200).json({ message: "Availability updated successfully", availability: availabilityData });

  } catch (error) {
    console.error("❌ Error updating availability:", error);
    res.status(500).json({ message: "Error updating availability", error: error.message });
  }
};



const deleteAvailability = async (req, res) => {
  try {
    const { date } = req.body;

    // ✅ Validate input
    if (!date || !moment(date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    // ✅ Find Admin
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // ✅ Convert Map to Object if needed
    let availabilityData = admin.availability instanceof Map
      ? Object.fromEntries(admin.availability)
      : { ...admin.availability };

    // ✅ Remove only if the date exists
    if (!availabilityData[date]) {
      return res.status(404).json({ message: `No availability found for ${date}.` });
    }

    delete availabilityData[date];

    // ✅ Convert back to Map before saving
    admin.availability = new Map(Object.entries(availabilityData));
    await admin.save();

    console.log("✅ Availability deleted for:", date);
    res.status(200).json({ message: `Availability for ${date} deleted successfully`, availability: availabilityData });

  } catch (error) {
    console.error("❌ Error deleting availability:", error);
    res.status(500).json({ message: "Error deleting availability", error: error.message });
  }
};



// ✅ Ensure functions are exported correctly
module.exports = { setAvailability, getAvailability, getAdminId, updateAvailability, deleteAvailability };
