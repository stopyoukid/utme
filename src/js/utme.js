(function (global, Simulate, selectorFinder) {

    // var myGenerator = new CssSelectorGenerator();
    var saveHandlers = [];
    var reportHandlers = [];
    var loadHandlers = [];

    function getScenario(name, callback) {
        if (loadHandlers.length === 0) {
            var state = utme.state;
            for (var i = 0; i < state.scenarios.length; i++) {
                if (state.scenarios[i].name === name) {
                    callback(state.scenarios[i]);
                }
            }
        } else {
            loadHandlers[0](name, callback);
        }
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

    function runStep(scenario, idx) {
        utme.broadcast('RUNNING_STEP');

        var step = scenario.steps[idx];
        var state = utme.state;
        if (step && state.status == 'PLAYING') {
            state.runningScenario = scenario;
            state.runningStep = idx;
            if (step.eventName == 'load') {
                var location = step.data.url.protocol + "//" + step.data.url.host + "/";
                var search = step.data.url.search;
                var hash = step.data.url.hash;
                var testServer = getParameterByName("utme_test_server");
                if (testServer) {
                    search += (search ? "&" : "?") + "utme_test_server=" + testServer;
                }
                window.location = location + search + hash;
                setTimeout(function() {
                  runNextStep(scenario, idx);
                }, 500);
            } else if (step.eventName == 'timeout') {
                setTimeout(function () {
                    if (state.autoRun) {
                        runNextStep(scenario, idx);
                    }
                }, step.data.amount);
            } else {
                var locator = step.data.locator;

                function foundElement(eles) {

                    var ele = eles[0];
                    if (events.indexOf(step.eventName) >= 0) {
                        var options = {};
                        if (step.data.button) {
                            options.which = options.button = step.data.button;
                        }

                        // console.log('Simulating ' + step.eventName + ' on element ', ele, locator.selectors[0], " for step " + idx);
                        if (step.eventName == 'click') {
                            $(ele).trigger('click');
                        } else if ((step.eventName == 'focus' || step.eventName == 'blur') && ele[step.eventName]) {
                            ele[step.eventName]();
                        } else {
                            Simulate[step.eventName](ele, options);
                        }

                        if (typeof step.data.value != "undefined") {
                            ele.value = step.data.value;
                            Simulate.event(ele, 'change');
                        }
                    }

                    if (step.eventName == 'keypress') {
                        var key = String.fromCharCode(step.data.keyCode);
                        Simulate.keypress(ele, key);
                        Simulate.keydown(ele, key);

                        ele.value = step.data.value;
                        Simulate.event(ele, 'change');

                        Simulate.keyup(ele, key);
                    }

                    if (step.eventName == 'validate') {
                        utme.reportLog('Validate: ' + JSON.stringify(locator.selectors)  + " contains text '"  + step.data.text + "'");
                    }

                    if (state.autoRun) {
                        runNextStep(scenario, idx);
                    }
                }

                function notFoundElement(result) {

                    if (step.eventName == 'validate') {
                        utme.reportLog("Validate: " + result);
                        utme.stopScenario(false);
                    } else {
                        utme.reportLog(result);
                        if (state.autoRun) {
                            runNextStep(scenario, idx);
                        }
                    }
                }

                tryUntilFound(step, locator, foundElement, notFoundElement, getTimeout(scenario, idx));
            }
        } else {

        }
    }

    function waitForAngular(rootSelector, callback) {
        var el = document.querySelector(rootSelector);

        try {
            if (!window.angular) {
                throw new Error('angular could not be found on the window');
            }
            if (angular.getTestability) {
                angular.getTestability(el).whenStable(callback);
            } else {
                if (!angular.element(el).injector()) {
                    throw new Error('root element (' + rootSelector + ') has no injector.' +
                        ' this may mean it is not inside ng-app.');
                }
                angular.element(el).injector().get('$browser').
                notifyWhenNoOutstandingRequests(callback);
            }
        } catch (err) {
            callback(err.message);
        }
    }

    function isImportantStep(step) {
        return step.eventName != 'mouseleave' && step.eventName != 'mouseout' && step.eventName != 'blur';
    }

    function tryUntilFound(step, locator, callback, fail, timeout, textToCheck) {
        var started;

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
            for (var i = 0; i < selectorsToTest.length; i++) {
                eles = $(selectorsToTest[i]);
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
                        break;
                    }
                    break;
                } else if (eles.length > 1) {
                    foundTooMany = true;
                }
            }

            if (foundValid) {
                callback(eles);
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
                fail(result);
            }
        }
        if (global.angular) {
            waitForAngular('[ng-app]', tryFind);
        } else {
            tryFind();
        }
    }

    function getTimeout(scenario, idx) {
        if (scenario.steps[idx].eventName == 'mousemove' ||
            scenario.steps[idx].eventName.indexOf("key") >= 0 ||
            scenario.steps[idx].eventName == 'validate') {
            return 0;
        } else if (idx > 0) {
            return scenario.steps[idx].timeStamp - scenario.steps[idx - 1].timeStamp;
        }
        return 0;
    }

    function runNextStep(scenario, idx) {
        if (scenario.steps.length > (idx + 1)) {
            runStep(scenario, idx + 1);
        } else {
            utme.stopScenario(true);
        }
    }

    function fragmentFromString(strHTML) {
        var temp = document.createElement('template');
        temp.innerHTML = strHTML;
        return temp.content;
    }

    function postProcessSteps(steps) {
        // Scrub short events
        for (var i = 0; i < steps.length; i++) {
            var step = steps[i];
            var locator = step && step.data.locator;
            var selector = locator && locator.selectors[0];
            if (selector && selector.doc) {
                var frag = fragmentFromString(selector.doc);
                var ele = frag.querySelectorAll('[data-unique-id=\'' + selector.id + '\']');
                // var selectors = $(ele).selectorator().generate();
                locator.selectors = [selectorFinder(ele[0], frag)];
            }
        }
    }

    function getUniqueIdFromStep(step) {
        return step && step.data && step.data.locator && step.data.locator.uniqueId;
    }

    function simplifySteps(steps) {

        // Scrub short events
        for (var i = 0; i < steps.length; i++) {
            var step = steps[i];
            if (step && step.data && step.data.locator) {
              var uniqueId = getUniqueIdFromStep(step);
              var hoverLength = i > 0 ? (step.timeStamp - steps[i - 1].timeStamp) : 0;
              if (hoverLength >= 500 && steps[i - 1].eventName == 'mouseover') {
                  for (var k = i; i < steps.length - 1; i++) {
                      steps[k].timeStamp -= hoverLength;
                  }
              }
              if (step.eventName == 'mouseenter' && uniqueId) {
                  var remove = false;
                  for (var j = steps.length - 1; j >= i; j--) {
                      var otherStep = steps[j];
                      var otherUniqueId = getUniqueIdFromStep(otherStep);
                      if (uniqueId === otherUniqueId) {
                          if (otherStep.eventName === 'mouseleave') {
                              var diff = (otherStep.timeStamp - step.timeStamp);
                              remove = diff < 500;
                          }
                          if (remove) {
                              var diff = steps[j + 1].timeStamp - steps[j].timeStamp;
                              for (var k = j; k < steps.length - 1; k++) {
                                  steps[k].timeStamp -= diff;
                              }
                              steps.splice(j, 1);
                          }
                      }
                  }
              }
            }
        }
    }

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
        state: state,
        init: function () {
            var scenario = getParameterByName('utme_scenario');
            if (scenario) {
                localStorage.clear();
                state = utme.state = utme.loadStateFromStorage();
                utme.broadcast('INITIALIZED');
                setTimeout(function () {
                    state.autoRun = true;
                    utme.runScenario(scenario);
                }, 2000);
            } else {
                state = utme.state = utme.loadStateFromStorage();
                utme.broadcast('INITIALIZED');
                if (state.status === "PLAYING") {
                    runNextStep(state.runningScenario, state.runningStep);
                } else if (!state.status) {
                    state.status = "LOADED";
                }
            }
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
                  url: window.location
                });
            }
        },
        runScenario: function (name) {
            var toRun = name || prompt('Scenario to run');
            var autoRun = !name ? prompt('Would you like to step through each step (y|n)?') != 'y' : true;
            getScenario(toRun, function (scenario) {
                scenario = JSON.parse(JSON.stringify(scenario));

                simplifySteps(scenario.steps);

                function _runScenario() {
                    state.autoRun = autoRun == true;
                    state.status = "PLAYING";

                    utme.reportLog("Starting Scenario '" + name + "'", scenario);
                    utme.broadcast('PLAYBACK_STARTED');

                    runStep(scenario, 0);
                }

                var setup = scenario.setup;
                var preconditions = setup && setup.scenarios;
                if (preconditions) {

                    // TODO: Break out into helper
                    var setupSteps = [];
                    var loadedCount = 0;
                    for (var i = 0; i < preconditions.length; i++) {
                        (function(idx) {
                          getScenario(preconditions[idx], function (otherScenario) {
                              otherScenario = JSON.parse(JSON.stringify(otherScenario));
                              simplifySteps(otherScenario.steps);

                              setupSteps[idx] = otherScenario.steps;
                              loadedCount++;
                              if (loadedCount == preconditions.length) {
                                  setupSteps.push(scenario.steps);

                                  var newSteps = [];
                                  for (var j = 0; j < setupSteps.length; j++) {
                                      var steps = setupSteps[j];
                                      if (j > 0) {
                                        var previousLastStep = setupSteps[j - 1][setupSteps[j - 1].length - 1];
                                        var diff = previousLastStep.timeStamp - steps[0].timeStamp;
                                        for (var k = 0; k < steps.length; k++) {
                                            steps[k].timeStamp += diff;
                                        }
                                      }
                                      newSteps = newSteps.concat(steps);
                                  }
                                  scenario.steps = newSteps;
                                  _runScenario();
                              }
                          });
                        })(i);
                    }
                } else {
                    _runScenario();
                }
            });
        },
        runNextStep: runNextStep,
        stopScenario: function (success) {
            var scenario = state.runningScenario;
            delete state.runningStep;
            delete state.runningScenario;
            state.status = "LOADED";
            utme.broadcast('PLAYBACK_STOPPED');

            utme.reportLog("Stopping Scenario");

            if (success) {
                utme.reportLog("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
            } else {
                utme.reportError("[FAILURE] Scenario '" + scenario.name + "' Completed!");
            }
        },
        createElementLocator: function (element) {
            var uniqueId = element.getAttribute("data-unique-id") || guid();
            element.setAttribute("data-unique-id", uniqueId);

            var eleHtml = element.cloneNode().outerHTML;
            var eleSelectors = [];
            if (element.tagName.toUpperCase() == 'BODY' || element.tagName.toUpperCase() == 'HTML') {
                var eleSelectors = [element.tagName];
            } else {
                var docHtml = document.body.innerHTML;
                var eleSelectors = [{
                    doc: docHtml, //docHtml.substring(0, docHtml.indexOf(eleHtml) + eleHtml.length),
                    id: uniqueId,
                    ele: eleHtml
                }];
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
        registerListener: function (handler) {
            listeners.push(handler);
        },
        registerSaveHandler: function (handler) {
            saveHandlers.push(handler);
        },
        registerReportHandler: function (handler) {
            reportHandlers.push(handler);
        },
        registerLoadHandler: function (handler) {
            loadHandlers.push(handler);
        },
        isRecording: function() {
            return utme.state.status.indexOf("RECORDING") === 0;
        },
        isPlaying: function() {
            return utme.state.status.indexOf("PLAYING") === 0;
        },
        isValidating: function(validating) {
            if (typeof validating !== 'undefined' && (utme.isRecording() || utme.isValidating())) {
                utme.broadcast('VALIDATION_CHANGED');
                utme.state.status = validating ? "VALIDATING" : "RECORDING";
            }
            return utme.state.status.indexOf("VALIDATING") === 0;
        },
        stopRecording: function (info) {
            if (info !== false) {
                var newScenario = {
                    steps: state.steps
                };

                $.extend(newScenario, info);

                if (!newScenario.name) {
                    newScenario.name = prompt('Enter scenario name');
                }

                if (newScenario.name) {

                    postProcessSteps(newScenario.steps);

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

        loadStateFromStorage: function () {
            var utmeStateStr = localStorage.getItem('utme');
            if (utmeStateStr) {
                state = JSON.parse(utmeStateStr);
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

    var timers = [];

    function initEventHandlers() {

        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], (function (evt) {
                var handler = function (e) {
                    if (e.isTrigger)
                        return;

                    if (utme.isRecording() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore') && $(e.target).parents("[data-ignore]").length == 0) {
                          var idx = utme.state.steps.length;
                          var args = {
                              locator: utme.createElementLocator(e.target)
                          };
                          var timer;

                          if (e.which || e.button) {
                              args.button = e.which || e.button;
                          }

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

                          if (evt == 'change') {
                              args.value = e.target.value;
                          }

                          utme.registerEvent(evt, args, idx);
                    }

                };
                return handler;
            })(events[i]), true);
        }

        var _to_ascii = {
            '188': '44',
            '109': '45',
            '190': '46',
            '191': '47',
            '192': '96',
            '220': '92',
            '222': '39',
            '221': '93',
            '219': '91',
            '173': '45',
            '187': '61', //IE Key codes
            '186': '59', //IE Key codes
            '189': '45' //IE Key codes
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

        document.addEventListener('keypress', function (e) {
            if (e.isTrigger)
                return;

            if (utme.isRecording() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore') && $(e.target).parents("[data-ignore]").length == 0) {
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
        }, true);
    }

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    document.addEventListener('readystatechange', function () {
        if (document.readyState == "complete") {
            utme.init();

            initEventHandlers();

            if (utme.isRecording()) {
                utme.registerEvent("load", {
                    url: window.location
                });
            }
        }

    });

    window.addEventListener('unload', function () {
        utme.unload();
    }, true);

    window.addEventListener('error', function (err) {
        utme.reportLog("Script Error: " + err.message + ":" + err.url + "," + err.line + ":" + err.col);
    });

    global.utme = utme;

})(this, this.Simulate, this.selectorFinder);
