import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createEmployee, getEmployees, updateEmployeeStatus } from '../controllers/employeeController.js';

const employeeRouter = express.Router();
employeeRouter.use(requireAuth);

employeeRouter.post('/create-employee', createEmployee);
employeeRouter.get('/employees', getEmployees);
employeeRouter.patch('/employee/:id/status', updateEmployeeStatus);

export default employeeRouter;