var _ = require('./utils');
var Promise = require('es6-promise').Promise;
var Simulate = require('./simulate');
var selectorFinder = require('./selectorFinder');
var Settings = require('./settings');

// var myGenerator = new CssSelectorGenerator();
var importantStepLength = 500;
var saveHandlers = [];
var reportHandlers = [];
var loadHandlers = [];
var settingsLoadHandlers = [];

function getScenario(name) {
    return new Promise(function (resolve, reject) {
        if (loadHandlers.length === 0) {
            var state = utme.state;
            for (var i = 0; i < state.scenarios.length; i++) {
                if (state.scenarios[i].name === name) {
                    resolve(state.scenarios[i]);
                }
            }
        } else {
            loadHandlers[0](name, function (resp) {
                resolve(resp);
            });
        }
    });
}
var validating = false;

var events = [
    'click',
    'focus',
    'blur',
    'dblclick',
    // 'drag',
    // 'dragenter',
    // 'dragleave',
    // 'dragover',
    // 'dragstart',
    // 'input',
    'mousedown',
    // 'mousemove',
    'mouseenter',
    'mouseleave',
    'mouseout',
    'mouseover',
    'mouseup',
    'change',
    // 'resize',
    // 'scroll'
];

function getConditions(scenario, conditionType) {
  var setup = scenario[conditionType];
  var scenarios = setup && setup.scenarios;
  // TODO: Break out into helper
  if (scenarios) {
    return Promise.all(_.map(scenarios, function (scenarioName) {
      return getScenario(scenarioName).then(function (otherScenario) {
        otherScenario = JSON.parse(JSON.stringify(otherScenario));
        return setupConditions(otherScenario).then(function () {
          var toReturn = [];
          for (var i = 0; i < otherScenario.steps.length; i++) {
            toReturn.push(otherScenario.steps[i]);
          }
          return toReturn;
        });
      });
    }));
  } else {
    return Promise.resolve([]);
  }
}

function getPreconditions (scenario) {
  return getConditions(scenario, 'setup');
}

function getPostconditions (scenario) {
  return getConditions(scenario, 'cleanup');
}

function _concatScenarioStepLists(steps) {
    var newSteps = [];
    var currentTimestamp; // initalized by first list of steps.
    for (var j = 0; j < steps.length; j++) {
        var flatSteps = steps[j];
        if (j > 0) {
            for (var k = 0; k < steps.length; k++) {
                var step = flatSteps[k];
                var diff = k > 0 ? step.timeStamp - flatSteps[k - 1].timeStamp : 50;
                currentTimestamp += diff;
                flatSteps[k].timeStamp = currentTimestamp;
            }
        } else {
            currentTimestamp = flatSteps[j].timeStamp;
        }
        newSteps = newSteps.concat(flatSteps);
    }
    return newSteps;
}

function setupConditions (scenario) {
    var promises = [];
    return Promise.all([
        getPreconditions(scenario),
        getPostconditions(scenario)
    ]).then(function (stepArrays) {
        var stepLists = stepArrays[0].concat([scenario.steps], stepArrays[1]);
        scenario.steps = _concatScenarioStepLists(stepLists);
    });
}

