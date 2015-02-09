var utme = require('../utme');
var saveAs = require('filesaver.js');

module.exports = utme.registerSaveHandler(function (scenario) {
   var blob = new Blob([JSON.stringify(scenario, null, " ")], {type: "text/plain;charset=utf-8"});
   saveAs(blob, scenario.name + ".json");
});