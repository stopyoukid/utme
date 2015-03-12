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
      newArray[key] = callback.call(thisArg, this[key], key, obj);
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
  var evt = step.eventName;
  return evt.indexOf("mouse") !== 0 || evt.indexOf("mousedown") === 0 || evt.indexOf("mouseup") === 0;
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


//# sourceURL=/home/davidtittsworth/projects/utme/src/js/utme.js
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./selectorFinder":6,"./settings":7,"./simulate":8,"./utils":9,"es6-promise":1}]},{},[4,5,6,7,8,9,10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9maWxlc2F2ZXIuanMvRmlsZVNhdmVyLmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvaG9tZS9kYXZpZHRpdHRzd29ydGgvcHJvamVjdHMvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFBQSxBQUFJLEVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUM3QixBQUFJLEVBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxPQUFN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LEFBQUMsRUFBQyxDQUFHO0FBQ3BCLFdBQUcsY0FBYyxBQUFDLENBQUMsTUFBSyxDQUFHLEVBQ3ZCLEdBQUUsQ0FBRztBQUNELG1CQUFPLENBQUcsQ0FBQSxNQUFLLFNBQVMsU0FBUztBQUNqQyxlQUFHLENBQUcsQ0FBQSxNQUFLLFNBQVMsS0FBSztBQUN6QixpQkFBSyxDQUFHLENBQUEsTUFBSyxTQUFTLE9BQU87QUFDN0IsZUFBRyxDQUFHLENBQUEsTUFBSyxTQUFTLEtBQUs7QUFBQSxVQUM3QixDQUNKLENBQUMsQ0FBQztNQUNOO0FBQUEsSUFDSixDQUFDLENBQUM7RUFDSjtBQUFBLEFBQ0Y7QUFBQSxBQUVBLFlBQVksQUFBQyxFQUFDLENBQUM7QUFDZixPQUFPLGlCQUFpQixBQUFDLENBQUMsa0JBQWlCLENBQUcsY0FBWSxDQUFDLENBQUM7QUFFNUQsS0FBSyxpQkFBaUIsQUFBQyxDQUFDLFFBQU8sQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUMxQyxLQUFHLE9BQU8sQUFBQyxFQUFDLENBQUM7QUFDakIsQ0FBRyxLQUFHLENBQUMsQ0FBQztBQUVSLEtBQUssaUJBQWlCLEFBQUMsQ0FBQyxPQUFNLENBQUcsVUFBVSxHQUFFLENBQUc7QUFDNUMsS0FBRyxVQUFVLEFBQUMsQ0FBQyxnQkFBZSxFQUFJLENBQUEsR0FBRSxRQUFRLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsSUFBSSxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLEtBQUssQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxJQUFJLENBQUMsQ0FBQztBQUNuRyxDQUFDLENBQUM7QUFFRixLQUFLLFFBQVEsRUFBSSxLQUFHLENBQUM7QUFFNCs1RSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAyLjAuMVxuICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nIHx8ICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkaXNGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkaXNNYXliZVRoZW5hYmxlKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgJCR1dGlscyQkX2lzQXJyYXk7XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkpIHtcbiAgICAgICQkdXRpbHMkJF9pc0FycmF5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICQkdXRpbHMkJF9pc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICB9XG5cbiAgICB2YXIgJCR1dGlscyQkaXNBcnJheSA9ICQkdXRpbHMkJF9pc0FycmF5O1xuICAgIHZhciAkJHV0aWxzJCRub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuICAgIGZ1bmN0aW9uICQkdXRpbHMkJEYoKSB7IH1cblxuICAgIHZhciAkJHV0aWxzJCRvX2NyZWF0ZSA9IChPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChvKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWNvbmQgYXJndW1lbnQgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBvICE9PSAnb2JqZWN0Jykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgICAgfVxuICAgICAgJCR1dGlscyQkRi5wcm90b3R5cGUgPSBvO1xuICAgICAgcmV0dXJuIG5ldyAkJHV0aWxzJCRGKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgJCRhc2FwJCRsZW4gPSAwO1xuXG4gICAgdmFyICQkYXNhcCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbl0gPSBjYWxsYmFjaztcbiAgICAgICQkYXNhcCQkcXVldWVbJCRhc2FwJCRsZW4gKyAxXSA9IGFyZztcbiAgICAgICQkYXNhcCQkbGVuICs9IDI7XG4gICAgICBpZiAoJCRhc2FwJCRsZW4gPT09IDIpIHtcbiAgICAgICAgLy8gSWYgbGVuIGlzIDEsIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHNjaGVkdWxlIGFuIGFzeW5jIGZsdXNoLlxuICAgICAgICAvLyBJZiBhZGRpdGlvbmFsIGNhbGxiYWNrcyBhcmUgcXVldWVkIGJlZm9yZSB0aGUgcXVldWUgaXMgZmx1c2hlZCwgdGhleVxuICAgICAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgJCRhc2FwJCRicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xuICAgIHZhciAkJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gJCRhc2FwJCRicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgJCRhc2FwJCRicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG5cbiAgICAvLyB0ZXN0IGZvciB3ZWIgd29ya2VyIGJ1dCBub3QgaW4gSUUxMFxuICAgIHZhciAkJGFzYXAkJGlzV29ya2VyID0gdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4gICAgLy8gbm9kZVxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTmV4dFRpY2soKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soJCRhc2FwJCRmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIHZhciBvYnNlcnZlciA9IG5ldyAkJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKCQkYXNhcCQkZmx1c2gpO1xuICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyB3ZWIgd29ya2VyXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9ICQkYXNhcCQkZmx1c2g7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoJCRhc2FwJCRmbHVzaCwgMSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHZhciAkJGFzYXAkJHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCRmbHVzaCgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgJCRhc2FwJCRsZW47IGkrPTIpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gJCRhc2FwJCRxdWV1ZVtpXTtcbiAgICAgICAgdmFyIGFyZyA9ICQkYXNhcCQkcXVldWVbaSsxXTtcblxuICAgICAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgICAgICQkYXNhcCQkcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICQkYXNhcCQkcXVldWVbaSsxXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgJCRhc2FwJCRsZW4gPSAwO1xuICAgIH1cblxuICAgIHZhciAkJGFzYXAkJHNjaGVkdWxlRmx1c2g7XG5cbiAgICAvLyBEZWNpZGUgd2hhdCBhc3luYyBtZXRob2QgdG8gdXNlIHRvIHRyaWdnZXJpbmcgcHJvY2Vzc2luZyBvZiBxdWV1ZWQgY2FsbGJhY2tzOlxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU5leHRUaWNrKCk7XG4gICAgfSBlbHNlIGlmICgkJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkaXNXb3JrZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VTZXRUaW1lb3V0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJG5vb3AoKSB7fVxuICAgIHZhciAkJCRpbnRlcm5hbCQkUEVORElORyAgID0gdm9pZCAwO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkRlVMRklMTEVEID0gMTtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJFJFSkVDVEVEICA9IDI7XG4gICAgdmFyICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUiA9IG5ldyAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGdldFRoZW4ocHJvbWlzZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbjtcbiAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yID0gZXJyb3I7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhlbi5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUsIHRoZW4pIHtcbiAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBlcnJvciA9ICQkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHRoZW5hYmxlLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcblxuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSwgJ1NldHRsZTogJyArIChwcm9taXNlLl9sYWJlbCB8fCAnIHVua25vd24gcHJvbWlzZScpKTtcblxuICAgICAgICBpZiAoIXNlYWxlZCAmJiBlcnJvcikge1xuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0sIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSkge1xuICAgICAgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAocHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZSh0aGVuYWJsZSwgdW5kZWZpbmVkLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKSB7XG4gICAgICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGhlbiA9ICQkJGludGVybmFsJCRnZXRUaGVuKG1heWJlVGhlbmFibGUpO1xuXG4gICAgICAgIGlmICh0aGVuID09PSAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkaXNGdW5jdGlvbih0aGVuKSkge1xuICAgICAgICAgICQkJGludGVybmFsJCRoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSk7XG4gICAgICB9IGVsc2UgaWYgKCQkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fb25lcnJvcikge1xuICAgICAgICBwcm9taXNlLl9vbmVycm9yKHByb21pc2UuX3Jlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgICQkJGludGVybmFsJCRwdWJsaXNoKHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuXG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgICAgIHByb21pc2UuX3N0YXRlID0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRDtcblxuICAgICAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoLCBwcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cbiAgICAgIHByb21pc2UuX3N0YXRlID0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEO1xuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24sIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHBhcmVudC5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgbGVuZ3RoID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyAkJCRpbnRlcm5hbCQkRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyAkJCRpbnRlcm5hbCQkUkVKRUNURURdICA9IG9uUmVqZWN0aW9uO1xuXG4gICAgICBpZiAobGVuZ3RoID09PSAwICYmIHBhcmVudC5fc3RhdGUpIHtcbiAgICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoLCBwYXJlbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoKHByb21pc2UpIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIHNldHRsZWQgPSBwcm9taXNlLl9zdGF0ZTtcblxuICAgICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgICAgdmFyIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpIHtcbiAgICAgIHRoaXMuZXJyb3IgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlO1xuICAgICAgICByZXR1cm4gJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdmFyIGhhc0NhbGxiYWNrID0gJCR1dGlscyQkaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICAgICAgdmFsdWUsIGVycm9yLCBzdWNjZWVkZWQsIGZhaWxlZDtcblxuICAgICAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgICAgIHZhbHVlID0gJCQkaW50ZXJuYWwkJHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpO1xuXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgZXJyb3IgPSB2YWx1ZS5lcnJvcjtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBkZXRhaWw7XG4gICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgLy8gbm9vcFxuICAgICAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSl7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbiByZWplY3RQcm9taXNlKHJlYXNvbikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRlbnVtZXJhdG9yJCRtYWtlU2V0dGxlZFJlc3VsdChzdGF0ZSwgcG9zaXRpb24sIHZhbHVlKSB7XG4gICAgICBpZiAoc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdGF0ZTogJ2Z1bGZpbGxlZCcsXG4gICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAncmVqZWN0ZWQnLFxuICAgICAgICAgIHJlYXNvbjogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yKENvbnN0cnVjdG9yLCBpbnB1dCwgYWJvcnRPblJlamVjdCwgbGFiZWwpIHtcbiAgICAgIHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgdGhpcy5fYWJvcnRPblJlamVjdCA9IGFib3J0T25SZWplY3Q7XG5cbiAgICAgIGlmICh0aGlzLl92YWxpZGF0ZUlucHV0KGlucHV0KSkge1xuICAgICAgICB0aGlzLl9pbnB1dCAgICAgPSBpbnB1dDtcbiAgICAgICAgdGhpcy5sZW5ndGggICAgID0gaW5wdXQubGVuZ3RoO1xuICAgICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgICAgdGhpcy5faW5pdCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMubGVuZ3RoIHx8IDA7XG4gICAgICAgICAgdGhpcy5fZW51bWVyYXRlKCk7XG4gICAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdCh0aGlzLnByb21pc2UsIHRoaXMuX3ZhbGlkYXRpb25FcnJvcigpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGVJbnB1dCA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gJCR1dGlscyQkaXNBcnJheShpbnB1dCk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0aW9uRXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoJ0FycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheScpO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcmVzdWx0ID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcbiAgICB9O1xuXG4gICAgdmFyICQkJGVudW1lcmF0b3IkJGRlZmF1bHQgPSAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yO1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2VudW1lcmF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxlbmd0aCAgPSB0aGlzLmxlbmd0aDtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuICAgICAgdmFyIGlucHV0ICAgPSB0aGlzLl9pbnB1dDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5fZWFjaEVudHJ5KGlucHV0W2ldLCBpKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2VhY2hFbnRyeSA9IGZ1bmN0aW9uKGVudHJ5LCBpKSB7XG4gICAgICB2YXIgYyA9IHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3I7XG4gICAgICBpZiAoJCR1dGlscyQkaXNNYXliZVRoZW5hYmxlKGVudHJ5KSkge1xuICAgICAgICBpZiAoZW50cnkuY29uc3RydWN0b3IgPT09IGMgJiYgZW50cnkuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAgIGVudHJ5Ll9vbmVycm9yID0gbnVsbDtcbiAgICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl93aWxsU2V0dGxlQXQoYy5yZXNvbHZlKGVudHJ5KSwgaSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB0aGlzLl9tYWtlUmVzdWx0KCQkJGludGVybmFsJCRGVUxGSUxMRUQsIGksIGVudHJ5KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3NldHRsZWRBdCA9IGZ1bmN0aW9uKHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG5cbiAgICAgICAgaWYgKHRoaXMuX2Fib3J0T25SZWplY3QgJiYgc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoc3RhdGUsIGksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9tYWtlUmVzdWx0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbihwcm9taXNlLCBpKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgdmFsdWUpO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkUkVKRUNURUQsIGksIHJlYXNvbik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRhbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBhbGwoZW50cmllcywgbGFiZWwpIHtcbiAgICAgIHJldHVybiBuZXcgJCQkZW51bWVyYXRvciQkZGVmYXVsdCh0aGlzLCBlbnRyaWVzLCB0cnVlIC8qIGFib3J0IG9uIHJlamVjdCAqLywgbGFiZWwpLnByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmFjZSQkZGVmYXVsdCA9IGZ1bmN0aW9uIHJhY2UoZW50cmllcywgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuXG4gICAgICBpZiAoISQkdXRpbHMkJGlzQXJyYXkoZW50cmllcykpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJykpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoO1xuXG4gICAgICBmdW5jdGlvbiBvbkZ1bGZpbGxtZW50KHZhbHVlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gb25SZWplY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShDb25zdHJ1Y3Rvci5yZXNvbHZlKGVudHJpZXNbaV0pLCB1bmRlZmluZWQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdCA9IGZ1bmN0aW9uIHJlc29sdmUob2JqZWN0LCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIGlmIChvYmplY3QgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0LmNvbnN0cnVjdG9yID09PSBDb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgfVxuXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgb2JqZWN0KTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJlamVjdCQkZGVmYXVsdCA9IGZ1bmN0aW9uIHJlamVjdChyZWFzb24sIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlciA9IDA7XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZTtcblxuICAgIC8qKlxuICAgICAgUHJvbWlzZSBvYmplY3RzIHJlcHJlc2VudCB0aGUgZXZlbnR1YWwgcmVzdWx0IG9mIGFuIGFzeW5jaHJvbm91cyBvcGVyYXRpb24uIFRoZVxuICAgICAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgICAgIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNl4oCZcyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gICAgICB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICAgICAgVGVybWlub2xvZ3lcbiAgICAgIC0tLS0tLS0tLS0tXG5cbiAgICAgIC0gYHByb21pc2VgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB3aXRoIGEgYHRoZW5gIG1ldGhvZCB3aG9zZSBiZWhhdmlvciBjb25mb3JtcyB0byB0aGlzIHNwZWNpZmljYXRpb24uXG4gICAgICAtIGB0aGVuYWJsZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyBhIGB0aGVuYCBtZXRob2QuXG4gICAgICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gICAgICAtIGBleGNlcHRpb25gIGlzIGEgdmFsdWUgdGhhdCBpcyB0aHJvd24gdXNpbmcgdGhlIHRocm93IHN0YXRlbWVudC5cbiAgICAgIC0gYHJlYXNvbmAgaXMgYSB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aHkgYSBwcm9taXNlIHdhcyByZWplY3RlZC5cbiAgICAgIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gICAgICBBIHByb21pc2UgY2FuIGJlIGluIG9uZSBvZiB0aHJlZSBzdGF0ZXM6IHBlbmRpbmcsIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIFByb21pc2VzIHRoYXQgYXJlIGZ1bGZpbGxlZCBoYXZlIGEgZnVsZmlsbG1lbnQgdmFsdWUgYW5kIGFyZSBpbiB0aGUgZnVsZmlsbGVkXG4gICAgICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gICAgICByZWplY3RlZCBzdGF0ZS4gIEEgZnVsZmlsbG1lbnQgdmFsdWUgaXMgbmV2ZXIgYSB0aGVuYWJsZS5cblxuICAgICAgUHJvbWlzZXMgY2FuIGFsc28gYmUgc2FpZCB0byAqcmVzb2x2ZSogYSB2YWx1ZS4gIElmIHRoaXMgdmFsdWUgaXMgYWxzbyBhXG4gICAgICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gICAgICBzZXR0bGVkIHN0YXRlLiAgU28gYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCByZWplY3RzIHdpbGxcbiAgICAgIGl0c2VsZiByZWplY3QsIGFuZCBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IGZ1bGZpbGxzIHdpbGxcbiAgICAgIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgICAgIEJhc2ljIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tXG5cbiAgICAgIGBgYGpzXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBvbiBzdWNjZXNzXG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgICAgIC8vIG9uIGZhaWx1cmVcbiAgICAgICAgcmVqZWN0KHJlYXNvbik7XG4gICAgICB9KTtcblxuICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBZHZhbmNlZCBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLS0tLVxuXG4gICAgICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gICAgICBgWE1MSHR0cFJlcXVlc3Rgcy5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBoYW5kbGVyO1xuICAgICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnanNvbic7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgeGhyLnNlbmQoKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ2dldEpTT046IGAnICsgdXJsICsgJ2AgZmFpbGVkIHdpdGggc3RhdHVzOiBbJyArIHRoaXMuc3RhdHVzICsgJ10nKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZ2V0SlNPTignL3Bvc3RzLmpzb24nKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFVubGlrZSBjYWxsYmFja3MsIHByb21pc2VzIGFyZSBncmVhdCBjb21wb3NhYmxlIHByaW1pdGl2ZXMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGdldEpTT04oJy9wb3N0cycpLFxuICAgICAgICBnZXRKU09OKCcvY29tbWVudHMnKVxuICAgICAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgICAgICB2YWx1ZXNbMF0gLy8gPT4gcG9zdHNKU09OXG4gICAgICAgIHZhbHVlc1sxXSAvLyA9PiBjb21tZW50c0pTT05cblxuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQGNsYXNzIFByb21pc2VcbiAgICAgIEBwYXJhbSB7ZnVuY3Rpb259IHJlc29sdmVyXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAY29uc3RydWN0b3JcbiAgICAqL1xuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZShyZXNvbHZlcikge1xuICAgICAgdGhpcy5faWQgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIrKztcbiAgICAgIHRoaXMuX3N0YXRlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fcmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgICAgaWYgKCQkJGludGVybmFsJCRub29wICE9PSByZXNvbHZlcikge1xuICAgICAgICBpZiAoISQkdXRpbHMkJGlzRnVuY3Rpb24ocmVzb2x2ZXIpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKSkge1xuICAgICAgICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLmFsbCA9ICQkcHJvbWlzZSRhbGwkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJhY2UgPSAkJHByb21pc2UkcmFjZSQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVzb2x2ZSA9ICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZWplY3QgPSAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0O1xuXG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnByb3RvdHlwZSA9IHtcbiAgICAgIGNvbnN0cnVjdG9yOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UsXG5cbiAgICAvKipcbiAgICAgIFRoZSBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLFxuICAgICAgd2hpY2ggcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGVcbiAgICAgIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgLy8gdXNlciBpcyBhdmFpbGFibGVcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBDaGFpbmluZ1xuICAgICAgLS0tLS0tLS1cblxuICAgICAgVGhlIHJldHVybiB2YWx1ZSBvZiBgdGhlbmAgaXMgaXRzZWxmIGEgcHJvbWlzZS4gIFRoaXMgc2Vjb25kLCAnZG93bnN0cmVhbSdcbiAgICAgIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmaXJzdCBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAgICAgIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiB1c2VyLm5hbWU7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHVzZXJOYW1lKSB7XG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgdXNlck5hbWVgIHdpbGwgYmUgdGhlIHVzZXIncyBuYW1lLCBvdGhlcndpc2UgaXRcbiAgICAgICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gICAgICB9KTtcblxuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknKTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIGlmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgcmVhc29uYCB3aWxsIGJlICdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScuXG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgcmVqZWN0ZWQsIGByZWFzb25gIHdpbGwgYmUgJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknLlxuICAgICAgfSk7XG4gICAgICBgYGBcbiAgICAgIElmIHRoZSBkb3duc3RyZWFtIHByb21pc2UgZG9lcyBub3Qgc3BlY2lmeSBhIHJlamVjdGlvbiBoYW5kbGVyLCByZWplY3Rpb24gcmVhc29ucyB3aWxsIGJlIHByb3BhZ2F0ZWQgZnVydGhlciBkb3duc3RyZWFtLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFzc2ltaWxhdGlvblxuICAgICAgLS0tLS0tLS0tLS0tXG5cbiAgICAgIFNvbWV0aW1lcyB0aGUgdmFsdWUgeW91IHdhbnQgdG8gcHJvcGFnYXRlIHRvIGEgZG93bnN0cmVhbSBwcm9taXNlIGNhbiBvbmx5IGJlXG4gICAgICByZXRyaWV2ZWQgYXN5bmNocm9ub3VzbHkuIFRoaXMgY2FuIGJlIGFjaGlldmVkIGJ5IHJldHVybmluZyBhIHByb21pc2UgaW4gdGhlXG4gICAgICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICAgICAgdW50aWwgdGhlIHJldHVybmVkIHByb21pc2UgaXMgc2V0dGxlZC4gVGhpcyBpcyBjYWxsZWQgKmFzc2ltaWxhdGlvbiouXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gVGhlIHVzZXIncyBjb21tZW50cyBhcmUgbm93IGF2YWlsYWJsZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSWYgdGhlIGFzc2ltbGlhdGVkIHByb21pc2UgcmVqZWN0cywgdGhlbiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgYWxzbyByZWplY3QuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCBmdWxmaWxscywgd2UnbGwgaGF2ZSB0aGUgdmFsdWUgaGVyZVxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIHJlamVjdHMsIHdlJ2xsIGhhdmUgdGhlIHJlYXNvbiBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBTaW1wbGUgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBmaW5kUmVzdWx0KCk7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcbiAgICAgIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBZHZhbmNlZCBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBhdXRob3IsIGJvb2tzO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhdXRob3IgPSBmaW5kQXV0aG9yKCk7XG4gICAgICAgIGJvb2tzICA9IGZpbmRCb29rc0J5QXV0aG9yKGF1dGhvcik7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcblxuICAgICAgZnVuY3Rpb24gZm91bmRCb29rcyhib29rcykge1xuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZhaWx1cmUocmVhc29uKSB7XG5cbiAgICAgIH1cblxuICAgICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGZvdW5kQm9va3MoYm9va3MpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICBmYWlsdXJlKHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kQXV0aG9yKCkuXG4gICAgICAgIHRoZW4oZmluZEJvb2tzQnlBdXRob3IpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgICAgICAvLyBmb3VuZCBib29rc1xuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgdGhlblxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25GdWxmaWxsZWRcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCAmJiAhb25GdWxmaWxsbWVudCB8fCBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEICYmICFvblJlamVjdGlvbikge1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoaWxkID0gbmV3IHRoaXMuY29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3ApO1xuICAgICAgICB2YXIgcmVzdWx0ID0gcGFyZW50Ll9yZXN1bHQ7XG5cbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW3N0YXRlIC0gMV07XG4gICAgICAgICAgJCRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcmVzdWx0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgIH0sXG5cbiAgICAvKipcbiAgICAgIGBjYXRjaGAgaXMgc2ltcGx5IHN1Z2FyIGZvciBgdGhlbih1bmRlZmluZWQsIG9uUmVqZWN0aW9uKWAgd2hpY2ggbWFrZXMgaXQgdGhlIHNhbWVcbiAgICAgIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBmaW5kQXV0aG9yKCl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGRuJ3QgZmluZCB0aGF0IGF1dGhvcicpO1xuICAgICAgfVxuXG4gICAgICAvLyBzeW5jaHJvbm91c1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmluZEF1dGhvcigpO1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH1cblxuICAgICAgLy8gYXN5bmMgd2l0aCBwcm9taXNlc1xuICAgICAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIGNhdGNoXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0ID0gZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgICB2YXIgbG9jYWw7XG5cbiAgICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmRvY3VtZW50KSB7XG4gICAgICAgIGxvY2FsID0gd2luZG93O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWwgPSBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgZXM2UHJvbWlzZVN1cHBvcnQgPVxuICAgICAgICBcIlByb21pc2VcIiBpbiBsb2NhbCAmJlxuICAgICAgICAvLyBTb21lIG9mIHRoZXNlIG1ldGhvZHMgYXJlIG1pc3NpbmcgZnJvbVxuICAgICAgICAvLyBGaXJlZm94L0Nocm9tZSBleHBlcmltZW50YWwgaW1wbGVtZW50YXRpb25zXG4gICAgICAgIFwicmVzb2x2ZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyZWplY3RcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwiYWxsXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJhY2VcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIC8vIE9sZGVyIHZlcnNpb24gb2YgdGhlIHNwZWMgaGFkIGEgcmVzb2x2ZXIgb2JqZWN0XG4gICAgICAgIC8vIGFzIHRoZSBhcmcgcmF0aGVyIHRoYW4gYSBmdW5jdGlvblxuICAgICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHJlc29sdmU7XG4gICAgICAgICAgbmV3IGxvY2FsLlByb21pc2UoZnVuY3Rpb24ocikgeyByZXNvbHZlID0gcjsgfSk7XG4gICAgICAgICAgcmV0dXJuICQkdXRpbHMkJGlzRnVuY3Rpb24ocmVzb2x2ZSk7XG4gICAgICAgIH0oKSk7XG5cbiAgICAgIGlmICghZXM2UHJvbWlzZVN1cHBvcnQpIHtcbiAgICAgICAgbG9jYWwuUHJvbWlzZSA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZSA9IHtcbiAgICAgICdQcm9taXNlJzogJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0LFxuICAgICAgJ3BvbHlmaWxsJzogJCRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdFxuICAgIH07XG5cbiAgICAvKiBnbG9iYWwgZGVmaW5lOnRydWUgbW9kdWxlOnRydWUgd2luZG93OiB0cnVlICovXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lWydhbWQnXSkge1xuICAgICAgZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlOyB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZVsnZXhwb3J0cyddKSB7XG4gICAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpc1snRVM2UHJvbWlzZSddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH1cbn0pLmNhbGwodGhpcyk7IiwiLyogRmlsZVNhdmVyLmpzXG4gKiBBIHNhdmVBcygpIEZpbGVTYXZlciBpbXBsZW1lbnRhdGlvbi5cbiAqIDIwMTQtMTItMTdcbiAqXG4gKiBCeSBFbGkgR3JleSwgaHR0cDovL2VsaWdyZXkuY29tXG4gKiBMaWNlbnNlOiBYMTEvTUlUXG4gKiAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvTElDRU5TRS5tZFxuICovXG5cbi8qZ2xvYmFsIHNlbGYgKi9cbi8qanNsaW50IGJpdHdpc2U6IHRydWUsIGluZGVudDogNCwgbGF4YnJlYWs6IHRydWUsIGxheGNvbW1hOiB0cnVlLCBzbWFydHRhYnM6IHRydWUsIHBsdXNwbHVzOiB0cnVlICovXG5cbi8qISBAc291cmNlIGh0dHA6Ly9wdXJsLmVsaWdyZXkuY29tL2dpdGh1Yi9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvRmlsZVNhdmVyLmpzICovXG5cbnZhciBzYXZlQXMgPSBzYXZlQXNcbiAgLy8gSUUgMTArIChuYXRpdmUgc2F2ZUFzKVxuICB8fCAodHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IgJiYgbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IuYmluZChuYXZpZ2F0b3IpKVxuICAvLyBFdmVyeW9uZSBlbHNlXG4gIHx8IChmdW5jdGlvbih2aWV3KSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHQvLyBJRSA8MTAgaXMgZXhwbGljaXRseSB1bnN1cHBvcnRlZFxuXHRpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuXHQgICAgL01TSUUgWzEtOV1cXC4vLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyXG5cdFx0ICBkb2MgPSB2aWV3LmRvY3VtZW50XG5cdFx0ICAvLyBvbmx5IGdldCBVUkwgd2hlbiBuZWNlc3NhcnkgaW4gY2FzZSBCbG9iLmpzIGhhc24ndCBvdmVycmlkZGVuIGl0IHlldFxuXHRcdCwgZ2V0X1VSTCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZpZXcuVVJMIHx8IHZpZXcud2Via2l0VVJMIHx8IHZpZXc7XG5cdFx0fVxuXHRcdCwgc2F2ZV9saW5rID0gZG9jLmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiwgXCJhXCIpXG5cdFx0LCBjYW5fdXNlX3NhdmVfbGluayA9IFwiZG93bmxvYWRcIiBpbiBzYXZlX2xpbmtcblx0XHQsIGNsaWNrID0gZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dmFyIGV2ZW50ID0gZG9jLmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudHNcIik7XG5cdFx0XHRldmVudC5pbml0TW91c2VFdmVudChcblx0XHRcdFx0XCJjbGlja1wiLCB0cnVlLCBmYWxzZSwgdmlldywgMCwgMCwgMCwgMCwgMFxuXHRcdFx0XHQsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwLCBudWxsXG5cdFx0XHQpO1xuXHRcdFx0bm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdFx0LCB3ZWJraXRfcmVxX2ZzID0gdmlldy53ZWJraXRSZXF1ZXN0RmlsZVN5c3RlbVxuXHRcdCwgcmVxX2ZzID0gdmlldy5yZXF1ZXN0RmlsZVN5c3RlbSB8fCB3ZWJraXRfcmVxX2ZzIHx8IHZpZXcubW96UmVxdWVzdEZpbGVTeXN0ZW1cblx0XHQsIHRocm93X291dHNpZGUgPSBmdW5jdGlvbihleCkge1xuXHRcdFx0KHZpZXcuc2V0SW1tZWRpYXRlIHx8IHZpZXcuc2V0VGltZW91dCkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRocm93IGV4O1xuXHRcdFx0fSwgMCk7XG5cdFx0fVxuXHRcdCwgZm9yY2Vfc2F2ZWFibGVfdHlwZSA9IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCJcblx0XHQsIGZzX21pbl9zaXplID0gMFxuXHRcdC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9Mzc1Mjk3I2M3IGFuZFxuXHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9jb21taXQvNDg1OTMwYSNjb21taXRjb21tZW50LTg3NjgwNDdcblx0XHQvLyBmb3IgdGhlIHJlYXNvbmluZyBiZWhpbmQgdGhlIHRpbWVvdXQgYW5kIHJldm9jYXRpb24gZmxvd1xuXHRcdCwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0ID0gNTAwIC8vIGluIG1zXG5cdFx0LCByZXZva2UgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHR2YXIgcmV2b2tlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGZpbGUgPT09IFwic3RyaW5nXCIpIHsgLy8gZmlsZSBpcyBhbiBvYmplY3QgVVJMXG5cdFx0XHRcdFx0Z2V0X1VSTCgpLnJldm9rZU9iamVjdFVSTChmaWxlKTtcblx0XHRcdFx0fSBlbHNlIHsgLy8gZmlsZSBpcyBhIEZpbGVcblx0XHRcdFx0XHRmaWxlLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0aWYgKHZpZXcuY2hyb21lKSB7XG5cdFx0XHRcdHJldm9rZXIoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNldFRpbWVvdXQocmV2b2tlciwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0LCBkaXNwYXRjaCA9IGZ1bmN0aW9uKGZpbGVzYXZlciwgZXZlbnRfdHlwZXMsIGV2ZW50KSB7XG5cdFx0XHRldmVudF90eXBlcyA9IFtdLmNvbmNhdChldmVudF90eXBlcyk7XG5cdFx0XHR2YXIgaSA9IGV2ZW50X3R5cGVzLmxlbmd0aDtcblx0XHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdFx0dmFyIGxpc3RlbmVyID0gZmlsZXNhdmVyW1wib25cIiArIGV2ZW50X3R5cGVzW2ldXTtcblx0XHRcdFx0aWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGxpc3RlbmVyLmNhbGwoZmlsZXNhdmVyLCBldmVudCB8fCBmaWxlc2F2ZXIpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdFx0XHR0aHJvd19vdXRzaWRlKGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0LCBGaWxlU2F2ZXIgPSBmdW5jdGlvbihibG9iLCBuYW1lKSB7XG5cdFx0XHQvLyBGaXJzdCB0cnkgYS5kb3dubG9hZCwgdGhlbiB3ZWIgZmlsZXN5c3RlbSwgdGhlbiBvYmplY3QgVVJMc1xuXHRcdFx0dmFyXG5cdFx0XHRcdCAgZmlsZXNhdmVyID0gdGhpc1xuXHRcdFx0XHQsIHR5cGUgPSBibG9iLnR5cGVcblx0XHRcdFx0LCBibG9iX2NoYW5nZWQgPSBmYWxzZVxuXHRcdFx0XHQsIG9iamVjdF91cmxcblx0XHRcdFx0LCB0YXJnZXRfdmlld1xuXHRcdFx0XHQsIGRpc3BhdGNoX2FsbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJ3cml0ZXN0YXJ0IHByb2dyZXNzIHdyaXRlIHdyaXRlZW5kXCIuc3BsaXQoXCIgXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBvbiBhbnkgZmlsZXN5cyBlcnJvcnMgcmV2ZXJ0IHRvIHNhdmluZyB3aXRoIG9iamVjdCBVUkxzXG5cdFx0XHRcdCwgZnNfZXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBkb24ndCBjcmVhdGUgbW9yZSBvYmplY3QgVVJMcyB0aGFuIG5lZWRlZFxuXHRcdFx0XHRcdGlmIChibG9iX2NoYW5nZWQgfHwgIW9iamVjdF91cmwpIHtcblx0XHRcdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGFyZ2V0X3ZpZXcpIHtcblx0XHRcdFx0XHRcdHRhcmdldF92aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR2YXIgbmV3X3RhYiA9IHZpZXcub3BlbihvYmplY3RfdXJsLCBcIl9ibGFua1wiKTtcblx0XHRcdFx0XHRcdGlmIChuZXdfdGFiID09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygc2FmYXJpICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdFx0XHRcdFx0XHRcdC8vQXBwbGUgZG8gbm90IGFsbG93IHdpbmRvdy5vcGVuLCBzZWUgaHR0cDovL2JpdC5seS8xa1pmZlJJXG5cdFx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmxcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0LCBhYm9ydGFibGUgPSBmdW5jdGlvbihmdW5jKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0aWYgKGZpbGVzYXZlci5yZWFkeVN0YXRlICE9PSBmaWxlc2F2ZXIuRE9ORSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdFx0LCBjcmVhdGVfaWZfbm90X2ZvdW5kID0ge2NyZWF0ZTogdHJ1ZSwgZXhjbHVzaXZlOiBmYWxzZX1cblx0XHRcdFx0LCBzbGljZVxuXHRcdFx0O1xuXHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblx0XHRcdGlmICghbmFtZSkge1xuXHRcdFx0XHRuYW1lID0gXCJkb3dubG9hZFwiO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNhbl91c2Vfc2F2ZV9saW5rKSB7XG5cdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRzYXZlX2xpbmsuaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdHNhdmVfbGluay5kb3dubG9hZCA9IG5hbWU7XG5cdFx0XHRcdGNsaWNrKHNhdmVfbGluayk7XG5cdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vIE9iamVjdCBhbmQgd2ViIGZpbGVzeXN0ZW0gVVJMcyBoYXZlIGEgcHJvYmxlbSBzYXZpbmcgaW4gR29vZ2xlIENocm9tZSB3aGVuXG5cdFx0XHQvLyB2aWV3ZWQgaW4gYSB0YWIsIHNvIEkgZm9yY2Ugc2F2ZSB3aXRoIGFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVxuXHRcdFx0Ly8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9OTExNThcblx0XHRcdC8vIFVwZGF0ZTogR29vZ2xlIGVycmFudGx5IGNsb3NlZCA5MTE1OCwgSSBzdWJtaXR0ZWQgaXQgYWdhaW46XG5cdFx0XHQvLyBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9Mzg5NjQyXG5cdFx0XHRpZiAodmlldy5jaHJvbWUgJiYgdHlwZSAmJiB0eXBlICE9PSBmb3JjZV9zYXZlYWJsZV90eXBlKSB7XG5cdFx0XHRcdHNsaWNlID0gYmxvYi5zbGljZSB8fCBibG9iLndlYmtpdFNsaWNlO1xuXHRcdFx0XHRibG9iID0gc2xpY2UuY2FsbChibG9iLCAwLCBibG9iLnNpemUsIGZvcmNlX3NhdmVhYmxlX3R5cGUpO1xuXHRcdFx0XHRibG9iX2NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0Ly8gU2luY2UgSSBjYW4ndCBiZSBzdXJlIHRoYXQgdGhlIGd1ZXNzZWQgbWVkaWEgdHlwZSB3aWxsIHRyaWdnZXIgYSBkb3dubG9hZFxuXHRcdFx0Ly8gaW4gV2ViS2l0LCBJIGFwcGVuZCAuZG93bmxvYWQgdG8gdGhlIGZpbGVuYW1lLlxuXHRcdFx0Ly8gaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTY1NDQwXG5cdFx0XHRpZiAod2Via2l0X3JlcV9mcyAmJiBuYW1lICE9PSBcImRvd25sb2FkXCIpIHtcblx0XHRcdFx0bmFtZSArPSBcIi5kb3dubG9hZFwiO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHR5cGUgPT09IGZvcmNlX3NhdmVhYmxlX3R5cGUgfHwgd2Via2l0X3JlcV9mcykge1xuXHRcdFx0XHR0YXJnZXRfdmlldyA9IHZpZXc7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIXJlcV9mcykge1xuXHRcdFx0XHRmc19lcnJvcigpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRmc19taW5fc2l6ZSArPSBibG9iLnNpemU7XG5cdFx0XHRyZXFfZnModmlldy5URU1QT1JBUlksIGZzX21pbl9zaXplLCBhYm9ydGFibGUoZnVuY3Rpb24oZnMpIHtcblx0XHRcdFx0ZnMucm9vdC5nZXREaXJlY3RvcnkoXCJzYXZlZFwiLCBjcmVhdGVfaWZfbm90X2ZvdW5kLCBhYm9ydGFibGUoZnVuY3Rpb24oZGlyKSB7XG5cdFx0XHRcdFx0dmFyIHNhdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGRpci5nZXRGaWxlKG5hbWUsIGNyZWF0ZV9pZl9ub3RfZm91bmQsIGFib3J0YWJsZShmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRcdFx0XHRcdGZpbGUuY3JlYXRlV3JpdGVyKGFib3J0YWJsZShmdW5jdGlvbih3cml0ZXIpIHtcblx0XHRcdFx0XHRcdFx0XHR3cml0ZXIub253cml0ZWVuZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0YXJnZXRfdmlldy5sb2NhdGlvbi5ocmVmID0gZmlsZS50b1VSTCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRcdFx0XHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJ3cml0ZWVuZFwiLCBldmVudCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXZva2UoZmlsZSk7XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHR3cml0ZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGVycm9yID0gd3JpdGVyLmVycm9yO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGVycm9yLmNvZGUgIT09IGVycm9yLkFCT1JUX0VSUikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRmc19lcnJvcigpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0XCJ3cml0ZXN0YXJ0IHByb2dyZXNzIHdyaXRlIGFib3J0XCIuc3BsaXQoXCIgXCIpLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHdyaXRlcltcIm9uXCIgKyBldmVudF0gPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRdO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci53cml0ZShibG9iKTtcblx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIuYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHdyaXRlci5hYm9ydCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLldSSVRJTkc7XG5cdFx0XHRcdFx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0XHRcdFx0XHR9KSwgZnNfZXJyb3IpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0ZGlyLmdldEZpbGUobmFtZSwge2NyZWF0ZTogZmFsc2V9LCBhYm9ydGFibGUoZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0XHRcdFx0Ly8gZGVsZXRlIGZpbGUgaWYgaXQgYWxyZWFkeSBleGlzdHNcblx0XHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRzYXZlKCk7XG5cdFx0XHRcdFx0fSksIGFib3J0YWJsZShmdW5jdGlvbihleCkge1xuXHRcdFx0XHRcdFx0aWYgKGV4LmNvZGUgPT09IGV4Lk5PVF9GT1VORF9FUlIpIHtcblx0XHRcdFx0XHRcdFx0c2F2ZSgpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZnNfZXJyb3IoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KSk7XG5cdFx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0XHR9KSwgZnNfZXJyb3IpO1xuXHRcdH1cblx0XHQsIEZTX3Byb3RvID0gRmlsZVNhdmVyLnByb3RvdHlwZVxuXHRcdCwgc2F2ZUFzID0gZnVuY3Rpb24oYmxvYiwgbmFtZSkge1xuXHRcdFx0cmV0dXJuIG5ldyBGaWxlU2F2ZXIoYmxvYiwgbmFtZSk7XG5cdFx0fVxuXHQ7XG5cdEZTX3Byb3RvLmFib3J0ID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZpbGVzYXZlciA9IHRoaXM7XG5cdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwiYWJvcnRcIik7XG5cdH07XG5cdEZTX3Byb3RvLnJlYWR5U3RhdGUgPSBGU19wcm90by5JTklUID0gMDtcblx0RlNfcHJvdG8uV1JJVElORyA9IDE7XG5cdEZTX3Byb3RvLkRPTkUgPSAyO1xuXG5cdEZTX3Byb3RvLmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZXN0YXJ0ID1cblx0RlNfcHJvdG8ub25wcm9ncmVzcyA9XG5cdEZTX3Byb3RvLm9ud3JpdGUgPVxuXHRGU19wcm90by5vbmFib3J0ID1cblx0RlNfcHJvdG8ub25lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVlbmQgPVxuXHRcdG51bGw7XG5cblx0cmV0dXJuIHNhdmVBcztcbn0oXG5cdCAgIHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiICYmIHNlbGZcblx0fHwgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3dcblx0fHwgdGhpcy5jb250ZW50XG4pKTtcbi8vIGBzZWxmYCBpcyB1bmRlZmluZWQgaW4gRmlyZWZveCBmb3IgQW5kcm9pZCBjb250ZW50IHNjcmlwdCBjb250ZXh0XG4vLyB3aGlsZSBgdGhpc2AgaXMgbnNJQ29udGVudEZyYW1lTWVzc2FnZU1hbmFnZXJcbi8vIHdpdGggYW4gYXR0cmlidXRlIGBjb250ZW50YCB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSB3aW5kb3dcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBzYXZlQXM7XG59IGVsc2UgaWYgKCh0eXBlb2YgZGVmaW5lICE9PSBcInVuZGVmaW5lZFwiICYmIGRlZmluZSAhPT0gbnVsbCkgJiYgKGRlZmluZS5hbWQgIT0gbnVsbCkpIHtcbiAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2F2ZUFzO1xuICB9KTtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgdXRtZSA9IHJlcXVpcmUoJy4uL3V0bWUnKTtcbnZhciBzYXZlQXMgPSByZXF1aXJlKCdmaWxlc2F2ZXIuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dG1lLnJlZ2lzdGVyU2F2ZUhhbmRsZXIoZnVuY3Rpb24gKHNjZW5hcmlvKSB7XG4gICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtKU09OLnN0cmluZ2lmeShzY2VuYXJpbywgbnVsbCwgXCIgXCIpXSwge3R5cGU6IFwidGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04XCJ9KTtcbiAgIHNhdmVBcyhibG9iLCBzY2VuYXJpby5uYW1lICsgXCIuanNvblwiKTtcbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM0JsY25OcGMzUmxjbk12ZFhSdFpTMW1hV3hsTFhCbGNuTnBjM1JsY2k1cWN5SXNJbk52ZFhKalpYTWlPbHNpTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM0JsY25OcGMzUmxjbk12ZFhSdFpTMW1hV3hsTFhCbGNuTnBjM1JsY2k1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRU3hKUVVGSkxFbEJRVWtzUjBGQlJ5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN1FVRkRPVUlzU1VGQlNTeE5RVUZOTEVkQlFVY3NUMEZCVHl4RFFVRkRMR05CUVdNc1EwRkJReXhEUVVGRE96dEJRVVZ5UXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5eHRRa0ZCYlVJc1EwRkJReXhWUVVGVkxGRkJRVkVzUlVGQlJUdEhRVU16UkN4SlFVRkpMRWxCUVVrc1IwRkJSeXhKUVVGSkxFbEJRVWtzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXl4RlFVRkZMRU5CUVVNc1NVRkJTU3hGUVVGRkxEQkNRVUV3UWl4RFFVRkRMRU5CUVVNc1EwRkJRenRIUVVNdlJpeE5RVUZOTEVOQlFVTXNTVUZCU1N4RlFVRkZMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzVDBGQlR5eERRVUZETEVOQlFVTTdRMEZEZUVNc1EwRkJReUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSW5aaGNpQjFkRzFsSUQwZ2NtVnhkV2x5WlNnbkxpNHZkWFJ0WlNjcE8xeHVkbUZ5SUhOaGRtVkJjeUE5SUhKbGNYVnBjbVVvSjJacGJHVnpZWFpsY2k1cWN5Y3BPMXh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUhWMGJXVXVjbVZuYVhOMFpYSlRZWFpsU0dGdVpHeGxjaWhtZFc1amRHbHZiaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJSFpoY2lCaWJHOWlJRDBnYm1WM0lFSnNiMklvVzBwVFQwNHVjM1J5YVc1bmFXWjVLSE5qWlc1aGNtbHZMQ0J1ZFd4c0xDQmNJaUJjSWlsZExDQjdkSGx3WlRvZ1hDSjBaWGgwTDNCc1lXbHVPMk5vWVhKelpYUTlkWFJtTFRoY0luMHBPMXh1SUNBZ2MyRjJaVUZ6S0dKc2IySXNJSE5qWlc1aGNtbHZMbTVoYldVZ0t5QmNJaTVxYzI5dVhDSXBPMXh1ZlNrN0lsMTkiLCJ2YXIgdXRtZSA9IHJlcXVpcmUoJy4uL3V0bWUuanMnKTtcblxuZnVuY3Rpb24gZ2V0QmFzZVVSTCAoKSB7XG4gIHJldHVybiB1dG1lLnN0YXRlICYmIHV0bWUuc3RhdGUudGVzdFNlcnZlciA/IHV0bWUuc3RhdGUudGVzdFNlcnZlciA6IGdldFBhcmFtZXRlckJ5TmFtZShcInV0bWVfdGVzdF9zZXJ2ZXJcIikgfHwgXCJodHRwOi8vMC4wLjAuMDo5MDQzL1wiO1xufVxuXG52YXIgc2VydmVyUmVwb3J0ZXIgPSB7XG4gICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvciwgc2NlbmFyaW8sIHV0bWUpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6IGdldEJhc2VVUkwoKSArIFwiZXJyb3JcIixcbiAgICAgICAgICBkYXRhOiB7IGRhdGE6IGVycm9yIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodXRtZS5zZXR0aW5ncy5nZXQoXCJjb25zb2xlTG9nZ2luZ1wiKSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzdWNjZXNzOiBmdW5jdGlvbiAoc3VjY2Vzcywgc2NlbmFyaW8sIHV0bWUpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6IGdldEJhc2VVUkwoKSArIFwic3VjY2Vzc1wiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogc3VjY2VzcyB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHV0bWUuc2V0dGluZ3MuZ2V0KFwiY29uc29sZUxvZ2dpbmdcIikpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhzdWNjZXNzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgbG9nOiBmdW5jdGlvbiAobG9nLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogIGdldEJhc2VVUkwoKSArIFwibG9nXCIsXG4gICAgICAgICAgZGF0YTogeyBkYXRhOiBsb2cgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh1dG1lLnNldHRpbmdzLmdldChcImNvbnNvbGVMb2dnaW5nXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5sb2cobG9nKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBsb2FkU2NlbmFyaW86IGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAganNvbnA6IFwiY2FsbGJhY2tcIixcblxuICAgICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuXG4gICAgICAgICAgICBjcm9zc0RvbWFpbjogdHJ1ZSxcblxuICAgICAgICAgICAgdXJsOiAgZ2V0QmFzZVVSTCgpICsgXCJzY2VuYXJpby9cIiArIG5hbWUsXG5cbiAgICAgICAgICAgIC8vIHRlbGwgalF1ZXJ5IHdlJ3JlIGV4cGVjdGluZyBKU09OUFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvbnBcIixcblxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHNhdmVTY2VuYXJpbzogZnVuY3Rpb24gKHNjZW5hcmlvKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBnZXRCYXNlVVJMKCkgKyBcInNjZW5hcmlvXCIsXG4gICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoc2NlbmFyaW8sIG51bGwsIFwiIFwiKSxcbiAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgbG9hZFNldHRpbmdzOiBmdW5jdGlvbiAoY2FsbGJhY2ssIGVycm9yKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJ0ZXh0L3BsYW47IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxuICAgICAgICAgICAgdXJsOiAgZ2V0QmFzZVVSTCgpICsgXCJzZXR0aW5nc1wiLFxuICAgICAgICAgICAgLy8gdGVsbCBqUXVlcnkgd2UncmUgZXhwZWN0aW5nIEpTT05QXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG51dG1lLnJlZ2lzdGVyUmVwb3J0SGFuZGxlcihzZXJ2ZXJSZXBvcnRlcik7XG51dG1lLnJlZ2lzdGVyTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNjZW5hcmlvKTtcbnV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5zYXZlU2NlbmFyaW8pO1xudXRtZS5yZWdpc3RlclNldHRpbmdzTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNldHRpbmdzKTtcblxuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyQnlOYW1lKG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM0psY0c5eWRHVnljeTl6WlhKMlpYSXRjbVZ3YjNKMFpYSXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOW9iMjFsTDJSaGRtbGtkR2wwZEhOM2IzSjBhQzl3Y205cVpXTjBjeTkxZEcxbEwzTnlZeTlxY3k5eVpYQnZjblJsY25NdmMyVnlkbVZ5TFhKbGNHOXlkR1Z5TG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJMRWxCUVVrc1NVRkJTU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXpzN1FVRkZha01zVTBGQlV5eFZRVUZWTEVsQlFVazdSVUZEY2tJc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1ZVRkJWU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNWVUZCVlN4SFFVRkhMR3RDUVVGclFpeERRVUZETEd0Q1FVRnJRaXhEUVVGRExFbEJRVWtzYzBKQlFYTkNMRU5CUVVNN1FVRkRlRWtzUTBGQlF6czdRVUZGUkN4SlFVRkpMR05CUVdNc1IwRkJSenRKUVVOcVFpeExRVUZMTEVWQlFVVXNWVUZCVlN4TFFVRkxMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJUdFJRVU53UXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRE8xVkJRMHdzU1VGQlNTeEZRVUZGTEUxQlFVMDdWVUZEV2l4SFFVRkhMRVZCUVVVc1ZVRkJWU3hGUVVGRkxFZEJRVWNzVDBGQlR6dFZRVU16UWl4SlFVRkpMRVZCUVVVc1JVRkJSU3hKUVVGSkxFVkJRVVVzUzBGQlN5eEZRVUZGTzFWQlEzSkNMRkZCUVZFc1JVRkJSU3hOUVVGTk8xTkJRMnBDTEVOQlFVTXNRMEZCUXp0UlFVTklMRWxCUVVrc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zUlVGQlJUdFZRVU4yUXl4UFFVRlBMRU5CUVVNc1MwRkJTeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzFOQlEzUkNPMHRCUTBvN1NVRkRSQ3hQUVVGUExFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSVHRSUVVONFF5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRPMVZCUTB3c1NVRkJTU3hGUVVGRkxFMUJRVTA3VlVGRFdpeEhRVUZITEVWQlFVVXNWVUZCVlN4RlFVRkZMRWRCUVVjc1UwRkJVenRWUVVNM1FpeEpRVUZKTEVWQlFVVXNSVUZCUlN4SlFVRkpMRVZCUVVVc1QwRkJUeXhGUVVGRk8xVkJRM1pDTEZGQlFWRXNSVUZCUlN4TlFVRk5PMU5CUTJwQ0xFTkJRVU1zUTBGQlF6dFJRVU5JTEVsQlFVa3NTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1JVRkJSVHRWUVVOMlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8xTkJRM1JDTzB0QlEwbzdTVUZEUkN4SFFVRkhMRVZCUVVVc1ZVRkJWU3hIUVVGSExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlR0UlFVTm9ReXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETzFWQlEwd3NTVUZCU1N4RlFVRkZMRTFCUVUwN1ZVRkRXaXhIUVVGSExFZEJRVWNzVlVGQlZTeEZRVUZGTEVkQlFVY3NTMEZCU3p0VlFVTXhRaXhKUVVGSkxFVkJRVVVzUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RlFVRkZPMVZCUTI1Q0xGRkJRVkVzUlVGQlJTeE5RVUZOTzFOQlEycENMRU5CUVVNc1EwRkJRenRSUVVOSUxFbEJRVWtzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNSVUZCUlR0VlFVTjJReXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUTJ4Q08wRkJRMVFzUzBGQlN6czdTVUZGUkN4WlFVRlpMRVZCUVVVc1ZVRkJWU3hKUVVGSkxFVkJRVVVzVVVGQlVTeEZRVUZGTzFGQlEzQkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU03UVVGRFppeFpRVUZaTEV0QlFVc3NSVUZCUlN4VlFVRlZPenRCUVVVM1FpeFpRVUZaTEZkQlFWY3NSVUZCUlN4cFEwRkJhVU03TzBGQlJURkVMRmxCUVZrc1YwRkJWeXhGUVVGRkxFbEJRVWs3TzBGQlJUZENMRmxCUVZrc1IwRkJSeXhIUVVGSExGVkJRVlVzUlVGQlJTeEhRVUZITEZkQlFWY3NSMEZCUnl4SlFVRkpPMEZCUTI1RU96dEJRVVZCTEZsQlFWa3NVVUZCVVN4RlFVRkZMRTlCUVU4N08xbEJSV3BDTEU5QlFVOHNSVUZCUlN4VlFVRlZMRWxCUVVrc1JVRkJSVHRuUWtGRGNrSXNVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRMnhDTzFOQlEwb3NRMEZCUXl4RFFVRkRPMEZCUTFnc1MwRkJTenM3U1VGRlJDeFpRVUZaTEVWQlFVVXNWVUZCVlN4UlFVRlJMRVZCUVVVN1VVRkRPVUlzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXp0VlFVTk1MRWxCUVVrc1JVRkJSU3hOUVVGTk8xVkJRMW9zUjBGQlJ5eEZRVUZGTEZWQlFWVXNSVUZCUlN4SFFVRkhMRlZCUVZVN1ZVRkRPVUlzU1VGQlNTeEZRVUZGTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVOQlFVTTdWVUZEZWtNc1VVRkJVU3hGUVVGRkxFMUJRVTA3VlVGRGFFSXNWMEZCVnl4RlFVRkZMR3RDUVVGclFqdFRRVU5vUXl4RFFVRkRMRU5CUVVNN1FVRkRXQ3hMUVVGTE96dEpRVVZFTEZsQlFWa3NSVUZCUlN4VlFVRlZMRkZCUVZFc1JVRkJSU3hMUVVGTExFVkJRVVU3VVVGRGNrTXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOSUxGZEJRVmNzUlVGQlJTd3dRa0ZCTUVJN1dVRkRka01zVjBGQlZ5eEZRVUZGTEVsQlFVazdRVUZETjBJc1dVRkJXU3hIUVVGSExFZEJRVWNzVlVGQlZTeEZRVUZGTEVkQlFVY3NWVUZCVlRzN1FVRkZNME1zV1VGQldTeFJRVUZSTEVWQlFVVXNUVUZCVFRzN1dVRkZhRUlzVDBGQlR5eEZRVUZGTEZWQlFWVXNTVUZCU1N4RlFVRkZPMmRDUVVOeVFpeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1lVRkRiRUk3V1VGRFJDeExRVUZMTEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVN1owSkJRMnhDTEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRoUVVOa08xTkJRMG9zUTBGQlF5eERRVUZETzB0QlEwNDdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzU1VGQlNTeERRVUZETEhGQ1FVRnhRaXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZETzBGQlF6TkRMRWxCUVVrc1EwRkJReXh0UWtGQmJVSXNRMEZCUXl4alFVRmpMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU03UVVGRGRFUXNTVUZCU1N4RFFVRkRMRzFDUVVGdFFpeERRVUZETEdOQlFXTXNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRCUVVOMFJDeEpRVUZKTEVOQlFVTXNNa0pCUVRKQ0xFTkJRVU1zWTBGQll5eERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRPenRCUVVVNVJDeFRRVUZUTEd0Q1FVRnJRaXhEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU01UWl4SlFVRkpMRWRCUVVjc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eE5RVUZOTEVWQlFVVXNTMEZCU3l4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXp0SlFVTXhSQ3hKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEUxQlFVMHNRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hIUVVGSExGZEJRVmNzUTBGQlF6dFJRVU5xUkN4UFFVRlBMRWRCUVVjc1MwRkJTeXhEUVVGRExFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1NVRkRNVU1zVDBGQlR5eFBRVUZQTEV0QlFVc3NTVUZCU1N4SFFVRkhMRVZCUVVVc1IwRkJSeXhyUWtGQmEwSXNRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEV0QlFVc3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lkbUZ5SUhWMGJXVWdQU0J5WlhGMWFYSmxLQ2N1TGk5MWRHMWxMbXB6SnlrN1hHNWNibVoxYm1OMGFXOXVJR2RsZEVKaGMyVlZVa3dnS0NrZ2UxeHVJQ0J5WlhSMWNtNGdkWFJ0WlM1emRHRjBaU0FtSmlCMWRHMWxMbk4wWVhSbExuUmxjM1JUWlhKMlpYSWdQeUIxZEcxbExuTjBZWFJsTG5SbGMzUlRaWEoyWlhJZ09pQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9YQ0oxZEcxbFgzUmxjM1JmYzJWeWRtVnlYQ0lwSUh4OElGd2lhSFIwY0Rvdkx6QXVNQzR3TGpBNk9UQTBNeTljSWp0Y2JuMWNibHh1ZG1GeUlITmxjblpsY2xKbGNHOXlkR1Z5SUQwZ2UxeHVJQ0FnSUdWeWNtOXlPaUJtZFc1amRHbHZiaUFvWlhKeWIzSXNJSE5qWlc1aGNtbHZMQ0IxZEcxbEtTQjdYRzRnSUNBZ0lDQWdJQ1F1WVdwaGVDaDdYRzRnSUNBZ0lDQWdJQ0FnZEhsd1pUb2dYQ0pRVDFOVVhDSXNYRzRnSUNBZ0lDQWdJQ0FnZFhKc09pQm5aWFJDWVhObFZWSk1LQ2tnS3lCY0ltVnljbTl5WENJc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVRvZ2V5QmtZWFJoT2lCbGNuSnZjaUI5TEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0ZVZVhCbE9pQmNJbXB6YjI1Y0lseHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIVjBiV1V1YzJWMGRHbHVaM011WjJWMEtGd2lZMjl1YzI5c1pVeHZaMmRwYm1kY0lpa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG1WeWNtOXlLR1Z5Y205eUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2MzVmpZMlZ6Y3pvZ1puVnVZM1JwYjI0Z0tITjFZMk5sYzNNc0lITmpaVzVoY21sdkxDQjFkRzFsS1NCN1hHNGdJQ0FnSUNBZ0lDUXVZV3BoZUNoN1hHNGdJQ0FnSUNBZ0lDQWdkSGx3WlRvZ1hDSlFUMU5VWENJc1hHNGdJQ0FnSUNBZ0lDQWdkWEpzT2lCblpYUkNZWE5sVlZKTUtDa2dLeUJjSW5OMVkyTmxjM05jSWl4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoT2lCN0lHUmhkR0U2SUhOMVkyTmxjM01nZlN4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoVkhsd1pUb2dYQ0pxYzI5dVhDSmNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG5ObGRIUnBibWR6TG1kbGRDaGNJbU52Ym5OdmJHVk1iMmRuYVc1blhDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ1kyOXVjMjlzWlM1c2IyY29jM1ZqWTJWemN5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lHeHZaem9nWm5WdVkzUnBiMjRnS0d4dlp5d2djMk5sYm1GeWFXOHNJSFYwYldVcElIdGNiaUFnSUNBZ0lDQWdKQzVoYW1GNEtIdGNiaUFnSUNBZ0lDQWdJQ0IwZVhCbE9pQmNJbEJQVTFSY0lpeGNiaUFnSUNBZ0lDQWdJQ0IxY213NklDQm5aWFJDWVhObFZWSk1LQ2tnS3lCY0lteHZaMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0U2SUhzZ1pHRjBZVG9nYkc5bklIMHNYRzRnSUNBZ0lDQWdJQ0FnWkdGMFlWUjVjR1U2SUZ3aWFuTnZibHdpWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXpaWFIwYVc1bmN5NW5aWFFvWENKamIyNXpiMnhsVEc5bloybHVaMXdpS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJR052Ym5OdmJHVXViRzluS0d4dlp5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdiRzloWkZOalpXNWhjbWx2T2lCbWRXNWpkR2x2YmlBb2JtRnRaU3dnWTJGc2JHSmhZMnNwSUh0Y2JpQWdJQ0FnSUNBZ0pDNWhhbUY0S0h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3B6YjI1d09pQmNJbU5oYkd4aVlXTnJYQ0lzWEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUlVlWEJsT2lCY0ltRndjR3hwWTJGMGFXOXVMMnB6YjI0N0lHTm9ZWEp6WlhROWRYUm1MVGhjSWl4Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnWTNKdmMzTkViMjFoYVc0NklIUnlkV1VzWEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0lHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWMyTmxibUZ5YVc4dlhDSWdLeUJ1WVcxbExGeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QjBaV3hzSUdwUmRXVnllU0IzWlNkeVpTQmxlSEJsWTNScGJtY2dTbE5QVGxCY2JpQWdJQ0FnSUNBZ0lDQWdJR1JoZEdGVWVYQmxPaUJjSW1wemIyNXdYQ0lzWEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSE4xWTJObGMzTTZJR1oxYm1OMGFXOXVJQ2h5WlhOd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZMkZzYkdKaFkyc29jbVZ6Y0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCellYWmxVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h6WTJWdVlYSnBieWtnZTF4dUlDQWdJQ0FnSUNBa0xtRnFZWGdvZTF4dUlDQWdJQ0FnSUNBZ0lIUjVjR1U2SUZ3aVVFOVRWRndpTEZ4dUlDQWdJQ0FnSUNBZ0lIVnliRG9nWjJWMFFtRnpaVlZTVENncElDc2dYQ0p6WTJWdVlYSnBiMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0U2SUVwVFQwNHVjM1J5YVc1bmFXWjVLSE5qWlc1aGNtbHZMQ0J1ZFd4c0xDQmNJaUJjSWlrc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJQ2RxYzI5dUp5eGNiaUFnSUNBZ0lDQWdJQ0JqYjI1MFpXNTBWSGx3WlRvZ1hDSmhjSEJzYVdOaGRHbHZiaTlxYzI5dVhDSmNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJR3h2WVdSVFpYUjBhVzVuY3pvZ1puVnVZM1JwYjI0Z0tHTmhiR3hpWVdOckxDQmxjbkp2Y2lrZ2UxeHVJQ0FnSUNBZ0lDQWtMbUZxWVhnb2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWRHVnVkRlI1Y0dVNklGd2lkR1Y0ZEM5d2JHRnVPeUJqYUdGeWMyVjBQWFYwWmkwNFhDSXNYRzRnSUNBZ0lDQWdJQ0FnSUNCamNtOXpjMFJ2YldGcGJqb2dkSEoxWlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0lHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWMyVjBkR2x1WjNOY0lpeGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklIUmxiR3dnYWxGMVpYSjVJSGRsSjNKbElHVjRjR1ZqZEdsdVp5QktVMDlPVUZ4dUlDQWdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJRndpYW5OdmJsd2lMRnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkV05qWlhOek9pQm1kVzVqZEdsdmJpQW9jbVZ6Y0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTmhiR3hpWVdOcktISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnljbTl5T2lCbWRXNWpkR2x2YmlBb1pYSnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSW9aWEp5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlZ4dWZUdGNibHh1ZFhSdFpTNXlaV2RwYzNSbGNsSmxjRzl5ZEVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXBPMXh1ZFhSdFpTNXlaV2RwYzNSbGNreHZZV1JJWVc1a2JHVnlLSE5sY25abGNsSmxjRzl5ZEdWeUxteHZZV1JUWTJWdVlYSnBieWs3WEc1MWRHMWxMbkpsWjJsemRHVnlVMkYyWlVoaGJtUnNaWElvYzJWeWRtVnlVbVZ3YjNKMFpYSXVjMkYyWlZOalpXNWhjbWx2S1R0Y2JuVjBiV1V1Y21WbmFYTjBaWEpUWlhSMGFXNW5jMHh2WVdSSVlXNWtiR1Z5S0hObGNuWmxjbEpsY0c5eWRHVnlMbXh2WVdSVFpYUjBhVzVuY3lrN1hHNWNibVoxYm1OMGFXOXVJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2h1WVcxbEtTQjdYRzRnSUNBZ2JtRnRaU0E5SUc1aGJXVXVjbVZ3YkdGalpTZ3ZXMXhjVzEwdkxDQmNJbHhjWEZ4YlhDSXBMbkpsY0d4aFkyVW9MMXRjWEYxZEx5d2dYQ0pjWEZ4Y1hWd2lLVHRjYmlBZ0lDQjJZWElnY21WblpYZ2dQU0J1WlhjZ1VtVm5SWGh3S0Z3aVcxeGNYRncvSmwxY0lpQXJJRzVoYldVZ0t5QmNJajBvVzE0bUkxMHFLVndpS1N4Y2JpQWdJQ0FnSUNBZ2NtVnpkV3gwY3lBOUlISmxaMlY0TG1WNFpXTW9iRzlqWVhScGIyNHVjMlZoY21Ob0tUdGNiaUFnSUNCeVpYUjFjbTRnY21WemRXeDBjeUE5UFQwZ2JuVnNiQ0EvSUZ3aVhDSWdPaUJrWldOdlpHVlZVa2xEYjIxd2IyNWxiblFvY21WemRXeDBjMXN4WFM1eVpYQnNZV05sS0M5Y1hDc3ZaeXdnWENJZ1hDSXBLVHRjYm4waVhYMD0iLCJcblxuLyoqXG4qIEdlbmVyYXRlIHVuaXF1ZSBDU1Mgc2VsZWN0b3IgZm9yIGdpdmVuIERPTSBlbGVtZW50XG4qXG4qIEBwYXJhbSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7U3RyaW5nfVxuKiBAYXBpIHByaXZhdGVcbiovXG5cbmZ1bmN0aW9uIHVuaXF1ZShlbCwgZG9jKSB7XG4gIGlmICghZWwgfHwgIWVsLnRhZ05hbWUpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFbGVtZW50IGV4cGVjdGVkJyk7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0U2VsZWN0b3JJbmRleChlbGVtZW50LCBzZWxlY3Rvcikge1xuICAgICAgdmFyIGV4aXN0aW5nSW5kZXggPSAwO1xuICAgICAgdmFyIGl0ZW1zID0gIGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChpdGVtc1tpXSA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgICBleGlzdGluZ0luZGV4ID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXN0aW5nSW5kZXg7XG4gIH1cblxuICB2YXIgZWxTZWxlY3RvciA9IGdldEVsZW1lbnRTZWxlY3RvcihlbCkuc2VsZWN0b3I7XG4gIHZhciBpc1NpbXBsZVNlbGVjdG9yID0gZWxTZWxlY3RvciA9PT0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgYW5jZXN0b3JTZWxlY3RvcjtcblxuICB2YXIgY3VyckVsZW1lbnQgPSBlbDtcbiAgd2hpbGUgKGN1cnJFbGVtZW50LnBhcmVudEVsZW1lbnQgIT0gbnVsbCAmJiAhYW5jZXN0b3JTZWxlY3Rvcikge1xuICAgICAgY3VyckVsZW1lbnQgPSBjdXJyRWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgdmFyIHNlbGVjdG9yID0gZ2V0RWxlbWVudFNlbGVjdG9yKGN1cnJFbGVtZW50KS5zZWxlY3RvcjtcblxuICAgICAgLy8gVHlwaWNhbGx5IGVsZW1lbnRzIHRoYXQgaGF2ZSBhIGNsYXNzIG5hbWUgb3IgdGl0bGUsIHRob3NlIGFyZSBsZXNzIGxpa2VseVxuICAgICAgLy8gdG8gY2hhbmdlLCBhbmQgYWxzbyBiZSB1bmlxdWUuICBTbywgd2UgYXJlIHRyeWluZyB0byBmaW5kIGFuIGFuY2VzdG9yXG4gICAgICAvLyB0byBhbmNob3IgKG9yIHNjb3BlKSB0aGUgc2VhcmNoIGZvciB0aGUgZWxlbWVudCwgYW5kIG1ha2UgaXQgbGVzcyBicml0dGxlLlxuICAgICAgaWYgKHNlbGVjdG9yICE9PSBjdXJyRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICBhbmNlc3RvclNlbGVjdG9yID0gc2VsZWN0b3IgKyAoY3VyckVsZW1lbnQgPT09IGVsLnBhcmVudEVsZW1lbnQgJiYgaXNTaW1wbGVTZWxlY3RvciA/IFwiID4gXCIgOiBcIiBcIikgKyBlbFNlbGVjdG9yO1xuICAgICAgfVxuICB9XG5cbiAgdmFyIGZpbmFsU2VsZWN0b3JzID0gW107XG4gIGlmIChhbmNlc3RvclNlbGVjdG9yKSB7XG4gICAgZmluYWxTZWxlY3RvcnMucHVzaChcbiAgICAgIGFuY2VzdG9yU2VsZWN0b3IgKyBcIjplcShcIiArIF9nZXRTZWxlY3RvckluZGV4KGVsLCBhbmNlc3RvclNlbGVjdG9yKSArIFwiKVwiXG4gICAgKTtcbiAgfVxuXG4gIGZpbmFsU2VsZWN0b3JzLnB1c2goZWxTZWxlY3RvciArIFwiOmVxKFwiICsgX2dldFNlbGVjdG9ySW5kZXgoZWwsIGVsU2VsZWN0b3IpICsgXCIpXCIpO1xuICByZXR1cm4gZmluYWxTZWxlY3RvcnM7XG59O1xuXG4vKipcbiogR2V0IGNsYXNzIG5hbWVzIGZvciBhbiBlbGVtZW50XG4qXG4qIEBwYXJhcm0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge0FycmF5fVxuKi9cblxuZnVuY3Rpb24gZ2V0Q2xhc3NOYW1lcyhlbCkge1xuICB2YXIgY2xhc3NOYW1lID0gZWwuZ2V0QXR0cmlidXRlKCdjbGFzcycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtdmVyaWZ5JywgJycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtcmVhZHknLCAnJyk7XG5cbiAgaWYgKCFjbGFzc05hbWUgfHwgKCFjbGFzc05hbWUudHJpbSgpLmxlbmd0aCkpIHsgcmV0dXJuIFtdOyB9XG5cbiAgLy8gcmVtb3ZlIGR1cGxpY2F0ZSB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG5cbiAgLy8gdHJpbSBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG5cbiAgLy8gc3BsaXQgaW50byBzZXBhcmF0ZSBjbGFzc25hbWVzXG4gIHJldHVybiBjbGFzc05hbWUudHJpbSgpLnNwbGl0KCcgJyk7XG59XG5cbi8qKlxuKiBDU1Mgc2VsZWN0b3JzIHRvIGdlbmVyYXRlIHVuaXF1ZSBzZWxlY3RvciBmb3IgRE9NIGVsZW1lbnRcbipcbiogQHBhcmFtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtBcnJheX1cbiogQGFwaSBwcnZpYXRlXG4qL1xuXG5mdW5jdGlvbiBnZXRFbGVtZW50U2VsZWN0b3IoZWwsIGlzVW5pcXVlKSB7XG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgbGFiZWwgPSBudWxsO1xuICB2YXIgdGl0bGUgPSBudWxsO1xuICB2YXIgYWx0ICAgPSBudWxsO1xuICB2YXIgbmFtZSAgPSBudWxsO1xuICB2YXIgdmFsdWUgPSBudWxsO1xuICB2YXIgbWUgPSBlbDtcblxuICAvLyBkbyB7XG5cbiAgLy8gSURzIGFyZSB1bmlxdWUgZW5vdWdoXG4gIGlmIChlbC5pZCkge1xuICAgIGxhYmVsID0gJ1tpZD1cXCcnICsgZWwuaWQgKyBcIlxcJ11cIjtcbiAgfSBlbHNlIHtcbiAgICAvLyBPdGhlcndpc2UsIHVzZSB0YWcgbmFtZVxuICAgIGxhYmVsICAgICA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIHZhciBjbGFzc05hbWVzID0gZ2V0Q2xhc3NOYW1lcyhlbCk7XG5cbiAgICAvLyBUYWcgbmFtZXMgY291bGQgdXNlIGNsYXNzZXMgZm9yIHNwZWNpZmljaXR5XG4gICAgaWYgKGNsYXNzTmFtZXMubGVuZ3RoKSB7XG4gICAgICBsYWJlbCArPSAnLicgKyBjbGFzc05hbWVzLmpvaW4oJy4nKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaXRsZXMgJiBBbHQgYXR0cmlidXRlcyBhcmUgdmVyeSB1c2VmdWwgZm9yIHNwZWNpZmljaXR5IGFuZCB0cmFja2luZ1xuICBpZiAodGl0bGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykpIHtcbiAgICBsYWJlbCArPSAnW3RpdGxlPVwiJyArIHRpdGxlICsgJ1wiXSc7XG4gIH0gZWxzZSBpZiAoYWx0ID0gZWwuZ2V0QXR0cmlidXRlKCdhbHQnKSkge1xuICAgIGxhYmVsICs9ICdbYWx0PVwiJyArIGFsdCArICdcIl0nO1xuICB9IGVsc2UgaWYgKG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgIGxhYmVsICs9ICdbbmFtZT1cIicgKyBuYW1lICsgJ1wiXSc7XG4gIH1cblxuICBpZiAodmFsdWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykpIHtcbiAgICBsYWJlbCArPSAnW3ZhbHVlPVwiJyArIHZhbHVlICsgJ1wiXSc7XG4gIH1cblxuICAvLyBpZiAoZWwuaW5uZXJUZXh0Lmxlbmd0aCAhPSAwKSB7XG4gIC8vICAgbGFiZWwgKz0gJzpjb250YWlucygnICsgZWwuaW5uZXJUZXh0ICsgJyknO1xuICAvLyB9XG5cbiAgcGFydHMudW5zaGlmdCh7XG4gICAgZWxlbWVudDogZWwsXG4gICAgc2VsZWN0b3I6IGxhYmVsXG4gIH0pO1xuXG4gIC8vIGlmIChpc1VuaXF1ZShwYXJ0cykpIHtcbiAgLy8gICAgIGJyZWFrO1xuICAvLyB9XG5cbiAgLy8gfSB3aGlsZSAoIWVsLmlkICYmIChlbCA9IGVsLnBhcmVudE5vZGUpICYmIGVsLnRhZ05hbWUpO1xuXG4gIC8vIFNvbWUgc2VsZWN0b3JzIHNob3VsZCBoYXZlIG1hdGNoZWQgYXQgbGVhc3RcbiAgaWYgKCFwYXJ0cy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBpZGVudGlmeSBDU1Mgc2VsZWN0b3InKTtcbiAgfVxuICByZXR1cm4gcGFydHNbMF07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdW5pcXVlO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzTmxiR1ZqZEc5eVJtbHVaR1Z5TG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZjMlZzWldOMGIzSkdhVzVrWlhJdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3TzBGQlJVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVGRlFTeEZRVUZGT3p0QlFVVkdMRk5CUVZNc1RVRkJUU3hEUVVGRExFVkJRVVVzUlVGQlJTeEhRVUZITEVWQlFVVTdSVUZEZGtJc1NVRkJTU3hEUVVGRExFVkJRVVVzU1VGQlNTeERRVUZETEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVN1NVRkRkRUlzVFVGQlRTeEpRVUZKTEZOQlFWTXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZETzBGQlF6VkRMRWRCUVVjN08wVkJSVVFzVTBGQlV5eHBRa0ZCYVVJc1EwRkJReXhQUVVGUExFVkJRVVVzVVVGQlVTeEZRVUZGTzAxQlF6RkRMRWxCUVVrc1lVRkJZU3hIUVVGSExFTkJRVU1zUTBGQlF6dEJRVU0xUWl4TlFVRk5MRWxCUVVrc1MwRkJTeXhKUVVGSkxFZEJRVWNzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6czdUVUZGTlVNc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRXRCUVVzc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdWVUZEYmtNc1NVRkJTU3hMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETEV0QlFVc3NUMEZCVHl4RlFVRkZPMk5CUTNSQ0xHRkJRV0VzUjBGQlJ5eERRVUZETEVOQlFVTTdZMEZEYkVJc1RVRkJUVHRYUVVOVU8wOUJRMG83VFVGRFJDeFBRVUZQTEdGQlFXRXNRMEZCUXp0QlFVTXpRaXhIUVVGSE96dEZRVVZFTEVsQlFVa3NWVUZCVlN4SFFVRkhMR3RDUVVGclFpeERRVUZETEVWQlFVVXNRMEZCUXl4RFFVRkRMRkZCUVZFc1EwRkJRenRGUVVOcVJDeEpRVUZKTEdkQ1FVRm5RaXhIUVVGSExGVkJRVlVzUzBGQlN5eEZRVUZGTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1JVRkJSU3hEUVVGRE8wRkJRMnBGTEVWQlFVVXNTVUZCU1N4blFrRkJaMElzUTBGQlF6czdSVUZGY2tJc1NVRkJTU3hYUVVGWExFZEJRVWNzUlVGQlJTeERRVUZETzBWQlEzSkNMRTlCUVU4c1YwRkJWeXhEUVVGRExHRkJRV0VzU1VGQlNTeEpRVUZKTEVsQlFVa3NRMEZCUXl4blFrRkJaMElzUlVGQlJUdE5RVU16UkN4WFFVRlhMRWRCUVVjc1YwRkJWeXhEUVVGRExHRkJRV0VzUTBGQlF6dEJRVU01UXl4TlFVRk5MRWxCUVVrc1VVRkJVU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRmRCUVZjc1EwRkJReXhEUVVGRExGRkJRVkVzUTBGQlF6dEJRVU01UkR0QlFVTkJPMEZCUTBFN08wMUJSVTBzU1VGQlNTeFJRVUZSTEV0QlFVc3NWMEZCVnl4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzUlVGQlJUdFZRVU5vUkN4blFrRkJaMElzUjBGQlJ5eFJRVUZSTEVsQlFVa3NWMEZCVnl4TFFVRkxMRVZCUVVVc1EwRkJReXhoUVVGaExFbEJRVWtzWjBKQlFXZENMRWRCUVVjc1MwRkJTeXhIUVVGSExFZEJRVWNzUTBGQlF5eEhRVUZITEZWQlFWVXNRMEZCUXp0UFFVTnVTRHRCUVVOUUxFZEJRVWM3TzBWQlJVUXNTVUZCU1N4alFVRmpMRWRCUVVjc1JVRkJSU3hEUVVGRE8wVkJRM2hDTEVsQlFVa3NaMEpCUVdkQ0xFVkJRVVU3U1VGRGNFSXNZMEZCWXl4RFFVRkRMRWxCUVVrN1RVRkRha0lzWjBKQlFXZENMRWRCUVVjc1RVRkJUU3hIUVVGSExHbENRVUZwUWl4RFFVRkRMRVZCUVVVc1JVRkJSU3huUWtGQlowSXNRMEZCUXl4SFFVRkhMRWRCUVVjN1MwRkRNVVVzUTBGQlF6dEJRVU5PTEVkQlFVYzdPMFZCUlVRc1kwRkJZeXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEVkQlFVY3NUVUZCVFN4SFFVRkhMR2xDUVVGcFFpeERRVUZETEVWQlFVVXNSVUZCUlN4VlFVRlZMRU5CUVVNc1IwRkJSeXhIUVVGSExFTkJRVU1zUTBGQlF6dEZRVU51Uml4UFFVRlBMR05CUVdNc1EwRkJRenRCUVVONFFpeERRVUZETEVOQlFVTTdPMEZCUlVZN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGQlJVRXNSVUZCUlRzN1FVRkZSaXhUUVVGVExHRkJRV0VzUTBGQlF5eEZRVUZGTEVWQlFVVTdSVUZEZWtJc1NVRkJTU3hUUVVGVExFZEJRVWNzUlVGQlJTeERRVUZETEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRGUVVONlF5eFRRVUZUTEVkQlFVY3NVMEZCVXl4SlFVRkpMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zWVVGQllTeEZRVUZGTEVWQlFVVXNRMEZCUXl4RFFVRkRPMEZCUTJoRkxFVkJRVVVzVTBGQlV5eEhRVUZITEZOQlFWTXNTVUZCU1N4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGbEJRVmtzUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXpzN1FVRkZMMFFzUlVGQlJTeEpRVUZKTEVOQlFVTXNVMEZCVXl4TFFVRkxMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETEUxQlFVMHNRMEZCUXl4RlFVRkZMRVZCUVVVc1QwRkJUeXhGUVVGRkxFTkJRVU1zUlVGQlJUdEJRVU01UkRzN1FVRkZRU3hGUVVGRkxGTkJRVk1zUjBGQlJ5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRTFCUVUwc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6dEJRVU0zUXpzN1FVRkZRU3hGUVVGRkxGTkJRVk1zUjBGQlJ5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmxCUVZrc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF6dEJRVU5zUkRzN1JVRkZSU3hQUVVGUExGTkJRVk1zUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGNrTXNRMEZCUXpzN1FVRkZSRHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3p0QlFVVkJMRVZCUVVVN08wRkJSVVlzVTBGQlV5eHJRa0ZCYTBJc1EwRkJReXhGUVVGRkxFVkJRVVVzVVVGQlVTeEZRVUZGTzBWQlEzaERMRWxCUVVrc1MwRkJTeXhIUVVGSExFVkJRVVVzUTBGQlF6dEZRVU5tTEVsQlFVa3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJRenRGUVVOcVFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNN1JVRkRha0lzU1VGQlNTeEhRVUZITEV0QlFVc3NTVUZCU1N4RFFVRkRPMFZCUTJwQ0xFbEJRVWtzU1VGQlNTeEpRVUZKTEVsQlFVa3NRMEZCUXp0RlFVTnFRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEYmtJc1JVRkJSU3hKUVVGSkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEVOQlFVTTdRVUZEWkR0QlFVTkJPMEZCUTBFN08wVkJSVVVzU1VGQlNTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMGxCUTFRc1MwRkJTeXhIUVVGSExGRkJRVkVzUjBGQlJ5eEZRVUZGTEVOQlFVTXNSVUZCUlN4SFFVRkhMRXRCUVVzc1EwRkJRenRCUVVOeVF5eEhRVUZITEUxQlFVMDdPMEZCUlZRc1NVRkJTU3hMUVVGTExFOUJRVThzUlVGQlJTeERRVUZETEU5QlFVOHNRMEZCUXl4WFFVRlhMRVZCUVVVc1EwRkJRenM3UVVGRmVrTXNTVUZCU1N4SlFVRkpMRlZCUVZVc1IwRkJSeXhoUVVGaExFTkJRVU1zUlVGQlJTeERRVUZETEVOQlFVTTdRVUZEZGtNN08wbEJSVWtzU1VGQlNTeFZRVUZWTEVOQlFVTXNUVUZCVFN4RlFVRkZPMDFCUTNKQ0xFdEJRVXNzU1VGQlNTeEhRVUZITEVkQlFVY3NWVUZCVlN4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dExRVU55UXp0QlFVTk1MRWRCUVVjN1FVRkRTRHM3UlVGRlJTeEpRVUZKTEV0QlFVc3NSMEZCUnl4RlFVRkZMRU5CUVVNc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eEZRVUZGTzBsQlEzQkRMRXRCUVVzc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0SFFVTndReXhOUVVGTkxFbEJRVWtzUjBGQlJ5eEhRVUZITEVWQlFVVXNRMEZCUXl4WlFVRlpMRU5CUVVNc1MwRkJTeXhEUVVGRExFVkJRVVU3U1VGRGRrTXNTMEZCU3l4SlFVRkpMRkZCUVZFc1IwRkJSeXhIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETzBkQlEyaERMRTFCUVUwc1NVRkJTU3hKUVVGSkxFZEJRVWNzUlVGQlJTeERRVUZETEZsQlFWa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSVHRKUVVONlF5eExRVUZMTEVsQlFVa3NVMEZCVXl4SFFVRkhMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRGNrTXNSMEZCUnpzN1JVRkZSQ3hKUVVGSkxFdEJRVXNzUjBGQlJ5eEZRVUZGTEVOQlFVTXNXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRk8wbEJRM0JETEV0QlFVc3NTVUZCU1N4VlFVRlZMRWRCUVVjc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEJRVU4yUXl4SFFVRkhPMEZCUTBnN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBWQlJVVXNTMEZCU3l4RFFVRkRMRTlCUVU4c1EwRkJRenRKUVVOYUxFOUJRVThzUlVGQlJTeEZRVUZGTzBsQlExZ3NVVUZCVVN4RlFVRkZMRXRCUVVzN1FVRkRia0lzUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEVER0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdSVUZGUlN4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFMUJRVTBzUlVGQlJUdEpRVU5xUWl4TlFVRk5MRWxCUVVrc1MwRkJTeXhEUVVGRExHbERRVUZwUXl4RFFVRkRMRU5CUVVNN1IwRkRjRVE3UlVGRFJDeFBRVUZQTEV0QlFVc3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOc1FpeERRVUZET3p0QlFVVkVMRTFCUVUwc1EwRkJReXhQUVVGUExFZEJRVWNzVFVGQlRTeERRVUZESWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaVhHNWNiaThxS2x4dUtpQkhaVzVsY21GMFpTQjFibWx4ZFdVZ1ExTlRJSE5sYkdWamRHOXlJR1p2Y2lCbmFYWmxiaUJFVDAwZ1pXeGxiV1Z1ZEZ4dUtseHVLaUJBY0dGeVlXMGdlMFZzWlcxbGJuUjlJR1ZzWEc0cUlFQnlaWFIxY200Z2UxTjBjbWx1WjMxY2Jpb2dRR0Z3YVNCd2NtbDJZWFJsWEc0cUwxeHVYRzVtZFc1amRHbHZiaUIxYm1seGRXVW9aV3dzSUdSdll5a2dlMXh1SUNCcFppQW9JV1ZzSUh4OElDRmxiQzUwWVdkT1lXMWxLU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduUld4bGJXVnVkQ0JsZUhCbFkzUmxaQ2NwTzF4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1gyZGxkRk5sYkdWamRHOXlTVzVrWlhnb1pXeGxiV1Z1ZEN3Z2MyVnNaV04wYjNJcElIdGNiaUFnSUNBZ0lIWmhjaUJsZUdsemRHbHVaMGx1WkdWNElEMGdNRHRjYmlBZ0lDQWdJSFpoY2lCcGRHVnRjeUE5SUNCa2IyTXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDaHpaV3hsWTNSdmNpazdYRzVjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYVhSbGJYTXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvYVhSbGJYTmJhVjBnUFQwOUlHVnNaVzFsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1pYaHBjM1JwYm1kSmJtUmxlQ0E5SUdrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhKbGRIVnliaUJsZUdsemRHbHVaMGx1WkdWNE8xeHVJQ0I5WEc1Y2JpQWdkbUZ5SUdWc1UyVnNaV04wYjNJZ1BTQm5aWFJGYkdWdFpXNTBVMlZzWldOMGIzSW9aV3dwTG5ObGJHVmpkRzl5TzF4dUlDQjJZWElnYVhOVGFXMXdiR1ZUWld4bFkzUnZjaUE5SUdWc1UyVnNaV04wYjNJZ1BUMDlJR1ZzTG5SaFowNWhiV1V1ZEc5TWIzZGxja05oYzJVb0tUdGNiaUFnZG1GeUlHRnVZMlZ6ZEc5eVUyVnNaV04wYjNJN1hHNWNiaUFnZG1GeUlHTjFjbkpGYkdWdFpXNTBJRDBnWld3N1hHNGdJSGRvYVd4bElDaGpkWEp5Uld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MElDRTlJRzUxYkd3Z0ppWWdJV0Z1WTJWemRHOXlVMlZzWldOMGIzSXBJSHRjYmlBZ0lDQWdJR04xY25KRmJHVnRaVzUwSUQwZ1kzVnlja1ZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZER0Y2JpQWdJQ0FnSUhaaGNpQnpaV3hsWTNSdmNpQTlJR2RsZEVWc1pXMWxiblJUWld4bFkzUnZjaWhqZFhKeVJXeGxiV1Z1ZENrdWMyVnNaV04wYjNJN1hHNWNiaUFnSUNBZ0lDOHZJRlI1Y0dsallXeHNlU0JsYkdWdFpXNTBjeUIwYUdGMElHaGhkbVVnWVNCamJHRnpjeUJ1WVcxbElHOXlJSFJwZEd4bExDQjBhRzl6WlNCaGNtVWdiR1Z6Y3lCc2FXdGxiSGxjYmlBZ0lDQWdJQzh2SUhSdklHTm9ZVzVuWlN3Z1lXNWtJR0ZzYzI4Z1ltVWdkVzVwY1hWbExpQWdVMjhzSUhkbElHRnlaU0IwY25scGJtY2dkRzhnWm1sdVpDQmhiaUJoYm1ObGMzUnZjbHh1SUNBZ0lDQWdMeThnZEc4Z1lXNWphRzl5SUNodmNpQnpZMjl3WlNrZ2RHaGxJSE5sWVhKamFDQm1iM0lnZEdobElHVnNaVzFsYm5Rc0lHRnVaQ0J0WVd0bElHbDBJR3hsYzNNZ1luSnBkSFJzWlM1Y2JpQWdJQ0FnSUdsbUlDaHpaV3hsWTNSdmNpQWhQVDBnWTNWeWNrVnNaVzFsYm5RdWRHRm5UbUZ0WlM1MGIweHZkMlZ5UTJGelpTZ3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2lBOUlITmxiR1ZqZEc5eUlDc2dLR04xY25KRmJHVnRaVzUwSUQwOVBTQmxiQzV3WVhKbGJuUkZiR1Z0Wlc1MElDWW1JR2x6VTJsdGNHeGxVMlZzWldOMGIzSWdQeUJjSWlBK0lGd2lJRG9nWENJZ1hDSXBJQ3NnWld4VFpXeGxZM1J2Y2p0Y2JpQWdJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lIWmhjaUJtYVc1aGJGTmxiR1ZqZEc5eWN5QTlJRnRkTzF4dUlDQnBaaUFvWVc1alpYTjBiM0pUWld4bFkzUnZjaWtnZTF4dUlDQWdJR1pwYm1Gc1UyVnNaV04wYjNKekxuQjFjMmdvWEc0Z0lDQWdJQ0JoYm1ObGMzUnZjbE5sYkdWamRHOXlJQ3NnWENJNlpYRW9YQ0lnS3lCZloyVjBVMlZzWldOMGIzSkpibVJsZUNobGJDd2dZVzVqWlhOMGIzSlRaV3hsWTNSdmNpa2dLeUJjSWlsY0lseHVJQ0FnSUNrN1hHNGdJSDFjYmx4dUlDQm1hVzVoYkZObGJHVmpkRzl5Y3k1d2RYTm9LR1ZzVTJWc1pXTjBiM0lnS3lCY0lqcGxjU2hjSWlBcklGOW5aWFJUWld4bFkzUnZja2x1WkdWNEtHVnNMQ0JsYkZObGJHVmpkRzl5S1NBcklGd2lLVndpS1R0Y2JpQWdjbVYwZFhKdUlHWnBibUZzVTJWc1pXTjBiM0p6TzF4dWZUdGNibHh1THlvcVhHNHFJRWRsZENCamJHRnpjeUJ1WVcxbGN5Qm1iM0lnWVc0Z1pXeGxiV1Z1ZEZ4dUtseHVLaUJBY0dGeVlYSnRJSHRGYkdWdFpXNTBmU0JsYkZ4dUtpQkFjbVYwZFhKdUlIdEJjbkpoZVgxY2Jpb3ZYRzVjYm1aMWJtTjBhVzl1SUdkbGRFTnNZWE56VG1GdFpYTW9aV3dwSUh0Y2JpQWdkbUZ5SUdOc1lYTnpUbUZ0WlNBOUlHVnNMbWRsZEVGMGRISnBZblYwWlNnblkyeGhjM01uS1R0Y2JpQWdZMnhoYzNOT1lXMWxJRDBnWTJ4aGMzTk9ZVzFsSUNZbUlHTnNZWE56VG1GdFpTNXlaWEJzWVdObEtDZDFkRzFsTFhabGNtbG1lU2NzSUNjbktUdGNiaUFnWTJ4aGMzTk9ZVzFsSUQwZ1kyeGhjM05PWVcxbElDWW1JR05zWVhOelRtRnRaUzV5WlhCc1lXTmxLQ2QxZEcxbExYSmxZV1I1Snl3Z0p5Y3BPMXh1WEc0Z0lHbG1JQ2doWTJ4aGMzTk9ZVzFsSUh4OElDZ2hZMnhoYzNOT1lXMWxMblJ5YVcwb0tTNXNaVzVuZEdncEtTQjdJSEpsZEhWeWJpQmJYVHNnZlZ4dVhHNGdJQzh2SUhKbGJXOTJaU0JrZFhCc2FXTmhkR1VnZDJocGRHVnpjR0ZqWlZ4dUlDQmpiR0Z6YzA1aGJXVWdQU0JqYkdGemMwNWhiV1V1Y21Wd2JHRmpaU2d2WEZ4ekt5OW5MQ0FuSUNjcE8xeHVYRzRnSUM4dklIUnlhVzBnYkdWaFpHbHVaeUJoYm1RZ2RISmhhV3hwYm1jZ2QyaHBkR1Z6Y0dGalpWeHVJQ0JqYkdGemMwNWhiV1VnUFNCamJHRnpjMDVoYldVdWNtVndiR0ZqWlNndlhseGNjeXQ4WEZ4ekt5UXZaeXdnSnljcE8xeHVYRzRnSUM4dklITndiR2wwSUdsdWRHOGdjMlZ3WVhKaGRHVWdZMnhoYzNOdVlXMWxjMXh1SUNCeVpYUjFjbTRnWTJ4aGMzTk9ZVzFsTG5SeWFXMG9LUzV6Y0d4cGRDZ25JQ2NwTzF4dWZWeHVYRzR2S2lwY2Jpb2dRMU5USUhObGJHVmpkRzl5Y3lCMGJ5Qm5aVzVsY21GMFpTQjFibWx4ZFdVZ2MyVnNaV04wYjNJZ1ptOXlJRVJQVFNCbGJHVnRaVzUwWEc0cVhHNHFJRUJ3WVhKaGJTQjdSV3hsYldWdWRIMGdaV3hjYmlvZ1FISmxkSFZ5YmlCN1FYSnlZWGw5WEc0cUlFQmhjR2tnY0hKMmFXRjBaVnh1S2k5Y2JseHVablZ1WTNScGIyNGdaMlYwUld4bGJXVnVkRk5sYkdWamRHOXlLR1ZzTENCcGMxVnVhWEYxWlNrZ2UxeHVJQ0IyWVhJZ2NHRnlkSE1nUFNCYlhUdGNiaUFnZG1GeUlHeGhZbVZzSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJSFJwZEd4bElEMGdiblZzYkR0Y2JpQWdkbUZ5SUdGc2RDQWdJRDBnYm5Wc2JEdGNiaUFnZG1GeUlHNWhiV1VnSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJSFpoYkhWbElEMGdiblZzYkR0Y2JpQWdkbUZ5SUcxbElEMGdaV3c3WEc1Y2JpQWdMeThnWkc4Z2UxeHVYRzRnSUM4dklFbEVjeUJoY21VZ2RXNXBjWFZsSUdWdWIzVm5hRnh1SUNCcFppQW9aV3d1YVdRcElIdGNiaUFnSUNCc1lXSmxiQ0E5SUNkYmFXUTlYRnduSnlBcklHVnNMbWxrSUNzZ1hDSmNYQ2RkWENJN1hHNGdJSDBnWld4elpTQjdYRzRnSUNBZ0x5OGdUM1JvWlhKM2FYTmxMQ0IxYzJVZ2RHRm5JRzVoYldWY2JpQWdJQ0JzWVdKbGJDQWdJQ0FnUFNCbGJDNTBZV2RPWVcxbExuUnZURzkzWlhKRFlYTmxLQ2s3WEc1Y2JpQWdJQ0IyWVhJZ1kyeGhjM05PWVcxbGN5QTlJR2RsZEVOc1lYTnpUbUZ0WlhNb1pXd3BPMXh1WEc0Z0lDQWdMeThnVkdGbklHNWhiV1Z6SUdOdmRXeGtJSFZ6WlNCamJHRnpjMlZ6SUdadmNpQnpjR1ZqYVdacFkybDBlVnh1SUNBZ0lHbG1JQ2hqYkdGemMwNWhiV1Z6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnYkdGaVpXd2dLejBnSnk0bklDc2dZMnhoYzNOT1lXMWxjeTVxYjJsdUtDY3VKeWs3WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnTHk4Z1ZHbDBiR1Z6SUNZZ1FXeDBJR0YwZEhKcFluVjBaWE1nWVhKbElIWmxjbmtnZFhObFpuVnNJR1p2Y2lCemNHVmphV1pwWTJsMGVTQmhibVFnZEhKaFkydHBibWRjYmlBZ2FXWWdLSFJwZEd4bElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZDBhWFJzWlNjcEtTQjdYRzRnSUNBZ2JHRmlaV3dnS3owZ0oxdDBhWFJzWlQxY0lpY2dLeUIwYVhSc1pTQXJJQ2RjSWwwbk8xeHVJQ0I5SUdWc2MyVWdhV1lnS0dGc2RDQTlJR1ZzTG1kbGRFRjBkSEpwWW5WMFpTZ25ZV3gwSnlrcElIdGNiaUFnSUNCc1lXSmxiQ0FyUFNBblcyRnNkRDFjSWljZ0t5QmhiSFFnS3lBblhDSmRKenRjYmlBZ2ZTQmxiSE5sSUdsbUlDaHVZVzFsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkdVlXMWxKeWtwSUh0Y2JpQWdJQ0JzWVdKbGJDQXJQU0FuVzI1aGJXVTlYQ0luSUNzZ2JtRnRaU0FySUNkY0lsMG5PMXh1SUNCOVhHNWNiaUFnYVdZZ0tIWmhiSFZsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkMllXeDFaU2NwS1NCN1hHNGdJQ0FnYkdGaVpXd2dLejBnSjF0MllXeDFaVDFjSWljZ0t5QjJZV3gxWlNBcklDZGNJbDBuTzF4dUlDQjlYRzVjYmlBZ0x5OGdhV1lnS0dWc0xtbHVibVZ5VkdWNGRDNXNaVzVuZEdnZ0lUMGdNQ2tnZTF4dUlDQXZMeUFnSUd4aFltVnNJQ3M5SUNjNlkyOXVkR0ZwYm5Nb0p5QXJJR1ZzTG1sdWJtVnlWR1Y0ZENBcklDY3BKenRjYmlBZ0x5OGdmVnh1WEc0Z0lIQmhjblJ6TG5WdWMyaHBablFvZTF4dUlDQWdJR1ZzWlcxbGJuUTZJR1ZzTEZ4dUlDQWdJSE5sYkdWamRHOXlPaUJzWVdKbGJGeHVJQ0I5S1R0Y2JseHVJQ0F2THlCcFppQW9hWE5WYm1seGRXVW9jR0Z5ZEhNcEtTQjdYRzRnSUM4dklDQWdJQ0JpY21WaGF6dGNiaUFnTHk4Z2ZWeHVYRzRnSUM4dklIMGdkMmhwYkdVZ0tDRmxiQzVwWkNBbUppQW9aV3dnUFNCbGJDNXdZWEpsYm5ST2IyUmxLU0FtSmlCbGJDNTBZV2RPWVcxbEtUdGNibHh1SUNBdkx5QlRiMjFsSUhObGJHVmpkRzl5Y3lCemFHOTFiR1FnYUdGMlpTQnRZWFJqYUdWa0lHRjBJR3hsWVhOMFhHNGdJR2xtSUNnaGNHRnlkSE11YkdWdVozUm9LU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZEdZV2xzWldRZ2RHOGdhV1JsYm5ScFpua2dRMU5USUhObGJHVmpkRzl5SnlrN1hHNGdJSDFjYmlBZ2NtVjBkWEp1SUhCaGNuUnpXekJkTzF4dWZWeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSFZ1YVhGMVpUdGNiaUpkZlE9PSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGxvY2FsX3N0b3JhZ2Vfa2V5ID0gJ3V0bWUtc2V0dGluZ3MnO1xuXG5mdW5jdGlvbiBTZXR0aW5ncyAoZGVmYXVsdFNldHRpbmdzKSB7XG4gICAgdGhpcy5zZXREZWZhdWx0cyhkZWZhdWx0U2V0dGluZ3MgfHwge30pO1xufVxuXG5TZXR0aW5ncy5wcm90b3R5cGUgPSB7XG4gICAgcmVhZFNldHRpbmdzRnJvbUxvY2FsU3RvcmFnZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2V0dGluZ3NTdHJpbmcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShsb2NhbF9zdG9yYWdlX2tleSk7XG4gICAgICAgIHZhciBzZXR0aW5ncyA9IHt9O1xuICAgICAgICBpZiAoc2V0dGluZ3NTdHJpbmcpIHtcbiAgICAgICAgICAgIHNldHRpbmdzID0gSlNPTi5wYXJzZShzZXR0aW5nc1N0cmluZyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH0sXG5cbiAgICBzZXREZWZhdWx0czogZnVuY3Rpb24gKGRlZmF1bHRTZXR0aW5ncykge1xuICAgICAgICB2YXIgbG9jYWxTZXR0aW5ncyA9IHRoaXMucmVhZFNldHRpbmdzRnJvbUxvY2FsU3RvcmFnZSgpO1xuICAgICAgICB2YXIgZGVmYXVsdHNDb3B5ID0gXy5leHRlbmQoe30sIGRlZmF1bHRTZXR0aW5ncyB8fCB7fSk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgXy5leHRlbmQoZGVmYXVsdHNDb3B5LCBsb2NhbFNldHRpbmdzKSk7XG4gICAgICAgIHRoaXMuZGVmYXVsdFNldHRpbmdzID0gZGVmYXVsdFNldHRpbmdzO1xuICAgIH0sXG5cbiAgICBzZXQ6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3Nba2V5XSA9IHZhbHVlO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9LFxuXG4gICAgZ2V0OiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzW2tleV07XG4gICAgfSxcblxuICAgIHNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0obG9jYWxfc3RvcmFnZV9rZXksIEpTT04uc3RyaW5naWZ5KHRoaXMuc2V0dGluZ3MpKTtcbiAgICB9LFxuXG4gICAgcmVzZXREZWZhdWx0czogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmYXVsdHMgPSB0aGlzLmRlZmF1bHRTZXR0aW5ncztcbiAgICAgICAgaWYgKGRlZmF1bHRzKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzID0gXy5leHRlbmQoe30sIGRlZmF1bHRzKTtcbiAgICAgICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5ncztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNObGRIUnBibWR6TG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZjMlYwZEdsdVozTXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFc1NVRkJTU3hEUVVGRExFZEJRVWNzVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPMEZCUXpOQ0xFbEJRVWtzYVVKQlFXbENMRWRCUVVjc1pVRkJaU3hEUVVGRE96dEJRVVY0UXl4VFFVRlRMRkZCUVZFc1JVRkJSU3hsUVVGbExFVkJRVVU3U1VGRGFFTXNTVUZCU1N4RFFVRkRMRmRCUVZjc1EwRkJReXhsUVVGbExFbEJRVWtzUlVGQlJTeERRVUZETEVOQlFVTTdRVUZETlVNc1EwRkJRenM3UVVGRlJDeFJRVUZSTEVOQlFVTXNVMEZCVXl4SFFVRkhPMGxCUTJwQ0xEUkNRVUUwUWl4RlFVRkZMRmxCUVZrN1VVRkRkRU1zU1VGQlNTeGpRVUZqTEVkQlFVY3NXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhwUWtGQmFVSXNRMEZCUXl4RFFVRkRPMUZCUXpkRUxFbEJRVWtzVVVGQlVTeEhRVUZITEVWQlFVVXNRMEZCUXp0UlFVTnNRaXhKUVVGSkxHTkJRV01zUlVGQlJUdFpRVU5vUWl4UlFVRlJMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eGpRVUZqTEVOQlFVTXNRMEZCUXp0VFFVTjZRenRSUVVORUxFOUJRVThzVVVGQlVTeERRVUZETzBGQlEzaENMRXRCUVVzN08wbEJSVVFzVjBGQlZ5eEZRVUZGTEZWQlFWVXNaVUZCWlN4RlFVRkZPMUZCUTNCRExFbEJRVWtzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl3MFFrRkJORUlzUlVGQlJTeERRVUZETzFGQlEzaEVMRWxCUVVrc1dVRkJXU3hIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlN4RlFVRkZMR1ZCUVdVc1NVRkJTU3hGUVVGRkxFTkJRVU1zUTBGQlF6dFJRVU4yUkN4SlFVRkpMRU5CUVVNc1VVRkJVU3hIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zV1VGQldTeEZRVUZGTEdGQlFXRXNRMEZCUXl4RFFVRkRMRU5CUVVNN1VVRkRjRVVzU1VGQlNTeERRVUZETEdWQlFXVXNSMEZCUnl4bFFVRmxMRU5CUVVNN1FVRkRMME1zUzBGQlN6czdTVUZGUkN4SFFVRkhMRVZCUVVVc1ZVRkJWU3hIUVVGSExFVkJRVVVzUzBGQlN5eEZRVUZGTzFGQlEzWkNMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTMEZCU3l4RFFVRkRPMUZCUXpOQ0xFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXp0QlFVTndRaXhMUVVGTE96dEpRVVZFTEVkQlFVY3NSVUZCUlN4VlFVRlZMRWRCUVVjc1JVRkJSVHRSUVVOb1FpeFBRVUZQTEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGJFTXNTMEZCU3pzN1NVRkZSQ3hKUVVGSkxFVkJRVVVzV1VGQldUdFJRVU5rTEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc2FVSkJRV2xDTEVWQlFVVXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEVOQlFVTXNRMEZCUXp0QlFVTXZSU3hMUVVGTE96dEpRVVZFTEdGQlFXRXNSVUZCUlN4WlFVRlpPMUZCUTNaQ0xFbEJRVWtzVVVGQlVTeEhRVUZITEVsQlFVa3NRMEZCUXl4bFFVRmxMRU5CUVVNN1VVRkRjRU1zU1VGQlNTeFJRVUZSTEVWQlFVVTdXVUZEVml4SlFVRkpMRU5CUVVNc1VVRkJVU3hIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlN4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE8xbEJRM1pETEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJRenRUUVVObU8wdEJRMG83UVVGRFRDeERRVUZETEVOQlFVTTdPMEZCUlVZc1RVRkJUU3hEUVVGRExFOUJRVThzUjBGQlJ5eFJRVUZSSWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaWRtRnlJRjhnUFNCeVpYRjFhWEpsS0NjdUwzVjBhV3h6SnlrN1hHNTJZWElnYkc5allXeGZjM1J2Y21GblpWOXJaWGtnUFNBbmRYUnRaUzF6WlhSMGFXNW5jeWM3WEc1Y2JtWjFibU4wYVc5dUlGTmxkSFJwYm1keklDaGtaV1poZFd4MFUyVjBkR2x1WjNNcElIdGNiaUFnSUNCMGFHbHpMbk5sZEVSbFptRjFiSFJ6S0dSbFptRjFiSFJUWlhSMGFXNW5jeUI4ZkNCN2ZTazdYRzU5WEc1Y2JsTmxkSFJwYm1kekxuQnliM1J2ZEhsd1pTQTlJSHRjYmlBZ0lDQnlaV0ZrVTJWMGRHbHVaM05HY205dFRHOWpZV3hUZEc5eVlXZGxPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6WlhSMGFXNW5jMU4wY21sdVp5QTlJR3h2WTJGc1UzUnZjbUZuWlM1blpYUkpkR1Z0S0d4dlkyRnNYM04wYjNKaFoyVmZhMlY1S1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE5sZEhScGJtZHpJRDBnZTMwN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6WlhSMGFXNW5jMU4wY21sdVp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MyVjBkR2x1WjNNZ1BTQktVMDlPTG5CaGNuTmxLSE5sZEhScGJtZHpVM1J5YVc1bktUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjMlYwZEdsdVozTTdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lITmxkRVJsWm1GMWJIUnpPaUJtZFc1amRHbHZiaUFvWkdWbVlYVnNkRk5sZEhScGJtZHpLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnNiMk5oYkZObGRIUnBibWR6SUQwZ2RHaHBjeTV5WldGa1UyVjBkR2x1WjNOR2NtOXRURzlqWVd4VGRHOXlZV2RsS0NrN1hHNGdJQ0FnSUNBZ0lIWmhjaUJrWldaaGRXeDBjME52Y0hrZ1BTQmZMbVY0ZEdWdVpDaDdmU3dnWkdWbVlYVnNkRk5sZEhScGJtZHpJSHg4SUh0OUtUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUjBhVzVuY3lBOUlGOHVaWGgwWlc1a0tIdDlMQ0JmTG1WNGRHVnVaQ2hrWldaaGRXeDBjME52Y0hrc0lHeHZZMkZzVTJWMGRHbHVaM01wS1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVrWldaaGRXeDBVMlYwZEdsdVozTWdQU0JrWldaaGRXeDBVMlYwZEdsdVozTTdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lITmxkRG9nWm5WdVkzUnBiMjRnS0d0bGVTd2dkbUZzZFdVcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUjBhVzVuYzF0clpYbGRJRDBnZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMyRjJaU2dwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0JuWlhRNklHWjFibU4wYVc5dUlDaHJaWGtwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTXVjMlYwZEdsdVozTmJhMlY1WFR0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYzJGMlpUb2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCc2IyTmhiRk4wYjNKaFoyVXVjMlYwU1hSbGJTaHNiMk5oYkY5emRHOXlZV2RsWDJ0bGVTd2dTbE5QVGk1emRISnBibWRwWm5rb2RHaHBjeTV6WlhSMGFXNW5jeWtwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J5WlhObGRFUmxabUYxYkhSek9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQmtaV1poZFd4MGN5QTlJSFJvYVhNdVpHVm1ZWFZzZEZObGRIUnBibWR6TzF4dUlDQWdJQ0FnSUNCcFppQW9aR1ZtWVhWc2RITXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11YzJWMGRHbHVaM01nUFNCZkxtVjRkR1Z1WkNoN2ZTd2daR1ZtWVhWc2RITXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV6WVhabEtDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5TzF4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlGTmxkSFJwYm1kek95SmRmUT09IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBTaW11bGF0ZSA9IHtcbiAgICBldmVudDogZnVuY3Rpb24oZWxlbWVudCwgZXZlbnROYW1lLCBvcHRpb25zKXtcbiAgICAgICAgdmFyIGV2dDtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50KSB7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkhUTUxFdmVudHNcIik7XG4gICAgICAgICAgICBldnQuaW5pdEV2ZW50KGV2ZW50TmFtZSwgZXZlbnROYW1lICE9ICdtb3VzZWVudGVyJyAmJiBldmVudE5hbWUgIT0gJ21vdXNlbGVhdmUnLCB0cnVlICk7XG4gICAgICAgICAgICBfLmV4dGVuZChldnQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICAgICAgICAgIGVsZW1lbnQuZmlyZUV2ZW50KCdvbicgKyBldmVudE5hbWUsZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAga2V5RXZlbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIG9wdGlvbnMpe1xuICAgICAgICB2YXIgZXZ0LFxuICAgICAgICAgICAgZSA9IHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlLCB2aWV3OiB3aW5kb3csXG4gICAgICAgICAgICAgICAgY3RybEtleTogZmFsc2UsIGFsdEtleTogZmFsc2UsIHNoaWZ0S2V5OiBmYWxzZSwgbWV0YUtleTogZmFsc2UsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogMCwgY2hhckNvZGU6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIF8uZXh0ZW5kKGUsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpe1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdLZXlFdmVudHMnKTtcbiAgICAgICAgICAgICAgICBldnQuaW5pdEtleUV2ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSwgZS52aWV3LFxuICAgICAgICAgICAgZS5jdHJsS2V5LCBlLmFsdEtleSwgZS5zaGlmdEtleSwgZS5tZXRhS2V5LFxuICAgICAgICAgICAgZS5rZXlDb2RlLCBlLmNoYXJDb2RlKTtcbiAgICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50c1wiKTtcbiAgICAgICAgZXZ0LmluaXRFdmVudCh0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSk7XG4gICAgICAgIF8uZXh0ZW5kKGV2dCwge1xuICAgICAgICAgICAgdmlldzogZS52aWV3LFxuICAgICAgICAgIGN0cmxLZXk6IGUuY3RybEtleSwgYWx0S2V5OiBlLmFsdEtleSxcbiAgICAgICAgICBzaGlmdEtleTogZS5zaGlmdEtleSwgbWV0YUtleTogZS5tZXRhS2V5LFxuICAgICAgICAgIGtleUNvZGU6IGUua2V5Q29kZSwgY2hhckNvZGU6IGUuY2hhckNvZGVcbiAgICAgICAgfSk7XG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5TaW11bGF0ZS5rZXlwcmVzcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5cHJlc3MnLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleWRvd24gPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleWRvd24nLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleXVwID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXl1cCcsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxudmFyIGV2ZW50cyA9IFtcbiAgICAnY2xpY2snLFxuICAgICdmb2N1cycsXG4gICAgJ2JsdXInLFxuICAgICdkYmxjbGljaycsXG4gICAgJ2lucHV0JyxcbiAgICAnY2hhbmdlJyxcbiAgICAnbW91c2Vkb3duJyxcbiAgICAnbW91c2Vtb3ZlJyxcbiAgICAnbW91c2VvdXQnLFxuICAgICdtb3VzZW92ZXInLFxuICAgICdtb3VzZXVwJyxcbiAgICAnbW91c2VlbnRlcicsXG4gICAgJ21vdXNlbGVhdmUnLFxuICAgICdyZXNpemUnLFxuICAgICdzY3JvbGwnLFxuICAgICdzZWxlY3QnLFxuICAgICdzdWJtaXQnLFxuICAgICdsb2FkJyxcbiAgICAndW5sb2FkJ1xuXTtcblxuZm9yICh2YXIgaSA9IGV2ZW50cy5sZW5ndGg7IGktLTspe1xuICAgIHZhciBldmVudCA9IGV2ZW50c1tpXTtcbiAgICBTaW11bGF0ZVtldmVudF0gPSAoZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgICAgICAgICAgdGhpcy5ldmVudChlbGVtZW50LCBldnQsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgIH0oZXZlbnQpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaW11bGF0ZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNOcGJYVnNZWFJsTG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZjMmx0ZFd4aGRHVXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFc1NVRkJTU3hEUVVGRExFZEJRVWNzVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPenRCUVVVelFpeEpRVUZKTEZGQlFWRXNSMEZCUnp0SlFVTllMRXRCUVVzc1JVRkJSU3hUUVVGVExFOUJRVThzUlVGQlJTeFRRVUZUTEVWQlFVVXNUMEZCVHl4RFFVRkRPMUZCUTNoRExFbEJRVWtzUjBGQlJ5eERRVUZETzFGQlExSXNTVUZCU1N4UlFVRlJMRU5CUVVNc1YwRkJWeXhGUVVGRk8xbEJRM1JDTEVkQlFVY3NSMEZCUnl4UlFVRlJMRU5CUVVNc1YwRkJWeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZETzFsQlEzcERMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zVTBGQlV5eEZRVUZGTEZOQlFWTXNTVUZCU1N4WlFVRlpMRWxCUVVrc1UwRkJVeXhKUVVGSkxGbEJRVmtzUlVGQlJTeEpRVUZKTEVWQlFVVXNRMEZCUXp0WlFVTjRSaXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEVkQlFVY3NSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenRaUVVOMlFpeFBRVUZQTEVOQlFVTXNZVUZCWVN4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8xTkJRemxDTEVsQlFVazdXVUZEUkN4SFFVRkhMRWRCUVVjc1VVRkJVU3hEUVVGRExHbENRVUZwUWl4RlFVRkZMRU5CUVVNN1dVRkRia01zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4SlFVRkpMRWRCUVVjc1UwRkJVeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlF6TkRPMHRCUTBvN1NVRkRSQ3hSUVVGUkxFVkJRVVVzVTBGQlV5eFBRVUZQTEVWQlFVVXNTVUZCU1N4RlFVRkZMRTlCUVU4c1EwRkJRenRSUVVOMFF5eEpRVUZKTEVkQlFVYzdXVUZEU0N4RFFVRkRMRWRCUVVjN1owSkJRMEVzVDBGQlR5eEZRVUZGTEVsQlFVa3NSVUZCUlN4VlFVRlZMRVZCUVVVc1NVRkJTU3hGUVVGRkxFbEJRVWtzUlVGQlJTeE5RVUZOTzJkQ1FVTTNReXhQUVVGUExFVkJRVVVzUzBGQlN5eEZRVUZGTEUxQlFVMHNSVUZCUlN4TFFVRkxMRVZCUVVVc1VVRkJVU3hGUVVGRkxFdEJRVXNzUlVGQlJTeFBRVUZQTEVWQlFVVXNTMEZCU3p0blFrRkRPVVFzVDBGQlR5eEZRVUZGTEVOQlFVTXNSVUZCUlN4UlFVRlJMRVZCUVVVc1EwRkJRenRoUVVNeFFpeERRVUZETzFGQlEwNHNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhEUVVGRExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdVVUZEY2tJc1NVRkJTU3hSUVVGUkxFTkJRVU1zVjBGQlZ5eERRVUZETzFsQlEzSkNMRWRCUVVjN1owSkJRME1zUjBGQlJ5eEhRVUZITEZGQlFWRXNRMEZCUXl4WFFVRlhMRU5CUVVNc1YwRkJWeXhEUVVGRExFTkJRVU03WjBKQlEzaERMRWRCUVVjc1EwRkJReXhaUVVGWk8yOUNRVU5hTEVsQlFVa3NSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUeXhGUVVGRkxFTkJRVU1zUTBGQlF5eFZRVUZWTEVWQlFVVXNRMEZCUXl4RFFVRkRMRWxCUVVrN1dVRkROME1zUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUTBGQlF5eFJRVUZSTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTlCUVU4N1dVRkRNVU1zUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03VlVGRGVrSXNUMEZCVHl4RFFVRkRMR0ZCUVdFc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dFRRVU0xUWl4TlFVRk5MRWRCUVVjc1EwRkJRenRaUVVOUUxFZEJRVWNzUjBGQlJ5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE8xRkJRM3BETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTEVWQlFVVXNRMEZCUXl4RFFVRkRMRlZCUVZVc1EwRkJReXhEUVVGRE8xRkJRemRETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1IwRkJSeXhGUVVGRk8xbEJRMVlzU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXl4SlFVRkpPMVZCUTJRc1QwRkJUeXhGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTEVWQlFVVXNUVUZCVFN4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTk8xVkJRM0JETEZGQlFWRXNSVUZCUlN4RFFVRkRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHp0VlFVTjRReXhQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4UlFVRlJMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkU3VTBGRGVrTXNRMEZCUXl4RFFVRkRPMUZCUTBnc1QwRkJUeXhEUVVGRExHRkJRV0VzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0VFFVTXhRanRUUVVOQk8wdEJRMG83UVVGRFRDeERRVUZETEVOQlFVTTdPMEZCUlVZc1VVRkJVU3hEUVVGRExGRkJRVkVzUjBGQlJ5eFRRVUZUTEU5QlFVOHNSVUZCUlN4SFFVRkhMRU5CUVVNN1NVRkRkRU1zU1VGQlNTeFJRVUZSTEVkQlFVY3NSMEZCUnl4RFFVRkRMRlZCUVZVc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEpRVU5xUXl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFOUJRVThzUlVGQlJTeFZRVUZWTEVWQlFVVTdVVUZETDBJc1QwRkJUeXhGUVVGRkxGRkJRVkU3VVVGRGFrSXNVVUZCVVN4RlFVRkZMRkZCUVZFN1MwRkRja0lzUTBGQlF5eERRVUZETzBGQlExQXNRMEZCUXl4RFFVRkRPenRCUVVWR0xGRkJRVkVzUTBGQlF5eFBRVUZQTEVkQlFVY3NVMEZCVXl4UFFVRlBMRVZCUVVVc1IwRkJSeXhEUVVGRE8wbEJRM0pETEVsQlFVa3NVVUZCVVN4SFFVRkhMRWRCUVVjc1EwRkJReXhWUVVGVkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdTVUZEYWtNc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eFBRVUZQTEVWQlFVVXNVMEZCVXl4RlFVRkZPMUZCUXpsQ0xFOUJRVThzUlVGQlJTeFJRVUZSTzFGQlEycENMRkZCUVZFc1JVRkJSU3hSUVVGUk8wdEJRM0pDTEVOQlFVTXNRMEZCUXp0QlFVTlFMRU5CUVVNc1EwRkJRenM3UVVGRlJpeFJRVUZSTEVOQlFVTXNTMEZCU3l4SFFVRkhMRk5CUVZNc1QwRkJUeXhGUVVGRkxFZEJRVWNzUTBGQlF6dEpRVU51UXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhIUVVGSExFTkJRVU1zVlVGQlZTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMGxCUTJwRExFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNUMEZCVHl4RlFVRkZMRTlCUVU4c1JVRkJSVHRSUVVNMVFpeFBRVUZQTEVWQlFVVXNVVUZCVVR0UlFVTnFRaXhSUVVGUkxFVkJRVVVzVVVGQlVUdExRVU55UWl4RFFVRkRMRU5CUVVNN1FVRkRVQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNTVUZCU1N4TlFVRk5MRWRCUVVjN1NVRkRWQ3hQUVVGUE8wbEJRMUFzVDBGQlR6dEpRVU5RTEUxQlFVMDdTVUZEVGl4VlFVRlZPMGxCUTFZc1QwRkJUenRKUVVOUUxGRkJRVkU3U1VGRFVpeFhRVUZYTzBsQlExZ3NWMEZCVnp0SlFVTllMRlZCUVZVN1NVRkRWaXhYUVVGWE8wbEJRMWdzVTBGQlV6dEpRVU5VTEZsQlFWazdTVUZEV2l4WlFVRlpPMGxCUTFvc1VVRkJVVHRKUVVOU0xGRkJRVkU3U1VGRFVpeFJRVUZSTzBsQlExSXNVVUZCVVR0SlFVTlNMRTFCUVUwN1NVRkRUaXhSUVVGUk8wRkJRMW9zUTBGQlF5eERRVUZET3p0QlFVVkdMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzVFVGQlRTeERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRKUVVNM1FpeEpRVUZKTEV0QlFVc3NSMEZCUnl4TlFVRk5MRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03U1VGRGRFSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxGTkJRVk1zUjBGQlJ5eERRVUZETzFGQlF6VkNMRTlCUVU4c1UwRkJVeXhQUVVGUExFVkJRVVVzVDBGQlR5eERRVUZETzFsQlF6ZENMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVDBGQlR5eEZRVUZGTEVkQlFVY3NSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenRUUVVOeVF5eERRVUZETzB0QlEwd3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRMlFzUTBGQlF6czdRVUZGUkN4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSExGRkJRVkVpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdYeUE5SUhKbGNYVnBjbVVvSnk0dmRYUnBiSE1uS1R0Y2JseHVkbUZ5SUZOcGJYVnNZWFJsSUQwZ2UxeHVJQ0FnSUdWMlpXNTBPaUJtZFc1amRHbHZiaWhsYkdWdFpXNTBMQ0JsZG1WdWRFNWhiV1VzSUc5d2RHbHZibk1wZTF4dUlDQWdJQ0FnSUNCMllYSWdaWFowTzF4dUlDQWdJQ0FnSUNCcFppQW9aRzlqZFcxbGJuUXVZM0psWVhSbFJYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZENBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWMlpXNTBLRndpU0ZSTlRFVjJaVzUwYzF3aUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWMmRDNXBibWwwUlhabGJuUW9aWFpsYm5ST1lXMWxMQ0JsZG1WdWRFNWhiV1VnSVQwZ0oyMXZkWE5sWlc1MFpYSW5JQ1ltSUdWMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWc1pXRjJaU2NzSUhSeWRXVWdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lGOHVaWGgwWlc1a0tHVjJkQ3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmxiR1Z0Wlc1MExtUnBjM0JoZEdOb1JYWmxiblFvWlhaMEtUdGNiaUFnSUNBZ0lDQWdmV1ZzYzJWN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsZG5RZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmRtVnVkRTlpYW1WamRDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pXeGxiV1Z1ZEM1bWFYSmxSWFpsYm5Rb0oyOXVKeUFySUdWMlpXNTBUbUZ0WlN4bGRuUXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQnJaWGxGZG1WdWREb2dablZ1WTNScGIyNG9aV3hsYldWdWRDd2dkSGx3WlN3Z2IzQjBhVzl1Y3lsN1hHNGdJQ0FnSUNBZ0lIWmhjaUJsZG5Rc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHSjFZbUpzWlhNNklIUnlkV1VzSUdOaGJtTmxiR0ZpYkdVNklIUnlkV1VzSUhacFpYYzZJSGRwYm1SdmR5eGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpkSEpzUzJWNU9pQm1ZV3h6WlN3Z1lXeDBTMlY1T2lCbVlXeHpaU3dnYzJocFpuUkxaWGs2SUdaaGJITmxMQ0J0WlhSaFMyVjVPaUJtWVd4elpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQXdMQ0JqYUdGeVEyOWtaVG9nTUZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVHRjYmlBZ0lDQWdJQ0FnWHk1bGVIUmxibVFvWlN3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hrYjJOMWJXVnVkQzVqY21WaGRHVkZkbVZ1ZENsN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwY25sN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYWjBJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSWFpsYm5Rb0owdGxlVVYyWlc1MGN5Y3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1YyZEM1cGJtbDBTMlY1UlhabGJuUW9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSNWNHVXNJR1V1WW5WaVlteGxjeXdnWlM1allXNWpaV3hoWW14bExDQmxMblpwWlhjc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsTG1OMGNteExaWGtzSUdVdVlXeDBTMlY1TENCbExuTm9hV1owUzJWNUxDQmxMbTFsZEdGTFpYa3NYRzRnSUNBZ0lDQWdJQ0FnSUNCbExtdGxlVU52WkdVc0lHVXVZMmhoY2tOdlpHVXBPMXh1SUNBZ0lDQWdJQ0FnSUdWc1pXMWxiblF1WkdsemNHRjBZMmhGZG1WdWRDaGxkblFwTzF4dUlDQWdJQ0FnSUNCOVkyRjBZMmdvWlhKeUtYdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWMmRDQTlJR1J2WTNWdFpXNTBMbU55WldGMFpVVjJaVzUwS0Z3aVJYWmxiblJ6WENJcE8xeHVJQ0FnSUNBZ0lDQmxkblF1YVc1cGRFVjJaVzUwS0hSNWNHVXNJR1V1WW5WaVlteGxjeXdnWlM1allXNWpaV3hoWW14bEtUdGNiaUFnSUNBZ0lDQWdYeTVsZUhSbGJtUW9aWFowTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyYVdWM09pQmxMblpwWlhjc1hHNGdJQ0FnSUNBZ0lDQWdZM1J5YkV0bGVUb2daUzVqZEhKc1MyVjVMQ0JoYkhSTFpYazZJR1V1WVd4MFMyVjVMRnh1SUNBZ0lDQWdJQ0FnSUhOb2FXWjBTMlY1T2lCbExuTm9hV1owUzJWNUxDQnRaWFJoUzJWNU9pQmxMbTFsZEdGTFpYa3NYRzRnSUNBZ0lDQWdJQ0FnYTJWNVEyOWtaVG9nWlM1clpYbERiMlJsTENCamFHRnlRMjlrWlRvZ1pTNWphR0Z5UTI5a1pWeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnWld4bGJXVnVkQzVrYVhOd1lYUmphRVYyWlc1MEtHVjJkQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMDdYRzVjYmxOcGJYVnNZWFJsTG10bGVYQnlaWE56SUQwZ1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z1kyaHlLWHRjYmlBZ0lDQjJZWElnWTJoaGNrTnZaR1VnUFNCamFISXVZMmhoY2tOdlpHVkJkQ2d3S1R0Y2JpQWdJQ0IwYUdsekxtdGxlVVYyWlc1MEtHVnNaVzFsYm5Rc0lDZHJaWGx3Y21WemN5Y3NJSHRjYmlBZ0lDQWdJQ0FnYTJWNVEyOWtaVG9nWTJoaGNrTnZaR1VzWEc0Z0lDQWdJQ0FnSUdOb1lYSkRiMlJsT2lCamFHRnlRMjlrWlZ4dUlDQWdJSDBwTzF4dWZUdGNibHh1VTJsdGRXeGhkR1V1YTJWNVpHOTNiaUE5SUdaMWJtTjBhVzl1S0dWc1pXMWxiblFzSUdOb2NpbDdYRzRnSUNBZ2RtRnlJR05vWVhKRGIyUmxJRDBnWTJoeUxtTm9ZWEpEYjJSbFFYUW9NQ2s3WEc0Z0lDQWdkR2hwY3k1clpYbEZkbVZ1ZENobGJHVnRaVzUwTENBbmEyVjVaRzkzYmljc0lIdGNiaUFnSUNBZ0lDQWdhMlY1UTI5a1pUb2dZMmhoY2tOdlpHVXNYRzRnSUNBZ0lDQWdJR05vWVhKRGIyUmxPaUJqYUdGeVEyOWtaVnh1SUNBZ0lIMHBPMXh1ZlR0Y2JseHVVMmx0ZFd4aGRHVXVhMlY1ZFhBZ1BTQm1kVzVqZEdsdmJpaGxiR1Z0Wlc1MExDQmphSElwZTF4dUlDQWdJSFpoY2lCamFHRnlRMjlrWlNBOUlHTm9jaTVqYUdGeVEyOWtaVUYwS0RBcE8xeHVJQ0FnSUhSb2FYTXVhMlY1UlhabGJuUW9aV3hsYldWdWRDd2dKMnRsZVhWd0p5d2dlMXh1SUNBZ0lDQWdJQ0JyWlhsRGIyUmxPaUJqYUdGeVEyOWtaU3hjYmlBZ0lDQWdJQ0FnWTJoaGNrTnZaR1U2SUdOb1lYSkRiMlJsWEc0Z0lDQWdmU2s3WEc1OU8xeHVYRzUyWVhJZ1pYWmxiblJ6SUQwZ1cxeHVJQ0FnSUNkamJHbGpheWNzWEc0Z0lDQWdKMlp2WTNWekp5eGNiaUFnSUNBbllteDFjaWNzWEc0Z0lDQWdKMlJpYkdOc2FXTnJKeXhjYmlBZ0lDQW5hVzV3ZFhRbkxGeHVJQ0FnSUNkamFHRnVaMlVuTEZ4dUlDQWdJQ2R0YjNWelpXUnZkMjRuTEZ4dUlDQWdJQ2R0YjNWelpXMXZkbVVuTEZ4dUlDQWdJQ2R0YjNWelpXOTFkQ2NzWEc0Z0lDQWdKMjF2ZFhObGIzWmxjaWNzWEc0Z0lDQWdKMjF2ZFhObGRYQW5MRnh1SUNBZ0lDZHRiM1Z6WldWdWRHVnlKeXhjYmlBZ0lDQW5iVzkxYzJWc1pXRjJaU2NzWEc0Z0lDQWdKM0psYzJsNlpTY3NYRzRnSUNBZ0ozTmpjbTlzYkNjc1hHNGdJQ0FnSjNObGJHVmpkQ2NzWEc0Z0lDQWdKM04xWW0xcGRDY3NYRzRnSUNBZ0oyeHZZV1FuTEZ4dUlDQWdJQ2QxYm14dllXUW5YRzVkTzF4dVhHNW1iM0lnS0haaGNpQnBJRDBnWlhabGJuUnpMbXhsYm1kMGFEc2dhUzB0T3lsN1hHNGdJQ0FnZG1GeUlHVjJaVzUwSUQwZ1pYWmxiblJ6VzJsZE8xeHVJQ0FnSUZOcGJYVnNZWFJsVzJWMlpXNTBYU0E5SUNobWRXNWpkR2x2YmlobGRuUXBlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdablZ1WTNScGIyNG9aV3hsYldWdWRDd2diM0IwYVc5dWN5bDdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbVYyWlc1MEtHVnNaVzFsYm5Rc0lHVjJkQ3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUgwN1hHNGdJQ0FnZlNobGRtVnVkQ2twTzF4dWZWeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJRk5wYlhWc1lYUmxPeUpkZlE9PSIsIi8qKlxuICogUG9seWZpbGxzXG4gKi9cblxuLyoqXG4gKiBUaGlzIGlzIGNvcGllZCBmcm9tIFJlYWNKUydzIG93biBwb2x5cGZpbGwgdG8gcnVuIHRlc3RzIHdpdGggcGhhbnRvbWpzLlxuICogaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL3JlYWN0L2Jsb2IvM2RjMTA3NDkwODBhNDYwZTQ4YmVlNDZkNzY5NzYzZWM3MTkxYWM3Ni9zcmMvdGVzdC9waGFudG9tanMtc2hpbXMuanNcbiAqL1xuKGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIEFwID0gQXJyYXkucHJvdG90eXBlO1xuICAgIHZhciBzbGljZSA9IEFwLnNsaWNlO1xuICAgIHZhciBGcCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAgIGlmICghRnAuYmluZCkge1xuICAgICAgLy8gUGhhbnRvbUpTIGRvZXNuJ3Qgc3VwcG9ydCBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCBuYXRpdmVseSwgc29cbiAgICAgIC8vIHBvbHlmaWxsIGl0IHdoZW5ldmVyIHRoaXMgbW9kdWxlIGlzIHJlcXVpcmVkLlxuICAgICAgRnAuYmluZCA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGZ1bmMgPSB0aGlzO1xuICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgICAgICBmdW5jdGlvbiBib3VuZCgpIHtcbiAgICAgICAgICB2YXIgaW52b2tlZEFzQ29uc3RydWN0b3IgPSBmdW5jLnByb3RvdHlwZSAmJiAodGhpcyBpbnN0YW5jZW9mIGZ1bmMpO1xuICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KFxuICAgICAgICAgICAgLy8gSWdub3JlIHRoZSBjb250ZXh0IHBhcmFtZXRlciB3aGVuIGludm9raW5nIHRoZSBib3VuZCBmdW5jdGlvblxuICAgICAgICAgICAgLy8gYXMgYSBjb25zdHJ1Y3Rvci4gTm90ZSB0aGF0IHRoaXMgaW5jbHVkZXMgbm90IG9ubHkgY29uc3RydWN0b3JcbiAgICAgICAgICAgIC8vIGludm9jYXRpb25zIHVzaW5nIHRoZSBuZXcga2V5d29yZCBidXQgYWxzbyBjYWxscyB0byBiYXNlIGNsYXNzXG4gICAgICAgICAgICAvLyBjb25zdHJ1Y3RvcnMgc3VjaCBhcyBCYXNlQ2xhc3MuY2FsbCh0aGlzLCAuLi4pIG9yIHN1cGVyKC4uLikuXG4gICAgICAgICAgICAhaW52b2tlZEFzQ29uc3RydWN0b3IgJiYgY29udGV4dCB8fCB0aGlzLFxuICAgICAgICAgICAgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgYm91bmQgZnVuY3Rpb24gbXVzdCBzaGFyZSB0aGUgLnByb3RvdHlwZSBvZiB0aGUgdW5ib3VuZFxuICAgICAgICAvLyBmdW5jdGlvbiBzbyB0aGF0IGFueSBvYmplY3QgY3JlYXRlZCBieSBvbmUgY29uc3RydWN0b3Igd2lsbCBjb3VudFxuICAgICAgICAvLyBhcyBhbiBpbnN0YW5jZSBvZiBib3RoIGNvbnN0cnVjdG9ycy5cbiAgICAgICAgYm91bmQucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG5cbiAgICAgICAgcmV0dXJuIGJvdW5kO1xuICAgICAgfTtcbiAgICB9XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQoZHN0LCBzcmMpe1xuICAgICAgICBpZiAoc3JjKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3JjKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNyYy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRzdFtrZXldID0gc3JjW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkc3Q7XG4gICAgfSxcblxuICAgIG1hcDogZnVuY3Rpb24ob2JqLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgICB2YXIgbGVuID0gb2JqLmxlbmd0aCA+Pj4gMDtcbiAgICAgICAgdmFyIG5ld0FycmF5ID0gbmV3IEFycmF5KGxlbik7XG4gICAgICAgIHZhciBrZXkgPSAwO1xuICAgICAgICBpZiAoIXRoaXNBcmcpIHtcbiAgICAgICAgICAgIHRoaXNBcmcgPSBvYmo7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKGtleSA8IGxlbikge1xuICAgICAgICAgICAgbmV3QXJyYXlba2V5XSA9IGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpc1trZXldLCBrZXksIG9iaik7XG4gICAgICAgICAgICBrZXkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XG4gICAgfVxuXG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM1YwYVd4ekxtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12ZFhScGJITXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFN08wRkJSVUVzUjBGQlJ6czdRVUZGU0R0QlFVTkJPenRIUVVWSE8wRkJRMGdzUTBGQlF5eFhRVUZYT3p0SlFVVlNMRWxCUVVrc1JVRkJSU3hIUVVGSExFdEJRVXNzUTBGQlF5eFRRVUZUTEVOQlFVTTdTVUZEZWtJc1NVRkJTU3hMUVVGTExFZEJRVWNzUlVGQlJTeERRVUZETEV0QlFVc3NRMEZCUXp0QlFVTjZRaXhKUVVGSkxFbEJRVWtzUlVGQlJTeEhRVUZITEZGQlFWRXNRMEZCUXl4VFFVRlRMRU5CUVVNN08wRkJSV2hETEVsQlFVa3NTVUZCU1N4RFFVRkRMRVZCUVVVc1EwRkJReXhKUVVGSkxFVkJRVVU3UVVGRGJFSTdPMDFCUlUwc1JVRkJSU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFRRVUZUTEU5QlFVOHNSVUZCUlR0UlFVTXhRaXhKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEZUVJc1VVRkJVU3hKUVVGSkxFbEJRVWtzUjBGQlJ5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1JVRkJSU3hEUVVGRExFTkJRVU1zUTBGQlF6czdVVUZGY0VNc1UwRkJVeXhMUVVGTExFZEJRVWM3VlVGRFppeEpRVUZKTEc5Q1FVRnZRaXhIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEV0QlFVc3NTVUZCU1N4WlFVRlpMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRemxGTEZWQlFWVXNUMEZCVHl4SlFVRkpMRU5CUVVNc1MwRkJTenRCUVVNelFqdEJRVU5CTzBGQlEwRTdPMWxCUlZrc1EwRkJReXh2UWtGQmIwSXNTVUZCU1N4UFFVRlBMRWxCUVVrc1NVRkJTVHRaUVVONFF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdWMEZEYmtNc1EwRkJRenRCUVVOYUxGTkJRVk03UVVGRFZEdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1VVRkJVU3hMUVVGTExFTkJRVU1zVTBGQlV5eEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNN08xRkJSV3BETEU5QlFVOHNTMEZCU3l4RFFVRkRPMDlCUTJRc1EwRkJRenRCUVVOU0xFdEJRVXM3TzBGQlJVd3NRMEZCUXl4SFFVRkhMRU5CUVVNN08wRkJSVXdzVFVGQlRTeERRVUZETEU5QlFVOHNSMEZCUnpzN1NVRkZZaXhOUVVGTkxFVkJRVVVzVTBGQlV5eE5RVUZOTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJRenRSUVVNM1FpeEpRVUZKTEVkQlFVY3NSVUZCUlR0WlFVTk1MRXRCUVVzc1NVRkJTU3hIUVVGSExFbEJRVWtzUjBGQlJ5eEZRVUZGTzJkQ1FVTnFRaXhKUVVGSkxFZEJRVWNzUTBGQlF5eGpRVUZqTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVN2IwSkJRM3BDTEVkQlFVY3NRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSeXhIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdhVUpCUTNaQ08yRkJRMG83VTBGRFNqdFJRVU5FTEU5QlFVOHNSMEZCUnl4RFFVRkRPMEZCUTI1Q0xFdEJRVXM3TzBsQlJVUXNSMEZCUnl4RlFVRkZMRk5CUVZNc1IwRkJSeXhGUVVGRkxGRkJRVkVzUlVGQlJTeFBRVUZQTEVWQlFVVTdVVUZEYkVNc1NVRkJTU3hIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEUxQlFVMHNTMEZCU3l4RFFVRkRMRU5CUVVNN1VVRkRNMElzU1VGQlNTeFJRVUZSTEVkQlFVY3NTVUZCU1N4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03VVVGRE9VSXNTVUZCU1N4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRE8xRkJRMW9zU1VGQlNTeERRVUZETEU5QlFVOHNSVUZCUlR0WlFVTldMRTlCUVU4c1IwRkJSeXhIUVVGSExFTkJRVU03VTBGRGFrSTdVVUZEUkN4UFFVRlBMRWRCUVVjc1IwRkJSeXhIUVVGSExFVkJRVVU3V1VGRFpDeFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVWQlFVVXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFZEJRVWNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0WlFVTTFSQ3hIUVVGSExFVkJRVVVzUTBGQlF6dFRRVU5VTzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNN1FVRkRlRUlzUzBGQlN6czdRMEZGU2lJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYklpOHFLbHh1SUNvZ1VHOXNlV1pwYkd4elhHNGdLaTljYmx4dUx5b3FYRzRnS2lCVWFHbHpJR2x6SUdOdmNHbGxaQ0JtY205dElGSmxZV05LVXlkeklHOTNiaUJ3YjJ4NWNHWnBiR3dnZEc4Z2NuVnVJSFJsYzNSeklIZHBkR2dnY0doaGJuUnZiV3B6TGx4dUlDb2dhSFIwY0hNNkx5OW5hWFJvZFdJdVkyOXRMMlpoWTJWaWIyOXJMM0psWVdOMEwySnNiMkl2TTJSak1UQTNORGt3T0RCaE5EWXdaVFE0WW1WbE5EWmtOelk1TnpZelpXTTNNVGt4WVdNM05pOXpjbU12ZEdWemRDOXdhR0Z1ZEc5dGFuTXRjMmhwYlhNdWFuTmNiaUFxTDF4dUtHWjFibU4wYVc5dUtDa2dlMXh1WEc0Z0lDQWdkbUZ5SUVGd0lEMGdRWEp5WVhrdWNISnZkRzkwZVhCbE8xeHVJQ0FnSUhaaGNpQnpiR2xqWlNBOUlFRndMbk5zYVdObE8xeHVJQ0FnSUhaaGNpQkdjQ0E5SUVaMWJtTjBhVzl1TG5CeWIzUnZkSGx3WlR0Y2JseHVJQ0FnSUdsbUlDZ2hSbkF1WW1sdVpDa2dlMXh1SUNBZ0lDQWdMeThnVUdoaGJuUnZiVXBUSUdSdlpYTnVKM1FnYzNWd2NHOXlkQ0JHZFc1amRHbHZiaTV3Y205MGIzUjVjR1V1WW1sdVpDQnVZWFJwZG1Wc2VTd2djMjljYmlBZ0lDQWdJQzh2SUhCdmJIbG1hV3hzSUdsMElIZG9aVzVsZG1WeUlIUm9hWE1nYlc5a2RXeGxJR2x6SUhKbGNYVnBjbVZrTGx4dUlDQWdJQ0FnUm5BdVltbHVaQ0E5SUdaMWJtTjBhVzl1S0dOdmJuUmxlSFFwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1oxYm1NZ1BTQjBhR2x6TzF4dUlDQWdJQ0FnSUNCMllYSWdZWEpuY3lBOUlITnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpMQ0F4S1R0Y2JseHVJQ0FnSUNBZ0lDQm1kVzVqZEdsdmJpQmliM1Z1WkNncElIdGNiaUFnSUNBZ0lDQWdJQ0IyWVhJZ2FXNTJiMnRsWkVGelEyOXVjM1J5ZFdOMGIzSWdQU0JtZFc1akxuQnliM1J2ZEhsd1pTQW1KaUFvZEdocGN5QnBibk4wWVc1alpXOW1JR1oxYm1NcE8xeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQm1kVzVqTG1Gd2NHeDVLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdTV2R1YjNKbElIUm9aU0JqYjI1MFpYaDBJSEJoY21GdFpYUmxjaUIzYUdWdUlHbHVkbTlyYVc1bklIUm9aU0JpYjNWdVpDQm1kVzVqZEdsdmJseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1lYTWdZU0JqYjI1emRISjFZM1J2Y2k0Z1RtOTBaU0IwYUdGMElIUm9hWE1nYVc1amJIVmtaWE1nYm05MElHOXViSGtnWTI5dWMzUnlkV04wYjNKY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUdsdWRtOWpZWFJwYjI1eklIVnphVzVuSUhSb1pTQnVaWGNnYTJWNWQyOXlaQ0JpZFhRZ1lXeHpieUJqWVd4c2N5QjBieUJpWVhObElHTnNZWE56WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJqYjI1emRISjFZM1J2Y25NZ2MzVmphQ0JoY3lCQ1lYTmxRMnhoYzNNdVkyRnNiQ2gwYUdsekxDQXVMaTRwSUc5eUlITjFjR1Z5S0M0dUxpa3VYRzRnSUNBZ0lDQWdJQ0FnSUNBaGFXNTJiMnRsWkVGelEyOXVjM1J5ZFdOMGIzSWdKaVlnWTI5dWRHVjRkQ0I4ZkNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUNBZ1lYSm5jeTVqYjI1allYUW9jMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1wS1Z4dUlDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBdkx5QlVhR1VnWW05MWJtUWdablZ1WTNScGIyNGdiWFZ6ZENCemFHRnlaU0IwYUdVZ0xuQnliM1J2ZEhsd1pTQnZaaUIwYUdVZ2RXNWliM1Z1WkZ4dUlDQWdJQ0FnSUNBdkx5Qm1kVzVqZEdsdmJpQnpieUIwYUdGMElHRnVlU0J2WW1wbFkzUWdZM0psWVhSbFpDQmllU0J2Ym1VZ1kyOXVjM1J5ZFdOMGIzSWdkMmxzYkNCamIzVnVkRnh1SUNBZ0lDQWdJQ0F2THlCaGN5QmhiaUJwYm5OMFlXNWpaU0J2WmlCaWIzUm9JR052Ym5OMGNuVmpkRzl5Y3k1Y2JpQWdJQ0FnSUNBZ1ltOTFibVF1Y0hKdmRHOTBlWEJsSUQwZ1puVnVZeTV3Y205MGIzUjVjR1U3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdKdmRXNWtPMXh1SUNBZ0lDQWdmVHRjYmlBZ0lDQjlYRzVjYm4wcEtDazdYRzVjYm0xdlpIVnNaUzVsZUhCdmNuUnpJRDBnZTF4dVhHNGdJQ0FnWlhoMFpXNWtPaUJtZFc1amRHbHZiaUJsZUhSbGJtUW9aSE4wTENCemNtTXBlMXh1SUNBZ0lDQWdJQ0JwWmlBb2MzSmpLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnJaWGtnYVc0Z2MzSmpLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITnlZeTVvWVhOUGQyNVFjbTl3WlhKMGVTaHJaWGtwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1J6ZEZ0clpYbGRJRDBnYzNKalcydGxlVjA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJrYzNRN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUcxaGNEb2dablZ1WTNScGIyNG9iMkpxTENCallXeHNZbUZqYXl3Z2RHaHBjMEZ5WnlrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYkdWdUlEMGdiMkpxTG14bGJtZDBhQ0ErUGo0Z01EdGNiaUFnSUNBZ0lDQWdkbUZ5SUc1bGQwRnljbUY1SUQwZ2JtVjNJRUZ5Y21GNUtHeGxiaWs3WEc0Z0lDQWdJQ0FnSUhaaGNpQnJaWGtnUFNBd08xeHVJQ0FnSUNBZ0lDQnBaaUFvSVhSb2FYTkJjbWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhOQmNtY2dQU0J2WW1vN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdkMmhwYkdVZ0tHdGxlU0E4SUd4bGJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JtVjNRWEp5WVhsYmEyVjVYU0E5SUdOaGJHeGlZV05yTG1OaGJHd29kR2hwYzBGeVp5d2dkR2hwYzF0clpYbGRMQ0JyWlhrc0lHOWlhaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnJaWGtyS3p0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2JtVjNRWEp5WVhrN1hHNGdJQ0FnZlZ4dVhHNTlPeUpkZlE9PSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFByb21pc2UgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG52YXIgU2ltdWxhdGUgPSByZXF1aXJlKCcuL3NpbXVsYXRlJyk7XG52YXIgc2VsZWN0b3JGaW5kZXIgPSByZXF1aXJlKCcuL3NlbGVjdG9yRmluZGVyJyk7XG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG5cbi8vIHZhciBteUdlbmVyYXRvciA9IG5ldyBDc3NTZWxlY3RvckdlbmVyYXRvcigpO1xudmFyIGltcG9ydGFudFN0ZXBMZW5ndGggPSA1MDA7XG52YXIgc2F2ZUhhbmRsZXJzID0gW107XG52YXIgcmVwb3J0SGFuZGxlcnMgPSBbXTtcbnZhciBsb2FkSGFuZGxlcnMgPSBbXTtcbnZhciBzZXR0aW5nc0xvYWRIYW5kbGVycyA9IFtdO1xuXG5mdW5jdGlvbiBnZXRTY2VuYXJpbyhuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgaWYgKGxvYWRIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHV0bWUuc3RhdGU7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlLnNjZW5hcmlvcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5zY2VuYXJpb3NbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHN0YXRlLnNjZW5hcmlvc1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9hZEhhbmRsZXJzWzBdKG5hbWUsIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG52YXIgdmFsaWRhdGluZyA9IGZhbHNlO1xuXG52YXIgZXZlbnRzID0gW1xuICAgICdjbGljaycsXG4gICAgJ2ZvY3VzJyxcbiAgICAnYmx1cicsXG4gICAgJ2RibGNsaWNrJyxcbiAgICAvLyAnZHJhZycsXG4gICAgLy8gJ2RyYWdlbnRlcicsXG4gICAgLy8gJ2RyYWdsZWF2ZScsXG4gICAgLy8gJ2RyYWdvdmVyJyxcbiAgICAvLyAnZHJhZ3N0YXJ0JyxcbiAgICAvLyAnaW5wdXQnLFxuICAgICdtb3VzZWRvd24nLFxuICAgIC8vICdtb3VzZW1vdmUnLFxuICAgICdtb3VzZWVudGVyJyxcbiAgICAnbW91c2VsZWF2ZScsXG4gICAgJ21vdXNlb3V0JyxcbiAgICAnbW91c2VvdmVyJyxcbiAgICAnbW91c2V1cCcsXG4gICAgJ2NoYW5nZScsXG4gICAgLy8gJ3Jlc2l6ZScsXG4gICAgLy8gJ3Njcm9sbCdcbl07XG5cbmZ1bmN0aW9uIGdldFByZWNvbmRpdGlvbnMgKHNjZW5hcmlvKSB7XG4gICAgdmFyIHNldHVwID0gc2NlbmFyaW8uc2V0dXA7XG4gICAgdmFyIHNjZW5hcmlvcyA9IHNldHVwICYmIHNldHVwLnNjZW5hcmlvcztcbiAgICAvLyBUT0RPOiBCcmVhayBvdXQgaW50byBoZWxwZXJcbiAgICBpZiAoc2NlbmFyaW9zKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChfLm1hcChzY2VuYXJpb3MsIGZ1bmN0aW9uIChzY2VuYXJpb05hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTY2VuYXJpbyhzY2VuYXJpb05hbWUpLnRoZW4oZnVuY3Rpb24gKG90aGVyU2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgb3RoZXJTY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3RoZXJTY2VuYXJpbykpO1xuICAgICAgICAgICAgICByZXR1cm4gb3RoZXJTY2VuYXJpby5zdGVwcztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQb3N0Y29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgY2xlYW51cCA9IHNjZW5hcmlvLmNsZWFudXA7XG4gICAgdmFyIHNjZW5hcmlvcyA9IGNsZWFudXAgJiYgY2xlYW51cC5zY2VuYXJpb3M7XG4gICAgLy8gVE9ETzogQnJlYWsgb3V0IGludG8gaGVscGVyXG4gICAgaWYgKHNjZW5hcmlvcykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoXy5tYXAoc2NlbmFyaW9zLCBmdW5jdGlvbiAoc2NlbmFyaW9OYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U2NlbmFyaW8oc2NlbmFyaW9OYW1lKS50aGVuKGZ1bmN0aW9uIChvdGhlclNjZW5hcmlvKSB7XG4gICAgICAgICAgICAgIG90aGVyU2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG90aGVyU2NlbmFyaW8pKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG90aGVyU2NlbmFyaW8uc3RlcHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBzKSB7XG4gICAgdmFyIG5ld1N0ZXBzID0gW107XG4gICAgdmFyIGN1cnJlbnRUaW1lc3RhbXA7IC8vIGluaXRhbGl6ZWQgYnkgZmlyc3QgbGlzdCBvZiBzdGVwcy5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBmbGF0U3RlcHMgPSBzdGVwc1tqXTtcbiAgICAgICAgaWYgKGogPiAwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHN0ZXBzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXAgPSBmbGF0U3RlcHNba107XG4gICAgICAgICAgICAgICAgdmFyIGRpZmYgPSBrID4gMCA/IHN0ZXAudGltZVN0YW1wIC0gZmxhdFN0ZXBzW2sgLSAxXS50aW1lU3RhbXAgOiA1MDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wICs9IGRpZmY7XG4gICAgICAgICAgICAgICAgZmxhdFN0ZXBzW2tdLnRpbWVTdGFtcCA9IGN1cnJlbnRUaW1lc3RhbXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wID0gZmxhdFN0ZXBzW2pdLnRpbWVTdGFtcDtcbiAgICAgICAgfVxuICAgICAgICBuZXdTdGVwcyA9IG5ld1N0ZXBzLmNvbmNhdChmbGF0U3RlcHMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3U3RlcHM7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRQcmVjb25kaXRpb25zKHNjZW5hcmlvKSxcbiAgICAgICAgZ2V0UG9zdGNvbmRpdGlvbnMoc2NlbmFyaW8pXG4gICAgXSkudGhlbihmdW5jdGlvbiAoc3RlcEFycmF5cykge1xuICAgICAgICB2YXIgc3RlcExpc3RzID0gc3RlcEFycmF5c1swXS5jb25jYXQoW3NjZW5hcmlvLnN0ZXBzXSwgc3RlcEFycmF5c1sxXSk7XG4gICAgICAgIHNjZW5hcmlvLnN0ZXBzID0gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBMaXN0cyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJ1blN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKSB7XG4gICAgdXRtZS5icm9hZGNhc3QoJ1JVTk5JTkdfU1RFUCcpO1xuICAgIHRvU2tpcCA9IHRvU2tpcCB8fCB7fTtcblxuICAgIHZhciBzdGVwID0gc2NlbmFyaW8uc3RlcHNbaWR4XTtcbiAgICB2YXIgc3RhdGUgPSB1dG1lLnN0YXRlO1xuICAgIGlmIChzdGVwICYmIHN0YXRlLnN0YXR1cyA9PSAnUExBWUlORycpIHtcbiAgICAgICAgc3RhdGUucnVuLnNjZW5hcmlvID0gc2NlbmFyaW87XG4gICAgICAgIHN0YXRlLnJ1bi5zdGVwSW5kZXggPSBpZHg7XG4gICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAnbG9hZCcpIHtcbiAgICAgICAgICAgIHZhciBuZXdMb2NhdGlvbiA9IHN0ZXAuZGF0YS51cmwucHJvdG9jb2wgKyBcIi8vXCIgKyBzdGVwLmRhdGEudXJsLmhvc3Q7XG4gICAgICAgICAgICB2YXIgc2VhcmNoID0gc3RlcC5kYXRhLnVybC5zZWFyY2g7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IHN0ZXAuZGF0YS51cmwuaGFzaDtcblxuICAgICAgICAgICAgaWYgKHNlYXJjaCAmJiAhc2VhcmNoLmNoYXJBdChcIj9cIikpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2ggPSBcIj9cIiArIHNlYXJjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc1NhbWVVUkwgPSAobG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24uc2VhcmNoKSA9PT0gKG5ld0xvY2F0aW9uICsgc2VhcmNoKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKG5ld0xvY2F0aW9uICsgaGFzaCArIHNlYXJjaCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKChsb2NhdGlvbi5wcm90b2NvbCArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5zZWFyY2gpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKChzdGVwLmRhdGEudXJsLnByb3RvY29sICsgc3RlcC5kYXRhLnVybC5ob3N0ICsgc3RlcC5kYXRhLnVybC5zZWFyY2gpKTtcblxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBub3QgY2hhbmdlZCB0aGUgYWN0dWFsIGxvY2F0aW9uLCB0aGVuIHRoZSBsb2NhdGlvbi5yZXBsYWNlXG4gICAgICAgICAgICAvLyB3aWxsIG5vdCBnbyBhbnl3aGVyZVxuICAgICAgICAgICAgaWYgKGlzU2FtZVVSTCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5yZWxvYWQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndGltZW91dCcpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5hdXRvUnVuKSB7XG4gICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCBzdGVwLmRhdGEuYW1vdW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBsb2NhdG9yID0gc3RlcC5kYXRhLmxvY2F0b3I7XG4gICAgICAgICAgICB2YXIgc3RlcHMgPSBzY2VuYXJpby5zdGVwcztcbiAgICAgICAgICAgIHZhciB1bmlxdWVJZCA9IGdldFVuaXF1ZUlkRnJvbVN0ZXAoc3RlcCk7XG5cbiAgICAgICAgICAgIC8vIHRyeSB0byBnZXQgcmlkIG9mIHVubmVjZXNzYXJ5IHN0ZXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRvU2tpcFt1bmlxdWVJZF0gPT0gJ3VuZGVmaW5lZCcgJiYgdXRtZS5zdGF0ZS5ydW4uc3BlZWQgIT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICB2YXIgZGlmZjtcbiAgICAgICAgICAgICAgdmFyIGlnbm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICBmb3IgKHZhciBqID0gc3RlcHMubGVuZ3RoIC0gMTsgaiA+IGlkeDsgai0tKSB7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyU3RlcCA9IHN0ZXBzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclVuaXF1ZUlkID0gZ2V0VW5pcXVlSWRGcm9tU3RlcChvdGhlclN0ZXApO1xuICAgICAgICAgICAgICAgIGlmICh1bmlxdWVJZCA9PT0gb3RoZXJVbmlxdWVJZCkge1xuICAgICAgICAgICAgICAgICAgaWYgKCFkaWZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IChvdGhlclN0ZXAudGltZVN0YW1wIC0gc3RlcC50aW1lU3RhbXApO1xuICAgICAgICAgICAgICAgICAgICAgIGlnbm9yZSA9ICFpc0ltcG9ydGFudFN0ZXAob3RoZXJTdGVwKSAmJiBkaWZmIDwgaW1wb3J0YW50U3RlcExlbmd0aDtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbnRlcmFjdGl2ZVN0ZXAob3RoZXJTdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlnbm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHRvU2tpcFt1bmlxdWVJZF0gPSBpZ25vcmU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlJ3JlIHNraXBwaW5nIHRoaXMgZWxlbWVudFxuICAgICAgICAgICAgaWYgKHRvU2tpcFtnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApXSkge1xuICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeVVudGlsRm91bmQoc2NlbmFyaW8sIHN0ZXAsIGxvY2F0b3IsIGdldFRpbWVvdXQoc2NlbmFyaW8sIGlkeCkpLnRoZW4oZnVuY3Rpb24gKGVsZXMpIHtcblxuICAgICAgICAgICAgICAgICAgdmFyIGVsZSA9IGVsZXNbMF07XG4gICAgICAgICAgICAgICAgICB2YXIgdGFnTmFtZSA9IGVsZS50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3VwcG9ydHNJbnB1dEV2ZW50ID0gdGFnTmFtZSA9PT0gJ2lucHV0JyB8fCB0YWdOYW1lID09PSAndGV4dGFyZWEnIHx8IGVsZS5nZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoZXZlbnRzLmluZGV4T2Yoc3RlcC5ldmVudE5hbWUpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZGF0YS5idXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLndoaWNoID0gb3B0aW9ucy5idXR0b24gPSBzdGVwLmRhdGEuYnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1NpbXVsYXRpbmcgJyArIHN0ZXAuZXZlbnROYW1lICsgJyBvbiBlbGVtZW50ICcsIGVsZSwgbG9jYXRvci5zZWxlY3RvcnNbMF0sIFwiIGZvciBzdGVwIFwiICsgaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdjbGljaycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkKGVsZSkudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoc3RlcC5ldmVudE5hbWUgPT0gJ2ZvY3VzJyB8fCBzdGVwLmV2ZW50TmFtZSA9PSAnYmx1cicpICYmIGVsZVtzdGVwLmV2ZW50TmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICBlbGVbc3RlcC5ldmVudE5hbWVdKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGVbc3RlcC5ldmVudE5hbWVdKGVsZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHN0ZXAuZGF0YS52YWx1ZSAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZWxlLnZhbHVlID0gc3RlcC5kYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgdGhlIGlucHV0IGV2ZW50LlxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzdXBwb3J0c0lucHV0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2NoYW5nZScpOyAvLyBUaGlzIHNob3VsZCBiZSBmaXJlZCBhZnRlciBhIGJsdXIgZXZlbnQuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdrZXlwcmVzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RlcC5kYXRhLmtleUNvZGUpO1xuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5rZXlwcmVzcyhlbGUsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleWRvd24oZWxlLCBrZXkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGVsZS52YWx1ZSA9IHN0ZXAuZGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnY2hhbmdlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5dXAoZWxlLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNJbnB1dEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKCdWYWxpZGF0ZTogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSAgKyBcIiBjb250YWlucyB0ZXh0ICdcIiAgKyBzdGVwLmRhdGEudGV4dCArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJWYWxpZGF0ZTogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0RXJyb3IoXCJGYWlsZWQgb24gc3RlcDogXCIgKyBpZHggKyBcIiAgRXZlbnQ6IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIiBSZWFzb246IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MuZ2V0KCd2ZXJib3NlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5hdXRvUnVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiB3YWl0Rm9yQW5ndWxhcihyb290U2VsZWN0b3IpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJvb3RTZWxlY3Rvcik7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FuZ3VsYXIgY291bGQgbm90IGJlIGZvdW5kIG9uIHRoZSB3aW5kb3cnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmdldFRlc3RhYmlsaXR5KSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5nZXRUZXN0YWJpbGl0eShlbCkud2hlblN0YWJsZShyZXNvbHZlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmVsZW1lbnQoZWwpLmluamVjdG9yKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdyb290IGVsZW1lbnQgKCcgKyByb290U2VsZWN0b3IgKyAnKSBoYXMgbm8gaW5qZWN0b3IuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnIHRoaXMgbWF5IG1lYW4gaXQgaXMgbm90IGluc2lkZSBuZy1hcHAuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChlbCkuaW5qZWN0b3IoKS5nZXQoJyRicm93c2VyJykuXG4gICAgICAgICAgICAgICAgbm90aWZ5V2hlbk5vT3V0c3RhbmRpbmdSZXF1ZXN0cyhyZXNvbHZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBpc0ltcG9ydGFudFN0ZXAoc3RlcCkge1xuICAgIHJldHVybiBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VsZWF2ZScgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlb3V0JyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VlbnRlcicgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlb3ZlcicgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ2JsdXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdmb2N1cyc7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBzdGVwIGlzIHNvbWUgc29ydCBvZiB1c2VyIGludGVyYWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGlzSW50ZXJhY3RpdmVTdGVwKHN0ZXApIHtcbiAgICB2YXIgZXZ0ID0gc3RlcC5ldmVudE5hbWU7XG5cbiAgICAvKlxuICAgICAgIC8vIEludGVyZXN0aW5nIG5vdGUsIGRvaW5nIHRoZSBmb2xsb3dpbmcgd2FzIGNhdXNpbmcgdGhpcyBmdW5jdGlvbiB0byByZXR1cm4gdW5kZWZpbmVkLlxuICAgICAgIHJldHVyblxuICAgICAgICAgICBldnQuaW5kZXhPZihcIm1vdXNlXCIpICE9PSAwIHx8XG4gICAgICAgICAgIGV2dC5pbmRleE9mKFwibW91c2Vkb3duXCIpID09PSAwIHx8XG4gICAgICAgICAgIGV2dC5pbmRleE9mKFwibW91c2V1cFwiKSA9PT0gMDtcblxuICAgICAgIC8vIEl0cyBiZWNhdXNlIHRoZSBjb25kaXRpb25zIHdlcmUgbm90IG9uIHRoZSBzYW1lIGxpbmUgYXMgdGhlIHJldHVybiBzdGF0ZW1lbnRcbiAgICAqL1xuICAgIHJldHVybiBldnQuaW5kZXhPZihcIm1vdXNlXCIpICE9PSAwIHx8IGV2dC5pbmRleE9mKFwibW91c2Vkb3duXCIpID09PSAwIHx8IGV2dC5pbmRleE9mKFwibW91c2V1cFwiKSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gdHJ5VW50aWxGb3VuZChzY2VuYXJpbywgc3RlcCwgbG9jYXRvciwgdGltZW91dCwgdGV4dFRvQ2hlY2spIHtcbiAgICB2YXIgc3RhcnRlZDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiB0cnlGaW5kKCkge1xuICAgICAgICAgICAgaWYgKCFzdGFydGVkKSB7XG4gICAgICAgICAgICAgICAgc3RhcnRlZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlcztcbiAgICAgICAgICAgIHZhciBmb3VuZFRvb01hbnkgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBmb3VuZFZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZm91bmREaWZmZXJlbnRUZXh0ID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgc2VsZWN0b3JzVG9UZXN0ID0gbG9jYXRvci5zZWxlY3RvcnMuc2xpY2UoMCk7XG4gICAgICAgICAgICB2YXIgdGV4dFRvQ2hlY2sgPSBzdGVwLmRhdGEudGV4dDtcbiAgICAgICAgICAgIHZhciBjb21wYXJpc29uID0gc3RlcC5kYXRhLmNvbXBhcmlzb24gfHwgXCJlcXVhbHNcIjtcbiAgICAgICAgICAgIHNlbGVjdG9yc1RvVGVzdC51bnNoaWZ0KCdbZGF0YS11bmlxdWUtaWQ9XCInICsgbG9jYXRvci51bmlxdWVJZCArICdcIl0nKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzVG9UZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdG9yID0gc2VsZWN0b3JzVG9UZXN0W2ldO1xuICAgICAgICAgICAgICAgIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gXCI6dmlzaWJsZVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbGVzID0gJChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKGVsZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0ZXh0VG9DaGVjayAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld1RleHQgPSAkKGVsZXNbMF0pLnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoY29tcGFyaXNvbiA9PT0gJ2VxdWFscycgJiYgbmV3VGV4dCA9PT0gdGV4dFRvQ2hlY2spIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNvbXBhcmlzb24gPT09ICdjb250YWlucycgJiYgbmV3VGV4dC5pbmRleE9mKHRleHRUb0NoZWNrKSA+PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZERpZmZlcmVudFRleHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRWYWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVzLmF0dHIoJ2RhdGEtdW5pcXVlLWlkJywgbG9jYXRvci51bmlxdWVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVsZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZFRvb01hbnkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZvdW5kVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGVsZXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkgJiYgKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRlZCkgPCB0aW1lb3V0ICogNSkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgNTApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAoZm91bmRUb29NYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBGb3VuZCBUb28gTWFueSBFbGVtZW50c1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZm91bmREaWZmZXJlbnRUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBUZXh0IGRvZXNuJ3QgbWF0Y2guICBcXG5FeHBlY3RlZDpcXG5cIiArIHRleHRUb0NoZWNrICsgXCJcXG5idXQgd2FzXFxuXCIgKyBlbGVzLnRleHQoKSArIFwiXFxuXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IE5vIGVsZW1lbnRzIGZvdW5kXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdChyZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxpbWl0ID0gaW1wb3J0YW50U3RlcExlbmd0aCAvICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PSAncmVhbHRpbWUnID8gJzEnIDogdXRtZS5zdGF0ZS5ydW4uc3BlZWQpO1xuICAgICAgICBpZiAoZ2xvYmFsLmFuZ3VsYXIpIHtcbiAgICAgICAgICAgIHdhaXRGb3JBbmd1bGFyKCdbbmctYXBwXScpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgICB0cnlGaW5kKCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiB1dG1lLnN0YXRlLnJ1bi5zcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIHRpbWVvdXQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiB1dG1lLnN0YXRlLnJ1bi5zcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lb3V0KHNjZW5hcmlvLCBpZHgpIHtcbiAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgc3RlcCBpcyBhIHZhbGlkYXRlIHN0ZXAsIHRoZW4ganVzdCBtb3ZlIG9uLCBhbmQgcHJldGVuZCBpdCBpc24ndCB0aGVyZVxuICAgICAgICAvLyBPciBpZiBpdCBpcyBhIHNlcmllcyBvZiBrZXlzLCB0aGVuIGdvXG4gICAgICAgIGlmIChzY2VuYXJpby5zdGVwc1tpZHggLSAxXS5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5hcmlvLnN0ZXBzW2lkeF0udGltZVN0YW1wIC0gc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0udGltZVN0YW1wO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCB0aW1lb3V0KSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGFyZW4ndCBnb2luZyB0byBvdmVyZmxvdyB0aGUgY2FsbCBzdGFjay5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHMubGVuZ3RoID4gKGlkeCArIDEpKSB7XG4gICAgICAgICAgICBydW5TdGVwKHNjZW5hcmlvLCBpZHggKyAxLCB0b1NraXApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9LCB0aW1lb3V0IHx8IDApO1xufVxuXG5mdW5jdGlvbiBmcmFnbWVudEZyb21TdHJpbmcoc3RySFRNTCkge1xuICAgIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICB0ZW1wLmlubmVySFRNTCA9IHN0ckhUTUw7XG4gICAgLy8gY29uc29sZS5sb2codGVtcC5pbm5lckhUTUwpO1xuICAgIHJldHVybiB0ZW1wLmNvbnRlbnQgPyB0ZW1wLmNvbnRlbnQgOiB0ZW1wO1xufVxuXG5mdW5jdGlvbiBnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApIHtcbiAgICByZXR1cm4gc3RlcCAmJiBzdGVwLmRhdGEgJiYgc3RlcC5kYXRhLmxvY2F0b3IgJiYgc3RlcC5kYXRhLmxvY2F0b3IudW5pcXVlSWQ7XG59XG5cbnZhciBndWlkID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBzNCgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXG4gICAgICAgICAgICAudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgICAgICAgICBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xuICAgIH07XG59KSgpO1xuXG52YXIgbGlzdGVuZXJzID0gW107XG52YXIgc3RhdGU7XG52YXIgc2V0dGluZ3M7XG52YXIgdXRtZSA9IHtcbiAgICBzdGF0ZTogc3RhdGUsXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2NlbmFyaW8gPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3V0bWVfc2NlbmFyaW8nKTtcbiAgICAgICAgcmV0dXJuIHV0bWUubG9hZFNldHRpbmdzKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHV0bWUuc3RhdGUgPSB1dG1lLmxvYWRTdGF0ZUZyb21TdG9yYWdlKCk7XG4gICAgICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0lOSVRJQUxJWkVEJyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnRlc3RTZXJ2ZXIgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoXCJ1dG1lX3Rlc3Rfc2VydmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5hdXRvUnVuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcnVuQ29uZmlnID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3J1bl9jb25maWcnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJ1bkNvbmZpZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuQ29uZmlnID0gSlNPTi5wYXJzZShydW5Db25maWcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJ1bkNvbmZpZyA9IHJ1bkNvbmZpZyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwZWVkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3J1bl9zcGVlZCcpIHx8IHNldHRpbmdzLmdldChcInJ1bm5lci5zcGVlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNwZWVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5Db25maWcuc3BlZWQgPSBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHV0bWUucnVuU2NlbmFyaW8oc2NlbmFyaW8sIHJ1bkNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gdXRtZS5zdGF0ZSA9IHV0bWUubG9hZFN0YXRlRnJvbVN0b3JhZ2UoKTtcbiAgICAgICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnSU5JVElBTElaRUQnKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc3RhdHVzID09PSBcIlBMQVlJTkdcIikge1xuICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzdGF0ZS5ydW4uc2NlbmFyaW8sIHN0YXRlLnJ1bi5zdGVwSW5kZXgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN0YXRlLnN0YXR1cyB8fCBzdGF0ZS5zdGF0dXMgPT09ICdJTklUSUFMSVpJTkcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiTE9BREVEXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGJyb2FkY2FzdDogZnVuY3Rpb24gKGV2dCwgZXZ0RGF0YSkge1xuICAgICAgICBpZiAobGlzdGVuZXJzICYmIGxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzW2ldKGV2dCwgZXZ0RGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN0YXJ0UmVjb3JkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgIT0gJ1JFQ09SRElORycpIHtcbiAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9ICdSRUNPUkRJTkcnO1xuICAgICAgICAgICAgc3RhdGUuc3RlcHMgPSBbXTtcbiAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0YXJ0ZWRcIik7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUQVJURUQnKTtcblxuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcnVuU2NlbmFyaW86IGZ1bmN0aW9uIChuYW1lLCBjb25maWcpIHtcbiAgICAgICAgdmFyIHRvUnVuID0gbmFtZSB8fCBwcm9tcHQoJ1NjZW5hcmlvIHRvIHJ1bicpO1xuICAgICAgICB2YXIgYXV0b1J1biA9ICFuYW1lID8gcHJvbXB0KCdXb3VsZCB5b3UgbGlrZSB0byBzdGVwIHRocm91Z2ggZWFjaCBzdGVwICh5fG4pPycpICE9ICd5JyA6IHRydWU7XG4gICAgICAgIHJldHVybiBnZXRTY2VuYXJpbyh0b1J1bikudGhlbihmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgIHNjZW5hcmlvID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzY2VuYXJpbykpO1xuICAgICAgICAgICAgdXRtZS5zdGF0ZS5ydW4gPSBfLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgc3BlZWQ6ICcxMCdcbiAgICAgICAgICAgIH0sIGNvbmZpZyk7XG5cbiAgICAgICAgICAgIHNldHVwQ29uZGl0aW9ucyhzY2VuYXJpbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYXV0b1J1biA9IGF1dG9SdW4gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJQTEFZSU5HXCI7XG5cbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0YXJ0aW5nIFNjZW5hcmlvICdcIiArIG5hbWUgKyBcIidcIiwgc2NlbmFyaW8pO1xuICAgICAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdQTEFZQkFDS19TVEFSVEVEJyk7XG5cbiAgICAgICAgICAgICAgICBydW5TdGVwKHNjZW5hcmlvLCAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHJ1bk5leHRTdGVwOiBydW5OZXh0U3RlcCxcbiAgICBzdG9wU2NlbmFyaW86IGZ1bmN0aW9uIChzdWNjZXNzKSB7XG4gICAgICAgIHZhciBzY2VuYXJpbyA9IHN0YXRlLnJ1biAmJiBzdGF0ZS5ydW4uc2NlbmFyaW87XG4gICAgICAgIGRlbGV0ZSBzdGF0ZS5ydW47XG4gICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiTE9BREVEXCI7XG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdQTEFZQkFDS19TVE9QUEVEJyk7XG5cbiAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBTY2VuYXJpb1wiKTtcbiAgICAgICAgaWYgKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0U3VjY2VzcyhcIltTVUNDRVNTXSBTY2VuYXJpbyAnXCIgKyBzY2VuYXJpby5uYW1lICsgXCInIENvbXBsZXRlZCFcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiU3RvcHBpbmcgb24gcGFnZSBcIiArIHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydEVycm9yKFwiW0ZBSUxVUkVdIFNjZW5hcmlvICdcIiArIHNjZW5hcmlvLm5hbWUgKyBcIicgU3RvcHBlZCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHRlbXBvcmFyeSBlbGVtZW50IGxvY2F0b3IsIGZvciB1c2Ugd2l0aCBmaW5hbGl6ZUxvY2F0b3JcbiAgICAgKi9cbiAgICBjcmVhdGVFbGVtZW50TG9jYXRvcjogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHVuaXF1ZUlkID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXVuaXF1ZS1pZFwiKSB8fCBndWlkKCk7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKFwiZGF0YS11bmlxdWUtaWRcIiwgdW5pcXVlSWQpO1xuXG4gICAgICAgIHZhciBlbGVIdG1sID0gZWxlbWVudC5jbG9uZU5vZGUoKS5vdXRlckhUTUw7XG4gICAgICAgIHZhciBlbGVTZWxlY3RvcnMgPSBbXTtcbiAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09ICdCT0RZJyB8fCBlbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PSAnSFRNTCcpIHtcbiAgICAgICAgICAgIGVsZVNlbGVjdG9ycyA9IFtlbGVtZW50LnRhZ05hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlU2VsZWN0b3JzID0gc2VsZWN0b3JGaW5kZXIoZWxlbWVudCwgZG9jdW1lbnQuYm9keSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHVuaXF1ZUlkOiB1bmlxdWVJZCxcbiAgICAgICAgICAgIHNlbGVjdG9yczogZWxlU2VsZWN0b3JzXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIHJlZ2lzdGVyRXZlbnQ6IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEsIGlkeCkge1xuICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpIHx8IHV0bWUuaXNWYWxpZGF0aW5nKCkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaWR4ID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5zdGVwc1tpZHhdID0ge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogZXZlbnROYW1lLFxuICAgICAgICAgICAgICAgIHRpbWVTdGFtcDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdFVkVOVF9SRUdJU1RFUkVEJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydExvZzogZnVuY3Rpb24gKGxvZywgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLmxvZyhsb2csIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0RXJyb3I6IGZ1bmN0aW9uIChlcnJvciwgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLmVycm9yKGVycm9yLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydFN1Y2Nlc3M6IGZ1bmN0aW9uIChtZXNzYWdlLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0uc3VjY2VzcyhtZXNzYWdlLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlZ2lzdGVyTGlzdGVuZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGxpc3RlbmVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJTYXZlSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgc2F2ZUhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclJlcG9ydEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHJlcG9ydEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlckxvYWRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBsb2FkSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyU2V0dGluZ3NMb2FkSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgc2V0dGluZ3NMb2FkSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIGlzUmVjb3JkaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJSRUNPUkRJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBpc1BsYXlpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlBMQVlJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBpc1ZhbGlkYXRpbmc6IGZ1bmN0aW9uKHZhbGlkYXRpbmcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWxpZGF0aW5nICE9PSAndW5kZWZpbmVkJyAmJiAodXRtZS5pc1JlY29yZGluZygpIHx8IHV0bWUuaXNWYWxpZGF0aW5nKCkpKSB7XG4gICAgICAgICAgICB1dG1lLnN0YXRlLnN0YXR1cyA9IHZhbGlkYXRpbmcgPyBcIlZBTElEQVRJTkdcIiA6IFwiUkVDT1JESU5HXCI7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnVkFMSURBVElPTl9DSEFOR0VEJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJWQUxJREFUSU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgc3RvcFJlY29yZGluZzogZnVuY3Rpb24gKGluZm8pIHtcbiAgICAgICAgaWYgKGluZm8gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB2YXIgbmV3U2NlbmFyaW8gPSB7XG4gICAgICAgICAgICAgICAgc3RlcHM6IHN0YXRlLnN0ZXBzXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBfLmV4dGVuZChuZXdTY2VuYXJpbywgaW5mbyk7XG5cbiAgICAgICAgICAgIGlmICghbmV3U2NlbmFyaW8ubmFtZSkge1xuICAgICAgICAgICAgICAgIG5ld1NjZW5hcmlvLm5hbWUgPSBwcm9tcHQoJ0VudGVyIHNjZW5hcmlvIG5hbWUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG5ld1NjZW5hcmlvLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zY2VuYXJpb3MucHVzaChuZXdTY2VuYXJpbyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc2F2ZUhhbmRsZXJzICYmIHNhdmVIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzYXZlSGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVIYW5kbGVyc1tpXShuZXdTY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5zdGF0dXMgPSAnTE9BREVEJztcblxuICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUT1BQRUQnKTtcblxuICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlJlY29yZGluZyBTdG9wcGVkXCIsIG5ld1NjZW5hcmlvKTtcbiAgICB9LFxuXG4gICAgbG9hZFNldHRpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldHRpbmdzID0gdXRtZS5zZXR0aW5ncyA9IG5ldyBTZXR0aW5ncygpO1xuICAgICAgICBpZiAoc2V0dGluZ3NMb2FkSGFuZGxlcnMubGVuZ3RoID4gMCAmJiAhZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3NjZW5hcmlvJykpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3NMb2FkSGFuZGxlcnNbMF0oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3Muc2V0RGVmYXVsdHMocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxvYWRTdGF0ZUZyb21TdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1dG1lU3RhdGVTdHIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndXRtZScpO1xuICAgICAgICBpZiAodXRtZVN0YXRlU3RyKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEpTT04ucGFyc2UodXRtZVN0YXRlU3RyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlID0ge1xuICAgICAgICAgICAgICAgIHN0YXR1czogXCJJTklUSUFMSVpJTkdcIixcbiAgICAgICAgICAgICAgICBzY2VuYXJpb3M6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9LFxuXG4gICAgc2F2ZVN0YXRlVG9TdG9yYWdlOiBmdW5jdGlvbiAodXRtZVN0YXRlKSB7XG4gICAgICAgIGlmICh1dG1lU3RhdGUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd1dG1lJywgSlNPTi5zdHJpbmdpZnkodXRtZVN0YXRlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgndXRtZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVubG9hZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB1dG1lLnNhdmVTdGF0ZVRvU3RvcmFnZShzdGF0ZSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gdG9nZ2xlSGlnaGxpZ2h0KGVsZSwgdmFsdWUpIHtcbiAgICAkKGVsZSkudG9nZ2xlQ2xhc3MoJ3V0bWUtdmVyaWZ5JywgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiB0b2dnbGVSZWFkeShlbGUsIHZhbHVlKSB7XG4gICAgJChlbGUpLnRvZ2dsZUNsYXNzKCd1dG1lLXJlYWR5JywgdmFsdWUpO1xufVxuXG4vKipcbiAqIElmIHlvdSBjbGljayBvbiBhIHNwYW4gaW4gYSBsYWJlbCwgdGhlIHNwYW4gd2lsbCBjbGljayxcbiAqIHRoZW4gdGhlIGJyb3dzZXIgd2lsbCBmaXJlIHRoZSBjbGljayBldmVudCBmb3IgdGhlIGlucHV0IGNvbnRhaW5lZCB3aXRoaW4gdGhlIHNwYW4sXG4gKiBTbywgd2Ugb25seSB3YW50IHRvIHRyYWNrIHRoZSBpbnB1dCBjbGlja3MuXG4gKi9cbmZ1bmN0aW9uIGlzTm90SW5MYWJlbE9yVmFsaWQoZWxlKSB7XG4gICAgcmV0dXJuICQoZWxlKS5wYXJlbnRzKCdsYWJlbCcpLmxlbmd0aCA9PSAwIHx8XG4gICAgICAgICAgZWxlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ2lucHV0Jztcbn1cblxudmFyIHRpbWVycyA9IFtdO1xuXG5mdW5jdGlvbiBpbml0RXZlbnRIYW5kbGVycygpIHtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRzW2ldLCAoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSAmJlxuICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5oYXNBdHRyaWJ1dGUgJiZcbiAgICAgICAgICAgICAgICAgICAgIWUudGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnZGF0YS1pZ25vcmUnKSAmJlxuICAgICAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiW2RhdGEtaWdub3JlXVwiKS5sZW5ndGggPT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICBpc05vdEluTGFiZWxPclZhbGlkKGUudGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSB1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRvcjogdXRtZS5jcmVhdGVFbGVtZW50TG9jYXRvcihlLnRhcmdldClcbiAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgIHZhciB0aW1lcjtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChlLndoaWNoIHx8IGUuYnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MuYnV0dG9uID0gZS53aGljaCB8fCBlLmJ1dHRvbjtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdtb3VzZW92ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGUudGFyZ2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXI6IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlYWR5KGUudGFyZ2V0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChldnQgPT0gJ21vdXNlb3V0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRpbWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVyc1tpXS5lbGVtZW50ID09IGUudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyc1tpXS50aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlUmVhZHkoZS50YXJnZXQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudmFsdWUgPSBlLnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoZXZ0LCBhcmdzLCBpZHgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gSEFDSyBmb3IgdGVzdGluZ1xuICAgICAgICAgICAgKHV0bWUuZXZlbnRMaXN0ZW5lcnMgPSB1dG1lLmV2ZW50TGlzdGVuZXJzIHx8IHt9KVtldnRdID0gaGFuZGxlcjtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgICAgICB9KShldmVudHNbaV0pLCB0cnVlKTtcbiAgICB9XG5cbiAgICB2YXIgX3RvX2FzY2lpID0ge1xuICAgICAgICAnMTg4JzogJzQ0JyxcbiAgICAgICAgJzEwOSc6ICc0NScsXG4gICAgICAgICcxOTAnOiAnNDYnLFxuICAgICAgICAnMTkxJzogJzQ3JyxcbiAgICAgICAgJzE5Mic6ICc5NicsXG4gICAgICAgICcyMjAnOiAnOTInLFxuICAgICAgICAnMjIyJzogJzM5JyxcbiAgICAgICAgJzIyMSc6ICc5MycsXG4gICAgICAgICcyMTknOiAnOTEnLFxuICAgICAgICAnMTczJzogJzQ1JyxcbiAgICAgICAgJzE4Nyc6ICc2MScsIC8vSUUgS2V5IGNvZGVzXG4gICAgICAgICcxODYnOiAnNTknLCAvL0lFIEtleSBjb2Rlc1xuICAgICAgICAnMTg5JzogJzQ1JyAvL0lFIEtleSBjb2Rlc1xuICAgIH07XG5cbiAgICB2YXIgc2hpZnRVcHMgPSB7XG4gICAgICAgIFwiOTZcIjogXCJ+XCIsXG4gICAgICAgIFwiNDlcIjogXCIhXCIsXG4gICAgICAgIFwiNTBcIjogXCJAXCIsXG4gICAgICAgIFwiNTFcIjogXCIjXCIsXG4gICAgICAgIFwiNTJcIjogXCIkXCIsXG4gICAgICAgIFwiNTNcIjogXCIlXCIsXG4gICAgICAgIFwiNTRcIjogXCJeXCIsXG4gICAgICAgIFwiNTVcIjogXCImXCIsXG4gICAgICAgIFwiNTZcIjogXCIqXCIsXG4gICAgICAgIFwiNTdcIjogXCIoXCIsXG4gICAgICAgIFwiNDhcIjogXCIpXCIsXG4gICAgICAgIFwiNDVcIjogXCJfXCIsXG4gICAgICAgIFwiNjFcIjogXCIrXCIsXG4gICAgICAgIFwiOTFcIjogXCJ7XCIsXG4gICAgICAgIFwiOTNcIjogXCJ9XCIsXG4gICAgICAgIFwiOTJcIjogXCJ8XCIsXG4gICAgICAgIFwiNTlcIjogXCI6XCIsXG4gICAgICAgIFwiMzlcIjogXCJcXFwiXCIsXG4gICAgICAgIFwiNDRcIjogXCI8XCIsXG4gICAgICAgIFwiNDZcIjogXCI+XCIsXG4gICAgICAgIFwiNDdcIjogXCI/XCJcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24ga2V5UHJlc3NIYW5kbGVyIChlKSB7XG4gICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpICYmIGUudGFyZ2V0Lmhhc0F0dHJpYnV0ZSAmJiAhZS50YXJnZXQuaGFzQXR0cmlidXRlKCdkYXRhLWlnbm9yZScpICYmICQoZS50YXJnZXQpLnBhcmVudHMoXCJbZGF0YS1pZ25vcmVdXCIpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICB2YXIgYyA9IGUud2hpY2g7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IERvZXNuJ3Qgd29yayB3aXRoIGNhcHMgbG9ja1xuICAgICAgICAgICAgLy9ub3JtYWxpemUga2V5Q29kZVxuICAgICAgICAgICAgaWYgKF90b19hc2NpaS5oYXNPd25Qcm9wZXJ0eShjKSkge1xuICAgICAgICAgICAgICAgIGMgPSBfdG9fYXNjaWlbY107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZS5zaGlmdEtleSAmJiAoYyA+PSA2NSAmJiBjIDw9IDkwKSkge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgKyAzMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgc2hpZnRVcHMuaGFzT3duUHJvcGVydHkoYykpIHtcbiAgICAgICAgICAgICAgICAvL2dldCBzaGlmdGVkIGtleUNvZGUgdmFsdWVcbiAgICAgICAgICAgICAgICBjID0gc2hpZnRVcHNbY107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoJ2tleXByZXNzJywge1xuICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpLFxuICAgICAgICAgICAgICAgIGtleTogYyxcbiAgICAgICAgICAgICAgICBwcmV2VmFsdWU6IGUudGFyZ2V0LnZhbHVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlLnRhcmdldC52YWx1ZSArIGMsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywga2V5UHJlc3NIYW5kbGVyLCB0cnVlKTtcblxuICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAodXRtZS5ldmVudExpc3RlbmVycyA9IHV0bWUuZXZlbnRMaXN0ZW5lcnMgfHwge30pWydrZXlwcmVzcyddID0ga2V5UHJlc3NIYW5kbGVyO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG5cbmZ1bmN0aW9uIGJvb3RzdHJhcFV0bWUoKSB7XG4gIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09IFwiY29tcGxldGVcIikge1xuICAgIHV0bWUuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGluaXRFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSkge1xuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5ib290c3RyYXBVdG1lKCk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgYm9vdHN0cmFwVXRtZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdXRtZS51bmxvYWQoKTtcbn0sIHRydWUpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdXRtZS5yZXBvcnRMb2coXCJTY3JpcHQgRXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UgKyBcIjpcIiArIGVyci51cmwgKyBcIixcIiArIGVyci5saW5lICsgXCI6XCIgKyBlcnIuY29sKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNWMGJXVXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOW9iMjFsTDJSaGRtbGtkR2wwZEhOM2IzSjBhQzl3Y205cVpXTjBjeTkxZEcxbEwzTnlZeTlxY3k5MWRHMWxMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzUTBGQlF5eEhRVUZITEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRCUVVNelFpeEpRVUZKTEU5QlFVOHNSMEZCUnl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETzBGQlF6ZERMRWxCUVVrc1VVRkJVU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXp0QlFVTnlReXhKUVVGSkxHTkJRV01zUjBGQlJ5eFBRVUZQTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6dEJRVU5xUkN4SlFVRkpMRkZCUVZFc1IwRkJSeXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdPMEZCUlhKRExHZEVRVUZuUkR0QlFVTm9SQ3hKUVVGSkxHMUNRVUZ0UWl4SFFVRkhMRWRCUVVjc1EwRkJRenRCUVVNNVFpeEpRVUZKTEZsQlFWa3NSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRkRUlzU1VGQlNTeGpRVUZqTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTNoQ0xFbEJRVWtzV1VGQldTeEhRVUZITEVWQlFVVXNRMEZCUXp0QlFVTjBRaXhKUVVGSkxHOUNRVUZ2UWl4SFFVRkhMRVZCUVVVc1EwRkJRenM3UVVGRk9VSXNVMEZCVXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hGUVVGRk8wbEJRM1pDTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrc1dVRkJXU3hEUVVGRExFMUJRVTBzUzBGQlN5eERRVUZETEVWQlFVVTdXVUZETTBJc1NVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRemRETEVsQlFVa3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEV0QlFVc3NTVUZCU1N4RlFVRkZPMjlDUVVOc1F5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJsQ1FVTXZRanRoUVVOS08xTkJRMG9zVFVGQlRUdFpRVU5JTEZsQlFWa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVTdaMEpCUTJ4RExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnFRaXhEUVVGRExFTkJRVU03VTBGRFRqdExRVU5LTEVOQlFVTXNRMEZCUXp0RFFVTk9PMEZCUTBRc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eERRVUZET3p0QlFVVjJRaXhKUVVGSkxFMUJRVTBzUjBGQlJ6dEpRVU5VTEU5QlFVODdTVUZEVUN4UFFVRlBPMGxCUTFBc1RVRkJUVHRCUVVOV0xFbEJRVWtzVlVGQlZUdEJRVU5rTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkJSVUVzU1VGQlNTeFhRVUZYT3p0SlFVVllMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVlVGQlZUdEpRVU5XTEZkQlFWYzdTVUZEV0N4VFFVRlRPMEZCUTJJc1NVRkJTU3hSUVVGUk8wRkJRMW83TzBGQlJVRXNRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWjBKQlFXZENMRVZCUVVVc1VVRkJVU3hGUVVGRk8wbEJRMnBETEVsQlFVa3NTMEZCU3l4SFFVRkhMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU03UVVGREwwSXNTVUZCU1N4SlFVRkpMRk5CUVZNc1IwRkJSeXhMUVVGTExFbEJRVWtzUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXpzN1NVRkZla01zU1VGQlNTeFRRVUZUTEVWQlFVVTdVVUZEV0N4UFFVRlBMRTlCUVU4c1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF5eERRVUZETEVkQlFVY3NRMEZCUXl4VFFVRlRMRVZCUVVVc1ZVRkJWU3haUVVGWkxFVkJRVVU3V1VGRGVFUXNUMEZCVHl4WFFVRlhMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETEZWQlFWVXNZVUZCWVN4RlFVRkZPMk5CUXpkRUxHRkJRV0VzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTXNRMEZCUXp0alFVTXhSQ3hQUVVGUExHRkJRV0VzUTBGQlF5eExRVUZMTEVOQlFVTTdZVUZETlVJc1EwRkJReXhEUVVGRE8xTkJRMDRzUTBGQlF5eERRVUZETEVOQlFVTTdTMEZEVUN4TlFVRk5PMUZCUTBnc1QwRkJUeXhQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEVWQlFVVXNRMEZCUXl4RFFVRkRPMHRCUXpsQ08wRkJRMHdzUTBGQlF6czdRVUZGUkN4VFFVRlRMR2xDUVVGcFFpeEZRVUZGTEZGQlFWRXNSVUZCUlR0SlFVTnNReXhKUVVGSkxFOUJRVThzUjBGQlJ5eFJRVUZSTEVOQlFVTXNUMEZCVHl4RFFVRkRPMEZCUTI1RExFbEJRVWtzU1VGQlNTeFRRVUZUTEVkQlFVY3NUMEZCVHl4SlFVRkpMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU03TzBsQlJUZERMRWxCUVVrc1UwRkJVeXhGUVVGRk8xRkJRMWdzVDBGQlR5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eEZRVUZGTEZWQlFWVXNXVUZCV1N4RlFVRkZPMWxCUTNoRUxFOUJRVThzVjBGQlZ5eERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhWUVVGVkxHRkJRV0VzUlVGQlJUdGpRVU0zUkN4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMR0ZCUVdFc1EwRkJReXhEUVVGRExFTkJRVU03WTBGRE1VUXNUMEZCVHl4aFFVRmhMRU5CUVVNc1MwRkJTeXhEUVVGRE8yRkJRelZDTEVOQlFVTXNRMEZCUXp0VFFVTk9MRU5CUVVNc1EwRkJReXhEUVVGRE8wdEJRMUFzVFVGQlRUdFJRVU5JTEU5QlFVOHNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF6dExRVU01UWp0QlFVTk1MRU5CUVVNN08wRkJSVVFzVTBGQlV5eDNRa0ZCZDBJc1EwRkJReXhMUVVGTExFVkJRVVU3U1VGRGNrTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1JVRkJSU3hEUVVGRE8wbEJRMnhDTEVsQlFVa3NaMEpCUVdkQ0xFTkJRVU03U1VGRGNrSXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3VVVGRGJrTXNTVUZCU1N4VFFVRlRMRWRCUVVjc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzFGQlEzcENMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJUdFpRVU5RTEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eExRVUZMTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8yZENRVU51UXl4SlFVRkpMRWxCUVVrc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdaMEpCUTNoQ0xFbEJRVWtzU1VGQlNTeEhRVUZITEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUjBGQlJ5eFRRVUZUTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRExGTkJRVk1zUjBGQlJ5eEZRVUZGTEVOQlFVTTdaMEpCUTNCRkxHZENRVUZuUWl4SlFVRkpMRWxCUVVrc1EwRkJRenRuUWtGRGVrSXNVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExGTkJRVk1zUjBGQlJ5eG5Ra0ZCWjBJc1EwRkJRenRoUVVNM1F6dFRRVU5LTEUxQlFVMDdXVUZEU0N4blFrRkJaMElzUjBGQlJ5eFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1UwRkJVeXhEUVVGRE8xTkJRemRETzFGQlEwUXNVVUZCVVN4SFFVRkhMRkZCUVZFc1EwRkJReXhOUVVGTkxFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdTMEZEZWtNN1NVRkRSQ3hQUVVGUExGRkJRVkVzUTBGQlF6dEJRVU53UWl4RFFVRkRPenRCUVVWRUxGTkJRVk1zWlVGQlpTeEZRVUZGTEZGQlFWRXNSVUZCUlR0SlFVTm9ReXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEZRVUZGTEVOQlFVTTdTVUZEYkVJc1QwRkJUeXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETzFGQlEyWXNaMEpCUVdkQ0xFTkJRVU1zVVVGQlVTeERRVUZETzFGQlF6RkNMR2xDUVVGcFFpeERRVUZETEZGQlFWRXNRMEZCUXp0TFFVTTVRaXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETEZWQlFWVXNWVUZCVlN4RlFVRkZPMUZCUXpGQ0xFbEJRVWtzVTBGQlV5eEhRVUZITEZWQlFWVXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF5eFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRVZCUVVVc1ZVRkJWU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdVVUZEZEVVc1VVRkJVU3hEUVVGRExFdEJRVXNzUjBGQlJ5eDNRa0ZCZDBJc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dExRVU40UkN4RFFVRkRMRU5CUVVNN1FVRkRVQ3hEUVVGRE96dEJRVVZFTEZOQlFWTXNUMEZCVHl4RFFVRkRMRkZCUVZFc1JVRkJSU3hIUVVGSExFVkJRVVVzVFVGQlRTeEZRVUZGTzBsQlEzQkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zWTBGQll5eERRVUZETEVOQlFVTTdRVUZEYmtNc1NVRkJTU3hOUVVGTkxFZEJRVWNzVFVGQlRTeEpRVUZKTEVWQlFVVXNRMEZCUXpzN1NVRkZkRUlzU1VGQlNTeEpRVUZKTEVkQlFVY3NVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dEpRVU12UWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETzBsQlEzWkNMRWxCUVVrc1NVRkJTU3hKUVVGSkxFdEJRVXNzUTBGQlF5eE5RVUZOTEVsQlFVa3NVMEZCVXl4RlFVRkZPMUZCUTI1RExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNVVUZCVVN4SFFVRkhMRkZCUVZFc1EwRkJRenRSUVVNNVFpeExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRk5CUVZNc1IwRkJSeXhIUVVGSExFTkJRVU03VVVGRE1VSXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxFMUJRVTBzUlVGQlJUdFpRVU14UWl4SlFVRkpMRmRCUVZjc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOeVJTeEpRVUZKTEUxQlFVMHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eE5RVUZOTEVOQlFVTTdRVUZET1VNc1dVRkJXU3hKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU03TzFsQlJUbENMRWxCUVVrc1RVRkJUU3hKUVVGSkxFTkJRVU1zVFVGQlRTeERRVUZETEUxQlFVMHNRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRuUWtGREwwSXNUVUZCVFN4SFFVRkhMRWRCUVVjc1IwRkJSeXhOUVVGTkxFTkJRVU03WVVGRGVrSTdXVUZEUkN4SlFVRkpMRk5CUVZNc1IwRkJSeXhEUVVGRExGRkJRVkVzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEUxQlFVMHNUMEZCVHl4WFFVRlhMRWRCUVVjc1RVRkJUU3hEUVVGRExFTkJRVU03UVVGRGNFZ3NXVUZCV1N4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVkQlFVY3NTVUZCU1N4SFFVRkhMRTFCUVUwc1EwRkJReXhEUVVGRE96dFpRVVZ5UkN4UFFVRlBMRU5CUVVNc1IwRkJSeXhGUVVGRkxGRkJRVkVzUTBGQlF5eFJRVUZSTEVkQlFVY3NVVUZCVVN4RFFVRkRMRWxCUVVrc1IwRkJSeXhSUVVGUkxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTTdRVUZETDBVc1dVRkJXU3hQUVVGUExFTkJRVU1zUjBGQlJ5eEZRVUZGTEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExGRkJRVkVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU03UVVGRE9VWTdRVUZEUVRzN1dVRkZXU3hKUVVGSkxGTkJRVk1zUlVGQlJUdG5Ra0ZEV0N4TlFVRk5MRU5CUVVNc1RVRkJUU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzBGQlEzQkRMR0ZCUVdFN08xTkJSVW9zVFVGQlRTeEpRVUZKTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1UwRkJVeXhGUVVGRk8xbEJRM0JETEVsQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU4c1JVRkJSVHRuUWtGRFppeFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFVkJRVVVzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRoUVVONFJEdFRRVU5LTEUxQlFVMDdXVUZEU0N4SlFVRkpMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXp0WlFVTm9ReXhKUVVGSkxFdEJRVXNzUjBGQlJ5eFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUTNaRExGbEJRVmtzU1VGQlNTeFJRVUZSTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdRVUZEY2tRN08xbEJSVmtzU1VGQlNTeFBRVUZQTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1NVRkJTU3hYUVVGWExFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhKUVVGSkxGVkJRVlVzUlVGQlJUdGpRVU5vUml4SlFVRkpMRWxCUVVrc1EwRkJRenRqUVVOVUxFbEJRVWtzVFVGQlRTeEhRVUZITEV0QlFVc3NRMEZCUXp0alFVTnVRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRek5ETEVsQlFVa3NVMEZCVXl4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dG5Ra0ZEZWtJc1NVRkJTU3hoUVVGaExFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03WjBKQlEyNUVMRWxCUVVrc1VVRkJVU3hMUVVGTExHRkJRV0VzUlVGQlJUdHJRa0ZET1VJc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJUdHpRa0ZEVUN4SlFVRkpMRWxCUVVrc1UwRkJVeXhEUVVGRExGTkJRVk1zUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN2MwSkJRemxETEUxQlFVMHNSMEZCUnl4RFFVRkRMR1ZCUVdVc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEpRVUZKTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU03YlVKQlEzUkZMRTFCUVUwc1NVRkJTU3hwUWtGQmFVSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGNrTXNUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJRenR6UWtGRFppeE5RVUZOTzIxQ1FVTlVPMmxDUVVOR08wRkJRMnBDTEdWQlFXVTdPMk5CUlVRc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXp0QlFVTjRReXhoUVVGaE8wRkJRMkk3TzFsQlJWa3NTVUZCU1N4TlFVRk5MRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNc1JVRkJSVHRuUWtGRGJrTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1JVRkJSU3hIUVVGSExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEZEVNc1RVRkJUVHRCUVVOdVFpeG5Ra0ZCWjBJc1lVRkJZU3hEUVVGRExGRkJRVkVzUlVGQlJTeEpRVUZKTEVWQlFVVXNUMEZCVHl4RlFVRkZMRlZCUVZVc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1ZVRkJWU3hKUVVGSkxFVkJRVVU3TzJ0Q1FVVnlSaXhKUVVGSkxFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN2EwSkJRMnhDTEVsQlFVa3NUMEZCVHl4SFFVRkhMRWRCUVVjc1EwRkJReXhQUVVGUExFTkJRVU1zVjBGQlZ5eEZRVUZGTEVOQlFVTTdRVUZETVVRc2EwSkJRV3RDTEVsQlFVa3NhMEpCUVd0Q0xFZEJRVWNzVDBGQlR5eExRVUZMTEU5QlFVOHNTVUZCU1N4UFFVRlBMRXRCUVVzc1ZVRkJWU3hKUVVGSkxFZEJRVWNzUTBGQlF5eFpRVUZaTEVOQlFVTXNhVUpCUVdsQ0xFTkJRVU1zUTBGQlF6czdhMEpCUlRsSExFbEJRVWtzVFVGQlRTeERRVUZETEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTjJReXhKUVVGSkxFOUJRVThzUjBGQlJ5eEZRVUZGTEVOQlFVTTdiMEpCUTJwQ0xFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVN2MwSkJRM0JDTEU5QlFVOHNRMEZCUXl4TFFVRkxMRWRCUVVjc1QwRkJUeXhEUVVGRExFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTFCUVUwc1EwRkJRenRCUVVONFJTeHhRa0ZCY1VJN1FVRkRja0k3TzI5Q1FVVnZRaXhKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NUMEZCVHl4RlFVRkZPM05DUVVNM1FpeERRVUZETEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzNGQ1FVTjZRaXhOUVVGTkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTlCUVU4c1NVRkJTU3hKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEUxQlFVMHNTMEZCU3l4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTzNOQ1FVTjZSaXhIUVVGSExFTkJRVU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4RlFVRkZMRU5CUVVNN2NVSkJRM1pDTEUxQlFVMDdjMEpCUTB3c1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNRMEZCUXl4SFFVRkhMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03UVVGRE4wUXNjVUpCUVhGQ096dHZRa0ZGUkN4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eExRVUZMTEVsQlFVa3NWMEZCVnl4RlFVRkZPMEZCUXk5RUxITkNRVUZ6UWl4SFFVRkhMRU5CUVVNc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRPenR6UWtGRk5VSXNTVUZCU1N4clFrRkJhMElzUlVGQlJUdDNRa0ZEZEVJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN2RVSkJRemxDTzNOQ1FVTkVMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4RFFVRkRPM0ZDUVVNdlFqdEJRVU55UWl4dFFrRkJiVUk3TzJ0Q1FVVkVMRWxCUVVrc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFZRVUZWTEVWQlFVVTdiMEpCUTJoRExFbEJRVWtzUjBGQlJ5eEhRVUZITEUxQlFVMHNRMEZCUXl4WlFVRlpMRU5CUVVNc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXp0dlFrRkRha1FzVVVGQlVTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGFFUXNiMEpCUVc5Q0xGRkJRVkVzUTBGQlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE96dHZRa0ZGTTBJc1IwRkJSeXhEUVVGRExFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVOb1JDeHZRa0ZCYjBJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVWQlFVVXNVVUZCVVN4RFFVRkRMRU5CUVVNN08yOUNRVVU1UWl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0dlFrRkRla0lzU1VGQlNTeHJRa0ZCYTBJc1JVRkJSVHQzUWtGRGNFSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdjVUpCUTJoRE8wRkJRM0pDTEcxQ1FVRnRRanM3YTBKQlJVUXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlVzUlVGQlJUdHZRa0ZEYUVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eFpRVUZaTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NhMEpCUVd0Q0xFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGJra3NiVUpCUVcxQ096dHJRa0ZGUkN4SlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGUExFVkJRVVU3YjBKQlEycENMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRPMjFDUVVOd1F6dHBRa0ZEUml4RlFVRkZMRlZCUVZVc1RVRkJUU3hGUVVGRk8yOUNRVU5xUWl4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZTeEZRVUZGTzNOQ1FVTm9ReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEZsQlFWa3NSMEZCUnl4TlFVRk5MRU5CUVVNc1EwRkJRenR6UWtGRGRFTXNTVUZCU1N4RFFVRkRMRmxCUVZrc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dHhRa0ZETVVJc1RVRkJUU3hKUVVGSkxHVkJRV1VzUTBGQlF5eEpRVUZKTEVOQlFVTXNSVUZCUlR0M1FrRkRPVUlzU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4clFrRkJhMElzUjBGQlJ5eEhRVUZITEVkQlFVY3NWMEZCVnl4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzVjBGQlZ5eEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPM2RDUVVOcVJ5eEpRVUZKTEVOQlFVTXNXVUZCV1N4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8zRkNRVU0xUWl4TlFVRk5PM05DUVVOTUxFbEJRVWtzVVVGQlVTeERRVUZETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHQzUWtGRE0wSXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dDFRa0ZEZUVJN2MwSkJRMFFzU1VGQlNTeExRVUZMTEVOQlFVTXNUMEZCVHl4RlFVRkZPM2RDUVVOcVFpeFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFTkJRVU1zUTBGQlF6dDFRa0ZEY0VNN2NVSkJRMFk3YVVKQlEwb3NRMEZCUXl4RFFVRkRPMkZCUTA0N1UwRkRTanRMUVVOS08wRkJRMHdzUTBGQlF6czdRVUZGUkN4VFFVRlRMR05CUVdNc1EwRkJReXhaUVVGWkxFVkJRVVU3U1VGRGJFTXNTVUZCU1N4RlFVRkZMRWRCUVVjc1VVRkJVU3hEUVVGRExHRkJRV0VzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXp0SlFVTTVReXhQUVVGUExFbEJRVWtzVDBGQlR5eERRVUZETEZWQlFWVXNUMEZCVHl4RlFVRkZMRTFCUVUwc1JVRkJSVHRSUVVNeFF5eEpRVUZKTzFsQlEwRXNTVUZCU1N4RFFVRkRMRTFCUVUwc1EwRkJReXhQUVVGUExFVkJRVVU3WjBKQlEycENMRTFCUVUwc1NVRkJTU3hMUVVGTExFTkJRVU1zTUVOQlFUQkRMRU5CUVVNc1EwRkJRenRoUVVNdlJEdFpRVU5FTEVsQlFVa3NUMEZCVHl4RFFVRkRMR05CUVdNc1JVRkJSVHRuUWtGRGVFSXNUMEZCVHl4RFFVRkRMR05CUVdNc1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF5eFZRVUZWTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1lVRkRiRVFzVFVGQlRUdG5Ra0ZEU0N4SlFVRkpMRU5CUVVNc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UlFVRlJMRVZCUVVVc1JVRkJSVHR2UWtGRGFrTXNUVUZCVFN4SlFVRkpMRXRCUVVzc1EwRkJReXhuUWtGQlowSXNSMEZCUnl4WlFVRlpMRWRCUVVjc2IwSkJRVzlDTzNkQ1FVTnNSU3g1UTBGQmVVTXNRMEZCUXl4RFFVRkRPMmxDUVVOc1JEdG5Ra0ZEUkN4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRXNSVUZCUlN4RFFVRkRMRWRCUVVjc1EwRkJReXhWUVVGVkxFTkJRVU03WjBKQlF6bERMQ3RDUVVFclFpeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMkZCUXpWRE8xTkJRMG9zUTBGQlF5eFBRVUZQTEVkQlFVY3NSVUZCUlR0WlFVTldMRTFCUVUwc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dFRRVU5tTzB0QlEwb3NRMEZCUXl4RFFVRkRPMEZCUTFBc1EwRkJRenM3UVVGRlJDeFRRVUZUTEdWQlFXVXNRMEZCUXl4SlFVRkpMRVZCUVVVN1NVRkRNMElzVDBGQlR5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRmxCUVZrN1YwRkRPVUlzU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4VlFVRlZPMWRCUXpWQ0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NXVUZCV1R0WFFVTTVRaXhKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEZkQlFWYzdWMEZETjBJc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeE5RVUZOTzFkQlEzaENMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVDBGQlR5eERRVUZETzBGQlEzSkRMRU5CUVVNN08wRkJSVVE3TzBkQlJVYzdRVUZEU0N4VFFVRlRMR2xDUVVGcFFpeERRVUZETEVsQlFVa3NSVUZCUlR0QlFVTnFReXhKUVVGSkxFbEJRVWtzUjBGQlJ5eEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNN1FVRkROMEk3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEpRVVZKTEU5QlFVOHNSMEZCUnl4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUzBGQlN5eERRVUZETEVsQlFVa3NSMEZCUnl4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFTkJRVU1zUzBGQlN5eERRVUZETEVsQlFVa3NSMEZCUnl4RFFVRkRMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdRVUZEZUVjc1EwRkJRenM3UVVGRlJDeFRRVUZUTEdGQlFXRXNRMEZCUXl4UlFVRlJMRVZCUVVVc1NVRkJTU3hGUVVGRkxFOUJRVThzUlVGQlJTeFBRVUZQTEVWQlFVVXNWMEZCVnl4RlFVRkZPMGxCUTJ4RkxFbEJRVWtzVDBGQlR5eERRVUZETzBsQlExb3NUMEZCVHl4SlFVRkpMRTlCUVU4c1EwRkJReXhWUVVGVkxFOUJRVThzUlVGQlJTeE5RVUZOTEVWQlFVVTdVVUZETVVNc1UwRkJVeXhQUVVGUExFZEJRVWM3V1VGRFppeEpRVUZKTEVOQlFVTXNUMEZCVHl4RlFVRkZPMmRDUVVOV0xFOUJRVThzUjBGQlJ5eEpRVUZKTEVsQlFVa3NSVUZCUlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRE8wRkJReTlETEdGQlFXRTdPMWxCUlVRc1NVRkJTU3hKUVVGSkxFTkJRVU03V1VGRFZDeEpRVUZKTEZsQlFWa3NSMEZCUnl4TFFVRkxMRU5CUVVNN1dVRkRla0lzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4RFFVRkRPMWxCUTNaQ0xFbEJRVWtzYTBKQlFXdENMRWRCUVVjc1MwRkJTeXhEUVVGRE8xbEJReTlDTEVsQlFVa3NaVUZCWlN4SFFVRkhMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMWxCUTJwRUxFbEJRVWtzVjBGQlZ5eEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRE8xbEJRMnBETEVsQlFVa3NWVUZCVlN4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVlVGQlZTeEpRVUZKTEZGQlFWRXNRMEZCUXp0WlFVTnNSQ3hsUVVGbExFTkJRVU1zVDBGQlR5eERRVUZETEcxQ1FVRnRRaXhIUVVGSExFOUJRVThzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRU5CUVVNN1dVRkRka1VzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExHVkJRV1VzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRemRETEVsQlFVa3NVVUZCVVN4SFFVRkhMR1ZCUVdVc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dG5Ra0ZEYkVNc1NVRkJTU3hsUVVGbExFTkJRVU1zU1VGQlNTeERRVUZETEVWQlFVVTdiMEpCUTNaQ0xGRkJRVkVzU1VGQlNTeFZRVUZWTEVOQlFVTTdhVUpCUXpGQ08yZENRVU5FTEVsQlFVa3NSMEZCUnl4RFFVRkRMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03WjBKQlEyNUNMRWxCUVVrc1NVRkJTU3hEUVVGRExFMUJRVTBzU1VGQlNTeERRVUZETEVWQlFVVTdiMEpCUTJ4Q0xFbEJRVWtzVDBGQlR5eFhRVUZYTEVsQlFVa3NWMEZCVnl4RlFVRkZPM2RDUVVOdVF5eEpRVUZKTEU5QlFVOHNSMEZCUnl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNN2QwSkJRMmhETEVsQlFVa3NRMEZCUXl4VlFVRlZMRXRCUVVzc1VVRkJVU3hKUVVGSkxFOUJRVThzUzBGQlN5eFhRVUZYT3paQ1FVTnNSQ3hWUVVGVkxFdEJRVXNzVlVGQlZTeEpRVUZKTEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETEVWQlFVVTdORUpCUTJ4RkxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTTdORUpCUTJ4Q0xFMUJRVTA3ZVVKQlExUXNUVUZCVFRzMFFrRkRTQ3hyUWtGQmEwSXNSMEZCUnl4SlFVRkpMRU5CUVVNN2VVSkJRemRDTzNGQ1FVTktMRTFCUVUwN2QwSkJRMGdzVlVGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXp0M1FrRkRiRUlzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4blFrRkJaMElzUlVGQlJTeFBRVUZQTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNN2QwSkJRemxETEUxQlFVMDdjVUpCUTFRN2IwSkJRMFFzVFVGQlRUdHBRa0ZEVkN4TlFVRk5MRWxCUVVrc1NVRkJTU3hEUVVGRExFMUJRVTBzUjBGQlJ5eERRVUZETEVWQlFVVTdiMEpCUTNoQ0xGbEJRVmtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdhVUpCUTNaQ08wRkJRMnBDTEdGQlFXRTdPMWxCUlVRc1NVRkJTU3hWUVVGVkxFVkJRVVU3WjBKQlExb3NUMEZCVHl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRMnBDTEUxQlFVMHNTVUZCU1N4bFFVRmxMRU5CUVVNc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVsQlFVa3NSVUZCUlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hIUVVGSExFOUJRVThzU1VGQlNTeFBRVUZQTEVkQlFVY3NRMEZCUXl4RlFVRkZPMmRDUVVOb1JpeFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8yRkJRek5DTEUxQlFVMDdaMEpCUTBnc1NVRkJTU3hOUVVGTkxFZEJRVWNzUlVGQlJTeERRVUZETzJkQ1FVTm9RaXhKUVVGSkxGbEJRVmtzUlVGQlJUdHZRa0ZEWkN4TlFVRk5MRWRCUVVjc2IwUkJRVzlFTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVkQlFVY3NZVUZCWVN4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzYjBOQlFXOURMRU5CUVVNN2FVSkJRemRMTEUxQlFVMHNTVUZCU1N4clFrRkJhMElzUlVGQlJUdHZRa0ZETTBJc1RVRkJUU3hIUVVGSExHOUVRVUZ2UkN4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4SFFVRkhMR0ZCUVdFc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eEhRVUZITEN0RFFVRXJReXhIUVVGSExGZEJRVmNzUjBGQlJ5eGhRVUZoTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1JVRkJSU3hIUVVGSExFbEJRVWtzUTBGQlF6dHBRa0ZETTA4c1RVRkJUVHR2UWtGRFNDeE5RVUZOTEVkQlFVY3NiMFJCUVc5RUxFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFZEJRVWNzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRWRCUVVjc09FSkJRVGhDTEVOQlFVTTdhVUpCUTNaTE8yZENRVU5FTEUxQlFVMHNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRoUVVOc1FqdEJRVU5pTEZOQlFWTTdPMUZCUlVRc1NVRkJTU3hMUVVGTExFZEJRVWNzYlVKQlFXMUNMRWxCUVVrc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4SlFVRkpMRlZCUVZVc1IwRkJSeXhIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03VVVGRGNFY3NTVUZCU1N4TlFVRk5MRU5CUVVNc1QwRkJUeXhGUVVGRk8xbEJRMmhDTEdOQlFXTXNRMEZCUXl4VlFVRlZMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU1zVjBGQlZ6dGpRVU42UXl4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NTMEZCU3l4VlFVRlZMRVZCUVVVN2EwSkJRM0pETEZWQlFWVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03WlVGRGFFTXNUVUZCVFN4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NTMEZCU3l4VFFVRlRMRVZCUVVVN2EwSkJRek5ETEU5QlFVOHNSVUZCUlN4RFFVRkRPMlZCUTJJc1RVRkJUVHRyUWtGRFNDeFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRPMlZCUTNoRk8yRkJRMFlzUTBGQlF5eERRVUZETzFOQlEwNHNUVUZCVFR0WlFVTklMRWxCUVVrc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4TFFVRkxMRlZCUVZVc1JVRkJSVHRuUWtGRGNrTXNWVUZCVlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU5vUXl4TlFVRk5MRWxCUVVrc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNTMEZCU3l4TFFVRkxMRk5CUVZNc1JVRkJSVHRuUWtGRE0wTXNUMEZCVHl4RlFVRkZMRU5CUVVNN1lVRkRZaXhOUVVGTk8yZENRVU5JTEZWQlFWVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zUzBGQlN5eEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRMRU5CUVVNN1lVRkRlRVU3VTBGRFNqdExRVU5LTEVOQlFVTXNRMEZCUXp0QlFVTlFMRU5CUVVNN08wRkJSVVFzVTBGQlV5eFZRVUZWTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSVHRCUVVOdVF5eEpRVUZKTEVsQlFVa3NSMEZCUnl4SFFVRkhMRU5CUVVNc1JVRkJSVHRCUVVOcVFqczdVVUZGVVN4SlFVRkpMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1NVRkJTU3hWUVVGVkxFVkJRVVU3V1VGRGFrUXNUMEZCVHl4RFFVRkRMRU5CUVVNN1UwRkRXanRSUVVORUxFOUJRVThzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhUUVVGVExFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU1zVTBGQlV5eERRVUZETzB0QlF6VkZPMGxCUTBRc1QwRkJUeXhEUVVGRExFTkJRVU03UVVGRFlpeERRVUZET3p0QlFVVkVMRk5CUVZNc1YwRkJWeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVXNUVUZCVFN4RlFVRkZMRTlCUVU4c1JVRkJSVHM3U1VGRmFrUXNWVUZCVlN4RFFVRkRMRmRCUVZjN1VVRkRiRUlzU1VGQlNTeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1NVRkJTU3hIUVVGSExFZEJRVWNzUTBGQlF5eERRVUZETEVWQlFVVTdXVUZEYmtNc1QwRkJUeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVkQlFVY3NRMEZCUXl4RlFVRkZMRTFCUVUwc1EwRkJReXhEUVVGRE8xTkJRM1JETEUxQlFVMDdXVUZEU0N4SlFVRkpMRU5CUVVNc1dVRkJXU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzFOQlF6TkNPMHRCUTBvc1JVRkJSU3hQUVVGUExFbEJRVWtzUTBGQlF5eERRVUZETEVOQlFVTTdRVUZEY2tJc1EwRkJRenM3UVVGRlJDeFRRVUZUTEd0Q1FVRnJRaXhEUVVGRExFOUJRVThzUlVGQlJUdEpRVU5xUXl4SlFVRkpMRWxCUVVrc1IwRkJSeXhSUVVGUkxFTkJRVU1zWVVGQllTeERRVUZETEZWQlFWVXNRMEZCUXl4RFFVRkRPMEZCUTJ4RUxFbEJRVWtzU1VGQlNTeERRVUZETEZOQlFWTXNSMEZCUnl4UFFVRlBMRU5CUVVNN08wbEJSWHBDTEU5QlFVOHNTVUZCU1N4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXp0QlFVTTVReXhEUVVGRE96dEJRVVZFTEZOQlFWTXNiVUpCUVcxQ0xFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlF5OUNMRTlCUVU4c1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVsQlFVa3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1VVRkJVU3hEUVVGRE8wRkJRMmhHTEVOQlFVTTdPMEZCUlVRc1NVRkJTU3hKUVVGSkxFZEJRVWNzUTBGQlF5eFpRVUZaTzBsQlEzQkNMRk5CUVZNc1JVRkJSU3hIUVVGSE8xRkJRMVlzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhIUVVGSExFbEJRVWtzUTBGQlF5eE5RVUZOTEVWQlFVVXNTVUZCU1N4UFFVRlBMRU5CUVVNN1lVRkRNME1zVVVGQlVTeERRVUZETEVWQlFVVXNRMEZCUXp0aFFVTmFMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dExRVU55UWp0SlFVTkVMRTlCUVU4c1dVRkJXVHRSUVVObUxFOUJRVThzUlVGQlJTeEZRVUZGTEVkQlFVY3NSVUZCUlN4RlFVRkZMRWRCUVVjc1IwRkJSeXhIUVVGSExFVkJRVVVzUlVGQlJTeEhRVUZITEVkQlFVY3NSMEZCUnl4RlFVRkZMRVZCUVVVc1IwRkJSeXhIUVVGSE8xbEJRemxETEVWQlFVVXNSVUZCUlN4SFFVRkhMRWRCUVVjc1IwRkJSeXhGUVVGRkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEVWQlFVVXNSMEZCUnl4RlFVRkZMRVZCUVVVc1EwRkJRenRMUVVOMlF5eERRVUZETzBGQlEwNHNRMEZCUXl4SFFVRkhMRU5CUVVNN08wRkJSVXdzU1VGQlNTeFRRVUZUTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTI1Q0xFbEJRVWtzUzBGQlN5eERRVUZETzBGQlExWXNTVUZCU1N4UlFVRlJMRU5CUVVNN1FVRkRZaXhKUVVGSkxFbEJRVWtzUjBGQlJ6dEpRVU5RTEV0QlFVc3NSVUZCUlN4TFFVRkxPMGxCUTFvc1NVRkJTU3hGUVVGRkxGbEJRVms3VVVGRFpDeEpRVUZKTEZGQlFWRXNSMEZCUnl4clFrRkJhMElzUTBGQlF5eGxRVUZsTEVOQlFVTXNRMEZCUXp0UlFVTnVSQ3hQUVVGUExFbEJRVWtzUTBGQlF5eFpRVUZaTEVWQlFVVXNRMEZCUXl4SlFVRkpMRU5CUVVNc1dVRkJXVHRaUVVONFF5eEpRVUZKTEZGQlFWRXNSVUZCUlR0blFrRkRWaXhaUVVGWkxFTkJRVU1zUzBGQlN5eEZRVUZGTEVOQlFVTTdaMEpCUTNKQ0xFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJReXh2UWtGQmIwSXNSVUZCUlN4RFFVRkRPMmRDUVVOcVJDeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMR0ZCUVdFc1EwRkJReXhEUVVGRE8yZENRVU01UWl4VlFVRlZMRU5CUVVNc1dVRkJXVHR2UWtGRGJrSXNTMEZCU3l4RFFVRkRMRlZCUVZVc1IwRkJSeXhyUWtGQmEwSXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZETzBGQlF6bEZMRzlDUVVGdlFpeExRVUZMTEVOQlFVTXNUMEZCVHl4SFFVRkhMRWxCUVVrc1EwRkJRenM3YjBKQlJYSkNMRWxCUVVrc1UwRkJVeXhIUVVGSExHdENRVUZyUWl4RFFVRkRMR2xDUVVGcFFpeERRVUZETEVOQlFVTTdiMEpCUTNSRUxFbEJRVWtzVTBGQlV5eEZRVUZGTzNkQ1FVTllMRk5CUVZNc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPM0ZDUVVOeVF6dHZRa0ZEUkN4VFFVRlRMRWRCUVVjc1UwRkJVeXhKUVVGSkxFVkJRVVVzUTBGQlF6dHZRa0ZETlVJc1NVRkJTU3hMUVVGTExFZEJRVWNzYTBKQlFXdENMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNTVUZCU1N4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZETzI5Q1FVTnFSaXhKUVVGSkxFdEJRVXNzUlVGQlJUdDNRa0ZEVUN4VFFVRlRMRU5CUVVNc1MwRkJTeXhIUVVGSExFdEJRVXNzUTBGQlF6dEJRVU5vUkN4eFFrRkJjVUk3TzI5Q1FVVkVMRWxCUVVrc1EwRkJReXhYUVVGWExFTkJRVU1zVVVGQlVTeEZRVUZGTEZOQlFWTXNRMEZCUXl4RFFVRkRPMmxDUVVONlF5eEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMkZCUTFvc1RVRkJUVHRuUWtGRFNDeExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zYjBKQlFXOUNMRVZCUVVVc1EwRkJRenRuUWtGRGFrUXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhoUVVGaExFTkJRVU1zUTBGQlF6dG5Ra0ZET1VJc1NVRkJTU3hMUVVGTExFTkJRVU1zVFVGQlRTeExRVUZMTEZOQlFWTXNSVUZCUlR0dlFrRkROVUlzVjBGQlZ5eERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1VVRkJVU3hGUVVGRkxFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN2FVSkJRM2hFTEUxQlFVMHNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzUzBGQlN5eERRVUZETEUxQlFVMHNTMEZCU3l4alFVRmpMRVZCUVVVN2IwSkJRM3BFTEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1VVRkJVU3hEUVVGRE8ybENRVU16UWp0aFFVTktPMU5CUTBvc1EwRkJReXhEUVVGRE8wdEJRMDQ3U1VGRFJDeFRRVUZUTEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVc1QwRkJUeXhGUVVGRk8xRkJReTlDTEVsQlFVa3NVMEZCVXl4SlFVRkpMRk5CUVZNc1EwRkJReXhOUVVGTkxFVkJRVVU3V1VGREwwSXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEZOQlFWTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3WjBKQlEzWkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1lVRkRPVUk3VTBGRFNqdExRVU5LTzBsQlEwUXNZMEZCWXl4RlFVRkZMRmxCUVZrN1VVRkRlRUlzU1VGQlNTeExRVUZMTEVOQlFVTXNUVUZCVFN4SlFVRkpMRmRCUVZjc1JVRkJSVHRaUVVNM1FpeExRVUZMTEVOQlFVTXNUVUZCVFN4SFFVRkhMRmRCUVZjc1EwRkJRenRaUVVNelFpeExRVUZMTEVOQlFVTXNTMEZCU3l4SFFVRkhMRVZCUVVVc1EwRkJRenRaUVVOcVFpeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRzFDUVVGdFFpeERRVUZETEVOQlFVTTdRVUZEYUVRc1dVRkJXU3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhEUVVGRExFTkJRVU03TzFsQlJYQkRMRWxCUVVrc1EwRkJReXhoUVVGaExFTkJRVU1zVFVGQlRTeEZRVUZGTzJkQ1FVTjJRaXhIUVVGSExFVkJRVVU3YjBKQlEwUXNVVUZCVVN4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zVVVGQlVUdHZRa0ZEYkVNc1NVRkJTU3hGUVVGRkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1R0dlFrRkRNVUlzVFVGQlRTeEZRVUZGTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1RVRkJUVHR2UWtGRE9VSXNTVUZCU1N4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zU1VGQlNUdHBRa0ZETjBJN1lVRkRTaXhEUVVGRExFTkJRVU03VTBGRFRqdEJRVU5VTEV0QlFVczdPMGxCUlVRc1YwRkJWeXhGUVVGRkxGVkJRVlVzU1VGQlNTeEZRVUZGTEUxQlFVMHNSVUZCUlR0UlFVTnFReXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVsQlFVa3NUVUZCVFN4RFFVRkRMR2xDUVVGcFFpeERRVUZETEVOQlFVTTdVVUZET1VNc1NVRkJTU3hQUVVGUExFZEJRVWNzUTBGQlF5eEpRVUZKTEVkQlFVY3NUVUZCVFN4RFFVRkRMR2xFUVVGcFJDeERRVUZETEVsQlFVa3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJRenRSUVVNNVJpeFBRVUZQTEZkQlFWY3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU1zVlVGQlZTeFJRVUZSTEVWQlFVVTdXVUZETDBNc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF5eERRVUZETzFsQlEyaEVMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNN1owSkJRM1JDTEV0QlFVc3NSVUZCUlN4SlFVRkpPMEZCUXpOQ0xHRkJRV0VzUlVGQlJTeE5RVUZOTEVOQlFVTXNRMEZCUXpzN1dVRkZXQ3hsUVVGbExFTkJRVU1zVVVGQlVTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmxCUVZrN1owSkJRM1pETEV0QlFVc3NRMEZCUXl4UFFVRlBMRWRCUVVjc1QwRkJUeXhMUVVGTExFbEJRVWtzUTBGQlF6dEJRVU5xUkN4blFrRkJaMElzUzBGQlN5eERRVUZETEUxQlFVMHNSMEZCUnl4VFFVRlRMRU5CUVVNN08yZENRVVY2UWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExIRkNRVUZ4UWl4SFFVRkhMRWxCUVVrc1IwRkJSeXhIUVVGSExFVkJRVVVzVVVGQlVTeERRVUZETEVOQlFVTTdRVUZETjBVc1owSkJRV2RDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNRMEZCUXpzN1owSkJSVzVETEU5QlFVOHNRMEZCUXl4UlFVRlJMRVZCUVVVc1EwRkJReXhEUVVGRExFTkJRVU03WVVGRGVFSXNRMEZCUXl4RFFVRkRPMU5CUTA0c1EwRkJReXhEUVVGRE8wdEJRMDQ3U1VGRFJDeFhRVUZYTEVWQlFVVXNWMEZCVnp0SlFVTjRRaXhaUVVGWkxFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVTdVVUZETjBJc1NVRkJTU3hSUVVGUkxFZEJRVWNzUzBGQlN5eERRVUZETEVkQlFVY3NTVUZCU1N4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExGRkJRVkVzUTBGQlF6dFJRVU12UXl4UFFVRlBMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU03VVVGRGFrSXNTMEZCU3l4RFFVRkRMRTFCUVUwc1IwRkJSeXhSUVVGUkxFTkJRVU03UVVGRGFFTXNVVUZCVVN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHdENRVUZyUWl4RFFVRkRMRU5CUVVNN08xRkJSVzVETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNRMEZCUXp0UlFVTndReXhKUVVGSkxGRkJRVkVzUlVGQlJUdFpRVU5XTEVsQlFVa3NUMEZCVHl4RlFVRkZPMmRDUVVOVUxFbEJRVWtzUTBGQlF5eGhRVUZoTEVOQlFVTXNjMEpCUVhOQ0xFZEJRVWNzVVVGQlVTeERRVUZETEVsQlFVa3NSMEZCUnl4alFVRmpMRU5CUVVNc1EwRkJRenRoUVVNdlJTeE5RVUZOTzJkQ1FVTklMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zYlVKQlFXMUNMRWRCUVVjc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0blFrRkRNMFFzU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4elFrRkJjMElzUjBGQlJ5eFJRVUZSTEVOQlFVTXNTVUZCU1N4SFFVRkhMRmxCUVZrc1EwRkJReXhEUVVGRE8yRkJRek5GTzFOQlEwbzdRVUZEVkN4TFFVRkxPMEZCUTB3N1FVRkRRVHRCUVVOQk96dEpRVVZKTEc5Q1FVRnZRaXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTzFGQlEzSkRMRWxCUVVrc1VVRkJVU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXp0QlFVTjRSU3hSUVVGUkxFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNaMEpCUVdkQ0xFVkJRVVVzVVVGQlVTeERRVUZETEVOQlFVTTdPMUZCUldwRUxFbEJRVWtzVDBGQlR5eEhRVUZITEU5QlFVOHNRMEZCUXl4VFFVRlRMRVZCUVVVc1EwRkJReXhUUVVGVExFTkJRVU03VVVGRE5VTXNTVUZCU1N4WlFVRlpMRWRCUVVjc1JVRkJSU3hEUVVGRE8xRkJRM1JDTEVsQlFVa3NUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzU1VGQlNTeE5RVUZOTEVsQlFVa3NUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzU1VGQlNTeE5RVUZOTEVWQlFVVTdXVUZEY0VZc1dVRkJXU3hIUVVGSExFTkJRVU1zVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMU5CUTNCRExFMUJRVTA3V1VGRFNDeFpRVUZaTEVkQlFVY3NZMEZCWXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdVMEZEZWtRN1VVRkRSQ3hQUVVGUE8xbEJRMGdzVVVGQlVTeEZRVUZGTEZGQlFWRTdXVUZEYkVJc1UwRkJVeXhGUVVGRkxGbEJRVms3VTBGRE1VSXNRMEZCUXp0QlFVTldMRXRCUVVzN08wbEJSVVFzWVVGQllTeEZRVUZGTEZWQlFWVXNVMEZCVXl4RlFVRkZMRWxCUVVrc1JVRkJSU3hIUVVGSExFVkJRVVU3VVVGRE0wTXNTVUZCU1N4SlFVRkpMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzU1VGQlNTeERRVUZETEZsQlFWa3NSVUZCUlN4RlFVRkZPMWxCUXpORExFbEJRVWtzVDBGQlR5eEhRVUZITEVsQlFVa3NWMEZCVnl4RlFVRkZPMmRDUVVNelFpeEhRVUZITEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeERRVUZETzJGQlEycERPMWxCUTBRc1MwRkJTeXhEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNSMEZCUnp0blFrRkRaaXhUUVVGVExFVkJRVVVzVTBGQlV6dG5Ra0ZEY0VJc1UwRkJVeXhGUVVGRkxFbEJRVWtzU1VGQlNTeEZRVUZGTEVOQlFVTXNUMEZCVHl4RlFVRkZPMmRDUVVNdlFpeEpRVUZKTEVWQlFVVXNTVUZCU1R0aFFVTmlMRU5CUVVNN1dVRkRSaXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03VTBGRGRFTTdTMEZEU2p0SlFVTkVMRk5CUVZNc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJTeFJRVUZSTEVWQlFVVTdVVUZEYUVNc1NVRkJTU3hqUVVGakxFbEJRVWtzWTBGQll5eERRVUZETEUxQlFVMHNSVUZCUlR0WlFVTjZReXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1kwRkJZeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETEVWQlFVVXNSVUZCUlR0blFrRkROVU1zWTBGQll5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRWRCUVVjc1EwRkJReXhIUVVGSExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMkZCUXpsRE8xTkJRMG83UzBGRFNqdEpRVU5FTEZkQlFWY3NSVUZCUlN4VlFVRlZMRXRCUVVzc1JVRkJSU3hSUVVGUkxFVkJRVVU3VVVGRGNFTXNTVUZCU1N4alFVRmpMRWxCUVVrc1kwRkJZeXhEUVVGRExFMUJRVTBzUlVGQlJUdFpRVU42UXl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NZMEZCWXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdG5Ra0ZETlVNc1kwRkJZeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEV0QlFVc3NRMEZCUXl4TFFVRkxMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzJGQlEyeEVPMU5CUTBvN1MwRkRTanRKUVVORUxHRkJRV0VzUlVGQlJTeFZRVUZWTEU5QlFVOHNSVUZCUlN4UlFVRlJMRVZCUVVVN1VVRkRlRU1zU1VGQlNTeGpRVUZqTEVsQlFVa3NZMEZCWXl4RFFVRkRMRTFCUVUwc1JVRkJSVHRaUVVONlF5eExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzWTBGQll5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRuUWtGRE5VTXNZMEZCWXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFOUJRVThzUTBGQlF5eFBRVUZQTEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRM1JFTzFOQlEwbzdTMEZEU2p0SlFVTkVMR2RDUVVGblFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUTJwRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRNMEk3U1VGRFJDeHRRa0ZCYlVJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU53UXl4WlFVRlpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzB0QlF6bENPMGxCUTBRc2NVSkJRWEZDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRkRU1zWTBGQll5eERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVOb1F6dEpRVU5FTEcxQ1FVRnRRaXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTzFGQlEzQkRMRmxCUVZrc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdTMEZET1VJN1NVRkRSQ3d5UWtGQk1rSXNSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSVHRSUVVNMVF5eHZRa0ZCYjBJc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdTMEZEZEVNN1NVRkRSQ3hYUVVGWExFVkJRVVVzVjBGQlZ6dFJRVU53UWl4UFFVRlBMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeERRVUZETEU5QlFVOHNRMEZCUXl4WFFVRlhMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03UzBGRGRrUTdTVUZEUkN4VFFVRlRMRVZCUVVVc1YwRkJWenRSUVVOc1FpeFBRVUZQTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hEUVVGRExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN1MwRkRja1E3U1VGRFJDeFpRVUZaTEVWQlFVVXNVMEZCVXl4VlFVRlZMRVZCUVVVN1VVRkRMMElzU1VGQlNTeFBRVUZQTEZWQlFWVXNTMEZCU3l4WFFVRlhMRXRCUVVzc1NVRkJTU3hEUVVGRExGZEJRVmNzUlVGQlJTeEpRVUZKTEVsQlFVa3NRMEZCUXl4WlFVRlpMRVZCUVVVc1EwRkJReXhGUVVGRk8xbEJRMnhHTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGVkJRVlVzUjBGQlJ5eFpRVUZaTEVkQlFVY3NWMEZCVnl4RFFVRkRPMWxCUXpWRUxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiMEpCUVc5Q0xFTkJRVU1zUTBGQlF6dFRRVU40UXp0UlFVTkVMRTlCUVU4c1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmxCUVZrc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dExRVU40UkR0SlFVTkVMR0ZCUVdFc1JVRkJSU3hWUVVGVkxFbEJRVWtzUlVGQlJUdFJRVU16UWl4SlFVRkpMRWxCUVVrc1MwRkJTeXhMUVVGTExFVkJRVVU3V1VGRGFFSXNTVUZCU1N4WFFVRlhMRWRCUVVjN1owSkJRMlFzUzBGQlN5eEZRVUZGTEV0QlFVc3NRMEZCUXl4TFFVRkxPMEZCUTJ4RExHRkJRV0VzUTBGQlF6czdRVUZGWkN4WlFVRlpMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zVjBGQlZ5eEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPenRaUVVVMVFpeEpRVUZKTEVOQlFVTXNWMEZCVnl4RFFVRkRMRWxCUVVrc1JVRkJSVHRuUWtGRGJrSXNWMEZCVnl4RFFVRkRMRWxCUVVrc1IwRkJSeXhOUVVGTkxFTkJRVU1zY1VKQlFYRkNMRU5CUVVNc1EwRkJRenRCUVVOcVJTeGhRVUZoT3p0WlFVVkVMRWxCUVVrc1YwRkJWeXhEUVVGRExFbEJRVWtzUlVGQlJUdEJRVU5zUXl4blFrRkJaMElzUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1YwRkJWeXhEUVVGRExFTkJRVU03TzJkQ1FVVnNReXhKUVVGSkxGbEJRVmtzU1VGQlNTeFpRVUZaTEVOQlFVTXNUVUZCVFN4RlFVRkZPMjlDUVVOeVF5eExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzV1VGQldTeERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHQzUWtGRE1VTXNXVUZCV1N4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExGZEJRVmNzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0eFFrRkRkRU03YVVKQlEwbzdZVUZEU2p0QlFVTmlMRk5CUVZNN08wRkJSVlFzVVVGQlVTeExRVUZMTEVOQlFVTXNUVUZCVFN4SFFVRkhMRkZCUVZFc1EwRkJRenM3UVVGRmFFTXNVVUZCVVN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNN08xRkJSWEJETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2JVSkJRVzFDTEVWQlFVVXNWMEZCVnl4RFFVRkRMRU5CUVVNN1FVRkRla1FzUzBGQlN6czdTVUZGUkN4WlFVRlpMRVZCUVVVc1dVRkJXVHRSUVVOMFFpeFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxGRkJRVkVzUlVGQlJTeERRVUZETzFGQlF6RkRMRWxCUVVrc2IwSkJRVzlDTEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExHdENRVUZyUWl4RFFVRkRMR1ZCUVdVc1EwRkJReXhGUVVGRk8xbEJRM3BGTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzJkQ1FVTXhReXh2UWtGQmIwSXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhWUVVGVkxFbEJRVWtzUlVGQlJUdHZRa0ZEY0VNc1VVRkJVU3hEUVVGRExGZEJRVmNzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0dlFrRkRNMElzVDBGQlR5eEZRVUZGTEVOQlFVTTdhVUpCUTJJc1JVRkJSU3haUVVGWk8yOUNRVU5ZTEU5QlFVOHNSVUZCUlN4RFFVRkRPMmxDUVVOaUxFTkJRVU1zUTBGQlF6dGhRVU5PTEVOQlFVTXNRMEZCUXp0VFFVTk9MRTFCUVUwN1dVRkRTQ3hQUVVGUExFOUJRVThzUTBGQlF5eFBRVUZQTEVWQlFVVXNRMEZCUXp0VFFVTTFRanRCUVVOVUxFdEJRVXM3TzBsQlJVUXNiMEpCUVc5Q0xFVkJRVVVzV1VGQldUdFJRVU01UWl4SlFVRkpMRmxCUVZrc1IwRkJSeXhaUVVGWkxFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPMUZCUTJoRUxFbEJRVWtzV1VGQldTeEZRVUZGTzFsQlEyUXNTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdVMEZEY0VNc1RVRkJUVHRaUVVOSUxFdEJRVXNzUjBGQlJ6dG5Ra0ZEU2l4TlFVRk5MRVZCUVVVc1kwRkJZenRuUWtGRGRFSXNVMEZCVXl4RlFVRkZMRVZCUVVVN1lVRkRhRUlzUTBGQlF6dFRRVU5NTzFGQlEwUXNUMEZCVHl4TFFVRkxMRU5CUVVNN1FVRkRja0lzUzBGQlN6czdTVUZGUkN4clFrRkJhMElzUlVGQlJTeFZRVUZWTEZOQlFWTXNSVUZCUlR0UlFVTnlReXhKUVVGSkxGTkJRVk1zUlVGQlJUdFpRVU5ZTEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hGUVVGRkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJRenRUUVVNelJDeE5RVUZOTzFsQlEwZ3NXVUZCV1N4RFFVRkRMRlZCUVZVc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dFRRVU51UXp0QlFVTlVMRXRCUVVzN08wbEJSVVFzVFVGQlRTeEZRVUZGTEZsQlFWazdVVUZEYUVJc1NVRkJTU3hEUVVGRExHdENRVUZyUWl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8wdEJRMnhETzBGQlEwd3NRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWlVGQlpTeERRVUZETEVkQlFVY3NSVUZCUlN4TFFVRkxMRVZCUVVVN1NVRkRha01zUTBGQlF5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRmRCUVZjc1EwRkJReXhoUVVGaExFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdRVUZETjBNc1EwRkJRenM3UVVGRlJDeFRRVUZUTEZkQlFWY3NRMEZCUXl4SFFVRkhMRVZCUVVVc1MwRkJTeXhGUVVGRk8wbEJRemRDTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhYUVVGWExFTkJRVU1zV1VGQldTeEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRPMEZCUXpWRExFTkJRVU03TzBGQlJVUTdRVUZEUVR0QlFVTkJPenRIUVVWSE8wRkJRMGdzVTBGQlV5eHRRa0ZCYlVJc1EwRkJReXhIUVVGSExFVkJRVVU3U1VGRE9VSXNUMEZCVHl4RFFVRkRMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRMRTFCUVUwc1NVRkJTU3hEUVVGRE8xVkJRM0JETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzVDBGQlR5eERRVUZETzBGQlEyaEVMRU5CUVVNN08wRkJSVVFzU1VGQlNTeE5RVUZOTEVkQlFVY3NSVUZCUlN4RFFVRkRPenRCUVVWb1FpeFRRVUZUTEdsQ1FVRnBRaXhIUVVGSE96dEpRVVY2UWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdFJRVU53UXl4UlFVRlJMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zVlVGQlZTeEhRVUZITEVWQlFVVTdXVUZEYWtRc1NVRkJTU3hQUVVGUExFZEJRVWNzVlVGQlZTeERRVUZETEVWQlFVVTdaMEpCUTNaQ0xFbEJRVWtzUTBGQlF5eERRVUZETEZOQlFWTTdRVUZETDBJc2IwSkJRVzlDTEU5QlFVODdPMmRDUVVWWUxFbEJRVWtzU1VGQlNTeERRVUZETEZkQlFWY3NSVUZCUlR0dlFrRkRiRUlzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WlFVRlpPMjlDUVVOeVFpeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1dVRkJXU3hEUVVGRExHRkJRV0VzUTBGQlF6dHZRa0ZEY2tNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1pVRkJaU3hEUVVGRExFTkJRVU1zVFVGQlRTeEpRVUZKTEVOQlFVTTdiMEpCUTJoRUxHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJUdHpRa0ZETjBJc1NVRkJTU3hIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hEUVVGRE8zTkNRVU5zUXl4SlFVRkpMRWxCUVVrc1IwRkJSenN3UWtGRFVDeFBRVUZQTEVWQlFVVXNTVUZCU1N4RFFVRkRMRzlDUVVGdlFpeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNN2RVSkJReTlETEVOQlFVTTdRVUZEZUVJc2MwSkJRWE5DTEVsQlFVa3NTMEZCU3l4RFFVRkRPenR6UWtGRlZpeEpRVUZKTEVOQlFVTXNRMEZCUXl4TFFVRkxMRWxCUVVrc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJUc3dRa0ZEY2tJc1NVRkJTU3hEUVVGRExFMUJRVTBzUjBGQlJ5eERRVUZETEVOQlFVTXNTMEZCU3l4SlFVRkpMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU03UVVGRE5VUXNkVUpCUVhWQ096dHpRa0ZGUkN4SlFVRkpMRWRCUVVjc1NVRkJTU3hYUVVGWExFVkJRVVU3TUVKQlEzQkNMR1ZCUVdVc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPekJDUVVOb1F5eE5RVUZOTEVOQlFVTXNTVUZCU1N4RFFVRkRPemhDUVVOU0xFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUVUZCVFRzNFFrRkRha0lzUzBGQlN5eEZRVUZGTEZWQlFWVXNRMEZCUXl4WlFVRlpPMnREUVVNeFFpeFhRVUZYTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6dHJRMEZETlVJc1pVRkJaU3hEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVWQlFVVXNTMEZCU3l4RFFVRkRMRU5CUVVNN0swSkJRM0JETEVWQlFVVXNSMEZCUnl4RFFVRkRPekpDUVVOV0xFTkJRVU1zUTBGQlF6dDFRa0ZEVGp0elFrRkRSQ3hKUVVGSkxFZEJRVWNzU1VGQlNTeFZRVUZWTEVWQlFVVTdNRUpCUTI1Q0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhOUVVGTkxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPemhDUVVOd1F5eEpRVUZKTEUxQlFVMHNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhQUVVGUExFbEJRVWtzUTBGQlF5eERRVUZETEUxQlFVMHNSVUZCUlR0clEwRkRMMElzV1VGQldTeERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dHJRMEZET1VJc1RVRkJUU3hEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETEVWQlFVVXNRMEZCUXl4RFFVRkRMRU5CUVVNN2EwTkJRM0JDTEUxQlFVMDdLMEpCUTFRN01rSkJRMG83TUVKQlEwUXNaVUZCWlN4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdNRUpCUTJwRExGZEJRVmNzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRE8wRkJRM1pFTEhWQ1FVRjFRanM3YzBKQlJVUXNTVUZCU1N4SFFVRkhMRWxCUVVrc1VVRkJVU3hGUVVGRk96QkNRVU5xUWl4SlFVRkpMRU5CUVVNc1MwRkJTeXhIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUTNSRUxIVkNRVUYxUWpzN2MwSkJSVVFzU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4SFFVRkhMRVZCUVVVc1NVRkJTU3hGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETzBGQlEzcEVMR2xDUVVGcFFqczdRVUZGYWtJc1lVRkJZU3hEUVVGRE8wRkJRMlE3TzFsQlJWa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1kwRkJZeXhIUVVGSExFbEJRVWtzUTBGQlF5eGpRVUZqTEVsQlFVa3NSVUZCUlN4RlFVRkZMRWRCUVVjc1EwRkJReXhIUVVGSExFOUJRVThzUTBGQlF6dFpRVU5xUlN4UFFVRlBMRTlCUVU4c1EwRkJRenRUUVVOc1FpeEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzBGQlF6ZENMRXRCUVVzN08wbEJSVVFzU1VGQlNTeFRRVUZUTEVkQlFVYzdVVUZEV2l4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdEJRVU51UWl4TFFVRkxMRU5CUVVNN08wbEJSVVlzU1VGQlNTeFJRVUZSTEVkQlFVYzdVVUZEV0N4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVsQlFVazdVVUZEVml4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1FVRkRha0lzUzBGQlN5eERRVUZET3p0SlFVVkdMRk5CUVZNc1pVRkJaU3hGUVVGRkxFTkJRVU1zUlVGQlJUdFJRVU42UWl4SlFVRkpMRU5CUVVNc1EwRkJReXhUUVVGVE8wRkJRM1pDTEZsQlFWa3NUMEZCVHpzN1VVRkZXQ3hKUVVGSkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExGbEJRVmtzU1VGQlNTeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1dVRkJXU3hEUVVGRExHRkJRV0VzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEdWQlFXVXNRMEZCUXl4RFFVRkRMRTFCUVUwc1NVRkJTU3hEUVVGRExFVkJRVVU3UVVGRGRFb3NXVUZCV1N4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zUzBGQlN5eERRVUZETzBGQlF6VkNPMEZCUTBFN08xbEJSVmtzU1VGQlNTeFRRVUZUTEVOQlFVTXNZMEZCWXl4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRk8yZENRVU0zUWl4RFFVRkRMRWRCUVVjc1UwRkJVeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEycERMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeERRVUZETEVOQlFVTXNRMEZCUXl4UlFVRlJMRXRCUVVzc1EwRkJReXhKUVVGSkxFVkJRVVVzU1VGQlNTeERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRMRVZCUVVVN1owSkJRM0pETEVOQlFVTXNSMEZCUnl4TlFVRk5MRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU1zUjBGQlJ5eEZRVUZGTEVOQlFVTXNRMEZCUXp0QlFVTm9SQ3hoUVVGaExFMUJRVTBzU1VGQlNTeERRVUZETEVOQlFVTXNVVUZCVVN4SlFVRkpMRkZCUVZFc1EwRkJReXhqUVVGakxFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVTdPMmRDUVVWcVJDeERRVUZETEVkQlFVY3NVVUZCVVN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8yRkJRMjVDTEUxQlFVMDdaMEpCUTBnc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1FVRkRNME1zWVVGQllUczdXVUZGUkN4SlFVRkpMRU5CUVVNc1lVRkJZU3hEUVVGRExGVkJRVlVzUlVGQlJUdG5Ra0ZETTBJc1QwRkJUeXhGUVVGRkxFbEJRVWtzUTBGQlF5eHZRa0ZCYjBJc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETzJkQ1FVTTFReXhIUVVGSExFVkJRVVVzUTBGQlF6dG5Ra0ZEVGl4VFFVRlRMRVZCUVVVc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eExRVUZMTzJkQ1FVTjZRaXhMUVVGTExFVkJRVVVzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4TFFVRkxMRWRCUVVjc1EwRkJRenRuUWtGRGVrSXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUE8yRkJRM0pDTEVOQlFVTXNRMEZCUXp0VFFVTk9PMEZCUTFRc1MwRkJTenM3UVVGRlRDeEpRVUZKTEZGQlFWRXNRMEZCUXl4blFrRkJaMElzUTBGQlF5eFZRVUZWTEVWQlFVVXNaVUZCWlN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRMnBGT3p0SlFVVkpMRU5CUVVNc1NVRkJTU3hEUVVGRExHTkJRV01zUjBGQlJ5eEpRVUZKTEVOQlFVTXNZMEZCWXl4SlFVRkpMRVZCUVVVc1JVRkJSU3hWUVVGVkxFTkJRVU1zUjBGQlJ5eGxRVUZsTEVOQlFVTTdRVUZEY0VZc1EwRkJRenM3UVVGRlJDeFRRVUZUTEd0Q1FVRnJRaXhEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU01UWl4SlFVRkpMRWRCUVVjc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eE5RVUZOTEVWQlFVVXNTMEZCU3l4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXp0SlFVTXhSQ3hKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEUxQlFVMHNRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hIUVVGSExGZEJRVmNzUTBGQlF6dFJRVU5xUkN4UFFVRlBMRWRCUVVjc1MwRkJTeXhEUVVGRExFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1NVRkRNVU1zVDBGQlR5eFBRVUZQTEV0QlFVc3NTVUZCU1N4SFFVRkhMRVZCUVVVc1IwRkJSeXhyUWtGQmEwSXNRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEV0QlFVc3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRM1JHTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhoUVVGaExFZEJRVWM3UlVGRGRrSXNTVUZCU1N4UlFVRlJMRU5CUVVNc1ZVRkJWU3hKUVVGSkxGVkJRVlVzUlVGQlJUdEJRVU42UXl4SlFVRkpMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eEpRVUZKTEVOQlFVTXNXVUZCV1RzN1FVRkZha01zVVVGQlVTeHBRa0ZCYVVJc1JVRkJSU3hEUVVGRE96dFJRVVZ3UWl4SlFVRkpMRWxCUVVrc1EwRkJReXhYUVVGWExFVkJRVVVzUlVGQlJUdFpRVU53UWl4SlFVRkpMRU5CUVVNc1lVRkJZU3hEUVVGRExFMUJRVTBzUlVGQlJUdG5Ra0ZEZGtJc1IwRkJSeXhGUVVGRk8yOUNRVU5FTEZGQlFWRXNSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExGRkJRVkU3YjBKQlEyeERMRWxCUVVrc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEVsQlFVazdiMEpCUXpGQ0xFMUJRVTBzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTFCUVUwN2IwSkJRemxDTEVsQlFVa3NSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFbEJRVWs3YVVKQlF6ZENPMkZCUTBvc1EwRkJReXhEUVVGRE8xTkJRMDQ3UzBGRFNpeERRVUZETEVOQlFVTTdSMEZEU2p0QlFVTklMRU5CUVVNN08wRkJSVVFzWVVGQllTeEZRVUZGTEVOQlFVTTdRVUZEYUVJc1VVRkJVU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMR3RDUVVGclFpeEZRVUZGTEdGQlFXRXNRMEZCUXl4RFFVRkRPenRCUVVVM1JDeE5RVUZOTEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zVVVGQlVTeEZRVUZGTEZsQlFWazdTVUZETVVNc1NVRkJTU3hEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETzBGQlEyeENMRU5CUVVNc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6czdRVUZGVkN4TlFVRk5MRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNUMEZCVHl4RlFVRkZMRlZCUVZVc1IwRkJSeXhGUVVGRk8wbEJRelZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1owSkJRV2RDTEVkQlFVY3NSMEZCUnl4RFFVRkRMRTlCUVU4c1IwRkJSeXhIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEVkQlFVY3NSMEZCUnl4SFFVRkhMRWRCUVVjc1IwRkJSeXhEUVVGRExFbEJRVWtzUjBGQlJ5eEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJRM0JITEVOQlFVTXNRMEZCUXl4RFFVRkRPenRCUVVWSUxFMUJRVTBzUTBGQlF5eFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpZG1GeUlGOGdQU0J5WlhGMWFYSmxLQ2N1TDNWMGFXeHpKeWs3WEc1MllYSWdVSEp2YldselpTQTlJSEpsY1hWcGNtVW9KMlZ6Tmkxd2NtOXRhWE5sSnlrdVVISnZiV2x6WlR0Y2JuWmhjaUJUYVcxMWJHRjBaU0E5SUhKbGNYVnBjbVVvSnk0dmMybHRkV3hoZEdVbktUdGNiblpoY2lCelpXeGxZM1J2Y2tacGJtUmxjaUE5SUhKbGNYVnBjbVVvSnk0dmMyVnNaV04wYjNKR2FXNWtaWEluS1R0Y2JuWmhjaUJUWlhSMGFXNW5jeUE5SUhKbGNYVnBjbVVvSnk0dmMyVjBkR2x1WjNNbktUdGNibHh1THk4Z2RtRnlJRzE1UjJWdVpYSmhkRzl5SUQwZ2JtVjNJRU56YzFObGJHVmpkRzl5UjJWdVpYSmhkRzl5S0NrN1hHNTJZWElnYVcxd2IzSjBZVzUwVTNSbGNFeGxibWQwYUNBOUlEVXdNRHRjYm5aaGNpQnpZWFpsU0dGdVpHeGxjbk1nUFNCYlhUdGNiblpoY2lCeVpYQnZjblJJWVc1a2JHVnljeUE5SUZ0ZE8xeHVkbUZ5SUd4dllXUklZVzVrYkdWeWN5QTlJRnRkTzF4dWRtRnlJSE5sZEhScGJtZHpURzloWkVoaGJtUnNaWEp6SUQwZ1cxMDdYRzVjYm1aMWJtTjBhVzl1SUdkbGRGTmpaVzVoY21sdktHNWhiV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9iRzloWkVoaGJtUnNaWEp6TG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE4wWVhSbElEMGdkWFJ0WlM1emRHRjBaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2djM1JoZEdVdWMyTmxibUZ5YVc5ekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBZWFJsTG5OalpXNWhjbWx2YzF0cFhTNXVZVzFsSUQwOVBTQnVZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9jM1JoZEdVdWMyTmxibUZ5YVc5elcybGRLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCc2IyRmtTR0Z1Wkd4bGNuTmJNRjBvYm1GdFpTd2dablZ1WTNScGIyNGdLSEpsYzNBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5S1R0Y2JuMWNiblpoY2lCMllXeHBaR0YwYVc1bklEMGdabUZzYzJVN1hHNWNiblpoY2lCbGRtVnVkSE1nUFNCYlhHNGdJQ0FnSjJOc2FXTnJKeXhjYmlBZ0lDQW5abTlqZFhNbkxGeHVJQ0FnSUNkaWJIVnlKeXhjYmlBZ0lDQW5aR0pzWTJ4cFkyc25MRnh1SUNBZ0lDOHZJQ2RrY21Gbkp5eGNiaUFnSUNBdkx5QW5aSEpoWjJWdWRHVnlKeXhjYmlBZ0lDQXZMeUFuWkhKaFoyeGxZWFpsSnl4Y2JpQWdJQ0F2THlBblpISmhaMjkyWlhJbkxGeHVJQ0FnSUM4dklDZGtjbUZuYzNSaGNuUW5MRnh1SUNBZ0lDOHZJQ2RwYm5CMWRDY3NYRzRnSUNBZ0oyMXZkWE5sWkc5M2JpY3NYRzRnSUNBZ0x5OGdKMjF2ZFhObGJXOTJaU2NzWEc0Z0lDQWdKMjF2ZFhObFpXNTBaWEluTEZ4dUlDQWdJQ2R0YjNWelpXeGxZWFpsSnl4Y2JpQWdJQ0FuYlc5MWMyVnZkWFFuTEZ4dUlDQWdJQ2R0YjNWelpXOTJaWEluTEZ4dUlDQWdJQ2R0YjNWelpYVndKeXhjYmlBZ0lDQW5ZMmhoYm1kbEp5eGNiaUFnSUNBdkx5QW5jbVZ6YVhwbEp5eGNiaUFnSUNBdkx5QW5jMk55YjJ4c0oxeHVYVHRjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVSEpsWTI5dVpHbDBhVzl1Y3lBb2MyTmxibUZ5YVc4cElIdGNiaUFnSUNCMllYSWdjMlYwZFhBZ1BTQnpZMlZ1WVhKcGJ5NXpaWFIxY0R0Y2JpQWdJQ0IyWVhJZ2MyTmxibUZ5YVc5eklEMGdjMlYwZFhBZ0ppWWdjMlYwZFhBdWMyTmxibUZ5YVc5ek8xeHVJQ0FnSUM4dklGUlBSRTg2SUVKeVpXRnJJRzkxZENCcGJuUnZJR2hsYkhCbGNseHVJQ0FnSUdsbUlDaHpZMlZ1WVhKcGIzTXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVZV3hzS0Y4dWJXRndLSE5qWlc1aGNtbHZjeXdnWm5WdVkzUnBiMjRnS0hOalpXNWhjbWx2VG1GdFpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdkbGRGTmpaVzVoY21sdktITmpaVzVoY21sdlRtRnRaU2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9iM1JvWlhKVFkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmRHaGxjbE5qWlc1aGNtbHZJRDBnU2xOUFRpNXdZWEp6WlNoS1UwOU9Mbk4wY21sdVoybG1lU2h2ZEdobGNsTmpaVzVoY21sdktTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCdmRHaGxjbE5qWlc1aGNtbHZMbk4wWlhCek8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMHBLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0Z0ZEtUdGNiaUFnSUNCOVhHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRGQnZjM1JqYjI1a2FYUnBiMjV6SUNoelkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUhaaGNpQmpiR1ZoYm5Wd0lEMGdjMk5sYm1GeWFXOHVZMnhsWVc1MWNEdGNiaUFnSUNCMllYSWdjMk5sYm1GeWFXOXpJRDBnWTJ4bFlXNTFjQ0FtSmlCamJHVmhiblZ3TG5OalpXNWhjbWx2Y3p0Y2JpQWdJQ0F2THlCVVQwUlBPaUJDY21WaGF5QnZkWFFnYVc1MGJ5Qm9aV3h3WlhKY2JpQWdJQ0JwWmlBb2MyTmxibUZ5YVc5ektTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExtRnNiQ2hmTG0xaGNDaHpZMlZ1WVhKcGIzTXNJR1oxYm1OMGFXOXVJQ2h6WTJWdVlYSnBiMDVoYldVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJuWlhSVFkyVnVZWEpwYnloelkyVnVZWEpwYjA1aGJXVXBMblJvWlc0b1puVnVZM1JwYjI0Z0tHOTBhR1Z5VTJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYjNSb1pYSlRZMlZ1WVhKcGJ5QTlJRXBUVDA0dWNHRnljMlVvU2xOUFRpNXpkSEpwYm1kcFpua29iM1JvWlhKVFkyVnVZWEpwYnlrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYjNSb1pYSlRZMlZ1WVhKcGJ5NXpkR1Z3Y3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOUtTazdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2hiWFNrN1hHNGdJQ0FnZlZ4dWZWeHVYRzVtZFc1amRHbHZiaUJmWTI5dVkyRjBVMk5sYm1GeWFXOVRkR1Z3VEdsemRITW9jM1JsY0hNcElIdGNiaUFnSUNCMllYSWdibVYzVTNSbGNITWdQU0JiWFR0Y2JpQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZScGJXVnpkR0Z0Y0RzZ0x5OGdhVzVwZEdGc2FYcGxaQ0JpZVNCbWFYSnpkQ0JzYVhOMElHOW1JSE4wWlhCekxseHVJQ0FnSUdadmNpQW9kbUZ5SUdvZ1BTQXdPeUJxSUR3Z2MzUmxjSE11YkdWdVozUm9PeUJxS3lzcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdac1lYUlRkR1Z3Y3lBOUlITjBaWEJ6VzJwZE8xeHVJQ0FnSUNBZ0lDQnBaaUFvYWlBK0lEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHc2dQU0F3T3lCcklEd2djM1JsY0hNdWJHVnVaM1JvT3lCckt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MzUmxjQ0E5SUdac1lYUlRkR1Z3YzF0clhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnWkdsbVppQTlJR3NnUGlBd0lEOGdjM1JsY0M1MGFXMWxVM1JoYlhBZ0xTQm1iR0YwVTNSbGNITmJheUF0SURGZExuUnBiV1ZUZEdGdGNDQTZJRFV3TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOMWNuSmxiblJVYVcxbGMzUmhiWEFnS3owZ1pHbG1aanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYkdGMFUzUmxjSE5iYTEwdWRHbHRaVk4wWVcxd0lEMGdZM1Z5Y21WdWRGUnBiV1Z6ZEdGdGNEdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR04xY25KbGJuUlVhVzFsYzNSaGJYQWdQU0JtYkdGMFUzUmxjSE5iYWwwdWRHbHRaVk4wWVcxd08xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJRzVsZDFOMFpYQnpJRDBnYm1WM1UzUmxjSE11WTI5dVkyRjBLR1pzWVhSVGRHVndjeWs3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCdVpYZFRkR1Z3Y3p0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnYzJWMGRYQkRiMjVrYVhScGIyNXpJQ2h6WTJWdVlYSnBieWtnZTF4dUlDQWdJSFpoY2lCd2NtOXRhWE5sY3lBOUlGdGRPMXh1SUNBZ0lISmxkSFZ5YmlCUWNtOXRhWE5sTG1Gc2JDaGJYRzRnSUNBZ0lDQWdJR2RsZEZCeVpXTnZibVJwZEdsdmJuTW9jMk5sYm1GeWFXOHBMRnh1SUNBZ0lDQWdJQ0JuWlhSUWIzTjBZMjl1WkdsMGFXOXVjeWh6WTJWdVlYSnBieWxjYmlBZ0lDQmRLUzUwYUdWdUtHWjFibU4wYVc5dUlDaHpkR1Z3UVhKeVlYbHpLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpkR1Z3VEdsemRITWdQU0J6ZEdWd1FYSnlZWGx6V3pCZExtTnZibU5oZENoYmMyTmxibUZ5YVc4dWMzUmxjSE5kTENCemRHVndRWEp5WVhseld6RmRLVHRjYmlBZ0lDQWdJQ0FnYzJObGJtRnlhVzh1YzNSbGNITWdQU0JmWTI5dVkyRjBVMk5sYm1GeWFXOVRkR1Z3VEdsemRITW9jM1JsY0V4cGMzUnpLVHRjYmlBZ0lDQjlLVHRjYm4xY2JseHVablZ1WTNScGIyNGdjblZ1VTNSbGNDaHpZMlZ1WVhKcGJ5d2dhV1I0TENCMGIxTnJhWEFwSUh0Y2JpQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25VbFZPVGtsT1IxOVRWRVZRSnlrN1hHNGdJQ0FnZEc5VGEybHdJRDBnZEc5VGEybHdJSHg4SUh0OU8xeHVYRzRnSUNBZ2RtRnlJSE4wWlhBZ1BTQnpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIaGRPMXh1SUNBZ0lIWmhjaUJ6ZEdGMFpTQTlJSFYwYldVdWMzUmhkR1U3WEc0Z0lDQWdhV1lnS0hOMFpYQWdKaVlnYzNSaGRHVXVjM1JoZEhWeklEMDlJQ2RRVEVGWlNVNUhKeWtnZTF4dUlDQWdJQ0FnSUNCemRHRjBaUzV5ZFc0dWMyTmxibUZ5YVc4Z1BTQnpZMlZ1WVhKcGJ6dGNiaUFnSUNBZ0lDQWdjM1JoZEdVdWNuVnVMbk4wWlhCSmJtUmxlQ0E5SUdsa2VEdGNiaUFnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkc2IyRmtKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUc1bGQweHZZMkYwYVc5dUlEMGdjM1JsY0M1a1lYUmhMblZ5YkM1d2NtOTBiMk52YkNBcklGd2lMeTljSWlBcklITjBaWEF1WkdGMFlTNTFjbXd1YUc5emREdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpaV0Z5WTJnZ1BTQnpkR1Z3TG1SaGRHRXVkWEpzTG5ObFlYSmphRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJvWVhOb0lEMGdjM1JsY0M1a1lYUmhMblZ5YkM1b1lYTm9PMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzJWaGNtTm9JQ1ltSUNGelpXRnlZMmd1WTJoaGNrRjBLRndpUDF3aUtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sWVhKamFDQTlJRndpUDF3aUlDc2djMlZoY21Ob08xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdselUyRnRaVlZTVENBOUlDaHNiMk5oZEdsdmJpNXdjbTkwYjJOdmJDQXJJRndpTHk5Y0lpQXJJR3h2WTJGMGFXOXVMbWh2YzNRZ0t5QnNiMk5oZEdsdmJpNXpaV0Z5WTJncElEMDlQU0FvYm1WM1RHOWpZWFJwYjI0Z0t5QnpaV0Z5WTJncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZDJsdVpHOTNMbXh2WTJGMGFXOXVMbkpsY0d4aFkyVW9ibVYzVEc5allYUnBiMjRnS3lCb1lYTm9JQ3NnYzJWaGNtTm9LVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1YzI5c1pTNXNiMmNvS0d4dlkyRjBhVzl1TG5CeWIzUnZZMjlzSUNzZ2JHOWpZWFJwYjI0dWFHOXpkQ0FySUd4dlkyRjBhVzl1TG5ObFlYSmphQ2twTzF4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1YzI5c1pTNXNiMmNvS0hOMFpYQXVaR0YwWVM1MWNtd3VjSEp2ZEc5amIyd2dLeUJ6ZEdWd0xtUmhkR0V1ZFhKc0xtaHZjM1FnS3lCemRHVndMbVJoZEdFdWRYSnNMbk5sWVhKamFDa3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJKWmlCM1pTQm9ZWFpsSUc1dmRDQmphR0Z1WjJWa0lIUm9aU0JoWTNSMVlXd2diRzlqWVhScGIyNHNJSFJvWlc0Z2RHaGxJR3h2WTJGMGFXOXVMbkpsY0d4aFkyVmNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklIZHBiR3dnYm05MElHZHZJR0Z1ZVhkb1pYSmxYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hWE5UWVcxbFZWSk1LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZDJsdVpHOTNMbkpsYkc5aFpDaDBjblZsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITjBaWEF1WlhabGJuUk9ZVzFsSUQwOUlDZDBhVzFsYjNWMEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExtRjFkRzlTZFc0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBc0lITjBaWEF1WkdGMFlTNWhiVzkxYm5RcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUd4dlkyRjBiM0lnUFNCemRHVndMbVJoZEdFdWJHOWpZWFJ2Y2p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCemRHVndjeUE5SUhOalpXNWhjbWx2TG5OMFpYQnpPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSFZ1YVhGMVpVbGtJRDBnWjJWMFZXNXBjWFZsU1dSR2NtOXRVM1JsY0NoemRHVndLVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnZEhKNUlIUnZJR2RsZENCeWFXUWdiMllnZFc1dVpXTmxjM05oY25rZ2MzUmxjSE5jYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdkRzlUYTJsd1czVnVhWEYxWlVsa1hTQTlQU0FuZFc1a1pXWnBibVZrSnlBbUppQjFkRzFsTG5OMFlYUmxMbkoxYmk1emNHVmxaQ0FoUFNBbmNtVmhiSFJwYldVbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJrYVdabU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhV2R1YjNKbElEMGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdvZ1BTQnpkR1Z3Y3k1c1pXNW5kR2dnTFNBeE95QnFJRDRnYVdSNE95QnFMUzBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdiM1JvWlhKVGRHVndJRDBnYzNSbGNITmJhbDA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHOTBhR1Z5Vlc1cGNYVmxTV1FnUFNCblpYUlZibWx4ZFdWSlpFWnliMjFUZEdWd0tHOTBhR1Z5VTNSbGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hWdWFYRjFaVWxrSUQwOVBTQnZkR2hsY2xWdWFYRjFaVWxrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVdScFptWXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmthV1ptSUQwZ0tHOTBhR1Z5VTNSbGNDNTBhVzFsVTNSaGJYQWdMU0J6ZEdWd0xuUnBiV1ZUZEdGdGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXZHViM0psSUQwZ0lXbHpTVzF3YjNKMFlXNTBVM1JsY0NodmRHaGxjbE4wWlhBcElDWW1JR1JwWm1ZZ1BDQnBiWEJ2Y25SaGJuUlRkR1Z3VEdWdVozUm9PMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNocGMwbHVkR1Z5WVdOMGFYWmxVM1JsY0NodmRHaGxjbE4wWlhBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXZHViM0psSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzlUYTJsd1czVnVhWEYxWlVsa1hTQTlJR2xuYm05eVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1YyVW5jbVVnYzJ0cGNIQnBibWNnZEdocGN5QmxiR1Z0Wlc1MFhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RHOVRhMmx3VzJkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2xkS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVUbVY0ZEZOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUN3Z2RHOVRhMmx3S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSEo1Vlc1MGFXeEdiM1Z1WkNoelkyVnVZWEpwYnl3Z2MzUmxjQ3dnYkc5allYUnZjaXdnWjJWMFZHbHRaVzkxZENoelkyVnVZWEpwYnl3Z2FXUjRLU2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9aV3hsY3lrZ2UxeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ1pXeGxJRDBnWld4bGMxc3dYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQjBZV2RPWVcxbElEMGdaV3hsTG5SaFowNWhiV1V1ZEc5TWIzZGxja05oYzJVb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCemRYQndiM0owYzBsdWNIVjBSWFpsYm5RZ1BTQjBZV2RPWVcxbElEMDlQU0FuYVc1d2RYUW5JSHg4SUhSaFowNWhiV1VnUFQwOUlDZDBaWGgwWVhKbFlTY2dmSHdnWld4bExtZGxkRUYwZEhKcFluVjBaU2duWTI5dWRHVnVkR1ZrYVhSaFlteGxKeWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hsZG1WdWRITXVhVzVrWlhoUFppaHpkR1Z3TG1WMlpXNTBUbUZ0WlNrZ1BqMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYjNCMGFXOXVjeUE5SUh0OU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVrWVhSaExtSjFkSFJ2YmlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5d2RHbHZibk11ZDJocFkyZ2dQU0J2Y0hScGIyNXpMbUoxZEhSdmJpQTlJSE4wWlhBdVpHRjBZUzVpZFhSMGIyNDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2THlCamIyNXpiMnhsTG14dlp5Z25VMmx0ZFd4aGRHbHVaeUFuSUNzZ2MzUmxjQzVsZG1WdWRFNWhiV1VnS3lBbklHOXVJR1ZzWlcxbGJuUWdKeXdnWld4bExDQnNiMk5oZEc5eUxuTmxiR1ZqZEc5eWMxc3dYU3dnWENJZ1ptOXlJSE4wWlhBZ1hDSWdLeUJwWkhncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oyTnNhV05ySnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNRb1pXeGxLUzUwY21sbloyVnlLQ2RqYkdsamF5Y3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tDaHpkR1Z3TG1WMlpXNTBUbUZ0WlNBOVBTQW5abTlqZFhNbklIeDhJSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2RpYkhWeUp5a2dKaVlnWld4bFczTjBaWEF1WlhabGJuUk9ZVzFsWFNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWc1pWdHpkR1Z3TG1WMlpXNTBUbUZ0WlYwb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpWdHpkR1Z3TG1WMlpXNTBUbUZ0WlYwb1pXeGxMQ0J2Y0hScGIyNXpLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2MzUmxjQzVrWVhSaExuWmhiSFZsSUNFOUlGd2lkVzVrWldacGJtVmtYQ0lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdVdWRtRnNkV1VnUFNCemRHVndMbVJoZEdFdWRtRnNkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdMeThnUm05eUlHSnliM2R6WlhKeklIUm9ZWFFnYzNWd2NHOXlkQ0IwYUdVZ2FXNXdkWFFnWlhabGJuUXVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4xY0hCdmNuUnpTVzV3ZFhSRmRtVnVkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1WlhabGJuUW9aV3hsTENBbmFXNXdkWFFuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdVMmx0ZFd4aGRHVXVaWFpsYm5Rb1pXeGxMQ0FuWTJoaGJtZGxKeWs3SUM4dklGUm9hWE1nYzJodmRXeGtJR0psSUdacGNtVmtJR0ZtZEdWeUlHRWdZbXgxY2lCbGRtVnVkQzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKMnRsZVhCeVpYTnpKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYTJWNUlEMGdVM1J5YVc1bkxtWnliMjFEYUdGeVEyOWtaU2h6ZEdWd0xtUmhkR0V1YTJWNVEyOWtaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtdGxlWEJ5WlhOektHVnNaU3dnYTJWNUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1YTJWNVpHOTNiaWhsYkdVc0lHdGxlU2s3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaV3hsTG5aaGJIVmxJRDBnYzNSbGNDNWtZWFJoTG5aaGJIVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlM1bGRtVnVkQ2hsYkdVc0lDZGphR0Z1WjJVbktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlM1clpYbDFjQ2hsYkdVc0lHdGxlU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZFhCd2IzSjBjMGx1Y0hWMFJYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZOcGJYVnNZWFJsTG1WMlpXNTBLR1ZzWlN3Z0oybHVjSFYwSnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkMllXeHBaR0YwWlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29KMVpoYkdsa1lYUmxPaUFuSUNzZ1NsTlBUaTV6ZEhKcGJtZHBabmtvYkc5allYUnZjaTV6Wld4bFkzUnZjbk1wSUNBcklGd2lJR052Ym5SaGFXNXpJSFJsZUhRZ0oxd2lJQ0FySUhOMFpYQXVaR0YwWVM1MFpYaDBJQ3NnWENJblhDSXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNSaGRHVXVZWFYwYjFKMWJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNU9aWGgwVTNSbGNDaHpZMlZ1WVhKcGJ5d2dhV1I0TENCMGIxTnJhWEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHNJR1oxYm1OMGFXOXVJQ2h5WlhOMWJIUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2QyWVd4cFpHRjBaU2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbFpoYkdsa1lYUmxPaUJjSWlBcklISmxjM1ZzZENrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXpkRzl3VTJObGJtRnlhVzhvWm1Gc2MyVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpTVzF3YjNKMFlXNTBVM1JsY0NoemRHVndLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25SRmNuSnZjaWhjSWtaaGFXeGxaQ0J2YmlCemRHVndPaUJjSWlBcklHbGtlQ0FySUZ3aUlDQkZkbVZ1ZERvZ1hDSWdLeUJ6ZEdWd0xtVjJaVzUwVG1GdFpTQXJJRndpSUZKbFlYTnZiam9nWENJZ0t5QnlaWE4xYkhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV6ZEc5d1UyTmxibUZ5YVc4b1ptRnNjMlVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpaWFIwYVc1bmN5NW5aWFFvSjNabGNtSnZjMlVuS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvY21WemRXeDBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExtRjFkRzlTZFc0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISjFiazVsZUhSVGRHVndLSE5qWlc1aGNtbHZMQ0JwWkhnc0lIUnZVMnRwY0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtWjFibU4wYVc5dUlIZGhhWFJHYjNKQmJtZDFiR0Z5S0hKdmIzUlRaV3hsWTNSdmNpa2dlMXh1SUNBZ0lIWmhjaUJsYkNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvY205dmRGTmxiR1ZqZEc5eUtUdGNiaUFnSUNCeVpYUjFjbTRnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0Z0tISmxjMjlzZG1Vc0lISmxhbVZqZENrZ2UxeHVJQ0FnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGM2FXNWtiM2N1WVc1bmRXeGhjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduWVc1bmRXeGhjaUJqYjNWc1pDQnViM1FnWW1VZ1ptOTFibVFnYjI0Z2RHaGxJSGRwYm1SdmR5Y3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHRnVaM1ZzWVhJdVoyVjBWR1Z6ZEdGaWFXeHBkSGtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaGJtZDFiR0Z5TG1kbGRGUmxjM1JoWW1sc2FYUjVLR1ZzS1M1M2FHVnVVM1JoWW14bEtISmxjMjlzZG1VcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXRnVaM1ZzWVhJdVpXeGxiV1Z1ZENobGJDa3VhVzVxWldOMGIzSW9LU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0ozSnZiM1FnWld4bGJXVnVkQ0FvSnlBcklISnZiM1JUWld4bFkzUnZjaUFySUNjcElHaGhjeUJ1YnlCcGJtcGxZM1J2Y2k0bklDdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDY2dkR2hwY3lCdFlYa2diV1ZoYmlCcGRDQnBjeUJ1YjNRZ2FXNXphV1JsSUc1bkxXRndjQzRuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1lXNW5kV3hoY2k1bGJHVnRaVzUwS0dWc0tTNXBibXBsWTNSdmNpZ3BMbWRsZENnbkpHSnliM2R6WlhJbktTNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnViM1JwWm5sWGFHVnVUbTlQZFhSemRHRnVaR2x1WjFKbGNYVmxjM1J6S0hKbGMyOXNkbVVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5SUdOaGRHTm9JQ2hsY25JcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGFtVmpkQ2hsY25JcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHbHpTVzF3YjNKMFlXNTBVM1JsY0NoemRHVndLU0I3WEc0Z0lDQWdjbVYwZFhKdUlITjBaWEF1WlhabGJuUk9ZVzFsSUNFOUlDZHRiM1Z6Wld4bFlYWmxKeUFtSmx4dUlDQWdJQ0FnSUNBZ0lDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWdmRYUW5JQ1ltWEc0Z0lDQWdJQ0FnSUNBZ0lITjBaWEF1WlhabGJuUk9ZVzFsSUNFOUlDZHRiM1Z6WldWdWRHVnlKeUFtSmx4dUlDQWdJQ0FnSUNBZ0lDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWdmRtVnlKeUFtSmx4dUlDQWdJQ0FnSUNBZ0lDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5ZbXgxY2ljZ0ppWmNiaUFnSUNBZ0lDQWdJQ0FnYzNSbGNDNWxkbVZ1ZEU1aGJXVWdJVDBnSjJadlkzVnpKenRjYm4xY2JseHVMeW9xWEc0Z0tpQlNaWFIxY201eklIUnlkV1VnYVdZZ2RHaGxJR2RwZG1WdUlITjBaWEFnYVhNZ2MyOXRaU0J6YjNKMElHOW1JSFZ6WlhJZ2FXNTBaWEpoWTNScGIyNWNiaUFxTDF4dVpuVnVZM1JwYjI0Z2FYTkpiblJsY21GamRHbDJaVk4wWlhBb2MzUmxjQ2tnZTF4dUlDQWdJSFpoY2lCbGRuUWdQU0J6ZEdWd0xtVjJaVzUwVG1GdFpUdGNibHh1SUNBZ0lDOHFYRzRnSUNBZ0lDQWdMeThnU1c1MFpYSmxjM1JwYm1jZ2JtOTBaU3dnWkc5cGJtY2dkR2hsSUdadmJHeHZkMmx1WnlCM1lYTWdZMkYxYzJsdVp5QjBhR2x6SUdaMWJtTjBhVzl1SUhSdklISmxkSFZ5YmlCMWJtUmxabWx1WldRdVhHNGdJQ0FnSUNBZ2NtVjBkWEp1WEc0Z0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1SbGVFOW1LRndpYlc5MWMyVmNJaWtnSVQwOUlEQWdmSHhjYmlBZ0lDQWdJQ0FnSUNBZ1pYWjBMbWx1WkdWNFQyWW9YQ0p0YjNWelpXUnZkMjVjSWlrZ1BUMDlJREFnZkh4Y2JpQWdJQ0FnSUNBZ0lDQWdaWFowTG1sdVpHVjRUMllvWENKdGIzVnpaWFZ3WENJcElEMDlQU0F3TzF4dVhHNGdJQ0FnSUNBZ0x5OGdTWFJ6SUdKbFkyRjFjMlVnZEdobElHTnZibVJwZEdsdmJuTWdkMlZ5WlNCdWIzUWdiMjRnZEdobElITmhiV1VnYkdsdVpTQmhjeUIwYUdVZ2NtVjBkWEp1SUhOMFlYUmxiV1Z1ZEZ4dUlDQWdJQ292WEc0Z0lDQWdjbVYwZFhKdUlHVjJkQzVwYm1SbGVFOW1LRndpYlc5MWMyVmNJaWtnSVQwOUlEQWdmSHdnWlhaMExtbHVaR1Y0VDJZb1hDSnRiM1Z6WldSdmQyNWNJaWtnUFQwOUlEQWdmSHdnWlhaMExtbHVaR1Y0VDJZb1hDSnRiM1Z6WlhWd1hDSXBJRDA5UFNBd08xeHVmVnh1WEc1bWRXNWpkR2x2YmlCMGNubFZiblJwYkVadmRXNWtLSE5qWlc1aGNtbHZMQ0J6ZEdWd0xDQnNiMk5oZEc5eUxDQjBhVzFsYjNWMExDQjBaWGgwVkc5RGFHVmpheWtnZTF4dUlDQWdJSFpoY2lCemRHRnlkR1ZrTzF4dUlDQWdJSEpsZEhWeWJpQnVaWGNnVUhKdmJXbHpaU2htZFc1amRHbHZiaUFvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUdaMWJtTjBhVzl1SUhSeWVVWnBibVFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lYTjBZWEowWldRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0Z5ZEdWa0lEMGdibVYzSUVSaGRHVW9LUzVuWlhSVWFXMWxLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJsYkdWek8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHWnZkVzVrVkc5dlRXRnVlU0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR1p2ZFc1a1ZtRnNhV1FnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJtYjNWdVpFUnBabVpsY21WdWRGUmxlSFFnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ6Wld4bFkzUnZjbk5VYjFSbGMzUWdQU0JzYjJOaGRHOXlMbk5sYkdWamRHOXljeTV6YkdsalpTZ3dLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUIwWlhoMFZHOURhR1ZqYXlBOUlITjBaWEF1WkdGMFlTNTBaWGgwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdOdmJYQmhjbWx6YjI0Z1BTQnpkR1Z3TG1SaGRHRXVZMjl0Y0dGeWFYTnZiaUI4ZkNCY0ltVnhkV0ZzYzF3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1pXTjBiM0p6Vkc5VVpYTjBMblZ1YzJocFpuUW9KMXRrWVhSaExYVnVhWEYxWlMxcFpEMWNJaWNnS3lCc2IyTmhkRzl5TG5WdWFYRjFaVWxrSUNzZ0oxd2lYU2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J6Wld4bFkzUnZjbk5VYjFSbGMzUXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjMlZzWldOMGIzSWdQU0J6Wld4bFkzUnZjbk5VYjFSbGMzUmJhVjA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHbHpTVzF3YjNKMFlXNTBVM1JsY0NoemRHVndLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaV3hsWTNSdmNpQXJQU0JjSWpwMmFYTnBZbXhsWENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnNaWE1nUFNBa0tITmxiR1ZqZEc5eUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWld4bGN5NXNaVzVuZEdnZ1BUMGdNU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JSFJsZUhSVWIwTm9aV05ySUNFOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNWR1Y0ZENBOUlDUW9aV3hsYzFzd1hTa3VkR1Y0ZENncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ2hqYjIxd1lYSnBjMjl1SUQwOVBTQW5aWEYxWVd4ekp5QW1KaUJ1WlhkVVpYaDBJRDA5UFNCMFpYaDBWRzlEYUdWamF5a2dmSHhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBb1kyOXRjR0Z5YVhOdmJpQTlQVDBnSjJOdmJuUmhhVzV6SnlBbUppQnVaWGRVWlhoMExtbHVaR1Y0VDJZb2RHVjRkRlJ2UTJobFkyc3BJRDQ5SURBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm05MWJtUldZV3hwWkNBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtSR2xtWm1WeVpXNTBWR1Y0ZENBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRlpoYkdsa0lEMGdkSEoxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWc1pYTXVZWFIwY2lnblpHRjBZUzExYm1seGRXVXRhV1FuTENCc2IyTmhkRzl5TG5WdWFYRjFaVWxrS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9aV3hsY3k1c1pXNW5kR2dnUGlBeEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtWRzl2VFdGdWVTQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1ptOTFibVJXWVd4cFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9aV3hsY3lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dselNXMXdiM0owWVc1MFUzUmxjQ2h6ZEdWd0tTQW1KaUFvYm1WM0lFUmhkR1VvS1M1blpYUlVhVzFsS0NrZ0xTQnpkR0Z5ZEdWa0tTQThJSFJwYldWdmRYUWdLaUExS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBWR2x0Wlc5MWRDaDBjbmxHYVc1a0xDQTFNQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ5WlhOMWJIUWdQU0JjSWx3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2htYjNWdVpGUnZiMDFoYm5rcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemRXeDBJRDBnSjBOdmRXeGtJRzV2ZENCbWFXNWtJR0Z3Y0hKdmNISnBZWFJsSUdWc1pXMWxiblFnWm05eUlITmxiR1ZqZEc5eWN6b2dKeUFySUVwVFQwNHVjM1J5YVc1bmFXWjVLR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpLU0FySUZ3aUlHWnZjaUJsZG1WdWRDQmNJaUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnWENJdUlDQlNaV0Z6YjI0NklFWnZkVzVrSUZSdmJ5Qk5ZVzU1SUVWc1pXMWxiblJ6WENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaG1iM1Z1WkVScFptWmxjbVZ1ZEZSbGVIUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpkV3gwSUQwZ0owTnZkV3hrSUc1dmRDQm1hVzVrSUdGd2NISnZjSEpwWVhSbElHVnNaVzFsYm5RZ1ptOXlJSE5sYkdWamRHOXljem9nSnlBcklFcFRUMDR1YzNSeWFXNW5hV1o1S0d4dlkyRjBiM0l1YzJWc1pXTjBiM0p6S1NBcklGd2lJR1p2Y2lCbGRtVnVkQ0JjSWlBcklITjBaWEF1WlhabGJuUk9ZVzFsSUNzZ1hDSXVJQ0JTWldGemIyNDZJRlJsZUhRZ1pHOWxjMjRuZENCdFlYUmphQzRnSUZ4Y2JrVjRjR1ZqZEdWa09seGNibHdpSUNzZ2RHVjRkRlJ2UTJobFkyc2dLeUJjSWx4Y2JtSjFkQ0IzWVhOY1hHNWNJaUFySUdWc1pYTXVkR1Y0ZENncElDc2dYQ0pjWEc1Y0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOMWJIUWdQU0FuUTI5MWJHUWdibTkwSUdacGJtUWdZWEJ3Y205d2NtbGhkR1VnWld4bGJXVnVkQ0JtYjNJZ2MyVnNaV04wYjNKek9pQW5JQ3NnU2xOUFRpNXpkSEpwYm1kcFpua29iRzlqWVhSdmNpNXpaV3hsWTNSdmNuTXBJQ3NnWENJZ1ptOXlJR1YyWlc1MElGd2lJQ3NnYzNSbGNDNWxkbVZ1ZEU1aGJXVWdLeUJjSWk0Z0lGSmxZWE52YmpvZ1RtOGdaV3hsYldWdWRITWdabTkxYm1SY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZxWldOMEtISmxjM1ZzZENrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQjJZWElnYkdsdGFYUWdQU0JwYlhCdmNuUmhiblJUZEdWd1RHVnVaM1JvSUM4Z0tIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtJRDA5SUNkeVpXRnNkR2x0WlNjZ1B5QW5NU2NnT2lCMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDazdYRzRnSUNBZ0lDQWdJR2xtSUNobmJHOWlZV3d1WVc1bmRXeGhjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkMkZwZEVadmNrRnVaM1ZzWVhJb0oxdHVaeTFoY0hCZEp5a3VkR2hsYmlobWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWMzUmhkR1V1Y25WdUxuTndaV1ZrSUQwOVBTQW5jbVZoYkhScGJXVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtIUnllVVpwYm1Rc0lIUnBiV1Z2ZFhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtJRDA5UFNBblptRnpkR1Z6ZENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ5ZVVacGJtUW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvZEhKNVJtbHVaQ3dnVFdGMGFDNXRhVzRvZEdsdFpXOTFkQ0FxSUhWMGJXVXVjM1JoZEdVdWNuVnVMbk53WldWa0xDQnNhVzFwZENrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDQTlQVDBnSjNKbFlXeDBhVzFsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dkR2x0Wlc5MWRDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtJRDA5UFNBblptRnpkR1Z6ZENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBjbmxHYVc1a0tDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb2RISjVSbWx1WkN3Z1RXRjBhQzV0YVc0b2RHbHRaVzkxZENBcUlIVjBiV1V1YzNSaGRHVXVjblZ1TG5Od1pXVmtMQ0JzYVcxcGRDa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHZGxkRlJwYldWdmRYUW9jMk5sYm1GeWFXOHNJR2xrZUNrZ2UxeHVJQ0FnSUdsbUlDaHBaSGdnUGlBd0tTQjdYRzRnSUNBZ0lDQWdJQzh2SUVsbUlIUm9aU0J3Y21WMmFXOTFjeUJ6ZEdWd0lHbHpJR0VnZG1Gc2FXUmhkR1VnYzNSbGNDd2dkR2hsYmlCcWRYTjBJRzF2ZG1VZ2IyNHNJR0Z1WkNCd2NtVjBaVzVrSUdsMElHbHpiaWQwSUhSb1pYSmxYRzRnSUNBZ0lDQWdJQzh2SUU5eUlHbG1JR2wwSUdseklHRWdjMlZ5YVdWeklHOW1JR3RsZVhNc0lIUm9aVzRnWjI5Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlQ0F0SURGZExtVjJaVzUwVG1GdFpTQTlQU0FuZG1Gc2FXUmhkR1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdNRHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJObGJtRnlhVzh1YzNSbGNITmJhV1I0WFM1MGFXMWxVM1JoYlhBZ0xTQnpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIZ2dMU0F4WFM1MGFXMWxVM1JoYlhBN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQXdPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBc0lIUnBiV1Z2ZFhRcElIdGNiaUFnSUNBdkx5Qk5ZV3RsSUhOMWNtVWdkMlVnWVhKbGJpZDBJR2R2YVc1bklIUnZJRzkyWlhKbWJHOTNJSFJvWlNCallXeHNJSE4wWVdOckxseHVJQ0FnSUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoelkyVnVZWEpwYnk1emRHVndjeTVzWlc1bmRHZ2dQaUFvYVdSNElDc2dNU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUNBcklERXNJSFJ2VTJ0cGNDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wYjNCVFkyVnVZWEpwYnloMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzSUhScGJXVnZkWFFnZkh3Z01DazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHWnlZV2R0Wlc1MFJuSnZiVk4wY21sdVp5aHpkSEpJVkUxTUtTQjdYRzRnSUNBZ2RtRnlJSFJsYlhBZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkMFpXMXdiR0YwWlNjcE8xeHVJQ0FnSUhSbGJYQXVhVzV1WlhKSVZFMU1JRDBnYzNSeVNGUk5URHRjYmlBZ0lDQXZMeUJqYjI1emIyeGxMbXh2WnloMFpXMXdMbWx1Ym1WeVNGUk5UQ2s3WEc0Z0lDQWdjbVYwZFhKdUlIUmxiWEF1WTI5dWRHVnVkQ0EvSUhSbGJYQXVZMjl1ZEdWdWRDQTZJSFJsYlhBN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnpkR1Z3SUNZbUlITjBaWEF1WkdGMFlTQW1KaUJ6ZEdWd0xtUmhkR0V1Ykc5allYUnZjaUFtSmlCemRHVndMbVJoZEdFdWJHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkR0Y2JuMWNibHh1ZG1GeUlHZDFhV1FnUFNBb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lHWjFibU4wYVc5dUlITTBLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnVFdGMGFDNW1iRzl2Y2lnb01TQXJJRTFoZEdndWNtRnVaRzl0S0NrcElDb2dNSGd4TURBd01DbGNiaUFnSUNBZ0lDQWdJQ0FnSUM1MGIxTjBjbWx1WnlneE5pbGNiaUFnSUNBZ0lDQWdJQ0FnSUM1emRXSnpkSEpwYm1jb01TazdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCek5DZ3BJQ3NnY3pRb0tTQXJJQ2N0SnlBcklITTBLQ2tnS3lBbkxTY2dLeUJ6TkNncElDc2dKeTBuSUN0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE0wS0NrZ0t5QW5MU2NnS3lCek5DZ3BJQ3NnY3pRb0tTQXJJSE0wS0NrN1hHNGdJQ0FnZlR0Y2JuMHBLQ2s3WEc1Y2JuWmhjaUJzYVhOMFpXNWxjbk1nUFNCYlhUdGNiblpoY2lCemRHRjBaVHRjYm5aaGNpQnpaWFIwYVc1bmN6dGNiblpoY2lCMWRHMWxJRDBnZTF4dUlDQWdJSE4wWVhSbE9pQnpkR0YwWlN4Y2JpQWdJQ0JwYm1sME9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpZMlZ1WVhKcGJ5QTlJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2duZFhSdFpWOXpZMlZ1WVhKcGJ5Y3BPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkWFJ0WlM1c2IyRmtVMlYwZEdsdVozTW9LUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6WTJWdVlYSnBieWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd4dlkyRnNVM1J2Y21GblpTNWpiR1ZoY2lncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsSUQwZ2RYUnRaUzV6ZEdGMFpTQTlJSFYwYldVdWJHOWhaRk4wWVhSbFJuSnZiVk4wYjNKaFoyVW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25TVTVKVkVsQlRFbGFSVVFuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1V1ZEdWemRGTmxjblpsY2lBOUlHZGxkRkJoY21GdFpYUmxja0o1VG1GdFpTaGNJblYwYldWZmRHVnpkRjl6WlhKMlpYSmNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG1GMWRHOVNkVzRnUFNCMGNuVmxPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ5ZFc1RGIyNW1hV2NnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb0ozVjBiV1ZmY25WdVgyTnZibVpwWnljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2NuVnVRMjl1Wm1sbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVEYjI1bWFXY2dQU0JLVTA5T0xuQmhjbk5sS0hKMWJrTnZibVpwWnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVRMjl1Wm1sbklEMGdjblZ1UTI5dVptbG5JSHg4SUh0OU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MzQmxaV1FnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb0ozVjBiV1ZmY25WdVgzTndaV1ZrSnlrZ2ZId2djMlYwZEdsdVozTXVaMlYwS0Z3aWNuVnVibVZ5TG5Od1pXVmtYQ0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNCbFpXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYmtOdmJtWnBaeTV6Y0dWbFpDQTlJSE53WldWa08xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eWRXNVRZMlZ1WVhKcGJ5aHpZMlZ1WVhKcGJ5d2djblZ1UTI5dVptbG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5TENBeU1EQXdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCMWRHMWxMbk4wWVhSbElEMGdkWFJ0WlM1c2IyRmtVM1JoZEdWR2NtOXRVM1J2Y21GblpTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZEpUa2xVU1VGTVNWcEZSQ2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1emRHRjBkWE1nUFQwOUlGd2lVRXhCV1VsT1Ixd2lLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISjFiazVsZUhSVGRHVndLSE4wWVhSbExuSjFiaTV6WTJWdVlYSnBieXdnYzNSaGRHVXVjblZ1TG5OMFpYQkpibVJsZUNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDZ2hjM1JoZEdVdWMzUmhkSFZ6SUh4OElITjBZWFJsTG5OMFlYUjFjeUE5UFQwZ0owbE9TVlJKUVV4SldrbE9SeWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdWMzUmhkSFZ6SUQwZ1hDSk1UMEZFUlVSY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1luSnZZV1JqWVhOME9pQm1kVzVqZEdsdmJpQW9aWFowTENCbGRuUkVZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hzYVhOMFpXNWxjbk1nSmlZZ2JHbHpkR1Z1WlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCc2FYTjBaVzVsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYVhOMFpXNWxjbk5iYVYwb1pYWjBMQ0JsZG5SRVlYUmhLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2MzUmhjblJTWldOdmNtUnBibWM2SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hOMFlYUmxMbk4wWVhSMWN5QWhQU0FuVWtWRFQxSkVTVTVISnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjM1JoZEhWeklEMGdKMUpGUTA5U1JFbE9SeWM3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHVndjeUE5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29YQ0pTWldOdmNtUnBibWNnVTNSaGNuUmxaRndpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZFNSVU5QVWtSSlRrZGZVMVJCVWxSRlJDY3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbFoybHpkR1Z5UlhabGJuUW9YQ0pzYjJGa1hDSXNJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213NklIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY0hKdmRHOWpiMnc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTV3Y205MGIyTnZiQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FHOXpkRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbWh2YzNRc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sWVhKamFEb2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxuTmxZWEpqYUN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhR0Z6YURvZ2QybHVaRzkzTG14dlkyRjBhVzl1TG1oaGMyaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnlkVzVUWTJWdVlYSnBiem9nWm5WdVkzUnBiMjRnS0c1aGJXVXNJR052Ym1acFp5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2RHOVNkVzRnUFNCdVlXMWxJSHg4SUhCeWIyMXdkQ2duVTJObGJtRnlhVzhnZEc4Z2NuVnVKeWs3WEc0Z0lDQWdJQ0FnSUhaaGNpQmhkWFJ2VW5WdUlEMGdJVzVoYldVZ1B5QndjbTl0Y0hRb0oxZHZkV3hrSUhsdmRTQnNhV3RsSUhSdklITjBaWEFnZEdoeWIzVm5hQ0JsWVdOb0lITjBaWEFnS0hsOGJpay9KeWtnSVQwZ0oza25JRG9nZEhKMVpUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHZGxkRk5qWlc1aGNtbHZLSFJ2VW5WdUtTNTBhR1Z1S0daMWJtTjBhVzl1SUNoelkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJObGJtRnlhVzhnUFNCS1UwOU9MbkJoY25ObEtFcFRUMDR1YzNSeWFXNW5hV1o1S0hOalpXNWhjbWx2S1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBZWFJsTG5KMWJpQTlJRjh1WlhoMFpXNWtLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6Y0dWbFpEb2dKekV3SjF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3dnWTI5dVptbG5LVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjMlYwZFhCRGIyNWthWFJwYjI1ektITmpaVzVoY21sdktTNTBhR1Z1S0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1aGRYUnZVblZ1SUQwZ1lYVjBiMUoxYmlBOVBUMGdkSEoxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV6ZEdGMGRYTWdQU0JjSWxCTVFWbEpUa2RjSWp0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUzUmhjblJwYm1jZ1UyTmxibUZ5YVc4Z0oxd2lJQ3NnYm1GdFpTQXJJRndpSjF3aUxDQnpZMlZ1WVhKcGJ5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0oxQk1RVmxDUVVOTFgxTlVRVkpVUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOMFpYQW9jMk5sYm1GeWFXOHNJREFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnY25WdVRtVjRkRk4wWlhBNklISjFiazVsZUhSVGRHVndMRnh1SUNBZ0lITjBiM0JUWTJWdVlYSnBiem9nWm5WdVkzUnBiMjRnS0hOMVkyTmxjM01wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE5qWlc1aGNtbHZJRDBnYzNSaGRHVXVjblZ1SUNZbUlITjBZWFJsTG5KMWJpNXpZMlZ1WVhKcGJ6dGNiaUFnSUNBZ0lDQWdaR1ZzWlhSbElITjBZWFJsTG5KMWJqdGNiaUFnSUNBZ0lDQWdjM1JoZEdVdWMzUmhkSFZ6SUQwZ1hDSk1UMEZFUlVSY0lqdGNiaUFnSUNBZ0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0oxQk1RVmxDUVVOTFgxTlVUMUJRUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE4wYjNCd2FXNW5JRk5qWlc1aGNtbHZYQ0lwTzF4dUlDQWdJQ0FnSUNCcFppQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZFdOalpYTnpLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25SVGRXTmpaWE56S0Z3aVcxTlZRME5GVTFOZElGTmpaVzVoY21sdklDZGNJaUFySUhOalpXNWhjbWx2TG01aGJXVWdLeUJjSWljZ1EyOXRjR3hsZEdWa0lWd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvWENKVGRHOXdjR2x1WnlCdmJpQndZV2RsSUZ3aUlDc2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxtaHlaV1lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFJYSnliM0lvWENKYlJrRkpURlZTUlYwZ1UyTmxibUZ5YVc4Z0oxd2lJQ3NnYzJObGJtRnlhVzh1Ym1GdFpTQXJJRndpSnlCVGRHOXdjR1ZrSVZ3aUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQkRjbVZoZEdWeklHRWdkR1Z0Y0c5eVlYSjVJR1ZzWlcxbGJuUWdiRzlqWVhSdmNpd2dabTl5SUhWelpTQjNhWFJvSUdacGJtRnNhWHBsVEc5allYUnZjbHh1SUNBZ0lDQXFMMXh1SUNBZ0lHTnlaV0YwWlVWc1pXMWxiblJNYjJOaGRHOXlPaUJtZFc1amRHbHZiaUFvWld4bGJXVnVkQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkVzVwY1hWbFNXUWdQU0JsYkdWdFpXNTBMbWRsZEVGMGRISnBZblYwWlNoY0ltUmhkR0V0ZFc1cGNYVmxMV2xrWENJcElIeDhJR2QxYVdRb0tUdGNiaUFnSUNBZ0lDQWdaV3hsYldWdWRDNXpaWFJCZEhSeWFXSjFkR1VvWENKa1lYUmhMWFZ1YVhGMVpTMXBaRndpTENCMWJtbHhkV1ZKWkNrN1hHNWNiaUFnSUNBZ0lDQWdkbUZ5SUdWc1pVaDBiV3dnUFNCbGJHVnRaVzUwTG1Oc2IyNWxUbTlrWlNncExtOTFkR1Z5U0ZSTlREdGNiaUFnSUNBZ0lDQWdkbUZ5SUdWc1pWTmxiR1ZqZEc5eWN5QTlJRnRkTzF4dUlDQWdJQ0FnSUNCcFppQW9aV3hsYldWdWRDNTBZV2RPWVcxbExuUnZWWEJ3WlhKRFlYTmxLQ2tnUFQwZ0owSlBSRmtuSUh4OElHVnNaVzFsYm5RdWRHRm5UbUZ0WlM1MGIxVndjR1Z5UTJGelpTZ3BJRDA5SUNkSVZFMU1KeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaV3hsVTJWc1pXTjBiM0p6SUQwZ1cyVnNaVzFsYm5RdWRHRm5UbUZ0WlYwN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsYkdWVFpXeGxZM1J2Y25NZ1BTQnpaV3hsWTNSdmNrWnBibVJsY2lobGJHVnRaVzUwTENCa2IyTjFiV1Z1ZEM1aWIyUjVLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkVzVwY1hWbFNXUTZJSFZ1YVhGMVpVbGtMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2MyVnNaV04wYjNKek9pQmxiR1ZUWld4bFkzUnZjbk5jYmlBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnY21WbmFYTjBaWEpGZG1WdWREb2dablZ1WTNScGIyNGdLR1YyWlc1MFRtRnRaU3dnWkdGMFlTd2dhV1I0S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbExtbHpVbVZqYjNKa2FXNW5LQ2tnZkh3Z2RYUnRaUzVwYzFaaGJHbGtZWFJwYm1jb0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnBaSGdnUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWkhnZ1BTQjFkRzFsTG5OMFlYUmxMbk4wWlhCekxteGxibWQwYUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5OMFpYQnpXMmxrZUYwZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaWFpsYm5ST1lXMWxPaUJsZG1WdWRFNWhiV1VzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdsdFpWTjBZVzF3T2lCdVpYY2dSR0YwWlNncExtZGxkRlJwYldVb0tTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmtZWFJoT2lCa1lYUmhYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNWljbTloWkdOaGMzUW9KMFZXUlU1VVgxSkZSMGxUVkVWU1JVUW5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdjbVZ3YjNKMFRHOW5PaUJtZFc1amRHbHZiaUFvYkc5bkxDQnpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NtVndiM0owU0dGdVpHeGxjbk1nSmlZZ2NtVndiM0owU0dGdVpHeGxjbk11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21Wd2IzSjBTR0Z1Wkd4bGNuTmJhVjB1Ykc5bktHeHZaeXdnYzJObGJtRnlhVzhzSUhWMGJXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpYQnZjblJGY25KdmNqb2dablZ1WTNScGIyNGdLR1Z5Y205eUxDQnpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NtVndiM0owU0dGdVpHeGxjbk1nSmlZZ2NtVndiM0owU0dGdVpHeGxjbk11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21Wd2IzSjBTR0Z1Wkd4bGNuTmJhVjB1WlhKeWIzSW9aWEp5YjNJc0lITmpaVzVoY21sdkxDQjFkRzFsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdjbVZ3YjNKMFUzVmpZMlZ6Y3pvZ1puVnVZM1JwYjI0Z0tHMWxjM05oWjJVc0lITmpaVzVoY21sdktTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoeVpYQnZjblJJWVc1a2JHVnljeUFtSmlCeVpYQnZjblJJWVc1a2JHVnljeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2djbVZ3YjNKMFNHRnVaR3hsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhCdmNuUklZVzVrYkdWeWMxdHBYUzV6ZFdOalpYTnpLRzFsYzNOaFoyVXNJSE5qWlc1aGNtbHZMQ0IxZEcxbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnY21WbmFYTjBaWEpNYVhOMFpXNWxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2JHbHpkR1Z1WlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV2RwYzNSbGNsTmhkbVZJWVc1a2JHVnlPaUJtZFc1amRHbHZiaUFvYUdGdVpHeGxjaWtnZTF4dUlDQWdJQ0FnSUNCellYWmxTR0Z1Wkd4bGNuTXVjSFZ6YUNob1lXNWtiR1Z5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlVbVZ3YjNKMFNHRnVaR3hsY2pvZ1puVnVZM1JwYjI0Z0tHaGhibVJzWlhJcElIdGNiaUFnSUNBZ0lDQWdjbVZ3YjNKMFNHRnVaR3hsY25NdWNIVnphQ2hvWVc1a2JHVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISmxaMmx6ZEdWeVRHOWhaRWhoYm1Sc1pYSTZJR1oxYm1OMGFXOXVJQ2hvWVc1a2JHVnlLU0I3WEc0Z0lDQWdJQ0FnSUd4dllXUklZVzVrYkdWeWN5NXdkWE5vS0doaGJtUnNaWElwTzF4dUlDQWdJSDBzWEc0Z0lDQWdjbVZuYVhOMFpYSlRaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnlPaUJtZFc1amRHbHZiaUFvYUdGdVpHeGxjaWtnZTF4dUlDQWdJQ0FnSUNCelpYUjBhVzVuYzB4dllXUklZVzVrYkdWeWN5NXdkWE5vS0doaGJtUnNaWElwTzF4dUlDQWdJSDBzWEc0Z0lDQWdhWE5TWldOdmNtUnBibWM2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzV6ZEdGMFpTNXpkR0YwZFhNdWFXNWtaWGhQWmloY0lsSkZRMDlTUkVsT1Ixd2lLU0E5UFQwZ01EdGNiaUFnSUNCOUxGeHVJQ0FnSUdselVHeGhlV2x1WnpvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjFkRzFsTG5OMFlYUmxMbk4wWVhSMWN5NXBibVJsZUU5bUtGd2lVRXhCV1VsT1Ixd2lLU0E5UFQwZ01EdGNiaUFnSUNCOUxGeHVJQ0FnSUdselZtRnNhV1JoZEdsdVp6b2dablZ1WTNScGIyNG9kbUZzYVdSaGRHbHVaeWtnZTF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIWmhiR2xrWVhScGJtY2dJVDA5SUNkMWJtUmxabWx1WldRbklDWW1JQ2gxZEcxbExtbHpVbVZqYjNKa2FXNW5LQ2tnZkh3Z2RYUnRaUzVwYzFaaGJHbGtZWFJwYm1jb0tTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1YzNSaGRHVXVjM1JoZEhWeklEMGdkbUZzYVdSaGRHbHVaeUEvSUZ3aVZrRk1TVVJCVkVsT1Ixd2lJRG9nWENKU1JVTlBVa1JKVGtkY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RXUVV4SlJFRlVTVTlPWDBOSVFVNUhSVVFuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzV6ZEdGMFpTNXpkR0YwZFhNdWFXNWtaWGhQWmloY0lsWkJURWxFUVZSSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCemRHOXdVbVZqYjNKa2FXNW5PaUJtZFc1amRHbHZiaUFvYVc1bWJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2FXNW1ieUFoUFQwZ1ptRnNjMlVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCdVpYZFRZMlZ1WVhKcGJ5QTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdWd2N6b2djM1JoZEdVdWMzUmxjSE5jYmlBZ0lDQWdJQ0FnSUNBZ0lIMDdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lGOHVaWGgwWlc1a0tHNWxkMU5qWlc1aGNtbHZMQ0JwYm1adktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ0Z1WlhkVFkyVnVZWEpwYnk1dVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYm1WM1UyTmxibUZ5YVc4dWJtRnRaU0E5SUhCeWIyMXdkQ2duUlc1MFpYSWdjMk5sYm1GeWFXOGdibUZ0WlNjcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2JtVjNVMk5sYm1GeWFXOHVibUZ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5OalpXNWhjbWx2Y3k1d2RYTm9LRzVsZDFOalpXNWhjbWx2S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6WVhabFNHRnVaR3hsY25NZ0ppWWdjMkYyWlVoaGJtUnNaWEp6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSE5oZG1WSVlXNWtiR1Z5Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMkYyWlVoaGJtUnNaWEp6VzJsZEtHNWxkMU5qWlc1aGNtbHZMQ0IxZEcxbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUNkTVQwRkVSVVFuTzF4dVhHNGdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkU1JVTlBVa1JKVGtkZlUxUlBVRkJGUkNjcE8xeHVYRzRnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lVbVZqYjNKa2FXNW5JRk4wYjNCd1pXUmNJaXdnYm1WM1UyTmxibUZ5YVc4cE8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCc2IyRmtVMlYwZEdsdVozTTZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2MyVjBkR2x1WjNNZ1BTQjFkRzFsTG5ObGRIUnBibWR6SUQwZ2JtVjNJRk5sZEhScGJtZHpLQ2s3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnljeTVzWlc1bmRHZ2dQaUF3SUNZbUlDRm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9KM1YwYldWZmMyTmxibUZ5YVc4bktTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUlDaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnljMXN3WFNobWRXNWpkR2x2YmlBb2NtVnpjQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFIwYVc1bmN5NXpaWFJFWldaaGRXeDBjeWh5WlhOd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemIyeDJaU2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwc0lHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzV5WlhOdmJIWmxLQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYkc5aFpGTjBZWFJsUm5KdmJWTjBiM0poWjJVNklHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlIVjBiV1ZUZEdGMFpWTjBjaUE5SUd4dlkyRnNVM1J2Y21GblpTNW5aWFJKZEdWdEtDZDFkRzFsSnlrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbFUzUmhkR1ZUZEhJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxJRDBnU2xOUFRpNXdZWEp6WlNoMWRHMWxVM1JoZEdWVGRISXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkSFZ6T2lCY0lrbE9TVlJKUVV4SldrbE9SMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOalpXNWhjbWx2Y3pvZ1cxMWNiaUFnSUNBZ0lDQWdJQ0FnSUgwN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlITjBZWFJsTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J6WVhabFUzUmhkR1ZVYjFOMGIzSmhaMlU2SUdaMWJtTjBhVzl1SUNoMWRHMWxVM1JoZEdVcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVlRkR0YwWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYkc5allXeFRkRzl5WVdkbExuTmxkRWwwWlcwb0ozVjBiV1VuTENCS1UwOU9Mbk4wY21sdVoybG1lU2gxZEcxbFUzUmhkR1VwS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3h2WTJGc1UzUnZjbUZuWlM1eVpXMXZkbVZKZEdWdEtDZDFkRzFsSnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ2RXNXNiMkZrT2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSFYwYldVdWMyRjJaVk4wWVhSbFZHOVRkRzl5WVdkbEtITjBZWFJsS1R0Y2JpQWdJQ0I5WEc1OU8xeHVYRzVtZFc1amRHbHZiaUIwYjJkbmJHVklhV2RvYkdsbmFIUW9aV3hsTENCMllXeDFaU2tnZTF4dUlDQWdJQ1FvWld4bEtTNTBiMmRuYkdWRGJHRnpjeWduZFhSdFpTMTJaWEpwWm5rbkxDQjJZV3gxWlNrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUhSdloyZHNaVkpsWVdSNUtHVnNaU3dnZG1Gc2RXVXBJSHRjYmlBZ0lDQWtLR1ZzWlNrdWRHOW5aMnhsUTJ4aGMzTW9KM1YwYldVdGNtVmhaSGtuTENCMllXeDFaU2s3WEc1OVhHNWNiaThxS2x4dUlDb2dTV1lnZVc5MUlHTnNhV05ySUc5dUlHRWdjM0JoYmlCcGJpQmhJR3hoWW1Wc0xDQjBhR1VnYzNCaGJpQjNhV3hzSUdOc2FXTnJMRnh1SUNvZ2RHaGxiaUIwYUdVZ1luSnZkM05sY2lCM2FXeHNJR1pwY21VZ2RHaGxJR05zYVdOcklHVjJaVzUwSUdadmNpQjBhR1VnYVc1d2RYUWdZMjl1ZEdGcGJtVmtJSGRwZEdocGJpQjBhR1VnYzNCaGJpeGNiaUFxSUZOdkxDQjNaU0J2Ym14NUlIZGhiblFnZEc4Z2RISmhZMnNnZEdobElHbHVjSFYwSUdOc2FXTnJjeTVjYmlBcUwxeHVablZ1WTNScGIyNGdhWE5PYjNSSmJreGhZbVZzVDNKV1lXeHBaQ2hsYkdVcElIdGNiaUFnSUNCeVpYUjFjbTRnSkNobGJHVXBMbkJoY21WdWRITW9KMnhoWW1Wc0p5a3ViR1Z1WjNSb0lEMDlJREFnZkh4Y2JpQWdJQ0FnSUNBZ0lDQmxiR1V1Ym05a1pVNWhiV1V1ZEc5TWIzZGxja05oYzJVb0tTQTlQU0FuYVc1d2RYUW5PMXh1ZlZ4dVhHNTJZWElnZEdsdFpYSnpJRDBnVzEwN1hHNWNibVoxYm1OMGFXOXVJR2x1YVhSRmRtVnVkRWhoYm1Sc1pYSnpLQ2tnZTF4dVhHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCbGRtVnVkSE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdaRzlqZFcxbGJuUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpaGxkbVZ1ZEhOYmFWMHNJQ2htZFc1amRHbHZiaUFvWlhaMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhR0Z1Wkd4bGNpQTlJR1oxYm1OMGFXOXVJQ2hsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1V1YVhOVWNtbG5aMlZ5S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1V1ZEdGeVoyVjBMbWhoYzBGMGRISnBZblYwWlNBbUpseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FoWlM1MFlYSm5aWFF1YUdGelFYUjBjbWxpZFhSbEtDZGtZWFJoTFdsbmJtOXlaU2NwSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ1FvWlM1MFlYSm5aWFFwTG5CaGNtVnVkSE1vWENKYlpHRjBZUzFwWjI1dmNtVmRYQ0lwTG14bGJtZDBhQ0E5UFNBd0lDWW1YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdselRtOTBTVzVNWVdKbGJFOXlWbUZzYVdRb1pTNTBZWEpuWlhRcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR2xrZUNBOUlIVjBiV1V1YzNSaGRHVXVjM1JsY0hNdWJHVnVaM1JvTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCaGNtZHpJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCc2IyTmhkRzl5T2lCMWRHMWxMbU55WldGMFpVVnNaVzFsYm5STWIyTmhkRzl5S0dVdWRHRnlaMlYwS1Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhScGJXVnlPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dVdWQyaHBZMmdnZkh3Z1pTNWlkWFIwYjI0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZWEpuY3k1aWRYUjBiMjRnUFNCbExuZG9hV05vSUh4OElHVXVZblYwZEc5dU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaGxkblFnUFQwZ0oyMXZkWE5sYjNabGNpY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5bloyeGxTR2xuYUd4cFoyaDBLR1V1ZEdGeVoyVjBMQ0IwY25WbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2x0WlhKekxuQjFjMmdvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaV3hsYldWdWREb2daUzUwWVhKblpYUXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFXMWxjam9nYzJWMFZHbHRaVzkxZENobWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzluWjJ4bFVtVmhaSGtvWlM1MFlYSm5aWFFzSUhSeWRXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN3Z05UQXdLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMmRDQTlQU0FuYlc5MWMyVnZkWFFuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkR2x0WlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEdsdFpYSnpXMmxkTG1Wc1pXMWxiblFnUFQwZ1pTNTBZWEpuWlhRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpiR1ZoY2xScGJXVnZkWFFvZEdsdFpYSnpXMmxkTG5ScGJXVnlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYVcxbGNuTXVjM0JzYVdObEtHa3NJREVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWU1pXRmtlU2hsTG5SaGNtZGxkQ3dnWm1Gc2MyVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hsZG5RZ1BUMGdKMk5vWVc1blpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWVhKbmN5NTJZV3gxWlNBOUlHVXVkR0Z5WjJWMExuWmhiSFZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVm5hWE4wWlhKRmRtVnVkQ2hsZG5Rc0lHRnlaM01zSUdsa2VDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJJUVVOTElHWnZjaUIwWlhOMGFXNW5YRzRnSUNBZ0lDQWdJQ0FnSUNBb2RYUnRaUzVsZG1WdWRFeHBjM1JsYm1WeWN5QTlJSFYwYldVdVpYWmxiblJNYVhOMFpXNWxjbk1nZkh3Z2UzMHBXMlYyZEYwZ1BTQm9ZVzVrYkdWeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR2hoYm1Sc1pYSTdYRzRnSUNBZ0lDQWdJSDBwS0dWMlpXNTBjMXRwWFNrc0lIUnlkV1VwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSFpoY2lCZmRHOWZZWE5qYVdrZ1BTQjdYRzRnSUNBZ0lDQWdJQ2N4T0Rnbk9pQW5ORFFuTEZ4dUlDQWdJQ0FnSUNBbk1UQTVKem9nSnpRMUp5eGNiaUFnSUNBZ0lDQWdKekU1TUNjNklDYzBOaWNzWEc0Z0lDQWdJQ0FnSUNjeE9URW5PaUFuTkRjbkxGeHVJQ0FnSUNBZ0lDQW5NVGt5SnpvZ0p6azJKeXhjYmlBZ0lDQWdJQ0FnSnpJeU1DYzZJQ2M1TWljc1hHNGdJQ0FnSUNBZ0lDY3lNakluT2lBbk16a25MRnh1SUNBZ0lDQWdJQ0FuTWpJeEp6b2dKemt6Snl4Y2JpQWdJQ0FnSUNBZ0p6SXhPU2M2SUNjNU1TY3NYRzRnSUNBZ0lDQWdJQ2N4TnpNbk9pQW5ORFVuTEZ4dUlDQWdJQ0FnSUNBbk1UZzNKem9nSnpZeEp5d2dMeTlKUlNCTFpYa2dZMjlrWlhOY2JpQWdJQ0FnSUNBZ0p6RTROaWM2SUNjMU9TY3NJQzh2U1VVZ1MyVjVJR052WkdWelhHNGdJQ0FnSUNBZ0lDY3hPRGtuT2lBbk5EVW5JQzh2U1VVZ1MyVjVJR052WkdWelhHNGdJQ0FnZlR0Y2JseHVJQ0FnSUhaaGNpQnphR2xtZEZWd2N5QTlJSHRjYmlBZ0lDQWdJQ0FnWENJNU5sd2lPaUJjSW41Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kwT1Z3aU9pQmNJaUZjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFNRndpT2lCY0lrQmNJaXhjYmlBZ0lDQWdJQ0FnWENJMU1Wd2lPaUJjSWlOY0lpeGNiaUFnSUNBZ0lDQWdYQ0kxTWx3aU9pQmNJaVJjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFNMXdpT2lCY0lpVmNJaXhjYmlBZ0lDQWdJQ0FnWENJMU5Gd2lPaUJjSWw1Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kxTlZ3aU9pQmNJaVpjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFObHdpT2lCY0lpcGNJaXhjYmlBZ0lDQWdJQ0FnWENJMU4xd2lPaUJjSWloY0lpeGNiaUFnSUNBZ0lDQWdYQ0kwT0Z3aU9pQmNJaWxjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTBOVndpT2lCY0lsOWNJaXhjYmlBZ0lDQWdJQ0FnWENJMk1Wd2lPaUJjSWl0Y0lpeGNiaUFnSUNBZ0lDQWdYQ0k1TVZ3aU9pQmNJbnRjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTVNMXdpT2lCY0luMWNJaXhjYmlBZ0lDQWdJQ0FnWENJNU1sd2lPaUJjSW54Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kxT1Z3aU9pQmNJanBjSWl4Y2JpQWdJQ0FnSUNBZ1hDSXpPVndpT2lCY0lseGNYQ0pjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTBORndpT2lCY0lqeGNJaXhjYmlBZ0lDQWdJQ0FnWENJME5sd2lPaUJjSWo1Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kwTjF3aU9pQmNJajljSWx4dUlDQWdJSDA3WEc1Y2JpQWdJQ0JtZFc1amRHbHZiaUJyWlhsUWNtVnpjMGhoYm1Sc1pYSWdLR1VwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR1V1YVhOVWNtbG5aMlZ5S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdU8xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoMWRHMWxMbWx6VW1WamIzSmthVzVuS0NrZ0ppWWdaUzUwWVhKblpYUXVhR0Z6UVhSMGNtbGlkWFJsSUNZbUlDRmxMblJoY21kbGRDNW9ZWE5CZEhSeWFXSjFkR1VvSjJSaGRHRXRhV2R1YjNKbEp5a2dKaVlnSkNobExuUmhjbWRsZENrdWNHRnlaVzUwY3loY0lsdGtZWFJoTFdsbmJtOXlaVjFjSWlrdWJHVnVaM1JvSUQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJqSUQwZ1pTNTNhR2xqYUR0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1ZFOUVUem9nUkc5bGMyNG5kQ0IzYjNKcklIZHBkR2dnWTJGd2N5QnNiMk5yWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMMjV2Y20xaGJHbDZaU0JyWlhsRGIyUmxYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9YM1J2WDJGelkybHBMbWhoYzA5M2JsQnliM0JsY25SNUtHTXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWXlBOUlGOTBiMTloYzJOcGFWdGpYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ0ZsTG5Ob2FXWjBTMlY1SUNZbUlDaGpJRDQ5SURZMUlDWW1JR01nUEQwZ09UQXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWXlBOUlGTjBjbWx1Wnk1bWNtOXRRMmhoY2tOdlpHVW9ZeUFySURNeUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb1pTNXphR2xtZEV0bGVTQW1KaUJ6YUdsbWRGVndjeTVvWVhOUGQyNVFjbTl3WlhKMGVTaGpLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUM4dloyVjBJSE5vYVdaMFpXUWdhMlY1UTI5a1pTQjJZV3gxWlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdNZ1BTQnphR2xtZEZWd2MxdGpYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1l5QTlJRk4wY21sdVp5NW1jbTl0UTJoaGNrTnZaR1VvWXlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVm5hWE4wWlhKRmRtVnVkQ2duYTJWNWNISmxjM01uTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JHOWpZWFJ2Y2pvZ2RYUnRaUzVqY21WaGRHVkZiR1Z0Wlc1MFRHOWpZWFJ2Y2lobExuUmhjbWRsZENrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2EyVjVPaUJqTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhCeVpYWldZV3gxWlRvZ1pTNTBZWEpuWlhRdWRtRnNkV1VzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc2RXVTZJR1V1ZEdGeVoyVjBMblpoYkhWbElDc2dZeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JyWlhsRGIyUmxPaUJsTG10bGVVTnZaR1ZjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdaRzlqZFcxbGJuUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25hMlY1Y0hKbGMzTW5MQ0JyWlhsUWNtVnpjMGhoYm1Sc1pYSXNJSFJ5ZFdVcE8xeHVYRzRnSUNBZ0x5OGdTRUZEU3lCbWIzSWdkR1Z6ZEdsdVoxeHVJQ0FnSUNoMWRHMWxMbVYyWlc1MFRHbHpkR1Z1WlhKeklEMGdkWFJ0WlM1bGRtVnVkRXhwYzNSbGJtVnljeUI4ZkNCN2ZTbGJKMnRsZVhCeVpYTnpKMTBnUFNCclpYbFFjbVZ6YzBoaGJtUnNaWEk3WEc1OVhHNWNibVoxYm1OMGFXOXVJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2h1WVcxbEtTQjdYRzRnSUNBZ2JtRnRaU0E5SUc1aGJXVXVjbVZ3YkdGalpTZ3ZXMXhjVzEwdkxDQmNJbHhjWEZ4YlhDSXBMbkpsY0d4aFkyVW9MMXRjWEYxZEx5d2dYQ0pjWEZ4Y1hWd2lLVHRjYmlBZ0lDQjJZWElnY21WblpYZ2dQU0J1WlhjZ1VtVm5SWGh3S0Z3aVcxeGNYRncvSmwxY0lpQXJJRzVoYldVZ0t5QmNJajBvVzE0bUkxMHFLVndpS1N4Y2JpQWdJQ0FnSUNBZ2NtVnpkV3gwY3lBOUlISmxaMlY0TG1WNFpXTW9iRzlqWVhScGIyNHVjMlZoY21Ob0tUdGNiaUFnSUNCeVpYUjFjbTRnY21WemRXeDBjeUE5UFQwZ2JuVnNiQ0EvSUZ3aVhDSWdPaUJrWldOdlpHVlZVa2xEYjIxd2IyNWxiblFvY21WemRXeDBjMXN4WFM1eVpYQnNZV05sS0M5Y1hDc3ZaeXdnWENJZ1hDSXBLVHRjYm4xY2JseHVablZ1WTNScGIyNGdZbTl2ZEhOMGNtRndWWFJ0WlNncElIdGNiaUFnYVdZZ0tHUnZZM1Z0Wlc1MExuSmxZV1I1VTNSaGRHVWdQVDBnWENKamIyMXdiR1YwWlZ3aUtTQjdYRzRnSUNBZ2RYUnRaUzVwYm1sMEtDa3VkR2hsYmlobWRXNWpkR2x2YmlBb0tTQjdYRzVjYmlBZ0lDQWdJQ0FnYVc1cGRFVjJaVzUwU0dGdVpHeGxjbk1vS1R0Y2JseHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxaMmx6ZEdWeVJYWmxiblFvWENKc2IyRmtYQ0lzSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWNtdzZJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NISnZkRzlqYjJ3NklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1d2NtOTBiMk52YkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhRzl6ZERvZ2QybHVaRzkzTG14dlkyRjBhVzl1TG1odmMzUXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObFlYSmphRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbk5sWVhKamFDeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYUdGemFEb2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxtaGhjMmhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBwTzF4dUlDQjlYRzU5WEc1Y2JtSnZiM1J6ZEhKaGNGVjBiV1VvS1R0Y2JtUnZZM1Z0Wlc1MExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0ozSmxZV1I1YzNSaGRHVmphR0Z1WjJVbkxDQmliMjkwYzNSeVlYQlZkRzFsS1R0Y2JseHVkMmx1Wkc5M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0ozVnViRzloWkNjc0lHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQjFkRzFsTG5WdWJHOWhaQ2dwTzF4dWZTd2dkSEoxWlNrN1hHNWNibmRwYm1SdmR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGxjbkp2Y2ljc0lHWjFibU4wYVc5dUlDaGxjbklwSUh0Y2JpQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE5qY21sd2RDQkZjbkp2Y2pvZ1hDSWdLeUJsY25JdWJXVnpjMkZuWlNBcklGd2lPbHdpSUNzZ1pYSnlMblZ5YkNBcklGd2lMRndpSUNzZ1pYSnlMbXhwYm1VZ0t5QmNJanBjSWlBcklHVnljaTVqYjJ3cE8xeHVmU2s3WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2RYUnRaVHRjYmlKZGZRPT0iXX0=
