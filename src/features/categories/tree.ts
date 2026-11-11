import type { CategoryNode } from './api';

/** How deep categories can nest. It mirrors the backend's limit as a hint; the backend decides. */
export const maxDepth = 3;

/** The number of levels a category and its subcategories take up. */
function levels(category: CategoryNode): number {
  return 1 + Math.max(0, ...category.children.map(levels));
}

/**
 * The categories that can be the parent of `category`, or of a new one, labelled with their
 * path. A category cannot move under itself or its subcategories, or past `maxDepth`.
 */
export function parentOptions(tree: CategoryNode[], category?: CategoryNode) {
  const ownLevels = category ? levels(category) : 1;
  const options: { id: string; label: string }[] = [];

  function visit(nodes: CategoryNode[], path: string[]) {
    for (const node of nodes) {
      // Skipping the category also skips everything below it.
      if (node.id === category?.id) continue;

      const names = [...path, node.name];
      if (names.length + ownLevels <= maxDepth) {
        options.push({ id: node.id, label: names.join(' › ') });
      }
      visit(node.children, names);
    }
  }

  visit(tree, []);
  return options;
}
