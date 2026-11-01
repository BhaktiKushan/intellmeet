import express from 'express';
import { generateMeetingSummary, translateText, detectLiveTopic, askAiAssistant, transcribeAudio } from '../services/aiService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Real-time In-Meeting AI Assistant Query
router.post('/ask-assistant', protect, async (req, res, next) => {
  try {
    const { question, transcript = [], liveTopic, title, notes } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }
    const answer = await askAiAssistant(question, { transcript, liveTopic, notes }, title || 'Team Meeting');
    res.json({
      success: true,
      data: { answer }
    });
  } catch (error) {
    next(error);
  }
});

// Transcribe Audio Slice (Mobile & Non-WebSpeech Fallback)
router.post('/transcribe-slice', protect, async (req, res, next) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ success: false, message: 'audioBase64 is required' });
    }
    const text = await transcribeAudio(audioBase64, mimeType);
    res.json({
      success: true,
      data: { text }
    });
  } catch (error) {
    next(error);
  }
});

// Real-time AI Live Topic Detection
router.post('/detect-topic', protect, async (req, res, next) => {
  try {
    const { recentTurns, title } = req.body;
    const topicData = await detectLiveTopic(recentTurns, title);
    res.json({
      success: true,
      data: topicData
    });
  } catch (error) {
    next(error);
  }
});

// Real-time AI Speech Translation (kept for backward compatibility)
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
