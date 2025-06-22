const User = require('../models/userModel');
const moment = require("moment");

// ✅ Set or Update Admin Availability
const setAvailability = async (req, res) => {
  console.log("🔹 Received Availability Request:", req.body);

  try {
    const { availability } = req.body;
    const adminId = req.user.id; // ✅ Get admin ID from token

    if (!availability || typeof availability !== "object" || Array.isArray(availability)) {
      return res.status(400).json({ message: "Invalid format. Availability should be an object with date keys and time arrays." });
    }

    // ✅ Convert object format to array of { date, times }
    const newAvailability = [];

    for (const [date, times] of Object.entries(availability)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: `Invalid date format: ${date}` });
      }

      if (!Array.isArray(times) || times.some(t => typeof t !== "string")) {
        return res.status(400).json({ message: `Invalid time array for ${date}` });
      }

      newAvailability.push({
        date,
        times: [...new Set(times.map(t => t.trim()))],
      });
    }

    // ✅ Find this admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Only admins can set availability." });
    }

    // ✅ Replace or merge availability
    const mergedAvailability = [...admin.availability];

    newAvailability.forEach(({ date, times }) => {
      const existing = mergedAvailability.find(d => d.date === date);
      if (existing) {
        existing.times = [...new Set([...existing.times, ...times])];
      } else {
        mergedAvailability.push({ date, times });
      }
    });

    admin.availability = mergedAvailability;
    await admin.save();

    console.log("✅ Availability updated for admin:", admin.email);
    res.status(200).json({ message: "Availability updated successfully", availability: mergedAvailability });

  } catch (error) {
    console.error("❌ Error updating availability:", error);
    res.status(500).json({ message: "Error updating availability", error: error.message });
  }
};

// Get Admin Availability

const getAvailability = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("firstName lastName availability");

    const availabilityMap = {};

    admins.forEach((admin) => {
      admin.availability.forEach(({ date, times }) => {
        if (!availabilityMap[date]) availabilityMap[date] = {};

        times.forEach((time) => {
          const trimmed = time.trim();
          if (!availabilityMap[date][trimmed]) {
            availabilityMap[date][trimmed] = [];
          }

          availabilityMap[date][trimmed].push({
            adminId: admin._id,
            adminName: `${admin.firstName} ${admin.lastName}`
          });
        });
      });
    });

    res.status(200).json({ availability: availabilityMap });
  } catch (error) {
    console.error("❌ Error retrieving availability:", error);
    res.status(500).json({ message: "Error retrieving availability", error: error.message });
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
    const { date, times } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!date || typeof date !== "string" || !moment(date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ message: "Invalid or missing date. Format must be YYYY-MM-DD." });
    }

    if (!Array.isArray(times) || times.some(t => typeof t !== "string")) {
      return res.status(400).json({ message: "Times must be an array of strings." });
    }

    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update availability." });
    }

    const existing = admin.availability || [];
    const index = existing.findIndex(entry => entry.date === date);

    if (index !== -1) {
      // Merge and clean times
      const merged = Array.from(
        new Set([...existing[index].times, ...times.map(t => t.trim())])
      ).sort();
      admin.availability[index].times = merged;
    } else {
      // Add new date entry
      admin.availability.push({
        date,
        times: times.map(t => t.trim()).sort()
      });
    }

    await admin.save();

    const updatedEntry = admin.availability.find(entry => entry.date === date);
    return res.status(200).json({
      message: "Availability updated",
      updated: updatedEntry
    });

  } catch (error) {
    console.error("❌ Error updating availability:", error);
    return res.status(500).json({ message: "Error updating availability", error: error.message });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    const { date } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!date || !moment(date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ message: "Invalid or missing date. Format must be YYYY-MM-DD." });
    }

    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete availability." });
    }

    admin.availability = (admin.availability || []).filter(entry => entry.date !== date);
    await admin.save();

    return res.status(200).json({
      message: `Availability for ${date} deleted.`,
      remainingAvailability: admin.availability
    });

  } catch (error) {
    console.error("❌ Error deleting availability:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Ensure functions are exported correctly
module.exports = { setAvailability, getAvailability, getAdminId, updateAvailability, deleteAvailability };
