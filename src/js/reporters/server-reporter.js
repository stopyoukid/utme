var utme = require('../utme.js');

function getBaseURL () {
  return utme.state && utme.state.testServer ? utme.state.testServer : getParameterByName("utme_test_server") || "http://0.0.0.0:9043/";
}

var serverReporter = {
    error: function (error, scenario, utme) {
        $.ajax({
          type: "POST",
          url: getBaseURL() + "error",
          data: { data: error },
          dataType: "json"
        });
        if (utme.settings.get("consoleLogging")) {
          console.error(error);
        }
    },
    success: function (success, scenario, utme) {
        $.ajax({
          type: "POST",
          url: getBaseURL() + "success",
          data: { data: success },
          dataType: "json"
        });
        if (utme.settings.get("consoleLogging")) {
          console.log(success);
        }
    },
    log: function (log, scenario, utme) {
        $.ajax({
          type: "POST",
          url:  getBaseURL() + "log",
          data: { data: log },
          dataType: "json"
        });
        if (utme.settings.get("consoleLogging")) {
          console.log(log);
        }
    },

    loadScenario: function (name, callback) {
        $.ajax({
            jsonp: "callback",

            contentType: "application/json; charset=utf-8",

            crossDomain: true,

            url:  getBaseURL() + "scenario/" + name,

            // tell jQuery we're expecting JSONP
            dataType: "jsonp",

            success: function (resp) {
                callback(resp);
            }
        });
    },

    saveScenario: function (scenario) {
        $.ajax({
          type: "POST",
          url: getBaseURL() + "scenario",
          data: JSON.stringify(scenario, null, " "),
          dataType: 'json',
          contentType: "application/json"
        });
    },

    loadSettings: function (callback, error) {
        $.ajax({
            contentType: "text/plan; charset=utf-8",
            crossDomain: true,
            url:  getBaseURL() + "settings",
            // tell jQuery we're expecting JSONP
            dataType: "json",

            success: function (resp) {
                callback(resp);
            },
            error: function (err) {
                error(err);
            }
        });
    }
};

utme.registerReportHandler(serverReporter);
utme.registerLoadHandler(serverReporter.loadScenario);
utme.registerSaveHandler(serverReporter.saveScenario);
utme.registerSettingsLoadHandler(serverReporter.loadSettings);

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}