const tape = require('tape');
const walkTree = require('../utils').walkTree;
const pathValue2Tree = require('../utils').pathValue2Tree;
const pathValues2JSONGraphEnvelope = require('../utils').pathValues2JSONGraphEnvelope;


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
      ['people', 2, ['age', 'name']],
      ['people', 3, 'name']
    ]
  };

  t.deepEqual(pathValues2JSONGraphEnvelope(pathValues), expected);
});
