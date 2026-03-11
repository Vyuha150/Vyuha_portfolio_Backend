import express from "express";
import User from "../models/User.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// GET: Fetch current user's profile
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('college', 'name');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...profile } = user.toObject();
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error });
  }
});

// PUT: Update current user's profile
router.put("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, address, dob, gender, profilePicture } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          name,
          phone,
          address,
          dob,
          gender,
          profilePicture,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error });
  }
});

// --- ADMIN PANEL ROUTES ---

// Get all users (admin & sub-admin only)
router.get(
  "/all",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const users = await User.find().select("-password").populate('college', 'name');
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  }
);

// Get a single user by ID (admin & sub-admin only)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password").populate('college', 'name');
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user", error });
    }
  }
);

// Delete a user by ID (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user", error });
    }
  }
);

export default router;
