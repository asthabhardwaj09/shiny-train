import express from "express";

import {
  getClientWorkouts,
  getClientWorkoutById,
  startWorkout,
  completeExercise,
} from "../controllers/clientWorkoutController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getClientWorkouts
);

router.get(
  "/:workoutId",
  authMiddleware,
  getClientWorkoutById
);

router.patch(
  "/:workoutId/start",
  authMiddleware,
  startWorkout
);

router.patch(
  "/:workoutId/exercises/:exerciseId/complete",
  authMiddleware,
  completeExercise
);

export default router;