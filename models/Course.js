import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    instructor: { type: String, required: true },
    instructorPhoto: { type: String, required: true },
    coursePhoto: { type: String, required: true },
    description: { type: String, required: true },
    details: { type: String, required: true },
    prerequisites: [{ type: String, required: true }],
    learningObjectives: [{ type: String, required: true }],
    assessments: { type: String, required: true },
    price: { type: String, required: true },
    format: { type: String, required: true },
    level: { type: String, required: true },
    duration: { type: String, required: true },
    rating: { type: Number, required: true },
    reviews: { type: Number, required: true },
    enrollLink: { type: String, required: true },
    userReviews: [
      {
        user: { type: String, required: false },
        comment: { type: String, required: false },
        rating: { type: Number, required: false },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Course", CourseSchema);
