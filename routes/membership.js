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

const normalizeLinkedinUrl = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("linkedin.com")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const isTestRazorpayKey = (key) => typeof key === "string" && key.startsWith("rzp_test_");

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
    body("fullName")
      .isString()
      .withMessage("Full name is required")
      .bail()
      .trim()
      .notEmpty()
      .withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone")
      .isString()
      .withMessage("Phone number is required")
      .bail()
      .trim()
      .notEmpty()
      .withMessage("Phone number is required"),
    body("address")
      .isString()
      .withMessage("Address is required")
      .bail()
      .trim()
      .notEmpty()
      .withMessage("Address is required"),
    body("organization")
      .isString()
      .withMessage("Organization is required")
      .bail()
      .trim()
      .notEmpty()
      .withMessage("Organization is required"),
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
      .isString()
      .withMessage("Occupation must be a string"),
    body("linkedinProfile")
      .optional({ checkFalsy: true })
      .custom((value) => {
        const normalized = normalizeLinkedinUrl(value);
        if (!normalized) {
          throw new Error("LinkedIn profile must be a valid LinkedIn URL");
        }
        return true;
      }),
    body("interests")
      .optional()
      .isArray()
      .withMessage("Interests must be an array"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      if (
        process.env.NODE_ENV === "production" &&
        isTestRazorpayKey(process.env.RAZORPAY_KEY_ID)
      ) {
        return res.status(500).json({
          message:
            "Razorpay is configured with test keys in production. Please switch to live keys.",
        });
      }

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

      const normalizedLinkedin = normalizeLinkedinUrl(linkedinProfile);

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
        linkedinProfile: normalizedLinkedin,
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

      newMembership.razorpayOrderId = order.id;
      await newMembership.save();

      res.status(201).json({
        message: "Membership application submitted. Proceed to payment.",
        orderId: order.id,
        amount,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("Error creating membership application:", error);
      console.error("Error stack:", error.stack);

      if (error?.name === "ValidationError") {
        return res.status(400).json({
          message: "Validation failed",
          errors: Object.values(error.errors).map((e) => ({
            field: e.path,
            msg: e.message,
          })),
        });
      }

      if (error?.statusCode && error?.error?.description) {
        return res.status(502).json({
          message: error.error.description,
          code: error.error.code,
        });
      }

      res.status(500).json({
        message: error?.message || "An error occurred. Please try again.",
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
        { razorpayOrderId: orderId },
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
