const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { initDatabase, run, get, all, dbPath } = require('./database');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function required(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function normalizeRole(role) {
  return String(role || '').toLowerCase() === 'caregiver' ? 'caregiver' : 'patient';
}

function ageFromBirthdate(birthdate) {
  if (!birthdate) return null;
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

function patientFromBody(body) {
  return {
    first_name: body.first_name || body.firstName,
    last_name: body.last_name || body.lastName,
    birthdate: body.birthdate || body.dob || null,
    age: body.age ?? ageFromBirthdate(body.birthdate || body.dob),
    gender: body.gender || null,
    blood_type: body.blood_type || body.blood || null,
    contact_number: body.contact_number || body.contactNumber || null,
    address: body.address || null,
    medical_condition: body.medical_condition || body.condition || null,
    allergies: body.allergies || null,
    emergency_contact: body.emergency_contact || body.emergencyContact || null,
    insurance: body.insurance || null,
    notes: body.notes || '',
    id_number: body.id_number || body.idNumber || null,
    setup_mode: body.setup_mode || body.setupMode || null,
    capability: body.capability || body.capMode || null
  };
}

function frontendPatient(row) {
  if (!row) return null;
  return {
    remoteId: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.birthdate || '',
    age: row.age,
    gender: row.gender || '',
    blood: row.blood_type || '',
    contactNumber: row.contact_number || '',
    address: row.address || '',
    condition: row.medical_condition || '',
    allergies: row.allergies || '',
    emergencyContact: row.emergency_contact || '',
    insurance: row.insurance || '',
    notes: row.notes || '',
    idNumber: row.id_number || `MT-${String(row.id).padStart(6, '0')}`,
    setupMode: row.setup_mode || 'patient',
    capMode: row.capability || 'capable',
    createdAt: row.created_at
  };
}

function medicationFromBody(body) {
  const times = Array.isArray(body.times)
    ? body.times
    : typeof body.times_json === 'string'
      ? JSON.parse(body.times_json || '[]')
      : body.time
        ? [body.time]
        : [];
  return {
    patient_id: body.patient_id || body.patientId,
    local_id: body.local_id || body.localId || body.id || null,
    medicine_name: body.medicine_name || body.name,
    dosage: body.dosage || body.dose,
    medicine_type: body.medicine_type || body.type || null,
    time: body.time || times[0] || null,
    times_json: JSON.stringify(times),
    frequency: body.frequency || body.freqLabel || null,
    status: body.status || (body.active === false ? 'archived' : 'active'),
    start_date: body.start_date || body.startDate || null,
    end_date: body.end_date || body.endDate || null,
    notes: body.notes || ''
  };
}

function frontendMedication(row) {
  let times = [];
  try { times = JSON.parse(row.times_json || '[]'); } catch { times = []; }
  if (!times.length && row.time) times = [row.time];
  return {
    id: row.local_id ? Number(row.local_id) || row.local_id : row.id,
    remoteId: row.id,
    patientId: row.patient_id,
    name: row.medicine_name,
    dose: row.dosage,
    type: row.medicine_type || 'Tablet',
    freqLabel: row.frequency || String(times.length || 1),
    times,
    startDate: row.start_date || '',
    endDate: row.end_date || null,
    notes: row.notes || '',
    active: row.status !== 'archived',
    createdAt: row.created_at
  };
}

function logFromBody(body) {
  return {
    medication_id: body.medication_id || body.medicationId || null,
    patient_id: body.patient_id || body.patientId,
    local_id: body.local_id || body.localId || body.id || null,
    local_medication_id: body.local_medication_id || body.localMedicationId || body.medId || null,
    dose_date: body.dose_date || body.date || null,
    scheduled_time: body.scheduled_time || body.scheduledTime,
    taken_time: body.taken_time || body.takenAt || null,
    status: body.status || 'taken',
    logged_by: body.logged_by || body.loggedBy || 'Self'
  };
}

function frontendLog(row) {
  return {
    id: row.local_id ? Number(row.local_id) || row.local_id : row.id,
    remoteId: row.id,
    medId: row.local_medication_id ? Number(row.local_medication_id) || row.local_medication_id : row.medication_id,
    medicationId: row.medication_id,
    patientId: row.patient_id,
    date: row.dose_date || (row.created_at || '').slice(0, 10),
    scheduledTime: row.scheduled_time,
    takenAt: row.taken_time,
    status: row.status,
    loggedBy: row.logged_by || 'Self'
  };
}

function caregiverFromBody(body) {
  return {
    patient_id: body.patient_id || body.patientId,
    local_id: body.local_id || body.localId || body.id || null,
    caregiver_name: body.caregiver_name || body.caregiverName || body.name,
    relationship: body.relationship || null,
    contact_number: body.contact_number || body.contactNumber || body.phone || null,
    access: body.access || null
  };
}

function frontendCaregiver(row) {
  return {
    id: row.local_id ? Number(row.local_id) || row.local_id : row.id,
    remoteId: row.id,
    patientId: row.patient_id,
    name: row.caregiver_name,
    relationship: row.relationship || '',
    phone: row.contact_number || '',
    access: row.access || 'View Only',
    addedAt: row.created_at
  };
}

app.get('/health', (req, res) => {
  res.json({ ok: true, database: dbPath });
});

app.post('/register', asyncRoute(async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  const role = normalizeRole(req.body.role);

  if (!required(email) || !required(password)) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const existing = await get('SELECT id FROM users WHERE lower(email) = lower(?)', [email]);
  if (existing) return res.status(409).json({ error: 'Email is already registered.' });

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await run(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
    [email.trim().toLowerCase(), hash, role]
  );
  const user = await get('SELECT id, email, role, patient_id, created_at FROM users WHERE id = ?', [result.id]);
  res.status(201).json({ user });
}));

app.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  if (!required(email) || !required(password)) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
  if (!user) return res.status(401).json({ error: 'Invalid email address.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Wrong password.' });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      patient_id: user.patient_id,
      created_at: user.created_at
    }
  });
}));

