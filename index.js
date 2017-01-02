const falcor = require( 'falcor');
const Rx = require('rx');
const walkTree = require('./utils').walkTree;
const isPathValues = require('./utils').isPathValues;
const isJSONGraphEnvelope = require('./utils').isJSONGraphEnvelope;
const pathValues2JSONGraphEnvelope = require('./utils').pathValues2JSONGraphEnvelope;
const extractSubTreeByPath = require('./utils').extractSubTreeByPath;
const extractSubTreeByPaths = require('./utils').extractSubTreeByPaths;
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
      jsonGraph: extractSubTreeByPaths(paths, this._graph),
      paths
    });
  }

  set(jsonGraphEnvelope) {
    this._graph = mergeTrees(this._graph, jsonGraphEnvelope.jsonGraph);

    return Rx.Observable.just({
      jsonGraph: extractSubTreeByPaths(jsonGraphEnvelope.paths, this._graph),
      paths: jsonGraphEnvelope.path
    });
  }

  call(callPath, args, refPaths = [], thisPaths = []) {
    let callResponse = walkTree(callPath, this._graph)(this._graph, callPath, args);

    if (isPathValues(callResponse)) {
      callResponse = pathValues2JSONGraphEnvelope(callResponse);
    } else if (!isJSONGraphEnvelope(callResponse)) {
      return Rx.Observable.throw(new Error(`
        ${JSON.stringify(callPath)}(args) should return a JSONGraphEnvelope or an array of PathValues.
        Returned ${callPath}
      `));
    }

    // merge call response into graph
    this._graph = mergeTrees(this._graph, callResponse.jsonGraph);

    let response = {
      jsonGraph: {},
      paths: []
    };

    // add thisPaths to response
    response = {
      jsonGraph: mergeTrees(response.jsonGraph, extractSubTreeByPaths(thisPaths, this._graph)),
      paths: [...response.paths, ...thisPaths.map(thisPath => [...callPath.slice(0, -1), ...thisPath])]
    };

    // add refPaths to response
    // response = refPaths.reduce((response, refPath) => {
    //   return callResponse.paths.reduce((response, callResponsePath) => {
    //     return Object.assign(response, {
    //       jsonGraph: mergeTrees(response.jsonGraph, extractSubTreeByPaths([...callResponse.paths, ...refPath])),
    //       paths: [...response.paths, [...callResponse.paths, ...refPath]]
    //     });
    //   }, response)
    // }, response);

    return Rx.Observable.just(response);
  }
};
