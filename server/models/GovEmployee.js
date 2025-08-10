// // models/GovEmployee.js
// const mongoose = require("mongoose");

// const govEmployeeSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role: { 
//     type: String, 
//     enum: ["CSI", "DSI", "SI", "muqaddam", "worker"],
//     required: true 
//   },
//   ward: { type: String },
//   identifier: { 
//     type: String, 
//     required: true 
//   }
// }, { timestamps: true });

// // Compound index: in the same ward, an SI cannot have the same identifier.
// govEmployeeSchema.index({ role: 1, ward: 1, identifier: 1 }, { unique: true });

// module.exports = mongoose.model("GovEmployee", govEmployeeSchema);
const mongoose = require("mongoose");

const govEmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ["CSI", "DSI", "SI", "muqaddam", "worker"],
    required: true 
  },
  ward: { type: String, required: true },
  identifier: { type: String, required: true },
  // For muqaddams, store the SI's identifier (e.g., "SI1") they report to.
  siIdentifier: { type: String }
}, { timestamps: true });

// Optionally, add a compound index to ensure uniqueness per ward and SI for muqaddams:
// govEmployeeSchema.index({ role: 1, ward: 1, siIdentifier: 1, identifier: 1 }, { unique: true });

module.exports = mongoose.model("GovEmployee", govEmployeeSchema);
