import mongoose from "mongoose";

const CoreTeamApplicationSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoreTeamRole",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("CoreTeamApplication", CoreTeamApplicationSchema);
