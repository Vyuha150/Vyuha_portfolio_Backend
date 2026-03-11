import mongoose from "mongoose";

const CollaborationRequestSchema = new mongoose.Schema({
  clubName: { type: String, required: true },
  collegeName: { type: String, required: true },
  phone: { type: String, required: true },
  collaborationDetails: { type: String, required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  document: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

export default mongoose.model(
  "CollaborationRequest",
  CollaborationRequestSchema
);
