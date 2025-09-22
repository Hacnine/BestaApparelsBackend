import express from "express";
import {
  createFabricBooking,
  getFabricBooking,
  updateFabricBooking,
  deleteFabricBooking,
} from "../controllers/fabricBookingController.js";

const fabricBookingRoute = express.Router();

fabricBookingRoute.post("/", createFabricBooking);
fabricBookingRoute.get("/", getFabricBooking);
fabricBookingRoute.put("/:id", updateFabricBooking);
fabricBookingRoute.delete("/:id", deleteFabricBooking);

export default fabricBookingRoute;
