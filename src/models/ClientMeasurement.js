import mongoose from "mongoose";

const clientMeasurementSchema = new mongoose.Schema(
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

    weight: {
      type: Number,
      required: true,
      min: 1,
    },

    bodyFat: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    waist: {
      type: Number,
      default: null,
      min: 0,
    },

    height: {
      type: Number,
      default: null,
      min: 1,
    },

    bmi: {
      type: Number,
      default: null,
    },

    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

clientMeasurementSchema.index({
  clientId: 1,
  gymId: 1,
  recordedAt: -1,
});

const ClientMeasurement = mongoose.model(
  "ClientMeasurement",
  clientMeasurementSchema
);

export default ClientMeasurement;