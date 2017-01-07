const tape = require('tape');
const setupModel = require('./test-utils').setupModel;


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

tape.only('model.call - Should handle errors in call functions', (t) => {
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
      t.equal(err.message, 'Unhandled Error!');
    }, () => {
      t.fail('Should not run onComplete');
    });
});
