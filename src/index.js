const Rx = require('rx');
const walkTree = require('./utils').walkTree;
const isPathValues = require('./utils').isPathValues;
const isJSONGraphEnvelope = require('./utils').isJSONGraphEnvelope;
const expandPaths = require('./utils').expandPaths;
const pathValues2JSONGraphEnvelope = require('./utils').pathValues2JSONGraphEnvelope;
const extractSubTreeByPaths = require('./utils').extractSubTreeByPaths;
const mergeGraphs = require('./utils').mergeGraphs;
const assocPath = require('./utils').assocPath;
const collapse = require('falcor-path-utils').collapse;


module.exports = class LocalDatasource {
  constructor(graph = {}) {
    // TODO - validate graph
    //   - all sentinels should have a value prop
    //     (requests fail w/o good feedback if ref sentinels mislabel value prop)
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
      let invalidatedPaths = [];
      const graphMethod = walkTree(callPath, this._graph);

      if (typeof graphMethod !== 'function') {
        throw new Error(`Tried to invoke a call method on an invalid graph node. ${JSON.stringify(callPath)} is not a function`);
      }

      let callResponse = graphMethod(this._graph, args);

      if (isPathValues(callResponse)) {
        const [pathValues, invalidatedPathValues] = callResponse
          .reduce(([pathValues, invalidatedPathValues], pathValue) => {
            if (pathValue.$invalidated) {
              return [pathValues, [...invalidatedPathValues, pathValue]];
            }

            return [[...pathValues, pathValue], invalidatedPathValues];
          }, [[], []]);

        invalidatedPaths = invalidatedPathValues.map(({ path }) => path);

        callResponse = pathValues2JSONGraphEnvelope(pathValues);
      } else if (!isJSONGraphEnvelope(callResponse)) {
        throw new Error(`${JSON.stringify(callPath)}(args) should return a JSONGraphEnvelope or an array of PathValues. Returned ${JSON.stringify(callResponse)}`);
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

      const paths = collapse([...fullThisPaths, ...fullRefPaths]);
      return Rx.Observable.just({
        jsonGraph: extractSubTreeByPaths(paths, this._graph),
        paths,
        invalidated: invalidatedPaths
      });
    } catch (e) {
      return Rx.Observable.throw({
        jsonGraph: assocPath(callPath, { $type: 'error', value: e.message }, {}),
        paths: callPath
      });
    }
  }
};
