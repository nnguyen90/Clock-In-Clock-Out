// routes/user.js

const express = require('express');
const User = require('../models/User');
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Middleware: restrict availability modification to admin/manager
const requireManagerOrAdmin = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "manager") {
    return res.status(403).json({ error: "Only admins or managers can modify availability." });
  }
  next();
};

// Add a new user
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, role, email, phone, job_title, department, hourly_pay_rate, employment_status, availability, password } = req.body;

    // Restrict access to admins only
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Validate required fields
    if (!first_name || !last_name || !role || !email || !phone || !hourly_pay_rate || !employment_status || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Find the highest `id` in the database and increment it
    let nextId = 1;
    const lastUser = await User.findOne().sort({ id: -1 }).select("id");

    if (lastUser && lastUser.id && !isNaN(lastUser.id)) {
      nextId = parseInt(lastUser.id, 10) + 1;
    }

    let isDuplicate = true;
    while (isDuplicate) {
      const checkUser = await User.findOne({ id: nextId.toString() });
      if (!checkUser) {
        isDuplicate = false;
      } else {
        nextId++;
      }
    }

    const newUser = new User({
      id: nextId.toString(), 
      first_name,
      last_name,
      role,
      email,
      phone,
      job_title,
      department,
      hourly_pay_rate,
      employment_status,
      availability: availability || [], 
      is_active: "True",
      password, 
    });

    // Save to the database
    const savedUser = await newUser.save();

    // Format response to match MongoDB field names
    res.status(201).json({
      _id: savedUser._id,
      id: savedUser.id,
      first_name: savedUser.first_name,
      last_name: savedUser.last_name,
      role: savedUser.role,
      email: savedUser.email,
      phone: savedUser.phone,
      job_title: savedUser.job_title,
      department: savedUser.department,
      hourly_pay_rate: savedUser.hourly_pay_rate,
      employment_status: savedUser.employment_status,
      availability: savedUser.availability,
      is_active: savedUser.is_active
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Get all users
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password"); 
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// To get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({
      $or: [{ id: req.user.id }, { _id: req.user.id }]
    }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching employee profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({id:req.params.id});
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a user by ID
// router.put('/:id', async (req, res) => {
//   try {
//     const updatedUser = await User.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
//     if (!updatedUser) return res.status(404).json({ error: "User not found" });
//     res.json(updatedUser);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

const mongoose = require("mongoose");

router.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId }  
      : { id: userId }; 

    console.log("Updating user with query:", query);
    console.log("Update data:", req.body);

    // Find user by either _id or id
    const updatedUser = await User.findOneAndUpdate(query, req.body, { new: true, runValidators: true });

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message });
  }
});



// Delete a user by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /api/users/:userId/availability
 * @desc Get user availability by user _id
 */
router.get('/:userId/availability', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('availability');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.availability);
  } catch (err) {
    console.error('Error fetching availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/users/:userId/availability
 * @desc Add availability to user by user _id (with autogenerated _id for each availability entry)
 */
router.post('/:userId/availability', authMiddleware, requireManagerOrAdmin, async (req, res) => {
  const { _id, day, start_time, end_time } = req.body;

  if (!_id || !day || !start_time || !end_time) {
    return res.status(400).json({ error: 'ID, day, start_time, and end_time are required' });
  }

  try {
    const availabilityEntry = { _id, day, start_time, end_time };

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $push: { availability: availabilityEntry } },
      { new: true, select: 'availability' }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(201).json(user.availability);
  } catch (err) {
    console.error('Error adding availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route PUT /api/users/:userId/availability/:availabilityId
 * @desc Update a specific availability entry by its _id
 */
router.put('/:userId/availability/:availabilityId', authMiddleware, requireManagerOrAdmin, async (req, res) => {
  const { day, start_time, end_time } = req.body;

  if (!day && !start_time && !end_time) {
    return res.status(400).json({ error: 'At least one field (day, start_time, end_time) must be provided' });
  }

  try {
    const updateFields = {};
    if (day) updateFields['availability.$.day'] = day;
    if (start_time) updateFields['availability.$.start_time'] = start_time;
    if (end_time) updateFields['availability.$.end_time'] = end_time;

    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, 'availability._id': req.params.availabilityId },
      { $set: updateFields },
      { new: true, select: 'availability' }
    );

    if (!user) return res.status(404).json({ error: 'User or availability entry not found' });

    res.json({ message: 'Availability updated successfully', availability: user.availability });
  } catch (err) {
    console.error('Error updating availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route DELETE /api/users/:userId/availability/:availabilityId
 * @desc Delete a specific availability entry by its _id
 */
router.delete('/:userId/availability/:availabilityId', authMiddleware, requireManagerOrAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $pull: { availability: { _id: req.params.availabilityId } } },
      { new: true, select: 'availability' }
    );

    if (!user) return res.status(404).json({ error: 'User or availability entry not found' });

    res.json({ message: 'Availability entry deleted successfully', availability: user.availability });
  } catch (err) {
    console.error('Error deleting availability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
