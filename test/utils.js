const tape = require('tape');
const walkTree = require('../utils').walkTree;
const pathValue2Tree = require('../utils').pathValue2Tree;
const pathValues2JSONGraphEnvelope = require('../utils').pathValues2JSONGraphEnvelope;
const expandPath = require('../utils').expandPath;
const expandPaths = require('../utils').expandPaths;
const mergeTrees = require('../utils').mergeTrees;
const extractSubTreeByPath = require('../utils').extractSubTreeByPath;
const extractSubTreeByPaths = require('../utils').extractSubTreeByPaths;


tape('walkTree - Should return the value in the tree at the specified value', t => {
  t.plan(1);

  const tree = {
    people: {
      '1': { name: 'Tom', age: 28 }
    }
  };
  const path = ['people', 1, 'name'];
  const expected = 'Tom';

  t.equal(walkTree(path, tree), expected);
});
tape('walkTree - Should return undefined if the path does exist in the tree', t => {
  t.plan(1);

  const tree = {
    people: {
      '1': { name: 'Tom', age: 28 }
    }
  };
  const path = ['people', 2, 'name'];
  const expected = undefined;

  t.equal(walkTree(path, tree), expected);
});


tape('pathValue2Tree - Should convert a pathValue to a tree', t => {
  t.plan(1);

  const pathValue = {
    path: ['people', 2, 'name'],
    value: 'Tom jr.'
  };
  const expected = {
    people: { 2: { name: 'Tom jr.' } }
  };

  t.deepEqual(pathValue2Tree(pathValue, {}), expected);
});
tape('pathValue2Tree - Should merge a pathValue into a non-overlapping tree', t => {
  t.plan(1);

  const pathValue = {
    path: ['people', 2, 'name'],
    value: 'Tom jr.'
  };
  const tree = {
    people: { 3: { name: 'Harry' } }
  };
  const expected = {
    people: {
      2: { name: 'Tom jr.' },
      3: { name: 'Harry' }
    }
  };

  t.deepEqual(pathValue2Tree(pathValue, tree), expected);
});
tape('pathValue2Tree - Should merge a pathValue into an overlapping tree', t => {
  t.plan(1);

  const pathValue = {
    path: ['people', 2, 'name'],
    value: 'Tom jr.'
  };
  const tree = {
    people: { 2: { age: 26 } }
  };
  const expected = {
    people: { 2: { name: 'Tom jr.', age: 26 } }
  };

  t.deepEqual(pathValue2Tree(pathValue, tree), expected);
});


tape('pathValues2JSONGraphEnvelope - Should convert multiple pathValues to a jsonGraphEnvelope', t => {
  t.plan(1);

  const pathValues = [
    {
      path: ['people', 2, 'name'],
      value: 'Tom jr.'
    },
    {
      path: ['people', 2, 'age'],
      value: 28
    },
    {
      path: ['people', 3, 'name'],
      value: 'Harry'
    }
  ];
  const expected = {
    jsonGraph: {
      people: {
        2: { name: 'Tom jr.', age: 28 },
        3: { name: 'Harry' }
      }
    },
    paths: [
      ['people', 2, ['age', 'name']], // todo, collapsed keySets probably don't guarantee order
      ['people', 3, 'name']
    ]
  };

  t.deepEqual(pathValues2JSONGraphEnvelope(pathValues), expected);
});


tape('expandPath - Should expand a simple path into a list of paths', t => {
  t.plan(1);

  const path = ['people', 1, 'age'];
  const expected = [['people', 1, 'age']];

  t.deepEqual(expandPath(path), expected);
});
tape('expandPath - Should expand a path with a single keySet of length 2 into a list of 2 paths', t => {
  t.plan(1);

  const path = ['people', 1, ['age', 'name']];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name']
  ];

  t.deepEqual(expandPath(path), expected);
});
tape('expandPath - Should expand a path with two keySets of length 2 and 3 into a list of 6 paths', t => {
  t.plan(1);

  const path = ['people', [1, 2, 4], ['age', 'name']];
  const expected = [
    ['people', 1, 'age'],
    ['people', 2, 'age'],
    ['people', 4, 'age'],
    ['people', 1, 'name'],
    ['people', 2, 'name'],
    ['people', 4, 'name']
  ];

  t.deepEqual(expandPath(path), expected);
});
tape('expandPath - Should expand a path with range from key into a list of paths', t => {
  t.plan(1);

  const path = ['people', {to: 2}, 'age'];
  const expected = [
    ['people', 0, 'age'],
    ['people', 1, 'age'],
    ['people', 2, 'age'],
  ];

  t.deepEqual(expandPath(path), expected);
});
tape('expandPath - Should expand a path with range and keySet into a list of paths', t => {
  t.plan(1);

  const path = ['people', { from: 1, to: 3 }, ['age', 'name']];
  const expected = [
    ['people', 1, 'age'],
    ['people', 2, 'age'],
    ['people', 3, 'age'],
    ['people', 1, 'name'],
    ['people', 2, 'name'],
    ['people', 3, 'name']
  ];

  t.deepEqual(expandPath(path), expected);
});


