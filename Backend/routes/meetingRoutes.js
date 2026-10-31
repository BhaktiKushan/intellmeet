import express from 'express';
import Meeting from '../models/Meeting.js';
import Task from '../models/Task.js';
import { protect } from '../middleware/auth.js';
import { generateMeetingSummary } from '../services/aiService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper to generate a friendly meeting code
const generateMeetingCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `meet-${part(3)}-${part(4)}`;
};

// Generate a guaranteed collision-free meeting code
const generateUniqueMeetingCode = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateMeetingCode();
    const exists = await Meeting.findOne({ code: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }
  return `meet-${uuidv4().substring(0, 8)}`;
};

// Active in-flight creation lock and recent creations cache to prevent duplicate meetings
const inFlightCreations = new Map();
const recentCreations = new Map();

// Periodic cleanup of recentCreations cache
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of recentCreations.entries()) {
    if (now - entry.timestamp > 30000) {
      recentCreations.delete(key);
    }
  }
}, 60000).unref?.();

// Get all meetings for user
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const query = {
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ]
    };

    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .select('-transcript -translatedTranscript -chatMessages -whiteboardData')
      .populate('host', 'name email avatar title department')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (error) {
    next(error);
  }
});

// Create a new meeting (Idempotent & Deduplicated)
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, description, scheduledAt, settings, status, clientSubmissionId } = req.body;

    const cleanTitle = (title || 'Quick Enterprise Sync').trim();
    const cleanDesc = (description || '').trim();
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();
    const meetingStatus = status && ['scheduled', 'live', 'ended', 'active'].includes(status) ? status : 'scheduled';
    const hostId = req.user._id.toString();
    const subId = clientSubmissionId ? String(clientSubmissionId).trim() : null;

    // 1. Build deduplication key
    const dedupeKey = subId 
      ? `sub:${hostId}:${subId}` 
      : `title:${hostId}:${cleanTitle.toLowerCase()}:${Math.floor(scheduledDate.getTime() / 60000)}`;

    // 2. Check in-memory recent creations cache (< 15 seconds)
    if (recentCreations.has(dedupeKey)) {
      const cached = recentCreations.get(dedupeKey);
      if (Date.now() - cached.timestamp < 15000) {
        return res.status(200).json({
          success: true,
          data: cached.data,
          deduplicated: true
        });
      }
    }

    // 3. Concurrency Lock: If an identical request is actively in-flight, await its completion
    if (inFlightCreations.has(dedupeKey)) {
      const existingResult = await inFlightCreations.get(dedupeKey);
      return res.status(200).json({
        success: true,
        data: existingResult,
        deduplicated: true
      });
    }

    // 4. Synchronously acquire lock BEFORE any async yield
    const executeCreation = async () => {
      // 4a. Check MongoDB for recently created duplicate
      const mongoQuery = subId
        ? { host: req.user._id, clientSubmissionId: subId }
        : {
            host: req.user._id,
            title: cleanTitle,
            status: meetingStatus,
            createdAt: { $gte: new Date(Date.now() - 15000) }
          };

      const existingMeeting = await Meeting.findOne(mongoQuery)
        .populate('host', 'name email avatar title department');

      if (existingMeeting) {
        recentCreations.set(dedupeKey, { data: existingMeeting, timestamp: Date.now() });
        return existingMeeting;
      }

      // 4b. Generate guaranteed collision-free unique meeting code
      const code = await generateUniqueMeetingCode();

      const meeting = await Meeting.create({
        title: cleanTitle,
        description: cleanDesc,
        code,
        clientSubmissionId: subId || undefined,
        host: req.user._id,
        scheduledAt: scheduledDate,
        status: meetingStatus,
        settings: settings || {
          muteOnJoin: false,
          allowScreenShare: true,
          aiTranscriptionEnabled: true
        },
        participants: [
          {
            user: req.user._id,
            name: req.user.name,
            email: req.user.email,
            avatar: req.user.avatar,
            role: 'host',
            joinedAt: new Date()
          }
        ]
      });

      const populated = await Meeting.findById(meeting._id).populate('host', 'name email avatar title department');
      recentCreations.set(dedupeKey, { data: populated, timestamp: Date.now() });
      return populated;
    };

    const creationPromise = executeCreation();
    inFlightCreations.set(dedupeKey, creationPromise);

    let populated;
    try {
      populated = await creationPromise;
    } finally {
      inFlightCreations.delete(dedupeKey);
    }

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
});

