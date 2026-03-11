import express from "express";
import Achievement from "../models/Achievement.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import { body, param, validationResult } from "express-validator";

const router = express.Router();

// Helper function for validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// Get all achievements (public route)
router.get("/", async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ date: -1 });
    res.json(achievements);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single achievement by ID (public route)
router.get("/:id", 
  [param("id").isMongoId().withMessage("Invalid achievement ID")],
  async (req, res) => {
    handleValidationErrors(req, res);
    
    try {
      const achievement = await Achievement.findById(req.params.id);
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }
      res.json(achievement);
    } catch (error) {
      console.error("Error fetching achievement:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create a new achievement (admin & sub-admin only)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    body("title").isString().withMessage("Achievement title is required"),
    body("description").isString().withMessage("Description is required"),
    body("date").optional().isISO8601().withMessage("Valid date is required"),
    body("image").optional().isString().withMessage("Image must be a valid base64 string or URL"),
  ],
  async (req, res) => {
    handleValidationErrors(req, res);

    try {
      const { title, description, image, date } = req.body;

      const newAchievement = new Achievement({
        title,
        description,
        image: image || "",
        date: date || new Date(),
      });

      const savedAchievement = await newAchievement.save();
      res.status(201).json(savedAchievement);
    } catch (error) {
      console.error("Error creating achievement:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update an achievement (admin & sub-admin only)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    param("id").isMongoId().withMessage("Invalid achievement ID"),
    body("title").optional().isString().withMessage("Achievement title must be a string"),
    body("description").optional().isString().withMessage("Description must be a string"),
    body("date").optional().isISO8601().withMessage("Valid date is required"),
    body("image").optional().isString().withMessage("Image must be a valid base64 string or URL"),
  ],
  async (req, res) => {
    handleValidationErrors(req, res);

    try {
      const { title, description, image, date } = req.body;
      const updateData = {};

      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (date) updateData.date = date;
      if (image !== undefined) updateData.image = image;

      const updatedAchievement = await Achievement.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updatedAchievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      res.json(updatedAchievement);
    } catch (error) {
      console.error("Error updating achievement:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete an achievement (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid achievement ID")],
  async (req, res) => {
    handleValidationErrors(req, res);

    try {
      const deletedAchievement = await Achievement.findByIdAndDelete(req.params.id);

      if (!deletedAchievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      res.json({ message: "Achievement deleted successfully" });
    } catch (error) {
      console.error("Error deleting achievement:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
