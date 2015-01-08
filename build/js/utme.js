(function(){
function extend(dst, src){
    for (var key in src)
        dst[key] = src[key];
    return src;
}

var Simulate = {
    event: function(element, eventName, options){
        var evt;
        if (document.createEvent) {
            evt = document.createEvent("HTMLEvents");
            evt.initEvent(eventName, eventName != 'mouseenter' && eventName != 'mouseleave', true );
            extend(evt, options);
            element.dispatchEvent(evt);
        }else{
            evt = document.createEventObject();
            element.fireEvent('on' + eventName,evt);
        }
    },
    keyEvent: function(element, type, options){
        var evt,
            e = {
                bubbles: true, cancelable: true, view: window,
                ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
                keyCode: 0, charCode: 0
            };
        extend(e, options);
        if (document.createEvent){
            try{
                evt = document.createEvent('KeyEvents');
                evt.initKeyEvent(
                    type, e.bubbles, e.cancelable, e.view,
            e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
            e.keyCode, e.charCode);
          element.dispatchEvent(evt);
        }catch(err){
            evt = document.createEvent("Events");
        evt.initEvent(type, e.bubbles, e.cancelable);
        extend(evt, {
            view: e.view,
          ctrlKey: e.ctrlKey, altKey: e.altKey,
          shiftKey: e.shiftKey, metaKey: e.metaKey,
          keyCode: e.keyCode, charCode: e.charCode
        });
        element.dispatchEvent(evt);
        }
        }
    }
};

Simulate.keypress = function(element, chr){
    var charCode = chr.charCodeAt(0);
    this.keyEvent(element, 'keypress', {
        keyCode: charCode,
        charCode: charCode
    });
};

Simulate.keydown = function(element, chr){
    var charCode = chr.charCodeAt(0);
    this.keyEvent(element, 'keydown', {
        keyCode: charCode,
        charCode: charCode
    });
};

Simulate.keyup = function(element, chr){
    var charCode = chr.charCodeAt(0);
    this.keyEvent(element, 'keyup', {
        keyCode: charCode,
        charCode: charCode
    });
};

var events = [
    'click',
    'focus',
    'blur',
    'dblclick',
    'input',
    'change',
    'mousedown',
    'mousemove',
    'mouseout',
    'mouseover',
    'mouseup',
    'mouseenter',
    'mouseleave',
    'resize',
    'scroll',
    'select',
    'submit',
    'load',
    'unload'
];

for (var i = events.length; i--;){
    var event = events[i];
    Simulate[event] = (function(evt){
        return function(element, options){
            this.event(element, evt, options);
        };
    }(event));
}

if (typeof module !== 'undefined'){
    module.exports = Simulate;
}else if (typeof window !== 'undefined'){
    window.Simulate = Simulate;
}else if (typeof define !== 'undefined'){
    define(function(){ return Simulate; });
}

})();

