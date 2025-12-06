import { ScreenFlow } from '@/ai/graph';

interface PlannedScreen {
  id: string;
  name: string;
  description: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  level: number;
}

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

/**
 * Estimates the width of a label in pixels based on character count.
 * Uses approximate values matching the AnimatedEdge component's styling:
 * - text-base (16px), font-medium
 * - px-6 (24px padding on each side = 48px total)
 * Average char width ~9px for this font size
 */
function estimateLabelWidth(label: string): number {
  const CHAR_WIDTH = 9; // Average character width for text-base font
  const PADDING = 48; // px-6 = 24px + 24px
  const MIN_WIDTH = 100; // Minimum label width

  return Math.max(MIN_WIDTH, label.length * CHAR_WIDTH + PADDING);
}

/**
 * Calculates the required horizontal gap based on edge labels.
 * Finds the longest label and ensures enough space for it plus padding.
 */
function calculateDynamicHorizontalGap(
  flows: ScreenFlow[],
  baseGap: number
): number {
  if (flows.length === 0) return baseGap;

  // Find the longest label width
  let maxLabelWidth = 0;
  for (const flow of flows) {
    if (flow.label) {
      const labelWidth = estimateLabelWidth(flow.label);
      maxLabelWidth = Math.max(maxLabelWidth, labelWidth);
    }
  }

  // Add extra padding around the label (at least 40px on each side)
  const LABEL_PADDING = 80;
  const requiredGap = maxLabelWidth + LABEL_PADDING;

  // Return the larger of base gap or required gap
  return Math.max(baseGap, requiredGap);
}

/**
 * Computes node positions based on a directed graph layout (tree structure).
 * Entry points (no incoming edges) are placed at level 0 (leftmost).
 * Each subsequent level contains nodes reachable from the previous level.
 * Automatically adjusts horizontal gap based on edge label lengths.
 */
