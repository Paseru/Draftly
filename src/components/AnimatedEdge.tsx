import { useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useStore,
  ReactFlowState,
  EdgeProps,
} from '@xyflow/react';

export type AnimatedEdgeData = {
  label?: string;
  color?: string;
};

const AnimatedEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}: EdgeProps) => {
  const edges = useStore((state: ReactFlowState) => state.edges);
  
  // Calculate offset for parallel edges between same nodes
  const edgeOffset = useMemo(() => {
    const parallelEdges = edges.filter(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
    );
    
    if (parallelEdges.length <= 1) return 0;
    
    const currentIndex = parallelEdges.findIndex((e) => e.id === id);
    const isReverse = parallelEdges[currentIndex]?.source === target;
    
    // Offset calculation: spread edges vertically
    const baseOffset = (currentIndex - (parallelEdges.length - 1) / 2) * 60;
    return isReverse ? -baseOffset - 30 : baseOffset + 30;
  }, [edges, id, source, target]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY: sourceY + edgeOffset,
    targetX,
    targetY: targetY + edgeOffset,
    sourcePosition,
    targetPosition,
    curvature: 0.4, // Increased curvature for smoother flow
  });

  const label = (data as AnimatedEdgeData)?.label;
  const color = (data as AnimatedEdgeData)?.color || '#60a5fa'; // Brighter blue

  return (
    <>
      {/* Gradient defs */}
      <defs>
        <linearGradient id={`gradient-${id}`} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.2" />
        </linearGradient>
        <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base edge - wider background path for glow effect */}
      <path
        id={`base-${id}`}
        d={edgePath}
        style={{
          stroke: color,
          strokeWidth: 4,
          strokeOpacity: 0.15,
          fill: 'none',
        }}
      />

      {/* Main edge path with gradient */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: `url(#gradient-${id})`,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }}
      />
      
      {/* Animated dash traveling along the path */}
      <path
        d={edgePath}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeDasharray="10, 10"
        strokeDashoffset="0"
        opacity="0.6"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="20"
          to="0"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>

      {/* Primary particle */}
      <circle r="4" fill="white" filter="url(#glow-strong)">
        <animateMotion 
          dur="2.5s" 
          repeatCount="indefinite" 
          path={edgePath}
          keyPoints="0;1"
          keyTimes="0;1"
          calcMode="linear"
        />
      </circle>
      
      {/* Secondary trailing particle */}
      <circle r="2" fill={color} filter="url(#glow-strong)">
        <animateMotion 
          dur="2.5s" 
          repeatCount="indefinite" 
          path={edgePath} 
          begin="-0.3s"
          keyPoints="0;1"
          keyTimes="0;1"
          calcMode="linear"
        />
      </circle>

      {/* Label in the middle of the edge */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="group"
          >
            <div className="px-3 py-1.5 bg-[#1e1e1e]/90 border border-blue-500/30 rounded-full text-xs font-medium text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:border-blue-400/50 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default AnimatedEdge;
