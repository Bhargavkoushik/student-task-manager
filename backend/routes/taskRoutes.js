const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateReminderTriggered
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// Routes
// All task routes are protected - require authentication
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

module.exports = router;
