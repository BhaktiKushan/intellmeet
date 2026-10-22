import express from 'express';
import Task from '../models/Task.js';
import Meeting from '../models/Meeting.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, priority, assignee } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;

    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar title department')
      .populate('creator', 'name email avatar')
      .populate('meetingId', 'title code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, description, status, priority, assignee, dueDate, tags, meetingId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Please provide a task title' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      assignee: assignee || req.user._id,
      creator: req.user._id,
      meetingId: meetingId || null,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 86400000 * 3),
      tags: tags || ['General']
    });

    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar title')
      .populate('creator', 'name email avatar');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
});

// Update task status (Kanban column move)
router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    await task.save();

    // If task was linked to a meeting action item, update the meeting action item status as well
    if (task.meetingId && task.actionItemId) {
      try {
        const meeting = await Meeting.findById(task.meetingId);
        if (meeting) {
          const actionItem = meeting.actionItems.find(a => a.id === task.actionItemId);
          if (actionItem) {
            actionItem.status = status === 'done' ? 'completed' : 'in-progress';
            await meeting.save();
          }
        }
      } catch (err) {
        // Non-fatal
      }
    }

    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email avatar title')
      .populate('creator', 'name email avatar');

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
});

// Update full task
router.put('/:id', protect, async (req, res, next) => {
  try {
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('assignee', 'name email avatar title')
      .populate('creator', 'name email avatar');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Task removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
