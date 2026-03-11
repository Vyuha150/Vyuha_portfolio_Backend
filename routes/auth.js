import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { body, validationResult } from "express-validator";
import { authMiddleware } from "../middleware/authMiddleware.js";
import gateway from "default-gateway";
import {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/emailService.js";

const router = express.Router();

// SIGNUP
router.post(
  "/signup",
  [
    body("username")
      .isString()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("phone")
      .isString()
      .isLength({ min: 10, max: 15 })
      .withMessage("Phone number is required"),
    body("password")
      .isStrongPassword()
      .withMessage(
        "Password must include at least 1 uppercase, 1 lowercase, 1 number, and 1 special character"
      ),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, phone, password, role } = req.body;

    let userRole = "user";
    if (role && ["admin", "sub-admin", "event-lead"].includes(role)) {
      userRole = role;
    }

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (!existingUser.isEmailVerified) {
          // User exists but not verified, resend verification code
          const verificationCode = generateVerificationCode();
          const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

          existingUser.emailVerificationCode = verificationCode;
          existingUser.emailVerificationExpires = verificationExpires;
          await existingUser.save();

          const emailResult = await sendVerificationEmail(
            email,
            verificationCode,
            existingUser.username
          );

          if (emailResult.success) {
            return res.status(200).json({
              message:
                "Account exists but not verified. Verification code sent to your email.",
              needsVerification: true,
            });
          } else {
            return res
              .status(500)
              .json({ message: "Failed to send verification email" });
          }
        }
        return res
          .status(400)
          .json({ message: "User already exists and is verified" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationCode = generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const newUser = new User({
        username,
        email,
        phone,
        password: hashedPassword,
        role: userRole,
        emailVerificationCode: verificationCode,
        emailVerificationExpires: verificationExpires,
        isEmailVerified: false,
      });

      await newUser.save();

      const emailResult = await sendVerificationEmail(
        email,
        verificationCode,
        username
      );

      if (emailResult.success) {
        res.status(201).json({
          message:
            "User registered successfully. Please check your email for verification code.",
          needsVerification: true,
          userId: newUser._id,
        });
      } else {
        // Delete the user if email sending fails
        await User.findByIdAndDelete(newUser._id);
        res.status(500).json({
          message: "Failed to send verification email. Please try again.",
        });
      }
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

// LOGIN
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isString().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get IP address
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip;

    let defaultGatewayIp = "";
    try {
      const result = await gateway.v4();
      defaultGatewayIp = result.gateway;
    } catch (err) {
      defaultGatewayIp = "Unavailable";
    }

    try {
      const user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if email is verified
      // if (!user.isEmailVerified) {
      //   return res.status(403).json({
      //     message:
      //       "Please verify your email before logging in. Check your email for verification code.",
      //     needsVerification: true,
      //   });
      // }

      // Log IP and gateway information
      console.log(`User ${email} logged in from IP: ${ip}`);
      console.log(`Default Gateway IP: ${defaultGatewayIp}`);

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      res.status(200).json({
        token,
        userId: user._id,
        role: user.role,
        ip,
        defaultGateway: defaultGatewayIp,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error during login", error });
    }
  }
);

// Register a new user
router.post(
  "/register",
  [
    body("username").isString().withMessage("Username is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone").isString().optional().withMessage("Phone must be a string"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("isStudent").isBoolean().optional(),
    body("college").isString().optional(),
    body("customCollege").isString().optional(),
    body("address").isString().optional(),
    body("district").isString().optional(),
    body("state").isString().optional(),
    body("country").isString().optional(),
    body("gender").isString().optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      username,
      email,
      phone,
      password,
      role,
      isStudent,
      college,
      customCollege,
      address,
      district,
      state,
      country,
      gender,
    } = req.body;

    console.log("Registration request body:", req.body);

    let userRole = isStudent ? "student" : "user";
    if (role && ["admin", "sub-admin", "event-lead"].includes(role)) {
      userRole = role;
    }

    try {
      // Check for existing user by email
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check for existing user by username
      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Handle college field - convert to ObjectId if valid, otherwise set to null
      let collegeId = null;
      if (college && college !== "other" && college !== "") {
        // Check if college is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(college)) {
          collegeId = new mongoose.Types.ObjectId(college);
        }
      }

      const newUser = new User({
        username,
        email,
        phone: phone || "",
        password: hashedPassword,
        role: userRole,
        college: collegeId,
        customCollege: college === "other" ? customCollege || "" : "",
        address: address || "",
        district: district || "",
        state: state || "",
        country: country || "",
        gender: gender || "Other",
      });

      console.log("About to save user:", newUser);
      await newUser.save();
      console.log("User saved successfully");

      const token = jwt.sign(
        { id: newUser._id, role: newUser.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );
      res
        .status(201)
        .json({ token, user: { id: newUser._id, username, email } });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({
        message: "Something went wrong",
        error: err.message,
        details: err.errors ? Object.keys(err.errors) : null,
      });
    }
  }
);

// Change Password Route
router.post("/change-password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    // Validate the request
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// VERIFY EMAIL
router.post(
  "/verify-email",
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("code")
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage("Verification code must be 6 digits"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (user.emailVerificationExpires < new Date()) {
        return res
          .status(400)
          .json({ message: "Verification code has expired" });
      }

      // Verify the user
      user.isEmailVerified = true;
      user.emailVerificationCode = null;
      user.emailVerificationExpires = null;
      await user.save();

      // Generate token for immediate login
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.status(200).json({
        message: "Email verified successfully! You can now login.",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

// RESEND VERIFICATION CODE
router.post(
  "/resend-verification",
  [body("email").isEmail().withMessage("Invalid email format")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      const verificationCode = generateVerificationCode();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      user.emailVerificationCode = verificationCode;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      const emailResult = await sendVerificationEmail(
        email,
        verificationCode,
        user.username
      );

      if (emailResult.success) {
        res
          .status(200)
          .json({ message: "Verification code sent to your email" });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

// FORGOT PASSWORD
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Invalid email format")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.isEmailVerified) {
        return res
          .status(400)
          .json({ message: "Please verify your email first" });
      }

      const resetCode = generateVerificationCode();
      const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      user.passwordResetCode = resetCode;
      user.passwordResetExpires = resetExpires;
      await user.save();

      const emailResult = await sendPasswordResetEmail(
        email,
        resetCode,
        user.username
      );

      if (emailResult.success) {
        res
          .status(200)
          .json({ message: "Password reset code sent to your email" });
      } else {
        res
          .status(500)
          .json({ message: "Failed to send password reset email" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

// RESET PASSWORD
router.post(
  "/reset-password",
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("code")
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage("Reset code must be 6 digits"),
    body("newPassword")
      .isStrongPassword()
      .withMessage(
        "Password must include at least 1 uppercase, 1 lowercase, 1 number, and 1 special character"
      ),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code, newPassword } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.passwordResetCode || user.passwordResetCode !== code) {
        return res.status(400).json({ message: "Invalid reset code" });
      }

      if (user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "Reset code has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset code
      user.password = hashedPassword;
      user.passwordResetCode = null;
      user.passwordResetExpires = null;
      await user.save();

      res.status(200).json({
        message:
          "Password reset successfully! You can now login with your new password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

export default router;
