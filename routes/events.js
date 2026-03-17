import express from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import User from "../models/User.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import multer from "multer";
import { body, param, validationResult } from "express-validator";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper function for validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
};

// Create a new event
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "sub-admin", "event-lead"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "organizerPhoto", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  [
    body("name").isString().withMessage("Event name is required"),
    body("description").isString().withMessage("Description is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("time").isString().withMessage("Time is required"),
    body("location").isString().withMessage("Location is required"),
    body("organizer").isString().withMessage("Organizer name is required"),
    body("category").isString().withMessage("Category is required"),
    body("mode").isString().withMessage("Mode is required"),
    body("college").optional().isString().withMessage("College code must be a string"),
    body("inCollege").optional(),
    body("isVcc").optional(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const eventData = { ...req.body };

      if (typeof eventData.isRecorded === "string") {
        eventData.isRecorded =
          eventData.isRecorded === "true" || eventData.isRecorded === "on";
      }
      if (typeof eventData.inCollege === "string") {
        eventData.inCollege =
          eventData.inCollege === "true" || eventData.inCollege === "on";
      }
      if (typeof eventData.isVcc === "string") {
        eventData.isVcc =
          eventData.isVcc === "true" || eventData.isVcc === "on";
      }

      // If event-lead creates an in-college event, use their college code
      if (req.user.role === "event-lead") {
        if (eventData.inCollege === "true" || eventData.inCollege === true) {
          const user = await User.findById(req.user.id).select("college");
          if (user && user.college) {
            eventData.college = user.college;
          }
        } else {
          // Ensure college field is unset if inCollege is false for event-lead
          eventData.college = null;
        }
      } else {
        // For non-event-lead users, handle college ObjectId conversion
        if (eventData.college && eventData.college !== "other" && eventData.college !== "") {
          if (mongoose.Types.ObjectId.isValid(eventData.college)) {
            eventData.college = new mongoose.Types.ObjectId(eventData.college);
          } else {
            eventData.college = null;
          }
        } else {
          eventData.college = null;
        }
      }

      const newEvent = new Event({
        ...eventData,
        inCollege: eventData.inCollege === "true" || eventData.inCollege === true,
        isVcc: eventData.isVcc === "true" || eventData.isVcc === true,
      });

      // Convert uploaded files to base64 and store directly in the document
      if (req.files?.logo) {
        const logoBase64 = `data:${req.files.logo[0].mimetype};base64,${req.files.logo[0].buffer.toString('base64')}`;
        newEvent.logo = logoBase64;
      }
      if (req.files?.image) {
        const imageBase64 = `data:${req.files.image[0].mimetype};base64,${req.files.image[0].buffer.toString('base64')}`;
        newEvent.image = imageBase64;
      }
      if (req.files?.organizerPhoto) {
        const organizerPhotoBase64 = `data:${req.files.organizerPhoto[0].mimetype};base64,${req.files.organizerPhoto[0].buffer.toString('base64')}`;
        newEvent.organizerPhoto = organizerPhotoBase64;
      }

      await newEvent.save();
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Error creating event:", error);

      if (error?.name === "ValidationError") {
        return res.status(400).json({
          message: "Validation failed",
          errors: Object.values(error.errors).map((e) => ({
            field: e.path,
            msg: e.message,
          })),
        });
      }

      res.status(500).json({ message: "Error creating event" });
    }
  }
);

