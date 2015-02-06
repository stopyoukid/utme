/**
 * Polyfills
 */

/**
 * This is copied from ReacJS's own polypfill to run tests with phantomjs.
 * https://github.com/facebook/react/blob/3dc10749080a460e48bee46d769763ec7191ac76/src/test/phantomjs-shims.js
 */
(function() {

    var Ap = Array.prototype;
    var slice = Ap.slice;
    var Fp = Function.prototype;

    if (!Fp.bind) {
      // PhantomJS doesn't support Function.prototype.bind natively, so
      // polyfill it whenever this module is required.
      Fp.bind = function(context) {
        var func = this;
        var args = slice.call(arguments, 1);

        function bound() {
          var invokedAsConstructor = func.prototype && (this instanceof func);
          return func.apply(
            // Ignore the context parameter when invoking the bound function
            // as a constructor. Note that this includes not only constructor
            // invocations using the new keyword but also calls to base class
            // constructors such as BaseClass.call(this, ...) or super(...).
            !invokedAsConstructor && context || this,
            args.concat(slice.call(arguments))
          );
        }

        // The bound function must share the .prototype of the unbound
        // function so that any object created by one constructor will count
        // as an instance of both constructors.
        bound.prototype = func.prototype;

        return bound;
      };
    }

})();

module.exports = {

    extend: function extend(dst, src){
        if (src) {
            for (var key in src) {
                if (src.hasOwnProperty(key)) {
                    dst[key] = src[key];
                }
            }
        }
        return dst;
    },

    map: function(obj, callback, thisArg) {
        var len = obj.length >>> 0;
        var newArray = new Array(len);
        var key = 0;
        if (!thisArg) {
            thisArg = obj;
        }
        while (key < len) {
            newArray[key] = callback.call(thisArg, this[key], key, obj);
            key++;
        }
        return newArray;
    }

};