// Get meeting by Code or ID
router.get('/:codeOrId', protect, async (req, res, next) => {
  try {
    const cleanCodeOrId = (req.params.codeOrId || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanCodeOrId);
    const query = isObjectId ? { $or: [{ _id: cleanCodeOrId }, { code: cleanCodeOrId }] } : { code: cleanCodeOrId };

    let meeting = await Meeting.findOne(query)
      .populate('host', 'name email avatar title department')
      .populate('participants.user', 'name email avatar title')
      .populate('actionItems.assigneeId', 'name email avatar');

    if (!meeting) {
      meeting = await Meeting.create({
        title: `Meeting (${cleanCodeOrId})`,
        code: isObjectId ? `meet-${cleanCodeOrId.slice(0, 8)}` : cleanCodeOrId,
        host: req.user._id,
        status: 'live',
        participants: [
          {
            user: req.user._id,
            name: req.user.name,
            email: req.user.email,
            avatar: req.user.avatar,
            role: 'host',
            joinedAt: new Date()
          }
        ]
      });
      meeting = await Meeting.findById(meeting._id).populate('host', 'name email avatar title department');
    }

    // Meeting details fetched cleanly and idempotently
    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    next(error);
  }
});

// Update meeting details
router.put('/:id', protect, async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const updated = await Meeting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('host', 'name email avatar');

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

// End meeting and auto-generate AI Intelligence (Summary, Takeaways & Action Items)
router.post('/:id/end', protect, async (req, res, next) => {
  try {
    const cleanId = (req.params.id || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    const query = isObjectId ? { $or: [{ _id: cleanId }, { code: cleanId }] } : { code: cleanId };
    let meeting = await Meeting.findOne(query);

    if (!meeting) {
      meeting = await Meeting.create({
        title: `Meeting (${cleanId})`,
        code: cleanId,
        host: req.user._id,
        status: 'ended'
      });
    }

    const { transcript, chatMessages } = req.body || {};
    if (transcript && Array.isArray(transcript) && transcript.length > 0) {
      const combined = [...(meeting.transcript || []), ...transcript];
      const seen = new Set();
      meeting.transcript = combined.filter(item => {
        if (!item || !item.text) return false;
        const key = item.segmentId || `${item.speaker || 'Unknown'}:${(item.text || '').trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (chatMessages && Array.isArray(chatMessages) && chatMessages.length > 0) {
      meeting.chatMessages = chatMessages;
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    const durationMs = meeting.endedAt.getTime() - (meeting.startedAt ? meeting.startedAt.getTime() : meeting.createdAt.getTime());
    meeting.durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    // Combine transcript with in-meeting chat messages if transcript is empty
    let transcriptToUse = (meeting.transcript && meeting.transcript.length > 0) ? meeting.transcript : [];
    if (transcriptToUse.length === 0 && meeting.chatMessages && meeting.chatMessages.length > 0) {
      transcriptToUse = meeting.chatMessages.map(c => ({
        speaker: c.sender || 'Participant',
        text: c.text,
        timestamp: new Date(c.timestamp).toLocaleTimeString()
      }));
    }

    // Generate AI intelligence using Google Gemini (with deduplication lock)
    const aiResults = await generateMeetingSummary(transcriptToUse, meeting.title, meeting._id.toString());
    meeting.summary = aiResults.summary;
    meeting.topicsCovered = aiResults.topicsCovered;
    meeting.topicsBreakdown = aiResults.topicsBreakdown || [];
    meeting.personWiseSummary = aiResults.personWiseSummary || [];
    meeting.problemsIdentified = aiResults.problemsIdentified || [];
    meeting.solutionsSuggested = aiResults.solutionsSuggested || [];
    meeting.keyTakeaways = aiResults.keyTakeaways;
    meeting.keyDecisions = aiResults.keyDecisions;
    meeting.importantQuestions = aiResults.importantQuestions;
    meeting.actionItems = aiResults.actionItems;

    await meeting.save();

    res.json({
      success: true,
      message: 'Meeting ended and AI intelligence generated',
      data: meeting
    });
  } catch (error) {
    next(error);
  }
});

// Manually trigger or re-generate AI intelligence for a meeting
router.post('/:id/ai-intelligence', protect, async (req, res, next) => {
  try {
    const cleanId = (req.params.id || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    const query = isObjectId ? { $or: [{ _id: cleanId }, { code: cleanId }] } : { code: cleanId };
    let meeting = await Meeting.findOne(query);

    if (!meeting) {
      meeting = await Meeting.create({
        title: `Meeting (${cleanId})`,
        code: cleanId,
        host: req.user._id,
        status: 'ended'
      });
    }

    const { transcript } = req.body;
    let targetTranscript = (transcript && transcript.length > 0) ? transcript : meeting.transcript;

    if (!targetTranscript || targetTranscript.length === 0) {
      if (meeting.chatMessages && meeting.chatMessages.length > 0) {
        targetTranscript = meeting.chatMessages.map(c => ({
          speaker: c.sender || 'Participant',
          text: c.text,
          timestamp: new Date(c.timestamp).toLocaleTimeString()
        }));
      }
    }

    if (transcript && transcript.length > 0) {
      const combined = [...(meeting.transcript || []), ...transcript];
      const seen = new Set();
      meeting.transcript = combined.filter(item => {
        if (!item || !item.text) return false;
        const key = item.segmentId || `${item.speaker || 'Unknown'}:${(item.text || '').trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      targetTranscript = meeting.transcript;
    }

    const aiResults = await generateMeetingSummary(targetTranscript, meeting.title, meeting._id.toString());
    meeting.summary = aiResults.summary;
    meeting.topicsCovered = aiResults.topicsCovered;
    meeting.topicsBreakdown = aiResults.topicsBreakdown || [];
    meeting.personWiseSummary = aiResults.personWiseSummary || [];
    meeting.problemsIdentified = aiResults.problemsIdentified || [];
    meeting.solutionsSuggested = aiResults.solutionsSuggested || [];
    meeting.keyTakeaways = aiResults.keyTakeaways;
    meeting.keyDecisions = aiResults.keyDecisions;
    meeting.importantQuestions = aiResults.importantQuestions;
    meeting.actionItems = aiResults.actionItems;

    await meeting.save();

    res.json({
      success: true,
      data: {
        summary: meeting.summary,
        topicsCovered: meeting.topicsCovered,
        topicsBreakdown: meeting.topicsBreakdown || [],
        personWiseSummary: meeting.personWiseSummary || [],
        problemsIdentified: meeting.problemsIdentified || [],
        solutionsSuggested: meeting.solutionsSuggested || [],
        keyTakeaways: meeting.keyTakeaways,
        keyDecisions: meeting.keyDecisions,
        importantQuestions: meeting.importantQuestions,
        actionItems: meeting.actionItems
      }
    });
  } catch (error) {
    next(error);
  }
});

// Convert Action Item to Kanban Task
router.post('/:id/action-items/:itemId/task', protect, async (req, res, next) => {
  try {
    const cleanId = (req.params.id || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    const query = isObjectId ? { $or: [{ _id: cleanId }, { code: cleanId }] } : { code: cleanId };
    const meeting = await Meeting.findOne(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const actionItem = meeting.actionItems.find((item) => item.id === req.params.itemId || item._id?.toString() === req.params.itemId);
    if (!actionItem) {
      return res.status(404).json({ success: false, message: 'Action item not found in meeting' });
    }

    // Create Kanban task
    const task = await Task.create({
      title: actionItem.task,
      description: `Extracted from meeting: ${meeting.title} (${meeting.code})`,
      status: 'todo',
      priority: actionItem.priority || 'medium',
      assignee: actionItem.assigneeId || req.user._id,
      assigneeName: actionItem.assignee || req.user.name,
      creator: req.user._id,
      meetingId: meeting._id,
      meetingTitle: meeting.title,
      actionItemId: actionItem.id,
      dueDate: actionItem.dueDate || new Date(Date.now() + 86400000 * 3),
      tags: ['AI-Extracted', 'Meeting Action']
    });

    // Link task back to actionItem
    actionItem.taskId = task._id;
    actionItem.status = 'in-progress';
    await meeting.save();

    res.status(201).json({
      success: true,
      message: 'Action item converted to Kanban task successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// Save Meeting Recording URL and Status
router.post('/:id/recording', protect, async (req, res, next) => {
  try {
    const cleanId = (req.params.id || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
    const query = isObjectId ? { $or: [{ _id: cleanId }, { code: cleanId }] } : { code: cleanId };
    const meeting = await Meeting.findOne(query);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const { recordingUrl, durationMinutes } = req.body;
    meeting.isRecorded = true;
    if (recordingUrl) meeting.recordingUrl = recordingUrl;
    if (durationMinutes) meeting.durationMinutes = durationMinutes;

    await meeting.save();

    res.json({
      success: true,
      message: 'Recording details saved successfully',
      data: meeting
    });
  } catch (error) {
    next(error);
  }
});

export default router;
