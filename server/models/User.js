const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "citizen" },
  images: { 
    type: [
      {
        imageUrl: { type: String, required: true },
        location: { type: String },
        description: { type: String },
        garbageProbability: { type: Number },
        cleanStreetProbability: { type: Number },
        status: { type: String }
      }
    ],
    default: [] 
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
