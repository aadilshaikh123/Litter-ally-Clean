const Complaint = require("../models/Complaint"); // Ensure you have defined this model
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

exports.uploadImage = async (req, res) => {
	console.log("✅ Request received in imageControllers.js");
	console.log("📩 Request Body:", req.body);
	console.log("🖼 Uploaded File:", req.file);
	console.log("👤 User Object:", req.user);

	const { location, description, latitude, longitude } = req.body;
	const userId = req.user?._id; // Must be set by your auth middleware

	if (!req.file) {
		console.log("🚨 No file uploaded");
		return res.status(400).json({ message: "No file uploaded" });
	}

	const imageUrl = `/uploads/${req.file.filename}`;
	const filePath = req.file.path;

	try {
		console.log("🚀 Sending image to Flask API for classification...");
		const form = new FormData();
		form.append("image", fs.createReadStream(filePath));
		// Append latitude and longitude for geolocation-based processing
		form.append("latitude", latitude);
		form.append("longitude", longitude);

		const flaskResponse = await axios.post("http://127.0.0.1:5001/predict", form, {
			headers: { ...form.getHeaders() },
			timeout: 10000 // 10-second timeout
		});
		console.log("✅ Received response from Flask API");
		const classification = flaskResponse.data;
		console.log("🧪 Flask API Response:", classification);

		// Check if garbage probability is high enough (adjust threshold if needed)
		if (classification.garbage_probability < 50) {
			console.log("🟢 Image is not classified as garbage. Deleting file...");
			fs.unlinkSync(filePath); // Remove the file from uploads folder
			return res.status(400).json({ message: "Image does not contain garbage. Not stored." });
		}

		// Create a new complaint record in the complaints collection
		const newComplaint = new Complaint({
			citizen: userId,            // Reference to the citizen (User _id)
			imageUrl,                   // File path of the uploaded image
			latitude,
			longitude,
			location,                   // Location string provided by the user
			description,                // Complaint description
			flaskData: classification,  // Classification & geolocation data from Flask API
			status: "pending"           // Default complaint status
		});

		const savedComplaint = await newComplaint.save();
		console.log("✅ Complaint saved successfully:", savedComplaint);

		// Optionally, you might choose to delete the file from disk if you store it elsewhere
		// fs.unlinkSync(filePath);

		res.status(201).json({ message: "Complaint submitted successfully", complaint: savedComplaint });
	} catch (error) {
		console.error("❌ Error processing image:", error);
		res.status(500).json({ message: "Internal server error.", error: error.message });
	}
};

// exports.getUserImages = async (req, res) => {
// 	console.log("📸 Fetching complaints for user:", req.user._id);
// 	try {
// 		// Here, we fetch complaints for the logged-in user (citizen)
// 		const complaints = await Complaint.find({ citizen: req.user._id });
// 		res.status(200).json({ complaints });
// 	} catch (error) {
// 		console.error("❌ Error fetching complaints:", error);
// 		res.status(500).json({ message: "Internal server error" });
// 	}
// };
exports.getUserImages = async (req, res) => {
  console.log("📸 Fetching complaints for user:", req.user._id);
  try {
    // Fetch complaints for the logged-in user (citizen)
    const complaints = await Complaint.find({ citizen: req.user._id });
    
    // Transform the imageUrl to include the full URL (protocol + host)
    const transformedComplaints = complaints.map(c => {
      const complaintObj = c.toObject();
      // Prepend the protocol and host from the request so the front-end can load the image
      complaintObj.imageUrl = `${req.protocol}://${req.get("host")}${complaintObj.imageUrl}`;
      return complaintObj;
    });

    res.status(200).json({ complaints: transformedComplaints });
  } catch (error) {
    console.error("❌ Error fetching complaints:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


