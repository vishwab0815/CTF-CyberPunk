import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Level3_1_Progress from '@/lib/models/Level3_1_Progress';
import { authOptions } from '@/lib/auth';

// Canonical phase data (server-side only, never exposed to client)
const PHASE_DATA = {
  1: {
    canonicalKey: 'RAPID-ACCESS-OVERRIDE',
    acceptedAliases: ['rapid-access-override', 'RAPID_ACCESS_OVERRIDE', 'rapidaccessoverride'],
    fragment: 'INTER',
    hintText: 'Rapid clicking required - speed is critical',
  },
  2: {
    canonicalKey: 'EXTENDED-KONAMI-CIPHER',
    acceptedAliases: ['extended-konami-cipher', 'EXTENDED_KONAMI_CIPHER', 'extendedkonamicipher'],
    fragment: 'FACE_',
    hintText: 'Extended arrow sequence - more complex than before',
  },
  3: {
    canonicalKey: 'CRITICAL-ERROR-TRIAGE',
    acceptedAliases: ['critical-error-triage', 'CRITICAL_ERROR_TRIAGE', 'criticalerrortriage'],
    fragment: 'NOT_BR',
    hintText: 'Identify and select ALL critical errors in exact order',
  },
  4: {
    canonicalKey: 'CIPHER-MATRIX-DECODE',
    acceptedAliases: ['cipher-matrix-decode', 'CIPHER_MATRIX_DECODE', 'ciphermatrixdecode'],
    fragment: 'OKEN_Y',
    hintText: 'Decode the cipher: ROT13 or Caesar shift may help',
  },
  5: {
    canonicalKey: 'FINAL-AUTHENTICATION',
    acceptedAliases: ['final-authentication', 'FINAL_AUTHENTICATION', 'finalauthentication'],
    fragment: 'OU_ARE',
    hintText: 'Combine all knowledge gained from previous phases',
  },
} as const;

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5;
const LOCKOUT_THRESHOLD = 20; // Total failed attempts before lockout
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const SUSPICIOUS_SPEED_THRESHOLD_MS = 1000; // < 1 second is suspicious

// Helper to normalize input
const normalize = (str: string): string => {
  return str.trim().toUpperCase().replace(/[-_\s]/g, '');
};

// Helper to get client IP
const getClientIp = (req: NextRequest): string => {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
};

// Helper to get user agent
const getUserAgent = (req: NextRequest): string => {
  return req.headers.get('user-agent') || 'unknown';
};

