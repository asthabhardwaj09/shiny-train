import express from "express";

import {
  addTrainer,
  getTrainers,
  loginTrainer,
  getTrainerClients,
  getTrainerById,
  assignMemberToTrainer,
  deleteTrainer,
} from "../controllers/trainerController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Trainer login
router.post("/login", loginTrainer);

// Trainer gets clients assigned by Owner
router.get(
  "/clients",
  authMiddleware,
  getTrainerClients
);

// Owner trainer management
router.get("/", authMiddleware, getTrainers);
router.post("/", authMiddleware, addTrainer);

router.patch(
  "/:trainerId/members/:clientId",
  authMiddleware,
  assignMemberToTrainer
);

router.get(
  "/:trainerId",
  authMiddleware,
  getTrainerById
);

router.delete(
  "/:trainerId",
  authMiddleware,
  deleteTrainer
);

export default router;