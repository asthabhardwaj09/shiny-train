import Notification from "../models/Notification.js";
import Member from "../models/Member.js";
import Trainer from "../models/Trainer.js";


// ======================================================
// SEND NOTIFICATION
// OWNER + TRAINER
// ======================================================

const sendNotification = async (req, res) => {
  try {
    const { audience, sendType, recipientIds, title, message } =
      req.body;

    if (!["OWNER", "TRAINER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only owners and trainers can send notifications",
      });
    }

    if (!audience || !sendType || !title || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Audience, send type, title and message are required",
      });
    }

    const normalizedAudience = audience.toUpperCase();
    const normalizedSendType = sendType.toUpperCase();

    if (!["MEMBERS", "TRAINERS"].includes(normalizedAudience)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification audience",
      });
    }

    if (!["EVERYONE", "SELECTED"].includes(normalizedSendType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid send type",
      });
    }

    if (title.trim().length > 60) {
      return res.status(400).json({
        success: false,
        message: "Notification title cannot exceed 60 characters",
      });
    }

    if (message.trim().length > 240) {
      return res.status(400).json({
        success: false,
        message: "Notification message cannot exceed 240 characters",
      });
    }

    // --------------------------------------------------
    // TRAINER RULES
    // Trainer can notify only assigned members
    // --------------------------------------------------

    if (req.user.role === "TRAINER") {
      if (normalizedAudience !== "MEMBERS") {
        return res.status(403).json({
          success: false,
          message: "Trainers can send notifications only to their assigned members",
        });
      }

      let memberQuery = {
        gymId: req.user.gymId,
        trainerId: req.user.trainerId,
      };

      if (normalizedSendType === "SELECTED") {
        if (
          !Array.isArray(recipientIds) ||
          recipientIds.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "At least one member must be selected",
          });
        }

        memberQuery.clientId = {
          $in: recipientIds.map((id) => String(id).trim()),
        };
      }

      const members = await Member.find(memberQuery).select(
        "clientId"
      );

      if (members.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No assigned members found",
        });
      }

      if (
        normalizedSendType === "SELECTED" &&
        members.length !== recipientIds.length
      ) {
        return res.status(403).json({
          success: false,
          message:
            "One or more selected members are not assigned to this trainer",
        });
      }

      const notification = await Notification.create({
        gymId: req.user.gymId,

        senderRole: "TRAINER",
        senderId: req.user.trainerId,

        audience: "MEMBERS",
        sendType: normalizedSendType,

        title: title.trim(),
        message: message.trim(),

        recipients: members.map((member) => ({
          recipientId: member.clientId,
          role: "CLIENT",
        })),
      });

      return res.status(201).json({
        success: true,
        message: "Notification sent successfully",

        data: {
          notification: {
            id: notification._id,
            audience: notification.audience,
            sendType: notification.sendType,
            recipientCount: notification.recipients.length,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt,
          },
        },
      });
    }


    // --------------------------------------------------
    // OWNER RULES
    // Owner can notify members or trainers in same gym
    // --------------------------------------------------

    let recipients = [];

    if (normalizedAudience === "MEMBERS") {
      let memberQuery = {
        gymId: req.user.gymId,
      };

      if (normalizedSendType === "SELECTED") {
        if (
          !Array.isArray(recipientIds) ||
          recipientIds.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "At least one member must be selected",
          });
        }

        memberQuery.clientId = {
          $in: recipientIds.map((id) => String(id).trim()),
        };
      }

      const members = await Member.find(memberQuery).select(
        "clientId"
      );

      if (members.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No members found",
        });
      }

      if (
        normalizedSendType === "SELECTED" &&
        members.length !== recipientIds.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "One or more selected members do not belong to this gym",
        });
      }

      recipients = members.map((member) => ({
        recipientId: member.clientId,
        role: "CLIENT",
      }));
    }


    if (normalizedAudience === "TRAINERS") {
      let trainerQuery = {
        gymId: req.user.gymId,
      };

      if (normalizedSendType === "SELECTED") {
        if (
          !Array.isArray(recipientIds) ||
          recipientIds.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "At least one trainer must be selected",
          });
        }

        trainerQuery.trainerId = {
          $in: recipientIds.map((id) => String(id).trim()),
        };
      }

      const trainers = await Trainer.find(trainerQuery).select(
        "trainerId"
      );

      if (trainers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No trainers found",
        });
      }

      if (
        normalizedSendType === "SELECTED" &&
        trainers.length !== recipientIds.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "One or more selected trainers do not belong to this gym",
        });
      }

      recipients = trainers.map((trainer) => ({
        recipientId: trainer.trainerId,
        role: "TRAINER",
      }));
    }


    const notification = await Notification.create({
      gymId: req.user.gymId,

      senderRole: "OWNER",
      senderId:
        req.user.ownerId?.toString() || req.user.gymId,

      audience: normalizedAudience,
      sendType: normalizedSendType,

      title: title.trim(),
      message: message.trim(),

      recipients,
    });

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",

      data: {
        notification: {
          id: notification._id,
          audience: notification.audience,
          sendType: notification.sendType,
          recipientCount: notification.recipients.length,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Send notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// GET RECEIVED NOTIFICATIONS
// CLIENT + TRAINER
// ======================================================

const getNotifications = async (req, res) => {
  try {
    let recipientId;
    let recipientRole;

    if (req.user.role === "CLIENT") {
      recipientId = req.user.clientId;
      recipientRole = "CLIENT";
    } else if (req.user.role === "TRAINER") {
      recipientId = req.user.trainerId;
      recipientRole = "TRAINER";
    } else {
      return res.status(403).json({
        success: false,
        message:
          "Only clients and trainers can view received notifications",
      });
    }

    const notifications = await Notification.find({
      gymId: req.user.gymId,

      recipients: {
        $elemMatch: {
          recipientId,
          role: recipientRole,
        },
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedNotifications = notifications.map(
      (notification) => {
        const recipient = notification.recipients.find(
          (item) =>
            item.recipientId === recipientId &&
            item.role === recipientRole
        );

        return {
          id: notification._id,

          senderRole: notification.senderRole,
          senderId: notification.senderId,

          title: notification.title,
          message: notification.message,

          read: recipient?.read || false,
          readAt: recipient?.readAt || null,

          createdAt: notification.createdAt,
        };
      }
    );

    const unreadCount = formattedNotifications.filter(
      (item) => !item.read
    ).length;

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",

      data: {
        unreadCount,
        notifications: formattedNotifications,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// MARK NOTIFICATION AS READ
// ======================================================

const markNotificationAsRead = async (req, res) => {
  try {
    let recipientId;
    let recipientRole;

    if (req.user.role === "CLIENT") {
      recipientId = req.user.clientId;
      recipientRole = "CLIENT";
    } else if (req.user.role === "TRAINER") {
      recipientId = req.user.trainerId;
      recipientRole = "TRAINER";
    } else {
      return res.status(403).json({
        success: false,
        message: "You cannot mark this notification as read",
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      gymId: req.user.gymId,

      recipients: {
        $elemMatch: {
          recipientId,
          role: recipientRole,
        },
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const recipient = notification.recipients.find(
      (item) =>
        item.recipientId === recipientId &&
        item.role === recipientRole
    );

    if (!recipient.read) {
      recipient.read = true;
      recipient.readAt = new Date();

      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// RECENT SENDS
// OWNER + TRAINER
// ======================================================

const getSentNotifications = async (req, res) => {
  try {
    if (!["OWNER", "TRAINER"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only owners and trainers can view sent notifications",
      });
    }

    const query = {
      gymId: req.user.gymId,
      senderRole: req.user.role,
    };

    if (req.user.role === "TRAINER") {
      query.senderId = req.user.trainerId;
    }

    if (req.user.role === "OWNER" && req.user.ownerId) {
      query.senderId = req.user.ownerId.toString();
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const recentSends = notifications.map((notification) => ({
      id: notification._id,

      audience: notification.audience,
      sendType: notification.sendType,

      title: notification.title,
      message: notification.message,

      recipientCount: notification.recipients.length,

      createdAt: notification.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Sent notifications fetched successfully",

      data: {
        notifications: recentSends,
      },
    });
  } catch (error) {
    console.error("Get sent notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  sendNotification,
  getNotifications,
  markNotificationAsRead,
  getSentNotifications,
};