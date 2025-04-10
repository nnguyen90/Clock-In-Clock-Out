// routes/shift.js

const express = require("express");
const Shift = require("../models/Shift");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware to check if the user has manager or admin role
const checkManagerOrAdmin = (req, res, next) => {
    const roles = ['manager', 'admin']; // Define allowed roles
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Access denied. Only managers or admins can perform this action." });
    }
    next();
};

// Function to get employee availability from the User model
async function getEmployeeAvailability(employee_id) {
    try {
        const user = await User.findById(employee_id);
        return user.availability || [];  
    } catch (error) {
        console.error("Error fetching employee availability:", error);
        throw new Error("Failed to fetch employee availability.");
    }
}

async function detectShiftConflicts(dateStr, start_time, end_time, employee_id) {

    function getStartOfDayUTC(dateStr) {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    }
    
    function getEndOfDayUTC(dateStr) {
        const start = getStartOfDayUTC(dateStr);
        return new Date(start.getTime() + 24 * 60 * 60 * 1000);
    }
    
    function timeToMinutes(timeStr) {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
    }

    const startOfDay = getStartOfDayUTC(dateStr);
    const endOfDay = getEndOfDayUTC(dateStr);

    const query = {
        employee_id,
        date: { $gte: startOfDay, $lt: endOfDay },
    };

    const shifts = await Shift.find(query);
    const availability = await getEmployeeAvailability(employee_id);
    const dayOfWeek = startOfDay.getUTCDay();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];

    const shiftStart = timeToMinutes(start_time);
    const shiftEnd = timeToMinutes(end_time);

    const isAvailable = availability.some(avail => {
        if (avail.day !== dayName) return false;
        const availStart = timeToMinutes(avail.start_time);
        const availEnd = timeToMinutes(avail.end_time);
        return shiftStart >= availStart && shiftEnd <= availEnd;
    });

    if (!isAvailable) {
        return {
            available: false,
            message: "Cannot assign shift. Please check the employee's availability."
        };
    }

    if (shifts.length > 0) {
        return {
            available: false,
            message: "Shift conflict detected. Please check for overlapping shifts."
        };
    }

    return { available: true };
}


/**
 * @route GET /api/shifts/employees
 * @desc Get all employees for shift assignment (Manager only)
 */
router.get("/employees", authMiddleware, checkManagerOrAdmin, async (req, res) => {
    try {
        const employees = await User.find({ role: "user" }).select("firstName lastName email");
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/shifts
 * @desc Create a shift (Manager only)
 */
router.post("/", authMiddleware, checkManagerOrAdmin, async (req, res) => {
    try {
        const { date, start_time, end_time, employee_id } = req.body;
        console.log("Incoming request body:", req.body);
        console.log("Type of date:", typeof req.body.date, req.body.date);
        
        if (!date || !start_time || !end_time || !employee_id) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const conflictCheck = await detectShiftConflicts(date, start_time, end_time, employee_id);
        console.log("conflict check dsdsds", conflictCheck);
        if (!conflictCheck.available) {
            return res.status(409).json({ error: conflictCheck.message });
        }

        // const newShift = new Shift({
        //     manager_id: req.user.id,
        //     date,
        //     start_time,
        //     end_time,
        //     employee_id,
        //     status: "Assigned",
        // });

        const newShift = new Shift({
            manager_id: req.user.id,
            date: new Date(date + "T00:00:00"), // <-- normalized
            start_time,
            end_time,
            employee_id,
            status: "Assigned"
        });
        

        await newShift.save();
        res.status(201).json({ message: "Shift has been successfully assigned", shift: newShift });
    } catch (error) {
        console.error("Shift creation error:", error);
        res.status(500).json({ error: "An unexpected error occurred while creating the shift. Please check server logs for more details.", debug: error.message });
    }
});

/**
 * @route GET /api/shifts
 * @desc Get all shifts (Manager & Admins only)
 */
router.get("/", authMiddleware, checkManagerOrAdmin, async (req, res) => {
    try {
        const shifts = await Shift.find({}).populate("employee_id", "first_name last_name email");
        res.json(shifts);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve shifts. Please check server logs for more details." });
    }
});


/**
 * @route PUT /api/shifts/:id/assign
 * @desc Assign an employee to a shift (Manager only)
 */
router.put("/:id/assign", authMiddleware, checkManagerOrAdmin, async (req, res) => {
    try {
        const { employee_id } = req.body;
        const shift = await Shift.findById(req.params.id);
        if (!shift) return res.status(404).json({ error: "Shift not found" });

        const conflicts = await detectShiftConflicts(shift.date, shift.start_time, shift.end_time, employee_id);
        if (conflicts.length > 0 || conflicts.some(conf => conf.error)) {
            return res.status(409).json({ error: "Shift cannot be reassigned: outside employee's available times.", details: conflicts });
        }

        shift.employee_id = employee_id;
        shift.status = "Assigned";
        await shift.save();

        res.json({ message: "Shift has been successfully reassigned", shift });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route DELETE /api/shifts/:id
 * @desc Delete a shift (Manager only)
 */
router.delete("/:id", authMiddleware, checkManagerOrAdmin, async (req, res) => {
    try {
        await Shift.findByIdAndDelete(req.params.id);
        res.json({ message: "Shift deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/shifts/week/:date
 * @desc Get shifts for a given week (Manager & Admins only)
 */
router.get("/week/:date", authMiddleware, checkManagerOrAdmin, async (req, res) => {
    try {
        const { date } = req.params;

        // const startOfWeek = new Date(date);
        // startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        // const endOfWeek = new Date(startOfWeek);
        // endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startDate = new Date(date);
const endDate = new Date(startDate);
endDate.setDate(startDate.getDate() + 8);

const shifts = await Shift.find({
    date: { 
      $gte: startDate.toISOString().split("T")[0], 
      $lte: endDate.toISOString().split("T")[0]
    }
  }).populate("employee_id", "id");
  

        res.json(shifts);
    } catch (error) {
        console.error("Error fetching shifts for the week:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/userShifts', authMiddleware, async (req, res) => {
    const shifts = await Shift.find({ employee_id: req.user.id });
    res.json(shifts);
  });

  router.get('/user/:id', authMiddleware, async (req, res) => {
    const shifts = await Shift.find({ employee_id: req.params.id });
    res.json(shifts);
  });

module.exports = router;
