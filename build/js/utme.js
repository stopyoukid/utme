// (function() {
//   var CssSelectorGenerator, root,
//     __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
//
//     CssSelectorGenerator = (function() {
//     function CssSelectorGenerator() {}
//
//     CssSelectorGenerator.prototype.isElement = function(element) {
//       return !!((element != null ? element.nodeType : void 0) === 1);
//     };
//
//     CssSelectorGenerator.prototype.getParents = function(element) {
//       var current_element, result;
//       result = [];
//       if (this.isElement(element)) {
//         current_element = element;
//         while (this.isElement(current_element)) {
//           result.push(current_element);
//           current_element = current_element.parentNode;
//         }
//       }
//       return result;
//     };
//
//     CssSelectorGenerator.prototype.getTagSelector = function(element) {
//       return element.tagName.toLowerCase();
//     };
//
//     CssSelectorGenerator.prototype.getIdSelector = function(element) {
//       var id;
//       id = element.getAttribute('id');
//       if (id != null) {
//         return "#" + id;
//       } else {
//         return null;
//       }
//     };
//
//     CssSelectorGenerator.prototype.getClassSelectors = function(element) {
//       var class_string, item, result;
//       result = [];
//       class_string = element.getAttribute('class');
//       if (class_string != null) {
//         class_string = class_string.replace(/\s+/g, ' ');
//         class_string = class_string.replace(/^\s|\s$/g, '');
//         if (class_string !== '') {
//           result = (function() {
//             var _i, _len, _ref, _results;
//             _ref = class_string.split(/\s+/);
//             _results = [];
//             for (_i = 0, _len = _ref.length; _i < _len; _i++) {
//               item = _ref[_i];
//               _results.push("." + item);
//             }
//             return _results;
//           })();
//         }
//       }
//       return result;
//     };
//
//     CssSelectorGenerator.prototype.getAttributeSelectors = function(element) {
//       var attribute, blacklist, result, _i, _len, _ref, _ref1;
//       result = [];
//       blacklist = ['id', 'class'];
//       _ref = element.attributes;
//       for (_i = 0, _len = _ref.length; _i < _len; _i++) {
//         attribute = _ref[_i];
//         if (_ref1 = attribute.nodeName, __indexOf.call(blacklist, _ref1) < 0) {
//           result.push("[" + attribute.nodeName + "=" + attribute.nodeValue + "]");
//         }
//       }
//       return result;
//     };
//
//     CssSelectorGenerator.prototype.getNthChildSelector = function(element) {
//       var counter, parent_element, sibling, siblings, _i, _len;
//       parent_element = element.parentNode;
//       if (parent_element != null) {
//         counter = 0;
//         siblings = parent_element.childNodes;
//         for (_i = 0, _len = siblings.length; _i < _len; _i++) {
//           sibling = siblings[_i];
//           if (this.isElement(sibling)) {
//             counter++;
//             if (sibling === element) {
//               return ":nth-child(" + counter + ")";
//             }
//           }
//         }
//       }
//       return null;
//     };
//
//     CssSelectorGenerator.prototype.testSelector = function(element, selector) {
//       var is_unique, result;
//       is_unique = false;
//       if ((selector != null) && selector !== '') {
//         result = element.ownerDocument.querySelectorAll(selector);
//         if (result.length === 1 && result[0] === element) {
//           is_unique = true;
//         }
//       }
//       return is_unique;
//     };
//
//     CssSelectorGenerator.prototype.getAllSelectors = function(element) {
//       return {
//         t: this.getTagSelector(element),
//         i: this.getIdSelector(element),
//         c: this.getClassSelectors(element),
//         a: this.getAttributeSelectors(element),
//         n: this.getNthChildSelector(element)
//       };
//     };
//
//     CssSelectorGenerator.prototype.testUniqueness = function(element, selector) {
//       var found_elements, parent;
//       parent = element.parentNode;
//       found_elements = parent.querySelectorAll(selector);
//       return found_elements.length === 1 && found_elements[0] === element;
//     };
//
//     CssSelectorGenerator.prototype.getUniqueSelector = function(element) {
//       var all_classes, selector, selectors;
//       selectors = this.getAllSelectors(element);
//       if (selectors.i != null) {
//         return selectors.i;
//       }
//       if (this.testUniqueness(element, selectors.t)) {
//         return selectors.t;
//       }
//       if (selectors.c.length !== 0) {
//         all_classes = selectors.c.join('');
//         selector = all_classes;
//         if (this.testUniqueness(element, selector)) {
//           return selector;
//         }
//         selector = selectors.t + all_classes;
//         if (this.testUniqueness(element, selector)) {
//           return selector;
//         }
//       }
//       return selectors.n;
//     };
//
//     CssSelectorGenerator.prototype.getSelector = function(element) {
//       var all_selectors, item, parents, result, selector, selectors, _i, _j, _len, _len1;
//       all_selectors = [];
//       parents = this.getParents(element);
//       for (_i = 0, _len = parents.length; _i < _len; _i++) {
//         item = parents[_i];
//         selector = this.getUniqueSelector(item);
//         if (selector != null) {
//           all_selectors.push(selector);
//         }
//       }
//       selectors = [];
//       for (_j = 0, _len1 = all_selectors.length; _j < _len1; _j++) {
//         item = all_selectors[_j];
//         selectors.unshift(item);
//         result = selectors.join(' > ');
//         if (this.testSelector(element, result)) {
//           return result;
//         }
//       }
//       return null;
//     };
//
//     return CssSelectorGenerator;
//
//   })();
//
//   root = typeof exports !== "undefined" && exports !== null ? exports : this;
//
//   root.CssSelectorGenerator = CssSelectorGenerator;
//
// }).call(this);