function runStep(scenario, idx, toSkip) {
    utme.broadcast('RUNNING_STEP');
    toSkip = toSkip || {};

    var step = scenario.steps[idx];
    var state = utme.state;
    if (step && state.status == 'PLAYING') {
        state.run.scenario = scenario;
        state.run.stepIndex = idx;
        if (step.eventName == 'load') {
            var newLocation = step.data.url.protocol + "//" + step.data.url.host;
            var search = step.data.url.search;
            var hash = step.data.url.hash;

            if (search && !search.charAt("?")) {
                search = "?" + search;
            }
            var isSameURL = (location.protocol + "//" + location.host + location.search) === (newLocation + search);
            window.location.replace(newLocation + hash + search);

            if (utme.state.settings.get("verbose")) {
              console.log((location.protocol + location.host + location.search));
              console.log((step.data.url.protocol + step.data.url.host + step.data.url.search));
            }

            // If we have not changed the actual location, then the location.replace
            // will not go anywhere
            if (isSameURL) {
                window.location.reload(true);
            }

        } else if (step.eventName == 'timeout') {
            if (state.autoRun) {
                runNextStep(scenario, idx, toSkip, step.data.amount);
            }
        } else {
            var locator = step.data.locator;
            var steps = scenario.steps;
            var uniqueId = getUniqueIdFromStep(step);

            // try to get rid of unnecessary steps
            if (typeof toSkip[uniqueId] == 'undefined' && utme.state.settings.get("runner.speed") != 'realtime') {
              var diff;
              var ignore = false;
              for (var j = steps.length - 1; j > idx; j--) {
                var otherStep = steps[j];
                var otherUniqueId = getUniqueIdFromStep(otherStep);
                if (uniqueId === otherUniqueId) {
                  if (!diff) {
                      diff = (otherStep.timeStamp - step.timeStamp);
                      ignore = !isImportantStep(otherStep) && diff < importantStepLength;
                  } else if (isInteractiveStep(otherStep)) {
                      ignore = false;
                      break;
                  }
                }
              }

              toSkip[uniqueId] = ignore;
            }

            // We're skipping this element
            if (toSkip[getUniqueIdFromStep(step)]) {
                runNextStep(scenario, idx, toSkip);
            } else {
                findElementWithLocator(scenario, step, locator, getTimeout(scenario, idx)).then(function (eles) {
                  var ele = eles[0];
                  var tagName = ele.tagName.toLowerCase();
                  var supportsInputEvent = tagName === 'input' || tagName === 'textarea' || ele.getAttribute('contenteditable');

                  if (events.indexOf(step.eventName) >= 0) {
                    var options = {};
                    if (step.data.button) {
                      options.which = options.button = step.data.button;
                    }

                    // Set element state
                    if (typeof step.data.value != "undefined" || typeof step.data.attributes != "undefined") {
                      var toApply = step.data.attributes ? step.data.attributes : { "value": step.data.value };
                      _.extend(ele, toApply);
                    }

                    // console.log('Simulating ' + step.eventName + ' on element ', ele, locator.selectors[0], " for step " + idx);
                    if ((step.eventName == 'focus' || step.eventName == 'blur') && ele[step.eventName]) {
                      ele[step.eventName]();
                    } else if (step.eventName === 'change') {
                        // For browsers that support the input event.
                        if (supportsInputEvent) {
                            Simulate.event(ele, 'input');
                        }
                        Simulate.event(ele, 'change'); // This should be fired after a blur event.
                    } else {
                      Simulate[step.eventName](ele, options);
                    }
                  }

                  if (step.eventName == 'keypress') {
                    var key = String.fromCharCode(step.data.keyCode);
                    Simulate.keydown(ele, key);
                    Simulate.keypress(ele, key);

                    ele.value = step.data.value;
                    Simulate.event(ele, 'change');

                    Simulate.keyup(ele, key);
                    if (supportsInputEvent) {
                        Simulate.event(ele, 'input');
                    }
                  }

                  if (step.eventName == 'validate' && utme.state.settings.get('verbose')) {
                    utme.reportLog('Validate: ' + JSON.stringify(locator.selectors)  + " contains text '"  + step.data.text + "'");
                  }

                  if (state.autoRun) {
                    runNextStep(scenario, idx, toSkip);
                  }
                }, function (result) {
                    if (step.eventName == 'validate') {
                      utme.reportLog("Validate: " + result);
                      utme.stopScenario(false);
                    } else if (isImportantStep(step)) {
                        utme.reportError("Failed on step: " + idx + "  Event: " + step.eventName + " Reason: " + result);
                        utme.stopScenario(false);
                    } else {
                      if (utme.state.settings.get('verbose')) {
                        utme.reportLog(result);
                      }
                      if (state.autoRun) {
                        runNextStep(scenario, idx, toSkip);
                      }
                    }
                });
            }
        }
    }
}

function waitForAngular(rootSelector) {
    var el = document.querySelector(rootSelector);
    return new Promise(function (resolve, reject) {
        try {
            if (!window.angular) {
                throw new Error('angular could not be found on the window');
            }
            if (angular.getTestability) {
                angular.getTestability(el).whenStable(resolve);
            } else {
                if (!angular.element(el).injector()) {
                    throw new Error('root element (' + rootSelector + ') has no injector.' +
                        ' this may mean it is not inside ng-app.');
                }
                angular.element(el).injector().get('$browser').
                notifyWhenNoOutstandingRequests(resolve);
            }
        } catch (err) {
            reject(err);
        }
    });
}

function isImportantStep(step) {
    return step.eventName != 'mouseleave' &&
           step.eventName != 'mouseout' &&
           step.eventName != 'mouseenter' &&
           step.eventName != 'mouseover' &&
           step.eventName != 'blur' &&
           step.eventName != 'focus';
}

