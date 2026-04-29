import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../lib/models/User';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    await connectDB();

    // Admin creation: require explicit environment-configured credentials.
    // Prevent hardcoded backdoor admin account creation from source code.
    let isAdmin = false;
    const initAdminEmail = process.env.INIT_ADMIN_EMAIL?.toLowerCase();
    const initAdminPassword = process.env.INIT_ADMIN_PASSWORD;
    const intendedAdmin = initAdminEmail && validatedData.email.toLowerCase() === initAdminEmail;
    if (intendedAdmin) {
      if (!initAdminPassword) {
        return NextResponse.json(
          { error: 'Admin registration is disabled on this instance' },
          { status: 403 }
        );
      }
      if (validatedData.password !== initAdminPassword) {
        return NextResponse.json(
          { error: 'Invalid admin credentials' },
          { status: 401 }
        );
      }
      isAdmin = true;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: validatedData.email.toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create new user (admin flag only set when explicitly allowed via env vars)
    const user = await User.create({
      email: validatedData.email.toLowerCase(),
      password: hashedPassword,
      isAdmin,
      currentLevel: '1',
      completedLevels: [],
      startTime: null,
      endTime: null,
      totalTime: 0,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: {
          id: user._id,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
