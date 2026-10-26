const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  console.log(`Connecting to MySQL server at ${host}:${port}...`);
  // Connect without database selected first to allow CREATE DATABASE
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    const schemaSqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaSqlPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(sql);
    console.log('Database and 12 tables created successfully!');
  } catch (error) {
    console.error('Failed to run schema.sql:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupDatabase();
