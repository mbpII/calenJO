import { Region } from '@/types/calendar';

export function mergeOverlappingRegions(regions: Region[]): Region[] {
  if (regions.length === 0) return [];

  const merged: Region[] = [];
  const used = new Set<number>();

  for (let i = 0; i < regions.length; i++) {
    if (used.has(i)) continue;

    let current = { ...regions[i] };
    used.add(i);

    let mergedNew = true;
    while (mergedNew) {
      mergedNew = false;
      for (let j = 0; j < regions.length; j++) {
        if (used.has(j)) continue;

        const other = regions[j];
        if (regionsOverlap(current, other)) {
          current = mergeTwoRegions(current, other);
          used.add(j);
          mergedNew = true;
        }
      }
    }

    merged.push(current);
  }

  return merged;
}

export function regionsOverlap(r1: Region, r2: Region): boolean {
  return !(
    r1.x + r1.width < r2.x ||
    r2.x + r2.width < r1.x ||
    r1.y + r1.height < r2.y ||
    r2.y + r2.height < r1.y
  );
}

export function mergeTwoRegions(r1: Region, r2: Region): Region {
  const minX = Math.min(r1.x, r2.x);
  const minY = Math.min(r1.y, r2.y);
  const maxX = Math.max(r1.x + r1.width, r2.x + r2.width);
  const maxY = Math.max(r1.y + r1.height, r2.y + r2.height);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
