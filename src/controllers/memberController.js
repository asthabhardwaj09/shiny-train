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

    // trainerId is optional
    if (
      !clientId ||
      !fullName ||
      !phone ||
      !email ||
      !password ||
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

    // Trainer is optional
    let trainer = null;

    // If owner selected a trainer, validate it
    if (trainerId && trainerId.trim()) {
      trainer = await Trainer.findOne({
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

      // null when no trainer is selected
      trainerId: trainer ? trainer.trainerId : null,

      password: hashedPassword,

      membershipPlan: normalizedPlan,
      planName: `${normalizedPlan} Plan`,

      startDate: membershipStartDate,
      endDate,

      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: trainer
        ? "Client added and assigned to trainer successfully"
        : "Client added successfully without trainer assignment",

      data: {
        client: {
          id: member._id,
          clientId: member.clientId,
          fullName: member.fullName,
          phone: member.phone,
          email: member.email,
          gymId: member.gymId,

          trainer: trainer
            ? {
              trainerId: trainer.trainerId,
              fullName: trainer.fullName,
            }
            : null,

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

    const {
      search = "",
      status = "ALL",
    } = req.query;

    const now = new Date();

    // Automatically expire memberships whose end date has passed
    await Member.updateMany(
      {
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
      gymId: req.user.gymId,
    };

    const normalizedStatus = status.toUpperCase();

    // Validate status filter
    if (
      !["ALL", "ACTIVE", "EXPIRING", "EXPIRED"].includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid member status filter",
      });
    }

    // ACTIVE
    if (normalizedStatus === "ACTIVE") {
      query.status = "ACTIVE";
    }

    // EXPIRED
    if (normalizedStatus === "EXPIRED") {
      query.status = "EXPIRED";
    }

    // EXPIRING within next 7 days
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

    // Search by name, client ID, phone, email or plan
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
          phone: {
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

    // Members according to search/filter
    const members = await Member.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    // All members are needed for overview counts
    const allMembers = await Member.find({
      gymId: req.user.gymId,
    }).select("status endDate");

    const sevenDaysLater = new Date(now);

    sevenDaysLater.setDate(
      sevenDaysLater.getDate() + 7
    );

    const active = allMembers.filter(
      (member) => member.status === "ACTIVE"
    ).length;

    const expired = allMembers.filter(
      (member) => member.status === "EXPIRED"
    ).length;

    const expiring = allMembers.filter(
      (member) =>
        member.status === "ACTIVE" &&
        member.endDate >= now &&
        member.endDate <= sevenDaysLater
    ).length;

    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",

      data: {
        overview: {
          total: allMembers.length,
          active,
          expiring,
          expired,
        },

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