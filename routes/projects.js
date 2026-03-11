import express from "express";
import Project from "../models/Project.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import multer from "multer";
import { body, param, validationResult } from "express-validator";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // Save files to the "uploads" directory
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

// Create a new project (admin & sub-admin only)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("image"),
  [
    body("title").isString().withMessage("Project title is required"),
    body("description").isString().withMessage("Description is required"),
    body("deadline").isISO8601().withMessage("Valid deadline is required"),
    body("difficulty").isString().withMessage("Difficulty is required"),
    body("teamSize").isString().withMessage("Team size is required"),
    body("skills").isString().withMessage("Skills are required"),
    body("goals").isString().withMessage("Goals are required"),
    body("deliverables").isString().withMessage("Deliverables are required"),
    body("evaluationCriteria")
      .isString()
      .withMessage("Evaluation criteria are required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const {
        title,
        description,
        deadline,
        difficulty,
        teamSize,
        skills,
        goals,
        deliverables,
        evaluationCriteria,
      } = req.body;

      const newProject = new Project({
        title,
        description,
        deadline,
        difficulty,
        teamSize,
        skills: skills.split(",").map((skill) => skill.trim()),
        goals: goals.split("\n").map((goal) => goal.trim()),
        deliverables: deliverables.split("\n").map((item) => item.trim()),
        evaluationCriteria: evaluationCriteria
          .split("\n")
          .map((criteria) => criteria.trim()),
        image: req.file ? `/uploads/${req.file.filename}` : null,
      });

      await newProject.save();
      res.status(201).json(newProject);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Error creating project" });
    }
  }
);

// Fetch all projects (open to all)
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// Fetch a single project by ID (open to all)
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid project ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(200).json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Error fetching project" });
    }
  }
);

// Update a project (admin & sub-admin only)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("image"),
  [param("id").isMongoId().withMessage("Invalid project ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const updatedData = {
        ...req.body,
        image: req.file ? `/uploads/${req.file.filename}` : undefined,
      };

      if (updatedData.skills) {
        updatedData.skills = updatedData.skills
          .split(",")
          .map((skill) => skill.trim());
      }
      if (updatedData.goals) {
        updatedData.goals = updatedData.goals
          .split("\n")
          .map((goal) => goal.trim());
      }
      if (updatedData.deliverables) {
        updatedData.deliverables = updatedData.deliverables
          .split("\n")
          .map((item) => item.trim());
      }
      if (updatedData.evaluationCriteria) {
        updatedData.evaluationCriteria = updatedData.evaluationCriteria
          .split("\n")
          .map((criteria) => criteria.trim());
      }

      const updatedProject = await Project.findByIdAndUpdate(
        req.params.id,
        updatedData,
        { new: true }
      );

      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.status(200).json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Error updating project" });
    }
  }
);

// Delete a project (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid project ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const deletedProject = await Project.findByIdAndDelete(req.params.id);

      if (!deletedProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Error deleting project" });
    }
  }
);

export default router;
