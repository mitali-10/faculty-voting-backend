const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Candidate = require("../models/Candidate");
const Vote = require("../models/Vote");

router.post("/", async (req, res) => {
  try {

    const { candidateId, studentId } = req.body;

    // Check required fields
    if (!candidateId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Missing candidateId or studentId"
      });
    }

    // Find Student
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Prevent double voting
    if (student.hasVoted) {
      return res.status(400).json({
        success: false,
        message: "You have already voted!"
      });
    }

    // Find Candidate
    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found"
      });
    }

    // Increase vote count
    candidate.votes = (candidate.votes || 0) + 1;
    await candidate.save();

    // Save vote record (important for delete vote logic)
    await Vote.create({
      studentId: student._id,
      candidateId: candidate._id
    });

    // Mark student as voted
    student.hasVoted = true;
    await student.save();

    return res.status(200).json({
      success: true,
      message: "Vote submitted successfully"
    });

  } catch (error) {

    console.error("Vote Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
});

module.exports = router;