const mongoose = require('mongoose');

/**
 * Task Schema for MongoDB
 * Defines the structure of task documents
 */
const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    dueDate: {
      type: Date
    },
    reminders: [{
      daysBefore: {
        type: Number,
        required: true
      },
      reminderTime: {
        type: String, // Stored as "HH:mm" format
        required: true
      },
      ringtone: {
        type: String,
        enum: ['chime', 'digital', 'bell'],
        default: 'chime'
      },
      triggeredCount: {
        type: Number,
        default: 0
      },
      lastTriggeredAt: {
        type: Date
      }
    }],
    important: {
      type: Boolean,
      default: false
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('Task', taskSchema);
