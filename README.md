# 📚 Student Task Manager

A full-stack web application built with the MERN stack that helps students organize and track their daily academic tasks efficiently.

## 📋 Table of Contents
- [Problem Statement](#problem-statement)
- [Project Goal](#project-goal)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [API Endpoints](#api-endpoints)
- [Folder Structure](#folder-structure)
- [Local Setup](#local-setup)
- [Usage](#usage)
- [Screenshots](#screenshots)

## 🎯 Problem Statement

Students often face challenges in managing their academic workload effectively:
- **Forgotten Tasks**: Important assignments and deadlines slip through the cracks
- **Missed Deadlines**: Lack of organization leads to late submissions
- **Poor Prioritization**: Difficulty in identifying which tasks need immediate attention
- **Scattered Information**: Tasks stored in multiple places without a central system

## 🚀 Project Goal

Design and develop a simple, responsive task management system that enables students to:
- ✅ Add new tasks with detailed information
- 📝 Update and edit existing tasks
- 🎯 Track task completion status
- 🔍 Filter and search tasks efficiently
- 📊 Prioritize tasks based on urgency
- ⏰ Monitor due dates and avoid missing deadlines

## ✨ Features

### Core Functionality
- **Task Management**: Create, read, update, and delete tasks
- **Task Completion**: Mark tasks as completed or pending
- **Priority Levels**: Categorize tasks as low, medium, or high priority
- **Due Dates**: Set and track task deadlines
- **Task Details**: Add descriptions for additional context

### User Experience
- **Filtering**: View all tasks, only completed, or only pending tasks
- **Search**: Real-time search across task titles and descriptions
- **Smart Sorting**: Automatically sorts by priority and due date
- **Overdue Alerts**: Visual indicators for tasks past their due date
- **Task Statistics**: Dashboard showing total, pending, and completed tasks
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### Additional Features
- **Form Validation**: Client-side validation with helpful error messages
- **Empty States**: User-friendly messages when no tasks exist
- **Error Handling**: Graceful error handling with user feedback
- **Loading States**: Visual feedback during data operations
- **Confirmation Dialogs**: Prevent accidental task deletions

## 🛠️ Tech Stack

### Frontend
- **React 18**: UI component library
- **Vite**: Fast build tool and development server
- **Axios**: HTTP client for API requests
- **CSS3**: Custom styling with CSS variables and animations

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for data persistence
- **Mongoose**: MongoDB object modeling tool

### Development Tools
- **Nodemon**: Auto-restart server during development
- **dotenv**: Environment variable management
- **CORS**: Cross-Origin Resource Sharing middleware

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Task Routes

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/tasks` | Get all tasks | - |
| GET | `/tasks/:id` | Get single task by ID | - |
| POST | `/tasks` | Create new task | `{ title, description, priority, dueDate }` |
| PUT | `/tasks/:id` | Update existing task | `{ title, description, priority, dueDate, completed }` |
| DELETE | `/tasks/:id` | Delete task | - |

### Request Example (POST /tasks)
```json
{
  "title": "Complete Math Assignment",
  "description": "Solve problems 1-20 from Chapter 5",
  "priority": "high",
  "dueDate": "2025-12-20",
  "completed": false
}
```

### Response Example (Success)
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Complete Math Assignment",
    "description": "Solve problems 1-20 from Chapter 5",
    "priority": "high",
    "dueDate": "2025-12-20T00:00:00.000Z",
    "completed": false,
    "createdAt": "2025-12-17T10:30:00.000Z",
    "updatedAt": "2025-12-17T10:30:00.000Z"
  }
}
```

## 📁 Folder Structure

```
smart-task-management/
│
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection configuration
│   ├── controllers/
│   │   └── taskController.js     # Task business logic
│   ├── models/
│   │   └── Task.js               # Task schema and model
│   ├── routes/
│   │   └── taskRoutes.js         # API route definitions
│   ├── .env                      # Environment variables
│   ├── .gitignore               # Git ignore file
│   ├── package.json             # Backend dependencies
│   └── server.js                # Express server entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx           # Header component
    │   │   ├── Header.css           # Header styles
    │   │   ├── AddTaskForm.jsx      # Task creation form
    │   │   ├── AddTaskForm.css      # Form styles
    │   │   ├── FilterBar.jsx        # Filter and search bar
    │   │   ├── FilterBar.css        # Filter bar styles
    │   │   ├── TaskList.jsx         # Task list container
    │   │   ├── TaskList.css         # Task list styles
    │   │   ├── TaskCard.jsx         # Individual task card
    │   │   ├── TaskCard.css         # Task card styles
    │   │   ├── Modal.jsx            # Edit task modal
    │   │   └── Modal.css            # Modal styles
    │   ├── services/
    │   │   └── taskService.js       # API service layer
    │   ├── App.jsx                  # Main App component
    │   ├── App.css                  # Global app styles
    │   ├── main.jsx                 # React entry point
    │   └── index.css                # Base CSS styles
    ├── index.html                   # HTML template
    ├── vite.config.js               # Vite configuration
    ├── .env                         # Environment variables
    ├── .gitignore                  # Git ignore file
    └── package.json                # Frontend dependencies
```

## 🚀 Local Setup

### Prerequisites
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - Choose one option:
  - Local MongoDB installation - [Download here](https://www.mongodb.com/try/download/community)
  - MongoDB Atlas (cloud) - [Sign up here](https://www.mongodb.com/cloud/atlas)
- **npm** or **yarn** package manager (comes with Node.js)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Edit the `.env` file and update the MongoDB connection string:
   
   For local MongoDB:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/student-task-manager
   ```
   
   For MongoDB Atlas:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/student-task-manager
   ```

4. **Start MongoDB (if using local installation)**
   
   Windows:
   ```bash
   mongod
   ```
   
   macOS/Linux:
   ```bash
   sudo systemctl start mongod
   ```

5. **Start the backend server**
   
   Development mode (with auto-restart):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

6. **Verify backend is running**
   
   Open browser and navigate to: `http://localhost:5000`
   
   You should see: `{"message":"Student Task Manager API"}`

### Frontend Setup

1. **Open a new terminal and navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   The `.env` file should already contain:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   The application will automatically open in your browser at: `http://localhost:3000`
   
   If it doesn't open automatically, navigate to the URL manually.

### Verify Installation

1. Backend should be running on port 5000
2. Frontend should be running on port 3000
3. Create a test task to verify the connection between frontend and backend
4. Check the browser console and terminal for any errors

## 📖 Usage

### Adding a Task
1. Fill in the task title (required)
2. Optionally add a description
3. Select priority level (low, medium, high)
4. Set a due date (optional)
5. Click "Add Task" button

### Managing Tasks
- **Complete/Uncomplete**: Click the checkbox on any task
- **Edit**: Click the edit (✏️) button to open the edit modal
- **Delete**: Click the delete (🗑️) button and confirm deletion

### Filtering and Searching
- Use the filter buttons to view: All, Pending, or Completed tasks
- Type in the search box to find tasks by title or description
- Tasks are automatically sorted by priority and due date

### Understanding Priority Colors
- 🟢 **Low**: Green badge and border
- 🟡 **Medium**: Yellow/orange badge and border
- 🔴 **High**: Red badge and border

### Overdue Tasks
- Tasks with past due dates are highlighted with a pink background
- The due date text appears in red for overdue tasks

## 📸 Screenshots

### Main Dashboard
![Dashboard showing task list with filters and statistics]

### Add Task Form
![Form for creating new tasks with validation]

### Edit Task Modal
![Modal dialog for editing existing tasks]

### Mobile View
![Responsive design on mobile devices]

## 🧪 Testing

### Manual Testing Checklist

✅ **Create Task**
- Create task with all fields
- Create task with only required fields
- Attempt to create task without title (should show error)

✅ **Read Tasks**
- View all tasks
- View single task details

✅ **Update Task**
- Edit task information
- Toggle completion status
- Update priority and due date

✅ **Delete Task**
- Delete task with confirmation
- Cancel deletion

✅ **Filters**
- Filter by All, Completed, Pending
- Search by title and description

✅ **Responsive Design**
- Test on desktop (1920x1080)
- Test on tablet (768px)
- Test on mobile (375px)

## 🔧 Troubleshooting

### Backend Issues

**MongoDB Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
- Ensure MongoDB is running locally or check your Atlas connection string
- Verify the MONGO_URI in `.env` file is correct

**Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::5000
```
- Change the PORT in backend `.env` file
- Or kill the process using port 5000

### Frontend Issues

**API Connection Failed**
```
Failed to load tasks. Please check if the server is running.
```
- Verify backend server is running on port 5000
- Check VITE_API_URL in frontend `.env` file
- Ensure CORS is enabled in backend

**Build Errors**
- Delete `node_modules` folder
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`

## 🤝 Contributing

This is a learning project. Feel free to fork and modify for your own use!

## 📝 License

This project is open source and available for educational purposes.

## 👨‍💻 Author

Built with ❤️ for students who want to stay organized and productive.

---

## 🎓 Learning Resources

- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [Vite Documentation](https://vitejs.dev/)

---

**Happy Task Managing! 📚✨**
