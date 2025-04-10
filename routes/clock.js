// routes/clock.js

const express = require("express");
const Log = require("../models/Log");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Clock In Route
router.post("/in", authMiddleware, async (req, res) => {
  try {
    // Check if employee already clocked in
    const existingLog = await Log.findOne({
      employee_id: req.user.id,
      status: "Clocked In",
    });

    if (existingLog) {
      return res.status(400).json({ error: "You are already clocked in." });
    }

    // Create a new log entry
    const newLog = new Log({
      employee_id: req.user.id,
      clock_in_time: new Date(),
      status: "Clocked In",
    });

    await newLog.save();
    res.status(201).json(newLog);
  } catch (error) {
    console.error("Clock-in error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Clock Out Route
router.post("/out", authMiddleware, async (req, res) => {
  try {
    // Find the most recent clock-in log
    const log = await Log.findOne({
      employee_id: req.user.id,
      status: "Clocked In",
    });

    if (!log) {
      return res.status(400).json({ error: "You must clock in first." });
    }

    // Update log with clock out time & calculate total hours
    log.clock_out_time = new Date();
    log.total_hours = (log.clock_out_time - log.clock_in_time) / (1000 * 60 * 60); 
    log.status = "Clocked Out";

    await log.save();
    res.status(200).json(log);
  } catch (error) {
    console.error("Clock-out error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get Employee's Clock Records
router.get("/", authMiddleware, async (req, res) => {
  try {
    const logs = await Log.find({ employee_id: req.user.id }).sort({
      clock_in_time: -1,
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
