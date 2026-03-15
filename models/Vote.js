const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" }
});

module.exports = mongoose.models["Vote"] || mongoose.model("Vote", voteSchema);
