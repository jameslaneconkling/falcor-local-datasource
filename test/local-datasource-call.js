const tape = require('tape');
const setupModel = require('./test-utils').setupModel;


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


tape.skip('model.call - Returns refPaths from model.call', t => {
  t.plan(1);

  const model = setupModel();
  const callPath = ['people', 'create'];
  const args = [{ name: 'Harry Jr.', age: 21 }];
  const refPaths = [['name', 'age']];
  const thisPaths = [];
  const expectedResponse = {
    people: {
      4: {
        name: 'Harry Jr.',
        age: 21
      },
    }
  };

  model.call(callPath, args, refPaths, thisPaths)
    .subscribe(res => {
      t.deepEqual(res.json, expectedResponse);
    });
});
