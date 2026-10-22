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
      .populate('host', 'name email avatar title department')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (error) {
    next(error);
  }
});

// Create a new meeting
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, description, scheduledAt, settings } = req.body;

    const code = generateMeetingCode();

    const meeting = await Meeting.create({
      title: title || 'Quick Enterprise Sync',
      description: description || '',
      code,
      host: req.user._id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      status: 'scheduled',
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

    const populated = await Meeting.findById(meeting._id).populate('host', 'name email avatar title');

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
    const { codeOrId } = req.params;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(codeOrId);
    const query = isObjectId ? { _id: codeOrId } : { code: codeOrId };

    const meeting = await Meeting.findOne(query)
      .populate('host', 'name email avatar title department')
      .populate('participants.user', 'name email avatar title')
      .populate('actionItems.assigneeId', 'name email avatar');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

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
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    const durationMs = meeting.endedAt.getTime() - (meeting.startedAt ? meeting.startedAt.getTime() : meeting.createdAt.getTime());
    meeting.durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    // Generate AI intelligence if transcript exists or if none, generate baseline intelligence
    const aiResults = await generateMeetingSummary(meeting.transcript, meeting.title);
    meeting.summary = aiResults.summary;
    meeting.keyTakeaways = aiResults.keyTakeaways;
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
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const { transcript } = req.body;
    const targetTranscript = (transcript && transcript.length > 0) ? transcript : meeting.transcript;

    if (transcript && transcript.length > 0) {
      meeting.transcript = transcript;
    }

    const aiResults = await generateMeetingSummary(targetTranscript, meeting.title);
    meeting.summary = aiResults.summary;
    meeting.keyTakeaways = aiResults.keyTakeaways;
    meeting.actionItems = aiResults.actionItems;

    await meeting.save();

    res.json({
      success: true,
      data: {
        summary: meeting.summary,
        keyTakeaways: meeting.keyTakeaways,
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
    const meeting = await Meeting.findById(req.params.id);
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

export default router;
