import express from "express";

import {
  getClientDashboard,
} from "../controllers/clientDashboardController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getClientDashboard);

export default router;