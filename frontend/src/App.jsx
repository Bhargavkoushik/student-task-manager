import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import AddTaskForm from './components/AddTaskForm';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import Modal from './components/Modal';
import ReminderPopup from './components/ReminderPopup';
import ReminderQueueModal from './components/ReminderQueueModal';
import Notification from './components/Notification';
import useRingtone from './hooks/useRingtone';
import taskService, { authService } from './services/taskService';
import { getUserTimezone, storeTimezonePreference } from './utils/timezoneUtils';
import './App.css';

/**
 * Main App Component
 * Manages application state and orchestrates all child components
 * Includes priority-based reminder system with email, ringtone, and UI notifications
 */
function App() {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filter, setFilter] = useState('all'); // all, completed, pending
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // New reminder system state
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [activeReminderTask, setActiveReminderTask] = useState(null);
  const [reminderQueue, setReminderQueue] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const processedRemindersRef = useRef(new Set());
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(() => {
    if (globalThis.window === undefined) return false;
    return globalThis.localStorage?.getItem('audioPermissionGranted') === 'true';
  });
  
  // Ringtone hook
  const { isPlaying, scheduleRingtones, stopAndEnd, initAudioContext } = useRingtone();
  
  // Legacy reminder state (keeping for backward compatibility)
  const [reminderAlertIds, setReminderAlertIds] = useState([]);
  const [ringstoneStopped, setRingstoneStopped] = useState(false);
  const [showReminderAlert, setShowReminderAlert] = useState(true);
  const reminderTriggeredRef = useRef(new Set());
  const currentAudioRef = useRef(null);

  // Check authentication on mount
  useEffect(() => {
    const token = authService.isAuthenticated();
    const user = authService.getCurrentUser();
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
    }
  }, []);

  // Detect and store user timezone on mount
  useEffect(() => {
    const timezone = getUserTimezone();
    storeTimezonePreference(timezone);
  }, []);

  // Fetch tasks whenever auth state changes to authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated]);

  // Ask for notification permission once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    if (globalThis.Notification === undefined) return;
    if (globalThis.Notification.permission === 'default') {
      globalThis.Notification.requestPermission().catch(() => {});
    }
    // Initialize audio context only after user explicitly enables reminder sound
    if (audioPermissionGranted) {
      initAudioContext();
    }
  }, [isAuthenticated, audioPermissionGranted]);

  // Persist audio permission so the prompt is only shown once
  useEffect(() => {
    if (!globalThis.localStorage) return;
    globalThis.localStorage.setItem('audioPermissionGranted', audioPermissionGranted ? 'true' : 'false');
  }, [audioPermissionGranted]);

  // Apply filters and search whenever tasks, filter, or search query changes
  useEffect(() => {
    applyFiltersAndSearch();
  }, [tasks, filter, searchQuery]);

  /**
   * NEW: Check for pending reminders using the backend API
   * Displays ReminderPopup, triggers browser alert, and plays ringtone
   */
  const checkPendingReminders = async () => {
    if (!isAuthenticated) return;
    
    // Double-check authentication with token
    const token = authService.isAuthenticated();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    
    try {
      // Fetch fired reminders from backend (need UI display)
      const response = await taskService.getFiredReminders();
      const pendingTasks = response.data || [];
      
      // Process each pending reminder
      for (const task of pendingTasks) {
        const reminderId = `${task._id}-${task.reminderAt}`;
        
        // Skip if already processed
        if (processedRemindersRef.current.has(reminderId)) {
          continue;
        }
        
        // Mark as processed
        processedRemindersRef.current.add(reminderId);

        console.log(`📢 Processing reminder for task: ${task.title}`);

        // 1. Show browser alert (must be called before other async operations)
        if (globalThis.window?.alert) {
          setTimeout(() => {
            globalThis.alert(`⏰ Reminder: ${task.title} is due!`);
          }, 100);
        }
        
        // 2. Show browser notification
        if (globalThis.Notification?.permission === 'granted') {
          new globalThis.Notification('⏰ Task Reminder', {
            body: `${task.title}\n${task.description || ''}\nPriority: ${task.priority.toUpperCase()}`,
            icon: '/favicon.ico',
            tag: reminderId
          });
        }
        
        // 3. Queue reminder to ensure only one is active at a time
        setReminderQueue(prev => [...prev, task]);
      }
      
      // Refresh tasks to get updated status
      if (pendingTasks.length > 0) {
        await fetchTasks();
      }
      
    } catch (error) {
      // Only log if it's not an authentication error (401)
      if (error.response?.status !== 401) {
        console.error('Error checking pending reminders:', error.message || error);
      }
    }
  };

  /**
   * Handle "Stop Ringtone" button click from ReminderPopup
   */
  const handleStopRingtone = async () => {
    try {
      const taskToStop = activeReminderTask;

      // Stop both hook-driven and legacy audio immediately
      stopAndEnd();
      stopRingtone();

      // If we have an active reminder task, also update backend state and close popup
      if (taskToStop) {
        setShowReminderPopup(false);
        setActiveReminderTask(null);

        // After clearing active reminder, immediately try next queued item
        setTimeout(() => {
          // queue processor effect will pick this up
        }, 0);

        try {
          await taskService.reminderProgress(taskToStop._id, { stopped: true });
          await fetchTasks();
        } catch (error_) {
          console.error('Failed to update backend:', error_);
        }
      }

      // Show success notification with close button
      setNotification({ 
        message: '🔕 Ringtone stopped successfully', 
        type: 'success' 
      });
      
      // Auto-close notification after 5 seconds
      setTimeout(() => setNotification({ message: '', type: '' }), 5000);

    } catch (err) {
      console.error('Failed to stop ringtone:', err);
      setNotification({ 
        message: '❌ Failed to stop ringtone', 
        type: 'error' 
      });
      setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    }
  };

  /**
   * Snooze current reminder by 10 minutes
   */
  const handleSnooze = async (minutes = 10) => {
    try {
      const taskToSnooze = activeReminderTask;

      // Stop audio immediately
      stopAndEnd();
      stopRingtone();

      if (taskToSnooze) {
        setShowReminderPopup(false);
        setActiveReminderTask(null);

        try {
          await taskService.reminderProgress(taskToSnooze._id, { snoozeMinutes: minutes });
          await fetchTasks();
        } catch (error_) {
          console.error('Failed to snooze backend:', error_);
        }
      }

      setNotification({
        message: `😴 Snoozed for ${minutes} minutes`,
        type: 'info'
      });
      setTimeout(() => setNotification({ message: '', type: '' }), 5000);

    } catch (err) {
      console.error('Failed to snooze reminder:', err);
      setNotification({
        message: '❌ Failed to snooze reminder',
        type: 'error'
      });
      setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    }
  };

  /**
   * Queue management: open/close, reorder, and cancel queued reminders
   */
  const openQueueModal = () => setShowQueueModal(true);
  const closeQueueModal = () => setShowQueueModal(false);

  const moveQueueItem = (from, to) => {
    setReminderQueue(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleQueueMoveUp = (index) => moveQueueItem(index, index - 1);
  const handleQueueMoveDown = (index) => moveQueueItem(index, index + 1);

  const handleQueueRemove = (index) => {
    setReminderQueue(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Build onRingEnd handler per task to update backend when audio finishes naturally
   */
  const makeOnRingEnd = (task) => async (endedTask) => {
    try {
      const targetTask = endedTask || task;
      const result = await taskService.reminderProgress(targetTask._id, { stopped: false });
      console.log('🔔 Ringtone ended naturally, backend updated:', result?.data?.message);

      await fetchTasks();

      if (result?.data?.message?.includes('All reminders completed')) {
        setShowReminderPopup(false);
        setActiveReminderTask(null);
        setNotification({ 
          message: `✅ All reminders for "${targetTask.title}" completed. Reminder removed from task.`, 
          type: 'success' 
        });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
      } else {
        console.log('⏰ Reminder rescheduled, waiting for user to close popup...');
      }
    } catch (err) {
      console.error('Failed to progress reminder:', err);
    }
  };

  /**
   * Request a one-time user gesture to unlock audio playback for reminders
   * Browsers block autoplay, so we play and pause a short clip to gain permission
   */
  const handleEnableReminderSound = async () => {
    if (audioPermissionGranted) {
      setNotification({ message: '🔔 Reminder sound already enabled', type: 'info' });
      setTimeout(() => setNotification({ message: '', type: '' }), 4000);
      return;
    }

    const testSources = [
      '/sounds/medium-priority.mp3',
      'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'
    ];

    try {
      for (const src of testSources) {
        try {
          const testAudio = new Audio(src);
          testAudio.volume = 0.05;
          await testAudio.play();
          testAudio.pause();
          setAudioPermissionGranted(true);
          initAudioContext();
          setNotification({ message: '✅ Reminder sound enabled', type: 'success' });
          setTimeout(() => setNotification({ message: '', type: '' }), 4000);
          return;
        } catch (err) {
          console.warn('Audio unlock source failed, trying fallback:', err?.message || err);
        }
      }

      throw new Error('Audio playback blocked by browser');
    } catch (err) {
      console.error('Failed to unlock audio playback:', err);
      setNotification({ 
        message: '⚠️ Click Allow in your browser to enable reminder sound, then try again.', 
        type: 'error' 
      });
      setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    }
  };

  /**
   * Fetch all tasks from API
   */
  /**
   * Handle user login
   */
  const handleLogin = async (credentials) => {
    try {
      const data = await authService.login(credentials);
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      setError(null);
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  };

  /**
   * Handle user registration
   */
  const handleRegister = async (userData) => {
    try {
      const data = await authService.register(userData);
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      setError(null);
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Registration failed');
    }
  };

  /**
   * Handle user logout
   */
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setTasks([]);
    setFilteredTasks([]);
    setReminderAlertIds([]);
    setRingstoneStopped(false);
    setShowReminderAlert(true);
    reminderTriggeredRef.current = new Set();
    stopRingtone();
  };

  /**
   * Fetch all tasks from API
   */
  const fetchTasks = async () => {
    // Check authentication before fetching
    if (!isAuthenticated || !authService.isAuthenticated()) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (err) {
      // Only show error if it's not an authentication error
      if (err.response?.status !== 401) {
        setError('Failed to load tasks. Please check if the server is running.');
        console.error('Error fetching tasks:', err.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add new task
   */
  const handleAddTask = async (taskData) => {
    try {
      const newTask = await taskService.createTask(taskData);
      setTasks(prev => [newTask, ...prev]);
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error('Error creating task:', err);
    }
  };

  /**
   * Toggle task completion status
   */
  /**
   * Toggle task completion status
   * If task has a reminder, it will be auto-rescheduled based on priority
   */
  const handleToggleComplete = async (taskId, completed) => {
    try {
      const taskToUpdate = tasks.find(t => t._id === taskId);
      const updatedTask = await taskService.updateTask(taskId, {
        ...taskToUpdate,
        completed,
        reminderAt: taskToUpdate.reminderAt, // Pass reminder for auto-reschedule logic
        priority: taskToUpdate.priority      // Pass priority for reschedule calculation
      });
      setTasks(prev =>
        prev.map(task => (task._id === taskId ? updatedTask : task))
      );

      // Show notification about reminder rescheduling if applicable
      if (completed && taskToUpdate.reminderAt && !taskToUpdate.completed) {
        const priorityMessages = {
          low: '⏰ Reminder rescheduled for 30 minutes later',
          medium: '⏰ Reminder rescheduled for 1 day later',
          high: '⏰ Reminder rescheduled for 1 week later'
        };
        const priority = taskToUpdate.priority || 'medium';
        setNotification({
          message: priorityMessages[priority] || priorityMessages.medium,
          type: 'info'
        });
        setTimeout(() => {
          setNotification({ message: '', type: '' });
        }, 4000);
      }
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error('Error updating task:', err);
    }
  };

  /**
   * Delete task
   */
  const handleDeleteTask = async (taskId) => {
    if (globalThis.window?.confirm && globalThis.window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(prev => prev.filter(task => task._id !== taskId));
      } catch (err) {
        setError('Failed to delete task. Please try again.');
        console.error('Error deleting task:', err);
      }
    }
  };

  /**
   * Open edit modal
   */
  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  /**
   * Save edited task
   */
  const handleSaveTask = async (taskData) => {
    try {
      const updatedTask = await taskService.updateTask(selectedTask._id, taskData);
      setTasks(prev =>
        prev.map(task => (task._id === selectedTask._id ? updatedTask : task))
      );
      setIsModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error('Error updating task:', err);
    }
  };

  const ringtoneLibrary = {
    chime: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    digital: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    bell: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'
  };

  // Quiet hours window (24h): 00:00–05:00
  const quietHoursWindow = { startHour: 0, endHour: 5 };

  const isWithinQuietHours = (date = new Date()) => {
    const hour = date.getHours();
    const { startHour, endHour } = quietHoursWindow;
    if (startHour === endHour) return false;
    if (startHour < endHour) {
      return hour >= startHour && hour < endHour;
    }
    return hour >= startHour || hour < endHour;
  };

  const isRingtoneActive = isPlaying || !!currentAudioRef.current;
  const isReminderActive = !!activeReminderTask;
  const upcomingQueueCount = reminderQueue.length;
  const totalQueueCount = upcomingQueueCount + (isReminderActive ? 1 : 0);

  /**
   * Start the next reminder in the queue if none is active
   */
  useEffect(() => {
    if (isReminderActive || reminderQueue.length === 0) return;

    const [next, ...rest] = reminderQueue;
    setReminderQueue(rest);
    setActiveReminderTask(next);
    setShowReminderPopup(true);

    const inQuietHours = isWithinQuietHours();

    if (audioPermissionGranted && !inQuietHours) {
      scheduleRingtones(next, makeOnRingEnd(next));
    } else {
      console.warn('⚠️  Audio playback skipped (permission missing or quiet hours).');
      if (inQuietHours) {
        setNotification({
          message: '🔇 Quiet hours (12AM–5AM): sound muted, reminder shown only.',
          type: 'info'
        });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
      }
    }
  }, [isReminderActive, reminderQueue, audioPermissionGranted, scheduleRingtones]);

  const stopRingtone = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setRingstoneStopped(true);
    
    // Close all notifications
    if (globalThis.Notification) {
      // We'll handle notification closing through actions
    }
  };

  /**
   * Notify with priority-based ringtone and browser notification with STOP button
   */
  const notifyReminder = async (task, reminder, reminderIndex) => {
    // If another reminder/audio is active, queue this one to avoid overlap
    if (isReminderActive || isRingtoneActive || reminderQueue.length > 0) {
      setReminderQueue(prev => [...prev, task]);
      return;
    }

    const inQuietHours = isWithinQuietHours();

    // Stop any currently playing ringtone
    stopRingtone();

    // Play ringtone only if user enabled audio (no auto-stop; user presses STOP)
    if (audioPermissionGranted && !inQuietHours) {
      const src = ringtoneLibrary[reminder.ringtone] || ringtoneLibrary.chime;
      const audio = new Audio(src);
      audio.loop = false;
      audio.onended = () => {
        stopRingtone();
      };
      currentAudioRef.current = audio;
      audio.play().catch(() => {});
    } else {
      console.warn('⚠️  Skipping ringtone playback (permission missing or quiet hours).');
      if (inQuietHours) {
        setNotification({
          message: '🔇 Quiet hours (12AM–5AM): sound muted, reminder shown only.',
          type: 'info'
        });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
      }
    }

    // Browser notification with actions
    if (globalThis.Notification?.permission === 'granted') {
      const ringCountText = (() => {
        if (task.priority === 'low') return '1 time';
        if (task.priority === 'medium') return '2 times (every hour)';
        return '3 times (every hour)';
      })();

      const notificationBody = [
        `📌 ${task.title}`,
        task.description ? `📝 ${task.description}` : '',
        `⚡ Priority: ${task.priority.toUpperCase()}`,
        `📅 Due: ${new Date(task.dueDate).toLocaleDateString()}`,
        `🔔 Ringtone: ${reminder.ringtone}`,
        `🔁 Will ring ${ringCountText}`,
        '',
        '👇 Click STOP to silence reminder'
      ].filter(Boolean).join('\n');

      const notification = new globalThis.Notification('⏰ Task Reminder!', {
        body: notificationBody,
        tag: `${task._id}-${reminderIndex}`,
        icon: '📚',
        badge: '⏰',
        requireInteraction: true, // Keeps notification until user interacts
        silent: false
      });

      // Handle notification click to stop ringtone
      notification.onclick = () => {
        stopRingtone();
        notification.close();
      };

      // Auto-close notification after 10 seconds if not clicked
      setTimeout(() => {
        notification.close();
      }, 10000);
    }

    // Update triggered count in backend
    try {
      await taskService.updateReminderTriggered(task._id, reminderIndex);
      // Refresh tasks to get updated count
      const updatedTasks = await taskService.getAllTasks();
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to update reminder triggered count:', error);
    }
  };

  const getMaxRingsForPriority = (priority) => ({
    low: 1,
    medium: 2,
    high: 3
  }[priority] || 1);

  const buildReminderDate = (task, reminder) => {
    const dueDate = new Date(task.dueDate);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminder.daysBefore);
    if (reminder.reminderTime) {
      const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
      reminderDate.setHours(hours, minutes, 0, 0);
    }
    return reminderDate;
  };

  const shouldTriggerReminder = (now, reminderDate, currentCount) => {
    const minutesSinceReminder = Math.floor((now.getTime() - reminderDate.getTime()) / (1000 * 60));
    const targetMinutes = currentCount * 60;
    const isWithinWindow = minutesSinceReminder >= targetMinutes && minutesSinceReminder < (targetMinutes + 1);
    return { isWithinWindow };
  };

  const processReminderForTask = async (task, reminder, reminderIndex, now, triggered, activeAlerts) => {
    const reminderDate = buildReminderDate(task, reminder);
    const maxRings = getMaxRingsForPriority(task.priority);
    const currentCount = reminder.triggeredCount || 0;
    if (currentCount >= maxRings || now < reminderDate) return;

    const { isWithinWindow } = shouldTriggerReminder(now, reminderDate, currentCount);
    if (!isWithinWindow) return;

    const triggerKey = `${task._id}-${reminderIndex}-${currentCount}`;
    if (triggered.has(triggerKey)) return;

    triggered.add(triggerKey);
    activeAlerts.push(task._id);
    setShowReminderAlert(true);
    await notifyReminder(task, reminder, reminderIndex);
  };

  /**
   * Check reminders with priority-based ring logic
   * Low: 1 time | Medium: 2 times (initial + 1hr) | High: 3 times (initial + 1hr + 1hr)
   */
  const checkReminders = async () => {
    const now = new Date();
    const triggered = reminderTriggeredRef.current;
    const activeAlerts = [];

    for (const task of tasks) {
      if (task.completed || !task.dueDate || !task.reminders?.length) continue;

      for (let reminderIndex = 0; reminderIndex < task.reminders.length; reminderIndex++) {
        const reminder = task.reminders[reminderIndex];
        await processReminderForTask(task, reminder, reminderIndex, now, triggered, activeAlerts);
      }
    }

    setReminderAlertIds([...new Set(activeAlerts)]);
  };

  /**
   * Apply filters and search to tasks
   */
  const applyFiltersAndSearch = () => {
    let result = [...tasks];

    // Apply completion filter
    if (filter === 'completed') {
      result = result.filter(task => task.completed);
    } else if (filter === 'pending') {
      result = result.filter(task => !task.completed);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        task =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    // Sort by priority (high -> medium -> low) then by due date
    result.sort((a, b) => {
      // Priority order
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    setFilteredTasks(result);
  };

  // Periodically check reminders
  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }
    const intervalId = setInterval(checkReminders, 30000);
    checkReminders();
    return () => clearInterval(intervalId);
  }, [tasks, isAuthenticated, audioPermissionGranted]);

  /**
   * NEW: Periodically check for pending reminders from backend
   * Checks every 30 seconds for new reminders
   */
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Check immediately
    checkPendingReminders();
    
    // Then check every 30 seconds
    const intervalId = setInterval(checkPendingReminders, 30000);
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, audioPermissionGranted]);

  /**
   * Close modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  // If not authenticated, show Login/Register screens
  if (!isAuthenticated) {
    return (
      <div className="app">
        {showRegister ? (
          <Register 
            onRegister={handleRegister} 
            onSwitchToLogin={() => setShowRegister(false)} 
          />
        ) : (
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={() => setShowRegister(true)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <Header currentUser={currentUser} onLogout={handleLogout} />

      <main className="main-content">
        <div className="container">
          {/* Error message */}
          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Audio permission banner to satisfy browser autoplay rules */}
          {!audioPermissionGranted && (
            <div className="audio-permission-banner">
              <div className="audio-permission-text">
                <strong>Enable reminder sound</strong>
                <p>Browsers block autoplay until you interact. Click once to allow reminders to ring.</p>
              </div>
              <button className="btn btn-primary" onClick={handleEnableReminderSound}>
                Enable Reminder Sound
              </button>
            </div>
          )}

          {/* NEW: ReminderPopup Component */}
          {showReminderPopup && activeReminderTask && (
            <ReminderPopup 
              task={activeReminderTask}
              onStopRingtone={handleStopRingtone}
              onSnooze={handleSnooze}
            />
          )}

          {/* Floating STOP button to ensure users can stop sound even if popup is obscured */}
          {isRingtoneActive && (
            <button className="floating-stop-button" onClick={handleStopRingtone}>
              🔕 Stop Ringtone
            </button>
          )}

          {/* NEW: Notification Component */}
          {notification.message && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ message: '', type: '' })}
            />
          )}

          {/* Quiet hours banner (sound muted) */}
          {isWithinQuietHours() && (
            <div className="quiet-hours-banner">
              <div>
                <strong>Quiet hours active (12AM–5AM)</strong>
                <p>Sound is muted during this window. Reminders will still appear and email/web notifications continue.</p>
              </div>
            </div>
          )}

          {(upcomingQueueCount > 0 || isReminderActive) && (
            <div className="queue-strip">
              <div className="queue-strip-text">
                <span className="queue-dot">🔔</span>
                <span>
                  {isReminderActive ? 'Reminder active' : 'No active reminder'} · {upcomingQueueCount} queued
                </span>
              </div>
              <button className="queue-strip-button" onClick={openQueueModal}>
                View Queue ({totalQueueCount})
              </button>
            </div>
          )}

          <ReminderQueueModal
            isOpen={showQueueModal}
            queue={reminderQueue}
            onClose={closeQueueModal}
            onMoveUp={handleQueueMoveUp}
            onMoveDown={handleQueueMoveDown}
            onRemove={handleQueueRemove}
          />

          {/* Ringtone Alert Banner */}
          {reminderAlertIds.length > 0 && !ringstoneStopped && showReminderAlert && (
            <div className="ringtone-alert-banner">
              <div className="alert-content">
                <span className="alert-icon">🔔</span>
                <div className="alert-text">
                  <strong>{reminderAlertIds.length} task reminder(s) active!</strong>
                  <p>Check your tasks and mark them as complete.</p>
                </div>
              </div>
              <button 
                className="btn btn-stop-ringtone" 
                onClick={stopRingtone}
              >
                🔇 Stop Ringtone
              </button>
            </div>
          )}

          {/* Ringtone Stopped Banner */}
          {ringstoneStopped && (
            <div className="ringtone-stopped-banner">
              <div className="stopped-content">
                <span className="stopped-icon">✅</span>
                <span className="stopped-text">Ringtone stopped successfully</span>
              </div>
              <button 
                className="btn-close-banner"
                onClick={() => {
                  setRingstoneStopped(false);
                  setShowReminderAlert(false); // Hide alert when closing stopped banner
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Add Task Form */}
          <AddTaskForm onAddTask={handleAddTask} />

          {/* Filter Bar */}
          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Task Statistics */}
          <div className="task-stats">
            <div className="stat">
              <span className="stat-value">{tasks.length}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {tasks.filter(t => !t.completed).length}
              </span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {tasks.filter(t => t.completed).length}
              </span>
              <span className="stat-label">Completed</span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading tasks...</p>
            </div>
          ) : (
            /* Task List */
            <TaskList
              tasks={filteredTasks}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onEdit={handleEditTask}
              reminderAlerts={reminderAlertIds}
            />
          )}
        </div>
      </main>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        task={selectedTask}
      />
    </div>
  );
}

export default App;
