import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Path to the uploaded image
    required: false,
  },
  skills: {
    type: [String], // Array of skills
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true,
  },
  teamSize: {
    type: String,
    required: true,
  },
  goals: {
    type: [String], // Array of goals
    required: true,
  },
  deliverables: {
    type: [String], // Array of deliverables
    required: true,
  },
  evaluationCriteria: {
    type: [String], // Array of evaluation criteria
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Project = mongoose.model("Project", projectSchema);
export default Project;
