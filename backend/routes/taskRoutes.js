const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateReminderTriggered,
  getPendingReminders,
  getFiredReminders,
  progressReminder
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// Routes
// All task routes are protected - require authentication

// Get pending reminders - must be before /:id route
router.route('/pending-reminders')
  .get(protect, getPendingReminders); // GET /api/tasks/pending-reminders

// Get reminders that have fired and need UI
router.route('/fired-reminders')
  .get(protect, getFiredReminders); // GET /api/tasks/fired-reminders

router.route('/')
  .get(protect, getTasks)      // GET /api/tasks - Get all tasks
  .post(protect, createTask);  // POST /api/tasks - Create new task

router.route('/:id')
  .get(protect, getTaskById)   // GET /api/tasks/:id - Get single task
  .put(protect, updateTask)    // PUT /api/tasks/:id - Update task
  .delete(protect, deleteTask); // DELETE /api/tasks/:id - Delete task

// Reminder triggered endpoint
router.route('/:id/reminder-triggered')
  .put(protect, updateReminderTriggered); // PUT /api/tasks/:id/reminder-triggered

// Reminder progress endpoint – called after ringtone ends or is stopped
router.route('/:id/reminder-progress')
  .post(protect, progressReminder); // POST /api/tasks/:id/reminder-progress

module.exports = router;
