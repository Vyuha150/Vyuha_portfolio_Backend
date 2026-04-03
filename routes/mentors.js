import { Router } from "express";
import Booking from "../models/Booking.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import { body, param, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import Mentor from "../models/Mentor.js";
import multer from "multer";
import Review from "../models/Review.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files to the "uploads" directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Rate Limiting for Booking API
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: "Too many booking attempts. Please try again later.",
});

// --- ADMIN PANEL ROUTES ---

// Update a mentor (admin & sub-admin only)
router.put(
  "/admin/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("photo"),
  [
    param("id").isMongoId().withMessage("Invalid mentor ID"),
    body("name").optional().isString(),
    body("skills")
      .optional()
      .custom((value) => {
        if (!Array.isArray(JSON.parse(value))) {
          throw new Error("Skills must be an array");
        }
        return true;
      }),
    body("industry").optional().isString(),
    body("experience").optional().isString(),
    body("mentorshipStyle").optional().isString(),
    body("availability").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const updateData = {
        ...req.body,
        photo: req.file ? `/uploads/${req.file.filename}` : undefined,
      };
      if (updateData.skills) {
        updateData.skills = JSON.parse(updateData.skills);
      }
      const updatedMentor = await Mentor.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!updatedMentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }
      res.status(200).json(updatedMentor);
    } catch (error) {
      res.status(500).json({ message: "Error updating mentor", error });
    }
  }
);

// Delete a mentor (admin & sub-admin only)
router.delete(
  "/admin/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid mentor ID")],
  async (req, res) => {
    try {
      const deleted = await Mentor.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Mentor not found" });
      }
      res.status(200).json({ message: "Mentor deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting mentor", error });
    }
  }
);

// Get all bookings (admin & sub-admin only)
router.get(
  "/admin/bookings/all",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const bookings = await Booking.find();
      res.status(200).json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching bookings", error });
    }
  }
);

// Get all reviews (admin & sub-admin only)
router.get(
  "/admin/reviews/all",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const reviews = await Review.find();
      res.status(200).json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reviews", error });
    }
  }
);

// Fetch all mentors
router.get("/", async (req, res) => {
  try {
    const mentors = await Mentor.find({});
    res.status(200).json(mentors);
  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).json({ message: "Error fetching mentors" });
  }
});

// Filter mentors
router.get("/filter", async (req, res) => {
  const { skills, industry, availability } = req.query;

  try {
    const query = {};
    if (skills) query.skills = { $in: [skills] };
    if (industry) query.industry = industry;
    if (availability) query.availability = availability;

    const mentors = await Mentor.find(query); // Use Mentor.find
    res.status(200).json(mentors);
  } catch (error) {
    console.error("Error filtering mentors:", error);
    res.status(500).json({ message: "Error filtering mentors" });
  }
});

// Fetch a specific mentor by ID
router.get("/:id", async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id);
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }
    res.status(200).json(mentor);
  } catch (error) {
    console.error("Error fetching mentor:", error);
    res.status(500).json({ message: "Error fetching mentor" });
  }
});

// Fetch all reviews for a mentor
router.get("/:id/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ mentorId: req.params.id });
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// Add a new review for a mentor
router.post(
  "/:id/reviews",
  [
    param("id").isMongoId().withMessage("Invalid mentor ID"),
    body("user").isString().withMessage("User name is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment").isString().withMessage("Comment is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user, rating, comment } = req.body;

    try {
      const mentor = await Mentor.findById(req.params.id);
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }

      const review = new Review({
        mentorId: req.params.id,
        user,
        rating,
        comment,
      });

      await review.save();
      res.status(201).json(review);
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({ message: "Error adding review" });
    }
  }
);

// Book a mentorship session
router.post(
  "/:id/book",
  [
    param("id").isMongoId().withMessage("Invalid mentor ID"),
    body("date").isISO8601().withMessage("Invalid date format"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("phone")
      .optional()
      .isMobilePhone("any")
      .withMessage("Invalid phone number"),
    body("time").isString().withMessage("Time is required"),
    body("message")
      .optional()
      .isString()
      .withMessage("Message must be a string"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, date, time, message } = req.body;

    try {
      // Check if the mentor exists
      const mentor = await Mentor.findById(req.params.id);
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }

      // Check for booking clashes
      const existingBooking = await Booking.findOne({
        mentorId: req.params.id,
        date,
        time,
      });

      if (existingBooking) {
        return res.status(409).json({
          message:
            "This time slot is already booked. Please choose another time.",
        });
      }

      // Create a new booking
      const booking = new Booking({
        email,
        phone,
        mentorId: req.params.id,
        userId: req.user ? req.user.id : null, // Extracted from authMiddleware
        date,
        time,
        message,
      });

      await booking.save();
      res
        .status(201)
        .json({ message: "Mentorship session booked successfully", booking });
    } catch (error) {
      console.error("Error booking mentorship session:", error);
      res.status(500).json({ message: "Error booking mentorship session" });
    }
  }
);

// Add a new mentor
router.post(
  "/add",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("photo"), // Handle file upload
  [
    body("name").isString().withMessage("Name is required"),
    body("skills")
      .custom((value) => {
        if (!Array.isArray(JSON.parse(value))) {
          throw new Error("Skills must be an array");
        }
        return true;
      })
      .withMessage("Skills must be an array with at least one skill"),
    body("industry").isString().withMessage("Industry is required"),
    body("experience").isString().withMessage("Experience is required"),
    body("mentorshipStyle")
      .isString()
      .withMessage("Mentorship style is required"),
    body("availability").isString().withMessage("Availability is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      skills,
      industry,
      experience,
      mentorshipStyle,
      availability,
    } = req.body;

    try {
      const newMentor = new Mentor({
        name,
        photo: req.file ? `/uploads/${req.file.filename}` : null,
        skills: JSON.parse(skills), // Parse the skills array
        industry,
        experience,
        mentorshipStyle,
        availability,
      });

      await newMentor.save();
      res
        .status(201)
        .json({ message: "Mentor added successfully", mentor: newMentor });
    } catch (error) {
      console.error("Error adding mentor:", error);
      res.status(500).json({ message: "Error adding mentor" });
    }
  }
);

export default router;
