const mongoose = require("mongoose");

const ShiftSwapSchema = new mongoose.Schema({
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  requested_for: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  requested_by_employee_shiftID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shift",
    required: true
  },
  requested_for_employee_shiftID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shift",
    required: true
  },
  reason: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ShiftSwap", ShiftSwapSchema);
