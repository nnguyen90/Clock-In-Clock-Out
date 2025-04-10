const express = require("express");
const router = express.Router();
const Shift = require("../models/Shift");
const authMiddleware = require("../middleware/authMiddleware");
const ShiftSwap = require("../models/ShiftSwap");

const checkManager = (req, res, next) => {
  if (req.user.role !== "manager" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Only managers can approve/reject requests." });
  }
  next();
};
// ✅ Approve Shift Swap
router.put("/:id/approve", authMiddleware,checkManager, async (req, res) => {
  try {
    console.log("request headfer",req.params.id)
    const shiftSwap = await ShiftSwap.findById(req.params.id);
    if (!shiftSwap) {
      return res.status(404).json({ error: "Shift swap not found." });
    }

    if (shiftSwap.status === "Approved") {
      return res.status(400).json({ error: "Shift swap is already approved." });
    }

    const shift1 = await Shift.findById(shiftSwap.requested_by_employee_shiftID);
    const shift2 = await Shift.findById(shiftSwap.requested_for_employee_shiftID);

    if (!shift1 || !shift2) {
      return res.status(404).json({ error: "One or both shifts not found." });
    }

    // 🔁 Swap the employees on the shifts
    shift1.employee_id = shiftSwap.requested_for;
    shift2.employee_id = shiftSwap.requested_by;

    await shift1.save();
    await shift2.save();

    // ✅ Update the swap status
    shiftSwap.status = "Approved";
    await shiftSwap.save();

    res.status(200).json({ message: "Shift swap approved and shifts updated successfully." });
  } catch (error) {
    console.error("Error approving shift swap:", error);
    res.status(500).json({ error: "Internal server error while approving shift swap." });
  }
});



// ✅ Get All Shift Swaps
router.get("/", authMiddleware, async (req, res) => {
  try {
    const swaps = await ShiftSwap.find({status: "Pending" })
    .populate("requested_by", "email first_name last_name")
    .populate("requested_for", "email first_name last_name")
    .populate("requested_by_employee_shiftID")
    .populate("requested_for_employee_shiftID")
    .sort({ createdAt: -1 });

    res.json(swaps);
  } catch (err) {
    console.error("Error fetching shift swaps:", err);
    res.status(500).json({ error: "Failed to fetch shift swaps." });
  }
});


// ✅ Reject Shift Swap
router.put("/:id/reject", authMiddleware, async (req, res) => {
  try {
    const shiftSwap = await ShiftSwap.findById(req.params.id);
    if (!shiftSwap) {
      return res.status(404).json({ error: "Shift swap not found." });
    }

    if (shiftSwap.status === "Rejected") {
      return res.status(400).json({ error: "Shift swap is already rejected." });
    }

    shiftSwap.status = "Rejected";
    await shiftSwap.save();

    res.status(200).json({ message: "Shift swap has been rejected." });
  } catch (err) {
    console.error("Error rejecting shift swap:", err);
    res.status(500).json({ error: "Internal server error while rejecting shift swap." });
  }
});

// ✅ Create a New Shift Swap Request
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      requested_by,
      requested_for,
      requested_by_employee_shiftID,
      requested_for_employee_shiftID,
      reason,
    } = req.body;

    // Basic validation
    if (
      !requested_by ||
      !requested_for ||
      !requested_by_employee_shiftID ||
      !requested_for_employee_shiftID
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Optional: Check if swap already requested for the same shifts/users
    const existing = await ShiftSwap.findOne({
      requested_by,
      requested_for,
      requested_by_employee_shiftID,
      requested_for_employee_shiftID,
      status: "Pending",
    });

    if (existing) {
      return res.status(409).json({ error: "A similar shift swap request is already pending." });
    }

    // Create shift swap
    const newSwap = new ShiftSwap({
      requested_by,
      requested_for,
      requested_by_employee_shiftID,
      requested_for_employee_shiftID,
      reason,
    });

    await newSwap.save();

    res.status(201).json({ message: "Shift swap request submitted successfully." });
  } catch (err) {
    console.error("Error creating shift swap:", err);
    res.status(500).json({ error: "Internal server error while creating shift swap request." });
  }
});

// ✅ Get Logged-In User's Swap Requests
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const swaps = await ShiftSwap.find({
      $or: [
        { requested_by: userId },
        { requested_for: userId }
      ]
    }).populate("requested_by", "email first_name last_name")
      .populate("requested_for", "email first_name last_name")
      .populate("requested_by_employee_shiftID")
      .populate("requested_for_employee_shiftID")
      .sort({ createdAt: -1 });

    res.json(swaps);
  } catch (err) {
    console.error("Error fetching user swap requests:", err);
    res.status(500).json({ error: "Failed to fetch your shift swap requests." });
  }
});


module.exports = router;
