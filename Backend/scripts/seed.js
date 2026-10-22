import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Meeting from '../models/Meeting.js';
import Task from '../models/Task.js';
import Workspace from '../models/Workspace.js';
import { v4 as uuidv4 } from 'uuid';

export const seedDatabaseIfEmpty = async () => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('[Seed] Database already seeded. Skipping initial seed.');
    return;
  }

  console.log('[Seed] Seeding initial enterprise demonstration data...');

  // Create Users
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123!', salt);

  const users = await User.insertMany([
    {
      name: 'Alex Rivera',
      email: 'admin@intellmeet.com',
      password: hashedPassword,
      role: 'admin',
      title: 'VP of Engineering',
      department: 'Engineering Leadership',
      status: 'online',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Sarah Chen',
      email: 'sarah.engineer@intellmeet.com',
      password: hashedPassword,
      role: 'member',
      title: 'Lead Distributed Systems Architect',
      department: 'Infrastructure',
      status: 'online',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.dev@intellmeet.com',
      password: hashedPassword,
      role: 'member',
      title: 'Senior Full-Stack Engineer',
      department: 'Real-Time Web',
      status: 'in-meeting',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Priya Patel',
      email: 'priya.pm@intellmeet.com',
      password: hashedPassword,
      role: 'member',
      title: 'Staff Product Manager',
      department: 'Enterprise Productivity',
      status: 'online',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    }
  ]);

  const [adminUser, sarahUser, marcusUser, priyaUser] = users;

  // Create Workspace
  const workspace = await Workspace.create({
    name: 'Zidio Global Engineering Workspace',
    description: 'Enterprise hub for IntellMeet core development, WebRTC video streaming, and AI integrations.',
    owner: adminUser._id,
    members: [
      { user: adminUser._id, role: 'owner' },
      { user: sarahUser._id, role: 'admin' },
      { user: marcusUser._id, role: 'member' },
      { user: priyaUser._id, role: 'member' }
    ]
  });

  // Action Items for Completed Meeting
  const actionItem1Id = uuidv4();
  const actionItem2Id = uuidv4();
  const actionItem3Id = uuidv4();

  // Create Completed Meeting with Full Realistic Transcript & AI Summary
  const pastMeeting = await Meeting.create({
    title: 'Q2 WebRTC Video Architecture & AI Streaming Review',
    description: 'Technical evaluation of peer-to-peer latency targets, Whisper transcription accuracy, and Kanban task synchronization.',
    code: 'meet-arch-9921',
    host: adminUser._id,
    status: 'ended',
    scheduledAt: new Date(Date.now() - 86400000 * 2),
    startedAt: new Date(Date.now() - 86400000 * 2),
    endedAt: new Date(Date.now() - 86400000 * 2 + 45 * 60000),
    durationMinutes: 45,
    isRecorded: true,
    recordingUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    participants: [
      { user: adminUser._id, name: adminUser.name, email: adminUser.email, role: 'host' },
      { user: sarahUser._id, name: sarahUser.name, email: sarahUser.email, role: 'participant' },
      { user: marcusUser._id, name: marcusUser.name, email: marcusUser.email, role: 'participant' },
      { user: priyaUser._id, name: priyaUser.name, email: priyaUser.email, role: 'participant' }
    ],
    transcript: [
      {
        speaker: 'Alex Rivera',
        userId: adminUser._id,
        text: 'Welcome team. Our target today is reviewing the sub-200ms WebRTC latency requirement and the AI transcription pipeline for IntellMeet.',
        timestamp: '10:00:15'
      },
      {
        speaker: 'Sarah Chen',
        userId: sarahUser._id,
        text: 'I have benchmarked the WebRTC peer connection logic with Socket.io signaling. In local and cross-region testing, peer discovery resolves in under 140ms.',
        timestamp: '10:02:40'
      },
      {
        speaker: 'Marcus Vance',
        userId: marcusUser._id,
        text: 'For the speech transcription, we implemented dual capability: OpenAI Whisper for cloud high-fidelity plus browser Web Speech fallback for zero-dependency execution.',
        timestamp: '10:05:12'
      },
      {
        speaker: 'Priya Patel',
        userId: priyaUser._id,
        text: 'Customers are loving the automated action item extraction. It reduces meeting follow-up by over 50%. We need to ensure each action item can convert directly to a Kanban card.',
        timestamp: '10:08:33'
      },
      {
        speaker: 'Alex Rivera',
        userId: adminUser._id,
        text: 'Action item: Sarah will finalize the STUN/TURN server configuration and run load tests by Friday. Marcus will wire the Kanban board card creation modal.',
        timestamp: '10:11:05'
      },
      {
        speaker: 'Sarah Chen',
        userId: sarahUser._id,
        text: 'Understood. I will also configure the Prometheus and Grafana metrics exporters to track WebRTC packet loss and bitrate.',
        timestamp: '10:12:45'
      }
    ],
    summary: 'The engineering team successfully validated the sub-200ms WebRTC latency target (achieving 140ms in benchmarks) and ratified the dual-mode AI transcription engine (Whisper API + Web Speech API fallback). Strong consensus was reached on integrating one-click action-item-to-Kanban conversion, reducing post-meeting follow-up overhead by an estimated 52%.',
    keyTakeaways: [
      'WebRTC signaling latency benchmarked at ~140ms, comfortably below the 200ms SLA target.',
      'AI intelligence pipeline supports both cloud LLM processing and resilient local NLP extraction.',
      'Post-meeting action items now sync directly with the team Kanban board to ensure accountability.',
      'Production monitoring is prepared with Prometheus metrics and Docker multi-stage configurations.'
    ],
    actionItems: [
      {
        id: actionItem1Id,
        task: 'Finalize STUN/TURN fallback server configuration and execute load test scenarios',
        assignee: 'Sarah Chen',
        assigneeId: sarahUser._id,
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 2),
        status: 'in-progress'
      },
      {
        id: actionItem2Id,
        task: 'Wire one-click Kanban card creation from AI meeting action items',
        assignee: 'Marcus Vance',
        assigneeId: marcusUser._id,
        priority: 'urgent',
        dueDate: new Date(Date.now() + 86400000 * 1),
        status: 'completed'
      },
      {
        id: actionItem3Id,
        task: 'Implement Prometheus metrics exporter for WebRTC peer health and packet drop rates',
        assignee: 'Sarah Chen',
        assigneeId: sarahUser._id,
        priority: 'medium',
        dueDate: new Date(Date.now() + 86400000 * 4),
        status: 'pending'
      }
    ],
    chatMessages: [
      { sender: 'Sarah Chen', avatar: sarahUser.avatar, text: 'Attached the WebRTC latency benchmark report!', timestamp: new Date(Date.now() - 86400000 * 2 + 10 * 60000) },
      { sender: 'Marcus Vance', avatar: marcusUser.avatar, text: 'Great results on the peer handshake.', timestamp: new Date(Date.now() - 86400000 * 2 + 12 * 60000) }
    ]
  });

  // Create Live Demo Meeting ready for instant joining
  await Meeting.create({
    title: 'IntellMeet Live Product & Collaboration Demo',
    description: 'Active live room ready for testing video, screen sharing, AI live transcription, and chat.',
    code: 'meet-demo-live',
    host: adminUser._id,
    status: 'live',
    scheduledAt: new Date(),
    startedAt: new Date(),
    participants: [
      { user: adminUser._id, name: adminUser.name, email: adminUser.email, role: 'host' }
    ],
    settings: {
      muteOnJoin: false,
      allowScreenShare: true,
      aiTranscriptionEnabled: true
    }
  });

  // Create Scheduled Meeting
  await Meeting.create({
    title: 'Enterprise Security Audit & OWASP Top 10 Review',
    description: 'Quarterly compliance and penetration testing review with security stakeholders.',
    code: 'meet-sec-4819',
    host: adminUser._id,
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + 86400000 * 1),
    participants: [
      { user: adminUser._id, name: adminUser.name, email: adminUser.email, role: 'host' },
      { user: sarahUser._id, name: sarahUser.name, email: sarahUser.email, role: 'participant' }
    ]
  });

  // Seed Kanban Tasks
  await Task.insertMany([
    {
      title: 'Configure Kubernetes HPA (Horizontal Pod Autoscaling) for Socket.io pods',
      description: 'Scale cluster automatically when concurrent meeting connections exceed 2,000.',
      status: 'backlog',
      priority: 'high',
      assignee: sarahUser._id,
      assigneeName: sarahUser.name,
      creator: adminUser._id,
      tags: ['DevOps', 'Kubernetes', 'Scalability'],
      dueDate: new Date(Date.now() + 86400000 * 7)
    },
    {
      title: 'Finalize STUN/TURN fallback server configuration and execute load test scenarios',
      description: 'Extracted from meeting: Q2 WebRTC Video Architecture & AI Streaming Review',
      status: 'in-progress',
      priority: 'high',
      assignee: sarahUser._id,
      assigneeName: sarahUser.name,
      creator: adminUser._id,
      meetingId: pastMeeting._id,
      meetingTitle: pastMeeting.title,
      actionItemId: actionItem1Id,
      tags: ['WebRTC', 'Network', 'AI-Extracted'],
      dueDate: new Date(Date.now() + 86400000 * 2)
    },
    {
      title: 'Wire one-click Kanban card creation from AI meeting action items',
      description: 'Allows users to push AI extracted items directly to the team board with one click.',
      status: 'done',
      priority: 'urgent',
      assignee: marcusUser._id,
      assigneeName: marcusUser.name,
      creator: adminUser._id,
      meetingId: pastMeeting._id,
      meetingTitle: pastMeeting.title,
      actionItemId: actionItem2Id,
      tags: ['Frontend', 'Kanban', 'AI-Extracted'],
      dueDate: new Date(Date.now() - 86400000 * 1)
    },
    {
      title: 'Implement Prometheus metrics exporter for WebRTC peer health',
      description: 'Collect jitter, packet loss, and frame drops per active peer connection.',
      status: 'todo',
      priority: 'medium',
      assignee: sarahUser._id,
      assigneeName: sarahUser.name,
      creator: adminUser._id,
      meetingId: pastMeeting._id,
      meetingTitle: pastMeeting.title,
      actionItemId: actionItem3Id,
      tags: ['Observability', 'Metrics'],
      dueDate: new Date(Date.now() + 86400000 * 4)
    },
    {
      title: 'Audit JWT authentication and express-rate-limit headers for OWASP compliance',
      description: 'Verify token expiration, prevent replay attacks, and ensure CORS strictness.',
      status: 'in-review',
      priority: 'high',
      assignee: marcusUser._id,
      assigneeName: marcusUser.name,
      creator: adminUser._id,
      tags: ['Security', 'OWASP'],
      dueDate: new Date(Date.now() + 86400000 * 3)
    }
  ]);

  console.log('[Seed] Database populated successfully with demo users, meetings, AI transcripts, and Kanban tasks!');
};
