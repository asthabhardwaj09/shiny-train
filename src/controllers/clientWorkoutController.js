import Workout from "../models/Workout.js";


// ======================================================
// GET CLIENT WORKOUTS
// ======================================================

const getClientWorkouts = async (req, res) => {
    try {
        if (req.user.role !== "CLIENT") {
            return res.status(403).json({
                success: false,
                message: "Only clients can access workouts",
            });
        }

        const {
            date,
            status,
        } = req.query;

        const query = {
            clientId: req.user.clientId,
            gymId: req.user.gymId,
        };

        // Optional status filter
        if (status) {
            const normalizedStatus =
                status.toUpperCase();

            if (
                ![
                    "ASSIGNED",
                    "IN_PROGRESS",
                    "COMPLETED",
                ].includes(normalizedStatus)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workout status",
                });
            }

            query.status = normalizedStatus;
        }

        // Optional date filter
        if (date) {
            const selectedDate = new Date(date);

            if (
                Number.isNaN(selectedDate.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date",
                });
            }

            const startOfDay =
                new Date(selectedDate);

            startOfDay.setHours(
                0,
                0,
                0,
                0
            );

            const endOfDay =
                new Date(selectedDate);

            endOfDay.setHours(
                23,
                59,
                59,
                999
            );

            query.date = {
                $gte: startOfDay,
                $lte: endOfDay,
            };
        }

        const workouts = await Workout.find(query)
            .sort({
                date: -1,
                createdAt: -1,
            })
            .lean();

        const formattedWorkouts =
            workouts.map((workout) => {
                const totalExercises =
                    workout.exercises.length;

                const completedExercises =
                    workout.exercises.filter(
                        (exercise) =>
                            exercise.completed
                    ).length;

                const progressPercentage =
                    totalExercises > 0
                        ? Math.round(
                            (completedExercises /
                                totalExercises) *
                            100
                        )
                        : 0;

                return {
                    id: workout._id,

                    trainerId:
                        workout.trainerId,

                    title:
                        workout.title,

                    muscleGroups:
                        workout.muscleGroups,

                    date:
                        workout.date,

                    duration:
                        workout.duration,

                    estimatedCalories:
                        workout.estimatedCalories,

                    exerciseCount:
                        totalExercises,

                    completedExercises,

                    progressPercentage,

                    exercises:
                        workout.exercises,

                    status:
                        workout.status,

                    startedAt:
                        workout.startedAt,

                    completedAt:
                        workout.completedAt,

                    notes:
                        workout.notes,
                };
            });

        return res.status(200).json({
            success: true,
            message:
                "Client workouts fetched successfully",

            data: {
                totalWorkouts:
                    formattedWorkouts.length,

                workouts:
                    formattedWorkouts,
            },
        });
    } catch (error) {
        console.error(
            "Get client workouts error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
};


// ======================================================
// GET SINGLE WORKOUT
// ======================================================

const getClientWorkoutById = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "CLIENT") {
            return res.status(403).json({
                success: false,
                message:
                    "Only clients can access workouts",
            });
        }

        const workout =
            await Workout.findOne({
                _id: req.params.workoutId,

                clientId:
                    req.user.clientId,

                gymId:
                    req.user.gymId,
            }).lean();

        if (!workout) {
            return res.status(404).json({
                success: false,
                message:
                    "Workout not found",
            });
        }

        const totalExercises =
            workout.exercises.length;

        const completedExercises =
            workout.exercises.filter(
                (exercise) =>
                    exercise.completed
            ).length;

        const progressPercentage =
            totalExercises > 0
                ? Math.round(
                    (completedExercises /
                        totalExercises) *
                    100
                )
                : 0;

        return res.status(200).json({
            success: true,
            message:
                "Workout fetched successfully",

            data: {
                workout: {
                    id:
                        workout._id,

                    trainerId:
                        workout.trainerId,

                    title:
                        workout.title,

                    muscleGroups:
                        workout.muscleGroups,

                    date:
                        workout.date,

                    duration:
                        workout.duration,

                    estimatedCalories:
                        workout.estimatedCalories,

                    exerciseCount:
                        totalExercises,

                    completedExercises,

                    progressPercentage,

                    exercises:
                        workout.exercises,

                    status:
                        workout.status,

                    startedAt:
                        workout.startedAt,

                    completedAt:
                        workout.completedAt,

                    notes:
                        workout.notes,
                },
            },
        });
    } catch (error) {
        console.error(
            "Get workout error:",
            error
        );

        if (
            error.name === "CastError"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid workout ID",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
};

// ======================================================
// START WORKOUT
// ======================================================

const startWorkout = async (req, res) => {
    try {
        if (req.user.role !== "CLIENT") {
            return res.status(403).json({
                success: false,
                message: "Only clients can start workouts",
            });
        }

        const workout = await Workout.findOne({
            _id: req.params.workoutId,
            clientId: req.user.clientId,
            gymId: req.user.gymId,
        });

        if (!workout) {
            return res.status(404).json({
                success: false,
                message: "Workout not found",
            });
        }

        if (workout.status === "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Workout is already completed",
            });
        }

        if (workout.status === "IN_PROGRESS") {
            return res.status(400).json({
                success: false,
                message: "Workout is already in progress",
            });
        }

        workout.status = "IN_PROGRESS";
        workout.startedAt = new Date();

        await workout.save();

        return res.status(200).json({
            success: true,
            message: "Workout started successfully",
            data: {
                workout: {
                    id: workout._id,
                    title: workout.title,
                    status: workout.status,
                    startedAt: workout.startedAt,
                    exerciseCount: workout.exercises.length,
                },
            },
        });
    } catch (error) {
        console.error("Start workout error:", error);

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid workout ID",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// ======================================================
// COMPLETE EXERCISE
// ======================================================

const completeExercise = async (req, res) => {
    try {
        if (req.user.role !== "CLIENT") {
            return res.status(403).json({
                success: false,
                message: "Only clients can complete exercises",
            });
        }

        const workout = await Workout.findOne({
            _id: req.params.workoutId,
            clientId: req.user.clientId,
            gymId: req.user.gymId,
        });

        if (!workout) {
            return res.status(404).json({
                success: false,
                message: "Workout not found",
            });
        }

        if (workout.status === "ASSIGNED") {
            return res.status(400).json({
                success: false,
                message: "Start the workout before completing exercises",
            });
        }

        if (workout.status === "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Workout is already completed",
            });
        }

        const exercise = workout.exercises.id(
            req.params.exerciseId
        );

        if (!exercise) {
            return res.status(404).json({
                success: false,
                message: "Exercise not found",
            });
        }

        if (exercise.completed) {
            return res.status(400).json({
                success: false,
                message: "Exercise is already completed",
            });
        }

        exercise.completed = true;
        exercise.completedAt = new Date();

        const totalExercises = workout.exercises.length;

        const completedExercises =
            workout.exercises.filter(
                (item) => item.completed
            ).length;

        const progressPercentage = Math.round(
            (completedExercises / totalExercises) * 100
        );

        // Automatically finish workout when all exercises are done
        if (completedExercises === totalExercises) {
            workout.status = "COMPLETED";
            workout.completedAt = new Date();
        }

        await workout.save();

        return res.status(200).json({
            success: true,

            message:
                workout.status === "COMPLETED"
                    ? "Exercise completed and workout finished successfully"
                    : "Exercise completed successfully",

            data: {
                workoutId: workout._id,

                exercise: {
                    id: exercise._id,
                    name: exercise.name,
                    completed: exercise.completed,
                    completedAt: exercise.completedAt,
                },

                progress: {
                    totalExercises,
                    completedExercises,
                    remainingExercises:
                        totalExercises - completedExercises,
                    percentage: progressPercentage,
                },

                workoutStatus: workout.status,
                completedAt: workout.completedAt,
            },
        });
    } catch (error) {
        console.error("Complete exercise error:", error);

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid workout or exercise ID",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


export {
    getClientWorkouts,
    getClientWorkoutById,
    startWorkout,
    completeExercise,
};