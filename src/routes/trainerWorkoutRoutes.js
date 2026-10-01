import express from "express";

import {
  assignWorkout,
} from "../controllers/trainerWorkoutController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  assignWorkout
);

export default router;