(function(global) {

  /**
  * Generate unique CSS selector for given DOM element
  *
  * @param {Element} el
  * @return {String}
  * @api private
  */

  function unique(el, doc) {
    if (!el || !el.tagName) {
      throw new TypeError('Element expected');
    }

    // var topElement = el;
    // while (topElement.parentElement != null) {
    //     topElement = topElement.parentElement;
    // }

    function isUnique(selectors) {
      return doc.querySelectorAll(mkSelectorString(selectors)).length == 1;
    }

    var selectors  = getSelectors(el, isUnique);

    function mkSelectorString(selectors) {
      return selectors.map(function (sel) {
        return sel.selector;
      }).join(" > ");
    }

    // if (!isUnique(selectors)) {
    //   for (var i = selectors.length - 1; i >= 0; i--) {
    //     var childIndex = [].indexOf.call(selectors[i].element.parentNode.children, selectors[i].element);
    //
    //     selectors[i].selector = selectors[i].selector + ':nth-child(' + (childIndex + 1) + ')';
    //
    //     if (isUnique(selectors)) {
    //       break;
    //     }
    //   }
    // }

    var existingIndex = 0;
    var items =  doc.querySelectorAll(mkSelectorString(selectors));

    for (var i = 0; i < items.length; i++) {
      if (items[i] === el) {
        existingIndex = i;
        break;
      }
    }

    return mkSelectorString(selectors) + ":eq(" + existingIndex + ")";
  };

  /**
  * Get class names for an element
  *
  * @pararm {Element} el
  * @return {Array}
  */

  function getClassNames(el) {
    var className = el.getAttribute('class');
    className = className && className.replace('utme-verify', '');
    className = className && className.replace('utme-ready', '');

    if (!className || (!className.trim().length)) { return []; }

    // remove duplicate whitespace
    className = className.replace(/\s+/g, ' ');

    // trim leading and trailing whitespace
    className = className.replace(/^\s+|\s+$/g, '');

    // split into separate classnames
    return className.trim().split(' ');
  }

  /**
  * CSS selectors to generate unique selector for DOM element
  *
  * @param {Element} el
  * @return {Array}
  * @api prviate
  */

  function getSelectors(el, isUnique) {
    var parts = [];
    var label = null;
    var title = null;
    var alt   = null;
    var name  = null;
    var value = null;
    var me = el;

    // do {

    // IDs are unique enough
    if (el.id) {
      label = '[id=\'' + el.id + "\']";
    } else {
      // Otherwise, use tag name
      label     = el.tagName.toLowerCase();

      var classNames = getClassNames(el);

      // Tag names could use classes for specificity
      if (classNames.length) {
        label += '.' + classNames.join('.');
      }
    }

    // Titles & Alt attributes are very useful for specificity and tracking
    if (title = el.getAttribute('title')) {
      label += '[title="' + title + '"]';
    } else if (alt = el.getAttribute('alt')) {
      label += '[alt="' + alt + '"]';
    } else if (name = el.getAttribute('name')) {
      label += '[name="' + name + '"]';
    }

    if (value = el.getAttribute('value')) {
      label += '[value="' + value + '"]';
    }

    // if (el.innerText.length != 0) {
    //   label += ':contains(' + el.innerText + ')';
    // }

    parts.unshift({
      element: el,
      selector: label
    });

    // if (isUnique(parts)) {
    //     break;
    // }

    // } while (!el.id && (el = el.parentNode) && el.tagName);

    // Some selectors should have matched at least
    if (!parts.length) {
      throw new Error('Failed to identify CSS selector');
    }
    return parts;
  }

  global.selectorFinder = unique;

})(this);

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

