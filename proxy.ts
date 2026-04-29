import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { LEVEL_SEQUENCE, normalizeLevelId, normalizeLevelList } from './lib/levelIds';

// Level progression map (7 levels total - removed 2.2)
const LEVEL_ORDER = [...LEVEL_SEQUENCE];
const COMPLETION_ROUTES = [
  '/completion/level-1-completed',
  '/completion/level-2-completed',
  '/completion/final-completed'
];

// Helper to check if user can access a level
function canAccessLevel(
  requestedLevel: string,
  completedLevels: string[],
  currentLevel: string
): boolean {
  const normalizedRequestedLevel = normalizeLevelId(requestedLevel);
  const normalizedCompletedLevels = normalizeLevelList(completedLevels);
  const normalizedCurrentLevel = normalizeLevelId(currentLevel);
  const requestedIndex = LEVEL_ORDER.indexOf(normalizedRequestedLevel);

  if (requestedIndex === -1) return false;

  // Can access if it's the current level
  if (normalizedRequestedLevel === normalizedCurrentLevel) return true;

  // Can access if already completed
  if (normalizedCompletedLevels.includes(normalizedRequestedLevel)) return true;

  // Can't access future levels
  return false;
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin route protection
    if (path.startsWith('/admin')) {
      if (!token?.isAdmin) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }
      return NextResponse.next();
    }

    // Block admin users from accessing level pages and completion pages
    if (token?.isAdmin) {
      if (path.startsWith('/levels/') || COMPLETION_ROUTES.some(route => path.startsWith(route))) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      return NextResponse.next();
    }

    // Level route protection for non-admin users
    if (path.startsWith('/levels/')) {
      const levelMatch = path.match(/\/levels\/([\d.]+)/);

      if (levelMatch) {
        const requestedLevel = levelMatch[1];
        const completedLevels = normalizeLevelList((token?.completedLevels as string[]) || []);
        const currentLevel = normalizeLevelId((token?.currentLevel as string) || '1');

        // Check if user can access this level
        if (!canAccessLevel(requestedLevel, completedLevels, currentLevel)) {
          // Redirect to their current level
          return NextResponse.redirect(new URL(`/levels/${currentLevel}`, req.url));
        }
      }
    }

    // Completion route protection
    if (COMPLETION_ROUTES.some(route => path.startsWith(route))) {
      const completedLevels = normalizeLevelList((token?.completedLevels as string[]) || []);

      // For level-1-completed, must have completed levels 1-4
      if (path.startsWith('/completion/level-1-completed')) {
        const level1Completed = (['1', '2', '3', '4'] as const).every(
          level => completedLevels.includes(level)
        );
        if (!level1Completed) {
          const currentLevel = normalizeLevelId((token?.currentLevel as string) || '1');
          return NextResponse.redirect(new URL(`/levels/${currentLevel}`, req.url));
        }
      }

      // For level-2-completed, must have completed level 5
      if (path.startsWith('/completion/level-2-completed')) {
        const level2Completed = completedLevels.includes('5' as any);
        if (!level2Completed) {
          const currentLevel = normalizeLevelId((token?.currentLevel as string) || '1');
          return NextResponse.redirect(new URL(`/levels/${currentLevel}`, req.url));
        }
      }

      // For final-completed, must have completed all levels
      if (path.startsWith('/completion/final-completed')) {
        const allCompleted = LEVEL_ORDER.every(
          level => completedLevels.includes(level)
        );
        if (!allCompleted) {
          const currentLevel = normalizeLevelId((token?.currentLevel as string) || '1');
          return NextResponse.redirect(new URL(`/levels/${currentLevel}`, req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public routes
        if (
          path === '/' ||
          path.startsWith('/auth/') ||
          path.startsWith('/api/auth/') ||
          path.startsWith('/_next/') ||
          path.startsWith('/favicon.ico')
        ) {
          return true;
        }

        // Protected routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
