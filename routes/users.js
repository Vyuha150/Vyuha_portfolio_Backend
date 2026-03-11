import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all users (admin & sub-admin)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  }
);

// Get a single user by ID (admin & sub-admin)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user", error });
    }
  }
);

// Update a user by ID (admin & sub-admin)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const {
        username,
        email,
        phone,
        address,
        dob,
        gender,
        profilePicture,
        role,
        password,
      } = req.body;

      const updateData = {
        username,
        email,
        phone,
        address,
        dob,
        gender,
        profilePicture,
        role,
      };

      // Only hash and update password if it's provided
      if (password && password.trim() !== "") {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true }
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res
        .status(200)
        .json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Error updating user", error });
    }
  }
);

// Delete a user by ID (admin & sub-admin)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user", error });
    }
  }
);

// Search users by username or email (admin & sub-admin)
router.get(
  "/search/:query",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const q = req.params.query;
      const users = await User.find({
        $or: [
          { username: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }).select("-password");
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: "Error searching users", error });
    }
  }
);

// Create a new user (admin & sub-admin)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const {
        username,
        email,
        phone,
        address,
        dob,
        gender,
        profilePicture,
        role,
        password,
      } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({
          message: "Username, email, and password are required",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        return res.status(400).json({
          message: "User with this email or username already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        username,
        email,
        phone,
        address,
        dob,
        gender,
        profilePicture,
        role,
        password: hashedPassword,
      });
      await user.save();

      // Return user without password
      const userResponse = { ...user.toObject() };
      delete userResponse.password;

      res.status(201).json({
        message: "User created successfully",
        user: userResponse,
      });
    } catch (error) {
      res.status(500).json({ message: "Error creating user", error });
    }
  }
);

export default router;
