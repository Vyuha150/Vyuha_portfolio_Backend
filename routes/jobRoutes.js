import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { body, param, validationResult } from "express-validator";
import Job from "../models/Job.js";
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
    cb(null, uploadsDir); // Save files to the "uploads/jobs" directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Use a unique filename
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

// Route: Get all jobs
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

// Route: Get a single job by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid job ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.status(200).json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Error fetching job" });
    }
  }
);

// Route: Create a new job with file upload
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("image"), // Handle single file upload
  [
    body("title").isString().withMessage("Job title is required"),
    body("company").isString().withMessage("Company name is required"),
    body("location").isString().withMessage("Location is required"),
    body("jobType").isString().withMessage("Job type is required"),
    body("description").isString().withMessage("Job description is required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const {
      title,
      company,
      location,
      jobType,
      description,
      responsibilities,
      qualifications,
    } = req.body;

    try {
      const newJob = new Job({
        title,
        company,
        location,
        jobType,
        description,
        responsibilities: responsibilities ? responsibilities.split(",") : [],
        qualifications: qualifications ? qualifications.split(",") : [],
        image: req.file ? `/uploads/${req.file.filename}` : null, // Save the file path
      });

      await newJob.save();
      res.status(201).json(newJob);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Error creating job" });
    }
  }
);

// Route: Update a job (requires authentication)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("image"), // Handle file upload for updates
  [
    param("id").isMongoId().withMessage("Invalid job ID"),
    body("title")
      .optional()
      .isString()
      .withMessage("Job title must be a string"),
    body("company")
      .optional()
      .isString()
      .withMessage("Company name must be a string"),
    body("location")
      .optional()
      .isString()
      .withMessage("Location must be a string"),
    body("jobType")
      .optional()
      .isString()
      .withMessage("Job type must be a string"),
    body("description")
      .optional()
      .isString()
      .withMessage("Job description must be a string"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const updateData = {
        ...req.body,
        image: req.file ? `/uploads/${req.file.filename}` : undefined, // Update the file path if a new file is uploaded
      };

      const updatedJob = await Job.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
        }
      );
      if (!updatedJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.status(200).json(updatedJob);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Error updating job" });
    }
  }
);

// Route: Delete a job (requires authentication)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid job ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const deletedJob = await Job.findByIdAndDelete(req.params.id);
      if (!deletedJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.status(200).json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Error deleting job" });
    }
  }
);

export default router;
