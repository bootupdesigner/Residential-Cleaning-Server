const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const calculateCleaningPrice = require('../utils/calculatePrice'); // Import price function

// ✅ Register User
const registerUser = async (req, res) => {
  const { firstName, lastName, email, password, phone, homeSize, serviceAddress, city, state, zipCode, role } = req.body;

  try {
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
