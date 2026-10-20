interface LexicalNode {
  type: string;
  text?: string;
  version?: number;
  children?: LexicalNode[];
}

const PLACEHOLDER = /\{\{([^}]+)\}\}/g;

/** Nodes whose children are text read as lines, split by line breaks. */
const LINE_CONTAINERS = new Set(['paragraph', 'heading', 'listitem', 'quote']);

const placeholdersIn = (nodes: LexicalNode[]): string[] =>
  nodes.flatMap((node) =>
    node.type === 'text' && typeof node.text === 'string'
      ? [...node.text.matchAll(PLACEHOLDER)].map((match) => (match[1] ?? '').trim())
      : placeholdersIn(node.children ?? []),
  );

const splitLines = (nodes: LexicalNode[]): LexicalNode[][] => {
  const lines: LexicalNode[][] = [[]];
  for (const node of nodes) {
    if (node.type === 'linebreak') lines.push([]);
    else lines.at(-1)?.push(node);
  }
  return lines;
};

/**
 * Leaves out every line of a mail message whose placeholders all name questions the person
 * left unanswered, most often because they sat in a branch of the form the person never saw.
 *
 * An editor can then write one mail for every branch, with a line like
 * `Pioniertechnik: {{pioniertechnik}}` that only people who answered it get. A line without
 * placeholders stays, so does a placeholder that is no question of the form, like a typo,
 * which the editor should see. A paragraph or list goes only when this emptied it; an empty
 * paragraph the editor wrote as spacing stays.
 */
export const dropUnansweredLines = (
  root: LexicalNode,
  isUnanswered: (name: string) => boolean,
): void => {
  /** Whether the node still has something to show. */
  const visit = (node: LexicalNode): boolean => {
    if (!Array.isArray(node.children) || node.children.length === 0) return true;

    if (LINE_CONTAINERS.has(node.type)) {
      const lines = splitLines(node.children);
      const kept = lines.filter((line) => {
        const names = placeholdersIn(line);
        return names.length === 0 || !names.every((name) => isUnanswered(name));
      });
      if (kept.length === lines.length) return true;
      node.children = kept.flatMap((line, index) => [
        ...(index === 0 ? [] : [{ type: 'linebreak', version: 1 }]),
        ...line,
      ]);
      return kept.length > 0;
    }

    node.children = node.children.filter((child) => visit(child));
    return node.children.length > 0;
  };

  visit(root);
};
