const express = require('express');
const router = express.Router();
const AssistantController = require('../controllers/assistantController');

// Interactive floating chatbot endpoint
router.post('/chat', AssistantController.handleChat);

module.exports = router;
