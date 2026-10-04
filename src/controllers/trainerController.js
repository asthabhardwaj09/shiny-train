import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Trainer from "../models/Trainer.js";
import Member from "../models/Member.js";

// ======================================================
// ADD TRAINER - OWNER ONLY
// ======================================================

const addTrainer = async (req, res) => {
  try {
    // Only owners can add trainers
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only gym owners can add trainers",
      });
    }

    const {
      trainerId,
      fullName,
      phone,
      email,
      password,
      specialization,
      experience,
    } = req.body;

    // Required fields
    if (
      !trainerId ||
      !fullName ||
      !phone ||
      !email ||
      !password ||
      !specialization ||
      experience === undefined ||
      experience === null ||
      experience === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Validate experience
    const trainerExperience = Number(experience);

    if (
      Number.isNaN(trainerExperience) ||
      trainerExperience < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Experience must be a valid non-negative number",
      });
    }

    // Trainer ID must be unique
    const existingTrainerId = await Trainer.findOne({
      trainerId: trainerId.trim(),
    });

    if (existingTrainerId) {
      return res.status(409).json({
        success: false,
        message: "Trainer ID already exists",
      });
    }

    // Check duplicate email inside this gym
    const existingTrainerEmail = await Trainer.findOne({
      gymId: req.user.gymId,
      email: email.toLowerCase().trim(),
    });

    if (existingTrainerEmail) {
      return res.status(409).json({
        success: false,
        message: "A trainer with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create trainer
    const trainer = await Trainer.create({
      trainerId: trainerId.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      gymId: req.user.gymId,
      password: hashedPassword,
      specialization: specialization.trim(),
      experience: trainerExperience,
    });

    return res.status(201).json({
      success: true,
      message: "Trainer added successfully",
      data: {
        trainer: {
          id: trainer._id,
          trainerId: trainer.trainerId,
          fullName: trainer.fullName,
          phone: trainer.phone,
          email: trainer.email,
          gymId: trainer.gymId,
          specialization: trainer.specialization,
          experience: trainer.experience,
          status: trainer.status,
        },
      },
    });
  } catch (error) {
    console.error("Add trainer error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Trainer ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// GET TRAINERS - OWNER ONLY
// ======================================================

const getTrainers = async (req, res) => {
  try {
    // Only owners can view trainers
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only gym owners can view trainers",
      });
    }

    // Only trainers belonging to owner's gym
    const trainers = await Trainer.find({
      gymId: req.user.gymId,
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Trainers fetched successfully",
      data: {
        trainers,
      },
    });
  } catch (error) {
    console.error("Get trainers error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// TRAINER LOGIN
// ======================================================

const loginTrainer = async (req, res) => {
  try {
    const { trainerId, password } = req.body;

    if (!trainerId || !password) {
      return res.status(400).json({
        success: false,
        message: "Trainer ID and password are required",
      });
    }

    const trainer = await Trainer.findOne({
      trainerId: trainerId.trim(),
    });

    if (!trainer) {
      return res.status(401).json({
        success: false,
        message: "Invalid Trainer ID or password",
      });
    }

    if (trainer.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Trainer account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      trainer.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid Trainer ID or password",
      });
    }

    const token = jwt.sign(
      {
        trainerId: trainer.trainerId,
        gymId: trainer.gymId,
        role: "TRAINER",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Trainer login successful",
      data: {
        token,

        trainer: {
          id: trainer._id,
          trainerId: trainer.trainerId,
          fullName: trainer.fullName,
          phone: trainer.phone,
          email: trainer.email,
          gymId: trainer.gymId,
          specialization: trainer.specialization,
          experience: trainer.experience,
          status: trainer.status,
        },
      },
    });
  } catch (error) {
    console.error("Trainer login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// GET CLIENTS ASSIGNED TO LOGGED-IN TRAINER
// ======================================================

const getTrainerClients = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can view assigned clients",
      });
    }

    const {
      search = "",
      status = "ALL",
    } = req.query;

    const now = new Date();

    // Automatically expire memberships
    await Member.updateMany(
      {
        trainerId: req.user.trainerId,
        gymId: req.user.gymId,
        endDate: { $lt: now },
        status: "ACTIVE",
      },
      {
        $set: {
          status: "EXPIRED",
        },
      }
    );

    const query = {
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    };

    const normalizedStatus = status.toUpperCase();

    // ACTIVE filter
    if (normalizedStatus === "ACTIVE") {
      query.status = "ACTIVE";
    }

    // EXPIRED filter
    if (normalizedStatus === "EXPIRED") {
      query.status = "EXPIRED";
    }

    // EXPIRING filter
    if (normalizedStatus === "EXPIRING") {
      const sevenDaysLater = new Date(now);

      sevenDaysLater.setDate(
        sevenDaysLater.getDate() + 7
      );

      query.status = "ACTIVE";

      query.endDate = {
        $gte: now,
        $lte: sevenDaysLater,
      };
    }

    // Search
    if (search.trim()) {
      const searchValue = search.trim();

      query.$or = [
        {
          fullName: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          clientId: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          email: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          membershipPlan: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          planName: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    const clients = await Member.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    // Get all assigned clients for overview
    const allClients = await Member.find({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    }).select("status endDate");

    const sevenDaysLater = new Date(now);

    sevenDaysLater.setDate(
      sevenDaysLater.getDate() + 7
    );

    const active = allClients.filter(
      (client) => client.status === "ACTIVE"
    ).length;

    const expired = allClients.filter(
      (client) => client.status === "EXPIRED"
    ).length;

    const expiring = allClients.filter(
      (client) =>
        client.status === "ACTIVE" &&
        client.endDate >= now &&
        client.endDate <= sevenDaysLater
    ).length;

    return res.status(200).json({
      success: true,
      message: "Assigned clients fetched successfully",

      data: {
        overview: {
          total: allClients.length,
          active,
          expiring,
          expired,
        },

        clients,
      },
    });
  } catch (error) {
    console.error("Get trainer clients error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getTrainerById = async (req, res) => {
  try {
    // Only owner can view trainer details
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only gym owners can view trainer details",
      });
    }

    const { trainerId } = req.params;

    // Trainer must belong to logged-in owner's gym
    const trainer = await Trainer.findOne({
      trainerId: trainerId.trim(),
      gymId: req.user.gymId,
    }).select("-password");

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    // Get members assigned to this trainer
    const assignedMembers = await Member.find({
      trainerId: trainer.trainerId,
      gymId: req.user.gymId,
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Trainer details fetched successfully",
      data: {
        trainer: {
          id: trainer._id,
          trainerId: trainer.trainerId,
          fullName: trainer.fullName,
          phone: trainer.phone,
          email: trainer.email,
          specialization: trainer.specialization,
          experience: trainer.experience,
          status: trainer.status,
          assignedMembersCount: assignedMembers.length,
        },

        assignedMembers,
      },
    });
  } catch (error) {
    console.error("Get trainer details error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const assignMemberToTrainer = async (req, res) => {
  try {
    // Owner only
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only gym owners can assign members to trainers",
      });
    }

    const { trainerId, clientId } = req.params;

    // Trainer must belong to owner's gym and be active
    const trainer = await Trainer.findOne({
      trainerId: trainerId.trim(),
      gymId: req.user.gymId,
      status: "ACTIVE",
    }).select("-password");

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Active trainer not found in this gym",
      });
    }

    // Member must belong to owner's gym
    const member = await Member.findOne({
      clientId: clientId.trim(),
      gymId: req.user.gymId,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this gym",
      });
    }

    // Already assigned to same trainer
    if (member.trainerId === trainer.trainerId) {
      return res.status(200).json({
        success: true,
        message: "Member is already assigned to this trainer",
        data: {
          member: {
            clientId: member.clientId,
            fullName: member.fullName,
            trainerId: member.trainerId,
          },
        },
      });
    }

    // Assign / reassign
    member.trainerId = trainer.trainerId;
    await member.save();

    return res.status(200).json({
      success: true,
      message: "Member assigned to trainer successfully",
      data: {
        member: {
          clientId: member.clientId,
          fullName: member.fullName,
          trainerId: member.trainerId,
        },
        trainer: {
          trainerId: trainer.trainerId,
          fullName: trainer.fullName,
        },
      },
    });
  } catch (error) {
    console.error("Assign member to trainer error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteTrainer = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only gym owners can delete trainers",
      });
    }

    const { trainerId } = req.params;

    const trainer = await Trainer.findOne({
      trainerId: trainerId.trim(),
      gymId: req.user.gymId,
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    // Do not delete trainer while members are still assigned
    const assignedMembersCount = await Member.countDocuments({
      trainerId: trainer.trainerId,
      gymId: req.user.gymId,
    });

    if (assignedMembersCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete trainer while members are assigned. Reassign the members first.",
        data: {
          assignedMembersCount,
        },
      });
    }

    await Trainer.deleteOne({
      _id: trainer._id,
    });

    return res.status(200).json({
      success: true,
      message: "Trainer deleted successfully",
    });
  } catch (error) {
    console.error("Delete trainer error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  addTrainer,
  getTrainers,
  loginTrainer,
  getTrainerClients,
  getTrainerById,
  assignMemberToTrainer,
  deleteTrainer,
};