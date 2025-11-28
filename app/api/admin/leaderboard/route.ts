import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all users with completed levels
    const users = await User.find({
      isAdmin: false,
      completedLevels: { $exists: true, $ne: [] },
    })
      .select('email teamName completedLevels totalTime startTime endTime createdAt')
      .sort({ completedLevels: -1, totalTime: 1 })
      .lean();

    // Calculate rankings
    const leaderboard = users.map((user, index) => {
      const completedCount = user.completedLevels?.length || 0;
      const totalLevels = 7; // 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 3.2
      const completionPercentage = (completedCount / totalLevels) * 100;

      // Calculate actual time
      let displayTime = user.totalTime || 0;
      if (user.startTime && !user.endTime) {
        const elapsed = Date.now() - new Date(user.startTime).getTime();
        displayTime += elapsed;
      }

      return {
        rank: index + 1,
        teamName: user.teamName,
        email: user.email,
        completedLevels: user.completedLevels || [],
        completedCount,
        completionPercentage,
        totalTime: displayTime,
        isComplete: completedCount === totalLevels,
        startTime: user.startTime,
        endTime: user.endTime,
        createdAt: user.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      leaderboard,
      totalUsers: users.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
