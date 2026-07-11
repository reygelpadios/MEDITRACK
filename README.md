# 🩺 MediTrack

A modern healthcare web application designed to help patients manage their medications through reminders, scheduling, and progress tracking. MediTrack improves medication adherence with an intuitive dashboard, interactive calendar, caregiver support, and secure patient management.

---

##  Features

-  Secure patient registration and login
-  Medication scheduling and reminder system
-  Interactive medication calendar with daily schedules
-  Smart medication reminders and alarms
-  Medication history and adherence tracking
-  Caregiver portal for remote patient monitoring
-  Digital patient profile management
-  Dark and Light mode support
-  Responsive dashboard for desktop and mobile devices
-  Offline-first support with localStorage synchronization
-  SQLite database integration for persistent data storage

---

##  Technologies

### Frontend
- HTML5
- CSS3
- JavaScript (ES6)

### Backend
- Node.js
- Express.js

### Database
- SQLite

### Tools & Libraries
- Vite
- Chart.js
- Dexie.js
- Express
- SQLite3
- CORS
- bcrypt

---

##  About the Project

MediTrack was developed to provide a simple and accessible way for patients and caregivers to manage daily medications. The application allows users to schedule medications, receive reminders, monitor adherence, and securely store patient information.

The project began by designing a clean and user-friendly interface focused on accessibility. As development progressed, features such as medication scheduling, reminder notifications, interactive calendars, caregiver monitoring, and secure authentication were implemented.

To improve data persistence and reliability, the application evolved from using only local storage to integrating a SQLite database with a Node.js and Express backend. The system also follows an offline-first approach, allowing users to continue using the application even without an internet connection and synchronize data once connectivity is restored.

---

##  Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/reygelpadios/MEDITRACK.git
```

### 2. Navigate to the project folder

```bash
cd MEDITRACK
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the frontend

```bash
npm run dev
```

### 5. Start the backend server

```bash
node backend/server.js
```

### 6. Open the application

Frontend:

```
http://localhost:5173
```

Backend API:

```
http://localhost:3000
```

---

##  Project Structure

```
MEDITRACK/
│
├── backend/
│   ├── server.js
│   ├── database.js
│   └── meditrack.db
│
├── assets/
├── css/
├── js/
├── images/
│
├── index.html
├── package.json
└── README.md
```

---

##  Core Modules

- Authentication System
- Patient Profile Management
- Medication Scheduler
- Medication Reminder & Alarm
- Interactive Medication Calendar
- Medication History Logs
- Caregiver Portal
- Dashboard & Statistics
- Offline Data Synchronization

---

##  Future Improvements

- Email and SMS medication reminders
- Cloud synchronization
- Doctor portal
- Prescription scanning using OCR
- Medication analytics and reports
- Mobile application support

---

##  Developers

- Reygel Padios
- Louis Emmanuel Añon
- Alfred Labastida
- James Romero
- Zenie Rosjen Sale
- Cathlyn Solis

---

##  Purpose

This project was developed for educational purposes as part of a university system integration project.
