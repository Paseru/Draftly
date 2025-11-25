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
  
  // Group nodes by level
  const levelGroups: Map<number, string[]> = new Map();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(id);
  });
  
  // Calculate positions
  const positions: NodePosition[] = [];
  const maxNodesInLevel = Math.max(...Array.from(levelGroups.values()).map((g) => g.length), 1);
  
  levelGroups.forEach((nodeIds, level) => {
    const nodesInLevel = nodeIds.length;
    
    // Center nodes vertically within the level
    const totalHeight = nodesInLevel * nodeHeight + (nodesInLevel - 1) * verticalGap;
    const maxTotalHeight = maxNodesInLevel * nodeHeight + (maxNodesInLevel - 1) * verticalGap;
    const startY = (maxTotalHeight - totalHeight) / 2;
    
    nodeIds.forEach((id, index) => {
      positions.push({
        id,
        x: level * (nodeWidth + horizontalGap),
        y: startY + index * (nodeHeight + verticalGap),
        level,
      });
    });
  });
  
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