export function computeFlowLayout(
  screens: PlannedScreen[],
  flows: ScreenFlow[],
  config: LayoutConfig
): NodePosition[] {
  if (screens.length === 0) return [];

  const { nodeWidth, nodeHeight, horizontalGap: baseHorizontalGap, verticalGap } = config;

  // Calculate dynamic horizontal gap based on edge label lengths
  const horizontalGap = calculateDynamicHorizontalGap(flows, baseHorizontalGap);

  // Build adjacency lists from flows ONLY (ignore screen array order)
  const outgoing: Map<string, string[]> = new Map();
  const incoming: Map<string, number> = new Map();
  const screenIds = new Set(screens.map(s => s.id));

  screens.forEach((s) => {
    outgoing.set(s.id, []);
    incoming.set(s.id, 0);
  });

  // Build graph from flows
  flows.forEach((flow) => {
    // Only process flows where both screens exist
    if (screenIds.has(flow.from) && screenIds.has(flow.to)) {
      outgoing.get(flow.from)?.push(flow.to);
      incoming.set(flow.to, (incoming.get(flow.to) || 0) + 1);
    }
  });

  // BFS to assign levels - handle disconnected components
  const levels: Map<string, number> = new Map();
  const visited = new Set<string>();

  // Helper to run BFS from a set of start nodes
  const runBFS = (starts: string[]) => {
    const queue: { id: string; level: number }[] = starts.map((id) => ({ id, level: 0 }));

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      if (visited.has(id)) continue;
      visited.add(id);

      // If we found a path to this node that is longer (deeper), update it?
      // For simple tree/DAG layout, usually we want the *longest* path to push it right,
      // or shortest path to keep it left. Let's stick to "first discovery" (shortest path) for now to keep it simple,
      // but we might need to revisit if we want "longest path layering".
      if (!levels.has(id)) {
        levels.set(id, level);
      }

      const neighbors = outgoing.get(id) || [];
      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          queue.push({ id: neighborId, level: level + 1 });
        }
      });
    }
  };

  // 1. Find natural entry points (in-degree 0)
  const entryPoints: string[] = [];
  screens.forEach((s) => {
    if ((incoming.get(s.id) || 0) === 0) {
      entryPoints.push(s.id);
    }
  });

  // Run BFS from natural entry points
  if (entryPoints.length > 0) {
    runBFS(entryPoints);
  }

  // 2. Handle disconnected components / cycles
  // If there are nodes not visited yet, pick one arbitrarily and run BFS
  // This handles "A <-> B" isolated cycles where neither has in-degree 0
  let unvisited = screens.filter(s => !visited.has(s.id));
  while (unvisited.length > 0) {
    // Pick the first one as a pseudo-root
    const root = unvisited[0];
    runBFS([root.id]);
    unvisited = screens.filter(s => !visited.has(s.id));
  }

  // Calculate Y positions using a recursive tree layout
  const yPositions: Map<string, number> = new Map();
  const visitedForY = new Set<string>();
  const recursionStack = new Set<string>(); // To detect cycles during recursion
  let nextAvailableY = 0;

  function calculateY(nodeId: string): number {
    // If already calculated, return existing Y
    if (visitedForY.has(nodeId)) {
      return yPositions.get(nodeId) || 0;
    }

    // Cycle detection: if we are currently visiting this node in the recursion stack,
    // treat it as a leaf for this path to break the cycle.
    if (recursionStack.has(nodeId)) {
      // Return a temporary Y (e.g., next available) or just 0?
      // If we return 0, it might overlap. Let's just return nextAvailableY to be safe,
      // but NOT mark it as visited globally so it can be properly placed later if reached from a valid path?
      // Actually, if it's a back-edge, we just want to ignore this child for the parent's centering logic.
      return nextAvailableY;
    }

    recursionStack.add(nodeId);

    const children = outgoing.get(nodeId) || [];

    // Filter out children that are back-edges (already in recursion stack)
    // to prevent infinite loops and bad centering
    const validChildren = children.filter(childId => !recursionStack.has(childId));

    if (validChildren.length === 0) {
      // Leaf node (or all children are back-edges): assign next available vertical slot
      visitedForY.add(nodeId);
      recursionStack.delete(nodeId);

      const y = nextAvailableY;
      nextAvailableY += nodeHeight + verticalGap;
      yPositions.set(nodeId, y);
      return y;
    }

    // Non-leaf: Recursively calculate children's positions first
    let minChildY = Infinity;
    let maxChildY = -Infinity;

    validChildren.forEach((childId) => {
      const childY = calculateY(childId);
      minChildY = Math.min(minChildY, childY);
      maxChildY = Math.max(maxChildY, childY);
    });

    visitedForY.add(nodeId);
    recursionStack.delete(nodeId);

    // Place parent in the vertical center of its children
    const y = (minChildY + maxChildY) / 2;
    yPositions.set(nodeId, y);
    return y;
  }

  // Calculate Y for all nodes, starting from those with lowest level (left-most)
  // Sorting by level helps process parents before children in a general sense,
  // though calculateY is recursive/DFS.
  // We prioritize our identified entry points, then any unvisited.

  // Re-use our entry points logic, but now we might have more "roots" from the disconnected phase
  // Let's just iterate all screens. If not visited, calculate.
  // We prefer starting from level 0 nodes.
  const sortedScreens = [...screens].sort((a, b) => {
    const levA = levels.get(a.id) || 0;
    const levB = levels.get(b.id) || 0;
    return levA - levB;
  });

  sortedScreens.forEach((s) => {
    if (!visitedForY.has(s.id)) {
      calculateY(s.id);
      // Add spacing between separate trees
      nextAvailableY += nodeHeight + verticalGap;
    }
  });

  // Normalize Y positions to start at 0
  const allYs = Array.from(yPositions.values());
  const minY = Math.min(...allYs);
  if (minY > 0) {
    screens.forEach(s => {
      const current = yPositions.get(s.id) || 0;
      yPositions.set(s.id, current - minY);
    });
  }

  // Assemble final positions
  const positions: NodePosition[] = screens.map((s) => ({
    id: s.id,
    x: (levels.get(s.id) || 0) * (nodeWidth + horizontalGap),
    y: yPositions.get(s.id) || 0,
    level: levels.get(s.id) || 0,
  }));

  return positions;
}

/**
 * Returns layout config based on view mode
 */
export function getLayoutConfig(viewMode: 'desktop' | 'mobile'): LayoutConfig {
  if (viewMode === 'mobile') {
    return {
      nodeWidth: 430,
      nodeHeight: 932,
      horizontalGap: 280, // Increased by 40% (was 200)
      verticalGap: 140,   // Increased by 40% (was 100)
    };
  }

  return {
    nodeWidth: 1920,
    nodeHeight: 1080,
    horizontalGap: 300,
    verticalGap: 150,
  };
}
