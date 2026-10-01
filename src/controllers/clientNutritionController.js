import ClientNutrition from "../models/ClientNutrition.js";


// ======================================================
// HELPER - GET START OF DATE
// ======================================================

const normalizeDate = (dateValue) => {
  const date = dateValue
    ? new Date(dateValue)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};


// ======================================================
// GET NUTRITION DASHBOARD
// ======================================================

const getNutritionDashboard = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message: "Only clients can access nutrition",
      });
    }

    const selectedDate = normalizeDate(
      req.query.date
    );

    if (!selectedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    let nutrition =
      await ClientNutrition.findOne({
        clientId: req.user.clientId,
        gymId: req.user.gymId,
        date: selectedDate,
      });

    // Create today's record if it does not exist
    if (!nutrition) {
      nutrition =
        await ClientNutrition.create({
          clientId: req.user.clientId,
          gymId: req.user.gymId,
          date: selectedDate,
        });
    }

    const totals =
      nutrition.meals.reduce(
        (result, meal) => {
          result.calories += meal.calories;
          result.protein += meal.protein;
          result.carbs += meal.carbs;
          result.fat += meal.fat;

          return result;
        },
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      );

    const remainingCalories = Math.max(
      nutrition.calorieGoal -
        totals.calories,
      0
    );

    const caloriePercentage =
      nutrition.calorieGoal > 0
        ? Math.min(
            Math.round(
              (totals.calories /
                nutrition.calorieGoal) *
                100
            ),
            100
          )
        : 0;

    const waterPercentage =
      nutrition.waterGoal > 0
        ? Math.min(
            Math.round(
              (nutrition.waterConsumed /
                nutrition.waterGoal) *
                100
            ),
            100
          )
        : 0;

    return res.status(200).json({
      success: true,
      message:
        "Nutrition dashboard fetched successfully",

      data: {
        date: nutrition.date,

        calories: {
          goal: nutrition.calorieGoal,
          consumed: totals.calories,
          remaining: remainingCalories,
          percentage: caloriePercentage,
        },

        macros: {
          protein: {
            goal: nutrition.proteinGoal,
            consumed: totals.protein,
          },

          carbs: {
            goal: nutrition.carbsGoal,
            consumed: totals.carbs,
          },

          fat: {
            goal: nutrition.fatGoal,
            consumed: totals.fat,
          },
        },

        hydration: {
          goal: nutrition.waterGoal,
          consumed: nutrition.waterConsumed,

          remaining: Math.max(
            nutrition.waterGoal -
              nutrition.waterConsumed,
            0
          ),

          percentage: waterPercentage,
        },

        meals: nutrition.meals,
      },
    });
  } catch (error) {
    console.error(
      "Nutrition dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// ADD MEAL
// ======================================================

const addMeal = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message: "Only clients can log meals",
      });
    }

    const {
      mealType,
      name,
      calories,
      protein = 0,
      carbs = 0,
      fat = 0,
      date,
    } = req.body;

    if (
      !mealType ||
      !name ||
      calories === undefined ||
      calories === null ||
      calories === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Meal type, name and calories are required",
      });
    }

    const normalizedMealType =
      mealType.toUpperCase();

    const allowedMealTypes = [
      "BREAKFAST",
      "LUNCH",
      "SNACK",
      "DINNER",
    ];

    if (
      !allowedMealTypes.includes(
        normalizedMealType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal type",
      });
    }

    const numericCalories =
      Number(calories);

    const numericProtein =
      Number(protein);

    const numericCarbs =
      Number(carbs);

    const numericFat =
      Number(fat);

    if (
      !Number.isFinite(numericCalories) ||
      numericCalories < 0 ||
      !Number.isFinite(numericProtein) ||
      numericProtein < 0 ||
      !Number.isFinite(numericCarbs) ||
      numericCarbs < 0 ||
      !Number.isFinite(numericFat) ||
      numericFat < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Calories and macros must be valid non-negative numbers",
      });
    }

    const selectedDate =
      normalizeDate(date);

    if (!selectedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    let nutrition =
      await ClientNutrition.findOne({
        clientId: req.user.clientId,
        gymId: req.user.gymId,
        date: selectedDate,
      });

    if (!nutrition) {
      nutrition =
        await ClientNutrition.create({
          clientId: req.user.clientId,
          gymId: req.user.gymId,
          date: selectedDate,
        });
    }

    nutrition.meals.push({
      mealType: normalizedMealType,
      name: name.trim(),
      calories: numericCalories,
      protein: numericProtein,
      carbs: numericCarbs,
      fat: numericFat,
    });

    await nutrition.save();

    const addedMeal =
      nutrition.meals[
        nutrition.meals.length - 1
      ];

    return res.status(201).json({
      success: true,
      message: "Meal logged successfully",

      data: {
        meal: addedMeal,
      },
    });
  } catch (error) {
    console.error(
      "Add meal error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// UPDATE HYDRATION
// ======================================================

const updateHydration = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message:
          "Only clients can update hydration",
      });
    }

    const {
      amount,
      action = "ADD",
      date,
    } = req.body;

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid positive water amount is required",
      });
    }

    const normalizedAction =
      action.toUpperCase();

    if (
      !["ADD", "REMOVE"].includes(
        normalizedAction
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Action must be ADD or REMOVE",
      });
    }

    const selectedDate =
      normalizeDate(date);

    if (!selectedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    let nutrition =
      await ClientNutrition.findOne({
        clientId: req.user.clientId,
        gymId: req.user.gymId,
        date: selectedDate,
      });

    if (!nutrition) {
      nutrition =
        await ClientNutrition.create({
          clientId: req.user.clientId,
          gymId: req.user.gymId,
          date: selectedDate,
        });
    }

    if (normalizedAction === "ADD") {
      nutrition.waterConsumed +=
        numericAmount;
    } else {
      nutrition.waterConsumed =
        Math.max(
          nutrition.waterConsumed -
            numericAmount,
          0
        );
    }

    await nutrition.save();

    const percentage =
      nutrition.waterGoal > 0
        ? Math.min(
            Math.round(
              (nutrition.waterConsumed /
                nutrition.waterGoal) *
                100
            ),
            100
          )
        : 0;

    return res.status(200).json({
      success: true,
      message:
        "Hydration updated successfully",

      data: {
        hydration: {
          goal: nutrition.waterGoal,

          consumed:
            nutrition.waterConsumed,

          remaining: Math.max(
            nutrition.waterGoal -
              nutrition.waterConsumed,
            0
          ),

          percentage,
        },
      },
    });
  } catch (error) {
    console.error(
      "Update hydration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  getNutritionDashboard,
  addMeal,
  updateHydration,
};