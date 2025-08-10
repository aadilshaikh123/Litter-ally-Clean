
const Complaint = require("../models/Complaint");

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

exports.completeComplaint = async (req, res) => {
  try {
      const complaintId = req.body.complaintId;
      const {
          complaintLocation,
          complaintLatitude,
          complaintLongitude,
          muqaddamLocation,
          muqaddamLatitude,
          muqaddamLongitude,
      } = req.body;

      console.log("📩 Request Body:", req.body);
      console.log("🖼 Uploaded File:", req.file);

      if (!req.file) {
          console.log("🚨 No Muqaddam image uploaded");
          return res.status(400).json({ message: "No Muqaddam image uploaded" });
      }

      const postCleaningImageUrl = `/completeimages/${req.file.filename}`;
      const filePath = req.file.path;

      console.log("🚀 Sending Muqaddam image to Flask API for verification...");

      // Create FormData with proper field names and types
      const form = new FormData();
      form.append("image", fs.createReadStream(filePath));
      
      // Ensure all coordinates are converted to strings
      form.append("complaintLatitude", String(complaintLatitude));
      form.append("complaintLongitude", String(complaintLongitude));
      form.append("muqaddamLatitude", String(muqaddamLatitude));
      form.append("muqaddamLongitude", String(muqaddamLongitude));

      // Debug log the form data
      console.log("📦 Form data being sent:", {
          complaintLatitude,
          complaintLongitude,
          muqaddamLatitude,
          muqaddamLongitude
      });

      try {
          const flaskResponse = await axios.post("http://127.0.0.1:5001/verify", form, {
              headers: { ...form.getHeaders() },
              timeout: 30000 // Increased to 30 seconds for image processing
          });
          
          console.log("✅ Received response from Flask API for verification");
          const verificationResult = flaskResponse.data;
          console.log("🧪 Flask API Response:", verificationResult);

          // Example: Based on Flask API, decide if complaint can be marked as complete
          if (verificationResult.garbage_probability > 30) { // Adjust threshold as needed
              console.log("🟡 Area not sufficiently clean. Cannot mark complaint as complete.");
              fs.unlinkSync(filePath); // Remove uploaded file
              return res.status(400).json({ message: "Area not sufficiently clean based on AI verification." });
          }

          if (!verificationResult.location_verified) {
              console.log("🟡 Muqaddam location does not match complaint location closely enough.");
              fs.unlinkSync(filePath); // Remove uploaded file
              return res.status(400).json({ 
                  message: "Muqaddam is not at the correct location based on GPS verification.",
                  distance: verificationResult.location_distance_meters
              });
          }

          // Update complaint in DB
          const updatedComplaint = await Complaint.findByIdAndUpdate(
              complaintId,
              {
                  postCleaningImage: postCleaningImageUrl,
                  status: "completed",
                  muqaddamLocation,
                  muqaddamLatitude,
                  muqaddamLongitude,
                  muqaddamVerification: verificationResult // Save Flask verification result
              },
              { new: true }
          );

          console.log("✅ Complaint updated successfully:", updatedComplaint);

          res.json({ 
              message: "Complaint marked as completed after verification", 
              complaint: updatedComplaint 
          });
          
      } catch (axiosError) {
          console.error("❌ Flask API Error:", axiosError.message);
          
          // More detailed error logging
          if (axiosError.response) {
              // The request was made and the server responded with a status code
              console.error("Response data:", axiosError.response.data);
              console.error("Response status:", axiosError.response.status);
              console.error("Response headers:", axiosError.response.headers);
              return res.status(axiosError.response.status).json({ 
                  message: "Flask API validation failed", 
                  error: axiosError.response.data
              });
          } else if (axiosError.request) {
              // The request was made but no response was received
              console.error("Request made but no response received");
              return res.status(500).json({ 
                  message: "Cannot connect to verification service", 
                  error: "No response from Flask API - please check if it's running"
              });
          } else {
              // Something happened in setting up the request
              console.error("Error setting up request:", axiosError.message);
              return res.status(500).json({ 
                  message: "Error setting up verification request", 
                  error: axiosError.message
              });
          }
      }

  } catch (error) {
      console.error("❌ Error completing complaint:", error);
      res.status(500).json({ message: "Error completing complaint", error: error.message });
  }
};


