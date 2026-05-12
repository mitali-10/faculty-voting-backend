const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

mongoose.connect("mongodb+srv://AdminMitali:%40Mitali10@cluster0.gcxvk6e.mongodb.net/facultyVoting")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(" MongoDB Error:", err));

const Student = require("./models/Student");
const Candidate = require("./models/Candidate");
const Vote = require("./models/Vote");
const ElectionConfig = require("./models/ElectionConfig");
// In-memory password reset requests (no enum issues)
const resetRequests = [];
let reqIdCounter = 1;

// ===== STUDENT ROUTES =====
app.post("/api/students/add", async (req, res) => {
  try {
    const { enrollmentNo, name, email, password } = req.body;
    if (!enrollmentNo || !password) return res.json({ success: false, message: "Enrollment No and Password required" });
    const existing = await Student.findOne({ enrollmentNo: enrollmentNo.trim() });
    if (existing) return res.json({ success: false, message: "Student already exists" });
    await Student.create({ enrollmentNo: enrollmentNo.trim(), name: name || "", email: email || "", password: password.trim() });
    res.json({ success: true, message: "Student Added Successfully" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/students/login", async (req, res) => {
  try {
    const { enrollmentNo, password } = req.body;
    const student = await Student.findOne({ enrollmentNo: enrollmentNo.trim() });
    if (!student) return res.json({ success: false, message: "Student not found" });
    if (student.password !== password.trim()) return res.json({ success: false, message: "Invalid password" });
    if (!student.isActive) return res.json({ success: false, message: "Account Disabled" });
    res.json({ success: true, student: { _id: student._id, enrollmentNo: student.enrollmentNo, name: student.name, email: student.email, hasVoted: student.hasVoted } });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.get("/api/students/all", async (req, res) => {
  try {
    const students = await Student.find().sort({ enrollmentNo: 1 });
    res.json(students);
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.put("/api/students/update/:id", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const update = { name, email };
    if (password?.trim()) update.password = password.trim();
    await Student.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true, message: "Updated" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.delete("/api/students/delete/:id", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const sId = new mongoose.Types.ObjectId(req.params.id);
    const vote = await Vote.findOne({ studentId: sId });
    if (vote) {
      await Candidate.findByIdAndUpdate(vote.candidateId, { $inc: { votes: -1 } });
      await Vote.deleteOne({ studentId: sId });
    }
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Student deleted" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.put("/api/students/toggle/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    const vote = await Vote.findOne({ studentId: student._id });
    if (vote) {
      if (student.isActive) await Candidate.findByIdAndUpdate(vote.candidateId, { $inc: { votes: -1 } });
      else await Candidate.findByIdAndUpdate(vote.candidateId, { $inc: { votes: 1 } });
    }
    student.isActive = !student.isActive;
    await student.save();
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ===== ADMIN STATS =====
app.get("/api/admin/stats", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalVoted = await Student.countDocuments({ hasVoted: true });
    const topCandidate = await Candidate.findOne().sort({ votes: -1 });
    res.json({ success: true, stats: { totalStudents, totalVoted, 
      totalNotVoted: totalStudents - totalVoted, topCandidate: topCandidate?.name || "N/A", 
      topCandidateVotes: topCandidate?.votes || 0 } });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ===== CANDIDATE ROUTES =====
app.get("/api/admin/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ votes: -1 });
    const total = candidates.reduce((s, c) => s + c.votes, 0);
    res.json({ success: true, candidates: candidates.map((c, i) => ({ ...c.toObject(), 
      percentage: total > 0 ? ((c.votes/total)*100).toFixed(1) : "0.0", rank: i+1 })), totalVotes: total });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/admin/candidates/add", async (req, res) => {
  try {
    const { name, subject, qualification, photo, email, candidateLoginId, password } = req.body;
    if (!name || !subject) return res.json({ success: false, message: "Name and Subject required" });
    const last = await Candidate.findOne().sort({ id: -1 });
    const newId = last ? last.id + 1 : 1;
    const loginId = candidateLoginId?.trim() || `CAN${String(newId).padStart(3, "0")}`;
    const loginPass = password?.trim() || "candidate@123";
    const dupCheck = await Candidate.findOne({ candidateLoginId: loginId });
    if (dupCheck) return res.json({ success: false, message: `Login ID "${loginId}" already exists` });
    const candidate = await Candidate.create({ id: newId, name, subject, qualification: qualification || "", 
      photo: photo || "", email: email || "", votes: 0, candidateLoginId: loginId, password: loginPass });
    res.json({ success: true, message: `Candidate added! Login ID: ${loginId}, Password: candidate@123`, candidate });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.put("/api/admin/candidates/update/:id", async (req, res) => {
  try {
    const { name, subject, qualification, photo, candidateLoginId, password, email } = req.body;
    const update = {};
    if (name) update.name = name;
    if (subject) update.subject = subject;
    if (qualification !== undefined) update.qualification = qualification;
    if (photo !== undefined) update.photo = photo;
    if (candidateLoginId?.trim()) update.candidateLoginId = candidateLoginId.trim();
    if (password?.trim()) update.password = password.trim();
    if (email !== undefined) update.email = email;
    const c = await Candidate.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!c) return res.json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Updated", candidate: c });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.delete("/api/admin/candidates/delete/:id", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const cId = new mongoose.Types.ObjectId(req.params.id);
    const votes = await Vote.find({ candidateId: cId });
    for (const v of votes) await Student.findByIdAndUpdate(v.studentId, { hasVoted: false });
    await Vote.deleteMany({ candidateId: cId });
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/admin/candidates/login", async (req, res) => {
  try {
    const { candidateLoginId, password } = req.body;
    if (!candidateLoginId || !password) return res.json({ success: false, message: "ID aur password zaroori hain" });
    const c = await Candidate.findOne({ candidateLoginId: candidateLoginId.trim() });
    if (!c) return res.json({ success: false, message: "Candidate not found" });
    if (c.password !== password.trim()) return res.json({ success: false, message: "Invalid password" });
    res.json({ success: true, candidate: { _id: c._id, id: c.id, candidateLoginId: c.candidateLoginId, 
      name: c.name, subject: c.subject, qualification: c.qualification, photo: c.photo, votes: c.votes } });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/admin/reset-votes", async (req, res) => {
  try {
    await Vote.deleteMany({});
    await Student.updateMany({}, { hasVoted: false });
    await Candidate.updateMany({}, { votes: 0 });
    res.json({ success: true, message: "All votes reset!" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// ===== VOTE =====
app.post("/api/vote", async (req, res) => {
  try {
    const { candidateId, studentId } = req.body;
    if (!candidateId || !studentId) return res.json({ success: false, message: "Missing data" });
    const config = await ElectionConfig.findOne();
    if (config) {
      const now = new Date();
      if (!config.isActive) return res.json({ success: false, message: "Voting closed." });
      if (config.startTime && now < config.startTime) return res.json({ success: false, 
        message: "Voting not started.", startTime: config.startTime });
      if (config.endTime && now > config.endTime) return res.json({ success: false, 
        message: "Voting ended.", ended: true });
    }
    const student = await Student.findById(studentId);
    if (!student) return res.json({ success: false, message: "Student not found" });
    if (student.hasVoted) return res.json({ success: false, message: "Already voted" });
    const candidate = await Candidate.findOne({ id: Number(candidateId) });
    if (!candidate) return res.json({ success: false, message: "Candidate not found" });
    candidate.votes += 1;
    await candidate.save();
    await Vote.create({ studentId: student._id, candidateId: candidate._id });
    student.hasVoted = true;
    await student.save();
    res.json({ success: true, message: "Vote submitted!" });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// ===== RESULTS =====
app.get("/api/results", async (req, res) => {
  try {
    const results = await Candidate.find().sort({ votes: -1 });
    res.json(results.map(c => ({ _id: c._id, id: c.id, name: c.name, subject: c.subject, 
      qualification: c.qualification, photo: c.photo, votes: c.votes, 
      candidateLoginId: c.candidateLoginId, email: c.email })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ===== ELECTION CONFIG =====
app.get("/api/election/config", async (req, res) => {
  try {
    let config = await ElectionConfig.findOne();
    if (!config) config = await ElectionConfig.create({});
    res.json({ success: true, config });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/election/config", async (req, res) => {
  try {
    const { startTime, endTime, isActive } = req.body;
    let config = await ElectionConfig.findOne();
    if (!config) config = new ElectionConfig();
    if (startTime !== undefined) config.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) config.endTime = endTime ? new Date(endTime) : null;
    if (isActive !== undefined) config.isActive = isActive;
    await config.save();
    res.json({ success: true, message: "Saved", config });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.get("/api/election/check", async (req, res) => {
  try {
    const config = await ElectionConfig.findOne();
    if (!config) return res.json({ allowed: true });
    const now = new Date();
    if (!config.isActive) return res.json({ allowed: false, reason: "Voting closed." });
    if (config.startTime && now < config.startTime) return res.json({ allowed: false, reason: "Voting not started.", startTime: config.startTime });
    if (config.endTime && now > config.endTime) return res.json({ allowed: false, reason: "Voting ended.", endTime: config.endTime });
    res.json({ allowed: true, endTime: config.endTime || null });
  } catch (e) { res.json({ allowed: true }); }
});

// ===== AUTH (password change/forgot) =====
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { userId, userType, oldPassword, newPassword } = req.body;
    if (userType === "student") {
      const s = await Student.findOne({ enrollmentNo: userId.trim() });
      if (!s) return res.json({ success: false, message: "Student not found" });
      if (s.password !== oldPassword.trim()) return res.json({ success: false, message: "Old password incorrect" });
      s.password = newPassword.trim(); await s.save();
      return res.json({ success: true, message: "Password changed!" });
    }
    if (userType === "candidate") {
      const c = await Candidate.findOne({ candidateLoginId: userId.trim() });
      if (!c) return res.json({ success: false, message: "Candidate not found" });
      if (c.password !== oldPassword.trim()) return res.json({ success: false, message: "Old password incorrect" });
      c.password = newPassword.trim(); await c.save();
      return res.json({ success: true, message: "Password changed!" });
    }
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { userId, userType } = req.body;
    if (!userId || !userType) return res.json({ success: false, message: "ID required" });
    const existing = resetRequests.find(r => r.userId === userId.trim() && r.status === "pending");
    if (existing) return res.json({ success: true, message: "Request already sent. Contact admin." });
    let name = userId, email = "";
    if (userType === "student") {
      const s = await Student.findOne({ enrollmentNo: userId.trim() });
      if (!s) return res.json({ success: false, message: "Student not found" });
      name = s.name || userId; email = s.email || "";
    }
    if (userType === "candidate") {
      const c = await Candidate.findOne({ candidateLoginId: userId.trim() });
      if (!c) return res.json({ success: false, message: "Candidate not found" });
      name = c.name || userId; email = c.email || "";
    }
    resetRequests.push({ _id: String(reqIdCounter++), userId: userId.trim(), userType, name, email, status: "pending", createdAt: new Date() });
    res.json({ success: true, message: "Request sent. Admin aapka password reset karega." });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.get("/api/auth/reset-requests", async (req, res) => {
  try {
    const pending = resetRequests.filter(r => r.status === "pending").reverse();
    res.json({ success: true, requests: pending });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.put("/api/auth/reset-requests/:id/resolve", async (req, res) => {
  try {
    const req2 = resetRequests.find(r => r._id === req.params.id);
    if (req2) req2.status = "resolved";
    res.json({ success: true, message: "Resolved" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});


// ===== ADMIN FORGOT PASSWORD =====
app.post("/api/admin-auth/send-otp", async (req, res) => {
  try {
    const { username } = req.body;
    if (username !== "AdminMitali") return res.json({ success: false, message: "Admin username nahi mila" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store OTP in memory (simple approach)
    global.adminOtp = { otp, expiry: Date.now() + 10 * 60 * 1000 };
    res.json({ success: true, otp, email: "mbhilwadiya@gmail.com", message: "OTP generate ho gaya" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/admin-auth/reset-password", async (req, res) => {
  try {
    const { username, otp, newPassword } = req.body;
    if (username !== "AdminMitali") return res.json({ success: false, message: "Admin not found" });
    if (!global.adminOtp) return res.json({ success: false, message: "OTP nahi mila. Pehle OTP bhejo." });
    if (global.adminOtp.otp !== otp.trim()) return res.json({ success: false, message: "OTP galat hai" });
    if (Date.now() > global.adminOtp.expiry) return res.json({ success: false, message: "OTP expire ho gaya. Dobara request karein." });
    // Update admin password in memory
    global.adminPassword = newPassword.trim();
    global.adminOtp = null;
    res.json({ success: true, message: "Password reset ho gaya!" });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Admin login with dynamic password support
app.post("/api/admin-auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const correctPass = global.adminPassword || "@Mitali10";
    if (username === "AdminMitali" && password === correctPass) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (e) { res.json({ success: false, message: e.message }); }
});

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));