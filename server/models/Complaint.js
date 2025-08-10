// // const mongoose = require("mongoose");

// // const complaintSchema = new mongoose.Schema({
// //   citizen: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
// //   imageUrl: { type: String, required: true },
// //   description: { type: String },
// //   location: { type: mongoose.Schema.Types.Mixed, required: true },
// //   flaskData: {
// //     clean_street_probability: { type: Number },
// //     garbage_probability: { type: Number },
// //     not_street_probability: { type: Number },
// //     prediction: { type: String },
// //     ward_name: { type: String },
// //     ward_number: { type: Number },
// //     Muqqadam_name: { type: String },
// //     SI_no: { type: String }
// //   },
// //   status: { type: String, enum: ["pending", "in progress", "completed"], default: "pending" }
// // }, { timestamps: true });

// // module.exports = mongoose.model("Complaint", complaintSchema);

// const mongoose = require("mongoose");

// const complaintSchema = new mongoose.Schema({
//   citizen: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   imageUrl: { type: String, required: true },
//   description: { type: String },
//   location: { type: mongoose.Schema.Types.Mixed, required: true },
//   flaskData: {
//     clean_street_probability: { type: Number },
//     garbage_probability: { type: Number },
//     not_street_probability: { type: Number },
//     prediction: { type: String },
//     ward_name: { type: String },
//     ward_number: { type: Number },
//     Muqqadam_name: { type: String },
//     SI_no: { type: String }
//   },
//   status: { type: String, enum: ["pending", "in progress", "completed"], default: "pending" },
//   siInstructions: { type: String },
//   assignedMuqaddam: { type: mongoose.Schema.Types.ObjectId, ref: "GovEmployee" },
//   workerAssignments: [
//     {
//       workerId: { type: mongoose.Schema.Types.ObjectId, ref: "GovEmployee" },
//       category: { type: String },
//       assignedAt: { type: Date, default: Date.now }
//     }
//   ],
//   postCleaningImage: { type: String }
// }, { timestamps: true });

// module.exports = mongoose.model("Complaint", complaintSchema);
const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  imageUrl: { type: String, required: true },
  description: { type: String },
  latitude: { type: Number, required: true }, // Added latitude field
  longitude: { type: Number, required: true }, // Added longitude field
  location: { type: String }, // Optional: Can store human-readable address if needed
  flaskData: {
    clean_street_probability: { type: Number },
    garbage_probability: { type: Number },
    not_street_probability: { type: Number },
    prediction: { type: String },
    ward_name: { type: String },
    ward_number: { type: Number },
    Muqqadam_name: { type: String },
    SI_no: { type: String }
  },
  status: { type: String, enum: ["pending", "in progress", "completed"], default: "pending" },
  siInstructions: { type: String },
  assignedMuqaddam: { type: mongoose.Schema.Types.ObjectId, ref: "GovEmployee" },
  workerAssignments: [
    {
      workerId: { type: mongoose.Schema.Types.ObjectId, ref: "GovEmployee" },
      category: { type: String },
      assignedAt: { type: Date, default: Date.now }
    }
  ],
  postCleaningImage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);