exports.getSiComplaints = async (req, res) => {
	try {
	  const siIdentifier = req.user.identifier;
	  const siWard = req.user.ward;
  
	  const complaints = await Complaint.find({
		"flaskData.SI_no": siIdentifier,
		"flaskData.ward_number": Number(siWard),
		status: "pending",
		forwardedBySI: { $ne: true } // ✅ Exclude forwarded complaints
	  });
  
	  // Transform to include full image URL
	  const transformedComplaints = complaints.map(c => {
		const obj = c.toObject();
		obj.imageUrl = `${req.protocol}://${req.get("host")}${obj.imageUrl}`;
		return obj;
	  });
  
	  res.json({ complaints: transformedComplaints });
	} catch (error) {
	  console.error("Error fetching SI complaints:", error);
	  res.status(500).json({ message: "Error fetching complaints", error: error.message });
	}
  };
  

  
  exports.getSiForwardedComplaints = async (req, res) => {
	try {
	  const siIdentifier = req.user.identifier;
  
	  const forwardedComplaints = await Complaint.find({
		"flaskData.SI_no": siIdentifier,
		forwardedBySI: true // Only fetch complaints that SI has forwarded
	  }).populate("assignedMuqaddam", "name email"); // Populate Muqaddam details
  
	  const transformedComplaints = forwardedComplaints.map(c => {
		const obj = c.toObject();
		obj.imageUrl = `${req.protocol}://${req.get("host")}${obj.imageUrl}`;
		return obj;
	  });
  
	  res.json({ forwardedComplaints: transformedComplaints });
	} catch (error) {
	  console.error("Error fetching forwarded complaints:", error);
	  res.status(500).json({ message: "Error fetching forwarded complaints", error: error.message });
	}
  };

// SI: Forward a complaint to a Muqaddam
// controllers/complaintController.js
// controllers/complaintController.js
exports.assignMuqaddam = async (req, res) => {
	try {
		const complaintId = req.params.complaintId;
		const { muqaddamId, siInstructions } = req.body;
		if (!muqaddamId) {
			return res.status(400).json({ message: "Muqaddam ID is required" });
		}
		const updatedComplaint = await Complaint.findByIdAndUpdate(
			complaintId,
			{ assignedMuqaddam: muqaddamId, siInstructions, status: "in progress" },
			{ new: true }
		);
		res.json({ message: "Complaint forwarded to Muqaddam", complaint: updatedComplaint });
	} catch (error) {
		console.error("Error assigning Muqaddam:", error);
		res.status(500).json({ message: "Error assigning Muqaddam", error: error.message });
	}
};


exports.getMuqaddamComplaints = async (req, res) => {
    try {
        const muqaddamId = req.user._id; // Assuming the authenticated muqaddam's _id is available
        const complaints = await Complaint.find({ assignedMuqaddam: muqaddamId, status: "in progress" });

        // Transform each complaint's imageUrl into a full URL and include location data
        const transformedComplaints = complaints.map(c => {
            const obj = c.toObject();
            obj.imageUrl = `${req.protocol}://${req.get("host")}${obj.imageUrl}`;
            return {
                ...obj,
                latitude: c.latitude,
                longitude: c.longitude,
                location: c.location,
            };
			
        });
		console.log("Returning Muqaddam complaints:", JSON.stringify(transformedComplaints, null, 2));

        res.json({ complaints: transformedComplaints });
    } catch (error) {
        console.error("Error fetching Muqaddam complaints:", error);
        res.status(500).json({ message: "Error fetching complaints", error: error.message });
    }
};


// Muqquadams: Mark complaint as completed (upload post-cleaning image)
// exports.completeComplaint = async (req, res) => {
// 	try {
// 		const complaintId = req.params.complaintId;
// 		const { postCleaningImage } = req.body;
		
// 		// Optionally, you could send the image to the Flask API for verification here.
// 		// For now, update status to "completed" and store the post-cleaning image URL.
// 		const updatedComplaint = await Complaint.findByIdAndUpdate(
// 			complaintId,
// 			{ postCleaningImage, status: "completed" },
// 			{ new: true }
// 		);
// 		res.json({ message: "Complaint marked as completed", complaint: updatedComplaint });
// 	} catch (error) {
// 		console.error("Error completing complaint:", error);
// 		res.status(500).json({ message: "Error completing complaint", error: error.message });
// 	}
// };
