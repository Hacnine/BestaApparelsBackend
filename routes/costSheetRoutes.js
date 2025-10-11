import express from "express";
import {
  getAllCostSheets,
  getCostSheetById,
  createCostSheet,
  updateCostSheet,
  deleteCostSheet,
} from "../controllers/costSheetController.js";
import { requireAuth } from '../middlewares/authMiddleware.js';


const costSheetRoutes = express.Router();
costSheetRoutes.use(requireAuth);
costSheetRoutes.get("/", getAllCostSheets);
costSheetRoutes.get("/:id", getCostSheetById);
costSheetRoutes.post("/", createCostSheet);
costSheetRoutes.put("/:id", updateCostSheet);
costSheetRoutes.delete("/:id", deleteCostSheet);

export default costSheetRoutes;
