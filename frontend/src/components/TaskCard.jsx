import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { formatDateForDisplay, formatDateTimeForDisplay, isOverdue } from '../utils/timezoneUtils';
import './TaskCard.css';

/**
 * TaskCard Component
 * Displays individual task with actions
 */
const TaskCard = ({ task, onToggleComplete, onDelete, onEdit, reminderAlert = false }) => {
  const [showHistory, setShowHistory] = useState(false);
  
  // Check if task is overdue (using timezone-aware utility)
  const taskIsOverdue = () => isOverdue(task.dueDate, task.completed);

  // Get priority-based reschedule message
  const getRescheduleMessage = () => {
    if (!task.reminderAt) return null;
    
    const messages = {
      low: 'Will reschedule 30 mins later if completed',
      medium: 'Will reschedule 1 day later if completed',
      high: 'Will reschedule 1 week later if completed'
    };
    
    return messages[task.priority] || messages.medium;
  };

  // Format action labels for display
  const getActionLabel = (action) => {
    const labels = {
      auto: 'Ringed',
      stopped: 'Stopped',
      snoozed: 'Snoozed'
    };
    return labels[action] || action;
  };

  // Check if task has reminder history
  const hasHistory = task.ringHistory && task.ringHistory.length > 0;

  return (
    <div className={`task-card ${task.completed ? 'completed' : ''} ${taskIsOverdue() ? 'overdue' : ''} ${task.important ? 'important' : ''}`}>
      <div className="task-header">
        <div className="task-checkbox">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleComplete(task._id, !task.completed)}
            id={`task-${task._id}`}
            title={!task.completed && task.reminderAt ? getRescheduleMessage() : ''}
          />
          <label
            htmlFor={`task-${task._id}`}
            style={{ position: 'absolute', clip: 'rect(0 0 0 0)', height: '1px', width: '1px', overflow: 'hidden' }}
          >
            Toggle task completion
          </label>
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
            <span className="reschedule-icon"></span>
            <span className="reschedule-text">{getRescheduleMessage()}</span>
          </div>
        )}
        
        {task.reminders && task.reminders.length > 0 && task.dueDate && (
          <div className="reminders-meta">
            <span className="reminder-icon"></span>
            <div className="reminders-list-compact">
              {task.reminders.map((reminder, index) => {
                const reminderDate = new Date(task.dueDate);
                reminderDate.setDate(reminderDate.getDate() - reminder.daysBefore);
                return (
                  <div key={`reminder-${reminder.daysBefore}-${index}`} className="reminder-item-compact">
                    <span>
                      {formatDateForDisplay(reminderDate)} at {reminder.reminderTime}
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
          <div className="reminder-warning">Task time is approaching</div>
        )}

        {/* Reminder History Section */}
        {hasHistory && (
          <div className="reminder-history-section">
            <button 
              className="history-toggle"
              onClick={() => setShowHistory(!showHistory)}
              aria-label="Toggle reminder history"
            >
              <span className="history-icon"></span>
              <span className="history-label">
                Reminder History ({task.ringHistory.length})
              </span>
              <span className={`history-arrow ${showHistory ? 'expanded' : ''}`}></span>
            </button>
            
            {showHistory && (
              <div className="reminder-history-list">
                {task.ringHistory.slice().reverse().map((entry, index) => (
                  <div key={`history-${entry.at}-${index}`} className={`history-entry history-${entry.action}`}>
                    <div className="history-time">
                      <span className="history-timestamp">
                        {formatDateTimeForDisplay(entry.at)}
                      </span>
                    </div>
                    <div className="history-details">
                      <span className="history-action">{getActionLabel(entry.action)}</span>
                      {entry.note && (
                        <span className="history-note">{entry.note}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Last Ring Indicator */}
        {task.lastRingAt && !hasHistory && (
          <div className="last-ring-info">
            <span className="last-ring-icon"></span>
            <span className="last-ring-text">
              Last reminded: {formatDateTimeForDisplay(task.lastRingAt)}
            </span>
          </div>
        )}
      </div>

      <div className="task-footer">
        <div className="task-date">
          <span className="date-icon"></span>
          <span className={taskIsOverdue() ? 'date-overdue' : ''}>
            {formatDateForDisplay(task.dueDate)}
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

TaskCard.propTypes = {
  task: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    priority: PropTypes.oneOf(['low', 'medium', 'high']).isRequired,
    dueDate: PropTypes.string,
    completed: PropTypes.bool,
    important: PropTypes.bool,
    reminderAt: PropTypes.string,
    lastRingAt: PropTypes.string,
    ringHistory: PropTypes.arrayOf(PropTypes.shape({
      at: PropTypes.string.isRequired,
      action: PropTypes.string.isRequired,
      note: PropTypes.string
    })),
    reminders: PropTypes.arrayOf(PropTypes.shape({
      daysBefore: PropTypes.number.isRequired,
      reminderTime: PropTypes.string.isRequired,
      ringtone: PropTypes.string
    }))
  }).isRequired,
  onToggleComplete: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  reminderAlert: PropTypes.bool
};

export default TaskCard;
