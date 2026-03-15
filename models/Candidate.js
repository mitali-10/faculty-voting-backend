const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  id: Number,
  name: String,
  subject: { type: String, default: "" },
  qualification: { type: String, default: "" },
  photo: { type: String, default: "" },
  votes: { type: Number, default: 0 },
  candidateLoginId: { type: String, default: "" },
  password: { type: String, default: "" },
  email: { type: String, default: "" }
});

module.exports = mongoose.model("Candidate", candidateSchema);