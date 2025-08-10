const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Complaint = require("../models/Complaint");

// Endpoint for fetching tasks assigned to a worker
router.get("/tasks", authMiddleware, async (req, res) => {
  try {
    // Filter complaints where the workerAssignments array contains an entry for the logged-in worker
    const tasks = await Complaint.find({
      "workerAssignments.workerId": req.user._id,
      status: "in progress"
    });
    res.json({ tasks });
  } catch (error) {
    console.error("Error fetching worker tasks:", error);
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
  }
});

module.exports = router;
