import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import AddTaskForm from './components/AddTaskForm';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import Modal from './components/Modal';
import ReminderPopup from './components/ReminderPopup';
import Notification from './components/Notification';
import useRingtone from './hooks/useRingtone';
import taskService, { authService } from './services/taskService';
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
  const [notification, setNotification] = useState({ message: '', type: '' });
  const processedRemindersRef = useRef(new Set());
  
  // Ringtone hook
  const { scheduleRingtones, stopRingtone: stopRingtoneHook, stopAndEnd, initAudioContext } = useRingtone();
  
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

  // Fetch tasks whenever auth state changes to authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated]);

  // Ask for notification permission once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    // Initialize audio context on first user interaction
    initAudioContext();
  }, [isAuthenticated]);

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
        if (window.alert) {
          setTimeout(() => {
            alert(`⏰ Reminder: ${task.title} is due!`);
          }, 100);
        }
        
        // 2. Show browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('⏰ Task Reminder', {
            body: `${task.title}\n${task.description || ''}\nPriority: ${task.priority.toUpperCase()}`,
            icon: '/favicon.ico',
            tag: reminderId
          });
        }
        
        // 3. Display ReminderPopup component
        setActiveReminderTask(task);
        setShowReminderPopup(true);
        
        // 4. Play single 10s ringtone; when it ends, progress reminder in backend
        const onRingEnd = async (endedTask) => {
          try {
            const result = await taskService.reminderProgress(endedTask._id, { stopped: false });
            // Update tasks list
            await fetchTasks();

            // Close popup
            setShowReminderPopup(false);
            setActiveReminderTask(null);

            // Show notification based on result
            if (result?.data?.completed) {
              setNotification({ message: 'Task completed after max reminders ✅', type: 'success' });
            } else {
              setNotification({ message: 'Next reminder scheduled in 1 hour ⏳', type: 'info' });
            }
            setTimeout(() => setNotification({ message: '', type: '' }), 5000);
          } catch (err) {
            console.error('Failed to progress reminder:', err);
          }
        };

        scheduleRingtones(task, onRingEnd);
      }
      
      // Refresh tasks to get updated status
      if (pendingTasks.length > 0) {
        await fetchTasks();
      }
      
    } catch (error) {
      console.error('Error checking pending reminders:', error);
    }
  };

  /**
   * Handle "Stop Ringtone" button click from ReminderPopup
   */
  const handleStopRingtone = async () => {
    try {
      // Stop and signal end to progress reminder
      stopAndEnd();

      // Close the popup immediately
      setShowReminderPopup(false);
      setActiveReminderTask(null);

      // Show success toast
      setNotification({ message: 'Ringtone stopped successfully 🔕', type: 'success' });
      setTimeout(() => setNotification({ message: '', type: '' }), 5000);

      // Backend progress will be handled by the onEnd callback from the hook
    } catch (err) {
      console.error('Failed to stop ringtone:', err);
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
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (err) {
      setError('Failed to load tasks. Please check if the server is running.');
      console.error('Error fetching tasks:', err);
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
    if (window.confirm('Are you sure you want to delete this task?')) {
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

  const stopRingtone = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setRingstoneStopped(true);
    
    // Close all notifications
    if (typeof Notification !== 'undefined') {
      // We'll handle notification closing through actions
    }
  };

  /**
   * Notify with priority-based ringtone and browser notification with STOP button
   */
  const notifyReminder = async (task, reminder, reminderIndex) => {
    // Stop any currently playing ringtone
    stopRingtone();

    // Play ringtone for 6 seconds
    const src = ringtoneLibrary[reminder.ringtone] || ringtoneLibrary.chime;
    const audio = new Audio(src);
    audio.loop = false;
    currentAudioRef.current = audio;
    audio.play().catch(() => {});
    
    // Automatically stop after 6 seconds
    const timeout = setTimeout(() => {
      stopRingtone();
    }, 6000);

    // Browser notification with actions
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notificationBody = [
        `📌 ${task.title}`,
        task.description ? `📝 ${task.description}` : '',
        `⚡ Priority: ${task.priority.toUpperCase()}`,
        `📅 Due: ${new Date(task.dueDate).toLocaleDateString()}`,
        `🔔 Ringtone: ${reminder.ringtone}`,
        `🔁 Will ring ${task.priority === 'low' ? '1 time' : task.priority === 'medium' ? '2 times (every hour)' : '3 times (every hour)'}`,
        '',
        '👇 Click STOP to silence reminder'
      ].filter(Boolean).join('\n');

      const notification = new Notification('⏰ Task Reminder!', {
        body: notificationBody,
        tag: `${task._id}-${reminderIndex}`,
        icon: '📚',
        badge: '⏰',
        requireInteraction: true, // Keeps notification until user interacts
        silent: false
      });

      // Handle notification click to stop ringtone
      notification.onclick = () => {
        clearTimeout(timeout);
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

  /**
   * Check reminders with priority-based ring logic
   * Low: 1 time | Medium: 2 times (initial + 1hr) | High: 3 times (initial + 1hr + 1hr)
   */
  const checkReminders = async () => {
    const now = new Date();
    const triggered = reminderTriggeredRef.current;
    const activeAlerts = [];

    console.log('🔔 Checking reminders at:', now.toLocaleTimeString());

    for (const task of tasks) {
      if (task.completed || !task.dueDate || !task.reminders || task.reminders.length === 0) continue;

      console.log(`📋 Task: ${task.title} has ${task.reminders.length} reminders`);

      // Check each reminder for this task
      for (let reminderIndex = 0; reminderIndex < task.reminders.length; reminderIndex++) {
        const reminder = task.reminders[reminderIndex];
        
        // Calculate reminder date: due date minus days before
        const dueDate = new Date(task.dueDate);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - reminder.daysBefore);
        
        // Set the time from reminderTime string (format: "HH:mm")
        if (reminder.reminderTime) {
          const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
          reminderDate.setHours(hours, minutes, 0, 0);
        }

        console.log(`  Reminder ${reminderIndex + 1}:`);
        console.log(`  - Reminder date: ${reminderDate.toLocaleString()}`);
        console.log(`  - Due date: ${dueDate.toLocaleString()}`);
        console.log(`  - Days before: ${reminder.daysBefore}`);
        console.log(`  - Reminder time: ${reminder.reminderTime}`);
        console.log(`  - Priority: ${task.priority}`);
        console.log(`  - Triggered count: ${reminder.triggeredCount || 0}`);

        // Get max rings based on priority
        const maxRings = {
          low: 1,
          medium: 2,
          high: 3
        }[task.priority] || 1;

        const currentCount = reminder.triggeredCount || 0;

        // Check if we should trigger reminder
        if (currentCount < maxRings) {
          // Calculate minutes since reminder time for more precise checking
          const minutesSinceReminder = Math.floor((now.getTime() - reminderDate.getTime()) / (1000 * 60));
          
          // Check if we're within 1 minute of the target time
          // For initial reminder (count 0): trigger at reminder time
          // For subsequent reminders: trigger at 1-hour intervals (60 min, 120 min, etc.)
          const targetMinutes = currentCount * 60; // 0, 60, 120 minutes
          const isWithinWindow = minutesSinceReminder >= targetMinutes && minutesSinceReminder < (targetMinutes + 1);
          
          console.log(`  - Minutes since reminder: ${minutesSinceReminder}`);
          console.log(`  - Target minutes: ${targetMinutes}`);
          console.log(`  - Is within window: ${isWithinWindow}`);
          
          if (isWithinWindow && now >= reminderDate) {
            // Check if we haven't already triggered for this specific occurrence
            const triggerKey = `${task._id}-${reminderIndex}-${currentCount}`;
            if (!triggered.has(triggerKey)) {
              console.log(`🔔 TRIGGERING REMINDER for ${task.title}, reminder ${reminderIndex + 1}!`);
              triggered.add(triggerKey);
              activeAlerts.push(task._id);
              setShowReminderAlert(true);
              await notifyReminder(task, reminder, reminderIndex);
            } else {
              console.log(`  - Already triggered this occurrence`);
            }
          }
        } else {
          console.log(`  - Max rings reached (${maxRings})`);
        }
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
          (task.description && task.description.toLowerCase().includes(query))
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
    if (!isAuthenticated) return;
    const intervalId = setInterval(checkReminders, 30000);
    checkReminders();
    return () => clearInterval(intervalId);
  }, [tasks, isAuthenticated]);

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
  }, [isAuthenticated]);

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

          {/* NEW: ReminderPopup Component */}
          {showReminderPopup && activeReminderTask && (
            <ReminderPopup 
              task={activeReminderTask}
              onStopRingtone={handleStopRingtone}
            />
          )}

          {/* NEW: Notification Component */}
          {notification.message && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ message: '', type: '' })}
            />
          )}

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
