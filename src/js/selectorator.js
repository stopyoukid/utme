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
