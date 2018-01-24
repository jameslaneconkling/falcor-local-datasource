const tape = require('tape');
const Rx = require('rx');
const setupModel = require('./test-utils').setupModel;
const walkTree = require('../src/utils').walkTree;


const wrapFalcorModel = (observable) => Rx.Observable.create((observer) => {
  observable.subscribe({
    onNext(data) { observer.next(data); },
    onError(error) { observer.error(error); },
    onCompleted() { observer.completed(); }
  });

  return {
    unsubscribe() {
      observable.dispose();
    }
  };
});


tape('model.call - Exposes graph functions in the local JSONGraph store', (t) => {
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


tape('model.call - Returns thisPaths from model.call', (t) => {
  t.plan(1);

  const model = setupModel();
  const callPath = ['people', 'create'];
  const args = [{ name: 'Harry Jr.' }];
  const refPaths = [];
  const thisPaths = [
    ['length'],
    [0, 'name']
  ];
  const expectedResponse = {
    people: {
      length: 4,
      0: { name: 'Tom' }
    }
  };

  model.call(callPath, args, refPaths, thisPaths)
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponse);
    });
});


tape('model.call - Returns refPaths from model.call', (t) => {
  t.plan(1);

  const model = setupModel();
  const callPath = ['people', 'create'];
  const args = [{ name: 'Harry Jr.', age: 21 }];
  const refPaths = [[['name', 'age']]];
  const thisPaths = [];
  const expectedResponse = {
    people: {
      3: {
        name: 'Harry Jr.',
        age: 21
      }
    }
  };

  model.call(callPath, args, refPaths, thisPaths)
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponse);
    });
});


tape('model.call - Returns boxed values returned from graph functions', (t) => {
  t.plan(2);

  const model = setupModel({
    people: {
      create(graph, args) {
        return [
          {
            path: ['people', 1],
            value: { $type: 'ref', value: ['peopleById', 'id_2'] }
          },
          {
            path: ['peopleById', 'id_2', 'name'],
            value: { $type: 'atom', value: args[0], $metadata: 'meta' }
          }
        ];
      },
      0: {
        $type: 'ref',
        value: ['peopleById', 'id_1']
      }
    },
    peopleById: {
      id_1: {
        name: 'Tom',
        age: 28,
        height: 71
      }
    }
  }).boxValues();

  const callPath = ['people', 'create'];
  const args = ['Harry Jr.'];
  const refPaths = [['name']];
  const thisPaths = [];

  model.call(callPath, args, refPaths, thisPaths)
    .subscribe((res) => {
      t.equal(res.json.people[1].name.value, 'Harry Jr.');
      t.equal(res.json.people[1].name.$metadata, 'meta');
    });
});

tape.skip('model.call - Should follow refs in thisPaths and refPaths', (t) => {
  t.plan(1);

  const graph = {
    resource: {
      search: {
        add() {
          return [
            // ISSUE: passing back resources that are 2 references away
            // (resource.search -ref- search.:id -ref- object)
            // means that refPaths are evaluated on two different types of refs (search and object)
            // even though totalMatches applies to only one,
            // and matches.range.keySet applies to the other
            { path: ['resource', 'search', 234], value: { $type: 'ref', value: ['search', 234] } },
            { path: ['search', 234, 'totalMatches'], value: 100 },
            { path: ['search', 234, 'matches', 0], value: { $type: 'ref', value: ['object', 1] } },
            { path: ['search', 234, 'matches', 1], value: { $type: 'ref', value: ['object', 2] } },
            { path: ['object', 1], value: 'Obama' },
            { path: ['object', 2], value: 'White House' }
          ];
        }
      }
    },
    object: {
      1: { label: 'Obama' },
      2: { label: 'White House' }
    }
  };
  const model = setupModel(graph);
  const expectedResponse = {
    resource: {
      search: {
        234: {
          totalMatches: 100,
          matches: {
            0: { label: 'Obama' },
            1: { label: 'White House' }
          }
        }
      }
    }
  };

  model.call(['resource', 'search', 'add'], [], [['totalMatches'], ['matches', { to: 1 }, 'label']], [])
    .subscribe((JSONEnvelope) => {
      t.deepEqual(JSON.parse(JSONEnvelope.json.toString()), expectedResponse);
    }, (err) => {
      t.fail(err);
    });
});

tape('model.call - Should handle errors in call functions', (t) => {
  t.plan(1);

  const model = setupModel({
    people: {
      create() {
        throw new Error('Unhandled Error!');
      }
    }
  }).boxValues().treatErrorsAsValues();

  const callPath = ['people', 'create'];
  const args = ['Harry Jr.'];
  const refPaths = [];
  const thisPaths = [];

  model.call(callPath, args, refPaths, thisPaths)
    .subscribe(() => {
      t.fail('Should not run onNext');
    }, (err) => {
      t.equal(walkTree(callPath, err.jsonGraph).value, 'Unhandled Error!');
    }, () => {
      t.fail('Should not run onComplete');
    });
});

tape('model.call - Should handle invalidations', (t) => {
  t.plan(1);

  const model = setupModel();
  const callPath = ['people', 'create'];
  const args = [{ name: 'Harry Jr.' }];
  const refPaths = [['name']];
  const thisPaths = [];
  const expectedResponse = {
    people: {
      length: 4
    }
  };

  wrapFalcorModel(model.call(callPath, args, refPaths, thisPaths))
    .mergeMap(() => wrapFalcorModel(model.get(['people', 'length'])))
    .subscribe((res) => {
      t.deepEqual(res.json, expectedResponse);
    });
});
