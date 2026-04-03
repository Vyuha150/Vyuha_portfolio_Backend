import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Organization from "../models/Organization.js";
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

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files to the "uploads" directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Use a unique filename
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Helper function for validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// Handle organization/individual registration (public)
router.post(
  "/register",
  upload.single("logo"),
  [
    body("registerAs")
      .isIn(["individual", "organization"])
      .withMessage("Registration type is required"),
    body("name").isString().withMessage("Name is required"),
    body("contactEmail")
      .isEmail()
      .withMessage("Valid contact email is required"),
    body("contactPhone").isString().withMessage("Contact phone is required"),
    // Organization-specific validations
    body("organizationType")
      .if(body("registerAs").equals("organization"))
      .isString()
      .withMessage("Organization type is required"),
    body("activeMembers")
      .if(body("registerAs").equals("organization"))
      .isString()
      .withMessage("Active members is required"),
    body("pastEvents")
      .if(body("registerAs").equals("organization"))
      .isString()
      .withMessage("Past events are required"),
    // Individual-specific validations
    body("collegeUniversity")
      .if(body("registerAs").equals("individual"))
      .isString()
      .withMessage("College/University is required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const {
        registerAs,
        name,
        contactEmail,
        contactPhone,
        organizationType,
        activeMembers,
        pastEvents,
        collegeUniversity,
      } = req.body;

      // Check for duplicate (example: by name and email)
      const existing = await Organization.findOne({
        name,
        contactEmail,
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: "This entry is already registered." });
      }

      // Prepare new organization/individual entry
      const newEntry = new Organization({
        registerAs,
        name,
        contactEmail,
        contactPhone,
        logo: req.file ? `/uploads/${req.file.filename}` : null,
        // Only add org fields if org, and individual fields if individual
        ...(registerAs === "organization"
          ? {
              organizationType,
              activeMembers,
              pastEvents,
            }
          : {
              collegeUniversity,
            }),
      });

      await newEntry.save();

      res.status(201).json({
        message: "Registration successful!",
        organization: newEntry,
      });
    } catch (error) {
      console.error("Error registering:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  }
);

// --- ADMIN PANEL ROUTES ---

// Get all organizations (admin & sub-admin only)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const organizations = await Organization.find();
      res.status(200).json(organizations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching organizations", error });
    }
  }
);

// Get a single organization by ID (admin & sub-admin only)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid organization ID")],
  async (req, res) => {
    try {
      const organization = await Organization.findById(req.params.id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.status(200).json(organization);
    } catch (error) {
      res.status(500).json({ message: "Error fetching organization", error });
    }
  }
);

// Update an organization (admin & sub-admin only)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("logo"),
  [
    param("id").isMongoId().withMessage("Invalid organization ID"),
    body("name").optional().isString(),
    body("collegeUniversity").optional().isString(),
    body("organizationType").optional().isString(),
    body("activeMembers").optional().isString(),
    body("pastEvents").optional().isString(),
    body("contactEmail").optional().isEmail(),
    body("contactPhone").optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const updateData = {
        ...req.body,
        logo: req.file ? `/uploads/${req.file.filename}` : undefined,
      };

      const updatedOrganization = await Organization.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!updatedOrganization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.status(200).json(updatedOrganization);
    } catch (error) {
      res.status(500).json({ message: "Error updating organization", error });
    }
  }
);

// Delete an organization (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid organization ID")],
  async (req, res) => {
    try {
      const deleted = await Organization.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.status(200).json({ message: "Organization deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting organization", error });
    }
  }
);

export default router;
