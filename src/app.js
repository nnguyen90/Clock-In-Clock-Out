// src/app.js

require('dotenv').config(); 

const express = require('express');
const mongoose = require("mongoose");
const cors = require('cors');
const authRoutes = require("../routes/auth");  
const userRoutes = require("../routes/user");
const clockRoutes = require("../routes/clock"); 
const shiftRoutes = require("../routes/shift");
const timeOffRoutes = require("../routes/timeOff");
const swapshiftRoutes = require("../routes/ShiftSwap")


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); 

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); 
app.use("/api/clock", clockRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/timeoff", timeOffRoutes);
app.use("/api/swapshift", swapshiftRoutes);


module.exports = app;
