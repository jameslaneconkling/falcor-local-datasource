const tape = require('tape');
const falcor = require('falcor');
const LocalDatasource = require('../index');


const setupModel = () => {
  const cache = {
    people: {
      create(graph, callPath, args) {
        // create a new person node for each object in args
        const peopleLength = graph.people.length;

        return args.map((newPerson, idx) =>
          Object.keys(newPerson).map(field => {
            return {
              path: ['people', peopleLength + idx + 1, field],
              value: newPerson[field]
            };
          }))
          .reduce((flatMap, pathValue) => [...flatMap, ...pathValue])
          .concat({
            path: ['people', 'length'],
            value: peopleLength + args.length
          });
      },
      0: {
        $type: 'ref',
        value: ['peopleById', 'id_1']
      },
      1: {
        $type: 'ref',
        value: ['peopleById', 'id_2']
      },
      2: {
        $type: 'ref',
        value: ['peopleById', 'id_3']
      },
      length: 3
    },
    peopleById: {
      id_1: {
        name: 'Tom',
        age: 28,
        height: 71,
        location: {
          $type: 'ref',
          path: ['places', 'was']
        },
        brothers: {
          1: {
            $type: 'ref',
            path: ['people', 2]
          },
          2: {
            $type: 'ref',
            path: ['people', 3]
          }
        }
      },
      id_2: {
        name: 'Dick',
        age: 28,
        height: 70,
        location: {
          $type: 'ref',
          path: ['places', 'ber']
        },
        brothers: {
          1: {
            $type: 'ref',
            path: ['people', 1]
          },
          2: {
            $type: 'ref',
            path: ['people', 3]
          }
        }
      },
      id_3: {
        name: 'Harry',
        age: 32,
        height: 68,
        location: {
          $type: 'ref',
          path: ['places', 'sfc']
        },
        brothers: {
          1: {
            $type: 'ref',
            path: ['people', 1]
          },
          2: {
            $type: 'ref',
            path: ['people', 2]
          }
        }
      }
    },
    places: {
      was: {
        label: 'Washington, DC',
        population: 658893
      },
      sfc: {
        label: 'San Francisco',
        population: 837442
      },
      ber: {
        label: 'Bermuda',
        population: 65024
      }
    }
  };

  return new falcor.Model({ source: new LocalDatasource(cache) });
};


tape('model.get - Retrieves JSONGraphEnvelope from graph', t => {
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
    .subscribe(res => {
      t.deepEqual(res, expectedResponse);
    });
});
tape('model.get - Resolves refs when retrieving JSONGraphEnvelope from graph', t => {
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
    .subscribe(res => {
      t.deepEqual(res, expectedResponse);
    });
});
tape.skip('Does what on model.get with incomplete path?');
tape.skip('Does what on model.get for path that does not exist in graph');


tape('model.set - Updates Graph', t => {
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
    .flatMap(res => {
      t.deepEqual(res, expectedResponse, 'model.set responds with correct JSONEnvelope');

      t.deepEqual(model.getCache(['peopleById', 'id_1', 'name']), { peopleById: { id_1: { name: 'Thom' } } }, 'model cache is updated after model.set');

      model.invalidate(['peopleById', 'id_1', 'name']);

      return model.get(['peopleById', 'id_1', 'name']);
    })
    .subscribe(res => {
      t.deepEqual(res, expectedResponse, 'datasource cache is updated after model.set');
    });
});
tape('model.set - Resolves refs when updating graph', t => {
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
    .flatMap(res => {
      t.deepEqual(res, expectedResponse, 'model.set responds with correct JSONEnvelope');

      t.deepEqual(model.getCache(['people', 0, 'name']), { people: { 0: { name: 'Thom' } } }, 'model cache is updated after model.set');

      model.invalidate(['people', 0, 'name']);

      return model.get(['people', 0, 'name']);
    })
    .subscribe(res => {
      t.deepEqual(res, expectedResponse, 'datasource cache is updated after model.set');
    });
});
tape.skip('Does what on model.set with incomplete path?');
tape.skip('Does what on model.set for path that does not exist in graph');


tape('model.call - Exposes functions in the local JSONGraph store', t => {
  t.plan(1);

  const model = setupModel();
  const callPath = ['people', 'create'];
  const args = [{ name: 'Harry Jr.', age: 21 }];
  const refPath = [];
  const thisPath = [];

  model.call(callPath, args, refPath, thisPath)
    .subscribe(() => {}, () => {}, () => {
      t.pass('Returns onComplete when no return paths are requested');
    });
});


tape('model.call - Returns thisPaths from model.call', t => {
  t.plan(1);

  const model = setupModel();
  const callPath = ['people', 'create'];
  const args = [{ name: 'Harry Jr.' }];
  const refPaths = [];
  const thisPaths = [
    ['length']
  ];
  const expectedResponse = {
    people: { length: 4 }
  };

  model.call(callPath, args, refPaths, thisPaths)
    .subscribe(res => {
      t.deepEqual(res.json, expectedResponse);
    });
});


// tape.only('model.call - Returns refPaths from model.call', t => {
//   t.plan(1);

//   const model = setupModel();
//   const callPath = ['people', 'create'];
//   const args = [{ name: 'Harry Jr.', age: 21 }];
//   const refPaths = [['name', 'age']];
//   const thisPaths = [];
//   const expectedResponse = {
//     people: {
//       4: {
//         name: 'Harry Jr.',
//         age: 21
//       },
//     }
//   };

//   model.call(callPath, args, refPaths, thisPaths)
//     .subscribe(res => {
//       t.deepEqual(res.json, expectedResponse);
//     });
// });
