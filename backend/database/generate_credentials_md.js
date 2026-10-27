const fs = require('fs');
const path = require('path');

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

let markdown = `# Seeded Student Accounts (Total: 88)\n\n`;
markdown += `All accounts use the password: **student123**\n\n`;
markdown += `| # | Name | Email | Password | Role | Group Category |\n`;
markdown += `|---|------|-------|----------|------|----------------|\n`;

for (let i = 0; i < 88; i++) {
  const fName = firstNames[i % firstNames.length];
  const lName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
  const name = `${fName} ${lName} ${i + 1}`;
  const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${i + 1}@hostel.com`;
  
  let category = '';
  if (i < 64) {
    category = `Group ${Math.floor(i / 4) + 1} (Complete Group of 4)`;
  } else if (i < 76) {
    category = `Incomplete Group ${Math.floor((i - 64) / 3) + 17} (Group of 3)`;
  } else if (i < 82) {
    category = `Incomplete Group ${Math.floor((i - 76) / 2) + 21} (Group of 2)`;
  } else {
    category = `Ungrouped Student`;
  }
  
  markdown += `| ${i + 1} | ${name} | ${email} | student123 | Student | ${category} |\n`;
}

const outputPath = path.resolve(__dirname, '../../student_accounts.md');
fs.writeFileSync(outputPath, markdown);
console.log(`Generated student_accounts.md at ${outputPath}`);
