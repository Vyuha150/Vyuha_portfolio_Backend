import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  organizer: { type: String, required: true },
  organizerBio: { type: String },
  platformLink: { type: String },
  fees: { type: String, required: true },
  materials: { type: String },
  isRecorded: { type: Boolean, default: false },
  isVcc: { type: Boolean, default: false },
  inCollege: { type: Boolean, default: false },
  college: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "College",
    default: null 
  },
  category: { type: String, required: true },
  mode: { type: String, enum: ["online", "offline"], required: true },
  targetAudience: { type: String },
  logo: { type: String }, // Store as base64 string
  image: { type: String }, // Store as base64 string  
  organizerPhoto: { type: String }, // Store as base64 string
  registrations: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      message: { type: String },
    },
  ],
});

const Event = mongoose.model("Event", eventSchema);

export default Event;
