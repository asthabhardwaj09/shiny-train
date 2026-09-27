import mongoose from "mongoose";

const trainingSessionSchema = new mongoose.Schema(
  {
    trainerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    clientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    gymId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    time: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: Number,
      required: true,
      enum: [30, 45, 60, 90],
    },

    sessionType: {
      type: String,
      required: true,
      enum: [
        "Personal Training",
        "Strength Training",
        "HIIT Workout",
        "Cardio Training",
        "Weight Loss Session",
        "Muscle Building",
        "Mobility & Stretching",
      ],
    },

    location: {
      type: String,
      required: true,
      enum: [
        "Gym Floor - Zone A",
        "Weight Area - Zone B",
        "Functional Area",
        "Cardio Zone",
        "Studio Room",
      ],
    },

    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const TrainingSession = mongoose.model(
  "TrainingSession",
  trainingSessionSchema
);

export default TrainingSession;