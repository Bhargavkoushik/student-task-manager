const Task = require('../models/Task');
const User = require('../models/User');
const { sendN8NWebhookNotification } = require('../services/emailService');

/**
 * @desc    Get all tasks
 * @route   GET /api/tasks
 * @access  Public
 */
const getTasks = async (req, res) => {
  try {
    // Retrieve only tasks belonging to the logged-in user
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tasks',
      error: error.message
    });
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Public
 */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    // Check if task exists and belongs to user
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task',
      error: error.message
    });
  }
};

/**
 * @desc    Create new task
 * @route   POST /api/tasks
 * @access  Public
 */
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, completed, reminders } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    // Process reminders array
    const processedReminders = Array.isArray(reminders) && reminders.length > 0
      ? reminders.map(r => ({
          daysBefore: r.daysBefore,
          reminderTime: r.reminderTime,
          ringtone: r.ringtone || 'chime',
          triggeredCount: 0
        }))
      : [];

    // Create new task with user reference
    const task = await Task.create({
      user: req.user.id,
      title,
      description,
      priority,
      dueDate,
      completed,
      reminders: processedReminders
    });

    // Get user email and send N8N webhook notification
    try {
      const user = await User.findById(req.user.id);
      if (user && user.email) {
        await sendN8NWebhookNotification(user.email, title, priority);
      }
    } catch (webhookError) {
      // Log but don't fail the task creation if webhook fails
      console.error('Webhook notification error:', webhookError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
};

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Public
 * 
 * Special handling for completed tasks with reminders:
 * If task is being marked as complete and has a reminderAt field,
 * automatically reschedule based on priority level.
 */
const updateTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, completed, reminders, reminderAt } = req.body;
    
    // Find task by ID and verify ownership
    let task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    // Check if task exists and belongs to user
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Process reminders array
    const processedReminders = Array.isArray(reminders) && reminders.length > 0
      ? reminders.map(r => ({
          daysBefore: r.daysBefore,
          reminderTime: r.reminderTime,
          ringtone: r.ringtone || 'chime',
          triggeredCount: completed ? 0 : (r.triggeredCount || 0),
          lastTriggeredAt: r.lastTriggeredAt
        }))
      : [];

    // Auto-reschedule reminder based on priority when task is completed
    let newReminderAt = reminderAt;
    if (completed && task.reminderAt && !task.completed) {
      // Task is being marked as complete and has an active reminder
      const priorityRescheduleMap = {
        low: 30,      // Reschedule 30 minutes later
        medium: 1440, // Reschedule 1 day later
        high: 10080   // Reschedule 7 days later
      };

      const priorityLevel = priority || task.priority || 'medium';
      const minutesToAdd = priorityRescheduleMap[priorityLevel] || 1440;
      
      const currentReminderAt = new Date(task.reminderAt);
      const newTime = new Date(currentReminderAt.getTime() + minutesToAdd * 60000);
      
      newReminderAt = newTime;
      
      console.log(`📅 Auto-rescheduled reminder for "${title}" (Priority: ${priorityLevel}): ${currentReminderAt.toLocaleString()} → ${newTime.toLocaleString()}`);
    }

    // Update task with new values
    task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        priority,
        dueDate,
        completed,
        reminders: processedReminders,
        reminderAt: newReminderAt,
        notified: false // Reset notified flag if reminder was rescheduled
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Get user email and send N8N webhook notification on task update
    try {
      const user = await User.findById(req.user.id);
      if (user && user.email) {
        await sendN8NWebhookNotification(user.email, title || task.title, priority || task.priority);
      }
    } catch (webhookError) {
      // Log but don't fail the task update if webhook fails
      console.error('Webhook notification error:', webhookError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    res.status(400).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Public
 */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    // Check if task exists and belongs to user
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Delete task
    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: {}
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
};

/**
 * @desc    Update reminder triggered count for a specific reminder
 * @route   PUT /api/tasks/:id/reminder-triggered
 * @access  Public
 */
const updateReminderTriggered = async (req, res) => {
  try {
    const { reminderIndex } = req.body;
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!task.reminders || task.reminders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Task has no reminders'
      });
    }

    if (reminderIndex < 0 || reminderIndex >= task.reminders.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder index'
      });
    }

    // Get max rings based on priority
    const maxRings = {
      low: 1,
      medium: 2,
      high: 3
    }[task.priority] || 1;

    // Increment triggered count if under limit
    const reminder = task.reminders[reminderIndex];
    if (reminder.triggeredCount < maxRings) {
      task.reminders[reminderIndex].triggeredCount += 1;
      task.reminders[reminderIndex].lastTriggeredAt = new Date();
      await task.save();
    }

    res.status(200).json({
      success: true,
      data: {
        triggeredCount: task.reminders[reminderIndex].triggeredCount,
        maxRings: maxRings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update reminder triggered count',
      error: error.message
    });
  }
};

