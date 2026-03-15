const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userType: { type: String, enum: ["student", "candidate", "faculty"], required: true },
  name: { type: String, default: "" },
  email: { type: String, default: "" },
  status: { type: String, enum: ["pending", "resolved"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models["PasswordResetRequest"] || mongoose.model("PasswordResetRequest", passwordResetRequestSchema);