/**
 * POST /api/levels/3.1
 *
 * Body: { phase: number, input: string }
 *
 * Security:
 * - Session authentication required
 * - Rate limiting (5 attempts/min)
 * - Sequential phase enforcement
 * - Attempt logging with metadata
 * - Anti-cheat detection
 * - Lockout after abuse
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
    const { phase, input } = body;

    // 3. Validate input
    if (typeof phase !== 'number' || !input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request. Phase must be a number and input must be a string.' },
        { status: 400 }
      );
    }

    if (phase < 1 || phase > 5) {
      return NextResponse.json(
        { error: 'Invalid phase. Must be between 1 and 5.' },
        { status: 400 }
      );
    }

    // 4. Connect to database
    await connectDB();

    // 5. Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // 6. Get or create progress
    let progress = await Level3_1_Progress.findOne({ userId: user._id });

    if (!progress) {
      progress = await Level3_1_Progress.create({
        userId: user._id,
        completedPhases: [],
        currentPhase: 1,
        attempts: [],
        fragments: [],
        rateLimiting: {
          attemptCount: 0,
          windowStart: new Date(),
        },
        startTime: new Date(),
        isLocked: false,
      });
    }

    // 7. Check if locked out
    if (progress.isLocked || progress.rateLimiting.lockoutUntil) {
      const lockoutUntil = progress.rateLimiting.lockoutUntil;
      if (lockoutUntil && new Date() < lockoutUntil) {
        const remainingMs = lockoutUntil.getTime() - Date.now();
        const remainingSec = Math.ceil(remainingMs / 1000);

        return NextResponse.json(
          {
            error: 'Rate limit exceeded. You have been temporarily locked out.',
            lockoutRemaining: remainingSec,
            retryAfter: Math.ceil(remainingSec),
          },
          { status: 429 }
        );
      } else {
        // Reset lockout
        progress.isLocked = false;
        progress.rateLimiting.lockoutUntil = undefined;
        progress.rateLimiting.attemptCount = 0;
        progress.rateLimiting.windowStart = new Date();
      }
    }

    // 8. Rate limiting check
    const now = new Date();
    const windowElapsed = now.getTime() - progress.rateLimiting.windowStart.getTime();

    if (windowElapsed > RATE_LIMIT_WINDOW_MS) {
      // Reset window
      progress.rateLimiting.attemptCount = 0;
      progress.rateLimiting.windowStart = now;
    }

    if (progress.rateLimiting.attemptCount >= MAX_ATTEMPTS_PER_WINDOW) {
      return NextResponse.json(
        {
          error: 'Too many attempts. Please wait before trying again.',
          retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - windowElapsed) / 1000),
        },
        { status: 429 }
      );
    }

    // 9. Phase enforcement (sequential)
    if (phase !== progress.currentPhase) {
      return NextResponse.json(
        {
          error: `You must complete Phase ${progress.currentPhase} first.`,
          currentPhase: progress.currentPhase,
        },
        { status: 400 }
      );
    }

    // 10. Get canonical step data (from hardcoded PHASE_DATA)
    const step = PHASE_DATA[phase as keyof typeof PHASE_DATA];
    if (!step) {
      return NextResponse.json(
        { error: 'Invalid phase number.' },
        { status: 400 }
      );
    }

    // 11. Validate input
    const normalizedInput = normalize(input);
    const normalizedCanonical = normalize(step.canonicalKey);
    const normalizedAliases = step.acceptedAliases.map(normalize);

    const isCorrect =
      normalizedInput === normalizedCanonical ||
      normalizedAliases.includes(normalizedInput);

    // 12. Get client metadata
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    // 13. Increment rate limit counter
    progress.rateLimiting.attemptCount += 1;

    // 14. Record attempt
    const attemptRecord = {
      phase,
      input: input.substring(0, 100), // Truncate long inputs
      success: isCorrect,
      timestamp: now,
      ipAddress,
      userAgent,
    };
    progress.attempts.push(attemptRecord);

    // 15. Anti-cheat: Check for suspicious speed
    const phaseAttempts = progress.attempts.filter((a) => a.phase === phase);
    if (phaseAttempts.length > 1 && isCorrect) {
      const lastAttempt = phaseAttempts[phaseAttempts.length - 2];
      const timeSinceLastAttempt = now.getTime() - lastAttempt.timestamp.getTime();

      if (timeSinceLastAttempt < SUSPICIOUS_SPEED_THRESHOLD_MS) {
        console.warn(`⚠️ Suspicious speed detected for user ${user.teamName} on Phase ${phase}`);
        // Could flag for admin review but still allow
      }
    }

    // 16. Anti-cheat: Check for brute force
    const failedAttemptsThisPhase = phaseAttempts.filter((a) => !a.success).length;
    if (failedAttemptsThisPhase >= LOCKOUT_THRESHOLD) {
      progress.isLocked = true;
      progress.rateLimiting.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await progress.save();

      return NextResponse.json(
        {
          error: 'Too many failed attempts. Locked out for 5 minutes.',
          lockoutDuration: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        },
        { status: 429 }
      );
    }

    // 17. Handle incorrect answer
    if (!isCorrect) {
      await progress.save();

      return NextResponse.json(
        {
          success: false,
          message: 'Incorrect input. Try again.',
          phase,
          attempts: phaseAttempts.length,
          hint: phaseAttempts.length >= 3 ? step.hintText : undefined,
        },
        { status: 200 }
      );
    }

    // 18. Handle correct answer
    // Add phase to completed if not already there
    if (!progress.completedPhases.includes(phase)) {
      progress.completedPhases.push(phase);
      progress.fragments.push(step.fragment);
    }

    // 19. Check if all phases completed
    const allPhasesComplete = progress.completedPhases.length === 5;

    if (allPhasesComplete) {
      // Calculate final flag
      const concatenatedFragments = progress.fragments.join('');
      const finalHash = crypto
        .createHash('sha1')
        .update(concatenatedFragments)
        .digest('hex');

      // Set completion time
      if (!progress.completionTime) {
        progress.completionTime = now;
        progress.timeTaken = progress.completionTime.getTime() - progress.startTime.getTime();
      }

      await progress.save();

      return NextResponse.json(
        {
          success: true,
          phaseComplete: true,
          allComplete: true,
          message: 'All 5 phases completed! The interface has been conquered.',
          phase,
          fragment: step.fragment,
          finalFlag: 'FLAG{INTERFACE_NOT_BROKEN_YOU_ARE}',
          finalHash,
          fragments: concatenatedFragments,
          timeTaken: progress.timeTaken,
        },
        { status: 200 }
      );
    } else {
      // Move to next phase
      progress.currentPhase = phase + 1;
      await progress.save();

      return NextResponse.json(
        {
          success: true,
          phaseComplete: true,
          allComplete: false,
          message: `Phase ${phase} completed! Fragment acquired.`,
          phase,
          fragment: step.fragment,
          nextPhase: progress.currentPhase,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Level 3.1 API Error:', error);

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
 * GET /api/levels/3.1
 *
 * Returns user's current progress for Level 3.1
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

    // 3. Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // 4. Get progress
    const progress = await Level3_1_Progress.findOne({ userId: user._id });

    if (!progress) {
      return NextResponse.json(
        {
          exists: false,
          message: 'No progress found for this level.',
        },
        { status: 200 }
      );
    }

    // 5. Return sanitized progress
    return NextResponse.json(
      {
        exists: true,
        currentPhase: progress.currentPhase,
        completedPhases: progress.completedPhases,
        totalAttempts: progress.attempts.length,
        isLocked: progress.isLocked,
        lockoutUntil: progress.rateLimiting.lockoutUntil,
        allComplete: progress.completedPhases.length === 5,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Level 3.1 GET Error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred while fetching progress.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
