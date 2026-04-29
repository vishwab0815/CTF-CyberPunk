'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { normalizeLevelId, normalizeLevelList } from './levelIds';

export function useLevelAccess(levelId: string) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const completedLevels = normalizeLevelList(session?.user?.completedLevels);
  const currentLevel = normalizeLevelId(session?.user?.currentLevel);
  const requestedLevel = normalizeLevelId(levelId);
  const canAccess = Boolean(
    session?.user &&
    !session.user.isAdmin &&
    (requestedLevel === currentLevel || completedLevels.includes(requestedLevel))
  );
  const isChecking = status === 'loading' || !session?.user || !canAccess;

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    // Admin users cannot access level pages
    if (session.user.isAdmin) {
      router.push('/admin');
      return;
    }

    if (!canAccess) {
      // Redirect to their current level
      router.push(`/levels/${currentLevel}`);
    }
  }, [session, status, levelId, router, canAccess, currentLevel]);

  return { canAccess, isChecking };
}
