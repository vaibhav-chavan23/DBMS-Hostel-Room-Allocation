const bcrypt = require('bcrypt');
const authRepository = require('./auth.repository');
const { signToken } = require('../../utils/jwt');
const AppError = require('../../utils/AppError');

const register = async ({ name, email, password, cgpa, branch }) => {
  const existing = await authRepository.findByEmail(email);
  if (existing) {
    throw new AppError('Email is already taken', 409, 'CONFLICT');
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const student = await authRepository.createStudent({
    name,
    email,
    passwordHash,
    cgpa: parseFloat(cgpa),
    branch,
    role: 'student'
  });

  const token = signToken({
    id: student.id,
    email: student.email,
    role: student.role
  });

  const { passwordHash: _, ...studentWithoutPassword } = student;
  return { token, student: studentWithoutPassword };
};

const login = async ({ email, password }) => {
  const student = await authRepository.findByEmail(email);
  if (!student) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
  }

  const isMatch = await bcrypt.compare(password, student.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
  }

  const token = signToken({
    id: student.id,
    email: student.email,
    role: student.role
  });

  const { passwordHash: _, ...studentWithoutPassword } = student;
  return { token, student: studentWithoutPassword };
};

const getMe = async (id) => {
  const student = await authRepository.findById(id);
  if (!student) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }

  const { passwordHash: _, ...studentWithoutPassword } = student;
  return studentWithoutPassword;
};

module.exports = {
  register,
  login,
  getMe
};
