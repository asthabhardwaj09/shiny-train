import Member from "../models/Member.js";
import TrainingSession from "../models/TrainingSession.js";

// ======================================================
// TRAINER OVERALL PROGRESS
// ======================================================

const getTrainerProgress = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can access progress",
      });
    }

    const trainerId = req.user.trainerId;
    const gymId = req.user.gymId;

    // All sessions of trainer
    const sessions = await TrainingSession.find({
      trainerId,
      gymId,
    }).lean();

    // All assigned clients
    const clients = await Member.find({
      trainerId,
      gymId,
    })
      .select(
        "clientId fullName membershipPlan status startDate endDate"
      )
      .lean();

    const completedSessions = sessions.filter(
      (session) => session.status === "COMPLETED"
    );

    const scheduledSessions = sessions.filter(
      (session) => session.status === "SCHEDULED"
    );

    const cancelledSessions = sessions.filter(
      (session) => session.status === "CANCELLED"
    );

    // Total completed training hours
    const totalMinutes = completedSessions.reduce(
      (total, session) =>
        total + Number(session.duration || 0),
      0
    );

    const trainingHours = Number(
      (totalMinutes / 60).toFixed(1)
    );

    // Average session duration
    const averageSessionDuration =
      completedSessions.length > 0
        ? Math.round(
            totalMinutes / completedSessions.length
          )
        : 0;

    // Completion percentage
    const totalRelevantSessions =
      completedSessions.length +
      scheduledSessions.length +
      cancelledSessions.length;

    const completionRate =
      totalRelevantSessions > 0
        ? Math.round(
            (completedSessions.length /
              totalRelevantSessions) *
              100
          )
        : 0;

    // ==================================================
    // CURRENT WEEK
    // ==================================================

    const now = new Date();

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

    const weeklySessions = sessions.filter((session) => {
      const date = new Date(session.date);

      return (
        date >= startOfWeek &&
        date <= endOfWeek
      );
    });

    const weeklyData = [
      { day: "Mon", sessions: 0, completed: 0 },
      { day: "Tue", sessions: 0, completed: 0 },
      { day: "Wed", sessions: 0, completed: 0 },
      { day: "Thu", sessions: 0, completed: 0 },
      { day: "Fri", sessions: 0, completed: 0 },
      { day: "Sat", sessions: 0, completed: 0 },
      { day: "Sun", sessions: 0, completed: 0 },
    ];

    weeklySessions.forEach((session) => {
      const date = new Date(session.date);

      let dayIndex = date.getDay();

      dayIndex =
        dayIndex === 0 ? 6 : dayIndex - 1;

      weeklyData[dayIndex].sessions += 1;

      if (session.status === "COMPLETED") {
        weeklyData[dayIndex].completed += 1;
      }
    });

    // ==================================================
    // CLIENT PROGRESS SUMMARY
    // ==================================================

    const clientProgress = clients.map((client) => {
      const clientSessions = sessions.filter(
        (session) =>
          session.clientId === client.clientId
      );

      const completed = clientSessions.filter(
        (session) =>
          session.status === "COMPLETED"
      ).length;

      const total = clientSessions.length;

      const progress =
        total > 0
          ? Math.round((completed / total) * 100)
          : 0;

      return {
        clientId: client.clientId,
        fullName: client.fullName,
        membershipPlan: client.membershipPlan,
        status: client.status,
        totalSessions: total,
        completedSessions: completed,
        progress,
      };
    });

    // Highest progress first
    clientProgress.sort(
      (a, b) => b.progress - a.progress
    );

    // ==================================================
    // THIS MONTH
    // ==================================================

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const monthlyCompleted =
      completedSessions.filter((session) => {
        const date = new Date(session.date);

        return (
          date >= startOfMonth &&
          date <= endOfMonth
        );
      }).length;

    return res.status(200).json({
      success: true,
      message:
        "Trainer progress fetched successfully",

      data: {
        overview: {
          totalClients: clients.length,
          totalSessions: sessions.length,
          completedSessions:
            completedSessions.length,
          scheduledSessions:
            scheduledSessions.length,
          cancelledSessions:
            cancelledSessions.length,
          trainingHours,
          averageSessionDuration,
          completionRate,
        },

        thisMonth: {
          completedSessions: monthlyCompleted,
        },

        weeklyPerformance: weeklyData,

        clientProgress,
      },
    });
  } catch (error) {
    console.error(
      "Trainer progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// INDIVIDUAL CLIENT PROGRESS
// ======================================================

const getClientProgress = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message:
          "Only trainers can view client progress",
      });
    }

    const { clientId } = req.params;

    // Security check:
    // client must belong to logged-in trainer
    const client = await Member.findOne({
      clientId,
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    })
      .select("-password")
      .lean();

    if (!client) {
      return res.status(404).json({
        success: false,
        message:
          "Client not found or not assigned to this trainer",
      });
    }

    const sessions = await TrainingSession.find({
      clientId,
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    })
      .sort({ date: -1 })
      .lean();

    const completedSessions = sessions.filter(
      (session) =>
        session.status === "COMPLETED"
    );

    const scheduledSessions = sessions.filter(
      (session) =>
        session.status === "SCHEDULED"
    );

    const cancelledSessions = sessions.filter(
      (session) =>
        session.status === "CANCELLED"
    );

    const totalMinutes = completedSessions.reduce(
      (total, session) =>
        total + Number(session.duration || 0),
      0
    );

    const trainingHours = Number(
      (totalMinutes / 60).toFixed(1)
    );

    const progress =
      sessions.length > 0
        ? Math.round(
            (completedSessions.length /
              sessions.length) *
              100
          )
        : 0;

    return res.status(200).json({
      success: true,
      message:
        "Client progress fetched successfully",

      data: {
        client: {
          clientId: client.clientId,
          fullName: client.fullName,
          email: client.email,
          phone: client.phone,
          membershipPlan:
            client.membershipPlan,
          startDate: client.startDate,
          endDate: client.endDate,
          status: client.status,
        },

        progress: {
          percentage: progress,
          totalSessions: sessions.length,
          completedSessions:
            completedSessions.length,
          scheduledSessions:
            scheduledSessions.length,
          cancelledSessions:
            cancelledSessions.length,
          trainingHours,
        },

        sessions: sessions.map((session) => ({
          id: session._id,
          date: session.date,
          time: session.time,
          duration: session.duration,
          sessionType: session.sessionType,
          location: session.location,
          status: session.status,
          notes: session.notes,
        })),
      },
    });
  } catch (error) {
    console.error(
      "Client progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  getTrainerProgress,
  getClientProgress,
};