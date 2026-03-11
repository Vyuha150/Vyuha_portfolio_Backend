import mongoose from "mongoose";

const PodcastPartnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true },
  partnerType: { type: String, required: true },
  comments: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  document: { type: String, required: false },
});

export default mongoose.model("PodcastPartner", PodcastPartnerSchema);
