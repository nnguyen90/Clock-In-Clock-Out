// models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  role: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  job_title: String,
  department: String,
  hourly_pay_rate: { type: Number, required: true },
  employment_status: { type: String, enum: ["Full-Time", "Part-Time"], required: true },
  availability: { type: Array, default: [] },
  notifications: { type: Array, default: [] },
  is_active: { type: String, default: "True" },
  password: { type: String, required: true }
});

// hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// compare entered password with hashed password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema, "employees");