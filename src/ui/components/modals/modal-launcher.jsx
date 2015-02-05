var React = require('react');
var bs = require('react-bootstrap');
var Promise = require('es6-promise').Promise;
var body = require('../../body');

module.exports = function (modalComponent) {
    return {
        open: function () {
            return new Promise(function (resolve, reject) {
                var element = body.append(React.createElement(modalComponent, {

                    onClose: function (results) {
                        setTimeout(function () {
                            body.remove(element);
                            resolve(results);
                        });
                    },

                }));
            })['catch'](function (e) {
                throw e;
            });
        }
    };

};