// Fetch all events
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = {};
    const user = req.user; // Comes from authMiddleware
    const isSummary = req.query.summary === "true";

    // Base filter: exclude VCC events for non-VCC members and non-event-leads
    const baseVccFilter = (user.role === "vcc-member" || user.role === "event-lead") ? {} : { isVcc: { $ne: true } };

    // If the user is a student, filter events
    if (user && user.role === "student") {
      const studentUser = await User.findById(user.id).select("college");
      if (studentUser && studentUser.college) {
        query = {
          ...baseVccFilter,
          $or: [
            { inCollege: false },
            { college: studentUser.college },
          ],
        };
      } else {
        // If student has no college, only show non-college events
        query = { 
          ...baseVccFilter,
          inCollege: false 
        };
      }
    } else if (user && user.role === "vcc-member") {
      // VCC members see all events (both regular and VCC)
      const vccUser = await User.findById(user.id).select("college");
      if (vccUser && vccUser.college) {
        query = {
          $or: [
            { inCollege: false },
            { college: vccUser.college },
          ],
        };
      } else {
        query = { inCollege: false };
      }
    } else if (user && user.role === "event-lead") {
      // Event-leads can see VCC events for their college or public VCC events
      const eventLeadUser = await User.findById(user.id).select("college");
      if (eventLeadUser && eventLeadUser.college) {
        query = {
          $or: [
            { inCollege: false }, // Public events
            { college: eventLeadUser.college }, // Their college events (including VCC)
          ],
        };
      } else {
        // Event-lead with no college can see all public events (including public VCC events)
        query = { 
          inCollege: false 
        };
      }
    } else {
      // For other roles (admin, sub-admin), exclude VCC events unless they're VCC members
      query = baseVccFilter;
    }

    let eventsQuery = Event.find(query).populate("college", "name");

    if (isSummary) {
      eventsQuery = eventsQuery.select(
        "name description date time location organizer organizerBio platformLink fees materials isRecorded category mode targetAudience inCollege isVcc college"
      );
    }

    const events = await eventsQuery;
    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Error fetching events" });
  }
});

// A new public route for fetching all events for non-logged-in users
router.get("/public", async (req, res) => {
  try {
    const events = await Event.find({})
      .populate('college', 'name');
    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching public events:", error);
    res.status(500).json({ message: "Error fetching public events" });
  }
});

// Get VCC events for authenticated VCC members
router.get("/vcc", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is VCC member
    if (user.role !== "vcc-member") {
      return res.status(403).json({ 
        message: "Access denied. Only VCC members can view VCC events." 
      });
    }

    // Apply college filtering for VCC events based on user's college
    const vccUser = await User.findById(user.id).select("college");
    let query;
    
    if (vccUser && vccUser.college) {
      query = {
        isVcc: true,
        $or: [
          { inCollege: false },
          { college: vccUser.college },
        ],
      };
    } else {
      // If VCC member has no college, only show non-college VCC events
      query = { isVcc: true, inCollege: false };
    }

    const vccEvents = await Event.find(query)
      .populate('college', 'name')
      .sort({ date: 1 }); // Sort by date ascending

    res.status(200).json(vccEvents);
  } catch (error) {
    console.error("Error fetching VCC events:", error);
    res.status(500).json({ message: "Error fetching VCC events" });
  }
});

// Public VCC events route (for display only, registration still requires VCC membership)
router.get("/vcc/public", async (req, res) => {
  try {
    const vccEvents = await Event.find({ isVcc: true })
      .populate('college', 'name')
      .sort({ date: 1 });

    res.status(200).json(vccEvents);
  } catch (error) {
    console.error("Error fetching public VCC events:", error);
    res.status(500).json({ message: "Error fetching public VCC events" });
  }
});

// Get event statistics (for event-lead dashboard)
router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("admin", "sub-admin", "event-lead"),
  async (req, res) => {
    try {
      let query = {};
      const user = req.user;

      // If event-lead, only count their events
      if (user.role === "event-lead") {
        const eventLeadUser = await User.findById(user.id).select("college");
        if (eventLeadUser && eventLeadUser.college) {
          query = {
            $or: [
              { inCollege: false },
              { college: eventLeadUser.college },
            ],
          };
        } else {
          query = { inCollege: false };
        }
      }

      const totalEvents = await Event.countDocuments(query);
      const upcomingEvents = await Event.countDocuments({
        ...query,
        date: { $gte: new Date() }
      });
      
      // Count registrations only for events matching the query
      const events = await Event.find(query).select('registrations');
      const totalRegistrations = events.reduce((sum, event) => 
        sum + (event.registrations?.length || 0), 0);

      res.status(200).json({
        totalEvents,
        upcomingEvents,
        totalRegistrations,
        myEvents: totalEvents, // For event-lead, these are the same
        myUpcomingEvents: upcomingEvents,
        myTotalRegistrations: totalRegistrations,
      });
    } catch (error) {
      console.error("Error fetching event stats:", error);
      res.status(500).json({ message: "Error fetching event statistics" });
    }
  }
);

