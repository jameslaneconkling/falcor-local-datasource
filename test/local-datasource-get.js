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

tape('model.get - incomplete paths [paths that undershoot] should return sentinel from that part of graph', (t) => {
  t.plan(1);

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
        $type: 'atom'
      }
    }
  };

  model.get(['peopleById', 'id_1'])
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponseForAtomSentinel);
    });
});

tape('model.get - nonexistent paths [paths that overshoot] should return last resolved value', (t) => {
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
