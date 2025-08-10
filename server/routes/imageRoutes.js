const express = require("express");
const multer = require("multer");
const { uploadImage, getUserImages } = require("../controllers/imageControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
console.log("📌 imageRoutes.js loaded");

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("📂 Storing file in 'uploads/' directory");
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + "-" + file.originalname;
    console.log("🖼 Generated filename:", filename);
    cb(null, filename);
  }
});
const upload = multer({ storage });

// Route to handle image upload
router.post("/upload", authMiddleware, upload.single("image"), uploadImage);

// Route to fetch a user's complaints
router.get("/my-images", authMiddleware, getUserImages);

module.exports = router;
