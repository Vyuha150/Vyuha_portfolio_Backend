import express from "express";
import { body, validationResult, param } from "express-validator";
import Contact from "../models/Contact.js";

import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Route: Handle contact form submission
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("subject").notEmpty().withMessage("Subject is required"),
    body("message").notEmpty().withMessage("Message is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    try {
      // Save the contact form submission to the database
      const newContact = new Contact({
        name,
        email,
        subject,
        message,
      });

      await newContact.save();

      res.status(200).json({ message: "Message sent successfully." });
    } catch (error) {
      console.error("Error handling contact form submission:", error);
      res
        .status(500)
        .json({ message: "Error handling contact form submission." });
    }
  }
);

// Route: Get all contact messages (admin & sub-admin only)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const contacts = await Contact.find();
      res.status(200).json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contacts", error });
    }
  }
);

// Route: Get a single contact message by ID (admin & sub-admin only)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid contact ID")],
  async (req, res) => {
    try {
      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.status(200).json(contact);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contact", error });
    }
  }
);

// Route: Delete a contact message by ID (admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid contact ID")],
  async (req, res) => {
    try {
      const deleted = await Contact.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.status(200).json({ message: "Contact deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting contact", error });
    }
  }
);

// Route: Update status of a contact message (admin & sub-admin only)
router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [
    param("id").isMongoId().withMessage("Invalid contact ID"),
    body("status")
      .optional()
      .isIn(["new", "in-progress", "resolved"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await Contact.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating status", error });
    }
  }
);

export default router;
