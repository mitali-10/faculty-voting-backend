const express = require("express");
const router = express.Router();
const ElectionConfig = require("../models/ElectionConfig");

// GET config
router.get("/config", async (req, res) => {
  try {
    let config = await ElectionConfig.findOne();
    if (!config) config = await ElectionConfig.create({});
    res.json({ success: true, config });
  } catch { res.json({ success: false, message: "Error fetching config" }); }
});

// SAVE config
router.post("/config", async (req, res) => {
  try {
    const { startTime, endTime, isActive } = req.body;
    let config = await ElectionConfig.findOne();
    if (!config) config = new ElectionConfig();
    if (startTime !== undefined) config.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) config.endTime = endTime ? new Date(endTime) : null;
    if (isActive !== undefined) config.isActive = isActive;
    await config.save();
    res.json({ success: true, message: "Schedule saved", config });
  } catch { res.json({ success: false, message: "Error saving config" }); }
});

// CHECK — kya abhi voting allowed hai?
router.get("/check", async (req, res) => {
  try {
    let config = await ElectionConfig.findOne();
    if (!config) return res.json({ allowed: true }); // no config = allowed

    const now = new Date();

    if (!config.isActive) {
      return res.json({ allowed: false, reason: "Voting abhi band hai. Admin ne voting disable ki hai." });
    }
    if (config.startTime && now < config.startTime) {
      return res.json({
        allowed: false,
        reason: "Voting abhi shuru nahi hui hai.",
        startTime: config.startTime
      });
    }
    if (config.endTime && now > config.endTime) {
      return res.json({
        allowed: false,
        reason: "Voting ka samay khatam ho gaya hai.",
        endTime: config.endTime
      });
    }

    res.json({ allowed: true, endTime: config.endTime || null });
  } catch { res.json({ allowed: true }); }
});

module.exports = router;
