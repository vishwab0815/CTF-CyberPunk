export const LEGACY_TO_NUMERIC_LEVEL: Record<string, string> = {
  '1.1': '1',
  '1.2': '2',
  '1.3': '3',
  '1.4': '4',
  '2.1': '5',
  '3.1': '6',
  '3.2': '7',
};

export const NUMERIC_TO_LEGACY_LEVEL: Record<string, string> = {
  '1': '1.1',
  '2': '1.2',
  '3': '1.3',
  '4': '1.4',
  '5': '2.1',
  '6': '3.1',
  '7': '3.2',
};

export const LEVEL_SEQUENCE = ['1', '2', '3', '4', '5', '6', '7'] as const;

export type LevelId = typeof LEVEL_SEQUENCE[number];

export function normalizeLevelId(levelId: string | null | undefined): LevelId {
  if (!levelId) return '1';
  const raw = String(levelId).trim();
  const result = LEGACY_TO_NUMERIC_LEVEL[raw] || raw;
  // Type guard: ensure result is a valid LevelId
  return (LEVEL_SEQUENCE.includes(result as any) ? result : '1') as LevelId;
}

export function normalizeLevelList(levelIds: string[] | null | undefined): LevelId[] {
  if (!Array.isArray(levelIds)) return [];
  return [...new Set(levelIds.map((id) => normalizeLevelId(id)))];
}

export function getLevelLookupCandidates(levelId: string): string[] {
  const normalized = normalizeLevelId(levelId);
  const legacy = NUMERIC_TO_LEGACY_LEVEL[normalized];
  return legacy ? [normalized, legacy] : [normalized];
}
