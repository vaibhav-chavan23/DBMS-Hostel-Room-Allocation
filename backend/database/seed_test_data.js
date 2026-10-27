const bcrypt = require('bcrypt');
const { pool } = require('../src/config/db');

const firstNames = [
  'Aarav', 'Vihaan', 'Vivaan', 'Kabir', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Atharv', 'Aditya',
  'Shaurya', 'Arjun', 'Aryan', 'Dhruv', 'Ritvik', 'Rohan', 'Sameer', 'Yash', 'Kunal', 'Amit',
  'Rahul', 'Vikas', 'Abhishek', 'Akash', 'Manish', 'Sanjay', 'Suresh', 'Ramesh', 'Anil', 'Sunil',
  'Rajesh', 'Harish', 'Maresh', 'Dinesh', 'Mahesh', 'Umesh', 'Rakesh', 'Vikram', 'Vijay', 'Ajay',
  'Dev', 'Raj', 'Karan', 'Sumit', 'Gaurav', 'Saurabh', 'Nitin', 'Alok', 'Piyush', 'Mayank'
];

const lastNames = [
  'Pawar', 'Chavan', 'Shinde', 'Thorat', 'More', 'Singh', 'Sharma', 'Patel', 'Verma', 'Gupta',
  'Kumar', 'Joshi', 'Mehta', 'Shah', 'Rao', 'Nair', 'Pillai', 'Iyer', 'Reddy', 'Chaudhary',
  'Prasad', 'Mishra', 'Trivedi', 'Pandey', 'Das', 'Bose', 'Mukherjee', 'Chatterjee', 'Sen', 'Dutta'
];

const branches = ['Computer Eng.', 'Information Tech.', 'Electronics Eng.', 'Mechanical Eng.', 'Civil Eng.'];

const generateGroupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

async function main() {
  console.log('Resetting student and group data in MySQL...');

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Disable foreign key checks for clean truncation/deletion
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE activity_log');
    await conn.query('TRUNCATE TABLE vacate_requests');
    await conn.query('TRUNCATE TABLE waiting_list');
    await conn.query('TRUNCATE TABLE allocations');
    await conn.query('TRUNCATE TABLE room_preferences');
    await conn.query('TRUNCATE TABLE join_requests');
    await conn.query('TRUNCATE TABLE group_invitations');
    await conn.query('TRUNCATE TABLE group_members');
    await conn.query('TRUNCATE TABLE `groups`');
    await conn.query('TRUNCATE TABLE students');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // Re-seed Admin User
    const adminEmail = 'admin@hostel.com';
    const adminPasswordHash = await bcrypt.hash('admin1234', 10);
    await conn.execute(
      'INSERT INTO students (name, email, passwordHash, cgpa, branch, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['Admin', adminEmail, adminPasswordHash, 10.0, 'Admin', 'admin']
    );
    console.log('Admin user recreated successfully.');

    // Re-enable rooms to available
    await conn.query("UPDATE rooms SET status = 'available'");

    const [rooms] = await conn.query('SELECT id, roomNumber FROM rooms ORDER BY id ASC');
    if (rooms.length === 0) {
      console.error('Error: Please run "npm run db:seed" first to seed hostels and rooms.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash('student123', 10);
    console.log('Generating 88 student records with Indian names...');

    const createdStudentIds = [];
    for (let i = 0; i < 88; i++) {
      const fName = firstNames[i % firstNames.length];
      const lName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
      const name = `${fName} ${lName} ${i + 1}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${i + 1}@hostel.com`;
      const cgpa = parseFloat((6.5 + Math.random() * 3.4).toFixed(2));
      const branch = branches[i % branches.length];

      const [insertRes] = await conn.execute(
        'INSERT INTO students (name, email, passwordHash, cgpa, branch, role) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, passwordHash, cgpa, branch, 'student']
      );
      createdStudentIds.push({ id: insertRes.insertId, name, email, cgpa });
    }

    console.log('Forming complete and incomplete groups...');

    let studentOffset = 0;

    // 1. Create 16 Complete Groups of 4 (64 students)
    for (let g = 0; g < 16; g++) {
      const groupStudents = createdStudentIds.slice(studentOffset, studentOffset + 4);
      studentOffset += 4;

      // Elect leader: highest CGPA, tiebreak lower ID
      const sorted = [...groupStudents].sort((a, b) => {
        if (b.cgpa !== a.cgpa) return b.cgpa - a.cgpa;
        return a.id - b.id;
      });
      const leaderId = sorted[0].id;
      const groupCode = generateGroupCode();

      const [groupRes] = await conn.execute(
        'INSERT INTO `groups` (groupCode, leaderId, status) VALUES (?, ?, ?)',
        [groupCode, leaderId, 'PREFERENCES_SUBMITTED']
      );
      const groupId = groupRes.insertId;

      for (const s of groupStudents) {
        await conn.execute(
          'INSERT INTO group_members (groupId, studentId) VALUES (?, ?)',
          [groupId, s.id]
        );
      }

      // Assign 3 random preferences
      const shuffledRooms = [...rooms].sort(() => 0.5 - Math.random());
      const preferredRooms = shuffledRooms.slice(0, 3);
      for (let pIdx = 0; pIdx < preferredRooms.length; pIdx++) {
        await conn.execute(
          'INSERT INTO room_preferences (groupId, roomId, preferenceOrder) VALUES (?, ?, ?)',
          [groupId, preferredRooms[pIdx].id, pIdx + 1]
        );
      }
    }

    // 2. Create 4 incomplete groups of 3 (12 students, offset 64 to 76)
    for (let g = 0; g < 4; g++) {
      const groupStudents = createdStudentIds.slice(studentOffset, studentOffset + 3);
      studentOffset += 3;

      const leaderId = groupStudents[0].id;
      const groupCode = generateGroupCode();

      const [groupRes] = await conn.execute(
        'INSERT INTO `groups` (groupCode, leaderId, status) VALUES (?, ?, ?)',
        [groupCode, leaderId, 'FORMING']
      );
      const groupId = groupRes.insertId;

      for (const s of groupStudents) {
        await conn.execute(
          'INSERT INTO group_members (groupId, studentId) VALUES (?, ?)',
          [groupId, s.id]
        );
      }
    }

    // 3. Create 3 incomplete groups of 2 (6 students, offset 76 to 82)
    for (let g = 0; g < 3; g++) {
      const groupStudents = createdStudentIds.slice(studentOffset, studentOffset + 2);
      studentOffset += 2;

      const leaderId = groupStudents[0].id;
      const groupCode = generateGroupCode();

      const [groupRes] = await conn.execute(
        'INSERT INTO `groups` (groupCode, leaderId, status) VALUES (?, ?, ?)',
        [groupCode, leaderId, 'FORMING']
      );
      const groupId = groupRes.insertId;

      for (const s of groupStudents) {
        await conn.execute(
          'INSERT INTO group_members (groupId, studentId) VALUES (?, ?)',
          [groupId, s.id]
        );
      }
    }

    // Remaining 6 students (offset 82 to 88) stay ungrouped
    await conn.commit();

    console.log('\nSeeding completed successfully!');
    console.log('--------------------------------------------------');
    console.log('Total students created: 88 (all password: "student123")');
    console.log('Complete Groups of 4 (PREFERENCES_SUBMITTED): 16');
    console.log('Incomplete Groups of 3 (FORMING): 4');
    console.log('Incomplete Groups of 2 (FORMING): 3');
    console.log('Ungrouped Students: 6');
    console.log('--------------------------------------------------\n');
  } catch (error) {
    await conn.rollback();
    console.error('Error seeding test data:', error);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
