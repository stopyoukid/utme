
(function(global, Simulate) {

    // var myGenerator = new CssSelectorGenerator();
    var saveHandlers = [];
    var reportHandlers = [];
    var loadHandlers = [];

    function getScenario(name, callback) {
        // if (loadHandlers.length > 0) {
        //     loadHandlers[0](name, callback);
        // } else {
            var state = utme.state;
            for (var i = 0; i < state.scenarios.length; i++) {
                if (state.scenarios[i].name == name) {
                    callback(state.scenarios[i]);
                }
            }
        // }
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
      // 'resize',
      // 'scroll'
    ];

    function runStep(scenario, idx) {
        var step = scenario.steps[idx];
        var state = utme.state;
        if (step && state.status == 'PLAYING') {
            state.runningScenario = scenario;
            state.runningStep = idx;
            utme.saveStateToStorage(state);
            if (step.eventName == 'load') {
                window.location = step.data.url.href;
            } else {
                var selectors = step.data.selectors;
                tryUntilFound(selectors,  function(eles) {
                    if (step.eventName === 'validate') {
                        var newText = $(eles[0]).text();
                        if (newText != step.data.text) {
                            utme.stopScenario();
                            utme.reportError("Expected: " + step.data.text + ", but was: " + newText);
                            return;
                        }
                    }

                    var ele = eles[0];
                    if (events.indexOf(step.eventName) >= 0) {
                        var options = {};
                        if (step.data.button) {
                            options.which = options.button = step.data.button;
                        }

                        if (step.eventName == 'click') {
                            $(ele).trigger('click');
                        } else if ((step.eventName == 'focus' || step.eventName == 'blur') && ele[step.eventName]) {
                            ele[step.eventName]();
                        } else {
                            Simulate[step.eventName](ele, options);
                        }

                        if (typeof ele.value != "undefined" || typeof step.data.value != "undefined") {
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

                    runNextStep(scenario, idx);
                }, function() {
                    if (step.eventName == 'validate') {
                        utme.reportError('Could not find appropriate element for selectors: ' + JSON.stringify(selectors) + " for event " + step.eventName);
                        utme.stopScenario();
                    } else {
                        utme.reportLog('Could not find appropriate element for selectors: ' + JSON.stringify(selectors) + " for event " + step.eventName);
                        runNextStep(scenario, idx);
                    }
                }, 100);
            }
        } else {

        }
    }

    function tryUntilFound(selectors, callback, fail, timeout) {
        var started = new Date().getTime();

        function tryFind() {
            var eles;
            var foundTooMany = false;
            var foundValid = false;
            for (var i = 0; i < selectors.length; i++) {
                eles = $(selectors[i] + ":visible");
                if (eles.length == 1) {
                    foundValid = true;
                    break;
                } else if (eles.length > 1) {
                    foundTooMany = true;
                }
            }

            if (foundValid) {
                callback(eles);
            }
            else if (new Date().getTime() - started < timeout) {
                setTimeout(tryFind, 20);
            } else {
                fail();
            }
        }

        tryFind();
    }

    function runNextStep(scenario, idx) {
        if (scenario.steps.length > (idx + 1)) {
            if (scenario.steps[idx].eventName == 'mousemove' ||
                scenario.steps[idx].eventName.indexOf("key") >= 0 ||
                scenario.steps[idx].eventName == 'verify') {
              runStep(scenario, idx + 1);
            } else {
              // timeout = Math.max(getTimeout(scenario, idx, idx + 1) / 100, 100);

              setTimeout(function() {
                runStep(scenario, idx + 1);
              }, 10);
            }
        } else {
            utme.stopScenario(true);
        }
    }

    function getTimeout(scenario, firstIndex, secondIndex) {
        return scenario.steps[secondIndex].timeStamp - scenario.steps[firstIndex].timeStamp;
    }

    function simplifySteps(steps) {
      var eleStack = [];
      // Scrub short events
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        if (step.eventName == 'mouseenter') {
          eleStack.push({ idx: i, step: step });
        } else if (step.eventName == 'mouseleave') {
          var oStepInfo = eleStack.pop();

          // If the user was over that element less than 50msec, not worth it.
          if(oStepInfo && (step.timeStamp - oStepInfo.step.timeStamp < 200)) {
            steps.splice(oStepInfo.idx, i - oStepInfo.idx);
            i = oStepInfo.idx;
          }
        }
      }
    }

    var selectors = [];
    var state;
    var utme = {
        state: state,
        init: function() {
          var scenario = getParameterByName('utme_scenario');
          if (scenario) {
              localStorage.clear();
              state = utme.state = utme.loadStateFromStorage();
              setTimeout(function() {
                  utme.runScenario(scenario);
              }, 2000);
          } else {
              state = utme.state = utme.loadStateFromStorage();
              if (state.status === "PLAYING") {
                  runNextStep(state.runningScenario, state.runningStep);
              } else if (!state.status) {
                  state.status = "LOADED";
              }
          }
        },
        startRecording: function() {
            if (state.status != 'RECORDING') {
                state.status = 'RECORDING';
                state.steps = [];
                utme.reportLog("Recording Started");
            }
        },
        runScenario: function(name) {
            var toRun = name || prompt('Scenario to run');
            getScenario(toRun, function(scenario) {
                state.status = "PLAYING";

                utme.reportLog("Starting Scenario '" + name + "'", scenario);

                runStep(scenario, 0);
            });
        },
        stopScenario: function(success) {
            var scenario = state.runningScenario;
            delete state.runningStep;
            delete state.runningScenario;
            state.status = "LOADED";

            utme.reportLog("Stopping Scenario");

            if (success) {
                utme.reportLog("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
            }
        },
        getStatus: function() {
            return utme.state.status;
        },
        findSelectors: function (element) {
            var eleSelectors = $(element).selectorator().generate();
            // var classes = element.className && element.className.split(" ");
            // if (classes && classes.length) {
            //     var classSelectorString = "";
            //     for (var i = 0; i < classes.length; i++) {
            //         if (classes[i].trim()) {
            //             classSelectorString += "." + classes[i];
            //         }
            //     }

            //     if (classSelectorString) {
            //         var testSel = $(classSelectorString);
            //         if (testSel.length == 1 && testSel[0] == element) {
            //             eleSelectors.unshift(classSelectorString);
            //         }
            //     }
            // }
            selectors.push({
                element: element,
                selectors: eleSelectors
            });
            return eleSelectors;
        },
        registerEvent: function(eventName, data) {
            if (state.status == 'RECORDING') {
                state.steps.push({
                    eventName: eventName,
                    timeStamp: new Date().getTime(),
                    data: data
                });
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
        registerSaveHandler: function (handler) {
            saveHandlers.push(handler);
        },
        registerReportHandler: function (handler) {
            reportHandlers.push(handler);
        },
        registerLoadHandler: function (handler) {
            loadHandlers.push(handler);
        },
        stopRecording: function() {
            var newScenario = {
                name: prompt('Enter scenario name'),
                steps: state.steps
            };
            if (newScenario.name) {

                simplifySteps(state.steps);

                state.scenarios.push(newScenario);

                if (saveHandlers && saveHandlers.length) {
                    for (var i = 0; i < saveHandlers.length; i++) {
                        saveHandlers[i](newScenario, utme);
                    }
                }
            }
            state.status = 'LOADED';

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

        unload: function() {
            // var state = utme.loadStateFromStorage();
            // state.status = 'NOT_STARTED';
            utme.saveStateToStorage(state);
        }
    };

    function initEventHandlers() {
        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], (function(evt) {
                var handler = function(e) {
                  if (utme.getStatus() == 'RECORDING' && e.target.hasAttribute && !e.target.hasAttribute('data-ignore')) {
                      if (validating) {
                          e.stopPropagation();
                          e.preventDefault();
                          if (evt == 'mouseover') {
                              $(e.target).addClass('utme-verify');
                          }
                          if (evt == 'mouseout') {
                              $(e.target).removeClass('utme-verify');
                          }
                          if (evt == 'click' || evt == 'mousedown') {
                            utme.registerEvent('validate', {
                                selectors: utme.findSelectors(e.target),
                                text: $(e.target).text()
                            });
                          }
                          return false;
                      } else {
                          var args =  {
                              selectors: utme.findSelectors(e.target),
                              value: e.target.value
                          };

                          if (e.which || e.button) {
                              args.button = e.which || e.button;
                          }

                          utme.registerEvent(evt, args);
                      }
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
            '189': '45'  //IE Key codes
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

        document.addEventListener('keypress', function(e) {
            if (utme.getStatus() == 'RECORDING' && !e.target.hasAttribute('data-ignore')) {
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
                    selectors: utme.findSelectors(e.target),
                    key: c,
                    prevValue: e.target.value,
                    value: e.target.value + c,
                    keyCode: e.keyCode
                });
            }
        }, true);
    }

    function createButton(text, classes, callback) {
        var button = document.createElement('a');
        button.className = 'utme-button ' + classes;
        button.setAttribute('data-ignore', true);
        button.innerHTML = text;
        button.addEventListener('click', callback);
        return button;
    }

    function updateButton(ele, text, disabled) {
        if (disabled) {
            ele.className = ele.className + " " + "disabled";
        } else {
            ele.className = (ele.className || "").replace(/ disabled/g, "");
        }

        ele.innerHTML = text;
    }

    function initControls() {
        var buttonBar = document.createElement('div');
        buttonBar.className = 'utme-bar';
        buttonBar.setAttribute('data-ignore', true);

        function updateButtonStates() {
            var status = utme.getStatus();
            updateButton(recordButton, status == 'RECORDING' ? 'Stop Recording' : 'Record Scenario', validating || status == 'PLAYING');
            updateButton(runButton, status == 'PLAYING' ? 'Stop Running' : 'Run Scenario', validating || status == 'RECORDING');
            updateButton(validateButton, validating ? 'Done Validating' : 'Validate', status != 'RECORDING');
        }

        var recordButton = createButton('Record Scenario', 'start', function() {
            var oldStatus = utme.getStatus();
            if (oldStatus == 'RECORDING') {
                utme.stopRecording();
            } else {
                utme.startRecording();
            }

            updateButtonStates();
        });

        var runButton = createButton('Run Scenario', 'run', function() {
            var oldStatus = utme.getStatus();
            if (oldStatus == 'LOADED') {
                utme.runScenario();
            } else {
                utme.stopScenario(false);
            }

            updateButtonStates();
        });

        var validateButton = createButton('Validate', 'verify', function() {
            var status = utme.getStatus();
            if (status == 'RECORDING') {
                validating = !validating;

                // // We just finished validating
                // if (!validating) {
                //     var sectionName = prompt("Please enter a validation step name:");
                // }
            }

            updateButtonStates();
        });

        updateButtonStates();

        buttonBar.appendChild(recordButton);
        buttonBar.appendChild(runButton);
        buttonBar.appendChild(validateButton);

        document.body.appendChild(buttonBar);
    }

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    document.addEventListener('readystatechange', function() {
        if (document.readyState == "complete") {
            utme.init();

            initControls();
            initEventHandlers();

            if (utme.state.status == 'RECORDING') {
                utme.registerEvent("load", {
                    url: window.location
                });
            }
        }

    });

    window.addEventListener('unload', function() {
        utme.unload();
    }, true);

    window.addEventListener('error', function(err) {
        utme.reportLog("Script Error: " + err.message + ":" + err.url + "," + err.line + ":" + err.col);
    });
    global.utme = utme;

})(this, Simulate);
