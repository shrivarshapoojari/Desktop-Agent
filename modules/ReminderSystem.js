import { addTask, getTasks, deleteTask, clearTasks } from "../db.js";
import notifier from 'node-notifier';

/**
 * Efficient Reminder System using setTimeout scheduling
 * Eliminates the need for continuous polling
 */
class ReminderSystem {
  constructor() {
    this.reminderScheduler = new Map(); // Store scheduled timeouts
    this.notificationCallback = null;
  }

  /**
   * Initialize reminder system with callback
   * @param {Function} callback - Function to call when reminder triggers
   */
  initialize(callback) {
    this.notificationCallback = callback;
    console.log("🔔 Efficient reminder system initialized");
    
    // Load existing tasks and schedule them immediately
    this.scheduleExistingReminders();
  }

  /**
   * Schedule all existing reminders when app starts
   */
  scheduleExistingReminders() {
    getTasks((tasks) => {
      tasks.forEach(task => {
        this.scheduleReminder(task);
      });
      console.log(`📅 Scheduled ${tasks.length} existing reminders`);
    });
  }

  /**
   * Schedule a single reminder - much more efficient than polling
   * @param {Object} task - Task object with id, description, and time
   */
  scheduleReminder(task) {
    const now = new Date();
    const [hours, minutes] = task.time.split(':').map(Number);
    
    // Create target time for today
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, skip it (it's in the past)
    if (targetTime <= now) {
      console.log(`⏰ Reminder for "${task.description}" at ${task.time} has already passed today`);
      return;
    }
    
    const timeUntilReminder = targetTime.getTime() - now.getTime();
    
    console.log(`⏳ Scheduling reminder "${task.description}" in ${Math.round(timeUntilReminder / 1000 / 60)} minutes`);
    
    // Schedule the reminder with setTimeout (much more efficient!)
    const timeoutId = setTimeout(() => {
      this.triggerReminder(task);
    }, timeUntilReminder);
    
    // Store the timeout ID so we can cancel it if needed
    this.reminderScheduler.set(task.id, timeoutId);
  }

  /**
   * Trigger a reminder notification
   * @param {Object} task - Task object to trigger reminder for
   */
  triggerReminder(task) {
    console.log(`🔔 Triggering reminder: ${task.description} at ${task.time}`);
    
    // Send notification to UI
    if (this.notificationCallback) {
      this.notificationCallback(`🔔 **REMINDER ALERT!** 🔔\n\n📋 **Task:** ${task.description}\n🕐 **Time:** ${task.time}\n\n✅ This task will be automatically removed after this notification\n📝 Use "show my tasks" to see remaining reminders`);
    }
    
    // Show Windows system notification
    this.showSystemNotification(task);
    
    // Remove the task from database after notification
    deleteTask(task.id, (deleteResult) => {
      if (deleteResult) {
        console.log(`🗑️ Task ${task.id} automatically deleted after reminder notification`);
      } else {
        console.log(`❌ Failed to delete task ${task.id} after reminder`);
      }
    });
    
    // Remove from scheduler
    this.reminderScheduler.delete(task.id);
    
    console.log(`✅ Reminder completed and removed: ${task.description}`);
  }

  /**
   * Show system notification using node-notifier
   * @param {Object} task - Task object for notification
   */
  showSystemNotification(task) {
    try {
      notifier.notify({
        title: '🔔 Desktop Agent Reminder',
        message: `${task.description} at ${task.time}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png',
        sound: true,
        wait: false,
        timeout: 10,
        type: 'info'
      }, (err) => {
        if (err) {
          console.log("Notification failed:", err);
        } else {
          console.log("✅ Windows system notification sent via node-notifier");
        }
      });
    } catch (error) {
      console.log("System notification not available");
    }
  }

  /**
   * Add a new reminder and schedule it immediately
   * @param {string} description - Task description
   * @param {string} time - Time in HH:MM format
   */
  addReminder(description, time) {
    // Add to database
    addTask(description, time);
    
    // Get the task with proper ID and schedule it immediately
    getTasks((tasks) => {
      const newTask = tasks.find(t => t.description === description && t.time === time);
      if (newTask) {
        this.scheduleReminder(newTask);
      }
    });
    
    console.log(`📅 New reminder scheduled: ${description} at ${time}`);
  }

  /**
   * Cancel a scheduled reminder
   * @param {number} taskId - Task ID to cancel
   */
  cancelReminder(taskId) {
    if (this.reminderScheduler.has(taskId)) {
      clearTimeout(this.reminderScheduler.get(taskId));
      this.reminderScheduler.delete(taskId);
      console.log(`❌ Cancelled scheduled reminder for task ${taskId}`);
    }
  }

  /**
   * Stop reminder system and clear all schedules
   */
  stop() {
    // Clear all scheduled timeouts
    this.reminderScheduler.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.reminderScheduler.clear();
    console.log("🛑 Efficient reminder system stopped and all schedules cleared");
  }

  /**
   * Clear all tasks and cancel all reminders
   */
  clearAll() {
    // Cancel all scheduled reminders
    this.reminderScheduler.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.reminderScheduler.clear();
    
    clearTasks();
    console.log("🗑️ All tasks cleared and reminders cancelled!");
  }
}

// Export singleton instance
export const reminderSystem = new ReminderSystem();
