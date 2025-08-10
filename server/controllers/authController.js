// controllers/authController.js
const User = require("../models/User");
const GovEmployee = require("../models/GovEmployee");  // Ensure this line is present!
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendOTP = require("../utils/mailer"); // Make sure this file exists and exports a function
require("dotenv").config();

// In-memory OTP store (for demo purposes only)
const otpStore = {};

// Utility: Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP endpoint.
 */
exports.sendOtp = async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  
  const otp = generateOtp();
  otpStore[email] = { otp, expiresAt: Date.now() + 300000 }; // Valid for 5 minutes
  
  try {
    await sendOTP(email, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};

/**
 * Verify OTP endpoint.
 */
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!otpStore[email] || otpStore[email].expiresAt < Date.now()) {
    return res.status(400).json({ message: "OTP expired or invalid" });
  }
  if (otpStore[email].otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }
  delete otpStore[email];
  res.status(200).json({ message: "OTP verified successfully" });
};

/**
 * Citizen Registration Endpoint.
 */
exports.registerCitizen = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid password format" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Government Employee Registration Endpoint.
 */
exports.registerGovEmployee = async (req, res) => {
  try {
    const { name, email, password, role, ward, identifier } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid password format" });
    }
    // For government employees, ensure identifier is provided
    if (role && role.toLowerCase() !== "citizen") {
      if (!identifier) {
        return res.status(400).json({ message: "Identifier is required" });
      }
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newGovEmployee = new GovEmployee({
      name,
      email,
      password: hashedPassword,
      role,
      ward,
      identifier
    });
    const savedEmployee = await newGovEmployee.save();
    res.status(201).json({
      message: "Government employee registered successfully",
      employee: savedEmployee,
    });
  } catch (error) {
    console.error("Error registering government employee:", error);
    res.status(500).json({ message: "Error registering government employee", error: error.message });
  }
};

/**
 * Unified Login Endpoint.
 */
exports.loginUnified = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check citizen collection
    let user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log("Invalid credentials for citizen", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
      return res.json({ token, role: user.role, user });
    }
    // Check GovEmployee collection
    let govEmployee = await GovEmployee.findOne({ email });
    if (govEmployee) {
      console.log("GovEmployee found:", govEmployee.email);
      const isMatch = await bcrypt.compare(password, govEmployee.password);
      console.log("GovEmployee bcrypt compare result:", isMatch);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign({ id: govEmployee._id, role: govEmployee.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
      return res.json({ token, role: govEmployee.role, user: govEmployee });
    }
    return res.status(401).json({ message: "Invalid credentials" });
  } catch (error) {
    console.error("Unified login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
