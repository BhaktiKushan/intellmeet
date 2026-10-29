import mongoose from 'mongoose';

const actionItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  task: {
    type: String,
    required: true
  },
  assignee: {
    type: String,
    default: 'Unassigned'
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }
});

const transcriptItemSchema = new mongoose.Schema({
  speaker: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: String,
    required: true
  }
});

const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  avatar: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['host', 'co-host', 'participant'],
    default: 'participant'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  }
});

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a meeting title'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participants: [participantSchema],
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'active'],
      default: 'scheduled'
    },
    scheduledAt: {
      type: Date,
      default: Date.now
    },
    startedAt: {
      type: Date
    },
    endedAt: {
      type: Date
    },
    durationMinutes: {
      type: Number,
      default: 0
    },
    isRecorded: {
      type: Boolean,
      default: false
    },
    recordingUrl: {
      type: String,
      default: ''
    },
    settings: {
      muteOnJoin: { type: Boolean, default: false },
      allowScreenShare: { type: Boolean, default: true },
      aiTranscriptionEnabled: { type: Boolean, default: true },
      requirePassword: { type: Boolean, default: false },
      password: { type: String, default: '' }
    },
    transcript: [transcriptItemSchema],
    summary: {
      type: String,
      default: ''
    },
    topicsCovered: [{
      type: String
    }],
    keyTakeaways: [{
      type: String
    }],
    keyDecisions: [{
      type: String
    }],
    importantQuestions: [{
      type: String
    }],
    actionItems: [actionItemSchema],
    chatMessages: [chatMessageSchema],
    whiteboardData: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Meeting', meetingSchema);
