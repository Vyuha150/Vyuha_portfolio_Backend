import mongoose from "mongoose";

const CoreTeamRoleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    responsibilities: [{ type: String, required: true }],
    requirements: [{ type: String, required: true }],
  },
  { timestamps: true }
);

export default mongoose.model("CoreTeamRole", CoreTeamRoleSchema);
