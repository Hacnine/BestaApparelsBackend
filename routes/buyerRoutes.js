import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createBuyer, deleteBuyer, editBuyer, getBuyers } from '../controllers/buyerController.js';

const buyerRouter = express.Router();

buyerRouter.post('/create-buyer',requireAuth, createBuyer);
buyerRouter.get('',requireAuth, getBuyers);
buyerRouter.patch('/:id',requireAuth, editBuyer);
buyerRouter.delete('/:id',requireAuth, deleteBuyer);

export default buyerRouter;