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
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 2014-12-17
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
		// See https://code.google.com/p/chromium/issues/detail?id=375297#c7 and
		// https://github.com/eligrey/FileSaver.js/commit/485930a#commitcomment-8768047
		// for the reasoning behind the timeout and revocation flow
		, arbitrary_revoke_timeout = 500 // in ms
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
  define([], function() {
    return saveAs;
  });
}

},{}],4:[function(require,module,exports){
"use strict";
var utme = require('../utme');
var saveAs = require('filesaver.js');
module.exports = utme.registerSaveHandler(function(scenario) {
  var blob = new Blob([JSON.stringify(scenario, null, " ")], {type: "text/plain;charset=utf-8"});
  saveAs(blob, scenario.name + ".json");
});


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/persisters/utme-file-persister.js
},{"../utme":10,"filesaver.js":3}],5:[function(require,module,exports){
"use strict";
var utme = require('../utme.js');
function getBaseURL() {
  return utme.state && utme.state.testServer ? utme.state.testServer : getParameterByName("utme_test_server") || "http://0.0.0.0:9043/";
}
var serverReporter = {
  error: function(error, scenario, utme) {
    $.ajax({
      type: "POST",
      url: getBaseURL() + "error",
      data: {data: error},
      dataType: "json"
    });
    if (utme.settings.get("consoleLogging")) {
      console.error(error);
    }
  },
  success: function(success, scenario, utme) {
    $.ajax({
      type: "POST",
      url: getBaseURL() + "success",
      data: {data: success},
      dataType: "json"
    });
    if (utme.settings.get("consoleLogging")) {
      console.log(success);
    }
  },
  log: function(log, scenario, utme) {
    $.ajax({
      type: "POST",
      url: getBaseURL() + "log",
      data: {data: log},
      dataType: "json"
    });
    if (utme.settings.get("consoleLogging")) {
      console.log(log);
    }
  },
  loadScenario: function(name, callback) {
    $.ajax({
      jsonp: "callback",
      contentType: "application/json; charset=utf-8",
      crossDomain: true,
      url: getBaseURL() + "scenario/" + name,
      dataType: "jsonp",
      success: function(resp) {
        callback(resp);
      }
    });
  },
  saveScenario: function(scenario) {
    $.ajax({
      type: "POST",
      url: getBaseURL() + "scenario",
      data: JSON.stringify(scenario, null, " "),
      dataType: 'json',
      contentType: "application/json"
    });
  },
  loadSettings: function(callback, error) {
    $.ajax({
      contentType: "text/plan; charset=utf-8",
      crossDomain: true,
      url: getBaseURL() + "settings",
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


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/reporters/server-reporter.js
},{"../utme.js":10}],6:[function(require,module,exports){
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


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/selectorFinder.js
},{}],7:[function(require,module,exports){
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


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/settings.js
},{"./utils":9}],8:[function(require,module,exports){
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


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/simulate.js
},{"./utils":9}],9:[function(require,module,exports){
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


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/utils.js
},{}],10:[function(require,module,exports){
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
      var newLocation = step.data.url.protocol + "//" + step.data.url.host;
      var search = step.data.url.search;
      var hash = step.data.url.hash;
      if (search && !search.charAt("?")) {
        search = "?" + search;
      }
      var isSameURL = (location.protocol + "//" + location.host + location.search) === (newLocation + search);
      window.location.replace(newLocation + hash + search);
      console.log((location.protocol + location.host + location.search));
      console.log((step.data.url.protocol + step.data.url.host + step.data.url.search));
      if (isSameURL) {
        window.reload(true);
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
          var tagName = ele.tagName.toLowerCase();
          var supportsInputEvent = tagName === 'input' || tagName === 'textarea' || ele.getAttribute('contenteditable');
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
              if (supportsInputEvent) {
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
            if (supportsInputEvent) {
              Simulate.event(ele, 'input');
            }
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
          } else if (isImportantStep(step)) {
            utme.reportError("Failed on step: " + idx + "  Event: " + step.eventName + " Reason: " + result);
            utme.stopScenario(false);
          } else {
            if (settings.get('verbose')) {
              utme.reportLog(result);
            }
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
  return step.eventName != 'mouseleave' && step.eventName != 'mouseout' && step.eventName != 'mouseenter' && step.eventName != 'mouseover' && step.eventName != 'blur' && step.eventName != 'focus';
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
          state.testServer = getParameterByName("utme_test_server");
          state.autoRun = true;
          var runConfig = getParameterByName('utme_run_config');
          if (runConfig) {
            runConfig = JSON.parse(runConfig);
          }
          runConfig = runConfig || {};
          var speed = getParameterByName('utme_run_speed') || settings.get("runner.speed");
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
        utme.reportSuccess("[SUCCESS] Scenario '" + scenario.name + "' Completed!");
      } else {
        utme.reportLog("Stopping on page " + window.location.href);
        utme.reportError("[FAILURE] Scenario '" + scenario.name + "' Stopped!");
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
  reportSuccess: function(message, scenario) {
    if (reportHandlers && reportHandlers.length) {
      for (var i = 0; i < reportHandlers.length; i++) {
        reportHandlers[i].success(message, scenario, utme);
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
    settings = utme.settings = new Settings();
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


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/utme.js
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./selectorFinder":6,"./settings":7,"./simulate":8,"./utils":9,"es6-promise":2}]},{},[4,5,6,7,8,9,10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvZXM2LXByb21pc2UuanMiLCJub2RlX21vZHVsZXMvZmlsZXNhdmVyLmpzL0ZpbGVTYXZlci5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvRGV2ZWxvcGVyL2F0c2lkL1Byb2plY3RzL3V0bWUvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQUEsQUFBSSxFQUFBLENBQUEsSUFBRyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUM7QUFDN0IsQUFBSSxFQUFBLENBQUEsTUFBSyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7QUFFcEMsS0FBSyxRQUFRLEVBQUksQ0FBQSxJQUFHLG9CQUFvQixB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U0FBUztBQUNqQyxlQUFHLENBQUcsQ0FBQSxNQUFLLFNBQVMsS0FBSztBQUN6QixpQkFBSyxDQUFHLENBQUEsTUFBSyxTQUFTLE9BQU87QUFDN0IsZUFBRyxDQUFHLENBQUEsTUFBSyxTQUFTLEtBQUs7QUFBQSxVQUM3QixDQUNKLENBQUMsQ0FBQztNQUNOO0FBQUEsSUFDSixDQUFDLENBQUM7RUFDSjtBQUFBLEFBQ0Y7QUFBQSxBQUVBLFlBQVksQUFBQyxFQUFDLENBQUM7QUFDZixPQUFPLGlCQUFpQixBQUFDLENBQUMsa0JBQWlCLENBQUcsY0FBWSxDQUFDLENBQUM7QUFFNUQsS0FBSyxpQkFBaUIsQUFBQyxDQUFDLFFBQU8sQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUMxQyxLQUFHLE9BQU8sQUFBQyxFQUFDLENBQUM7QUFDakIsQ0FBRyxLQUFHLENBQUMsQ0FBQztBQUVSLEtBQUssaUJBQWlCLEFBQUMsQ0FBQyxPQUFNLENBQUcsVUFBVSxHQUFFLENBQUc7QUFDNUMsS0FBRyxVQUFVLEFBQUMsQ0FBQyxnQkFBZSxFQUFJLENBQUEsR0FBRSxRQUFRLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsSUFBSSxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLEtBQUssQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxJQUFJLENBQUMsQ0FBQztBQUNuRyxDQUFDLENBQUM7QUFFRixLQUFLLFFBQVEsRUFBSSxLQUFHLENBQUM7QUFFNDg0RSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2pha2VhcmNoaWJhbGQvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMi4wLjFcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyB8fCAodHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZSh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJF9pc0FycmF5O1xuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJGlzQXJyYXkgPSAkJHV0aWxzJCRfaXNBcnJheTtcbiAgICB2YXIgJCR1dGlscyQkbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRGKCkgeyB9XG5cbiAgICB2YXIgJCR1dGlscyQkb19jcmVhdGUgPSAoT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vjb25kIGFyZ3VtZW50IG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIH1cbiAgICAgICQkdXRpbHMkJEYucHJvdG90eXBlID0gbztcbiAgICAgIHJldHVybiBuZXcgJCR1dGlscyQkRigpO1xuICAgIH0pO1xuXG4gICAgdmFyICQkYXNhcCQkbGVuID0gMDtcblxuICAgIHZhciAkJGFzYXAkJGRlZmF1bHQgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICAgICQkYXNhcCQkcXVldWVbJCRhc2FwJCRsZW5dID0gY2FsbGJhY2s7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuICsgMV0gPSBhcmc7XG4gICAgICAkJGFzYXAkJGxlbiArPSAyO1xuICAgICAgaWYgKCQkYXNhcCQkbGVuID09PSAyKSB7XG4gICAgICAgIC8vIElmIGxlbiBpcyAxLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAgICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAgICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkYXNhcCQkYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgICB2YXIgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuXG4gICAgLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbiAgICB2YXIgJCRhc2FwJCRpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU5leHRUaWNrKCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCQkYXNhcCQkZmx1c2gpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcigkJGFzYXAkJGZsdXNoKTtcbiAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gd2ViIHdvcmtlclxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSAkJGFzYXAkJGZsdXNoO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VTZXRUaW1lb3V0KCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KCQkYXNhcCQkZmx1c2gsIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkZmx1c2goKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8ICQkYXNhcCQkbGVuOyBpKz0yKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9ICQkYXNhcCQkcXVldWVbaV07XG4gICAgICAgIHZhciBhcmcgPSAkJGFzYXAkJHF1ZXVlW2krMV07XG5cbiAgICAgICAgY2FsbGJhY2soYXJnKTtcblxuICAgICAgICAkJGFzYXAkJHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICAkJGFzYXAkJHF1ZXVlW2krMV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgICQkYXNhcCQkbGVuID0gMDtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRzY2hlZHVsZUZsdXNoO1xuXG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VOZXh0VGljaygpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgfSBlbHNlIGlmICgkJGFzYXAkJGlzV29ya2VyKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlU2V0VGltZW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRub29wKCkge31cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEZVTEZJTExFRCA9IDE7XG4gICAgdmFyICQkJGludGVybmFsJCRSRUpFQ1RFRCAgPSAyO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS4nKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRnZXRUaGVuKHByb21pc2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlLnRoZW47XG4gICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgICAgICByZXR1cm4gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gICAgICAgJCRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICAgICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3IgPSAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB0aGVuYWJsZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICAgICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9LCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgICAgIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2UgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSkge1xuICAgICAgaWYgKG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IgPT09IHByb21pc2UuY29uc3RydWN0b3IpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRoZW4gPSAkJCRpbnRlcm5hbCQkZ2V0VGhlbihtYXliZVRoZW5hYmxlKTtcblxuICAgICAgICBpZiAodGhlbiA9PT0gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9IGVsc2UgaWYgKCQkdXRpbHMkJGlzRnVuY3Rpb24odGhlbikpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkpO1xuICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICAgICAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICAgICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cblxuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRGVUxGSUxMRUQ7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRSRUpFQ1RFRDtcbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIGxlbmd0aCA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgICAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcblxuICAgICAgaWYgKGxlbmd0aCA9PT0gMCAmJiBwYXJlbnQuX3N0YXRlKSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycztcbiAgICAgIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKSB7XG4gICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUiA9IG5ldyAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9ICQkdXRpbHMkJGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgICAgIGlmIChoYXNDYWxsYmFjaykge1xuICAgICAgICB2YWx1ZSA9ICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgICAgICBpZiAodmFsdWUgPT09ICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gZGV0YWlsO1xuICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIC8vIG5vb3BcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZShwcm9taXNlLCByZXNvbHZlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpe1xuICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkbWFrZVNldHRsZWRSZXN1bHQoc3RhdGUsIHBvc2l0aW9uLCB2YWx1ZSkge1xuICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdmdWxmaWxsZWQnLFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdGF0ZTogJ3JlamVjdGVkJyxcbiAgICAgICAgICByZWFzb246IHZhbHVlXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQsIGFib3J0T25SZWplY3QsIGxhYmVsKSB7XG4gICAgICB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgICB0aGlzLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgIHRoaXMuX2Fib3J0T25SZWplY3QgPSBhYm9ydE9uUmVqZWN0O1xuXG4gICAgICBpZiAodGhpcy5fdmFsaWRhdGVJbnB1dChpbnB1dCkpIHtcbiAgICAgICAgdGhpcy5faW5wdXQgICAgID0gaW5wdXQ7XG4gICAgICAgIHRoaXMubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgICAgIHRoaXMuX2luaXQoKTtcblxuICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgICAgIHRoaXMuX2VudW1lcmF0ZSgpO1xuICAgICAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QodGhpcy5wcm9taXNlLCB0aGlzLl92YWxpZGF0aW9uRXJyb3IoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRlSW5wdXQgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuICQkdXRpbHMkJGlzQXJyYXkoaW5wdXQpO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGlvbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG4gICAgfTtcblxuICAgIHZhciAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0ID0gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcjtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsZW5ndGggID0gdGhpcy5sZW5ndGg7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcbiAgICAgIHZhciBpbnB1dCAgID0gdGhpcy5faW5wdXQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbihlbnRyeSwgaSkge1xuICAgICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgICAgaWYgKCQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZShlbnRyeSkpIHtcbiAgICAgICAgaWYgKGVudHJ5LmNvbnN0cnVjdG9yID09PSBjICYmIGVudHJ5Ll9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgICBlbnRyeS5fb25lcnJvciA9IG51bGw7XG4gICAgICAgICAgdGhpcy5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KGMucmVzb2x2ZShlbnRyeSksIGkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcbiAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCBlbnRyeSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICAgIGlmICh0aGlzLl9hYm9ydE9uUmVqZWN0ICYmIHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB0aGlzLl9tYWtlUmVzdWx0KHN0YXRlLCBpLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fbWFrZVJlc3VsdCA9IGZ1bmN0aW9uKHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fd2lsbFNldHRsZUF0ID0gZnVuY3Rpb24ocHJvbWlzZSwgaSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoJCQkaW50ZXJuYWwkJFJFSkVDVEVELCBpLCByZWFzb24pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkYWxsJCRkZWZhdWx0ID0gZnVuY3Rpb24gYWxsKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICByZXR1cm4gbmV3ICQkJGVudW1lcmF0b3IkJGRlZmF1bHQodGhpcywgZW50cmllcywgdHJ1ZSAvKiBhYm9ydCBvbiByZWplY3QgKi8sIGxhYmVsKS5wcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQgPSBmdW5jdGlvbiByYWNlKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcblxuICAgICAgaWYgKCEkJHV0aWxzJCRpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcblxuICAgICAgZnVuY3Rpb24gb25GdWxmaWxsbWVudCh2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uUmVqZWN0aW9uKHJlYXNvbikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUoQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKSwgdW5kZWZpbmVkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQgPSBmdW5jdGlvbiByZXNvbHZlKG9iamVjdCwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQgPSBmdW5jdGlvbiByZWplY3QocmVhc29uLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2U7XG5cbiAgICAvKipcbiAgICAgIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgICAgIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gICAgICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZeKAmXMgZXZlbnR1YWwgdmFsdWUgb3IgdGhlIHJlYXNvblxuICAgICAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIFRlcm1pbm9sb2d5XG4gICAgICAtLS0tLS0tLS0tLVxuXG4gICAgICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAgICAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAgICAgLSBgdmFsdWVgIGlzIGFueSBsZWdhbCBKYXZhU2NyaXB0IHZhbHVlIChpbmNsdWRpbmcgdW5kZWZpbmVkLCBhIHRoZW5hYmxlLCBvciBhIHByb21pc2UpLlxuICAgICAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gICAgICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gICAgICAtIGBzZXR0bGVkYCB0aGUgZmluYWwgcmVzdGluZyBzdGF0ZSBvZiBhIHByb21pc2UsIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cblxuICAgICAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gICAgICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICAgICAgc3RhdGUuICBQcm9taXNlcyB0aGF0IGFyZSByZWplY3RlZCBoYXZlIGEgcmVqZWN0aW9uIHJlYXNvbiBhbmQgYXJlIGluIHRoZVxuICAgICAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgICAgIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICAgICAgcHJvbWlzZSwgdGhlbiB0aGUgb3JpZ2luYWwgcHJvbWlzZSdzIHNldHRsZWQgc3RhdGUgd2lsbCBtYXRjaCB0aGUgdmFsdWUnc1xuICAgICAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gICAgICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gICAgICBpdHNlbGYgZnVsZmlsbC5cblxuXG4gICAgICBCYXNpYyBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBgYGBqc1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gb24gc3VjY2Vzc1xuICAgICAgICByZXNvbHZlKHZhbHVlKTtcblxuICAgICAgICAvLyBvbiBmYWlsdXJlXG4gICAgICAgIHJlamVjdChyZWFzb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS0tLS1cblxuICAgICAgUHJvbWlzZXMgc2hpbmUgd2hlbiBhYnN0cmFjdGluZyBhd2F5IGFzeW5jaHJvbm91cyBpbnRlcmFjdGlvbnMgc3VjaCBhc1xuICAgICAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBnZXRKU09OKHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5ET05FKSB7XG4gICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gICAgICBgYGBqc1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICAgICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgICAgIF0pLnRoZW4oZnVuY3Rpb24odmFsdWVzKXtcbiAgICAgICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgICAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBjbGFzcyBQcm9taXNlXG4gICAgICBAcGFyYW0ge2Z1bmN0aW9ufSByZXNvbHZlclxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQGNvbnN0cnVjdG9yXG4gICAgKi9cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIHRoaXMuX2lkID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyKys7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgICAgIGlmICgkJCRpbnRlcm5hbCQkbm9vcCAhPT0gcmVzb2x2ZXIpIHtcbiAgICAgICAgaWYgKCEkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgICAgICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSkpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5hbGwgPSAkJHByb21pc2UkYWxsJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yYWNlID0gJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlc29sdmUgPSAkJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVqZWN0ID0gJCRwcm9taXNlJHJlamVjdCQkZGVmYXVsdDtcblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gICAgICBjb25zdHJ1Y3RvcjogJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLFxuXG4gICAgLyoqXG4gICAgICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgICAgIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gICAgICByZWFzb24gd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgIC8vIHVzZXIgaXMgYXZhaWxhYmxlXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyB1c2VyIGlzIHVuYXZhaWxhYmxlLCBhbmQgeW91IGFyZSBnaXZlbiB0aGUgcmVhc29uIHdoeVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQ2hhaW5pbmdcbiAgICAgIC0tLS0tLS0tXG5cbiAgICAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gICAgICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gICAgICBvciByZWplY3Rpb24gaGFuZGxlciwgb3IgcmVqZWN0ZWQgaWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gdXNlci5uYW1lO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gJ2RlZmF1bHQgbmFtZSc7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgICAgIC8vIHdpbGwgYmUgYCdkZWZhdWx0IG5hbWUnYFxuICAgICAgfSk7XG5cbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgICAgIH0pO1xuICAgICAgYGBgXG4gICAgICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgUGVkYWdvZ2ljYWxFeGNlcHRpb24oJ1Vwc3RyZWFtIGVycm9yJyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIFRoZSBgUGVkZ2Fnb2NpYWxFeGNlcHRpb25gIGlzIHByb3BhZ2F0ZWQgYWxsIHRoZSB3YXkgZG93biB0byBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBc3NpbWlsYXRpb25cbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICAgICAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICAgICAgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uIGhhbmRsZXIuIFRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCB0aGVuIGJlIHBlbmRpbmdcbiAgICAgIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgU2ltcGxlIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kUmVzdWx0KGZ1bmN0aW9uKHJlc3VsdCwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZFJlc3VsdCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgYXV0aG9yLCBib29rcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgICAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG5cbiAgICAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuXG4gICAgICB9XG5cbiAgICAgIGZpbmRBdXRob3IoZnVuY3Rpb24oYXV0aG9yLCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmluZEJvb29rc0J5QXV0aG9yKGF1dGhvciwgZnVuY3Rpb24oYm9va3MsIGVycikge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZEF1dGhvcigpLlxuICAgICAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihib29rcyl7XG4gICAgICAgICAgLy8gZm91bmQgYm9va3NcbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIHRoZW5cbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGVkXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICB0aGVuOiBmdW5jdGlvbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIHN0YXRlID0gcGFyZW50Ll9zdGF0ZTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQgJiYgIW9uRnVsZmlsbG1lbnQgfHwgc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCAmJiAhb25SZWplY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHBhcmVudC5fcmVzdWx0O1xuXG4gICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tzdGF0ZSAtIDFdO1xuICAgICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHN0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9LFxuXG4gICAgLyoqXG4gICAgICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gICAgICBhcyB0aGUgY2F0Y2ggYmxvY2sgb2YgYSB0cnkvY2F0Y2ggc3RhdGVtZW50LlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgICAgIH1cblxuICAgICAgLy8gc3luY2hyb25vdXNcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbmRBdXRob3IoKTtcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9XG5cbiAgICAgIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgICAgIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCBjYXRjaFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3Rpb25cbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgICdjYXRjaCc6IGZ1bmN0aW9uKG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgICAgdmFyIGxvY2FsO1xuXG4gICAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbG9jYWwgPSBnbG9iYWw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5kb2N1bWVudCkge1xuICAgICAgICBsb2NhbCA9IHdpbmRvdztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICAgIH1cblxuICAgICAgdmFyIGVzNlByb21pc2VTdXBwb3J0ID1cbiAgICAgICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAgICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAgICAgLy8gRmlyZWZveC9DaHJvbWUgZXhwZXJpbWVudGFsIGltcGxlbWVudGF0aW9uc1xuICAgICAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcImFsbFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgICAgICAvLyBhcyB0aGUgYXJnIHJhdGhlciB0aGFuIGEgZnVuY3Rpb25cbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZXNvbHZlO1xuICAgICAgICAgIG5ldyBsb2NhbC5Qcm9taXNlKGZ1bmN0aW9uKHIpIHsgcmVzb2x2ZSA9IHI7IH0pO1xuICAgICAgICAgIHJldHVybiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgICAgICB9KCkpO1xuXG4gICAgICBpZiAoIWVzNlByb21pc2VTdXBwb3J0KSB7XG4gICAgICAgIGxvY2FsLlByb21pc2UgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQ7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2UgPSB7XG4gICAgICAnUHJvbWlzZSc6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCxcbiAgICAgICdwb2x5ZmlsbCc6ICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHRcbiAgICB9O1xuXG4gICAgLyogZ2xvYmFsIGRlZmluZTp0cnVlIG1vZHVsZTp0cnVlIHdpbmRvdzogdHJ1ZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZVsnYW1kJ10pIHtcbiAgICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGVbJ2V4cG9ydHMnXSkge1xuICAgICAgbW9kdWxlWydleHBvcnRzJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbJ0VTNlByb21pc2UnXSA9IGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9XG59KS5jYWxsKHRoaXMpOyIsIi8qIEZpbGVTYXZlci5qc1xuICogQSBzYXZlQXMoKSBGaWxlU2F2ZXIgaW1wbGVtZW50YXRpb24uXG4gKiAyMDE0LTEyLTE3XG4gKlxuICogQnkgRWxpIEdyZXksIGh0dHA6Ly9lbGlncmV5LmNvbVxuICogTGljZW5zZTogWDExL01JVFxuICogICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiAqL1xuXG4vKmdsb2JhbCBzZWxmICovXG4vKmpzbGludCBiaXR3aXNlOiB0cnVlLCBpbmRlbnQ6IDQsIGxheGJyZWFrOiB0cnVlLCBsYXhjb21tYTogdHJ1ZSwgc21hcnR0YWJzOiB0cnVlLCBwbHVzcGx1czogdHJ1ZSAqL1xuXG4vKiEgQHNvdXJjZSBodHRwOi8vcHVybC5lbGlncmV5LmNvbS9naXRodWIvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0ZpbGVTYXZlci5qcyAqL1xuXG52YXIgc2F2ZUFzID0gc2F2ZUFzXG4gIC8vIElFIDEwKyAobmF0aXZlIHNhdmVBcylcbiAgfHwgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iICYmIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iLmJpbmQobmF2aWdhdG9yKSlcbiAgLy8gRXZlcnlvbmUgZWxzZVxuICB8fCAoZnVuY3Rpb24odmlldykge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0Ly8gSUUgPDEwIGlzIGV4cGxpY2l0bHkgdW5zdXBwb3J0ZWRcblx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiZcblx0ICAgIC9NU0lFIFsxLTldXFwuLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhclxuXHRcdCAgZG9jID0gdmlldy5kb2N1bWVudFxuXHRcdCAgLy8gb25seSBnZXQgVVJMIHdoZW4gbmVjZXNzYXJ5IGluIGNhc2UgQmxvYi5qcyBoYXNuJ3Qgb3ZlcnJpZGRlbiBpdCB5ZXRcblx0XHQsIGdldF9VUkwgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2aWV3LlVSTCB8fCB2aWV3LndlYmtpdFVSTCB8fCB2aWV3O1xuXHRcdH1cblx0XHQsIHNhdmVfbGluayA9IGRvYy5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsIFwiYVwiKVxuXHRcdCwgY2FuX3VzZV9zYXZlX2xpbmsgPSBcImRvd25sb2FkXCIgaW4gc2F2ZV9saW5rXG5cdFx0LCBjbGljayA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBldmVudCA9IGRvYy5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO1xuXHRcdFx0ZXZlbnQuaW5pdE1vdXNlRXZlbnQoXG5cdFx0XHRcdFwiY2xpY2tcIiwgdHJ1ZSwgZmFsc2UsIHZpZXcsIDAsIDAsIDAsIDAsIDBcblx0XHRcdFx0LCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMCwgbnVsbFxuXHRcdFx0KTtcblx0XHRcdG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHRcdCwgd2Via2l0X3JlcV9mcyA9IHZpZXcud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW1cblx0XHQsIHJlcV9mcyA9IHZpZXcucmVxdWVzdEZpbGVTeXN0ZW0gfHwgd2Via2l0X3JlcV9mcyB8fCB2aWV3Lm1velJlcXVlc3RGaWxlU3lzdGVtXG5cdFx0LCB0aHJvd19vdXRzaWRlID0gZnVuY3Rpb24oZXgpIHtcblx0XHRcdCh2aWV3LnNldEltbWVkaWF0ZSB8fCB2aWV3LnNldFRpbWVvdXQpKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aHJvdyBleDtcblx0XHRcdH0sIDApO1xuXHRcdH1cblx0XHQsIGZvcmNlX3NhdmVhYmxlX3R5cGUgPSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiXG5cdFx0LCBmc19taW5fc2l6ZSA9IDBcblx0XHQvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTM3NTI5NyNjNyBhbmRcblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvY29tbWl0LzQ4NTkzMGEjY29tbWl0Y29tbWVudC04NzY4MDQ3XG5cdFx0Ly8gZm9yIHRoZSByZWFzb25pbmcgYmVoaW5kIHRoZSB0aW1lb3V0IGFuZCByZXZvY2F0aW9uIGZsb3dcblx0XHQsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCA9IDUwMCAvLyBpbiBtc1xuXHRcdCwgcmV2b2tlID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0dmFyIHJldm9rZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlID09PSBcInN0cmluZ1wiKSB7IC8vIGZpbGUgaXMgYW4gb2JqZWN0IFVSTFxuXHRcdFx0XHRcdGdldF9VUkwoKS5yZXZva2VPYmplY3RVUkwoZmlsZSk7XG5cdFx0XHRcdH0gZWxzZSB7IC8vIGZpbGUgaXMgYSBGaWxlXG5cdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGlmICh2aWV3LmNocm9tZSkge1xuXHRcdFx0XHRyZXZva2VyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZXRUaW1lb3V0KHJldm9rZXIsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCwgZGlzcGF0Y2ggPSBmdW5jdGlvbihmaWxlc2F2ZXIsIGV2ZW50X3R5cGVzLCBldmVudCkge1xuXHRcdFx0ZXZlbnRfdHlwZXMgPSBbXS5jb25jYXQoZXZlbnRfdHlwZXMpO1xuXHRcdFx0dmFyIGkgPSBldmVudF90eXBlcy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdHZhciBsaXN0ZW5lciA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF90eXBlc1tpXV07XG5cdFx0XHRcdGlmICh0eXBlb2YgbGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRsaXN0ZW5lci5jYWxsKGZpbGVzYXZlciwgZXZlbnQgfHwgZmlsZXNhdmVyKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRcdFx0dGhyb3dfb3V0c2lkZShleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCwgRmlsZVNhdmVyID0gZnVuY3Rpb24oYmxvYiwgbmFtZSkge1xuXHRcdFx0Ly8gRmlyc3QgdHJ5IGEuZG93bmxvYWQsIHRoZW4gd2ViIGZpbGVzeXN0ZW0sIHRoZW4gb2JqZWN0IFVSTHNcblx0XHRcdHZhclxuXHRcdFx0XHQgIGZpbGVzYXZlciA9IHRoaXNcblx0XHRcdFx0LCB0eXBlID0gYmxvYi50eXBlXG5cdFx0XHRcdCwgYmxvYl9jaGFuZ2VkID0gZmFsc2Vcblx0XHRcdFx0LCBvYmplY3RfdXJsXG5cdFx0XHRcdCwgdGFyZ2V0X3ZpZXdcblx0XHRcdFx0LCBkaXNwYXRjaF9hbGwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSB3cml0ZWVuZFwiLnNwbGl0KFwiIFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb24gYW55IGZpbGVzeXMgZXJyb3JzIHJldmVydCB0byBzYXZpbmcgd2l0aCBvYmplY3QgVVJMc1xuXHRcdFx0XHQsIGZzX2Vycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gZG9uJ3QgY3JlYXRlIG1vcmUgb2JqZWN0IFVSTHMgdGhhbiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoYmxvYl9jaGFuZ2VkIHx8ICFvYmplY3RfdXJsKSB7XG5cdFx0XHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRhcmdldF92aWV3KSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRfdmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dmFyIG5ld190YWIgPSB2aWV3Lm9wZW4ob2JqZWN0X3VybCwgXCJfYmxhbmtcIik7XG5cdFx0XHRcdFx0XHRpZiAobmV3X3RhYiA9PSB1bmRlZmluZWQgJiYgdHlwZW9mIHNhZmFyaSAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0XHRcdFx0XHQvL0FwcGxlIGRvIG5vdCBhbGxvdyB3aW5kb3cub3Blbiwgc2VlIGh0dHA6Ly9iaXQubHkvMWtaZmZSSVxuXHRcdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCwgYWJvcnRhYmxlID0gZnVuY3Rpb24oZnVuYykge1xuXHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmIChmaWxlc2F2ZXIucmVhZHlTdGF0ZSAhPT0gZmlsZXNhdmVyLkRPTkUpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdCwgY3JlYXRlX2lmX25vdF9mb3VuZCA9IHtjcmVhdGU6IHRydWUsIGV4Y2x1c2l2ZTogZmFsc2V9XG5cdFx0XHRcdCwgc2xpY2Vcblx0XHRcdDtcblx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cdFx0XHRpZiAoIW5hbWUpIHtcblx0XHRcdFx0bmFtZSA9IFwiZG93bmxvYWRcIjtcblx0XHRcdH1cblx0XHRcdGlmIChjYW5fdXNlX3NhdmVfbGluaykge1xuXHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0c2F2ZV9saW5rLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRzYXZlX2xpbmsuZG93bmxvYWQgPSBuYW1lO1xuXHRcdFx0XHRjbGljayhzYXZlX2xpbmspO1xuXHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyBPYmplY3QgYW5kIHdlYiBmaWxlc3lzdGVtIFVSTHMgaGF2ZSBhIHByb2JsZW0gc2F2aW5nIGluIEdvb2dsZSBDaHJvbWUgd2hlblxuXHRcdFx0Ly8gdmlld2VkIGluIGEgdGFiLCBzbyBJIGZvcmNlIHNhdmUgd2l0aCBhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cblx0XHRcdC8vIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTkxMTU4XG5cdFx0XHQvLyBVcGRhdGU6IEdvb2dsZSBlcnJhbnRseSBjbG9zZWQgOTExNTgsIEkgc3VibWl0dGVkIGl0IGFnYWluOlxuXHRcdFx0Ly8gaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTM4OTY0MlxuXHRcdFx0aWYgKHZpZXcuY2hyb21lICYmIHR5cGUgJiYgdHlwZSAhPT0gZm9yY2Vfc2F2ZWFibGVfdHlwZSkge1xuXHRcdFx0XHRzbGljZSA9IGJsb2Iuc2xpY2UgfHwgYmxvYi53ZWJraXRTbGljZTtcblx0XHRcdFx0YmxvYiA9IHNsaWNlLmNhbGwoYmxvYiwgMCwgYmxvYi5zaXplLCBmb3JjZV9zYXZlYWJsZV90eXBlKTtcblx0XHRcdFx0YmxvYl9jaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdC8vIFNpbmNlIEkgY2FuJ3QgYmUgc3VyZSB0aGF0IHRoZSBndWVzc2VkIG1lZGlhIHR5cGUgd2lsbCB0cmlnZ2VyIGEgZG93bmxvYWRcblx0XHRcdC8vIGluIFdlYktpdCwgSSBhcHBlbmQgLmRvd25sb2FkIHRvIHRoZSBmaWxlbmFtZS5cblx0XHRcdC8vIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD02NTQ0MFxuXHRcdFx0aWYgKHdlYmtpdF9yZXFfZnMgJiYgbmFtZSAhPT0gXCJkb3dubG9hZFwiKSB7XG5cdFx0XHRcdG5hbWUgKz0gXCIuZG93bmxvYWRcIjtcblx0XHRcdH1cblx0XHRcdGlmICh0eXBlID09PSBmb3JjZV9zYXZlYWJsZV90eXBlIHx8IHdlYmtpdF9yZXFfZnMpIHtcblx0XHRcdFx0dGFyZ2V0X3ZpZXcgPSB2aWV3O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCFyZXFfZnMpIHtcblx0XHRcdFx0ZnNfZXJyb3IoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0ZnNfbWluX3NpemUgKz0gYmxvYi5zaXplO1xuXHRcdFx0cmVxX2ZzKHZpZXcuVEVNUE9SQVJZLCBmc19taW5fc2l6ZSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZzKSB7XG5cdFx0XHRcdGZzLnJvb3QuZ2V0RGlyZWN0b3J5KFwic2F2ZWRcIiwgY3JlYXRlX2lmX25vdF9mb3VuZCwgYWJvcnRhYmxlKGZ1bmN0aW9uKGRpcikge1xuXHRcdFx0XHRcdHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRkaXIuZ2V0RmlsZShuYW1lLCBjcmVhdGVfaWZfbm90X2ZvdW5kLCBhYm9ydGFibGUoZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0XHRcdFx0XHRmaWxlLmNyZWF0ZVdyaXRlcihhYm9ydGFibGUoZnVuY3Rpb24od3JpdGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLm9ud3JpdGVlbmQgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0X3ZpZXcubG9jYXRpb24uaHJlZiA9IGZpbGUudG9VUkwoKTtcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVlbmRcIiwgZXZlbnQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV2b2tlKGZpbGUpO1xuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBlcnJvciA9IHdyaXRlci5lcnJvcjtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChlcnJvci5jb2RlICE9PSBlcnJvci5BQk9SVF9FUlIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnNfZXJyb3IoKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSBhYm9ydFwiLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cml0ZXJbXCJvblwiICsgZXZlbnRdID0gZmlsZXNhdmVyW1wib25cIiArIGV2ZW50XTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR3cml0ZXIud3JpdGUoYmxvYik7XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLmFib3J0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cml0ZXIuYWJvcnQoKTtcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5XUklUSU5HO1xuXHRcdFx0XHRcdFx0XHR9KSwgZnNfZXJyb3IpO1xuXHRcdFx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGRpci5nZXRGaWxlKG5hbWUsIHtjcmVhdGU6IGZhbHNlfSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdC8vIGRlbGV0ZSBmaWxlIGlmIGl0IGFscmVhZHkgZXhpc3RzXG5cdFx0XHRcdFx0XHRmaWxlLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0c2F2ZSgpO1xuXHRcdFx0XHRcdH0pLCBhYm9ydGFibGUoZnVuY3Rpb24oZXgpIHtcblx0XHRcdFx0XHRcdGlmIChleC5jb2RlID09PSBleC5OT1RfRk9VTkRfRVJSKSB7XG5cdFx0XHRcdFx0XHRcdHNhdmUoKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSkpO1xuXHRcdFx0XHR9KSwgZnNfZXJyb3IpO1xuXHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHR9XG5cdFx0LCBGU19wcm90byA9IEZpbGVTYXZlci5wcm90b3R5cGVcblx0XHQsIHNhdmVBcyA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUpIHtcblx0XHRcdHJldHVybiBuZXcgRmlsZVNhdmVyKGJsb2IsIG5hbWUpO1xuXHRcdH1cblx0O1xuXHRGU19wcm90by5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmaWxlc2F2ZXIgPSB0aGlzO1xuXHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcImFib3J0XCIpO1xuXHR9O1xuXHRGU19wcm90by5yZWFkeVN0YXRlID0gRlNfcHJvdG8uSU5JVCA9IDA7XG5cdEZTX3Byb3RvLldSSVRJTkcgPSAxO1xuXHRGU19wcm90by5ET05FID0gMjtcblxuXHRGU19wcm90by5lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVzdGFydCA9XG5cdEZTX3Byb3RvLm9ucHJvZ3Jlc3MgPVxuXHRGU19wcm90by5vbndyaXRlID1cblx0RlNfcHJvdG8ub25hYm9ydCA9XG5cdEZTX3Byb3RvLm9uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlZW5kID1cblx0XHRudWxsO1xuXG5cdHJldHVybiBzYXZlQXM7XG59KFxuXHQgICB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZWxmXG5cdHx8IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93XG5cdHx8IHRoaXMuY29udGVudFxuKSk7XG4vLyBgc2VsZmAgaXMgdW5kZWZpbmVkIGluIEZpcmVmb3ggZm9yIEFuZHJvaWQgY29udGVudCBzY3JpcHQgY29udGV4dFxuLy8gd2hpbGUgYHRoaXNgIGlzIG5zSUNvbnRlbnRGcmFtZU1lc3NhZ2VNYW5hZ2VyXG4vLyB3aXRoIGFuIGF0dHJpYnV0ZSBgY29udGVudGAgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgd2luZG93XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gc2F2ZUFzO1xufSBlbHNlIGlmICgodHlwZW9mIGRlZmluZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkZWZpbmUgIT09IG51bGwpICYmIChkZWZpbmUuYW1kICE9IG51bGwpKSB7XG4gIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNhdmVBcztcbiAgfSk7XG59XG4iLCJ2YXIgdXRtZSA9IHJlcXVpcmUoJy4uL3V0bWUnKTtcbnZhciBzYXZlQXMgPSByZXF1aXJlKCdmaWxlc2F2ZXIuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dG1lLnJlZ2lzdGVyU2F2ZUhhbmRsZXIoZnVuY3Rpb24gKHNjZW5hcmlvKSB7XG4gICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtKU09OLnN0cmluZ2lmeShzY2VuYXJpbywgbnVsbCwgXCIgXCIpXSwge3R5cGU6IFwidGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04XCJ9KTtcbiAgIHNhdmVBcyhibG9iLCBzY2VuYXJpby5uYW1lICsgXCIuanNvblwiKTtcbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pZEhKaGJuTm1iM0p0WldRdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5RVpYWmxiRzl3WlhJdllYUnphV1F2VUhKdmFtVmpkSE12ZFhSdFpTOTFkRzFsTDNOeVl5OXFjeTl3WlhKemFYTjBaWEp6TDNWMGJXVXRabWxzWlMxd1pYSnphWE4wWlhJdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUVzU1VGQlNTeEpRVUZKTEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRemxDTEVsQlFVa3NUVUZCVFN4SFFVRkhMRTlCUVU4c1EwRkJReXhqUVVGakxFTkJRVU1zUTBGQlF6czdRVUZGY2tNc1RVRkJUU3hEUVVGRExFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zVlVGQlZTeFJRVUZSTEVWQlFVVTdSMEZETTBRc1NVRkJTU3hKUVVGSkxFZEJRVWNzU1VGQlNTeEpRVUZKTEVOQlFVTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExGRkJRVkVzUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RFFVRkRMRU5CUVVNc1JVRkJSU3hEUVVGRExFbEJRVWtzUlVGQlJTd3dRa0ZCTUVJc1EwRkJReXhEUVVGRExFTkJRVU03UjBGREwwWXNUVUZCVFN4RFFVRkRMRWxCUVVrc1JVRkJSU3hSUVVGUkxFTkJRVU1zU1VGQlNTeEhRVUZITEU5QlFVOHNRMEZCUXl4RFFVRkRPME5CUTNoRExFTkJRVU1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdkWFJ0WlNBOUlISmxjWFZwY21Vb0p5NHVMM1YwYldVbktUdGNiblpoY2lCellYWmxRWE1nUFNCeVpYRjFhWEpsS0NkbWFXeGxjMkYyWlhJdWFuTW5LVHRjYmx4dWJXOWtkV3hsTG1WNGNHOXlkSE1nUFNCMWRHMWxMbkpsWjJsemRHVnlVMkYyWlVoaGJtUnNaWElvWm5WdVkzUnBiMjRnS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0IyWVhJZ1lteHZZaUE5SUc1bGR5QkNiRzlpS0Z0S1UwOU9Mbk4wY21sdVoybG1lU2h6WTJWdVlYSnBieXdnYm5Wc2JDd2dYQ0lnWENJcFhTd2dlM1I1Y0dVNklGd2lkR1Y0ZEM5d2JHRnBianRqYUdGeWMyVjBQWFYwWmkwNFhDSjlLVHRjYmlBZ0lITmhkbVZCY3loaWJHOWlMQ0J6WTJWdVlYSnBieTV1WVcxbElDc2dYQ0l1YW5OdmJsd2lLVHRjYm4wcE95SmRmUT09IiwidmFyIHV0bWUgPSByZXF1aXJlKCcuLi91dG1lLmpzJyk7XG5cbmZ1bmN0aW9uIGdldEJhc2VVUkwgKCkge1xuICByZXR1cm4gdXRtZS5zdGF0ZSAmJiB1dG1lLnN0YXRlLnRlc3RTZXJ2ZXIgPyB1dG1lLnN0YXRlLnRlc3RTZXJ2ZXIgOiBnZXRQYXJhbWV0ZXJCeU5hbWUoXCJ1dG1lX3Rlc3Rfc2VydmVyXCIpIHx8IFwiaHR0cDovLzAuMC4wLjA6OTA0My9cIjtcbn1cblxudmFyIHNlcnZlclJlcG9ydGVyID0ge1xuICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBnZXRCYXNlVVJMKCkgKyBcImVycm9yXCIsXG4gICAgICAgICAgZGF0YTogeyBkYXRhOiBlcnJvciB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHV0bWUuc2V0dGluZ3MuZ2V0KFwiY29uc29sZUxvZ2dpbmdcIikpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc3VjY2VzczogZnVuY3Rpb24gKHN1Y2Nlc3MsIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBnZXRCYXNlVVJMKCkgKyBcInN1Y2Nlc3NcIixcbiAgICAgICAgICBkYXRhOiB7IGRhdGE6IHN1Y2Nlc3MgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh1dG1lLnNldHRpbmdzLmdldChcImNvbnNvbGVMb2dnaW5nXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coc3VjY2Vzcyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGxvZzogZnVuY3Rpb24gKGxvZywgc2NlbmFyaW8sIHV0bWUpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcImxvZ1wiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogbG9nIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodXRtZS5zZXR0aW5ncy5nZXQoXCJjb25zb2xlTG9nZ2luZ1wiKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGxvZyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbG9hZFNjZW5hcmlvOiBmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIGpzb25wOiBcImNhbGxiYWNrXCIsXG5cbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcblxuICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXG5cbiAgICAgICAgICAgIHVybDogIGdldEJhc2VVUkwoKSArIFwic2NlbmFyaW8vXCIgKyBuYW1lLFxuXG4gICAgICAgICAgICAvLyB0ZWxsIGpRdWVyeSB3ZSdyZSBleHBlY3RpbmcgSlNPTlBcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzYXZlU2NlbmFyaW86IGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJzY2VuYXJpb1wiLFxuICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHNjZW5hcmlvLCBudWxsLCBcIiBcIiksXG4gICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWRTZXR0aW5nczogZnVuY3Rpb24gKGNhbGxiYWNrLCBlcnJvcikge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgY29udGVudFR5cGU6IFwidGV4dC9wbGFuOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgICBjcm9zc0RvbWFpbjogdHJ1ZSxcbiAgICAgICAgICAgIHVybDogIGdldEJhc2VVUkwoKSArIFwic2V0dGluZ3NcIixcbiAgICAgICAgICAgIC8vIHRlbGwgalF1ZXJ5IHdlJ3JlIGV4cGVjdGluZyBKU09OUFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3ApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxudXRtZS5yZWdpc3RlclJlcG9ydEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIpO1xudXRtZS5yZWdpc3RlckxvYWRIYW5kbGVyKHNlcnZlclJlcG9ydGVyLmxvYWRTY2VuYXJpbyk7XG51dG1lLnJlZ2lzdGVyU2F2ZUhhbmRsZXIoc2VydmVyUmVwb3J0ZXIuc2F2ZVNjZW5hcmlvKTtcbnV0bWUucmVnaXN0ZXJTZXR0aW5nc0xvYWRIYW5kbGVyKHNlcnZlclJlcG9ydGVyLmxvYWRTZXR0aW5ncyk7XG5cbmZ1bmN0aW9uIGdldFBhcmFtZXRlckJ5TmFtZShuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKTtcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKSxcbiAgICAgICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKTtcbiAgICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IFwiXCIgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWRISmhibk5tYjNKdFpXUXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOUVaWFpsYkc5d1pYSXZZWFJ6YVdRdlVISnZhbVZqZEhNdmRYUnRaUzkxZEcxbEwzTnlZeTlxY3k5eVpYQnZjblJsY25NdmMyVnlkbVZ5TFhKbGNHOXlkR1Z5TG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJMRWxCUVVrc1NVRkJTU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXpzN1FVRkZha01zVTBGQlV5eFZRVUZWTEVsQlFVazdSVUZEY2tJc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1ZVRkJWU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNWVUZCVlN4SFFVRkhMR3RDUVVGclFpeERRVUZETEd0Q1FVRnJRaXhEUVVGRExFbEJRVWtzYzBKQlFYTkNMRU5CUVVNN1FVRkRlRWtzUTBGQlF6czdRVUZGUkN4SlFVRkpMR05CUVdNc1IwRkJSenRKUVVOcVFpeExRVUZMTEVWQlFVVXNWVUZCVlN4TFFVRkxMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJUdFJRVU53UXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRE8xVkJRMHdzU1VGQlNTeEZRVUZGTEUxQlFVMDdWVUZEV2l4SFFVRkhMRVZCUVVVc1ZVRkJWU3hGUVVGRkxFZEJRVWNzVDBGQlR6dFZRVU16UWl4SlFVRkpMRVZCUVVVc1JVRkJSU3hKUVVGSkxFVkJRVVVzUzBGQlN5eEZRVUZGTzFWQlEzSkNMRkZCUVZFc1JVRkJSU3hOUVVGTk8xTkJRMnBDTEVOQlFVTXNRMEZCUXp0UlFVTklMRWxCUVVrc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zUlVGQlJUdFZRVU4yUXl4UFFVRlBMRU5CUVVNc1MwRkJTeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzFOQlEzUkNPMHRCUTBvN1NVRkRSQ3hQUVVGUExFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSVHRSUVVONFF5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRPMVZCUTB3c1NVRkJTU3hGUVVGRkxFMUJRVTA3VlVGRFdpeEhRVUZITEVWQlFVVXNWVUZCVlN4RlFVRkZMRWRCUVVjc1UwRkJVenRWUVVNM1FpeEpRVUZKTEVWQlFVVXNSVUZCUlN4SlFVRkpMRVZCUVVVc1QwRkJUeXhGUVVGRk8xVkJRM1pDTEZGQlFWRXNSVUZCUlN4TlFVRk5PMU5CUTJwQ0xFTkJRVU1zUTBGQlF6dFJRVU5JTEVsQlFVa3NTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1JVRkJSVHRWUVVOMlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8xTkJRM1JDTzB0QlEwbzdTVUZEUkN4SFFVRkhMRVZCUVVVc1ZVRkJWU3hIUVVGSExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlR0UlFVTm9ReXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETzFWQlEwd3NTVUZCU1N4RlFVRkZMRTFCUVUwN1ZVRkRXaXhIUVVGSExFZEJRVWNzVlVGQlZTeEZRVUZGTEVkQlFVY3NTMEZCU3p0VlFVTXhRaXhKUVVGSkxFVkJRVVVzUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RlFVRkZPMVZCUTI1Q0xGRkJRVkVzUlVGQlJTeE5RVUZOTzFOQlEycENMRU5CUVVNc1EwRkJRenRSUVVOSUxFbEJRVWtzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNSVUZCUlR0VlFVTjJReXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUTJ4Q08wRkJRMVFzUzBGQlN6czdTVUZGUkN4WlFVRlpMRVZCUVVVc1ZVRkJWU3hKUVVGSkxFVkJRVVVzVVVGQlVTeEZRVUZGTzFGQlEzQkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU03UVVGRFppeFpRVUZaTEV0QlFVc3NSVUZCUlN4VlFVRlZPenRCUVVVM1FpeFpRVUZaTEZkQlFWY3NSVUZCUlN4cFEwRkJhVU03TzBGQlJURkVMRmxCUVZrc1YwRkJWeXhGUVVGRkxFbEJRVWs3TzBGQlJUZENMRmxCUVZrc1IwRkJSeXhIUVVGSExGVkJRVlVzUlVGQlJTeEhRVUZITEZkQlFWY3NSMEZCUnl4SlFVRkpPMEZCUTI1RU96dEJRVVZCTEZsQlFWa3NVVUZCVVN4RlFVRkZMRTlCUVU4N08xbEJSV3BDTEU5QlFVOHNSVUZCUlN4VlFVRlZMRWxCUVVrc1JVRkJSVHRuUWtGRGNrSXNVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRMnhDTzFOQlEwb3NRMEZCUXl4RFFVRkRPMEZCUTFnc1MwRkJTenM3U1VGRlJDeFpRVUZaTEVWQlFVVXNWVUZCVlN4UlFVRlJMRVZCUVVVN1VVRkRPVUlzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXp0VlFVTk1MRWxCUVVrc1JVRkJSU3hOUVVGTk8xVkJRMW9zUjBGQlJ5eEZRVUZGTEZWQlFWVXNSVUZCUlN4SFFVRkhMRlZCUVZVN1ZVRkRPVUlzU1VGQlNTeEZRVUZGTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVOQlFVTTdWVUZEZWtNc1VVRkJVU3hGUVVGRkxFMUJRVTA3VlVGRGFFSXNWMEZCVnl4RlFVRkZMR3RDUVVGclFqdFRRVU5vUXl4RFFVRkRMRU5CUVVNN1FVRkRXQ3hMUVVGTE96dEpRVVZFTEZsQlFWa3NSVUZCUlN4VlFVRlZMRkZCUVZFc1JVRkJSU3hMUVVGTExFVkJRVVU3VVVGRGNrTXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOSUxGZEJRVmNzUlVGQlJTd3dRa0ZCTUVJN1dVRkRka01zVjBGQlZ5eEZRVUZGTEVsQlFVazdRVUZETjBJc1dVRkJXU3hIUVVGSExFZEJRVWNzVlVGQlZTeEZRVUZGTEVkQlFVY3NWVUZCVlRzN1FVRkZNME1zV1VGQldTeFJRVUZSTEVWQlFVVXNUVUZCVFRzN1dVRkZhRUlzVDBGQlR5eEZRVUZGTEZWQlFWVXNTVUZCU1N4RlFVRkZPMmRDUVVOeVFpeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1lVRkRiRUk3V1VGRFJDeExRVUZMTEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVN1owSkJRMnhDTEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRoUVVOa08xTkJRMG9zUTBGQlF5eERRVUZETzB0QlEwNDdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzU1VGQlNTeERRVUZETEhGQ1FVRnhRaXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZETzBGQlF6TkRMRWxCUVVrc1EwRkJReXh0UWtGQmJVSXNRMEZCUXl4alFVRmpMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU03UVVGRGRFUXNTVUZCU1N4RFFVRkRMRzFDUVVGdFFpeERRVUZETEdOQlFXTXNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRCUVVOMFJDeEpRVUZKTEVOQlFVTXNNa0pCUVRKQ0xFTkJRVU1zWTBGQll5eERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRPenRCUVVVNVJDeFRRVUZUTEd0Q1FVRnJRaXhEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU01UWl4SlFVRkpMRWRCUVVjc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eE5RVUZOTEVWQlFVVXNTMEZCU3l4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXp0SlFVTXhSQ3hKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEUxQlFVMHNRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hIUVVGSExGZEJRVmNzUTBGQlF6dFJRVU5xUkN4UFFVRlBMRWRCUVVjc1MwRkJTeXhEUVVGRExFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1NVRkRNVU1zVDBGQlR5eFBRVUZQTEV0QlFVc3NTVUZCU1N4SFFVRkhMRVZCUVVVc1IwRkJSeXhyUWtGQmEwSXNRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEV0QlFVc3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lkbUZ5SUhWMGJXVWdQU0J5WlhGMWFYSmxLQ2N1TGk5MWRHMWxMbXB6SnlrN1hHNWNibVoxYm1OMGFXOXVJR2RsZEVKaGMyVlZVa3dnS0NrZ2UxeHVJQ0J5WlhSMWNtNGdkWFJ0WlM1emRHRjBaU0FtSmlCMWRHMWxMbk4wWVhSbExuUmxjM1JUWlhKMlpYSWdQeUIxZEcxbExuTjBZWFJsTG5SbGMzUlRaWEoyWlhJZ09pQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9YQ0oxZEcxbFgzUmxjM1JmYzJWeWRtVnlYQ0lwSUh4OElGd2lhSFIwY0Rvdkx6QXVNQzR3TGpBNk9UQTBNeTljSWp0Y2JuMWNibHh1ZG1GeUlITmxjblpsY2xKbGNHOXlkR1Z5SUQwZ2UxeHVJQ0FnSUdWeWNtOXlPaUJtZFc1amRHbHZiaUFvWlhKeWIzSXNJSE5qWlc1aGNtbHZMQ0IxZEcxbEtTQjdYRzRnSUNBZ0lDQWdJQ1F1WVdwaGVDaDdYRzRnSUNBZ0lDQWdJQ0FnZEhsd1pUb2dYQ0pRVDFOVVhDSXNYRzRnSUNBZ0lDQWdJQ0FnZFhKc09pQm5aWFJDWVhObFZWSk1LQ2tnS3lCY0ltVnljbTl5WENJc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVRvZ2V5QmtZWFJoT2lCbGNuSnZjaUI5TEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0ZVZVhCbE9pQmNJbXB6YjI1Y0lseHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIVjBiV1V1YzJWMGRHbHVaM011WjJWMEtGd2lZMjl1YzI5c1pVeHZaMmRwYm1kY0lpa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG1WeWNtOXlLR1Z5Y205eUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2MzVmpZMlZ6Y3pvZ1puVnVZM1JwYjI0Z0tITjFZMk5sYzNNc0lITmpaVzVoY21sdkxDQjFkRzFsS1NCN1hHNGdJQ0FnSUNBZ0lDUXVZV3BoZUNoN1hHNGdJQ0FnSUNBZ0lDQWdkSGx3WlRvZ1hDSlFUMU5VWENJc1hHNGdJQ0FnSUNBZ0lDQWdkWEpzT2lCblpYUkNZWE5sVlZKTUtDa2dLeUJjSW5OMVkyTmxjM05jSWl4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoT2lCN0lHUmhkR0U2SUhOMVkyTmxjM01nZlN4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoVkhsd1pUb2dYQ0pxYzI5dVhDSmNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG5ObGRIUnBibWR6TG1kbGRDaGNJbU52Ym5OdmJHVk1iMmRuYVc1blhDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ1kyOXVjMjlzWlM1c2IyY29jM1ZqWTJWemN5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lHeHZaem9nWm5WdVkzUnBiMjRnS0d4dlp5d2djMk5sYm1GeWFXOHNJSFYwYldVcElIdGNiaUFnSUNBZ0lDQWdKQzVoYW1GNEtIdGNiaUFnSUNBZ0lDQWdJQ0IwZVhCbE9pQmNJbEJQVTFSY0lpeGNiaUFnSUNBZ0lDQWdJQ0IxY213NklDQm5aWFJDWVhObFZWSk1LQ2tnS3lCY0lteHZaMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0U2SUhzZ1pHRjBZVG9nYkc5bklIMHNYRzRnSUNBZ0lDQWdJQ0FnWkdGMFlWUjVjR1U2SUZ3aWFuTnZibHdpWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXpaWFIwYVc1bmN5NW5aWFFvWENKamIyNXpiMnhsVEc5bloybHVaMXdpS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJR052Ym5OdmJHVXViRzluS0d4dlp5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdiRzloWkZOalpXNWhjbWx2T2lCbWRXNWpkR2x2YmlBb2JtRnRaU3dnWTJGc2JHSmhZMnNwSUh0Y2JpQWdJQ0FnSUNBZ0pDNWhhbUY0S0h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3B6YjI1d09pQmNJbU5oYkd4aVlXTnJYQ0lzWEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUlVlWEJsT2lCY0ltRndjR3hwWTJGMGFXOXVMMnB6YjI0N0lHTm9ZWEp6WlhROWRYUm1MVGhjSWl4Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnWTNKdmMzTkViMjFoYVc0NklIUnlkV1VzWEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0lHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWMyTmxibUZ5YVc4dlhDSWdLeUJ1WVcxbExGeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QjBaV3hzSUdwUmRXVnllU0IzWlNkeVpTQmxlSEJsWTNScGJtY2dTbE5QVGxCY2JpQWdJQ0FnSUNBZ0lDQWdJR1JoZEdGVWVYQmxPaUJjSW1wemIyNXdYQ0lzWEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSE4xWTJObGMzTTZJR1oxYm1OMGFXOXVJQ2h5WlhOd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZMkZzYkdKaFkyc29jbVZ6Y0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCellYWmxVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h6WTJWdVlYSnBieWtnZTF4dUlDQWdJQ0FnSUNBa0xtRnFZWGdvZTF4dUlDQWdJQ0FnSUNBZ0lIUjVjR1U2SUZ3aVVFOVRWRndpTEZ4dUlDQWdJQ0FnSUNBZ0lIVnliRG9nWjJWMFFtRnpaVlZTVENncElDc2dYQ0p6WTJWdVlYSnBiMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0U2SUVwVFQwNHVjM1J5YVc1bmFXWjVLSE5qWlc1aGNtbHZMQ0J1ZFd4c0xDQmNJaUJjSWlrc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJQ2RxYzI5dUp5eGNiaUFnSUNBZ0lDQWdJQ0JqYjI1MFpXNTBWSGx3WlRvZ1hDSmhjSEJzYVdOaGRHbHZiaTlxYzI5dVhDSmNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJR3h2WVdSVFpYUjBhVzVuY3pvZ1puVnVZM1JwYjI0Z0tHTmhiR3hpWVdOckxDQmxjbkp2Y2lrZ2UxeHVJQ0FnSUNBZ0lDQWtMbUZxWVhnb2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWRHVnVkRlI1Y0dVNklGd2lkR1Y0ZEM5d2JHRnVPeUJqYUdGeWMyVjBQWFYwWmkwNFhDSXNYRzRnSUNBZ0lDQWdJQ0FnSUNCamNtOXpjMFJ2YldGcGJqb2dkSEoxWlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0lHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWMyVjBkR2x1WjNOY0lpeGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklIUmxiR3dnYWxGMVpYSjVJSGRsSjNKbElHVjRjR1ZqZEdsdVp5QktVMDlPVUZ4dUlDQWdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJRndpYW5OdmJsd2lMRnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkV05qWlhOek9pQm1kVzVqZEdsdmJpQW9jbVZ6Y0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTmhiR3hpWVdOcktISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnljbTl5T2lCbWRXNWpkR2x2YmlBb1pYSnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSW9aWEp5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlZ4dWZUdGNibHh1ZFhSdFpTNXlaV2RwYzNSbGNsSmxjRzl5ZEVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXBPMXh1ZFhSdFpTNXlaV2RwYzNSbGNreHZZV1JJWVc1a2JHVnlLSE5sY25abGNsSmxjRzl5ZEdWeUxteHZZV1JUWTJWdVlYSnBieWs3WEc1MWRHMWxMbkpsWjJsemRHVnlVMkYyWlVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXVjMkYyWlZOalpXNWhjbWx2S1R0Y2JuVjBiV1V1Y21WbmFYTjBaWEpUWlhSMGFXNW5jMHh2WVdSSVlXNWtiR1Z5S0hObGNuWmxjbEpsY0c5eWRHVnlMbXh2WVdSVFpYUjBhVzVuY3lrN1hHNWNibVoxYm1OMGFXOXVJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2h1WVcxbEtTQjdYRzRnSUNBZ2JtRnRaU0E5SUc1aGJXVXVjbVZ3YkdGalpTZ3ZXMXhjVzEwdkxDQmNJbHhjWEZ4YlhDSXBMbkpsY0d4aFkyVW9MMXRjWEYxZEx5d2dYQ0pjWEZ4Y1hWd2lLVHRjYmlBZ0lDQjJZWElnY21WblpYZ2dQU0J1WlhjZ1VtVm5SWGh3S0Z3aVcxeGNYRncvSmwxY0lpQXJJRzVoYldVZ0t5QmNJajBvVzE0bUkxMHFLVndpS1N4Y2JpQWdJQ0FnSUNBZ2NtVnpkV3gwY3lBOUlISmxaMlY0TG1WNFpXTW9iRzlqWVhScGIyNHVjMlZoY21Ob0tUdGNiaUFnSUNCeVpYUjFjbTRnY21WemRXeDBjeUE5UFQwZ2JuVnNiQ0EvSUZ3aVhDSWdPaUJrWldOdlpHVlZVa2xEYjIxd2IyNWxiblFvY21WemRXeDBjMXN4WFM1eVpYQnNZV05sS0M5Y1hDc3ZaeXdnWENJZ1hDSXBLVHRjYm4waVhYMD0iLCJcblxuLyoqXG4qIEdlbmVyYXRlIHVuaXF1ZSBDU1Mgc2VsZWN0b3IgZm9yIGdpdmVuIERPTSBlbGVtZW50XG4qXG4qIEBwYXJhbSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7U3RyaW5nfVxuKiBAYXBpIHByaXZhdGVcbiovXG5cbmZ1bmN0aW9uIHVuaXF1ZShlbCwgZG9jKSB7XG4gIGlmICghZWwgfHwgIWVsLnRhZ05hbWUpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFbGVtZW50IGV4cGVjdGVkJyk7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0U2VsZWN0b3JJbmRleChlbGVtZW50LCBzZWxlY3Rvcikge1xuICAgICAgdmFyIGV4aXN0aW5nSW5kZXggPSAwO1xuICAgICAgdmFyIGl0ZW1zID0gIGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChpdGVtc1tpXSA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgICBleGlzdGluZ0luZGV4ID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXN0aW5nSW5kZXg7XG4gIH1cblxuICB2YXIgZWxTZWxlY3RvciA9IGdldEVsZW1lbnRTZWxlY3RvcihlbCkuc2VsZWN0b3I7XG4gIHZhciBpc1NpbXBsZVNlbGVjdG9yID0gZWxTZWxlY3RvciA9PT0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgYW5jZXN0b3JTZWxlY3RvcjtcblxuICB2YXIgY3VyckVsZW1lbnQgPSBlbDtcbiAgd2hpbGUgKGN1cnJFbGVtZW50LnBhcmVudEVsZW1lbnQgIT0gbnVsbCAmJiAhYW5jZXN0b3JTZWxlY3Rvcikge1xuICAgICAgY3VyckVsZW1lbnQgPSBjdXJyRWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgdmFyIHNlbGVjdG9yID0gZ2V0RWxlbWVudFNlbGVjdG9yKGN1cnJFbGVtZW50KS5zZWxlY3RvcjtcblxuICAgICAgLy8gVHlwaWNhbGx5IGVsZW1lbnRzIHRoYXQgaGF2ZSBhIGNsYXNzIG5hbWUgb3IgdGl0bGUsIHRob3NlIGFyZSBsZXNzIGxpa2VseVxuICAgICAgLy8gdG8gY2hhbmdlLCBhbmQgYWxzbyBiZSB1bmlxdWUuICBTbywgd2UgYXJlIHRyeWluZyB0byBmaW5kIGFuIGFuY2VzdG9yXG4gICAgICAvLyB0byBhbmNob3IgKG9yIHNjb3BlKSB0aGUgc2VhcmNoIGZvciB0aGUgZWxlbWVudCwgYW5kIG1ha2UgaXQgbGVzcyBicml0dGxlLlxuICAgICAgaWYgKHNlbGVjdG9yICE9PSBjdXJyRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICBhbmNlc3RvclNlbGVjdG9yID0gc2VsZWN0b3IgKyAoY3VyckVsZW1lbnQgPT09IGVsLnBhcmVudEVsZW1lbnQgJiYgaXNTaW1wbGVTZWxlY3RvciA/IFwiID4gXCIgOiBcIiBcIikgKyBlbFNlbGVjdG9yO1xuICAgICAgfVxuICB9XG5cbiAgdmFyIGZpbmFsU2VsZWN0b3JzID0gW107XG4gIGlmIChhbmNlc3RvclNlbGVjdG9yKSB7XG4gICAgZmluYWxTZWxlY3RvcnMucHVzaChcbiAgICAgIGFuY2VzdG9yU2VsZWN0b3IgKyBcIjplcShcIiArIF9nZXRTZWxlY3RvckluZGV4KGVsLCBhbmNlc3RvclNlbGVjdG9yKSArIFwiKVwiXG4gICAgKTtcbiAgfVxuXG4gIGZpbmFsU2VsZWN0b3JzLnB1c2goZWxTZWxlY3RvciArIFwiOmVxKFwiICsgX2dldFNlbGVjdG9ySW5kZXgoZWwsIGVsU2VsZWN0b3IpICsgXCIpXCIpO1xuICByZXR1cm4gZmluYWxTZWxlY3RvcnM7XG59O1xuXG4vKipcbiogR2V0IGNsYXNzIG5hbWVzIGZvciBhbiBlbGVtZW50XG4qXG4qIEBwYXJhcm0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge0FycmF5fVxuKi9cblxuZnVuY3Rpb24gZ2V0Q2xhc3NOYW1lcyhlbCkge1xuICB2YXIgY2xhc3NOYW1lID0gZWwuZ2V0QXR0cmlidXRlKCdjbGFzcycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtdmVyaWZ5JywgJycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtcmVhZHknLCAnJyk7XG5cbiAgaWYgKCFjbGFzc05hbWUgfHwgKCFjbGFzc05hbWUudHJpbSgpLmxlbmd0aCkpIHsgcmV0dXJuIFtdOyB9XG5cbiAgLy8gcmVtb3ZlIGR1cGxpY2F0ZSB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG5cbiAgLy8gdHJpbSBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG5cbiAgLy8gc3BsaXQgaW50byBzZXBhcmF0ZSBjbGFzc25hbWVzXG4gIHJldHVybiBjbGFzc05hbWUudHJpbSgpLnNwbGl0KCcgJyk7XG59XG5cbi8qKlxuKiBDU1Mgc2VsZWN0b3JzIHRvIGdlbmVyYXRlIHVuaXF1ZSBzZWxlY3RvciBmb3IgRE9NIGVsZW1lbnRcbipcbiogQHBhcmFtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtBcnJheX1cbiogQGFwaSBwcnZpYXRlXG4qL1xuXG5mdW5jdGlvbiBnZXRFbGVtZW50U2VsZWN0b3IoZWwsIGlzVW5pcXVlKSB7XG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgbGFiZWwgPSBudWxsO1xuICB2YXIgdGl0bGUgPSBudWxsO1xuICB2YXIgYWx0ICAgPSBudWxsO1xuICB2YXIgbmFtZSAgPSBudWxsO1xuICB2YXIgdmFsdWUgPSBudWxsO1xuICB2YXIgbWUgPSBlbDtcblxuICAvLyBkbyB7XG5cbiAgLy8gSURzIGFyZSB1bmlxdWUgZW5vdWdoXG4gIGlmIChlbC5pZCkge1xuICAgIGxhYmVsID0gJ1tpZD1cXCcnICsgZWwuaWQgKyBcIlxcJ11cIjtcbiAgfSBlbHNlIHtcbiAgICAvLyBPdGhlcndpc2UsIHVzZSB0YWcgbmFtZVxuICAgIGxhYmVsICAgICA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIHZhciBjbGFzc05hbWVzID0gZ2V0Q2xhc3NOYW1lcyhlbCk7XG5cbiAgICAvLyBUYWcgbmFtZXMgY291bGQgdXNlIGNsYXNzZXMgZm9yIHNwZWNpZmljaXR5XG4gICAgaWYgKGNsYXNzTmFtZXMubGVuZ3RoKSB7XG4gICAgICBsYWJlbCArPSAnLicgKyBjbGFzc05hbWVzLmpvaW4oJy4nKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaXRsZXMgJiBBbHQgYXR0cmlidXRlcyBhcmUgdmVyeSB1c2VmdWwgZm9yIHNwZWNpZmljaXR5IGFuZCB0cmFja2luZ1xuICBpZiAodGl0bGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykpIHtcbiAgICBsYWJlbCArPSAnW3RpdGxlPVwiJyArIHRpdGxlICsgJ1wiXSc7XG4gIH0gZWxzZSBpZiAoYWx0ID0gZWwuZ2V0QXR0cmlidXRlKCdhbHQnKSkge1xuICAgIGxhYmVsICs9ICdbYWx0PVwiJyArIGFsdCArICdcIl0nO1xuICB9IGVsc2UgaWYgKG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgIGxhYmVsICs9ICdbbmFtZT1cIicgKyBuYW1lICsgJ1wiXSc7XG4gIH1cblxuICBpZiAodmFsdWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykpIHtcbiAgICBsYWJlbCArPSAnW3ZhbHVlPVwiJyArIHZhbHVlICsgJ1wiXSc7XG4gIH1cblxuICAvLyBpZiAoZWwuaW5uZXJUZXh0Lmxlbmd0aCAhPSAwKSB7XG4gIC8vICAgbGFiZWwgKz0gJzpjb250YWlucygnICsgZWwuaW5uZXJUZXh0ICsgJyknO1xuICAvLyB9XG5cbiAgcGFydHMudW5zaGlmdCh7XG4gICAgZWxlbWVudDogZWwsXG4gICAgc2VsZWN0b3I6IGxhYmVsXG4gIH0pO1xuXG4gIC8vIGlmIChpc1VuaXF1ZShwYXJ0cykpIHtcbiAgLy8gICAgIGJyZWFrO1xuICAvLyB9XG5cbiAgLy8gfSB3aGlsZSAoIWVsLmlkICYmIChlbCA9IGVsLnBhcmVudE5vZGUpICYmIGVsLnRhZ05hbWUpO1xuXG4gIC8vIFNvbWUgc2VsZWN0b3JzIHNob3VsZCBoYXZlIG1hdGNoZWQgYXQgbGVhc3RcbiAgaWYgKCFwYXJ0cy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBpZGVudGlmeSBDU1Mgc2VsZWN0b3InKTtcbiAgfVxuICByZXR1cm4gcGFydHNbMF07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdW5pcXVlO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lkSEpoYm5ObWIzSnRaV1F1YW5NaUxDSnpiM1Z5WTJWeklqcGJJaTlFWlhabGJHOXdaWEl2WVhSemFXUXZVSEp2YW1WamRITXZkWFJ0WlM5MWRHMWxMM055WXk5cWN5OXpaV3hsWTNSdmNrWnBibVJsY2k1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHM3UVVGRlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUVVWQkxFVkJRVVU3TzBGQlJVWXNVMEZCVXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxFZEJRVWNzUlVGQlJUdEZRVU4yUWl4SlFVRkpMRU5CUVVNc1JVRkJSU3hKUVVGSkxFTkJRVU1zUlVGQlJTeERRVUZETEU5QlFVOHNSVUZCUlR0SlFVTjBRaXhOUVVGTkxFbEJRVWtzVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03UVVGRE5VTXNSMEZCUnpzN1JVRkZSQ3hUUVVGVExHbENRVUZwUWl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVU3VFVGRE1VTXNTVUZCU1N4aFFVRmhMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJRelZDTEUxQlFVMHNTVUZCU1N4TFFVRkxMRWxCUVVrc1IwRkJSeXhEUVVGRExHZENRVUZuUWl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE96dE5RVVUxUXl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NTMEZCU3l4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdFZRVU51UXl4SlFVRkpMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUzBGQlN5eFBRVUZQTEVWQlFVVTdZMEZEZEVJc1lVRkJZU3hIUVVGSExFTkJRVU1zUTBGQlF6dGpRVU5zUWl4TlFVRk5PMWRCUTFRN1QwRkRTanROUVVORUxFOUJRVThzWVVGQllTeERRVUZETzBGQlF6TkNMRWRCUVVjN08wVkJSVVFzU1VGQlNTeFZRVUZWTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RFFVRkRPMFZCUTJwRUxFbEJRVWtzWjBKQlFXZENMRWRCUVVjc1ZVRkJWU3hMUVVGTExFVkJRVVVzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RlFVRkZMRU5CUVVNN1FVRkRha1VzUlVGQlJTeEpRVUZKTEdkQ1FVRm5RaXhEUVVGRE96dEZRVVZ5UWl4SlFVRkpMRmRCUVZjc1IwRkJSeXhGUVVGRkxFTkJRVU03UlVGRGNrSXNUMEZCVHl4WFFVRlhMRU5CUVVNc1lVRkJZU3hKUVVGSkxFbEJRVWtzU1VGQlNTeERRVUZETEdkQ1FVRm5RaXhGUVVGRk8wMUJRek5FTEZkQlFWY3NSMEZCUnl4WFFVRlhMRU5CUVVNc1lVRkJZU3hEUVVGRE8wRkJRemxETEUxQlFVMHNTVUZCU1N4UlFVRlJMRWRCUVVjc2EwSkJRV3RDTEVOQlFVTXNWMEZCVnl4RFFVRkRMRU5CUVVNc1VVRkJVU3hEUVVGRE8wRkJRemxFTzBGQlEwRTdRVUZEUVRzN1RVRkZUU3hKUVVGSkxGRkJRVkVzUzBGQlN5eFhRVUZYTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1JVRkJSU3hGUVVGRk8xVkJRMmhFTEdkQ1FVRm5RaXhIUVVGSExGRkJRVkVzU1VGQlNTeFhRVUZYTEV0QlFVc3NSVUZCUlN4RFFVRkRMR0ZCUVdFc1NVRkJTU3huUWtGQlowSXNSMEZCUnl4TFFVRkxMRWRCUVVjc1IwRkJSeXhEUVVGRExFZEJRVWNzVlVGQlZTeERRVUZETzA5QlEyNUlPMEZCUTFBc1IwRkJSenM3UlVGRlJDeEpRVUZKTEdOQlFXTXNSMEZCUnl4RlFVRkZMRU5CUVVNN1JVRkRlRUlzU1VGQlNTeG5Ra0ZCWjBJc1JVRkJSVHRKUVVOd1FpeGpRVUZqTEVOQlFVTXNTVUZCU1R0TlFVTnFRaXhuUWtGQlowSXNSMEZCUnl4TlFVRk5MRWRCUVVjc2FVSkJRV2xDTEVOQlFVTXNSVUZCUlN4RlFVRkZMR2RDUVVGblFpeERRVUZETEVkQlFVY3NSMEZCUnp0TFFVTXhSU3hEUVVGRE8wRkJRMDRzUjBGQlJ6czdSVUZGUkN4alFVRmpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzUjBGQlJ5eE5RVUZOTEVkQlFVY3NhVUpCUVdsQ0xFTkJRVU1zUlVGQlJTeEZRVUZGTEZWQlFWVXNRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRE8wVkJRMjVHTEU5QlFVOHNZMEZCWXl4RFFVRkRPMEZCUTNoQ0xFTkJRVU1zUTBGQlF6czdRVUZGUmp0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVGRlFTeEZRVUZGT3p0QlFVVkdMRk5CUVZNc1lVRkJZU3hEUVVGRExFVkJRVVVzUlVGQlJUdEZRVU42UWl4SlFVRkpMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMFZCUTNwRExGTkJRVk1zUjBGQlJ5eFRRVUZUTEVsQlFVa3NVMEZCVXl4RFFVRkRMRTlCUVU4c1EwRkJReXhoUVVGaExFVkJRVVVzUlVGQlJTeERRVUZETEVOQlFVTTdRVUZEYUVVc1JVRkJSU3hUUVVGVExFZEJRVWNzVTBGQlV5eEpRVUZKTEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1dVRkJXU3hGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZET3p0QlFVVXZSQ3hGUVVGRkxFbEJRVWtzUTBGQlF5eFRRVUZUTEV0QlFVc3NRMEZCUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hGUVVGRkxFTkJRVU1zVFVGQlRTeERRVUZETEVWQlFVVXNSVUZCUlN4UFFVRlBMRVZCUVVVc1EwRkJReXhGUVVGRk8wRkJRemxFT3p0QlFVVkJMRVZCUVVVc1UwRkJVeXhIUVVGSExGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNUVUZCVFN4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJRemRET3p0QlFVVkJMRVZCUVVVc1UwRkJVeXhIUVVGSExGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNXVUZCV1N4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8wRkJRMnhFT3p0RlFVVkZMRTlCUVU4c1UwRkJVeXhEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVOeVF5eERRVUZET3p0QlFVVkVPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGQlJVRXNSVUZCUlRzN1FVRkZSaXhUUVVGVExHdENRVUZyUWl4RFFVRkRMRVZCUVVVc1JVRkJSU3hSUVVGUkxFVkJRVVU3UlVGRGVFTXNTVUZCU1N4TFFVRkxMRWRCUVVjc1JVRkJSU3hEUVVGRE8wVkJRMllzU1VGQlNTeExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRPMFZCUTJwQ0xFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0RlFVTnFRaXhKUVVGSkxFZEJRVWNzUzBGQlN5eEpRVUZKTEVOQlFVTTdSVUZEYWtJc1NVRkJTU3hKUVVGSkxFbEJRVWtzU1VGQlNTeERRVUZETzBWQlEycENMRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEJRVU51UWl4RlFVRkZMRWxCUVVrc1JVRkJSU3hIUVVGSExFVkJRVVVzUTBGQlF6dEJRVU5rTzBGQlEwRTdRVUZEUVRzN1JVRkZSU3hKUVVGSkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdTVUZEVkN4TFFVRkxMRWRCUVVjc1VVRkJVU3hIUVVGSExFVkJRVVVzUTBGQlF5eEZRVUZGTEVkQlFVY3NTMEZCU3l4RFFVRkRPMEZCUTNKRExFZEJRVWNzVFVGQlRUczdRVUZGVkN4SlFVRkpMRXRCUVVzc1QwRkJUeXhGUVVGRkxFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4RFFVRkRPenRCUVVWNlF5eEpRVUZKTEVsQlFVa3NWVUZCVlN4SFFVRkhMR0ZCUVdFc1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF6dEJRVU4yUXpzN1NVRkZTU3hKUVVGSkxGVkJRVlVzUTBGQlF5eE5RVUZOTEVWQlFVVTdUVUZEY2tJc1MwRkJTeXhKUVVGSkxFZEJRVWNzUjBGQlJ5eFZRVUZWTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8wdEJRM0pETzBGQlEwd3NSMEZCUnp0QlFVTklPenRGUVVWRkxFbEJRVWtzUzBGQlN5eEhRVUZITEVWQlFVVXNRMEZCUXl4WlFVRlpMRU5CUVVNc1QwRkJUeXhEUVVGRExFVkJRVVU3U1VGRGNFTXNTMEZCU3l4SlFVRkpMRlZCUVZVc1IwRkJSeXhMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETzBkQlEzQkRMRTFCUVUwc1NVRkJTU3hIUVVGSExFZEJRVWNzUlVGQlJTeERRVUZETEZsQlFWa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1JVRkJSVHRKUVVOMlF5eExRVUZMTEVsQlFVa3NVVUZCVVN4SFFVRkhMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU03UjBGRGFFTXNUVUZCVFN4SlFVRkpMRWxCUVVrc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEUxQlFVMHNRMEZCUXl4RlFVRkZPMGxCUTNwRExFdEJRVXNzU1VGQlNTeFRRVUZUTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJRenRCUVVOeVF5eEhRVUZIT3p0RlFVVkVMRWxCUVVrc1MwRkJTeXhIUVVGSExFVkJRVVVzUTBGQlF5eFpRVUZaTEVOQlFVTXNUMEZCVHl4RFFVRkRMRVZCUVVVN1NVRkRjRU1zUzBGQlN5eEpRVUZKTEZWQlFWVXNSMEZCUnl4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRE8wRkJRM1pETEVkQlFVYzdRVUZEU0R0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UlVGRlJTeExRVUZMTEVOQlFVTXNUMEZCVHl4RFFVRkRPMGxCUTFvc1QwRkJUeXhGUVVGRkxFVkJRVVU3U1VGRFdDeFJRVUZSTEVWQlFVVXNTMEZCU3p0QlFVTnVRaXhIUVVGSExFTkJRVU1zUTBGQlF6dEJRVU5NTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEZRVVZGTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hGUVVGRk8wbEJRMnBDTEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc2FVTkJRV2xETEVOQlFVTXNRMEZCUXp0SFFVTndSRHRGUVVORUxFOUJRVThzUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTJ4Q0xFTkJRVU03TzBGQlJVUXNUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSeXhOUVVGTkxFTkJRVU1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKY2JseHVMeW9xWEc0cUlFZGxibVZ5WVhSbElIVnVhWEYxWlNCRFUxTWdjMlZzWldOMGIzSWdabTl5SUdkcGRtVnVJRVJQVFNCbGJHVnRaVzUwWEc0cVhHNHFJRUJ3WVhKaGJTQjdSV3hsYldWdWRIMGdaV3hjYmlvZ1FISmxkSFZ5YmlCN1UzUnlhVzVuZlZ4dUtpQkFZWEJwSUhCeWFYWmhkR1ZjYmlvdlhHNWNibVoxYm1OMGFXOXVJSFZ1YVhGMVpTaGxiQ3dnWkc5aktTQjdYRzRnSUdsbUlDZ2haV3dnZkh3Z0lXVnNMblJoWjA1aGJXVXBJSHRjYmlBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2RGYkdWdFpXNTBJR1Y0Y0dWamRHVmtKeWs3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCZloyVjBVMlZzWldOMGIzSkpibVJsZUNobGJHVnRaVzUwTENCelpXeGxZM1J2Y2lrZ2UxeHVJQ0FnSUNBZ2RtRnlJR1Y0YVhOMGFXNW5TVzVrWlhnZ1BTQXdPMXh1SUNBZ0lDQWdkbUZ5SUdsMFpXMXpJRDBnSUdSdll5NXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tITmxiR1ZqZEc5eUtUdGNibHh1SUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JwZEdWdGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2hwZEdWdGMxdHBYU0E5UFQwZ1pXeGxiV1Z1ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGVHbHpkR2x1WjBsdVpHVjRJRDBnYVR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnY21WMGRYSnVJR1Y0YVhOMGFXNW5TVzVrWlhnN1hHNGdJSDFjYmx4dUlDQjJZWElnWld4VFpXeGxZM1J2Y2lBOUlHZGxkRVZzWlcxbGJuUlRaV3hsWTNSdmNpaGxiQ2t1YzJWc1pXTjBiM0k3WEc0Z0lIWmhjaUJwYzFOcGJYQnNaVk5sYkdWamRHOXlJRDBnWld4VFpXeGxZM1J2Y2lBOVBUMGdaV3d1ZEdGblRtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncE8xeHVJQ0IyWVhJZ1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2p0Y2JseHVJQ0IyWVhJZ1kzVnlja1ZzWlcxbGJuUWdQU0JsYkR0Y2JpQWdkMmhwYkdVZ0tHTjFjbkpGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RZ0lUMGdiblZzYkNBbUppQWhZVzVqWlhOMGIzSlRaV3hsWTNSdmNpa2dlMXh1SUNBZ0lDQWdZM1Z5Y2tWc1pXMWxiblFnUFNCamRYSnlSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTzF4dUlDQWdJQ0FnZG1GeUlITmxiR1ZqZEc5eUlEMGdaMlYwUld4bGJXVnVkRk5sYkdWamRHOXlLR04xY25KRmJHVnRaVzUwS1M1elpXeGxZM1J2Y2p0Y2JseHVJQ0FnSUNBZ0x5OGdWSGx3YVdOaGJHeDVJR1ZzWlcxbGJuUnpJSFJvWVhRZ2FHRjJaU0JoSUdOc1lYTnpJRzVoYldVZ2IzSWdkR2wwYkdVc0lIUm9iM05sSUdGeVpTQnNaWE56SUd4cGEyVnNlVnh1SUNBZ0lDQWdMeThnZEc4Z1kyaGhibWRsTENCaGJtUWdZV3h6YnlCaVpTQjFibWx4ZFdVdUlDQlRieXdnZDJVZ1lYSmxJSFJ5ZVdsdVp5QjBieUJtYVc1a0lHRnVJR0Z1WTJWemRHOXlYRzRnSUNBZ0lDQXZMeUIwYnlCaGJtTm9iM0lnS0c5eUlITmpiM0JsS1NCMGFHVWdjMlZoY21Ob0lHWnZjaUIwYUdVZ1pXeGxiV1Z1ZEN3Z1lXNWtJRzFoYTJVZ2FYUWdiR1Z6Y3lCaWNtbDBkR3hsTGx4dUlDQWdJQ0FnYVdZZ0tITmxiR1ZqZEc5eUlDRTlQU0JqZFhKeVJXeGxiV1Z1ZEM1MFlXZE9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCaGJtTmxjM1J2Y2xObGJHVmpkRzl5SUQwZ2MyVnNaV04wYjNJZ0t5QW9ZM1Z5Y2tWc1pXMWxiblFnUFQwOUlHVnNMbkJoY21WdWRFVnNaVzFsYm5RZ0ppWWdhWE5UYVcxd2JHVlRaV3hsWTNSdmNpQS9JRndpSUQ0Z1hDSWdPaUJjSWlCY0lpa2dLeUJsYkZObGJHVmpkRzl5TzF4dUlDQWdJQ0FnZlZ4dUlDQjlYRzVjYmlBZ2RtRnlJR1pwYm1Gc1UyVnNaV04wYjNKeklEMGdXMTA3WEc0Z0lHbG1JQ2hoYm1ObGMzUnZjbE5sYkdWamRHOXlLU0I3WEc0Z0lDQWdabWx1WVd4VFpXeGxZM1J2Y25NdWNIVnphQ2hjYmlBZ0lDQWdJR0Z1WTJWemRHOXlVMlZzWldOMGIzSWdLeUJjSWpwbGNTaGNJaUFySUY5blpYUlRaV3hsWTNSdmNrbHVaR1Y0S0dWc0xDQmhibU5sYzNSdmNsTmxiR1ZqZEc5eUtTQXJJRndpS1Z3aVhHNGdJQ0FnS1R0Y2JpQWdmVnh1WEc0Z0lHWnBibUZzVTJWc1pXTjBiM0p6TG5CMWMyZ29aV3hUWld4bFkzUnZjaUFySUZ3aU9tVnhLRndpSUNzZ1gyZGxkRk5sYkdWamRHOXlTVzVrWlhnb1pXd3NJR1ZzVTJWc1pXTjBiM0lwSUNzZ1hDSXBYQ0lwTzF4dUlDQnlaWFIxY200Z1ptbHVZV3hUWld4bFkzUnZjbk03WEc1OU8xeHVYRzR2S2lwY2Jpb2dSMlYwSUdOc1lYTnpJRzVoYldWeklHWnZjaUJoYmlCbGJHVnRaVzUwWEc0cVhHNHFJRUJ3WVhKaGNtMGdlMFZzWlcxbGJuUjlJR1ZzWEc0cUlFQnlaWFIxY200Z2UwRnljbUY1ZlZ4dUtpOWNibHh1Wm5WdVkzUnBiMjRnWjJWMFEyeGhjM05PWVcxbGN5aGxiQ2tnZTF4dUlDQjJZWElnWTJ4aGMzTk9ZVzFsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkamJHRnpjeWNwTzF4dUlDQmpiR0Z6YzA1aGJXVWdQU0JqYkdGemMwNWhiV1VnSmlZZ1kyeGhjM05PWVcxbExuSmxjR3hoWTJVb0ozVjBiV1V0ZG1WeWFXWjVKeXdnSnljcE8xeHVJQ0JqYkdGemMwNWhiV1VnUFNCamJHRnpjMDVoYldVZ0ppWWdZMnhoYzNOT1lXMWxMbkpsY0d4aFkyVW9KM1YwYldVdGNtVmhaSGtuTENBbkp5azdYRzVjYmlBZ2FXWWdLQ0ZqYkdGemMwNWhiV1VnZkh3Z0tDRmpiR0Z6YzA1aGJXVXVkSEpwYlNncExteGxibWQwYUNrcElIc2djbVYwZFhKdUlGdGRPeUI5WEc1Y2JpQWdMeThnY21WdGIzWmxJR1IxY0d4cFkyRjBaU0IzYUdsMFpYTndZV05sWEc0Z0lHTnNZWE56VG1GdFpTQTlJR05zWVhOelRtRnRaUzV5WlhCc1lXTmxLQzljWEhNckwyY3NJQ2NnSnlrN1hHNWNiaUFnTHk4Z2RISnBiU0JzWldGa2FXNW5JR0Z1WkNCMGNtRnBiR2x1WnlCM2FHbDBaWE53WVdObFhHNGdJR05zWVhOelRtRnRaU0E5SUdOc1lYTnpUbUZ0WlM1eVpYQnNZV05sS0M5ZVhGeHpLM3hjWEhNckpDOW5MQ0FuSnlrN1hHNWNiaUFnTHk4Z2MzQnNhWFFnYVc1MGJ5QnpaWEJoY21GMFpTQmpiR0Z6YzI1aGJXVnpYRzRnSUhKbGRIVnliaUJqYkdGemMwNWhiV1V1ZEhKcGJTZ3BMbk53YkdsMEtDY2dKeWs3WEc1OVhHNWNiaThxS2x4dUtpQkRVMU1nYzJWc1pXTjBiM0p6SUhSdklHZGxibVZ5WVhSbElIVnVhWEYxWlNCelpXeGxZM1J2Y2lCbWIzSWdSRTlOSUdWc1pXMWxiblJjYmlwY2Jpb2dRSEJoY21GdElIdEZiR1Z0Wlc1MGZTQmxiRnh1S2lCQWNtVjBkWEp1SUh0QmNuSmhlWDFjYmlvZ1FHRndhU0J3Y25acFlYUmxYRzRxTDF4dVhHNW1kVzVqZEdsdmJpQm5aWFJGYkdWdFpXNTBVMlZzWldOMGIzSW9aV3dzSUdselZXNXBjWFZsS1NCN1hHNGdJSFpoY2lCd1lYSjBjeUE5SUZ0ZE8xeHVJQ0IyWVhJZ2JHRmlaV3dnUFNCdWRXeHNPMXh1SUNCMllYSWdkR2wwYkdVZ1BTQnVkV3hzTzF4dUlDQjJZWElnWVd4MElDQWdQU0J1ZFd4c08xeHVJQ0IyWVhJZ2JtRnRaU0FnUFNCdWRXeHNPMXh1SUNCMllYSWdkbUZzZFdVZ1BTQnVkV3hzTzF4dUlDQjJZWElnYldVZ1BTQmxiRHRjYmx4dUlDQXZMeUJrYnlCN1hHNWNiaUFnTHk4Z1NVUnpJR0Z5WlNCMWJtbHhkV1VnWlc1dmRXZG9YRzRnSUdsbUlDaGxiQzVwWkNrZ2UxeHVJQ0FnSUd4aFltVnNJRDBnSjF0cFpEMWNYQ2NuSUNzZ1pXd3VhV1FnS3lCY0lseGNKMTFjSWp0Y2JpQWdmU0JsYkhObElIdGNiaUFnSUNBdkx5QlBkR2hsY25kcGMyVXNJSFZ6WlNCMFlXY2dibUZ0WlZ4dUlDQWdJR3hoWW1Wc0lDQWdJQ0E5SUdWc0xuUmhaMDVoYldVdWRHOU1iM2RsY2tOaGMyVW9LVHRjYmx4dUlDQWdJSFpoY2lCamJHRnpjMDVoYldWeklEMGdaMlYwUTJ4aGMzTk9ZVzFsY3lobGJDazdYRzVjYmlBZ0lDQXZMeUJVWVdjZ2JtRnRaWE1nWTI5MWJHUWdkWE5sSUdOc1lYTnpaWE1nWm05eUlITndaV05wWm1samFYUjVYRzRnSUNBZ2FXWWdLR05zWVhOelRtRnRaWE11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0JzWVdKbGJDQXJQU0FuTGljZ0t5QmpiR0Z6YzA1aGJXVnpMbXB2YVc0b0p5NG5LVHRjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0F2THlCVWFYUnNaWE1nSmlCQmJIUWdZWFIwY21saWRYUmxjeUJoY21VZ2RtVnllU0IxYzJWbWRXd2dabTl5SUhOd1pXTnBabWxqYVhSNUlHRnVaQ0IwY21GamEybHVaMXh1SUNCcFppQW9kR2wwYkdVZ1BTQmxiQzVuWlhSQmRIUnlhV0oxZEdVb0ozUnBkR3hsSnlrcElIdGNiaUFnSUNCc1lXSmxiQ0FyUFNBblczUnBkR3hsUFZ3aUp5QXJJSFJwZEd4bElDc2dKMXdpWFNjN1hHNGdJSDBnWld4elpTQnBaaUFvWVd4MElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZGhiSFFuS1NrZ2UxeHVJQ0FnSUd4aFltVnNJQ3M5SUNkYllXeDBQVndpSnlBcklHRnNkQ0FySUNkY0lsMG5PMXh1SUNCOUlHVnNjMlVnYVdZZ0tHNWhiV1VnUFNCbGJDNW5aWFJCZEhSeWFXSjFkR1VvSjI1aGJXVW5LU2tnZTF4dUlDQWdJR3hoWW1Wc0lDczlJQ2RiYm1GdFpUMWNJaWNnS3lCdVlXMWxJQ3NnSjF3aVhTYzdYRzRnSUgxY2JseHVJQ0JwWmlBb2RtRnNkV1VnUFNCbGJDNW5aWFJCZEhSeWFXSjFkR1VvSjNaaGJIVmxKeWtwSUh0Y2JpQWdJQ0JzWVdKbGJDQXJQU0FuVzNaaGJIVmxQVndpSnlBcklIWmhiSFZsSUNzZ0oxd2lYU2M3WEc0Z0lIMWNibHh1SUNBdkx5QnBaaUFvWld3dWFXNXVaWEpVWlhoMExteGxibWQwYUNBaFBTQXdLU0I3WEc0Z0lDOHZJQ0FnYkdGaVpXd2dLejBnSnpwamIyNTBZV2x1Y3lnbklDc2daV3d1YVc1dVpYSlVaWGgwSUNzZ0p5a25PMXh1SUNBdkx5QjlYRzVjYmlBZ2NHRnlkSE11ZFc1emFHbG1kQ2g3WEc0Z0lDQWdaV3hsYldWdWREb2daV3dzWEc0Z0lDQWdjMlZzWldOMGIzSTZJR3hoWW1Wc1hHNGdJSDBwTzF4dVhHNGdJQzh2SUdsbUlDaHBjMVZ1YVhGMVpTaHdZWEowY3lrcElIdGNiaUFnTHk4Z0lDQWdJR0p5WldGck8xeHVJQ0F2THlCOVhHNWNiaUFnTHk4Z2ZTQjNhR2xzWlNBb0lXVnNMbWxrSUNZbUlDaGxiQ0E5SUdWc0xuQmhjbVZ1ZEU1dlpHVXBJQ1ltSUdWc0xuUmhaMDVoYldVcE8xeHVYRzRnSUM4dklGTnZiV1VnYzJWc1pXTjBiM0p6SUhOb2IzVnNaQ0JvWVhabElHMWhkR05vWldRZ1lYUWdiR1ZoYzNSY2JpQWdhV1lnS0NGd1lYSjBjeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0owWmhhV3hsWkNCMGJ5QnBaR1Z1ZEdsbWVTQkRVMU1nYzJWc1pXTjBiM0luS1R0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnY0dGeWRITmJNRjA3WEc1OVhHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdkVzVwY1hWbE8xeHVJbDE5IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgbG9jYWxfc3RvcmFnZV9rZXkgPSAndXRtZS1zZXR0aW5ncyc7XG5cbmZ1bmN0aW9uIFNldHRpbmdzIChkZWZhdWx0U2V0dGluZ3MpIHtcbiAgICB0aGlzLnNldERlZmF1bHRzKGRlZmF1bHRTZXR0aW5ncyB8fCB7fSk7XG59XG5cblNldHRpbmdzLnByb3RvdHlwZSA9IHtcbiAgICByZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZXR0aW5nc1N0cmluZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGxvY2FsX3N0b3JhZ2Vfa2V5KTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge307XG4gICAgICAgIGlmIChzZXR0aW5nc1N0cmluZykge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBKU09OLnBhcnNlKHNldHRpbmdzU3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldERlZmF1bHRzOiBmdW5jdGlvbiAoZGVmYXVsdFNldHRpbmdzKSB7XG4gICAgICAgIHZhciBsb2NhbFNldHRpbmdzID0gdGhpcy5yZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIHZhciBkZWZhdWx0c0NvcHkgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdFNldHRpbmdzIHx8IHt9KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IF8uZXh0ZW5kKHt9LCBfLmV4dGVuZChkZWZhdWx0c0NvcHksIGxvY2FsU2V0dGluZ3MpKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0U2V0dGluZ3MgPSBkZWZhdWx0U2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5nc1trZXldID0gdmFsdWU7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH0sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3Nba2V5XTtcbiAgICB9LFxuXG4gICAgc2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShsb2NhbF9zdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xuICAgIH0sXG5cbiAgICByZXNldERlZmF1bHRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICBpZiAoZGVmYXVsdHMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdHMpO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pZEhKaGJuTm1iM0p0WldRdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5RVpYWmxiRzl3WlhJdllYUnphV1F2VUhKdmFtVmpkSE12ZFhSdFpTOTFkRzFsTDNOeVl5OXFjeTl6WlhSMGFXNW5jeTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFTeEpRVUZKTEVOQlFVTXNSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UVVGRE0wSXNTVUZCU1N4cFFrRkJhVUlzUjBGQlJ5eGxRVUZsTEVOQlFVTTdPMEZCUlhoRExGTkJRVk1zVVVGQlVTeEZRVUZGTEdWQlFXVXNSVUZCUlR0SlFVTm9ReXhKUVVGSkxFTkJRVU1zVjBGQlZ5eERRVUZETEdWQlFXVXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJRenRCUVVNMVF5eERRVUZET3p0QlFVVkVMRkZCUVZFc1EwRkJReXhUUVVGVExFZEJRVWM3U1VGRGFrSXNORUpCUVRSQ0xFVkJRVVVzV1VGQldUdFJRVU4wUXl4SlFVRkpMR05CUVdNc1IwRkJSeXhaUVVGWkxFTkJRVU1zVDBGQlR5eERRVUZETEdsQ1FVRnBRaXhEUVVGRExFTkJRVU03VVVGRE4wUXNTVUZCU1N4UlFVRlJMRWRCUVVjc1JVRkJSU3hEUVVGRE8xRkJRMnhDTEVsQlFVa3NZMEZCWXl4RlFVRkZPMWxCUTJoQ0xGRkJRVkVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMR05CUVdNc1EwRkJReXhEUVVGRE8xTkJRM3BETzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNN1FVRkRlRUlzUzBGQlN6czdTVUZGUkN4WFFVRlhMRVZCUVVVc1ZVRkJWU3hsUVVGbExFVkJRVVU3VVVGRGNFTXNTVUZCU1N4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExEUkNRVUUwUWl4RlFVRkZMRU5CUVVNN1VVRkRlRVFzU1VGQlNTeFpRVUZaTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzWlVGQlpTeEpRVUZKTEVWQlFVVXNRMEZCUXl4RFFVRkRPMUZCUTNaRUxFbEJRVWtzUTBGQlF5eFJRVUZSTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WlFVRlpMRVZCUVVVc1lVRkJZU3hEUVVGRExFTkJRVU1zUTBGQlF6dFJRVU53UlN4SlFVRkpMRU5CUVVNc1pVRkJaU3hIUVVGSExHVkJRV1VzUTBGQlF6dEJRVU12UXl4TFFVRkxPenRKUVVWRUxFZEJRVWNzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlN4TFFVRkxMRVZCUVVVN1VVRkRka0lzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU03VVVGRE0wSXNTVUZCU1N4RFFVRkRMRWxCUVVrc1JVRkJSU3hEUVVGRE8wRkJRM0JDTEV0QlFVczdPMGxCUlVRc1IwRkJSeXhGUVVGRkxGVkJRVlVzUjBGQlJ5eEZRVUZGTzFGQlEyaENMRTlCUVU4c1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTnNReXhMUVVGTE96dEpRVVZFTEVsQlFVa3NSVUZCUlN4WlFVRlpPMUZCUTJRc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eHBRa0ZCYVVJc1JVRkJSU3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJReTlGTEV0QlFVczdPMGxCUlVRc1lVRkJZU3hGUVVGRkxGbEJRVms3VVVGRGRrSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1NVRkJTU3hEUVVGRExHVkJRV1VzUTBGQlF6dFJRVU53UXl4SlFVRkpMRkZCUVZFc1JVRkJSVHRaUVVOV0xFbEJRVWtzUTBGQlF5eFJRVUZSTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzVVVGQlVTeERRVUZETEVOQlFVTTdXVUZEZGtNc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETzFOQlEyWTdTMEZEU2p0QlFVTk1MRU5CUVVNc1EwRkJRenM3UVVGRlJpeE5RVUZOTEVOQlFVTXNUMEZCVHl4SFFVRkhMRkZCUVZFaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SjJZWElnWHlBOUlISmxjWFZwY21Vb0p5NHZkWFJwYkhNbktUdGNiblpoY2lCc2IyTmhiRjl6ZEc5eVlXZGxYMnRsZVNBOUlDZDFkRzFsTFhObGRIUnBibWR6Snp0Y2JseHVablZ1WTNScGIyNGdVMlYwZEdsdVozTWdLR1JsWm1GMWJIUlRaWFIwYVc1bmN5a2dlMXh1SUNBZ0lIUm9hWE11YzJWMFJHVm1ZWFZzZEhNb1pHVm1ZWFZzZEZObGRIUnBibWR6SUh4OElIdDlLVHRjYm4xY2JseHVVMlYwZEdsdVozTXVjSEp2ZEc5MGVYQmxJRDBnZTF4dUlDQWdJSEpsWVdSVFpYUjBhVzVuYzBaeWIyMU1iMk5oYkZOMGIzSmhaMlU2SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhObGRIUnBibWR6VTNSeWFXNW5JRDBnYkc5allXeFRkRzl5WVdkbExtZGxkRWwwWlcwb2JHOWpZV3hmYzNSdmNtRm5aVjlyWlhrcE8xeHVJQ0FnSUNBZ0lDQjJZWElnYzJWMGRHbHVaM01nUFNCN2ZUdGNiaUFnSUNBZ0lDQWdhV1lnS0hObGRIUnBibWR6VTNSeWFXNW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpaWFIwYVc1bmN5QTlJRXBUVDA0dWNHRnljMlVvYzJWMGRHbHVaM05UZEhKcGJtY3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6WlhSMGFXNW5jenRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMlYwUkdWbVlYVnNkSE02SUdaMWJtTjBhVzl1SUNoa1pXWmhkV3gwVTJWMGRHbHVaM01wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3h2WTJGc1UyVjBkR2x1WjNNZ1BTQjBhR2x6TG5KbFlXUlRaWFIwYVc1bmMwWnliMjFNYjJOaGJGTjBiM0poWjJVb0tUdGNiaUFnSUNBZ0lDQWdkbUZ5SUdSbFptRjFiSFJ6UTI5d2VTQTlJRjh1WlhoMFpXNWtLSHQ5TENCa1pXWmhkV3gwVTJWMGRHbHVaM01nZkh3Z2UzMHBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkSFJwYm1keklEMGdYeTVsZUhSbGJtUW9lMzBzSUY4dVpYaDBaVzVrS0dSbFptRjFiSFJ6UTI5d2VTd2diRzlqWVd4VFpYUjBhVzVuY3lrcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG1SbFptRjFiSFJUWlhSMGFXNW5jeUE5SUdSbFptRjFiSFJUWlhSMGFXNW5jenRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMlYwT2lCbWRXNWpkR2x2YmlBb2EyVjVMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkSFJwYm1kelcydGxlVjBnUFNCMllXeDFaVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpZWFpsS0NrN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUdkbGREb2dablZ1WTNScGIyNGdLR3RsZVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTV6WlhSMGFXNW5jMXRyWlhsZE8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCellYWmxPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lHeHZZMkZzVTNSdmNtRm5aUzV6WlhSSmRHVnRLR3h2WTJGc1gzTjBiM0poWjJWZmEyVjVMQ0JLVTA5T0xuTjBjbWx1WjJsbWVTaDBhR2x6TG5ObGRIUnBibWR6S1NrN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhKbGMyVjBSR1ZtWVhWc2RITTZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1JsWm1GMWJIUnpJRDBnZEdocGN5NWtaV1poZFd4MFUyVjBkR2x1WjNNN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hrWldaaGRXeDBjeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUjBhVzVuY3lBOUlGOHVaWGgwWlc1a0tIdDlMQ0JrWldaaGRXeDBjeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5OaGRtVW9LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4wN1hHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdVMlYwZEdsdVozTTdJbDE5IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBTaW11bGF0ZSA9IHtcbiAgICBldmVudDogZnVuY3Rpb24oZWxlbWVudCwgZXZlbnROYW1lLCBvcHRpb25zKXtcbiAgICAgICAgdmFyIGV2dDtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50KSB7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkhUTUxFdmVudHNcIik7XG4gICAgICAgICAgICBldnQuaW5pdEV2ZW50KGV2ZW50TmFtZSwgZXZlbnROYW1lICE9ICdtb3VzZWVudGVyJyAmJiBldmVudE5hbWUgIT0gJ21vdXNlbGVhdmUnLCB0cnVlICk7XG4gICAgICAgICAgICBfLmV4dGVuZChldnQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICAgICAgICAgIGVsZW1lbnQuZmlyZUV2ZW50KCdvbicgKyBldmVudE5hbWUsZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAga2V5RXZlbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIG9wdGlvbnMpe1xuICAgICAgICB2YXIgZXZ0LFxuICAgICAgICAgICAgZSA9IHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlLCB2aWV3OiB3aW5kb3csXG4gICAgICAgICAgICAgICAgY3RybEtleTogZmFsc2UsIGFsdEtleTogZmFsc2UsIHNoaWZ0S2V5OiBmYWxzZSwgbWV0YUtleTogZmFsc2UsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogMCwgY2hhckNvZGU6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIF8uZXh0ZW5kKGUsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpe1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdLZXlFdmVudHMnKTtcbiAgICAgICAgICAgICAgICBldnQuaW5pdEtleUV2ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSwgZS52aWV3LFxuICAgICAgICAgICAgZS5jdHJsS2V5LCBlLmFsdEtleSwgZS5zaGlmdEtleSwgZS5tZXRhS2V5LFxuICAgICAgICAgICAgZS5rZXlDb2RlLCBlLmNoYXJDb2RlKTtcbiAgICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50c1wiKTtcbiAgICAgICAgZXZ0LmluaXRFdmVudCh0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSk7XG4gICAgICAgIF8uZXh0ZW5kKGV2dCwge1xuICAgICAgICAgICAgdmlldzogZS52aWV3LFxuICAgICAgICAgIGN0cmxLZXk6IGUuY3RybEtleSwgYWx0S2V5OiBlLmFsdEtleSxcbiAgICAgICAgICBzaGlmdEtleTogZS5zaGlmdEtleSwgbWV0YUtleTogZS5tZXRhS2V5LFxuICAgICAgICAgIGtleUNvZGU6IGUua2V5Q29kZSwgY2hhckNvZGU6IGUuY2hhckNvZGVcbiAgICAgICAgfSk7XG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5TaW11bGF0ZS5rZXlwcmVzcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5cHJlc3MnLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleWRvd24gPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleWRvd24nLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleXVwID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXl1cCcsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxudmFyIGV2ZW50cyA9IFtcbiAgICAnY2xpY2snLFxuICAgICdmb2N1cycsXG4gICAgJ2JsdXInLFxuICAgICdkYmxjbGljaycsXG4gICAgJ2lucHV0JyxcbiAgICAnY2hhbmdlJyxcbiAgICAnbW91c2Vkb3duJyxcbiAgICAnbW91c2Vtb3ZlJyxcbiAgICAnbW91c2VvdXQnLFxuICAgICdtb3VzZW92ZXInLFxuICAgICdtb3VzZXVwJyxcbiAgICAnbW91c2VlbnRlcicsXG4gICAgJ21vdXNlbGVhdmUnLFxuICAgICdyZXNpemUnLFxuICAgICdzY3JvbGwnLFxuICAgICdzZWxlY3QnLFxuICAgICdzdWJtaXQnLFxuICAgICdsb2FkJyxcbiAgICAndW5sb2FkJ1xuXTtcblxuZm9yICh2YXIgaSA9IGV2ZW50cy5sZW5ndGg7IGktLTspe1xuICAgIHZhciBldmVudCA9IGV2ZW50c1tpXTtcbiAgICBTaW11bGF0ZVtldmVudF0gPSAoZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgICAgICAgICAgdGhpcy5ldmVudChlbGVtZW50LCBldnQsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgIH0oZXZlbnQpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaW11bGF0ZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWRISmhibk5tYjNKdFpXUXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOUVaWFpsYkc5d1pYSXZZWFJ6YVdRdlVISnZhbVZqZEhNdmRYUnRaUzkxZEcxbEwzTnlZeTlxY3k5emFXMTFiR0YwWlM1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN08wRkJSVE5DTEVsQlFVa3NVVUZCVVN4SFFVRkhPMGxCUTFnc1MwRkJTeXhGUVVGRkxGTkJRVk1zVDBGQlR5eEZRVUZGTEZOQlFWTXNSVUZCUlN4UFFVRlBMRU5CUVVNN1VVRkRlRU1zU1VGQlNTeEhRVUZITEVOQlFVTTdVVUZEVWl4SlFVRkpMRkZCUVZFc1EwRkJReXhYUVVGWExFVkJRVVU3V1VGRGRFSXNSMEZCUnl4SFFVRkhMRkZCUVZFc1EwRkJReXhYUVVGWExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdXVUZEZWtNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eFRRVUZUTEVWQlFVVXNVMEZCVXl4SlFVRkpMRmxCUVZrc1NVRkJTU3hUUVVGVExFbEJRVWtzV1VGQldTeEZRVUZGTEVsQlFVa3NSVUZCUlN4RFFVRkRPMWxCUTNoR0xFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8xbEJRM1pDTEU5QlFVOHNRMEZCUXl4aFFVRmhMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03VTBGRE9VSXNTVUZCU1R0WlFVTkVMRWRCUVVjc1IwRkJSeXhSUVVGUkxFTkJRVU1zYVVKQlFXbENMRVZCUVVVc1EwRkJRenRaUVVOdVF5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1IwRkJSeXhUUVVGVExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdVMEZETTBNN1MwRkRTanRKUVVORUxGRkJRVkVzUlVGQlJTeFRRVUZUTEU5QlFVOHNSVUZCUlN4SlFVRkpMRVZCUVVVc1QwRkJUeXhEUVVGRE8xRkJRM1JETEVsQlFVa3NSMEZCUnp0WlFVTklMRU5CUVVNc1IwRkJSenRuUWtGRFFTeFBRVUZQTEVWQlFVVXNTVUZCU1N4RlFVRkZMRlZCUVZVc1JVRkJSU3hKUVVGSkxFVkJRVVVzU1VGQlNTeEZRVUZGTEUxQlFVMDdaMEpCUXpkRExFOUJRVThzUlVGQlJTeExRVUZMTEVWQlFVVXNUVUZCVFN4RlFVRkZMRXRCUVVzc1JVRkJSU3hSUVVGUkxFVkJRVVVzUzBGQlN5eEZRVUZGTEU5QlFVOHNSVUZCUlN4TFFVRkxPMmRDUVVNNVJDeFBRVUZQTEVWQlFVVXNRMEZCUXl4RlFVRkZMRkZCUVZFc1JVRkJSU3hEUVVGRE8yRkJRekZDTEVOQlFVTTdVVUZEVGl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0UlFVTnlRaXhKUVVGSkxGRkJRVkVzUTBGQlF5eFhRVUZYTEVOQlFVTTdXVUZEY2tJc1IwRkJSenRuUWtGRFF5eEhRVUZITEVkQlFVY3NVVUZCVVN4RFFVRkRMRmRCUVZjc1EwRkJReXhYUVVGWExFTkJRVU1zUTBGQlF6dG5Ra0ZEZUVNc1IwRkJSeXhEUVVGRExGbEJRVms3YjBKQlExb3NTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEZWQlFWVXNSVUZCUlN4RFFVRkRMRU5CUVVNc1NVRkJTVHRaUVVNM1F5eERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRXNSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUenRaUVVNeFF5eERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6dFZRVU42UWl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlF6VkNMRTFCUVUwc1IwRkJSeXhEUVVGRE8xbEJRMUFzUjBGQlJ5eEhRVUZITEZGQlFWRXNRMEZCUXl4WFFVRlhMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03VVVGRGVrTXNSMEZCUnl4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU03VVVGRE4wTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhIUVVGSExFVkJRVVU3V1VGRFZpeEpRVUZKTEVWQlFVVXNRMEZCUXl4RFFVRkRMRWxCUVVrN1ZVRkRaQ3hQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVc1EwRkJReXhEUVVGRExFMUJRVTA3VlVGRGNFTXNVVUZCVVN4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFVkJRVVVzVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBPMVZCUTNoRExFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRkZCUVZFc1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVUdFRRVU42UXl4RFFVRkRMRU5CUVVNN1VVRkRTQ3hQUVVGUExFTkJRVU1zWVVGQllTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUXpGQ08xTkJRMEU3UzBGRFNqdEJRVU5NTEVOQlFVTXNRMEZCUXpzN1FVRkZSaXhSUVVGUkxFTkJRVU1zVVVGQlVTeEhRVUZITEZOQlFWTXNUMEZCVHl4RlFVRkZMRWRCUVVjc1EwRkJRenRKUVVOMFF5eEpRVUZKTEZGQlFWRXNSMEZCUnl4SFFVRkhMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBsQlEycERMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zVDBGQlR5eEZRVUZGTEZWQlFWVXNSVUZCUlR0UlFVTXZRaXhQUVVGUExFVkJRVVVzVVVGQlVUdFJRVU5xUWl4UlFVRlJMRVZCUVVVc1VVRkJVVHRMUVVOeVFpeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVVVGQlVTeERRVUZETEU5QlFVOHNSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSU3hIUVVGSExFTkJRVU03U1VGRGNrTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1IwRkJSeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0SlFVTnFReXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFVOHNSVUZCUlN4VFFVRlRMRVZCUVVVN1VVRkRPVUlzVDBGQlR5eEZRVUZGTEZGQlFWRTdVVUZEYWtJc1VVRkJVU3hGUVVGRkxGRkJRVkU3UzBGRGNrSXNRMEZCUXl4RFFVRkRPMEZCUTFBc1EwRkJReXhEUVVGRE96dEJRVVZHTEZGQlFWRXNRMEZCUXl4TFFVRkxMRWRCUVVjc1UwRkJVeXhQUVVGUExFVkJRVVVzUjBGQlJ5eERRVUZETzBsQlEyNURMRWxCUVVrc1VVRkJVU3hIUVVGSExFZEJRVWNzUTBGQlF5eFZRVUZWTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1NVRkRha01zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4UFFVRlBMRVZCUVVVc1QwRkJUeXhGUVVGRk8xRkJRelZDTEU5QlFVOHNSVUZCUlN4UlFVRlJPMUZCUTJwQ0xGRkJRVkVzUlVGQlJTeFJRVUZSTzB0QlEzSkNMRU5CUVVNc1EwRkJRenRCUVVOUUxFTkJRVU1zUTBGQlF6czdRVUZGUml4SlFVRkpMRTFCUVUwc1IwRkJSenRKUVVOVUxFOUJRVTg3U1VGRFVDeFBRVUZQTzBsQlExQXNUVUZCVFR0SlFVTk9MRlZCUVZVN1NVRkRWaXhQUVVGUE8wbEJRMUFzVVVGQlVUdEpRVU5TTEZkQlFWYzdTVUZEV0N4WFFVRlhPMGxCUTFnc1ZVRkJWVHRKUVVOV0xGZEJRVmM3U1VGRFdDeFRRVUZUTzBsQlExUXNXVUZCV1R0SlFVTmFMRmxCUVZrN1NVRkRXaXhSUVVGUk8wbEJRMUlzVVVGQlVUdEpRVU5TTEZGQlFWRTdTVUZEVWl4UlFVRlJPMGxCUTFJc1RVRkJUVHRKUVVOT0xGRkJRVkU3UVVGRFdpeERRVUZETEVOQlFVTTdPMEZCUlVZc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eE5RVUZOTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8wbEJRemRDTEVsQlFVa3NTMEZCU3l4SFFVRkhMRTFCUVUwc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEpRVU4wUWl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFbEJRVWtzVTBGQlV5eEhRVUZITEVOQlFVTTdVVUZETlVJc1QwRkJUeXhUUVVGVExFOUJRVThzUlVGQlJTeFBRVUZQTEVOQlFVTTdXVUZETjBJc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eFBRVUZQTEVWQlFVVXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8xTkJRM0pETEVOQlFVTTdTMEZEVEN4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU03UVVGRFpDeERRVUZET3p0QlFVVkVMRTFCUVUwc1EwRkJReXhQUVVGUExFZEJRVWNzVVVGQlVTSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCZklEMGdjbVZ4ZFdseVpTZ25MaTkxZEdsc2N5Y3BPMXh1WEc1MllYSWdVMmx0ZFd4aGRHVWdQU0I3WEc0Z0lDQWdaWFpsYm5RNklHWjFibU4wYVc5dUtHVnNaVzFsYm5Rc0lHVjJaVzUwVG1GdFpTd2diM0IwYVc5dWN5bDdYRzRnSUNBZ0lDQWdJSFpoY2lCbGRuUTdYRzRnSUNBZ0lDQWdJR2xtSUNoa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pYWjBJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSWFpsYm5Rb1hDSklWRTFNUlhabGJuUnpYQ0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdaWFowTG1sdWFYUkZkbVZ1ZENobGRtVnVkRTVoYldVc0lHVjJaVzUwVG1GdFpTQWhQU0FuYlc5MWMyVmxiblJsY2ljZ0ppWWdaWFpsYm5ST1lXMWxJQ0U5SUNkdGIzVnpaV3hsWVhabEp5d2dkSEoxWlNBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWHk1bGVIUmxibVFvWlhaMExDQnZjSFJwYjI1ektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWc1pXMWxiblF1WkdsemNHRjBZMmhGZG1WdWRDaGxkblFwTzF4dUlDQWdJQ0FnSUNCOVpXeHpaWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVYyWlc1MFQySnFaV04wS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsYkdWdFpXNTBMbVpwY21WRmRtVnVkQ2duYjI0bklDc2daWFpsYm5ST1lXMWxMR1YyZENrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUd0bGVVVjJaVzUwT2lCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCMGVYQmxMQ0J2Y0hScGIyNXpLWHRjYmlBZ0lDQWdJQ0FnZG1GeUlHVjJkQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHVWdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5WaVlteGxjem9nZEhKMVpTd2dZMkZ1WTJWc1lXSnNaVG9nZEhKMVpTd2dkbWxsZHpvZ2QybHVaRzkzTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOMGNteExaWGs2SUdaaGJITmxMQ0JoYkhSTFpYazZJR1poYkhObExDQnphR2xtZEV0bGVUb2dabUZzYzJVc0lHMWxkR0ZMWlhrNklHWmhiSE5sTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd0bGVVTnZaR1U2SURBc0lHTm9ZWEpEYjJSbE9pQXdYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQmZMbVY0ZEdWdVpDaGxMQ0J2Y0hScGIyNXpLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWMlpXNTBLWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnllWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsZG5RZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmRtVnVkQ2duUzJWNVJYWmxiblJ6SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYWjBMbWx1YVhSTFpYbEZkbVZ1ZENoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSGx3WlN3Z1pTNWlkV0ppYkdWekxDQmxMbU5oYm1ObGJHRmliR1VzSUdVdWRtbGxkeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lHVXVZM1J5YkV0bGVTd2daUzVoYkhSTFpYa3NJR1V1YzJocFpuUkxaWGtzSUdVdWJXVjBZVXRsZVN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR1V1YTJWNVEyOWtaU3dnWlM1amFHRnlRMjlrWlNrN1hHNGdJQ0FnSUNBZ0lDQWdaV3hsYldWdWRDNWthWE53WVhSamFFVjJaVzUwS0dWMmRDazdYRzRnSUNBZ0lDQWdJSDFqWVhSamFDaGxjbklwZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaWFowSUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUlhabGJuUW9YQ0pGZG1WdWRITmNJaWs3WEc0Z0lDQWdJQ0FnSUdWMmRDNXBibWwwUlhabGJuUW9kSGx3WlN3Z1pTNWlkV0ppYkdWekxDQmxMbU5oYm1ObGJHRmliR1VwTzF4dUlDQWdJQ0FnSUNCZkxtVjRkR1Z1WkNobGRuUXNJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWnBaWGM2SUdVdWRtbGxkeXhjYmlBZ0lDQWdJQ0FnSUNCamRISnNTMlY1T2lCbExtTjBjbXhMWlhrc0lHRnNkRXRsZVRvZ1pTNWhiSFJMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdjMmhwWm5STFpYazZJR1V1YzJocFpuUkxaWGtzSUcxbGRHRkxaWGs2SUdVdWJXVjBZVXRsZVN4Y2JpQWdJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmxMbXRsZVVOdlpHVXNJR05vWVhKRGIyUmxPaUJsTG1Ob1lYSkRiMlJsWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQmxiR1Z0Wlc1MExtUnBjM0JoZEdOb1JYWmxiblFvWlhaMEtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlR0Y2JseHVVMmx0ZFd4aGRHVXVhMlY1Y0hKbGMzTWdQU0JtZFc1amRHbHZiaWhsYkdWdFpXNTBMQ0JqYUhJcGUxeHVJQ0FnSUhaaGNpQmphR0Z5UTI5a1pTQTlJR05vY2k1amFHRnlRMjlrWlVGMEtEQXBPMXh1SUNBZ0lIUm9hWE11YTJWNVJYWmxiblFvWld4bGJXVnVkQ3dnSjJ0bGVYQnlaWE56Snl3Z2UxeHVJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmphR0Z5UTI5a1pTeGNiaUFnSUNBZ0lDQWdZMmhoY2tOdlpHVTZJR05vWVhKRGIyUmxYRzRnSUNBZ2ZTazdYRzU5TzF4dVhHNVRhVzExYkdGMFpTNXJaWGxrYjNkdUlEMGdablZ1WTNScGIyNG9aV3hsYldWdWRDd2dZMmh5S1h0Y2JpQWdJQ0IyWVhJZ1kyaGhja052WkdVZ1BTQmphSEl1WTJoaGNrTnZaR1ZCZENnd0tUdGNiaUFnSUNCMGFHbHpMbXRsZVVWMlpXNTBLR1ZzWlcxbGJuUXNJQ2RyWlhsa2IzZHVKeXdnZTF4dUlDQWdJQ0FnSUNCclpYbERiMlJsT2lCamFHRnlRMjlrWlN4Y2JpQWdJQ0FnSUNBZ1kyaGhja052WkdVNklHTm9ZWEpEYjJSbFhHNGdJQ0FnZlNrN1hHNTlPMXh1WEc1VGFXMTFiR0YwWlM1clpYbDFjQ0E5SUdaMWJtTjBhVzl1S0dWc1pXMWxiblFzSUdOb2NpbDdYRzRnSUNBZ2RtRnlJR05vWVhKRGIyUmxJRDBnWTJoeUxtTm9ZWEpEYjJSbFFYUW9NQ2s3WEc0Z0lDQWdkR2hwY3k1clpYbEZkbVZ1ZENobGJHVnRaVzUwTENBbmEyVjVkWEFuTENCN1hHNGdJQ0FnSUNBZ0lHdGxlVU52WkdVNklHTm9ZWEpEYjJSbExGeHVJQ0FnSUNBZ0lDQmphR0Z5UTI5a1pUb2dZMmhoY2tOdlpHVmNiaUFnSUNCOUtUdGNibjA3WEc1Y2JuWmhjaUJsZG1WdWRITWdQU0JiWEc0Z0lDQWdKMk5zYVdOckp5eGNiaUFnSUNBblptOWpkWE1uTEZ4dUlDQWdJQ2RpYkhWeUp5eGNiaUFnSUNBblpHSnNZMnhwWTJzbkxGeHVJQ0FnSUNkcGJuQjFkQ2NzWEc0Z0lDQWdKMk5vWVc1blpTY3NYRzRnSUNBZ0oyMXZkWE5sWkc5M2JpY3NYRzRnSUNBZ0oyMXZkWE5sYlc5MlpTY3NYRzRnSUNBZ0oyMXZkWE5sYjNWMEp5eGNiaUFnSUNBbmJXOTFjMlZ2ZG1WeUp5eGNiaUFnSUNBbmJXOTFjMlYxY0Njc1hHNGdJQ0FnSjIxdmRYTmxaVzUwWlhJbkxGeHVJQ0FnSUNkdGIzVnpaV3hsWVhabEp5eGNiaUFnSUNBbmNtVnphWHBsSnl4Y2JpQWdJQ0FuYzJOeWIyeHNKeXhjYmlBZ0lDQW5jMlZzWldOMEp5eGNiaUFnSUNBbmMzVmliV2wwSnl4Y2JpQWdJQ0FuYkc5aFpDY3NYRzRnSUNBZ0ozVnViRzloWkNkY2JsMDdYRzVjYm1admNpQW9kbUZ5SUdrZ1BTQmxkbVZ1ZEhNdWJHVnVaM1JvT3lCcExTMDdLWHRjYmlBZ0lDQjJZWElnWlhabGJuUWdQU0JsZG1WdWRITmJhVjA3WEc0Z0lDQWdVMmx0ZFd4aGRHVmJaWFpsYm5SZElEMGdLR1oxYm1OMGFXOXVLR1YyZENsN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCdmNIUnBiMjV6S1h0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdVpYWmxiblFvWld4bGJXVnVkQ3dnWlhaMExDQnZjSFJwYjI1ektUdGNiaUFnSUNBZ0lDQWdmVHRjYmlBZ0lDQjlLR1YyWlc1MEtTazdYRzU5WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1UybHRkV3hoZEdVN0lsMTkiLCIvKipcbiAqIFBvbHlmaWxsc1xuICovXG5cbi8qKlxuICogVGhpcyBpcyBjb3BpZWQgZnJvbSBSZWFjSlMncyBvd24gcG9seXBmaWxsIHRvIHJ1biB0ZXN0cyB3aXRoIHBoYW50b21qcy5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC9ibG9iLzNkYzEwNzQ5MDgwYTQ2MGU0OGJlZTQ2ZDc2OTc2M2VjNzE5MWFjNzYvc3JjL3Rlc3QvcGhhbnRvbWpzLXNoaW1zLmpzXG4gKi9cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBBcCA9IEFycmF5LnByb3RvdHlwZTtcbiAgICB2YXIgc2xpY2UgPSBBcC5zbGljZTtcbiAgICB2YXIgRnAgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgICBpZiAoIUZwLmJpbmQpIHtcbiAgICAgIC8vIFBoYW50b21KUyBkb2Vzbid0IHN1cHBvcnQgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgbmF0aXZlbHksIHNvXG4gICAgICAvLyBwb2x5ZmlsbCBpdCB3aGVuZXZlciB0aGlzIG1vZHVsZSBpcyByZXF1aXJlZC5cbiAgICAgIEZwLmJpbmQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgIHZhciBmdW5jID0gdGhpcztcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICAgICAgZnVuY3Rpb24gYm91bmQoKSB7XG4gICAgICAgICAgdmFyIGludm9rZWRBc0NvbnN0cnVjdG9yID0gZnVuYy5wcm90b3R5cGUgJiYgKHRoaXMgaW5zdGFuY2VvZiBmdW5jKTtcbiAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShcbiAgICAgICAgICAgIC8vIElnbm9yZSB0aGUgY29udGV4dCBwYXJhbWV0ZXIgd2hlbiBpbnZva2luZyB0aGUgYm91bmQgZnVuY3Rpb25cbiAgICAgICAgICAgIC8vIGFzIGEgY29uc3RydWN0b3IuIE5vdGUgdGhhdCB0aGlzIGluY2x1ZGVzIG5vdCBvbmx5IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAvLyBpbnZvY2F0aW9ucyB1c2luZyB0aGUgbmV3IGtleXdvcmQgYnV0IGFsc28gY2FsbHMgdG8gYmFzZSBjbGFzc1xuICAgICAgICAgICAgLy8gY29uc3RydWN0b3JzIHN1Y2ggYXMgQmFzZUNsYXNzLmNhbGwodGhpcywgLi4uKSBvciBzdXBlciguLi4pLlxuICAgICAgICAgICAgIWludm9rZWRBc0NvbnN0cnVjdG9yICYmIGNvbnRleHQgfHwgdGhpcyxcbiAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGJvdW5kIGZ1bmN0aW9uIG11c3Qgc2hhcmUgdGhlIC5wcm90b3R5cGUgb2YgdGhlIHVuYm91bmRcbiAgICAgICAgLy8gZnVuY3Rpb24gc28gdGhhdCBhbnkgb2JqZWN0IGNyZWF0ZWQgYnkgb25lIGNvbnN0cnVjdG9yIHdpbGwgY291bnRcbiAgICAgICAgLy8gYXMgYW4gaW5zdGFuY2Ugb2YgYm90aCBjb25zdHJ1Y3RvcnMuXG4gICAgICAgIGJvdW5kLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuXG4gICAgICAgIHJldHVybiBib3VuZDtcbiAgICAgIH07XG4gICAgfVxuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKGRzdCwgc3JjKXtcbiAgICAgICAgaWYgKHNyYykge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNyYykge1xuICAgICAgICAgICAgICAgIGlmIChzcmMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZHN0O1xuICAgIH0sXG5cbiAgICBtYXA6IGZ1bmN0aW9uKG9iaiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGggPj4+IDA7XG4gICAgICAgIHZhciBuZXdBcnJheSA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgICB2YXIga2V5ID0gMDtcbiAgICAgICAgaWYgKCF0aGlzQXJnKSB7XG4gICAgICAgICAgICB0aGlzQXJnID0gb2JqO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChrZXkgPCBsZW4pIHtcbiAgICAgICAgICAgIG5ld0FycmF5W2tleV0gPSBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXNba2V5XSwga2V5LCBvYmopO1xuICAgICAgICAgICAga2V5Kys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xuICAgIH1cblxufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWRISmhibk5tYjNKdFpXUXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOUVaWFpsYkc5d1pYSXZZWFJ6YVdRdlVISnZhbVZqZEhNdmRYUnRaUzkxZEcxbEwzTnlZeTlxY3k5MWRHbHNjeTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFUczdRVUZGUVN4SFFVRkhPenRCUVVWSU8wRkJRMEU3TzBkQlJVYzdRVUZEU0N4RFFVRkRMRmRCUVZjN08wbEJSVklzU1VGQlNTeEZRVUZGTEVkQlFVY3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJRenRKUVVONlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4RlFVRkZMRU5CUVVNc1MwRkJTeXhEUVVGRE8wRkJRM3BDTEVsQlFVa3NTVUZCU1N4RlFVRkZMRWRCUVVjc1VVRkJVU3hEUVVGRExGTkJRVk1zUTBGQlF6czdRVUZGYUVNc1NVRkJTU3hKUVVGSkxFTkJRVU1zUlVGQlJTeERRVUZETEVsQlFVa3NSVUZCUlR0QlFVTnNRanM3VFVGRlRTeEZRVUZGTEVOQlFVTXNTVUZCU1N4SFFVRkhMRk5CUVZNc1QwRkJUeXhGUVVGRk8xRkJRekZDTEVsQlFVa3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJRenRCUVVONFFpeFJRVUZSTEVsQlFVa3NTVUZCU1N4SFFVRkhMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eEZRVUZGTEVOQlFVTXNRMEZCUXl4RFFVRkRPenRSUVVWd1F5eFRRVUZUTEV0QlFVc3NSMEZCUnp0VlFVTm1MRWxCUVVrc2IwSkJRVzlDTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1MwRkJTeXhKUVVGSkxGbEJRVmtzU1VGQlNTeERRVUZETEVOQlFVTTdRVUZET1VVc1ZVRkJWU3hQUVVGUExFbEJRVWtzUTBGQlF5eExRVUZMTzBGQlF6TkNPMEZCUTBFN1FVRkRRVHM3V1VGRldTeERRVUZETEc5Q1FVRnZRaXhKUVVGSkxFOUJRVThzU1VGQlNTeEpRVUZKTzFsQlEzaERMRWxCUVVrc1EwRkJReXhOUVVGTkxFTkJRVU1zUzBGQlN5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRYUVVOdVF5eERRVUZETzBGQlExb3NVMEZCVXp0QlFVTlVPMEZCUTBFN1FVRkRRVHM3UVVGRlFTeFJRVUZSTEV0QlFVc3NRMEZCUXl4VFFVRlRMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF6czdVVUZGYWtNc1QwRkJUeXhMUVVGTExFTkJRVU03VDBGRFpDeERRVUZETzBGQlExSXNTMEZCU3pzN1FVRkZUQ3hEUVVGRExFZEJRVWNzUTBGQlF6czdRVUZGVEN4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSE96dEpRVVZpTEUxQlFVMHNSVUZCUlN4VFFVRlRMRTFCUVUwc1EwRkJReXhIUVVGSExFVkJRVVVzUjBGQlJ5eERRVUZETzFGQlF6ZENMRWxCUVVrc1IwRkJSeXhGUVVGRk8xbEJRMHdzUzBGQlN5eEpRVUZKTEVkQlFVY3NTVUZCU1N4SFFVRkhMRVZCUVVVN1owSkJRMnBDTEVsQlFVa3NSMEZCUnl4RFFVRkRMR05CUVdNc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJUdHZRa0ZEZWtJc1IwRkJSeXhEUVVGRExFZEJRVWNzUTBGQlF5eEhRVUZITEVkQlFVY3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRwUWtGRGRrSTdZVUZEU2p0VFFVTktPMUZCUTBRc1QwRkJUeXhIUVVGSExFTkJRVU03UVVGRGJrSXNTMEZCU3pzN1NVRkZSQ3hIUVVGSExFVkJRVVVzVTBGQlV5eEhRVUZITEVWQlFVVXNVVUZCVVN4RlFVRkZMRTlCUVU4c1JVRkJSVHRSUVVOc1F5eEpRVUZKTEVkQlFVY3NSMEZCUnl4SFFVRkhMRU5CUVVNc1RVRkJUU3hMUVVGTExFTkJRVU1zUTBGQlF6dFJRVU16UWl4SlFVRkpMRkZCUVZFc1IwRkJSeXhKUVVGSkxFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0UlFVTTVRaXhKUVVGSkxFZEJRVWNzUjBGQlJ5eERRVUZETEVOQlFVTTdVVUZEV2l4SlFVRkpMRU5CUVVNc1QwRkJUeXhGUVVGRk8xbEJRMVlzVDBGQlR5eEhRVUZITEVkQlFVY3NRMEZCUXp0VFFVTnFRanRSUVVORUxFOUJRVThzUjBGQlJ5eEhRVUZITEVkQlFVY3NSVUZCUlR0WlFVTmtMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zUjBGQlJ5eFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE8xbEJRelZFTEVkQlFVY3NSVUZCUlN4RFFVRkRPMU5CUTFRN1VVRkRSQ3hQUVVGUExGRkJRVkVzUTBGQlF6dEJRVU40UWl4TFFVRkxPenREUVVWS0lpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lMeW9xWEc0Z0tpQlFiMng1Wm1sc2JITmNiaUFxTDF4dVhHNHZLaXBjYmlBcUlGUm9hWE1nYVhNZ1kyOXdhV1ZrSUdaeWIyMGdVbVZoWTBwVEozTWdiM2R1SUhCdmJIbHdabWxzYkNCMGJ5QnlkVzRnZEdWemRITWdkMmwwYUNCd2FHRnVkRzl0YW5NdVhHNGdLaUJvZEhSd2N6b3ZMMmRwZEdoMVlpNWpiMjB2Wm1GalpXSnZiMnN2Y21WaFkzUXZZbXh2WWk4elpHTXhNRGMwT1RBNE1HRTBOakJsTkRoaVpXVTBObVEzTmprM05qTmxZemN4T1RGaFl6YzJMM055WXk5MFpYTjBMM0JvWVc1MGIyMXFjeTF6YUdsdGN5NXFjMXh1SUNvdlhHNG9ablZ1WTNScGIyNG9LU0I3WEc1Y2JpQWdJQ0IyWVhJZ1FYQWdQU0JCY25KaGVTNXdjbTkwYjNSNWNHVTdYRzRnSUNBZ2RtRnlJSE5zYVdObElEMGdRWEF1YzJ4cFkyVTdYRzRnSUNBZ2RtRnlJRVp3SUQwZ1JuVnVZM1JwYjI0dWNISnZkRzkwZVhCbE8xeHVYRzRnSUNBZ2FXWWdLQ0ZHY0M1aWFXNWtLU0I3WEc0Z0lDQWdJQ0F2THlCUWFHRnVkRzl0U2xNZ1pHOWxjMjRuZENCemRYQndiM0owSUVaMWJtTjBhVzl1TG5CeWIzUnZkSGx3WlM1aWFXNWtJRzVoZEdsMlpXeDVMQ0J6YjF4dUlDQWdJQ0FnTHk4Z2NHOXNlV1pwYkd3Z2FYUWdkMmhsYm1WMlpYSWdkR2hwY3lCdGIyUjFiR1VnYVhNZ2NtVnhkV2x5WldRdVhHNGdJQ0FnSUNCR2NDNWlhVzVrSUQwZ1puVnVZM1JwYjI0b1kyOXVkR1Y0ZENrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnWm5WdVl5QTlJSFJvYVhNN1hHNGdJQ0FnSUNBZ0lIWmhjaUJoY21keklEMGdjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1zSURFcE8xeHVYRzRnSUNBZ0lDQWdJR1oxYm1OMGFXOXVJR0p2ZFc1a0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUE5SUdaMWJtTXVjSEp2ZEc5MGVYQmxJQ1ltSUNoMGFHbHpJR2x1YzNSaGJtTmxiMllnWm5WdVl5azdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYm1NdVlYQndiSGtvWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJKWjI1dmNtVWdkR2hsSUdOdmJuUmxlSFFnY0dGeVlXMWxkR1Z5SUhkb1pXNGdhVzUyYjJ0cGJtY2dkR2hsSUdKdmRXNWtJR1oxYm1OMGFXOXVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QmhjeUJoSUdOdmJuTjBjblZqZEc5eUxpQk9iM1JsSUhSb1lYUWdkR2hwY3lCcGJtTnNkV1JsY3lCdWIzUWdiMjVzZVNCamIyNXpkSEoxWTNSdmNseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2FXNTJiMk5oZEdsdmJuTWdkWE5wYm1jZ2RHaGxJRzVsZHlCclpYbDNiM0prSUdKMWRDQmhiSE52SUdOaGJHeHpJSFJ2SUdKaGMyVWdZMnhoYzNOY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUdOdmJuTjBjblZqZEc5eWN5QnpkV05vSUdGeklFSmhjMlZEYkdGemN5NWpZV3hzS0hSb2FYTXNJQzR1TGlrZ2IzSWdjM1Z3WlhJb0xpNHVLUzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDRnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUFtSmlCamIyNTBaWGgwSUh4OElIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ0lDQmhjbWR6TG1OdmJtTmhkQ2h6YkdsalpTNWpZV3hzS0dGeVozVnRaVzUwY3lrcFhHNGdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDOHZJRlJvWlNCaWIzVnVaQ0JtZFc1amRHbHZiaUJ0ZFhOMElITm9ZWEpsSUhSb1pTQXVjSEp2ZEc5MGVYQmxJRzltSUhSb1pTQjFibUp2ZFc1a1hHNGdJQ0FnSUNBZ0lDOHZJR1oxYm1OMGFXOXVJSE52SUhSb1lYUWdZVzU1SUc5aWFtVmpkQ0JqY21WaGRHVmtJR0o1SUc5dVpTQmpiMjV6ZEhKMVkzUnZjaUIzYVd4c0lHTnZkVzUwWEc0Z0lDQWdJQ0FnSUM4dklHRnpJR0Z1SUdsdWMzUmhibU5sSUc5bUlHSnZkR2dnWTI5dWMzUnlkV04wYjNKekxseHVJQ0FnSUNBZ0lDQmliM1Z1WkM1d2NtOTBiM1I1Y0dVZ1BTQm1kVzVqTG5CeWIzUnZkSGx3WlR0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1ltOTFibVE3WEc0Z0lDQWdJQ0I5TzF4dUlDQWdJSDFjYmx4dWZTa29LVHRjYmx4dWJXOWtkV3hsTG1WNGNHOXlkSE1nUFNCN1hHNWNiaUFnSUNCbGVIUmxibVE2SUdaMWJtTjBhVzl1SUdWNGRHVnVaQ2hrYzNRc0lITnlZeWw3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR3RsZVNCcGJpQnpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM0pqTG1oaGMwOTNibEJ5YjNCbGNuUjVLR3RsZVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkhOMFcydGxlVjBnUFNCemNtTmJhMlY1WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSemREdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JXRndPaUJtZFc1amRHbHZiaWh2WW1vc0lHTmhiR3hpWVdOckxDQjBhR2x6UVhKbktTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCc1pXNGdQU0J2WW1vdWJHVnVaM1JvSUQ0K1BpQXdPMXh1SUNBZ0lDQWdJQ0IyWVhJZ2JtVjNRWEp5WVhrZ1BTQnVaWGNnUVhKeVlYa29iR1Z1S1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3RsZVNBOUlEQTdYRzRnSUNBZ0lDQWdJR2xtSUNnaGRHaHBjMEZ5WnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGMwRnlaeUE5SUc5aWFqdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0IzYUdsc1pTQW9hMlY1SUR3Z2JHVnVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnVaWGRCY25KaGVWdHJaWGxkSUQwZ1kyRnNiR0poWTJzdVkyRnNiQ2gwYUdselFYSm5MQ0IwYUdselcydGxlVjBzSUd0bGVTd2diMkpxS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3RsZVNzck8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnVaWGRCY25KaGVUdGNiaUFnSUNCOVhHNWNibjA3SWwxOSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFByb21pc2UgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG52YXIgU2ltdWxhdGUgPSByZXF1aXJlKCcuL3NpbXVsYXRlJyk7XG52YXIgc2VsZWN0b3JGaW5kZXIgPSByZXF1aXJlKCcuL3NlbGVjdG9yRmluZGVyJyk7XG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG5cbi8vIHZhciBteUdlbmVyYXRvciA9IG5ldyBDc3NTZWxlY3RvckdlbmVyYXRvcigpO1xudmFyIGltcG9ydGFudFN0ZXBMZW5ndGggPSA1MDA7XG52YXIgc2F2ZUhhbmRsZXJzID0gW107XG52YXIgcmVwb3J0SGFuZGxlcnMgPSBbXTtcbnZhciBsb2FkSGFuZGxlcnMgPSBbXTtcbnZhciBzZXR0aW5nc0xvYWRIYW5kbGVycyA9IFtdO1xuXG5mdW5jdGlvbiBnZXRTY2VuYXJpbyhuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgaWYgKGxvYWRIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHV0bWUuc3RhdGU7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlLnNjZW5hcmlvcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5zY2VuYXJpb3NbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHN0YXRlLnNjZW5hcmlvc1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9hZEhhbmRsZXJzWzBdKG5hbWUsIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG52YXIgdmFsaWRhdGluZyA9IGZhbHNlO1xuXG52YXIgZXZlbnRzID0gW1xuICAgICdjbGljaycsXG4gICAgJ2ZvY3VzJyxcbiAgICAnYmx1cicsXG4gICAgJ2RibGNsaWNrJyxcbiAgICAvLyAnZHJhZycsXG4gICAgLy8gJ2RyYWdlbnRlcicsXG4gICAgLy8gJ2RyYWdsZWF2ZScsXG4gICAgLy8gJ2RyYWdvdmVyJyxcbiAgICAvLyAnZHJhZ3N0YXJ0JyxcbiAgICAvLyAnaW5wdXQnLFxuICAgICdtb3VzZWRvd24nLFxuICAgIC8vICdtb3VzZW1vdmUnLFxuICAgICdtb3VzZWVudGVyJyxcbiAgICAnbW91c2VsZWF2ZScsXG4gICAgJ21vdXNlb3V0JyxcbiAgICAnbW91c2VvdmVyJyxcbiAgICAnbW91c2V1cCcsXG4gICAgJ2NoYW5nZScsXG4gICAgLy8gJ3Jlc2l6ZScsXG4gICAgLy8gJ3Njcm9sbCdcbl07XG5cbmZ1bmN0aW9uIGdldFByZWNvbmRpdGlvbnMgKHNjZW5hcmlvKSB7XG4gICAgdmFyIHNldHVwID0gc2NlbmFyaW8uc2V0dXA7XG4gICAgdmFyIHNjZW5hcmlvcyA9IHNldHVwICYmIHNldHVwLnNjZW5hcmlvcztcbiAgICAvLyBUT0RPOiBCcmVhayBvdXQgaW50byBoZWxwZXJcbiAgICBpZiAoc2NlbmFyaW9zKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChfLm1hcChzY2VuYXJpb3MsIGZ1bmN0aW9uIChzY2VuYXJpb05hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTY2VuYXJpbyhzY2VuYXJpb05hbWUpLnRoZW4oZnVuY3Rpb24gKG90aGVyU2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgb3RoZXJTY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3RoZXJTY2VuYXJpbykpO1xuICAgICAgICAgICAgICByZXR1cm4gb3RoZXJTY2VuYXJpby5zdGVwcztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQb3N0Y29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgY2xlYW51cCA9IHNjZW5hcmlvLmNsZWFudXA7XG4gICAgdmFyIHNjZW5hcmlvcyA9IGNsZWFudXAgJiYgY2xlYW51cC5zY2VuYXJpb3M7XG4gICAgLy8gVE9ETzogQnJlYWsgb3V0IGludG8gaGVscGVyXG4gICAgaWYgKHNjZW5hcmlvcykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoXy5tYXAoc2NlbmFyaW9zLCBmdW5jdGlvbiAoc2NlbmFyaW9OYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U2NlbmFyaW8oc2NlbmFyaW9OYW1lKS50aGVuKGZ1bmN0aW9uIChvdGhlclNjZW5hcmlvKSB7XG4gICAgICAgICAgICAgIG90aGVyU2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG90aGVyU2NlbmFyaW8pKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG90aGVyU2NlbmFyaW8uc3RlcHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBzKSB7XG4gICAgdmFyIG5ld1N0ZXBzID0gW107XG4gICAgdmFyIGN1cnJlbnRUaW1lc3RhbXA7IC8vIGluaXRhbGl6ZWQgYnkgZmlyc3QgbGlzdCBvZiBzdGVwcy5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBmbGF0U3RlcHMgPSBzdGVwc1tqXTtcbiAgICAgICAgaWYgKGogPiAwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHN0ZXBzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXAgPSBmbGF0U3RlcHNba107XG4gICAgICAgICAgICAgICAgdmFyIGRpZmYgPSBrID4gMCA/IHN0ZXAudGltZVN0YW1wIC0gZmxhdFN0ZXBzW2sgLSAxXS50aW1lU3RhbXAgOiA1MDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wICs9IGRpZmY7XG4gICAgICAgICAgICAgICAgZmxhdFN0ZXBzW2tdLnRpbWVTdGFtcCA9IGN1cnJlbnRUaW1lc3RhbXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wID0gZmxhdFN0ZXBzW2pdLnRpbWVTdGFtcDtcbiAgICAgICAgfVxuICAgICAgICBuZXdTdGVwcyA9IG5ld1N0ZXBzLmNvbmNhdChmbGF0U3RlcHMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3U3RlcHM7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRQcmVjb25kaXRpb25zKHNjZW5hcmlvKSxcbiAgICAgICAgZ2V0UG9zdGNvbmRpdGlvbnMoc2NlbmFyaW8pXG4gICAgXSkudGhlbihmdW5jdGlvbiAoc3RlcEFycmF5cykge1xuICAgICAgICB2YXIgc3RlcExpc3RzID0gc3RlcEFycmF5c1swXS5jb25jYXQoW3NjZW5hcmlvLnN0ZXBzXSwgc3RlcEFycmF5c1sxXSk7XG4gICAgICAgIHNjZW5hcmlvLnN0ZXBzID0gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBMaXN0cyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJ1blN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKSB7XG4gICAgdXRtZS5icm9hZGNhc3QoJ1JVTk5JTkdfU1RFUCcpO1xuICAgIHRvU2tpcCA9IHRvU2tpcCB8fCB7fTtcblxuICAgIHZhciBzdGVwID0gc2NlbmFyaW8uc3RlcHNbaWR4XTtcbiAgICB2YXIgc3RhdGUgPSB1dG1lLnN0YXRlO1xuICAgIGlmIChzdGVwICYmIHN0YXRlLnN0YXR1cyA9PSAnUExBWUlORycpIHtcbiAgICAgICAgc3RhdGUucnVuLnNjZW5hcmlvID0gc2NlbmFyaW87XG4gICAgICAgIHN0YXRlLnJ1bi5zdGVwSW5kZXggPSBpZHg7XG4gICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAnbG9hZCcpIHtcbiAgICAgICAgICAgIHZhciBuZXdMb2NhdGlvbiA9IHN0ZXAuZGF0YS51cmwucHJvdG9jb2wgKyBcIi8vXCIgKyBzdGVwLmRhdGEudXJsLmhvc3Q7XG4gICAgICAgICAgICB2YXIgc2VhcmNoID0gc3RlcC5kYXRhLnVybC5zZWFyY2g7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IHN0ZXAuZGF0YS51cmwuaGFzaDtcblxuICAgICAgICAgICAgaWYgKHNlYXJjaCAmJiAhc2VhcmNoLmNoYXJBdChcIj9cIikpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2ggPSBcIj9cIiArIHNlYXJjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc1NhbWVVUkwgPSAobG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24uc2VhcmNoKSA9PT0gKG5ld0xvY2F0aW9uICsgc2VhcmNoKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKG5ld0xvY2F0aW9uICsgaGFzaCArIHNlYXJjaCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKChsb2NhdGlvbi5wcm90b2NvbCArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5zZWFyY2gpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKChzdGVwLmRhdGEudXJsLnByb3RvY29sICsgc3RlcC5kYXRhLnVybC5ob3N0ICsgc3RlcC5kYXRhLnVybC5zZWFyY2gpKTtcblxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBub3QgY2hhbmdlZCB0aGUgYWN0dWFsIGxvY2F0aW9uLCB0aGVuIHRoZSBsb2NhdGlvbi5yZXBsYWNlXG4gICAgICAgICAgICAvLyB3aWxsIG5vdCBnbyBhbnl3aGVyZVxuICAgICAgICAgICAgaWYgKGlzU2FtZVVSTCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5yZWxvYWQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndGltZW91dCcpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5hdXRvUnVuKSB7XG4gICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCBzdGVwLmRhdGEuYW1vdW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBsb2NhdG9yID0gc3RlcC5kYXRhLmxvY2F0b3I7XG4gICAgICAgICAgICB2YXIgc3RlcHMgPSBzY2VuYXJpby5zdGVwcztcbiAgICAgICAgICAgIHZhciB1bmlxdWVJZCA9IGdldFVuaXF1ZUlkRnJvbVN0ZXAoc3RlcCk7XG5cbiAgICAgICAgICAgIC8vIHRyeSB0byBnZXQgcmlkIG9mIHVubmVjZXNzYXJ5IHN0ZXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRvU2tpcFt1bmlxdWVJZF0gPT0gJ3VuZGVmaW5lZCcgJiYgdXRtZS5zdGF0ZS5ydW4uc3BlZWQgIT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICB2YXIgZGlmZjtcbiAgICAgICAgICAgICAgdmFyIGlnbm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICBmb3IgKHZhciBqID0gc3RlcHMubGVuZ3RoIC0gMTsgaiA+IGlkeDsgai0tKSB7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyU3RlcCA9IHN0ZXBzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclVuaXF1ZUlkID0gZ2V0VW5pcXVlSWRGcm9tU3RlcChvdGhlclN0ZXApO1xuICAgICAgICAgICAgICAgIGlmICh1bmlxdWVJZCA9PT0gb3RoZXJVbmlxdWVJZCkge1xuICAgICAgICAgICAgICAgICAgaWYgKCFkaWZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IChvdGhlclN0ZXAudGltZVN0YW1wIC0gc3RlcC50aW1lU3RhbXApO1xuICAgICAgICAgICAgICAgICAgICAgIGlnbm9yZSA9ICFpc0ltcG9ydGFudFN0ZXAob3RoZXJTdGVwKSAmJiBkaWZmIDwgaW1wb3J0YW50U3RlcExlbmd0aDtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbnRlcmFjdGl2ZVN0ZXAob3RoZXJTdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlnbm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHRvU2tpcFt1bmlxdWVJZF0gPSBpZ25vcmU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlJ3JlIHNraXBwaW5nIHRoaXMgZWxlbWVudFxuICAgICAgICAgICAgaWYgKHRvU2tpcFtnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApXSkge1xuICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeVVudGlsRm91bmQoc2NlbmFyaW8sIHN0ZXAsIGxvY2F0b3IsIGdldFRpbWVvdXQoc2NlbmFyaW8sIGlkeCkpLnRoZW4oZnVuY3Rpb24gKGVsZXMpIHtcblxuICAgICAgICAgICAgICAgICAgdmFyIGVsZSA9IGVsZXNbMF07XG4gICAgICAgICAgICAgICAgICB2YXIgdGFnTmFtZSA9IGVsZS50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3VwcG9ydHNJbnB1dEV2ZW50ID0gdGFnTmFtZSA9PT0gJ2lucHV0JyB8fCB0YWdOYW1lID09PSAndGV4dGFyZWEnIHx8IGVsZS5nZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoZXZlbnRzLmluZGV4T2Yoc3RlcC5ldmVudE5hbWUpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZGF0YS5idXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLndoaWNoID0gb3B0aW9ucy5idXR0b24gPSBzdGVwLmRhdGEuYnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1NpbXVsYXRpbmcgJyArIHN0ZXAuZXZlbnROYW1lICsgJyBvbiBlbGVtZW50ICcsIGVsZSwgbG9jYXRvci5zZWxlY3RvcnNbMF0sIFwiIGZvciBzdGVwIFwiICsgaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdjbGljaycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkKGVsZSkudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoc3RlcC5ldmVudE5hbWUgPT0gJ2ZvY3VzJyB8fCBzdGVwLmV2ZW50TmFtZSA9PSAnYmx1cicpICYmIGVsZVtzdGVwLmV2ZW50TmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICBlbGVbc3RlcC5ldmVudE5hbWVdKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGVbc3RlcC5ldmVudE5hbWVdKGVsZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHN0ZXAuZGF0YS52YWx1ZSAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZWxlLnZhbHVlID0gc3RlcC5kYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgdGhlIGlucHV0IGV2ZW50LlxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzdXBwb3J0c0lucHV0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2NoYW5nZScpOyAvLyBUaGlzIHNob3VsZCBiZSBmaXJlZCBhZnRlciBhIGJsdXIgZXZlbnQuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdrZXlwcmVzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RlcC5kYXRhLmtleUNvZGUpO1xuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5rZXlwcmVzcyhlbGUsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleWRvd24oZWxlLCBrZXkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGVsZS52YWx1ZSA9IHN0ZXAuZGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnY2hhbmdlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5dXAoZWxlLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNJbnB1dEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKCdWYWxpZGF0ZTogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSAgKyBcIiBjb250YWlucyB0ZXh0ICdcIiAgKyBzdGVwLmRhdGEudGV4dCArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJWYWxpZGF0ZTogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0RXJyb3IoXCJGYWlsZWQgb24gc3RlcDogXCIgKyBpZHggKyBcIiAgRXZlbnQ6IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIiBSZWFzb246IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZ2V0KCd2ZXJib3NlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5hdXRvUnVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiB3YWl0Rm9yQW5ndWxhcihyb290U2VsZWN0b3IpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJvb3RTZWxlY3Rvcik7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FuZ3VsYXIgY291bGQgbm90IGJlIGZvdW5kIG9uIHRoZSB3aW5kb3cnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmdldFRlc3RhYmlsaXR5KSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5nZXRUZXN0YWJpbGl0eShlbCkud2hlblN0YWJsZShyZXNvbHZlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmVsZW1lbnQoZWwpLmluamVjdG9yKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdyb290IGVsZW1lbnQgKCcgKyByb290U2VsZWN0b3IgKyAnKSBoYXMgbm8gaW5qZWN0b3IuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnIHRoaXMgbWF5IG1lYW4gaXQgaXMgbm90IGluc2lkZSBuZy1hcHAuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChlbCkuaW5qZWN0b3IoKS5nZXQoJyRicm93c2VyJykuXG4gICAgICAgICAgICAgICAgbm90aWZ5V2hlbk5vT3V0c3RhbmRpbmdSZXF1ZXN0cyhyZXNvbHZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBpc0ltcG9ydGFudFN0ZXAoc3RlcCkge1xuICAgIHJldHVybiBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VsZWF2ZScgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlb3V0JyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VlbnRlcicgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlb3ZlcicgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ2JsdXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdmb2N1cyc7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBzdGVwIGlzIHNvbWUgc29ydCBvZiB1c2VyIGludGVyYWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGlzSW50ZXJhY3RpdmVTdGVwKHN0ZXApIHtcbiAgICByZXR1cm5cbiAgICAgIG90aGVyU3RlcC5ldmVudE5hbWUuaW5kZXhPZihcIm1vdXNlXCIpICE9PSAwIHx8XG4gICAgICBvdGhlclN0ZXAuZXZlbnROYW1lLmluZGV4T2YoXCJtb3VzZWRvd25cIikgPT09IDAgfHxcbiAgICAgIG90aGVyU3RlcC5ldmVudE5hbWUuaW5kZXhPZihcIm1vdXNldXBcIikgPT09IDA7XG59XG5cbmZ1bmN0aW9uIHRyeVVudGlsRm91bmQoc2NlbmFyaW8sIHN0ZXAsIGxvY2F0b3IsIHRpbWVvdXQsIHRleHRUb0NoZWNrKSB7XG4gICAgdmFyIHN0YXJ0ZWQ7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gdHJ5RmluZCgpIHtcbiAgICAgICAgICAgIGlmICghc3RhcnRlZCkge1xuICAgICAgICAgICAgICAgIHN0YXJ0ZWQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVsZXM7XG4gICAgICAgICAgICB2YXIgZm91bmRUb29NYW55ID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZm91bmRWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGZvdW5kRGlmZmVyZW50VGV4dCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHNlbGVjdG9yc1RvVGVzdCA9IGxvY2F0b3Iuc2VsZWN0b3JzLnNsaWNlKDApO1xuICAgICAgICAgICAgdmFyIHRleHRUb0NoZWNrID0gc3RlcC5kYXRhLnRleHQ7XG4gICAgICAgICAgICB2YXIgY29tcGFyaXNvbiA9IHN0ZXAuZGF0YS5jb21wYXJpc29uIHx8IFwiZXF1YWxzXCI7XG4gICAgICAgICAgICBzZWxlY3RvcnNUb1Rlc3QudW5zaGlmdCgnW2RhdGEtdW5pcXVlLWlkPVwiJyArIGxvY2F0b3IudW5pcXVlSWQgKyAnXCJdJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9yc1RvVGVzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1RvVGVzdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IFwiOnZpc2libGVcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxlcyA9ICQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGV4dFRvQ2hlY2sgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdUZXh0ID0gJChlbGVzWzBdKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGNvbXBhcmlzb24gPT09ICdlcXVhbHMnICYmIG5ld1RleHQgPT09IHRleHRUb0NoZWNrKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjb21wYXJpc29uID09PSAnY29udGFpbnMnICYmIG5ld1RleHQuaW5kZXhPZih0ZXh0VG9DaGVjaykgPj0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmREaWZmZXJlbnRUZXh0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlcy5hdHRyKCdkYXRhLXVuaXF1ZS1pZCcsIGxvY2F0b3IudW5pcXVlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRUb29NYW55ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmb3VuZFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShlbGVzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApICYmIChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0ZWQpIDwgdGltZW91dCAqIDUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIDUwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kVG9vTWFueSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogRm91bmQgVG9vIE1hbnkgRWxlbWVudHNcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZvdW5kRGlmZmVyZW50VGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogVGV4dCBkb2Vzbid0IG1hdGNoLiAgXFxuRXhwZWN0ZWQ6XFxuXCIgKyB0ZXh0VG9DaGVjayArIFwiXFxuYnV0IHdhc1xcblwiICsgZWxlcy50ZXh0KCkgKyBcIlxcblwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBObyBlbGVtZW50cyBmb3VuZFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsaW1pdCA9IGltcG9ydGFudFN0ZXBMZW5ndGggLyAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT0gJ3JlYWx0aW1lJyA/ICcxJyA6IHV0bWUuc3RhdGUucnVuLnNwZWVkKTtcbiAgICAgICAgaWYgKGdsb2JhbC5hbmd1bGFyKSB7XG4gICAgICAgICAgICB3YWl0Rm9yQW5ndWxhcignW25nLWFwcF0nKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgdGltZW91dCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogdXRtZS5zdGF0ZS5ydW4uc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHV0bWUuc3RhdGUucnVuLnNwZWVkID09PSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgIHRyeUZpbmQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogdXRtZS5zdGF0ZS5ydW4uc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZW91dChzY2VuYXJpbywgaWR4KSB7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgLy8gSWYgdGhlIHByZXZpb3VzIHN0ZXAgaXMgYSB2YWxpZGF0ZSBzdGVwLCB0aGVuIGp1c3QgbW92ZSBvbiwgYW5kIHByZXRlbmQgaXQgaXNuJ3QgdGhlcmVcbiAgICAgICAgLy8gT3IgaWYgaXQgaXMgYSBzZXJpZXMgb2Yga2V5cywgdGhlbiBnb1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0uZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuYXJpby5zdGVwc1tpZHhdLnRpbWVTdGFtcCAtIHNjZW5hcmlvLnN0ZXBzW2lkeCAtIDFdLnRpbWVTdGFtcDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCwgdGltZW91dCkge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSBhcmVuJ3QgZ29pbmcgdG8gb3ZlcmZsb3cgdGhlIGNhbGwgc3RhY2suXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHNjZW5hcmlvLnN0ZXBzLmxlbmd0aCA+IChpZHggKyAxKSkge1xuICAgICAgICAgICAgcnVuU3RlcChzY2VuYXJpbywgaWR4ICsgMSwgdG9Ta2lwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKHRydWUpO1xuICAgICAgICB9XG4gICAgfSwgdGltZW91dCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZnJhZ21lbnRGcm9tU3RyaW5nKHN0ckhUTUwpIHtcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHJIVE1MO1xuICAgIC8vIGNvbnNvbGUubG9nKHRlbXAuaW5uZXJIVE1MKTtcbiAgICByZXR1cm4gdGVtcC5jb250ZW50ID8gdGVtcC5jb250ZW50IDogdGVtcDtcbn1cblxuZnVuY3Rpb24gZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAgJiYgc3RlcC5kYXRhICYmIHN0ZXAuZGF0YS5sb2NhdG9yICYmIHN0ZXAuZGF0YS5sb2NhdG9yLnVuaXF1ZUlkO1xufVxuXG52YXIgZ3VpZCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gczQoKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxuICAgICAgICAgICAgLnRvU3RyaW5nKDE2KVxuICAgICAgICAgICAgLnN1YnN0cmluZygxKTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHM0KCkgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgK1xuICAgICAgICAgICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcbiAgICB9O1xufSkoKTtcblxudmFyIGxpc3RlbmVycyA9IFtdO1xudmFyIHN0YXRlO1xudmFyIHNldHRpbmdzO1xudmFyIHV0bWUgPSB7XG4gICAgc3RhdGU6IHN0YXRlLFxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNjZW5hcmlvID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3NjZW5hcmlvJyk7XG4gICAgICAgIHJldHVybiB1dG1lLmxvYWRTZXR0aW5ncygpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSB1dG1lLnN0YXRlID0gdXRtZS5sb2FkU3RhdGVGcm9tU3RvcmFnZSgpO1xuICAgICAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdJTklUSUFMSVpFRCcpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS50ZXN0U2VydmVyID0gZ2V0UGFyYW1ldGVyQnlOYW1lKFwidXRtZV90ZXN0X3NlcnZlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuYXV0b1J1biA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHJ1bkNvbmZpZyA9IGdldFBhcmFtZXRlckJ5TmFtZSgndXRtZV9ydW5fY29uZmlnJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChydW5Db25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkNvbmZpZyA9IEpTT04ucGFyc2UocnVuQ29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBydW5Db25maWcgPSBydW5Db25maWcgfHwge307XG4gICAgICAgICAgICAgICAgICAgIHZhciBzcGVlZCA9IGdldFBhcmFtZXRlckJ5TmFtZSgndXRtZV9ydW5fc3BlZWQnKSB8fCBzZXR0aW5ncy5nZXQoXCJydW5uZXIuc3BlZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzcGVlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuQ29uZmlnLnNwZWVkID0gc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB1dG1lLnJ1blNjZW5hcmlvKHNjZW5hcmlvLCBydW5Db25maWcpO1xuICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHV0bWUuc3RhdGUgPSB1dG1lLmxvYWRTdGF0ZUZyb21TdG9yYWdlKCk7XG4gICAgICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0lOSVRJQUxJWkVEJyk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJQTEFZSU5HXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc3RhdGUucnVuLnNjZW5hcmlvLCBzdGF0ZS5ydW4uc3RlcEluZGV4KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFzdGF0ZS5zdGF0dXMgfHwgc3RhdGUuc3RhdHVzID09PSAnSU5JVElBTElaSU5HJykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIkxPQURFRFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBicm9hZGNhc3Q6IGZ1bmN0aW9uIChldnQsIGV2dERhdGEpIHtcbiAgICAgICAgaWYgKGxpc3RlbmVycyAmJiBsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyc1tpXShldnQsIGV2dERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBzdGFydFJlY29yZGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc3RhdGUuc3RhdHVzICE9ICdSRUNPUkRJTkcnKSB7XG4gICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSAnUkVDT1JESU5HJztcbiAgICAgICAgICAgIHN0YXRlLnN0ZXBzID0gW107XG4gICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlJlY29yZGluZyBTdGFydGVkXCIpO1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1JFQ09SRElOR19TVEFSVEVEJyk7XG5cbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudChcImxvYWRcIiwge1xuICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogd2luZG93LmxvY2F0aW9uLnByb3RvY29sLFxuICAgICAgICAgICAgICAgICAgICBob3N0OiB3aW5kb3cubG9jYXRpb24uaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBoYXNoOiB3aW5kb3cubG9jYXRpb24uaGFzaFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJ1blNjZW5hcmlvOiBmdW5jdGlvbiAobmFtZSwgY29uZmlnKSB7XG4gICAgICAgIHZhciB0b1J1biA9IG5hbWUgfHwgcHJvbXB0KCdTY2VuYXJpbyB0byBydW4nKTtcbiAgICAgICAgdmFyIGF1dG9SdW4gPSAhbmFtZSA/IHByb21wdCgnV291bGQgeW91IGxpa2UgdG8gc3RlcCB0aHJvdWdoIGVhY2ggc3RlcCAoeXxuKT8nKSAhPSAneScgOiB0cnVlO1xuICAgICAgICByZXR1cm4gZ2V0U2NlbmFyaW8odG9SdW4pLnRoZW4oZnVuY3Rpb24gKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBzY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2NlbmFyaW8pKTtcbiAgICAgICAgICAgIHV0bWUuc3RhdGUucnVuID0gXy5leHRlbmQoe1xuICAgICAgICAgICAgICAgIHNwZWVkOiAnMTAnXG4gICAgICAgICAgICB9LCBjb25maWcpO1xuXG4gICAgICAgICAgICBzZXR1cENvbmRpdGlvbnMoc2NlbmFyaW8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmF1dG9SdW4gPSBhdXRvUnVuID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiUExBWUlOR1wiO1xuXG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdGFydGluZyBTY2VuYXJpbyAnXCIgKyBuYW1lICsgXCInXCIsIHNjZW5hcmlvKTtcbiAgICAgICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUExBWUJBQ0tfU1RBUlRFRCcpO1xuXG4gICAgICAgICAgICAgICAgcnVuU3RlcChzY2VuYXJpbywgMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBydW5OZXh0U3RlcDogcnVuTmV4dFN0ZXAsXG4gICAgc3RvcFNjZW5hcmlvOiBmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICB2YXIgc2NlbmFyaW8gPSBzdGF0ZS5ydW4gJiYgc3RhdGUucnVuLnNjZW5hcmlvO1xuICAgICAgICBkZWxldGUgc3RhdGUucnVuO1xuICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIkxPQURFRFwiO1xuICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUExBWUJBQ0tfU1RPUFBFRCcpO1xuXG4gICAgICAgIHV0bWUucmVwb3J0TG9nKFwiU3RvcHBpbmcgU2NlbmFyaW9cIik7XG4gICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydFN1Y2Nlc3MoXCJbU1VDQ0VTU10gU2NlbmFyaW8gJ1wiICsgc2NlbmFyaW8ubmFtZSArIFwiJyBDb21wbGV0ZWQhXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0b3BwaW5nIG9uIHBhZ2UgXCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRFcnJvcihcIltGQUlMVVJFXSBTY2VuYXJpbyAnXCIgKyBzY2VuYXJpby5uYW1lICsgXCInIFN0b3BwZWQhXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSB0ZW1wb3JhcnkgZWxlbWVudCBsb2NhdG9yLCBmb3IgdXNlIHdpdGggZmluYWxpemVMb2NhdG9yXG4gICAgICovXG4gICAgY3JlYXRlRWxlbWVudExvY2F0b3I6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciB1bmlxdWVJZCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS11bmlxdWUtaWRcIikgfHwgZ3VpZCgpO1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShcImRhdGEtdW5pcXVlLWlkXCIsIHVuaXF1ZUlkKTtcblxuICAgICAgICB2YXIgZWxlSHRtbCA9IGVsZW1lbnQuY2xvbmVOb2RlKCkub3V0ZXJIVE1MO1xuICAgICAgICB2YXIgZWxlU2VsZWN0b3JzID0gW107XG4gICAgICAgIGlmIChlbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PSAnQk9EWScgfHwgZWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT0gJ0hUTUwnKSB7XG4gICAgICAgICAgICBlbGVTZWxlY3RvcnMgPSBbZWxlbWVudC50YWdOYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZVNlbGVjdG9ycyA9IHNlbGVjdG9yRmluZGVyKGVsZW1lbnQsIGRvY3VtZW50LmJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1bmlxdWVJZDogdW5pcXVlSWQsXG4gICAgICAgICAgICBzZWxlY3RvcnM6IGVsZVNlbGVjdG9yc1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICByZWdpc3RlckV2ZW50OiBmdW5jdGlvbiAoZXZlbnROYW1lLCBkYXRhLCBpZHgpIHtcbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSB8fCB1dG1lLmlzVmFsaWRhdGluZygpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlkeCA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGlkeCA9IHV0bWUuc3RhdGUuc3RlcHMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuc3RlcHNbaWR4XSA9IHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWU6IGV2ZW50TmFtZSxcbiAgICAgICAgICAgICAgICB0aW1lU3RhbXA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnRVZFTlRfUkVHSVNURVJFRCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRMb2c6IGZ1bmN0aW9uIChsb2csIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5sb2cobG9nLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydEVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5lcnJvcihlcnJvciwgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRTdWNjZXNzOiBmdW5jdGlvbiAobWVzc2FnZSwgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLnN1Y2Nlc3MobWVzc2FnZSwgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZWdpc3Rlckxpc3RlbmVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBsaXN0ZW5lcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyU2F2ZUhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHNhdmVIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJSZXBvcnRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICByZXBvcnRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJMb2FkSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgbG9hZEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclNldHRpbmdzTG9hZEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHNldHRpbmdzTG9hZEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICBpc1JlY29yZGluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiUkVDT1JESU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgaXNQbGF5aW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJQTEFZSU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgaXNWYWxpZGF0aW5nOiBmdW5jdGlvbih2YWxpZGF0aW5nKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsaWRhdGluZyAhPT0gJ3VuZGVmaW5lZCcgJiYgKHV0bWUuaXNSZWNvcmRpbmcoKSB8fCB1dG1lLmlzVmFsaWRhdGluZygpKSkge1xuICAgICAgICAgICAgdXRtZS5zdGF0ZS5zdGF0dXMgPSB2YWxpZGF0aW5nID8gXCJWQUxJREFUSU5HXCIgOiBcIlJFQ09SRElOR1wiO1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1ZBTElEQVRJT05fQ0hBTkdFRCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiVkFMSURBVElOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIHN0b3BSZWNvcmRpbmc6IGZ1bmN0aW9uIChpbmZvKSB7XG4gICAgICAgIGlmIChpbmZvICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdmFyIG5ld1NjZW5hcmlvID0ge1xuICAgICAgICAgICAgICAgIHN0ZXBzOiBzdGF0ZS5zdGVwc1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgXy5leHRlbmQobmV3U2NlbmFyaW8sIGluZm8pO1xuXG4gICAgICAgICAgICBpZiAoIW5ld1NjZW5hcmlvLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBuZXdTY2VuYXJpby5uYW1lID0gcHJvbXB0KCdFbnRlciBzY2VuYXJpbyBuYW1lJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChuZXdTY2VuYXJpby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2NlbmFyaW9zLnB1c2gobmV3U2NlbmFyaW8pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVIYW5kbGVycyAmJiBzYXZlSGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2F2ZUhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlSGFuZGxlcnNbaV0obmV3U2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuc3RhdHVzID0gJ0xPQURFRCc7XG5cbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1JFQ09SRElOR19TVE9QUEVEJyk7XG5cbiAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJSZWNvcmRpbmcgU3RvcHBlZFwiLCBuZXdTY2VuYXJpbyk7XG4gICAgfSxcblxuICAgIGxvYWRTZXR0aW5nczogZnVuY3Rpb24gKCkge1xuICAgICAgICBzZXR0aW5ncyA9IHV0bWUuc2V0dGluZ3MgPSBuZXcgU2V0dGluZ3MoKTtcbiAgICAgICAgaWYgKHNldHRpbmdzTG9hZEhhbmRsZXJzLmxlbmd0aCA+IDAgJiYgIWdldFBhcmFtZXRlckJ5TmFtZSgndXRtZV9zY2VuYXJpbycpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzTG9hZEhhbmRsZXJzWzBdKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLnNldERlZmF1bHRzKHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBsb2FkU3RhdGVGcm9tU3RvcmFnZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdXRtZVN0YXRlU3RyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3V0bWUnKTtcbiAgICAgICAgaWYgKHV0bWVTdGF0ZVN0cikge1xuICAgICAgICAgICAgc3RhdGUgPSBKU09OLnBhcnNlKHV0bWVTdGF0ZVN0cik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwiSU5JVElBTElaSU5HXCIsXG4gICAgICAgICAgICAgICAgc2NlbmFyaW9zOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSxcblxuICAgIHNhdmVTdGF0ZVRvU3RvcmFnZTogZnVuY3Rpb24gKHV0bWVTdGF0ZSkge1xuICAgICAgICBpZiAodXRtZVN0YXRlKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndXRtZScsIEpTT04uc3RyaW5naWZ5KHV0bWVTdGF0ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3V0bWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1bmxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXRtZS5zYXZlU3RhdGVUb1N0b3JhZ2Uoc3RhdGUpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHRvZ2dsZUhpZ2hsaWdodChlbGUsIHZhbHVlKSB7XG4gICAgJChlbGUpLnRvZ2dsZUNsYXNzKCd1dG1lLXZlcmlmeScsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gdG9nZ2xlUmVhZHkoZWxlLCB2YWx1ZSkge1xuICAgICQoZWxlKS50b2dnbGVDbGFzcygndXRtZS1yZWFkeScsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBJZiB5b3UgY2xpY2sgb24gYSBzcGFuIGluIGEgbGFiZWwsIHRoZSBzcGFuIHdpbGwgY2xpY2ssXG4gKiB0aGVuIHRoZSBicm93c2VyIHdpbGwgZmlyZSB0aGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBpbnB1dCBjb250YWluZWQgd2l0aGluIHRoZSBzcGFuLFxuICogU28sIHdlIG9ubHkgd2FudCB0byB0cmFjayB0aGUgaW5wdXQgY2xpY2tzLlxuICovXG5mdW5jdGlvbiBpc05vdEluTGFiZWxPclZhbGlkKGVsZSkge1xuICAgIHJldHVybiAkKGVsZSkucGFyZW50cygnbGFiZWwnKS5sZW5ndGggPT0gMCB8fFxuICAgICAgICAgIGVsZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09ICdpbnB1dCc7XG59XG5cbnZhciB0aW1lcnMgPSBbXTtcblxuZnVuY3Rpb24gaW5pdEV2ZW50SGFuZGxlcnMoKSB7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5pc1RyaWdnZXIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuaGFzQXR0cmlidXRlICYmXG4gICAgICAgICAgICAgICAgICAgICFlLnRhcmdldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykgJiZcbiAgICAgICAgICAgICAgICAgICAgJChlLnRhcmdldCkucGFyZW50cyhcIltkYXRhLWlnbm9yZV1cIikubGVuZ3RoID09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgaXNOb3RJbkxhYmVsT3JWYWxpZChlLnRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdGltZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCB8fCBlLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLmJ1dHRvbiA9IGUud2hpY2ggfHwgZS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnbW91c2VvdmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlLnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVyOiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWFkeShlLnRhcmdldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdtb3VzZW91dCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aW1lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lcnNbaV0uZWxlbWVudCA9PSBlLnRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcnNbaV0udGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlYWR5KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnZhbHVlID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KGV2dCwgYXJncywgaWR4KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbZXZ0XSA9IGhhbmRsZXI7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgICAgfSkoZXZlbnRzW2ldKSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgdmFyIF90b19hc2NpaSA9IHtcbiAgICAgICAgJzE4OCc6ICc0NCcsXG4gICAgICAgICcxMDknOiAnNDUnLFxuICAgICAgICAnMTkwJzogJzQ2JyxcbiAgICAgICAgJzE5MSc6ICc0NycsXG4gICAgICAgICcxOTInOiAnOTYnLFxuICAgICAgICAnMjIwJzogJzkyJyxcbiAgICAgICAgJzIyMic6ICczOScsXG4gICAgICAgICcyMjEnOiAnOTMnLFxuICAgICAgICAnMjE5JzogJzkxJyxcbiAgICAgICAgJzE3Myc6ICc0NScsXG4gICAgICAgICcxODcnOiAnNjEnLCAvL0lFIEtleSBjb2Rlc1xuICAgICAgICAnMTg2JzogJzU5JywgLy9JRSBLZXkgY29kZXNcbiAgICAgICAgJzE4OSc6ICc0NScgLy9JRSBLZXkgY29kZXNcbiAgICB9O1xuXG4gICAgdmFyIHNoaWZ0VXBzID0ge1xuICAgICAgICBcIjk2XCI6IFwiflwiLFxuICAgICAgICBcIjQ5XCI6IFwiIVwiLFxuICAgICAgICBcIjUwXCI6IFwiQFwiLFxuICAgICAgICBcIjUxXCI6IFwiI1wiLFxuICAgICAgICBcIjUyXCI6IFwiJFwiLFxuICAgICAgICBcIjUzXCI6IFwiJVwiLFxuICAgICAgICBcIjU0XCI6IFwiXlwiLFxuICAgICAgICBcIjU1XCI6IFwiJlwiLFxuICAgICAgICBcIjU2XCI6IFwiKlwiLFxuICAgICAgICBcIjU3XCI6IFwiKFwiLFxuICAgICAgICBcIjQ4XCI6IFwiKVwiLFxuICAgICAgICBcIjQ1XCI6IFwiX1wiLFxuICAgICAgICBcIjYxXCI6IFwiK1wiLFxuICAgICAgICBcIjkxXCI6IFwie1wiLFxuICAgICAgICBcIjkzXCI6IFwifVwiLFxuICAgICAgICBcIjkyXCI6IFwifFwiLFxuICAgICAgICBcIjU5XCI6IFwiOlwiLFxuICAgICAgICBcIjM5XCI6IFwiXFxcIlwiLFxuICAgICAgICBcIjQ0XCI6IFwiPFwiLFxuICAgICAgICBcIjQ2XCI6IFwiPlwiLFxuICAgICAgICBcIjQ3XCI6IFwiP1wiXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGtleVByZXNzSGFuZGxlciAoZSkge1xuICAgICAgICBpZiAoZS5pc1RyaWdnZXIpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSAmJiBlLnRhcmdldC5oYXNBdHRyaWJ1dGUgJiYgIWUudGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnZGF0YS1pZ25vcmUnKSAmJiAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiW2RhdGEtaWdub3JlXVwiKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgdmFyIGMgPSBlLndoaWNoO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBEb2Vzbid0IHdvcmsgd2l0aCBjYXBzIGxvY2tcbiAgICAgICAgICAgIC8vbm9ybWFsaXplIGtleUNvZGVcbiAgICAgICAgICAgIGlmIChfdG9fYXNjaWkuaGFzT3duUHJvcGVydHkoYykpIHtcbiAgICAgICAgICAgICAgICBjID0gX3RvX2FzY2lpW2NdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWUuc2hpZnRLZXkgJiYgKGMgPj0gNjUgJiYgYyA8PSA5MCkpIHtcbiAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjICsgMzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIHNoaWZ0VXBzLmhhc093blByb3BlcnR5KGMpKSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgc2hpZnRlZCBrZXlDb2RlIHZhbHVlXG4gICAgICAgICAgICAgICAgYyA9IHNoaWZ0VXBzW2NdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KCdrZXlwcmVzcycsIHtcbiAgICAgICAgICAgICAgICBsb2NhdG9yOiB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGUudGFyZ2V0KSxcbiAgICAgICAgICAgICAgICBrZXk6IGMsXG4gICAgICAgICAgICAgICAgcHJldlZhbHVlOiBlLnRhcmdldC52YWx1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZS50YXJnZXQudmFsdWUgKyBjLFxuICAgICAgICAgICAgICAgIGtleUNvZGU6IGUua2V5Q29kZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGtleVByZXNzSGFuZGxlciwgdHJ1ZSk7XG5cbiAgICAvLyBIQUNLIGZvciB0ZXN0aW5nXG4gICAgKHV0bWUuZXZlbnRMaXN0ZW5lcnMgPSB1dG1lLmV2ZW50TGlzdGVuZXJzIHx8IHt9KVsna2V5cHJlc3MnXSA9IGtleVByZXNzSGFuZGxlcjtcbn1cblxuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyQnlOYW1lKG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufVxuXG5mdW5jdGlvbiBib290c3RyYXBVdG1lKCkge1xuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PSBcImNvbXBsZXRlXCIpIHtcbiAgICB1dG1lLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpbml0RXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkpIHtcbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudChcImxvYWRcIiwge1xuICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogd2luZG93LmxvY2F0aW9uLnByb3RvY29sLFxuICAgICAgICAgICAgICAgICAgICBob3N0OiB3aW5kb3cubG9jYXRpb24uaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBoYXNoOiB3aW5kb3cubG9jYXRpb24uaGFzaFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuYm9vdHN0cmFwVXRtZSgpO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsIGJvb3RzdHJhcFV0bWUpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICAgIHV0bWUudW5sb2FkKCk7XG59LCB0cnVlKTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgIHV0bWUucmVwb3J0TG9nKFwiU2NyaXB0IEVycm9yOiBcIiArIGVyci5tZXNzYWdlICsgXCI6XCIgKyBlcnIudXJsICsgXCIsXCIgKyBlcnIubGluZSArIFwiOlwiICsgZXJyLmNvbCk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dG1lO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lkSEpoYm5ObWIzSnRaV1F1YW5NaUxDSnpiM1Z5WTJWeklqcGJJaTlFWlhabGJHOXdaWEl2WVhSemFXUXZVSEp2YW1WamRITXZkWFJ0WlM5MWRHMWxMM055WXk5cWN5OTFkRzFsTG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJMRWxCUVVrc1EwRkJReXhIUVVGSExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNRMEZCUXp0QlFVTXpRaXhKUVVGSkxFOUJRVThzUjBGQlJ5eFBRVUZQTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRE8wRkJRemRETEVsQlFVa3NVVUZCVVN4SFFVRkhMRTlCUVU4c1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6dEJRVU55UXl4SlFVRkpMR05CUVdNc1IwRkJSeXhQUVVGUExFTkJRVU1zYTBKQlFXdENMRU5CUVVNc1EwRkJRenRCUVVOcVJDeEpRVUZKTEZGQlFWRXNSMEZCUnl4UFFVRlBMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU03TzBGQlJYSkRMR2RFUVVGblJEdEJRVU5vUkN4SlFVRkpMRzFDUVVGdFFpeEhRVUZITEVkQlFVY3NRMEZCUXp0QlFVTTVRaXhKUVVGSkxGbEJRVmtzUjBGQlJ5eEZRVUZGTEVOQlFVTTdRVUZEZEVJc1NVRkJTU3hqUVVGakxFZEJRVWNzUlVGQlJTeERRVUZETzBGQlEzaENMRWxCUVVrc1dVRkJXU3hIUVVGSExFVkJRVVVzUTBGQlF6dEJRVU4wUWl4SlFVRkpMRzlDUVVGdlFpeEhRVUZITEVWQlFVVXNRMEZCUXpzN1FVRkZPVUlzVTBGQlV5eFhRVUZYTEVOQlFVTXNTVUZCU1N4RlFVRkZPMGxCUTNaQ0xFOUJRVThzU1VGQlNTeFBRVUZQTEVOQlFVTXNWVUZCVlN4UFFVRlBMRVZCUVVVc1RVRkJUU3hGUVVGRk8xRkJRekZETEVsQlFVa3NXVUZCV1N4RFFVRkRMRTFCUVUwc1MwRkJTeXhEUVVGRExFVkJRVVU3V1VGRE0wSXNTVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF6dFpRVU4yUWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdaMEpCUXpkRExFbEJRVWtzUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFdEJRVXNzU1VGQlNTeEZRVUZGTzI5Q1FVTnNReXhQUVVGUExFTkJRVU1zUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8ybENRVU12UWp0aFFVTktPMU5CUTBvc1RVRkJUVHRaUVVOSUxGbEJRVmtzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRVZCUVVVc1ZVRkJWU3hKUVVGSkxFVkJRVVU3WjBKQlEyeERMRTlCUVU4c1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dGhRVU5xUWl4RFFVRkRMRU5CUVVNN1UwRkRUanRMUVVOS0xFTkJRVU1zUTBGQlF6dERRVU5PTzBGQlEwUXNTVUZCU1N4VlFVRlZMRWRCUVVjc1MwRkJTeXhEUVVGRE96dEJRVVYyUWl4SlFVRkpMRTFCUVUwc1IwRkJSenRKUVVOVUxFOUJRVTg3U1VGRFVDeFBRVUZQTzBsQlExQXNUVUZCVFR0QlFVTldMRWxCUVVrc1ZVRkJWVHRCUVVOa08wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1NVRkJTU3hYUVVGWE96dEpRVVZZTEZsQlFWazdTVUZEV2l4WlFVRlpPMGxCUTFvc1ZVRkJWVHRKUVVOV0xGZEJRVmM3U1VGRFdDeFRRVUZUTzBGQlEySXNTVUZCU1N4UlFVRlJPMEZCUTFvN08wRkJSVUVzUTBGQlF5eERRVUZET3p0QlFVVkdMRk5CUVZNc1owSkJRV2RDTEVWQlFVVXNVVUZCVVN4RlFVRkZPMGxCUTJwRExFbEJRVWtzUzBGQlN5eEhRVUZITEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNN1FVRkRMMElzU1VGQlNTeEpRVUZKTEZOQlFWTXNSMEZCUnl4TFFVRkxMRWxCUVVrc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF6czdTVUZGZWtNc1NVRkJTU3hUUVVGVExFVkJRVVU3VVVGRFdDeFBRVUZQTEU5QlFVOHNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVWQlFVVXNWVUZCVlN4WlFVRlpMRVZCUVVVN1dVRkRlRVFzVDBGQlR5eFhRVUZYTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzWVVGQllTeEZRVUZGTzJOQlF6ZEVMR0ZCUVdFc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1lVRkJZU3hEUVVGRExFTkJRVU1zUTBGQlF6dGpRVU14UkN4UFFVRlBMR0ZCUVdFc1EwRkJReXhMUVVGTExFTkJRVU03WVVGRE5VSXNRMEZCUXl4RFFVRkRPMU5CUTA0c1EwRkJReXhEUVVGRExFTkJRVU03UzBGRFVDeE5RVUZOTzFGQlEwZ3NUMEZCVHl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFVkJRVVVzUTBGQlF5eERRVUZETzB0QlF6bENPMEZCUTB3c1EwRkJRenM3UVVGRlJDeFRRVUZUTEdsQ1FVRnBRaXhGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5zUXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhSUVVGUkxFTkJRVU1zVDBGQlR5eERRVUZETzBGQlEyNURMRWxCUVVrc1NVRkJTU3hUUVVGVExFZEJRVWNzVDBGQlR5eEpRVUZKTEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNN08wbEJSVGRETEVsQlFVa3NVMEZCVXl4RlFVRkZPMUZCUTFnc1QwRkJUeXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1UwRkJVeXhGUVVGRkxGVkJRVlVzV1VGQldTeEZRVUZGTzFsQlEzaEVMRTlCUVU4c1YwRkJWeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMR0ZCUVdFc1JVRkJSVHRqUVVNM1JDeGhRVUZoTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRMRU5CUVVNN1kwRkRNVVFzVDBGQlR5eGhRVUZoTEVOQlFVTXNTMEZCU3l4RFFVRkRPMkZCUXpWQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTEVOQlFVTXNRMEZCUXl4RFFVRkRPMHRCUTFBc1RVRkJUVHRSUVVOSUxFOUJRVThzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJRenRMUVVNNVFqdEJRVU5NTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXgzUWtGQmQwSXNRMEZCUXl4TFFVRkxMRVZCUVVVN1NVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMGxCUTJ4Q0xFbEJRVWtzWjBKQlFXZENMRU5CUVVNN1NVRkRja0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRia01zU1VGQlNTeFRRVUZUTEVkQlFVY3NTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xRkJRM3BDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRaUVVOUUxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOdVF5eEpRVUZKTEVsQlFVa3NSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEzaENMRWxCUVVrc1NVRkJTU3hIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU03WjBKQlEzQkZMR2RDUVVGblFpeEpRVUZKTEVsQlFVa3NRMEZCUXp0blFrRkRla0lzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhuUWtGQlowSXNRMEZCUXp0aFFVTTNRenRUUVVOS0xFMUJRVTA3V1VGRFNDeG5Ra0ZCWjBJc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNVMEZCVXl4RFFVRkRPMU5CUXpkRE8xRkJRMFFzVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UzBGRGVrTTdTVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJRenRCUVVOd1FpeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5vUXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU03U1VGRGJFSXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRE8xRkJRMllzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRE8xRkJRekZDTEdsQ1FVRnBRaXhEUVVGRExGRkJRVkVzUTBGQlF6dExRVU01UWl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzVlVGQlZTeEZRVUZGTzFGQlF6RkNMRWxCUVVrc1UwRkJVeXhIUVVGSExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGRFVXNVVUZCVVN4RFFVRkRMRXRCUVVzc1IwRkJSeXgzUWtGQmQwSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRMUVVONFJDeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVDBGQlR5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRk8wbEJRM0JETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU03UVVGRGJrTXNTVUZCU1N4TlFVRk5MRWRCUVVjc1RVRkJUU3hKUVVGSkxFVkJRVVVzUTBGQlF6czdTVUZGZEVJc1NVRkJTU3hKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRKUVVNdlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRE8wbEJRM1pDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVTBGQlV5eEZRVUZGTzFGQlEyNURMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXp0UlFVTTVRaXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNSMEZCUnl4SFFVRkhMRU5CUVVNN1VVRkRNVUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVNeFFpeEpRVUZKTEZkQlFWY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTnlSU3hKUVVGSkxFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhOUVVGTkxFTkJRVU03UVVGRE9VTXNXVUZCV1N4SlFVRkpMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNN08xbEJSVGxDTEVsQlFVa3NUVUZCVFN4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFMUJRVTBzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRMMElzVFVGQlRTeEhRVUZITEVkQlFVY3NSMEZCUnl4TlFVRk5MRU5CUVVNN1lVRkRla0k3V1VGRFJDeEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExFMUJRVTBzVDBGQlR5eFhRVUZYTEVkQlFVY3NUVUZCVFN4RFFVRkRMRU5CUVVNN1FVRkRjRWdzV1VGQldTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFZEJRVWNzU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPenRaUVVWeVJDeFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzVVVGQlVTeERRVUZETEVsQlFVa3NSMEZCUnl4UlFVRlJMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU03UVVGREwwVXNXVUZCV1N4UFFVRlBMRU5CUVVNc1IwRkJSeXhGUVVGRkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNN1FVRkRPVVk3UVVGRFFUczdXVUZGV1N4SlFVRkpMRk5CUVZNc1JVRkJSVHRuUWtGRFdDeE5RVUZOTEVOQlFVTXNUVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRM0JETEdGQlFXRTdPMU5CUlVvc1RVRkJUU3hKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NVMEZCVXl4RlFVRkZPMWxCUTNCRExFbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRaaXhYUVVGWExFTkJRVU1zVVVGQlVTeEZRVUZGTEVkQlFVY3NSVUZCUlN4TlFVRk5MRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXp0aFFVTjRSRHRUUVVOS0xFMUJRVTA3V1VGRFNDeEpRVUZKTEU5QlFVOHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF6dFpRVU5vUXl4SlFVRkpMRXRCUVVzc1IwRkJSeXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETzBGQlEzWkRMRmxCUVZrc1NVRkJTU3hSUVVGUkxFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03UVVGRGNrUTdPMWxCUlZrc1NVRkJTU3hQUVVGUExFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1N4WFFVRlhMRWxCUVVrc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4SlFVRkpMRlZCUVZVc1JVRkJSVHRqUVVOb1JpeEpRVUZKTEVsQlFVa3NRMEZCUXp0alFVTlVMRWxCUVVrc1RVRkJUU3hIUVVGSExFdEJRVXNzUTBGQlF6dGpRVU51UWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhIUVVGSExFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdaMEpCUXpORExFbEJRVWtzVTBGQlV5eEhRVUZITEV0QlFVc3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRuUWtGRGVrSXNTVUZCU1N4aFFVRmhMRWRCUVVjc2JVSkJRVzFDTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN1owSkJRMjVFTEVsQlFVa3NVVUZCVVN4TFFVRkxMR0ZCUVdFc1JVRkJSVHRyUWtGRE9VSXNTVUZCU1N4RFFVRkRMRWxCUVVrc1JVRkJSVHR6UWtGRFVDeEpRVUZKTEVsQlFVa3NVMEZCVXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdjMEpCUXpsRExFMUJRVTBzUjBGQlJ5eERRVUZETEdWQlFXVXNRMEZCUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hKUVVGSkxFZEJRVWNzYlVKQlFXMUNMRU5CUVVNN2JVSkJRM1JGTEUxQlFVMHNTVUZCU1N4cFFrRkJhVUlzUTBGQlF5eFRRVUZUTEVOQlFVTXNSVUZCUlR0elFrRkRja01zVFVGQlRTeEhRVUZITEV0QlFVc3NRMEZCUXp0elFrRkRaaXhOUVVGTk8yMUNRVU5VTzJsQ1FVTkdPMEZCUTJwQ0xHVkJRV1U3TzJOQlJVUXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF6dEJRVU40UXl4aFFVRmhPMEZCUTJJN08xbEJSVmtzU1VGQlNTeE5RVUZOTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTXNSVUZCUlR0blFrRkRia01zVjBGQlZ5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU03WVVGRGRFTXNUVUZCVFR0QlFVTnVRaXhuUWtGQlowSXNZVUZCWVN4RFFVRkRMRkZCUVZFc1JVRkJSU3hKUVVGSkxFVkJRVVVzVDBGQlR5eEZRVUZGTEZWQlFWVXNRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTXNWVUZCVlN4SlFVRkpMRVZCUVVVN08ydENRVVZ5Uml4SlFVRkpMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdhMEpCUTJ4Q0xFbEJRVWtzVDBGQlR5eEhRVUZITEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhGUVVGRkxFTkJRVU03UVVGRE1VUXNhMEpCUVd0Q0xFbEJRVWtzYTBKQlFXdENMRWRCUVVjc1QwRkJUeXhMUVVGTExFOUJRVThzU1VGQlNTeFBRVUZQTEV0QlFVc3NWVUZCVlN4SlFVRkpMRWRCUVVjc1EwRkJReXhaUVVGWkxFTkJRVU1zYVVKQlFXbENMRU5CUVVNc1EwRkJRenM3YTBKQlJUbEhMRWxCUVVrc1RVRkJUU3hEUVVGRExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU4yUXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhGUVVGRkxFTkJRVU03YjBKQlEycENMRWxCUVVrc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVWQlFVVTdjMEpCUTNCQ0xFOUJRVThzUTBGQlF5eExRVUZMTEVkQlFVY3NUMEZCVHl4RFFVRkRMRTFCUVUwc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTjRSU3h4UWtGQmNVSTdRVUZEY2tJN08yOUNRVVZ2UWl4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVDBGQlR5eEZRVUZGTzNOQ1FVTTNRaXhEUVVGRExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8zRkNRVU42UWl4TlFVRk5MRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEU5QlFVOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxFMUJRVTBzUzBGQlN5eEhRVUZITEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhGUVVGRk8zTkNRVU42Uml4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTEVOQlFVTTdjVUpCUTNaQ0xFMUJRVTA3YzBKQlEwd3NVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1FVRkROMFFzY1VKQlFYRkNPenR2UWtGRlJDeEpRVUZKTEU5QlFVOHNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhMUVVGTExFbEJRVWtzVjBGQlZ5eEZRVUZGTzBGQlF5OUVMSE5DUVVGelFpeEhRVUZITEVOQlFVTXNTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZET3p0elFrRkZOVUlzU1VGQlNTeHJRa0ZCYTBJc1JVRkJSVHQzUWtGRGRFSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdkVUpCUXpsQ08zTkNRVU5FTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxGRkJRVkVzUTBGQlF5eERRVUZETzNGQ1FVTXZRanRCUVVOeVFpeHRRa0ZCYlVJN08ydENRVVZFTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hWUVVGVkxFVkJRVVU3YjBKQlEyaERMRWxCUVVrc1IwRkJSeXhIUVVGSExFMUJRVTBzUTBGQlF5eFpRVUZaTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dHZRa0ZEYWtRc1VVRkJVU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVWQlFVVXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRhRVFzYjBKQlFXOUNMRkZCUVZFc1EwRkJReXhQUVVGUExFTkJRVU1zUjBGQlJ5eEZRVUZGTEVkQlFVY3NRMEZCUXl4RFFVRkRPenR2UWtGRk0wSXNSMEZCUnl4RFFVRkRMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXp0QlFVTm9SQ3h2UWtGQmIwSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFVkJRVVVzVVVGQlVTeERRVUZETEVOQlFVTTdPMjlDUVVVNVFpeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6dHZRa0ZEZWtJc1NVRkJTU3hyUWtGQmEwSXNSVUZCUlR0M1FrRkRjRUlzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03Y1VKQlEyaERPMEZCUTNKQ0xHMUNRVUZ0UWpzN2EwSkJSVVFzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRlZCUVZVc1JVRkJSVHR2UWtGRGFFTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhaUVVGWkxFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzYTBKQlFXdENMRWxCUVVrc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVkQlFVY3NSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRia2tzYlVKQlFXMUNPenRyUWtGRlJDeEpRVUZKTEV0QlFVc3NRMEZCUXl4UFFVRlBMRVZCUVVVN2IwSkJRMnBDTEZkQlFWY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhGUVVGRkxFMUJRVTBzUTBGQlF5eERRVUZETzIxQ1FVTndRenRwUWtGRFJpeEZRVUZGTEZWQlFWVXNUVUZCVFN4RlFVRkZPMjlDUVVOcVFpeEpRVUZKTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1ZVRkJWU3hGUVVGRk8zTkNRVU5vUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExGbEJRVmtzUjBGQlJ5eE5RVUZOTEVOQlFVTXNRMEZCUXp0elFrRkRkRU1zU1VGQlNTeERRVUZETEZsQlFWa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJRenR4UWtGRE1VSXNUVUZCVFN4SlFVRkpMR1ZCUVdVc1EwRkJReXhKUVVGSkxFTkJRVU1zUlVGQlJUdDNRa0ZET1VJc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eHJRa0ZCYTBJc1IwRkJSeXhIUVVGSExFZEJRVWNzVjBGQlZ5eEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRWRCUVVjc1YwRkJWeXhIUVVGSExFMUJRVTBzUTBGQlF5eERRVUZETzNkQ1FVTnFSeXhKUVVGSkxFTkJRVU1zV1VGQldTeERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPM0ZDUVVNMVFpeE5RVUZOTzNOQ1FVTk1MRWxCUVVrc1VVRkJVU3hEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNSVUZCUlR0M1FrRkRNMElzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenQxUWtGRGVFSTdjMEpCUTBRc1NVRkJTU3hMUVVGTExFTkJRVU1zVDBGQlR5eEZRVUZGTzNkQ1FVTnFRaXhYUVVGWExFTkJRVU1zVVVGQlVTeEZRVUZGTEVkQlFVY3NSVUZCUlN4TlFVRk5MRU5CUVVNc1EwRkJRenQxUWtGRGNFTTdjVUpCUTBZN2FVSkJRMG9zUTBGQlF5eERRVUZETzJGQlEwNDdVMEZEU2p0TFFVTktPMEZCUTB3c1EwRkJRenM3UVVGRlJDeFRRVUZUTEdOQlFXTXNRMEZCUXl4WlFVRlpMRVZCUVVVN1NVRkRiRU1zU1VGQlNTeEZRVUZGTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6dEpRVU01UXl4UFFVRlBMRWxCUVVrc1QwRkJUeXhEUVVGRExGVkJRVlVzVDBGQlR5eEZRVUZGTEUxQlFVMHNSVUZCUlR0UlFVTXhReXhKUVVGSk8xbEJRMEVzU1VGQlNTeERRVUZETEUxQlFVMHNRMEZCUXl4UFFVRlBMRVZCUVVVN1owSkJRMnBDTEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc01FTkJRVEJETEVOQlFVTXNRMEZCUXp0aFFVTXZSRHRaUVVORUxFbEJRVWtzVDBGQlR5eERRVUZETEdOQlFXTXNSVUZCUlR0blFrRkRlRUlzVDBGQlR5eERRVUZETEdOQlFXTXNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJReXhWUVVGVkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdZVUZEYkVRc1RVRkJUVHRuUWtGRFNDeEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF5eFJRVUZSTEVWQlFVVXNSVUZCUlR0dlFrRkRha01zVFVGQlRTeEpRVUZKTEV0QlFVc3NRMEZCUXl4blFrRkJaMElzUjBGQlJ5eFpRVUZaTEVkQlFVY3NiMEpCUVc5Q08zZENRVU5zUlN4NVEwRkJlVU1zUTBGQlF5eERRVUZETzJsQ1FVTnNSRHRuUWtGRFJDeFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkVzUlVGQlJTeERRVUZETEVkQlFVY3NRMEZCUXl4VlFVRlZMRU5CUVVNN1owSkJRemxETEN0Q1FVRXJRaXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzJGQlF6VkRPMU5CUTBvc1EwRkJReXhQUVVGUExFZEJRVWNzUlVGQlJUdFpRVU5XTEUxQlFVMHNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRUUVVObU8wdEJRMG9zUTBGQlF5eERRVUZETzBGQlExQXNRMEZCUXpzN1FVRkZSQ3hUUVVGVExHVkJRV1VzUTBGQlF5eEpRVUZKTEVWQlFVVTdTVUZETTBJc1QwRkJUeXhKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEZsQlFWazdWMEZET1VJc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFZRVUZWTzFkQlF6VkNMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzV1VGQldUdFhRVU01UWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGZEJRVmM3VjBGRE4wSXNTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hOUVVGTk8xZEJRM2hDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1QwRkJUeXhEUVVGRE8wRkJRM0pETEVOQlFVTTdPMEZCUlVRN08wZEJSVWM3UVVGRFNDeFRRVUZUTEdsQ1FVRnBRaXhEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU0zUWl4TlFVRk5PMDFCUTBvc1UwRkJVeXhEUVVGRExGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1EwRkJRenROUVVNeFF5eFRRVUZUTEVOQlFVTXNVMEZCVXl4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFTkJRVU1zUzBGQlN5eERRVUZETzAxQlF6bERMRk5CUVZNc1EwRkJReXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJRenRCUVVOdVJDeERRVUZET3p0QlFVVkVMRk5CUVZNc1lVRkJZU3hEUVVGRExGRkJRVkVzUlVGQlJTeEpRVUZKTEVWQlFVVXNUMEZCVHl4RlFVRkZMRTlCUVU4c1JVRkJSU3hYUVVGWExFVkJRVVU3U1VGRGJFVXNTVUZCU1N4UFFVRlBMRU5CUVVNN1NVRkRXaXhQUVVGUExFbEJRVWtzVDBGQlR5eERRVUZETEZWQlFWVXNUMEZCVHl4RlFVRkZMRTFCUVUwc1JVRkJSVHRSUVVNeFF5eFRRVUZUTEU5QlFVOHNSMEZCUnp0WlFVTm1MRWxCUVVrc1EwRkJReXhQUVVGUExFVkJRVVU3WjBKQlExWXNUMEZCVHl4SFFVRkhMRWxCUVVrc1NVRkJTU3hGUVVGRkxFTkJRVU1zVDBGQlR5eEZRVUZGTEVOQlFVTTdRVUZETDBNc1lVRkJZVHM3V1VGRlJDeEpRVUZKTEVsQlFVa3NRMEZCUXp0WlFVTlVMRWxCUVVrc1dVRkJXU3hIUVVGSExFdEJRVXNzUTBGQlF6dFpRVU42UWl4SlFVRkpMRlZCUVZVc1IwRkJSeXhMUVVGTExFTkJRVU03V1VGRGRrSXNTVUZCU1N4clFrRkJhMElzUjBGQlJ5eExRVUZMTEVOQlFVTTdXVUZETDBJc1NVRkJTU3hsUVVGbExFZEJRVWNzVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03V1VGRGFrUXNTVUZCU1N4WFFVRlhMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTTdXVUZEYWtNc1NVRkJTU3hWUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMRWxCUVVrc1VVRkJVU3hEUVVGRE8xbEJRMnhFTEdWQlFXVXNRMEZCUXl4UFFVRlBMRU5CUVVNc2JVSkJRVzFDTEVkQlFVY3NUMEZCVHl4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlF6dFpRVU4yUlN4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NaVUZCWlN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdG5Ra0ZETjBNc1NVRkJTU3hSUVVGUkxFZEJRVWNzWlVGQlpTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMmRDUVVOc1F5eEpRVUZKTEdWQlFXVXNRMEZCUXl4SlFVRkpMRU5CUVVNc1JVRkJSVHR2UWtGRGRrSXNVVUZCVVN4SlFVRkpMRlZCUVZVc1EwRkJRenRwUWtGRE1VSTdaMEpCUTBRc1NVRkJTU3hIUVVGSExFTkJRVU1zUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXp0blFrRkRia0lzU1VGQlNTeEpRVUZKTEVOQlFVTXNUVUZCVFN4SlFVRkpMRU5CUVVNc1JVRkJSVHR2UWtGRGJFSXNTVUZCU1N4UFFVRlBMRmRCUVZjc1NVRkJTU3hYUVVGWExFVkJRVVU3ZDBKQlEyNURMRWxCUVVrc1QwRkJUeXhIUVVGSExFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF6dDNRa0ZEYUVNc1NVRkJTU3hEUVVGRExGVkJRVlVzUzBGQlN5eFJRVUZSTEVsQlFVa3NUMEZCVHl4TFFVRkxMRmRCUVZjN05rSkJRMnhFTEZWQlFWVXNTMEZCU3l4VlFVRlZMRWxCUVVrc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNc1JVRkJSVHMwUWtGRGJFVXNWVUZCVlN4SFFVRkhMRWxCUVVrc1EwRkJRenMwUWtGRGJFSXNUVUZCVFR0NVFrRkRWQ3hOUVVGTk96UkNRVU5JTEd0Q1FVRnJRaXhIUVVGSExFbEJRVWtzUTBGQlF6dDVRa0ZETjBJN2NVSkJRMG9zVFVGQlRUdDNRa0ZEU0N4VlFVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRE8zZENRVU5zUWl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExHZENRVUZuUWl4RlFVRkZMRTlCUVU4c1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6dDNRa0ZET1VNc1RVRkJUVHR4UWtGRFZEdHZRa0ZEUkN4TlFVRk5PMmxDUVVOVUxFMUJRVTBzU1VGQlNTeEpRVUZKTEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1JVRkJSVHR2UWtGRGVFSXNXVUZCV1N4SFFVRkhMRWxCUVVrc1EwRkJRenRwUWtGRGRrSTdRVUZEYWtJc1lVRkJZVHM3V1VGRlJDeEpRVUZKTEZWQlFWVXNSVUZCUlR0blFrRkRXaXhQUVVGUExFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdZVUZEYWtJc1RVRkJUU3hKUVVGSkxHVkJRV1VzUTBGQlF5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1NVRkJTU3hGUVVGRkxFTkJRVU1zVDBGQlR5eEZRVUZGTEVkQlFVY3NUMEZCVHl4SlFVRkpMRTlCUVU4c1IwRkJSeXhEUVVGRExFVkJRVVU3WjBKQlEyaEdMRlZCUVZVc1EwRkJReXhQUVVGUExFVkJRVVVzUlVGQlJTeERRVUZETEVOQlFVTTdZVUZETTBJc1RVRkJUVHRuUWtGRFNDeEpRVUZKTEUxQlFVMHNSMEZCUnl4RlFVRkZMRU5CUVVNN1owSkJRMmhDTEVsQlFVa3NXVUZCV1N4RlFVRkZPMjlDUVVOa0xFMUJRVTBzUjBGQlJ5eHZSRUZCYjBRc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1IwRkJSeXhoUVVGaExFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNSMEZCUnl4dlEwRkJiME1zUTBGQlF6dHBRa0ZETjBzc1RVRkJUU3hKUVVGSkxHdENRVUZyUWl4RlFVRkZPMjlDUVVNelFpeE5RVUZOTEVkQlFVY3NiMFJCUVc5RUxFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFZEJRVWNzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRWRCUVVjc0swTkJRU3RETEVkQlFVY3NWMEZCVnl4SFFVRkhMR0ZCUVdFc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeEZRVUZGTEVkQlFVY3NTVUZCU1N4RFFVRkRPMmxDUVVNelR5eE5RVUZOTzI5Q1FVTklMRTFCUVUwc1IwRkJSeXh2UkVGQmIwUXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNSMEZCUnl4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUjBGQlJ5dzRRa0ZCT0VJc1EwRkJRenRwUWtGRGRrczdaMEpCUTBRc1RVRkJUU3hEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETzJGQlEyeENPMEZCUTJJc1UwRkJVenM3VVVGRlJDeEpRVUZKTEV0QlFVc3NSMEZCUnl4dFFrRkJiVUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFbEJRVWtzVlVGQlZTeEhRVUZITEVkQlFVY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0UlFVTndSeXhKUVVGSkxFMUJRVTBzUTBGQlF5eFBRVUZQTEVWQlFVVTdXVUZEYUVJc1kwRkJZeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4WFFVRlhPMk5CUTNwRExFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhMUVVGTExGVkJRVlVzUlVGQlJUdHJRa0ZEY2tNc1ZVRkJWU3hEUVVGRExFOUJRVThzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0bFFVTm9ReXhOUVVGTkxFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhMUVVGTExGTkJRVk1zUlVGQlJUdHJRa0ZETTBNc1QwRkJUeXhGUVVGRkxFTkJRVU03WlVGRFlpeE5RVUZOTzJ0Q1FVTklMRlZCUVZVc1EwRkJReXhQUVVGUExFVkJRVVVzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU03WlVGRGVFVTdZVUZEUml4RFFVRkRMRU5CUVVNN1UwRkRUaXhOUVVGTk8xbEJRMGdzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFdEJRVXNzVlVGQlZTeEZRVUZGTzJkQ1FVTnlReXhWUVVGVkxFTkJRVU1zVDBGQlR5eEZRVUZGTEU5QlFVOHNRMEZCUXl4RFFVRkRPMkZCUTJoRExFMUJRVTBzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFdEJRVXNzVTBGQlV5eEZRVUZGTzJkQ1FVTXpReXhQUVVGUExFVkJRVVVzUTBGQlF6dGhRVU5pTEUxQlFVMDdaMEpCUTBnc1ZVRkJWU3hEUVVGRExFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF6dGhRVU40UlR0VFFVTktPMHRCUTBvc1EwRkJReXhEUVVGRE8wRkJRMUFzUTBGQlF6czdRVUZGUkN4VFFVRlRMRlZCUVZVc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTzBGQlEyNURMRWxCUVVrc1NVRkJTU3hIUVVGSExFZEJRVWNzUTBGQlF5eEZRVUZGTzBGQlEycENPenRSUVVWUkxFbEJRVWtzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU1zVTBGQlV5eEpRVUZKTEZWQlFWVXNSVUZCUlR0WlFVTnFSQ3hQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU5hTzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEZOQlFWTXNSMEZCUnl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4VFFVRlRMRU5CUVVNN1MwRkROVVU3U1VGRFJDeFBRVUZQTEVOQlFVTXNRMEZCUXp0QlFVTmlMRU5CUVVNN08wRkJSVVFzVTBGQlV5eFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFVkJRVVVzVDBGQlR5eEZRVUZGT3p0SlFVVnFSQ3hWUVVGVkxFTkJRVU1zVjBGQlZ6dFJRVU5zUWl4SlFVRkpMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeEpRVUZKTEVkQlFVY3NSMEZCUnl4RFFVRkRMRU5CUVVNc1JVRkJSVHRaUVVOdVF5eFBRVUZQTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1IwRkJSeXhEUVVGRExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdVMEZEZEVNc1RVRkJUVHRaUVVOSUxFbEJRVWtzUTBGQlF5eFpRVUZaTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1UwRkRNMEk3UzBGRFNpeEZRVUZGTEU5QlFVOHNTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOeVFpeERRVUZET3p0QlFVVkVMRk5CUVZNc2EwSkJRV3RDTEVOQlFVTXNUMEZCVHl4RlFVRkZPMGxCUTJwRExFbEJRVWtzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4aFFVRmhMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU03UVVGRGJFUXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhIUVVGSExFOUJRVThzUTBGQlF6czdTVUZGZWtJc1QwRkJUeXhKUVVGSkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRE8wRkJRemxETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXh0UWtGQmJVSXNRMEZCUXl4SlFVRkpMRVZCUVVVN1NVRkRMMElzVDBGQlR5eEpRVUZKTEVsQlFVa3NTVUZCU1N4RFFVRkRMRWxCUVVrc1NVRkJTU3hKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eFJRVUZSTEVOQlFVTTdRVUZEYUVZc1EwRkJRenM3UVVGRlJDeEpRVUZKTEVsQlFVa3NSMEZCUnl4RFFVRkRMRmxCUVZrN1NVRkRjRUlzVTBGQlV5eEZRVUZGTEVkQlFVYzdVVUZEVml4UFFVRlBMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRTFCUVUwc1JVRkJSU3hKUVVGSkxFOUJRVThzUTBGQlF6dGhRVU16UXl4UlFVRlJMRU5CUVVNc1JVRkJSU3hEUVVGRE8yRkJRMW9zVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMHRCUTNKQ08wbEJRMFFzVDBGQlR5eFpRVUZaTzFGQlEyWXNUMEZCVHl4RlFVRkZMRVZCUVVVc1IwRkJSeXhGUVVGRkxFVkJRVVVzUjBGQlJ5eEhRVUZITEVkQlFVY3NSVUZCUlN4RlFVRkZMRWRCUVVjc1IwRkJSeXhIUVVGSExFVkJRVVVzUlVGQlJTeEhRVUZITEVkQlFVYzdXVUZET1VNc1JVRkJSU3hGUVVGRkxFZEJRVWNzUjBGQlJ5eEhRVUZITEVWQlFVVXNSVUZCUlN4SFFVRkhMRVZCUVVVc1JVRkJSU3hIUVVGSExFVkJRVVVzUlVGQlJTeERRVUZETzB0QlEzWkRMRU5CUVVNN1FVRkRUaXhEUVVGRExFZEJRVWNzUTBGQlF6czdRVUZGVEN4SlFVRkpMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU03UVVGRGJrSXNTVUZCU1N4TFFVRkxMRU5CUVVNN1FVRkRWaXhKUVVGSkxGRkJRVkVzUTBGQlF6dEJRVU5pTEVsQlFVa3NTVUZCU1N4SFFVRkhPMGxCUTFBc1MwRkJTeXhGUVVGRkxFdEJRVXM3U1VGRFdpeEpRVUZKTEVWQlFVVXNXVUZCV1R0UlFVTmtMRWxCUVVrc1VVRkJVU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMR1ZCUVdVc1EwRkJReXhEUVVGRE8xRkJRMjVFTEU5QlFVOHNTVUZCU1N4RFFVRkRMRmxCUVZrc1JVRkJSU3hEUVVGRExFbEJRVWtzUTBGQlF5eFpRVUZaTzFsQlEzaERMRWxCUVVrc1VVRkJVU3hGUVVGRk8yZENRVU5XTEZsQlFWa3NRMEZCUXl4TFFVRkxMRVZCUVVVc1EwRkJRenRuUWtGRGNrSXNTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEc5Q1FVRnZRaXhGUVVGRkxFTkJRVU03WjBKQlEycEVMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTTdaMEpCUXpsQ0xGVkJRVlVzUTBGQlF5eFpRVUZaTzI5Q1FVTnVRaXhMUVVGTExFTkJRVU1zVlVGQlZTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExHdENRVUZyUWl4RFFVRkRMRU5CUVVNN1FVRkRPVVVzYjBKQlFXOUNMRXRCUVVzc1EwRkJReXhQUVVGUExFZEJRVWNzU1VGQlNTeERRVUZET3p0dlFrRkZja0lzU1VGQlNTeFRRVUZUTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zYVVKQlFXbENMRU5CUVVNc1EwRkJRenR2UWtGRGRFUXNTVUZCU1N4VFFVRlRMRVZCUVVVN2QwSkJRMWdzVTBGQlV5eEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03Y1VKQlEzSkRPMjlDUVVORUxGTkJRVk1zUjBGQlJ5eFRRVUZUTEVsQlFVa3NSVUZCUlN4RFFVRkRPMjlDUVVNMVFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4clFrRkJhMElzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhKUVVGSkxGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNZMEZCWXl4RFFVRkRMRU5CUVVNN2IwSkJRMnBHTEVsQlFVa3NTMEZCU3l4RlFVRkZPM2RDUVVOUUxGTkJRVk1zUTBGQlF5eExRVUZMTEVkQlFVY3NTMEZCU3l4RFFVRkRPMEZCUTJoRUxIRkNRVUZ4UWpzN2IwSkJSVVFzU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1UwRkJVeXhEUVVGRExFTkJRVU03YVVKQlEzcERMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03WVVGRFdpeE5RVUZOTzJkQ1FVTklMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXl4dlFrRkJiMElzUlVGQlJTeERRVUZETzJkQ1FVTnFSQ3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRPMmRDUVVNNVFpeEpRVUZKTEV0QlFVc3NRMEZCUXl4TlFVRk5MRXRCUVVzc1UwRkJVeXhGUVVGRk8yOUNRVU0xUWl4WFFVRlhMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVWQlFVVXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dHBRa0ZEZUVRc1RVRkJUU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc1RVRkJUU3hMUVVGTExHTkJRV01zUlVGQlJUdHZRa0ZEZWtRc1MwRkJTeXhEUVVGRExFMUJRVTBzUjBGQlJ5eFJRVUZSTEVOQlFVTTdhVUpCUXpOQ08yRkJRMG83VTBGRFNpeERRVUZETEVOQlFVTTdTMEZEVGp0SlFVTkVMRk5CUVZNc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJTeFBRVUZQTEVWQlFVVTdVVUZETDBJc1NVRkJTU3hUUVVGVExFbEJRVWtzVTBGQlV5eERRVUZETEUxQlFVMHNSVUZCUlR0WlFVTXZRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1UwRkJVeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETEVWQlFVVXNSVUZCUlR0blFrRkRka01zVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU01UWp0VFFVTktPMHRCUTBvN1NVRkRSQ3hqUVVGakxFVkJRVVVzV1VGQldUdFJRVU40UWl4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVjBGQlZ5eEZRVUZGTzFsQlF6ZENMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVjBGQlZ5eERRVUZETzFsQlF6TkNMRXRCUVVzc1EwRkJReXhMUVVGTExFZEJRVWNzUlVGQlJTeERRVUZETzFsQlEycENMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zYlVKQlFXMUNMRU5CUVVNc1EwRkJRenRCUVVOb1JDeFpRVUZaTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNRMEZCUXpzN1dVRkZjRU1zU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4TlFVRk5MRVZCUVVVN1owSkJRM1pDTEVkQlFVY3NSVUZCUlR0dlFrRkRSQ3hSUVVGUkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4UlFVRlJPMjlDUVVOc1F5eEpRVUZKTEVWQlFVVXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhKUVVGSk8yOUNRVU14UWl4TlFVRk5MRVZCUVVVc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eE5RVUZOTzI5Q1FVTTVRaXhKUVVGSkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpPMmxDUVVNM1FqdGhRVU5LTEVOQlFVTXNRMEZCUXp0VFFVTk9PMEZCUTFRc1MwRkJTenM3U1VGRlJDeFhRVUZYTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVc1RVRkJUU3hGUVVGRk8xRkJRMnBETEVsQlFVa3NTMEZCU3l4SFFVRkhMRWxCUVVrc1NVRkJTU3hOUVVGTkxFTkJRVU1zYVVKQlFXbENMRU5CUVVNc1EwRkJRenRSUVVNNVF5eEpRVUZKTEU5QlFVOHNSMEZCUnl4RFFVRkRMRWxCUVVrc1IwRkJSeXhOUVVGTkxFTkJRVU1zYVVSQlFXbEVMRU5CUVVNc1NVRkJTU3hIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETzFGQlF6bEdMRTlCUVU4c1YwRkJWeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMRkZCUVZFc1JVRkJSVHRaUVVNdlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRMRU5CUVVNN1dVRkRhRVFzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF6dG5Ra0ZEZEVJc1MwRkJTeXhGUVVGRkxFbEJRVWs3UVVGRE0wSXNZVUZCWVN4RlFVRkZMRTFCUVUwc1EwRkJReXhEUVVGRE96dFpRVVZZTEdWQlFXVXNRMEZCUXl4UlFVRlJMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU1zV1VGQldUdG5Ra0ZEZGtNc1MwRkJTeXhEUVVGRExFOUJRVThzUjBGQlJ5eFBRVUZQTEV0QlFVc3NTVUZCU1N4RFFVRkRPMEZCUTJwRUxHZENRVUZuUWl4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGTkJRVk1zUTBGQlF6czdaMEpCUlhwQ0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNjVUpCUVhGQ0xFZEJRVWNzU1VGQlNTeEhRVUZITEVkQlFVY3NSVUZCUlN4UlFVRlJMRU5CUVVNc1EwRkJRenRCUVVNM1JTeG5Ra0ZCWjBJc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHJRa0ZCYTBJc1EwRkJReXhEUVVGRE96dG5Ra0ZGYmtNc1QwRkJUeXhEUVVGRExGRkJRVkVzUlVGQlJTeERRVUZETEVOQlFVTXNRMEZCUXp0aFFVTjRRaXhEUVVGRExFTkJRVU03VTBGRFRpeERRVUZETEVOQlFVTTdTMEZEVGp0SlFVTkVMRmRCUVZjc1JVRkJSU3hYUVVGWE8wbEJRM2hDTEZsQlFWa3NSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSVHRSUVVNM1FpeEpRVUZKTEZGQlFWRXNSMEZCUnl4TFFVRkxMRU5CUVVNc1IwRkJSeXhKUVVGSkxFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNVVUZCVVN4RFFVRkRPMUZCUXk5RExFOUJRVThzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXp0UlFVTnFRaXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZGQlFWRXNRMEZCUXp0QlFVTm9ReXhSUVVGUkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6czdVVUZGYmtNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHRRa0ZCYlVJc1EwRkJReXhEUVVGRE8xRkJRM0JETEVsQlFVa3NVVUZCVVN4RlFVRkZPMWxCUTFZc1NVRkJTU3hQUVVGUExFVkJRVVU3WjBKQlExUXNTVUZCU1N4RFFVRkRMR0ZCUVdFc1EwRkJReXh6UWtGQmMwSXNSMEZCUnl4UlFVRlJMRU5CUVVNc1NVRkJTU3hIUVVGSExHTkJRV01zUTBGQlF5eERRVUZETzJGQlF5OUZMRTFCUVUwN1owSkJRMGdzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4dFFrRkJiVUlzUjBGQlJ5eE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yZENRVU16UkN4SlFVRkpMRU5CUVVNc1YwRkJWeXhEUVVGRExITkNRVUZ6UWl4SFFVRkhMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzV1VGQldTeERRVUZETEVOQlFVTTdZVUZETTBVN1UwRkRTanRCUVVOVUxFdEJRVXM3UVVGRFREdEJRVU5CTzBGQlEwRTdPMGxCUlVrc2IwSkJRVzlDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NUMEZCVHl4RFFVRkRMRmxCUVZrc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4SlFVRkpMRWxCUVVrc1JVRkJSU3hEUVVGRE8wRkJRM2hGTEZGQlFWRXNUMEZCVHl4RFFVRkRMRmxCUVZrc1EwRkJReXhuUWtGQlowSXNSVUZCUlN4UlFVRlJMRU5CUVVNc1EwRkJRenM3VVVGRmFrUXNTVUZCU1N4UFFVRlBMRWRCUVVjc1QwRkJUeXhEUVVGRExGTkJRVk1zUlVGQlJTeERRVUZETEZOQlFWTXNRMEZCUXp0UlFVTTFReXhKUVVGSkxGbEJRVmtzUjBGQlJ5eEZRVUZGTEVOQlFVTTdVVUZEZEVJc1NVRkJTU3hQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRTFCUVUwc1NVRkJTU3hQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVOd1JpeFpRVUZaTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03VTBGRGNFTXNUVUZCVFR0WlFVTklMRmxCUVZrc1IwRkJSeXhqUVVGakxFTkJRVU1zVDBGQlR5eEZRVUZGTEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRUUVVONlJEdFJRVU5FTEU5QlFVODdXVUZEU0N4UlFVRlJMRVZCUVVVc1VVRkJVVHRaUVVOc1FpeFRRVUZUTEVWQlFVVXNXVUZCV1R0VFFVTXhRaXhEUVVGRE8wRkJRMVlzUzBGQlN6czdTVUZGUkN4aFFVRmhMRVZCUVVVc1ZVRkJWU3hUUVVGVExFVkJRVVVzU1VGQlNTeEZRVUZGTEVkQlFVY3NSVUZCUlR0UlFVTXpReXhKUVVGSkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4SlFVRkpMRU5CUVVNc1dVRkJXU3hGUVVGRkxFVkJRVVU3V1VGRE0wTXNTVUZCU1N4UFFVRlBMRWRCUVVjc1NVRkJTU3hYUVVGWExFVkJRVVU3WjBKQlF6TkNMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNN1lVRkRha003V1VGRFJDeExRVUZMTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhIUVVGSE8yZENRVU5tTEZOQlFWTXNSVUZCUlN4VFFVRlRPMmRDUVVOd1FpeFRRVUZUTEVWQlFVVXNTVUZCU1N4SlFVRkpMRVZCUVVVc1EwRkJReXhQUVVGUExFVkJRVVU3WjBKQlF5OUNMRWxCUVVrc1JVRkJSU3hKUVVGSk8yRkJRMklzUTBGQlF6dFpRVU5HTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNRMEZCUXp0VFFVTjBRenRMUVVOS08wbEJRMFFzVTBGQlV5eEZRVUZGTEZWQlFWVXNSMEZCUnl4RlFVRkZMRkZCUVZFc1JVRkJSVHRSUVVOb1F5eEpRVUZKTEdOQlFXTXNTVUZCU1N4alFVRmpMRU5CUVVNc1RVRkJUU3hGUVVGRk8xbEJRM3BETEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eGpRVUZqTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8yZENRVU0xUXl4alFVRmpMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NSVUZCUlN4UlFVRlJMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03WVVGRE9VTTdVMEZEU2p0TFFVTktPMGxCUTBRc1YwRkJWeXhGUVVGRkxGVkJRVlVzUzBGQlN5eEZRVUZGTEZGQlFWRXNSVUZCUlR0UlFVTndReXhKUVVGSkxHTkJRV01zU1VGQlNTeGpRVUZqTEVOQlFVTXNUVUZCVFN4RlFVRkZPMWxCUTNwRExFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNMVF5eGpRVUZqTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1MwRkJTeXhEUVVGRExFdEJRVXNzUlVGQlJTeFJRVUZSTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1lVRkRiRVE3VTBGRFNqdExRVU5LTzBsQlEwUXNZVUZCWVN4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRkxGRkJRVkVzUlVGQlJUdFJRVU40UXl4SlFVRkpMR05CUVdNc1NVRkJTU3hqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTzFsQlEzcERMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4alFVRmpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTTFReXhqUVVGakxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdZVUZEZEVRN1UwRkRTanRMUVVOS08wbEJRMFFzWjBKQlFXZENMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRGFrTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dExRVU16UWp0SlFVTkVMRzFDUVVGdFFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUTNCRExGbEJRVmtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRPVUk3U1VGRFJDeHhRa0ZCY1VJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU4wUXl4alFVRmpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzB0QlEyaERPMGxCUTBRc2JVSkJRVzFDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRjRU1zV1VGQldTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVNNVFqdEpRVU5FTERKQ1FVRXlRaXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTzFGQlF6VkRMRzlDUVVGdlFpeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVOMFF6dEpRVU5FTEZkQlFWY3NSVUZCUlN4WFFVRlhPMUZCUTNCQ0xFOUJRVThzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTjJSRHRKUVVORUxGTkJRVk1zUlVGQlJTeFhRVUZYTzFGQlEyeENMRTlCUVU4c1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dExRVU55UkR0SlFVTkVMRmxCUVZrc1JVRkJSU3hUUVVGVExGVkJRVlVzUlVGQlJUdFJRVU12UWl4SlFVRkpMRTlCUVU4c1ZVRkJWU3hMUVVGTExGZEJRVmNzUzBGQlN5eEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1NVRkJTU3hEUVVGRExGbEJRVmtzUlVGQlJTeERRVUZETEVWQlFVVTdXVUZEYkVZc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NWVUZCVlN4SFFVRkhMRmxCUVZrc1IwRkJSeXhYUVVGWExFTkJRVU03V1VGRE5VUXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXh2UWtGQmIwSXNRMEZCUXl4RFFVRkRPMU5CUTNoRE8xRkJRMFFzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1EwRkJReXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMHRCUTNoRU8wbEJRMFFzWVVGQllTeEZRVUZGTEZWQlFWVXNTVUZCU1N4RlFVRkZPMUZCUXpOQ0xFbEJRVWtzU1VGQlNTeExRVUZMTEV0QlFVc3NSVUZCUlR0WlFVTm9RaXhKUVVGSkxGZEJRVmNzUjBGQlJ6dG5Ra0ZEWkN4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFdEJRVXM3UVVGRGJFTXNZVUZCWVN4RFFVRkRPenRCUVVWa0xGbEJRVmtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03TzFsQlJUVkNMRWxCUVVrc1EwRkJReXhYUVVGWExFTkJRVU1zU1VGQlNTeEZRVUZGTzJkQ1FVTnVRaXhYUVVGWExFTkJRVU1zU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4eFFrRkJjVUlzUTBGQlF5eERRVUZETzBGQlEycEZMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeFhRVUZYTEVOQlFVTXNTVUZCU1N4RlFVRkZPMEZCUTJ4RExHZENRVUZuUWl4TFFVRkxMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUTBGQlF5eFhRVUZYTEVOQlFVTXNRMEZCUXpzN1owSkJSV3hETEVsQlFVa3NXVUZCV1N4SlFVRkpMRmxCUVZrc1EwRkJReXhOUVVGTkxFVkJRVVU3YjBKQlEzSkRMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4WlFVRlpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzNkQ1FVTXhReXhaUVVGWkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8zRkNRVU4wUXp0cFFrRkRTanRoUVVOS08wRkJRMklzVTBGQlV6czdRVUZGVkN4UlFVRlJMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVVVGQlVTeERRVUZET3p0QlFVVm9ReXhSUVVGUkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zUTBGQlF6czdVVUZGY0VNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHRRa0ZCYlVJc1JVRkJSU3hYUVVGWExFTkJRVU1zUTBGQlF6dEJRVU42UkN4TFFVRkxPenRKUVVWRUxGbEJRVmtzUlVGQlJTeFpRVUZaTzFGQlEzUkNMRkZCUVZFc1IwRkJSeXhKUVVGSkxFTkJRVU1zVVVGQlVTeEhRVUZITEVsQlFVa3NVVUZCVVN4RlFVRkZMRU5CUVVNN1VVRkRNVU1zU1VGQlNTeHZRa0ZCYjBJc1EwRkJReXhOUVVGTkxFZEJRVWNzUTBGQlF5eEpRVUZKTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zWlVGQlpTeERRVUZETEVWQlFVVTdXVUZEZWtVc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFZRVUZWTEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVN1owSkJRekZETEc5Q1FVRnZRaXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZWQlFWVXNTVUZCU1N4RlFVRkZPMjlDUVVOd1F5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yOUNRVU16UWl4UFFVRlBMRVZCUVVVc1EwRkJRenRwUWtGRFlpeEZRVUZGTEZsQlFWazdiMEpCUTFnc1QwRkJUeXhGUVVGRkxFTkJRVU03YVVKQlEySXNRMEZCUXl4RFFVRkRPMkZCUTA0c1EwRkJReXhEUVVGRE8xTkJRMDRzVFVGQlRUdFpRVU5JTEU5QlFVOHNUMEZCVHl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRE8xTkJRelZDTzBGQlExUXNTMEZCU3pzN1NVRkZSQ3h2UWtGQmIwSXNSVUZCUlN4WlFVRlpPMUZCUXpsQ0xFbEJRVWtzV1VGQldTeEhRVUZITEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU03VVVGRGFFUXNTVUZCU1N4WlFVRlpMRVZCUVVVN1dVRkRaQ3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRUUVVOd1F5eE5RVUZOTzFsQlEwZ3NTMEZCU3l4SFFVRkhPMmRDUVVOS0xFMUJRVTBzUlVGQlJTeGpRVUZqTzJkQ1FVTjBRaXhUUVVGVExFVkJRVVVzUlVGQlJUdGhRVU5vUWl4RFFVRkRPMU5CUTB3N1VVRkRSQ3hQUVVGUExFdEJRVXNzUTBGQlF6dEJRVU55UWl4TFFVRkxPenRKUVVWRUxHdENRVUZyUWl4RlFVRkZMRlZCUVZVc1UwRkJVeXhGUVVGRk8xRkJRM0pETEVsQlFVa3NVMEZCVXl4RlFVRkZPMWxCUTFnc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eE5RVUZOTEVWQlFVVXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETzFOQlF6TkVMRTFCUVUwN1dVRkRTQ3haUVVGWkxFTkJRVU1zVlVGQlZTeERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPMU5CUTI1RE8wRkJRMVFzUzBGQlN6czdTVUZGUkN4TlFVRk5MRVZCUVVVc1dVRkJXVHRSUVVOb1FpeEpRVUZKTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdTMEZEYkVNN1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNVMEZCVXl4bFFVRmxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFdEJRVXNzUlVGQlJUdEpRVU5xUXl4RFFVRkRMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zVjBGQlZ5eERRVUZETEdGQlFXRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenRCUVVNM1F5eERRVUZET3p0QlFVVkVMRk5CUVZNc1YwRkJWeXhEUVVGRExFZEJRVWNzUlVGQlJTeExRVUZMTEVWQlFVVTdTVUZETjBJc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEZkQlFWY3NRMEZCUXl4WlFVRlpMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03UVVGRE5VTXNRMEZCUXpzN1FVRkZSRHRCUVVOQk8wRkJRMEU3TzBkQlJVYzdRVUZEU0N4VFFVRlRMRzFDUVVGdFFpeERRVUZETEVkQlFVY3NSVUZCUlR0SlFVTTVRaXhQUVVGUExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU1zVFVGQlRTeEpRVUZKTEVOQlFVTTdWVUZEY0VNc1IwRkJSeXhEUVVGRExGRkJRVkVzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4UFFVRlBMRU5CUVVNN1FVRkRhRVFzUTBGQlF6czdRVUZGUkN4SlFVRkpMRTFCUVUwc1IwRkJSeXhGUVVGRkxFTkJRVU03TzBGQlJXaENMRk5CUVZNc2FVSkJRV2xDTEVkQlFVYzdPMGxCUlhwQ0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhOUVVGTkxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMUZCUTNCRExGRkJRVkVzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVXNRMEZCUXl4VlFVRlZMRWRCUVVjc1JVRkJSVHRaUVVOcVJDeEpRVUZKTEU5QlFVOHNSMEZCUnl4VlFVRlZMRU5CUVVNc1JVRkJSVHRuUWtGRGRrSXNTVUZCU1N4RFFVRkRMRU5CUVVNc1UwRkJVenRCUVVNdlFpeHZRa0ZCYjBJc1QwRkJUenM3WjBKQlJWZ3NTVUZCU1N4SlFVRkpMRU5CUVVNc1YwRkJWeXhGUVVGRk8yOUNRVU5zUWl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExGbEJRVms3YjBKQlEzSkNMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eFpRVUZaTEVOQlFVTXNZVUZCWVN4RFFVRkRPMjlDUVVOeVF5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhEUVVGRExFOUJRVThzUTBGQlF5eGxRVUZsTEVOQlFVTXNRMEZCUXl4TlFVRk5MRWxCUVVrc1EwRkJRenR2UWtGRGFFUXNiVUpCUVcxQ0xFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4RlFVRkZPM05DUVVNM1FpeEpRVUZKTEVkQlFVY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVOQlFVTTdjMEpCUTJ4RExFbEJRVWtzU1VGQlNTeEhRVUZIT3pCQ1FVTlFMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zYjBKQlFXOUNMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF6dDFRa0ZETDBNc1EwRkJRenRCUVVONFFpeHpRa0ZCYzBJc1NVRkJTU3hMUVVGTExFTkJRVU03TzNOQ1FVVldMRWxCUVVrc1EwRkJReXhEUVVGRExFdEJRVXNzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZPekJDUVVOeVFpeEpRVUZKTEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1EwRkJReXhMUVVGTExFbEJRVWtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTTFSQ3gxUWtGQmRVSTdPM05DUVVWRUxFbEJRVWtzUjBGQlJ5eEpRVUZKTEZkQlFWY3NSVUZCUlRzd1FrRkRjRUlzWlVGQlpTeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03TUVKQlEyaERMRTFCUVUwc1EwRkJReXhKUVVGSkxFTkJRVU03T0VKQlExSXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTk96aENRVU5xUWl4TFFVRkxMRVZCUVVVc1ZVRkJWU3hEUVVGRExGbEJRVms3YTBOQlF6RkNMRmRCUVZjc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMnREUVVNMVFpeGxRVUZsTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF6c3JRa0ZEY0VNc1JVRkJSU3hIUVVGSExFTkJRVU03TWtKQlExWXNRMEZCUXl4RFFVRkRPM1ZDUVVOT08zTkNRVU5FTEVsQlFVa3NSMEZCUnl4SlFVRkpMRlZCUVZVc1JVRkJSVHN3UWtGRGJrSXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3T0VKQlEzQkRMRWxCUVVrc1RVRkJUU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEU5QlFVOHNTVUZCU1N4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRk8ydERRVU12UWl4WlFVRlpMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMnREUVVNNVFpeE5RVUZOTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU1zUTBGQlF6dHJRMEZEY0VJc1RVRkJUVHNyUWtGRFZEc3lRa0ZEU2pzd1FrRkRSQ3hsUVVGbExFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenN3UWtGRGFrTXNWMEZCVnl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdRVUZEZGtRc2RVSkJRWFZDT3p0elFrRkZSQ3hKUVVGSkxFZEJRVWNzU1VGQlNTeFJRVUZSTEVWQlFVVTdNRUpCUTJwQ0xFbEJRVWtzUTBGQlF5eExRVUZMTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhMUVVGTExFTkJRVU03UVVGRGRFUXNkVUpCUVhWQ096dHpRa0ZGUkN4SlFVRkpMRU5CUVVNc1lVRkJZU3hEUVVGRExFZEJRVWNzUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRla1FzYVVKQlFXbENPenRCUVVWcVFpeGhRVUZoTEVOQlFVTTdRVUZEWkRzN1dVRkZXU3hEUVVGRExFbEJRVWtzUTBGQlF5eGpRVUZqTEVkQlFVY3NTVUZCU1N4RFFVRkRMR05CUVdNc1NVRkJTU3hGUVVGRkxFVkJRVVVzUjBGQlJ5eERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRPMWxCUTJwRkxFOUJRVThzVDBGQlR5eERRVUZETzFOQlEyeENMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1FVRkROMElzUzBGQlN6czdTVUZGUkN4SlFVRkpMRk5CUVZNc1IwRkJSenRSUVVOYUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMEZCUTI1Q0xFdEJRVXNzUTBGQlF6czdTVUZGUml4SlFVRkpMRkZCUVZFc1IwRkJSenRSUVVOWUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1NVRkJTVHRSUVVOV0xFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dEJRVU5xUWl4TFFVRkxMRU5CUVVNN08wbEJSVVlzVTBGQlV5eGxRVUZsTEVWQlFVVXNRMEZCUXl4RlFVRkZPMUZCUTNwQ0xFbEJRVWtzUTBGQlF5eERRVUZETEZOQlFWTTdRVUZEZGtJc1dVRkJXU3hQUVVGUE96dFJRVVZZTEVsQlFVa3NTVUZCU1N4RFFVRkRMRmRCUVZjc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNXVUZCV1N4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eFpRVUZaTEVOQlFVTXNZVUZCWVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1pVRkJaU3hEUVVGRExFTkJRVU1zVFVGQlRTeEpRVUZKTEVOQlFVTXNSVUZCUlR0QlFVTjBTaXhaUVVGWkxFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4TFFVRkxMRU5CUVVNN1FVRkROVUk3UVVGRFFUczdXVUZGV1N4SlFVRkpMRk5CUVZNc1EwRkJReXhqUVVGakxFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVTdaMEpCUXpkQ0xFTkJRVU1zUjBGQlJ5eFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1FVRkRha01zWVVGQllUczdXVUZGUkN4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRExGRkJRVkVzUzBGQlN5eERRVUZETEVsQlFVa3NSVUZCUlN4SlFVRkpMRU5CUVVNc1NVRkJTU3hGUVVGRkxFTkJRVU1zUlVGQlJUdG5Ra0ZEY2tNc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXl4SFFVRkhMRVZCUVVVc1EwRkJReXhEUVVGRE8wRkJRMmhFTEdGQlFXRXNUVUZCVFN4SlFVRkpMRU5CUVVNc1EwRkJReXhSUVVGUkxFbEJRVWtzVVVGQlVTeERRVUZETEdOQlFXTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1JVRkJSVHM3WjBKQlJXcEVMRU5CUVVNc1IwRkJSeXhSUVVGUkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdZVUZEYmtJc1RVRkJUVHRuUWtGRFNDeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEJRVU16UXl4aFFVRmhPenRaUVVWRUxFbEJRVWtzUTBGQlF5eGhRVUZoTEVOQlFVTXNWVUZCVlN4RlFVRkZPMmRDUVVNelFpeFBRVUZQTEVWQlFVVXNTVUZCU1N4RFFVRkRMRzlDUVVGdlFpeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNN1owSkJRelZETEVkQlFVY3NSVUZCUlN4RFFVRkRPMmRDUVVOT0xGTkJRVk1zUlVGQlJTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRXRCUVVzN1owSkJRM3BDTEV0QlFVc3NSVUZCUlN4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFdEJRVXNzUjBGQlJ5eERRVUZETzJkQ1FVTjZRaXhQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVODdZVUZEY2tJc1EwRkJReXhEUVVGRE8xTkJRMDQ3UVVGRFZDeExRVUZMT3p0QlFVVk1MRWxCUVVrc1VVRkJVU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMRlZCUVZVc1JVRkJSU3hsUVVGbExFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdRVUZEYWtVN08wbEJSVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNZMEZCWXl4SFFVRkhMRWxCUVVrc1EwRkJReXhqUVVGakxFbEJRVWtzUlVGQlJTeEZRVUZGTEZWQlFWVXNRMEZCUXl4SFFVRkhMR1ZCUVdVc1EwRkJRenRCUVVOd1JpeERRVUZET3p0QlFVVkVMRk5CUVZNc2EwSkJRV3RDTEVOQlFVTXNTVUZCU1N4RlFVRkZPMGxCUXpsQ0xFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRTFCUVUwc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTXNUVUZCVFN4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRE8wbEJRekZFTEVsQlFVa3NTMEZCU3l4SFFVRkhMRWxCUVVrc1RVRkJUU3hEUVVGRExGRkJRVkVzUjBGQlJ5eEpRVUZKTEVkQlFVY3NWMEZCVnl4RFFVRkRPMUZCUTJwRUxFOUJRVThzUjBGQlJ5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dEpRVU14UXl4UFFVRlBMRTlCUVU4c1MwRkJTeXhKUVVGSkxFZEJRVWNzUlVGQlJTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1MwRkJTeXhGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETEVOQlFVTTdRVUZEZEVZc1EwRkJRenM3UVVGRlJDeFRRVUZUTEdGQlFXRXNSMEZCUnp0RlFVTjJRaXhKUVVGSkxGRkJRVkVzUTBGQlF5eFZRVUZWTEVsQlFVa3NWVUZCVlN4RlFVRkZPMEZCUTNwRExFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRMRWxCUVVrc1EwRkJReXhaUVVGWk96dEJRVVZxUXl4UlFVRlJMR2xDUVVGcFFpeEZRVUZGTEVOQlFVTTdPMUZCUlhCQ0xFbEJRVWtzU1VGQlNTeERRVUZETEZkQlFWY3NSVUZCUlN4RlFVRkZPMWxCUTNCQ0xFbEJRVWtzUTBGQlF5eGhRVUZoTEVOQlFVTXNUVUZCVFN4RlFVRkZPMmRDUVVOMlFpeEhRVUZITEVWQlFVVTdiMEpCUTBRc1VVRkJVU3hGUVVGRkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNVVUZCVVR0dlFrRkRiRU1zU1VGQlNTeEZRVUZGTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1NVRkJTVHR2UWtGRE1VSXNUVUZCVFN4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zVFVGQlRUdHZRa0ZET1VJc1NVRkJTU3hGUVVGRkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1R0cFFrRkROMEk3WVVGRFNpeERRVUZETEVOQlFVTTdVMEZEVGp0TFFVTktMRU5CUVVNc1EwRkJRenRIUVVOS08wRkJRMGdzUTBGQlF6czdRVUZGUkN4aFFVRmhMRVZCUVVVc1EwRkJRenRCUVVOb1FpeFJRVUZSTEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zYTBKQlFXdENMRVZCUVVVc1lVRkJZU3hEUVVGRExFTkJRVU03TzBGQlJUZEVMRTFCUVUwc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4UlFVRlJMRVZCUVVVc1dVRkJXVHRKUVVNeFF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNN1FVRkRiRUlzUTBGQlF5eEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPenRCUVVWVUxFMUJRVTBzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhQUVVGUExFVkJRVVVzVlVGQlZTeEhRVUZITEVWQlFVVTdTVUZETlVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eG5Ra0ZCWjBJc1IwRkJSeXhIUVVGSExFTkJRVU1zVDBGQlR5eEhRVUZITEVkQlFVY3NSMEZCUnl4SFFVRkhMRU5CUVVNc1IwRkJSeXhIUVVGSExFZEJRVWNzUjBGQlJ5eEhRVUZITEVOQlFVTXNTVUZCU1N4SFFVRkhMRWRCUVVjc1IwRkJSeXhIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEY0Vjc1EwRkJReXhEUVVGRExFTkJRVU03TzBGQlJVZ3NUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdYeUE5SUhKbGNYVnBjbVVvSnk0dmRYUnBiSE1uS1R0Y2JuWmhjaUJRY205dGFYTmxJRDBnY21WeGRXbHlaU2duWlhNMkxYQnliMjFwYzJVbktTNVFjbTl0YVhObE8xeHVkbUZ5SUZOcGJYVnNZWFJsSUQwZ2NtVnhkV2x5WlNnbkxpOXphVzExYkdGMFpTY3BPMXh1ZG1GeUlITmxiR1ZqZEc5eVJtbHVaR1Z5SUQwZ2NtVnhkV2x5WlNnbkxpOXpaV3hsWTNSdmNrWnBibVJsY2ljcE8xeHVkbUZ5SUZObGRIUnBibWR6SUQwZ2NtVnhkV2x5WlNnbkxpOXpaWFIwYVc1bmN5Y3BPMXh1WEc0dkx5QjJZWElnYlhsSFpXNWxjbUYwYjNJZ1BTQnVaWGNnUTNOelUyVnNaV04wYjNKSFpXNWxjbUYwYjNJb0tUdGNiblpoY2lCcGJYQnZjblJoYm5SVGRHVndUR1Z1WjNSb0lEMGdOVEF3TzF4dWRtRnlJSE5oZG1WSVlXNWtiR1Z5Y3lBOUlGdGRPMXh1ZG1GeUlISmxjRzl5ZEVoaGJtUnNaWEp6SUQwZ1cxMDdYRzUyWVhJZ2JHOWhaRWhoYm1Sc1pYSnpJRDBnVzEwN1hHNTJZWElnYzJWMGRHbHVaM05NYjJGa1NHRnVaR3hsY25NZ1BTQmJYVHRjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVMk5sYm1GeWFXOG9ibUZ0WlNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ1WlhjZ1VISnZiV2x6WlNobWRXNWpkR2x2YmlBb2NtVnpiMngyWlN3Z2NtVnFaV04wS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hzYjJGa1NHRnVaR3hsY25NdWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzNSaGRHVWdQU0IxZEcxbExuTjBZWFJsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J6ZEdGMFpTNXpZMlZ1WVhKcGIzTXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JoZEdVdWMyTmxibUZ5YVc5elcybGRMbTVoYldVZ1BUMDlJRzVoYldVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemIyeDJaU2h6ZEdGMFpTNXpZMlZ1WVhKcGIzTmJhVjBwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHeHZZV1JJWVc1a2JHVnljMXN3WFNodVlXMWxMQ0JtZFc1amRHbHZiaUFvY21WemNDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9jbVZ6Y0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwcE8xeHVmVnh1ZG1GeUlIWmhiR2xrWVhScGJtY2dQU0JtWVd4elpUdGNibHh1ZG1GeUlHVjJaVzUwY3lBOUlGdGNiaUFnSUNBblkyeHBZMnNuTEZ4dUlDQWdJQ2RtYjJOMWN5Y3NYRzRnSUNBZ0oySnNkWEluTEZ4dUlDQWdJQ2RrWW14amJHbGpheWNzWEc0Z0lDQWdMeThnSjJSeVlXY25MRnh1SUNBZ0lDOHZJQ2RrY21GblpXNTBaWEluTEZ4dUlDQWdJQzh2SUNka2NtRm5iR1ZoZG1VbkxGeHVJQ0FnSUM4dklDZGtjbUZuYjNabGNpY3NYRzRnSUNBZ0x5OGdKMlJ5WVdkemRHRnlkQ2NzWEc0Z0lDQWdMeThnSjJsdWNIVjBKeXhjYmlBZ0lDQW5iVzkxYzJWa2IzZHVKeXhjYmlBZ0lDQXZMeUFuYlc5MWMyVnRiM1psSnl4Y2JpQWdJQ0FuYlc5MWMyVmxiblJsY2ljc1hHNGdJQ0FnSjIxdmRYTmxiR1ZoZG1VbkxGeHVJQ0FnSUNkdGIzVnpaVzkxZENjc1hHNGdJQ0FnSjIxdmRYTmxiM1psY2ljc1hHNGdJQ0FnSjIxdmRYTmxkWEFuTEZ4dUlDQWdJQ2RqYUdGdVoyVW5MRnh1SUNBZ0lDOHZJQ2R5WlhOcGVtVW5MRnh1SUNBZ0lDOHZJQ2R6WTNKdmJHd25YRzVkTzF4dVhHNW1kVzVqZEdsdmJpQm5aWFJRY21WamIyNWthWFJwYjI1eklDaHpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lIWmhjaUJ6WlhSMWNDQTlJSE5qWlc1aGNtbHZMbk5sZEhWd08xeHVJQ0FnSUhaaGNpQnpZMlZ1WVhKcGIzTWdQU0J6WlhSMWNDQW1KaUJ6WlhSMWNDNXpZMlZ1WVhKcGIzTTdYRzRnSUNBZ0x5OGdWRTlFVHpvZ1FuSmxZV3NnYjNWMElHbHVkRzhnYUdWc2NHVnlYRzRnSUNBZ2FXWWdLSE5qWlc1aGNtbHZjeWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzVoYkd3b1h5NXRZWEFvYzJObGJtRnlhVzl6TENCbWRXNWpkR2x2YmlBb2MyTmxibUZ5YVc5T1lXMWxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1oyVjBVMk5sYm1GeWFXOG9jMk5sYm1GeWFXOU9ZVzFsS1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2h2ZEdobGNsTmpaVzVoY21sdktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHOTBhR1Z5VTJObGJtRnlhVzhnUFNCS1UwOU9MbkJoY25ObEtFcFRUMDR1YzNSeWFXNW5hV1o1S0c5MGFHVnlVMk5sYm1GeWFXOHBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHOTBhR1Z5VTJObGJtRnlhVzh1YzNSbGNITTdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmU2twTzF4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxjMjlzZG1Vb1cxMHBPMXh1SUNBZ0lIMWNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVRzl6ZEdOdmJtUnBkR2x2Ym5NZ0tITmpaVzVoY21sdktTQjdYRzRnSUNBZ2RtRnlJR05zWldGdWRYQWdQU0J6WTJWdVlYSnBieTVqYkdWaGJuVndPMXh1SUNBZ0lIWmhjaUJ6WTJWdVlYSnBiM01nUFNCamJHVmhiblZ3SUNZbUlHTnNaV0Z1ZFhBdWMyTmxibUZ5YVc5ek8xeHVJQ0FnSUM4dklGUlBSRTg2SUVKeVpXRnJJRzkxZENCcGJuUnZJR2hsYkhCbGNseHVJQ0FnSUdsbUlDaHpZMlZ1WVhKcGIzTXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVZV3hzS0Y4dWJXRndLSE5qWlc1aGNtbHZjeXdnWm5WdVkzUnBiMjRnS0hOalpXNWhjbWx2VG1GdFpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdkbGRGTmpaVzVoY21sdktITmpaVzVoY21sdlRtRnRaU2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9iM1JvWlhKVFkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmRHaGxjbE5qWlc1aGNtbHZJRDBnU2xOUFRpNXdZWEp6WlNoS1UwOU9Mbk4wY21sdVoybG1lU2h2ZEdobGNsTmpaVzVoY21sdktTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCdmRHaGxjbE5qWlc1aGNtbHZMbk4wWlhCek8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMHBLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0Z0ZEtUdGNiaUFnSUNCOVhHNTlYRzVjYm1aMWJtTjBhVzl1SUY5amIyNWpZWFJUWTJWdVlYSnBiMU4wWlhCTWFYTjBjeWh6ZEdWd2N5a2dlMXh1SUNBZ0lIWmhjaUJ1WlhkVGRHVndjeUE5SUZ0ZE8xeHVJQ0FnSUhaaGNpQmpkWEp5Wlc1MFZHbHRaWE4wWVcxd095QXZMeUJwYm1sMFlXeHBlbVZrSUdKNUlHWnBjbk4wSUd4cGMzUWdiMllnYzNSbGNITXVYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FpQTlJREE3SUdvZ1BDQnpkR1Z3Y3k1c1pXNW5kR2c3SUdvckt5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pteGhkRk4wWlhCeklEMGdjM1JsY0hOYmFsMDdYRzRnSUNBZ0lDQWdJR2xtSUNocUlENGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdheUE5SURBN0lHc2dQQ0J6ZEdWd2N5NXNaVzVuZEdnN0lHc3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkR1Z3SUQwZ1pteGhkRk4wWlhCelcydGRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCa2FXWm1JRDBnYXlBK0lEQWdQeUJ6ZEdWd0xuUnBiV1ZUZEdGdGNDQXRJR1pzWVhSVGRHVndjMXRySUMwZ01WMHVkR2x0WlZOMFlXMXdJRG9nTlRBN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kzVnljbVZ1ZEZScGJXVnpkR0Z0Y0NBclBTQmthV1ptTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdac1lYUlRkR1Z3YzF0clhTNTBhVzFsVTNSaGJYQWdQU0JqZFhKeVpXNTBWR2x0WlhOMFlXMXdPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTNWeWNtVnVkRlJwYldWemRHRnRjQ0E5SUdac1lYUlRkR1Z3YzF0cVhTNTBhVzFsVTNSaGJYQTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnYm1WM1UzUmxjSE1nUFNCdVpYZFRkR1Z3Y3k1amIyNWpZWFFvWm14aGRGTjBaWEJ6S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHNWxkMU4wWlhCek8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCelpYUjFjRU52Ym1ScGRHbHZibk1nS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnZG1GeUlIQnliMjFwYzJWeklEMGdXMTA3WEc0Z0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdVlXeHNLRnRjYmlBZ0lDQWdJQ0FnWjJWMFVISmxZMjl1WkdsMGFXOXVjeWh6WTJWdVlYSnBieWtzWEc0Z0lDQWdJQ0FnSUdkbGRGQnZjM1JqYjI1a2FYUnBiMjV6S0hOalpXNWhjbWx2S1Z4dUlDQWdJRjBwTG5Sb1pXNG9ablZ1WTNScGIyNGdLSE4wWlhCQmNuSmhlWE1wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE4wWlhCTWFYTjBjeUE5SUhOMFpYQkJjbkpoZVhOYk1GMHVZMjl1WTJGMEtGdHpZMlZ1WVhKcGJ5NXpkR1Z3YzEwc0lITjBaWEJCY25KaGVYTmJNVjBwTzF4dUlDQWdJQ0FnSUNCelkyVnVZWEpwYnk1emRHVndjeUE5SUY5amIyNWpZWFJUWTJWdVlYSnBiMU4wWlhCTWFYTjBjeWh6ZEdWd1RHbHpkSE1wTzF4dUlDQWdJSDBwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJ5ZFc1VGRHVndLSE5qWlc1aGNtbHZMQ0JwWkhnc0lIUnZVMnRwY0NrZ2UxeHVJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RTVlU1T1NVNUhYMU5VUlZBbktUdGNiaUFnSUNCMGIxTnJhWEFnUFNCMGIxTnJhWEFnZkh3Z2UzMDdYRzVjYmlBZ0lDQjJZWElnYzNSbGNDQTlJSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlRjA3WEc0Z0lDQWdkbUZ5SUhOMFlYUmxJRDBnZFhSdFpTNXpkR0YwWlR0Y2JpQWdJQ0JwWmlBb2MzUmxjQ0FtSmlCemRHRjBaUzV6ZEdGMGRYTWdQVDBnSjFCTVFWbEpUa2NuS1NCN1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5KMWJpNXpZMlZ1WVhKcGJ5QTlJSE5qWlc1aGNtbHZPMXh1SUNBZ0lDQWdJQ0J6ZEdGMFpTNXlkVzR1YzNSbGNFbHVaR1Y0SUQwZ2FXUjRPMXh1SUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oyeHZZV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNURzlqWVhScGIyNGdQU0J6ZEdWd0xtUmhkR0V1ZFhKc0xuQnliM1J2WTI5c0lDc2dYQ0l2TDF3aUlDc2djM1JsY0M1a1lYUmhMblZ5YkM1b2IzTjBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE5sWVhKamFDQTlJSE4wWlhBdVpHRjBZUzUxY213dWMyVmhjbU5vTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdoaGMyZ2dQU0J6ZEdWd0xtUmhkR0V1ZFhKc0xtaGhjMmc3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoelpXRnlZMmdnSmlZZ0lYTmxZWEpqYUM1amFHRnlRWFFvWENJL1hDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWaGNtTm9JRDBnWENJL1hDSWdLeUJ6WldGeVkyZzdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2FYTlRZVzFsVlZKTUlEMGdLR3h2WTJGMGFXOXVMbkJ5YjNSdlkyOXNJQ3NnWENJdkwxd2lJQ3NnYkc5allYUnBiMjR1YUc5emRDQXJJR3h2WTJGMGFXOXVMbk5sWVhKamFDa2dQVDA5SUNodVpYZE1iMk5oZEdsdmJpQXJJSE5sWVhKamFDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCM2FXNWtiM2N1Ykc5allYUnBiMjR1Y21Wd2JHRmpaU2h1WlhkTWIyTmhkR2x2YmlBcklHaGhjMmdnS3lCelpXRnlZMmdwTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emIyeGxMbXh2Wnlnb2JHOWpZWFJwYjI0dWNISnZkRzlqYjJ3Z0t5QnNiMk5oZEdsdmJpNW9iM04wSUNzZ2JHOWpZWFJwYjI0dWMyVmhjbU5vS1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emIyeGxMbXh2Wnlnb2MzUmxjQzVrWVhSaExuVnliQzV3Y205MGIyTnZiQ0FySUhOMFpYQXVaR0YwWVM1MWNtd3VhRzl6ZENBcklITjBaWEF1WkdGMFlTNTFjbXd1YzJWaGNtTm9LU2s3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUVsbUlIZGxJR2hoZG1VZ2JtOTBJR05vWVc1blpXUWdkR2hsSUdGamRIVmhiQ0JzYjJOaGRHbHZiaXdnZEdobGJpQjBhR1VnYkc5allYUnBiMjR1Y21Wd2JHRmpaVnh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdkMmxzYkNCdWIzUWdaMjhnWVc1NWQyaGxjbVZjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hwYzFOaGJXVlZVa3dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCM2FXNWtiM2N1Y21Wc2IyRmtLSFJ5ZFdVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKM1JwYldWdmRYUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNSaGRHVXVZWFYwYjFKMWJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYms1bGVIUlRkR1Z3S0hOalpXNWhjbWx2TENCcFpIZ3NJSFJ2VTJ0cGNDd2djM1JsY0M1a1lYUmhMbUZ0YjNWdWRDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JHOWpZWFJ2Y2lBOUlITjBaWEF1WkdGMFlTNXNiMk5oZEc5eU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITjBaWEJ6SUQwZ2MyTmxibUZ5YVc4dWMzUmxjSE03WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnZFc1cGNYVmxTV1FnUFNCblpYUlZibWx4ZFdWSlpFWnliMjFUZEdWd0tITjBaWEFwTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCMGNua2dkRzhnWjJWMElISnBaQ0J2WmlCMWJtNWxZMlZ6YzJGeWVTQnpkR1Z3YzF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUIwYjFOcmFYQmJkVzVwY1hWbFNXUmRJRDA5SUNkMWJtUmxabWx1WldRbklDWW1JSFYwYldVdWMzUmhkR1V1Y25WdUxuTndaV1ZrSUNFOUlDZHlaV0ZzZEdsdFpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdScFptWTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJwWjI1dmNtVWdQU0JtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FpQTlJSE4wWlhCekxteGxibWQwYUNBdElERTdJR29nUGlCcFpIZzdJR290TFNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ2ZEdobGNsTjBaWEFnUFNCemRHVndjMXRxWFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdiM1JvWlhKVmJtbHhkV1ZKWkNBOUlHZGxkRlZ1YVhGMVpVbGtSbkp2YlZOMFpYQW9iM1JvWlhKVGRHVndLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RXNXBjWFZsU1dRZ1BUMDlJRzkwYUdWeVZXNXBjWFZsU1dRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNnaFpHbG1aaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1JwWm1ZZ1BTQW9iM1JvWlhKVGRHVndMblJwYldWVGRHRnRjQ0F0SUhOMFpYQXVkR2x0WlZOMFlXMXdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaMjV2Y21VZ1BTQWhhWE5KYlhCdmNuUmhiblJUZEdWd0tHOTBhR1Z5VTNSbGNDa2dKaVlnWkdsbVppQThJR2x0Y0c5eWRHRnVkRk4wWlhCTVpXNW5kR2c3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpTVzUwWlhKaFkzUnBkbVZUZEdWd0tHOTBhR1Z5VTNSbGNDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaMjV2Y21VZ1BTQm1ZV3h6WlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0IwYjFOcmFYQmJkVzVwY1hWbFNXUmRJRDBnYVdkdWIzSmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QlhaU2R5WlNCemEybHdjR2x1WnlCMGFHbHpJR1ZzWlcxbGJuUmNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBiMU5yYVhCYloyVjBWVzVwY1hWbFNXUkdjbTl0VTNSbGNDaHpkR1Z3S1YwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwY25sVmJuUnBiRVp2ZFc1a0tITmpaVzVoY21sdkxDQnpkR1Z3TENCc2IyTmhkRzl5TENCblpYUlVhVzFsYjNWMEtITmpaVzVoY21sdkxDQnBaSGdwS1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2hsYkdWektTQjdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQmxiR1VnUFNCbGJHVnpXekJkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSFJoWjA1aGJXVWdQU0JsYkdVdWRHRm5UbUZ0WlM1MGIweHZkMlZ5UTJGelpTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITjFjSEJ2Y25SelNXNXdkWFJGZG1WdWRDQTlJSFJoWjA1aGJXVWdQVDA5SUNkcGJuQjFkQ2NnZkh3Z2RHRm5UbUZ0WlNBOVBUMGdKM1JsZUhSaGNtVmhKeUI4ZkNCbGJHVXVaMlYwUVhSMGNtbGlkWFJsS0NkamIyNTBaVzUwWldScGRHRmliR1VuS1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMlpXNTBjeTVwYm1SbGVFOW1LSE4wWlhBdVpYWmxiblJPWVcxbEtTQStQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCdmNIUnBiMjV6SUQwZ2UzMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR1Z3TG1SaGRHRXVZblYwZEc5dUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IzQjBhVzl1Y3k1M2FHbGphQ0E5SUc5d2RHbHZibk11WW5WMGRHOXVJRDBnYzNSbGNDNWtZWFJoTG1KMWRIUnZianRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUM4dklHTnZibk52YkdVdWJHOW5LQ2RUYVcxMWJHRjBhVzVuSUNjZ0t5QnpkR1Z3TG1WMlpXNTBUbUZ0WlNBcklDY2diMjRnWld4bGJXVnVkQ0FuTENCbGJHVXNJR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpXekJkTENCY0lpQm1iM0lnYzNSbGNDQmNJaUFySUdsa2VDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR1Z3TG1WMlpXNTBUbUZ0WlNBOVBTQW5ZMnhwWTJzbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0pDaGxiR1VwTG5SeWFXZG5aWElvSjJOc2FXTnJKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9LSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2RtYjJOMWN5Y2dmSHdnYzNSbGNDNWxkbVZ1ZEU1aGJXVWdQVDBnSjJKc2RYSW5LU0FtSmlCbGJHVmJjM1JsY0M1bGRtVnVkRTVoYldWZEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pXeGxXM04wWlhBdVpYWmxiblJPWVcxbFhTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxXM04wWlhBdVpYWmxiblJPWVcxbFhTaGxiR1VzSUc5d2RHbHZibk1wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnpkR1Z3TG1SaGRHRXVkbUZzZFdVZ0lUMGdYQ0oxYm1SbFptbHVaV1JjSWlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWc1pTNTJZV3gxWlNBOUlITjBaWEF1WkdGMFlTNTJZV3gxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2THlCR2IzSWdZbkp2ZDNObGNuTWdkR2hoZENCemRYQndiM0owSUhSb1pTQnBibkIxZENCbGRtVnVkQzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNWd2NHOXlkSE5KYm5CMWRFVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlM1bGRtVnVkQ2hsYkdVc0lDZHBibkIxZENjcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaUzVsZG1WdWRDaGxiR1VzSUNkamFHRnVaMlVuS1RzZ0x5OGdWR2hwY3lCemFHOTFiR1FnWW1VZ1ptbHlaV1FnWVdaMFpYSWdZU0JpYkhWeUlHVjJaVzUwTGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuYTJWNWNISmxjM01uS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCclpYa2dQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0hOMFpYQXVaR0YwWVM1clpYbERiMlJsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdVMmx0ZFd4aGRHVXVhMlY1Y0hKbGMzTW9aV3hsTENCclpYa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlM1clpYbGtiM2R1S0dWc1pTd2dhMlY1S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdVdWRtRnNkV1VnUFNCemRHVndMbVJoZEdFdWRtRnNkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtVjJaVzUwS0dWc1pTd2dKMk5vWVc1blpTY3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtdGxlWFZ3S0dWc1pTd2dhMlY1S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMWNIQnZjblJ6U1c1d2RYUkZkbVZ1ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdVdVpYWmxiblFvWld4bExDQW5hVzV3ZFhRbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0ozWmhiR2xrWVhSbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbkpsY0c5eWRFeHZaeWduVm1Gc2FXUmhkR1U2SUNjZ0t5QktVMDlPTG5OMGNtbHVaMmxtZVNoc2IyTmhkRzl5TG5ObGJHVmpkRzl5Y3lrZ0lDc2dYQ0lnWTI5dWRHRnBibk1nZEdWNGRDQW5YQ0lnSUNzZ2MzUmxjQzVrWVhSaExuUmxlSFFnS3lCY0lpZGNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHRjBaUzVoZFhSdlVuVnVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISjFiazVsZUhSVGRHVndLSE5qWlc1aGNtbHZMQ0JwWkhnc0lIUnZVMnRwY0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU3dnWm5WdVkzUnBiMjRnS0hKbGMzVnNkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNSbGNDNWxkbVZ1ZEU1aGJXVWdQVDBnSjNaaGJHbGtZWFJsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LRndpVm1Gc2FXUmhkR1U2SUZ3aUlDc2djbVZ6ZFd4MEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wYjNCVFkyVnVZWEpwYnlobVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9hWE5KYlhCdmNuUmhiblJUZEdWd0tITjBaWEFwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbkpsY0c5eWRFVnljbTl5S0Z3aVJtRnBiR1ZrSUc5dUlITjBaWEE2SUZ3aUlDc2dhV1I0SUNzZ1hDSWdJRVYyWlc1ME9pQmNJaUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnWENJZ1VtVmhjMjl1T2lCY0lpQXJJSEpsYzNWc2RDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5OMGIzQlRZMlZ1WVhKcGJ5aG1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE5sZEhScGJtZHpMbWRsZENnbmRtVnlZbTl6WlNjcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnloeVpYTjFiSFFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNSaGRHVXVZWFYwYjFKMWJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjblZ1VG1WNGRGTjBaWEFvYzJObGJtRnlhVzhzSUdsa2VDd2dkRzlUYTJsd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4xY2JseHVablZ1WTNScGIyNGdkMkZwZEVadmNrRnVaM1ZzWVhJb2NtOXZkRk5sYkdWamRHOXlLU0I3WEc0Z0lDQWdkbUZ5SUdWc0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2loeWIyOTBVMlZzWldOMGIzSXBPMXh1SUNBZ0lISmxkSFZ5YmlCdVpYY2dVSEp2YldselpTaG1kVzVqZEdsdmJpQW9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lYZHBibVJ2ZHk1aGJtZDFiR0Z5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkaGJtZDFiR0Z5SUdOdmRXeGtJRzV2ZENCaVpTQm1iM1Z1WkNCdmJpQjBhR1VnZDJsdVpHOTNKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9ZVzVuZFd4aGNpNW5aWFJVWlhOMFlXSnBiR2wwZVNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHRnVaM1ZzWVhJdVoyVjBWR1Z6ZEdGaWFXeHBkSGtvWld3cExuZG9aVzVUZEdGaWJHVW9jbVZ6YjJ4MlpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDZ2hZVzVuZFd4aGNpNWxiR1Z0Wlc1MEtHVnNLUzVwYm1wbFkzUnZjaWdwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25jbTl2ZENCbGJHVnRaVzUwSUNnbklDc2djbTl2ZEZObGJHVmpkRzl5SUNzZ0p5a2dhR0Z6SUc1dklHbHVhbVZqZEc5eUxpY2dLMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdKeUIwYUdseklHMWhlU0J0WldGdUlHbDBJR2x6SUc1dmRDQnBibk5wWkdVZ2JtY3RZWEJ3TGljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmhibWQxYkdGeUxtVnNaVzFsYm5Rb1pXd3BMbWx1YW1WamRHOXlLQ2t1WjJWMEtDY2tZbkp2ZDNObGNpY3BMbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzV2ZEdsbWVWZG9aVzVPYjA5MWRITjBZVzVrYVc1blVtVnhkV1Z6ZEhNb2NtVnpiMngyWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwZ1kyRjBZMmdnS0dWeWNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVnFaV04wS0dWeWNpazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlLVHRjYm4xY2JseHVablZ1WTNScGIyNGdhWE5KYlhCdmNuUmhiblJUZEdWd0tITjBaWEFwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObGJHVmhkbVVuSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJSE4wWlhBdVpYWmxiblJPWVcxbElDRTlJQ2R0YjNWelpXOTFkQ2NnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObFpXNTBaWEluSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJSE4wWlhBdVpYWmxiblJPWVcxbElDRTlJQ2R0YjNWelpXOTJaWEluSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJSE4wWlhBdVpYWmxiblJPWVcxbElDRTlJQ2RpYkhWeUp5QW1KbHh1SUNBZ0lDQWdJQ0FnSUNCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBblptOWpkWE1uTzF4dWZWeHVYRzR2S2lwY2JpQXFJRkpsZEhWeWJuTWdkSEoxWlNCcFppQjBhR1VnWjJsMlpXNGdjM1JsY0NCcGN5QnpiMjFsSUhOdmNuUWdiMllnZFhObGNpQnBiblJsY21GamRHbHZibHh1SUNvdlhHNW1kVzVqZEdsdmJpQnBjMGx1ZEdWeVlXTjBhWFpsVTNSbGNDaHpkR1Z3S1NCN1hHNGdJQ0FnY21WMGRYSnVYRzRnSUNBZ0lDQnZkR2hsY2xOMFpYQXVaWFpsYm5ST1lXMWxMbWx1WkdWNFQyWW9YQ0p0YjNWelpWd2lLU0FoUFQwZ01DQjhmRnh1SUNBZ0lDQWdiM1JvWlhKVGRHVndMbVYyWlc1MFRtRnRaUzVwYm1SbGVFOW1LRndpYlc5MWMyVmtiM2R1WENJcElEMDlQU0F3SUh4OFhHNGdJQ0FnSUNCdmRHaGxjbE4wWlhBdVpYWmxiblJPWVcxbExtbHVaR1Y0VDJZb1hDSnRiM1Z6WlhWd1hDSXBJRDA5UFNBd08xeHVmVnh1WEc1bWRXNWpkR2x2YmlCMGNubFZiblJwYkVadmRXNWtLSE5qWlc1aGNtbHZMQ0J6ZEdWd0xDQnNiMk5oZEc5eUxDQjBhVzFsYjNWMExDQjBaWGgwVkc5RGFHVmpheWtnZTF4dUlDQWdJSFpoY2lCemRHRnlkR1ZrTzF4dUlDQWdJSEpsZEhWeWJpQnVaWGNnVUhKdmJXbHpaU2htZFc1amRHbHZiaUFvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUdaMWJtTjBhVzl1SUhSeWVVWnBibVFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lYTjBZWEowWldRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0Z5ZEdWa0lEMGdibVYzSUVSaGRHVW9LUzVuWlhSVWFXMWxLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJsYkdWek8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHWnZkVzVrVkc5dlRXRnVlU0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR1p2ZFc1a1ZtRnNhV1FnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJtYjNWdVpFUnBabVpsY21WdWRGUmxlSFFnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ6Wld4bFkzUnZjbk5VYjFSbGMzUWdQU0JzYjJOaGRHOXlMbk5sYkdWamRHOXljeTV6YkdsalpTZ3dLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUIwWlhoMFZHOURhR1ZqYXlBOUlITjBaWEF1WkdGMFlTNTBaWGgwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdOdmJYQmhjbWx6YjI0Z1BTQnpkR1Z3TG1SaGRHRXVZMjl0Y0dGeWFYTnZiaUI4ZkNCY0ltVnhkV0ZzYzF3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1pXTjBiM0p6Vkc5VVpYTjBMblZ1YzJocFpuUW9KMXRrWVhSaExYVnVhWEYxWlMxcFpEMWNJaWNnS3lCc2IyTmhkRzl5TG5WdWFYRjFaVWxrSUNzZ0oxd2lYU2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J6Wld4bFkzUnZjbk5VYjFSbGMzUXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjMlZzWldOMGIzSWdQU0J6Wld4bFkzUnZjbk5VYjFSbGMzUmJhVjA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHbHpTVzF3YjNKMFlXNTBVM1JsY0NoemRHVndLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaV3hsWTNSdmNpQXJQU0JjSWpwMmFYTnBZbXhsWENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnNaWE1nUFNBa0tITmxiR1ZqZEc5eUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWld4bGN5NXNaVzVuZEdnZ1BUMGdNU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JSFJsZUhSVWIwTm9aV05ySUNFOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNWR1Y0ZENBOUlDUW9aV3hsYzFzd1hTa3VkR1Y0ZENncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ2hqYjIxd1lYSnBjMjl1SUQwOVBTQW5aWEYxWVd4ekp5QW1KaUJ1WlhkVVpYaDBJRDA5UFNCMFpYaDBWRzlEYUdWamF5a2dmSHhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBb1kyOXRjR0Z5YVhOdmJpQTlQVDBnSjJOdmJuUmhhVzV6SnlBbUppQnVaWGRVWlhoMExtbHVaR1Y0VDJZb2RHVjRkRlJ2UTJobFkyc3BJRDQ5SURBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm05MWJtUldZV3hwWkNBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtSR2xtWm1WeVpXNTBWR1Y0ZENBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRlpoYkdsa0lEMGdkSEoxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWc1pYTXVZWFIwY2lnblpHRjBZUzExYm1seGRXVXRhV1FuTENCc2IyTmhkRzl5TG5WdWFYRjFaVWxrS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9aV3hsY3k1c1pXNW5kR2dnUGlBeEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtWRzl2VFdGdWVTQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1ptOTFibVJXWVd4cFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9aV3hsY3lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dselNXMXdiM0owWVc1MFUzUmxjQ2h6ZEdWd0tTQW1KaUFvYm1WM0lFUmhkR1VvS1M1blpYUlVhVzFsS0NrZ0xTQnpkR0Z5ZEdWa0tTQThJSFJwYldWdmRYUWdLaUExS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBWR2x0Wlc5MWRDaDBjbmxHYVc1a0xDQTFNQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ5WlhOMWJIUWdQU0JjSWx3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2htYjNWdVpGUnZiMDFoYm5rcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemRXeDBJRDBnSjBOdmRXeGtJRzV2ZENCbWFXNWtJR0Z3Y0hKdmNISnBZWFJsSUdWc1pXMWxiblFnWm05eUlITmxiR1ZqZEc5eWN6b2dKeUFySUVwVFQwNHVjM1J5YVc1bmFXWjVLR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpLU0FySUZ3aUlHWnZjaUJsZG1WdWRDQmNJaUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnWENJdUlDQlNaV0Z6YjI0NklFWnZkVzVrSUZSdmJ5Qk5ZVzU1SUVWc1pXMWxiblJ6WENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaG1iM1Z1WkVScFptWmxjbVZ1ZEZSbGVIUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpkV3gwSUQwZ0owTnZkV3hrSUc1dmRDQm1hVzVrSUdGd2NISnZjSEpwWVhSbElHVnNaVzFsYm5RZ1ptOXlJSE5sYkdWamRHOXljem9nSnlBcklFcFRUMDR1YzNSeWFXNW5hV1o1S0d4dlkyRjBiM0l1YzJWc1pXTjBiM0p6S1NBcklGd2lJR1p2Y2lCbGRtVnVkQ0JjSWlBcklITjBaWEF1WlhabGJuUk9ZVzFsSUNzZ1hDSXVJQ0JTWldGemIyNDZJRlJsZUhRZ1pHOWxjMjRuZENCdFlYUmphQzRnSUZ4Y2JrVjRjR1ZqZEdWa09seGNibHdpSUNzZ2RHVjRkRlJ2UTJobFkyc2dLeUJjSWx4Y2JtSjFkQ0IzWVhOY1hHNWNJaUFySUdWc1pYTXVkR1Y0ZENncElDc2dYQ0pjWEc1Y0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOMWJIUWdQU0FuUTI5MWJHUWdibTkwSUdacGJtUWdZWEJ3Y205d2NtbGhkR1VnWld4bGJXVnVkQ0JtYjNJZ2MyVnNaV04wYjNKek9pQW5JQ3NnU2xOUFRpNXpkSEpwYm1kcFpua29iRzlqWVhSdmNpNXpaV3hsWTNSdmNuTXBJQ3NnWENJZ1ptOXlJR1YyWlc1MElGd2lJQ3NnYzNSbGNDNWxkbVZ1ZEU1aGJXVWdLeUJjSWk0Z0lGSmxZWE52YmpvZ1RtOGdaV3hsYldWdWRITWdabTkxYm1SY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZxWldOMEtISmxjM1ZzZENrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQjJZWElnYkdsdGFYUWdQU0JwYlhCdmNuUmhiblJUZEdWd1RHVnVaM1JvSUM4Z0tIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtJRDA5SUNkeVpXRnNkR2x0WlNjZ1B5QW5NU2NnT2lCMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDazdYRzRnSUNBZ0lDQWdJR2xtSUNobmJHOWlZV3d1WVc1bmRXeGhjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkMkZwZEVadmNrRnVaM1ZzWVhJb0oxdHVaeTFoY0hCZEp5a3VkR2hsYmlobWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWMzUmhkR1V1Y25WdUxuTndaV1ZrSUQwOVBTQW5jbVZoYkhScGJXVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtIUnllVVpwYm1Rc0lIUnBiV1Z2ZFhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtJRDA5UFNBblptRnpkR1Z6ZENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ5ZVVacGJtUW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvZEhKNVJtbHVaQ3dnVFdGMGFDNXRhVzRvZEdsdFpXOTFkQ0FxSUhWMGJXVXVjM1JoZEdVdWNuVnVMbk53WldWa0xDQnNhVzFwZENrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDQTlQVDBnSjNKbFlXeDBhVzFsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dkR2x0Wlc5MWRDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtJRDA5UFNBblptRnpkR1Z6ZENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBjbmxHYVc1a0tDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb2RISjVSbWx1WkN3Z1RXRjBhQzV0YVc0b2RHbHRaVzkxZENBcUlIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtMQ0JzYVcxcGRDa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHZGxkRlJwYldWdmRYUW9jMk5sYm1GeWFXOHNJR2xrZUNrZ2UxeHVJQ0FnSUdsbUlDaHBaSGdnUGlBd0tTQjdYRzRnSUNBZ0lDQWdJQzh2SUVsbUlIUm9aU0J3Y21WMmFXOTFjeUJ6ZEdWd0lHbHpJR0VnZG1Gc2FXUmhkR1VnYzNSbGNDd2dkR2hsYmlCcWRYTjBJRzF2ZG1VZ2IyNHNJR0Z1WkNCd2NtVjBaVzVrSUdsMElHbHpiaWQwSUhSb1pYSmxYRzRnSUNBZ0lDQWdJQzh2SUU5eUlHbG1JR2wwSUdseklHRWdjMlZ5YVdWeklHOW1JR3RsZVhNc0lIUm9aVzRnWjI5Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlQ0F0SURGZExtVjJaVzUwVG1GdFpTQTlQU0FuZG1Gc2FXUmhkR1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdNRHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJObGJtRnlhVzh1YzNSbGNITmJhV1I0WFM1MGFXMWxVM1JoYlhBZ0xTQnpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIZ2dMU0F4WFM1MGFXMWxVM1JoYlhBN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQXdPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBc0lIUnBiV1Z2ZFhRcElIdGNiaUFnSUNBdkx5Qk5ZV3RsSUhOMWNtVWdkMlVnWVhKbGJpZDBJR2R2YVc1bklIUnZJRzkyWlhKbWJHOTNJSFJvWlNCallXeHNJSE4wWVdOckxseHVJQ0FnSUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoelkyVnVZWEpwYnk1emRHVndjeTVzWlc1bmRHZ2dQaUFvYVdSNElDc2dNU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUNBcklERXNJSFJ2VTJ0cGNDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wYjNCVFkyVnVZWEpwYnloMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzSUhScGJXVnZkWFFnZkh3Z01DazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHWnlZV2R0Wlc1MFJuSnZiVk4wY21sdVp5aHpkSEpJVkUxTUtTQjdYRzRnSUNBZ2RtRnlJSFJsYlhBZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkMFpXMXdiR0YwWlNjcE8xeHVJQ0FnSUhSbGJYQXVhVzV1WlhKSVZFMU1JRDBnYzNSeVNGUk5URHRjYmlBZ0lDQXZMeUJqYjI1emIyeGxMbXh2WnloMFpXMXdMbWx1Ym1WeVNGUk5UQ2s3WEc0Z0lDQWdjbVYwZFhKdUlIUmxiWEF1WTI5dWRHVnVkQ0EvSUhSbGJYQXVZMjl1ZEdWdWRDQTZJSFJsYlhBN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnpkR1Z3SUNZbUlITjBaWEF1WkdGMFlTQW1KaUJ6ZEdWd0xtUmhkR0V1Ykc5allYUnZjaUFtSmlCemRHVndMbVJoZEdFdWJHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkR0Y2JuMWNibHh1ZG1GeUlHZDFhV1FnUFNBb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lHWjFibU4wYVc5dUlITTBLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnVFdGMGFDNW1iRzl2Y2lnb01TQXJJRTFoZEdndWNtRnVaRzl0S0NrcElDb2dNSGd4TURBd01DbGNiaUFnSUNBZ0lDQWdJQ0FnSUM1MGIxTjBjbWx1WnlneE5pbGNiaUFnSUNBZ0lDQWdJQ0FnSUM1emRXSnpkSEpwYm1jb01TazdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCek5DZ3BJQ3NnY3pRb0tTQXJJQ2N0SnlBcklITTBLQ2tnS3lBbkxTY2dLeUJ6TkNncElDc2dKeTBuSUN0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE0wS0NrZ0t5QW5MU2NnS3lCek5DZ3BJQ3NnY3pRb0tTQXJJSE0wS0NrN1hHNGdJQ0FnZlR0Y2JuMHBLQ2s3WEc1Y2JuWmhjaUJzYVhOMFpXNWxjbk1nUFNCYlhUdGNiblpoY2lCemRHRjBaVHRjYm5aaGNpQnpaWFIwYVc1bmN6dGNiblpoY2lCMWRHMWxJRDBnZTF4dUlDQWdJSE4wWVhSbE9pQnpkR0YwWlN4Y2JpQWdJQ0JwYm1sME9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpZMlZ1WVhKcGJ5QTlJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2duZFhSdFpWOXpZMlZ1WVhKcGJ5Y3BPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkWFJ0WlM1c2IyRmtVMlYwZEdsdVozTW9LUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6WTJWdVlYSnBieWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd4dlkyRnNVM1J2Y21GblpTNWpiR1ZoY2lncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsSUQwZ2RYUnRaUzV6ZEdGMFpTQTlJSFYwYldVdWJHOWhaRk4wWVhSbFJuSnZiVk4wYjNKaFoyVW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25TVTVKVkVsQlRFbGFSVVFuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1V1ZEdWemRGTmxjblpsY2lBOUlHZGxkRkJoY21GdFpYUmxja0o1VG1GdFpTaGNJblYwYldWZmRHVnpkRjl6WlhKMlpYSmNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG1GMWRHOVNkVzRnUFNCMGNuVmxPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ5ZFc1RGIyNW1hV2NnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb0ozVjBiV1ZmY25WdVgyTnZibVpwWnljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2NuVnVRMjl1Wm1sbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVEYjI1bWFXY2dQU0JLVTA5T0xuQmhjbk5sS0hKMWJrTnZibVpwWnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVRMjl1Wm1sbklEMGdjblZ1UTI5dVptbG5JSHg4SUh0OU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MzQmxaV1FnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb0ozVjBiV1ZmY25WdVgzTndaV1ZrSnlrZ2ZId2djMlYwZEdsdVozTXVaMlYwS0Z3aWNuVnVibVZ5TG5Od1pXVmtYQ0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNCbFpXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYmtOdmJtWnBaeTV6Y0dWbFpDQTlJSE53WldWa08xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eWRXNVRZMlZ1WVhKcGJ5aHpZMlZ1WVhKcGJ5d2djblZ1UTI5dVptbG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5TENBeU1EQXdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCMWRHMWxMbk4wWVhSbElEMGdkWFJ0WlM1c2IyRmtVM1JoZEdWR2NtOXRVM1J2Y21GblpTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZEpUa2xVU1VGTVNWcEZSQ2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1emRHRjBkWE1nUFQwOUlGd2lVRXhCV1VsT1Ixd2lLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISjFiazVsZUhSVGRHVndLSE4wWVhSbExuSjFiaTV6WTJWdVlYSnBieXdnYzNSaGRHVXVjblZ1TG5OMFpYQkpibVJsZUNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDZ2hjM1JoZEdVdWMzUmhkSFZ6SUh4OElITjBZWFJsTG5OMFlYUjFjeUE5UFQwZ0owbE9TVlJKUVV4SldrbE9SeWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdWMzUmhkSFZ6SUQwZ1hDSk1UMEZFUlVSY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1luSnZZV1JqWVhOME9pQm1kVzVqZEdsdmJpQW9aWFowTENCbGRuUkVZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hzYVhOMFpXNWxjbk1nSmlZZ2JHbHpkR1Z1WlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCc2FYTjBaVzVsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYVhOMFpXNWxjbk5iYVYwb1pYWjBMQ0JsZG5SRVlYUmhLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2MzUmhjblJTWldOdmNtUnBibWM2SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hOMFlYUmxMbk4wWVhSMWN5QWhQU0FuVWtWRFQxSkVTVTVISnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjM1JoZEhWeklEMGdKMUpGUTA5U1JFbE9SeWM3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHVndjeUE5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29YQ0pTWldOdmNtUnBibWNnVTNSaGNuUmxaRndpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZFNSVU5QVWtSSlRrZGZVMVJCVWxSRlJDY3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbFoybHpkR1Z5UlhabGJuUW9YQ0pzYjJGa1hDSXNJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213NklIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY0hKdmRHOWpiMnc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTV3Y205MGIyTnZiQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FHOXpkRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbWh2YzNRc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sWVhKamFEb2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxuTmxZWEpqYUN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhR0Z6YURvZ2QybHVaRzkzTG14dlkyRjBhVzl1TG1oaGMyaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnlkVzVUWTJWdVlYSnBiem9nWm5WdVkzUnBiMjRnS0c1aGJXVXNJR052Ym1acFp5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2RHOVNkVzRnUFNCdVlXMWxJSHg4SUhCeWIyMXdkQ2duVTJObGJtRnlhVzhnZEc4Z2NuVnVKeWs3WEc0Z0lDQWdJQ0FnSUhaaGNpQmhkWFJ2VW5WdUlEMGdJVzVoYldVZ1B5QndjbTl0Y0hRb0oxZHZkV3hrSUhsdmRTQnNhV3RsSUhSdklITjBaWEFnZEdoeWIzVm5hQ0JsWVdOb0lITjBaWEFnS0hsOGJpay9KeWtnSVQwZ0oza25JRG9nZEhKMVpUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHZGxkRk5qWlc1aGNtbHZLSFJ2VW5WdUtTNTBhR1Z1S0daMWJtTjBhVzl1SUNoelkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJObGJtRnlhVzhnUFNCS1UwOU9MbkJoY25ObEtFcFRUMDR1YzNSeWFXNW5hV1o1S0hOalpXNWhjbWx2S1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBZWFJsTG5KMWJpQTlJRjh1WlhoMFpXNWtLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6Y0dWbFpEb2dKekV3SjF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3dnWTI5dVptbG5LVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjMlYwZFhCRGIyNWthWFJwYjI1ektITmpaVzVoY21sdktTNTBhR1Z1S0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1aGRYUnZVblZ1SUQwZ1lYVjBiMUoxYmlBOVBUMGdkSEoxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV6ZEdGMGRYTWdQU0JjSWxCTVFWbEpUa2RjSWp0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUzUmhjblJwYm1jZ1UyTmxibUZ5YVc4Z0oxd2lJQ3NnYm1GdFpTQXJJRndpSjF3aUxDQnpZMlZ1WVhKcGJ5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0oxQk1RVmxDUVVOTFgxTlVRVkpVUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOMFpYQW9jMk5sYm1GeWFXOHNJREFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnY25WdVRtVjRkRk4wWlhBNklISjFiazVsZUhSVGRHVndMRnh1SUNBZ0lITjBiM0JUWTJWdVlYSnBiem9nWm5WdVkzUnBiMjRnS0hOMVkyTmxjM01wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE5qWlc1aGNtbHZJRDBnYzNSaGRHVXVjblZ1SUNZbUlITjBZWFJsTG5KMWJpNXpZMlZ1WVhKcGJ6dGNiaUFnSUNBZ0lDQWdaR1ZzWlhSbElITjBZWFJsTG5KMWJqdGNiaUFnSUNBZ0lDQWdjM1JoZEdVdWMzUmhkSFZ6SUQwZ1hDSk1UMEZFUlVSY0lqdGNiaUFnSUNBZ0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0oxQk1RVmxDUVVOTFgxTlVUMUJRUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE4wYjNCd2FXNW5JRk5qWlc1aGNtbHZYQ0lwTzF4dUlDQWdJQ0FnSUNCcFppQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZFdOalpYTnpLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25SVGRXTmpaWE56S0Z3aVcxTlZRME5GVTFOZElGTmpaVzVoY21sdklDZGNJaUFySUhOalpXNWhjbWx2TG01aGJXVWdLeUJjSWljZ1EyOXRjR3hsZEdWa0lWd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvWENKVGRHOXdjR2x1WnlCdmJpQndZV2RsSUZ3aUlDc2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxtaHlaV1lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFJYSnliM0lvWENKYlJrRkpURlZTUlYwZ1UyTmxibUZ5YVc4Z0oxd2lJQ3NnYzJObGJtRnlhVzh1Ym1GdFpTQXJJRndpSnlCVGRHOXdjR1ZrSVZ3aUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQkRjbVZoZEdWeklHRWdkR1Z0Y0c5eVlYSjVJR1ZzWlcxbGJuUWdiRzlqWVhSdmNpd2dabTl5SUhWelpTQjNhWFJvSUdacGJtRnNhWHBsVEc5allYUnZjbHh1SUNBZ0lDQXFMMXh1SUNBZ0lHTnlaV0YwWlVWc1pXMWxiblJNYjJOaGRHOXlPaUJtZFc1amRHbHZiaUFvWld4bGJXVnVkQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkVzVwY1hWbFNXUWdQU0JsYkdWdFpXNTBMbWRsZEVGMGRISnBZblYwWlNoY0ltUmhkR0V0ZFc1cGNYVmxMV2xrWENJcElIeDhJR2QxYVdRb0tUdGNiaUFnSUNBZ0lDQWdaV3hsYldWdWRDNXpaWFJCZEhSeWFXSjFkR1VvWENKa1lYUmhMWFZ1YVhGMVpTMXBaRndpTENCMWJtbHhkV1ZKWkNrN1hHNWNiaUFnSUNBZ0lDQWdkbUZ5SUdWc1pVaDBiV3dnUFNCbGJHVnRaVzUwTG1Oc2IyNWxUbTlrWlNncExtOTFkR1Z5U0ZSTlREdGNiaUFnSUNBZ0lDQWdkbUZ5SUdWc1pWTmxiR1ZqZEc5eWN5QTlJRnRkTzF4dUlDQWdJQ0FnSUNCcFppQW9aV3hsYldWdWRDNTBZV2RPWVcxbExuUnZWWEJ3WlhKRFlYTmxLQ2tnUFQwZ0owSlBSRmtuSUh4OElHVnNaVzFsYm5RdWRHRm5UbUZ0WlM1MGIxVndjR1Z5UTJGelpTZ3BJRDA5SUNkSVZFMU1KeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaV3hsVTJWc1pXTjBiM0p6SUQwZ1cyVnNaVzFsYm5RdWRHRm5UbUZ0WlYwN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsYkdWVFpXeGxZM1J2Y25NZ1BTQnpaV3hsWTNSdmNrWnBibVJsY2lobGJHVnRaVzUwTENCa2IyTjFiV1Z1ZEM1aWIyUjVLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkVzVwY1hWbFNXUTZJSFZ1YVhGMVpVbGtMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2MyVnNaV04wYjNKek9pQmxiR1ZUWld4bFkzUnZjbk5jYmlBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnY21WbmFYTjBaWEpGZG1WdWREb2dablZ1WTNScGIyNGdLR1YyWlc1MFRtRnRaU3dnWkdGMFlTd2dhV1I0S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbExtbHpVbVZqYjNKa2FXNW5LQ2tnZkh3Z2RYUnRaUzVwYzFaaGJHbGtZWFJwYm1jb0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnBaSGdnUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWkhnZ1BTQjFkRzFsTG5OMFlYUmxMbk4wWlhCekxteGxibWQwYUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5OMFpYQnpXMmxrZUYwZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaWFpsYm5ST1lXMWxPaUJsZG1WdWRFNWhiV1VzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdsdFpWTjBZVzF3T2lCdVpYY2dSR0YwWlNncExtZGxkRlJwYldVb0tTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmtZWFJoT2lCa1lYUmhYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNWljbTloWkdOaGMzUW9KMFZXUlU1VVgxSkZSMGxUVkVWU1JVUW5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdjbVZ3YjNKMFRHOW5PaUJtZFc1amRHbHZiaUFvYkc5bkxDQnpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NtVndiM0owU0dGdVpHeGxjbk1nSmlZZ2NtVndiM0owU0dGdVpHeGxjbk11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21Wd2IzSjBTR0Z1Wkd4bGNuTmJhVjB1Ykc5bktHeHZaeXdnYzJObGJtRnlhVzhzSUhWMGJXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpYQnZjblJGY25KdmNqb2dablZ1WTNScGIyNGdLR1Z5Y205eUxDQnpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NtVndiM0owU0dGdVpHeGxjbk1nSmlZZ2NtVndiM0owU0dGdVpHeGxjbk11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21Wd2IzSjBTR0Z1Wkd4bGNuTmJhVjB1WlhKeWIzSW9aWEp5YjNJc0lITmpaVzVoY21sdkxDQjFkRzFsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdjbVZ3YjNKMFUzVmpZMlZ6Y3pvZ1puVnVZM1JwYjI0Z0tHMWxjM05oWjJVc0lITmpaVzVoY21sdktTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoeVpYQnZjblJJWVc1a2JHVnljeUFtSmlCeVpYQnZjblJJWVc1a2JHVnljeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2djbVZ3YjNKMFNHRnVaR3hsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhCdmNuUklZVzVrYkdWeWMxdHBYUzV6ZFdOalpYTnpLRzFsYzNOaFoyVXNJSE5qWlc1aGNtbHZMQ0IxZEcxbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnY21WbmFYTjBaWEpNYVhOMFpXNWxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2JHbHpkR1Z1WlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV2RwYzNSbGNsTmhkbVZJWVc1a2JHVnlPaUJtZFc1amRHbHZiaUFvYUdGdVpHeGxjaWtnZTF4dUlDQWdJQ0FnSUNCellYWmxTR0Z1Wkd4bGNuTXVjSFZ6YUNob1lXNWtiR1Z5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlVbVZ3YjNKMFNHRnVaR3hsY2pvZ1puVnVZM1JwYjI0Z0tHaGhibVJzWlhJcElIdGNiaUFnSUNBZ0lDQWdjbVZ3YjNKMFNHRnVaR3hsY25NdWNIVnphQ2hvWVc1a2JHVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISmxaMmx6ZEdWeVRHOWhaRWhoYm1Sc1pYSTZJR1oxYm1OMGFXOXVJQ2hvWVc1a2JHVnlLU0I3WEc0Z0lDQWdJQ0FnSUd4dllXUklZVzVrYkdWeWN5NXdkWE5vS0doaGJtUnNaWElwTzF4dUlDQWdJSDBzWEc0Z0lDQWdjbVZuYVhOMFpYSlRaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnlPaUJtZFc1amRHbHZiaUFvYUdGdVpHeGxjaWtnZTF4dUlDQWdJQ0FnSUNCelpYUjBhVzVuYzB4dllXUklZVzVrYkdWeWN5NXdkWE5vS0doaGJtUnNaWElwTzF4dUlDQWdJSDBzWEc0Z0lDQWdhWE5TWldOdmNtUnBibWM2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzV6ZEdGMFpTNXpkR0YwZFhNdWFXNWtaWGhQWmloY0lsSkZRMDlTUkVsT1Ixd2lLU0E5UFQwZ01EdGNiaUFnSUNCOUxGeHVJQ0FnSUdselVHeGhlV2x1WnpvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjFkRzFsTG5OMFlYUmxMbk4wWVhSMWN5NXBibVJsZUU5bUtGd2lVRXhCV1VsT1Ixd2lLU0E5UFQwZ01EdGNiaUFnSUNCOUxGeHVJQ0FnSUdselZtRnNhV1JoZEdsdVp6b2dablZ1WTNScGIyNG9kbUZzYVdSaGRHbHVaeWtnZTF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIWmhiR2xrWVhScGJtY2dJVDA5SUNkMWJtUmxabWx1WldRbklDWW1JQ2gxZEcxbExtbHpVbVZqYjNKa2FXNW5LQ2tnZkh3Z2RYUnRaUzVwYzFaaGJHbGtZWFJwYm1jb0tTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1YzNSaGRHVXVjM1JoZEhWeklEMGdkbUZzYVdSaGRHbHVaeUEvSUZ3aVZrRk1TVVJCVkVsT1Ixd2lJRG9nWENKU1JVTlBVa1JKVGtkY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RXUVV4SlJFRlVTVTlPWDBOSVFVNUhSVVFuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzV6ZEdGMFpTNXpkR0YwZFhNdWFXNWtaWGhQWmloY0lsWkJURWxFUVZSSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCemRHOXdVbVZqYjNKa2FXNW5PaUJtZFc1amRHbHZiaUFvYVc1bWJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2FXNW1ieUFoUFQwZ1ptRnNjMlVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCdVpYZFRZMlZ1WVhKcGJ5QTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdWd2N6b2djM1JoZEdVdWMzUmxjSE5jYmlBZ0lDQWdJQ0FnSUNBZ0lIMDdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lGOHVaWGgwWlc1a0tHNWxkMU5qWlc1aGNtbHZMQ0JwYm1adktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ0Z1WlhkVFkyVnVZWEpwYnk1dVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYm1WM1UyTmxibUZ5YVc4dWJtRnRaU0E5SUhCeWIyMXdkQ2duUlc1MFpYSWdjMk5sYm1GeWFXOGdibUZ0WlNjcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2JtVjNVMk5sYm1GeWFXOHVibUZ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5OalpXNWhjbWx2Y3k1d2RYTm9LRzVsZDFOalpXNWhjbWx2S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6WVhabFNHRnVaR3hsY25NZ0ppWWdjMkYyWlVoaGJtUnNaWEp6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSE5oZG1WSVlXNWtiR1Z5Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMkYyWlVoaGJtUnNaWEp6VzJsZEtHNWxkMU5qWlc1aGNtbHZMQ0IxZEcxbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUNkTVQwRkVSVVFuTzF4dVhHNGdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkU1JVTlBVa1JKVGtkZlUxUlBVRkJGUkNjcE8xeHVYRzRnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lVbVZqYjNKa2FXNW5JRk4wYjNCd1pXUmNJaXdnYm1WM1UyTmxibUZ5YVc4cE8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCc2IyRmtVMlYwZEdsdVozTTZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2MyVjBkR2x1WjNNZ1BTQjFkRzFsTG5ObGRIUnBibWR6SUQwZ2JtVjNJRk5sZEhScGJtZHpLQ2s3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnljeTVzWlc1bmRHZ2dQaUF3SUNZbUlDRm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9KM1YwYldWZmMyTmxibUZ5YVc4bktTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUlDaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnljMXN3WFNobWRXNWpkR2x2YmlBb2NtVnpjQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFIwYVc1bmN5NXpaWFJFWldaaGRXeDBjeWh5WlhOd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemIyeDJaU2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwc0lHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzV5WlhOdmJIWmxLQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYkc5aFpGTjBZWFJsUm5KdmJWTjBiM0poWjJVNklHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlIVjBiV1ZUZEdGMFpWTjBjaUE5SUd4dlkyRnNVM1J2Y21GblpTNW5aWFJKZEdWdEtDZDFkRzFsSnlrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbFUzUmhkR1ZUZEhJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxJRDBnU2xOUFRpNXdZWEp6WlNoMWRHMWxVM1JoZEdWVGRISXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkSFZ6T2lCY0lrbE9TVlJKUVV4SldrbE9SMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOalpXNWhjbWx2Y3pvZ1cxMWNiaUFnSUNBZ0lDQWdJQ0FnSUgwN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlITjBZWFJsTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J6WVhabFUzUmhkR1ZVYjFOMGIzSmhaMlU2SUdaMWJtTjBhVzl1SUNoMWRHMWxVM1JoZEdVcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVlRkR0YwWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYkc5allXeFRkRzl5WVdkbExuTmxkRWwwWlcwb0ozVjBiV1VuTENCS1UwOU9Mbk4wY21sdVoybG1lU2gxZEcxbFUzUmhkR1VwS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3h2WTJGc1UzUnZjbUZuWlM1eVpXMXZkbVZKZEdWdEtDZDFkRzFsSnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ2RXNXNiMkZrT2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSFYwYldVdWMyRjJaVk4wWVhSbFZHOVRkRzl5WVdkbEtITjBZWFJsS1R0Y2JpQWdJQ0I5WEc1OU8xeHVYRzVtZFc1amRHbHZiaUIwYjJkbmJHVklhV2RvYkdsbmFIUW9aV3hsTENCMllXeDFaU2tnZTF4dUlDQWdJQ1FvWld4bEtTNTBiMmRuYkdWRGJHRnpjeWduZFhSdFpTMTJaWEpwWm5rbkxDQjJZV3gxWlNrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUhSdloyZHNaVkpsWVdSNUtHVnNaU3dnZG1Gc2RXVXBJSHRjYmlBZ0lDQWtLR1ZzWlNrdWRHOW5aMnhsUTJ4aGMzTW9KM1YwYldVdGNtVmhaSGtuTENCMllXeDFaU2s3WEc1OVhHNWNiaThxS2x4dUlDb2dTV1lnZVc5MUlHTnNhV05ySUc5dUlHRWdjM0JoYmlCcGJpQmhJR3hoWW1Wc0xDQjBhR1VnYzNCaGJpQjNhV3hzSUdOc2FXTnJMRnh1SUNvZ2RHaGxiaUIwYUdVZ1luSnZkM05sY2lCM2FXeHNJR1pwY21VZ2RHaGxJR05zYVdOcklHVjJaVzUwSUdadmNpQjBhR1VnYVc1d2RYUWdZMjl1ZEdGcGJtVmtJSGRwZEdocGJpQjBhR1VnYzNCaGJpeGNiaUFxSUZOdkxDQjNaU0J2Ym14NUlIZGhiblFnZEc4Z2RISmhZMnNnZEdobElHbHVjSFYwSUdOc2FXTnJjeTVjYmlBcUwxeHVablZ1WTNScGIyNGdhWE5PYjNSSmJreGhZbVZzVDNKV1lXeHBaQ2hsYkdVcElIdGNiaUFnSUNCeVpYUjFjbTRnSkNobGJHVXBMbkJoY21WdWRITW9KMnhoWW1Wc0p5a3ViR1Z1WjNSb0lEMDlJREFnZkh4Y2JpQWdJQ0FnSUNBZ0lDQmxiR1V1Ym05a1pVNWhiV1V1ZEc5TWIzZGxja05oYzJVb0tTQTlQU0FuYVc1d2RYUW5PMXh1ZlZ4dVhHNTJZWElnZEdsdFpYSnpJRDBnVzEwN1hHNWNibVoxYm1OMGFXOXVJR2x1YVhSRmRtVnVkRWhoYm1Sc1pYSnpLQ2tnZTF4dVhHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCbGRtVnVkSE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdaRzlqZFcxbGJuUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpaGxkbVZ1ZEhOYmFWMHNJQ2htZFc1amRHbHZiaUFvWlhaMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhR0Z1Wkd4bGNpQTlJR1oxYm1OMGFXOXVJQ2hsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1V1YVhOVWNtbG5aMlZ5S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1V1ZEdGeVoyVjBMbWhoYzBGMGRISnBZblYwWlNBbUpseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FoWlM1MFlYSm5aWFF1YUdGelFYUjBjbWxpZFhSbEtDZGtZWFJoTFdsbmJtOXlaU2NwSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ1FvWlM1MFlYSm5aWFFwTG5CaGNtVnVkSE1vWENKYlpHRjBZUzFwWjI1dmNtVmRYQ0lwTG14bGJtZDBhQ0E5UFNBd0lDWW1YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdselRtOTBTVzVNWVdKbGJFOXlWbUZzYVdRb1pTNTBZWEpuWlhRcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR2xrZUNBOUlIVjBiV1V1YzNSaGRHVXVjM1JsY0hNdWJHVnVaM1JvTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCaGNtZHpJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCc2IyTmhkRzl5T2lCMWRHMWxMbU55WldGMFpVVnNaVzFsYm5STWIyTmhkRzl5S0dVdWRHRnlaMlYwS1Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhScGJXVnlPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dVdWQyaHBZMmdnZkh3Z1pTNWlkWFIwYjI0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZWEpuY3k1aWRYUjBiMjRnUFNCbExuZG9hV05vSUh4OElHVXVZblYwZEc5dU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaGxkblFnUFQwZ0oyMXZkWE5sYjNabGNpY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5bloyeGxTR2xuYUd4cFoyaDBLR1V1ZEdGeVoyVjBMQ0IwY25WbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2x0WlhKekxuQjFjMmdvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaV3hsYldWdWREb2daUzUwWVhKblpYUXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFXMWxjam9nYzJWMFZHbHRaVzkxZENobWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzluWjJ4bFVtVmhaSGtvWlM1MFlYSm5aWFFzSUhSeWRXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN3Z05UQXdLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMmRDQTlQU0FuYlc5MWMyVnZkWFFuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkR2x0WlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEdsdFpYSnpXMmxkTG1Wc1pXMWxiblFnUFQwZ1pTNTBZWEpuWlhRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpiR1ZoY2xScGJXVnZkWFFvZEdsdFpYSnpXMmxkTG5ScGJXVnlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYVcxbGNuTXVjM0JzYVdObEtHa3NJREVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWU1pXRmtlU2hsTG5SaGNtZGxkQ3dnWm1Gc2MyVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hsZG5RZ1BUMGdKMk5vWVc1blpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWVhKbmN5NTJZV3gxWlNBOUlHVXVkR0Z5WjJWMExuWmhiSFZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVm5hWE4wWlhKRmRtVnVkQ2hsZG5Rc0lHRnlaM01zSUdsa2VDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJJUVVOTElHWnZjaUIwWlhOMGFXNW5YRzRnSUNBZ0lDQWdJQ0FnSUNBb2RYUnRaUzVsZG1WdWRFeHBjM1JsYm1WeWN5QTlJSFYwYldVdVpYWmxiblJNYVhOMFpXNWxjbk1nZkh3Z2UzMHBXMlYyZEYwZ1BTQm9ZVzVrYkdWeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR2hoYm1Sc1pYSTdYRzRnSUNBZ0lDQWdJSDBwS0dWMlpXNTBjMXRwWFNrc0lIUnlkV1VwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSFpoY2lCZmRHOWZZWE5qYVdrZ1BTQjdYRzRnSUNBZ0lDQWdJQ2N4T0Rnbk9pQW5ORFFuTEZ4dUlDQWdJQ0FnSUNBbk1UQTVKem9nSnpRMUp5eGNiaUFnSUNBZ0lDQWdKekU1TUNjNklDYzBOaWNzWEc0Z0lDQWdJQ0FnSUNjeE9URW5PaUFuTkRjbkxGeHVJQ0FnSUNBZ0lDQW5NVGt5SnpvZ0p6azJKeXhjYmlBZ0lDQWdJQ0FnSnpJeU1DYzZJQ2M1TWljc1hHNGdJQ0FnSUNBZ0lDY3lNakluT2lBbk16a25MRnh1SUNBZ0lDQWdJQ0FuTWpJeEp6b2dKemt6Snl4Y2JpQWdJQ0FnSUNBZ0p6SXhPU2M2SUNjNU1TY3NYRzRnSUNBZ0lDQWdJQ2N4TnpNbk9pQW5ORFVuTEZ4dUlDQWdJQ0FnSUNBbk1UZzNKem9nSnpZeEp5d2dMeTlKUlNCTFpYa2dZMjlrWlhOY2JpQWdJQ0FnSUNBZ0p6RTROaWM2SUNjMU9TY3NJQzh2U1VVZ1MyVjVJR052WkdWelhHNGdJQ0FnSUNBZ0lDY3hPRGtuT2lBbk5EVW5JQzh2U1VVZ1MyVjVJR052WkdWelhHNGdJQ0FnZlR0Y2JseHVJQ0FnSUhaaGNpQnphR2xtZEZWd2N5QTlJSHRjYmlBZ0lDQWdJQ0FnWENJNU5sd2lPaUJjSW41Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kwT1Z3aU9pQmNJaUZjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFNRndpT2lCY0lrQmNJaXhjYmlBZ0lDQWdJQ0FnWENJMU1Wd2lPaUJjSWlOY0lpeGNiaUFnSUNBZ0lDQWdYQ0kxTWx3aU9pQmNJaVJjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFNMXdpT2lCY0lpVmNJaXhjYmlBZ0lDQWdJQ0FnWENJMU5Gd2lPaUJjSWw1Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kxTlZ3aU9pQmNJaVpjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFObHdpT2lCY0lpcGNJaXhjYmlBZ0lDQWdJQ0FnWENJMU4xd2lPaUJjSWloY0lpeGNiaUFnSUNBZ0lDQWdYQ0kwT0Z3aU9pQmNJaWxjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTBOVndpT2lCY0lsOWNJaXhjYmlBZ0lDQWdJQ0FnWENJMk1Wd2lPaUJjSWl0Y0lpeGNiaUFnSUNBZ0lDQWdYQ0k1TVZ3aU9pQmNJbnRjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTVNMXdpT2lCY0luMWNJaXhjYmlBZ0lDQWdJQ0FnWENJNU1sd2lPaUJjSW54Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kxT1Z3aU9pQmNJanBjSWl4Y2JpQWdJQ0FnSUNBZ1hDSXpPVndpT2lCY0lseGNYQ0pjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTBORndpT2lCY0lqeGNJaXhjYmlBZ0lDQWdJQ0FnWENJME5sd2lPaUJjSWo1Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kwTjF3aU9pQmNJajljSWx4dUlDQWdJSDA3WEc1Y2JpQWdJQ0JtZFc1amRHbHZiaUJyWlhsUWNtVnpjMGhoYm1Sc1pYSWdLR1VwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR1V1YVhOVWNtbG5aMlZ5S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdU8xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoMWRHMWxMbWx6VW1WamIzSmthVzVuS0NrZ0ppWWdaUzUwWVhKblpYUXVhR0Z6UVhSMGNtbGlkWFJsSUNZbUlDRmxMblJoY21kbGRDNW9ZWE5CZEhSeWFXSjFkR1VvSjJSaGRHRXRhV2R1YjNKbEp5a2dKaVlnSkNobExuUmhjbWRsZENrdWNHRnlaVzUwY3loY0lsdGtZWFJoTFdsbmJtOXlaVjFjSWlrdWJHVnVaM1JvSUQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJqSUQwZ1pTNTNhR2xqYUR0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1ZFOUVUem9nUkc5bGMyNG5kQ0IzYjNKcklIZHBkR2dnWTJGd2N5QnNiMk5yWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMMjV2Y20xaGJHbDZaU0JyWlhsRGIyUmxYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9YM1J2WDJGelkybHBMbWhoYzA5M2JsQnliM0JsY25SNUtHTXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWXlBOUlGOTBiMTloYzJOcGFWdGpYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ0ZsTG5Ob2FXWjBTMlY1SUNZbUlDaGpJRDQ5SURZMUlDWW1JR01nUEQwZ09UQXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWXlBOUlGTjBjbWx1Wnk1bWNtOXRRMmhoY2tOdlpHVW9ZeUFySURNeUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb1pTNXphR2xtZEV0bGVTQW1KaUJ6YUdsbWRGVndjeTVvWVhOUGQyNVFjbTl3WlhKMGVTaGpLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUM4dloyVjBJSE5vYVdaMFpXUWdhMlY1UTI5a1pTQjJZV3gxWlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdNZ1BTQnphR2xtZEZWd2MxdGpYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1l5QTlJRk4wY21sdVp5NW1jbTl0UTJoaGNrTnZaR1VvWXlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVm5hWE4wWlhKRmRtVnVkQ2duYTJWNWNISmxjM01uTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JHOWpZWFJ2Y2pvZ2RYUnRaUzVqY21WaGRHVkZiR1Z0Wlc1MFRHOWpZWFJ2Y2lobExuUmhjbWRsZENrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2EyVjVPaUJqTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhCeVpYWldZV3gxWlRvZ1pTNTBZWEpuWlhRdWRtRnNkV1VzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc2RXVTZJR1V1ZEdGeVoyVjBMblpoYkhWbElDc2dZeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JyWlhsRGIyUmxPaUJsTG10bGVVTnZaR1ZjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdaRzlqZFcxbGJuUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25hMlY1Y0hKbGMzTW5MQ0JyWlhsUWNtVnpjMGhoYm1Sc1pYSXNJSFJ5ZFdVcE8xeHVYRzRnSUNBZ0x5OGdTRUZEU3lCbWIzSWdkR1Z6ZEdsdVoxeHVJQ0FnSUNoMWRHMWxMbVYyWlc1MFRHbHpkR1Z1WlhKeklEMGdkWFJ0WlM1bGRtVnVkRXhwYzNSbGJtVnljeUI4ZkNCN2ZTbGJKMnRsZVhCeVpYTnpKMTBnUFNCclpYbFFjbVZ6YzBoaGJtUnNaWEk3WEc1OVhHNWNibVoxYm1OMGFXOXVJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2h1WVcxbEtTQjdYRzRnSUNBZ2JtRnRaU0E5SUc1aGJXVXVjbVZ3YkdGalpTZ3ZXMXhjVzEwdkxDQmNJbHhjWEZ4YlhDSXBMbkpsY0d4aFkyVW9MMXRjWEYxZEx5d2dYQ0pjWEZ4Y1hWd2lLVHRjYmlBZ0lDQjJZWElnY21WblpYZ2dQU0J1WlhjZ1VtVm5SWGh3S0Z3aVcxeGNYRncvSmwxY0lpQXJJRzVoYldVZ0t5QmNJajBvVzE0bUkxMHFLVndpS1N4Y2JpQWdJQ0FnSUNBZ2NtVnpkV3gwY3lBOUlISmxaMlY0TG1WNFpXTW9iRzlqWVhScGIyNHVjMlZoY21Ob0tUdGNiaUFnSUNCeVpYUjFjbTRnY21WemRXeDBjeUE5UFQwZ2JuVnNiQ0EvSUZ3aVhDSWdPaUJrWldOdlpHVlZVa2xEYjIxd2IyNWxiblFvY21WemRXeDBjMXN4WFM1eVpYQnNZV05sS0M5Y1hDc3ZaeXdnWENJZ1hDSXBLVHRjYm4xY2JseHVablZ1WTNScGIyNGdZbTl2ZEhOMGNtRndWWFJ0WlNncElIdGNiaUFnYVdZZ0tHUnZZM1Z0Wlc1MExuSmxZV1I1VTNSaGRHVWdQVDBnWENKamIyMXdiR1YwWlZ3aUtTQjdYRzRnSUNBZ2RYUnRaUzVwYm1sMEtDa3VkR2hsYmlobWRXNWpkR2x2YmlBb0tTQjdYRzVjYmlBZ0lDQWdJQ0FnYVc1cGRFVjJaVzUwU0dGdVpHeGxjbk1vS1R0Y2JseHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxaMmx6ZEdWeVJYWmxiblFvWENKc2IyRmtYQ0lzSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWNtdzZJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NISnZkRzlqYjJ3NklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1d2NtOTBiMk52YkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhRzl6ZERvZ2QybHVaRzkzTG14dlkyRjBhVzl1TG1odmMzUXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObFlYSmphRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbk5sWVhKamFDeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYUdGemFEb2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxtaGhjMmhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBwTzF4dUlDQjlYRzU5WEc1Y2JtSnZiM1J6ZEhKaGNGVjBiV1VvS1R0Y2JtUnZZM1Z0Wlc1MExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0ozSmxZV1I1YzNSaGRHVmphR0Z1WjJVbkxDQmliMjkwYzNSeVlYQlZkRzFsS1R0Y2JseHVkMmx1Wkc5M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0ozVnViRzloWkNjc0lHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQjFkRzFsTG5WdWJHOWhaQ2dwTzF4dWZTd2dkSEoxWlNrN1hHNWNibmRwYm1SdmR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGxjbkp2Y2ljc0lHWjFibU4wYVc5dUlDaGxjbklwSUh0Y2JpQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE5qY21sd2RDQkZjbkp2Y2pvZ1hDSWdLeUJsY25JdWJXVnpjMkZuWlNBcklGd2lPbHdpSUNzZ1pYSnlMblZ5YkNBcklGd2lMRndpSUNzZ1pYSnlMbXhwYm1VZ0t5QmNJanBjSWlBcklHVnljaTVqYjJ3cE8xeHVmU2s3WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2RYUnRaVHRjYmlKZGZRPT0iXX0=
