/**
 * Utilities for handling element IDs in the visual editor
 * Element IDs use the format: "0-1-2" for DOM path, with optional "~suffix" for special nodes
 * - "0-1-2" = 3rd child of 2nd child of 1st child of body
 * - "0-1~text0" = 1st text node in element 0-1
 * - "0-1~before" = ::before pseudo-element of 0-1
 * - "0-1~after" = ::after pseudo-element of 0-1
 */

/**
 * Normalize element ID by removing the ~ suffix (for text nodes and pseudo-elements)
 * @param id - Element ID like "0-1-2" or "0-1~text0"
 * @returns Base ID without suffix, or null if input is null/undefined
 */
export function normalizeElementId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.split('~')[0];
}

/**
 * Check if an element ID represents a text node
 * @param id - Element ID
 * @returns true if the ID is for a text node
 */
export function isTextNode(id: string): boolean {
  return id.includes('~text');
}

/**
 * Check if an element ID represents a pseudo-element (::before or ::after)
 * @param id - Element ID
 * @returns true if the ID is for a pseudo-element
 */
export function isPseudoElement(id: string): boolean {
  return id.includes('~before') || id.includes('~after');
}

/**
 * Check if an element ID represents a non-targetable element
 * Non-targetable elements are text nodes and pseudo-elements that can't be
 * directly selected in the DOM, only their parent can be targeted.
 * @param id - Element ID
 * @returns true if the element is non-targetable
 */
export function isNonTargetable(id: string): boolean {
  return isTextNode(id) || isPseudoElement(id);
}

/**
 * Get the content type suffix from an element ID
 * @param id - Element ID
 * @returns 'text' | 'before' | 'after' | null
 */
export function getContentType(id: string): 'text' | 'before' | 'after' | null {
  if (!id.includes('~')) return null;
  const suffix = id.split('~')[1];
  if (suffix?.startsWith('text')) return 'text';
  if (suffix === 'before') return 'before';
  if (suffix === 'after') return 'after';
  return null;
}

/**
 * Get the parent element ID from a given ID
 * @param id - Element ID like "0-1-2"
 * @returns Parent ID like "0-1", or null if already at root
 */
export function getParentId(id: string): string | null {
  const baseId = normalizeElementId(id);
  if (!baseId) return null;

  const parts = baseId.split('-');
  if (parts.length <= 1) return null;

  return parts.slice(0, -1).join('-');
}

/**
 * Get the depth of an element in the tree
 * @param id - Element ID
 * @returns Depth level (0 for root children, 1 for their children, etc.)
 */
export function getElementDepth(id: string): number {
  const baseId = normalizeElementId(id);
  if (!baseId) return 0;
  return baseId.split('-').length - 1;
}
