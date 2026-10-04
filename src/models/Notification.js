import mongoose from "mongoose";

const recipientSchema = new mongoose.Schema(
  {
    recipientId: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["CLIENT", "TRAINER"],
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const notificationSchema = new mongoose.Schema(
  {
    gymId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    senderRole: {
      type: String,
      enum: ["OWNER", "TRAINER"],
      required: true,
    },

    senderId: {
      type: String,
      required: true,
      trim: true,
    },

    audience: {
      type: String,
      enum: ["MEMBERS", "TRAINERS"],
      required: true,
    },

    sendType: {
      type: String,
      enum: ["EVERYONE", "SELECTED"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },

    recipients: {
      type: [recipientSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  gymId: 1,
  createdAt: -1,
});

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;