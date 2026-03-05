import type { LayoutDefinition, LayoutObject } from '@fmweb/shared';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuideLine {
  orientation: 'vertical' | 'horizontal';
  value: number;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export interface ExecutedCommand<T> {
  label: string;
  before: T;
  after: T;
}

interface ClampRectOptions {
  minWidth?: number;
  minHeight?: number;
}

interface DragInteractionArgs {
  before: LayoutDefinition;
  ids: string[];
  originById: Record<string, Rect>;
  startPoint: Point;
  nextPoint: Point;
}

interface ResizeInteractionArgs {
  before: LayoutDefinition;
  id: string;
  handle: ResizeHandle;
  startPoint: Point;
  nextPoint: Point;
  minWidth?: number;
  minHeight?: number;
}

interface MarqueeSelectionArgs {
  objects: LayoutObject[];
  marquee: Rect;
  baseSelection: string[];
  append: boolean;
}

export function toRect(object: LayoutObject): Rect {
  return {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height
  };
}

export function normalizeRect(rect: Rect): Rect {
  const nextX = rect.width >= 0 ? rect.x : rect.x + rect.width;
  const nextY = rect.height >= 0 ? rect.y : rect.y + rect.height;

  return {
    x: nextX,
    y: nextY,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };
}

export function clampRect(
  rect: Rect,
  canvasWidth: number,
  canvasHeight: number,
  options?: ClampRectOptions
): Rect {
  const minWidth = options?.minWidth ?? 1;
  const minHeight = options?.minHeight ?? 1;

  const width = Math.max(minWidth, Math.min(rect.width, canvasWidth));
  const height = Math.max(minHeight, Math.min(rect.height, canvasHeight));
  const x = clamp(rect.x, 0, Math.max(0, canvasWidth - width));
  const y = clamp(rect.y, 0, Math.max(0, canvasHeight - height));

  return {
    x,
    y,
    width,
    height
  };
}

export function resizeRect(rect: Rect, handle: ResizeHandle, dx: number, dy: number, gridSize: number): Rect {
  let x = rect.x;
  let y = rect.y;
  let width = rect.width;
  let height = rect.height;

  if (handle.includes('e')) {
    width = rect.width + dx;
  }

  if (handle.includes('s')) {
    height = rect.height + dy;
  }

  if (handle.includes('w')) {
    x = rect.x + dx;
    width = rect.width - dx;
  }

  if (handle.includes('n')) {
    y = rect.y + dy;
    height = rect.height - dy;
  }

  const normalized = normalizeRect({ x, y, width, height });

  return {
    x: snapToGrid(normalized.x, gridSize),
    y: snapToGrid(normalized.y, gridSize),
    width: snapToGrid(Math.max(normalized.width, 1), gridSize),
    height: snapToGrid(Math.max(normalized.height, 1), gridSize)
  };
}

export function applySmartGuides(target: Rect, others: LayoutObject[]): { rect: Rect; guides: GuideLine[] } {
  const threshold = 5;
  const guides: GuideLine[] = [];

  const targetLeft = target.x;
  const targetCenterX = target.x + target.width / 2;
  const targetRight = target.x + target.width;

  const targetTop = target.y;
  const targetCenterY = target.y + target.height / 2;
  const targetBottom = target.y + target.height;

  let nextX = target.x;
  let nextY = target.y;

  for (const other of others) {
    const otherLeft = other.x;
    const otherCenterX = other.x + other.width / 2;
    const otherRight = other.x + other.width;

    const xCandidates = [
      { source: targetLeft, anchor: otherLeft, offset: 0 },
      { source: targetCenterX, anchor: otherCenterX, offset: -target.width / 2 },
      { source: targetRight, anchor: otherRight, offset: -target.width }
    ];

    for (const candidate of xCandidates) {
      if (Math.abs(candidate.source - candidate.anchor) <= threshold) {
        nextX = candidate.anchor + candidate.offset;
        guides.push({ orientation: 'vertical', value: candidate.anchor });
        break;
      }
    }

    const otherTop = other.y;
    const otherCenterY = other.y + other.height / 2;
    const otherBottom = other.y + other.height;

    const yCandidates = [
      { source: targetTop, anchor: otherTop, offset: 0 },
      { source: targetCenterY, anchor: otherCenterY, offset: -target.height / 2 },
      { source: targetBottom, anchor: otherBottom, offset: -target.height }
    ];

    for (const candidate of yCandidates) {
      if (Math.abs(candidate.source - candidate.anchor) <= threshold) {
        nextY = candidate.anchor + candidate.offset;
        guides.push({ orientation: 'horizontal', value: candidate.anchor });
        break;
      }
    }
  }

  return {
    rect: {
      ...target,
      x: nextX,
      y: nextY
    },
    guides
  };
}

export function computeDragInteraction(args: DragInteractionArgs): { layout: LayoutDefinition; guides: GuideLine[] } {
  const { before, ids, originById, startPoint, nextPoint } = args;

  const gridSize = before.canvas.gridSize;
  const dxRaw = nextPoint.x - startPoint.x;
  const dyRaw = nextPoint.y - startPoint.y;

  let dx = dxRaw;
  let dy = dyRaw;
  let guides: GuideLine[] = [];

  if (ids.length === 1) {
    const objectId = ids[0];
    const origin = originById[objectId];
    const object = before.objects.find((candidate) => candidate.id === objectId);

    if (origin && object) {
      const targetRect: Rect = {
        x: snapToGrid(origin.x + dxRaw, gridSize),
        y: snapToGrid(origin.y + dyRaw, gridSize),
        width: origin.width,
        height: origin.height
      };

      const guideResult = applySmartGuides(
        clampRect(targetRect, before.canvas.width, before.canvas.height),
        before.objects.filter((candidate) => candidate.id !== objectId)
      );

      dx = guideResult.rect.x - origin.x;
      dy = guideResult.rect.y - origin.y;
      guides = guideResult.guides;
    }
  }

  const layout = cloneLayout(before);
  layout.objects = layout.objects.map((item) => {
    if (!ids.includes(item.id)) {
      return item;
    }

    const origin = originById[item.id];
    if (!origin) {
      return item;
    }

    const moved = clampRect(
      {
        x: snapToGrid(origin.x + dx, gridSize),
        y: snapToGrid(origin.y + dy, gridSize),
        width: origin.width,
        height: origin.height
      },
      layout.canvas.width,
      layout.canvas.height
    );

    return {
      ...item,
      x: moved.x,
      y: moved.y
    };
  });

  return {
    layout,
    guides
  };
}

export function computeResizeInteraction(args: ResizeInteractionArgs): { layout: LayoutDefinition; guides: GuideLine[] } {
  const { before, id, handle, startPoint, nextPoint } = args;

  const item = before.objects.find((candidate) => candidate.id === id);
  if (!item) {
    return {
      layout: cloneLayout(before),
      guides: []
    };
  }

  const dx = nextPoint.x - startPoint.x;
  const dy = nextPoint.y - startPoint.y;

  const resized = resizeRect(toRect(item), handle, dx, dy, before.canvas.gridSize);
  const clamped = clampRect(resized, before.canvas.width, before.canvas.height, {
    minWidth: args.minWidth ?? 32,
    minHeight: args.minHeight ?? 24
  });

  const guideResult = applySmartGuides(clamped, before.objects.filter((candidate) => candidate.id !== id));

  const layout = cloneLayout(before);
  layout.objects = layout.objects.map((candidate) =>
    candidate.id === id
      ? {
          ...candidate,
          x: guideResult.rect.x,
          y: guideResult.rect.y,
          width: guideResult.rect.width,
          height: guideResult.rect.height
        }
      : candidate
  );

  return {
    layout,
    guides: guideResult.guides
  };
}

export function selectByMarquee(args: MarqueeSelectionArgs): string[] {
  const normalized = normalizeRect(args.marquee);
  const hitIds = args.objects
    .filter((item) => rectanglesIntersect(normalized, toRect(item)))
    .map((item) => item.id);

  if (!args.append) {
    return hitIds;
  }

  return uniqueIds([...args.baseSelection, ...hitIds]);
}

export function rectanglesIntersect(left: Rect, right: Rect): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function layoutsEqual(left: LayoutDefinition, right: LayoutDefinition): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function cloneLayout(layout: LayoutDefinition): LayoutDefinition {
  return JSON.parse(JSON.stringify(layout)) as LayoutDefinition;
}

export function pushHistoryEntry<T>(stack: ExecutedCommand<T>[], entry: ExecutedCommand<T>): ExecutedCommand<T>[] {
  return [...stack, entry];
}

export function popHistoryEntry<T>(stack: ExecutedCommand<T>[]): {
  entry: ExecutedCommand<T> | undefined;
  stack: ExecutedCommand<T>[];
} {
  const entry = stack[stack.length - 1];
  if (!entry) {
    return {
      entry: undefined,
      stack
    };
  }

  return {
    entry,
    stack: stack.slice(0, -1)
  };
}

export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 1) {
    return Math.round(value);
  }

  return Math.round(value / gridSize) * gridSize;
}

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function withNormalizedZIndex(layout: LayoutDefinition, ordered: LayoutObject[]): LayoutDefinition {
  const nextById = new Map<string, number>();
  ordered.forEach((item, index) => {
    nextById.set(item.id, index);
  });

  return {
    ...layout,
    objects: layout.objects.map((item) => ({
      ...item,
      zIndex: nextById.get(item.id) ?? item.zIndex
    }))
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
