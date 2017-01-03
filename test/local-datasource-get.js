const tape = require('tape');
const setupModel = require('./test-utils').setupModel;


tape('model.get - Retrieves JSONGraphEnvelope from graph', (t) => {
  t.plan(1);

  const model = setupModel();
  const expectedResponse = {
    json: {
      peopleById: {
        id_1: {
          name: 'Tom',
          age: 28
        }
      }
    }
  };

  model.get(['peopleById', 'id_1', ['name', 'age']])
    .subscribe((res) => {
      t.deepEqual(res, expectedResponse);
    });
});
tape('model.get - Resolves refs when retrieving JSONGraphEnvelope from graph', (t) => {
  t.plan(1);

  const model = setupModel();
  const expectedResponse = {
    json: {
      people: {
        0: { name: 'Tom', age: 28 },
        1: { name: 'Dick', age: 28 }
      }
    }
  };

  model.get(['people', { to: 1 }, ['name', 'age']])
    .subscribe((res) => {
      t.deepEqual(res, expectedResponse);
    });
});
tape.skip('Does what on model.get with incomplete path?');
tape.skip('Does what on model.get for path that does not exist in graph');
