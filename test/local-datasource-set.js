const tape = require('tape');
const setupModel = require('./test-utils').setupModel;


tape('model.set - Updates Graph', (t) => {
  t.plan(3);

  const model = setupModel();
  const expectedResponse = {
    json: {
      peopleById: {
        id_1: {
          name: 'Thom'
        }
      }
    }
  };

  model.set({
    path: ['peopleById', 'id_1', 'name'],
    value: 'Thom'
  })
    .flatMap((res) => {
      t.deepEqual(res, expectedResponse, 'model.set responds with correct JSONEnvelope');

      t.deepEqual(model.getCache(['peopleById', 'id_1', 'name']), { peopleById: { id_1: { name: 'Thom' } } }, 'model cache is updated after model.set');

      model.invalidate(['peopleById', 'id_1', 'name']);

      return model.get(['peopleById', 'id_1', 'name']);
    })
    .subscribe((res) => {
      t.deepEqual(res, expectedResponse, 'datasource cache is updated after model.set');
    });
});
tape('model.set - Resolves refs when updating graph', (t) => {
  t.plan(3);

  const model = setupModel();
  const expectedResponse = {
    json: {
      people: {
        0: {
          name: 'Thom'
        }
      }
    }
  };

  model.set({
    path: ['people', 0, 'name'],
    value: 'Thom'
  })
    .flatMap((res) => {
      t.deepEqual(res, expectedResponse, 'model.set responds with correct JSONEnvelope');

      t.deepEqual(model.getCache(['people', 0, 'name']), { people: { 0: { name: 'Thom' } } }, 'model cache is updated after model.set');

      model.invalidate(['people', 0, 'name']);

      return model.get(['people', 0, 'name']);
    })
    .subscribe((res) => {
      t.deepEqual(res, expectedResponse, 'datasource cache is updated after model.set');
    });
});
tape.skip('Does what on model.set with incomplete path?');
tape.skip('Does what on model.set for path that does not exist in graph');
