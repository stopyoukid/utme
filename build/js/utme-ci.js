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


//# sourceURL=/Developer/atsid/Projects/utme/utme/src/js/utme.js
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./selectorFinder":6,"./settings":7,"./simulate":8,"./utils":9,"es6-promise":2}]},{},[4,5,6,7,8,9,10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvZXM2LXByb21pc2UuanMiLCJub2RlX21vZHVsZXMvZmlsZXNhdmVyLmpzL0ZpbGVTYXZlci5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvRGV2ZWxvcGVyL2F0c2lkL1Byb2plY3RzL3V0bWUvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9EZXZlbG9wZXIvYXRzaWQvUHJvamVjdHMvdXRtZS91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQUEsQUFBSSxFQUFBLENBQUEsSUFBRyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUM7QUFDN0IsQUFBSSxFQUFBLENBQUEsTUFBSyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7QUFFcEMsS0FBSyxRQUFRLEVBQUksQ0FBQSxJQUFHLG9CQUFvQixB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R0FBRSxDQUFHO0FBQzVDLEtBQUcsVUFBVSxBQUFDLENBQUMsZ0JBQWUsRUFBSSxDQUFBLEdBQUUsUUFBUSxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLElBQUksQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxLQUFLLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsSUFBSSxDQUFDLENBQUM7QUFDbkcsQ0FBQyxDQUFDO0FBRUYsS0FBSyxRQUFRLEVBQUksS0FBRyxDQUFDO0FBRXdzMUUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4xXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRfaXNBcnJheTtcblxuICAgIGlmICghQXJyYXkuaXNBcnJheSkge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRpc0FycmF5ID0gJCR1dGlscyQkX2lzQXJyYXk7XG4gICAgdmFyICQkdXRpbHMkJG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG4gICAgZnVuY3Rpb24gJCR1dGlscyQkRigpIHsgfVxuXG4gICAgdmFyICQkdXRpbHMkJG9fY3JlYXRlID0gKE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY29uZCBhcmd1bWVudCBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICAkJHV0aWxzJCRGLnByb3RvdHlwZSA9IG87XG4gICAgICByZXR1cm4gbmV3ICQkdXRpbHMkJEYoKTtcbiAgICB9KTtcblxuICAgIHZhciAkJGFzYXAkJGxlbiA9IDA7XG5cbiAgICB2YXIgJCRhc2FwJCRkZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuXSA9IGNhbGxiYWNrO1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgJCRhc2FwJCRsZW4gKz0gMjtcbiAgICAgIGlmICgkJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gICAgdmFyICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyICQkYXNhcCQkaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygkJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3ICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoJCRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gJCRhc2FwJCRmbHVzaDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dCgkJGFzYXAkJGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSAkJGFzYXAkJHF1ZXVlW2ldO1xuICAgICAgICB2YXIgYXJnID0gJCRhc2FwJCRxdWV1ZVtpKzFdO1xuXG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpKzFdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAkJGFzYXAkJGxlbiA9IDA7XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkc2NoZWR1bGVGbHVzaDtcblxuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkbm9vcCgpIHt9XG4gICAgdmFyICQkJGludGVybmFsJCRQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyICQkJGludGVybmFsJCRGVUxGSUxMRUQgPSAxO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVycm9yID0gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gICAgICBpZiAodGhlbmFibGUuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gJCQkaW50ZXJuYWwkJGdldFRoZW4obWF5YmVUaGVuYWJsZSk7XG5cbiAgICAgICAgaWYgKHRoZW4gPT09ICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSAkJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAvLyBub29wXG4gICAgICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJG1ha2VTZXR0bGVkUmVzdWx0KHN0YXRlLCBwb3NpdGlvbiwgdmFsdWUpIHtcbiAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAnZnVsZmlsbGVkJyxcbiAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdyZWplY3RlZCcsXG4gICAgICAgICAgcmVhc29uOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0LCBhYm9ydE9uUmVqZWN0LCBsYWJlbCkge1xuICAgICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICB0aGlzLl9hYm9ydE9uUmVqZWN0ID0gYWJvcnRPblJlamVjdDtcblxuICAgICAgaWYgKHRoaXMuX3ZhbGlkYXRlSW5wdXQoaW5wdXQpKSB7XG4gICAgICAgIHRoaXMuX2lucHV0ICAgICA9IGlucHV0O1xuICAgICAgICB0aGlzLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgICB0aGlzLl9pbml0KCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgICB0aGlzLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHRoaXMucHJvbWlzZSwgdGhpcy5fdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiAkJHV0aWxzJCRpc0FycmF5KGlucHV0KTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRpb25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgJCQkZW51bWVyYXRvciQkZGVmYXVsdCA9ICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3I7XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGVuZ3RoICA9IHRoaXMubGVuZ3RoO1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG4gICAgICB2YXIgaW5wdXQgICA9IHRoaXMuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICAgIGlmICgkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgZW50cnkuX29uZXJyb3IgPSBudWxsO1xuICAgICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChjLnJlc29sdmUoZW50cnkpLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgZW50cnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcblxuICAgICAgICBpZiAodGhpcy5fYWJvcnRPblJlamVjdCAmJiBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdChzdGF0ZSwgaSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX21ha2VSZXN1bHQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFsbChlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgcmV0dXJuIG5ldyAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0KHRoaXMsIGVudHJpZXMsIHRydWUgLyogYWJvcnQgb24gcmVqZWN0ICovLCBsYWJlbCkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmFjZShlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG5cbiAgICAgIGlmICghJCR1dGlscyQkaXNBcnJheShlbnRyaWVzKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbG1lbnQodmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVzb2x2ZShvYmplY3QsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVqZWN0KHJlYXNvbiwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyID0gMDtcblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0ID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlO1xuXG4gICAgLyoqXG4gICAgICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gICAgICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICAgICAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2XigJlzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICB0aGlzLl9pZCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlcisrO1xuICAgICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgICBpZiAoJCQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gJCRwcm9taXNlJGFsbCQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9ICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZXNvbHZlID0gJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9ICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQ7XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBzdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQgJiYgIW9uUmVqZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJlbnQuX3Jlc3VsdDtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbc3RhdGUgLSAxXTtcbiAgICAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSxcblxuICAgIC8qKlxuICAgICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmNocm9ub3VzXG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQXV0aG9yKCk7XG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfVxuXG4gICAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgY2F0Y2hcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQpIHtcbiAgICAgICAgbG9jYWwgPSB3aW5kb3c7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHZhciBlczZQcm9taXNlU3VwcG9ydCA9XG4gICAgICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgICAgIC8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgbWlzc2luZyBmcm9tXG4gICAgICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJlamVjdFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgLy8gT2xkZXIgdmVyc2lvbiBvZiB0aGUgc3BlYyBoYWQgYSByZXNvbHZlciBvYmplY3RcbiAgICAgICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZTtcbiAgICAgICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgICAgICByZXR1cm4gJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgICAgICBsb2NhbC5Qcm9taXNlID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0O1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlID0ge1xuICAgICAgJ1Byb21pc2UnOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzWydFUzZQcm9taXNlJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxufSkuY2FsbCh0aGlzKTsiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMjAxNC0xMi0xN1xuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IFgxMS9NSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBc1xuICAvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG4gIHx8ICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYi5iaW5kKG5hdmlnYXRvcikpXG4gIC8vIEV2ZXJ5b25lIGVsc2VcbiAgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG5cdCAgICAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBkb2MuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcblx0XHRcdGV2ZW50LmluaXRNb3VzZUV2ZW50KFxuXHRcdFx0XHRcImNsaWNrXCIsIHRydWUsIGZhbHNlLCB2aWV3LCAwLCAwLCAwLCAwLCAwXG5cdFx0XHRcdCwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIG51bGxcblx0XHRcdCk7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIHdlYmtpdF9yZXFfZnMgPSB2aWV3LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtXG5cdFx0LCByZXFfZnMgPSB2aWV3LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdlYmtpdF9yZXFfZnMgfHwgdmlldy5tb3pSZXF1ZXN0RmlsZVN5c3RlbVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdCwgZnNfbWluX3NpemUgPSAwXG5cdFx0Ly8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zNzUyOTcjYzcgYW5kXG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2NvbW1pdC80ODU5MzBhI2NvbW1pdGNvbW1lbnQtODc2ODA0N1xuXHRcdC8vIGZvciB0aGUgcmVhc29uaW5nIGJlaGluZCB0aGUgdGltZW91dCBhbmQgcmV2b2NhdGlvbiBmbG93XG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSA1MDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRpZiAodmlldy5jaHJvbWUpIHtcblx0XHRcdFx0cmV2b2tlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUpIHtcblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGJsb2JfY2hhbmdlZCA9IGZhbHNlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIHRhcmdldF92aWV3XG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKGJsb2JfY2hhbmdlZCB8fCAhb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0YXJnZXRfdmlldykge1xuXHRcdFx0XHRcdFx0dGFyZ2V0X3ZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBuZXdfdGFiID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKG5ld190YWIgPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBzYWZhcmkgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0XHRcdFx0Ly9BcHBsZSBkbyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwOi8vYml0Lmx5LzFrWmZmUklcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGFib3J0YWJsZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoZmlsZXNhdmVyLnJlYWR5U3RhdGUgIT09IGZpbGVzYXZlci5ET05FKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGNyZWF0ZV9pZl9ub3RfZm91bmQgPSB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfVxuXHRcdFx0XHQsIHNsaWNlXG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0aWYgKCFuYW1lKSB7XG5cdFx0XHRcdG5hbWUgPSBcImRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gT2JqZWN0IGFuZCB3ZWIgZmlsZXN5c3RlbSBVUkxzIGhhdmUgYSBwcm9ibGVtIHNhdmluZyBpbiBHb29nbGUgQ2hyb21lIHdoZW5cblx0XHRcdC8vIHZpZXdlZCBpbiBhIHRhYiwgc28gSSBmb3JjZSBzYXZlIHdpdGggYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXG5cdFx0XHQvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD05MTE1OFxuXHRcdFx0Ly8gVXBkYXRlOiBHb29nbGUgZXJyYW50bHkgY2xvc2VkIDkxMTU4LCBJIHN1Ym1pdHRlZCBpdCBhZ2Fpbjpcblx0XHRcdC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zODk2NDJcblx0XHRcdGlmICh2aWV3LmNocm9tZSAmJiB0eXBlICYmIHR5cGUgIT09IGZvcmNlX3NhdmVhYmxlX3R5cGUpIHtcblx0XHRcdFx0c2xpY2UgPSBibG9iLnNsaWNlIHx8IGJsb2Iud2Via2l0U2xpY2U7XG5cdFx0XHRcdGJsb2IgPSBzbGljZS5jYWxsKGJsb2IsIDAsIGJsb2Iuc2l6ZSwgZm9yY2Vfc2F2ZWFibGVfdHlwZSk7XG5cdFx0XHRcdGJsb2JfY2hhbmdlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHQvLyBTaW5jZSBJIGNhbid0IGJlIHN1cmUgdGhhdCB0aGUgZ3Vlc3NlZCBtZWRpYSB0eXBlIHdpbGwgdHJpZ2dlciBhIGRvd25sb2FkXG5cdFx0XHQvLyBpbiBXZWJLaXQsIEkgYXBwZW5kIC5kb3dubG9hZCB0byB0aGUgZmlsZW5hbWUuXG5cdFx0XHQvLyBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjU0NDBcblx0XHRcdGlmICh3ZWJraXRfcmVxX2ZzICYmIG5hbWUgIT09IFwiZG93bmxvYWRcIikge1xuXHRcdFx0XHRuYW1lICs9IFwiLmRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZSB8fCB3ZWJraXRfcmVxX2ZzKSB7XG5cdFx0XHRcdHRhcmdldF92aWV3ID0gdmlldztcblx0XHRcdH1cblx0XHRcdGlmICghcmVxX2ZzKSB7XG5cdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGZzX21pbl9zaXplICs9IGJsb2Iuc2l6ZTtcblx0XHRcdHJlcV9mcyh2aWV3LlRFTVBPUkFSWSwgZnNfbWluX3NpemUsIGFib3J0YWJsZShmdW5jdGlvbihmcykge1xuXHRcdFx0XHRmcy5yb290LmdldERpcmVjdG9yeShcInNhdmVkXCIsIGNyZWF0ZV9pZl9ub3RfZm91bmQsIGFib3J0YWJsZShmdW5jdGlvbihkaXIpIHtcblx0XHRcdFx0XHR2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZGlyLmdldEZpbGUobmFtZSwgY3JlYXRlX2lmX25vdF9mb3VuZCwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0ZmlsZS5jcmVhdGVXcml0ZXIoYWJvcnRhYmxlKGZ1bmN0aW9uKHdyaXRlcikge1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldF92aWV3LmxvY2F0aW9uLmhyZWYgPSBmaWxlLnRvVVJMKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlZW5kXCIsIGV2ZW50KTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldm9rZShmaWxlKTtcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgZXJyb3IgPSB3cml0ZXIuZXJyb3I7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZXJyb3IuY29kZSAhPT0gZXJyb3IuQUJPUlRfRVJSKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgYWJvcnRcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyW1wib25cIiArIGV2ZW50XSA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF07XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLndyaXRlKGJsb2IpO1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyLmFib3J0KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuV1JJVElORztcblx0XHRcdFx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdFx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRkaXIuZ2V0RmlsZShuYW1lLCB7Y3JlYXRlOiBmYWxzZX0sIGFib3J0YWJsZShmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRcdFx0XHQvLyBkZWxldGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0c1xuXHRcdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdHNhdmUoKTtcblx0XHRcdFx0XHR9KSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXguY29kZSA9PT0gZXguTk9UX0ZPVU5EX0VSUikge1xuXHRcdFx0XHRcdFx0XHRzYXZlKCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmc19lcnJvcigpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lKTtcblx0XHR9XG5cdDtcblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgZmlsZXNhdmVyID0gdGhpcztcblx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJhYm9ydFwiKTtcblx0fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPSBudWxsKSkge1xuICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwidmFyIHV0bWUgPSByZXF1aXJlKCcuLi91dG1lJyk7XG52YXIgc2F2ZUFzID0gcmVxdWlyZSgnZmlsZXNhdmVyLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gdXRtZS5yZWdpc3RlclNhdmVIYW5kbGVyKGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkoc2NlbmFyaW8sIG51bGwsIFwiIFwiKV0sIHt0eXBlOiBcInRleHQvcGxhaW47Y2hhcnNldD11dGYtOFwifSk7XG4gICBzYXZlQXMoYmxvYiwgc2NlbmFyaW8ubmFtZSArIFwiLmpzb25cIik7XG59KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWRISmhibk5tYjNKdFpXUXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOUVaWFpsYkc5d1pYSXZZWFJ6YVdRdlVISnZhbVZqZEhNdmRYUnRaUzkxZEcxbEwzTnlZeTlxY3k5d1pYSnphWE4wWlhKekwzVjBiV1V0Wm1sc1pTMXdaWEp6YVhOMFpYSXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFc1NVRkJTU3hKUVVGSkxFZEJRVWNzVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPMEZCUXpsQ0xFbEJRVWtzVFVGQlRTeEhRVUZITEU5QlFVOHNRMEZCUXl4alFVRmpMRU5CUVVNc1EwRkJRenM3UVVGRmNrTXNUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zYlVKQlFXMUNMRU5CUVVNc1ZVRkJWU3hSUVVGUkxFVkJRVVU3UjBGRE0wUXNTVUZCU1N4SlFVRkpMRWRCUVVjc1NVRkJTU3hKUVVGSkxFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRkZCUVZFc1JVRkJSU3hKUVVGSkxFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTXNSVUZCUlN4RFFVRkRMRWxCUVVrc1JVRkJSU3d3UWtGQk1FSXNRMEZCUXl4RFFVRkRMRU5CUVVNN1IwRkRMMFlzVFVGQlRTeERRVUZETEVsQlFVa3NSVUZCUlN4UlFVRlJMRU5CUVVNc1NVRkJTU3hIUVVGSExFOUJRVThzUTBGQlF5eERRVUZETzBOQlEzaERMRU5CUVVNaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SjJZWElnZFhSdFpTQTlJSEpsY1hWcGNtVW9KeTR1TDNWMGJXVW5LVHRjYm5aaGNpQnpZWFpsUVhNZ1BTQnlaWEYxYVhKbEtDZG1hV3hsYzJGMlpYSXVhbk1uS1R0Y2JseHViVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQjFkRzFsTG5KbFoybHpkR1Z5VTJGMlpVaGhibVJzWlhJb1puVnVZM1JwYjI0Z0tITmpaVzVoY21sdktTQjdYRzRnSUNCMllYSWdZbXh2WWlBOUlHNWxkeUJDYkc5aUtGdEtVMDlPTG5OMGNtbHVaMmxtZVNoelkyVnVZWEpwYnl3Z2JuVnNiQ3dnWENJZ1hDSXBYU3dnZTNSNWNHVTZJRndpZEdWNGRDOXdiR0ZwYmp0amFHRnljMlYwUFhWMFppMDRYQ0o5S1R0Y2JpQWdJSE5oZG1WQmN5aGliRzlpTENCelkyVnVZWEpwYnk1dVlXMWxJQ3NnWENJdWFuTnZibHdpS1R0Y2JuMHBPeUpkZlE9PSIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZS5qcycpO1xudmFyIHNlcnZlclJlcG9ydGVyID0ge1xuICAgIGJhc2VVcmw6IGdldFBhcmFtZXRlckJ5TmFtZShcInV0bWVfdGVzdF9zZXJ2ZXJcIikgfHwgXCJodHRwOi8vMC4wLjAuMDo5MDQzL1wiLFxuICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBzZXJ2ZXJSZXBvcnRlci5iYXNlVXJsICsgXCJlcnJvclwiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogZXJyb3IgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH0sXG4gICAgbG9nOiBmdW5jdGlvbiAobG9nLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogIHNlcnZlclJlcG9ydGVyLmJhc2VVcmwgKyBcImxvZ1wiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogbG9nIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmxvZyhsb2cpO1xuICAgIH0sXG5cbiAgICBsb2FkU2NlbmFyaW86IGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAganNvbnA6IFwiY2FsbGJhY2tcIixcblxuICAgICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuXG4gICAgICAgICAgICBjcm9zc0RvbWFpbjogdHJ1ZSxcblxuICAgICAgICAgICAgdXJsOiAgc2VydmVyUmVwb3J0ZXIuYmFzZVVybCArIFwic2NlbmFyaW8vXCIgKyBuYW1lLFxuXG4gICAgICAgICAgICAvLyB0ZWxsIGpRdWVyeSB3ZSdyZSBleHBlY3RpbmcgSlNPTlBcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzYXZlU2NlbmFyaW86IGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogc2VydmVyUmVwb3J0ZXIuYmFzZVVybCArIFwic2NlbmFyaW9cIixcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShzY2VuYXJpbywgbnVsbCwgXCIgXCIpLFxuICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBsb2FkU2V0dGluZ3M6IGZ1bmN0aW9uIChjYWxsYmFjaywgZXJyb3IpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcInRleHQvcGxhbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXG4gICAgICAgICAgICB1cmw6ICBzZXJ2ZXJSZXBvcnRlci5iYXNlVXJsICsgXCJzZXR0aW5nc1wiLFxuICAgICAgICAgICAgLy8gdGVsbCBqUXVlcnkgd2UncmUgZXhwZWN0aW5nIEpTT05QXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG51dG1lLnJlZ2lzdGVyUmVwb3J0SGFuZGxlcihzZXJ2ZXJSZXBvcnRlcik7XG51dG1lLnJlZ2lzdGVyTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNjZW5hcmlvKTtcbnV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5zYXZlU2NlbmFyaW8pO1xudXRtZS5yZWdpc3RlclNldHRpbmdzTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNldHRpbmdzKTtcblxuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyQnlOYW1lKG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pZEhKaGJuTm1iM0p0WldRdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5RVpYWmxiRzl3WlhJdllYUnphV1F2VUhKdmFtVmpkSE12ZFhSdFpTOTFkRzFsTDNOeVl5OXFjeTl5WlhCdmNuUmxjbk12YzJWeWRtVnlMWEpsY0c5eWRHVnlMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzU1VGQlNTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRCUVVOcVF5eEpRVUZKTEdOQlFXTXNSMEZCUnp0SlFVTnFRaXhQUVVGUExFVkJRVVVzYTBKQlFXdENMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNTVUZCU1N4elFrRkJjMEk3U1VGRGVrVXNTMEZCU3l4RlFVRkZMRlZCUVZVc1MwRkJTeXhGUVVGRkxGRkJRVkVzUlVGQlJTeEpRVUZKTEVWQlFVVTdVVUZEY0VNc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF6dFZRVU5NTEVsQlFVa3NSVUZCUlN4TlFVRk5PMVZCUTFvc1IwRkJSeXhGUVVGRkxHTkJRV01zUTBGQlF5eFBRVUZQTEVkQlFVY3NUMEZCVHp0VlFVTnlReXhKUVVGSkxFVkJRVVVzUlVGQlJTeEpRVUZKTEVWQlFVVXNTMEZCU3l4RlFVRkZPMVZCUTNKQ0xGRkJRVkVzUlVGQlJTeE5RVUZOTzFOQlEycENMRU5CUVVNc1EwRkJRenRSUVVOSUxFOUJRVThzUTBGQlF5eExRVUZMTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN1MwRkRlRUk3U1VGRFJDeEhRVUZITEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJUdFJRVU5vUXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRE8xVkJRMHdzU1VGQlNTeEZRVUZGTEUxQlFVMDdWVUZEV2l4SFFVRkhMRWRCUVVjc1kwRkJZeXhEUVVGRExFOUJRVThzUjBGQlJ5eExRVUZMTzFWQlEzQkRMRWxCUVVrc1JVRkJSU3hGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVWQlFVVTdWVUZEYmtJc1VVRkJVU3hGUVVGRkxFMUJRVTA3VTBGRGFrSXNRMEZCUXl4RFFVRkRPMUZCUTBnc1QwRkJUeXhEUVVGRExFZEJRVWNzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTjZRaXhMUVVGTE96dEpRVVZFTEZsQlFWa3NSVUZCUlN4VlFVRlZMRWxCUVVrc1JVRkJSU3hSUVVGUkxFVkJRVVU3VVVGRGNFTXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRCUVVObUxGbEJRVmtzUzBGQlN5eEZRVUZGTEZWQlFWVTdPMEZCUlRkQ0xGbEJRVmtzVjBGQlZ5eEZRVUZGTEdsRFFVRnBRenM3UVVGRk1VUXNXVUZCV1N4WFFVRlhMRVZCUVVVc1NVRkJTVHM3UVVGRk4wSXNXVUZCV1N4SFFVRkhMRWRCUVVjc1kwRkJZeXhEUVVGRExFOUJRVThzUjBGQlJ5eFhRVUZYTEVkQlFVY3NTVUZCU1R0QlFVTTNSRHM3UVVGRlFTeFpRVUZaTEZGQlFWRXNSVUZCUlN4UFFVRlBPenRaUVVWcVFpeFBRVUZQTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1owSkJRM0pDTEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOc1FqdFRRVU5LTEVOQlFVTXNRMEZCUXp0QlFVTllMRXRCUVVzN08wbEJSVVFzV1VGQldTeEZRVUZGTEZWQlFWVXNVVUZCVVN4RlFVRkZPMUZCUXpsQ0xFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTTdWVUZEVEN4SlFVRkpMRVZCUVVVc1RVRkJUVHRWUVVOYUxFZEJRVWNzUlVGQlJTeGpRVUZqTEVOQlFVTXNUMEZCVHl4SFFVRkhMRlZCUVZVN1ZVRkRlRU1zU1VGQlNTeEZRVUZGTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVOQlFVTTdWVUZEZWtNc1VVRkJVU3hGUVVGRkxFMUJRVTA3VlVGRGFFSXNWMEZCVnl4RlFVRkZMR3RDUVVGclFqdFRRVU5vUXl4RFFVRkRMRU5CUVVNN1FVRkRXQ3hMUVVGTE96dEpRVVZFTEZsQlFWa3NSVUZCUlN4VlFVRlZMRkZCUVZFc1JVRkJSU3hMUVVGTExFVkJRVVU3VVVGRGNrTXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOSUxGZEJRVmNzUlVGQlJTd3dRa0ZCTUVJN1dVRkRka01zVjBGQlZ5eEZRVUZGTEVsQlFVazdRVUZETjBJc1dVRkJXU3hIUVVGSExFZEJRVWNzWTBGQll5eERRVUZETEU5QlFVOHNSMEZCUnl4VlFVRlZPenRCUVVWeVJDeFpRVUZaTEZGQlFWRXNSVUZCUlN4TlFVRk5PenRaUVVWb1FpeFBRVUZQTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1owSkJRM0pDTEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOc1FqdFpRVU5FTEV0QlFVc3NSVUZCUlN4VlFVRlZMRWRCUVVjc1JVRkJSVHRuUWtGRGJFSXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8yRkJRMlE3VTBGRFNpeERRVUZETEVOQlFVTTdTMEZEVGp0QlFVTk1MRU5CUVVNc1EwRkJRenM3UVVGRlJpeEpRVUZKTEVOQlFVTXNjVUpCUVhGQ0xFTkJRVU1zWTBGQll5eERRVUZETEVOQlFVTTdRVUZETTBNc1NVRkJTU3hEUVVGRExHMUNRVUZ0UWl4RFFVRkRMR05CUVdNc1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6dEJRVU4wUkN4SlFVRkpMRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNZMEZCWXl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8wRkJRM1JFTEVsQlFVa3NRMEZCUXl3eVFrRkJNa0lzUTBGQlF5eGpRVUZqTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNN08wRkJSVGxFTEZOQlFWTXNhMEpCUVd0Q0xFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlF6bENMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU1zVFVGQlRTeEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRPMGxCUXpGRUxFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NUVUZCVFN4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxFZEJRVWNzVjBGQlZ5eERRVUZETzFGQlEycEVMRTlCUVU4c1IwRkJSeXhMUVVGTExFTkJRVU1zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRKUVVNeFF5eFBRVUZQTEU5QlFVOHNTMEZCU3l4SlFVRkpMRWRCUVVjc1JVRkJSU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdkWFJ0WlNBOUlISmxjWFZwY21Vb0p5NHVMM1YwYldVdWFuTW5LVHRjYm5aaGNpQnpaWEoyWlhKU1pYQnZjblJsY2lBOUlIdGNiaUFnSUNCaVlYTmxWWEpzT2lCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb1hDSjFkRzFsWDNSbGMzUmZjMlZ5ZG1WeVhDSXBJSHg4SUZ3aWFIUjBjRG92THpBdU1DNHdMakE2T1RBME15OWNJaXhjYmlBZ0lDQmxjbkp2Y2pvZ1puVnVZM1JwYjI0Z0tHVnljbTl5TENCelkyVnVZWEpwYnl3Z2RYUnRaU2tnZTF4dUlDQWdJQ0FnSUNBa0xtRnFZWGdvZTF4dUlDQWdJQ0FnSUNBZ0lIUjVjR1U2SUZ3aVVFOVRWRndpTEZ4dUlDQWdJQ0FnSUNBZ0lIVnliRG9nYzJWeWRtVnlVbVZ3YjNKMFpYSXVZbUZ6WlZWeWJDQXJJRndpWlhKeWIzSmNJaXhjYmlBZ0lDQWdJQ0FnSUNCa1lYUmhPaUI3SUdSaGRHRTZJR1Z5Y205eUlIMHNYRzRnSUNBZ0lDQWdJQ0FnWkdGMFlWUjVjR1U2SUZ3aWFuTnZibHdpWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQmpiMjV6YjJ4bExtVnljbTl5S0dWeWNtOXlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHeHZaem9nWm5WdVkzUnBiMjRnS0d4dlp5d2djMk5sYm1GeWFXOHNJSFYwYldVcElIdGNiaUFnSUNBZ0lDQWdKQzVoYW1GNEtIdGNiaUFnSUNBZ0lDQWdJQ0IwZVhCbE9pQmNJbEJQVTFSY0lpeGNiaUFnSUNBZ0lDQWdJQ0IxY213NklDQnpaWEoyWlhKU1pYQnZjblJsY2k1aVlYTmxWWEpzSUNzZ1hDSnNiMmRjSWl4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoT2lCN0lHUmhkR0U2SUd4dlp5QjlMRnh1SUNBZ0lDQWdJQ0FnSUdSaGRHRlVlWEJsT2lCY0ltcHpiMjVjSWx4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdZMjl1YzI5c1pTNXNiMmNvYkc5bktUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JHOWhaRk5qWlc1aGNtbHZPaUJtZFc1amRHbHZiaUFvYm1GdFpTd2dZMkZzYkdKaFkyc3BJSHRjYmlBZ0lDQWdJQ0FnSkM1aGFtRjRLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHcHpiMjV3T2lCY0ltTmhiR3hpWVdOclhDSXNYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZiblJsYm5SVWVYQmxPaUJjSW1Gd2NHeHBZMkYwYVc5dUwycHpiMjQ3SUdOb1lYSnpaWFE5ZFhSbUxUaGNJaXhjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdZM0p2YzNORWIyMWhhVzQ2SUhSeWRXVXNYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lIVnliRG9nSUhObGNuWmxjbEpsY0c5eWRHVnlMbUpoYzJWVmNtd2dLeUJjSW5OalpXNWhjbWx2TDF3aUlDc2dibUZ0WlN4Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2RHVnNiQ0JxVVhWbGNua2dkMlVuY21VZ1pYaHdaV04wYVc1bklFcFRUMDVRWEc0Z0lDQWdJQ0FnSUNBZ0lDQmtZWFJoVkhsd1pUb2dYQ0pxYzI5dWNGd2lMRnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkV05qWlhOek9pQm1kVzVqZEdsdmJpQW9jbVZ6Y0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTmhiR3hpWVdOcktISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYzJGMlpWTmpaVzVoY21sdk9pQm1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnSkM1aGFtRjRLSHRjYmlBZ0lDQWdJQ0FnSUNCMGVYQmxPaUJjSWxCUFUxUmNJaXhjYmlBZ0lDQWdJQ0FnSUNCMWNtdzZJSE5sY25abGNsSmxjRzl5ZEdWeUxtSmhjMlZWY213Z0t5QmNJbk5qWlc1aGNtbHZYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVG9nU2xOUFRpNXpkSEpwYm1kcFpua29jMk5sYm1GeWFXOHNJRzUxYkd3c0lGd2lJRndpS1N4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoVkhsd1pUb2dKMnB6YjI0bkxGeHVJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUlVlWEJsT2lCY0ltRndjR3hwWTJGMGFXOXVMMnB6YjI1Y0lseHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdiRzloWkZObGRIUnBibWR6T2lCbWRXNWpkR2x2YmlBb1kyRnNiR0poWTJzc0lHVnljbTl5S1NCN1hHNGdJQ0FnSUNBZ0lDUXVZV3BoZUNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1MFpXNTBWSGx3WlRvZ1hDSjBaWGgwTDNCc1lXNDdJR05vWVhKelpYUTlkWFJtTFRoY0lpeGNiaUFnSUNBZ0lDQWdJQ0FnSUdOeWIzTnpSRzl0WVdsdU9pQjBjblZsTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdkWEpzT2lBZ2MyVnlkbVZ5VW1Wd2IzSjBaWEl1WW1GelpWVnliQ0FySUZ3aWMyVjBkR2x1WjNOY0lpeGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklIUmxiR3dnYWxGMVpYSjVJSGRsSjNKbElHVjRjR1ZqZEdsdVp5QktVMDlPVUZ4dUlDQWdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJRndpYW5OdmJsd2lMRnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkV05qWlhOek9pQm1kVzVqZEdsdmJpQW9jbVZ6Y0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTmhiR3hpWVdOcktISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnljbTl5T2lCbWRXNWpkR2x2YmlBb1pYSnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSW9aWEp5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlZ4dWZUdGNibHh1ZFhSdFpTNXlaV2RwYzNSbGNsSmxjRzl5ZEVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXBPMXh1ZFhSdFpTNXlaV2RwYzNSbGNreHZZV1JJWVc1a2JHVnlLSE5sY25abGNsSmxjRzl5ZEdWeUxteHZZV1JUWTJWdVlYSnBieWs3WEc1MWRHMWxMbkpsWjJsemRHVnlVMkYyWlVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXVjMkYyWlZOalpXNWhjbWx2S1R0Y2JuVjBiV1V1Y21WbmFYTjBaWEpUWlhSMGFXNW5jMHh2WVdSSVlXNWtiR1Z5S0hObGNuWmxjbEpsY0c5eWRHVnlMbXh2WVdSVFpYUjBhVzVuY3lrN1hHNWNibVoxYm1OMGFXOXVJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2h1WVcxbEtTQjdYRzRnSUNBZ2JtRnRaU0E5SUc1aGJXVXVjbVZ3YkdGalpTZ3ZXMXhjVzEwdkxDQmNJbHhjWEZ4YlhDSXBMbkpsY0d4aFkyVW9MMXRjWEYxZEx5d2dYQ0pjWEZ4Y1hWd2lLVHRjYmlBZ0lDQjJZWElnY21WblpYZ2dQU0J1WlhjZ1VtVm5SWGh3S0Z3aVcxeGNYRncvSmwxY0lpQXJJRzVoYldVZ0t5QmNJajBvVzE0bUkxMHFLVndpS1N4Y2JpQWdJQ0FnSUNBZ2NtVnpkV3gwY3lBOUlISmxaMlY0TG1WNFpXTW9iRzlqWVhScGIyNHVjMlZoY21Ob0tUdGNiaUFnSUNCeVpYUjFjbTRnY21WemRXeDBjeUE5UFQwZ2JuVnNiQ0EvSUZ3aVhDSWdPaUJrWldOdlpHVlZVa2xEYjIxd2IyNWxiblFvY21WemRXeDBjMXN4WFM1eVpYQnNZV05sS0M5Y1hDc3ZaeXdnWENJZ1hDSXBLVHRjYm4waVhYMD0iLCJcblxuLyoqXG4qIEdlbmVyYXRlIHVuaXF1ZSBDU1Mgc2VsZWN0b3IgZm9yIGdpdmVuIERPTSBlbGVtZW50XG4qXG4qIEBwYXJhbSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7U3RyaW5nfVxuKiBAYXBpIHByaXZhdGVcbiovXG5cbmZ1bmN0aW9uIHVuaXF1ZShlbCwgZG9jKSB7XG4gIGlmICghZWwgfHwgIWVsLnRhZ05hbWUpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFbGVtZW50IGV4cGVjdGVkJyk7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0U2VsZWN0b3JJbmRleChlbGVtZW50LCBzZWxlY3Rvcikge1xuICAgICAgdmFyIGV4aXN0aW5nSW5kZXggPSAwO1xuICAgICAgdmFyIGl0ZW1zID0gIGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChpdGVtc1tpXSA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgICBleGlzdGluZ0luZGV4ID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXN0aW5nSW5kZXg7XG4gIH1cblxuICB2YXIgZWxTZWxlY3RvciA9IGdldEVsZW1lbnRTZWxlY3RvcihlbCkuc2VsZWN0b3I7XG4gIHZhciBpc1NpbXBsZVNlbGVjdG9yID0gZWxTZWxlY3RvciA9PT0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgYW5jZXN0b3JTZWxlY3RvcjtcblxuICB2YXIgY3VyckVsZW1lbnQgPSBlbDtcbiAgd2hpbGUgKGN1cnJFbGVtZW50LnBhcmVudEVsZW1lbnQgIT0gbnVsbCAmJiAhYW5jZXN0b3JTZWxlY3Rvcikge1xuICAgICAgY3VyckVsZW1lbnQgPSBjdXJyRWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgdmFyIHNlbGVjdG9yID0gZ2V0RWxlbWVudFNlbGVjdG9yKGN1cnJFbGVtZW50KS5zZWxlY3RvcjtcblxuICAgICAgLy8gVHlwaWNhbGx5IGVsZW1lbnRzIHRoYXQgaGF2ZSBhIGNsYXNzIG5hbWUgb3IgdGl0bGUsIHRob3NlIGFyZSBsZXNzIGxpa2VseVxuICAgICAgLy8gdG8gY2hhbmdlLCBhbmQgYWxzbyBiZSB1bmlxdWUuICBTbywgd2UgYXJlIHRyeWluZyB0byBmaW5kIGFuIGFuY2VzdG9yXG4gICAgICAvLyB0byBhbmNob3IgKG9yIHNjb3BlKSB0aGUgc2VhcmNoIGZvciB0aGUgZWxlbWVudCwgYW5kIG1ha2UgaXQgbGVzcyBicml0dGxlLlxuICAgICAgaWYgKHNlbGVjdG9yICE9PSBjdXJyRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICBhbmNlc3RvclNlbGVjdG9yID0gc2VsZWN0b3IgKyAoY3VyckVsZW1lbnQgPT09IGVsLnBhcmVudEVsZW1lbnQgJiYgaXNTaW1wbGVTZWxlY3RvciA/IFwiID4gXCIgOiBcIiBcIikgKyBlbFNlbGVjdG9yO1xuICAgICAgfVxuICB9XG5cbiAgdmFyIGZpbmFsU2VsZWN0b3JzID0gW107XG4gIGlmIChhbmNlc3RvclNlbGVjdG9yKSB7XG4gICAgZmluYWxTZWxlY3RvcnMucHVzaChcbiAgICAgIGFuY2VzdG9yU2VsZWN0b3IgKyBcIjplcShcIiArIF9nZXRTZWxlY3RvckluZGV4KGVsLCBhbmNlc3RvclNlbGVjdG9yKSArIFwiKVwiXG4gICAgKTtcbiAgfVxuXG4gIGZpbmFsU2VsZWN0b3JzLnB1c2goZWxTZWxlY3RvciArIFwiOmVxKFwiICsgX2dldFNlbGVjdG9ySW5kZXgoZWwsIGVsU2VsZWN0b3IpICsgXCIpXCIpO1xuICByZXR1cm4gZmluYWxTZWxlY3RvcnM7XG59O1xuXG4vKipcbiogR2V0IGNsYXNzIG5hbWVzIGZvciBhbiBlbGVtZW50XG4qXG4qIEBwYXJhcm0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge0FycmF5fVxuKi9cblxuZnVuY3Rpb24gZ2V0Q2xhc3NOYW1lcyhlbCkge1xuICB2YXIgY2xhc3NOYW1lID0gZWwuZ2V0QXR0cmlidXRlKCdjbGFzcycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtdmVyaWZ5JywgJycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtcmVhZHknLCAnJyk7XG5cbiAgaWYgKCFjbGFzc05hbWUgfHwgKCFjbGFzc05hbWUudHJpbSgpLmxlbmd0aCkpIHsgcmV0dXJuIFtdOyB9XG5cbiAgLy8gcmVtb3ZlIGR1cGxpY2F0ZSB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG5cbiAgLy8gdHJpbSBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG5cbiAgLy8gc3BsaXQgaW50byBzZXBhcmF0ZSBjbGFzc25hbWVzXG4gIHJldHVybiBjbGFzc05hbWUudHJpbSgpLnNwbGl0KCcgJyk7XG59XG5cbi8qKlxuKiBDU1Mgc2VsZWN0b3JzIHRvIGdlbmVyYXRlIHVuaXF1ZSBzZWxlY3RvciBmb3IgRE9NIGVsZW1lbnRcbipcbiogQHBhcmFtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtBcnJheX1cbiogQGFwaSBwcnZpYXRlXG4qL1xuXG5mdW5jdGlvbiBnZXRFbGVtZW50U2VsZWN0b3IoZWwsIGlzVW5pcXVlKSB7XG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgbGFiZWwgPSBudWxsO1xuICB2YXIgdGl0bGUgPSBudWxsO1xuICB2YXIgYWx0ICAgPSBudWxsO1xuICB2YXIgbmFtZSAgPSBudWxsO1xuICB2YXIgdmFsdWUgPSBudWxsO1xuICB2YXIgbWUgPSBlbDtcblxuICAvLyBkbyB7XG5cbiAgLy8gSURzIGFyZSB1bmlxdWUgZW5vdWdoXG4gIGlmIChlbC5pZCkge1xuICAgIGxhYmVsID0gJ1tpZD1cXCcnICsgZWwuaWQgKyBcIlxcJ11cIjtcbiAgfSBlbHNlIHtcbiAgICAvLyBPdGhlcndpc2UsIHVzZSB0YWcgbmFtZVxuICAgIGxhYmVsICAgICA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIHZhciBjbGFzc05hbWVzID0gZ2V0Q2xhc3NOYW1lcyhlbCk7XG5cbiAgICAvLyBUYWcgbmFtZXMgY291bGQgdXNlIGNsYXNzZXMgZm9yIHNwZWNpZmljaXR5XG4gICAgaWYgKGNsYXNzTmFtZXMubGVuZ3RoKSB7XG4gICAgICBsYWJlbCArPSAnLicgKyBjbGFzc05hbWVzLmpvaW4oJy4nKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaXRsZXMgJiBBbHQgYXR0cmlidXRlcyBhcmUgdmVyeSB1c2VmdWwgZm9yIHNwZWNpZmljaXR5IGFuZCB0cmFja2luZ1xuICBpZiAodGl0bGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykpIHtcbiAgICBsYWJlbCArPSAnW3RpdGxlPVwiJyArIHRpdGxlICsgJ1wiXSc7XG4gIH0gZWxzZSBpZiAoYWx0ID0gZWwuZ2V0QXR0cmlidXRlKCdhbHQnKSkge1xuICAgIGxhYmVsICs9ICdbYWx0PVwiJyArIGFsdCArICdcIl0nO1xuICB9IGVsc2UgaWYgKG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgIGxhYmVsICs9ICdbbmFtZT1cIicgKyBuYW1lICsgJ1wiXSc7XG4gIH1cblxuICBpZiAodmFsdWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykpIHtcbiAgICBsYWJlbCArPSAnW3ZhbHVlPVwiJyArIHZhbHVlICsgJ1wiXSc7XG4gIH1cblxuICAvLyBpZiAoZWwuaW5uZXJUZXh0Lmxlbmd0aCAhPSAwKSB7XG4gIC8vICAgbGFiZWwgKz0gJzpjb250YWlucygnICsgZWwuaW5uZXJUZXh0ICsgJyknO1xuICAvLyB9XG5cbiAgcGFydHMudW5zaGlmdCh7XG4gICAgZWxlbWVudDogZWwsXG4gICAgc2VsZWN0b3I6IGxhYmVsXG4gIH0pO1xuXG4gIC8vIGlmIChpc1VuaXF1ZShwYXJ0cykpIHtcbiAgLy8gICAgIGJyZWFrO1xuICAvLyB9XG5cbiAgLy8gfSB3aGlsZSAoIWVsLmlkICYmIChlbCA9IGVsLnBhcmVudE5vZGUpICYmIGVsLnRhZ05hbWUpO1xuXG4gIC8vIFNvbWUgc2VsZWN0b3JzIHNob3VsZCBoYXZlIG1hdGNoZWQgYXQgbGVhc3RcbiAgaWYgKCFwYXJ0cy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBpZGVudGlmeSBDU1Mgc2VsZWN0b3InKTtcbiAgfVxuICByZXR1cm4gcGFydHNbMF07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdW5pcXVlO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lkSEpoYm5ObWIzSnRaV1F1YW5NaUxDSnpiM1Z5WTJWeklqcGJJaTlFWlhabGJHOXdaWEl2WVhSemFXUXZVSEp2YW1WamRITXZkWFJ0WlM5MWRHMWxMM055WXk5cWN5OXpaV3hsWTNSdmNrWnBibVJsY2k1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHM3UVVGRlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUVVWQkxFVkJRVVU3TzBGQlJVWXNVMEZCVXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxFZEJRVWNzUlVGQlJUdEZRVU4yUWl4SlFVRkpMRU5CUVVNc1JVRkJSU3hKUVVGSkxFTkJRVU1zUlVGQlJTeERRVUZETEU5QlFVOHNSVUZCUlR0SlFVTjBRaXhOUVVGTkxFbEJRVWtzVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03UVVGRE5VTXNSMEZCUnpzN1JVRkZSQ3hUUVVGVExHbENRVUZwUWl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVU3VFVGRE1VTXNTVUZCU1N4aFFVRmhMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJRelZDTEUxQlFVMHNTVUZCU1N4TFFVRkxMRWxCUVVrc1IwRkJSeXhEUVVGRExHZENRVUZuUWl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE96dE5RVVUxUXl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NTMEZCU3l4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdFZRVU51UXl4SlFVRkpMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUzBGQlN5eFBRVUZQTEVWQlFVVTdZMEZEZEVJc1lVRkJZU3hIUVVGSExFTkJRVU1zUTBGQlF6dGpRVU5zUWl4TlFVRk5PMWRCUTFRN1QwRkRTanROUVVORUxFOUJRVThzWVVGQllTeERRVUZETzBGQlF6TkNMRWRCUVVjN08wVkJSVVFzU1VGQlNTeFZRVUZWTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RFFVRkRPMFZCUTJwRUxFbEJRVWtzWjBKQlFXZENMRWRCUVVjc1ZVRkJWU3hMUVVGTExFVkJRVVVzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RlFVRkZMRU5CUVVNN1FVRkRha1VzUlVGQlJTeEpRVUZKTEdkQ1FVRm5RaXhEUVVGRE96dEZRVVZ5UWl4SlFVRkpMRmRCUVZjc1IwRkJSeXhGUVVGRkxFTkJRVU03UlVGRGNrSXNUMEZCVHl4WFFVRlhMRU5CUVVNc1lVRkJZU3hKUVVGSkxFbEJRVWtzU1VGQlNTeERRVUZETEdkQ1FVRm5RaXhGUVVGRk8wMUJRek5FTEZkQlFWY3NSMEZCUnl4WFFVRlhMRU5CUVVNc1lVRkJZU3hEUVVGRE8wRkJRemxETEUxQlFVMHNTVUZCU1N4UlFVRlJMRWRCUVVjc2EwSkJRV3RDTEVOQlFVTXNWMEZCVnl4RFFVRkRMRU5CUVVNc1VVRkJVU3hEUVVGRE8wRkJRemxFTzBGQlEwRTdRVUZEUVRzN1RVRkZUU3hKUVVGSkxGRkJRVkVzUzBGQlN5eFhRVUZYTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1JVRkJSU3hGUVVGRk8xVkJRMmhFTEdkQ1FVRm5RaXhIUVVGSExGRkJRVkVzU1VGQlNTeFhRVUZYTEV0QlFVc3NSVUZCUlN4RFFVRkRMR0ZCUVdFc1NVRkJTU3huUWtGQlowSXNSMEZCUnl4TFFVRkxMRWRCUVVjc1IwRkJSeXhEUVVGRExFZEJRVWNzVlVGQlZTeERRVUZETzA5QlEyNUlPMEZCUTFBc1IwRkJSenM3UlVGRlJDeEpRVUZKTEdOQlFXTXNSMEZCUnl4RlFVRkZMRU5CUVVNN1JVRkRlRUlzU1VGQlNTeG5Ra0ZCWjBJc1JVRkJSVHRKUVVOd1FpeGpRVUZqTEVOQlFVTXNTVUZCU1R0TlFVTnFRaXhuUWtGQlowSXNSMEZCUnl4TlFVRk5MRWRCUVVjc2FVSkJRV2xDTEVOQlFVTXNSVUZCUlN4RlFVRkZMR2RDUVVGblFpeERRVUZETEVkQlFVY3NSMEZCUnp0TFFVTXhSU3hEUVVGRE8wRkJRMDRzUjBGQlJ6czdSVUZGUkN4alFVRmpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzUjBGQlJ5eE5RVUZOTEVkQlFVY3NhVUpCUVdsQ0xFTkJRVU1zUlVGQlJTeEZRVUZGTEZWQlFWVXNRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRE8wVkJRMjVHTEU5QlFVOHNZMEZCWXl4RFFVRkRPMEZCUTNoQ0xFTkJRVU1zUTBGQlF6czdRVUZGUmp0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVGRlFTeEZRVUZGT3p0QlFVVkdMRk5CUVZNc1lVRkJZU3hEUVVGRExFVkJRVVVzUlVGQlJUdEZRVU42UWl4SlFVRkpMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMFZCUTNwRExGTkJRVk1zUjBGQlJ5eFRRVUZUTEVsQlFVa3NVMEZCVXl4RFFVRkRMRTlCUVU4c1EwRkJReXhoUVVGaExFVkJRVVVzUlVGQlJTeERRVUZETEVOQlFVTTdRVUZEYUVVc1JVRkJSU3hUUVVGVExFZEJRVWNzVTBGQlV5eEpRVUZKTEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1dVRkJXU3hGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZET3p0QlFVVXZSQ3hGUVVGRkxFbEJRVWtzUTBGQlF5eFRRVUZUTEV0QlFVc3NRMEZCUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hGUVVGRkxFTkJRVU1zVFVGQlRTeERRVUZETEVWQlFVVXNSVUZCUlN4UFFVRlBMRVZCUVVVc1EwRkJReXhGUVVGRk8wRkJRemxFT3p0QlFVVkJMRVZCUVVVc1UwRkJVeXhIUVVGSExGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNUVUZCVFN4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJRemRET3p0QlFVVkJMRVZCUVVVc1UwRkJVeXhIUVVGSExGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNXVUZCV1N4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8wRkJRMnhFT3p0RlFVVkZMRTlCUVU4c1UwRkJVeXhEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVOeVF5eERRVUZET3p0QlFVVkVPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGQlJVRXNSVUZCUlRzN1FVRkZSaXhUUVVGVExHdENRVUZyUWl4RFFVRkRMRVZCUVVVc1JVRkJSU3hSUVVGUkxFVkJRVVU3UlVGRGVFTXNTVUZCU1N4TFFVRkxMRWRCUVVjc1JVRkJSU3hEUVVGRE8wVkJRMllzU1VGQlNTeExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRPMFZCUTJwQ0xFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0RlFVTnFRaXhKUVVGSkxFZEJRVWNzUzBGQlN5eEpRVUZKTEVOQlFVTTdSVUZEYWtJc1NVRkJTU3hKUVVGSkxFbEJRVWtzU1VGQlNTeERRVUZETzBWQlEycENMRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEJRVU51UWl4RlFVRkZMRWxCUVVrc1JVRkJSU3hIUVVGSExFVkJRVVVzUTBGQlF6dEJRVU5rTzBGQlEwRTdRVUZEUVRzN1JVRkZSU3hKUVVGSkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdTVUZEVkN4TFFVRkxMRWRCUVVjc1VVRkJVU3hIUVVGSExFVkJRVVVzUTBGQlF5eEZRVUZGTEVkQlFVY3NTMEZCU3l4RFFVRkRPMEZCUTNKRExFZEJRVWNzVFVGQlRUczdRVUZGVkN4SlFVRkpMRXRCUVVzc1QwRkJUeXhGUVVGRkxFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4RFFVRkRPenRCUVVWNlF5eEpRVUZKTEVsQlFVa3NWVUZCVlN4SFFVRkhMR0ZCUVdFc1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF6dEJRVU4yUXpzN1NVRkZTU3hKUVVGSkxGVkJRVlVzUTBGQlF5eE5RVUZOTEVWQlFVVTdUVUZEY2tJc1MwRkJTeXhKUVVGSkxFZEJRVWNzUjBGQlJ5eFZRVUZWTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8wdEJRM0pETzBGQlEwd3NSMEZCUnp0QlFVTklPenRGUVVWRkxFbEJRVWtzUzBGQlN5eEhRVUZITEVWQlFVVXNRMEZCUXl4WlFVRlpMRU5CUVVNc1QwRkJUeXhEUVVGRExFVkJRVVU3U1VGRGNFTXNTMEZCU3l4SlFVRkpMRlZCUVZVc1IwRkJSeXhMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETzBkQlEzQkRMRTFCUVUwc1NVRkJTU3hIUVVGSExFZEJRVWNzUlVGQlJTeERRVUZETEZsQlFWa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1JVRkJSVHRKUVVOMlF5eExRVUZMTEVsQlFVa3NVVUZCVVN4SFFVRkhMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU03UjBGRGFFTXNUVUZCVFN4SlFVRkpMRWxCUVVrc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEUxQlFVMHNRMEZCUXl4RlFVRkZPMGxCUTNwRExFdEJRVXNzU1VGQlNTeFRRVUZUTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJRenRCUVVOeVF5eEhRVUZIT3p0RlFVVkVMRWxCUVVrc1MwRkJTeXhIUVVGSExFVkJRVVVzUTBGQlF5eFpRVUZaTEVOQlFVTXNUMEZCVHl4RFFVRkRMRVZCUVVVN1NVRkRjRU1zUzBGQlN5eEpRVUZKTEZWQlFWVXNSMEZCUnl4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRE8wRkJRM1pETEVkQlFVYzdRVUZEU0R0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UlVGRlJTeExRVUZMTEVOQlFVTXNUMEZCVHl4RFFVRkRPMGxCUTFvc1QwRkJUeXhGUVVGRkxFVkJRVVU3U1VGRFdDeFJRVUZSTEVWQlFVVXNTMEZCU3p0QlFVTnVRaXhIUVVGSExFTkJRVU1zUTBGQlF6dEJRVU5NTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEZRVVZGTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hGUVVGRk8wbEJRMnBDTEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc2FVTkJRV2xETEVOQlFVTXNRMEZCUXp0SFFVTndSRHRGUVVORUxFOUJRVThzUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTJ4Q0xFTkJRVU03TzBGQlJVUXNUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSeXhOUVVGTkxFTkJRVU1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKY2JseHVMeW9xWEc0cUlFZGxibVZ5WVhSbElIVnVhWEYxWlNCRFUxTWdjMlZzWldOMGIzSWdabTl5SUdkcGRtVnVJRVJQVFNCbGJHVnRaVzUwWEc0cVhHNHFJRUJ3WVhKaGJTQjdSV3hsYldWdWRIMGdaV3hjYmlvZ1FISmxkSFZ5YmlCN1UzUnlhVzVuZlZ4dUtpQkFZWEJwSUhCeWFYWmhkR1ZjYmlvdlhHNWNibVoxYm1OMGFXOXVJSFZ1YVhGMVpTaGxiQ3dnWkc5aktTQjdYRzRnSUdsbUlDZ2haV3dnZkh3Z0lXVnNMblJoWjA1aGJXVXBJSHRjYmlBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2RGYkdWdFpXNTBJR1Y0Y0dWamRHVmtKeWs3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCZloyVjBVMlZzWldOMGIzSkpibVJsZUNobGJHVnRaVzUwTENCelpXeGxZM1J2Y2lrZ2UxeHVJQ0FnSUNBZ2RtRnlJR1Y0YVhOMGFXNW5TVzVrWlhnZ1BTQXdPMXh1SUNBZ0lDQWdkbUZ5SUdsMFpXMXpJRDBnSUdSdll5NXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tITmxiR1ZqZEc5eUtUdGNibHh1SUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JwZEdWdGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2hwZEdWdGMxdHBYU0E5UFQwZ1pXeGxiV1Z1ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGVHbHpkR2x1WjBsdVpHVjRJRDBnYVR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnY21WMGRYSnVJR1Y0YVhOMGFXNW5TVzVrWlhnN1hHNGdJSDFjYmx4dUlDQjJZWElnWld4VFpXeGxZM1J2Y2lBOUlHZGxkRVZzWlcxbGJuUlRaV3hsWTNSdmNpaGxiQ2t1YzJWc1pXTjBiM0k3WEc0Z0lIWmhjaUJwYzFOcGJYQnNaVk5sYkdWamRHOXlJRDBnWld4VFpXeGxZM1J2Y2lBOVBUMGdaV3d1ZEdGblRtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncE8xeHVJQ0IyWVhJZ1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2p0Y2JseHVJQ0IyWVhJZ1kzVnlja1ZzWlcxbGJuUWdQU0JsYkR0Y2JpQWdkMmhwYkdVZ0tHTjFjbkpGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RZ0lUMGdiblZzYkNBbUppQWhZVzVqWlhOMGIzSlRaV3hsWTNSdmNpa2dlMXh1SUNBZ0lDQWdZM1Z5Y2tWc1pXMWxiblFnUFNCamRYSnlSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTzF4dUlDQWdJQ0FnZG1GeUlITmxiR1ZqZEc5eUlEMGdaMlYwUld4bGJXVnVkRk5sYkdWamRHOXlLR04xY25KRmJHVnRaVzUwS1M1elpXeGxZM1J2Y2p0Y2JseHVJQ0FnSUNBZ0x5OGdWSGx3YVdOaGJHeDVJR1ZzWlcxbGJuUnpJSFJvWVhRZ2FHRjJaU0JoSUdOc1lYTnpJRzVoYldVZ2IzSWdkR2wwYkdVc0lIUm9iM05sSUdGeVpTQnNaWE56SUd4cGEyVnNlVnh1SUNBZ0lDQWdMeThnZEc4Z1kyaGhibWRsTENCaGJtUWdZV3h6YnlCaVpTQjFibWx4ZFdVdUlDQlRieXdnZDJVZ1lYSmxJSFJ5ZVdsdVp5QjBieUJtYVc1a0lHRnVJR0Z1WTJWemRHOXlYRzRnSUNBZ0lDQXZMeUIwYnlCaGJtTm9iM0lnS0c5eUlITmpiM0JsS1NCMGFHVWdjMlZoY21Ob0lHWnZjaUIwYUdVZ1pXeGxiV1Z1ZEN3Z1lXNWtJRzFoYTJVZ2FYUWdiR1Z6Y3lCaWNtbDBkR3hsTGx4dUlDQWdJQ0FnYVdZZ0tITmxiR1ZqZEc5eUlDRTlQU0JqZFhKeVJXeGxiV1Z1ZEM1MFlXZE9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCaGJtTmxjM1J2Y2xObGJHVmpkRzl5SUQwZ2MyVnNaV04wYjNJZ0t5QW9ZM1Z5Y2tWc1pXMWxiblFnUFQwOUlHVnNMbkJoY21WdWRFVnNaVzFsYm5RZ0ppWWdhWE5UYVcxd2JHVlRaV3hsWTNSdmNpQS9JRndpSUQ0Z1hDSWdPaUJjSWlCY0lpa2dLeUJsYkZObGJHVmpkRzl5TzF4dUlDQWdJQ0FnZlZ4dUlDQjlYRzVjYmlBZ2RtRnlJR1pwYm1Gc1UyVnNaV04wYjNKeklEMGdXMTA3WEc0Z0lHbG1JQ2hoYm1ObGMzUnZjbE5sYkdWamRHOXlLU0I3WEc0Z0lDQWdabWx1WVd4VFpXeGxZM1J2Y25NdWNIVnphQ2hjYmlBZ0lDQWdJR0Z1WTJWemRHOXlVMlZzWldOMGIzSWdLeUJjSWpwbGNTaGNJaUFySUY5blpYUlRaV3hsWTNSdmNrbHVaR1Y0S0dWc0xDQmhibU5sYzNSdmNsTmxiR1ZqZEc5eUtTQXJJRndpS1Z3aVhHNGdJQ0FnS1R0Y2JpQWdmVnh1WEc0Z0lHWnBibUZzVTJWc1pXTjBiM0p6TG5CMWMyZ29aV3hUWld4bFkzUnZjaUFySUZ3aU9tVnhLRndpSUNzZ1gyZGxkRk5sYkdWamRHOXlTVzVrWlhnb1pXd3NJR1ZzVTJWc1pXTjBiM0lwSUNzZ1hDSXBYQ0lwTzF4dUlDQnlaWFIxY200Z1ptbHVZV3hUWld4bFkzUnZjbk03WEc1OU8xeHVYRzR2S2lwY2Jpb2dSMlYwSUdOc1lYTnpJRzVoYldWeklHWnZjaUJoYmlCbGJHVnRaVzUwWEc0cVhHNHFJRUJ3WVhKaGNtMGdlMFZzWlcxbGJuUjlJR1ZzWEc0cUlFQnlaWFIxY200Z2UwRnljbUY1ZlZ4dUtpOWNibHh1Wm5WdVkzUnBiMjRnWjJWMFEyeGhjM05PWVcxbGN5aGxiQ2tnZTF4dUlDQjJZWElnWTJ4aGMzTk9ZVzFsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkamJHRnpjeWNwTzF4dUlDQmpiR0Z6YzA1aGJXVWdQU0JqYkdGemMwNWhiV1VnSmlZZ1kyeGhjM05PWVcxbExuSmxjR3hoWTJVb0ozVjBiV1V0ZG1WeWFXWjVKeXdnSnljcE8xeHVJQ0JqYkdGemMwNWhiV1VnUFNCamJHRnpjMDVoYldVZ0ppWWdZMnhoYzNOT1lXMWxMbkpsY0d4aFkyVW9KM1YwYldVdGNtVmhaSGtuTENBbkp5azdYRzVjYmlBZ2FXWWdLQ0ZqYkdGemMwNWhiV1VnZkh3Z0tDRmpiR0Z6YzA1aGJXVXVkSEpwYlNncExteGxibWQwYUNrcElIc2djbVYwZFhKdUlGdGRPeUI5WEc1Y2JpQWdMeThnY21WdGIzWmxJR1IxY0d4cFkyRjBaU0IzYUdsMFpYTndZV05sWEc0Z0lHTnNZWE56VG1GdFpTQTlJR05zWVhOelRtRnRaUzV5WlhCc1lXTmxLQzljWEhNckwyY3NJQ2NnSnlrN1hHNWNiaUFnTHk4Z2RISnBiU0JzWldGa2FXNW5JR0Z1WkNCMGNtRnBiR2x1WnlCM2FHbDBaWE53WVdObFhHNGdJR05zWVhOelRtRnRaU0E5SUdOc1lYTnpUbUZ0WlM1eVpYQnNZV05sS0M5ZVhGeHpLM3hjWEhNckpDOW5MQ0FuSnlrN1hHNWNiaUFnTHk4Z2MzQnNhWFFnYVc1MGJ5QnpaWEJoY21GMFpTQmpiR0Z6YzI1aGJXVnpYRzRnSUhKbGRIVnliaUJqYkdGemMwNWhiV1V1ZEhKcGJTZ3BMbk53YkdsMEtDY2dKeWs3WEc1OVhHNWNiaThxS2x4dUtpQkRVMU1nYzJWc1pXTjBiM0p6SUhSdklHZGxibVZ5WVhSbElIVnVhWEYxWlNCelpXeGxZM1J2Y2lCbWIzSWdSRTlOSUdWc1pXMWxiblJjYmlwY2Jpb2dRSEJoY21GdElIdEZiR1Z0Wlc1MGZTQmxiRnh1S2lCQWNtVjBkWEp1SUh0QmNuSmhlWDFjYmlvZ1FHRndhU0J3Y25acFlYUmxYRzRxTDF4dVhHNW1kVzVqZEdsdmJpQm5aWFJGYkdWdFpXNTBVMlZzWldOMGIzSW9aV3dzSUdselZXNXBjWFZsS1NCN1hHNGdJSFpoY2lCd1lYSjBjeUE5SUZ0ZE8xeHVJQ0IyWVhJZ2JHRmlaV3dnUFNCdWRXeHNPMXh1SUNCMllYSWdkR2wwYkdVZ1BTQnVkV3hzTzF4dUlDQjJZWElnWVd4MElDQWdQU0J1ZFd4c08xeHVJQ0IyWVhJZ2JtRnRaU0FnUFNCdWRXeHNPMXh1SUNCMllYSWdkbUZzZFdVZ1BTQnVkV3hzTzF4dUlDQjJZWElnYldVZ1BTQmxiRHRjYmx4dUlDQXZMeUJrYnlCN1hHNWNiaUFnTHk4Z1NVUnpJR0Z5WlNCMWJtbHhkV1VnWlc1dmRXZG9YRzRnSUdsbUlDaGxiQzVwWkNrZ2UxeHVJQ0FnSUd4aFltVnNJRDBnSjF0cFpEMWNYQ2NuSUNzZ1pXd3VhV1FnS3lCY0lseGNKMTFjSWp0Y2JpQWdmU0JsYkhObElIdGNiaUFnSUNBdkx5QlBkR2hsY25kcGMyVXNJSFZ6WlNCMFlXY2dibUZ0WlZ4dUlDQWdJR3hoWW1Wc0lDQWdJQ0E5SUdWc0xuUmhaMDVoYldVdWRHOU1iM2RsY2tOaGMyVW9LVHRjYmx4dUlDQWdJSFpoY2lCamJHRnpjMDVoYldWeklEMGdaMlYwUTJ4aGMzTk9ZVzFsY3lobGJDazdYRzVjYmlBZ0lDQXZMeUJVWVdjZ2JtRnRaWE1nWTI5MWJHUWdkWE5sSUdOc1lYTnpaWE1nWm05eUlITndaV05wWm1samFYUjVYRzRnSUNBZ2FXWWdLR05zWVhOelRtRnRaWE11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0JzWVdKbGJDQXJQU0FuTGljZ0t5QmpiR0Z6YzA1aGJXVnpMbXB2YVc0b0p5NG5LVHRjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0F2THlCVWFYUnNaWE1nSmlCQmJIUWdZWFIwY21saWRYUmxjeUJoY21VZ2RtVnllU0IxYzJWbWRXd2dabTl5SUhOd1pXTnBabWxqYVhSNUlHRnVaQ0IwY21GamEybHVaMXh1SUNCcFppQW9kR2wwYkdVZ1BTQmxiQzVuWlhSQmRIUnlhV0oxZEdVb0ozUnBkR3hsSnlrcElIdGNiaUFnSUNCc1lXSmxiQ0FyUFNBblczUnBkR3hsUFZ3aUp5QXJJSFJwZEd4bElDc2dKMXdpWFNjN1hHNGdJSDBnWld4elpTQnBaaUFvWVd4MElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZGhiSFFuS1NrZ2UxeHVJQ0FnSUd4aFltVnNJQ3M5SUNkYllXeDBQVndpSnlBcklHRnNkQ0FySUNkY0lsMG5PMXh1SUNCOUlHVnNjMlVnYVdZZ0tHNWhiV1VnUFNCbGJDNW5aWFJCZEhSeWFXSjFkR1VvSjI1aGJXVW5LU2tnZTF4dUlDQWdJR3hoWW1Wc0lDczlJQ2RiYm1GdFpUMWNJaWNnS3lCdVlXMWxJQ3NnSjF3aVhTYzdYRzRnSUgxY2JseHVJQ0JwWmlBb2RtRnNkV1VnUFNCbGJDNW5aWFJCZEhSeWFXSjFkR1VvSjNaaGJIVmxKeWtwSUh0Y2JpQWdJQ0JzWVdKbGJDQXJQU0FuVzNaaGJIVmxQVndpSnlBcklIWmhiSFZsSUNzZ0oxd2lYU2M3WEc0Z0lIMWNibHh1SUNBdkx5QnBaaUFvWld3dWFXNXVaWEpVWlhoMExteGxibWQwYUNBaFBTQXdLU0I3WEc0Z0lDOHZJQ0FnYkdGaVpXd2dLejBnSnpwamIyNTBZV2x1Y3lnbklDc2daV3d1YVc1dVpYSlVaWGgwSUNzZ0p5a25PMXh1SUNBdkx5QjlYRzVjYmlBZ2NHRnlkSE11ZFc1emFHbG1kQ2g3WEc0Z0lDQWdaV3hsYldWdWREb2daV3dzWEc0Z0lDQWdjMlZzWldOMGIzSTZJR3hoWW1Wc1hHNGdJSDBwTzF4dVhHNGdJQzh2SUdsbUlDaHBjMVZ1YVhGMVpTaHdZWEowY3lrcElIdGNiaUFnTHk4Z0lDQWdJR0p5WldGck8xeHVJQ0F2THlCOVhHNWNiaUFnTHk4Z2ZTQjNhR2xzWlNBb0lXVnNMbWxrSUNZbUlDaGxiQ0E5SUdWc0xuQmhjbVZ1ZEU1dlpHVXBJQ1ltSUdWc0xuUmhaMDVoYldVcE8xeHVYRzRnSUM4dklGTnZiV1VnYzJWc1pXTjBiM0p6SUhOb2IzVnNaQ0JvWVhabElHMWhkR05vWldRZ1lYUWdiR1ZoYzNSY2JpQWdhV1lnS0NGd1lYSjBjeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0owWmhhV3hsWkNCMGJ5QnBaR1Z1ZEdsbWVTQkRVMU1nYzJWc1pXTjBiM0luS1R0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnY0dGeWRITmJNRjA3WEc1OVhHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdkVzVwY1hWbE8xeHVJbDE5IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgbG9jYWxfc3RvcmFnZV9rZXkgPSAndXRtZS1zZXR0aW5ncyc7XG5cbmZ1bmN0aW9uIFNldHRpbmdzIChkZWZhdWx0U2V0dGluZ3MpIHtcbiAgICB0aGlzLnNldERlZmF1bHRzKGRlZmF1bHRTZXR0aW5ncyB8fCB7fSk7XG59XG5cblNldHRpbmdzLnByb3RvdHlwZSA9IHtcbiAgICByZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZXR0aW5nc1N0cmluZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGxvY2FsX3N0b3JhZ2Vfa2V5KTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge307XG4gICAgICAgIGlmIChzZXR0aW5nc1N0cmluZykge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBKU09OLnBhcnNlKHNldHRpbmdzU3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldERlZmF1bHRzOiBmdW5jdGlvbiAoZGVmYXVsdFNldHRpbmdzKSB7XG4gICAgICAgIHZhciBsb2NhbFNldHRpbmdzID0gdGhpcy5yZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIHZhciBkZWZhdWx0c0NvcHkgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdFNldHRpbmdzIHx8IHt9KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IF8uZXh0ZW5kKHt9LCBfLmV4dGVuZChkZWZhdWx0c0NvcHksIGxvY2FsU2V0dGluZ3MpKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0U2V0dGluZ3MgPSBkZWZhdWx0U2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5nc1trZXldID0gdmFsdWU7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH0sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3Nba2V5XTtcbiAgICB9LFxuXG4gICAgc2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShsb2NhbF9zdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xuICAgIH0sXG5cbiAgICByZXNldERlZmF1bHRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICBpZiAoZGVmYXVsdHMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdHMpO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pZEhKaGJuTm1iM0p0WldRdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5RVpYWmxiRzl3WlhJdllYUnphV1F2VUhKdmFtVmpkSE12ZFhSdFpTOTFkRzFsTDNOeVl5OXFjeTl6WlhSMGFXNW5jeTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFTeEpRVUZKTEVOQlFVTXNSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UVVGRE0wSXNTVUZCU1N4cFFrRkJhVUlzUjBGQlJ5eGxRVUZsTEVOQlFVTTdPMEZCUlhoRExGTkJRVk1zVVVGQlVTeEZRVUZGTEdWQlFXVXNSVUZCUlR0SlFVTm9ReXhKUVVGSkxFTkJRVU1zVjBGQlZ5eERRVUZETEdWQlFXVXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJRenRCUVVNMVF5eERRVUZET3p0QlFVVkVMRkZCUVZFc1EwRkJReXhUUVVGVExFZEJRVWM3U1VGRGFrSXNORUpCUVRSQ0xFVkJRVVVzV1VGQldUdFJRVU4wUXl4SlFVRkpMR05CUVdNc1IwRkJSeXhaUVVGWkxFTkJRVU1zVDBGQlR5eERRVUZETEdsQ1FVRnBRaXhEUVVGRExFTkJRVU03VVVGRE4wUXNTVUZCU1N4UlFVRlJMRWRCUVVjc1JVRkJSU3hEUVVGRE8xRkJRMnhDTEVsQlFVa3NZMEZCWXl4RlFVRkZPMWxCUTJoQ0xGRkJRVkVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMR05CUVdNc1EwRkJReXhEUVVGRE8xTkJRM3BETzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNN1FVRkRlRUlzUzBGQlN6czdTVUZGUkN4WFFVRlhMRVZCUVVVc1ZVRkJWU3hsUVVGbExFVkJRVVU3VVVGRGNFTXNTVUZCU1N4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExEUkNRVUUwUWl4RlFVRkZMRU5CUVVNN1VVRkRlRVFzU1VGQlNTeFpRVUZaTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzWlVGQlpTeEpRVUZKTEVWQlFVVXNRMEZCUXl4RFFVRkRPMUZCUTNaRUxFbEJRVWtzUTBGQlF5eFJRVUZSTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WlFVRlpMRVZCUVVVc1lVRkJZU3hEUVVGRExFTkJRVU1zUTBGQlF6dFJRVU53UlN4SlFVRkpMRU5CUVVNc1pVRkJaU3hIUVVGSExHVkJRV1VzUTBGQlF6dEJRVU12UXl4TFFVRkxPenRKUVVWRUxFZEJRVWNzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlN4TFFVRkxMRVZCUVVVN1VVRkRka0lzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU03VVVGRE0wSXNTVUZCU1N4RFFVRkRMRWxCUVVrc1JVRkJSU3hEUVVGRE8wRkJRM0JDTEV0QlFVczdPMGxCUlVRc1IwRkJSeXhGUVVGRkxGVkJRVlVzUjBGQlJ5eEZRVUZGTzFGQlEyaENMRTlCUVU4c1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTnNReXhMUVVGTE96dEpRVVZFTEVsQlFVa3NSVUZCUlN4WlFVRlpPMUZCUTJRc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eHBRa0ZCYVVJc1JVRkJSU3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJReTlGTEV0QlFVczdPMGxCUlVRc1lVRkJZU3hGUVVGRkxGbEJRVms3VVVGRGRrSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1NVRkJTU3hEUVVGRExHVkJRV1VzUTBGQlF6dFJRVU53UXl4SlFVRkpMRkZCUVZFc1JVRkJSVHRaUVVOV0xFbEJRVWtzUTBGQlF5eFJRVUZSTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzVVVGQlVTeERRVUZETEVOQlFVTTdXVUZEZGtNc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETzFOQlEyWTdTMEZEU2p0QlFVTk1MRU5CUVVNc1EwRkJRenM3UVVGRlJpeE5RVUZOTEVOQlFVTXNUMEZCVHl4SFFVRkhMRkZCUVZFaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SjJZWElnWHlBOUlISmxjWFZwY21Vb0p5NHZkWFJwYkhNbktUdGNiblpoY2lCc2IyTmhiRjl6ZEc5eVlXZGxYMnRsZVNBOUlDZDFkRzFsTFhObGRIUnBibWR6Snp0Y2JseHVablZ1WTNScGIyNGdVMlYwZEdsdVozTWdLR1JsWm1GMWJIUlRaWFIwYVc1bmN5a2dlMXh1SUNBZ0lIUm9hWE11YzJWMFJHVm1ZWFZzZEhNb1pHVm1ZWFZzZEZObGRIUnBibWR6SUh4OElIdDlLVHRjYm4xY2JseHVVMlYwZEdsdVozTXVjSEp2ZEc5MGVYQmxJRDBnZTF4dUlDQWdJSEpsWVdSVFpYUjBhVzVuYzBaeWIyMU1iMk5oYkZOMGIzSmhaMlU2SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhObGRIUnBibWR6VTNSeWFXNW5JRDBnYkc5allXeFRkRzl5WVdkbExtZGxkRWwwWlcwb2JHOWpZV3hmYzNSdmNtRm5aVjlyWlhrcE8xeHVJQ0FnSUNBZ0lDQjJZWElnYzJWMGRHbHVaM01nUFNCN2ZUdGNiaUFnSUNBZ0lDQWdhV1lnS0hObGRIUnBibWR6VTNSeWFXNW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpaWFIwYVc1bmN5QTlJRXBUVDA0dWNHRnljMlVvYzJWMGRHbHVaM05UZEhKcGJtY3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6WlhSMGFXNW5jenRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMlYwUkdWbVlYVnNkSE02SUdaMWJtTjBhVzl1SUNoa1pXWmhkV3gwVTJWMGRHbHVaM01wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3h2WTJGc1UyVjBkR2x1WjNNZ1BTQjBhR2x6TG5KbFlXUlRaWFIwYVc1bmMwWnliMjFNYjJOaGJGTjBiM0poWjJVb0tUdGNiaUFnSUNBZ0lDQWdkbUZ5SUdSbFptRjFiSFJ6UTI5d2VTQTlJRjh1WlhoMFpXNWtLSHQ5TENCa1pXWmhkV3gwVTJWMGRHbHVaM01nZkh3Z2UzMHBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkSFJwYm1keklEMGdYeTVsZUhSbGJtUW9lMzBzSUY4dVpYaDBaVzVrS0dSbFptRjFiSFJ6UTI5d2VTd2diRzlqWVd4VFpYUjBhVzVuY3lrcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG1SbFptRjFiSFJUWlhSMGFXNW5jeUE5SUdSbFptRjFiSFJUWlhSMGFXNW5jenRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMlYwT2lCbWRXNWpkR2x2YmlBb2EyVjVMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkSFJwYm1kelcydGxlVjBnUFNCMllXeDFaVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpZWFpsS0NrN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUdkbGREb2dablZ1WTNScGIyNGdLR3RsZVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTV6WlhSMGFXNW5jMXRyWlhsZE8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCellYWmxPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lHeHZZMkZzVTNSdmNtRm5aUzV6WlhSSmRHVnRLR3h2WTJGc1gzTjBiM0poWjJWZmEyVjVMQ0JLVTA5T0xuTjBjbWx1WjJsbWVTaDBhR2x6TG5ObGRIUnBibWR6S1NrN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhKbGMyVjBSR1ZtWVhWc2RITTZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1JsWm1GMWJIUnpJRDBnZEdocGN5NWtaV1poZFd4MFUyVjBkR2x1WjNNN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hrWldaaGRXeDBjeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUjBhVzVuY3lBOUlGOHVaWGgwWlc1a0tIdDlMQ0JrWldaaGRXeDBjeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5OaGRtVW9LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4wN1hHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdVMlYwZEdsdVozTTdJbDE5IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBTaW11bGF0ZSA9IHtcbiAgICBldmVudDogZnVuY3Rpb24oZWxlbWVudCwgZXZlbnROYW1lLCBvcHRpb25zKXtcbiAgICAgICAgdmFyIGV2dDtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50KSB7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkhUTUxFdmVudHNcIik7XG4gICAgICAgICAgICBldnQuaW5pdEV2ZW50KGV2ZW50TmFtZSwgZXZlbnROYW1lICE9ICdtb3VzZWVudGVyJyAmJiBldmVudE5hbWUgIT0gJ21vdXNlbGVhdmUnLCB0cnVlICk7XG4gICAgICAgICAgICBfLmV4dGVuZChldnQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICAgICAgICAgIGVsZW1lbnQuZmlyZUV2ZW50KCdvbicgKyBldmVudE5hbWUsZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAga2V5RXZlbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIG9wdGlvbnMpe1xuICAgICAgICB2YXIgZXZ0LFxuICAgICAgICAgICAgZSA9IHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlLCB2aWV3OiB3aW5kb3csXG4gICAgICAgICAgICAgICAgY3RybEtleTogZmFsc2UsIGFsdEtleTogZmFsc2UsIHNoaWZ0S2V5OiBmYWxzZSwgbWV0YUtleTogZmFsc2UsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogMCwgY2hhckNvZGU6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIF8uZXh0ZW5kKGUsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpe1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdLZXlFdmVudHMnKTtcbiAgICAgICAgICAgICAgICBldnQuaW5pdEtleUV2ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSwgZS52aWV3LFxuICAgICAgICAgICAgZS5jdHJsS2V5LCBlLmFsdEtleSwgZS5zaGlmdEtleSwgZS5tZXRhS2V5LFxuICAgICAgICAgICAgZS5rZXlDb2RlLCBlLmNoYXJDb2RlKTtcbiAgICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50c1wiKTtcbiAgICAgICAgZXZ0LmluaXRFdmVudCh0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSk7XG4gICAgICAgIF8uZXh0ZW5kKGV2dCwge1xuICAgICAgICAgICAgdmlldzogZS52aWV3LFxuICAgICAgICAgIGN0cmxLZXk6IGUuY3RybEtleSwgYWx0S2V5OiBlLmFsdEtleSxcbiAgICAgICAgICBzaGlmdEtleTogZS5zaGlmdEtleSwgbWV0YUtleTogZS5tZXRhS2V5LFxuICAgICAgICAgIGtleUNvZGU6IGUua2V5Q29kZSwgY2hhckNvZGU6IGUuY2hhckNvZGVcbiAgICAgICAgfSk7XG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5TaW11bGF0ZS5rZXlwcmVzcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5cHJlc3MnLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleWRvd24gPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleWRvd24nLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleXVwID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXl1cCcsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxudmFyIGV2ZW50cyA9IFtcbiAgICAnY2xpY2snLFxuICAgICdmb2N1cycsXG4gICAgJ2JsdXInLFxuICAgICdkYmxjbGljaycsXG4gICAgJ2lucHV0JyxcbiAgICAnY2hhbmdlJyxcbiAgICAnbW91c2Vkb3duJyxcbiAgICAnbW91c2Vtb3ZlJyxcbiAgICAnbW91c2VvdXQnLFxuICAgICdtb3VzZW92ZXInLFxuICAgICdtb3VzZXVwJyxcbiAgICAnbW91c2VlbnRlcicsXG4gICAgJ21vdXNlbGVhdmUnLFxuICAgICdyZXNpemUnLFxuICAgICdzY3JvbGwnLFxuICAgICdzZWxlY3QnLFxuICAgICdzdWJtaXQnLFxuICAgICdsb2FkJyxcbiAgICAndW5sb2FkJ1xuXTtcblxuZm9yICh2YXIgaSA9IGV2ZW50cy5sZW5ndGg7IGktLTspe1xuICAgIHZhciBldmVudCA9IGV2ZW50c1tpXTtcbiAgICBTaW11bGF0ZVtldmVudF0gPSAoZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgICAgICAgICAgdGhpcy5ldmVudChlbGVtZW50LCBldnQsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgIH0oZXZlbnQpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaW11bGF0ZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWRISmhibk5tYjNKdFpXUXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOUVaWFpsYkc5d1pYSXZZWFJ6YVdRdlVISnZhbVZqZEhNdmRYUnRaUzkxZEcxbEwzTnlZeTlxY3k5emFXMTFiR0YwWlM1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN08wRkJSVE5DTEVsQlFVa3NVVUZCVVN4SFFVRkhPMGxCUTFnc1MwRkJTeXhGUVVGRkxGTkJRVk1zVDBGQlR5eEZRVUZGTEZOQlFWTXNSVUZCUlN4UFFVRlBMRU5CUVVNN1VVRkRlRU1zU1VGQlNTeEhRVUZITEVOQlFVTTdVVUZEVWl4SlFVRkpMRkZCUVZFc1EwRkJReXhYUVVGWExFVkJRVVU3V1VGRGRFSXNSMEZCUnl4SFFVRkhMRkZCUVZFc1EwRkJReXhYUVVGWExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdXVUZEZWtNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eFRRVUZUTEVWQlFVVXNVMEZCVXl4SlFVRkpMRmxCUVZrc1NVRkJTU3hUUVVGVExFbEJRVWtzV1VGQldTeEZRVUZGTEVsQlFVa3NSVUZCUlN4RFFVRkRPMWxCUTNoR0xFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8xbEJRM1pDTEU5QlFVOHNRMEZCUXl4aFFVRmhMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03VTBGRE9VSXNTVUZCU1R0WlFVTkVMRWRCUVVjc1IwRkJSeXhSUVVGUkxFTkJRVU1zYVVKQlFXbENMRVZCUVVVc1EwRkJRenRaUVVOdVF5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1IwRkJSeXhUUVVGVExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdVMEZETTBNN1MwRkRTanRKUVVORUxGRkJRVkVzUlVGQlJTeFRRVUZUTEU5QlFVOHNSVUZCUlN4SlFVRkpMRVZCUVVVc1QwRkJUeXhEUVVGRE8xRkJRM1JETEVsQlFVa3NSMEZCUnp0WlFVTklMRU5CUVVNc1IwRkJSenRuUWtGRFFTeFBRVUZQTEVWQlFVVXNTVUZCU1N4RlFVRkZMRlZCUVZVc1JVRkJSU3hKUVVGSkxFVkJRVVVzU1VGQlNTeEZRVUZGTEUxQlFVMDdaMEpCUXpkRExFOUJRVThzUlVGQlJTeExRVUZMTEVWQlFVVXNUVUZCVFN4RlFVRkZMRXRCUVVzc1JVRkJSU3hSUVVGUkxFVkJRVVVzUzBGQlN5eEZRVUZGTEU5QlFVOHNSVUZCUlN4TFFVRkxPMmRDUVVNNVJDeFBRVUZQTEVWQlFVVXNRMEZCUXl4RlFVRkZMRkZCUVZFc1JVRkJSU3hEUVVGRE8yRkJRekZDTEVOQlFVTTdVVUZEVGl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0UlFVTnlRaXhKUVVGSkxGRkJRVkVzUTBGQlF5eFhRVUZYTEVOQlFVTTdXVUZEY2tJc1IwRkJSenRuUWtGRFF5eEhRVUZITEVkQlFVY3NVVUZCVVN4RFFVRkRMRmRCUVZjc1EwRkJReXhYUVVGWExFTkJRVU1zUTBGQlF6dG5Ra0ZEZUVNc1IwRkJSeXhEUVVGRExGbEJRVms3YjBKQlExb3NTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEZWQlFWVXNSVUZCUlN4RFFVRkRMRU5CUVVNc1NVRkJTVHRaUVVNM1F5eERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRXNSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUenRaUVVNeFF5eERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6dFZRVU42UWl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlF6VkNMRTFCUVUwc1IwRkJSeXhEUVVGRE8xbEJRMUFzUjBGQlJ5eEhRVUZITEZGQlFWRXNRMEZCUXl4WFFVRlhMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03VVVGRGVrTXNSMEZCUnl4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU03VVVGRE4wTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhIUVVGSExFVkJRVVU3V1VGRFZpeEpRVUZKTEVWQlFVVXNRMEZCUXl4RFFVRkRMRWxCUVVrN1ZVRkRaQ3hQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVc1EwRkJReXhEUVVGRExFMUJRVTA3VlVGRGNFTXNVVUZCVVN4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFVkJRVVVzVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBPMVZCUTNoRExFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRkZCUVZFc1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVUdFRRVU42UXl4RFFVRkRMRU5CUVVNN1VVRkRTQ3hQUVVGUExFTkJRVU1zWVVGQllTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUXpGQ08xTkJRMEU3UzBGRFNqdEJRVU5NTEVOQlFVTXNRMEZCUXpzN1FVRkZSaXhSUVVGUkxFTkJRVU1zVVVGQlVTeEhRVUZITEZOQlFWTXNUMEZCVHl4RlFVRkZMRWRCUVVjc1EwRkJRenRKUVVOMFF5eEpRVUZKTEZGQlFWRXNSMEZCUnl4SFFVRkhMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBsQlEycERMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zVDBGQlR5eEZRVUZGTEZWQlFWVXNSVUZCUlR0UlFVTXZRaXhQUVVGUExFVkJRVVVzVVVGQlVUdFJRVU5xUWl4UlFVRlJMRVZCUVVVc1VVRkJVVHRMUVVOeVFpeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVVVGQlVTeERRVUZETEU5QlFVOHNSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSU3hIUVVGSExFTkJRVU03U1VGRGNrTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1IwRkJSeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0SlFVTnFReXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFVOHNSVUZCUlN4VFFVRlRMRVZCUVVVN1VVRkRPVUlzVDBGQlR5eEZRVUZGTEZGQlFWRTdVVUZEYWtJc1VVRkJVU3hGUVVGRkxGRkJRVkU3UzBGRGNrSXNRMEZCUXl4RFFVRkRPMEZCUTFBc1EwRkJReXhEUVVGRE96dEJRVVZHTEZGQlFWRXNRMEZCUXl4TFFVRkxMRWRCUVVjc1UwRkJVeXhQUVVGUExFVkJRVVVzUjBGQlJ5eERRVUZETzBsQlEyNURMRWxCUVVrc1VVRkJVU3hIUVVGSExFZEJRVWNzUTBGQlF5eFZRVUZWTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1NVRkRha01zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4UFFVRlBMRVZCUVVVc1QwRkJUeXhGUVVGRk8xRkJRelZDTEU5QlFVOHNSVUZCUlN4UlFVRlJPMUZCUTJwQ0xGRkJRVkVzUlVGQlJTeFJRVUZSTzB0QlEzSkNMRU5CUVVNc1EwRkJRenRCUVVOUUxFTkJRVU1zUTBGQlF6czdRVUZGUml4SlFVRkpMRTFCUVUwc1IwRkJSenRKUVVOVUxFOUJRVTg3U1VGRFVDeFBRVUZQTzBsQlExQXNUVUZCVFR0SlFVTk9MRlZCUVZVN1NVRkRWaXhQUVVGUE8wbEJRMUFzVVVGQlVUdEpRVU5TTEZkQlFWYzdTVUZEV0N4WFFVRlhPMGxCUTFnc1ZVRkJWVHRKUVVOV0xGZEJRVmM3U1VGRFdDeFRRVUZUTzBsQlExUXNXVUZCV1R0SlFVTmFMRmxCUVZrN1NVRkRXaXhSUVVGUk8wbEJRMUlzVVVGQlVUdEpRVU5TTEZGQlFWRTdTVUZEVWl4UlFVRlJPMGxCUTFJc1RVRkJUVHRKUVVOT0xGRkJRVkU3UVVGRFdpeERRVUZETEVOQlFVTTdPMEZCUlVZc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eE5RVUZOTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8wbEJRemRDTEVsQlFVa3NTMEZCU3l4SFFVRkhMRTFCUVUwc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEpRVU4wUWl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFbEJRVWtzVTBGQlV5eEhRVUZITEVOQlFVTTdVVUZETlVJc1QwRkJUeXhUUVVGVExFOUJRVThzUlVGQlJTeFBRVUZQTEVOQlFVTTdXVUZETjBJc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eFBRVUZQTEVWQlFVVXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8xTkJRM0pETEVOQlFVTTdTMEZEVEN4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU03UVVGRFpDeERRVUZET3p0QlFVVkVMRTFCUVUwc1EwRkJReXhQUVVGUExFZEJRVWNzVVVGQlVTSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCZklEMGdjbVZ4ZFdseVpTZ25MaTkxZEdsc2N5Y3BPMXh1WEc1MllYSWdVMmx0ZFd4aGRHVWdQU0I3WEc0Z0lDQWdaWFpsYm5RNklHWjFibU4wYVc5dUtHVnNaVzFsYm5Rc0lHVjJaVzUwVG1GdFpTd2diM0IwYVc5dWN5bDdYRzRnSUNBZ0lDQWdJSFpoY2lCbGRuUTdYRzRnSUNBZ0lDQWdJR2xtSUNoa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pYWjBJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSWFpsYm5Rb1hDSklWRTFNUlhabGJuUnpYQ0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdaWFowTG1sdWFYUkZkbVZ1ZENobGRtVnVkRTVoYldVc0lHVjJaVzUwVG1GdFpTQWhQU0FuYlc5MWMyVmxiblJsY2ljZ0ppWWdaWFpsYm5ST1lXMWxJQ0U5SUNkdGIzVnpaV3hsWVhabEp5d2dkSEoxWlNBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWHk1bGVIUmxibVFvWlhaMExDQnZjSFJwYjI1ektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWc1pXMWxiblF1WkdsemNHRjBZMmhGZG1WdWRDaGxkblFwTzF4dUlDQWdJQ0FnSUNCOVpXeHpaWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVYyWlc1MFQySnFaV04wS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsYkdWdFpXNTBMbVpwY21WRmRtVnVkQ2duYjI0bklDc2daWFpsYm5ST1lXMWxMR1YyZENrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUd0bGVVVjJaVzUwT2lCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCMGVYQmxMQ0J2Y0hScGIyNXpLWHRjYmlBZ0lDQWdJQ0FnZG1GeUlHVjJkQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHVWdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5WaVlteGxjem9nZEhKMVpTd2dZMkZ1WTJWc1lXSnNaVG9nZEhKMVpTd2dkbWxsZHpvZ2QybHVaRzkzTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOMGNteExaWGs2SUdaaGJITmxMQ0JoYkhSTFpYazZJR1poYkhObExDQnphR2xtZEV0bGVUb2dabUZzYzJVc0lHMWxkR0ZMWlhrNklHWmhiSE5sTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd0bGVVTnZaR1U2SURBc0lHTm9ZWEpEYjJSbE9pQXdYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQmZMbVY0ZEdWdVpDaGxMQ0J2Y0hScGIyNXpLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWMlpXNTBLWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnllWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsZG5RZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmRtVnVkQ2duUzJWNVJYWmxiblJ6SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYWjBMbWx1YVhSTFpYbEZkbVZ1ZENoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSGx3WlN3Z1pTNWlkV0ppYkdWekxDQmxMbU5oYm1ObGJHRmliR1VzSUdVdWRtbGxkeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lHVXVZM1J5YkV0bGVTd2daUzVoYkhSTFpYa3NJR1V1YzJocFpuUkxaWGtzSUdVdWJXVjBZVXRsZVN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR1V1YTJWNVEyOWtaU3dnWlM1amFHRnlRMjlrWlNrN1hHNGdJQ0FnSUNBZ0lDQWdaV3hsYldWdWRDNWthWE53WVhSamFFVjJaVzUwS0dWMmRDazdYRzRnSUNBZ0lDQWdJSDFqWVhSamFDaGxjbklwZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaWFowSUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUlhabGJuUW9YQ0pGZG1WdWRITmNJaWs3WEc0Z0lDQWdJQ0FnSUdWMmRDNXBibWwwUlhabGJuUW9kSGx3WlN3Z1pTNWlkV0ppYkdWekxDQmxMbU5oYm1ObGJHRmliR1VwTzF4dUlDQWdJQ0FnSUNCZkxtVjRkR1Z1WkNobGRuUXNJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWnBaWGM2SUdVdWRtbGxkeXhjYmlBZ0lDQWdJQ0FnSUNCamRISnNTMlY1T2lCbExtTjBjbXhMWlhrc0lHRnNkRXRsZVRvZ1pTNWhiSFJMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdjMmhwWm5STFpYazZJR1V1YzJocFpuUkxaWGtzSUcxbGRHRkxaWGs2SUdVdWJXVjBZVXRsZVN4Y2JpQWdJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmxMbXRsZVVOdlpHVXNJR05vWVhKRGIyUmxPaUJsTG1Ob1lYSkRiMlJsWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQmxiR1Z0Wlc1MExtUnBjM0JoZEdOb1JYWmxiblFvWlhaMEtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlR0Y2JseHVVMmx0ZFd4aGRHVXVhMlY1Y0hKbGMzTWdQU0JtZFc1amRHbHZiaWhsYkdWdFpXNTBMQ0JqYUhJcGUxeHVJQ0FnSUhaaGNpQmphR0Z5UTI5a1pTQTlJR05vY2k1amFHRnlRMjlrWlVGMEtEQXBPMXh1SUNBZ0lIUm9hWE11YTJWNVJYWmxiblFvWld4bGJXVnVkQ3dnSjJ0bGVYQnlaWE56Snl3Z2UxeHVJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmphR0Z5UTI5a1pTeGNiaUFnSUNBZ0lDQWdZMmhoY2tOdlpHVTZJR05vWVhKRGIyUmxYRzRnSUNBZ2ZTazdYRzU5TzF4dVhHNVRhVzExYkdGMFpTNXJaWGxrYjNkdUlEMGdablZ1WTNScGIyNG9aV3hsYldWdWRDd2dZMmh5S1h0Y2JpQWdJQ0IyWVhJZ1kyaGhja052WkdVZ1BTQmphSEl1WTJoaGNrTnZaR1ZCZENnd0tUdGNiaUFnSUNCMGFHbHpMbXRsZVVWMlpXNTBLR1ZzWlcxbGJuUXNJQ2RyWlhsa2IzZHVKeXdnZTF4dUlDQWdJQ0FnSUNCclpYbERiMlJsT2lCamFHRnlRMjlrWlN4Y2JpQWdJQ0FnSUNBZ1kyaGhja052WkdVNklHTm9ZWEpEYjJSbFhHNGdJQ0FnZlNrN1hHNTlPMXh1WEc1VGFXMTFiR0YwWlM1clpYbDFjQ0E5SUdaMWJtTjBhVzl1S0dWc1pXMWxiblFzSUdOb2NpbDdYRzRnSUNBZ2RtRnlJR05vWVhKRGIyUmxJRDBnWTJoeUxtTm9ZWEpEYjJSbFFYUW9NQ2s3WEc0Z0lDQWdkR2hwY3k1clpYbEZkbVZ1ZENobGJHVnRaVzUwTENBbmEyVjVkWEFuTENCN1hHNGdJQ0FnSUNBZ0lHdGxlVU52WkdVNklHTm9ZWEpEYjJSbExGeHVJQ0FnSUNBZ0lDQmphR0Z5UTI5a1pUb2dZMmhoY2tOdlpHVmNiaUFnSUNCOUtUdGNibjA3WEc1Y2JuWmhjaUJsZG1WdWRITWdQU0JiWEc0Z0lDQWdKMk5zYVdOckp5eGNiaUFnSUNBblptOWpkWE1uTEZ4dUlDQWdJQ2RpYkhWeUp5eGNiaUFnSUNBblpHSnNZMnhwWTJzbkxGeHVJQ0FnSUNkcGJuQjFkQ2NzWEc0Z0lDQWdKMk5vWVc1blpTY3NYRzRnSUNBZ0oyMXZkWE5sWkc5M2JpY3NYRzRnSUNBZ0oyMXZkWE5sYlc5MlpTY3NYRzRnSUNBZ0oyMXZkWE5sYjNWMEp5eGNiaUFnSUNBbmJXOTFjMlZ2ZG1WeUp5eGNiaUFnSUNBbmJXOTFjMlYxY0Njc1hHNGdJQ0FnSjIxdmRYTmxaVzUwWlhJbkxGeHVJQ0FnSUNkdGIzVnpaV3hsWVhabEp5eGNiaUFnSUNBbmNtVnphWHBsSnl4Y2JpQWdJQ0FuYzJOeWIyeHNKeXhjYmlBZ0lDQW5jMlZzWldOMEp5eGNiaUFnSUNBbmMzVmliV2wwSnl4Y2JpQWdJQ0FuYkc5aFpDY3NYRzRnSUNBZ0ozVnViRzloWkNkY2JsMDdYRzVjYm1admNpQW9kbUZ5SUdrZ1BTQmxkbVZ1ZEhNdWJHVnVaM1JvT3lCcExTMDdLWHRjYmlBZ0lDQjJZWElnWlhabGJuUWdQU0JsZG1WdWRITmJhVjA3WEc0Z0lDQWdVMmx0ZFd4aGRHVmJaWFpsYm5SZElEMGdLR1oxYm1OMGFXOXVLR1YyZENsN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCdmNIUnBiMjV6S1h0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdVpYWmxiblFvWld4bGJXVnVkQ3dnWlhaMExDQnZjSFJwYjI1ektUdGNiaUFnSUNBZ0lDQWdmVHRjYmlBZ0lDQjlLR1YyWlc1MEtTazdYRzU5WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1UybHRkV3hoZEdVN0lsMTkiLCIvKipcbiAqIFBvbHlmaWxsc1xuICovXG5cbi8qKlxuICogVGhpcyBpcyBjb3BpZWQgZnJvbSBSZWFjSlMncyBvd24gcG9seXBmaWxsIHRvIHJ1biB0ZXN0cyB3aXRoIHBoYW50b21qcy5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC9ibG9iLzNkYzEwNzQ5MDgwYTQ2MGU0OGJlZTQ2ZDc2OTc2M2VjNzE5MWFjNzYvc3JjL3Rlc3QvcGhhbnRvbWpzLXNoaW1zLmpzXG4gKi9cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBBcCA9IEFycmF5LnByb3RvdHlwZTtcbiAgICB2YXIgc2xpY2UgPSBBcC5zbGljZTtcbiAgICB2YXIgRnAgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgICBpZiAoIUZwLmJpbmQpIHtcbiAgICAgIC8vIFBoYW50b21KUyBkb2Vzbid0IHN1cHBvcnQgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgbmF0aXZlbHksIHNvXG4gICAgICAvLyBwb2x5ZmlsbCBpdCB3aGVuZXZlciB0aGlzIG1vZHVsZSBpcyByZXF1aXJlZC5cbiAgICAgIEZwLmJpbmQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgIHZhciBmdW5jID0gdGhpcztcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICAgICAgZnVuY3Rpb24gYm91bmQoKSB7XG4gICAgICAgICAgdmFyIGludm9rZWRBc0NvbnN0cnVjdG9yID0gZnVuYy5wcm90b3R5cGUgJiYgKHRoaXMgaW5zdGFuY2VvZiBmdW5jKTtcbiAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShcbiAgICAgICAgICAgIC8vIElnbm9yZSB0aGUgY29udGV4dCBwYXJhbWV0ZXIgd2hlbiBpbnZva2luZyB0aGUgYm91bmQgZnVuY3Rpb25cbiAgICAgICAgICAgIC8vIGFzIGEgY29uc3RydWN0b3IuIE5vdGUgdGhhdCB0aGlzIGluY2x1ZGVzIG5vdCBvbmx5IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAvLyBpbnZvY2F0aW9ucyB1c2luZyB0aGUgbmV3IGtleXdvcmQgYnV0IGFsc28gY2FsbHMgdG8gYmFzZSBjbGFzc1xuICAgICAgICAgICAgLy8gY29uc3RydWN0b3JzIHN1Y2ggYXMgQmFzZUNsYXNzLmNhbGwodGhpcywgLi4uKSBvciBzdXBlciguLi4pLlxuICAgICAgICAgICAgIWludm9rZWRBc0NvbnN0cnVjdG9yICYmIGNvbnRleHQgfHwgdGhpcyxcbiAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGJvdW5kIGZ1bmN0aW9uIG11c3Qgc2hhcmUgdGhlIC5wcm90b3R5cGUgb2YgdGhlIHVuYm91bmRcbiAgICAgICAgLy8gZnVuY3Rpb24gc28gdGhhdCBhbnkgb2JqZWN0IGNyZWF0ZWQgYnkgb25lIGNvbnN0cnVjdG9yIHdpbGwgY291bnRcbiAgICAgICAgLy8gYXMgYW4gaW5zdGFuY2Ugb2YgYm90aCBjb25zdHJ1Y3RvcnMuXG4gICAgICAgIGJvdW5kLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuXG4gICAgICAgIHJldHVybiBib3VuZDtcbiAgICAgIH07XG4gICAgfVxuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKGRzdCwgc3JjKXtcbiAgICAgICAgaWYgKHNyYykge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNyYykge1xuICAgICAgICAgICAgICAgIGlmIChzcmMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZHN0O1xuICAgIH0sXG5cbiAgICBtYXA6IGZ1bmN0aW9uKG9iaiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGggPj4+IDA7XG4gICAgICAgIHZhciBuZXdBcnJheSA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgICB2YXIga2V5ID0gMDtcbiAgICAgICAgaWYgKCF0aGlzQXJnKSB7XG4gICAgICAgICAgICB0aGlzQXJnID0gb2JqO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChrZXkgPCBsZW4pIHtcbiAgICAgICAgICAgIG5ld0FycmF5W2tleV0gPSBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXNba2V5XSwga2V5LCBvYmopO1xuICAgICAgICAgICAga2V5Kys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xuICAgIH1cblxufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWRISmhibk5tYjNKdFpXUXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOUVaWFpsYkc5d1pYSXZZWFJ6YVdRdlVISnZhbVZqZEhNdmRYUnRaUzkxZEcxbEwzTnlZeTlxY3k5MWRHbHNjeTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFUczdRVUZGUVN4SFFVRkhPenRCUVVWSU8wRkJRMEU3TzBkQlJVYzdRVUZEU0N4RFFVRkRMRmRCUVZjN08wbEJSVklzU1VGQlNTeEZRVUZGTEVkQlFVY3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJRenRKUVVONlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4RlFVRkZMRU5CUVVNc1MwRkJTeXhEUVVGRE8wRkJRM3BDTEVsQlFVa3NTVUZCU1N4RlFVRkZMRWRCUVVjc1VVRkJVU3hEUVVGRExGTkJRVk1zUTBGQlF6czdRVUZGYUVNc1NVRkJTU3hKUVVGSkxFTkJRVU1zUlVGQlJTeERRVUZETEVsQlFVa3NSVUZCUlR0QlFVTnNRanM3VFVGRlRTeEZRVUZGTEVOQlFVTXNTVUZCU1N4SFFVRkhMRk5CUVZNc1QwRkJUeXhGUVVGRk8xRkJRekZDTEVsQlFVa3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJRenRCUVVONFFpeFJRVUZSTEVsQlFVa3NTVUZCU1N4SFFVRkhMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eEZRVUZGTEVOQlFVTXNRMEZCUXl4RFFVRkRPenRSUVVWd1F5eFRRVUZUTEV0QlFVc3NSMEZCUnp0VlFVTm1MRWxCUVVrc2IwSkJRVzlDTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1MwRkJTeXhKUVVGSkxGbEJRVmtzU1VGQlNTeERRVUZETEVOQlFVTTdRVUZET1VVc1ZVRkJWU3hQUVVGUExFbEJRVWtzUTBGQlF5eExRVUZMTzBGQlF6TkNPMEZCUTBFN1FVRkRRVHM3V1VGRldTeERRVUZETEc5Q1FVRnZRaXhKUVVGSkxFOUJRVThzU1VGQlNTeEpRVUZKTzFsQlEzaERMRWxCUVVrc1EwRkJReXhOUVVGTkxFTkJRVU1zUzBGQlN5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRYUVVOdVF5eERRVUZETzBGQlExb3NVMEZCVXp0QlFVTlVPMEZCUTBFN1FVRkRRVHM3UVVGRlFTeFJRVUZSTEV0QlFVc3NRMEZCUXl4VFFVRlRMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF6czdVVUZGYWtNc1QwRkJUeXhMUVVGTExFTkJRVU03VDBGRFpDeERRVUZETzBGQlExSXNTMEZCU3pzN1FVRkZUQ3hEUVVGRExFZEJRVWNzUTBGQlF6czdRVUZGVEN4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSE96dEpRVVZpTEUxQlFVMHNSVUZCUlN4VFFVRlRMRTFCUVUwc1EwRkJReXhIUVVGSExFVkJRVVVzUjBGQlJ5eERRVUZETzFGQlF6ZENMRWxCUVVrc1IwRkJSeXhGUVVGRk8xbEJRMHdzUzBGQlN5eEpRVUZKTEVkQlFVY3NTVUZCU1N4SFFVRkhMRVZCUVVVN1owSkJRMnBDTEVsQlFVa3NSMEZCUnl4RFFVRkRMR05CUVdNc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJUdHZRa0ZEZWtJc1IwRkJSeXhEUVVGRExFZEJRVWNzUTBGQlF5eEhRVUZITEVkQlFVY3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRwUWtGRGRrSTdZVUZEU2p0VFFVTktPMUZCUTBRc1QwRkJUeXhIUVVGSExFTkJRVU03UVVGRGJrSXNTMEZCU3pzN1NVRkZSQ3hIUVVGSExFVkJRVVVzVTBGQlV5eEhRVUZITEVWQlFVVXNVVUZCVVN4RlFVRkZMRTlCUVU4c1JVRkJSVHRSUVVOc1F5eEpRVUZKTEVkQlFVY3NSMEZCUnl4SFFVRkhMRU5CUVVNc1RVRkJUU3hMUVVGTExFTkJRVU1zUTBGQlF6dFJRVU16UWl4SlFVRkpMRkZCUVZFc1IwRkJSeXhKUVVGSkxFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0UlFVTTVRaXhKUVVGSkxFZEJRVWNzUjBGQlJ5eERRVUZETEVOQlFVTTdVVUZEV2l4SlFVRkpMRU5CUVVNc1QwRkJUeXhGUVVGRk8xbEJRMVlzVDBGQlR5eEhRVUZITEVkQlFVY3NRMEZCUXp0VFFVTnFRanRSUVVORUxFOUJRVThzUjBGQlJ5eEhRVUZITEVkQlFVY3NSVUZCUlR0WlFVTmtMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zUjBGQlJ5eFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE8xbEJRelZFTEVkQlFVY3NSVUZCUlN4RFFVRkRPMU5CUTFRN1VVRkRSQ3hQUVVGUExGRkJRVkVzUTBGQlF6dEJRVU40UWl4TFFVRkxPenREUVVWS0lpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lMeW9xWEc0Z0tpQlFiMng1Wm1sc2JITmNiaUFxTDF4dVhHNHZLaXBjYmlBcUlGUm9hWE1nYVhNZ1kyOXdhV1ZrSUdaeWIyMGdVbVZoWTBwVEozTWdiM2R1SUhCdmJIbHdabWxzYkNCMGJ5QnlkVzRnZEdWemRITWdkMmwwYUNCd2FHRnVkRzl0YW5NdVhHNGdLaUJvZEhSd2N6b3ZMMmRwZEdoMVlpNWpiMjB2Wm1GalpXSnZiMnN2Y21WaFkzUXZZbXh2WWk4elpHTXhNRGMwT1RBNE1HRTBOakJsTkRoaVpXVTBObVEzTmprM05qTmxZemN4T1RGaFl6YzJMM055WXk5MFpYTjBMM0JvWVc1MGIyMXFjeTF6YUdsdGN5NXFjMXh1SUNvdlhHNG9ablZ1WTNScGIyNG9LU0I3WEc1Y2JpQWdJQ0IyWVhJZ1FYQWdQU0JCY25KaGVTNXdjbTkwYjNSNWNHVTdYRzRnSUNBZ2RtRnlJSE5zYVdObElEMGdRWEF1YzJ4cFkyVTdYRzRnSUNBZ2RtRnlJRVp3SUQwZ1JuVnVZM1JwYjI0dWNISnZkRzkwZVhCbE8xeHVYRzRnSUNBZ2FXWWdLQ0ZHY0M1aWFXNWtLU0I3WEc0Z0lDQWdJQ0F2THlCUWFHRnVkRzl0U2xNZ1pHOWxjMjRuZENCemRYQndiM0owSUVaMWJtTjBhVzl1TG5CeWIzUnZkSGx3WlM1aWFXNWtJRzVoZEdsMlpXeDVMQ0J6YjF4dUlDQWdJQ0FnTHk4Z2NHOXNlV1pwYkd3Z2FYUWdkMmhsYm1WMlpYSWdkR2hwY3lCdGIyUjFiR1VnYVhNZ2NtVnhkV2x5WldRdVhHNGdJQ0FnSUNCR2NDNWlhVzVrSUQwZ1puVnVZM1JwYjI0b1kyOXVkR1Y0ZENrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnWm5WdVl5QTlJSFJvYVhNN1hHNGdJQ0FnSUNBZ0lIWmhjaUJoY21keklEMGdjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1zSURFcE8xeHVYRzRnSUNBZ0lDQWdJR1oxYm1OMGFXOXVJR0p2ZFc1a0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUE5SUdaMWJtTXVjSEp2ZEc5MGVYQmxJQ1ltSUNoMGFHbHpJR2x1YzNSaGJtTmxiMllnWm5WdVl5azdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYm1NdVlYQndiSGtvWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJKWjI1dmNtVWdkR2hsSUdOdmJuUmxlSFFnY0dGeVlXMWxkR1Z5SUhkb1pXNGdhVzUyYjJ0cGJtY2dkR2hsSUdKdmRXNWtJR1oxYm1OMGFXOXVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QmhjeUJoSUdOdmJuTjBjblZqZEc5eUxpQk9iM1JsSUhSb1lYUWdkR2hwY3lCcGJtTnNkV1JsY3lCdWIzUWdiMjVzZVNCamIyNXpkSEoxWTNSdmNseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2FXNTJiMk5oZEdsdmJuTWdkWE5wYm1jZ2RHaGxJRzVsZHlCclpYbDNiM0prSUdKMWRDQmhiSE52SUdOaGJHeHpJSFJ2SUdKaGMyVWdZMnhoYzNOY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUdOdmJuTjBjblZqZEc5eWN5QnpkV05vSUdGeklFSmhjMlZEYkdGemN5NWpZV3hzS0hSb2FYTXNJQzR1TGlrZ2IzSWdjM1Z3WlhJb0xpNHVLUzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDRnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUFtSmlCamIyNTBaWGgwSUh4OElIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ0lDQmhjbWR6TG1OdmJtTmhkQ2h6YkdsalpTNWpZV3hzS0dGeVozVnRaVzUwY3lrcFhHNGdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDOHZJRlJvWlNCaWIzVnVaQ0JtZFc1amRHbHZiaUJ0ZFhOMElITm9ZWEpsSUhSb1pTQXVjSEp2ZEc5MGVYQmxJRzltSUhSb1pTQjFibUp2ZFc1a1hHNGdJQ0FnSUNBZ0lDOHZJR1oxYm1OMGFXOXVJSE52SUhSb1lYUWdZVzU1SUc5aWFtVmpkQ0JqY21WaGRHVmtJR0o1SUc5dVpTQmpiMjV6ZEhKMVkzUnZjaUIzYVd4c0lHTnZkVzUwWEc0Z0lDQWdJQ0FnSUM4dklHRnpJR0Z1SUdsdWMzUmhibU5sSUc5bUlHSnZkR2dnWTI5dWMzUnlkV04wYjNKekxseHVJQ0FnSUNBZ0lDQmliM1Z1WkM1d2NtOTBiM1I1Y0dVZ1BTQm1kVzVqTG5CeWIzUnZkSGx3WlR0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1ltOTFibVE3WEc0Z0lDQWdJQ0I5TzF4dUlDQWdJSDFjYmx4dWZTa29LVHRjYmx4dWJXOWtkV3hsTG1WNGNHOXlkSE1nUFNCN1hHNWNiaUFnSUNCbGVIUmxibVE2SUdaMWJtTjBhVzl1SUdWNGRHVnVaQ2hrYzNRc0lITnlZeWw3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR3RsZVNCcGJpQnpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM0pqTG1oaGMwOTNibEJ5YjNCbGNuUjVLR3RsZVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkhOMFcydGxlVjBnUFNCemNtTmJhMlY1WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSemREdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JXRndPaUJtZFc1amRHbHZiaWh2WW1vc0lHTmhiR3hpWVdOckxDQjBhR2x6UVhKbktTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCc1pXNGdQU0J2WW1vdWJHVnVaM1JvSUQ0K1BpQXdPMXh1SUNBZ0lDQWdJQ0IyWVhJZ2JtVjNRWEp5WVhrZ1BTQnVaWGNnUVhKeVlYa29iR1Z1S1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3RsZVNBOUlEQTdYRzRnSUNBZ0lDQWdJR2xtSUNnaGRHaHBjMEZ5WnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGMwRnlaeUE5SUc5aWFqdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0IzYUdsc1pTQW9hMlY1SUR3Z2JHVnVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnVaWGRCY25KaGVWdHJaWGxkSUQwZ1kyRnNiR0poWTJzdVkyRnNiQ2gwYUdselFYSm5MQ0IwYUdselcydGxlVjBzSUd0bGVTd2diMkpxS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3RsZVNzck8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnVaWGRCY25KaGVUdGNiaUFnSUNCOVhHNWNibjA3SWwxOSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFByb21pc2UgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG52YXIgU2ltdWxhdGUgPSByZXF1aXJlKCcuL3NpbXVsYXRlJyk7XG52YXIgc2VsZWN0b3JGaW5kZXIgPSByZXF1aXJlKCcuL3NlbGVjdG9yRmluZGVyJyk7XG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG5cbi8vIHZhciBteUdlbmVyYXRvciA9IG5ldyBDc3NTZWxlY3RvckdlbmVyYXRvcigpO1xudmFyIGltcG9ydGFudFN0ZXBMZW5ndGggPSA1MDA7XG52YXIgc2F2ZUhhbmRsZXJzID0gW107XG52YXIgcmVwb3J0SGFuZGxlcnMgPSBbXTtcbnZhciBsb2FkSGFuZGxlcnMgPSBbXTtcbnZhciBzZXR0aW5nc0xvYWRIYW5kbGVycyA9IFtdO1xuXG5mdW5jdGlvbiBnZXRTY2VuYXJpbyhuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgaWYgKGxvYWRIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHV0bWUuc3RhdGU7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlLnNjZW5hcmlvcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5zY2VuYXJpb3NbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHN0YXRlLnNjZW5hcmlvc1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9hZEhhbmRsZXJzWzBdKG5hbWUsIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG52YXIgdmFsaWRhdGluZyA9IGZhbHNlO1xuXG52YXIgZXZlbnRzID0gW1xuICAgICdjbGljaycsXG4gICAgJ2ZvY3VzJyxcbiAgICAnYmx1cicsXG4gICAgJ2RibGNsaWNrJyxcbiAgICAvLyAnZHJhZycsXG4gICAgLy8gJ2RyYWdlbnRlcicsXG4gICAgLy8gJ2RyYWdsZWF2ZScsXG4gICAgLy8gJ2RyYWdvdmVyJyxcbiAgICAvLyAnZHJhZ3N0YXJ0JyxcbiAgICAvLyAnaW5wdXQnLFxuICAgICdtb3VzZWRvd24nLFxuICAgIC8vICdtb3VzZW1vdmUnLFxuICAgICdtb3VzZWVudGVyJyxcbiAgICAnbW91c2VsZWF2ZScsXG4gICAgJ21vdXNlb3V0JyxcbiAgICAnbW91c2VvdmVyJyxcbiAgICAnbW91c2V1cCcsXG4gICAgJ2NoYW5nZScsXG4gICAgLy8gJ3Jlc2l6ZScsXG4gICAgLy8gJ3Njcm9sbCdcbl07XG5cbmZ1bmN0aW9uIGdldFByZWNvbmRpdGlvbnMgKHNjZW5hcmlvKSB7XG4gICAgdmFyIHNldHVwID0gc2NlbmFyaW8uc2V0dXA7XG4gICAgdmFyIHNjZW5hcmlvcyA9IHNldHVwICYmIHNldHVwLnNjZW5hcmlvcztcbiAgICAvLyBUT0RPOiBCcmVhayBvdXQgaW50byBoZWxwZXJcbiAgICBpZiAoc2NlbmFyaW9zKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChfLm1hcChzY2VuYXJpb3MsIGZ1bmN0aW9uIChzY2VuYXJpb05hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTY2VuYXJpbyhzY2VuYXJpb05hbWUpLnRoZW4oZnVuY3Rpb24gKG90aGVyU2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgb3RoZXJTY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3RoZXJTY2VuYXJpbykpO1xuICAgICAgICAgICAgICByZXR1cm4gb3RoZXJTY2VuYXJpby5zdGVwcztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQb3N0Y29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgY2xlYW51cCA9IHNjZW5hcmlvLmNsZWFudXA7XG4gICAgdmFyIHNjZW5hcmlvcyA9IGNsZWFudXAgJiYgY2xlYW51cC5zY2VuYXJpb3M7XG4gICAgLy8gVE9ETzogQnJlYWsgb3V0IGludG8gaGVscGVyXG4gICAgaWYgKHNjZW5hcmlvcykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoXy5tYXAoc2NlbmFyaW9zLCBmdW5jdGlvbiAoc2NlbmFyaW9OYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U2NlbmFyaW8oc2NlbmFyaW9OYW1lKS50aGVuKGZ1bmN0aW9uIChvdGhlclNjZW5hcmlvKSB7XG4gICAgICAgICAgICAgIG90aGVyU2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG90aGVyU2NlbmFyaW8pKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG90aGVyU2NlbmFyaW8uc3RlcHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBzKSB7XG4gICAgdmFyIG5ld1N0ZXBzID0gW107XG4gICAgdmFyIGN1cnJlbnRUaW1lc3RhbXA7IC8vIGluaXRhbGl6ZWQgYnkgZmlyc3QgbGlzdCBvZiBzdGVwcy5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBmbGF0U3RlcHMgPSBzdGVwc1tqXTtcbiAgICAgICAgaWYgKGogPiAwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHN0ZXBzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXAgPSBmbGF0U3RlcHNba107XG4gICAgICAgICAgICAgICAgdmFyIGRpZmYgPSBrID4gMCA/IHN0ZXAudGltZVN0YW1wIC0gZmxhdFN0ZXBzW2sgLSAxXS50aW1lU3RhbXAgOiA1MDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wICs9IGRpZmY7XG4gICAgICAgICAgICAgICAgZmxhdFN0ZXBzW2tdLnRpbWVTdGFtcCA9IGN1cnJlbnRUaW1lc3RhbXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wID0gZmxhdFN0ZXBzW2pdLnRpbWVTdGFtcDtcbiAgICAgICAgfVxuICAgICAgICBuZXdTdGVwcyA9IG5ld1N0ZXBzLmNvbmNhdChmbGF0U3RlcHMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3U3RlcHM7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRQcmVjb25kaXRpb25zKHNjZW5hcmlvKSxcbiAgICAgICAgZ2V0UG9zdGNvbmRpdGlvbnMoc2NlbmFyaW8pXG4gICAgXSkudGhlbihmdW5jdGlvbiAoc3RlcEFycmF5cykge1xuICAgICAgICB2YXIgc3RlcExpc3RzID0gc3RlcEFycmF5c1swXS5jb25jYXQoW3NjZW5hcmlvLnN0ZXBzXSwgc3RlcEFycmF5c1sxXSk7XG4gICAgICAgIHNjZW5hcmlvLnN0ZXBzID0gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBMaXN0cyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJ1blN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKSB7XG4gICAgdXRtZS5icm9hZGNhc3QoJ1JVTk5JTkdfU1RFUCcpO1xuICAgIHRvU2tpcCA9IHRvU2tpcCB8fCB7fTtcblxuICAgIHZhciBzdGVwID0gc2NlbmFyaW8uc3RlcHNbaWR4XTtcbiAgICB2YXIgc3RhdGUgPSB1dG1lLnN0YXRlO1xuICAgIGlmIChzdGVwICYmIHN0YXRlLnN0YXR1cyA9PSAnUExBWUlORycpIHtcbiAgICAgICAgc3RhdGUucnVuLnNjZW5hcmlvID0gc2NlbmFyaW87XG4gICAgICAgIHN0YXRlLnJ1bi5zdGVwSW5kZXggPSBpZHg7XG4gICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAnbG9hZCcpIHtcbiAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IHN0ZXAuZGF0YS51cmwucHJvdG9jb2wgKyBcIi8vXCIgKyBzdGVwLmRhdGEudXJsLmhvc3QgKyBcIi9cIjtcbiAgICAgICAgICAgIHZhciBzZWFyY2ggPSBzdGVwLmRhdGEudXJsLnNlYXJjaDtcbiAgICAgICAgICAgIHZhciBoYXNoID0gc3RlcC5kYXRhLnVybC5oYXNoO1xuICAgICAgICAgICAgdmFyIHRlc3RTZXJ2ZXIgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoXCJ1dG1lX3Rlc3Rfc2VydmVyXCIpO1xuICAgICAgICAgICAgaWYgKHRlc3RTZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2ggKz0gKHNlYXJjaCA/IFwiJlwiIDogXCI/XCIpICsgXCJ1dG1lX3Rlc3Rfc2VydmVyPVwiICsgdGVzdFNlcnZlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKGxvY2F0aW9uICsgc2VhcmNoICsgaGFzaCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKChsb2NhdGlvbi5wcm90b2NvbCArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5zZWFyY2gpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKChzdGVwLmRhdGEudXJsLnByb3RvY29sICsgc3RlcC5kYXRhLnVybC5ob3N0ICsgc3RlcC5kYXRhLnVybC5zZWFyY2gpKTtcblxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBub3QgY2hhbmdlZCB0aGUgYWN0dWFsIGxvY2F0aW9uLCB0aGVuIHRoZSBsb2NhdGlvbi5yZXBsYWNlXG4gICAgICAgICAgICAvLyB3aWxsIG5vdCBnbyBhbnl3aGVyZVxuICAgICAgICAgICAgaWYgKChsb2NhdGlvbi5wcm90b2NvbCArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5zZWFyY2gpID09PVxuICAgICAgICAgICAgICAgIChzdGVwLmRhdGEudXJsLnByb3RvY29sICsgc3RlcC5kYXRhLnVybC5ob3N0ICsgc3RlcC5kYXRhLnVybC5zZWFyY2gpKSB7XG4gICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd0aW1lb3V0Jykge1xuICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXAsIHN0ZXAuZGF0YS5hbW91bnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGxvY2F0b3IgPSBzdGVwLmRhdGEubG9jYXRvcjtcbiAgICAgICAgICAgIHZhciBzdGVwcyA9IHNjZW5hcmlvLnN0ZXBzO1xuICAgICAgICAgICAgdmFyIHVuaXF1ZUlkID0gZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKTtcblxuICAgICAgICAgICAgLy8gdHJ5IHRvIGdldCByaWQgb2YgdW5uZWNlc3Nhcnkgc3RlcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdG9Ta2lwW3VuaXF1ZUlkXSA9PSAndW5kZWZpbmVkJyAmJiB1dG1lLnN0YXRlLnJ1bi5zcGVlZCAhPSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgIHZhciBkaWZmO1xuICAgICAgICAgICAgICB2YXIgaWdub3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgIGZvciAodmFyIGogPSBzdGVwcy5sZW5ndGggLSAxOyBqID4gaWR4OyBqLS0pIHtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJTdGVwID0gc3RlcHNbal07XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyVW5pcXVlSWQgPSBnZXRVbmlxdWVJZEZyb21TdGVwKG90aGVyU3RlcCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuaXF1ZUlkID09PSBvdGhlclVuaXF1ZUlkKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWRpZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gKG90aGVyU3RlcC50aW1lU3RhbXAgLSBzdGVwLnRpbWVTdGFtcCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWdub3JlID0gIWlzSW1wb3J0YW50U3RlcChvdGhlclN0ZXApICYmIGRpZmYgPCBpbXBvcnRhbnRTdGVwTGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ludGVyYWN0aXZlU3RlcChvdGhlclN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWdub3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgdG9Ta2lwW3VuaXF1ZUlkXSA9IGlnbm9yZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UncmUgc2tpcHBpbmcgdGhpcyBlbGVtZW50XG4gICAgICAgICAgICBpZiAodG9Ta2lwW2dldFVuaXF1ZUlkRnJvbVN0ZXAoc3RlcCldKSB7XG4gICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5VW50aWxGb3VuZChzY2VuYXJpbywgc3RlcCwgbG9jYXRvciwgZ2V0VGltZW91dChzY2VuYXJpbywgaWR4KSkudGhlbihmdW5jdGlvbiAoZWxlcykge1xuXG4gICAgICAgICAgICAgICAgICB2YXIgZWxlID0gZWxlc1swXTtcbiAgICAgICAgICAgICAgICAgIHZhciB0YWdOYW1lID0gZWxlLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdXBwb3J0c0lucHV0RXZlbnQgPSB0YWdOYW1lID09PSAnaW5wdXQnIHx8IHRhZ05hbWUgPT09ICd0ZXh0YXJlYScgfHwgZWxlLmdldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJyk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChldmVudHMuaW5kZXhPZihzdGVwLmV2ZW50TmFtZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5kYXRhLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMud2hpY2ggPSBvcHRpb25zLmJ1dHRvbiA9IHN0ZXAuZGF0YS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnU2ltdWxhdGluZyAnICsgc3RlcC5ldmVudE5hbWUgKyAnIG9uIGVsZW1lbnQgJywgZWxlLCBsb2NhdG9yLnNlbGVjdG9yc1swXSwgXCIgZm9yIHN0ZXAgXCIgKyBpZHgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ2NsaWNrJykge1xuICAgICAgICAgICAgICAgICAgICAgICQoZWxlKS50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChzdGVwLmV2ZW50TmFtZSA9PSAnZm9jdXMnIHx8IHN0ZXAuZXZlbnROYW1lID09ICdibHVyJykgJiYgZWxlW3N0ZXAuZXZlbnROYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgIGVsZVtzdGVwLmV2ZW50TmFtZV0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZVtzdGVwLmV2ZW50TmFtZV0oZWxlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RlcC5kYXRhLnZhbHVlICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICBlbGUudmFsdWUgPSBzdGVwLmRhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0aGUgaW5wdXQgZXZlbnQuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHN1cHBvcnRzSW5wdXRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnY2hhbmdlJyk7IC8vIFRoaXMgc2hvdWxkIGJlIGZpcmVkIGFmdGVyIGEgYmx1ciBldmVudC5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ2tleXByZXNzJykge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGVwLmRhdGEua2V5Q29kZSk7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXByZXNzKGVsZSwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5ZG93bihlbGUsIGtleSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZWxlLnZhbHVlID0gc3RlcC5kYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdjaGFuZ2UnKTtcblxuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5rZXl1cChlbGUsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXBwb3J0c0lucHV0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coJ1ZhbGlkYXRlOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICArIFwiIGNvbnRhaW5zIHRleHQgJ1wiICArIHN0ZXAuZGF0YS50ZXh0ICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlZhbGlkYXRlOiBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8oZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JBbmd1bGFyKHJvb3RTZWxlY3Rvcikge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iocm9vdFNlbGVjdG9yKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCF3aW5kb3cuYW5ndWxhcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYW5ndWxhciBjb3VsZCBub3QgYmUgZm91bmQgb24gdGhlIHdpbmRvdycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZ2V0VGVzdGFiaWxpdHkpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmdldFRlc3RhYmlsaXR5KGVsKS53aGVuU3RhYmxlKHJlc29sdmUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZWxlbWVudChlbCkuaW5qZWN0b3IoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Jvb3QgZWxlbWVudCAoJyArIHJvb3RTZWxlY3RvciArICcpIGhhcyBubyBpbmplY3Rvci4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICcgdGhpcyBtYXkgbWVhbiBpdCBpcyBub3QgaW5zaWRlIG5nLWFwcC4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGVsKS5pbmplY3RvcigpLmdldCgnJGJyb3dzZXInKS5cbiAgICAgICAgICAgICAgICBub3RpZnlXaGVuTm9PdXRzdGFuZGluZ1JlcXVlc3RzKHJlc29sdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzSW1wb3J0YW50U3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZWxlYXZlJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VvdXQnICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdibHVyJztcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHN0ZXAgaXMgc29tZSBzb3J0IG9mIHVzZXIgaW50ZXJhY3Rpb25cbiAqL1xuZnVuY3Rpb24gaXNJbnRlcmFjdGl2ZVN0ZXAoc3RlcCkge1xuICAgIHJldHVyblxuICAgICAgb3RoZXJTdGVwLmV2ZW50TmFtZS5pbmRleE9mKFwibW91c2VcIikgIT09IDAgfHxcbiAgICAgIG90aGVyU3RlcC5ldmVudE5hbWUuaW5kZXhPZihcIm1vdXNlZG93blwiKSA9PT0gMCB8fFxuICAgICAgb3RoZXJTdGVwLmV2ZW50TmFtZS5pbmRleE9mKFwibW91c2V1cFwiKSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gdHJ5VW50aWxGb3VuZChzY2VuYXJpbywgc3RlcCwgbG9jYXRvciwgdGltZW91dCwgdGV4dFRvQ2hlY2spIHtcbiAgICB2YXIgc3RhcnRlZDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiB0cnlGaW5kKCkge1xuICAgICAgICAgICAgaWYgKCFzdGFydGVkKSB7XG4gICAgICAgICAgICAgICAgc3RhcnRlZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlcztcbiAgICAgICAgICAgIHZhciBmb3VuZFRvb01hbnkgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBmb3VuZFZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZm91bmREaWZmZXJlbnRUZXh0ID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgc2VsZWN0b3JzVG9UZXN0ID0gbG9jYXRvci5zZWxlY3RvcnMuc2xpY2UoMCk7XG4gICAgICAgICAgICB2YXIgdGV4dFRvQ2hlY2sgPSBzdGVwLmRhdGEudGV4dDtcbiAgICAgICAgICAgIHZhciBjb21wYXJpc29uID0gc3RlcC5kYXRhLmNvbXBhcmlzb24gfHwgXCJlcXVhbHNcIjtcbiAgICAgICAgICAgIHNlbGVjdG9yc1RvVGVzdC51bnNoaWZ0KCdbZGF0YS11bmlxdWUtaWQ9XCInICsgbG9jYXRvci51bmlxdWVJZCArICdcIl0nKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzVG9UZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzVG9UZXN0W2ldO1xuICAgICAgICAgICAgICAgIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gXCI6dmlzaWJsZVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbGVzID0gJChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKGVsZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0ZXh0VG9DaGVjayAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld1RleHQgPSAkKGVsZXNbMF0pLnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoY29tcGFyaXNvbiA9PT0gJ2VxdWFscycgJiYgbmV3VGV4dCA9PT0gdGV4dFRvQ2hlY2spIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNvbXBhcmlzb24gPT09ICdjb250YWlucycgJiYgbmV3VGV4dC5pbmRleE9mKHRleHRUb0NoZWNrKSA+PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZERpZmZlcmVudFRleHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRWYWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVzLmF0dHIoJ2RhdGEtdW5pcXVlLWlkJywgbG9jYXRvci51bmlxdWVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVsZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZFRvb01hbnkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZvdW5kVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGVsZXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkgJiYgKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRlZCkgPCB0aW1lb3V0ICogNSkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgNTApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAoZm91bmRUb29NYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBGb3VuZCBUb28gTWFueSBFbGVtZW50c1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZm91bmREaWZmZXJlbnRUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBUZXh0IGRvZXNuJ3QgbWF0Y2guICBcXG5FeHBlY3RlZDpcXG5cIiArIHRleHRUb0NoZWNrICsgXCJcXG5idXQgd2FzXFxuXCIgKyBlbGVzLnRleHQoKSArIFwiXFxuXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IE5vIGVsZW1lbnRzIGZvdW5kXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxpbWl0ID0gaW1wb3J0YW50U3RlcExlbmd0aCAvICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PSAncmVhbHRpbWUnID8gJzEnIDogdXRtZS5zdGF0ZS5ydW4uc3BlZWQpO1xuICAgICAgICBpZiAoZ2xvYmFsLmFuZ3VsYXIpIHtcbiAgICAgICAgICAgIHdhaXRGb3JBbmd1bGFyKCdbbmctYXBwXScpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgICB0cnlGaW5kKCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiB1dG1lLnN0YXRlLnJ1bi5zcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIHRpbWVvdXQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiB1dG1lLnN0YXRlLnJ1bi5zcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lb3V0KHNjZW5hcmlvLCBpZHgpIHtcbiAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgc3RlcCBpcyBhIHZhbGlkYXRlIHN0ZXAsIHRoZW4ganVzdCBtb3ZlIG9uLCBhbmQgcHJldGVuZCBpdCBpc24ndCB0aGVyZVxuICAgICAgICAvLyBPciBpZiBpdCBpcyBhIHNlcmllcyBvZiBrZXlzLCB0aGVuIGdvXG4gICAgICAgIGlmIChzY2VuYXJpby5zdGVwc1tpZHggLSAxXS5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5hcmlvLnN0ZXBzW2lkeF0udGltZVN0YW1wIC0gc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0udGltZVN0YW1wO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCB0aW1lb3V0KSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGFyZW4ndCBnb2luZyB0byBvdmVyZmxvdyB0aGUgY2FsbCBzdGFjay5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHMubGVuZ3RoID4gKGlkeCArIDEpKSB7XG4gICAgICAgICAgICBydW5TdGVwKHNjZW5hcmlvLCBpZHggKyAxLCB0b1NraXApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9LCB0aW1lb3V0IHx8IDApO1xufVxuXG5mdW5jdGlvbiBmcmFnbWVudEZyb21TdHJpbmcoc3RySFRNTCkge1xuICAgIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICB0ZW1wLmlubmVySFRNTCA9IHN0ckhUTUw7XG4gICAgLy8gY29uc29sZS5sb2codGVtcC5pbm5lckhUTUwpO1xuICAgIHJldHVybiB0ZW1wLmNvbnRlbnQgPyB0ZW1wLmNvbnRlbnQgOiB0ZW1wO1xufVxuXG5mdW5jdGlvbiBnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApIHtcbiAgICByZXR1cm4gc3RlcCAmJiBzdGVwLmRhdGEgJiYgc3RlcC5kYXRhLmxvY2F0b3IgJiYgc3RlcC5kYXRhLmxvY2F0b3IudW5pcXVlSWQ7XG59XG5cbnZhciBndWlkID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBzNCgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXG4gICAgICAgICAgICAudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgICAgICAgICBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xuICAgIH07XG59KSgpO1xuXG52YXIgbGlzdGVuZXJzID0gW107XG52YXIgc3RhdGU7XG52YXIgc2V0dGluZ3M7XG52YXIgdXRtZSA9IHtcbiAgICBzdGF0ZTogc3RhdGUsXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2NlbmFyaW8gPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3V0bWVfc2NlbmFyaW8nKTtcbiAgICAgICAgcmV0dXJuIHV0bWUubG9hZFNldHRpbmdzKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHV0bWUuc3RhdGUgPSB1dG1lLmxvYWRTdGF0ZUZyb21TdG9yYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdJTklUSUFMSVpFRCcpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmF1dG9SdW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcnVuQ29uZmlnID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3J1bl9jb25maWcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydW5Db25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydW5Db25maWcgPSBKU09OLnBhcnNlKHJ1bkNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5Db25maWcgPSBydW5Db25maWcgfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3BlZWQgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3V0bWVfcnVuX3NwZWVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3BlZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydW5Db25maWcuc3BlZWQgPSBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5ydW5TY2VuYXJpbyhzY2VuYXJpbywgcnVuQ29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gdXRtZS5zdGF0ZSA9IHV0bWUubG9hZFN0YXRlRnJvbVN0b3JhZ2UoKTtcbiAgICAgICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnSU5JVElBTElaRUQnKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc3RhdHVzID09PSBcIlBMQVlJTkdcIikge1xuICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzdGF0ZS5ydW4uc2NlbmFyaW8sIHN0YXRlLnJ1bi5zdGVwSW5kZXgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN0YXRlLnN0YXR1cyB8fCBzdGF0ZS5zdGF0dXMgPT09ICdJTklUSUFMSVpJTkcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiTE9BREVEXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGJyb2FkY2FzdDogZnVuY3Rpb24gKGV2dCwgZXZ0RGF0YSkge1xuICAgICAgICBpZiAobGlzdGVuZXJzICYmIGxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzW2ldKGV2dCwgZXZ0RGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN0YXJ0UmVjb3JkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgIT0gJ1JFQ09SRElORycpIHtcbiAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9ICdSRUNPUkRJTkcnO1xuICAgICAgICAgICAgc3RhdGUuc3RlcHMgPSBbXTtcbiAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0YXJ0ZWRcIik7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUQVJURUQnKTtcblxuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcnVuU2NlbmFyaW86IGZ1bmN0aW9uIChuYW1lLCBjb25maWcpIHtcbiAgICAgICAgdmFyIHRvUnVuID0gbmFtZSB8fCBwcm9tcHQoJ1NjZW5hcmlvIHRvIHJ1bicpO1xuICAgICAgICB2YXIgYXV0b1J1biA9ICFuYW1lID8gcHJvbXB0KCdXb3VsZCB5b3UgbGlrZSB0byBzdGVwIHRocm91Z2ggZWFjaCBzdGVwICh5fG4pPycpICE9ICd5JyA6IHRydWU7XG4gICAgICAgIHJldHVybiBnZXRTY2VuYXJpbyh0b1J1bikudGhlbihmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgIHNjZW5hcmlvID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzY2VuYXJpbykpO1xuICAgICAgICAgICAgdXRtZS5zdGF0ZS5ydW4gPSBfLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgc3BlZWQ6ICcxMCdcbiAgICAgICAgICAgIH0sIGNvbmZpZyk7XG5cbiAgICAgICAgICAgIHNldHVwQ29uZGl0aW9ucyhzY2VuYXJpbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYXV0b1J1biA9IGF1dG9SdW4gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJQTEFZSU5HXCI7XG5cbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0YXJ0aW5nIFNjZW5hcmlvICdcIiArIG5hbWUgKyBcIidcIiwgc2NlbmFyaW8pO1xuICAgICAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdQTEFZQkFDS19TVEFSVEVEJyk7XG5cbiAgICAgICAgICAgICAgICBydW5TdGVwKHNjZW5hcmlvLCAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHJ1bk5leHRTdGVwOiBydW5OZXh0U3RlcCxcbiAgICBzdG9wU2NlbmFyaW86IGZ1bmN0aW9uIChzdWNjZXNzKSB7XG4gICAgICAgIHZhciBzY2VuYXJpbyA9IHN0YXRlLnJ1biAmJiBzdGF0ZS5ydW4uc2NlbmFyaW87XG4gICAgICAgIGRlbGV0ZSBzdGF0ZS5ydW47XG4gICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiTE9BREVEXCI7XG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdQTEFZQkFDS19TVE9QUEVEJyk7XG5cbiAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBTY2VuYXJpb1wiKTtcbiAgICAgICAgaWYgKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiW1NVQ0NFU1NdIFNjZW5hcmlvICdcIiArIHNjZW5hcmlvLm5hbWUgKyBcIicgQ29tcGxldGVkIVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRFcnJvcihcIltGQUlMVVJFXSBTY2VuYXJpbyAnXCIgKyBzY2VuYXJpby5uYW1lICsgXCInIENvbXBsZXRlZCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHRlbXBvcmFyeSBlbGVtZW50IGxvY2F0b3IsIGZvciB1c2Ugd2l0aCBmaW5hbGl6ZUxvY2F0b3JcbiAgICAgKi9cbiAgICBjcmVhdGVFbGVtZW50TG9jYXRvcjogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHVuaXF1ZUlkID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXVuaXF1ZS1pZFwiKSB8fCBndWlkKCk7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKFwiZGF0YS11bmlxdWUtaWRcIiwgdW5pcXVlSWQpO1xuXG4gICAgICAgIHZhciBlbGVIdG1sID0gZWxlbWVudC5jbG9uZU5vZGUoKS5vdXRlckhUTUw7XG4gICAgICAgIHZhciBlbGVTZWxlY3RvcnMgPSBbXTtcbiAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09ICdCT0RZJyB8fCBlbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PSAnSFRNTCcpIHtcbiAgICAgICAgICAgIGVsZVNlbGVjdG9ycyA9IFtlbGVtZW50LnRhZ05hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlU2VsZWN0b3JzID0gc2VsZWN0b3JGaW5kZXIoZWxlbWVudCwgZG9jdW1lbnQuYm9keSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHVuaXF1ZUlkOiB1bmlxdWVJZCxcbiAgICAgICAgICAgIHNlbGVjdG9yczogZWxlU2VsZWN0b3JzXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIHJlZ2lzdGVyRXZlbnQ6IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEsIGlkeCkge1xuICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpIHx8IHV0bWUuaXNWYWxpZGF0aW5nKCkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaWR4ID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5zdGVwc1tpZHhdID0ge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogZXZlbnROYW1lLFxuICAgICAgICAgICAgICAgIHRpbWVTdGFtcDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdFVkVOVF9SRUdJU1RFUkVEJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydExvZzogZnVuY3Rpb24gKGxvZywgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLmxvZyhsb2csIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0RXJyb3I6IGZ1bmN0aW9uIChlcnJvciwgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLmVycm9yKGVycm9yLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlZ2lzdGVyTGlzdGVuZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGxpc3RlbmVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJTYXZlSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgc2F2ZUhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclJlcG9ydEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHJlcG9ydEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlckxvYWRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBsb2FkSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyU2V0dGluZ3NMb2FkSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgc2V0dGluZ3NMb2FkSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIGlzUmVjb3JkaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJSRUNPUkRJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBpc1BsYXlpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlBMQVlJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBpc1ZhbGlkYXRpbmc6IGZ1bmN0aW9uKHZhbGlkYXRpbmcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWxpZGF0aW5nICE9PSAndW5kZWZpbmVkJyAmJiAodXRtZS5pc1JlY29yZGluZygpIHx8IHV0bWUuaXNWYWxpZGF0aW5nKCkpKSB7XG4gICAgICAgICAgICB1dG1lLnN0YXRlLnN0YXR1cyA9IHZhbGlkYXRpbmcgPyBcIlZBTElEQVRJTkdcIiA6IFwiUkVDT1JESU5HXCI7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnVkFMSURBVElPTl9DSEFOR0VEJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJWQUxJREFUSU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgc3RvcFJlY29yZGluZzogZnVuY3Rpb24gKGluZm8pIHtcbiAgICAgICAgaWYgKGluZm8gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB2YXIgbmV3U2NlbmFyaW8gPSB7XG4gICAgICAgICAgICAgICAgc3RlcHM6IHN0YXRlLnN0ZXBzXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBfLmV4dGVuZChuZXdTY2VuYXJpbywgaW5mbyk7XG5cbiAgICAgICAgICAgIGlmICghbmV3U2NlbmFyaW8ubmFtZSkge1xuICAgICAgICAgICAgICAgIG5ld1NjZW5hcmlvLm5hbWUgPSBwcm9tcHQoJ0VudGVyIHNjZW5hcmlvIG5hbWUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG5ld1NjZW5hcmlvLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zY2VuYXJpb3MucHVzaChuZXdTY2VuYXJpbyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc2F2ZUhhbmRsZXJzICYmIHNhdmVIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzYXZlSGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVIYW5kbGVyc1tpXShuZXdTY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5zdGF0dXMgPSAnTE9BREVEJztcblxuICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUT1BQRUQnKTtcblxuICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlJlY29yZGluZyBTdG9wcGVkXCIsIG5ld1NjZW5hcmlvKTtcbiAgICB9LFxuXG4gICAgbG9hZFNldHRpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZXR0aW5ncyA9IHV0bWUuc2V0dGluZ3MgPSBuZXcgU2V0dGluZ3MoKTtcbiAgICAgICAgaWYgKHNldHRpbmdzTG9hZEhhbmRsZXJzLmxlbmd0aCA+IDAgJiYgIWdldFBhcmFtZXRlckJ5TmFtZSgndXRtZV9zY2VuYXJpbycpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzTG9hZEhhbmRsZXJzWzBdKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLnNldERlZmF1bHRzKHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBsb2FkU3RhdGVGcm9tU3RvcmFnZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdXRtZVN0YXRlU3RyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3V0bWUnKTtcbiAgICAgICAgaWYgKHV0bWVTdGF0ZVN0cikge1xuICAgICAgICAgICAgc3RhdGUgPSBKU09OLnBhcnNlKHV0bWVTdGF0ZVN0cik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwiSU5JVElBTElaSU5HXCIsXG4gICAgICAgICAgICAgICAgc2NlbmFyaW9zOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSxcblxuICAgIHNhdmVTdGF0ZVRvU3RvcmFnZTogZnVuY3Rpb24gKHV0bWVTdGF0ZSkge1xuICAgICAgICBpZiAodXRtZVN0YXRlKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndXRtZScsIEpTT04uc3RyaW5naWZ5KHV0bWVTdGF0ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3V0bWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1bmxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXRtZS5zYXZlU3RhdGVUb1N0b3JhZ2Uoc3RhdGUpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHRvZ2dsZUhpZ2hsaWdodChlbGUsIHZhbHVlKSB7XG4gICAgJChlbGUpLnRvZ2dsZUNsYXNzKCd1dG1lLXZlcmlmeScsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gdG9nZ2xlUmVhZHkoZWxlLCB2YWx1ZSkge1xuICAgICQoZWxlKS50b2dnbGVDbGFzcygndXRtZS1yZWFkeScsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBJZiB5b3UgY2xpY2sgb24gYSBzcGFuIGluIGEgbGFiZWwsIHRoZSBzcGFuIHdpbGwgY2xpY2ssXG4gKiB0aGVuIHRoZSBicm93c2VyIHdpbGwgZmlyZSB0aGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBpbnB1dCBjb250YWluZWQgd2l0aGluIHRoZSBzcGFuLFxuICogU28sIHdlIG9ubHkgd2FudCB0byB0cmFjayB0aGUgaW5wdXQgY2xpY2tzLlxuICovXG5mdW5jdGlvbiBpc05vdEluTGFiZWxPclZhbGlkKGVsZSkge1xuICAgIHJldHVybiAkKGVsZSkucGFyZW50cygnbGFiZWwnKS5sZW5ndGggPT0gMCB8fFxuICAgICAgICAgIGVsZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09ICdpbnB1dCc7XG59XG5cbnZhciB0aW1lcnMgPSBbXTtcblxuZnVuY3Rpb24gaW5pdEV2ZW50SGFuZGxlcnMoKSB7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5pc1RyaWdnZXIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuaGFzQXR0cmlidXRlICYmXG4gICAgICAgICAgICAgICAgICAgICFlLnRhcmdldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykgJiZcbiAgICAgICAgICAgICAgICAgICAgJChlLnRhcmdldCkucGFyZW50cyhcIltkYXRhLWlnbm9yZV1cIikubGVuZ3RoID09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgaXNOb3RJbkxhYmVsT3JWYWxpZChlLnRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdGltZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCB8fCBlLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLmJ1dHRvbiA9IGUud2hpY2ggfHwgZS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnbW91c2VvdmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlLnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVyOiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWFkeShlLnRhcmdldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdtb3VzZW91dCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aW1lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lcnNbaV0uZWxlbWVudCA9PSBlLnRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcnNbaV0udGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlYWR5KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnZhbHVlID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KGV2dCwgYXJncywgaWR4KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbZXZ0XSA9IGhhbmRsZXI7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgICAgfSkoZXZlbnRzW2ldKSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgdmFyIF90b19hc2NpaSA9IHtcbiAgICAgICAgJzE4OCc6ICc0NCcsXG4gICAgICAgICcxMDknOiAnNDUnLFxuICAgICAgICAnMTkwJzogJzQ2JyxcbiAgICAgICAgJzE5MSc6ICc0NycsXG4gICAgICAgICcxOTInOiAnOTYnLFxuICAgICAgICAnMjIwJzogJzkyJyxcbiAgICAgICAgJzIyMic6ICczOScsXG4gICAgICAgICcyMjEnOiAnOTMnLFxuICAgICAgICAnMjE5JzogJzkxJyxcbiAgICAgICAgJzE3Myc6ICc0NScsXG4gICAgICAgICcxODcnOiAnNjEnLCAvL0lFIEtleSBjb2Rlc1xuICAgICAgICAnMTg2JzogJzU5JywgLy9JRSBLZXkgY29kZXNcbiAgICAgICAgJzE4OSc6ICc0NScgLy9JRSBLZXkgY29kZXNcbiAgICB9O1xuXG4gICAgdmFyIHNoaWZ0VXBzID0ge1xuICAgICAgICBcIjk2XCI6IFwiflwiLFxuICAgICAgICBcIjQ5XCI6IFwiIVwiLFxuICAgICAgICBcIjUwXCI6IFwiQFwiLFxuICAgICAgICBcIjUxXCI6IFwiI1wiLFxuICAgICAgICBcIjUyXCI6IFwiJFwiLFxuICAgICAgICBcIjUzXCI6IFwiJVwiLFxuICAgICAgICBcIjU0XCI6IFwiXlwiLFxuICAgICAgICBcIjU1XCI6IFwiJlwiLFxuICAgICAgICBcIjU2XCI6IFwiKlwiLFxuICAgICAgICBcIjU3XCI6IFwiKFwiLFxuICAgICAgICBcIjQ4XCI6IFwiKVwiLFxuICAgICAgICBcIjQ1XCI6IFwiX1wiLFxuICAgICAgICBcIjYxXCI6IFwiK1wiLFxuICAgICAgICBcIjkxXCI6IFwie1wiLFxuICAgICAgICBcIjkzXCI6IFwifVwiLFxuICAgICAgICBcIjkyXCI6IFwifFwiLFxuICAgICAgICBcIjU5XCI6IFwiOlwiLFxuICAgICAgICBcIjM5XCI6IFwiXFxcIlwiLFxuICAgICAgICBcIjQ0XCI6IFwiPFwiLFxuICAgICAgICBcIjQ2XCI6IFwiPlwiLFxuICAgICAgICBcIjQ3XCI6IFwiP1wiXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGtleVByZXNzSGFuZGxlciAoZSkge1xuICAgICAgICBpZiAoZS5pc1RyaWdnZXIpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSAmJiBlLnRhcmdldC5oYXNBdHRyaWJ1dGUgJiYgIWUudGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnZGF0YS1pZ25vcmUnKSAmJiAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiW2RhdGEtaWdub3JlXVwiKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgdmFyIGMgPSBlLndoaWNoO1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBEb2Vzbid0IHdvcmsgd2l0aCBjYXBzIGxvY2tcbiAgICAgICAgICAgIC8vbm9ybWFsaXplIGtleUNvZGVcbiAgICAgICAgICAgIGlmIChfdG9fYXNjaWkuaGFzT3duUHJvcGVydHkoYykpIHtcbiAgICAgICAgICAgICAgICBjID0gX3RvX2FzY2lpW2NdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWUuc2hpZnRLZXkgJiYgKGMgPj0gNjUgJiYgYyA8PSA5MCkpIHtcbiAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjICsgMzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIHNoaWZ0VXBzLmhhc093blByb3BlcnR5KGMpKSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgc2hpZnRlZCBrZXlDb2RlIHZhbHVlXG4gICAgICAgICAgICAgICAgYyA9IHNoaWZ0VXBzW2NdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KCdrZXlwcmVzcycsIHtcbiAgICAgICAgICAgICAgICBsb2NhdG9yOiB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGUudGFyZ2V0KSxcbiAgICAgICAgICAgICAgICBrZXk6IGMsXG4gICAgICAgICAgICAgICAgcHJldlZhbHVlOiBlLnRhcmdldC52YWx1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZS50YXJnZXQudmFsdWUgKyBjLFxuICAgICAgICAgICAgICAgIGtleUNvZGU6IGUua2V5Q29kZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGtleVByZXNzSGFuZGxlciwgdHJ1ZSk7XG5cbiAgICAvLyBIQUNLIGZvciB0ZXN0aW5nXG4gICAgKHV0bWUuZXZlbnRMaXN0ZW5lcnMgPSB1dG1lLmV2ZW50TGlzdGVuZXJzIHx8IHt9KVsna2V5cHJlc3MnXSA9IGtleVByZXNzSGFuZGxlcjtcbn1cblxuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyQnlOYW1lKG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufVxuXG5mdW5jdGlvbiBib290c3RyYXBVdG1lKCkge1xuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PSBcImNvbXBsZXRlXCIpIHtcbiAgICB1dG1lLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBpbml0RXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkpIHtcbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudChcImxvYWRcIiwge1xuICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogd2luZG93LmxvY2F0aW9uLnByb3RvY29sLFxuICAgICAgICAgICAgICAgICAgICBob3N0OiB3aW5kb3cubG9jYXRpb24uaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBoYXNoOiB3aW5kb3cubG9jYXRpb24uaGFzaFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuYm9vdHN0cmFwVXRtZSgpO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsIGJvb3RzdHJhcFV0bWUpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICAgIHV0bWUudW5sb2FkKCk7XG59LCB0cnVlKTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgIHV0bWUucmVwb3J0TG9nKFwiU2NyaXB0IEVycm9yOiBcIiArIGVyci5tZXNzYWdlICsgXCI6XCIgKyBlcnIudXJsICsgXCIsXCIgKyBlcnIubGluZSArIFwiOlwiICsgZXJyLmNvbCk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dG1lO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lkSEpoYm5ObWIzSnRaV1F1YW5NaUxDSnpiM1Z5WTJWeklqcGJJaTlFWlhabGJHOXdaWEl2WVhSemFXUXZVSEp2YW1WamRITXZkWFJ0WlM5MWRHMWxMM055WXk5cWN5OTFkRzFsTG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJMRWxCUVVrc1EwRkJReXhIUVVGSExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNRMEZCUXp0QlFVTXpRaXhKUVVGSkxFOUJRVThzUjBGQlJ5eFBRVUZQTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRE8wRkJRemRETEVsQlFVa3NVVUZCVVN4SFFVRkhMRTlCUVU4c1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6dEJRVU55UXl4SlFVRkpMR05CUVdNc1IwRkJSeXhQUVVGUExFTkJRVU1zYTBKQlFXdENMRU5CUVVNc1EwRkJRenRCUVVOcVJDeEpRVUZKTEZGQlFWRXNSMEZCUnl4UFFVRlBMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU03TzBGQlJYSkRMR2RFUVVGblJEdEJRVU5vUkN4SlFVRkpMRzFDUVVGdFFpeEhRVUZITEVkQlFVY3NRMEZCUXp0QlFVTTVRaXhKUVVGSkxGbEJRVmtzUjBGQlJ5eEZRVUZGTEVOQlFVTTdRVUZEZEVJc1NVRkJTU3hqUVVGakxFZEJRVWNzUlVGQlJTeERRVUZETzBGQlEzaENMRWxCUVVrc1dVRkJXU3hIUVVGSExFVkJRVVVzUTBGQlF6dEJRVU4wUWl4SlFVRkpMRzlDUVVGdlFpeEhRVUZITEVWQlFVVXNRMEZCUXpzN1FVRkZPVUlzVTBGQlV5eFhRVUZYTEVOQlFVTXNTVUZCU1N4RlFVRkZPMGxCUTNaQ0xFOUJRVThzU1VGQlNTeFBRVUZQTEVOQlFVTXNWVUZCVlN4UFFVRlBMRVZCUVVVc1RVRkJUU3hGUVVGRk8xRkJRekZETEVsQlFVa3NXVUZCV1N4RFFVRkRMRTFCUVUwc1MwRkJTeXhEUVVGRExFVkJRVVU3V1VGRE0wSXNTVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF6dFpRVU4yUWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdaMEpCUXpkRExFbEJRVWtzUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFdEJRVXNzU1VGQlNTeEZRVUZGTzI5Q1FVTnNReXhQUVVGUExFTkJRVU1zUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8ybENRVU12UWp0aFFVTktPMU5CUTBvc1RVRkJUVHRaUVVOSUxGbEJRVmtzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRVZCUVVVc1ZVRkJWU3hKUVVGSkxFVkJRVVU3WjBKQlEyeERMRTlCUVU4c1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dGhRVU5xUWl4RFFVRkRMRU5CUVVNN1UwRkRUanRMUVVOS0xFTkJRVU1zUTBGQlF6dERRVU5PTzBGQlEwUXNTVUZCU1N4VlFVRlZMRWRCUVVjc1MwRkJTeXhEUVVGRE96dEJRVVYyUWl4SlFVRkpMRTFCUVUwc1IwRkJSenRKUVVOVUxFOUJRVTg3U1VGRFVDeFBRVUZQTzBsQlExQXNUVUZCVFR0QlFVTldMRWxCUVVrc1ZVRkJWVHRCUVVOa08wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1NVRkJTU3hYUVVGWE96dEpRVVZZTEZsQlFWazdTVUZEV2l4WlFVRlpPMGxCUTFvc1ZVRkJWVHRKUVVOV0xGZEJRVmM3U1VGRFdDeFRRVUZUTzBGQlEySXNTVUZCU1N4UlFVRlJPMEZCUTFvN08wRkJSVUVzUTBGQlF5eERRVUZET3p0QlFVVkdMRk5CUVZNc1owSkJRV2RDTEVWQlFVVXNVVUZCVVN4RlFVRkZPMGxCUTJwRExFbEJRVWtzUzBGQlN5eEhRVUZITEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNN1FVRkRMMElzU1VGQlNTeEpRVUZKTEZOQlFWTXNSMEZCUnl4TFFVRkxMRWxCUVVrc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF6czdTVUZGZWtNc1NVRkJTU3hUUVVGVExFVkJRVVU3VVVGRFdDeFBRVUZQTEU5QlFVOHNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVWQlFVVXNWVUZCVlN4WlFVRlpMRVZCUVVVN1dVRkRlRVFzVDBGQlR5eFhRVUZYTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzWVVGQllTeEZRVUZGTzJOQlF6ZEVMR0ZCUVdFc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1lVRkJZU3hEUVVGRExFTkJRVU1zUTBGQlF6dGpRVU14UkN4UFFVRlBMR0ZCUVdFc1EwRkJReXhMUVVGTExFTkJRVU03WVVGRE5VSXNRMEZCUXl4RFFVRkRPMU5CUTA0c1EwRkJReXhEUVVGRExFTkJRVU03UzBGRFVDeE5RVUZOTzFGQlEwZ3NUMEZCVHl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFVkJRVVVzUTBGQlF5eERRVUZETzB0QlF6bENPMEZCUTB3c1EwRkJRenM3UVVGRlJDeFRRVUZUTEdsQ1FVRnBRaXhGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5zUXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhSUVVGUkxFTkJRVU1zVDBGQlR5eERRVUZETzBGQlEyNURMRWxCUVVrc1NVRkJTU3hUUVVGVExFZEJRVWNzVDBGQlR5eEpRVUZKTEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNN08wbEJSVGRETEVsQlFVa3NVMEZCVXl4RlFVRkZPMUZCUTFnc1QwRkJUeXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1UwRkJVeXhGUVVGRkxGVkJRVlVzV1VGQldTeEZRVUZGTzFsQlEzaEVMRTlCUVU4c1YwRkJWeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMR0ZCUVdFc1JVRkJSVHRqUVVNM1JDeGhRVUZoTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRMRU5CUVVNN1kwRkRNVVFzVDBGQlR5eGhRVUZoTEVOQlFVTXNTMEZCU3l4RFFVRkRPMkZCUXpWQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTEVOQlFVTXNRMEZCUXl4RFFVRkRPMHRCUTFBc1RVRkJUVHRSUVVOSUxFOUJRVThzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJRenRMUVVNNVFqdEJRVU5NTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXgzUWtGQmQwSXNRMEZCUXl4TFFVRkxMRVZCUVVVN1NVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMGxCUTJ4Q0xFbEJRVWtzWjBKQlFXZENMRU5CUVVNN1NVRkRja0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRia01zU1VGQlNTeFRRVUZUTEVkQlFVY3NTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xRkJRM3BDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRaUVVOUUxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOdVF5eEpRVUZKTEVsQlFVa3NSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEzaENMRWxCUVVrc1NVRkJTU3hIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU03WjBKQlEzQkZMR2RDUVVGblFpeEpRVUZKTEVsQlFVa3NRMEZCUXp0blFrRkRla0lzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhuUWtGQlowSXNRMEZCUXp0aFFVTTNRenRUUVVOS0xFMUJRVTA3V1VGRFNDeG5Ra0ZCWjBJc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNVMEZCVXl4RFFVRkRPMU5CUXpkRE8xRkJRMFFzVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UzBGRGVrTTdTVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJRenRCUVVOd1FpeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5vUXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU03U1VGRGJFSXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRE8xRkJRMllzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRE8xRkJRekZDTEdsQ1FVRnBRaXhEUVVGRExGRkJRVkVzUTBGQlF6dExRVU01UWl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzVlVGQlZTeEZRVUZGTzFGQlF6RkNMRWxCUVVrc1UwRkJVeXhIUVVGSExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGRFVXNVVUZCVVN4RFFVRkRMRXRCUVVzc1IwRkJSeXgzUWtGQmQwSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRMUVVONFJDeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVDBGQlR5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRk8wbEJRM0JETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU03UVVGRGJrTXNTVUZCU1N4TlFVRk5MRWRCUVVjc1RVRkJUU3hKUVVGSkxFVkJRVVVzUTBGQlF6czdTVUZGZEVJc1NVRkJTU3hKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRKUVVNdlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRE8wbEJRM1pDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVTBGQlV5eEZRVUZGTzFGQlEyNURMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXp0UlFVTTVRaXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNSMEZCUnl4SFFVRkhMRU5CUVVNN1VVRkRNVUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVNeFFpeEpRVUZKTEZGQlFWRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NSMEZCUnl4SFFVRkhMRU5CUVVNN1dVRkRlRVVzU1VGQlNTeE5RVUZOTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zVFVGQlRTeERRVUZETzFsQlEyeERMRWxCUVVrc1NVRkJTU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVNNVFpeEpRVUZKTEZWQlFWVXNSMEZCUnl4clFrRkJhMElzUTBGQlF5eHJRa0ZCYTBJc1EwRkJReXhEUVVGRE8xbEJRM2hFTEVsQlFVa3NWVUZCVlN4RlFVRkZPMmRDUVVOYUxFMUJRVTBzU1VGQlNTeERRVUZETEUxQlFVMHNSMEZCUnl4SFFVRkhMRWRCUVVjc1IwRkJSeXhKUVVGSkxHMUNRVUZ0UWl4SFFVRkhMRlZCUVZVc1EwRkJRenRoUVVOeVJUdEJRVU5pTEZsQlFWa3NUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhQUVVGUExFTkJRVU1zVVVGQlVTeEhRVUZITEUxQlFVMHNSMEZCUnl4SlFVRkpMRU5CUVVNc1EwRkJRenM3V1VGRmJFUXNUMEZCVHl4RFFVRkRMRWRCUVVjc1JVRkJSU3hSUVVGUkxFTkJRVU1zVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETzBGQlF5OUZMRmxCUVZrc1QwRkJUeXhEUVVGRExFZEJRVWNzUlVGQlJTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1NVRkJTU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRE8wRkJRemxHTzBGQlEwRTdPMWxCUlZrc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eFJRVUZSTEVkQlFVY3NVVUZCVVN4RFFVRkRMRWxCUVVrc1IwRkJSeXhSUVVGUkxFTkJRVU1zVFVGQlRUdHBRa0ZEYmtRc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNVVUZCVVN4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlR0blFrRkRkRVVzVjBGQlZ5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRkxFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEzUkVMR0ZCUVdFN08xTkJSVW9zVFVGQlRTeEpRVUZKTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1UwRkJVeXhGUVVGRk8xbEJRM0JETEVsQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU4c1JVRkJSVHRuUWtGRFppeFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFVkJRVVVzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRoUVVONFJEdFRRVU5LTEUxQlFVMDdXVUZEU0N4SlFVRkpMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXp0WlFVTm9ReXhKUVVGSkxFdEJRVXNzUjBGQlJ5eFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUTNaRExGbEJRVmtzU1VGQlNTeFJRVUZSTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdRVUZEY2tRN08xbEJSVmtzU1VGQlNTeFBRVUZQTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1NVRkJTU3hYUVVGWExFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhKUVVGSkxGVkJRVlVzUlVGQlJUdGpRVU5vUml4SlFVRkpMRWxCUVVrc1EwRkJRenRqUVVOVUxFbEJRVWtzVFVGQlRTeEhRVUZITEV0QlFVc3NRMEZCUXp0alFVTnVRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRek5ETEVsQlFVa3NVMEZCVXl4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dG5Ra0ZEZWtJc1NVRkJTU3hoUVVGaExFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03WjBKQlEyNUVMRWxCUVVrc1VVRkJVU3hMUVVGTExHRkJRV0VzUlVGQlJUdHJRa0ZET1VJc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJUdHpRa0ZEVUN4SlFVRkpMRWxCUVVrc1UwRkJVeXhEUVVGRExGTkJRVk1zUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN2MwSkJRemxETEUxQlFVMHNSMEZCUnl4RFFVRkRMR1ZCUVdVc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEpRVUZKTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU03YlVKQlEzUkZMRTFCUVUwc1NVRkJTU3hwUWtGQmFVSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGNrTXNUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJRenR6UWtGRFppeE5RVUZOTzIxQ1FVTlVPMmxDUVVOR08wRkJRMnBDTEdWQlFXVTdPMk5CUlVRc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXp0QlFVTjRReXhoUVVGaE8wRkJRMkk3TzFsQlJWa3NTVUZCU1N4TlFVRk5MRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNc1JVRkJSVHRuUWtGRGJrTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1JVRkJSU3hIUVVGSExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEZEVNc1RVRkJUVHRCUVVOdVFpeG5Ra0ZCWjBJc1lVRkJZU3hEUVVGRExGRkJRVkVzUlVGQlJTeEpRVUZKTEVWQlFVVXNUMEZCVHl4RlFVRkZMRlZCUVZVc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1ZVRkJWU3hKUVVGSkxFVkJRVVU3TzJ0Q1FVVnlSaXhKUVVGSkxFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN2EwSkJRMnhDTEVsQlFVa3NUMEZCVHl4SFFVRkhMRWRCUVVjc1EwRkJReXhQUVVGUExFTkJRVU1zVjBGQlZ5eEZRVUZGTEVOQlFVTTdRVUZETVVRc2EwSkJRV3RDTEVsQlFVa3NhMEpCUVd0Q0xFZEJRVWNzVDBGQlR5eExRVUZMTEU5QlFVOHNTVUZCU1N4UFFVRlBMRXRCUVVzc1ZVRkJWU3hKUVVGSkxFZEJRVWNzUTBGQlF5eFpRVUZaTEVOQlFVTXNhVUpCUVdsQ0xFTkJRVU1zUTBGQlF6czdhMEpCUlRsSExFbEJRVWtzVFVGQlRTeERRVUZETEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTjJReXhKUVVGSkxFOUJRVThzUjBGQlJ5eEZRVUZGTEVOQlFVTTdiMEpCUTJwQ0xFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVN2MwSkJRM0JDTEU5QlFVOHNRMEZCUXl4TFFVRkxMRWRCUVVjc1QwRkJUeXhEUVVGRExFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTFCUVUwc1EwRkJRenRCUVVONFJTeHhRa0ZCY1VJN1FVRkRja0k3TzI5Q1FVVnZRaXhKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NUMEZCVHl4RlFVRkZPM05DUVVNM1FpeERRVUZETEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzNGQ1FVTjZRaXhOUVVGTkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTlCUVU4c1NVRkJTU3hKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEUxQlFVMHNTMEZCU3l4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTzNOQ1FVTjZSaXhIUVVGSExFTkJRVU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4RlFVRkZMRU5CUVVNN2NVSkJRM1pDTEUxQlFVMDdjMEpCUTB3c1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNRMEZCUXl4SFFVRkhMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03UVVGRE4wUXNjVUpCUVhGQ096dHZRa0ZGUkN4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eExRVUZMTEVsQlFVa3NWMEZCVnl4RlFVRkZPMEZCUXk5RUxITkNRVUZ6UWl4SFFVRkhMRU5CUVVNc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRPenR6UWtGRk5VSXNTVUZCU1N4clFrRkJhMElzUlVGQlJUdDNRa0ZEZEVJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN2RVSkJRemxDTzNOQ1FVTkVMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4RFFVRkRPM0ZDUVVNdlFqdEJRVU55UWl4dFFrRkJiVUk3TzJ0Q1FVVkVMRWxCUVVrc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFZRVUZWTEVWQlFVVTdiMEpCUTJoRExFbEJRVWtzUjBGQlJ5eEhRVUZITEUxQlFVMHNRMEZCUXl4WlFVRlpMRU5CUVVNc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXp0dlFrRkRha1FzVVVGQlVTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGFFUXNiMEpCUVc5Q0xGRkJRVkVzUTBGQlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE96dHZRa0ZGTTBJc1IwRkJSeXhEUVVGRExFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVOb1JDeHZRa0ZCYjBJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVWQlFVVXNVVUZCVVN4RFFVRkRMRU5CUVVNN08yOUNRVVU1UWl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0dlFrRkRla0lzU1VGQlNTeHJRa0ZCYTBJc1JVRkJSVHQzUWtGRGNFSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdjVUpCUTJoRE8wRkJRM0pDTEcxQ1FVRnRRanM3YTBKQlJVUXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlVzUlVGQlJUdHZRa0ZEYUVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eFpRVUZaTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NhMEpCUVd0Q0xFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGJra3NiVUpCUVcxQ096dHJRa0ZGUkN4SlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGUExFVkJRVVU3YjBKQlEycENMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRPMjFDUVVOd1F6dHBRa0ZEUml4RlFVRkZMRlZCUVZVc1RVRkJUU3hGUVVGRk8yOUNRVU5xUWl4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZTeEZRVUZGTzNOQ1FVTm9ReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEZsQlFWa3NSMEZCUnl4TlFVRk5MRU5CUVVNc1EwRkJRenR6UWtGRGRFTXNTVUZCU1N4RFFVRkRMRmxCUVZrc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dHhRa0ZETVVJc1RVRkJUVHR6UWtGRFRDeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRTFCUVUwc1EwRkJReXhEUVVGRE8zTkNRVU4yUWl4SlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGUExFVkJRVVU3ZDBKQlEycENMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRPM1ZDUVVOd1F6dHhRa0ZEUmp0cFFrRkRTaXhEUVVGRExFTkJRVU03WVVGRFRqdFRRVU5LTzB0QlEwbzdRVUZEVEN4RFFVRkRPenRCUVVWRUxGTkJRVk1zWTBGQll5eERRVUZETEZsQlFWa3NSVUZCUlR0SlFVTnNReXhKUVVGSkxFVkJRVVVzUjBGQlJ5eFJRVUZSTEVOQlFVTXNZVUZCWVN4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8wbEJRemxETEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrN1dVRkRRU3hKUVVGSkxFTkJRVU1zVFVGQlRTeERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRha0lzVFVGQlRTeEpRVUZKTEV0QlFVc3NRMEZCUXl3d1EwRkJNRU1zUTBGQlF5eERRVUZETzJGQlF5OUVPMWxCUTBRc1NVRkJTU3hQUVVGUExFTkJRVU1zWTBGQll5eEZRVUZGTzJkQ1FVTjRRaXhQUVVGUExFTkJRVU1zWTBGQll5eERRVUZETEVWQlFVVXNRMEZCUXl4RFFVRkRMRlZCUVZVc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU5zUkN4TlFVRk5PMmRDUVVOSUxFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkVzUlVGQlJTeEZRVUZGTzI5Q1FVTnFReXhOUVVGTkxFbEJRVWtzUzBGQlN5eERRVUZETEdkQ1FVRm5RaXhIUVVGSExGbEJRVmtzUjBGQlJ5eHZRa0ZCYjBJN2QwSkJRMnhGTEhsRFFVRjVReXhEUVVGRExFTkJRVU03YVVKQlEyeEVPMmRDUVVORUxFOUJRVThzUTBGQlF5eFBRVUZQTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFTkJRVU1zUjBGQlJ5eERRVUZETEZWQlFWVXNRMEZCUXp0blFrRkRPVU1zSzBKQlFTdENMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03WVVGRE5VTTdVMEZEU2l4RFFVRkRMRTlCUVU4c1IwRkJSeXhGUVVGRk8xbEJRMVlzVFVGQlRTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUTJZN1MwRkRTaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU16UWl4UFFVRlBMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzV1VGQldUdFhRVU01UWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlU3VjBGRE5VSXNTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hOUVVGTkxFTkJRVU03UVVGRGNFTXNRMEZCUXpzN1FVRkZSRHM3UjBGRlJ6dEJRVU5JTEZOQlFWTXNhVUpCUVdsQ0xFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlF6ZENMRTFCUVUwN1RVRkRTaXhUUVVGVExFTkJRVU1zVTBGQlV5eERRVUZETEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1MwRkJTeXhEUVVGRE8wMUJRekZETEZOQlFWTXNRMEZCUXl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUTBGQlF5eExRVUZMTEVOQlFVTTdUVUZET1VNc1UwRkJVeXhEUVVGRExGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8wRkJRMjVFTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhoUVVGaExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4UFFVRlBMRVZCUVVVc1QwRkJUeXhGUVVGRkxGZEJRVmNzUlVGQlJUdEpRVU5zUlN4SlFVRkpMRTlCUVU4c1EwRkJRenRKUVVOYUxFOUJRVThzU1VGQlNTeFBRVUZQTEVOQlFVTXNWVUZCVlN4UFFVRlBMRVZCUVVVc1RVRkJUU3hGUVVGRk8xRkJRekZETEZOQlFWTXNUMEZCVHl4SFFVRkhPMWxCUTJZc1NVRkJTU3hEUVVGRExFOUJRVThzUlVGQlJUdG5Ra0ZEVml4UFFVRlBMRWRCUVVjc1NVRkJTU3hKUVVGSkxFVkJRVVVzUTBGQlF5eFBRVUZQTEVWQlFVVXNRMEZCUXp0QlFVTXZReXhoUVVGaE96dFpRVVZFTEVsQlFVa3NTVUZCU1N4RFFVRkRPMWxCUTFRc1NVRkJTU3haUVVGWkxFZEJRVWNzUzBGQlN5eERRVUZETzFsQlEzcENMRWxCUVVrc1ZVRkJWU3hIUVVGSExFdEJRVXNzUTBGQlF6dFpRVU4yUWl4SlFVRkpMR3RDUVVGclFpeEhRVUZITEV0QlFVc3NRMEZCUXp0WlFVTXZRaXhKUVVGSkxHVkJRV1VzUjBGQlJ5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dFpRVU5xUkN4SlFVRkpMRmRCUVZjc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTnFReXhKUVVGSkxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1NVRkJTU3hSUVVGUkxFTkJRVU03V1VGRGJFUXNaVUZCWlN4RFFVRkRMRTlCUVU4c1EwRkJReXh0UWtGQmJVSXNSMEZCUnl4UFFVRlBMRU5CUVVNc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eERRVUZETzFsQlEzWkZMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4bFFVRmxMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTTNReXhKUVVGSkxGRkJRVkVzUjBGQlJ5eGxRVUZsTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1owSkJRMnhETEVsQlFVa3NaVUZCWlN4RFFVRkRMRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU4yUWl4UlFVRlJMRWxCUVVrc1ZVRkJWU3hEUVVGRE8ybENRVU14UWp0blFrRkRSQ3hKUVVGSkxFZEJRVWNzUTBGQlF5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPMmRDUVVOdVFpeEpRVUZKTEVsQlFVa3NRMEZCUXl4TlFVRk5MRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU5zUWl4SlFVRkpMRTlCUVU4c1YwRkJWeXhKUVVGSkxGZEJRVmNzUlVGQlJUdDNRa0ZEYmtNc1NVRkJTU3hQUVVGUExFZEJRVWNzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETzNkQ1FVTm9ReXhKUVVGSkxFTkJRVU1zVlVGQlZTeExRVUZMTEZGQlFWRXNTVUZCU1N4UFFVRlBMRXRCUVVzc1YwRkJWenMyUWtGRGJFUXNWVUZCVlN4TFFVRkxMRlZCUVZVc1NVRkJTU3hQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJReXhGUVVGRk96UkNRVU5zUlN4VlFVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRE96UkNRVU5zUWl4TlFVRk5PM2xDUVVOVUxFMUJRVTA3TkVKQlEwZ3NhMEpCUVd0Q0xFZEJRVWNzU1VGQlNTeERRVUZETzNsQ1FVTTNRanR4UWtGRFNpeE5RVUZOTzNkQ1FVTklMRlZCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU03ZDBKQlEyeENMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zWjBKQlFXZENMRVZCUVVVc1QwRkJUeXhEUVVGRExGRkJRVkVzUTBGQlF5eERRVUZETzNkQ1FVTTVReXhOUVVGTk8zRkNRVU5VTzI5Q1FVTkVMRTFCUVUwN2FVSkJRMVFzVFVGQlRTeEpRVUZKTEVsQlFVa3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhGUVVGRk8yOUNRVU40UWl4WlFVRlpMRWRCUVVjc1NVRkJTU3hEUVVGRE8ybENRVU4yUWp0QlFVTnFRaXhoUVVGaE96dFpRVVZFTEVsQlFVa3NWVUZCVlN4RlFVRkZPMmRDUVVOYUxFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnFRaXhOUVVGTkxFbEJRVWtzWlVGQlpTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1NVRkJTU3hKUVVGSkxFVkJRVVVzUTBGQlF5eFBRVUZQTEVWQlFVVXNSMEZCUnl4UFFVRlBMRWxCUVVrc1QwRkJUeXhIUVVGSExFTkJRVU1zUlVGQlJUdG5Ra0ZEYUVZc1ZVRkJWU3hEUVVGRExFOUJRVThzUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXp0aFFVTXpRaXhOUVVGTk8yZENRVU5JTEVsQlFVa3NUVUZCVFN4SFFVRkhMRVZCUVVVc1EwRkJRenRuUWtGRGFFSXNTVUZCU1N4WlFVRlpMRVZCUVVVN2IwSkJRMlFzVFVGQlRTeEhRVUZITEc5RVFVRnZSQ3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhIUVVGSExHRkJRV0VzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SFFVRkhMRzlEUVVGdlF5eERRVUZETzJsQ1FVTTNTeXhOUVVGTkxFbEJRVWtzYTBKQlFXdENMRVZCUVVVN2IwSkJRek5DTEUxQlFVMHNSMEZCUnl4dlJFRkJiMFFzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU1zUjBGQlJ5eGhRVUZoTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXdyUTBGQkswTXNSMEZCUnl4WFFVRlhMRWRCUVVjc1lVRkJZU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNSMEZCUnl4SlFVRkpMRU5CUVVNN2FVSkJRek5QTEUxQlFVMDdiMEpCUTBnc1RVRkJUU3hIUVVGSExHOUVRVUZ2UkN4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4SFFVRkhMR0ZCUVdFc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eEhRVUZITERoQ1FVRTRRaXhEUVVGRE8ybENRVU4yU3p0blFrRkRSQ3hOUVVGTkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEYkVJN1FVRkRZaXhUUVVGVE96dFJRVVZFTEVsQlFVa3NTMEZCU3l4SFFVRkhMRzFDUVVGdFFpeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzU1VGQlNTeFZRVUZWTEVkQlFVY3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMUZCUTNCSExFbEJRVWtzVFVGQlRTeERRVUZETEU5QlFVOHNSVUZCUlR0WlFVTm9RaXhqUVVGakxFTkJRVU1zVlVGQlZTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmRCUVZjN1kwRkRla01zU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFdEJRVXNzVlVGQlZTeEZRVUZGTzJ0Q1FVTnlReXhWUVVGVkxFTkJRVU1zVDBGQlR5eEZRVUZGTEU5QlFVOHNRMEZCUXl4RFFVRkRPMlZCUTJoRExFMUJRVTBzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFdEJRVXNzVTBGQlV5eEZRVUZGTzJ0Q1FVTXpReXhQUVVGUExFVkJRVVVzUTBGQlF6dGxRVU5pTEUxQlFVMDdhMEpCUTBnc1ZVRkJWU3hEUVVGRExFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF6dGxRVU40UlR0aFFVTkdMRU5CUVVNc1EwRkJRenRUUVVOT0xFMUJRVTA3V1VGRFNDeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzUzBGQlN5eFZRVUZWTEVWQlFVVTdaMEpCUTNKRExGVkJRVlVzUTBGQlF5eFBRVUZQTEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1lVRkRhRU1zVFVGQlRTeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzUzBGQlN5eFRRVUZUTEVWQlFVVTdaMEpCUXpORExFOUJRVThzUlVGQlJTeERRVUZETzJGQlEySXNUVUZCVFR0blFrRkRTQ3hWUVVGVkxFTkJRVU1zVDBGQlR5eEZRVUZGTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRXRCUVVzc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETzJGQlEzaEZPMU5CUTBvN1MwRkRTaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZET3p0QlFVVkVMRk5CUVZNc1ZVRkJWU3hEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVTdRVUZEYmtNc1NVRkJTU3hKUVVGSkxFZEJRVWNzUjBGQlJ5eERRVUZETEVWQlFVVTdRVUZEYWtJN08xRkJSVkVzU1VGQlNTeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eFRRVUZUTEVsQlFVa3NWVUZCVlN4RlFVRkZPMWxCUTJwRUxFOUJRVThzUTBGQlF5eERRVUZETzFOQlExbzdVVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNVMEZCVXl4SFFVRkhMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1EwRkJRenRMUVVNMVJUdEpRVU5FTEU5QlFVOHNRMEZCUXl4RFFVRkRPMEZCUTJJc1EwRkJRenM3UVVGRlJDeFRRVUZUTEZkQlFWY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhGUVVGRkxFMUJRVTBzUlVGQlJTeFBRVUZQTEVWQlFVVTdPMGxCUldwRUxGVkJRVlVzUTBGQlF5eFhRVUZYTzFGQlEyeENMRWxCUVVrc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVsQlFVa3NSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJReXhGUVVGRk8xbEJRMjVETEU5QlFVOHNRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhIUVVGSExFTkJRVU1zUlVGQlJTeE5RVUZOTEVOQlFVTXNRMEZCUXp0VFFVTjBReXhOUVVGTk8xbEJRMGdzU1VGQlNTeERRVUZETEZsQlFWa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRUUVVNelFqdExRVU5LTEVWQlFVVXNUMEZCVHl4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRM0pDTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4UFFVRlBMRVZCUVVVN1NVRkRha01zU1VGQlNTeEpRVUZKTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhWUVVGVkxFTkJRVU1zUTBGQlF6dEJRVU5zUkN4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzVDBGQlR5eERRVUZET3p0SlFVVjZRaXhQUVVGUExFbEJRVWtzUTBGQlF5eFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRE9VTXNRMEZCUXpzN1FVRkZSQ3hUUVVGVExHMUNRVUZ0UWl4RFFVRkRMRWxCUVVrc1JVRkJSVHRKUVVNdlFpeFBRVUZQTEVsQlFVa3NTVUZCU1N4SlFVRkpMRU5CUVVNc1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4SlFVRkpMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEZGQlFWRXNRMEZCUXp0QlFVTm9SaXhEUVVGRE96dEJRVVZFTEVsQlFVa3NTVUZCU1N4SFFVRkhMRU5CUVVNc1dVRkJXVHRKUVVOd1FpeFRRVUZUTEVWQlFVVXNSMEZCUnp0UlFVTldMRTlCUVU4c1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFbEJRVWtzVDBGQlR5eERRVUZETzJGQlF6TkRMRkZCUVZFc1EwRkJReXhGUVVGRkxFTkJRVU03WVVGRFdpeFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1MwRkRja0k3U1VGRFJDeFBRVUZQTEZsQlFWazdVVUZEWml4UFFVRlBMRVZCUVVVc1JVRkJSU3hIUVVGSExFVkJRVVVzUlVGQlJTeEhRVUZITEVkQlFVY3NSMEZCUnl4RlFVRkZMRVZCUVVVc1IwRkJSeXhIUVVGSExFZEJRVWNzUlVGQlJTeEZRVUZGTEVkQlFVY3NSMEZCUnp0WlFVTTVReXhGUVVGRkxFVkJRVVVzUjBGQlJ5eEhRVUZITEVkQlFVY3NSVUZCUlN4RlFVRkZMRWRCUVVjc1JVRkJSU3hGUVVGRkxFZEJRVWNzUlVGQlJTeEZRVUZGTEVOQlFVTTdTMEZEZGtNc1EwRkJRenRCUVVOT0xFTkJRVU1zUjBGQlJ5eERRVUZET3p0QlFVVk1MRWxCUVVrc1UwRkJVeXhIUVVGSExFVkJRVVVzUTBGQlF6dEJRVU51UWl4SlFVRkpMRXRCUVVzc1EwRkJRenRCUVVOV0xFbEJRVWtzVVVGQlVTeERRVUZETzBGQlEySXNTVUZCU1N4SlFVRkpMRWRCUVVjN1NVRkRVQ3hMUVVGTExFVkJRVVVzUzBGQlN6dEpRVU5hTEVsQlFVa3NSVUZCUlN4WlFVRlpPMUZCUTJRc1NVRkJTU3hSUVVGUkxFZEJRVWNzYTBKQlFXdENMRU5CUVVNc1pVRkJaU3hEUVVGRExFTkJRVU03VVVGRGJrUXNUMEZCVHl4SlFVRkpMRU5CUVVNc1dVRkJXU3hGUVVGRkxFTkJRVU1zU1VGQlNTeERRVUZETEZsQlFWazdXVUZEZUVNc1NVRkJTU3hSUVVGUkxFVkJRVVU3WjBKQlExWXNXVUZCV1N4RFFVRkRMRXRCUVVzc1JVRkJSU3hEUVVGRE8yZENRVU55UWl4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNiMEpCUVc5Q0xFVkJRVVVzUTBGQlF6dHZRa0ZETjBNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eGhRVUZoTEVOQlFVTXNRMEZCUXp0dlFrRkRPVUlzVlVGQlZTeERRVUZETEZsQlFWazdRVUZETTBNc2QwSkJRWGRDTEV0QlFVc3NRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRE96dDNRa0ZGY2tJc1NVRkJTU3hUUVVGVExFZEJRVWNzYTBKQlFXdENMRU5CUVVNc2FVSkJRV2xDTEVOQlFVTXNRMEZCUXp0M1FrRkRkRVFzU1VGQlNTeFRRVUZUTEVWQlFVVTdORUpCUTFnc1UwRkJVeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN2VVSkJRM0pETzNkQ1FVTkVMRk5CUVZNc1IwRkJSeXhUUVVGVExFbEJRVWtzUlVGQlJTeERRVUZETzNkQ1FVTTFRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eHJRa0ZCYTBJc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4RFFVRkRPM2RDUVVOcVJDeEpRVUZKTEV0QlFVc3NSVUZCUlRzMFFrRkRVQ3hUUVVGVExFTkJRVU1zUzBGQlN5eEhRVUZITEV0QlFVc3NRMEZCUXp0QlFVTndSQ3g1UWtGQmVVSTdPM2RDUVVWRUxFbEJRVWtzUTBGQlF5eFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRk5CUVZNc1EwRkJReXhEUVVGRE8zRkNRVU42UXl4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRMmhDTEUxQlFVMDdaMEpCUTBnc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRzlDUVVGdlFpeEZRVUZGTEVOQlFVTTdaMEpCUTJwRUxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNN1owSkJRemxDTEVsQlFVa3NTMEZCU3l4RFFVRkRMRTFCUVUwc1MwRkJTeXhUUVVGVExFVkJRVVU3YjBKQlF6VkNMRmRCUVZjc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZGQlFWRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETzJsQ1FVTjRSQ3hOUVVGTkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFdEJRVXNzWTBGQll5eEZRVUZGTzI5Q1FVTjZSQ3hMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZGQlFWRXNRMEZCUXp0cFFrRkRNMEk3WVVGRFNqdFRRVU5LTEVOQlFVTXNRMEZCUXp0TFFVTk9PMGxCUTBRc1UwRkJVeXhGUVVGRkxGVkJRVlVzUjBGQlJ5eEZRVUZGTEU5QlFVOHNSVUZCUlR0UlFVTXZRaXhKUVVGSkxGTkJRVk1zU1VGQlNTeFRRVUZUTEVOQlFVTXNUVUZCVFN4RlFVRkZPMWxCUXk5Q0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhUUVVGVExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOMlF5eFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzJGQlF6bENPMU5CUTBvN1MwRkRTanRKUVVORUxHTkJRV01zUlVGQlJTeFpRVUZaTzFGQlEzaENMRWxCUVVrc1MwRkJTeXhEUVVGRExFMUJRVTBzU1VGQlNTeFhRVUZYTEVWQlFVVTdXVUZETjBJc1MwRkJTeXhEUVVGRExFMUJRVTBzUjBGQlJ5eFhRVUZYTEVOQlFVTTdXVUZETTBJc1MwRkJTeXhEUVVGRExFdEJRVXNzUjBGQlJ5eEZRVUZGTEVOQlFVTTdXVUZEYWtJc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHRRa0ZCYlVJc1EwRkJReXhEUVVGRE8wRkJRMmhFTEZsQlFWa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXh0UWtGQmJVSXNRMEZCUXl4RFFVRkRPenRaUVVWd1F5eEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRTFCUVUwc1JVRkJSVHRuUWtGRGRrSXNSMEZCUnl4RlFVRkZPMjlDUVVORUxGRkJRVkVzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRkZCUVZFN2IwSkJRMnhETEVsQlFVa3NSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFbEJRVWs3YjBKQlF6RkNMRTFCUVUwc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEUxQlFVMDdiMEpCUXpsQ0xFbEJRVWtzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrN2FVSkJRemRDTzJGQlEwb3NRMEZCUXl4RFFVRkRPMU5CUTA0N1FVRkRWQ3hMUVVGTE96dEpRVVZFTEZkQlFWY3NSVUZCUlN4VlFVRlZMRWxCUVVrc1JVRkJSU3hOUVVGTkxFVkJRVVU3VVVGRGFrTXNTVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hKUVVGSkxFMUJRVTBzUTBGQlF5eHBRa0ZCYVVJc1EwRkJReXhEUVVGRE8xRkJRemxETEVsQlFVa3NUMEZCVHl4SFFVRkhMRU5CUVVNc1NVRkJTU3hIUVVGSExFMUJRVTBzUTBGQlF5eHBSRUZCYVVRc1EwRkJReXhKUVVGSkxFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTTdVVUZET1VZc1QwRkJUeXhYUVVGWExFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1VVRkJVU3hGUVVGRk8xbEJReTlETEZGQlFWRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNc1EwRkJRenRaUVVOb1JDeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETzJkQ1FVTjBRaXhMUVVGTExFVkJRVVVzU1VGQlNUdEJRVU16UWl4aFFVRmhMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU03TzFsQlJWZ3NaVUZCWlN4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFpRVUZaTzJkQ1FVTjJReXhMUVVGTExFTkJRVU1zVDBGQlR5eEhRVUZITEU5QlFVOHNTMEZCU3l4SlFVRkpMRU5CUVVNN1FVRkRha1FzWjBKQlFXZENMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVTBGQlV5eERRVUZET3p0blFrRkZla0lzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4eFFrRkJjVUlzUjBGQlJ5eEpRVUZKTEVkQlFVY3NSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE8wRkJRemRGTEdkQ1FVRm5RaXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03TzJkQ1FVVnVReXhQUVVGUExFTkJRVU1zVVVGQlVTeEZRVUZGTEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTNoQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTEVOQlFVTXNRMEZCUXp0TFFVTk9PMGxCUTBRc1YwRkJWeXhGUVVGRkxGZEJRVmM3U1VGRGVFSXNXVUZCV1N4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRemRDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRXRCUVVzc1EwRkJReXhIUVVGSExFbEJRVWtzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNN1VVRkRMME1zVDBGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRPMUZCUTJwQ0xFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPMEZCUTJoRExGRkJRVkVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZET3p0UlFVVnVReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhEUVVGRExFTkJRVU03VVVGRGNFTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRWaXhKUVVGSkxFOUJRVThzUlVGQlJUdG5Ra0ZEVkN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExITkNRVUZ6UWl4SFFVRkhMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzWTBGQll5eERRVUZETEVOQlFVTTdZVUZETTBVc1RVRkJUVHRuUWtGRFNDeEpRVUZKTEVOQlFVTXNWMEZCVnl4RFFVRkRMSE5DUVVGelFpeEhRVUZITEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1kwRkJZeXhEUVVGRExFTkJRVU03WVVGRE4wVTdVMEZEU2p0QlFVTlVMRXRCUVVzN1FVRkRURHRCUVVOQk8wRkJRMEU3TzBsQlJVa3NiMEpCUVc5Q0xFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVTdVVUZEY2tNc1NVRkJTU3hSUVVGUkxFZEJRVWNzVDBGQlR5eERRVUZETEZsQlFWa3NRMEZCUXl4blFrRkJaMElzUTBGQlF5eEpRVUZKTEVsQlFVa3NSVUZCUlN4RFFVRkRPMEZCUTNoRkxGRkJRVkVzVDBGQlR5eERRVUZETEZsQlFWa3NRMEZCUXl4blFrRkJaMElzUlVGQlJTeFJRVUZSTEVOQlFVTXNRMEZCUXpzN1VVRkZha1FzU1VGQlNTeFBRVUZQTEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1JVRkJSU3hEUVVGRExGTkJRVk1zUTBGQlF6dFJRVU0xUXl4SlFVRkpMRmxCUVZrc1IwRkJSeXhGUVVGRkxFTkJRVU03VVVGRGRFSXNTVUZCU1N4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUlVGQlJTeEpRVUZKTEUxQlFVMHNTVUZCU1N4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUlVGQlJTeEpRVUZKTEUxQlFVMHNSVUZCUlR0WlFVTndSaXhaUVVGWkxFZEJRVWNzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1UwRkRjRU1zVFVGQlRUdFpRVU5JTEZsQlFWa3NSMEZCUnl4alFVRmpMRU5CUVVNc1QwRkJUeXhGUVVGRkxGRkJRVkVzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0VFFVTjZSRHRSUVVORUxFOUJRVTg3V1VGRFNDeFJRVUZSTEVWQlFVVXNVVUZCVVR0WlFVTnNRaXhUUVVGVExFVkJRVVVzV1VGQldUdFRRVU14UWl4RFFVRkRPMEZCUTFZc1MwRkJTenM3U1VGRlJDeGhRVUZoTEVWQlFVVXNWVUZCVlN4VFFVRlRMRVZCUVVVc1NVRkJTU3hGUVVGRkxFZEJRVWNzUlVGQlJUdFJRVU16UXl4SlFVRkpMRWxCUVVrc1EwRkJReXhYUVVGWExFVkJRVVVzU1VGQlNTeEpRVUZKTEVOQlFVTXNXVUZCV1N4RlFVRkZMRVZCUVVVN1dVRkRNME1zU1VGQlNTeFBRVUZQTEVkQlFVY3NTVUZCU1N4WFFVRlhMRVZCUVVVN1owSkJRek5DTEVkQlFVY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVOQlFVTTdZVUZEYWtNN1dVRkRSQ3hMUVVGTExFTkJRVU1zUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4SFFVRkhPMmRDUVVObUxGTkJRVk1zUlVGQlJTeFRRVUZUTzJkQ1FVTndRaXhUUVVGVExFVkJRVVVzU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVN1owSkJReTlDTEVsQlFVa3NSVUZCUlN4SlFVRkpPMkZCUTJJc1EwRkJRenRaUVVOR0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6dFRRVU4wUXp0TFFVTktPMGxCUTBRc1UwRkJVeXhGUVVGRkxGVkJRVlVzUjBGQlJ5eEZRVUZGTEZGQlFWRXNSVUZCUlR0UlFVTm9ReXhKUVVGSkxHTkJRV01zU1VGQlNTeGpRVUZqTEVOQlFVTXNUVUZCVFN4RlFVRkZPMWxCUTNwRExFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNMVF5eGpRVUZqTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzUlVGQlJTeFJRVUZSTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1lVRkRPVU03VTBGRFNqdExRVU5LTzBsQlEwUXNWMEZCVnl4RlFVRkZMRlZCUVZVc1MwRkJTeXhGUVVGRkxGRkJRVkVzUlVGQlJUdFJRVU53UXl4SlFVRkpMR05CUVdNc1NVRkJTU3hqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTzFsQlEzcERMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4alFVRmpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTTFReXhqUVVGakxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNTMEZCU3l4RFFVRkRMRXRCUVVzc1JVRkJSU3hSUVVGUkxFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdZVUZEYkVRN1UwRkRTanRMUVVOS08wbEJRMFFzWjBKQlFXZENMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRGFrTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dExRVU16UWp0SlFVTkVMRzFDUVVGdFFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUTNCRExGbEJRVmtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRPVUk3U1VGRFJDeHhRa0ZCY1VJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU4wUXl4alFVRmpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzB0QlEyaERPMGxCUTBRc2JVSkJRVzFDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRjRU1zV1VGQldTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVNNVFqdEpRVU5FTERKQ1FVRXlRaXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTzFGQlF6VkRMRzlDUVVGdlFpeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVOMFF6dEpRVU5FTEZkQlFWY3NSVUZCUlN4WFFVRlhPMUZCUTNCQ0xFOUJRVThzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTjJSRHRKUVVORUxGTkJRVk1zUlVGQlJTeFhRVUZYTzFGQlEyeENMRTlCUVU4c1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dExRVU55UkR0SlFVTkVMRmxCUVZrc1JVRkJSU3hUUVVGVExGVkJRVlVzUlVGQlJUdFJRVU12UWl4SlFVRkpMRTlCUVU4c1ZVRkJWU3hMUVVGTExGZEJRVmNzUzBGQlN5eEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1NVRkJTU3hEUVVGRExGbEJRVmtzUlVGQlJTeERRVUZETEVWQlFVVTdXVUZEYkVZc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NWVUZCVlN4SFFVRkhMRmxCUVZrc1IwRkJSeXhYUVVGWExFTkJRVU03V1VGRE5VUXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXh2UWtGQmIwSXNRMEZCUXl4RFFVRkRPMU5CUTNoRE8xRkJRMFFzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1EwRkJReXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMHRCUTNoRU8wbEJRMFFzWVVGQllTeEZRVUZGTEZWQlFWVXNTVUZCU1N4RlFVRkZPMUZCUXpOQ0xFbEJRVWtzU1VGQlNTeExRVUZMTEV0QlFVc3NSVUZCUlR0WlFVTm9RaXhKUVVGSkxGZEJRVmNzUjBGQlJ6dG5Ra0ZEWkN4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFdEJRVXM3UVVGRGJFTXNZVUZCWVN4RFFVRkRPenRCUVVWa0xGbEJRVmtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03TzFsQlJUVkNMRWxCUVVrc1EwRkJReXhYUVVGWExFTkJRVU1zU1VGQlNTeEZRVUZGTzJkQ1FVTnVRaXhYUVVGWExFTkJRVU1zU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4eFFrRkJjVUlzUTBGQlF5eERRVUZETzBGQlEycEZMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeFhRVUZYTEVOQlFVTXNTVUZCU1N4RlFVRkZPMEZCUTJ4RExHZENRVUZuUWl4TFFVRkxMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUTBGQlF5eFhRVUZYTEVOQlFVTXNRMEZCUXpzN1owSkJSV3hETEVsQlFVa3NXVUZCV1N4SlFVRkpMRmxCUVZrc1EwRkJReXhOUVVGTkxFVkJRVVU3YjBKQlEzSkRMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4WlFVRlpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzNkQ1FVTXhReXhaUVVGWkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8zRkNRVU4wUXp0cFFrRkRTanRoUVVOS08wRkJRMklzVTBGQlV6czdRVUZGVkN4UlFVRlJMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVVVGQlVTeERRVUZET3p0QlFVVm9ReXhSUVVGUkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zUTBGQlF6czdVVUZGY0VNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHRRa0ZCYlVJc1JVRkJSU3hYUVVGWExFTkJRVU1zUTBGQlF6dEJRVU42UkN4TFFVRkxPenRKUVVWRUxGbEJRVmtzUlVGQlJTeFpRVUZaTzFGQlEzUkNMRWxCUVVrc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4UlFVRlJMRVZCUVVVc1EwRkJRenRSUVVNNVF5eEpRVUZKTEc5Q1FVRnZRaXhEUVVGRExFMUJRVTBzUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXl4clFrRkJhMElzUTBGQlF5eGxRVUZsTEVOQlFVTXNSVUZCUlR0WlFVTjZSU3hQUVVGUExFbEJRVWtzVDBGQlR5eERRVUZETEZWQlFWVXNUMEZCVHl4RlFVRkZMRTFCUVUwc1JVRkJSVHRuUWtGRE1VTXNiMEpCUVc5Q0xFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNWVUZCVlN4SlFVRkpMRVZCUVVVN2IwSkJRM0JETEZGQlFWRXNRMEZCUXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03YjBKQlF6TkNMRTlCUVU4c1JVRkJSU3hEUVVGRE8ybENRVU5pTEVWQlFVVXNXVUZCV1R0dlFrRkRXQ3hQUVVGUExFVkJRVVVzUTBGQlF6dHBRa0ZEWWl4RFFVRkRMRU5CUVVNN1lVRkRUaXhEUVVGRExFTkJRVU03VTBGRFRpeE5RVUZOTzFsQlEwZ3NUMEZCVHl4UFFVRlBMRU5CUVVNc1QwRkJUeXhGUVVGRkxFTkJRVU03VTBGRE5VSTdRVUZEVkN4TFFVRkxPenRKUVVWRUxHOUNRVUZ2UWl4RlFVRkZMRmxCUVZrN1VVRkRPVUlzU1VGQlNTeFpRVUZaTEVkQlFVY3NXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dFJRVU5vUkN4SlFVRkpMRmxCUVZrc1JVRkJSVHRaUVVOa0xFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8xTkJRM0JETEUxQlFVMDdXVUZEU0N4TFFVRkxMRWRCUVVjN1owSkJRMG9zVFVGQlRTeEZRVUZGTEdOQlFXTTdaMEpCUTNSQ0xGTkJRVk1zUlVGQlJTeEZRVUZGTzJGQlEyaENMRU5CUVVNN1UwRkRURHRSUVVORUxFOUJRVThzUzBGQlN5eERRVUZETzBGQlEzSkNMRXRCUVVzN08wbEJSVVFzYTBKQlFXdENMRVZCUVVVc1ZVRkJWU3hUUVVGVExFVkJRVVU3VVVGRGNrTXNTVUZCU1N4VFFVRlRMRVZCUVVVN1dVRkRXQ3haUVVGWkxFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTTdVMEZETTBRc1RVRkJUVHRaUVVOSUxGbEJRVmtzUTBGQlF5eFZRVUZWTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1UwRkRia003UVVGRFZDeExRVUZMT3p0SlFVVkVMRTFCUVUwc1JVRkJSU3haUVVGWk8xRkJRMmhDTEVsQlFVa3NRMEZCUXl4clFrRkJhMElzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTnNRenRCUVVOTUxFTkJRVU1zUTBGQlF6czdRVUZGUml4VFFVRlRMR1ZCUVdVc1EwRkJReXhIUVVGSExFVkJRVVVzUzBGQlN5eEZRVUZGTzBsQlEycERMRU5CUVVNc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF5eFhRVUZYTEVOQlFVTXNZVUZCWVN4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRE8wRkJRemRETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhYUVVGWExFTkJRVU1zUjBGQlJ5eEZRVUZGTEV0QlFVc3NSVUZCUlR0SlFVTTNRaXhEUVVGRExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNWMEZCVnl4RFFVRkRMRmxCUVZrc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF6dEJRVU0xUXl4RFFVRkRPenRCUVVWRU8wRkJRMEU3UVVGRFFUczdSMEZGUnp0QlFVTklMRk5CUVZNc2JVSkJRVzFDTEVOQlFVTXNSMEZCUnl4RlFVRkZPMGxCUXpsQ0xFOUJRVThzUTBGQlF5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF5eE5RVUZOTEVsQlFVa3NRMEZCUXp0VlFVTndReXhIUVVGSExFTkJRVU1zVVVGQlVTeERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRTlCUVU4c1EwRkJRenRCUVVOb1JDeERRVUZET3p0QlFVVkVMRWxCUVVrc1RVRkJUU3hIUVVGSExFVkJRVVVzUTBGQlF6czdRVUZGYUVJc1UwRkJVeXhwUWtGQmFVSXNSMEZCUnpzN1NVRkZla0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRjRU1zVVVGQlVTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETEVOQlFVTXNSVUZCUlN4RFFVRkRMRlZCUVZVc1IwRkJSeXhGUVVGRk8xbEJRMnBFTEVsQlFVa3NUMEZCVHl4SFFVRkhMRlZCUVZVc1EwRkJReXhGUVVGRk8yZENRVU4yUWl4SlFVRkpMRU5CUVVNc1EwRkJReXhUUVVGVE8wRkJReTlDTEc5Q1FVRnZRaXhQUVVGUE96dG5Ra0ZGV0N4SlFVRkpMRWxCUVVrc1EwRkJReXhYUVVGWExFVkJRVVU3YjBKQlEyeENMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zV1VGQldUdHZRa0ZEY2tJc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4aFFVRmhMRU5CUVVNN2IwSkJRM0pETEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEdWQlFXVXNRMEZCUXl4RFFVRkRMRTFCUVUwc1NVRkJTU3hEUVVGRE8yOUNRVU5vUkN4dFFrRkJiVUlzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRVZCUVVVN2MwSkJRemRDTEVsQlFVa3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNRMEZCUXp0elFrRkRiRU1zU1VGQlNTeEpRVUZKTEVkQlFVYzdNRUpCUTFBc1QwRkJUeXhGUVVGRkxFbEJRVWtzUTBGQlF5eHZRa0ZCYjBJc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETzNWQ1FVTXZReXhEUVVGRE8wRkJRM2hDTEhOQ1FVRnpRaXhKUVVGSkxFdEJRVXNzUTBGQlF6czdjMEpCUlZZc1NVRkJTU3hEUVVGRExFTkJRVU1zUzBGQlN5eEpRVUZKTEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVN01FSkJRM0pDTEVsQlFVa3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhEUVVGRExFdEJRVXNzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRPMEZCUXpWRUxIVkNRVUYxUWpzN2MwSkJSVVFzU1VGQlNTeEhRVUZITEVsQlFVa3NWMEZCVnl4RlFVRkZPekJDUVVOd1FpeGxRVUZsTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6c3dRa0ZEYUVNc1RVRkJUU3hEUVVGRExFbEJRVWtzUTBGQlF6czRRa0ZEVWl4UFFVRlBMRVZCUVVVc1EwRkJReXhEUVVGRExFMUJRVTA3T0VKQlEycENMRXRCUVVzc1JVRkJSU3hWUVVGVkxFTkJRVU1zV1VGQldUdHJRMEZETVVJc1YwRkJWeXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN2EwTkJRelZDTEdWQlFXVXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZET3l0Q1FVTndReXhGUVVGRkxFZEJRVWNzUTBGQlF6c3lRa0ZEVml4RFFVRkRMRU5CUVVNN2RVSkJRMDQ3YzBKQlEwUXNTVUZCU1N4SFFVRkhMRWxCUVVrc1ZVRkJWU3hGUVVGRk96QkNRVU51UWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUczRRa0ZEY0VNc1NVRkJTU3hOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNUMEZCVHl4SlFVRkpMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVU3YTBOQlF5OUNMRmxCUVZrc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN2EwTkJRemxDTEUxQlFVMHNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF5eERRVUZETzJ0RFFVTndRaXhOUVVGTk95dENRVU5VT3pKQ1FVTktPekJDUVVORUxHVkJRV1VzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRE96QkNRVU5xUXl4WFFVRlhMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXp0QlFVTjJSQ3gxUWtGQmRVSTdPM05DUVVWRUxFbEJRVWtzUjBGQlJ5eEpRVUZKTEZGQlFWRXNSVUZCUlRzd1FrRkRha0lzU1VGQlNTeERRVUZETEV0QlFVc3NSMEZCUnl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFdEJRVXNzUTBGQlF6dEJRVU4wUkN4MVFrRkJkVUk3TzNOQ1FVVkVMRWxCUVVrc1EwRkJReXhoUVVGaExFTkJRVU1zUjBGQlJ5eEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVONlJDeHBRa0ZCYVVJN08wRkJSV3BDTEdGQlFXRXNRMEZCUXp0QlFVTmtPenRaUVVWWkxFTkJRVU1zU1VGQlNTeERRVUZETEdOQlFXTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1kwRkJZeXhKUVVGSkxFVkJRVVVzUlVGQlJTeEhRVUZITEVOQlFVTXNSMEZCUnl4UFFVRlBMRU5CUVVNN1dVRkRha1VzVDBGQlR5eFBRVUZQTEVOQlFVTTdVMEZEYkVJc1JVRkJSU3hOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenRCUVVNM1FpeExRVUZMT3p0SlFVVkVMRWxCUVVrc1UwRkJVeXhIUVVGSE8xRkJRMW9zUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1FVRkRia0lzUzBGQlN5eERRVUZET3p0SlFVVkdMRWxCUVVrc1VVRkJVU3hIUVVGSE8xRkJRMWdzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hKUVVGSk8xRkJRMVlzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzBGQlEycENMRXRCUVVzc1EwRkJRenM3U1VGRlJpeFRRVUZUTEdWQlFXVXNSVUZCUlN4RFFVRkRMRVZCUVVVN1VVRkRla0lzU1VGQlNTeERRVUZETEVOQlFVTXNVMEZCVXp0QlFVTjJRaXhaUVVGWkxFOUJRVTg3TzFGQlJWZ3NTVUZCU1N4SlFVRkpMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WlFVRlpMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4aFFVRmhMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhsUVVGbExFTkJRVU1zUTBGQlF5eE5RVUZOTEVsQlFVa3NRMEZCUXl4RlFVRkZPMEZCUTNSS0xGbEJRVmtzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVNMVFqdEJRVU5CT3p0WlFVVlpMRWxCUVVrc1UwRkJVeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZETEVOQlFVTXNSVUZCUlR0blFrRkROMElzUTBGQlF5eEhRVUZITEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOcVF5eGhRVUZoT3p0WlFVVkVMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zVVVGQlVTeExRVUZMTEVOQlFVTXNTVUZCU1N4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eEZRVUZGTzJkQ1FVTnlReXhEUVVGRExFZEJRVWNzVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRMRWRCUVVjc1JVRkJSU3hEUVVGRExFTkJRVU03UVVGRGFFUXNZVUZCWVN4TlFVRk5MRWxCUVVrc1EwRkJReXhEUVVGRExGRkJRVkVzU1VGQlNTeFJRVUZSTEVOQlFVTXNZMEZCWXl4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRk96dG5Ra0ZGYWtRc1EwRkJReXhIUVVGSExGRkJRVkVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0aFFVTnVRaXhOUVVGTk8yZENRVU5JTEVOQlFVTXNSMEZCUnl4TlFVRk5MRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlF6TkRMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4VlFVRlZMRVZCUVVVN1owSkJRek5DTEU5QlFVOHNSVUZCUlN4SlFVRkpMRU5CUVVNc2IwSkJRVzlDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJRenRuUWtGRE5VTXNSMEZCUnl4RlFVRkZMRU5CUVVNN1owSkJRMDRzVTBGQlV5eEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1MwRkJTenRuUWtGRGVrSXNTMEZCU3l4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUzBGQlN5eEhRVUZITEVOQlFVTTdaMEpCUTNwQ0xFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHp0aFFVTnlRaXhEUVVGRExFTkJRVU03VTBGRFRqdEJRVU5VTEV0QlFVczdPMEZCUlV3c1NVRkJTU3hSUVVGUkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1ZVRkJWU3hGUVVGRkxHVkJRV1VzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0QlFVTnFSVHM3U1VGRlNTeERRVUZETEVsQlFVa3NRMEZCUXl4alFVRmpMRWRCUVVjc1NVRkJTU3hEUVVGRExHTkJRV01zU1VGQlNTeEZRVUZGTEVWQlFVVXNWVUZCVlN4RFFVRkRMRWRCUVVjc1pVRkJaU3hEUVVGRE8wRkJRM0JHTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4SlFVRkpMRVZCUVVVN1NVRkRPVUlzU1VGQlNTeEhRVUZITEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03U1VGRE1VUXNTVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hOUVVGTkxFTkJRVU1zVVVGQlVTeEhRVUZITEVsQlFVa3NSMEZCUnl4WFFVRlhMRU5CUVVNN1VVRkRha1FzVDBGQlR5eEhRVUZITEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETzBsQlF6RkRMRTlCUVU4c1QwRkJUeXhMUVVGTExFbEJRVWtzUjBGQlJ5eEZRVUZGTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhMUVVGTExFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXp0QlFVTjBSaXhEUVVGRE96dEJRVVZFTEZOQlFWTXNZVUZCWVN4SFFVRkhPMFZCUTNaQ0xFbEJRVWtzVVVGQlVTeERRVUZETEZWQlFWVXNTVUZCU1N4VlFVRlZMRVZCUVVVN1FVRkRla01zU1VGQlNTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNc1NVRkJTU3hEUVVGRExGbEJRVms3TzBGQlJXcERMRkZCUVZFc2FVSkJRV2xDTEVWQlFVVXNRMEZCUXpzN1VVRkZjRUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRVZCUVVVN1dVRkRjRUlzU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4TlFVRk5MRVZCUVVVN1owSkJRM1pDTEVkQlFVY3NSVUZCUlR0dlFrRkRSQ3hSUVVGUkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4UlFVRlJPMjlDUVVOc1F5eEpRVUZKTEVWQlFVVXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhKUVVGSk8yOUNRVU14UWl4TlFVRk5MRVZCUVVVc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eE5RVUZOTzI5Q1FVTTVRaXhKUVVGSkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpPMmxDUVVNM1FqdGhRVU5LTEVOQlFVTXNRMEZCUXp0VFFVTk9PMHRCUTBvc1EwRkJReXhEUVVGRE8wZEJRMG83UVVGRFNDeERRVUZET3p0QlFVVkVMR0ZCUVdFc1JVRkJSU3hEUVVGRE8wRkJRMmhDTEZGQlFWRXNRMEZCUXl4blFrRkJaMElzUTBGQlF5eHJRa0ZCYTBJc1JVRkJSU3hoUVVGaExFTkJRVU1zUTBGQlF6czdRVUZGTjBRc1RVRkJUU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMRkZCUVZFc1JVRkJSU3haUVVGWk8wbEJRekZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJRenRCUVVOc1FpeERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN08wRkJSVlFzVFVGQlRTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExFOUJRVThzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlR0SlFVTTFReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdkQ1FVRm5RaXhIUVVGSExFZEJRVWNzUTBGQlF5eFBRVUZQTEVkQlFVY3NSMEZCUnl4SFFVRkhMRWRCUVVjc1EwRkJReXhIUVVGSExFZEJRVWNzUjBGQlJ5eEhRVUZITEVkQlFVY3NRMEZCUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhIUVVGSExFZEJRVWNzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTndSeXhEUVVGRExFTkJRVU1zUTBGQlF6czdRVUZGU0N4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCZklEMGdjbVZ4ZFdseVpTZ25MaTkxZEdsc2N5Y3BPMXh1ZG1GeUlGQnliMjFwYzJVZ1BTQnlaWEYxYVhKbEtDZGxjell0Y0hKdmJXbHpaU2NwTGxCeWIyMXBjMlU3WEc1MllYSWdVMmx0ZFd4aGRHVWdQU0J5WlhGMWFYSmxLQ2N1TDNOcGJYVnNZWFJsSnlrN1hHNTJZWElnYzJWc1pXTjBiM0pHYVc1a1pYSWdQU0J5WlhGMWFYSmxLQ2N1TDNObGJHVmpkRzl5Um1sdVpHVnlKeWs3WEc1MllYSWdVMlYwZEdsdVozTWdQU0J5WlhGMWFYSmxLQ2N1TDNObGRIUnBibWR6SnlrN1hHNWNiaTh2SUhaaGNpQnRlVWRsYm1WeVlYUnZjaUE5SUc1bGR5QkRjM05UWld4bFkzUnZja2RsYm1WeVlYUnZjaWdwTzF4dWRtRnlJR2x0Y0c5eWRHRnVkRk4wWlhCTVpXNW5kR2dnUFNBMU1EQTdYRzUyWVhJZ2MyRjJaVWhoYm1Sc1pYSnpJRDBnVzEwN1hHNTJZWElnY21Wd2IzSjBTR0Z1Wkd4bGNuTWdQU0JiWFR0Y2JuWmhjaUJzYjJGa1NHRnVaR3hsY25NZ1BTQmJYVHRjYm5aaGNpQnpaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnljeUE5SUZ0ZE8xeHVYRzVtZFc1amRHbHZiaUJuWlhSVFkyVnVZWEpwYnlodVlXMWxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVJQ2h5WlhOdmJIWmxMQ0J5WldwbFkzUXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHeHZZV1JJWVc1a2JHVnljeTVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkR0YwWlNBOUlIVjBiV1V1YzNSaGRHVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElITjBZWFJsTG5OalpXNWhjbWx2Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHRjBaUzV6WTJWdVlYSnBiM05iYVYwdWJtRnRaU0E5UFQwZ2JtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtITjBZWFJsTG5OalpXNWhjbWx2YzF0cFhTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYkc5aFpFaGhibVJzWlhKeld6QmRLRzVoYldVc0lHWjFibU4wYVc5dUlDaHlaWE53S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNoeVpYTndLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU2s3WEc1OVhHNTJZWElnZG1Gc2FXUmhkR2x1WnlBOUlHWmhiSE5sTzF4dVhHNTJZWElnWlhabGJuUnpJRDBnVzF4dUlDQWdJQ2RqYkdsamF5Y3NYRzRnSUNBZ0oyWnZZM1Z6Snl4Y2JpQWdJQ0FuWW14MWNpY3NYRzRnSUNBZ0oyUmliR05zYVdOckp5eGNiaUFnSUNBdkx5QW5aSEpoWnljc1hHNGdJQ0FnTHk4Z0oyUnlZV2RsYm5SbGNpY3NYRzRnSUNBZ0x5OGdKMlJ5WVdkc1pXRjJaU2NzWEc0Z0lDQWdMeThnSjJSeVlXZHZkbVZ5Snl4Y2JpQWdJQ0F2THlBblpISmhaM04wWVhKMEp5eGNiaUFnSUNBdkx5QW5hVzV3ZFhRbkxGeHVJQ0FnSUNkdGIzVnpaV1J2ZDI0bkxGeHVJQ0FnSUM4dklDZHRiM1Z6WlcxdmRtVW5MRnh1SUNBZ0lDZHRiM1Z6WldWdWRHVnlKeXhjYmlBZ0lDQW5iVzkxYzJWc1pXRjJaU2NzWEc0Z0lDQWdKMjF2ZFhObGIzVjBKeXhjYmlBZ0lDQW5iVzkxYzJWdmRtVnlKeXhjYmlBZ0lDQW5iVzkxYzJWMWNDY3NYRzRnSUNBZ0oyTm9ZVzVuWlNjc1hHNGdJQ0FnTHk4Z0ozSmxjMmw2WlNjc1hHNGdJQ0FnTHk4Z0ozTmpjbTlzYkNkY2JsMDdYRzVjYm1aMWJtTjBhVzl1SUdkbGRGQnlaV052Ym1ScGRHbHZibk1nS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnZG1GeUlITmxkSFZ3SUQwZ2MyTmxibUZ5YVc4dWMyVjBkWEE3WEc0Z0lDQWdkbUZ5SUhOalpXNWhjbWx2Y3lBOUlITmxkSFZ3SUNZbUlITmxkSFZ3TG5OalpXNWhjbWx2Y3p0Y2JpQWdJQ0F2THlCVVQwUlBPaUJDY21WaGF5QnZkWFFnYVc1MGJ5Qm9aV3h3WlhKY2JpQWdJQ0JwWmlBb2MyTmxibUZ5YVc5ektTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExtRnNiQ2hmTG0xaGNDaHpZMlZ1WVhKcGIzTXNJR1oxYm1OMGFXOXVJQ2h6WTJWdVlYSnBiMDVoYldVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJuWlhSVFkyVnVZWEpwYnloelkyVnVZWEpwYjA1aGJXVXBMblJvWlc0b1puVnVZM1JwYjI0Z0tHOTBhR1Z5VTJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYjNSb1pYSlRZMlZ1WVhKcGJ5QTlJRXBUVDA0dWNHRnljMlVvU2xOUFRpNXpkSEpwYm1kcFpua29iM1JvWlhKVFkyVnVZWEpwYnlrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYjNSb1pYSlRZMlZ1WVhKcGJ5NXpkR1Z3Y3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOUtTazdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2hiWFNrN1hHNGdJQ0FnZlZ4dWZWeHVYRzVtZFc1amRHbHZiaUJuWlhSUWIzTjBZMjl1WkdsMGFXOXVjeUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0IyWVhJZ1kyeGxZVzUxY0NBOUlITmpaVzVoY21sdkxtTnNaV0Z1ZFhBN1hHNGdJQ0FnZG1GeUlITmpaVzVoY21sdmN5QTlJR05zWldGdWRYQWdKaVlnWTJ4bFlXNTFjQzV6WTJWdVlYSnBiM003WEc0Z0lDQWdMeThnVkU5RVR6b2dRbkpsWVdzZ2IzVjBJR2x1ZEc4Z2FHVnNjR1Z5WEc0Z0lDQWdhV1lnS0hOalpXNWhjbWx2Y3lrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1aGJHd29YeTV0WVhBb2MyTmxibUZ5YVc5ekxDQm1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOU9ZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdaMlYwVTJObGJtRnlhVzhvYzJObGJtRnlhVzlPWVcxbEtTNTBhR1Z1S0daMWJtTjBhVzl1SUNodmRHaGxjbE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJRzkwYUdWeVUyTmxibUZ5YVc4Z1BTQktVMDlPTG5CaGNuTmxLRXBUVDA0dWMzUnlhVzVuYVdaNUtHOTBhR1Z5VTJObGJtRnlhVzhwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRzkwYUdWeVUyTmxibUZ5YVc4dWMzUmxjSE03WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlNrcE8xeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9XMTBwTzF4dUlDQWdJSDFjYm4xY2JseHVablZ1WTNScGIyNGdYMk52Ym1OaGRGTmpaVzVoY21sdlUzUmxjRXhwYzNSektITjBaWEJ6S1NCN1hHNGdJQ0FnZG1GeUlHNWxkMU4wWlhCeklEMGdXMTA3WEc0Z0lDQWdkbUZ5SUdOMWNuSmxiblJVYVcxbGMzUmhiWEE3SUM4dklHbHVhWFJoYkdsNlpXUWdZbmtnWm1seWMzUWdiR2x6ZENCdlppQnpkR1Z3Y3k1Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJxSUQwZ01Ec2dhaUE4SUhOMFpYQnpMbXhsYm1kMGFEc2dhaXNyS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJtYkdGMFUzUmxjSE1nUFNCemRHVndjMXRxWFR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR29nUGlBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcklEMGdNRHNnYXlBOElITjBaWEJ6TG14bGJtZDBhRHNnYXlzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhOMFpYQWdQU0JtYkdGMFUzUmxjSE5iYTEwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR1JwWm1ZZ1BTQnJJRDRnTUNBL0lITjBaWEF1ZEdsdFpWTjBZVzF3SUMwZ1pteGhkRk4wWlhCelcyc2dMU0F4WFM1MGFXMWxVM1JoYlhBZ09pQTFNRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqZFhKeVpXNTBWR2x0WlhOMFlXMXdJQ3M5SUdScFptWTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabXhoZEZOMFpYQnpXMnRkTG5ScGJXVlRkR0Z0Y0NBOUlHTjFjbkpsYm5SVWFXMWxjM1JoYlhBN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpkWEp5Wlc1MFZHbHRaWE4wWVcxd0lEMGdabXhoZEZOMFpYQnpXMnBkTG5ScGJXVlRkR0Z0Y0R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnVaWGRUZEdWd2N5QTlJRzVsZDFOMFpYQnpMbU52Ym1OaGRDaG1iR0YwVTNSbGNITXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnYm1WM1UzUmxjSE03WEc1OVhHNWNibVoxYm1OMGFXOXVJSE5sZEhWd1EyOXVaR2wwYVc5dWN5QW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQjJZWElnY0hKdmJXbHpaWE1nUFNCYlhUdGNiaUFnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzVoYkd3b1cxeHVJQ0FnSUNBZ0lDQm5aWFJRY21WamIyNWthWFJwYjI1ektITmpaVzVoY21sdktTeGNiaUFnSUNBZ0lDQWdaMlYwVUc5emRHTnZibVJwZEdsdmJuTW9jMk5sYm1GeWFXOHBYRzRnSUNBZ1hTa3VkR2hsYmlobWRXNWpkR2x2YmlBb2MzUmxjRUZ5Y21GNWN5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2MzUmxjRXhwYzNSeklEMGdjM1JsY0VGeWNtRjVjMXN3WFM1amIyNWpZWFFvVzNOalpXNWhjbWx2TG5OMFpYQnpYU3dnYzNSbGNFRnljbUY1YzFzeFhTazdYRzRnSUNBZ0lDQWdJSE5qWlc1aGNtbHZMbk4wWlhCeklEMGdYMk52Ym1OaGRGTmpaVzVoY21sdlUzUmxjRXhwYzNSektITjBaWEJNYVhOMGN5azdYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlISjFibE4wWlhBb2MyTmxibUZ5YVc4c0lHbGtlQ3dnZEc5VGEybHdLU0I3WEc0Z0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0oxSlZUazVKVGtkZlUxUkZVQ2NwTzF4dUlDQWdJSFJ2VTJ0cGNDQTlJSFJ2VTJ0cGNDQjhmQ0I3ZlR0Y2JseHVJQ0FnSUhaaGNpQnpkR1Z3SUQwZ2MyTmxibUZ5YVc4dWMzUmxjSE5iYVdSNFhUdGNiaUFnSUNCMllYSWdjM1JoZEdVZ1BTQjFkRzFsTG5OMFlYUmxPMXh1SUNBZ0lHbG1JQ2h6ZEdWd0lDWW1JSE4wWVhSbExuTjBZWFIxY3lBOVBTQW5VRXhCV1VsT1J5Y3BJSHRjYmlBZ0lDQWdJQ0FnYzNSaGRHVXVjblZ1TG5OalpXNWhjbWx2SUQwZ2MyTmxibUZ5YVc4N1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5KMWJpNXpkR1Z3U1c1a1pYZ2dQU0JwWkhnN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuYkc5aFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJzYjJOaGRHbHZiaUE5SUhOMFpYQXVaR0YwWVM1MWNtd3VjSEp2ZEc5amIyd2dLeUJjSWk4dlhDSWdLeUJ6ZEdWd0xtUmhkR0V1ZFhKc0xtaHZjM1FnS3lCY0lpOWNJanRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ6WldGeVkyZ2dQU0J6ZEdWd0xtUmhkR0V1ZFhKc0xuTmxZWEpqYUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCb1lYTm9JRDBnYzNSbGNDNWtZWFJoTG5WeWJDNW9ZWE5vTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhSbGMzUlRaWEoyWlhJZ1BTQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9YQ0oxZEcxbFgzUmxjM1JmYzJWeWRtVnlYQ0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hSbGMzUlRaWEoyWlhJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaV0Z5WTJnZ0t6MGdLSE5sWVhKamFDQS9JRndpSmx3aUlEb2dYQ0kvWENJcElDc2dYQ0oxZEcxbFgzUmxjM1JmYzJWeWRtVnlQVndpSUNzZ2RHVnpkRk5sY25abGNqdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNXlaWEJzWVdObEtHeHZZMkYwYVc5dUlDc2djMlZoY21Ob0lDc2dhR0Z6YUNrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdOdmJuTnZiR1V1Ykc5bktDaHNiMk5oZEdsdmJpNXdjbTkwYjJOdmJDQXJJR3h2WTJGMGFXOXVMbWh2YzNRZ0t5QnNiMk5oZEdsdmJpNXpaV0Z5WTJncEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdOdmJuTnZiR1V1Ykc5bktDaHpkR1Z3TG1SaGRHRXVkWEpzTG5CeWIzUnZZMjlzSUNzZ2MzUmxjQzVrWVhSaExuVnliQzVvYjNOMElDc2djM1JsY0M1a1lYUmhMblZ5YkM1elpXRnlZMmdwS1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1NXWWdkMlVnYUdGMlpTQnViM1FnWTJoaGJtZGxaQ0IwYUdVZ1lXTjBkV0ZzSUd4dlkyRjBhVzl1TENCMGFHVnVJSFJvWlNCc2IyTmhkR2x2Ymk1eVpYQnNZV05sWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUIzYVd4c0lHNXZkQ0JuYnlCaGJubDNhR1Z5WlZ4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0Noc2IyTmhkR2x2Ymk1d2NtOTBiMk52YkNBcklHeHZZMkYwYVc5dUxtaHZjM1FnS3lCc2IyTmhkR2x2Ymk1elpXRnlZMmdwSUQwOVBWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDaHpkR1Z3TG1SaGRHRXVkWEpzTG5CeWIzUnZZMjlzSUNzZ2MzUmxjQzVrWVhSaExuVnliQzVvYjNOMElDc2djM1JsY0M1a1lYUmhMblZ5YkM1elpXRnlZMmdwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVUbVY0ZEZOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUN3Z2RHOVRhMmx3TENBd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2QwYVcxbGIzVjBKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFlYUmxMbUYxZEc5U2RXNHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5ZFc1T1pYaDBVM1JsY0NoelkyVnVZWEpwYnl3Z2FXUjRMQ0IwYjFOcmFYQXNJSE4wWlhBdVpHRjBZUzVoYlc5MWJuUXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHeHZZMkYwYjNJZ1BTQnpkR1Z3TG1SaGRHRXViRzlqWVhSdmNqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkR1Z3Y3lBOUlITmpaVzVoY21sdkxuTjBaWEJ6TzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhWdWFYRjFaVWxrSUQwZ1oyVjBWVzVwY1hWbFNXUkdjbTl0VTNSbGNDaHpkR1Z3S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2RISjVJSFJ2SUdkbGRDQnlhV1FnYjJZZ2RXNXVaV05sYzNOaGNua2djM1JsY0hOY2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnZEc5VGEybHdXM1Z1YVhGMVpVbGtYU0E5UFNBbmRXNWtaV1pwYm1Wa0p5QW1KaUIxZEcxbExuTjBZWFJsTG5KMWJpNXpjR1ZsWkNBaFBTQW5jbVZoYkhScGJXVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCa2FXWm1PMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYVdkdWIzSmxJRDBnWm1Gc2MyVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHb2dQU0J6ZEdWd2N5NXNaVzVuZEdnZ0xTQXhPeUJxSUQ0Z2FXUjRPeUJxTFMwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYjNSb1pYSlRkR1Z3SUQwZ2MzUmxjSE5iYWwwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJRzkwYUdWeVZXNXBjWFZsU1dRZ1BTQm5aWFJWYm1seGRXVkpaRVp5YjIxVGRHVndLRzkwYUdWeVUzUmxjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIVnVhWEYxWlVsa0lEMDlQU0J2ZEdobGNsVnVhWEYxWlVsa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXUnBabVlwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JrYVdabUlEMGdLRzkwYUdWeVUzUmxjQzUwYVcxbFUzUmhiWEFnTFNCemRHVndMblJwYldWVGRHRnRjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV2R1YjNKbElEMGdJV2x6U1cxd2IzSjBZVzUwVTNSbGNDaHZkR2hsY2xOMFpYQXBJQ1ltSUdScFptWWdQQ0JwYlhCdmNuUmhiblJUZEdWd1RHVnVaM1JvTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHBjMGx1ZEdWeVlXTjBhWFpsVTNSbGNDaHZkR2hsY2xOMFpYQXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV2R1YjNKbElEMGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5VGEybHdXM1Z1YVhGMVpVbGtYU0E5SUdsbmJtOXlaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdWMlVuY21VZ2MydHBjSEJwYm1jZ2RHaHBjeUJsYkdWdFpXNTBYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kRzlUYTJsd1cyZGxkRlZ1YVhGMVpVbGtSbkp2YlZOMFpYQW9jM1JsY0NsZEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjblZ1VG1WNGRGTjBaWEFvYzJObGJtRnlhVzhzSUdsa2VDd2dkRzlUYTJsd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEhKNVZXNTBhV3hHYjNWdVpDaHpZMlZ1WVhKcGJ5d2djM1JsY0N3Z2JHOWpZWFJ2Y2l3Z1oyVjBWR2x0Wlc5MWRDaHpZMlZ1WVhKcGJ5d2dhV1I0S1NrdWRHaGxiaWhtZFc1amRHbHZiaUFvWld4bGN5a2dlMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdaV3hsSUQwZ1pXeGxjMXN3WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUIwWVdkT1lXMWxJRDBnWld4bExuUmhaMDVoYldVdWRHOU1iM2RsY2tOaGMyVW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkWEJ3YjNKMGMwbHVjSFYwUlhabGJuUWdQU0IwWVdkT1lXMWxJRDA5UFNBbmFXNXdkWFFuSUh4OElIUmhaMDVoYldVZ1BUMDlJQ2QwWlhoMFlYSmxZU2NnZkh3Z1pXeGxMbWRsZEVGMGRISnBZblYwWlNnblkyOXVkR1Z1ZEdWa2FYUmhZbXhsSnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNobGRtVnVkSE11YVc1a1pYaFBaaWh6ZEdWd0xtVjJaVzUwVG1GdFpTa2dQajBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2IzQjBhVzl1Y3lBOUlIdDlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JsY0M1a1lYUmhMbUoxZEhSdmJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHOXdkR2x2Ym5NdWQyaHBZMmdnUFNCdmNIUnBiMjV6TG1KMWRIUnZiaUE5SUhOMFpYQXVaR0YwWVM1aWRYUjBiMjQ3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdkx5QmpiMjV6YjJ4bExteHZaeWduVTJsdGRXeGhkR2x1WnlBbklDc2djM1JsY0M1bGRtVnVkRTVoYldVZ0t5QW5JRzl1SUdWc1pXMWxiblFnSnl3Z1pXeGxMQ0JzYjJOaGRHOXlMbk5sYkdWamRHOXljMXN3WFN3Z1hDSWdabTl5SUhOMFpYQWdYQ0lnS3lCcFpIZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKMk5zYVdOckp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDUW9aV3hsS1M1MGNtbG5aMlZ5S0NkamJHbGpheWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLQ2h6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuWm05amRYTW5JSHg4SUhOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkaWJIVnlKeWtnSmlZZ1pXeGxXM04wWlhBdVpYWmxiblJPWVcxbFhTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnNaVnR6ZEdWd0xtVjJaVzUwVG1GdFpWMG9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaVnR6ZEdWd0xtVjJaVzUwVG1GdFpWMG9aV3hsTENCdmNIUnBiMjV6S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjM1JsY0M1a1lYUmhMblpoYkhWbElDRTlJRndpZFc1a1pXWnBibVZrWENJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVXVkbUZzZFdVZ1BTQnpkR1Z3TG1SaGRHRXVkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1JtOXlJR0p5YjNkelpYSnpJSFJvWVhRZ2MzVndjRzl5ZENCMGFHVWdhVzV3ZFhRZ1pYWmxiblF1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMWNIQnZjblJ6U1c1d2RYUkZkbVZ1ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdVdVpYWmxiblFvWld4bExDQW5hVzV3ZFhRbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1WlhabGJuUW9aV3hsTENBblkyaGhibWRsSnlrN0lDOHZJRlJvYVhNZ2MyaHZkV3hrSUdKbElHWnBjbVZrSUdGbWRHVnlJR0VnWW14MWNpQmxkbVZ1ZEM1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNSbGNDNWxkbVZ1ZEU1aGJXVWdQVDBnSjJ0bGVYQnlaWE56SnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2EyVjVJRDBnVTNSeWFXNW5MbVp5YjIxRGFHRnlRMjlrWlNoemRHVndMbVJoZEdFdWEyVjVRMjlrWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbXRsZVhCeVpYTnpLR1ZzWlN3Z2EyVjVLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdVdWEyVjVaRzkzYmlobGJHVXNJR3RsZVNrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWld4bExuWmhiSFZsSUQwZ2MzUmxjQzVrWVhSaExuWmhiSFZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNWxkbVZ1ZENobGJHVXNJQ2RqYUdGdVoyVW5LVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNXJaWGwxY0NobGJHVXNJR3RsZVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRYQndiM0owYzBsdWNIVjBSWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtVjJaVzUwS0dWc1pTd2dKMmx1Y0hWMEp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBaWEF1WlhabGJuUk9ZVzFsSUQwOUlDZDJZV3hwWkdGMFpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvSjFaaGJHbGtZWFJsT2lBbklDc2dTbE5QVGk1emRISnBibWRwWm5rb2JHOWpZWFJ2Y2k1elpXeGxZM1J2Y25NcElDQXJJRndpSUdOdmJuUmhhVzV6SUhSbGVIUWdKMXdpSUNBcklITjBaWEF1WkdGMFlTNTBaWGgwSUNzZ1hDSW5YQ0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmhkR1V1WVhWMGIxSjFiaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBzSUdaMWJtTjBhVzl1SUNoeVpYTjFiSFFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkMllXeHBaR0YwWlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbkpsY0c5eWRFeHZaeWhjSWxaaGJHbGtZWFJsT2lCY0lpQXJJSEpsYzNWc2RDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV6ZEc5d1UyTmxibUZ5YVc4b1ptRnNjMlVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LSEpsYzNWc2RDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExtRjFkRzlTZFc0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISjFiazVsZUhSVGRHVndLSE5qWlc1aGNtbHZMQ0JwWkhnc0lIUnZVMnRwY0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtWjFibU4wYVc5dUlIZGhhWFJHYjNKQmJtZDFiR0Z5S0hKdmIzUlRaV3hsWTNSdmNpa2dlMXh1SUNBZ0lIWmhjaUJsYkNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvY205dmRGTmxiR1ZqZEc5eUtUdGNiaUFnSUNCeVpYUjFjbTRnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0Z0tISmxjMjlzZG1Vc0lISmxhbVZqZENrZ2UxeHVJQ0FnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGM2FXNWtiM2N1WVc1bmRXeGhjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduWVc1bmRXeGhjaUJqYjNWc1pDQnViM1FnWW1VZ1ptOTFibVFnYjI0Z2RHaGxJSGRwYm1SdmR5Y3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHRnVaM1ZzWVhJdVoyVjBWR1Z6ZEdGaWFXeHBkSGtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaGJtZDFiR0Z5TG1kbGRGUmxjM1JoWW1sc2FYUjVLR1ZzS1M1M2FHVnVVM1JoWW14bEtISmxjMjlzZG1VcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXRnVaM1ZzWVhJdVpXeGxiV1Z1ZENobGJDa3VhVzVxWldOMGIzSW9LU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0ozSnZiM1FnWld4bGJXVnVkQ0FvSnlBcklISnZiM1JUWld4bFkzUnZjaUFySUNjcElHaGhjeUJ1YnlCcGJtcGxZM1J2Y2k0bklDdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDY2dkR2hwY3lCdFlYa2diV1ZoYmlCcGRDQnBjeUJ1YjNRZ2FXNXphV1JsSUc1bkxXRndjQzRuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1lXNW5kV3hoY2k1bGJHVnRaVzUwS0dWc0tTNXBibXBsWTNSdmNpZ3BMbWRsZENnbkpHSnliM2R6WlhJbktTNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnViM1JwWm5sWGFHVnVUbTlQZFhSemRHRnVaR2x1WjFKbGNYVmxjM1J6S0hKbGMyOXNkbVVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5SUdOaGRHTm9JQ2hsY25JcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGFtVmpkQ2hsY25JcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHbHpTVzF3YjNKMFlXNTBVM1JsY0NoemRHVndLU0I3WEc0Z0lDQWdjbVYwZFhKdUlITjBaWEF1WlhabGJuUk9ZVzFsSUNFOUlDZHRiM1Z6Wld4bFlYWmxKeUFtSmx4dUlDQWdJQ0FnSUNBZ0lDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWdmRYUW5JQ1ltWEc0Z0lDQWdJQ0FnSUNBZ0lITjBaWEF1WlhabGJuUk9ZVzFsSUNFOUlDZGliSFZ5Snp0Y2JuMWNibHh1THlvcVhHNGdLaUJTWlhSMWNtNXpJSFJ5ZFdVZ2FXWWdkR2hsSUdkcGRtVnVJSE4wWlhBZ2FYTWdjMjl0WlNCemIzSjBJRzltSUhWelpYSWdhVzUwWlhKaFkzUnBiMjVjYmlBcUwxeHVablZ1WTNScGIyNGdhWE5KYm5SbGNtRmpkR2wyWlZOMFpYQW9jM1JsY0NrZ2UxeHVJQ0FnSUhKbGRIVnlibHh1SUNBZ0lDQWdiM1JvWlhKVGRHVndMbVYyWlc1MFRtRnRaUzVwYm1SbGVFOW1LRndpYlc5MWMyVmNJaWtnSVQwOUlEQWdmSHhjYmlBZ0lDQWdJRzkwYUdWeVUzUmxjQzVsZG1WdWRFNWhiV1V1YVc1a1pYaFBaaWhjSW0xdmRYTmxaRzkzYmx3aUtTQTlQVDBnTUNCOGZGeHVJQ0FnSUNBZ2IzUm9aWEpUZEdWd0xtVjJaVzUwVG1GdFpTNXBibVJsZUU5bUtGd2liVzkxYzJWMWNGd2lLU0E5UFQwZ01EdGNibjFjYmx4dVpuVnVZM1JwYjI0Z2RISjVWVzUwYVd4R2IzVnVaQ2h6WTJWdVlYSnBieXdnYzNSbGNDd2diRzlqWVhSdmNpd2dkR2x0Wlc5MWRDd2dkR1Y0ZEZSdlEyaGxZMnNwSUh0Y2JpQWdJQ0IyWVhJZ2MzUmhjblJsWkR0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCbWRXNWpkR2x2YmlCMGNubEdhVzVrS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRnpkR0Z5ZEdWa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoY25SbFpDQTlJRzVsZHlCRVlYUmxLQ2t1WjJWMFZHbHRaU2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWld4bGN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm1iM1Z1WkZSdmIwMWhibmtnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJtYjNWdVpGWmhiR2xrSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWm05MWJtUkVhV1ptWlhKbGJuUlVaWGgwSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzJWc1pXTjBiM0p6Vkc5VVpYTjBJRDBnYkc5allYUnZjaTV6Wld4bFkzUnZjbk11YzJ4cFkyVW9NQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnZEdWNGRGUnZRMmhsWTJzZ1BTQnpkR1Z3TG1SaGRHRXVkR1Y0ZER0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCamIyMXdZWEpwYzI5dUlEMGdjM1JsY0M1a1lYUmhMbU52YlhCaGNtbHpiMjRnZkh3Z1hDSmxjWFZoYkhOY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGJHVmpkRzl5YzFSdlZHVnpkQzUxYm5Ob2FXWjBLQ2RiWkdGMFlTMTFibWx4ZFdVdGFXUTlYQ0luSUNzZ2JHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkNBcklDZGNJbDBuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzJWc1pXTjBiM0p6Vkc5VVpYTjBMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE5sYkdWamRHOXlJRDBnYzJWc1pXTjBiM0p6Vkc5VVpYTjBXMmxkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHBjMGx0Y0c5eWRHRnVkRk4wWlhBb2MzUmxjQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlZzWldOMGIzSWdLejBnWENJNmRtbHphV0pzWlZ3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxiR1Z6SUQwZ0pDaHpaV3hsWTNSdmNpazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWc1pYTXViR1Z1WjNSb0lEMDlJREVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUIwWlhoMFZHOURhR1ZqYXlBaFBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHNWxkMVJsZUhRZ1BTQWtLR1ZzWlhOYk1GMHBMblJsZUhRb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2dvWTI5dGNHRnlhWE52YmlBOVBUMGdKMlZ4ZFdGc2N5Y2dKaVlnYm1WM1ZHVjRkQ0E5UFQwZ2RHVjRkRlJ2UTJobFkyc3BJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0tHTnZiWEJoY21semIyNGdQVDA5SUNkamIyNTBZV2x1Y3ljZ0ppWWdibVYzVkdWNGRDNXBibVJsZUU5bUtIUmxlSFJVYjBOb1pXTnJLU0ErUFNBd0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtWbUZzYVdRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRVJwWm1abGNtVnVkRlJsZUhRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptOTFibVJXWVd4cFpDQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVnpMbUYwZEhJb0oyUmhkR0V0ZFc1cGNYVmxMV2xrSnl3Z2JHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR1ZzWlhNdWJHVnVaM1JvSUQ0Z01Ta2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRlJ2YjAxaGJua2dQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHWnZkVzVrVm1Gc2FXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOdmJIWmxLR1ZzWlhNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNocGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa2dKaVlnS0c1bGR5QkVZWFJsS0NrdVoyVjBWR2x0WlNncElDMGdjM1JoY25SbFpDa2dQQ0IwYVcxbGIzVjBJQ29nTlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dOVEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnY21WemRXeDBJRDBnWENKY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWm05MWJtUlViMjlOWVc1NUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMzVnNkQ0E5SUNkRGIzVnNaQ0J1YjNRZ1ptbHVaQ0JoY0hCeWIzQnlhV0YwWlNCbGJHVnRaVzUwSUdadmNpQnpaV3hsWTNSdmNuTTZJQ2NnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hzYjJOaGRHOXlMbk5sYkdWamRHOXljeWtnS3lCY0lpQm1iM0lnWlhabGJuUWdYQ0lnS3lCemRHVndMbVYyWlc1MFRtRnRaU0FySUZ3aUxpQWdVbVZoYzI5dU9pQkdiM1Z1WkNCVWIyOGdUV0Z1ZVNCRmJHVnRaVzUwYzF3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9abTkxYm1SRWFXWm1aWEpsYm5SVVpYaDBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjM1ZzZENBOUlDZERiM1ZzWkNCdWIzUWdabWx1WkNCaGNIQnliM0J5YVdGMFpTQmxiR1Z0Wlc1MElHWnZjaUJ6Wld4bFkzUnZjbk02SUNjZ0t5QktVMDlPTG5OMGNtbHVaMmxtZVNoc2IyTmhkRzl5TG5ObGJHVmpkRzl5Y3lrZ0t5QmNJaUJtYjNJZ1pYWmxiblFnWENJZ0t5QnpkR1Z3TG1WMlpXNTBUbUZ0WlNBcklGd2lMaUFnVW1WaGMyOXVPaUJVWlhoMElHUnZaWE51SjNRZ2JXRjBZMmd1SUNCY1hHNUZlSEJsWTNSbFpEcGNYRzVjSWlBcklIUmxlSFJVYjBOb1pXTnJJQ3NnWENKY1hHNWlkWFFnZDJGelhGeHVYQ0lnS3lCbGJHVnpMblJsZUhRb0tTQXJJRndpWEZ4dVhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemRXeDBJRDBnSjBOdmRXeGtJRzV2ZENCbWFXNWtJR0Z3Y0hKdmNISnBZWFJsSUdWc1pXMWxiblFnWm05eUlITmxiR1ZqZEc5eWN6b2dKeUFySUVwVFQwNHVjM1J5YVc1bmFXWjVLR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpLU0FySUZ3aUlHWnZjaUJsZG1WdWRDQmNJaUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnWENJdUlDQlNaV0Z6YjI0NklFNXZJR1ZzWlcxbGJuUnpJR1p2ZFc1a1hDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYW1WamRDaHlaWE4xYkhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdkbUZ5SUd4cGJXbDBJRDBnYVcxd2IzSjBZVzUwVTNSbGNFeGxibWQwYUNBdklDaDFkRzFsTG5OMFlYUmxMbkoxYmk1emNHVmxaQ0E5UFNBbmNtVmhiSFJwYldVbklEOGdKekVuSURvZ2RYUnRaUzV6ZEdGMFpTNXlkVzR1YzNCbFpXUXBPMXh1SUNBZ0lDQWdJQ0JwWmlBb1oyeHZZbUZzTG1GdVozVnNZWElwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSGRoYVhSR2IzSkJibWQxYkdGeUtDZGJibWN0WVhCd1hTY3BMblJvWlc0b1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbExuTjBZWFJsTG5KMWJpNXpjR1ZsWkNBOVBUMGdKM0psWVd4MGFXMWxKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBWR2x0Wlc5MWRDaDBjbmxHYVc1a0xDQjBhVzFsYjNWMEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDFkRzFsTG5OMFlYUmxMbkoxYmk1emNHVmxaQ0E5UFQwZ0oyWmhjM1JsYzNRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwY25sR2FXNWtLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WlhSVWFXMWxiM1YwS0hSeWVVWnBibVFzSUUxaGRHZ3ViV2x1S0hScGJXVnZkWFFnS2lCMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDd2diR2x0YVhRcEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6ZEdGMFpTNXlkVzR1YzNCbFpXUWdQVDA5SUNkeVpXRnNkR2x0WlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFJVYVcxbGIzVjBLSFJ5ZVVacGJtUXNJSFJwYldWdmRYUXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDFkRzFsTG5OMFlYUmxMbkoxYmk1emNHVmxaQ0E5UFQwZ0oyWmhjM1JsYzNRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSEo1Um1sdVpDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtIUnllVVpwYm1Rc0lFMWhkR2d1YldsdUtIUnBiV1Z2ZFhRZ0tpQjFkRzFsTG5OMFlYUmxMbkoxYmk1emNHVmxaQ3dnYkdsdGFYUXBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHBPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQm5aWFJVYVcxbGIzVjBLSE5qWlc1aGNtbHZMQ0JwWkhncElIdGNiaUFnSUNCcFppQW9hV1I0SUQ0Z01Da2dlMXh1SUNBZ0lDQWdJQ0F2THlCSlppQjBhR1VnY0hKbGRtbHZkWE1nYzNSbGNDQnBjeUJoSUhaaGJHbGtZWFJsSUhOMFpYQXNJSFJvWlc0Z2FuVnpkQ0J0YjNabElHOXVMQ0JoYm1RZ2NISmxkR1Z1WkNCcGRDQnBjMjRuZENCMGFHVnlaVnh1SUNBZ0lDQWdJQ0F2THlCUGNpQnBaaUJwZENCcGN5QmhJSE5sY21sbGN5QnZaaUJyWlhsekxDQjBhR1Z1SUdkdlhHNGdJQ0FnSUNBZ0lHbG1JQ2h6WTJWdVlYSnBieTV6ZEdWd2MxdHBaSGdnTFNBeFhTNWxkbVZ1ZEU1aGJXVWdQVDBnSjNaaGJHbGtZWFJsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJREE3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhOalpXNWhjbWx2TG5OMFpYQnpXMmxrZUYwdWRHbHRaVk4wWVcxd0lDMGdjMk5sYm1GeWFXOHVjM1JsY0hOYmFXUjRJQzBnTVYwdWRHbHRaVk4wWVcxd08xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdNRHRjYm4xY2JseHVablZ1WTNScGIyNGdjblZ1VG1WNGRGTjBaWEFvYzJObGJtRnlhVzhzSUdsa2VDd2dkRzlUYTJsd0xDQjBhVzFsYjNWMEtTQjdYRzRnSUNBZ0x5OGdUV0ZyWlNCemRYSmxJSGRsSUdGeVpXNG5kQ0JuYjJsdVp5QjBieUJ2ZG1WeVpteHZkeUIwYUdVZ1kyRnNiQ0J6ZEdGamF5NWNiaUFnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyTmxibUZ5YVc4dWMzUmxjSE11YkdWdVozUm9JRDRnS0dsa2VDQXJJREVwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5ZFc1VGRHVndLSE5qWlc1aGNtbHZMQ0JwWkhnZ0t5QXhMQ0IwYjFOcmFYQXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV6ZEc5d1UyTmxibUZ5YVc4b2RISjFaU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TENCMGFXMWxiM1YwSUh4OElEQXBPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQm1jbUZuYldWdWRFWnliMjFUZEhKcGJtY29jM1J5U0ZSTlRDa2dlMXh1SUNBZ0lIWmhjaUIwWlcxd0lEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnbmRHVnRjR3hoZEdVbktUdGNiaUFnSUNCMFpXMXdMbWx1Ym1WeVNGUk5UQ0E5SUhOMGNraFVUVXc3WEc0Z0lDQWdMeThnWTI5dWMyOXNaUzVzYjJjb2RHVnRjQzVwYm01bGNraFVUVXdwTzF4dUlDQWdJSEpsZEhWeWJpQjBaVzF3TG1OdmJuUmxiblFnUHlCMFpXMXdMbU52Ym5SbGJuUWdPaUIwWlcxd08xeHVmVnh1WEc1bWRXNWpkR2x2YmlCblpYUlZibWx4ZFdWSlpFWnliMjFUZEdWd0tITjBaWEFwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdjM1JsY0NBbUppQnpkR1Z3TG1SaGRHRWdKaVlnYzNSbGNDNWtZWFJoTG14dlkyRjBiM0lnSmlZZ2MzUmxjQzVrWVhSaExteHZZMkYwYjNJdWRXNXBjWFZsU1dRN1hHNTlYRzVjYm5aaGNpQm5kV2xrSUQwZ0tHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQm1kVzVqZEdsdmJpQnpOQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUUxaGRHZ3VabXh2YjNJb0tERWdLeUJOWVhSb0xuSmhibVJ2YlNncEtTQXFJREI0TVRBd01EQXBYRzRnSUNBZ0lDQWdJQ0FnSUNBdWRHOVRkSEpwYm1jb01UWXBYRzRnSUNBZ0lDQWdJQ0FnSUNBdWMzVmljM1J5YVc1bktERXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2N6UW9LU0FySUhNMEtDa2dLeUFuTFNjZ0t5QnpOQ2dwSUNzZ0p5MG5JQ3NnY3pRb0tTQXJJQ2N0SnlBclhHNGdJQ0FnSUNBZ0lDQWdJQ0J6TkNncElDc2dKeTBuSUNzZ2N6UW9LU0FySUhNMEtDa2dLeUJ6TkNncE8xeHVJQ0FnSUgwN1hHNTlLU2dwTzF4dVhHNTJZWElnYkdsemRHVnVaWEp6SUQwZ1cxMDdYRzUyWVhJZ2MzUmhkR1U3WEc1MllYSWdjMlYwZEdsdVozTTdYRzUyWVhJZ2RYUnRaU0E5SUh0Y2JpQWdJQ0J6ZEdGMFpUb2djM1JoZEdVc1hHNGdJQ0FnYVc1cGREb2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdjMk5sYm1GeWFXOGdQU0JuWlhSUVlYSmhiV1YwWlhKQ2VVNWhiV1VvSjNWMGJXVmZjMk5sYm1GeWFXOG5LVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFYwYldVdWJHOWhaRk5sZEhScGJtZHpLQ2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCc2IyTmhiRk4wYjNKaFoyVXVZMnhsWVhJb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlNBOUlIVjBiV1V1YzNSaGRHVWdQU0IxZEcxbExteHZZV1JUZEdGMFpVWnliMjFUZEc5eVlXZGxLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkSlRrbFVTVUZNU1ZwRlJDY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSbExtRjFkRzlTZFc0Z1BTQjBjblZsTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjblZ1UTI5dVptbG5JRDBnWjJWMFVHRnlZVzFsZEdWeVFubE9ZVzFsS0NkMWRHMWxYM0oxYmw5amIyNW1hV2NuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHlkVzVEYjI1bWFXY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNURiMjVtYVdjZ1BTQktVMDlPTG5CaGNuTmxLSEoxYmtOdmJtWnBaeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5ZFc1RGIyNW1hV2NnUFNCeWRXNURiMjVtYVdjZ2ZId2dlMzA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MzQmxaV1FnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb0ozVjBiV1ZmY25WdVgzTndaV1ZrSnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM0JsWldRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5ZFc1RGIyNW1hV2N1YzNCbFpXUWdQU0J6Y0dWbFpEdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eWRXNVRZMlZ1WVhKcGJ5aHpZMlZ1WVhKcGJ5d2djblZ1UTI5dVptbG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTd2dNakF3TUNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSbElEMGdkWFJ0WlM1emRHRjBaU0E5SUhWMGJXVXViRzloWkZOMFlYUmxSbkp2YlZOMGIzSmhaMlVvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbUp5YjJGa1kyRnpkQ2duU1U1SlZFbEJURWxhUlVRbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNSaGRHVXVjM1JoZEhWeklEMDlQU0JjSWxCTVFWbEpUa2RjSWlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5ZFc1T1pYaDBVM1JsY0NoemRHRjBaUzV5ZFc0dWMyTmxibUZ5YVc4c0lITjBZWFJsTG5KMWJpNXpkR1Z3U1c1a1pYZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvSVhOMFlYUmxMbk4wWVhSMWN5QjhmQ0J6ZEdGMFpTNXpkR0YwZFhNZ1BUMDlJQ2RKVGtsVVNVRk1TVnBKVGtjbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJRndpVEU5QlJFVkVYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJR0p5YjJGa1kyRnpkRG9nWm5WdVkzUnBiMjRnS0dWMmRDd2daWFowUkdGMFlTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2JHbHpkR1Z1WlhKeklDWW1JR3hwYzNSbGJtVnljeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2diR2x6ZEdWdVpYSnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JHbHpkR1Z1WlhKelcybGRLR1YyZEN3Z1pYWjBSR0YwWVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSE4wWVhKMFVtVmpiM0prYVc1bk9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1emRHRjBkWE1nSVQwZ0oxSkZRMDlTUkVsT1J5Y3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUNkU1JVTlBVa1JKVGtjbk8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjM1JsY0hNZ1BTQmJYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVVtVmpiM0prYVc1bklGTjBZWEowWldSY0lpazdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbUp5YjJGa1kyRnpkQ2duVWtWRFQxSkVTVTVIWDFOVVFWSlVSVVFuS1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaV2RwYzNSbGNrVjJaVzUwS0Z3aWJHOWhaRndpTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIQnliM1J2WTI5c09pQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWNISnZkRzlqYjJ3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2h2YzNRNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b2IzTjBMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpXRnlZMmc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTV6WldGeVkyZ3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdoaGMyZzZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9ZWE5vWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnY25WdVUyTmxibUZ5YVc4NklHWjFibU4wYVc5dUlDaHVZVzFsTENCamIyNW1hV2NwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFJ2VW5WdUlEMGdibUZ0WlNCOGZDQndjbTl0Y0hRb0oxTmpaVzVoY21sdklIUnZJSEoxYmljcE8xeHVJQ0FnSUNBZ0lDQjJZWElnWVhWMGIxSjFiaUE5SUNGdVlXMWxJRDhnY0hKdmJYQjBLQ2RYYjNWc1pDQjViM1VnYkdsclpTQjBieUJ6ZEdWd0lIUm9jbTkxWjJnZ1pXRmphQ0J6ZEdWd0lDaDVmRzRwUHljcElDRTlJQ2Q1SnlBNklIUnlkV1U3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJuWlhSVFkyVnVZWEpwYnloMGIxSjFiaWt1ZEdobGJpaG1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITmpaVzVoY21sdklEMGdTbE5QVGk1d1lYSnpaU2hLVTA5T0xuTjBjbWx1WjJsbWVTaHpZMlZ1WVhKcGJ5a3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV6ZEdGMFpTNXlkVzRnUFNCZkxtVjRkR1Z1WkNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzQmxaV1E2SUNjeE1DZGNiaUFnSUNBZ0lDQWdJQ0FnSUgwc0lHTnZibVpwWnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhObGRIVndRMjl1WkdsMGFXOXVjeWh6WTJWdVlYSnBieWt1ZEdobGJpaG1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVZWFYwYjFKMWJpQTlJR0YxZEc5U2RXNGdQVDA5SUhSeWRXVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdWMzUmhkSFZ6SUQwZ1hDSlFURUZaU1U1SFhDSTdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE4wWVhKMGFXNW5JRk5qWlc1aGNtbHZJQ2RjSWlBcklHNWhiV1VnS3lCY0lpZGNJaXdnYzJObGJtRnlhVzhwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RRVEVGWlFrRkRTMTlUVkVGU1ZFVkVKeWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNVRkR1Z3S0hOalpXNWhjbWx2TENBd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISjFiazVsZUhSVGRHVndPaUJ5ZFc1T1pYaDBVM1JsY0N4Y2JpQWdJQ0J6ZEc5d1UyTmxibUZ5YVc4NklHWjFibU4wYVc5dUlDaHpkV05qWlhOektTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCelkyVnVZWEpwYnlBOUlITjBZWFJsTG5KMWJpQW1KaUJ6ZEdGMFpTNXlkVzR1YzJObGJtRnlhVzg3WEc0Z0lDQWdJQ0FnSUdSbGJHVjBaU0J6ZEdGMFpTNXlkVzQ3WEc0Z0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJRndpVEU5QlJFVkVYQ0k3WEc0Z0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RRVEVGWlFrRkRTMTlUVkU5UVVFVkVKeWs3WEc1Y2JpQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvWENKVGRHOXdjR2x1WnlCVFkyVnVZWEpwYjF3aUtUdGNiaUFnSUNBZ0lDQWdhV1lnS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzVmpZMlZ6Y3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVcxTlZRME5GVTFOZElGTmpaVzVoY21sdklDZGNJaUFySUhOalpXNWhjbWx2TG01aGJXVWdLeUJjSWljZ1EyOXRjR3hsZEdWa0lWd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUkZjbkp2Y2loY0lsdEdRVWxNVlZKRlhTQlRZMlZ1WVhKcGJ5QW5YQ0lnS3lCelkyVnVZWEpwYnk1dVlXMWxJQ3NnWENJbklFTnZiWEJzWlhSbFpDRmNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nUTNKbFlYUmxjeUJoSUhSbGJYQnZjbUZ5ZVNCbGJHVnRaVzUwSUd4dlkyRjBiM0lzSUdadmNpQjFjMlVnZDJsMGFDQm1hVzVoYkdsNlpVeHZZMkYwYjNKY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JqY21WaGRHVkZiR1Z0Wlc1MFRHOWpZWFJ2Y2pvZ1puVnVZM1JwYjI0Z0tHVnNaVzFsYm5RcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhWdWFYRjFaVWxrSUQwZ1pXeGxiV1Z1ZEM1blpYUkJkSFJ5YVdKMWRHVW9YQ0prWVhSaExYVnVhWEYxWlMxcFpGd2lLU0I4ZkNCbmRXbGtLQ2s3WEc0Z0lDQWdJQ0FnSUdWc1pXMWxiblF1YzJWMFFYUjBjbWxpZFhSbEtGd2laR0YwWVMxMWJtbHhkV1V0YVdSY0lpd2dkVzVwY1hWbFNXUXBPMXh1WEc0Z0lDQWdJQ0FnSUhaaGNpQmxiR1ZJZEcxc0lEMGdaV3hsYldWdWRDNWpiRzl1WlU1dlpHVW9LUzV2ZFhSbGNraFVUVXc3WEc0Z0lDQWdJQ0FnSUhaaGNpQmxiR1ZUWld4bFkzUnZjbk1nUFNCYlhUdGNiaUFnSUNBZ0lDQWdhV1lnS0dWc1pXMWxiblF1ZEdGblRtRnRaUzUwYjFWd2NHVnlRMkZ6WlNncElEMDlJQ2RDVDBSWkp5QjhmQ0JsYkdWdFpXNTBMblJoWjA1aGJXVXVkRzlWY0hCbGNrTmhjMlVvS1NBOVBTQW5TRlJOVENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWc1pWTmxiR1ZqZEc5eWN5QTlJRnRsYkdWdFpXNTBMblJoWjA1aGJXVmRPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pXeGxVMlZzWldOMGIzSnpJRDBnYzJWc1pXTjBiM0pHYVc1a1pYSW9aV3hsYldWdWRDd2daRzlqZFcxbGJuUXVZbTlrZVNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWdWFYRjFaVWxrT2lCMWJtbHhkV1ZKWkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5sYkdWamRHOXljem9nWld4bFUyVnNaV04wYjNKelhHNGdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lISmxaMmx6ZEdWeVJYWmxiblE2SUdaMWJtTjBhVzl1SUNobGRtVnVkRTVoYldVc0lHUmhkR0VzSUdsa2VDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzVwYzFKbFkyOXlaR2x1WnlncElIeDhJSFYwYldVdWFYTldZV3hwWkdGMGFXNW5LQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYVdSNElEMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXUjRJRDBnZFhSdFpTNXpkR0YwWlM1emRHVndjeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTNXpkR1Z3YzF0cFpIaGRJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWMlpXNTBUbUZ0WlRvZ1pYWmxiblJPWVcxbExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBiV1ZUZEdGdGNEb2dibVYzSUVSaGRHVW9LUzVuWlhSVWFXMWxLQ2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkdGMFlUb2daR0YwWVZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkRlZrVk9WRjlTUlVkSlUxUkZVa1ZFSnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhKbGNHOXlkRXh2WnpvZ1puVnVZM1JwYjI0Z0tHeHZaeXdnYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSEpsY0c5eWRFaGhibVJzWlhKeklDWW1JSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCeVpYQnZjblJJWVc1a2JHVnljeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjRzl5ZEVoaGJtUnNaWEp6VzJsZExteHZaeWhzYjJjc0lITmpaVzVoY21sdkxDQjFkRzFsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdjbVZ3YjNKMFJYSnliM0k2SUdaMWJtTjBhVzl1SUNobGNuSnZjaXdnYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSEpsY0c5eWRFaGhibVJzWlhKeklDWW1JSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCeVpYQnZjblJJWVc1a2JHVnljeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjRzl5ZEVoaGJtUnNaWEp6VzJsZExtVnljbTl5S0dWeWNtOXlMQ0J6WTJWdVlYSnBieXdnZFhSdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhKbFoybHpkR1Z5VEdsemRHVnVaWEk2SUdaMWJtTjBhVzl1SUNob1lXNWtiR1Z5S1NCN1hHNGdJQ0FnSUNBZ0lHeHBjM1JsYm1WeWN5NXdkWE5vS0doaGJtUnNaWElwTzF4dUlDQWdJSDBzWEc0Z0lDQWdjbVZuYVhOMFpYSlRZWFpsU0dGdVpHeGxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2MyRjJaVWhoYm1Sc1pYSnpMbkIxYzJnb2FHRnVaR3hsY2lrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0J5WldkcGMzUmxjbEpsY0c5eWRFaGhibVJzWlhJNklHWjFibU4wYVc5dUlDaG9ZVzVrYkdWeUtTQjdYRzRnSUNBZ0lDQWdJSEpsY0c5eWRFaGhibVJzWlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV2RwYzNSbGNreHZZV1JJWVc1a2JHVnlPaUJtZFc1amRHbHZiaUFvYUdGdVpHeGxjaWtnZTF4dUlDQWdJQ0FnSUNCc2IyRmtTR0Z1Wkd4bGNuTXVjSFZ6YUNob1lXNWtiR1Z5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlVMlYwZEdsdVozTk1iMkZrU0dGdVpHeGxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2MyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNuTXVjSFZ6YUNob1lXNWtiR1Z5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2x6VW1WamIzSmthVzVuT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIVjBiV1V1YzNSaGRHVXVjM1JoZEhWekxtbHVaR1Y0VDJZb1hDSlNSVU5QVWtSSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCcGMxQnNZWGxwYm1jNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkWFJ0WlM1emRHRjBaUzV6ZEdGMGRYTXVhVzVrWlhoUFppaGNJbEJNUVZsSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCcGMxWmhiR2xrWVhScGJtYzZJR1oxYm1OMGFXOXVLSFpoYkdsa1lYUnBibWNwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQjJZV3hwWkdGMGFXNW5JQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QW1KaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUh4OElIVjBiV1V1YVhOV1lXeHBaR0YwYVc1bktDa3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5OMFlYUmxMbk4wWVhSMWN5QTlJSFpoYkdsa1lYUnBibWNnUHlCY0lsWkJURWxFUVZSSlRrZGNJaUE2SUZ3aVVrVkRUMUpFU1U1SFhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbUp5YjJGa1kyRnpkQ2duVmtGTVNVUkJWRWxQVGw5RFNFRk9SMFZFSnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIVjBiV1V1YzNSaGRHVXVjM1JoZEhWekxtbHVaR1Y0VDJZb1hDSldRVXhKUkVGVVNVNUhYQ0lwSUQwOVBTQXdPMXh1SUNBZ0lIMHNYRzRnSUNBZ2MzUnZjRkpsWTI5eVpHbHVaem9nWm5WdVkzUnBiMjRnS0dsdVptOHBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHVabThnSVQwOUlHWmhiSE5sS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNVMk5sYm1GeWFXOGdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSbGNITTZJSE4wWVhSbExuTjBaWEJ6WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQmZMbVY0ZEdWdVpDaHVaWGRUWTJWdVlYSnBieXdnYVc1bWJ5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doYm1WM1UyTmxibUZ5YVc4dWJtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc1bGQxTmpaVzVoY21sdkxtNWhiV1VnUFNCd2NtOXRjSFFvSjBWdWRHVnlJSE5qWlc1aGNtbHZJRzVoYldVbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHNWxkMU5qWlc1aGNtbHZMbTVoYldVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1elkyVnVZWEpwYjNNdWNIVnphQ2h1WlhkVFkyVnVZWEpwYnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzJGMlpVaGhibVJzWlhKeklDWW1JSE5oZG1WSVlXNWtiR1Z5Y3k1c1pXNW5kR2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J6WVhabFNHRnVaR3hsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5oZG1WSVlXNWtiR1Z5YzF0cFhTaHVaWGRUWTJWdVlYSnBieXdnZFhSdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHRjBkWE1nUFNBblRFOUJSRVZFSnp0Y2JseHVJQ0FnSUNBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblVrVkRUMUpFU1U1SFgxTlVUMUJRUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbEpsWTI5eVpHbHVaeUJUZEc5d2NHVmtYQ0lzSUc1bGQxTmpaVzVoY21sdktUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JHOWhaRk5sZEhScGJtZHpPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6WlhSMGFXNW5jeUE5SUhWMGJXVXVjMlYwZEdsdVozTWdQU0J1WlhjZ1UyVjBkR2x1WjNNb0tUdGNiaUFnSUNBZ0lDQWdhV1lnS0hObGRIUnBibWR6VEc5aFpFaGhibVJzWlhKekxteGxibWQwYUNBK0lEQWdKaVlnSVdkbGRGQmhjbUZ0WlhSbGNrSjVUbUZ0WlNnbmRYUnRaVjl6WTJWdVlYSnBieWNwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRIUnBibWR6VEc5aFpFaGhibVJzWlhKeld6QmRLR1oxYm1OMGFXOXVJQ2h5WlhOd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRIUnBibWR6TG5ObGRFUmxabUYxYkhSektISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU3dnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOdmJIWmxLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxjMjlzZG1Vb0tUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnNiMkZrVTNSaGRHVkdjbTl0VTNSdmNtRm5aVG9nWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnZFhSdFpWTjBZWFJsVTNSeUlEMGdiRzlqWVd4VGRHOXlZV2RsTG1kbGRFbDBaVzBvSjNWMGJXVW5LVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIVjBiV1ZUZEdGMFpWTjBjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVZ1BTQktVMDlPTG5CaGNuTmxLSFYwYldWVGRHRjBaVk4wY2lrN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTQTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMGRYTTZJRndpU1U1SlZFbEJURWxhU1U1SFhDSXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMk5sYm1GeWFXOXpPaUJiWFZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzNSaGRHVTdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lITmhkbVZUZEdGMFpWUnZVM1J2Y21GblpUb2dablZ1WTNScGIyNGdLSFYwYldWVGRHRjBaU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlZOMFlYUmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNiMk5oYkZOMGIzSmhaMlV1YzJWMFNYUmxiU2duZFhSdFpTY3NJRXBUVDA0dWMzUnlhVzVuYVdaNUtIVjBiV1ZUZEdGMFpTa3BPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JHOWpZV3hUZEc5eVlXZGxMbkpsYlc5MlpVbDBaVzBvSjNWMGJXVW5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc1Y2JpQWdJQ0IxYm14dllXUTZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RYUnRaUzV6WVhabFUzUmhkR1ZVYjFOMGIzSmhaMlVvYzNSaGRHVXBPMXh1SUNBZ0lIMWNibjA3WEc1Y2JtWjFibU4wYVc5dUlIUnZaMmRzWlVocFoyaHNhV2RvZENobGJHVXNJSFpoYkhWbEtTQjdYRzRnSUNBZ0pDaGxiR1VwTG5SdloyZHNaVU5zWVhOektDZDFkRzFsTFhabGNtbG1lU2NzSUhaaGJIVmxLVHRjYm4xY2JseHVablZ1WTNScGIyNGdkRzluWjJ4bFVtVmhaSGtvWld4bExDQjJZV3gxWlNrZ2UxeHVJQ0FnSUNRb1pXeGxLUzUwYjJkbmJHVkRiR0Z6Y3lnbmRYUnRaUzF5WldGa2VTY3NJSFpoYkhWbEtUdGNibjFjYmx4dUx5b3FYRzRnS2lCSlppQjViM1VnWTJ4cFkyc2diMjRnWVNCemNHRnVJR2x1SUdFZ2JHRmlaV3dzSUhSb1pTQnpjR0Z1SUhkcGJHd2dZMnhwWTJzc1hHNGdLaUIwYUdWdUlIUm9aU0JpY205M2MyVnlJSGRwYkd3Z1ptbHlaU0IwYUdVZ1kyeHBZMnNnWlhabGJuUWdabTl5SUhSb1pTQnBibkIxZENCamIyNTBZV2x1WldRZ2QybDBhR2x1SUhSb1pTQnpjR0Z1TEZ4dUlDb2dVMjhzSUhkbElHOXViSGtnZDJGdWRDQjBieUIwY21GamF5QjBhR1VnYVc1d2RYUWdZMnhwWTJ0ekxseHVJQ292WEc1bWRXNWpkR2x2YmlCcGMwNXZkRWx1VEdGaVpXeFBjbFpoYkdsa0tHVnNaU2tnZTF4dUlDQWdJSEpsZEhWeWJpQWtLR1ZzWlNrdWNHRnlaVzUwY3lnbmJHRmlaV3duS1M1c1pXNW5kR2dnUFQwZ01DQjhmRnh1SUNBZ0lDQWdJQ0FnSUdWc1pTNXViMlJsVG1GdFpTNTBiMHh2ZDJWeVEyRnpaU2dwSUQwOUlDZHBibkIxZENjN1hHNTlYRzVjYm5aaGNpQjBhVzFsY25NZ1BTQmJYVHRjYmx4dVpuVnVZM1JwYjI0Z2FXNXBkRVYyWlc1MFNHRnVaR3hsY25Nb0tTQjdYRzVjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR1YyWlc1MGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNCa2IyTjFiV1Z1ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0dWMlpXNTBjMXRwWFN3Z0tHWjFibU4wYVc5dUlDaGxkblFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCb1lXNWtiR1Z5SUQwZ1puVnVZM1JwYjI0Z0tHVXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1pTNXBjMVJ5YVdkblpYSXBYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnlianRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG1selVtVmpiM0prYVc1bktDa2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pTNTBZWEpuWlhRdWFHRnpRWFIwY21saWRYUmxJQ1ltWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDRmxMblJoY21kbGRDNW9ZWE5CZEhSeWFXSjFkR1VvSjJSaGRHRXRhV2R1YjNKbEp5a2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0pDaGxMblJoY21kbGRDa3VjR0Z5Wlc1MGN5aGNJbHRrWVhSaExXbG5ibTl5WlYxY0lpa3ViR1Z1WjNSb0lEMDlJREFnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWE5PYjNSSmJreGhZbVZzVDNKV1lXeHBaQ2hsTG5SaGNtZGxkQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2FXUjRJRDBnZFhSdFpTNXpkR0YwWlM1emRHVndjeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR0Z5WjNNZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR3h2WTJGMGIzSTZJSFYwYldVdVkzSmxZWFJsUld4bGJXVnVkRXh2WTJGMGIzSW9aUzUwWVhKblpYUXBYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdkR2x0WlhJN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aUzUzYUdsamFDQjhmQ0JsTG1KMWRIUnZiaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaGNtZHpMbUoxZEhSdmJpQTlJR1V1ZDJocFkyZ2dmSHdnWlM1aWRYUjBiMjQ3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMmRDQTlQU0FuYlc5MWMyVnZkbVZ5SnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWSWFXZG9iR2xuYUhRb1pTNTBZWEpuWlhRc0lIUnlkV1VwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFXMWxjbk11Y0hWemFDaDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVnRaVzUwT2lCbExuUmhjbWRsZEN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwYldWeU9pQnpaWFJVYVcxbGIzVjBLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGIyZG5iR1ZTWldGa2VTaGxMblJoY21kbGRDd2dkSEoxWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHOW5aMnhsU0dsbmFHeHBaMmgwS0dVdWRHRnlaMlYwTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0ExTURBcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFowSUQwOUlDZHRiM1Z6Wlc5MWRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCMGFXMWxjbk11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBhVzFsY25OYmFWMHVaV3hsYldWdWRDQTlQU0JsTG5SaGNtZGxkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOc1pXRnlWR2x0Wlc5MWRDaDBhVzFsY25OYmFWMHVkR2x0WlhJcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBiV1Z5Y3k1emNHeHBZMlVvYVN3Z01TazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHOW5aMnhsU0dsbmFHeHBaMmgwS0dVdWRHRnlaMlYwTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSdloyZHNaVkpsWVdSNUtHVXVkR0Z5WjJWMExDQm1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHVjJkQ0E5UFNBblkyaGhibWRsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmhjbWR6TG5aaGJIVmxJRDBnWlM1MFlYSm5aWFF1ZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtHVjJkQ3dnWVhKbmN5d2dhV1I0S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUgwN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklFaEJRMHNnWm05eUlIUmxjM1JwYm1kY2JpQWdJQ0FnSUNBZ0lDQWdJQ2gxZEcxbExtVjJaVzUwVEdsemRHVnVaWEp6SUQwZ2RYUnRaUzVsZG1WdWRFeHBjM1JsYm1WeWN5QjhmQ0I3ZlNsYlpYWjBYU0E5SUdoaGJtUnNaWEk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2FHRnVaR3hsY2p0Y2JpQWdJQ0FnSUNBZ2ZTa29aWFpsYm5SelcybGRLU3dnZEhKMVpTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RtRnlJRjkwYjE5aGMyTnBhU0E5SUh0Y2JpQWdJQ0FnSUNBZ0p6RTRPQ2M2SUNjME5DY3NYRzRnSUNBZ0lDQWdJQ2N4TURrbk9pQW5ORFVuTEZ4dUlDQWdJQ0FnSUNBbk1Ua3dKem9nSnpRMkp5eGNiaUFnSUNBZ0lDQWdKekU1TVNjNklDYzBOeWNzWEc0Z0lDQWdJQ0FnSUNjeE9USW5PaUFuT1RZbkxGeHVJQ0FnSUNBZ0lDQW5Nakl3SnpvZ0p6a3lKeXhjYmlBZ0lDQWdJQ0FnSnpJeU1pYzZJQ2N6T1Njc1hHNGdJQ0FnSUNBZ0lDY3lNakVuT2lBbk9UTW5MRnh1SUNBZ0lDQWdJQ0FuTWpFNUp6b2dKemt4Snl4Y2JpQWdJQ0FnSUNBZ0p6RTNNeWM2SUNjME5TY3NYRzRnSUNBZ0lDQWdJQ2N4T0Rjbk9pQW5OakVuTENBdkwwbEZJRXRsZVNCamIyUmxjMXh1SUNBZ0lDQWdJQ0FuTVRnMkp6b2dKelU1Snl3Z0x5OUpSU0JMWlhrZ1kyOWtaWE5jYmlBZ0lDQWdJQ0FnSnpFNE9TYzZJQ2MwTlNjZ0x5OUpSU0JMWlhrZ1kyOWtaWE5jYmlBZ0lDQjlPMXh1WEc0Z0lDQWdkbUZ5SUhOb2FXWjBWWEJ6SUQwZ2UxeHVJQ0FnSUNBZ0lDQmNJamsyWENJNklGd2lmbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqUTVYQ0k2SUZ3aUlWd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVd1hDSTZJRndpUUZ3aUxGeHVJQ0FnSUNBZ0lDQmNJalV4WENJNklGd2lJMXdpTEZ4dUlDQWdJQ0FnSUNCY0lqVXlYQ0k2SUZ3aUpGd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVelhDSTZJRndpSlZ3aUxGeHVJQ0FnSUNBZ0lDQmNJalUwWENJNklGd2lYbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqVTFYQ0k2SUZ3aUpsd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVMlhDSTZJRndpS2x3aUxGeHVJQ0FnSUNBZ0lDQmNJalUzWENJNklGd2lLRndpTEZ4dUlDQWdJQ0FnSUNCY0lqUTRYQ0k2SUZ3aUtWd2lMRnh1SUNBZ0lDQWdJQ0JjSWpRMVhDSTZJRndpWDF3aUxGeHVJQ0FnSUNBZ0lDQmNJall4WENJNklGd2lLMXdpTEZ4dUlDQWdJQ0FnSUNCY0lqa3hYQ0k2SUZ3aWUxd2lMRnh1SUNBZ0lDQWdJQ0JjSWprelhDSTZJRndpZlZ3aUxGeHVJQ0FnSUNBZ0lDQmNJamt5WENJNklGd2lmRndpTEZ4dUlDQWdJQ0FnSUNCY0lqVTVYQ0k2SUZ3aU9sd2lMRnh1SUNBZ0lDQWdJQ0JjSWpNNVhDSTZJRndpWEZ4Y0lsd2lMRnh1SUNBZ0lDQWdJQ0JjSWpRMFhDSTZJRndpUEZ3aUxGeHVJQ0FnSUNBZ0lDQmNJalEyWENJNklGd2lQbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqUTNYQ0k2SUZ3aVAxd2lYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHWjFibU4wYVc5dUlHdGxlVkJ5WlhOelNHRnVaR3hsY2lBb1pTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb1pTNXBjMVJ5YVdkblpYSXBYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWFYTlNaV052Y21ScGJtY29LU0FtSmlCbExuUmhjbWRsZEM1b1lYTkJkSFJ5YVdKMWRHVWdKaVlnSVdVdWRHRnlaMlYwTG1oaGMwRjBkSEpwWW5WMFpTZ25aR0YwWVMxcFoyNXZjbVVuS1NBbUppQWtLR1V1ZEdGeVoyVjBLUzV3WVhKbGJuUnpLRndpVzJSaGRHRXRhV2R1YjNKbFhWd2lLUzVzWlc1bmRHZ2dQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHTWdQU0JsTG5kb2FXTm9PMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJVVDBSUE9pQkViMlZ6YmlkMElIZHZjbXNnZDJsMGFDQmpZWEJ6SUd4dlkydGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dmJtOXliV0ZzYVhwbElHdGxlVU52WkdWY2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoZmRHOWZZWE5qYVdrdWFHRnpUM2R1VUhKdmNHVnlkSGtvWXlrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpJRDBnWDNSdlgyRnpZMmxwVzJOZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXVXVjMmhwWm5STFpYa2dKaVlnS0dNZ1BqMGdOalVnSmlZZ1l5QThQU0E1TUNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpJRDBnVTNSeWFXNW5MbVp5YjIxRGFHRnlRMjlrWlNoaklDc2dNeklwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hsTG5Ob2FXWjBTMlY1SUNZbUlITm9hV1owVlhCekxtaGhjMDkzYmxCeWIzQmxjblI1S0dNcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdMeTluWlhRZ2MyaHBablJsWkNCclpYbERiMlJsSUhaaGJIVmxYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZeUE5SUhOb2FXWjBWWEJ6VzJOZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqSUQwZ1UzUnlhVzVuTG1aeWIyMURhR0Z5UTI5a1pTaGpLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtDZHJaWGx3Y21WemN5Y3NJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYjJOaGRHOXlPaUIxZEcxbExtTnlaV0YwWlVWc1pXMWxiblJNYjJOaGRHOXlLR1V1ZEdGeVoyVjBLU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JyWlhrNklHTXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjSEpsZGxaaGJIVmxPaUJsTG5SaGNtZGxkQzUyWVd4MVpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZV3gxWlRvZ1pTNTBZWEpuWlhRdWRtRnNkV1VnS3lCakxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHdGxlVU52WkdVNklHVXVhMlY1UTI5a1pWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCa2IyTjFiV1Z1ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkclpYbHdjbVZ6Y3ljc0lHdGxlVkJ5WlhOelNHRnVaR3hsY2l3Z2RISjFaU2s3WEc1Y2JpQWdJQ0F2THlCSVFVTkxJR1p2Y2lCMFpYTjBhVzVuWEc0Z0lDQWdLSFYwYldVdVpYWmxiblJNYVhOMFpXNWxjbk1nUFNCMWRHMWxMbVYyWlc1MFRHbHpkR1Z1WlhKeklIeDhJSHQ5S1ZzbmEyVjVjSEpsYzNNblhTQTlJR3RsZVZCeVpYTnpTR0Z1Wkd4bGNqdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVR0Z5WVcxbGRHVnlRbmxPWVcxbEtHNWhiV1VwSUh0Y2JpQWdJQ0J1WVcxbElEMGdibUZ0WlM1eVpYQnNZV05sS0M5YlhGeGJYUzhzSUZ3aVhGeGNYRnRjSWlrdWNtVndiR0ZqWlNndlcxeGNYVjB2TENCY0lseGNYRnhkWENJcE8xeHVJQ0FnSUhaaGNpQnlaV2RsZUNBOUlHNWxkeUJTWldkRmVIQW9YQ0piWEZ4Y1hEOG1YVndpSUNzZ2JtRnRaU0FySUZ3aVBTaGJYaVlqWFNvcFhDSXBMRnh1SUNBZ0lDQWdJQ0J5WlhOMWJIUnpJRDBnY21WblpYZ3VaWGhsWXloc2IyTmhkR2x2Ymk1elpXRnlZMmdwTzF4dUlDQWdJSEpsZEhWeWJpQnlaWE4xYkhSeklEMDlQU0J1ZFd4c0lEOGdYQ0pjSWlBNklHUmxZMjlrWlZWU1NVTnZiWEJ2Ym1WdWRDaHlaWE4xYkhSeld6RmRMbkpsY0d4aFkyVW9MMXhjS3k5bkxDQmNJaUJjSWlrcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCaWIyOTBjM1J5WVhCVmRHMWxLQ2tnZTF4dUlDQnBaaUFvWkc5amRXMWxiblF1Y21WaFpIbFRkR0YwWlNBOVBTQmNJbU52YlhCc1pYUmxYQ0lwSUh0Y2JpQWdJQ0IxZEcxbExtbHVhWFFvS1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JseHVJQ0FnSUNBZ0lDQnBibWwwUlhabGJuUklZVzVrYkdWeWN5Z3BPMXh1WEc0Z0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG1selVtVmpiM0prYVc1bktDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21WbmFYTjBaWEpGZG1WdWRDaGNJbXh2WVdSY0lpd2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J3Y205MGIyTnZiRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbkJ5YjNSdlkyOXNMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCb2IzTjBPaUIzYVc1a2IzY3ViRzlqWVhScGIyNHVhRzl6ZEN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlZoY21Ob09pQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWMyVmhjbU5vTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm9ZWE5vT2lCM2FXNWtiM2N1Ykc5allYUnBiMjR1YUdGemFGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzRnSUgxY2JuMWNibHh1WW05dmRITjBjbUZ3VlhSdFpTZ3BPMXh1Wkc5amRXMWxiblF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduY21WaFpIbHpkR0YwWldOb1lXNW5aU2NzSUdKdmIzUnpkSEpoY0ZWMGJXVXBPMXh1WEc1M2FXNWtiM2N1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduZFc1c2IyRmtKeXdnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUhWMGJXVXVkVzVzYjJGa0tDazdYRzU5TENCMGNuVmxLVHRjYmx4dWQybHVaRzkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJWeWNtOXlKeXdnWm5WdVkzUnBiMjRnS0dWeWNpa2dlMXh1SUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUyTnlhWEIwSUVWeWNtOXlPaUJjSWlBcklHVnljaTV0WlhOellXZGxJQ3NnWENJNlhDSWdLeUJsY25JdWRYSnNJQ3NnWENJc1hDSWdLeUJsY25JdWJHbHVaU0FySUZ3aU9sd2lJQ3NnWlhKeUxtTnZiQ2s3WEc1OUtUdGNibHh1Ylc5a2RXeGxMbVY0Y0c5eWRITWdQU0IxZEcxbE8xeHVJbDE5Il19
