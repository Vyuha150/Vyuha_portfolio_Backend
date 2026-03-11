import express from "express";
import Club from "../models/Club.js";
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

// Get all clubs (public route)
router.get("/", async (req, res) => {
  try {
    const clubs = await Club.find().sort({ createdAt: -1 });
    res.json(clubs);
  } catch (error) {
    console.error("Error fetching clubs:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single club by ID (public route)
router.get("/:id", 
  [param("id").isMongoId().withMessage("Invalid club ID")],
  async (req, res) => {
    handleValidationErrors(req, res);
    
    try {
      const club = await Club.findById(req.params.id);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      res.json(club);
    } catch (error) {
      console.error("Error fetching club:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create a new club (admin & sub-admin only)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    body("name").isString().withMessage("Club name is required"),
    body("description").isString().withMessage("Description is required"),
    body("image").optional().isString().withMessage("Image must be a valid base64 string"),
  ],
  async (req, res) => {
    handleValidationErrors(req, res);

    try {
      const { name, description, image } = req.body;

      const newClub = new Club({
        name,
        description,
        image: image || "",
      });

      const savedClub = await newClub.save();
      res.status(201).json(savedClub);
    } catch (error) {
      console.error("Error creating club:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update a club (admin & sub-admin only)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    param("id").isMongoId().withMessage("Invalid club ID"),
    body("name").optional().isString().withMessage("Club name must be a string"),
    body("description").optional().isString().withMessage("Description must be a string"),
    body("image").optional().isString().withMessage("Image must be a valid base64 string"),
  ],
  async (req, res) => {
    handleValidationErrors(req, res);

    try {
      const { name, description, image } = req.body;
      const updateData = {};

      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (image !== undefined) updateData.image = image;

      const updatedClub = await Club.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updatedClub) {
        return res.status(404).json({ message: "Club not found" });
      }

      res.json(updatedClub);
    } catch (error) {
      console.error("Error updating club:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete a club (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid club ID")],
  async (req, res) => {
    handleValidationErrors(req, res);

    try {
      const deletedClub = await Club.findByIdAndDelete(req.params.id);

      if (!deletedClub) {
        return res.status(404).json({ message: "Club not found" });
      }

      res.json({ message: "Club deleted successfully" });
    } catch (error) {
      console.error("Error deleting club:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
