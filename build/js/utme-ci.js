(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"_process":3}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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
process.versions = {};

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

},{}],4:[function(require,module,exports){
"use strict";
var utme = require('../utme');
var saveAs = require('filesaver.js');
module.exports = utme.registerSaveHandler(function(scenario) {
  var blob = new Blob([JSON.stringify(scenario, null, " ")], {type: "text/plain;charset=utf-8"});
  saveAs(blob, scenario.name + ".json");
});


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/persisters/utme-file-persister.js
},{"../utme":10,"filesaver.js":2}],5:[function(require,module,exports){
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
    if (utme.state.settings.get("consoleLogging")) {
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
    if (utme.state.settings.get("consoleLogging")) {
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
    if (utme.state.settings.get("consoleLogging")) {
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
      type: "GET",
      contentType: "",
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


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/reporters/server-reporter.js
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


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/selectorFinder.js
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


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/settings.js
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


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/simulate.js
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
      newArray[key] = callback.call(thisArg, obj[key], key, obj);
      key++;
    }
    return newArray;
  }
};


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/utils.js
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
function getConditions(scenario, conditionType) {
  var setup = scenario[conditionType];
  var scenarios = setup && setup.scenarios;
  if (scenarios) {
    return Promise.all(_.map(scenarios, function(scenarioName) {
      return getScenario(scenarioName).then(function(otherScenario) {
        otherScenario = JSON.parse(JSON.stringify(otherScenario));
        return setupConditions(otherScenario).then(function() {
          var toReturn = [];
          for (var i = 0; i < otherScenario.steps.length; i++) {
            toReturn.push(otherScenario.steps[i]);
          }
          return toReturn;
        });
      });
    }));
  } else {
    return Promise.resolve([]);
  }
}
function getPreconditions(scenario) {
  return getConditions(scenario, 'setup');
}
function getPostconditions(scenario) {
  return getConditions(scenario, 'cleanup');
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
      if (utme.state.settings.get("verbose")) {
        console.log((location.protocol + location.host + location.search));
        console.log((step.data.url.protocol + step.data.url.host + step.data.url.search));
      }
      if (isSameURL) {
        window.location.reload(true);
      }
    } else if (step.eventName == 'timeout') {
      if (state.autoRun) {
        runNextStep(scenario, idx, toSkip, step.data.amount);
      }
    } else {
      var locator = step.data.locator;
      var steps = scenario.steps;
      var uniqueId = getUniqueIdFromStep(step);
      if (typeof toSkip[uniqueId] == 'undefined' && utme.state.settings.get("runner.speed") != 'realtime') {
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
        findElementWithLocator(scenario, step, locator, getTimeout(scenario, idx)).then(function(eles) {
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
            if (typeof step.data.value != "undefined" || typeof step.data.attributes != "undefined") {
              var toApply = step.data.attributes ? step.data.attributes : {"value": step.data.value};
              _.extend(ele, toApply);
              if (supportsInputEvent) {
                Simulate.event(ele, 'input');
              }
              Simulate.event(ele, 'change');
            }
          }
          if (step.eventName == 'keypress') {
            var key = String.fromCharCode(step.data.keyCode);
            Simulate.keydown(ele, key);
            Simulate.keypress(ele, key);
            ele.value = step.data.value;
            Simulate.event(ele, 'change');
            Simulate.keyup(ele, key);
            if (supportsInputEvent) {
              Simulate.event(ele, 'input');
            }
          }
          if (step.eventName == 'validate' && utme.state.settings.get('verbose')) {
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
            if (utme.state.settings.get('verbose')) {
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
  var evt = step.eventName;
  return evt.indexOf("mouse") !== 0 || evt.indexOf("mousedown") === 0 || evt.indexOf("mouseup") === 0;
}
function findElementWithLocator(scenario, step, locator, timeout, textToCheck) {
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
    var speed = utme.state.settings.get("runner.speed");
    var limit = importantStepLength / (speed === 'realtime' ? '1' : speed);
    if (global.angular) {
      waitForAngular('[ng-app]').then(function() {
        if (speed === 'realtime') {
          setTimeout(tryFind, timeout);
        } else if (speed === 'fastest') {
          tryFind();
        } else {
          setTimeout(tryFind, Math.min(timeout * speed, limit));
        }
      });
    } else {
      if (speed === 'realtime') {
        setTimeout(tryFind, timeout);
      } else if (speed === 'fastest') {
        tryFind();
      } else {
        setTimeout(tryFind, Math.min(timeout * speed, limit));
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
function filterExtraLoads(steps) {
  var result = [];
  var seenLoad = false;
  for (var i = 0; i < steps.length; i++) {
    var isLoad = steps[i].eventName === 'load';
    if (!seenLoad || !isLoad) {
      result.push(steps[i]);
      seenLoad = seenLoad || isLoad;
    }
  }
  return result;
}
;
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
var utme = {
  init: function() {
    var scenario = getParameterByName('utme_scenario');
    if (scenario) {
      localStorage.clear();
    }
    state = utme.state = utme.loadStateFromStorage();
    utme.broadcast('INITIALIZED');
    return utme.loadSettings().then(function() {
      if (scenario) {
        setTimeout(function() {
          state.testServer = getParameterByName("utme_test_server");
          state.autoRun = true;
          utme.runScenario(scenario);
        }, 100);
      } else {
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
      setupConditions(scenario).then(function() {
        state.run = {};
        state.autoRun = autoRun === true;
        state.status = "PLAYING";
        scenario.steps = filterExtraLoads(scenario.steps);
        if (utme.state.settings.get("verbose")) {
          utme.reportLog("Starting Scenario '" + name + "'", scenario);
        }
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
    if (utme.state.settings.get("verbose")) {
      utme.reportLog("Stopping Scenario");
    }
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
    var settings = utme.state.settings = utme.state.settings || new Settings({"runner.speed": "10"});
    if (settingsLoadHandlers.length > 0 && !utme.isRecording() && !utme.isPlaying()) {
      return new Promise(function(resolve, reject) {
        settingsLoadHandlers[0](function(resp) {
          settings.setDefaults(resp);
          resolve(settings);
        }, function() {
          resolve(settings);
        });
      });
    } else {
      return Promise.resolve(settings);
    }
  },
  loadStateFromStorage: function() {
    var utmeStateStr = localStorage.getItem('utme');
    if (utmeStateStr) {
      state = JSON.parse(utmeStateStr);
      if (state.settings) {
        var newSettings = new Settings();
        newSettings.settings = state.settings.settings;
        newSettings.settings = state.settings.defaultSettings;
        state.settings = newSettings;
      }
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
function isIgnoredElement(ele) {
  return !ele.hasAttribute || ele.hasAttribute('data-ignore') || $(ele).parents("[data-ignore]").length > 0;
}
function shouldRecordEvent(ele, evt) {
  var setting = utme.state.settings.get("recorder.events." + evt);
  var isSettingTrue = (setting === true || setting === 'true' || typeof setting === 'undefined');
  return utme.isRecording() && isSettingTrue && isNotInLabelOrValid(ele);
}
var timers = [];
function initEventHandlers() {
  for (var i = 0; i < events.length; i++) {
    document.addEventListener(events[i], (function(evt) {
      var handler = function(e) {
        if (e.isTrigger)
          return;
        if (!isIgnoredElement(e.target) && utme.isRecording()) {
          var idx = utme.state.steps.length;
          var args = {locator: utme.createElementLocator(e.target)};
          var timer;
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
          if (shouldRecordEvent(e.target, evt)) {
            if (e.which || e.button) {
              args.button = e.which || e.button;
            }
            if (evt == 'change') {
              args.attributes = {
                "value": e.target.value,
                "checked": e.target.checked,
                "selected": e.target.selected
              };
            }
            utme.registerEvent(evt, args, idx);
          }
        }
      };
      (utme.eventListeners = utme.eventListeners || {})[evt] = handler;
      return handler;
    })(events[i]), true);
  }
  var _to_ascii = {
    '188': '44',
    '189': '45',
    '190': '46',
    '191': '47',
    '192': '96',
    '220': '92',
    '222': '39',
    '221': '93',
    '219': '91',
    '173': '45',
    '187': '61',
    '186': '59'
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
    if (!isIgnoredElement(e.target) && shouldRecordEvent(e.target, "keypress")) {
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

},{"./selectorFinder":6,"./settings":7,"./simulate":8,"./utils":9,"es6-promise":1}]},{},[4,5,6,7,8,9,10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9maWxlc2F2ZXIuanMvRmlsZVNhdmVyLmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvaG9tZS9kYXZpZHRpdHRzd29ydGgvcHJvamVjdHMvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFBQSxBQUFJLEVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUM3QixBQUFJLEVBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxjQUFhLENBQUMsQ0FBQztBQUVwQyxLQUFLLFFBQVEsRUFBSSxDQUFBLElBQUcsb0JBQW9CLEFBQUMsQ0FBQyxTQUFVLFFBQU8sQ0FBRztBQUMzRCxBQUFJLElBQUEsQ0FBQSxJQUFHLEVBQUksSUFBSSxLQUFHLEFBQUMsQ0FBQyxDQUFDLElBQUcsVUFBVSxBQUFDLENBQUMsUUFBTyxDQUFHLEtBQUcsQ0FBRyxJQUFFLENBQUMsQ0FBQyxDQUFHLEVBQUMsSUFBRyxDQUFHLDJCQUF5QixDQUFDLENBQUMsQ0FBQztBQUM5RixPQUFLLEFBQUMsQ0FBQyxJQUFHLENBQUcsQ0FBQSxRQUFPLEtBQUssRUFBSSxRQUFNLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUM7QUFDbXRDOzs7O0FDUHJ0QztBQUFBLEFBQUksRUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFDO0FBRWhDLE9BQVMsV0FBUyxDQUFFLEFBQUMsQ0FBRTtBQUNyQixPQUFPLENBQUEsSUFBRyxNQUFNLEdBQUssQ0FBQSxJQUFHLE1BQU0sV0FBVyxDQUFBLENBQUksQ0FBQSxJQUFHLE1BQU0sV0FBVyxFQUFJLENBQUEsa0JBQWlCLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBQyxDQUFBLEVBQUssdUJBQXFCLENBQUM7QUFDdkk7QUFBQSxBQUVJLEVBQUEsQ0FBQSxjQUFhLEVBQUk7QUFDakIsTUFBSSxDQUFHLFVBQVUsS0FBSSxDQUFHLENBQUEsUUFBTyxDQUFHLENBQUEsSUFBRyxDQUFHO0FBQ3BDLElBQUEsS0FBSyxBQUFDLENBQUM7QUFDTCxTQUFHLENBQUcsT0FBSztBQUNYLFFBQUUsQ0FBRyxDQUFBLFVBQVMsQUFBQyxFQUFDLENBQUEsQ0FBSSxRQUFNO0FBQzFCLFNBQUcsQ0FBRyxFQUFFLElBQUcsQ0FBRyxNQUFJLENBQUU7QUFDcEIsYUFBTyxDQUFHLE9BQUs7QUFBQSxJQUNqQixDQUFDLENBQUM7QUFDRixPQUFJLElBQUcsTUFBTSxTQUFTLElBQUksQUFBQyxDQUFDLGdCQUFlLENBQUMsQ0FBRztBQUM3QyxZQUFNLE1BQU0sQUFBQyxDQUFDLEtBQUksQ0FBQyxDQUFDO0lBQ3RCO0FBQUEsRUFDSjtBQUNBLFFBQU0sQ0FBRyxVQUFVLE9BQU0sQ0FBRyxDQUFBLFFBQU8sQ0FBRyxDQUFBLElBQUcsQ0FBRztBQUN4QyxJQUFBLEtBQUssQUFBQyxDQUFDO0FBQ0wsU0FBRyxDQUFHLE9BQUs7QUFDWCxRQUFFLENBQUcsQ0FBQSxVQUFTLEFBQUMsRUFBQyxDQUFBLENBQUksVUFBUTtBQUM1QixTQUFHLENBQUcsRUFBRSxJQUFHLENBQUcsUUFBTSxDQUFFO0FBQ3RCLGFBQU8sQ0FBRyxPQUFLO0FBQUEsSUFDakIsQ0FBQyxDQUFDO0FBQ0YsT0FBSSxJQUFHLE1BQU0sU0FBUyxJQUFJLEFBQUMsQ0FBQyxnQkFBZSxDQUFDLENBQUc7QUFDN0MsWUFBTSxJQUFJLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztJQUN0QjtBQUFBLEVBQ0o7QUFDQSxJQUFFLENBQUcsVUFBVSxHQUFFLENBQUcsQ0FBQSxRQUFPLENBQUcsQ0FBQSxJQUFHLENBQUc7QUFDaEMsSUFBQSxLQUFLLEFBQUMsQ0FBQztBQUNMLFNBQUcsQ0FBRyxPQUFLO0FBQ1gsUUFBRSxDQUFJLENBQUEsVUFBUyxBQUFDLEVBQUMsQ0FBQSxDQUFJLE1BQUk7QUFDekIsU0FBRyxDQUFHLEVBQUUsSUFBRyxDQUFHLElBQUUsQ0FBRTtBQUNsQixhQUFPLENBQUcsT0FBSztBQUFBLElBQ2pCLENBQUMsQ0FBQztBQUNGLE9BQUksSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsZ0JBQWUsQ0FBQyxDQUFHO0FBQzdDLFlBQU0sSUFBSSxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7SUFDbEI7QUFBQSxFQUNKO0FBRUEsYUFBVyxDQUFHLFVBQVUsSUFBRyxDQUFHLENBQUEsUUFBTyxDQUFHO0FBQ3BDLElBQUEsS0FBSyxBQUFDLENBQUM7QUFDSCxVQUFJLENBQUcsV0FBUztBQUVoQixnQkFBVSxDQUFHLGtDQUFnQztBQUU3QyxnQkFBVSxDQUFHLEtBQUc7QUFFaEIsUUFBRSxDQUFJLENBQUEsVUFBUyxBQUFDLEVBQUMsQ0FBQSxDQUFJLFlBQVUsQ0FBQSxDQUFJLEtBQUc7QUFHdEMsYUFBTyxDQUFHLFFBQU07QUFFaEIsWUFBTSxDQUFHLFVBQVUsSUFBRyxDQUFHO0FBQ3JCLGVBQU8sQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO01BQ2xCO0FBQUEsSUFDSixDQUFDLENBQUM7RUFDTjtBQUVBLGFBQVcsQ0FBRyxVQUFVLFFBQU8sQ0FBRztBQUM5QixJQUFBLEtBQUssQUFBQyxDQUFDO0FBQ0wsU0FBRyxDQUFHLE9BQUs7QUFDWCxRQUFFLENBQUcsQ0FBQSxVQUFTLEFBQUMsRUFBQyxDQUFBLENBQUksV0FBUztBQUM3QixTQUFHLENBQUcsQ0FBQSxJQUFHLFVBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBRyxLQUFHLENBQUcsSUFBRSxDQUFDO0FBQ3hDLGFBQU8sQ0FBRyxPQUFLO0FBQ2YsZ0JBQVUsQ0FBRyxtQkFBaUI7QUFBQSxJQUNoQyxDQUFDLENBQUM7RUFDTjtBQUVBLGFBQVcsQ0FBRyxVQUFVLFFBQU8sQ0FBRyxDQUFBLEtBQUksQ0FBRztBQUNyQyxJQUFBLEtBQUssQUFBQyxDQUFDO0FBQ0gsU0FBRyxDQUFHLE1BQUk7QUFDVixnQkFBVSxDQUFHLEdBQUM7QUFDZCxnQkFBVSxDQUFHLEtBQUc7QUFDaEIsUUFBRSxDQUFJLENBQUEsVUFBUyxBQUFDLEVBQUMsQ0FBQSxDQUFJLFdBQVM7QUFFOUIsYUFBTyxDQUFHLE9BQUs7QUFFZixZQUFNLENBQUcsVUFBVSxJQUFHLENBQUc7QUFDckIsZUFBTyxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUM7TUFDbEI7QUFDQSxVQUFJLENBQUcsVUFBVSxHQUFFLENBQUc7QUFDbEIsWUFBSSxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7TUFDZDtBQUFBLElBQ0osQ0FBQyxDQUFDO0VBQ047QUFBQSxBQUNKLENBQUM7QUFFRCxHQUFHLHNCQUFzQixBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7QUFDMUMsR0FBRyxvQkFBb0IsQUFBQyxDQUFDLGNBQWEsYUFBYSxDQUFDLENBQUM7QUFDckQsR0FBRyxvQkFBb0IsQUFBQyxDQUFDLGNBQWEsYUFBYSxDQUFDLENBQUM7QUFDckQsR0FBRyw0QkFBNEIsQUFBQyxDQUFDLGNBQWEsYUFBYSxDQUFDLENBQUM7QUFFN0QsT0FBUyxtQkFBaUIsQ0FBRSxJQUFHLENBQUc7QUFDOUIsS0FBRyxFQUFJLENBQUEsSUFBRyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsTUFBSSxDQUFDLFFBQVEsQUFBQyxDQUFDLE1BQUssQ0FBRyxNQUFJLENBQUMsQ0FBQztBQUN6RCxBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksSUFBSSxPQUFLLEFBQUMsQ0FBQyxRQUFPLEVBQUksS0FBRyxDQUFBLENBQUksWUFBVSxDQUFDO0FBQ2hELFlBQU0sRUFBSSxDQUFBLEtBQUksS0FBSyxBQUFDLENBQUMsUUFBTyxPQUFPLENBQUMsQ0FBQztBQUN6QyxPQUFPLENBQUEsT0FBTSxJQUFNLEtBQUcsQ0FBQSxDQUFJLEdBQUMsRUFBSSxDQUFBLGtCQUFpQixBQUFDLENBQUMsT0FBTSxDQUFFLENBQUEsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsSUFBRSxDQUFDLENBQUMsQ0FBQztBQUNyRjtBQUFBOzs7O0FDekZBO0FBQUEsT0FBUyxPQUFLLENBQUUsRUFBQyxDQUFHLENBQUEsR0FBRSxDQUFHO0FBQ3ZCLEtBQUksQ0FBQyxFQUFDLENBQUEsRUFBSyxFQUFDLEVBQUMsUUFBUSxDQUFHO0FBQ3RCLFFBQU0sSUFBSSxVQUFRLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBQyxDQUFDO0VBQ3pDO0FBQUEsQUFFQSxTQUFTLGtCQUFnQixDQUFFLE9BQU0sQ0FBRyxDQUFBLFFBQU8sQ0FBRztBQUMxQyxBQUFJLE1BQUEsQ0FBQSxhQUFZLEVBQUksRUFBQSxDQUFDO0FBQ3JCLEFBQUksTUFBQSxDQUFBLEtBQUksRUFBSyxDQUFBLEdBQUUsaUJBQWlCLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztBQUUzQyxRQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLENBQUEsS0FBSSxPQUFPLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUNuQyxTQUFJLEtBQUksQ0FBRSxDQUFBLENBQUMsSUFBTSxRQUFNLENBQUc7QUFDdEIsb0JBQVksRUFBSSxFQUFBLENBQUM7QUFDakIsYUFBSztNQUNUO0FBQUEsSUFDSjtBQUFBLEFBQ0EsU0FBTyxjQUFZLENBQUM7RUFDeEI7QUFBQSxBQUVJLElBQUEsQ0FBQSxVQUFTLEVBQUksQ0FBQSxrQkFBaUIsQUFBQyxDQUFDLEVBQUMsQ0FBQyxTQUFTLENBQUM7QUFDaEQsQUFBSSxJQUFBLENBQUEsZ0JBQWUsRUFBSSxDQUFBLFVBQVMsSUFBTSxDQUFBLEVBQUMsUUFBUSxZQUFZLEFBQUMsRUFBQyxDQUFDO0FBQzlELEFBQUksSUFBQSxDQUFBLGdCQUFlLENBQUM7QUFFcEIsQUFBSSxJQUFBLENBQUEsV0FBVSxFQUFJLEdBQUMsQ0FBQztBQUNwQixRQUFPLFdBQVUsY0FBYyxHQUFLLEtBQUcsQ0FBQSxFQUFLLEVBQUMsZ0JBQWUsQ0FBRztBQUMzRCxjQUFVLEVBQUksQ0FBQSxXQUFVLGNBQWMsQ0FBQztBQUN2QyxBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxrQkFBaUIsQUFBQyxDQUFDLFdBQVUsQ0FBQyxTQUFTLENBQUM7QUFLdkQsT0FBSSxRQUFPLElBQU0sQ0FBQSxXQUFVLFFBQVEsWUFBWSxBQUFDLEVBQUMsQ0FBRztBQUNoRCxxQkFBZSxFQUFJLENBQUEsUUFBTyxFQUFJLEVBQUMsV0FBVSxJQUFNLENBQUEsRUFBQyxjQUFjLENBQUEsRUFBSyxpQkFBZSxDQUFBLENBQUksTUFBSSxFQUFJLElBQUUsQ0FBQyxDQUFBLENBQUksV0FBUyxDQUFDO0lBQ25IO0FBQUEsRUFDSjtBQUFBLEFBRUksSUFBQSxDQUFBLGNBQWEsRUFBSSxHQUFDLENBQUM7QUFDdkIsS0FBSSxnQkFBZSxDQUFHO0FBQ3BCLGlCQUFhLEtBQUssQUFBQyxDQUNqQixnQkFBZSxFQUFJLE9BQUssQ0FBQSxDQUFJLENBQUEsaUJBQWdCLEFBQUMsQ0FBQyxFQUFDLENBQUcsaUJBQWUsQ0FBQyxDQUFBLENBQUksSUFBRSxDQUMxRSxDQUFDO0VBQ0g7QUFBQSxBQUVBLGVBQWEsS0FBSyxBQUFDLENBQUMsVUFBUyxFQUFJLE9BQUssQ0FBQSxDQUFJLENBQUEsaUJBQWdCLEFBQUMsQ0FBQyxFQUFDLENBQUcsV0FBUyxDQUFDLENBQUEsQ0FBSSxJQUFFLENBQUMsQ0FBQztBQUNsRixPQUFPLGVBQWEsQ0FBQztBQUN2QjtBQUFBLEFBQUM7QUFTRCxPQUFTLGNBQVksQ0FBRSxFQUFDLENBQUc7QUFDekIsQUFBSSxJQUFBLENBQUEsU0FBUSxFQUFJLENBQUEsRUFBQyxhQUFhLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztBQUN4QyxVQUFRLEVBQUksQ0FBQSxTQUFRLEdBQUssQ0FBQSxTQUFRLFFBQVEsQUFBQyxDQUFDLGFBQVksQ0FBRyxHQUFDLENBQUMsQ0FBQztBQUM3RCxVQUFRLEVBQUksQ0FBQSxTQUFRLEdBQUssQ0FBQSxTQUFRLFFBQVEsQUFBQyxDQUFDLFlBQVcsQ0FBRyxHQUFDLENBQUMsQ0FBQztBQUU1RCxLQUFJLENBQUMsU0FBUSxDQUFBLEVBQUssRUFBQyxDQUFDLFNBQVEsS0FBSyxBQUFDLEVBQUMsT0FBTyxDQUFDLENBQUc7QUFBRSxTQUFPLEdBQUMsQ0FBQztFQUFFO0FBQUEsQUFHM0QsVUFBUSxFQUFJLENBQUEsU0FBUSxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsSUFBRSxDQUFDLENBQUM7QUFHMUMsVUFBUSxFQUFJLENBQUEsU0FBUSxRQUFRLEFBQUMsQ0FBQyxZQUFXLENBQUcsR0FBQyxDQUFDLENBQUM7QUFHL0MsT0FBTyxDQUFBLFNBQVEsS0FBSyxBQUFDLEVBQUMsTUFBTSxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7QUFDcEM7QUFBQSxBQVVBLE9BQVMsbUJBQWlCLENBQUUsRUFBQyxDQUFHLENBQUEsUUFBTyxDQUFHO0FBQ3hDLEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxHQUFDLENBQUM7QUFDZCxBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksS0FBRyxDQUFDO0FBQ2hCLEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxLQUFHLENBQUM7QUFDaEIsQUFBSSxJQUFBLENBQUEsR0FBRSxFQUFNLEtBQUcsQ0FBQztBQUNoQixBQUFJLElBQUEsQ0FBQSxJQUFHLEVBQUssS0FBRyxDQUFDO0FBQ2hCLEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxLQUFHLENBQUM7QUFDaEIsQUFBSSxJQUFBLENBQUEsRUFBQyxFQUFJLEdBQUMsQ0FBQztBQUtYLEtBQUksRUFBQyxHQUFHLENBQUc7QUFDVCxRQUFJLEVBQUksQ0FBQSxRQUFPLEVBQUksQ0FBQSxFQUFDLEdBQUcsQ0FBQSxDQUFJLE1BQUksQ0FBQztFQUNsQyxLQUFPO0FBRUwsUUFBSSxFQUFRLENBQUEsRUFBQyxRQUFRLFlBQVksQUFBQyxFQUFDLENBQUM7QUFFcEMsQUFBSSxNQUFBLENBQUEsVUFBUyxFQUFJLENBQUEsYUFBWSxBQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7QUFHbEMsT0FBSSxVQUFTLE9BQU8sQ0FBRztBQUNyQixVQUFJLEdBQUssQ0FBQSxHQUFFLEVBQUksQ0FBQSxVQUFTLEtBQUssQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0lBQ3JDO0FBQUEsRUFDRjtBQUFBLEFBR0EsS0FBSSxLQUFJLEVBQUksQ0FBQSxFQUFDLGFBQWEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFHO0FBQ3BDLFFBQUksR0FBSyxDQUFBLFVBQVMsRUFBSSxNQUFJLENBQUEsQ0FBSSxLQUFHLENBQUM7RUFDcEMsS0FBTyxLQUFJLEdBQUUsRUFBSSxDQUFBLEVBQUMsYUFBYSxBQUFDLENBQUMsS0FBSSxDQUFDLENBQUc7QUFDdkMsUUFBSSxHQUFLLENBQUEsUUFBTyxFQUFJLElBQUUsQ0FBQSxDQUFJLEtBQUcsQ0FBQztFQUNoQyxLQUFPLEtBQUksSUFBRyxFQUFJLENBQUEsRUFBQyxhQUFhLEFBQUMsQ0FBQyxNQUFLLENBQUMsQ0FBRztBQUN6QyxRQUFJLEdBQUssQ0FBQSxTQUFRLEVBQUksS0FBRyxDQUFBLENBQUksS0FBRyxDQUFDO0VBQ2xDO0FBQUEsQUFFQSxLQUFJLEtBQUksRUFBSSxDQUFBLEVBQUMsYUFBYSxBQUFDLENBQUMsT0FBTSxDQUFDLENBQUc7QUFDcEMsUUFBSSxHQUFLLENBQUEsVUFBUyxFQUFJLE1BQUksQ0FBQSxDQUFJLEtBQUcsQ0FBQztFQUNwQztBQUFBLEFBTUEsTUFBSSxRQUFRLEFBQUMsQ0FBQztBQUNaLFVBQU0sQ0FBRyxHQUFDO0FBQ1YsV0FBTyxDQUFHLE1BQUk7QUFBQSxFQUNoQixDQUFDLENBQUM7QUFTRixLQUFJLENBQUMsS0FBSSxPQUFPLENBQUc7QUFDakIsUUFBTSxJQUFJLE1BQUksQUFBQyxDQUFDLGlDQUFnQyxDQUFDLENBQUM7RUFDcEQ7QUFBQSxBQUNBLE9BQU8sQ0FBQSxLQUFJLENBQUUsQ0FBQSxDQUFDLENBQUM7QUFDakI7QUFBQSxBQUVBLEtBQUssUUFBUSxFQUFJLE9BQUssQ0FBQztBQUU4d1Q7Ozs7QUN2SnJ5VDtBQUFBLEFBQUksRUFBQSxDQUFBLENBQUEsRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFDO0FBQzFCLEFBQUksRUFBQSxDQUFBLGlCQUFnQixFQUFJLGdCQUFjLENBQUM7QUFFdkMsT0FBUyxTQUFPLENBQUcsZUFBYyxDQUFHO0FBQ2hDLEtBQUcsWUFBWSxBQUFDLENBQUMsZUFBYyxHQUFLLEdBQUMsQ0FBQyxDQUFDO0FBQzNDO0FBQUEsQUFFQSxPQUFPLFVBQVUsRUFBSTtBQUNqQiw2QkFBMkIsQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUN0QyxBQUFJLE1BQUEsQ0FBQSxjQUFhLEVBQUksQ0FBQSxZQUFXLFFBQVEsQUFBQyxDQUFDLGlCQUFnQixDQUFDLENBQUM7QUFDNUQsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLEdBQUMsQ0FBQztBQUNqQixPQUFJLGNBQWEsQ0FBRztBQUNoQixhQUFPLEVBQUksQ0FBQSxJQUFHLE1BQU0sQUFBQyxDQUFDLGNBQWEsQ0FBQyxDQUFDO0lBQ3pDO0FBQUEsQUFDQSxTQUFPLFNBQU8sQ0FBQztFQUNuQjtBQUVBLFlBQVUsQ0FBRyxVQUFVLGVBQWMsQ0FBRztBQUNwQyxBQUFJLE1BQUEsQ0FBQSxhQUFZLEVBQUksQ0FBQSxJQUFHLDZCQUE2QixBQUFDLEVBQUMsQ0FBQztBQUN2RCxBQUFJLE1BQUEsQ0FBQSxZQUFXLEVBQUksQ0FBQSxDQUFBLE9BQU8sQUFBQyxDQUFDLEVBQUMsQ0FBRyxDQUFBLGVBQWMsR0FBSyxHQUFDLENBQUMsQ0FBQztBQUN0RCxPQUFHLFNBQVMsRUFBSSxDQUFBLENBQUEsT0FBTyxBQUFDLENBQUMsRUFBQyxDQUFHLENBQUEsQ0FBQSxPQUFPLEFBQUMsQ0FBQyxZQUFXLENBQUcsY0FBWSxDQUFDLENBQUMsQ0FBQztBQUNuRSxPQUFHLGdCQUFnQixFQUFJLGdCQUFjLENBQUM7RUFDMUM7QUFFQSxJQUFFLENBQUcsVUFBVSxHQUFFLENBQUcsQ0FBQSxLQUFJLENBQUc7QUFDdkIsT0FBRyxTQUFTLENBQUUsR0FBRSxDQUFDLEVBQUksTUFBSSxDQUFDO0FBQzFCLE9BQUcsS0FBSyxBQUFDLEVBQUMsQ0FBQztFQUNmO0FBRUEsSUFBRSxDQUFHLFVBQVUsR0FBRSxDQUFHO0FBQ2hCLFNBQU8sQ0FBQSxJQUFHLFNBQVMsQ0FBRSxHQUFFLENBQUMsQ0FBQztFQUM3QjtBQUVBLEtBQUcsQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUNkLGVBQVcsUUFBUSxBQUFDLENBQUMsaUJBQWdCLENBQUcsQ0FBQSxJQUFHLFVBQVUsQUFBQyxDQUFDLElBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQztFQUMxRTtBQUVBLGNBQVksQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUN2QixBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxJQUFHLGdCQUFnQixDQUFDO0FBQ25DLE9BQUksUUFBTyxDQUFHO0FBQ1YsU0FBRyxTQUFTLEVBQUksQ0FBQSxDQUFBLE9BQU8sQUFBQyxDQUFDLEVBQUMsQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUN0QyxTQUFHLEtBQUssQUFBQyxFQUFDLENBQUM7SUFDZjtBQUFBLEVBQ0o7QUFBQSxBQUNKLENBQUM7QUFFRCxLQUFLLFFBQVEsRUFBSSxTQUFPLENBQUM7QUFFb3NIOzs7O0FDaEQ3dEg7QUFBQSxBQUFJLEVBQUEsQ0FBQSxDQUFBLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUUxQixBQUFJLEVBQUEsQ0FBQSxRQUFPLEVBQUk7QUFDWCxNQUFJLENBQUcsVUFBUyxPQUFNLENBQUcsQ0FBQSxTQUFRLENBQUcsQ0FBQSxPQUFNLENBQUU7QUFDeEMsQUFBSSxNQUFBLENBQUEsR0FBRSxDQUFDO0FBQ1AsT0FBSSxRQUFPLFlBQVksQ0FBRztBQUN0QixRQUFFLEVBQUksQ0FBQSxRQUFPLFlBQVksQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFDO0FBQ3hDLFFBQUUsVUFBVSxBQUFDLENBQUMsU0FBUSxDQUFHLENBQUEsU0FBUSxHQUFLLGFBQVcsQ0FBQSxFQUFLLENBQUEsU0FBUSxHQUFLLGFBQVcsQ0FBRyxLQUFHLENBQUUsQ0FBQztBQUN2RixNQUFBLE9BQU8sQUFBQyxDQUFDLEdBQUUsQ0FBRyxRQUFNLENBQUMsQ0FBQztBQUN0QixZQUFNLGNBQWMsQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0lBQzlCLEtBQUs7QUFDRCxRQUFFLEVBQUksQ0FBQSxRQUFPLGtCQUFrQixBQUFDLEVBQUMsQ0FBQztBQUNsQyxZQUFNLFVBQVUsQUFBQyxDQUFDLElBQUcsRUFBSSxVQUFRLENBQUUsSUFBRSxDQUFDLENBQUM7SUFDM0M7QUFBQSxFQUNKO0FBQ0EsU0FBTyxDQUFHLFVBQVMsT0FBTSxDQUFHLENBQUEsSUFBRyxDQUFHLENBQUEsT0FBTSxDQUFFO0FBQ3RDLEFBQUksTUFBQSxDQUFBLEdBQUU7QUFDRixRQUFBLEVBQUk7QUFDQSxnQkFBTSxDQUFHLEtBQUc7QUFBRyxtQkFBUyxDQUFHLEtBQUc7QUFBRyxhQUFHLENBQUcsT0FBSztBQUM1QyxnQkFBTSxDQUFHLE1BQUk7QUFBRyxlQUFLLENBQUcsTUFBSTtBQUFHLGlCQUFPLENBQUcsTUFBSTtBQUFHLGdCQUFNLENBQUcsTUFBSTtBQUM3RCxnQkFBTSxDQUFHLEVBQUE7QUFBRyxpQkFBTyxDQUFHLEVBQUE7QUFBQSxRQUMxQixDQUFDO0FBQ0wsSUFBQSxPQUFPLEFBQUMsQ0FBQyxDQUFBLENBQUcsUUFBTSxDQUFDLENBQUM7QUFDcEIsT0FBSSxRQUFPLFlBQVksQ0FBRTtBQUNyQixRQUFHO0FBQ0MsVUFBRSxFQUFJLENBQUEsUUFBTyxZQUFZLEFBQUMsQ0FBQyxXQUFVLENBQUMsQ0FBQztBQUN2QyxVQUFFLGFBQWEsQUFBQyxDQUNaLElBQUcsQ0FBRyxDQUFBLENBQUEsUUFBUSxDQUFHLENBQUEsQ0FBQSxXQUFXLENBQUcsQ0FBQSxDQUFBLEtBQUssQ0FDNUMsQ0FBQSxDQUFBLFFBQVEsQ0FBRyxDQUFBLENBQUEsT0FBTyxDQUFHLENBQUEsQ0FBQSxTQUFTLENBQUcsQ0FBQSxDQUFBLFFBQVEsQ0FDekMsQ0FBQSxDQUFBLFFBQVEsQ0FBRyxDQUFBLENBQUEsU0FBUyxDQUFDLENBQUM7QUFDeEIsY0FBTSxjQUFjLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQztNQUM1QixDQUFDLE9BQU0sR0FBRSxDQUFFO0FBQ1AsVUFBRSxFQUFJLENBQUEsUUFBTyxZQUFZLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztBQUN4QyxVQUFFLFVBQVUsQUFBQyxDQUFDLElBQUcsQ0FBRyxDQUFBLENBQUEsUUFBUSxDQUFHLENBQUEsQ0FBQSxXQUFXLENBQUMsQ0FBQztBQUM1QyxRQUFBLE9BQU8sQUFBQyxDQUFDLEdBQUUsQ0FBRztBQUNWLGFBQUcsQ0FBRyxDQUFBLENBQUEsS0FBSztBQUNiLGdCQUFNLENBQUcsQ0FBQSxDQUFBLFFBQVE7QUFBRyxlQUFLLENBQUcsQ0FBQSxDQUFBLE9BQU87QUFDbkMsaUJBQU8sQ0FBRyxDQUFBLENBQUEsU0FBUztBQUFHLGdCQUFNLENBQUcsQ0FBQSxDQUFBLFFBQVE7QUFDdkMsZ0JBQU0sQ0FBRyxDQUFBLENBQUEsUUFBUTtBQUFHLGlCQUFPLENBQUcsQ0FBQSxDQUFBLFNBQVM7QUFBQSxRQUN6QyxDQUFDLENBQUM7QUFDRixjQUFNLGNBQWMsQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO01BQzFCO0FBQUEsSUFDQTtBQUFBLEVBQ0o7QUFBQSxBQUNKLENBQUM7QUFFRCxPQUFPLFNBQVMsRUFBSSxVQUFTLE9BQU0sQ0FBRyxDQUFBLEdBQUUsQ0FBRTtBQUN0QyxBQUFJLElBQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxHQUFFLFdBQVcsQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ2hDLEtBQUcsU0FBUyxBQUFDLENBQUMsT0FBTSxDQUFHLFdBQVMsQ0FBRztBQUMvQixVQUFNLENBQUcsU0FBTztBQUNoQixXQUFPLENBQUcsU0FBTztBQUFBLEVBQ3JCLENBQUMsQ0FBQztBQUNOLENBQUM7QUFFRCxPQUFPLFFBQVEsRUFBSSxVQUFTLE9BQU0sQ0FBRyxDQUFBLEdBQUUsQ0FBRTtBQUNyQyxBQUFJLElBQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxHQUFFLFdBQVcsQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ2hDLEtBQUcsU0FBUyxBQUFDLENBQUMsT0FBTSxDQUFHLFVBQVEsQ0FBRztBQUM5QixVQUFNLENBQUcsU0FBTztBQUNoQixXQUFPLENBQUcsU0FBTztBQUFBLEVBQ3JCLENBQUMsQ0FBQztBQUNOLENBQUM7QUFFRCxPQUFPLE1BQU0sRUFBSSxVQUFTLE9BQU0sQ0FBRyxDQUFBLEdBQUUsQ0FBRTtBQUNuQyxBQUFJLElBQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxHQUFFLFdBQVcsQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ2hDLEtBQUcsU0FBUyxBQUFDLENBQUMsT0FBTSxDQUFHLFFBQU0sQ0FBRztBQUM1QixVQUFNLENBQUcsU0FBTztBQUNoQixXQUFPLENBQUcsU0FBTztBQUFBLEVBQ3JCLENBQUMsQ0FBQztBQUNOLENBQUM7QUFFRCxBQUFJLEVBQUEsQ0FBQSxNQUFLLEVBQUksRUFDVCxPQUFNLENBQ04sUUFBTSxDQUNOLE9BQUssQ0FDTCxXQUFTLENBQ1QsUUFBTSxDQUNOLFNBQU8sQ0FDUCxZQUFVLENBQ1YsWUFBVSxDQUNWLFdBQVMsQ0FDVCxZQUFVLENBQ1YsVUFBUSxDQUNSLGFBQVcsQ0FDWCxhQUFXLENBQ1gsU0FBTyxDQUNQLFNBQU8sQ0FDUCxTQUFPLENBQ1AsU0FBTyxDQUNQLE9BQUssQ0FDTCxTQUFPLENBQ1gsQ0FBQztBQUVELElBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxDQUFBLE1BQUssT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLEdBQUc7QUFDN0IsQUFBSSxJQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsTUFBSyxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ3JCLFNBQU8sQ0FBRSxLQUFJLENBQUMsRUFBSSxFQUFDLFNBQVMsR0FBRSxDQUFFO0FBQzVCLFNBQU8sVUFBUyxPQUFNLENBQUcsQ0FBQSxPQUFNLENBQUU7QUFDN0IsU0FBRyxNQUFNLEFBQUMsQ0FBQyxPQUFNLENBQUcsSUFBRSxDQUFHLFFBQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7RUFDTCxBQUFDLENBQUMsS0FBSSxDQUFDLENBQUMsQ0FBQztBQUNiO0FBQUEsQUFFQSxLQUFLLFFBQVEsRUFBSSxTQUFPLENBQUM7QUFDZ3RQOzs7O0FDOUZ6dVA7QUFBQSxBQUFDLFNBQVEsQUFBQyxDQUFFO0FBRVIsQUFBSSxJQUFBLENBQUEsRUFBQyxFQUFJLENBQUEsS0FBSSxVQUFVLENBQUM7QUFDeEIsQUFBSSxJQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsRUFBQyxNQUFNLENBQUM7QUFDcEIsQUFBSSxJQUFBLENBQUEsRUFBQyxFQUFJLENBQUEsUUFBTyxVQUFVLENBQUM7QUFFM0IsS0FBSSxDQUFDLEVBQUMsS0FBSyxDQUFHO0FBR1osS0FBQyxLQUFLLEVBQUksVUFBUyxPQUFNLENBQUc7QUFDMUIsQUFBSSxRQUFBLENBQUEsSUFBRyxFQUFJLEtBQUcsQ0FBQztBQUNmLEFBQUksUUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLEtBQUksS0FBSyxBQUFDLENBQUMsU0FBUSxDQUFHLEVBQUEsQ0FBQyxDQUFDO0FBRW5DLGFBQVMsTUFBSSxDQUFDLEFBQUMsQ0FBRTtBQUNmLEFBQUksVUFBQSxDQUFBLG9CQUFtQixFQUFJLENBQUEsSUFBRyxVQUFVLEdBQUssRUFBQyxJQUFHLFdBQWEsS0FBRyxDQUFDLENBQUM7QUFDbkUsYUFBTyxDQUFBLElBQUcsTUFBTSxBQUFDLENBS2YsQ0FBQyxvQkFBbUIsQ0FBQSxFQUFLLFFBQU0sQ0FBQSxFQUFLLEtBQUcsQ0FDdkMsQ0FBQSxJQUFHLE9BQU8sQUFBQyxDQUFDLEtBQUksS0FBSyxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUMsQ0FDbkMsQ0FBQztNQUNIO0FBQUEsQUFLQSxVQUFJLFVBQVUsRUFBSSxDQUFBLElBQUcsVUFBVSxDQUFDO0FBRWhDLFdBQU8sTUFBSSxDQUFDO0lBQ2QsQ0FBQztFQUNIO0FBQUEsQUFFSixDQUFDLEFBQUMsRUFBQyxDQUFDO0FBRUosS0FBSyxRQUFRLEVBQUk7QUFFYixPQUFLLENBQUcsU0FBUyxPQUFLLENBQUUsR0FBRSxDQUFHLENBQUEsR0FBRSxDQUFFO0FBQzdCLE9BQUksR0FBRSxDQUFHO0FBQ0wsVUFBUyxHQUFBLENBQUEsR0FBRSxDQUFBLEVBQUssSUFBRSxDQUFHO0FBQ2pCLFdBQUksR0FBRSxlQUFlLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBRztBQUN6QixZQUFFLENBQUUsR0FBRSxDQUFDLEVBQUksQ0FBQSxHQUFFLENBQUUsR0FBRSxDQUFDLENBQUM7UUFDdkI7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEFBQ0EsU0FBTyxJQUFFLENBQUM7RUFDZDtBQUVBLElBQUUsQ0FBRyxVQUFTLEdBQUUsQ0FBRyxDQUFBLFFBQU8sQ0FBRyxDQUFBLE9BQU0sQ0FBRztBQUNsQyxBQUFJLE1BQUEsQ0FBQSxHQUFFLEVBQUksQ0FBQSxHQUFFLE9BQU8sSUFBTSxFQUFBLENBQUM7QUFDMUIsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLElBQUksTUFBSSxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7QUFDN0IsQUFBSSxNQUFBLENBQUEsR0FBRSxFQUFJLEVBQUEsQ0FBQztBQUNYLE9BQUksQ0FBQyxPQUFNLENBQUc7QUFDVixZQUFNLEVBQUksSUFBRSxDQUFDO0lBQ2pCO0FBQUEsQUFDQSxVQUFPLEdBQUUsRUFBSSxJQUFFLENBQUc7QUFDZCxhQUFPLENBQUUsR0FBRSxDQUFDLEVBQUksQ0FBQSxRQUFPLEtBQUssQUFBQyxDQUFDLE9BQU0sQ0FBRyxDQUFBLEdBQUUsQ0FBRSxHQUFFLENBQUMsQ0FBRyxJQUFFLENBQUcsSUFBRSxDQUFDLENBQUM7QUFDMUQsUUFBRSxFQUFFLENBQUM7SUFDVDtBQUFBLEFBQ0EsU0FBTyxTQUFPLENBQUM7RUFDbkI7QUFBQSxBQUVKLENBQUM7QUFFd2dLOzs7OztBQ3pFemdLO0FBQUEsQUFBSSxFQUFBLENBQUEsQ0FBQSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUM7QUFDMUIsQUFBSSxFQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsYUFBWSxDQUFDLFFBQVEsQ0FBQztBQUM1QyxBQUFJLEVBQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxZQUFXLENBQUMsQ0FBQztBQUNwQyxBQUFJLEVBQUEsQ0FBQSxjQUFhLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBQyxDQUFDO0FBQ2hELEFBQUksRUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFDO0FBR3BDLEFBQUksRUFBQSxDQUFBLG1CQUFrQixFQUFJLElBQUUsQ0FBQztBQUM3QixBQUFJLEVBQUEsQ0FBQSxZQUFXLEVBQUksR0FBQyxDQUFDO0FBQ3JCLEFBQUksRUFBQSxDQUFBLGNBQWEsRUFBSSxHQUFDLENBQUM7QUFDdkIsQUFBSSxFQUFBLENBQUEsWUFBVyxFQUFJLEdBQUMsQ0FBQztBQUNyQixBQUFJLEVBQUEsQ0FBQSxvQkFBbUIsRUFBSSxHQUFDLENBQUM7QUFFN0IsT0FBUyxZQUFVLENBQUUsSUFBRyxDQUFHO0FBQ3ZCLE9BQU8sSUFBSSxRQUFNLEFBQUMsQ0FBQyxTQUFVLE9BQU0sQ0FBRyxDQUFBLE1BQUssQ0FBRztBQUMxQyxPQUFJLFlBQVcsT0FBTyxJQUFNLEVBQUEsQ0FBRztBQUMzQixBQUFJLFFBQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxJQUFHLE1BQU0sQ0FBQztBQUN0QixVQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLENBQUEsS0FBSSxVQUFVLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQzdDLFdBQUksS0FBSSxVQUFVLENBQUUsQ0FBQSxDQUFDLEtBQUssSUFBTSxLQUFHLENBQUc7QUFDbEMsZ0JBQU0sQUFBQyxDQUFDLEtBQUksVUFBVSxDQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7UUFDL0I7QUFBQSxNQUNKO0FBQUEsSUFDSixLQUFPO0FBQ0gsaUJBQVcsQ0FBRSxDQUFBLENBQUMsQUFBQyxDQUFDLElBQUcsQ0FBRyxVQUFVLElBQUcsQ0FBRztBQUNsQyxjQUFNLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQztNQUNqQixDQUFDLENBQUM7SUFDTjtBQUFBLEVBQ0osQ0FBQyxDQUFDO0FBQ047QUFBQSxBQUNJLEVBQUEsQ0FBQSxVQUFTLEVBQUksTUFBSSxDQUFDO0FBRXRCLEFBQUksRUFBQSxDQUFBLE1BQUssRUFBSSxFQUNULE9BQU0sQ0FDTixRQUFNLENBQ04sT0FBSyxDQUNMLFdBQVMsQ0FPVCxZQUFVLENBRVYsYUFBVyxDQUNYLGFBQVcsQ0FDWCxXQUFTLENBQ1QsWUFBVSxDQUNWLFVBQVEsQ0FDUixTQUFPLENBR1gsQ0FBQztBQUVELE9BQVMsY0FBWSxDQUFFLFFBQU8sQ0FBRyxDQUFBLGFBQVksQ0FBRztBQUM5QyxBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxRQUFPLENBQUUsYUFBWSxDQUFDLENBQUM7QUFDbkMsQUFBSSxJQUFBLENBQUEsU0FBUSxFQUFJLENBQUEsS0FBSSxHQUFLLENBQUEsS0FBSSxVQUFVLENBQUM7QUFFeEMsS0FBSSxTQUFRLENBQUc7QUFDYixTQUFPLENBQUEsT0FBTSxJQUFJLEFBQUMsQ0FBQyxDQUFBLElBQUksQUFBQyxDQUFDLFNBQVEsQ0FBRyxVQUFVLFlBQVcsQ0FBRztBQUMxRCxXQUFPLENBQUEsV0FBVSxBQUFDLENBQUMsWUFBVyxDQUFDLEtBQUssQUFBQyxDQUFDLFNBQVUsYUFBWSxDQUFHO0FBQzdELG9CQUFZLEVBQUksQ0FBQSxJQUFHLE1BQU0sQUFBQyxDQUFDLElBQUcsVUFBVSxBQUFDLENBQUMsYUFBWSxDQUFDLENBQUMsQ0FBQztBQUN6RCxhQUFPLENBQUEsZUFBYyxBQUFDLENBQUMsYUFBWSxDQUFDLEtBQUssQUFBQyxDQUFDLFNBQVMsQUFBQyxDQUFFO0FBQ3JELEFBQUksWUFBQSxDQUFBLFFBQU8sRUFBSSxHQUFDLENBQUM7QUFDakIsY0FBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLGFBQVksTUFBTSxPQUFPLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUNuRCxtQkFBTyxLQUFLLEFBQUMsQ0FBQyxhQUFZLE1BQU0sQ0FBRSxDQUFBLENBQUMsQ0FBQyxDQUFDO1VBQ3ZDO0FBQUEsQUFDQSxlQUFPLFNBQU8sQ0FBQztRQUNqQixDQUFDLENBQUM7TUFDSixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztFQUNMLEtBQU87QUFDTCxTQUFPLENBQUEsT0FBTSxRQUFRLEFBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztFQUM1QjtBQUFBLEFBQ0Y7QUFBQSxBQUVBLE9BQVMsaUJBQWUsQ0FBRyxRQUFPLENBQUc7QUFDbkMsT0FBTyxDQUFBLGFBQVksQUFBQyxDQUFDLFFBQU8sQ0FBRyxRQUFNLENBQUMsQ0FBQztBQUN6QztBQUFBLEFBRUEsT0FBUyxrQkFBZ0IsQ0FBRyxRQUFPLENBQUc7QUFDcEMsT0FBTyxDQUFBLGFBQVksQUFBQyxDQUFDLFFBQU8sQ0FBRyxVQUFRLENBQUMsQ0FBQztBQUMzQztBQUFBLEFBRUEsT0FBUyx5QkFBdUIsQ0FBRSxLQUFJLENBQUc7QUFDckMsQUFBSSxJQUFBLENBQUEsUUFBTyxFQUFJLEdBQUMsQ0FBQztBQUNqQixBQUFJLElBQUEsQ0FBQSxnQkFBZSxDQUFDO0FBQ3BCLE1BQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxLQUFJLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQ25DLEFBQUksTUFBQSxDQUFBLFNBQVEsRUFBSSxDQUFBLEtBQUksQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUN4QixPQUFJLENBQUEsRUFBSSxFQUFBLENBQUc7QUFDUCxVQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLENBQUEsS0FBSSxPQUFPLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUNuQyxBQUFJLFVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxTQUFRLENBQUUsQ0FBQSxDQUFDLENBQUM7QUFDdkIsQUFBSSxVQUFBLENBQUEsSUFBRyxFQUFJLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBQSxDQUFJLENBQUEsSUFBRyxVQUFVLEVBQUksQ0FBQSxTQUFRLENBQUUsQ0FBQSxFQUFJLEVBQUEsQ0FBQyxVQUFVLENBQUEsQ0FBSSxHQUFDLENBQUM7QUFDbkUsdUJBQWUsR0FBSyxLQUFHLENBQUM7QUFDeEIsZ0JBQVEsQ0FBRSxDQUFBLENBQUMsVUFBVSxFQUFJLGlCQUFlLENBQUM7TUFDN0M7QUFBQSxJQUNKLEtBQU87QUFDSCxxQkFBZSxFQUFJLENBQUEsU0FBUSxDQUFFLENBQUEsQ0FBQyxVQUFVLENBQUM7SUFDN0M7QUFBQSxBQUNBLFdBQU8sRUFBSSxDQUFBLFFBQU8sT0FBTyxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUM7RUFDekM7QUFBQSxBQUNBLE9BQU8sU0FBTyxDQUFDO0FBQ25CO0FBQUEsQUFFQSxPQUFTLGdCQUFjLENBQUcsUUFBTyxDQUFHO0FBQ2hDLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSSxHQUFDLENBQUM7QUFDakIsT0FBTyxDQUFBLE9BQU0sSUFBSSxBQUFDLENBQUMsQ0FDZixnQkFBZSxBQUFDLENBQUMsUUFBTyxDQUFDLENBQ3pCLENBQUEsaUJBQWdCLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FDOUIsQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFVLFVBQVMsQ0FBRztBQUMxQixBQUFJLE1BQUEsQ0FBQSxTQUFRLEVBQUksQ0FBQSxVQUFTLENBQUUsQ0FBQSxDQUFDLE9BQU8sQUFBQyxDQUFDLENBQUMsUUFBTyxNQUFNLENBQUMsQ0FBRyxDQUFBLFVBQVMsQ0FBRSxDQUFBLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLFdBQU8sTUFBTSxFQUFJLENBQUEsd0JBQXVCLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztFQUN4RCxDQUFDLENBQUM7QUFDTjtBQUFBLEFBRUEsT0FBUyxRQUFNLENBQUUsUUFBTyxDQUFHLENBQUEsR0FBRSxDQUFHLENBQUEsTUFBSyxDQUFHO0FBQ3BDLEtBQUcsVUFBVSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7QUFDOUIsT0FBSyxFQUFJLENBQUEsTUFBSyxHQUFLLEdBQUMsQ0FBQztBQUVyQixBQUFJLElBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxRQUFPLE1BQU0sQ0FBRSxHQUFFLENBQUMsQ0FBQztBQUM5QixBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxJQUFHLE1BQU0sQ0FBQztBQUN0QixLQUFJLElBQUcsR0FBSyxDQUFBLEtBQUksT0FBTyxHQUFLLFVBQVEsQ0FBRztBQUNuQyxRQUFJLElBQUksU0FBUyxFQUFJLFNBQU8sQ0FBQztBQUM3QixRQUFJLElBQUksVUFBVSxFQUFJLElBQUUsQ0FBQztBQUN6QixPQUFJLElBQUcsVUFBVSxHQUFLLE9BQUssQ0FBRztBQUMxQixBQUFJLFFBQUEsQ0FBQSxXQUFVLEVBQUksQ0FBQSxJQUFHLEtBQUssSUFBSSxTQUFTLEVBQUksS0FBRyxDQUFBLENBQUksQ0FBQSxJQUFHLEtBQUssSUFBSSxLQUFLLENBQUM7QUFDcEUsQUFBSSxRQUFBLENBQUEsTUFBSyxFQUFJLENBQUEsSUFBRyxLQUFLLElBQUksT0FBTyxDQUFDO0FBQ2pDLEFBQUksUUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLElBQUcsS0FBSyxJQUFJLEtBQUssQ0FBQztBQUU3QixTQUFJLE1BQUssR0FBSyxFQUFDLE1BQUssT0FBTyxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUc7QUFDL0IsYUFBSyxFQUFJLENBQUEsR0FBRSxFQUFJLE9BQUssQ0FBQztNQUN6QjtBQUFBLEFBQ0ksUUFBQSxDQUFBLFNBQVEsRUFBSSxDQUFBLENBQUMsUUFBTyxTQUFTLEVBQUksS0FBRyxDQUFBLENBQUksQ0FBQSxRQUFPLEtBQUssQ0FBQSxDQUFJLENBQUEsUUFBTyxPQUFPLENBQUMsSUFBTSxFQUFDLFdBQVUsRUFBSSxPQUFLLENBQUMsQ0FBQztBQUN2RyxXQUFLLFNBQVMsUUFBUSxBQUFDLENBQUMsV0FBVSxFQUFJLEtBQUcsQ0FBQSxDQUFJLE9BQUssQ0FBQyxDQUFDO0FBRXBELFNBQUksSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUc7QUFDdEMsY0FBTSxJQUFJLEFBQUMsQ0FBQyxDQUFDLFFBQU8sU0FBUyxFQUFJLENBQUEsUUFBTyxLQUFLLENBQUEsQ0FBSSxDQUFBLFFBQU8sT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNsRSxjQUFNLElBQUksQUFBQyxDQUFDLENBQUMsSUFBRyxLQUFLLElBQUksU0FBUyxFQUFJLENBQUEsSUFBRyxLQUFLLElBQUksS0FBSyxDQUFBLENBQUksQ0FBQSxJQUFHLEtBQUssSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO01BQ25GO0FBQUEsQUFJQSxTQUFJLFNBQVEsQ0FBRztBQUNYLGFBQUssU0FBUyxPQUFPLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQztNQUNoQztBQUFBLElBRUosS0FBTyxLQUFJLElBQUcsVUFBVSxHQUFLLFVBQVEsQ0FBRztBQUNwQyxTQUFJLEtBQUksUUFBUSxDQUFHO0FBQ2Ysa0JBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBRyxJQUFFLENBQUcsT0FBSyxDQUFHLENBQUEsSUFBRyxLQUFLLE9BQU8sQ0FBQyxDQUFDO01BQ3hEO0FBQUEsSUFDSixLQUFPO0FBQ0gsQUFBSSxRQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsSUFBRyxLQUFLLFFBQVEsQ0FBQztBQUMvQixBQUFJLFFBQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxRQUFPLE1BQU0sQ0FBQztBQUMxQixBQUFJLFFBQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxtQkFBa0IsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO0FBR3hDLFNBQUksTUFBTyxPQUFLLENBQUUsUUFBTyxDQUFDLENBQUEsRUFBSyxZQUFVLENBQUEsRUFBSyxDQUFBLElBQUcsTUFBTSxTQUFTLElBQUksQUFBQyxDQUFDLGNBQWEsQ0FBQyxDQUFBLEVBQUssV0FBUyxDQUFHO0FBQ25HLEFBQUksVUFBQSxDQUFBLElBQUcsQ0FBQztBQUNSLEFBQUksVUFBQSxDQUFBLE1BQUssRUFBSSxNQUFJLENBQUM7QUFDbEIsWUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLENBQUEsS0FBSSxPQUFPLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLElBQUUsQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQzNDLEFBQUksWUFBQSxDQUFBLFNBQVEsRUFBSSxDQUFBLEtBQUksQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUN4QixBQUFJLFlBQUEsQ0FBQSxhQUFZLEVBQUksQ0FBQSxtQkFBa0IsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFDO0FBQ2xELGFBQUksUUFBTyxJQUFNLGNBQVksQ0FBRztBQUM5QixlQUFJLENBQUMsSUFBRyxDQUFHO0FBQ1AsaUJBQUcsRUFBSSxFQUFDLFNBQVEsVUFBVSxFQUFJLENBQUEsSUFBRyxVQUFVLENBQUMsQ0FBQztBQUM3QyxtQkFBSyxFQUFJLENBQUEsQ0FBQyxlQUFjLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQSxFQUFLLENBQUEsSUFBRyxFQUFJLG9CQUFrQixDQUFDO1lBQ3RFLEtBQU8sS0FBSSxpQkFBZ0IsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFHO0FBQ3JDLG1CQUFLLEVBQUksTUFBSSxDQUFDO0FBQ2QsbUJBQUs7WUFDVDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsQUFFQSxhQUFLLENBQUUsUUFBTyxDQUFDLEVBQUksT0FBSyxDQUFDO01BQzNCO0FBQUEsQUFHQSxTQUFJLE1BQUssQ0FBRSxtQkFBa0IsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUc7QUFDbkMsa0JBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBRyxJQUFFLENBQUcsT0FBSyxDQUFDLENBQUM7TUFDdEMsS0FBTztBQUNILDZCQUFxQixBQUFDLENBQUMsUUFBTyxDQUFHLEtBQUcsQ0FBRyxRQUFNLENBQUcsQ0FBQSxVQUFTLEFBQUMsQ0FBQyxRQUFPLENBQUcsSUFBRSxDQUFDLENBQUMsS0FBSyxBQUFDLENBQUMsU0FBVSxJQUFHLENBQUc7QUFDOUYsQUFBSSxZQUFBLENBQUEsR0FBRSxFQUFJLENBQUEsSUFBRyxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ2pCLEFBQUksWUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLEdBQUUsUUFBUSxZQUFZLEFBQUMsRUFBQyxDQUFDO0FBQ3ZDLEFBQUksWUFBQSxDQUFBLGtCQUFpQixFQUFJLENBQUEsT0FBTSxJQUFNLFFBQU0sQ0FBQSxFQUFLLENBQUEsT0FBTSxJQUFNLFdBQVMsQ0FBQSxFQUFLLENBQUEsR0FBRSxhQUFhLEFBQUMsQ0FBQyxpQkFBZ0IsQ0FBQyxDQUFDO0FBRTdHLGFBQUksTUFBSyxRQUFRLEFBQUMsQ0FBQyxJQUFHLFVBQVUsQ0FBQyxDQUFBLEVBQUssRUFBQSxDQUFHO0FBQ3ZDLEFBQUksY0FBQSxDQUFBLE9BQU0sRUFBSSxHQUFDLENBQUM7QUFDaEIsZUFBSSxJQUFHLEtBQUssT0FBTyxDQUFHO0FBQ3BCLG9CQUFNLE1BQU0sRUFBSSxDQUFBLE9BQU0sT0FBTyxFQUFJLENBQUEsSUFBRyxLQUFLLE9BQU8sQ0FBQztZQUNuRDtBQUFBLEFBR0EsZUFBSSxJQUFHLFVBQVUsR0FBSyxRQUFNLENBQUc7QUFDN0IsY0FBQSxBQUFDLENBQUMsR0FBRSxDQUFDLFFBQVEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDO1lBQ3pCLEtBQU8sS0FBSSxDQUFDLElBQUcsVUFBVSxHQUFLLFFBQU0sQ0FBQSxFQUFLLENBQUEsSUFBRyxVQUFVLEdBQUssT0FBSyxDQUFDLEdBQUssQ0FBQSxHQUFFLENBQUUsSUFBRyxVQUFVLENBQUMsQ0FBRztBQUN6RixnQkFBRSxDQUFFLElBQUcsVUFBVSxDQUFDLEFBQUMsRUFBQyxDQUFDO1lBQ3ZCLEtBQU87QUFDTCxxQkFBTyxDQUFFLElBQUcsVUFBVSxDQUFDLEFBQUMsQ0FBQyxHQUFFLENBQUcsUUFBTSxDQUFDLENBQUM7WUFDeEM7QUFBQSxBQUVBLGVBQUksTUFBTyxLQUFHLEtBQUssTUFBTSxDQUFBLEVBQUssWUFBVSxDQUFBLEVBQUssQ0FBQSxNQUFPLEtBQUcsS0FBSyxXQUFXLENBQUEsRUFBSyxZQUFVLENBQUc7QUFDdkYsQUFBSSxnQkFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLElBQUcsS0FBSyxXQUFXLEVBQUksQ0FBQSxJQUFHLEtBQUssV0FBVyxFQUFJLEVBQUUsT0FBTSxDQUFHLENBQUEsSUFBRyxLQUFLLE1BQU0sQ0FBRSxDQUFDO0FBQ3hGLGNBQUEsT0FBTyxBQUFDLENBQUMsR0FBRSxDQUFHLFFBQU0sQ0FBQyxDQUFDO0FBRXRCLGlCQUFJLGtCQUFpQixDQUFHO0FBQ3RCLHVCQUFPLE1BQU0sQUFBQyxDQUFDLEdBQUUsQ0FBRyxRQUFNLENBQUMsQ0FBQztjQUM5QjtBQUFBLEFBQ0EscUJBQU8sTUFBTSxBQUFDLENBQUMsR0FBRSxDQUFHLFNBQU8sQ0FBQyxDQUFDO1lBQy9CO0FBQUEsVUFDRjtBQUFBLEFBRUEsYUFBSSxJQUFHLFVBQVUsR0FBSyxXQUFTLENBQUc7QUFDaEMsQUFBSSxjQUFBLENBQUEsR0FBRSxFQUFJLENBQUEsTUFBSyxhQUFhLEFBQUMsQ0FBQyxJQUFHLEtBQUssUUFBUSxDQUFDLENBQUM7QUFDaEQsbUJBQU8sUUFBUSxBQUFDLENBQUMsR0FBRSxDQUFHLElBQUUsQ0FBQyxDQUFDO0FBQzFCLG1CQUFPLFNBQVMsQUFBQyxDQUFDLEdBQUUsQ0FBRyxJQUFFLENBQUMsQ0FBQztBQUUzQixjQUFFLE1BQU0sRUFBSSxDQUFBLElBQUcsS0FBSyxNQUFNLENBQUM7QUFDM0IsbUJBQU8sTUFBTSxBQUFDLENBQUMsR0FBRSxDQUFHLFNBQU8sQ0FBQyxDQUFDO0FBRTdCLG1CQUFPLE1BQU0sQUFBQyxDQUFDLEdBQUUsQ0FBRyxJQUFFLENBQUMsQ0FBQztBQUN4QixlQUFJLGtCQUFpQixDQUFHO0FBQ3BCLHFCQUFPLE1BQU0sQUFBQyxDQUFDLEdBQUUsQ0FBRyxRQUFNLENBQUMsQ0FBQztZQUNoQztBQUFBLFVBQ0Y7QUFBQSxBQUVBLGFBQUksSUFBRyxVQUFVLEdBQUssV0FBUyxDQUFBLEVBQUssQ0FBQSxJQUFHLE1BQU0sU0FBUyxJQUFJLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBRztBQUN0RSxlQUFHLFVBQVUsQUFBQyxDQUFDLFlBQVcsRUFBSSxDQUFBLElBQUcsVUFBVSxBQUFDLENBQUMsT0FBTSxVQUFVLENBQUMsQ0FBQSxDQUFLLG1CQUFpQixDQUFBLENBQUssQ0FBQSxJQUFHLEtBQUssS0FBSyxDQUFBLENBQUksSUFBRSxDQUFDLENBQUM7VUFDaEg7QUFBQSxBQUVBLGFBQUksS0FBSSxRQUFRLENBQUc7QUFDakIsc0JBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBRyxJQUFFLENBQUcsT0FBSyxDQUFDLENBQUM7VUFDcEM7QUFBQSxRQUNGLENBQUcsVUFBVSxNQUFLLENBQUc7QUFDakIsYUFBSSxJQUFHLFVBQVUsR0FBSyxXQUFTLENBQUc7QUFDaEMsZUFBRyxVQUFVLEFBQUMsQ0FBQyxZQUFXLEVBQUksT0FBSyxDQUFDLENBQUM7QUFDckMsZUFBRyxhQUFhLEFBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBQztVQUMxQixLQUFPLEtBQUksZUFBYyxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUc7QUFDOUIsZUFBRyxZQUFZLEFBQUMsQ0FBQyxrQkFBaUIsRUFBSSxJQUFFLENBQUEsQ0FBSSxZQUFVLENBQUEsQ0FBSSxDQUFBLElBQUcsVUFBVSxDQUFBLENBQUksWUFBVSxDQUFBLENBQUksT0FBSyxDQUFDLENBQUM7QUFDaEcsZUFBRyxhQUFhLEFBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBQztVQUM1QixLQUFPO0FBQ0wsZUFBSSxJQUFHLE1BQU0sU0FBUyxJQUFJLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBRztBQUN0QyxpQkFBRyxVQUFVLEFBQUMsQ0FBQyxNQUFLLENBQUMsQ0FBQztZQUN4QjtBQUFBLEFBQ0EsZUFBSSxLQUFJLFFBQVEsQ0FBRztBQUNqQix3QkFBVSxBQUFDLENBQUMsUUFBTyxDQUFHLElBQUUsQ0FBRyxPQUFLLENBQUMsQ0FBQztZQUNwQztBQUFBLFVBQ0Y7QUFBQSxRQUNKLENBQUMsQ0FBQztNQUNOO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxBQUNKO0FBQUEsQUFFQSxPQUFTLGVBQWEsQ0FBRSxZQUFXLENBQUc7QUFDbEMsQUFBSSxJQUFBLENBQUEsRUFBQyxFQUFJLENBQUEsUUFBTyxjQUFjLEFBQUMsQ0FBQyxZQUFXLENBQUMsQ0FBQztBQUM3QyxPQUFPLElBQUksUUFBTSxBQUFDLENBQUMsU0FBVSxPQUFNLENBQUcsQ0FBQSxNQUFLLENBQUc7QUFDMUMsTUFBSTtBQUNBLFNBQUksQ0FBQyxNQUFLLFFBQVEsQ0FBRztBQUNqQixZQUFNLElBQUksTUFBSSxBQUFDLENBQUMsMENBQXlDLENBQUMsQ0FBQztNQUMvRDtBQUFBLEFBQ0EsU0FBSSxPQUFNLGVBQWUsQ0FBRztBQUN4QixjQUFNLGVBQWUsQUFBQyxDQUFDLEVBQUMsQ0FBQyxXQUFXLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztNQUNsRCxLQUFPO0FBQ0gsV0FBSSxDQUFDLE9BQU0sUUFBUSxBQUFDLENBQUMsRUFBQyxDQUFDLFNBQVMsQUFBQyxFQUFDLENBQUc7QUFDakMsY0FBTSxJQUFJLE1BQUksQUFBQyxDQUFDLGdCQUFlLEVBQUksYUFBVyxDQUFBLENBQUkscUJBQW1CLENBQUEsQ0FDakUsMENBQXdDLENBQUMsQ0FBQztRQUNsRDtBQUFBLEFBQ0EsY0FBTSxRQUFRLEFBQUMsQ0FBQyxFQUFDLENBQUMsU0FBUyxBQUFDLEVBQUMsSUFBSSxBQUFDLENBQUMsVUFBUyxDQUFDLGdDQUNmLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztNQUM1QztBQUFBLElBQ0osQ0FBRSxPQUFPLEdBQUUsQ0FBRztBQUNWLFdBQUssQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0lBQ2Y7QUFBQSxFQUNKLENBQUMsQ0FBQztBQUNOO0FBQUEsQUFFQSxPQUFTLGdCQUFjLENBQUUsSUFBRyxDQUFHO0FBQzNCLE9BQU8sQ0FBQSxJQUFHLFVBQVUsR0FBSyxhQUFXLENBQUEsRUFDN0IsQ0FBQSxJQUFHLFVBQVUsR0FBSyxXQUFTLENBQUEsRUFDM0IsQ0FBQSxJQUFHLFVBQVUsR0FBSyxhQUFXLENBQUEsRUFDN0IsQ0FBQSxJQUFHLFVBQVUsR0FBSyxZQUFVLENBQUEsRUFDNUIsQ0FBQSxJQUFHLFVBQVUsR0FBSyxPQUFLLENBQUEsRUFDdkIsQ0FBQSxJQUFHLFVBQVUsR0FBSyxRQUFNLENBQUM7QUFDcEM7QUFBQSxBQUtBLE9BQVMsa0JBQWdCLENBQUUsSUFBRyxDQUFHO0FBQzdCLEFBQUksSUFBQSxDQUFBLEdBQUUsRUFBSSxDQUFBLElBQUcsVUFBVSxDQUFDO0FBV3hCLE9BQU8sQ0FBQSxHQUFFLFFBQVEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFBLEdBQU0sRUFBQSxDQUFBLEVBQUssQ0FBQSxHQUFFLFFBQVEsQUFBQyxDQUFDLFdBQVUsQ0FBQyxDQUFBLEdBQU0sRUFBQSxDQUFBLEVBQUssQ0FBQSxHQUFFLFFBQVEsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFBLEdBQU0sRUFBQSxDQUFDO0FBQ3ZHO0FBQUEsQUFFQSxPQUFTLHVCQUFxQixDQUFFLFFBQU8sQ0FBRyxDQUFBLElBQUcsQ0FBRyxDQUFBLE9BQU0sQ0FBRyxDQUFBLE9BQU0sQ0FBRyxDQUFBLFdBQVUsQ0FBRztBQUMzRSxBQUFJLElBQUEsQ0FBQSxPQUFNLENBQUM7QUFDWCxPQUFPLElBQUksUUFBTSxBQUFDLENBQUMsU0FBVSxPQUFNLENBQUcsQ0FBQSxNQUFLLENBQUc7QUFDMUMsV0FBUyxRQUFNLENBQUMsQUFBQyxDQUFFO0FBQ2YsU0FBSSxDQUFDLE9BQU0sQ0FBRztBQUNWLGNBQU0sRUFBSSxDQUFBLEdBQUksS0FBRyxBQUFDLEVBQUMsUUFBUSxBQUFDLEVBQUMsQ0FBQztNQUNsQztBQUFBLEFBRUksUUFBQSxDQUFBLElBQUcsQ0FBQztBQUNSLEFBQUksUUFBQSxDQUFBLFlBQVcsRUFBSSxNQUFJLENBQUM7QUFDeEIsQUFBSSxRQUFBLENBQUEsVUFBUyxFQUFJLE1BQUksQ0FBQztBQUN0QixBQUFJLFFBQUEsQ0FBQSxrQkFBaUIsRUFBSSxNQUFJLENBQUM7QUFDOUIsQUFBSSxRQUFBLENBQUEsZUFBYyxFQUFJLENBQUEsT0FBTSxVQUFVLE1BQU0sQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ2hELEFBQUksUUFBQSxDQUFBLFdBQVUsRUFBSSxDQUFBLElBQUcsS0FBSyxLQUFLLENBQUM7QUFDaEMsQUFBSSxRQUFBLENBQUEsVUFBUyxFQUFJLENBQUEsSUFBRyxLQUFLLFdBQVcsR0FBSyxTQUFPLENBQUM7QUFDakQsb0JBQWMsUUFBUSxBQUFDLENBQUMsbUJBQWtCLEVBQUksQ0FBQSxPQUFNLFNBQVMsQ0FBQSxDQUFJLEtBQUcsQ0FBQyxDQUFDO0FBQ3RFLFVBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxlQUFjLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQzdDLEFBQUksVUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLGVBQWMsQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUNqQyxXQUFJLGVBQWMsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFHO0FBQ3ZCLGlCQUFPLEdBQUssV0FBUyxDQUFDO1FBQzFCO0FBQUEsQUFDQSxXQUFHLEVBQUksQ0FBQSxDQUFBLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztBQUNsQixXQUFJLElBQUcsT0FBTyxHQUFLLEVBQUEsQ0FBRztBQUNsQixhQUFJLE1BQU8sWUFBVSxDQUFBLEVBQUssWUFBVSxDQUFHO0FBQ25DLEFBQUksY0FBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLENBQUEsQUFBQyxDQUFDLElBQUcsQ0FBRSxDQUFBLENBQUMsQ0FBQyxLQUFLLEFBQUMsRUFBQyxDQUFDO0FBQy9CLGVBQUksQ0FBQyxVQUFTLElBQU0sU0FBTyxDQUFBLEVBQUssQ0FBQSxPQUFNLElBQU0sWUFBVSxDQUFDLEdBQ25ELEVBQUMsVUFBUyxJQUFNLFdBQVMsQ0FBQSxFQUFLLENBQUEsT0FBTSxRQUFRLEFBQUMsQ0FBQyxXQUFVLENBQUMsQ0FBQSxFQUFLLEVBQUEsQ0FBQyxDQUFHO0FBQ2xFLHVCQUFTLEVBQUksS0FBRyxDQUFDO0FBQ2pCLG1CQUFLO1lBQ1QsS0FBTztBQUNILCtCQUFpQixFQUFJLEtBQUcsQ0FBQztZQUM3QjtBQUFBLFVBQ0osS0FBTztBQUNILHFCQUFTLEVBQUksS0FBRyxDQUFDO0FBQ2pCLGVBQUcsS0FBSyxBQUFDLENBQUMsZ0JBQWUsQ0FBRyxDQUFBLE9BQU0sU0FBUyxDQUFDLENBQUM7QUFDN0MsaUJBQUs7VUFDVDtBQUFBLEFBQ0EsZUFBSztRQUNULEtBQU8sS0FBSSxJQUFHLE9BQU8sRUFBSSxFQUFBLENBQUc7QUFDeEIscUJBQVcsRUFBSSxLQUFHLENBQUM7UUFDdkI7QUFBQSxNQUNKO0FBQUEsQUFFQSxTQUFJLFVBQVMsQ0FBRztBQUNaLGNBQU0sQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO01BQ2pCLEtBQU8sS0FBSSxlQUFjLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQSxFQUFLLENBQUEsQ0FBQyxHQUFJLEtBQUcsQUFBQyxFQUFDLFFBQVEsQUFBQyxFQUFDLENBQUEsQ0FBSSxRQUFNLENBQUMsRUFBSSxDQUFBLE9BQU0sRUFBSSxFQUFBLENBQUc7QUFDaEYsaUJBQVMsQUFBQyxDQUFDLE9BQU0sQ0FBRyxHQUFDLENBQUMsQ0FBQztNQUMzQixLQUFPO0FBQ0gsQUFBSSxVQUFBLENBQUEsTUFBSyxFQUFJLEdBQUMsQ0FBQztBQUNmLFdBQUksWUFBVyxDQUFHO0FBQ2QsZUFBSyxFQUFJLENBQUEsb0RBQW1ELEVBQUksQ0FBQSxJQUFHLFVBQVUsQUFBQyxDQUFDLE9BQU0sVUFBVSxDQUFDLENBQUEsQ0FBSSxjQUFZLENBQUEsQ0FBSSxDQUFBLElBQUcsVUFBVSxDQUFBLENBQUkscUNBQW1DLENBQUM7UUFDN0ssS0FBTyxLQUFJLGtCQUFpQixDQUFHO0FBQzNCLGVBQUssRUFBSSxDQUFBLG9EQUFtRCxFQUFJLENBQUEsSUFBRyxVQUFVLEFBQUMsQ0FBQyxPQUFNLFVBQVUsQ0FBQyxDQUFBLENBQUksY0FBWSxDQUFBLENBQUksQ0FBQSxJQUFHLFVBQVUsQ0FBQSxDQUFJLGdEQUE4QyxDQUFBLENBQUksWUFBVSxDQUFBLENBQUksY0FBWSxDQUFBLENBQUksQ0FBQSxJQUFHLEtBQUssQUFBQyxFQUFDLENBQUEsQ0FBSSxLQUFHLENBQUM7UUFDM08sS0FBTztBQUNILGVBQUssRUFBSSxDQUFBLG9EQUFtRCxFQUFJLENBQUEsSUFBRyxVQUFVLEFBQUMsQ0FBQyxPQUFNLFVBQVUsQ0FBQyxDQUFBLENBQUksY0FBWSxDQUFBLENBQUksQ0FBQSxJQUFHLFVBQVUsQ0FBQSxDQUFJLCtCQUE2QixDQUFDO1FBQ3ZLO0FBQUEsQUFDQSxhQUFLLEFBQUMsQ0FBQyxNQUFLLENBQUMsQ0FBQztNQUNsQjtBQUFBLElBQ0o7QUFBQSxBQUVJLE1BQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxJQUFHLE1BQU0sU0FBUyxJQUFJLEFBQUMsQ0FBQyxjQUFhLENBQUMsQ0FBQztBQUNuRCxBQUFJLE1BQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxtQkFBa0IsRUFBSSxFQUFDLEtBQUksSUFBTSxXQUFTLENBQUEsQ0FBSSxJQUFFLEVBQUksTUFBSSxDQUFDLENBQUM7QUFDdEUsT0FBSSxNQUFLLFFBQVEsQ0FBRztBQUNoQixtQkFBYSxBQUFDLENBQUMsVUFBUyxDQUFDLEtBQUssQUFBQyxDQUFDLFNBQVEsQUFBQyxDQUFFO0FBQ3pDLFdBQUksS0FBSSxJQUFNLFdBQVMsQ0FBRztBQUN0QixtQkFBUyxBQUFDLENBQUMsT0FBTSxDQUFHLFFBQU0sQ0FBQyxDQUFDO1FBQ2hDLEtBQU8sS0FBSSxLQUFJLElBQU0sVUFBUSxDQUFHO0FBQzVCLGdCQUFNLEFBQUMsRUFBQyxDQUFDO1FBQ2IsS0FBTztBQUNILG1CQUFTLEFBQUMsQ0FBQyxPQUFNLENBQUcsQ0FBQSxJQUFHLElBQUksQUFBQyxDQUFDLE9BQU0sRUFBSSxNQUFJLENBQUcsTUFBSSxDQUFDLENBQUMsQ0FBQztRQUN6RDtBQUFBLE1BQ0YsQ0FBQyxDQUFDO0lBQ04sS0FBTztBQUNILFNBQUksS0FBSSxJQUFNLFdBQVMsQ0FBRztBQUN0QixpQkFBUyxBQUFDLENBQUMsT0FBTSxDQUFHLFFBQU0sQ0FBQyxDQUFDO01BQ2hDLEtBQU8sS0FBSSxLQUFJLElBQU0sVUFBUSxDQUFHO0FBQzVCLGNBQU0sQUFBQyxFQUFDLENBQUM7TUFDYixLQUFPO0FBQ0gsaUJBQVMsQUFBQyxDQUFDLE9BQU0sQ0FBRyxDQUFBLElBQUcsSUFBSSxBQUFDLENBQUMsT0FBTSxFQUFJLE1BQUksQ0FBRyxNQUFJLENBQUMsQ0FBQyxDQUFDO01BQ3pEO0FBQUEsSUFDSjtBQUFBLEVBQ0osQ0FBQyxDQUFDO0FBQ047QUFBQSxBQUVBLE9BQVMsV0FBUyxDQUFFLFFBQU8sQ0FBRyxDQUFBLEdBQUUsQ0FBRztBQUMvQixLQUFJLEdBQUUsRUFBSSxFQUFBLENBQUc7QUFHVCxPQUFJLFFBQU8sTUFBTSxDQUFFLEdBQUUsRUFBSSxFQUFBLENBQUMsVUFBVSxHQUFLLFdBQVMsQ0FBRztBQUNqRCxXQUFPLEVBQUEsQ0FBQztJQUNaO0FBQUEsQUFDQSxTQUFPLENBQUEsUUFBTyxNQUFNLENBQUUsR0FBRSxDQUFDLFVBQVUsRUFBSSxDQUFBLFFBQU8sTUFBTSxDQUFFLEdBQUUsRUFBSSxFQUFBLENBQUMsVUFBVSxDQUFDO0VBQzVFO0FBQUEsQUFDQSxPQUFPLEVBQUEsQ0FBQztBQUNaO0FBQUEsQUFFQSxPQUFTLFlBQVUsQ0FBRSxRQUFPLENBQUcsQ0FBQSxHQUFFLENBQUcsQ0FBQSxNQUFLLENBQUcsQ0FBQSxPQUFNLENBQUc7QUFFakQsV0FBUyxBQUFDLENBQUMsU0FBUSxBQUFDLENBQUU7QUFDbEIsT0FBSSxRQUFPLE1BQU0sT0FBTyxFQUFJLEVBQUMsR0FBRSxFQUFJLEVBQUEsQ0FBQyxDQUFHO0FBQ25DLFlBQU0sQUFBQyxDQUFDLFFBQU8sQ0FBRyxDQUFBLEdBQUUsRUFBSSxFQUFBLENBQUcsT0FBSyxDQUFDLENBQUM7SUFDdEMsS0FBTztBQUNILFNBQUcsYUFBYSxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUM7SUFDM0I7QUFBQSxFQUNKLENBQUcsQ0FBQSxPQUFNLEdBQUssRUFBQSxDQUFDLENBQUM7QUFDcEI7QUFBQSxBQUVBLE9BQVMsbUJBQWlCLENBQUUsT0FBTSxDQUFHO0FBQ2pDLEFBQUksSUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLFFBQU8sY0FBYyxBQUFDLENBQUMsVUFBUyxDQUFDLENBQUM7QUFDN0MsS0FBRyxVQUFVLEVBQUksUUFBTSxDQUFDO0FBRXhCLE9BQU8sQ0FBQSxJQUFHLFFBQVEsRUFBSSxDQUFBLElBQUcsUUFBUSxFQUFJLEtBQUcsQ0FBQztBQUM3QztBQUFBLEFBRUEsT0FBUyxvQkFBa0IsQ0FBRSxJQUFHLENBQUc7QUFDL0IsT0FBTyxDQUFBLElBQUcsR0FBSyxDQUFBLElBQUcsS0FBSyxDQUFBLEVBQUssQ0FBQSxJQUFHLEtBQUssUUFBUSxDQUFBLEVBQUssQ0FBQSxJQUFHLEtBQUssUUFBUSxTQUFTLENBQUM7QUFDL0U7QUFBQSxBQUVBLE9BQVMsaUJBQWUsQ0FBRSxLQUFJLENBQUc7QUFDL0IsQUFBSSxJQUFBLENBQUEsTUFBSyxFQUFJLEdBQUMsQ0FBQztBQUNmLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSSxNQUFJLENBQUM7QUFDcEIsTUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLEtBQUksT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDckMsQUFBSSxNQUFBLENBQUEsTUFBSyxFQUFJLENBQUEsS0FBSSxDQUFFLENBQUEsQ0FBQyxVQUFVLElBQU0sT0FBSyxDQUFDO0FBQzFDLE9BQUksQ0FBQyxRQUFPLENBQUEsRUFBSyxFQUFDLE1BQUssQ0FBRztBQUN4QixXQUFLLEtBQUssQUFBQyxDQUFDLEtBQUksQ0FBRSxDQUFBLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLGFBQU8sRUFBSSxDQUFBLFFBQU8sR0FBSyxPQUFLLENBQUM7SUFDL0I7QUFBQSxFQUNGO0FBQUEsQUFDQSxPQUFPLE9BQUssQ0FBQztBQUNmO0FBQUEsQUFBQztBQUVELEFBQUksRUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLENBQUMsU0FBUyxBQUFDLENBQUU7QUFDcEIsU0FBUyxHQUFDLENBQUMsQUFBQyxDQUFFO0FBQ1YsU0FBTyxDQUFBLElBQUcsTUFBTSxBQUFDLENBQUMsQ0FBQyxDQUFBLEVBQUksQ0FBQSxJQUFHLE9BQU8sQUFBQyxFQUFDLENBQUMsRUFBSSxRQUFNLENBQUMsU0FDbkMsQUFBQyxDQUFDLEVBQUMsQ0FBQyxVQUNILEFBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztFQUNyQjtBQUFBLEFBQ0EsT0FBTyxVQUFTLEFBQUMsQ0FBRTtBQUNmLFNBQU8sQ0FBQSxFQUFDLEFBQUMsRUFBQyxDQUFBLENBQUksQ0FBQSxFQUFDLEFBQUMsRUFBQyxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxFQUFDLEFBQUMsRUFBQyxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxFQUFDLEFBQUMsRUFBQyxDQUFBLENBQUksSUFBRSxDQUFBLENBQzdDLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQSxDQUFJLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQSxDQUFJLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQztFQUN2QyxDQUFDO0FBQ0wsQ0FBQyxBQUFDLEVBQUMsQ0FBQztBQUVKLEFBQUksRUFBQSxDQUFBLFNBQVEsRUFBSSxHQUFDLENBQUM7QUFDbEIsQUFBSSxFQUFBLENBQUEsS0FBSSxDQUFDO0FBQ1QsQUFBSSxFQUFBLENBQUEsSUFBRyxFQUFJO0FBQ1AsS0FBRyxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQ2QsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsa0JBQWlCLEFBQUMsQ0FBQyxlQUFjLENBQUMsQ0FBQztBQUNsRCxPQUFJLFFBQU8sQ0FBRztBQUNaLGlCQUFXLE1BQU0sQUFBQyxFQUFDLENBQUM7SUFDdEI7QUFBQSxBQUNBLFFBQUksRUFBSSxDQUFBLElBQUcsTUFBTSxFQUFJLENBQUEsSUFBRyxxQkFBcUIsQUFBQyxFQUFDLENBQUM7QUFDaEQsT0FBRyxVQUFVLEFBQUMsQ0FBQyxhQUFZLENBQUMsQ0FBQztBQUU3QixTQUFPLENBQUEsSUFBRyxhQUFhLEFBQUMsRUFBQyxLQUFLLEFBQUMsQ0FBQyxTQUFTLEFBQUMsQ0FBRTtBQUMxQyxTQUFJLFFBQU8sQ0FBRztBQUNaLGlCQUFTLEFBQUMsQ0FBQyxTQUFTLEFBQUMsQ0FBRTtBQUNyQixjQUFJLFdBQVcsRUFBSSxDQUFBLGtCQUFpQixBQUFDLENBQUMsa0JBQWlCLENBQUMsQ0FBQztBQUN6RCxjQUFJLFFBQVEsRUFBSSxLQUFHLENBQUM7QUFDcEIsYUFBRyxZQUFZLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztRQUM1QixDQUFHLElBQUUsQ0FBQyxDQUFDO01BQ1QsS0FBTztBQUNMLFdBQUksS0FBSSxPQUFPLElBQU0sVUFBUSxDQUFHO0FBQzlCLG9CQUFVLEFBQUMsQ0FBQyxLQUFJLElBQUksU0FBUyxDQUFHLENBQUEsS0FBSSxJQUFJLFVBQVUsQ0FBQyxDQUFDO1FBQ3RELEtBQU8sS0FBSSxDQUFDLEtBQUksT0FBTyxDQUFBLEVBQUssQ0FBQSxLQUFJLE9BQU8sSUFBTSxlQUFhLENBQUc7QUFDM0QsY0FBSSxPQUFPLEVBQUksU0FBTyxDQUFDO1FBQ3pCO0FBQUEsTUFDRjtBQUFBLElBRUYsQ0FBQyxDQUFDO0VBQ047QUFDQSxVQUFRLENBQUcsVUFBVSxHQUFFLENBQUcsQ0FBQSxPQUFNLENBQUc7QUFDL0IsT0FBSSxTQUFRLEdBQUssQ0FBQSxTQUFRLE9BQU8sQ0FBRztBQUMvQixVQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLENBQUEsU0FBUSxPQUFPLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUN2QyxnQkFBUSxDQUFFLENBQUEsQ0FBQyxBQUFDLENBQUMsR0FBRSxDQUFHLFFBQU0sQ0FBQyxDQUFDO01BQzlCO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDQSxlQUFhLENBQUcsVUFBUyxBQUFDLENBQUU7QUFDeEIsT0FBSSxLQUFJLE9BQU8sR0FBSyxZQUFVLENBQUc7QUFDN0IsVUFBSSxPQUFPLEVBQUksWUFBVSxDQUFDO0FBQzFCLFVBQUksTUFBTSxFQUFJLEdBQUMsQ0FBQztBQUNoQixTQUFHLFVBQVUsQUFBQyxDQUFDLG1CQUFrQixDQUFDLENBQUM7QUFDbkMsU0FBRyxVQUFVLEFBQUMsQ0FBQyxtQkFBa0IsQ0FBQyxDQUFDO0FBQ25DLFNBQUcsY0FBYyxBQUFDLENBQUMsTUFBSyxDQUFHLEVBQ3ZCLEdBQUUsQ0FBRztBQUNELGlCQUFPLENBQUcsQ0FBQSxNQUFLLFNBQVMsU0FBUztBQUNqQyxhQUFHLENBQUcsQ0FBQSxNQUFLLFNBQVMsS0FBSztBQUN6QixlQUFLLENBQUcsQ0FBQSxNQUFLLFNBQVMsT0FBTztBQUM3QixhQUFHLENBQUcsQ0FBQSxNQUFLLFNBQVMsS0FBSztBQUFBLFFBQzdCLENBQ0osQ0FBQyxDQUFDO0lBQ047QUFBQSxFQUNKO0FBRUEsWUFBVSxDQUFHLFVBQVUsSUFBRyxDQUFHLENBQUEsTUFBSyxDQUFHO0FBQ2pDLEFBQUksTUFBQSxDQUFBLEtBQUksRUFBSSxDQUFBLElBQUcsR0FBSyxDQUFBLE1BQUssQUFBQyxDQUFDLGlCQUFnQixDQUFDLENBQUM7QUFDN0MsQUFBSSxNQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsQ0FBQyxJQUFHLENBQUEsQ0FBSSxDQUFBLE1BQUssQUFBQyxDQUFDLGlEQUFnRCxDQUFDLENBQUEsRUFBSyxJQUFFLENBQUEsQ0FBSSxLQUFHLENBQUM7QUFDN0YsU0FBTyxDQUFBLFdBQVUsQUFBQyxDQUFDLEtBQUksQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFVLFFBQU8sQ0FBRztBQUMvQyxhQUFPLEVBQUksQ0FBQSxJQUFHLE1BQU0sQUFBQyxDQUFDLElBQUcsVUFBVSxBQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQztBQUMvQyxvQkFBYyxBQUFDLENBQUMsUUFBTyxDQUFDLEtBQUssQUFBQyxDQUFDLFNBQVMsQUFBQyxDQUFFO0FBQ3ZDLFlBQUksSUFBSSxFQUFJLEdBQUMsQ0FBQztBQUNkLFlBQUksUUFBUSxFQUFJLENBQUEsT0FBTSxJQUFNLEtBQUcsQ0FBQztBQUNoQyxZQUFJLE9BQU8sRUFBSSxVQUFRLENBQUM7QUFFeEIsZUFBTyxNQUFNLEVBQUksQ0FBQSxnQkFBZSxBQUFDLENBQUMsUUFBTyxNQUFNLENBQUMsQ0FBQztBQUVqRCxXQUFJLElBQUcsTUFBTSxTQUFTLElBQUksQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFHO0FBQ3RDLGFBQUcsVUFBVSxBQUFDLENBQUMscUJBQW9CLEVBQUksS0FBRyxDQUFBLENBQUksSUFBRSxDQUFHLFNBQU8sQ0FBQyxDQUFDO1FBQzlEO0FBQUEsQUFFQSxXQUFHLFVBQVUsQUFBQyxDQUFDLGtCQUFpQixDQUFDLENBQUM7QUFFbEMsY0FBTSxBQUFDLENBQUMsUUFBTyxDQUFHLEVBQUEsQ0FBQyxDQUFDO01BQ3hCLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQztFQUNOO0FBQ0EsWUFBVSxDQUFHLFlBQVU7QUFDdkIsYUFBVyxDQUFHLFVBQVUsT0FBTSxDQUFHO0FBQzdCLEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLEtBQUksSUFBSSxHQUFLLENBQUEsS0FBSSxJQUFJLFNBQVMsQ0FBQztBQUM5QyxTQUFPLE1BQUksSUFBSSxDQUFDO0FBQ2hCLFFBQUksT0FBTyxFQUFJLFNBQU8sQ0FBQztBQUN2QixPQUFHLFVBQVUsQUFBQyxDQUFDLGtCQUFpQixDQUFDLENBQUM7QUFFbEMsT0FBSSxJQUFHLE1BQU0sU0FBUyxJQUFJLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBRztBQUN0QyxTQUFHLFVBQVUsQUFBQyxDQUFDLG1CQUFrQixDQUFDLENBQUM7SUFDckM7QUFBQSxBQUNBLE9BQUksUUFBTyxDQUFHO0FBQ1YsU0FBSSxPQUFNLENBQUc7QUFDVCxXQUFHLGNBQWMsQUFBQyxDQUFDLHNCQUFxQixFQUFJLENBQUEsUUFBTyxLQUFLLENBQUEsQ0FBSSxlQUFhLENBQUMsQ0FBQztNQUMvRSxLQUFPO0FBQ0gsV0FBRyxVQUFVLEFBQUMsQ0FBQyxtQkFBa0IsRUFBSSxDQUFBLE1BQUssU0FBUyxLQUFLLENBQUMsQ0FBQztBQUMxRCxXQUFHLFlBQVksQUFBQyxDQUFDLHNCQUFxQixFQUFJLENBQUEsUUFBTyxLQUFLLENBQUEsQ0FBSSxhQUFXLENBQUMsQ0FBQztNQUMzRTtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBS0EscUJBQW1CLENBQUcsVUFBVSxPQUFNLENBQUc7QUFDckMsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsT0FBTSxhQUFhLEFBQUMsQ0FBQyxnQkFBZSxDQUFDLENBQUEsRUFBSyxDQUFBLElBQUcsQUFBQyxFQUFDLENBQUM7QUFDL0QsVUFBTSxhQUFhLEFBQUMsQ0FBQyxnQkFBZSxDQUFHLFNBQU8sQ0FBQyxDQUFDO0FBRWhELEFBQUksTUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLE9BQU0sVUFBVSxBQUFDLEVBQUMsVUFBVSxDQUFDO0FBQzNDLEFBQUksTUFBQSxDQUFBLFlBQVcsRUFBSSxHQUFDLENBQUM7QUFDckIsT0FBSSxPQUFNLFFBQVEsWUFBWSxBQUFDLEVBQUMsQ0FBQSxFQUFLLE9BQUssQ0FBQSxFQUFLLENBQUEsT0FBTSxRQUFRLFlBQVksQUFBQyxFQUFDLENBQUEsRUFBSyxPQUFLLENBQUc7QUFDcEYsaUJBQVcsRUFBSSxFQUFDLE9BQU0sUUFBUSxDQUFDLENBQUM7SUFDcEMsS0FBTztBQUNILGlCQUFXLEVBQUksQ0FBQSxjQUFhLEFBQUMsQ0FBQyxPQUFNLENBQUcsQ0FBQSxRQUFPLEtBQUssQ0FBQyxDQUFDO0lBQ3pEO0FBQUEsQUFDQSxTQUFPO0FBQ0gsYUFBTyxDQUFHLFNBQU87QUFDakIsY0FBUSxDQUFHLGFBQVc7QUFBQSxJQUMxQixDQUFDO0VBQ0w7QUFFQSxjQUFZLENBQUcsVUFBVSxTQUFRLENBQUcsQ0FBQSxJQUFHLENBQUcsQ0FBQSxHQUFFLENBQUc7QUFDM0MsT0FBSSxJQUFHLFlBQVksQUFBQyxFQUFDLENBQUEsRUFBSyxDQUFBLElBQUcsYUFBYSxBQUFDLEVBQUMsQ0FBRztBQUMzQyxTQUFJLE1BQU8sSUFBRSxDQUFBLEVBQUssWUFBVSxDQUFHO0FBQzNCLFVBQUUsRUFBSSxDQUFBLElBQUcsTUFBTSxNQUFNLE9BQU8sQ0FBQztNQUNqQztBQUFBLEFBQ0EsVUFBSSxNQUFNLENBQUUsR0FBRSxDQUFDLEVBQUk7QUFDZixnQkFBUSxDQUFHLFVBQVE7QUFDbkIsZ0JBQVEsQ0FBRyxDQUFBLEdBQUksS0FBRyxBQUFDLEVBQUMsUUFBUSxBQUFDLEVBQUM7QUFDOUIsV0FBRyxDQUFHLEtBQUc7QUFBQSxNQUNiLENBQUM7QUFDRCxTQUFHLFVBQVUsQUFBQyxDQUFDLGtCQUFpQixDQUFDLENBQUM7SUFDdEM7QUFBQSxFQUNKO0FBQ0EsVUFBUSxDQUFHLFVBQVUsR0FBRSxDQUFHLENBQUEsUUFBTyxDQUFHO0FBQ2hDLE9BQUksY0FBYSxHQUFLLENBQUEsY0FBYSxPQUFPLENBQUc7QUFDekMsVUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLGNBQWEsT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDNUMscUJBQWEsQ0FBRSxDQUFBLENBQUMsSUFBSSxBQUFDLENBQUMsR0FBRSxDQUFHLFNBQU8sQ0FBRyxLQUFHLENBQUMsQ0FBQztNQUM5QztBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0EsWUFBVSxDQUFHLFVBQVUsS0FBSSxDQUFHLENBQUEsUUFBTyxDQUFHO0FBQ3BDLE9BQUksY0FBYSxHQUFLLENBQUEsY0FBYSxPQUFPLENBQUc7QUFDekMsVUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLGNBQWEsT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDNUMscUJBQWEsQ0FBRSxDQUFBLENBQUMsTUFBTSxBQUFDLENBQUMsS0FBSSxDQUFHLFNBQU8sQ0FBRyxLQUFHLENBQUMsQ0FBQztNQUNsRDtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0EsY0FBWSxDQUFHLFVBQVUsT0FBTSxDQUFHLENBQUEsUUFBTyxDQUFHO0FBQ3hDLE9BQUksY0FBYSxHQUFLLENBQUEsY0FBYSxPQUFPLENBQUc7QUFDekMsVUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLGNBQWEsT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDNUMscUJBQWEsQ0FBRSxDQUFBLENBQUMsUUFBUSxBQUFDLENBQUMsT0FBTSxDQUFHLFNBQU8sQ0FBRyxLQUFHLENBQUMsQ0FBQztNQUN0RDtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0EsaUJBQWUsQ0FBRyxVQUFVLE9BQU0sQ0FBRztBQUNqQyxZQUFRLEtBQUssQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDO0VBQzNCO0FBQ0Esb0JBQWtCLENBQUcsVUFBVSxPQUFNLENBQUc7QUFDcEMsZUFBVyxLQUFLLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztFQUM5QjtBQUNBLHNCQUFvQixDQUFHLFVBQVUsT0FBTSxDQUFHO0FBQ3RDLGlCQUFhLEtBQUssQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDO0VBQ2hDO0FBQ0Esb0JBQWtCLENBQUcsVUFBVSxPQUFNLENBQUc7QUFDcEMsZUFBVyxLQUFLLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztFQUM5QjtBQUNBLDRCQUEwQixDQUFHLFVBQVUsT0FBTSxDQUFHO0FBQzVDLHVCQUFtQixLQUFLLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztFQUN0QztBQUNBLFlBQVUsQ0FBRyxVQUFRLEFBQUMsQ0FBRTtBQUNwQixTQUFPLENBQUEsSUFBRyxNQUFNLE9BQU8sUUFBUSxBQUFDLENBQUMsV0FBVSxDQUFDLENBQUEsR0FBTSxFQUFBLENBQUM7RUFDdkQ7QUFDQSxVQUFRLENBQUcsVUFBUSxBQUFDLENBQUU7QUFDbEIsU0FBTyxDQUFBLElBQUcsTUFBTSxPQUFPLFFBQVEsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFBLEdBQU0sRUFBQSxDQUFDO0VBQ3JEO0FBQ0EsYUFBVyxDQUFHLFVBQVMsVUFBUyxDQUFHO0FBQy9CLE9BQUksTUFBTyxXQUFTLENBQUEsR0FBTSxZQUFVLENBQUEsRUFBSyxFQUFDLElBQUcsWUFBWSxBQUFDLEVBQUMsQ0FBQSxFQUFLLENBQUEsSUFBRyxhQUFhLEFBQUMsRUFBQyxDQUFDLENBQUc7QUFDbEYsU0FBRyxNQUFNLE9BQU8sRUFBSSxDQUFBLFVBQVMsRUFBSSxhQUFXLEVBQUksWUFBVSxDQUFDO0FBQzNELFNBQUcsVUFBVSxBQUFDLENBQUMsb0JBQW1CLENBQUMsQ0FBQztJQUN4QztBQUFBLEFBQ0EsU0FBTyxDQUFBLElBQUcsTUFBTSxPQUFPLFFBQVEsQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFBLEdBQU0sRUFBQSxDQUFDO0VBQ3hEO0FBQ0EsY0FBWSxDQUFHLFVBQVUsSUFBRyxDQUFHO0FBQzNCLE9BQUksSUFBRyxJQUFNLE1BQUksQ0FBRztBQUNoQixBQUFJLFFBQUEsQ0FBQSxXQUFVLEVBQUksRUFDZCxLQUFJLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FDckIsQ0FBQztBQUVELE1BQUEsT0FBTyxBQUFDLENBQUMsV0FBVSxDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBRTNCLFNBQUksQ0FBQyxXQUFVLEtBQUssQ0FBRztBQUNuQixrQkFBVSxLQUFLLEVBQUksQ0FBQSxNQUFLLEFBQUMsQ0FBQyxxQkFBb0IsQ0FBQyxDQUFDO01BQ3BEO0FBQUEsQUFFQSxTQUFJLFdBQVUsS0FBSyxDQUFHO0FBQ2xCLFlBQUksVUFBVSxLQUFLLEFBQUMsQ0FBQyxXQUFVLENBQUMsQ0FBQztBQUVqQyxXQUFJLFlBQVcsR0FBSyxDQUFBLFlBQVcsT0FBTyxDQUFHO0FBQ3JDLGNBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxZQUFXLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQzFDLHVCQUFXLENBQUUsQ0FBQSxDQUFDLEFBQUMsQ0FBQyxXQUFVLENBQUcsS0FBRyxDQUFDLENBQUM7VUFDdEM7QUFBQSxRQUNKO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxBQUVBLFFBQUksT0FBTyxFQUFJLFNBQU8sQ0FBQztBQUV2QixPQUFHLFVBQVUsQUFBQyxDQUFDLG1CQUFrQixDQUFDLENBQUM7QUFFbkMsT0FBRyxVQUFVLEFBQUMsQ0FBQyxtQkFBa0IsQ0FBRyxZQUFVLENBQUMsQ0FBQztFQUNwRDtBQUVBLGFBQVcsQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUN0QixBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxJQUFHLE1BQU0sU0FBUyxFQUFJLENBQUEsSUFBRyxNQUFNLFNBQVMsR0FBSyxJQUFJLFNBQU8sQUFBQyxDQUFDLENBQ3ZFLGNBQWEsQ0FBRyxLQUFHLENBQ3JCLENBQUMsQ0FBQztBQUNGLE9BQUksb0JBQW1CLE9BQU8sRUFBSSxFQUFBLENBQUEsRUFBSyxFQUFDLElBQUcsWUFBWSxBQUFDLEVBQUMsQ0FBQSxFQUFLLEVBQUMsSUFBRyxVQUFVLEFBQUMsRUFBQyxDQUFHO0FBQzdFLFdBQU8sSUFBSSxRQUFNLEFBQUMsQ0FBQyxTQUFVLE9BQU0sQ0FBRyxDQUFBLE1BQUssQ0FBRztBQUMxQywyQkFBbUIsQ0FBRSxDQUFBLENBQUMsQUFBQyxDQUFDLFNBQVUsSUFBRyxDQUFHO0FBQ3BDLGlCQUFPLFlBQVksQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO0FBQzFCLGdCQUFNLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztRQUNyQixDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQ1gsZ0JBQU0sQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO1FBQ3JCLENBQUMsQ0FBQztNQUNOLENBQUMsQ0FBQztJQUNOLEtBQU87QUFDSCxXQUFPLENBQUEsT0FBTSxRQUFRLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztJQUNwQztBQUFBLEVBQ0o7QUFFQSxxQkFBbUIsQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUM5QixBQUFJLE1BQUEsQ0FBQSxZQUFXLEVBQUksQ0FBQSxZQUFXLFFBQVEsQUFBQyxDQUFDLE1BQUssQ0FBQyxDQUFDO0FBQy9DLE9BQUksWUFBVyxDQUFHO0FBQ2QsVUFBSSxFQUFJLENBQUEsSUFBRyxNQUFNLEFBQUMsQ0FBQyxZQUFXLENBQUMsQ0FBQztBQUVoQyxTQUFJLEtBQUksU0FBUyxDQUFHO0FBQ2hCLEFBQUksVUFBQSxDQUFBLFdBQVUsRUFBSSxJQUFJLFNBQU8sQUFBQyxFQUFDLENBQUM7QUFDaEMsa0JBQVUsU0FBUyxFQUFJLENBQUEsS0FBSSxTQUFTLFNBQVMsQ0FBQztBQUM5QyxrQkFBVSxTQUFTLEVBQUksQ0FBQSxLQUFJLFNBQVMsZ0JBQWdCLENBQUM7QUFDckQsWUFBSSxTQUFTLEVBQUksWUFBVSxDQUFDO01BQ2hDO0FBQUEsSUFDSixLQUFPO0FBQ0gsVUFBSSxFQUFJO0FBQ0osYUFBSyxDQUFHLGVBQWE7QUFDckIsZ0JBQVEsQ0FBRyxHQUFDO0FBQUEsTUFDaEIsQ0FBQztJQUNMO0FBQUEsQUFDQSxTQUFPLE1BQUksQ0FBQztFQUNoQjtBQUVBLG1CQUFpQixDQUFHLFVBQVUsU0FBUSxDQUFHO0FBQ3JDLE9BQUksU0FBUSxDQUFHO0FBQ1gsaUJBQVcsUUFBUSxBQUFDLENBQUMsTUFBSyxDQUFHLENBQUEsSUFBRyxVQUFVLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzNELEtBQU87QUFDSCxpQkFBVyxXQUFXLEFBQUMsQ0FBQyxNQUFLLENBQUMsQ0FBQztJQUNuQztBQUFBLEVBQ0o7QUFFQSxPQUFLLENBQUcsVUFBUyxBQUFDLENBQUU7QUFDaEIsT0FBRyxtQkFBbUIsQUFBQyxDQUFDLEtBQUksQ0FBQyxDQUFDO0VBQ2xDO0FBQUEsQUFDSixDQUFDO0FBRUQsT0FBUyxnQkFBYyxDQUFFLEdBQUUsQ0FBRyxDQUFBLEtBQUksQ0FBRztBQUNqQyxFQUFBLEFBQUMsQ0FBQyxHQUFFLENBQUMsWUFBWSxBQUFDLENBQUMsYUFBWSxDQUFHLE1BQUksQ0FBQyxDQUFDO0FBQzVDO0FBQUEsQUFFQSxPQUFTLFlBQVUsQ0FBRSxHQUFFLENBQUcsQ0FBQSxLQUFJLENBQUc7QUFDN0IsRUFBQSxBQUFDLENBQUMsR0FBRSxDQUFDLFlBQVksQUFBQyxDQUFDLFlBQVcsQ0FBRyxNQUFJLENBQUMsQ0FBQztBQUMzQztBQUFBLEFBT0EsT0FBUyxvQkFBa0IsQ0FBRSxHQUFFLENBQUc7QUFDOUIsT0FBTyxDQUFBLENBQUEsQUFBQyxDQUFDLEdBQUUsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxPQUFNLENBQUMsT0FBTyxHQUFLLEVBQUEsQ0FBQSxFQUNuQyxDQUFBLEdBQUUsU0FBUyxZQUFZLEFBQUMsRUFBQyxDQUFBLEVBQUssUUFBTSxDQUFDO0FBQy9DO0FBQUEsQUFLQSxPQUFTLGlCQUFlLENBQUUsR0FBRSxDQUFHO0FBQzdCLE9BQU8sQ0FBQSxDQUFDLEdBQUUsYUFBYSxDQUFBLEVBQUssQ0FBQSxHQUFFLGFBQWEsQUFBQyxDQUFDLGFBQVksQ0FBQyxDQUFBLEVBQUssQ0FBQSxDQUFBLEFBQUMsQ0FBQyxHQUFFLENBQUMsUUFBUSxBQUFDLENBQUMsZUFBYyxDQUFDLE9BQU8sRUFBSSxFQUFBLENBQUM7QUFDM0c7QUFBQSxBQUtBLE9BQVMsa0JBQWdCLENBQUUsR0FBRSxDQUFHLENBQUEsR0FBRSxDQUFHO0FBQ25DLEFBQUksSUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLElBQUcsTUFBTSxTQUFTLElBQUksQUFBQyxDQUFDLGtCQUFpQixFQUFJLElBQUUsQ0FBQyxDQUFDO0FBQy9ELEFBQUksSUFBQSxDQUFBLGFBQVksRUFBSSxFQUFDLE9BQU0sSUFBTSxLQUFHLENBQUEsRUFBSyxDQUFBLE9BQU0sSUFBTSxPQUFLLENBQUEsRUFBSyxDQUFBLE1BQU8sUUFBTSxDQUFBLEdBQU0sWUFBVSxDQUFDLENBQUM7QUFDOUYsT0FBTyxDQUFBLElBQUcsWUFBWSxBQUFDLEVBQUMsQ0FBQSxFQUFLLGNBQVksQ0FBQSxFQUFLLENBQUEsbUJBQWtCLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQztBQUN4RTtBQUFBLEFBRUksRUFBQSxDQUFBLE1BQUssRUFBSSxHQUFDLENBQUM7QUFFZixPQUFTLGtCQUFnQixDQUFDLEFBQUMsQ0FBRTtBQUV6QixNQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLENBQUEsTUFBSyxPQUFPLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUNwQyxXQUFPLGlCQUFpQixBQUFDLENBQUMsTUFBSyxDQUFFLENBQUEsQ0FBQyxDQUFHLENBQUEsQ0FBQyxTQUFVLEdBQUUsQ0FBRztBQUNqRCxBQUFJLFFBQUEsQ0FBQSxPQUFNLEVBQUksVUFBVSxDQUFBLENBQUc7QUFDdkIsV0FBSSxDQUFBLFVBQVU7QUFDVixnQkFBTTtBQUFBLEFBRVYsV0FBSSxDQUFDLGdCQUFlLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBQyxDQUFBLEVBQUssQ0FBQSxJQUFHLFlBQVksQUFBQyxFQUFDLENBQUc7QUFFakQsQUFBSSxZQUFBLENBQUEsR0FBRSxFQUFJLENBQUEsSUFBRyxNQUFNLE1BQU0sT0FBTyxDQUFDO0FBQ2pDLEFBQUksWUFBQSxDQUFBLElBQUcsRUFBSSxFQUNULE9BQU0sQ0FBRyxDQUFBLElBQUcscUJBQXFCLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBQyxDQUM3QyxDQUFDO0FBQ0QsQUFBSSxZQUFBLENBQUEsS0FBSSxDQUFDO0FBRVQsYUFBSSxHQUFFLEdBQUssWUFBVSxDQUFHO0FBQ3BCLDBCQUFjLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBRyxLQUFHLENBQUMsQ0FBQztBQUMvQixpQkFBSyxLQUFLLEFBQUMsQ0FBQztBQUNSLG9CQUFNLENBQUcsQ0FBQSxDQUFBLE9BQU87QUFDaEIsa0JBQUksQ0FBRyxDQUFBLFVBQVMsQUFBQyxDQUFDLFNBQVMsQUFBQyxDQUFFO0FBQzFCLDBCQUFVLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBRyxLQUFHLENBQUMsQ0FBQztBQUMzQiw4QkFBYyxBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUcsTUFBSSxDQUFDLENBQUM7Y0FDcEMsQ0FBRyxJQUFFLENBQUM7QUFBQSxZQUNWLENBQUMsQ0FBQztVQUNOO0FBQUEsQUFFQSxhQUFJLEdBQUUsR0FBSyxXQUFTLENBQUc7QUFDbkIsZ0JBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxNQUFLLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQ3BDLGlCQUFJLE1BQUssQ0FBRSxDQUFBLENBQUMsUUFBUSxHQUFLLENBQUEsQ0FBQSxPQUFPLENBQUc7QUFDL0IsMkJBQVcsQUFBQyxDQUFDLE1BQUssQ0FBRSxDQUFBLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IscUJBQUssT0FBTyxBQUFDLENBQUMsQ0FBQSxDQUFHLEVBQUEsQ0FBQyxDQUFDO0FBQ25CLHFCQUFLO2NBQ1Q7QUFBQSxZQUNKO0FBQUEsQUFDQSwwQkFBYyxBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUcsTUFBSSxDQUFDLENBQUM7QUFDaEMsc0JBQVUsQUFBQyxDQUFDLENBQUEsT0FBTyxDQUFHLE1BQUksQ0FBQyxDQUFDO1VBQ2hDO0FBQUEsQUFFQSxhQUFJLGlCQUFnQixBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUcsSUFBRSxDQUFDLENBQUc7QUFDcEMsZUFBSSxDQUFBLE1BQU0sR0FBSyxDQUFBLENBQUEsT0FBTyxDQUFHO0FBQ3ZCLGlCQUFHLE9BQU8sRUFBSSxDQUFBLENBQUEsTUFBTSxHQUFLLENBQUEsQ0FBQSxPQUFPLENBQUM7WUFDbkM7QUFBQSxBQUVBLGVBQUksR0FBRSxHQUFLLFNBQU8sQ0FBRztBQUNuQixpQkFBRyxXQUFXLEVBQUk7QUFDaEIsc0JBQU0sQ0FBSSxDQUFBLENBQUEsT0FBTyxNQUFNO0FBQ3ZCLHdCQUFRLENBQUcsQ0FBQSxDQUFBLE9BQU8sUUFBUTtBQUMxQix5QkFBUyxDQUFHLENBQUEsQ0FBQSxPQUFPLFNBQVM7QUFBQSxjQUM5QixDQUFDO1lBQ0g7QUFBQSxBQUVBLGVBQUcsY0FBYyxBQUFDLENBQUMsR0FBRSxDQUFHLEtBQUcsQ0FBRyxJQUFFLENBQUMsQ0FBQztVQUNwQztBQUFBLFFBQ047QUFBQSxNQUVKLENBQUM7QUFHRCxNQUFDLElBQUcsZUFBZSxFQUFJLENBQUEsSUFBRyxlQUFlLEdBQUssR0FBQyxDQUFDLENBQUUsR0FBRSxDQUFDLEVBQUksUUFBTSxDQUFDO0FBQ2hFLFdBQU8sUUFBTSxDQUFDO0lBQ2xCLENBQUMsQUFBQyxDQUFDLE1BQUssQ0FBRSxDQUFBLENBQUMsQ0FBQyxDQUFHLEtBQUcsQ0FBQyxDQUFDO0VBQ3hCO0FBQUEsQUFFSSxJQUFBLENBQUEsU0FBUSxFQUFJO0FBQ1osUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQUEsRUFDZCxDQUFDO0FBRUQsQUFBSSxJQUFBLENBQUEsUUFBTyxFQUFJO0FBQ1gsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxLQUFHO0FBQ1QsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQUEsRUFDWixDQUFDO0FBRUQsU0FBUyxnQkFBYyxDQUFHLENBQUEsQ0FBRztBQUN6QixPQUFJLENBQUEsVUFBVTtBQUNWLFlBQU07QUFBQSxBQUVWLE9BQUksQ0FBQyxnQkFBZSxBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUMsQ0FBQSxFQUFLLENBQUEsaUJBQWdCLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBRyxXQUFTLENBQUMsQ0FBRztBQUN4RSxBQUFJLFFBQUEsQ0FBQSxDQUFBLEVBQUksQ0FBQSxDQUFBLE1BQU0sQ0FBQztBQUlmLFNBQUksU0FBUSxlQUFlLEFBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBRztBQUM3QixRQUFBLEVBQUksQ0FBQSxTQUFRLENBQUUsQ0FBQSxDQUFDLENBQUM7TUFDcEI7QUFBQSxBQUVBLFNBQUksQ0FBQyxDQUFBLFNBQVMsQ0FBQSxFQUFLLEVBQUMsQ0FBQSxHQUFLLEdBQUMsQ0FBQSxFQUFLLENBQUEsQ0FBQSxHQUFLLEdBQUMsQ0FBQyxDQUFHO0FBQ3JDLFFBQUEsRUFBSSxDQUFBLE1BQUssYUFBYSxBQUFDLENBQUMsQ0FBQSxFQUFJLEdBQUMsQ0FBQyxDQUFDO01BQ25DLEtBQU8sS0FBSSxDQUFBLFNBQVMsR0FBSyxDQUFBLFFBQU8sZUFBZSxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUc7QUFFakQsUUFBQSxFQUFJLENBQUEsUUFBTyxDQUFFLENBQUEsQ0FBQyxDQUFDO01BQ25CLEtBQU87QUFDSCxRQUFBLEVBQUksQ0FBQSxNQUFLLGFBQWEsQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO01BQzlCO0FBQUEsQUFFQSxTQUFHLGNBQWMsQUFBQyxDQUFDLFVBQVMsQ0FBRztBQUMzQixjQUFNLENBQUcsQ0FBQSxJQUFHLHFCQUFxQixBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUM7QUFDM0MsVUFBRSxDQUFHLEVBQUE7QUFDTCxnQkFBUSxDQUFHLENBQUEsQ0FBQSxPQUFPLE1BQU07QUFDeEIsWUFBSSxDQUFHLENBQUEsQ0FBQSxPQUFPLE1BQU0sRUFBSSxFQUFBO0FBQ3hCLGNBQU0sQ0FBRyxDQUFBLENBQUEsUUFBUTtBQUFBLE1BQ3JCLENBQUMsQ0FBQztJQUNOO0FBQUEsRUFDSjtBQUFBLEFBRUEsU0FBTyxpQkFBaUIsQUFBQyxDQUFDLFVBQVMsQ0FBRyxnQkFBYyxDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBRzVELEVBQUMsSUFBRyxlQUFlLEVBQUksQ0FBQSxJQUFHLGVBQWUsR0FBSyxHQUFDLENBQUMsQ0FBRSxVQUFTLENBQUMsRUFBSSxnQkFBYyxDQUFDO0FBQ25GO0FBQUEsQUFFQSxPQUFTLG1CQUFpQixDQUFFLElBQUcsQ0FBRztBQUM5QixLQUFHLEVBQUksQ0FBQSxJQUFHLFFBQVEsQUFBQyxDQUFDLE1BQUssQ0FBRyxNQUFJLENBQUMsUUFBUSxBQUFDLENBQUMsTUFBSyxDQUFHLE1BQUksQ0FBQyxDQUFDO0FBQ3pELEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxJQUFJLE9BQUssQUFBQyxDQUFDLFFBQU8sRUFBSSxLQUFHLENBQUEsQ0FBSSxZQUFVLENBQUM7QUFDaEQsWUFBTSxFQUFJLENBQUEsS0FBSSxLQUFLLEFBQUMsQ0FBQyxRQUFPLE9BQU8sQ0FBQyxDQUFDO0FBQ3pDLE9BQU8sQ0FBQSxPQUFNLElBQU0sS0FBRyxDQUFBLENBQUksR0FBQyxFQUFJLENBQUEsa0JBQWlCLEFBQUMsQ0FBQyxPQUFNLENBQUUsQ0FBQSxDQUFDLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxJQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3JGO0FBQUEsQUFFQSxPQUFTLGNBQVksQ0FBQyxBQUFDLENBQUU7QUFDdkIsS0FBSSxRQUFPLFdBQVcsR0FBSyxXQUFTLENBQUc7QUFDckMsT0FBRyxLQUFLLEFBQUMsRUFBQyxLQUFLLEFBQUMsQ0FBQyxTQUFTLEFBQUMsQ0FBRTtBQUV6QixzQkFBZ0IsQUFBQyxFQUFDLENBQUM7QUFFbkIsU0FBSSxJQUFHLFlBQVksQUFBQyxFQUFDLENBQUc7QUFDcEIsV0FBRyxjQUFjLEFBQUMsQ0FBQyxNQUFLLENBQUcsRUFDdkIsR0FBRSxDQUFHO0FBQ0QsbUJBQU8sQ0FBRyxDQUFBLE1BQUssU0FBUyxTQUFTO0FBQ2pDLGVBQUcsQ0FBRyxDQUFBLE1BQUssU0FBUyxLQUFLO0FBQ3pCLGlCQUFLLENBQUcsQ0FBQSxNQUFLLFNBQVMsT0FBTztBQUM3QixlQUFHLENBQUcsQ0FBQSxNQUFLLFNBQVMsS0FBSztBQUFBLFVBQzdCLENBQ0osQ0FBQyxDQUFDO01BQ047QUFBQSxJQUNKLENBQUMsQ0FBQztFQUNKO0FBQUEsQUFDRjtBQUFBLEFBRUEsWUFBWSxBQUFDLEVBQUMsQ0FBQztBQUNmLE9BQU8saUJBQWlCLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBRyxjQUFZLENBQUMsQ0FBQztBQUU1RCxLQUFLLGlCQUFpQixBQUFDLENBQUMsUUFBTyxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQzFDLEtBQUcsT0FBTyxBQUFDLEVBQUMsQ0FBQztBQUNqQixDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBRVIsS0FBSyxpQkFBaUIsQUFBQyxDQUFDLE9BQU0sQ0FBRyxVQUFVLEdBQUUsQ0FBRztBQUM1QyxLQUFHLFVBQVUsQUFBQyxDQUFDLGdCQUFlLEVBQUksQ0FBQSxHQUFFLFFBQVEsQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxJQUFJLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsS0FBSyxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLElBQUksQ0FBQyxDQUFDO0FBQ25HLENBQUMsQ0FBQztBQUVGLEtBQUssUUFBUSxFQUFJLEtBQUcsQ0FBQztBQUV3OCtFIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4xXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRfaXNBcnJheTtcblxuICAgIGlmICghQXJyYXkuaXNBcnJheSkge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRpc0FycmF5ID0gJCR1dGlscyQkX2lzQXJyYXk7XG4gICAgdmFyICQkdXRpbHMkJG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG4gICAgZnVuY3Rpb24gJCR1dGlscyQkRigpIHsgfVxuXG4gICAgdmFyICQkdXRpbHMkJG9fY3JlYXRlID0gKE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY29uZCBhcmd1bWVudCBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICAkJHV0aWxzJCRGLnByb3RvdHlwZSA9IG87XG4gICAgICByZXR1cm4gbmV3ICQkdXRpbHMkJEYoKTtcbiAgICB9KTtcblxuICAgIHZhciAkJGFzYXAkJGxlbiA9IDA7XG5cbiAgICB2YXIgJCRhc2FwJCRkZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuXSA9IGNhbGxiYWNrO1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgJCRhc2FwJCRsZW4gKz0gMjtcbiAgICAgIGlmICgkJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gICAgdmFyICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyICQkYXNhcCQkaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygkJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3ICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoJCRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gJCRhc2FwJCRmbHVzaDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dCgkJGFzYXAkJGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSAkJGFzYXAkJHF1ZXVlW2ldO1xuICAgICAgICB2YXIgYXJnID0gJCRhc2FwJCRxdWV1ZVtpKzFdO1xuXG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpKzFdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAkJGFzYXAkJGxlbiA9IDA7XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkc2NoZWR1bGVGbHVzaDtcblxuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkbm9vcCgpIHt9XG4gICAgdmFyICQkJGludGVybmFsJCRQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyICQkJGludGVybmFsJCRGVUxGSUxMRUQgPSAxO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVycm9yID0gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gICAgICBpZiAodGhlbmFibGUuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gJCQkaW50ZXJuYWwkJGdldFRoZW4obWF5YmVUaGVuYWJsZSk7XG5cbiAgICAgICAgaWYgKHRoZW4gPT09ICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSAkJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAvLyBub29wXG4gICAgICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJG1ha2VTZXR0bGVkUmVzdWx0KHN0YXRlLCBwb3NpdGlvbiwgdmFsdWUpIHtcbiAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAnZnVsZmlsbGVkJyxcbiAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdyZWplY3RlZCcsXG4gICAgICAgICAgcmVhc29uOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0LCBhYm9ydE9uUmVqZWN0LCBsYWJlbCkge1xuICAgICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICB0aGlzLl9hYm9ydE9uUmVqZWN0ID0gYWJvcnRPblJlamVjdDtcblxuICAgICAgaWYgKHRoaXMuX3ZhbGlkYXRlSW5wdXQoaW5wdXQpKSB7XG4gICAgICAgIHRoaXMuX2lucHV0ICAgICA9IGlucHV0O1xuICAgICAgICB0aGlzLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgICB0aGlzLl9pbml0KCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgICB0aGlzLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHRoaXMucHJvbWlzZSwgdGhpcy5fdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiAkJHV0aWxzJCRpc0FycmF5KGlucHV0KTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRpb25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgJCQkZW51bWVyYXRvciQkZGVmYXVsdCA9ICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3I7XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGVuZ3RoICA9IHRoaXMubGVuZ3RoO1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG4gICAgICB2YXIgaW5wdXQgICA9IHRoaXMuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICAgIGlmICgkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgZW50cnkuX29uZXJyb3IgPSBudWxsO1xuICAgICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChjLnJlc29sdmUoZW50cnkpLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgZW50cnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcblxuICAgICAgICBpZiAodGhpcy5fYWJvcnRPblJlamVjdCAmJiBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdChzdGF0ZSwgaSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX21ha2VSZXN1bHQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFsbChlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgcmV0dXJuIG5ldyAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0KHRoaXMsIGVudHJpZXMsIHRydWUgLyogYWJvcnQgb24gcmVqZWN0ICovLCBsYWJlbCkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmFjZShlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG5cbiAgICAgIGlmICghJCR1dGlscyQkaXNBcnJheShlbnRyaWVzKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbG1lbnQodmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVzb2x2ZShvYmplY3QsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVqZWN0KHJlYXNvbiwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyID0gMDtcblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0ID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlO1xuXG4gICAgLyoqXG4gICAgICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gICAgICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICAgICAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2XigJlzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICB0aGlzLl9pZCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlcisrO1xuICAgICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgICBpZiAoJCQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gJCRwcm9taXNlJGFsbCQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9ICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZXNvbHZlID0gJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9ICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQ7XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBzdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQgJiYgIW9uUmVqZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJlbnQuX3Jlc3VsdDtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbc3RhdGUgLSAxXTtcbiAgICAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSxcblxuICAgIC8qKlxuICAgICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmNocm9ub3VzXG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQXV0aG9yKCk7XG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfVxuXG4gICAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgY2F0Y2hcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQpIHtcbiAgICAgICAgbG9jYWwgPSB3aW5kb3c7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHZhciBlczZQcm9taXNlU3VwcG9ydCA9XG4gICAgICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgICAgIC8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgbWlzc2luZyBmcm9tXG4gICAgICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJlamVjdFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgLy8gT2xkZXIgdmVyc2lvbiBvZiB0aGUgc3BlYyBoYWQgYSByZXNvbHZlciBvYmplY3RcbiAgICAgICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZTtcbiAgICAgICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgICAgICByZXR1cm4gJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgICAgICBsb2NhbC5Qcm9taXNlID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0O1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlID0ge1xuICAgICAgJ1Byb21pc2UnOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzWydFUzZQcm9taXNlJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxufSkuY2FsbCh0aGlzKTsiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMjAxNC0xMi0xN1xuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IFgxMS9NSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBc1xuICAvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG4gIHx8ICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYi5iaW5kKG5hdmlnYXRvcikpXG4gIC8vIEV2ZXJ5b25lIGVsc2VcbiAgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG5cdCAgICAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBkb2MuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcblx0XHRcdGV2ZW50LmluaXRNb3VzZUV2ZW50KFxuXHRcdFx0XHRcImNsaWNrXCIsIHRydWUsIGZhbHNlLCB2aWV3LCAwLCAwLCAwLCAwLCAwXG5cdFx0XHRcdCwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIG51bGxcblx0XHRcdCk7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIHdlYmtpdF9yZXFfZnMgPSB2aWV3LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtXG5cdFx0LCByZXFfZnMgPSB2aWV3LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdlYmtpdF9yZXFfZnMgfHwgdmlldy5tb3pSZXF1ZXN0RmlsZVN5c3RlbVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdCwgZnNfbWluX3NpemUgPSAwXG5cdFx0Ly8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zNzUyOTcjYzcgYW5kXG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2NvbW1pdC80ODU5MzBhI2NvbW1pdGNvbW1lbnQtODc2ODA0N1xuXHRcdC8vIGZvciB0aGUgcmVhc29uaW5nIGJlaGluZCB0aGUgdGltZW91dCBhbmQgcmV2b2NhdGlvbiBmbG93XG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSA1MDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRpZiAodmlldy5jaHJvbWUpIHtcblx0XHRcdFx0cmV2b2tlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUpIHtcblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGJsb2JfY2hhbmdlZCA9IGZhbHNlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIHRhcmdldF92aWV3XG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKGJsb2JfY2hhbmdlZCB8fCAhb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0YXJnZXRfdmlldykge1xuXHRcdFx0XHRcdFx0dGFyZ2V0X3ZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBuZXdfdGFiID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKG5ld190YWIgPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBzYWZhcmkgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0XHRcdFx0Ly9BcHBsZSBkbyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwOi8vYml0Lmx5LzFrWmZmUklcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGFib3J0YWJsZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoZmlsZXNhdmVyLnJlYWR5U3RhdGUgIT09IGZpbGVzYXZlci5ET05FKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGNyZWF0ZV9pZl9ub3RfZm91bmQgPSB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfVxuXHRcdFx0XHQsIHNsaWNlXG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0aWYgKCFuYW1lKSB7XG5cdFx0XHRcdG5hbWUgPSBcImRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gT2JqZWN0IGFuZCB3ZWIgZmlsZXN5c3RlbSBVUkxzIGhhdmUgYSBwcm9ibGVtIHNhdmluZyBpbiBHb29nbGUgQ2hyb21lIHdoZW5cblx0XHRcdC8vIHZpZXdlZCBpbiBhIHRhYiwgc28gSSBmb3JjZSBzYXZlIHdpdGggYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXG5cdFx0XHQvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD05MTE1OFxuXHRcdFx0Ly8gVXBkYXRlOiBHb29nbGUgZXJyYW50bHkgY2xvc2VkIDkxMTU4LCBJIHN1Ym1pdHRlZCBpdCBhZ2Fpbjpcblx0XHRcdC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zODk2NDJcblx0XHRcdGlmICh2aWV3LmNocm9tZSAmJiB0eXBlICYmIHR5cGUgIT09IGZvcmNlX3NhdmVhYmxlX3R5cGUpIHtcblx0XHRcdFx0c2xpY2UgPSBibG9iLnNsaWNlIHx8IGJsb2Iud2Via2l0U2xpY2U7XG5cdFx0XHRcdGJsb2IgPSBzbGljZS5jYWxsKGJsb2IsIDAsIGJsb2Iuc2l6ZSwgZm9yY2Vfc2F2ZWFibGVfdHlwZSk7XG5cdFx0XHRcdGJsb2JfY2hhbmdlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHQvLyBTaW5jZSBJIGNhbid0IGJlIHN1cmUgdGhhdCB0aGUgZ3Vlc3NlZCBtZWRpYSB0eXBlIHdpbGwgdHJpZ2dlciBhIGRvd25sb2FkXG5cdFx0XHQvLyBpbiBXZWJLaXQsIEkgYXBwZW5kIC5kb3dubG9hZCB0byB0aGUgZmlsZW5hbWUuXG5cdFx0XHQvLyBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjU0NDBcblx0XHRcdGlmICh3ZWJraXRfcmVxX2ZzICYmIG5hbWUgIT09IFwiZG93bmxvYWRcIikge1xuXHRcdFx0XHRuYW1lICs9IFwiLmRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZSB8fCB3ZWJraXRfcmVxX2ZzKSB7XG5cdFx0XHRcdHRhcmdldF92aWV3ID0gdmlldztcblx0XHRcdH1cblx0XHRcdGlmICghcmVxX2ZzKSB7XG5cdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGZzX21pbl9zaXplICs9IGJsb2Iuc2l6ZTtcblx0XHRcdHJlcV9mcyh2aWV3LlRFTVBPUkFSWSwgZnNfbWluX3NpemUsIGFib3J0YWJsZShmdW5jdGlvbihmcykge1xuXHRcdFx0XHRmcy5yb290LmdldERpcmVjdG9yeShcInNhdmVkXCIsIGNyZWF0ZV9pZl9ub3RfZm91bmQsIGFib3J0YWJsZShmdW5jdGlvbihkaXIpIHtcblx0XHRcdFx0XHR2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZGlyLmdldEZpbGUobmFtZSwgY3JlYXRlX2lmX25vdF9mb3VuZCwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0ZmlsZS5jcmVhdGVXcml0ZXIoYWJvcnRhYmxlKGZ1bmN0aW9uKHdyaXRlcikge1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldF92aWV3LmxvY2F0aW9uLmhyZWYgPSBmaWxlLnRvVVJMKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlZW5kXCIsIGV2ZW50KTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldm9rZShmaWxlKTtcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgZXJyb3IgPSB3cml0ZXIuZXJyb3I7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZXJyb3IuY29kZSAhPT0gZXJyb3IuQUJPUlRfRVJSKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgYWJvcnRcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyW1wib25cIiArIGV2ZW50XSA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF07XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLndyaXRlKGJsb2IpO1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyLmFib3J0KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuV1JJVElORztcblx0XHRcdFx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdFx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRkaXIuZ2V0RmlsZShuYW1lLCB7Y3JlYXRlOiBmYWxzZX0sIGFib3J0YWJsZShmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRcdFx0XHQvLyBkZWxldGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0c1xuXHRcdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdHNhdmUoKTtcblx0XHRcdFx0XHR9KSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXguY29kZSA9PT0gZXguTk9UX0ZPVU5EX0VSUikge1xuXHRcdFx0XHRcdFx0XHRzYXZlKCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmc19lcnJvcigpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lKTtcblx0XHR9XG5cdDtcblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgZmlsZXNhdmVyID0gdGhpcztcblx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJhYm9ydFwiKTtcblx0fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPSBudWxsKSkge1xuICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZScpO1xudmFyIHNhdmVBcyA9IHJlcXVpcmUoJ2ZpbGVzYXZlci5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgIHZhciBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KHNjZW5hcmlvLCBudWxsLCBcIiBcIildLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pO1xuICAgc2F2ZUFzKGJsb2IsIHNjZW5hcmlvLm5hbWUgKyBcIi5qc29uXCIpO1xufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lJc0luTnZkWEpqWlhNaU9sc2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFTeEpRVUZKTEVsQlFVa3NSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UVVGRE9VSXNTVUZCU1N4TlFVRk5MRWRCUVVjc1QwRkJUeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZET3p0QlFVVnlReXhOUVVGTkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eFZRVUZWTEZGQlFWRXNSVUZCUlR0SFFVTXpSQ3hKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zU1VGQlNTeEZRVUZGTERCQ1FVRXdRaXhEUVVGRExFTkJRVU1zUTBGQlF6dEhRVU12Uml4TlFVRk5MRU5CUVVNc1NVRkJTU3hGUVVGRkxGRkJRVkVzUTBGQlF5eEpRVUZKTEVkQlFVY3NUMEZCVHl4RFFVRkRMRU5CUVVNN1EwRkRlRU1zUTBGQlF5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCMWRHMWxJRDBnY21WeGRXbHlaU2duTGk0dmRYUnRaU2NwTzF4dWRtRnlJSE5oZG1WQmN5QTlJSEpsY1hWcGNtVW9KMlpwYkdWellYWmxjaTVxY3ljcE8xeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSFYwYldVdWNtVm5hWE4wWlhKVFlYWmxTR0Z1Wkd4bGNpaG1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lIWmhjaUJpYkc5aUlEMGdibVYzSUVKc2IySW9XMHBUVDA0dWMzUnlhVzVuYVdaNUtITmpaVzVoY21sdkxDQnVkV3hzTENCY0lpQmNJaWxkTENCN2RIbHdaVG9nWENKMFpYaDBMM0JzWVdsdU8yTm9ZWEp6WlhROWRYUm1MVGhjSW4wcE8xeHVJQ0FnYzJGMlpVRnpLR0pzYjJJc0lITmpaVzVoY21sdkxtNWhiV1VnS3lCY0lpNXFjMjl1WENJcE8xeHVmU2s3SWwxOSIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZS5qcycpO1xuXG5mdW5jdGlvbiBnZXRCYXNlVVJMICgpIHtcbiAgcmV0dXJuIHV0bWUuc3RhdGUgJiYgdXRtZS5zdGF0ZS50ZXN0U2VydmVyID8gdXRtZS5zdGF0ZS50ZXN0U2VydmVyIDogZ2V0UGFyYW1ldGVyQnlOYW1lKFwidXRtZV90ZXN0X3NlcnZlclwiKSB8fCBcImh0dHA6Ly8wLjAuMC4wOjkwNDMvXCI7XG59XG5cbnZhciBzZXJ2ZXJSZXBvcnRlciA9IHtcbiAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJlcnJvclwiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogZXJyb3IgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcImNvbnNvbGVMb2dnaW5nXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChzdWNjZXNzLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJzdWNjZXNzXCIsXG4gICAgICAgICAgZGF0YTogeyBkYXRhOiBzdWNjZXNzIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoXCJjb25zb2xlTG9nZ2luZ1wiKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKHN1Y2Nlc3MpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBsb2c6IGZ1bmN0aW9uIChsb2csIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiAgZ2V0QmFzZVVSTCgpICsgXCJsb2dcIixcbiAgICAgICAgICBkYXRhOiB7IGRhdGE6IGxvZyB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwiY29uc29sZUxvZ2dpbmdcIikpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhsb2cpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxvYWRTY2VuYXJpbzogZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICBqc29ucDogXCJjYWxsYmFja1wiLFxuXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG5cbiAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxuXG4gICAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcInNjZW5hcmlvL1wiICsgbmFtZSxcblxuICAgICAgICAgICAgLy8gdGVsbCBqUXVlcnkgd2UncmUgZXhwZWN0aW5nIEpTT05QXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgc2F2ZVNjZW5hcmlvOiBmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6IGdldEJhc2VVUkwoKSArIFwic2NlbmFyaW9cIixcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShzY2VuYXJpbywgbnVsbCwgXCIgXCIpLFxuICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBsb2FkU2V0dGluZ3M6IGZ1bmN0aW9uIChjYWxsYmFjaywgZXJyb3IpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJcIixcbiAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxuICAgICAgICAgICAgdXJsOiAgZ2V0QmFzZVVSTCgpICsgXCJzZXR0aW5nc1wiLFxuICAgICAgICAgICAgLy8gdGVsbCBqUXVlcnkgd2UncmUgZXhwZWN0aW5nIEpTT05QXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG51dG1lLnJlZ2lzdGVyUmVwb3J0SGFuZGxlcihzZXJ2ZXJSZXBvcnRlcik7XG51dG1lLnJlZ2lzdGVyTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNjZW5hcmlvKTtcbnV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5zYXZlU2NlbmFyaW8pO1xudXRtZS5yZWdpc3RlclNldHRpbmdzTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNldHRpbmdzKTtcblxuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyQnlOYW1lKG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufVxuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzSmxjRzl5ZEdWeWN5OXpaWEoyWlhJdGNtVndiM0owWlhJdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5b2IyMWxMMlJoZG1sa2RHbDBkSE4zYjNKMGFDOXdjbTlxWldOMGN5OTFkRzFsTDNOeVl5OXFjeTl5WlhCdmNuUmxjbk12YzJWeWRtVnlMWEpsY0c5eWRHVnlMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzU1VGQlNTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenM3UVVGRmFrTXNVMEZCVXl4VlFVRlZMRWxCUVVrN1JVRkRja0lzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVlVGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVsQlFVa3NjMEpCUVhOQ0xFTkJRVU03UVVGRGVFa3NRMEZCUXpzN1FVRkZSQ3hKUVVGSkxHTkJRV01zUjBGQlJ6dEpRVU5xUWl4TFFVRkxMRVZCUVVVc1ZVRkJWU3hMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlR0UlFVTndReXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETzFWQlEwd3NTVUZCU1N4RlFVRkZMRTFCUVUwN1ZVRkRXaXhIUVVGSExFVkJRVVVzVlVGQlZTeEZRVUZGTEVkQlFVY3NUMEZCVHp0VlFVTXpRaXhKUVVGSkxFVkJRVVVzUlVGQlJTeEpRVUZKTEVWQlFVVXNTMEZCU3l4RlFVRkZPMVZCUTNKQ0xGRkJRVkVzUlVGQlJTeE5RVUZOTzFOQlEycENMRU5CUVVNc1EwRkJRenRSUVVOSUxFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExHZENRVUZuUWl4RFFVRkRMRVZCUVVVN1ZVRkROME1zVDBGQlR5eERRVUZETEV0QlFVc3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJRenRUUVVOMFFqdExRVU5LTzBsQlEwUXNUMEZCVHl4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRkxGRkJRVkVzUlVGQlJTeEpRVUZKTEVWQlFVVTdVVUZEZUVNc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF6dFZRVU5NTEVsQlFVa3NSVUZCUlN4TlFVRk5PMVZCUTFvc1IwRkJSeXhGUVVGRkxGVkJRVlVzUlVGQlJTeEhRVUZITEZOQlFWTTdWVUZETjBJc1NVRkJTU3hGUVVGRkxFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNSVUZCUlR0VlFVTjJRaXhSUVVGUkxFVkJRVVVzVFVGQlRUdFRRVU5xUWl4RFFVRkRMRU5CUVVNN1VVRkRTQ3hKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4RlFVRkZPMVZCUXpkRExFOUJRVThzUTBGQlF5eEhRVUZITEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1UwRkRkRUk3UzBGRFNqdEpRVU5FTEVkQlFVY3NSVUZCUlN4VlFVRlZMRWRCUVVjc1JVRkJSU3hSUVVGUkxFVkJRVVVzU1VGQlNTeEZRVUZGTzFGQlEyaERMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU03VlVGRFRDeEpRVUZKTEVWQlFVVXNUVUZCVFR0VlFVTmFMRWRCUVVjc1IwRkJSeXhWUVVGVkxFVkJRVVVzUjBGQlJ5eExRVUZMTzFWQlF6RkNMRWxCUVVrc1JVRkJSU3hGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVWQlFVVTdWVUZEYmtJc1VVRkJVU3hGUVVGRkxFMUJRVTA3VTBGRGFrSXNRMEZCUXl4RFFVRkRPMUZCUTBnc1NVRkJTU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNSVUZCUlR0VlFVTTNReXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUTJ4Q08wRkJRMVFzUzBGQlN6czdTVUZGUkN4WlFVRlpMRVZCUVVVc1ZVRkJWU3hKUVVGSkxFVkJRVVVzVVVGQlVTeEZRVUZGTzFGQlEzQkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU03UVVGRFppeFpRVUZaTEV0QlFVc3NSVUZCUlN4VlFVRlZPenRCUVVVM1FpeFpRVUZaTEZkQlFWY3NSVUZCUlN4cFEwRkJhVU03TzBGQlJURkVMRmxCUVZrc1YwRkJWeXhGUVVGRkxFbEJRVWs3TzBGQlJUZENMRmxCUVZrc1IwRkJSeXhIUVVGSExGVkJRVlVzUlVGQlJTeEhRVUZITEZkQlFWY3NSMEZCUnl4SlFVRkpPMEZCUTI1RU96dEJRVVZCTEZsQlFWa3NVVUZCVVN4RlFVRkZMRTlCUVU4N08xbEJSV3BDTEU5QlFVOHNSVUZCUlN4VlFVRlZMRWxCUVVrc1JVRkJSVHRuUWtGRGNrSXNVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRMnhDTzFOQlEwb3NRMEZCUXl4RFFVRkRPMEZCUTFnc1MwRkJTenM3U1VGRlJDeFpRVUZaTEVWQlFVVXNWVUZCVlN4UlFVRlJMRVZCUVVVN1VVRkRPVUlzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXp0VlFVTk1MRWxCUVVrc1JVRkJSU3hOUVVGTk8xVkJRMW9zUjBGQlJ5eEZRVUZGTEZWQlFWVXNSVUZCUlN4SFFVRkhMRlZCUVZVN1ZVRkRPVUlzU1VGQlNTeEZRVUZGTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVOQlFVTTdWVUZEZWtNc1VVRkJVU3hGUVVGRkxFMUJRVTA3VlVGRGFFSXNWMEZCVnl4RlFVRkZMR3RDUVVGclFqdFRRVU5vUXl4RFFVRkRMRU5CUVVNN1FVRkRXQ3hMUVVGTE96dEpRVVZFTEZsQlFWa3NSVUZCUlN4VlFVRlZMRkZCUVZFc1JVRkJSU3hMUVVGTExFVkJRVVU3VVVGRGNrTXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOSUxFbEJRVWtzUlVGQlJTeExRVUZMTzFsQlExZ3NWMEZCVnl4RlFVRkZMRVZCUVVVN1dVRkRaaXhYUVVGWExFVkJRVVVzU1VGQlNUdEJRVU0zUWl4WlFVRlpMRWRCUVVjc1IwRkJSeXhWUVVGVkxFVkJRVVVzUjBGQlJ5eFZRVUZWT3p0QlFVVXpReXhaUVVGWkxGRkJRVkVzUlVGQlJTeE5RVUZOT3p0WlFVVm9RaXhQUVVGUExFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVTdaMEpCUTNKQ0xGRkJRVkVzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnNRanRaUVVORUxFdEJRVXNzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlR0blFrRkRiRUlzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMkZCUTJRN1UwRkRTaXhEUVVGRExFTkJRVU03UzBGRFRqdEJRVU5NTEVOQlFVTXNRMEZCUXpzN1FVRkZSaXhKUVVGSkxFTkJRVU1zY1VKQlFYRkNMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU03UVVGRE0wTXNTVUZCU1N4RFFVRkRMRzFDUVVGdFFpeERRVUZETEdOQlFXTXNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRCUVVOMFJDeEpRVUZKTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zWTBGQll5eERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRPMEZCUTNSRUxFbEJRVWtzUTBGQlF5d3lRa0ZCTWtJc1EwRkJReXhqUVVGakxFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdPMEZCUlRsRUxGTkJRVk1zYTBKQlFXdENMRU5CUVVNc1NVRkJTU3hGUVVGRk8wbEJRemxDTEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZETzBsQlF6RkVMRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzVFVGQlRTeERRVUZETEZGQlFWRXNSMEZCUnl4SlFVRkpMRWRCUVVjc1YwRkJWeXhEUVVGRE8xRkJRMnBFTEU5QlFVOHNSMEZCUnl4TFFVRkxMRU5CUVVNc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXp0SlFVTXhReXhQUVVGUExFOUJRVThzUzBGQlN5eEpRVUZKTEVkQlFVY3NSVUZCUlN4SFFVRkhMR3RDUVVGclFpeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU1zUzBGQlN5eEZRVUZGTEVkQlFVY3NRMEZCUXl4RFFVRkRMRU5CUVVNN1EwRkRja1lpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdkWFJ0WlNBOUlISmxjWFZwY21Vb0p5NHVMM1YwYldVdWFuTW5LVHRjYmx4dVpuVnVZM1JwYjI0Z1oyVjBRbUZ6WlZWU1RDQW9LU0I3WEc0Z0lISmxkSFZ5YmlCMWRHMWxMbk4wWVhSbElDWW1JSFYwYldVdWMzUmhkR1V1ZEdWemRGTmxjblpsY2lBL0lIVjBiV1V1YzNSaGRHVXVkR1Z6ZEZObGNuWmxjaUE2SUdkbGRGQmhjbUZ0WlhSbGNrSjVUbUZ0WlNoY0luVjBiV1ZmZEdWemRGOXpaWEoyWlhKY0lpa2dmSHdnWENKb2RIUndPaTh2TUM0d0xqQXVNRG81TURRekwxd2lPMXh1ZlZ4dVhHNTJZWElnYzJWeWRtVnlVbVZ3YjNKMFpYSWdQU0I3WEc0Z0lDQWdaWEp5YjNJNklHWjFibU4wYVc5dUlDaGxjbkp2Y2l3Z2MyTmxibUZ5YVc4c0lIVjBiV1VwSUh0Y2JpQWdJQ0FnSUNBZ0pDNWhhbUY0S0h0Y2JpQWdJQ0FnSUNBZ0lDQjBlWEJsT2lCY0lsQlBVMVJjSWl4Y2JpQWdJQ0FnSUNBZ0lDQjFjbXc2SUdkbGRFSmhjMlZWVWt3b0tTQXJJRndpWlhKeWIzSmNJaXhjYmlBZ0lDQWdJQ0FnSUNCa1lYUmhPaUI3SUdSaGRHRTZJR1Z5Y205eUlIMHNYRzRnSUNBZ0lDQWdJQ0FnWkdGMFlWUjVjR1U2SUZ3aWFuTnZibHdpWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9YQ0pqYjI1emIyeGxURzluWjJsdVoxd2lLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHTnZibk52YkdVdVpYSnliM0lvWlhKeWIzSXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQnpkV05qWlhOek9pQm1kVzVqZEdsdmJpQW9jM1ZqWTJWemN5d2djMk5sYm1GeWFXOHNJSFYwYldVcElIdGNiaUFnSUNBZ0lDQWdKQzVoYW1GNEtIdGNiaUFnSUNBZ0lDQWdJQ0IwZVhCbE9pQmNJbEJQVTFSY0lpeGNiaUFnSUNBZ0lDQWdJQ0IxY213NklHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWMzVmpZMlZ6YzF3aUxGeHVJQ0FnSUNBZ0lDQWdJR1JoZEdFNklIc2daR0YwWVRvZ2MzVmpZMlZ6Y3lCOUxGeHVJQ0FnSUNBZ0lDQWdJR1JoZEdGVWVYQmxPaUJjSW1wemIyNWNJbHh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWMzUmhkR1V1YzJWMGRHbHVaM011WjJWMEtGd2lZMjl1YzI5c1pVeHZaMmRwYm1kY0lpa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG14dlp5aHpkV05qWlhOektUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2JHOW5PaUJtZFc1amRHbHZiaUFvYkc5bkxDQnpZMlZ1WVhKcGJ5d2dkWFJ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQWtMbUZxWVhnb2UxeHVJQ0FnSUNBZ0lDQWdJSFI1Y0dVNklGd2lVRTlUVkZ3aUxGeHVJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0lHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWJHOW5YQ0lzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVG9nZXlCa1lYUmhPaUJzYjJjZ2ZTeGNiaUFnSUNBZ0lDQWdJQ0JrWVhSaFZIbHdaVG9nWENKcWMyOXVYQ0pjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbExuTjBZWFJsTG5ObGRIUnBibWR6TG1kbGRDaGNJbU52Ym5OdmJHVk1iMmRuYVc1blhDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ1kyOXVjMjlzWlM1c2IyY29iRzluS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNWNiaUFnSUNCc2IyRmtVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h1WVcxbExDQmpZV3hzWW1GamF5a2dlMXh1SUNBZ0lDQWdJQ0FrTG1GcVlYZ29lMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FuTnZibkE2SUZ3aVkyRnNiR0poWTJ0Y0lpeGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZEZSNWNHVTZJRndpWVhCd2JHbGpZWFJwYjI0dmFuTnZianNnWTJoaGNuTmxkRDExZEdZdE9Gd2lMRnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpjbTl6YzBSdmJXRnBiam9nZEhKMVpTeGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUFnWjJWMFFtRnpaVlZTVENncElDc2dYQ0p6WTJWdVlYSnBieTljSWlBcklHNWhiV1VzWEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhSbGJHd2dhbEYxWlhKNUlIZGxKM0psSUdWNGNHVmpkR2x1WnlCS1UwOU9VRnh1SUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVlI1Y0dVNklGd2lhbk52Ym5CY0lpeGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2MzVmpZMlZ6Y3pvZ1puVnVZM1JwYjI0Z0tISmxjM0FwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCallXeHNZbUZqYXloeVpYTndLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJSE5oZG1WVFkyVnVZWEpwYnpvZ1puVnVZM1JwYjI0Z0tITmpaVzVoY21sdktTQjdYRzRnSUNBZ0lDQWdJQ1F1WVdwaGVDaDdYRzRnSUNBZ0lDQWdJQ0FnZEhsd1pUb2dYQ0pRVDFOVVhDSXNYRzRnSUNBZ0lDQWdJQ0FnZFhKc09pQm5aWFJDWVhObFZWSk1LQ2tnS3lCY0luTmpaVzVoY21sdlhDSXNYRzRnSUNBZ0lDQWdJQ0FnWkdGMFlUb2dTbE5QVGk1emRISnBibWRwWm5rb2MyTmxibUZ5YVc4c0lHNTFiR3dzSUZ3aUlGd2lLU3hjYmlBZ0lDQWdJQ0FnSUNCa1lYUmhWSGx3WlRvZ0oycHpiMjRuTEZ4dUlDQWdJQ0FnSUNBZ0lHTnZiblJsYm5SVWVYQmxPaUJjSW1Gd2NHeHBZMkYwYVc5dUwycHpiMjVjSWx4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JHOWhaRk5sZEhScGJtZHpPaUJtZFc1amRHbHZiaUFvWTJGc2JHSmhZMnNzSUdWeWNtOXlLU0I3WEc0Z0lDQWdJQ0FnSUNRdVlXcGhlQ2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBlWEJsT2lCY0lrZEZWRndpTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1ZEdWdWRGUjVjR1U2SUZ3aVhDSXNYRzRnSUNBZ0lDQWdJQ0FnSUNCamNtOXpjMFJ2YldGcGJqb2dkSEoxWlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0lHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWMyVjBkR2x1WjNOY0lpeGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklIUmxiR3dnYWxGMVpYSjVJSGRsSjNKbElHVjRjR1ZqZEdsdVp5QktVMDlPVUZ4dUlDQWdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJRndpYW5OdmJsd2lMRnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkV05qWlhOek9pQm1kVzVqZEdsdmJpQW9jbVZ6Y0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTmhiR3hpWVdOcktISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnljbTl5T2lCbWRXNWpkR2x2YmlBb1pYSnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSW9aWEp5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlZ4dWZUdGNibHh1ZFhSdFpTNXlaV2RwYzNSbGNsSmxjRzl5ZEVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXBPMXh1ZFhSdFpTNXlaV2RwYzNSbGNreHZZV1JJWVc1a2JHVnlLSE5sY25abGNsSmxjRzl5ZEdWeUxteHZZV1JUWTJWdVlYSnBieWs3WEc1MWRHMWxMbkpsWjJsemRHVnlVMkYyWlVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXVjMkYyWlZOalpXNWhjbWx2S1R0Y2JuVjBiV1V1Y21WbmFYTjBaWEpUWlhSMGFXNW5jMHh2WVdSSVlXNWtiR1Z5S0hObGNuWmxjbEpsY0c5eWRHVnlMbXh2WVdSVFpYUjBhVzVuY3lrN1hHNWNibVoxYm1OMGFXOXVJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2h1WVcxbEtTQjdYRzRnSUNBZ2JtRnRaU0E5SUc1aGJXVXVjbVZ3YkdGalpTZ3ZXMXhjVzEwdkxDQmNJbHhjWEZ4YlhDSXBMbkpsY0d4aFkyVW9MMXRjWEYxZEx5d2dYQ0pjWEZ4Y1hWd2lLVHRjYmlBZ0lDQjJZWElnY21WblpYZ2dQU0J1WlhjZ1VtVm5SWGh3S0Z3aVcxeGNYRncvSmwxY0lpQXJJRzVoYldVZ0t5QmNJajBvVzE0bUkxMHFLVndpS1N4Y2JpQWdJQ0FnSUNBZ2NtVnpkV3gwY3lBOUlISmxaMlY0TG1WNFpXTW9iRzlqWVhScGIyNHVjMlZoY21Ob0tUdGNiaUFnSUNCeVpYUjFjbTRnY21WemRXeDBjeUE5UFQwZ2JuVnNiQ0EvSUZ3aVhDSWdPaUJrWldOdlpHVlZVa2xEYjIxd2IyNWxiblFvY21WemRXeDBjMXN4WFM1eVpYQnNZV05sS0M5Y1hDc3ZaeXdnWENJZ1hDSXBLVHRjYm4xY2JpSmRmUT09IiwiXG5cbi8qKlxuKiBHZW5lcmF0ZSB1bmlxdWUgQ1NTIHNlbGVjdG9yIGZvciBnaXZlbiBET00gZWxlbWVudFxuKlxuKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge1N0cmluZ31cbiogQGFwaSBwcml2YXRlXG4qL1xuXG5mdW5jdGlvbiB1bmlxdWUoZWwsIGRvYykge1xuICBpZiAoIWVsIHx8ICFlbC50YWdOYW1lKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRWxlbWVudCBleHBlY3RlZCcpO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldFNlbGVjdG9ySW5kZXgoZWxlbWVudCwgc2VsZWN0b3IpIHtcbiAgICAgIHZhciBleGlzdGluZ0luZGV4ID0gMDtcbiAgICAgIHZhciBpdGVtcyA9ICBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaXRlbXNbaV0gPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgZXhpc3RpbmdJbmRleCA9IGk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBleGlzdGluZ0luZGV4O1xuICB9XG5cbiAgdmFyIGVsU2VsZWN0b3IgPSBnZXRFbGVtZW50U2VsZWN0b3IoZWwpLnNlbGVjdG9yO1xuICB2YXIgaXNTaW1wbGVTZWxlY3RvciA9IGVsU2VsZWN0b3IgPT09IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGFuY2VzdG9yU2VsZWN0b3I7XG5cbiAgdmFyIGN1cnJFbGVtZW50ID0gZWw7XG4gIHdoaWxlIChjdXJyRWxlbWVudC5wYXJlbnRFbGVtZW50ICE9IG51bGwgJiYgIWFuY2VzdG9yU2VsZWN0b3IpIHtcbiAgICAgIGN1cnJFbGVtZW50ID0gY3VyckVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICAgIHZhciBzZWxlY3RvciA9IGdldEVsZW1lbnRTZWxlY3RvcihjdXJyRWxlbWVudCkuc2VsZWN0b3I7XG5cbiAgICAgIC8vIFR5cGljYWxseSBlbGVtZW50cyB0aGF0IGhhdmUgYSBjbGFzcyBuYW1lIG9yIHRpdGxlLCB0aG9zZSBhcmUgbGVzcyBsaWtlbHlcbiAgICAgIC8vIHRvIGNoYW5nZSwgYW5kIGFsc28gYmUgdW5pcXVlLiAgU28sIHdlIGFyZSB0cnlpbmcgdG8gZmluZCBhbiBhbmNlc3RvclxuICAgICAgLy8gdG8gYW5jaG9yIChvciBzY29wZSkgdGhlIHNlYXJjaCBmb3IgdGhlIGVsZW1lbnQsIGFuZCBtYWtlIGl0IGxlc3MgYnJpdHRsZS5cbiAgICAgIGlmIChzZWxlY3RvciAhPT0gY3VyckVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgYW5jZXN0b3JTZWxlY3RvciA9IHNlbGVjdG9yICsgKGN1cnJFbGVtZW50ID09PSBlbC5wYXJlbnRFbGVtZW50ICYmIGlzU2ltcGxlU2VsZWN0b3IgPyBcIiA+IFwiIDogXCIgXCIpICsgZWxTZWxlY3RvcjtcbiAgICAgIH1cbiAgfVxuXG4gIHZhciBmaW5hbFNlbGVjdG9ycyA9IFtdO1xuICBpZiAoYW5jZXN0b3JTZWxlY3Rvcikge1xuICAgIGZpbmFsU2VsZWN0b3JzLnB1c2goXG4gICAgICBhbmNlc3RvclNlbGVjdG9yICsgXCI6ZXEoXCIgKyBfZ2V0U2VsZWN0b3JJbmRleChlbCwgYW5jZXN0b3JTZWxlY3RvcikgKyBcIilcIlxuICAgICk7XG4gIH1cblxuICBmaW5hbFNlbGVjdG9ycy5wdXNoKGVsU2VsZWN0b3IgKyBcIjplcShcIiArIF9nZXRTZWxlY3RvckluZGV4KGVsLCBlbFNlbGVjdG9yKSArIFwiKVwiKTtcbiAgcmV0dXJuIGZpbmFsU2VsZWN0b3JzO1xufTtcblxuLyoqXG4qIEdldCBjbGFzcyBuYW1lcyBmb3IgYW4gZWxlbWVudFxuKlxuKiBAcGFyYXJtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtBcnJheX1cbiovXG5cbmZ1bmN0aW9uIGdldENsYXNzTmFtZXMoZWwpIHtcbiAgdmFyIGNsYXNzTmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnY2xhc3MnKTtcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lICYmIGNsYXNzTmFtZS5yZXBsYWNlKCd1dG1lLXZlcmlmeScsICcnKTtcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lICYmIGNsYXNzTmFtZS5yZXBsYWNlKCd1dG1lLXJlYWR5JywgJycpO1xuXG4gIGlmICghY2xhc3NOYW1lIHx8ICghY2xhc3NOYW1lLnRyaW0oKS5sZW5ndGgpKSB7IHJldHVybiBbXTsgfVxuXG4gIC8vIHJlbW92ZSBkdXBsaWNhdGUgd2hpdGVzcGFjZVxuICBjbGFzc05hbWUgPSBjbGFzc05hbWUucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xuXG4gIC8vIHRyaW0gbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZVxuICBjbGFzc05hbWUgPSBjbGFzc05hbWUucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xuXG4gIC8vIHNwbGl0IGludG8gc2VwYXJhdGUgY2xhc3NuYW1lc1xuICByZXR1cm4gY2xhc3NOYW1lLnRyaW0oKS5zcGxpdCgnICcpO1xufVxuXG4vKipcbiogQ1NTIHNlbGVjdG9ycyB0byBnZW5lcmF0ZSB1bmlxdWUgc2VsZWN0b3IgZm9yIERPTSBlbGVtZW50XG4qXG4qIEBwYXJhbSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7QXJyYXl9XG4qIEBhcGkgcHJ2aWF0ZVxuKi9cblxuZnVuY3Rpb24gZ2V0RWxlbWVudFNlbGVjdG9yKGVsLCBpc1VuaXF1ZSkge1xuICB2YXIgcGFydHMgPSBbXTtcbiAgdmFyIGxhYmVsID0gbnVsbDtcbiAgdmFyIHRpdGxlID0gbnVsbDtcbiAgdmFyIGFsdCAgID0gbnVsbDtcbiAgdmFyIG5hbWUgID0gbnVsbDtcbiAgdmFyIHZhbHVlID0gbnVsbDtcbiAgdmFyIG1lID0gZWw7XG5cbiAgLy8gZG8ge1xuXG4gIC8vIElEcyBhcmUgdW5pcXVlIGVub3VnaFxuICBpZiAoZWwuaWQpIHtcbiAgICBsYWJlbCA9ICdbaWQ9XFwnJyArIGVsLmlkICsgXCJcXCddXCI7XG4gIH0gZWxzZSB7XG4gICAgLy8gT3RoZXJ3aXNlLCB1c2UgdGFnIG5hbWVcbiAgICBsYWJlbCAgICAgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgICB2YXIgY2xhc3NOYW1lcyA9IGdldENsYXNzTmFtZXMoZWwpO1xuXG4gICAgLy8gVGFnIG5hbWVzIGNvdWxkIHVzZSBjbGFzc2VzIGZvciBzcGVjaWZpY2l0eVxuICAgIGlmIChjbGFzc05hbWVzLmxlbmd0aCkge1xuICAgICAgbGFiZWwgKz0gJy4nICsgY2xhc3NOYW1lcy5qb2luKCcuJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gVGl0bGVzICYgQWx0IGF0dHJpYnV0ZXMgYXJlIHZlcnkgdXNlZnVsIGZvciBzcGVjaWZpY2l0eSBhbmQgdHJhY2tpbmdcbiAgaWYgKHRpdGxlID0gZWwuZ2V0QXR0cmlidXRlKCd0aXRsZScpKSB7XG4gICAgbGFiZWwgKz0gJ1t0aXRsZT1cIicgKyB0aXRsZSArICdcIl0nO1xuICB9IGVsc2UgaWYgKGFsdCA9IGVsLmdldEF0dHJpYnV0ZSgnYWx0JykpIHtcbiAgICBsYWJlbCArPSAnW2FsdD1cIicgKyBhbHQgKyAnXCJdJztcbiAgfSBlbHNlIGlmIChuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJykpIHtcbiAgICBsYWJlbCArPSAnW25hbWU9XCInICsgbmFtZSArICdcIl0nO1xuICB9XG5cbiAgaWYgKHZhbHVlID0gZWwuZ2V0QXR0cmlidXRlKCd2YWx1ZScpKSB7XG4gICAgbGFiZWwgKz0gJ1t2YWx1ZT1cIicgKyB2YWx1ZSArICdcIl0nO1xuICB9XG5cbiAgLy8gaWYgKGVsLmlubmVyVGV4dC5sZW5ndGggIT0gMCkge1xuICAvLyAgIGxhYmVsICs9ICc6Y29udGFpbnMoJyArIGVsLmlubmVyVGV4dCArICcpJztcbiAgLy8gfVxuXG4gIHBhcnRzLnVuc2hpZnQoe1xuICAgIGVsZW1lbnQ6IGVsLFxuICAgIHNlbGVjdG9yOiBsYWJlbFxuICB9KTtcblxuICAvLyBpZiAoaXNVbmlxdWUocGFydHMpKSB7XG4gIC8vICAgICBicmVhaztcbiAgLy8gfVxuXG4gIC8vIH0gd2hpbGUgKCFlbC5pZCAmJiAoZWwgPSBlbC5wYXJlbnROb2RlKSAmJiBlbC50YWdOYW1lKTtcblxuICAvLyBTb21lIHNlbGVjdG9ycyBzaG91bGQgaGF2ZSBtYXRjaGVkIGF0IGxlYXN0XG4gIGlmICghcGFydHMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gaWRlbnRpZnkgQ1NTIHNlbGVjdG9yJyk7XG4gIH1cbiAgcmV0dXJuIHBhcnRzWzBdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHVuaXF1ZTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05sYkdWamRHOXlSbWx1WkdWeUxtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12YzJWc1pXTjBiM0pHYVc1a1pYSXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFN08wRkJSVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVRkZRU3hGUVVGRk96dEJRVVZHTEZOQlFWTXNUVUZCVFN4RFFVRkRMRVZCUVVVc1JVRkJSU3hIUVVGSExFVkJRVVU3UlVGRGRrSXNTVUZCU1N4RFFVRkRMRVZCUVVVc1NVRkJTU3hEUVVGRExFVkJRVVVzUTBGQlF5eFBRVUZQTEVWQlFVVTdTVUZEZEVJc1RVRkJUU3hKUVVGSkxGTkJRVk1zUTBGQlF5eHJRa0ZCYTBJc1EwRkJReXhEUVVGRE8wRkJRelZETEVkQlFVYzdPMFZCUlVRc1UwRkJVeXhwUWtGQmFVSXNRMEZCUXl4UFFVRlBMRVZCUVVVc1VVRkJVU3hGUVVGRk8wMUJRekZETEVsQlFVa3NZVUZCWVN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNMVFpeE5RVUZOTEVsQlFVa3NTMEZCU3l4SlFVRkpMRWRCUVVjc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4UlFVRlJMRU5CUVVNc1EwRkJRenM3VFVGRk5VTXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3VlVGRGJrTXNTVUZCU1N4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRExFdEJRVXNzVDBGQlR5eEZRVUZGTzJOQlEzUkNMR0ZCUVdFc1IwRkJSeXhEUVVGRExFTkJRVU03WTBGRGJFSXNUVUZCVFR0WFFVTlVPMDlCUTBvN1RVRkRSQ3hQUVVGUExHRkJRV0VzUTBGQlF6dEJRVU16UWl4SFFVRkhPenRGUVVWRUxFbEJRVWtzVlVGQlZTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRXNRMEZCUXp0RlFVTnFSQ3hKUVVGSkxHZENRVUZuUWl4SFFVRkhMRlZCUVZVc1MwRkJTeXhGUVVGRkxFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4RFFVRkRPMEZCUTJwRkxFVkJRVVVzU1VGQlNTeG5Ra0ZCWjBJc1EwRkJRenM3UlVGRmNrSXNTVUZCU1N4WFFVRlhMRWRCUVVjc1JVRkJSU3hEUVVGRE8wVkJRM0pDTEU5QlFVOHNWMEZCVnl4RFFVRkRMR0ZCUVdFc1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF5eG5Ra0ZCWjBJc1JVRkJSVHROUVVNelJDeFhRVUZYTEVkQlFVY3NWMEZCVnl4RFFVRkRMR0ZCUVdFc1EwRkJRenRCUVVNNVF5eE5RVUZOTEVsQlFVa3NVVUZCVVN4SFFVRkhMR3RDUVVGclFpeERRVUZETEZkQlFWY3NRMEZCUXl4RFFVRkRMRkZCUVZFc1EwRkJRenRCUVVNNVJEdEJRVU5CTzBGQlEwRTdPMDFCUlUwc1NVRkJTU3hSUVVGUkxFdEJRVXNzVjBGQlZ5eERRVUZETEU5QlFVOHNRMEZCUXl4WFFVRlhMRVZCUVVVc1JVRkJSVHRWUVVOb1JDeG5Ra0ZCWjBJc1IwRkJSeXhSUVVGUkxFbEJRVWtzVjBGQlZ5eExRVUZMTEVWQlFVVXNRMEZCUXl4aFFVRmhMRWxCUVVrc1owSkJRV2RDTEVkQlFVY3NTMEZCU3l4SFFVRkhMRWRCUVVjc1EwRkJReXhIUVVGSExGVkJRVlVzUTBGQlF6dFBRVU51U0R0QlFVTlFMRWRCUVVjN08wVkJSVVFzU1VGQlNTeGpRVUZqTEVkQlFVY3NSVUZCUlN4RFFVRkRPMFZCUTNoQ0xFbEJRVWtzWjBKQlFXZENMRVZCUVVVN1NVRkRjRUlzWTBGQll5eERRVUZETEVsQlFVazdUVUZEYWtJc1owSkJRV2RDTEVkQlFVY3NUVUZCVFN4SFFVRkhMR2xDUVVGcFFpeERRVUZETEVWQlFVVXNSVUZCUlN4blFrRkJaMElzUTBGQlF5eEhRVUZITEVkQlFVYzdTMEZETVVVc1EwRkJRenRCUVVOT0xFZEJRVWM3TzBWQlJVUXNZMEZCWXl4RFFVRkRMRWxCUVVrc1EwRkJReXhWUVVGVkxFZEJRVWNzVFVGQlRTeEhRVUZITEdsQ1FVRnBRaXhEUVVGRExFVkJRVVVzUlVGQlJTeFZRVUZWTEVOQlFVTXNSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJRenRGUVVOdVJpeFBRVUZQTEdOQlFXTXNRMEZCUXp0QlFVTjRRaXhEUVVGRExFTkJRVU03TzBGQlJVWTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkJSVUVzUlVGQlJUczdRVUZGUml4VFFVRlRMR0ZCUVdFc1EwRkJReXhGUVVGRkxFVkJRVVU3UlVGRGVrSXNTVUZCU1N4VFFVRlRMRWRCUVVjc1JVRkJSU3hEUVVGRExGbEJRVmtzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXp0RlFVTjZReXhUUVVGVExFZEJRVWNzVTBGQlV5eEpRVUZKTEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1lVRkJZU3hGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZETzBGQlEyaEZMRVZCUVVVc1UwRkJVeXhIUVVGSExGTkJRVk1zU1VGQlNTeFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmxCUVZrc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF6czdRVUZGTDBRc1JVRkJSU3hKUVVGSkxFTkJRVU1zVTBGQlV5eExRVUZMTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1JVRkJSU3hEUVVGRExFMUJRVTBzUTBGQlF5eEZRVUZGTEVWQlFVVXNUMEZCVHl4RlFVRkZMRU5CUVVNc1JVRkJSVHRCUVVNNVJEczdRVUZGUVN4RlFVRkZMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNM1F6czdRVUZGUVN4RlFVRkZMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZsQlFWa3NSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenRCUVVOc1JEczdSVUZGUlN4UFFVRlBMRk5CUVZNc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRja01zUTBGQlF6czdRVUZGUkR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEJRVVZCTEVWQlFVVTdPMEZCUlVZc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4RlFVRkZMRVZCUVVVc1VVRkJVU3hGUVVGRk8wVkJRM2hETEVsQlFVa3NTMEZCU3l4SFFVRkhMRVZCUVVVc1EwRkJRenRGUVVObUxFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0RlFVTnFRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTTdSVUZEYWtJc1NVRkJTU3hIUVVGSExFdEJRVXNzU1VGQlNTeERRVUZETzBWQlEycENMRWxCUVVrc1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF6dEZRVU5xUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRGJrSXNSVUZCUlN4SlFVRkpMRVZCUVVVc1IwRkJSeXhGUVVGRkxFTkJRVU03UVVGRFpEdEJRVU5CTzBGQlEwRTdPMFZCUlVVc1NVRkJTU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzBsQlExUXNTMEZCU3l4SFFVRkhMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU1zUlVGQlJTeEhRVUZITEV0QlFVc3NRMEZCUXp0QlFVTnlReXhIUVVGSExFMUJRVTA3TzBGQlJWUXNTVUZCU1N4TFFVRkxMRTlCUVU4c1JVRkJSU3hEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNRMEZCUXpzN1FVRkZla01zU1VGQlNTeEpRVUZKTEZWQlFWVXNSMEZCUnl4aFFVRmhMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU03UVVGRGRrTTdPMGxCUlVrc1NVRkJTU3hWUVVGVkxFTkJRVU1zVFVGQlRTeEZRVUZGTzAxQlEzSkNMRXRCUVVzc1NVRkJTU3hIUVVGSExFZEJRVWNzVlVGQlZTeERRVUZETEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRMUVVOeVF6dEJRVU5NTEVkQlFVYzdRVUZEU0RzN1JVRkZSU3hKUVVGSkxFdEJRVXNzUjBGQlJ5eEZRVUZGTEVOQlFVTXNXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRk8wbEJRM0JETEV0QlFVc3NTVUZCU1N4VlFVRlZMRWRCUVVjc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEhRVU53UXl4TlFVRk5MRWxCUVVrc1IwRkJSeXhIUVVGSExFVkJRVVVzUTBGQlF5eFpRVUZaTEVOQlFVTXNTMEZCU3l4RFFVRkRMRVZCUVVVN1NVRkRka01zUzBGQlN5eEpRVUZKTEZGQlFWRXNSMEZCUnl4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRE8wZEJRMmhETEUxQlFVMHNTVUZCU1N4SlFVRkpMRWRCUVVjc1JVRkJSU3hEUVVGRExGbEJRVmtzUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlR0SlFVTjZReXhMUVVGTExFbEJRVWtzVTBGQlV5eEhRVUZITEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRja01zUjBGQlJ6czdSVUZGUkN4SlFVRkpMRXRCUVVzc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZPMGxCUTNCRExFdEJRVXNzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJRenRCUVVOMlF5eEhRVUZITzBGQlEwZzdRVUZEUVR0QlFVTkJPMEZCUTBFN08wVkJSVVVzUzBGQlN5eERRVUZETEU5QlFVOHNRMEZCUXp0SlFVTmFMRTlCUVU4c1JVRkJSU3hGUVVGRk8wbEJRMWdzVVVGQlVTeEZRVUZGTEV0QlFVczdRVUZEYmtJc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRFREdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UlVGRlJTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1JVRkJSVHRKUVVOcVFpeE5RVUZOTEVsQlFVa3NTMEZCU3l4RFFVRkRMR2xEUVVGcFF5eERRVUZETEVOQlFVTTdSMEZEY0VRN1JVRkRSQ3hQUVVGUExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0QlFVTnNRaXhEUVVGRE96dEJRVVZFTEUxQlFVMHNRMEZCUXl4UFFVRlBMRWRCUVVjc1RVRkJUU3hEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lYRzVjYmk4cUtseHVLaUJIWlc1bGNtRjBaU0IxYm1seGRXVWdRMU5USUhObGJHVmpkRzl5SUdadmNpQm5hWFpsYmlCRVQwMGdaV3hsYldWdWRGeHVLbHh1S2lCQWNHRnlZVzBnZTBWc1pXMWxiblI5SUdWc1hHNHFJRUJ5WlhSMWNtNGdlMU4wY21sdVozMWNiaW9nUUdGd2FTQndjbWwyWVhSbFhHNHFMMXh1WEc1bWRXNWpkR2x2YmlCMWJtbHhkV1VvWld3c0lHUnZZeWtnZTF4dUlDQnBaaUFvSVdWc0lIeDhJQ0ZsYkM1MFlXZE9ZVzFsS1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblJXeGxiV1Z1ZENCbGVIQmxZM1JsWkNjcE8xeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdYMmRsZEZObGJHVmpkRzl5U1c1a1pYZ29aV3hsYldWdWRDd2djMlZzWldOMGIzSXBJSHRjYmlBZ0lDQWdJSFpoY2lCbGVHbHpkR2x1WjBsdVpHVjRJRDBnTUR0Y2JpQWdJQ0FnSUhaaGNpQnBkR1Z0Y3lBOUlDQmtiMk11Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2h6Wld4bFkzUnZjaWs3WEc1Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2FYUmxiWE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2FYUmxiWE5iYVYwZ1BUMDlJR1ZzWlcxbGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdaWGhwYzNScGJtZEpibVJsZUNBOUlHazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lISmxkSFZ5YmlCbGVHbHpkR2x1WjBsdVpHVjRPMXh1SUNCOVhHNWNiaUFnZG1GeUlHVnNVMlZzWldOMGIzSWdQU0JuWlhSRmJHVnRaVzUwVTJWc1pXTjBiM0lvWld3cExuTmxiR1ZqZEc5eU8xeHVJQ0IyWVhJZ2FYTlRhVzF3YkdWVFpXeGxZM1J2Y2lBOUlHVnNVMlZzWldOMGIzSWdQVDA5SUdWc0xuUmhaMDVoYldVdWRHOU1iM2RsY2tOaGMyVW9LVHRjYmlBZ2RtRnlJR0Z1WTJWemRHOXlVMlZzWldOMGIzSTdYRzVjYmlBZ2RtRnlJR04xY25KRmJHVnRaVzUwSUQwZ1pXdzdYRzRnSUhkb2FXeGxJQ2hqZFhKeVJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBJQ0U5SUc1MWJHd2dKaVlnSVdGdVkyVnpkRzl5VTJWc1pXTjBiM0lwSUh0Y2JpQWdJQ0FnSUdOMWNuSkZiR1Z0Wlc1MElEMGdZM1Z5Y2tWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWREdGNiaUFnSUNBZ0lIWmhjaUJ6Wld4bFkzUnZjaUE5SUdkbGRFVnNaVzFsYm5SVFpXeGxZM1J2Y2loamRYSnlSV3hsYldWdWRDa3VjMlZzWldOMGIzSTdYRzVjYmlBZ0lDQWdJQzh2SUZSNWNHbGpZV3hzZVNCbGJHVnRaVzUwY3lCMGFHRjBJR2hoZG1VZ1lTQmpiR0Z6Y3lCdVlXMWxJRzl5SUhScGRHeGxMQ0IwYUc5elpTQmhjbVVnYkdWemN5QnNhV3RsYkhsY2JpQWdJQ0FnSUM4dklIUnZJR05vWVc1blpTd2dZVzVrSUdGc2MyOGdZbVVnZFc1cGNYVmxMaUFnVTI4c0lIZGxJR0Z5WlNCMGNubHBibWNnZEc4Z1ptbHVaQ0JoYmlCaGJtTmxjM1J2Y2x4dUlDQWdJQ0FnTHk4Z2RHOGdZVzVqYUc5eUlDaHZjaUJ6WTI5d1pTa2dkR2hsSUhObFlYSmphQ0JtYjNJZ2RHaGxJR1ZzWlcxbGJuUXNJR0Z1WkNCdFlXdGxJR2wwSUd4bGMzTWdZbkpwZEhSc1pTNWNiaUFnSUNBZ0lHbG1JQ2h6Wld4bFkzUnZjaUFoUFQwZ1kzVnlja1ZzWlcxbGJuUXVkR0ZuVG1GdFpTNTBiMHh2ZDJWeVEyRnpaU2dwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdZVzVqWlhOMGIzSlRaV3hsWTNSdmNpQTlJSE5sYkdWamRHOXlJQ3NnS0dOMWNuSkZiR1Z0Wlc1MElEMDlQU0JsYkM1d1lYSmxiblJGYkdWdFpXNTBJQ1ltSUdselUybHRjR3hsVTJWc1pXTjBiM0lnUHlCY0lpQStJRndpSURvZ1hDSWdYQ0lwSUNzZ1pXeFRaV3hsWTNSdmNqdGNiaUFnSUNBZ0lIMWNiaUFnZlZ4dVhHNGdJSFpoY2lCbWFXNWhiRk5sYkdWamRHOXljeUE5SUZ0ZE8xeHVJQ0JwWmlBb1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2lrZ2UxeHVJQ0FnSUdacGJtRnNVMlZzWldOMGIzSnpMbkIxYzJnb1hHNGdJQ0FnSUNCaGJtTmxjM1J2Y2xObGJHVmpkRzl5SUNzZ1hDSTZaWEVvWENJZ0t5QmZaMlYwVTJWc1pXTjBiM0pKYm1SbGVDaGxiQ3dnWVc1alpYTjBiM0pUWld4bFkzUnZjaWtnS3lCY0lpbGNJbHh1SUNBZ0lDazdYRzRnSUgxY2JseHVJQ0JtYVc1aGJGTmxiR1ZqZEc5eWN5NXdkWE5vS0dWc1UyVnNaV04wYjNJZ0t5QmNJanBsY1NoY0lpQXJJRjluWlhSVFpXeGxZM1J2Y2tsdVpHVjRLR1ZzTENCbGJGTmxiR1ZqZEc5eUtTQXJJRndpS1Z3aUtUdGNiaUFnY21WMGRYSnVJR1pwYm1Gc1UyVnNaV04wYjNKek8xeHVmVHRjYmx4dUx5b3FYRzRxSUVkbGRDQmpiR0Z6Y3lCdVlXMWxjeUJtYjNJZ1lXNGdaV3hsYldWdWRGeHVLbHh1S2lCQWNHRnlZWEp0SUh0RmJHVnRaVzUwZlNCbGJGeHVLaUJBY21WMGRYSnVJSHRCY25KaGVYMWNiaW92WEc1Y2JtWjFibU4wYVc5dUlHZGxkRU5zWVhOelRtRnRaWE1vWld3cElIdGNiaUFnZG1GeUlHTnNZWE56VG1GdFpTQTlJR1ZzTG1kbGRFRjBkSEpwWW5WMFpTZ25ZMnhoYzNNbktUdGNiaUFnWTJ4aGMzTk9ZVzFsSUQwZ1kyeGhjM05PWVcxbElDWW1JR05zWVhOelRtRnRaUzV5WlhCc1lXTmxLQ2QxZEcxbExYWmxjbWxtZVNjc0lDY25LVHRjYmlBZ1kyeGhjM05PWVcxbElEMGdZMnhoYzNOT1lXMWxJQ1ltSUdOc1lYTnpUbUZ0WlM1eVpYQnNZV05sS0NkMWRHMWxMWEpsWVdSNUp5d2dKeWNwTzF4dVhHNGdJR2xtSUNnaFkyeGhjM05PWVcxbElIeDhJQ2doWTJ4aGMzTk9ZVzFsTG5SeWFXMG9LUzVzWlc1bmRHZ3BLU0I3SUhKbGRIVnliaUJiWFRzZ2ZWeHVYRzRnSUM4dklISmxiVzkyWlNCa2RYQnNhV05oZEdVZ2QyaHBkR1Z6Y0dGalpWeHVJQ0JqYkdGemMwNWhiV1VnUFNCamJHRnpjMDVoYldVdWNtVndiR0ZqWlNndlhGeHpLeTluTENBbklDY3BPMXh1WEc0Z0lDOHZJSFJ5YVcwZ2JHVmhaR2x1WnlCaGJtUWdkSEpoYVd4cGJtY2dkMmhwZEdWemNHRmpaVnh1SUNCamJHRnpjMDVoYldVZ1BTQmpiR0Z6YzA1aGJXVXVjbVZ3YkdGalpTZ3ZYbHhjY3l0OFhGeHpLeVF2Wnl3Z0p5Y3BPMXh1WEc0Z0lDOHZJSE53YkdsMElHbHVkRzhnYzJWd1lYSmhkR1VnWTJ4aGMzTnVZVzFsYzF4dUlDQnlaWFIxY200Z1kyeGhjM05PWVcxbExuUnlhVzBvS1M1emNHeHBkQ2duSUNjcE8xeHVmVnh1WEc0dktpcGNiaW9nUTFOVElITmxiR1ZqZEc5eWN5QjBieUJuWlc1bGNtRjBaU0IxYm1seGRXVWdjMlZzWldOMGIzSWdabTl5SUVSUFRTQmxiR1Z0Wlc1MFhHNHFYRzRxSUVCd1lYSmhiU0I3Uld4bGJXVnVkSDBnWld4Y2Jpb2dRSEpsZEhWeWJpQjdRWEp5WVhsOVhHNHFJRUJoY0drZ2NISjJhV0YwWlZ4dUtpOWNibHh1Wm5WdVkzUnBiMjRnWjJWMFJXeGxiV1Z1ZEZObGJHVmpkRzl5S0dWc0xDQnBjMVZ1YVhGMVpTa2dlMXh1SUNCMllYSWdjR0Z5ZEhNZ1BTQmJYVHRjYmlBZ2RtRnlJR3hoWW1Wc0lEMGdiblZzYkR0Y2JpQWdkbUZ5SUhScGRHeGxJRDBnYm5Wc2JEdGNiaUFnZG1GeUlHRnNkQ0FnSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJRzVoYldVZ0lEMGdiblZzYkR0Y2JpQWdkbUZ5SUhaaGJIVmxJRDBnYm5Wc2JEdGNiaUFnZG1GeUlHMWxJRDBnWld3N1hHNWNiaUFnTHk4Z1pHOGdlMXh1WEc0Z0lDOHZJRWxFY3lCaGNtVWdkVzVwY1hWbElHVnViM1ZuYUZ4dUlDQnBaaUFvWld3dWFXUXBJSHRjYmlBZ0lDQnNZV0psYkNBOUlDZGJhV1E5WEZ3bkp5QXJJR1ZzTG1sa0lDc2dYQ0pjWENkZFhDSTdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdMeThnVDNSb1pYSjNhWE5sTENCMWMyVWdkR0ZuSUc1aGJXVmNiaUFnSUNCc1lXSmxiQ0FnSUNBZ1BTQmxiQzUwWVdkT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrN1hHNWNiaUFnSUNCMllYSWdZMnhoYzNOT1lXMWxjeUE5SUdkbGRFTnNZWE56VG1GdFpYTW9aV3dwTzF4dVhHNGdJQ0FnTHk4Z1ZHRm5JRzVoYldWeklHTnZkV3hrSUhWelpTQmpiR0Z6YzJWeklHWnZjaUJ6Y0dWamFXWnBZMmwwZVZ4dUlDQWdJR2xtSUNoamJHRnpjMDVoYldWekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ2JHRmlaV3dnS3owZ0p5NG5JQ3NnWTJ4aGMzTk9ZVzFsY3k1cWIybHVLQ2N1SnlrN1hHNGdJQ0FnZlZ4dUlDQjlYRzVjYmlBZ0x5OGdWR2wwYkdWeklDWWdRV3gwSUdGMGRISnBZblYwWlhNZ1lYSmxJSFpsY25rZ2RYTmxablZzSUdadmNpQnpjR1ZqYVdacFkybDBlU0JoYm1RZ2RISmhZMnRwYm1kY2JpQWdhV1lnS0hScGRHeGxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2QwYVhSc1pTY3BLU0I3WEc0Z0lDQWdiR0ZpWld3Z0t6MGdKMXQwYVhSc1pUMWNJaWNnS3lCMGFYUnNaU0FySUNkY0lsMG5PMXh1SUNCOUlHVnNjMlVnYVdZZ0tHRnNkQ0E5SUdWc0xtZGxkRUYwZEhKcFluVjBaU2duWVd4MEp5a3BJSHRjYmlBZ0lDQnNZV0psYkNBclBTQW5XMkZzZEQxY0lpY2dLeUJoYkhRZ0t5QW5YQ0pkSnp0Y2JpQWdmU0JsYkhObElHbG1JQ2h1WVcxbElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZHVZVzFsSnlrcElIdGNiaUFnSUNCc1lXSmxiQ0FyUFNBblcyNWhiV1U5WENJbklDc2dibUZ0WlNBcklDZGNJbDBuTzF4dUlDQjlYRzVjYmlBZ2FXWWdLSFpoYkhWbElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZDJZV3gxWlNjcEtTQjdYRzRnSUNBZ2JHRmlaV3dnS3owZ0oxdDJZV3gxWlQxY0lpY2dLeUIyWVd4MVpTQXJJQ2RjSWwwbk8xeHVJQ0I5WEc1Y2JpQWdMeThnYVdZZ0tHVnNMbWx1Ym1WeVZHVjRkQzVzWlc1bmRHZ2dJVDBnTUNrZ2UxeHVJQ0F2THlBZ0lHeGhZbVZzSUNzOUlDYzZZMjl1ZEdGcGJuTW9KeUFySUdWc0xtbHVibVZ5VkdWNGRDQXJJQ2NwSnp0Y2JpQWdMeThnZlZ4dVhHNGdJSEJoY25SekxuVnVjMmhwWm5Rb2UxeHVJQ0FnSUdWc1pXMWxiblE2SUdWc0xGeHVJQ0FnSUhObGJHVmpkRzl5T2lCc1lXSmxiRnh1SUNCOUtUdGNibHh1SUNBdkx5QnBaaUFvYVhOVmJtbHhkV1VvY0dGeWRITXBLU0I3WEc0Z0lDOHZJQ0FnSUNCaWNtVmhhenRjYmlBZ0x5OGdmVnh1WEc0Z0lDOHZJSDBnZDJocGJHVWdLQ0ZsYkM1cFpDQW1KaUFvWld3Z1BTQmxiQzV3WVhKbGJuUk9iMlJsS1NBbUppQmxiQzUwWVdkT1lXMWxLVHRjYmx4dUlDQXZMeUJUYjIxbElITmxiR1ZqZEc5eWN5QnphRzkxYkdRZ2FHRjJaU0J0WVhSamFHVmtJR0YwSUd4bFlYTjBYRzRnSUdsbUlDZ2hjR0Z5ZEhNdWJHVnVaM1JvS1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RHWVdsc1pXUWdkRzhnYVdSbGJuUnBabmtnUTFOVElITmxiR1ZqZEc5eUp5azdYRzRnSUgxY2JpQWdjbVYwZFhKdUlIQmhjblJ6V3pCZE8xeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUhWdWFYRjFaVHRjYmlKZGZRPT0iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBsb2NhbF9zdG9yYWdlX2tleSA9ICd1dG1lLXNldHRpbmdzJztcblxuZnVuY3Rpb24gU2V0dGluZ3MgKGRlZmF1bHRTZXR0aW5ncykge1xuICAgIHRoaXMuc2V0RGVmYXVsdHMoZGVmYXVsdFNldHRpbmdzIHx8IHt9KTtcbn1cblxuU2V0dGluZ3MucHJvdG90eXBlID0ge1xuICAgIHJlYWRTZXR0aW5nc0Zyb21Mb2NhbFN0b3JhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNldHRpbmdzU3RyaW5nID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obG9jYWxfc3RvcmFnZV9rZXkpO1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7fTtcbiAgICAgICAgaWYgKHNldHRpbmdzU3RyaW5nKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IEpTT04ucGFyc2Uoc2V0dGluZ3NTdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgc2V0RGVmYXVsdHM6IGZ1bmN0aW9uIChkZWZhdWx0U2V0dGluZ3MpIHtcbiAgICAgICAgdmFyIGxvY2FsU2V0dGluZ3MgPSB0aGlzLnJlYWRTZXR0aW5nc0Zyb21Mb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgdmFyIGRlZmF1bHRzQ29weSA9IF8uZXh0ZW5kKHt9LCBkZWZhdWx0U2V0dGluZ3MgfHwge30pO1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gXy5leHRlbmQoe30sIF8uZXh0ZW5kKGRlZmF1bHRzQ29weSwgbG9jYWxTZXR0aW5ncykpO1xuICAgICAgICB0aGlzLmRlZmF1bHRTZXR0aW5ncyA9IGRlZmF1bHRTZXR0aW5ncztcbiAgICB9LFxuXG4gICAgc2V0OiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfSxcblxuICAgIGdldDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5nc1trZXldO1xuICAgIH0sXG5cbiAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGxvY2FsX3N0b3JhZ2Vfa2V5LCBKU09OLnN0cmluZ2lmeSh0aGlzLnNldHRpbmdzKSk7XG4gICAgfSxcbiAgICBcbiAgICByZXNldERlZmF1bHRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICBpZiAoZGVmYXVsdHMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdHMpO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzTmxkSFJwYm1kekxtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12YzJWMGRHbHVaM011YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRXNTVUZCU1N4RFFVRkRMRWRCUVVjc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETzBGQlF6TkNMRWxCUVVrc2FVSkJRV2xDTEVkQlFVY3NaVUZCWlN4RFFVRkRPenRCUVVWNFF5eFRRVUZUTEZGQlFWRXNSVUZCUlN4bFFVRmxMRVZCUVVVN1NVRkRhRU1zU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4bFFVRmxMRWxCUVVrc1JVRkJSU3hEUVVGRExFTkJRVU03UVVGRE5VTXNRMEZCUXpzN1FVRkZSQ3hSUVVGUkxFTkJRVU1zVTBGQlV5eEhRVUZITzBsQlEycENMRFJDUVVFMFFpeEZRVUZGTEZsQlFWazdVVUZEZEVNc1NVRkJTU3hqUVVGakxFZEJRVWNzV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4cFFrRkJhVUlzUTBGQlF5eERRVUZETzFGQlF6ZEVMRWxCUVVrc1VVRkJVU3hIUVVGSExFVkJRVVVzUTBGQlF6dFJRVU5zUWl4SlFVRkpMR05CUVdNc1JVRkJSVHRaUVVOb1FpeFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhqUVVGakxFTkJRVU1zUTBGQlF6dFRRVU42UXp0UlFVTkVMRTlCUVU4c1VVRkJVU3hEUVVGRE8wRkJRM2hDTEV0QlFVczdPMGxCUlVRc1YwRkJWeXhGUVVGRkxGVkJRVlVzWlVGQlpTeEZRVUZGTzFGQlEzQkRMRWxCUVVrc1lVRkJZU3hIUVVGSExFbEJRVWtzUTBGQlF5dzBRa0ZCTkVJc1JVRkJSU3hEUVVGRE8xRkJRM2hFTEVsQlFVa3NXVUZCV1N4SFFVRkhMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJTeEZRVUZGTEdWQlFXVXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJRenRSUVVOMlJDeEpRVUZKTEVOQlFVTXNVVUZCVVN4SFFVRkhMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1dVRkJXU3hGUVVGRkxHRkJRV0VzUTBGQlF5eERRVUZETEVOQlFVTTdVVUZEY0VVc1NVRkJTU3hEUVVGRExHVkJRV1VzUjBGQlJ5eGxRVUZsTEVOQlFVTTdRVUZETDBNc1MwRkJTenM3U1VGRlJDeEhRVUZITEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVc1MwRkJTeXhGUVVGRk8xRkJRM1pDTEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzUzBGQlN5eERRVUZETzFGQlF6TkNMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF6dEJRVU53UWl4TFFVRkxPenRKUVVWRUxFZEJRVWNzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlR0UlFVTm9RaXhQUVVGUExFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRiRU1zUzBGQlN6czdTVUZGUkN4SlFVRkpMRVZCUVVVc1dVRkJXVHRSUVVOa0xGbEJRVmtzUTBGQlF5eFBRVUZQTEVOQlFVTXNhVUpCUVdsQ0xFVkJRVVVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU1zUTBGQlF6dEJRVU12UlN4TFFVRkxPenRKUVVWRUxHRkJRV0VzUlVGQlJTeFpRVUZaTzFGQlEzWkNMRWxCUVVrc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eGxRVUZsTEVOQlFVTTdVVUZEY0VNc1NVRkJTU3hSUVVGUkxFVkJRVVU3V1VGRFZpeEpRVUZKTEVOQlFVTXNVVUZCVVN4SFFVRkhMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJTeEZRVUZGTEZGQlFWRXNRMEZCUXl4RFFVRkRPMWxCUTNaRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXp0VFFVTm1PMHRCUTBvN1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSeXhSUVVGUkxFTkJRVU1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdYeUE5SUhKbGNYVnBjbVVvSnk0dmRYUnBiSE1uS1R0Y2JuWmhjaUJzYjJOaGJGOXpkRzl5WVdkbFgydGxlU0E5SUNkMWRHMWxMWE5sZEhScGJtZHpKenRjYmx4dVpuVnVZM1JwYjI0Z1UyVjBkR2x1WjNNZ0tHUmxabUYxYkhSVFpYUjBhVzVuY3lrZ2UxeHVJQ0FnSUhSb2FYTXVjMlYwUkdWbVlYVnNkSE1vWkdWbVlYVnNkRk5sZEhScGJtZHpJSHg4SUh0OUtUdGNibjFjYmx4dVUyVjBkR2x1WjNNdWNISnZkRzkwZVhCbElEMGdlMXh1SUNBZ0lISmxZV1JUWlhSMGFXNW5jMFp5YjIxTWIyTmhiRk4wYjNKaFoyVTZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE5sZEhScGJtZHpVM1J5YVc1bklEMGdiRzlqWVd4VGRHOXlZV2RsTG1kbGRFbDBaVzBvYkc5allXeGZjM1J2Y21GblpWOXJaWGtwTzF4dUlDQWdJQ0FnSUNCMllYSWdjMlYwZEdsdVozTWdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5sZEhScGJtZHpVM1J5YVc1bktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCelpYUjBhVzVuY3lBOUlFcFRUMDR1Y0dGeWMyVW9jMlYwZEdsdVozTlRkSEpwYm1jcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpaWFIwYVc1bmN6dGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2MyVjBSR1ZtWVhWc2RITTZJR1oxYm1OMGFXOXVJQ2hrWldaaGRXeDBVMlYwZEdsdVozTXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHeHZZMkZzVTJWMGRHbHVaM01nUFNCMGFHbHpMbkpsWVdSVFpYUjBhVzVuYzBaeWIyMU1iMk5oYkZOMGIzSmhaMlVvS1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1JsWm1GMWJIUnpRMjl3ZVNBOUlGOHVaWGgwWlc1a0tIdDlMQ0JrWldaaGRXeDBVMlYwZEdsdVozTWdmSHdnZTMwcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRIUnBibWR6SUQwZ1h5NWxlSFJsYm1Rb2UzMHNJRjh1WlhoMFpXNWtLR1JsWm1GMWJIUnpRMjl3ZVN3Z2JHOWpZV3hUWlhSMGFXNW5jeWtwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbVJsWm1GMWJIUlRaWFIwYVc1bmN5QTlJR1JsWm1GMWJIUlRaWFIwYVc1bmN6dGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2MyVjBPaUJtZFc1amRHbHZiaUFvYTJWNUxDQjJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRIUnBibWR6VzJ0bGVWMGdQU0IyWVd4MVpUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ellYWmxLQ2s3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJR2RsZERvZ1puVnVZM1JwYjI0Z0tHdGxlU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NXpaWFIwYVc1bmMxdHJaWGxkTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J6WVhabE9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUd4dlkyRnNVM1J2Y21GblpTNXpaWFJKZEdWdEtHeHZZMkZzWDNOMGIzSmhaMlZmYTJWNUxDQktVMDlPTG5OMGNtbHVaMmxtZVNoMGFHbHpMbk5sZEhScGJtZHpLU2s3WEc0Z0lDQWdmU3hjYmlBZ0lDQmNiaUFnSUNCeVpYTmxkRVJsWm1GMWJIUnpPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJrWldaaGRXeDBjeUE5SUhSb2FYTXVaR1ZtWVhWc2RGTmxkSFJwYm1kek8xeHVJQ0FnSUNBZ0lDQnBaaUFvWkdWbVlYVnNkSE1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdWMyVjBkR2x1WjNNZ1BTQmZMbVY0ZEdWdVpDaDdmU3dnWkdWbVlYVnNkSE1wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1ellYWmxLQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1OU8xeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJRk5sZEhScGJtZHpPMXh1SWwxOSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgU2ltdWxhdGUgPSB7XG4gICAgZXZlbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGV2ZW50TmFtZSwgb3B0aW9ucyl7XG4gICAgICAgIHZhciBldnQ7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCkge1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJIVE1MRXZlbnRzXCIpO1xuICAgICAgICAgICAgZXZ0LmluaXRFdmVudChldmVudE5hbWUsIGV2ZW50TmFtZSAhPSAnbW91c2VlbnRlcicgJiYgZXZlbnROYW1lICE9ICdtb3VzZWxlYXZlJywgdHJ1ZSApO1xuICAgICAgICAgICAgXy5leHRlbmQoZXZ0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gICAgICAgICAgICBlbGVtZW50LmZpcmVFdmVudCgnb24nICsgZXZlbnROYW1lLGV2dCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGtleUV2ZW50OiBmdW5jdGlvbihlbGVtZW50LCB0eXBlLCBvcHRpb25zKXtcbiAgICAgICAgdmFyIGV2dCxcbiAgICAgICAgICAgIGUgPSB7XG4gICAgICAgICAgICAgICAgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSwgdmlldzogd2luZG93LFxuICAgICAgICAgICAgICAgIGN0cmxLZXk6IGZhbHNlLCBhbHRLZXk6IGZhbHNlLCBzaGlmdEtleTogZmFsc2UsIG1ldGFLZXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGtleUNvZGU6IDAsIGNoYXJDb2RlOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICBfLmV4dGVuZChlLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50KXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnS2V5RXZlbnRzJyk7XG4gICAgICAgICAgICAgICAgZXZ0LmluaXRLZXlFdmVudChcbiAgICAgICAgICAgICAgICAgICAgdHlwZSwgZS5idWJibGVzLCBlLmNhbmNlbGFibGUsIGUudmlldyxcbiAgICAgICAgICAgIGUuY3RybEtleSwgZS5hbHRLZXksIGUuc2hpZnRLZXksIGUubWV0YUtleSxcbiAgICAgICAgICAgIGUua2V5Q29kZSwgZS5jaGFyQ29kZSk7XG4gICAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudHNcIik7XG4gICAgICAgIGV2dC5pbml0RXZlbnQodHlwZSwgZS5idWJibGVzLCBlLmNhbmNlbGFibGUpO1xuICAgICAgICBfLmV4dGVuZChldnQsIHtcbiAgICAgICAgICAgIHZpZXc6IGUudmlldyxcbiAgICAgICAgICBjdHJsS2V5OiBlLmN0cmxLZXksIGFsdEtleTogZS5hbHRLZXksXG4gICAgICAgICAgc2hpZnRLZXk6IGUuc2hpZnRLZXksIG1ldGFLZXk6IGUubWV0YUtleSxcbiAgICAgICAgICBrZXlDb2RlOiBlLmtleUNvZGUsIGNoYXJDb2RlOiBlLmNoYXJDb2RlXG4gICAgICAgIH0pO1xuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuU2ltdWxhdGUua2V5cHJlc3MgPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleXByZXNzJywge1xuICAgICAgICBrZXlDb2RlOiBjaGFyQ29kZSxcbiAgICAgICAgY2hhckNvZGU6IGNoYXJDb2RlXG4gICAgfSk7XG59O1xuXG5TaW11bGF0ZS5rZXlkb3duID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXlkb3duJywge1xuICAgICAgICBrZXlDb2RlOiBjaGFyQ29kZSxcbiAgICAgICAgY2hhckNvZGU6IGNoYXJDb2RlXG4gICAgfSk7XG59O1xuXG5TaW11bGF0ZS5rZXl1cCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5dXAnLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cbnZhciBldmVudHMgPSBbXG4gICAgJ2NsaWNrJyxcbiAgICAnZm9jdXMnLFxuICAgICdibHVyJyxcbiAgICAnZGJsY2xpY2snLFxuICAgICdpbnB1dCcsXG4gICAgJ2NoYW5nZScsXG4gICAgJ21vdXNlZG93bicsXG4gICAgJ21vdXNlbW92ZScsXG4gICAgJ21vdXNlb3V0JyxcbiAgICAnbW91c2VvdmVyJyxcbiAgICAnbW91c2V1cCcsXG4gICAgJ21vdXNlZW50ZXInLFxuICAgICdtb3VzZWxlYXZlJyxcbiAgICAncmVzaXplJyxcbiAgICAnc2Nyb2xsJyxcbiAgICAnc2VsZWN0JyxcbiAgICAnc3VibWl0JyxcbiAgICAnbG9hZCcsXG4gICAgJ3VubG9hZCdcbl07XG5cbmZvciAodmFyIGkgPSBldmVudHMubGVuZ3RoOyBpLS07KXtcbiAgICB2YXIgZXZlbnQgPSBldmVudHNbaV07XG4gICAgU2ltdWxhdGVbZXZlbnRdID0gKGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKXtcbiAgICAgICAgICAgIHRoaXMuZXZlbnQoZWxlbWVudCwgZXZ0LCBvcHRpb25zKTtcbiAgICAgICAgfTtcbiAgICB9KGV2ZW50KSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2ltdWxhdGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzTnBiWFZzWVhSbExtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12YzJsdGRXeGhkR1V1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRXNTVUZCU1N4RFFVRkRMRWRCUVVjc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZET3p0QlFVVXpRaXhKUVVGSkxGRkJRVkVzUjBGQlJ6dEpRVU5ZTEV0QlFVc3NSVUZCUlN4VFFVRlRMRTlCUVU4c1JVRkJSU3hUUVVGVExFVkJRVVVzVDBGQlR5eERRVUZETzFGQlEzaERMRWxCUVVrc1IwRkJSeXhEUVVGRE8xRkJRMUlzU1VGQlNTeFJRVUZSTEVOQlFVTXNWMEZCVnl4RlFVRkZPMWxCUTNSQ0xFZEJRVWNzUjBGQlJ5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8xbEJRM3BETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1UwRkJVeXhGUVVGRkxGTkJRVk1zU1VGQlNTeFpRVUZaTEVsQlFVa3NVMEZCVXl4SlFVRkpMRmxCUVZrc1JVRkJSU3hKUVVGSkxFVkJRVVVzUTBGQlF6dFpRVU40Uml4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0WlFVTjJRaXhQUVVGUExFTkJRVU1zWVVGQllTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUXpsQ0xFbEJRVWs3V1VGRFJDeEhRVUZITEVkQlFVY3NVVUZCVVN4RFFVRkRMR2xDUVVGcFFpeEZRVUZGTEVOQlFVTTdXVUZEYmtNc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVkQlFVY3NVMEZCVXl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8xTkJRek5ETzB0QlEwbzdTVUZEUkN4UlFVRlJMRVZCUVVVc1UwRkJVeXhQUVVGUExFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNRMEZCUXp0UlFVTjBReXhKUVVGSkxFZEJRVWM3V1VGRFNDeERRVUZETEVkQlFVYzdaMEpCUTBFc1QwRkJUeXhGUVVGRkxFbEJRVWtzUlVGQlJTeFZRVUZWTEVWQlFVVXNTVUZCU1N4RlFVRkZMRWxCUVVrc1JVRkJSU3hOUVVGTk8yZENRVU0zUXl4UFFVRlBMRVZCUVVVc1MwRkJTeXhGUVVGRkxFMUJRVTBzUlVGQlJTeExRVUZMTEVWQlFVVXNVVUZCVVN4RlFVRkZMRXRCUVVzc1JVRkJSU3hQUVVGUExFVkJRVVVzUzBGQlN6dG5Ra0ZET1VRc1QwRkJUeXhGUVVGRkxFTkJRVU1zUlVGQlJTeFJRVUZSTEVWQlFVVXNRMEZCUXp0aFFVTXhRaXhEUVVGRE8xRkJRMDRzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03VVVGRGNrSXNTVUZCU1N4UlFVRlJMRU5CUVVNc1YwRkJWeXhEUVVGRE8xbEJRM0pDTEVkQlFVYzdaMEpCUTBNc1IwRkJSeXhIUVVGSExGRkJRVkVzUTBGQlF5eFhRVUZYTEVOQlFVTXNWMEZCVnl4RFFVRkRMRU5CUVVNN1owSkJRM2hETEVkQlFVY3NRMEZCUXl4WlFVRlpPMjlDUVVOYUxFbEJRVWtzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhWUVVGVkxFVkJRVVVzUTBGQlF5eERRVUZETEVsQlFVazdXVUZETjBNc1EwRkJReXhEUVVGRExFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVODdXVUZETVVNc1EwRkJReXhEUVVGRExFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNN1ZVRkRla0lzVDBGQlR5eERRVUZETEdGQlFXRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRUUVVNMVFpeE5RVUZOTEVkQlFVY3NRMEZCUXp0WlFVTlFMRWRCUVVjc1IwRkJSeXhSUVVGUkxFTkJRVU1zVjBGQlZ5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPMUZCUTNwRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEZWQlFWVXNRMEZCUXl4RFFVRkRPMUZCUXpkRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSMEZCUnl4RlFVRkZPMWxCUTFZc1NVRkJTU3hGUVVGRkxFTkJRVU1zUTBGQlF5eEpRVUZKTzFWQlEyUXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5PMVZCUTNCRExGRkJRVkVzUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RlFVRkZMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVDBGQlR6dFZRVU40UXl4UFFVRlBMRVZCUVVVc1EwRkJReXhEUVVGRExFOUJRVThzUlVGQlJTeFJRVUZSTEVWQlFVVXNRMEZCUXl4RFFVRkRMRkZCUVZFN1UwRkRla01zUTBGQlF5eERRVUZETzFGQlEwZ3NUMEZCVHl4RFFVRkRMR0ZCUVdFc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dFRRVU14UWp0VFFVTkJPMHRCUTBvN1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNVVUZCVVN4RFFVRkRMRkZCUVZFc1IwRkJSeXhUUVVGVExFOUJRVThzUlVGQlJTeEhRVUZITEVOQlFVTTdTVUZEZEVNc1NVRkJTU3hSUVVGUkxFZEJRVWNzUjBGQlJ5eERRVUZETEZWQlFWVXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRKUVVOcVF5eEpRVUZKTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1JVRkJSU3hWUVVGVkxFVkJRVVU3VVVGREwwSXNUMEZCVHl4RlFVRkZMRkZCUVZFN1VVRkRha0lzVVVGQlVTeEZRVUZGTEZGQlFWRTdTMEZEY2tJc1EwRkJReXhEUVVGRE8wRkJRMUFzUTBGQlF5eERRVUZET3p0QlFVVkdMRkZCUVZFc1EwRkJReXhQUVVGUExFZEJRVWNzVTBGQlV5eFBRVUZQTEVWQlFVVXNSMEZCUnl4RFFVRkRPMGxCUTNKRExFbEJRVWtzVVVGQlVTeEhRVUZITEVkQlFVY3NRMEZCUXl4VlFVRlZMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03U1VGRGFrTXNTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhQUVVGUExFVkJRVVVzVTBGQlV5eEZRVUZGTzFGQlF6bENMRTlCUVU4c1JVRkJSU3hSUVVGUk8xRkJRMnBDTEZGQlFWRXNSVUZCUlN4UlFVRlJPMHRCUTNKQ0xFTkJRVU1zUTBGQlF6dEJRVU5RTEVOQlFVTXNRMEZCUXpzN1FVRkZSaXhSUVVGUkxFTkJRVU1zUzBGQlN5eEhRVUZITEZOQlFWTXNUMEZCVHl4RlFVRkZMRWRCUVVjc1EwRkJRenRKUVVOdVF5eEpRVUZKTEZGQlFWRXNSMEZCUnl4SFFVRkhMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBsQlEycERMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zVDBGQlR5eEZRVUZGTEU5QlFVOHNSVUZCUlR0UlFVTTFRaXhQUVVGUExFVkJRVVVzVVVGQlVUdFJRVU5xUWl4UlFVRlJMRVZCUVVVc1VVRkJVVHRMUVVOeVFpeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRMRU5CUVVNN08wRkJSVVlzU1VGQlNTeE5RVUZOTEVkQlFVYzdTVUZEVkN4UFFVRlBPMGxCUTFBc1QwRkJUenRKUVVOUUxFMUJRVTA3U1VGRFRpeFZRVUZWTzBsQlExWXNUMEZCVHp0SlFVTlFMRkZCUVZFN1NVRkRVaXhYUVVGWE8wbEJRMWdzVjBGQlZ6dEpRVU5ZTEZWQlFWVTdTVUZEVml4WFFVRlhPMGxCUTFnc1UwRkJVenRKUVVOVUxGbEJRVms3U1VGRFdpeFpRVUZaTzBsQlExb3NVVUZCVVR0SlFVTlNMRkZCUVZFN1NVRkRVaXhSUVVGUk8wbEJRMUlzVVVGQlVUdEpRVU5TTEUxQlFVMDdTVUZEVGl4UlFVRlJPMEZCUTFvc1EwRkJReXhEUVVGRE96dEJRVVZHTEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1RVRkJUU3hEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETEVWQlFVVXNSVUZCUlR0SlFVTTNRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eE5RVUZOTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1NVRkRkRUlzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRk5CUVZNc1IwRkJSeXhEUVVGRE8xRkJRelZDTEU5QlFVOHNVMEZCVXl4UFFVRlBMRVZCUVVVc1QwRkJUeXhEUVVGRE8xbEJRemRDTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1QwRkJUeXhGUVVGRkxFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0VFFVTnlReXhEUVVGRE8wdEJRMHdzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTJRc1EwRkJRenM3UVVGRlJDeE5RVUZOTEVOQlFVTXNUMEZCVHl4SFFVRkhMRkZCUVZFaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SjJZWElnWHlBOUlISmxjWFZwY21Vb0p5NHZkWFJwYkhNbktUdGNibHh1ZG1GeUlGTnBiWFZzWVhSbElEMGdlMXh1SUNBZ0lHVjJaVzUwT2lCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCbGRtVnVkRTVoYldVc0lHOXdkR2x2Ym5NcGUxeHVJQ0FnSUNBZ0lDQjJZWElnWlhaME8xeHVJQ0FnSUNBZ0lDQnBaaUFvWkc5amRXMWxiblF1WTNKbFlYUmxSWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWMmRDQTlJR1J2WTNWdFpXNTBMbU55WldGMFpVVjJaVzUwS0Z3aVNGUk5URVYyWlc1MGMxd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1sMFJYWmxiblFvWlhabGJuUk9ZVzFsTENCbGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObFpXNTBaWEluSUNZbUlHVjJaVzUwVG1GdFpTQWhQU0FuYlc5MWMyVnNaV0YyWlNjc0lIUnlkV1VnS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJRjh1WlhoMFpXNWtLR1YyZEN3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsYkdWdFpXNTBMbVJwYzNCaGRHTm9SWFpsYm5Rb1pYWjBLVHRjYmlBZ0lDQWdJQ0FnZldWc2MyVjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbGRuUWdQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZkbVZ1ZEU5aWFtVmpkQ2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdaV3hsYldWdWRDNW1hWEpsUlhabGJuUW9KMjl1SnlBcklHVjJaVzUwVG1GdFpTeGxkblFwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0JyWlhsRmRtVnVkRG9nWm5WdVkzUnBiMjRvWld4bGJXVnVkQ3dnZEhsd1pTd2diM0IwYVc5dWN5bDdYRzRnSUNBZ0lDQWdJSFpoY2lCbGRuUXNYRzRnSUNBZ0lDQWdJQ0FnSUNCbElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0oxWW1Kc1pYTTZJSFJ5ZFdVc0lHTmhibU5sYkdGaWJHVTZJSFJ5ZFdVc0lIWnBaWGM2SUhkcGJtUnZkeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqZEhKc1MyVjVPaUJtWVd4elpTd2dZV3gwUzJWNU9pQm1ZV3h6WlN3Z2MyaHBablJMWlhrNklHWmhiSE5sTENCdFpYUmhTMlY1T2lCbVlXeHpaU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JyWlhsRGIyUmxPaUF3TENCamFHRnlRMjlrWlRvZ01GeHVJQ0FnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ1h5NWxlSFJsYm1Rb1pTd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJR2xtSUNoa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGZG1WdWRDbDdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGNubDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaWFowSUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUlhabGJuUW9KMHRsZVVWMlpXNTBjeWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWMmRDNXBibWwwUzJWNVJYWmxiblFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUjVjR1VzSUdVdVluVmlZbXhsY3l3Z1pTNWpZVzVqWld4aFlteGxMQ0JsTG5acFpYY3NYRzRnSUNBZ0lDQWdJQ0FnSUNCbExtTjBjbXhMWlhrc0lHVXVZV3gwUzJWNUxDQmxMbk5vYVdaMFMyVjVMQ0JsTG0xbGRHRkxaWGtzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxMbXRsZVVOdlpHVXNJR1V1WTJoaGNrTnZaR1VwTzF4dUlDQWdJQ0FnSUNBZ0lHVnNaVzFsYm5RdVpHbHpjR0YwWTJoRmRtVnVkQ2hsZG5RcE8xeHVJQ0FnSUNBZ0lDQjlZMkYwWTJnb1pYSnlLWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVYyWlc1MEtGd2lSWFpsYm5SelhDSXBPMXh1SUNBZ0lDQWdJQ0JsZG5RdWFXNXBkRVYyWlc1MEtIUjVjR1VzSUdVdVluVmlZbXhsY3l3Z1pTNWpZVzVqWld4aFlteGxLVHRjYmlBZ0lDQWdJQ0FnWHk1bGVIUmxibVFvWlhaMExDQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMmFXVjNPaUJsTG5acFpYY3NYRzRnSUNBZ0lDQWdJQ0FnWTNSeWJFdGxlVG9nWlM1amRISnNTMlY1TENCaGJIUkxaWGs2SUdVdVlXeDBTMlY1TEZ4dUlDQWdJQ0FnSUNBZ0lITm9hV1owUzJWNU9pQmxMbk5vYVdaMFMyVjVMQ0J0WlhSaFMyVjVPaUJsTG0xbGRHRkxaWGtzWEc0Z0lDQWdJQ0FnSUNBZ2EyVjVRMjlrWlRvZ1pTNXJaWGxEYjJSbExDQmphR0Z5UTI5a1pUb2daUzVqYUdGeVEyOWtaVnh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ1pXeGxiV1Z1ZEM1a2FYTndZWFJqYUVWMlpXNTBLR1YyZENrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibjA3WEc1Y2JsTnBiWFZzWVhSbExtdGxlWEJ5WlhOeklEMGdablZ1WTNScGIyNG9aV3hsYldWdWRDd2dZMmh5S1h0Y2JpQWdJQ0IyWVhJZ1kyaGhja052WkdVZ1BTQmphSEl1WTJoaGNrTnZaR1ZCZENnd0tUdGNiaUFnSUNCMGFHbHpMbXRsZVVWMlpXNTBLR1ZzWlcxbGJuUXNJQ2RyWlhsd2NtVnpjeWNzSUh0Y2JpQWdJQ0FnSUNBZ2EyVjVRMjlrWlRvZ1kyaGhja052WkdVc1hHNGdJQ0FnSUNBZ0lHTm9ZWEpEYjJSbE9pQmphR0Z5UTI5a1pWeHVJQ0FnSUgwcE8xeHVmVHRjYmx4dVUybHRkV3hoZEdVdWEyVjVaRzkzYmlBOUlHWjFibU4wYVc5dUtHVnNaVzFsYm5Rc0lHTm9jaWw3WEc0Z0lDQWdkbUZ5SUdOb1lYSkRiMlJsSUQwZ1kyaHlMbU5vWVhKRGIyUmxRWFFvTUNrN1hHNGdJQ0FnZEdocGN5NXJaWGxGZG1WdWRDaGxiR1Z0Wlc1MExDQW5hMlY1Wkc5M2JpY3NJSHRjYmlBZ0lDQWdJQ0FnYTJWNVEyOWtaVG9nWTJoaGNrTnZaR1VzWEc0Z0lDQWdJQ0FnSUdOb1lYSkRiMlJsT2lCamFHRnlRMjlrWlZ4dUlDQWdJSDBwTzF4dWZUdGNibHh1VTJsdGRXeGhkR1V1YTJWNWRYQWdQU0JtZFc1amRHbHZiaWhsYkdWdFpXNTBMQ0JqYUhJcGUxeHVJQ0FnSUhaaGNpQmphR0Z5UTI5a1pTQTlJR05vY2k1amFHRnlRMjlrWlVGMEtEQXBPMXh1SUNBZ0lIUm9hWE11YTJWNVJYWmxiblFvWld4bGJXVnVkQ3dnSjJ0bGVYVndKeXdnZTF4dUlDQWdJQ0FnSUNCclpYbERiMlJsT2lCamFHRnlRMjlrWlN4Y2JpQWdJQ0FnSUNBZ1kyaGhja052WkdVNklHTm9ZWEpEYjJSbFhHNGdJQ0FnZlNrN1hHNTlPMXh1WEc1MllYSWdaWFpsYm5SeklEMGdXMXh1SUNBZ0lDZGpiR2xqYXljc1hHNGdJQ0FnSjJadlkzVnpKeXhjYmlBZ0lDQW5ZbXgxY2ljc1hHNGdJQ0FnSjJSaWJHTnNhV05ySnl4Y2JpQWdJQ0FuYVc1d2RYUW5MRnh1SUNBZ0lDZGphR0Z1WjJVbkxGeHVJQ0FnSUNkdGIzVnpaV1J2ZDI0bkxGeHVJQ0FnSUNkdGIzVnpaVzF2ZG1VbkxGeHVJQ0FnSUNkdGIzVnpaVzkxZENjc1hHNGdJQ0FnSjIxdmRYTmxiM1psY2ljc1hHNGdJQ0FnSjIxdmRYTmxkWEFuTEZ4dUlDQWdJQ2R0YjNWelpXVnVkR1Z5Snl4Y2JpQWdJQ0FuYlc5MWMyVnNaV0YyWlNjc1hHNGdJQ0FnSjNKbGMybDZaU2NzWEc0Z0lDQWdKM05qY205c2JDY3NYRzRnSUNBZ0ozTmxiR1ZqZENjc1hHNGdJQ0FnSjNOMVltMXBkQ2NzWEc0Z0lDQWdKMnh2WVdRbkxGeHVJQ0FnSUNkMWJteHZZV1FuWEc1ZE8xeHVYRzVtYjNJZ0tIWmhjaUJwSUQwZ1pYWmxiblJ6TG14bGJtZDBhRHNnYVMwdE95bDdYRzRnSUNBZ2RtRnlJR1YyWlc1MElEMGdaWFpsYm5SelcybGRPMXh1SUNBZ0lGTnBiWFZzWVhSbFcyVjJaVzUwWFNBOUlDaG1kVzVqZEdsdmJpaGxkblFwZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRvWld4bGJXVnVkQ3dnYjNCMGFXOXVjeWw3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG1WMlpXNTBLR1ZzWlcxbGJuUXNJR1YyZEN3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ2ZTaGxkbVZ1ZENrcE8xeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZOcGJYVnNZWFJsT3lKZGZRPT0iLCIvKipcbiAqIFBvbHlmaWxsc1xuICovXG5cbi8qKlxuICogVGhpcyBpcyBjb3BpZWQgZnJvbSBSZWFjSlMncyBvd24gcG9seXBmaWxsIHRvIHJ1biB0ZXN0cyB3aXRoIHBoYW50b21qcy5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC9ibG9iLzNkYzEwNzQ5MDgwYTQ2MGU0OGJlZTQ2ZDc2OTc2M2VjNzE5MWFjNzYvc3JjL3Rlc3QvcGhhbnRvbWpzLXNoaW1zLmpzXG4gKi9cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBBcCA9IEFycmF5LnByb3RvdHlwZTtcbiAgICB2YXIgc2xpY2UgPSBBcC5zbGljZTtcbiAgICB2YXIgRnAgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgICBpZiAoIUZwLmJpbmQpIHtcbiAgICAgIC8vIFBoYW50b21KUyBkb2Vzbid0IHN1cHBvcnQgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgbmF0aXZlbHksIHNvXG4gICAgICAvLyBwb2x5ZmlsbCBpdCB3aGVuZXZlciB0aGlzIG1vZHVsZSBpcyByZXF1aXJlZC5cbiAgICAgIEZwLmJpbmQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgIHZhciBmdW5jID0gdGhpcztcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICAgICAgZnVuY3Rpb24gYm91bmQoKSB7XG4gICAgICAgICAgdmFyIGludm9rZWRBc0NvbnN0cnVjdG9yID0gZnVuYy5wcm90b3R5cGUgJiYgKHRoaXMgaW5zdGFuY2VvZiBmdW5jKTtcbiAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShcbiAgICAgICAgICAgIC8vIElnbm9yZSB0aGUgY29udGV4dCBwYXJhbWV0ZXIgd2hlbiBpbnZva2luZyB0aGUgYm91bmQgZnVuY3Rpb25cbiAgICAgICAgICAgIC8vIGFzIGEgY29uc3RydWN0b3IuIE5vdGUgdGhhdCB0aGlzIGluY2x1ZGVzIG5vdCBvbmx5IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAvLyBpbnZvY2F0aW9ucyB1c2luZyB0aGUgbmV3IGtleXdvcmQgYnV0IGFsc28gY2FsbHMgdG8gYmFzZSBjbGFzc1xuICAgICAgICAgICAgLy8gY29uc3RydWN0b3JzIHN1Y2ggYXMgQmFzZUNsYXNzLmNhbGwodGhpcywgLi4uKSBvciBzdXBlciguLi4pLlxuICAgICAgICAgICAgIWludm9rZWRBc0NvbnN0cnVjdG9yICYmIGNvbnRleHQgfHwgdGhpcyxcbiAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGJvdW5kIGZ1bmN0aW9uIG11c3Qgc2hhcmUgdGhlIC5wcm90b3R5cGUgb2YgdGhlIHVuYm91bmRcbiAgICAgICAgLy8gZnVuY3Rpb24gc28gdGhhdCBhbnkgb2JqZWN0IGNyZWF0ZWQgYnkgb25lIGNvbnN0cnVjdG9yIHdpbGwgY291bnRcbiAgICAgICAgLy8gYXMgYW4gaW5zdGFuY2Ugb2YgYm90aCBjb25zdHJ1Y3RvcnMuXG4gICAgICAgIGJvdW5kLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuXG4gICAgICAgIHJldHVybiBib3VuZDtcbiAgICAgIH07XG4gICAgfVxuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKGRzdCwgc3JjKXtcbiAgICAgICAgaWYgKHNyYykge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNyYykge1xuICAgICAgICAgICAgICAgIGlmIChzcmMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZHN0O1xuICAgIH0sXG5cbiAgICBtYXA6IGZ1bmN0aW9uKG9iaiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGggPj4+IDA7XG4gICAgICAgIHZhciBuZXdBcnJheSA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgICB2YXIga2V5ID0gMDtcbiAgICAgICAgaWYgKCF0aGlzQXJnKSB7XG4gICAgICAgICAgICB0aGlzQXJnID0gb2JqO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChrZXkgPCBsZW4pIHtcbiAgICAgICAgICAgIG5ld0FycmF5W2tleV0gPSBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIG9ialtrZXldLCBrZXksIG9iaik7XG4gICAgICAgICAgICBrZXkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XG4gICAgfVxuXG59O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzVjBhV3h6TG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZkWFJwYkhNdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3TzBGQlJVRXNSMEZCUnpzN1FVRkZTRHRCUVVOQk96dEhRVVZITzBGQlEwZ3NRMEZCUXl4WFFVRlhPenRKUVVWU0xFbEJRVWtzUlVGQlJTeEhRVUZITEV0QlFVc3NRMEZCUXl4VFFVRlRMRU5CUVVNN1NVRkRla0lzU1VGQlNTeExRVUZMTEVkQlFVY3NSVUZCUlN4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVONlFpeEpRVUZKTEVsQlFVa3NSVUZCUlN4SFFVRkhMRkZCUVZFc1EwRkJReXhUUVVGVExFTkJRVU03TzBGQlJXaERMRWxCUVVrc1NVRkJTU3hEUVVGRExFVkJRVVVzUTBGQlF5eEpRVUZKTEVWQlFVVTdRVUZEYkVJN08wMUJSVTBzUlVGQlJTeERRVUZETEVsQlFVa3NSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSVHRSUVVNeFFpeEpRVUZKTEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRlRUlzVVVGQlVTeEpRVUZKTEVsQlFVa3NSMEZCUnl4TFFVRkxMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUlVGQlJTeERRVUZETEVOQlFVTXNRMEZCUXpzN1VVRkZjRU1zVTBGQlV5eExRVUZMTEVkQlFVYzdWVUZEWml4SlFVRkpMRzlDUVVGdlFpeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRXRCUVVzc1NVRkJTU3haUVVGWkxFbEJRVWtzUTBGQlF5eERRVUZETzBGQlF6bEZMRlZCUVZVc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN6dEJRVU16UWp0QlFVTkJPMEZCUTBFN08xbEJSVmtzUTBGQlF5eHZRa0ZCYjBJc1NVRkJTU3hQUVVGUExFbEJRVWtzU1VGQlNUdFpRVU40UXl4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN1YwRkRia01zUTBGQlF6dEJRVU5hTEZOQlFWTTdRVUZEVkR0QlFVTkJPMEZCUTBFN08wRkJSVUVzVVVGQlVTeExRVUZMTEVOQlFVTXNVMEZCVXl4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU03TzFGQlJXcERMRTlCUVU4c1MwRkJTeXhEUVVGRE8wOUJRMlFzUTBGQlF6dEJRVU5TTEV0QlFVczdPMEZCUlV3c1EwRkJReXhIUVVGSExFTkJRVU03TzBGQlJVd3NUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSenM3U1VGRllpeE5RVUZOTEVWQlFVVXNVMEZCVXl4TlFVRk5MRU5CUVVNc1IwRkJSeXhGUVVGRkxFZEJRVWNzUTBGQlF6dFJRVU0zUWl4SlFVRkpMRWRCUVVjc1JVRkJSVHRaUVVOTUxFdEJRVXNzU1VGQlNTeEhRVUZITEVsQlFVa3NSMEZCUnl4RlFVRkZPMmRDUVVOcVFpeEpRVUZKTEVkQlFVY3NRMEZCUXl4alFVRmpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVU3YjBKQlEzcENMRWRCUVVjc1EwRkJReXhIUVVGSExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN2FVSkJRM1pDTzJGQlEwbzdVMEZEU2p0UlFVTkVMRTlCUVU4c1IwRkJSeXhEUVVGRE8wRkJRMjVDTEV0QlFVczdPMGxCUlVRc1IwRkJSeXhGUVVGRkxGTkJRVk1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNSVUZCUlN4UFFVRlBMRVZCUVVVN1VVRkRiRU1zU1VGQlNTeEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRTFCUVUwc1MwRkJTeXhEUVVGRExFTkJRVU03VVVGRE0wSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1NVRkJTU3hMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdVVUZET1VJc1NVRkJTU3hIUVVGSExFZEJRVWNzUTBGQlF5eERRVUZETzFGQlExb3NTVUZCU1N4RFFVRkRMRTlCUVU4c1JVRkJSVHRaUVVOV0xFOUJRVThzUjBGQlJ5eEhRVUZITEVOQlFVTTdVMEZEYWtJN1VVRkRSQ3hQUVVGUExFZEJRVWNzUjBGQlJ5eEhRVUZITEVWQlFVVTdXVUZEWkN4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzVVVGQlVTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRVZCUVVVc1IwRkJSeXhEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVkQlFVY3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRaUVVNelJDeEhRVUZITEVWQlFVVXNRMEZCUXp0VFFVTlVPMUZCUTBRc1QwRkJUeXhSUVVGUkxFTkJRVU03UVVGRGVFSXNTMEZCU3pzN1EwRkZTaXhEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lMeW9xWEc0Z0tpQlFiMng1Wm1sc2JITmNiaUFxTDF4dVhHNHZLaXBjYmlBcUlGUm9hWE1nYVhNZ1kyOXdhV1ZrSUdaeWIyMGdVbVZoWTBwVEozTWdiM2R1SUhCdmJIbHdabWxzYkNCMGJ5QnlkVzRnZEdWemRITWdkMmwwYUNCd2FHRnVkRzl0YW5NdVhHNGdLaUJvZEhSd2N6b3ZMMmRwZEdoMVlpNWpiMjB2Wm1GalpXSnZiMnN2Y21WaFkzUXZZbXh2WWk4elpHTXhNRGMwT1RBNE1HRTBOakJsTkRoaVpXVTBObVEzTmprM05qTmxZemN4T1RGaFl6YzJMM055WXk5MFpYTjBMM0JvWVc1MGIyMXFjeTF6YUdsdGN5NXFjMXh1SUNvdlhHNG9ablZ1WTNScGIyNG9LU0I3WEc1Y2JpQWdJQ0IyWVhJZ1FYQWdQU0JCY25KaGVTNXdjbTkwYjNSNWNHVTdYRzRnSUNBZ2RtRnlJSE5zYVdObElEMGdRWEF1YzJ4cFkyVTdYRzRnSUNBZ2RtRnlJRVp3SUQwZ1JuVnVZM1JwYjI0dWNISnZkRzkwZVhCbE8xeHVYRzRnSUNBZ2FXWWdLQ0ZHY0M1aWFXNWtLU0I3WEc0Z0lDQWdJQ0F2THlCUWFHRnVkRzl0U2xNZ1pHOWxjMjRuZENCemRYQndiM0owSUVaMWJtTjBhVzl1TG5CeWIzUnZkSGx3WlM1aWFXNWtJRzVoZEdsMlpXeDVMQ0J6YjF4dUlDQWdJQ0FnTHk4Z2NHOXNlV1pwYkd3Z2FYUWdkMmhsYm1WMlpYSWdkR2hwY3lCdGIyUjFiR1VnYVhNZ2NtVnhkV2x5WldRdVhHNGdJQ0FnSUNCR2NDNWlhVzVrSUQwZ1puVnVZM1JwYjI0b1kyOXVkR1Y0ZENrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnWm5WdVl5QTlJSFJvYVhNN1hHNGdJQ0FnSUNBZ0lIWmhjaUJoY21keklEMGdjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1zSURFcE8xeHVYRzRnSUNBZ0lDQWdJR1oxYm1OMGFXOXVJR0p2ZFc1a0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUE5SUdaMWJtTXVjSEp2ZEc5MGVYQmxJQ1ltSUNoMGFHbHpJR2x1YzNSaGJtTmxiMllnWm5WdVl5azdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYm1NdVlYQndiSGtvWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJKWjI1dmNtVWdkR2hsSUdOdmJuUmxlSFFnY0dGeVlXMWxkR1Z5SUhkb1pXNGdhVzUyYjJ0cGJtY2dkR2hsSUdKdmRXNWtJR1oxYm1OMGFXOXVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QmhjeUJoSUdOdmJuTjBjblZqZEc5eUxpQk9iM1JsSUhSb1lYUWdkR2hwY3lCcGJtTnNkV1JsY3lCdWIzUWdiMjVzZVNCamIyNXpkSEoxWTNSdmNseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2FXNTJiMk5oZEdsdmJuTWdkWE5wYm1jZ2RHaGxJRzVsZHlCclpYbDNiM0prSUdKMWRDQmhiSE52SUdOaGJHeHpJSFJ2SUdKaGMyVWdZMnhoYzNOY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUdOdmJuTjBjblZqZEc5eWN5QnpkV05vSUdGeklFSmhjMlZEYkdGemN5NWpZV3hzS0hSb2FYTXNJQzR1TGlrZ2IzSWdjM1Z3WlhJb0xpNHVLUzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDRnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUFtSmlCamIyNTBaWGgwSUh4OElIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ0lDQmhjbWR6TG1OdmJtTmhkQ2h6YkdsalpTNWpZV3hzS0dGeVozVnRaVzUwY3lrcFhHNGdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDOHZJRlJvWlNCaWIzVnVaQ0JtZFc1amRHbHZiaUJ0ZFhOMElITm9ZWEpsSUhSb1pTQXVjSEp2ZEc5MGVYQmxJRzltSUhSb1pTQjFibUp2ZFc1a1hHNGdJQ0FnSUNBZ0lDOHZJR1oxYm1OMGFXOXVJSE52SUhSb1lYUWdZVzU1SUc5aWFtVmpkQ0JqY21WaGRHVmtJR0o1SUc5dVpTQmpiMjV6ZEhKMVkzUnZjaUIzYVd4c0lHTnZkVzUwWEc0Z0lDQWdJQ0FnSUM4dklHRnpJR0Z1SUdsdWMzUmhibU5sSUc5bUlHSnZkR2dnWTI5dWMzUnlkV04wYjNKekxseHVJQ0FnSUNBZ0lDQmliM1Z1WkM1d2NtOTBiM1I1Y0dVZ1BTQm1kVzVqTG5CeWIzUnZkSGx3WlR0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1ltOTFibVE3WEc0Z0lDQWdJQ0I5TzF4dUlDQWdJSDFjYmx4dWZTa29LVHRjYmx4dWJXOWtkV3hsTG1WNGNHOXlkSE1nUFNCN1hHNWNiaUFnSUNCbGVIUmxibVE2SUdaMWJtTjBhVzl1SUdWNGRHVnVaQ2hrYzNRc0lITnlZeWw3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR3RsZVNCcGJpQnpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM0pqTG1oaGMwOTNibEJ5YjNCbGNuUjVLR3RsZVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkhOMFcydGxlVjBnUFNCemNtTmJhMlY1WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSemREdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JXRndPaUJtZFc1amRHbHZiaWh2WW1vc0lHTmhiR3hpWVdOckxDQjBhR2x6UVhKbktTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCc1pXNGdQU0J2WW1vdWJHVnVaM1JvSUQ0K1BpQXdPMXh1SUNBZ0lDQWdJQ0IyWVhJZ2JtVjNRWEp5WVhrZ1BTQnVaWGNnUVhKeVlYa29iR1Z1S1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3RsZVNBOUlEQTdYRzRnSUNBZ0lDQWdJR2xtSUNnaGRHaHBjMEZ5WnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGMwRnlaeUE5SUc5aWFqdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0IzYUdsc1pTQW9hMlY1SUR3Z2JHVnVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnVaWGRCY25KaGVWdHJaWGxkSUQwZ1kyRnNiR0poWTJzdVkyRnNiQ2gwYUdselFYSm5MQ0J2WW1wYmEyVjVYU3dnYTJWNUxDQnZZbW9wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdhMlY1S3lzN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHNWxkMEZ5Y21GNU8xeHVJQ0FnSUgxY2JseHVmVHRjYmlKZGZRPT0iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBQcm9taXNlID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xudmFyIFNpbXVsYXRlID0gcmVxdWlyZSgnLi9zaW11bGF0ZScpO1xudmFyIHNlbGVjdG9yRmluZGVyID0gcmVxdWlyZSgnLi9zZWxlY3RvckZpbmRlcicpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xuXG4vLyB2YXIgbXlHZW5lcmF0b3IgPSBuZXcgQ3NzU2VsZWN0b3JHZW5lcmF0b3IoKTtcbnZhciBpbXBvcnRhbnRTdGVwTGVuZ3RoID0gNTAwO1xudmFyIHNhdmVIYW5kbGVycyA9IFtdO1xudmFyIHJlcG9ydEhhbmRsZXJzID0gW107XG52YXIgbG9hZEhhbmRsZXJzID0gW107XG52YXIgc2V0dGluZ3NMb2FkSGFuZGxlcnMgPSBbXTtcblxuZnVuY3Rpb24gZ2V0U2NlbmFyaW8obmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGlmIChsb2FkSGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB2YXIgc3RhdGUgPSB1dG1lLnN0YXRlO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZS5zY2VuYXJpb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc2NlbmFyaW9zW2ldLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzdGF0ZS5zY2VuYXJpb3NbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvYWRIYW5kbGVyc1swXShuYW1lLCBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzcCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxudmFyIHZhbGlkYXRpbmcgPSBmYWxzZTtcblxudmFyIGV2ZW50cyA9IFtcbiAgICAnY2xpY2snLFxuICAgICdmb2N1cycsXG4gICAgJ2JsdXInLFxuICAgICdkYmxjbGljaycsXG4gICAgLy8gJ2RyYWcnLFxuICAgIC8vICdkcmFnZW50ZXInLFxuICAgIC8vICdkcmFnbGVhdmUnLFxuICAgIC8vICdkcmFnb3ZlcicsXG4gICAgLy8gJ2RyYWdzdGFydCcsXG4gICAgLy8gJ2lucHV0JyxcbiAgICAnbW91c2Vkb3duJyxcbiAgICAvLyAnbW91c2Vtb3ZlJyxcbiAgICAnbW91c2VlbnRlcicsXG4gICAgJ21vdXNlbGVhdmUnLFxuICAgICdtb3VzZW91dCcsXG4gICAgJ21vdXNlb3ZlcicsXG4gICAgJ21vdXNldXAnLFxuICAgICdjaGFuZ2UnLFxuICAgIC8vICdyZXNpemUnLFxuICAgIC8vICdzY3JvbGwnXG5dO1xuXG5mdW5jdGlvbiBnZXRDb25kaXRpb25zKHNjZW5hcmlvLCBjb25kaXRpb25UeXBlKSB7XG4gIHZhciBzZXR1cCA9IHNjZW5hcmlvW2NvbmRpdGlvblR5cGVdO1xuICB2YXIgc2NlbmFyaW9zID0gc2V0dXAgJiYgc2V0dXAuc2NlbmFyaW9zO1xuICAvLyBUT0RPOiBCcmVhayBvdXQgaW50byBoZWxwZXJcbiAgaWYgKHNjZW5hcmlvcykge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChfLm1hcChzY2VuYXJpb3MsIGZ1bmN0aW9uIChzY2VuYXJpb05hbWUpIHtcbiAgICAgIHJldHVybiBnZXRTY2VuYXJpbyhzY2VuYXJpb05hbWUpLnRoZW4oZnVuY3Rpb24gKG90aGVyU2NlbmFyaW8pIHtcbiAgICAgICAgb3RoZXJTY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3RoZXJTY2VuYXJpbykpO1xuICAgICAgICByZXR1cm4gc2V0dXBDb25kaXRpb25zKG90aGVyU2NlbmFyaW8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciB0b1JldHVybiA9IFtdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3RoZXJTY2VuYXJpby5zdGVwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdG9SZXR1cm4ucHVzaChvdGhlclNjZW5hcmlvLnN0ZXBzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRvUmV0dXJuO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcmVjb25kaXRpb25zIChzY2VuYXJpbykge1xuICByZXR1cm4gZ2V0Q29uZGl0aW9ucyhzY2VuYXJpbywgJ3NldHVwJyk7XG59XG5cbmZ1bmN0aW9uIGdldFBvc3Rjb25kaXRpb25zIChzY2VuYXJpbykge1xuICByZXR1cm4gZ2V0Q29uZGl0aW9ucyhzY2VuYXJpbywgJ2NsZWFudXAnKTtcbn1cblxuZnVuY3Rpb24gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBzKSB7XG4gICAgdmFyIG5ld1N0ZXBzID0gW107XG4gICAgdmFyIGN1cnJlbnRUaW1lc3RhbXA7IC8vIGluaXRhbGl6ZWQgYnkgZmlyc3QgbGlzdCBvZiBzdGVwcy5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBmbGF0U3RlcHMgPSBzdGVwc1tqXTtcbiAgICAgICAgaWYgKGogPiAwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHN0ZXBzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXAgPSBmbGF0U3RlcHNba107XG4gICAgICAgICAgICAgICAgdmFyIGRpZmYgPSBrID4gMCA/IHN0ZXAudGltZVN0YW1wIC0gZmxhdFN0ZXBzW2sgLSAxXS50aW1lU3RhbXAgOiA1MDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wICs9IGRpZmY7XG4gICAgICAgICAgICAgICAgZmxhdFN0ZXBzW2tdLnRpbWVTdGFtcCA9IGN1cnJlbnRUaW1lc3RhbXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wID0gZmxhdFN0ZXBzW2pdLnRpbWVTdGFtcDtcbiAgICAgICAgfVxuICAgICAgICBuZXdTdGVwcyA9IG5ld1N0ZXBzLmNvbmNhdChmbGF0U3RlcHMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3U3RlcHM7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRQcmVjb25kaXRpb25zKHNjZW5hcmlvKSxcbiAgICAgICAgZ2V0UG9zdGNvbmRpdGlvbnMoc2NlbmFyaW8pXG4gICAgXSkudGhlbihmdW5jdGlvbiAoc3RlcEFycmF5cykge1xuICAgICAgICB2YXIgc3RlcExpc3RzID0gc3RlcEFycmF5c1swXS5jb25jYXQoW3NjZW5hcmlvLnN0ZXBzXSwgc3RlcEFycmF5c1sxXSk7XG4gICAgICAgIHNjZW5hcmlvLnN0ZXBzID0gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBMaXN0cyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJ1blN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKSB7XG4gICAgdXRtZS5icm9hZGNhc3QoJ1JVTk5JTkdfU1RFUCcpO1xuICAgIHRvU2tpcCA9IHRvU2tpcCB8fCB7fTtcblxuICAgIHZhciBzdGVwID0gc2NlbmFyaW8uc3RlcHNbaWR4XTtcbiAgICB2YXIgc3RhdGUgPSB1dG1lLnN0YXRlO1xuICAgIGlmIChzdGVwICYmIHN0YXRlLnN0YXR1cyA9PSAnUExBWUlORycpIHtcbiAgICAgICAgc3RhdGUucnVuLnNjZW5hcmlvID0gc2NlbmFyaW87XG4gICAgICAgIHN0YXRlLnJ1bi5zdGVwSW5kZXggPSBpZHg7XG4gICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAnbG9hZCcpIHtcbiAgICAgICAgICAgIHZhciBuZXdMb2NhdGlvbiA9IHN0ZXAuZGF0YS51cmwucHJvdG9jb2wgKyBcIi8vXCIgKyBzdGVwLmRhdGEudXJsLmhvc3Q7XG4gICAgICAgICAgICB2YXIgc2VhcmNoID0gc3RlcC5kYXRhLnVybC5zZWFyY2g7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IHN0ZXAuZGF0YS51cmwuaGFzaDtcblxuICAgICAgICAgICAgaWYgKHNlYXJjaCAmJiAhc2VhcmNoLmNoYXJBdChcIj9cIikpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2ggPSBcIj9cIiArIHNlYXJjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc1NhbWVVUkwgPSAobG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24uc2VhcmNoKSA9PT0gKG5ld0xvY2F0aW9uICsgc2VhcmNoKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKG5ld0xvY2F0aW9uICsgaGFzaCArIHNlYXJjaCk7XG5cbiAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInZlcmJvc2VcIikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coKGxvY2F0aW9uLnByb3RvY29sICsgbG9jYXRpb24uaG9zdCArIGxvY2F0aW9uLnNlYXJjaCkpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygoc3RlcC5kYXRhLnVybC5wcm90b2NvbCArIHN0ZXAuZGF0YS51cmwuaG9zdCArIHN0ZXAuZGF0YS51cmwuc2VhcmNoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgbm90IGNoYW5nZWQgdGhlIGFjdHVhbCBsb2NhdGlvbiwgdGhlbiB0aGUgbG9jYXRpb24ucmVwbGFjZVxuICAgICAgICAgICAgLy8gd2lsbCBub3QgZ28gYW55d2hlcmVcbiAgICAgICAgICAgIGlmIChpc1NhbWVVUkwpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ3RpbWVvdXQnKSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCwgc3RlcC5kYXRhLmFtb3VudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbG9jYXRvciA9IHN0ZXAuZGF0YS5sb2NhdG9yO1xuICAgICAgICAgICAgdmFyIHN0ZXBzID0gc2NlbmFyaW8uc3RlcHM7XG4gICAgICAgICAgICB2YXIgdW5pcXVlSWQgPSBnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApO1xuXG4gICAgICAgICAgICAvLyB0cnkgdG8gZ2V0IHJpZCBvZiB1bm5lY2Vzc2FyeSBzdGVwc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b1NraXBbdW5pcXVlSWRdID09ICd1bmRlZmluZWQnICYmIHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwicnVubmVyLnNwZWVkXCIpICE9ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgdmFyIGRpZmY7XG4gICAgICAgICAgICAgIHZhciBpZ25vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IHN0ZXBzLmxlbmd0aCAtIDE7IGogPiBpZHg7IGotLSkge1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclN0ZXAgPSBzdGVwc1tqXTtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJVbmlxdWVJZCA9IGdldFVuaXF1ZUlkRnJvbVN0ZXAob3RoZXJTdGVwKTtcbiAgICAgICAgICAgICAgICBpZiAodW5pcXVlSWQgPT09IG90aGVyVW5pcXVlSWQpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghZGlmZikge1xuICAgICAgICAgICAgICAgICAgICAgIGRpZmYgPSAob3RoZXJTdGVwLnRpbWVTdGFtcCAtIHN0ZXAudGltZVN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZ25vcmUgPSAhaXNJbXBvcnRhbnRTdGVwKG90aGVyU3RlcCkgJiYgZGlmZiA8IGltcG9ydGFudFN0ZXBMZW5ndGg7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW50ZXJhY3RpdmVTdGVwKG90aGVyU3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZ25vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB0b1NraXBbdW5pcXVlSWRdID0gaWdub3JlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXZSdyZSBza2lwcGluZyB0aGlzIGVsZW1lbnRcbiAgICAgICAgICAgIGlmICh0b1NraXBbZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKV0pIHtcbiAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaW5kRWxlbWVudFdpdGhMb2NhdG9yKHNjZW5hcmlvLCBzdGVwLCBsb2NhdG9yLCBnZXRUaW1lb3V0KHNjZW5hcmlvLCBpZHgpKS50aGVuKGZ1bmN0aW9uIChlbGVzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgZWxlID0gZWxlc1swXTtcbiAgICAgICAgICAgICAgICAgIHZhciB0YWdOYW1lID0gZWxlLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdXBwb3J0c0lucHV0RXZlbnQgPSB0YWdOYW1lID09PSAnaW5wdXQnIHx8IHRhZ05hbWUgPT09ICd0ZXh0YXJlYScgfHwgZWxlLmdldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJyk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChldmVudHMuaW5kZXhPZihzdGVwLmV2ZW50TmFtZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5kYXRhLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMud2hpY2ggPSBvcHRpb25zLmJ1dHRvbiA9IHN0ZXAuZGF0YS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnU2ltdWxhdGluZyAnICsgc3RlcC5ldmVudE5hbWUgKyAnIG9uIGVsZW1lbnQgJywgZWxlLCBsb2NhdG9yLnNlbGVjdG9yc1swXSwgXCIgZm9yIHN0ZXAgXCIgKyBpZHgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ2NsaWNrJykge1xuICAgICAgICAgICAgICAgICAgICAgICQoZWxlKS50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChzdGVwLmV2ZW50TmFtZSA9PSAnZm9jdXMnIHx8IHN0ZXAuZXZlbnROYW1lID09ICdibHVyJykgJiYgZWxlW3N0ZXAuZXZlbnROYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgIGVsZVtzdGVwLmV2ZW50TmFtZV0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZVtzdGVwLmV2ZW50TmFtZV0oZWxlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RlcC5kYXRhLnZhbHVlICE9IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIHN0ZXAuZGF0YS5hdHRyaWJ1dGVzICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdG9BcHBseSA9IHN0ZXAuZGF0YS5hdHRyaWJ1dGVzID8gc3RlcC5kYXRhLmF0dHJpYnV0ZXMgOiB7IFwidmFsdWVcIjogc3RlcC5kYXRhLnZhbHVlIH07XG4gICAgICAgICAgICAgICAgICAgICAgXy5leHRlbmQoZWxlLCB0b0FwcGx5KTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IHRoZSBpbnB1dCBldmVudC5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNJbnB1dEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdjaGFuZ2UnKTsgLy8gVGhpcyBzaG91bGQgYmUgZmlyZWQgYWZ0ZXIgYSBibHVyIGV2ZW50LlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAna2V5cHJlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0ZXAuZGF0YS5rZXlDb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5ZG93bihlbGUsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXByZXNzKGVsZSwga2V5KTtcblxuICAgICAgICAgICAgICAgICAgICBlbGUudmFsdWUgPSBzdGVwLmRhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2NoYW5nZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXVwKGVsZSwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cHBvcnRzSW5wdXRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJyAmJiB1dG1lLnN0YXRlLnNldHRpbmdzLmdldCgndmVyYm9zZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKCdWYWxpZGF0ZTogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSAgKyBcIiBjb250YWlucyB0ZXh0ICdcIiAgKyBzdGVwLmRhdGEudGV4dCArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJWYWxpZGF0ZTogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0RXJyb3IoXCJGYWlsZWQgb24gc3RlcDogXCIgKyBpZHggKyBcIiAgRXZlbnQ6IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIiBSZWFzb246IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoJ3ZlcmJvc2UnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JBbmd1bGFyKHJvb3RTZWxlY3Rvcikge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iocm9vdFNlbGVjdG9yKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCF3aW5kb3cuYW5ndWxhcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYW5ndWxhciBjb3VsZCBub3QgYmUgZm91bmQgb24gdGhlIHdpbmRvdycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZ2V0VGVzdGFiaWxpdHkpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmdldFRlc3RhYmlsaXR5KGVsKS53aGVuU3RhYmxlKHJlc29sdmUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZWxlbWVudChlbCkuaW5qZWN0b3IoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Jvb3QgZWxlbWVudCAoJyArIHJvb3RTZWxlY3RvciArICcpIGhhcyBubyBpbmplY3Rvci4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICcgdGhpcyBtYXkgbWVhbiBpdCBpcyBub3QgaW5zaWRlIG5nLWFwcC4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGVsKS5pbmplY3RvcigpLmdldCgnJGJyb3dzZXInKS5cbiAgICAgICAgICAgICAgICBub3RpZnlXaGVuTm9PdXRzdGFuZGluZ1JlcXVlc3RzKHJlc29sdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzSW1wb3J0YW50U3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZWxlYXZlJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VvdXQnICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZWVudGVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VvdmVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnYmx1cicgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ2ZvY3VzJztcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHN0ZXAgaXMgc29tZSBzb3J0IG9mIHVzZXIgaW50ZXJhY3Rpb25cbiAqL1xuZnVuY3Rpb24gaXNJbnRlcmFjdGl2ZVN0ZXAoc3RlcCkge1xuICAgIHZhciBldnQgPSBzdGVwLmV2ZW50TmFtZTtcblxuICAgIC8qXG4gICAgICAgLy8gSW50ZXJlc3Rpbmcgbm90ZSwgZG9pbmcgdGhlIGZvbGxvd2luZyB3YXMgY2F1c2luZyB0aGlzIGZ1bmN0aW9uIHRvIHJldHVybiB1bmRlZmluZWQuXG4gICAgICAgcmV0dXJuXG4gICAgICAgICAgIGV2dC5pbmRleE9mKFwibW91c2VcIikgIT09IDAgfHxcbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZWRvd25cIikgPT09IDAgfHxcbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZXVwXCIpID09PSAwO1xuXG4gICAgICAgLy8gSXRzIGJlY2F1c2UgdGhlIGNvbmRpdGlvbnMgd2VyZSBub3Qgb24gdGhlIHNhbWUgbGluZSBhcyB0aGUgcmV0dXJuIHN0YXRlbWVudFxuICAgICovXG4gICAgcmV0dXJuIGV2dC5pbmRleE9mKFwibW91c2VcIikgIT09IDAgfHwgZXZ0LmluZGV4T2YoXCJtb3VzZWRvd25cIikgPT09IDAgfHwgZXZ0LmluZGV4T2YoXCJtb3VzZXVwXCIpID09PSAwO1xufVxuXG5mdW5jdGlvbiBmaW5kRWxlbWVudFdpdGhMb2NhdG9yKHNjZW5hcmlvLCBzdGVwLCBsb2NhdG9yLCB0aW1lb3V0LCB0ZXh0VG9DaGVjaykge1xuICAgIHZhciBzdGFydGVkO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIHRyeUZpbmQoKSB7XG4gICAgICAgICAgICBpZiAoIXN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICBzdGFydGVkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVzO1xuICAgICAgICAgICAgdmFyIGZvdW5kVG9vTWFueSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGZvdW5kVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBmb3VuZERpZmZlcmVudFRleHQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvcnNUb1Rlc3QgPSBsb2NhdG9yLnNlbGVjdG9ycy5zbGljZSgwKTtcbiAgICAgICAgICAgIHZhciB0ZXh0VG9DaGVjayA9IHN0ZXAuZGF0YS50ZXh0O1xuICAgICAgICAgICAgdmFyIGNvbXBhcmlzb24gPSBzdGVwLmRhdGEuY29tcGFyaXNvbiB8fCBcImVxdWFsc1wiO1xuICAgICAgICAgICAgc2VsZWN0b3JzVG9UZXN0LnVuc2hpZnQoJ1tkYXRhLXVuaXF1ZS1pZD1cIicgKyBsb2NhdG9yLnVuaXF1ZUlkICsgJ1wiXScpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnNUb1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNUb1Rlc3RbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvciArPSBcIjp2aXNpYmxlXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsZXMgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRleHRUb0NoZWNrICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3VGV4dCA9ICQoZWxlc1swXSkudGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChjb21wYXJpc29uID09PSAnZXF1YWxzJyAmJiBuZXdUZXh0ID09PSB0ZXh0VG9DaGVjaykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY29tcGFyaXNvbiA9PT0gJ2NvbnRhaW5zJyAmJiBuZXdUZXh0LmluZGV4T2YodGV4dFRvQ2hlY2spID49IDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRWYWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kRGlmZmVyZW50VGV4dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZXMuYXR0cignZGF0YS11bmlxdWUtaWQnLCBsb2NhdG9yLnVuaXF1ZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWxlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kVG9vTWFueSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZm91bmRWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZWxlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSAmJiAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydGVkKSA8IHRpbWVvdXQgKiA1KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCA1MCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZFRvb01hbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IEZvdW5kIFRvbyBNYW55IEVsZW1lbnRzXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmb3VuZERpZmZlcmVudFRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IFRleHQgZG9lc24ndCBtYXRjaC4gIFxcbkV4cGVjdGVkOlxcblwiICsgdGV4dFRvQ2hlY2sgKyBcIlxcbmJ1dCB3YXNcXG5cIiArIGVsZXMudGV4dCgpICsgXCJcXG5cIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogTm8gZWxlbWVudHMgZm91bmRcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3BlZWQgPSB1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInJ1bm5lci5zcGVlZFwiKTtcbiAgICAgICAgdmFyIGxpbWl0ID0gaW1wb3J0YW50U3RlcExlbmd0aCAvIChzcGVlZCA9PT0gJ3JlYWx0aW1lJyA/ICcxJyA6IHNwZWVkKTtcbiAgICAgICAgaWYgKGdsb2JhbC5hbmd1bGFyKSB7XG4gICAgICAgICAgICB3YWl0Rm9yQW5ndWxhcignW25nLWFwcF0nKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgdGltZW91dCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNwZWVkID09PSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgIHRyeUZpbmQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZW91dChzY2VuYXJpbywgaWR4KSB7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgLy8gSWYgdGhlIHByZXZpb3VzIHN0ZXAgaXMgYSB2YWxpZGF0ZSBzdGVwLCB0aGVuIGp1c3QgbW92ZSBvbiwgYW5kIHByZXRlbmQgaXQgaXNuJ3QgdGhlcmVcbiAgICAgICAgLy8gT3IgaWYgaXQgaXMgYSBzZXJpZXMgb2Yga2V5cywgdGhlbiBnb1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0uZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuYXJpby5zdGVwc1tpZHhdLnRpbWVTdGFtcCAtIHNjZW5hcmlvLnN0ZXBzW2lkeCAtIDFdLnRpbWVTdGFtcDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCwgdGltZW91dCkge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSBhcmVuJ3QgZ29pbmcgdG8gb3ZlcmZsb3cgdGhlIGNhbGwgc3RhY2suXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHNjZW5hcmlvLnN0ZXBzLmxlbmd0aCA+IChpZHggKyAxKSkge1xuICAgICAgICAgICAgcnVuU3RlcChzY2VuYXJpbywgaWR4ICsgMSwgdG9Ta2lwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKHRydWUpO1xuICAgICAgICB9XG4gICAgfSwgdGltZW91dCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZnJhZ21lbnRGcm9tU3RyaW5nKHN0ckhUTUwpIHtcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHJIVE1MO1xuICAgIC8vIGNvbnNvbGUubG9nKHRlbXAuaW5uZXJIVE1MKTtcbiAgICByZXR1cm4gdGVtcC5jb250ZW50ID8gdGVtcC5jb250ZW50IDogdGVtcDtcbn1cblxuZnVuY3Rpb24gZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAgJiYgc3RlcC5kYXRhICYmIHN0ZXAuZGF0YS5sb2NhdG9yICYmIHN0ZXAuZGF0YS5sb2NhdG9yLnVuaXF1ZUlkO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJFeHRyYUxvYWRzKHN0ZXBzKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgdmFyIHNlZW5Mb2FkID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXNMb2FkID0gc3RlcHNbaV0uZXZlbnROYW1lID09PSAnbG9hZCc7XG4gICAgaWYgKCFzZWVuTG9hZCB8fCAhaXNMb2FkKSB7XG4gICAgICByZXN1bHQucHVzaChzdGVwc1tpXSk7XG4gICAgICBzZWVuTG9hZCA9IHNlZW5Mb2FkIHx8IGlzTG9hZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbnZhciBndWlkID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBzNCgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXG4gICAgICAgICAgICAudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgICAgICAgICBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xuICAgIH07XG59KSgpO1xuXG52YXIgbGlzdGVuZXJzID0gW107XG52YXIgc3RhdGU7XG52YXIgdXRtZSA9IHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzY2VuYXJpbyA9IGdldFBhcmFtZXRlckJ5TmFtZSgndXRtZV9zY2VuYXJpbycpO1xuICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZSA9IHV0bWUuc3RhdGUgPSB1dG1lLmxvYWRTdGF0ZUZyb21TdG9yYWdlKCk7XG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdJTklUSUFMSVpFRCcpO1xuXG4gICAgICAgIHJldHVybiB1dG1lLmxvYWRTZXR0aW5ncygpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHN0YXRlLnRlc3RTZXJ2ZXIgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoXCJ1dG1lX3Rlc3Rfc2VydmVyXCIpO1xuICAgICAgICAgICAgICBzdGF0ZS5hdXRvUnVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdXRtZS5ydW5TY2VuYXJpbyhzY2VuYXJpbyk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuc3RhdHVzID09PSBcIlBMQVlJTkdcIikge1xuICAgICAgICAgICAgICBydW5OZXh0U3RlcChzdGF0ZS5ydW4uc2NlbmFyaW8sIHN0YXRlLnJ1bi5zdGVwSW5kZXgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghc3RhdGUuc3RhdHVzIHx8IHN0YXRlLnN0YXR1cyA9PT0gJ0lOSVRJQUxJWklORycpIHtcbiAgICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJMT0FERURcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBicm9hZGNhc3Q6IGZ1bmN0aW9uIChldnQsIGV2dERhdGEpIHtcbiAgICAgICAgaWYgKGxpc3RlbmVycyAmJiBsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyc1tpXShldnQsIGV2dERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBzdGFydFJlY29yZGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc3RhdGUuc3RhdHVzICE9ICdSRUNPUkRJTkcnKSB7XG4gICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSAnUkVDT1JESU5HJztcbiAgICAgICAgICAgIHN0YXRlLnN0ZXBzID0gW107XG4gICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlJlY29yZGluZyBTdGFydGVkXCIpO1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1JFQ09SRElOR19TVEFSVEVEJyk7XG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoXCJsb2FkXCIsIHtcbiAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogd2luZG93LmxvY2F0aW9uLmhvc3QsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogd2luZG93LmxvY2F0aW9uLnNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgaGFzaDogd2luZG93LmxvY2F0aW9uLmhhc2hcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBydW5TY2VuYXJpbzogZnVuY3Rpb24gKG5hbWUsIGNvbmZpZykge1xuICAgICAgICB2YXIgdG9SdW4gPSBuYW1lIHx8IHByb21wdCgnU2NlbmFyaW8gdG8gcnVuJyk7XG4gICAgICAgIHZhciBhdXRvUnVuID0gIW5hbWUgPyBwcm9tcHQoJ1dvdWxkIHlvdSBsaWtlIHRvIHN0ZXAgdGhyb3VnaCBlYWNoIHN0ZXAgKHl8bik/JykgIT0gJ3knIDogdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGdldFNjZW5hcmlvKHRvUnVuKS50aGVuKGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgICAgICAgICAgc2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNjZW5hcmlvKSk7XG4gICAgICAgICAgICBzZXR1cENvbmRpdGlvbnMoc2NlbmFyaW8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnJ1biA9IHt9O1xuICAgICAgICAgICAgICAgIHN0YXRlLmF1dG9SdW4gPSBhdXRvUnVuID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiUExBWUlOR1wiO1xuXG4gICAgICAgICAgICAgICAgc2NlbmFyaW8uc3RlcHMgPSBmaWx0ZXJFeHRyYUxvYWRzKHNjZW5hcmlvLnN0ZXBzKTtcblxuICAgICAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInZlcmJvc2VcIikpIHtcbiAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiU3RhcnRpbmcgU2NlbmFyaW8gJ1wiICsgbmFtZSArIFwiJ1wiLCBzY2VuYXJpbyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1BMQVlCQUNLX1NUQVJURUQnKTtcblxuICAgICAgICAgICAgICAgIHJ1blN0ZXAoc2NlbmFyaW8sIDApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgcnVuTmV4dFN0ZXA6IHJ1bk5leHRTdGVwLFxuICAgIHN0b3BTY2VuYXJpbzogZnVuY3Rpb24gKHN1Y2Nlc3MpIHtcbiAgICAgICAgdmFyIHNjZW5hcmlvID0gc3RhdGUucnVuICYmIHN0YXRlLnJ1bi5zY2VuYXJpbztcbiAgICAgICAgZGVsZXRlIHN0YXRlLnJ1bjtcbiAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJMT0FERURcIjtcbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1BMQVlCQUNLX1NUT1BQRUQnKTtcblxuICAgICAgICBpZiAodXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoXCJ2ZXJib3NlXCIpKSB7XG4gICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBTY2VuYXJpb1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRTdWNjZXNzKFwiW1NVQ0NFU1NdIFNjZW5hcmlvICdcIiArIHNjZW5hcmlvLm5hbWUgKyBcIicgQ29tcGxldGVkIVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBvbiBwYWdlIFwiICsgd2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0RXJyb3IoXCJbRkFJTFVSRV0gU2NlbmFyaW8gJ1wiICsgc2NlbmFyaW8ubmFtZSArIFwiJyBTdG9wcGVkIVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgdGVtcG9yYXJ5IGVsZW1lbnQgbG9jYXRvciwgZm9yIHVzZSB3aXRoIGZpbmFsaXplTG9jYXRvclxuICAgICAqL1xuICAgIGNyZWF0ZUVsZW1lbnRMb2NhdG9yOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgdW5pcXVlSWQgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtdW5pcXVlLWlkXCIpIHx8IGd1aWQoKTtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXVuaXF1ZS1pZFwiLCB1bmlxdWVJZCk7XG5cbiAgICAgICAgdmFyIGVsZUh0bWwgPSBlbGVtZW50LmNsb25lTm9kZSgpLm91dGVySFRNTDtcbiAgICAgICAgdmFyIGVsZVNlbGVjdG9ycyA9IFtdO1xuICAgICAgICBpZiAoZWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT0gJ0JPRFknIHx8IGVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09ICdIVE1MJykge1xuICAgICAgICAgICAgZWxlU2VsZWN0b3JzID0gW2VsZW1lbnQudGFnTmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVTZWxlY3RvcnMgPSBzZWxlY3RvckZpbmRlcihlbGVtZW50LCBkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdW5pcXVlSWQ6IHVuaXF1ZUlkLFxuICAgICAgICAgICAgc2VsZWN0b3JzOiBlbGVTZWxlY3RvcnNcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgcmVnaXN0ZXJFdmVudDogZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGF0YSwgaWR4KSB7XG4gICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkgfHwgdXRtZS5pc1ZhbGlkYXRpbmcoKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBpZHggPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBpZHggPSB1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlLnN0ZXBzW2lkeF0gPSB7XG4gICAgICAgICAgICAgICAgZXZlbnROYW1lOiBldmVudE5hbWUsXG4gICAgICAgICAgICAgICAgdGltZVN0YW1wOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0VWRU5UX1JFR0lTVEVSRUQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0TG9nOiBmdW5jdGlvbiAobG9nLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0ubG9nKGxvZywgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRFcnJvcjogZnVuY3Rpb24gKGVycm9yLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0uZXJyb3IoZXJyb3IsIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0U3VjY2VzczogZnVuY3Rpb24gKG1lc3NhZ2UsIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5zdWNjZXNzKG1lc3NhZ2UsIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVnaXN0ZXJMaXN0ZW5lcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgbGlzdGVuZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclNhdmVIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBzYXZlSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyUmVwb3J0SGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgcmVwb3J0SGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyTG9hZEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGxvYWRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJTZXR0aW5nc0xvYWRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBzZXR0aW5nc0xvYWRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgaXNSZWNvcmRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlJFQ09SRElOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIGlzUGxheWluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiUExBWUlOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIGlzVmFsaWRhdGluZzogZnVuY3Rpb24odmFsaWRhdGluZykge1xuICAgICAgICBpZiAodHlwZW9mIHZhbGlkYXRpbmcgIT09ICd1bmRlZmluZWQnICYmICh1dG1lLmlzUmVjb3JkaW5nKCkgfHwgdXRtZS5pc1ZhbGlkYXRpbmcoKSkpIHtcbiAgICAgICAgICAgIHV0bWUuc3RhdGUuc3RhdHVzID0gdmFsaWRhdGluZyA/IFwiVkFMSURBVElOR1wiIDogXCJSRUNPUkRJTkdcIjtcbiAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdWQUxJREFUSU9OX0NIQU5HRUQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlZBTElEQVRJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBzdG9wUmVjb3JkaW5nOiBmdW5jdGlvbiAoaW5mbykge1xuICAgICAgICBpZiAoaW5mbyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHZhciBuZXdTY2VuYXJpbyA9IHtcbiAgICAgICAgICAgICAgICBzdGVwczogc3RhdGUuc3RlcHNcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIF8uZXh0ZW5kKG5ld1NjZW5hcmlvLCBpbmZvKTtcblxuICAgICAgICAgICAgaWYgKCFuZXdTY2VuYXJpby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgbmV3U2NlbmFyaW8ubmFtZSA9IHByb21wdCgnRW50ZXIgc2NlbmFyaW8gbmFtZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobmV3U2NlbmFyaW8ubmFtZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnNjZW5hcmlvcy5wdXNoKG5ld1NjZW5hcmlvKTtcblxuICAgICAgICAgICAgICAgIGlmIChzYXZlSGFuZGxlcnMgJiYgc2F2ZUhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNhdmVIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUhhbmRsZXJzW2ldKG5ld1NjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLnN0YXR1cyA9ICdMT0FERUQnO1xuXG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdSRUNPUkRJTkdfU1RPUFBFRCcpO1xuXG4gICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0b3BwZWRcIiwgbmV3U2NlbmFyaW8pO1xuICAgIH0sXG5cbiAgICBsb2FkU2V0dGluZ3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNldHRpbmdzID0gdXRtZS5zdGF0ZS5zZXR0aW5ncyA9IHV0bWUuc3RhdGUuc2V0dGluZ3MgfHwgbmV3IFNldHRpbmdzKHtcbiAgICAgICAgICBcInJ1bm5lci5zcGVlZFwiOiBcIjEwXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzZXR0aW5nc0xvYWRIYW5kbGVycy5sZW5ndGggPiAwICYmICF1dG1lLmlzUmVjb3JkaW5nKCkgJiYgIXV0bWUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3NMb2FkSGFuZGxlcnNbMF0oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3Muc2V0RGVmYXVsdHMocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxvYWRTdGF0ZUZyb21TdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1dG1lU3RhdGVTdHIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndXRtZScpO1xuICAgICAgICBpZiAodXRtZVN0YXRlU3RyKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEpTT04ucGFyc2UodXRtZVN0YXRlU3RyKTtcblxuICAgICAgICAgICAgaWYgKHN0YXRlLnNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1NldHRpbmdzID0gbmV3IFNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgbmV3U2V0dGluZ3Muc2V0dGluZ3MgPSBzdGF0ZS5zZXR0aW5ncy5zZXR0aW5ncztcbiAgICAgICAgICAgICAgICBuZXdTZXR0aW5ncy5zZXR0aW5ncyA9IHN0YXRlLnNldHRpbmdzLmRlZmF1bHRTZXR0aW5ncztcbiAgICAgICAgICAgICAgICBzdGF0ZS5zZXR0aW5ncyA9IG5ld1NldHRpbmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcIklOSVRJQUxJWklOR1wiLFxuICAgICAgICAgICAgICAgIHNjZW5hcmlvczogW11cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICBzYXZlU3RhdGVUb1N0b3JhZ2U6IGZ1bmN0aW9uICh1dG1lU3RhdGUpIHtcbiAgICAgICAgaWYgKHV0bWVTdGF0ZSkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3V0bWUnLCBKU09OLnN0cmluZ2lmeSh1dG1lU3RhdGUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCd1dG1lJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5sb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHV0bWUuc2F2ZVN0YXRlVG9TdG9yYWdlKHN0YXRlKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiB0b2dnbGVIaWdobGlnaHQoZWxlLCB2YWx1ZSkge1xuICAgICQoZWxlKS50b2dnbGVDbGFzcygndXRtZS12ZXJpZnknLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVJlYWR5KGVsZSwgdmFsdWUpIHtcbiAgICAkKGVsZSkudG9nZ2xlQ2xhc3MoJ3V0bWUtcmVhZHknLCB2YWx1ZSk7XG59XG5cbi8qKlxuICogSWYgeW91IGNsaWNrIG9uIGEgc3BhbiBpbiBhIGxhYmVsLCB0aGUgc3BhbiB3aWxsIGNsaWNrLFxuICogdGhlbiB0aGUgYnJvd3NlciB3aWxsIGZpcmUgdGhlIGNsaWNrIGV2ZW50IGZvciB0aGUgaW5wdXQgY29udGFpbmVkIHdpdGhpbiB0aGUgc3BhbixcbiAqIFNvLCB3ZSBvbmx5IHdhbnQgdG8gdHJhY2sgdGhlIGlucHV0IGNsaWNrcy5cbiAqL1xuZnVuY3Rpb24gaXNOb3RJbkxhYmVsT3JWYWxpZChlbGUpIHtcbiAgICByZXR1cm4gJChlbGUpLnBhcmVudHMoJ2xhYmVsJykubGVuZ3RoID09IDAgfHxcbiAgICAgICAgICBlbGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSAnaW5wdXQnO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBpdCBpcyBhbiBlbGVtZW50IHRoYXQgc2hvdWxkIGJlIGlnbm9yZWRcbiAqL1xuZnVuY3Rpb24gaXNJZ25vcmVkRWxlbWVudChlbGUpIHtcbiAgcmV0dXJuICFlbGUuaGFzQXR0cmlidXRlIHx8IGVsZS5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykgfHwgJChlbGUpLnBhcmVudHMoXCJbZGF0YS1pZ25vcmVdXCIpLmxlbmd0aCA+IDA7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBldmVudCBzaG91bGQgYmUgcmVjb3JkZWQgb24gdGhlIGdpdmVuIGVsZW1lbnRcbiAqL1xuZnVuY3Rpb24gc2hvdWxkUmVjb3JkRXZlbnQoZWxlLCBldnQpIHtcbiAgdmFyIHNldHRpbmcgPSB1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInJlY29yZGVyLmV2ZW50cy5cIiArIGV2dCk7XG4gIHZhciBpc1NldHRpbmdUcnVlID0gKHNldHRpbmcgPT09IHRydWUgfHwgc2V0dGluZyA9PT0gJ3RydWUnIHx8IHR5cGVvZiBzZXR0aW5nID09PSAndW5kZWZpbmVkJyk7XG4gIHJldHVybiB1dG1lLmlzUmVjb3JkaW5nKCkgJiYgaXNTZXR0aW5nVHJ1ZSAmJiBpc05vdEluTGFiZWxPclZhbGlkKGVsZSk7XG59XG5cbnZhciB0aW1lcnMgPSBbXTtcblxuZnVuY3Rpb24gaW5pdEV2ZW50SGFuZGxlcnMoKSB7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5pc1RyaWdnZXIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIGlmICghaXNJZ25vcmVkRWxlbWVudChlLnRhcmdldCkgJiYgdXRtZS5pc1JlY29yZGluZygpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdG9yOiB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGUudGFyZ2V0KVxuICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVyO1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnbW91c2VvdmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlLnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVyOiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWFkeShlLnRhcmdldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChldnQgPT0gJ21vdXNlb3V0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRpbWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVyc1tpXS5lbGVtZW50ID09IGUudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyc1tpXS50aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlUmVhZHkoZS50YXJnZXQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc2hvdWxkUmVjb3JkRXZlbnQoZS50YXJnZXQsIGV2dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLndoaWNoIHx8IGUuYnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MuYnV0dG9uID0gZS53aGljaCB8fCBlLmJ1dHRvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLmF0dHJpYnV0ZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiIDogZS50YXJnZXQudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJjaGVja2VkXCI6IGUudGFyZ2V0LmNoZWNrZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RlZFwiOiBlLnRhcmdldC5zZWxlY3RlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoZXZ0LCBhcmdzLCBpZHgpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbZXZ0XSA9IGhhbmRsZXI7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgICAgfSkoZXZlbnRzW2ldKSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgdmFyIF90b19hc2NpaSA9IHtcbiAgICAgICAgJzE4OCc6ICc0NCcsXG4gICAgICAgICcxODknOiAnNDUnLFxuICAgICAgICAnMTkwJzogJzQ2JyxcbiAgICAgICAgJzE5MSc6ICc0NycsXG4gICAgICAgICcxOTInOiAnOTYnLFxuICAgICAgICAnMjIwJzogJzkyJyxcbiAgICAgICAgJzIyMic6ICczOScsXG4gICAgICAgICcyMjEnOiAnOTMnLFxuICAgICAgICAnMjE5JzogJzkxJyxcbiAgICAgICAgJzE3Myc6ICc0NScsXG4gICAgICAgICcxODcnOiAnNjEnLCAvL0lFIEtleSBjb2Rlc1xuICAgICAgICAnMTg2JzogJzU5J1xuICAgIH07XG5cbiAgICB2YXIgc2hpZnRVcHMgPSB7XG4gICAgICAgIFwiOTZcIjogXCJ+XCIsXG4gICAgICAgIFwiNDlcIjogXCIhXCIsXG4gICAgICAgIFwiNTBcIjogXCJAXCIsXG4gICAgICAgIFwiNTFcIjogXCIjXCIsXG4gICAgICAgIFwiNTJcIjogXCIkXCIsXG4gICAgICAgIFwiNTNcIjogXCIlXCIsXG4gICAgICAgIFwiNTRcIjogXCJeXCIsXG4gICAgICAgIFwiNTVcIjogXCImXCIsXG4gICAgICAgIFwiNTZcIjogXCIqXCIsXG4gICAgICAgIFwiNTdcIjogXCIoXCIsXG4gICAgICAgIFwiNDhcIjogXCIpXCIsXG4gICAgICAgIFwiNDVcIjogXCJfXCIsXG4gICAgICAgIFwiNjFcIjogXCIrXCIsXG4gICAgICAgIFwiOTFcIjogXCJ7XCIsXG4gICAgICAgIFwiOTNcIjogXCJ9XCIsXG4gICAgICAgIFwiOTJcIjogXCJ8XCIsXG4gICAgICAgIFwiNTlcIjogXCI6XCIsXG4gICAgICAgIFwiMzlcIjogXCJcXFwiXCIsXG4gICAgICAgIFwiNDRcIjogXCI8XCIsXG4gICAgICAgIFwiNDZcIjogXCI+XCIsXG4gICAgICAgIFwiNDdcIjogXCI/XCJcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24ga2V5UHJlc3NIYW5kbGVyIChlKSB7XG4gICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoIWlzSWdub3JlZEVsZW1lbnQoZS50YXJnZXQpICYmIHNob3VsZFJlY29yZEV2ZW50KGUudGFyZ2V0LCBcImtleXByZXNzXCIpKSB7XG4gICAgICAgICAgICB2YXIgYyA9IGUud2hpY2g7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IERvZXNuJ3Qgd29yayB3aXRoIGNhcHMgbG9ja1xuICAgICAgICAgICAgLy9ub3JtYWxpemUga2V5Q29kZVxuICAgICAgICAgICAgaWYgKF90b19hc2NpaS5oYXNPd25Qcm9wZXJ0eShjKSkge1xuICAgICAgICAgICAgICAgIGMgPSBfdG9fYXNjaWlbY107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZS5zaGlmdEtleSAmJiAoYyA+PSA2NSAmJiBjIDw9IDkwKSkge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgKyAzMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgc2hpZnRVcHMuaGFzT3duUHJvcGVydHkoYykpIHtcbiAgICAgICAgICAgICAgICAvL2dldCBzaGlmdGVkIGtleUNvZGUgdmFsdWVcbiAgICAgICAgICAgICAgICBjID0gc2hpZnRVcHNbY107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoJ2tleXByZXNzJywge1xuICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpLFxuICAgICAgICAgICAgICAgIGtleTogYyxcbiAgICAgICAgICAgICAgICBwcmV2VmFsdWU6IGUudGFyZ2V0LnZhbHVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlLnRhcmdldC52YWx1ZSArIGMsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywga2V5UHJlc3NIYW5kbGVyLCB0cnVlKTtcblxuICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAodXRtZS5ldmVudExpc3RlbmVycyA9IHV0bWUuZXZlbnRMaXN0ZW5lcnMgfHwge30pWydrZXlwcmVzcyddID0ga2V5UHJlc3NIYW5kbGVyO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG5cbmZ1bmN0aW9uIGJvb3RzdHJhcFV0bWUoKSB7XG4gIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09IFwiY29tcGxldGVcIikge1xuICAgIHV0bWUuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGluaXRFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSkge1xuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5ib290c3RyYXBVdG1lKCk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgYm9vdHN0cmFwVXRtZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdXRtZS51bmxvYWQoKTtcbn0sIHRydWUpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdXRtZS5yZXBvcnRMb2coXCJTY3JpcHQgRXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UgKyBcIjpcIiArIGVyci51cmwgKyBcIixcIiArIGVyci5saW5lICsgXCI6XCIgKyBlcnIuY29sKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNWMGJXVXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOW9iMjFsTDJSaGRtbGtkR2wwZEhOM2IzSjBhQzl3Y205cVpXTjBjeTkxZEcxbEwzTnlZeTlxY3k5MWRHMWxMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzUTBGQlF5eEhRVUZITEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRCUVVNelFpeEpRVUZKTEU5QlFVOHNSMEZCUnl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETzBGQlF6ZERMRWxCUVVrc1VVRkJVU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXp0QlFVTnlReXhKUVVGSkxHTkJRV01zUjBGQlJ5eFBRVUZQTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6dEJRVU5xUkN4SlFVRkpMRkZCUVZFc1IwRkJSeXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdPMEZCUlhKRExHZEVRVUZuUkR0QlFVTm9SQ3hKUVVGSkxHMUNRVUZ0UWl4SFFVRkhMRWRCUVVjc1EwRkJRenRCUVVNNVFpeEpRVUZKTEZsQlFWa3NSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRkRUlzU1VGQlNTeGpRVUZqTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTNoQ0xFbEJRVWtzV1VGQldTeEhRVUZITEVWQlFVVXNRMEZCUXp0QlFVTjBRaXhKUVVGSkxHOUNRVUZ2UWl4SFFVRkhMRVZCUVVVc1EwRkJRenM3UVVGRk9VSXNVMEZCVXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hGUVVGRk8wbEJRM1pDTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrc1dVRkJXU3hEUVVGRExFMUJRVTBzUzBGQlN5eERRVUZETEVWQlFVVTdXVUZETTBJc1NVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRemRETEVsQlFVa3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEV0QlFVc3NTVUZCU1N4RlFVRkZPMjlDUVVOc1F5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJsQ1FVTXZRanRoUVVOS08xTkJRMG9zVFVGQlRUdFpRVU5JTEZsQlFWa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVTdaMEpCUTJ4RExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnFRaXhEUVVGRExFTkJRVU03VTBGRFRqdExRVU5LTEVOQlFVTXNRMEZCUXp0RFFVTk9PMEZCUTBRc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eERRVUZET3p0QlFVVjJRaXhKUVVGSkxFMUJRVTBzUjBGQlJ6dEpRVU5VTEU5QlFVODdTVUZEVUN4UFFVRlBPMGxCUTFBc1RVRkJUVHRCUVVOV0xFbEJRVWtzVlVGQlZUdEJRVU5rTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkJSVUVzU1VGQlNTeFhRVUZYT3p0SlFVVllMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVlVGQlZUdEpRVU5XTEZkQlFWYzdTVUZEV0N4VFFVRlRPMEZCUTJJc1NVRkJTU3hSUVVGUk8wRkJRMW83TzBGQlJVRXNRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWVVGQllTeERRVUZETEZGQlFWRXNSVUZCUlN4aFFVRmhMRVZCUVVVN1JVRkRPVU1zU1VGQlNTeExRVUZMTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhEUVVGRE8wRkJRM1JETEVWQlFVVXNTVUZCU1N4VFFVRlRMRWRCUVVjc1MwRkJTeXhKUVVGSkxFdEJRVXNzUTBGQlF5eFRRVUZUTEVOQlFVTTdPMFZCUlhwRExFbEJRVWtzVTBGQlV5eEZRVUZGTzBsQlEySXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RlFVRkZMRlZCUVZVc1dVRkJXU3hGUVVGRk8wMUJRekZFTEU5QlFVOHNWMEZCVnl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEdGQlFXRXNSVUZCUlR0UlFVTTNSQ3hoUVVGaExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHRkJRV0VzUTBGQlF5eERRVUZETEVOQlFVTTdVVUZETVVRc1QwRkJUeXhsUVVGbExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmxCUVZrN1ZVRkRja1FzU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMVZCUTJ4Q0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhoUVVGaExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRaUVVOdVJDeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMR0ZCUVdFc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0WFFVTjJRenRWUVVORUxFOUJRVThzVVVGQlVTeERRVUZETzFOQlEycENMRU5CUVVNc1EwRkJRenRQUVVOS0xFTkJRVU1zUTBGQlF6dExRVU5LTEVOQlFVTXNRMEZCUXl4RFFVRkRPMGRCUTB3c1RVRkJUVHRKUVVOTUxFOUJRVThzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJRenRIUVVNMVFqdEJRVU5JTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhuUWtGQlowSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRia01zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8wRkJRekZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhwUWtGQmFVSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRjRU1zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRelZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXgzUWtGQmQwSXNRMEZCUXl4TFFVRkxMRVZCUVVVN1NVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMGxCUTJ4Q0xFbEJRVWtzWjBKQlFXZENMRU5CUVVNN1NVRkRja0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRia01zU1VGQlNTeFRRVUZUTEVkQlFVY3NTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xRkJRM3BDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRaUVVOUUxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOdVF5eEpRVUZKTEVsQlFVa3NSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEzaENMRWxCUVVrc1NVRkJTU3hIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU03WjBKQlEzQkZMR2RDUVVGblFpeEpRVUZKTEVsQlFVa3NRMEZCUXp0blFrRkRla0lzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhuUWtGQlowSXNRMEZCUXp0aFFVTTNRenRUUVVOS0xFMUJRVTA3V1VGRFNDeG5Ra0ZCWjBJc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNVMEZCVXl4RFFVRkRPMU5CUXpkRE8xRkJRMFFzVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UzBGRGVrTTdTVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJRenRCUVVOd1FpeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5vUXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU03U1VGRGJFSXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRE8xRkJRMllzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRE8xRkJRekZDTEdsQ1FVRnBRaXhEUVVGRExGRkJRVkVzUTBGQlF6dExRVU01UWl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzVlVGQlZTeEZRVUZGTzFGQlF6RkNMRWxCUVVrc1UwRkJVeXhIUVVGSExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGRFVXNVVUZCVVN4RFFVRkRMRXRCUVVzc1IwRkJSeXgzUWtGQmQwSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRMUVVONFJDeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVDBGQlR5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRk8wbEJRM0JETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU03UVVGRGJrTXNTVUZCU1N4TlFVRk5MRWRCUVVjc1RVRkJUU3hKUVVGSkxFVkJRVVVzUTBGQlF6czdTVUZGZEVJc1NVRkJTU3hKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRKUVVNdlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRE8wbEJRM1pDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVTBGQlV5eEZRVUZGTzFGQlEyNURMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXp0UlFVTTVRaXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNSMEZCUnl4SFFVRkhMRU5CUVVNN1VVRkRNVUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVNeFFpeEpRVUZKTEZkQlFWY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTnlSU3hKUVVGSkxFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhOUVVGTkxFTkJRVU03UVVGRE9VTXNXVUZCV1N4SlFVRkpMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNN08xbEJSVGxDTEVsQlFVa3NUVUZCVFN4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFMUJRVTBzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRMMElzVFVGQlRTeEhRVUZITEVkQlFVY3NSMEZCUnl4TlFVRk5MRU5CUVVNN1lVRkRla0k3V1VGRFJDeEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExFMUJRVTBzVDBGQlR5eFhRVUZYTEVkQlFVY3NUVUZCVFN4RFFVRkRMRU5CUVVNN1FVRkRjRWdzV1VGQldTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFZEJRVWNzU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPenRaUVVWeVJDeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1VVRkJVU3hEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNSVUZCUlR0alFVTjBReXhQUVVGUExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4UlFVRlJMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNN1kwRkRia1VzVDBGQlR5eERRVUZETEVkQlFVY3NSVUZCUlN4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zU1VGQlNTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETzBGQlEyaEhMR0ZCUVdFN1FVRkRZanRCUVVOQk96dFpRVVZaTEVsQlFVa3NVMEZCVXl4RlFVRkZPMmRDUVVOWUxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRemRETEdGQlFXRTdPMU5CUlVvc1RVRkJUU3hKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NVMEZCVXl4RlFVRkZPMWxCUTNCRExFbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRaaXhYUVVGWExFTkJRVU1zVVVGQlVTeEZRVUZGTEVkQlFVY3NSVUZCUlN4TlFVRk5MRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXp0aFFVTjRSRHRUUVVOS0xFMUJRVTA3V1VGRFNDeEpRVUZKTEU5QlFVOHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF6dFpRVU5vUXl4SlFVRkpMRXRCUVVzc1IwRkJSeXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETzBGQlEzWkRMRmxCUVZrc1NVRkJTU3hSUVVGUkxFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03UVVGRGNrUTdPMWxCUlZrc1NVRkJTU3hQUVVGUExFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1N4WFFVRlhMRWxCUVVrc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMR05CUVdNc1EwRkJReXhKUVVGSkxGVkJRVlVzUlVGQlJUdGpRVU51Unl4SlFVRkpMRWxCUVVrc1EwRkJRenRqUVVOVUxFbEJRVWtzVFVGQlRTeEhRVUZITEV0QlFVc3NRMEZCUXp0alFVTnVRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRek5ETEVsQlFVa3NVMEZCVXl4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dG5Ra0ZEZWtJc1NVRkJTU3hoUVVGaExFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03WjBKQlEyNUVMRWxCUVVrc1VVRkJVU3hMUVVGTExHRkJRV0VzUlVGQlJUdHJRa0ZET1VJc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJUdHpRa0ZEVUN4SlFVRkpMRWxCUVVrc1UwRkJVeXhEUVVGRExGTkJRVk1zUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN2MwSkJRemxETEUxQlFVMHNSMEZCUnl4RFFVRkRMR1ZCUVdVc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEpRVUZKTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU03YlVKQlEzUkZMRTFCUVUwc1NVRkJTU3hwUWtGQmFVSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGNrTXNUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJRenR6UWtGRFppeE5RVUZOTzIxQ1FVTlVPMmxDUVVOR08wRkJRMnBDTEdWQlFXVTdPMk5CUlVRc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXp0QlFVTjRReXhoUVVGaE8wRkJRMkk3TzFsQlJWa3NTVUZCU1N4TlFVRk5MRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNc1JVRkJSVHRuUWtGRGJrTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1JVRkJSU3hIUVVGSExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEZEVNc1RVRkJUVHRuUWtGRFNDeHpRa0ZCYzBJc1EwRkJReXhSUVVGUkxFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNSVUZCUlN4VlFVRlZMRU5CUVVNc1VVRkJVU3hGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1NVRkJTU3hGUVVGRk8ydENRVU01Uml4SlFVRkpMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdhMEpCUTJ4Q0xFbEJRVWtzVDBGQlR5eEhRVUZITEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhGUVVGRkxFTkJRVU03UVVGRE1VUXNhMEpCUVd0Q0xFbEJRVWtzYTBKQlFXdENMRWRCUVVjc1QwRkJUeXhMUVVGTExFOUJRVThzU1VGQlNTeFBRVUZQTEV0QlFVc3NWVUZCVlN4SlFVRkpMRWRCUVVjc1EwRkJReXhaUVVGWkxFTkJRVU1zYVVKQlFXbENMRU5CUVVNc1EwRkJRenM3YTBKQlJUbEhMRWxCUVVrc1RVRkJUU3hEUVVGRExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU4yUXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhGUVVGRkxFTkJRVU03YjBKQlEycENMRWxCUVVrc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVWQlFVVTdjMEpCUTNCQ0xFOUJRVThzUTBGQlF5eExRVUZMTEVkQlFVY3NUMEZCVHl4RFFVRkRMRTFCUVUwc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTjRSU3h4UWtGQmNVSTdRVUZEY2tJN08yOUNRVVZ2UWl4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVDBGQlR5eEZRVUZGTzNOQ1FVTTNRaXhEUVVGRExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8zRkNRVU42UWl4TlFVRk5MRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEU5QlFVOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxFMUJRVTBzUzBGQlN5eEhRVUZITEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhGUVVGRk8zTkNRVU42Uml4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTEVOQlFVTTdjVUpCUTNaQ0xFMUJRVTA3YzBKQlEwd3NVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1FVRkROMFFzY1VKQlFYRkNPenR2UWtGRlJDeEpRVUZKTEU5QlFVOHNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhMUVVGTExFbEJRVWtzVjBGQlZ5eEpRVUZKTEU5QlFVOHNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhWUVVGVkxFbEJRVWtzVjBGQlZ5eEZRVUZGTzNOQ1FVTjJSaXhKUVVGSkxFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEZWQlFWVXNSMEZCUnl4RlFVRkZMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEV0QlFVc3NSVUZCUlN4RFFVRkRPMEZCUXk5SExITkNRVUZ6UWl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXpzN2MwSkJSWFpDTEVsQlFVa3NhMEpCUVd0Q0xFVkJRVVU3ZDBKQlEzUkNMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTEU5QlFVOHNRMEZCUXl4RFFVRkRPM1ZDUVVNNVFqdHpRa0ZEUkN4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUlVGQlJTeFJRVUZSTEVOQlFVTXNRMEZCUXp0eFFrRkRMMEk3UVVGRGNrSXNiVUpCUVcxQ096dHJRa0ZGUkN4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZTeEZRVUZGTzI5Q1FVTm9ReXhKUVVGSkxFZEJRVWNzUjBGQlJ5eE5RVUZOTEVOQlFVTXNXVUZCV1N4RFFVRkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdiMEpCUTJwRUxGRkJRVkVzUTBGQlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJReTlETEc5Q1FVRnZRaXhSUVVGUkxFTkJRVU1zVVVGQlVTeERRVUZETEVkQlFVY3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenM3YjBKQlJUVkNMRWRCUVVjc1EwRkJReXhMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNN1FVRkRhRVFzYjBKQlFXOUNMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4RFFVRkRPenR2UWtGRk9VSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTTdiMEpCUTNwQ0xFbEJRVWtzYTBKQlFXdENMRVZCUVVVN2QwSkJRM0JDTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzNGQ1FVTm9RenRCUVVOeVFpeHRRa0ZCYlVJN08ydENRVVZFTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hWUVVGVkxFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTzI5Q1FVTjBSU3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEZsQlFWa3NSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNTVUZCU1N4clFrRkJhMElzU1VGQlNTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1IwRkJSeXhIUVVGSExFTkJRVU1zUTBGQlF6dEJRVU51U1N4dFFrRkJiVUk3TzJ0Q1FVVkVMRWxCUVVrc1MwRkJTeXhEUVVGRExFOUJRVThzUlVGQlJUdHZRa0ZEYWtJc1YwRkJWeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVXNUVUZCVFN4RFFVRkRMRU5CUVVNN2JVSkJRM0JETzJsQ1FVTkdMRVZCUVVVc1ZVRkJWU3hOUVVGTkxFVkJRVVU3YjBKQlEycENMRWxCUVVrc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFZRVUZWTEVWQlFVVTdjMEpCUTJoRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNXVUZCV1N4SFFVRkhMRTFCUVUwc1EwRkJReXhEUVVGRE8zTkNRVU4wUXl4SlFVRkpMRU5CUVVNc1dVRkJXU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzNGQ1FVTXhRaXhOUVVGTkxFbEJRVWtzWlVGQlpTeERRVUZETEVsQlFVa3NRMEZCUXl4RlFVRkZPM2RDUVVNNVFpeEpRVUZKTEVOQlFVTXNWMEZCVnl4RFFVRkRMR3RDUVVGclFpeEhRVUZITEVkQlFVY3NSMEZCUnl4WFFVRlhMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUjBGQlJ5eFhRVUZYTEVkQlFVY3NUVUZCVFN4RFFVRkRMRU5CUVVNN2QwSkJRMnBITEVsQlFVa3NRMEZCUXl4WlFVRlpMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03Y1VKQlF6VkNMRTFCUVUwN2MwSkJRMHdzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eERRVUZETEVWQlFVVTdkMEpCUTNSRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN2RVSkJRM2hDTzNOQ1FVTkVMRWxCUVVrc1MwRkJTeXhEUVVGRExFOUJRVThzUlVGQlJUdDNRa0ZEYWtJc1YwRkJWeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVXNUVUZCVFN4RFFVRkRMRU5CUVVNN2RVSkJRM0JETzNGQ1FVTkdPMmxDUVVOS0xFTkJRVU1zUTBGQlF6dGhRVU5PTzFOQlEwbzdTMEZEU2p0QlFVTk1MRU5CUVVNN08wRkJSVVFzVTBGQlV5eGpRVUZqTEVOQlFVTXNXVUZCV1N4RlFVRkZPMGxCUTJ4RExFbEJRVWtzUlVGQlJTeEhRVUZITEZGQlFWRXNRMEZCUXl4aFFVRmhMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU03U1VGRE9VTXNUMEZCVHl4SlFVRkpMRTlCUVU4c1EwRkJReXhWUVVGVkxFOUJRVThzUlVGQlJTeE5RVUZOTEVWQlFVVTdVVUZETVVNc1NVRkJTVHRaUVVOQkxFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTXNUMEZCVHl4RlFVRkZPMmRDUVVOcVFpeE5RVUZOTEVsQlFVa3NTMEZCU3l4RFFVRkRMREJEUVVFd1F5eERRVUZETEVOQlFVTTdZVUZETDBRN1dVRkRSQ3hKUVVGSkxFOUJRVThzUTBGQlF5eGpRVUZqTEVWQlFVVTdaMEpCUTNoQ0xFOUJRVThzUTBGQlF5eGpRVUZqTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1ZVRkJWU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzJGQlEyeEVMRTFCUVUwN1owSkJRMGdzU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeEZRVUZGTEVWQlFVVTdiMEpCUTJwRExFMUJRVTBzU1VGQlNTeExRVUZMTEVOQlFVTXNaMEpCUVdkQ0xFZEJRVWNzV1VGQldTeEhRVUZITEc5Q1FVRnZRanQzUWtGRGJFVXNlVU5CUVhsRExFTkJRVU1zUTBGQlF6dHBRa0ZEYkVRN1owSkJRMFFzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFVkJRVVVzUTBGQlF5eEhRVUZITEVOQlFVTXNWVUZCVlN4RFFVRkRPMmRDUVVNNVF5d3JRa0ZCSzBJc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU0xUXp0VFFVTktMRU5CUVVNc1QwRkJUeXhIUVVGSExFVkJRVVU3V1VGRFZpeE5RVUZOTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1UwRkRaanRMUVVOS0xFTkJRVU1zUTBGQlF6dEJRVU5RTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhsUVVGbExFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlF6TkNMRTlCUVU4c1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFpRVUZaTzFkQlF6bENMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZUdFhRVU0xUWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGbEJRVms3VjBGRE9VSXNTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hYUVVGWE8xZEJRemRDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1RVRkJUVHRYUVVONFFpeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTlCUVU4c1EwRkJRenRCUVVOeVF5eERRVUZET3p0QlFVVkVPenRIUVVWSE8wRkJRMGdzVTBGQlV5eHBRa0ZCYVVJc1EwRkJReXhKUVVGSkxFVkJRVVU3UVVGRGFrTXNTVUZCU1N4SlFVRkpMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETzBGQlF6ZENPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1NVRkZTU3hQUVVGUExFZEJRVWNzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFZEJRVWNzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFZEJRVWNzUTBGQlF5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8wRkJRM2hITEVOQlFVTTdPMEZCUlVRc1UwRkJVeXh6UWtGQmMwSXNRMEZCUXl4UlFVRlJMRVZCUVVVc1NVRkJTU3hGUVVGRkxFOUJRVThzUlVGQlJTeFBRVUZQTEVWQlFVVXNWMEZCVnl4RlFVRkZPMGxCUXpORkxFbEJRVWtzVDBGQlR5eERRVUZETzBsQlExb3NUMEZCVHl4SlFVRkpMRTlCUVU4c1EwRkJReXhWUVVGVkxFOUJRVThzUlVGQlJTeE5RVUZOTEVWQlFVVTdVVUZETVVNc1UwRkJVeXhQUVVGUExFZEJRVWM3V1VGRFppeEpRVUZKTEVOQlFVTXNUMEZCVHl4RlFVRkZPMmRDUVVOV0xFOUJRVThzUjBGQlJ5eEpRVUZKTEVsQlFVa3NSVUZCUlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRE8wRkJReTlETEdGQlFXRTdPMWxCUlVRc1NVRkJTU3hKUVVGSkxFTkJRVU03V1VGRFZDeEpRVUZKTEZsQlFWa3NSMEZCUnl4TFFVRkxMRU5CUVVNN1dVRkRla0lzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4RFFVRkRPMWxCUTNaQ0xFbEJRVWtzYTBKQlFXdENMRWRCUVVjc1MwRkJTeXhEUVVGRE8xbEJReTlDTEVsQlFVa3NaVUZCWlN4SFFVRkhMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMWxCUTJwRUxFbEJRVWtzVjBGQlZ5eEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRE8xbEJRMnBETEVsQlFVa3NWVUZCVlN4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVlVGQlZTeEpRVUZKTEZGQlFWRXNRMEZCUXp0WlFVTnNSQ3hsUVVGbExFTkJRVU1zVDBGQlR5eERRVUZETEcxQ1FVRnRRaXhIUVVGSExFOUJRVThzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRU5CUVVNN1dVRkRka1VzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExHVkJRV1VzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRemRETEVsQlFVa3NVVUZCVVN4SFFVRkhMR1ZCUVdVc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dG5Ra0ZEYkVNc1NVRkJTU3hsUVVGbExFTkJRVU1zU1VGQlNTeERRVUZETEVWQlFVVTdiMEpCUTNaQ0xGRkJRVkVzU1VGQlNTeFZRVUZWTEVOQlFVTTdhVUpCUXpGQ08yZENRVU5FTEVsQlFVa3NSMEZCUnl4RFFVRkRMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03WjBKQlEyNUNMRWxCUVVrc1NVRkJTU3hEUVVGRExFMUJRVTBzU1VGQlNTeERRVUZETEVWQlFVVTdiMEpCUTJ4Q0xFbEJRVWtzVDBGQlR5eFhRVUZYTEVsQlFVa3NWMEZCVnl4RlFVRkZPM2RDUVVOdVF5eEpRVUZKTEU5QlFVOHNSMEZCUnl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNN2QwSkJRMmhETEVsQlFVa3NRMEZCUXl4VlFVRlZMRXRCUVVzc1VVRkJVU3hKUVVGSkxFOUJRVThzUzBGQlN5eFhRVUZYT3paQ1FVTnNSQ3hWUVVGVkxFdEJRVXNzVlVGQlZTeEpRVUZKTEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETEVWQlFVVTdORUpCUTJ4RkxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTTdORUpCUTJ4Q0xFMUJRVTA3ZVVKQlExUXNUVUZCVFRzMFFrRkRTQ3hyUWtGQmEwSXNSMEZCUnl4SlFVRkpMRU5CUVVNN2VVSkJRemRDTzNGQ1FVTktMRTFCUVUwN2QwSkJRMGdzVlVGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXp0M1FrRkRiRUlzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4blFrRkJaMElzUlVGQlJTeFBRVUZQTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNN2QwSkJRemxETEUxQlFVMDdjVUpCUTFRN2IwSkJRMFFzVFVGQlRUdHBRa0ZEVkN4TlFVRk5MRWxCUVVrc1NVRkJTU3hEUVVGRExFMUJRVTBzUjBGQlJ5eERRVUZETEVWQlFVVTdiMEpCUTNoQ0xGbEJRVmtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdhVUpCUTNaQ08wRkJRMnBDTEdGQlFXRTdPMWxCUlVRc1NVRkJTU3hWUVVGVkxFVkJRVVU3WjBKQlExb3NUMEZCVHl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRMnBDTEUxQlFVMHNTVUZCU1N4bFFVRmxMRU5CUVVNc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVsQlFVa3NSVUZCUlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hIUVVGSExFOUJRVThzU1VGQlNTeFBRVUZQTEVkQlFVY3NRMEZCUXl4RlFVRkZPMmRDUVVOb1JpeFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8yRkJRek5DTEUxQlFVMDdaMEpCUTBnc1NVRkJTU3hOUVVGTkxFZEJRVWNzUlVGQlJTeERRVUZETzJkQ1FVTm9RaXhKUVVGSkxGbEJRVmtzUlVGQlJUdHZRa0ZEWkN4TlFVRk5MRWRCUVVjc2IwUkJRVzlFTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVkQlFVY3NZVUZCWVN4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzYjBOQlFXOURMRU5CUVVNN2FVSkJRemRMTEUxQlFVMHNTVUZCU1N4clFrRkJhMElzUlVGQlJUdHZRa0ZETTBJc1RVRkJUU3hIUVVGSExHOUVRVUZ2UkN4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4SFFVRkhMR0ZCUVdFc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eEhRVUZITEN0RFFVRXJReXhIUVVGSExGZEJRVmNzUjBGQlJ5eGhRVUZoTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1JVRkJSU3hIUVVGSExFbEJRVWtzUTBGQlF6dHBRa0ZETTA4c1RVRkJUVHR2UWtGRFNDeE5RVUZOTEVkQlFVY3NiMFJCUVc5RUxFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFZEJRVWNzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRWRCUVVjc09FSkJRVGhDTEVOQlFVTTdhVUpCUTNaTE8yZENRVU5FTEUxQlFVMHNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRoUVVOc1FqdEJRVU5pTEZOQlFWTTdPMUZCUlVRc1NVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZETzFGQlEzQkVMRWxCUVVrc1MwRkJTeXhIUVVGSExHMUNRVUZ0UWl4SlFVRkpMRXRCUVVzc1MwRkJTeXhWUVVGVkxFZEJRVWNzUjBGQlJ5eEhRVUZITEV0QlFVc3NRMEZCUXl4RFFVRkRPMUZCUTNaRkxFbEJRVWtzVFVGQlRTeERRVUZETEU5QlFVOHNSVUZCUlR0WlFVTm9RaXhqUVVGakxFTkJRVU1zVlVGQlZTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmRCUVZjN1kwRkRla01zU1VGQlNTeExRVUZMTEV0QlFVc3NWVUZCVlN4RlFVRkZPMnRDUVVOMFFpeFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8yVkJRMmhETEUxQlFVMHNTVUZCU1N4TFFVRkxMRXRCUVVzc1UwRkJVeXhGUVVGRk8ydENRVU0xUWl4UFFVRlBMRVZCUVVVc1EwRkJRenRsUVVOaUxFMUJRVTA3YTBKQlEwZ3NWVUZCVlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEU5QlFVOHNSMEZCUnl4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF6dGxRVU42UkR0aFFVTkdMRU5CUVVNc1EwRkJRenRUUVVOT0xFMUJRVTA3V1VGRFNDeEpRVUZKTEV0QlFVc3NTMEZCU3l4VlFVRlZMRVZCUVVVN1owSkJRM1JDTEZWQlFWVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03WVVGRGFFTXNUVUZCVFN4SlFVRkpMRXRCUVVzc1MwRkJTeXhUUVVGVExFVkJRVVU3WjBKQlF6VkNMRTlCUVU4c1JVRkJSU3hEUVVGRE8yRkJRMklzVFVGQlRUdG5Ra0ZEU0N4VlFVRlZMRU5CUVVNc1QwRkJUeXhGUVVGRkxFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNUMEZCVHl4SFFVRkhMRXRCUVVzc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETzJGQlEzcEVPMU5CUTBvN1MwRkRTaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZET3p0QlFVVkVMRk5CUVZNc1ZVRkJWU3hEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVTdRVUZEYmtNc1NVRkJTU3hKUVVGSkxFZEJRVWNzUjBGQlJ5eERRVUZETEVWQlFVVTdRVUZEYWtJN08xRkJSVkVzU1VGQlNTeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eFRRVUZUTEVsQlFVa3NWVUZCVlN4RlFVRkZPMWxCUTJwRUxFOUJRVThzUTBGQlF5eERRVUZETzFOQlExbzdVVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNVMEZCVXl4SFFVRkhMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1EwRkJRenRMUVVNMVJUdEpRVU5FTEU5QlFVOHNRMEZCUXl4RFFVRkRPMEZCUTJJc1EwRkJRenM3UVVGRlJDeFRRVUZUTEZkQlFWY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhGUVVGRkxFMUJRVTBzUlVGQlJTeFBRVUZQTEVWQlFVVTdPMGxCUldwRUxGVkJRVlVzUTBGQlF5eFhRVUZYTzFGQlEyeENMRWxCUVVrc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVsQlFVa3NSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJReXhGUVVGRk8xbEJRMjVETEU5QlFVOHNRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhIUVVGSExFTkJRVU1zUlVGQlJTeE5RVUZOTEVOQlFVTXNRMEZCUXp0VFFVTjBReXhOUVVGTk8xbEJRMGdzU1VGQlNTeERRVUZETEZsQlFWa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRUUVVNelFqdExRVU5LTEVWQlFVVXNUMEZCVHl4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRM0pDTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4UFFVRlBMRVZCUVVVN1NVRkRha01zU1VGQlNTeEpRVUZKTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhWUVVGVkxFTkJRVU1zUTBGQlF6dEJRVU5zUkN4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzVDBGQlR5eERRVUZET3p0SlFVVjZRaXhQUVVGUExFbEJRVWtzUTBGQlF5eFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRE9VTXNRMEZCUXpzN1FVRkZSQ3hUUVVGVExHMUNRVUZ0UWl4RFFVRkRMRWxCUVVrc1JVRkJSVHRKUVVNdlFpeFBRVUZQTEVsQlFVa3NTVUZCU1N4SlFVRkpMRU5CUVVNc1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4SlFVRkpMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEZGQlFWRXNRMEZCUXp0QlFVTm9SaXhEUVVGRE96dEJRVVZFTEZOQlFWTXNaMEpCUVdkQ0xFTkJRVU1zUzBGQlN5eEZRVUZGTzBWQlF5OUNMRWxCUVVrc1RVRkJUU3hIUVVGSExFVkJRVVVzUTBGQlF6dEZRVU5vUWl4SlFVRkpMRkZCUVZFc1IwRkJSeXhMUVVGTExFTkJRVU03UlVGRGNrSXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3U1VGRGNrTXNTVUZCU1N4TlFVRk5MRWRCUVVjc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZOQlFWTXNTMEZCU3l4TlFVRk5MRU5CUVVNN1NVRkRNME1zU1VGQlNTeERRVUZETEZGQlFWRXNTVUZCU1N4RFFVRkRMRTFCUVUwc1JVRkJSVHROUVVONFFpeE5RVUZOTEVOQlFVTXNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzAxQlEzUkNMRkZCUVZFc1IwRkJSeXhSUVVGUkxFbEJRVWtzVFVGQlRTeERRVUZETzB0QlF5OUNPMGRCUTBZN1JVRkRSQ3hQUVVGUExFMUJRVTBzUTBGQlF6dEJRVU5vUWl4RFFVRkRMRU5CUVVNN08wRkJSVVlzU1VGQlNTeEpRVUZKTEVkQlFVY3NRMEZCUXl4WlFVRlpPMGxCUTNCQ0xGTkJRVk1zUlVGQlJTeEhRVUZITzFGQlExWXNUMEZCVHl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVc1NVRkJTU3hQUVVGUExFTkJRVU03WVVGRE0wTXNVVUZCVVN4RFFVRkRMRVZCUVVVc1EwRkJRenRoUVVOYUxGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0TFFVTnlRanRKUVVORUxFOUJRVThzV1VGQldUdFJRVU5tTEU5QlFVOHNSVUZCUlN4RlFVRkZMRWRCUVVjc1JVRkJSU3hGUVVGRkxFZEJRVWNzUjBGQlJ5eEhRVUZITEVWQlFVVXNSVUZCUlN4SFFVRkhMRWRCUVVjc1IwRkJSeXhGUVVGRkxFVkJRVVVzUjBGQlJ5eEhRVUZITzFsQlF6bERMRVZCUVVVc1JVRkJSU3hIUVVGSExFZEJRVWNzUjBGQlJ5eEZRVUZGTEVWQlFVVXNSMEZCUnl4RlFVRkZMRVZCUVVVc1IwRkJSeXhGUVVGRkxFVkJRVVVzUTBGQlF6dExRVU4yUXl4RFFVRkRPMEZCUTA0c1EwRkJReXhIUVVGSExFTkJRVU03TzBGQlJVd3NTVUZCU1N4VFFVRlRMRWRCUVVjc1JVRkJSU3hEUVVGRE8wRkJRMjVDTEVsQlFVa3NTMEZCU3l4RFFVRkRPMEZCUTFZc1NVRkJTU3hKUVVGSkxFZEJRVWM3U1VGRFVDeEpRVUZKTEVWQlFVVXNXVUZCV1R0UlFVTmtMRWxCUVVrc1VVRkJVU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMR1ZCUVdVc1EwRkJReXhEUVVGRE8xRkJRMjVFTEVsQlFVa3NVVUZCVVN4RlFVRkZPMVZCUTFvc1dVRkJXU3hEUVVGRExFdEJRVXNzUlVGQlJTeERRVUZETzFOQlEzUkNPMUZCUTBRc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRzlDUVVGdlFpeEZRVUZGTEVOQlFVTTdRVUZEZWtRc1VVRkJVU3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRPenRSUVVVNVFpeFBRVUZQTEVsQlFVa3NRMEZCUXl4WlFVRlpMRVZCUVVVc1EwRkJReXhKUVVGSkxFTkJRVU1zV1VGQldUdFZRVU14UXl4SlFVRkpMRkZCUVZFc1JVRkJSVHRaUVVOYUxGVkJRVlVzUTBGQlF5eFpRVUZaTzJOQlEzSkNMRXRCUVVzc1EwRkJReXhWUVVGVkxFZEJRVWNzYTBKQlFXdENMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNRMEZCUXp0alFVTXhSQ3hMUVVGTExFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXp0alFVTnlRaXhKUVVGSkxFTkJRVU1zVjBGQlZ5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPMkZCUXpWQ0xFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTTdWMEZEVkN4TlFVRk5PMWxCUTB3c1NVRkJTU3hMUVVGTExFTkJRVU1zVFVGQlRTeExRVUZMTEZOQlFWTXNSVUZCUlR0alFVTTVRaXhYUVVGWExFTkJRVU1zUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNRMEZCUXp0aFFVTjBSQ3hOUVVGTkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFdEJRVXNzWTBGQll5eEZRVUZGTzJOQlF6TkVMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVVVGQlVTeERRVUZETzJGQlEzcENPMEZCUTJJc1YwRkJWenM3VTBGRlJpeERRVUZETEVOQlFVTTdTMEZEVGp0SlFVTkVMRk5CUVZNc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJTeFBRVUZQTEVWQlFVVTdVVUZETDBJc1NVRkJTU3hUUVVGVExFbEJRVWtzVTBGQlV5eERRVUZETEUxQlFVMHNSVUZCUlR0WlFVTXZRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1UwRkJVeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETEVWQlFVVXNSVUZCUlR0blFrRkRka01zVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU01UWp0VFFVTktPMHRCUTBvN1NVRkRSQ3hqUVVGakxFVkJRVVVzV1VGQldUdFJRVU40UWl4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVjBGQlZ5eEZRVUZGTzFsQlF6ZENMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVjBGQlZ5eERRVUZETzFsQlF6TkNMRXRCUVVzc1EwRkJReXhMUVVGTExFZEJRVWNzUlVGQlJTeERRVUZETzFsQlEycENMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zYlVKQlFXMUNMRU5CUVVNc1EwRkJRenRaUVVOd1F5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRzFDUVVGdFFpeERRVUZETEVOQlFVTTdXVUZEY0VNc1NVRkJTU3hEUVVGRExHRkJRV0VzUTBGQlF5eE5RVUZOTEVWQlFVVTdaMEpCUTNaQ0xFZEJRVWNzUlVGQlJUdHZRa0ZEUkN4UlFVRlJMRVZCUVVVc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eFJRVUZSTzI5Q1FVTnNReXhKUVVGSkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpPMjlDUVVNeFFpeE5RVUZOTEVWQlFVVXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhOUVVGTk8yOUNRVU01UWl4SlFVRkpMRVZCUVVVc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eEpRVUZKTzJsQ1FVTTNRanRoUVVOS0xFTkJRVU1zUTBGQlF6dFRRVU5PTzBGQlExUXNTMEZCU3pzN1NVRkZSQ3hYUVVGWExFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVXNUVUZCVFN4RlFVRkZPMUZCUTJwRExFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NTVUZCU1N4TlFVRk5MRU5CUVVNc2FVSkJRV2xDTEVOQlFVTXNRMEZCUXp0UlFVTTVReXhKUVVGSkxFOUJRVThzUjBGQlJ5eERRVUZETEVsQlFVa3NSMEZCUnl4TlFVRk5MRU5CUVVNc2FVUkJRV2xFTEVOQlFVTXNTVUZCU1N4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRE8xRkJRemxHTEU5QlFVOHNWMEZCVnl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEZGQlFWRXNSVUZCUlR0WlFVTXZReXhSUVVGUkxFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExGRkJRVkVzUTBGQlF5eERRVUZETEVOQlFVTTdXVUZEYUVRc1pVRkJaU3hEUVVGRExGRkJRVkVzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4WlFVRlpPMmRDUVVOMlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4SFFVRkhMRVZCUVVVc1EwRkJRenRuUWtGRFppeExRVUZMTEVOQlFVTXNUMEZCVHl4SFFVRkhMRTlCUVU4c1MwRkJTeXhKUVVGSkxFTkJRVU03UVVGRGFrUXNaMEpCUVdkQ0xFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVMEZCVXl4RFFVRkRPenRCUVVWNlF5eG5Ra0ZCWjBJc1VVRkJVU3hEUVVGRExFdEJRVXNzUjBGQlJ5eG5Ra0ZCWjBJc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdPMmRDUVVWc1JDeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1VVRkJVU3hEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNSVUZCUlR0clFrRkRkRU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4eFFrRkJjVUlzUjBGQlJ5eEpRVUZKTEVkQlFVY3NSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE8wRkJReTlGTEdsQ1FVRnBRanM3UVVGRmFrSXNaMEpCUVdkQ0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6czdaMEpCUlc1RExFOUJRVThzUTBGQlF5eFJRVUZSTEVWQlFVVXNRMEZCUXl4RFFVRkRMRU5CUVVNN1lVRkRlRUlzUTBGQlF5eERRVUZETzFOQlEwNHNRMEZCUXl4RFFVRkRPMHRCUTA0N1NVRkRSQ3hYUVVGWExFVkJRVVVzVjBGQlZ6dEpRVU40UWl4WlFVRlpMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRE4wSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1MwRkJTeXhEUVVGRExFZEJRVWNzU1VGQlNTeExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1EwRkJRenRSUVVNdlF5eFBRVUZQTEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNN1VVRkRha0lzUzBGQlN5eERRVUZETEUxQlFVMHNSMEZCUnl4UlFVRlJMRU5CUVVNN1FVRkRhRU1zVVVGQlVTeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVOQlFVTTdPMUZCUlc1RExFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTzFWQlEzUkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zYlVKQlFXMUNMRU5CUVVNc1EwRkJRenRUUVVOeVF6dFJRVU5FTEVsQlFVa3NVVUZCVVN4RlFVRkZPMWxCUTFZc1NVRkJTU3hQUVVGUExFVkJRVVU3WjBKQlExUXNTVUZCU1N4RFFVRkRMR0ZCUVdFc1EwRkJReXh6UWtGQmMwSXNSMEZCUnl4UlFVRlJMRU5CUVVNc1NVRkJTU3hIUVVGSExHTkJRV01zUTBGQlF5eERRVUZETzJGQlF5OUZMRTFCUVUwN1owSkJRMGdzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4dFFrRkJiVUlzUjBGQlJ5eE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yZENRVU16UkN4SlFVRkpMRU5CUVVNc1YwRkJWeXhEUVVGRExITkNRVUZ6UWl4SFFVRkhMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzV1VGQldTeERRVUZETEVOQlFVTTdZVUZETTBVN1UwRkRTanRCUVVOVUxFdEJRVXM3UVVGRFREdEJRVU5CTzBGQlEwRTdPMGxCUlVrc2IwSkJRVzlDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NUMEZCVHl4RFFVRkRMRmxCUVZrc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4SlFVRkpMRWxCUVVrc1JVRkJSU3hEUVVGRE8wRkJRM2hGTEZGQlFWRXNUMEZCVHl4RFFVRkRMRmxCUVZrc1EwRkJReXhuUWtGQlowSXNSVUZCUlN4UlFVRlJMRU5CUVVNc1EwRkJRenM3VVVGRmFrUXNTVUZCU1N4UFFVRlBMRWRCUVVjc1QwRkJUeXhEUVVGRExGTkJRVk1zUlVGQlJTeERRVUZETEZOQlFWTXNRMEZCUXp0UlFVTTFReXhKUVVGSkxGbEJRVmtzUjBGQlJ5eEZRVUZGTEVOQlFVTTdVVUZEZEVJc1NVRkJTU3hQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRTFCUVUwc1NVRkJTU3hQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVOd1JpeFpRVUZaTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03VTBGRGNFTXNUVUZCVFR0WlFVTklMRmxCUVZrc1IwRkJSeXhqUVVGakxFTkJRVU1zVDBGQlR5eEZRVUZGTEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRUUVVONlJEdFJRVU5FTEU5QlFVODdXVUZEU0N4UlFVRlJMRVZCUVVVc1VVRkJVVHRaUVVOc1FpeFRRVUZUTEVWQlFVVXNXVUZCV1R0VFFVTXhRaXhEUVVGRE8wRkJRMVlzUzBGQlN6czdTVUZGUkN4aFFVRmhMRVZCUVVVc1ZVRkJWU3hUUVVGVExFVkJRVVVzU1VGQlNTeEZRVUZGTEVkQlFVY3NSVUZCUlR0UlFVTXpReXhKUVVGSkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4SlFVRkpMRU5CUVVNc1dVRkJXU3hGUVVGRkxFVkJRVVU3V1VGRE0wTXNTVUZCU1N4UFFVRlBMRWRCUVVjc1NVRkJTU3hYUVVGWExFVkJRVVU3WjBKQlF6TkNMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNN1lVRkRha003V1VGRFJDeExRVUZMTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhIUVVGSE8yZENRVU5tTEZOQlFWTXNSVUZCUlN4VFFVRlRPMmRDUVVOd1FpeFRRVUZUTEVWQlFVVXNTVUZCU1N4SlFVRkpMRVZCUVVVc1EwRkJReXhQUVVGUExFVkJRVVU3WjBKQlF5OUNMRWxCUVVrc1JVRkJSU3hKUVVGSk8yRkJRMklzUTBGQlF6dFpRVU5HTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNRMEZCUXp0VFFVTjBRenRMUVVOS08wbEJRMFFzVTBGQlV5eEZRVUZGTEZWQlFWVXNSMEZCUnl4RlFVRkZMRkZCUVZFc1JVRkJSVHRSUVVOb1F5eEpRVUZKTEdOQlFXTXNTVUZCU1N4alFVRmpMRU5CUVVNc1RVRkJUU3hGUVVGRk8xbEJRM3BETEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eGpRVUZqTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8yZENRVU0xUXl4alFVRmpMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NSVUZCUlN4UlFVRlJMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03WVVGRE9VTTdVMEZEU2p0TFFVTktPMGxCUTBRc1YwRkJWeXhGUVVGRkxGVkJRVlVzUzBGQlN5eEZRVUZGTEZGQlFWRXNSVUZCUlR0UlFVTndReXhKUVVGSkxHTkJRV01zU1VGQlNTeGpRVUZqTEVOQlFVTXNUVUZCVFN4RlFVRkZPMWxCUTNwRExFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNMVF5eGpRVUZqTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1MwRkJTeXhEUVVGRExFdEJRVXNzUlVGQlJTeFJRVUZSTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1lVRkRiRVE3VTBGRFNqdExRVU5LTzBsQlEwUXNZVUZCWVN4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRkxGRkJRVkVzUlVGQlJUdFJRVU40UXl4SlFVRkpMR05CUVdNc1NVRkJTU3hqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTzFsQlEzcERMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4alFVRmpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTTFReXhqUVVGakxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdZVUZEZEVRN1UwRkRTanRMUVVOS08wbEJRMFFzWjBKQlFXZENMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRGFrTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dExRVU16UWp0SlFVTkVMRzFDUVVGdFFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUTNCRExGbEJRVmtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRPVUk3U1VGRFJDeHhRa0ZCY1VJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU4wUXl4alFVRmpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzB0QlEyaERPMGxCUTBRc2JVSkJRVzFDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRjRU1zV1VGQldTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVNNVFqdEpRVU5FTERKQ1FVRXlRaXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTzFGQlF6VkRMRzlDUVVGdlFpeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVOMFF6dEpRVU5FTEZkQlFWY3NSVUZCUlN4WFFVRlhPMUZCUTNCQ0xFOUJRVThzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTjJSRHRKUVVORUxGTkJRVk1zUlVGQlJTeFhRVUZYTzFGQlEyeENMRTlCUVU4c1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dExRVU55UkR0SlFVTkVMRmxCUVZrc1JVRkJSU3hUUVVGVExGVkJRVlVzUlVGQlJUdFJRVU12UWl4SlFVRkpMRTlCUVU4c1ZVRkJWU3hMUVVGTExGZEJRVmNzUzBGQlN5eEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1NVRkJTU3hEUVVGRExGbEJRVmtzUlVGQlJTeERRVUZETEVWQlFVVTdXVUZEYkVZc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NWVUZCVlN4SFFVRkhMRmxCUVZrc1IwRkJSeXhYUVVGWExFTkJRVU03V1VGRE5VUXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXh2UWtGQmIwSXNRMEZCUXl4RFFVRkRPMU5CUTNoRE8xRkJRMFFzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1EwRkJReXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMHRCUTNoRU8wbEJRMFFzWVVGQllTeEZRVUZGTEZWQlFWVXNTVUZCU1N4RlFVRkZPMUZCUXpOQ0xFbEJRVWtzU1VGQlNTeExRVUZMTEV0QlFVc3NSVUZCUlR0WlFVTm9RaXhKUVVGSkxGZEJRVmNzUjBGQlJ6dG5Ra0ZEWkN4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFdEJRVXM3UVVGRGJFTXNZVUZCWVN4RFFVRkRPenRCUVVWa0xGbEJRVmtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03TzFsQlJUVkNMRWxCUVVrc1EwRkJReXhYUVVGWExFTkJRVU1zU1VGQlNTeEZRVUZGTzJkQ1FVTnVRaXhYUVVGWExFTkJRVU1zU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4eFFrRkJjVUlzUTBGQlF5eERRVUZETzBGQlEycEZMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeFhRVUZYTEVOQlFVTXNTVUZCU1N4RlFVRkZPMEZCUTJ4RExHZENRVUZuUWl4TFFVRkxMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUTBGQlF5eFhRVUZYTEVOQlFVTXNRMEZCUXpzN1owSkJSV3hETEVsQlFVa3NXVUZCV1N4SlFVRkpMRmxCUVZrc1EwRkJReXhOUVVGTkxFVkJRVVU3YjBKQlEzSkRMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4WlFVRlpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzNkQ1FVTXhReXhaUVVGWkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8zRkNRVU4wUXp0cFFrRkRTanRoUVVOS08wRkJRMklzVTBGQlV6czdRVUZGVkN4UlFVRlJMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVVVGQlVTeERRVUZET3p0QlFVVm9ReXhSUVVGUkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zUTBGQlF6czdVVUZGY0VNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHRRa0ZCYlVJc1JVRkJSU3hYUVVGWExFTkJRVU1zUTBGQlF6dEJRVU42UkN4TFFVRkxPenRKUVVWRUxGbEJRVmtzUlVGQlJTeFpRVUZaTzFGQlEzUkNMRWxCUVVrc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVVVGQlVTeEpRVUZKTEVsQlFVa3NVVUZCVVN4RFFVRkRPMVZCUTNaRkxHTkJRV01zUlVGQlJTeEpRVUZKTzFOQlEzSkNMRU5CUVVNc1EwRkJRenRSUVVOSUxFbEJRVWtzYjBKQlFXOUNMRU5CUVVNc1RVRkJUU3hIUVVGSExFTkJRVU1zU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVWQlFVVXNSVUZCUlR0WlFVTTNSU3hQUVVGUExFbEJRVWtzVDBGQlR5eERRVUZETEZWQlFWVXNUMEZCVHl4RlFVRkZMRTFCUVUwc1JVRkJSVHRuUWtGRE1VTXNiMEpCUVc5Q0xFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNWVUZCVlN4SlFVRkpMRVZCUVVVN2IwSkJRM0JETEZGQlFWRXNRMEZCUXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03YjBKQlF6TkNMRTlCUVU4c1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6dHBRa0ZEY2tJc1JVRkJSU3haUVVGWk8yOUNRVU5ZTEU5QlFVOHNRMEZCUXl4UlFVRlJMRU5CUVVNc1EwRkJRenRwUWtGRGNrSXNRMEZCUXl4RFFVRkRPMkZCUTA0c1EwRkJReXhEUVVGRE8xTkJRMDRzVFVGQlRUdFpRVU5JTEU5QlFVOHNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6dFRRVU53UXp0QlFVTlVMRXRCUVVzN08wbEJSVVFzYjBKQlFXOUNMRVZCUVVVc1dVRkJXVHRSUVVNNVFpeEpRVUZKTEZsQlFWa3NSMEZCUnl4WlFVRlpMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETzFGQlEyaEVMRWxCUVVrc1dVRkJXU3hGUVVGRk8wRkJRekZDTEZsQlFWa3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdPMWxCUldwRExFbEJRVWtzUzBGQlN5eERRVUZETEZGQlFWRXNSVUZCUlR0blFrRkRhRUlzU1VGQlNTeFhRVUZYTEVkQlFVY3NTVUZCU1N4UlFVRlJMRVZCUVVVc1EwRkJRenRuUWtGRGFrTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1IwRkJSeXhMUVVGTExFTkJRVU1zVVVGQlVTeERRVUZETEZGQlFWRXNRMEZCUXp0blFrRkRMME1zVjBGQlZ5eERRVUZETEZGQlFWRXNSMEZCUnl4TFFVRkxMRU5CUVVNc1VVRkJVU3hEUVVGRExHVkJRV1VzUTBGQlF6dG5Ra0ZEZEVRc1MwRkJTeXhEUVVGRExGRkJRVkVzUjBGQlJ5eFhRVUZYTEVOQlFVTTdZVUZEYUVNN1UwRkRTaXhOUVVGTk8xbEJRMGdzUzBGQlN5eEhRVUZITzJkQ1FVTktMRTFCUVUwc1JVRkJSU3hqUVVGak8yZENRVU4wUWl4VFFVRlRMRVZCUVVVc1JVRkJSVHRoUVVOb1FpeERRVUZETzFOQlEwdzdVVUZEUkN4UFFVRlBMRXRCUVVzc1EwRkJRenRCUVVOeVFpeExRVUZMT3p0SlFVVkVMR3RDUVVGclFpeEZRVUZGTEZWQlFWVXNVMEZCVXl4RlFVRkZPMUZCUTNKRExFbEJRVWtzVTBGQlV5eEZRVUZGTzFsQlExZ3NXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhOUVVGTkxFVkJRVVVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRE8xTkJRek5FTEUxQlFVMDdXVUZEU0N4WlFVRlpMRU5CUVVNc1ZVRkJWU3hEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETzFOQlEyNURPMEZCUTFRc1MwRkJTenM3U1VGRlJDeE5RVUZOTEVWQlFVVXNXVUZCV1R0UlFVTm9RaXhKUVVGSkxFTkJRVU1zYTBKQlFXdENMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03UzBGRGJFTTdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVTBGQlV5eGxRVUZsTEVOQlFVTXNSMEZCUnl4RlFVRkZMRXRCUVVzc1JVRkJSVHRKUVVOcVF5eERRVUZETEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1YwRkJWeXhEUVVGRExHRkJRV0VzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXp0QlFVTTNReXhEUVVGRE96dEJRVVZFTEZOQlFWTXNWMEZCVnl4RFFVRkRMRWRCUVVjc1JVRkJSU3hMUVVGTExFVkJRVVU3U1VGRE4wSXNRMEZCUXl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRExGZEJRVmNzUTBGQlF5eFpRVUZaTEVWQlFVVXNTMEZCU3l4RFFVRkRMRU5CUVVNN1FVRkROVU1zUTBGQlF6czdRVUZGUkR0QlFVTkJPMEZCUTBFN08wZEJSVWM3UVVGRFNDeFRRVUZUTEcxQ1FVRnRRaXhEUVVGRExFZEJRVWNzUlVGQlJUdEpRVU01UWl4UFFVRlBMRU5CUVVNc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNc1RVRkJUU3hKUVVGSkxFTkJRVU03VlVGRGNFTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1EwRkJReXhYUVVGWExFVkJRVVVzU1VGQlNTeFBRVUZQTEVOQlFVTTdRVUZEYUVRc1EwRkJRenM3UVVGRlJEczdSMEZGUnp0QlFVTklMRk5CUVZNc1owSkJRV2RDTEVOQlFVTXNSMEZCUnl4RlFVRkZPMFZCUXpkQ0xFOUJRVThzUTBGQlF5eEhRVUZITEVOQlFVTXNXVUZCV1N4SlFVRkpMRWRCUVVjc1EwRkJReXhaUVVGWkxFTkJRVU1zWVVGQllTeERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRExFOUJRVThzUTBGQlF5eGxRVUZsTEVOQlFVTXNRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJRelZITEVOQlFVTTdPMEZCUlVRN08wZEJSVWM3UVVGRFNDeFRRVUZUTEdsQ1FVRnBRaXhEUVVGRExFZEJRVWNzUlVGQlJTeEhRVUZITEVWQlFVVTdSVUZEYmtNc1NVRkJTU3hQUVVGUExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExHdENRVUZyUWl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRE8wVkJRMmhGTEVsQlFVa3NZVUZCWVN4SlFVRkpMRTlCUVU4c1MwRkJTeXhKUVVGSkxFbEJRVWtzVDBGQlR5eExRVUZMTEUxQlFVMHNTVUZCU1N4UFFVRlBMRTlCUVU4c1MwRkJTeXhYUVVGWExFTkJRVU1zUTBGQlF6dEZRVU12Uml4UFFVRlBMRWxCUVVrc1EwRkJReXhYUVVGWExFVkJRVVVzU1VGQlNTeGhRVUZoTEVsQlFVa3NiVUpCUVcxQ0xFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEZWtVc1EwRkJRenM3UVVGRlJDeEpRVUZKTEUxQlFVMHNSMEZCUnl4RlFVRkZMRU5CUVVNN08wRkJSV2hDTEZOQlFWTXNhVUpCUVdsQ0xFZEJRVWM3TzBsQlJYcENMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4TlFVRk5MRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzFGQlEzQkRMRkZCUVZFc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhEUVVGRExFVkJRVVVzUTBGQlF5eFZRVUZWTEVkQlFVY3NSVUZCUlR0WlFVTnFSQ3hKUVVGSkxFOUJRVThzUjBGQlJ5eFZRVUZWTEVOQlFVTXNSVUZCUlR0blFrRkRka0lzU1VGQlNTeERRVUZETEVOQlFVTXNVMEZCVXp0QlFVTXZRaXh2UWtGQmIwSXNUMEZCVHpzN1FVRkZNMElzWjBKQlFXZENMRWxCUVVrc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFbEJRVWtzU1VGQlNTeERRVUZETEZkQlFWY3NSVUZCUlN4RlFVRkZPenR6UWtGRmFrUXNTVUZCU1N4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4RFFVRkRPM05DUVVOc1F5eEpRVUZKTEVsQlFVa3NSMEZCUnp0M1FrRkRWQ3hQUVVGUExFVkJRVVVzU1VGQlNTeERRVUZETEc5Q1FVRnZRaXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTTdkVUpCUXpkRExFTkJRVU03UVVGRGVFSXNjMEpCUVhOQ0xFbEJRVWtzUzBGQlN5eERRVUZET3p0elFrRkZWaXhKUVVGSkxFZEJRVWNzU1VGQlNTeFhRVUZYTEVWQlFVVTdNRUpCUTNCQ0xHVkJRV1VzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE96QkNRVU5vUXl4TlFVRk5MRU5CUVVNc1NVRkJTU3hEUVVGRE96aENRVU5TTEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1RVRkJUVHM0UWtGRGFrSXNTMEZCU3l4RlFVRkZMRlZCUVZVc1EwRkJReXhaUVVGWk8ydERRVU14UWl4WFFVRlhMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0clEwRkROVUlzWlVGQlpTeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03SzBKQlEzQkRMRVZCUVVVc1IwRkJSeXhEUVVGRE96SkNRVU5XTEVOQlFVTXNRMEZCUXp0QlFVTTNRaXgxUWtGQmRVSTdPM05DUVVWRUxFbEJRVWtzUjBGQlJ5eEpRVUZKTEZWQlFWVXNSVUZCUlRzd1FrRkRia0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN09FSkJRM0JETEVsQlFVa3NUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFOUJRVThzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZPMnREUVVNdlFpeFpRVUZaTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzJ0RFFVTTVRaXhOUVVGTkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1EwRkJRenRyUTBGRGNFSXNUVUZCVFRzclFrRkRWRHN5UWtGRFNqc3dRa0ZEUkN4bFFVRmxMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXpzd1FrRkRha01zVjBGQlZ5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03UVVGRGRrUXNkVUpCUVhWQ096dHpRa0ZGUkN4SlFVRkpMR2xDUVVGcFFpeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1IwRkJSeXhEUVVGRExFVkJRVVU3ZDBKQlEzQkRMRWxCUVVrc1EwRkJReXhEUVVGRExFdEJRVXNzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZPekJDUVVOMlFpeEpRVUZKTEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1EwRkJReXhMUVVGTExFbEJRVWtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTTFSQ3g1UWtGQmVVSTdPM2RDUVVWRUxFbEJRVWtzUjBGQlJ5eEpRVUZKTEZGQlFWRXNSVUZCUlRzd1FrRkRia0lzU1VGQlNTeERRVUZETEZWQlFWVXNSMEZCUnpzMFFrRkRhRUlzVDBGQlR5eEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1MwRkJTenMwUWtGRGVFSXNVMEZCVXl4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zVDBGQlR6czBRa0ZETTBJc1ZVRkJWU3hGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNVVUZCVVRzeVFrRkRPVUlzUTBGQlF6dEJRVU0xUWl4NVFrRkJlVUk3TzNkQ1FVVkVMRWxCUVVrc1EwRkJReXhoUVVGaExFTkJRVU1zUjBGQlJ5eEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenQxUWtGRGNFTTdRVUZEZGtJc2FVSkJRV2xDT3p0QlFVVnFRaXhoUVVGaExFTkJRVU03UVVGRFpEczdXVUZGV1N4RFFVRkRMRWxCUVVrc1EwRkJReXhqUVVGakxFZEJRVWNzU1VGQlNTeERRVUZETEdOQlFXTXNTVUZCU1N4RlFVRkZMRVZCUVVVc1IwRkJSeXhEUVVGRExFZEJRVWNzVDBGQlR5eERRVUZETzFsQlEycEZMRTlCUVU4c1QwRkJUeXhEUVVGRE8xTkJRMnhDTEVWQlFVVXNUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdRVUZETjBJc1MwRkJTenM3U1VGRlJDeEpRVUZKTEZOQlFWTXNSMEZCUnp0UlFVTmFMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRCUVVOdVFpeExRVUZMTEVOQlFVTTdPMGxCUlVZc1NVRkJTU3hSUVVGUkxFZEJRVWM3VVVGRFdDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFbEJRVWs3VVVGRFZpeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdRVUZEYWtJc1MwRkJTeXhEUVVGRE96dEpRVVZHTEZOQlFWTXNaVUZCWlN4RlFVRkZMRU5CUVVNc1JVRkJSVHRSUVVONlFpeEpRVUZKTEVOQlFVTXNRMEZCUXl4VFFVRlRPMEZCUTNaQ0xGbEJRVmtzVDBGQlR6czdVVUZGV0N4SlFVRkpMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhKUVVGSkxHbENRVUZwUWl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzVlVGQlZTeERRVUZETEVWQlFVVTdRVUZEY0VZc1dVRkJXU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUXpWQ08wRkJRMEU3TzFsQlJWa3NTVUZCU1N4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU1zUTBGQlF5eEZRVUZGTzJkQ1FVTTNRaXhEUVVGRExFZEJRVWNzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTJwRExHRkJRV0U3TzFsQlJVUXNTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJReXhSUVVGUkxFdEJRVXNzUTBGQlF5eEpRVUZKTEVWQlFVVXNTVUZCU1N4RFFVRkRMRWxCUVVrc1JVRkJSU3hEUVVGRExFVkJRVVU3WjBKQlEzSkRMRU5CUVVNc1IwRkJSeXhOUVVGTkxFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTXNSMEZCUnl4RlFVRkZMRU5CUVVNc1EwRkJRenRCUVVOb1JDeGhRVUZoTEUxQlFVMHNTVUZCU1N4RFFVRkRMRU5CUVVNc1VVRkJVU3hKUVVGSkxGRkJRVkVzUTBGQlF5eGpRVUZqTEVOQlFVTXNRMEZCUXl4RFFVRkRMRVZCUVVVN08yZENRVVZxUkN4RFFVRkRMRWRCUVVjc1VVRkJVU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJGQlEyNUNMRTFCUVUwN1owSkJRMGdzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03UVVGRE0wTXNZVUZCWVRzN1dVRkZSQ3hKUVVGSkxFTkJRVU1zWVVGQllTeERRVUZETEZWQlFWVXNSVUZCUlR0blFrRkRNMElzVDBGQlR5eEZRVUZGTEVsQlFVa3NRMEZCUXl4dlFrRkJiMElzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRPMmRDUVVNMVF5eEhRVUZITEVWQlFVVXNRMEZCUXp0blFrRkRUaXhUUVVGVExFVkJRVVVzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4TFFVRkxPMmRDUVVONlFpeExRVUZMTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhMUVVGTExFZEJRVWNzUTBGQlF6dG5Ra0ZEZWtJc1QwRkJUeXhGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTzJGQlEzSkNMRU5CUVVNc1EwRkJRenRUUVVOT08wRkJRMVFzUzBGQlN6czdRVUZGVEN4SlFVRkpMRkZCUVZFc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4VlFVRlZMRVZCUVVVc1pVRkJaU3hGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzBGQlEycEZPenRKUVVWSkxFTkJRVU1zU1VGQlNTeERRVUZETEdOQlFXTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1kwRkJZeXhKUVVGSkxFVkJRVVVzUlVGQlJTeFZRVUZWTEVOQlFVTXNSMEZCUnl4bFFVRmxMRU5CUVVNN1FVRkRjRVlzUTBGQlF6czdRVUZGUkN4VFFVRlRMR3RDUVVGclFpeERRVUZETEVsQlFVa3NSVUZCUlR0SlFVTTVRaXhKUVVGSkxFZEJRVWNzU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenRKUVVNeFJDeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRTFCUVUwc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZkQlFWY3NRMEZCUXp0UlFVTnFSQ3hQUVVGUExFZEJRVWNzUzBGQlN5eERRVUZETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU03U1VGRE1VTXNUMEZCVHl4UFFVRlBMRXRCUVVzc1NVRkJTU3hIUVVGSExFVkJRVVVzUjBGQlJ5eHJRa0ZCYTBJc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEzUkdMRU5CUVVNN08wRkJSVVFzVTBGQlV5eGhRVUZoTEVkQlFVYzdSVUZEZGtJc1NVRkJTU3hSUVVGUkxFTkJRVU1zVlVGQlZTeEpRVUZKTEZWQlFWVXNSVUZCUlR0QlFVTjZReXhKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXl4SlFVRkpMRU5CUVVNc1dVRkJXVHM3UVVGRmFrTXNVVUZCVVN4cFFrRkJhVUlzUlVGQlJTeERRVUZET3p0UlFVVndRaXhKUVVGSkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNSVUZCUlR0WlFVTndRaXhKUVVGSkxFTkJRVU1zWVVGQllTeERRVUZETEUxQlFVMHNSVUZCUlR0blFrRkRka0lzUjBGQlJ5eEZRVUZGTzI5Q1FVTkVMRkZCUVZFc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEZGQlFWRTdiMEpCUTJ4RExFbEJRVWtzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrN2IwSkJRekZDTEUxQlFVMHNSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFMUJRVTA3YjBKQlF6bENMRWxCUVVrc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEVsQlFVazdhVUpCUXpkQ08yRkJRMG9zUTBGQlF5eERRVUZETzFOQlEwNDdTMEZEU2l4RFFVRkRMRU5CUVVNN1IwRkRTanRCUVVOSUxFTkJRVU03TzBGQlJVUXNZVUZCWVN4RlFVRkZMRU5CUVVNN1FVRkRhRUlzVVVGQlVTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExHdENRVUZyUWl4RlFVRkZMR0ZCUVdFc1EwRkJReXhEUVVGRE96dEJRVVUzUkN4TlFVRk5MRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNVVUZCVVN4RlFVRkZMRmxCUVZrN1NVRkRNVU1zU1VGQlNTeERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRPMEZCUTJ4Q0xFTkJRVU1zUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXpzN1FVRkZWQ3hOUVVGTkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1QwRkJUeXhGUVVGRkxGVkJRVlVzUjBGQlJ5eEZRVUZGTzBsQlF6VkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zWjBKQlFXZENMRWRCUVVjc1IwRkJSeXhEUVVGRExFOUJRVThzUjBGQlJ5eEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRWRCUVVjc1IwRkJSeXhIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEVsQlFVa3NSMEZCUnl4SFFVRkhMRWRCUVVjc1IwRkJSeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzBGQlEzQkhMRU5CUVVNc1EwRkJReXhEUVVGRE96dEJRVVZJTEUxQlFVMHNRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lkbUZ5SUY4Z1BTQnlaWEYxYVhKbEtDY3VMM1YwYVd4ekp5azdYRzUyWVhJZ1VISnZiV2x6WlNBOUlISmxjWFZwY21Vb0oyVnpOaTF3Y205dGFYTmxKeWt1VUhKdmJXbHpaVHRjYm5aaGNpQlRhVzExYkdGMFpTQTlJSEpsY1hWcGNtVW9KeTR2YzJsdGRXeGhkR1VuS1R0Y2JuWmhjaUJ6Wld4bFkzUnZja1pwYm1SbGNpQTlJSEpsY1hWcGNtVW9KeTR2YzJWc1pXTjBiM0pHYVc1a1pYSW5LVHRjYm5aaGNpQlRaWFIwYVc1bmN5QTlJSEpsY1hWcGNtVW9KeTR2YzJWMGRHbHVaM01uS1R0Y2JseHVMeThnZG1GeUlHMTVSMlZ1WlhKaGRHOXlJRDBnYm1WM0lFTnpjMU5sYkdWamRHOXlSMlZ1WlhKaGRHOXlLQ2s3WEc1MllYSWdhVzF3YjNKMFlXNTBVM1JsY0V4bGJtZDBhQ0E5SURVd01EdGNiblpoY2lCellYWmxTR0Z1Wkd4bGNuTWdQU0JiWFR0Y2JuWmhjaUJ5WlhCdmNuUklZVzVrYkdWeWN5QTlJRnRkTzF4dWRtRnlJR3h2WVdSSVlXNWtiR1Z5Y3lBOUlGdGRPMXh1ZG1GeUlITmxkSFJwYm1kelRHOWhaRWhoYm1Sc1pYSnpJRDBnVzEwN1hHNWNibVoxYm1OMGFXOXVJR2RsZEZOalpXNWhjbWx2S0c1aGJXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2JHOWhaRWhoYm1Sc1pYSnpMbXhsYm1kMGFDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITjBZWFJsSUQwZ2RYUnRaUzV6ZEdGMFpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2MzUmhkR1V1YzJObGJtRnlhVzl6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFlYUmxMbk5qWlc1aGNtbHZjMXRwWFM1dVlXMWxJRDA5UFNCdVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjMjlzZG1Vb2MzUmhkR1V1YzJObGJtRnlhVzl6VzJsZEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JzYjJGa1NHRnVaR3hsY25OYk1GMG9ibUZ0WlN3Z1puVnVZM1JwYjI0Z0tISmxjM0FwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYTnZiSFpsS0hKbGMzQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlLVHRjYm4xY2JuWmhjaUIyWVd4cFpHRjBhVzVuSUQwZ1ptRnNjMlU3WEc1Y2JuWmhjaUJsZG1WdWRITWdQU0JiWEc0Z0lDQWdKMk5zYVdOckp5eGNiaUFnSUNBblptOWpkWE1uTEZ4dUlDQWdJQ2RpYkhWeUp5eGNiaUFnSUNBblpHSnNZMnhwWTJzbkxGeHVJQ0FnSUM4dklDZGtjbUZuSnl4Y2JpQWdJQ0F2THlBblpISmhaMlZ1ZEdWeUp5eGNiaUFnSUNBdkx5QW5aSEpoWjJ4bFlYWmxKeXhjYmlBZ0lDQXZMeUFuWkhKaFoyOTJaWEluTEZ4dUlDQWdJQzh2SUNka2NtRm5jM1JoY25RbkxGeHVJQ0FnSUM4dklDZHBibkIxZENjc1hHNGdJQ0FnSjIxdmRYTmxaRzkzYmljc1hHNGdJQ0FnTHk4Z0oyMXZkWE5sYlc5MlpTY3NYRzRnSUNBZ0oyMXZkWE5sWlc1MFpYSW5MRnh1SUNBZ0lDZHRiM1Z6Wld4bFlYWmxKeXhjYmlBZ0lDQW5iVzkxYzJWdmRYUW5MRnh1SUNBZ0lDZHRiM1Z6Wlc5MlpYSW5MRnh1SUNBZ0lDZHRiM1Z6WlhWd0p5eGNiaUFnSUNBblkyaGhibWRsSnl4Y2JpQWdJQ0F2THlBbmNtVnphWHBsSnl4Y2JpQWdJQ0F2THlBbmMyTnliMnhzSjF4dVhUdGNibHh1Wm5WdVkzUnBiMjRnWjJWMFEyOXVaR2wwYVc5dWN5aHpZMlZ1WVhKcGJ5d2dZMjl1WkdsMGFXOXVWSGx3WlNrZ2UxeHVJQ0IyWVhJZ2MyVjBkWEFnUFNCelkyVnVZWEpwYjF0amIyNWthWFJwYjI1VWVYQmxYVHRjYmlBZ2RtRnlJSE5qWlc1aGNtbHZjeUE5SUhObGRIVndJQ1ltSUhObGRIVndMbk5qWlc1aGNtbHZjenRjYmlBZ0x5OGdWRTlFVHpvZ1FuSmxZV3NnYjNWMElHbHVkRzhnYUdWc2NHVnlYRzRnSUdsbUlDaHpZMlZ1WVhKcGIzTXBJSHRjYmlBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1aGJHd29YeTV0WVhBb2MyTmxibUZ5YVc5ekxDQm1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOU9ZVzFsS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWjJWMFUyTmxibUZ5YVc4b2MyTmxibUZ5YVc5T1lXMWxLUzUwYUdWdUtHWjFibU4wYVc5dUlDaHZkR2hsY2xOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lHOTBhR1Z5VTJObGJtRnlhVzhnUFNCS1UwOU9MbkJoY25ObEtFcFRUMDR1YzNSeWFXNW5hV1o1S0c5MGFHVnlVMk5sYm1GeWFXOHBLVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE5sZEhWd1EyOXVaR2wwYVc5dWN5aHZkR2hsY2xOalpXNWhjbWx2S1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjJZWElnZEc5U1pYUjFjbTRnUFNCYlhUdGNiaUFnSUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUc5MGFHVnlVMk5sYm1GeWFXOHVjM1JsY0hNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnZVbVYwZFhKdUxuQjFjMmdvYjNSb1pYSlRZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFhTazdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGIxSmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlLU2s3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTaGJYU2s3WEc0Z0lIMWNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVSEpsWTI5dVpHbDBhVzl1Y3lBb2MyTmxibUZ5YVc4cElIdGNiaUFnY21WMGRYSnVJR2RsZEVOdmJtUnBkR2x2Ym5Nb2MyTmxibUZ5YVc4c0lDZHpaWFIxY0NjcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCblpYUlFiM04wWTI5dVpHbDBhVzl1Y3lBb2MyTmxibUZ5YVc4cElIdGNiaUFnY21WMGRYSnVJR2RsZEVOdmJtUnBkR2x2Ym5Nb2MyTmxibUZ5YVc4c0lDZGpiR1ZoYm5Wd0p5azdYRzU5WEc1Y2JtWjFibU4wYVc5dUlGOWpiMjVqWVhSVFkyVnVZWEpwYjFOMFpYQk1hWE4wY3loemRHVndjeWtnZTF4dUlDQWdJSFpoY2lCdVpYZFRkR1Z3Y3lBOUlGdGRPMXh1SUNBZ0lIWmhjaUJqZFhKeVpXNTBWR2x0WlhOMFlXMXdPeUF2THlCcGJtbDBZV3hwZW1Wa0lHSjVJR1pwY25OMElHeHBjM1FnYjJZZ2MzUmxjSE11WEc0Z0lDQWdabTl5SUNoMllYSWdhaUE5SURBN0lHb2dQQ0J6ZEdWd2N5NXNaVzVuZEdnN0lHb3JLeWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdabXhoZEZOMFpYQnpJRDBnYzNSbGNITmJhbDA3WEc0Z0lDQWdJQ0FnSUdsbUlDaHFJRDRnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYXlBOUlEQTdJR3NnUENCemRHVndjeTVzWlc1bmRHZzdJR3NyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ6ZEdWd0lEMGdabXhoZEZOMFpYQnpXMnRkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQmthV1ptSUQwZ2F5QStJREFnUHlCemRHVndMblJwYldWVGRHRnRjQ0F0SUdac1lYUlRkR1Z3YzF0cklDMGdNVjB1ZEdsdFpWTjBZVzF3SURvZ05UQTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZM1Z5Y21WdWRGUnBiV1Z6ZEdGdGNDQXJQU0JrYVdabU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnNZWFJUZEdWd2MxdHJYUzUwYVcxbFUzUmhiWEFnUFNCamRYSnlaVzUwVkdsdFpYTjBZVzF3TzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kzVnljbVZ1ZEZScGJXVnpkR0Z0Y0NBOUlHWnNZWFJUZEdWd2MxdHFYUzUwYVcxbFUzUmhiWEE3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2JtVjNVM1JsY0hNZ1BTQnVaWGRUZEdWd2N5NWpiMjVqWVhRb1pteGhkRk4wWlhCektUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJRzVsZDFOMFpYQnpPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnpaWFIxY0VOdmJtUnBkR2x2Ym5NZ0tITmpaVzVoY21sdktTQjdYRzRnSUNBZ2RtRnlJSEJ5YjIxcGMyVnpJRDBnVzEwN1hHNGdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVZV3hzS0Z0Y2JpQWdJQ0FnSUNBZ1oyVjBVSEpsWTI5dVpHbDBhVzl1Y3loelkyVnVZWEpwYnlrc1hHNGdJQ0FnSUNBZ0lHZGxkRkJ2YzNSamIyNWthWFJwYjI1ektITmpaVzVoY21sdktWeHVJQ0FnSUYwcExuUm9aVzRvWm5WdVkzUnBiMjRnS0hOMFpYQkJjbkpoZVhNcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhOMFpYQk1hWE4wY3lBOUlITjBaWEJCY25KaGVYTmJNRjB1WTI5dVkyRjBLRnR6WTJWdVlYSnBieTV6ZEdWd2MxMHNJSE4wWlhCQmNuSmhlWE5iTVYwcE8xeHVJQ0FnSUNBZ0lDQnpZMlZ1WVhKcGJ5NXpkR1Z3Y3lBOUlGOWpiMjVqWVhSVFkyVnVZWEpwYjFOMFpYQk1hWE4wY3loemRHVndUR2x6ZEhNcE8xeHVJQ0FnSUgwcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCeWRXNVRkR1Z3S0hOalpXNWhjbWx2TENCcFpIZ3NJSFJ2VTJ0cGNDa2dlMXh1SUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkU1ZVNU9TVTVIWDFOVVJWQW5LVHRjYmlBZ0lDQjBiMU5yYVhBZ1BTQjBiMU5yYVhBZ2ZId2dlMzA3WEc1Y2JpQWdJQ0IyWVhJZ2MzUmxjQ0E5SUhOalpXNWhjbWx2TG5OMFpYQnpXMmxrZUYwN1hHNGdJQ0FnZG1GeUlITjBZWFJsSUQwZ2RYUnRaUzV6ZEdGMFpUdGNiaUFnSUNCcFppQW9jM1JsY0NBbUppQnpkR0YwWlM1emRHRjBkWE1nUFQwZ0oxQk1RVmxKVGtjbktTQjdYRzRnSUNBZ0lDQWdJSE4wWVhSbExuSjFiaTV6WTJWdVlYSnBieUE5SUhOalpXNWhjbWx2TzF4dUlDQWdJQ0FnSUNCemRHRjBaUzV5ZFc0dWMzUmxjRWx1WkdWNElEMGdhV1I0TzF4dUlDQWdJQ0FnSUNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKMnh2WVdRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdibVYzVEc5allYUnBiMjRnUFNCemRHVndMbVJoZEdFdWRYSnNMbkJ5YjNSdlkyOXNJQ3NnWENJdkwxd2lJQ3NnYzNSbGNDNWtZWFJoTG5WeWJDNW9iM04wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhObFlYSmphQ0E5SUhOMFpYQXVaR0YwWVM1MWNtd3VjMlZoY21Ob08xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHaGhjMmdnUFNCemRHVndMbVJoZEdFdWRYSnNMbWhoYzJnN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpaV0Z5WTJnZ0ppWWdJWE5sWVhKamFDNWphR0Z5UVhRb1hDSS9YQ0lwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVmhjbU5vSUQwZ1hDSS9YQ0lnS3lCelpXRnlZMmc3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhWE5UWVcxbFZWSk1JRDBnS0d4dlkyRjBhVzl1TG5CeWIzUnZZMjlzSUNzZ1hDSXZMMXdpSUNzZ2JHOWpZWFJwYjI0dWFHOXpkQ0FySUd4dlkyRjBhVzl1TG5ObFlYSmphQ2tnUFQwOUlDaHVaWGRNYjJOaGRHbHZiaUFySUhObFlYSmphQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWNtVndiR0ZqWlNodVpYZE1iMk5oZEdsdmJpQXJJR2hoYzJnZ0t5QnpaV0Z5WTJncE8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kWFJ0WlM1emRHRjBaUzV6WlhSMGFXNW5jeTVuWlhRb1hDSjJaWEppYjNObFhDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR052Ym5OdmJHVXViRzluS0Noc2IyTmhkR2x2Ymk1d2NtOTBiMk52YkNBcklHeHZZMkYwYVc5dUxtaHZjM1FnS3lCc2IyTmhkR2x2Ymk1elpXRnlZMmdwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWMyOXNaUzVzYjJjb0tITjBaWEF1WkdGMFlTNTFjbXd1Y0hKdmRHOWpiMndnS3lCemRHVndMbVJoZEdFdWRYSnNMbWh2YzNRZ0t5QnpkR1Z3TG1SaGRHRXVkWEpzTG5ObFlYSmphQ2twTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJKWmlCM1pTQm9ZWFpsSUc1dmRDQmphR0Z1WjJWa0lIUm9aU0JoWTNSMVlXd2diRzlqWVhScGIyNHNJSFJvWlc0Z2RHaGxJR3h2WTJGMGFXOXVMbkpsY0d4aFkyVmNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklIZHBiR3dnYm05MElHZHZJR0Z1ZVhkb1pYSmxYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hWE5UWVcxbFZWSk1LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZDJsdVpHOTNMbXh2WTJGMGFXOXVMbkpsYkc5aFpDaDBjblZsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITjBaWEF1WlhabGJuUk9ZVzFsSUQwOUlDZDBhVzFsYjNWMEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExtRjFkRzlTZFc0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBc0lITjBaWEF1WkdGMFlTNWhiVzkxYm5RcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUd4dlkyRjBiM0lnUFNCemRHVndMbVJoZEdFdWJHOWpZWFJ2Y2p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCemRHVndjeUE5SUhOalpXNWhjbWx2TG5OMFpYQnpPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSFZ1YVhGMVpVbGtJRDBnWjJWMFZXNXBjWFZsU1dSR2NtOXRVM1JsY0NoemRHVndLVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnZEhKNUlIUnZJR2RsZENCeWFXUWdiMllnZFc1dVpXTmxjM05oY25rZ2MzUmxjSE5jYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdkRzlUYTJsd1czVnVhWEYxWlVsa1hTQTlQU0FuZFc1a1pXWnBibVZrSnlBbUppQjFkRzFsTG5OMFlYUmxMbk5sZEhScGJtZHpMbWRsZENoY0luSjFibTVsY2k1emNHVmxaRndpS1NBaFBTQW5jbVZoYkhScGJXVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCa2FXWm1PMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYVdkdWIzSmxJRDBnWm1Gc2MyVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHb2dQU0J6ZEdWd2N5NXNaVzVuZEdnZ0xTQXhPeUJxSUQ0Z2FXUjRPeUJxTFMwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYjNSb1pYSlRkR1Z3SUQwZ2MzUmxjSE5iYWwwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJRzkwYUdWeVZXNXBjWFZsU1dRZ1BTQm5aWFJWYm1seGRXVkpaRVp5YjIxVGRHVndLRzkwYUdWeVUzUmxjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIVnVhWEYxWlVsa0lEMDlQU0J2ZEdobGNsVnVhWEYxWlVsa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXUnBabVlwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JrYVdabUlEMGdLRzkwYUdWeVUzUmxjQzUwYVcxbFUzUmhiWEFnTFNCemRHVndMblJwYldWVGRHRnRjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV2R1YjNKbElEMGdJV2x6U1cxd2IzSjBZVzUwVTNSbGNDaHZkR2hsY2xOMFpYQXBJQ1ltSUdScFptWWdQQ0JwYlhCdmNuUmhiblJUZEdWd1RHVnVaM1JvTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHBjMGx1ZEdWeVlXTjBhWFpsVTNSbGNDaHZkR2hsY2xOMFpYQXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV2R1YjNKbElEMGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5VGEybHdXM1Z1YVhGMVpVbGtYU0E5SUdsbmJtOXlaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdWMlVuY21VZ2MydHBjSEJwYm1jZ2RHaHBjeUJsYkdWdFpXNTBYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kRzlUYTJsd1cyZGxkRlZ1YVhGMVpVbGtSbkp2YlZOMFpYQW9jM1JsY0NsZEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjblZ1VG1WNGRGTjBaWEFvYzJObGJtRnlhVzhzSUdsa2VDd2dkRzlUYTJsd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm1sdVpFVnNaVzFsYm5SWGFYUm9URzlqWVhSdmNpaHpZMlZ1WVhKcGJ5d2djM1JsY0N3Z2JHOWpZWFJ2Y2l3Z1oyVjBWR2x0Wlc5MWRDaHpZMlZ1WVhKcGJ5d2dhV1I0S1NrdWRHaGxiaWhtZFc1amRHbHZiaUFvWld4bGN5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHVnNaU0E5SUdWc1pYTmJNRjA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdkR0ZuVG1GdFpTQTlJR1ZzWlM1MFlXZE9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MzVndjRzl5ZEhOSmJuQjFkRVYyWlc1MElEMGdkR0ZuVG1GdFpTQTlQVDBnSjJsdWNIVjBKeUI4ZkNCMFlXZE9ZVzFsSUQwOVBTQW5kR1Y0ZEdGeVpXRW5JSHg4SUdWc1pTNW5aWFJCZEhSeWFXSjFkR1VvSjJOdmJuUmxiblJsWkdsMFlXSnNaU2NwTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWlhabGJuUnpMbWx1WkdWNFQyWW9jM1JsY0M1bGRtVnVkRTVoYldVcElENDlJREFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUc5d2RHbHZibk1nUFNCN2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBaWEF1WkdGMFlTNWlkWFIwYjI0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmNIUnBiMjV6TG5kb2FXTm9JRDBnYjNCMGFXOXVjeTVpZFhSMGIyNGdQU0J6ZEdWd0xtUmhkR0V1WW5WMGRHOXVPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1kyOXVjMjlzWlM1c2IyY29KMU5wYlhWc1lYUnBibWNnSnlBcklITjBaWEF1WlhabGJuUk9ZVzFsSUNzZ0p5QnZiaUJsYkdWdFpXNTBJQ2NzSUdWc1pTd2diRzlqWVhSdmNpNXpaV3hsWTNSdmNuTmJNRjBzSUZ3aUlHWnZjaUJ6ZEdWd0lGd2lJQ3NnYVdSNEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBaWEF1WlhabGJuUk9ZVzFsSUQwOUlDZGpiR2xqYXljcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBa0tHVnNaU2t1ZEhKcFoyZGxjaWduWTJ4cFkyc25LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDZ29jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKMlp2WTNWekp5QjhmQ0J6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuWW14MWNpY3BJQ1ltSUdWc1pWdHpkR1Z3TG1WMlpXNTBUbUZ0WlYwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVmJjM1JsY0M1bGRtVnVkRTVoYldWZEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdVMmx0ZFd4aGRHVmJjM1JsY0M1bGRtVnVkRTVoYldWZEtHVnNaU3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlITjBaWEF1WkdGMFlTNTJZV3gxWlNBaFBTQmNJblZ1WkdWbWFXNWxaRndpSUh4OElIUjVjR1Z2WmlCemRHVndMbVJoZEdFdVlYUjBjbWxpZFhSbGN5QWhQU0JjSW5WdVpHVm1hVzVsWkZ3aUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSFJ2UVhCd2JIa2dQU0J6ZEdWd0xtUmhkR0V1WVhSMGNtbGlkWFJsY3lBL0lITjBaWEF1WkdGMFlTNWhkSFJ5YVdKMWRHVnpJRG9nZXlCY0luWmhiSFZsWENJNklITjBaWEF1WkdGMFlTNTJZV3gxWlNCOU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUY4dVpYaDBaVzVrS0dWc1pTd2dkRzlCY0hCc2VTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0x5OGdSbTl5SUdKeWIzZHpaWEp6SUhSb1lYUWdjM1Z3Y0c5eWRDQjBhR1VnYVc1d2RYUWdaWFpsYm5RdVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjFjSEJ2Y25SelNXNXdkWFJGZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdVMmx0ZFd4aGRHVXVaWFpsYm5Rb1pXeGxMQ0FuYVc1d2RYUW5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdVdVpYWmxiblFvWld4bExDQW5ZMmhoYm1kbEp5azdJQzh2SUZSb2FYTWdjMmh2ZFd4a0lHSmxJR1pwY21Wa0lHRm1kR1Z5SUdFZ1lteDFjaUJsZG1WdWRDNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oydGxlWEJ5WlhOekp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhMlY1SUQwZ1UzUnlhVzVuTG1aeWIyMURhR0Z5UTI5a1pTaHpkR1Z3TG1SaGRHRXVhMlY1UTI5a1pTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZOcGJYVnNZWFJsTG10bGVXUnZkMjRvWld4bExDQnJaWGtwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNXJaWGx3Y21WemN5aGxiR1VzSUd0bGVTazdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pXeGxMblpoYkhWbElEMGdjM1JsY0M1a1lYUmhMblpoYkhWbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaUzVsZG1WdWRDaGxiR1VzSUNkamFHRnVaMlVuS1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaUzVyWlhsMWNDaGxiR1VzSUd0bGVTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkWEJ3YjNKMGMwbHVjSFYwUlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbVYyWlc1MEtHVnNaU3dnSjJsdWNIVjBKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2QyWVd4cFpHRjBaU2NnSmlZZ2RYUnRaUzV6ZEdGMFpTNXpaWFIwYVc1bmN5NW5aWFFvSjNabGNtSnZjMlVuS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5Z25WbUZzYVdSaGRHVTZJQ2NnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hzYjJOaGRHOXlMbk5sYkdWamRHOXljeWtnSUNzZ1hDSWdZMjl1ZEdGcGJuTWdkR1Y0ZENBblhDSWdJQ3NnYzNSbGNDNWtZWFJoTG5SbGVIUWdLeUJjSWlkY0lpazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGMFpTNWhkWFJ2VW5WdUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKMWJrNWxlSFJUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdzSUhSdlUydHBjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTd2dablZ1WTNScGIyNGdLSEpsYzNWc2RDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKM1poYkdsa1lYUmxKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lWbUZzYVdSaGRHVTZJRndpSUNzZ2NtVnpkV3gwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBiM0JUWTJWdVlYSnBieWhtWVd4elpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2FYTkpiWEJ2Y25SaGJuUlRkR1Z3S0hOMFpYQXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEVWeWNtOXlLRndpUm1GcGJHVmtJRzl1SUhOMFpYQTZJRndpSUNzZ2FXUjRJQ3NnWENJZ0lFVjJaVzUwT2lCY0lpQXJJSE4wWlhBdVpYWmxiblJPWVcxbElDc2dYQ0lnVW1WaGMyOXVPaUJjSWlBcklISmxjM1ZzZENrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wYjNCVFkyVnVZWEpwYnlobVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIVjBiV1V1YzNSaGRHVXVjMlYwZEdsdVozTXVaMlYwS0NkMlpYSmliM05sSnlrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0hKbGMzVnNkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGMFpTNWhkWFJ2VW5WdUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlZ4dVhHNW1kVzVqZEdsdmJpQjNZV2wwUm05eVFXNW5kV3hoY2loeWIyOTBVMlZzWldOMGIzSXBJSHRjYmlBZ0lDQjJZWElnWld3Z1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0hKdmIzUlRaV3hsWTNSdmNpazdYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUlDaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNnaGQybHVaRzkzTG1GdVozVnNZWElwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjJGdVozVnNZWElnWTI5MWJHUWdibTkwSUdKbElHWnZkVzVrSUc5dUlIUm9aU0IzYVc1a2IzY25LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaGhibWQxYkdGeUxtZGxkRlJsYzNSaFltbHNhWFI1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1lXNW5kV3hoY2k1blpYUlVaWE4wWVdKcGJHbDBlU2hsYkNrdWQyaGxibE4wWVdKc1pTaHlaWE52YkhabEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRmhibWQxYkdGeUxtVnNaVzFsYm5Rb1pXd3BMbWx1YW1WamRHOXlLQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZHliMjkwSUdWc1pXMWxiblFnS0NjZ0t5QnliMjkwVTJWc1pXTjBiM0lnS3lBbktTQm9ZWE1nYm04Z2FXNXFaV04wYjNJdUp5QXJYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQW5JSFJvYVhNZ2JXRjVJRzFsWVc0Z2FYUWdhWE1nYm05MElHbHVjMmxrWlNCdVp5MWhjSEF1SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHRnVaM1ZzWVhJdVpXeGxiV1Z1ZENobGJDa3VhVzVxWldOMGIzSW9LUzVuWlhRb0p5UmljbTkzYzJWeUp5a3VYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdibTkwYVdaNVYyaGxiazV2VDNWMGMzUmhibVJwYm1kU1pYRjFaWE4wY3loeVpYTnZiSFpsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCallYUmphQ0FvWlhKeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpXcGxZM1FvWlhKeUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHBPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnBjMGx0Y0c5eWRHRnVkRk4wWlhBb2MzUmxjQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWc1pXRjJaU2NnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObGIzVjBKeUFtSmx4dUlDQWdJQ0FnSUNBZ0lDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWbGJuUmxjaWNnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObGIzWmxjaWNnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMkpzZFhJbklDWW1YRzRnSUNBZ0lDQWdJQ0FnSUhOMFpYQXVaWFpsYm5ST1lXMWxJQ0U5SUNkbWIyTjFjeWM3WEc1OVhHNWNiaThxS2x4dUlDb2dVbVYwZFhKdWN5QjBjblZsSUdsbUlIUm9aU0JuYVhabGJpQnpkR1Z3SUdseklITnZiV1VnYzI5eWRDQnZaaUIxYzJWeUlHbHVkR1Z5WVdOMGFXOXVYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpTVzUwWlhKaFkzUnBkbVZUZEdWd0tITjBaWEFwSUh0Y2JpQWdJQ0IyWVhJZ1pYWjBJRDBnYzNSbGNDNWxkbVZ1ZEU1aGJXVTdYRzVjYmlBZ0lDQXZLbHh1SUNBZ0lDQWdJQzh2SUVsdWRHVnlaWE4wYVc1bklHNXZkR1VzSUdSdmFXNW5JSFJvWlNCbWIyeHNiM2RwYm1jZ2QyRnpJR05oZFhOcGJtY2dkR2hwY3lCbWRXNWpkR2x2YmlCMGJ5QnlaWFIxY200Z2RXNWtaV1pwYm1Wa0xseHVJQ0FnSUNBZ0lISmxkSFZ5Ymx4dUlDQWdJQ0FnSUNBZ0lDQmxkblF1YVc1a1pYaFBaaWhjSW0xdmRYTmxYQ0lwSUNFOVBTQXdJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1SbGVFOW1LRndpYlc5MWMyVmtiM2R1WENJcElEMDlQU0F3SUh4OFhHNGdJQ0FnSUNBZ0lDQWdJR1YyZEM1cGJtUmxlRTltS0Z3aWJXOTFjMlYxY0Z3aUtTQTlQVDBnTUR0Y2JseHVJQ0FnSUNBZ0lDOHZJRWwwY3lCaVpXTmhkWE5sSUhSb1pTQmpiMjVrYVhScGIyNXpJSGRsY21VZ2JtOTBJRzl1SUhSb1pTQnpZVzFsSUd4cGJtVWdZWE1nZEdobElISmxkSFZ5YmlCemRHRjBaVzFsYm5SY2JpQWdJQ0FxTDF4dUlDQWdJSEpsZEhWeWJpQmxkblF1YVc1a1pYaFBaaWhjSW0xdmRYTmxYQ0lwSUNFOVBTQXdJSHg4SUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWa2IzZHVYQ0lwSUQwOVBTQXdJSHg4SUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWMWNGd2lLU0E5UFQwZ01EdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1ptbHVaRVZzWlcxbGJuUlhhWFJvVEc5allYUnZjaWh6WTJWdVlYSnBieXdnYzNSbGNDd2diRzlqWVhSdmNpd2dkR2x0Wlc5MWRDd2dkR1Y0ZEZSdlEyaGxZMnNwSUh0Y2JpQWdJQ0IyWVhJZ2MzUmhjblJsWkR0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCbWRXNWpkR2x2YmlCMGNubEdhVzVrS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRnpkR0Z5ZEdWa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoY25SbFpDQTlJRzVsZHlCRVlYUmxLQ2t1WjJWMFZHbHRaU2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWld4bGN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm1iM1Z1WkZSdmIwMWhibmtnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJtYjNWdVpGWmhiR2xrSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWm05MWJtUkVhV1ptWlhKbGJuUlVaWGgwSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzJWc1pXTjBiM0p6Vkc5VVpYTjBJRDBnYkc5allYUnZjaTV6Wld4bFkzUnZjbk11YzJ4cFkyVW9NQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnZEdWNGRGUnZRMmhsWTJzZ1BTQnpkR1Z3TG1SaGRHRXVkR1Y0ZER0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCamIyMXdZWEpwYzI5dUlEMGdjM1JsY0M1a1lYUmhMbU52YlhCaGNtbHpiMjRnZkh3Z1hDSmxjWFZoYkhOY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGJHVmpkRzl5YzFSdlZHVnpkQzUxYm5Ob2FXWjBLQ2RiWkdGMFlTMTFibWx4ZFdVdGFXUTlYQ0luSUNzZ2JHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkNBcklDZGNJbDBuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzJWc1pXTjBiM0p6Vkc5VVpYTjBMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE5sYkdWamRHOXlJRDBnYzJWc1pXTjBiM0p6Vkc5VVpYTjBXMmxkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHBjMGx0Y0c5eWRHRnVkRk4wWlhBb2MzUmxjQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlZzWldOMGIzSWdLejBnWENJNmRtbHphV0pzWlZ3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxiR1Z6SUQwZ0pDaHpaV3hsWTNSdmNpazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWc1pYTXViR1Z1WjNSb0lEMDlJREVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUIwWlhoMFZHOURhR1ZqYXlBaFBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHNWxkMVJsZUhRZ1BTQWtLR1ZzWlhOYk1GMHBMblJsZUhRb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2dvWTI5dGNHRnlhWE52YmlBOVBUMGdKMlZ4ZFdGc2N5Y2dKaVlnYm1WM1ZHVjRkQ0E5UFQwZ2RHVjRkRlJ2UTJobFkyc3BJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0tHTnZiWEJoY21semIyNGdQVDA5SUNkamIyNTBZV2x1Y3ljZ0ppWWdibVYzVkdWNGRDNXBibVJsZUU5bUtIUmxlSFJVYjBOb1pXTnJLU0ErUFNBd0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtWbUZzYVdRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRVJwWm1abGNtVnVkRlJsZUhRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptOTFibVJXWVd4cFpDQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVnpMbUYwZEhJb0oyUmhkR0V0ZFc1cGNYVmxMV2xrSnl3Z2JHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR1ZzWlhNdWJHVnVaM1JvSUQ0Z01Ta2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRlJ2YjAxaGJua2dQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHWnZkVzVrVm1Gc2FXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOdmJIWmxLR1ZzWlhNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNocGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa2dKaVlnS0c1bGR5QkVZWFJsS0NrdVoyVjBWR2x0WlNncElDMGdjM1JoY25SbFpDa2dQQ0IwYVcxbGIzVjBJQ29nTlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dOVEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnY21WemRXeDBJRDBnWENKY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWm05MWJtUlViMjlOWVc1NUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMzVnNkQ0E5SUNkRGIzVnNaQ0J1YjNRZ1ptbHVaQ0JoY0hCeWIzQnlhV0YwWlNCbGJHVnRaVzUwSUdadmNpQnpaV3hsWTNSdmNuTTZJQ2NnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hzYjJOaGRHOXlMbk5sYkdWamRHOXljeWtnS3lCY0lpQm1iM0lnWlhabGJuUWdYQ0lnS3lCemRHVndMbVYyWlc1MFRtRnRaU0FySUZ3aUxpQWdVbVZoYzI5dU9pQkdiM1Z1WkNCVWIyOGdUV0Z1ZVNCRmJHVnRaVzUwYzF3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9abTkxYm1SRWFXWm1aWEpsYm5SVVpYaDBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjM1ZzZENBOUlDZERiM1ZzWkNCdWIzUWdabWx1WkNCaGNIQnliM0J5YVdGMFpTQmxiR1Z0Wlc1MElHWnZjaUJ6Wld4bFkzUnZjbk02SUNjZ0t5QktVMDlPTG5OMGNtbHVaMmxtZVNoc2IyTmhkRzl5TG5ObGJHVmpkRzl5Y3lrZ0t5QmNJaUJtYjNJZ1pYWmxiblFnWENJZ0t5QnpkR1Z3TG1WMlpXNTBUbUZ0WlNBcklGd2lMaUFnVW1WaGMyOXVPaUJVWlhoMElHUnZaWE51SjNRZ2JXRjBZMmd1SUNCY1hHNUZlSEJsWTNSbFpEcGNYRzVjSWlBcklIUmxlSFJVYjBOb1pXTnJJQ3NnWENKY1hHNWlkWFFnZDJGelhGeHVYQ0lnS3lCbGJHVnpMblJsZUhRb0tTQXJJRndpWEZ4dVhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemRXeDBJRDBnSjBOdmRXeGtJRzV2ZENCbWFXNWtJR0Z3Y0hKdmNISnBZWFJsSUdWc1pXMWxiblFnWm05eUlITmxiR1ZqZEc5eWN6b2dKeUFySUVwVFQwNHVjM1J5YVc1bmFXWjVLR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpLU0FySUZ3aUlHWnZjaUJsZG1WdWRDQmNJaUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnWENJdUlDQlNaV0Z6YjI0NklFNXZJR1ZzWlcxbGJuUnpJR1p2ZFc1a1hDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYW1WamRDaHlaWE4xYkhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdkbUZ5SUhOd1pXVmtJRDBnZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9YQ0p5ZFc1dVpYSXVjM0JsWldSY0lpazdYRzRnSUNBZ0lDQWdJSFpoY2lCc2FXMXBkQ0E5SUdsdGNHOXlkR0Z1ZEZOMFpYQk1aVzVuZEdnZ0x5QW9jM0JsWldRZ1BUMDlJQ2R5WldGc2RHbHRaU2NnUHlBbk1TY2dPaUJ6Y0dWbFpDazdYRzRnSUNBZ0lDQWdJR2xtSUNobmJHOWlZV3d1WVc1bmRXeGhjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkMkZwZEVadmNrRnVaM1ZzWVhJb0oxdHVaeTFoY0hCZEp5a3VkR2hsYmlobWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE53WldWa0lEMDlQU0FuY21WaGJIUnBiV1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFJVYVcxbGIzVjBLSFJ5ZVVacGJtUXNJSFJwYldWdmRYUXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE53WldWa0lEMDlQU0FuWm1GemRHVnpkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnllVVpwYm1Rb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dUV0YwYUM1dGFXNG9kR2x0Wlc5MWRDQXFJSE53WldWa0xDQnNhVzFwZENrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemNHVmxaQ0E5UFQwZ0ozSmxZV3gwYVcxbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvZEhKNVJtbHVaQ3dnZEdsdFpXOTFkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE53WldWa0lEMDlQU0FuWm1GemRHVnpkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGNubEdhVzVrS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvZEhKNVJtbHVaQ3dnVFdGMGFDNXRhVzRvZEdsdFpXOTFkQ0FxSUhOd1pXVmtMQ0JzYVcxcGRDa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHZGxkRlJwYldWdmRYUW9jMk5sYm1GeWFXOHNJR2xrZUNrZ2UxeHVJQ0FnSUdsbUlDaHBaSGdnUGlBd0tTQjdYRzRnSUNBZ0lDQWdJQzh2SUVsbUlIUm9aU0J3Y21WMmFXOTFjeUJ6ZEdWd0lHbHpJR0VnZG1Gc2FXUmhkR1VnYzNSbGNDd2dkR2hsYmlCcWRYTjBJRzF2ZG1VZ2IyNHNJR0Z1WkNCd2NtVjBaVzVrSUdsMElHbHpiaWQwSUhSb1pYSmxYRzRnSUNBZ0lDQWdJQzh2SUU5eUlHbG1JR2wwSUdseklHRWdjMlZ5YVdWeklHOW1JR3RsZVhNc0lIUm9aVzRnWjI5Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlQ0F0SURGZExtVjJaVzUwVG1GdFpTQTlQU0FuZG1Gc2FXUmhkR1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdNRHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJObGJtRnlhVzh1YzNSbGNITmJhV1I0WFM1MGFXMWxVM1JoYlhBZ0xTQnpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIZ2dMU0F4WFM1MGFXMWxVM1JoYlhBN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQXdPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBc0lIUnBiV1Z2ZFhRcElIdGNiaUFnSUNBdkx5Qk5ZV3RsSUhOMWNtVWdkMlVnWVhKbGJpZDBJR2R2YVc1bklIUnZJRzkyWlhKbWJHOTNJSFJvWlNCallXeHNJSE4wWVdOckxseHVJQ0FnSUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoelkyVnVZWEpwYnk1emRHVndjeTVzWlc1bmRHZ2dQaUFvYVdSNElDc2dNU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUNBcklERXNJSFJ2VTJ0cGNDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wYjNCVFkyVnVZWEpwYnloMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzSUhScGJXVnZkWFFnZkh3Z01DazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHWnlZV2R0Wlc1MFJuSnZiVk4wY21sdVp5aHpkSEpJVkUxTUtTQjdYRzRnSUNBZ2RtRnlJSFJsYlhBZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkMFpXMXdiR0YwWlNjcE8xeHVJQ0FnSUhSbGJYQXVhVzV1WlhKSVZFMU1JRDBnYzNSeVNGUk5URHRjYmlBZ0lDQXZMeUJqYjI1emIyeGxMbXh2WnloMFpXMXdMbWx1Ym1WeVNGUk5UQ2s3WEc0Z0lDQWdjbVYwZFhKdUlIUmxiWEF1WTI5dWRHVnVkQ0EvSUhSbGJYQXVZMjl1ZEdWdWRDQTZJSFJsYlhBN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnpkR1Z3SUNZbUlITjBaWEF1WkdGMFlTQW1KaUJ6ZEdWd0xtUmhkR0V1Ykc5allYUnZjaUFtSmlCemRHVndMbVJoZEdFdWJHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkR0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWm1sc2RHVnlSWGgwY21GTWIyRmtjeWh6ZEdWd2N5a2dlMXh1SUNCMllYSWdjbVZ6ZFd4MElEMGdXMTA3WEc0Z0lIWmhjaUJ6WldWdVRHOWhaQ0E5SUdaaGJITmxPMXh1SUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElITjBaWEJ6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ2RtRnlJR2x6VEc5aFpDQTlJSE4wWlhCelcybGRMbVYyWlc1MFRtRnRaU0E5UFQwZ0oyeHZZV1FuTzF4dUlDQWdJR2xtSUNnaGMyVmxia3h2WVdRZ2ZId2dJV2x6VEc5aFpDa2dlMXh1SUNBZ0lDQWdjbVZ6ZFd4MExuQjFjMmdvYzNSbGNITmJhVjBwTzF4dUlDQWdJQ0FnYzJWbGJreHZZV1FnUFNCelpXVnVURzloWkNCOGZDQnBjMHh2WVdRN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUhKbGRIVnliaUJ5WlhOMWJIUTdYRzU5TzF4dVhHNTJZWElnWjNWcFpDQTlJQ2htZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnWm5WdVkzUnBiMjRnY3pRb0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQk5ZWFJvTG1ac2IyOXlLQ2d4SUNzZ1RXRjBhQzV5WVc1a2IyMG9LU2tnS2lBd2VERXdNREF3S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdMblJ2VTNSeWFXNW5LREUyS1Z4dUlDQWdJQ0FnSUNBZ0lDQWdMbk4xWW5OMGNtbHVaeWd4S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE0wS0NrZ0t5QnpOQ2dwSUNzZ0p5MG5JQ3NnY3pRb0tTQXJJQ2N0SnlBcklITTBLQ2tnS3lBbkxTY2dLMXh1SUNBZ0lDQWdJQ0FnSUNBZ2N6UW9LU0FySUNjdEp5QXJJSE0wS0NrZ0t5QnpOQ2dwSUNzZ2N6UW9LVHRjYmlBZ0lDQjlPMXh1ZlNrb0tUdGNibHh1ZG1GeUlHeHBjM1JsYm1WeWN5QTlJRnRkTzF4dWRtRnlJSE4wWVhSbE8xeHVkbUZ5SUhWMGJXVWdQU0I3WEc0Z0lDQWdhVzVwZERvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2MyTmxibUZ5YVc4Z1BTQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9KM1YwYldWZmMyTmxibUZ5YVc4bktUdGNiaUFnSUNBZ0lDQWdhV1lnS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lDQWdiRzlqWVd4VGRHOXlZV2RsTG1Oc1pXRnlLQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCMWRHMWxMbk4wWVhSbElEMGdkWFJ0WlM1c2IyRmtVM1JoZEdWR2NtOXRVM1J2Y21GblpTZ3BPMXh1SUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25TVTVKVkVsQlRFbGFSVVFuS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzVzYjJGa1UyVjBkR2x1WjNNb0tTNTBhR1Z1S0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1MFpYTjBVMlZ5ZG1WeUlEMGdaMlYwVUdGeVlXMWxkR1Z5UW5sT1lXMWxLRndpZFhSdFpWOTBaWE4wWDNObGNuWmxjbHdpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVZWFYwYjFKMWJpQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjblZ1VTJObGJtRnlhVzhvYzJObGJtRnlhVzhwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3dnTVRBd0tUdGNiaUFnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExuTjBZWFIxY3lBOVBUMGdYQ0pRVEVGWlNVNUhYQ0lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY25WdVRtVjRkRk4wWlhBb2MzUmhkR1V1Y25WdUxuTmpaVzVoY21sdkxDQnpkR0YwWlM1eWRXNHVjM1JsY0VsdVpHVjRLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9JWE4wWVhSbExuTjBZWFIxY3lCOGZDQnpkR0YwWlM1emRHRjBkWE1nUFQwOUlDZEpUa2xVU1VGTVNWcEpUa2NuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJRndpVEU5QlJFVkVYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1luSnZZV1JqWVhOME9pQm1kVzVqZEdsdmJpQW9aWFowTENCbGRuUkVZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hzYVhOMFpXNWxjbk1nSmlZZ2JHbHpkR1Z1WlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCc2FYTjBaVzVsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYVhOMFpXNWxjbk5iYVYwb1pYWjBMQ0JsZG5SRVlYUmhLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2MzUmhjblJTWldOdmNtUnBibWM2SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hOMFlYUmxMbk4wWVhSMWN5QWhQU0FuVWtWRFQxSkVTVTVISnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjM1JoZEhWeklEMGdKMUpGUTA5U1JFbE9SeWM3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHVndjeUE5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29YQ0pTWldOdmNtUnBibWNnVTNSaGNuUmxaRndpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZFNSVU5QVWtSSlRrZGZVMVJCVWxSRlJDY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtGd2liRzloWkZ3aUxDQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEpzT2lCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEJ5YjNSdlkyOXNPaUIzYVc1a2IzY3ViRzlqWVhScGIyNHVjSEp2ZEc5amIyd3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdodmMzUTZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9iM04wTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaV0Z5WTJnNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1elpXRnlZMmdzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHaGhjMmc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTVvWVhOb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ2NuVnVVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h1WVcxbExDQmpiMjVtYVdjcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhSdlVuVnVJRDBnYm1GdFpTQjhmQ0J3Y205dGNIUW9KMU5qWlc1aGNtbHZJSFJ2SUhKMWJpY3BPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1lYVjBiMUoxYmlBOUlDRnVZVzFsSUQ4Z2NISnZiWEIwS0NkWGIzVnNaQ0I1YjNVZ2JHbHJaU0IwYnlCemRHVndJSFJvY205MVoyZ2daV0ZqYUNCemRHVndJQ2g1Zkc0cFB5Y3BJQ0U5SUNkNUp5QTZJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCblpYUlRZMlZ1WVhKcGJ5aDBiMUoxYmlrdWRHaGxiaWhtZFc1amRHbHZiaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5qWlc1aGNtbHZJRDBnU2xOUFRpNXdZWEp6WlNoS1UwOU9Mbk4wY21sdVoybG1lU2h6WTJWdVlYSnBieWtwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlYwZFhCRGIyNWthWFJwYjI1ektITmpaVzVoY21sdktTNTBhR1Z1S0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1eWRXNGdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzVoZFhSdlVuVnVJRDBnWVhWMGIxSjFiaUE5UFQwZ2RISjFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTNXpkR0YwZFhNZ1BTQmNJbEJNUVZsSlRrZGNJanRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOalpXNWhjbWx2TG5OMFpYQnpJRDBnWm1sc2RHVnlSWGgwY21GTWIyRmtjeWh6WTJWdVlYSnBieTV6ZEdWd2N5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6ZEdGMFpTNXpaWFIwYVc1bmN5NW5aWFFvWENKMlpYSmliM05sWENJcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE4wWVhKMGFXNW5JRk5qWlc1aGNtbHZJQ2RjSWlBcklHNWhiV1VnS3lCY0lpZGNJaXdnYzJObGJtRnlhVzhwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkUVRFRlpRa0ZEUzE5VFZFRlNWRVZFSnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVUZEdWd0tITmpaVzVoY21sdkxDQXdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEoxYms1bGVIUlRkR1Z3T2lCeWRXNU9aWGgwVTNSbGNDeGNiaUFnSUNCemRHOXdVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h6ZFdOalpYTnpLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpZMlZ1WVhKcGJ5QTlJSE4wWVhSbExuSjFiaUFtSmlCemRHRjBaUzV5ZFc0dWMyTmxibUZ5YVc4N1hHNGdJQ0FnSUNBZ0lHUmxiR1YwWlNCemRHRjBaUzV5ZFc0N1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUZ3aVRFOUJSRVZFWENJN1hHNGdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkUVRFRlpRa0ZEUzE5VFZFOVFVRVZFSnlrN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVXVjM1JoZEdVdWMyVjBkR2x1WjNNdVoyVjBLRndpZG1WeVltOXpaVndpS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lVM1J2Y0hCcGJtY2dVMk5sYm1GeWFXOWNJaWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNWalkyVnpjeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFUzVmpZMlZ6Y3loY0lsdFRWVU5EUlZOVFhTQlRZMlZ1WVhKcGJ5QW5YQ0lnS3lCelkyVnVZWEpwYnk1dVlXMWxJQ3NnWENJbklFTnZiWEJzWlhSbFpDRmNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUzUnZjSEJwYm1jZ2IyNGdjR0ZuWlNCY0lpQXJJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9jbVZtS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbkpsY0c5eWRFVnljbTl5S0Z3aVcwWkJTVXhWVWtWZElGTmpaVzVoY21sdklDZGNJaUFySUhOalpXNWhjbWx2TG01aGJXVWdLeUJjSWljZ1UzUnZjSEJsWkNGY0lpazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dRM0psWVhSbGN5QmhJSFJsYlhCdmNtRnllU0JsYkdWdFpXNTBJR3h2WTJGMGIzSXNJR1p2Y2lCMWMyVWdkMmwwYUNCbWFXNWhiR2w2WlV4dlkyRjBiM0pjYmlBZ0lDQWdLaTljYmlBZ0lDQmpjbVZoZEdWRmJHVnRaVzUwVEc5allYUnZjam9nWm5WdVkzUnBiMjRnS0dWc1pXMWxiblFwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFZ1YVhGMVpVbGtJRDBnWld4bGJXVnVkQzVuWlhSQmRIUnlhV0oxZEdVb1hDSmtZWFJoTFhWdWFYRjFaUzFwWkZ3aUtTQjhmQ0JuZFdsa0tDazdYRzRnSUNBZ0lDQWdJR1ZzWlcxbGJuUXVjMlYwUVhSMGNtbGlkWFJsS0Z3aVpHRjBZUzExYm1seGRXVXRhV1JjSWl3Z2RXNXBjWFZsU1dRcE8xeHVYRzRnSUNBZ0lDQWdJSFpoY2lCbGJHVklkRzFzSUQwZ1pXeGxiV1Z1ZEM1amJHOXVaVTV2WkdVb0tTNXZkWFJsY2toVVRVdzdYRzRnSUNBZ0lDQWdJSFpoY2lCbGJHVlRaV3hsWTNSdmNuTWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR1ZzWlcxbGJuUXVkR0ZuVG1GdFpTNTBiMVZ3Y0dWeVEyRnpaU2dwSUQwOUlDZENUMFJaSnlCOGZDQmxiR1Z0Wlc1MExuUmhaMDVoYldVdWRHOVZjSEJsY2tOaGMyVW9LU0E5UFNBblNGUk5UQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1ZzWlZObGJHVmpkRzl5Y3lBOUlGdGxiR1Z0Wlc1MExuUmhaMDVoYldWZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWld4bFUyVnNaV04wYjNKeklEMGdjMlZzWldOMGIzSkdhVzVrWlhJb1pXeGxiV1Z1ZEN3Z1pHOWpkVzFsYm5RdVltOWtlU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ1YVhGMVpVbGtPaUIxYm1seGRXVkpaQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lITmxiR1ZqZEc5eWN6b2daV3hsVTJWc1pXTjBiM0p6WEc0Z0lDQWdJQ0FnSUgwN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhKbFoybHpkR1Z5UlhabGJuUTZJR1oxYm1OMGFXOXVJQ2hsZG1WdWRFNWhiV1VzSUdSaGRHRXNJR2xrZUNrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUh4OElIVjBiV1V1YVhOV1lXeHBaR0YwYVc1bktDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdhV1I0SUQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdSNElEMGdkWFJ0WlM1emRHRjBaUzV6ZEdWd2N5NXNaVzVuZEdnN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHVndjMXRwWkhoZElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1YyWlc1MFRtRnRaVG9nWlhabGJuUk9ZVzFsTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhScGJXVlRkR0Z0Y0RvZ2JtVjNJRVJoZEdVb0tTNW5aWFJVYVcxbEtDa3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaR0YwWVRvZ1pHRjBZVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RGVmtWT1ZGOVNSVWRKVTFSRlVrVkVKeWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSEpsY0c5eWRFeHZaem9nWm5WdVkzUnBiMjRnS0d4dlp5d2djMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tISmxjRzl5ZEVoaGJtUnNaWEp6SUNZbUlISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J5WlhCdmNuUklZVzVrYkdWeWN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGNHOXlkRWhoYm1Sc1pYSnpXMmxkTG14dlp5aHNiMmNzSUhOalpXNWhjbWx2TENCMWRHMWxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2NtVndiM0owUlhKeWIzSTZJR1oxYm1OMGFXOXVJQ2hsY25KdmNpd2djMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tISmxjRzl5ZEVoaGJtUnNaWEp6SUNZbUlISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J5WlhCdmNuUklZVzVrYkdWeWN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGNHOXlkRWhoYm1Sc1pYSnpXMmxkTG1WeWNtOXlLR1Z5Y205eUxDQnpZMlZ1WVhKcGJ5d2dkWFJ0WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSEpsY0c5eWRGTjFZMk5sYzNNNklHWjFibU4wYVc5dUlDaHRaWE56WVdkbExDQnpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NtVndiM0owU0dGdVpHeGxjbk1nSmlZZ2NtVndiM0owU0dGdVpHeGxjbk11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21Wd2IzSjBTR0Z1Wkd4bGNuTmJhVjB1YzNWalkyVnpjeWh0WlhOellXZGxMQ0J6WTJWdVlYSnBieXdnZFhSdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhKbFoybHpkR1Z5VEdsemRHVnVaWEk2SUdaMWJtTjBhVzl1SUNob1lXNWtiR1Z5S1NCN1hHNGdJQ0FnSUNBZ0lHeHBjM1JsYm1WeWN5NXdkWE5vS0doaGJtUnNaWElwTzF4dUlDQWdJSDBzWEc0Z0lDQWdjbVZuYVhOMFpYSlRZWFpsU0dGdVpHeGxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2MyRjJaVWhoYm1Sc1pYSnpMbkIxYzJnb2FHRnVaR3hsY2lrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0J5WldkcGMzUmxjbEpsY0c5eWRFaGhibVJzWlhJNklHWjFibU4wYVc5dUlDaG9ZVzVrYkdWeUtTQjdYRzRnSUNBZ0lDQWdJSEpsY0c5eWRFaGhibVJzWlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV2RwYzNSbGNreHZZV1JJWVc1a2JHVnlPaUJtZFc1amRHbHZiaUFvYUdGdVpHeGxjaWtnZTF4dUlDQWdJQ0FnSUNCc2IyRmtTR0Z1Wkd4bGNuTXVjSFZ6YUNob1lXNWtiR1Z5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlVMlYwZEdsdVozTk1iMkZrU0dGdVpHeGxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2MyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNuTXVjSFZ6YUNob1lXNWtiR1Z5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2x6VW1WamIzSmthVzVuT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIVjBiV1V1YzNSaGRHVXVjM1JoZEhWekxtbHVaR1Y0VDJZb1hDSlNSVU5QVWtSSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCcGMxQnNZWGxwYm1jNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkWFJ0WlM1emRHRjBaUzV6ZEdGMGRYTXVhVzVrWlhoUFppaGNJbEJNUVZsSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCcGMxWmhiR2xrWVhScGJtYzZJR1oxYm1OMGFXOXVLSFpoYkdsa1lYUnBibWNwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQjJZV3hwWkdGMGFXNW5JQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QW1KaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUh4OElIVjBiV1V1YVhOV1lXeHBaR0YwYVc1bktDa3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5OMFlYUmxMbk4wWVhSMWN5QTlJSFpoYkdsa1lYUnBibWNnUHlCY0lsWkJURWxFUVZSSlRrZGNJaUE2SUZ3aVVrVkRUMUpFU1U1SFhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbUp5YjJGa1kyRnpkQ2duVmtGTVNVUkJWRWxQVGw5RFNFRk9SMFZFSnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIVjBiV1V1YzNSaGRHVXVjM1JoZEhWekxtbHVaR1Y0VDJZb1hDSldRVXhKUkVGVVNVNUhYQ0lwSUQwOVBTQXdPMXh1SUNBZ0lIMHNYRzRnSUNBZ2MzUnZjRkpsWTI5eVpHbHVaem9nWm5WdVkzUnBiMjRnS0dsdVptOHBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHVabThnSVQwOUlHWmhiSE5sS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNVMk5sYm1GeWFXOGdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSbGNITTZJSE4wWVhSbExuTjBaWEJ6WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQmZMbVY0ZEdWdVpDaHVaWGRUWTJWdVlYSnBieXdnYVc1bWJ5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doYm1WM1UyTmxibUZ5YVc4dWJtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc1bGQxTmpaVzVoY21sdkxtNWhiV1VnUFNCd2NtOXRjSFFvSjBWdWRHVnlJSE5qWlc1aGNtbHZJRzVoYldVbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHNWxkMU5qWlc1aGNtbHZMbTVoYldVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1elkyVnVZWEpwYjNNdWNIVnphQ2h1WlhkVFkyVnVZWEpwYnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzJGMlpVaGhibVJzWlhKeklDWW1JSE5oZG1WSVlXNWtiR1Z5Y3k1c1pXNW5kR2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J6WVhabFNHRnVaR3hsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5oZG1WSVlXNWtiR1Z5YzF0cFhTaHVaWGRUWTJWdVlYSnBieXdnZFhSdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHRjBkWE1nUFNBblRFOUJSRVZFSnp0Y2JseHVJQ0FnSUNBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblVrVkRUMUpFU1U1SFgxTlVUMUJRUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbEpsWTI5eVpHbHVaeUJUZEc5d2NHVmtYQ0lzSUc1bGQxTmpaVzVoY21sdktUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JHOWhaRk5sZEhScGJtZHpPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6WlhSMGFXNW5jeUE5SUhWMGJXVXVjM1JoZEdVdWMyVjBkR2x1WjNNZ1BTQjFkRzFsTG5OMFlYUmxMbk5sZEhScGJtZHpJSHg4SUc1bGR5QlRaWFIwYVc1bmN5aDdYRzRnSUNBZ0lDQWdJQ0FnWENKeWRXNXVaWEl1YzNCbFpXUmNJam9nWENJeE1Gd2lYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCcFppQW9jMlYwZEdsdVozTk1iMkZrU0dGdVpHeGxjbk11YkdWdVozUm9JRDRnTUNBbUppQWhkWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BJQ1ltSUNGMWRHMWxMbWx6VUd4aGVXbHVaeWdwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRIUnBibWR6VEc5aFpFaGhibVJzWlhKeld6QmRLR1oxYm1OMGFXOXVJQ2h5WlhOd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRIUnBibWR6TG5ObGRFUmxabUYxYkhSektISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtITmxkSFJwYm1kektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9jMlYwZEdsdVozTXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0hObGRIUnBibWR6S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNWNiaUFnSUNCc2IyRmtVM1JoZEdWR2NtOXRVM1J2Y21GblpUb2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkWFJ0WlZOMFlYUmxVM1J5SUQwZ2JHOWpZV3hUZEc5eVlXZGxMbWRsZEVsMFpXMG9KM1YwYldVbktUdGNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVlRkR0YwWlZOMGNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCS1UwOU9MbkJoY25ObEtIVjBiV1ZUZEdGMFpWTjBjaWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHRjBaUzV6WlhSMGFXNW5jeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnVaWGRUWlhSMGFXNW5jeUE5SUc1bGR5QlRaWFIwYVc1bmN5Z3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzVsZDFObGRIUnBibWR6TG5ObGRIUnBibWR6SUQwZ2MzUmhkR1V1YzJWMGRHbHVaM011YzJWMGRHbHVaM003WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYm1WM1UyVjBkR2x1WjNNdWMyVjBkR2x1WjNNZ1BTQnpkR0YwWlM1elpYUjBhVzVuY3k1a1pXWmhkV3gwVTJWMGRHbHVaM003WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjMlYwZEdsdVozTWdQU0J1WlhkVFpYUjBhVzVuY3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFIxY3pvZ1hDSkpUa2xVU1VGTVNWcEpUa2RjSWl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelkyVnVZWEpwYjNNNklGdGRYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpkR0YwWlR0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYzJGMlpWTjBZWFJsVkc5VGRHOXlZV2RsT2lCbWRXNWpkR2x2YmlBb2RYUnRaVk4wWVhSbEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoMWRHMWxVM1JoZEdVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUd4dlkyRnNVM1J2Y21GblpTNXpaWFJKZEdWdEtDZDFkRzFsSnl3Z1NsTlBUaTV6ZEhKcGJtZHBabmtvZFhSdFpWTjBZWFJsS1NrN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JzYjJOaGJGTjBiM0poWjJVdWNtVnRiM1psU1hSbGJTZ25kWFJ0WlNjcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lIVnViRzloWkRvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0IxZEcxbExuTmhkbVZUZEdGMFpWUnZVM1J2Y21GblpTaHpkR0YwWlNrN1hHNGdJQ0FnZlZ4dWZUdGNibHh1Wm5WdVkzUnBiMjRnZEc5bloyeGxTR2xuYUd4cFoyaDBLR1ZzWlN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0FrS0dWc1pTa3VkRzluWjJ4bFEyeGhjM01vSjNWMGJXVXRkbVZ5YVdaNUp5d2dkbUZzZFdVcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCMGIyZG5iR1ZTWldGa2VTaGxiR1VzSUhaaGJIVmxLU0I3WEc0Z0lDQWdKQ2hsYkdVcExuUnZaMmRzWlVOc1lYTnpLQ2QxZEcxbExYSmxZV1I1Snl3Z2RtRnNkV1VwTzF4dWZWeHVYRzR2S2lwY2JpQXFJRWxtSUhsdmRTQmpiR2xqYXlCdmJpQmhJSE53WVc0Z2FXNGdZU0JzWVdKbGJDd2dkR2hsSUhOd1lXNGdkMmxzYkNCamJHbGpheXhjYmlBcUlIUm9aVzRnZEdobElHSnliM2R6WlhJZ2QybHNiQ0JtYVhKbElIUm9aU0JqYkdsamF5QmxkbVZ1ZENCbWIzSWdkR2hsSUdsdWNIVjBJR052Ym5SaGFXNWxaQ0IzYVhSb2FXNGdkR2hsSUhOd1lXNHNYRzRnS2lCVGJ5d2dkMlVnYjI1c2VTQjNZVzUwSUhSdklIUnlZV05ySUhSb1pTQnBibkIxZENCamJHbGphM011WEc0Z0tpOWNibVoxYm1OMGFXOXVJR2x6VG05MFNXNU1ZV0psYkU5eVZtRnNhV1FvWld4bEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUNRb1pXeGxLUzV3WVhKbGJuUnpLQ2RzWVdKbGJDY3BMbXhsYm1kMGFDQTlQU0F3SUh4OFhHNGdJQ0FnSUNBZ0lDQWdaV3hsTG01dlpHVk9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDa2dQVDBnSjJsdWNIVjBKenRjYm4xY2JseHVMeW9xWEc0Z0tpQlNaWFIxY201eklIUnlkV1VnYVdZZ2FYUWdhWE1nWVc0Z1pXeGxiV1Z1ZENCMGFHRjBJSE5vYjNWc1pDQmlaU0JwWjI1dmNtVmtYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpTV2R1YjNKbFpFVnNaVzFsYm5Rb1pXeGxLU0I3WEc0Z0lISmxkSFZ5YmlBaFpXeGxMbWhoYzBGMGRISnBZblYwWlNCOGZDQmxiR1V1YUdGelFYUjBjbWxpZFhSbEtDZGtZWFJoTFdsbmJtOXlaU2NwSUh4OElDUW9aV3hsS1M1d1lYSmxiblJ6S0Z3aVcyUmhkR0V0YVdkdWIzSmxYVndpS1M1c1pXNW5kR2dnUGlBd08xeHVmVnh1WEc0dktpcGNiaUFxSUZKbGRIVnlibk1nZEhKMVpTQnBaaUIwYUdVZ1oybDJaVzRnWlhabGJuUWdjMmh2ZFd4a0lHSmxJSEpsWTI5eVpHVmtJRzl1SUhSb1pTQm5hWFpsYmlCbGJHVnRaVzUwWEc0Z0tpOWNibVoxYm1OMGFXOXVJSE5vYjNWc1pGSmxZMjl5WkVWMlpXNTBLR1ZzWlN3Z1pYWjBLU0I3WEc0Z0lIWmhjaUJ6WlhSMGFXNW5JRDBnZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9YQ0p5WldOdmNtUmxjaTVsZG1WdWRITXVYQ0lnS3lCbGRuUXBPMXh1SUNCMllYSWdhWE5UWlhSMGFXNW5WSEoxWlNBOUlDaHpaWFIwYVc1bklEMDlQU0IwY25WbElIeDhJSE5sZEhScGJtY2dQVDA5SUNkMGNuVmxKeUI4ZkNCMGVYQmxiMllnYzJWMGRHbHVaeUE5UFQwZ0ozVnVaR1ZtYVc1bFpDY3BPMXh1SUNCeVpYUjFjbTRnZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUNZbUlHbHpVMlYwZEdsdVoxUnlkV1VnSmlZZ2FYTk9iM1JKYmt4aFltVnNUM0pXWVd4cFpDaGxiR1VwTzF4dWZWeHVYRzUyWVhJZ2RHbHRaWEp6SUQwZ1cxMDdYRzVjYm1aMWJtTjBhVzl1SUdsdWFYUkZkbVZ1ZEVoaGJtUnNaWEp6S0NrZ2UxeHVYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQmxkbVZ1ZEhNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnWkc5amRXMWxiblF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWhsZG1WdWRITmJhVjBzSUNobWRXNWpkR2x2YmlBb1pYWjBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYUdGdVpHeGxjaUE5SUdaMWJtTjBhVzl1SUNobEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dVdWFYTlVjbWxuWjJWeUtWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXbHpTV2R1YjNKbFpFVnNaVzFsYm5Rb1pTNTBZWEpuWlhRcElDWW1JSFYwYldVdWFYTlNaV052Y21ScGJtY29LU2tnZTF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHbGtlQ0E5SUhWMGJXVXVjM1JoZEdVdWMzUmxjSE11YkdWdVozUm9PMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJoY21keklEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiRzlqWVhSdmNqb2dkWFJ0WlM1amNtVmhkR1ZGYkdWdFpXNTBURzlqWVhSdmNpaGxMblJoY21kbGRDbGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQjBhVzFsY2p0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaGxkblFnUFQwZ0oyMXZkWE5sYjNabGNpY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5bloyeGxTR2xuYUd4cFoyaDBLR1V1ZEdGeVoyVjBMQ0IwY25WbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2x0WlhKekxuQjFjMmdvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaV3hsYldWdWREb2daUzUwWVhKblpYUXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFXMWxjam9nYzJWMFZHbHRaVzkxZENobWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzluWjJ4bFVtVmhaSGtvWlM1MFlYSm5aWFFzSUhSeWRXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN3Z05UQXdLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1pYWjBJRDA5SUNkdGIzVnpaVzkxZENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0IwYVcxbGNuTXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGFXMWxjbk5iYVYwdVpXeGxiV1Z1ZENBOVBTQmxMblJoY21kbGRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05zWldGeVZHbHRaVzkxZENoMGFXMWxjbk5iYVYwdWRHbHRaWElwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhScGJXVnljeTV6Y0d4cFkyVW9hU3dnTVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5bloyeGxTR2xuYUd4cFoyaDBLR1V1ZEdGeVoyVjBMQ0JtWVd4elpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pWSmxZV1I1S0dVdWRHRnlaMlYwTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOb2IzVnNaRkpsWTI5eVpFVjJaVzUwS0dVdWRHRnlaMlYwTENCbGRuUXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1pTNTNhR2xqYUNCOGZDQmxMbUoxZEhSdmJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JoY21kekxtSjFkSFJ2YmlBOUlHVXVkMmhwWTJnZ2ZId2daUzVpZFhSMGIyNDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNobGRuUWdQVDBnSjJOb1lXNW5aU2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1lYSm5jeTVoZEhSeWFXSjFkR1Z6SUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRndpZG1Gc2RXVmNJaUE2SUdVdWRHRnlaMlYwTG5aaGJIVmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZ3aVkyaGxZMnRsWkZ3aU9pQmxMblJoY21kbGRDNWphR1ZqYTJWa0xGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRndpYzJWc1pXTjBaV1JjSWpvZ1pTNTBZWEpuWlhRdWMyVnNaV04wWldSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eVpXZHBjM1JsY2tWMlpXNTBLR1YyZEN3Z1lYSm5jeXdnYVdSNEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QklRVU5MSUdadmNpQjBaWE4wYVc1blhHNGdJQ0FnSUNBZ0lDQWdJQ0FvZFhSdFpTNWxkbVZ1ZEV4cGMzUmxibVZ5Y3lBOUlIVjBiV1V1WlhabGJuUk1hWE4wWlc1bGNuTWdmSHdnZTMwcFcyVjJkRjBnUFNCb1lXNWtiR1Z5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHaGhibVJzWlhJN1hHNGdJQ0FnSUNBZ0lIMHBLR1YyWlc1MGMxdHBYU2tzSUhSeWRXVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lIWmhjaUJmZEc5ZllYTmphV2tnUFNCN1hHNGdJQ0FnSUNBZ0lDY3hPRGduT2lBbk5EUW5MRnh1SUNBZ0lDQWdJQ0FuTVRnNUp6b2dKelExSnl4Y2JpQWdJQ0FnSUNBZ0p6RTVNQ2M2SUNjME5pY3NYRzRnSUNBZ0lDQWdJQ2N4T1RFbk9pQW5ORGNuTEZ4dUlDQWdJQ0FnSUNBbk1Ua3lKem9nSnprMkp5eGNiaUFnSUNBZ0lDQWdKekl5TUNjNklDYzVNaWNzWEc0Z0lDQWdJQ0FnSUNjeU1qSW5PaUFuTXprbkxGeHVJQ0FnSUNBZ0lDQW5Nakl4SnpvZ0p6a3pKeXhjYmlBZ0lDQWdJQ0FnSnpJeE9TYzZJQ2M1TVNjc1hHNGdJQ0FnSUNBZ0lDY3hOek1uT2lBbk5EVW5MRnh1SUNBZ0lDQWdJQ0FuTVRnM0p6b2dKell4Snl3Z0x5OUpSU0JMWlhrZ1kyOWtaWE5jYmlBZ0lDQWdJQ0FnSnpFNE5pYzZJQ2MxT1NkY2JpQWdJQ0I5TzF4dVhHNGdJQ0FnZG1GeUlITm9hV1owVlhCeklEMGdlMXh1SUNBZ0lDQWdJQ0JjSWprMlhDSTZJRndpZmx3aUxGeHVJQ0FnSUNBZ0lDQmNJalE1WENJNklGd2lJVndpTEZ4dUlDQWdJQ0FnSUNCY0lqVXdYQ0k2SUZ3aVFGd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVeFhDSTZJRndpSTF3aUxGeHVJQ0FnSUNBZ0lDQmNJalV5WENJNklGd2lKRndpTEZ4dUlDQWdJQ0FnSUNCY0lqVXpYQ0k2SUZ3aUpWd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVMFhDSTZJRndpWGx3aUxGeHVJQ0FnSUNBZ0lDQmNJalUxWENJNklGd2lKbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqVTJYQ0k2SUZ3aUtsd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVM1hDSTZJRndpS0Z3aUxGeHVJQ0FnSUNBZ0lDQmNJalE0WENJNklGd2lLVndpTEZ4dUlDQWdJQ0FnSUNCY0lqUTFYQ0k2SUZ3aVgxd2lMRnh1SUNBZ0lDQWdJQ0JjSWpZeFhDSTZJRndpSzF3aUxGeHVJQ0FnSUNBZ0lDQmNJamt4WENJNklGd2llMXdpTEZ4dUlDQWdJQ0FnSUNCY0lqa3pYQ0k2SUZ3aWZWd2lMRnh1SUNBZ0lDQWdJQ0JjSWpreVhDSTZJRndpZkZ3aUxGeHVJQ0FnSUNBZ0lDQmNJalU1WENJNklGd2lPbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqTTVYQ0k2SUZ3aVhGeGNJbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqUTBYQ0k2SUZ3aVBGd2lMRnh1SUNBZ0lDQWdJQ0JjSWpRMlhDSTZJRndpUGx3aUxGeHVJQ0FnSUNBZ0lDQmNJalEzWENJNklGd2lQMXdpWEc0Z0lDQWdmVHRjYmx4dUlDQWdJR1oxYm1OMGFXOXVJR3RsZVZCeVpYTnpTR0Z1Wkd4bGNpQW9aU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9aUzVwYzFSeWFXZG5aWElwWEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0NGcGMwbG5ibTl5WldSRmJHVnRaVzUwS0dVdWRHRnlaMlYwS1NBbUppQnphRzkxYkdSU1pXTnZjbVJGZG1WdWRDaGxMblJoY21kbGRDd2dYQ0pyWlhsd2NtVnpjMXdpS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHTWdQU0JsTG5kb2FXTm9PMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJVVDBSUE9pQkViMlZ6YmlkMElIZHZjbXNnZDJsMGFDQmpZWEJ6SUd4dlkydGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dmJtOXliV0ZzYVhwbElHdGxlVU52WkdWY2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoZmRHOWZZWE5qYVdrdWFHRnpUM2R1VUhKdmNHVnlkSGtvWXlrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpJRDBnWDNSdlgyRnpZMmxwVzJOZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXVXVjMmhwWm5STFpYa2dKaVlnS0dNZ1BqMGdOalVnSmlZZ1l5QThQU0E1TUNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpJRDBnVTNSeWFXNW5MbVp5YjIxRGFHRnlRMjlrWlNoaklDc2dNeklwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hsTG5Ob2FXWjBTMlY1SUNZbUlITm9hV1owVlhCekxtaGhjMDkzYmxCeWIzQmxjblI1S0dNcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdMeTluWlhRZ2MyaHBablJsWkNCclpYbERiMlJsSUhaaGJIVmxYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZeUE5SUhOb2FXWjBWWEJ6VzJOZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqSUQwZ1UzUnlhVzVuTG1aeWIyMURhR0Z5UTI5a1pTaGpLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtDZHJaWGx3Y21WemN5Y3NJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYjJOaGRHOXlPaUIxZEcxbExtTnlaV0YwWlVWc1pXMWxiblJNYjJOaGRHOXlLR1V1ZEdGeVoyVjBLU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JyWlhrNklHTXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjSEpsZGxaaGJIVmxPaUJsTG5SaGNtZGxkQzUyWVd4MVpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZV3gxWlRvZ1pTNTBZWEpuWlhRdWRtRnNkV1VnS3lCakxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHdGxlVU52WkdVNklHVXVhMlY1UTI5a1pWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCa2IyTjFiV1Z1ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkclpYbHdjbVZ6Y3ljc0lHdGxlVkJ5WlhOelNHRnVaR3hsY2l3Z2RISjFaU2s3WEc1Y2JpQWdJQ0F2THlCSVFVTkxJR1p2Y2lCMFpYTjBhVzVuWEc0Z0lDQWdLSFYwYldVdVpYWmxiblJNYVhOMFpXNWxjbk1nUFNCMWRHMWxMbVYyWlc1MFRHbHpkR1Z1WlhKeklIeDhJSHQ5S1ZzbmEyVjVjSEpsYzNNblhTQTlJR3RsZVZCeVpYTnpTR0Z1Wkd4bGNqdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVR0Z5WVcxbGRHVnlRbmxPWVcxbEtHNWhiV1VwSUh0Y2JpQWdJQ0J1WVcxbElEMGdibUZ0WlM1eVpYQnNZV05sS0M5YlhGeGJYUzhzSUZ3aVhGeGNYRnRjSWlrdWNtVndiR0ZqWlNndlcxeGNYVjB2TENCY0lseGNYRnhkWENJcE8xeHVJQ0FnSUhaaGNpQnlaV2RsZUNBOUlHNWxkeUJTWldkRmVIQW9YQ0piWEZ4Y1hEOG1YVndpSUNzZ2JtRnRaU0FySUZ3aVBTaGJYaVlqWFNvcFhDSXBMRnh1SUNBZ0lDQWdJQ0J5WlhOMWJIUnpJRDBnY21WblpYZ3VaWGhsWXloc2IyTmhkR2x2Ymk1elpXRnlZMmdwTzF4dUlDQWdJSEpsZEhWeWJpQnlaWE4xYkhSeklEMDlQU0J1ZFd4c0lEOGdYQ0pjSWlBNklHUmxZMjlrWlZWU1NVTnZiWEJ2Ym1WdWRDaHlaWE4xYkhSeld6RmRMbkpsY0d4aFkyVW9MMXhjS3k5bkxDQmNJaUJjSWlrcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCaWIyOTBjM1J5WVhCVmRHMWxLQ2tnZTF4dUlDQnBaaUFvWkc5amRXMWxiblF1Y21WaFpIbFRkR0YwWlNBOVBTQmNJbU52YlhCc1pYUmxYQ0lwSUh0Y2JpQWdJQ0IxZEcxbExtbHVhWFFvS1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JseHVJQ0FnSUNBZ0lDQnBibWwwUlhabGJuUklZVzVrYkdWeWN5Z3BPMXh1WEc0Z0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG1selVtVmpiM0prYVc1bktDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21WbmFYTjBaWEpGZG1WdWRDaGNJbXh2WVdSY0lpd2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J3Y205MGIyTnZiRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbkJ5YjNSdlkyOXNMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCb2IzTjBPaUIzYVc1a2IzY3ViRzlqWVhScGIyNHVhRzl6ZEN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlZoY21Ob09pQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWMyVmhjbU5vTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm9ZWE5vT2lCM2FXNWtiM2N1Ykc5allYUnBiMjR1YUdGemFGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzRnSUgxY2JuMWNibHh1WW05dmRITjBjbUZ3VlhSdFpTZ3BPMXh1Wkc5amRXMWxiblF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduY21WaFpIbHpkR0YwWldOb1lXNW5aU2NzSUdKdmIzUnpkSEpoY0ZWMGJXVXBPMXh1WEc1M2FXNWtiM2N1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduZFc1c2IyRmtKeXdnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUhWMGJXVXVkVzVzYjJGa0tDazdYRzU5TENCMGNuVmxLVHRjYmx4dWQybHVaRzkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJWeWNtOXlKeXdnWm5WdVkzUnBiMjRnS0dWeWNpa2dlMXh1SUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUyTnlhWEIwSUVWeWNtOXlPaUJjSWlBcklHVnljaTV0WlhOellXZGxJQ3NnWENJNlhDSWdLeUJsY25JdWRYSnNJQ3NnWENJc1hDSWdLeUJsY25JdWJHbHVaU0FySUZ3aU9sd2lJQ3NnWlhKeUxtTnZiQ2s3WEc1OUtUdGNibHh1Ylc5a2RXeGxMbVY0Y0c5eWRITWdQU0IxZEcxbE8xeHVJbDE5Il19
