import express from "express";
import { createDHLTracking } from "../controllers/dhlTrackingController.js";

const dhlTrackingRoute = express.Router();

dhlTrackingRoute.post("/create", createDHLTracking);

export default dhlTrackingRoute;
