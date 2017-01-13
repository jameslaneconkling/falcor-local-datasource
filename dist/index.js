'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Rx = require('rx');
var walkTree = require('./utils').walkTree;
var isPathValues = require('./utils').isPathValues;
var isJSONGraphEnvelope = require('./utils').isJSONGraphEnvelope;
var expandPaths = require('./utils').expandPaths;
var pathValues2JSONGraphEnvelope = require('./utils').pathValues2JSONGraphEnvelope;
var extractSubTreeByPaths = require('./utils').extractSubTreeByPaths;
var mergeGraphs = require('./utils').mergeGraphs;
var collapse = require('falcor-path-utils').collapse;

module.exports = function () {
  function LocalDatasource() {
    var graph = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, LocalDatasource);

    this._graph = graph;
  }

  _createClass(LocalDatasource, [{
    key: 'get',
    value: function get(paths) {
      return Rx.Observable.just({
        jsonGraph: extractSubTreeByPaths(paths, this._graph),
        paths: paths
      });
    }
  }, {
    key: 'set',
    value: function set(jsonGraphEnvelope) {
      this._graph = mergeGraphs(this._graph, jsonGraphEnvelope.jsonGraph);

      return Rx.Observable.just({
        jsonGraph: extractSubTreeByPaths(jsonGraphEnvelope.paths, this._graph),
        paths: jsonGraphEnvelope.paths
      });
    }
  }, {
    key: 'call',
    value: function call(callPath, args) {
      var _this = this;

      var refPaths = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      var thisPaths = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

      try {
        var _ret = function () {
          var graphMethod = walkTree(callPath, _this._graph);

          if (typeof graphMethod !== 'function') {
            throw new Error('Tried to envoke a call method on an invalid graph node. ' + JSON.stringify(callPath) + ' is not a function');
          }

          var callResponse = graphMethod(_this._graph, args);

          if (isPathValues(callResponse)) {
            callResponse = pathValues2JSONGraphEnvelope(callResponse);
          } else if (!isJSONGraphEnvelope(callResponse)) {
            throw new Error('\n          ' + JSON.stringify(callPath) + '(args) should return a JSONGraphEnvelope or an array of PathValues.\n          Returned ' + callPath + '\n        ');
          }

          // merge call response into graph
          _this._graph = mergeGraphs(_this._graph, callResponse.jsonGraph);

          // add thisPaths to response paths
          var fullThisPaths = thisPaths.map(function (thisPath) {
            return [].concat(_toConsumableArray(callPath.slice(0, -1)), _toConsumableArray(thisPath));
          });

          // add refPaths to response paths
          var fullRefPaths = expandPaths(callResponse.paths).map(function (path) {
            return {
              path: path,
              value: walkTree(path, callResponse.jsonGraph)
            };
          }).filter(function (pathValue) {
            return pathValue.value.$type === 'ref';
          }).map(function (pathValue) {
            return refPaths.map(function (refPath) {
              return [].concat(_toConsumableArray(pathValue.path), _toConsumableArray(refPath));
            });
          }).reduce(function (flatMap, fullRefPaths) {
            return [].concat(_toConsumableArray(flatMap), _toConsumableArray(fullRefPaths));
          }, []);

          // model will resolve empty envelope.jsonGraph object with a subsequent call to model.get
          // if for some reason this turns out to be suboptimal, reimplement above to
          // build envelope.jsonGraph while building envelope.paths
          // see branch: refactor/construct-call-jsongraph
          return {
            v: Rx.Observable.just({
              jsonGraph: {},
              paths: collapse([].concat(_toConsumableArray(fullThisPaths), _toConsumableArray(fullRefPaths)))
            })
          };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
      } catch (e) {
        return Rx.Observable.throw(e);
      }
    }
  }]);

  return LocalDatasource;
}();