import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Submission from '../../../../lib/models/Submission';
import { getLevelLookupCandidates, normalizeLevelId } from '../../../../lib/levelIds';

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
    if (level && level !== 'all') {
      query.level = { $in: getLevelLookupCandidates(level) };
    }

    const totalSubmissions = await Submission.countDocuments(query);

    // Get submissions
    const submissions = await Submission.find(query)
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Format submissions
    const formattedSubmissions = submissions.map((sub: any) => ({
      id: sub._id,
      teamName: sub.userId?.email?.split('@')[0] || sub.teamName || 'Unknown',
      email: sub.userId?.email || 'Unknown',
      level: normalizeLevelId(sub.level),
      legacyLevel: sub.level,
      flag: sub.flag,
      isCorrect: sub.isCorrect,
      attemptNumber: sub.attemptNumber,
      timeTaken: sub.timeTaken,
      createdAt: sub.createdAt,
    }));

    // Get statistics by level
    const stats = await Submission.aggregate([
      {
        $addFields: {
          normalizedLevel: {
            $switch: {
              branches: [
                { case: { $eq: ['$level', '1.1'] }, then: '1' },
                { case: { $eq: ['$level', '1.2'] }, then: '2' },
                { case: { $eq: ['$level', '1.3'] }, then: '3' },
                { case: { $eq: ['$level', '1.4'] }, then: '4' },
                { case: { $eq: ['$level', '2.1'] }, then: '5' },
                { case: { $eq: ['$level', '3.1'] }, then: '6' },
                { case: { $eq: ['$level', '3.2'] }, then: '7' },
              ],
              default: '$level',
            },
          },
        },
      },
      {
        $group: {
          _id: '$normalizedLevel',
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
      totalSubmissions,
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
