import express from 'express';
import {
  getTNAs,
  updateTNA,
  deleteTNA,
  getDepartmentProgress,
  getTNASummary,
  getTNASummaryCard,
  createTna
} from '../controllers/tnaController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(requireAuth)

router.get('/', getTNAs);
router.post('/', createTna);
router.put('/:id', updateTNA);
router.delete('/:id', deleteTNA);
router.get('/department-progress', getDepartmentProgress);
router.get('/get-tna-summary', getTNASummary);
router.get('/get-tna-summary-card', getTNASummaryCard);

export default router;
