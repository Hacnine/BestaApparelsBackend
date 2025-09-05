import express from 'express';
import {
  getUsers,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  login,
  logout,
  changePassword
} from '../controllers/userController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';



const router = express.Router();
router.post('/login', login);

router.use(requireAuth);
router.post('/logout', logout);
router.get('/', getUsers);
router.get('/stats', getUserStats);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.post('/:id/reset-password', changePassword);
export default router;
