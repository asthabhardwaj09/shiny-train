import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./src/config/db.js";

import ownerRoutes from "./src/routes/ownerRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import memberRoutes from "./src/routes/memberRoutes.js";
import trainerRoutes from "./src/routes/trainerRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import planRoutes from "./src/routes/planRoutes.js";
import sessionRoutes from "./src/routes/sessionRoutes.js";

import trainerDashboardRoutes from "./src/routes/trainerDashboardRoutes.js";
import trainerProgressRoutes from "./src/routes/trainerProgressRoutes.js";
import trainerProfileRoutes from "./src/routes/trainerProfileRoutes.js";

import clientAuthRoutes from "./src/routes/clientAuthRoutes.js";
import clientDashboardRoutes from "./src/routes/clientDashboardRoutes.js";

import trainerWorkoutRoutes from "./src/routes/trainerWorkoutRoutes.js";
import clientWorkoutRoutes from "./src/routes/clientWorkoutRoutes.js";
import clientProgressRoutes from "./src/routes/clientProgressRoutes.js";

import clientNutritionRoutes from "./src/routes/clientNutritionRoutes.js";
import clientProfileRoutes from "./src/routes/clientProfileRoutes.js";

import notificationRoutes from "./src/routes/notificationRoutes.js";

dotenv.config();

const app = express();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());


// ======================================================
// OWNER ROUTES
// ======================================================

app.use("/api/owner", ownerRoutes);

app.use(
  "/api/owner/dashboard",
  dashboardRoutes
);


// ======================================================
// PAYMENT ROUTES
// ======================================================

app.use("/api/payment", paymentRoutes);


// ======================================================
// MEMBER ROUTES
// ======================================================

app.use("/api/members", memberRoutes);


// ======================================================
// PLAN ROUTES
// ======================================================

app.use("/api/plans", planRoutes);


// ======================================================
// TRAINER SPECIFIC ROUTES
// IMPORTANT:
// These must stay BEFORE app.use("/api/trainers", trainerRoutes)
// because trainerRoutes contains /:trainerId
// ======================================================

app.use(
  "/api/trainers/sessions",
  sessionRoutes
);

app.use(
  "/api/trainers/progress",
  trainerProgressRoutes
);

app.use(
  "/api/trainers/dashboard",
  trainerDashboardRoutes
);

app.use(
  "/api/trainers/profile",
  trainerProfileRoutes
);

app.use(
  "/api/trainers/workouts",
  trainerWorkoutRoutes
);


// ======================================================
// GENERIC TRAINER ROUTES
// Keep this AFTER all specific /api/trainers/... routes
// ======================================================

app.use("/api/trainers", trainerRoutes);


// ======================================================
// CLIENT ROUTES
// ======================================================

app.use(
  "/api/client/auth",
  clientAuthRoutes
);

app.use(
  "/api/client/dashboard",
  clientDashboardRoutes
);

app.use(
  "/api/client/workouts",
  clientWorkoutRoutes
);

app.use(
  "/api/client/progress",
  clientProgressRoutes
);

app.use(
  "/api/client/nutrition",
  clientNutritionRoutes
);

app.use(
  "/api/client/profile",
  clientProfileRoutes
);


// ======================================================
// NOTIFICATION ROUTES
// ======================================================

app.use(
  "/api/notifications",
  notificationRoutes
);


// ======================================================
// DEPLOYMENT TEST ROUTE
// ======================================================

app.get("/api/test-deployment", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Latest Karan Trainer Gym backend is deployed",
  });
});


// ======================================================
// ROOT ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Karan Trainer Gym Backend is running",
  });
});


// ======================================================
// SERVER
// ======================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();