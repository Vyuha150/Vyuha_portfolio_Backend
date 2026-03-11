import express from "express";
import multer from "multer";
import PodcastPartner from "../models/PodcastPartner.js";
import { body, validationResult, param } from "express-validator";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Helper function for validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// Route: Submit Podcast Partner Form (public)
router.post(
  "/submit",
  upload.single("document"),
  [
    body("name").isString().withMessage("Name is required"),
    body("number").isString().withMessage("Phone number is required"),
    body("partnerType").isString().withMessage("Partner type is required"),
    body("comments").isString().withMessage("Comments are required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { name, number, partnerType, comments } = req.body;

    try {
      // Check if a record with the same phone number already exists
      const existingPartner = await PodcastPartner.findOne({
        number,
        partnerType,
      });
      if (existingPartner) {
        return res
          .status(400)
          .json({ message: "A form with this phone number already exists." });
      }

      // Create a new podcast partner record
      const podcastPartner = new PodcastPartner({
        name,
        number,
        partnerType,
        comments,
        document: req.file ? `/uploads/${req.file.filename}` : null,
      });

      await podcastPartner.save();
      res.status(201).json({ message: "Form submitted successfully!" });
    } catch (error) {
      console.error("Error submitting form:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

// --- ADMIN PANEL ROUTES ---

// Get all podcast partner forms (admin & sub-admin only)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const partners = await PodcastPartner.find();
      res.status(200).json(partners);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching podcast partners", error });
    }
  }
);

// Get a single podcast partner form by ID (admin & sub-admin only)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid ID")],
  async (req, res) => {
    try {
      const partner = await PodcastPartner.findById(req.params.id);
      if (!partner) {
        return res.status(404).json({ message: "Podcast partner not found" });
      }
      res.status(200).json(partner);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching podcast partner", error });
    }
  }
);

// Delete a podcast partner form by ID (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid ID")],
  async (req, res) => {
    try {
      const deleted = await PodcastPartner.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Podcast partner not found" });
      }
      res
        .status(200)
        .json({ message: "Podcast partner deleted successfully." });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting podcast partner", error });
    }
  }
);

export default router;
