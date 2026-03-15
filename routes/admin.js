const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Candidate = require("../models/Candidate");
const Vote = require("../models/Vote");

// GET Dashboard Stats
router.get("/stats", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalVoted = await Student.countDocuments({ hasVoted: true });
    const totalNotVoted = totalStudents - totalVoted;
    const totalCandidates = await Candidate.countDocuments();
    const topCandidate = await Candidate.findOne().sort({ votes: -1 });
    res.json({
      success: true,
      stats: { totalStudents, totalVoted, totalNotVoted, totalCandidates,
        topCandidate: topCandidate ? topCandidate.name : "N/A",
        topCandidateVotes: topCandidate ? topCandidate.votes : 0 }
    });
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
});

// GET All Candidates
router.get("/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ votes: -1 });
    const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
    const results = candidates.map((c, index) => ({
      _id: c._id, id: c.id, name: c.name,
      subject: c.subject, qualification: c.qualification, photo: c.photo,
      votes: c.votes || 0, candidateLoginId: c.candidateLoginId,
      percentage: totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : "0.0",
      rank: index + 1
    }));
    res.json({ success: true, candidates: results, totalVotes });
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
});

// ADD Candidate → auto generate login ID + password
router.post("/candidates/add", async (req, res) => {
  try {
    const { name, subject, qualification, photo, candidateLoginId, password } = req.body;
    if (!name || !subject) return res.json({ success: false, message: "Name and Subject required" });

    const lastCandidate = await Candidate.findOne().sort({ id: -1 });
    const newId = lastCandidate ? lastCandidate.id + 1 : 1;

    // Auto generate login ID if not provided
    const loginId = candidateLoginId?.trim() || `CAN${String(newId).padStart(3, "0")}`;
    const loginPass = password?.trim() || "candidate@123";

    // Check duplicate login ID
    const existing = await Candidate.findOne({ candidateLoginId: loginId });
    if (existing) return res.json({ success: false, message: "Login ID already exists" });

    const candidate = await Candidate.create({
      id: newId, name, subject,
      qualification: qualification || "",
      photo: photo || "",
      votes: 0,
      candidateLoginId: loginId,
      password: loginPass
    });

    res.json({
      success: true,
      message: `Candidate added! Login ID: ${loginId}, Password: ${loginPass}`,
      candidate
    });
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
});

// UPDATE Candidate
router.put("/candidates/update/:id", async (req, res) => {
  try {
    const { name, subject, qualification, photo, candidateLoginId, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (subject) updateData.subject = subject;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (photo !== undefined) updateData.photo = photo;
    if (candidateLoginId?.trim()) updateData.candidateLoginId = candidateLoginId.trim();
    if (password?.trim()) updateData.password = password.trim();

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!candidate) return res.json({ success: false, message: "Candidate not found" });
    res.json({ success: true, message: "Candidate updated", candidate });
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
});

// DELETE Candidate
router.delete("/candidates/delete/:id", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const candidateObjId = new mongoose.Types.ObjectId(req.params.id);
    const votes = await Vote.find({ candidateId: candidateObjId });
    for (const vote of votes) {
      await Student.findByIdAndUpdate(vote.studentId, { hasVoted: false });
    }
    await Vote.deleteMany({ candidateId: candidateObjId });
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Candidate deleted" });
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
});

// CANDIDATE LOGIN
router.post("/candidates/login", async (req, res) => {
  try {
    const { candidateLoginId, password } = req.body;
    if (!candidateLoginId || !password) return res.json({ success: false, message: "ID aur password zaroori hain" });

    const candidate = await Candidate.findOne({ candidateLoginId: candidateLoginId.trim() });
    if (!candidate) return res.json({ success: false, message: "Candidate not found" });
    if (candidate.password !== password.trim()) return res.json({ success: false, message: "Invalid password" });

    res.json({
      success: true,
      candidate: {
        _id: candidate._id,
        id: candidate.id,
        candidateLoginId: candidate.candidateLoginId,
        name: candidate.name,
        subject: candidate.subject,
        qualification: candidate.qualification,
        photo: candidate.photo,
        votes: candidate.votes
      }
    });
  } catch { res.json({ success: false, message: "Login error" }); }
});

// RESET All Votes
router.post("/reset-votes", async (req, res) => {
  try {
    await Vote.deleteMany({});
    await Student.updateMany({}, { hasVoted: false });
    await Candidate.updateMany({}, { votes: 0 });
    res.json({ success: true, message: "All votes have been reset!" });
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
});

module.exports = router;
