(function(utme, global) {
    var serverReporter = {
        baseUrl: getParameterByName("utme_test_server") || "http://0.0.0.0:9043/",
        error: function (error, scenario, utme) {
            $.ajax({
              type: "POST",
              url: serverReporter.baseUrl + "error",
              data: { data: error },
              dataType: "json"
            });
            console.error(error);
        },
        log: function (log, scenario, utme) {
            $.ajax({
              type: "POST",
              url:  serverReporter.baseUrl + "log",
              data: { data: log },
              dataType: "json"
            });
            console.log(log);
        },

        loadScenario: function (name, callback) {
            $.ajax({
                jsonp: "callback",

                url:  serverReporter.baseUrl + "scenario/" + name,

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
              url: serverReporter.baseUrl + "scenario",
              data: JSON.stringify(scenario),
              dataType: 'json',
              contentType: "application/json"
            });
        }
    };

    utme.registerReportHandler(serverReporter);
    utme.registerLoadHandler(serverReporter.loadScenario);
    utme.registerSaveHandler(serverReporter.saveScenario);

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
})(utme, this);
