export function buildTree(pages) {
  const map = {};
  pages.forEach((page) => {
    map[page.id] = { ...page, children: [] };
  });

  const roots = [];

  pages.forEach((page) => {
    if (page.parentId && map[page.parentId]) {
      map[page.parentId].children.push(map[page.id]);
    } else {
      roots.push(map[page.id]);
    }
  });

  const sortNode = (node) => {
    node.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    node.children.forEach(sortNode);
    return node;
  };

  roots.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  roots.forEach(sortNode);
  return roots;
}

export function getBreadcrumb(pageId, pages) {
  const map = {};
  pages.forEach((page) => {
    map[page.id] = page;
  });

  const trail = [];
  let current = map[pageId];

  while (current) {
    trail.unshift(current);
    current = current.parentId ? map[current.parentId] : null;
  }

  return trail;
}
