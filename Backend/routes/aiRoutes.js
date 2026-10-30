import express from 'express';
import { generateMeetingSummary, translateText } from '../services/aiService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Real-time AI Speech Translation
router.post('/translate', protect, async (req, res, next) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;
    if (!text || !targetLanguage) {
      return res.status(400).json({ success: false, message: 'Text and targetLanguage are required' });
    }

    const translatedText = await translateText(text, targetLanguage, sourceLanguage);
    res.json({
      success: true,
      data: {
        originalText: text,
        translatedText,
        targetLanguage
      }
    });
  } catch (error) {
    next(error);
  }
});

// Summarize meeting text or transcript
router.post('/summarize', protect, async (req, res, next) => {
  try {
    const { transcript, title = 'Meeting Discussion' } = req.body;

    let transcriptArray = [];
    if (Array.isArray(transcript)) {
      transcriptArray = transcript;
    } else if (typeof transcript === 'string') {
      transcriptArray = transcript.split('\n').filter(Boolean).map(line => {
        const parts = line.split(':');
        if (parts.length > 1) {
          return { speaker: parts[0].trim(), text: parts.slice(1).join(':').trim(), timestamp: '00:00' };
        }
        return { speaker: 'Participant', text: line.trim(), timestamp: '00:00' };
      });
    }

    const aiOutput = await generateMeetingSummary(transcriptArray, title);

    res.json({
      success: true,
      data: aiOutput
    });
  } catch (error) {
    next(error);
  }
});

// Extract action items specifically
router.post('/extract-actions', protect, async (req, res, next) => {
  try {
    const { text, participants = ['Team Member'] } = req.body;
    const lines = (text || '').split('\n').map(l => ({ speaker: participants[0] || 'Member', text: l }));
    const aiOutput = await generateMeetingSummary(lines, 'Action Extraction');

    res.json({
      success: true,
      data: {
        actionItems: aiOutput.actionItems
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
