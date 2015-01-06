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
