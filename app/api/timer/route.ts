import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// GET - Get timer state
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    let currentTime = user.totalTime;

    // If timer is running, calculate elapsed time
    if (user.startTime && !user.endTime) {
      const elapsed = now.getTime() - new Date(user.startTime).getTime();
      currentTime += elapsed;
    }

    return NextResponse.json({
      isRunning: !!(user.startTime && !user.endTime),
      startTime: user.startTime,
      endTime: user.endTime,
      totalTime: currentTime,
    });
  } catch (error) {
    console.error('Timer GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timer state' },
      { status: 500 }
    );
  }
}

// POST - Start/Stop timer
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    await connectDB();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'start') {
      // Only start if not already running
      if (!user.startTime || user.endTime) {
        user.startTime = new Date();
        user.endTime = null;
        await user.save();
      }
    } else if (action === 'stop') {
      // Stop the timer
      if (user.startTime && !user.endTime) {
        const now = new Date();
        const elapsed = now.getTime() - new Date(user.startTime).getTime();
        user.totalTime += elapsed;
        user.endTime = now;
        await user.save();
      }
    } else if (action === 'reset') {
      // Reset the timer
      user.startTime = null;
      user.endTime = null;
      user.totalTime = 0;
      await user.save();
    }

    return NextResponse.json({
      success: true,
      isRunning: !!(user.startTime && !user.endTime),
      totalTime: user.totalTime,
    });
  } catch (error) {
    console.error('Timer POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update timer' },
      { status: 500 }
    );
  }
}
