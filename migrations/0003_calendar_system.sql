-- Calendar and Scheduling System for Kwikr Directory
-- This migration adds calendar, appointments, and scheduling functionality

-- Worker Availability Schedule
CREATE TABLE IF NOT EXISTS worker_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  break_start_time TIME, -- Optional lunch/break time
  break_end_time TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Appointments and Meetings
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  worker_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  appointment_type TEXT NOT NULL DEFAULT 'meeting', -- meeting, site_visit, consultation, work_session
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'client_site', -- client_site, worker_office, virtual, other
  location_address TEXT,
  meeting_link TEXT, -- For virtual meetings
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, cancelled, completed, no_show
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  confirmation_required BOOLEAN DEFAULT TRUE,
  confirmed_by_client BOOLEAN DEFAULT FALSE,
  confirmed_by_worker BOOLEAN DEFAULT TRUE, -- Worker creates, so auto-confirmed
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Time Blocks for Jobs (for timeline visualization)
CREATE TABLE IF NOT EXISTS job_time_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  block_name TEXT NOT NULL,
  description TEXT,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'work', -- work, break, travel, inspection, cleanup
  is_billable BOOLEAN DEFAULT TRUE,
  estimated_hours DECIMAL(4,2),
  actual_hours DECIMAL(4,2),
  hourly_rate DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  milestone_id INTEGER, -- Link to job milestone
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (worker_id) REFERENCES users(id),
  FOREIGN KEY (milestone_id) REFERENCES job_milestones(id)
);

-- Calendar Events (for general calendar functionality)
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'personal', -- personal, work, appointment, job, break
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- For recurring events (RFC 5545 RRULE format)
  color_code TEXT DEFAULT '#3B82F6', -- Hex color for calendar display
  location TEXT,
  attendees TEXT, -- JSON array of attendee information
  reminder_minutes INTEGER DEFAULT 15, -- Minutes before event to send reminder
  is_private BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Appointment Notifications and Reminders
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'email', -- email, sms, push, in_app
  reminder_time DATETIME NOT NULL,
  message TEXT,
  sent_at DATETIME,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_worker_availability_user_day ON worker_availability(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_worker_date ON appointments(worker_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_client_date ON appointments(client_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_job ON appointments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_blocks_job_date ON job_time_blocks(job_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_job_time_blocks_worker_date ON job_time_blocks(worker_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_time ON appointment_reminders(reminder_time, status);