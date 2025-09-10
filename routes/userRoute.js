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
  changePassword,
  getUserInfo
} from '../controllers/userController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';



const router = express.Router();
router.post('/login', login);
router.use(requireAuth);
router.post('/logout', logout);
router.get('/user-info', getUserInfo)
router.get('/users', getUsers);
router.get('/stats', getUserStats);
router.post('/create-user', createUser);
router.put('/update/:id', updateUser);
router.delete('/delete/:id', deleteUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.post('/:id/reset-password', changePassword);
export default router;
