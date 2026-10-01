import express from "express";

import {
  getClientProfile,
  updateClientProfile,
} from "../controllers/clientProfileController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getClientProfile
);

router.patch(
  "/",
  authMiddleware,
  updateClientProfile
);

export default router;