const collapse = require('falcor-path-utils').collapse;


const range = (from = 0, to) => {
  const list = [];
  while (from <= to) {
    list.push(from);
    from += 1;
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
  if (path.length === 0) {
    return tree;
  } else if (path.length === 1) {
    return tree[path[0]];
  } else if (path[0] in tree) {
    return walkTree(path.slice(1), tree[path[0]]);
  }
  return undefined;
};


const assocPath = (path, value, target) => {
  if (path.length === 1) {
    return Object.assign({}, target, { [path[0]]: value });
  } else if (!(path[0] in target)) {
    return Object.assign({}, target, { [path[0]]: assocPath(path.slice(1), value, {}) });
  }

  return Object.assign({}, target, { [path[0]]: assocPath(path.slice(1), value, target[path[0]]) });
};


// TODO - make tail recursive?
const pathValue2Tree = (pathValue, tree = {}) => {
  if (pathValue.path.length === 1) {
    return Object.assign(tree, {
      [pathValue.path[0]]: pathValue.value
    });
  }

  return Object.assign(tree, {
    [pathValue.path[0]]: pathValue2Tree(
      { path: pathValue.path.slice(1), value: pathValue.value },
      tree[pathValue.path[0]]
    )
  });
};


const pathValues2JSONGraphEnvelope = pathValues => ({
  jsonGraph: pathValues.reduce((tree, pathValue) => pathValue2Tree(pathValue, tree), {}),
  paths: collapse(pathValues.map(pathValue => pathValue.path))
});


const expandPath = pathOrPathSet =>
  pathOrPathSet.reduce((paths, keyOrKeySet) => {
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


const expandPaths = paths =>
  paths.reduce((expandedPaths, path) => [...expandedPaths, ...expandPath(path)], []);


// NOTE - target/source can still reference nested objects in output
// NOTE - won't recursively merge arrays
const mergeTrees = (target, source) =>
  Object.keys(source).reduce((merged, sourceKey) => {
    const sourceValue = source[sourceKey];

    if ((Array.isArray(sourceValue) || typeof sourceValue !== 'object') || !(sourceKey in target)) {
      // base case 1: sourceValue is an array or non-object primitive
      // base case 2: sourceKey does not exist in target
      return Object.assign({}, merged, { [sourceKey]: sourceValue });
    }

    return Object.assign({}, merged, { [sourceKey]: mergeTrees(merged[sourceKey], sourceValue) });
  }, target);


// NOTE - target/source can still reference nested objects in output
// NOTE - won't recursively merge arrays
// TODO - this makes more recursive passes than necessary,
//        simplify by merging JSONGraphEnvelope into graph
const mergeGraphs = (target, source, targetPath = []) =>
  Object.keys(source).reduce((merged, sourceKey) => {
    const sourceValue = source[sourceKey];
    const subMerged = walkTree(targetPath, merged);

    if ((Array.isArray(sourceValue) || typeof sourceValue !== 'object') || !(sourceKey in subMerged)) {
      // base case 1: sourceValue is an array or non-object primitive
      // base case 2: sourceKey does not exist in target
      return assocPath([...targetPath, sourceKey], sourceValue, merged);
    } else if (subMerged[sourceKey].$type === 'ref' && sourceValue.$type !== 'ref') {
      // if encountering a ref, and sourceValue is not itself a ref, resolve
      // (if sourceValue _is_ a ref, it should replace the target ref)
      return mergeGraphs(merged, sourceValue, subMerged[sourceKey].value);
    }

    return mergeGraphs(merged, sourceValue, [...targetPath, sourceKey]);
  }, target);


const extractSubTreeByPath = (path, subTree = {}, graph = subTree) => {
  if (path.length === 1) {
    // if subTree does not terminate at a value or sentinel, meaning path is incomplete
    // terminate w/ empty atom leaf node
    // if subTree does not contain path node, meaning path does not exist in subTree
    // terminate w/ error leaf node
    // otherwise, return value
    if (typeof subTree[path[0]] === 'object' && !subTree[path[0]].$type) {
      return { [path[0]]: { $type: 'atom', value: undefined } };
    } else if (typeof subTree[path[0]] === 'undefined') {
      return { [path[0]]: { $type: 'error', value: 'Node does not exist' } };
    }

    return { [path[0]]: subTree[path[0]] };
  }

  // ***************************************************
  // NOTE - there is a difficult issue here: how to tell when a query overshoots
  // and should return the last value encountered,
  // vs. when the query asks for a resource that doesn't exist.
  //
  // e.g.
  // Overshooting: ['people', 0, 'name', 'x', 'y']
  // Should return: { people: { 0: { name: 'value' } } }
  //
  // Non-existent path: ['people', 100, 'name']
  // Should return: { people: { 100: { name: { $type: 'error' value: <errorMessage> } } } }
  // or maybe should return an empty atom, depending on the client expectation
  // ***************************************************
  // if next node is a value or an atom, and path has not yet terminated,
  // meaning path has overshot tree, don't continue walking tree and instead return value/atom
  // if (typeof subTree[path[0]] !== 'object' || subTree[path[0]].$type === 'atom') {
  //   return { [path[0]]: subTree[path[0]] };
  // }

  // if next key in path points to a ref, resolve ref
  if (subTree[path[0]] && subTree[path[0]].$type && subTree[path[0]].$type === 'ref') {
    return {
      [path[0]]: extractSubTreeByPath(path.slice(1), walkTree(subTree[path[0]].value, graph), graph)
    };
  }

  return {
    [path[0]]: extractSubTreeByPath(path.slice(1), subTree[path[0]], graph)
  };
};


// TODO - if extractSubTreeByPath could handle pathSets, rather than just paths,
// we could drop the expandPaths call and reduce the number of potential recursive
// passes through the graph
const extractSubTreeByPaths = (paths, graph) =>
  expandPaths(paths).reduce((subTree, path) => (
    mergeTrees(subTree, extractSubTreeByPath(path, graph))
  ), {});

module.exports.walkTree = walkTree;
module.exports.assocPath = assocPath;
module.exports.isPathValues = isPathValues;
module.exports.isJSONGraphEnvelope = isJSONGraphEnvelope;
module.exports.pathValue2Tree = pathValue2Tree;
module.exports.pathValues2JSONGraphEnvelope = pathValues2JSONGraphEnvelope;
module.exports.expandPath = expandPath;
module.exports.expandPaths = expandPaths;
module.exports.mergeTrees = mergeTrees;
module.exports.mergeGraphs = mergeGraphs;
module.exports.extractSubTreeByPath = extractSubTreeByPath;
module.exports.extractSubTreeByPaths = extractSubTreeByPaths;
