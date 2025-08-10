// // controllers/govEmployeeController.js
// const GovEmployee = require("../models/GovEmployee");
// const bcrypt = require("bcrypt");
// const { ALLOWED_GOV_EMAILS } = require("../config");

// exports.registerGovEmployee = async (req, res) => {
// 	try {
// 		const { name, email, password, role, ward, identifier, siIdentifier } = req.body;

// 		if (!password || typeof password !== "string") {
// 			return res.status(400).json({ message: "Invalid password format" });
// 		}
// 		// For government employees (non-citizens), require identifier.
// 		if (role && role.toLowerCase() !== "citizen") {
// 			if (!identifier) {
// 				return res.status(400).json({ message: "Identifier is required" });
// 			}
// 			// If the role is muqaddam, then siIdentifier is also required.
// 			if (role.toLowerCase() === "muqaddam" && !siIdentifier) {
// 				return res.status(400).json({ message: "SI Identifier is required for muqaddam registration" });
// 			}
// 			// Optionally, you can check allowed email list for government employees if desired.
// 			// if (!ALLOWED_GOV_EMAILS.includes(email)) { ... }
// 		}

// 		const salt = await bcrypt.genSalt(10);
// 		const hashedPassword = await bcrypt.hash(password, salt);

// 		const newGovEmployee = new GovEmployee({
// 			name,
// 			email,
// 			password: hashedPassword,
// 			role,
// 			ward,
// 			identifier,
// 			siIdentifier: role.toLowerCase() === "muqaddam" ? siIdentifier : undefined,
// 		});

// 		const savedEmployee = await newGovEmployee.save();
// 		res.status(201).json({
// 			message: "Government employee registered successfully",
// 			employee: savedEmployee,
// 		});
// 	} catch (error) {
// 		console.error("Error registering government employee:", error);
// 		res.status(500).json({ message: "Error registering government employee", error: error.message });
// 	}
// };

// exports.getMuqaddamsBySI = async (req, res) => {
// 	try {
// 		// Expect query parameters: ward and siIdentifier
// 		const { ward, siIdentifier } = req.query;
// 		const muqaddams = await GovEmployee.find({ role: "muqaddam", ward, siIdentifier });
// 		res.status(200).json({ muqaddams });
// 	} catch (error) {
// 		console.error("Error fetching muqaddams:", error);
// 		res.status(500).json({ message: "Error fetching muqaddams", error: error.message });
// 	}
// };
const GovEmployee = require("../models/GovEmployee");
const bcrypt = require("bcrypt");
const { ALLOWED_GOV_EMAILS } = require("../config");

// Registration for government employees
exports.registerGovEmployee = async (req, res) => {
  try {
    const { name, email, password, role, ward, identifier, siIdentifier } = req.body;

    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid password format" });
    }
    // For government employees, require identifier.
    if (role && role.toLowerCase() !== "citizen") {
      if (!identifier) {
        return res.status(400).json({ message: "Identifier is required" });
      }
      // For muqaddams, also require the SI identifier they report to.
      if (role.toLowerCase() === "muqaddam" && !siIdentifier) {
        return res.status(400).json({ message: "SI Identifier is required for muqaddam registration" });
      }
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newGovEmployee = new GovEmployee({
      name,
      email,
      password: hashedPassword,
      role,
      ward,
      identifier,
      siIdentifier: role.toLowerCase() === "muqaddam" ? siIdentifier : undefined,
    });

    const savedEmployee = await newGovEmployee.save();
    res.status(201).json({
      message: "Government employee registered successfully",
      employee: savedEmployee,
    });
  } catch (error) {
    console.error("Error registering government employee:", error);
    res.status(500).json({ message: "Error registering government employee", error: error.message });
  }
};

exports.getMuqaddamsBySI = async (req, res) => {
	try {
		const { ward, siIdentifier } = req.query;
		if (!ward || !siIdentifier) {
			return res.status(400).json({ message: "Ward and SI Identifier are required" });
		}
		const muqaddams = await GovEmployee.find({ role: "muqaddam", ward, siIdentifier });
		res.status(200).json({ muqaddams });
	} catch (error) {
		console.error("Error fetching muqaddams:", error);
		res.status(500).json({ message: "Error fetching muqaddams", error: error.message });
	}
};