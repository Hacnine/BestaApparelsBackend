import express from 'express';
import {
  getAuditLogs,
  createAuditLog,
  exportAuditLogs
} from '../controllers/auditController.js';

const router = express.Router();

router.get('/', getAuditLogs);
router.post('/', createAuditLog);
router.get('/export', exportAuditLogs);

export default router;