app.get('/users/:id', asyncRoute(async (req, res) => {
  const user = await get('SELECT id, email, role, patient_id, created_at FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
}));

app.post('/patients', asyncRoute(async (req, res) => {
  const p = patientFromBody(req.body);
  if (!required(p.first_name) || !required(p.last_name)) {
    return res.status(400).json({ error: 'First and last name are required.' });
  }

  const result = await run(`
    INSERT INTO patients (
      first_name, last_name, birthdate, age, gender, blood_type, contact_number,
      address, medical_condition, allergies, emergency_contact, insurance, notes,
      id_number, setup_mode, capability
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    p.first_name, p.last_name, p.birthdate, p.age, p.gender, p.blood_type, p.contact_number,
    p.address, p.medical_condition, p.allergies, p.emergency_contact, p.insurance, p.notes,
    p.id_number, p.setup_mode, p.capability
  ]);

  if (req.body.user_id || req.body.userId) {
    await run('UPDATE users SET patient_id = ? WHERE id = ?', [result.id, req.body.user_id || req.body.userId]);
  }

  const patient = await get('SELECT * FROM patients WHERE id = ?', [result.id]);
  res.status(201).json({ patient, frontend: frontendPatient(patient) });
}));

app.get('/patients/:id', asyncRoute(async (req, res) => {
  const patient = await get('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  res.json({ patient, frontend: frontendPatient(patient) });
}));

app.put('/patients/:id', asyncRoute(async (req, res) => {
  const p = patientFromBody(req.body);
  await run(`
    UPDATE patients SET
      first_name = ?, last_name = ?, birthdate = ?, age = ?, gender = ?, blood_type = ?,
      contact_number = ?, address = ?, medical_condition = ?, allergies = ?,
      emergency_contact = ?, insurance = ?, notes = ?, id_number = ?, setup_mode = ?,
      capability = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    p.first_name, p.last_name, p.birthdate, p.age, p.gender, p.blood_type,
    p.contact_number, p.address, p.medical_condition, p.allergies,
    p.emergency_contact, p.insurance, p.notes, p.id_number, p.setup_mode,
    p.capability, req.params.id
  ]);
  const patient = await get('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  res.json({ patient, frontend: frontendPatient(patient) });
}));

app.post('/medications', asyncRoute(async (req, res) => {
  const med = medicationFromBody(req.body);
  if (!required(med.patient_id) || !required(med.medicine_name) || !required(med.dosage)) {
    return res.status(400).json({ error: 'Patient, medication name, and dosage are required.' });
  }

  const existing = med.local_id
    ? await get('SELECT id FROM medications WHERE patient_id = ? AND local_id = ?', [med.patient_id, med.local_id])
    : null;

  let id = existing?.id;
  if (existing) {
    await run(`
      UPDATE medications SET medicine_name = ?, dosage = ?, medicine_type = ?, time = ?,
        times_json = ?, frequency = ?, status = ?, start_date = ?, end_date = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      med.medicine_name, med.dosage, med.medicine_type, med.time, med.times_json,
      med.frequency, med.status, med.start_date, med.end_date, med.notes, id
    ]);
  } else {
    const result = await run(`
      INSERT INTO medications (
        patient_id, local_id, medicine_name, dosage, medicine_type, time, times_json,
        frequency, status, start_date, end_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      med.patient_id, med.local_id, med.medicine_name, med.dosage, med.medicine_type,
      med.time, med.times_json, med.frequency, med.status, med.start_date, med.end_date, med.notes
    ]);
    id = result.id;
  }

  const row = await get('SELECT * FROM medications WHERE id = ?', [id]);
  res.status(existing ? 200 : 201).json({ medication: row, frontend: frontendMedication(row) });
}));

app.get('/medications/:patientId', asyncRoute(async (req, res) => {
  const rows = await all('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC', [req.params.patientId]);
  res.json({ medications: rows, frontend: rows.map(frontendMedication) });
}));

app.put('/medications/:id', asyncRoute(async (req, res) => {
  const med = medicationFromBody(req.body);
  await run(`
    UPDATE medications SET medicine_name = ?, dosage = ?, medicine_type = ?, time = ?,
      times_json = ?, frequency = ?, status = ?, start_date = ?, end_date = ?,
      notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    med.medicine_name, med.dosage, med.medicine_type, med.time, med.times_json,
    med.frequency, med.status, med.start_date, med.end_date, med.notes, req.params.id
  ]);
  const row = await get('SELECT * FROM medications WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Medication not found.' });
  res.json({ medication: row, frontend: frontendMedication(row) });
}));

app.delete('/medications/:id', asyncRoute(async (req, res) => {
  const result = await run(
    "UPDATE medications SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [req.params.id]
  );
  if (!result.changes) return res.status(404).json({ error: 'Medication not found.' });
  res.json({ ok: true });
}));

app.post('/logs', asyncRoute(async (req, res) => {
  const log = logFromBody(req.body);
  if (!required(log.patient_id) || !required(log.scheduled_time)) {
    return res.status(400).json({ error: 'Patient and scheduled time are required.' });
  }

  if (!log.medication_id && log.local_medication_id) {
    const med = await get(
      'SELECT id FROM medications WHERE patient_id = ? AND local_id = ?',
      [log.patient_id, log.local_medication_id]
    );
    if (med) log.medication_id = med.id;
  }

  const existing = log.local_id
    ? await get('SELECT id FROM medication_logs WHERE patient_id = ? AND local_id = ?', [log.patient_id, log.local_id])
    : null;
  let id = existing?.id;

  if (existing) {
    await run(`
      UPDATE medication_logs SET medication_id = ?, local_medication_id = ?, dose_date = ?,
        scheduled_time = ?, taken_time = ?, status = ?, logged_by = ?
      WHERE id = ?
    `, [
      log.medication_id, log.local_medication_id, log.dose_date, log.scheduled_time,
      log.taken_time, log.status, log.logged_by, id
    ]);
  } else {
    const result = await run(`
      INSERT INTO medication_logs (
        medication_id, patient_id, local_id, local_medication_id, dose_date,
        scheduled_time, taken_time, status, logged_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      log.medication_id, log.patient_id, log.local_id, log.local_medication_id, log.dose_date,
      log.scheduled_time, log.taken_time, log.status, log.logged_by
    ]);
    id = result.id;
  }

  const row = await get('SELECT * FROM medication_logs WHERE id = ?', [id]);
  res.status(existing ? 200 : 201).json({ log: row, frontend: frontendLog(row) });
}));

