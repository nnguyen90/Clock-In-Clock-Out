const mongoose = require("mongoose");

const ShiftSchema = new mongoose.Schema({
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  status: { type: String, default: "Assigned" },
});

module.exports = mongoose.model("Shift", ShiftSchema);