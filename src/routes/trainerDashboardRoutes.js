import express from "express";

import {
  getTrainerDashboard,
} from "../controllers/trainerDashboardController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getTrainerDashboard
);

export default router;