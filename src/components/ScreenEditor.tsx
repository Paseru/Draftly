'use client';

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { X, Send, Crosshair } from 'lucide-react';
import ElementTree, { type ElementTreeNode } from './ElementTree';

interface EditsData {
  remaining: number;
  total: number;
  plan: string;
  used?: number;
}

interface ScreenEditorProps {
  screenId: string;
  screenLabel: string;
  html: string;
  viewMode: 'desktop' | 'mobile';
  isEditing: boolean;
  hasPendingChanges: boolean;
  editsData?: EditsData | null;
  onClose: () => void;
  onEdit: (
    screenId: string,
    request: string,
    selectedElementId?: string,
    cssSelector?: string,
    elementHtml?: string
  ) => void;
  onSave: (screenId: string) => void;
  onDiscard: (screenId: string) => void;
  onCancelEdit: () => void;
}

// Injection script for element selection in iframe
// Uses DOM path traversal (child indices) instead of CSS selectors for unique element targeting
const INJECTION_SCRIPT = `
<script>
(function() {
  let selectionMode = false;

  // Highlight styles - multiple techniques for maximum visibility
  // 1. outline with negative offset (draws inside, on top of content)
  // 2. background color fallback (visible on transparent containers)
  const highlightStyle = 'outline: 3px solid #3b82f6 !important; outline-offset: -3px !important; background-color: rgba(59, 130, 246, 0.15) !important;';
  const selectedStyle = 'outline: 3px solid #22c55e !important; outline-offset: -3px !important; background-color: rgba(34, 197, 94, 0.15) !important;';

  // Skip these tags when counting children
  const SKIP_TAGS = [
    'script', 'style', 'meta', 'link', 'head', 'title', 'noscript',
    // SVG internal elements - no point showing them in tree
    'path', 'g', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse',
    'defs', 'use', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient',
    'stop', 'filter', 'fegaussianblur', 'feoffset', 'feblend', 'text', 'tspan',
    // HTML5 media/template elements
    'source', 'track', 'template'
  ];
  const HIGHLIGHT_ATTRS = ['style', 'data-editor-highlight', 'data-original-style'];

  // Get meaningful children (excluding script, style, etc.)
  function getMeaningfulChildren(element) {
    return Array.from(element.children).filter(child =>
      !SKIP_TAGS.includes(child.tagName.toLowerCase())
    );
  }

  // Get element ID by traversing from body
  function getElementId(el) {
    const path = [];
    let current = el;

    while (current && current !== document.body && current !== document.documentElement) {
      const parent = current.parentElement;
      if (!parent) break;

      const siblings = getMeaningfulChildren(parent);
      const index = siblings.indexOf(current);
      if (index === -1) break;

      path.unshift(index);
      current = parent;
    }

    return path.join('-');
  }

  function normalizeElementId(id) {
    if (!id) return '';
    return String(id).split('~')[0];
  }

  // Get element by ID (traverse DOM using child indices)
  function getElementById(id) {
    const baseId = normalizeElementId(id);
    if (!baseId) return null;

    const indices = baseId.split('-').map(Number);
    let current = document.body;

    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const children = getMeaningfulChildren(current);
      if (index >= children.length) return null;
      current = children[index];
    }

    return current;
  }

  // Generate a unique CSS selector for an element
  // Keep it simple and avoid overly complex selectors
  function generateCssSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + CSS.escape(el.id);

    const path = [];
    let current = el;
    const MAX_DEPTH = 4; // Limit depth to avoid overly complex selectors

    while (current && current !== document.body && path.length < MAX_DEPTH) {
      let selector = current.tagName.toLowerCase();

      // Use id if available (stops the chain)
      if (current.id) {
        path.unshift('#' + CSS.escape(current.id));
        break;
      }

      // Filter classes: exclude responsive prefixes (md:, lg:, etc.) and state variants
      const uniqueClasses = Array.from(current.classList)
        .filter(c => {
          // Exclude classes with colons (responsive, state variants)
          if (c.includes(':')) return false;
          // Exclude common utility-only classes that aren't semantic
          if (/^(p|m|w|h|flex|grid|gap|text|bg|border|rounded|shadow|opacity|z|top|left|right|bottom|inset|absolute|relative|fixed|sticky)-/.test(c)) return false;
          return true;
        })
        .slice(0, 2); // Max 2 classes per level

      if (uniqueClasses.length > 0) {
        selector += '.' + uniqueClasses.map(c => CSS.escape(c)).join('.');
      }

      // Add nth-of-type only if really needed and no good classes
      const parent = current.parentElement;
      if (parent && uniqueClasses.length === 0) {
        const siblings = Array.from(parent.children).filter(s => s.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  function truncateText(text, maxLength = 30) {
    if (!text) return '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    return trimmed.length > maxLength ? trimmed.slice(0, maxLength) + '...' : trimmed;
  }

  function getInlineText(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input') {
      const type = (element.getAttribute('type') || 'text').toLowerCase();
      const visibleTypes = new Set([
        'text',
        'search',
        'email',
        'url',
        'tel',
        'password',
        'number',
        'date',
        'datetime-local',
        'month',
        'week',
        'time',
        'color',
        'button',
        'submit',
        'reset',
        'file'
      ]);
      const placeholder = element.getAttribute('placeholder') || '';
      if (!visibleTypes.has(type)) {
        return placeholder;
      }
      const value = element.value || element.getAttribute('value') || '';
      return value || placeholder;
    }
    if (tagName === 'textarea') {
      const value = element.value || '';
      const placeholder = element.getAttribute('placeholder') || '';
      return value || placeholder;
    }
    if (tagName === 'select') {
      const selectedOption = (element.selectedOptions && element.selectedOptions[0]) ||
        (element.options && element.options[element.selectedIndex]);
      const selectedText = selectedOption?.textContent ? selectedOption.textContent.trim() : '';
      return selectedText || element.value || '';
    }
    return '';
  }

  function normalizePseudoContent(content) {
    if (!content) return '';
    const trimmed = content.trim();
    if (!trimmed || trimmed === 'none' || trimmed === 'normal') return '';
    return trimmed.replace(/^['"]|['"]$/g, '');
  }

  function getPseudoContent(element, pseudo) {
    const styles = getComputedStyle(element, pseudo);
    const content = normalizePseudoContent(styles.content || '');
    if (!content) return '';
    if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
      return '';
    }
    return content;
  }

  function makeTextNode(parentId, index, textContent) {
    return {
      tagName: '#text',
      elementId: parentId + '~text' + index,
      domId: '',
      classList: [],
      children: [],
      hasText: true,
      textContent
    };
  }

  function makePseudoNode(parentId, pseudo, textContent) {
    return {
      tagName: pseudo,
      elementId: parentId + (pseudo === '::before' ? '~before' : '~after'),
      domId: '',
      classList: [],
      children: [],
      hasText: true,
      textContent
    };
  }

  function buildTreeNode(element, id) {
    const tagName = element.tagName.toLowerCase();
    if (SKIP_TAGS.includes(tagName)) return null;

    // Atomic elements: don't process children (they're self-contained media/graphics)
    const isAtomicElement = ['svg', 'img', 'picture', 'video', 'audio', 'canvas', 'iframe', 'object', 'embed'].includes(tagName);

    const children = [];

    if (!isAtomicElement) {
      const meaningfulChildren = getMeaningfulChildren(element);
      const elementIndexMap = new Map();
      meaningfulChildren.forEach((child, index) => {
        elementIndexMap.set(child, index);
      });

      const beforeContent = getPseudoContent(element, '::before');
      if (beforeContent) {
        children.push(makePseudoNode(id, '::before', truncateText(beforeContent)));
      }

      let textIndex = 0;
      let pendingText = '';

      function flushPendingText() {
        if (!pendingText) return;
        const preview = truncateText(pendingText);
        if (preview) {
          children.push(makeTextNode(id, textIndex, preview));
          textIndex += 1;
        }
        pendingText = '';
      }

      element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent ? node.textContent.trim() : '';
          if (text) {
            pendingText = pendingText ? pendingText + ' ' + text : text;
          }
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const childElement = node;
        const childIndex = elementIndexMap.get(childElement);
        if (childIndex === undefined) return;

        flushPendingText();
        const childId = id ? id + '-' + childIndex : String(childIndex);
        const childNode = buildTreeNode(childElement, childId);
        if (childNode) children.push(childNode);
      });

      flushPendingText();

      const afterContent = getPseudoContent(element, '::after');
      if (afterContent) {
        children.push(makePseudoNode(id, '::after', truncateText(afterContent)));
      }
    }

    const inlineText = isAtomicElement ? '' : truncateText(getInlineText(element));

    return {
      tagName,
      elementId: id,
      domId: element.id || '',
      classList: Array.from(element.classList),
      children,
      hasText: !!inlineText,
      textContent: inlineText
    };
  }

  function buildTree() {
    const result = [];
    const rootChildren = getMeaningfulChildren(document.body);
    rootChildren.forEach((child, index) => {
      const node = buildTreeNode(child, String(index));
      if (node) result.push(node);
    });
    return result;
  }

  function postTree() {
    const tree = buildTree();
    window.parent.postMessage({ type: 'element-tree', tree }, '*');
  }

  let treeUpdateTimer = null;

  function scheduleTreeUpdate() {
    if (treeUpdateTimer) {
      clearTimeout(treeUpdateTimer);
    }
    treeUpdateTimer = setTimeout(postTree, 120);
  }

  function shouldUpdateTree(mutations) {
    return mutations.some(mutation => {
      if (mutation.type === 'attributes') {
        const attr = mutation.attributeName || '';
        return !HIGHLIGHT_ATTRS.includes(attr);
      }
      return true;
    });
  }

  // Remove all highlights
  function clearHighlights() {
    document.querySelectorAll('[data-editor-highlight]').forEach(el => {
      el.style.cssText = el.dataset.originalStyle || '';
      delete el.dataset.editorHighlight;
      delete el.dataset.originalStyle;
    });
  }

  // Highlight element by ID
  function highlightById(id, isSelected) {
    clearHighlights();
    if (!id) return;

    const el = getElementById(id);
    if (el) {
      el.dataset.originalStyle = el.style.cssText;
      el.dataset.editorHighlight = 'true';
      el.style.cssText += isSelected ? selectedStyle : highlightStyle;
    } else {
      console.warn('[Highlight] Element not found for ID:', id);
    }
  }

  // Handle mouse events
  function handleMouseMove(e) {
    if (!selectionMode) return;

    const el = e.target;
    if (el === document.body || el === document.documentElement) return;
    if (SKIP_TAGS.includes(el.tagName.toLowerCase())) return;

    const id = getElementId(el);
    window.parent.postMessage({ type: 'element-hover', id }, '*');
  }

  function handleClick(e) {
    if (!selectionMode) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    if (SKIP_TAGS.includes(el.tagName.toLowerCase())) return;

    // Allow body selection (P3 fix)
    if (el === document.body || el === document.documentElement) {
      window.parent.postMessage({
        type: 'element-select',
        id: 'body',
        html: '<body>...</body>',
        cssSelector: 'body'
      }, '*');
      return;
    }

    const id = getElementId(el);
    const html = el.outerHTML.substring(0, 500);
    const cssSelector = generateCssSelector(el);
    window.parent.postMessage({ type: 'element-select', id, html, cssSelector }, '*');
  }

  function handleMouseLeave() {
    if (selectionMode) {
      window.parent.postMessage({ type: 'element-hover', id: null }, '*');
    }
  }

  // Listen for messages from parent
  window.addEventListener('message', function(e) {
    if (e.data.type === 'set-selection-mode') {
      selectionMode = e.data.enabled;
      document.body.style.cursor = selectionMode ? 'crosshair' : '';
      if (!selectionMode) {
        clearHighlights();
      }
    } else if (e.data.type === 'highlight-element') {
      highlightById(e.data.id, e.data.isSelected);
    } else if (e.data.type === 'clear-highlights') {
      clearHighlights();
    } else if (e.data.type === 'request-element-tree') {
      postTree();
    } else if (e.data.type === 'get-element-info') {
      // P1 fix: Return element info for tree selection
      const el = getElementById(e.data.id);
      if (el) {
        // Scroll element into view (smooth scroll, centered)
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        window.parent.postMessage({
          type: 'element-info',
          id: e.data.id,
          html: el.outerHTML.substring(0, 500),
          cssSelector: generateCssSelector(el)
        }, '*');
      }
    }
  });

  // Attach event listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mouseleave', handleMouseLeave, true);

  const observer = new MutationObserver((mutations) => {
    if (!shouldUpdateTree(mutations)) return;
    scheduleTreeUpdate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

  // Signal ready + send initial tree
  window.parent.postMessage({ type: 'editor-ready' }, '*');
  postTree();
})();
</script>
`;

