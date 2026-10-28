const express = require('express');
const router = express.Router();
const SellController = require('../controllers/sellController');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/fileStorage');

// All sell guided flow endpoints are protected to authenticated students
router.post('/drafts', protect, SellController.startDraft);
router.get('/drafts/:id', protect, SellController.getDraft);
router.get('/drafts/:id/next', protect, SellController.getNextQuestion);
router.put('/drafts/:id/answer', protect, SellController.saveAnswer);
router.post('/drafts/:id/back', protect, SellController.goBack);
router.post('/drafts/:id/review', protect, SellController.getReview);
router.post('/drafts/:id/publish', protect, SellController.publishDraft);

// Photo upload endpoint (multipart/form-data, field "photos", up to 6 files per draft, max 5MB each)
router.post(
  '/drafts/:id/photos',
  protect,
  (req, res, next) => {
    upload.array('photos', 6)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds limit. Maximum allowed size is 5 MB per photo.',
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message?.includes('Too many files')) {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded. Maximum 6 photos allowed per draft.',
          });
        }
        if (err.code === 'INVALID_FILE_TYPE' || err.message?.includes('Invalid file type')) {
          return res.status(400).json({
            success: false,
            message: err.message || 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Photo upload failed',
        });
      }
      next();
    });
  },
  SellController.uploadPhotos
);

// Delete a photo from draft (owner only)
router.delete('/drafts/:id/photos', protect, SellController.deletePhoto);

module.exports = router;
