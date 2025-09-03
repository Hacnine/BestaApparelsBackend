import express from 'express';
import {
  getDashboardStats,
  getRecentActivities,
  getDashboardDepartmentProgress
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/recent-activities', getRecentActivities);
router.get('/department-progress', getDashboardDepartmentProgress);

export default router;
