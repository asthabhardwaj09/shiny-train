import Member from "../models/Member.js";
import Trainer from "../models/Trainer.js";
import TrainingSession from "../models/TrainingSession.js";

const getClientDashboard = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message: "Only clients can access client dashboard",
      });
    }

    const clientId = req.user.clientId;
    const gymId = req.user.gymId;

    // Find logged-in client
    const client = await Member.findOne({
      clientId,
      gymId,
    })
      .select("-password")
      .lean();

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Find assigned trainer
    const trainer = await Trainer.findOne({
      trainerId: client.trainerId,
      gymId,
    })
      .select("trainerId fullName specialization experience")
      .lean();

    const now = new Date();

    // ============================================
    // TODAY
    // ============================================

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const todaySessions = await TrainingSession.find({
      clientId,
      gymId,
      date: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    })
      .sort({ time: 1 })
      .lean();

    // ============================================
    // CURRENT WEEK - MONDAY TO SUNDAY
    // ============================================

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
      clientId,
      gymId,
      date: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      },
    })
      .sort({ date: 1, time: 1 })
      .lean();

    const completedThisWeek = weeklySessions.filter(
      (session) => session.status === "COMPLETED"
    ).length;

    const scheduledThisWeek = weeklySessions.filter(
      (session) => session.status === "SCHEDULED"
    ).length;

    const cancelledThisWeek = weeklySessions.filter(
      (session) => session.status === "CANCELLED"
    ).length;

    const weeklyGoal = weeklySessions.filter(
      (session) => session.status !== "CANCELLED"
    ).length;

    const weeklyProgress =
      weeklyGoal > 0
        ? Math.round(
            (completedThisWeek / weeklyGoal) * 100
          )
        : 0;

    // ============================================
    // TOTAL COMPLETED SESSIONS
    // ============================================

    const totalCompletedSessions =
      await TrainingSession.countDocuments({
        clientId,
        gymId,
        status: "COMPLETED",
      });

    // ============================================
    // FORMAT TODAY'S SESSIONS
    // ============================================

    const todayWorkout = todaySessions.map((session) => ({
      id: session._id,
      date: session.date,
      time: session.time,
      duration: session.duration,
      sessionType: session.sessionType,
      location: session.location,
      status: session.status,
      notes: session.notes,
    }));

    return res.status(200).json({
      success: true,
      message: "Client dashboard fetched successfully",

      data: {
        client: {
          clientId: client.clientId,
          fullName: client.fullName,
          membershipPlan: client.membershipPlan,
          planName: client.planName,
          startDate: client.startDate,
          endDate: client.endDate,
          status: client.status,
        },

        trainer: trainer
          ? {
              trainerId: trainer.trainerId,
              fullName: trainer.fullName,
              specialization: trainer.specialization,
              experience: trainer.experience,
            }
          : null,

        today: {
          totalSessions: todaySessions.length,
          workouts: todayWorkout,
        },

        weeklyGoal: {
          target: weeklyGoal,
          completed: completedThisWeek,
          scheduled: scheduledThisWeek,
          cancelled: cancelledThisWeek,
          percentage: weeklyProgress,
        },

        totalCompletedSessions,
      },
    });
  } catch (error) {
    console.error("Client dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { getClientDashboard };