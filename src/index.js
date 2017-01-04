const Rx = require('rx');
const walkTree = require('./utils').walkTree;
const isPathValues = require('./utils').isPathValues;
const isJSONGraphEnvelope = require('./utils').isJSONGraphEnvelope;
const expandPaths = require('./utils').expandPaths;
const pathValues2JSONGraphEnvelope = require('./utils').pathValues2JSONGraphEnvelope;
const extractSubTreeByPaths = require('./utils').extractSubTreeByPaths;
const mergeGraphs = require('./utils').mergeGraphs;


module.exports = class LocalDatasource {
  constructor(graph = {}) {
    this._graph = graph;
  }

  get(paths) {
    return Rx.Observable.just({
      jsonGraph: extractSubTreeByPaths(paths, this._graph),
      paths
    });
  }

  set(jsonGraphEnvelope) {
    this._graph = mergeGraphs(this._graph, jsonGraphEnvelope.jsonGraph);

    return Rx.Observable.just({
      jsonGraph: extractSubTreeByPaths(jsonGraphEnvelope.paths, this._graph),
      paths: jsonGraphEnvelope.paths
    });
  }

  call(callPath, args, refPaths = [], thisPaths = []) {
    let callResponse = walkTree(callPath, this._graph)(this._graph, args);

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

    // add thisPaths to response paths
    const fullThisPaths = thisPaths.map(thisPath => [...callPath.slice(0, -1), ...thisPath]);

    // add refPaths to response paths
    const fullRefPaths = expandPaths(callResponse.paths)
      .map(path => ({
        path,
        value: walkTree(path, callResponse.jsonGraph)
      }))
      .filter(pathValue => pathValue.value.$type === 'ref')
      .map(pathValue =>
        refPaths.map(refPath => [...pathValue.path, ...refPath])
      )
      .reduce((flatMap, fullRefPaths) => [...flatMap, ...fullRefPaths], []);

    // model will resolve empty envelope.jsonGraph object with a subsequent call to model.get
    // if for some reason this turns out to be suboptimal, reimplement above to
    // build envelope.jsonGraph while building envelope.paths
    // see branch: refactor/construct-call-jsongraph
    return Rx.Observable.just({
      jsonGraph: {},
      paths: [...fullThisPaths, ...fullRefPaths]
    });
  }
};
