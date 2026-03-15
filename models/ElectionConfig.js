const mongoose = require("mongoose");

const electionConfigSchema = new mongoose.Schema({
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.models.ElectionConfig || mongoose.model("ElectionConfig", electionConfigSchema);
