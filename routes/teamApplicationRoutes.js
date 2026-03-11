import express from "express";
import TeamApplication from "../models/TeamApplication.js";
import { body, validationResult, param } from "express-validator";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  [
    body("teamName").notEmpty(),
    body("mission").notEmpty(),
    body("members").isArray({ min: 1 }),
    body("phoneNumber").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { teamName, mission, members, phoneNumber } = req.body;
      const team = new TeamApplication({
        teamName,
        mission,
        members,
        phoneNumber,
      });
      await team.save();
      res.status(201).json({ message: "Team created successfully!" });
    } catch (err) {
      res.status(500).json({ message: "Error creating team", error: err });
    }
  }
);

// GET all team applications (admin & sub-admin only)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const applications = await TeamApplication.find();
      res.json(applications);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching applications", error: err });
    }
  }
);

// GET a single team application by ID (admin & sub-admin only)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const application = await TeamApplication.findById(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching application", error: err });
    }
  }
);

// DELETE a team application by ID (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid application ID")],
  async (req, res) => {
    try {
      const deleted = await TeamApplication.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(200).json({ message: "Application deleted successfully." });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error deleting application", error: err });
    }
  }
);

export default router;
