const Rx = require('rx');
const walkTree = require('./utils').walkTree;
const isPathValues = require('./utils').isPathValues;
const isJSONGraphEnvelope = require('./utils').isJSONGraphEnvelope;
const expandPaths = require('./utils').expandPaths;
const pathValues2JSONGraphEnvelope = require('./utils').pathValues2JSONGraphEnvelope;
const extractSubTreeByPaths = require('./utils').extractSubTreeByPaths;
const mergeGraphs = require('./utils').mergeGraphs;
const collapse = require('falcor-path-utils').collapse;


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
    try {
      const graphMethod = walkTree(callPath, this._graph);

      if (typeof graphMethod !== 'function') {
        throw new Error(`Tried to envoke a call method on an invalid graph node. ${JSON.stringify(callPath)} is not a function`);
      }

      let callResponse = graphMethod(this._graph, args);

      if (isPathValues(callResponse)) {
        callResponse = pathValues2JSONGraphEnvelope(callResponse);
      } else if (!isJSONGraphEnvelope(callResponse)) {
        throw new Error(`
          ${JSON.stringify(callPath)}(args) should return a JSONGraphEnvelope or an array of PathValues.
          Returned ${callPath}
        `);
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

      // for simplicity, call only constructs paths for response, then uses get to
      // construct the jsonGraph.
      // if for some reason this turns out to be suboptimal, reimplement above to
      // build envelope.jsonGraph while building envelope.paths
      // see branch: refactor/construct-call-jsongraph
      return this.get(collapse([...fullThisPaths, ...fullRefPaths]));
    } catch (e) {
      return Rx.Observable.throw(e);
    }
  }
};
