import mongoose from "mongoose";

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  jobType: { type: String, required: true },
  description: { type: String, required: true },
  responsibilities: { type: [String], required: false },
  qualifications: { type: [String], required: false },
  image: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Job", JobSchema);
