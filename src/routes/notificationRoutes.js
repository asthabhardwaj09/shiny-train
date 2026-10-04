import express from "express";

import {
  sendNotification,
  getNotifications,
  markNotificationAsRead,
  getSentNotifications,
} from "../controllers/notificationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  sendNotification
);

router.get(
  "/",
  authMiddleware,
  getNotifications
);

router.get(
  "/sent",
  authMiddleware,
  getSentNotifications
);

router.patch(
  "/:notificationId/read",
  authMiddleware,
  markNotificationAsRead
);

export default router;