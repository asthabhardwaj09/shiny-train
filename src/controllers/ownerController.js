import Owner from "../models/Owner.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import PasswordResetOTP from "../models/PasswordResetOTP.js";
import { sendPasswordResetOTP } from "../services/emailService.js";

const createOwnerPurchase = async (req, res) => {
    try {
        const {
            gymName,
            gymId,
            password,
            ownerName,
            email,
            phone,
            plan,
        } = req.body;

        if (
            !gymName ||
            !gymId ||
            !password ||
            !ownerName ||
            !email ||
            !phone ||
            !plan
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const validPlans = ["STARTER", "PRO", "ELITE"];

        if (!validPlans.includes(plan)) {
            return res.status(400).json({
                success: false,
                message: "Invalid membership plan",
            });
        }

        const existingGym = await Owner.findOne({ gymId });

        if (existingGym) {
            return res.status(409).json({
                success: false,
                message: "Gym ID already exists",
            });
        }

        const existingEmail = await Owner.findOne({ email });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const owner = await Owner.create({
            gymName,
            gymId,
            password: hashedPassword,
            ownerName,
            email,
            phone,
            plan,
            paymentStatus: "PENDING",
            membershipStatus: "PENDING",
        });

        return res.status(201).json({
            success: true,
            message: "Gym setup completed. Proceed to payment.",
            data: {
                ownerId: owner._id,
                gymName: owner.gymName,
                gymId: owner.gymId,
                plan: owner.plan,
                paymentStatus: owner.paymentStatus,
            },
        });
    } catch (error) {
        console.error("Create owner error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const loginOwner = async (req, res) => {
    try {
        const { gymId, password } = req.body;

        if (!gymId || !password) {
            return res.status(400).json({
                success: false,
                message: "Gym ID and password are required",
            });
        }

        const owner = await Owner.findOne({ gymId });

        if (!owner) {
            return res.status(401).json({
                success: false,
                message: "Invalid Gym ID or password",
            });
        }

        if (owner.paymentStatus !== "APPROVED") {
            return res.status(403).json({
                success: false,
                message: "Payment is not approved yet",
            });
        }

        if (owner.membershipStatus !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Membership is not active",
            });
        }

        if (
            owner.membershipEndDate &&
            new Date() > new Date(owner.membershipEndDate)
        ) {
            owner.membershipStatus = "EXPIRED";
            await owner.save();

            return res.status(403).json({
                success: false,
                message: "Membership has expired",
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            owner.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid Gym ID or password",
            });
        }

        const token = jwt.sign(
            {
                ownerId: owner._id,
                gymId: owner.gymId,
                role: "OWNER",
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );

        return res.status(200).json({
            success: true,
            message: "Owner login successful",
            data: {
                token,
                owner: {
                    id: owner._id,
                    gymName: owner.gymName,
                    gymId: owner.gymId,
                    ownerName: owner.ownerName,
                    email: owner.email,
                    plan: owner.plan,
                    membershipStatus: owner.membershipStatus,
                    membershipStartDate: owner.membershipStartDate,
                    membershipEndDate: owner.membershipEndDate,
                },
            },
        });
    } catch (error) {
        console.error("Owner login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getOwnerProfile = async (req, res) => {
    try {
        const owner = await Owner.findById(req.user.ownerId).select(
            "-password"
        );

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Owner profile fetched successfully",
            data: {
                owner,
            },
        });
    } catch (error) {
        console.error("Get owner profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const updateOwnerProfile = async (req, res) => {
    try {
        if (req.user.role !== "OWNER") {
            return res.status(403).json({
                success: false,
                message: "Only gym owners can update profile",
            });
        }

        const {
            ownerName,
            gymName,
            email,
            phone,
        } = req.body;

        if (!ownerName || !gymName || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: "Owner name, gym name, email and phone are required",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Make sure another owner is not using this email
        const existingOwner = await Owner.findOne({
            email: normalizedEmail,
            _id: { $ne: req.user.ownerId },
        });

        if (existingOwner) {
            return res.status(409).json({
                success: false,
                message: "Email is already in use",
            });
        }

        const owner = await Owner.findById(req.user.ownerId);

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner not found",
            });
        }

        owner.ownerName = ownerName.trim();
        owner.gymName = gymName.trim();
        owner.email = normalizedEmail;
        owner.phone = phone.trim();

        await owner.save();

        return res.status(200).json({
            success: true,
            message: "Owner profile updated successfully",
            data: {
                owner: {
                    id: owner._id,
                    ownerName: owner.ownerName,
                    gymName: owner.gymName,
                    gymId: owner.gymId,
                    email: owner.email,
                    phone: owner.phone,
                    plan: owner.plan,
                    membershipStatus: owner.membershipStatus,
                },
            },
        });
    } catch (error) {
        console.error("Update owner profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const sendForgotPasswordOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const owner = await Owner.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner with this email does not exist",
            });
        }

        // Password reset is available only for purchased/approved gym accounts
        if (owner.paymentStatus !== "APPROVED") {
            return res.status(403).json({
                success: false,
                message:
                    "Password reset is available only for purchased gym accounts",
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Remove any previous OTP for this email
        await PasswordResetOTP.deleteMany({
            email: owner.email,
        });

        await PasswordResetOTP.create({
            email: owner.email,
            otp,
            expiresAt,
        });

        await sendPasswordResetOTP({
            email: owner.email,
            ownerName: owner.ownerName,
            otp,
        });

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your registered email",
        });
    } catch (error) {
        console.error("Send forgot password OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        const owner = await Owner.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner with this email does not exist",
            });
        }

        const otpRecord = await PasswordResetOTP.findOne({
            email: owner.email,
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired",
            });
        }

        if (otpRecord.verified) {
            return res.status(400).json({
                success: false,
                message: "OTP has already been verified",
            });
        }

        if (new Date() > new Date(otpRecord.expiresAt)) {
            await PasswordResetOTP.deleteOne({
                _id: otpRecord._id,
            });

            return res.status(400).json({
                success: false,
                message: "OTP has expired",
            });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        otpRecord.verified = true;

        await otpRecord.save();

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
        });
    } catch (error) {
        console.error("Verify forgot password OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const resetOwnerPassword = async (req, res) => {
    try {
        const {
            email,
            gymId,
            newPassword,
            confirmPassword,
        } = req.body;

        if (!email || !gymId || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message:
                    "Email, Gym ID, new password and confirm password are required",
            });
        }

        // Check whether both password fields match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password do not match",
            });
        }

        // Password validation according to Reset Password UI
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character",
            });
        }

        const owner = await Owner.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner with this email does not exist",
            });
        }

        // Verify that Gym ID belongs to the same owner
        if (owner.gymId !== gymId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Invalid Gym ID",
            });
        }

        // Keep the existing OTP verification requirement
        const otpRecord = await PasswordResetOTP.findOne({
            email: owner.email,
            verified: true,
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP verification is required",
            });
        }

        const hashedPassword = await bcrypt.hash(
            newPassword,
            10
        );

        owner.password = hashedPassword;

        await owner.save();

        // OTP cannot be reused after password reset
        await PasswordResetOTP.deleteOne({
            _id: otpRecord._id,
        });

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (error) {
        console.error("Reset owner password error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export {
    createOwnerPurchase,
    loginOwner,
    getOwnerProfile,
    updateOwnerProfile,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetOwnerPassword,
};