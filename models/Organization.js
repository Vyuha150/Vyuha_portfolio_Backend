import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
  // Common fields
  registerAs: {
    type: String,
    enum: ["individual", "organization"],
    required: true,
  },
  name: { type: String, required: true }, // Organization or Individual Name
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  logo: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },

  // Partnerships page fields
  domain: { type: String },
  region: { type: String },
  description: { type: String },
  social: {
    instagram: { type: String },
    linkedin: { type: String },
    youtube: { type: String },
  },
  eventsHosted: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  newlyJoined: { type: Boolean, default: false },

  // Organization-specific fields
  organizationType: { type: String }, // Only for organizations
  activeMembers: { type: String },
  pastEvents: { type: String },

  // Individual-specific fields
  collegeUniversity: { type: String }, // Only for individuals
});

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
