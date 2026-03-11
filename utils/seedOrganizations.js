import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import "../config.js";

const featuredOrgs = [
  {
    name: "TechMinds Club",
    domain: "Tech",
    region: "Maharashtra",
    description:
      "Fostering innovation and technical excellence through workshops and hackathons.",
    social: {
      instagram: "techminds",
      linkedin: "techminds-club",
      youtube: "techminds",
    },
    eventsHosted: 25,
    verified: true,
    featured: true,
    newlyJoined: false,
    contactEmail: "techminds@example.com",
    contactPhone: "9999999999",
    logo: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg",
    registerAs: "organization",
  },
  {
    name: "Cultural Connect",
    domain: "Cultural",
    region: "Karnataka",
    description:
      "Celebrating diversity and promoting cultural exchange through events and performances.",
    social: {
      instagram: "culturalconnect",
      linkedin: "cultural-connect",
      youtube: "culturalconnect",
    },
    eventsHosted: 18,
    verified: true,
    featured: true,
    newlyJoined: false,
    contactEmail: "culturalconnect@example.com",
    contactPhone: "8888888888",
    logo: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg",
    registerAs: "organization",
  },
  {
    name: "Social Impact Hub",
    domain: "Social",
    region: "Delhi",
    description:
      "Driving positive change through community service and social initiatives.",
    social: {
      instagram: "socialimpacthub",
      linkedin: "social-impact-hub",
      youtube: "socialimpacthub",
    },
    eventsHosted: 15,
    verified: false,
    featured: true,
    newlyJoined: false,
    contactEmail: "socialimpacthub@example.com",
    contactPhone: "7777777777",
    logo: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
    registerAs: "organization",
  },
];

const newlyJoined = [
  {
    name: "Entrepreneurship Cell",
    domain: "Entrepreneurship",
    region: "Maharashtra",
    description:
      "Nurturing the next generation of business leaders and innovators.",
    social: {
      instagram: "ecell",
      linkedin: "entrepreneurship-cell",
      youtube: "ecell",
    },
    eventsHosted: 5,
    verified: false,
    featured: false,
    newlyJoined: true,
    contactEmail: "ecell@example.com",
    contactPhone: "6666666666",
    logo: "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg",
    registerAs: "organization",
  },
  {
    name: "Design Club",
    domain: "Tech",
    region: "Tamil Nadu",
    description: "Exploring creativity through UI/UX design and digital arts.",
    social: {
      instagram: "designclub",
      linkedin: "design-club",
      youtube: "designclub",
    },
    eventsHosted: 3,
    verified: false,
    featured: false,
    newlyJoined: true,
    contactEmail: "designclub@example.com",
    contactPhone: "5555555555",
    logo: "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg",
    registerAs: "organization",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Organization.deleteMany({});
  await Organization.insertMany([...featuredOrgs, ...newlyJoined]);
  console.log("Seeded organizations!");
  mongoose.disconnect();
}

seed();
