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
    // New fields for priority-based reminder feature
    reminderAt: {
      type: Date
    },
    notified: {
      type: Boolean,
      default: false
    },
    // Counts how many reminders have been fired and handled by the user
    reminderCount: {
      type: Number,
      default: 0
    },
    // Indicates a reminder has fired and the UI should show it
    uiPending: {
      type: Boolean,
      default: false
    },
    // Last time a reminder rang (audio attempted)
    lastRingAt: {
      type: Date
    },
    // Small history of reminder events for debugging/UX clarity
    ringHistory: [{
      at: { type: Date, default: Date.now },
      action: { type: String, enum: ['auto', 'stopped', 'snoozed'], default: 'auto' },
      note: { type: String, maxlength: 200 }
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
