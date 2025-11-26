/**
 * Seed script for Level 3.2 - Employee Database
 *
 * Run with: pnpm tsx scripts/seed-employees.ts
 *
 * This populates the database with employee data including:
 * - Decoy employees (clearance 1-3)
 * - Admin employee (clearance 5) with secret flag
 */

import mongoose from 'mongoose';
import Employee from '../lib/models/Employee';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('💡 Make sure you have MONGODB_URI set in your .env.local file');
  process.exit(1);
}

const employeeData = [
  // Decoy employees (clearance 1-3)
  {
    employeeId: 'EMP001',
    name: 'John Smith',
    department: 'Sales',
    clearanceLevel: 1,
    email: 'john.smith@nebulacorp.com',
    role: 'Sales Representative',
    status: 'active',
  },
  {
    employeeId: 'EMP002',
    name: 'Sarah Johnson',
    department: 'Marketing',
    clearanceLevel: 2,
    email: 'sarah.johnson@nebulacorp.com',
    role: 'Marketing Specialist',
    status: 'active',
  },
  {
    employeeId: 'EMP003',
    name: 'Michael Chen',
    department: 'Engineering',
    clearanceLevel: 2,
    email: 'michael.chen@nebulacorp.com',
    role: 'Software Engineer',
    status: 'active',
  },
  {
    employeeId: 'EMP004',
    name: 'Emma Davis',
    department: 'HR',
    clearanceLevel: 2,
    email: 'emma.davis@nebulacorp.com',
    role: 'HR Manager',
    status: 'active',
  },
  {
    employeeId: 'EMP005',
    name: 'David Wilson',
    department: 'Finance',
    clearanceLevel: 3,
    email: 'david.wilson@nebulacorp.com',
    role: 'Financial Analyst',
    status: 'active',
  },
  {
    employeeId: 'EMP006',
    name: 'Lisa Anderson',
    department: 'Operations',
    clearanceLevel: 3,
    email: 'lisa.anderson@nebulacorp.com',
    role: 'Operations Manager',
    status: 'active',
  },
  {
    employeeId: 'EMP007',
    name: 'James Taylor',
    department: 'IT Support',
    clearanceLevel: 2,
    email: 'james.taylor@nebulacorp.com',
    role: 'IT Support Specialist',
    status: 'inactive',
  },
  {
    employeeId: 'EMP008',
    name: 'Jennifer Martinez',
    department: 'Legal',
    clearanceLevel: 3,
    email: 'jennifer.martinez@nebulacorp.com',
    role: 'Legal Counsel',
    status: 'active',
  },
  // Hidden admin employee (clearance 5) - THE TARGET
  {
    employeeId: 'ADMIN001',
    name: 'Ghost Administrator',
    department: 'Security',
    clearanceLevel: 5,
    email: 'ghost.admin@nebulacorp.internal',
    role: 'Chief Security Officer',
    status: 'active',
    secretData: 'FLAG{NO_SQL_YES_INJECTION}',
  },
  // Another high clearance (red herring)
  {
    employeeId: 'EMP009',
    name: 'Robert Brown',
    department: 'Executive',
    clearanceLevel: 4,
    email: 'robert.brown@nebulacorp.com',
    role: 'VP of Operations',
    status: 'active',
    secretData: 'DECOY_DATA: Nothing here',
  },
];

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing employees
    console.log('🗑️  Clearing existing employee data...');
    await Employee.deleteMany({});
    console.log('✅ Cleared existing data');

    // Insert seed data
    console.log('📝 Inserting employee data...');
    await Employee.insertMany(employeeData);
    console.log('✅ Employee data inserted successfully');

    // Verify data
    const count = await Employee.countDocuments();
    console.log(`\n📊 Total employees in database: ${count}`);

    // Display employees by clearance
    const clearanceLevels = await Employee.aggregate([
      {
        $group: {
          _id: '$clearanceLevel',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log('\n📋 Employees by Clearance Level:');
    clearanceLevels.forEach((level) => {
      console.log(`  Level ${level._id}: ${level.count} employee(s)`);
    });

    // Show admin (for verification only)
    const admin = await Employee.findOne({ clearanceLevel: 5 });
    if (admin) {
      console.log('\n🎯 Target Found:');
      console.log(`  Name: ${admin.name}`);
      console.log(`  Department: ${admin.department}`);
      console.log(`  Clearance: ${admin.clearanceLevel}`);
      console.log(`  Secret: ${admin.secretData}`);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n💡 Players must use NoSQL injection to find the admin employee');
    console.log('   Example: ?name[$ne]=JohnSmith');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

seed();
