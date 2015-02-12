var _ = require('../../../js/utils');
var Promise = require('es6-promise').Promise;
var body = require('../../body');

module.exports = function (modalComponent) {
    return {
        open: function (params) {
            return new Promise((resolve) => {
                var element = body.appendComponent(modalComponent, _.extend({

                    onClose: (results) => {
                        setTimeout(function () {
                            body.remove(element);
                            resolve(results);
                        });
                    }

                }, params));
            })['catch']((e) => {
                throw e;
            });
        }
    };

};