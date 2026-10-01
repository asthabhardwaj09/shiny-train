import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    sets: {
      type: Number,
      required: true,
      min: 1,
    },

    reps: {
      type: Number,
      required: true,
      min: 1,
    },

    weight: {
      type: Number,
      default: 0,
      min: 0,
    },

    restSeconds: {
      type: Number,
      default: 60,
      min: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const workoutSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    muscleGroups: {
      type: [String],
      default: [],
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    duration: {
      type: Number,
      required: true,
      min: 1,
    },

    estimatedCalories: {
      type: Number,
      default: 0,
      min: 0,
    },

    exercises: {
      type: [exerciseSchema],
      required: true,
      validate: {
        validator: function (exercises) {
          return exercises.length > 0;
        },
        message: "At least one exercise is required",
      },
    },

    status: {
      type: String,
      enum: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"],
      default: "ASSIGNED",
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
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

workoutSchema.index({
  clientId: 1,
  gymId: 1,
  date: 1,
});

const Workout = mongoose.model("Workout", workoutSchema);

export default Workout;