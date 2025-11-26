import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Submission from '@/lib/models/Submission';
import LevelProgress from '@/lib/models/LevelProgress';
import Flag from '@/lib/models/Flag';

const NEXT_LEVELS: Record<string, string> = {
  '1.1': '1.2',
  '1.2': '1.3',
  '1.3': '1.4',
  '1.4': '2.1',
  '2.1': '2.2',
  '2.2': '3.1',
  '3.1': '3.2',
  '3.2': 'complete',
};

const normalize = (s: string) => s.trim().toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { level, flag } = await req.json();

    if (!level || !flag) {
      return NextResponse.json(
        { error: 'Level and flag are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch the correct flag from database
    const levelFlag = await Flag.findOne({ level, isActive: true });

    if (!levelFlag) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if flag is correct
    const isCorrect =
      normalize(flag) === normalize(levelFlag.flag);

    // Get existing level progress
    let levelProgress = await LevelProgress.findOne({
      userId: user._id,
      level,
    });

    if (!levelProgress) {
      // Create new progress entry
      levelProgress = await LevelProgress.create({
        userId: user._id,
        level,
        status: 'in_progress',
        startTime: new Date(),
        attempts: 0,
      });
    }

    // Calculate time taken
    const timeTaken = levelProgress.startTime
      ? Date.now() - new Date(levelProgress.startTime).getTime()
      : 0;

    // Increment attempt number
    levelProgress.attempts += 1;
    levelProgress.lastAttempt = new Date();

    // Record submission
    await Submission.create({
      userId: user._id,
      teamName: user.teamName,
      level,
      flag,
      isCorrect,
      attemptNumber: levelProgress.attempts,
      timeTaken,
      metadata: {
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    });

    if (isCorrect) {
      // Update level progress
      levelProgress.status = 'completed';
      levelProgress.completionTime = new Date();
      levelProgress.timeTaken = timeTaken;
      await levelProgress.save();

      // Update user progress
      if (!user.completedLevels.includes(level)) {
        user.completedLevels.push(level);

        // Update current level
        const nextLevel = NEXT_LEVELS[level];
        if (nextLevel && nextLevel !== 'complete') {
          user.currentLevel = nextLevel;
        }

        await user.save();
      }

      // Determine completion page redirect
      let completionPage = null;
      if (level === '1.4') {
        completionPage = '/completion/level-1-completed';
      } else if (level === '2.2') {
        completionPage = '/completion/level-2-completed';
      } else if (level === '3.2') {
        completionPage = '/completion/final-completed';
      }

      return NextResponse.json({
        success: true,
        correct: true,
        message: 'Flag correct! Level completed.',
        nextLevel: NEXT_LEVELS[level],
        completionPage,
        attempts: levelProgress.attempts,
      });
    } else {
      await levelProgress.save();

      return NextResponse.json({
        success: true,
        correct: false,
        message: 'Incorrect flag. Try again!',
        attempts: levelProgress.attempts,
      });
    }
  } catch (error) {
    console.error('Submit flag error:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting the flag' },
      { status: 500 }
    );
  }
}
