import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['backlog', 'todo', 'in-progress', 'in-review', 'done'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assigneeName: {
      type: String,
      default: 'Unassigned'
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting'
    },
    meetingTitle: {
      type: String,
      default: ''
    },
    actionItemId: {
      type: String
    },
    dueDate: {
      type: Date
    },
    tags: [{
      type: String
    }]
  },
  {
    timestamps: true
  }
);

// High-performance compound indexes for Kanban & Dashboard filtering
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ assignee: 1, createdAt: -1 });
taskSchema.index({ creator: 1, createdAt: -1 });
taskSchema.index({ meetingId: 1 });

export default mongoose.model('Task', taskSchema);
