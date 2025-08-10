// // const jwt = require("jsonwebtoken");

// // module.exports = (req, res, next) => {
// //     const token = req.header("Authorization");

// //     if (!token) {
// //         return res.status(401).json({ message: "Unauthorized: No token provided" });
// //     }

// //     try {
// //         const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
// //         req.user = decoded;
// //         next();
// //     } catch (error) {
// //         return res.status(401).json({ message: "Invalid token" });
// //     }
// // };

// const jwt = require("jsonwebtoken");

// const authMiddleware = (req, res, next) => {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).json({ message: "Unauthorized: No token provided" });
//     }

//     const token = authHeader.split(" ")[1]; // Extract token
//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.user = { userId: decoded.userId, role: decoded.role }; // Attach user info to request
//         next();
//     } catch (error) {
//         return res.status(401).json({ message: "Unauthorized: Invalid token" });
//     }A
// };

// module.exports = authMiddleware;

// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GovEmployee = require('../models/GovEmployee');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Authorization header missing" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token Decoded:", decoded);

    let user;
    // Use the 'role' in the token to decide which collection to query.
    if (decoded.role === 'user' || decoded.role === 'citizen') {
      user = await User.findById(decoded.id);
    } else {
      user = await GovEmployee.findById(decoded.id);
    }
    if (!user) {
      return res.status(404).json({ message: "No user found with ID: " + decoded.id });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};
