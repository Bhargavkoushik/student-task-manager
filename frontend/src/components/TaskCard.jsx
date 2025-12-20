import React from 'react';
import './TaskCard.css';

/**
 * TaskCard Component
 * Displays individual task with actions
 */
const TaskCard = ({ task, onToggleComplete, onDelete, onEdit, reminderAlert = false }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate reminder date based on due date and days before
  const calculateReminderDate = (dueDate, daysBefore) => {
    if (!dueDate || daysBefore == null) return null;
    const date = new Date(dueDate);
    date.setDate(date.getDate() - daysBefore);
    return date;
  };

  // Get reminder time from time string (HH:mm format)
  const getReminderTimeString = (timeString) => {
    if (!timeString) return '';
    // timeString is in format "HH:mm"
    return timeString;
  };

  // Check if task is overdue
  const isOverdue = () => {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
  };

  // Get priority-based reschedule message
  const getRescheduleMessage = () => {
    if (!task.reminderAt) return null;
    
    const messages = {
      low: '⏰ Will reschedule 30 mins later if completed',
      medium: '📅 Will reschedule 1 day later if completed',
      high: '📆 Will reschedule 1 week later if completed'
    };
    
    return messages[task.priority] || messages.medium;
  };

  return (
    <div className={`task-card ${task.completed ? 'completed' : ''} ${isOverdue() ? 'overdue' : ''} ${task.important ? 'important' : ''}`}>
      <div className="task-header">
        <div className="task-checkbox">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleComplete(task._id, !task.completed)}
            id={`task-${task._id}`}
            title={!task.completed && task.reminderAt ? getRescheduleMessage() : ''}
          />
          <label htmlFor={`task-${task._id}`}></label>
        </div>
        <div className="task-priority">
          <span className={`priority-badge priority-${task.priority}`}>
            {task.priority}
          </span>
        </div>
      </div>

      <div className="task-content">
        <h3 className="task-title">{task.title}</h3>
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
        
        {/* Show reschedule info if task has reminder */}
        {task.reminderAt && !task.completed && (
          <div className="reminder-reschedule-info">
            <span className="reschedule-icon">🔄</span>
            <span className="reschedule-text">{getRescheduleMessage()}</span>
          </div>
        )}
        
        {task.reminders && task.reminders.length > 0 && task.dueDate && (
          <div className="reminders-meta">
            <span className="reminder-icon">⏰</span>
            <div className="reminders-list-compact">
              {task.reminders.map((reminder, index) => {
                const reminderDate = new Date(task.dueDate);
                reminderDate.setDate(reminderDate.getDate() - reminder.daysBefore);
                return (
                  <div key={index} className="reminder-item-compact">
                    <span>
                      {formatDate(reminderDate)} at {reminder.reminderTime}
                      {' '}({reminder.daysBefore} day{reminder.daysBefore === 1 ? '' : 's'} before)
                    </span>
                    <span className="ringtone-badge" style={{ marginLeft: '0.5rem' }}>{reminder.ringtone}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {reminderAlert && !task.completed && (
          <div className="reminder-warning">⏰ Task time is approaching</div>
        )}
      </div>

      <div className="task-footer">
        <div className="task-date">
          <span className="date-icon">📅</span>
          <span className={isOverdue() ? 'date-overdue' : ''}>
            {formatDate(task.dueDate)}
          </span>
        </div>

        <div className="task-actions">
          <button
            className="btn-icon btn-edit"
            onClick={() => onEdit(task)}
            title="Edit task"
          >
            ✏️
          </button>
          <button
            className="btn-icon btn-delete"
            onClick={() => onDelete(task._id)}
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
