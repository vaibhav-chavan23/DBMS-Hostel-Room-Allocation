const { pool } = require('../../config/db');

// Finds a student or admin user by email
const findByEmail = async (email, conn = pool) => {
  const [rows] = await conn.execute('SELECT * FROM students WHERE email = ?', [email]);
  return rows[0] || null;
};

// Creates a new student record in the database
const createStudent = async ({ name, email, passwordHash, cgpa, branch, role = 'student' }, conn = pool) => {
  const [result] = await conn.execute(
    'INSERT INTO students (name, email, passwordHash, cgpa, branch, role) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, passwordHash, cgpa, branch, role]
  );
  return findById(result.insertId, conn);
};

// Finds a student by primary key ID
const findById = async (id, conn = pool) => {
  const [rows] = await conn.execute('SELECT * FROM students WHERE id = ?', [id]);
  return rows[0] || null;
};

module.exports = {
  findByEmail,
  createStudent,
  findById
};