(function() {

  (function($) {
    var Selectorator, clean, contains, escapeSelector, extend, inArray, map, unique;
    map = $.map;
    extend = $.extend;
    inArray = $.inArray;
    contains = function(item, array) {
      return inArray(item, array) !== -1;
    };
    escapeSelector = function(selector) {
      return selector.replace(/([\!\"\#\$\%\&'\(\)\*\+\,\.\/\:\;<\=>\?\@\[\\\]\^\`\{\|\}\~])/g, "\\$1");
    };
    clean = function(arr, reject) {
      return map(arr, function(item) {
        if (item === reject) {
          return null;
        } else {
          return item;
        }
      });
    };
    unique = function(arr) {
      return map(arr, function(item, index) {
        if (parseInt(index, 10) === parseInt(arr.indexOf(item), 10)) {
          return item;
        } else {
          return null;
        }
      });
    };
    Selectorator = (function() {

      function Selectorator(element, options) {
        this.element = element;
        this.options = extend(extend({}, $.selectorator.options), options);
        this.cachedResults = {};

        var parent = element.parent();
        if (parent[0] != null && parent[0].nodeType <= 8) {
          parent = $(parent[0]);
        }
        this.topElement = parent;
      }

      Selectorator.prototype.query = function(selector) {
        var _base;
        return (_base = this.cachedResults)[selector] || (_base[selector] = (this.topElement[0] && this.topElement[0].querySelectorAll(selector.replace(/#([^\s]+)/g, "[id='$1']"))) || []);
      };

      Selectorator.prototype.getProperTagName = function() {
        if (this.element[0]) {
          return this.element[0].tagName.toLowerCase();
        } else {
          return null;
        }
      };

      Selectorator.prototype.hasParent = function() {
        return this.element && 0 < this.element.parent().size();
      };

      Selectorator.prototype.isElement = function() {
        var node;
        node = this.element[0];
        return node && node.nodeType === node.ELEMENT_NODE;
      };

      Selectorator.prototype.validate = function(selector, parentSelector, single, isFirst) {
        var delimiter, element;
        if (single == null) {
          single = true;
        }
        if (isFirst == null) {
          isFirst = false;
        }
        element = this.query(selector);
        if (single && 1 < element.length || !single && 0 === element.length) {
          if (parentSelector && selector.indexOf(':') === -1) {
            delimiter = isFirst ? ' > ' : ' ';
            selector = parentSelector + delimiter + selector;
            element = this.query(selector);
            if (single && 1 < element.length || !single && 0 === element.length) {
              return null;
            }
          } else {
            return null;
          }
        }
        if (contains(this.element[0], element)) {
          return selector;
        } else {
          return null;
        }
      };

      Selectorator.prototype.generate = function() {
        var fn, res, _i, _len, _ref;
        if (!(this.element && this.isElement())) {
          return [''];
        }
        res = [];
        _ref = [this.generateSimple];
        if (this.hasParent()) {
            _ref.push(this.generateAncestor);
            _ref.push(this.generateRecursive);
        }
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fn = _ref[_i];
          res = unique(clean(fn.call(this)));
          if (res && res.length > 0) {
            return res;
          }
        }
        return unique(res);
      };

      Selectorator.prototype.generateAncestor = function() {
        var isFirst, parent, parentSelector, parentSelectors, results, selector, selectors, _i, _j, _k, _len, _len1, _len2, _ref;
        results = [];
        _ref = this.element.parents();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          parent = _ref[_i];
          isFirst = true;
          selectors = this.generateSimple(null, false);
          for (_j = 0, _len1 = selectors.length; _j < _len1; _j++) {
            selector = selectors[_j];
            parentSelectors = new Selectorator($(parent), this.options).generateSimple(null, false);
            for (_k = 0, _len2 = parentSelectors.length; _k < _len2; _k++) {
              parentSelector = parentSelectors[_k];
              $.merge(results, this.generateSimple(parentSelector, true, isFirst));
            }
          }
          isFirst = false;
        }
        return results;
      };

      Selectorator.prototype.generateSimple = function(parentSelector, single, isFirst) {
        var fn, res, self, tagName, validate, _i, _len, _ref;
        self = this;
        tagName = self.getProperTagName();
        validate = function(selector) {
          return self.validate(selector, parentSelector, single, isFirst);
        };
        _ref = [
          [self.getIdSelector], [self.getClassSelector], [self.getIdSelector, true], [self.getClassSelector, true], [self.getNameSelector], [
            function() {
              return [self.getProperTagName()];
            }
          ]
        ];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fn = _ref[_i];
          res = fn[0].call(self, fn[1]) || [];
          res = clean(map(res, validate));
          if (res.length > 0) {
            return res;
          }
        }
        return [];
      };

      Selectorator.prototype.generateRecursive = function() {
        var index, parent, parentSelector, selector;
        selector = this.getProperTagName();
        if (selector.indexOf(':') !== -1) {
          selector = '*';
        }
        parent = this.element.parent();
        parentSelector = new Selectorator(parent).generate()[0];
        index = parent.children(selector).index(this.element);
        selector = "" + selector + ":eq(" + index + ")";
        if (parentSelector !== '') {
          selector = parentSelector + " > " + selector;
        }
        return [selector];
      };

      Selectorator.prototype.generateRecursiveSimple = function() {
        var index, parent, parentSelector, selector;
        selector = this.getProperTagName();
        if (selector.indexOf(':') !== -1) {
          selector = '*';
        }

        parent = this.element.parent();
        if (parent[0] != null && parent[0].nodeType <= 8) {
            parentSelector = new Selectorator(parent).generateRecursiveSimple()[0];
        }

        index = parent.children(selector).index(this.element);
        selector = "" + selector + ":eq(" + index + ")";
        if (parentSelector !== '') {
          selector = (parentSelector ? parentSelector + " > " : "") + selector;
        }
        return [selector];
      };

      Selectorator.prototype.getIdSelector = function(tagName) {
        var id;
        if (tagName == null) {
          tagName = false;
        }
        tagName = tagName ? this.getProperTagName() : '';
        id = this.element.attr('id');
        if (typeof id === "string" && !contains(id, this.getIgnore('id'))) {
          return ["" + tagName + "#" + (escapeSelector(id))];
        } else {
          return null;
        }
      };

      Selectorator.prototype.getClassSelector = function(tagName) {
        var classes, invalidClasses, tn;
        if (tagName == null) {
          tagName = false;
        }
        tn = this.getProperTagName();
        if (/^(body|html)$/.test(tn)) {
          return null;
        }
        tagName = tagName ? tn : '';
        invalidClasses = this.getIgnore('class');
        classes = (this.element.attr('class') || '').replace(/\{.*\}/, "").split(/\s/);
        return map(classes, function(klazz) {
          if (klazz && !contains(klazz, invalidClasses)) {
            return "" + tagName + "." + (escapeSelector(klazz));
          } else {
            return null;
          }
        });
      };

      Selectorator.prototype.getNameSelector = function() {
        var name, tagName;
        tagName = this.getProperTagName();
        name = this.element.attr('name');
        if (name && !contains(name, this.getIgnore('name'))) {
          return ["" + tagName + "[name='" + name + "']"];
        } else {
          return null;
        }
      };

      Selectorator.prototype.getIgnore = function(key) {
        var mulkey, opts, vals;
        opts = this.options.ignore || {};
        mulkey = key === 'class' ? 'classes' : "" + key + "s";
        vals = opts[key] || opts[mulkey];
        if (typeof vals === 'string') {
          return [vals];
        } else {
          return vals;
        }
      };

      return Selectorator;

    })();
    $.selectorator = {
      options: {},
      unique: unique,
      clean: clean,
      escapeSelector: escapeSelector
    };
    $.fn.selectorator = function(options) {
      return new Selectorator($(this), options);
    };
    $.fn.getSelector = function(options) {
      return this.selectorator(options).generate();
    };
    return this;
  })(jQuery);

}).call(this);

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


(function(global, Simulate) {

    // var myGenerator = new CssSelectorGenerator();
    var saveHandlers = [];
    var reportHandlers = [];
    var loadHandlers = [];

    function getScenario(name, callback) {
        if (loadHandlers.length == 0) {
          var state = utme.state;
          for (var i = 0; i < state.scenarios.length; i++) {
            if (state.scenarios[i].name == name) {
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
                window.location = step.data.url.href;
            } else if (step.eventName == 'timeout') {
              setTimeout(function() {
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

                  if (state.autoRun) {
                    runNextStep(scenario, idx);
                  }
                }

                function notFoundElement() {
                  if (step.eventName == 'validate') {
                    utme.reportError('Could not find appropriate element for selectors: ' + JSON.stringify(locator.selectors) + " for event " + step.eventName);
                    utme.stopScenario();
                  } else {
                    utme.reportLog('Could not find appropriate element for selectors: ' + JSON.stringify(locator.selectors) + " for event " + step.eventName);
                    if (state.autoRun) {
                      runNextStep(scenario, idx);
                    }
                  }
                }

                tryUntilFound(locator, foundElement, notFoundElement, getTimeout(scenario, idx), step.data.text);
            }
        } else {

        }
    }

    function tryUntilFound(locator, callback, fail, timeout, textToCheck) {
        var started = new Date().getTime();

        function tryFind() {
            var eles;
            var foundTooMany = false;
            var foundValid = false;
            var selectorsToTest = locator.selectors.slice(0);
            for (var i = 0; i < selectorsToTest.length; i++) {
                eles = $(selectorsToTest[i]);
                if (eles.length == 1) {
                    if (typeof textToCheck != 'undefined'){
                        var newText = $(eles[0]).text();
                        if (newText == textToCheck) {
                            foundValid = true;
                            break;
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
            }
            else if ((new Date().getTime() - started) < (timeout * 2)) {
                setTimeout(tryFind, 50);
            } else {
                fail();
            }
        }
        //
        setTimeout(tryFind, timeout);
        // tryFind();
        // tryFind();
    }

    function getTimeout(scenario, idx) {
      if (scenario.steps[idx].eventName == 'mousemove' ||
          scenario.steps[idx].eventName.indexOf("key") >= 0 ||
          scenario.steps[idx].eventName == 'verify') {
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
        var selector = locator.selectors[0];
        if (selector && selector.doc) {
            var frag = fragmentFromString(selector.doc);
            var ele = frag.querySelectorAll('[data-unique-id=\'' + selector.id + '\']');
            // var selectors = $(ele).selectorator().generate();
            locator.selectors = [unique(ele[0], frag)];
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
        var uniqueId = getUniqueIdFromStep(step);
        if (step.eventName == 'mouseenter' && uniqueId) {
          var hasValid = false;
          for (var j = i; j < steps.length; j++) {
            var otherStep = steps[j];
            var otherUniqueId = getUniqueIdFromStep(otherStep);
            if (uniqueId === otherUniqueId) {
              if (otherStep.eventName === 'mouseleave') {
                if ( (otherStep.timeStamp - step.timeStamp) < 1000) {
                  steps.splice(i, 1);
                  steps.splice(j, 1);
                  i--;
                }
                break;
              } else if (otherStep.eventName.indexOf("mouse") != 0) {
                break;
              }
            }
          }
        }
      }
    }

    var guid = (function() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
      }
      return function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
      };
    })();

    var listeners = [];
    var state;
    var utme = {
        state: state,
        init: function() {
          var scenario = getParameterByName('utme_scenario');
          if (scenario) {
              localStorage.clear();
              state = utme.state = utme.loadStateFromStorage();
              utme.broadcast('INITIALIZED');
              setTimeout(function() {
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
        broadcast: function(evt, evtData) {
            if (listeners && listeners.length) {
              for (var i = 0; i < listeners.length; i++) {
                listeners[i](evt, evtData);
              }
            }
        },
        startRecording: function() {
            if (state.status != 'RECORDING') {
                state.status = 'RECORDING';
                state.steps = [];
                utme.reportLog("Recording Started");
                utme.broadcast('RECORDING_STARTED');
            }
        },
        runScenario: function(name) {
            var toRun = name || prompt('Scenario to run');
            var autoRun = !name ? prompt('Would you like to step through each step (y|n)?') != 'y' : true;
            getScenario(toRun, function(scenario) {
                scenario = JSON.parse(JSON.stringify(scenario));

                simplifySteps(scenario.steps);

                state.autoRun = autoRun == true;
                state.status = "PLAYING";

                utme.reportLog("Starting Scenario '" + name + "'", scenario);
                utme.broadcast('PLAYBACK_STARTED');

                runStep(scenario, 0);
            });
        },
        stopScenario: function(success) {
            var scenario = state.runningScenario;
            delete state.runningStep;
            delete state.runningScenario;
            state.status = "LOADED";
            utme.broadcast('PLAYBACK_STOPPED');

            utme.reportLog("Stopping Scenario");

            if (success) {
                utme.reportLog("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
            }
        },
        getStatus: function() {
            return utme.state.status;
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
                  doc: docHtml,//docHtml.substring(0, docHtml.indexOf(eleHtml) + eleHtml.length),
                  id: uniqueId,
                  ele: eleHtml
                }];
            }
            return {
                uniqueId: uniqueId,
                selectors: eleSelectors
            };
        },
        registerEvent: function(eventName, data, idx) {
          if (state.status == 'RECORDING') {
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
        stopRecording: function() {
            var newScenario = {
                name: prompt('Enter scenario name'),
                steps: state.steps
            };
            if (newScenario.name) {

                postProcessSteps(state.steps);

                state.scenarios.push(newScenario);

                if (saveHandlers && saveHandlers.length) {
                    for (var i = 0; i < saveHandlers.length; i++) {
                        saveHandlers[i](newScenario, utme);
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

        unload: function() {
            // var state = utme.loadStateFromStorage();
            // state.status = 'NOT_STARTED';
            utme.saveStateToStorage(state);
        }
    };

    function toggleHighlight(ele, value) {
      $(ele).toggleClass('utme-verify', value);
    }

    function initEventHandlers() {
        // function nodeInserted(event) {
        //   var ele = $(event.target);
        //   if (event.animationName == 'nodeInserted') {
        //     ele.on(events.join(" "), function (e) {
        //                 if (e.isTrigger)
        //                   return;
        //       if (ele[0] == e.target)  {
        //         var evt = e.type;
        //         var idx = utme.state.steps.length;
        //
        //         var args =  {
        //           locator: utme.createElementLocator(ele[0])
        //         };
        //
        //         if (e.which || e.button) {
        //           args.button = e.which || e.button;
        //         }
        //
        //         if (evt == 'change') {
        //           args.value = e.target.value;
        //         }
        //
        //         utme.registerEvent(evt, args, idx);
        //         // console.log(evt, e.target);
        //       }
        //     });
        //   }
        // }
        //
        // document.addEventListener('animationstart', nodeInserted, false);
        // document.addEventListener('MSAnimationStart', nodeInserted, false);
        // document.addEventListener('webkitAnimationStart', nodeInserted, false);

        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], (function(evt) {
              // return;
                var handler = function(e) {
                  if (e.isTrigger)
                    return;

                  // if ($(e.target).hasClass('k-link'))
                    // console.log(e.type, e.target);
                  if (utme.getStatus() == 'RECORDING' && e.target.hasAttribute && !e.target.hasAttribute('data-ignore')) {
                      var idx = utme.state.steps.length;
                      if (validating) {
                          e.stopPropagation();
                          e.preventDefault();
                          if (evt == 'mouseover') {
                              toggleHighlight(e.target, true);
                          }
                          if (evt == 'mouseout') {
                              toggleHighlight(e.target, false);
                          }
                          if (evt == 'click' || evt == 'mousedown') {
                            utme.registerEvent('validate', {
                                locator: utme.createElementLocator(e.target),
                                text: $(e.target).text()
                            }, idx);
                          }
                          return false;
                      } else {
                          var args =  {
                              locator: utme.createElementLocator(e.target)
                          };

                          if (e.which || e.button) {
                              args.button = e.which || e.button;
                          }

                          if (evt == 'change') {
                            args.value = e.target.value;
                          }

                          utme.registerEvent(evt, args, idx);
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
                    locator: utme.createElementLocator(e.target),
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
            updateButton(timeoutButton, 'Add Timeout', status != 'RECORDING');
            updateButton(pauseButton, utme.state.autoRun ? 'Pause' : "Resume",  status != 'PLAYING');
            updateButton(stepButton, 'Step', status != 'PLAYING' || utme.state.autoRun);
        }

        utme.registerListener(updateButtonStates);

        var pauseButton = createButton('Pause', 'pause', function () {
            utme.state.autoRun = !utme.state.autoRun;
        });

        var stepButton = createButton('Step', 'stepButton', function (e) {
            runNextStep(utme.state.runningScenario, utme.state.runningStep);
            return false;
        });

        var timeoutButton = createButton('Add Timeout', 'timeout', function() {
          var oldStatus = utme.getStatus();
          if (oldStatus == 'RECORDING') {
            utme.registerEvent('timeout', {
                amount: parseInt(prompt("How long in ms?"), 10)
            });
          }
        });

        var recordButton = createButton('Record Scenario', 'start', function() {
            var oldStatus = utme.getStatus();
            if (oldStatus == 'RECORDING') {
                utme.stopRecording();
            } else {
                utme.startRecording();
            }
        });

        var runButton = createButton('Run Scenario', 'run', function() {
            var oldStatus = utme.getStatus();
            if (oldStatus == 'LOADED') {
                utme.runScenario();
            } else {
                utme.stopScenario(false);
            }
        });

        var validateButton = createButton('Validate', 'verify', function() {
            var status = utme.getStatus();
            if (status == 'RECORDING') {
                validating = !validating;
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
          label = '#' + el.id;
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

})(this, Simulate);

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
