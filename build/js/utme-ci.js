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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9maWxlc2F2ZXIuanMvRmlsZVNhdmVyLmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvaG9tZS9kYXZpZHRpdHRzd29ydGgvcHJvamVjdHMvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFBQSxBQUFJLEVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUM3QixBQUFJLEVBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxPQUFN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QUFJLENBQUEsR0FBRSxJQUFJLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsS0FBSyxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLElBQUksQ0FBQyxDQUFDO0FBQ25HLENBQUMsQ0FBQztBQUVGLEtBQUssUUFBUSxFQUFJLEtBQUcsQ0FBQztBQUV3OCtFIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4xXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRfaXNBcnJheTtcblxuICAgIGlmICghQXJyYXkuaXNBcnJheSkge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRpc0FycmF5ID0gJCR1dGlscyQkX2lzQXJyYXk7XG4gICAgdmFyICQkdXRpbHMkJG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG4gICAgZnVuY3Rpb24gJCR1dGlscyQkRigpIHsgfVxuXG4gICAgdmFyICQkdXRpbHMkJG9fY3JlYXRlID0gKE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY29uZCBhcmd1bWVudCBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICAkJHV0aWxzJCRGLnByb3RvdHlwZSA9IG87XG4gICAgICByZXR1cm4gbmV3ICQkdXRpbHMkJEYoKTtcbiAgICB9KTtcblxuICAgIHZhciAkJGFzYXAkJGxlbiA9IDA7XG5cbiAgICB2YXIgJCRhc2FwJCRkZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuXSA9IGNhbGxiYWNrO1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgJCRhc2FwJCRsZW4gKz0gMjtcbiAgICAgIGlmICgkJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gICAgdmFyICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyICQkYXNhcCQkaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygkJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3ICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoJCRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gJCRhc2FwJCRmbHVzaDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dCgkJGFzYXAkJGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSAkJGFzYXAkJHF1ZXVlW2ldO1xuICAgICAgICB2YXIgYXJnID0gJCRhc2FwJCRxdWV1ZVtpKzFdO1xuXG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpKzFdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAkJGFzYXAkJGxlbiA9IDA7XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkc2NoZWR1bGVGbHVzaDtcblxuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkbm9vcCgpIHt9XG4gICAgdmFyICQkJGludGVybmFsJCRQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyICQkJGludGVybmFsJCRGVUxGSUxMRUQgPSAxO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVycm9yID0gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gICAgICBpZiAodGhlbmFibGUuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gJCQkaW50ZXJuYWwkJGdldFRoZW4obWF5YmVUaGVuYWJsZSk7XG5cbiAgICAgICAgaWYgKHRoZW4gPT09ICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSAkJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAvLyBub29wXG4gICAgICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJG1ha2VTZXR0bGVkUmVzdWx0KHN0YXRlLCBwb3NpdGlvbiwgdmFsdWUpIHtcbiAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAnZnVsZmlsbGVkJyxcbiAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdyZWplY3RlZCcsXG4gICAgICAgICAgcmVhc29uOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0LCBhYm9ydE9uUmVqZWN0LCBsYWJlbCkge1xuICAgICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICB0aGlzLl9hYm9ydE9uUmVqZWN0ID0gYWJvcnRPblJlamVjdDtcblxuICAgICAgaWYgKHRoaXMuX3ZhbGlkYXRlSW5wdXQoaW5wdXQpKSB7XG4gICAgICAgIHRoaXMuX2lucHV0ICAgICA9IGlucHV0O1xuICAgICAgICB0aGlzLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgICB0aGlzLl9pbml0KCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgICB0aGlzLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHRoaXMucHJvbWlzZSwgdGhpcy5fdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiAkJHV0aWxzJCRpc0FycmF5KGlucHV0KTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRpb25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgJCQkZW51bWVyYXRvciQkZGVmYXVsdCA9ICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3I7XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGVuZ3RoICA9IHRoaXMubGVuZ3RoO1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG4gICAgICB2YXIgaW5wdXQgICA9IHRoaXMuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICAgIGlmICgkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgZW50cnkuX29uZXJyb3IgPSBudWxsO1xuICAgICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChjLnJlc29sdmUoZW50cnkpLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgZW50cnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcblxuICAgICAgICBpZiAodGhpcy5fYWJvcnRPblJlamVjdCAmJiBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdChzdGF0ZSwgaSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX21ha2VSZXN1bHQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFsbChlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgcmV0dXJuIG5ldyAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0KHRoaXMsIGVudHJpZXMsIHRydWUgLyogYWJvcnQgb24gcmVqZWN0ICovLCBsYWJlbCkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmFjZShlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG5cbiAgICAgIGlmICghJCR1dGlscyQkaXNBcnJheShlbnRyaWVzKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbG1lbnQodmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVzb2x2ZShvYmplY3QsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVqZWN0KHJlYXNvbiwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyID0gMDtcblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0ID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlO1xuXG4gICAgLyoqXG4gICAgICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gICAgICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICAgICAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2XigJlzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICB0aGlzLl9pZCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlcisrO1xuICAgICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgICBpZiAoJCQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gJCRwcm9taXNlJGFsbCQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9ICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZXNvbHZlID0gJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9ICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQ7XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBzdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQgJiYgIW9uUmVqZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJlbnQuX3Jlc3VsdDtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbc3RhdGUgLSAxXTtcbiAgICAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSxcblxuICAgIC8qKlxuICAgICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmNocm9ub3VzXG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQXV0aG9yKCk7XG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfVxuXG4gICAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgY2F0Y2hcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQpIHtcbiAgICAgICAgbG9jYWwgPSB3aW5kb3c7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHZhciBlczZQcm9taXNlU3VwcG9ydCA9XG4gICAgICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgICAgIC8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgbWlzc2luZyBmcm9tXG4gICAgICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJlamVjdFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgLy8gT2xkZXIgdmVyc2lvbiBvZiB0aGUgc3BlYyBoYWQgYSByZXNvbHZlciBvYmplY3RcbiAgICAgICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZTtcbiAgICAgICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgICAgICByZXR1cm4gJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgICAgICBsb2NhbC5Qcm9taXNlID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0O1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlID0ge1xuICAgICAgJ1Byb21pc2UnOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzWydFUzZQcm9taXNlJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxufSkuY2FsbCh0aGlzKTsiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMjAxNC0xMi0xN1xuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IFgxMS9NSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBc1xuICAvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG4gIHx8ICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYi5iaW5kKG5hdmlnYXRvcikpXG4gIC8vIEV2ZXJ5b25lIGVsc2VcbiAgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG5cdCAgICAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBkb2MuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcblx0XHRcdGV2ZW50LmluaXRNb3VzZUV2ZW50KFxuXHRcdFx0XHRcImNsaWNrXCIsIHRydWUsIGZhbHNlLCB2aWV3LCAwLCAwLCAwLCAwLCAwXG5cdFx0XHRcdCwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIG51bGxcblx0XHRcdCk7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIHdlYmtpdF9yZXFfZnMgPSB2aWV3LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtXG5cdFx0LCByZXFfZnMgPSB2aWV3LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdlYmtpdF9yZXFfZnMgfHwgdmlldy5tb3pSZXF1ZXN0RmlsZVN5c3RlbVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdCwgZnNfbWluX3NpemUgPSAwXG5cdFx0Ly8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zNzUyOTcjYzcgYW5kXG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2NvbW1pdC80ODU5MzBhI2NvbW1pdGNvbW1lbnQtODc2ODA0N1xuXHRcdC8vIGZvciB0aGUgcmVhc29uaW5nIGJlaGluZCB0aGUgdGltZW91dCBhbmQgcmV2b2NhdGlvbiBmbG93XG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSA1MDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRpZiAodmlldy5jaHJvbWUpIHtcblx0XHRcdFx0cmV2b2tlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUpIHtcblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGJsb2JfY2hhbmdlZCA9IGZhbHNlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIHRhcmdldF92aWV3XG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKGJsb2JfY2hhbmdlZCB8fCAhb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0YXJnZXRfdmlldykge1xuXHRcdFx0XHRcdFx0dGFyZ2V0X3ZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBuZXdfdGFiID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKG5ld190YWIgPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBzYWZhcmkgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0XHRcdFx0Ly9BcHBsZSBkbyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwOi8vYml0Lmx5LzFrWmZmUklcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGFib3J0YWJsZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoZmlsZXNhdmVyLnJlYWR5U3RhdGUgIT09IGZpbGVzYXZlci5ET05FKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGNyZWF0ZV9pZl9ub3RfZm91bmQgPSB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfVxuXHRcdFx0XHQsIHNsaWNlXG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0aWYgKCFuYW1lKSB7XG5cdFx0XHRcdG5hbWUgPSBcImRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gT2JqZWN0IGFuZCB3ZWIgZmlsZXN5c3RlbSBVUkxzIGhhdmUgYSBwcm9ibGVtIHNhdmluZyBpbiBHb29nbGUgQ2hyb21lIHdoZW5cblx0XHRcdC8vIHZpZXdlZCBpbiBhIHRhYiwgc28gSSBmb3JjZSBzYXZlIHdpdGggYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXG5cdFx0XHQvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD05MTE1OFxuXHRcdFx0Ly8gVXBkYXRlOiBHb29nbGUgZXJyYW50bHkgY2xvc2VkIDkxMTU4LCBJIHN1Ym1pdHRlZCBpdCBhZ2Fpbjpcblx0XHRcdC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zODk2NDJcblx0XHRcdGlmICh2aWV3LmNocm9tZSAmJiB0eXBlICYmIHR5cGUgIT09IGZvcmNlX3NhdmVhYmxlX3R5cGUpIHtcblx0XHRcdFx0c2xpY2UgPSBibG9iLnNsaWNlIHx8IGJsb2Iud2Via2l0U2xpY2U7XG5cdFx0XHRcdGJsb2IgPSBzbGljZS5jYWxsKGJsb2IsIDAsIGJsb2Iuc2l6ZSwgZm9yY2Vfc2F2ZWFibGVfdHlwZSk7XG5cdFx0XHRcdGJsb2JfY2hhbmdlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHQvLyBTaW5jZSBJIGNhbid0IGJlIHN1cmUgdGhhdCB0aGUgZ3Vlc3NlZCBtZWRpYSB0eXBlIHdpbGwgdHJpZ2dlciBhIGRvd25sb2FkXG5cdFx0XHQvLyBpbiBXZWJLaXQsIEkgYXBwZW5kIC5kb3dubG9hZCB0byB0aGUgZmlsZW5hbWUuXG5cdFx0XHQvLyBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjU0NDBcblx0XHRcdGlmICh3ZWJraXRfcmVxX2ZzICYmIG5hbWUgIT09IFwiZG93bmxvYWRcIikge1xuXHRcdFx0XHRuYW1lICs9IFwiLmRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZSB8fCB3ZWJraXRfcmVxX2ZzKSB7XG5cdFx0XHRcdHRhcmdldF92aWV3ID0gdmlldztcblx0XHRcdH1cblx0XHRcdGlmICghcmVxX2ZzKSB7XG5cdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGZzX21pbl9zaXplICs9IGJsb2Iuc2l6ZTtcblx0XHRcdHJlcV9mcyh2aWV3LlRFTVBPUkFSWSwgZnNfbWluX3NpemUsIGFib3J0YWJsZShmdW5jdGlvbihmcykge1xuXHRcdFx0XHRmcy5yb290LmdldERpcmVjdG9yeShcInNhdmVkXCIsIGNyZWF0ZV9pZl9ub3RfZm91bmQsIGFib3J0YWJsZShmdW5jdGlvbihkaXIpIHtcblx0XHRcdFx0XHR2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZGlyLmdldEZpbGUobmFtZSwgY3JlYXRlX2lmX25vdF9mb3VuZCwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0ZmlsZS5jcmVhdGVXcml0ZXIoYWJvcnRhYmxlKGZ1bmN0aW9uKHdyaXRlcikge1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldF92aWV3LmxvY2F0aW9uLmhyZWYgPSBmaWxlLnRvVVJMKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlZW5kXCIsIGV2ZW50KTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldm9rZShmaWxlKTtcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgZXJyb3IgPSB3cml0ZXIuZXJyb3I7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZXJyb3IuY29kZSAhPT0gZXJyb3IuQUJPUlRfRVJSKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgYWJvcnRcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyW1wib25cIiArIGV2ZW50XSA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF07XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLndyaXRlKGJsb2IpO1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyLmFib3J0KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuV1JJVElORztcblx0XHRcdFx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdFx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRkaXIuZ2V0RmlsZShuYW1lLCB7Y3JlYXRlOiBmYWxzZX0sIGFib3J0YWJsZShmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRcdFx0XHQvLyBkZWxldGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0c1xuXHRcdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdHNhdmUoKTtcblx0XHRcdFx0XHR9KSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXguY29kZSA9PT0gZXguTk9UX0ZPVU5EX0VSUikge1xuXHRcdFx0XHRcdFx0XHRzYXZlKCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmc19lcnJvcigpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lKTtcblx0XHR9XG5cdDtcblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgZmlsZXNhdmVyID0gdGhpcztcblx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJhYm9ydFwiKTtcblx0fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPSBudWxsKSkge1xuICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZScpO1xudmFyIHNhdmVBcyA9IHJlcXVpcmUoJ2ZpbGVzYXZlci5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgIHZhciBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KHNjZW5hcmlvLCBudWxsLCBcIiBcIildLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pO1xuICAgc2F2ZUFzKGJsb2IsIHNjZW5hcmlvLm5hbWUgKyBcIi5qc29uXCIpO1xufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lJc0luTnZkWEpqWlhNaU9sc2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFTeEpRVUZKTEVsQlFVa3NSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UVVGRE9VSXNTVUZCU1N4TlFVRk5MRWRCUVVjc1QwRkJUeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZET3p0QlFVVnlReXhOUVVGTkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eFZRVUZWTEZGQlFWRXNSVUZCUlR0SFFVTXpSQ3hKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zU1VGQlNTeEZRVUZGTERCQ1FVRXdRaXhEUVVGRExFTkJRVU1zUTBGQlF6dEhRVU12Uml4TlFVRk5MRU5CUVVNc1NVRkJTU3hGUVVGRkxGRkJRVkVzUTBGQlF5eEpRVUZKTEVkQlFVY3NUMEZCVHl4RFFVRkRMRU5CUVVNN1EwRkRlRU1zUTBGQlF5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCMWRHMWxJRDBnY21WeGRXbHlaU2duTGk0dmRYUnRaU2NwTzF4dWRtRnlJSE5oZG1WQmN5QTlJSEpsY1hWcGNtVW9KMlpwYkdWellYWmxjaTVxY3ljcE8xeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSFYwYldVdWNtVm5hWE4wWlhKVFlYWmxTR0Z1Wkd4bGNpaG1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lIWmhjaUJpYkc5aUlEMGdibVYzSUVKc2IySW9XMHBUVDA0dWMzUnlhVzVuYVdaNUtITmpaVzVoY21sdkxDQnVkV3hzTENCY0lpQmNJaWxkTENCN2RIbHdaVG9nWENKMFpYaDBMM0JzWVdsdU8yTm9ZWEp6WlhROWRYUm1MVGhjSW4wcE8xeHVJQ0FnYzJGMlpVRnpLR0pzYjJJc0lITmpaVzVoY21sdkxtNWhiV1VnS3lCY0lpNXFjMjl1WENJcE8xeHVmU2s3SWwxOSIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZS5qcycpO1xuXG5mdW5jdGlvbiBnZXRCYXNlVVJMICgpIHtcbiAgcmV0dXJuIHV0bWUuc3RhdGUgJiYgdXRtZS5zdGF0ZS50ZXN0U2VydmVyID8gdXRtZS5zdGF0ZS50ZXN0U2VydmVyIDogZ2V0UGFyYW1ldGVyQnlOYW1lKFwidXRtZV90ZXN0X3NlcnZlclwiKSB8fCBcImh0dHA6Ly8wLjAuMC4wOjkwNDMvXCI7XG59XG5cbnZhciBzZXJ2ZXJSZXBvcnRlciA9IHtcbiAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJlcnJvclwiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogZXJyb3IgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh1dG1lLnNldHRpbmdzLmdldChcImNvbnNvbGVMb2dnaW5nXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChzdWNjZXNzLCBzY2VuYXJpbywgdXRtZSkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJzdWNjZXNzXCIsXG4gICAgICAgICAgZGF0YTogeyBkYXRhOiBzdWNjZXNzIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodXRtZS5zZXR0aW5ncy5nZXQoXCJjb25zb2xlTG9nZ2luZ1wiKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKHN1Y2Nlc3MpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBsb2c6IGZ1bmN0aW9uIChsb2csIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiAgZ2V0QmFzZVVSTCgpICsgXCJsb2dcIixcbiAgICAgICAgICBkYXRhOiB7IGRhdGE6IGxvZyB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHV0bWUuc2V0dGluZ3MuZ2V0KFwiY29uc29sZUxvZ2dpbmdcIikpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhsb2cpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxvYWRTY2VuYXJpbzogZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICBqc29ucDogXCJjYWxsYmFja1wiLFxuXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG5cbiAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxuXG4gICAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcInNjZW5hcmlvL1wiICsgbmFtZSxcblxuICAgICAgICAgICAgLy8gdGVsbCBqUXVlcnkgd2UncmUgZXhwZWN0aW5nIEpTT05QXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29ucFwiLFxuXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgc2F2ZVNjZW5hcmlvOiBmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6IGdldEJhc2VVUkwoKSArIFwic2NlbmFyaW9cIixcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShzY2VuYXJpbywgbnVsbCwgXCIgXCIpLFxuICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBsb2FkU2V0dGluZ3M6IGZ1bmN0aW9uIChjYWxsYmFjaywgZXJyb3IpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJcIixcbiAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxuICAgICAgICAgICAgdXJsOiAgZ2V0QmFzZVVSTCgpICsgXCJzZXR0aW5nc1wiLFxuICAgICAgICAgICAgLy8gdGVsbCBqUXVlcnkgd2UncmUgZXhwZWN0aW5nIEpTT05QXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG51dG1lLnJlZ2lzdGVyUmVwb3J0SGFuZGxlcihzZXJ2ZXJSZXBvcnRlcik7XG51dG1lLnJlZ2lzdGVyTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNjZW5hcmlvKTtcbnV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5zYXZlU2NlbmFyaW8pO1xudXRtZS5yZWdpc3RlclNldHRpbmdzTG9hZEhhbmRsZXIoc2VydmVyUmVwb3J0ZXIubG9hZFNldHRpbmdzKTtcblxuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyQnlOYW1lKG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpO1xuICAgIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufVxuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzSmxjRzl5ZEdWeWN5OXpaWEoyWlhJdGNtVndiM0owWlhJdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5b2IyMWxMMlJoZG1sa2RHbDBkSE4zYjNKMGFDOXdjbTlxWldOMGN5OTFkRzFsTDNOeVl5OXFjeTl5WlhCdmNuUmxjbk12YzJWeWRtVnlMWEpsY0c5eWRHVnlMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzU1VGQlNTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenM3UVVGRmFrTXNVMEZCVXl4VlFVRlZMRWxCUVVrN1JVRkRja0lzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVlVGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVsQlFVa3NjMEpCUVhOQ0xFTkJRVU03UVVGRGVFa3NRMEZCUXpzN1FVRkZSQ3hKUVVGSkxHTkJRV01zUjBGQlJ6dEpRVU5xUWl4TFFVRkxMRVZCUVVVc1ZVRkJWU3hMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlR0UlFVTndReXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETzFWQlEwd3NTVUZCU1N4RlFVRkZMRTFCUVUwN1ZVRkRXaXhIUVVGSExFVkJRVVVzVlVGQlZTeEZRVUZGTEVkQlFVY3NUMEZCVHp0VlFVTXpRaXhKUVVGSkxFVkJRVVVzUlVGQlJTeEpRVUZKTEVWQlFVVXNTMEZCU3l4RlFVRkZPMVZCUTNKQ0xGRkJRVkVzUlVGQlJTeE5RVUZOTzFOQlEycENMRU5CUVVNc1EwRkJRenRSUVVOSUxFbEJRVWtzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNSVUZCUlR0VlFVTjJReXhQUVVGUExFTkJRVU1zUzBGQlN5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMU5CUTNSQ08wdEJRMG83U1VGRFJDeFBRVUZQTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJUdFJRVU40UXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRE8xVkJRMHdzU1VGQlNTeEZRVUZGTEUxQlFVMDdWVUZEV2l4SFFVRkhMRVZCUVVVc1ZVRkJWU3hGUVVGRkxFZEJRVWNzVTBGQlV6dFZRVU0zUWl4SlFVRkpMRVZCUVVVc1JVRkJSU3hKUVVGSkxFVkJRVVVzVDBGQlR5eEZRVUZGTzFWQlEzWkNMRkZCUVZFc1JVRkJSU3hOUVVGTk8xTkJRMnBDTEVOQlFVTXNRMEZCUXp0UlFVTklMRWxCUVVrc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zUlVGQlJUdFZRVU4yUXl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzFOQlEzUkNPMHRCUTBvN1NVRkRSQ3hIUVVGSExFVkJRVVVzVlVGQlZTeEhRVUZITEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSVHRSUVVOb1F5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRPMVZCUTB3c1NVRkJTU3hGUVVGRkxFMUJRVTA3VlVGRFdpeEhRVUZITEVkQlFVY3NWVUZCVlN4RlFVRkZMRWRCUVVjc1MwRkJTenRWUVVNeFFpeEpRVUZKTEVWQlFVVXNSVUZCUlN4SlFVRkpMRVZCUVVVc1IwRkJSeXhGUVVGRk8xVkJRMjVDTEZGQlFWRXNSVUZCUlN4TlFVRk5PMU5CUTJwQ0xFTkJRVU1zUTBGQlF6dFJRVU5JTEVsQlFVa3NTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1JVRkJSVHRWUVVOMlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8xTkJRMnhDTzBGQlExUXNTMEZCU3pzN1NVRkZSQ3haUVVGWkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVXNVVUZCVVN4RlFVRkZPMUZCUTNCRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTTdRVUZEWml4WlFVRlpMRXRCUVVzc1JVRkJSU3hWUVVGVk96dEJRVVUzUWl4WlFVRlpMRmRCUVZjc1JVRkJSU3hwUTBGQmFVTTdPMEZCUlRGRUxGbEJRVmtzVjBGQlZ5eEZRVUZGTEVsQlFVazdPMEZCUlRkQ0xGbEJRVmtzUjBGQlJ5eEhRVUZITEZWQlFWVXNSVUZCUlN4SFFVRkhMRmRCUVZjc1IwRkJSeXhKUVVGSk8wRkJRMjVFT3p0QlFVVkJMRmxCUVZrc1VVRkJVU3hGUVVGRkxFOUJRVTg3TzFsQlJXcENMRTlCUVU4c1JVRkJSU3hWUVVGVkxFbEJRVWtzUlVGQlJUdG5Ra0ZEY2tJc1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzJGQlEyeENPMU5CUTBvc1EwRkJReXhEUVVGRE8wRkJRMWdzUzBGQlN6czdTVUZGUkN4WlFVRlpMRVZCUVVVc1ZVRkJWU3hSUVVGUkxFVkJRVVU3VVVGRE9VSXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRWUVVOTUxFbEJRVWtzUlVGQlJTeE5RVUZOTzFWQlExb3NSMEZCUnl4RlFVRkZMRlZCUVZVc1JVRkJSU3hIUVVGSExGVkJRVlU3VlVGRE9VSXNTVUZCU1N4RlFVRkZMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNN1ZVRkRla01zVVVGQlVTeEZRVUZGTEUxQlFVMDdWVUZEYUVJc1YwRkJWeXhGUVVGRkxHdENRVUZyUWp0VFFVTm9ReXhEUVVGRExFTkJRVU03UVVGRFdDeExRVUZMT3p0SlFVVkVMRmxCUVZrc1JVRkJSU3hWUVVGVkxGRkJRVkVzUlVGQlJTeExRVUZMTEVWQlFVVTdVVUZEY2tNc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF6dFpRVU5JTEVsQlFVa3NSVUZCUlN4TFFVRkxPMWxCUTFnc1YwRkJWeXhGUVVGRkxFVkJRVVU3V1VGRFppeFhRVUZYTEVWQlFVVXNTVUZCU1R0QlFVTTNRaXhaUVVGWkxFZEJRVWNzUjBGQlJ5eFZRVUZWTEVWQlFVVXNSMEZCUnl4VlFVRlZPenRCUVVVelF5eFpRVUZaTEZGQlFWRXNSVUZCUlN4TlFVRk5PenRaUVVWb1FpeFBRVUZQTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1owSkJRM0pDTEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOc1FqdFpRVU5FTEV0QlFVc3NSVUZCUlN4VlFVRlZMRWRCUVVjc1JVRkJSVHRuUWtGRGJFSXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8yRkJRMlE3VTBGRFNpeERRVUZETEVOQlFVTTdTMEZEVGp0QlFVTk1MRU5CUVVNc1EwRkJRenM3UVVGRlJpeEpRVUZKTEVOQlFVTXNjVUpCUVhGQ0xFTkJRVU1zWTBGQll5eERRVUZETEVOQlFVTTdRVUZETTBNc1NVRkJTU3hEUVVGRExHMUNRVUZ0UWl4RFFVRkRMR05CUVdNc1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6dEJRVU4wUkN4SlFVRkpMRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNZMEZCWXl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8wRkJRM1JFTEVsQlFVa3NRMEZCUXl3eVFrRkJNa0lzUTBGQlF5eGpRVUZqTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNN08wRkJSVGxFTEZOQlFWTXNhMEpCUVd0Q0xFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlF6bENMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU1zVFVGQlRTeEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRPMGxCUXpGRUxFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NUVUZCVFN4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxFZEJRVWNzVjBGQlZ5eERRVUZETzFGQlEycEVMRTlCUVU4c1IwRkJSeXhMUVVGTExFTkJRVU1zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRKUVVNeFF5eFBRVUZQTEU5QlFVOHNTMEZCU3l4SlFVRkpMRWRCUVVjc1JVRkJSU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU03UTBGRGNrWWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUoyWVhJZ2RYUnRaU0E5SUhKbGNYVnBjbVVvSnk0dUwzVjBiV1V1YW5NbktUdGNibHh1Wm5WdVkzUnBiMjRnWjJWMFFtRnpaVlZTVENBb0tTQjdYRzRnSUhKbGRIVnliaUIxZEcxbExuTjBZWFJsSUNZbUlIVjBiV1V1YzNSaGRHVXVkR1Z6ZEZObGNuWmxjaUEvSUhWMGJXVXVjM1JoZEdVdWRHVnpkRk5sY25abGNpQTZJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2hjSW5WMGJXVmZkR1Z6ZEY5elpYSjJaWEpjSWlrZ2ZId2dYQ0pvZEhSd09pOHZNQzR3TGpBdU1EbzVNRFF6TDF3aU8xeHVmVnh1WEc1MllYSWdjMlZ5ZG1WeVVtVndiM0owWlhJZ1BTQjdYRzRnSUNBZ1pYSnliM0k2SUdaMWJtTjBhVzl1SUNobGNuSnZjaXdnYzJObGJtRnlhVzhzSUhWMGJXVXBJSHRjYmlBZ0lDQWdJQ0FnSkM1aGFtRjRLSHRjYmlBZ0lDQWdJQ0FnSUNCMGVYQmxPaUJjSWxCUFUxUmNJaXhjYmlBZ0lDQWdJQ0FnSUNCMWNtdzZJR2RsZEVKaGMyVlZVa3dvS1NBcklGd2laWEp5YjNKY0lpeGNiaUFnSUNBZ0lDQWdJQ0JrWVhSaE9pQjdJR1JoZEdFNklHVnljbTl5SUgwc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJRndpYW5OdmJsd2lYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlM1elpYUjBhVzVuY3k1blpYUW9YQ0pqYjI1emIyeGxURzluWjJsdVoxd2lLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHTnZibk52YkdVdVpYSnliM0lvWlhKeWIzSXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQnpkV05qWlhOek9pQm1kVzVqZEdsdmJpQW9jM1ZqWTJWemN5d2djMk5sYm1GeWFXOHNJSFYwYldVcElIdGNiaUFnSUNBZ0lDQWdKQzVoYW1GNEtIdGNiaUFnSUNBZ0lDQWdJQ0IwZVhCbE9pQmNJbEJQVTFSY0lpeGNiaUFnSUNBZ0lDQWdJQ0IxY213NklHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWMzVmpZMlZ6YzF3aUxGeHVJQ0FnSUNBZ0lDQWdJR1JoZEdFNklIc2daR0YwWVRvZ2MzVmpZMlZ6Y3lCOUxGeHVJQ0FnSUNBZ0lDQWdJR1JoZEdGVWVYQmxPaUJjSW1wemIyNWNJbHh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWMyVjBkR2x1WjNNdVoyVjBLRndpWTI5dWMyOXNaVXh2WjJkcGJtZGNJaWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQmpiMjV6YjJ4bExteHZaeWh6ZFdOalpYTnpLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdiRzluT2lCbWRXNWpkR2x2YmlBb2JHOW5MQ0J6WTJWdVlYSnBieXdnZFhSdFpTa2dlMXh1SUNBZ0lDQWdJQ0FrTG1GcVlYZ29lMXh1SUNBZ0lDQWdJQ0FnSUhSNWNHVTZJRndpVUU5VFZGd2lMRnh1SUNBZ0lDQWdJQ0FnSUhWeWJEb2dJR2RsZEVKaGMyVlZVa3dvS1NBcklGd2liRzluWENJc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVRvZ2V5QmtZWFJoT2lCc2IyY2dmU3hjYmlBZ0lDQWdJQ0FnSUNCa1lYUmhWSGx3WlRvZ1hDSnFjMjl1WENKY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJR2xtSUNoMWRHMWxMbk5sZEhScGJtZHpMbWRsZENoY0ltTnZibk52YkdWTWIyZG5hVzVuWENJcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnWTI5dWMyOXNaUzVzYjJjb2JHOW5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc1Y2JpQWdJQ0JzYjJGa1UyTmxibUZ5YVc4NklHWjFibU4wYVc5dUlDaHVZVzFsTENCallXeHNZbUZqYXlrZ2UxeHVJQ0FnSUNBZ0lDQWtMbUZxWVhnb2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYW5OdmJuQTZJRndpWTJGc2JHSmhZMnRjSWl4Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWRHVnVkRlI1Y0dVNklGd2lZWEJ3YkdsallYUnBiMjR2YW5OdmJqc2dZMmhoY25ObGREMTFkR1l0T0Z3aUxGeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCamNtOXpjMFJ2YldGcGJqb2dkSEoxWlN4Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnZFhKc09pQWdaMlYwUW1GelpWVlNUQ2dwSUNzZ1hDSnpZMlZ1WVhKcGJ5OWNJaUFySUc1aGJXVXNYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJSFJsYkd3Z2FsRjFaWEo1SUhkbEozSmxJR1Y0Y0dWamRHbHVaeUJLVTA5T1VGeHVJQ0FnSUNBZ0lDQWdJQ0FnWkdGMFlWUjVjR1U2SUZ3aWFuTnZibkJjSWl4Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYzNWalkyVnpjem9nWm5WdVkzUnBiMjRnS0hKbGMzQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqWVd4c1ltRmpheWh5WlhOd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lITmhkbVZUWTJWdVlYSnBiem9nWm5WdVkzUnBiMjRnS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lDUXVZV3BoZUNoN1hHNGdJQ0FnSUNBZ0lDQWdkSGx3WlRvZ1hDSlFUMU5VWENJc1hHNGdJQ0FnSUNBZ0lDQWdkWEpzT2lCblpYUkNZWE5sVlZKTUtDa2dLeUJjSW5OalpXNWhjbWx2WENJc1hHNGdJQ0FnSUNBZ0lDQWdaR0YwWVRvZ1NsTlBUaTV6ZEhKcGJtZHBabmtvYzJObGJtRnlhVzhzSUc1MWJHd3NJRndpSUZ3aUtTeGNiaUFnSUNBZ0lDQWdJQ0JrWVhSaFZIbHdaVG9nSjJwemIyNG5MRnh1SUNBZ0lDQWdJQ0FnSUdOdmJuUmxiblJVZVhCbE9pQmNJbUZ3Y0d4cFkyRjBhVzl1TDJwemIyNWNJbHh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYkc5aFpGTmxkSFJwYm1kek9pQm1kVzVqZEdsdmJpQW9ZMkZzYkdKaFkyc3NJR1Z5Y205eUtTQjdYRzRnSUNBZ0lDQWdJQ1F1WVdwaGVDaDdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGVYQmxPaUJjSWtkRlZGd2lMRnh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZEZSNWNHVTZJRndpWENJc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqY205emMwUnZiV0ZwYmpvZ2RISjFaU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lIVnliRG9nSUdkbGRFSmhjMlZWVWt3b0tTQXJJRndpYzJWMGRHbHVaM05jSWl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhSbGJHd2dhbEYxWlhKNUlIZGxKM0psSUdWNGNHVmpkR2x1WnlCS1UwOU9VRnh1SUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVlI1Y0dVNklGd2lhbk52Ymx3aUxGeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCemRXTmpaWE56T2lCbWRXNWpkR2x2YmlBb2NtVnpjQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOaGJHeGlZV05yS0hKbGMzQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTeGNiaUFnSUNBZ0lDQWdJQ0FnSUdWeWNtOXlPaUJtZFc1amRHbHZiaUFvWlhKeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaWEp5YjNJb1pYSnlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1ZlR0Y2JseHVkWFJ0WlM1eVpXZHBjM1JsY2xKbGNHOXlkRWhoYm1Sc1pYSW9jMlZ5ZG1WeVVtVndiM0owWlhJcE8xeHVkWFJ0WlM1eVpXZHBjM1JsY2t4dllXUklZVzVrYkdWeUtITmxjblpsY2xKbGNHOXlkR1Z5TG14dllXUlRZMlZ1WVhKcGJ5azdYRzUxZEcxbExuSmxaMmx6ZEdWeVUyRjJaVWhoYm1Sc1pYSW9jMlZ5ZG1WeVVtVndiM0owWlhJdWMyRjJaVk5qWlc1aGNtbHZLVHRjYm5WMGJXVXVjbVZuYVhOMFpYSlRaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnlLSE5sY25abGNsSmxjRzl5ZEdWeUxteHZZV1JUWlhSMGFXNW5jeWs3WEc1Y2JtWjFibU4wYVc5dUlHZGxkRkJoY21GdFpYUmxja0o1VG1GdFpTaHVZVzFsS1NCN1hHNGdJQ0FnYm1GdFpTQTlJRzVoYldVdWNtVndiR0ZqWlNndlcxeGNXMTB2TENCY0lseGNYRnhiWENJcExuSmxjR3hoWTJVb0wxdGNYRjFkTHl3Z1hDSmNYRnhjWFZ3aUtUdGNiaUFnSUNCMllYSWdjbVZuWlhnZ1BTQnVaWGNnVW1WblJYaHdLRndpVzF4Y1hGdy9KbDFjSWlBcklHNWhiV1VnS3lCY0lqMG9XMTRtSTEwcUtWd2lLU3hjYmlBZ0lDQWdJQ0FnY21WemRXeDBjeUE5SUhKbFoyVjRMbVY0WldNb2JHOWpZWFJwYjI0dWMyVmhjbU5vS1R0Y2JpQWdJQ0J5WlhSMWNtNGdjbVZ6ZFd4MGN5QTlQVDBnYm5Wc2JDQS9JRndpWENJZ09pQmtaV052WkdWVlVrbERiMjF3YjI1bGJuUW9jbVZ6ZFd4MGMxc3hYUzV5WlhCc1lXTmxLQzljWENzdlp5d2dYQ0lnWENJcEtUdGNibjFjYmlKZGZRPT0iLCJcblxuLyoqXG4qIEdlbmVyYXRlIHVuaXF1ZSBDU1Mgc2VsZWN0b3IgZm9yIGdpdmVuIERPTSBlbGVtZW50XG4qXG4qIEBwYXJhbSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7U3RyaW5nfVxuKiBAYXBpIHByaXZhdGVcbiovXG5cbmZ1bmN0aW9uIHVuaXF1ZShlbCwgZG9jKSB7XG4gIGlmICghZWwgfHwgIWVsLnRhZ05hbWUpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFbGVtZW50IGV4cGVjdGVkJyk7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0U2VsZWN0b3JJbmRleChlbGVtZW50LCBzZWxlY3Rvcikge1xuICAgICAgdmFyIGV4aXN0aW5nSW5kZXggPSAwO1xuICAgICAgdmFyIGl0ZW1zID0gIGRvYy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChpdGVtc1tpXSA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgICBleGlzdGluZ0luZGV4ID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXN0aW5nSW5kZXg7XG4gIH1cblxuICB2YXIgZWxTZWxlY3RvciA9IGdldEVsZW1lbnRTZWxlY3RvcihlbCkuc2VsZWN0b3I7XG4gIHZhciBpc1NpbXBsZVNlbGVjdG9yID0gZWxTZWxlY3RvciA9PT0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgYW5jZXN0b3JTZWxlY3RvcjtcblxuICB2YXIgY3VyckVsZW1lbnQgPSBlbDtcbiAgd2hpbGUgKGN1cnJFbGVtZW50LnBhcmVudEVsZW1lbnQgIT0gbnVsbCAmJiAhYW5jZXN0b3JTZWxlY3Rvcikge1xuICAgICAgY3VyckVsZW1lbnQgPSBjdXJyRWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgdmFyIHNlbGVjdG9yID0gZ2V0RWxlbWVudFNlbGVjdG9yKGN1cnJFbGVtZW50KS5zZWxlY3RvcjtcblxuICAgICAgLy8gVHlwaWNhbGx5IGVsZW1lbnRzIHRoYXQgaGF2ZSBhIGNsYXNzIG5hbWUgb3IgdGl0bGUsIHRob3NlIGFyZSBsZXNzIGxpa2VseVxuICAgICAgLy8gdG8gY2hhbmdlLCBhbmQgYWxzbyBiZSB1bmlxdWUuICBTbywgd2UgYXJlIHRyeWluZyB0byBmaW5kIGFuIGFuY2VzdG9yXG4gICAgICAvLyB0byBhbmNob3IgKG9yIHNjb3BlKSB0aGUgc2VhcmNoIGZvciB0aGUgZWxlbWVudCwgYW5kIG1ha2UgaXQgbGVzcyBicml0dGxlLlxuICAgICAgaWYgKHNlbGVjdG9yICE9PSBjdXJyRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICBhbmNlc3RvclNlbGVjdG9yID0gc2VsZWN0b3IgKyAoY3VyckVsZW1lbnQgPT09IGVsLnBhcmVudEVsZW1lbnQgJiYgaXNTaW1wbGVTZWxlY3RvciA/IFwiID4gXCIgOiBcIiBcIikgKyBlbFNlbGVjdG9yO1xuICAgICAgfVxuICB9XG5cbiAgdmFyIGZpbmFsU2VsZWN0b3JzID0gW107XG4gIGlmIChhbmNlc3RvclNlbGVjdG9yKSB7XG4gICAgZmluYWxTZWxlY3RvcnMucHVzaChcbiAgICAgIGFuY2VzdG9yU2VsZWN0b3IgKyBcIjplcShcIiArIF9nZXRTZWxlY3RvckluZGV4KGVsLCBhbmNlc3RvclNlbGVjdG9yKSArIFwiKVwiXG4gICAgKTtcbiAgfVxuXG4gIGZpbmFsU2VsZWN0b3JzLnB1c2goZWxTZWxlY3RvciArIFwiOmVxKFwiICsgX2dldFNlbGVjdG9ySW5kZXgoZWwsIGVsU2VsZWN0b3IpICsgXCIpXCIpO1xuICByZXR1cm4gZmluYWxTZWxlY3RvcnM7XG59O1xuXG4vKipcbiogR2V0IGNsYXNzIG5hbWVzIGZvciBhbiBlbGVtZW50XG4qXG4qIEBwYXJhcm0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge0FycmF5fVxuKi9cblxuZnVuY3Rpb24gZ2V0Q2xhc3NOYW1lcyhlbCkge1xuICB2YXIgY2xhc3NOYW1lID0gZWwuZ2V0QXR0cmlidXRlKCdjbGFzcycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtdmVyaWZ5JywgJycpO1xuICBjbGFzc05hbWUgPSBjbGFzc05hbWUgJiYgY2xhc3NOYW1lLnJlcGxhY2UoJ3V0bWUtcmVhZHknLCAnJyk7XG5cbiAgaWYgKCFjbGFzc05hbWUgfHwgKCFjbGFzc05hbWUudHJpbSgpLmxlbmd0aCkpIHsgcmV0dXJuIFtdOyB9XG5cbiAgLy8gcmVtb3ZlIGR1cGxpY2F0ZSB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG5cbiAgLy8gdHJpbSBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlXG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG5cbiAgLy8gc3BsaXQgaW50byBzZXBhcmF0ZSBjbGFzc25hbWVzXG4gIHJldHVybiBjbGFzc05hbWUudHJpbSgpLnNwbGl0KCcgJyk7XG59XG5cbi8qKlxuKiBDU1Mgc2VsZWN0b3JzIHRvIGdlbmVyYXRlIHVuaXF1ZSBzZWxlY3RvciBmb3IgRE9NIGVsZW1lbnRcbipcbiogQHBhcmFtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtBcnJheX1cbiogQGFwaSBwcnZpYXRlXG4qL1xuXG5mdW5jdGlvbiBnZXRFbGVtZW50U2VsZWN0b3IoZWwsIGlzVW5pcXVlKSB7XG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgbGFiZWwgPSBudWxsO1xuICB2YXIgdGl0bGUgPSBudWxsO1xuICB2YXIgYWx0ICAgPSBudWxsO1xuICB2YXIgbmFtZSAgPSBudWxsO1xuICB2YXIgdmFsdWUgPSBudWxsO1xuICB2YXIgbWUgPSBlbDtcblxuICAvLyBkbyB7XG5cbiAgLy8gSURzIGFyZSB1bmlxdWUgZW5vdWdoXG4gIGlmIChlbC5pZCkge1xuICAgIGxhYmVsID0gJ1tpZD1cXCcnICsgZWwuaWQgKyBcIlxcJ11cIjtcbiAgfSBlbHNlIHtcbiAgICAvLyBPdGhlcndpc2UsIHVzZSB0YWcgbmFtZVxuICAgIGxhYmVsICAgICA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIHZhciBjbGFzc05hbWVzID0gZ2V0Q2xhc3NOYW1lcyhlbCk7XG5cbiAgICAvLyBUYWcgbmFtZXMgY291bGQgdXNlIGNsYXNzZXMgZm9yIHNwZWNpZmljaXR5XG4gICAgaWYgKGNsYXNzTmFtZXMubGVuZ3RoKSB7XG4gICAgICBsYWJlbCArPSAnLicgKyBjbGFzc05hbWVzLmpvaW4oJy4nKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaXRsZXMgJiBBbHQgYXR0cmlidXRlcyBhcmUgdmVyeSB1c2VmdWwgZm9yIHNwZWNpZmljaXR5IGFuZCB0cmFja2luZ1xuICBpZiAodGl0bGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykpIHtcbiAgICBsYWJlbCArPSAnW3RpdGxlPVwiJyArIHRpdGxlICsgJ1wiXSc7XG4gIH0gZWxzZSBpZiAoYWx0ID0gZWwuZ2V0QXR0cmlidXRlKCdhbHQnKSkge1xuICAgIGxhYmVsICs9ICdbYWx0PVwiJyArIGFsdCArICdcIl0nO1xuICB9IGVsc2UgaWYgKG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgIGxhYmVsICs9ICdbbmFtZT1cIicgKyBuYW1lICsgJ1wiXSc7XG4gIH1cblxuICBpZiAodmFsdWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykpIHtcbiAgICBsYWJlbCArPSAnW3ZhbHVlPVwiJyArIHZhbHVlICsgJ1wiXSc7XG4gIH1cblxuICAvLyBpZiAoZWwuaW5uZXJUZXh0Lmxlbmd0aCAhPSAwKSB7XG4gIC8vICAgbGFiZWwgKz0gJzpjb250YWlucygnICsgZWwuaW5uZXJUZXh0ICsgJyknO1xuICAvLyB9XG5cbiAgcGFydHMudW5zaGlmdCh7XG4gICAgZWxlbWVudDogZWwsXG4gICAgc2VsZWN0b3I6IGxhYmVsXG4gIH0pO1xuXG4gIC8vIGlmIChpc1VuaXF1ZShwYXJ0cykpIHtcbiAgLy8gICAgIGJyZWFrO1xuICAvLyB9XG5cbiAgLy8gfSB3aGlsZSAoIWVsLmlkICYmIChlbCA9IGVsLnBhcmVudE5vZGUpICYmIGVsLnRhZ05hbWUpO1xuXG4gIC8vIFNvbWUgc2VsZWN0b3JzIHNob3VsZCBoYXZlIG1hdGNoZWQgYXQgbGVhc3RcbiAgaWYgKCFwYXJ0cy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBpZGVudGlmeSBDU1Mgc2VsZWN0b3InKTtcbiAgfVxuICByZXR1cm4gcGFydHNbMF07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdW5pcXVlO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzTmxiR1ZqZEc5eVJtbHVaR1Z5TG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZjMlZzWldOMGIzSkdhVzVrWlhJdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3TzBGQlJVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVGRlFTeEZRVUZGT3p0QlFVVkdMRk5CUVZNc1RVRkJUU3hEUVVGRExFVkJRVVVzUlVGQlJTeEhRVUZITEVWQlFVVTdSVUZEZGtJc1NVRkJTU3hEUVVGRExFVkJRVVVzU1VGQlNTeERRVUZETEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVN1NVRkRkRUlzVFVGQlRTeEpRVUZKTEZOQlFWTXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZETzBGQlF6VkRMRWRCUVVjN08wVkJSVVFzVTBGQlV5eHBRa0ZCYVVJc1EwRkJReXhQUVVGUExFVkJRVVVzVVVGQlVTeEZRVUZGTzAxQlF6RkRMRWxCUVVrc1lVRkJZU3hIUVVGSExFTkJRVU1zUTBGQlF6dEJRVU0xUWl4TlFVRk5MRWxCUVVrc1MwRkJTeXhKUVVGSkxFZEJRVWNzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6czdUVUZGTlVNc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRXRCUVVzc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdWVUZEYmtNc1NVRkJTU3hMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETEV0QlFVc3NUMEZCVHl4RlFVRkZPMk5CUTNSQ0xHRkJRV0VzUjBGQlJ5eERRVUZETEVOQlFVTTdZMEZEYkVJc1RVRkJUVHRYUVVOVU8wOUJRMG83VFVGRFJDeFBRVUZQTEdGQlFXRXNRMEZCUXp0QlFVTXpRaXhIUVVGSE96dEZRVVZFTEVsQlFVa3NWVUZCVlN4SFFVRkhMR3RDUVVGclFpeERRVUZETEVWQlFVVXNRMEZCUXl4RFFVRkRMRkZCUVZFc1EwRkJRenRGUVVOcVJDeEpRVUZKTEdkQ1FVRm5RaXhIUVVGSExGVkJRVlVzUzBGQlN5eEZRVUZGTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1JVRkJSU3hEUVVGRE8wRkJRMnBGTEVWQlFVVXNTVUZCU1N4blFrRkJaMElzUTBGQlF6czdSVUZGY2tJc1NVRkJTU3hYUVVGWExFZEJRVWNzUlVGQlJTeERRVUZETzBWQlEzSkNMRTlCUVU4c1YwRkJWeXhEUVVGRExHRkJRV0VzU1VGQlNTeEpRVUZKTEVsQlFVa3NRMEZCUXl4blFrRkJaMElzUlVGQlJUdE5RVU16UkN4WFFVRlhMRWRCUVVjc1YwRkJWeXhEUVVGRExHRkJRV0VzUTBGQlF6dEJRVU01UXl4TlFVRk5MRWxCUVVrc1VVRkJVU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRmRCUVZjc1EwRkJReXhEUVVGRExGRkJRVkVzUTBGQlF6dEJRVU01UkR0QlFVTkJPMEZCUTBFN08wMUJSVTBzU1VGQlNTeFJRVUZSTEV0QlFVc3NWMEZCVnl4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzUlVGQlJUdFZRVU5vUkN4blFrRkJaMElzUjBGQlJ5eFJRVUZSTEVsQlFVa3NWMEZCVnl4TFFVRkxMRVZCUVVVc1EwRkJReXhoUVVGaExFbEJRVWtzWjBKQlFXZENMRWRCUVVjc1MwRkJTeXhIUVVGSExFZEJRVWNzUTBGQlF5eEhRVUZITEZWQlFWVXNRMEZCUXp0UFFVTnVTRHRCUVVOUUxFZEJRVWM3TzBWQlJVUXNTVUZCU1N4alFVRmpMRWRCUVVjc1JVRkJSU3hEUVVGRE8wVkJRM2hDTEVsQlFVa3NaMEpCUVdkQ0xFVkJRVVU3U1VGRGNFSXNZMEZCWXl4RFFVRkRMRWxCUVVrN1RVRkRha0lzWjBKQlFXZENMRWRCUVVjc1RVRkJUU3hIUVVGSExHbENRVUZwUWl4RFFVRkRMRVZCUVVVc1JVRkJSU3huUWtGQlowSXNRMEZCUXl4SFFVRkhMRWRCUVVjN1MwRkRNVVVzUTBGQlF6dEJRVU5PTEVkQlFVYzdPMFZCUlVRc1kwRkJZeXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEVkQlFVY3NUVUZCVFN4SFFVRkhMR2xDUVVGcFFpeERRVUZETEVWQlFVVXNSVUZCUlN4VlFVRlZMRU5CUVVNc1IwRkJSeXhIUVVGSExFTkJRVU1zUTBGQlF6dEZRVU51Uml4UFFVRlBMR05CUVdNc1EwRkJRenRCUVVONFFpeERRVUZETEVOQlFVTTdPMEZCUlVZN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGQlJVRXNSVUZCUlRzN1FVRkZSaXhUUVVGVExHRkJRV0VzUTBGQlF5eEZRVUZGTEVWQlFVVTdSVUZEZWtJc1NVRkJTU3hUUVVGVExFZEJRVWNzUlVGQlJTeERRVUZETEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRGUVVONlF5eFRRVUZUTEVkQlFVY3NVMEZCVXl4SlFVRkpMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zWVVGQllTeEZRVUZGTEVWQlFVVXNRMEZCUXl4RFFVRkRPMEZCUTJoRkxFVkJRVVVzVTBGQlV5eEhRVUZITEZOQlFWTXNTVUZCU1N4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGbEJRVmtzUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXpzN1FVRkZMMFFzUlVGQlJTeEpRVUZKTEVOQlFVTXNVMEZCVXl4TFFVRkxMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETEUxQlFVMHNRMEZCUXl4RlFVRkZMRVZCUVVVc1QwRkJUeXhGUVVGRkxFTkJRVU1zUlVGQlJUdEJRVU01UkRzN1FVRkZRU3hGUVVGRkxGTkJRVk1zUjBGQlJ5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRTFCUVUwc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6dEJRVU0zUXpzN1FVRkZRU3hGUVVGRkxGTkJRVk1zUjBGQlJ5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmxCUVZrc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF6dEJRVU5zUkRzN1JVRkZSU3hQUVVGUExGTkJRVk1zUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGNrTXNRMEZCUXpzN1FVRkZSRHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3p0QlFVVkJMRVZCUVVVN08wRkJSVVlzVTBGQlV5eHJRa0ZCYTBJc1EwRkJReXhGUVVGRkxFVkJRVVVzVVVGQlVTeEZRVUZGTzBWQlEzaERMRWxCUVVrc1MwRkJTeXhIUVVGSExFVkJRVVVzUTBGQlF6dEZRVU5tTEVsQlFVa3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJRenRGUVVOcVFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNN1JVRkRha0lzU1VGQlNTeEhRVUZITEV0QlFVc3NTVUZCU1N4RFFVRkRPMFZCUTJwQ0xFbEJRVWtzU1VGQlNTeEpRVUZKTEVsQlFVa3NRMEZCUXp0RlFVTnFRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEYmtJc1JVRkJSU3hKUVVGSkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEVOQlFVTTdRVUZEWkR0QlFVTkJPMEZCUTBFN08wVkJSVVVzU1VGQlNTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMGxCUTFRc1MwRkJTeXhIUVVGSExGRkJRVkVzUjBGQlJ5eEZRVUZGTEVOQlFVTXNSVUZCUlN4SFFVRkhMRXRCUVVzc1EwRkJRenRCUVVOeVF5eEhRVUZITEUxQlFVMDdPMEZCUlZRc1NVRkJTU3hMUVVGTExFOUJRVThzUlVGQlJTeERRVUZETEU5QlFVOHNRMEZCUXl4WFFVRlhMRVZCUVVVc1EwRkJRenM3UVVGRmVrTXNTVUZCU1N4SlFVRkpMRlZCUVZVc1IwRkJSeXhoUVVGaExFTkJRVU1zUlVGQlJTeERRVUZETEVOQlFVTTdRVUZEZGtNN08wbEJSVWtzU1VGQlNTeFZRVUZWTEVOQlFVTXNUVUZCVFN4RlFVRkZPMDFCUTNKQ0xFdEJRVXNzU1VGQlNTeEhRVUZITEVkQlFVY3NWVUZCVlN4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dExRVU55UXp0QlFVTk1MRWRCUVVjN1FVRkRTRHM3UlVGRlJTeEpRVUZKTEV0QlFVc3NSMEZCUnl4RlFVRkZMRU5CUVVNc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eEZRVUZGTzBsQlEzQkRMRXRCUVVzc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0SFFVTndReXhOUVVGTkxFbEJRVWtzUjBGQlJ5eEhRVUZITEVWQlFVVXNRMEZCUXl4WlFVRlpMRU5CUVVNc1MwRkJTeXhEUVVGRExFVkJRVVU3U1VGRGRrTXNTMEZCU3l4SlFVRkpMRkZCUVZFc1IwRkJSeXhIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETzBkQlEyaERMRTFCUVUwc1NVRkJTU3hKUVVGSkxFZEJRVWNzUlVGQlJTeERRVUZETEZsQlFWa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSVHRKUVVONlF5eExRVUZMTEVsQlFVa3NVMEZCVXl4SFFVRkhMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRGNrTXNSMEZCUnpzN1JVRkZSQ3hKUVVGSkxFdEJRVXNzUjBGQlJ5eEZRVUZGTEVOQlFVTXNXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRk8wbEJRM0JETEV0QlFVc3NTVUZCU1N4VlFVRlZMRWRCUVVjc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEJRVU4yUXl4SFFVRkhPMEZCUTBnN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBWQlJVVXNTMEZCU3l4RFFVRkRMRTlCUVU4c1EwRkJRenRKUVVOYUxFOUJRVThzUlVGQlJTeEZRVUZGTzBsQlExZ3NVVUZCVVN4RlFVRkZMRXRCUVVzN1FVRkRia0lzUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEVER0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdSVUZGUlN4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFMUJRVTBzUlVGQlJUdEpRVU5xUWl4TlFVRk5MRWxCUVVrc1MwRkJTeXhEUVVGRExHbERRVUZwUXl4RFFVRkRMRU5CUVVNN1IwRkRjRVE3UlVGRFJDeFBRVUZQTEV0QlFVc3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOc1FpeERRVUZET3p0QlFVVkVMRTFCUVUwc1EwRkJReXhQUVVGUExFZEJRVWNzVFVGQlRTeERRVUZESWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaVhHNWNiaThxS2x4dUtpQkhaVzVsY21GMFpTQjFibWx4ZFdVZ1ExTlRJSE5sYkdWamRHOXlJR1p2Y2lCbmFYWmxiaUJFVDAwZ1pXeGxiV1Z1ZEZ4dUtseHVLaUJBY0dGeVlXMGdlMFZzWlcxbGJuUjlJR1ZzWEc0cUlFQnlaWFIxY200Z2UxTjBjbWx1WjMxY2Jpb2dRR0Z3YVNCd2NtbDJZWFJsWEc0cUwxeHVYRzVtZFc1amRHbHZiaUIxYm1seGRXVW9aV3dzSUdSdll5a2dlMXh1SUNCcFppQW9JV1ZzSUh4OElDRmxiQzUwWVdkT1lXMWxLU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduUld4bGJXVnVkQ0JsZUhCbFkzUmxaQ2NwTzF4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1gyZGxkRk5sYkdWamRHOXlTVzVrWlhnb1pXeGxiV1Z1ZEN3Z2MyVnNaV04wYjNJcElIdGNiaUFnSUNBZ0lIWmhjaUJsZUdsemRHbHVaMGx1WkdWNElEMGdNRHRjYmlBZ0lDQWdJSFpoY2lCcGRHVnRjeUE5SUNCa2IyTXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDaHpaV3hsWTNSdmNpazdYRzVjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYVhSbGJYTXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvYVhSbGJYTmJhVjBnUFQwOUlHVnNaVzFsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1pYaHBjM1JwYm1kSmJtUmxlQ0E5SUdrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhKbGRIVnliaUJsZUdsemRHbHVaMGx1WkdWNE8xeHVJQ0I5WEc1Y2JpQWdkbUZ5SUdWc1UyVnNaV04wYjNJZ1BTQm5aWFJGYkdWdFpXNTBVMlZzWldOMGIzSW9aV3dwTG5ObGJHVmpkRzl5TzF4dUlDQjJZWElnYVhOVGFXMXdiR1ZUWld4bFkzUnZjaUE5SUdWc1UyVnNaV04wYjNJZ1BUMDlJR1ZzTG5SaFowNWhiV1V1ZEc5TWIzZGxja05oYzJVb0tUdGNiaUFnZG1GeUlHRnVZMlZ6ZEc5eVUyVnNaV04wYjNJN1hHNWNiaUFnZG1GeUlHTjFjbkpGYkdWdFpXNTBJRDBnWld3N1hHNGdJSGRvYVd4bElDaGpkWEp5Uld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MElDRTlJRzUxYkd3Z0ppWWdJV0Z1WTJWemRHOXlVMlZzWldOMGIzSXBJSHRjYmlBZ0lDQWdJR04xY25KRmJHVnRaVzUwSUQwZ1kzVnlja1ZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZER0Y2JpQWdJQ0FnSUhaaGNpQnpaV3hsWTNSdmNpQTlJR2RsZEVWc1pXMWxiblJUWld4bFkzUnZjaWhqZFhKeVJXeGxiV1Z1ZENrdWMyVnNaV04wYjNJN1hHNWNiaUFnSUNBZ0lDOHZJRlI1Y0dsallXeHNlU0JsYkdWdFpXNTBjeUIwYUdGMElHaGhkbVVnWVNCamJHRnpjeUJ1WVcxbElHOXlJSFJwZEd4bExDQjBhRzl6WlNCaGNtVWdiR1Z6Y3lCc2FXdGxiSGxjYmlBZ0lDQWdJQzh2SUhSdklHTm9ZVzVuWlN3Z1lXNWtJR0ZzYzI4Z1ltVWdkVzVwY1hWbExpQWdVMjhzSUhkbElHRnlaU0IwY25scGJtY2dkRzhnWm1sdVpDQmhiaUJoYm1ObGMzUnZjbHh1SUNBZ0lDQWdMeThnZEc4Z1lXNWphRzl5SUNodmNpQnpZMjl3WlNrZ2RHaGxJSE5sWVhKamFDQm1iM0lnZEdobElHVnNaVzFsYm5Rc0lHRnVaQ0J0WVd0bElHbDBJR3hsYzNNZ1luSnBkSFJzWlM1Y2JpQWdJQ0FnSUdsbUlDaHpaV3hsWTNSdmNpQWhQVDBnWTNWeWNrVnNaVzFsYm5RdWRHRm5UbUZ0WlM1MGIweHZkMlZ5UTJGelpTZ3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2lBOUlITmxiR1ZqZEc5eUlDc2dLR04xY25KRmJHVnRaVzUwSUQwOVBTQmxiQzV3WVhKbGJuUkZiR1Z0Wlc1MElDWW1JR2x6VTJsdGNHeGxVMlZzWldOMGIzSWdQeUJjSWlBK0lGd2lJRG9nWENJZ1hDSXBJQ3NnWld4VFpXeGxZM1J2Y2p0Y2JpQWdJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lIWmhjaUJtYVc1aGJGTmxiR1ZqZEc5eWN5QTlJRnRkTzF4dUlDQnBaaUFvWVc1alpYTjBiM0pUWld4bFkzUnZjaWtnZTF4dUlDQWdJR1pwYm1Gc1UyVnNaV04wYjNKekxuQjFjMmdvWEc0Z0lDQWdJQ0JoYm1ObGMzUnZjbE5sYkdWamRHOXlJQ3NnWENJNlpYRW9YQ0lnS3lCZloyVjBVMlZzWldOMGIzSkpibVJsZUNobGJDd2dZVzVqWlhOMGIzSlRaV3hsWTNSdmNpa2dLeUJjSWlsY0lseHVJQ0FnSUNrN1hHNGdJSDFjYmx4dUlDQm1hVzVoYkZObGJHVmpkRzl5Y3k1d2RYTm9LR1ZzVTJWc1pXTjBiM0lnS3lCY0lqcGxjU2hjSWlBcklGOW5aWFJUWld4bFkzUnZja2x1WkdWNEtHVnNMQ0JsYkZObGJHVmpkRzl5S1NBcklGd2lLVndpS1R0Y2JpQWdjbVYwZFhKdUlHWnBibUZzVTJWc1pXTjBiM0p6TzF4dWZUdGNibHh1THlvcVhHNHFJRWRsZENCamJHRnpjeUJ1WVcxbGN5Qm1iM0lnWVc0Z1pXeGxiV1Z1ZEZ4dUtseHVLaUJBY0dGeVlYSnRJSHRGYkdWdFpXNTBmU0JsYkZ4dUtpQkFjbVYwZFhKdUlIdEJjbkpoZVgxY2Jpb3ZYRzVjYm1aMWJtTjBhVzl1SUdkbGRFTnNZWE56VG1GdFpYTW9aV3dwSUh0Y2JpQWdkbUZ5SUdOc1lYTnpUbUZ0WlNBOUlHVnNMbWRsZEVGMGRISnBZblYwWlNnblkyeGhjM01uS1R0Y2JpQWdZMnhoYzNOT1lXMWxJRDBnWTJ4aGMzTk9ZVzFsSUNZbUlHTnNZWE56VG1GdFpTNXlaWEJzWVdObEtDZDFkRzFsTFhabGNtbG1lU2NzSUNjbktUdGNiaUFnWTJ4aGMzTk9ZVzFsSUQwZ1kyeGhjM05PWVcxbElDWW1JR05zWVhOelRtRnRaUzV5WlhCc1lXTmxLQ2QxZEcxbExYSmxZV1I1Snl3Z0p5Y3BPMXh1WEc0Z0lHbG1JQ2doWTJ4aGMzTk9ZVzFsSUh4OElDZ2hZMnhoYzNOT1lXMWxMblJ5YVcwb0tTNXNaVzVuZEdncEtTQjdJSEpsZEhWeWJpQmJYVHNnZlZ4dVhHNGdJQzh2SUhKbGJXOTJaU0JrZFhCc2FXTmhkR1VnZDJocGRHVnpjR0ZqWlZ4dUlDQmpiR0Z6YzA1aGJXVWdQU0JqYkdGemMwNWhiV1V1Y21Wd2JHRmpaU2d2WEZ4ekt5OW5MQ0FuSUNjcE8xeHVYRzRnSUM4dklIUnlhVzBnYkdWaFpHbHVaeUJoYm1RZ2RISmhhV3hwYm1jZ2QyaHBkR1Z6Y0dGalpWeHVJQ0JqYkdGemMwNWhiV1VnUFNCamJHRnpjMDVoYldVdWNtVndiR0ZqWlNndlhseGNjeXQ4WEZ4ekt5UXZaeXdnSnljcE8xeHVYRzRnSUM4dklITndiR2wwSUdsdWRHOGdjMlZ3WVhKaGRHVWdZMnhoYzNOdVlXMWxjMXh1SUNCeVpYUjFjbTRnWTJ4aGMzTk9ZVzFsTG5SeWFXMG9LUzV6Y0d4cGRDZ25JQ2NwTzF4dWZWeHVYRzR2S2lwY2Jpb2dRMU5USUhObGJHVmpkRzl5Y3lCMGJ5Qm5aVzVsY21GMFpTQjFibWx4ZFdVZ2MyVnNaV04wYjNJZ1ptOXlJRVJQVFNCbGJHVnRaVzUwWEc0cVhHNHFJRUJ3WVhKaGJTQjdSV3hsYldWdWRIMGdaV3hjYmlvZ1FISmxkSFZ5YmlCN1FYSnlZWGw5WEc0cUlFQmhjR2tnY0hKMmFXRjBaVnh1S2k5Y2JseHVablZ1WTNScGIyNGdaMlYwUld4bGJXVnVkRk5sYkdWamRHOXlLR1ZzTENCcGMxVnVhWEYxWlNrZ2UxeHVJQ0IyWVhJZ2NHRnlkSE1nUFNCYlhUdGNiaUFnZG1GeUlHeGhZbVZzSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJSFJwZEd4bElEMGdiblZzYkR0Y2JpQWdkbUZ5SUdGc2RDQWdJRDBnYm5Wc2JEdGNiaUFnZG1GeUlHNWhiV1VnSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJSFpoYkhWbElEMGdiblZzYkR0Y2JpQWdkbUZ5SUcxbElEMGdaV3c3WEc1Y2JpQWdMeThnWkc4Z2UxeHVYRzRnSUM4dklFbEVjeUJoY21VZ2RXNXBjWFZsSUdWdWIzVm5hRnh1SUNCcFppQW9aV3d1YVdRcElIdGNiaUFnSUNCc1lXSmxiQ0E5SUNkYmFXUTlYRnduSnlBcklHVnNMbWxrSUNzZ1hDSmNYQ2RkWENJN1hHNGdJSDBnWld4elpTQjdYRzRnSUNBZ0x5OGdUM1JvWlhKM2FYTmxMQ0IxYzJVZ2RHRm5JRzVoYldWY2JpQWdJQ0JzWVdKbGJDQWdJQ0FnUFNCbGJDNTBZV2RPWVcxbExuUnZURzkzWlhKRFlYTmxLQ2s3WEc1Y2JpQWdJQ0IyWVhJZ1kyeGhjM05PWVcxbGN5QTlJR2RsZEVOc1lYTnpUbUZ0WlhNb1pXd3BPMXh1WEc0Z0lDQWdMeThnVkdGbklHNWhiV1Z6SUdOdmRXeGtJSFZ6WlNCamJHRnpjMlZ6SUdadmNpQnpjR1ZqYVdacFkybDBlVnh1SUNBZ0lHbG1JQ2hqYkdGemMwNWhiV1Z6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnYkdGaVpXd2dLejBnSnk0bklDc2dZMnhoYzNOT1lXMWxjeTVxYjJsdUtDY3VKeWs3WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnTHk4Z1ZHbDBiR1Z6SUNZZ1FXeDBJR0YwZEhKcFluVjBaWE1nWVhKbElIWmxjbmtnZFhObFpuVnNJR1p2Y2lCemNHVmphV1pwWTJsMGVTQmhibVFnZEhKaFkydHBibWRjYmlBZ2FXWWdLSFJwZEd4bElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZDBhWFJzWlNjcEtTQjdYRzRnSUNBZ2JHRmlaV3dnS3owZ0oxdDBhWFJzWlQxY0lpY2dLeUIwYVhSc1pTQXJJQ2RjSWwwbk8xeHVJQ0I5SUdWc2MyVWdhV1lnS0dGc2RDQTlJR1ZzTG1kbGRFRjBkSEpwWW5WMFpTZ25ZV3gwSnlrcElIdGNiaUFnSUNCc1lXSmxiQ0FyUFNBblcyRnNkRDFjSWljZ0t5QmhiSFFnS3lBblhDSmRKenRjYmlBZ2ZTQmxiSE5sSUdsbUlDaHVZVzFsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkdVlXMWxKeWtwSUh0Y2JpQWdJQ0JzWVdKbGJDQXJQU0FuVzI1aGJXVTlYQ0luSUNzZ2JtRnRaU0FySUNkY0lsMG5PMXh1SUNCOVhHNWNiaUFnYVdZZ0tIWmhiSFZsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkMllXeDFaU2NwS1NCN1hHNGdJQ0FnYkdGaVpXd2dLejBnSjF0MllXeDFaVDFjSWljZ0t5QjJZV3gxWlNBcklDZGNJbDBuTzF4dUlDQjlYRzVjYmlBZ0x5OGdhV1lnS0dWc0xtbHVibVZ5VkdWNGRDNXNaVzVuZEdnZ0lUMGdNQ2tnZTF4dUlDQXZMeUFnSUd4aFltVnNJQ3M5SUNjNlkyOXVkR0ZwYm5Nb0p5QXJJR1ZzTG1sdWJtVnlWR1Y0ZENBcklDY3BKenRjYmlBZ0x5OGdmVnh1WEc0Z0lIQmhjblJ6TG5WdWMyaHBablFvZTF4dUlDQWdJR1ZzWlcxbGJuUTZJR1ZzTEZ4dUlDQWdJSE5sYkdWamRHOXlPaUJzWVdKbGJGeHVJQ0I5S1R0Y2JseHVJQ0F2THlCcFppQW9hWE5WYm1seGRXVW9jR0Z5ZEhNcEtTQjdYRzRnSUM4dklDQWdJQ0JpY21WaGF6dGNiaUFnTHk4Z2ZWeHVYRzRnSUM4dklIMGdkMmhwYkdVZ0tDRmxiQzVwWkNBbUppQW9aV3dnUFNCbGJDNXdZWEpsYm5ST2IyUmxLU0FtSmlCbGJDNTBZV2RPWVcxbEtUdGNibHh1SUNBdkx5QlRiMjFsSUhObGJHVmpkRzl5Y3lCemFHOTFiR1FnYUdGMlpTQnRZWFJqYUdWa0lHRjBJR3hsWVhOMFhHNGdJR2xtSUNnaGNHRnlkSE11YkdWdVozUm9LU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZEdZV2xzWldRZ2RHOGdhV1JsYm5ScFpua2dRMU5USUhObGJHVmpkRzl5SnlrN1hHNGdJSDFjYmlBZ2NtVjBkWEp1SUhCaGNuUnpXekJkTzF4dWZWeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSFZ1YVhGMVpUdGNiaUpkZlE9PSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGxvY2FsX3N0b3JhZ2Vfa2V5ID0gJ3V0bWUtc2V0dGluZ3MnO1xuXG5mdW5jdGlvbiBTZXR0aW5ncyAoZGVmYXVsdFNldHRpbmdzKSB7XG4gICAgdGhpcy5zZXREZWZhdWx0cyhkZWZhdWx0U2V0dGluZ3MgfHwge30pO1xufVxuXG5TZXR0aW5ncy5wcm90b3R5cGUgPSB7XG4gICAgcmVhZFNldHRpbmdzRnJvbUxvY2FsU3RvcmFnZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2V0dGluZ3NTdHJpbmcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShsb2NhbF9zdG9yYWdlX2tleSk7XG4gICAgICAgIHZhciBzZXR0aW5ncyA9IHt9O1xuICAgICAgICBpZiAoc2V0dGluZ3NTdHJpbmcpIHtcbiAgICAgICAgICAgIHNldHRpbmdzID0gSlNPTi5wYXJzZShzZXR0aW5nc1N0cmluZyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH0sXG5cbiAgICBzZXREZWZhdWx0czogZnVuY3Rpb24gKGRlZmF1bHRTZXR0aW5ncykge1xuICAgICAgICB2YXIgbG9jYWxTZXR0aW5ncyA9IHRoaXMucmVhZFNldHRpbmdzRnJvbUxvY2FsU3RvcmFnZSgpO1xuICAgICAgICB2YXIgZGVmYXVsdHNDb3B5ID0gXy5leHRlbmQoe30sIGRlZmF1bHRTZXR0aW5ncyB8fCB7fSk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgXy5leHRlbmQoZGVmYXVsdHNDb3B5LCBsb2NhbFNldHRpbmdzKSk7XG4gICAgICAgIHRoaXMuZGVmYXVsdFNldHRpbmdzID0gZGVmYXVsdFNldHRpbmdzO1xuICAgIH0sXG5cbiAgICBzZXQ6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3Nba2V5XSA9IHZhbHVlO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9LFxuXG4gICAgZ2V0OiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzW2tleV07XG4gICAgfSxcblxuICAgIHNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0obG9jYWxfc3RvcmFnZV9rZXksIEpTT04uc3RyaW5naWZ5KHRoaXMuc2V0dGluZ3MpKTtcbiAgICB9LFxuICAgIFxuICAgIHJlc2V0RGVmYXVsdHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmF1bHRzID0gdGhpcy5kZWZhdWx0U2V0dGluZ3M7XG4gICAgICAgIGlmIChkZWZhdWx0cykge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncyA9IF8uZXh0ZW5kKHt9LCBkZWZhdWx0cyk7XG4gICAgICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ3M7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNObGRIUnBibWR6TG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZjMlYwZEdsdVozTXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFc1NVRkJTU3hEUVVGRExFZEJRVWNzVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPMEZCUXpOQ0xFbEJRVWtzYVVKQlFXbENMRWRCUVVjc1pVRkJaU3hEUVVGRE96dEJRVVY0UXl4VFFVRlRMRkZCUVZFc1JVRkJSU3hsUVVGbExFVkJRVVU3U1VGRGFFTXNTVUZCU1N4RFFVRkRMRmRCUVZjc1EwRkJReXhsUVVGbExFbEJRVWtzUlVGQlJTeERRVUZETEVOQlFVTTdRVUZETlVNc1EwRkJRenM3UVVGRlJDeFJRVUZSTEVOQlFVTXNVMEZCVXl4SFFVRkhPMGxCUTJwQ0xEUkNRVUUwUWl4RlFVRkZMRmxCUVZrN1VVRkRkRU1zU1VGQlNTeGpRVUZqTEVkQlFVY3NXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhwUWtGQmFVSXNRMEZCUXl4RFFVRkRPMUZCUXpkRUxFbEJRVWtzVVVGQlVTeEhRVUZITEVWQlFVVXNRMEZCUXp0UlFVTnNRaXhKUVVGSkxHTkJRV01zUlVGQlJUdFpRVU5vUWl4UlFVRlJMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eGpRVUZqTEVOQlFVTXNRMEZCUXp0VFFVTjZRenRSUVVORUxFOUJRVThzVVVGQlVTeERRVUZETzBGQlEzaENMRXRCUVVzN08wbEJSVVFzVjBGQlZ5eEZRVUZGTEZWQlFWVXNaVUZCWlN4RlFVRkZPMUZCUTNCRExFbEJRVWtzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl3MFFrRkJORUlzUlVGQlJTeERRVUZETzFGQlEzaEVMRWxCUVVrc1dVRkJXU3hIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlN4RlFVRkZMR1ZCUVdVc1NVRkJTU3hGUVVGRkxFTkJRVU1zUTBGQlF6dFJRVU4yUkN4SlFVRkpMRU5CUVVNc1VVRkJVU3hIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zV1VGQldTeEZRVUZGTEdGQlFXRXNRMEZCUXl4RFFVRkRMRU5CUVVNN1VVRkRjRVVzU1VGQlNTeERRVUZETEdWQlFXVXNSMEZCUnl4bFFVRmxMRU5CUVVNN1FVRkRMME1zUzBGQlN6czdTVUZGUkN4SFFVRkhMRVZCUVVVc1ZVRkJWU3hIUVVGSExFVkJRVVVzUzBGQlN5eEZRVUZGTzFGQlEzWkNMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTMEZCU3l4RFFVRkRPMUZCUXpOQ0xFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXp0QlFVTndRaXhMUVVGTE96dEpRVVZFTEVkQlFVY3NSVUZCUlN4VlFVRlZMRWRCUVVjc1JVRkJSVHRSUVVOb1FpeFBRVUZQTEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGJFTXNTMEZCU3pzN1NVRkZSQ3hKUVVGSkxFVkJRVVVzV1VGQldUdFJRVU5rTEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc2FVSkJRV2xDTEVWQlFVVXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEVOQlFVTXNRMEZCUXp0QlFVTXZSU3hMUVVGTE96dEpRVVZFTEdGQlFXRXNSVUZCUlN4WlFVRlpPMUZCUTNaQ0xFbEJRVWtzVVVGQlVTeEhRVUZITEVsQlFVa3NRMEZCUXl4bFFVRmxMRU5CUVVNN1VVRkRjRU1zU1VGQlNTeFJRVUZSTEVWQlFVVTdXVUZEVml4SlFVRkpMRU5CUVVNc1VVRkJVU3hIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlN4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE8xbEJRM1pETEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJRenRUUVVObU8wdEJRMG83UVVGRFRDeERRVUZETEVOQlFVTTdPMEZCUlVZc1RVRkJUU3hEUVVGRExFOUJRVThzUjBGQlJ5eFJRVUZSTEVOQlFVTWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUoyWVhJZ1h5QTlJSEpsY1hWcGNtVW9KeTR2ZFhScGJITW5LVHRjYm5aaGNpQnNiMk5oYkY5emRHOXlZV2RsWDJ0bGVTQTlJQ2QxZEcxbExYTmxkSFJwYm1kekp6dGNibHh1Wm5WdVkzUnBiMjRnVTJWMGRHbHVaM01nS0dSbFptRjFiSFJUWlhSMGFXNW5jeWtnZTF4dUlDQWdJSFJvYVhNdWMyVjBSR1ZtWVhWc2RITW9aR1ZtWVhWc2RGTmxkSFJwYm1keklIeDhJSHQ5S1R0Y2JuMWNibHh1VTJWMGRHbHVaM011Y0hKdmRHOTBlWEJsSUQwZ2UxeHVJQ0FnSUhKbFlXUlRaWFIwYVc1bmMwWnliMjFNYjJOaGJGTjBiM0poWjJVNklHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlITmxkSFJwYm1kelUzUnlhVzVuSUQwZ2JHOWpZV3hUZEc5eVlXZGxMbWRsZEVsMFpXMG9iRzlqWVd4ZmMzUnZjbUZuWlY5clpYa3BPMXh1SUNBZ0lDQWdJQ0IyWVhJZ2MyVjBkR2x1WjNNZ1BTQjdmVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tITmxkSFJwYm1kelUzUnlhVzVuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6WlhSMGFXNW5jeUE5SUVwVFQwNHVjR0Z5YzJVb2MyVjBkR2x1WjNOVGRISnBibWNwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCelpYUjBhVzVuY3p0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYzJWMFJHVm1ZWFZzZEhNNklHWjFibU4wYVc5dUlDaGtaV1poZFd4MFUyVjBkR2x1WjNNcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUd4dlkyRnNVMlYwZEdsdVozTWdQU0IwYUdsekxuSmxZV1JUWlhSMGFXNW5jMFp5YjIxTWIyTmhiRk4wYjNKaFoyVW9LVHRjYmlBZ0lDQWdJQ0FnZG1GeUlHUmxabUYxYkhSelEyOXdlU0E5SUY4dVpYaDBaVzVrS0h0OUxDQmtaV1poZFd4MFUyVjBkR2x1WjNNZ2ZId2dlMzBwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbk5sZEhScGJtZHpJRDBnWHk1bGVIUmxibVFvZTMwc0lGOHVaWGgwWlc1a0tHUmxabUYxYkhSelEyOXdlU3dnYkc5allXeFRaWFIwYVc1bmN5a3BPMXh1SUNBZ0lDQWdJQ0IwYUdsekxtUmxabUYxYkhSVFpYUjBhVzVuY3lBOUlHUmxabUYxYkhSVFpYUjBhVzVuY3p0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYzJWME9pQm1kVzVqZEdsdmJpQW9hMlY1TENCMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbk5sZEhScGJtZHpXMnRsZVYwZ1BTQjJZV3gxWlR0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WVhabEtDazdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lHZGxkRG9nWm5WdVkzUnBiMjRnS0d0bGVTa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1elpYUjBhVzVuYzF0clpYbGRPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnpZWFpsT2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJR3h2WTJGc1UzUnZjbUZuWlM1elpYUkpkR1Z0S0d4dlkyRnNYM04wYjNKaFoyVmZhMlY1TENCS1UwOU9Mbk4wY21sdVoybG1lU2gwYUdsekxuTmxkSFJwYm1kektTazdYRzRnSUNBZ2ZTeGNiaUFnSUNCY2JpQWdJQ0J5WlhObGRFUmxabUYxYkhSek9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQmtaV1poZFd4MGN5QTlJSFJvYVhNdVpHVm1ZWFZzZEZObGRIUnBibWR6TzF4dUlDQWdJQ0FnSUNCcFppQW9aR1ZtWVhWc2RITXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11YzJWMGRHbHVaM01nUFNCZkxtVjRkR1Z1WkNoN2ZTd2daR1ZtWVhWc2RITXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV6WVhabEtDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5TzF4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlGTmxkSFJwYm1kek8xeHVJbDE5IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBTaW11bGF0ZSA9IHtcbiAgICBldmVudDogZnVuY3Rpb24oZWxlbWVudCwgZXZlbnROYW1lLCBvcHRpb25zKXtcbiAgICAgICAgdmFyIGV2dDtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50KSB7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkhUTUxFdmVudHNcIik7XG4gICAgICAgICAgICBldnQuaW5pdEV2ZW50KGV2ZW50TmFtZSwgZXZlbnROYW1lICE9ICdtb3VzZWVudGVyJyAmJiBldmVudE5hbWUgIT0gJ21vdXNlbGVhdmUnLCB0cnVlICk7XG4gICAgICAgICAgICBfLmV4dGVuZChldnQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICAgICAgICAgIGVsZW1lbnQuZmlyZUV2ZW50KCdvbicgKyBldmVudE5hbWUsZXZ0KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAga2V5RXZlbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIG9wdGlvbnMpe1xuICAgICAgICB2YXIgZXZ0LFxuICAgICAgICAgICAgZSA9IHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlLCB2aWV3OiB3aW5kb3csXG4gICAgICAgICAgICAgICAgY3RybEtleTogZmFsc2UsIGFsdEtleTogZmFsc2UsIHNoaWZ0S2V5OiBmYWxzZSwgbWV0YUtleTogZmFsc2UsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogMCwgY2hhckNvZGU6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIF8uZXh0ZW5kKGUsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpe1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdLZXlFdmVudHMnKTtcbiAgICAgICAgICAgICAgICBldnQuaW5pdEtleUV2ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSwgZS52aWV3LFxuICAgICAgICAgICAgZS5jdHJsS2V5LCBlLmFsdEtleSwgZS5zaGlmdEtleSwgZS5tZXRhS2V5LFxuICAgICAgICAgICAgZS5rZXlDb2RlLCBlLmNoYXJDb2RlKTtcbiAgICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50c1wiKTtcbiAgICAgICAgZXZ0LmluaXRFdmVudCh0eXBlLCBlLmJ1YmJsZXMsIGUuY2FuY2VsYWJsZSk7XG4gICAgICAgIF8uZXh0ZW5kKGV2dCwge1xuICAgICAgICAgICAgdmlldzogZS52aWV3LFxuICAgICAgICAgIGN0cmxLZXk6IGUuY3RybEtleSwgYWx0S2V5OiBlLmFsdEtleSxcbiAgICAgICAgICBzaGlmdEtleTogZS5zaGlmdEtleSwgbWV0YUtleTogZS5tZXRhS2V5LFxuICAgICAgICAgIGtleUNvZGU6IGUua2V5Q29kZSwgY2hhckNvZGU6IGUuY2hhckNvZGVcbiAgICAgICAgfSk7XG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5TaW11bGF0ZS5rZXlwcmVzcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5cHJlc3MnLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleWRvd24gPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleWRvd24nLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cblNpbXVsYXRlLmtleXVwID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXl1cCcsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxudmFyIGV2ZW50cyA9IFtcbiAgICAnY2xpY2snLFxuICAgICdmb2N1cycsXG4gICAgJ2JsdXInLFxuICAgICdkYmxjbGljaycsXG4gICAgJ2lucHV0JyxcbiAgICAnY2hhbmdlJyxcbiAgICAnbW91c2Vkb3duJyxcbiAgICAnbW91c2Vtb3ZlJyxcbiAgICAnbW91c2VvdXQnLFxuICAgICdtb3VzZW92ZXInLFxuICAgICdtb3VzZXVwJyxcbiAgICAnbW91c2VlbnRlcicsXG4gICAgJ21vdXNlbGVhdmUnLFxuICAgICdyZXNpemUnLFxuICAgICdzY3JvbGwnLFxuICAgICdzZWxlY3QnLFxuICAgICdzdWJtaXQnLFxuICAgICdsb2FkJyxcbiAgICAndW5sb2FkJ1xuXTtcblxuZm9yICh2YXIgaSA9IGV2ZW50cy5sZW5ndGg7IGktLTspe1xuICAgIHZhciBldmVudCA9IGV2ZW50c1tpXTtcbiAgICBTaW11bGF0ZVtldmVudF0gPSAoZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgICAgICAgICAgdGhpcy5ldmVudChlbGVtZW50LCBldnQsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuICAgIH0oZXZlbnQpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaW11bGF0ZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNOcGJYVnNZWFJsTG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZjMmx0ZFd4aGRHVXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFc1NVRkJTU3hEUVVGRExFZEJRVWNzVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPenRCUVVVelFpeEpRVUZKTEZGQlFWRXNSMEZCUnp0SlFVTllMRXRCUVVzc1JVRkJSU3hUUVVGVExFOUJRVThzUlVGQlJTeFRRVUZUTEVWQlFVVXNUMEZCVHl4RFFVRkRPMUZCUTNoRExFbEJRVWtzUjBGQlJ5eERRVUZETzFGQlExSXNTVUZCU1N4UlFVRlJMRU5CUVVNc1YwRkJWeXhGUVVGRk8xbEJRM1JDTEVkQlFVY3NSMEZCUnl4UlFVRlJMRU5CUVVNc1YwRkJWeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZETzFsQlEzcERMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zVTBGQlV5eEZRVUZGTEZOQlFWTXNTVUZCU1N4WlFVRlpMRWxCUVVrc1UwRkJVeXhKUVVGSkxGbEJRVmtzUlVGQlJTeEpRVUZKTEVWQlFVVXNRMEZCUXp0WlFVTjRSaXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEVkQlFVY3NSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenRaUVVOMlFpeFBRVUZQTEVOQlFVTXNZVUZCWVN4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8xTkJRemxDTEVsQlFVazdXVUZEUkN4SFFVRkhMRWRCUVVjc1VVRkJVU3hEUVVGRExHbENRVUZwUWl4RlFVRkZMRU5CUVVNN1dVRkRia01zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4SlFVRkpMRWRCUVVjc1UwRkJVeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlF6TkRPMHRCUTBvN1NVRkRSQ3hSUVVGUkxFVkJRVVVzVTBGQlV5eFBRVUZQTEVWQlFVVXNTVUZCU1N4RlFVRkZMRTlCUVU4c1EwRkJRenRSUVVOMFF5eEpRVUZKTEVkQlFVYzdXVUZEU0N4RFFVRkRMRWRCUVVjN1owSkJRMEVzVDBGQlR5eEZRVUZGTEVsQlFVa3NSVUZCUlN4VlFVRlZMRVZCUVVVc1NVRkJTU3hGUVVGRkxFbEJRVWtzUlVGQlJTeE5RVUZOTzJkQ1FVTTNReXhQUVVGUExFVkJRVVVzUzBGQlN5eEZRVUZGTEUxQlFVMHNSVUZCUlN4TFFVRkxMRVZCUVVVc1VVRkJVU3hGUVVGRkxFdEJRVXNzUlVGQlJTeFBRVUZQTEVWQlFVVXNTMEZCU3p0blFrRkRPVVFzVDBGQlR5eEZRVUZGTEVOQlFVTXNSVUZCUlN4UlFVRlJMRVZCUVVVc1EwRkJRenRoUVVNeFFpeERRVUZETzFGQlEwNHNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhEUVVGRExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdVVUZEY2tJc1NVRkJTU3hSUVVGUkxFTkJRVU1zVjBGQlZ5eERRVUZETzFsQlEzSkNMRWRCUVVjN1owSkJRME1zUjBGQlJ5eEhRVUZITEZGQlFWRXNRMEZCUXl4WFFVRlhMRU5CUVVNc1YwRkJWeXhEUVVGRExFTkJRVU03WjBKQlEzaERMRWRCUVVjc1EwRkJReXhaUVVGWk8yOUNRVU5hTEVsQlFVa3NSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUeXhGUVVGRkxFTkJRVU1zUTBGQlF5eFZRVUZWTEVWQlFVVXNRMEZCUXl4RFFVRkRMRWxCUVVrN1dVRkROME1zUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUTBGQlF5eFJRVUZSTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTlCUVU4N1dVRkRNVU1zUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03VlVGRGVrSXNUMEZCVHl4RFFVRkRMR0ZCUVdFc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dFRRVU0xUWl4TlFVRk5MRWRCUVVjc1EwRkJRenRaUVVOUUxFZEJRVWNzUjBGQlJ5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE8xRkJRM3BETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTEVWQlFVVXNRMEZCUXl4RFFVRkRMRlZCUVZVc1EwRkJReXhEUVVGRE8xRkJRemRETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1IwRkJSeXhGUVVGRk8xbEJRMVlzU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXl4SlFVRkpPMVZCUTJRc1QwRkJUeXhGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTEVWQlFVVXNUVUZCVFN4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTk8xVkJRM0JETEZGQlFWRXNSVUZCUlN4RFFVRkRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHp0VlFVTjRReXhQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVOHNSVUZCUlN4UlFVRlJMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkU3VTBGRGVrTXNRMEZCUXl4RFFVRkRPMUZCUTBnc1QwRkJUeXhEUVVGRExHRkJRV0VzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0VFFVTXhRanRUUVVOQk8wdEJRMG83UVVGRFRDeERRVUZETEVOQlFVTTdPMEZCUlVZc1VVRkJVU3hEUVVGRExGRkJRVkVzUjBGQlJ5eFRRVUZUTEU5QlFVOHNSVUZCUlN4SFFVRkhMRU5CUVVNN1NVRkRkRU1zU1VGQlNTeFJRVUZSTEVkQlFVY3NSMEZCUnl4RFFVRkRMRlZCUVZVc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEpRVU5xUXl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFOUJRVThzUlVGQlJTeFZRVUZWTEVWQlFVVTdVVUZETDBJc1QwRkJUeXhGUVVGRkxGRkJRVkU3VVVGRGFrSXNVVUZCVVN4RlFVRkZMRkZCUVZFN1MwRkRja0lzUTBGQlF5eERRVUZETzBGQlExQXNRMEZCUXl4RFFVRkRPenRCUVVWR0xGRkJRVkVzUTBGQlF5eFBRVUZQTEVkQlFVY3NVMEZCVXl4UFFVRlBMRVZCUVVVc1IwRkJSeXhEUVVGRE8wbEJRM0pETEVsQlFVa3NVVUZCVVN4SFFVRkhMRWRCUVVjc1EwRkJReXhWUVVGVkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdTVUZEYWtNc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eFBRVUZQTEVWQlFVVXNVMEZCVXl4RlFVRkZPMUZCUXpsQ0xFOUJRVThzUlVGQlJTeFJRVUZSTzFGQlEycENMRkZCUVZFc1JVRkJSU3hSUVVGUk8wdEJRM0pDTEVOQlFVTXNRMEZCUXp0QlFVTlFMRU5CUVVNc1EwRkJRenM3UVVGRlJpeFJRVUZSTEVOQlFVTXNTMEZCU3l4SFFVRkhMRk5CUVZNc1QwRkJUeXhGUVVGRkxFZEJRVWNzUTBGQlF6dEpRVU51UXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhIUVVGSExFTkJRVU1zVlVGQlZTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMGxCUTJwRExFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNUMEZCVHl4RlFVRkZMRTlCUVU4c1JVRkJSVHRSUVVNMVFpeFBRVUZQTEVWQlFVVXNVVUZCVVR0UlFVTnFRaXhSUVVGUkxFVkJRVVVzVVVGQlVUdExRVU55UWl4RFFVRkRMRU5CUVVNN1FVRkRVQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNTVUZCU1N4TlFVRk5MRWRCUVVjN1NVRkRWQ3hQUVVGUE8wbEJRMUFzVDBGQlR6dEpRVU5RTEUxQlFVMDdTVUZEVGl4VlFVRlZPMGxCUTFZc1QwRkJUenRKUVVOUUxGRkJRVkU3U1VGRFVpeFhRVUZYTzBsQlExZ3NWMEZCVnp0SlFVTllMRlZCUVZVN1NVRkRWaXhYUVVGWE8wbEJRMWdzVTBGQlV6dEpRVU5VTEZsQlFWazdTVUZEV2l4WlFVRlpPMGxCUTFvc1VVRkJVVHRKUVVOU0xGRkJRVkU3U1VGRFVpeFJRVUZSTzBsQlExSXNVVUZCVVR0SlFVTlNMRTFCUVUwN1NVRkRUaXhSUVVGUk8wRkJRMW9zUTBGQlF5eERRVUZET3p0QlFVVkdMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzVFVGQlRTeERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRKUVVNM1FpeEpRVUZKTEV0QlFVc3NSMEZCUnl4TlFVRk5MRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03U1VGRGRFSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxGTkJRVk1zUjBGQlJ5eERRVUZETzFGQlF6VkNMRTlCUVU4c1UwRkJVeXhQUVVGUExFVkJRVVVzVDBGQlR5eERRVUZETzFsQlF6ZENMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVDBGQlR5eEZRVUZGTEVkQlFVY3NSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenRUUVVOeVF5eERRVUZETzB0QlEwd3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRMlFzUTBGQlF6czdRVUZGUkN4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSExGRkJRVkVpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdYeUE5SUhKbGNYVnBjbVVvSnk0dmRYUnBiSE1uS1R0Y2JseHVkbUZ5SUZOcGJYVnNZWFJsSUQwZ2UxeHVJQ0FnSUdWMlpXNTBPaUJtZFc1amRHbHZiaWhsYkdWdFpXNTBMQ0JsZG1WdWRFNWhiV1VzSUc5d2RHbHZibk1wZTF4dUlDQWdJQ0FnSUNCMllYSWdaWFowTzF4dUlDQWdJQ0FnSUNCcFppQW9aRzlqZFcxbGJuUXVZM0psWVhSbFJYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZENBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWMlpXNTBLRndpU0ZSTlRFVjJaVzUwYzF3aUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWMmRDNXBibWwwUlhabGJuUW9aWFpsYm5ST1lXMWxMQ0JsZG1WdWRFNWhiV1VnSVQwZ0oyMXZkWE5sWlc1MFpYSW5JQ1ltSUdWMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWc1pXRjJaU2NzSUhSeWRXVWdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lGOHVaWGgwWlc1a0tHVjJkQ3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmxiR1Z0Wlc1MExtUnBjM0JoZEdOb1JYWmxiblFvWlhaMEtUdGNiaUFnSUNBZ0lDQWdmV1ZzYzJWN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsZG5RZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmRtVnVkRTlpYW1WamRDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pXeGxiV1Z1ZEM1bWFYSmxSWFpsYm5Rb0oyOXVKeUFySUdWMlpXNTBUbUZ0WlN4bGRuUXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQnJaWGxGZG1WdWREb2dablZ1WTNScGIyNG9aV3hsYldWdWRDd2dkSGx3WlN3Z2IzQjBhVzl1Y3lsN1hHNGdJQ0FnSUNBZ0lIWmhjaUJsZG5Rc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHSjFZbUpzWlhNNklIUnlkV1VzSUdOaGJtTmxiR0ZpYkdVNklIUnlkV1VzSUhacFpYYzZJSGRwYm1SdmR5eGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpkSEpzUzJWNU9pQm1ZV3h6WlN3Z1lXeDBTMlY1T2lCbVlXeHpaU3dnYzJocFpuUkxaWGs2SUdaaGJITmxMQ0J0WlhSaFMyVjVPaUJtWVd4elpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQXdMQ0JqYUdGeVEyOWtaVG9nTUZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVHRjYmlBZ0lDQWdJQ0FnWHk1bGVIUmxibVFvWlN3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hrYjJOMWJXVnVkQzVqY21WaGRHVkZkbVZ1ZENsN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwY25sN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYWjBJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSWFpsYm5Rb0owdGxlVVYyWlc1MGN5Y3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1YyZEM1cGJtbDBTMlY1UlhabGJuUW9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSNWNHVXNJR1V1WW5WaVlteGxjeXdnWlM1allXNWpaV3hoWW14bExDQmxMblpwWlhjc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsTG1OMGNteExaWGtzSUdVdVlXeDBTMlY1TENCbExuTm9hV1owUzJWNUxDQmxMbTFsZEdGTFpYa3NYRzRnSUNBZ0lDQWdJQ0FnSUNCbExtdGxlVU52WkdVc0lHVXVZMmhoY2tOdlpHVXBPMXh1SUNBZ0lDQWdJQ0FnSUdWc1pXMWxiblF1WkdsemNHRjBZMmhGZG1WdWRDaGxkblFwTzF4dUlDQWdJQ0FnSUNCOVkyRjBZMmdvWlhKeUtYdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWMmRDQTlJR1J2WTNWdFpXNTBMbU55WldGMFpVVjJaVzUwS0Z3aVJYWmxiblJ6WENJcE8xeHVJQ0FnSUNBZ0lDQmxkblF1YVc1cGRFVjJaVzUwS0hSNWNHVXNJR1V1WW5WaVlteGxjeXdnWlM1allXNWpaV3hoWW14bEtUdGNiaUFnSUNBZ0lDQWdYeTVsZUhSbGJtUW9aWFowTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyYVdWM09pQmxMblpwWlhjc1hHNGdJQ0FnSUNBZ0lDQWdZM1J5YkV0bGVUb2daUzVqZEhKc1MyVjVMQ0JoYkhSTFpYazZJR1V1WVd4MFMyVjVMRnh1SUNBZ0lDQWdJQ0FnSUhOb2FXWjBTMlY1T2lCbExuTm9hV1owUzJWNUxDQnRaWFJoUzJWNU9pQmxMbTFsZEdGTFpYa3NYRzRnSUNBZ0lDQWdJQ0FnYTJWNVEyOWtaVG9nWlM1clpYbERiMlJsTENCamFHRnlRMjlrWlRvZ1pTNWphR0Z5UTI5a1pWeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnWld4bGJXVnVkQzVrYVhOd1lYUmphRVYyWlc1MEtHVjJkQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMDdYRzVjYmxOcGJYVnNZWFJsTG10bGVYQnlaWE56SUQwZ1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z1kyaHlLWHRjYmlBZ0lDQjJZWElnWTJoaGNrTnZaR1VnUFNCamFISXVZMmhoY2tOdlpHVkJkQ2d3S1R0Y2JpQWdJQ0IwYUdsekxtdGxlVVYyWlc1MEtHVnNaVzFsYm5Rc0lDZHJaWGx3Y21WemN5Y3NJSHRjYmlBZ0lDQWdJQ0FnYTJWNVEyOWtaVG9nWTJoaGNrTnZaR1VzWEc0Z0lDQWdJQ0FnSUdOb1lYSkRiMlJsT2lCamFHRnlRMjlrWlZ4dUlDQWdJSDBwTzF4dWZUdGNibHh1VTJsdGRXeGhkR1V1YTJWNVpHOTNiaUE5SUdaMWJtTjBhVzl1S0dWc1pXMWxiblFzSUdOb2NpbDdYRzRnSUNBZ2RtRnlJR05vWVhKRGIyUmxJRDBnWTJoeUxtTm9ZWEpEYjJSbFFYUW9NQ2s3WEc0Z0lDQWdkR2hwY3k1clpYbEZkbVZ1ZENobGJHVnRaVzUwTENBbmEyVjVaRzkzYmljc0lIdGNiaUFnSUNBZ0lDQWdhMlY1UTI5a1pUb2dZMmhoY2tOdlpHVXNYRzRnSUNBZ0lDQWdJR05vWVhKRGIyUmxPaUJqYUdGeVEyOWtaVnh1SUNBZ0lIMHBPMXh1ZlR0Y2JseHVVMmx0ZFd4aGRHVXVhMlY1ZFhBZ1BTQm1kVzVqZEdsdmJpaGxiR1Z0Wlc1MExDQmphSElwZTF4dUlDQWdJSFpoY2lCamFHRnlRMjlrWlNBOUlHTm9jaTVqYUdGeVEyOWtaVUYwS0RBcE8xeHVJQ0FnSUhSb2FYTXVhMlY1UlhabGJuUW9aV3hsYldWdWRDd2dKMnRsZVhWd0p5d2dlMXh1SUNBZ0lDQWdJQ0JyWlhsRGIyUmxPaUJqYUdGeVEyOWtaU3hjYmlBZ0lDQWdJQ0FnWTJoaGNrTnZaR1U2SUdOb1lYSkRiMlJsWEc0Z0lDQWdmU2s3WEc1OU8xeHVYRzUyWVhJZ1pYWmxiblJ6SUQwZ1cxeHVJQ0FnSUNkamJHbGpheWNzWEc0Z0lDQWdKMlp2WTNWekp5eGNiaUFnSUNBbllteDFjaWNzWEc0Z0lDQWdKMlJpYkdOc2FXTnJKeXhjYmlBZ0lDQW5hVzV3ZFhRbkxGeHVJQ0FnSUNkamFHRnVaMlVuTEZ4dUlDQWdJQ2R0YjNWelpXUnZkMjRuTEZ4dUlDQWdJQ2R0YjNWelpXMXZkbVVuTEZ4dUlDQWdJQ2R0YjNWelpXOTFkQ2NzWEc0Z0lDQWdKMjF2ZFhObGIzWmxjaWNzWEc0Z0lDQWdKMjF2ZFhObGRYQW5MRnh1SUNBZ0lDZHRiM1Z6WldWdWRHVnlKeXhjYmlBZ0lDQW5iVzkxYzJWc1pXRjJaU2NzWEc0Z0lDQWdKM0psYzJsNlpTY3NYRzRnSUNBZ0ozTmpjbTlzYkNjc1hHNGdJQ0FnSjNObGJHVmpkQ2NzWEc0Z0lDQWdKM04xWW0xcGRDY3NYRzRnSUNBZ0oyeHZZV1FuTEZ4dUlDQWdJQ2QxYm14dllXUW5YRzVkTzF4dVhHNW1iM0lnS0haaGNpQnBJRDBnWlhabGJuUnpMbXhsYm1kMGFEc2dhUzB0T3lsN1hHNGdJQ0FnZG1GeUlHVjJaVzUwSUQwZ1pYWmxiblJ6VzJsZE8xeHVJQ0FnSUZOcGJYVnNZWFJsVzJWMlpXNTBYU0E5SUNobWRXNWpkR2x2YmlobGRuUXBlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdablZ1WTNScGIyNG9aV3hsYldWdWRDd2diM0IwYVc5dWN5bDdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbVYyWlc1MEtHVnNaVzFsYm5Rc0lHVjJkQ3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUgwN1hHNGdJQ0FnZlNobGRtVnVkQ2twTzF4dWZWeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJRk5wYlhWc1lYUmxPeUpkZlE9PSIsIi8qKlxuICogUG9seWZpbGxzXG4gKi9cblxuLyoqXG4gKiBUaGlzIGlzIGNvcGllZCBmcm9tIFJlYWNKUydzIG93biBwb2x5cGZpbGwgdG8gcnVuIHRlc3RzIHdpdGggcGhhbnRvbWpzLlxuICogaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL3JlYWN0L2Jsb2IvM2RjMTA3NDkwODBhNDYwZTQ4YmVlNDZkNzY5NzYzZWM3MTkxYWM3Ni9zcmMvdGVzdC9waGFudG9tanMtc2hpbXMuanNcbiAqL1xuKGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIEFwID0gQXJyYXkucHJvdG90eXBlO1xuICAgIHZhciBzbGljZSA9IEFwLnNsaWNlO1xuICAgIHZhciBGcCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAgIGlmICghRnAuYmluZCkge1xuICAgICAgLy8gUGhhbnRvbUpTIGRvZXNuJ3Qgc3VwcG9ydCBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCBuYXRpdmVseSwgc29cbiAgICAgIC8vIHBvbHlmaWxsIGl0IHdoZW5ldmVyIHRoaXMgbW9kdWxlIGlzIHJlcXVpcmVkLlxuICAgICAgRnAuYmluZCA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGZ1bmMgPSB0aGlzO1xuICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgICAgICBmdW5jdGlvbiBib3VuZCgpIHtcbiAgICAgICAgICB2YXIgaW52b2tlZEFzQ29uc3RydWN0b3IgPSBmdW5jLnByb3RvdHlwZSAmJiAodGhpcyBpbnN0YW5jZW9mIGZ1bmMpO1xuICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KFxuICAgICAgICAgICAgLy8gSWdub3JlIHRoZSBjb250ZXh0IHBhcmFtZXRlciB3aGVuIGludm9raW5nIHRoZSBib3VuZCBmdW5jdGlvblxuICAgICAgICAgICAgLy8gYXMgYSBjb25zdHJ1Y3Rvci4gTm90ZSB0aGF0IHRoaXMgaW5jbHVkZXMgbm90IG9ubHkgY29uc3RydWN0b3JcbiAgICAgICAgICAgIC8vIGludm9jYXRpb25zIHVzaW5nIHRoZSBuZXcga2V5d29yZCBidXQgYWxzbyBjYWxscyB0byBiYXNlIGNsYXNzXG4gICAgICAgICAgICAvLyBjb25zdHJ1Y3RvcnMgc3VjaCBhcyBCYXNlQ2xhc3MuY2FsbCh0aGlzLCAuLi4pIG9yIHN1cGVyKC4uLikuXG4gICAgICAgICAgICAhaW52b2tlZEFzQ29uc3RydWN0b3IgJiYgY29udGV4dCB8fCB0aGlzLFxuICAgICAgICAgICAgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgYm91bmQgZnVuY3Rpb24gbXVzdCBzaGFyZSB0aGUgLnByb3RvdHlwZSBvZiB0aGUgdW5ib3VuZFxuICAgICAgICAvLyBmdW5jdGlvbiBzbyB0aGF0IGFueSBvYmplY3QgY3JlYXRlZCBieSBvbmUgY29uc3RydWN0b3Igd2lsbCBjb3VudFxuICAgICAgICAvLyBhcyBhbiBpbnN0YW5jZSBvZiBib3RoIGNvbnN0cnVjdG9ycy5cbiAgICAgICAgYm91bmQucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG5cbiAgICAgICAgcmV0dXJuIGJvdW5kO1xuICAgICAgfTtcbiAgICB9XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQoZHN0LCBzcmMpe1xuICAgICAgICBpZiAoc3JjKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3JjKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNyYy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRzdFtrZXldID0gc3JjW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkc3Q7XG4gICAgfSxcblxuICAgIG1hcDogZnVuY3Rpb24ob2JqLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgICB2YXIgbGVuID0gb2JqLmxlbmd0aCA+Pj4gMDtcbiAgICAgICAgdmFyIG5ld0FycmF5ID0gbmV3IEFycmF5KGxlbik7XG4gICAgICAgIHZhciBrZXkgPSAwO1xuICAgICAgICBpZiAoIXRoaXNBcmcpIHtcbiAgICAgICAgICAgIHRoaXNBcmcgPSBvYmo7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKGtleSA8IGxlbikge1xuICAgICAgICAgICAgbmV3QXJyYXlba2V5XSA9IGNhbGxiYWNrLmNhbGwodGhpc0FyZywgb2JqW2tleV0sIGtleSwgb2JqKTtcbiAgICAgICAgICAgIGtleSsrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdBcnJheTtcbiAgICB9XG5cbn07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNWMGFXeHpMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmRYUnBiSE11YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdPMEZCUlVFc1IwRkJSenM3UVVGRlNEdEJRVU5CT3p0SFFVVkhPMEZCUTBnc1EwRkJReXhYUVVGWE96dEpRVVZTTEVsQlFVa3NSVUZCUlN4SFFVRkhMRXRCUVVzc1EwRkJReXhUUVVGVExFTkJRVU03U1VGRGVrSXNTVUZCU1N4TFFVRkxMRWRCUVVjc1JVRkJSU3hEUVVGRExFdEJRVXNzUTBGQlF6dEJRVU42UWl4SlFVRkpMRWxCUVVrc1JVRkJSU3hIUVVGSExGRkJRVkVzUTBGQlF5eFRRVUZUTEVOQlFVTTdPMEZCUldoRExFbEJRVWtzU1VGQlNTeERRVUZETEVWQlFVVXNRMEZCUXl4SlFVRkpMRVZCUVVVN1FVRkRiRUk3TzAxQlJVMHNSVUZCUlN4RFFVRkRMRWxCUVVrc1IwRkJSeXhUUVVGVExFOUJRVThzUlVGQlJUdFJRVU14UWl4SlFVRkpMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRGVFSXNVVUZCVVN4SlFVRkpMRWxCUVVrc1IwRkJSeXhMUVVGTExFTkJRVU1zU1VGQlNTeERRVUZETEZOQlFWTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1EwRkJRenM3VVVGRmNFTXNVMEZCVXl4TFFVRkxMRWRCUVVjN1ZVRkRaaXhKUVVGSkxHOUNRVUZ2UWl4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFdEJRVXNzU1VGQlNTeFpRVUZaTEVsQlFVa3NRMEZCUXl4RFFVRkRPMEZCUXpsRkxGVkJRVlVzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3p0QlFVTXpRanRCUVVOQk8wRkJRMEU3TzFsQlJWa3NRMEZCUXl4dlFrRkJiMElzU1VGQlNTeFBRVUZQTEVsQlFVa3NTVUZCU1R0WlFVTjRReXhKUVVGSkxFTkJRVU1zVFVGQlRTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03VjBGRGJrTXNRMEZCUXp0QlFVTmFMRk5CUVZNN1FVRkRWRHRCUVVOQk8wRkJRMEU3TzBGQlJVRXNVVUZCVVN4TFFVRkxMRU5CUVVNc1UwRkJVeXhIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTTdPMUZCUldwRExFOUJRVThzUzBGQlN5eERRVUZETzA5QlEyUXNRMEZCUXp0QlFVTlNMRXRCUVVzN08wRkJSVXdzUTBGQlF5eEhRVUZITEVOQlFVTTdPMEZCUlV3c1RVRkJUU3hEUVVGRExFOUJRVThzUjBGQlJ6czdTVUZGWWl4TlFVRk5MRVZCUVVVc1UwRkJVeXhOUVVGTkxFTkJRVU1zUjBGQlJ5eEZRVUZGTEVkQlFVY3NRMEZCUXp0UlFVTTNRaXhKUVVGSkxFZEJRVWNzUlVGQlJUdFpRVU5NTEV0QlFVc3NTVUZCU1N4SFFVRkhMRWxCUVVrc1IwRkJSeXhGUVVGRk8yZENRVU5xUWl4SlFVRkpMRWRCUVVjc1EwRkJReXhqUVVGakxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVTdiMEpCUTNwQ0xFZEJRVWNzUTBGQlF5eEhRVUZITEVOQlFVTXNSMEZCUnl4SFFVRkhMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03YVVKQlEzWkNPMkZCUTBvN1UwRkRTanRSUVVORUxFOUJRVThzUjBGQlJ5eERRVUZETzBGQlEyNUNMRXRCUVVzN08wbEJSVVFzUjBGQlJ5eEZRVUZGTEZOQlFWTXNSMEZCUnl4RlFVRkZMRkZCUVZFc1JVRkJSU3hQUVVGUExFVkJRVVU3VVVGRGJFTXNTVUZCU1N4SFFVRkhMRWRCUVVjc1IwRkJSeXhEUVVGRExFMUJRVTBzUzBGQlN5eERRVUZETEVOQlFVTTdVVUZETTBJc1NVRkJTU3hSUVVGUkxFZEJRVWNzU1VGQlNTeExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1VVRkRPVUlzU1VGQlNTeEhRVUZITEVkQlFVY3NRMEZCUXl4RFFVRkRPMUZCUTFvc1NVRkJTU3hEUVVGRExFOUJRVThzUlVGQlJUdFpRVU5XTEU5QlFVOHNSMEZCUnl4SFFVRkhMRU5CUVVNN1UwRkRha0k3VVVGRFJDeFBRVUZQTEVkQlFVY3NSMEZCUnl4SFFVRkhMRVZCUVVVN1dVRkRaQ3hSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFVkJRVVVzUjBGQlJ5eERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRWRCUVVjc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6dFpRVU16UkN4SFFVRkhMRVZCUVVVc1EwRkJRenRUUVVOVU8xRkJRMFFzVDBGQlR5eFJRVUZSTEVOQlFVTTdRVUZEZUVJc1MwRkJTenM3UTBGRlNpeERRVUZESWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaUx5b3FYRzRnS2lCUWIyeDVabWxzYkhOY2JpQXFMMXh1WEc0dktpcGNiaUFxSUZSb2FYTWdhWE1nWTI5d2FXVmtJR1p5YjIwZ1VtVmhZMHBUSjNNZ2IzZHVJSEJ2Ykhsd1ptbHNiQ0IwYnlCeWRXNGdkR1Z6ZEhNZ2QybDBhQ0J3YUdGdWRHOXRhbk11WEc0Z0tpQm9kSFJ3Y3pvdkwyZHBkR2gxWWk1amIyMHZabUZqWldKdmIyc3ZjbVZoWTNRdllteHZZaTh6WkdNeE1EYzBPVEE0TUdFME5qQmxORGhpWldVME5tUTNOamszTmpObFl6Y3hPVEZoWXpjMkwzTnlZeTkwWlhOMEwzQm9ZVzUwYjIxcWN5MXphR2x0Y3k1cWMxeHVJQ292WEc0b1puVnVZM1JwYjI0b0tTQjdYRzVjYmlBZ0lDQjJZWElnUVhBZ1BTQkJjbkpoZVM1d2NtOTBiM1I1Y0dVN1hHNGdJQ0FnZG1GeUlITnNhV05sSUQwZ1FYQXVjMnhwWTJVN1hHNGdJQ0FnZG1GeUlFWndJRDBnUm5WdVkzUnBiMjR1Y0hKdmRHOTBlWEJsTzF4dVhHNGdJQ0FnYVdZZ0tDRkdjQzVpYVc1a0tTQjdYRzRnSUNBZ0lDQXZMeUJRYUdGdWRHOXRTbE1nWkc5bGMyNG5kQ0J6ZFhCd2IzSjBJRVoxYm1OMGFXOXVMbkJ5YjNSdmRIbHdaUzVpYVc1a0lHNWhkR2wyWld4NUxDQnpiMXh1SUNBZ0lDQWdMeThnY0c5c2VXWnBiR3dnYVhRZ2QyaGxibVYyWlhJZ2RHaHBjeUJ0YjJSMWJHVWdhWE1nY21WeGRXbHlaV1F1WEc0Z0lDQWdJQ0JHY0M1aWFXNWtJRDBnWm5WdVkzUnBiMjRvWTI5dWRHVjRkQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdablZ1WXlBOUlIUm9hWE03WEc0Z0lDQWdJQ0FnSUhaaGNpQmhjbWR6SUQwZ2MyeHBZMlV1WTJGc2JDaGhjbWQxYldWdWRITXNJREVwTzF4dVhHNGdJQ0FnSUNBZ0lHWjFibU4wYVc5dUlHSnZkVzVrS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFpoY2lCcGJuWnZhMlZrUVhORGIyNXpkSEoxWTNSdmNpQTlJR1oxYm1NdWNISnZkRzkwZVhCbElDWW1JQ2gwYUdseklHbHVjM1JoYm1ObGIyWWdablZ1WXlrN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHWjFibU11WVhCd2JIa29YRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QkpaMjV2Y21VZ2RHaGxJR052Ym5SbGVIUWdjR0Z5WVcxbGRHVnlJSGRvWlc0Z2FXNTJiMnRwYm1jZ2RHaGxJR0p2ZFc1a0lHWjFibU4wYVc5dVhHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCaGN5QmhJR052Ym5OMGNuVmpkRzl5TGlCT2IzUmxJSFJvWVhRZ2RHaHBjeUJwYm1Oc2RXUmxjeUJ1YjNRZ2IyNXNlU0JqYjI1emRISjFZM1J2Y2x4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnYVc1MmIyTmhkR2x2Ym5NZ2RYTnBibWNnZEdobElHNWxkeUJyWlhsM2IzSmtJR0oxZENCaGJITnZJR05oYkd4eklIUnZJR0poYzJVZ1kyeGhjM05jYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJR052Ym5OMGNuVmpkRzl5Y3lCemRXTm9JR0Z6SUVKaGMyVkRiR0Z6Y3k1allXeHNLSFJvYVhNc0lDNHVMaWtnYjNJZ2MzVndaWElvTGk0dUtTNWNiaUFnSUNBZ0lDQWdJQ0FnSUNGcGJuWnZhMlZrUVhORGIyNXpkSEoxWTNSdmNpQW1KaUJqYjI1MFpYaDBJSHg4SUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnSUNCaGNtZHpMbU52Ym1OaGRDaHpiR2xqWlM1allXeHNLR0Z5WjNWdFpXNTBjeWtwWEc0Z0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUM4dklGUm9aU0JpYjNWdVpDQm1kVzVqZEdsdmJpQnRkWE4wSUhOb1lYSmxJSFJvWlNBdWNISnZkRzkwZVhCbElHOW1JSFJvWlNCMWJtSnZkVzVrWEc0Z0lDQWdJQ0FnSUM4dklHWjFibU4wYVc5dUlITnZJSFJvWVhRZ1lXNTVJRzlpYW1WamRDQmpjbVZoZEdWa0lHSjVJRzl1WlNCamIyNXpkSEoxWTNSdmNpQjNhV3hzSUdOdmRXNTBYRzRnSUNBZ0lDQWdJQzh2SUdGeklHRnVJR2x1YzNSaGJtTmxJRzltSUdKdmRHZ2dZMjl1YzNSeWRXTjBiM0p6TGx4dUlDQWdJQ0FnSUNCaWIzVnVaQzV3Y205MGIzUjVjR1VnUFNCbWRXNWpMbkJ5YjNSdmRIbHdaVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWW05MWJtUTdYRzRnSUNBZ0lDQjlPMXh1SUNBZ0lIMWNibHh1ZlNrb0tUdGNibHh1Ylc5a2RXeGxMbVY0Y0c5eWRITWdQU0I3WEc1Y2JpQWdJQ0JsZUhSbGJtUTZJR1oxYm1OMGFXOXVJR1Y0ZEdWdVpDaGtjM1FzSUhOeVl5bDdYRzRnSUNBZ0lDQWdJR2xtSUNoemNtTXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHdGxlU0JwYmlCemNtTXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzSmpMbWhoYzA5M2JsQnliM0JsY25SNUtHdGxlU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaSE4wVzJ0bGVWMGdQU0J6Y21OYmEyVjVYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1J6ZER0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYldGd09pQm1kVzVqZEdsdmJpaHZZbW9zSUdOaGJHeGlZV05yTENCMGFHbHpRWEpuS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJzWlc0Z1BTQnZZbW91YkdWdVozUm9JRDQrUGlBd08xeHVJQ0FnSUNBZ0lDQjJZWElnYm1WM1FYSnlZWGtnUFNCdVpYY2dRWEp5WVhrb2JHVnVLVHRjYmlBZ0lDQWdJQ0FnZG1GeUlHdGxlU0E5SURBN1hHNGdJQ0FnSUNBZ0lHbG1JQ2doZEdocGMwRnlaeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwYzBGeVp5QTlJRzlpYWp0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjNhR2xzWlNBb2EyVjVJRHdnYkdWdUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCdVpYZEJjbkpoZVZ0clpYbGRJRDBnWTJGc2JHSmhZMnN1WTJGc2JDaDBhR2x6UVhKbkxDQnZZbXBiYTJWNVhTd2dhMlY1TENCdlltb3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2EyVjVLeXM3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc1bGQwRnljbUY1TzF4dUlDQWdJSDFjYmx4dWZUdGNiaUpkZlE9PSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFByb21pc2UgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG52YXIgU2ltdWxhdGUgPSByZXF1aXJlKCcuL3NpbXVsYXRlJyk7XG52YXIgc2VsZWN0b3JGaW5kZXIgPSByZXF1aXJlKCcuL3NlbGVjdG9yRmluZGVyJyk7XG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG5cbi8vIHZhciBteUdlbmVyYXRvciA9IG5ldyBDc3NTZWxlY3RvckdlbmVyYXRvcigpO1xudmFyIGltcG9ydGFudFN0ZXBMZW5ndGggPSA1MDA7XG52YXIgc2F2ZUhhbmRsZXJzID0gW107XG52YXIgcmVwb3J0SGFuZGxlcnMgPSBbXTtcbnZhciBsb2FkSGFuZGxlcnMgPSBbXTtcbnZhciBzZXR0aW5nc0xvYWRIYW5kbGVycyA9IFtdO1xuXG5mdW5jdGlvbiBnZXRTY2VuYXJpbyhuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgaWYgKGxvYWRIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHV0bWUuc3RhdGU7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlLnNjZW5hcmlvcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5zY2VuYXJpb3NbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHN0YXRlLnNjZW5hcmlvc1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9hZEhhbmRsZXJzWzBdKG5hbWUsIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG52YXIgdmFsaWRhdGluZyA9IGZhbHNlO1xuXG52YXIgZXZlbnRzID0gW1xuICAgICdjbGljaycsXG4gICAgJ2ZvY3VzJyxcbiAgICAnYmx1cicsXG4gICAgJ2RibGNsaWNrJyxcbiAgICAvLyAnZHJhZycsXG4gICAgLy8gJ2RyYWdlbnRlcicsXG4gICAgLy8gJ2RyYWdsZWF2ZScsXG4gICAgLy8gJ2RyYWdvdmVyJyxcbiAgICAvLyAnZHJhZ3N0YXJ0JyxcbiAgICAvLyAnaW5wdXQnLFxuICAgICdtb3VzZWRvd24nLFxuICAgIC8vICdtb3VzZW1vdmUnLFxuICAgICdtb3VzZWVudGVyJyxcbiAgICAnbW91c2VsZWF2ZScsXG4gICAgJ21vdXNlb3V0JyxcbiAgICAnbW91c2VvdmVyJyxcbiAgICAnbW91c2V1cCcsXG4gICAgJ2NoYW5nZScsXG4gICAgLy8gJ3Jlc2l6ZScsXG4gICAgLy8gJ3Njcm9sbCdcbl07XG5cbmZ1bmN0aW9uIGdldENvbmRpdGlvbnMoc2NlbmFyaW8sIGNvbmRpdGlvblR5cGUpIHtcbiAgdmFyIHNldHVwID0gc2NlbmFyaW9bY29uZGl0aW9uVHlwZV07XG4gIHZhciBzY2VuYXJpb3MgPSBzZXR1cCAmJiBzZXR1cC5zY2VuYXJpb3M7XG4gIC8vIFRPRE86IEJyZWFrIG91dCBpbnRvIGhlbHBlclxuICBpZiAoc2NlbmFyaW9zKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKF8ubWFwKHNjZW5hcmlvcywgZnVuY3Rpb24gKHNjZW5hcmlvTmFtZSkge1xuICAgICAgcmV0dXJuIGdldFNjZW5hcmlvKHNjZW5hcmlvTmFtZSkudGhlbihmdW5jdGlvbiAob3RoZXJTY2VuYXJpbykge1xuICAgICAgICBvdGhlclNjZW5hcmlvID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvdGhlclNjZW5hcmlvKSk7XG4gICAgICAgIHJldHVybiBzZXR1cENvbmRpdGlvbnMob3RoZXJTY2VuYXJpbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHRvUmV0dXJuID0gW107XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvdGhlclNjZW5hcmlvLnN0ZXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0b1JldHVybi5wdXNoKG90aGVyU2NlbmFyaW8uc3RlcHNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdG9SZXR1cm47XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFByZWNvbmRpdGlvbnMgKHNjZW5hcmlvKSB7XG4gIHJldHVybiBnZXRDb25kaXRpb25zKHNjZW5hcmlvLCAnc2V0dXAnKTtcbn1cblxuZnVuY3Rpb24gZ2V0UG9zdGNvbmRpdGlvbnMgKHNjZW5hcmlvKSB7XG4gIHJldHVybiBnZXRDb25kaXRpb25zKHNjZW5hcmlvLCAnY2xlYW51cCcpO1xufVxuXG5mdW5jdGlvbiBfY29uY2F0U2NlbmFyaW9TdGVwTGlzdHMoc3RlcHMpIHtcbiAgICB2YXIgbmV3U3RlcHMgPSBbXTtcbiAgICB2YXIgY3VycmVudFRpbWVzdGFtcDsgLy8gaW5pdGFsaXplZCBieSBmaXJzdCBsaXN0IG9mIHN0ZXBzLlxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3RlcHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGZsYXRTdGVwcyA9IHN0ZXBzW2pdO1xuICAgICAgICBpZiAoaiA+IDApIHtcbiAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgc3RlcHMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RlcCA9IGZsYXRTdGVwc1trXTtcbiAgICAgICAgICAgICAgICB2YXIgZGlmZiA9IGsgPiAwID8gc3RlcC50aW1lU3RhbXAgLSBmbGF0U3RlcHNbayAtIDFdLnRpbWVTdGFtcCA6IDUwO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUaW1lc3RhbXAgKz0gZGlmZjtcbiAgICAgICAgICAgICAgICBmbGF0U3RlcHNba10udGltZVN0YW1wID0gY3VycmVudFRpbWVzdGFtcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lc3RhbXAgPSBmbGF0U3RlcHNbal0udGltZVN0YW1wO1xuICAgICAgICB9XG4gICAgICAgIG5ld1N0ZXBzID0gbmV3U3RlcHMuY29uY2F0KGZsYXRTdGVwcyk7XG4gICAgfVxuICAgIHJldHVybiBuZXdTdGVwcztcbn1cblxuZnVuY3Rpb24gc2V0dXBDb25kaXRpb25zIChzY2VuYXJpbykge1xuICAgIHZhciBwcm9taXNlcyA9IFtdO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgIGdldFByZWNvbmRpdGlvbnMoc2NlbmFyaW8pLFxuICAgICAgICBnZXRQb3N0Y29uZGl0aW9ucyhzY2VuYXJpbylcbiAgICBdKS50aGVuKGZ1bmN0aW9uIChzdGVwQXJyYXlzKSB7XG4gICAgICAgIHZhciBzdGVwTGlzdHMgPSBzdGVwQXJyYXlzWzBdLmNvbmNhdChbc2NlbmFyaW8uc3RlcHNdLCBzdGVwQXJyYXlzWzFdKTtcbiAgICAgICAgc2NlbmFyaW8uc3RlcHMgPSBfY29uY2F0U2NlbmFyaW9TdGVwTGlzdHMoc3RlcExpc3RzKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gcnVuU3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApIHtcbiAgICB1dG1lLmJyb2FkY2FzdCgnUlVOTklOR19TVEVQJyk7XG4gICAgdG9Ta2lwID0gdG9Ta2lwIHx8IHt9O1xuXG4gICAgdmFyIHN0ZXAgPSBzY2VuYXJpby5zdGVwc1tpZHhdO1xuICAgIHZhciBzdGF0ZSA9IHV0bWUuc3RhdGU7XG4gICAgaWYgKHN0ZXAgJiYgc3RhdGUuc3RhdHVzID09ICdQTEFZSU5HJykge1xuICAgICAgICBzdGF0ZS5ydW4uc2NlbmFyaW8gPSBzY2VuYXJpbztcbiAgICAgICAgc3RhdGUucnVuLnN0ZXBJbmRleCA9IGlkeDtcbiAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdsb2FkJykge1xuICAgICAgICAgICAgdmFyIG5ld0xvY2F0aW9uID0gc3RlcC5kYXRhLnVybC5wcm90b2NvbCArIFwiLy9cIiArIHN0ZXAuZGF0YS51cmwuaG9zdDtcbiAgICAgICAgICAgIHZhciBzZWFyY2ggPSBzdGVwLmRhdGEudXJsLnNlYXJjaDtcbiAgICAgICAgICAgIHZhciBoYXNoID0gc3RlcC5kYXRhLnVybC5oYXNoO1xuXG4gICAgICAgICAgICBpZiAoc2VhcmNoICYmICFzZWFyY2guY2hhckF0KFwiP1wiKSkge1xuICAgICAgICAgICAgICAgIHNlYXJjaCA9IFwiP1wiICsgc2VhcmNoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlzU2FtZVVSTCA9IChsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5zZWFyY2gpID09PSAobmV3TG9jYXRpb24gKyBzZWFyY2gpO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlcGxhY2UobmV3TG9jYXRpb24gKyBoYXNoICsgc2VhcmNoKTtcblxuICAgICAgICAgICAgaWYgKHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwidmVyYm9zZVwiKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygobG9jYXRpb24ucHJvdG9jb2wgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24uc2VhcmNoKSk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKChzdGVwLmRhdGEudXJsLnByb3RvY29sICsgc3RlcC5kYXRhLnVybC5ob3N0ICsgc3RlcC5kYXRhLnVybC5zZWFyY2gpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBub3QgY2hhbmdlZCB0aGUgYWN0dWFsIGxvY2F0aW9uLCB0aGVuIHRoZSBsb2NhdGlvbi5yZXBsYWNlXG4gICAgICAgICAgICAvLyB3aWxsIG5vdCBnbyBhbnl3aGVyZVxuICAgICAgICAgICAgaWYgKGlzU2FtZVVSTCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndGltZW91dCcpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5hdXRvUnVuKSB7XG4gICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCBzdGVwLmRhdGEuYW1vdW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBsb2NhdG9yID0gc3RlcC5kYXRhLmxvY2F0b3I7XG4gICAgICAgICAgICB2YXIgc3RlcHMgPSBzY2VuYXJpby5zdGVwcztcbiAgICAgICAgICAgIHZhciB1bmlxdWVJZCA9IGdldFVuaXF1ZUlkRnJvbVN0ZXAoc3RlcCk7XG5cbiAgICAgICAgICAgIC8vIHRyeSB0byBnZXQgcmlkIG9mIHVubmVjZXNzYXJ5IHN0ZXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRvU2tpcFt1bmlxdWVJZF0gPT0gJ3VuZGVmaW5lZCcgJiYgdXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoXCJydW5uZXIuc3BlZWRcIikgIT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICB2YXIgZGlmZjtcbiAgICAgICAgICAgICAgdmFyIGlnbm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICBmb3IgKHZhciBqID0gc3RlcHMubGVuZ3RoIC0gMTsgaiA+IGlkeDsgai0tKSB7XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyU3RlcCA9IHN0ZXBzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclVuaXF1ZUlkID0gZ2V0VW5pcXVlSWRGcm9tU3RlcChvdGhlclN0ZXApO1xuICAgICAgICAgICAgICAgIGlmICh1bmlxdWVJZCA9PT0gb3RoZXJVbmlxdWVJZCkge1xuICAgICAgICAgICAgICAgICAgaWYgKCFkaWZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IChvdGhlclN0ZXAudGltZVN0YW1wIC0gc3RlcC50aW1lU3RhbXApO1xuICAgICAgICAgICAgICAgICAgICAgIGlnbm9yZSA9ICFpc0ltcG9ydGFudFN0ZXAob3RoZXJTdGVwKSAmJiBkaWZmIDwgaW1wb3J0YW50U3RlcExlbmd0aDtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbnRlcmFjdGl2ZVN0ZXAob3RoZXJTdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlnbm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHRvU2tpcFt1bmlxdWVJZF0gPSBpZ25vcmU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlJ3JlIHNraXBwaW5nIHRoaXMgZWxlbWVudFxuICAgICAgICAgICAgaWYgKHRvU2tpcFtnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApXSkge1xuICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpbmRFbGVtZW50V2l0aExvY2F0b3Ioc2NlbmFyaW8sIHN0ZXAsIGxvY2F0b3IsIGdldFRpbWVvdXQoc2NlbmFyaW8sIGlkeCkpLnRoZW4oZnVuY3Rpb24gKGVsZXMpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBlbGUgPSBlbGVzWzBdO1xuICAgICAgICAgICAgICAgICAgdmFyIHRhZ05hbWUgPSBlbGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgdmFyIHN1cHBvcnRzSW5wdXRFdmVudCA9IHRhZ05hbWUgPT09ICdpbnB1dCcgfHwgdGFnTmFtZSA9PT0gJ3RleHRhcmVhJyB8fCBlbGUuZ2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnKTtcblxuICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50cy5pbmRleE9mKHN0ZXAuZXZlbnROYW1lKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmRhdGEuYnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy53aGljaCA9IG9wdGlvbnMuYnV0dG9uID0gc3RlcC5kYXRhLmJ1dHRvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdTaW11bGF0aW5nICcgKyBzdGVwLmV2ZW50TmFtZSArICcgb24gZWxlbWVudCAnLCBlbGUsIGxvY2F0b3Iuc2VsZWN0b3JzWzBdLCBcIiBmb3Igc3RlcCBcIiArIGlkeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAnY2xpY2snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJChlbGUpLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKHN0ZXAuZXZlbnROYW1lID09ICdmb2N1cycgfHwgc3RlcC5ldmVudE5hbWUgPT0gJ2JsdXInKSAmJiBlbGVbc3RlcC5ldmVudE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZWxlW3N0ZXAuZXZlbnROYW1lXSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlW3N0ZXAuZXZlbnROYW1lXShlbGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGVwLmRhdGEudmFsdWUgIT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2Ygc3RlcC5kYXRhLmF0dHJpYnV0ZXMgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciB0b0FwcGx5ID0gc3RlcC5kYXRhLmF0dHJpYnV0ZXMgPyBzdGVwLmRhdGEuYXR0cmlidXRlcyA6IHsgXCJ2YWx1ZVwiOiBzdGVwLmRhdGEudmFsdWUgfTtcbiAgICAgICAgICAgICAgICAgICAgICBfLmV4dGVuZChlbGUsIHRvQXBwbHkpO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgdGhlIGlucHV0IGV2ZW50LlxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzdXBwb3J0c0lucHV0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2NoYW5nZScpOyAvLyBUaGlzIHNob3VsZCBiZSBmaXJlZCBhZnRlciBhIGJsdXIgZXZlbnQuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdrZXlwcmVzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RlcC5kYXRhLmtleUNvZGUpO1xuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5rZXlkb3duKGVsZSwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5cHJlc3MoZWxlLCBrZXkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGVsZS52YWx1ZSA9IHN0ZXAuZGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnY2hhbmdlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5dXAoZWxlLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNJbnB1dEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnICYmIHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KCd2ZXJib3NlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coJ1ZhbGlkYXRlOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICArIFwiIGNvbnRhaW5zIHRleHQgJ1wiICArIHN0ZXAuZGF0YS50ZXh0ICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlZhbGlkYXRlOiBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8oZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRFcnJvcihcIkZhaWxlZCBvbiBzdGVwOiBcIiArIGlkeCArIFwiICBFdmVudDogXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiIFJlYXNvbjogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8oZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldCgndmVyYm9zZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd2FpdEZvckFuZ3VsYXIocm9vdFNlbGVjdG9yKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihyb290U2VsZWN0b3IpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhbmd1bGFyIGNvdWxkIG5vdCBiZSBmb3VuZCBvbiB0aGUgd2luZG93Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5nZXRUZXN0YWJpbGl0eSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZ2V0VGVzdGFiaWxpdHkoZWwpLndoZW5TdGFibGUocmVzb2x2ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhci5lbGVtZW50KGVsKS5pbmplY3RvcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncm9vdCBlbGVtZW50ICgnICsgcm9vdFNlbGVjdG9yICsgJykgaGFzIG5vIGluamVjdG9yLicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJyB0aGlzIG1heSBtZWFuIGl0IGlzIG5vdCBpbnNpZGUgbmctYXBwLicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZWwpLmluamVjdG9yKCkuZ2V0KCckYnJvd3NlcicpLlxuICAgICAgICAgICAgICAgIG5vdGlmeVdoZW5Ob091dHN0YW5kaW5nUmVxdWVzdHMocmVzb2x2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaXNJbXBvcnRhbnRTdGVwKHN0ZXApIHtcbiAgICByZXR1cm4gc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlbGVhdmUnICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZW91dCcgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlZW50ZXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZW92ZXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdibHVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnZm9jdXMnO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gc3RlcCBpcyBzb21lIHNvcnQgb2YgdXNlciBpbnRlcmFjdGlvblxuICovXG5mdW5jdGlvbiBpc0ludGVyYWN0aXZlU3RlcChzdGVwKSB7XG4gICAgdmFyIGV2dCA9IHN0ZXAuZXZlbnROYW1lO1xuXG4gICAgLypcbiAgICAgICAvLyBJbnRlcmVzdGluZyBub3RlLCBkb2luZyB0aGUgZm9sbG93aW5nIHdhcyBjYXVzaW5nIHRoaXMgZnVuY3Rpb24gdG8gcmV0dXJuIHVuZGVmaW5lZC5cbiAgICAgICByZXR1cm5cbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZVwiKSAhPT0gMCB8fFxuICAgICAgICAgICBldnQuaW5kZXhPZihcIm1vdXNlZG93blwiKSA9PT0gMCB8fFxuICAgICAgICAgICBldnQuaW5kZXhPZihcIm1vdXNldXBcIikgPT09IDA7XG5cbiAgICAgICAvLyBJdHMgYmVjYXVzZSB0aGUgY29uZGl0aW9ucyB3ZXJlIG5vdCBvbiB0aGUgc2FtZSBsaW5lIGFzIHRoZSByZXR1cm4gc3RhdGVtZW50XG4gICAgKi9cbiAgICByZXR1cm4gZXZ0LmluZGV4T2YoXCJtb3VzZVwiKSAhPT0gMCB8fCBldnQuaW5kZXhPZihcIm1vdXNlZG93blwiKSA9PT0gMCB8fCBldnQuaW5kZXhPZihcIm1vdXNldXBcIikgPT09IDA7XG59XG5cbmZ1bmN0aW9uIGZpbmRFbGVtZW50V2l0aExvY2F0b3Ioc2NlbmFyaW8sIHN0ZXAsIGxvY2F0b3IsIHRpbWVvdXQsIHRleHRUb0NoZWNrKSB7XG4gICAgdmFyIHN0YXJ0ZWQ7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gdHJ5RmluZCgpIHtcbiAgICAgICAgICAgIGlmICghc3RhcnRlZCkge1xuICAgICAgICAgICAgICAgIHN0YXJ0ZWQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVsZXM7XG4gICAgICAgICAgICB2YXIgZm91bmRUb29NYW55ID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZm91bmRWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGZvdW5kRGlmZmVyZW50VGV4dCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHNlbGVjdG9yc1RvVGVzdCA9IGxvY2F0b3Iuc2VsZWN0b3JzLnNsaWNlKDApO1xuICAgICAgICAgICAgdmFyIHRleHRUb0NoZWNrID0gc3RlcC5kYXRhLnRleHQ7XG4gICAgICAgICAgICB2YXIgY29tcGFyaXNvbiA9IHN0ZXAuZGF0YS5jb21wYXJpc29uIHx8IFwiZXF1YWxzXCI7XG4gICAgICAgICAgICBzZWxlY3RvcnNUb1Rlc3QudW5zaGlmdCgnW2RhdGEtdW5pcXVlLWlkPVwiJyArIGxvY2F0b3IudW5pcXVlSWQgKyAnXCJdJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9yc1RvVGVzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1RvVGVzdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IFwiOnZpc2libGVcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxlcyA9ICQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGV4dFRvQ2hlY2sgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdUZXh0ID0gJChlbGVzWzBdKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGNvbXBhcmlzb24gPT09ICdlcXVhbHMnICYmIG5ld1RleHQgPT09IHRleHRUb0NoZWNrKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjb21wYXJpc29uID09PSAnY29udGFpbnMnICYmIG5ld1RleHQuaW5kZXhPZih0ZXh0VG9DaGVjaykgPj0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmREaWZmZXJlbnRUZXh0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlcy5hdHRyKCdkYXRhLXVuaXF1ZS1pZCcsIGxvY2F0b3IudW5pcXVlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRUb29NYW55ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmb3VuZFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShlbGVzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApICYmIChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0ZWQpIDwgdGltZW91dCAqIDUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIDUwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kVG9vTWFueSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogRm91bmQgVG9vIE1hbnkgRWxlbWVudHNcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZvdW5kRGlmZmVyZW50VGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogVGV4dCBkb2Vzbid0IG1hdGNoLiAgXFxuRXhwZWN0ZWQ6XFxuXCIgKyB0ZXh0VG9DaGVjayArIFwiXFxuYnV0IHdhc1xcblwiICsgZWxlcy50ZXh0KCkgKyBcIlxcblwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBObyBlbGVtZW50cyBmb3VuZFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcGVlZCA9IHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwicnVubmVyLnNwZWVkXCIpO1xuICAgICAgICB2YXIgbGltaXQgPSBpbXBvcnRhbnRTdGVwTGVuZ3RoIC8gKHNwZWVkID09PSAncmVhbHRpbWUnID8gJzEnIDogc3BlZWQpO1xuICAgICAgICBpZiAoZ2xvYmFsLmFuZ3VsYXIpIHtcbiAgICAgICAgICAgIHdhaXRGb3JBbmd1bGFyKCdbbmctYXBwXScpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGlmIChzcGVlZCA9PT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgICB0cnlGaW5kKCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiBzcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIHRpbWVvdXQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiBzcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lb3V0KHNjZW5hcmlvLCBpZHgpIHtcbiAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgc3RlcCBpcyBhIHZhbGlkYXRlIHN0ZXAsIHRoZW4ganVzdCBtb3ZlIG9uLCBhbmQgcHJldGVuZCBpdCBpc24ndCB0aGVyZVxuICAgICAgICAvLyBPciBpZiBpdCBpcyBhIHNlcmllcyBvZiBrZXlzLCB0aGVuIGdvXG4gICAgICAgIGlmIChzY2VuYXJpby5zdGVwc1tpZHggLSAxXS5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5hcmlvLnN0ZXBzW2lkeF0udGltZVN0YW1wIC0gc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0udGltZVN0YW1wO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCB0aW1lb3V0KSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGFyZW4ndCBnb2luZyB0byBvdmVyZmxvdyB0aGUgY2FsbCBzdGFjay5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHMubGVuZ3RoID4gKGlkeCArIDEpKSB7XG4gICAgICAgICAgICBydW5TdGVwKHNjZW5hcmlvLCBpZHggKyAxLCB0b1NraXApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9LCB0aW1lb3V0IHx8IDApO1xufVxuXG5mdW5jdGlvbiBmcmFnbWVudEZyb21TdHJpbmcoc3RySFRNTCkge1xuICAgIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICB0ZW1wLmlubmVySFRNTCA9IHN0ckhUTUw7XG4gICAgLy8gY29uc29sZS5sb2codGVtcC5pbm5lckhUTUwpO1xuICAgIHJldHVybiB0ZW1wLmNvbnRlbnQgPyB0ZW1wLmNvbnRlbnQgOiB0ZW1wO1xufVxuXG5mdW5jdGlvbiBnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApIHtcbiAgICByZXR1cm4gc3RlcCAmJiBzdGVwLmRhdGEgJiYgc3RlcC5kYXRhLmxvY2F0b3IgJiYgc3RlcC5kYXRhLmxvY2F0b3IudW5pcXVlSWQ7XG59XG5cbmZ1bmN0aW9uIGZpbHRlckV4dHJhTG9hZHMoc3RlcHMpIHtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICB2YXIgc2VlbkxvYWQgPSBmYWxzZTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGVwcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpc0xvYWQgPSBzdGVwc1tpXS5ldmVudE5hbWUgPT09ICdsb2FkJztcbiAgICBpZiAoIXNlZW5Mb2FkIHx8ICFpc0xvYWQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHN0ZXBzW2ldKTtcbiAgICAgIHNlZW5Mb2FkID0gc2VlbkxvYWQgfHwgaXNMb2FkO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxudmFyIGd1aWQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIHM0KCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAgICAgICAgIC50b1N0cmluZygxNilcbiAgICAgICAgICAgIC5zdWJzdHJpbmcoMSk7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICtcbiAgICAgICAgICAgIHM0KCkgKyAnLScgKyBzNCgpICsgczQoKSArIHM0KCk7XG4gICAgfTtcbn0pKCk7XG5cbnZhciBsaXN0ZW5lcnMgPSBbXTtcbnZhciBzdGF0ZTtcbnZhciB1dG1lID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNjZW5hcmlvID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3NjZW5hcmlvJyk7XG4gICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlID0gdXRtZS5zdGF0ZSA9IHV0bWUubG9hZFN0YXRlRnJvbVN0b3JhZ2UoKTtcbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0lOSVRJQUxJWkVEJyk7XG5cbiAgICAgICAgcmV0dXJuIHV0bWUubG9hZFNldHRpbmdzKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgc3RhdGUudGVzdFNlcnZlciA9IGdldFBhcmFtZXRlckJ5TmFtZShcInV0bWVfdGVzdF9zZXJ2ZXJcIik7XG4gICAgICAgICAgICAgIHN0YXRlLmF1dG9SdW4gPSB0cnVlO1xuICAgICAgICAgICAgICB1dG1lLnJ1blNjZW5hcmlvKHNjZW5hcmlvKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiUExBWUlOR1wiKSB7XG4gICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHN0YXRlLnJ1bi5zY2VuYXJpbywgc3RhdGUucnVuLnN0ZXBJbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFzdGF0ZS5zdGF0dXMgfHwgc3RhdGUuc3RhdHVzID09PSAnSU5JVElBTElaSU5HJykge1xuICAgICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIkxPQURFRFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGJyb2FkY2FzdDogZnVuY3Rpb24gKGV2dCwgZXZ0RGF0YSkge1xuICAgICAgICBpZiAobGlzdGVuZXJzICYmIGxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzW2ldKGV2dCwgZXZ0RGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN0YXJ0UmVjb3JkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgIT0gJ1JFQ09SRElORycpIHtcbiAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9ICdSRUNPUkRJTkcnO1xuICAgICAgICAgICAgc3RhdGUuc3RlcHMgPSBbXTtcbiAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0YXJ0ZWRcIik7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUQVJURUQnKTtcbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudChcImxvYWRcIiwge1xuICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogd2luZG93LmxvY2F0aW9uLnByb3RvY29sLFxuICAgICAgICAgICAgICAgICAgICBob3N0OiB3aW5kb3cubG9jYXRpb24uaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBoYXNoOiB3aW5kb3cubG9jYXRpb24uaGFzaFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJ1blNjZW5hcmlvOiBmdW5jdGlvbiAobmFtZSwgY29uZmlnKSB7XG4gICAgICAgIHZhciB0b1J1biA9IG5hbWUgfHwgcHJvbXB0KCdTY2VuYXJpbyB0byBydW4nKTtcbiAgICAgICAgdmFyIGF1dG9SdW4gPSAhbmFtZSA/IHByb21wdCgnV291bGQgeW91IGxpa2UgdG8gc3RlcCB0aHJvdWdoIGVhY2ggc3RlcCAoeXxuKT8nKSAhPSAneScgOiB0cnVlO1xuICAgICAgICByZXR1cm4gZ2V0U2NlbmFyaW8odG9SdW4pLnRoZW4oZnVuY3Rpb24gKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBzY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2NlbmFyaW8pKTtcbiAgICAgICAgICAgIHNldHVwQ29uZGl0aW9ucyhzY2VuYXJpbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUucnVuID0ge307XG4gICAgICAgICAgICAgICAgc3RhdGUuYXV0b1J1biA9IGF1dG9SdW4gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJQTEFZSU5HXCI7XG5cbiAgICAgICAgICAgICAgICBzY2VuYXJpby5zdGVwcyA9IGZpbHRlckV4dHJhTG9hZHMoc2NlbmFyaW8uc3RlcHMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwidmVyYm9zZVwiKSkge1xuICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdGFydGluZyBTY2VuYXJpbyAnXCIgKyBuYW1lICsgXCInXCIsIHNjZW5hcmlvKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUExBWUJBQ0tfU1RBUlRFRCcpO1xuXG4gICAgICAgICAgICAgICAgcnVuU3RlcChzY2VuYXJpbywgMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBydW5OZXh0U3RlcDogcnVuTmV4dFN0ZXAsXG4gICAgc3RvcFNjZW5hcmlvOiBmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICB2YXIgc2NlbmFyaW8gPSBzdGF0ZS5ydW4gJiYgc3RhdGUucnVuLnNjZW5hcmlvO1xuICAgICAgICBkZWxldGUgc3RhdGUucnVuO1xuICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIkxPQURFRFwiO1xuICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUExBWUJBQ0tfU1RPUFBFRCcpO1xuXG4gICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInZlcmJvc2VcIikpIHtcbiAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0b3BwaW5nIFNjZW5hcmlvXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydFN1Y2Nlc3MoXCJbU1VDQ0VTU10gU2NlbmFyaW8gJ1wiICsgc2NlbmFyaW8ubmFtZSArIFwiJyBDb21wbGV0ZWQhXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0b3BwaW5nIG9uIHBhZ2UgXCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRFcnJvcihcIltGQUlMVVJFXSBTY2VuYXJpbyAnXCIgKyBzY2VuYXJpby5uYW1lICsgXCInIFN0b3BwZWQhXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSB0ZW1wb3JhcnkgZWxlbWVudCBsb2NhdG9yLCBmb3IgdXNlIHdpdGggZmluYWxpemVMb2NhdG9yXG4gICAgICovXG4gICAgY3JlYXRlRWxlbWVudExvY2F0b3I6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciB1bmlxdWVJZCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS11bmlxdWUtaWRcIikgfHwgZ3VpZCgpO1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShcImRhdGEtdW5pcXVlLWlkXCIsIHVuaXF1ZUlkKTtcblxuICAgICAgICB2YXIgZWxlSHRtbCA9IGVsZW1lbnQuY2xvbmVOb2RlKCkub3V0ZXJIVE1MO1xuICAgICAgICB2YXIgZWxlU2VsZWN0b3JzID0gW107XG4gICAgICAgIGlmIChlbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PSAnQk9EWScgfHwgZWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT0gJ0hUTUwnKSB7XG4gICAgICAgICAgICBlbGVTZWxlY3RvcnMgPSBbZWxlbWVudC50YWdOYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZVNlbGVjdG9ycyA9IHNlbGVjdG9yRmluZGVyKGVsZW1lbnQsIGRvY3VtZW50LmJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1bmlxdWVJZDogdW5pcXVlSWQsXG4gICAgICAgICAgICBzZWxlY3RvcnM6IGVsZVNlbGVjdG9yc1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICByZWdpc3RlckV2ZW50OiBmdW5jdGlvbiAoZXZlbnROYW1lLCBkYXRhLCBpZHgpIHtcbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSB8fCB1dG1lLmlzVmFsaWRhdGluZygpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlkeCA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGlkeCA9IHV0bWUuc3RhdGUuc3RlcHMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuc3RlcHNbaWR4XSA9IHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWU6IGV2ZW50TmFtZSxcbiAgICAgICAgICAgICAgICB0aW1lU3RhbXA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnRVZFTlRfUkVHSVNURVJFRCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRMb2c6IGZ1bmN0aW9uIChsb2csIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5sb2cobG9nLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydEVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5lcnJvcihlcnJvciwgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRTdWNjZXNzOiBmdW5jdGlvbiAobWVzc2FnZSwgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLnN1Y2Nlc3MobWVzc2FnZSwgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZWdpc3Rlckxpc3RlbmVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBsaXN0ZW5lcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyU2F2ZUhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHNhdmVIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJSZXBvcnRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICByZXBvcnRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJMb2FkSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgbG9hZEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclNldHRpbmdzTG9hZEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHNldHRpbmdzTG9hZEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICBpc1JlY29yZGluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiUkVDT1JESU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgaXNQbGF5aW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJQTEFZSU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgaXNWYWxpZGF0aW5nOiBmdW5jdGlvbih2YWxpZGF0aW5nKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsaWRhdGluZyAhPT0gJ3VuZGVmaW5lZCcgJiYgKHV0bWUuaXNSZWNvcmRpbmcoKSB8fCB1dG1lLmlzVmFsaWRhdGluZygpKSkge1xuICAgICAgICAgICAgdXRtZS5zdGF0ZS5zdGF0dXMgPSB2YWxpZGF0aW5nID8gXCJWQUxJREFUSU5HXCIgOiBcIlJFQ09SRElOR1wiO1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1ZBTElEQVRJT05fQ0hBTkdFRCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiVkFMSURBVElOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIHN0b3BSZWNvcmRpbmc6IGZ1bmN0aW9uIChpbmZvKSB7XG4gICAgICAgIGlmIChpbmZvICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdmFyIG5ld1NjZW5hcmlvID0ge1xuICAgICAgICAgICAgICAgIHN0ZXBzOiBzdGF0ZS5zdGVwc1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgXy5leHRlbmQobmV3U2NlbmFyaW8sIGluZm8pO1xuXG4gICAgICAgICAgICBpZiAoIW5ld1NjZW5hcmlvLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBuZXdTY2VuYXJpby5uYW1lID0gcHJvbXB0KCdFbnRlciBzY2VuYXJpbyBuYW1lJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChuZXdTY2VuYXJpby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2NlbmFyaW9zLnB1c2gobmV3U2NlbmFyaW8pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVIYW5kbGVycyAmJiBzYXZlSGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2F2ZUhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlSGFuZGxlcnNbaV0obmV3U2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuc3RhdHVzID0gJ0xPQURFRCc7XG5cbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1JFQ09SRElOR19TVE9QUEVEJyk7XG5cbiAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJSZWNvcmRpbmcgU3RvcHBlZFwiLCBuZXdTY2VuYXJpbyk7XG4gICAgfSxcblxuICAgIGxvYWRTZXR0aW5nczogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSB1dG1lLnN0YXRlLnNldHRpbmdzID0gdXRtZS5zdGF0ZS5zZXR0aW5ncyB8fCBuZXcgU2V0dGluZ3Moe1xuICAgICAgICAgIFwicnVubmVyLnNwZWVkXCI6IFwiMTBcIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNldHRpbmdzTG9hZEhhbmRsZXJzLmxlbmd0aCA+IDAgJiYgIXV0bWUuaXNSZWNvcmRpbmcoKSAmJiAhdXRtZS5pc1BsYXlpbmcoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5nc0xvYWRIYW5kbGVyc1swXShmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5zZXREZWZhdWx0cyhyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShzZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbG9hZFN0YXRlRnJvbVN0b3JhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHV0bWVTdGF0ZVN0ciA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd1dG1lJyk7XG4gICAgICAgIGlmICh1dG1lU3RhdGVTdHIpIHtcbiAgICAgICAgICAgIHN0YXRlID0gSlNPTi5wYXJzZSh1dG1lU3RhdGVTdHIpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdGUuc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3U2V0dGluZ3MgPSBuZXcgU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICBuZXdTZXR0aW5ncy5zZXR0aW5ncyA9IHN0YXRlLnNldHRpbmdzLnNldHRpbmdzO1xuICAgICAgICAgICAgICAgIG5ld1NldHRpbmdzLnNldHRpbmdzID0gc3RhdGUuc2V0dGluZ3MuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICAgICAgICAgIHN0YXRlLnNldHRpbmdzID0gbmV3U2V0dGluZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwiSU5JVElBTElaSU5HXCIsXG4gICAgICAgICAgICAgICAgc2NlbmFyaW9zOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSxcblxuICAgIHNhdmVTdGF0ZVRvU3RvcmFnZTogZnVuY3Rpb24gKHV0bWVTdGF0ZSkge1xuICAgICAgICBpZiAodXRtZVN0YXRlKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndXRtZScsIEpTT04uc3RyaW5naWZ5KHV0bWVTdGF0ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3V0bWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1bmxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXRtZS5zYXZlU3RhdGVUb1N0b3JhZ2Uoc3RhdGUpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHRvZ2dsZUhpZ2hsaWdodChlbGUsIHZhbHVlKSB7XG4gICAgJChlbGUpLnRvZ2dsZUNsYXNzKCd1dG1lLXZlcmlmeScsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gdG9nZ2xlUmVhZHkoZWxlLCB2YWx1ZSkge1xuICAgICQoZWxlKS50b2dnbGVDbGFzcygndXRtZS1yZWFkeScsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBJZiB5b3UgY2xpY2sgb24gYSBzcGFuIGluIGEgbGFiZWwsIHRoZSBzcGFuIHdpbGwgY2xpY2ssXG4gKiB0aGVuIHRoZSBicm93c2VyIHdpbGwgZmlyZSB0aGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBpbnB1dCBjb250YWluZWQgd2l0aGluIHRoZSBzcGFuLFxuICogU28sIHdlIG9ubHkgd2FudCB0byB0cmFjayB0aGUgaW5wdXQgY2xpY2tzLlxuICovXG5mdW5jdGlvbiBpc05vdEluTGFiZWxPclZhbGlkKGVsZSkge1xuICAgIHJldHVybiAkKGVsZSkucGFyZW50cygnbGFiZWwnKS5sZW5ndGggPT0gMCB8fFxuICAgICAgICAgIGVsZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09ICdpbnB1dCc7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGl0IGlzIGFuIGVsZW1lbnQgdGhhdCBzaG91bGQgYmUgaWdub3JlZFxuICovXG5mdW5jdGlvbiBpc0lnbm9yZWRFbGVtZW50KGVsZSkge1xuICByZXR1cm4gIWVsZS5oYXNBdHRyaWJ1dGUgfHwgZWxlLmhhc0F0dHJpYnV0ZSgnZGF0YS1pZ25vcmUnKSB8fCAkKGVsZSkucGFyZW50cyhcIltkYXRhLWlnbm9yZV1cIikubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIGV2ZW50IHNob3VsZCBiZSByZWNvcmRlZCBvbiB0aGUgZ2l2ZW4gZWxlbWVudFxuICovXG5mdW5jdGlvbiBzaG91bGRSZWNvcmRFdmVudChlbGUsIGV2dCkge1xuICB2YXIgc2V0dGluZyA9IHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwicmVjb3JkZXIuZXZlbnRzLlwiICsgZXZ0KTtcbiAgdmFyIGlzU2V0dGluZ1RydWUgPSAoc2V0dGluZyA9PT0gdHJ1ZSB8fCBzZXR0aW5nID09PSAndHJ1ZScgfHwgdHlwZW9mIHNldHRpbmcgPT09ICd1bmRlZmluZWQnKTtcbiAgcmV0dXJuIHV0bWUuaXNSZWNvcmRpbmcoKSAmJiBpc1NldHRpbmdUcnVlICYmIGlzTm90SW5MYWJlbE9yVmFsaWQoZWxlKTtcbn1cblxudmFyIHRpbWVycyA9IFtdO1xuXG5mdW5jdGlvbiBpbml0RXZlbnRIYW5kbGVycygpIHtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRzW2ldLCAoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFpc0lnbm9yZWRFbGVtZW50KGUudGFyZ2V0KSAmJiB1dG1lLmlzUmVjb3JkaW5nKCkpIHtcblxuICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSB1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdGltZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdtb3VzZW92ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGUudGFyZ2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXI6IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlYWR5KGUudGFyZ2V0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnbW91c2VvdXQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGltZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGltZXJzW2ldLmVsZW1lbnQgPT0gZS50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXJzW2ldLnRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWFkeShlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzaG91bGRSZWNvcmRFdmVudChlLnRhcmdldCwgZXZ0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggfHwgZS5idXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5idXR0b24gPSBlLndoaWNoIHx8IGUuYnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MuYXR0cmlidXRlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhbHVlXCIgOiBlLnRhcmdldC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImNoZWNrZWRcIjogZS50YXJnZXQuY2hlY2tlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNlbGVjdGVkXCI6IGUudGFyZ2V0LnNlbGVjdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudChldnQsIGFyZ3MsIGlkeCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gSEFDSyBmb3IgdGVzdGluZ1xuICAgICAgICAgICAgKHV0bWUuZXZlbnRMaXN0ZW5lcnMgPSB1dG1lLmV2ZW50TGlzdGVuZXJzIHx8IHt9KVtldnRdID0gaGFuZGxlcjtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgICAgICB9KShldmVudHNbaV0pLCB0cnVlKTtcbiAgICB9XG5cbiAgICB2YXIgX3RvX2FzY2lpID0ge1xuICAgICAgICAnMTg4JzogJzQ0JyxcbiAgICAgICAgJzE4OSc6ICc0NScsXG4gICAgICAgICcxOTAnOiAnNDYnLFxuICAgICAgICAnMTkxJzogJzQ3JyxcbiAgICAgICAgJzE5Mic6ICc5NicsXG4gICAgICAgICcyMjAnOiAnOTInLFxuICAgICAgICAnMjIyJzogJzM5JyxcbiAgICAgICAgJzIyMSc6ICc5MycsXG4gICAgICAgICcyMTknOiAnOTEnLFxuICAgICAgICAnMTczJzogJzQ1JyxcbiAgICAgICAgJzE4Nyc6ICc2MScsIC8vSUUgS2V5IGNvZGVzXG4gICAgICAgICcxODYnOiAnNTknXG4gICAgfTtcblxuICAgIHZhciBzaGlmdFVwcyA9IHtcbiAgICAgICAgXCI5NlwiOiBcIn5cIixcbiAgICAgICAgXCI0OVwiOiBcIiFcIixcbiAgICAgICAgXCI1MFwiOiBcIkBcIixcbiAgICAgICAgXCI1MVwiOiBcIiNcIixcbiAgICAgICAgXCI1MlwiOiBcIiRcIixcbiAgICAgICAgXCI1M1wiOiBcIiVcIixcbiAgICAgICAgXCI1NFwiOiBcIl5cIixcbiAgICAgICAgXCI1NVwiOiBcIiZcIixcbiAgICAgICAgXCI1NlwiOiBcIipcIixcbiAgICAgICAgXCI1N1wiOiBcIihcIixcbiAgICAgICAgXCI0OFwiOiBcIilcIixcbiAgICAgICAgXCI0NVwiOiBcIl9cIixcbiAgICAgICAgXCI2MVwiOiBcIitcIixcbiAgICAgICAgXCI5MVwiOiBcIntcIixcbiAgICAgICAgXCI5M1wiOiBcIn1cIixcbiAgICAgICAgXCI5MlwiOiBcInxcIixcbiAgICAgICAgXCI1OVwiOiBcIjpcIixcbiAgICAgICAgXCIzOVwiOiBcIlxcXCJcIixcbiAgICAgICAgXCI0NFwiOiBcIjxcIixcbiAgICAgICAgXCI0NlwiOiBcIj5cIixcbiAgICAgICAgXCI0N1wiOiBcIj9cIlxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBrZXlQcmVzc0hhbmRsZXIgKGUpIHtcbiAgICAgICAgaWYgKGUuaXNUcmlnZ2VyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmICghaXNJZ25vcmVkRWxlbWVudChlLnRhcmdldCkgJiYgc2hvdWxkUmVjb3JkRXZlbnQoZS50YXJnZXQsIFwia2V5cHJlc3NcIikpIHtcbiAgICAgICAgICAgIHZhciBjID0gZS53aGljaDtcblxuICAgICAgICAgICAgLy8gVE9ETzogRG9lc24ndCB3b3JrIHdpdGggY2FwcyBsb2NrXG4gICAgICAgICAgICAvL25vcm1hbGl6ZSBrZXlDb2RlXG4gICAgICAgICAgICBpZiAoX3RvX2FzY2lpLmhhc093blByb3BlcnR5KGMpKSB7XG4gICAgICAgICAgICAgICAgYyA9IF90b19hc2NpaVtjXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFlLnNoaWZ0S2V5ICYmIChjID49IDY1ICYmIGMgPD0gOTApKSB7XG4gICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyArIDMyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBzaGlmdFVwcy5oYXNPd25Qcm9wZXJ0eShjKSkge1xuICAgICAgICAgICAgICAgIC8vZ2V0IHNoaWZ0ZWQga2V5Q29kZSB2YWx1ZVxuICAgICAgICAgICAgICAgIGMgPSBzaGlmdFVwc1tjXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudCgna2V5cHJlc3MnLCB7XG4gICAgICAgICAgICAgICAgbG9jYXRvcjogdXRtZS5jcmVhdGVFbGVtZW50TG9jYXRvcihlLnRhcmdldCksXG4gICAgICAgICAgICAgICAga2V5OiBjLFxuICAgICAgICAgICAgICAgIHByZXZWYWx1ZTogZS50YXJnZXQudmFsdWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGUudGFyZ2V0LnZhbHVlICsgYyxcbiAgICAgICAgICAgICAgICBrZXlDb2RlOiBlLmtleUNvZGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCBrZXlQcmVzc0hhbmRsZXIsIHRydWUpO1xuXG4gICAgLy8gSEFDSyBmb3IgdGVzdGluZ1xuICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbJ2tleXByZXNzJ10gPSBrZXlQcmVzc0hhbmRsZXI7XG59XG5cbmZ1bmN0aW9uIGdldFBhcmFtZXRlckJ5TmFtZShuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKTtcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKSxcbiAgICAgICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKTtcbiAgICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IFwiXCIgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcbn1cblxuZnVuY3Rpb24gYm9vdHN0cmFwVXRtZSgpIHtcbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gXCJjb21wbGV0ZVwiKSB7XG4gICAgdXRtZS5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgaW5pdEV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpKSB7XG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoXCJsb2FkXCIsIHtcbiAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogd2luZG93LmxvY2F0aW9uLmhvc3QsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogd2luZG93LmxvY2F0aW9uLnNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgaGFzaDogd2luZG93LmxvY2F0aW9uLmhhc2hcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmJvb3RzdHJhcFV0bWUoKTtcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3JlYWR5c3RhdGVjaGFuZ2UnLCBib290c3RyYXBVdG1lKTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3VubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICB1dG1lLnVubG9hZCgpO1xufSwgdHJ1ZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICB1dG1lLnJlcG9ydExvZyhcIlNjcmlwdCBFcnJvcjogXCIgKyBlcnIubWVzc2FnZSArIFwiOlwiICsgZXJyLnVybCArIFwiLFwiICsgZXJyLmxpbmUgKyBcIjpcIiArIGVyci5jb2wpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gdXRtZTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM1YwYldVdWFuTWlMQ0p6YjNWeVkyVnpJanBiSWk5b2IyMWxMMlJoZG1sa2RHbDBkSE4zYjNKMGFDOXdjbTlxWldOMGN5OTFkRzFsTDNOeVl5OXFjeTkxZEcxbExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTEVsQlFVa3NRMEZCUXl4SFFVRkhMRTlCUVU4c1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dEJRVU16UWl4SlFVRkpMRTlCUVU4c1IwRkJSeXhQUVVGUExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRPMEZCUXpkRExFbEJRVWtzVVVGQlVTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRCUVVOeVF5eEpRVUZKTEdOQlFXTXNSMEZCUnl4UFFVRlBMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNRMEZCUXp0QlFVTnFSQ3hKUVVGSkxGRkJRVkVzUjBGQlJ5eFBRVUZQTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNN08wRkJSWEpETEdkRVFVRm5SRHRCUVVOb1JDeEpRVUZKTEcxQ1FVRnRRaXhIUVVGSExFZEJRVWNzUTBGQlF6dEJRVU01UWl4SlFVRkpMRmxCUVZrc1IwRkJSeXhGUVVGRkxFTkJRVU03UVVGRGRFSXNTVUZCU1N4alFVRmpMRWRCUVVjc1JVRkJSU3hEUVVGRE8wRkJRM2hDTEVsQlFVa3NXVUZCV1N4SFFVRkhMRVZCUVVVc1EwRkJRenRCUVVOMFFpeEpRVUZKTEc5Q1FVRnZRaXhIUVVGSExFVkJRVVVzUTBGQlF6czdRVUZGT1VJc1UwRkJVeXhYUVVGWExFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlEzWkNMRTlCUVU4c1NVRkJTU3hQUVVGUExFTkJRVU1zVlVGQlZTeFBRVUZQTEVWQlFVVXNUVUZCVFN4RlFVRkZPMUZCUXpGRExFbEJRVWtzV1VGQldTeERRVUZETEUxQlFVMHNTMEZCU3l4RFFVRkRMRVZCUVVVN1dVRkRNMElzU1VGQlNTeExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJRenRaUVVOMlFpeExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzUzBGQlN5eERRVUZETEZOQlFWTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3WjBKQlF6ZERMRWxCUVVrc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRXRCUVVzc1NVRkJTU3hGUVVGRk8yOUNRVU5zUXl4UFFVRlBMRU5CUVVNc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMmxDUVVNdlFqdGhRVU5LTzFOQlEwb3NUVUZCVFR0WlFVTklMRmxCUVZrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1owSkJRMnhETEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOcVFpeERRVUZETEVOQlFVTTdVMEZEVGp0TFFVTktMRU5CUVVNc1EwRkJRenREUVVOT08wRkJRMFFzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4RFFVRkRPenRCUVVWMlFpeEpRVUZKTEUxQlFVMHNSMEZCUnp0SlFVTlVMRTlCUVU4N1NVRkRVQ3hQUVVGUE8wbEJRMUFzVFVGQlRUdEJRVU5XTEVsQlFVa3NWVUZCVlR0QlFVTmtPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGQlJVRXNTVUZCU1N4WFFVRlhPenRKUVVWWUxGbEJRVms3U1VGRFdpeFpRVUZaTzBsQlExb3NWVUZCVlR0SlFVTldMRmRCUVZjN1NVRkRXQ3hUUVVGVE8wRkJRMklzU1VGQlNTeFJRVUZSTzBGQlExbzdPMEZCUlVFc1EwRkJReXhEUVVGRE96dEJRVVZHTEZOQlFWTXNZVUZCWVN4RFFVRkRMRkZCUVZFc1JVRkJSU3hoUVVGaExFVkJRVVU3UlVGRE9VTXNTVUZCU1N4TFFVRkxMRWRCUVVjc1VVRkJVU3hEUVVGRExHRkJRV0VzUTBGQlF5eERRVUZETzBGQlEzUkRMRVZCUVVVc1NVRkJTU3hUUVVGVExFZEJRVWNzUzBGQlN5eEpRVUZKTEV0QlFVc3NRMEZCUXl4VFFVRlRMRU5CUVVNN08wVkJSWHBETEVsQlFVa3NVMEZCVXl4RlFVRkZPMGxCUTJJc1QwRkJUeXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1UwRkJVeXhGUVVGRkxGVkJRVlVzV1VGQldTeEZRVUZGTzAxQlF6RkVMRTlCUVU4c1YwRkJWeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMR0ZCUVdFc1JVRkJSVHRSUVVNM1JDeGhRVUZoTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRMRU5CUVVNN1VVRkRNVVFzVDBGQlR5eGxRVUZsTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGbEJRVms3VlVGRGNrUXNTVUZCU1N4UlFVRlJMRWRCUVVjc1JVRkJSU3hEUVVGRE8xVkJRMnhDTEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eGhRVUZoTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdFpRVU51UkN4UlFVRlJMRU5CUVVNc1NVRkJTU3hEUVVGRExHRkJRV0VzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRYUVVOMlF6dFZRVU5FTEU5QlFVOHNVVUZCVVN4RFFVRkRPMU5CUTJwQ0xFTkJRVU1zUTBGQlF6dFBRVU5LTEVOQlFVTXNRMEZCUXp0TFFVTktMRU5CUVVNc1EwRkJReXhEUVVGRE8wZEJRMHdzVFVGQlRUdEpRVU5NTEU5QlFVOHNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF6dEhRVU0xUWp0QlFVTklMRU5CUVVNN08wRkJSVVFzVTBGQlV5eG5Ra0ZCWjBJc1JVRkJSU3hSUVVGUkxFVkJRVVU3UlVGRGJrTXNUMEZCVHl4aFFVRmhMRU5CUVVNc1VVRkJVU3hGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzBGQlF6RkRMRU5CUVVNN08wRkJSVVFzVTBGQlV5eHBRa0ZCYVVJc1JVRkJSU3hSUVVGUkxFVkJRVVU3UlVGRGNFTXNUMEZCVHl4aFFVRmhMRU5CUVVNc1VVRkJVU3hGUVVGRkxGTkJRVk1zUTBGQlF5eERRVUZETzBGQlF6VkRMRU5CUVVNN08wRkJSVVFzVTBGQlV5eDNRa0ZCZDBJc1EwRkJReXhMUVVGTExFVkJRVVU3U1VGRGNrTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1JVRkJSU3hEUVVGRE8wbEJRMnhDTEVsQlFVa3NaMEpCUVdkQ0xFTkJRVU03U1VGRGNrSXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3VVVGRGJrTXNTVUZCU1N4VFFVRlRMRWRCUVVjc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzFGQlEzcENMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJUdFpRVU5RTEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eExRVUZMTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8yZENRVU51UXl4SlFVRkpMRWxCUVVrc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdaMEpCUTNoQ0xFbEJRVWtzU1VGQlNTeEhRVUZITEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUjBGQlJ5eFRRVUZUTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRExGTkJRVk1zUjBGQlJ5eEZRVUZGTEVOQlFVTTdaMEpCUTNCRkxHZENRVUZuUWl4SlFVRkpMRWxCUVVrc1EwRkJRenRuUWtGRGVrSXNVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExGTkJRVk1zUjBGQlJ5eG5Ra0ZCWjBJc1EwRkJRenRoUVVNM1F6dFRRVU5LTEUxQlFVMDdXVUZEU0N4blFrRkJaMElzUjBGQlJ5eFRRVUZUTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1UwRkJVeXhEUVVGRE8xTkJRemRETzFGQlEwUXNVVUZCVVN4SFFVRkhMRkZCUVZFc1EwRkJReXhOUVVGTkxFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdTMEZEZWtNN1NVRkRSQ3hQUVVGUExGRkJRVkVzUTBGQlF6dEJRVU53UWl4RFFVRkRPenRCUVVWRUxGTkJRVk1zWlVGQlpTeEZRVUZGTEZGQlFWRXNSVUZCUlR0SlFVTm9ReXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEZRVUZGTEVOQlFVTTdTVUZEYkVJc1QwRkJUeXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETzFGQlEyWXNaMEpCUVdkQ0xFTkJRVU1zVVVGQlVTeERRVUZETzFGQlF6RkNMR2xDUVVGcFFpeERRVUZETEZGQlFWRXNRMEZCUXp0TFFVTTVRaXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETEZWQlFWVXNWVUZCVlN4RlFVRkZPMUZCUXpGQ0xFbEJRVWtzVTBGQlV5eEhRVUZITEZWQlFWVXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF5eFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRVZCUVVVc1ZVRkJWU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdVVUZEZEVVc1VVRkJVU3hEUVVGRExFdEJRVXNzUjBGQlJ5eDNRa0ZCZDBJc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dExRVU40UkN4RFFVRkRMRU5CUVVNN1FVRkRVQ3hEUVVGRE96dEJRVVZFTEZOQlFWTXNUMEZCVHl4RFFVRkRMRkZCUVZFc1JVRkJSU3hIUVVGSExFVkJRVVVzVFVGQlRTeEZRVUZGTzBsQlEzQkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zWTBGQll5eERRVUZETEVOQlFVTTdRVUZEYmtNc1NVRkJTU3hOUVVGTkxFZEJRVWNzVFVGQlRTeEpRVUZKTEVWQlFVVXNRMEZCUXpzN1NVRkZkRUlzU1VGQlNTeEpRVUZKTEVkQlFVY3NVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dEpRVU12UWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETzBsQlEzWkNMRWxCUVVrc1NVRkJTU3hKUVVGSkxFdEJRVXNzUTBGQlF5eE5RVUZOTEVsQlFVa3NVMEZCVXl4RlFVRkZPMUZCUTI1RExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNVVUZCVVN4SFFVRkhMRkZCUVZFc1EwRkJRenRSUVVNNVFpeExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRk5CUVZNc1IwRkJSeXhIUVVGSExFTkJRVU03VVVGRE1VSXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxFMUJRVTBzUlVGQlJUdFpRVU14UWl4SlFVRkpMRmRCUVZjc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOeVJTeEpRVUZKTEUxQlFVMHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eE5RVUZOTEVOQlFVTTdRVUZET1VNc1dVRkJXU3hKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU03TzFsQlJUbENMRWxCUVVrc1RVRkJUU3hKUVVGSkxFTkJRVU1zVFVGQlRTeERRVUZETEUxQlFVMHNRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRuUWtGREwwSXNUVUZCVFN4SFFVRkhMRWRCUVVjc1IwRkJSeXhOUVVGTkxFTkJRVU03WVVGRGVrSTdXVUZEUkN4SlFVRkpMRk5CUVZNc1IwRkJSeXhEUVVGRExGRkJRVkVzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEUxQlFVMHNUMEZCVHl4WFFVRlhMRWRCUVVjc1RVRkJUU3hEUVVGRExFTkJRVU03UVVGRGNFZ3NXVUZCV1N4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVkQlFVY3NTVUZCU1N4SFFVRkhMRTFCUVUwc1EwRkJReXhEUVVGRE96dFpRVVZ5UkN4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVVVGQlVTeERRVUZETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHRqUVVOMFF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzVVVGQlVTeERRVUZETEVsQlFVa3NSMEZCUnl4UlFVRlJMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU03WTBGRGJrVXNUMEZCVHl4RFFVRkRMRWRCUVVjc1JVRkJSU3hKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRPMEZCUTJoSExHRkJRV0U3UVVGRFlqdEJRVU5CT3p0WlFVVlpMRWxCUVVrc1UwRkJVeXhGUVVGRk8yZENRVU5ZTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1RVRkJUU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzBGQlF6ZERMR0ZCUVdFN08xTkJSVW9zVFVGQlRTeEpRVUZKTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1UwRkJVeXhGUVVGRk8xbEJRM0JETEVsQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU4c1JVRkJSVHRuUWtGRFppeFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFVkJRVVVzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRoUVVONFJEdFRRVU5LTEUxQlFVMDdXVUZEU0N4SlFVRkpMRTlCUVU4c1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXp0WlFVTm9ReXhKUVVGSkxFdEJRVXNzUjBGQlJ5eFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUTNaRExGbEJRVmtzU1VGQlNTeFJRVUZSTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdRVUZEY2tRN08xbEJSVmtzU1VGQlNTeFBRVUZQTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1NVRkJTU3hYUVVGWExFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExHTkJRV01zUTBGQlF5eEpRVUZKTEZWQlFWVXNSVUZCUlR0alFVTnVSeXhKUVVGSkxFbEJRVWtzUTBGQlF6dGpRVU5VTEVsQlFVa3NUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJRenRqUVVOdVFpeExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRXRCUVVzc1EwRkJReXhOUVVGTkxFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4SFFVRkhMRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3WjBKQlF6TkRMRWxCUVVrc1UwRkJVeXhIUVVGSExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0blFrRkRla0lzU1VGQlNTeGhRVUZoTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdaMEpCUTI1RUxFbEJRVWtzVVVGQlVTeExRVUZMTEdGQlFXRXNSVUZCUlR0clFrRkRPVUlzU1VGQlNTeERRVUZETEVsQlFVa3NSVUZCUlR0elFrRkRVQ3hKUVVGSkxFbEJRVWtzVTBGQlV5eERRVUZETEZOQlFWTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03YzBKQlF6bERMRTFCUVUwc1IwRkJSeXhEUVVGRExHVkJRV1VzUTBGQlF5eFRRVUZUTEVOQlFVTXNTVUZCU1N4SlFVRkpMRWRCUVVjc2JVSkJRVzFDTEVOQlFVTTdiVUpCUTNSRkxFMUJRVTBzU1VGQlNTeHBRa0ZCYVVJc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJUdHpRa0ZEY2tNc1RVRkJUU3hIUVVGSExFdEJRVXNzUTBGQlF6dHpRa0ZEWml4TlFVRk5PMjFDUVVOVU8ybENRVU5HTzBGQlEycENMR1ZCUVdVN08yTkJSVVFzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRTFCUVUwc1EwRkJRenRCUVVONFF5eGhRVUZoTzBGQlEySTdPMWxCUlZrc1NVRkJTU3hOUVVGTkxFTkJRVU1zYlVKQlFXMUNMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU1zUlVGQlJUdG5Ra0ZEYmtNc1YwRkJWeXhEUVVGRExGRkJRVkVzUlVGQlJTeEhRVUZITEVWQlFVVXNUVUZCVFN4RFFVRkRMRU5CUVVNN1lVRkRkRU1zVFVGQlRUdG5Ra0ZEU0N4elFrRkJjMElzUTBGQlF5eFJRVUZSTEVWQlFVVXNTVUZCU1N4RlFVRkZMRTlCUVU4c1JVRkJSU3hWUVVGVkxFTkJRVU1zVVVGQlVTeEZRVUZGTEVkQlFVY3NRMEZCUXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzU1VGQlNTeEZRVUZGTzJ0Q1FVTTVSaXhKUVVGSkxFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN2EwSkJRMnhDTEVsQlFVa3NUMEZCVHl4SFFVRkhMRWRCUVVjc1EwRkJReXhQUVVGUExFTkJRVU1zVjBGQlZ5eEZRVUZGTEVOQlFVTTdRVUZETVVRc2EwSkJRV3RDTEVsQlFVa3NhMEpCUVd0Q0xFZEJRVWNzVDBGQlR5eExRVUZMTEU5QlFVOHNTVUZCU1N4UFFVRlBMRXRCUVVzc1ZVRkJWU3hKUVVGSkxFZEJRVWNzUTBGQlF5eFpRVUZaTEVOQlFVTXNhVUpCUVdsQ0xFTkJRVU1zUTBGQlF6czdhMEpCUlRsSExFbEJRVWtzVFVGQlRTeERRVUZETEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTjJReXhKUVVGSkxFOUJRVThzUjBGQlJ5eEZRVUZGTEVOQlFVTTdiMEpCUTJwQ0xFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVN2MwSkJRM0JDTEU5QlFVOHNRMEZCUXl4TFFVRkxMRWRCUVVjc1QwRkJUeXhEUVVGRExFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTFCUVUwc1EwRkJRenRCUVVONFJTeHhRa0ZCY1VJN1FVRkRja0k3TzI5Q1FVVnZRaXhKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NUMEZCVHl4RlFVRkZPM05DUVVNM1FpeERRVUZETEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzNGQ1FVTjZRaXhOUVVGTkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTlCUVU4c1NVRkJTU3hKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEUxQlFVMHNTMEZCU3l4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTzNOQ1FVTjZSaXhIUVVGSExFTkJRVU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4RlFVRkZMRU5CUVVNN2NVSkJRM1pDTEUxQlFVMDdjMEpCUTB3c1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNRMEZCUXl4SFFVRkhMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03UVVGRE4wUXNjVUpCUVhGQ096dHZRa0ZGUkN4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eExRVUZMTEVsQlFVa3NWMEZCVnl4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEVsQlFVa3NWMEZCVnl4RlFVRkZPM05DUVVOMlJpeEpRVUZKTEU5QlFVOHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1IwRkJSeXhGUVVGRkxFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRXRCUVVzc1JVRkJSU3hEUVVGRE8wRkJReTlITEhOQ1FVRnpRaXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEVkQlFVY3NSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenM3YzBKQlJYWkNMRWxCUVVrc2EwSkJRV3RDTEVWQlFVVTdkMEpCUTNSQ0xGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8zVkNRVU01UWp0elFrRkRSQ3hSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVkQlFVY3NSVUZCUlN4UlFVRlJMRU5CUVVNc1EwRkJRenR4UWtGREwwSTdRVUZEY2tJc2JVSkJRVzFDT3p0clFrRkZSQ3hKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NWVUZCVlN4RlFVRkZPMjlDUVVOb1F5eEpRVUZKTEVkQlFVY3NSMEZCUnl4TlFVRk5MRU5CUVVNc1dVRkJXU3hEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN2IwSkJRMnBFTEZGQlFWRXNRMEZCUXl4UFFVRlBMRU5CUVVNc1IwRkJSeXhGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETzBGQlF5OURMRzlDUVVGdlFpeFJRVUZSTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6czdiMEpCUlRWQ0xFZEJRVWNzUTBGQlF5eExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU03UVVGRGFFUXNiMEpCUVc5Q0xGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE96dHZRa0ZGT1VJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVWQlFVVXNSMEZCUnl4RFFVRkRMRU5CUVVNN2IwSkJRM3BDTEVsQlFVa3NhMEpCUVd0Q0xFVkJRVVU3ZDBKQlEzQkNMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTEU5QlFVOHNRMEZCUXl4RFFVRkRPM0ZDUVVOb1F6dEJRVU55UWl4dFFrRkJiVUk3TzJ0Q1FVVkVMRWxCUVVrc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFZRVUZWTEVsQlFVa3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNRMEZCUXl4RlFVRkZPMjlDUVVOMFJTeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRmxCUVZrc1IwRkJSeXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hyUWtGQmEwSXNTVUZCU1N4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFbEJRVWtzUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTnVTU3h0UWtGQmJVSTdPMnRDUVVWRUxFbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVOHNSVUZCUlR0dlFrRkRha0lzVjBGQlZ5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU03YlVKQlEzQkRPMmxDUVVOR0xFVkJRVVVzVlVGQlZTeE5RVUZOTEVWQlFVVTdiMEpCUTJwQ0xFbEJRVWtzU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4VlFVRlZMRVZCUVVVN2MwSkJRMmhETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1dVRkJXU3hIUVVGSExFMUJRVTBzUTBGQlF5eERRVUZETzNOQ1FVTjBReXhKUVVGSkxFTkJRVU1zV1VGQldTeERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPM0ZDUVVNeFFpeE5RVUZOTEVsQlFVa3NaVUZCWlN4RFFVRkRMRWxCUVVrc1EwRkJReXhGUVVGRk8zZENRVU01UWl4SlFVRkpMRU5CUVVNc1YwRkJWeXhEUVVGRExHdENRVUZyUWl4SFFVRkhMRWRCUVVjc1IwRkJSeXhYUVVGWExFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNSMEZCUnl4WFFVRlhMRWRCUVVjc1RVRkJUU3hEUVVGRExFTkJRVU03ZDBKQlEycEhMRWxCUVVrc1EwRkJReXhaUVVGWkxFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdjVUpCUXpWQ0xFMUJRVTA3YzBKQlEwd3NTVUZCU1N4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RFFVRkRMRVZCUVVVN2QwSkJRM1JETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU03ZFVKQlEzaENPM05DUVVORUxFbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVOHNSVUZCUlR0M1FrRkRha0lzVjBGQlZ5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU03ZFVKQlEzQkRPM0ZDUVVOR08ybENRVU5LTEVOQlFVTXNRMEZCUXp0aFFVTk9PMU5CUTBvN1MwRkRTanRCUVVOTUxFTkJRVU03TzBGQlJVUXNVMEZCVXl4alFVRmpMRU5CUVVNc1dVRkJXU3hGUVVGRk8wbEJRMnhETEVsQlFVa3NSVUZCUlN4SFFVRkhMRkZCUVZFc1EwRkJReXhoUVVGaExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdTVUZET1VNc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFZRVUZWTEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVN1VVRkRNVU1zU1VGQlNUdFpRVU5CTEVsQlFVa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhGUVVGRk8yZENRVU5xUWl4TlFVRk5MRWxCUVVrc1MwRkJTeXhEUVVGRExEQkRRVUV3UXl4RFFVRkRMRU5CUVVNN1lVRkRMMFE3V1VGRFJDeEpRVUZKTEU5QlFVOHNRMEZCUXl4alFVRmpMRVZCUVVVN1owSkJRM2hDTEU5QlFVOHNRMEZCUXl4alFVRmpMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU1zVlVGQlZTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMkZCUTJ4RUxFMUJRVTA3WjBKQlEwZ3NTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RlFVRkZMRVZCUVVVN2IwSkJRMnBETEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc1owSkJRV2RDTEVkQlFVY3NXVUZCV1N4SFFVRkhMRzlDUVVGdlFqdDNRa0ZEYkVVc2VVTkJRWGxETEVOQlFVTXNRMEZCUXp0cFFrRkRiRVE3WjBKQlEwUXNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF5eFJRVUZSTEVWQlFVVXNRMEZCUXl4SFFVRkhMRU5CUVVNc1ZVRkJWU3hEUVVGRE8yZENRVU01UXl3clFrRkJLMElzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXp0aFFVTTFRenRUUVVOS0xFTkJRVU1zVDBGQlR5eEhRVUZITEVWQlFVVTdXVUZEVml4TlFVRk5MRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03VTBGRFpqdExRVU5LTEVOQlFVTXNRMEZCUXp0QlFVTlFMRU5CUVVNN08wRkJSVVFzVTBGQlV5eGxRVUZsTEVOQlFVTXNTVUZCU1N4RlFVRkZPMGxCUXpOQ0xFOUJRVThzU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4WlFVRlpPMWRCUXpsQ0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NWVUZCVlR0WFFVTTFRaXhKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEZsQlFWazdWMEZET1VJc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFhRVUZYTzFkQlF6ZENMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVFVGQlRUdFhRVU40UWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxFOUJRVThzUTBGQlF6dEJRVU55UXl4RFFVRkRPenRCUVVWRU96dEhRVVZITzBGQlEwZ3NVMEZCVXl4cFFrRkJhVUlzUTBGQlF5eEpRVUZKTEVWQlFVVTdRVUZEYWtNc1NVRkJTU3hKUVVGSkxFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRPMEZCUXpkQ08wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3U1VGRlNTeFBRVUZQTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzBGQlEzaEhMRU5CUVVNN08wRkJSVVFzVTBGQlV5eHpRa0ZCYzBJc1EwRkJReXhSUVVGUkxFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNSVUZCUlN4UFFVRlBMRVZCUVVVc1YwRkJWeXhGUVVGRk8wbEJRek5GTEVsQlFVa3NUMEZCVHl4RFFVRkRPMGxCUTFvc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFZRVUZWTEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVN1VVRkRNVU1zVTBGQlV5eFBRVUZQTEVkQlFVYzdXVUZEWml4SlFVRkpMRU5CUVVNc1QwRkJUeXhGUVVGRk8yZENRVU5XTEU5QlFVOHNSMEZCUnl4SlFVRkpMRWxCUVVrc1JVRkJSU3hEUVVGRExFOUJRVThzUlVGQlJTeERRVUZETzBGQlF5OURMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeEpRVUZKTEVOQlFVTTdXVUZEVkN4SlFVRkpMRmxCUVZrc1IwRkJSeXhMUVVGTExFTkJRVU03V1VGRGVrSXNTVUZCU1N4VlFVRlZMRWRCUVVjc1MwRkJTeXhEUVVGRE8xbEJRM1pDTEVsQlFVa3NhMEpCUVd0Q0xFZEJRVWNzUzBGQlN5eERRVUZETzFsQlF5OUNMRWxCUVVrc1pVRkJaU3hIUVVGSExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xbEJRMnBFTEVsQlFVa3NWMEZCVnl4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETzFsQlEycERMRWxCUVVrc1ZVRkJWU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNWVUZCVlN4SlFVRkpMRkZCUVZFc1EwRkJRenRaUVVOc1JDeGxRVUZsTEVOQlFVTXNUMEZCVHl4RFFVRkRMRzFDUVVGdFFpeEhRVUZITEU5QlFVOHNRMEZCUXl4UlFVRlJMRWRCUVVjc1NVRkJTU3hEUVVGRExFTkJRVU03V1VGRGRrVXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEdWQlFXVXNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3WjBKQlF6ZERMRWxCUVVrc1VVRkJVU3hIUVVGSExHVkJRV1VzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0blFrRkRiRU1zU1VGQlNTeGxRVUZsTEVOQlFVTXNTVUZCU1N4RFFVRkRMRVZCUVVVN2IwSkJRM1pDTEZGQlFWRXNTVUZCU1N4VlFVRlZMRU5CUVVNN2FVSkJRekZDTzJkQ1FVTkVMRWxCUVVrc1IwRkJSeXhEUVVGRExFTkJRVU1zVVVGQlVTeERRVUZETEVOQlFVTTdaMEpCUTI1Q0xFbEJRVWtzU1VGQlNTeERRVUZETEUxQlFVMHNTVUZCU1N4RFFVRkRMRVZCUVVVN2IwSkJRMnhDTEVsQlFVa3NUMEZCVHl4WFFVRlhMRWxCUVVrc1YwRkJWeXhGUVVGRk8zZENRVU51UXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hGUVVGRkxFTkJRVU03ZDBKQlEyaERMRWxCUVVrc1EwRkJReXhWUVVGVkxFdEJRVXNzVVVGQlVTeEpRVUZKTEU5QlFVOHNTMEZCU3l4WFFVRlhPelpDUVVOc1JDeFZRVUZWTEV0QlFVc3NWVUZCVlN4SlFVRkpMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zVjBGQlZ5eERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRVZCUVVVN05FSkJRMnhGTEZWQlFWVXNSMEZCUnl4SlFVRkpMRU5CUVVNN05FSkJRMnhDTEUxQlFVMDdlVUpCUTFRc1RVRkJUVHMwUWtGRFNDeHJRa0ZCYTBJc1IwRkJSeXhKUVVGSkxFTkJRVU03ZVVKQlF6ZENPM0ZDUVVOS0xFMUJRVTA3ZDBKQlEwZ3NWVUZCVlN4SFFVRkhMRWxCUVVrc1EwRkJRenQzUWtGRGJFSXNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhuUWtGQlowSXNSVUZCUlN4UFFVRlBMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03ZDBKQlF6bERMRTFCUVUwN2NVSkJRMVE3YjBKQlEwUXNUVUZCVFR0cFFrRkRWQ3hOUVVGTkxFbEJRVWtzU1VGQlNTeERRVUZETEUxQlFVMHNSMEZCUnl4RFFVRkRMRVZCUVVVN2IwSkJRM2hDTEZsQlFWa3NSMEZCUnl4SlFVRkpMRU5CUVVNN2FVSkJRM1pDTzBGQlEycENMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeFZRVUZWTEVWQlFVVTdaMEpCUTFvc1QwRkJUeXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzJGQlEycENMRTFCUVUwc1NVRkJTU3hsUVVGbExFTkJRVU1zU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRWxCUVVrc1JVRkJSU3hEUVVGRExFOUJRVThzUlVGQlJTeEhRVUZITEU5QlFVOHNTVUZCU1N4UFFVRlBMRWRCUVVjc1EwRkJReXhGUVVGRk8yZENRVU5vUml4VlFVRlZMRU5CUVVNc1QwRkJUeXhGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZETzJGQlF6TkNMRTFCUVUwN1owSkJRMGdzU1VGQlNTeE5RVUZOTEVkQlFVY3NSVUZCUlN4RFFVRkRPMmRDUVVOb1FpeEpRVUZKTEZsQlFWa3NSVUZCUlR0dlFrRkRaQ3hOUVVGTkxFZEJRVWNzYjBSQlFXOUVMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWRCUVVjc1lVRkJZU3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVkQlFVY3NiME5CUVc5RExFTkJRVU03YVVKQlF6ZExMRTFCUVUwc1NVRkJTU3hyUWtGQmEwSXNSVUZCUlR0dlFrRkRNMElzVFVGQlRTeEhRVUZITEc5RVFVRnZSQ3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhIUVVGSExHRkJRV0VzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SFFVRkhMQ3REUVVFclF5eEhRVUZITEZkQlFWY3NSMEZCUnl4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJTeEhRVUZITEVsQlFVa3NRMEZCUXp0cFFrRkRNMDhzVFVGQlRUdHZRa0ZEU0N4TlFVRk5MRWRCUVVjc2IwUkJRVzlFTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVkQlFVY3NZVUZCWVN4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzT0VKQlFUaENMRU5CUVVNN2FVSkJRM1pMTzJkQ1FVTkVMRTFCUVUwc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dGhRVU5zUWp0QlFVTmlMRk5CUVZNN08xRkJSVVFzU1VGQlNTeExRVUZMTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEdOQlFXTXNRMEZCUXl4RFFVRkRPMUZCUTNCRUxFbEJRVWtzUzBGQlN5eEhRVUZITEcxQ1FVRnRRaXhKUVVGSkxFdEJRVXNzUzBGQlN5eFZRVUZWTEVkQlFVY3NSMEZCUnl4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRE8xRkJRM1pGTEVsQlFVa3NUVUZCVFN4RFFVRkRMRTlCUVU4c1JVRkJSVHRaUVVOb1FpeGpRVUZqTEVOQlFVTXNWVUZCVlN4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGZEJRVmM3WTBGRGVrTXNTVUZCU1N4TFFVRkxMRXRCUVVzc1ZVRkJWU3hGUVVGRk8ydENRVU4wUWl4VlFVRlZMRU5CUVVNc1QwRkJUeXhGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzJWQlEyaERMRTFCUVUwc1NVRkJTU3hMUVVGTExFdEJRVXNzVTBGQlV5eEZRVUZGTzJ0Q1FVTTFRaXhQUVVGUExFVkJRVVVzUTBGQlF6dGxRVU5pTEUxQlFVMDdhMEpCUTBnc1ZVRkJWU3hEUVVGRExFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRTlCUVU4c1IwRkJSeXhMUVVGTExFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXp0bFFVTjZSRHRoUVVOR0xFTkJRVU1zUTBGQlF6dFRRVU5PTEUxQlFVMDdXVUZEU0N4SlFVRkpMRXRCUVVzc1MwRkJTeXhWUVVGVkxFVkJRVVU3WjBKQlEzUkNMRlZCUVZVc1EwRkJReXhQUVVGUExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdZVUZEYUVNc1RVRkJUU3hKUVVGSkxFdEJRVXNzUzBGQlN5eFRRVUZUTEVWQlFVVTdaMEpCUXpWQ0xFOUJRVThzUlVGQlJTeERRVUZETzJGQlEySXNUVUZCVFR0blFrRkRTQ3hWUVVGVkxFTkJRVU1zVDBGQlR5eEZRVUZGTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1QwRkJUeXhIUVVGSExFdEJRVXNzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTNwRU8xTkJRMG83UzBGRFNpeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVlVGQlZTeERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVN1FVRkRia01zU1VGQlNTeEpRVUZKTEVkQlFVY3NSMEZCUnl4RFFVRkRMRVZCUVVVN1FVRkRha0k3TzFGQlJWRXNTVUZCU1N4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4VFFVRlRMRWxCUVVrc1ZVRkJWU3hGUVVGRk8xbEJRMnBFTEU5QlFVOHNRMEZCUXl4RFFVRkRPMU5CUTFvN1VVRkRSQ3hQUVVGUExGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1UwRkJVeXhIUVVGSExGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRExGTkJRVk1zUTBGQlF6dExRVU0xUlR0SlFVTkVMRTlCUVU4c1EwRkJReXhEUVVGRE8wRkJRMklzUTBGQlF6czdRVUZGUkN4VFFVRlRMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNSVUZCUlN4UFFVRlBMRVZCUVVVN08wbEJSV3BFTEZWQlFWVXNRMEZCUXl4WFFVRlhPMUZCUTJ4Q0xFbEJRVWtzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRWxCUVVrc1IwRkJSeXhIUVVGSExFTkJRVU1zUTBGQlF5eEZRVUZGTzFsQlEyNURMRTlCUVU4c1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEhRVUZITEVOQlFVTXNSVUZCUlN4TlFVRk5MRU5CUVVNc1EwRkJRenRUUVVOMFF5eE5RVUZOTzFsQlEwZ3NTVUZCU1N4RFFVRkRMRmxCUVZrc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dFRRVU16UWp0TFFVTktMRVZCUVVVc1QwRkJUeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEzSkNMRU5CUVVNN08wRkJSVVFzVTBGQlV5eHJRa0ZCYTBJc1EwRkJReXhQUVVGUExFVkJRVVU3U1VGRGFrTXNTVUZCU1N4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExHRkJRV0VzUTBGQlF5eFZRVUZWTEVOQlFVTXNRMEZCUXp0QlFVTnNSQ3hKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVkQlFVY3NUMEZCVHl4RFFVRkRPenRKUVVWNlFpeFBRVUZQTEVsQlFVa3NRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRExFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZET1VNc1EwRkJRenM3UVVGRlJDeFRRVUZUTEcxQ1FVRnRRaXhEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU12UWl4UFFVRlBMRWxCUVVrc1NVRkJTU3hKUVVGSkxFTkJRVU1zU1VGQlNTeEpRVUZKTEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRkZCUVZFc1EwRkJRenRCUVVOb1JpeERRVUZET3p0QlFVVkVMRk5CUVZNc1owSkJRV2RDTEVOQlFVTXNTMEZCU3l4RlFVRkZPMFZCUXk5Q0xFbEJRVWtzVFVGQlRTeEhRVUZITEVWQlFVVXNRMEZCUXp0RlFVTm9RaXhKUVVGSkxGRkJRVkVzUjBGQlJ5eExRVUZMTEVOQlFVTTdSVUZEY2tJc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRXRCUVVzc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdTVUZEY2tNc1NVRkJTU3hOUVVGTkxFZEJRVWNzUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1MwRkJTeXhOUVVGTkxFTkJRVU03U1VGRE0wTXNTVUZCU1N4RFFVRkRMRkZCUVZFc1NVRkJTU3hEUVVGRExFMUJRVTBzUlVGQlJUdE5RVU40UWl4TlFVRk5MRU5CUVVNc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMDFCUTNSQ0xGRkJRVkVzUjBGQlJ5eFJRVUZSTEVsQlFVa3NUVUZCVFN4RFFVRkRPMHRCUXk5Q08wZEJRMFk3UlVGRFJDeFBRVUZQTEUxQlFVMHNRMEZCUXp0QlFVTm9RaXhEUVVGRExFTkJRVU03TzBGQlJVWXNTVUZCU1N4SlFVRkpMRWRCUVVjc1EwRkJReXhaUVVGWk8wbEJRM0JDTEZOQlFWTXNSVUZCUlN4SFFVRkhPMUZCUTFZc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4SFFVRkhMRWxCUVVrc1EwRkJReXhOUVVGTkxFVkJRVVVzU1VGQlNTeFBRVUZQTEVOQlFVTTdZVUZETTBNc1VVRkJVU3hEUVVGRExFVkJRVVVzUTBGQlF6dGhRVU5hTEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRMUVVOeVFqdEpRVU5FTEU5QlFVOHNXVUZCV1R0UlFVTm1MRTlCUVU4c1JVRkJSU3hGUVVGRkxFZEJRVWNzUlVGQlJTeEZRVUZGTEVkQlFVY3NSMEZCUnl4SFFVRkhMRVZCUVVVc1JVRkJSU3hIUVVGSExFZEJRVWNzUjBGQlJ5eEZRVUZGTEVWQlFVVXNSMEZCUnl4SFFVRkhPMWxCUXpsRExFVkJRVVVzUlVGQlJTeEhRVUZITEVkQlFVY3NSMEZCUnl4RlFVRkZMRVZCUVVVc1IwRkJSeXhGUVVGRkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEVWQlFVVXNRMEZCUXp0TFFVTjJReXhEUVVGRE8wRkJRMDRzUTBGQlF5eEhRVUZITEVOQlFVTTdPMEZCUlV3c1NVRkJTU3hUUVVGVExFZEJRVWNzUlVGQlJTeERRVUZETzBGQlEyNUNMRWxCUVVrc1MwRkJTeXhEUVVGRE8wRkJRMVlzU1VGQlNTeEpRVUZKTEVkQlFVYzdTVUZEVUN4SlFVRkpMRVZCUVVVc1dVRkJXVHRSUVVOa0xFbEJRVWtzVVVGQlVTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExHVkJRV1VzUTBGQlF5eERRVUZETzFGQlEyNUVMRWxCUVVrc1VVRkJVU3hGUVVGRk8xVkJRMW9zV1VGQldTeERRVUZETEV0QlFVc3NSVUZCUlN4RFFVRkRPMU5CUTNSQ08xRkJRMFFzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRWRCUVVjc1NVRkJTU3hEUVVGRExHOUNRVUZ2UWl4RlFVRkZMRU5CUVVNN1FVRkRla1FzVVVGQlVTeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMR0ZCUVdFc1EwRkJReXhEUVVGRE96dFJRVVU1UWl4UFFVRlBMRWxCUVVrc1EwRkJReXhaUVVGWkxFVkJRVVVzUTBGQlF5eEpRVUZKTEVOQlFVTXNXVUZCV1R0VlFVTXhReXhKUVVGSkxGRkJRVkVzUlVGQlJUdFpRVU5hTEZWQlFWVXNRMEZCUXl4WlFVRlpPMk5CUTNKQ0xFdEJRVXNzUTBGQlF5eFZRVUZWTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zYTBKQlFXdENMRU5CUVVNc1EwRkJRenRqUVVNeFJDeExRVUZMTEVOQlFVTXNUMEZCVHl4SFFVRkhMRWxCUVVrc1EwRkJRenRqUVVOeVFpeEpRVUZKTEVOQlFVTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE8yRkJRelZDTEVWQlFVVXNSMEZCUnl4RFFVRkRMRU5CUVVNN1YwRkRWQ3hOUVVGTk8xbEJRMHdzU1VGQlNTeExRVUZMTEVOQlFVTXNUVUZCVFN4TFFVRkxMRk5CUVZNc1JVRkJSVHRqUVVNNVFpeFhRVUZYTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhSUVVGUkxFVkJRVVVzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRoUVVOMFJDeE5RVUZOTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hKUVVGSkxFdEJRVXNzUTBGQlF5eE5RVUZOTEV0QlFVc3NZMEZCWXl4RlFVRkZPMk5CUXpORUxFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPMkZCUTNwQ08wRkJRMklzVjBGQlZ6czdVMEZGUml4RFFVRkRMRU5CUVVNN1MwRkRUanRKUVVORUxGTkJRVk1zUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlN4UFFVRlBMRVZCUVVVN1VVRkRMMElzU1VGQlNTeFRRVUZUTEVsQlFVa3NVMEZCVXl4RFFVRkRMRTFCUVUwc1JVRkJSVHRaUVVNdlFpeExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzVTBGQlV5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRuUWtGRGRrTXNVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0aFFVTTVRanRUUVVOS08wdEJRMG83U1VGRFJDeGpRVUZqTEVWQlFVVXNXVUZCV1R0UlFVTjRRaXhKUVVGSkxFdEJRVXNzUTBGQlF5eE5RVUZOTEVsQlFVa3NWMEZCVnl4RlFVRkZPMWxCUXpkQ0xFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NWMEZCVnl4RFFVRkRPMWxCUXpOQ0xFdEJRVXNzUTBGQlF5eExRVUZMTEVkQlFVY3NSVUZCUlN4RFFVRkRPMWxCUTJwQ0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zUTBGQlF6dFpRVU53UXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNN1dVRkRjRU1zU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4TlFVRk5MRVZCUVVVN1owSkJRM1pDTEVkQlFVY3NSVUZCUlR0dlFrRkRSQ3hSUVVGUkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4UlFVRlJPMjlDUVVOc1F5eEpRVUZKTEVWQlFVVXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhKUVVGSk8yOUNRVU14UWl4TlFVRk5MRVZCUVVVc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eE5RVUZOTzI5Q1FVTTVRaXhKUVVGSkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpPMmxDUVVNM1FqdGhRVU5LTEVOQlFVTXNRMEZCUXp0VFFVTk9PMEZCUTFRc1MwRkJTenM3U1VGRlJDeFhRVUZYTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVc1RVRkJUU3hGUVVGRk8xRkJRMnBETEVsQlFVa3NTMEZCU3l4SFFVRkhMRWxCUVVrc1NVRkJTU3hOUVVGTkxFTkJRVU1zYVVKQlFXbENMRU5CUVVNc1EwRkJRenRSUVVNNVF5eEpRVUZKTEU5QlFVOHNSMEZCUnl4RFFVRkRMRWxCUVVrc1IwRkJSeXhOUVVGTkxFTkJRVU1zYVVSQlFXbEVMRU5CUVVNc1NVRkJTU3hIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETzFGQlF6bEdMRTlCUVU4c1YwRkJWeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMRkZCUVZFc1JVRkJSVHRaUVVNdlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRMRU5CUVVNN1dVRkRhRVFzWlVGQlpTeERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhaUVVGWk8yZENRVU4yUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhIUVVGSExFVkJRVVVzUTBGQlF6dG5Ra0ZEWml4TFFVRkxMRU5CUVVNc1QwRkJUeXhIUVVGSExFOUJRVThzUzBGQlN5eEpRVUZKTEVOQlFVTTdRVUZEYWtRc1owSkJRV2RDTEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1UwRkJVeXhEUVVGRE96dEJRVVY2UXl4blFrRkJaMElzVVVGQlVTeERRVUZETEV0QlFVc3NSMEZCUnl4blFrRkJaMElzUTBGQlF5eFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN08yZENRVVZzUkN4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVVVGQlVTeERRVUZETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHRyUWtGRGRFTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXh4UWtGQmNVSXNSMEZCUnl4SlFVRkpMRWRCUVVjc1IwRkJSeXhGUVVGRkxGRkJRVkVzUTBGQlF5eERRVUZETzBGQlF5OUZMR2xDUVVGcFFqczdRVUZGYWtJc1owSkJRV2RDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2EwSkJRV3RDTEVOQlFVTXNRMEZCUXpzN1owSkJSVzVETEU5QlFVOHNRMEZCUXl4UlFVRlJMRVZCUVVVc1EwRkJReXhEUVVGRExFTkJRVU03WVVGRGVFSXNRMEZCUXl4RFFVRkRPMU5CUTA0c1EwRkJReXhEUVVGRE8wdEJRMDQ3U1VGRFJDeFhRVUZYTEVWQlFVVXNWMEZCVnp0SlFVTjRRaXhaUVVGWkxFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVTdVVUZETjBJc1NVRkJTU3hSUVVGUkxFZEJRVWNzUzBGQlN5eERRVUZETEVkQlFVY3NTVUZCU1N4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExGRkJRVkVzUTBGQlF6dFJRVU12UXl4UFFVRlBMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU03VVVGRGFrSXNTMEZCU3l4RFFVRkRMRTFCUVUwc1IwRkJSeXhSUVVGUkxFTkJRVU03UVVGRGFFTXNVVUZCVVN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHdENRVUZyUWl4RFFVRkRMRU5CUVVNN08xRkJSVzVETEVsQlFVa3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNRMEZCUXl4RlFVRkZPMVZCUTNSRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiVUpCUVcxQ0xFTkJRVU1zUTBGQlF6dFRRVU55UXp0UlFVTkVMRWxCUVVrc1VVRkJVU3hGUVVGRk8xbEJRMVlzU1VGQlNTeFBRVUZQTEVWQlFVVTdaMEpCUTFRc1NVRkJTU3hEUVVGRExHRkJRV0VzUTBGQlF5eHpRa0ZCYzBJc1IwRkJSeXhSUVVGUkxFTkJRVU1zU1VGQlNTeEhRVUZITEdOQlFXTXNRMEZCUXl4RFFVRkRPMkZCUXk5RkxFMUJRVTA3WjBKQlEwZ3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXh0UWtGQmJVSXNSMEZCUnl4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzJkQ1FVTXpSQ3hKUVVGSkxFTkJRVU1zVjBGQlZ5eERRVUZETEhOQ1FVRnpRaXhIUVVGSExGRkJRVkVzUTBGQlF5eEpRVUZKTEVkQlFVY3NXVUZCV1N4RFFVRkRMRU5CUVVNN1lVRkRNMFU3VTBGRFNqdEJRVU5VTEV0QlFVczdRVUZEVER0QlFVTkJPMEZCUTBFN08wbEJSVWtzYjBKQlFXOUNMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRGNrTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1QwRkJUeXhEUVVGRExGbEJRVmtzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhKUVVGSkxFbEJRVWtzUlVGQlJTeERRVUZETzBGQlEzaEZMRkZCUVZFc1QwRkJUeXhEUVVGRExGbEJRVmtzUTBGQlF5eG5Ra0ZCWjBJc1JVRkJSU3hSUVVGUkxFTkJRVU1zUTBGQlF6czdVVUZGYWtRc1NVRkJTU3hQUVVGUExFZEJRVWNzVDBGQlR5eERRVUZETEZOQlFWTXNSVUZCUlN4RFFVRkRMRk5CUVZNc1EwRkJRenRSUVVNMVF5eEpRVUZKTEZsQlFWa3NSMEZCUnl4RlFVRkZMRU5CUVVNN1VVRkRkRUlzU1VGQlNTeFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1JVRkJSU3hKUVVGSkxFMUJRVTBzU1VGQlNTeFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1JVRkJSU3hKUVVGSkxFMUJRVTBzUlVGQlJUdFpRVU53Uml4WlFVRlpMRWRCUVVjc1EwRkJReXhQUVVGUExFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdVMEZEY0VNc1RVRkJUVHRaUVVOSUxGbEJRVmtzUjBGQlJ5eGpRVUZqTEVOQlFVTXNUMEZCVHl4RlFVRkZMRkZCUVZFc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dFRRVU42UkR0UlFVTkVMRTlCUVU4N1dVRkRTQ3hSUVVGUkxFVkJRVVVzVVVGQlVUdFpRVU5zUWl4VFFVRlRMRVZCUVVVc1dVRkJXVHRUUVVNeFFpeERRVUZETzBGQlExWXNTMEZCU3pzN1NVRkZSQ3hoUVVGaExFVkJRVVVzVlVGQlZTeFRRVUZUTEVWQlFVVXNTVUZCU1N4RlFVRkZMRWRCUVVjc1JVRkJSVHRSUVVNelF5eEpRVUZKTEVsQlFVa3NRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hKUVVGSkxFTkJRVU1zV1VGQldTeEZRVUZGTEVWQlFVVTdXVUZETTBNc1NVRkJTU3hQUVVGUExFZEJRVWNzU1VGQlNTeFhRVUZYTEVWQlFVVTdaMEpCUXpOQ0xFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRXRCUVVzc1EwRkJReXhOUVVGTkxFTkJRVU03WVVGRGFrTTdXVUZEUkN4TFFVRkxMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eEhRVUZITzJkQ1FVTm1MRk5CUVZNc1JVRkJSU3hUUVVGVE8yZENRVU53UWl4VFFVRlRMRVZCUVVVc1NVRkJTU3hKUVVGSkxFVkJRVVVzUTBGQlF5eFBRVUZQTEVWQlFVVTdaMEpCUXk5Q0xFbEJRVWtzUlVGQlJTeEpRVUZKTzJGQlEySXNRMEZCUXp0WlFVTkdMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zYTBKQlFXdENMRU5CUVVNc1EwRkJRenRUUVVOMFF6dExRVU5LTzBsQlEwUXNVMEZCVXl4RlFVRkZMRlZCUVZVc1IwRkJSeXhGUVVGRkxGRkJRVkVzUlVGQlJUdFJRVU5vUXl4SlFVRkpMR05CUVdNc1NVRkJTU3hqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTzFsQlEzcERMRXRCUVVzc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVOQlFVTXNSMEZCUnl4alFVRmpMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzJkQ1FVTTFReXhqUVVGakxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1JVRkJSU3hSUVVGUkxFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdZVUZET1VNN1UwRkRTanRMUVVOS08wbEJRMFFzVjBGQlZ5eEZRVUZGTEZWQlFWVXNTMEZCU3l4RlFVRkZMRkZCUVZFc1JVRkJSVHRSUVVOd1F5eEpRVUZKTEdOQlFXTXNTVUZCU1N4alFVRmpMRU5CUVVNc1RVRkJUU3hGUVVGRk8xbEJRM3BETEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eGpRVUZqTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8yZENRVU0xUXl4alFVRmpMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zUzBGQlN5eERRVUZETEV0QlFVc3NSVUZCUlN4UlFVRlJMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03WVVGRGJFUTdVMEZEU2p0TFFVTktPMGxCUTBRc1lVRkJZU3hGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTEZGQlFWRXNSVUZCUlR0UlFVTjRReXhKUVVGSkxHTkJRV01zU1VGQlNTeGpRVUZqTEVOQlFVTXNUVUZCVFN4RlFVRkZPMWxCUTNwRExFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhqUVVGakxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNMVF5eGpRVUZqTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFOUJRVThzUlVGQlJTeFJRVUZSTEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1lVRkRkRVE3VTBGRFNqdExRVU5LTzBsQlEwUXNaMEpCUVdkQ0xFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVTdVVUZEYWtNc1UwRkJVeXhEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXp0TFFVTXpRanRKUVVORUxHMUNRVUZ0UWl4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRM0JETEZsQlFWa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03UzBGRE9VSTdTVUZEUkN4eFFrRkJjVUlzUlVGQlJTeFZRVUZWTEU5QlFVOHNSVUZCUlR0UlFVTjBReXhqUVVGakxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMHRCUTJoRE8wbEJRMFFzYlVKQlFXMUNMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRGNFTXNXVUZCV1N4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dExRVU01UWp0SlFVTkVMREpDUVVFeVFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUXpWRExHOUNRVUZ2UWl4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dExRVU4wUXp0SlFVTkVMRmRCUVZjc1JVRkJSU3hYUVVGWE8xRkJRM0JDTEU5QlFVOHNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhOUVVGTkxFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJRenRMUVVOMlJEdEpRVU5FTEZOQlFWTXNSVUZCUlN4WFFVRlhPMUZCUTJ4Q0xFOUJRVThzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTnlSRHRKUVVORUxGbEJRVmtzUlVGQlJTeFRRVUZUTEZWQlFWVXNSVUZCUlR0UlFVTXZRaXhKUVVGSkxFOUJRVThzVlVGQlZTeExRVUZMTEZkQlFWY3NTMEZCU3l4SlFVRkpMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzU1VGQlNTeERRVUZETEZsQlFWa3NSVUZCUlN4RFFVRkRMRVZCUVVVN1dVRkRiRVlzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1ZVRkJWU3hIUVVGSExGbEJRVmtzUjBGQlJ5eFhRVUZYTEVOQlFVTTdXVUZETlVRc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eHZRa0ZCYjBJc1EwRkJReXhEUVVGRE8xTkJRM2hETzFGQlEwUXNUMEZCVHl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFMUJRVTBzUTBGQlF5eFBRVUZQTEVOQlFVTXNXVUZCV1N4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8wdEJRM2hFTzBsQlEwUXNZVUZCWVN4RlFVRkZMRlZCUVZVc1NVRkJTU3hGUVVGRk8xRkJRek5DTEVsQlFVa3NTVUZCU1N4TFFVRkxMRXRCUVVzc1JVRkJSVHRaUVVOb1FpeEpRVUZKTEZkQlFWY3NSMEZCUnp0blFrRkRaQ3hMUVVGTExFVkJRVVVzUzBGQlN5eERRVUZETEV0QlFVczdRVUZEYkVNc1lVRkJZU3hEUVVGRE96dEJRVVZrTEZsQlFWa3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhYUVVGWExFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdPMWxCUlRWQ0xFbEJRVWtzUTBGQlF5eFhRVUZYTEVOQlFVTXNTVUZCU1N4RlFVRkZPMmRDUVVOdVFpeFhRVUZYTEVOQlFVTXNTVUZCU1N4SFFVRkhMRTFCUVUwc1EwRkJReXh4UWtGQmNVSXNRMEZCUXl4RFFVRkRPMEZCUTJwRkxHRkJRV0U3TzFsQlJVUXNTVUZCU1N4WFFVRlhMRU5CUVVNc1NVRkJTU3hGUVVGRk8wRkJRMnhETEdkQ1FVRm5RaXhMUVVGTExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NRMEZCUXl4WFFVRlhMRU5CUVVNc1EwRkJRenM3WjBKQlJXeERMRWxCUVVrc1dVRkJXU3hKUVVGSkxGbEJRVmtzUTBGQlF5eE5RVUZOTEVWQlFVVTdiMEpCUTNKRExFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhaUVVGWkxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPM2RDUVVNeFF5eFpRVUZaTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzNGQ1FVTjBRenRwUWtGRFNqdGhRVU5LTzBGQlEySXNVMEZCVXpzN1FVRkZWQ3hSUVVGUkxFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPenRCUVVWb1F5eFJRVUZSTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNRMEZCUXpzN1VVRkZjRU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4dFFrRkJiVUlzUlVGQlJTeFhRVUZYTEVOQlFVTXNRMEZCUXp0QlFVTjZSQ3hMUVVGTE96dEpRVVZFTEZsQlFWa3NSVUZCUlN4WlFVRlpPMUZCUTNSQ0xFbEJRVWtzVVVGQlVTeEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4SlFVRkpMRWxCUVVrc1VVRkJVU3hEUVVGRE8xVkJRM1pGTEdOQlFXTXNSVUZCUlN4SlFVRkpPMU5CUTNKQ0xFTkJRVU1zUTBGQlF6dFJRVU5JTEVsQlFVa3NiMEpCUVc5Q0xFTkJRVU1zVFVGQlRTeEhRVUZITEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhYUVVGWExFVkJRVVVzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRVZCUVVVc1JVRkJSVHRaUVVNM1JTeFBRVUZQTEVsQlFVa3NUMEZCVHl4RFFVRkRMRlZCUVZVc1QwRkJUeXhGUVVGRkxFMUJRVTBzUlVGQlJUdG5Ra0ZETVVNc2IwSkJRVzlDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1ZVRkJWU3hKUVVGSkxFVkJRVVU3YjBKQlEzQkRMRkZCUVZFc1EwRkJReXhYUVVGWExFTkJRVU1zU1VGQlNTeERRVUZETEVOQlFVTTdiMEpCUXpOQ0xFOUJRVThzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXp0cFFrRkRja0lzUlVGQlJTeFpRVUZaTzI5Q1FVTllMRTlCUVU4c1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF6dHBRa0ZEY2tJc1EwRkJReXhEUVVGRE8yRkJRMDRzUTBGQlF5eERRVUZETzFOQlEwNHNUVUZCVFR0WlFVTklMRTlCUVU4c1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXp0VFFVTndRenRCUVVOVUxFdEJRVXM3TzBsQlJVUXNiMEpCUVc5Q0xFVkJRVVVzV1VGQldUdFJRVU01UWl4SlFVRkpMRmxCUVZrc1IwRkJSeXhaUVVGWkxFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPMUZCUTJoRUxFbEJRVWtzV1VGQldTeEZRVUZGTzBGQlF6RkNMRmxCUVZrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNN08xbEJSV3BETEVsQlFVa3NTMEZCU3l4RFFVRkRMRkZCUVZFc1JVRkJSVHRuUWtGRGFFSXNTVUZCU1N4WFFVRlhMRWRCUVVjc1NVRkJTU3hSUVVGUkxFVkJRVVVzUTBGQlF6dG5Ra0ZEYWtNc1YwRkJWeXhEUVVGRExGRkJRVkVzUjBGQlJ5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRkZCUVZFc1EwRkJRenRuUWtGREwwTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1IwRkJSeXhMUVVGTExFTkJRVU1zVVVGQlVTeERRVUZETEdWQlFXVXNRMEZCUXp0blFrRkRkRVFzUzBGQlN5eERRVUZETEZGQlFWRXNSMEZCUnl4WFFVRlhMRU5CUVVNN1lVRkRhRU03VTBGRFNpeE5RVUZOTzFsQlEwZ3NTMEZCU3l4SFFVRkhPMmRDUVVOS0xFMUJRVTBzUlVGQlJTeGpRVUZqTzJkQ1FVTjBRaXhUUVVGVExFVkJRVVVzUlVGQlJUdGhRVU5vUWl4RFFVRkRPMU5CUTB3N1VVRkRSQ3hQUVVGUExFdEJRVXNzUTBGQlF6dEJRVU55UWl4TFFVRkxPenRKUVVWRUxHdENRVUZyUWl4RlFVRkZMRlZCUVZVc1UwRkJVeXhGUVVGRk8xRkJRM0pETEVsQlFVa3NVMEZCVXl4RlFVRkZPMWxCUTFnc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eE5RVUZOTEVWQlFVVXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETzFOQlF6TkVMRTFCUVUwN1dVRkRTQ3haUVVGWkxFTkJRVU1zVlVGQlZTeERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPMU5CUTI1RE8wRkJRMVFzUzBGQlN6czdTVUZGUkN4TlFVRk5MRVZCUVVVc1dVRkJXVHRSUVVOb1FpeEpRVUZKTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdTMEZEYkVNN1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNVMEZCVXl4bFFVRmxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFdEJRVXNzUlVGQlJUdEpRVU5xUXl4RFFVRkRMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zVjBGQlZ5eERRVUZETEdGQlFXRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenRCUVVNM1F5eERRVUZET3p0QlFVVkVMRk5CUVZNc1YwRkJWeXhEUVVGRExFZEJRVWNzUlVGQlJTeExRVUZMTEVWQlFVVTdTVUZETjBJc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEZkQlFWY3NRMEZCUXl4WlFVRlpMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03UVVGRE5VTXNRMEZCUXpzN1FVRkZSRHRCUVVOQk8wRkJRMEU3TzBkQlJVYzdRVUZEU0N4VFFVRlRMRzFDUVVGdFFpeERRVUZETEVkQlFVY3NSVUZCUlR0SlFVTTVRaXhQUVVGUExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU1zVFVGQlRTeEpRVUZKTEVOQlFVTTdWVUZEY0VNc1IwRkJSeXhEUVVGRExGRkJRVkVzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4UFFVRlBMRU5CUVVNN1FVRkRhRVFzUTBGQlF6czdRVUZGUkRzN1IwRkZSenRCUVVOSUxGTkJRVk1zWjBKQlFXZENMRU5CUVVNc1IwRkJSeXhGUVVGRk8wVkJRemRDTEU5QlFVOHNRMEZCUXl4SFFVRkhMRU5CUVVNc1dVRkJXU3hKUVVGSkxFZEJRVWNzUTBGQlF5eFpRVUZaTEVOQlFVTXNZVUZCWVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4bFFVRmxMRU5CUVVNc1EwRkJReXhOUVVGTkxFZEJRVWNzUTBGQlF5eERRVUZETzBGQlF6VkhMRU5CUVVNN08wRkJSVVE3TzBkQlJVYzdRVUZEU0N4VFFVRlRMR2xDUVVGcFFpeERRVUZETEVkQlFVY3NSVUZCUlN4SFFVRkhMRVZCUVVVN1JVRkRia01zU1VGQlNTeFBRVUZQTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEd0Q1FVRnJRaXhIUVVGSExFZEJRVWNzUTBGQlF5eERRVUZETzBWQlEyaEZMRWxCUVVrc1lVRkJZU3hKUVVGSkxFOUJRVThzUzBGQlN5eEpRVUZKTEVsQlFVa3NUMEZCVHl4TFFVRkxMRTFCUVUwc1NVRkJTU3hQUVVGUExFOUJRVThzUzBGQlN5eFhRVUZYTEVOQlFVTXNRMEZCUXp0RlFVTXZSaXhQUVVGUExFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4aFFVRmhMRWxCUVVrc2JVSkJRVzFDTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRla1VzUTBGQlF6czdRVUZGUkN4SlFVRkpMRTFCUVUwc1IwRkJSeXhGUVVGRkxFTkJRVU03TzBGQlJXaENMRk5CUVZNc2FVSkJRV2xDTEVkQlFVYzdPMGxCUlhwQ0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhOUVVGTkxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMUZCUTNCRExGRkJRVkVzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVXNRMEZCUXl4VlFVRlZMRWRCUVVjc1JVRkJSVHRaUVVOcVJDeEpRVUZKTEU5QlFVOHNSMEZCUnl4VlFVRlZMRU5CUVVNc1JVRkJSVHRuUWtGRGRrSXNTVUZCU1N4RFFVRkRMRU5CUVVNc1UwRkJVenRCUVVNdlFpeHZRa0ZCYjBJc1QwRkJUenM3UVVGRk0wSXNaMEpCUVdkQ0xFbEJRVWtzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEVsQlFVa3NTVUZCU1N4RFFVRkRMRmRCUVZjc1JVRkJSU3hGUVVGRk96dHpRa0ZGYWtRc1NVRkJTU3hIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hEUVVGRE8zTkNRVU5zUXl4SlFVRkpMRWxCUVVrc1IwRkJSenQzUWtGRFZDeFBRVUZQTEVWQlFVVXNTVUZCU1N4RFFVRkRMRzlDUVVGdlFpeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNN2RVSkJRemRETEVOQlFVTTdRVUZEZUVJc2MwSkJRWE5DTEVsQlFVa3NTMEZCU3l4RFFVRkRPenR6UWtGRlZpeEpRVUZKTEVkQlFVY3NTVUZCU1N4WFFVRlhMRVZCUVVVN01FSkJRM0JDTEdWQlFXVXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZET3pCQ1FVTm9ReXhOUVVGTkxFTkJRVU1zU1VGQlNTeERRVUZET3poQ1FVTlNMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVFVGQlRUczRRa0ZEYWtJc1MwRkJTeXhGUVVGRkxGVkJRVlVzUTBGQlF5eFpRVUZaTzJ0RFFVTXhRaXhYUVVGWExFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenRyUTBGRE5VSXNaVUZCWlN4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdLMEpCUTNCRExFVkJRVVVzUjBGQlJ5eERRVUZET3pKQ1FVTldMRU5CUVVNc1EwRkJRenRCUVVNM1FpeDFRa0ZCZFVJN08zTkNRVVZFTEVsQlFVa3NSMEZCUnl4SlFVRkpMRlZCUVZVc1JVRkJSVHN3UWtGRGJrSXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3T0VKQlEzQkRMRWxCUVVrc1RVRkJUU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEU5QlFVOHNTVUZCU1N4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRk8ydERRVU12UWl4WlFVRlpMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMnREUVVNNVFpeE5RVUZOTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU1zUTBGQlF6dHJRMEZEY0VJc1RVRkJUVHNyUWtGRFZEc3lRa0ZEU2pzd1FrRkRSQ3hsUVVGbExFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenN3UWtGRGFrTXNWMEZCVnl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdRVUZEZGtRc2RVSkJRWFZDT3p0elFrRkZSQ3hKUVVGSkxHbENRVUZwUWl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzUjBGQlJ5eERRVUZETEVWQlFVVTdkMEpCUTNCRExFbEJRVWtzUTBGQlF5eERRVUZETEV0QlFVc3NTVUZCU1N4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRk96QkNRVU4yUWl4SlFVRkpMRU5CUVVNc1RVRkJUU3hIUVVGSExFTkJRVU1zUTBGQlF5eExRVUZMTEVsQlFVa3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJRenRCUVVNMVJDeDVRa0ZCZVVJN08zZENRVVZFTEVsQlFVa3NSMEZCUnl4SlFVRkpMRkZCUVZFc1JVRkJSVHN3UWtGRGJrSXNTVUZCU1N4RFFVRkRMRlZCUVZVc1IwRkJSenMwUWtGRGFFSXNUMEZCVHl4SFFVRkhMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUzBGQlN6czBRa0ZEZUVJc1UwRkJVeXhGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNUMEZCVHpzMFFrRkRNMElzVlVGQlZTeEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1VVRkJVVHN5UWtGRE9VSXNRMEZCUXp0QlFVTTFRaXg1UWtGQmVVSTdPM2RDUVVWRUxFbEJRVWtzUTBGQlF5eGhRVUZoTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWxCUVVrc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6dDFRa0ZEY0VNN1FVRkRka0lzYVVKQlFXbENPenRCUVVWcVFpeGhRVUZoTEVOQlFVTTdRVUZEWkRzN1dVRkZXU3hEUVVGRExFbEJRVWtzUTBGQlF5eGpRVUZqTEVkQlFVY3NTVUZCU1N4RFFVRkRMR05CUVdNc1NVRkJTU3hGUVVGRkxFVkJRVVVzUjBGQlJ5eERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRPMWxCUTJwRkxFOUJRVThzVDBGQlR5eERRVUZETzFOQlEyeENMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1FVRkROMElzUzBGQlN6czdTVUZGUkN4SlFVRkpMRk5CUVZNc1IwRkJSenRSUVVOYUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdEJRVU51UWl4TFFVRkxMRU5CUVVNN08wbEJSVVlzU1VGQlNTeFJRVUZSTEVkQlFVYzdVVUZEV0N4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVsQlFVazdVVUZEVml4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1FVRkRha0lzUzBGQlN5eERRVUZET3p0SlFVVkdMRk5CUVZNc1pVRkJaU3hGUVVGRkxFTkJRVU1zUlVGQlJUdFJRVU42UWl4SlFVRkpMRU5CUVVNc1EwRkJReXhUUVVGVE8wRkJRM1pDTEZsQlFWa3NUMEZCVHpzN1VVRkZXQ3hKUVVGSkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eEpRVUZKTEdsQ1FVRnBRaXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVWQlFVVXNWVUZCVlN4RFFVRkRMRVZCUVVVN1FVRkRjRVlzV1VGQldTeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1MwRkJTeXhEUVVGRE8wRkJRelZDTzBGQlEwRTdPMWxCUlZrc1NVRkJTU3hUUVVGVExFTkJRVU1zWTBGQll5eERRVUZETEVOQlFVTXNRMEZCUXl4RlFVRkZPMmRDUVVNM1FpeERRVUZETEVkQlFVY3NVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRMnBETEdGQlFXRTdPMWxCUlVRc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eFJRVUZSTEV0QlFVc3NRMEZCUXl4SlFVRkpMRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETEVWQlFVVTdaMEpCUTNKRExFTkJRVU1zUjBGQlJ5eE5RVUZOTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNc1IwRkJSeXhGUVVGRkxFTkJRVU1zUTBGQlF6dEJRVU5vUkN4aFFVRmhMRTFCUVUwc1NVRkJTU3hEUVVGRExFTkJRVU1zVVVGQlVTeEpRVUZKTEZGQlFWRXNRMEZCUXl4alFVRmpMRU5CUVVNc1EwRkJReXhEUVVGRExFVkJRVVU3TzJkQ1FVVnFSQ3hEUVVGRExFZEJRVWNzVVVGQlVTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTI1Q0xFMUJRVTA3WjBKQlEwZ3NRMEZCUXl4SFFVRkhMRTFCUVUwc1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdRVUZETTBNc1lVRkJZVHM3V1VGRlJDeEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRlZCUVZVc1JVRkJSVHRuUWtGRE0wSXNUMEZCVHl4RlFVRkZMRWxCUVVrc1EwRkJReXh2UWtGQmIwSXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRE8yZENRVU0xUXl4SFFVRkhMRVZCUVVVc1EwRkJRenRuUWtGRFRpeFRRVUZUTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhMUVVGTE8yZENRVU42UWl4TFFVRkxMRVZCUVVVc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eExRVUZMTEVkQlFVY3NRMEZCUXp0blFrRkRla0lzVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBPMkZCUTNKQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTzBGQlExUXNTMEZCU3pzN1FVRkZUQ3hKUVVGSkxGRkJRVkVzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhWUVVGVkxFVkJRVVVzWlVGQlpTeEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMEZCUTJwRk96dEpRVVZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMR05CUVdNc1IwRkJSeXhKUVVGSkxFTkJRVU1zWTBGQll5eEpRVUZKTEVWQlFVVXNSVUZCUlN4VlFVRlZMRU5CUVVNc1IwRkJSeXhsUVVGbExFTkJRVU03UVVGRGNFWXNRMEZCUXpzN1FVRkZSQ3hUUVVGVExHdENRVUZyUWl4RFFVRkRMRWxCUVVrc1JVRkJSVHRKUVVNNVFpeEpRVUZKTEVkQlFVY3NTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhOUVVGTkxFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRTFCUVUwc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF6dEpRVU14UkN4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRmRCUVZjc1EwRkJRenRSUVVOcVJDeFBRVUZQTEVkQlFVY3NTMEZCU3l4RFFVRkRMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTTdTVUZETVVNc1QwRkJUeXhQUVVGUExFdEJRVXNzU1VGQlNTeEhRVUZITEVWQlFVVXNSMEZCUnl4clFrRkJhMElzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFdEJRVXNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTNSR0xFTkJRVU03TzBGQlJVUXNVMEZCVXl4aFFVRmhMRWRCUVVjN1JVRkRka0lzU1VGQlNTeFJRVUZSTEVOQlFVTXNWVUZCVlN4SlFVRkpMRlZCUVZVc1JVRkJSVHRCUVVONlF5eEpRVUZKTEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJReXhKUVVGSkxFTkJRVU1zV1VGQldUczdRVUZGYWtNc1VVRkJVU3hwUWtGQmFVSXNSVUZCUlN4RFFVRkRPenRSUVVWd1FpeEpRVUZKTEVsQlFVa3NRMEZCUXl4WFFVRlhMRVZCUVVVc1JVRkJSVHRaUVVOd1FpeEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRTFCUVUwc1JVRkJSVHRuUWtGRGRrSXNSMEZCUnl4RlFVRkZPMjlDUVVORUxGRkJRVkVzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRkZCUVZFN2IwSkJRMnhETEVsQlFVa3NSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFbEJRVWs3YjBKQlF6RkNMRTFCUVUwc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEUxQlFVMDdiMEpCUXpsQ0xFbEJRVWtzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrN2FVSkJRemRDTzJGQlEwb3NRMEZCUXl4RFFVRkRPMU5CUTA0N1MwRkRTaXhEUVVGRExFTkJRVU03UjBGRFNqdEJRVU5JTEVOQlFVTTdPMEZCUlVRc1lVRkJZU3hGUVVGRkxFTkJRVU03UVVGRGFFSXNVVUZCVVN4RFFVRkRMR2RDUVVGblFpeERRVUZETEd0Q1FVRnJRaXhGUVVGRkxHRkJRV0VzUTBGQlF5eERRVUZET3p0QlFVVTNSQ3hOUVVGTkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hGUVVGRkxGbEJRVms3U1VGRE1VTXNTVUZCU1N4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRE8wRkJRMnhDTEVOQlFVTXNSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenM3UVVGRlZDeE5RVUZOTEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zVDBGQlR5eEZRVUZGTEZWQlFWVXNSMEZCUnl4RlFVRkZPMGxCUXpWRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNaMEpCUVdkQ0xFZEJRVWNzUjBGQlJ5eERRVUZETEU5QlFVOHNSMEZCUnl4SFFVRkhMRWRCUVVjc1IwRkJSeXhEUVVGRExFZEJRVWNzUjBGQlJ5eEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRWxCUVVrc1IwRkJSeXhIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMEZCUTNCSExFTkJRVU1zUTBGQlF5eERRVUZET3p0QlFVVklMRTFCUVUwc1EwRkJReXhQUVVGUExFZEJRVWNzU1VGQlNTeERRVUZESWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaWRtRnlJRjhnUFNCeVpYRjFhWEpsS0NjdUwzVjBhV3h6SnlrN1hHNTJZWElnVUhKdmJXbHpaU0E5SUhKbGNYVnBjbVVvSjJWek5pMXdjbTl0YVhObEp5a3VVSEp2YldselpUdGNiblpoY2lCVGFXMTFiR0YwWlNBOUlISmxjWFZwY21Vb0p5NHZjMmx0ZFd4aGRHVW5LVHRjYm5aaGNpQnpaV3hsWTNSdmNrWnBibVJsY2lBOUlISmxjWFZwY21Vb0p5NHZjMlZzWldOMGIzSkdhVzVrWlhJbktUdGNiblpoY2lCVFpYUjBhVzVuY3lBOUlISmxjWFZwY21Vb0p5NHZjMlYwZEdsdVozTW5LVHRjYmx4dUx5OGdkbUZ5SUcxNVIyVnVaWEpoZEc5eUlEMGdibVYzSUVOemMxTmxiR1ZqZEc5eVIyVnVaWEpoZEc5eUtDazdYRzUyWVhJZ2FXMXdiM0owWVc1MFUzUmxjRXhsYm1kMGFDQTlJRFV3TUR0Y2JuWmhjaUJ6WVhabFNHRnVaR3hsY25NZ1BTQmJYVHRjYm5aaGNpQnlaWEJ2Y25SSVlXNWtiR1Z5Y3lBOUlGdGRPMXh1ZG1GeUlHeHZZV1JJWVc1a2JHVnljeUE5SUZ0ZE8xeHVkbUZ5SUhObGRIUnBibWR6VEc5aFpFaGhibVJzWlhKeklEMGdXMTA3WEc1Y2JtWjFibU4wYVc5dUlHZGxkRk5qWlc1aGNtbHZLRzVoYldVcElIdGNiaUFnSUNCeVpYUjFjbTRnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0Z0tISmxjMjlzZG1Vc0lISmxhbVZqZENrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYkc5aFpFaGhibVJzWlhKekxteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhOMFlYUmxJRDBnZFhSdFpTNXpkR0YwWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzNSaGRHVXVjMk5sYm1GeWFXOXpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExuTmpaVzVoY21sdmMxdHBYUzV1WVcxbElEMDlQU0J1WVcxbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMyOXNkbVVvYzNSaGRHVXVjMk5sYm1GeWFXOXpXMmxkS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNiMkZrU0dGdVpHeGxjbk5iTUYwb2JtRnRaU3dnWm5WdVkzUnBiMjRnS0hKbGMzQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOdmJIWmxLSEpsYzNBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUtUdGNibjFjYm5aaGNpQjJZV3hwWkdGMGFXNW5JRDBnWm1Gc2MyVTdYRzVjYm5aaGNpQmxkbVZ1ZEhNZ1BTQmJYRzRnSUNBZ0oyTnNhV05ySnl4Y2JpQWdJQ0FuWm05amRYTW5MRnh1SUNBZ0lDZGliSFZ5Snl4Y2JpQWdJQ0FuWkdKc1kyeHBZMnNuTEZ4dUlDQWdJQzh2SUNka2NtRm5KeXhjYmlBZ0lDQXZMeUFuWkhKaFoyVnVkR1Z5Snl4Y2JpQWdJQ0F2THlBblpISmhaMnhsWVhabEp5eGNiaUFnSUNBdkx5QW5aSEpoWjI5MlpYSW5MRnh1SUNBZ0lDOHZJQ2RrY21GbmMzUmhjblFuTEZ4dUlDQWdJQzh2SUNkcGJuQjFkQ2NzWEc0Z0lDQWdKMjF2ZFhObFpHOTNiaWNzWEc0Z0lDQWdMeThnSjIxdmRYTmxiVzkyWlNjc1hHNGdJQ0FnSjIxdmRYTmxaVzUwWlhJbkxGeHVJQ0FnSUNkdGIzVnpaV3hsWVhabEp5eGNiaUFnSUNBbmJXOTFjMlZ2ZFhRbkxGeHVJQ0FnSUNkdGIzVnpaVzkyWlhJbkxGeHVJQ0FnSUNkdGIzVnpaWFZ3Snl4Y2JpQWdJQ0FuWTJoaGJtZGxKeXhjYmlBZ0lDQXZMeUFuY21WemFYcGxKeXhjYmlBZ0lDQXZMeUFuYzJOeWIyeHNKMXh1WFR0Y2JseHVablZ1WTNScGIyNGdaMlYwUTI5dVpHbDBhVzl1Y3loelkyVnVZWEpwYnl3Z1kyOXVaR2wwYVc5dVZIbHdaU2tnZTF4dUlDQjJZWElnYzJWMGRYQWdQU0J6WTJWdVlYSnBiMXRqYjI1a2FYUnBiMjVVZVhCbFhUdGNiaUFnZG1GeUlITmpaVzVoY21sdmN5QTlJSE5sZEhWd0lDWW1JSE5sZEhWd0xuTmpaVzVoY21sdmN6dGNiaUFnTHk4Z1ZFOUVUem9nUW5KbFlXc2diM1YwSUdsdWRHOGdhR1ZzY0dWeVhHNGdJR2xtSUNoelkyVnVZWEpwYjNNcElIdGNiaUFnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzVoYkd3b1h5NXRZWEFvYzJObGJtRnlhVzl6TENCbWRXNWpkR2x2YmlBb2MyTmxibUZ5YVc5T1lXMWxLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaMlYwVTJObGJtRnlhVzhvYzJObGJtRnlhVzlPWVcxbEtTNTBhR1Z1S0daMWJtTjBhVzl1SUNodmRHaGxjbE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUc5MGFHVnlVMk5sYm1GeWFXOGdQU0JLVTA5T0xuQmhjbk5sS0VwVFQwNHVjM1J5YVc1bmFXWjVLRzkwYUdWeVUyTmxibUZ5YVc4cEtUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlITmxkSFZ3UTI5dVpHbDBhVzl1Y3lodmRHaGxjbE5qWlc1aGNtbHZLUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNCMllYSWdkRzlTWlhSMWNtNGdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJRzkwYUdWeVUyTmxibUZ5YVc4dWMzUmxjSE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSdlVtVjBkWEp1TG5CMWMyZ29iM1JvWlhKVFkyVnVZWEpwYnk1emRHVndjMXRwWFNrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIwYjFKbGRIVnlianRjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOUtUdGNiaUFnSUNCOUtTazdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdWNtVnpiMngyWlNoYlhTazdYRzRnSUgxY2JuMWNibHh1Wm5WdVkzUnBiMjRnWjJWMFVISmxZMjl1WkdsMGFXOXVjeUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdjbVYwZFhKdUlHZGxkRU52Ym1ScGRHbHZibk1vYzJObGJtRnlhVzhzSUNkelpYUjFjQ2NwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJuWlhSUWIzTjBZMjl1WkdsMGFXOXVjeUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdjbVYwZFhKdUlHZGxkRU52Ym1ScGRHbHZibk1vYzJObGJtRnlhVzhzSUNkamJHVmhiblZ3SnlrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUY5amIyNWpZWFJUWTJWdVlYSnBiMU4wWlhCTWFYTjBjeWh6ZEdWd2N5a2dlMXh1SUNBZ0lIWmhjaUJ1WlhkVGRHVndjeUE5SUZ0ZE8xeHVJQ0FnSUhaaGNpQmpkWEp5Wlc1MFZHbHRaWE4wWVcxd095QXZMeUJwYm1sMFlXeHBlbVZrSUdKNUlHWnBjbk4wSUd4cGMzUWdiMllnYzNSbGNITXVYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FpQTlJREE3SUdvZ1BDQnpkR1Z3Y3k1c1pXNW5kR2c3SUdvckt5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pteGhkRk4wWlhCeklEMGdjM1JsY0hOYmFsMDdYRzRnSUNBZ0lDQWdJR2xtSUNocUlENGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdheUE5SURBN0lHc2dQQ0J6ZEdWd2N5NXNaVzVuZEdnN0lHc3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkR1Z3SUQwZ1pteGhkRk4wWlhCelcydGRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCa2FXWm1JRDBnYXlBK0lEQWdQeUJ6ZEdWd0xuUnBiV1ZUZEdGdGNDQXRJR1pzWVhSVGRHVndjMXRySUMwZ01WMHVkR2x0WlZOMFlXMXdJRG9nTlRBN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kzVnljbVZ1ZEZScGJXVnpkR0Z0Y0NBclBTQmthV1ptTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdac1lYUlRkR1Z3YzF0clhTNTBhVzFsVTNSaGJYQWdQU0JqZFhKeVpXNTBWR2x0WlhOMFlXMXdPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTNWeWNtVnVkRlJwYldWemRHRnRjQ0E5SUdac1lYUlRkR1Z3YzF0cVhTNTBhVzFsVTNSaGJYQTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnYm1WM1UzUmxjSE1nUFNCdVpYZFRkR1Z3Y3k1amIyNWpZWFFvWm14aGRGTjBaWEJ6S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHNWxkMU4wWlhCek8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCelpYUjFjRU52Ym1ScGRHbHZibk1nS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnZG1GeUlIQnliMjFwYzJWeklEMGdXMTA3WEc0Z0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdVlXeHNLRnRjYmlBZ0lDQWdJQ0FnWjJWMFVISmxZMjl1WkdsMGFXOXVjeWh6WTJWdVlYSnBieWtzWEc0Z0lDQWdJQ0FnSUdkbGRGQnZjM1JqYjI1a2FYUnBiMjV6S0hOalpXNWhjbWx2S1Z4dUlDQWdJRjBwTG5Sb1pXNG9ablZ1WTNScGIyNGdLSE4wWlhCQmNuSmhlWE1wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE4wWlhCTWFYTjBjeUE5SUhOMFpYQkJjbkpoZVhOYk1GMHVZMjl1WTJGMEtGdHpZMlZ1WVhKcGJ5NXpkR1Z3YzEwc0lITjBaWEJCY25KaGVYTmJNVjBwTzF4dUlDQWdJQ0FnSUNCelkyVnVZWEpwYnk1emRHVndjeUE5SUY5amIyNWpZWFJUWTJWdVlYSnBiMU4wWlhCTWFYTjBjeWh6ZEdWd1RHbHpkSE1wTzF4dUlDQWdJSDBwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJ5ZFc1VGRHVndLSE5qWlc1aGNtbHZMQ0JwWkhnc0lIUnZVMnRwY0NrZ2UxeHVJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RTVlU1T1NVNUhYMU5VUlZBbktUdGNiaUFnSUNCMGIxTnJhWEFnUFNCMGIxTnJhWEFnZkh3Z2UzMDdYRzVjYmlBZ0lDQjJZWElnYzNSbGNDQTlJSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlRjA3WEc0Z0lDQWdkbUZ5SUhOMFlYUmxJRDBnZFhSdFpTNXpkR0YwWlR0Y2JpQWdJQ0JwWmlBb2MzUmxjQ0FtSmlCemRHRjBaUzV6ZEdGMGRYTWdQVDBnSjFCTVFWbEpUa2NuS1NCN1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5KMWJpNXpZMlZ1WVhKcGJ5QTlJSE5qWlc1aGNtbHZPMXh1SUNBZ0lDQWdJQ0J6ZEdGMFpTNXlkVzR1YzNSbGNFbHVaR1Y0SUQwZ2FXUjRPMXh1SUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oyeHZZV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNURzlqWVhScGIyNGdQU0J6ZEdWd0xtUmhkR0V1ZFhKc0xuQnliM1J2WTI5c0lDc2dYQ0l2TDF3aUlDc2djM1JsY0M1a1lYUmhMblZ5YkM1b2IzTjBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE5sWVhKamFDQTlJSE4wWlhBdVpHRjBZUzUxY213dWMyVmhjbU5vTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdoaGMyZ2dQU0J6ZEdWd0xtUmhkR0V1ZFhKc0xtaGhjMmc3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoelpXRnlZMmdnSmlZZ0lYTmxZWEpqYUM1amFHRnlRWFFvWENJL1hDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWaGNtTm9JRDBnWENJL1hDSWdLeUJ6WldGeVkyZzdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2FYTlRZVzFsVlZKTUlEMGdLR3h2WTJGMGFXOXVMbkJ5YjNSdlkyOXNJQ3NnWENJdkwxd2lJQ3NnYkc5allYUnBiMjR1YUc5emRDQXJJR3h2WTJGMGFXOXVMbk5sWVhKamFDa2dQVDA5SUNodVpYZE1iMk5oZEdsdmJpQXJJSE5sWVhKamFDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCM2FXNWtiM2N1Ykc5allYUnBiMjR1Y21Wd2JHRmpaU2h1WlhkTWIyTmhkR2x2YmlBcklHaGhjMmdnS3lCelpXRnlZMmdwTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6ZEdGMFpTNXpaWFIwYVc1bmN5NW5aWFFvWENKMlpYSmliM05sWENJcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHTnZibk52YkdVdWJHOW5LQ2hzYjJOaGRHbHZiaTV3Y205MGIyTnZiQ0FySUd4dlkyRjBhVzl1TG1odmMzUWdLeUJzYjJOaGRHbHZiaTV6WldGeVkyZ3BLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZMjl1YzI5c1pTNXNiMmNvS0hOMFpYQXVaR0YwWVM1MWNtd3VjSEp2ZEc5amIyd2dLeUJ6ZEdWd0xtUmhkR0V1ZFhKc0xtaHZjM1FnS3lCemRHVndMbVJoZEdFdWRYSnNMbk5sWVhKamFDa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QkpaaUIzWlNCb1lYWmxJRzV2ZENCamFHRnVaMlZrSUhSb1pTQmhZM1IxWVd3Z2JHOWpZWFJwYjI0c0lIUm9aVzRnZEdobElHeHZZMkYwYVc5dUxuSmxjR3hoWTJWY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhkcGJHd2dibTkwSUdkdklHRnVlWGRvWlhKbFhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2FYTlRZVzFsVlZKTUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkMmx1Wkc5M0xteHZZMkYwYVc5dUxuSmxiRzloWkNoMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkMGFXMWxiM1YwSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBZWFJsTG1GMWRHOVNkVzRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNU9aWGgwVTNSbGNDaHpZMlZ1WVhKcGJ5d2dhV1I0TENCMGIxTnJhWEFzSUhOMFpYQXVaR0YwWVM1aGJXOTFiblFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR3h2WTJGMGIzSWdQU0J6ZEdWd0xtUmhkR0V1Ykc5allYUnZjanRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ6ZEdWd2N5QTlJSE5qWlc1aGNtbHZMbk4wWlhCek8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlIVnVhWEYxWlVsa0lEMGdaMlYwVlc1cGNYVmxTV1JHY205dFUzUmxjQ2h6ZEdWd0tUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdkSEo1SUhSdklHZGxkQ0J5YVdRZ2IyWWdkVzV1WldObGMzTmhjbmtnYzNSbGNITmNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2RHOVRhMmx3VzNWdWFYRjFaVWxrWFNBOVBTQW5kVzVrWldacGJtVmtKeUFtSmlCMWRHMWxMbk4wWVhSbExuTmxkSFJwYm1kekxtZGxkQ2hjSW5KMWJtNWxjaTV6Y0dWbFpGd2lLU0FoUFNBbmNtVmhiSFJwYldVbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJrYVdabU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhV2R1YjNKbElEMGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdvZ1BTQnpkR1Z3Y3k1c1pXNW5kR2dnTFNBeE95QnFJRDRnYVdSNE95QnFMUzBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdiM1JvWlhKVGRHVndJRDBnYzNSbGNITmJhbDA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHOTBhR1Z5Vlc1cGNYVmxTV1FnUFNCblpYUlZibWx4ZFdWSlpFWnliMjFUZEdWd0tHOTBhR1Z5VTNSbGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hWdWFYRjFaVWxrSUQwOVBTQnZkR2hsY2xWdWFYRjFaVWxrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVdScFptWXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmthV1ptSUQwZ0tHOTBhR1Z5VTNSbGNDNTBhVzFsVTNSaGJYQWdMU0J6ZEdWd0xuUnBiV1ZUZEdGdGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXZHViM0psSUQwZ0lXbHpTVzF3YjNKMFlXNTBVM1JsY0NodmRHaGxjbE4wWlhBcElDWW1JR1JwWm1ZZ1BDQnBiWEJ2Y25SaGJuUlRkR1Z3VEdWdVozUm9PMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNocGMwbHVkR1Z5WVdOMGFYWmxVM1JsY0NodmRHaGxjbE4wWlhBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXZHViM0psSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzlUYTJsd1czVnVhWEYxWlVsa1hTQTlJR2xuYm05eVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1YyVW5jbVVnYzJ0cGNIQnBibWNnZEdocGN5QmxiR1Z0Wlc1MFhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RHOVRhMmx3VzJkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2xkS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVUbVY0ZEZOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUN3Z2RHOVRhMmx3S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabWx1WkVWc1pXMWxiblJYYVhSb1RHOWpZWFJ2Y2loelkyVnVZWEpwYnl3Z2MzUmxjQ3dnYkc5allYUnZjaXdnWjJWMFZHbHRaVzkxZENoelkyVnVZWEpwYnl3Z2FXUjRLU2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9aV3hsY3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdWc1pTQTlJR1ZzWlhOYk1GMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2RHRm5UbUZ0WlNBOUlHVnNaUzUwWVdkT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzNWd2NHOXlkSE5KYm5CMWRFVjJaVzUwSUQwZ2RHRm5UbUZ0WlNBOVBUMGdKMmx1Y0hWMEp5QjhmQ0IwWVdkT1lXMWxJRDA5UFNBbmRHVjRkR0Z5WldFbklIeDhJR1ZzWlM1blpYUkJkSFJ5YVdKMWRHVW9KMk52Ym5SbGJuUmxaR2wwWVdKc1pTY3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFpsYm5SekxtbHVaR1Y0VDJZb2MzUmxjQzVsZG1WdWRFNWhiV1VwSUQ0OUlEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJRzl3ZEdsdmJuTWdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaR0YwWVM1aWRYUjBiMjRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2Y0hScGIyNXpMbmRvYVdOb0lEMGdiM0IwYVc5dWN5NWlkWFIwYjI0Z1BTQnpkR1Z3TG1SaGRHRXVZblYwZEc5dU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdMeThnWTI5dWMyOXNaUzVzYjJjb0oxTnBiWFZzWVhScGJtY2dKeUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnSnlCdmJpQmxiR1Z0Wlc1MElDY3NJR1ZzWlN3Z2JHOWpZWFJ2Y2k1elpXeGxZM1J2Y25OYk1GMHNJRndpSUdadmNpQnpkR1Z3SUZ3aUlDc2dhV1I0S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkamJHbGpheWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FrS0dWc1pTa3VkSEpwWjJkbGNpZ25ZMnhwWTJzbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNnb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oyWnZZM1Z6SnlCOGZDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBOVBTQW5ZbXgxY2ljcElDWW1JR1ZzWlZ0emRHVndMbVYyWlc1MFRtRnRaVjBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdWYmMzUmxjQzVsZG1WdWRFNWhiV1ZkS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdWYmMzUmxjQzVsZG1WdWRFNWhiV1ZkS0dWc1pTd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhOMFpYQXVaR0YwWVM1MllXeDFaU0FoUFNCY0luVnVaR1ZtYVc1bFpGd2lJSHg4SUhSNWNHVnZaaUJ6ZEdWd0xtUmhkR0V1WVhSMGNtbGlkWFJsY3lBaFBTQmNJblZ1WkdWbWFXNWxaRndpS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlIUnZRWEJ3YkhrZ1BTQnpkR1Z3TG1SaGRHRXVZWFIwY21saWRYUmxjeUEvSUhOMFpYQXVaR0YwWVM1aGRIUnlhV0oxZEdWeklEb2dleUJjSW5aaGJIVmxYQ0k2SUhOMFpYQXVaR0YwWVM1MllXeDFaU0I5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRjh1WlhoMFpXNWtLR1ZzWlN3Z2RHOUJjSEJzZVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1JtOXlJR0p5YjNkelpYSnpJSFJvWVhRZ2MzVndjRzl5ZENCMGFHVWdhVzV3ZFhRZ1pYWmxiblF1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMWNIQnZjblJ6U1c1d2RYUkZkbVZ1ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdVdVpYWmxiblFvWld4bExDQW5hVzV3ZFhRbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1WlhabGJuUW9aV3hsTENBblkyaGhibWRsSnlrN0lDOHZJRlJvYVhNZ2MyaHZkV3hrSUdKbElHWnBjbVZrSUdGbWRHVnlJR0VnWW14MWNpQmxkbVZ1ZEM1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNSbGNDNWxkbVZ1ZEU1aGJXVWdQVDBnSjJ0bGVYQnlaWE56SnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2EyVjVJRDBnVTNSeWFXNW5MbVp5YjIxRGFHRnlRMjlrWlNoemRHVndMbVJoZEdFdWEyVjVRMjlrWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbXRsZVdSdmQyNG9aV3hsTENCclpYa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlM1clpYbHdjbVZ6Y3lobGJHVXNJR3RsZVNrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWld4bExuWmhiSFZsSUQwZ2MzUmxjQzVrWVhSaExuWmhiSFZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNWxkbVZ1ZENobGJHVXNJQ2RqYUdGdVoyVW5LVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNXJaWGwxY0NobGJHVXNJR3RsZVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRYQndiM0owYzBsdWNIVjBSWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtVjJaVzUwS0dWc1pTd2dKMmx1Y0hWMEp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBaWEF1WlhabGJuUk9ZVzFsSUQwOUlDZDJZV3hwWkdGMFpTY2dKaVlnZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9KM1psY21KdmMyVW5LU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnlnblZtRnNhV1JoZEdVNklDY2dLeUJLVTA5T0xuTjBjbWx1WjJsbWVTaHNiMk5oZEc5eUxuTmxiR1ZqZEc5eWN5a2dJQ3NnWENJZ1kyOXVkR0ZwYm5NZ2RHVjRkQ0FuWENJZ0lDc2djM1JsY0M1a1lYUmhMblJsZUhRZ0t5QmNJaWRjSWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1aGRYUnZVblZ1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYms1bGVIUlRkR1Z3S0hOalpXNWhjbWx2TENCcFpIZ3NJSFJ2VTJ0cGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN3Z1puVnVZM1JwYjI0Z0tISmxjM1ZzZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0ozWmhiR2xrWVhSbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVZtRnNhV1JoZEdVNklGd2lJQ3NnY21WemRXeDBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5OMGIzQlRZMlZ1WVhKcGJ5aG1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYVhOSmJYQnZjblJoYm5SVGRHVndLSE4wWlhBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRVZ5Y205eUtGd2lSbUZwYkdWa0lHOXVJSE4wWlhBNklGd2lJQ3NnYVdSNElDc2dYQ0lnSUVWMlpXNTBPaUJjSWlBcklITjBaWEF1WlhabGJuUk9ZVzFsSUNzZ1hDSWdVbVZoYzI5dU9pQmNJaUFySUhKbGMzVnNkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBiM0JUWTJWdVlYSnBieWhtWVd4elpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hWMGJXVXVjM1JoZEdVdWMyVjBkR2x1WjNNdVoyVjBLQ2QyWlhKaWIzTmxKeWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LSEpsYzNWc2RDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1aGRYUnZVblZ1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNU9aWGgwVTNSbGNDaHpZMlZ1WVhKcGJ5d2dhV1I0TENCMGIxTnJhWEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVmVnh1WEc1bWRXNWpkR2x2YmlCM1lXbDBSbTl5UVc1bmRXeGhjaWh5YjI5MFUyVnNaV04wYjNJcElIdGNiaUFnSUNCMllYSWdaV3dnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLSEp2YjNSVFpXeGxZM1J2Y2lrN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1SUNoeVpYTnZiSFpsTENCeVpXcGxZM1FwSUh0Y2JpQWdJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doZDJsdVpHOTNMbUZ1WjNWc1lYSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KMkZ1WjNWc1lYSWdZMjkxYkdRZ2JtOTBJR0psSUdadmRXNWtJRzl1SUhSb1pTQjNhVzVrYjNjbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoaGJtZDFiR0Z5TG1kbGRGUmxjM1JoWW1sc2FYUjVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWVc1bmRXeGhjaTVuWlhSVVpYTjBZV0pwYkdsMGVTaGxiQ2t1ZDJobGJsTjBZV0pzWlNoeVpYTnZiSFpsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGaGJtZDFiR0Z5TG1Wc1pXMWxiblFvWld3cExtbHVhbVZqZEc5eUtDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkeWIyOTBJR1ZzWlcxbGJuUWdLQ2NnS3lCeWIyOTBVMlZzWldOMGIzSWdLeUFuS1NCb1lYTWdibThnYVc1cVpXTjBiM0l1SnlBclhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBbklIUm9hWE1nYldGNUlHMWxZVzRnYVhRZ2FYTWdibTkwSUdsdWMybGtaU0J1WnkxaGNIQXVKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdGdVozVnNZWEl1Wld4bGJXVnVkQ2hsYkNrdWFXNXFaV04wYjNJb0tTNW5aWFFvSnlSaWNtOTNjMlZ5SnlrdVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JtOTBhV1o1VjJobGJrNXZUM1YwYzNSaGJtUnBibWRTWlhGMVpYTjBjeWh5WlhOdmJIWmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU0JqWVhSamFDQW9aWEp5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WldwbFkzUW9aWEp5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCcGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZzWldGMlpTY2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ2MzUmxjQzVsZG1WdWRFNWhiV1VnSVQwZ0oyMXZkWE5sYjNWMEp5QW1KbHh1SUNBZ0lDQWdJQ0FnSUNCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZsYm5SbGNpY2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ2MzUmxjQzVsZG1WdWRFNWhiV1VnSVQwZ0oyMXZkWE5sYjNabGNpY2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ2MzUmxjQzVsZG1WdWRFNWhiV1VnSVQwZ0oySnNkWEluSUNZbVhHNGdJQ0FnSUNBZ0lDQWdJSE4wWlhBdVpYWmxiblJPWVcxbElDRTlJQ2RtYjJOMWN5YzdYRzU5WEc1Y2JpOHFLbHh1SUNvZ1VtVjBkWEp1Y3lCMGNuVmxJR2xtSUhSb1pTQm5hWFpsYmlCemRHVndJR2x6SUhOdmJXVWdjMjl5ZENCdlppQjFjMlZ5SUdsdWRHVnlZV04wYVc5dVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselNXNTBaWEpoWTNScGRtVlRkR1Z3S0hOMFpYQXBJSHRjYmlBZ0lDQjJZWElnWlhaMElEMGdjM1JsY0M1bGRtVnVkRTVoYldVN1hHNWNiaUFnSUNBdktseHVJQ0FnSUNBZ0lDOHZJRWx1ZEdWeVpYTjBhVzVuSUc1dmRHVXNJR1J2YVc1bklIUm9aU0JtYjJ4c2IzZHBibWNnZDJGeklHTmhkWE5wYm1jZ2RHaHBjeUJtZFc1amRHbHZiaUIwYnlCeVpYUjFjbTRnZFc1a1pXWnBibVZrTGx4dUlDQWdJQ0FnSUhKbGRIVnlibHh1SUNBZ0lDQWdJQ0FnSUNCbGRuUXVhVzVrWlhoUFppaGNJbTF2ZFhObFhDSXBJQ0U5UFNBd0lIeDhYRzRnSUNBZ0lDQWdJQ0FnSUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWa2IzZHVYQ0lwSUQwOVBTQXdJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1SbGVFOW1LRndpYlc5MWMyVjFjRndpS1NBOVBUMGdNRHRjYmx4dUlDQWdJQ0FnSUM4dklFbDBjeUJpWldOaGRYTmxJSFJvWlNCamIyNWthWFJwYjI1eklIZGxjbVVnYm05MElHOXVJSFJvWlNCellXMWxJR3hwYm1VZ1lYTWdkR2hsSUhKbGRIVnliaUJ6ZEdGMFpXMWxiblJjYmlBZ0lDQXFMMXh1SUNBZ0lISmxkSFZ5YmlCbGRuUXVhVzVrWlhoUFppaGNJbTF2ZFhObFhDSXBJQ0U5UFNBd0lIeDhJR1YyZEM1cGJtUmxlRTltS0Z3aWJXOTFjMlZrYjNkdVhDSXBJRDA5UFNBd0lIeDhJR1YyZEM1cGJtUmxlRTltS0Z3aWJXOTFjMlYxY0Z3aUtTQTlQVDBnTUR0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWm1sdVpFVnNaVzFsYm5SWGFYUm9URzlqWVhSdmNpaHpZMlZ1WVhKcGJ5d2djM1JsY0N3Z2JHOWpZWFJ2Y2l3Z2RHbHRaVzkxZEN3Z2RHVjRkRlJ2UTJobFkyc3BJSHRjYmlBZ0lDQjJZWElnYzNSaGNuUmxaRHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdJQ0JtZFc1amRHbHZiaUIwY25sR2FXNWtLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGemRHRnlkR1ZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmhjblJsWkNBOUlHNWxkeUJFWVhSbEtDa3VaMlYwVkdsdFpTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdaV3hsY3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCbWIzVnVaRlJ2YjAxaGJua2dQU0JtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm1iM1Z1WkZaaGJHbGtJRDBnWm1Gc2MyVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdabTkxYm1SRWFXWm1aWEpsYm5SVVpYaDBJRDBnWm1Gc2MyVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjMlZzWldOMGIzSnpWRzlVWlhOMElEMGdiRzlqWVhSdmNpNXpaV3hsWTNSdmNuTXVjMnhwWTJVb01DazdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdkR1Y0ZEZSdlEyaGxZMnNnUFNCemRHVndMbVJoZEdFdWRHVjRkRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJqYjIxd1lYSnBjMjl1SUQwZ2MzUmxjQzVrWVhSaExtTnZiWEJoY21semIyNGdmSHdnWENKbGNYVmhiSE5jSWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5sYkdWamRHOXljMVJ2VkdWemRDNTFibk5vYVdaMEtDZGJaR0YwWVMxMWJtbHhkV1V0YVdROVhDSW5JQ3NnYkc5allYUnZjaTUxYm1seGRXVkpaQ0FySUNkY0lsMG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2djMlZzWldOMGIzSnpWRzlVWlhOMExteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITmxiR1ZqZEc5eUlEMGdjMlZzWldOMGIzSnpWRzlVWlhOMFcybGRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNocGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVnNaV04wYjNJZ0t6MGdYQ0k2ZG1semFXSnNaVndpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVnpJRDBnSkNoelpXeGxZM1J2Y2lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1ZzWlhNdWJHVnVaM1JvSUQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQjBaWGgwVkc5RGFHVmpheUFoUFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUc1bGQxUmxlSFFnUFNBa0tHVnNaWE5iTUYwcExuUmxlSFFvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDZ29ZMjl0Y0dGeWFYTnZiaUE5UFQwZ0oyVnhkV0ZzY3ljZ0ppWWdibVYzVkdWNGRDQTlQVDBnZEdWNGRGUnZRMmhsWTJzcElIeDhYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnS0dOdmJYQmhjbWx6YjI0Z1BUMDlJQ2RqYjI1MFlXbHVjeWNnSmlZZ2JtVjNWR1Y0ZEM1cGJtUmxlRTltS0hSbGVIUlViME5vWldOcktTQStQU0F3S1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1p2ZFc1a1ZtRnNhV1FnUFNCMGNuVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNWdVpFUnBabVpsY21WdWRGUmxlSFFnUFNCMGNuVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm05MWJtUldZV3hwWkNBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdWekxtRjBkSElvSjJSaGRHRXRkVzVwY1hWbExXbGtKeXdnYkc5allYUnZjaTUxYm1seGRXVkpaQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHVnNaWE11YkdWdVozUm9JRDRnTVNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNWdVpGUnZiMDFoYm5rZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dadmRXNWtWbUZzYVdRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtHVnNaWE1wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzBsdGNHOXlkR0Z1ZEZOMFpYQW9jM1JsY0NrZ0ppWWdLRzVsZHlCRVlYUmxLQ2t1WjJWMFZHbHRaU2dwSUMwZ2MzUmhjblJsWkNrZ1BDQjBhVzFsYjNWMElDb2dOU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb2RISjVSbWx1WkN3Z05UQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjbVZ6ZFd4MElEMGdYQ0pjSWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9abTkxYm1SVWIyOU5ZVzU1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzNWc2RDQTlJQ2REYjNWc1pDQnViM1FnWm1sdVpDQmhjSEJ5YjNCeWFXRjBaU0JsYkdWdFpXNTBJR1p2Y2lCelpXeGxZM1J2Y25NNklDY2dLeUJLVTA5T0xuTjBjbWx1WjJsbWVTaHNiMk5oZEc5eUxuTmxiR1ZqZEc5eWN5a2dLeUJjSWlCbWIzSWdaWFpsYm5RZ1hDSWdLeUJ6ZEdWd0xtVjJaVzUwVG1GdFpTQXJJRndpTGlBZ1VtVmhjMjl1T2lCR2IzVnVaQ0JVYjI4Z1RXRnVlU0JGYkdWdFpXNTBjMXdpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb1ptOTFibVJFYVdabVpYSmxiblJVWlhoMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMzVnNkQ0E5SUNkRGIzVnNaQ0J1YjNRZ1ptbHVaQ0JoY0hCeWIzQnlhV0YwWlNCbGJHVnRaVzUwSUdadmNpQnpaV3hsWTNSdmNuTTZJQ2NnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hzYjJOaGRHOXlMbk5sYkdWamRHOXljeWtnS3lCY0lpQm1iM0lnWlhabGJuUWdYQ0lnS3lCemRHVndMbVYyWlc1MFRtRnRaU0FySUZ3aUxpQWdVbVZoYzI5dU9pQlVaWGgwSUdSdlpYTnVKM1FnYldGMFkyZ3VJQ0JjWEc1RmVIQmxZM1JsWkRwY1hHNWNJaUFySUhSbGVIUlViME5vWldOcklDc2dYQ0pjWEc1aWRYUWdkMkZ6WEZ4dVhDSWdLeUJsYkdWekxuUmxlSFFvS1NBcklGd2lYRnh1WENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ6ZFd4MElEMGdKME52ZFd4a0lHNXZkQ0JtYVc1a0lHRndjSEp2Y0hKcFlYUmxJR1ZzWlcxbGJuUWdabTl5SUhObGJHVmpkRzl5Y3pvZ0p5QXJJRXBUVDA0dWMzUnlhVzVuYVdaNUtHeHZZMkYwYjNJdWMyVnNaV04wYjNKektTQXJJRndpSUdadmNpQmxkbVZ1ZENCY0lpQXJJSE4wWlhBdVpYWmxiblJPWVcxbElDc2dYQ0l1SUNCU1pXRnpiMjQ2SUU1dklHVnNaVzFsYm5SeklHWnZkVzVrWENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxhbVZqZENoeVpYTjFiSFFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ2RtRnlJSE53WldWa0lEMGdkWFJ0WlM1emRHRjBaUzV6WlhSMGFXNW5jeTVuWlhRb1hDSnlkVzV1WlhJdWMzQmxaV1JjSWlrN1hHNGdJQ0FnSUNBZ0lIWmhjaUJzYVcxcGRDQTlJR2x0Y0c5eWRHRnVkRk4wWlhCTVpXNW5kR2dnTHlBb2MzQmxaV1FnUFQwOUlDZHlaV0ZzZEdsdFpTY2dQeUFuTVNjZ09pQnpjR1ZsWkNrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2huYkc5aVlXd3VZVzVuZFd4aGNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2QyRnBkRVp2Y2tGdVozVnNZWElvSjF0dVp5MWhjSEJkSnlrdWRHaGxiaWhtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITndaV1ZrSUQwOVBTQW5jbVZoYkhScGJXVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpYUlVhVzFsYjNWMEtIUnllVVpwYm1Rc0lIUnBiV1Z2ZFhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITndaV1ZrSUQwOVBTQW5abUZ6ZEdWemRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSeWVVWnBibVFvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb2RISjVSbWx1WkN3Z1RXRjBhQzV0YVc0b2RHbHRaVzkxZENBcUlITndaV1ZrTENCc2FXMXBkQ2twTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6Y0dWbFpDQTlQVDBnSjNKbFlXeDBhVzFsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dkR2x0Wlc5MWRDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITndaV1ZrSUQwOVBTQW5abUZ6ZEdWemRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwY25sR2FXNWtLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dUV0YwYUM1dGFXNG9kR2x0Wlc5MWRDQXFJSE53WldWa0xDQnNhVzFwZENrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlNrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRGUnBiV1Z2ZFhRb2MyTmxibUZ5YVc4c0lHbGtlQ2tnZTF4dUlDQWdJR2xtSUNocFpIZ2dQaUF3S1NCN1hHNGdJQ0FnSUNBZ0lDOHZJRWxtSUhSb1pTQndjbVYyYVc5MWN5QnpkR1Z3SUdseklHRWdkbUZzYVdSaGRHVWdjM1JsY0N3Z2RHaGxiaUJxZFhOMElHMXZkbVVnYjI0c0lHRnVaQ0J3Y21WMFpXNWtJR2wwSUdsemJpZDBJSFJvWlhKbFhHNGdJQ0FnSUNBZ0lDOHZJRTl5SUdsbUlHbDBJR2x6SUdFZ2MyVnlhV1Z6SUc5bUlHdGxlWE1zSUhSb1pXNGdaMjljYmlBZ0lDQWdJQ0FnYVdZZ0tITmpaVzVoY21sdkxuTjBaWEJ6VzJsa2VDQXRJREZkTG1WMlpXNTBUbUZ0WlNBOVBTQW5kbUZzYVdSaGRHVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z01EdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjMk5sYm1GeWFXOHVjM1JsY0hOYmFXUjRYUzUwYVcxbFUzUmhiWEFnTFNCelkyVnVZWEpwYnk1emRHVndjMXRwWkhnZ0xTQXhYUzUwYVcxbFUzUmhiWEE3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlBd08xeHVmVnh1WEc1bWRXNWpkR2x2YmlCeWRXNU9aWGgwVTNSbGNDaHpZMlZ1WVhKcGJ5d2dhV1I0TENCMGIxTnJhWEFzSUhScGJXVnZkWFFwSUh0Y2JpQWdJQ0F2THlCTllXdGxJSE4xY21VZ2QyVWdZWEpsYmlkMElHZHZhVzVuSUhSdklHOTJaWEptYkc5M0lIUm9aU0JqWVd4c0lITjBZV05yTGx4dUlDQWdJSE5sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6WTJWdVlYSnBieTV6ZEdWd2N5NXNaVzVuZEdnZ1BpQW9hV1I0SUNzZ01Ta3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISjFibE4wWlhBb2MyTmxibUZ5YVc4c0lHbGtlQ0FySURFc0lIUnZVMnRwY0NrN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBiM0JUWTJWdVlYSnBieWgwY25WbEtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNJSFJwYldWdmRYUWdmSHdnTUNrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdaeVlXZHRaVzUwUm5KdmJWTjBjbWx1WnloemRISklWRTFNS1NCN1hHNGdJQ0FnZG1GeUlIUmxiWEFnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGYkdWdFpXNTBLQ2QwWlcxd2JHRjBaU2NwTzF4dUlDQWdJSFJsYlhBdWFXNXVaWEpJVkUxTUlEMGdjM1J5U0ZSTlREdGNiaUFnSUNBdkx5QmpiMjV6YjJ4bExteHZaeWgwWlcxd0xtbHVibVZ5U0ZSTlRDazdYRzRnSUNBZ2NtVjBkWEp1SUhSbGJYQXVZMjl1ZEdWdWRDQS9JSFJsYlhBdVkyOXVkR1Z1ZENBNklIUmxiWEE3WEc1OVhHNWNibVoxYm1OMGFXOXVJR2RsZEZWdWFYRjFaVWxrUm5KdmJWTjBaWEFvYzNSbGNDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCemRHVndJQ1ltSUhOMFpYQXVaR0YwWVNBbUppQnpkR1Z3TG1SaGRHRXViRzlqWVhSdmNpQW1KaUJ6ZEdWd0xtUmhkR0V1Ykc5allYUnZjaTUxYm1seGRXVkpaRHRjYm4xY2JseHVablZ1WTNScGIyNGdabWxzZEdWeVJYaDBjbUZNYjJGa2N5aHpkR1Z3Y3lrZ2UxeHVJQ0IyWVhJZ2NtVnpkV3gwSUQwZ1cxMDdYRzRnSUhaaGNpQnpaV1Z1VEc5aFpDQTlJR1poYkhObE8xeHVJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUhOMFpYQnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnZG1GeUlHbHpURzloWkNBOUlITjBaWEJ6VzJsZExtVjJaVzUwVG1GdFpTQTlQVDBnSjJ4dllXUW5PMXh1SUNBZ0lHbG1JQ2doYzJWbGJreHZZV1FnZkh3Z0lXbHpURzloWkNrZ2UxeHVJQ0FnSUNBZ2NtVnpkV3gwTG5CMWMyZ29jM1JsY0hOYmFWMHBPMXh1SUNBZ0lDQWdjMlZsYmt4dllXUWdQU0J6WldWdVRHOWhaQ0I4ZkNCcGMweHZZV1E3WEc0Z0lDQWdmVnh1SUNCOVhHNGdJSEpsZEhWeWJpQnlaWE4xYkhRN1hHNTlPMXh1WEc1MllYSWdaM1ZwWkNBOUlDaG1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdablZ1WTNScGIyNGdjelFvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCTllYUm9MbVpzYjI5eUtDZ3hJQ3NnVFdGMGFDNXlZVzVrYjIwb0tTa2dLaUF3ZURFd01EQXdLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0xuUnZVM1J5YVc1bktERTJLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0xuTjFZbk4wY21sdVp5Z3hLVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlITTBLQ2tnS3lCek5DZ3BJQ3NnSnkwbklDc2djelFvS1NBcklDY3RKeUFySUhNMEtDa2dLeUFuTFNjZ0sxeHVJQ0FnSUNBZ0lDQWdJQ0FnY3pRb0tTQXJJQ2N0SnlBcklITTBLQ2tnS3lCek5DZ3BJQ3NnY3pRb0tUdGNiaUFnSUNCOU8xeHVmU2tvS1R0Y2JseHVkbUZ5SUd4cGMzUmxibVZ5Y3lBOUlGdGRPMXh1ZG1GeUlITjBZWFJsTzF4dWRtRnlJSFYwYldVZ1BTQjdYRzRnSUNBZ2FXNXBkRG9nWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYzJObGJtRnlhVzhnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb0ozVjBiV1ZmYzJObGJtRnlhVzhuS1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2JHOWpZV3hUZEc5eVlXZGxMbU5zWldGeUtDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnYzNSaGRHVWdQU0IxZEcxbExuTjBZWFJsSUQwZ2RYUnRaUzVzYjJGa1UzUmhkR1ZHY205dFUzUnZjbUZuWlNncE8xeHVJQ0FnSUNBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblNVNUpWRWxCVEVsYVJVUW5LVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZFhSdFpTNXNiMkZrVTJWMGRHbHVaM01vS1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzUwWlhOMFUyVnlkbVZ5SUQwZ1oyVjBVR0Z5WVcxbGRHVnlRbmxPWVcxbEtGd2lkWFJ0WlY5MFpYTjBYM05sY25abGNsd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdVlYVjBiMUoxYmlBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNuVnVVMk5sYm1GeWFXOG9jMk5sYm1GeWFXOHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTd2dNVEF3S1R0Y2JpQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBZWFJsTG5OMFlYUjFjeUE5UFQwZ1hDSlFURUZaU1U1SFhDSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjblZ1VG1WNGRGTjBaWEFvYzNSaGRHVXVjblZ1TG5OalpXNWhjbWx2TENCemRHRjBaUzV5ZFc0dWMzUmxjRWx1WkdWNEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb0lYTjBZWFJsTG5OMFlYUjFjeUI4ZkNCemRHRjBaUzV6ZEdGMGRYTWdQVDA5SUNkSlRrbFVTVUZNU1ZwSlRrY25LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSbExuTjBZWFIxY3lBOUlGd2lURTlCUkVWRVhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnWW5KdllXUmpZWE4wT2lCbWRXNWpkR2x2YmlBb1pYWjBMQ0JsZG5SRVlYUmhLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaHNhWE4wWlc1bGNuTWdKaVlnYkdsemRHVnVaWEp6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JzYVhOMFpXNWxjbk11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnNhWE4wWlc1bGNuTmJhVjBvWlhaMExDQmxkblJFWVhSaEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnYzNSaGNuUlNaV052Y21ScGJtYzZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExuTjBZWFIxY3lBaFBTQW5Va1ZEVDFKRVNVNUhKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdWMzUmhkSFZ6SUQwZ0oxSkZRMDlTUkVsT1J5YzdYRzRnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV6ZEdWd2N5QTlJRnRkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eVpYQnZjblJNYjJjb1hDSlNaV052Y21ScGJtY2dVM1JoY25SbFpGd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkU1JVTlBVa1JKVGtkZlUxUkJVbFJGUkNjcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaV2RwYzNSbGNrVjJaVzUwS0Z3aWJHOWhaRndpTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIQnliM1J2WTI5c09pQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWNISnZkRzlqYjJ3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2h2YzNRNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b2IzTjBMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpXRnlZMmc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTV6WldGeVkyZ3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdoaGMyZzZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9ZWE5vWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnY25WdVUyTmxibUZ5YVc4NklHWjFibU4wYVc5dUlDaHVZVzFsTENCamIyNW1hV2NwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFJ2VW5WdUlEMGdibUZ0WlNCOGZDQndjbTl0Y0hRb0oxTmpaVzVoY21sdklIUnZJSEoxYmljcE8xeHVJQ0FnSUNBZ0lDQjJZWElnWVhWMGIxSjFiaUE5SUNGdVlXMWxJRDhnY0hKdmJYQjBLQ2RYYjNWc1pDQjViM1VnYkdsclpTQjBieUJ6ZEdWd0lIUm9jbTkxWjJnZ1pXRmphQ0J6ZEdWd0lDaDVmRzRwUHljcElDRTlJQ2Q1SnlBNklIUnlkV1U3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJuWlhSVFkyVnVZWEpwYnloMGIxSjFiaWt1ZEdobGJpaG1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITmpaVzVoY21sdklEMGdTbE5QVGk1d1lYSnpaU2hLVTA5T0xuTjBjbWx1WjJsbWVTaHpZMlZ1WVhKcGJ5a3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MyVjBkWEJEYjI1a2FYUnBiMjV6S0hOalpXNWhjbWx2S1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV5ZFc0Z1BTQjdmVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTNWhkWFJ2VW5WdUlEMGdZWFYwYjFKMWJpQTlQVDBnZEhKMVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHRjBkWE1nUFNCY0lsQk1RVmxKVGtkY0lqdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5qWlc1aGNtbHZMbk4wWlhCeklEMGdabWxzZEdWeVJYaDBjbUZNYjJGa2N5aHpZMlZ1WVhKcGJ5NXpkR1Z3Y3lrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9YQ0oyWlhKaWIzTmxYQ0lwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnloY0lsTjBZWEowYVc1bklGTmpaVzVoY21sdklDZGNJaUFySUc1aGJXVWdLeUJjSWlkY0lpd2djMk5sYm1GeWFXOHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RRVEVGWlFrRkRTMTlUVkVGU1ZFVkVKeWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNVRkR1Z3S0hOalpXNWhjbWx2TENBd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISjFiazVsZUhSVGRHVndPaUJ5ZFc1T1pYaDBVM1JsY0N4Y2JpQWdJQ0J6ZEc5d1UyTmxibUZ5YVc4NklHWjFibU4wYVc5dUlDaHpkV05qWlhOektTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCelkyVnVZWEpwYnlBOUlITjBZWFJsTG5KMWJpQW1KaUJ6ZEdGMFpTNXlkVzR1YzJObGJtRnlhVzg3WEc0Z0lDQWdJQ0FnSUdSbGJHVjBaU0J6ZEdGMFpTNXlkVzQ3WEc0Z0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJRndpVEU5QlJFVkVYQ0k3WEc0Z0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RRVEVGWlFrRkRTMTlUVkU5UVVFVkVKeWs3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWMzUmhkR1V1YzJWMGRHbHVaM011WjJWMEtGd2lkbVZ5WW05elpWd2lLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUzUnZjSEJwYm1jZ1UyTmxibUZ5YVc5Y0lpazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnYVdZZ0tITmpaVzVoY21sdktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1ZqWTJWemN5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVTNWalkyVnpjeWhjSWx0VFZVTkRSVk5UWFNCVFkyVnVZWEpwYnlBblhDSWdLeUJ6WTJWdVlYSnBieTV1WVcxbElDc2dYQ0luSUVOdmJYQnNaWFJsWkNGY0lpazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LRndpVTNSdmNIQnBibWNnYjI0Z2NHRm5aU0JjSWlBcklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b2NtVm1LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEVWeWNtOXlLRndpVzBaQlNVeFZVa1ZkSUZOalpXNWhjbWx2SUNkY0lpQXJJSE5qWlc1aGNtbHZMbTVoYldVZ0t5QmNJaWNnVTNSdmNIQmxaQ0ZjSWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ1EzSmxZWFJsY3lCaElIUmxiWEJ2Y21GeWVTQmxiR1Z0Wlc1MElHeHZZMkYwYjNJc0lHWnZjaUIxYzJVZ2QybDBhQ0JtYVc1aGJHbDZaVXh2WTJGMGIzSmNiaUFnSUNBZ0tpOWNiaUFnSUNCamNtVmhkR1ZGYkdWdFpXNTBURzlqWVhSdmNqb2dablZ1WTNScGIyNGdLR1ZzWlcxbGJuUXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlIVnVhWEYxWlVsa0lEMGdaV3hsYldWdWRDNW5aWFJCZEhSeWFXSjFkR1VvWENKa1lYUmhMWFZ1YVhGMVpTMXBaRndpS1NCOGZDQm5kV2xrS0NrN1hHNGdJQ0FnSUNBZ0lHVnNaVzFsYm5RdWMyVjBRWFIwY21saWRYUmxLRndpWkdGMFlTMTFibWx4ZFdVdGFXUmNJaXdnZFc1cGNYVmxTV1FwTzF4dVhHNGdJQ0FnSUNBZ0lIWmhjaUJsYkdWSWRHMXNJRDBnWld4bGJXVnVkQzVqYkc5dVpVNXZaR1VvS1M1dmRYUmxja2hVVFV3N1hHNGdJQ0FnSUNBZ0lIWmhjaUJsYkdWVFpXeGxZM1J2Y25NZ1BTQmJYVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHVnNaVzFsYm5RdWRHRm5UbUZ0WlM1MGIxVndjR1Z5UTJGelpTZ3BJRDA5SUNkQ1QwUlpKeUI4ZkNCbGJHVnRaVzUwTG5SaFowNWhiV1V1ZEc5VmNIQmxja05oYzJVb0tTQTlQU0FuU0ZSTlRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnNaVk5sYkdWamRHOXljeUE5SUZ0bGJHVnRaVzUwTG5SaFowNWhiV1ZkTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaV3hsVTJWc1pXTjBiM0p6SUQwZ2MyVnNaV04wYjNKR2FXNWtaWElvWld4bGJXVnVkQ3dnWkc5amRXMWxiblF1WW05a2VTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVnVhWEYxWlVsa09pQjFibWx4ZFdWSlpDeGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGJHVmpkRzl5Y3pvZ1pXeGxVMlZzWldOMGIzSnpYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJSEpsWjJsemRHVnlSWFpsYm5RNklHWjFibU4wYVc5dUlDaGxkbVZ1ZEU1aGJXVXNJR1JoZEdFc0lHbGtlQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BJSHg4SUhWMGJXVXVhWE5XWVd4cFpHRjBhVzVuS0NrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2FXUjRJRDA5SUNkMWJtUmxabWx1WldRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1I0SUQwZ2RYUnRaUzV6ZEdGMFpTNXpkR1Z3Y3k1c1pXNW5kR2c3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV6ZEdWd2MxdHBaSGhkSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVjJaVzUwVG1GdFpUb2daWFpsYm5ST1lXMWxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwYldWVGRHRnRjRG9nYm1WM0lFUmhkR1VvS1M1blpYUlVhVzFsS0Nrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVG9nWkdGMFlWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZEZWa1ZPVkY5U1JVZEpVMVJGVWtWRUp5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lISmxjRzl5ZEV4dlp6b2dablZ1WTNScGIyNGdLR3h2Wnl3Z2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hKbGNHOXlkRWhoYm1Sc1pYSnpJQ1ltSUhKbGNHOXlkRWhoYm1Sc1pYSnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnlaWEJ2Y25SSVlXNWtiR1Z5Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsY0c5eWRFaGhibVJzWlhKelcybGRMbXh2Wnloc2IyY3NJSE5qWlc1aGNtbHZMQ0IxZEcxbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnY21Wd2IzSjBSWEp5YjNJNklHWjFibU4wYVc5dUlDaGxjbkp2Y2l3Z2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hKbGNHOXlkRWhoYm1Sc1pYSnpJQ1ltSUhKbGNHOXlkRWhoYm1Sc1pYSnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnlaWEJ2Y25SSVlXNWtiR1Z5Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsY0c5eWRFaGhibVJzWlhKelcybGRMbVZ5Y205eUtHVnljbTl5TENCelkyVnVZWEpwYnl3Z2RYUnRaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lISmxjRzl5ZEZOMVkyTmxjM002SUdaMWJtTjBhVzl1SUNodFpYTnpZV2RsTENCelkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvY21Wd2IzSjBTR0Z1Wkd4bGNuTWdKaVlnY21Wd2IzSjBTR0Z1Wkd4bGNuTXViR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ3YjNKMFNHRnVaR3hsY25OYmFWMHVjM1ZqWTJWemN5aHRaWE56WVdkbExDQnpZMlZ1WVhKcGJ5d2dkWFJ0WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlUR2x6ZEdWdVpYSTZJR1oxYm1OMGFXOXVJQ2hvWVc1a2JHVnlLU0I3WEc0Z0lDQWdJQ0FnSUd4cGMzUmxibVZ5Y3k1d2RYTm9LR2hoYm1Sc1pYSXBPMXh1SUNBZ0lIMHNYRzRnSUNBZ2NtVm5hWE4wWlhKVFlYWmxTR0Z1Wkd4bGNqb2dablZ1WTNScGIyNGdLR2hoYm1Sc1pYSXBJSHRjYmlBZ0lDQWdJQ0FnYzJGMlpVaGhibVJzWlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV2RwYzNSbGNsSmxjRzl5ZEVoaGJtUnNaWEk2SUdaMWJtTjBhVzl1SUNob1lXNWtiR1Z5S1NCN1hHNGdJQ0FnSUNBZ0lISmxjRzl5ZEVoaGJtUnNaWEp6TG5CMWMyZ29hR0Z1Wkd4bGNpazdYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpXZHBjM1JsY2t4dllXUklZVzVrYkdWeU9pQm1kVzVqZEdsdmJpQW9hR0Z1Wkd4bGNpa2dlMXh1SUNBZ0lDQWdJQ0JzYjJGa1NHRnVaR3hsY25NdWNIVnphQ2hvWVc1a2JHVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISmxaMmx6ZEdWeVUyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNqb2dablZ1WTNScGIyNGdLR2hoYm1Sc1pYSXBJSHRjYmlBZ0lDQWdJQ0FnYzJWMGRHbHVaM05NYjJGa1NHRnVaR3hsY25NdWNIVnphQ2hvWVc1a2JHVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHbHpVbVZqYjNKa2FXNW5PaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhWMGJXVXVjM1JoZEdVdWMzUmhkSFZ6TG1sdVpHVjRUMllvWENKU1JVTlBVa1JKVGtkY0lpa2dQVDA5SURBN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JwYzFCc1lYbHBibWM2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzV6ZEdGMFpTNXpkR0YwZFhNdWFXNWtaWGhQWmloY0lsQk1RVmxKVGtkY0lpa2dQVDA5SURBN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JwYzFaaGJHbGtZWFJwYm1jNklHWjFibU4wYVc5dUtIWmhiR2xrWVhScGJtY3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCMllXeHBaR0YwYVc1bklDRTlQU0FuZFc1a1pXWnBibVZrSnlBbUppQW9kWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BJSHg4SUhWMGJXVXVhWE5XWVd4cFpHRjBhVzVuS0NrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wWVhSbExuTjBZWFIxY3lBOUlIWmhiR2xrWVhScGJtY2dQeUJjSWxaQlRFbEVRVlJKVGtkY0lpQTZJRndpVWtWRFQxSkVTVTVIWENJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25Wa0ZNU1VSQlZFbFBUbDlEU0VGT1IwVkVKeWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhWMGJXVXVjM1JoZEdVdWMzUmhkSFZ6TG1sdVpHVjRUMllvWENKV1FVeEpSRUZVU1U1SFhDSXBJRDA5UFNBd08xeHVJQ0FnSUgwc1hHNGdJQ0FnYzNSdmNGSmxZMjl5WkdsdVp6b2dablZ1WTNScGIyNGdLR2x1Wm04cElIdGNiaUFnSUNBZ0lDQWdhV1lnS0dsdVptOGdJVDA5SUdaaGJITmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYm1WM1UyTmxibUZ5YVc4Z1BTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JsY0hNNklITjBZWFJsTG5OMFpYQnpYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCZkxtVjRkR1Z1WkNodVpYZFRZMlZ1WVhKcGJ5d2dhVzVtYnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDZ2hibVYzVTJObGJtRnlhVzh1Ym1GdFpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzVsZDFOalpXNWhjbWx2TG01aGJXVWdQU0J3Y205dGNIUW9KMFZ1ZEdWeUlITmpaVzVoY21sdklHNWhiV1VuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0c1bGQxTmpaVzVoY21sdkxtNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzV6WTJWdVlYSnBiM011Y0hWemFDaHVaWGRUWTJWdVlYSnBieWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jMkYyWlVoaGJtUnNaWEp6SUNZbUlITmhkbVZJWVc1a2JHVnljeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnpZWFpsU0dGdVpHeGxjbk11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmhkbVZJWVc1a2JHVnljMXRwWFNodVpYZFRZMlZ1WVhKcGJ5d2dkWFJ0WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCemRHRjBaUzV6ZEdGMGRYTWdQU0FuVEU5QlJFVkVKenRjYmx4dUlDQWdJQ0FnSUNCMWRHMWxMbUp5YjJGa1kyRnpkQ2duVWtWRFQxSkVTVTVIWDFOVVQxQlFSVVFuS1R0Y2JseHVJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnloY0lsSmxZMjl5WkdsdVp5QlRkRzl3Y0dWa1hDSXNJRzVsZDFOalpXNWhjbWx2S1R0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYkc5aFpGTmxkSFJwYm1kek9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpaWFIwYVc1bmN5QTlJSFYwYldVdWMzUmhkR1V1YzJWMGRHbHVaM01nUFNCMWRHMWxMbk4wWVhSbExuTmxkSFJwYm1keklIeDhJRzVsZHlCVFpYUjBhVzVuY3loN1hHNGdJQ0FnSUNBZ0lDQWdYQ0p5ZFc1dVpYSXVjM0JsWldSY0lqb2dYQ0l4TUZ3aVhHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNuTXViR1Z1WjNSb0lENGdNQ0FtSmlBaGRYUnRaUzVwYzFKbFkyOXlaR2x1WnlncElDWW1JQ0YxZEcxbExtbHpVR3hoZVdsdVp5Z3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEhScGJtZHpURzloWkVoaGJtUnNaWEp6V3pCZEtHWjFibU4wYVc5dUlDaHlaWE53S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEhScGJtZHpMbk5sZEVSbFptRjFiSFJ6S0hKbGMzQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYTnZiSFpsS0hObGRIUnBibWR6S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUxDQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjMjlzZG1Vb2MyVjBkR2x1WjNNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzV5WlhOdmJIWmxLSE5sZEhScGJtZHpLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc1Y2JpQWdJQ0JzYjJGa1UzUmhkR1ZHY205dFUzUnZjbUZuWlRvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2RYUnRaVk4wWVhSbFUzUnlJRDBnYkc5allXeFRkRzl5WVdkbExtZGxkRWwwWlcwb0ozVjBiV1VuS1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldWVGRHRjBaVk4wY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVWdQU0JLVTA5T0xuQmhjbk5sS0hWMGJXVlRkR0YwWlZOMGNpazdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGMFpTNXpaWFIwYVc1bmN5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCdVpYZFRaWFIwYVc1bmN5QTlJRzVsZHlCVFpYUjBhVzVuY3lncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHNWxkMU5sZEhScGJtZHpMbk5sZEhScGJtZHpJRDBnYzNSaGRHVXVjMlYwZEdsdVozTXVjMlYwZEdsdVozTTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdibVYzVTJWMGRHbHVaM011YzJWMGRHbHVaM01nUFNCemRHRjBaUzV6WlhSMGFXNW5jeTVrWldaaGRXeDBVMlYwZEdsdVozTTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdWMyVjBkR2x1WjNNZ1BTQnVaWGRUWlhSMGFXNW5jenRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUjFjem9nWENKSlRrbFVTVUZNU1ZwSlRrZGNJaXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WTJWdVlYSnBiM002SUZ0ZFhHNGdJQ0FnSUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCemRHRjBaVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMkYyWlZOMFlYUmxWRzlUZEc5eVlXZGxPaUJtZFc1amRHbHZiaUFvZFhSdFpWTjBZWFJsS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbFUzUmhkR1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3h2WTJGc1UzUnZjbUZuWlM1elpYUkpkR1Z0S0NkMWRHMWxKeXdnU2xOUFRpNXpkSEpwYm1kcFpua29kWFJ0WlZOMFlYUmxLU2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNiMk5oYkZOMGIzSmhaMlV1Y21WdGIzWmxTWFJsYlNnbmRYUnRaU2NwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhWdWJHOWhaRG9nWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQjFkRzFsTG5OaGRtVlRkR0YwWlZSdlUzUnZjbUZuWlNoemRHRjBaU2s3WEc0Z0lDQWdmVnh1ZlR0Y2JseHVablZ1WTNScGIyNGdkRzluWjJ4bFNHbG5hR3hwWjJoMEtHVnNaU3dnZG1Gc2RXVXBJSHRjYmlBZ0lDQWtLR1ZzWlNrdWRHOW5aMnhsUTJ4aGMzTW9KM1YwYldVdGRtVnlhV1o1Snl3Z2RtRnNkV1VwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUIwYjJkbmJHVlNaV0ZrZVNobGJHVXNJSFpoYkhWbEtTQjdYRzRnSUNBZ0pDaGxiR1VwTG5SdloyZHNaVU5zWVhOektDZDFkRzFsTFhKbFlXUjVKeXdnZG1Gc2RXVXBPMXh1ZlZ4dVhHNHZLaXBjYmlBcUlFbG1JSGx2ZFNCamJHbGpheUJ2YmlCaElITndZVzRnYVc0Z1lTQnNZV0psYkN3Z2RHaGxJSE53WVc0Z2QybHNiQ0JqYkdsamF5eGNiaUFxSUhSb1pXNGdkR2hsSUdKeWIzZHpaWElnZDJsc2JDQm1hWEpsSUhSb1pTQmpiR2xqYXlCbGRtVnVkQ0JtYjNJZ2RHaGxJR2x1Y0hWMElHTnZiblJoYVc1bFpDQjNhWFJvYVc0Z2RHaGxJSE53WVc0c1hHNGdLaUJUYnl3Z2QyVWdiMjVzZVNCM1lXNTBJSFJ2SUhSeVlXTnJJSFJvWlNCcGJuQjFkQ0JqYkdsamEzTXVYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpUbTkwU1c1TVlXSmxiRTl5Vm1Gc2FXUW9aV3hsS1NCN1hHNGdJQ0FnY21WMGRYSnVJQ1FvWld4bEtTNXdZWEpsYm5SektDZHNZV0psYkNjcExteGxibWQwYUNBOVBTQXdJSHg4WEc0Z0lDQWdJQ0FnSUNBZ1pXeGxMbTV2WkdWT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrZ1BUMGdKMmx1Y0hWMEp6dGNibjFjYmx4dUx5b3FYRzRnS2lCU1pYUjFjbTV6SUhSeWRXVWdhV1lnYVhRZ2FYTWdZVzRnWld4bGJXVnVkQ0IwYUdGMElITm9iM1ZzWkNCaVpTQnBaMjV2Y21Wa1hHNGdLaTljYm1aMWJtTjBhVzl1SUdselNXZHViM0psWkVWc1pXMWxiblFvWld4bEtTQjdYRzRnSUhKbGRIVnliaUFoWld4bExtaGhjMEYwZEhKcFluVjBaU0I4ZkNCbGJHVXVhR0Z6UVhSMGNtbGlkWFJsS0Nka1lYUmhMV2xuYm05eVpTY3BJSHg4SUNRb1pXeGxLUzV3WVhKbGJuUnpLRndpVzJSaGRHRXRhV2R1YjNKbFhWd2lLUzVzWlc1bmRHZ2dQaUF3TzF4dWZWeHVYRzR2S2lwY2JpQXFJRkpsZEhWeWJuTWdkSEoxWlNCcFppQjBhR1VnWjJsMlpXNGdaWFpsYm5RZ2MyaHZkV3hrSUdKbElISmxZMjl5WkdWa0lHOXVJSFJvWlNCbmFYWmxiaUJsYkdWdFpXNTBYRzRnS2k5Y2JtWjFibU4wYVc5dUlITm9iM1ZzWkZKbFkyOXlaRVYyWlc1MEtHVnNaU3dnWlhaMEtTQjdYRzRnSUhaaGNpQnpaWFIwYVc1bklEMGdkWFJ0WlM1emRHRjBaUzV6WlhSMGFXNW5jeTVuWlhRb1hDSnlaV052Y21SbGNpNWxkbVZ1ZEhNdVhDSWdLeUJsZG5RcE8xeHVJQ0IyWVhJZ2FYTlRaWFIwYVc1blZISjFaU0E5SUNoelpYUjBhVzVuSUQwOVBTQjBjblZsSUh4OElITmxkSFJwYm1jZ1BUMDlJQ2QwY25WbEp5QjhmQ0IwZVhCbGIyWWdjMlYwZEdsdVp5QTlQVDBnSjNWdVpHVm1hVzVsWkNjcE8xeHVJQ0J5WlhSMWNtNGdkWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BJQ1ltSUdselUyVjBkR2x1WjFSeWRXVWdKaVlnYVhOT2IzUkpia3hoWW1Wc1QzSldZV3hwWkNobGJHVXBPMXh1ZlZ4dVhHNTJZWElnZEdsdFpYSnpJRDBnVzEwN1hHNWNibVoxYm1OMGFXOXVJR2x1YVhSRmRtVnVkRWhoYm1Sc1pYSnpLQ2tnZTF4dVhHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCbGRtVnVkSE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdaRzlqZFcxbGJuUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpaGxkbVZ1ZEhOYmFWMHNJQ2htZFc1amRHbHZiaUFvWlhaMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhR0Z1Wkd4bGNpQTlJR1oxYm1OMGFXOXVJQ2hsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1V1YVhOVWNtbG5aMlZ5S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVdselNXZHViM0psWkVWc1pXMWxiblFvWlM1MFlYSm5aWFFwSUNZbUlIVjBiV1V1YVhOU1pXTnZjbVJwYm1jb0tTa2dlMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdsa2VDQTlJSFYwYldVdWMzUmhkR1V1YzNSbGNITXViR1Z1WjNSb08xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQmhjbWR6SUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JHOWpZWFJ2Y2pvZ2RYUnRaUzVqY21WaGRHVkZiR1Z0Wlc1MFRHOWpZWFJ2Y2lobExuUmhjbWRsZENsY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCMGFXMWxjanRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNobGRuUWdQVDBnSjIxdmRYTmxiM1psY2ljcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzluWjJ4bFNHbG5hR3hwWjJoMEtHVXVkR0Z5WjJWMExDQjBjblZsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHbHRaWEp6TG5CMWMyZ29lMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pXeGxiV1Z1ZERvZ1pTNTBZWEpuWlhRc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYVcxbGNqb2djMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHOW5aMnhsVW1WaFpIa29aUzUwWVhKblpYUXNJSFJ5ZFdVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnZaMmRzWlVocFoyaHNhV2RvZENobExuUmhjbWRsZEN3Z1ptRnNjMlVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU3dnTlRBd0tWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWlhaMElEMDlJQ2R0YjNWelpXOTFkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQjBhVzFsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwYVcxbGNuTmJhVjB1Wld4bGJXVnVkQ0E5UFNCbExuUmhjbWRsZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTnNaV0Z5VkdsdFpXOTFkQ2gwYVcxbGNuTmJhVjB1ZEdsdFpYSXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwYldWeWN5NXpjR3hwWTJVb2FTd2dNU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzluWjJ4bFNHbG5hR3hwWjJoMEtHVXVkR0Z5WjJWMExDQm1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnZaMmRzWlZKbFlXUjVLR1V1ZEdGeVoyVjBMQ0JtWVd4elpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE5vYjNWc1pGSmxZMjl5WkVWMlpXNTBLR1V1ZEdGeVoyVjBMQ0JsZG5RcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWlM1M2FHbGphQ0I4ZkNCbExtSjFkSFJ2YmlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmhjbWR6TG1KMWRIUnZiaUE5SUdVdWQyaHBZMmdnZkh3Z1pTNWlkWFIwYjI0N1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hsZG5RZ1BUMGdKMk5vWVc1blpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWVhKbmN5NWhkSFJ5YVdKMWRHVnpJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGd2lkbUZzZFdWY0lpQTZJR1V1ZEdGeVoyVjBMblpoYkhWbExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRndpWTJobFkydGxaRndpT2lCbExuUmhjbWRsZEM1amFHVmphMlZrTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGd2ljMlZzWldOMFpXUmNJam9nWlM1MFlYSm5aWFF1YzJWc1pXTjBaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtHVjJkQ3dnWVhKbmN5d2dhV1I0S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5TzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCSVFVTkxJR1p2Y2lCMFpYTjBhVzVuWEc0Z0lDQWdJQ0FnSUNBZ0lDQW9kWFJ0WlM1bGRtVnVkRXhwYzNSbGJtVnljeUE5SUhWMGJXVXVaWFpsYm5STWFYTjBaVzVsY25NZ2ZId2dlMzBwVzJWMmRGMGdQU0JvWVc1a2JHVnlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdoaGJtUnNaWEk3WEc0Z0lDQWdJQ0FnSUgwcEtHVjJaVzUwYzF0cFhTa3NJSFJ5ZFdVcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhaaGNpQmZkRzlmWVhOamFXa2dQU0I3WEc0Z0lDQWdJQ0FnSUNjeE9EZ25PaUFuTkRRbkxGeHVJQ0FnSUNBZ0lDQW5NVGc1SnpvZ0p6UTFKeXhjYmlBZ0lDQWdJQ0FnSnpFNU1DYzZJQ2MwTmljc1hHNGdJQ0FnSUNBZ0lDY3hPVEVuT2lBbk5EY25MRnh1SUNBZ0lDQWdJQ0FuTVRreUp6b2dKemsySnl4Y2JpQWdJQ0FnSUNBZ0p6SXlNQ2M2SUNjNU1pY3NYRzRnSUNBZ0lDQWdJQ2N5TWpJbk9pQW5NemtuTEZ4dUlDQWdJQ0FnSUNBbk1qSXhKem9nSnprekp5eGNiaUFnSUNBZ0lDQWdKekl4T1NjNklDYzVNU2NzWEc0Z0lDQWdJQ0FnSUNjeE56TW5PaUFuTkRVbkxGeHVJQ0FnSUNBZ0lDQW5NVGczSnpvZ0p6WXhKeXdnTHk5SlJTQkxaWGtnWTI5a1pYTmNiaUFnSUNBZ0lDQWdKekU0TmljNklDYzFPU2RjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdkbUZ5SUhOb2FXWjBWWEJ6SUQwZ2UxeHVJQ0FnSUNBZ0lDQmNJamsyWENJNklGd2lmbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqUTVYQ0k2SUZ3aUlWd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVd1hDSTZJRndpUUZ3aUxGeHVJQ0FnSUNBZ0lDQmNJalV4WENJNklGd2lJMXdpTEZ4dUlDQWdJQ0FnSUNCY0lqVXlYQ0k2SUZ3aUpGd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVelhDSTZJRndpSlZ3aUxGeHVJQ0FnSUNBZ0lDQmNJalUwWENJNklGd2lYbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqVTFYQ0k2SUZ3aUpsd2lMRnh1SUNBZ0lDQWdJQ0JjSWpVMlhDSTZJRndpS2x3aUxGeHVJQ0FnSUNBZ0lDQmNJalUzWENJNklGd2lLRndpTEZ4dUlDQWdJQ0FnSUNCY0lqUTRYQ0k2SUZ3aUtWd2lMRnh1SUNBZ0lDQWdJQ0JjSWpRMVhDSTZJRndpWDF3aUxGeHVJQ0FnSUNBZ0lDQmNJall4WENJNklGd2lLMXdpTEZ4dUlDQWdJQ0FnSUNCY0lqa3hYQ0k2SUZ3aWUxd2lMRnh1SUNBZ0lDQWdJQ0JjSWprelhDSTZJRndpZlZ3aUxGeHVJQ0FnSUNBZ0lDQmNJamt5WENJNklGd2lmRndpTEZ4dUlDQWdJQ0FnSUNCY0lqVTVYQ0k2SUZ3aU9sd2lMRnh1SUNBZ0lDQWdJQ0JjSWpNNVhDSTZJRndpWEZ4Y0lsd2lMRnh1SUNBZ0lDQWdJQ0JjSWpRMFhDSTZJRndpUEZ3aUxGeHVJQ0FnSUNBZ0lDQmNJalEyWENJNklGd2lQbHdpTEZ4dUlDQWdJQ0FnSUNCY0lqUTNYQ0k2SUZ3aVAxd2lYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHWjFibU4wYVc5dUlHdGxlVkJ5WlhOelNHRnVaR3hsY2lBb1pTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb1pTNXBjMVJ5YVdkblpYSXBYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLQ0ZwYzBsbmJtOXlaV1JGYkdWdFpXNTBLR1V1ZEdGeVoyVjBLU0FtSmlCemFHOTFiR1JTWldOdmNtUkZkbVZ1ZENobExuUmhjbWRsZEN3Z1hDSnJaWGx3Y21WemMxd2lLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdNZ1BTQmxMbmRvYVdOb08xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QlVUMFJQT2lCRWIyVnpiaWQwSUhkdmNtc2dkMmwwYUNCallYQnpJR3h2WTJ0Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2Ym05eWJXRnNhWHBsSUd0bGVVTnZaR1ZjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hmZEc5ZllYTmphV2t1YUdGelQzZHVVSEp2Y0dWeWRIa29ZeWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaklEMGdYM1J2WDJGelkybHBXMk5kTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVdVdWMyaHBablJMWlhrZ0ppWWdLR01nUGowZ05qVWdKaVlnWXlBOFBTQTVNQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaklEMGdVM1J5YVc1bkxtWnliMjFEYUdGeVEyOWtaU2hqSUNzZ016SXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaGxMbk5vYVdaMFMyVjVJQ1ltSUhOb2FXWjBWWEJ6TG1oaGMwOTNibEJ5YjNCbGNuUjVLR01wS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0x5OW5aWFFnYzJocFpuUmxaQ0JyWlhsRGIyUmxJSFpoYkhWbFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1l5QTlJSE5vYVdaMFZYQnpXMk5kTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpJRDBnVTNSeWFXNW5MbVp5YjIxRGFHRnlRMjlrWlNoaktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaV2RwYzNSbGNrVjJaVzUwS0NkclpYbHdjbVZ6Y3ljc0lIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnNiMk5oZEc5eU9pQjFkRzFsTG1OeVpXRjBaVVZzWlcxbGJuUk1iMk5oZEc5eUtHVXVkR0Z5WjJWMEtTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnJaWGs2SUdNc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NISmxkbFpoYkhWbE9pQmxMblJoY21kbGRDNTJZV3gxWlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllXeDFaVG9nWlM1MFlYSm5aWFF1ZG1Gc2RXVWdLeUJqTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd0bGVVTnZaR1U2SUdVdWEyVjVRMjlrWlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0JrYjJOMWJXVnVkQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RyWlhsd2NtVnpjeWNzSUd0bGVWQnlaWE56U0dGdVpHeGxjaXdnZEhKMVpTazdYRzVjYmlBZ0lDQXZMeUJJUVVOTElHWnZjaUIwWlhOMGFXNW5YRzRnSUNBZ0tIVjBiV1V1WlhabGJuUk1hWE4wWlc1bGNuTWdQU0IxZEcxbExtVjJaVzUwVEdsemRHVnVaWEp6SUh4OElIdDlLVnNuYTJWNWNISmxjM01uWFNBOUlHdGxlVkJ5WlhOelNHRnVaR3hsY2p0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWjJWMFVHRnlZVzFsZEdWeVFubE9ZVzFsS0c1aGJXVXBJSHRjYmlBZ0lDQnVZVzFsSUQwZ2JtRnRaUzV5WlhCc1lXTmxLQzliWEZ4YlhTOHNJRndpWEZ4Y1hGdGNJaWt1Y21Wd2JHRmpaU2d2VzF4Y1hWMHZMQ0JjSWx4Y1hGeGRYQ0lwTzF4dUlDQWdJSFpoY2lCeVpXZGxlQ0E5SUc1bGR5QlNaV2RGZUhBb1hDSmJYRnhjWEQ4bVhWd2lJQ3NnYm1GdFpTQXJJRndpUFNoYlhpWWpYU29wWENJcExGeHVJQ0FnSUNBZ0lDQnlaWE4xYkhSeklEMGdjbVZuWlhndVpYaGxZeWhzYjJOaGRHbHZiaTV6WldGeVkyZ3BPMXh1SUNBZ0lISmxkSFZ5YmlCeVpYTjFiSFJ6SUQwOVBTQnVkV3hzSUQ4Z1hDSmNJaUE2SUdSbFkyOWtaVlZTU1VOdmJYQnZibVZ1ZENoeVpYTjFiSFJ6V3pGZExuSmxjR3hoWTJVb0wxeGNLeTluTENCY0lpQmNJaWtwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJpYjI5MGMzUnlZWEJWZEcxbEtDa2dlMXh1SUNCcFppQW9aRzlqZFcxbGJuUXVjbVZoWkhsVGRHRjBaU0E5UFNCY0ltTnZiWEJzWlhSbFhDSXBJSHRjYmlBZ0lDQjFkRzFsTG1sdWFYUW9LUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmx4dUlDQWdJQ0FnSUNCcGJtbDBSWFpsYm5SSVlXNWtiR1Z5Y3lncE8xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoMWRHMWxMbWx6VW1WamIzSmthVzVuS0NrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZuYVhOMFpYSkZkbVZ1ZENoY0lteHZZV1JjSWl3Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVnliRG9nZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQndjbTkwYjJOdmJEb2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxuQnliM1J2WTI5c0xGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JvYjNOME9pQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWFHOXpkQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVmhjbU5vT2lCM2FXNWtiM2N1Ykc5allYUnBiMjR1YzJWaGNtTm9MRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCb1lYTm9PaUIzYVc1a2IzY3ViRzlqWVhScGIyNHVhR0Z6YUZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlNrN1hHNGdJSDFjYm4xY2JseHVZbTl2ZEhOMGNtRndWWFJ0WlNncE8xeHVaRzlqZFcxbGJuUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25jbVZoWkhsemRHRjBaV05vWVc1blpTY3NJR0p2YjNSemRISmhjRlYwYldVcE8xeHVYRzUzYVc1a2IzY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25kVzVzYjJGa0p5d2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJSFYwYldVdWRXNXNiMkZrS0NrN1hHNTlMQ0IwY25WbEtUdGNibHh1ZDJsdVpHOTNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMlZ5Y205eUp5d2dablZ1WTNScGIyNGdLR1Z5Y2lrZ2UxeHVJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LRndpVTJOeWFYQjBJRVZ5Y205eU9pQmNJaUFySUdWeWNpNXRaWE56WVdkbElDc2dYQ0k2WENJZ0t5Qmxjbkl1ZFhKc0lDc2dYQ0lzWENJZ0t5Qmxjbkl1YkdsdVpTQXJJRndpT2x3aUlDc2daWEp5TG1OdmJDazdYRzU5S1R0Y2JseHViVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQjFkRzFsTzF4dUlsMTkiXX0=