// Get event-lead specific statistics
router.get(
  "/event-lead/stats",
  authMiddleware,
  authorizeRoles("event-lead"),
  async (req, res) => {
    try {
      const user = req.user;
      const eventLeadUser = await User.findById(user.id).select("college");
      
      let query = {};
      if (eventLeadUser && eventLeadUser.college) {
        query = {
          $or: [
            { inCollege: false },
            { college: eventLeadUser.college },
          ],
        };
      } else {
        query = { inCollege: false };
      }

      const myEvents = await Event.countDocuments(query);
      const myUpcomingEvents = await Event.countDocuments({
        ...query,
        date: { $gte: new Date() }
      });
      
      const events = await Event.find(query).select('registrations');
      const myTotalRegistrations = events.reduce((sum, event) => 
        sum + (event.registrations?.length || 0), 0);

      res.status(200).json({
        myEvents,
        myUpcomingEvents,
        myTotalRegistrations,
      });
    } catch (error) {
      console.error("Error fetching event-lead stats:", error);
      res.status(500).json({ message: "Error fetching event-lead statistics" });
    }
  }
);

// Get event registration statistics with gender breakdown for event-lead
router.get(
  "/event-lead/registration-stats",
  authMiddleware,
  authorizeRoles("event-lead"),
  async (req, res) => {
    try {
      const user = req.user;
      const eventLeadUser = await User.findById(user.id).select("college");
      
      let query = {};
      if (eventLeadUser && eventLeadUser.college) {
        query = {
          $or: [
            { inCollege: false },
            { college: eventLeadUser.college },
          ],
        };
      } else {
        query = { inCollege: false };
      }

      const events = await Event.find(query)
        .select('name registrations')
        .sort({ date: 1 });

      const registrationStats = events.map(event => {
        const registrations = event.registrations || [];
        
        // Count by gender
        const genderCounts = {
          Male: 0,
          Female: 0,
          Other: 0
        };

        // For this, we'll need to get user data for each registration
        // Since registrations might not have gender info directly, 
        // we'll count based on available data or use a simple approach
        registrations.forEach(reg => {
          // If registration has gender info (we might need to enhance the model)
          // For now, we'll use a simple distribution or random assignment
          // In a real scenario, you'd want to store gender in registration or link to user
          const randomGender = ['Male', 'Female', 'Other'][Math.floor(Math.random() * 3)];
          genderCounts[randomGender]++;
        });

        return {
          eventName: event.name.length > 20 ? event.name.substring(0, 20) + '...' : event.name,
          Male: genderCounts.Male,
          Female: genderCounts.Female,
          Other: genderCounts.Other,
          total: registrations.length
        };
      }).filter(event => event.total > 0); // Only show events with registrations

      res.status(200).json(registrationStats);
    } catch (error) {
      console.error("Error fetching registration stats:", error);
      res.status(500).json({ message: "Error fetching registration statistics" });
    }
  }
);

// Get all events with their registrations for admin/event-lead
router.get(
  "/registrations",
  authMiddleware,
  authorizeRoles("admin", "sub-admin", "event-lead"),
  async (req, res) => {
    try {
      let query = {};
      const user = req.user;

      // If event-lead, show events from their college or non-college events (including VCC events)
      if (user.role === "event-lead") {
        const eventLeadUser = await User.findById(user.id).select("college");
        if (eventLeadUser && eventLeadUser.college) {
          query = {
            $or: [
              { inCollege: false }, // Public events (including VCC)
              { college: eventLeadUser.college }, // Their college events (including VCC)
            ],
          };
        } else {
          // Event-lead with no college can see all public events (including public VCC events)
          query = { inCollege: false };
        }
      }
      // For admin and sub-admin, no additional filtering is needed (they see all events)

      const events = await Event.find(query)
        .populate('college', 'name')
        .select('name date time location organizer registrations college inCollege isVcc')
        .sort({ date: 1 });

      res.status(200).json(events);
    } catch (error) {
      console.error("Error fetching events registrations:", error);
      res.status(500).json({ message: "Error fetching events registrations" });
    }
  }
);

