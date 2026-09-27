import Trainer from "../models/Trainer.js";
import Member from "../models/Member.js";
import TrainingSession from "../models/TrainingSession.js";

const getTrainerDashboard = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can access trainer dashboard",
      });
    }

    const trainer = await Trainer.findOne({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    }).select("-password");

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // -----------------------------
    // CLIENT STATISTICS
    // -----------------------------

    const totalClients = await Member.countDocuments({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    });

    const activeClients = await Member.countDocuments({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
      status: "ACTIVE",
    });

    // -----------------------------
    // TODAY SESSION STATISTICS
    // -----------------------------

    const todaySessions = await TrainingSession.find({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
      date: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    })
      .sort({ time: 1 })
      .lean();

    const completedToday = todaySessions.filter(
      (session) => session.status === "COMPLETED"
    ).length;

    const scheduledToday = todaySessions.filter(
      (session) => session.status === "SCHEDULED"
    ).length;

    // -----------------------------
    // ADD CLIENT DETAILS TO SCHEDULE
    // -----------------------------

    const clientIds = [
      ...new Set(
        todaySessions.map((session) => session.clientId)
      ),
    ];

    const clients = await Member.find({
      clientId: {
        $in: clientIds,
      },
      gymId: req.user.gymId,
    })
      .select("clientId fullName membershipPlan status")
      .lean();

    const clientMap = {};

    clients.forEach((client) => {
      clientMap[client.clientId] = client;
    });

    const todaySchedule = todaySessions.map((session) => ({
      id: session._id,

      clientId: session.clientId,

      clientName:
        clientMap[session.clientId]?.fullName ||
        "Unknown Client",

      membershipPlan:
        clientMap[session.clientId]?.membershipPlan ||
        null,

      time: session.time,

      duration: session.duration,

      sessionType: session.sessionType,

      location: session.location,

      status: session.status,
    }));

    // -----------------------------
    // WEEKLY SESSION DATA
    // -----------------------------

    const startOfWeek = new Date(now);

    const currentDay = startOfWeek.getDay();

    const difference =
      currentDay === 0 ? -6 : 1 - currentDay;

    startOfWeek.setDate(
      startOfWeek.getDate() + difference
    );

    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);

    endOfWeek.setDate(
      endOfWeek.getDate() + 6
    );

    endOfWeek.setHours(23, 59, 59, 999);

    const weeklySessions = await TrainingSession.find({
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,

      date: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      },
    }).lean();

    const weeklyData = [
      {
        day: "Mon",
        sessions: 0,
      },
      {
        day: "Tue",
        sessions: 0,
      },
      {
        day: "Wed",
        sessions: 0,
      },
      {
        day: "Thu",
        sessions: 0,
      },
      {
        day: "Fri",
        sessions: 0,
      },
      {
        day: "Sat",
        sessions: 0,
      },
      {
        day: "Sun",
        sessions: 0,
      },
    ];

    weeklySessions.forEach((session) => {
      const sessionDate = new Date(session.date);

      let dayIndex = sessionDate.getDay();

      // Convert JS Sunday=0 format to Monday=0
      dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;

      weeklyData[dayIndex].sessions += 1;
    });

    // -----------------------------
    // TOTAL COMPLETED SESSIONS
    // -----------------------------

    const totalCompletedSessions =
      await TrainingSession.countDocuments({
        trainerId: req.user.trainerId,
        gymId: req.user.gymId,
        status: "COMPLETED",
      });

    return res.status(200).json({
      success: true,

      message:
        "Trainer dashboard fetched successfully",

      data: {
        trainer: {
          trainerId: trainer.trainerId,
          fullName: trainer.fullName,
          specialization: trainer.specialization,
          experience: trainer.experience,
        },

        overview: {
          totalClients,
          activeClients,
          todaySessions: todaySessions.length,
          scheduledToday,
          completedToday,
          totalCompletedSessions,
        },

        todaySchedule,

        weeklySessions: weeklyData,
      },
    });
  } catch (error) {
    console.error(
      "Trainer dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { getTrainerDashboard };