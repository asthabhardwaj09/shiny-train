import ClientMeasurement from "../models/ClientMeasurement.js";
import Workout from "../models/Workout.js";


// ======================================================
// ADD MEASUREMENT
// ======================================================

const addMeasurement = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message: "Only clients can add measurements",
      });
    }

    const {
      weight,
      bodyFat,
      waist,
      height,
      recordedAt,
    } = req.body;

    if (
      weight === undefined ||
      weight === null ||
      weight === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Weight is required",
      });
    }

    const numericWeight = Number(weight);

    if (
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Weight must be a valid positive number",
      });
    }

    const numericBodyFat =
      bodyFat === undefined ||
      bodyFat === null ||
      bodyFat === ""
        ? null
        : Number(bodyFat);

    if (
      numericBodyFat !== null &&
      (
        !Number.isFinite(numericBodyFat) ||
        numericBodyFat < 0 ||
        numericBodyFat > 100
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Body fat must be between 0 and 100",
      });
    }

    const numericWaist =
      waist === undefined ||
      waist === null ||
      waist === ""
        ? null
        : Number(waist);

    if (
      numericWaist !== null &&
      (
        !Number.isFinite(numericWaist) ||
        numericWaist <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Waist must be a valid positive number",
      });
    }

    const numericHeight =
      height === undefined ||
      height === null ||
      height === ""
        ? null
        : Number(height);

    if (
      numericHeight !== null &&
      (
        !Number.isFinite(numericHeight) ||
        numericHeight <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Height must be a valid positive number",
      });
    }

    let bmi = null;

    if (numericHeight !== null) {
      const heightInMeters =
        numericHeight / 100;

      bmi = Number(
        (
          numericWeight /
          (heightInMeters * heightInMeters)
        ).toFixed(1)
      );
    }

    let measurementDate = new Date();

    if (recordedAt) {
      measurementDate = new Date(recordedAt);

      if (
        Number.isNaN(
          measurementDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid measurement date",
        });
      }
    }

    const measurement =
      await ClientMeasurement.create({
        clientId: req.user.clientId,
        gymId: req.user.gymId,

        weight: numericWeight,
        bodyFat: numericBodyFat,
        waist: numericWaist,
        height: numericHeight,
        bmi,

        recordedAt: measurementDate,
      });

    return res.status(201).json({
      success: true,
      message: "Measurement added successfully",

      data: {
        measurement: {
          id: measurement._id,
          weight: measurement.weight,
          bodyFat: measurement.bodyFat,
          waist: measurement.waist,
          height: measurement.height,
          bmi: measurement.bmi,
          recordedAt: measurement.recordedAt,
        },
      },
    });
  } catch (error) {
    console.error(
      "Add measurement error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// GET PROGRESS DASHBOARD
// ======================================================

const getClientProgress = async (req, res) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message: "Only clients can access progress",
      });
    }

    const measurements =
      await ClientMeasurement.find({
        clientId: req.user.clientId,
        gymId: req.user.gymId,
      })
        .sort({ recordedAt: 1 })
        .lean();

    const latestMeasurement =
      measurements.length > 0
        ? measurements[
            measurements.length - 1
          ]
        : null;

    const firstMeasurement =
      measurements.length > 0
        ? measurements[0]
        : null;

    let weightChange = null;
    let bodyFatChange = null;

    if (
      firstMeasurement &&
      latestMeasurement
    ) {
      weightChange = Number(
        (
          latestMeasurement.weight -
          firstMeasurement.weight
        ).toFixed(1)
      );

      if (
        firstMeasurement.bodyFat !== null &&
        latestMeasurement.bodyFat !== null
      ) {
        bodyFatChange = Number(
          (
            latestMeasurement.bodyFat -
            firstMeasurement.bodyFat
          ).toFixed(1)
        );
      }
    }

    // Current week
    const now = new Date();

    const startOfWeek = new Date(now);

    const currentDay =
      startOfWeek.getDay();

    const difference =
      currentDay === 0
        ? -6
        : 1 - currentDay;

    startOfWeek.setDate(
      startOfWeek.getDate() + difference
    );

    startOfWeek.setHours(
      0,
      0,
      0,
      0
    );

    const endOfWeek =
      new Date(startOfWeek);

    endOfWeek.setDate(
      endOfWeek.getDate() + 6
    );

    endOfWeek.setHours(
      23,
      59,
      59,
      999
    );

    const weeklyWorkouts =
      await Workout.find({
        clientId: req.user.clientId,
        gymId: req.user.gymId,

        date: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      }).lean();

    const completedThisWeek =
      weeklyWorkouts.filter(
        (workout) =>
          workout.status === "COMPLETED"
      ).length;

    const totalThisWeek =
      weeklyWorkouts.length;

    const totalCompletedWorkouts =
      await Workout.countDocuments({
        clientId: req.user.clientId,
        gymId: req.user.gymId,
        status: "COMPLETED",
      });

    const graphData =
      measurements.map(
        (measurement) => ({
          date:
            measurement.recordedAt,

          weight:
            measurement.weight,

          bodyFat:
            measurement.bodyFat,

          waist:
            measurement.waist,

          bmi:
            measurement.bmi,
        })
      );

    return res.status(200).json({
      success: true,
      message:
        "Client progress fetched successfully",

      data: {
        current: latestMeasurement
          ? {
              weight:
                latestMeasurement.weight,

              bodyFat:
                latestMeasurement.bodyFat,

              waist:
                latestMeasurement.waist,

              height:
                latestMeasurement.height,

              bmi:
                latestMeasurement.bmi,

              recordedAt:
                latestMeasurement.recordedAt,
            }
          : null,

        changes: {
          weight: weightChange,
          bodyFat: bodyFatChange,
        },

        workouts: {
          thisWeek: {
            total: totalThisWeek,
            completed:
              completedThisWeek,
          },

          totalCompleted:
            totalCompletedWorkouts,
        },

        graph: graphData,
      },
    });
  } catch (error) {
    console.error(
      "Get client progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ======================================================
// GET MEASUREMENT HISTORY
// ======================================================

const getMeasurementHistory = async (
  req,
  res
) => {
  try {
    if (req.user.role !== "CLIENT") {
      return res.status(403).json({
        success: false,
        message:
          "Only clients can access measurement history",
      });
    }

    const measurements =
      await ClientMeasurement.find({
        clientId: req.user.clientId,
        gymId: req.user.gymId,
      })
        .sort({
          recordedAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      message:
        "Measurement history fetched successfully",

      data: {
        totalMeasurements:
          measurements.length,

        measurements:
          measurements.map(
            (measurement) => ({
              id:
                measurement._id,

              weight:
                measurement.weight,

              bodyFat:
                measurement.bodyFat,

              waist:
                measurement.waist,

              height:
                measurement.height,

              bmi:
                measurement.bmi,

              recordedAt:
                measurement.recordedAt,
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "Measurement history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export {
  addMeasurement,
  getClientProgress,
  getMeasurementHistory,
};