interface TreeEntry {
  path: string;
  size?: number;
}

interface TreeNode {
  children: Map<string, TreeNode>;
  name: string;
  path: string;
  size?: number;
  type: "file" | "folder";
}

interface SkillFileTreeRow {
  depth: number;
  isActive: boolean;
  name: string;
  path: string;
  size?: number;
  type: "file" | "folder";
}

export const buildFileTreeRows = (entries: TreeEntry[], activePath: string) => {
  const root: TreeNode = {
    children: new Map(),
    name: "",
    path: "",
    type: "folder",
  };

  for (const entry of [...entries].toSorted((left, right) => left.path.localeCompare(right.path))) {
    const segments = entry.path.split("/").filter(Boolean);
    let currentNode = root;
    let currentPath = "";

    for (const [index, segment] of segments.entries()) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const type = index === segments.length - 1 ? "file" : "folder";
      const existing = currentNode.children.get(segment);

      if (existing) {
        currentNode = existing;
        continue;
      }

      const nextNode: TreeNode = {
        children: new Map(),
        name: segment,
        path: currentPath,
        size: type === "file" ? entry.size : undefined,
        type,
      };
      currentNode.children.set(segment, nextNode);
      currentNode = nextNode;
    }
  }

  const rows: SkillFileTreeRow[] = [];

  const visit = (node: TreeNode, depth: number) => {
    const folders: TreeNode[] = [];
    const files: TreeNode[] = [];

    for (const child of [...node.children.values()].toSorted((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (child.type === "folder") {
        folders.push(child);
      } else {
        files.push(child);
      }
    }

    for (const folder of folders) {
      rows.push({
        depth,
        isActive: false,
        name: folder.name,
        path: folder.path,
        type: "folder",
      });
      visit(folder, depth + 1);
    }

    for (const file of files) {
      rows.push({
        depth,
        isActive: file.path === activePath,
        name: file.name,
        path: file.path,
        size: file.size,
        type: "file",
      });
    }
  };

  visit(root, 0);

  return rows;
};
