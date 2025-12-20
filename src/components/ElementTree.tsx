import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Square,
  Type,
  RectangleHorizontal,
  Link,
  Image,
  Sparkles,
  TextCursor,
  List,
  Minus
} from 'lucide-react';

export interface ElementTreeNode {
  tagName: string;
  elementId: string; // Unique ID for this node (e.g., "0", "0-1", "0-1-2")
  domId: string; // Original DOM id attribute
  classList: string[];
  children: ElementTreeNode[];
  hasText: boolean;
  textContent: string;
}

interface ElementTreeProps {
  tree: ElementTreeNode[] | null;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

// Element type detection
type ElementType = 'container' | 'text' | 'button' | 'link' | 'image' | 'icon' | 'input' | 'list' | 'item' | 'pseudo';

function getElementType(tagName: string): ElementType {
  const tag = tagName.toLowerCase();

  if (tag === '#text') {
    return 'text';
  }

  if (tag === '::before' || tag === '::after') {
    return 'pseudo';
  }

  // Text elements
  if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'strong', 'em', 'b', 'i', 'small'].includes(tag)) {
    return 'text';
  }

  // Button
  if (tag === 'button') {
    return 'button';
  }

  // Link
  if (tag === 'a') {
    return 'link';
  }

  // Image/Media
  if (['img', 'picture', 'video', 'audio', 'canvas', 'iframe', 'object', 'embed'].includes(tag)) {
    return 'image';
  }

  // Icon (svg, i tags often used for icons)
  if (['svg', 'i'].includes(tag)) {
    return 'icon';
  }

  // Input elements
  if (['input', 'textarea', 'select', 'option'].includes(tag)) {
    return 'input';
  }

  // List
  if (['ul', 'ol'].includes(tag)) {
    return 'list';
  }

  // List item
  if (tag === 'li') {
    return 'item';
  }

  // Everything else is a container
  return 'container';
}

function getElementLabel(tagName: string, type: ElementType): string {
  const tag = tagName.toLowerCase();

  switch (type) {
    case 'text':
      if (tag === '#text') return 'Text';
      if (tag.startsWith('h')) return `Heading ${tag[1]}`;
      if (tag === 'p') return 'Paragraph';
      if (tag === 'span') return 'Text';
      if (tag === 'label') return 'Label';
      return 'Text';
    case 'pseudo':
      if (tag === '::before') return 'Pseudo Before';
      if (tag === '::after') return 'Pseudo After';
      return 'Pseudo';
    case 'button':
      return 'Button';
    case 'link':
      return 'Link';
    case 'image':
      return 'Image';
    case 'icon':
      return 'Icon';
    case 'input':
      if (tag === 'textarea') return 'Textarea';
      if (tag === 'select') return 'Select';
      return 'Input';
    case 'list':
      return 'List';
    case 'item':
      return 'Item';
    case 'container':
    default:
      return 'Container';
  }
}

function getElementIcon(type: ElementType) {
  const iconProps = { size: 12, strokeWidth: 1.5 };

  switch (type) {
    case 'text':
      return <Type {...iconProps} />;
    case 'pseudo':
      return <Sparkles {...iconProps} />;
    case 'button':
      return <RectangleHorizontal {...iconProps} />;
    case 'link':
      return <Link {...iconProps} />;
    case 'image':
      return <Image {...iconProps} />;
    case 'icon':
      return <Sparkles {...iconProps} />;
    case 'input':
      return <TextCursor {...iconProps} />;
    case 'list':
      return <List {...iconProps} />;
    case 'item':
      return <Minus {...iconProps} />;
    case 'container':
    default:
      return <Square {...iconProps} />;
  }
}

function getElementColor(type: ElementType, isSelected: boolean): string {
  if (isSelected) return 'text-blue-300';

  switch (type) {
    case 'text':
      return 'text-emerald-400';
    case 'pseudo':
      return 'text-fuchsia-400';
    case 'button':
      return 'text-violet-400';
    case 'link':
      return 'text-sky-400';
    case 'image':
      return 'text-amber-400';
    case 'icon':
      return 'text-pink-400';
    case 'input':
      return 'text-orange-400';
    case 'list':
    case 'item':
      return 'text-teal-400';
    case 'container':
    default:
      return 'text-zinc-400';
  }
}

