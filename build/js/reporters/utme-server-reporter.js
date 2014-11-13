!function(utme) {
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
        return null === results ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    var serverReporter = {
        baseUrl: getParameterByName("utme_test_server") || "http://0.0.0.0:9001/",
        error: function(error) {
            $.ajax({
                type: "POST",
                url: serverReporter.baseUrl + "error",
                data: {
                    data: error
                },
                dataType: "json"
            });
        },
        log: function(log) {
            $.ajax({
                type: "POST",
                url: serverReporter.baseUrl + "log",
                data: {
                    data: log
                },
                dataType: "json"
            }), console.log(log);
        },
        loadScenario: function(name, callback) {
            $.ajax({
                jsonp: "callback",
                url: serverReporter.baseUrl + "scenario/" + name,
                dataType: "jsonp",
                success: function(resp) {
                    callback(resp);
                }
            });
        },
        saveScenario: function(scenario) {
            $.ajax({
                type: "POST",
                url: serverReporter.baseUrl + "scenario",
                data: JSON.stringify(scenario),
                dataType: "json",
                contentType: "application/json"
            });
        }
    };
    utme.registerReportHandler(serverReporter), utme.registerLoadHandler(serverReporter.loadScenario), 
    utme.registerSaveHandler(serverReporter.saveScenario), utme.plugins = utme.plugins || {}, 
    utme.plugins.serverReporter = serverReporter;
}(utme, this);