tape('expandPaths - Should expand two simple paths into a list of 2 paths', t => {
  t.plan(1);

  const paths = [
    ['people', 1, 'age'],
    ['people', 1, 'name']
  ];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name']
  ];

  t.deepEqual(expandPaths(paths), expected);
});
tape('expandPaths - Should expand two pathSets into a list of paths', t => {
  t.plan(1);

  const paths = [
    ['people', 1, ['age', 'name']],
    ['people', [3, 4], 'name']
  ];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name'],
    ['people', 3, 'name'],
    ['people', 4, 'name']
  ];

  t.deepEqual(expandPaths(paths), expected);
});
tape('expandPaths - Should expand two pathSets with ranges into a list of paths', t => {
  t.plan(1);

  const paths = [
    ['people', 1, ['age', 'name']],
    ['people', { from: 3, to: 4 }, 'name']
  ];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name'],
    ['people', 3, 'name'],
    ['people', 4, 'name']
  ];

  t.deepEqual(expandPaths(paths), expected);
});


tape('mergeTrees - Should merge two trees with disjoint leaf nodes', t => {
  t.plan(2);

  const target = {
    people: {
      1: { age: 26 },
      2: { name: 'Dick' }
    }
  };
  const source = {
    people: { 1: { name: 'Tom' } }
  };
  const expected = {
    people: {
      1: { name: 'Tom', age: 26 },
      2: { name: 'Dick' }
    }
  };

  t.deepEqual(mergeTrees(target, source), expected, 'merges small tree into large tree');
  t.deepEqual(mergeTrees(source, target), expected, 'merges large tree into small tree');
});
tape('mergeTrees - Should merge two trees and overwrite source with target for overlapping leaf nodes', t => {
  t.plan(1);

  const target = {
    people: {
      1: {
        name: "Tom",
        age: 28
      }
    }
  };

  const source = {
    people: {
      1: {
        name: "Thom",
        height: 71
      }
    }
  };

  t.deepEqual(mergeTrees(target, source), {
    people: {
      1: {
        name: "Thom",
        age: 28,
        height: 71
      }
    }
  });
});


tape('extractSubTreeByPath - Should extract sub tree from tree that contains path', t => {
  t.plan(1);

  const tree = {
    people: {
      '1': { name: 'Tom', age: 28 },
      '2': { name: 'Dick' },
    }
  };
  const path = ['people', 1, 'age'];
  const expected = {
    people: { 1: { age: 28 } }
  };

  t.deepEqual(extractSubTreeByPath(path, tree), expected);
});
tape('extractSubTreeByPath - Should resolve refs when extracting sub tree from tree that contains path', t => {
  t.plan(1);

  const tree = {
    people: {
      0: {
        $type: 'ref',
        value: ['peopleById', 'id_1']
      }
    },
    peopleById: {
      id_1: { name: 'Tom', age: 28 }
    }
  };
  const path = ['people', 0, 'name'];
  const expected = {
    people: { 0: { name: 'Tom' } }
  };

  t.deepEqual(extractSubTreeByPath(path, tree), expected);
});
// Unclear what the expected behavior should be.  calling GET w/ the below path on a model w/ local cache returns the following
tape('extractSubTreeByPath - Should return sub tree with empty atom leaf node for incomplete path', t => {
  t.plan(1);

  const tree = {
    people: {
      '1': { name: 'Tom', age: 28 },
    }
  };
  const path = ['people', 1];
  const expected = {
    people: { 1: { $type: 'atom' } }
  };

  t.deepEqual(extractSubTreeByPath(path, tree), expected);
});
// Unclear what the expected behavior should be.  calling GET w/ the below path on a model w/ local cache returns the following
tape('extractSubTreeByPath - Should return sub tree with empty atom leaf node for non-existant path in tree', t => {
  t.plan(1);

  const tree = {
    people: {
      '1': { name: 'Tom', age: 28 },
    }
  };
  const path = ['places', 1, 'name'];
  const expected = {
    places: { 1: { name: { $type: 'atom' } } }
  };

  t.deepEqual(extractSubTreeByPath(path, tree), expected);
});


tape('extractSubTreeByPaths - Should return sub tree from pathSet', t => {
  t.plan(1);

  const tree = {
    people: {
      '1': { name: 'Tom', age: 28 },
    }
  };
  const paths = [
    ['people', 1, ['name', 'age']]
  ];
  const expected = {
    people: { 1: { name: 'Tom', age: 28 } }
  };

  t.deepEqual(extractSubTreeByPaths(paths, tree), expected);
});
tape('extractSubTreeByPaths - Should resolve refs when extracting sub tree from pathSet', t => {
  t.plan(1);

  const tree = {
    people: {
      0: {
        $type: 'ref',
        value: ['peopleById', 'id_1']
      },
      1: {
        $type: 'ref',
        value: ['peopleById', 'id_2']
      }
    },
    peopleById: {
      id_1: { name: 'Tom', age: 28 },
      id_2: { name: 'Dick', age: 30 }
    }
  };
  const paths = [
    ['people', [0, 1], ['name', 'age']]
  ];
  const expected = {
    people: {
      0: { name: 'Tom', age: 28 },
      1: { name: 'Dick', age: 30 }
    }
  };

  t.deepEqual(extractSubTreeByPaths(paths, tree), expected);
});
tape('extractSubTreeByPaths - Should return sub tree from multiple pathSets', t => {
  t.plan(1);

  const tree = {
    people: {
      0: { name: 'Tom', age: 28 },
      1: { name: 'Dick', age: 26 },
    }
  };
  const paths = [
    ['people', { to: 1 } , ['name', 'age']]
  ];
  const expected = {
    people: {
      0: { name: 'Tom', age: 28 },
      1: { name: 'Dick', age: 26 }
    }
  };

  t.deepEqual(extractSubTreeByPaths(paths, tree), expected);
});
