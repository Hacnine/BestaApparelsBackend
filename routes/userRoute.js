import express from 'express';
import {
  getUsers,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/userController.js';

const router = express.Router();

// Get all users (with search/filter)
router.get('/', getUsers);

// Get user stats
router.get('/stats', getUserStats);

// Create user
router.post('/', createUser);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

// Toggle user status
router.patch('/:id/toggle-status', toggleUserStatus);

export default router;
