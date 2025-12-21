import React from 'react';
import PropTypes from 'prop-types';
import { formatDateTimeForDisplay } from '../utils/timezoneUtils';
import './ReminderPopup.css';

/**
 * ReminderPopup Component
 * Displays a popup notification for task reminders with priority-based styling
 * Includes a "Stop Ringtone" button to dismiss the notification
 */
const ReminderPopup = ({ task, onStopRingtone, onSnooze }) => {
  if (!task) return null;

  // Get priority color for styling
  const priorityColors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444'
  };

  const priorityColor = priorityColors[task.priority] || priorityColors.medium;

  return (
    <div className="reminder-popup-overlay">
      <div className="reminder-popup-container">
        {/* Header with priority indicator and stop button */}
        <div className="reminder-popup-header">
          <div className="reminder-header-left">
            <div className="reminder-icon">⏰</div>
            <h2 className="reminder-title">⚡ Reminder Active</h2>
          </div>
          <div className="reminder-actions">
            <button 
              className="reminder-stop-button"
              onClick={onStopRingtone}
              aria-label="Stop ringtone and close reminder"
            >
              🔕 Stop Ringtone
            </button>
            {onSnooze && (
              <div className="snooze-options">
                <button
                  className="reminder-snooze-button snooze-10"
                  onClick={() => onSnooze(10)}
                  aria-label="Snooze reminder for 10 minutes"
                >
                  😴 10 min
                </button>
                <button
                  className="reminder-snooze-button snooze-30"
                  onClick={() => onSnooze(30)}
                  aria-label="Snooze reminder for 30 minutes"
                >
                  😴 30 min
                </button>
                <button
                  className="reminder-snooze-button snooze-60"
                  onClick={() => onSnooze(60)}
                  aria-label="Snooze reminder for 1 hour"
                >
                  😴 1 hour
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Task Details */}
        <div className="reminder-popup-body">
          <div className="reminder-task-title">
            📋 {task.title}
          </div>

          {task.description && (
            <div className="reminder-field">
              <span className="reminder-label">Description</span>
              <p className="reminder-value">{task.description}</p>
            </div>
          )}

          <div className="reminder-field">
            <span className="reminder-label">Priority</span>
            <span 
              className="reminder-priority-badge"
              style={{ backgroundColor: priorityColor }}
            >
              {task.priority.toUpperCase()}
            </span>
          </div>

          <div className="reminder-field">
            <span className="reminder-label">Due Date</span>
            <span className="reminder-value">{formatDateTimeForDisplay(task.dueDate)}</span>
          </div>

          {task.reminderAt && (
            <div className="reminder-field">
              <span className="reminder-label">Reminder Time</span>
              <span className="reminder-value">{formatDateTimeForDisplay(task.reminderAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ReminderPopup.propTypes = {
  task: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    priority: PropTypes.oneOf(['low', 'medium', 'high']).isRequired,
    dueDate: PropTypes.string,
    reminderAt: PropTypes.string
  }),
  onStopRingtone: PropTypes.func.isRequired,
  onSnooze: PropTypes.func
};

export default ReminderPopup;