/**
 * Returns true if the given step is some sort of user interaction
 */
function isInteractiveStep(step) {
    var evt = step.eventName;

    /*
       // Interesting note, doing the following was causing this function to return undefined.
       return
           evt.indexOf("mouse") !== 0 ||
           evt.indexOf("mousedown") === 0 ||
           evt.indexOf("mouseup") === 0;

       // Its because the conditions were not on the same line as the return statement
    */
    return evt.indexOf("mouse") !== 0 || evt.indexOf("mousedown") === 0 || evt.indexOf("mouseup") === 0;
}

function findElementWithLocator(scenario, step, locator, timeout, textToCheck) {
    var started;
    return new Promise(function (resolve, reject) {
        function tryFind() {
            if (!started) {
                started = new Date().getTime();
            }

            var eles;
            var foundTooMany = false;
            var foundValid = false;
            var foundDifferentText = false;
            var selectorsToTest = locator.selectors.slice(0);
            var textToCheck = step.data.text;
            var comparison = step.data.comparison || "equals";
            selectorsToTest.unshift('[data-unique-id="' + locator.uniqueId + '"]');
            for (var i = 0; i < selectorsToTest.length; i++) {
                var selector = selectorsToTest[i];
                if (isImportantStep(step)) {
                    selector += ":visible";
                }
                eles = $(selector);
                if (eles.length == 1) {
                    if (typeof textToCheck != 'undefined') {
                        var newText = $(eles[0]).text();
                        if ((comparison === 'equals' && newText === textToCheck) ||
                            (comparison === 'contains' && newText.indexOf(textToCheck) >= 0)) {
                            foundValid = true;
                            break;
                        } else {
                            foundDifferentText = true;
                        }
                    } else {
                        foundValid = true;
                        eles.attr('data-unique-id', locator.uniqueId);
                        break;
                    }
                    break;
                } else if (eles.length > 1) {
                    foundTooMany = true;
                }
            }

            if (foundValid) {
                resolve(eles);
            } else if (isImportantStep(step) && (new Date().getTime() - started) < timeout * 5) {
                setTimeout(tryFind, 50);
            } else {
                var result = "";
                if (foundTooMany) {
                    result = 'Could not find appropriate element for selectors: ' + JSON.stringify(locator.selectors) + " for event " + step.eventName + ".  Reason: Found Too Many Elements";
                } else if (foundDifferentText) {
                    result = 'Could not find appropriate element for selectors: ' + JSON.stringify(locator.selectors) + " for event " + step.eventName + ".  Reason: Text doesn't match.  \nExpected:\n" + textToCheck + "\nbut was\n" + eles.text() + "\n";
                } else {
                    result = 'Could not find appropriate element for selectors: ' + JSON.stringify(locator.selectors) + " for event " + step.eventName + ".  Reason: No elements found";
                }
                reject(result);
            }
        }

        var speed = utme.state.settings.get("runner.speed");
        var limit = importantStepLength / (speed === 'realtime' ? '1' : speed);
        if (global.angular) {
            waitForAngular('[ng-app]').then(function() {
              if (speed === 'realtime') {
                  setTimeout(tryFind, timeout);
              } else if (speed === 'fastest') {
                  tryFind();
              } else {
                  setTimeout(tryFind, Math.min(timeout * speed, limit));
              }
            });
        } else {
            if (speed === 'realtime') {
                setTimeout(tryFind, timeout);
            } else if (speed === 'fastest') {
                tryFind();
            } else {
                setTimeout(tryFind, Math.min(timeout * speed, limit));
            }
        }
    });
}

function getTimeout(scenario, idx) {
    if (idx > 0) {
        // If the previous step is a validate step, then just move on, and pretend it isn't there
        // Or if it is a series of keys, then go
        if (scenario.steps[idx - 1].eventName == 'validate') {
            return 0;
        }
        return scenario.steps[idx].timeStamp - scenario.steps[idx - 1].timeStamp;
    }
    return 0;
}

function runNextStep(scenario, idx, toSkip, timeout) {
    // Make sure we aren't going to overflow the call stack.
    setTimeout(function() {
        if (scenario.steps.length > (idx + 1)) {
            runStep(scenario, idx + 1, toSkip);
        } else {
            utme.stopScenario(true);
        }
    }, timeout || 0);
}

function fragmentFromString(strHTML) {
    var temp = document.createElement('template');
    temp.innerHTML = strHTML;
    // console.log(temp.innerHTML);
    return temp.content ? temp.content : temp;
}

