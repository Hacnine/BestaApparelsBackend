import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createBuyer, createDepartment, getBuyers, getDepartments, getMerchandisers } from '../controllers/merchandiserController.js';
import { createTna } from '../controllers/tnaController.js';

const merchandiserRoute = express.Router();

merchandiserRoute.use(requireAuth);
merchandiserRoute.post('/create-buyer', createBuyer);
merchandiserRoute.post('/create-department', createDepartment);
merchandiserRoute.post('/create-tna', createTna);
merchandiserRoute.get('/merchandisers', getMerchandisers);
merchandiserRoute.get('/buyers', getBuyers);
merchandiserRoute.post('/departments', getDepartments);



export default merchandiserRoute;
