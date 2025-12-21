const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const Task = require('./models/Task');
const User = require('./models/User');
const { sendReminderEmail } = require('./services/emailService');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Student Task Manager API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

/**
 * CRON JOB: Check for task reminders every minute
 * - Finds tasks where reminderAt <= current time AND notified = false
 * - Sends reminder email to task owner
 * - Marks task as notified to prevent duplicate emails
 */
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find all tasks that need reminders
    const tasksToRemind = await Task.find({
      reminderAt: { $lte: now },
      notified: false,
      completed: false // Don't send reminders for completed tasks
    }).populate('user', 'email name');

    if (tasksToRemind.length > 0) {
      console.log(`📢 Found ${tasksToRemind.length} task(s) requiring reminders at ${now.toLocaleString()}`);
    }

    // Process each task
    for (const task of tasksToRemind) {
      if (!task.user?.email) {
        console.warn(`⚠️  Task ${task._id} has no associated user or email. Skipping.`);
        continue;
      }

      // Send reminder email
      const result = await sendReminderEmail(task, task.user.email);
      
      // Mark as notified regardless of email success to prevent infinite retries
      // Also flag UI as pending so frontend can show reminder popup
      task.notified = true;
      task.uiPending = true;
      await task.save();
      
      if (result.success) {
        console.log(`✅ Reminder processed for task: "${task.title}" (User: ${task.user.email})`);
      } else {
        console.error(`❌ Email failed for task: "${task.title}" but marked as notified to prevent retries`);
      }
    }
  } catch (error) {
    // Log error but don't crash the server
    console.error('❌ Error in reminder cron job:', error.message);
  }
});

console.log('⏰ Reminder cron job initialized - checking every minute');

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
