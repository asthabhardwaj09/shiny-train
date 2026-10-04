import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    planName: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    gymId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Trainer assigned by owner
    // Trainer assigned by owner - optional
    trainerId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
    },

    membershipPlan: {
      type: String,
      enum: ["BASIC", "STANDARD", "PREMIUM"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

const Member = mongoose.model("Member", memberSchema);

export default Member;