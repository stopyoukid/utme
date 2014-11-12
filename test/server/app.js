var express = require("express"),
    app = express(),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override'),
    fs = require("fs"),
    port = parseInt(process.env.PORT, 10) || 9043,
    log = "";

app.set('jsonp callback name', 'callback');
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get("/", function (req, res) {
  res.send(log).end();
});
app.use(methodOverride());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(__dirname + '/public'));
app.use(errorHandler({
  dumpExceptions: true,
  showStack: true
}));
app.post("/log", function (req, res) {
    log += "[LOG] " + req.body.data + "<br/>";
    console.log("[LOG] " + req.body.data);
    res.status(200).end();
});
app.post("/error", function (req, res) {
    log += "[ERROR] " + req.body.data + "<br/>";
    console.error("[ERROR] " + req.body.data);
    res.status(200).end();
});
app.get("/scenario/:name", function (req, res) {
    var scenarioId = req.param("name");
    // todo: dangerous
    var file =  JSON.parse(fs.readFileSync(__dirname + '/scenarios/' + scenarioId + ".json").toString());
    res.jsonp(file).end();
});
app.get("/runTest/:name", function (req, res) {
    var phantom=require('node-phantom');
    phantom.create(function(err,ph) {
      if (err) {
        console.log(err);
      }
      else {
        return ph.createPage(function(err,page) {
          if (err) {
            console.log(err);
          } else {
            return page.open("http://localhost:9000/?utme_scenario=" + req.param('name'), function(err,status) {
              if (err) {
                console.log(err);
              }
              res.status(200).end();
            });
          }
        });
      }
    });
});

app.post("/scenario", function (req, res) {
    var scenario = req.body;
    fs.writeFileSync(__dirname + '/scenarios/' + scenario.name + ".json", JSON.stringify(scenario));
    res.jsonp(scenario);
    log += "[LOG] Saved Scenario '" + scenario.name + "'<br/>";
});


console.log("Simple static server listening at http://localhost:" + port);
app.listen(port);
