(function() {
    !function($) {
        var Selectorator, clean, contains, escapeSelector, extend, inArray, map, unique;
        return map = $.map, extend = $.extend, inArray = $.inArray, contains = function(item, array) {
            return -1 !== inArray(item, array);
        }, escapeSelector = function(selector) {
            return selector.replace(/([\!\"\#\$\%\&'\(\)\*\+\,\.\/\:\;<\=>\?\@\[\\\]\^\`\{\|\}\~])/g, "\\$1");
        }, clean = function(arr, reject) {
            return map(arr, function(item) {
                return item === reject ? null : item;
            });
        }, unique = function(arr) {
            return map(arr, function(item, index) {
                return parseInt(index, 10) === parseInt(arr.indexOf(item), 10) ? item : null;
            });
        }, Selectorator = function() {
            function Selectorator(element, options) {
                this.element = element, this.options = extend(extend({}, $.selectorator.options), options), 
                this.cachedResults = {};
                var parent = element.parent();
                null != parent[0] && parent[0].nodeType <= 8 && (parent = $(parent[0])), this.topElement = parent;
            }
            return Selectorator.prototype.query = function(selector) {
                var _base;
                return (_base = this.cachedResults)[selector] || (_base[selector] = this.topElement[0] && this.topElement[0].querySelectorAll(selector.replace(/#([^\s]+)/g, "[id='$1']")) || []);
            }, Selectorator.prototype.getProperTagName = function() {
                return this.element[0] ? this.element[0].tagName.toLowerCase() : null;
            }, Selectorator.prototype.hasParent = function() {
                return this.element && 0 < this.element.parent().size();
            }, Selectorator.prototype.isElement = function() {
                var node;
                return node = this.element[0], node && node.nodeType === node.ELEMENT_NODE;
            }, Selectorator.prototype.validate = function(selector, parentSelector, single, isFirst) {
                var delimiter, element;
                if (null == single && (single = !0), null == isFirst && (isFirst = !1), element = this.query(selector), 
                single && 1 < element.length || !single && 0 === element.length) {
                    if (!parentSelector || -1 !== selector.indexOf(":")) return null;
                    if (delimiter = isFirst ? " > " : " ", selector = parentSelector + delimiter + selector, 
                    element = this.query(selector), single && 1 < element.length || !single && 0 === element.length) return null;
                }
                return contains(this.element[0], element) ? selector : null;
            }, Selectorator.prototype.generate = function() {
                var fn, res, _i, _len, _ref;
                if (!this.element || !this.isElement()) return [ "" ];
                for (res = [], _ref = [ this.generateSimple ], this.hasParent() && (_ref.push(this.generateAncestor), 
                _ref.push(this.generateRecursive)), _i = 0, _len = _ref.length; _len > _i; _i++) if (fn = _ref[_i], 
                res = unique(clean(fn.call(this))), res && res.length > 0) return res;
                return unique(res);
            }, Selectorator.prototype.generateAncestor = function() {
                var isFirst, parent, parentSelector, parentSelectors, results, selector, selectors, _i, _j, _k, _len, _len1, _len2, _ref;
                for (results = [], _ref = this.element.parents(), _i = 0, _len = _ref.length; _len > _i; _i++) {
                    for (parent = _ref[_i], isFirst = !0, selectors = this.generateSimple(null, !1), 
                    _j = 0, _len1 = selectors.length; _len1 > _j; _j++) for (selector = selectors[_j], 
                    parentSelectors = new Selectorator($(parent), this.options).generateSimple(null, !1), 
                    _k = 0, _len2 = parentSelectors.length; _len2 > _k; _k++) parentSelector = parentSelectors[_k], 
                    $.merge(results, this.generateSimple(parentSelector, !0, isFirst));
                    isFirst = !1;
                }
                return results;
            }, Selectorator.prototype.generateSimple = function(parentSelector, single, isFirst) {
                var fn, res, self, tagName, validate, _i, _len, _ref;
                for (self = this, tagName = self.getProperTagName(), validate = function(selector) {
                    return self.validate(selector, parentSelector, single, isFirst);
                }, _ref = [ [ self.getIdSelector ], [ self.getClassSelector ], [ self.getIdSelector, !0 ], [ self.getClassSelector, !0 ], [ self.getNameSelector ], [ function() {
                    return [ self.getProperTagName() ];
                } ] ], _i = 0, _len = _ref.length; _len > _i; _i++) if (fn = _ref[_i], res = fn[0].call(self, fn[1]) || [], 
                res = clean(map(res, validate)), res.length > 0) return res;
                return [];
            }, Selectorator.prototype.generateRecursive = function() {
                var index, parent, parentSelector, selector;
                return selector = this.getProperTagName(), -1 !== selector.indexOf(":") && (selector = "*"), 
                parent = this.element.parent(), parentSelector = new Selectorator(parent).generate()[0], 
                index = parent.children(selector).index(this.element), selector = "" + selector + ":eq(" + index + ")", 
                "" !== parentSelector && (selector = parentSelector + " > " + selector), [ selector ];
            }, Selectorator.prototype.generateRecursiveSimple = function() {
                var index, parent, parentSelector, selector;
                return selector = this.getProperTagName(), -1 !== selector.indexOf(":") && (selector = "*"), 
                parent = this.element.parent(), null != parent[0] && parent[0].nodeType <= 8 && (parentSelector = new Selectorator(parent).generateRecursiveSimple()[0]), 
                index = parent.children(selector).index(this.element), selector = "" + selector + ":eq(" + index + ")", 
                "" !== parentSelector && (selector = (parentSelector ? parentSelector + " > " : "") + selector), 
                [ selector ];
            }, Selectorator.prototype.getIdSelector = function(tagName) {
                var id;
                return null == tagName && (tagName = !1), tagName = tagName ? this.getProperTagName() : "", 
                id = this.element.attr("id"), "string" != typeof id || contains(id, this.getIgnore("id")) ? null : [ "" + tagName + "#" + escapeSelector(id) ];
            }, Selectorator.prototype.getClassSelector = function(tagName) {
                var classes, invalidClasses, tn;
                return null == tagName && (tagName = !1), tn = this.getProperTagName(), /^(body|html)$/.test(tn) ? null : (tagName = tagName ? tn : "", 
                invalidClasses = this.getIgnore("class"), classes = (this.element.attr("class") || "").replace(/\{.*\}/, "").split(/\s/), 
                map(classes, function(klazz) {
                    return klazz && !contains(klazz, invalidClasses) ? "" + tagName + "." + escapeSelector(klazz) : null;
                }));
            }, Selectorator.prototype.getNameSelector = function() {
                var name, tagName;
                return tagName = this.getProperTagName(), name = this.element.attr("name"), name && !contains(name, this.getIgnore("name")) ? [ "" + tagName + "[name='" + name + "']" ] : null;
            }, Selectorator.prototype.getIgnore = function(key) {
                var mulkey, opts, vals;
                return opts = this.options.ignore || {}, mulkey = "class" === key ? "classes" : "" + key + "s", 
                vals = opts[key] || opts[mulkey], "string" == typeof vals ? [ vals ] : vals;
            }, Selectorator;
        }(), $.selectorator = {
            options: {},
            unique: unique,
            clean: clean,
            escapeSelector: escapeSelector
        }, $.fn.selectorator = function(options) {
            return new Selectorator($(this), options);
        }, $.fn.getSelector = function(options) {
            return this.selectorator(options).generate();
        }, this;
    }(jQuery);
}).call(this), function() {
    function extend(dst, src) {
        for (var key in src) dst[key] = src[key];
        return src;
    }
    var Simulate = {
        event: function(element, eventName, options) {
            var evt;
            document.createEvent ? (evt = document.createEvent("HTMLEvents"), evt.initEvent(eventName, "mouseenter" != eventName && "mouseleave" != eventName, !0), 
            extend(evt, options), element.dispatchEvent(evt)) : (evt = document.createEventObject(), 
            element.fireEvent("on" + eventName, evt));
        },
        keyEvent: function(element, type, options) {
            var evt, e = {
                bubbles: !0,
                cancelable: !0,
                view: window,
                ctrlKey: !1,
                altKey: !1,
                shiftKey: !1,
                metaKey: !1,
                keyCode: 0,
                charCode: 0
            };
            if (extend(e, options), document.createEvent) try {
                evt = document.createEvent("KeyEvents"), evt.initKeyEvent(type, e.bubbles, e.cancelable, e.view, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.keyCode, e.charCode), 
                element.dispatchEvent(evt);
            } catch (err) {
                evt = document.createEvent("Events"), evt.initEvent(type, e.bubbles, e.cancelable), 
                extend(evt, {
                    view: e.view,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    keyCode: e.keyCode,
                    charCode: e.charCode
                }), element.dispatchEvent(evt);
            }
        }
    };
    Simulate.keypress = function(element, chr) {
        var charCode = chr.charCodeAt(0);
        this.keyEvent(element, "keypress", {
            keyCode: charCode,
            charCode: charCode
        });
    }, Simulate.keydown = function(element, chr) {
        var charCode = chr.charCodeAt(0);
        this.keyEvent(element, "keydown", {
            keyCode: charCode,
            charCode: charCode
        });
    }, Simulate.keyup = function(element, chr) {
        var charCode = chr.charCodeAt(0);
        this.keyEvent(element, "keyup", {
            keyCode: charCode,
            charCode: charCode
        });
    };
    for (var events = [ "click", "focus", "blur", "dblclick", "input", "change", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "mouseenter", "mouseleave", "resize", "scroll", "select", "submit", "load", "unload" ], i = events.length; i--; ) {
        var event = events[i];
        Simulate[event] = function(evt) {
            return function(element, options) {
                this.event(element, evt, options);
            };
        }(event);
    }
    "undefined" != typeof module ? module.exports = Simulate : "undefined" != typeof window ? window.Simulate = Simulate : "undefined" != typeof define && define(function() {
        return Simulate;
    });
}(), function(global, Simulate) {
    function getScenario(name, callback) {
        if (0 == loadHandlers.length) for (var state = utme.state, i = 0; i < state.scenarios.length; i++) state.scenarios[i].name == name && callback(state.scenarios[i]); else loadHandlers[0](name, callback);
    }
    function runStep(scenario, idx) {
        utme.broadcast("RUNNING_STEP");
        var step = scenario.steps[idx], state = utme.state;
        if (step && "PLAYING" == state.status) if (state.runningScenario = scenario, state.runningStep = idx, 
        utme.saveStateToStorage(state), "load" == step.eventName) window.location = step.data.url.href; else if ("timeout" == step.eventName) setTimeout(function() {
            state.autoRun && runNextStep(scenario, idx);
        }, step.data.amount); else {
            var locator = step.data.locator;
            tryUntilFound(locator, function(eles) {
                var ele = eles[0];
                if (events.indexOf(step.eventName) >= 0) {
                    var options = {};
                    step.data.button && (options.which = options.button = step.data.button), "click" == step.eventName ? $(ele).trigger("click") : "focus" != step.eventName && "blur" != step.eventName || !ele[step.eventName] ? Simulate[step.eventName](ele, options) : ele[step.eventName](), 
                    "undefined" != typeof step.data.value && (ele.value = step.data.value, Simulate.event(ele, "change"));
                }
                if ("keypress" == step.eventName) {
                    var key = String.fromCharCode(step.data.keyCode);
                    Simulate.keypress(ele, key), Simulate.keydown(ele, key), ele.value = step.data.value, 
                    Simulate.event(ele, "change"), Simulate.keyup(ele, key);
                }
                state.autoRun && runNextStep(scenario, idx);
            }, function() {
                "validate" == step.eventName ? (utme.reportError("Could not find appropriate element for selectors: " + JSON.stringify(locator.selectors) + " for event " + step.eventName), 
                utme.stopScenario()) : (utme.reportLog("Could not find appropriate element for selectors: " + JSON.stringify(locator.selectors) + " for event " + step.eventName), 
                state.autoRun && runNextStep(scenario, idx));
            }, 500, step.data.text);
        }
    }
    function tryUntilFound(locator, callback, fail, timeout, textToCheck) {
        function tryFind(delay) {
            var eles, foundTooMany = !1, foundValid = !1, uniqueId = locator.uniqueId, selectorsToTest = locator.selectors.slice(0);
            uniqueId && selectorsToTest.unshift("[data-unique-id='" + uniqueId + "']");
            for (var i = 0; i < selectorsToTest.length; i++) {
                if (eles = $(selectorsToTest[i] + ":visible"), 1 == eles.length) {
                    if ("undefined" == typeof textToCheck) {
                        foundValid = !0;
                        break;
                    }
                    var newText = $(eles[0]).text();
                    if (newText == textToCheck) {
                        foundValid = !0;
                        break;
                    }
                    break;
                }
                eles.length > 1 && (foundTooMany = !0);
            }
            foundValid ? (eles.attr("data-unique-id", uniqueId), callback(eles)) : new Date().getTime() - started < timeout ? setTimeout(tryFind, delay) : fail();
        }
        var started = new Date().getTime();
        tryFind(20);
    }
    function runNextStep(scenario, idx) {
        scenario.steps.length > idx + 1 ? "mousemove" == scenario.steps[idx].eventName || scenario.steps[idx].eventName.indexOf("key") >= 0 || "verify" == scenario.steps[idx].eventName ? runStep(scenario, idx + 1) : (timeout = getTimeout(scenario, idx, idx + 1), 
        setTimeout(function() {
            runStep(scenario, idx + 1);
        }, timeout)) : utme.stopScenario(!0);
    }
    function getTimeout(scenario, firstIndex, secondIndex) {
        return scenario.steps[secondIndex].timeStamp - scenario.steps[firstIndex].timeStamp;
    }
    function fragmentFromString(strHTML) {
        var temp = document.createElement("template");
        return temp.innerHTML = strHTML, temp.content;
    }
    function simplifySteps(steps) {
        for (var eleStack = [], i = 0; i < steps.length; i++) {
            var step = steps[i], locator = step && step.data.locator, selector = locator.selectors[0];
            if (selector && selector.doc) {
                var frag = fragmentFromString(selector.doc), ele = frag.querySelectorAll("[data-unique-id='" + selector.id + "']");
                locator.selectors = [ unique(ele[0]) ];
            }
            "mouseenter" == step.eventName ? eleStack.push({
                idx: i,
                step: step
            }) : "mouseleave" == step.eventName;
        }
    }
    function toggleHighlight(ele, value) {
        $(ele).toggleClass("utme-verify", value);
    }
    function initEventHandlers() {
        for (var i = 0; i < events.length; i++) document.addEventListener(events[i], function(evt) {
            var handler = function(e) {
                if ("RECORDING" == utme.getStatus() && e.target.hasAttribute && !e.target.hasAttribute("data-ignore")) {
                    if (validating) return e.stopPropagation(), e.preventDefault(), "mouseover" == evt && toggleHighlight(e.target, !0), 
                    "mouseout" == evt && toggleHighlight(e.target, !1), ("click" == evt || "mousedown" == evt) && utme.registerEvent("validate", {
                        locator: utme.createElementLocator(e.target),
                        text: $(e.target).text()
                    }), !1;
                    var args = {
                        locator: utme.createElementLocator(e.target)
                    };
                    (e.which || e.button) && (args.button = e.which || e.button), "change" == evt && (args.value = e.target.value), 
                    utme.registerEvent(evt, args);
                }
            };
            return handler;
        }(events[i]), !0);
        var _to_ascii = {
            "188": "44",
            "109": "45",
            "190": "46",
            "191": "47",
            "192": "96",
            "220": "92",
            "222": "39",
            "221": "93",
            "219": "91",
            "173": "45",
            "187": "61",
            "186": "59",
            "189": "45"
        }, shiftUps = {
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
            "39": '"',
            "44": "<",
            "46": ">",
            "47": "?"
        };
        document.addEventListener("keypress", function(e) {
            if ("RECORDING" == utme.getStatus() && !e.target.hasAttribute("data-ignore")) {
                var c = e.which;
                _to_ascii.hasOwnProperty(c) && (c = _to_ascii[c]), c = !e.shiftKey && c >= 65 && 90 >= c ? String.fromCharCode(c + 32) : e.shiftKey && shiftUps.hasOwnProperty(c) ? shiftUps[c] : String.fromCharCode(c), 
                utme.registerEvent("keypress", {
                    locator: utme.createElementLocator(e.target),
                    key: c,
                    prevValue: e.target.value,
                    value: e.target.value + c,
                    keyCode: e.keyCode
                });
            }
        }, !0);
    }
    function createButton(text, classes, callback) {
        var button = document.createElement("a");
        return button.className = "utme-button " + classes, button.setAttribute("data-ignore", !0), 
        button.innerHTML = text, button.addEventListener("click", callback), button;
    }
    function updateButton(ele, text, disabled) {
        ele.className = disabled ? ele.className + " disabled" : (ele.className || "").replace(/ disabled/g, ""), 
        ele.innerHTML = text;
    }
    function initControls() {
        function updateButtonStates() {
            var status = utme.getStatus();
            updateButton(recordButton, "RECORDING" == status ? "Stop Recording" : "Record Scenario", validating || "PLAYING" == status), 
            updateButton(runButton, "PLAYING" == status ? "Stop Running" : "Run Scenario", validating || "RECORDING" == status), 
            updateButton(validateButton, validating ? "Done Validating" : "Validate", "RECORDING" != status), 
            updateButton(timeoutButton, "Add Timeout", "RECORDING" != status), updateButton(pauseButton, utme.state.autoRun ? "Pause" : "Resume", "PLAYING" != status), 
            updateButton(stepButton, "Step", "PLAYING" != status || utme.state.autoRun);
        }
        var buttonBar = document.createElement("div");
        buttonBar.className = "utme-bar", buttonBar.setAttribute("data-ignore", !0), utme.registerListener(updateButtonStates);
        var pauseButton = createButton("Pause", "pause", function() {
            utme.state.autoRun = !utme.state.autoRun;
        }), stepButton = createButton("Step", "stepButton", function() {
            return runNextStep(utme.state.runningScenario, utme.state.runningStep), !1;
        }), timeoutButton = createButton("Add Timeout", "timeout", function() {
            var oldStatus = utme.getStatus();
            "RECORDING" == oldStatus && utme.registerEvent("timeout", {
                amount: parseInt(prompt("How long in ms?"), 10)
            });
        }), recordButton = createButton("Record Scenario", "start", function() {
            var oldStatus = utme.getStatus();
            "RECORDING" == oldStatus ? utme.stopRecording() : utme.startRecording();
        }), runButton = createButton("Run Scenario", "run", function() {
            var oldStatus = utme.getStatus();
            "LOADED" == oldStatus ? utme.runScenario() : utme.stopScenario(!1);
        }), validateButton = createButton("Validate", "verify", function() {
            var status = utme.getStatus();
            "RECORDING" == status && (validating = !validating), updateButtonStates();
        });
        updateButtonStates(), buttonBar.appendChild(recordButton), buttonBar.appendChild(timeoutButton), 
        buttonBar.appendChild(validateButton), buttonBar.appendChild(runButton), buttonBar.appendChild(pauseButton), 
        buttonBar.appendChild(stepButton), document.body.appendChild(buttonBar);
    }
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
        return null === results ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    function unique(el) {
        function mkSelectorString(selectors) {
            return selectors.map(function(sel) {
                return sel.selector;
            }).join(" > ");
        }
        function isUnique(selectors) {
            return 1 == topElement.querySelectorAll(mkSelectorString(selectors)).length;
        }
        if (!el || !el.tagName) throw new TypeError("Element expected");
        for (var selectors = getSelectors(el), topElement = el; null != topElement.parentElement; ) topElement = topElement.parentElement;
        if (!isUnique(selectors)) for (var i = selectors.length - 1; i >= 0; i--) {
            var childIndex = [].indexOf.call(selectors[i].element.parentNode.children, selectors[i].element);
            if (selectors[i].selector = selectors[i].selector + ":nth-child(" + (childIndex + 1) + ")", 
            isUnique(selectors)) break;
        }
        return mkSelectorString(selectors);
    }
    function getClassNames(el) {
        var className = el.getAttribute("class");
        return className = className && className.replace("utme-verify", ""), className && className.trim().length ? (className = className.replace(/\s+/g, " "), 
        className = className.replace(/^\s+|\s+$/g, ""), className.trim().split(" ")) : [];
    }
    function getSelectors(el) {
        var parts = [], label = null, title = null, alt = null, name = null, value = null, me = el;
        do {
            var uniqueId = el != me && el.getAttribute("data-unique-id");
            if (uniqueId) label = "[data-unique-id='" + uniqueId + "']"; else if (el.id) label = "#" + el.id; else {
                label = el.tagName.toLowerCase();
                var classNames = getClassNames(el);
                classNames.length && (label += "." + classNames.join("."));
            }
            (title = el.getAttribute("title")) ? label += '[title="' + title + '"]' : (alt = el.getAttribute("alt")) ? label += '[alt="' + alt + '"]' : (name = el.getAttribute("name")) && (label += '[name="' + name + '"]'), 
            (value = el.getAttribute("value")) && (label += '[value="' + value + '"]'), parts.unshift({
                element: el,
                selector: label
            });
        } while (!el.id && !uniqueId && (el = el.parentNode) && el.tagName);
        if (!parts.length) throw new Error("Failed to identify CSS selector");
        return parts;
    }
    var state, saveHandlers = [], reportHandlers = [], loadHandlers = [], validating = !1, events = [ "click", "focus", "blur", "dblclick", "mousedown", "mouseenter", "mouseleave", "mouseout", "mouseover", "mouseup", "change" ], guid = function() {
        function s4() {
            return Math.floor(65536 * (1 + Math.random())).toString(16).substring(1);
        }
        return function() {
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        };
    }(), listeners = [], utme = {
        state: state,
        init: function() {
            var scenario = getParameterByName("utme_scenario");
            scenario ? (localStorage.clear(), state = utme.state = utme.loadStateFromStorage(), 
            utme.broadcast("INITIALIZED"), setTimeout(function() {
                state.autoRun = !0, utme.runScenario(scenario);
            }, 2e3)) : (state = utme.state = utme.loadStateFromStorage(), utme.broadcast("INITIALIZED"), 
            "PLAYING" === state.status ? runNextStep(state.runningScenario, state.runningStep) : state.status || (state.status = "LOADED"));
        },
        broadcast: function(evt, evtData) {
            if (listeners && listeners.length) for (var i = 0; i < listeners.length; i++) listeners[i](evt, evtData);
        },
        startRecording: function() {
            "RECORDING" != state.status && (state.status = "RECORDING", state.steps = [], utme.reportLog("Recording Started"), 
            utme.broadcast("RECORDING_STARTED"));
        },
        runScenario: function(name) {
            var toRun = name || prompt("Scenario to run"), autoRun = name ? !0 : "y" != prompt("Would you like to step through each step (y|n)?");
            getScenario(toRun, function(scenario) {
                state.autoRun = 1 == autoRun, state.status = "PLAYING", utme.reportLog("Starting Scenario '" + name + "'", scenario), 
                utme.broadcast("PLAYBACK_STARTED"), runStep(scenario, 0);
            });
        },
        stopScenario: function(success) {
            var scenario = state.runningScenario;
            delete state.runningStep, delete state.runningScenario, state.status = "LOADED", 
            utme.broadcast("PLAYBACK_STOPPED"), utme.reportLog("Stopping Scenario"), success && utme.reportLog("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
        },
        getStatus: function() {
            return utme.state.status;
        },
        createElementLocator: function(element) {
            var uniqueId = guid();
            element.setAttribute("data-unique-id", uniqueId);
            var eleHtml = element.cloneNode().outerHTML, eleSelectors = [];
            if ("BODY" == element.tagName.toUpperCase() || "HTML" == element.tagName.toUpperCase()) var eleSelectors = [ element.tagName ]; else var docHtml = document.body.innerHTML, eleSelectors = [ {
                doc: docHtml,
                id: uniqueId,
                ele: eleHtml
            } ];
            return {
                uniqueId: uniqueId,
                selectors: eleSelectors
            };
        },
        registerEvent: function(eventName, data) {
            "RECORDING" == state.status && (state.steps.push({
                eventName: eventName,
                timeStamp: new Date().getTime(),
                data: data
            }), utme.broadcast("EVENT_REGISTERED"));
        },
        reportLog: function(log, scenario) {
            if (reportHandlers && reportHandlers.length) for (var i = 0; i < reportHandlers.length; i++) reportHandlers[i].log(log, scenario, utme);
        },
        reportError: function(error, scenario) {
            if (reportHandlers && reportHandlers.length) for (var i = 0; i < reportHandlers.length; i++) reportHandlers[i].error(error, scenario, utme);
        },
        registerListener: function(handler) {
            listeners.push(handler);
        },
        registerSaveHandler: function(handler) {
            saveHandlers.push(handler);
        },
        registerReportHandler: function(handler) {
            reportHandlers.push(handler);
        },
        registerLoadHandler: function(handler) {
            loadHandlers.push(handler);
        },
        stopRecording: function() {
            var newScenario = {
                name: prompt("Enter scenario name"),
                steps: state.steps
            };
            if (newScenario.name && (simplifySteps(state.steps), state.scenarios.push(newScenario), 
            saveHandlers && saveHandlers.length)) for (var i = 0; i < saveHandlers.length; i++) saveHandlers[i](newScenario, utme);
            state.status = "LOADED", utme.broadcast("RECORDING_STOPPED"), utme.reportLog("Recording Stopped", newScenario);
        },
        loadStateFromStorage: function() {
            var utmeStateStr = localStorage.getItem("utme");
            return state = utmeStateStr ? JSON.parse(utmeStateStr) : {
                status: "INITIALIZING",
                scenarios: []
            };
        },
        saveStateToStorage: function(utmeState) {
            utmeState ? localStorage.setItem("utme", JSON.stringify(utmeState)) : localStorage.removeItem("utme");
        },
        unload: function() {
            utme.saveStateToStorage(state);
        }
    };
    document.addEventListener("readystatechange", function() {
        "complete" == document.readyState && (utme.init(), initControls(), initEventHandlers(), 
        "RECORDING" == utme.state.status && utme.registerEvent("load", {
            url: window.location
        }));
    }), window.addEventListener("unload", function() {
        utme.unload();
    }, !0), window.addEventListener("error", function(err) {
        utme.reportLog("Script Error: " + err.message + ":" + err.url + "," + err.line + ":" + err.col);
    }), global.utme = utme;
}(this, Simulate);

var saveAs = saveAs || "undefined" != typeof navigator && navigator.msSaveOrOpenBlob && navigator.msSaveOrOpenBlob.bind(navigator) || function(view) {
    "use strict";
    if ("undefined" == typeof navigator || !/MSIE [1-9]\./.test(navigator.userAgent)) {
        var doc = view.document, get_URL = function() {
            return view.URL || view.webkitURL || view;
        }, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a"), can_use_save_link = "download" in save_link, click = function(node) {
            var event = doc.createEvent("MouseEvents");
            event.initMouseEvent("click", !0, !1, view, 0, 0, 0, 0, 0, !1, !1, !1, !1, 0, null), 
            node.dispatchEvent(event);
        }, webkit_req_fs = view.webkitRequestFileSystem, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem, throw_outside = function(ex) {
            (view.setImmediate || view.setTimeout)(function() {
                throw ex;
            }, 0);
        }, force_saveable_type = "application/octet-stream", fs_min_size = 0, arbitrary_revoke_timeout = 10, revoke = function(file) {
            var revoker = function() {
                "string" == typeof file ? get_URL().revokeObjectURL(file) : file.remove();
            };
            view.chrome ? revoker() : setTimeout(revoker, arbitrary_revoke_timeout);
        }, dispatch = function(filesaver, event_types, event) {
            event_types = [].concat(event_types);
            for (var i = event_types.length; i--; ) {
                var listener = filesaver["on" + event_types[i]];
                if ("function" == typeof listener) try {
                    listener.call(filesaver, event || filesaver);
                } catch (ex) {
                    throw_outside(ex);
                }
            }
        }, FileSaver = function(blob, name) {
            var object_url, target_view, slice, filesaver = this, type = blob.type, blob_changed = !1, dispatch_all = function() {
                dispatch(filesaver, "writestart progress write writeend".split(" "));
            }, fs_error = function() {
                if ((blob_changed || !object_url) && (object_url = get_URL().createObjectURL(blob)), 
                target_view) target_view.location.href = object_url; else {
                    var new_tab = view.open(object_url, "_blank");
                    void 0 == new_tab && "undefined" != typeof safari && (view.location.href = object_url);
                }
                filesaver.readyState = filesaver.DONE, dispatch_all(), revoke(object_url);
            }, abortable = function(func) {
                return function() {
                    return filesaver.readyState !== filesaver.DONE ? func.apply(this, arguments) : void 0;
                };
            }, create_if_not_found = {
                create: !0,
                exclusive: !1
            };
            return filesaver.readyState = filesaver.INIT, name || (name = "download"), can_use_save_link ? (object_url = get_URL().createObjectURL(blob), 
            save_link.href = object_url, save_link.download = name, click(save_link), filesaver.readyState = filesaver.DONE, 
            dispatch_all(), void revoke(object_url)) : (view.chrome && type && type !== force_saveable_type && (slice = blob.slice || blob.webkitSlice, 
            blob = slice.call(blob, 0, blob.size, force_saveable_type), blob_changed = !0), 
            webkit_req_fs && "download" !== name && (name += ".download"), (type === force_saveable_type || webkit_req_fs) && (target_view = view), 
            req_fs ? (fs_min_size += blob.size, void req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
                fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
                    var save = function() {
                        dir.getFile(name, create_if_not_found, abortable(function(file) {
                            file.createWriter(abortable(function(writer) {
                                writer.onwriteend = function(event) {
                                    target_view.location.href = file.toURL(), filesaver.readyState = filesaver.DONE, 
                                    dispatch(filesaver, "writeend", event), revoke(file);
                                }, writer.onerror = function() {
                                    var error = writer.error;
                                    error.code !== error.ABORT_ERR && fs_error();
                                }, "writestart progress write abort".split(" ").forEach(function(event) {
                                    writer["on" + event] = filesaver["on" + event];
                                }), writer.write(blob), filesaver.abort = function() {
                                    writer.abort(), filesaver.readyState = filesaver.DONE;
                                }, filesaver.readyState = filesaver.WRITING;
                            }), fs_error);
                        }), fs_error);
                    };
                    dir.getFile(name, {
                        create: !1
                    }, abortable(function(file) {
                        file.remove(), save();
                    }), abortable(function(ex) {
                        ex.code === ex.NOT_FOUND_ERR ? save() : fs_error();
                    }));
                }), fs_error);
            }), fs_error)) : void fs_error());
        }, FS_proto = FileSaver.prototype, saveAs = function(blob, name) {
            return new FileSaver(blob, name);
        };
        return FS_proto.abort = function() {
            var filesaver = this;
            filesaver.readyState = filesaver.DONE, dispatch(filesaver, "abort");
        }, FS_proto.readyState = FS_proto.INIT = 0, FS_proto.WRITING = 1, FS_proto.DONE = 2, 
        FS_proto.error = FS_proto.onwritestart = FS_proto.onprogress = FS_proto.onwrite = FS_proto.onabort = FS_proto.onerror = FS_proto.onwriteend = null, 
        saveAs;
    }
}("undefined" != typeof self && self || "undefined" != typeof window && window || this.content);

"undefined" != typeof module && null !== module ? module.exports = saveAs : "undefined" != typeof define && null !== define && null != define.amd && define([], function() {
    return saveAs;
}), function(utme) {
    utme.registerSaveHandler(function(scenario) {
        var blob = new Blob([ JSON.stringify(scenario) ], {
            type: "text/plain;charset=utf-8"
        });
        saveAs(blob, scenario.name + ".json");
    });
}(utme), function(utme) {
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
        return null === results ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    var serverReporter = {
        baseUrl: getParameterByName("utme_test_server") || "http://0.0.0.0:9043/",
        error: function(error) {
            $.ajax({
                type: "POST",
                url: serverReporter.baseUrl + "error",
                data: {
                    data: error
                },
                dataType: "json"
            }), console.error(error);
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
    utme.registerSaveHandler(serverReporter.saveScenario);
}(utme, this);