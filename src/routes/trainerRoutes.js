import express from "express";

import {
  addTrainer,
  getTrainers,
  loginTrainer,
  getTrainerClients,
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

export default router;