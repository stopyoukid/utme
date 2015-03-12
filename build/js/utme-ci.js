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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9maWxlc2F2ZXIuanMvRmlsZVNhdmVyLmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvaG9tZS9kYXZpZHRpdHRzd29ydGgvcHJvamVjdHMvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFBQSxBQUFJLEVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUM3QixBQUFJLEVBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxPQUFN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QUFDLENBQUMsQ0FBRSxHQUFFLENBQUMsRUFBSSxRQUFNLENBQUM7QUFDaEUsV0FBTyxRQUFNLENBQUM7SUFDbEIsQ0FBQyxBQUFDLENBQUMsTUFBSyxDQUFFLENBQUEsQ0FBQyxDQUFDLENBQUcsS0FBRyxDQUFDLENBQUM7RUFDeEI7QUFBQSxBQUVJLElBQUEsQ0FBQSxTQUFRLEVBQUk7QUFDWixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUFBLEVBQ2QsQ0FBQztBQUVELEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSTtBQUNYLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsS0FBRztBQUNULE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUFBLEVBQ1osQ0FBQztBQUVELFNBQVMsZ0JBQWMsQ0FBRyxDQUFBLENBQUc7QUFDekIsT0FBSSxDQUFBLFVBQVU7QUFDVixZQUFNO0FBQUEsQUFFVixPQUFJLElBQUcsWUFBWSxBQUFDLEVBQUMsQ0FBQSxFQUFLLENBQUEsQ0FBQSxPQUFPLGFBQWEsQ0FBQSxFQUFLLEVBQUMsQ0FBQSxPQUFPLGFBQWEsQUFBQyxDQUFDLGFBQVksQ0FBQyxDQUFBLEVBQUssQ0FBQSxDQUFBLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBQyxRQUFRLEFBQUMsQ0FBQyxlQUFjLENBQUMsT0FBTyxHQUFLLEVBQUEsQ0FBRztBQUMxSSxBQUFJLFFBQUEsQ0FBQSxDQUFBLEVBQUksQ0FBQSxDQUFBLE1BQU0sQ0FBQztBQUlmLFNBQUksU0FBUSxlQUFlLEFBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBRztBQUM3QixRQUFBLEVBQUksQ0FBQSxTQUFRLENBQUUsQ0FBQSxDQUFDLENBQUM7TUFDcEI7QUFBQSxBQUVBLFNBQUksQ0FBQyxDQUFBLFNBQVMsQ0FBQSxFQUFLLEVBQUMsQ0FBQSxHQUFLLEdBQUMsQ0FBQSxFQUFLLENBQUEsQ0FBQSxHQUFLLEdBQUMsQ0FBQyxDQUFHO0FBQ3JDLFFBQUEsRUFBSSxDQUFBLE1BQUssYUFBYSxBQUFDLENBQUMsQ0FBQSxFQUFJLEdBQUMsQ0FBQyxDQUFDO01BQ25DLEtBQU8sS0FBSSxDQUFBLFNBQVMsR0FBSyxDQUFBLFFBQU8sZUFBZSxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUc7QUFFakQsUUFBQSxFQUFJLENBQUEsUUFBTyxDQUFFLENBQUEsQ0FBQyxDQUFDO01BQ25CLEtBQU87QUFDSCxRQUFBLEVBQUksQ0FBQSxNQUFLLGFBQWEsQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO01BQzlCO0FBQUEsQUFFQSxTQUFHLGNBQWMsQUFBQyxDQUFDLFVBQVMsQ0FBRztBQUMzQixjQUFNLENBQUcsQ0FBQSxJQUFHLHFCQUFxQixBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUM7QUFDM0MsVUFBRSxDQUFHLEVBQUE7QUFDTCxnQkFBUSxDQUFHLENBQUEsQ0FBQSxPQUFPLE1BQU07QUFDeEIsWUFBSSxDQUFHLENBQUEsQ0FBQSxPQUFPLE1BQU0sRUFBSSxFQUFBO0FBQ3hCLGNBQU0sQ0FBRyxDQUFBLENBQUEsUUFBUTtBQUFBLE1BQ3JCLENBQUMsQ0FBQztJQUNOO0FBQUEsRUFDSjtBQUFBLEFBRUEsU0FBTyxpQkFBaUIsQUFBQyxDQUFDLFVBQVMsQ0FBRyxnQkFBYyxDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBRzVELEVBQUMsSUFBRyxlQUFlLEVBQUksQ0FBQSxJQUFHLGVBQWUsR0FBSyxHQUFDLENBQUMsQ0FBRSxVQUFTLENBQUMsRUFBSSxnQkFBYyxDQUFDO0FBQ25GO0FBQUEsQUFFQSxPQUFTLG1CQUFpQixDQUFFLElBQUcsQ0FBRztBQUM5QixLQUFHLEVBQUksQ0FBQSxJQUFHLFFBQVEsQUFBQyxDQUFDLE1BQUssQ0FBRyxNQUFJLENBQUMsUUFBUSxBQUFDLENBQUMsTUFBSyxDQUFHLE1BQUksQ0FBQyxDQUFDO0FBQ3pELEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxJQUFJLE9BQUssQUFBQyxDQUFDLFFBQU8sRUFBSSxLQUFHLENBQUEsQ0FBSSxZQUFVLENBQUM7QUFDaEQsWUFBTSxFQUFJLENBQUEsS0FBSSxLQUFLLEFBQUMsQ0FBQyxRQUFPLE9BQU8sQ0FBQyxDQUFDO0FBQ3pDLE9BQU8sQ0FBQSxPQUFNLElBQU0sS0FBRyxDQUFBLENBQUksR0FBQyxFQUFJLENBQUEsa0JBQWlCLEFBQUMsQ0FBQyxPQUFNLENBQUUsQ0FBQSxDQUFDLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxJQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3JGO0FBQUEsQUFFQSxPQUFTLGNBQVksQ0FBQyxBQUFDLENBQUU7QUFDdkIsS0FBSSxRQUFPLFdBQVcsR0FBSyxXQUFTLENBQUc7QUFDckMsT0FBRyxLQUFLLEFBQUMsRUFBQyxLQUFLLEFBQUMsQ0FBQyxTQUFTLEFBQUMsQ0FBRTtBQUV6QixzQkFBZ0IsQUFBQyxFQUFDLENBQUM7QUFFbkIsU0FBSSxJQUFHLFlBQVksQUFBQyxFQUFDLENBQUc7QUFDcEIsV0FBRyxjQUFjLEFBQUMsQ0FBQyxNQUFLLENBQUcsRUFDdkIsR0FBRSxDQUFHO0FBQ0QsbUJBQU8sQ0FBRyxDQUFBLE1BQUssU0FBUyxTQUFTO0FBQ2pDLGVBQUcsQ0FBRyxDQUFBLE1BQUssU0FBUyxLQUFLO0FBQ3pCLGlCQUFLLENBQUcsQ0FBQSxNQUFLLFNBQVMsT0FBTztBQUM3QixlQUFHLENBQUcsQ0FBQSxNQUFLLFNBQVMsS0FBSztBQUFBLFVBQzdCLENBQ0osQ0FBQyxDQUFDO01BQ047QUFBQSxJQUNKLENBQUMsQ0FBQztFQUNKO0FBQUEsQUFDRjtBQUFBLEFBRUEsWUFBWSxBQUFDLEVBQUMsQ0FBQztBQUNmLE9BQU8saUJBQWlCLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBRyxjQUFZLENBQUMsQ0FBQztBQUU1RCxLQUFLLGlCQUFpQixBQUFDLENBQUMsUUFBTyxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQzFDLEtBQUcsT0FBTyxBQUFDLEVBQUMsQ0FBQztBQUNqQixDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBRVIsS0FBSyxpQkFBaUIsQUFBQyxDQUFDLE9BQU0sQ0FBRyxVQUFVLEdBQUUsQ0FBRztBQUM1QyxLQUFHLFVBQVUsQUFBQyxDQUFDLGdCQUFlLEVBQUksQ0FBQSxHQUFFLFFBQVEsQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxJQUFJLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsS0FBSyxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLElBQUksQ0FBQyxDQUFDO0FBQ25HLENBQUMsQ0FBQztBQUVGLEtBQUssUUFBUSxFQUFJLEtBQUcsQ0FBQztBQUVvZzZFIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4xXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRfaXNBcnJheTtcblxuICAgIGlmICghQXJyYXkuaXNBcnJheSkge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRpc0FycmF5ID0gJCR1dGlscyQkX2lzQXJyYXk7XG4gICAgdmFyICQkdXRpbHMkJG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG4gICAgZnVuY3Rpb24gJCR1dGlscyQkRigpIHsgfVxuXG4gICAgdmFyICQkdXRpbHMkJG9fY3JlYXRlID0gKE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY29uZCBhcmd1bWVudCBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICAkJHV0aWxzJCRGLnByb3RvdHlwZSA9IG87XG4gICAgICByZXR1cm4gbmV3ICQkdXRpbHMkJEYoKTtcbiAgICB9KTtcblxuICAgIHZhciAkJGFzYXAkJGxlbiA9IDA7XG5cbiAgICB2YXIgJCRhc2FwJCRkZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuXSA9IGNhbGxiYWNrO1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgJCRhc2FwJCRsZW4gKz0gMjtcbiAgICAgIGlmICgkJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gICAgdmFyICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyICQkYXNhcCQkaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygkJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3ICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoJCRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gJCRhc2FwJCRmbHVzaDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dCgkJGFzYXAkJGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSAkJGFzYXAkJHF1ZXVlW2ldO1xuICAgICAgICB2YXIgYXJnID0gJCRhc2FwJCRxdWV1ZVtpKzFdO1xuXG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpKzFdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAkJGFzYXAkJGxlbiA9IDA7XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkc2NoZWR1bGVGbHVzaDtcblxuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkbm9vcCgpIHt9XG4gICAgdmFyICQkJGludGVybmFsJCRQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyICQkJGludGVybmFsJCRGVUxGSUxMRUQgPSAxO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVycm9yID0gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gICAgICBpZiAodGhlbmFibGUuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gJCQkaW50ZXJuYWwkJGdldFRoZW4obWF5YmVUaGVuYWJsZSk7XG5cbiAgICAgICAgaWYgKHRoZW4gPT09ICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSAkJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAvLyBub29wXG4gICAgICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJG1ha2VTZXR0bGVkUmVzdWx0KHN0YXRlLCBwb3NpdGlvbiwgdmFsdWUpIHtcbiAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAnZnVsZmlsbGVkJyxcbiAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdyZWplY3RlZCcsXG4gICAgICAgICAgcmVhc29uOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0LCBhYm9ydE9uUmVqZWN0LCBsYWJlbCkge1xuICAgICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICB0aGlzLl9hYm9ydE9uUmVqZWN0ID0gYWJvcnRPblJlamVjdDtcblxuICAgICAgaWYgKHRoaXMuX3ZhbGlkYXRlSW5wdXQoaW5wdXQpKSB7XG4gICAgICAgIHRoaXMuX2lucHV0ICAgICA9IGlucHV0O1xuICAgICAgICB0aGlzLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgICB0aGlzLl9pbml0KCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgICB0aGlzLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHRoaXMucHJvbWlzZSwgdGhpcy5fdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiAkJHV0aWxzJCRpc0FycmF5KGlucHV0KTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRpb25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgJCQkZW51bWVyYXRvciQkZGVmYXVsdCA9ICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3I7XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGVuZ3RoICA9IHRoaXMubGVuZ3RoO1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG4gICAgICB2YXIgaW5wdXQgICA9IHRoaXMuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICAgIGlmICgkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgZW50cnkuX29uZXJyb3IgPSBudWxsO1xuICAgICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChjLnJlc29sdmUoZW50cnkpLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgZW50cnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcblxuICAgICAgICBpZiAodGhpcy5fYWJvcnRPblJlamVjdCAmJiBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdChzdGF0ZSwgaSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX21ha2VSZXN1bHQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFsbChlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgcmV0dXJuIG5ldyAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0KHRoaXMsIGVudHJpZXMsIHRydWUgLyogYWJvcnQgb24gcmVqZWN0ICovLCBsYWJlbCkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmFjZShlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG5cbiAgICAgIGlmICghJCR1dGlscyQkaXNBcnJheShlbnRyaWVzKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbG1lbnQodmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVzb2x2ZShvYmplY3QsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVqZWN0KHJlYXNvbiwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyID0gMDtcblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0ID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlO1xuXG4gICAgLyoqXG4gICAgICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gICAgICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICAgICAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2XigJlzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICB0aGlzLl9pZCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlcisrO1xuICAgICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgICBpZiAoJCQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gJCRwcm9taXNlJGFsbCQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9ICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZXNvbHZlID0gJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9ICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQ7XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBzdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQgJiYgIW9uUmVqZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJlbnQuX3Jlc3VsdDtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbc3RhdGUgLSAxXTtcbiAgICAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSxcblxuICAgIC8qKlxuICAgICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmNocm9ub3VzXG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQXV0aG9yKCk7XG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfVxuXG4gICAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgY2F0Y2hcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQpIHtcbiAgICAgICAgbG9jYWwgPSB3aW5kb3c7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHZhciBlczZQcm9taXNlU3VwcG9ydCA9XG4gICAgICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgICAgIC8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgbWlzc2luZyBmcm9tXG4gICAgICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJlamVjdFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgLy8gT2xkZXIgdmVyc2lvbiBvZiB0aGUgc3BlYyBoYWQgYSByZXNvbHZlciBvYmplY3RcbiAgICAgICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZTtcbiAgICAgICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgICAgICByZXR1cm4gJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgICAgICBsb2NhbC5Qcm9taXNlID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0O1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlID0ge1xuICAgICAgJ1Byb21pc2UnOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzWydFUzZQcm9taXNlJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxufSkuY2FsbCh0aGlzKTsiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMjAxNC0xMi0xN1xuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IFgxMS9NSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBc1xuICAvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG4gIHx8ICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYi5iaW5kKG5hdmlnYXRvcikpXG4gIC8vIEV2ZXJ5b25lIGVsc2VcbiAgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG5cdCAgICAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBkb2MuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcblx0XHRcdGV2ZW50LmluaXRNb3VzZUV2ZW50KFxuXHRcdFx0XHRcImNsaWNrXCIsIHRydWUsIGZhbHNlLCB2aWV3LCAwLCAwLCAwLCAwLCAwXG5cdFx0XHRcdCwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIG51bGxcblx0XHRcdCk7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIHdlYmtpdF9yZXFfZnMgPSB2aWV3LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtXG5cdFx0LCByZXFfZnMgPSB2aWV3LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdlYmtpdF9yZXFfZnMgfHwgdmlldy5tb3pSZXF1ZXN0RmlsZVN5c3RlbVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdCwgZnNfbWluX3NpemUgPSAwXG5cdFx0Ly8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zNzUyOTcjYzcgYW5kXG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2NvbW1pdC80ODU5MzBhI2NvbW1pdGNvbW1lbnQtODc2ODA0N1xuXHRcdC8vIGZvciB0aGUgcmVhc29uaW5nIGJlaGluZCB0aGUgdGltZW91dCBhbmQgcmV2b2NhdGlvbiBmbG93XG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSA1MDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRpZiAodmlldy5jaHJvbWUpIHtcblx0XHRcdFx0cmV2b2tlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUpIHtcblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGJsb2JfY2hhbmdlZCA9IGZhbHNlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIHRhcmdldF92aWV3XG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKGJsb2JfY2hhbmdlZCB8fCAhb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0YXJnZXRfdmlldykge1xuXHRcdFx0XHRcdFx0dGFyZ2V0X3ZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBuZXdfdGFiID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKG5ld190YWIgPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBzYWZhcmkgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0XHRcdFx0Ly9BcHBsZSBkbyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwOi8vYml0Lmx5LzFrWmZmUklcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGFib3J0YWJsZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoZmlsZXNhdmVyLnJlYWR5U3RhdGUgIT09IGZpbGVzYXZlci5ET05FKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGNyZWF0ZV9pZl9ub3RfZm91bmQgPSB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfVxuXHRcdFx0XHQsIHNsaWNlXG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0aWYgKCFuYW1lKSB7XG5cdFx0XHRcdG5hbWUgPSBcImRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gT2JqZWN0IGFuZCB3ZWIgZmlsZXN5c3RlbSBVUkxzIGhhdmUgYSBwcm9ibGVtIHNhdmluZyBpbiBHb29nbGUgQ2hyb21lIHdoZW5cblx0XHRcdC8vIHZpZXdlZCBpbiBhIHRhYiwgc28gSSBmb3JjZSBzYXZlIHdpdGggYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXG5cdFx0XHQvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD05MTE1OFxuXHRcdFx0Ly8gVXBkYXRlOiBHb29nbGUgZXJyYW50bHkgY2xvc2VkIDkxMTU4LCBJIHN1Ym1pdHRlZCBpdCBhZ2Fpbjpcblx0XHRcdC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zODk2NDJcblx0XHRcdGlmICh2aWV3LmNocm9tZSAmJiB0eXBlICYmIHR5cGUgIT09IGZvcmNlX3NhdmVhYmxlX3R5cGUpIHtcblx0XHRcdFx0c2xpY2UgPSBibG9iLnNsaWNlIHx8IGJsb2Iud2Via2l0U2xpY2U7XG5cdFx0XHRcdGJsb2IgPSBzbGljZS5jYWxsKGJsb2IsIDAsIGJsb2Iuc2l6ZSwgZm9yY2Vfc2F2ZWFibGVfdHlwZSk7XG5cdFx0XHRcdGJsb2JfY2hhbmdlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHQvLyBTaW5jZSBJIGNhbid0IGJlIHN1cmUgdGhhdCB0aGUgZ3Vlc3NlZCBtZWRpYSB0eXBlIHdpbGwgdHJpZ2dlciBhIGRvd25sb2FkXG5cdFx0XHQvLyBpbiBXZWJLaXQsIEkgYXBwZW5kIC5kb3dubG9hZCB0byB0aGUgZmlsZW5hbWUuXG5cdFx0XHQvLyBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjU0NDBcblx0XHRcdGlmICh3ZWJraXRfcmVxX2ZzICYmIG5hbWUgIT09IFwiZG93bmxvYWRcIikge1xuXHRcdFx0XHRuYW1lICs9IFwiLmRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZSB8fCB3ZWJraXRfcmVxX2ZzKSB7XG5cdFx0XHRcdHRhcmdldF92aWV3ID0gdmlldztcblx0XHRcdH1cblx0XHRcdGlmICghcmVxX2ZzKSB7XG5cdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGZzX21pbl9zaXplICs9IGJsb2Iuc2l6ZTtcblx0XHRcdHJlcV9mcyh2aWV3LlRFTVBPUkFSWSwgZnNfbWluX3NpemUsIGFib3J0YWJsZShmdW5jdGlvbihmcykge1xuXHRcdFx0XHRmcy5yb290LmdldERpcmVjdG9yeShcInNhdmVkXCIsIGNyZWF0ZV9pZl9ub3RfZm91bmQsIGFib3J0YWJsZShmdW5jdGlvbihkaXIpIHtcblx0XHRcdFx0XHR2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZGlyLmdldEZpbGUobmFtZSwgY3JlYXRlX2lmX25vdF9mb3VuZCwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0ZmlsZS5jcmVhdGVXcml0ZXIoYWJvcnRhYmxlKGZ1bmN0aW9uKHdyaXRlcikge1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldF92aWV3LmxvY2F0aW9uLmhyZWYgPSBmaWxlLnRvVVJMKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlZW5kXCIsIGV2ZW50KTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldm9rZShmaWxlKTtcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgZXJyb3IgPSB3cml0ZXIuZXJyb3I7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZXJyb3IuY29kZSAhPT0gZXJyb3IuQUJPUlRfRVJSKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgYWJvcnRcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyW1wib25cIiArIGV2ZW50XSA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF07XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLndyaXRlKGJsb2IpO1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyLmFib3J0KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuV1JJVElORztcblx0XHRcdFx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdFx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRkaXIuZ2V0RmlsZShuYW1lLCB7Y3JlYXRlOiBmYWxzZX0sIGFib3J0YWJsZShmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRcdFx0XHQvLyBkZWxldGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0c1xuXHRcdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdHNhdmUoKTtcblx0XHRcdFx0XHR9KSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXguY29kZSA9PT0gZXguTk9UX0ZPVU5EX0VSUikge1xuXHRcdFx0XHRcdFx0XHRzYXZlKCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmc19lcnJvcigpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lKTtcblx0XHR9XG5cdDtcblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgZmlsZXNhdmVyID0gdGhpcztcblx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJhYm9ydFwiKTtcblx0fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPSBudWxsKSkge1xuICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZScpO1xudmFyIHNhdmVBcyA9IHJlcXVpcmUoJ2ZpbGVzYXZlci5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgIHZhciBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KHNjZW5hcmlvLCBudWxsLCBcIiBcIildLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pO1xuICAgc2F2ZUFzKGJsb2IsIHNjZW5hcmlvLm5hbWUgKyBcIi5qc29uXCIpO1xufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lJc0luTnZkWEpqWlhNaU9sc2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFTeEpRVUZKTEVsQlFVa3NSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UVVGRE9VSXNTVUZCU1N4TlFVRk5MRWRCUVVjc1QwRkJUeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZET3p0QlFVVnlReXhOUVVGTkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eFZRVUZWTEZGQlFWRXNSVUZCUlR0SFFVTXpSQ3hKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zU1VGQlNTeEZRVUZGTERCQ1FVRXdRaXhEUVVGRExFTkJRVU1zUTBGQlF6dEhRVU12Uml4TlFVRk5MRU5CUVVNc1NVRkJTU3hGUVVGRkxGRkJRVkVzUTBGQlF5eEpRVUZKTEVkQlFVY3NUMEZCVHl4RFFVRkRMRU5CUVVNN1EwRkRlRU1zUTBGQlF5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCMWRHMWxJRDBnY21WeGRXbHlaU2duTGk0dmRYUnRaU2NwTzF4dWRtRnlJSE5oZG1WQmN5QTlJSEpsY1hWcGNtVW9KMlpwYkdWellYWmxjaTVxY3ljcE8xeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSFYwYldVdWNtVm5hWE4wWlhKVFlYWmxTR0Z1Wkd4bGNpaG1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lIWmhjaUJpYkc5aUlEMGdibVYzSUVKc2IySW9XMHBUVDA0dWMzUnlhVzVuYVdaNUtITmpaVzVoY21sdkxDQnVkV3hzTENCY0lpQmNJaWxkTENCN2RIbHdaVG9nWENKMFpYaDBMM0JzWVdsdU8yTm9ZWEp6WlhROWRYUm1MVGhjSW4wcE8xeHVJQ0FnYzJGMlpVRnpLR0pzYjJJc0lITmpaVzVoY21sdkxtNWhiV1VnS3lCY0lpNXFjMjl1WENJcE8xeHVmU2s3SWwxOSIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZS5qcycpO1xuXG5mdW5jdGlvbiBnZXRCYXNlVVJMICgpIHtcbiAgcmV0dXJuIHV0bWUuc3RhdGUgJiYgdXRtZS5zdGF0ZS50ZXN0U2VydmVyID8gdXRtZS5zdGF0ZS50ZXN0U2VydmVyIDogZ2V0UGFyYW1ldGVyQnlOYW1lKFwidXRtZV90ZXN0X3NlcnZlclwiKSB8fCBcImh0dHA6Ly8wLjAuMC4wOjkwNDMvXCI7XG59XG5cbnZhciBzZXJ2ZXJSZXBvcnRlciA9IHtcbiAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJlcnJvclwiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogZXJyb3IgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh1dG1lLnNldHRpbmdzLmdldChcImNvbnNvbGVMb2dnaW5nXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChzdWNjZXNzLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJzdWNjZXNzXCIsXG4gICAgICAgICAgZGF0YTogeyBkYXRhOiBzdWNjZXNzIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodXRtZS5zZXR0aW5ncy5nZXQoXCJjb25zb2xlTG9nZ2luZ1wiKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKHN1Y2Nlc3MpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBsb2c6IGZ1bmN0aW9uIChsb2csIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiAgZ2V0QmFzZVVSTCgpICsgXCJsb2dcIixcbiAgICAgICAgICBkYXRhOiB7IGRhdGE6IGxvZyB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHV0bWUuc2V0dGluZ3MuZ2V0KFwiY29uc29sZUxvZ2dpbmdcIikpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhsb2cpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxvYWRTY2VuYXJpbzogZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICBqc29ucDogXCJjYWxsYmFja1wiLFxuXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG5cbiAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxuXG4gICAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcInNjZW5hcmlvL1wiICsgbmFtZSxcblxuICAgICAgICAgICAgLy8gdGVsbCBqUXVlcnkgd2UncmUgZXhwZWN0aW5nIEpTT05QXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgc2F2ZVNjZW5hcmlvOiBmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6IGdldEJhc2VVUkwoKSArIFwic2NlbmFyaW9cIixcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShzY2VuYXJpbywgbnVsbCwgXCIgXCIpLFxuICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBsb2FkU2V0dGluZ3M6IGZ1bmN0aW9uIChjYWxsYmFjaywgZXJyb3IpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcInRleHQvcGxhbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXG4gICAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcInNldHRpbmdzXCIsXG4gICAgICAgICAgICAvLyB0ZWxsIGpRdWVyeSB3ZSdyZSBleHBlY3RpbmcgSlNPTlBcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcblxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbnV0bWUucmVnaXN0ZXJSZXBvcnRIYW5kbGVyKHNlcnZlclJlcG9ydGVyKTtcbnV0bWUucmVnaXN0ZXJMb2FkSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5sb2FkU2NlbmFyaW8pO1xudXRtZS5yZWdpc3RlclNhdmVIYW5kbGVyKHNlcnZlclJlcG9ydGVyLnNhdmVTY2VuYXJpbyk7XG51dG1lLnJlZ2lzdGVyU2V0dGluZ3NMb2FkSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5sb2FkU2V0dGluZ3MpO1xuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzSmxjRzl5ZEdWeWN5OXpaWEoyWlhJdGNtVndiM0owWlhJdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5b2IyMWxMMlJoZG1sa2RHbDBkSE4zYjNKMGFDOXdjbTlxWldOMGN5OTFkRzFsTDNOeVl5OXFjeTl5WlhCdmNuUmxjbk12YzJWeWRtVnlMWEpsY0c5eWRHVnlMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzU1VGQlNTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenM3UVVGRmFrTXNVMEZCVXl4VlFVRlZMRWxCUVVrN1JVRkRja0lzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVlVGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVsQlFVa3NjMEpCUVhOQ0xFTkJRVU03UVVGRGVFa3NRMEZCUXpzN1FVRkZSQ3hKUVVGSkxHTkJRV01zUjBGQlJ6dEpRVU5xUWl4TFFVRkxMRVZCUVVVc1ZVRkJWU3hMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlR0UlFVTndReXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETzFWQlEwd3NTVUZCU1N4RlFVRkZMRTFCUVUwN1ZVRkRXaXhIUVVGSExFVkJRVVVzVlVGQlZTeEZRVUZGTEVkQlFVY3NUMEZCVHp0VlFVTXpRaXhKUVVGSkxFVkJRVVVzUlVGQlJTeEpRVUZKTEVWQlFVVXNTMEZCU3l4RlFVRkZPMVZCUTNKQ0xGRkJRVkVzUlVGQlJTeE5RVUZOTzFOQlEycENMRU5CUVVNc1EwRkJRenRSUVVOSUxFbEJRVWtzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNSVUZCUlR0VlFVTjJReXhQUVVGUExFTkJRVU1zUzBGQlN5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMU5CUTNSQ08wdEJRMG83U1VGRFJDeFBRVUZQTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJUdFJRVU40UXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRE8xVkJRMHdzU1VGQlNTeEZRVUZGTEUxQlFVMDdWVUZEV2l4SFFVRkhMRVZCUVVVc1ZVRkJWU3hGUVVGRkxFZEJRVWNzVTBGQlV6dFZRVU0zUWl4SlFVRkpMRVZCUVVVc1JVRkJSU3hKUVVGSkxFVkJRVVVzVDBGQlR5eEZRVUZGTzFWQlEzWkNMRkZCUVZFc1JVRkJSU3hOUVVGTk8xTkJRMnBDTEVOQlFVTXNRMEZCUXp0UlFVTklMRWxCUVVrc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zUlVGQlJUdFZRVU4yUXl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzFOQlEzUkNPMHRCUTBvN1NVRkRSQ3hIUVVGSExFVkJRVVVzVlVGQlZTeEhRVUZITEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSVHRSUVVOb1F5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRPMVZCUTB3c1NVRkJTU3hGUVVGRkxFMUJRVTA3VlVGRFdpeEhRVUZITEVkQlFVY3NWVUZCVlN4RlFVRkZMRWRCUVVjc1MwRkJTenRWUVVNeFFpeEpRVUZKTEVWQlFVVXNSVUZCUlN4SlFVRkpMRVZCUVVVc1IwRkJSeXhGUVVGRk8xVkJRMjVDTEZGQlFWRXNSVUZCUlN4TlFVRk5PMU5CUTJwQ0xFTkJRVU1zUTBGQlF6dFJRVU5JTEVsQlFVa3NTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1JVRkJSVHRWUVVOMlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8xTkJRMnhDTzBGQlExUXNTMEZCU3pzN1NVRkZSQ3haUVVGWkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVXNVVUZCVVN4RlFVRkZPMUZCUTNCRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTTdRVUZEWml4WlFVRlpMRXRCUVVzc1JVRkJSU3hWUVVGVk96dEJRVVUzUWl4WlFVRlpMRmRCUVZjc1JVRkJSU3hwUTBGQmFVTTdPMEZCUlRGRUxGbEJRVmtzVjBGQlZ5eEZRVUZGTEVsQlFVazdPMEZCUlRkQ0xGbEJRVmtzUjBGQlJ5eEhRVUZITEZWQlFWVXNSVUZCUlN4SFFVRkhMRmRCUVZjc1IwRkJSeXhKUVVGSk8wRkJRMjVFT3p0QlFVVkJMRmxCUVZrc1VVRkJVU3hGUVVGRkxFOUJRVTg3TzFsQlJXcENMRTlCUVU4c1JVRkJSU3hWUVVGVkxFbEJRVWtzUlVGQlJUdG5Ra0ZEY2tJc1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzJGQlEyeENPMU5CUTBvc1EwRkJReXhEUVVGRE8wRkJRMWdzUzBGQlN6czdTVUZGUkN4WlFVRlpMRVZCUVVVc1ZVRkJWU3hSUVVGUkxFVkJRVVU3VVVGRE9VSXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRWUVVOTUxFbEJRVWtzUlVGQlJTeE5RVUZOTzFWQlExb3NSMEZCUnl4RlFVRkZMRlZCUVZVc1JVRkJSU3hIUVVGSExGVkJRVlU3VlVGRE9VSXNTVUZCU1N4RlFVRkZMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNN1ZVRkRla01zVVVGQlVTeEZRVUZGTEUxQlFVMDdWVUZEYUVJc1YwRkJWeXhGUVVGRkxHdENRVUZyUWp0VFFVTm9ReXhEUVVGRExFTkJRVU03UVVGRFdDeExRVUZMT3p0SlFVVkVMRmxCUVZrc1JVRkJSU3hWUVVGVkxGRkJRVkVzUlVGQlJTeExRVUZMTEVWQlFVVTdVVUZEY2tNc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF6dFpRVU5JTEZkQlFWY3NSVUZCUlN3d1FrRkJNRUk3V1VGRGRrTXNWMEZCVnl4RlFVRkZMRWxCUVVrN1FVRkROMElzV1VGQldTeEhRVUZITEVkQlFVY3NWVUZCVlN4RlFVRkZMRWRCUVVjc1ZVRkJWVHM3UVVGRk0wTXNXVUZCV1N4UlFVRlJMRVZCUVVVc1RVRkJUVHM3V1VGRmFFSXNUMEZCVHl4RlFVRkZMRlZCUVZVc1NVRkJTU3hGUVVGRk8yZENRVU55UWl4UlFVRlJMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03WVVGRGJFSTdXVUZEUkN4TFFVRkxMRVZCUVVVc1ZVRkJWU3hIUVVGSExFVkJRVVU3WjBKQlEyeENMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dGhRVU5rTzFOQlEwb3NRMEZCUXl4RFFVRkRPMHRCUTA0N1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNTVUZCU1N4RFFVRkRMSEZDUVVGeFFpeERRVUZETEdOQlFXTXNRMEZCUXl4RFFVRkRPMEZCUXpORExFbEJRVWtzUTBGQlF5eHRRa0ZCYlVJc1EwRkJReXhqUVVGakxFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdRVUZEZEVRc1NVRkJTU3hEUVVGRExHMUNRVUZ0UWl4RFFVRkRMR05CUVdNc1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6dEJRVU4wUkN4SlFVRkpMRU5CUVVNc01rSkJRVEpDTEVOQlFVTXNZMEZCWXl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE96dEJRVVU1UkN4VFFVRlRMR3RDUVVGclFpeERRVUZETEVsQlFVa3NSVUZCUlR0SlFVTTVRaXhKUVVGSkxFZEJRVWNzU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenRKUVVNeFJDeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRTFCUVUwc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZkQlFWY3NRMEZCUXp0UlFVTnFSQ3hQUVVGUExFZEJRVWNzUzBGQlN5eERRVUZETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU03U1VGRE1VTXNUMEZCVHl4UFFVRlBMRXRCUVVzc1NVRkJTU3hIUVVGSExFVkJRVVVzUjBGQlJ5eHJRa0ZCYTBJc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF5eERRVUZESWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaWRtRnlJSFYwYldVZ1BTQnlaWEYxYVhKbEtDY3VMaTkxZEcxbExtcHpKeWs3WEc1Y2JtWjFibU4wYVc5dUlHZGxkRUpoYzJWVlVrd2dLQ2tnZTF4dUlDQnlaWFIxY200Z2RYUnRaUzV6ZEdGMFpTQW1KaUIxZEcxbExuTjBZWFJsTG5SbGMzUlRaWEoyWlhJZ1B5QjFkRzFsTG5OMFlYUmxMblJsYzNSVFpYSjJaWElnT2lCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb1hDSjFkRzFsWDNSbGMzUmZjMlZ5ZG1WeVhDSXBJSHg4SUZ3aWFIUjBjRG92THpBdU1DNHdMakE2T1RBME15OWNJanRjYm4xY2JseHVkbUZ5SUhObGNuWmxjbEpsY0c5eWRHVnlJRDBnZTF4dUlDQWdJR1Z5Y205eU9pQm1kVzVqZEdsdmJpQW9aWEp5YjNJc0lITmpaVzVoY21sdkxDQjFkRzFsS1NCN1hHNGdJQ0FnSUNBZ0lDUXVZV3BoZUNoN1hHNGdJQ0FnSUNBZ0lDQWdkSGx3WlRvZ1hDSlFUMU5VWENJc1hHNGdJQ0FnSUNBZ0lDQWdkWEpzT2lCblpYUkNZWE5sVlZKTUtDa2dLeUJjSW1WeWNtOXlYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVG9nZXlCa1lYUmhPaUJsY25KdmNpQjlMRnh1SUNBZ0lDQWdJQ0FnSUdSaGRHRlVlWEJsT2lCY0ltcHpiMjVjSWx4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVXVjMlYwZEdsdVozTXVaMlYwS0Z3aVkyOXVjMjlzWlV4dloyZHBibWRjSWlrcElIdGNiaUFnSUNBZ0lDQWdJQ0JqYjI1emIyeGxMbVZ5Y205eUtHVnljbTl5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnYzNWalkyVnpjem9nWm5WdVkzUnBiMjRnS0hOMVkyTmxjM01zSUhOalpXNWhjbWx2TENCMWRHMWxLU0I3WEc0Z0lDQWdJQ0FnSUNRdVlXcGhlQ2g3WEc0Z0lDQWdJQ0FnSUNBZ2RIbHdaVG9nWENKUVQxTlVYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ2RYSnNPaUJuWlhSQ1lYTmxWVkpNS0NrZ0t5QmNJbk4xWTJObGMzTmNJaXhjYmlBZ0lDQWdJQ0FnSUNCa1lYUmhPaUI3SUdSaGRHRTZJSE4xWTJObGMzTWdmU3hjYmlBZ0lDQWdJQ0FnSUNCa1lYUmhWSGx3WlRvZ1hDSnFjMjl1WENKY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJR2xtSUNoMWRHMWxMbk5sZEhScGJtZHpMbWRsZENoY0ltTnZibk52YkdWTWIyZG5hVzVuWENJcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnWTI5dWMyOXNaUzVzYjJjb2MzVmpZMlZ6Y3lrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUd4dlp6b2dablZ1WTNScGIyNGdLR3h2Wnl3Z2MyTmxibUZ5YVc4c0lIVjBiV1VwSUh0Y2JpQWdJQ0FnSUNBZ0pDNWhhbUY0S0h0Y2JpQWdJQ0FnSUNBZ0lDQjBlWEJsT2lCY0lsQlBVMVJjSWl4Y2JpQWdJQ0FnSUNBZ0lDQjFjbXc2SUNCblpYUkNZWE5sVlZKTUtDa2dLeUJjSW14dloxd2lMRnh1SUNBZ0lDQWdJQ0FnSUdSaGRHRTZJSHNnWkdGMFlUb2diRzluSUgwc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJRndpYW5OdmJsd2lYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlM1elpYUjBhVzVuY3k1blpYUW9YQ0pqYjI1emIyeGxURzluWjJsdVoxd2lLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHTnZibk52YkdVdWJHOW5LR3h2WnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JHOWhaRk5qWlc1aGNtbHZPaUJtZFc1amRHbHZiaUFvYm1GdFpTd2dZMkZzYkdKaFkyc3BJSHRjYmlBZ0lDQWdJQ0FnSkM1aGFtRjRLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHcHpiMjV3T2lCY0ltTmhiR3hpWVdOclhDSXNYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZiblJsYm5SVWVYQmxPaUJjSW1Gd2NHeHBZMkYwYVc5dUwycHpiMjQ3SUdOb1lYSnpaWFE5ZFhSbUxUaGNJaXhjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdZM0p2YzNORWIyMWhhVzQ2SUhSeWRXVXNYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lIVnliRG9nSUdkbGRFSmhjMlZWVWt3b0tTQXJJRndpYzJObGJtRnlhVzh2WENJZ0t5QnVZVzFsTEZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCMFpXeHNJR3BSZFdWeWVTQjNaU2R5WlNCbGVIQmxZM1JwYm1jZ1NsTlBUbEJjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmhkR0ZVZVhCbE9pQmNJbXB6YjI1d1hDSXNYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lITjFZMk5sYzNNNklHWjFibU4wYVc5dUlDaHlaWE53S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyRnNiR0poWTJzb2NtVnpjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J6WVhabFUyTmxibUZ5YVc4NklHWjFibU4wYVc5dUlDaHpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0FrTG1GcVlYZ29lMXh1SUNBZ0lDQWdJQ0FnSUhSNWNHVTZJRndpVUU5VFZGd2lMRnh1SUNBZ0lDQWdJQ0FnSUhWeWJEb2daMlYwUW1GelpWVlNUQ2dwSUNzZ1hDSnpZMlZ1WVhKcGIxd2lMRnh1SUNBZ0lDQWdJQ0FnSUdSaGRHRTZJRXBUVDA0dWMzUnlhVzVuYVdaNUtITmpaVzVoY21sdkxDQnVkV3hzTENCY0lpQmNJaWtzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVlI1Y0dVNklDZHFjMjl1Snl4Y2JpQWdJQ0FnSUNBZ0lDQmpiMjUwWlc1MFZIbHdaVG9nWENKaGNIQnNhV05oZEdsdmJpOXFjMjl1WENKY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lHeHZZV1JUWlhSMGFXNW5jem9nWm5WdVkzUnBiMjRnS0dOaGJHeGlZV05yTENCbGNuSnZjaWtnZTF4dUlDQWdJQ0FnSUNBa0xtRnFZWGdvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1ZEdWdWRGUjVjR1U2SUZ3aWRHVjRkQzl3YkdGdU95QmphR0Z5YzJWMFBYVjBaaTA0WENJc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqY205emMwUnZiV0ZwYmpvZ2RISjFaU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lIVnliRG9nSUdkbGRFSmhjMlZWVWt3b0tTQXJJRndpYzJWMGRHbHVaM05jSWl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhSbGJHd2dhbEYxWlhKNUlIZGxKM0psSUdWNGNHVmpkR2x1WnlCS1UwOU9VRnh1SUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVlI1Y0dVNklGd2lhbk52Ymx3aUxGeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCemRXTmpaWE56T2lCbWRXNWpkR2x2YmlBb2NtVnpjQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOaGJHeGlZV05yS0hKbGMzQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTeGNiaUFnSUNBZ0lDQWdJQ0FnSUdWeWNtOXlPaUJtZFc1amRHbHZiaUFvWlhKeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaWEp5YjNJb1pYSnlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1ZlR0Y2JseHVkWFJ0WlM1eVpXZHBjM1JsY2xKbGNHOXlkRWhoYm1Sc1pYSW9jMlZ5ZG1WeVVtVndiM0owWlhJcE8xeHVkWFJ0WlM1eVpXZHBjM1JsY2t4dllXUklZVzVrYkdWeUtITmxjblpsY2xKbGNHOXlkR1Z5TG14dllXUlRZMlZ1WVhKcGJ5azdYRzUxZEcxbExuSmxaMmx6ZEdWeVUyRjJaVWhoYm1Sc1pYSW9jMlZ5ZG1WeVVtVndiM0owWlhJdWMyRjJaVk5qWlc1aGNtbHZLVHRjYm5WMGJXVXVjbVZuYVhOMFpYSlRaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnlLSE5sY25abGNsSmxjRzl5ZEdWeUxteHZZV1JUWlhSMGFXNW5jeWs3WEc1Y2JtWjFibU4wYVc5dUlHZGxkRkJoY21GdFpYUmxja0o1VG1GdFpTaHVZVzFsS1NCN1hHNGdJQ0FnYm1GdFpTQTlJRzVoYldVdWNtVndiR0ZqWlNndlcxeGNXMTB2TENCY0lseGNYRnhiWENJcExuSmxjR3hoWTJVb0wxdGNYRjFkTHl3Z1hDSmNYRnhjWFZ3aUtUdGNiaUFnSUNCMllYSWdjbVZuWlhnZ1BTQnVaWGNnVW1WblJYaHdLRndpVzF4Y1hGdy9KbDFjSWlBcklHNWhiV1VnS3lCY0lqMG9XMTRtSTEwcUtWd2lLU3hjYmlBZ0lDQWdJQ0FnY21WemRXeDBjeUE5SUhKbFoyVjRMbVY0WldNb2JHOWpZWFJwYjI0dWMyVmhjbU5vS1R0Y2JpQWdJQ0J5WlhSMWNtNGdjbVZ6ZFd4MGN5QTlQVDBnYm5Wc2JDQS9JRndpWENJZ09pQmtaV052WkdWVlVrbERiMjF3YjI1bGJuUW9jbVZ6ZFd4MGMxc3hYUzV5WlhCc1lXTmxLQzljWENzdlp5d2dYQ0lnWENJcEtUdGNibjBpWFgwPSIsIlxuXG4vKipcbiogR2VuZXJhdGUgdW5pcXVlIENTUyBzZWxlY3RvciBmb3IgZ2l2ZW4gRE9NIGVsZW1lbnRcbipcbiogQHBhcmFtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtTdHJpbmd9XG4qIEBhcGkgcHJpdmF0ZVxuKi9cblxuZnVuY3Rpb24gdW5pcXVlKGVsLCBkb2MpIHtcbiAgaWYgKCFlbCB8fCAhZWwudGFnTmFtZSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0VsZW1lbnQgZXhwZWN0ZWQnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRTZWxlY3RvckluZGV4KGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gICAgICB2YXIgZXhpc3RpbmdJbmRleCA9IDA7XG4gICAgICB2YXIgaXRlbXMgPSAgZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGl0ZW1zW2ldID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICAgIGV4aXN0aW5nSW5kZXggPSBpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpc3RpbmdJbmRleDtcbiAgfVxuXG4gIHZhciBlbFNlbGVjdG9yID0gZ2V0RWxlbWVudFNlbGVjdG9yKGVsKS5zZWxlY3RvcjtcbiAgdmFyIGlzU2ltcGxlU2VsZWN0b3IgPSBlbFNlbGVjdG9yID09PSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gIHZhciBhbmNlc3RvclNlbGVjdG9yO1xuXG4gIHZhciBjdXJyRWxlbWVudCA9IGVsO1xuICB3aGlsZSAoY3VyckVsZW1lbnQucGFyZW50RWxlbWVudCAhPSBudWxsICYmICFhbmNlc3RvclNlbGVjdG9yKSB7XG4gICAgICBjdXJyRWxlbWVudCA9IGN1cnJFbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBnZXRFbGVtZW50U2VsZWN0b3IoY3VyckVsZW1lbnQpLnNlbGVjdG9yO1xuXG4gICAgICAvLyBUeXBpY2FsbHkgZWxlbWVudHMgdGhhdCBoYXZlIGEgY2xhc3MgbmFtZSBvciB0aXRsZSwgdGhvc2UgYXJlIGxlc3MgbGlrZWx5XG4gICAgICAvLyB0byBjaGFuZ2UsIGFuZCBhbHNvIGJlIHVuaXF1ZS4gIFNvLCB3ZSBhcmUgdHJ5aW5nIHRvIGZpbmQgYW4gYW5jZXN0b3JcbiAgICAgIC8vIHRvIGFuY2hvciAob3Igc2NvcGUpIHRoZSBzZWFyY2ggZm9yIHRoZSBlbGVtZW50LCBhbmQgbWFrZSBpdCBsZXNzIGJyaXR0bGUuXG4gICAgICBpZiAoc2VsZWN0b3IgIT09IGN1cnJFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgIGFuY2VzdG9yU2VsZWN0b3IgPSBzZWxlY3RvciArIChjdXJyRWxlbWVudCA9PT0gZWwucGFyZW50RWxlbWVudCAmJiBpc1NpbXBsZVNlbGVjdG9yID8gXCIgPiBcIiA6IFwiIFwiKSArIGVsU2VsZWN0b3I7XG4gICAgICB9XG4gIH1cblxuICB2YXIgZmluYWxTZWxlY3RvcnMgPSBbXTtcbiAgaWYgKGFuY2VzdG9yU2VsZWN0b3IpIHtcbiAgICBmaW5hbFNlbGVjdG9ycy5wdXNoKFxuICAgICAgYW5jZXN0b3JTZWxlY3RvciArIFwiOmVxKFwiICsgX2dldFNlbGVjdG9ySW5kZXgoZWwsIGFuY2VzdG9yU2VsZWN0b3IpICsgXCIpXCJcbiAgICApO1xuICB9XG5cbiAgZmluYWxTZWxlY3RvcnMucHVzaChlbFNlbGVjdG9yICsgXCI6ZXEoXCIgKyBfZ2V0U2VsZWN0b3JJbmRleChlbCwgZWxTZWxlY3RvcikgKyBcIilcIik7XG4gIHJldHVybiBmaW5hbFNlbGVjdG9ycztcbn07XG5cbi8qKlxuKiBHZXQgY2xhc3MgbmFtZXMgZm9yIGFuIGVsZW1lbnRcbipcbiogQHBhcmFybSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7QXJyYXl9XG4qL1xuXG5mdW5jdGlvbiBnZXRDbGFzc05hbWVzKGVsKSB7XG4gIHZhciBjbGFzc05hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSAmJiBjbGFzc05hbWUucmVwbGFjZSgndXRtZS12ZXJpZnknLCAnJyk7XG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSAmJiBjbGFzc05hbWUucmVwbGFjZSgndXRtZS1yZWFkeScsICcnKTtcblxuICBpZiAoIWNsYXNzTmFtZSB8fCAoIWNsYXNzTmFtZS50cmltKCkubGVuZ3RoKSkgeyByZXR1cm4gW107IH1cblxuICAvLyByZW1vdmUgZHVwbGljYXRlIHdoaXRlc3BhY2VcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnJlcGxhY2UoL1xccysvZywgJyAnKTtcblxuICAvLyB0cmltIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2VcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcblxuICAvLyBzcGxpdCBpbnRvIHNlcGFyYXRlIGNsYXNzbmFtZXNcbiAgcmV0dXJuIGNsYXNzTmFtZS50cmltKCkuc3BsaXQoJyAnKTtcbn1cblxuLyoqXG4qIENTUyBzZWxlY3RvcnMgdG8gZ2VuZXJhdGUgdW5pcXVlIHNlbGVjdG9yIGZvciBET00gZWxlbWVudFxuKlxuKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge0FycmF5fVxuKiBAYXBpIHBydmlhdGVcbiovXG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRTZWxlY3RvcihlbCwgaXNVbmlxdWUpIHtcbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBsYWJlbCA9IG51bGw7XG4gIHZhciB0aXRsZSA9IG51bGw7XG4gIHZhciBhbHQgICA9IG51bGw7XG4gIHZhciBuYW1lICA9IG51bGw7XG4gIHZhciB2YWx1ZSA9IG51bGw7XG4gIHZhciBtZSA9IGVsO1xuXG4gIC8vIGRvIHtcblxuICAvLyBJRHMgYXJlIHVuaXF1ZSBlbm91Z2hcbiAgaWYgKGVsLmlkKSB7XG4gICAgbGFiZWwgPSAnW2lkPVxcJycgKyBlbC5pZCArIFwiXFwnXVwiO1xuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSwgdXNlIHRhZyBuYW1lXG4gICAgbGFiZWwgICAgID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgdmFyIGNsYXNzTmFtZXMgPSBnZXRDbGFzc05hbWVzKGVsKTtcblxuICAgIC8vIFRhZyBuYW1lcyBjb3VsZCB1c2UgY2xhc3NlcyBmb3Igc3BlY2lmaWNpdHlcbiAgICBpZiAoY2xhc3NOYW1lcy5sZW5ndGgpIHtcbiAgICAgIGxhYmVsICs9ICcuJyArIGNsYXNzTmFtZXMuam9pbignLicpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRpdGxlcyAmIEFsdCBhdHRyaWJ1dGVzIGFyZSB2ZXJ5IHVzZWZ1bCBmb3Igc3BlY2lmaWNpdHkgYW5kIHRyYWNraW5nXG4gIGlmICh0aXRsZSA9IGVsLmdldEF0dHJpYnV0ZSgndGl0bGUnKSkge1xuICAgIGxhYmVsICs9ICdbdGl0bGU9XCInICsgdGl0bGUgKyAnXCJdJztcbiAgfSBlbHNlIGlmIChhbHQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2FsdCcpKSB7XG4gICAgbGFiZWwgKz0gJ1thbHQ9XCInICsgYWx0ICsgJ1wiXSc7XG4gIH0gZWxzZSBpZiAobmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpKSB7XG4gICAgbGFiZWwgKz0gJ1tuYW1lPVwiJyArIG5hbWUgKyAnXCJdJztcbiAgfVxuXG4gIGlmICh2YWx1ZSA9IGVsLmdldEF0dHJpYnV0ZSgndmFsdWUnKSkge1xuICAgIGxhYmVsICs9ICdbdmFsdWU9XCInICsgdmFsdWUgKyAnXCJdJztcbiAgfVxuXG4gIC8vIGlmIChlbC5pbm5lclRleHQubGVuZ3RoICE9IDApIHtcbiAgLy8gICBsYWJlbCArPSAnOmNvbnRhaW5zKCcgKyBlbC5pbm5lclRleHQgKyAnKSc7XG4gIC8vIH1cblxuICBwYXJ0cy51bnNoaWZ0KHtcbiAgICBlbGVtZW50OiBlbCxcbiAgICBzZWxlY3RvcjogbGFiZWxcbiAgfSk7XG5cbiAgLy8gaWYgKGlzVW5pcXVlKHBhcnRzKSkge1xuICAvLyAgICAgYnJlYWs7XG4gIC8vIH1cblxuICAvLyB9IHdoaWxlICghZWwuaWQgJiYgKGVsID0gZWwucGFyZW50Tm9kZSkgJiYgZWwudGFnTmFtZSk7XG5cbiAgLy8gU29tZSBzZWxlY3RvcnMgc2hvdWxkIGhhdmUgbWF0Y2hlZCBhdCBsZWFzdFxuICBpZiAoIXBhcnRzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGlkZW50aWZ5IENTUyBzZWxlY3RvcicpO1xuICB9XG4gIHJldHVybiBwYXJ0c1swXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1bmlxdWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNObGJHVmpkRzl5Um1sdVpHVnlMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMyVnNaV04wYjNKR2FXNWtaWEl1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdPMEZCUlVFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVUZGUVN4RlFVRkZPenRCUVVWR0xGTkJRVk1zVFVGQlRTeERRVUZETEVWQlFVVXNSVUZCUlN4SFFVRkhMRVZCUVVVN1JVRkRka0lzU1VGQlNTeERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRVZCUVVVc1EwRkJReXhQUVVGUExFVkJRVVU3U1VGRGRFSXNUVUZCVFN4SlFVRkpMRk5CUVZNc1EwRkJReXhyUWtGQmEwSXNRMEZCUXl4RFFVRkRPMEZCUXpWRExFZEJRVWM3TzBWQlJVUXNVMEZCVXl4cFFrRkJhVUlzUTBGQlF5eFBRVUZQTEVWQlFVVXNVVUZCVVN4RlFVRkZPMDFCUXpGRExFbEJRVWtzWVVGQllTeEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTTFRaXhOUVVGTkxFbEJRVWtzUzBGQlN5eEpRVUZKTEVkQlFVY3NRMEZCUXl4blFrRkJaMElzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXpzN1RVRkZOVU1zUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1ZVRkRia01zU1VGQlNTeExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRMRXRCUVVzc1QwRkJUeXhGUVVGRk8yTkJRM1JDTEdGQlFXRXNSMEZCUnl4RFFVRkRMRU5CUVVNN1kwRkRiRUlzVFVGQlRUdFhRVU5VTzA5QlEwbzdUVUZEUkN4UFFVRlBMR0ZCUVdFc1EwRkJRenRCUVVNelFpeEhRVUZIT3p0RlFVVkVMRWxCUVVrc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkVzUTBGQlF6dEZRVU5xUkN4SlFVRkpMR2RDUVVGblFpeEhRVUZITEZWQlFWVXNTMEZCU3l4RlFVRkZMRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUlVGQlJTeERRVUZETzBGQlEycEZMRVZCUVVVc1NVRkJTU3huUWtGQlowSXNRMEZCUXpzN1JVRkZja0lzU1VGQlNTeFhRVUZYTEVkQlFVY3NSVUZCUlN4RFFVRkRPMFZCUTNKQ0xFOUJRVThzVjBGQlZ5eERRVUZETEdGQlFXRXNTVUZCU1N4SlFVRkpMRWxCUVVrc1EwRkJReXhuUWtGQlowSXNSVUZCUlR0TlFVTXpSQ3hYUVVGWExFZEJRVWNzVjBGQlZ5eERRVUZETEdGQlFXRXNRMEZCUXp0QlFVTTVReXhOUVVGTkxFbEJRVWtzVVVGQlVTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExGZEJRVmNzUTBGQlF5eERRVUZETEZGQlFWRXNRMEZCUXp0QlFVTTVSRHRCUVVOQk8wRkJRMEU3TzAxQlJVMHNTVUZCU1N4UlFVRlJMRXRCUVVzc1YwRkJWeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNSVUZCUlR0VlFVTm9SQ3huUWtGQlowSXNSMEZCUnl4UlFVRlJMRWxCUVVrc1YwRkJWeXhMUVVGTExFVkJRVVVzUTBGQlF5eGhRVUZoTEVsQlFVa3NaMEpCUVdkQ0xFZEJRVWNzUzBGQlN5eEhRVUZITEVkQlFVY3NRMEZCUXl4SFFVRkhMRlZCUVZVc1EwRkJRenRQUVVOdVNEdEJRVU5RTEVkQlFVYzdPMFZCUlVRc1NVRkJTU3hqUVVGakxFZEJRVWNzUlVGQlJTeERRVUZETzBWQlEzaENMRWxCUVVrc1owSkJRV2RDTEVWQlFVVTdTVUZEY0VJc1kwRkJZeXhEUVVGRExFbEJRVWs3VFVGRGFrSXNaMEpCUVdkQ0xFZEJRVWNzVFVGQlRTeEhRVUZITEdsQ1FVRnBRaXhEUVVGRExFVkJRVVVzUlVGQlJTeG5Ra0ZCWjBJc1EwRkJReXhIUVVGSExFZEJRVWM3UzBGRE1VVXNRMEZCUXp0QlFVTk9MRWRCUVVjN08wVkJSVVFzWTBGQll5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMRWRCUVVjc1RVRkJUU3hIUVVGSExHbENRVUZwUWl4RFFVRkRMRVZCUVVVc1JVRkJSU3hWUVVGVkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXp0RlFVTnVSaXhQUVVGUExHTkJRV01zUTBGQlF6dEJRVU40UWl4RFFVRkRMRU5CUVVNN08wRkJSVVk3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1JVRkJSVHM3UVVGRlJpeFRRVUZUTEdGQlFXRXNRMEZCUXl4RlFVRkZMRVZCUVVVN1JVRkRla0lzU1VGQlNTeFRRVUZUTEVkQlFVY3NSVUZCUlN4RFFVRkRMRmxCUVZrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dEZRVU42UXl4VFFVRlRMRWRCUVVjc1UwRkJVeXhKUVVGSkxGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNZVUZCWVN4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8wRkJRMmhGTEVWQlFVVXNVMEZCVXl4SFFVRkhMRk5CUVZNc1NVRkJTU3hUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZsQlFWa3NSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenM3UVVGRkwwUXNSVUZCUlN4SlFVRkpMRU5CUVVNc1UwRkJVeXhMUVVGTExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzVDBGQlR5eEZRVUZGTEVOQlFVTXNSVUZCUlR0QlFVTTVSRHM3UVVGRlFTeEZRVUZGTEZOQlFWTXNSMEZCUnl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTTNRenM3UVVGRlFTeEZRVUZGTEZOQlFWTXNSMEZCUnl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGbEJRVmtzUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXp0QlFVTnNSRHM3UlVGRlJTeFBRVUZQTEZOQlFWTXNRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEY2tNc1EwRkJRenM3UVVGRlJEdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUVVWQkxFVkJRVVU3TzBGQlJVWXNVMEZCVXl4clFrRkJhMElzUTBGQlF5eEZRVUZGTEVWQlFVVXNVVUZCVVN4RlFVRkZPMFZCUTNoRExFbEJRVWtzUzBGQlN5eEhRVUZITEVWQlFVVXNRMEZCUXp0RlFVTm1MRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEZRVU5xUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU03UlVGRGFrSXNTVUZCU1N4SFFVRkhMRXRCUVVzc1NVRkJTU3hEUVVGRE8wVkJRMnBDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRWxCUVVrc1EwRkJRenRGUVVOcVFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRia0lzUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRaRHRCUVVOQk8wRkJRMEU3TzBWQlJVVXNTVUZCU1N4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8wbEJRMVFzUzBGQlN5eEhRVUZITEZGQlFWRXNSMEZCUnl4RlFVRkZMRU5CUVVNc1JVRkJSU3hIUVVGSExFdEJRVXNzUTBGQlF6dEJRVU55UXl4SFFVRkhMRTFCUVUwN08wRkJSVlFzU1VGQlNTeExRVUZMTEU5QlFVOHNSVUZCUlN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzUTBGQlF6czdRVUZGZWtNc1NVRkJTU3hKUVVGSkxGVkJRVlVzUjBGQlJ5eGhRVUZoTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNN1FVRkRka003TzBsQlJVa3NTVUZCU1N4VlFVRlZMRU5CUVVNc1RVRkJUU3hGUVVGRk8wMUJRM0pDTEV0QlFVc3NTVUZCU1N4SFFVRkhMRWRCUVVjc1ZVRkJWU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0TFFVTnlRenRCUVVOTUxFZEJRVWM3UVVGRFNEczdSVUZGUlN4SlFVRkpMRXRCUVVzc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZPMGxCUTNCRExFdEJRVXNzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJRenRIUVVOd1F5eE5RVUZOTEVsQlFVa3NSMEZCUnl4SFFVRkhMRVZCUVVVc1EwRkJReXhaUVVGWkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVTdTVUZEZGtNc1MwRkJTeXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEhRVUZITEVkQlFVY3NTVUZCU1N4RFFVRkRPMGRCUTJoRExFMUJRVTBzU1VGQlNTeEpRVUZKTEVkQlFVY3NSVUZCUlN4RFFVRkRMRmxCUVZrc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJUdEpRVU42UXl4TFFVRkxMRWxCUVVrc1UwRkJVeXhIUVVGSExFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEY2tNc1IwRkJSenM3UlVGRlJDeEpRVUZKTEV0QlFVc3NSMEZCUnl4RlFVRkZMRU5CUVVNc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eEZRVUZGTzBsQlEzQkRMRXRCUVVzc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0QlFVTjJReXhIUVVGSE8wRkJRMGc3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMFZCUlVVc1MwRkJTeXhEUVVGRExFOUJRVThzUTBGQlF6dEpRVU5hTEU5QlFVOHNSVUZCUlN4RlFVRkZPMGxCUTFnc1VVRkJVU3hGUVVGRkxFdEJRVXM3UVVGRGJrSXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRURHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1JVRkZSU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSVUZCUlR0SlFVTnFRaXhOUVVGTkxFbEJRVWtzUzBGQlN5eERRVUZETEdsRFFVRnBReXhEUVVGRExFTkJRVU03UjBGRGNFUTdSVUZEUkN4UFFVRlBMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEJRVU5zUWl4RFFVRkRPenRCUVVWRUxFMUJRVTBzUTBGQlF5eFBRVUZQTEVkQlFVY3NUVUZCVFN4RFFVRkRJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpWEc1Y2JpOHFLbHh1S2lCSFpXNWxjbUYwWlNCMWJtbHhkV1VnUTFOVElITmxiR1ZqZEc5eUlHWnZjaUJuYVhabGJpQkVUMDBnWld4bGJXVnVkRnh1S2x4dUtpQkFjR0Z5WVcwZ2UwVnNaVzFsYm5SOUlHVnNYRzRxSUVCeVpYUjFjbTRnZTFOMGNtbHVaMzFjYmlvZ1FHRndhU0J3Y21sMllYUmxYRzRxTDF4dVhHNW1kVzVqZEdsdmJpQjFibWx4ZFdVb1pXd3NJR1J2WXlrZ2UxeHVJQ0JwWmlBb0lXVnNJSHg4SUNGbGJDNTBZV2RPWVcxbEtTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25SV3hsYldWdWRDQmxlSEJsWTNSbFpDY3BPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWDJkbGRGTmxiR1ZqZEc5eVNXNWtaWGdvWld4bGJXVnVkQ3dnYzJWc1pXTjBiM0lwSUh0Y2JpQWdJQ0FnSUhaaGNpQmxlR2x6ZEdsdVowbHVaR1Y0SUQwZ01EdGNiaUFnSUNBZ0lIWmhjaUJwZEdWdGN5QTlJQ0JrYjJNdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNoelpXeGxZM1J2Y2lrN1hHNWNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dhWFJsYlhNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9hWFJsYlhOYmFWMGdQVDA5SUdWc1pXMWxiblFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhocGMzUnBibWRKYm1SbGVDQTlJR2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSEpsZEhWeWJpQmxlR2x6ZEdsdVowbHVaR1Y0TzF4dUlDQjlYRzVjYmlBZ2RtRnlJR1ZzVTJWc1pXTjBiM0lnUFNCblpYUkZiR1Z0Wlc1MFUyVnNaV04wYjNJb1pXd3BMbk5sYkdWamRHOXlPMXh1SUNCMllYSWdhWE5UYVcxd2JHVlRaV3hsWTNSdmNpQTlJR1ZzVTJWc1pXTjBiM0lnUFQwOUlHVnNMblJoWjA1aGJXVXVkRzlNYjNkbGNrTmhjMlVvS1R0Y2JpQWdkbUZ5SUdGdVkyVnpkRzl5VTJWc1pXTjBiM0k3WEc1Y2JpQWdkbUZ5SUdOMWNuSkZiR1Z0Wlc1MElEMGdaV3c3WEc0Z0lIZG9hV3hsSUNoamRYSnlSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwSUNFOUlHNTFiR3dnSmlZZ0lXRnVZMlZ6ZEc5eVUyVnNaV04wYjNJcElIdGNiaUFnSUNBZ0lHTjFjbkpGYkdWdFpXNTBJRDBnWTNWeWNrVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkRHRjYmlBZ0lDQWdJSFpoY2lCelpXeGxZM1J2Y2lBOUlHZGxkRVZzWlcxbGJuUlRaV3hsWTNSdmNpaGpkWEp5Uld4bGJXVnVkQ2t1YzJWc1pXTjBiM0k3WEc1Y2JpQWdJQ0FnSUM4dklGUjVjR2xqWVd4c2VTQmxiR1Z0Wlc1MGN5QjBhR0YwSUdoaGRtVWdZU0JqYkdGemN5QnVZVzFsSUc5eUlIUnBkR3hsTENCMGFHOXpaU0JoY21VZ2JHVnpjeUJzYVd0bGJIbGNiaUFnSUNBZ0lDOHZJSFJ2SUdOb1lXNW5aU3dnWVc1a0lHRnNjMjhnWW1VZ2RXNXBjWFZsTGlBZ1UyOHNJSGRsSUdGeVpTQjBjbmxwYm1jZ2RHOGdabWx1WkNCaGJpQmhibU5sYzNSdmNseHVJQ0FnSUNBZ0x5OGdkRzhnWVc1amFHOXlJQ2h2Y2lCelkyOXdaU2tnZEdobElITmxZWEpqYUNCbWIzSWdkR2hsSUdWc1pXMWxiblFzSUdGdVpDQnRZV3RsSUdsMElHeGxjM01nWW5KcGRIUnNaUzVjYmlBZ0lDQWdJR2xtSUNoelpXeGxZM1J2Y2lBaFBUMGdZM1Z5Y2tWc1pXMWxiblF1ZEdGblRtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncEtTQjdYRzRnSUNBZ0lDQWdJQ0FnWVc1alpYTjBiM0pUWld4bFkzUnZjaUE5SUhObGJHVmpkRzl5SUNzZ0tHTjFjbkpGYkdWdFpXNTBJRDA5UFNCbGJDNXdZWEpsYm5SRmJHVnRaVzUwSUNZbUlHbHpVMmx0Y0d4bFUyVnNaV04wYjNJZ1B5QmNJaUErSUZ3aUlEb2dYQ0lnWENJcElDc2daV3hUWld4bFkzUnZjanRjYmlBZ0lDQWdJSDFjYmlBZ2ZWeHVYRzRnSUhaaGNpQm1hVzVoYkZObGJHVmpkRzl5Y3lBOUlGdGRPMXh1SUNCcFppQW9ZVzVqWlhOMGIzSlRaV3hsWTNSdmNpa2dlMXh1SUNBZ0lHWnBibUZzVTJWc1pXTjBiM0p6TG5CMWMyZ29YRzRnSUNBZ0lDQmhibU5sYzNSdmNsTmxiR1ZqZEc5eUlDc2dYQ0k2WlhFb1hDSWdLeUJmWjJWMFUyVnNaV04wYjNKSmJtUmxlQ2hsYkN3Z1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2lrZ0t5QmNJaWxjSWx4dUlDQWdJQ2s3WEc0Z0lIMWNibHh1SUNCbWFXNWhiRk5sYkdWamRHOXljeTV3ZFhOb0tHVnNVMlZzWldOMGIzSWdLeUJjSWpwbGNTaGNJaUFySUY5blpYUlRaV3hsWTNSdmNrbHVaR1Y0S0dWc0xDQmxiRk5sYkdWamRHOXlLU0FySUZ3aUtWd2lLVHRjYmlBZ2NtVjBkWEp1SUdacGJtRnNVMlZzWldOMGIzSnpPMXh1ZlR0Y2JseHVMeW9xWEc0cUlFZGxkQ0JqYkdGemN5QnVZVzFsY3lCbWIzSWdZVzRnWld4bGJXVnVkRnh1S2x4dUtpQkFjR0Z5WVhKdElIdEZiR1Z0Wlc1MGZTQmxiRnh1S2lCQWNtVjBkWEp1SUh0QmNuSmhlWDFjYmlvdlhHNWNibVoxYm1OMGFXOXVJR2RsZEVOc1lYTnpUbUZ0WlhNb1pXd3BJSHRjYmlBZ2RtRnlJR05zWVhOelRtRnRaU0E5SUdWc0xtZGxkRUYwZEhKcFluVjBaU2duWTJ4aGMzTW5LVHRjYmlBZ1kyeGhjM05PWVcxbElEMGdZMnhoYzNOT1lXMWxJQ1ltSUdOc1lYTnpUbUZ0WlM1eVpYQnNZV05sS0NkMWRHMWxMWFpsY21sbWVTY3NJQ2NuS1R0Y2JpQWdZMnhoYzNOT1lXMWxJRDBnWTJ4aGMzTk9ZVzFsSUNZbUlHTnNZWE56VG1GdFpTNXlaWEJzWVdObEtDZDFkRzFsTFhKbFlXUjVKeXdnSnljcE8xeHVYRzRnSUdsbUlDZ2hZMnhoYzNOT1lXMWxJSHg4SUNnaFkyeGhjM05PWVcxbExuUnlhVzBvS1M1c1pXNW5kR2dwS1NCN0lISmxkSFZ5YmlCYlhUc2dmVnh1WEc0Z0lDOHZJSEpsYlc5MlpTQmtkWEJzYVdOaGRHVWdkMmhwZEdWemNHRmpaVnh1SUNCamJHRnpjMDVoYldVZ1BTQmpiR0Z6YzA1aGJXVXVjbVZ3YkdGalpTZ3ZYRnh6S3k5bkxDQW5JQ2NwTzF4dVhHNGdJQzh2SUhSeWFXMGdiR1ZoWkdsdVp5QmhibVFnZEhKaGFXeHBibWNnZDJocGRHVnpjR0ZqWlZ4dUlDQmpiR0Z6YzA1aGJXVWdQU0JqYkdGemMwNWhiV1V1Y21Wd2JHRmpaU2d2WGx4Y2N5dDhYRnh6S3lRdlp5d2dKeWNwTzF4dVhHNGdJQzh2SUhOd2JHbDBJR2x1ZEc4Z2MyVndZWEpoZEdVZ1kyeGhjM051WVcxbGMxeHVJQ0J5WlhSMWNtNGdZMnhoYzNOT1lXMWxMblJ5YVcwb0tTNXpjR3hwZENnbklDY3BPMXh1ZlZ4dVhHNHZLaXBjYmlvZ1ExTlRJSE5sYkdWamRHOXljeUIwYnlCblpXNWxjbUYwWlNCMWJtbHhkV1VnYzJWc1pXTjBiM0lnWm05eUlFUlBUU0JsYkdWdFpXNTBYRzRxWEc0cUlFQndZWEpoYlNCN1JXeGxiV1Z1ZEgwZ1pXeGNiaW9nUUhKbGRIVnliaUI3UVhKeVlYbDlYRzRxSUVCaGNHa2djSEoyYVdGMFpWeHVLaTljYmx4dVpuVnVZM1JwYjI0Z1oyVjBSV3hsYldWdWRGTmxiR1ZqZEc5eUtHVnNMQ0JwYzFWdWFYRjFaU2tnZTF4dUlDQjJZWElnY0dGeWRITWdQU0JiWFR0Y2JpQWdkbUZ5SUd4aFltVnNJRDBnYm5Wc2JEdGNiaUFnZG1GeUlIUnBkR3hsSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJR0ZzZENBZ0lEMGdiblZzYkR0Y2JpQWdkbUZ5SUc1aGJXVWdJRDBnYm5Wc2JEdGNiaUFnZG1GeUlIWmhiSFZsSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJRzFsSUQwZ1pXdzdYRzVjYmlBZ0x5OGdaRzhnZTF4dVhHNGdJQzh2SUVsRWN5QmhjbVVnZFc1cGNYVmxJR1Z1YjNWbmFGeHVJQ0JwWmlBb1pXd3VhV1FwSUh0Y2JpQWdJQ0JzWVdKbGJDQTlJQ2RiYVdROVhGd25KeUFySUdWc0xtbGtJQ3NnWENKY1hDZGRYQ0k3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1QzUm9aWEozYVhObExDQjFjMlVnZEdGbklHNWhiV1ZjYmlBZ0lDQnNZV0psYkNBZ0lDQWdQU0JsYkM1MFlXZE9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDazdYRzVjYmlBZ0lDQjJZWElnWTJ4aGMzTk9ZVzFsY3lBOUlHZGxkRU5zWVhOelRtRnRaWE1vWld3cE8xeHVYRzRnSUNBZ0x5OGdWR0ZuSUc1aGJXVnpJR052ZFd4a0lIVnpaU0JqYkdGemMyVnpJR1p2Y2lCemNHVmphV1pwWTJsMGVWeHVJQ0FnSUdsbUlDaGpiR0Z6YzA1aGJXVnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdiR0ZpWld3Z0t6MGdKeTRuSUNzZ1kyeGhjM05PWVcxbGN5NXFiMmx1S0NjdUp5azdYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdMeThnVkdsMGJHVnpJQ1lnUVd4MElHRjBkSEpwWW5WMFpYTWdZWEpsSUhabGNua2dkWE5sWm5Wc0lHWnZjaUJ6Y0dWamFXWnBZMmwwZVNCaGJtUWdkSEpoWTJ0cGJtZGNiaUFnYVdZZ0tIUnBkR3hsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkMGFYUnNaU2NwS1NCN1hHNGdJQ0FnYkdGaVpXd2dLejBnSjF0MGFYUnNaVDFjSWljZ0t5QjBhWFJzWlNBcklDZGNJbDBuTzF4dUlDQjlJR1ZzYzJVZ2FXWWdLR0ZzZENBOUlHVnNMbWRsZEVGMGRISnBZblYwWlNnbllXeDBKeWtwSUh0Y2JpQWdJQ0JzWVdKbGJDQXJQU0FuVzJGc2REMWNJaWNnS3lCaGJIUWdLeUFuWENKZEp6dGNiaUFnZlNCbGJITmxJR2xtSUNodVlXMWxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2R1WVcxbEp5a3BJSHRjYmlBZ0lDQnNZV0psYkNBclBTQW5XMjVoYldVOVhDSW5JQ3NnYm1GdFpTQXJJQ2RjSWwwbk8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0haaGJIVmxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2QyWVd4MVpTY3BLU0I3WEc0Z0lDQWdiR0ZpWld3Z0t6MGdKMXQyWVd4MVpUMWNJaWNnS3lCMllXeDFaU0FySUNkY0lsMG5PMXh1SUNCOVhHNWNiaUFnTHk4Z2FXWWdLR1ZzTG1sdWJtVnlWR1Y0ZEM1c1pXNW5kR2dnSVQwZ01Da2dlMXh1SUNBdkx5QWdJR3hoWW1Wc0lDczlJQ2M2WTI5dWRHRnBibk1vSnlBcklHVnNMbWx1Ym1WeVZHVjRkQ0FySUNjcEp6dGNiaUFnTHk4Z2ZWeHVYRzRnSUhCaGNuUnpMblZ1YzJocFpuUW9lMXh1SUNBZ0lHVnNaVzFsYm5RNklHVnNMRnh1SUNBZ0lITmxiR1ZqZEc5eU9pQnNZV0psYkZ4dUlDQjlLVHRjYmx4dUlDQXZMeUJwWmlBb2FYTlZibWx4ZFdVb2NHRnlkSE1wS1NCN1hHNGdJQzh2SUNBZ0lDQmljbVZoYXp0Y2JpQWdMeThnZlZ4dVhHNGdJQzh2SUgwZ2QyaHBiR1VnS0NGbGJDNXBaQ0FtSmlBb1pXd2dQU0JsYkM1d1lYSmxiblJPYjJSbEtTQW1KaUJsYkM1MFlXZE9ZVzFsS1R0Y2JseHVJQ0F2THlCVGIyMWxJSE5sYkdWamRHOXljeUJ6YUc5MWJHUWdhR0YyWlNCdFlYUmphR1ZrSUdGMElHeGxZWE4wWEc0Z0lHbG1JQ2doY0dGeWRITXViR1Z1WjNSb0tTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkR1lXbHNaV1FnZEc4Z2FXUmxiblJwWm5rZ1ExTlRJSE5sYkdWamRHOXlKeWs3WEc0Z0lIMWNiaUFnY21WMGRYSnVJSEJoY25Seld6QmRPMXh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlIVnVhWEYxWlR0Y2JpSmRmUT09IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgbG9jYWxfc3RvcmFnZV9rZXkgPSAndXRtZS1zZXR0aW5ncyc7XG5cbmZ1bmN0aW9uIFNldHRpbmdzIChkZWZhdWx0U2V0dGluZ3MpIHtcbiAgICB0aGlzLnNldERlZmF1bHRzKGRlZmF1bHRTZXR0aW5ncyB8fCB7fSk7XG59XG5cblNldHRpbmdzLnByb3RvdHlwZSA9IHtcbiAgICByZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZXR0aW5nc1N0cmluZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGxvY2FsX3N0b3JhZ2Vfa2V5KTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge307XG4gICAgICAgIGlmIChzZXR0aW5nc1N0cmluZykge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBKU09OLnBhcnNlKHNldHRpbmdzU3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldERlZmF1bHRzOiBmdW5jdGlvbiAoZGVmYXVsdFNldHRpbmdzKSB7XG4gICAgICAgIHZhciBsb2NhbFNldHRpbmdzID0gdGhpcy5yZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIHZhciBkZWZhdWx0c0NvcHkgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdFNldHRpbmdzIHx8IHt9KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IF8uZXh0ZW5kKHt9LCBfLmV4dGVuZChkZWZhdWx0c0NvcHksIGxvY2FsU2V0dGluZ3MpKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0U2V0dGluZ3MgPSBkZWZhdWx0U2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5nc1trZXldID0gdmFsdWU7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH0sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3Nba2V5XTtcbiAgICB9LFxuXG4gICAgc2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShsb2NhbF9zdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xuICAgIH0sXG5cbiAgICByZXNldERlZmF1bHRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICBpZiAoZGVmYXVsdHMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdHMpO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05sZEhScGJtZHpMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMyVjBkR2x1WjNNdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUVzU1VGQlNTeERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRek5DTEVsQlFVa3NhVUpCUVdsQ0xFZEJRVWNzWlVGQlpTeERRVUZET3p0QlFVVjRReXhUUVVGVExGRkJRVkVzUlVGQlJTeGxRVUZsTEVWQlFVVTdTVUZEYUVNc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eGxRVUZsTEVsQlFVa3NSVUZCUlN4RFFVRkRMRU5CUVVNN1FVRkROVU1zUTBGQlF6czdRVUZGUkN4UlFVRlJMRU5CUVVNc1UwRkJVeXhIUVVGSE8wbEJRMnBDTERSQ1FVRTBRaXhGUVVGRkxGbEJRVms3VVVGRGRFTXNTVUZCU1N4alFVRmpMRWRCUVVjc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eHBRa0ZCYVVJc1EwRkJReXhEUVVGRE8xRkJRemRFTEVsQlFVa3NVVUZCVVN4SFFVRkhMRVZCUVVVc1EwRkJRenRSUVVOc1FpeEpRVUZKTEdOQlFXTXNSVUZCUlR0WlFVTm9RaXhSUVVGUkxFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4alFVRmpMRU5CUVVNc1EwRkJRenRUUVVONlF6dFJRVU5FTEU5QlFVOHNVVUZCVVN4RFFVRkRPMEZCUTNoQ0xFdEJRVXM3TzBsQlJVUXNWMEZCVnl4RlFVRkZMRlZCUVZVc1pVRkJaU3hGUVVGRk8xRkJRM0JETEVsQlFVa3NZVUZCWVN4SFFVRkhMRWxCUVVrc1EwRkJReXcwUWtGQk5FSXNSVUZCUlN4RFFVRkRPMUZCUTNoRUxFbEJRVWtzV1VGQldTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxHVkJRV1VzU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXp0UlFVTjJSQ3hKUVVGSkxFTkJRVU1zVVVGQlVTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNXVUZCV1N4RlFVRkZMR0ZCUVdFc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGNFVXNTVUZCU1N4RFFVRkRMR1ZCUVdVc1IwRkJSeXhsUVVGbExFTkJRVU03UVVGREwwTXNTMEZCU3pzN1NVRkZSQ3hIUVVGSExFVkJRVVVzVlVGQlZTeEhRVUZITEVWQlFVVXNTMEZCU3l4RlFVRkZPMUZCUTNaQ0xFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRE8xRkJRek5DTEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJRenRCUVVOd1FpeExRVUZMT3p0SlFVVkVMRWRCUVVjc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJUdFJRVU5vUWl4UFFVRlBMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEYkVNc1MwRkJTenM3U1VGRlJDeEpRVUZKTEVWQlFVVXNXVUZCV1R0UlFVTmtMRmxCUVZrc1EwRkJReXhQUVVGUExFTkJRVU1zYVVKQlFXbENMRVZCUVVVc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVNdlJTeExRVUZMT3p0SlFVVkVMR0ZCUVdFc1JVRkJSU3haUVVGWk8xRkJRM1pDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRWxCUVVrc1EwRkJReXhsUVVGbExFTkJRVU03VVVGRGNFTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRWaXhKUVVGSkxFTkJRVU1zVVVGQlVTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxGRkJRVkVzUTBGQlF5eERRVUZETzFsQlEzWkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF6dFRRVU5tTzB0QlEwbzdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVFVGQlRTeERRVUZETEU5QlFVOHNSMEZCUnl4UlFVRlJJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpZG1GeUlGOGdQU0J5WlhGMWFYSmxLQ2N1TDNWMGFXeHpKeWs3WEc1MllYSWdiRzlqWVd4ZmMzUnZjbUZuWlY5clpYa2dQU0FuZFhSdFpTMXpaWFIwYVc1bmN5YzdYRzVjYm1aMWJtTjBhVzl1SUZObGRIUnBibWR6SUNoa1pXWmhkV3gwVTJWMGRHbHVaM01wSUh0Y2JpQWdJQ0IwYUdsekxuTmxkRVJsWm1GMWJIUnpLR1JsWm1GMWJIUlRaWFIwYVc1bmN5QjhmQ0I3ZlNrN1hHNTlYRzVjYmxObGRIUnBibWR6TG5CeWIzUnZkSGx3WlNBOUlIdGNiaUFnSUNCeVpXRmtVMlYwZEdsdVozTkdjbTl0VEc5allXeFRkRzl5WVdkbE9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpaWFIwYVc1bmMxTjBjbWx1WnlBOUlHeHZZMkZzVTNSdmNtRm5aUzVuWlhSSmRHVnRLR3h2WTJGc1gzTjBiM0poWjJWZmEyVjVLVHRjYmlBZ0lDQWdJQ0FnZG1GeUlITmxkSFJwYm1keklEMGdlMzA3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpaWFIwYVc1bmMxTjBjbWx1WnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWMGRHbHVaM01nUFNCS1UwOU9MbkJoY25ObEtITmxkSFJwYm1kelUzUnlhVzVuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MyVjBkR2x1WjNNN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhObGRFUmxabUYxYkhSek9pQm1kVzVqZEdsdmJpQW9aR1ZtWVhWc2RGTmxkSFJwYm1kektTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCc2IyTmhiRk5sZEhScGJtZHpJRDBnZEdocGN5NXlaV0ZrVTJWMGRHbHVaM05HY205dFRHOWpZV3hUZEc5eVlXZGxLQ2s3WEc0Z0lDQWdJQ0FnSUhaaGNpQmtaV1poZFd4MGMwTnZjSGtnUFNCZkxtVjRkR1Z1WkNoN2ZTd2daR1ZtWVhWc2RGTmxkSFJwYm1keklIeDhJSHQ5S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSMGFXNW5jeUE5SUY4dVpYaDBaVzVrS0h0OUxDQmZMbVY0ZEdWdVpDaGtaV1poZFd4MGMwTnZjSGtzSUd4dlkyRnNVMlYwZEdsdVozTXBLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWtaV1poZFd4MFUyVjBkR2x1WjNNZ1BTQmtaV1poZFd4MFUyVjBkR2x1WjNNN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhObGREb2dablZ1WTNScGIyNGdLR3RsZVN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSMGFXNW5jMXRyWlhsZElEMGdkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJGMlpTZ3BPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQm5aWFE2SUdaMWJtTjBhVzl1SUNoclpYa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWMyVjBkR2x1WjNOYmEyVjVYVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMkYyWlRvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0JzYjJOaGJGTjBiM0poWjJVdWMyVjBTWFJsYlNoc2IyTmhiRjl6ZEc5eVlXZGxYMnRsZVN3Z1NsTlBUaTV6ZEhKcGJtZHBabmtvZEdocGN5NXpaWFIwYVc1bmN5a3BPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnlaWE5sZEVSbFptRjFiSFJ6T2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCa1pXWmhkV3gwY3lBOUlIUm9hWE11WkdWbVlYVnNkRk5sZEhScGJtZHpPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pHVm1ZWFZzZEhNcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwZEdsdVozTWdQU0JmTG1WNGRHVnVaQ2g3ZlN3Z1pHVm1ZWFZzZEhNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpZWFpsS0NrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlPMXh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZObGRIUnBibWR6T3lKZGZRPT0iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFNpbXVsYXRlID0ge1xuICAgIGV2ZW50OiBmdW5jdGlvbihlbGVtZW50LCBldmVudE5hbWUsIG9wdGlvbnMpe1xuICAgICAgICB2YXIgZXZ0O1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiSFRNTEV2ZW50c1wiKTtcbiAgICAgICAgICAgIGV2dC5pbml0RXZlbnQoZXZlbnROYW1lLCBldmVudE5hbWUgIT0gJ21vdXNlZW50ZXInICYmIGV2ZW50TmFtZSAhPSAnbW91c2VsZWF2ZScsIHRydWUgKTtcbiAgICAgICAgICAgIF8uZXh0ZW5kKGV2dCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudE9iamVjdCgpO1xuICAgICAgICAgICAgZWxlbWVudC5maXJlRXZlbnQoJ29uJyArIGV2ZW50TmFtZSxldnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBrZXlFdmVudDogZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgb3B0aW9ucyl7XG4gICAgICAgIHZhciBldnQsXG4gICAgICAgICAgICBlID0ge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUsIHZpZXc6IHdpbmRvdyxcbiAgICAgICAgICAgICAgICBjdHJsS2V5OiBmYWxzZSwgYWx0S2V5OiBmYWxzZSwgc2hpZnRLZXk6IGZhbHNlLCBtZXRhS2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBrZXlDb2RlOiAwLCBjaGFyQ29kZTogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgXy5leHRlbmQoZSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCl7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0tleUV2ZW50cycpO1xuICAgICAgICAgICAgICAgIGV2dC5pbml0S2V5RXZlbnQoXG4gICAgICAgICAgICAgICAgICAgIHR5cGUsIGUuYnViYmxlcywgZS5jYW5jZWxhYmxlLCBlLnZpZXcsXG4gICAgICAgICAgICBlLmN0cmxLZXksIGUuYWx0S2V5LCBlLnNoaWZ0S2V5LCBlLm1ldGFLZXksXG4gICAgICAgICAgICBlLmtleUNvZGUsIGUuY2hhckNvZGUpO1xuICAgICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiRXZlbnRzXCIpO1xuICAgICAgICBldnQuaW5pdEV2ZW50KHR5cGUsIGUuYnViYmxlcywgZS5jYW5jZWxhYmxlKTtcbiAgICAgICAgXy5leHRlbmQoZXZ0LCB7XG4gICAgICAgICAgICB2aWV3OiBlLnZpZXcsXG4gICAgICAgICAgY3RybEtleTogZS5jdHJsS2V5LCBhbHRLZXk6IGUuYWx0S2V5LFxuICAgICAgICAgIHNoaWZ0S2V5OiBlLnNoaWZ0S2V5LCBtZXRhS2V5OiBlLm1ldGFLZXksXG4gICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlLCBjaGFyQ29kZTogZS5jaGFyQ29kZVxuICAgICAgICB9KTtcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cblNpbXVsYXRlLmtleXByZXNzID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXlwcmVzcycsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxuU2ltdWxhdGUua2V5ZG93biA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5ZG93bicsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxuU2ltdWxhdGUua2V5dXAgPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleXVwJywge1xuICAgICAgICBrZXlDb2RlOiBjaGFyQ29kZSxcbiAgICAgICAgY2hhckNvZGU6IGNoYXJDb2RlXG4gICAgfSk7XG59O1xuXG52YXIgZXZlbnRzID0gW1xuICAgICdjbGljaycsXG4gICAgJ2ZvY3VzJyxcbiAgICAnYmx1cicsXG4gICAgJ2RibGNsaWNrJyxcbiAgICAnaW5wdXQnLFxuICAgICdjaGFuZ2UnLFxuICAgICdtb3VzZWRvd24nLFxuICAgICdtb3VzZW1vdmUnLFxuICAgICdtb3VzZW91dCcsXG4gICAgJ21vdXNlb3ZlcicsXG4gICAgJ21vdXNldXAnLFxuICAgICdtb3VzZWVudGVyJyxcbiAgICAnbW91c2VsZWF2ZScsXG4gICAgJ3Jlc2l6ZScsXG4gICAgJ3Njcm9sbCcsXG4gICAgJ3NlbGVjdCcsXG4gICAgJ3N1Ym1pdCcsXG4gICAgJ2xvYWQnLFxuICAgICd1bmxvYWQnXG5dO1xuXG5mb3IgKHZhciBpID0gZXZlbnRzLmxlbmd0aDsgaS0tOyl7XG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW2ldO1xuICAgIFNpbXVsYXRlW2V2ZW50XSA9IChmdW5jdGlvbihldnQpe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgICAgICAgICB0aGlzLmV2ZW50KGVsZW1lbnQsIGV2dCwgb3B0aW9ucyk7XG4gICAgICAgIH07XG4gICAgfShldmVudCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXVsYXRlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05wYlhWc1lYUmxMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMybHRkV3hoZEdVdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUVzU1VGQlNTeERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE96dEJRVVV6UWl4SlFVRkpMRkZCUVZFc1IwRkJSenRKUVVOWUxFdEJRVXNzUlVGQlJTeFRRVUZUTEU5QlFVOHNSVUZCUlN4VFFVRlRMRVZCUVVVc1QwRkJUeXhEUVVGRE8xRkJRM2hETEVsQlFVa3NSMEZCUnl4RFFVRkRPMUZCUTFJc1NVRkJTU3hSUVVGUkxFTkJRVU1zVjBGQlZ5eEZRVUZGTzFsQlEzUkNMRWRCUVVjc1IwRkJSeXhSUVVGUkxFTkJRVU1zVjBGQlZ5eERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRPMWxCUTNwRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNVMEZCVXl4RlFVRkZMRk5CUVZNc1NVRkJTU3haUVVGWkxFbEJRVWtzVTBGQlV5eEpRVUZKTEZsQlFWa3NSVUZCUlN4SlFVRkpMRVZCUVVVc1EwRkJRenRaUVVONFJpeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dFpRVU4yUWl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlF6bENMRWxCUVVrN1dVRkRSQ3hIUVVGSExFZEJRVWNzVVVGQlVTeERRVUZETEdsQ1FVRnBRaXhGUVVGRkxFTkJRVU03V1VGRGJrTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFZEJRVWNzVTBGQlV5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUXpORE8wdEJRMG83U1VGRFJDeFJRVUZSTEVWQlFVVXNVMEZCVXl4UFFVRlBMRVZCUVVVc1NVRkJTU3hGUVVGRkxFOUJRVThzUTBGQlF6dFJRVU4wUXl4SlFVRkpMRWRCUVVjN1dVRkRTQ3hEUVVGRExFZEJRVWM3WjBKQlEwRXNUMEZCVHl4RlFVRkZMRWxCUVVrc1JVRkJSU3hWUVVGVkxFVkJRVVVzU1VGQlNTeEZRVUZGTEVsQlFVa3NSVUZCUlN4TlFVRk5PMmRDUVVNM1F5eFBRVUZQTEVWQlFVVXNTMEZCU3l4RlFVRkZMRTFCUVUwc1JVRkJSU3hMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEV0QlFVc3NSVUZCUlN4UFFVRlBMRVZCUVVVc1MwRkJTenRuUWtGRE9VUXNUMEZCVHl4RlFVRkZMRU5CUVVNc1JVRkJSU3hSUVVGUkxFVkJRVVVzUTBGQlF6dGhRVU14UWl4RFFVRkRPMUZCUTA0c1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1VVRkRja0lzU1VGQlNTeFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRPMWxCUTNKQ0xFZEJRVWM3WjBKQlEwTXNSMEZCUnl4SFFVRkhMRkZCUVZFc1EwRkJReXhYUVVGWExFTkJRVU1zVjBGQlZ5eERRVUZETEVOQlFVTTdaMEpCUTNoRExFZEJRVWNzUTBGQlF5eFpRVUZaTzI5Q1FVTmFMRWxCUVVrc1JVRkJSU3hEUVVGRExFTkJRVU1zVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4VlFVRlZMRVZCUVVVc1EwRkJReXhEUVVGRExFbEJRVWs3V1VGRE4wTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNRMEZCUXl4UlFVRlJMRVZCUVVVc1EwRkJReXhEUVVGRExFOUJRVTg3V1VGRE1VTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeERRVUZETEVOQlFVTTdWVUZEZWtJc1QwRkJUeXhEUVVGRExHRkJRV0VzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0VFFVTTFRaXhOUVVGTkxFZEJRVWNzUTBGQlF6dFpRVU5RTEVkQlFVY3NSMEZCUnl4UlFVRlJMRU5CUVVNc1YwRkJWeXhEUVVGRExGRkJRVkVzUTBGQlF5eERRVUZETzFGQlEzcERMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBMRVZCUVVVc1EwRkJReXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETzFGQlF6ZERMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUjBGQlJ5eEZRVUZGTzFsQlExWXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJReXhKUVVGSk8xVkJRMlFzVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBMRVZCUVVVc1RVRkJUU3hGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTzFWQlEzQkRMRkZCUVZFc1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeEZRVUZGTEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUenRWUVVONFF5eFBRVUZQTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRTdVMEZEZWtNc1EwRkJReXhEUVVGRE8xRkJRMGdzVDBGQlR5eERRVUZETEdGQlFXRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRUUVVNeFFqdFRRVU5CTzB0QlEwbzdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVVVGQlVTeERRVUZETEZGQlFWRXNSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSU3hIUVVGSExFTkJRVU03U1VGRGRFTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1IwRkJSeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0SlFVTnFReXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFVOHNSVUZCUlN4VlFVRlZMRVZCUVVVN1VVRkRMMElzVDBGQlR5eEZRVUZGTEZGQlFWRTdVVUZEYWtJc1VVRkJVU3hGUVVGRkxGRkJRVkU3UzBGRGNrSXNRMEZCUXl4RFFVRkRPMEZCUTFBc1EwRkJReXhEUVVGRE96dEJRVVZHTEZGQlFWRXNRMEZCUXl4UFFVRlBMRWRCUVVjc1UwRkJVeXhQUVVGUExFVkJRVVVzUjBGQlJ5eERRVUZETzBsQlEzSkRMRWxCUVVrc1VVRkJVU3hIUVVGSExFZEJRVWNzUTBGQlF5eFZRVUZWTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1NVRkRha01zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4UFFVRlBMRVZCUVVVc1UwRkJVeXhGUVVGRk8xRkJRemxDTEU5QlFVOHNSVUZCUlN4UlFVRlJPMUZCUTJwQ0xGRkJRVkVzUlVGQlJTeFJRVUZSTzB0QlEzSkNMRU5CUVVNc1EwRkJRenRCUVVOUUxFTkJRVU1zUTBGQlF6czdRVUZGUml4UlFVRlJMRU5CUVVNc1MwRkJTeXhIUVVGSExGTkJRVk1zVDBGQlR5eEZRVUZGTEVkQlFVY3NRMEZCUXp0SlFVTnVReXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEhRVUZITEVOQlFVTXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8wbEJRMnBETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1QwRkJUeXhGUVVGRkxFOUJRVThzUlVGQlJUdFJRVU0xUWl4UFFVRlBMRVZCUVVVc1VVRkJVVHRSUVVOcVFpeFJRVUZSTEVWQlFVVXNVVUZCVVR0TFFVTnlRaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZETEVOQlFVTTdPMEZCUlVZc1NVRkJTU3hOUVVGTkxFZEJRVWM3U1VGRFZDeFBRVUZQTzBsQlExQXNUMEZCVHp0SlFVTlFMRTFCUVUwN1NVRkRUaXhWUVVGVk8wbEJRMVlzVDBGQlR6dEpRVU5RTEZGQlFWRTdTVUZEVWl4WFFVRlhPMGxCUTFnc1YwRkJWenRKUVVOWUxGVkJRVlU3U1VGRFZpeFhRVUZYTzBsQlExZ3NVMEZCVXp0SlFVTlVMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVVVGQlVUdEpRVU5TTEZGQlFWRTdTVUZEVWl4UlFVRlJPMGxCUTFJc1VVRkJVVHRKUVVOU0xFMUJRVTA3U1VGRFRpeFJRVUZSTzBGQlExb3NRMEZCUXl4RFFVRkRPenRCUVVWR0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdEpRVU0zUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdTVUZEZEVJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRPMUZCUXpWQ0xFOUJRVThzVTBGQlV5eFBRVUZQTEVWQlFVVXNUMEZCVHl4RFFVRkRPMWxCUXpkQ0xFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUMEZCVHl4RlFVRkZMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU55UXl4RFFVRkRPMHRCUTB3c1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEyUXNRMEZCUXpzN1FVRkZSQ3hOUVVGTkxFTkJRVU1zVDBGQlR5eEhRVUZITEZGQlFWRWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUoyWVhJZ1h5QTlJSEpsY1hWcGNtVW9KeTR2ZFhScGJITW5LVHRjYmx4dWRtRnlJRk5wYlhWc1lYUmxJRDBnZTF4dUlDQWdJR1YyWlc1ME9pQm1kVzVqZEdsdmJpaGxiR1Z0Wlc1MExDQmxkbVZ1ZEU1aGJXVXNJRzl3ZEdsdmJuTXBlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pYWjBPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pHOWpkVzFsYm5RdVkzSmxZWFJsUlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVYyWlc1MEtGd2lTRlJOVEVWMlpXNTBjMXdpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZEM1cGJtbDBSWFpsYm5Rb1pYWmxiblJPWVcxbExDQmxkbVZ1ZEU1aGJXVWdJVDBnSjIxdmRYTmxaVzUwWlhJbklDWW1JR1YyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZzWldGMlpTY3NJSFJ5ZFdVZ0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUY4dVpYaDBaVzVrS0dWMmRDd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJQ0FnSUNCbGJHVnRaVzUwTG1ScGMzQmhkR05vUlhabGJuUW9aWFowS1R0Y2JpQWdJQ0FnSUNBZ2ZXVnNjMlY3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmxkblFnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGZG1WdWRFOWlhbVZqZENncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWld4bGJXVnVkQzVtYVhKbFJYWmxiblFvSjI5dUp5QXJJR1YyWlc1MFRtRnRaU3hsZG5RcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCclpYbEZkbVZ1ZERvZ1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z2RIbHdaU3dnYjNCMGFXOXVjeWw3WEc0Z0lDQWdJQ0FnSUhaaGNpQmxkblFzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKMVltSnNaWE02SUhSeWRXVXNJR05oYm1ObGJHRmliR1U2SUhSeWRXVXNJSFpwWlhjNklIZHBibVJ2ZHl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamRISnNTMlY1T2lCbVlXeHpaU3dnWVd4MFMyVjVPaUJtWVd4elpTd2djMmhwWm5STFpYazZJR1poYkhObExDQnRaWFJoUzJWNU9pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCclpYbERiMlJsT2lBd0xDQmphR0Z5UTI5a1pUb2dNRnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdYeTVsZUhSbGJtUW9aU3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUdsbUlDaGtiMk4xYldWdWRDNWpjbVZoZEdWRmRtVnVkQ2w3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBjbmw3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhaMElEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJYWmxiblFvSjB0bGVVVjJaVzUwY3ljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1sMFMyVjVSWFpsYm5Rb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFI1Y0dVc0lHVXVZblZpWW14bGN5d2daUzVqWVc1alpXeGhZbXhsTENCbExuWnBaWGNzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxMbU4wY214TFpYa3NJR1V1WVd4MFMyVjVMQ0JsTG5Ob2FXWjBTMlY1TENCbExtMWxkR0ZMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsTG10bGVVTnZaR1VzSUdVdVkyaGhja052WkdVcE8xeHVJQ0FnSUNBZ0lDQWdJR1ZzWlcxbGJuUXVaR2x6Y0dGMFkyaEZkbVZ1ZENobGRuUXBPMXh1SUNBZ0lDQWdJQ0I5WTJGMFkyZ29aWEp5S1h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZENBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWMlpXNTBLRndpUlhabGJuUnpYQ0lwTzF4dUlDQWdJQ0FnSUNCbGRuUXVhVzVwZEVWMlpXNTBLSFI1Y0dVc0lHVXVZblZpWW14bGN5d2daUzVqWVc1alpXeGhZbXhsS1R0Y2JpQWdJQ0FnSUNBZ1h5NWxlSFJsYm1Rb1pYWjBMQ0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJhV1YzT2lCbExuWnBaWGNzWEc0Z0lDQWdJQ0FnSUNBZ1kzUnliRXRsZVRvZ1pTNWpkSEpzUzJWNUxDQmhiSFJMWlhrNklHVXVZV3gwUzJWNUxGeHVJQ0FnSUNBZ0lDQWdJSE5vYVdaMFMyVjVPaUJsTG5Ob2FXWjBTMlY1TENCdFpYUmhTMlY1T2lCbExtMWxkR0ZMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdhMlY1UTI5a1pUb2daUzVyWlhsRGIyUmxMQ0JqYUdGeVEyOWtaVG9nWlM1amFHRnlRMjlrWlZ4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdaV3hsYldWdWRDNWthWE53WVhSamFFVjJaVzUwS0dWMmRDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4wN1hHNWNibE5wYlhWc1lYUmxMbXRsZVhCeVpYTnpJRDBnWm5WdVkzUnBiMjRvWld4bGJXVnVkQ3dnWTJoeUtYdGNiaUFnSUNCMllYSWdZMmhoY2tOdlpHVWdQU0JqYUhJdVkyaGhja052WkdWQmRDZ3dLVHRjYmlBZ0lDQjBhR2x6TG10bGVVVjJaVzUwS0dWc1pXMWxiblFzSUNkclpYbHdjbVZ6Y3ljc0lIdGNiaUFnSUNBZ0lDQWdhMlY1UTI5a1pUb2dZMmhoY2tOdlpHVXNYRzRnSUNBZ0lDQWdJR05vWVhKRGIyUmxPaUJqYUdGeVEyOWtaVnh1SUNBZ0lIMHBPMXh1ZlR0Y2JseHVVMmx0ZFd4aGRHVXVhMlY1Wkc5M2JpQTlJR1oxYm1OMGFXOXVLR1ZzWlcxbGJuUXNJR05vY2lsN1hHNGdJQ0FnZG1GeUlHTm9ZWEpEYjJSbElEMGdZMmh5TG1Ob1lYSkRiMlJsUVhRb01DazdYRzRnSUNBZ2RHaHBjeTVyWlhsRmRtVnVkQ2hsYkdWdFpXNTBMQ0FuYTJWNVpHOTNiaWNzSUh0Y2JpQWdJQ0FnSUNBZ2EyVjVRMjlrWlRvZ1kyaGhja052WkdVc1hHNGdJQ0FnSUNBZ0lHTm9ZWEpEYjJSbE9pQmphR0Z5UTI5a1pWeHVJQ0FnSUgwcE8xeHVmVHRjYmx4dVUybHRkV3hoZEdVdWEyVjVkWEFnUFNCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCamFISXBlMXh1SUNBZ0lIWmhjaUJqYUdGeVEyOWtaU0E5SUdOb2NpNWphR0Z5UTI5a1pVRjBLREFwTzF4dUlDQWdJSFJvYVhNdWEyVjVSWFpsYm5Rb1pXeGxiV1Z1ZEN3Z0oydGxlWFZ3Snl3Z2UxeHVJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmphR0Z5UTI5a1pTeGNiaUFnSUNBZ0lDQWdZMmhoY2tOdlpHVTZJR05vWVhKRGIyUmxYRzRnSUNBZ2ZTazdYRzU5TzF4dVhHNTJZWElnWlhabGJuUnpJRDBnVzF4dUlDQWdJQ2RqYkdsamF5Y3NYRzRnSUNBZ0oyWnZZM1Z6Snl4Y2JpQWdJQ0FuWW14MWNpY3NYRzRnSUNBZ0oyUmliR05zYVdOckp5eGNiaUFnSUNBbmFXNXdkWFFuTEZ4dUlDQWdJQ2RqYUdGdVoyVW5MRnh1SUNBZ0lDZHRiM1Z6WldSdmQyNG5MRnh1SUNBZ0lDZHRiM1Z6WlcxdmRtVW5MRnh1SUNBZ0lDZHRiM1Z6Wlc5MWRDY3NYRzRnSUNBZ0oyMXZkWE5sYjNabGNpY3NYRzRnSUNBZ0oyMXZkWE5sZFhBbkxGeHVJQ0FnSUNkdGIzVnpaV1Z1ZEdWeUp5eGNiaUFnSUNBbmJXOTFjMlZzWldGMlpTY3NYRzRnSUNBZ0ozSmxjMmw2WlNjc1hHNGdJQ0FnSjNOamNtOXNiQ2NzWEc0Z0lDQWdKM05sYkdWamRDY3NYRzRnSUNBZ0ozTjFZbTFwZENjc1hHNGdJQ0FnSjJ4dllXUW5MRnh1SUNBZ0lDZDFibXh2WVdRblhHNWRPMXh1WEc1bWIzSWdLSFpoY2lCcElEMGdaWFpsYm5SekxteGxibWQwYURzZ2FTMHRPeWw3WEc0Z0lDQWdkbUZ5SUdWMlpXNTBJRDBnWlhabGJuUnpXMmxkTzF4dUlDQWdJRk5wYlhWc1lYUmxXMlYyWlc1MFhTQTlJQ2htZFc1amRHbHZiaWhsZG5RcGUxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z2IzQjBhVzl1Y3lsN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxtVjJaVzUwS0dWc1pXMWxiblFzSUdWMmRDd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmU2hsZG1WdWRDa3BPMXh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlGTnBiWFZzWVhSbE95SmRmUT09IiwiLyoqXG4gKiBQb2x5ZmlsbHNcbiAqL1xuXG4vKipcbiAqIFRoaXMgaXMgY29waWVkIGZyb20gUmVhY0pTJ3Mgb3duIHBvbHlwZmlsbCB0byBydW4gdGVzdHMgd2l0aCBwaGFudG9tanMuXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svcmVhY3QvYmxvYi8zZGMxMDc0OTA4MGE0NjBlNDhiZWU0NmQ3Njk3NjNlYzcxOTFhYzc2L3NyYy90ZXN0L3BoYW50b21qcy1zaGltcy5qc1xuICovXG4oZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgQXAgPSBBcnJheS5wcm90b3R5cGU7XG4gICAgdmFyIHNsaWNlID0gQXAuc2xpY2U7XG4gICAgdmFyIEZwID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gICAgaWYgKCFGcC5iaW5kKSB7XG4gICAgICAvLyBQaGFudG9tSlMgZG9lc24ndCBzdXBwb3J0IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIG5hdGl2ZWx5LCBzb1xuICAgICAgLy8gcG9seWZpbGwgaXQgd2hlbmV2ZXIgdGhpcyBtb2R1bGUgaXMgcmVxdWlyZWQuXG4gICAgICBGcC5iaW5kID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgICB2YXIgZnVuYyA9IHRoaXM7XG4gICAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICAgIHZhciBpbnZva2VkQXNDb25zdHJ1Y3RvciA9IGZ1bmMucHJvdG90eXBlICYmICh0aGlzIGluc3RhbmNlb2YgZnVuYyk7XG4gICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkoXG4gICAgICAgICAgICAvLyBJZ25vcmUgdGhlIGNvbnRleHQgcGFyYW1ldGVyIHdoZW4gaW52b2tpbmcgdGhlIGJvdW5kIGZ1bmN0aW9uXG4gICAgICAgICAgICAvLyBhcyBhIGNvbnN0cnVjdG9yLiBOb3RlIHRoYXQgdGhpcyBpbmNsdWRlcyBub3Qgb25seSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgLy8gaW52b2NhdGlvbnMgdXNpbmcgdGhlIG5ldyBrZXl3b3JkIGJ1dCBhbHNvIGNhbGxzIHRvIGJhc2UgY2xhc3NcbiAgICAgICAgICAgIC8vIGNvbnN0cnVjdG9ycyBzdWNoIGFzIEJhc2VDbGFzcy5jYWxsKHRoaXMsIC4uLikgb3Igc3VwZXIoLi4uKS5cbiAgICAgICAgICAgICFpbnZva2VkQXNDb25zdHJ1Y3RvciAmJiBjb250ZXh0IHx8IHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBib3VuZCBmdW5jdGlvbiBtdXN0IHNoYXJlIHRoZSAucHJvdG90eXBlIG9mIHRoZSB1bmJvdW5kXG4gICAgICAgIC8vIGZ1bmN0aW9uIHNvIHRoYXQgYW55IG9iamVjdCBjcmVhdGVkIGJ5IG9uZSBjb25zdHJ1Y3RvciB3aWxsIGNvdW50XG4gICAgICAgIC8vIGFzIGFuIGluc3RhbmNlIG9mIGJvdGggY29uc3RydWN0b3JzLlxuICAgICAgICBib3VuZC5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcblxuICAgICAgICByZXR1cm4gYm91bmQ7XG4gICAgICB9O1xuICAgIH1cblxufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZChkc3QsIHNyYyl7XG4gICAgICAgIGlmIChzcmMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcmMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3JjLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRzdDtcbiAgICB9LFxuXG4gICAgbWFwOiBmdW5jdGlvbihvYmosIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICAgIHZhciBsZW4gPSBvYmoubGVuZ3RoID4+PiAwO1xuICAgICAgICB2YXIgbmV3QXJyYXkgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgICAgdmFyIGtleSA9IDA7XG4gICAgICAgIGlmICghdGhpc0FyZykge1xuICAgICAgICAgICAgdGhpc0FyZyA9IG9iajtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoa2V5IDwgbGVuKSB7XG4gICAgICAgICAgICBuZXdBcnJheVtrZXldID0gY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzW2tleV0sIGtleSwgb2JqKTtcbiAgICAgICAgICAgIGtleSsrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdBcnJheTtcbiAgICB9XG5cbn07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzVjBhV3h6TG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZkWFJwYkhNdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3TzBGQlJVRXNSMEZCUnpzN1FVRkZTRHRCUVVOQk96dEhRVVZITzBGQlEwZ3NRMEZCUXl4WFFVRlhPenRKUVVWU0xFbEJRVWtzUlVGQlJTeEhRVUZITEV0QlFVc3NRMEZCUXl4VFFVRlRMRU5CUVVNN1NVRkRla0lzU1VGQlNTeExRVUZMTEVkQlFVY3NSVUZCUlN4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVONlFpeEpRVUZKTEVsQlFVa3NSVUZCUlN4SFFVRkhMRkZCUVZFc1EwRkJReXhUUVVGVExFTkJRVU03TzBGQlJXaERMRWxCUVVrc1NVRkJTU3hEUVVGRExFVkJRVVVzUTBGQlF5eEpRVUZKTEVWQlFVVTdRVUZEYkVJN08wMUJSVTBzUlVGQlJTeERRVUZETEVsQlFVa3NSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSVHRSUVVNeFFpeEpRVUZKTEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRlRUlzVVVGQlVTeEpRVUZKTEVsQlFVa3NSMEZCUnl4TFFVRkxMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUlVGQlJTeERRVUZETEVOQlFVTXNRMEZCUXpzN1VVRkZjRU1zVTBGQlV5eExRVUZMTEVkQlFVYzdWVUZEWml4SlFVRkpMRzlDUVVGdlFpeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRXRCUVVzc1NVRkJTU3haUVVGWkxFbEJRVWtzUTBGQlF5eERRVUZETzBGQlF6bEZMRlZCUVZVc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN6dEJRVU16UWp0QlFVTkJPMEZCUTBFN08xbEJSVmtzUTBGQlF5eHZRa0ZCYjBJc1NVRkJTU3hQUVVGUExFbEJRVWtzU1VGQlNUdFpRVU40UXl4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN1YwRkRia01zUTBGQlF6dEJRVU5hTEZOQlFWTTdRVUZEVkR0QlFVTkJPMEZCUTBFN08wRkJSVUVzVVVGQlVTeExRVUZMTEVOQlFVTXNVMEZCVXl4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU03TzFGQlJXcERMRTlCUVU4c1MwRkJTeXhEUVVGRE8wOUJRMlFzUTBGQlF6dEJRVU5TTEV0QlFVczdPMEZCUlV3c1EwRkJReXhIUVVGSExFTkJRVU03TzBGQlJVd3NUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSenM3U1VGRllpeE5RVUZOTEVWQlFVVXNVMEZCVXl4TlFVRk5MRU5CUVVNc1IwRkJSeXhGUVVGRkxFZEJRVWNzUTBGQlF6dFJRVU0zUWl4SlFVRkpMRWRCUVVjc1JVRkJSVHRaUVVOTUxFdEJRVXNzU1VGQlNTeEhRVUZITEVsQlFVa3NSMEZCUnl4RlFVRkZPMmRDUVVOcVFpeEpRVUZKTEVkQlFVY3NRMEZCUXl4alFVRmpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVU3YjBKQlEzcENMRWRCUVVjc1EwRkJReXhIUVVGSExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN2FVSkJRM1pDTzJGQlEwbzdVMEZEU2p0UlFVTkVMRTlCUVU4c1IwRkJSeXhEUVVGRE8wRkJRMjVDTEV0QlFVczdPMGxCUlVRc1IwRkJSeXhGUVVGRkxGTkJRVk1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNSVUZCUlN4UFFVRlBMRVZCUVVVN1VVRkRiRU1zU1VGQlNTeEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRTFCUVUwc1MwRkJTeXhEUVVGRExFTkJRVU03VVVGRE0wSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1NVRkJTU3hMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdVVUZET1VJc1NVRkJTU3hIUVVGSExFZEJRVWNzUTBGQlF5eERRVUZETzFGQlExb3NTVUZCU1N4RFFVRkRMRTlCUVU4c1JVRkJSVHRaUVVOV0xFOUJRVThzUjBGQlJ5eEhRVUZITEVOQlFVTTdVMEZEYWtJN1VVRkRSQ3hQUVVGUExFZEJRVWNzUjBGQlJ5eEhRVUZITEVWQlFVVTdXVUZEWkN4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzVVVGQlVTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRVZCUVVVc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVkQlFVY3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRaUVVNMVJDeEhRVUZITEVWQlFVVXNRMEZCUXp0VFFVTlVPMUZCUTBRc1QwRkJUeXhSUVVGUkxFTkJRVU03UVVGRGVFSXNTMEZCU3pzN1EwRkZTaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSWk4cUtseHVJQ29nVUc5c2VXWnBiR3h6WEc0Z0tpOWNibHh1THlvcVhHNGdLaUJVYUdseklHbHpJR052Y0dsbFpDQm1jbTl0SUZKbFlXTktVeWR6SUc5M2JpQndiMng1Y0dacGJHd2dkRzhnY25WdUlIUmxjM1J6SUhkcGRHZ2djR2hoYm5SdmJXcHpMbHh1SUNvZ2FIUjBjSE02THk5bmFYUm9kV0l1WTI5dEwyWmhZMlZpYjI5ckwzSmxZV04wTDJKc2IySXZNMlJqTVRBM05Ea3dPREJoTkRZd1pUUTRZbVZsTkRaa056WTVOell6WldNM01Ua3hZV00zTmk5emNtTXZkR1Z6ZEM5d2FHRnVkRzl0YW5NdGMyaHBiWE11YW5OY2JpQXFMMXh1S0daMWJtTjBhVzl1S0NrZ2UxeHVYRzRnSUNBZ2RtRnlJRUZ3SUQwZ1FYSnlZWGt1Y0hKdmRHOTBlWEJsTzF4dUlDQWdJSFpoY2lCemJHbGpaU0E5SUVGd0xuTnNhV05sTzF4dUlDQWdJSFpoY2lCR2NDQTlJRVoxYm1OMGFXOXVMbkJ5YjNSdmRIbHdaVHRjYmx4dUlDQWdJR2xtSUNnaFJuQXVZbWx1WkNrZ2UxeHVJQ0FnSUNBZ0x5OGdVR2hoYm5SdmJVcFRJR1J2WlhOdUozUWdjM1Z3Y0c5eWRDQkdkVzVqZEdsdmJpNXdjbTkwYjNSNWNHVXVZbWx1WkNCdVlYUnBkbVZzZVN3Z2MyOWNiaUFnSUNBZ0lDOHZJSEJ2YkhsbWFXeHNJR2wwSUhkb1pXNWxkbVZ5SUhSb2FYTWdiVzlrZFd4bElHbHpJSEpsY1hWcGNtVmtMbHh1SUNBZ0lDQWdSbkF1WW1sdVpDQTlJR1oxYm1OMGFXOXVLR052Ym5SbGVIUXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHWjFibU1nUFNCMGFHbHpPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1lYSm5jeUE5SUhOc2FXTmxMbU5oYkd3b1lYSm5kVzFsYm5SekxDQXhLVHRjYmx4dUlDQWdJQ0FnSUNCbWRXNWpkR2x2YmlCaWIzVnVaQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjJZWElnYVc1MmIydGxaRUZ6UTI5dWMzUnlkV04wYjNJZ1BTQm1kVzVqTG5CeWIzUnZkSGx3WlNBbUppQW9kR2hwY3lCcGJuTjBZVzVqWlc5bUlHWjFibU1wTzF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCbWRXNWpMbUZ3Y0d4NUtGeHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1NXZHViM0psSUhSb1pTQmpiMjUwWlhoMElIQmhjbUZ0WlhSbGNpQjNhR1Z1SUdsdWRtOXJhVzVuSUhSb1pTQmliM1Z1WkNCbWRXNWpkR2x2Ymx4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnWVhNZ1lTQmpiMjV6ZEhKMVkzUnZjaTRnVG05MFpTQjBhR0YwSUhSb2FYTWdhVzVqYkhWa1pYTWdibTkwSUc5dWJIa2dZMjl1YzNSeWRXTjBiM0pjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJR2x1ZG05allYUnBiMjV6SUhWemFXNW5JSFJvWlNCdVpYY2dhMlY1ZDI5eVpDQmlkWFFnWVd4emJ5QmpZV3hzY3lCMGJ5QmlZWE5sSUdOc1lYTnpYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QmpiMjV6ZEhKMVkzUnZjbk1nYzNWamFDQmhjeUJDWVhObFEyeGhjM011WTJGc2JDaDBhR2x6TENBdUxpNHBJRzl5SUhOMWNHVnlLQzR1TGlrdVhHNGdJQ0FnSUNBZ0lDQWdJQ0FoYVc1MmIydGxaRUZ6UTI5dWMzUnlkV04wYjNJZ0ppWWdZMjl1ZEdWNGRDQjhmQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJQ0FnWVhKbmN5NWpiMjVqWVhRb2MyeHBZMlV1WTJGc2JDaGhjbWQxYldWdWRITXBLVnh1SUNBZ0lDQWdJQ0FnSUNrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0F2THlCVWFHVWdZbTkxYm1RZ1puVnVZM1JwYjI0Z2JYVnpkQ0J6YUdGeVpTQjBhR1VnTG5CeWIzUnZkSGx3WlNCdlppQjBhR1VnZFc1aWIzVnVaRnh1SUNBZ0lDQWdJQ0F2THlCbWRXNWpkR2x2YmlCemJ5QjBhR0YwSUdGdWVTQnZZbXBsWTNRZ1kzSmxZWFJsWkNCaWVTQnZibVVnWTI5dWMzUnlkV04wYjNJZ2QybHNiQ0JqYjNWdWRGeHVJQ0FnSUNBZ0lDQXZMeUJoY3lCaGJpQnBibk4wWVc1alpTQnZaaUJpYjNSb0lHTnZibk4wY25WamRHOXljeTVjYmlBZ0lDQWdJQ0FnWW05MWJtUXVjSEp2ZEc5MGVYQmxJRDBnWm5WdVl5NXdjbTkwYjNSNWNHVTdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR0p2ZFc1a08xeHVJQ0FnSUNBZ2ZUdGNiaUFnSUNCOVhHNWNibjBwS0NrN1hHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdlMXh1WEc0Z0lDQWdaWGgwWlc1a09pQm1kVzVqZEdsdmJpQmxlSFJsYm1Rb1pITjBMQ0J6Y21NcGUxeHVJQ0FnSUNBZ0lDQnBaaUFvYzNKaktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCclpYa2dhVzRnYzNKaktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOeVl5NW9ZWE5QZDI1UWNtOXdaWEowZVNoclpYa3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHUnpkRnRyWlhsZElEMGdjM0pqVzJ0bGVWMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmtjM1E3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJRzFoY0RvZ1puVnVZM1JwYjI0b2IySnFMQ0JqWVd4c1ltRmpheXdnZEdocGMwRnlaeWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdiR1Z1SUQwZ2IySnFMbXhsYm1kMGFDQStQajRnTUR0Y2JpQWdJQ0FnSUNBZ2RtRnlJRzVsZDBGeWNtRjVJRDBnYm1WM0lFRnljbUY1S0d4bGJpazdYRzRnSUNBZ0lDQWdJSFpoY2lCclpYa2dQU0F3TzF4dUlDQWdJQ0FnSUNCcFppQW9JWFJvYVhOQmNtY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE5CY21jZ1BTQnZZbW83WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2QyaHBiR1VnS0d0bGVTQThJR3hsYmlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYm1WM1FYSnlZWGxiYTJWNVhTQTlJR05oYkd4aVlXTnJMbU5oYkd3b2RHaHBjMEZ5Wnl3Z2RHaHBjMXRyWlhsZExDQnJaWGtzSUc5aWFpazdYRzRnSUNBZ0lDQWdJQ0FnSUNCclpYa3JLenRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYm1WM1FYSnlZWGs3WEc0Z0lDQWdmVnh1WEc1OU95SmRmUT09IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbnZhciBTaW11bGF0ZSA9IHJlcXVpcmUoJy4vc2ltdWxhdGUnKTtcbnZhciBzZWxlY3RvckZpbmRlciA9IHJlcXVpcmUoJy4vc2VsZWN0b3JGaW5kZXInKTtcbnZhciBTZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcblxuLy8gdmFyIG15R2VuZXJhdG9yID0gbmV3IENzc1NlbGVjdG9yR2VuZXJhdG9yKCk7XG52YXIgaW1wb3J0YW50U3RlcExlbmd0aCA9IDUwMDtcbnZhciBzYXZlSGFuZGxlcnMgPSBbXTtcbnZhciByZXBvcnRIYW5kbGVycyA9IFtdO1xudmFyIGxvYWRIYW5kbGVycyA9IFtdO1xudmFyIHNldHRpbmdzTG9hZEhhbmRsZXJzID0gW107XG5cbmZ1bmN0aW9uIGdldFNjZW5hcmlvKG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBpZiAobG9hZEhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIHN0YXRlID0gdXRtZS5zdGF0ZTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGUuc2NlbmFyaW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnNjZW5hcmlvc1tpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3RhdGUuc2NlbmFyaW9zW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2FkSGFuZGxlcnNbMF0obmFtZSwgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3ApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbnZhciB2YWxpZGF0aW5nID0gZmFsc2U7XG5cbnZhciBldmVudHMgPSBbXG4gICAgJ2NsaWNrJyxcbiAgICAnZm9jdXMnLFxuICAgICdibHVyJyxcbiAgICAnZGJsY2xpY2snLFxuICAgIC8vICdkcmFnJyxcbiAgICAvLyAnZHJhZ2VudGVyJyxcbiAgICAvLyAnZHJhZ2xlYXZlJyxcbiAgICAvLyAnZHJhZ292ZXInLFxuICAgIC8vICdkcmFnc3RhcnQnLFxuICAgIC8vICdpbnB1dCcsXG4gICAgJ21vdXNlZG93bicsXG4gICAgLy8gJ21vdXNlbW92ZScsXG4gICAgJ21vdXNlZW50ZXInLFxuICAgICdtb3VzZWxlYXZlJyxcbiAgICAnbW91c2VvdXQnLFxuICAgICdtb3VzZW92ZXInLFxuICAgICdtb3VzZXVwJyxcbiAgICAnY2hhbmdlJyxcbiAgICAvLyAncmVzaXplJyxcbiAgICAvLyAnc2Nyb2xsJ1xuXTtcblxuZnVuY3Rpb24gZ2V0UHJlY29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgc2V0dXAgPSBzY2VuYXJpby5zZXR1cDtcbiAgICB2YXIgc2NlbmFyaW9zID0gc2V0dXAgJiYgc2V0dXAuc2NlbmFyaW9zO1xuICAgIC8vIFRPRE86IEJyZWFrIG91dCBpbnRvIGhlbHBlclxuICAgIGlmIChzY2VuYXJpb3MpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKF8ubWFwKHNjZW5hcmlvcywgZnVuY3Rpb24gKHNjZW5hcmlvTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFNjZW5hcmlvKHNjZW5hcmlvTmFtZSkudGhlbihmdW5jdGlvbiAob3RoZXJTY2VuYXJpbykge1xuICAgICAgICAgICAgICBvdGhlclNjZW5hcmlvID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvdGhlclNjZW5hcmlvKSk7XG4gICAgICAgICAgICAgIHJldHVybiBvdGhlclNjZW5hcmlvLnN0ZXBzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFBvc3Rjb25kaXRpb25zIChzY2VuYXJpbykge1xuICAgIHZhciBjbGVhbnVwID0gc2NlbmFyaW8uY2xlYW51cDtcbiAgICB2YXIgc2NlbmFyaW9zID0gY2xlYW51cCAmJiBjbGVhbnVwLnNjZW5hcmlvcztcbiAgICAvLyBUT0RPOiBCcmVhayBvdXQgaW50byBoZWxwZXJcbiAgICBpZiAoc2NlbmFyaW9zKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChfLm1hcChzY2VuYXJpb3MsIGZ1bmN0aW9uIChzY2VuYXJpb05hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTY2VuYXJpbyhzY2VuYXJpb05hbWUpLnRoZW4oZnVuY3Rpb24gKG90aGVyU2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgb3RoZXJTY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3RoZXJTY2VuYXJpbykpO1xuICAgICAgICAgICAgICByZXR1cm4gb3RoZXJTY2VuYXJpby5zdGVwcztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBfY29uY2F0U2NlbmFyaW9TdGVwTGlzdHMoc3RlcHMpIHtcbiAgICB2YXIgbmV3U3RlcHMgPSBbXTtcbiAgICB2YXIgY3VycmVudFRpbWVzdGFtcDsgLy8gaW5pdGFsaXplZCBieSBmaXJzdCBsaXN0IG9mIHN0ZXBzLlxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3RlcHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGZsYXRTdGVwcyA9IHN0ZXBzW2pdO1xuICAgICAgICBpZiAoaiA+IDApIHtcbiAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgc3RlcHMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RlcCA9IGZsYXRTdGVwc1trXTtcbiAgICAgICAgICAgICAgICB2YXIgZGlmZiA9IGsgPiAwID8gc3RlcC50aW1lU3RhbXAgLSBmbGF0U3RlcHNbayAtIDFdLnRpbWVTdGFtcCA6IDUwO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUaW1lc3RhbXAgKz0gZGlmZjtcbiAgICAgICAgICAgICAgICBmbGF0U3RlcHNba10udGltZVN0YW1wID0gY3VycmVudFRpbWVzdGFtcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lc3RhbXAgPSBmbGF0U3RlcHNbal0udGltZVN0YW1wO1xuICAgICAgICB9XG4gICAgICAgIG5ld1N0ZXBzID0gbmV3U3RlcHMuY29uY2F0KGZsYXRTdGVwcyk7XG4gICAgfVxuICAgIHJldHVybiBuZXdTdGVwcztcbn1cblxuZnVuY3Rpb24gc2V0dXBDb25kaXRpb25zIChzY2VuYXJpbykge1xuICAgIHZhciBwcm9taXNlcyA9IFtdO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgIGdldFByZWNvbmRpdGlvbnMoc2NlbmFyaW8pLFxuICAgICAgICBnZXRQb3N0Y29uZGl0aW9ucyhzY2VuYXJpbylcbiAgICBdKS50aGVuKGZ1bmN0aW9uIChzdGVwQXJyYXlzKSB7XG4gICAgICAgIHZhciBzdGVwTGlzdHMgPSBzdGVwQXJyYXlzWzBdLmNvbmNhdChbc2NlbmFyaW8uc3RlcHNdLCBzdGVwQXJyYXlzWzFdKTtcbiAgICAgICAgc2NlbmFyaW8uc3RlcHMgPSBfY29uY2F0U2NlbmFyaW9TdGVwTGlzdHMoc3RlcExpc3RzKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuU3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApIHtcbiAgICB1dG1lLmJyb2FkY2FzdCgnUlVOTklOR19TVEVQJyk7XG4gICAgdG9Ta2lwID0gdG9Ta2lwIHx8IHt9O1xuXG4gICAgdmFyIHN0ZXAgPSBzY2VuYXJpby5zdGVwc1tpZHhdO1xuICAgIHZhciBzdGF0ZSA9IHV0bWUuc3RhdGU7XG4gICAgaWYgKHN0ZXAgJiYgc3RhdGUuc3RhdHVzID09ICdQTEFZSU5HJykge1xuICAgICAgICBzdGF0ZS5ydW4uc2NlbmFyaW8gPSBzY2VuYXJpbztcbiAgICAgICAgc3RhdGUucnVuLnN0ZXBJbmRleCA9IGlkeDtcbiAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdsb2FkJykge1xuICAgICAgICAgICAgdmFyIG5ld0xvY2F0aW9uID0gc3RlcC5kYXRhLnVybC5wcm90b2NvbCArIFwiLy9cIiArIHN0ZXAuZGF0YS51cmwuaG9zdDtcbiAgICAgICAgICAgIHZhciBzZWFyY2ggPSBzdGVwLmRhdGEudXJsLnNlYXJjaDtcbiAgICAgICAgICAgIHZhciBoYXNoID0gc3RlcC5kYXRhLnVybC5oYXNoO1xuXG4gICAgICAgICAgICBpZiAoc2VhcmNoICYmICFzZWFyY2guY2hhckF0KFwiP1wiKSkge1xuICAgICAgICAgICAgICAgIHNlYXJjaCA9IFwiP1wiICsgc2VhcmNoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlzU2FtZVVSTCA9IChsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5zZWFyY2gpID09PSAobmV3TG9jYXRpb24gKyBzZWFyY2gpO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlcGxhY2UobmV3TG9jYXRpb24gKyBoYXNoICsgc2VhcmNoKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coKGxvY2F0aW9uLnByb3RvY29sICsgbG9jYXRpb24uaG9zdCArIGxvY2F0aW9uLnNlYXJjaCkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coKHN0ZXAuZGF0YS51cmwucHJvdG9jb2wgKyBzdGVwLmRhdGEudXJsLmhvc3QgKyBzdGVwLmRhdGEudXJsLnNlYXJjaCkpO1xuXG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIG5vdCBjaGFuZ2VkIHRoZSBhY3R1YWwgbG9jYXRpb24sIHRoZW4gdGhlIGxvY2F0aW9uLnJlcGxhY2VcbiAgICAgICAgICAgIC8vIHdpbGwgbm90IGdvIGFueXdoZXJlXG4gICAgICAgICAgICBpZiAoaXNTYW1lVVJMKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd0aW1lb3V0Jykge1xuICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXAsIHN0ZXAuZGF0YS5hbW91bnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGxvY2F0b3IgPSBzdGVwLmRhdGEubG9jYXRvcjtcbiAgICAgICAgICAgIHZhciBzdGVwcyA9IHNjZW5hcmlvLnN0ZXBzO1xuICAgICAgICAgICAgdmFyIHVuaXF1ZUlkID0gZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKTtcblxuICAgICAgICAgICAgLy8gdHJ5IHRvIGdldCByaWQgb2YgdW5uZWNlc3Nhcnkgc3RlcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdG9Ta2lwW3VuaXF1ZUlkXSA9PSAndW5kZWZpbmVkJyAmJiB1dG1lLnN0YXRlLnJ1bi5zcGVlZCAhPSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgIHZhciBkaWZmO1xuICAgICAgICAgICAgICB2YXIgaWdub3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgIGZvciAodmFyIGogPSBzdGVwcy5sZW5ndGggLSAxOyBqID4gaWR4OyBqLS0pIHtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJTdGVwID0gc3RlcHNbal07XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyVW5pcXVlSWQgPSBnZXRVbmlxdWVJZEZyb21TdGVwKG90aGVyU3RlcCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuaXF1ZUlkID09PSBvdGhlclVuaXF1ZUlkKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWRpZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gKG90aGVyU3RlcC50aW1lU3RhbXAgLSBzdGVwLnRpbWVTdGFtcCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWdub3JlID0gIWlzSW1wb3J0YW50U3RlcChvdGhlclN0ZXApICYmIGRpZmYgPCBpbXBvcnRhbnRTdGVwTGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ludGVyYWN0aXZlU3RlcChvdGhlclN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWdub3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgdG9Ta2lwW3VuaXF1ZUlkXSA9IGlnbm9yZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UncmUgc2tpcHBpbmcgdGhpcyBlbGVtZW50XG4gICAgICAgICAgICBpZiAodG9Ta2lwW2dldFVuaXF1ZUlkRnJvbVN0ZXAoc3RlcCldKSB7XG4gICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5VW50aWxGb3VuZChzY2VuYXJpbywgc3RlcCwgbG9jYXRvciwgZ2V0VGltZW91dChzY2VuYXJpbywgaWR4KSkudGhlbihmdW5jdGlvbiAoZWxlcykge1xuXG4gICAgICAgICAgICAgICAgICB2YXIgZWxlID0gZWxlc1swXTtcbiAgICAgICAgICAgICAgICAgIHZhciB0YWdOYW1lID0gZWxlLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdXBwb3J0c0lucHV0RXZlbnQgPSB0YWdOYW1lID09PSAnaW5wdXQnIHx8IHRhZ05hbWUgPT09ICd0ZXh0YXJlYScgfHwgZWxlLmdldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJyk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChldmVudHMuaW5kZXhPZihzdGVwLmV2ZW50TmFtZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5kYXRhLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMud2hpY2ggPSBvcHRpb25zLmJ1dHRvbiA9IHN0ZXAuZGF0YS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnU2ltdWxhdGluZyAnICsgc3RlcC5ldmVudE5hbWUgKyAnIG9uIGVsZW1lbnQgJywgZWxlLCBsb2NhdG9yLnNlbGVjdG9yc1swXSwgXCIgZm9yIHN0ZXAgXCIgKyBpZHgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ2NsaWNrJykge1xuICAgICAgICAgICAgICAgICAgICAgICQoZWxlKS50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChzdGVwLmV2ZW50TmFtZSA9PSAnZm9jdXMnIHx8IHN0ZXAuZXZlbnROYW1lID09ICdibHVyJykgJiYgZWxlW3N0ZXAuZXZlbnROYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgIGVsZVtzdGVwLmV2ZW50TmFtZV0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZVtzdGVwLmV2ZW50TmFtZV0oZWxlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RlcC5kYXRhLnZhbHVlICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICBlbGUudmFsdWUgPSBzdGVwLmRhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0aGUgaW5wdXQgZXZlbnQuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHN1cHBvcnRzSW5wdXRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnY2hhbmdlJyk7IC8vIFRoaXMgc2hvdWxkIGJlIGZpcmVkIGFmdGVyIGEgYmx1ciBldmVudC5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ2tleXByZXNzJykge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gU3RyaW5nLmZyb21DaGFyQ29kZShzdGVwLmRhdGEua2V5Q29kZSk7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXByZXNzKGVsZSwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5ZG93bihlbGUsIGtleSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZWxlLnZhbHVlID0gc3RlcC5kYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdjaGFuZ2UnKTtcblxuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5rZXl1cChlbGUsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXBwb3J0c0lucHV0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coJ1ZhbGlkYXRlOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICArIFwiIGNvbnRhaW5zIHRleHQgJ1wiICArIHN0ZXAuZGF0YS50ZXh0ICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlZhbGlkYXRlOiBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8oZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRFcnJvcihcIkZhaWxlZCBvbiBzdGVwOiBcIiArIGlkeCArIFwiICBFdmVudDogXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiIFJlYXNvbjogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8oZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5nZXQoJ3ZlcmJvc2UnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JBbmd1bGFyKHJvb3RTZWxlY3Rvcikge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iocm9vdFNlbGVjdG9yKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCF3aW5kb3cuYW5ndWxhcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYW5ndWxhciBjb3VsZCBub3QgYmUgZm91bmQgb24gdGhlIHdpbmRvdycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZ2V0VGVzdGFiaWxpdHkpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmdldFRlc3RhYmlsaXR5KGVsKS53aGVuU3RhYmxlKHJlc29sdmUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZWxlbWVudChlbCkuaW5qZWN0b3IoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Jvb3QgZWxlbWVudCAoJyArIHJvb3RTZWxlY3RvciArICcpIGhhcyBubyBpbmplY3Rvci4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICcgdGhpcyBtYXkgbWVhbiBpdCBpcyBub3QgaW5zaWRlIG5nLWFwcC4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGVsKS5pbmplY3RvcigpLmdldCgnJGJyb3dzZXInKS5cbiAgICAgICAgICAgICAgICBub3RpZnlXaGVuTm9PdXRzdGFuZGluZ1JlcXVlc3RzKHJlc29sdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzSW1wb3J0YW50U3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZWxlYXZlJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VvdXQnICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZWVudGVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VvdmVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnYmx1cicgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ2ZvY3VzJztcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHN0ZXAgaXMgc29tZSBzb3J0IG9mIHVzZXIgaW50ZXJhY3Rpb25cbiAqL1xuZnVuY3Rpb24gaXNJbnRlcmFjdGl2ZVN0ZXAoc3RlcCkge1xuICAgIHZhciBldnQgPSBzdGVwLmV2ZW50TmFtZTtcblxuICAgIC8qXG4gICAgICAgLy8gSW50ZXJlc3Rpbmcgbm90ZSwgZG9pbmcgdGhlIGZvbGxvd2luZyB3YXMgY2F1c2luZyB0aGlzIGZ1bmN0aW9uIHRvIHJldHVybiB1bmRlZmluZWQuXG4gICAgICAgcmV0dXJuXG4gICAgICAgICAgIGV2dC5pbmRleE9mKFwibW91c2VcIikgIT09IDAgfHxcbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZWRvd25cIikgPT09IDAgfHxcbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZXVwXCIpID09PSAwO1xuXG4gICAgICAgLy8gSXRzIGJlY2F1c2UgdGhlIGNvbmRpdGlvbnMgd2VyZSBub3Qgb24gdGhlIHNhbWUgbGluZSBhcyB0aGUgcmV0dXJuIHN0YXRlbWVudFxuICAgICovXG4gICAgcmV0dXJuIGV2dC5pbmRleE9mKFwibW91c2VcIikgIT09IDAgfHwgZXZ0LmluZGV4T2YoXCJtb3VzZWRvd25cIikgPT09IDAgfHwgZXZ0LmluZGV4T2YoXCJtb3VzZXVwXCIpID09PSAwO1xufVxuXG5mdW5jdGlvbiB0cnlVbnRpbEZvdW5kKHNjZW5hcmlvLCBzdGVwLCBsb2NhdG9yLCB0aW1lb3V0LCB0ZXh0VG9DaGVjaykge1xuICAgIHZhciBzdGFydGVkO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIHRyeUZpbmQoKSB7XG4gICAgICAgICAgICBpZiAoIXN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICBzdGFydGVkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVzO1xuICAgICAgICAgICAgdmFyIGZvdW5kVG9vTWFueSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGZvdW5kVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBmb3VuZERpZmZlcmVudFRleHQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvcnNUb1Rlc3QgPSBsb2NhdG9yLnNlbGVjdG9ycy5zbGljZSgwKTtcbiAgICAgICAgICAgIHZhciB0ZXh0VG9DaGVjayA9IHN0ZXAuZGF0YS50ZXh0O1xuICAgICAgICAgICAgdmFyIGNvbXBhcmlzb24gPSBzdGVwLmRhdGEuY29tcGFyaXNvbiB8fCBcImVxdWFsc1wiO1xuICAgICAgICAgICAgc2VsZWN0b3JzVG9UZXN0LnVuc2hpZnQoJ1tkYXRhLXVuaXF1ZS1pZD1cIicgKyBsb2NhdG9yLnVuaXF1ZUlkICsgJ1wiXScpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnNUb1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNUb1Rlc3RbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvciArPSBcIjp2aXNpYmxlXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsZXMgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRleHRUb0NoZWNrICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3VGV4dCA9ICQoZWxlc1swXSkudGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChjb21wYXJpc29uID09PSAnZXF1YWxzJyAmJiBuZXdUZXh0ID09PSB0ZXh0VG9DaGVjaykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY29tcGFyaXNvbiA9PT0gJ2NvbnRhaW5zJyAmJiBuZXdUZXh0LmluZGV4T2YodGV4dFRvQ2hlY2spID49IDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRWYWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kRGlmZmVyZW50VGV4dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZXMuYXR0cignZGF0YS11bmlxdWUtaWQnLCBsb2NhdG9yLnVuaXF1ZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWxlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kVG9vTWFueSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZm91bmRWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZWxlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSAmJiAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydGVkKSA8IHRpbWVvdXQgKiA1KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCA1MCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZFRvb01hbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IEZvdW5kIFRvbyBNYW55IEVsZW1lbnRzXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmb3VuZERpZmZlcmVudFRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IFRleHQgZG9lc24ndCBtYXRjaC4gIFxcbkV4cGVjdGVkOlxcblwiICsgdGV4dFRvQ2hlY2sgKyBcIlxcbmJ1dCB3YXNcXG5cIiArIGVsZXMudGV4dCgpICsgXCJcXG5cIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogTm8gZWxlbWVudHMgZm91bmRcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGltaXQgPSBpbXBvcnRhbnRTdGVwTGVuZ3RoIC8gKHV0bWUuc3RhdGUucnVuLnNwZWVkID09ICdyZWFsdGltZScgPyAnMScgOiB1dG1lLnN0YXRlLnJ1bi5zcGVlZCk7XG4gICAgICAgIGlmIChnbG9iYWwuYW5ndWxhcikge1xuICAgICAgICAgICAgd2FpdEZvckFuZ3VsYXIoJ1tuZy1hcHBdJykudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKHV0bWUuc3RhdGUucnVuLnNwZWVkID09PSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIHRpbWVvdXQpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHV0bWUuc3RhdGUucnVuLnNwZWVkID09PSAnZmFzdGVzdCcpIHtcbiAgICAgICAgICAgICAgICAgIHRyeUZpbmQoKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgTWF0aC5taW4odGltZW91dCAqIHV0bWUuc3RhdGUucnVuLnNwZWVkLCBsaW1pdCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnJ1bi5zcGVlZCA9PT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgdGltZW91dCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHV0bWUuc3RhdGUucnVuLnNwZWVkID09PSAnZmFzdGVzdCcpIHtcbiAgICAgICAgICAgICAgICB0cnlGaW5kKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgTWF0aC5taW4odGltZW91dCAqIHV0bWUuc3RhdGUucnVuLnNwZWVkLCBsaW1pdCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVvdXQoc2NlbmFyaW8sIGlkeCkge1xuICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIC8vIElmIHRoZSBwcmV2aW91cyBzdGVwIGlzIGEgdmFsaWRhdGUgc3RlcCwgdGhlbiBqdXN0IG1vdmUgb24sIGFuZCBwcmV0ZW5kIGl0IGlzbid0IHRoZXJlXG4gICAgICAgIC8vIE9yIGlmIGl0IGlzIGEgc2VyaWVzIG9mIGtleXMsIHRoZW4gZ29cbiAgICAgICAgaWYgKHNjZW5hcmlvLnN0ZXBzW2lkeCAtIDFdLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmFyaW8uc3RlcHNbaWR4XS50aW1lU3RhbXAgLSBzY2VuYXJpby5zdGVwc1tpZHggLSAxXS50aW1lU3RhbXA7XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXAsIHRpbWVvdXQpIHtcbiAgICAvLyBNYWtlIHN1cmUgd2UgYXJlbid0IGdvaW5nIHRvIG92ZXJmbG93IHRoZSBjYWxsIHN0YWNrLlxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChzY2VuYXJpby5zdGVwcy5sZW5ndGggPiAoaWR4ICsgMSkpIHtcbiAgICAgICAgICAgIHJ1blN0ZXAoc2NlbmFyaW8sIGlkeCArIDEsIHRvU2tpcCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1dG1lLnN0b3BTY2VuYXJpbyh0cnVlKTtcbiAgICAgICAgfVxuICAgIH0sIHRpbWVvdXQgfHwgMCk7XG59XG5cbmZ1bmN0aW9uIGZyYWdtZW50RnJvbVN0cmluZyhzdHJIVE1MKSB7XG4gICAgdmFyIHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIHRlbXAuaW5uZXJIVE1MID0gc3RySFRNTDtcbiAgICAvLyBjb25zb2xlLmxvZyh0ZW1wLmlubmVySFRNTCk7XG4gICAgcmV0dXJuIHRlbXAuY29udGVudCA/IHRlbXAuY29udGVudCA6IHRlbXA7XG59XG5cbmZ1bmN0aW9uIGdldFVuaXF1ZUlkRnJvbVN0ZXAoc3RlcCkge1xuICAgIHJldHVybiBzdGVwICYmIHN0ZXAuZGF0YSAmJiBzdGVwLmRhdGEubG9jYXRvciAmJiBzdGVwLmRhdGEubG9jYXRvci51bmlxdWVJZDtcbn1cblxudmFyIGd1aWQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIHM0KCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAgICAgICAgIC50b1N0cmluZygxNilcbiAgICAgICAgICAgIC5zdWJzdHJpbmcoMSk7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICtcbiAgICAgICAgICAgIHM0KCkgKyAnLScgKyBzNCgpICsgczQoKSArIHM0KCk7XG4gICAgfTtcbn0pKCk7XG5cbnZhciBsaXN0ZW5lcnMgPSBbXTtcbnZhciBzdGF0ZTtcbnZhciBzZXR0aW5ncztcbnZhciB1dG1lID0ge1xuICAgIHN0YXRlOiBzdGF0ZSxcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzY2VuYXJpbyA9IGdldFBhcmFtZXRlckJ5TmFtZSgndXRtZV9zY2VuYXJpbycpO1xuICAgICAgICByZXR1cm4gdXRtZS5sb2FkU2V0dGluZ3MoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gdXRtZS5zdGF0ZSA9IHV0bWUubG9hZFN0YXRlRnJvbVN0b3JhZ2UoKTtcbiAgICAgICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnSU5JVElBTElaRUQnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUudGVzdFNlcnZlciA9IGdldFBhcmFtZXRlckJ5TmFtZShcInV0bWVfdGVzdF9zZXJ2ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmF1dG9SdW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBydW5Db25maWcgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3V0bWVfcnVuX2NvbmZpZycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocnVuQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5Db25maWcgPSBKU09OLnBhcnNlKHJ1bkNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcnVuQ29uZmlnID0gcnVuQ29uZmlnIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3BlZWQgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3V0bWVfcnVuX3NwZWVkJykgfHwgc2V0dGluZ3MuZ2V0KFwicnVubmVyLnNwZWVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3BlZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkNvbmZpZy5zcGVlZCA9IHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdXRtZS5ydW5TY2VuYXJpbyhzY2VuYXJpbywgcnVuQ29uZmlnKTtcbiAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSB1dG1lLnN0YXRlID0gdXRtZS5sb2FkU3RhdGVGcm9tU3RvcmFnZSgpO1xuICAgICAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdJTklUSUFMSVpFRCcpO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiUExBWUlOR1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHN0YXRlLnJ1bi5zY2VuYXJpbywgc3RhdGUucnVuLnN0ZXBJbmRleCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghc3RhdGUuc3RhdHVzIHx8IHN0YXRlLnN0YXR1cyA9PT0gJ0lOSVRJQUxJWklORycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJMT0FERURcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgYnJvYWRjYXN0OiBmdW5jdGlvbiAoZXZ0LCBldnREYXRhKSB7XG4gICAgICAgIGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnNbaV0oZXZ0LCBldnREYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgc3RhcnRSZWNvcmRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHN0YXRlLnN0YXR1cyAhPSAnUkVDT1JESU5HJykge1xuICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gJ1JFQ09SRElORyc7XG4gICAgICAgICAgICBzdGF0ZS5zdGVwcyA9IFtdO1xuICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJSZWNvcmRpbmcgU3RhcnRlZFwiKTtcbiAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdSRUNPUkRJTkdfU1RBUlRFRCcpO1xuXG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoXCJsb2FkXCIsIHtcbiAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogd2luZG93LmxvY2F0aW9uLmhvc3QsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogd2luZG93LmxvY2F0aW9uLnNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgaGFzaDogd2luZG93LmxvY2F0aW9uLmhhc2hcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBydW5TY2VuYXJpbzogZnVuY3Rpb24gKG5hbWUsIGNvbmZpZykge1xuICAgICAgICB2YXIgdG9SdW4gPSBuYW1lIHx8IHByb21wdCgnU2NlbmFyaW8gdG8gcnVuJyk7XG4gICAgICAgIHZhciBhdXRvUnVuID0gIW5hbWUgPyBwcm9tcHQoJ1dvdWxkIHlvdSBsaWtlIHRvIHN0ZXAgdGhyb3VnaCBlYWNoIHN0ZXAgKHl8bik/JykgIT0gJ3knIDogdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGdldFNjZW5hcmlvKHRvUnVuKS50aGVuKGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgICAgICAgICAgc2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNjZW5hcmlvKSk7XG4gICAgICAgICAgICB1dG1lLnN0YXRlLnJ1biA9IF8uZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICBzcGVlZDogJzEwJ1xuICAgICAgICAgICAgfSwgY29uZmlnKTtcblxuICAgICAgICAgICAgc2V0dXBDb25kaXRpb25zKHNjZW5hcmlvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hdXRvUnVuID0gYXV0b1J1biA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIlBMQVlJTkdcIjtcblxuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiU3RhcnRpbmcgU2NlbmFyaW8gJ1wiICsgbmFtZSArIFwiJ1wiLCBzY2VuYXJpbyk7XG4gICAgICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1BMQVlCQUNLX1NUQVJURUQnKTtcblxuICAgICAgICAgICAgICAgIHJ1blN0ZXAoc2NlbmFyaW8sIDApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgcnVuTmV4dFN0ZXA6IHJ1bk5leHRTdGVwLFxuICAgIHN0b3BTY2VuYXJpbzogZnVuY3Rpb24gKHN1Y2Nlc3MpIHtcbiAgICAgICAgdmFyIHNjZW5hcmlvID0gc3RhdGUucnVuICYmIHN0YXRlLnJ1bi5zY2VuYXJpbztcbiAgICAgICAgZGVsZXRlIHN0YXRlLnJ1bjtcbiAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJMT0FERURcIjtcbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1BMQVlCQUNLX1NUT1BQRUQnKTtcblxuICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0b3BwaW5nIFNjZW5hcmlvXCIpO1xuICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRTdWNjZXNzKFwiW1NVQ0NFU1NdIFNjZW5hcmlvICdcIiArIHNjZW5hcmlvLm5hbWUgKyBcIicgQ29tcGxldGVkIVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBvbiBwYWdlIFwiICsgd2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0RXJyb3IoXCJbRkFJTFVSRV0gU2NlbmFyaW8gJ1wiICsgc2NlbmFyaW8ubmFtZSArIFwiJyBTdG9wcGVkIVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgdGVtcG9yYXJ5IGVsZW1lbnQgbG9jYXRvciwgZm9yIHVzZSB3aXRoIGZpbmFsaXplTG9jYXRvclxuICAgICAqL1xuICAgIGNyZWF0ZUVsZW1lbnRMb2NhdG9yOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgdW5pcXVlSWQgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtdW5pcXVlLWlkXCIpIHx8IGd1aWQoKTtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXVuaXF1ZS1pZFwiLCB1bmlxdWVJZCk7XG5cbiAgICAgICAgdmFyIGVsZUh0bWwgPSBlbGVtZW50LmNsb25lTm9kZSgpLm91dGVySFRNTDtcbiAgICAgICAgdmFyIGVsZVNlbGVjdG9ycyA9IFtdO1xuICAgICAgICBpZiAoZWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT0gJ0JPRFknIHx8IGVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09ICdIVE1MJykge1xuICAgICAgICAgICAgZWxlU2VsZWN0b3JzID0gW2VsZW1lbnQudGFnTmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVTZWxlY3RvcnMgPSBzZWxlY3RvckZpbmRlcihlbGVtZW50LCBkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdW5pcXVlSWQ6IHVuaXF1ZUlkLFxuICAgICAgICAgICAgc2VsZWN0b3JzOiBlbGVTZWxlY3RvcnNcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgcmVnaXN0ZXJFdmVudDogZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGF0YSwgaWR4KSB7XG4gICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkgfHwgdXRtZS5pc1ZhbGlkYXRpbmcoKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBpZHggPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBpZHggPSB1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlLnN0ZXBzW2lkeF0gPSB7XG4gICAgICAgICAgICAgICAgZXZlbnROYW1lOiBldmVudE5hbWUsXG4gICAgICAgICAgICAgICAgdGltZVN0YW1wOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0VWRU5UX1JFR0lTVEVSRUQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0TG9nOiBmdW5jdGlvbiAobG9nLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0ubG9nKGxvZywgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRFcnJvcjogZnVuY3Rpb24gKGVycm9yLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0uZXJyb3IoZXJyb3IsIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0U3VjY2VzczogZnVuY3Rpb24gKG1lc3NhZ2UsIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5zdWNjZXNzKG1lc3NhZ2UsIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVnaXN0ZXJMaXN0ZW5lcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgbGlzdGVuZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclNhdmVIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBzYXZlSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyUmVwb3J0SGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgcmVwb3J0SGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyTG9hZEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGxvYWRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJTZXR0aW5nc0xvYWRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBzZXR0aW5nc0xvYWRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgaXNSZWNvcmRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlJFQ09SRElOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIGlzUGxheWluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiUExBWUlOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIGlzVmFsaWRhdGluZzogZnVuY3Rpb24odmFsaWRhdGluZykge1xuICAgICAgICBpZiAodHlwZW9mIHZhbGlkYXRpbmcgIT09ICd1bmRlZmluZWQnICYmICh1dG1lLmlzUmVjb3JkaW5nKCkgfHwgdXRtZS5pc1ZhbGlkYXRpbmcoKSkpIHtcbiAgICAgICAgICAgIHV0bWUuc3RhdGUuc3RhdHVzID0gdmFsaWRhdGluZyA/IFwiVkFMSURBVElOR1wiIDogXCJSRUNPUkRJTkdcIjtcbiAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdWQUxJREFUSU9OX0NIQU5HRUQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlZBTElEQVRJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBzdG9wUmVjb3JkaW5nOiBmdW5jdGlvbiAoaW5mbykge1xuICAgICAgICBpZiAoaW5mbyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHZhciBuZXdTY2VuYXJpbyA9IHtcbiAgICAgICAgICAgICAgICBzdGVwczogc3RhdGUuc3RlcHNcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIF8uZXh0ZW5kKG5ld1NjZW5hcmlvLCBpbmZvKTtcblxuICAgICAgICAgICAgaWYgKCFuZXdTY2VuYXJpby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgbmV3U2NlbmFyaW8ubmFtZSA9IHByb21wdCgnRW50ZXIgc2NlbmFyaW8gbmFtZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobmV3U2NlbmFyaW8ubmFtZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnNjZW5hcmlvcy5wdXNoKG5ld1NjZW5hcmlvKTtcblxuICAgICAgICAgICAgICAgIGlmIChzYXZlSGFuZGxlcnMgJiYgc2F2ZUhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNhdmVIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUhhbmRsZXJzW2ldKG5ld1NjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLnN0YXR1cyA9ICdMT0FERUQnO1xuXG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdSRUNPUkRJTkdfU1RPUFBFRCcpO1xuXG4gICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0b3BwZWRcIiwgbmV3U2NlbmFyaW8pO1xuICAgIH0sXG5cbiAgICBsb2FkU2V0dGluZ3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2V0dGluZ3MgPSB1dG1lLnNldHRpbmdzID0gbmV3IFNldHRpbmdzKCk7XG4gICAgICAgIGlmIChzZXR0aW5nc0xvYWRIYW5kbGVycy5sZW5ndGggPiAwICYmICFnZXRQYXJhbWV0ZXJCeU5hbWUoJ3V0bWVfc2NlbmFyaW8nKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5nc0xvYWRIYW5kbGVyc1swXShmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5zZXREZWZhdWx0cyhyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbG9hZFN0YXRlRnJvbVN0b3JhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHV0bWVTdGF0ZVN0ciA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd1dG1lJyk7XG4gICAgICAgIGlmICh1dG1lU3RhdGVTdHIpIHtcbiAgICAgICAgICAgIHN0YXRlID0gSlNPTi5wYXJzZSh1dG1lU3RhdGVTdHIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcIklOSVRJQUxJWklOR1wiLFxuICAgICAgICAgICAgICAgIHNjZW5hcmlvczogW11cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICBzYXZlU3RhdGVUb1N0b3JhZ2U6IGZ1bmN0aW9uICh1dG1lU3RhdGUpIHtcbiAgICAgICAgaWYgKHV0bWVTdGF0ZSkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3V0bWUnLCBKU09OLnN0cmluZ2lmeSh1dG1lU3RhdGUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCd1dG1lJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5sb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHV0bWUuc2F2ZVN0YXRlVG9TdG9yYWdlKHN0YXRlKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiB0b2dnbGVIaWdobGlnaHQoZWxlLCB2YWx1ZSkge1xuICAgICQoZWxlKS50b2dnbGVDbGFzcygndXRtZS12ZXJpZnknLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVJlYWR5KGVsZSwgdmFsdWUpIHtcbiAgICAkKGVsZSkudG9nZ2xlQ2xhc3MoJ3V0bWUtcmVhZHknLCB2YWx1ZSk7XG59XG5cbi8qKlxuICogSWYgeW91IGNsaWNrIG9uIGEgc3BhbiBpbiBhIGxhYmVsLCB0aGUgc3BhbiB3aWxsIGNsaWNrLFxuICogdGhlbiB0aGUgYnJvd3NlciB3aWxsIGZpcmUgdGhlIGNsaWNrIGV2ZW50IGZvciB0aGUgaW5wdXQgY29udGFpbmVkIHdpdGhpbiB0aGUgc3BhbixcbiAqIFNvLCB3ZSBvbmx5IHdhbnQgdG8gdHJhY2sgdGhlIGlucHV0IGNsaWNrcy5cbiAqL1xuZnVuY3Rpb24gaXNOb3RJbkxhYmVsT3JWYWxpZChlbGUpIHtcbiAgICByZXR1cm4gJChlbGUpLnBhcmVudHMoJ2xhYmVsJykubGVuZ3RoID09IDAgfHxcbiAgICAgICAgICBlbGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSAnaW5wdXQnO1xufVxuXG52YXIgdGltZXJzID0gW107XG5cbmZ1bmN0aW9uIGluaXRFdmVudEhhbmRsZXJzKCkge1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudHNbaV0sIChmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUuaXNUcmlnZ2VyKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpICYmXG4gICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0Lmhhc0F0dHJpYnV0ZSAmJlxuICAgICAgICAgICAgICAgICAgICAhZS50YXJnZXQuaGFzQXR0cmlidXRlKCdkYXRhLWlnbm9yZScpICYmXG4gICAgICAgICAgICAgICAgICAgICQoZS50YXJnZXQpLnBhcmVudHMoXCJbZGF0YS1pZ25vcmVdXCIpLmxlbmd0aCA9PSAwICYmXG4gICAgICAgICAgICAgICAgICAgIGlzTm90SW5MYWJlbE9yVmFsaWQoZS50YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IHV0bWUuc3RhdGUuc3RlcHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdG9yOiB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGUudGFyZ2V0KVxuICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVyO1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggfHwgZS5idXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5idXR0b24gPSBlLndoaWNoIHx8IGUuYnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChldnQgPT0gJ21vdXNlb3ZlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZS50YXJnZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcjogc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlUmVhZHkoZS50YXJnZXQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgNTAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnbW91c2VvdXQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGltZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGltZXJzW2ldLmVsZW1lbnQgPT0gZS50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXJzW2ldLnRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWFkeShlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChldnQgPT0gJ2NoYW5nZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy52YWx1ZSA9IGUudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudChldnQsIGFyZ3MsIGlkeCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBIQUNLIGZvciB0ZXN0aW5nXG4gICAgICAgICAgICAodXRtZS5ldmVudExpc3RlbmVycyA9IHV0bWUuZXZlbnRMaXN0ZW5lcnMgfHwge30pW2V2dF0gPSBoYW5kbGVyO1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgICAgIH0pKGV2ZW50c1tpXSksIHRydWUpO1xuICAgIH1cblxuICAgIHZhciBfdG9fYXNjaWkgPSB7XG4gICAgICAgICcxODgnOiAnNDQnLFxuICAgICAgICAnMTA5JzogJzQ1JyxcbiAgICAgICAgJzE5MCc6ICc0NicsXG4gICAgICAgICcxOTEnOiAnNDcnLFxuICAgICAgICAnMTkyJzogJzk2JyxcbiAgICAgICAgJzIyMCc6ICc5MicsXG4gICAgICAgICcyMjInOiAnMzknLFxuICAgICAgICAnMjIxJzogJzkzJyxcbiAgICAgICAgJzIxOSc6ICc5MScsXG4gICAgICAgICcxNzMnOiAnNDUnLFxuICAgICAgICAnMTg3JzogJzYxJywgLy9JRSBLZXkgY29kZXNcbiAgICAgICAgJzE4Nic6ICc1OScsIC8vSUUgS2V5IGNvZGVzXG4gICAgICAgICcxODknOiAnNDUnIC8vSUUgS2V5IGNvZGVzXG4gICAgfTtcblxuICAgIHZhciBzaGlmdFVwcyA9IHtcbiAgICAgICAgXCI5NlwiOiBcIn5cIixcbiAgICAgICAgXCI0OVwiOiBcIiFcIixcbiAgICAgICAgXCI1MFwiOiBcIkBcIixcbiAgICAgICAgXCI1MVwiOiBcIiNcIixcbiAgICAgICAgXCI1MlwiOiBcIiRcIixcbiAgICAgICAgXCI1M1wiOiBcIiVcIixcbiAgICAgICAgXCI1NFwiOiBcIl5cIixcbiAgICAgICAgXCI1NVwiOiBcIiZcIixcbiAgICAgICAgXCI1NlwiOiBcIipcIixcbiAgICAgICAgXCI1N1wiOiBcIihcIixcbiAgICAgICAgXCI0OFwiOiBcIilcIixcbiAgICAgICAgXCI0NVwiOiBcIl9cIixcbiAgICAgICAgXCI2MVwiOiBcIitcIixcbiAgICAgICAgXCI5MVwiOiBcIntcIixcbiAgICAgICAgXCI5M1wiOiBcIn1cIixcbiAgICAgICAgXCI5MlwiOiBcInxcIixcbiAgICAgICAgXCI1OVwiOiBcIjpcIixcbiAgICAgICAgXCIzOVwiOiBcIlxcXCJcIixcbiAgICAgICAgXCI0NFwiOiBcIjxcIixcbiAgICAgICAgXCI0NlwiOiBcIj5cIixcbiAgICAgICAgXCI0N1wiOiBcIj9cIlxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBrZXlQcmVzc0hhbmRsZXIgKGUpIHtcbiAgICAgICAgaWYgKGUuaXNUcmlnZ2VyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkgJiYgZS50YXJnZXQuaGFzQXR0cmlidXRlICYmICFlLnRhcmdldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykgJiYgJChlLnRhcmdldCkucGFyZW50cyhcIltkYXRhLWlnbm9yZV1cIikubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHZhciBjID0gZS53aGljaDtcblxuICAgICAgICAgICAgLy8gVE9ETzogRG9lc24ndCB3b3JrIHdpdGggY2FwcyBsb2NrXG4gICAgICAgICAgICAvL25vcm1hbGl6ZSBrZXlDb2RlXG4gICAgICAgICAgICBpZiAoX3RvX2FzY2lpLmhhc093blByb3BlcnR5KGMpKSB7XG4gICAgICAgICAgICAgICAgYyA9IF90b19hc2NpaVtjXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFlLnNoaWZ0S2V5ICYmIChjID49IDY1ICYmIGMgPD0gOTApKSB7XG4gICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyArIDMyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBzaGlmdFVwcy5oYXNPd25Qcm9wZXJ0eShjKSkge1xuICAgICAgICAgICAgICAgIC8vZ2V0IHNoaWZ0ZWQga2V5Q29kZSB2YWx1ZVxuICAgICAgICAgICAgICAgIGMgPSBzaGlmdFVwc1tjXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudCgna2V5cHJlc3MnLCB7XG4gICAgICAgICAgICAgICAgbG9jYXRvcjogdXRtZS5jcmVhdGVFbGVtZW50TG9jYXRvcihlLnRhcmdldCksXG4gICAgICAgICAgICAgICAga2V5OiBjLFxuICAgICAgICAgICAgICAgIHByZXZWYWx1ZTogZS50YXJnZXQudmFsdWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGUudGFyZ2V0LnZhbHVlICsgYyxcbiAgICAgICAgICAgICAgICBrZXlDb2RlOiBlLmtleUNvZGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCBrZXlQcmVzc0hhbmRsZXIsIHRydWUpO1xuXG4gICAgLy8gSEFDSyBmb3IgdGVzdGluZ1xuICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbJ2tleXByZXNzJ10gPSBrZXlQcmVzc0hhbmRsZXI7XG59XG5cbmZ1bmN0aW9uIGdldFBhcmFtZXRlckJ5TmFtZShuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKTtcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKSxcbiAgICAgICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKTtcbiAgICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IFwiXCIgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcbn1cblxuZnVuY3Rpb24gYm9vdHN0cmFwVXRtZSgpIHtcbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gXCJjb21wbGV0ZVwiKSB7XG4gICAgdXRtZS5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgaW5pdEV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpKSB7XG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoXCJsb2FkXCIsIHtcbiAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogd2luZG93LmxvY2F0aW9uLmhvc3QsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogd2luZG93LmxvY2F0aW9uLnNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgaGFzaDogd2luZG93LmxvY2F0aW9uLmhhc2hcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmJvb3RzdHJhcFV0bWUoKTtcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3JlYWR5c3RhdGVjaGFuZ2UnLCBib290c3RyYXBVdG1lKTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICB1dG1lLnVubG9hZCgpO1xufSwgdHJ1ZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICB1dG1lLnJlcG9ydExvZyhcIlNjcmlwdCBFcnJvcjogXCIgKyBlcnIubWVzc2FnZSArIFwiOlwiICsgZXJyLnVybCArIFwiLFwiICsgZXJyLmxpbmUgKyBcIjpcIiArIGVyci5jb2wpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gdXRtZTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM1YwYldVdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5b2IyMWxMMlJoZG1sa2RHbDBkSE4zYjNKMGFDOXdjbTlxWldOMGN5OTFkRzFsTDNOeVl5OXFjeTkxZEcxbExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTEVsQlFVa3NRMEZCUXl4SFFVRkhMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dEJRVU16UWl4SlFVRkpMRTlCUVU4c1IwRkJSeXhQUVVGUExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRPMEZCUXpkRExFbEJRVWtzVVVGQlVTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRCUVVOeVF5eEpRVUZKTEdOQlFXTXNSMEZCUnl4UFFVRlBMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNRMEZCUXp0QlFVTnFSQ3hKUVVGSkxGRkJRVkVzUjBGQlJ5eFBRVUZQTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNN08wRkJSWEpETEdkRVFVRm5SRHRCUVVOb1JDeEpRVUZKTEcxQ1FVRnRRaXhIUVVGSExFZEJRVWNzUTBGQlF6dEJRVU01UWl4SlFVRkpMRmxCUVZrc1IwRkJSeXhGUVVGRkxFTkJRVU03UVVGRGRFSXNTVUZCU1N4alFVRmpMRWRCUVVjc1JVRkJSU3hEUVVGRE8wRkJRM2hDTEVsQlFVa3NXVUZCV1N4SFFVRkhMRVZCUVVVc1EwRkJRenRCUVVOMFFpeEpRVUZKTEc5Q1FVRnZRaXhIUVVGSExFVkJRVVVzUTBGQlF6czdRVUZGT1VJc1UwRkJVeXhYUVVGWExFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlEzWkNMRTlCUVU4c1NVRkJTU3hQUVVGUExFTkJRVU1zVlVGQlZTeFBRVUZQTEVWQlFVVXNUVUZCVFN4RlFVRkZPMUZCUXpGRExFbEJRVWtzV1VGQldTeERRVUZETEUxQlFVMHNTMEZCU3l4RFFVRkRMRVZCUVVVN1dVRkRNMElzU1VGQlNTeExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJRenRaUVVOMlFpeExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3WjBKQlF6ZERMRWxCUVVrc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRXRCUVVzc1NVRkJTU3hGUVVGRk8yOUNRVU5zUXl4UFFVRlBMRU5CUVVNc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMmxDUVVNdlFqdGhRVU5LTzFOQlEwb3NUVUZCVFR0WlFVTklMRmxCUVZrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1owSkJRMnhETEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOcVFpeERRVUZETEVOQlFVTTdVMEZEVGp0TFFVTktMRU5CUVVNc1EwRkJRenREUVVOT08wRkJRMFFzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4RFFVRkRPenRCUVVWMlFpeEpRVUZKTEUxQlFVMHNSMEZCUnp0SlFVTlVMRTlCUVU4N1NVRkRVQ3hQUVVGUE8wbEJRMUFzVFVGQlRUdEJRVU5XTEVsQlFVa3NWVUZCVlR0QlFVTmtPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGQlJVRXNTVUZCU1N4WFFVRlhPenRKUVVWWUxGbEJRVms3U1VGRFdpeFpRVUZaTzBsQlExb3NWVUZCVlR0SlFVTldMRmRCUVZjN1NVRkRXQ3hUUVVGVE8wRkJRMklzU1VGQlNTeFJRVUZSTzBGQlExbzdPMEZCUlVFc1EwRkJReXhEUVVGRE96dEJRVVZHTEZOQlFWTXNaMEpCUVdkQ0xFVkJRVVVzVVVGQlVTeEZRVUZGTzBsQlEycERMRWxCUVVrc1MwRkJTeXhIUVVGSExGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTTdRVUZETDBJc1NVRkJTU3hKUVVGSkxGTkJRVk1zUjBGQlJ5eExRVUZMTEVsQlFVa3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJRenM3U1VGRmVrTXNTVUZCU1N4VFFVRlRMRVZCUVVVN1VVRkRXQ3hQUVVGUExFOUJRVThzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRWRCUVVjc1EwRkJReXhUUVVGVExFVkJRVVVzVlVGQlZTeFpRVUZaTEVWQlFVVTdXVUZEZUVRc1QwRkJUeXhYUVVGWExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1lVRkJZU3hGUVVGRk8yTkJRemRFTEdGQlFXRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNc1EwRkJRenRqUVVNeFJDeFBRVUZQTEdGQlFXRXNRMEZCUXl4TFFVRkxMRU5CUVVNN1lVRkROVUlzUTBGQlF5eERRVUZETzFOQlEwNHNRMEZCUXl4RFFVRkRMRU5CUVVNN1MwRkRVQ3hOUVVGTk8xRkJRMGdzVDBGQlR5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRE8wdEJRemxDTzBGQlEwd3NRMEZCUXpzN1FVRkZSQ3hUUVVGVExHbENRVUZwUWl4RlFVRkZMRkZCUVZFc1JVRkJSVHRKUVVOc1F5eEpRVUZKTEU5QlFVOHNSMEZCUnl4UlFVRlJMRU5CUVVNc1QwRkJUeXhEUVVGRE8wRkJRMjVETEVsQlFVa3NTVUZCU1N4VFFVRlRMRWRCUVVjc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTTdPMGxCUlRkRExFbEJRVWtzVTBGQlV5eEZRVUZGTzFGQlExZ3NUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RlFVRkZMRlZCUVZVc1dVRkJXU3hGUVVGRk8xbEJRM2hFTEU5QlFVOHNWMEZCVnl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEdGQlFXRXNSVUZCUlR0alFVTTNSQ3hoUVVGaExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHRkJRV0VzUTBGQlF5eERRVUZETEVOQlFVTTdZMEZETVVRc1QwRkJUeXhoUVVGaExFTkJRVU1zUzBGQlN5eERRVUZETzJGQlF6VkNMRU5CUVVNc1EwRkJRenRUUVVOT0xFTkJRVU1zUTBGQlF5eERRVUZETzB0QlExQXNUVUZCVFR0UlFVTklMRTlCUVU4c1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eEZRVUZGTEVOQlFVTXNRMEZCUXp0TFFVTTVRanRCUVVOTUxFTkJRVU03TzBGQlJVUXNVMEZCVXl4M1FrRkJkMElzUTBGQlF5eExRVUZMTEVWQlFVVTdTVUZEY2tNc1NVRkJTU3hSUVVGUkxFZEJRVWNzUlVGQlJTeERRVUZETzBsQlEyeENMRWxCUVVrc1owSkJRV2RDTEVOQlFVTTdTVUZEY2tJc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRXRCUVVzc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdVVUZEYmtNc1NVRkJTU3hUUVVGVExFZEJRVWNzUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMUZCUTNwQ0xFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlR0WlFVTlFMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4TFFVRkxMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTnVReXhKUVVGSkxFbEJRVWtzUjBGQlJ5eFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1owSkJRM2hDTEVsQlFVa3NTVUZCU1N4SFFVRkhMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF5eERRVUZETEZOQlFWTXNSMEZCUnl4RlFVRkZMRU5CUVVNN1owSkJRM0JGTEdkQ1FVRm5RaXhKUVVGSkxFbEJRVWtzUTBGQlF6dG5Ra0ZEZWtJc1UwRkJVeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZOQlFWTXNSMEZCUnl4blFrRkJaMElzUTBGQlF6dGhRVU0zUXp0VFFVTktMRTFCUVUwN1dVRkRTQ3huUWtGQlowSXNSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zVTBGQlV5eERRVUZETzFOQlF6ZERPMUZCUTBRc1VVRkJVU3hIUVVGSExGRkJRVkVzUTBGQlF5eE5RVUZOTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN1MwRkRla003U1VGRFJDeFBRVUZQTEZGQlFWRXNRMEZCUXp0QlFVTndRaXhEUVVGRE96dEJRVVZFTEZOQlFWTXNaVUZCWlN4RlFVRkZMRkZCUVZFc1JVRkJSVHRKUVVOb1F5eEpRVUZKTEZGQlFWRXNSMEZCUnl4RlFVRkZMRU5CUVVNN1NVRkRiRUlzVDBGQlR5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRPMUZCUTJZc1owSkJRV2RDTEVOQlFVTXNVVUZCVVN4RFFVRkRPMUZCUXpGQ0xHbENRVUZwUWl4RFFVRkRMRkZCUVZFc1EwRkJRenRMUVVNNVFpeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1ZVRkJWU3hGUVVGRk8xRkJRekZDTEVsQlFVa3NVMEZCVXl4SFFVRkhMRlZCUVZVc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFVkJRVVVzVlVGQlZTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1VVRkRkRVVzVVVGQlVTeERRVUZETEV0QlFVc3NSMEZCUnl4M1FrRkJkMElzUTBGQlF5eFRRVUZUTEVOQlFVTXNRMEZCUXp0TFFVTjRSQ3hEUVVGRExFTkJRVU03UVVGRFVDeERRVUZET3p0QlFVVkVMRk5CUVZNc1QwRkJUeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVXNUVUZCVFN4RlFVRkZPMGxCUTNCRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNZMEZCWXl4RFFVRkRMRU5CUVVNN1FVRkRia01zU1VGQlNTeE5RVUZOTEVkQlFVY3NUVUZCVFN4SlFVRkpMRVZCUVVVc1EwRkJRenM3U1VGRmRFSXNTVUZCU1N4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0SlFVTXZRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRPMGxCUTNaQ0xFbEJRVWtzU1VGQlNTeEpRVUZKTEV0QlFVc3NRMEZCUXl4TlFVRk5MRWxCUVVrc1UwRkJVeXhGUVVGRk8xRkJRMjVETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1VVRkJVU3hIUVVGSExGRkJRVkVzUTBGQlF6dFJRVU01UWl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUjBGQlJ5eEhRVUZITEVOQlFVTTdVVUZETVVJc1NVRkJTU3hKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEUxQlFVMHNSVUZCUlR0WlFVTXhRaXhKUVVGSkxGZEJRVmNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF6dFpRVU55UlN4SlFVRkpMRTFCUVUwc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4TlFVRk5MRU5CUVVNN1FVRkRPVU1zV1VGQldTeEpRVUZKTEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEpRVUZKTEVOQlFVTTdPMWxCUlRsQ0xFbEJRVWtzVFVGQlRTeEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRTFCUVUwc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJUdG5Ra0ZETDBJc1RVRkJUU3hIUVVGSExFZEJRVWNzUjBGQlJ5eE5RVUZOTEVOQlFVTTdZVUZEZWtJN1dVRkRSQ3hKUVVGSkxGTkJRVk1zUjBGQlJ5eERRVUZETEZGQlFWRXNRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hIUVVGSExGRkJRVkVzUTBGQlF5eEpRVUZKTEVkQlFVY3NVVUZCVVN4RFFVRkRMRTFCUVUwc1QwRkJUeXhYUVVGWExFZEJRVWNzVFVGQlRTeERRVUZETEVOQlFVTTdRVUZEY0Vnc1dVRkJXU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFVOHNRMEZCUXl4WFFVRlhMRWRCUVVjc1NVRkJTU3hIUVVGSExFMUJRVTBzUTBGQlF5eERRVUZET3p0WlFVVnlSQ3hQUVVGUExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4UlFVRlJMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNN1FVRkRMMFVzV1VGQldTeFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEZGQlFWRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEpRVUZKTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTTdRVUZET1VZN1FVRkRRVHM3V1VGRldTeEpRVUZKTEZOQlFWTXNSVUZCUlR0blFrRkRXQ3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEUxQlFVMHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRCUVVNM1F5eGhRVUZoT3p0VFFVVktMRTFCUVUwc1NVRkJTU3hKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEZOQlFWTXNSVUZCUlR0WlFVTndReXhKUVVGSkxFdEJRVXNzUTBGQlF5eFBRVUZQTEVWQlFVVTdaMEpCUTJZc1YwRkJWeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVXNUVUZCVFN4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEZUVRN1UwRkRTaXhOUVVGTk8xbEJRMGdzU1VGQlNTeFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU03V1VGRGFFTXNTVUZCU1N4TFFVRkxMRWRCUVVjc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF6dEJRVU4yUXl4WlFVRlpMRWxCUVVrc1VVRkJVU3hIUVVGSExHMUNRVUZ0UWl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRM0pFT3p0WlFVVlpMRWxCUVVrc1QwRkJUeXhOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEVsQlFVa3NWMEZCVnl4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NTVUZCU1N4VlFVRlZMRVZCUVVVN1kwRkRhRVlzU1VGQlNTeEpRVUZKTEVOQlFVTTdZMEZEVkN4SlFVRkpMRTFCUVUwc1IwRkJSeXhMUVVGTExFTkJRVU03WTBGRGJrSXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1IwRkJSeXhGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTXpReXhKUVVGSkxGTkJRVk1zUjBGQlJ5eExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1owSkJRM3BDTEVsQlFVa3NZVUZCWVN4SFFVRkhMRzFDUVVGdFFpeERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPMmRDUVVOdVJDeEpRVUZKTEZGQlFWRXNTMEZCU3l4aFFVRmhMRVZCUVVVN2EwSkJRemxDTEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVN2MwSkJRMUFzU1VGQlNTeEpRVUZKTEZOQlFWTXNRMEZCUXl4VFFVRlRMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETzNOQ1FVTTVReXhOUVVGTkxFZEJRVWNzUTBGQlF5eGxRVUZsTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1NVRkJTU3hIUVVGSExHMUNRVUZ0UWl4RFFVRkRPMjFDUVVOMFJTeE5RVUZOTEVsQlFVa3NhVUpCUVdsQ0xFTkJRVU1zVTBGQlV5eERRVUZETEVWQlFVVTdjMEpCUTNKRExFMUJRVTBzUjBGQlJ5eExRVUZMTEVOQlFVTTdjMEpCUTJZc1RVRkJUVHR0UWtGRFZEdHBRa0ZEUmp0QlFVTnFRaXhsUVVGbE96dGpRVVZFTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhOUVVGTkxFTkJRVU03UVVGRGVFTXNZVUZCWVR0QlFVTmlPenRaUVVWWkxFbEJRVWtzVFVGQlRTeERRVUZETEcxQ1FVRnRRaXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETEVWQlFVVTdaMEpCUTI1RExGZEJRVmNzUTBGQlF5eFJRVUZSTEVWQlFVVXNSMEZCUnl4RlFVRkZMRTFCUVUwc1EwRkJReXhEUVVGRE8yRkJRM1JETEUxQlFVMDdRVUZEYmtJc1owSkJRV2RDTEdGQlFXRXNRMEZCUXl4UlFVRlJMRVZCUVVVc1NVRkJTU3hGUVVGRkxFOUJRVThzUlVGQlJTeFZRVUZWTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETEZWQlFWVXNTVUZCU1N4RlFVRkZPenRyUWtGRmNrWXNTVUZCU1N4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJ0Q1FVTnNRaXhKUVVGSkxFOUJRVThzUjBGQlJ5eEhRVUZITEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1JVRkJSU3hEUVVGRE8wRkJRekZFTEd0Q1FVRnJRaXhKUVVGSkxHdENRVUZyUWl4SFFVRkhMRTlCUVU4c1MwRkJTeXhQUVVGUExFbEJRVWtzVDBGQlR5eExRVUZMTEZWQlFWVXNTVUZCU1N4SFFVRkhMRU5CUVVNc1dVRkJXU3hEUVVGRExHbENRVUZwUWl4RFFVRkRMRU5CUVVNN08ydENRVVU1Unl4SlFVRkpMRTFCUVUwc1EwRkJReXhQUVVGUExFTkJRVU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1JVRkJSVHR2UWtGRGRrTXNTVUZCU1N4UFFVRlBMRWRCUVVjc1JVRkJSU3hEUVVGRE8yOUNRVU5xUWl4SlFVRkpMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVFVGQlRTeEZRVUZGTzNOQ1FVTndRaXhQUVVGUExFTkJRVU1zUzBGQlN5eEhRVUZITEU5QlFVOHNRMEZCUXl4TlFVRk5MRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTTdRVUZEZUVVc2NVSkJRWEZDTzBGQlEzSkNPenR2UWtGRmIwSXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxFOUJRVThzUlVGQlJUdHpRa0ZETjBJc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenR4UWtGRGVrSXNUVUZCVFN4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFBRVUZQTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hOUVVGTkxFdEJRVXNzUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGVrWXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJTeERRVUZETzNGQ1FVTjJRaXhOUVVGTk8zTkNRVU5NTEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU1zUjBGQlJ5eEZRVUZGTEU5QlFVOHNRMEZCUXl4RFFVRkRPMEZCUXpkRUxIRkNRVUZ4UWpzN2IwSkJSVVFzU1VGQlNTeFBRVUZQTEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1MwRkJTeXhKUVVGSkxGZEJRVmNzUlVGQlJUdEJRVU12UkN4elFrRkJjMElzUjBGQlJ5eERRVUZETEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF6czdjMEpCUlRWQ0xFbEJRVWtzYTBKQlFXdENMRVZCUVVVN2QwSkJRM1JDTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzNWQ1FVTTVRanR6UWtGRFJDeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hSUVVGUkxFTkJRVU1zUTBGQlF6dHhRa0ZETDBJN1FVRkRja0lzYlVKQlFXMUNPenRyUWtGRlJDeEpRVUZKTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1ZVRkJWU3hGUVVGRk8yOUNRVU5vUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhOUVVGTkxFTkJRVU1zV1VGQldTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03YjBKQlEycEVMRkZCUVZFc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eEZRVUZGTEVkQlFVY3NRMEZCUXl4RFFVRkRPMEZCUTJoRUxHOUNRVUZ2UWl4UlFVRlJMRU5CUVVNc1QwRkJUeXhEUVVGRExFZEJRVWNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXpzN2IwSkJSVE5DTEVkQlFVY3NRMEZCUXl4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTTdRVUZEYUVRc2IwSkJRVzlDTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxGRkJRVkVzUTBGQlF5eERRVUZET3p0dlFrRkZPVUlzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU03YjBKQlEzcENMRWxCUVVrc2EwSkJRV3RDTEVWQlFVVTdkMEpCUTNCQ0xGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8zRkNRVU5vUXp0QlFVTnlRaXh0UWtGQmJVSTdPMnRDUVVWRUxFbEJRVWtzU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4VlFVRlZMRVZCUVVVN2IwSkJRMmhETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1dVRkJXU3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxHdENRVUZyUWl4SlFVRkpMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zU1VGQlNTeEhRVUZITEVkQlFVY3NRMEZCUXl4RFFVRkRPMEZCUTI1SkxHMUNRVUZ0UWpzN2EwSkJSVVFzU1VGQlNTeExRVUZMTEVOQlFVTXNUMEZCVHl4RlFVRkZPMjlDUVVOcVFpeFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFTkJRVU1zUTBGQlF6dHRRa0ZEY0VNN2FVSkJRMFlzUlVGQlJTeFZRVUZWTEUxQlFVMHNSVUZCUlR0dlFrRkRha0lzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRlZCUVZVc1JVRkJSVHR6UWtGRGFFTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhaUVVGWkxFZEJRVWNzVFVGQlRTeERRVUZETEVOQlFVTTdjMEpCUTNSRExFbEJRVWtzUTBGQlF5eFpRVUZaTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN2NVSkJRekZDTEUxQlFVMHNTVUZCU1N4bFFVRmxMRU5CUVVNc1NVRkJTU3hEUVVGRExFVkJRVVU3ZDBKQlF6bENMRWxCUVVrc1EwRkJReXhYUVVGWExFTkJRVU1zYTBKQlFXdENMRWRCUVVjc1IwRkJSeXhIUVVGSExGZEJRVmNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SFFVRkhMRmRCUVZjc1IwRkJSeXhOUVVGTkxFTkJRVU1zUTBGQlF6dDNRa0ZEYWtjc1NVRkJTU3hEUVVGRExGbEJRVmtzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0eFFrRkROVUlzVFVGQlRUdHpRa0ZEVEN4SlFVRkpMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eERRVUZETEVWQlFVVTdkMEpCUXpOQ0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN2RVSkJRM2hDTzNOQ1FVTkVMRWxCUVVrc1MwRkJTeXhEUVVGRExFOUJRVThzUlVGQlJUdDNRa0ZEYWtJc1YwRkJWeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVXNUVUZCVFN4RFFVRkRMRU5CUVVNN2RVSkJRM0JETzNGQ1FVTkdPMmxDUVVOS0xFTkJRVU1zUTBGQlF6dGhRVU5PTzFOQlEwbzdTMEZEU2p0QlFVTk1MRU5CUVVNN08wRkJSVVFzVTBGQlV5eGpRVUZqTEVOQlFVTXNXVUZCV1N4RlFVRkZPMGxCUTJ4RExFbEJRVWtzUlVGQlJTeEhRVUZITEZGQlFWRXNRMEZCUXl4aFFVRmhMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU03U1VGRE9VTXNUMEZCVHl4SlFVRkpMRTlCUVU4c1EwRkJReXhWUVVGVkxFOUJRVThzUlVGQlJTeE5RVUZOTEVWQlFVVTdVVUZETVVNc1NVRkJTVHRaUVVOQkxFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTXNUMEZCVHl4RlFVRkZPMmRDUVVOcVFpeE5RVUZOTEVsQlFVa3NTMEZCU3l4RFFVRkRMREJEUVVFd1F5eERRVUZETEVOQlFVTTdZVUZETDBRN1dVRkRSQ3hKUVVGSkxFOUJRVThzUTBGQlF5eGpRVUZqTEVWQlFVVTdaMEpCUTNoQ0xFOUJRVThzUTBGQlF5eGpRVUZqTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1ZVRkJWU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzJGQlEyeEVMRTFCUVUwN1owSkJRMGdzU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeEZRVUZGTEVWQlFVVTdiMEpCUTJwRExFMUJRVTBzU1VGQlNTeExRVUZMTEVOQlFVTXNaMEpCUVdkQ0xFZEJRVWNzV1VGQldTeEhRVUZITEc5Q1FVRnZRanQzUWtGRGJFVXNlVU5CUVhsRExFTkJRVU1zUTBGQlF6dHBRa0ZEYkVRN1owSkJRMFFzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFVkJRVVVzUTBGQlF5eEhRVUZITEVOQlFVTXNWVUZCVlN4RFFVRkRPMmRDUVVNNVF5d3JRa0ZCSzBJc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU0xUXp0VFFVTktMRU5CUVVNc1QwRkJUeXhIUVVGSExFVkJRVVU3V1VGRFZpeE5RVUZOTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1UwRkRaanRMUVVOS0xFTkJRVU1zUTBGQlF6dEJRVU5RTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhsUVVGbExFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlF6TkNMRTlCUVU4c1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFpRVUZaTzFkQlF6bENMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZUdFhRVU0xUWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGbEJRVms3VjBGRE9VSXNTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hYUVVGWE8xZEJRemRDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1RVRkJUVHRYUVVONFFpeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTlCUVU4c1EwRkJRenRCUVVOeVF5eERRVUZET3p0QlFVVkVPenRIUVVWSE8wRkJRMGdzVTBGQlV5eHBRa0ZCYVVJc1EwRkJReXhKUVVGSkxFVkJRVVU3UVVGRGFrTXNTVUZCU1N4SlFVRkpMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETzBGQlF6ZENPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1NVRkZTU3hQUVVGUExFZEJRVWNzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFZEJRVWNzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFZEJRVWNzUTBGQlF5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8wRkJRM2hITEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhoUVVGaExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4UFFVRlBMRVZCUVVVc1QwRkJUeXhGUVVGRkxGZEJRVmNzUlVGQlJUdEpRVU5zUlN4SlFVRkpMRTlCUVU4c1EwRkJRenRKUVVOYUxFOUJRVThzU1VGQlNTeFBRVUZQTEVOQlFVTXNWVUZCVlN4UFFVRlBMRVZCUVVVc1RVRkJUU3hGUVVGRk8xRkJRekZETEZOQlFWTXNUMEZCVHl4SFFVRkhPMWxCUTJZc1NVRkJTU3hEUVVGRExFOUJRVThzUlVGQlJUdG5Ra0ZEVml4UFFVRlBMRWRCUVVjc1NVRkJTU3hKUVVGSkxFVkJRVVVzUTBGQlF5eFBRVUZQTEVWQlFVVXNRMEZCUXp0QlFVTXZReXhoUVVGaE96dFpRVVZFTEVsQlFVa3NTVUZCU1N4RFFVRkRPMWxCUTFRc1NVRkJTU3haUVVGWkxFZEJRVWNzUzBGQlN5eERRVUZETzFsQlEzcENMRWxCUVVrc1ZVRkJWU3hIUVVGSExFdEJRVXNzUTBGQlF6dFpRVU4yUWl4SlFVRkpMR3RDUVVGclFpeEhRVUZITEV0QlFVc3NRMEZCUXp0WlFVTXZRaXhKUVVGSkxHVkJRV1VzUjBGQlJ5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dFpRVU5xUkN4SlFVRkpMRmRCUVZjc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTnFReXhKUVVGSkxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1NVRkJTU3hSUVVGUkxFTkJRVU03V1VGRGJFUXNaVUZCWlN4RFFVRkRMRTlCUVU4c1EwRkJReXh0UWtGQmJVSXNSMEZCUnl4UFFVRlBMRU5CUVVNc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eERRVUZETzFsQlEzWkZMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4bFFVRmxMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTTNReXhKUVVGSkxGRkJRVkVzUjBGQlJ5eGxRVUZsTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1owSkJRMnhETEVsQlFVa3NaVUZCWlN4RFFVRkRMRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU4yUWl4UlFVRlJMRWxCUVVrc1ZVRkJWU3hEUVVGRE8ybENRVU14UWp0blFrRkRSQ3hKUVVGSkxFZEJRVWNzUTBGQlF5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPMmRDUVVOdVFpeEpRVUZKTEVsQlFVa3NRMEZCUXl4TlFVRk5MRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU5zUWl4SlFVRkpMRTlCUVU4c1YwRkJWeXhKUVVGSkxGZEJRVmNzUlVGQlJUdDNRa0ZEYmtNc1NVRkJTU3hQUVVGUExFZEJRVWNzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETzNkQ1FVTm9ReXhKUVVGSkxFTkJRVU1zVlVGQlZTeExRVUZMTEZGQlFWRXNTVUZCU1N4UFFVRlBMRXRCUVVzc1YwRkJWenMyUWtGRGJFUXNWVUZCVlN4TFFVRkxMRlZCUVZVc1NVRkJTU3hQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJReXhGUVVGRk96UkNRVU5zUlN4VlFVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRE96UkNRVU5zUWl4TlFVRk5PM2xDUVVOVUxFMUJRVTA3TkVKQlEwZ3NhMEpCUVd0Q0xFZEJRVWNzU1VGQlNTeERRVUZETzNsQ1FVTTNRanR4UWtGRFNpeE5RVUZOTzNkQ1FVTklMRlZCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU03ZDBKQlEyeENMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zWjBKQlFXZENMRVZCUVVVc1QwRkJUeXhEUVVGRExGRkJRVkVzUTBGQlF5eERRVUZETzNkQ1FVTTVReXhOUVVGTk8zRkNRVU5VTzI5Q1FVTkVMRTFCUVUwN2FVSkJRMVFzVFVGQlRTeEpRVUZKTEVsQlFVa3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhGUVVGRk8yOUNRVU40UWl4WlFVRlpMRWRCUVVjc1NVRkJTU3hEUVVGRE8ybENRVU4yUWp0QlFVTnFRaXhoUVVGaE96dFpRVVZFTEVsQlFVa3NWVUZCVlN4RlFVRkZPMmRDUVVOYUxFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnFRaXhOUVVGTkxFbEJRVWtzWlVGQlpTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1NVRkJTU3hKUVVGSkxFVkJRVVVzUTBGQlF5eFBRVUZQTEVWQlFVVXNSMEZCUnl4UFFVRlBMRWxCUVVrc1QwRkJUeXhIUVVGSExFTkJRVU1zUlVGQlJUdG5Ra0ZEYUVZc1ZVRkJWU3hEUVVGRExFOUJRVThzUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXp0aFFVTXpRaXhOUVVGTk8yZENRVU5JTEVsQlFVa3NUVUZCVFN4SFFVRkhMRVZCUVVVc1EwRkJRenRuUWtGRGFFSXNTVUZCU1N4WlFVRlpMRVZCUVVVN2IwSkJRMlFzVFVGQlRTeEhRVUZITEc5RVFVRnZSQ3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhIUVVGSExHRkJRV0VzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SFFVRkhMRzlEUVVGdlF5eERRVUZETzJsQ1FVTTNTeXhOUVVGTkxFbEJRVWtzYTBKQlFXdENMRVZCUVVVN2IwSkJRek5DTEUxQlFVMHNSMEZCUnl4dlJFRkJiMFFzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU1zUjBGQlJ5eGhRVUZoTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXdyUTBGQkswTXNSMEZCUnl4WFFVRlhMRWRCUVVjc1lVRkJZU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNSMEZCUnl4SlFVRkpMRU5CUVVNN2FVSkJRek5QTEUxQlFVMDdiMEpCUTBnc1RVRkJUU3hIUVVGSExHOUVRVUZ2UkN4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4SFFVRkhMR0ZCUVdFc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eEhRVUZITERoQ1FVRTRRaXhEUVVGRE8ybENRVU4yU3p0blFrRkRSQ3hOUVVGTkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEYkVJN1FVRkRZaXhUUVVGVE96dFJRVVZFTEVsQlFVa3NTMEZCU3l4SFFVRkhMRzFDUVVGdFFpeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzU1VGQlNTeFZRVUZWTEVkQlFVY3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMUZCUTNCSExFbEJRVWtzVFVGQlRTeERRVUZETEU5QlFVOHNSVUZCUlR0WlFVTm9RaXhqUVVGakxFTkJRVU1zVlVGQlZTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmRCUVZjN1kwRkRla01zU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFdEJRVXNzVlVGQlZTeEZRVUZGTzJ0Q1FVTnlReXhWUVVGVkxFTkJRVU1zVDBGQlR5eEZRVUZGTEU5QlFVOHNRMEZCUXl4RFFVRkRPMlZCUTJoRExFMUJRVTBzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFdEJRVXNzVTBGQlV5eEZRVUZGTzJ0Q1FVTXpReXhQUVVGUExFVkJRVVVzUTBGQlF6dGxRVU5pTEUxQlFVMDdhMEpCUTBnc1ZVRkJWU3hEUVVGRExFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF6dGxRVU40UlR0aFFVTkdMRU5CUVVNc1EwRkJRenRUUVVOT0xFMUJRVTA3V1VGRFNDeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzUzBGQlN5eFZRVUZWTEVWQlFVVTdaMEpCUTNKRExGVkJRVlVzUTBGQlF5eFBRVUZQTEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1lVRkRhRU1zVFVGQlRTeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzUzBGQlN5eFRRVUZUTEVWQlFVVTdaMEpCUXpORExFOUJRVThzUlVGQlJTeERRVUZETzJGQlEySXNUVUZCVFR0blFrRkRTQ3hWUVVGVkxFTkJRVU1zVDBGQlR5eEZRVUZGTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRXRCUVVzc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETzJGQlEzaEZPMU5CUTBvN1MwRkRTaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZET3p0QlFVVkVMRk5CUVZNc1ZVRkJWU3hEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVTdRVUZEYmtNc1NVRkJTU3hKUVVGSkxFZEJRVWNzUjBGQlJ5eERRVUZETEVWQlFVVTdRVUZEYWtJN08xRkJSVkVzU1VGQlNTeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eFRRVUZUTEVsQlFVa3NWVUZCVlN4RlFVRkZPMWxCUTJwRUxFOUJRVThzUTBGQlF5eERRVUZETzFOQlExbzdVVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNVMEZCVXl4SFFVRkhMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1EwRkJRenRMUVVNMVJUdEpRVU5FTEU5QlFVOHNRMEZCUXl4RFFVRkRPMEZCUTJJc1EwRkJRenM3UVVGRlJDeFRRVUZUTEZkQlFWY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhGUVVGRkxFMUJRVTBzUlVGQlJTeFBRVUZQTEVWQlFVVTdPMGxCUldwRUxGVkJRVlVzUTBGQlF5eFhRVUZYTzFGQlEyeENMRWxCUVVrc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eE5RVUZOTEVsQlFVa3NSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJReXhGUVVGRk8xbEJRMjVETEU5QlFVOHNRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhIUVVGSExFTkJRVU1zUlVGQlJTeE5RVUZOTEVOQlFVTXNRMEZCUXp0VFFVTjBReXhOUVVGTk8xbEJRMGdzU1VGQlNTeERRVUZETEZsQlFWa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRUUVVNelFqdExRVU5LTEVWQlFVVXNUMEZCVHl4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRM0pDTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4UFFVRlBMRVZCUVVVN1NVRkRha01zU1VGQlNTeEpRVUZKTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhWUVVGVkxFTkJRVU1zUTBGQlF6dEJRVU5zUkN4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzVDBGQlR5eERRVUZET3p0SlFVVjZRaXhQUVVGUExFbEJRVWtzUTBGQlF5eFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRE9VTXNRMEZCUXpzN1FVRkZSQ3hUUVVGVExHMUNRVUZ0UWl4RFFVRkRMRWxCUVVrc1JVRkJSVHRKUVVNdlFpeFBRVUZQTEVsQlFVa3NTVUZCU1N4SlFVRkpMRU5CUVVNc1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4SlFVRkpMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEZGQlFWRXNRMEZCUXp0QlFVTm9SaXhEUVVGRE96dEJRVVZFTEVsQlFVa3NTVUZCU1N4SFFVRkhMRU5CUVVNc1dVRkJXVHRKUVVOd1FpeFRRVUZUTEVWQlFVVXNSMEZCUnp0UlFVTldMRTlCUVU4c1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFbEJRVWtzVDBGQlR5eERRVUZETzJGQlF6TkRMRkZCUVZFc1EwRkJReXhGUVVGRkxFTkJRVU03WVVGRFdpeFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1MwRkRja0k3U1VGRFJDeFBRVUZQTEZsQlFWazdVVUZEWml4UFFVRlBMRVZCUVVVc1JVRkJSU3hIUVVGSExFVkJRVVVzUlVGQlJTeEhRVUZITEVkQlFVY3NSMEZCUnl4RlFVRkZMRVZCUVVVc1IwRkJSeXhIUVVGSExFZEJRVWNzUlVGQlJTeEZRVUZGTEVkQlFVY3NSMEZCUnp0WlFVTTVReXhGUVVGRkxFVkJRVVVzUjBGQlJ5eEhRVUZITEVkQlFVY3NSVUZCUlN4RlFVRkZMRWRCUVVjc1JVRkJSU3hGUVVGRkxFZEJRVWNzUlVGQlJTeEZRVUZGTEVOQlFVTTdTMEZEZGtNc1EwRkJRenRCUVVOT0xFTkJRVU1zUjBGQlJ5eERRVUZET3p0QlFVVk1MRWxCUVVrc1UwRkJVeXhIUVVGSExFVkJRVVVzUTBGQlF6dEJRVU51UWl4SlFVRkpMRXRCUVVzc1EwRkJRenRCUVVOV0xFbEJRVWtzVVVGQlVTeERRVUZETzBGQlEySXNTVUZCU1N4SlFVRkpMRWRCUVVjN1NVRkRVQ3hMUVVGTExFVkJRVVVzUzBGQlN6dEpRVU5hTEVsQlFVa3NSVUZCUlN4WlFVRlpPMUZCUTJRc1NVRkJTU3hSUVVGUkxFZEJRVWNzYTBKQlFXdENMRU5CUVVNc1pVRkJaU3hEUVVGRExFTkJRVU03VVVGRGJrUXNUMEZCVHl4SlFVRkpMRU5CUVVNc1dVRkJXU3hGUVVGRkxFTkJRVU1zU1VGQlNTeERRVUZETEZsQlFWazdXVUZEZUVNc1NVRkJTU3hSUVVGUkxFVkJRVVU3WjBKQlExWXNXVUZCV1N4RFFVRkRMRXRCUVVzc1JVRkJSU3hEUVVGRE8yZENRVU55UWl4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNiMEpCUVc5Q0xFVkJRVVVzUTBGQlF6dG5Ra0ZEYWtRc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eGhRVUZoTEVOQlFVTXNRMEZCUXp0blFrRkRPVUlzVlVGQlZTeERRVUZETEZsQlFWazdiMEpCUTI1Q0xFdEJRVXNzUTBGQlF5eFZRVUZWTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zYTBKQlFXdENMRU5CUVVNc1EwRkJRenRCUVVNNVJTeHZRa0ZCYjBJc1MwRkJTeXhEUVVGRExFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTTdPMjlDUVVWeVFpeEpRVUZKTEZOQlFWTXNSMEZCUnl4clFrRkJhMElzUTBGQlF5eHBRa0ZCYVVJc1EwRkJReXhEUVVGRE8yOUNRVU4wUkN4SlFVRkpMRk5CUVZNc1JVRkJSVHQzUWtGRFdDeFRRVUZUTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dHhRa0ZEY2tNN2IwSkJRMFFzVTBGQlV5eEhRVUZITEZOQlFWTXNTVUZCU1N4RlFVRkZMRU5CUVVNN2IwSkJRelZDTEVsQlFVa3NTMEZCU3l4SFFVRkhMR3RDUVVGclFpeERRVUZETEdkQ1FVRm5RaXhEUVVGRExFbEJRVWtzVVVGQlVTeERRVUZETEVkQlFVY3NRMEZCUXl4alFVRmpMRU5CUVVNc1EwRkJRenR2UWtGRGFrWXNTVUZCU1N4TFFVRkxMRVZCUVVVN2QwSkJRMUFzVTBGQlV5eERRVUZETEV0QlFVc3NSMEZCUnl4TFFVRkxMRU5CUVVNN1FVRkRhRVFzY1VKQlFYRkNPenR2UWtGRlJDeEpRVUZKTEVOQlFVTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1JVRkJSU3hUUVVGVExFTkJRVU1zUTBGQlF6dHBRa0ZEZWtNc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6dGhRVU5hTEUxQlFVMDdaMEpCUTBnc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRzlDUVVGdlFpeEZRVUZGTEVOQlFVTTdaMEpCUTJwRUxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNN1owSkJRemxDTEVsQlFVa3NTMEZCU3l4RFFVRkRMRTFCUVUwc1MwRkJTeXhUUVVGVExFVkJRVVU3YjBKQlF6VkNMRmRCUVZjc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZGQlFWRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETzJsQ1FVTjRSQ3hOUVVGTkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFdEJRVXNzWTBGQll5eEZRVUZGTzI5Q1FVTjZSQ3hMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZGQlFWRXNRMEZCUXp0cFFrRkRNMEk3WVVGRFNqdFRRVU5LTEVOQlFVTXNRMEZCUXp0TFFVTk9PMGxCUTBRc1UwRkJVeXhGUVVGRkxGVkJRVlVzUjBGQlJ5eEZRVUZGTEU5QlFVOHNSVUZCUlR0UlFVTXZRaXhKUVVGSkxGTkJRVk1zU1VGQlNTeFRRVUZUTEVOQlFVTXNUVUZCVFN4RlFVRkZPMWxCUXk5Q0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhUUVVGVExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOMlF5eFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzJGQlF6bENPMU5CUTBvN1MwRkRTanRKUVVORUxHTkJRV01zUlVGQlJTeFpRVUZaTzFGQlEzaENMRWxCUVVrc1MwRkJTeXhEUVVGRExFMUJRVTBzU1VGQlNTeFhRVUZYTEVWQlFVVTdXVUZETjBJc1MwRkJTeXhEUVVGRExFMUJRVTBzUjBGQlJ5eFhRVUZYTEVOQlFVTTdXVUZETTBJc1MwRkJTeXhEUVVGRExFdEJRVXNzUjBGQlJ5eEZRVUZGTEVOQlFVTTdXVUZEYWtJc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHRRa0ZCYlVJc1EwRkJReXhEUVVGRE8wRkJRMmhFTEZsQlFWa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXh0UWtGQmJVSXNRMEZCUXl4RFFVRkRPenRaUVVWd1F5eEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRTFCUVUwc1JVRkJSVHRuUWtGRGRrSXNSMEZCUnl4RlFVRkZPMjlDUVVORUxGRkJRVkVzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRkZCUVZFN2IwSkJRMnhETEVsQlFVa3NSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFbEJRVWs3YjBKQlF6RkNMRTFCUVUwc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEUxQlFVMDdiMEpCUXpsQ0xFbEJRVWtzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrN2FVSkJRemRDTzJGQlEwb3NRMEZCUXl4RFFVRkRPMU5CUTA0N1FVRkRWQ3hMUVVGTE96dEpRVVZFTEZkQlFWY3NSVUZCUlN4VlFVRlZMRWxCUVVrc1JVRkJSU3hOUVVGTkxFVkJRVVU3VVVGRGFrTXNTVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hKUVVGSkxFMUJRVTBzUTBGQlF5eHBRa0ZCYVVJc1EwRkJReXhEUVVGRE8xRkJRemxETEVsQlFVa3NUMEZCVHl4SFFVRkhMRU5CUVVNc1NVRkJTU3hIUVVGSExFMUJRVTBzUTBGQlF5eHBSRUZCYVVRc1EwRkJReXhKUVVGSkxFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTTdVVUZET1VZc1QwRkJUeXhYUVVGWExFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1VVRkJVU3hGUVVGRk8xbEJReTlETEZGQlFWRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNc1EwRkJRenRaUVVOb1JDeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETzJkQ1FVTjBRaXhMUVVGTExFVkJRVVVzU1VGQlNUdEJRVU16UWl4aFFVRmhMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU03TzFsQlJWZ3NaVUZCWlN4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFpRVUZaTzJkQ1FVTjJReXhMUVVGTExFTkJRVU1zVDBGQlR5eEhRVUZITEU5QlFVOHNTMEZCU3l4SlFVRkpMRU5CUVVNN1FVRkRha1FzWjBKQlFXZENMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzVTBGQlV5eERRVUZET3p0blFrRkZla0lzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4eFFrRkJjVUlzUjBGQlJ5eEpRVUZKTEVkQlFVY3NSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE8wRkJRemRGTEdkQ1FVRm5RaXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03TzJkQ1FVVnVReXhQUVVGUExFTkJRVU1zVVVGQlVTeEZRVUZGTEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTNoQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTEVOQlFVTXNRMEZCUXp0TFFVTk9PMGxCUTBRc1YwRkJWeXhGUVVGRkxGZEJRVmM3U1VGRGVFSXNXVUZCV1N4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRemRDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRXRCUVVzc1EwRkJReXhIUVVGSExFbEJRVWtzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNN1VVRkRMME1zVDBGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRPMUZCUTJwQ0xFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPMEZCUTJoRExGRkJRVkVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZET3p0UlFVVnVReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhEUVVGRExFTkJRVU03VVVGRGNFTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRWaXhKUVVGSkxFOUJRVThzUlVGQlJUdG5Ra0ZEVkN4SlFVRkpMRU5CUVVNc1lVRkJZU3hEUVVGRExITkNRVUZ6UWl4SFFVRkhMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzWTBGQll5eERRVUZETEVOQlFVTTdZVUZETDBVc1RVRkJUVHRuUWtGRFNDeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRzFDUVVGdFFpeEhRVUZITEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03WjBKQlF6TkVMRWxCUVVrc1EwRkJReXhYUVVGWExFTkJRVU1zYzBKQlFYTkNMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFpRVUZaTEVOQlFVTXNRMEZCUXp0aFFVTXpSVHRUUVVOS08wRkJRMVFzUzBGQlN6dEJRVU5NTzBGQlEwRTdRVUZEUVRzN1NVRkZTU3h2UWtGQmIwSXNSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSVHRSUVVOeVF5eEpRVUZKTEZGQlFWRXNSMEZCUnl4UFFVRlBMRU5CUVVNc1dVRkJXU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMRWxCUVVrc1NVRkJTU3hGUVVGRkxFTkJRVU03UVVGRGVFVXNVVUZCVVN4UFFVRlBMRU5CUVVNc1dVRkJXU3hEUVVGRExHZENRVUZuUWl4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE96dFJRVVZxUkN4SlFVRkpMRTlCUVU4c1IwRkJSeXhQUVVGUExFTkJRVU1zVTBGQlV5eEZRVUZGTEVOQlFVTXNVMEZCVXl4RFFVRkRPMUZCUXpWRExFbEJRVWtzV1VGQldTeEhRVUZITEVWQlFVVXNRMEZCUXp0UlFVTjBRaXhKUVVGSkxFOUJRVThzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1RVRkJUU3hKUVVGSkxFOUJRVThzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1RVRkJUU3hGUVVGRk8xbEJRM0JHTEZsQlFWa3NSMEZCUnl4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU53UXl4TlFVRk5PMWxCUTBnc1dVRkJXU3hIUVVGSExHTkJRV01zUTBGQlF5eFBRVUZQTEVWQlFVVXNVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8xTkJRM3BFTzFGQlEwUXNUMEZCVHp0WlFVTklMRkZCUVZFc1JVRkJSU3hSUVVGUk8xbEJRMnhDTEZOQlFWTXNSVUZCUlN4WlFVRlpPMU5CUXpGQ0xFTkJRVU03UVVGRFZpeExRVUZMT3p0SlFVVkVMR0ZCUVdFc1JVRkJSU3hWUVVGVkxGTkJRVk1zUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RlFVRkZPMUZCUXpORExFbEJRVWtzU1VGQlNTeERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRWxCUVVrc1EwRkJReXhaUVVGWkxFVkJRVVVzUlVGQlJUdFpRVU16UXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhKUVVGSkxGZEJRVmNzUlVGQlJUdG5Ra0ZETTBJc1IwRkJSeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1EwRkJRenRoUVVOcVF6dFpRVU5FTEV0QlFVc3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWM3WjBKQlEyWXNVMEZCVXl4RlFVRkZMRk5CUVZNN1owSkJRM0JDTEZOQlFWTXNSVUZCUlN4SlFVRkpMRWxCUVVrc1JVRkJSU3hEUVVGRExFOUJRVThzUlVGQlJUdG5Ra0ZETDBJc1NVRkJTU3hGUVVGRkxFbEJRVWs3WVVGRFlpeERRVUZETzFsQlEwWXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhyUWtGQmEwSXNRMEZCUXl4RFFVRkRPMU5CUTNSRE8wdEJRMG83U1VGRFJDeFRRVUZUTEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVc1VVRkJVU3hGUVVGRk8xRkJRMmhETEVsQlFVa3NZMEZCWXl4SlFVRkpMR05CUVdNc1EwRkJReXhOUVVGTkxFVkJRVVU3V1VGRGVrTXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEdOQlFXTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3WjBKQlF6VkRMR05CUVdNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNSMEZCUnl4RlFVRkZMRkZCUVZFc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6dGhRVU01UXp0VFFVTktPMHRCUTBvN1NVRkRSQ3hYUVVGWExFVkJRVVVzVlVGQlZTeExRVUZMTEVWQlFVVXNVVUZCVVN4RlFVRkZPMUZCUTNCRExFbEJRVWtzWTBGQll5eEpRVUZKTEdOQlFXTXNRMEZCUXl4TlFVRk5MRVZCUVVVN1dVRkRla01zUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExHTkJRV01zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRelZETEdOQlFXTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhMUVVGTExFTkJRVU1zUzBGQlN5eEZRVUZGTEZGQlFWRXNSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOc1JEdFRRVU5LTzB0QlEwbzdTVUZEUkN4aFFVRmhMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVVzVVVGQlVTeEZRVUZGTzFGQlEzaERMRWxCUVVrc1kwRkJZeXhKUVVGSkxHTkJRV01zUTBGQlF5eE5RVUZOTEVWQlFVVTdXVUZEZWtNc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMR05CUVdNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdaMEpCUXpWRExHTkJRV01zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhGUVVGRkxGRkJRVkVzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTjBSRHRUUVVOS08wdEJRMG83U1VGRFJDeG5Ra0ZCWjBJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU5xUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzB0QlF6TkNPMGxCUTBRc2JVSkJRVzFDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRjRU1zV1VGQldTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVNNVFqdEpRVU5FTEhGQ1FVRnhRaXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTzFGQlEzUkRMR05CUVdNc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdTMEZEYUVNN1NVRkRSQ3h0UWtGQmJVSXNSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSVHRSUVVOd1F5eFpRVUZaTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8wdEJRemxDTzBsQlEwUXNNa0pCUVRKQ0xFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVTdVVUZETlVNc2IwSkJRVzlDTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8wdEJRM1JETzBsQlEwUXNWMEZCVnl4RlFVRkZMRmRCUVZjN1VVRkRjRUlzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1EwRkJReXhQUVVGUExFTkJRVU1zVjBGQlZ5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMHRCUTNaRU8wbEJRMFFzVTBGQlV5eEZRVUZGTEZkQlFWYzdVVUZEYkVJc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzB0QlEzSkVPMGxCUTBRc1dVRkJXU3hGUVVGRkxGTkJRVk1zVlVGQlZTeEZRVUZGTzFGQlF5OUNMRWxCUVVrc1QwRkJUeXhWUVVGVkxFdEJRVXNzVjBGQlZ5eExRVUZMTEVsQlFVa3NRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hKUVVGSkxFTkJRVU1zV1VGQldTeEZRVUZGTEVOQlFVTXNSVUZCUlR0WlFVTnNSaXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSMEZCUnl4VlFVRlZMRWRCUVVjc1dVRkJXU3hIUVVGSExGZEJRVmNzUTBGQlF6dFpRVU0xUkN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHOUNRVUZ2UWl4RFFVRkRMRU5CUVVNN1UwRkRlRU03VVVGRFJDeFBRVUZQTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hEUVVGRExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN1MwRkRlRVE3U1VGRFJDeGhRVUZoTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1VVRkRNMElzU1VGQlNTeEpRVUZKTEV0QlFVc3NTMEZCU3l4RlFVRkZPMWxCUTJoQ0xFbEJRVWtzVjBGQlZ5eEhRVUZITzJkQ1FVTmtMRXRCUVVzc1JVRkJSU3hMUVVGTExFTkJRVU1zUzBGQlN6dEJRVU5zUXl4aFFVRmhMRU5CUVVNN08wRkJSV1FzV1VGQldTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRmRCUVZjc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6czdXVUZGTlVJc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eEpRVUZKTEVWQlFVVTdaMEpCUTI1Q0xGZEJRVmNzUTBGQlF5eEpRVUZKTEVkQlFVY3NUVUZCVFN4RFFVRkRMSEZDUVVGeFFpeERRVUZETEVOQlFVTTdRVUZEYWtVc1lVRkJZVHM3V1VGRlJDeEpRVUZKTEZkQlFWY3NRMEZCUXl4SlFVRkpMRVZCUVVVN1FVRkRiRU1zWjBKQlFXZENMRXRCUVVzc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4RFFVRkRPenRuUWtGRmJFTXNTVUZCU1N4WlFVRlpMRWxCUVVrc1dVRkJXU3hEUVVGRExFMUJRVTBzUlVGQlJUdHZRa0ZEY2tNc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRmxCUVZrc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdkMEpCUXpGRExGbEJRVmtzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03Y1VKQlEzUkRPMmxDUVVOS08yRkJRMG83UVVGRFlpeFRRVUZUT3p0QlFVVlVMRkZCUVZFc1MwRkJTeXhEUVVGRExFMUJRVTBzUjBGQlJ5eFJRVUZSTEVOQlFVTTdPMEZCUldoRExGRkJRVkVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eERRVUZET3p0UlFVVndReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhGUVVGRkxGZEJRVmNzUTBGQlF5eERRVUZETzBGQlEzcEVMRXRCUVVzN08wbEJSVVFzV1VGQldTeEZRVUZGTEZsQlFWazdVVUZEZEVJc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4UlFVRlJMRVZCUVVVc1EwRkJRenRSUVVNeFF5eEpRVUZKTEc5Q1FVRnZRaXhEUVVGRExFMUJRVTBzUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXl4clFrRkJhMElzUTBGQlF5eGxRVUZsTEVOQlFVTXNSVUZCUlR0WlFVTjZSU3hQUVVGUExFbEJRVWtzVDBGQlR5eERRVUZETEZWQlFWVXNUMEZCVHl4RlFVRkZMRTFCUVUwc1JVRkJSVHRuUWtGRE1VTXNiMEpCUVc5Q0xFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNWVUZCVlN4SlFVRkpMRVZCUVVVN2IwSkJRM0JETEZGQlFWRXNRMEZCUXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03YjBKQlF6TkNMRTlCUVU4c1JVRkJSU3hEUVVGRE8ybENRVU5pTEVWQlFVVXNXVUZCV1R0dlFrRkRXQ3hQUVVGUExFVkJRVVVzUTBGQlF6dHBRa0ZEWWl4RFFVRkRMRU5CUVVNN1lVRkRUaXhEUVVGRExFTkJRVU03VTBGRFRpeE5RVUZOTzFsQlEwZ3NUMEZCVHl4UFFVRlBMRU5CUVVNc1QwRkJUeXhGUVVGRkxFTkJRVU03VTBGRE5VSTdRVUZEVkN4TFFVRkxPenRKUVVWRUxHOUNRVUZ2UWl4RlFVRkZMRmxCUVZrN1VVRkRPVUlzU1VGQlNTeFpRVUZaTEVkQlFVY3NXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dFJRVU5vUkN4SlFVRkpMRmxCUVZrc1JVRkJSVHRaUVVOa0xFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8xTkJRM0JETEUxQlFVMDdXVUZEU0N4TFFVRkxMRWRCUVVjN1owSkJRMG9zVFVGQlRTeEZRVUZGTEdOQlFXTTdaMEpCUTNSQ0xGTkJRVk1zUlVGQlJTeEZRVUZGTzJGQlEyaENMRU5CUVVNN1UwRkRURHRSUVVORUxFOUJRVThzUzBGQlN5eERRVUZETzBGQlEzSkNMRXRCUVVzN08wbEJSVVFzYTBKQlFXdENMRVZCUVVVc1ZVRkJWU3hUUVVGVExFVkJRVVU3VVVGRGNrTXNTVUZCU1N4VFFVRlRMRVZCUVVVN1dVRkRXQ3haUVVGWkxFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTTdVMEZETTBRc1RVRkJUVHRaUVVOSUxGbEJRVmtzUTBGQlF5eFZRVUZWTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1UwRkRia003UVVGRFZDeExRVUZMT3p0SlFVVkVMRTFCUVUwc1JVRkJSU3haUVVGWk8xRkJRMmhDTEVsQlFVa3NRMEZCUXl4clFrRkJhMElzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTnNRenRCUVVOTUxFTkJRVU1zUTBGQlF6czdRVUZGUml4VFFVRlRMR1ZCUVdVc1EwRkJReXhIUVVGSExFVkJRVVVzUzBGQlN5eEZRVUZGTzBsQlEycERMRU5CUVVNc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF5eFhRVUZYTEVOQlFVTXNZVUZCWVN4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRE8wRkJRemRETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhYUVVGWExFTkJRVU1zUjBGQlJ5eEZRVUZGTEV0QlFVc3NSVUZCUlR0SlFVTTNRaXhEUVVGRExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNWMEZCVnl4RFFVRkRMRmxCUVZrc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF6dEJRVU0xUXl4RFFVRkRPenRCUVVWRU8wRkJRMEU3UVVGRFFUczdSMEZGUnp0QlFVTklMRk5CUVZNc2JVSkJRVzFDTEVOQlFVTXNSMEZCUnl4RlFVRkZPMGxCUXpsQ0xFOUJRVThzUTBGQlF5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF5eE5RVUZOTEVsQlFVa3NRMEZCUXp0VlFVTndReXhIUVVGSExFTkJRVU1zVVVGQlVTeERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRTlCUVU4c1EwRkJRenRCUVVOb1JDeERRVUZET3p0QlFVVkVMRWxCUVVrc1RVRkJUU3hIUVVGSExFVkJRVVVzUTBGQlF6czdRVUZGYUVJc1UwRkJVeXhwUWtGQmFVSXNSMEZCUnpzN1NVRkZla0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRjRU1zVVVGQlVTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETEVOQlFVTXNSVUZCUlN4RFFVRkRMRlZCUVZVc1IwRkJSeXhGUVVGRk8xbEJRMnBFTEVsQlFVa3NUMEZCVHl4SFFVRkhMRlZCUVZVc1EwRkJReXhGUVVGRk8yZENRVU4yUWl4SlFVRkpMRU5CUVVNc1EwRkJReXhUUVVGVE8wRkJReTlDTEc5Q1FVRnZRaXhQUVVGUE96dG5Ra0ZGV0N4SlFVRkpMRWxCUVVrc1EwRkJReXhYUVVGWExFVkJRVVU3YjBKQlEyeENMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zV1VGQldUdHZRa0ZEY2tJc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4aFFVRmhMRU5CUVVNN2IwSkJRM0pETEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEdWQlFXVXNRMEZCUXl4RFFVRkRMRTFCUVUwc1NVRkJTU3hEUVVGRE8yOUNRVU5vUkN4dFFrRkJiVUlzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRVZCUVVVN2MwSkJRemRDTEVsQlFVa3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNRMEZCUXp0elFrRkRiRU1zU1VGQlNTeEpRVUZKTEVkQlFVYzdNRUpCUTFBc1QwRkJUeXhGUVVGRkxFbEJRVWtzUTBGQlF5eHZRa0ZCYjBJc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETzNWQ1FVTXZReXhEUVVGRE8wRkJRM2hDTEhOQ1FVRnpRaXhKUVVGSkxFdEJRVXNzUTBGQlF6czdjMEpCUlZZc1NVRkJTU3hEUVVGRExFTkJRVU1zUzBGQlN5eEpRVUZKTEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVN01FSkJRM0pDTEVsQlFVa3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhEUVVGRExFdEJRVXNzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRPMEZCUXpWRUxIVkNRVUYxUWpzN2MwSkJSVVFzU1VGQlNTeEhRVUZITEVsQlFVa3NWMEZCVnl4RlFVRkZPekJDUVVOd1FpeGxRVUZsTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6c3dRa0ZEYUVNc1RVRkJUU3hEUVVGRExFbEJRVWtzUTBGQlF6czRRa0ZEVWl4UFFVRlBMRVZCUVVVc1EwRkJReXhEUVVGRExFMUJRVTA3T0VKQlEycENMRXRCUVVzc1JVRkJSU3hWUVVGVkxFTkJRVU1zV1VGQldUdHJRMEZETVVJc1YwRkJWeXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN2EwTkJRelZDTEdWQlFXVXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZET3l0Q1FVTndReXhGUVVGRkxFZEJRVWNzUTBGQlF6c3lRa0ZEVml4RFFVRkRMRU5CUVVNN2RVSkJRMDQ3YzBKQlEwUXNTVUZCU1N4SFFVRkhMRWxCUVVrc1ZVRkJWU3hGUVVGRk96QkNRVU51UWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUczRRa0ZEY0VNc1NVRkJTU3hOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNUMEZCVHl4SlFVRkpMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVU3YTBOQlF5OUNMRmxCUVZrc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN2EwTkJRemxDTEUxQlFVMHNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF5eERRVUZETzJ0RFFVTndRaXhOUVVGTk95dENRVU5VT3pKQ1FVTktPekJDUVVORUxHVkJRV1VzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRE96QkNRVU5xUXl4WFFVRlhMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXp0QlFVTjJSQ3gxUWtGQmRVSTdPM05DUVVWRUxFbEJRVWtzUjBGQlJ5eEpRVUZKTEZGQlFWRXNSVUZCUlRzd1FrRkRha0lzU1VGQlNTeERRVUZETEV0QlFVc3NSMEZCUnl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFdEJRVXNzUTBGQlF6dEJRVU4wUkN4MVFrRkJkVUk3TzNOQ1FVVkVMRWxCUVVrc1EwRkJReXhoUVVGaExFTkJRVU1zUjBGQlJ5eEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVONlJDeHBRa0ZCYVVJN08wRkJSV3BDTEdGQlFXRXNRMEZCUXp0QlFVTmtPenRaUVVWWkxFTkJRVU1zU1VGQlNTeERRVUZETEdOQlFXTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1kwRkJZeXhKUVVGSkxFVkJRVVVzUlVGQlJTeEhRVUZITEVOQlFVTXNSMEZCUnl4UFFVRlBMRU5CUVVNN1dVRkRha1VzVDBGQlR5eFBRVUZQTEVOQlFVTTdVMEZEYkVJc1JVRkJSU3hOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenRCUVVNM1FpeExRVUZMT3p0SlFVVkVMRWxCUVVrc1UwRkJVeXhIUVVGSE8xRkJRMW9zUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1FVRkRia0lzUzBGQlN5eERRVUZET3p0SlFVVkdMRWxCUVVrc1VVRkJVU3hIUVVGSE8xRkJRMWdzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hKUVVGSk8xRkJRMVlzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzBGQlEycENMRXRCUVVzc1EwRkJRenM3U1VGRlJpeFRRVUZUTEdWQlFXVXNSVUZCUlN4RFFVRkRMRVZCUVVVN1VVRkRla0lzU1VGQlNTeERRVUZETEVOQlFVTXNVMEZCVXp0QlFVTjJRaXhaUVVGWkxFOUJRVTg3TzFGQlJWZ3NTVUZCU1N4SlFVRkpMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WlFVRlpMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4aFFVRmhMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhsUVVGbExFTkJRVU1zUTBGQlF5eE5RVUZOTEVsQlFVa3NRMEZCUXl4RlFVRkZPMEZCUTNSS0xGbEJRVmtzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVNMVFqdEJRVU5CT3p0WlFVVlpMRWxCUVVrc1UwRkJVeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZETEVOQlFVTXNSVUZCUlR0blFrRkROMElzUTBGQlF5eEhRVUZITEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOcVF5eGhRVUZoT3p0WlFVVkVMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zVVVGQlVTeExRVUZMTEVOQlFVTXNTVUZCU1N4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eEZRVUZGTzJkQ1FVTnlReXhEUVVGRExFZEJRVWNzVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRMRWRCUVVjc1JVRkJSU3hEUVVGRExFTkJRVU03UVVGRGFFUXNZVUZCWVN4TlFVRk5MRWxCUVVrc1EwRkJReXhEUVVGRExGRkJRVkVzU1VGQlNTeFJRVUZSTEVOQlFVTXNZMEZCWXl4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRk96dG5Ra0ZGYWtRc1EwRkJReXhIUVVGSExGRkJRVkVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0aFFVTnVRaXhOUVVGTk8yZENRVU5JTEVOQlFVTXNSMEZCUnl4TlFVRk5MRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlF6TkRMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4VlFVRlZMRVZCUVVVN1owSkJRek5DTEU5QlFVOHNSVUZCUlN4SlFVRkpMRU5CUVVNc2IwSkJRVzlDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJRenRuUWtGRE5VTXNSMEZCUnl4RlFVRkZMRU5CUVVNN1owSkJRMDRzVTBGQlV5eEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1MwRkJTenRuUWtGRGVrSXNTMEZCU3l4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUzBGQlN5eEhRVUZITEVOQlFVTTdaMEpCUTNwQ0xFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHp0aFFVTnlRaXhEUVVGRExFTkJRVU03VTBGRFRqdEJRVU5VTEV0QlFVczdPMEZCUlV3c1NVRkJTU3hSUVVGUkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1ZVRkJWU3hGUVVGRkxHVkJRV1VzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0QlFVTnFSVHM3U1VGRlNTeERRVUZETEVsQlFVa3NRMEZCUXl4alFVRmpMRWRCUVVjc1NVRkJTU3hEUVVGRExHTkJRV01zU1VGQlNTeEZRVUZGTEVWQlFVVXNWVUZCVlN4RFFVRkRMRWRCUVVjc1pVRkJaU3hEUVVGRE8wRkJRM0JHTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4SlFVRkpMRVZCUVVVN1NVRkRPVUlzU1VGQlNTeEhRVUZITEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03U1VGRE1VUXNTVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hOUVVGTkxFTkJRVU1zVVVGQlVTeEhRVUZITEVsQlFVa3NSMEZCUnl4WFFVRlhMRU5CUVVNN1VVRkRha1FzVDBGQlR5eEhRVUZITEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETzBsQlF6RkRMRTlCUVU4c1QwRkJUeXhMUVVGTExFbEJRVWtzUjBGQlJ5eEZRVUZGTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhMUVVGTExFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXp0QlFVTjBSaXhEUVVGRE96dEJRVVZFTEZOQlFWTXNZVUZCWVN4SFFVRkhPMFZCUTNaQ0xFbEJRVWtzVVVGQlVTeERRVUZETEZWQlFWVXNTVUZCU1N4VlFVRlZMRVZCUVVVN1FVRkRla01zU1VGQlNTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNc1NVRkJTU3hEUVVGRExGbEJRVms3TzBGQlJXcERMRkZCUVZFc2FVSkJRV2xDTEVWQlFVVXNRMEZCUXpzN1VVRkZjRUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRVZCUVVVN1dVRkRjRUlzU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4TlFVRk5MRVZCUVVVN1owSkJRM1pDTEVkQlFVY3NSVUZCUlR0dlFrRkRSQ3hSUVVGUkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4UlFVRlJPMjlDUVVOc1F5eEpRVUZKTEVWQlFVVXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhKUVVGSk8yOUNRVU14UWl4TlFVRk5MRVZCUVVVc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eE5RVUZOTzI5Q1FVTTVRaXhKUVVGSkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpPMmxDUVVNM1FqdGhRVU5LTEVOQlFVTXNRMEZCUXp0VFFVTk9PMHRCUTBvc1EwRkJReXhEUVVGRE8wZEJRMG83UVVGRFNDeERRVUZET3p0QlFVVkVMR0ZCUVdFc1JVRkJSU3hEUVVGRE8wRkJRMmhDTEZGQlFWRXNRMEZCUXl4blFrRkJaMElzUTBGQlF5eHJRa0ZCYTBJc1JVRkJSU3hoUVVGaExFTkJRVU1zUTBGQlF6czdRVUZGTjBRc1RVRkJUU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMRkZCUVZFc1JVRkJSU3haUVVGWk8wbEJRekZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJRenRCUVVOc1FpeERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN08wRkJSVlFzVFVGQlRTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExFOUJRVThzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlR0SlFVTTFReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdkQ1FVRm5RaXhIUVVGSExFZEJRVWNzUTBGQlF5eFBRVUZQTEVkQlFVY3NSMEZCUnl4SFFVRkhMRWRCUVVjc1EwRkJReXhIUVVGSExFZEJRVWNzUjBGQlJ5eEhRVUZITEVkQlFVY3NRMEZCUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhIUVVGSExFZEJRVWNzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTndSeXhEUVVGRExFTkJRVU1zUTBGQlF6czdRVUZGU0N4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCZklEMGdjbVZ4ZFdseVpTZ25MaTkxZEdsc2N5Y3BPMXh1ZG1GeUlGQnliMjFwYzJVZ1BTQnlaWEYxYVhKbEtDZGxjell0Y0hKdmJXbHpaU2NwTGxCeWIyMXBjMlU3WEc1MllYSWdVMmx0ZFd4aGRHVWdQU0J5WlhGMWFYSmxLQ2N1TDNOcGJYVnNZWFJsSnlrN1hHNTJZWElnYzJWc1pXTjBiM0pHYVc1a1pYSWdQU0J5WlhGMWFYSmxLQ2N1TDNObGJHVmpkRzl5Um1sdVpHVnlKeWs3WEc1MllYSWdVMlYwZEdsdVozTWdQU0J5WlhGMWFYSmxLQ2N1TDNObGRIUnBibWR6SnlrN1hHNWNiaTh2SUhaaGNpQnRlVWRsYm1WeVlYUnZjaUE5SUc1bGR5QkRjM05UWld4bFkzUnZja2RsYm1WeVlYUnZjaWdwTzF4dWRtRnlJR2x0Y0c5eWRHRnVkRk4wWlhCTVpXNW5kR2dnUFNBMU1EQTdYRzUyWVhJZ2MyRjJaVWhoYm1Sc1pYSnpJRDBnVzEwN1hHNTJZWElnY21Wd2IzSjBTR0Z1Wkd4bGNuTWdQU0JiWFR0Y2JuWmhjaUJzYjJGa1NHRnVaR3hsY25NZ1BTQmJYVHRjYm5aaGNpQnpaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnljeUE5SUZ0ZE8xeHVYRzVtZFc1amRHbHZiaUJuWlhSVFkyVnVZWEpwYnlodVlXMWxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVJQ2h5WlhOdmJIWmxMQ0J5WldwbFkzUXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHeHZZV1JJWVc1a2JHVnljeTVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkR0YwWlNBOUlIVjBiV1V1YzNSaGRHVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElITjBZWFJsTG5OalpXNWhjbWx2Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHRjBaUzV6WTJWdVlYSnBiM05iYVYwdWJtRnRaU0E5UFQwZ2JtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtITjBZWFJsTG5OalpXNWhjbWx2YzF0cFhTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYkc5aFpFaGhibVJzWlhKeld6QmRLRzVoYldVc0lHWjFibU4wYVc5dUlDaHlaWE53S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNoeVpYTndLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU2s3WEc1OVhHNTJZWElnZG1Gc2FXUmhkR2x1WnlBOUlHWmhiSE5sTzF4dVhHNTJZWElnWlhabGJuUnpJRDBnVzF4dUlDQWdJQ2RqYkdsamF5Y3NYRzRnSUNBZ0oyWnZZM1Z6Snl4Y2JpQWdJQ0FuWW14MWNpY3NYRzRnSUNBZ0oyUmliR05zYVdOckp5eGNiaUFnSUNBdkx5QW5aSEpoWnljc1hHNGdJQ0FnTHk4Z0oyUnlZV2RsYm5SbGNpY3NYRzRnSUNBZ0x5OGdKMlJ5WVdkc1pXRjJaU2NzWEc0Z0lDQWdMeThnSjJSeVlXZHZkbVZ5Snl4Y2JpQWdJQ0F2THlBblpISmhaM04wWVhKMEp5eGNiaUFnSUNBdkx5QW5hVzV3ZFhRbkxGeHVJQ0FnSUNkdGIzVnpaV1J2ZDI0bkxGeHVJQ0FnSUM4dklDZHRiM1Z6WlcxdmRtVW5MRnh1SUNBZ0lDZHRiM1Z6WldWdWRHVnlKeXhjYmlBZ0lDQW5iVzkxYzJWc1pXRjJaU2NzWEc0Z0lDQWdKMjF2ZFhObGIzVjBKeXhjYmlBZ0lDQW5iVzkxYzJWdmRtVnlKeXhjYmlBZ0lDQW5iVzkxYzJWMWNDY3NYRzRnSUNBZ0oyTm9ZVzVuWlNjc1hHNGdJQ0FnTHk4Z0ozSmxjMmw2WlNjc1hHNGdJQ0FnTHk4Z0ozTmpjbTlzYkNkY2JsMDdYRzVjYm1aMWJtTjBhVzl1SUdkbGRGQnlaV052Ym1ScGRHbHZibk1nS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnZG1GeUlITmxkSFZ3SUQwZ2MyTmxibUZ5YVc4dWMyVjBkWEE3WEc0Z0lDQWdkbUZ5SUhOalpXNWhjbWx2Y3lBOUlITmxkSFZ3SUNZbUlITmxkSFZ3TG5OalpXNWhjbWx2Y3p0Y2JpQWdJQ0F2THlCVVQwUlBPaUJDY21WaGF5QnZkWFFnYVc1MGJ5Qm9aV3h3WlhKY2JpQWdJQ0JwWmlBb2MyTmxibUZ5YVc5ektTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExtRnNiQ2hmTG0xaGNDaHpZMlZ1WVhKcGIzTXNJR1oxYm1OMGFXOXVJQ2h6WTJWdVlYSnBiMDVoYldVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJuWlhSVFkyVnVZWEpwYnloelkyVnVZWEpwYjA1aGJXVXBMblJvWlc0b1puVnVZM1JwYjI0Z0tHOTBhR1Z5VTJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYjNSb1pYSlRZMlZ1WVhKcGJ5QTlJRXBUVDA0dWNHRnljMlVvU2xOUFRpNXpkSEpwYm1kcFpua29iM1JvWlhKVFkyVnVZWEpwYnlrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYjNSb1pYSlRZMlZ1WVhKcGJ5NXpkR1Z3Y3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOUtTazdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2hiWFNrN1hHNGdJQ0FnZlZ4dWZWeHVYRzVtZFc1amRHbHZiaUJuWlhSUWIzTjBZMjl1WkdsMGFXOXVjeUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0IyWVhJZ1kyeGxZVzUxY0NBOUlITmpaVzVoY21sdkxtTnNaV0Z1ZFhBN1hHNGdJQ0FnZG1GeUlITmpaVzVoY21sdmN5QTlJR05zWldGdWRYQWdKaVlnWTJ4bFlXNTFjQzV6WTJWdVlYSnBiM003WEc0Z0lDQWdMeThnVkU5RVR6b2dRbkpsWVdzZ2IzVjBJR2x1ZEc4Z2FHVnNjR1Z5WEc0Z0lDQWdhV1lnS0hOalpXNWhjbWx2Y3lrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1aGJHd29YeTV0WVhBb2MyTmxibUZ5YVc5ekxDQm1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOU9ZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdaMlYwVTJObGJtRnlhVzhvYzJObGJtRnlhVzlPWVcxbEtTNTBhR1Z1S0daMWJtTjBhVzl1SUNodmRHaGxjbE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJRzkwYUdWeVUyTmxibUZ5YVc4Z1BTQktVMDlPTG5CaGNuTmxLRXBUVDA0dWMzUnlhVzVuYVdaNUtHOTBhR1Z5VTJObGJtRnlhVzhwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRzkwYUdWeVUyTmxibUZ5YVc4dWMzUmxjSE03WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlNrcE8xeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9XMTBwTzF4dUlDQWdJSDFjYm4xY2JseHVablZ1WTNScGIyNGdYMk52Ym1OaGRGTmpaVzVoY21sdlUzUmxjRXhwYzNSektITjBaWEJ6S1NCN1hHNGdJQ0FnZG1GeUlHNWxkMU4wWlhCeklEMGdXMTA3WEc0Z0lDQWdkbUZ5SUdOMWNuSmxiblJVYVcxbGMzUmhiWEE3SUM4dklHbHVhWFJoYkdsNlpXUWdZbmtnWm1seWMzUWdiR2x6ZENCdlppQnpkR1Z3Y3k1Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJxSUQwZ01Ec2dhaUE4SUhOMFpYQnpMbXhsYm1kMGFEc2dhaXNyS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJtYkdGMFUzUmxjSE1nUFNCemRHVndjMXRxWFR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR29nUGlBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcklEMGdNRHNnYXlBOElITjBaWEJ6TG14bGJtZDBhRHNnYXlzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhOMFpYQWdQU0JtYkdGMFUzUmxjSE5iYTEwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR1JwWm1ZZ1BTQnJJRDRnTUNBL0lITjBaWEF1ZEdsdFpWTjBZVzF3SUMwZ1pteGhkRk4wWlhCelcyc2dMU0F4WFM1MGFXMWxVM1JoYlhBZ09pQTFNRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqZFhKeVpXNTBWR2x0WlhOMFlXMXdJQ3M5SUdScFptWTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabXhoZEZOMFpYQnpXMnRkTG5ScGJXVlRkR0Z0Y0NBOUlHTjFjbkpsYm5SVWFXMWxjM1JoYlhBN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpkWEp5Wlc1MFZHbHRaWE4wWVcxd0lEMGdabXhoZEZOMFpYQnpXMnBkTG5ScGJXVlRkR0Z0Y0R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnVaWGRUZEdWd2N5QTlJRzVsZDFOMFpYQnpMbU52Ym1OaGRDaG1iR0YwVTNSbGNITXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnYm1WM1UzUmxjSE03WEc1OVhHNWNibVoxYm1OMGFXOXVJSE5sZEhWd1EyOXVaR2wwYVc5dWN5QW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQjJZWElnY0hKdmJXbHpaWE1nUFNCYlhUdGNiaUFnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzVoYkd3b1cxeHVJQ0FnSUNBZ0lDQm5aWFJRY21WamIyNWthWFJwYjI1ektITmpaVzVoY21sdktTeGNiaUFnSUNBZ0lDQWdaMlYwVUc5emRHTnZibVJwZEdsdmJuTW9jMk5sYm1GeWFXOHBYRzRnSUNBZ1hTa3VkR2hsYmlobWRXNWpkR2x2YmlBb2MzUmxjRUZ5Y21GNWN5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2MzUmxjRXhwYzNSeklEMGdjM1JsY0VGeWNtRjVjMXN3WFM1amIyNWpZWFFvVzNOalpXNWhjbWx2TG5OMFpYQnpYU3dnYzNSbGNFRnljbUY1YzFzeFhTazdYRzRnSUNBZ0lDQWdJSE5qWlc1aGNtbHZMbk4wWlhCeklEMGdYMk52Ym1OaGRGTmpaVzVoY21sdlUzUmxjRXhwYzNSektITjBaWEJNYVhOMGN5azdYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlISjFibE4wWlhBb2MyTmxibUZ5YVc4c0lHbGtlQ3dnZEc5VGEybHdLU0I3WEc0Z0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0oxSlZUazVKVGtkZlUxUkZVQ2NwTzF4dUlDQWdJSFJ2VTJ0cGNDQTlJSFJ2VTJ0cGNDQjhmQ0I3ZlR0Y2JseHVJQ0FnSUhaaGNpQnpkR1Z3SUQwZ2MyTmxibUZ5YVc4dWMzUmxjSE5iYVdSNFhUdGNiaUFnSUNCMllYSWdjM1JoZEdVZ1BTQjFkRzFsTG5OMFlYUmxPMXh1SUNBZ0lHbG1JQ2h6ZEdWd0lDWW1JSE4wWVhSbExuTjBZWFIxY3lBOVBTQW5VRXhCV1VsT1J5Y3BJSHRjYmlBZ0lDQWdJQ0FnYzNSaGRHVXVjblZ1TG5OalpXNWhjbWx2SUQwZ2MyTmxibUZ5YVc4N1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5KMWJpNXpkR1Z3U1c1a1pYZ2dQU0JwWkhnN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuYkc5aFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ1WlhkTWIyTmhkR2x2YmlBOUlITjBaWEF1WkdGMFlTNTFjbXd1Y0hKdmRHOWpiMndnS3lCY0lpOHZYQ0lnS3lCemRHVndMbVJoZEdFdWRYSnNMbWh2YzNRN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MyVmhjbU5vSUQwZ2MzUmxjQzVrWVhSaExuVnliQzV6WldGeVkyZzdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhR0Z6YUNBOUlITjBaWEF1WkdGMFlTNTFjbXd1YUdGemFEdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE5sWVhKamFDQW1KaUFoYzJWaGNtTm9MbU5vWVhKQmRDaGNJajljSWlrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaV0Z5WTJnZ1BTQmNJajljSWlBcklITmxZWEpqYUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJwYzFOaGJXVlZVa3dnUFNBb2JHOWpZWFJwYjI0dWNISnZkRzlqYjJ3Z0t5QmNJaTh2WENJZ0t5QnNiMk5oZEdsdmJpNW9iM04wSUNzZ2JHOWpZWFJwYjI0dWMyVmhjbU5vS1NBOVBUMGdLRzVsZDB4dlkyRjBhVzl1SUNzZ2MyVmhjbU5vS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNXlaWEJzWVdObEtHNWxkMHh2WTJGMGFXOXVJQ3NnYUdGemFDQXJJSE5sWVhKamFDazdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZibk52YkdVdWJHOW5LQ2hzYjJOaGRHbHZiaTV3Y205MGIyTnZiQ0FySUd4dlkyRjBhVzl1TG1odmMzUWdLeUJzYjJOaGRHbHZiaTV6WldGeVkyZ3BLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZibk52YkdVdWJHOW5LQ2h6ZEdWd0xtUmhkR0V1ZFhKc0xuQnliM1J2WTI5c0lDc2djM1JsY0M1a1lYUmhMblZ5YkM1b2IzTjBJQ3NnYzNSbGNDNWtZWFJoTG5WeWJDNXpaV0Z5WTJncEtUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdTV1lnZDJVZ2FHRjJaU0J1YjNRZ1kyaGhibWRsWkNCMGFHVWdZV04wZFdGc0lHeHZZMkYwYVc5dUxDQjBhR1Z1SUhSb1pTQnNiMk5oZEdsdmJpNXlaWEJzWVdObFhHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCM2FXeHNJRzV2ZENCbmJ5QmhibmwzYUdWeVpWeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHbHpVMkZ0WlZWU1RDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNXlaV3h2WVdRb2RISjFaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRHVndMbVYyWlc1MFRtRnRaU0E5UFNBbmRHbHRaVzkxZENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1aGRYUnZVblZ1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVUbVY0ZEZOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUN3Z2RHOVRhMmx3TENCemRHVndMbVJoZEdFdVlXMXZkVzUwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJzYjJOaGRHOXlJRDBnYzNSbGNDNWtZWFJoTG14dlkyRjBiM0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzNSbGNITWdQU0J6WTJWdVlYSnBieTV6ZEdWd2N6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQjFibWx4ZFdWSlpDQTlJR2RsZEZWdWFYRjFaVWxrUm5KdmJWTjBaWEFvYzNSbGNDazdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJSFJ5ZVNCMGJ5Qm5aWFFnY21sa0lHOW1JSFZ1Ym1WalpYTnpZWEo1SUhOMFpYQnpYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIUnZVMnRwY0Z0MWJtbHhkV1ZKWkYwZ1BUMGdKM1Z1WkdWbWFXNWxaQ2NnSmlZZ2RYUnRaUzV6ZEdGMFpTNXlkVzR1YzNCbFpXUWdJVDBnSjNKbFlXeDBhVzFsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdaR2xtWmp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHbG5ibTl5WlNBOUlHWmhiSE5sTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJxSUQwZ2MzUmxjSE11YkdWdVozUm9JQzBnTVRzZ2FpQStJR2xrZURzZ2FpMHRLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHOTBhR1Z5VTNSbGNDQTlJSE4wWlhCelcycGRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCdmRHaGxjbFZ1YVhGMVpVbGtJRDBnWjJWMFZXNXBjWFZsU1dSR2NtOXRVM1JsY0NodmRHaGxjbE4wWlhBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gxYm1seGRXVkpaQ0E5UFQwZ2IzUm9aWEpWYm1seGRXVkpaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ0ZrYVdabUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHbG1aaUE5SUNodmRHaGxjbE4wWlhBdWRHbHRaVk4wWVcxd0lDMGdjM1JsY0M1MGFXMWxVM1JoYlhBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbmJtOXlaU0E5SUNGcGMwbHRjRzl5ZEdGdWRGTjBaWEFvYjNSb1pYSlRkR1Z3S1NBbUppQmthV1ptSUR3Z2FXMXdiM0owWVc1MFUzUmxjRXhsYm1kMGFEdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYVhOSmJuUmxjbUZqZEdsMlpWTjBaWEFvYjNSb1pYSlRkR1Z3S1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbmJtOXlaU0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnZVMnRwY0Z0MWJtbHhkV1ZKWkYwZ1BTQnBaMjV2Y21VN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUZkbEozSmxJSE5yYVhCd2FXNW5JSFJvYVhNZ1pXeGxiV1Z1ZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hSdlUydHBjRnRuWlhSVmJtbHhkV1ZKWkVaeWIyMVRkR1Z3S0hOMFpYQXBYU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKMWJrNWxlSFJUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdzSUhSdlUydHBjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnllVlZ1ZEdsc1JtOTFibVFvYzJObGJtRnlhVzhzSUhOMFpYQXNJR3h2WTJGMGIzSXNJR2RsZEZScGJXVnZkWFFvYzJObGJtRnlhVzhzSUdsa2VDa3BMblJvWlc0b1puVnVZM1JwYjI0Z0tHVnNaWE1wSUh0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdWc1pTQTlJR1ZzWlhOYk1GMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2RHRm5UbUZ0WlNBOUlHVnNaUzUwWVdkT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzNWd2NHOXlkSE5KYm5CMWRFVjJaVzUwSUQwZ2RHRm5UbUZ0WlNBOVBUMGdKMmx1Y0hWMEp5QjhmQ0IwWVdkT1lXMWxJRDA5UFNBbmRHVjRkR0Z5WldFbklIeDhJR1ZzWlM1blpYUkJkSFJ5YVdKMWRHVW9KMk52Ym5SbGJuUmxaR2wwWVdKc1pTY3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFpsYm5SekxtbHVaR1Y0VDJZb2MzUmxjQzVsZG1WdWRFNWhiV1VwSUQ0OUlEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJRzl3ZEdsdmJuTWdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaR0YwWVM1aWRYUjBiMjRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2Y0hScGIyNXpMbmRvYVdOb0lEMGdiM0IwYVc5dWN5NWlkWFIwYjI0Z1BTQnpkR1Z3TG1SaGRHRXVZblYwZEc5dU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdMeThnWTI5dWMyOXNaUzVzYjJjb0oxTnBiWFZzWVhScGJtY2dKeUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnSnlCdmJpQmxiR1Z0Wlc1MElDY3NJR1ZzWlN3Z2JHOWpZWFJ2Y2k1elpXeGxZM1J2Y25OYk1GMHNJRndpSUdadmNpQnpkR1Z3SUZ3aUlDc2dhV1I0S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkamJHbGpheWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FrS0dWc1pTa3VkSEpwWjJkbGNpZ25ZMnhwWTJzbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNnb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oyWnZZM1Z6SnlCOGZDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBOVBTQW5ZbXgxY2ljcElDWW1JR1ZzWlZ0emRHVndMbVYyWlc1MFRtRnRaVjBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdWYmMzUmxjQzVsZG1WdWRFNWhiV1ZkS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdWYmMzUmxjQzVsZG1WdWRFNWhiV1ZkS0dWc1pTd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhOMFpYQXVaR0YwWVM1MllXeDFaU0FoUFNCY0luVnVaR1ZtYVc1bFpGd2lLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaV3hsTG5aaGJIVmxJRDBnYzNSbGNDNWtZWFJoTG5aaGJIVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDOHZJRVp2Y2lCaWNtOTNjMlZ5Y3lCMGFHRjBJSE4xY0hCdmNuUWdkR2hsSUdsdWNIVjBJR1YyWlc1MExseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkWEJ3YjNKMGMwbHVjSFYwUlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbVYyWlc1MEtHVnNaU3dnSjJsdWNIVjBKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtVjJaVzUwS0dWc1pTd2dKMk5vWVc1blpTY3BPeUF2THlCVWFHbHpJSE5vYjNWc1pDQmlaU0JtYVhKbFpDQmhablJsY2lCaElHSnNkWElnWlhabGJuUXVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBaWEF1WlhabGJuUk9ZVzFsSUQwOUlDZHJaWGx3Y21WemN5Y3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR3RsZVNBOUlGTjBjbWx1Wnk1bWNtOXRRMmhoY2tOdlpHVW9jM1JsY0M1a1lYUmhMbXRsZVVOdlpHVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlM1clpYbHdjbVZ6Y3lobGJHVXNJR3RsZVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbXRsZVdSdmQyNG9aV3hsTENCclpYa3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnNaUzUyWVd4MVpTQTlJSE4wWlhBdVpHRjBZUzUyWVd4MVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1WlhabGJuUW9aV3hsTENBblkyaGhibWRsSnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1YTJWNWRYQW9aV3hsTENCclpYa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1Z3Y0c5eWRITkpibkIxZEVWMlpXNTBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaUzVsZG1WdWRDaGxiR1VzSUNkcGJuQjFkQ2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuZG1Gc2FXUmhkR1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktDZFdZV3hwWkdGMFpUb2dKeUFySUVwVFQwNHVjM1J5YVc1bmFXWjVLR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpLU0FnS3lCY0lpQmpiMjUwWVdsdWN5QjBaWGgwSUNkY0lpQWdLeUJ6ZEdWd0xtUmhkR0V1ZEdWNGRDQXJJRndpSjF3aUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExtRjFkRzlTZFc0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY25WdVRtVjRkRk4wWlhBb2MyTmxibUZ5YVc4c0lHbGtlQ3dnZEc5VGEybHdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUxDQm1kVzVqZEdsdmJpQW9jbVZ6ZFd4MEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR1Z3TG1WMlpXNTBUbUZ0WlNBOVBTQW5kbUZzYVdSaGRHVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eVpYQnZjblJNYjJjb1hDSldZV3hwWkdGMFpUb2dYQ0lnS3lCeVpYTjFiSFFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWMzUnZjRk5qWlc1aGNtbHZLR1poYkhObEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNocGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owUlhKeWIzSW9YQ0pHWVdsc1pXUWdiMjRnYzNSbGNEb2dYQ0lnS3lCcFpIZ2dLeUJjSWlBZ1JYWmxiblE2SUZ3aUlDc2djM1JsY0M1bGRtVnVkRTVoYldVZ0t5QmNJaUJTWldGemIyNDZJRndpSUNzZ2NtVnpkV3gwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjM1J2Y0ZOalpXNWhjbWx2S0daaGJITmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MyVjBkR2x1WjNNdVoyVjBLQ2QyWlhKaWIzTmxKeWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LSEpsYzNWc2RDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1aGRYUnZVblZ1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNU9aWGgwVTNSbGNDaHpZMlZ1WVhKcGJ5d2dhV1I0TENCMGIxTnJhWEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVmVnh1WEc1bWRXNWpkR2x2YmlCM1lXbDBSbTl5UVc1bmRXeGhjaWh5YjI5MFUyVnNaV04wYjNJcElIdGNiaUFnSUNCMllYSWdaV3dnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLSEp2YjNSVFpXeGxZM1J2Y2lrN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1SUNoeVpYTnZiSFpsTENCeVpXcGxZM1FwSUh0Y2JpQWdJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doZDJsdVpHOTNMbUZ1WjNWc1lYSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KMkZ1WjNWc1lYSWdZMjkxYkdRZ2JtOTBJR0psSUdadmRXNWtJRzl1SUhSb1pTQjNhVzVrYjNjbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoaGJtZDFiR0Z5TG1kbGRGUmxjM1JoWW1sc2FYUjVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWVc1bmRXeGhjaTVuWlhSVVpYTjBZV0pwYkdsMGVTaGxiQ2t1ZDJobGJsTjBZV0pzWlNoeVpYTnZiSFpsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGaGJtZDFiR0Z5TG1Wc1pXMWxiblFvWld3cExtbHVhbVZqZEc5eUtDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkeWIyOTBJR1ZzWlcxbGJuUWdLQ2NnS3lCeWIyOTBVMlZzWldOMGIzSWdLeUFuS1NCb1lYTWdibThnYVc1cVpXTjBiM0l1SnlBclhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBbklIUm9hWE1nYldGNUlHMWxZVzRnYVhRZ2FYTWdibTkwSUdsdWMybGtaU0J1WnkxaGNIQXVKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdGdVozVnNZWEl1Wld4bGJXVnVkQ2hsYkNrdWFXNXFaV04wYjNJb0tTNW5aWFFvSnlSaWNtOTNjMlZ5SnlrdVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JtOTBhV1o1VjJobGJrNXZUM1YwYzNSaGJtUnBibWRTWlhGMVpYTjBjeWh5WlhOdmJIWmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU0JqWVhSamFDQW9aWEp5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WldwbFkzUW9aWEp5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCcGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZzWldGMlpTY2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ2MzUmxjQzVsZG1WdWRFNWhiV1VnSVQwZ0oyMXZkWE5sYjNWMEp5QW1KbHh1SUNBZ0lDQWdJQ0FnSUNCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZsYm5SbGNpY2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ2MzUmxjQzVsZG1WdWRFNWhiV1VnSVQwZ0oyMXZkWE5sYjNabGNpY2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ2MzUmxjQzVsZG1WdWRFNWhiV1VnSVQwZ0oySnNkWEluSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJSE4wWlhBdVpYWmxiblJPWVcxbElDRTlJQ2RtYjJOMWN5YzdYRzU5WEc1Y2JpOHFLbHh1SUNvZ1VtVjBkWEp1Y3lCMGNuVmxJR2xtSUhSb1pTQm5hWFpsYmlCemRHVndJR2x6SUhOdmJXVWdjMjl5ZENCdlppQjFjMlZ5SUdsdWRHVnlZV04wYVc5dVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselNXNTBaWEpoWTNScGRtVlRkR1Z3S0hOMFpYQXBJSHRjYmlBZ0lDQjJZWElnWlhaMElEMGdjM1JsY0M1bGRtVnVkRTVoYldVN1hHNWNiaUFnSUNBdktseHVJQ0FnSUNBZ0lDOHZJRWx1ZEdWeVpYTjBhVzVuSUc1dmRHVXNJR1J2YVc1bklIUm9aU0JtYjJ4c2IzZHBibWNnZDJGeklHTmhkWE5wYm1jZ2RHaHBjeUJtZFc1amRHbHZiaUIwYnlCeVpYUjFjbTRnZFc1a1pXWnBibVZrTGx4dUlDQWdJQ0FnSUhKbGRIVnlibHh1SUNBZ0lDQWdJQ0FnSUNCbGRuUXVhVzVrWlhoUFppaGNJbTF2ZFhObFhDSXBJQ0U5UFNBd0lIeDhYRzRnSUNBZ0lDQWdJQ0FnSUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWa2IzZHVYQ0lwSUQwOVBTQXdJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1SbGVFOW1LRndpYlc5MWMyVjFjRndpS1NBOVBUMGdNRHRjYmx4dUlDQWdJQ0FnSUM4dklFbDBjeUJpWldOaGRYTmxJSFJvWlNCamIyNWthWFJwYjI1eklIZGxjbVVnYm05MElHOXVJSFJvWlNCellXMWxJR3hwYm1VZ1lYTWdkR2hsSUhKbGRIVnliaUJ6ZEdGMFpXMWxiblJjYmlBZ0lDQXFMMXh1SUNBZ0lISmxkSFZ5YmlCbGRuUXVhVzVrWlhoUFppaGNJbTF2ZFhObFhDSXBJQ0U5UFNBd0lIeDhJR1YyZEM1cGJtUmxlRTltS0Z3aWJXOTFjMlZrYjNkdVhDSXBJRDA5UFNBd0lIeDhJR1YyZEM1cGJtUmxlRTltS0Z3aWJXOTFjMlYxY0Z3aUtTQTlQVDBnTUR0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnZEhKNVZXNTBhV3hHYjNWdVpDaHpZMlZ1WVhKcGJ5d2djM1JsY0N3Z2JHOWpZWFJ2Y2l3Z2RHbHRaVzkxZEN3Z2RHVjRkRlJ2UTJobFkyc3BJSHRjYmlBZ0lDQjJZWElnYzNSaGNuUmxaRHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdJQ0JtZFc1amRHbHZiaUIwY25sR2FXNWtLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGemRHRnlkR1ZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhjblJsWkNBOUlHNWxkeUJFWVhSbEtDa3VaMlYwVkdsdFpTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdaV3hsY3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCbWIzVnVaRlJ2YjAxaGJua2dQU0JtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm1iM1Z1WkZaaGJHbGtJRDBnWm1Gc2MyVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdabTkxYm1SRWFXWm1aWEpsYm5SVVpYaDBJRDBnWm1Gc2MyVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjMlZzWldOMGIzSnpWRzlVWlhOMElEMGdiRzlqWVhSdmNpNXpaV3hsWTNSdmNuTXVjMnhwWTJVb01DazdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdkR1Y0ZEZSdlEyaGxZMnNnUFNCemRHVndMbVJoZEdFdWRHVjRkRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJqYjIxd1lYSnBjMjl1SUQwZ2MzUmxjQzVrWVhSaExtTnZiWEJoY21semIyNGdmSHdnWENKbGNYVmhiSE5jSWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5sYkdWamRHOXljMVJ2VkdWemRDNTFibk5vYVdaMEtDZGJaR0YwWVMxMWJtbHhkV1V0YVdROVhDSW5JQ3NnYkc5allYUnZjaTUxYm1seGRXVkpaQ0FySUNkY0lsMG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2djMlZzWldOMGIzSnpWRzlVWlhOMExteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITmxiR1ZqZEc5eUlEMGdjMlZzWldOMGIzSnpWRzlVWlhOMFcybGRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNocGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVnNaV04wYjNJZ0t6MGdYQ0k2ZG1semFXSnNaVndpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVnpJRDBnSkNoelpXeGxZM1J2Y2lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1ZzWlhNdWJHVnVaM1JvSUQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQjBaWGgwVkc5RGFHVmpheUFoUFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUc1bGQxUmxlSFFnUFNBa0tHVnNaWE5iTUYwcExuUmxlSFFvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDZ29ZMjl0Y0dGeWFYTnZiaUE5UFQwZ0oyVnhkV0ZzY3ljZ0ppWWdibVYzVkdWNGRDQTlQVDBnZEdWNGRGUnZRMmhsWTJzcElIeDhYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnS0dOdmJYQmhjbWx6YjI0Z1BUMDlJQ2RqYjI1MFlXbHVjeWNnSmlZZ2JtVjNWR1Y0ZEM1cGJtUmxlRTltS0hSbGVIUlViME5vWldOcktTQStQU0F3S1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1p2ZFc1a1ZtRnNhV1FnUFNCMGNuVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNWdVpFUnBabVpsY21WdWRGUmxlSFFnUFNCMGNuVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm05MWJtUldZV3hwWkNBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdWekxtRjBkSElvSjJSaGRHRXRkVzVwY1hWbExXbGtKeXdnYkc5allYUnZjaTUxYm1seGRXVkpaQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHVnNaWE11YkdWdVozUm9JRDRnTVNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNWdVpGUnZiMDFoYm5rZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dadmRXNWtWbUZzYVdRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtHVnNaWE1wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzBsdGNHOXlkR0Z1ZEZOMFpYQW9jM1JsY0NrZ0ppWWdLRzVsZHlCRVlYUmxLQ2t1WjJWMFZHbHRaU2dwSUMwZ2MzUmhjblJsWkNrZ1BDQjBhVzFsYjNWMElDb2dOU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb2RISjVSbWx1WkN3Z05UQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjbVZ6ZFd4MElEMGdYQ0pjSWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9abTkxYm1SVWIyOU5ZVzU1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzNWc2RDQTlJQ2REYjNWc1pDQnViM1FnWm1sdVpDQmhjSEJ5YjNCeWFXRjBaU0JsYkdWdFpXNTBJR1p2Y2lCelpXeGxZM1J2Y25NNklDY2dLeUJLVTA5T0xuTjBjbWx1WjJsbWVTaHNiMk5oZEc5eUxuTmxiR1ZqZEc5eWN5a2dLeUJjSWlCbWIzSWdaWFpsYm5RZ1hDSWdLeUJ6ZEdWd0xtVjJaVzUwVG1GdFpTQXJJRndpTGlBZ1VtVmhjMjl1T2lCR2IzVnVaQ0JVYjI4Z1RXRnVlU0JGYkdWdFpXNTBjMXdpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb1ptOTFibVJFYVdabVpYSmxiblJVWlhoMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMzVnNkQ0E5SUNkRGIzVnNaQ0J1YjNRZ1ptbHVaQ0JoY0hCeWIzQnlhV0YwWlNCbGJHVnRaVzUwSUdadmNpQnpaV3hsWTNSdmNuTTZJQ2NnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hzYjJOaGRHOXlMbk5sYkdWamRHOXljeWtnS3lCY0lpQm1iM0lnWlhabGJuUWdYQ0lnS3lCemRHVndMbVYyWlc1MFRtRnRaU0FySUZ3aUxpQWdVbVZoYzI5dU9pQlVaWGgwSUdSdlpYTnVKM1FnYldGMFkyZ3VJQ0JjWEc1RmVIQmxZM1JsWkRwY1hHNWNJaUFySUhSbGVIUlViME5vWldOcklDc2dYQ0pjWEc1aWRYUWdkMkZ6WEZ4dVhDSWdLeUJsYkdWekxuUmxlSFFvS1NBcklGd2lYRnh1WENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ6ZFd4MElEMGdKME52ZFd4a0lHNXZkQ0JtYVc1a0lHRndjSEp2Y0hKcFlYUmxJR1ZzWlcxbGJuUWdabTl5SUhObGJHVmpkRzl5Y3pvZ0p5QXJJRXBUVDA0dWMzUnlhVzVuYVdaNUtHeHZZMkYwYjNJdWMyVnNaV04wYjNKektTQXJJRndpSUdadmNpQmxkbVZ1ZENCY0lpQXJJSE4wWlhBdVpYWmxiblJPWVcxbElDc2dYQ0l1SUNCU1pXRnpiMjQ2SUU1dklHVnNaVzFsYm5SeklHWnZkVzVrWENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxhbVZqZENoeVpYTjFiSFFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ2RtRnlJR3hwYldsMElEMGdhVzF3YjNKMFlXNTBVM1JsY0V4bGJtZDBhQ0F2SUNoMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDQTlQU0FuY21WaGJIUnBiV1VuSUQ4Z0p6RW5JRG9nZFhSdFpTNXpkR0YwWlM1eWRXNHVjM0JsWldRcE8xeHVJQ0FnSUNBZ0lDQnBaaUFvWjJ4dlltRnNMbUZ1WjNWc1lYSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIZGhhWFJHYjNKQmJtZDFiR0Z5S0NkYmJtY3RZWEJ3WFNjcExuUm9aVzRvWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG5OMFlYUmxMbkoxYmk1emNHVmxaQ0E5UFQwZ0ozSmxZV3gwYVcxbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMFZHbHRaVzkxZENoMGNubEdhVzVrTENCMGFXMWxiM1YwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDQTlQVDBnSjJaaGMzUmxjM1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBjbmxHYVc1a0tDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFJVYVcxbGIzVjBLSFJ5ZVVacGJtUXNJRTFoZEdndWJXbHVLSFJwYldWdmRYUWdLaUIxZEcxbExuTjBZWFJsTG5KMWJpNXpjR1ZsWkN3Z2JHbHRhWFFwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXpkR0YwWlM1eWRXNHVjM0JsWldRZ1BUMDlJQ2R5WldGc2RHbHRaU2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtIUnllVVpwYm1Rc0lIUnBiV1Z2ZFhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDQTlQVDBnSjJaaGMzUmxjM1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RISjVSbWx1WkNncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WlhSVWFXMWxiM1YwS0hSeWVVWnBibVFzSUUxaGRHZ3ViV2x1S0hScGJXVnZkWFFnS2lCMWRHMWxMbk4wWVhSbExuSjFiaTV6Y0dWbFpDd2diR2x0YVhRcEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCblpYUlVhVzFsYjNWMEtITmpaVzVoY21sdkxDQnBaSGdwSUh0Y2JpQWdJQ0JwWmlBb2FXUjRJRDRnTUNrZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJKWmlCMGFHVWdjSEpsZG1sdmRYTWdjM1JsY0NCcGN5QmhJSFpoYkdsa1lYUmxJSE4wWlhBc0lIUm9aVzRnYW5WemRDQnRiM1psSUc5dUxDQmhibVFnY0hKbGRHVnVaQ0JwZENCcGMyNG5kQ0IwYUdWeVpWeHVJQ0FnSUNBZ0lDQXZMeUJQY2lCcFppQnBkQ0JwY3lCaElITmxjbWxsY3lCdlppQnJaWGx6TENCMGFHVnVJR2R2WEc0Z0lDQWdJQ0FnSUdsbUlDaHpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIZ2dMU0F4WFM1bGRtVnVkRTVoYldVZ1BUMGdKM1poYkdsa1lYUmxKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlEQTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlRjB1ZEdsdFpWTjBZVzF3SUMwZ2MyTmxibUZ5YVc4dWMzUmxjSE5iYVdSNElDMGdNVjB1ZEdsdFpWTjBZVzF3TzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z01EdGNibjFjYmx4dVpuVnVZM1JwYjI0Z2NuVnVUbVY0ZEZOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUN3Z2RHOVRhMmx3TENCMGFXMWxiM1YwS1NCN1hHNGdJQ0FnTHk4Z1RXRnJaU0J6ZFhKbElIZGxJR0Z5Wlc0bmRDQm5iMmx1WnlCMGJ5QnZkbVZ5Wm14dmR5QjBhR1VnWTJGc2JDQnpkR0ZqYXk1Y2JpQWdJQ0J6WlhSVWFXMWxiM1YwS0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYzJObGJtRnlhVzh1YzNSbGNITXViR1Z1WjNSb0lENGdLR2xrZUNBcklERXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlkVzVUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdnS3lBeExDQjBiMU5yYVhBcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXpkRzl3VTJObGJtRnlhVzhvZEhKMVpTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMQ0IwYVcxbGIzVjBJSHg4SURBcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCbWNtRm5iV1Z1ZEVaeWIyMVRkSEpwYm1jb2MzUnlTRlJOVENrZ2UxeHVJQ0FnSUhaaGNpQjBaVzF3SUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUld4bGJXVnVkQ2duZEdWdGNHeGhkR1VuS1R0Y2JpQWdJQ0IwWlcxd0xtbHVibVZ5U0ZSTlRDQTlJSE4wY2toVVRVdzdYRzRnSUNBZ0x5OGdZMjl1YzI5c1pTNXNiMmNvZEdWdGNDNXBibTVsY2toVVRVd3BPMXh1SUNBZ0lISmxkSFZ5YmlCMFpXMXdMbU52Ym5SbGJuUWdQeUIwWlcxd0xtTnZiblJsYm5RZ09pQjBaVzF3TzF4dWZWeHVYRzVtZFc1amRHbHZiaUJuWlhSVmJtbHhkV1ZKWkVaeWIyMVRkR1Z3S0hOMFpYQXBJSHRjYmlBZ0lDQnlaWFIxY200Z2MzUmxjQ0FtSmlCemRHVndMbVJoZEdFZ0ppWWdjM1JsY0M1a1lYUmhMbXh2WTJGMGIzSWdKaVlnYzNSbGNDNWtZWFJoTG14dlkyRjBiM0l1ZFc1cGNYVmxTV1E3WEc1OVhHNWNiblpoY2lCbmRXbGtJRDBnS0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNCbWRXNWpkR2x2YmlCek5DZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRTFoZEdndVpteHZiM0lvS0RFZ0t5Qk5ZWFJvTG5KaGJtUnZiU2dwS1NBcUlEQjRNVEF3TURBcFhHNGdJQ0FnSUNBZ0lDQWdJQ0F1ZEc5VGRISnBibWNvTVRZcFhHNGdJQ0FnSUNBZ0lDQWdJQ0F1YzNWaWMzUnlhVzVuS0RFcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY3pRb0tTQXJJSE0wS0NrZ0t5QW5MU2NnS3lCek5DZ3BJQ3NnSnkwbklDc2djelFvS1NBcklDY3RKeUFyWEc0Z0lDQWdJQ0FnSUNBZ0lDQnpOQ2dwSUNzZ0p5MG5JQ3NnY3pRb0tTQXJJSE0wS0NrZ0t5QnpOQ2dwTzF4dUlDQWdJSDA3WEc1OUtTZ3BPMXh1WEc1MllYSWdiR2x6ZEdWdVpYSnpJRDBnVzEwN1hHNTJZWElnYzNSaGRHVTdYRzUyWVhJZ2MyVjBkR2x1WjNNN1hHNTJZWElnZFhSdFpTQTlJSHRjYmlBZ0lDQnpkR0YwWlRvZ2MzUmhkR1VzWEc0Z0lDQWdhVzVwZERvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2MyTmxibUZ5YVc4Z1BTQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9KM1YwYldWZmMyTmxibUZ5YVc4bktUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIVjBiV1V1Ykc5aFpGTmxkSFJwYm1kektDa3VkR2hsYmlobWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYjJOaGJGTjBiM0poWjJVdVkyeGxZWElvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaU0E5SUhWMGJXVXVjM1JoZEdVZ1BTQjFkRzFsTG14dllXUlRkR0YwWlVaeWIyMVRkRzl5WVdkbEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0owbE9TVlJKUVV4SldrVkVKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMFZHbHRaVzkxZENobWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMblJsYzNSVFpYSjJaWElnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb1hDSjFkRzFsWDNSbGMzUmZjMlZ5ZG1WeVhDSXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzVoZFhSdlVuVnVJRDBnZEhKMVpUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjblZ1UTI5dVptbG5JRDBnWjJWMFVHRnlZVzFsZEdWeVFubE9ZVzFsS0NkMWRHMWxYM0oxYmw5amIyNW1hV2NuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hKMWJrTnZibVpwWnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVRMjl1Wm1sbklEMGdTbE5QVGk1d1lYSnpaU2h5ZFc1RGIyNW1hV2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKMWJrTnZibVpwWnlBOUlISjFia052Ym1acFp5QjhmQ0I3ZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhOd1pXVmtJRDBnWjJWMFVHRnlZVzFsZEdWeVFubE9ZVzFsS0NkMWRHMWxYM0oxYmw5emNHVmxaQ2NwSUh4OElITmxkSFJwYm1kekxtZGxkQ2hjSW5KMWJtNWxjaTV6Y0dWbFpGd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE53WldWa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVEYjI1bWFXY3VjM0JsWldRZ1BTQnpjR1ZsWkR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y25WdVUyTmxibUZ5YVc4b2MyTmxibUZ5YVc4c0lISjFia052Ym1acFp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU3dnTWpBd01DazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxJRDBnZFhSdFpTNXpkR0YwWlNBOUlIVjBiV1V1Ykc5aFpGTjBZWFJsUm5KdmJWTjBiM0poWjJVb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblNVNUpWRWxCVEVsYVJVUW5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmhkR1V1YzNSaGRIVnpJRDA5UFNCY0lsQk1RVmxKVGtkY0lpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNU9aWGgwVTNSbGNDaHpkR0YwWlM1eWRXNHVjMk5sYm1GeWFXOHNJSE4wWVhSbExuSjFiaTV6ZEdWd1NXNWtaWGdwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb0lYTjBZWFJsTG5OMFlYUjFjeUI4ZkNCemRHRjBaUzV6ZEdGMGRYTWdQVDA5SUNkSlRrbFVTVUZNU1ZwSlRrY25LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUZ3aVRFOUJSRVZFWENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNCOUxGeHVJQ0FnSUdKeWIyRmtZMkZ6ZERvZ1puVnVZM1JwYjI0Z0tHVjJkQ3dnWlhaMFJHRjBZU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9iR2x6ZEdWdVpYSnpJQ1ltSUd4cGMzUmxibVZ5Y3k1c1pXNW5kR2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYkdsemRHVnVaWEp6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiR2x6ZEdWdVpYSnpXMmxkS0dWMmRDd2daWFowUkdGMFlTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhOMFlYSjBVbVZqYjNKa2FXNW5PaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGMFpTNXpkR0YwZFhNZ0lUMGdKMUpGUTA5U1JFbE9SeWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSbExuTjBZWFIxY3lBOUlDZFNSVU5QVWtSSlRrY25PMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1V1YzNSbGNITWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lVbVZqYjNKa2FXNW5JRk4wWVhKMFpXUmNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblVrVkRUMUpFU1U1SFgxTlVRVkpVUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtGd2liRzloWkZ3aUxDQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEpzT2lCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEJ5YjNSdlkyOXNPaUIzYVc1a2IzY3ViRzlqWVhScGIyNHVjSEp2ZEc5amIyd3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdodmMzUTZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9iM04wTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaV0Z5WTJnNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1elpXRnlZMmdzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHaGhjMmc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTVvWVhOb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ2NuVnVVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h1WVcxbExDQmpiMjVtYVdjcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhSdlVuVnVJRDBnYm1GdFpTQjhmQ0J3Y205dGNIUW9KMU5qWlc1aGNtbHZJSFJ2SUhKMWJpY3BPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1lYVjBiMUoxYmlBOUlDRnVZVzFsSUQ4Z2NISnZiWEIwS0NkWGIzVnNaQ0I1YjNVZ2JHbHJaU0IwYnlCemRHVndJSFJvY205MVoyZ2daV0ZqYUNCemRHVndJQ2g1Zkc0cFB5Y3BJQ0U5SUNkNUp5QTZJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCblpYUlRZMlZ1WVhKcGJ5aDBiMUoxYmlrdWRHaGxiaWhtZFc1amRHbHZiaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5qWlc1aGNtbHZJRDBnU2xOUFRpNXdZWEp6WlNoS1UwOU9Mbk4wY21sdVoybG1lU2h6WTJWdVlYSnBieWtwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1emRHRjBaUzV5ZFc0Z1BTQmZMbVY0ZEdWdVpDaDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM0JsWldRNklDY3hNQ2RjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHNJR052Ym1acFp5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lITmxkSFZ3UTI5dVpHbDBhVzl1Y3loelkyVnVZWEpwYnlrdWRHaGxiaWhtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1V1WVhWMGIxSjFiaUE5SUdGMWRHOVNkVzRnUFQwOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjM1JoZEhWeklEMGdYQ0pRVEVGWlNVNUhYQ0k3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbkpsY0c5eWRFeHZaeWhjSWxOMFlYSjBhVzVuSUZOalpXNWhjbWx2SUNkY0lpQXJJRzVoYldVZ0t5QmNJaWRjSWl3Z2MyTmxibUZ5YVc4cE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkUVRFRlpRa0ZEUzE5VFZFRlNWRVZFSnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVUZEdWd0tITmpaVzVoY21sdkxDQXdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEoxYms1bGVIUlRkR1Z3T2lCeWRXNU9aWGgwVTNSbGNDeGNiaUFnSUNCemRHOXdVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h6ZFdOalpYTnpLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpZMlZ1WVhKcGJ5QTlJSE4wWVhSbExuSjFiaUFtSmlCemRHRjBaUzV5ZFc0dWMyTmxibUZ5YVc4N1hHNGdJQ0FnSUNBZ0lHUmxiR1YwWlNCemRHRjBaUzV5ZFc0N1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUZ3aVRFOUJSRVZFWENJN1hHNGdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkUVRFRlpRa0ZEUzE5VFZFOVFVRVZFSnlrN1hHNWNiaUFnSUNBZ0lDQWdkWFJ0WlM1eVpYQnZjblJNYjJjb1hDSlRkRzl3Y0dsdVp5QlRZMlZ1WVhKcGIxd2lLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tITmpaVzVoY21sdktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1ZqWTJWemN5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVTNWalkyVnpjeWhjSWx0VFZVTkRSVk5UWFNCVFkyVnVZWEpwYnlBblhDSWdLeUJ6WTJWdVlYSnBieTV1WVcxbElDc2dYQ0luSUVOdmJYQnNaWFJsWkNGY0lpazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LRndpVTNSdmNIQnBibWNnYjI0Z2NHRm5aU0JjSWlBcklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b2NtVm1LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEVWeWNtOXlLRndpVzBaQlNVeFZVa1ZkSUZOalpXNWhjbWx2SUNkY0lpQXJJSE5qWlc1aGNtbHZMbTVoYldVZ0t5QmNJaWNnVTNSdmNIQmxaQ0ZjSWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ1EzSmxZWFJsY3lCaElIUmxiWEJ2Y21GeWVTQmxiR1Z0Wlc1MElHeHZZMkYwYjNJc0lHWnZjaUIxYzJVZ2QybDBhQ0JtYVc1aGJHbDZaVXh2WTJGMGIzSmNiaUFnSUNBZ0tpOWNiaUFnSUNCamNtVmhkR1ZGYkdWdFpXNTBURzlqWVhSdmNqb2dablZ1WTNScGIyNGdLR1ZzWlcxbGJuUXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlIVnVhWEYxWlVsa0lEMGdaV3hsYldWdWRDNW5aWFJCZEhSeWFXSjFkR1VvWENKa1lYUmhMWFZ1YVhGMVpTMXBaRndpS1NCOGZDQm5kV2xrS0NrN1hHNGdJQ0FnSUNBZ0lHVnNaVzFsYm5RdWMyVjBRWFIwY21saWRYUmxLRndpWkdGMFlTMTFibWx4ZFdVdGFXUmNJaXdnZFc1cGNYVmxTV1FwTzF4dVhHNGdJQ0FnSUNBZ0lIWmhjaUJsYkdWSWRHMXNJRDBnWld4bGJXVnVkQzVqYkc5dVpVNXZaR1VvS1M1dmRYUmxja2hVVFV3N1hHNGdJQ0FnSUNBZ0lIWmhjaUJsYkdWVFpXeGxZM1J2Y25NZ1BTQmJYVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHVnNaVzFsYm5RdWRHRm5UbUZ0WlM1MGIxVndjR1Z5UTJGelpTZ3BJRDA5SUNkQ1QwUlpKeUI4ZkNCbGJHVnRaVzUwTG5SaFowNWhiV1V1ZEc5VmNIQmxja05oYzJVb0tTQTlQU0FuU0ZSTlRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnNaVk5sYkdWamRHOXljeUE5SUZ0bGJHVnRaVzUwTG5SaFowNWhiV1ZkTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaV3hsVTJWc1pXTjBiM0p6SUQwZ2MyVnNaV04wYjNKR2FXNWtaWElvWld4bGJXVnVkQ3dnWkc5amRXMWxiblF1WW05a2VTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVnVhWEYxWlVsa09pQjFibWx4ZFdWSlpDeGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGJHVmpkRzl5Y3pvZ1pXeGxVMlZzWldOMGIzSnpYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJSEpsWjJsemRHVnlSWFpsYm5RNklHWjFibU4wYVc5dUlDaGxkbVZ1ZEU1aGJXVXNJR1JoZEdFc0lHbGtlQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BJSHg4SUhWMGJXVXVhWE5XWVd4cFpHRjBhVzVuS0NrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2FXUjRJRDA5SUNkMWJtUmxabWx1WldRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1I0SUQwZ2RYUnRaUzV6ZEdGMFpTNXpkR1Z3Y3k1c1pXNW5kR2c3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV6ZEdWd2MxdHBaSGhkSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVjJaVzUwVG1GdFpUb2daWFpsYm5ST1lXMWxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwYldWVGRHRnRjRG9nYm1WM0lFUmhkR1VvS1M1blpYUlVhVzFsS0Nrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVG9nWkdGMFlWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZEZWa1ZPVkY5U1JVZEpVMVJGVWtWRUp5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lISmxjRzl5ZEV4dlp6b2dablZ1WTNScGIyNGdLR3h2Wnl3Z2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hKbGNHOXlkRWhoYm1Sc1pYSnpJQ1ltSUhKbGNHOXlkRWhoYm1Sc1pYSnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnlaWEJ2Y25SSVlXNWtiR1Z5Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsY0c5eWRFaGhibVJzWlhKelcybGRMbXh2Wnloc2IyY3NJSE5qWlc1aGNtbHZMQ0IxZEcxbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnY21Wd2IzSjBSWEp5YjNJNklHWjFibU4wYVc5dUlDaGxjbkp2Y2l3Z2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hKbGNHOXlkRWhoYm1Sc1pYSnpJQ1ltSUhKbGNHOXlkRWhoYm1Sc1pYSnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnlaWEJ2Y25SSVlXNWtiR1Z5Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsY0c5eWRFaGhibVJzWlhKelcybGRMbVZ5Y205eUtHVnljbTl5TENCelkyVnVZWEpwYnl3Z2RYUnRaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lISmxjRzl5ZEZOMVkyTmxjM002SUdaMWJtTjBhVzl1SUNodFpYTnpZV2RsTENCelkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvY21Wd2IzSjBTR0Z1Wkd4bGNuTWdKaVlnY21Wd2IzSjBTR0Z1Wkd4bGNuTXViR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ3YjNKMFNHRnVaR3hsY25OYmFWMHVjM1ZqWTJWemN5aHRaWE56WVdkbExDQnpZMlZ1WVhKcGJ5d2dkWFJ0WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlUR2x6ZEdWdVpYSTZJR1oxYm1OMGFXOXVJQ2hvWVc1a2JHVnlLU0I3WEc0Z0lDQWdJQ0FnSUd4cGMzUmxibVZ5Y3k1d2RYTm9LR2hoYm1Sc1pYSXBPMXh1SUNBZ0lIMHNYRzRnSUNBZ2NtVm5hWE4wWlhKVFlYWmxTR0Z1Wkd4bGNqb2dablZ1WTNScGIyNGdLR2hoYm1Sc1pYSXBJSHRjYmlBZ0lDQWdJQ0FnYzJGMlpVaGhibVJzWlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV2RwYzNSbGNsSmxjRzl5ZEVoaGJtUnNaWEk2SUdaMWJtTjBhVzl1SUNob1lXNWtiR1Z5S1NCN1hHNGdJQ0FnSUNBZ0lISmxjRzl5ZEVoaGJtUnNaWEp6TG5CMWMyZ29hR0Z1Wkd4bGNpazdYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpXZHBjM1JsY2t4dllXUklZVzVrYkdWeU9pQm1kVzVqZEdsdmJpQW9hR0Z1Wkd4bGNpa2dlMXh1SUNBZ0lDQWdJQ0JzYjJGa1NHRnVaR3hsY25NdWNIVnphQ2hvWVc1a2JHVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISmxaMmx6ZEdWeVUyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNqb2dablZ1WTNScGIyNGdLR2hoYm1Sc1pYSXBJSHRjYmlBZ0lDQWdJQ0FnYzJWMGRHbHVaM05NYjJGa1NHRnVaR3hsY25NdWNIVnphQ2hvWVc1a2JHVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHbHpVbVZqYjNKa2FXNW5PaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhWMGJXVXVjM1JoZEdVdWMzUmhkSFZ6TG1sdVpHVjRUMllvWENKU1JVTlBVa1JKVGtkY0lpa2dQVDA5SURBN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JwYzFCc1lYbHBibWM2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzV6ZEdGMFpTNXpkR0YwZFhNdWFXNWtaWGhQWmloY0lsQk1RVmxKVGtkY0lpa2dQVDA5SURBN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JwYzFaaGJHbGtZWFJwYm1jNklHWjFibU4wYVc5dUtIWmhiR2xrWVhScGJtY3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCMllXeHBaR0YwYVc1bklDRTlQU0FuZFc1a1pXWnBibVZrSnlBbUppQW9kWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BJSHg4SUhWMGJXVXVhWE5XWVd4cFpHRjBhVzVuS0NrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wWVhSbExuTjBZWFIxY3lBOUlIWmhiR2xrWVhScGJtY2dQeUJjSWxaQlRFbEVRVlJKVGtkY0lpQTZJRndpVWtWRFQxSkVTVTVIWENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25Wa0ZNU1VSQlZFbFBUbDlEU0VGT1IwVkVKeWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhWMGJXVXVjM1JoZEdVdWMzUmhkSFZ6TG1sdVpHVjRUMllvWENKV1FVeEpSRUZVU1U1SFhDSXBJRDA5UFNBd08xeHVJQ0FnSUgwc1hHNGdJQ0FnYzNSdmNGSmxZMjl5WkdsdVp6b2dablZ1WTNScGIyNGdLR2x1Wm04cElIdGNiaUFnSUNBZ0lDQWdhV1lnS0dsdVptOGdJVDA5SUdaaGJITmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYm1WM1UyTmxibUZ5YVc4Z1BTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JsY0hNNklITjBZWFJsTG5OMFpYQnpYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCZkxtVjRkR1Z1WkNodVpYZFRZMlZ1WVhKcGJ5d2dhVzVtYnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDZ2hibVYzVTJObGJtRnlhVzh1Ym1GdFpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzVsZDFOalpXNWhjbWx2TG01aGJXVWdQU0J3Y205dGNIUW9KMFZ1ZEdWeUlITmpaVzVoY21sdklHNWhiV1VuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0c1bGQxTmpaVzVoY21sdkxtNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV6WTJWdVlYSnBiM011Y0hWemFDaHVaWGRUWTJWdVlYSnBieWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jMkYyWlVoaGJtUnNaWEp6SUNZbUlITmhkbVZJWVc1a2JHVnljeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnpZWFpsU0dGdVpHeGxjbk11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmhkbVZJWVc1a2JHVnljMXRwWFNodVpYZFRZMlZ1WVhKcGJ5d2dkWFJ0WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCemRHRjBaUzV6ZEdGMGRYTWdQU0FuVEU5QlJFVkVKenRjYmx4dUlDQWdJQ0FnSUNCMWRHMWxMbUp5YjJGa1kyRnpkQ2duVWtWRFQxSkVTVTVIWDFOVVQxQlFSVVFuS1R0Y2JseHVJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnloY0lsSmxZMjl5WkdsdVp5QlRkRzl3Y0dWa1hDSXNJRzVsZDFOalpXNWhjbWx2S1R0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYkc5aFpGTmxkSFJwYm1kek9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhObGRIUnBibWR6SUQwZ2RYUnRaUzV6WlhSMGFXNW5jeUE5SUc1bGR5QlRaWFIwYVc1bmN5Z3BPMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNuTXViR1Z1WjNSb0lENGdNQ0FtSmlBaFoyVjBVR0Z5WVcxbGRHVnlRbmxPWVcxbEtDZDFkRzFsWDNOalpXNWhjbWx2SnlrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJ1WlhjZ1VISnZiV2x6WlNobWRXNWpkR2x2YmlBb2NtVnpiMngyWlN3Z2NtVnFaV04wS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNuTmJNRjBvWm5WdVkzUnBiMjRnS0hKbGMzQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBkR2x1WjNNdWMyVjBSR1ZtWVhWc2RITW9jbVZ6Y0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5TENCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMyOXNkbVVvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTZ3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmx4dUlDQWdJR3h2WVdSVGRHRjBaVVp5YjIxVGRHOXlZV2RsT2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCMWRHMWxVM1JoZEdWVGRISWdQU0JzYjJOaGJGTjBiM0poWjJVdVoyVjBTWFJsYlNnbmRYUnRaU2NwTzF4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlZOMFlYUmxVM1J5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTQTlJRXBUVDA0dWNHRnljMlVvZFhSdFpWTjBZWFJsVTNSeUtUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUjFjem9nWENKSlRrbFVTVUZNU1ZwSlRrZGNJaXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WTJWdVlYSnBiM002SUZ0ZFhHNGdJQ0FnSUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCemRHRjBaVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMkYyWlZOMFlYUmxWRzlUZEc5eVlXZGxPaUJtZFc1amRHbHZiaUFvZFhSdFpWTjBZWFJsS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbFUzUmhkR1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3h2WTJGc1UzUnZjbUZuWlM1elpYUkpkR1Z0S0NkMWRHMWxKeXdnU2xOUFRpNXpkSEpwYm1kcFpua29kWFJ0WlZOMFlYUmxLU2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNiMk5oYkZOMGIzSmhaMlV1Y21WdGIzWmxTWFJsYlNnbmRYUnRaU2NwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhWdWJHOWhaRG9nWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQjFkRzFsTG5OaGRtVlRkR0YwWlZSdlUzUnZjbUZuWlNoemRHRjBaU2s3WEc0Z0lDQWdmVnh1ZlR0Y2JseHVablZ1WTNScGIyNGdkRzluWjJ4bFNHbG5hR3hwWjJoMEtHVnNaU3dnZG1Gc2RXVXBJSHRjYmlBZ0lDQWtLR1ZzWlNrdWRHOW5aMnhsUTJ4aGMzTW9KM1YwYldVdGRtVnlhV1o1Snl3Z2RtRnNkV1VwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUIwYjJkbmJHVlNaV0ZrZVNobGJHVXNJSFpoYkhWbEtTQjdYRzRnSUNBZ0pDaGxiR1VwTG5SdloyZHNaVU5zWVhOektDZDFkRzFsTFhKbFlXUjVKeXdnZG1Gc2RXVXBPMXh1ZlZ4dVhHNHZLaXBjYmlBcUlFbG1JSGx2ZFNCamJHbGpheUJ2YmlCaElITndZVzRnYVc0Z1lTQnNZV0psYkN3Z2RHaGxJSE53WVc0Z2QybHNiQ0JqYkdsamF5eGNiaUFxSUhSb1pXNGdkR2hsSUdKeWIzZHpaWElnZDJsc2JDQm1hWEpsSUhSb1pTQmpiR2xqYXlCbGRtVnVkQ0JtYjNJZ2RHaGxJR2x1Y0hWMElHTnZiblJoYVc1bFpDQjNhWFJvYVc0Z2RHaGxJSE53WVc0c1hHNGdLaUJUYnl3Z2QyVWdiMjVzZVNCM1lXNTBJSFJ2SUhSeVlXTnJJSFJvWlNCcGJuQjFkQ0JqYkdsamEzTXVYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpUbTkwU1c1TVlXSmxiRTl5Vm1Gc2FXUW9aV3hsS1NCN1hHNGdJQ0FnY21WMGRYSnVJQ1FvWld4bEtTNXdZWEpsYm5SektDZHNZV0psYkNjcExteGxibWQwYUNBOVBTQXdJSHg4WEc0Z0lDQWdJQ0FnSUNBZ1pXeGxMbTV2WkdWT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrZ1BUMGdKMmx1Y0hWMEp6dGNibjFjYmx4dWRtRnlJSFJwYldWeWN5QTlJRnRkTzF4dVhHNW1kVzVqZEdsdmJpQnBibWwwUlhabGJuUklZVzVrYkdWeWN5Z3BJSHRjYmx4dUlDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnWlhabGJuUnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lHUnZZM1Z0Wlc1MExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb1pYWmxiblJ6VzJsZExDQW9ablZ1WTNScGIyNGdLR1YyZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHaGhibVJzWlhJZ1BTQm1kVzVqZEdsdmJpQW9aU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaGxMbWx6VkhKcFoyZGxjaWxjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWFYTlNaV052Y21ScGJtY29LU0FtSmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxMblJoY21kbGRDNW9ZWE5CZEhSeWFXSjFkR1VnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJV1V1ZEdGeVoyVjBMbWhoYzBGMGRISnBZblYwWlNnblpHRjBZUzFwWjI1dmNtVW5LU0FtSmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWtLR1V1ZEdGeVoyVjBLUzV3WVhKbGJuUnpLRndpVzJSaGRHRXRhV2R1YjNKbFhWd2lLUzVzWlc1bmRHZ2dQVDBnTUNBbUpseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwYzA1dmRFbHVUR0ZpWld4UGNsWmhiR2xrS0dVdWRHRnlaMlYwS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnBaSGdnUFNCMWRHMWxMbk4wWVhSbExuTjBaWEJ6TG14bGJtZDBhRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnWVhKbmN5QTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYkc5allYUnZjam9nZFhSdFpTNWpjbVZoZEdWRmJHVnRaVzUwVEc5allYUnZjaWhsTG5SaGNtZGxkQ2xjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUIwYVcxbGNqdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hsTG5kb2FXTm9JSHg4SUdVdVluVjBkRzl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHRnlaM011WW5WMGRHOXVJRDBnWlM1M2FHbGphQ0I4ZkNCbExtSjFkSFJ2Ymp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1pYWjBJRDA5SUNkdGIzVnpaVzkyWlhJbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dkSEoxWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBiV1Z5Y3k1d2RYTm9LSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnNaVzFsYm5RNklHVXVkR0Z5WjJWMExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdsdFpYSTZJSE5sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnZaMmRzWlZKbFlXUjVLR1V1ZEdGeVoyVjBMQ0IwY25WbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWSWFXZG9iR2xuYUhRb1pTNTBZWEpuWlhRc0lHWmhiSE5sS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBzSURVd01DbGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hsZG5RZ1BUMGdKMjF2ZFhObGIzVjBKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElIUnBiV1Z5Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFJwYldWeWMxdHBYUzVsYkdWdFpXNTBJRDA5SUdVdWRHRnlaMlYwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyeGxZWEpVYVcxbGIzVjBLSFJwYldWeWMxdHBYUzUwYVcxbGNpazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2x0WlhKekxuTndiR2xqWlNocExDQXhLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWSWFXZG9iR2xuYUhRb1pTNTBZWEpuWlhRc0lHWmhiSE5sS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHOW5aMnhsVW1WaFpIa29aUzUwWVhKblpYUXNJR1poYkhObEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFowSUQwOUlDZGphR0Z1WjJVbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0Z5WjNNdWRtRnNkV1VnUFNCbExuUmhjbWRsZEM1MllXeDFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbFoybHpkR1Z5UlhabGJuUW9aWFowTENCaGNtZHpMQ0JwWkhncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdTRUZEU3lCbWIzSWdkR1Z6ZEdsdVoxeHVJQ0FnSUNBZ0lDQWdJQ0FnS0hWMGJXVXVaWFpsYm5STWFYTjBaVzVsY25NZ1BTQjFkRzFsTG1WMlpXNTBUR2x6ZEdWdVpYSnpJSHg4SUh0OUtWdGxkblJkSUQwZ2FHRnVaR3hsY2p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQm9ZVzVrYkdWeU8xeHVJQ0FnSUNBZ0lDQjlLU2hsZG1WdWRITmJhVjBwTENCMGNuVmxLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQjJZWElnWDNSdlgyRnpZMmxwSUQwZ2UxeHVJQ0FnSUNBZ0lDQW5NVGc0SnpvZ0p6UTBKeXhjYmlBZ0lDQWdJQ0FnSnpFd09TYzZJQ2MwTlNjc1hHNGdJQ0FnSUNBZ0lDY3hPVEFuT2lBbk5EWW5MRnh1SUNBZ0lDQWdJQ0FuTVRreEp6b2dKelEzSnl4Y2JpQWdJQ0FnSUNBZ0p6RTVNaWM2SUNjNU5pY3NYRzRnSUNBZ0lDQWdJQ2N5TWpBbk9pQW5PVEluTEZ4dUlDQWdJQ0FnSUNBbk1qSXlKem9nSnpNNUp5eGNiaUFnSUNBZ0lDQWdKekl5TVNjNklDYzVNeWNzWEc0Z0lDQWdJQ0FnSUNjeU1Ua25PaUFuT1RFbkxGeHVJQ0FnSUNBZ0lDQW5NVGN6SnpvZ0p6UTFKeXhjYmlBZ0lDQWdJQ0FnSnpFNE55YzZJQ2MyTVNjc0lDOHZTVVVnUzJWNUlHTnZaR1Z6WEc0Z0lDQWdJQ0FnSUNjeE9EWW5PaUFuTlRrbkxDQXZMMGxGSUV0bGVTQmpiMlJsYzF4dUlDQWdJQ0FnSUNBbk1UZzVKem9nSnpRMUp5QXZMMGxGSUV0bGVTQmpiMlJsYzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0IyWVhJZ2MyaHBablJWY0hNZ1BTQjdYRzRnSUNBZ0lDQWdJRndpT1RaY0lqb2dYQ0orWENJc1hHNGdJQ0FnSUNBZ0lGd2lORGxjSWpvZ1hDSWhYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UQmNJam9nWENKQVhDSXNYRzRnSUNBZ0lDQWdJRndpTlRGY0lqb2dYQ0lqWENJc1hHNGdJQ0FnSUNBZ0lGd2lOVEpjSWpvZ1hDSWtYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UTmNJam9nWENJbFhDSXNYRzRnSUNBZ0lDQWdJRndpTlRSY0lqb2dYQ0plWENJc1hHNGdJQ0FnSUNBZ0lGd2lOVFZjSWpvZ1hDSW1YQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UWmNJam9nWENJcVhDSXNYRzRnSUNBZ0lDQWdJRndpTlRkY0lqb2dYQ0lvWENJc1hHNGdJQ0FnSUNBZ0lGd2lORGhjSWpvZ1hDSXBYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5EVmNJam9nWENKZlhDSXNYRzRnSUNBZ0lDQWdJRndpTmpGY0lqb2dYQ0lyWENJc1hHNGdJQ0FnSUNBZ0lGd2lPVEZjSWpvZ1hDSjdYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU9UTmNJam9nWENKOVhDSXNYRzRnSUNBZ0lDQWdJRndpT1RKY0lqb2dYQ0o4WENJc1hHNGdJQ0FnSUNBZ0lGd2lOVGxjSWpvZ1hDSTZYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU16bGNJam9nWENKY1hGd2lYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5EUmNJam9nWENJOFhDSXNYRzRnSUNBZ0lDQWdJRndpTkRaY0lqb2dYQ0krWENJc1hHNGdJQ0FnSUNBZ0lGd2lORGRjSWpvZ1hDSS9YQ0pjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdablZ1WTNScGIyNGdhMlY1VUhKbGMzTklZVzVrYkdWeUlDaGxLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaGxMbWx6VkhKcFoyZGxjaWxjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JseHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUNZbUlHVXVkR0Z5WjJWMExtaGhjMEYwZEhKcFluVjBaU0FtSmlBaFpTNTBZWEpuWlhRdWFHRnpRWFIwY21saWRYUmxLQ2RrWVhSaExXbG5ibTl5WlNjcElDWW1JQ1FvWlM1MFlYSm5aWFFwTG5CaGNtVnVkSE1vWENKYlpHRjBZUzFwWjI1dmNtVmRYQ0lwTG14bGJtZDBhQ0E5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdZeUE5SUdVdWQyaHBZMmc3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUZSUFJFODZJRVJ2WlhOdUozUWdkMjl5YXlCM2FYUm9JR05oY0hNZ2JHOWphMXh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OXViM0p0WVd4cGVtVWdhMlY1UTI5a1pWeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tGOTBiMTloYzJOcGFTNW9ZWE5QZDI1UWNtOXdaWEowZVNoaktTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR01nUFNCZmRHOWZZWE5qYVdsYlkxMDdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDZ2haUzV6YUdsbWRFdGxlU0FtSmlBb1l5QStQU0EyTlNBbUppQmpJRHc5SURrd0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR01nUFNCVGRISnBibWN1Wm5KdmJVTm9ZWEpEYjJSbEtHTWdLeUF6TWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dVdWMyaHBablJMWlhrZ0ppWWdjMmhwWm5SVmNITXVhR0Z6VDNkdVVISnZjR1Z5ZEhrb1l5a3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2TDJkbGRDQnphR2xtZEdWa0lHdGxlVU52WkdVZ2RtRnNkV1ZjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqSUQwZ2MyaHBablJWY0hOYlkxMDdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdNZ1BTQlRkSEpwYm1jdVpuSnZiVU5vWVhKRGIyUmxLR01wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbFoybHpkR1Z5UlhabGJuUW9KMnRsZVhCeVpYTnpKeXdnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd4dlkyRjBiM0k2SUhWMGJXVXVZM0psWVhSbFJXeGxiV1Z1ZEV4dlkyRjBiM0lvWlM1MFlYSm5aWFFwTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd0bGVUb2dZeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J3Y21WMlZtRnNkV1U2SUdVdWRHRnlaMlYwTG5aaGJIVmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoYkhWbE9pQmxMblJoY21kbGRDNTJZV3gxWlNBcklHTXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhMlY1UTI5a1pUb2daUzVyWlhsRGIyUmxYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lHUnZZM1Z0Wlc1MExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oydGxlWEJ5WlhOekp5d2dhMlY1VUhKbGMzTklZVzVrYkdWeUxDQjBjblZsS1R0Y2JseHVJQ0FnSUM4dklFaEJRMHNnWm05eUlIUmxjM1JwYm1kY2JpQWdJQ0FvZFhSdFpTNWxkbVZ1ZEV4cGMzUmxibVZ5Y3lBOUlIVjBiV1V1WlhabGJuUk1hWE4wWlc1bGNuTWdmSHdnZTMwcFd5ZHJaWGx3Y21WemN5ZGRJRDBnYTJWNVVISmxjM05JWVc1a2JHVnlPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9ibUZ0WlNrZ2UxeHVJQ0FnSUc1aGJXVWdQU0J1WVcxbExuSmxjR3hoWTJVb0wxdGNYRnRkTHl3Z1hDSmNYRnhjVzF3aUtTNXlaWEJzWVdObEtDOWJYRnhkWFM4c0lGd2lYRnhjWEYxY0lpazdYRzRnSUNBZ2RtRnlJSEpsWjJWNElEMGdibVYzSUZKbFowVjRjQ2hjSWx0Y1hGeGNQeVpkWENJZ0t5QnVZVzFsSUNzZ1hDSTlLRnRlSmlOZEtpbGNJaWtzWEc0Z0lDQWdJQ0FnSUhKbGMzVnNkSE1nUFNCeVpXZGxlQzVsZUdWaktHeHZZMkYwYVc5dUxuTmxZWEpqYUNrN1hHNGdJQ0FnY21WMGRYSnVJSEpsYzNWc2RITWdQVDA5SUc1MWJHd2dQeUJjSWx3aUlEb2daR1ZqYjJSbFZWSkpRMjl0Y0c5dVpXNTBLSEpsYzNWc2RITmJNVjB1Y21Wd2JHRmpaU2d2WEZ3ckwyY3NJRndpSUZ3aUtTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHSnZiM1J6ZEhKaGNGVjBiV1VvS1NCN1hHNGdJR2xtSUNoa2IyTjFiV1Z1ZEM1eVpXRmtlVk4wWVhSbElEMDlJRndpWTI5dGNHeGxkR1ZjSWlrZ2UxeHVJQ0FnSUhWMGJXVXVhVzVwZENncExuUm9aVzRvWm5WdVkzUnBiMjRnS0NrZ2UxeHVYRzRnSUNBZ0lDQWdJR2x1YVhSRmRtVnVkRWhoYm1Sc1pYSnpLQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWFYTlNaV052Y21ScGJtY29LU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eVpXZHBjM1JsY2tWMlpXNTBLRndpYkc5aFpGd2lMQ0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhKc09pQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhCeWIzUnZZMjlzT2lCM2FXNWtiM2N1Ykc5allYUnBiMjR1Y0hKdmRHOWpiMndzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHaHZjM1E2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTVvYjNOMExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WldGeVkyZzZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNXpaV0Z5WTJnc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2hoYzJnNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b1lYTm9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlLVHRjYmlBZ2ZWeHVmVnh1WEc1aWIyOTBjM1J5WVhCVmRHMWxLQ2s3WEc1a2IyTjFiV1Z1ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkeVpXRmtlWE4wWVhSbFkyaGhibWRsSnl3Z1ltOXZkSE4wY21Gd1ZYUnRaU2s3WEc1Y2JuZHBibVJ2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkMWJteHZZV1FuTENCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ2RYUnRaUzUxYm14dllXUW9LVHRjYm4wc0lIUnlkV1VwTzF4dVhHNTNhVzVrYjNjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblpYSnliM0luTENCbWRXNWpkR2x2YmlBb1pYSnlLU0I3WEc0Z0lDQWdkWFJ0WlM1eVpYQnZjblJNYjJjb1hDSlRZM0pwY0hRZ1JYSnliM0k2SUZ3aUlDc2daWEp5TG0xbGMzTmhaMlVnS3lCY0lqcGNJaUFySUdWeWNpNTFjbXdnS3lCY0lpeGNJaUFySUdWeWNpNXNhVzVsSUNzZ1hDSTZYQ0lnS3lCbGNuSXVZMjlzS1R0Y2JuMHBPMXh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUhWMGJXVTdYRzRpWFgwPSJdfQ==
