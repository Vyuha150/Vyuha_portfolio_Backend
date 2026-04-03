import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { body, param, validationResult } from "express-validator";
import Company from "../models/Company.js";
import JobApplication from "../models/JobApplication.js";
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
    const uniqueSuffix = Date.now() + "-" + file.originalname;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Separate multer configuration for resume uploads (memory storage for database)
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for resumes
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOC, DOCX files for resumes
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only PDF, DOC, or DOCX files are allowed for resumes"),
        false
      );
    }
  },
});

// Helper function for validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// Route: Get all companies
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find();
    res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Error fetching companies" });
  }
});

// Route: Get a single company by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid company ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.status(200).json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Error fetching company" });
    }
  }
);

// Route: Create a new company with file upload
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("logo"),
  [
    body("name").notEmpty().withMessage("Company name is required"),
    body("industry").notEmpty().withMessage("Industry is required"),
    body("location").notEmpty().withMessage("Location is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("contact")
      .optional()
      .isString()
      .withMessage("Contact must be a string"), // <-- Add this line
    body("jobOpenings")
      .optional()
      .custom((value) => {
        if (typeof value === "string") return true;
        if (Array.isArray(value)) return true;
        throw new Error("Job openings must be a string or an array of strings");
      }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    let jobOpenings = req.body.jobOpenings;
    if (typeof jobOpenings === "string") {
      // If sent as a comma-separated string or JSON string
      try {
        // Try to parse as JSON array first
        jobOpenings = JSON.parse(jobOpenings);
        if (!Array.isArray(jobOpenings)) {
          // If not an array, fallback to splitting by comma
          jobOpenings = jobOpenings
            .split(",")
            .map((j) => j.trim())
            .filter(Boolean);
        }
      } catch {
        // If not JSON, split by comma
        jobOpenings = jobOpenings
          .split(",")
          .map((j) => j.trim())
          .filter(Boolean);
      }
    }

    const { name, industry, location, description, contact } = req.body; // <-- Add contact

    try {
      const newCompany = new Company({
        name,
        industry,
        location,
        description,
        jobOpenings: jobOpenings || [],
        contact,
        logo: req.file ? `/uploads/${req.file.filename}` : "", // Set empty string if no file
      });

      await newCompany.save();
      res.status(201).json(newCompany);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Error creating company" });
    }
  }
);

// Route: Update a company with file upload
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("logo"),
  [
    param("id").isMongoId().withMessage("Invalid company ID"),
    body("name")
      .optional()
      .isString()
      .withMessage("Company name must be a string"),
    body("industry")
      .optional()
      .isString()
      .withMessage("Industry must be a string"),
    body("location")
      .optional()
      .isString()
      .withMessage("Location must be a string"),
    body("description")
      .optional()
      .isString()
      .withMessage("Description must be a string"),
    body("contact")
      .optional()
      .isString()
      .withMessage("Contact must be a string"), // <-- Add this line
    body("jobOpenings")
      .optional()
      .custom((value) => {
        if (typeof value === "string") return true;
        if (Array.isArray(value)) return true;
        throw new Error("Job openings must be a string or an array of strings");
      }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    let jobOpenings = req.body.jobOpenings;
    if (typeof jobOpenings === "string") {
      try {
        jobOpenings = JSON.parse(jobOpenings);
        if (!Array.isArray(jobOpenings)) {
          jobOpenings = jobOpenings
            .split(",")
            .map((j) => j.trim())
            .filter(Boolean);
        }
      } catch {
        jobOpenings = jobOpenings
          .split(",")
          .map((j) => j.trim())
          .filter(Boolean);
      }
    }

    const updateData = {
      ...req.body,
      jobOpenings,
    };

    // Only update logo if a new file is uploaded
    if (req.file) {
      updateData.logo = `/uploads/${req.file.filename}`;
    }

    try {
      const updatedCompany = await Company.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!updatedCompany) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.status(200).json(updatedCompany);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Error updating company" });
    }
  }
);

// Route: Delete a company
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid company ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const deletedCompany = await Company.findByIdAndDelete(req.params.id);
      if (!deletedCompany) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.status(200).json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Error deleting company" });
    }
  }
);

// Route: Apply for a job
router.post(
  "/apply-job",
  resumeUpload.single("resume"),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("jobId").notEmpty().withMessage("Job ID is required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { name, email, coverLetter, jobId } = req.body;

    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "Resume file is required" });
      }

      // Create a new job application with file stored in database
      const newApplication = new JobApplication({
        name,
        email,
        coverLetter,
        jobId,
        resume: {
          data: req.file.buffer,
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
        },
      });

      await newApplication.save();
      res.status(201).json({ message: "Application submitted successfully." });
    } catch (error) {
      console.error("Error submitting application:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        message: "Error submitting application.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Route: Download resume from database
router.get("/resume/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await JobApplication.findById(applicationId);

    if (!application || !application.resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // Set appropriate headers
    res.set({
      "Content-Type": application.resume.contentType,
      "Content-Disposition": `attachment; filename="${application.resume.filename}"`,
      "Content-Length": application.resume.size,
    });

    // Send the file buffer
    res.send(application.resume.data);
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({ message: "Error downloading resume" });
  }
});

export default router;
