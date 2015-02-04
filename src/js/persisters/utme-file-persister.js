var utme = require('../utme');
var saveAs = require('./FileSaver');
utme.registerSaveHandler(function (scenario, utme) {
   var blob = new Blob([JSON.stringify(scenario, null, " ")], {type: "text/plain;charset=utf-8"});
   saveAs(blob, scenario.name + ".json");
});