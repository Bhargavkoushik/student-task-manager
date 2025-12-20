const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * Email Service for sending task reminder notifications
 * Uses nodemailer with credentials from environment variables
 * Also integrates N8N webhook for external notifications
 */

// Create transporter with email credentials
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to other services (outlook, yahoo, etc.)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send a task reminder email to the user
 * @param {Object} task - Task object with details
 * @param {String} userEmail - Email address of the task owner
 * @returns {Promise} - Resolves when email is sent successfully
 */
const sendReminderEmail = async (task, userEmail) => {
  try {
    const transporter = createTransporter();

    // Format the due date for better readability
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not set';
    
    // Determine priority badge color
    const priorityColor = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#ef4444'
    };

    const maxRemindersMap = { low: 1, medium: 2, high: 3 };
    const maxReminders = maxRemindersMap[task.priority] || 1;
    const currentReminderNumber = (task.reminderCount || 0) + 1;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `⏰ Task Reminder: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">📋 Task Reminder</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="color: #374151; margin-top: 0;">${task.title}</h3>
            
            <div style="margin: 15px 0;">
              <strong style="color: #6b7280;">Description:</strong>
              <p style="color: #4b5563; margin: 5px 0;">${task.description || 'No description provided'}</p>
            </div>
            
            <div style="margin: 15px 0;">
              <strong style="color: #6b7280;">Priority:</strong>
              <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ${priorityColor[task.priority]}; color: white; font-weight: bold; text-transform: uppercase; font-size: 12px; margin-left: 8px;">
                ${task.priority}
              </span>
            </div>

            <div style="margin: 15px 0;">
              <strong style="color: #6b7280;">Reminder:</strong>
              <span style="color: #4b5563; margin-left: 8px;">${currentReminderNumber} of ${maxReminders}</span>
            </div>
            
            <div style="margin: 15px 0;">
              <strong style="color: #6b7280;">Due Date:</strong>
              <span style="color: #4b5563; margin-left: 8px;">${dueDate}</span>
            </div>
            
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This is an automated reminder for your task. Please log in to your task manager to view more details.
              </p>
            </div>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Student Task Manager - Automated Reminder System</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent successfully for task: ${task.title} (ID: ${task._id})`);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    // Log error but don't crash the server
    console.error(`❌ Failed to send reminder email for task: ${task.title} (ID: ${task._id})`);
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send task notification via N8N webhook
 * @param {String} email - User email address
 * @param {String} taskName - Name of the task
 * @param {String} priority - Priority level (low, medium, high)
 * @returns {Promise} - Resolves when webhook is called successfully
 */
const sendN8NWebhookNotification = async (email, taskName, priority) => {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://mkoushik0410.app.n8n.cloud/webhook/task-notify';
    
    const response = await axios.post(webhookUrl, {
      email,
      taskName,
      priority
    }, {
      timeout: 5000 // 5 second timeout
    });
    
    console.log(`✅ N8N webhook notification sent successfully for task: ${taskName}`);
    return { success: true, data: response.data };
    
  } catch (error) {
    // Log error but don't crash - webhook failures shouldn't break the main task flow
    console.error(`⚠️ Failed to send N8N webhook notification for task: ${taskName}`);
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendReminderEmail,
  sendN8NWebhookNotification
};
