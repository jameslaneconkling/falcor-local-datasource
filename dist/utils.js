'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var collapse = require('falcor-path-utils').collapse;

var range = function range() {
  var from = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var to = arguments[1];

  var list = [];
  while (from <= to) {
    list.push(from);
    from += 1;
  }
  return list;
};

var isPathValues = function isPathValues(pathValues) {
  return pathValues.reduce(function (result, pathValue) {
    return result && Array.isArray(pathValue.path) && typeof pathValue.value !== 'undefined';
  }, true);
};

var isJSONGraphEnvelope = function isJSONGraphEnvelope(JSONGraphEnvelope) {
  return _typeof(JSONGraphEnvelope.jsonGraph) === 'object' && Array.isArray(JSONGraphEnvelope.paths);
};

var walkTree = function walkTree(path, tree) {
  var graph = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : tree;

  if (path.length === 0) {
    return tree;
  } else if (path.length === 1) {
    return tree[path[0]];
  } else if (path[0] in tree && tree[path[0]].$type === 'ref') {
    // if encountering a ref, go back to the root graph and evaluate new path from there
    return walkTree([].concat(_toConsumableArray(tree[path[0]].value), _toConsumableArray(path.slice(1))), graph);
  } else if (path[0] in tree) {
    return walkTree(path.slice(1), tree[path[0]], graph);
  }
  return undefined;
};

var assocPath = function assocPath(path, value, target) {
  if (path.length === 1) {
    return Object.assign({}, target, _defineProperty({}, path[0], value));
  } else if (!(path[0] in target)) {
    return Object.assign({}, target, _defineProperty({}, path[0], assocPath(path.slice(1), value, {})));
  }

  return Object.assign({}, target, _defineProperty({}, path[0], assocPath(path.slice(1), value, target[path[0]])));
};

// TODO - make tail recursive?
var pathValue2Tree = function pathValue2Tree(pathValue) {
  var tree = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (pathValue.path.length === 1) {
    return Object.assign(tree, _defineProperty({}, pathValue.path[0], pathValue.value));
  }

  return Object.assign(tree, _defineProperty({}, pathValue.path[0], pathValue2Tree({ path: pathValue.path.slice(1), value: pathValue.value }, tree[pathValue.path[0]])));
};

var pathValues2JSONGraphEnvelope = function pathValues2JSONGraphEnvelope(pathValues) {
  return {
    jsonGraph: pathValues.reduce(function (tree, pathValue) {
      return pathValue2Tree(pathValue, tree);
    }, {}),
    paths: collapse(pathValues.map(function (pathValue) {
      return pathValue.path;
    }))
  };
};

var expandPath = function expandPath(pathOrPathSet) {
  return pathOrPathSet.reduce(function (paths, keyOrKeySet) {
    if (Array.isArray(keyOrKeySet)) {
      // keySet, e.g. ['name', 'age']
      return keyOrKeySet.reduce(function (expandedPaths, key) {
        return [].concat(_toConsumableArray(expandedPaths), _toConsumableArray(paths.map(function (path) {
          return [].concat(_toConsumableArray(path), [key]);
        })));
      }, []);
    } else if ((typeof keyOrKeySet === 'undefined' ? 'undefined' : _typeof(keyOrKeySet)) === 'object') {
      // range, e.g. [{ from: 1, to: 3 }]
      return range(keyOrKeySet.from, keyOrKeySet.to).reduce(function (expandedPaths, key) {
        return [].concat(_toConsumableArray(expandedPaths), _toConsumableArray(paths.map(function (path) {
          return [].concat(_toConsumableArray(path), [key]);
        })));
      }, []);
    }
    // key
    return paths.map(function (path) {
      return [].concat(_toConsumableArray(path), [keyOrKeySet]);
    });
  }, [[]]);
};

var expandPaths = function expandPaths(paths) {
  return paths.reduce(function (expandedPaths, path) {
    return [].concat(_toConsumableArray(expandedPaths), _toConsumableArray(expandPath(path)));
  }, []);
};

// NOTE - target/source can still reference nested objects in output
// NOTE - won't recursively merge arrays
var mergeTrees = function mergeTrees(target, source) {
  return Object.keys(source).reduce(function (merged, sourceKey) {
    var sourceValue = source[sourceKey];

    if (Array.isArray(sourceValue) || (typeof sourceValue === 'undefined' ? 'undefined' : _typeof(sourceValue)) !== 'object' || !(sourceKey in target)) {
      // base case 1: sourceValue is an array or non-object primitive
      // base case 2: sourceKey does not exist in target
      return Object.assign({}, merged, _defineProperty({}, sourceKey, sourceValue));
    }

    return Object.assign({}, merged, _defineProperty({}, sourceKey, mergeTrees(merged[sourceKey], sourceValue)));
  }, target);
};

// NOTE - target/source can still reference nested objects in output
// NOTE - won't recursively merge arrays
// TODO - this makes more recursive passes than necessary,
//        simplify by merging JSONGraphEnvelope into graph
var mergeGraphs = function mergeGraphs(target, source) {
  var targetPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  return Object.keys(source).reduce(function (merged, sourceKey) {
    var sourceValue = source[sourceKey];
    var subMerged = walkTree(targetPath, merged);

    if (Array.isArray(sourceValue) || (typeof sourceValue === 'undefined' ? 'undefined' : _typeof(sourceValue)) !== 'object' || !(sourceKey in subMerged)) {
      // base case 1: sourceValue is an array or non-object primitive
      // base case 2: sourceKey does not exist in target
      return assocPath([].concat(_toConsumableArray(targetPath), [sourceKey]), sourceValue, merged);
    } else if (subMerged[sourceKey].$type === 'ref' && sourceValue.$type !== 'ref') {
      // if encountering a ref, and sourceValue is not itself a ref, resolve
      // (if sourceValue _is_ a ref, it should replace the target ref)
      return mergeGraphs(merged, sourceValue, subMerged[sourceKey].value);
    }

    return mergeGraphs(merged, sourceValue, [].concat(_toConsumableArray(targetPath), [sourceKey]));
  }, target);
};

var extractSubTreeByPath = function extractSubTreeByPath(path) {
  var subTree = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var graph = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : subTree;

  if (path.length === 1) {
    // if subTree does not terminate at a value or sentinel, meaning path is incomplete
    // terminate w/ empty atom leaf node
    // if subTree does not contain path node, meaning path does not exist in subTree
    // terminate w/ error leaf node
    // otherwise, return value
    if (_typeof(subTree[path[0]]) === 'object' && !subTree[path[0]].$type) {
      return _defineProperty({}, path[0], { $type: 'atom', value: undefined });
    } else if (typeof subTree[path[0]] === 'undefined') {
      return _defineProperty({}, path[0], { $type: 'error', value: 'Node does not exist' });
    }

    return _defineProperty({}, path[0], subTree[path[0]]);
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
    return _defineProperty({}, path[0], extractSubTreeByPath(path.slice(1), walkTree(subTree[path[0]].value, graph), graph));
  }

  return _defineProperty({}, path[0], extractSubTreeByPath(path.slice(1), subTree[path[0]], graph));
};

// TODO - if extractSubTreeByPath could handle pathSets, rather than just paths,
// we could drop the expandPaths call and reduce the number of potential recursive
// passes through the graph
var extractSubTreeByPaths = function extractSubTreeByPaths(paths, graph) {
  return expandPaths(paths).reduce(function (subTree, path) {
    return mergeTrees(subTree, extractSubTreeByPath(path, graph));
  }, {});
};

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