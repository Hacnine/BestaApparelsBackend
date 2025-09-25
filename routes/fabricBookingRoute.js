import express from "express";
import {
  createFabricBooking,
  getFabricBooking,
  updateFabricBooking,
  deleteFabricBooking,
} from "../controllers/fabricBookingController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const fabricBookingRoute = express.Router();
fabricBookingRoute.use(requireAuth);
fabricBookingRoute.post("/", createFabricBooking);
fabricBookingRoute.get("/", getFabricBooking);
fabricBookingRoute.put("/update/:id", updateFabricBooking);
fabricBookingRoute.delete("/delete/:id", deleteFabricBooking);

export default fabricBookingRoute;
