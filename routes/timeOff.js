const express = require("express");
const TimeOffRequest = require("../models/TimeOffRequest");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware to check if user is a manager
const checkManager = (req, res, next) => {
    if (req.user.role !== "manager" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Only managers can approve/reject requests." });
    }
    next();
};

// Create a new time-off request (Employee)
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date, reason } = req.body;

        if (!start_date || !end_date || !reason) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const newRequest = new TimeOffRequest({
            employee_id: req.user.id,
            start_date,
            end_date,
            reason
        });

        await newRequest.save();
        res.status(201).json({ message: "Time-off request submitted successfully!", request: newRequest });
    } catch (error) {
        console.error("Error submitting time-off request:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get all pending time-off requests (Manager)
router.get("/", authMiddleware, checkManager, async (req, res) => {
    try {
        const requests = await TimeOffRequest.find({ status: "Pending" }).populate("employee_id", "first_name last_name email");
        res.json(requests);
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Approve or Reject a time-off request (Manager)
router.put("/:id", authMiddleware, checkManager, async (req, res) => {
    try {
        const { status } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Choose Approved or Rejected." });
        }

        const request = await TimeOffRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ error: "Time-off request not found." });
        }

        request.status = status;
        request.manager_id = req.user.id;
        await request.save();

        res.json({ message: `Request ${status.toLowerCase()} successfully!`, request });
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get all time-off requests for a logged-in employee
router.get("/user", authMiddleware, async (req, res) => {
    try {
        const requests = await TimeOffRequest.find({ employee_id: req.user.id });
        res.json(requests);
    } catch (error) {
        console.error("Error fetching user time-off requests:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
