import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import connectDB from '../../../lib/mongodb';
import User from '../../../lib/models/User';
import Submission from '../../../lib/models/Submission';
import LevelProgress from '../../../lib/models/LevelProgress';
import Flag from '../../../lib/models/Flag';
import {
  getLevelLookupCandidates,
  normalizeLevelId,
  normalizeLevelList,
} from '../../../lib/levelIds';

const NEXT_LEVELS: Record<string, string> = {
  '1': '2',
  '2': '3',
  '3': '4',
  '4': '5',
  '5': '6',
  '6': '7',
  '7': 'complete',
};

const normalize = (s: string) => s.trim().toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { level, flag } = await req.json();
    const normalizedLevel = normalizeLevelId(level);

    if (!normalizedLevel || !flag) {
      return NextResponse.json(
        { error: 'Level and flag are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch the correct flag from database
    const levelFlag = await Flag.findOne({
      level: { $in: getLevelLookupCandidates(normalizedLevel) },
      isActive: true,
    });

    if (!levelFlag) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admins are not allowed to play/submit flags
    if (session.user.isAdmin) {
      return NextResponse.json({ error: 'Admins cannot submit flags' }, { status: 403 });
    }

    // Enforce level progression: only allow submissions for user's current level or already completed levels
    const userCurrent = normalizeLevelId(user.currentLevel || '1');
    const userCompleted = normalizeLevelList(user.completedLevels || []);
    const canSubmit = normalizedLevel === userCurrent || userCompleted.includes(normalizedLevel);

    if (!canSubmit) {
      return NextResponse.json(
        { error: 'You cannot submit a flag for this level yet. Progress the game to unlock it.' },
        { status: 403 }
      );
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
        level: normalizedLevel,
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
      teamName: user.email.split('@')[0],
      level: normalizedLevel,
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
      if (!userCompleted.includes(normalizedLevel)) {
        user.completedLevels = [...userCompleted, normalizedLevel];

        // Update current level
        const nextLevel = NEXT_LEVELS[normalizedLevel];
        if (nextLevel && nextLevel !== 'complete') {
          user.currentLevel = nextLevel;
        }

        await user.save();
      }

      // Determine completion page redirect
      let completionPage = null;
      if (normalizedLevel === '4') {
        completionPage = '/completion/level-1-completed';
      } else if (normalizedLevel === '5') {
        completionPage = '/completion/level-2-completed';
      } else if (normalizedLevel === '7') {
        completionPage = '/completion/final-completed';
      }

      return NextResponse.json({
        success: true,
        correct: true,
        message: 'Flag correct! Level completed.',
        nextLevel: NEXT_LEVELS[normalizedLevel],
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
