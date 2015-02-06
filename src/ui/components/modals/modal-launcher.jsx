var _ = require('../../../js/utils');
var Promise = require('es6-promise').Promise;
var body = require('../../body');

module.exports = function (modalComponent) {
    return {
        open: function (params) {
            return new Promise(function (resolve, reject) {
                var element = body.appendComponent(modalComponent, _.extend({

                    onClose: function (results) {
                        setTimeout(function () {
                            body.remove(element);
                            resolve(results);
                        });
                    }

                }, params));
            })['catch'](function (e) {
                throw e;
            });
        }
    };

};