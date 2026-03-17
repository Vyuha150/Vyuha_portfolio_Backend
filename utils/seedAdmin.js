import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import "../config.js";

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // change these values as necessary
    const adminData = {
      username: "admin",
      email: "Vyuha.admin@ivyuha.com",
      password: "Vyuha @01.", 
      role: "admin",
      isEmailVerified: true,
    };

    // hash the password
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // remove any existing user with the same email/username
    await User.deleteMany({
      $or: [{ email: adminData.email }, { username: adminData.username }],
    });

    const admin = await User.create(adminData);
    console.log("Seeded admin user:", admin.email);

    mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding admin:", err);
    process.exit(1);
  }
}

seedAdmin();
