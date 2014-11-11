(function(global, selectorGenerator, Simulate) {
    var myGenerator = new CssSelectorGenerator();
    var saveHandlers = [];

    function getScenario(name) {
        var state = utme.loadState();
        for (var i = 0; i < state.scenarios.length; i++) {
            if (state.scenarios[i].name == name) {
                return state.scenarios[i];
            }
        }
    }

    var events = [
      'click',
      'focus',
      'blur',
      'dblclick',
      // 'input',
      'mousedown',
      // 'mousemove',
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
                for (var k in selectors) {
                    eles = document.querySelectorAll(selectors[k]);
                    if (eles.length > 0) {
                      break;
                    }
                }

                if (eles.length > 1) {
                    alert("FOUND MORE THAN ONE ELEMENT");
                } else {
                    var ele = eles[0];
                    if (events.indexOf(step.eventName) >= 0) {
                        Simulate[step.eventName](ele);
                        ele.value = step.data.value;
                    }

                    if (step.eventName == 'keypress') {
                        Simulate.keypress(ele, 'keypress', { keyCode: step.data.keyCode });
                        Simulate.keypress(ele, 'keydown', { keyCode: step.data.keyCode });

                        ele.value = step.data.value;

                        Simulate.keypress(ele, 'keyup', { keyCode: step.data.keyCode });
                    }

                    runStep(scenario, idx + 1);
                }
            }
        } else {

        }
    }

    var utme = {
        init: function() {
          var state = utme.loadState();
          if (state.status === "RUNNING") {
              runStep(state.runningScenario, state.runningStep + 1);
          }
        },
        startRecording: function() {
            var state = utme.loadState();
            if (state.status != 'STARTED') {
                state.status = 'STARTED';
                state.steps = [];
                utme.saveState(state);
            }
        },
        runScenario: function() {
            var toRun = prompt('Scenario to run');
            var scenario = getScenario(toRun);
            var state = utme.loadState();
            state.status = "RUNNING";
            utme.saveState(state);

            runStep(scenario, 0);
        },
        getStatus: function() {
            return utme.loadState().status;
        },
        findSelectors: function (element) {
            return myGenerator.getAllSelectors(element);
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
        registerSaveHandler: function (handler) {
            saveHandlers.push(handler);
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
        }
    };

    for (var i = 0; i < events.length; i++) {
        document.addEventListener(events[i], (function(evt) {
            return function(e) {
              if (!e.target.hasAttribute('data-ignore')) {
                  utme.registerEvent(evt, {
                      selectors: utme.findSelectors(e.target),
                      value: e.target.value
                  });
              }
            };
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
        if (!e.target.hasAttribute('data-ignore')) {
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

    function createButton(text, classes, callback) {
        var button = document.createElement('a');
        button.className = 'utme-button ' + classes;
        button.setAttribute('data-ignore', true);
        button.innerHTML = text;
        button.addEventListener('click', callback);
        return button;
    }

    function initControls() {
        document.body.appendChild(createButton('Record Scenario', 'start', function() {
            var status = utme.getStatus();
            if (status == 'STARTED') {
                utme.stopRecording();
                this.innerHTML = "Record Scenario";
            } else {
                utme.startRecording();
                this.innerHTML = "Stop Recording";
            }
        }));
        document.body.appendChild(createButton('Run Scenario', 'run', utme.runScenario));
    }

    document.addEventListener('readystatechange', function() {
        if (document.readyState == "complete") {
            initControls();

            utme.init();
            utme.registerEvent("load", {
                url: window.location
            });
        }
    });

    global.utme = utme;

})(this, CssSelectorGenerator, Simulate);
