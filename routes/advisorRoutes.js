import express from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import Advisor from "../models/Advisor.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
    }
  }
});

// Helper function for validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// Route: Get all advisors (public)
router.get("/", async (req, res) => {
  try {
    const advisors = await Advisor.find({ isActive: true }).select('-image.data');
    res.status(200).json(advisors);
  } catch (error) {
    console.error("Error fetching advisors:", error);
    res.status(500).json({ message: "Error fetching advisors" });
  }
});

// Route: Get all advisors for admin (includes inactive)
router.get("/admin", authMiddleware, authorizeRoles("admin", "sub-admin"), async (req, res) => {
  try {
    const advisors = await Advisor.find().select('-image.data');
    res.status(200).json(advisors);
  } catch (error) {
    console.error("Error fetching advisors:", error);
    res.status(500).json({ message: "Error fetching advisors" });
  }
});

// Route: Get advisor image
router.get("/image/:id", async (req, res) => {
  try {
    const advisor = await Advisor.findById(req.params.id);
    
    if (!advisor || !advisor.image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': advisor.image.contentType,
      'Content-Length': advisor.image.size,
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });

    // Send the image buffer
    res.send(advisor.image.data);
  } catch (error) {
    console.error("Error fetching advisor image:", error);
    res.status(500).json({ message: "Error fetching image" });
  }
});

// Route: Get single advisor by ID
router.get("/:id", async (req, res) => {
  try {
    const advisor = await Advisor.findById(req.params.id).select('-image.data');
    if (!advisor) {
      return res.status(404).json({ message: "Advisor not found" });
    }
    res.status(200).json(advisor);
  } catch (error) {
    console.error("Error fetching advisor:", error);
    res.status(500).json({ message: "Error fetching advisor" });
  }
});

// Route: Create new advisor (admin only)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("image"),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("designation").notEmpty().withMessage("Designation is required"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { name, designation, bio, expertise, experience, education, linkedIn, email } = req.body;

      // Check if image was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      // Parse expertise if it's a string
      let parsedExpertise = [];
      if (expertise) {
        parsedExpertise = typeof expertise === 'string' ? expertise.split(',').map(item => item.trim()) : expertise;
      }

      const newAdvisor = new Advisor({
        name,
        designation,
        bio,
        expertise: parsedExpertise,
        experience,
        education,
        linkedIn,
        email,
        image: {
          data: req.file.buffer,
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size
        }
      });

      const savedAdvisor = await newAdvisor.save();
      
      // Return advisor without image data
      const advisorResponse = savedAdvisor.toObject();
      delete advisorResponse.image.data;
      
      res.status(201).json(advisorResponse);
    } catch (error) {
      console.error("Error creating advisor:", error);
      res.status(500).json({ message: "Error creating advisor" });
    }
  }
);

// Route: Update advisor (admin only)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.single("image"),
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("designation").optional().notEmpty().withMessage("Designation cannot be empty"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { name, designation, bio, expertise, experience, education, linkedIn, email, isActive } = req.body;
      
      const advisor = await Advisor.findById(req.params.id);
      if (!advisor) {
        return res.status(404).json({ message: "Advisor not found" });
      }

      // Parse expertise if it's a string
      let parsedExpertise = advisor.expertise;
      if (expertise !== undefined) {
        parsedExpertise = typeof expertise === 'string' ? expertise.split(',').map(item => item.trim()) : expertise;
      }

      // Update fields
      advisor.name = name || advisor.name;
      advisor.designation = designation || advisor.designation;
      advisor.bio = bio !== undefined ? bio : advisor.bio;
      advisor.expertise = parsedExpertise;
      advisor.experience = experience !== undefined ? experience : advisor.experience;
      advisor.education = education !== undefined ? education : advisor.education;
      advisor.linkedIn = linkedIn !== undefined ? linkedIn : advisor.linkedIn;
      advisor.email = email !== undefined ? email : advisor.email;
      advisor.isActive = isActive !== undefined ? isActive : advisor.isActive;

      // Update image if provided
      if (req.file) {
        advisor.image = {
          data: req.file.buffer,
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size
        };
      }

      const updatedAdvisor = await advisor.save();
      
      // Return advisor without image data
      const advisorResponse = updatedAdvisor.toObject();
      delete advisorResponse.image.data;
      
      res.status(200).json(advisorResponse);
    } catch (error) {
      console.error("Error updating advisor:", error);
      res.status(500).json({ message: "Error updating advisor" });
    }
  }
);

// Route: Delete advisor (admin only)
router.delete("/:id", authMiddleware, authorizeRoles("admin"), async (req, res) => {
  try {
    const advisor = await Advisor.findByIdAndDelete(req.params.id);
    if (!advisor) {
      return res.status(404).json({ message: "Advisor not found" });
    }
    res.status(200).json({ message: "Advisor deleted successfully" });
  } catch (error) {
    console.error("Error deleting advisor:", error);
    res.status(500).json({ message: "Error deleting advisor" });
  }
});

export default router;
