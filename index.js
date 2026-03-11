import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "./config.js";

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // set this in your production .env
  process.env.ADMIN_URL, // set this in your production .env
];

app.use("/uploads", (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Expose-Headers", "Content-Disposition");
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

import authRoutes from "./routes/auth.js";
import achievementRoutes from "./routes/achievements.js";
import clubPartnerRoutes from "./routes/clubPartnerRoutes.js";
import clubRoutes from "./routes/clubs.js";
import podcastPartnerRoutes from "./routes/podcastPartnerRoutes.js";
import profileRoutes from "./routes/profile.js";
import eventRoutes from "./routes/events.js";
import organizationRoutes from "./routes/organization.js";
import membershipRoutes from "./routes/membership.js";
import mentorRoutes from "./routes/mentors.js";
import projectRoutes from "./routes/projects.js";
import jobApplicationRoutes from "./routes/jobRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import coreTeamRoleRoutes from "./routes/coreTeamRoleRoutes.js";
import coreTeamApplicationRoutes from "./routes/coreTeamApplicationRoutes.js";
import teamApplicationRoutes from "./routes/teamApplicationRoutes.js";
import jobApplicants from "./routes/jobApplicationRoutes.js";
import userRoutes from "./routes/users.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import adminRoutes from "./routes/admin.js";
import advisorRoutes from "./routes/advisorRoutes.js";
import partnershipsRoutes from "./routes/partnerships.js";

app.use("/api/auth", authRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/club-partner", clubPartnerRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/podcast-partner", podcastPartnerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/job-application", jobApplicationRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/core-team-role", coreTeamRoleRoutes);
app.use("/api/core-team-application", coreTeamApplicationRoutes);
app.use("/api/team-application", teamApplicationRoutes);
app.use("/api/job-applicants", jobApplicants);
app.use("/api/users", userRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/advisors", advisorRoutes);
app.use("/api/partnerships", partnershipsRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error(err));
