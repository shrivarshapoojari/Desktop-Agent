import sqlite3 from "sqlite3";
sqlite3.verbose();

const db = new sqlite3.Database("memory.db");

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, description TEXT, time TEXT)");
});

export function addTask(desc, time) {
  db.run("INSERT INTO tasks (description, time) VALUES (?, ?)", [desc, time]);
}

export function getTasks(callback) {
  db.all("SELECT * FROM tasks", (err, rows) => {
    if (err) callback([]);
    else callback(rows);
  });
}

export function deleteTask(id) {
  db.run("DELETE FROM tasks WHERE id = ?", [id]);
}

export function clearTasks() {
  db.run("DELETE FROM tasks");
}
