
    // // module.exports = router;
    // const express = require("express");
    // const router = express.Router();
    // const complaintController = require("../controllers/complaintController");
    // const authMiddleware = require("../middleware/authMiddleware");

    // // SI endpoints:
    // router.get("/si", authMiddleware, complaintController.getSiComplaints);
    // router.get("/si/forwarded", authMiddleware, complaintController.getSiForwardedComplaints);
    // router.post("/:complaintId/assign-muqaddam", authMiddleware, complaintController.assignMuqaddam);

    // // Muqaddam endpoints:
    // router.get("/muqaddam", authMiddleware, complaintController.getMuqaddamComplaints);
    // router.post("/:complaintId/assign-worker", authMiddleware, complaintController.assignWorker);

    // // Worker endpoint:
    // router.post("/:complaintId/submit-cleanup", authMiddleware, complaintController.completeComplaint);

    // module.exports = router;
    const complaintController = require("../controllers/complaintController");
    const express = require("express");
    const router = express.Router();
    const multer = require("multer"); // ✅ Import multer
    const path = require("path");
    const fs = require("fs");
    
    
    const authMiddleware = require("../middleware/authMiddleware");
    
    // ✅ Setup multer to store files in 'completeimages/' folder
    const completeImageStorage = multer.diskStorage({
        destination: (req, file, cb) => {
          console.log("📂 Storing file in 'completeimages/' directory");
          cb(null, "completeimages/");
        },
        filename: (req, file, cb) => {
          const filename = Date.now() + "-" + file.originalname;
          console.log("🖼 Generated filename:", filename);
          cb(null, filename);
        }
      });
    
    const uploadCompleteImage = multer({ storage: completeImageStorage });
    
    // --- SI endpoints ---
    router.get("/si", authMiddleware, complaintController.getSiComplaints);
    router.get("/si/forwarded", authMiddleware, complaintController.getSiForwardedComplaints);
    router.post("/:complaintId/assign-muqaddam", authMiddleware, complaintController.assignMuqaddam);
    
    // --- Muqaddam endpoints ---
    router.get("/muqaddam", authMiddleware, complaintController.getMuqaddamComplaints);
    //router.post("/:complaintId/assign-worker", authMiddleware, complaintController.assignWorker);
    
    // --- Worker endpoint: (use multer upload here!) ---
    router.post(
        "/:complaintId/submit-cleanup",
        authMiddleware,
        uploadCompleteImage.single("image"), 
        complaintController.completeComplaint
      );
      
    
    module.exports = router;
    