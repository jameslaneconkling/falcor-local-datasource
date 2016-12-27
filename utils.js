// TODO:
// * add type defs
// * test these against refs
const collapse = require('falcor-path-utils').collapse;


const range = (from = 0, to) => {
  const list = [];
  while (from <= to) {
    list.push(from++);
  }
  return list;
};


const isPathValues = pathValues =>
  pathValues.reduce((result, pathValue) =>
    result && Array.isArray(pathValue.path) && typeof pathValue.value !== 'undefined',
  true);


const isJSONGraphEnvelope = JSONGraphEnvelope =>
  typeof JSONGraphEnvelope.jsonGraph === 'object' && Array.isArray(JSONGraphEnvelope.paths);


const walkTree = (path, tree) => {
  if (path.length === 1) {
    return tree[path[0]];
  }
  if (tree[path[0]]) {
    return walkTree(path.slice(1), tree[path[0]]);
  }
  return undefined;
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


const expandPath = pathOrPathSet => {
  return pathOrPathSet.reduce((paths, keyOrKeySet) => {
    if (Array.isArray(keyOrKeySet)) {
      // keySet, e.g. ['name', 'age']
      return keyOrKeySet.reduce((expandedPaths, key) =>
        [...expandedPaths, ...paths.map(path => [...path, key])],
      []);
    } else if (typeof keyOrKeySet === 'object') {
      // range, e.g. [{ from: 1, to: 3 }]
      return range(keyOrKeySet.from, keyOrKeySet.to).reduce((expandedPaths, key) =>
        [...expandedPaths, ...paths.map(path => [...path, key])],
      []);
    }
    // key
    return paths.map(path => [...path, keyOrKeySet]);
  }, [[]]);
};


const expandPaths = paths => {
  return paths.reduce((expandedPaths, path) => [...expandedPaths, ...expandPath(path)], []);
};


// NOTE - target/source can still reference nested objects in output
// NOTE - won't recursively merge arrays
const mergeTrees = (target, source) => {
  return Object.keys(source).reduce((merged, sourceKey) => {
    const sourceValue = source[sourceKey];

    if ((Array.isArray(sourceValue) || typeof sourceValue !== 'object') || !(sourceKey in target)) {
      // base case 1: sourceValue is an array or non-object primitive
      // base case 2: sourceKey does not exist in target
      return Object.assign({}, merged, { [sourceKey]: sourceValue });
    } else {
      return Object.assign({}, merged, { [sourceKey]: mergeTrees(merged[sourceKey], sourceValue) });
    }
  }, target);
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
  // TODO - if extractPathFromTree could handle pathSets, rather than just paths,
  // we could drop the expandPaths call and reduce the number of potential recursive
  // passes through the graph
  return expandPaths(paths).reduce((subTree, path) => {
    return mergeTrees(subTree, extractPathFromTree(path, tree));
  }, {});
};

module.exports.walkTree = walkTree;
module.exports.isPathValues = isPathValues;
module.exports.isJSONGraphEnvelope = isJSONGraphEnvelope;
module.exports.pathValue2Tree = pathValue2Tree;
module.exports.pathValues2JSONGraphEnvelope = pathValues2JSONGraphEnvelope;
module.exports.expandPath = expandPath;
module.exports.expandPaths = expandPaths;
module.exports.mergeTrees = mergeTrees;
module.exports.extractPathFromTree = extractPathFromTree;
module.exports.extractPathsFromTree = extractPathsFromTree;
