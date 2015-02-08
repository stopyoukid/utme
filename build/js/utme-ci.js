(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.0.1
 */

(function() {
    "use strict";

    function $$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function $$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function $$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var $$utils$$_isArray;

    if (!Array.isArray) {
      $$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      $$utils$$_isArray = Array.isArray;
    }

    var $$utils$$isArray = $$utils$$_isArray;
    var $$utils$$now = Date.now || function() { return new Date().getTime(); };
    function $$utils$$F() { }

    var $$utils$$o_create = (Object.create || function (o) {
      if (arguments.length > 1) {
        throw new Error('Second argument not supported');
      }
      if (typeof o !== 'object') {
        throw new TypeError('Argument must be an object');
      }
      $$utils$$F.prototype = o;
      return new $$utils$$F();
    });

    var $$asap$$len = 0;

    var $$asap$$default = function asap(callback, arg) {
      $$asap$$queue[$$asap$$len] = callback;
      $$asap$$queue[$$asap$$len + 1] = arg;
      $$asap$$len += 2;
      if ($$asap$$len === 2) {
        // If len is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        $$asap$$scheduleFlush();
      }
    };

    var $$asap$$browserGlobal = (typeof window !== 'undefined') ? window : {};
    var $$asap$$BrowserMutationObserver = $$asap$$browserGlobal.MutationObserver || $$asap$$browserGlobal.WebKitMutationObserver;

    // test for web worker but not in IE10
    var $$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function $$asap$$useNextTick() {
      return function() {
        process.nextTick($$asap$$flush);
      };
    }

    function $$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new $$asap$$BrowserMutationObserver($$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function $$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = $$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function $$asap$$useSetTimeout() {
      return function() {
        setTimeout($$asap$$flush, 1);
      };
    }

    var $$asap$$queue = new Array(1000);

    function $$asap$$flush() {
      for (var i = 0; i < $$asap$$len; i+=2) {
        var callback = $$asap$$queue[i];
        var arg = $$asap$$queue[i+1];

        callback(arg);

        $$asap$$queue[i] = undefined;
        $$asap$$queue[i+1] = undefined;
      }

      $$asap$$len = 0;
    }

    var $$asap$$scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      $$asap$$scheduleFlush = $$asap$$useNextTick();
    } else if ($$asap$$BrowserMutationObserver) {
      $$asap$$scheduleFlush = $$asap$$useMutationObserver();
    } else if ($$asap$$isWorker) {
      $$asap$$scheduleFlush = $$asap$$useMessageChannel();
    } else {
      $$asap$$scheduleFlush = $$asap$$useSetTimeout();
    }

    function $$$internal$$noop() {}
    var $$$internal$$PENDING   = void 0;
    var $$$internal$$FULFILLED = 1;
    var $$$internal$$REJECTED  = 2;
    var $$$internal$$GET_THEN_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function $$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.')
    }

    function $$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        $$$internal$$GET_THEN_ERROR.error = error;
        return $$$internal$$GET_THEN_ERROR;
      }
    }

    function $$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function $$$internal$$handleForeignThenable(promise, thenable, then) {
       $$asap$$default(function(promise) {
        var sealed = false;
        var error = $$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            $$$internal$$resolve(promise, value);
          } else {
            $$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          $$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          $$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function $$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, thenable._result);
      } else if (promise._state === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, thenable._result);
      } else {
        $$$internal$$subscribe(thenable, undefined, function(value) {
          $$$internal$$resolve(promise, value);
        }, function(reason) {
          $$$internal$$reject(promise, reason);
        });
      }
    }

    function $$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        $$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = $$$internal$$getThen(maybeThenable);

        if (then === $$$internal$$GET_THEN_ERROR) {
          $$$internal$$reject(promise, $$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          $$$internal$$fulfill(promise, maybeThenable);
        } else if ($$utils$$isFunction(then)) {
          $$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          $$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function $$$internal$$resolve(promise, value) {
      if (promise === value) {
        $$$internal$$reject(promise, $$$internal$$selfFullfillment());
      } else if ($$utils$$objectOrFunction(value)) {
        $$$internal$$handleMaybeThenable(promise, value);
      } else {
        $$$internal$$fulfill(promise, value);
      }
    }

    function $$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      $$$internal$$publish(promise);
    }

    function $$$internal$$fulfill(promise, value) {
      if (promise._state !== $$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = $$$internal$$FULFILLED;

      if (promise._subscribers.length === 0) {
      } else {
        $$asap$$default($$$internal$$publish, promise);
      }
    }

    function $$$internal$$reject(promise, reason) {
      if (promise._state !== $$$internal$$PENDING) { return; }
      promise._state = $$$internal$$REJECTED;
      promise._result = reason;

      $$asap$$default($$$internal$$publishRejection, promise);
    }

    function $$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + $$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + $$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        $$asap$$default($$$internal$$publish, parent);
      }
    }

    function $$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          $$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function $$$internal$$ErrorObject() {
      this.error = null;
    }

    var $$$internal$$TRY_CATCH_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        $$$internal$$TRY_CATCH_ERROR.error = e;
        return $$$internal$$TRY_CATCH_ERROR;
      }
    }

    function $$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = $$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = $$$internal$$tryCatch(callback, detail);

        if (value === $$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          $$$internal$$reject(promise, $$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== $$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        $$$internal$$resolve(promise, value);
      } else if (failed) {
        $$$internal$$reject(promise, error);
      } else if (settled === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, value);
      } else if (settled === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, value);
      }
    }

    function $$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          $$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          $$$internal$$reject(promise, reason);
        });
      } catch(e) {
        $$$internal$$reject(promise, e);
      }
    }

    function $$$enumerator$$makeSettledResult(state, position, value) {
      if (state === $$$internal$$FULFILLED) {
        return {
          state: 'fulfilled',
          value: value
        };
      } else {
        return {
          state: 'rejected',
          reason: value
        };
      }
    }

    function $$$enumerator$$Enumerator(Constructor, input, abortOnReject, label) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor($$$internal$$noop, label);
      this._abortOnReject = abortOnReject;

      if (this._validateInput(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._init();

        if (this.length === 0) {
          $$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            $$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        $$$internal$$reject(this.promise, this._validationError());
      }
    }

    $$$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return $$utils$$isArray(input);
    };

    $$$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    $$$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var $$$enumerator$$default = $$$enumerator$$Enumerator;

    $$$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var promise = this.promise;
      var input   = this._input;

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    $$$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      if ($$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== $$$internal$$PENDING) {
          entry._onerror = null;
          this._settledAt(entry._state, i, entry._result);
        } else {
          this._willSettleAt(c.resolve(entry), i);
        }
      } else {
        this._remaining--;
        this._result[i] = this._makeResult($$$internal$$FULFILLED, i, entry);
      }
    };

    $$$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === $$$internal$$PENDING) {
        this._remaining--;

        if (this._abortOnReject && state === $$$internal$$REJECTED) {
          $$$internal$$reject(promise, value);
        } else {
          this._result[i] = this._makeResult(state, i, value);
        }
      }

      if (this._remaining === 0) {
        $$$internal$$fulfill(promise, this._result);
      }
    };

    $$$enumerator$$Enumerator.prototype._makeResult = function(state, i, value) {
      return value;
    };

    $$$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      $$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt($$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt($$$internal$$REJECTED, i, reason);
      });
    };

    var $$promise$all$$default = function all(entries, label) {
      return new $$$enumerator$$default(this, entries, true /* abort on reject */, label).promise;
    };

    var $$promise$race$$default = function race(entries, label) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor($$$internal$$noop, label);

      if (!$$utils$$isArray(entries)) {
        $$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        $$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        $$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        $$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    };

    var $$promise$resolve$$default = function resolve(object, label) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$resolve(promise, object);
      return promise;
    };

    var $$promise$reject$$default = function reject(reason, label) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$reject(promise, reason);
      return promise;
    };

    var $$es6$promise$promise$$counter = 0;

    function $$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function $$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var $$es6$promise$promise$$default = $$es6$promise$promise$$Promise;

    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function $$es6$promise$promise$$Promise(resolver) {
      this._id = $$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if ($$$internal$$noop !== resolver) {
        if (!$$utils$$isFunction(resolver)) {
          $$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof $$es6$promise$promise$$Promise)) {
          $$es6$promise$promise$$needsNew();
        }

        $$$internal$$initializePromise(this, resolver);
      }
    }

    $$es6$promise$promise$$Promise.all = $$promise$all$$default;
    $$es6$promise$promise$$Promise.race = $$promise$race$$default;
    $$es6$promise$promise$$Promise.resolve = $$promise$resolve$$default;
    $$es6$promise$promise$$Promise.reject = $$promise$reject$$default;

    $$es6$promise$promise$$Promise.prototype = {
      constructor: $$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === $$$internal$$FULFILLED && !onFulfillment || state === $$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor($$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          $$asap$$default(function(){
            $$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          $$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    var $$es6$promise$polyfill$$default = function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport =
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return $$utils$$isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = $$es6$promise$promise$$default;
      }
    };

    var es6$promise$umd$$ES6Promise = {
      'Promise': $$es6$promise$promise$$default,
      'polyfill': $$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = es6$promise$umd$$ES6Promise;
    }
}).call(this);
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":1}],3:[function(require,module,exports){
"use strict";
var utme = require('../utme.js');
var serverReporter = {
  baseUrl: getParameterByName("utme_test_server") || "http://0.0.0.0:9043/",
  error: function(error, scenario, utme) {
    $.ajax({
      type: "POST",
      url: serverReporter.baseUrl + "error",
      data: {data: error},
      dataType: "json"
    });
    console.error(error);
  },
  log: function(log, scenario, utme) {
    $.ajax({
      type: "POST",
      url: serverReporter.baseUrl + "log",
      data: {data: log},
      dataType: "json"
    });
    console.log(log);
  },
  loadScenario: function(name, callback) {
    $.ajax({
      jsonp: "callback",
      contentType: "application/json; charset=utf-8",
      crossDomain: true,
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
      data: JSON.stringify(scenario, null, " "),
      dataType: 'json',
      contentType: "application/json"
    });
  },
  loadSettings: function(callback, error) {
    $.ajax({
      contentType: "text/plan; charset=utf-8",
      crossDomain: true,
      url: serverReporter.baseUrl + "settings",
      dataType: "json",
      success: function(resp) {
        callback(resp);
      },
      error: function(err) {
        error(err);
      }
    });
  }
};
utme.registerReportHandler(serverReporter);
utme.registerLoadHandler(serverReporter.loadScenario);
utme.registerSaveHandler(serverReporter.saveScenario);
utme.registerSettingsLoadHandler(serverReporter.loadSettings);
function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/reporters/server-reporter.js
},{"../utme.js":8}],4:[function(require,module,exports){
"use strict";
function unique(el, doc) {
  if (!el || !el.tagName) {
    throw new TypeError('Element expected');
  }
  function _getSelectorIndex(element, selector) {
    var existingIndex = 0;
    var items = doc.querySelectorAll(selector);
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
    if (selector !== currElement.tagName.toLowerCase()) {
      ancestorSelector = selector + (currElement === el.parentElement && isSimpleSelector ? " > " : " ") + elSelector;
    }
  }
  var finalSelectors = [];
  if (ancestorSelector) {
    finalSelectors.push(ancestorSelector + ":eq(" + _getSelectorIndex(el, ancestorSelector) + ")");
  }
  finalSelectors.push(elSelector + ":eq(" + _getSelectorIndex(el, elSelector) + ")");
  return finalSelectors;
}
;
function getClassNames(el) {
  var className = el.getAttribute('class');
  className = className && className.replace('utme-verify', '');
  className = className && className.replace('utme-ready', '');
  if (!className || (!className.trim().length)) {
    return [];
  }
  className = className.replace(/\s+/g, ' ');
  className = className.replace(/^\s+|\s+$/g, '');
  return className.trim().split(' ');
}
function getElementSelector(el, isUnique) {
  var parts = [];
  var label = null;
  var title = null;
  var alt = null;
  var name = null;
  var value = null;
  var me = el;
  if (el.id) {
    label = '[id=\'' + el.id + "\']";
  } else {
    label = el.tagName.toLowerCase();
    var classNames = getClassNames(el);
    if (classNames.length) {
      label += '.' + classNames.join('.');
    }
  }
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
  parts.unshift({
    element: el,
    selector: label
  });
  if (!parts.length) {
    throw new Error('Failed to identify CSS selector');
  }
  return parts[0];
}
module.exports = unique;


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/selectorFinder.js
},{}],5:[function(require,module,exports){
"use strict";
var _ = require('./utils');
var local_storage_key = 'utme-settings';
function Settings(defaultSettings) {
  this.setDefaults(defaultSettings || {});
}
Settings.prototype = {
  readSettingsFromLocalStorage: function() {
    var settingsString = localStorage.getItem(local_storage_key);
    var settings = {};
    if (settingsString) {
      settings = JSON.parse(settingsString);
    }
    return settings;
  },
  setDefaults: function(defaultSettings) {
    var localSettings = this.readSettingsFromLocalStorage();
    var defaultsCopy = _.extend({}, defaultSettings || {});
    this.settings = _.extend({}, _.extend(defaultsCopy, localSettings));
    this.defaultSettings = defaultSettings;
  },
  set: function(key, value) {
    this.settings[key] = value;
    this.save();
  },
  get: function(key) {
    return this.settings[key];
  },
  save: function() {
    localStorage.setItem(local_storage_key, JSON.stringify(this.settings));
  },
  resetDefaults: function() {
    var defaults = this.defaultSettings;
    if (defaults) {
      this.settings = _.extend({}, defaults);
      this.save();
    }
  }
};
module.exports = Settings;


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/settings.js
},{"./utils":7}],6:[function(require,module,exports){
"use strict";
var _ = require('./utils');
var Simulate = {
  event: function(element, eventName, options) {
    var evt;
    if (document.createEvent) {
      evt = document.createEvent("HTMLEvents");
      evt.initEvent(eventName, eventName != 'mouseenter' && eventName != 'mouseleave', true);
      _.extend(evt, options);
      element.dispatchEvent(evt);
    } else {
      evt = document.createEventObject();
      element.fireEvent('on' + eventName, evt);
    }
  },
  keyEvent: function(element, type, options) {
    var evt,
        e = {
          bubbles: true,
          cancelable: true,
          view: window,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          keyCode: 0,
          charCode: 0
        };
    _.extend(e, options);
    if (document.createEvent) {
      try {
        evt = document.createEvent('KeyEvents');
        evt.initKeyEvent(type, e.bubbles, e.cancelable, e.view, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.keyCode, e.charCode);
        element.dispatchEvent(evt);
      } catch (err) {
        evt = document.createEvent("Events");
        evt.initEvent(type, e.bubbles, e.cancelable);
        _.extend(evt, {
          view: e.view,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
          keyCode: e.keyCode,
          charCode: e.charCode
        });
        element.dispatchEvent(evt);
      }
    }
  }
};
Simulate.keypress = function(element, chr) {
  var charCode = chr.charCodeAt(0);
  this.keyEvent(element, 'keypress', {
    keyCode: charCode,
    charCode: charCode
  });
};
Simulate.keydown = function(element, chr) {
  var charCode = chr.charCodeAt(0);
  this.keyEvent(element, 'keydown', {
    keyCode: charCode,
    charCode: charCode
  });
};
Simulate.keyup = function(element, chr) {
  var charCode = chr.charCodeAt(0);
  this.keyEvent(element, 'keyup', {
    keyCode: charCode,
    charCode: charCode
  });
};
var events = ['click', 'focus', 'blur', 'dblclick', 'input', 'change', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mouseenter', 'mouseleave', 'resize', 'scroll', 'select', 'submit', 'load', 'unload'];
for (var i = events.length; i--; ) {
  var event = events[i];
  Simulate[event] = (function(evt) {
    return function(element, options) {
      this.event(element, evt, options);
    };
  }(event));
}
module.exports = Simulate;


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/simulate.js
},{"./utils":7}],7:[function(require,module,exports){
"use strict";
(function() {
  var Ap = Array.prototype;
  var slice = Ap.slice;
  var Fp = Function.prototype;
  if (!Fp.bind) {
    Fp.bind = function(context) {
      var func = this;
      var args = slice.call(arguments, 1);
      function bound() {
        var invokedAsConstructor = func.prototype && (this instanceof func);
        return func.apply(!invokedAsConstructor && context || this, args.concat(slice.call(arguments)));
      }
      bound.prototype = func.prototype;
      return bound;
    };
  }
})();
module.exports = {
  extend: function extend(dst, src) {
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


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/utils.js
},{}],8:[function(require,module,exports){
(function (global){
"use strict";
var _ = require('./utils');
var Promise = require('es6-promise').Promise;
var Simulate = require('./simulate');
var selectorFinder = require('./selectorFinder');
var Settings = require('./settings');
var importantStepLength = 500;
var saveHandlers = [];
var reportHandlers = [];
var loadHandlers = [];
var settingsLoadHandlers = [];
function getScenario(name) {
  return new Promise(function(resolve, reject) {
    if (loadHandlers.length === 0) {
      var state = utme.state;
      for (var i = 0; i < state.scenarios.length; i++) {
        if (state.scenarios[i].name === name) {
          resolve(state.scenarios[i]);
        }
      }
    } else {
      loadHandlers[0](name, function(resp) {
        resolve(resp);
      });
    }
  });
}
var validating = false;
var events = ['click', 'focus', 'blur', 'dblclick', 'mousedown', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'mouseup', 'change'];
function getPreconditions(scenario) {
  var setup = scenario.setup;
  var scenarios = setup && setup.scenarios;
  if (scenarios) {
    return Promise.all(_.map(scenarios, function(scenarioName) {
      return getScenario(scenarioName).then(function(otherScenario) {
        otherScenario = JSON.parse(JSON.stringify(otherScenario));
        return otherScenario.steps;
      });
    }));
  } else {
    return Promise.resolve([]);
  }
}
function getPostconditions(scenario) {
  var cleanup = scenario.cleanup;
  var scenarios = cleanup && cleanup.scenarios;
  if (scenarios) {
    return Promise.all(_.map(scenarios, function(scenarioName) {
      return getScenario(scenarioName).then(function(otherScenario) {
        otherScenario = JSON.parse(JSON.stringify(otherScenario));
        return otherScenario.steps;
      });
    }));
  } else {
    return Promise.resolve([]);
  }
}
function _concatScenarioStepLists(steps) {
  var newSteps = [];
  var currentTimestamp;
  for (var j = 0; j < steps.length; j++) {
    var flatSteps = steps[j];
    if (j > 0) {
      for (var k = 0; k < steps.length; k++) {
        var step = flatSteps[k];
        var diff = k > 0 ? step.timeStamp - flatSteps[k - 1].timeStamp : 50;
        currentTimestamp += diff;
        flatSteps[k].timeStamp = currentTimestamp;
      }
    } else {
      currentTimestamp = flatSteps[j].timeStamp;
    }
    newSteps = newSteps.concat(flatSteps);
  }
  return newSteps;
}
function setupConditions(scenario) {
  var promises = [];
  return Promise.all([getPreconditions(scenario), getPostconditions(scenario)]).then(function(stepArrays) {
    var stepLists = stepArrays[0].concat([scenario.steps], stepArrays[1]);
    scenario.steps = _concatScenarioStepLists(stepLists);
  });
}
function runStep(scenario, idx, toSkip) {
  utme.broadcast('RUNNING_STEP');
  toSkip = toSkip || {};
  var step = scenario.steps[idx];
  var state = utme.state;
  if (step && state.status == 'PLAYING') {
    state.run.scenario = scenario;
    state.run.stepIndex = idx;
    if (step.eventName == 'load') {
      var location = step.data.url.protocol + "//" + step.data.url.host + "/";
      var search = step.data.url.search;
      var hash = step.data.url.hash;
      var testServer = getParameterByName("utme_test_server");
      if (testServer) {
        search += (search ? "&" : "?") + "utme_test_server=" + testServer;
      }
      window.location.replace(location + search + hash);
      console.log((location.protocol + location.host + location.search));
      console.log((step.data.url.protocol + step.data.url.host + step.data.url.search));
      if ((location.protocol + location.host + location.search) === (step.data.url.protocol + step.data.url.host + step.data.url.search)) {
        runNextStep(scenario, idx, toSkip, 0);
      }
    } else if (step.eventName == 'timeout') {
      if (state.autoRun) {
        runNextStep(scenario, idx, toSkip, step.data.amount);
      }
    } else {
      var locator = step.data.locator;
      var steps = scenario.steps;
      var uniqueId = getUniqueIdFromStep(step);
      if (typeof toSkip[uniqueId] == 'undefined' && utme.state.run.speed != 'realtime') {
        var diff;
        var ignore = false;
        for (var j = steps.length - 1; j > idx; j--) {
          var otherStep = steps[j];
          var otherUniqueId = getUniqueIdFromStep(otherStep);
          if (uniqueId === otherUniqueId) {
            if (!diff) {
              diff = (otherStep.timeStamp - step.timeStamp);
              ignore = !isImportantStep(otherStep) && diff < importantStepLength;
            } else if (isInteractiveStep(otherStep)) {
              ignore = false;
              break;
            }
          }
        }
        toSkip[uniqueId] = ignore;
      }
      if (toSkip[getUniqueIdFromStep(step)]) {
        runNextStep(scenario, idx, toSkip);
      } else {
        tryUntilFound(scenario, step, locator, getTimeout(scenario, idx)).then(function(eles) {
          var ele = eles[0];
          if (events.indexOf(step.eventName) >= 0) {
            var options = {};
            if (step.data.button) {
              options.which = options.button = step.data.button;
            }
            if (step.eventName == 'click') {
              $(ele).trigger('click');
            } else if ((step.eventName == 'focus' || step.eventName == 'blur') && ele[step.eventName]) {
              ele[step.eventName]();
            } else {
              Simulate[step.eventName](ele, options);
            }
            if (typeof step.data.value != "undefined") {
              ele.value = step.data.value;
              if (ele.tagName.toLowerCase() === 'input') {
                Simulate.event(ele, 'input');
              }
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
            utme.reportLog('Validate: ' + JSON.stringify(locator.selectors) + " contains text '" + step.data.text + "'");
          }
          if (state.autoRun) {
            runNextStep(scenario, idx, toSkip);
          }
        }, function(result) {
          if (step.eventName == 'validate') {
            utme.reportLog("Validate: " + result);
            utme.stopScenario(false);
          } else {
            utme.reportLog(result);
            if (state.autoRun) {
              runNextStep(scenario, idx, toSkip);
            }
          }
        });
      }
    }
  }
}
function waitForAngular(rootSelector) {
  var el = document.querySelector(rootSelector);
  return new Promise(function(resolve, reject) {
    try {
      if (!window.angular) {
        throw new Error('angular could not be found on the window');
      }
      if (angular.getTestability) {
        angular.getTestability(el).whenStable(resolve);
      } else {
        if (!angular.element(el).injector()) {
          throw new Error('root element (' + rootSelector + ') has no injector.' + ' this may mean it is not inside ng-app.');
        }
        angular.element(el).injector().get('$browser').notifyWhenNoOutstandingRequests(resolve);
      }
    } catch (err) {
      reject(err);
    }
  });
}
function isImportantStep(step) {
  return step.eventName != 'mouseleave' && step.eventName != 'mouseout' && step.eventName != 'blur';
}
function isInteractiveStep(step) {
  return;
  otherStep.eventName.indexOf("mouse") !== 0 || otherStep.eventName.indexOf("mousedown") === 0 || otherStep.eventName.indexOf("mouseup") === 0;
}
function tryUntilFound(scenario, step, locator, timeout, textToCheck) {
  var started;
  return new Promise(function(resolve, reject) {
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
      selectorsToTest.unshift('[data-unique-id="' + locator.uniqueId + '"]');
      for (var i = 0; i < selectorsToTest.length; i++) {
        var selector = selectorsToTest[i];
        if (isImportantStep(step)) {
          selector += ":visible";
        }
        eles = $(selector);
        if (eles.length == 1) {
          if (typeof textToCheck != 'undefined') {
            var newText = $(eles[0]).text();
            if ((comparison === 'equals' && newText === textToCheck) || (comparison === 'contains' && newText.indexOf(textToCheck) >= 0)) {
              foundValid = true;
              break;
            } else {
              foundDifferentText = true;
            }
          } else {
            foundValid = true;
            eles.attr('data-unique-id', locator.uniqueId);
            break;
          }
          break;
        } else if (eles.length > 1) {
          foundTooMany = true;
        }
      }
      if (foundValid) {
        resolve(eles);
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
        reject(result);
      }
    }
    var limit = importantStepLength / (utme.state.run.speed == 'realtime' ? '1' : utme.state.run.speed);
    if (global.angular) {
      waitForAngular('[ng-app]').then(function() {
        if (utme.state.run.speed === 'realtime') {
          setTimeout(tryFind, timeout);
        } else if (utme.state.run.speed === 'fastest') {
          tryFind();
        } else {
          setTimeout(tryFind, Math.min(timeout * utme.state.run.speed, limit));
        }
      });
    } else {
      if (utme.state.run.speed === 'realtime') {
        setTimeout(tryFind, timeout);
      } else if (utme.state.run.speed === 'fastest') {
        tryFind();
      } else {
        setTimeout(tryFind, Math.min(timeout * utme.state.run.speed, limit));
      }
    }
  });
}
function getTimeout(scenario, idx) {
  if (idx > 0) {
    if (scenario.steps[idx - 1].eventName == 'validate') {
      return 0;
    }
    return scenario.steps[idx].timeStamp - scenario.steps[idx - 1].timeStamp;
  }
  return 0;
}
function runNextStep(scenario, idx, toSkip, timeout) {
  setTimeout(function() {
    if (scenario.steps.length > (idx + 1)) {
      runStep(scenario, idx + 1, toSkip);
    } else {
      utme.stopScenario(true);
    }
  }, timeout || 0);
}
function fragmentFromString(strHTML) {
  var temp = document.createElement('template');
  temp.innerHTML = strHTML;
  return temp.content ? temp.content : temp;
}
function getUniqueIdFromStep(step) {
  return step && step.data && step.data.locator && step.data.locator.uniqueId;
}
var guid = (function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return function() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  };
})();
var listeners = [];
var state;
var settings;
var utme = {
  state: state,
  init: function() {
    var scenario = getParameterByName('utme_scenario');
    return utme.loadSettings().then(function() {
      if (scenario) {
        localStorage.clear();
        state = utme.state = utme.loadStateFromStorage();
        utme.broadcast('INITIALIZED');
        setTimeout(function() {
          state.autoRun = true;
          var runConfig = getParameterByName('utme_run_config');
          if (runConfig) {
            runConfig = JSON.parse(runConfig);
          }
          runConfig = runConfig || {};
          var speed = getParameterByName('utme_run_speed');
          if (speed) {
            runConfig.speed = speed;
          }
          utme.runScenario(scenario, runConfig);
        }, 2000);
      } else {
        state = utme.state = utme.loadStateFromStorage();
        utme.broadcast('INITIALIZED');
        if (state.status === "PLAYING") {
          runNextStep(state.run.scenario, state.run.stepIndex);
        } else if (!state.status || state.status === 'INITIALIZING') {
          state.status = "LOADED";
        }
      }
    });
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
      utme.registerEvent("load", {url: {
          protocol: window.location.protocol,
          host: window.location.host,
          search: window.location.search,
          hash: window.location.hash
        }});
    }
  },
  runScenario: function(name, config) {
    var toRun = name || prompt('Scenario to run');
    var autoRun = !name ? prompt('Would you like to step through each step (y|n)?') != 'y' : true;
    return getScenario(toRun).then(function(scenario) {
      scenario = JSON.parse(JSON.stringify(scenario));
      utme.state.run = _.extend({speed: '10'}, config);
      setupConditions(scenario).then(function() {
        state.autoRun = autoRun === true;
        state.status = "PLAYING";
        utme.reportLog("Starting Scenario '" + name + "'", scenario);
        utme.broadcast('PLAYBACK_STARTED');
        runStep(scenario, 0);
      });
    });
  },
  runNextStep: runNextStep,
  stopScenario: function(success) {
    var scenario = state.run && state.run.scenario;
    delete state.run;
    state.status = "LOADED";
    utme.broadcast('PLAYBACK_STOPPED');
    utme.reportLog("Stopping Scenario");
    if (scenario) {
      if (success) {
        utme.reportLog("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
      } else {
        utme.reportError("[FAILURE] Scenario '" + scenario.name + "' Completed!");
      }
    }
  },
  createElementLocator: function(element) {
    var uniqueId = element.getAttribute("data-unique-id") || guid();
    element.setAttribute("data-unique-id", uniqueId);
    var eleHtml = element.cloneNode().outerHTML;
    var eleSelectors = [];
    if (element.tagName.toUpperCase() == 'BODY' || element.tagName.toUpperCase() == 'HTML') {
      eleSelectors = [element.tagName];
    } else {
      eleSelectors = selectorFinder(element, document.body);
    }
    return {
      uniqueId: uniqueId,
      selectors: eleSelectors
    };
  },
  registerEvent: function(eventName, data, idx) {
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
  reportLog: function(log, scenario) {
    if (reportHandlers && reportHandlers.length) {
      for (var i = 0; i < reportHandlers.length; i++) {
        reportHandlers[i].log(log, scenario, utme);
      }
    }
  },
  reportError: function(error, scenario) {
    if (reportHandlers && reportHandlers.length) {
      for (var i = 0; i < reportHandlers.length; i++) {
        reportHandlers[i].error(error, scenario, utme);
      }
    }
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
  registerSettingsLoadHandler: function(handler) {
    settingsLoadHandlers.push(handler);
  },
  isRecording: function() {
    return utme.state.status.indexOf("RECORDING") === 0;
  },
  isPlaying: function() {
    return utme.state.status.indexOf("PLAYING") === 0;
  },
  isValidating: function(validating) {
    if (typeof validating !== 'undefined' && (utme.isRecording() || utme.isValidating())) {
      utme.state.status = validating ? "VALIDATING" : "RECORDING";
      utme.broadcast('VALIDATION_CHANGED');
    }
    return utme.state.status.indexOf("VALIDATING") === 0;
  },
  stopRecording: function(info) {
    if (info !== false) {
      var newScenario = {steps: state.steps};
      _.extend(newScenario, info);
      if (!newScenario.name) {
        newScenario.name = prompt('Enter scenario name');
      }
      if (newScenario.name) {
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
  loadSettings: function() {
    var settings = utme.settings = new Settings();
    if (settingsLoadHandlers.length > 0 && !getParameterByName('utme_scenario')) {
      return new Promise(function(resolve, reject) {
        settingsLoadHandlers[0](function(resp) {
          settings.setDefaults(resp);
          resolve();
        }, function() {
          resolve();
        });
      });
    } else {
      return Promise.resolve();
    }
  },
  loadStateFromStorage: function() {
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
  saveStateToStorage: function(utmeState) {
    if (utmeState) {
      localStorage.setItem('utme', JSON.stringify(utmeState));
    } else {
      localStorage.removeItem('utme');
    }
  },
  unload: function() {
    utme.saveStateToStorage(state);
  }
};
function toggleHighlight(ele, value) {
  $(ele).toggleClass('utme-verify', value);
}
function toggleReady(ele, value) {
  $(ele).toggleClass('utme-ready', value);
}
function isNotInLabelOrValid(ele) {
  return $(ele).parents('label').length == 0 || ele.nodeName.toLowerCase() == 'input';
}
var timers = [];
function initEventHandlers() {
  for (var i = 0; i < events.length; i++) {
    document.addEventListener(events[i], (function(evt) {
      var handler = function(e) {
        if (e.isTrigger)
          return;
        if (utme.isRecording() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore') && $(e.target).parents("[data-ignore]").length == 0 && isNotInLabelOrValid(e.target)) {
          var idx = utme.state.steps.length;
          var args = {locator: utme.createElementLocator(e.target)};
          var timer;
          if (e.which || e.button) {
            args.button = e.which || e.button;
          }
          if (evt == 'mouseover') {
            toggleHighlight(e.target, true);
            timers.push({
              element: e.target,
              timer: setTimeout(function() {
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
      (utme.eventListeners = utme.eventListeners || {})[evt] = handler;
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
    '187': '61',
    '186': '59',
    '189': '45'
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
  function keyPressHandler(e) {
    if (e.isTrigger)
      return;
    if (utme.isRecording() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore') && $(e.target).parents("[data-ignore]").length == 0) {
      var c = e.which;
      if (_to_ascii.hasOwnProperty(c)) {
        c = _to_ascii[c];
      }
      if (!e.shiftKey && (c >= 65 && c <= 90)) {
        c = String.fromCharCode(c + 32);
      } else if (e.shiftKey && shiftUps.hasOwnProperty(c)) {
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
  }
  document.addEventListener('keypress', keyPressHandler, true);
  (utme.eventListeners = utme.eventListeners || {})['keypress'] = keyPressHandler;
}
function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
function bootstrapUtme() {
  if (document.readyState == "complete") {
    utme.init().then(function() {
      initEventHandlers();
      if (utme.isRecording()) {
        utme.registerEvent("load", {url: {
            protocol: window.location.protocol,
            host: window.location.host,
            search: window.location.search,
            hash: window.location.hash
          }});
      }
    });
  }
}
bootstrapUtme();
document.addEventListener('readystatechange', bootstrapUtme);
window.addEventListener('unload', function() {
  utme.unload();
}, true);
window.addEventListener('error', function(err) {
  utme.reportLog("Script Error: " + err.message + ":" + err.url + "," + err.line + ":" + err.col);
});
module.exports = utme;


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/utme.js
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./selectorFinder":4,"./settings":5,"./simulate":6,"./utils":7,"es6-promise":2}]},{},[3,4,5,6,7,8]);
