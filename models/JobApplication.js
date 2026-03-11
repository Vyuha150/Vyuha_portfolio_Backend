import mongoose from "mongoose";

const JobApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  coverLetter: { type: String, required: false },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  resume: {
    data: { type: Buffer, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true }
  },
  appliedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

export default mongoose.model("JobApplication", JobApplicationSchema);
