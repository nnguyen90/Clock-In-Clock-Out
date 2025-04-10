// models/Log.js

const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  clock_in_time: {
    type: Date,
    default: null, 
  },
  clock_out_time: {
    type: Date,
    default: null,
  },
  total_hours: {
    type: Number,
    default: 0, 
  },
  status: {
    type: String,
    enum: ["Clocked In", "Clocked Out"],
    default: "Clocked Out",
  },
});

const Log = mongoose.model("Log", LogSchema);
module.exports = Log;
