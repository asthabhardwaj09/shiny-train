import express from "express";

import {
  addMeasurement,
  getClientProgress,
  getMeasurementHistory,
} from "../controllers/clientProgressController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getClientProgress
);

router.post(
  "/measurements",
  authMiddleware,
  addMeasurement
);

router.get(
  "/measurements",
  authMiddleware,
  getMeasurementHistory
);

export default router;