function getUniqueIdFromStep(step) {
    return step && step.data && step.data.locator && step.data.locator.uniqueId;
}

function filterExtraLoads(steps) {
  var result = [];
  var seenLoad = false;
  for (var i = 0; i < steps.length; i++) {
    var isLoad = steps[i].eventName === 'load';
    if (!seenLoad || !isLoad) {
      result.push(steps[i]);
      seenLoad = seenLoad || isLoad;
    }
  }
  return result;
};

var guid = (function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return function () {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
})();

var listeners = [];
var state;
var utme = {
    init: function () {
        var scenario = getParameterByName('utme_scenario');
        if (scenario) {
          localStorage.clear();
        }
        state = utme.state = utme.loadStateFromStorage();
        utme.broadcast('INITIALIZED');

        return utme.loadSettings().then(function () {
          if (scenario) {
            setTimeout(function () {
              state.testServer = getParameterByName("utme_test_server");
              state.autoRun = true;
              utme.runScenario(scenario);
            }, 100);
          } else {
            if (state.status === "PLAYING") {
              runNextStep(state.run.scenario, state.run.stepIndex);
            } else if (!state.status || state.status === 'INITIALIZING') {
              state.status = "LOADED";
            }
          }

        });
    },
    broadcast: function (evt, evtData) {
        if (listeners && listeners.length) {
            for (var i = 0; i < listeners.length; i++) {
                listeners[i](evt, evtData);
            }
        }
    },
    startRecording: function () {
        if (state.status != 'RECORDING') {
            state.status = 'RECORDING';
            state.steps = [];
            utme.reportLog("Recording Started");
            utme.broadcast('RECORDING_STARTED');
            utme.registerEvent("load", {
                url: {
                    protocol: window.location.protocol,
                    host: window.location.host,
                    search: window.location.search,
                    hash: window.location.hash
                }
            });
        }
    },

    runScenario: function (name, config) {
        var toRun = name || prompt('Scenario to run');
        var autoRun = !name ? prompt('Would you like to step through each step (y|n)?') != 'y' : true;
        return getScenario(toRun).then(function (scenario) {
            scenario = JSON.parse(JSON.stringify(scenario));
            setupConditions(scenario).then(function () {
                state.run = {};
                state.autoRun = autoRun === true;
                state.status = "PLAYING";

                scenario.steps = filterExtraLoads(scenario.steps);

                if (utme.state.settings.get("verbose")) {
                  utme.reportLog("Starting Scenario '" + name + "'", scenario);
                }

                utme.broadcast('PLAYBACK_STARTED');

                runStep(scenario, 0);
            });
        });
    },
    runNextStep: runNextStep,
    stopScenario: function (success) {
        var scenario = state.run && state.run.scenario;
        delete state.run;
        state.status = "LOADED";
        utme.broadcast('PLAYBACK_STOPPED');

        if (utme.state.settings.get("verbose")) {
          utme.reportLog("Stopping Scenario");
        }
        if (scenario) {
            if (success) {
                utme.reportSuccess("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
            } else {
                utme.reportLog("Stopping on page " + window.location.href);
                utme.reportError("[FAILURE] Scenario '" + scenario.name + "' Stopped!");
            }
        }
    },

    /**
     * Creates a temporary element locator, for use with finalizeLocator
     */
    createElementLocator: function (element) {
        var uniqueId = element.getAttribute("data-unique-id") || guid();
        element.setAttribute("data-unique-id", uniqueId);

        var eleHtml = element.cloneNode().outerHTML;
        var eleSelectors = [];
        if (element.tagName.toUpperCase() == 'BODY' || element.tagName.toUpperCase() == 'HTML') {
            eleSelectors = [element.tagName];
        } else {
            eleSelectors = selectorFinder(element, document.body);
        }
        return {
            uniqueId: uniqueId,
            selectors: eleSelectors
        };
    },

    registerEvent: function (eventName, data, idx) {
        if (utme.isRecording() || utme.isValidating()) {
            if (typeof idx == 'undefined') {
                idx = utme.state.steps.length;
            }
            state.steps[idx] = {
                eventName: eventName,
                timeStamp: new Date().getTime(),
                data: data
            };
            utme.broadcast('EVENT_REGISTERED');
        }
    },
    reportLog: function (log, scenario) {
        if (reportHandlers && reportHandlers.length) {
            for (var i = 0; i < reportHandlers.length; i++) {
                reportHandlers[i].log(log, scenario, utme);
            }
        }
    },
    reportError: function (error, scenario) {
        if (reportHandlers && reportHandlers.length) {
            for (var i = 0; i < reportHandlers.length; i++) {
                reportHandlers[i].error(error, scenario, utme);
            }
        }
    },
    reportSuccess: function (message, scenario) {
        if (reportHandlers && reportHandlers.length) {
            for (var i = 0; i < reportHandlers.length; i++) {
                reportHandlers[i].success(message, scenario, utme);
            }
        }
    },
    registerListener: function (handler) {
        listeners.push(handler);
    },
    registerSaveHandler: function (handler) {
        saveHandlers.push(handler);
    },
    registerReportHandler: function (handler) {
        reportHandlers.push(handler);
    },
    registerLoadHandler: function (handler, order) {
        order = typeof order !== "undefined" ? order : loadHandlers.length;
        if (loadHandlers.length > order) {
            loadHandlers.splice(order, 0, handler);
        } else {
            loadHandlers.push(handler);
        }
    },
    registerSettingsLoadHandler: function (handler) {
        settingsLoadHandlers.push(handler);
    },
    isRecording: function() {
        return utme.state.status.indexOf("RECORDING") === 0;
    },
    isPlaying: function() {
        return utme.state.status.indexOf("PLAYING") === 0;
    },
    isValidating: function(validating) {
        if (typeof validating !== 'undefined' && (utme.isRecording() || utme.isValidating())) {
            utme.state.status = validating ? "VALIDATING" : "RECORDING";
            utme.broadcast('VALIDATION_CHANGED');
        }
        return utme.state.status.indexOf("VALIDATING") === 0;
    },
    stopRecording: function (info) {
        if (info !== false) {
            var newScenario = {
                steps: state.steps
            };

            _.extend(newScenario, info);

            if (!newScenario.name) {
                newScenario.name = prompt('Enter scenario name');
            }

            if (newScenario.name) {
                state.scenarios.push(newScenario);

                if (saveHandlers && saveHandlers.length) {
                    for (var i = 0; i < saveHandlers.length; i++) {
                        saveHandlers[i](newScenario, utme);
                    }
                }
            }
        }

        state.status = 'LOADED';

        utme.broadcast('RECORDING_STOPPED');

        utme.reportLog("Recording Stopped", newScenario);
    },

    loadSettings: function () {
        var settings = utme.state.settings = utme.state.settings || new Settings({
          "runner.speed": "10"
        });
        if (settingsLoadHandlers.length > 0 && !utme.isRecording() && !utme.isPlaying()) {
            return new Promise(function (resolve, reject) {
                settingsLoadHandlers[0](function (resp) {
                    settings.setDefaults(resp);
                    resolve(settings);
                }, function () {
                    resolve(settings);
                });
            });
        } else {
            return Promise.resolve(settings);
        }
    },

    loadStateFromStorage: function () {
        var utmeStateStr = localStorage.getItem('utme');
        if (utmeStateStr) {
            state = JSON.parse(utmeStateStr);

            if (state.settings) {
                var newSettings = new Settings();
                newSettings.settings = state.settings.settings;
                newSettings.settings = state.settings.defaultSettings;
                state.settings = newSettings;
            }
        } else {
            state = {
                status: "INITIALIZING",
                scenarios: []
            };
        }
        return state;
    },

    saveStateToStorage: function (utmeState) {
        if (utmeState) {
            localStorage.setItem('utme', JSON.stringify(utmeState));
        } else {
            localStorage.removeItem('utme');
        }
    },

    unload: function () {
        utme.saveStateToStorage(state);
    }
};

function toggleHighlight(ele, value) {
    $(ele).toggleClass('utme-verify', value);
}

function toggleReady(ele, value) {
    $(ele).toggleClass('utme-ready', value);
}

/**
 * If you click on a span in a label, the span will click,
 * then the browser will fire the click event for the input contained within the span,
 * So, we only want to track the input clicks.
 */
function isNotInLabelOrValid(ele) {
    return $(ele).parents('label').length == 0 ||
          ele.nodeName.toLowerCase() == 'input';
}

/**
 * Returns true if it is an element that should be ignored
 */
function isIgnoredElement(ele) {
  return !ele.hasAttribute || ele.hasAttribute('data-ignore') || $(ele).parents("[data-ignore]").length > 0;
}

/**
 * Returns true if the given event should be recorded on the given element
 */
function shouldRecordEvent(ele, evt) {
  var setting = utme.state.settings.get("recorder.events." + evt);
  var isSettingTrue = (setting === true || setting === 'true' || typeof setting === 'undefined');
  return utme.isRecording() && isSettingTrue && isNotInLabelOrValid(ele);
}

var timers = [];

function initEventHandlers() {

    for (var i = 0; i < events.length; i++) {
        document.addEventListener(events[i], (function (evt) {
            var handler = function (e) {
                if (e.isTrigger)
                    return;

                if (!isIgnoredElement(e.target) && utme.isRecording()) {

                      var idx = utme.state.steps.length;
                      var lastStep = utme.state.steps[idx - 1];
                      var args = {
                        locator: utme.createElementLocator(e.target)
                      };
                      var timer;

                      if (evt == 'mouseover') {
                          toggleHighlight(e.target, true);
                          timers.push({
                              element: e.target,
                              timer: setTimeout(function () {
                                  toggleReady(e.target, true);
                                  toggleHighlight(e.target, false);
                              }, 500)
                          });
                      }

                      if (evt == 'mouseout') {
                          for (var i = 0; i < timers.length; i++) {
                              if (timers[i].element == e.target) {
                                  clearTimeout(timers[i].timer);
                                  timers.splice(i, 1);
                                  break;
                              }
                          }
                          toggleHighlight(e.target, false);
                          toggleReady(e.target, false);
                      }

                      if (shouldRecordEvent(e.target, evt)) {
                        if (e.which || e.button) {
                          args.button = e.which || e.button;
                        }

                        // Click because change fires firs
                        if (evt === 'change') {
                          args.attributes = {
                            "value" : e.target.value,
                            "checked": e.target.checked
                          };
                        }

                        utme.registerEvent(evt, args, idx);
                      }
                }

            };

            // HACK for testing
            (utme.eventListeners = utme.eventListeners || {})[evt] = handler;
            return handler;
        })(events[i]), true);
    }

    var _to_ascii = {
        '188': '44',
        '189': '45',
        '190': '46',
        '191': '47',
        '192': '96',
        '220': '92',
        '222': '39',
        '221': '93',
        '219': '91',
        '173': '45',
        '187': '61', //IE Key codes
        '186': '59'
    };

    var shiftUps = {
        "96": "~",
        "49": "!",
        "50": "@",
        "51": "#",
        "52": "$",
        "53": "%",
        "54": "^",
        "55": "&",
        "56": "*",
        "57": "(",
        "48": ")",
        "45": "_",
        "61": "+",
        "91": "{",
        "93": "}",
        "92": "|",
        "59": ":",
        "39": "\"",
        "44": "<",
        "46": ">",
        "47": "?"
    };

    function keyPressHandler (e) {
        if (e.isTrigger)
            return;

        if (!isIgnoredElement(e.target) && shouldRecordEvent(e.target, "keypress")) {
            var c = e.which;

            // TODO: Doesn't work with caps lock
            //normalize keyCode
            if (_to_ascii.hasOwnProperty(c)) {
                c = _to_ascii[c];
            }

            if (!e.shiftKey && (c >= 65 && c <= 90)) {
                c = String.fromCharCode(c + 32);
            } else if (e.shiftKey && shiftUps.hasOwnProperty(c)) {
                //get shifted keyCode value
                c = shiftUps[c];
            } else {
                c = String.fromCharCode(c);
            }

            utme.registerEvent('keypress', {
                locator: utme.createElementLocator(e.target),
                key: c,
                prevValue: e.target.value,
                value: e.target.value + c,
                keyCode: e.keyCode
            });
        }
    }

    document.addEventListener('keypress', keyPressHandler, true);

    // HACK for testing
    (utme.eventListeners = utme.eventListeners || {})['keypress'] = keyPressHandler;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function bootstrapUtme() {
  if (document.readyState == "complete") {
    utme.init().then(function () {

        initEventHandlers();

        if (utme.isRecording()) {
            utme.registerEvent("load", {
                url: {
                    protocol: window.location.protocol,
                    host: window.location.host,
                    search: window.location.search,
                    hash: window.location.hash
                }
            });
        }
    });
  }
}

bootstrapUtme();
document.addEventListener('readystatechange', bootstrapUtme);

window.addEventListener('unload', function () {
    utme.unload();
}, true);

window.addEventListener('error', function (err) {
    utme.reportLog("Script Error: " + err.message + ":" + err.url + "," + err.line + ":" + err.col);
});

module.exports = utme;
