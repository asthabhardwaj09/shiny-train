import Member from "../models/Member.js";
import Trainer from "../models/Trainer.js";
import Workout from "../models/Workout.js";
import ClientMeasurement from "../models/ClientMeasurement.js";


// ======================================================
// GET CLIENT PROFILE
// ======================================================

const getClientProfile = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message: "Only clients can access client profile",
      });
    }

    const client = await Member.findOne({
      clientId: req.user.clientId,
      gymId: req.user.gymId,
    })
      .select("-password")
      .lean();

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const trainer = await Trainer.findOne({
      trainerId: client.trainerId,
      gymId: client.gymId,
    })
      .select(
        "trainerId fullName email phone specialization experience"
      )
      .lean();

    const latestMeasurement =
      await ClientMeasurement.findOne({
        clientId: client.clientId,
        gymId: client.gymId,
      })
        .sort({
          recordedAt: -1,
        })
        .lean();

    const totalWorkouts =
      await Workout.countDocuments({
        clientId: client.clientId,
        gymId: client.gymId,
      });

    const completedWorkouts =
      await Workout.countDocuments({
        clientId: client.clientId,
        gymId: client.gymId,
        status: "COMPLETED",
      });

    const inProgressWorkouts =
      await Workout.countDocuments({
        clientId: client.clientId,
        gymId: client.gymId,
        status: "IN_PROGRESS",
      });

    const assignedWorkouts =
      await Workout.countDocuments({
        clientId: client.clientId,
        gymId: client.gymId,
        status: "ASSIGNED",
      });

    return res.status(200).json({
      success: true,
      message: "Client profile fetched successfully",

      data: {
        personalInfo: {
          clientId: client.clientId,
          fullName: client.fullName,
          email: client.email,
          phone: client.phone,
        },

        membership: {
          plan: client.membershipPlan,
          planName: client.planName,
          startDate: client.startDate,
          endDate: client.endDate,
          status: client.status,
        },

        trainer: trainer
          ? {
              trainerId: trainer.trainerId,
              fullName: trainer.fullName,
              email: trainer.email,
              phone: trainer.phone,
              specialization: trainer.specialization,
              experience: trainer.experience,
            }
          : null,

        measurements: latestMeasurement
          ? {
              weight: latestMeasurement.weight,
              bodyFat: latestMeasurement.bodyFat,
              waist: latestMeasurement.waist,
              height: latestMeasurement.height,
              bmi: latestMeasurement.bmi,
              recordedAt:
                latestMeasurement.recordedAt,
            }
          : null,

        workoutStats: {
          total: totalWorkouts,
          completed: completedWorkouts,
          inProgress: inProgressWorkouts,
          assigned: assignedWorkouts,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get client profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// UPDATE CLIENT PROFILE
// ======================================================

const updateClientProfile = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update client profile",
      });
    }

    const {
      fullName,
      email,
      phone,
    } = req.body;

    if (
      fullName === undefined &&
      email === undefined &&
      phone === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one field to update",
      });
    }

    const client = await Member.findOne({
      clientId: req.user.clientId,
      gymId: req.user.gymId,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    if (fullName !== undefined) {
      if (!String(fullName).trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name cannot be empty",
        });
      }

      client.fullName =
        String(fullName).trim();
    }

    if (email !== undefined) {
      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailPattern.test(
          normalizedEmail
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid email address",
        });
      }

      // Prevent duplicate email inside same gym
      const existingClient =
        await Member.findOne({
          gymId: req.user.gymId,
          email: normalizedEmail,
          _id: {
            $ne: client._id,
          },
        });

      if (existingClient) {
        return res.status(409).json({
          success: false,
          message:
            "A client with this email already exists",
        });
      }

      client.email =
        normalizedEmail;
    }

    if (phone !== undefined) {
      const normalizedPhone =
        String(phone).trim();

      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot be empty",
        });
      }

      client.phone =
        normalizedPhone;
    }

    await client.save();

    return res.status(200).json({
      success: true,
      message:
        "Client profile updated successfully",

      data: {
        client: {
          clientId: client.clientId,
          fullName: client.fullName,
          email: client.email,
          phone: client.phone,
        },
      },
    });
  } catch (error) {
    console.error(
      "Update client profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  getClientProfile,
  updateClientProfile,
};