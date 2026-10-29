import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  KanbanSquare,
  Plus,
  Clock,
  Sparkles,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowRight,
  ArrowLeft,
  Trash2
} from 'lucide-react';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: '#64748b' },
  { id: 'todo', title: 'To Do', color: '#0284c7' },
  { id: 'in-progress', title: 'In Progress', color: '#d97706' },
  { id: 'in-review', title: 'In Review', color: '#7c3aed' },
  { id: 'done', title: 'Done', color: '#059669' }
];

export const KanbanPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskStatus, setNewTaskStatus] = useState('todo');

  const fetchTasks = async () => {
    try {
      const res = await api.getTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      await api.updateTaskStatus(taskId, newStatus);
    } catch (err) {
      alert('Failed to update task: ' + err.message);
      fetchTasks();
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createTask({
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        status: newTaskStatus,
        assigneeName: user?.name || 'Member'
      });
      setShowCreateModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setTasks(prev => [res.data, ...prev]);
    } catch (err) {
      alert('Failed to create task: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      setTasks(prev => prev.filter(t => t._id !== taskId));
      await api.deleteTask(taskId);
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
      fetchTasks();
    }
  };

  const getNextStatus = (current) => {
    const idx = COLUMNS.findIndex(c => c.id === current);
    return idx < COLUMNS.length - 1 ? COLUMNS[idx + 1].id : null;
  };

  const getPrevStatus = (current) => {
    const idx = COLUMNS.findIndex(c => c.id === current);
    return idx > 0 ? COLUMNS[idx - 1].id : null;
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px 80px' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 800 }}>
              Team Kanban Board
            </h1>
            <span className="badge badge-priority-medium">Sprint Workspace</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
            Real-time collaboration board automatically populated by AI Meeting Intelligence
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '32px', padding: '8px 12px 8px 32px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Create Task Button */}
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem', borderRadius: '8px' }}>
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Columns Container */}
      <div 
        className="kanban-columns-container"
        style={{
          gap: '18px',
          alignItems: 'start'
        }}
      >
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);

          return (
            <div
              key={col.id}
              className="glass-panel kanban-column-card"
              style={{
                borderRadius: '16px',
                padding: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Column Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: `2px solid ${col.color}40`,
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
                  <h3 style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>{col.title}</h3>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#e2e8f0',
                  color: '#475569'
                }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {colTasks.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '30px 10px',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '10px'
                  }}>
                    No tasks in {col.title}
                  </div>
                ) : (
                  colTasks.map(task => {
                    const nextCol = getNextStatus(task.status);
                    const prevCol = getPrevStatus(task.status);

                    return (
                      <div
                        key={task._id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                          transition: 'transform 0.15s, border-color 0.15s'
                        }}
                      >
                        {/* Task Priority & Tags */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className={`badge badge-priority-${task.priority || 'medium'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                            {task.priority}
                          </span>

                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            title="Delete Task"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, marginBottom: '4px' }}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p style={{
                              fontSize: '0.78rem',
                              color: '#64748b',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              margin: 0
                            }}>
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Meeting Link Tag if AI extracted */}
                        {task.meetingTitle && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.7rem',
                            color: '#6366f1',
                            background: '#eef2ff',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            <Sparkles size={11} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.meetingTitle}
                            </span>
                          </div>
                        )}

                        {/* Assignee & Footer */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid #f1f5f9'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assigneeName || 'Member'}`}
                              alt="assignee"
                              style={{ width: '22px', height: '22px', borderRadius: '50%' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {task.assigneeName || 'Unassigned'}
                            </span>
                          </div>

                          {/* Quick Move Buttons */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {prevCol && (
                              <button
                                onClick={() => handleStatusChange(task._id, prevCol)}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  color: '#475569',
                                  borderRadius: '4px',
                                  padding: '4px',
                                  cursor: 'pointer'
                                }}
                                title={`Move to ${prevCol}`}
                              >
                                <ArrowLeft size={12} />
                              </button>
                            )}
                            {nextCol && (
                              <button
                                onClick={() => handleStatusChange(task._id, nextCol)}
                                style={{
                                  background: '#eef2ff',
                                  border: '1px solid #c7d2fe',
                                  color: '#4f46e5',
                                  borderRadius: '4px',
                                  padding: '4px',
                                  cursor: 'pointer'
                                }}
                                title={`Move to ${nextCol}`}
                              >
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>
              Create Sprint Task
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Add a new actionable objective to your enterprise Kanban board.
            </p>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement WebRTC packet loss recovery"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Task details and acceptance criteria..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Column
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value)}
                    className="input-field"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="in-review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px' }}>
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default KanbanPage;
