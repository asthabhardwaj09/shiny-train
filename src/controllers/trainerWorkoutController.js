import Member from "../models/Member.js";
import Workout from "../models/Workout.js";

const assignWorkout = async (req, res) => {
  try {
    if (req.user.role !== "TRAINER") {
      return res.status(403).json({
        success: false,
        message: "Only trainers can assign workouts",
      });
    }

    const {
      clientId,
      title,
      muscleGroups,
      date,
      duration,
      estimatedCalories,
      exercises,
      notes,
    } = req.body;

    // Required fields
    if (
      !clientId ||
      !title ||
      !date ||
      !duration ||
      !Array.isArray(exercises) ||
      exercises.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Client ID, title, date, duration and exercises are required",
      });
    }

    // Make sure client belongs to logged-in trainer
    const client = await Member.findOne({
      clientId: clientId.trim(),
      trainerId: req.user.trainerId,
      gymId: req.user.gymId,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message:
          "Client not found or not assigned to this trainer",
      });
    }

    if (client.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot assign workout to an inactive client",
      });
    }

    const workoutDate = new Date(date);

    if (Number.isNaN(workoutDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid workout date",
      });
    }

    const formattedExercises = exercises.map(
      (exercise) => ({
        name: exercise.name?.trim(),
        sets: Number(exercise.sets),
        reps: Number(exercise.reps),
        weight: Number(exercise.weight || 0),
        restSeconds: Number(
          exercise.restSeconds ?? 60
        ),
      })
    );

    // Basic exercise validation
    const invalidExercise =
      formattedExercises.some(
        (exercise) =>
          !exercise.name ||
          !Number.isFinite(exercise.sets) ||
          exercise.sets < 1 ||
          !Number.isFinite(exercise.reps) ||
          exercise.reps < 1 ||
          !Number.isFinite(exercise.weight) ||
          exercise.weight < 0 ||
          !Number.isFinite(exercise.restSeconds) ||
          exercise.restSeconds < 0
      );

    if (invalidExercise) {
      return res.status(400).json({
        success: false,
        message:
          "Each exercise must have a valid name, sets, reps, weight and rest time",
      });
    }

    const workout = await Workout.create({
      trainerId: req.user.trainerId,
      clientId: client.clientId,
      gymId: req.user.gymId,

      title: title.trim(),

      muscleGroups: Array.isArray(muscleGroups)
        ? muscleGroups
            .map((group) => String(group).trim())
            .filter(Boolean)
        : [],

      date: workoutDate,

      duration: Number(duration),

      estimatedCalories: Number(
        estimatedCalories || 0
      ),

      exercises: formattedExercises,

      notes: notes?.trim() || "",

      status: "ASSIGNED",
    });

    return res.status(201).json({
      success: true,
      message: "Workout assigned successfully",

      data: {
        workout: {
          id: workout._id,

          client: {
            clientId: client.clientId,
            fullName: client.fullName,
          },

          trainerId: workout.trainerId,

          title: workout.title,
          muscleGroups: workout.muscleGroups,

          date: workout.date,
          duration: workout.duration,

          estimatedCalories:
            workout.estimatedCalories,

          exerciseCount:
            workout.exercises.length,

          exercises: workout.exercises,

          status: workout.status,
          notes: workout.notes,
        },
      },
    });
  } catch (error) {
    console.error(
      "Assign workout error:",
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

export { assignWorkout };