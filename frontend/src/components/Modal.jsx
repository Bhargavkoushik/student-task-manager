import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { formatDateForInput, combineDateAndTime } from '../utils/timezoneUtils';
import './Modal.css';

/**
 * Modal Component
 * Used for editing existing tasks
 */
const Modal = ({ isOpen, onClose, onSave, task }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    completed: false
  });

  const [tempReminder, setTempReminder] = useState({
    daysBefore: '',
    reminderTime: '09:00',
    ringtone: 'chime'
  });

  const [addedReminders, setAddedReminders] = useState([]);
  const [customReminderDays, setCustomReminderDays] = useState('');
  const [errors, setErrors] = useState({});

  const populateFromTask = (taskData) => {
    const reminderDays = taskData.reminderDaysBefore;
    let presetReminder = '';

    if ([1, 2, 3].includes(reminderDays)) {
      presetReminder = String(reminderDays);
    } else if (reminderDays != null) {
      presetReminder = 'custom';
    }

    setFormData({
      title: taskData.title || '',
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      // Convert UTC date to local date for input field
      dueDate: taskData.dueDate ? formatDateForInput(taskData.dueDate) : '',
      completed: taskData.completed || false
    });

    if (taskData.reminders && Array.isArray(taskData.reminders) && taskData.reminders.length > 0) {
      setAddedReminders(taskData.reminders.map(r => ({
        daysBefore: r.daysBefore,
        reminderTime: r.reminderTime || '09:00',
        ringtone: r.ringtone || 'chime'
      })));
    } else {
      setAddedReminders([]);
    }

    if (presetReminder === 'custom' && reminderDays != null) {
      setCustomReminderDays(String(reminderDays));
    } else {
      setCustomReminderDays('');
    }
  };

  // Populate form with task data when modal opens
  useEffect(() => {
    if (task) {
      populateFromTask(task);
    }
  }, [task]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'customReminderDays') {
      setCustomReminderDays(value);
      if (errors.reminderDaysBefore) {
        setErrors(prev => ({ ...prev, reminderDaysBefore: '' }));
      }
      return;
    }

    // Handle temp reminder fields
    if (name === 'tempReminderDaysBefore') {
      setTempReminder(prev => ({ ...prev, daysBefore: value }));
      return;
    }
    if (name === 'tempReminderTime') {
      setTempReminder(prev => ({ ...prev, reminderTime: value }));
      return;
    }
    if (name === 'tempRingtone') {
      setTempReminder(prev => ({ ...prev, ringtone: value }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addReminder = () => {
    let daysBefore = null;

    if (tempReminder.daysBefore === 'custom') {
      const customValue = Number(customReminderDays);
      if (!customReminderDays || Number.isNaN(customValue) || customValue <= 0) {
        setErrors(prev => ({ ...prev, reminderDaysBefore: 'Enter a valid number of days' }));
        return;
      }
      daysBefore = customValue;
    } else if (tempReminder.daysBefore !== '') {
      daysBefore = Number(tempReminder.daysBefore);
    }

    if (daysBefore === null) {
      setErrors(prev => ({ ...prev, reminderDaysBefore: 'Select reminder days' }));
      return;
    }

    // Add the reminder to the array
    setAddedReminders(prev => [...prev, {
      daysBefore,
      reminderTime: tempReminder.reminderTime,
      ringtone: tempReminder.ringtone
    }]);

    // Reset temp reminder form
    setTempReminder({
      daysBefore: '',
      reminderTime: '09:00',
      ringtone: 'chime'
    });
    setCustomReminderDays('');
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.reminderDaysBefore;
      return newErrors;
    });
  };

  const removeReminder = (index) => {
    setAddedReminders(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare task data with added reminders array
    const taskData = {
      ...formData,
      // Convert local date to UTC ISO string
      dueDate: formData.dueDate ? combineDateAndTime(formData.dueDate, '00:00') : '',
      reminders: addedReminders.map(r => ({
        daysBefore: r.daysBefore,
        reminderTime: r.reminderTime,
        ringtone: r.ringtone
      }))
    };

    onSave(taskData);
    onClose();
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      className="modal-overlay"
      aria-hidden="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        className="modal-content"
        aria-modal="true"
        open
      >
        <div className="modal-header">
          <h2>Edit Task</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-title">Task Title *</label>
            <input
              type="text"
              id="edit-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-priority">Priority</label>
              <select
                id="edit-priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-dueDate">Due Date</label>
              <input
                type="date"
                id="edit-dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="completed"
                  checked={formData.completed}
                  onChange={handleChange}
                />
                <span>Mark as completed</span>
              </label>
            </div>
          </div>

          {/* Reminder Section */}
          <div className="reminders-section">
            <h3>Reminder (Optional)</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              ⏰ Priority-based reminders: Low (1x), Medium (2x), High (3x every hour)
            </p>
            
            <div className="add-reminder-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-tempReminderDaysBefore">Reminder Days</label>
                  <select
                    id="edit-tempReminderDaysBefore"
                    name="tempReminderDaysBefore"
                    value={tempReminder.daysBefore}
                    onChange={handleChange}
                  >
                    <option value="">Select days before</option>
                    <option value="1">1 day before</option>
                    <option value="2">2 days before</option>
                    <option value="3">3 days before</option>
                    <option value="custom">Custom…</option>
                  </select>
                </div>

                {tempReminder.daysBefore === 'custom' && (
                  <div className="form-group">
                    <label htmlFor="edit-customReminderDays">Custom Days</label>
                    <input
                      type="number"
                      id="edit-customReminderDays"
                      name="customReminderDays"
                      min="1"
                      placeholder="Days before"
                      value={customReminderDays}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-tempReminderTime">Time</label>
                  <input
                    type="time"
                    id="edit-tempReminderTime"
                    name="tempReminderTime"
                    value={tempReminder.reminderTime}
                    onChange={handleChange}
                    disabled={!tempReminder.daysBefore}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-tempRingtone">Ringtone</label>
                  <select
                    id="edit-tempRingtone"
                    name="tempRingtone"
                    value={tempReminder.ringtone}
                    onChange={handleChange}
                    disabled={!tempReminder.daysBefore}
                  >
                    <option value="chime">Chime</option>
                    <option value="digital">Digital</option>
                    <option value="bell">Bell</option>
                  </select>
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={addReminder}
              >
                + Add Reminder
              </button>
              {errors.reminderDaysBefore && <span className="error-message">{errors.reminderDaysBefore}</span>}
            </div>

            {/* Display Added Reminders */}
            {addedReminders.length > 0 && (
              <div className="reminders-list">
                <h4>Added Reminders ({addedReminders.length})</h4>
                {addedReminders.map((reminder, index) => (
                  <div
                    key={`${reminder.daysBefore}-${reminder.reminderTime}-${reminder.ringtone}-${index}`}
                    className="reminder-item"
                  >
                    <div className="reminder-info">
                      <span>{reminder.daysBefore} day(s) before at {reminder.reminderTime}</span>
                      <span className="ringtone-badge">{reminder.ringtone}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeReminder(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  task: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    priority: PropTypes.string,
    dueDate: PropTypes.string,
    completed: PropTypes.bool,
    reminderDaysBefore: PropTypes.number,
    reminders: PropTypes.arrayOf(PropTypes.shape({
      daysBefore: PropTypes.number,
      reminderTime: PropTypes.string,
      ringtone: PropTypes.string
    }))
  })
};

export default Modal;
