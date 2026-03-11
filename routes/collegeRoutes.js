import express from "express";
import bcrypt from "bcryptjs";
import College from "../models/College.js";
import User from "../models/User.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";

const router = express.Router();

// Helper function for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public endpoint to get all colleges for sign-up form (no auth required)
router.get("/public", async (req, res) => {
  try {
    const colleges = await College.find({}, "name code location").sort({ name: 1 });
    res.status(200).json(colleges);
  } catch (error) {
    console.error("Error fetching public colleges:", error);
    res.status(500).json({ message: "Error fetching colleges" });
  }
});

// Create a new college and an event lead for it
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  [
    body("name").isString().withMessage("College name is required"),
    body("location").isString().withMessage("Location is required"),
    body("code").isString().withMessage("College code is required"),
    body("url").optional().isURL().withMessage("Valid URL is required"),
    body("eventLeadName").isString().withMessage("Event lead name is required"),
    body("eventLeadPhoneNumber").isString().withMessage("Event lead phone number is required"),
    body("eventLeadEmail").isEmail().withMessage("Valid event lead email is required"),
    body("eventLeadPassword")
      .isLength({ min: 6 })
      .withMessage("Event lead password must be at least 6 characters long"),
  ],
  handleValidationErrors,
  async (req, res) => {
    const {
      name,
      location,
      code,
      url,
      eventLeadName,
      eventLeadPhoneNumber,
      eventLeadEmail,
      eventLeadPassword,
    } = req.body;

    let savedEventLead;
    try {
      // Check if a user with this email already exists
      const existingUser = await User.findOne({ email: eventLeadEmail });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "An event lead with this email already exists." });
      }
      
      // Check if a college with this code already exists
      const existingCollege = await College.findOne({ code });
      if (existingCollege) {
        return res
          .status(400)
          .json({ message: "A college with this code already exists." });
      }

      // Hash the password for the new event lead
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(eventLeadPassword, salt);

            // Create the new event lead user
      const newEventLead = new User({
        username: eventLeadName,
        email: eventLeadEmail,
        password: hashedPassword,
        phone: eventLeadPhoneNumber,
        role: "event-lead",
      });
      savedEventLead = await newEventLead.save();

      // Create the new college
      const newCollege = new College({
        name,
        location,
        code,
        url,
        eventLead: savedEventLead._id,
      });
      const savedCollege = await newCollege.save();

      // Update the event lead with the college reference
      savedEventLead.college = savedCollege._id;
      await savedEventLead.save();

      const populatedCollege = await College.findById(savedCollege._id).populate(
        "eventLead",
        "username email phone"
      );

      res.status(201).json(populatedCollege);
    } catch (error) {
      // If college creation fails after user is created, delete the user
      if (savedEventLead) {
        await User.findByIdAndDelete(savedEventLead._id);
      }
      console.error("Error creating college:", error);
      res.status(500).json({ message: "Error creating college" });
    }
  }
);

// Get all colleges
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const colleges = await College.find().populate("eventLead", "username email phone");
      res.status(200).json(colleges);
    } catch (error) {
      res.status(500).json({ message: "Error fetching colleges" });
    }
  }
);

// Get a single college by ID
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const college = await College.findById(req.params.id).populate(
        "eventLead",
        "username email phone"
      );
      if (!college) {
        return res.status(404).json({ message: "College not found" });
      }
      res.status(200).json(college);
    } catch (error) {
      res.status(500).json({ message: "Error fetching college" });
    }
  }
);

// Update a college
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  [
    body("name").optional().isString(),
    body("location").optional().isString(),
    body("code").optional().isString(),
    body("url").optional().isURL(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const updatedCollege = await College.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updatedCollege) {
        return res.status(404).json({ message: "College not found" });
      }
      res.status(200).json(updatedCollege);
    } catch (error) {
      res.status(500).json({ message: "Error updating college" });
    }
  }
);

// Delete a college
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const college = await College.findById(req.params.id);
      if (!college) {
        return res.status(404).json({ message: "College not found" });
      }

      // Delete the associated event lead user
      await User.findByIdAndDelete(college.eventLead);
      
      // Delete the college
      await College.findByIdAndDelete(req.params.id);

      res.status(200).json({ message: "College and associated event lead deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting college" });
    }
  }
);

export default router;