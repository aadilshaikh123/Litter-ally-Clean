
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes"); // Import image routes
const govEmployeeRoutes = require("./routes/govEmployeeRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const workerRoutes = require("./routes/workerRoutes");
const path = require("path");


dotenv.config();
connectDB(); // Connect to MongoDB

const app = express();
app.use(express.json());
app.use(cors());

// Auth Routes
app.use("/api/auth", authRoutes);

// ✅ Image Upload Routes (Now Handled Separately)
app.use("/api/images", imageRoutes);
// app.use('/uploads', express.static('uploads'));
app.use("/api/govEmployees", govEmployeeRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/complaints", complaintRoutes);
// app.use('/api', complaintRoutes); 
app.use("/api/worker", workerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));