import express from 'express';
import {
  getTNAs,
  createTNA,
  updateTNA,
  deleteTNA,
  getDepartmentProgress,
  getTNASummary,
  getTNASummaryCard
} from '../controllers/tnaController.js';

const router = express.Router();

router.get('/', getTNAs);
router.post('/', createTNA);
router.put('/:id', updateTNA);
router.delete('/:id', deleteTNA);
router.get('/department-progress', getDepartmentProgress);
router.get('/get-tna-summary', getTNASummary);
router.get('/get-tna-summary-card', getTNASummaryCard);

export default router;
