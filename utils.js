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

const extractSubTree = (paths, tree) => {};

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
module.exports.pathValue2Tree = pathValue2Tree;
module.exports.pathValues2JSONGraphEnvelope = pathValues2JSONGraphEnvelope;
