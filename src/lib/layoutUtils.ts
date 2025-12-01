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
 * Computes node positions based on a directed graph layout (tree structure).
 * Entry points (no incoming edges) are placed at level 0 (leftmost).
 * Each subsequent level contains nodes reachable from the previous level.
 */
export function computeFlowLayout(
  screens: PlannedScreen[],
  flows: ScreenFlow[],
  config: LayoutConfig
): NodePosition[] {
  if (screens.length === 0) return [];
  
  const { nodeWidth, nodeHeight, horizontalGap, verticalGap } = config;
  
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
  
  // Find entry points = screens with NO incoming edges
  const entryPoints: string[] = [];
  screens.forEach((s) => {
    if ((incoming.get(s.id) || 0) === 0) {
      entryPoints.push(s.id);
    }
  });
  
  // If no entry points found (all have incoming = cycle), use first screen
  if (entryPoints.length === 0 && screens.length > 0) {
    entryPoints.push(screens[0].id);
  }
  
  // BFS to assign levels - each node gets the level of its first discovery
  const levels: Map<string, number> = new Map();
  const queue: { id: string; level: number }[] = entryPoints.map((id) => ({ id, level: 0 }));
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    
    // Skip if already visited
    if (levels.has(id)) continue;
    
    levels.set(id, level);
    
    // Add all outgoing neighbors at level + 1
    const neighbors = outgoing.get(id) || [];
    neighbors.forEach((neighborId) => {
      if (!levels.has(neighborId)) {
        queue.push({ id: neighborId, level: level + 1 });
      }
    });
  }
  
  // Handle disconnected nodes (no flows) - place at level 0
  screens.forEach((s) => {
    if (!levels.has(s.id)) {
      levels.set(s.id, 0);
    }
  });
  
  // Calculate Y positions using a recursive tree layout
  // This ensures parents are centered relative to their children
  const yPositions: Map<string, number> = new Map();
  const visitedForY = new Set<string>();
  let nextAvailableY = 0;

  function calculateY(nodeId: string): number {
    // If already calculated (shared child in DAG), return existing Y
    if (visitedForY.has(nodeId)) {
      return yPositions.get(nodeId) || 0;
    }
    visitedForY.add(nodeId);

    const children = outgoing.get(nodeId) || [];
    
    // Filter children that are effectively "next level" or valid to drive layout
    // (In a DAG, we might want to prioritize main tree branches, but simple traversal works)
    
    if (children.length === 0) {
      // Leaf node: assign next available vertical slot
      const y = nextAvailableY;
      nextAvailableY += nodeHeight + verticalGap;
      yPositions.set(nodeId, y);
      return y;
    }

    // Non-leaf: Recursively calculate children's positions first (Post-Order)
    let minChildY = Infinity;
    let maxChildY = -Infinity;
    let hasProcessedChildren = false;

    children.forEach((childId) => {
      // Only consider children that haven't been fixed by another parent yet?
      // Actually, in a tree, we process them. In a DAG, if already processed, use their value.
      const childY = calculateY(childId);
      minChildY = Math.min(minChildY, childY);
      maxChildY = Math.max(maxChildY, childY);
      hasProcessedChildren = true;
    });

    if (!hasProcessedChildren) {
        // Should not happen given children.length > 0 check, but for safety
        const y = nextAvailableY;
        nextAvailableY += nodeHeight + verticalGap;
        yPositions.set(nodeId, y);
        return y;
    }

    // Place parent in the vertical center of its children
    const y = (minChildY + maxChildY) / 2;
    yPositions.set(nodeId, y);
    return y;
  }

  // Calculate Y for all entry points (roots)
  entryPoints.forEach((rootId) => {
    calculateY(rootId);
    // Add spacing between separate trees if necessary
    // nextAvailableY += nodeHeight + verticalGap; // Optional: separate trees visibly
  });

  // Handle any disconnected components not reached from entry points
  screens.forEach((s) => {
    if (!visitedForY.has(s.id)) {
      calculateY(s.id);
    }
  });
  
  // Normalize Y positions to start at 0
  // (Optional, but good for centering the whole graph in the view)
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
