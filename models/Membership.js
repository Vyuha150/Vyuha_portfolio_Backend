import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  organization: { type: String, required: true },
  membershipType: {
    type: String,
    enum: [
      "collaborator",
      "business",
      "college",
      "women-empowerment",
      "political-action",
      "corporate-coolies",
      "influencer",
    ],
    required: true,
  },
  occupation: { type: String, required: true },
  linkedinProfile: { type: String, default: null },
  interests: {
    type: [String], // <-- change from String to [String]
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  paymentId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const Membership = mongoose.model("Membership", membershipSchema);

export default Membership;
