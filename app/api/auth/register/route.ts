import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  teamName: z
    .string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must not exceed 50 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    await connectDB();

    // Check for admin credentials
    const isAdminEmail = validatedData.email.toLowerCase() === 'admin@gmail.com';
    if (isAdminEmail && validatedData.password !== 'admin1234') {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
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

    // Check if team name is already taken
    const existingTeam = await User.findOne({
      teamName: validatedData.teamName,
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Team name is already taken' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create new user
    const user = await User.create({
      email: validatedData.email.toLowerCase(),
      password: hashedPassword,
      teamName: validatedData.teamName,
      isAdmin: isAdminEmail,
      currentLevel: '1.1',
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
          teamName: user.teamName,
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
