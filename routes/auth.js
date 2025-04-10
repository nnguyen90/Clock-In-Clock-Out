// routes/auth.js

const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    // Create new user
    const newUser = new User({ firstName, lastName, email, password, role });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    console.log("Login request received:", req.body);

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // For debugging:
    console.log("User found:", user.email);
    console.log("Stored Hashed Password:", user.password);
    console.log("Entered Plain Password:", password);

    // Debug bcrypt comparison
    const isMatch = await user.comparePassword(password);
    
    console.log("Password Match Status:", isMatch);

    if (!isMatch) {
      console.log("Incorrect password for:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({
      success: true,
      token,
      role: user.role,
      userId: user._id,
    });
    
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;
