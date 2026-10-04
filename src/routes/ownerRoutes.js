import express from "express";

import {
    createOwnerPurchase,
    loginOwner,
    getOwnerProfile,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetOwnerPassword,
    updateOwnerProfile,
} from "../controllers/ownerController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/purchase", createOwnerPurchase);

router.post("/login", loginOwner);

router.get("/profile", authMiddleware, getOwnerProfile);

router.post("/forgot-password", sendForgotPasswordOTP);

router.post("/verify-otp", verifyForgotPasswordOTP);

router.post("/reset-password", resetOwnerPassword);

router.get("/profile", authMiddleware, getOwnerProfile);

router.patch(
    "/profile",
    authMiddleware,
    updateOwnerProfile
);

export default router;