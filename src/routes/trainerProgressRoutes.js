import express from "express";

import {
  getTrainerProgress,
  getClientProgress,
} from "../controllers/trainerProgressController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getTrainerProgress
);

router.get(
  "/clients/:clientId",
  authMiddleware,
  getClientProgress
);

export default router;