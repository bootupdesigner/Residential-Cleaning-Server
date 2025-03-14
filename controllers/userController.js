const User = require("../models/userModel");
const calculatePrice = require("../utils/calculatePrice");
const Booking = require("../models/bookingModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getUserProfile = async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password'); // Exclude password
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      res.status(200).json({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        serviceAddress: user.serviceAddress,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        homeSize: user.homeSize,
        homeType: user.homeType,
        cleaningPrice: user.cleaningPrice, // Return price
        availability:user.availability,
        role: user.role 
      });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user profile', error });
    }
  };
    

// **🔹 Update user profile using findByIdAndUpdate**
const updateUserProfile = async (req, res) => {
  try {
    const updates = {};

    // ✅ Only update fields that are present in the request
    if (req.body.firstName) updates.firstName = req.body.firstName;
    if (req.body.lastName) updates.lastName = req.body.lastName;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.serviceAddress) updates.serviceAddress = req.body.serviceAddress;
    if (req.body.city) updates.city = req.body.city;
    if (req.body.state) updates.state = req.body.state;
    if (req.body.zipCode) updates.zipCode = req.body.zipCode;
    if (req.body.homeType) updates.homeType = req.body.homeType;

    if (req.body.homeSize) {
      updates.homeSize = {
        bedrooms: req.body.homeSize.bedrooms > 0 ? req.body.homeSize.bedrooms : 1, // ✅ Prevents invalid values
        bathrooms: req.body.homeSize.bathrooms > 0 ? req.body.homeSize.bathrooms : 1,
      };

      // ✅ Recalculate cleaning price if home size is updated
      updates.cleaningPrice = calculatePrice(
        updates.homeSize.bedrooms,
        updates.homeSize.bathrooms
      );
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    res.status(500).json({ message: "Error updating user profile", error: error.message });
  }
};

// **🔹 Delete user profile**

const deleteUserProfile = async (req, res) => {
  try {
      const user = await User.findById(req.user.id);
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      console.log("🔹 Deleting user:", user.email);

      // **Step 1: Remove Stripe Customer**
      if (user.stripeCustomerId) {
          try {
              await stripe.customers.del(user.stripeCustomerId);
              console.log("✅ Stripe customer deleted:", user.stripeCustomerId);
          } catch (error) {
              console.error("❌ Error deleting Stripe customer:", error);
          }
      }

      // **Step 2: Delete all bookings associated with this user**
      await Booking.deleteMany({ userId: user._id });
      console.log("✅ User bookings deleted");

      // **Step 3: Delete user from MongoDB**
      await User.findByIdAndDelete(user._id);
      console.log("✅ User deleted from database");

      // **Step 4: Logout user (clear frontend token)**
      res.status(200).json({ message: "User deleted successfully" });

  } catch (error) {
      console.error("❌ Error deleting user profile:", error);
      res.status(500).json({ message: "Error deleting user profile", error });
  }
};

module.exports = { getUserProfile, updateUserProfile, deleteUserProfile };
