const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Vote = require("../models/Vote");
const Candidate = require("../models/Candidate");

// ================= ADD STUDENT =================
router.post("/add", async (req, res) => {
  try {
    const { enrollmentNo, name, email, password } = req.body;
    if (!enrollmentNo || !password) {
      return res.status(400).json({ success: false, message: "Enrollment No and Password required" });
    }
    const existing = await Student.findOne({ enrollmentNo: enrollmentNo.trim() });
    if (existing) {
      return res.json({ success: false, message: "Student already exists" });
    }
    const newStudent = new Student({
      enrollmentNo: enrollmentNo.trim(),
      name: name ? name.trim() : "",
      email: email ? email.trim() : "",
      password: password.trim(),
    });
    await newStudent.save();
    res.json({ success: true, message: "Student Added Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error adding student" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { enrollmentNo, password } = req.body;
    if (!enrollmentNo || !password) {
      return res.status(400).json({ success: false, message: "Please enter credentials" });
    }
    const student = await Student.findOne({ enrollmentNo: enrollmentNo.trim() });
    if (!student) return res.json({ success: false, message: "Student not found" });
    if (student.password !== password.trim()) return res.json({ success: false, message: "Invalid password" });
    if (!student.isActive) return res.json({ success: false, message: "Account Disabled" });

    res.json({
      success: true,
      student: {
        _id: student._id,
        enrollmentNo: student.enrollmentNo,
        name: student.name,
        email: student.email,
        hasVoted: student.hasVoted,
        role: "student"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ================= GET ALL =================
router.get("/all", async (req, res) => {
  try {
    const students = await Student.find().sort({ enrollmentNo: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching students" });
  }
});

// ================= UPDATE STUDENT =================
router.put("/update/:id", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (password && password.trim() !== "") updateData.password = password.trim();

    const student = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!student) return res.json({ success: false, message: "Student not found" });
    res.json({ success: true, message: "Student updated successfully", student });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update error" });
  }
});

// ================= DELETE =================
router.delete("/delete/:id", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const studentId = req.params.id;
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const vote = await Vote.findOne({ studentId: studentObjectId });
    if (vote) {
      await Candidate.findByIdAndUpdate(vote.candidateId, { $inc: { votes: -1 } });
      await Vote.deleteOne({ studentId: studentObjectId });
    }
    await Student.findByIdAndDelete(studentId);
    res.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete error" });
  }
});

// ================= TOGGLE ACTIVE =================
router.put("/toggle/:id", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const student = await Student.findById(req.params.id);
    const studentObjectId = new mongoose.Types.ObjectId(student._id);
    const vote = await Vote.findOne({ studentId: studentObjectId });
    if (vote) {
      if (student.isActive) {
        await Candidate.findByIdAndUpdate(vote.candidateId, { $inc: { votes: -1 } });
      } else {
        await Candidate.findByIdAndUpdate(vote.candidateId, { $inc: { votes: 1 } });
      }
    }
    student.isActive = !student.isActive;
    await student.save();
    res.json({ success: true, message: `Student ${student.isActive ? "enabled" : "disabled"}` });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
