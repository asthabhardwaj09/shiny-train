import mongoose from "mongoose";

const mealSchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      required: true,
      enum: [
        "BREAKFAST",
        "LUNCH",
        "SNACK",
        "DINNER",
      ],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    calories: {
      type: Number,
      required: true,
      min: 0,
    },

    protein: {
      type: Number,
      default: 0,
      min: 0,
    },

    carbs: {
      type: Number,
      default: 0,
      min: 0,
    },

    fat: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const clientNutritionSchema = new mongoose.Schema(
  {
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

    calorieGoal: {
      type: Number,
      default: 2000,
      min: 0,
    },

    proteinGoal: {
      type: Number,
      default: 120,
      min: 0,
    },

    carbsGoal: {
      type: Number,
      default: 250,
      min: 0,
    },

    fatGoal: {
      type: Number,
      default: 65,
      min: 0,
    },

    waterGoal: {
      type: Number,
      default: 2000,
      min: 0,
    },

    waterConsumed: {
      type: Number,
      default: 0,
      min: 0,
    },

    meals: {
      type: [mealSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

clientNutritionSchema.index(
  {
    clientId: 1,
    gymId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

const ClientNutrition = mongoose.model(
  "ClientNutrition",
  clientNutritionSchema
);

export default ClientNutrition;