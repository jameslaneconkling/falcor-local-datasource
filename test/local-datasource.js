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
      1: {
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
      2: {
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
      3: {
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
      },
      // falcor router is able to calculate virtual values like length on the fly
      // unless local-datasource can respond to a get as a function...
      // which would probably require the cache being an object, not another model...
      // which would probably require a way to decompose a pathSet into a path
      length: 3
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


tape('Retrieves JSONGraphEnvelope from graph via model.get', t => {
  t.plan(1);

  const model = setupModel();
  const expectedResponse = {
    json: {
      people: {
        1: {
          name: 'Tom',
          age: 28
        }
      }
    }
  };

  model.get(['people', 1, ['name', 'age']])
    .subscribe(res => {
      t.deepEqual(res, expectedResponse);
    });
});
tape.skip('Does what on model.get with incomplete path?');
tape.skip('Does what on model.get for path that does not exist in graph');

tape('Updates Graph via model.set', t => {
  t.plan(3);

  const model = setupModel();
  const expectedResponse = {
    json: {
      people: {
        1: {
          name: 'Thom'
        }
      }
    }
  };

  model.set({
    path: ['people', 1, ['name']],
    value: 'Thom'
  })
    .flatMap(res => {
      t.deepEqual(res, expectedResponse, 'model.set responds with correct JSONEnvelope');

      t.deepEqual(model.getCache(['people', 1, ['name']]), { people: { 1: { name: 'Thom' } } }, 'model cache is updated after model.set');

      model.invalidate(['people', 1, ['name']]);

      return model.get(['people', 1, ['name']]);
    })
    .subscribe(res => {
      t.deepEqual(res, expectedResponse, 'datasource cache is updated after model.set');
    });
});
tape.skip('Does what on model.set with incomplete path?');
tape.skip('Does what on model.set for path that does not exist in graph');


tape('Exposes functions in the local JSONGraph store via model.call', t => {
  t.plan(1);

  const model = setupModel();
  const callPath = ['people', 'create'];
  const args = [{ name: 'Harry Jr.', age: 21 }];
  const refPath = [];
  const thisPath = [];
  const expectedResponse = {
    json: {
      people: {
        4: {
          name: 'Harry Jr.',
          age: 21
        },
        length: 4
      }
    }
  };

  model.call(callPath, args, refPath, thisPath)
    .subscribe(
      res => {
        t.deepEqual(res, expectedResponse);
      },
      err => {
        t.fail(err);
      }
    );
});
