const falcor = require( 'falcor');

module.exports = class LocalDatasource {
  constructor(cache = {}) {
    this._model = new falcor.Model({ cache })
      ._materialize()
      .boxValues()
      .treatErrorsAsValues();
  }

  get(paths) {
    // return this._model.get(...paths)._toJSONG()
    return this._model.get(...paths)
      .map(res => ({
        jsonGraph: res.json
      }));
  }

  set(jsonGraphEnvelope) {
    return this._model.set(jsonGraphEnvelope)
      .map(res => ({
        jsonGraph: res.json
      }));
  }

  call(callPath, args, refPaths, thisPaths) {
  }
};
