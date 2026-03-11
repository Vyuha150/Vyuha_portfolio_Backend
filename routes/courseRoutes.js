import express from "express";
import Course from "../models/Course.js";
import { body, validationResult, param } from "express-validator";
import multer from "multer";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer storage config for course photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/course-photos/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, ""));
  },
});
const upload = multer({ storage });

// CREATE a new course
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.fields([
    { name: "coursePhoto", maxCount: 1 },
    { name: "instructorPhoto", maxCount: 1 },
  ]),
  [
    body("title").notEmpty(),
    body("instructor").notEmpty(),
    // Remove .notEmpty() for instructorPhoto, will handle file below
    body("description").notEmpty(),
    body("details").notEmpty(),
    body("prerequisites").notEmpty(),
    body("learningObjectives").notEmpty(),
    body("assessments").notEmpty(),
    body("price").notEmpty(),
    body("format").notEmpty(),
    body("level").notEmpty(),
    body("duration").notEmpty(),
    body("rating").notEmpty(),
    body("reviews").notEmpty(),
    body("enrollLink").isURL().withMessage("Valid enroll link required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const {
        title,
        instructor,
        description,
        details,
        prerequisites,
        learningObjectives,
        assessments,
        price,
        format,
        level,
        duration,
        rating,
        reviews,
        enrollLink,
        userReviews,
      } = req.body;

      const coursePhotoFile = req.files?.coursePhoto?.[0];
      const instructorPhotoFile = req.files?.instructorPhoto?.[0];

      // Handle course photo - can be either file upload or URL string
      let coursePhotoPath;
      if (coursePhotoFile) {
        coursePhotoPath = `/uploads/course-photos/${coursePhotoFile.filename}`;
      } else if (req.body.coursePhoto) {
        coursePhotoPath = req.body.coursePhoto; // Use provided URL
      } else {
        return res
          .status(400)
          .json({ message: "Course photo (file or URL) is required" });
      }

      // Handle instructor photo - can be either file upload or URL string
      let instructorPhotoPath;
      if (instructorPhotoFile) {
        instructorPhotoPath = `/uploads/course-photos/${instructorPhotoFile.filename}`;
      } else if (req.body.instructorPhoto) {
        instructorPhotoPath = req.body.instructorPhoto; // Use provided URL
      } else {
        return res
          .status(400)
          .json({ message: "Instructor photo (file or URL) is required" });
      }

      const course = new Course({
        title,
        instructor,
        instructorPhoto: instructorPhotoPath,
        coursePhoto: coursePhotoPath,
        description,
        details,
        prerequisites: prerequisites
          ? Array.isArray(prerequisites)
            ? prerequisites
            : typeof prerequisites === "string" && prerequisites.startsWith("[")
            ? (() => {
                try {
                  return JSON.parse(prerequisites);
                } catch {
                  return prerequisites
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                }
              })()
            : prerequisites
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : [],
        learningObjectives: learningObjectives
          ? Array.isArray(learningObjectives)
            ? learningObjectives
            : typeof learningObjectives === "string" &&
              learningObjectives.startsWith("[")
            ? (() => {
                try {
                  return JSON.parse(learningObjectives);
                } catch {
                  return learningObjectives
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                }
              })()
            : learningObjectives
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : [],
        assessments,
        price,
        format,
        level,
        duration,
        rating: rating ? (isNaN(Number(rating)) ? 0 : Number(rating)) : 0,
        reviews: reviews ? (isNaN(Number(reviews)) ? 0 : Number(reviews)) : 0,
        enrollLink,
        userReviews: userReviews
          ? Array.isArray(userReviews)
            ? userReviews
            : []
          : [],
      });

      await course.save();
      res.status(201).json(course);
    } catch (err) {
      console.error("Error creating course:", err);
      res.status(500).json({
        message: "Error creating course",
        error: err.message || err,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }
);

// READ all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Error fetching courses", error: err });
  }
});

// READ course by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid course ID")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const course = await Course.findById(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (err) {
      res.status(500).json({ message: "Error fetching course", error: err });
    }
  }
);

// UPDATE course by ID
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  upload.fields([
    { name: "coursePhoto", maxCount: 1 },
    { name: "instructorPhoto", maxCount: 1 },
  ]),
  [param("id").isMongoId().withMessage("Invalid course ID")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const updateData = { ...req.body };
      const coursePhotoFile = req.files?.coursePhoto?.[0];
      const instructorPhotoFile = req.files?.instructorPhoto?.[0];

      if (coursePhotoFile) {
        updateData.coursePhoto = `/uploads/course-photos/${coursePhotoFile.filename}`;
      }
      if (instructorPhotoFile) {
        updateData.instructorPhoto = `/uploads/course-photos/${instructorPhotoFile.filename}`;
      } else if (req.body.instructorPhoto) {
        // Keep the provided URL if no file uploaded
        updateData.instructorPhoto = req.body.instructorPhoto;
      }

      // Robust array parsing
      if (
        updateData.prerequisites &&
        typeof updateData.prerequisites === "string"
      ) {
        try {
          updateData.prerequisites = JSON.parse(updateData.prerequisites);
        } catch {
          updateData.prerequisites = updateData.prerequisites
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      if (
        updateData.learningObjectives &&
        typeof updateData.learningObjectives === "string"
      ) {
        try {
          updateData.learningObjectives = JSON.parse(
            updateData.learningObjectives
          );
        } catch {
          updateData.learningObjectives = updateData.learningObjectives
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      if (
        updateData.userReviews &&
        typeof updateData.userReviews === "string"
      ) {
        try {
          updateData.userReviews = JSON.parse(updateData.userReviews);
        } catch {
          updateData.userReviews = [];
        }
      }

      // Convert string numbers to actual numbers
      if (updateData.rating) {
        updateData.rating = isNaN(Number(updateData.rating))
          ? 0
          : Number(updateData.rating);
      }
      if (updateData.reviews) {
        updateData.reviews = isNaN(Number(updateData.reviews))
          ? 0
          : Number(updateData.reviews);
      }

      const course = await Course.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      });
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (err) {
      console.error("Error updating course:", err);
      res.status(500).json({ message: "Error updating course", error: err });
    }
  }
);

// DELETE course by ID
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  [param("id").isMongoId().withMessage("Invalid course ID")],
  async (req, res) => {
    try {
      const course = await Course.findByIdAndDelete(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json({ message: "Course deleted" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting course", error: err });
    }
  }
);

export default router;
