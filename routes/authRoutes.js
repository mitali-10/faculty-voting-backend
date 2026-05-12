const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const PasswordResetRequest = require("../models/PasswordResetRequest");

// Change password (old password pata hai)
router.post("/change-password", async (req, res) => {
  try {
    const { userId, userType, oldPassword, newPassword } = req.body;
    if (!userId || !userType || !oldPassword || !newPassword)
      return res.json({ success: false, message: "All fields required" });

    if (userType === "student") {
      const student = await Student.findOne({ enrollmentNo: userId.trim() });
      if (!student) return res.json({ success: false, message: "Student not found" });
        if (student.password !== oldPassword.trim())
         return res.json({ success: false, message: "Old password incorrect" });
      student.password = newPassword.trim();
      await student.save();
      return res.json({ success: true, message: "Password changed successfully" });
    }

    if (userType === "faculty") {
      const faculty = await Faculty.findOne({ facultyId: userId.trim() });
      if (!faculty) return res.json({ success: false, message: "Faculty not found" });
      if (faculty.password !== oldPassword.trim())
        return res.json({ success: false, message: "Old password incorrect" });
      faculty.password = newPassword.trim();
      await faculty.save();
      return res.json({ success: true, message: "Password changed successfully" });
    }

    res.json({ success: false, message: "Invalid user type" });
  } catch { res.json({ success: false, message: "Server error" }); }
});

// Request password reset (old password yaad nahi)
router.post("/forgot-password", async (req, res) => {
  try {
    const { userId, userType } = req.body;
    if (!userId || !userType)
      return res.json({ success: false, message: "User ID required" });

    let name = "", email = "";

    if (userType === "student") {
      const student = await Student.findOne({ enrollmentNo: userId.trim() });
      if (!student) return res.json({ success: false, message: "Student not found" });
      name = student.name || userId;
      email = student.email || "";
    } else if (userType === "faculty") {
      const faculty = await Faculty.findOne({ facultyId: userId.trim() });
      if (!faculty) return res.json({ success: false, message: "Faculty not found" });
      name = faculty.name || userId;
      email = faculty.email || "";
    }

    // Duplicate request check
    const existing = await PasswordResetRequest.findOne({ userId: userId.trim(), userType, status: "pending" });
    if (existing) return res.json({ success: true, message: "Request already sent. contact form admin." });

    await PasswordResetRequest.create({ userId: userId.trim(), userType, name, email });
    res.json({ success: true, message: "Request sent. Admin are reset your password " });
  } catch { res.json({ success: false, message: "Server error" }); }
});

// GET all pending requests (admin ke liye)
router.get("/reset-requests", async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch { res.json({ success: false, message: "Error fetching requests" }); }
});

// Mark request resolved (admin ne password de diya)
router.put("/reset-requests/:id/resolve", async (req, res) => {
  try {
    await PasswordResetRequest.findByIdAndUpdate(req.params.id, { status: "resolved" });
    res.json({ success: true, message: "Request resolved" });
  } catch { res.json({ success: false, message: "Error resolving request" }); }
});

module.exports = router;
