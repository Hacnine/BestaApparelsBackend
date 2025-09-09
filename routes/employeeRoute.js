import express from 'express';

import { requireAuth } from '../middlewares/authMiddleware.js'
import { createEmployee } from '../controllers/employeeController.js';


const router = express.Router();
router.use(requireAuth);

router.post('/create-employee', createEmployee);
// router.put('/:id', updateUser);

export default router;
