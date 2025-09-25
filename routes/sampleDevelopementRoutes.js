import express from "express";
import {
  createSampleDevelopment,
  getSampleDevelopment,
  updateSampleDevelopment,
  deleteSampleDevelopment,
} from "../controllers/sampleDevelopementController.js";

const sampleDevelopmentRoute = express.Router();

// Create
sampleDevelopmentRoute.post("/", createSampleDevelopment);

// Read (with pagination)
sampleDevelopmentRoute.get("/", getSampleDevelopment);

// Update
sampleDevelopmentRoute.patch("/update/:id", updateSampleDevelopment);

// Delete
sampleDevelopmentRoute.delete("/delete/:id", deleteSampleDevelopment);

export default sampleDevelopmentRoute;
