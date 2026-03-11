import express from "express";
import User from "../models/User.js";
import Event from "../models/Event.js";
import College from "../models/College.js";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Get admin overview statistics
router.get(
  "/overview",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      // Get total colleges
      const totalColleges = await College.countDocuments();
      
      // Get total events
      const totalEvents = await Event.countDocuments();
      
      // Get total students and VCC members
      const totalStudents = await User.countDocuments({ role: "student" });
      const totalVccMembers = await User.countDocuments({ role: "vcc-member" });

      res.status(200).json({
        totalColleges,
        totalEvents,
        totalStudents,
        totalVccMembers,
      });
    } catch (error) {
      console.error("Error fetching admin overview:", error);
      res.status(500).json({ message: "Error fetching admin overview" });
    }
  }
);

// Get districts with user counts
router.get(
  "/districts",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const districts = await User.aggregate([
        {
          $match: {
            district: { $exists: true, $ne: "" },
            role: { $in: ["student", "vcc-member"] }
          }
        },
        {
          $group: {
            _id: "$district",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            name: "$_id",
            count: 1,
            _id: 0
          }
        },
        {
          $sort: { name: 1 }
        }
      ]);

      res.status(200).json(districts);
    } catch (error) {
      console.error("Error fetching districts:", error);
      res.status(500).json({ message: "Error fetching districts" });
    }
  }
);

// Get gender statistics with optional filters
router.get(
  "/gender-stats",
  authMiddleware,
  authorizeRoles("admin", "sub-admin"),
  async (req, res) => {
    try {
      const { district, college } = req.query;
      let matchCondition = {
        role: { $in: ["student", "vcc-member"] }
      };

      // Add filters if provided
      if (district) {
        matchCondition.district = district;
      }
      if (college) {
        matchCondition.college = college;
      }

      if (district) {
        // Group by district
      } else if (college) {
        // Group by college and populate college name
        const genderStats = await User.aggregate([
          { $match: matchCondition },
          {
            $lookup: {
              from: "colleges",
              localField: "college",
              foreignField: "_id",
              as: "collegeInfo"
            }
          },
          {
            $group: {
              _id: {
                college: "$college",
                gender: "$gender"
              },
              count: { $sum: 1 },
              collegeName: { $first: { $arrayElemAt: ["$collegeInfo.name", 0] } }
            }
          },
          {
            $group: {
              _id: "$_id.college",
              name: { $first: "$collegeName" },
              genders: {
                $push: {
                  gender: "$_id.gender",
                  count: "$count"
                }
              }
            }
          }
        ]);

        // Transform data for chart
        const chartData = genderStats.map(college => {
          const genderCounts = { Male: 0, Female: 0, Other: 0 };
          college.genders.forEach(g => {
            genderCounts[g.gender] = g.count;
          });
          return {
            name: college.name || "Unknown College",
            ...genderCounts
          };
        });

        return res.status(200).json(chartData);
      } else {
        // Overall gender distribution
        const genderStats = await User.aggregate([
          { $match: matchCondition },
          {
            $group: {
              _id: "$gender",
              count: { $sum: 1 }
            }
          }
        ]);

        const chartData = [{
          name: "Overall",
          Male: 0,
          Female: 0,
          Other: 0
        }];

        genderStats.forEach(stat => {
          chartData[0][stat._id] = stat.count;
        });

        return res.status(200).json(chartData);
      }

      // For district filter
      if (district) {
        const genderStats = await User.aggregate([
          { $match: matchCondition },
          {
            $group: {
              _id: {
                district: "$district",
                gender: "$gender"
              },
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: "$_id.district",
              genders: {
                $push: {
                  gender: "$_id.gender",
                  count: "$count"
                }
              }
            }
          }
        ]);

        const chartData = genderStats.map(districtData => {
          const genderCounts = { Male: 0, Female: 0, Other: 0 };
          districtData.genders.forEach(g => {
            genderCounts[g.gender] = g.count;
          });
          return {
            name: districtData._id,
            ...genderCounts
          };
        });

        res.status(200).json(chartData);
      }
    } catch (error) {
      console.error("Error fetching gender stats:", error);
      res.status(500).json({ message: "Error fetching gender statistics" });
    }
  }
);

export default router;
