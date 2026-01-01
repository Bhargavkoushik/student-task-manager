import axios from 'axios';

// Create axios instance with base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request interceptor to add JWT token to headers
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle auth errors
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (globalThis.location && globalThis.location.pathname !== '/') {
        globalThis.location.href = '/';
      }
    }
    // Don't log 404 errors for fired-reminders endpoint (expected when no reminders)
    if (error.response?.status === 404 && error.config?.url?.includes('fired-reminders')) {
      // Silently return empty data structure
      return Promise.resolve({ data: { success: true, count: 0, data: [] } });
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API service
 */
const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      if (!user || user === 'undefined' || user === 'null') {
        return null;
      }
      return JSON.parse(user);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

/**
 * Task API service
 * Handles all HTTP requests to the backend
 */
const taskService = {
  // Get all tasks
  getAllTasks: async () => {
    const response = await api.get('/tasks');
    return response.data.data;
  },

  // Get single task by ID
  getTaskById: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data.data;
  },

  // Create new task
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data.data;
  },

  // Update existing task
  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data.data;
  },

  // Delete task
  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  // Update reminder triggered count
  updateReminderTriggered: async (id, reminderIndex) => {
    const response = await api.put(`/tasks/${id}/reminder-triggered`, { reminderIndex });
    return response.data;
  },

  // Get pending reminders (new endpoint)
  getPendingReminders: async () => {
    const response = await api.get('/tasks/pending-reminders');
    return response.data;
  },

  // Get reminders that have fired and need UI display
  getFiredReminders: async () => {
    const response = await api.get('/tasks/fired-reminders');
    return response.data;
  },

  // Progress reminder after ringtone ends or is stopped
  reminderProgress: async (id, { stopped = false } = {}) => {
    const response = await api.post(`/tasks/${id}/reminder-progress`, { stopped });
    return response.data;
  }
};

export default taskService;
export { authService };