import React from 'react';
import PropTypes from 'prop-types';
import './ReminderPopup.css';

/**
 * ReminderPopup Component
 * Displays a popup notification for task reminders with priority-based styling
 * Includes a "Stop Ringtone" button to dismiss the notification
 */
const ReminderPopup = ({ task, onStopRingtone }) => {
  if (!task) return null;

  // Format the due date for display
  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        {/* Header with priority indicator */}
        <div className="reminder-popup-header" style={{ borderTopColor: priorityColor }}>
          <div className="reminder-icon">⏰</div>
          <h2 className="reminder-title">Task Reminder</h2>
        </div>

        {/* Task Details */}
        <div className="reminder-popup-body">
          <div className="reminder-task-title">
            <strong>{task.title}</strong>
          </div>

          {task.description && (
            <div className="reminder-field">
              <span className="reminder-label">Description:</span>
              <p className="reminder-value">{task.description}</p>
            </div>
          )}

          <div className="reminder-field">
            <span className="reminder-label">Priority:</span>
            <span 
              className="reminder-priority-badge"
              style={{ backgroundColor: priorityColor }}
            >
              {task.priority.toUpperCase()}
            </span>
          </div>

          <div className="reminder-field">
            <span className="reminder-label">Due Date:</span>
            <span className="reminder-value">{formatDate(task.dueDate)}</span>
          </div>

          {task.reminderAt && (
            <div className="reminder-field">
              <span className="reminder-label">Reminder Time:</span>
              <span className="reminder-value">{formatDate(task.reminderAt)}</span>
            </div>
          )}
        </div>

        {/* Footer with action button */}
        <div className="reminder-popup-footer">
          <button 
            className="reminder-stop-button"
            onClick={onStopRingtone}
            aria-label="Stop ringtone and close reminder"
          >
            🔕 Stop Ringtone
          </button>
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
  onStopRingtone: PropTypes.func.isRequired
};

export default ReminderPopup;
