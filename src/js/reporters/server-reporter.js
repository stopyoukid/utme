(function(utme) {
    var baseUrl = "http://192.168.200.136:9043/";
    utme.registerReportHandler({
        error: function (error, scenario, utme) {
            $.ajax({
              type: "POST",
              url: baseUrl + "error",
              data: { data: error },
              dataType: "json"
            });
        },
        log: function (log, scenario, utme) {
            $.ajax({
              type: "POST",
              url:  baseUrl + "log",
              data: { data: log },
              dataType: "json"
            });
            console.log(log);
        }
    });
    utme.registerLoadHandler(function (name, callback) {
        $.ajax({
            jsonp: "callback",

            url:  baseUrl + "scenario/" + name,

            // tell jQuery we're expecting JSONP
            dataType: "jsonp",

            success: function (resp) {
                callback(resp);
            }
        })
    });
    utme.registerSaveHandler(function (scenario, utme) {
        $.ajax({
          type: "POST",
          url: baseUrl + "scenario",
          data: JSON.stringify(scenario),
          dataType: 'json',
          contentType: "application/json"
        });
    });
})(utme);
