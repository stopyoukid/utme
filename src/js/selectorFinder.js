

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

  function _getSelectorIndex(element, selector) {
      var existingIndex = 0;
      var items =  doc.querySelectorAll(selector);

      for (var i = 0; i < items.length; i++) {
          if (items[i] === element) {
              existingIndex = i;
              break;
          }
      }
      return existingIndex;
  }

  var elSelector = getElementSelector(el).selector;
  var isSimpleSelector = elSelector === el.tagName.toLowerCase();
  var ancestorSelector;

  var currElement = el;
  while (currElement.parentElement != null && !ancestorSelector) {
      currElement = currElement.parentElement;
      var selector = getElementSelector(currElement).selector;

      // Typically elements that have a class name or title, those are less likely
      // to change, and also be unique.  So, we are trying to find an ancestor
      // to anchor (or scope) the search for the element, and make it less brittle.
      if (selector !== currElement.tagName.toLowerCase()) {
          ancestorSelector = selector + (currElement === el.parentElement && isSimpleSelector ? " > " : " ") + elSelector;
      }
  }

  var finalSelectors = [];
  if (ancestorSelector) {
    finalSelectors.push(
      ancestorSelector + ":eq(" + _getSelectorIndex(el, ancestorSelector) + ")"
    );
  }

  finalSelectors.push(elSelector + ":eq(" + _getSelectorIndex(el, elSelector) + ")");
  return finalSelectors;
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

function getElementSelector(el, isUnique) {
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
  return parts[0];
}

module.exports = unique;