app.get('/logs/:patientId', asyncRoute(async (req, res) => {
  const rows = await all(
    'SELECT * FROM medication_logs WHERE patient_id = ? ORDER BY dose_date DESC, scheduled_time DESC, created_at DESC',
    [req.params.patientId]
  );
  res.json({ logs: rows, frontend: rows.map(frontendLog) });
}));

app.post('/caregivers', asyncRoute(async (req, res) => {
  const caregiver = caregiverFromBody(req.body);
  if (!required(caregiver.patient_id) || !required(caregiver.caregiver_name)) {
    return res.status(400).json({ error: 'Patient and caregiver name are required.' });
  }

  const existing = caregiver.local_id
    ? await get('SELECT id FROM caregivers WHERE patient_id = ? AND local_id = ?', [caregiver.patient_id, caregiver.local_id])
    : null;
  let id = existing?.id;

  if (existing) {
    await run(`
      UPDATE caregivers SET caregiver_name = ?, relationship = ?, contact_number = ?,
        access = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      caregiver.caregiver_name, caregiver.relationship, caregiver.contact_number, caregiver.access, id
    ]);
  } else {
    const result = await run(`
      INSERT INTO caregivers (patient_id, local_id, caregiver_name, relationship, contact_number, access)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      caregiver.patient_id, caregiver.local_id, caregiver.caregiver_name,
      caregiver.relationship, caregiver.contact_number, caregiver.access
    ]);
    id = result.id;
  }

  const row = await get('SELECT * FROM caregivers WHERE id = ?', [id]);
  res.status(existing ? 200 : 201).json({ caregiver: row, frontend: frontendCaregiver(row) });
}));

app.get('/caregivers/:patientId', asyncRoute(async (req, res) => {
  const rows = await all('SELECT * FROM caregivers WHERE patient_id = ? ORDER BY created_at DESC', [req.params.patientId]);
  res.json({ caregivers: rows, frontend: rows.map(frontendCaregiver) });
}));

app.delete('/caregivers/:id', asyncRoute(async (req, res) => {
  const result = await run('DELETE FROM caregivers WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Caregiver not found.' });
  res.json({ ok: true });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Database or server error.', details: err.message });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MediTrack backend running at http://localhost:${PORT}`);
      console.log(`SQLite database: ${dbPath}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
