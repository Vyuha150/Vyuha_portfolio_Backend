import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  dob: { type: Date, default: null },
  gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
  profilePicture: { type: String, default: "" },
  address: { type: String, default: "" },
  district: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "" },
  customCollege: { type: String, default: "" },
  role: {
    type: String,
    enum: ["admin", "sub-admin", "user", "event-lead", "student", "vcc-member"],
    default: "user",
    required: true,
  },
  // Email verification fields
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  // Password reset fields
  passwordResetCode: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  // 'college' is used for normal selection. If 'Other' is selected, 'customCollege' is used to store the custom name.
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

// Add a method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
