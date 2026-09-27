import TrainingSession from "../models/TrainingSession.js";
import Member from "../models/Member.js";

// ================================
// CREATE TRAINING SESSION
// ================================

const createSession = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can create training sessions",
      });
    }

    const {
      clientId,
      date,
      time,
      duration,
      sessionType,
      location,
      notes,
    } = req.body;

    if (
      !clientId ||
      !date ||
      !time ||
      !duration ||
      !sessionType ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Make sure client belongs to this trainer
    const client = await Member.findOne({
      clientId: clientId.trim(),
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found or not assigned to this trainer",
      });
    }

    if (client.status === "EXPIRED") {
      return res.status(400).json({
        success: false,
        message: "Cannot create a session for an expired client",
      });
    }

    const sessionDate = new Date(date);

    if (Number.isNaN(sessionDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid session date",
      });
    }

    const session = await TrainingSession.create({
      trainerId: req.user.trainerId,
      clientId: client.clientId,
      gymId: req.user.gymId,
      date: sessionDate,
      time: time.trim(),
      duration: Number(duration),
      sessionType,
      location,
      notes: notes?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Training session created successfully",
      data: {
        session: {
          id: session._id,
          clientId: session.clientId,
          clientName: client.fullName,
          date: session.date,
          time: session.time,
          duration: session.duration,
          sessionType: session.sessionType,
          location: session.location,
          status: session.status,
          notes: session.notes,
        },
      },
    });
  } catch (error) {
    console.error("Create training session error:", error);

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


// ================================
// GET TRAINER SESSIONS
// ================================

const getSessions = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can view training sessions",
      });
    }

    const { date, status, clientId } = req.query;

    const query = {
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (clientId) {
      query.clientId = clientId.trim();
    }

    // Filter sessions by particular date
    if (date) {
      const selectedDate = new Date(date);

      if (Number.isNaN(selectedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const sessions = await TrainingSession.find(query)
      .sort({
        date: 1,
        time: 1,
      })
      .lean();

    // Get client names
    const clientIds = [
      ...new Set(sessions.map((session) => session.clientId)),
    ];

    const clients = await Member.find({
      clientId: { $in: clientIds },
      gymId: req.user.gymId,
    })
      .select("clientId fullName membershipPlan status")
      .lean();

    const clientMap = {};

    clients.forEach((client) => {
      clientMap[client.clientId] = client;
    });

    const formattedSessions = sessions.map((session) => {
      const client = clientMap[session.clientId];

      return {
        id: session._id,
        clientId: session.clientId,
        clientName: client?.fullName || "Unknown Client",
        membershipPlan: client?.membershipPlan || null,
        date: session.date,
        time: session.time,
        duration: session.duration,
        sessionType: session.sessionType,
        location: session.location,
        status: session.status,
        notes: session.notes,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Training sessions fetched successfully",
      data: {
        total: formattedSessions.length,
        sessions: formattedSessions,
      },
    });
  } catch (error) {
    console.error("Get training sessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ================================
// GET SINGLE SESSION
// ================================

const getSessionById = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can view training sessions",
      });
    }

    const session = await TrainingSession.findOne({
      _id: req.params.sessionId,
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    }).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Training session not found",
      });
    }

    const client = await Member.findOne({
      clientId: session.clientId,
      gymId: req.user.gymId,
    })
      .select("clientId fullName email phone membershipPlan status")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Training session fetched successfully",
      data: {
        session: {
          ...session,
          client,
        },
      },
    });
  } catch (error) {
    console.error("Get training session error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ================================
// UPDATE SESSION
// ================================

const updateSession = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can update training sessions",
      });
    }

    const allowedFields = [
      "date",
      "time",
      "duration",
      "sessionType",
      "location",
      "status",
      "notes",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.date) {
      const newDate = new Date(updates.date);

      if (Number.isNaN(newDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid session date",
        });
      }

      updates.date = newDate;
    }

    if (updates.duration !== undefined) {
      updates.duration = Number(updates.duration);
    }

    const session = await TrainingSession.findOneAndUpdate(
      {
        _id: req.params.sessionId,
        trainerId: req.user.trainerId,
        gymId: req.user.gymId,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Training session not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Training session updated successfully",
      data: {
        session,
      },
    });
  } catch (error) {
    console.error("Update training session error:", error);

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


// ================================
// DELETE SESSION
// ================================

const deleteSession = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can delete training sessions",
      });
    }

    const session = await TrainingSession.findOneAndDelete({
      _id: req.params.sessionId,
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Training session not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Training session deleted successfully",
    });
  } catch (error) {
    console.error("Delete training session error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
};