// Inject script before closing body tag
function injectEditorScript(html: string): string {
  if (html.includes('</body>')) {
    return html.replace('</body>', INJECTION_SCRIPT + '</body>');
  }
  return html + INJECTION_SCRIPT;
}

// Preview iframe with element selection support
const SelectablePreview = memo(({
  html,
  viewMode,
  selectionMode,
  selectedId,
  hoveredId,
  onReady,
  onHover,
  onSelect,
  onTreeUpdate,
  onElementInfo,
  iframeRef: externalIframeRef
}: {
  html: string;
  viewMode: 'desktop' | 'mobile';
  selectionMode: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  onReady: () => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string, html: string, cssSelector?: string) => void;
  onTreeUpdate: (tree: ElementTreeNode[]) => void;
  onElementInfo: (id: string, html: string, cssSelector: string) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) => {
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = externalIframeRef || internalIframeRef;
  const [isReady, setIsReady] = useState(false);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!iframeRef.current?.contentWindow || e.source !== iframeRef.current.contentWindow) {
        return;
      }

      if (e.data.type === 'editor-ready') {
        setIsReady(true);
        onReady();
      } else if (e.data.type === 'element-hover') {
        onHover(e.data.id);
      } else if (e.data.type === 'element-select') {
        onSelect(e.data.id, e.data.html, e.data.cssSelector);
      } else if (e.data.type === 'element-tree') {
        onTreeUpdate(e.data.tree || []);
      } else if (e.data.type === 'element-info') {
        // Response from get-element-info request (for tree selection)
        onElementInfo(e.data.id, e.data.html, e.data.cssSelector);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef, onReady, onHover, onSelect, onTreeUpdate, onElementInfo]);

  // Send selection mode to iframe
  useEffect(() => {
    if (isReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'set-selection-mode',
        enabled: selectionMode
      }, '*');

      // P2 fix: Re-apply highlight when exiting selection mode if element is selected
      if (!selectionMode && selectedId) {
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'highlight-element',
            id: selectedId.split('~')[0], // Use base ID
            isSelected: true
          }, '*');
        }, 50);
      }
    }
  }, [iframeRef, selectionMode, isReady, selectedId]);

  useEffect(() => {
    if (isReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'request-element-tree'
      }, '*');
    }
  }, [iframeRef, isReady, html]);

  // Send highlight commands to iframe
  useEffect(() => {
    if (isReady && iframeRef.current?.contentWindow) {
      const id = selectedId || hoveredId;
      if (id) {
        iframeRef.current.contentWindow.postMessage({
          type: 'highlight-element',
          id,
          isSelected: !!selectedId && id === selectedId
        }, '*');
      } else {
        iframeRef.current.contentWindow.postMessage({
          type: 'clear-highlights'
        }, '*');
      }
    }
  }, [iframeRef, selectedId, hoveredId, isReady]);

  const injectedHtml = injectEditorScript(html);

  if (viewMode === 'mobile') {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          style={{ width: 430, height: 932, transform: 'scale(0.9)' }}
          className="relative bg-black rounded-[60px] shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] border-[12px] border-[#1a1a1a] ring-1 ring-[#333] overflow-hidden flex flex-col"
        >
          {/* Hardware Buttons */}
          <div className="absolute top-[120px] -left-[16px] w-[4px] h-[26px] bg-[#2a2a2a] rounded-l-[2px]" />
          <div className="absolute top-[170px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]" />
          <div className="absolute top-[240px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]" />
          <div className="absolute top-[190px] -right-[16px] w-[4px] h-[80px] bg-[#2a2a2a] rounded-r-[2px]" />

          {/* Status Bar */}
          <div className="w-full h-[54px] px-7 flex justify-between items-center z-40 text-white pointer-events-none bg-black shrink-0 relative">
            <span className="font-semibold text-[15px] tracking-wide pl-1">9:41</span>
            <div className="absolute left-1/2 -translate-x-1/2 top-[11px] w-[120px] h-[35px] bg-[#1a1a1a] rounded-[20px] z-50 flex items-center justify-center gap-5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] shadow-[inset_0_0_2px_1px_rgba(50,20,20,0.5)] opacity-80" />
              <div className="w-3 h-3 rounded-full bg-[#08081a] shadow-[inset_0_0_4px_2px_rgba(60,70,120,0.6)] ring-[0.5px] ring-white/5" />
            </div>
            <div className="flex items-center gap-2 pr-1">
              <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" className="opacity-90">
                <path d="M1 9C1 9.55 1.45 10 2 10H14C14.55 10 15 9.55 15 9V3C15 2.45 14.55 2 14 2H2C1.45 2 1 2.45 1 3V9ZM2 11C0.9 11 0 10.1 0 9V3C0 1.9 0.9 1 2 1H14C15.1 1 16 1.9 16 3V9C16 10.1 15.1 11 14 11H2ZM16.5 4.5V7.5C17.33 7.5 18 6.83 18 6C18 5.17 17.33 4.5 16.5 4.5Z" />
                <rect x="2" y="3" width="11" height="6" rx="1" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <iframe
            ref={iframeRef}
            srcDoc={injectedHtml}
            className="flex-1 w-full border-none bg-[#09090b]"
            title="Screen Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    );
  }

  // Desktop view - fullscreen without browser chrome
  return (
    <iframe
      ref={iframeRef}
      srcDoc={injectedHtml}
      className="h-full w-full border-none bg-white"
      title="Screen Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
});

