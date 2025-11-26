'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const LEVEL_ORDER = ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '3.1', '3.2'];

export function useLevelAccess(levelId: string) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [canAccess, setCanAccess] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

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

    const completedLevels = session.user.completedLevels || [];
    const currentLevel = session.user.currentLevel || '1.1';

    // Check if user can access this level
    const canAccessLevel =
      levelId === currentLevel ||
      completedLevels.includes(levelId);

    if (!canAccessLevel) {
      // Redirect to their current level
      router.push(`/levels/${currentLevel}`);
      return;
    }

    setCanAccess(true);
    setIsChecking(false);
  }, [session, status, levelId, router]);

  return { canAccess, isChecking };
}
