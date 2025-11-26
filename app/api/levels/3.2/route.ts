import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Employee from '@/lib/models/Employee';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/levels/3.2
 *
 * INTENTIONALLY VULNERABLE Employee Search Endpoint
 *
 * This endpoint demonstrates OWASP A03: Injection (NoSQL Injection)
 * It directly passes URL parameters to MongoDB queries without sanitization
 *
 * Vulnerability: Players can use NoSQL operators like $ne, $gt, $regex
 * to bypass filters and extract unauthorized data
 *
 * Body: { name: string | object }
 *
 * Examples of exploitation:
 * - { name: { $ne: "Guest" } }  // Returns first non-Guest employee
 * - { name: { $regex: "^Ghost" } }  // Returns employees starting with "Ghost"
 * - { clearanceLevel: { $gte: 5 } }  // Returns high-clearance employees
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Parse request
    const body = await req.json();

    // 3. Connect to database
    await connectDB();

    // 4. VULNERABLE QUERY CONSTRUCTION
    // This is intentionally insecure for educational purposes
    // In production, NEVER directly pass user input to database queries!

    const query: any = {};

    // Allow injection through any field
    if (body.name !== undefined) {
      query.name = body.name; // VULNERABLE: allows { $ne: "..." }
    }

    if (body.department !== undefined) {
      query.department = body.department;
    }

    if (body.clearanceLevel !== undefined) {
      query.clearanceLevel = body.clearanceLevel; // VULNERABLE: allows { $gte: 5 }
    }

    if (body.status !== undefined) {
      query.status = body.status;
    }

    if (body.employeeId !== undefined) {
      query.employeeId = body.employeeId;
    }

    // Log the query (for debugging/learning)
    console.log('🔍 Level 3.2 Query:', JSON.stringify(query));

    // 5. Execute the vulnerable query
    // Limit to 1 result to avoid overwhelming response
    const employee = await Employee.findOne(query).select(
      'employeeId name department clearanceLevel email role status secretData'
    );

    // 6. Handle response
    if (!employee) {
      return NextResponse.json(
        {
          found: false,
          message: 'No employee found matching your search criteria.',
          hint: 'Try different search parameters or use advanced query operators.',
        },
        { status: 404 }
      );
    }

    // 7. Return employee data
    // Check if secretData exists (flag found!)
    if (employee.secretData) {
      // Player found the admin with the flag
      return NextResponse.json(
        {
          found: true,
          flagFound: true,
          message: 'CRITICAL: Unauthorized access to classified employee data!',
          employee: {
            employeeId: employee.employeeId,
            name: employee.name,
            department: employee.department,
            clearanceLevel: employee.clearanceLevel,
            email: employee.email,
            role: employee.role,
            status: employee.status,
            secretData: employee.secretData,
          },
        },
        { status: 200 }
      );
    } else {
      // Normal employee (decoy)
      return NextResponse.json(
        {
          found: true,
          flagFound: false,
          message: 'Employee record found.',
          employee: {
            employeeId: employee.employeeId,
            name: employee.name,
            department: employee.department,
            clearanceLevel: employee.clearanceLevel,
            email: employee.email,
            role: employee.role,
            status: employee.status,
          },
          hint:
            employee.clearanceLevel < 5
              ? 'This employee has low clearance. Try finding someone with higher access.'
              : undefined,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Level 3.2 API Error:', error);

    // Check for MongoDB errors (can reveal query structure)
    if (error.name === 'CastError') {
      return NextResponse.json(
        {
          error: 'Invalid query parameter type.',
          hint: 'MongoDB operators like $ne, $gt, $regex might help...',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'An error occurred while processing your request.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/levels/3.2
 *
 * Returns list of departments and basic info (for reconnaissance)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Connect to database
    await connectDB();

    // 3. Get departments
    const departments = await Employee.distinct('department');

    // 4. Get employee count by clearance
    const clearanceStats = await Employee.aggregate([
      {
        $group: {
          _id: '$clearanceLevel',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 5. Return reconnaissance data
    return NextResponse.json(
      {
        totalEmployees: await Employee.countDocuments(),
        departments: departments.sort(),
        clearanceLevels: clearanceStats.map((stat) => ({
          level: stat._id,
          count: stat.count,
        })),
        hint: 'Use POST requests with search parameters to find specific employees.',
        example: {
          name: 'John Smith',
          department: 'Sales',
          clearanceLevel: 1,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Level 3.2 GET Error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred while fetching data.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
