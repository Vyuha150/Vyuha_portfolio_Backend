import express from "express";
import Organization from "../models/Organization.js";
import { body, validationResult, param, query } from "express-validator";
import multer from "multer";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer config for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// GET /api/partnerships/organizations?search=&domain=&region=&featured=&newlyJoined=
router.get(
  "/organizations",
  [
    query("search").optional().isString(),
    query("domain").optional().isString(),
    query("region").optional().isString(),
    query("featured").optional().isBoolean(),
    query("newlyJoined").optional().isBoolean(),
  ],
  async (req, res) => {
    let filter = {};
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }
    if (req.query.domain) filter.domain = req.query.domain;
    if (req.query.region) filter.region = req.query.region;
    if (req.query.featured) filter.featured = req.query.featured === "true";
    if (req.query.newlyJoined)
      filter.newlyJoined = req.query.newlyJoined === "true";
    try {
      const orgs = await Organization.find(filter);
      res.json(orgs);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching organizations", error: err });
    }
  }
);

// GET /api/partnerships/organizations/:id
router.get(
  "/organizations/:id",
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const org = await Organization.findById(req.params.id);
      if (!org)
        return res.status(404).json({ message: "Organization not found" });
      res.json(org);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching organization", error: err });
    }
  }
);

// POST /api/partnerships/organizations (register new org)
router.post(
  "/organizations",
  upload.single("logo"),
  [
    body("name").isString().notEmpty(),
    body("contactEmail").isEmail(),
    body("contactPhone").isString().notEmpty(),
    body("domain").isString().notEmpty(),
    body("region").isString().notEmpty(),
    body("description").isString().notEmpty(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      // Reconstruct social object from FormData
      const social = {};
      if (req.body["social[instagram]"])
        social.instagram = req.body["social[instagram]"];
      if (req.body["social[linkedin]"])
        social.linkedin = req.body["social[linkedin]"];
      if (req.body["social[youtube]"])
        social.youtube = req.body["social[youtube]"];

      const org = new Organization({
        registerAs: "organization",
        name: req.body.name,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        domain: req.body.domain,
        region: req.body.region,
        description: req.body.description,
        logo: req.file ? req.file.path : null,
        social: social,
        eventsHosted: req.body.eventsHosted || 0,
        verified: false,
        featured: false,
        newlyJoined: true,
      });
      await org.save();
      res.status(201).json({ message: "Organization registered", org });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error registering organization", error: err });
    }
  }
);

// PATCH /api/partnerships/organizations/:id/verify
router.patch(
  "/organizations/:id/verify",
  [param("id").isMongoId()],
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const org = await Organization.findByIdAndUpdate(
        req.params.id,
        { verified: true },
        { new: true }
      );
      if (!org)
        return res.status(404).json({ message: "Organization not found" });
      res.json(org);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error verifying organization", error: err });
    }
  }
);

// PATCH /api/partnerships/organizations/:id/feature
router.patch(
  "/organizations/:id/feature",
  [param("id").isMongoId()],
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const org = await Organization.findByIdAndUpdate(
        req.params.id,
        { featured: true },
        { new: true }
      );
      if (!org)
        return res.status(404).json({ message: "Organization not found" });
      res.json(org);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error featuring organization", error: err });
    }
  }
);

// PATCH /api/partnerships/organizations/:id/newlyJoined
router.patch(
  "/organizations/:id/newlyJoined",
  [param("id").isMongoId()],
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const org = await Organization.findByIdAndUpdate(
        req.params.id,
        { newlyJoined: true },
        { new: true }
      );
      if (!org)
        return res.status(404).json({ message: "Organization not found" });
      res.json(org);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating organization", error: err });
    }
  }
);

// POST /api/partnerships/organizations/invite
router.post(
  "/organizations/invite",
  [
    body("name").isString().notEmpty(),
    body("phone").isString().notEmpty(),
    body("email").isEmail(),
    body("message").optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    // You can store invites in DB or send email here
    // For now, just return success
    res.status(201).json({ message: "Invitation sent!" });
  }
);

// DELETE /api/partnerships/organizations/:id
router.delete(
  "/organizations/:id",
  [param("id").isMongoId()],
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const org = await Organization.findByIdAndDelete(req.params.id);
      if (!org)
        return res.status(404).json({ message: "Organization not found" });
      res.json({ message: "Organization deleted" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error deleting organization", error: err });
    }
  }
);

export default router;
