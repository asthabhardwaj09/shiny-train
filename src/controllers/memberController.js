import bcrypt from "bcryptjs";
import Member from "../models/Member.js";

import Trainer from "../models/Trainer.js";

const MEMBER_PLANS = {
  BASIC: {
    price: 5000,
    durationMonths: 1,
  },

  STANDARD: {
    price: 10000,
    durationMonths: 3,
  },

  PREMIUM: {
    price: 15000,
    durationMonths: 6,
  },
};

const addMember = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only gym owners can add clients",
      });
    }

    const {
      clientId,
      fullName,
      phone,
      email,
      password,
      trainerId,
      membershipPlan,
      startDate,
    } = req.body;

    if (
      !clientId ||
      !fullName ||
      !phone ||
      !email ||
      !password ||
      !trainerId ||
      !membershipPlan ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Client ID must be unique
    const existingClient = await Member.findOne({
      clientId: clientId.trim(),
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: "Client ID already exists",
      });
    }

    // Trainer must exist inside owner's gym
    const trainer = await Trainer.findOne({
      trainerId: trainerId.trim(),
      gymId: req.user.gymId,
      status: "ACTIVE",
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Active trainer not found in this gym",
      });
    }

    const planDurations = {
      BASIC: 1,
      STANDARD: 3,
      PREMIUM: 6,
    };

    const normalizedPlan = membershipPlan.toUpperCase();

    if (!planDurations[normalizedPlan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership plan",
      });
    }

    const membershipStartDate = new Date(startDate);

    if (Number.isNaN(membershipStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date",
      });
    }

    const endDate = new Date(membershipStartDate);

    endDate.setMonth(
      endDate.getMonth() + planDurations[normalizedPlan]
    );

    const hashedPassword = await bcrypt.hash(password, 10);

    const member = await Member.create({
      clientId: clientId.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),

      // Automatically taken from Owner JWT
      gymId: req.user.gymId,

      // Selected by owner
      trainerId: trainer.trainerId,

      password: hashedPassword,

      membershipPlan: normalizedPlan,
      planName: `${normalizedPlan} Plan`,

      startDate: membershipStartDate,
      endDate,

      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Client added and assigned to trainer successfully",
      data: {
        client: {
          id: member._id,
          clientId: member.clientId,
          fullName: member.fullName,
          phone: member.phone,
          email: member.email,
          gymId: member.gymId,

          trainer: {
            trainerId: trainer.trainerId,
            fullName: trainer.fullName,
          },

          membershipPlan: member.membershipPlan,
          startDate: member.startDate,
          endDate: member.endDate,
          status: member.status,
        },
      },
    });
  } catch (error) {
    console.error("Add member error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Client ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMembers = async (req, res) => {
  try {
    // Only owners can view members
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only gym owners can view members",
      });
    }

    // Get only members belonging to the logged-in owner's gym
    const members = await Member.find({
      gymId: req.user.gymId,
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",
      data: {
        members,
      },
    });
  } catch (error) {
    console.error("Get members error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { addMember, getMembers };