SelectablePreview.displayName = 'SelectablePreview';

const ScreenEditor = memo(({
  screenId,
  screenLabel,
  html,
  viewMode,
  isEditing,
  hasPendingChanges,
  editsData,
  onClose,
  onEdit,
  onSave,
  onDiscard,
  onCancelEdit
}: ScreenEditorProps) => {
  const [editInput, setEditInput] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedHtml, setSelectedHtml] = useState<string | null>(null);
  const [selectedCssSelector, setSelectedCssSelector] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [elementTree, setElementTree] = useState<ElementTreeNode[] | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(342);
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sidebar resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    // Prevent text selection and set cursor during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(e.clientX, 200), 800);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleReady = useCallback(() => {
    // Iframe is ready
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setElementTree(null);
    });
    return () => cancelAnimationFrame(rafId);
  }, [html]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const handleSelect = useCallback((id: string, elementHtml: string, cssSelector?: string) => {
    setSelectedId(id);
    setSelectedHtml(elementHtml);
    setSelectedCssSelector(cssSelector || null);
    setSelectionMode(false);
    inputRef.current?.focus();
  }, []);

  const handleTreeUpdate = useCallback((tree: ElementTreeNode[]) => {
    setElementTree(tree);
  }, []);

  const handleTreeHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const handleTreeSelect = useCallback((id: string) => {
    // Extract base ID (without ~ suffix for text/pseudo elements)
    const baseId = id.split('~')[0];
    setSelectedId(id);

    // Request element info from iframe (P1 fix)
    if (iframeRef.current?.contentWindow && baseId) {
      iframeRef.current.contentWindow.postMessage({
        type: 'get-element-info',
        id: baseId
      }, '*');
    }
  }, []);

  const normalizeElementId = useCallback((id: string | null) => {
    if (!id) return null;
    return id.split('~')[0];
  }, []);

  const handleSubmit = useCallback(() => {
    if (editInput.trim()) {
      const baseId = normalizeElementId(selectedId);
      onEdit(
        screenId,
        editInput.trim(),
        baseId || undefined,
        selectedCssSelector || undefined,
        selectedHtml || undefined
      );
      setEditInput('');
      setSelectedId(null);
      setSelectedHtml(null);
      setSelectedCssSelector(null);
    }
  }, [screenId, editInput, selectedId, selectedCssSelector, selectedHtml, onEdit, normalizeElementId]);

  const handleClearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedHtml(null);
    setSelectedCssSelector(null);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
  }, []);

  // Get a display label for the selected element
  const getSelectedLabel = useCallback((id: string) => {
    const [baseId, suffix] = id.split('~');
    const parts = baseId.split('-');
    const baseLabel = `Element ${parts.join('.')}`;
    if (!suffix) return baseLabel;
    if (suffix.startsWith('text')) return `${baseLabel} (text)`;
    if (suffix === 'before') return `${baseLabel} (::before)`;
    if (suffix === 'after') return `${baseLabel} (::after)`;
    return `${baseLabel} (${suffix})`;
  }, []);

  // Handle element info response from iframe (for tree selection)
  const handleElementInfo = useCallback((id: string, elementHtml: string, cssSelector: string) => {
    setSelectedHtml(elementHtml);
    setSelectedCssSelector(cssSelector);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-12 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm font-medium">{screenLabel}</span>
          {selectionMode && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              Selection Mode - Click an element
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Edits remaining counter */}
          {editsData && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] rounded-lg border border-[#3e3e42]">
              <div className={`w-2 h-2 rounded-full ${
                editsData.remaining === -1
                  ? 'bg-emerald-400'
                  : editsData.remaining > 10
                    ? 'bg-emerald-400'
                    : editsData.remaining > 0
                      ? 'bg-amber-400'
                      : 'bg-red-400'
              }`} />
              <span className="text-[11px] text-zinc-400">
                {editsData.remaining === -1
                  ? 'Unlimited edits'
                  : `${editsData.remaining} edit${editsData.remaining !== 1 ? 's' : ''} left`
                }
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            title="Close Editor"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Resize Overlay - blocks iframe from capturing mouse events */}
      {isResizing && (
        <div className="fixed inset-0 z-[100] cursor-col-resize" />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Element Tree + Edit Input */}
        <div
          className="bg-[#1a1a1a] flex flex-col shrink-0 border-r border-[#3e3e42] relative"
          style={{ width: sidebarWidth }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 -right-px w-[3px] h-full cursor-col-resize z-10 group"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[#3e3e42] group-hover:bg-white/40 transition-colors" />
          </div>
          {/* Tree Section */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 custom-scrollbar">
            <ElementTree
              tree={elementTree}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={handleTreeSelect}
              onHover={handleTreeHover}
            />
          </div>

          {/* Edit Input Section */}
          <div className="p-4 bg-[#1a1a1a] shrink-0 space-y-3">
            {/* Selected Element Badge */}
            {selectedId && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                <Crosshair size={12} className="text-green-400 shrink-0" />
                <span className="text-[11px] font-mono text-green-400 truncate flex-1">
                  {getSelectedLabel(selectedId)}
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-green-400 hover:text-green-300 p-0.5 rounded hover:bg-green-500/20 transition-colors shrink-0"
                  title="Clear selection"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="relative">
              <button
                onClick={toggleSelectionMode}
                className={`absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded transition-all cursor-pointer ${
                  selectionMode
                    ? 'bg-blue-500 text-white'
                    : 'text-zinc-500 hover:text-white hover:bg-[#3e3e42]'
                }`}
                title={selectionMode ? 'Cancel selection' : 'Select element'}
              >
                <Crosshair size={14} />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                placeholder="Describe your edit..."
                className="w-full bg-[#252526] border border-[#3e3e42] text-[11px] text-[#d4d4d4] rounded-lg py-2.5 pl-11 pr-10 focus:outline-none focus:border-[#007acc] transition-all placeholder:text-[#52525b]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isEditing) {
                    handleSubmit();
                  }
                }}
                disabled={isEditing}
              />

              {isEditing ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <button
                    onClick={onCancelEdit}
                    className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-[#3e3e42] transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!editInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-600 hover:text-blue-400 disabled:text-zinc-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Send"
                >
                  <Send size={16} />
                </button>
              )}
            </div>

            {/* Save/Discard buttons */}
            {hasPendingChanges && (
              <div className="flex gap-2">
                <button
                  onClick={() => onDiscard(screenId)}
                  className="flex-1 py-2.5 text-[11px] font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={() => onSave(screenId)}
                  className="flex-1 py-2.5 text-[11px] font-medium text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 overflow-hidden bg-[#0a0a0a]">
          <SelectablePreview
            html={html}
            viewMode={viewMode}
            selectionMode={selectionMode}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onReady={handleReady}
            onHover={handleHover}
            onSelect={handleSelect}
            onTreeUpdate={handleTreeUpdate}
            onElementInfo={handleElementInfo}
            iframeRef={iframeRef}
          />
        </div>
      </div>
    </div>
  );
});

ScreenEditor.displayName = 'ScreenEditor';

export default ScreenEditor;
