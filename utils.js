const collapse = require('falcor-path-utils').collapse;

const walkTree = (path, tree) => {
  if (path.length === 1) {
    return tree[path[0]];
  }
  if (tree[path[0]]) {
    return walkTree(path.slice(1), tree[path[0]]);
  }
  return undefined;
};

const extractPathFromTree = (path, tree = {}) => {
  if (path.length === 1) {
    // if tree does not terminate at a value, meaning path is incomplete,
    // or if tree does not contain path node, meaning path does not exist in tree
    // terminate the tree w/ an empty atom leaf node
    // otherwise, return value
    return {
      [path[0]]: (typeof tree[path[0]] === 'object' || typeof tree[path[0]] === 'undefined') ? { $type: 'atom' } : tree[path[0]]
    };
  }

  return { [path[0]]: extractPathFromTree(path.slice(1), tree[path[0]]) }
}

const extractPathsFromTree = (paths, tree) => {
  paths.forEach(path)
};

// TODO - make tail recursive?
const pathValue2Tree = (pathValue, tree = {}) => {
  if (pathValue.path.length === 1) {
    return Object.assign(tree, {
      [pathValue.path[0]]: pathValue.value
    });
  }

  return Object.assign(tree, {
    [pathValue.path[0]]: pathValue2Tree({ path: pathValue.path.slice(1), value: pathValue.value }, tree[pathValue.path[0]])
  });
};

const pathValues2JSONGraphEnvelope = pathValues => {
  const jsonGraph = pathValues.reduce((tree, pathValue) => pathValue2Tree(pathValue, tree), {});

  const paths = collapse(pathValues.map(pathValue => pathValue.path));

  return { jsonGraph, paths };
};

const expandPaths = paths => {};

module.exports.walkTree = walkTree;
module.exports.extractPathFromTree = extractPathFromTree;
module.exports.pathValue2Tree = pathValue2Tree;
module.exports.pathValues2JSONGraphEnvelope = pathValues2JSONGraphEnvelope;
