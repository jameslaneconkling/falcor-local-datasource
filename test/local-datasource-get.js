const tape = require('tape');
const setupModel = require('./test-utils').setupModel;


tape('model.get - Retrieves JSONGraphEnvelope from graph', (t) => {
  t.plan(1);

  const model = setupModel();
  const expectedResponse = {
    peopleById: {
      id_1: {
        name: 'Tom',
        age: 28
      }
    }
  };

  model.get(['peopleById', 'id_1', ['name', 'age']])
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponse);
    });
});

tape('model.get - Resolves refs when retrieving JSONGraphEnvelope from graph', (t) => {
  t.plan(1);

  const model = setupModel();
  const expectedResponse = {
    people: {
      0: { name: 'Tom', age: 28 },
      1: { name: 'Dick', age: 28 }
    }
  };

  model.get(['people', { to: 1 }, ['name', 'age']])
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponse);
    });
});

tape('model.get - Should return boxed values', (t) => {
  t.plan(4);

  const model = setupModel({
    people: {
      0: {
        name: { $type: 'atom', value: 'Tom', $metadata: 'meta1' },
        age: { $type: 'atom', value: 28, $metadata: 'meta2' }
      }
    }
  }).boxValues();

  model.get(['people', 0, ['name', 'age']])
    .subscribe((res) => {
      t.equal(res.json.people[0].name.value, 'Tom');
      t.equal(res.json.people[0].name.$metadata, 'meta1');
      t.equal(res.json.people[0].age.value, 28);
      t.equal(res.json.people[0].age.$metadata, 'meta2');
    });
});

tape('model.get - incomplete paths [paths that undershoot] should return sentinel from that part of graph', (t) => {
  t.plan(2);

  const model = setupModel().boxValues();
  const expectedResponseForRefSentinel = {
    people: {
      0: {
        $size: 52,
        $type: 'ref',
        value: ['peopleById', 'id_1']
      }
    }
  };

  model.get(['people', 0])
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponseForRefSentinel);
    });

  const expectedResponseForAtomSentinel = {
    peopleById: {
      id_1: {
        $size: 51,
        $type: 'atom',
        value: null
      }
    }
  };

  model.get(['peopleById', 'id_1'])
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponseForAtomSentinel);
    });
});

// unfortunately, it is not possible to tell when a path overshoots vs.
// when it points to a node that doesn't exist
// e.g. [people, 100, 'name'] vs. [people, 0, 'name', 'x', 'y']
// given that correctly handling the former case (node doesn't exist) is more important,
// it is not possible to also correctly handle paths that overshoot
tape.skip('model.get - paths that overshoot should return last resolved value', (t) => {
  t.plan(1);

  const model = setupModel();
  const expectedResponse = {
    people: {
      0: { name: 'Tom', age: 28 },
      1: { name: 'Dick', age: 28 }
    }
  };

  model.get(['people', { to: 1 }, ['name', 'age'], 'x', 'y', 'z'])
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponse);
    });
});

tape('model.get - nonexistent paths should return null value atoms', (t) => {
  t.plan(1);

  const model = setupModel();
  const expectedResponse = {
    people: {
      500: {
        name: null,
        age: null
      }
    }
  };

  model.get(['people', 500, ['name', 'age']])
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponse);
    }, (err) => {
      t.pass(err);
    });
});

