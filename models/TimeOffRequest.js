const mongoose = require("mongoose");

const TimeOffRequestSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The manager handling the request
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TimeOffRequest", TimeOffRequestSchema);