// Single tree node component
const TreeNode = memo(({
  node,
  depth,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  expandedIds,
  toggleExpanded
}: {
  node: ElementTreeNode;
  depth: number;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.elementId);
  const isSelected = selectedId === node.elementId;
  const isHovered = hoveredId === node.elementId;

  // Check if this is a non-targetable element (text nodes, pseudo-elements)
  const isNonTargetable = node.tagName === '#text' ||
                          node.tagName === '::before' ||
                          node.tagName === '::after';

  const elementType = useMemo(() => getElementType(node.tagName), [node.tagName]);
  const label = useMemo(() => getElementLabel(node.tagName, elementType), [node.tagName, elementType]);
  const color = useMemo(() => getElementColor(elementType, isSelected), [elementType, isSelected]);

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1 px-1 rounded text-[11px] transition-colors ${
          isNonTargetable ? 'cursor-help opacity-60' : 'cursor-pointer'
        } ${
          isSelected
            ? 'bg-blue-500/20'
            : isHovered
              ? 'bg-white/5'
              : 'hover:bg-white/5'
        }`}
        style={{ paddingLeft: depth * 14 + 4 }}
        onClick={() => onSelect(node.elementId)}
        onMouseEnter={() => onHover(node.elementId)}
        onMouseLeave={() => onHover(null)}
        title={isNonTargetable ? 'Cliquez pour sélectionner le parent et modifier ce contenu' : undefined}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.elementId);
            }}
            className="p-0.5 hover:bg-white/10 rounded shrink-0"
          >
            {isExpanded ? (
              <ChevronDown size={10} className="text-zinc-500" />
            ) : (
              <ChevronRight size={10} className="text-zinc-500" />
            )}
          </button>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}

        <span className={`shrink-0 ${color}`}>
          {getElementIcon(elementType)}
        </span>

        <span className={`font-medium ${color}`}>
          {label}
        </span>

        {node.hasText && (
          <span className="text-zinc-500 truncate ml-1 font-normal">
            "{node.textContent}"
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.elementId}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={onSelect}
              onHover={onHover}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

// Collect all element IDs up to a certain depth for auto-expansion
function collectIdsToDepth(nodes: ElementTreeNode[], maxDepth: number, currentDepth: number = 0): string[] {
  if (currentDepth >= maxDepth) return [];

  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.elementId);
    if (node.children.length > 0) {
      ids.push(...collectIdsToDepth(node.children, maxDepth, currentDepth + 1));
    }
  }
  return ids;
}

const ElementTree = memo(({ tree, selectedId, hoveredId, onSelect, onHover }: ElementTreeProps) => {
  const resolvedTree = tree ?? [];
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current && resolvedTree.length > 0) {
      const initialIds = collectIdsToDepth(resolvedTree, 2);
      setExpandedIds(new Set(initialIds));
      hasInitializedRef.current = true;
    }
  }, [resolvedTree]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Auto-expand to selected element
  useEffect(() => {
    if (selectedId) {
      const baseId = selectedId.split('~')[0];
      const parts = baseId.split('-');
      const idsToExpand: string[] = [];
      let currentId = '';
      for (const part of parts) {
        currentId = currentId ? `${currentId}-${part}` : part;
        idsToExpand.push(currentId);
      }
      setExpandedIds(prev => {
        const next = new Set(prev);
        idsToExpand.forEach(id => next.add(id));
        return next;
      });
    }
  }, [selectedId]);

  if (!tree) {
    return (
      <div className="p-4 text-zinc-500 text-[11px]">
        Loading elements...
      </div>
    );
  }

  if (resolvedTree.length === 0) {
    return (
      <div className="p-4 text-zinc-500 text-[11px]">
        No elements found
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[#1a1a1a]">
      {resolvedTree.map((node) => (
        <TreeNode
          key={node.elementId}
          node={node}
          depth={0}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={onHover}
          expandedIds={expandedIds}
          toggleExpanded={toggleExpanded}
        />
      ))}
    </div>
  );
});

ElementTree.displayName = 'ElementTree';

export default ElementTree;
