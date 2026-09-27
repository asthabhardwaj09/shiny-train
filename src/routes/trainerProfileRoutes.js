import express from "express";

import {
  getTrainerProfile,
  updateTrainerProfile,
} from "../controllers/trainerProfileController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getTrainerProfile
);

router.put(
  "/",
  authMiddleware,
  updateTrainerProfile
);

export default router;