(function (utme) {

    function createButton(text, classes, callback) {
        var button = document.createElement('a');
        button.className = 'utme-button ' + classes;
        button.setAttribute('data-ignore', true);
        button.innerHTML = text;
        button.addEventListener('click', callback);
        return button;
    }

    function toggleHighlight(ele, value) {
        $(ele).toggleClass('utme-verify', value);
    }


    function updateButton(ele, text, disabled) {
        if (disabled) {
            ele.className = ele.className + " " + "disabled";
        } else {
            ele.className = (ele.className || "").replace(/ disabled/g, "");
        }

        ele.innerHTML = text;
    }

    function initEventListeners() {
        var events = ['mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'click'];

        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], (function (evt) {
                var handler = function (e) {
                    if (e.isTrigger)
                        return;

                    if (utme.isValidating() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore') && $(e.target).parents("[data-ignore]").length == 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        if (evt == 'mouseover') {
                            toggleHighlight(e.target, true);
                        }
                        if (evt == 'mouseout') {
                            toggleHighlight(e.target, false);
                        }
                        if (evt == 'mousedown') {
                            utme.registerEvent('validate', {
                                locator: utme.createElementLocator(e.target),
                                text: $(e.target).text()
                            });
                        }
                        return false;
                    }
                };
                return handler;
            })(events[i]), true);
        }
    }

    function createLabeledInput(text, classes) {
        var div = document.createElement("div");
        var label = document.createElement("label");
        var input = document.createElement("input");
        input.type = 'text';

        label.innerHTML = "<span>" + text + "</span>";
        div.appendChild(label);

        var inputDiv = document.createElement("div");
        inputDiv.appendChild(input);

        div.appendChild(inputDiv);

        div.className = 'utme-input ' + classes;

        return div;
    }

    function createLabeledTextArea(text, classes) {
      var div = document.createElement("div");
      var label = document.createElement("label");
      var input = document.createElement("textarea");
      label.innerHTML = "<span>" + text + "</span>";
      div.appendChild(label);

      var inputDiv = document.createElement("div");
      inputDiv.appendChild(input);

      div.appendChild(inputDiv);

      div.className = 'utme-input ' + classes;

      return div;
    }

    function showScenarioForm(callback) {
        var form = document.createElement('div');
        form.className = 'utme-scenario-form';
        form.setAttribute('data-ignore', true);

        var nameInput = createLabeledInput('Scenario Name:', '');
        form.appendChild(nameInput);

        var descriptionInput = createLabeledTextArea('Description (Optional):', '');
        form.appendChild(descriptionInput);

        var setupInput = createLabeledTextArea('Setup Scenarios (Optional, Newline separated):', '');
        form.appendChild(setupInput);

        form.appendChild(createButton('Save', 'okButton', function(e) {
          var name = nameInput.querySelector("input").value;
          var description = descriptionInput.querySelector("textarea").value;
          var setup = setupInput.querySelector("textarea").value;

          var info = {};
          if (name) {
              info.name = name;
          }

          if (description) {
              info.description = description;
          }

          if (setup) {
              info.setup = {
                  scenarios: setup.split("\n")
              };
          }

          e.stopPropagation();
          callback(info);
        }));

        form.appendChild(createButton('Cancel', 'cancelButton', function(e) {
          e.stopPropagation();
          callback();
        }));

        var overlay = document.createElement('div');
        overlay.className = 'utme-scenario-form-background';
        overlay.setAttribute('data-ignore', true);

        document.body.appendChild(overlay);
        document.body.appendChild(form);
        return overlay;
    }

    function destroyScenarioForm() {
        var form = document.querySelectorAll('.utme-scenario-form')[0];
        var overlay = document.querySelectorAll('.utme-scenario-form-background')[0];

        form.parentNode.removeChild(form);
        overlay.parentNode.removeChild(overlay);
    }

    function initControls() {
        initEventListeners();

        var buttonBar = document.createElement('div');
        buttonBar.className = 'utme-bar';
        buttonBar.setAttribute('data-ignore', true);

        function updateButtonStates() {
            updateButton(recordButton, utme.isRecording() || utme.isValidating() ? 'Stop Recording' : 'Record Scenario', utme.isPlaying());
            updateButton(runButton, utme.isPlaying() ? 'Stop Running' : 'Run Scenario', utme.isValidating() || utme.isRecording());
            updateButton(validateButton, utme.isValidating() ? 'Done Validating' : 'Validate', !(utme.isRecording() || utme.isValidating()));
            updateButton(timeoutButton, 'Add Timeout', !utme.isRecording());
            updateButton(pauseButton, utme.state.autoRun ? 'Pause' : "Resume", !utme.isPlaying());
            updateButton(stepButton, 'Step', !utme.isPlaying() || utme.state.autoRun);
        }

        utme.registerListener(updateButtonStates);

        var pauseButton = createButton('Pause', 'pause', function () {
            utme.state.autoRun = !utme.state.autoRun;
        });

        var stepButton = createButton('Step', 'stepButton', function (e) {
            utme.runNextStep(utme.state.runningScenario, utme.state.runningStep);
            return false;
        });

        var timeoutButton = createButton('Add Timeout', 'timeout', function () {
            var oldStatus = utme.isRecording();
            if (oldStatus) {
                utme.registerEvent('timeout', {
                    amount: parseInt(prompt("How long in ms?"), 10)
                });
            }
        });

        var recordButton = createButton('Record Scenario', 'start', function () {
            if (utme.isRecording() || utme.isValidating()) {
                if (utme.isValidating()) {
                    utme.isValidating(false);
                }
                showScenarioForm(function(info, form) {
                    destroyScenarioForm();
                    utme.stopRecording(info ? info : false);
                });
            } else {
                utme.startRecording();
            }
        });

        var runButton = createButton('Run Scenario', 'run', function () {
            if (!(utme.isRecording() || utme.isPlaying() || utme.isValidating())) {
                utme.runScenario();
            } else {
                utme.stopScenario(false);
            }
        });

        var validateButton = createButton('Validate', 'verify', function () {
            var isValidating = utme.isValidating();
            if (utme.isRecording() || isValidating) {
                if (isValidating) {
                    toggleHighlight($('.utme-verify'), false);
                }
                utme.isValidating(!isValidating);
            }

            updateButtonStates();
        });

        updateButtonStates();

        buttonBar.appendChild(recordButton);
        buttonBar.appendChild(timeoutButton);
        buttonBar.appendChild(validateButton);
        buttonBar.appendChild(runButton);
        buttonBar.appendChild(pauseButton);
        buttonBar.appendChild(stepButton);

        document.body.appendChild(buttonBar);
    }

    if (utme) {
        if (!utme.state || utme.state.status != 'INITIALIZED') {
            utme.registerListener(function(eventName) {
                if (eventName == 'INITIALIZED') {
                    initControls();
                }
            });
        } else {
            initControls();
        }
    }
})(window.utme);

