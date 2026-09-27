import express from "express";

import {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from "../controllers/sessionController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getSessions);

router.post("/", authMiddleware, createSession);

router.get("/:sessionId", authMiddleware, getSessionById);

router.put("/:sessionId", authMiddleware, updateSession);

router.delete("/:sessionId", authMiddleware, deleteSession);

export default router;