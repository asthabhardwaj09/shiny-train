import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Member from "../models/Member.js";

const clientLogin = async (req, res) => {
  try {
    const { clientId, password } = req.body;

    if (!clientId || !password) {
      return res.status(400).json({
        success: false,
        message: "Client ID and password are required",
      });
    }

    // Find client
    const member = await Member.findOne({
      clientId: clientId.trim(),
    });

    if (!member) {
      return res.status(401).json({
        success: false,
        message: "Invalid Client ID or password",
      });
    }

    // Check membership/client status
    if (member.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your membership is not active",
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      member.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid Client ID or password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: member._id,
        clientId: member.clientId,
        gymId: member.gymId,
        trainerId: member.trainerId,
        role: "CLIENT",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Client login successful",
      data: {
        token,
        client: {
          id: member._id,
          clientId: member.clientId,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          gymId: member.gymId,
          trainerId: member.trainerId,
          membershipPlan: member.membershipPlan,
          planName: member.planName,
          startDate: member.startDate,
          endDate: member.endDate,
          status: member.status,
        },
      },
    });
  } catch (error) {
    console.error("Client login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { clientLogin };