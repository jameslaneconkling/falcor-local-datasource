const falcor = require( 'falcor');
const Rx = require('rx');
const walkTree = require('./utils').walkTree;
const isPathValues = require('./utils').isPathValues;
const isJSONGraphEnvelope = require('./utils').isJSONGraphEnvelope;
const pathValues2JSONGraphEnvelope = require('./utils').pathValues2JSONGraphEnvelope;
const extractPathsFromTree = require('./utils').extractPathsFromTree;
const mergeTrees = require('./utils').mergeTrees;


module.exports = class LocalDatasource {
  constructor(graph = {}) {
    this._graph = graph;

    // this._model = new falcor.Model({ graph })
    //   ._materialize()
    //   .boxValues()
    //   .treatErrorsAsValues();
  }

  get(paths) {
    // return this._model.get(...paths)._toJSONG()
    // return this._model.get(...paths)
    //   .map(res => ({
    //     jsonGraph: res.json
    //   }));

    return Rx.Observable.just({
      jsonGraph: extractPathsFromTree(paths, this._graph),
      paths
    });
  }

  set(jsonGraphEnvelope) {
    this._graph = mergeTrees(this._graph, jsonGraphEnvelope.jsonGraph);

    return Rx.Observable.just({
      jsonGraph: extractPathsFromTree(jsonGraphEnvelope.paths, this._graph),
      paths: jsonGraphEnvelope.path
    });
  }

  call(callPath, args, refPaths, thisPaths) {
    let callResponse = walkTree(callPath, this._graph)(this._graph, callPath, args);

    if (isPathValues(callResponse)) {
      callResponse = pathValues2JSONGraphEnvelope(callResponse);
    } else if (!isJSONGraphEnvelope(callResponse)) {
      return Rx.Observable.throw(new Error(`
        ${JSON.stringify(callPath)}(args) should return a JSONGraphEnvelope or an array of PathValues.
        Returned ${callPath}
      `));
    }

    this._graph = mergeTrees(this._graph, callResponse);

    return Rx.Observable.just(callResponse);
  }
};
