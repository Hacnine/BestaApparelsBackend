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
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads/images'));
  },
  filename: function (req, file, cb) {
    // Use Date.now for uniqueness
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const router = express.Router();
router.use(requireAuth)

router.get('/', getTNAs);
router.post('/', createTna);
router.put('/:id', updateTNA);
router.delete('/:id', deleteTNA);
router.get('/department-progress', getDepartmentProgress);
router.get('/get-tna-summary', getTNASummary);
router.get('/get-tna-summary-card', getTNASummaryCard);

// Image upload route
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return the relative path for saving in itemImage
  res.json({ imageUrl: `/uploads/images/${req.file.filename}` });
});

// Delete image route
router.post('/delete-image', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'No imageUrl provided' });

  // Get absolute path
  const filePath = path.join(process.cwd(), imageUrl.replace('/uploads/', 'uploads/'));
  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ error: 'Failed to delete image' });
    res.json({ success: true });
  });
});

export default router;
