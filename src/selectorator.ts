var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

export class CssSelectorGenerator {
    isElement(element) {
        return !!((element != null ? element.nodeType : void 0) === 1);
    }

    getParents(element) {
        var current_element, result;
        result = [];
        if (this.isElement(element)) {
          current_element = element;
          while (this.isElement(current_element)) {
            result.push(current_element);
            current_element = current_element.parentNode;
          }
        }
        return result;
    }

    getTagSelector(element) {
        return element.tagName.toLowerCase();
    }

    getIdSelector(element) {
        var id;
        id = element.getAttribute('id');
        if (id != null) {
          return "#" + id;
        } else {
          return null;
        }
    }

    getClassSelectors(element) {
      var class_string, item, result;
      result = [];
      class_string = element.getAttribute('class');
      if (class_string != null) {
        class_string = class_string.replace(/\s+/g, ' ');
        class_string = class_string.replace(/^\s|\s$/g, '');
        if (class_string !== '') {
          result = (function() {
            var _i, _len, _ref, _results;
            _ref = class_string.split(/\s+/);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              item = _ref[_i];
              _results.push("." + item);
            }
            return _results;
          })();
        }
      }
      return result;
    }

    getAttributeSelectors(element) {
      var attribute, blacklist, result, _i, _len, _ref, _ref1;
      result = [];
      blacklist = ['id', 'class'];
      _ref = element.attributes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        attribute = _ref[_i];
        if (_ref1 = attribute.nodeName, __indexOf.call(blacklist, _ref1) < 0) {
          result.push("[" + attribute.nodeName + "=" + attribute.nodeValue + "]");
        }
      }
      return result;
    }

    getNthChildSelector(element) {
      var counter, parent_element, sibling, siblings, _i, _len;
      parent_element = element.parentNode;
      if (parent_element != null) {
        counter = 0;
        siblings = parent_element.childNodes;
        for (_i = 0, _len = siblings.length; _i < _len; _i++) {
          sibling = siblings[_i];
          if (this.isElement(sibling)) {
            counter++;
            if (sibling === element) {
              return ":nth-child(" + counter + ")";
            }
          }
        }
      }
      return null;
    }

    testSelector (element, selector) {
      var is_unique, result;
      is_unique = false;
      if ((selector != null) && selector !== '') {
        result = element.ownerDocument.querySelectorAll(selector);
        if (result.length === 1 && result[0] === element) {
          is_unique = true;
        }
      }
      return is_unique;
    }

    getAllSelectors(element) {
      return {
        t: this.getTagSelector(element),
        i: this.getIdSelector(element),
        c: this.getClassSelectors(element),
        a: this.getAttributeSelectors(element),
        n: this.getNthChildSelector(element)
      };
    }

    testUniqueness (element, selector) {
      var found_elements, parent;
      parent = element.parentNode;
      found_elements = parent.querySelectorAll(selector);
      return found_elements.length === 1 && found_elements[0] === element;
    }

    getUniqueSelector(element) {
      var all_classes, selector, selectors;
      selectors = this.getAllSelectors(element);
      if (selectors.i != null) {
        return selectors.i;
      }
      if (this.testUniqueness(element, selectors.t)) {
        return selectors.t;
      }
      if (selectors.c.length !== 0) {
        all_classes = selectors.c.join('');
        selector = all_classes;
        if (this.testUniqueness(element, selector)) {
          return selector;
        }
        selector = selectors.t + all_classes;
        if (this.testUniqueness(element, selector)) {
          return selector;
        }
      }
      return selectors.n;
    }

    getSelector(element) {
      var all_selectors, item, parents, result, selector, selectors, _i, _j, _len, _len1;
      all_selectors = [];
      parents = this.getParents(element);
      for (_i = 0, _len = parents.length; _i < _len; _i++) {
        item = parents[_i];
        selector = this.getUniqueSelector(item);
        if (selector != null) {
          all_selectors.push(selector);
        }
      }
      selectors = [];
      for (_j = 0, _len1 = all_selectors.length; _j < _len1; _j++) {
        item = all_selectors[_j];
        selectors.unshift(item);
        result = selectors.join(' > ');
        if (this.testSelector(element, result)) {
          return result;
        }
      }
      return null;
    }

}
