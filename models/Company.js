import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, required: false }, // Make logo optional
  industry: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  jobOpenings: [{ type: String, required: false }],
  contact: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Company", CompanySchema);
