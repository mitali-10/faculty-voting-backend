const mongoose = require("mongoose");

delete mongoose.models.Student;

const studentSchema = new mongoose.Schema({
  enrollmentNo: { type: String, required: true, unique: true },
  name: { type: String, default: "" },
  email: { type: String, default: "" },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  hasVoted: { type: Boolean, default: false },
  faceDescriptor: { type: [Number], default: null }, // face-api.js 128-point descriptor
});

module.exports = mongoose.model("Student", studentSchema);