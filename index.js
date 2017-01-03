const falcor = require( 'falcor');
const Rx = require('rx');
const walkTree = require('./utils').walkTree;
const isPathValues = require('./utils').isPathValues;
const isJSONGraphEnvelope = require('./utils').isJSONGraphEnvelope;
const expandPaths = require('./utils').expandPaths;
const pathValues2JSONGraphEnvelope = require('./utils').pathValues2JSONGraphEnvelope;
const extractSubTreeByPath = require('./utils').extractSubTreeByPath;
const extractSubTreeByPaths = require('./utils').extractSubTreeByPaths;
const mergeGraphs = require('./utils').mergeGraphs;


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
    this._graph = mergeGraphs(this._graph, jsonGraphEnvelope.jsonGraph);

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
    this._graph = mergeGraphs(this._graph, callResponse.jsonGraph);

    let response = {
      jsonGraph: {},
      paths: []
    };

    // add thisPaths to response
    response = {
      jsonGraph: mergeGraphs(response.jsonGraph, extractSubTreeByPaths(thisPaths, this._graph)),
      paths: [...response.paths, ...thisPaths.map(thisPath => [...callPath.slice(0, -1), ...thisPath])]
    };

    // add refPaths to response
    expandPaths(callResponse.paths)
      .map(path => ({
        path,
        value: walkTree(path, callResponse.jsonGraph)
      }))
      .filter(pathValue => pathValue.value.$type === 'ref')
      .forEach(callResponseRefPathValue => {
        refPaths.forEach(refPath => {
          const refFullPath = [...callResponseRefPathValue.path, ...refPath];

          response = {
            jsonGraph: mergeGraphs(response.jsonGraph, extractSubTreeByPaths([refFullPath], this._graph)),
            paths: [...response.paths, refFullPath]
          };
        });
      });

    return Rx.Observable.just(response);
  }
};
