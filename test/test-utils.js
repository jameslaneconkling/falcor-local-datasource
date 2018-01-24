const falcor = require('falcor');
// const falcor = require('@graphistry/falcor');
const LocalDatasource = require('../src/index');


const setupModel = (cache) => {
  const defaultCache = {
    people: {
      create(graph, args) {
        // create a new person node for each object in args
        const peopleLength = graph.people.length;

        return args.map((newPerson, idx) => {
          const newPersonId = `id_${peopleLength + idx + 1}`;

          return Object.keys(newPerson)
            .map(field => ({
              path: ['peopleById', newPersonId, field],
              value: newPerson[field]
            }))
            .concat({
              path: ['people', peopleLength + idx],
              value: {
                $type: 'ref',
                value: ['peopleById', newPersonId]
              }
            });
        })
          .reduce((flatMap, pathValue) => [...flatMap, ...pathValue])
          .concat({
            path: ['people', 'length'],
            $invalidated: true
          })
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

  return new falcor.Model({ source: new LocalDatasource(cache || defaultCache) });
};


module.exports.setupModel = setupModel;
