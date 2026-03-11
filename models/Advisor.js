import mongoose from "mongoose";

const AdvisorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  image: {
    data: { type: Buffer, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true }
  },
  bio: { type: String },
  expertise: [{ type: String }],
  experience: { type: String },
  education: { type: String },
  linkedIn: { type: String },
  email: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AdvisorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Advisor", AdvisorSchema);
