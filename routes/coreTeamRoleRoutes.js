import express from "express";
import CoreTeamRole from "../models/CoreTeamRole.js";
import { body, validationResult, param } from "express-validator";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    body("title").notEmpty(),
    body("description").notEmpty(),
    body("responsibilities").isArray({ min: 1 }),
    body("requirements").isArray({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { title, description, responsibilities, requirements } = req.body;
      const role = new CoreTeamRole({
        title,
        description,
        responsibilities,
        requirements,
      });
      await role.save();
      res.status(201).json(role);
    } catch (err) {
      res.status(500).json({ message: "Error creating role", error: err });
    }
  }
);

// READ ALL
router.get("/", async (req, res) => {
  try {
    const roles = await CoreTeamRole.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: "Error fetching roles", error: err });
  }
});

// READ BY ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid role ID")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const role = await CoreTeamRole.findById(req.params.id);
      if (!role) return res.status(404).json({ message: "Role not found" });
      res.json(role);
    } catch (err) {
      res.status(500).json({ message: "Error fetching role", error: err });
    }
  }
);

// UPDATE
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid role ID")],
  async (req, res) => {
    try {
      const updateData = { ...req.body };
      const role = await CoreTeamRole.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!role) return res.status(404).json({ message: "Role not found" });
      res.json(role);
    } catch (err) {
      res.status(500).json({ message: "Error updating role", error: err });
    }
  }
);

// DELETE
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid role ID")],
  async (req, res) => {
    try {
      const role = await CoreTeamRole.findByIdAndDelete(req.params.id);
      if (!role) return res.status(404).json({ message: "Role not found" });
      res.json({ message: "Role deleted" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting role", error: err });
    }
  }
);

export default router;