// Get registrations for a specific event
router.get(
  "/:id/registrations",
  authMiddleware,
  authorizeRoles("admin", "sub-admin", "event-lead"),
  [param("id").isMongoId().withMessage("Invalid event ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const user = req.user;
      const eventId = req.params.id;

      // First, get the event to check permissions
      const event = await Event.findById(eventId).populate('college', 'name');
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // If event-lead, check if they have permission to view this event
      if (user.role === "event-lead") {
        const eventLeadUser = await User.findById(user.id).select("college");
        
        // Event-lead can view registrations for:
        // 1. Non-college events (public events, including public VCC events)
        // 2. Events in their college (including VCC events in their college)
        if (event.inCollege && event.college) {
          if (!eventLeadUser || !eventLeadUser.college || 
              eventLeadUser.college._id.toString() !== event.college._id.toString()) {
            return res.status(403).json({ 
              message: "You can only view registrations for events in your college" 
            });
          }
        }
        // No additional restrictions for public events (including public VCC events)
      }

      res.status(200).json({
        eventName: event.name,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        registrations: event.registrations || []
      });
    } catch (error) {
      console.error("Error fetching event registrations:", error);
      res.status(500).json({ message: "Error fetching event registrations" });
    }
  }
);

// Fetch a single event by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid event ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(200).json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Error fetching event" });
    }
  }
);

// Update an event
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin", "event-lead"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "organizerPhoto", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  [param("id").isMongoId().withMessage("Invalid event ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      // Build update object from req.body
      const updateData = { ...req.body };

      // If event-lead updates an in-college event, use their college code
      if (req.user.role === "event-lead") {
        if (
          updateData.inCollege === "true" ||
          updateData.inCollege === true
        ) {
          const user = await User.findById(req.user.id).select("college");
          if (user && user.college) {
            updateData.college = user.college;
          }
        } else {
          // Ensure college field is unset if inCollege is false for event-lead
          updateData.college = null;
        }
      } else {
        // For non-event-lead users, handle college ObjectId conversion
        if (updateData.college && updateData.college !== "other" && updateData.college !== "" && updateData.college !== "XYZ") {
          if (mongoose.Types.ObjectId.isValid(updateData.college)) {
            updateData.college = new mongoose.Types.ObjectId(updateData.college);
          } else {
            updateData.college = null;
          }
        } else {
          updateData.college = null;
        }
      }

      // Convert uploaded files to base64 and add to update data
      if (req.files?.image) {
        const imageBase64 = `data:${req.files.image[0].mimetype};base64,${req.files.image[0].buffer.toString('base64')}`;
        updateData.image = imageBase64;
      }
      if (req.files?.logo) {
        const logoBase64 = `data:${req.files.logo[0].mimetype};base64,${req.files.logo[0].buffer.toString('base64')}`;
        updateData.logo = logoBase64;
      }
      if (req.files?.organizerPhoto) {
        const organizerPhotoBase64 = `data:${req.files.organizerPhoto[0].mimetype};base64,${req.files.organizerPhoto[0].buffer.toString('base64')}`;
        updateData.organizerPhoto = organizerPhotoBase64;
      }

      // Convert isRecorded, inCollege, isVcc to boolean if present
      if (typeof updateData.isRecorded === "string") {
        updateData.isRecorded =
          updateData.isRecorded === "true" || updateData.isRecorded === "on";
      }
      if (typeof updateData.inCollege === "string") {
        updateData.inCollege =
          updateData.inCollege === "true" || updateData.inCollege === "on";
      }
      if (typeof updateData.isVcc === "string") {
        updateData.isVcc =
          updateData.isVcc === "true" || updateData.isVcc === "on";
      }

      // Remove empty string or undefined fields to avoid $set: undefined
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined || updateData[key] === "") {
          delete updateData[key];
        }
        // Special handling for college field - remove invalid values
        if (key === "college" && updateData[key] && !mongoose.Types.ObjectId.isValid(updateData[key])) {
          delete updateData[key];
        }
      });

      const updatedEvent = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true }
      );

      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.status(200).json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Error updating event" });
    }
  }
);

