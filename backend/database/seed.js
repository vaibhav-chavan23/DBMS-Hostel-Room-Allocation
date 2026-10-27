const bcrypt = require('bcrypt');
const { pool } = require('../src/config/db');

async function seed() {
  console.log('Seeding MySQL database...');

  try {
    // 1. Seed Admin User
    const adminEmail = 'admin@hostel.com';
    const [adminRows] = await pool.execute(
      'SELECT id FROM students WHERE email = ?',
      [adminEmail]
    );

    if (adminRows.length === 0) {
      const passwordHash = await bcrypt.hash('admin1234', 10);
      await pool.execute(
        `INSERT INTO students (name, email, passwordHash, cgpa, branch, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Admin', adminEmail, passwordHash, 10.0, 'Admin', 'admin']
      );
      console.log('Admin user created successfully (admin@hostel.com / admin1234).');
    } else {
      console.log('Admin user already exists.');
    }

    // 2. Seed Hostels and Rooms
    const hostelsToSeed = [
      { name: 'Boys Hostel A', gender: 'male' },
      { name: 'Boys Hostel B', gender: 'male' },
      { name: 'Boys Hostel C', gender: 'male' }
    ];

    for (const h of hostelsToSeed) {
      let [hostelRows] = await pool.execute(
        'SELECT id, name FROM hostels WHERE name = ?',
        [h.name]
      );

      let hostelId;
      if (hostelRows.length === 0) {
        const [result] = await pool.execute(
          'INSERT INTO hostels (name, gender) VALUES (?, ?)',
          [h.name, h.gender]
        );
        hostelId = result.insertId;
        console.log(`Created hostel: ${h.name} (ID: ${hostelId})`);
      } else {
        hostelId = hostelRows[0].id;
        console.log(`Hostel already exists: ${h.name} (ID: ${hostelId})`);
      }

      // Seed rooms 101-110
      for (let rNum = 101; rNum <= 110; rNum++) {
        const roomNumberString = rNum.toString();
        const [roomRows] = await pool.execute(
          'SELECT id FROM rooms WHERE hostelId = ? AND roomNumber = ?',
          [hostelId, roomNumberString]
        );

        if (roomRows.length === 0) {
          await pool.execute(
            `INSERT INTO rooms (hostelId, roomNumber, capacity, status)
             VALUES (?, ?, ?, ?)`,
            [hostelId, roomNumberString, 4, 'available']
          );
        }
      }
      console.log(`Seeded rooms 101-110 for ${h.name}`);
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
