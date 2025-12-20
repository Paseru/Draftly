/**
 * Patch utilities for applying JSON patches to HTML documents
 * Used by the LLM Patch Mode feature for screen editing
 */

export interface PatchOperation {
  action: 'replace' | 'insertAfter' | 'insertBefore' | 'delete' | 'setAttribute' | 'appendChild' | 'prependChild';
  selector: string;
  oldHtml?: string;      // For replace (optional, for verification)
  newHtml?: string;      // For replace, insertAfter, insertBefore, appendChild, prependChild
  attribute?: string;    // For setAttribute
  value?: string;        // For setAttribute
}

export interface PatchResponse {
  patches: PatchOperation[];
  explanation: string;
}

export interface PatchResult {
  success: boolean;
  html: string;
  appliedPatches: number;
  errors: string[];
}

/**
 * Applies a list of JSON patches to an HTML document
 * Uses DOMParser to parse HTML and modify the DOM
 *
 * @param html - The full HTML document string
 * @param patches - Array of patch operations to apply
 * @returns PatchResult with the modified HTML and status info
 */
export function applyPatches(html: string, patches: PatchOperation[]): PatchResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const errors: string[] = [];
  let appliedPatches = 0;

  for (const patch of patches) {
    try {
      const element = doc.querySelector(patch.selector);

      if (!element) {
        errors.push(`Selector not found: "${patch.selector}"`);
        continue;
      }

      switch (patch.action) {
        case 'replace':
          if (patch.newHtml) {
            element.outerHTML = patch.newHtml;
            appliedPatches++;
          } else {
            errors.push(`Missing newHtml for replace action on "${patch.selector}"`);
          }
          break;

        case 'insertAfter':
          if (patch.newHtml) {
            element.insertAdjacentHTML('afterend', patch.newHtml);
            appliedPatches++;
          } else {
            errors.push(`Missing newHtml for insertAfter action on "${patch.selector}"`);
          }
          break;

        case 'insertBefore':
          if (patch.newHtml) {
            element.insertAdjacentHTML('beforebegin', patch.newHtml);
            appliedPatches++;
          } else {
            errors.push(`Missing newHtml for insertBefore action on "${patch.selector}"`);
          }
          break;

        case 'delete':
          element.remove();
          appliedPatches++;
          break;

        case 'setAttribute':
          if (patch.attribute && patch.value !== undefined) {
            element.setAttribute(patch.attribute, patch.value);
            appliedPatches++;
          } else {
            errors.push(`Missing attribute or value for setAttribute action on "${patch.selector}"`);
          }
          break;

        case 'appendChild':
          if (patch.newHtml) {
            // Insert as last child of the container, but BEFORE any fixed/sticky elements
            const children = Array.from(element.children);
            const fixedChild = children.find(child => {
              const style = (child as HTMLElement).style;
              const classList = (child as HTMLElement).className || '';
              // Check for fixed positioning (inline style or common Tailwind classes)
              return style.position === 'fixed' ||
                     style.position === 'sticky' ||
                     classList.includes('fixed') ||
                     classList.includes('sticky') ||
                     classList.includes('bottom-0');
            });

            if (fixedChild) {
              // Insert before the first fixed element
              fixedChild.insertAdjacentHTML('beforebegin', patch.newHtml);
            } else {
              // No fixed elements, append at the end
              element.insertAdjacentHTML('beforeend', patch.newHtml);
            }
            appliedPatches++;
          } else {
            errors.push(`Missing newHtml for appendChild action on "${patch.selector}"`);
          }
          break;

        case 'prependChild':
          if (patch.newHtml) {
            // Insert as first child of the container, but AFTER any fixed/sticky header elements
            const children = Array.from(element.children);
            const firstNonFixedChild = children.find(child => {
              const style = (child as HTMLElement).style;
              const classList = (child as HTMLElement).className || '';
              // Check if NOT a fixed header (fixed + top positioning)
              const isFixedTop = (style.position === 'fixed' || classList.includes('fixed')) &&
                                 (style.top !== '' || classList.includes('top-0'));
              return !isFixedTop;
            });

            if (firstNonFixedChild) {
              // Insert before the first non-fixed element
              firstNonFixedChild.insertAdjacentHTML('beforebegin', patch.newHtml);
            } else {
              // All children are fixed headers, prepend at the start
              element.insertAdjacentHTML('afterbegin', patch.newHtml);
            }
            appliedPatches++;
          } else {
            errors.push(`Missing newHtml for prependChild action on "${patch.selector}"`);
          }
          break;

        default:
          errors.push(`Unknown action: ${(patch as PatchOperation).action}`);
      }
    } catch (e) {
      errors.push(`Error applying patch for "${patch.selector}": ${String(e)}`);
    }
  }

  // Serialize the modified document
  // Reconstruct full HTML with doctype
  const doctype = '<!DOCTYPE html>';
  const htmlElement = doc.documentElement;
  const serializedHtml = htmlElement.outerHTML;

  return {
    success: errors.length === 0,
    html: doctype + '\n' + serializedHtml,
    appliedPatches,
    errors,
  };
}

/**
 * Preview patches without applying them (for UI display)
 *
 * @param html - The HTML document to preview patches on
 * @param patches - Array of patch operations
 * @returns Information about which elements would be affected
 */
export function previewPatches(html: string, patches: PatchOperation[]): {
  affectedElements: Array<{ selector: string; action: string; found: boolean; preview: string }>;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const affectedElements: Array<{ selector: string; action: string; found: boolean; preview: string }> = [];

  for (const patch of patches) {
    const element = doc.querySelector(patch.selector);
    affectedElements.push({
      selector: patch.selector,
      action: patch.action,
      found: !!element,
      preview: element
        ? element.outerHTML.substring(0, 100) + (element.outerHTML.length > 100 ? '...' : '')
        : 'Element not found',
    });
  }

  return { affectedElements };
}

/**
 * Parse a patch response from the LLM
 * Handles both JSON and markdown code blocks
 *
 * @param content - Raw LLM response content
 * @returns Parsed PatchResponse or null if parsing fails
 */
export function parsePatchResponse(content: string): PatchResponse | null {
  try {
    // Try to extract JSON from markdown code block
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to parse as raw JSON
    const rawJsonMatch = content.match(/\{[\s\S]*"patches"[\s\S]*\}/);
    if (rawJsonMatch) {
      return JSON.parse(rawJsonMatch[0]);
    }

    return null;
  } catch (e) {
    console.error('[parsePatchResponse] Failed to parse:', e);
    return null;
  }
}
