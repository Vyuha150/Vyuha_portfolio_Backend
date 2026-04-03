import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import CentralTeamApplication from "../models/CentralTeamApplication.js";
import ClubApplication from "../models/ClubApplication.js";
import CollaborationRequest from "../models/CollaborationRequest.js";
import { body, validationResult, param } from "express-validator";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Helper function for error handling
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// --- ADMIN PANEL ROUTES ---

// Get all central team applications
router.get(
  "/central-team-applications",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const applications = await CentralTeamApplication.find();
      res.status(200).json(applications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching applications", error });
    }
  }
);

// Get a single central team application by ID
router.get(
  "/central-team-applications/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const application = await CentralTeamApplication.findById(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(200).json(application);
    } catch (error) {
      res.status(500).json({ message: "Error fetching application", error });
    }
  }
);

// Delete a central team application by ID
router.delete(
  "/central-team-applications/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const deleted = await CentralTeamApplication.findByIdAndDelete(
        req.params.id
      );
      if (!deleted) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(200).json({ message: "Application deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting application", error });
    }
  }
);

// Get all club applications
router.get(
  "/club-applications",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const applications = await ClubApplication.find();
      res.status(200).json(applications);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching club applications", error });
    }
  }
);

// Get a single club application by ID
router.get(
  "/club-applications/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const application = await ClubApplication.findById(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Club application not found" });
      }
      res.status(200).json(application);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching club application", error });
    }
  }
);

// Delete a club application by ID
router.delete(
  "/club-applications/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const deleted = await ClubApplication.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Club application not found" });
      }
      res
        .status(200)
        .json({ message: "Club application deleted successfully." });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting club application", error });
    }
  }
);

// Get all collaboration requests
router.get(
  "/collaboration-requests",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const requests = await CollaborationRequest.find();
      res.status(200).json(requests);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching collaboration requests", error });
    }
  }
);

// Get a single collaboration request by ID
router.get(
  "/collaboration-requests/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid request ID")],
  async (req, res) => {
    try {
      const request = await CollaborationRequest.findById(req.params.id);
      if (!request) {
        return res
          .status(404)
          .json({ message: "Collaboration request not found" });
      }
      res.status(200).json(request);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching collaboration request", error });
    }
  }
);

// Delete a collaboration request by ID
router.delete(
  "/collaboration-requests/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid request ID")],
  async (req, res) => {
    try {
      const deleted = await CollaborationRequest.findByIdAndDelete(
        req.params.id
      );
      if (!deleted) {
        return res
          .status(404)
          .json({ message: "Collaboration request not found" });
      }
      res
        .status(200)
        .json({ message: "Collaboration request deleted successfully." });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting collaboration request", error });
    }
  }
);

// Route: Join Vyuha Central Team
router.post(
  "/join-central-team",
  upload.single("document"), // Handle single file upload
  [
    body("name").isString().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone").isString().withMessage("Phone number is required"),
    body("skills").isString().withMessage("Skills are required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { name, email, phone, skills } = req.body;

    try {
      const existingApplication = await CentralTeamApplication.findOne({
        email,
      });
      if (existingApplication) {
        return res.status(400).json({
          message: "Application already exists for this email address",
        });
      }

      const application = new CentralTeamApplication({
        name,
        email,
        phone,
        skills,
        document: req.file ? req.file.path : null, // Save the file path if uploaded
      });

      await application.save();
      res.status(201).json({ message: "Application submitted successfully" });
    } catch (error) {
      console.error("Error submitting application:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

// Route: Open a New Club
router.post(
  "/open-club",
  upload.single("document"), // Handle single file upload
  [
    body("collegeName").isString().withMessage("College name is required"),
    body("clubName").isString().withMessage("Club name is required"),
    body("phone").isString().withMessage("Phone number is required"),
    body("vision").isString().withMessage("Vision is required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { collegeName, clubName, phone, vision } = req.body;

    try {
      const clubApplication = new ClubApplication({
        collegeName,
        clubName,
        phone,
        vision,
        document: req.file ? req.file.path : null, // Save the file path if uploaded
      });

      await clubApplication.save();
      res
        .status(201)
        .json({ message: "Club application submitted successfully" });
    } catch (error) {
      console.error("Error submitting club application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Route: Collaborate with an Existing Club
router.post(
  "/collaborate",
  upload.single("document"), // Handle single file upload
  [
    body("clubName").isString().withMessage("Club name is required"),
    body("collegeName").isString().withMessage("College name is required"),
    body("phone").isString().withMessage("Phone number is required"),
    body("collaborationDetails")
      .isString()
      .withMessage("Collaboration details are required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { clubName, collegeName, phone, collaborationDetails } = req.body;

    try {
      const collaborationRequest = new CollaborationRequest({
        clubName,
        collegeName,
        phone,
        collaborationDetails,
        document: req.file ? req.file.path : null, // Save the file path if uploaded
      });

      await collaborationRequest.save();
      res
        .status(201)
        .json({ message: "Collaboration request submitted successfully" });
    } catch (error) {
      console.error("Error submitting collaboration request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update status of a central team application
router.patch(
  "/central-team-applications/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await CentralTeamApplication.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating status", error });
    }
  }
);

// Update status of a collaboration request
router.patch(
  "/collaboration-requests/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid request ID")],
  async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await CollaborationRequest.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res
          .status(404)
          .json({ message: "Collaboration request not found" });
      }
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating status", error });
    }
  }
);

// Update status of a club application
router.patch(
  "/club-applications/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await ClubApplication.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Club application not found" });
      }
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating status", error });
    }
  }
);

export default router;
