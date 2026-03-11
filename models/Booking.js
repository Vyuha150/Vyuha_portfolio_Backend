import { Schema, model } from "mongoose";

const BookingSchema = new Schema({
  mentorId: {
    type: Schema.Types.ObjectId,
    ref: "Mentor",
    required: true,
  },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
  date: { type: String, required: true },
  time: { type: String, required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default model("Booking", BookingSchema);
