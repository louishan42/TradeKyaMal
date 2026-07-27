/**
 * Maps course project weeks to evidence folders — keep in sync with frontend.
 */

export const LEGACY_W6_FOLDER = 26;

export function maxSelectableProjectWeek(currentProjectWeek: number): number {
  return currentProjectWeek;
}

export function projectWeekToEvidenceTarget(projectWeek: number): {
  folder: number;
  fileWeek: number;
} {
  return { folder: projectWeek, fileWeek: projectWeek };
}

export function folderAndFileWeekToProjectWeek(
  folder: number,
  fileWeek: number
): number {
  if (folder === LEGACY_W6_FOLDER && fileWeek === 6) return 6;
  return fileWeek;
}

export function parseFileWeekFromName(filename: string): number | null {
  const match = filename.match(/2026-W(\d+)/i) ?? filename.match(/[_-]w(\d+)[._]/i);
  return match ? Number(match[1]) : null;
}

export function evidenceFolderPath(folder: number, subPath = ''): string {
  const base = `evidence/Week ${folder}`;
  return subPath ? `${base}/${subPath.replace(/^\/+/, '')}` : base;
}

export function evidencePathsForProjectWeek(
  projectWeek: number,
  filename: string
): string[] {
  const { folder } = projectWeekToEvidenceTarget(projectWeek);
  const paths = [evidenceFolderPath(folder, filename)];

  if (projectWeek === 6) {
    paths.push(evidenceFolderPath(LEGACY_W6_FOLDER, filename));
  }

  return paths;
}