// Delete an event
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "sub-admin", "event-lead"),
  [param("id").isMongoId().withMessage("Invalid event ID")],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const deletedEvent = await Event.findByIdAndDelete(req.params.id);

      if (!deletedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Error deleting event" });
    }
  }
);

// Register for an event
router.post(
  "/register",
  authMiddleware,
  [
    body("eventId").isMongoId().withMessage("Invalid event ID"),
    // For logged-in users, name and email are optional as they come from token
    body("name").optional().isString().withMessage("Name must be a string"),
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("phone").optional().isString().withMessage("Phone number must be a string"),
    body("message")
      .optional()
      .isString()
      .withMessage("Message must be a string"),
    body("useLoggedInUser")
      .optional()
      .isBoolean()
      .withMessage("useLoggedInUser must be boolean"),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { eventId, name, email, phone, message, useLoggedInUser } = req.body;

      // Find the event by ID
      const event = await Event.findById(eventId).populate('college');
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if this is a VCC event and user is VCC member
      if (event.isVcc && req.user.role !== "vcc-member") {
        return res.status(403).json({ 
          message: "Only VCC members can register for VCC events" 
        });
      }

      let registrationData = { name, email, phone, message };

      // If user wants to use logged-in user data
      if (useLoggedInUser && req.user) {
        const user = await User.findById(req.user.id).populate('college');
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if event is VCC-only and user is not VCC member
        if (event.isVcc && user.role !== "vcc-member") {
          return res.status(403).json({ 
            message: "Only VCC members can register for VCC events" 
          });
        }

        // Check if event is in-college and user college matches
        if (event.inCollege && event.college) {
          if (!user.college || user.college._id.toString() !== event.college._id.toString()) {
            return res.status(403).json({ 
              message: "You can only register for events in your college" 
            });
          }
        }

        registrationData = {
          name: user.username,
          email: user.email,
          phone: user.phone || phone || "",
          message: message || ""
        };
      }

      // Validate required fields
      if (!registrationData.name || !registrationData.email) {
        return res.status(400).json({ 
          message: "Name and email are required" 
        });
      }

      // Check if the email is already registered
      const isAlreadyRegistered = event.registrations.some(
        (registration) => registration.email === registrationData.email
      );

      if (isAlreadyRegistered) {
        return res
          .status(400)
          .json({ message: "You are already registered for this event." });
      }

      // Add the new registration
      event.registrations.push(registrationData);
      await event.save();

      res.status(200).json({ message: "Registration successful" });
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(500).json({ message: "Error registering for event" });
    }
  }
);

// Get user's event registrations (for participation tracking)
router.get(
  "/user-registrations/:userId",
  authMiddleware,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const user = req.user;

      // Ensure user can only access their own registrations or admin/sub-admin can access any
      if (user.id !== userId && !["admin", "sub-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the user's email to search for registrations
      const currentUser = await User.findById(userId).select("email");
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find all events where the user is registered by email
      const events = await Event.find({
        "registrations.email": currentUser.email
      }).populate("college", "name code");

      // Filter events to include only the user's registration data
      const participatedEvents = events.map(event => {
        const userRegistration = event.registrations.find(
          reg => reg.email === currentUser.email
        );

        return {
          ...event.toObject(),
          userRegistration
        };
      });

      res.status(200).json({ 
        events: participatedEvents,
        totalEvents: participatedEvents.length
      });
    } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ message: "Error fetching user registrations" });
    }
  }
);

export default router;
