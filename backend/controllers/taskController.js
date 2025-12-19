const Task = require('../models/Task');

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
 */
const updateTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, completed, reminders } = req.body;
    
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

    // Update task with new values
    task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        priority,
        dueDate,
        completed,
        reminders: processedReminders
      },
      {
        new: true,
        runValidators: true
      }
    );

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

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateReminderTriggered
};
