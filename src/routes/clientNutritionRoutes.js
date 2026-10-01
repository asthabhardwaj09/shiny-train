import express from "express";

import {
  getNutritionDashboard,
  addMeal,
  updateHydration,
} from "../controllers/clientNutritionController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getNutritionDashboard
);

router.post(
  "/meals",
  authMiddleware,
  addMeal
);

router.patch(
  "/hydration",
  authMiddleware,
  updateHydration
);

export default router;