import express from "express";

import {
  addMember,
  getMembers,
  deleteMember,
} from "../controllers/memberController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getMembers);

router.post("/", authMiddleware, addMember);

router.delete(
  "/:clientId",
  authMiddleware,
  deleteMember
);

export default router;