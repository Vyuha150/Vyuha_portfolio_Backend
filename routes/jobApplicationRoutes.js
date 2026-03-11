import express from "express";
import { body, param, validationResult } from "express-validator";
import JobApplication from "../models/JobApplication.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper for validation errors
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// GET all job applications (admin only)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const applications = await JobApplication.find().sort({ createdAt: -1 });
      res.status(200).json(applications);
    } catch (error) {
      console.error("Error fetching job applications:", error);
      res.status(500).json({ message: "Error fetching job applications" });
    }
  }
);

// DELETE a job application by ID (admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const deleted = await JobApplication.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Job application not found" });
      }
      res.status(200).json({ message: "Job application deleted successfully" });
    } catch (error) {
      console.error("Error deleting job application:", error);
      res.status(500).json({ message: "Error deleting job application" });
    }
  }
);

// UPDATE status of a job application by ID (admin only)
router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    param("id").isMongoId().withMessage("Invalid application ID"),
    body("status").notEmpty().withMessage("Status is required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const { status } = req.body;
      const updated = await JobApplication.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Job application not found" });
      }
      res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating job application status:", error);
      res
        .status(500)
        .json({ message: "Error updating job application status" });
    }
  }
);

export default router;
