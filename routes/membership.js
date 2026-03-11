import express from "express";
import Membership from "../models/Membership.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { body, validationResult, param } from "express-validator";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function for validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// Create Membership Application
router.post(
  "/apply",
  [
    body("fullName").isString().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone").isString().withMessage("Phone number is required"),
    body("address").isString().withMessage("Address is required"),
    body("organization").isString().withMessage("Organization is required"),
    body("membershipType")
      .isIn([
        "collaborator",
        "business",
        "college",
        "political-action",
        "women-empowerment",
        "corporate-coolies",
        "influencer",
      ])
      .withMessage("Invalid membership type"),
    body("occupation")
      .optional()
      .isString()
      .withMessage("Occupation must be a string"),
    body("linkedinProfile")
      .optional()
      .isURL()
      .withMessage("LinkedIn profile must be a valid URL"),
    body("interests")
      .optional()
      .isArray()
      .withMessage("Interests must be an array"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const {
        fullName,
        email,
        phone,
        address,
        organization,
        membershipType,
        occupation,
        linkedinProfile,
        interests,
      } = req.body;

      // Determine if payment is required
      const isPaidMembership = membershipType !== "women-empowerment";

      // Create a new membership entry
      const newMembership = new Membership({
        fullName,
        email,
        phone,
        address,
        organization,
        membershipType,
        occupation,
        linkedinProfile,
        interests,
        paymentStatus: isPaidMembership ? "pending" : "completed",
      });

      await newMembership.save();

      if (!isPaidMembership) {
        return res
          .status(201)
          .json({ message: "Membership application submitted successfully!" });
      }

      // If payment is required, generate a Razorpay order
      let amount;
      switch (membershipType) {
        case "college":
          amount = 150 * 100; // ₹150 in paise
          break;
        case "political-action":
          amount = 100 * 100; // ₹100 in paise
          break;
        case "influencer":
          amount = 250 * 100; // ₹250 in paise
          break;
        case "corporate-coolies":
          amount = 777 * 100; // ₹777 in paise
          break;
        case "business":
          amount = 3000 * 100; // ₹3000 in paise
          break;
        case "collaborator":
        default:
          amount = 500 * 100; // ₹500 in paise
          break;
      }

      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: newMembership._id.toString(),
      });

      res.status(201).json({
        message: "Membership application submitted. Proceed to payment.",
        orderId: order.id,
        amount,
        currency: "INR",
      });
    } catch (error) {
      console.error("Error creating membership application:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        message: "An error occurred. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Verify Payment
router.post(
  "/verify-payment",
  [
    body("orderId").isString().withMessage("Order ID is required"),
    body("paymentId").isString().withMessage("Payment ID is required"),
    body("signature").isString().withMessage("Signature is required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { orderId, paymentId, signature } = req.body;

      // Verify the payment signature
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(orderId + "|" + paymentId)
        .digest("hex");

      if (generatedSignature !== signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      // Update the membership payment status
      const membership = await Membership.findOneAndUpdate(
        { _id: orderId },
        { paymentStatus: "completed", paymentId },
        { new: true }
      );

      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }

      res.status(200).json({ message: "Payment verified successfully!" });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  }
);

// --- ADMIN PANEL ROUTES ---

// Get all membership applications (admin & sub-admin only)
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const memberships = await Membership.find();
      res.status(200).json(memberships);
    } catch (error) {
      res.status(500).json({ message: "Error fetching memberships", error });
    }
  }
);

// Get a single membership application by ID (admin & sub-admin only)
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid membership ID")],
  async (req, res) => {
    try {
      const membership = await Membership.findById(req.params.id);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }
      res.status(200).json(membership);
    } catch (error) {
      res.status(500).json({ message: "Error fetching membership", error });
    }
  }
);

// Delete a membership application by ID (admin & sub-admin only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid membership ID")],
  async (req, res) => {
    try {
      const deleted = await Membership.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Membership not found" });
      }
      res.status(200).json({ message: "Membership deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting membership", error });
    }
  }
);

export default router;
