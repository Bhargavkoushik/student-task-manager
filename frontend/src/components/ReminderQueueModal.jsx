import React from 'react';
import PropTypes from 'prop-types';
import { formatDateTimeForDisplay, formatDateForDisplay } from '../utils/timezoneUtils';
import './ReminderQueueModal.css';

/**
 * ReminderQueueModal
 * Shows upcoming queued reminders with reorder and cancel controls
 */
const ReminderQueueModal = ({ isOpen, queue, onClose, onMoveUp, onMoveDown, onRemove }) => {
  if (!isOpen) return null;

  return (
    <dialog className="rq-overlay" open aria-label="Reminder queue">
      <div className="rq-container">
        <div className="rq-header">
          <div>
            <p className="rq-eyebrow">Upcoming reminders</p>
            <h3 className="rq-title">Reminder Queue ({queue.length})</h3>
            <p className="rq-subtitle">Reorder or cancel queued reminders. Active reminder is handled separately.</p>
          </div>
          <button className="rq-close" onClick={onClose} aria-label="Close reminder queue">×</button>
        </div>

        {queue.length === 0 ? (
          <div className="rq-empty">No queued reminders</div>
        ) : (
          <div className="rq-list">
            {queue.map((task, index) => (
              <div key={`${task._id}-${task.reminderAt || index}`} className="rq-item">
                <div className="rq-item-main">
                  <div className="rq-title-row">
                    <span className={`rq-priority rq-${task.priority}`}>{task.priority}</span>
                    <span className="rq-task-title">{task.title}</span>
                  </div>
                  <div className="rq-meta">
                    {task.reminderAt && (
                      <span className="rq-meta-chip">Reminder: {formatDateTimeForDisplay(task.reminderAt)}</span>
                    )}
                    {task.dueDate && (
                      <span className="rq-meta-chip">Due: {formatDateForDisplay(task.dueDate)}</span>
                    )}
                  </div>
                </div>
                <div className="rq-actions">
                  <button
                    className="rq-btn rq-btn-ghost"
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move reminder up"
                  >
                    ↑
                  </button>
                  <button
                    className="rq-btn rq-btn-ghost"
                    onClick={() => onMoveDown(index)}
                    disabled={index === queue.length - 1}
                    aria-label="Move reminder down"
                  >
                    ↓
                  </button>
                  <button
                    className="rq-btn rq-btn-danger"
                    onClick={() => onRemove(index)}
                    aria-label="Remove reminder from queue"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
};

ReminderQueueModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  queue: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default ReminderQueueModal;
