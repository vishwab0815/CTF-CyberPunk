import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Level3_1_Progress from '@/lib/models/Level3_1_Progress';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/level-3-1-stats
 *
 * Admin-only endpoint to monitor Level 3.1 statistics and user progress
 *
 * Returns:
 * - Overall completion stats
 * - Users stuck on each phase
 * - Average attempts and time taken
 * - Potential cheaters (suspicious activity)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Check if admin
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    // 2. Connect to database
    await connectDB();

    // 3. Get all Level 3.1 progress records
    const allProgress = await Level3_1_Progress.find().populate('userId', 'teamName email');

    // 4. Calculate statistics
    const totalUsers = allProgress.length;
    const completedUsers = allProgress.filter((p) => p.completedPhases.length === 3).length;
    const inProgressUsers = totalUsers - completedUsers;

    // Phase breakdown
    const usersOnPhase1 = allProgress.filter((p) => p.currentPhase === 1 && !p.completedPhases.includes(1)).length;
    const usersOnPhase2 = allProgress.filter((p) => p.currentPhase === 2 && !p.completedPhases.includes(2)).length;
    const usersOnPhase3 = allProgress.filter((p) => p.currentPhase === 3 && !p.completedPhases.includes(3)).length;

    // Average attempts per phase
    const phase1Attempts = allProgress.map((p) => p.attempts.filter((a) => a.phase === 1).length);
    const phase2Attempts = allProgress.map((p) => p.attempts.filter((a) => a.phase === 2).length);
    const phase3Attempts = allProgress.map((p) => p.attempts.filter((a) => a.phase === 3).length);

    const avgPhase1Attempts =
      phase1Attempts.reduce((sum, a) => sum + a, 0) / Math.max(phase1Attempts.length, 1);
    const avgPhase2Attempts =
      phase2Attempts.reduce((sum, a) => sum + a, 0) / Math.max(phase2Attempts.length, 1);
    const avgPhase3Attempts =
      phase3Attempts.reduce((sum, a) => sum + a, 0) / Math.max(phase3Attempts.length, 1);

    // Average completion time
    const completedTimes = allProgress
      .filter((p) => p.timeTaken !== undefined && p.timeTaken !== null)
      .map((p) => p.timeTaken!);

    const avgCompletionTime =
      completedTimes.length > 0
        ? completedTimes.reduce((sum, t) => sum + t, 0) / completedTimes.length
        : 0;

    // Fastest and slowest completions
    const fastestTime = completedTimes.length > 0 ? Math.min(...completedTimes) : 0;
    const slowestTime = completedTimes.length > 0 ? Math.max(...completedTimes) : 0;

    // 5. Detect suspicious activity
    const suspiciousUsers = allProgress
      .filter((p) => {
        // Too fast completion (<30 seconds for all phases)
        const tooFast = p.timeTaken && p.timeTaken < 30000;

        // Too many failed attempts (>50)
        const tooManyAttempts = p.attempts.filter((a) => !a.success).length > 50;

        // Currently locked out
        const lockedOut = p.isLocked || (p.rateLimiting.lockoutUntil && new Date() < p.rateLimiting.lockoutUntil);

        return tooFast || tooManyAttempts || lockedOut;
      })
      .map((p) => ({
        teamName: (p.userId as any)?.teamName || 'Unknown',
        email: (p.userId as any)?.email || 'Unknown',
        timeTaken: p.timeTaken,
        totalAttempts: p.attempts.length,
        failedAttempts: p.attempts.filter((a) => !a.success).length,
        isLocked: p.isLocked,
        lockoutUntil: p.rateLimiting.lockoutUntil,
        completedPhases: p.completedPhases.length,
      }));

    // 6. Users stuck (>10 attempts on same phase without completing)
    const stuckUsers = allProgress
      .filter((p) => {
        const currentPhase = p.currentPhase;
        const attemptCount = p.attempts.filter((a) => a.phase === currentPhase).length;
        const isCompleted = p.completedPhases.includes(currentPhase);

        return attemptCount > 10 && !isCompleted;
      })
      .map((p) => ({
        teamName: (p.userId as any)?.teamName || 'Unknown',
        email: (p.userId as any)?.email || 'Unknown',
        stuckOnPhase: p.currentPhase,
        attemptCount: p.attempts.filter((a) => a.phase === p.currentPhase).length,
        lastAttempt: p.attempts[p.attempts.length - 1]?.timestamp || null,
      }));

    // 7. Recently completed (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCompletions = allProgress
      .filter((p) => p.completionTime && p.completionTime > yesterday)
      .map((p) => ({
        teamName: (p.userId as any)?.teamName || 'Unknown',
        email: (p.userId as any)?.email || 'Unknown',
        completionTime: p.completionTime,
        timeTaken: p.timeTaken,
        totalAttempts: p.attempts.length,
      }))
      .sort((a, b) => {
        const timeA = a.completionTime ? new Date(a.completionTime).getTime() : 0;
        const timeB = b.completionTime ? new Date(b.completionTime).getTime() : 0;
        return timeB - timeA;
      });

    // 8. Return comprehensive stats
    return NextResponse.json(
      {
        overview: {
          totalUsers,
          completedUsers,
          inProgressUsers,
          completionRate: totalUsers > 0 ? ((completedUsers / totalUsers) * 100).toFixed(2) : '0.00',
        },
        phaseBreakdown: {
          phase1: {
            stuck: usersOnPhase1,
            averageAttempts: avgPhase1Attempts.toFixed(2),
          },
          phase2: {
            stuck: usersOnPhase2,
            averageAttempts: avgPhase2Attempts.toFixed(2),
          },
          phase3: {
            stuck: usersOnPhase3,
            averageAttempts: avgPhase3Attempts.toFixed(2),
          },
        },
        timing: {
          averageCompletionTime: Math.round(avgCompletionTime / 1000), // seconds
          fastestTime: Math.round(fastestTime / 1000), // seconds
          slowestTime: Math.round(slowestTime / 1000), // seconds
        },
        suspiciousActivity: {
          count: suspiciousUsers.length,
          users: suspiciousUsers,
        },
        stuckUsers: {
          count: stuckUsers.length,
          users: stuckUsers,
        },
        recentCompletions: {
          count: recentCompletions.length,
          users: recentCompletions.slice(0, 10), // Limit to 10 most recent
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Level 3.1 Stats Error:', error);

    return NextResponse.json(
      {
        error: 'An error occurred while fetching statistics.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
