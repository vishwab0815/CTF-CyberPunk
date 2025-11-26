import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Submission from '@/lib/models/Submission';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '50');

    await connectDB();

    // Build query
    const query: any = {};
    if (level) {
      query.level = level;
    }

    // Get submissions
    const submissions = await Submission.find(query)
      .populate('userId', 'email teamName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Format submissions
    const formattedSubmissions = submissions.map((sub: any) => ({
      id: sub._id,
      teamName: sub.teamName,
      email: sub.userId?.email || 'Unknown',
      level: sub.level,
      flag: sub.flag,
      isCorrect: sub.isCorrect,
      attemptNumber: sub.attemptNumber,
      timeTaken: sub.timeTaken,
      createdAt: sub.createdAt,
    }));

    // Get statistics by level
    const stats = await Submission.aggregate([
      {
        $group: {
          _id: '$level',
          totalAttempts: { $sum: 1 },
          successfulAttempts: {
            $sum: { $cond: ['$isCorrect', 1, 0] },
          },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          level: '$_id',
          totalAttempts: 1,
          successfulAttempts: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          successRate: {
            $multiply: [
              { $divide: ['$successfulAttempts', '$totalAttempts'] },
              100,
            ],
          },
        },
      },
      {
        $sort: { level: 1 },
      },
    ]);

    return NextResponse.json({
      success: true,
      submissions: formattedSubmissions,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Submissions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
