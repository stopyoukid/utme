(function(global, Simulate) {
    // var myGenerator = new CssSelectorGenerator();
    var saveHandlers = [];
    var reportHandlers = [];
    var loadHandlers = [];

    function getScenario(name, callback) {
        if (loadHandlers.length > 0) {
            loadHandlers[0](name, callback);
        } else {
            var state = utme.loadState();
            for (var i = 0; i < state.scenarios.length; i++) {
                if (state.scenarios[i].name == name) {
                    callback(state.scenarios[i]);
                }
            }
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
      // 'resize',
      // 'scroll'
    ];

    function runStep(scenario, idx) {
        var step = scenario.steps[idx];
        if (step) {
            var state = utme.loadState();
            state.runningScenario = scenario;
            state.runningStep = idx;
            utme.saveState(state);
            if (step.eventName == 'load') {
                window.location = step.data.url.href;
            } else {
                var selectors = step.data.selectors;
                var eles;
                var foundTooMany = false;
                var foundValid = false;
                for (var i = 0; i < selectors.length; i++) {
                    eles = $(selectors[i]);
                    if (eles.length == 1) {
                        foundValid = true;
                        break;
                    } else if (eles.length > 1) {
                        foundTooMany = true;
                    }
                }

                if (step.eventName === 'validate') {
                    if (eles.length === 0) {
                        utme.stopScenario();
                        utme.reportError('Could not find element for selectors: ' + JSON.stringify(selectors) + " for event " + step.eventName);
                        return;
                    } else if (foundTooMany) {
                        utme.stopScenario();
                        utme.reportError("Found too many elements for selectors: " + JSON.stringify(selectors));
                        return;
                    } else {
                        var newText = $(eles[0]).text();
                        if (newText != step.data.text) {
                            utme.stopScenario();
                            utme.reportError("Expected: " + step.data.text + ", but was: " + newText);
                            return;
                        }
                    }
                } else if (foundValid) {
                    var ele = eles[0];
                    if (events.indexOf(step.eventName) >= 0) {
                        var options = {};
                        if (step.data.button) {
                            options.which = options.button = step.data.button;
                        }

                        var handler =  ele[step.eventName];
                        if ((step.eventName == 'click' || step.eventName == 'focus' || step.eventName == 'blur') && handler) {
                          handler();
                        } else {
                          Simulate[step.eventName](ele, options);
                        }
                        ele.value = step.data.value;
                        Simulate.event(ele, 'change');
                    }

                    if (step.eventName == 'keypress') {
                        var key = String.fromCharCode(step.data.keyCode);
                        Simulate.keypress(ele, key);
                        Simulate.keydown(ele, key);

                        ele.value = step.data.value;
                        Simulate.event(ele, 'change');

                        Simulate.keyup(ele, key);
                    }
                } else if (foundTooMany) {
                    console.warn("[WARN] Found more than one element for: " + JSON.stringify(selectors.join(", ")) + " with text " + step.data.text);
                } else if (eles.length === 0) {
                    console.warn("[WARN] Could not find element(" + step.eventName + "): " + JSON.stringify(selectors.join(", ")) + " with text " + step.data.text);
                }

                runNextStep(scenario, idx);
            }
        } else {

        }
    }

    function runNextStep(scenario, idx) {
        if (scenario.steps.length > (idx + 1)) {
            if (scenario.steps[idx].eventName == 'mousemove' || scenario.steps[idx].eventName.indexOf("key") >= 0) {
              runStep(scenario, idx + 1);
            } else {
              timeout = getTimeout(scenario, idx, idx + 1) / 2;

              setTimeout(function() {
                runStep(scenario, idx + 1);
              }, timeout);
            }
        } else {
            utme.stopScenario(true);
        }
    }

    function getTimeout(scenario, firstIndex, secondIndex) {
        return scenario.steps[secondIndex].timeStamp - scenario.steps[firstIndex].timeStamp;
    }

    var utme = {
        init: function() {
          var state = utme.loadState();
          if (state.status === "RUNNING") {
              runNextStep(state.runningScenario, state.runningStep);
          } else {
              state.status = "LOADED";
              utme.saveState(state);
          }
        },
        startRecording: function() {
            localStorage.clear();
            var state = utme.loadState();
            if (state.status != 'STARTED') {
                state.status = 'STARTED';
                state.steps = [];
                utme.saveState(state);
                utme.reportLog("Recording Started");
            }
        },
        runScenario: function(name) {
            var toRun = name || prompt('Scenario to run');
            getScenario(toRun, function(scenario) {
                var state = utme.loadState();
                state.status = "RUNNING";
                utme.saveState(state);

                utme.reportLog("Starting Scenario '" + name + "'", scenario);

                runStep(scenario, 0);
            });
        },
        stopScenario: function(success) {
            var state = utme.loadState();
            var scenario = state.runningScenario;
            delete state.runningStep;
            delete state.runningScenario;
            state.status = "LOADED";

            utme.saveState(state);

            utme.reportLog("Stopping Scenario");

            if (success) {
                utme.reportLog("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
            }
        },
        getStatus: function() {
            return utme.loadState().status;
        },
        findSelectors: function (element) {
            var selectors = $(element).selectorator().generate();
            var classes = element.className && element.className.split(" ");
            if (classes && classes.length) {
                var classSelectorString = "";
                for (var i = 0; i < classes.length; i++) {
                    if (classes[i].trim()) {
                        classSelectorString += "." + classes[i];
                    }
                }

                if (classSelectorString) {
                    var testSel = $(classSelectorString);
                    if (testSel.length == 1 && testSel[0] == element) {
                        selectors.unshift(classSelectorString);
                    }
                }
            }
            return selectors;
        },
        registerEvent: function(eventName, data) {
            var state = utme.loadState();
            if (state.status == 'STARTED') {
                state.steps.push({
                    eventName: eventName,
                    timeStamp: new Date().getTime(),
                    data: data
                });
                utme.saveState(state);
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
            var state = utme.loadState();
            var newScenario = {
                name: prompt('Enter scenario name'),
                steps: state.steps
            };
            state.scenarios.push(newScenario);
            state.status = 'NOT_STARTED';

            if (saveHandlers && saveHandlers.length) {
                for (var i = 0; i < saveHandlers.length; i++) {
                    saveHandlers[i](newScenario, utme);
                }
            }

            utme.saveState(state);
            utme.reportLog("Recording Stopped", newScenario);
        },

        loadState: function () {
            var utmeStateStr = localStorage.getItem('utme');
            var state;
            if (utmeStateStr) {
                state = JSON.parse(utmeStateStr);
            } else {
                state = {
                   scenarios: []
                };
                utme.saveState(state);
            }
            return state;
        },

        saveState: function (utmeState) {
            localStorage.setItem('utme', JSON.stringify(utmeState));
        },

        unload: function() {
            var state = utme.loadState();
            state.status = 'NOT_STARTED';
            utme.saveState(state);
        }
    };

    function initEventHandlers() {
        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], (function(evt) {
                var handler = function(e) {
                  if (utme.getStatus() == 'STARTED' && e.target.hasAttribute && !e.target.hasAttribute('data-ignore')) {
                      if ((evt == 'mousedown' || evt == 'click') && validating) {
                          e.stopPropagation();
                          utme.registerEvent('validate', {
                              selectors: utme.findSelectors(e.target),
                              text: $(e.target).text()
                          });
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
            if (utme.getStatus() == 'STARTED' && !e.target.hasAttribute('data-ignore')) {
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

    function updateButtonText(ele, boolVal, ifTrue, ifFalse) {
        ele.innerHTML = boolVal ? ifTrue : ifFalse;
    }

    function initControls() {
        document.body.appendChild(createButton('Record Scenario', 'start', function() {
            var status = utme.getStatus();
            if (status == 'STARTED') {
                utme.stopRecording();
            } else {
                utme.startRecording();
            }

            updateButtonText(this, status == 'STARTED', 'Record Scenario', 'Stop Recording');
        }));
        document.body.appendChild(createButton('Run Scenario', 'run', function() { utme.runScenario(); }));

        document.body.appendChild(createButton('Verify', 'verify', function() {
              var status = utme.getStatus();
              if (status == 'STARTED') {
                  validating = !validating;
              }
        }));
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

            updateButtonText(this, utme.getStatus() != 'STARTED', 'Record Scenario', 'Stop Recording');

            initControls();
            initEventHandlers();

            var state = utme.loadState();
            if (state.status == 'LOADED') {
                var scenario = getParameterByName('utme_scenario');
                if (scenario) {
                    setTimeout(function() {
                        utme.runScenario(scenario);
                    }, 500);
                }
            } else if (state.status == 'STARTED') {
                utme.registerEvent("load", {
                    url: window.location
                });
            }
        }

    });

    window.addEventListener('beforeunload', function() {
        utme.unload();
    });

    window.addEventListener('error', function(errorMessage) {
        utme.reportLog("Script Error: " + errorMsg);
    });

    global.utme = utme;

})(this, Simulate);
