import React, { useState } from 'react';
import './AddTaskForm.css';

/**
 * AddTaskForm Component
 * Form for creating new tasks
 */
const AddTaskForm = ({ onAddTask }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });

  const [tempReminder, setTempReminder] = useState({
    daysBefore: '',
    reminderTime: '09:00',
    ringtone: 'chime'
  });

  const [addedReminders, setAddedReminders] = useState([]);
  const [customReminderDays, setCustomReminderDays] = useState('');
  const [errors, setErrors] = useState({});

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

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
      [name]: value
    }));

    // Clear error for this field when user starts typing
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
      reminders: addedReminders.map(r => ({
        daysBefore: r.daysBefore,
        reminderTime: r.reminderTime,
        ringtone: r.ringtone
      }))
    };

    // Pass task data to parent component
    onAddTask(taskData);

    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: ''
    });
    setTempReminder({
      daysBefore: '',
      reminderTime: '09:00',
      ringtone: 'chime'
    });
    setAddedReminders([]);
    setCustomReminderDays('');
  };

  return (
    <div className="add-task-form">
      <h2 className="form-title">Add New Task</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Task Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Complete Math Assignment"
            className={errors.title ? 'error' : ''}
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add more details about the task..."
            rows="3"
            className={errors.description ? 'error' : ''}
          />
          {errors.description && <span className="error-message">{errors.description}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
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
            <label htmlFor="dueDate">Due Date</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Reminder Section */}
        <div className="reminders-section">
          <h3>Set Reminder (Optional)</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            ⏰ Priority-based reminders: Low (1x), Medium (2x), High (3x every hour)
          </p>
          
          <div className="add-reminder-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tempReminderDaysBefore">Reminder Days</label>
                <select
                  id="tempReminderDaysBefore"
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
                  <label htmlFor="customReminderDays">Custom Days</label>
                  <input
                    type="number"
                    id="customReminderDays"
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
                <label htmlFor="tempReminderTime">Time</label>
                <input
                  type="time"
                  id="tempReminderTime"
                  name="tempReminderTime"
                  value={tempReminder.reminderTime}
                  onChange={handleChange}
                  disabled={!tempReminder.daysBefore}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tempRingtone">Ringtone</label>
                <select
                  id="tempRingtone"
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
                <div key={index} className="reminder-item">
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

        <button type="submit" className="btn btn-primary">
          Add Task
        </button>
      </form>
    </div>
  );
};

export default AddTaskForm;
