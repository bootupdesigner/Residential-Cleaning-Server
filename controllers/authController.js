const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const calculateCleaningPrice = require('../utils/calculatePrice'); // Import price function
const axios = require("axios");
const geolib = require("geolib");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_LAT = 26.0241; // Latitude of 33024
const BASE_LON = -80.2331; // Longitude of 33024
const SERVICE_RADIUS_MILES = 25; // Maximum service distance

// 🔹 Function to get latitude & longitude from ZIP code using Google Maps API
const getCoordinatesFromZip = async (zip) => {
  try {
    console.log(`🔹 Fetching coordinates for ZIP: ${zip}`);
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
      params: {
        address: zip,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (!response.data.results || response.data.results.length === 0) {
      console.error(`❌ No coordinates found for ZIP: ${zip}`);
      return null;
    }

    const location = response.data.results[0].geometry.location;
    console.log("✅ Found Coordinates:", location);

    return { latitude: location.lat, longitude: location.lng };
  } catch (error) {
    console.error("❌ Error fetching coordinates:", error.response?.data || error.message);
    return null;
  }
};

// ✅ Register User
const registerUser = async (req, res) => {

  try {
    const { firstName, lastName, email, password, phone, homeType, homeSize, serviceAddress, city, state, zipCode, role } = req.body;

    if (!zipCode || typeof zipCode !== "string" || zipCode.length < 5) {
      return res.status(400).json({ message: "Invalid ZIP code. Please enter a valid address." });
    }

    const userCoords = await getCoordinatesFromZip(zipCode);
    if (!userCoords) {
      return res.status(400).json({ message: "Invalid ZIP code. Please enter a valid address." });
    }

    console.log("✅ User Coordinates:", userCoords);

    // ✅ Calculate distance between user and base ZIP
    const distanceMiles = geolib.convertDistance(
      geolib.getDistance(
        { latitude: BASE_LAT, longitude: BASE_LON },
        { latitude: userCoords.latitude, longitude: userCoords.longitude }
      ),
      "mi"
    );

    console.log(`🔹 Distance from 33024: ${distanceMiles} miles`);

    // ✅ If outside the service radius, reject registration
    if (distanceMiles > SERVICE_RADIUS_MILES) {
      console.log("❌ User is outside the service area!");
      return res.status(400).json({
        message: `We currently do not service addresses more than ${SERVICE_RADIUS_MILES} miles from ZIP code 33024.`,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate cleaning price based on home size
    const cleaningPrice = calculateCleaningPrice(homeSize.bedrooms, homeSize.bathrooms);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      serviceAddress,
      city,
      state,
      zipCode,
      homeType,
      homeSize,
      cleaningPrice, // Store calculated price
      role
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully', cleaningPrice });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
};


// ✅ Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials" });

    // ✅ Extend JWT expiration time to **7 days**
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d", // ✅ Increase expiration to 7 days
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use true in production
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // ✅ 7 days in milliseconds
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
      },
      token, // ✅ Send token back in response
    });

  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};



// ✅ Logout User
const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use true in production
    sameSite: 'Strict',
  });
  res.status(200).json({ message: 'Logout successful' });
};

module.exports = { registerUser, loginUser, logoutUser };