var assert = require("assert")
var fs = require('fs');
require('better-require')('json');

describe('Utme Tests', function(){
  var jsdom = require('mocha-jsdom');
  jsdom();

  beforeEach(function () {
    document.body.innerHTML = "";

    var localStorageValues = {};
    localStorage = {
        setItem: function (path, value) {
            localStorageValues[path] = value;
        },
        getItem: function (path) {
            return localStorageValues[path];
        },
        removeItem: function (path) {
            delete localStorageValues[path];
        }
    };
    $ = require('jquery');
    selectorFinder = require("../src/js/selectorFinder").selectorFinder;

    // Clean utme, cause it is a singleton right now
    for (var i in require.cache) {
        if (i.indexOf("utme.js") >= 0) {
            delete require.cache[i];
        }
    }

    utme = require("../src/js/utme");
  });

  describe ('selector finding', function() {
    it('should start of with a status of LOADED', function(){
        assert.equal(utme.state.status, "LOADED");
    })

    it('should calculate the correct selector 1', function(){
      var elements = $("<div></div>");
      elements.appendTo(document.body);

      var locator = utme.createElementLocator(elements[0]);

      assert.equal(locator.selectors[0], "div:eq(0)");
    })

    it('should calculate the correct selector 2', function(){
      var elements = $("<div></div><div></div>");
      elements.appendTo(document.body);

      locator = utme.createElementLocator(elements[1]);

      assert.equal(locator.selectors[0], "div:eq(1)");
    })

    it('should calculate the correct selector 3', function(){
      var elements = $("<div></div><div class='myClass'></div>");
      elements.appendTo(document.body);

      locator = utme.createElementLocator(elements[1]);
      // utme.finalizeLocator(locator);

      assert.equal(locator.selectors[0], "div.myClass:eq(0)");
    })

    it('should calculate the correct selector 4', function(){
      var elements = $("<div class='myClass'></div><div class='myClass'></div>");
      elements.appendTo(document.body);

      locator = utme.createElementLocator(elements[0]);

      assert.equal(locator.selectors[0], "div.myClass:eq(0)");
    })

    it('should calculate the correct selector 5', function(){
      var elements = $("<div class='myClass'></div><div class='myClass'></div>");
      elements.appendTo(document.body);

      locator = utme.createElementLocator(elements[1]);

      assert.equal(locator.selectors[0], "div.myClass:eq(1)");
    })

    it('should calculate the correct selector 6', function(){
      var elements = $("<div class='myClass'><div class='myClass'></div></div>");
      elements.appendTo(document.body);

      locator = utme.createElementLocator(elements[0].childNodes[0]);

      assert.equal(locator.selectors[0], "div.myClass div.myClass:eq(0)");
      assert.equal(locator.selectors[1], "div.myClass:eq(1)");
    })

    it('should calculate the correct selector 7', function(){
      var elements = $("<div title='myTitle'><div class='myClass'></div></div>");
      elements.appendTo(document.body);

      locator = utme.createElementLocator(elements[0]);

      assert.equal(locator.selectors[0], "div[title=\"myTitle\"]:eq(0)");
    })

    it('should calculate the correct selector 8', function(){
      var elements = $("<div title='myTitle'></div><span></span><div class='cool'><div><div></div></div></div>");
      elements.appendTo(document.body);

      var innerDiv = $('.cool > div > div', document.body);

      locator = utme.createElementLocator(innerDiv[0]);

      assert.equal(locator.selectors[0], "div.cool div:eq(1)");
      assert.equal(locator.selectors[1], "div:eq(3)");
    })


  });

  describe('step recording', function () {
      beforeEach(function() {
          utme.startRecording();
      });

      it ('should set the status to RECORDING after you start recording', function () {
          assert.equal(utme.state.status, "RECORDING");
      });

      it ('should record a "load" event when recording starts', function () {
          assert.equal(utme.state.steps.length, 1);
          assert.equal(utme.state.steps[0].eventName, "load");
      });

      it ('should set a timestamp when recording an event', function () {
          utme.registerEvent('testEvent', {});

          assert.equal(utme.state.steps[1].eventName, "testEvent");
          assert.notEqual(typeof utme.state.steps[1].timeStamp, "undefined");
      });
  });

  describe('mouse event registering', function () {
      beforeEach(function() {
          utme.startRecording();
      });

      it ('should register all events as steps when mouseovering an element', function () {
          var elements = $("<div></div>");
          elements.appendTo(document.body);

          utme.eventListeners['mouseenter']({
              target: elements[0]
          });
          utme.eventListeners['mouseover']({
              target: elements[0]
          });

          assert.equal(utme.state.steps.length,  3);
          assert.equal(utme.state.steps[1].eventName,  'mouseenter');
          assert.equal(utme.state.steps[2].eventName,  'mouseover');
      });

      it ('should register which button was down when click is fired', function () {
          var elements = $("<div></div>");
          elements.appendTo(document.body);

          utme.eventListeners['click']({
              target: elements[0],
              which: 49083
          });

          assert.equal(utme.state.steps.length,  2);
          assert.equal(utme.state.steps[1].eventName,  'click');
          assert.equal(utme.state.steps[1].data.button,  49083);
      });

      it ('should not register events if not recording', function () {
          utme.stopRecording(false);

          var elements = $("<div></div>");
          elements.appendTo(document.body);

          utme.eventListeners['mouseover']({
              target: elements[0]
          });

          assert.equal(utme.state.steps.length,  1);
          assert.equal(utme.state.steps[0].eventName,  'load');
      });

      it ('should not register two events if in a label', function () {
          var elements = $("<label><input/><span></span></label>");
          elements.appendTo(document.body);

          utme.eventListeners['mouseenter']({
              target: elements.find("span")[0]
          });

          utme.eventListeners['mouseenter']({
              target: elements.find("input")[0]
          });

          assert.equal(utme.state.steps.length,  2);
          assert.equal(utme.state.steps[0].eventName,  'load');
          assert.equal(utme.state.steps[1].eventName,  'mouseenter');
      });
  });

  describe('run scenario', function () {

    it ('load a scenario when runScenario is called', function () {
        utme.runScenario('whatever', function(name, callback) {
          var test = require('./scenarios/ElementWithClick');
          callback(test.scenario);
        });
    });

    it ('successfully complete with a single step', function (done) {
      var elements = $("<div></div>");
      elements.appendTo(document.body);

      utme.registerReportHandler({
          log: function (txt) {
              if (txt.indexOf("Completed") >= 0) {
                  done();
              }
          },
          success: function() {
              done();
          },
          error: function (txt) {
              console.log(txt);
          }
      });

      utme.registerLoadHandler(function (name, callback) {
        var test = require('./scenarios/ElementWithClick');
        callback(test.scenario);
      });

      utme.runScenario('whatever');
    });

    it ('should load preconditions properly', function (done) {
      var elements = $("<div></div>");
      elements.appendTo(document.body);

      var isDone = false;
      utme.registerLoadHandler(function (name, callback) {
        if (!name) {
          done("Not loading preconditions properly")
          isDone = true;
        } else if (name == 'whatever') {
          var test = require('./scenarios/ScenarioWithPreconditions');
          callback(test.scenario);
        } else {
          done();
          isDone = true;
        }
      });

      utme.runScenario('whatever');
    });

    // Run all of the test scenarios
    var testScenarios = fs.readdirSync(__dirname + '/scenarios');
    testScenarios.forEach(function (file) {
      var test = require('./scenarios/' + file);

      // It isn't an actual test
      if (test.test) {
        it (test.test, function (done) {
          var isDone = false;
          var elements = $(test.html);
          elements.appendTo(document.body);

          var expects = (test.expect || []).slice(0);
          // We expect a set of elements to have events fired upon them
          if (test.expect && test.expect.length > 0) {
            var lastExpectedRunIdx = -1;
            expects.forEach(function (expect, i) {
              $('body ' + expect.selector).on(expect.event, function() {
                if (expects[0] != expect) {
                  isDone = true;
                  done("Events firing out of order, got " + expect.event + " on " + expect.selector);
                } else {
                  expects.splice(0, 1);
                }
              });
            });

          // We expect NO elements to have any events
          } else {
            $('body *').on('click mousedown mouseup mouseout mouseover mouseenter mouseleave', function () {
              isDone = true;
              done("No events should be run");
            });
          }

          utme.registerReportHandler({
              log: function (txt) { },
              success: function() {
                if (!isDone && expects.length == 0) {
                  isDone = true;
                  done();
                }
              },
              error: function (txt) { }
          });

          utme.registerLoadHandler(function (name, callback) {
            callback(test.scenario);
          });

          utme.runScenario('whatever');
        });
      }
    });

    it ('should not fire events on elements that have no important events, inside of ones that do', function (done) {
      var elements = $("<div><span><span></div>");
      elements.appendTo(document.body);

      var badCount = 0;
      var goodCount = 0;
      $('div').on('mouseenter mouseout mouseover mouseleave', function() {
        goodCount++;
        if (goodCount === 4 && badCount === 0) {
          done();
        }
      });

      $('span').on('mouseenter mouseout mouseover mouseleave', function() {
        badCount++;
      });

      utme.registerLoadHandler(function (name, callback) {
        var test = require('./scenarios/NonImportantElementInsideImportantElement');
        callback(test.scenario);
      });

      utme.runScenario('whatever');
    });
  });
})
