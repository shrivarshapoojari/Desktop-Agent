import Groq from "groq-sdk";
import { addTask, getTasks, deleteTask, clearTasks } from "./db.js";
import { exec } from "child_process";
import dotenv from "dotenv";

dotenv.config();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseCommand(command) {
  try {
    const res = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { 
          role: "system", 
          content: `You are a desktop AI agent. Parse user commands and respond with JSON containing:
          - action: "add_reminder", "show_tasks", "clear_tasks", "delete_task", "open_app", "unknown"
          - task: description for reminders
          - time: time for reminders (format: "HH:MM" or "today at HH:MM")
          - app: application name for opening apps
          - task_id: ID for deleting specific tasks
          
          Examples:
          "remind me to call mom at 3pm" -> {"action": "add_reminder", "task": "call mom", "time": "15:00"}
          "show my tasks" -> {"action": "show_tasks"}
          "open notepad" -> {"action": "open_app", "app": "notepad"}
          "clear all tasks" -> {"action": "clear_tasks"}` 
        },
        { role: "user", content: command }
      ],
      temperature: 0.1
    });
    
    console.log("AI Response:", res.choices[0].message.content);
    return res.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw new Error("Failed to process command with AI");
  }
}

export async function handleCommand(command, callback) {
  try {
    const parsed = await parseCommand(command);
    const data = JSON.parse(parsed);

    if (data.action === "add_reminder") {
      if (data.task && data.time) {
        addTask(data.task, data.time);
        callback(`✅ Reminder set: "${data.task}" at ${data.time}`);
      } else {
        callback("❌ Please specify both task and time for the reminder.");
      }
    } else if (data.action === "show_tasks") {
      getTasks((tasks) => {
        if (tasks.length === 0) {
          callback("📝 No tasks found. You're all caught up!");
        } else {
          const taskList = tasks.map(t => `${t.id}. ${t.description} @ ${t.time}`).join("\n");
          callback(`📋 Your Tasks:\n${taskList}`);
        }
      });
    } else if (data.action === "clear_tasks") {
      clearTasks();
      callback("🗑️ All tasks cleared!");
    } else if (data.action === "delete_task") {
      if (data.task_id) {
        deleteTask(data.task_id);
        callback(`🗑️ Task ${data.task_id} deleted!`);
      } else {
        callback("❌ Please specify which task to delete.");
      }
    } else if (data.action === "open_app") {
      if (data.app) {
        exec(`start ${data.app}`, (error) => {
          if (error) {
            callback(`❌ Could not open ${data.app}. Make sure it's installed.`);
          } else {
            callback(`🚀 Opening ${data.app}...`);
          }
        });
      } else {
        callback("❌ Please specify which app to open.");
      }
    } else {
      callback("🤔 I'm not sure how to handle that command yet. Try:\n• 'remind me to [task] at [time]'\n• 'show my tasks'\n• 'open [app name]'\n• 'clear all tasks'");
    }
  } catch (err) {
    console.error("Command handling error:", err);
    callback("❌ Sorry, I had trouble understanding that command. Please try again.");
  }
}
