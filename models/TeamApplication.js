import mongoose from "mongoose";

const TeamApplicationSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  mission: { type: String, required: true },
  members: [{ type: String, required: true }],
  phoneNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TeamApplication", TeamApplicationSchema);
