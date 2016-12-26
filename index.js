const falcor = require( 'falcor');
const Rx = require('rx');
const extractPathsFromTree = require('./utils').extractPathsFromTree;


module.exports = class LocalDatasource {
  constructor(cache = {}) {
    this._cache = cache;

    // this._model = new falcor.Model({ cache })
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
      jsonGraph: extractPathsFromTree(paths, this._cache),
      paths
    });
  }

  set(jsonGraphEnvelope) {
    return this._model.set(jsonGraphEnvelope)
      .map(res => ({
        jsonGraph: res.json
      }));
  }

  call(callPath, args, refPaths, thisPaths) {
    // TODO - should work with jsonGraphEnvelope
    const pathValues = walkTree(
      [...callPath, 'value'],
      this._model.getCache(callPath)
    )(this._model.unboxValues(), callPath, args);

    return Rx.Observable.just({
      jsonGraph: {
        people: {
          4: {
            name: 'Harry Jr sorta'
          }
        }
      },
      // paths: [['people', 4, 'name']]
    });

    // add call response to dataSource cache
    // WTF - model.setCache is overwritten by an undefined instance method when
    // instantiated w/ a decorator (e.g. model.boxValues, etc.)
    // should fail this test? https://github.com/Netflix/falcor/blob/master/test/falcor/get/get.clone.spec.js
    // this._model.constructor.prototype.setCache(pathValues);
    return this._model.set(...pathValues)
      .flatMap(() => {

        return Rx.Observable.from(pathValues);

        // merge response with thisPaths and refPaths
        return Rx.Observable.merge(
          Rx.Observable.from(pathValues)
          // TODO - figure out thisPath
          // this._model.get([...callPath, ...thisPaths])
          // TODO - get this to work w/ pathValues
          // this._model.get(...pathValues.paths.map(pathSet => [...pathSet, refPaths]))
        )
      });

  }
};
