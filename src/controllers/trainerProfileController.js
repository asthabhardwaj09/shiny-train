import Trainer from "../models/Trainer.js";
import Member from "../models/Member.js";
import TrainingSession from "../models/TrainingSession.js";

// ======================================================
// GET TRAINER PROFILE
// ======================================================

const getTrainerProfile = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can access trainer profile",
      });
    }

    const trainer = await Trainer.findOne({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    })
      .select("-password")
      .lean();

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    // Total assigned clients
    const totalClients = await Member.countDocuments({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    });

    // Completed sessions
    const completedSessions =
      await TrainingSession.countDocuments({
        trainerId: req.user.trainerId,
        gymId: req.user.gymId,
        status: "COMPLETED",
      });

    // Total completed training time
    const completedSessionData =
      await TrainingSession.find({
        trainerId: req.user.trainerId,
        gymId: req.user.gymId,
        status: "COMPLETED",
      })
        .select("duration")
        .lean();

    const totalMinutes = completedSessionData.reduce(
      (total, session) =>
        total + Number(session.duration || 0),
      0
    );

    const trainingHours = Number(
      (totalMinutes / 60).toFixed(1)
    );

    return res.status(200).json({
      success: true,
      message: "Trainer profile fetched successfully",

      data: {
        trainer: {
          id: trainer._id,
          trainerId: trainer.trainerId,
          fullName: trainer.fullName,
          email: trainer.email,
          phone: trainer.phone,
          gymId: trainer.gymId,
          specialization: trainer.specialization,
          experience: trainer.experience,
          status: trainer.status,
          createdAt: trainer.createdAt,
        },

        statistics: {
          totalClients,
          completedSessions,
          trainingHours,
        },
      },
    });
  } catch (error) {
    console.error("Get trainer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// UPDATE TRAINER PROFILE
// ======================================================

const updateTrainerProfile = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can update trainer profile",
      });
    }

    const {
      fullName,
      phone,
      email,
      specialization,
      experience,
    } = req.body;

    const trainer = await Trainer.findOne({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    // Update only fields provided by frontend
    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name cannot be empty",
        });
      }

      trainer.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (!phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot be empty",
        });
      }

      trainer.phone = phone.trim();
    }

    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const normalizedEmail =
        email.toLowerCase().trim();

      // Prevent duplicate trainer email in same gym
      const existingTrainer =
        await Trainer.findOne({
          gymId: req.user.gymId,
          email: normalizedEmail,
          _id: {
            $ne: trainer._id,
          },
        });

      if (existingTrainer) {
        return res.status(409).json({
          success: false,
          message:
            "Another trainer with this email already exists",
        });
      }

      trainer.email = normalizedEmail;
    }

    if (specialization !== undefined) {
      trainer.specialization =
        specialization.trim();
    }

    if (experience !== undefined) {
      const trainerExperience =
        Number(experience);

      if (
        Number.isNaN(trainerExperience) ||
        trainerExperience < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Experience must be a valid non-negative number",
        });
      }

      trainer.experience =
        trainerExperience;
    }

    await trainer.save();

    return res.status(200).json({
      success: true,
      message:
        "Trainer profile updated successfully",

      data: {
        trainer: {
          id: trainer._id,
          trainerId: trainer.trainerId,
          fullName: trainer.fullName,
          email: trainer.email,
          phone: trainer.phone,
          gymId: trainer.gymId,
          specialization:
            trainer.specialization,
          experience: trainer.experience,
          status: trainer.status,
        },
      },
    });
  } catch (error) {
    console.error(
      "Update trainer profile error:",
      error
    );

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  getTrainerProfile,
  updateTrainerProfile,
};