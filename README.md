# Falcor LocalDataSource

Falcor DataSource interface exposing a local JSON Graph object for frontend storage.

**Use cases:**
* developing a frontend-only application that doesn't need to persist data between browser reloads
* simple mocking of a falcor-router for testing or prototyping

Simply using a falcor model with a cache supports all `model.get()` and `model.set()` functionality: `const model = new falcor.Model({ cache: myJSONGraphObject });`.  However, the model cache does not allow function methods to be defined on the JSONGraph object, and hence does not expose `model.call()` operations to, for example, add or delete nodes to/from the graph.

## Usage
To use the LocalDataSource, simply define methods on the JSONGraph object, pass it to the LocalDataSource on initialization, and invoke via `model.call(callPath:Path, arguments:any[], refPaths?: PathSet[], thisPaths?:PathSet[])`.  The method will be invoked with a reference to the graph, followed by the arguments array passed to `model.call()`

Similar to the [Falcor Router](https://netflix.github.io/falcor/documentation/model.html#calling-functions), JSONGraph methods must return a [JSONGraphEnvelope](https://netflix.github.io/falcor/doc/global.html#JSONGraphEnvelope) or Array of [PathValues](https://netflix.github.io/falcor/doc/global.html#PathValue) that describe the changes to the graph.  It is recommended that you not mutate the graph directly, but rather describe the changes to the graph via the returned JSONGraphEnvelope or PathValues array.

```javascript
const falcor = require('falcor');
const LocalDatasource = require('../src/index');

const graph = {
  todos: {
    0: { $type: 'ref', value: ['todosById', 'id_0'] },
    1: { $type: 'ref', value: ['todosById', 'id_1'] },
    length: 2,
    add(graph, args) {
      const newTodoLabel = args[0];
      const todoCount = graph.todos.length;
      // NOTE: this is a pretty naive way to derive new ids.  a more robust approach might generate unique ids using
      // a specific node in the graph, or use a closure, or some other mechanism to yield unique incremental values
      const newId = `id_${todoCount}`;

      // return array of pathValues
      return [
        {
          path: ['todos', todoCount],
          value: { $type: 'ref', value: ['todosById', newId] }
        },
        {
          path: ['todosById', newId, 'label'],
          value: newTodoLabel
        },
        {
          path: ['todosById', newId, 'completed'],
          value: false
        },
        {
          path: ['todos', 'length'],
          value: todoCount + 1
        }
      ];
    }
  },
  todosById: {
    id_1: { label: 'tap dance', completed: false },
    id_2: { label: 'see above', completed: false }
  }
};

const model = new falcor.Model({ source: new LocalDatasource(graph) });
```

As with the Falcor Router, the values returned from the call to `model.call()` are managed by the [refPaths and thisPaths arguments](https://netflix.github.io/falcor/documentation/model.html#calling-functions).

```javascript
model.call(['todos', 'add'], ['dupstep dance party'])
  .subscribe(res => {
    // never runs
  }, err => {
    console.error('Error adding new Todo', err);
  }, () => {
    console.log('added new todo');
  });
// > added new todo

model.call(['todos', 'add'], ['jumpstyle'], [[['label', 'completed']]], [['length']])
  .subscribe(res => {
    console.log('returned', res.json);
  }, err => {
    console.error('Error adding new Todo', err);
  }, () => {
    console.log('added new todo');
  });
// > { todos: { id_4: { label: 'jumpstyle', completed: false } }, length: 4 }
// > added new todo
```


## Installation
Current builds only support NPM.  If you use a different package manager, or no package manager, either download and build locally, or post an issue and I'll expand the build step.
```bash
npm install --save falcor-local-datasource
```


## Development
To test:
```bash
npm install -g tap-summary
npm run test

# or
node test/
```

To publish:
```bash
npm run validate && npm publish
```
