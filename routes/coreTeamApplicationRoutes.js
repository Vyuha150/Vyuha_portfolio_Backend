import express from "express";
import CoreTeamApplication from "../models/CoreTeamApplication.js";
import { body, validationResult, param } from "express-validator";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply for a core team role
router.post(
  "/",
  [
    body("roleId").notEmpty(),
    body("name").notEmpty(),
    body("email").isEmail(),
    body("message").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { roleId, name, email, message } = req.body;
      const application = new CoreTeamApplication({
        roleId,
        name,
        email,
        message,
      });
      await application.save();
      res.status(201).json({ message: "Application submitted successfully!" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error submitting application", error: err });
    }
  }
);

// Delete a core team application by ID
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const application = await CoreTeamApplication.findByIdAndDelete(
        req.params.id
      );
      if (!application)
        return res.status(404).json({ message: "Application not found" });
      res.json({ message: "Application deleted successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error deleting application", error: err });
    }
  }
);

// Get all core team applications (admin only)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const applications = await CoreTeamApplication.find().populate("roleId");
      res.status(200).json(applications);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching applications", error: err });
    }
  }
);

// Get a single application by ID (admin only)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const application = await CoreTeamApplication.findById(
        req.params.id
      ).populate("roleId");
      if (!application)
        return res.status(404).json({ message: "Application not found" });
      res.status(200).json(application);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching application", error: err });
    }
  }
);

// Update status of a core team application (admin only)
router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    param("id").isMongoId().withMessage("Invalid application ID"),
    body("status")
      .isIn(["pending", "approved", "rejected"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await CoreTeamApplication.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ message: "Error updating status", error: err });
    }
  }
);

export default router;
