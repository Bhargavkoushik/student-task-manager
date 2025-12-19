import React from 'react';
import TaskCard from './TaskCard';
import './TaskList.css';

/**
 * TaskList Component
 * Displays list of tasks or empty state
 */
const TaskList = ({ tasks, onToggleComplete, onDelete, onEdit, reminderAlerts = [] }) => {
  // Show empty state if no tasks
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <h3>No tasks found</h3>
        <p>Add a new task to get started!</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
          onEdit={onEdit}
          reminderAlert={reminderAlerts.includes(task._id)}
        />
      ))}
    </div>
  );
};

export default TaskList;