/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 2014-08-29
 *
 * By Eli Grey, http://eligrey.com
 * License: X11/MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs
  // IE 10+ (native saveAs)
  || (typeof navigator !== "undefined" &&
      navigator.msSaveOrOpenBlob && navigator.msSaveOrOpenBlob.bind(navigator))
  // Everyone else
  || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof navigator !== "undefined" &&
	    /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = doc.createEvent("MouseEvents");
			event.initMouseEvent(
				"click", true, false, view, 0, 0, 0, 0, 0
				, false, false, false, false, 0, null
			);
			node.dispatchEvent(event);
		}
		, webkit_req_fs = view.webkitRequestFileSystem
		, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		, fs_min_size = 0
		// See https://code.google.com/p/chromium/issues/detail?id=375297#c7 for
		// the reasoning behind the timeout and revocation flow
		, arbitrary_revoke_timeout = 10
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			if (view.chrome) {
				revoker();
			} else {
				setTimeout(revoker, arbitrary_revoke_timeout);
			}
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, FileSaver = function(blob, name) {
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, blob_changed = false
				, object_url
				, target_view
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					// don't create more object URLs than needed
					if (blob_changed || !object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (target_view) {
						target_view.location.href = object_url;
					} else {
						var new_tab = view.open(object_url, "_blank");
						if (new_tab == undefined && typeof safari !== "undefined") {
							//Apple do not allow window.open, see http://bit.ly/1kZffRI
							view.location.href = object_url
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
				, abortable = function(func) {
					return function() {
						if (filesaver.readyState !== filesaver.DONE) {
							return func.apply(this, arguments);
						}
					};
				}
				, create_if_not_found = {create: true, exclusive: false}
				, slice
			;
			filesaver.readyState = filesaver.INIT;
			if (!name) {
				name = "download";
			}
			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				save_link.href = object_url;
				save_link.download = name;
				click(save_link);
				filesaver.readyState = filesaver.DONE;
				dispatch_all();
				revoke(object_url);
				return;
			}
			// Object and web filesystem URLs have a problem saving in Google Chrome when
			// viewed in a tab, so I force save with application/octet-stream
			// http://code.google.com/p/chromium/issues/detail?id=91158
			// Update: Google errantly closed 91158, I submitted it again:
			// https://code.google.com/p/chromium/issues/detail?id=389642
			if (view.chrome && type && type !== force_saveable_type) {
				slice = blob.slice || blob.webkitSlice;
				blob = slice.call(blob, 0, blob.size, force_saveable_type);
				blob_changed = true;
			}
			// Since I can't be sure that the guessed media type will trigger a download
			// in WebKit, I append .download to the filename.
			// https://bugs.webkit.org/show_bug.cgi?id=65440
			if (webkit_req_fs && name !== "download") {
				name += ".download";
			}
			if (type === force_saveable_type || webkit_req_fs) {
				target_view = view;
			}
			if (!req_fs) {
				fs_error();
				return;
			}
			fs_min_size += blob.size;
			req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
				fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
					var save = function() {
						dir.getFile(name, create_if_not_found, abortable(function(file) {
							file.createWriter(abortable(function(writer) {
								writer.onwriteend = function(event) {
									target_view.location.href = file.toURL();
									filesaver.readyState = filesaver.DONE;
									dispatch(filesaver, "writeend", event);
									revoke(file);
								};
								writer.onerror = function() {
									var error = writer.error;
									if (error.code !== error.ABORT_ERR) {
										fs_error();
									}
								};
								"writestart progress write abort".split(" ").forEach(function(event) {
									writer["on" + event] = filesaver["on" + event];
								});
								writer.write(blob);
								filesaver.abort = function() {
									writer.abort();
									filesaver.readyState = filesaver.DONE;
								};
								filesaver.readyState = filesaver.WRITING;
							}), fs_error);
						}), fs_error);
					};
					dir.getFile(name, {create: false}, abortable(function(file) {
						// delete file if it already exists
						file.remove();
						save();
					}), abortable(function(ex) {
						if (ex.code === ex.NOT_FOUND_ERR) {
							save();
						} else {
							fs_error();
						}
					}));
				}), fs_error);
			}), fs_error);
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name) {
			return new FileSaver(blob, name);
		}
	;
	FS_proto.abort = function() {
		var filesaver = this;
		filesaver.readyState = filesaver.DONE;
		dispatch(filesaver, "abort");
	};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module !== null) {
  module.exports = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
  define([], function() {
    return saveAs;
  });
}

(function(utme) {
    utme.registerSaveHandler(function (scenario, utme) {
       var blob = new Blob([JSON.stringify(scenario, null, " ")], {type: "text/plain;charset=utf-8"});
       saveAs(blob, scenario.name + ".json");
    });
})(utme);

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

                contentType: "application/json; charset=utf-8",

                crossDomain: true,

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
              data: JSON.stringify(scenario, null, " "),
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
