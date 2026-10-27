-- ====================================================================
-- Smart Hostel Allocation & Room Management System
-- Database Schema for MySQL 8 (InnoDB, utf8mb4)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS hostel_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hostel_db;

-- --------------------------------------------------------------------
-- 1. Students Table
-- Stores credentials and academic profiles for students and admins.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  cgpa DECIMAL(4, 2) NOT NULL,
  branch VARCHAR(50) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'student',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

-- --------------------------------------------------------------------
-- 2. Groups Table
-- Stores student groups. Note: `groups` is a reserved word in MySQL 8,
-- so it is always wrapped in backticks.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupCode VARCHAR(10) NOT NULL UNIQUE,
  leaderId INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'FORMING',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (leaderId) REFERENCES students (id)
);

-- --------------------------------------------------------------------
-- 3. Group Members Junction Table
-- Resolves the Many-to-Many relationship between groups and students.
-- Enforces a composite primary key (groupId, studentId).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
  studentId INT PRIMARY KEY,
  groupId INT NOT NULL,
  joinedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE,
  FOREIGN KEY (groupId) REFERENCES `groups` (id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 4. Hostels Table
-- Stores hostel buildings and designated gender.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hostels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  gender VARCHAR(10) NOT NULL
);

-- --------------------------------------------------------------------
-- 5. Rooms Table
-- Stores rooms in each hostel building, capacity, and current status.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hostelId INT NOT NULL,
  roomNumber VARCHAR(10) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  UNIQUE (hostelId, roomNumber),
  INDEX (status),
  FOREIGN KEY (hostelId) REFERENCES hostels (id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 6. Room Preferences Table
-- Stores ranked preferences submitted by a ready group of 4.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL,
  roomId INT NOT NULL,
  preferenceOrder INT NOT NULL,
  UNIQUE (groupId, preferenceOrder),
  UNIQUE (groupId, roomId),
  FOREIGN KEY (groupId) REFERENCES `groups` (id) ON DELETE CASCADE,
  FOREIGN KEY (roomId) REFERENCES rooms (id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 7. Allocations Table
-- Stores 1-to-1 mapping between a group and its allocated room.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL UNIQUE,
  roomId INT NOT NULL UNIQUE,
  allocatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  allocatedBy VARCHAR(20) NOT NULL DEFAULT 'system',
  FOREIGN KEY (groupId) REFERENCES `groups` (id) ON DELETE CASCADE,
  FOREIGN KEY (roomId) REFERENCES rooms (id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 8. Waiting List Table
-- Ordered waitlist queue for groups whose preferred rooms were full.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waiting_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL UNIQUE,
  position INT NOT NULL UNIQUE,
  addedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (groupId) REFERENCES `groups` (id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 9. Vacate Requests Table
-- Tracks room vacate requests initiated by student groups.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacate_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL,
  requestedBy INT NOT NULL,
  reason TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requestedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolvedAt DATETIME(3) NULL,
  INDEX (status),
  FOREIGN KEY (groupId) REFERENCES `groups` (id) ON DELETE CASCADE,
  FOREIGN KEY (requestedBy) REFERENCES students (id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 10. Activity Log Table
-- Audit trail of all administrative and allocation actions.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  eventType VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

-- --------------------------------------------------------------------
-- 11. Join Requests Table
-- Inbound join requests sent from ungrouped students to forming groups.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS join_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL,
  studentId INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX (status),
  FOREIGN KEY (groupId) REFERENCES `groups` (id) ON DELETE CASCADE,
  FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 12. Group Invitations Table
-- Outbound invitations sent from forming groups to ungrouped students.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupId INT NOT NULL,
  studentId INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX (status),
  FOREIGN KEY (groupId) REFERENCES `groups` (id) ON DELETE CASCADE,
  FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE
);