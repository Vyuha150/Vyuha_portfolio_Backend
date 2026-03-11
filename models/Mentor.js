import mongoose from "mongoose";

const mentorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  photo: { type: String, required: true },
  skills: { type: [String], required: true },
  industry: { type: String, required: true },
  experience: { type: String, required: true },
  mentorshipStyle: { type: String, required: true },
  availability: { type: String, required: true },
});

const Mentor = mongoose.model("Mentor", mentorSchema);
export default Mentor;