/**
 * @desc    Get pending reminders for the current user
 * @route   GET /api/tasks/pending-reminders
 * @access  Public
 */
const getPendingReminders = async (req, res) => {
  try {
    const now = new Date();
    
    // Find tasks with reminderAt that should trigger now
    const tasksWithReminders = await Task.find({
      user: req.user.id,
      reminderAt: { $lte: now },
      notified: false,
      completed: false
    });

    res.status(200).json({
      success: true,
      count: tasksWithReminders.length,
      data: tasksWithReminders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending reminders',
      error: error.message
    });
  }
};

/**
 * @desc    Get reminders that have fired and need UI display
 * @route   GET /api/tasks/fired-reminders
 * @access  Public
 */
const getFiredReminders = async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.user.id,
      completed: false,
      uiPending: true
    }).sort({ reminderAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve fired reminders',
      error: error.message
    });
  }
};

/**
 * @desc    Handle reminder progress after ringtone ends or is stopped
 * @route   POST /api/tasks/:id/reminder-progress
 * @access  Public
 */
const MAX_RING_HISTORY = 20;

const pushRingHistory = (task, entry) => {
  task.ringHistory = task.ringHistory || [];
  task.ringHistory.push(entry);
  if (task.ringHistory.length > MAX_RING_HISTORY) {
    task.ringHistory = task.ringHistory.slice(-MAX_RING_HISTORY);
  }
};

const progressReminder = async (req, res) => {
  try {
    const { stopped, snoozeMinutes } = req.body; // snoozeMinutes optional
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.completed) {
      return res.status(200).json({ success: true, message: 'Task already completed', data: task });
    }

    const now = new Date();

    // Snooze path: set new reminderAt in snoozeMinutes, reset flags, do not increment counts
    if (snoozeMinutes && Number.isFinite(snoozeMinutes) && snoozeMinutes > 0) {
      const nextAt = new Date(Date.now() + snoozeMinutes * 60 * 1000);
      task.reminderAt = nextAt;
      task.uiPending = false;
      task.notified = false;
      task.lastRingAt = now;
      pushRingHistory(task, { at: now, action: 'snoozed', note: `Snoozed ${snoozeMinutes}m` });
      await task.save();

      return res.status(200).json({
        success: true,
        message: `Reminder snoozed for ${snoozeMinutes} minutes`,
        data: task
      });
    }

    // Compute max reminders based on priority
    const maxRemindersMap = { low: 1, medium: 2, high: 3 };
    const maxReminders = maxRemindersMap[task.priority] || 1;

    // Increment reminder count
    const newCount = (task.reminderCount || 0) + 1;

    if (newCount < maxReminders) {
      // Schedule next reminder in +1 hour
      const nextAt = new Date(Date.now() + 60 * 60 * 1000);
      task.reminderCount = newCount;
      task.reminderAt = nextAt;
      task.uiPending = false; // UI handled
      task.notified = false;  // allow next email when it fires
      task.lastRingAt = now;
      pushRingHistory(task, { at: now, action: stopped ? 'stopped' : 'auto', note: 'Reminder progressed' });
      await task.save();

      return res.status(200).json({
        success: true,
        message: 'Reminder progressed and rescheduled +1 hour',
        data: task
      });
    } else {
      // Max reminders reached – remove reminder details but keep task in pending list
      task.reminderCount = 0;
      task.reminderAt = null;  // Remove reminder time
      task.uiPending = false;
      task.notified = false;
      task.lastRingAt = now;
      pushRingHistory(task, { at: now, action: stopped ? 'stopped' : 'auto', note: 'Max reminders reached' });
      // Do NOT mark completed - task stays in pending list without reminder
      await task.save();

      return res.status(200).json({
        success: true,
        message: 'All reminders completed - reminder removed from task',
        completed: false,  // Task NOT completed, just reminder removed
        data: task
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to progress reminder',
      error: error.message
    });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateReminderTriggered,
  getPendingReminders,
  getFiredReminders,
  progressReminder
};
