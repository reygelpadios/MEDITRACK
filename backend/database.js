const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'meditrack.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birthdate TEXT,
      age INTEGER,
      gender TEXT,
      blood_type TEXT,
      contact_number TEXT,
      address TEXT,
      medical_condition TEXT,
      allergies TEXT,
      emergency_contact TEXT,
      insurance TEXT,
      notes TEXT,
      id_number TEXT,
      setup_mode TEXT,
      capability TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'caregiver')),
      patient_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      local_id TEXT,
      medicine_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      medicine_type TEXT,
      time TEXT,
      times_json TEXT,
      frequency TEXT,
      status TEXT DEFAULT 'active',
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      UNIQUE(patient_id, local_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS medication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER,
      patient_id INTEGER NOT NULL,
      local_id TEXT,
      local_medication_id TEXT,
      dose_date TEXT,
      scheduled_time TEXT NOT NULL,
      taken_time TEXT,
      status TEXT NOT NULL,
      logged_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE SET NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      UNIQUE(patient_id, local_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS caregivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      local_id TEXT,
      caregiver_name TEXT NOT NULL,
      relationship TEXT,
      contact_number TEXT,
      access TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      UNIQUE(patient_id, local_id)
    )
  `);
}

module.exports = {
  db,
  dbPath,
  initDatabase,
  run,
  get,
  all
};
