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
            Simulate.keydown(ele, key);
            Simulate.keypress(ele, key);
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
      utme.state.run = _.extend({speed: (settings && settings.get("runner.speed")) || "10"}, config);
      setupConditions(scenario).then(function() {
        state.autoRun = autoRun === true;
        state.status = "PLAYING";
        scenario.steps = filterExtraLoads(scenario.steps);
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
    settings = utme.settings = new Settings({"runner.speed": "realtime"});
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
        var setting = settings.get("recorder.events." + evt);
        if (utme.isRecording() && (setting === true || setting === 'true' || typeof setting === 'undefined') && e.target.hasAttribute && !e.target.hasAttribute('data-ignore') && $(e.target).parents("[data-ignore]").length == 0 && isNotInLabelOrValid(e.target)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9maWxlc2F2ZXIuanMvRmlsZVNhdmVyLmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvaG9tZS9kYXZpZHRpdHRzd29ydGgvcHJvamVjdHMvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFBQSxBQUFJLEVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUM3QixBQUFJLEVBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxPQUFN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akMsZUFBRyxDQUFHLENBQUEsTUFBSyxTQUFTLEtBQUs7QUFDekIsaUJBQUssQ0FBRyxDQUFBLE1BQUssU0FBUyxPQUFPO0FBQzdCLGVBQUcsQ0FBRyxDQUFBLE1BQUssU0FBUyxLQUFLO0FBQUEsVUFDN0IsQ0FDSixDQUFDLENBQUM7TUFDTjtBQUFBLElBQ0osQ0FBQyxDQUFDO0VBQ0o7QUFBQSxBQUNGO0FBQUEsQUFFQSxZQUFZLEFBQUMsRUFBQyxDQUFDO0FBQ2YsT0FBTyxpQkFBaUIsQUFBQyxDQUFDLGtCQUFpQixDQUFHLGNBQVksQ0FBQyxDQUFDO0FBRTVELEtBQUssaUJBQWlCLEFBQUMsQ0FBQyxRQUFPLENBQUcsVUFBUyxBQUFDLENBQUU7QUFDMUMsS0FBRyxPQUFPLEFBQUMsRUFBQyxDQUFDO0FBQ2pCLENBQUcsS0FBRyxDQUFDLENBQUM7QUFFUixLQUFLLGlCQUFpQixBQUFDLENBQUMsT0FBTSxDQUFHLFVBQVUsR0FBRSxDQUFHO0FBQzVDLEtBQUcsVUFBVSxBQUFDLENBQUMsZ0JBQWUsRUFBSSxDQUFBLEdBQUUsUUFBUSxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLElBQUksQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxLQUFLLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsSUFBSSxDQUFDLENBQUM7QUFDbkcsQ0FBQyxDQUFDO0FBRUYsS0FBSyxRQUFRLEVBQUksS0FBRyxDQUFDO0FBRWc2OEUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2pha2VhcmNoaWJhbGQvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMi4wLjFcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyB8fCAodHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZSh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJF9pc0FycmF5O1xuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJGlzQXJyYXkgPSAkJHV0aWxzJCRfaXNBcnJheTtcbiAgICB2YXIgJCR1dGlscyQkbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRGKCkgeyB9XG5cbiAgICB2YXIgJCR1dGlscyQkb19jcmVhdGUgPSAoT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vjb25kIGFyZ3VtZW50IG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIH1cbiAgICAgICQkdXRpbHMkJEYucHJvdG90eXBlID0gbztcbiAgICAgIHJldHVybiBuZXcgJCR1dGlscyQkRigpO1xuICAgIH0pO1xuXG4gICAgdmFyICQkYXNhcCQkbGVuID0gMDtcblxuICAgIHZhciAkJGFzYXAkJGRlZmF1bHQgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICAgICQkYXNhcCQkcXVldWVbJCRhc2FwJCRsZW5dID0gY2FsbGJhY2s7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuICsgMV0gPSBhcmc7XG4gICAgICAkJGFzYXAkJGxlbiArPSAyO1xuICAgICAgaWYgKCQkYXNhcCQkbGVuID09PSAyKSB7XG4gICAgICAgIC8vIElmIGxlbiBpcyAxLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAgICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAgICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkYXNhcCQkYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgICB2YXIgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuXG4gICAgLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbiAgICB2YXIgJCRhc2FwJCRpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU5leHRUaWNrKCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCQkYXNhcCQkZmx1c2gpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcigkJGFzYXAkJGZsdXNoKTtcbiAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gd2ViIHdvcmtlclxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSAkJGFzYXAkJGZsdXNoO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VTZXRUaW1lb3V0KCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KCQkYXNhcCQkZmx1c2gsIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkZmx1c2goKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8ICQkYXNhcCQkbGVuOyBpKz0yKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9ICQkYXNhcCQkcXVldWVbaV07XG4gICAgICAgIHZhciBhcmcgPSAkJGFzYXAkJHF1ZXVlW2krMV07XG5cbiAgICAgICAgY2FsbGJhY2soYXJnKTtcblxuICAgICAgICAkJGFzYXAkJHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICAkJGFzYXAkJHF1ZXVlW2krMV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgICQkYXNhcCQkbGVuID0gMDtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRzY2hlZHVsZUZsdXNoO1xuXG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VOZXh0VGljaygpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgfSBlbHNlIGlmICgkJGFzYXAkJGlzV29ya2VyKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlU2V0VGltZW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRub29wKCkge31cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEZVTEZJTExFRCA9IDE7XG4gICAgdmFyICQkJGludGVybmFsJCRSRUpFQ1RFRCAgPSAyO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS4nKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRnZXRUaGVuKHByb21pc2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlLnRoZW47XG4gICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgICAgICByZXR1cm4gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gICAgICAgJCRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICAgICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3IgPSAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB0aGVuYWJsZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICAgICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9LCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgICAgIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2UgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSkge1xuICAgICAgaWYgKG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IgPT09IHByb21pc2UuY29uc3RydWN0b3IpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRoZW4gPSAkJCRpbnRlcm5hbCQkZ2V0VGhlbihtYXliZVRoZW5hYmxlKTtcblxuICAgICAgICBpZiAodGhlbiA9PT0gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9IGVsc2UgaWYgKCQkdXRpbHMkJGlzRnVuY3Rpb24odGhlbikpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkpO1xuICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICAgICAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICAgICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cblxuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRGVUxGSUxMRUQ7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRSRUpFQ1RFRDtcbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIGxlbmd0aCA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgICAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcblxuICAgICAgaWYgKGxlbmd0aCA9PT0gMCAmJiBwYXJlbnQuX3N0YXRlKSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycztcbiAgICAgIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKSB7XG4gICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUiA9IG5ldyAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9ICQkdXRpbHMkJGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgICAgIGlmIChoYXNDYWxsYmFjaykge1xuICAgICAgICB2YWx1ZSA9ICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgICAgICBpZiAodmFsdWUgPT09ICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gZGV0YWlsO1xuICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIC8vIG5vb3BcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZShwcm9taXNlLCByZXNvbHZlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpe1xuICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkbWFrZVNldHRsZWRSZXN1bHQoc3RhdGUsIHBvc2l0aW9uLCB2YWx1ZSkge1xuICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdmdWxmaWxsZWQnLFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdGF0ZTogJ3JlamVjdGVkJyxcbiAgICAgICAgICByZWFzb246IHZhbHVlXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQsIGFib3J0T25SZWplY3QsIGxhYmVsKSB7XG4gICAgICB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgICB0aGlzLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgIHRoaXMuX2Fib3J0T25SZWplY3QgPSBhYm9ydE9uUmVqZWN0O1xuXG4gICAgICBpZiAodGhpcy5fdmFsaWRhdGVJbnB1dChpbnB1dCkpIHtcbiAgICAgICAgdGhpcy5faW5wdXQgICAgID0gaW5wdXQ7XG4gICAgICAgIHRoaXMubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgICAgIHRoaXMuX2luaXQoKTtcblxuICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgICAgIHRoaXMuX2VudW1lcmF0ZSgpO1xuICAgICAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QodGhpcy5wcm9taXNlLCB0aGlzLl92YWxpZGF0aW9uRXJyb3IoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRlSW5wdXQgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuICQkdXRpbHMkJGlzQXJyYXkoaW5wdXQpO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGlvbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG4gICAgfTtcblxuICAgIHZhciAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0ID0gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcjtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsZW5ndGggID0gdGhpcy5sZW5ndGg7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcbiAgICAgIHZhciBpbnB1dCAgID0gdGhpcy5faW5wdXQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbihlbnRyeSwgaSkge1xuICAgICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgICAgaWYgKCQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZShlbnRyeSkpIHtcbiAgICAgICAgaWYgKGVudHJ5LmNvbnN0cnVjdG9yID09PSBjICYmIGVudHJ5Ll9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgICBlbnRyeS5fb25lcnJvciA9IG51bGw7XG4gICAgICAgICAgdGhpcy5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KGMucmVzb2x2ZShlbnRyeSksIGkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcbiAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCBlbnRyeSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICAgIGlmICh0aGlzLl9hYm9ydE9uUmVqZWN0ICYmIHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB0aGlzLl9tYWtlUmVzdWx0KHN0YXRlLCBpLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fbWFrZVJlc3VsdCA9IGZ1bmN0aW9uKHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fd2lsbFNldHRsZUF0ID0gZnVuY3Rpb24ocHJvbWlzZSwgaSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoJCQkaW50ZXJuYWwkJFJFSkVDVEVELCBpLCByZWFzb24pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkYWxsJCRkZWZhdWx0ID0gZnVuY3Rpb24gYWxsKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICByZXR1cm4gbmV3ICQkJGVudW1lcmF0b3IkJGRlZmF1bHQodGhpcywgZW50cmllcywgdHJ1ZSAvKiBhYm9ydCBvbiByZWplY3QgKi8sIGxhYmVsKS5wcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQgPSBmdW5jdGlvbiByYWNlKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcblxuICAgICAgaWYgKCEkJHV0aWxzJCRpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcblxuICAgICAgZnVuY3Rpb24gb25GdWxmaWxsbWVudCh2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uUmVqZWN0aW9uKHJlYXNvbikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUoQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKSwgdW5kZWZpbmVkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQgPSBmdW5jdGlvbiByZXNvbHZlKG9iamVjdCwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQgPSBmdW5jdGlvbiByZWplY3QocmVhc29uLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2U7XG5cbiAgICAvKipcbiAgICAgIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgICAgIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gICAgICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZeKAmXMgZXZlbnR1YWwgdmFsdWUgb3IgdGhlIHJlYXNvblxuICAgICAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIFRlcm1pbm9sb2d5XG4gICAgICAtLS0tLS0tLS0tLVxuXG4gICAgICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAgICAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAgICAgLSBgdmFsdWVgIGlzIGFueSBsZWdhbCBKYXZhU2NyaXB0IHZhbHVlIChpbmNsdWRpbmcgdW5kZWZpbmVkLCBhIHRoZW5hYmxlLCBvciBhIHByb21pc2UpLlxuICAgICAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gICAgICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gICAgICAtIGBzZXR0bGVkYCB0aGUgZmluYWwgcmVzdGluZyBzdGF0ZSBvZiBhIHByb21pc2UsIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cblxuICAgICAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gICAgICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICAgICAgc3RhdGUuICBQcm9taXNlcyB0aGF0IGFyZSByZWplY3RlZCBoYXZlIGEgcmVqZWN0aW9uIHJlYXNvbiBhbmQgYXJlIGluIHRoZVxuICAgICAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgICAgIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICAgICAgcHJvbWlzZSwgdGhlbiB0aGUgb3JpZ2luYWwgcHJvbWlzZSdzIHNldHRsZWQgc3RhdGUgd2lsbCBtYXRjaCB0aGUgdmFsdWUnc1xuICAgICAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gICAgICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gICAgICBpdHNlbGYgZnVsZmlsbC5cblxuXG4gICAgICBCYXNpYyBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBgYGBqc1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gb24gc3VjY2Vzc1xuICAgICAgICByZXNvbHZlKHZhbHVlKTtcblxuICAgICAgICAvLyBvbiBmYWlsdXJlXG4gICAgICAgIHJlamVjdChyZWFzb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS0tLS1cblxuICAgICAgUHJvbWlzZXMgc2hpbmUgd2hlbiBhYnN0cmFjdGluZyBhd2F5IGFzeW5jaHJvbm91cyBpbnRlcmFjdGlvbnMgc3VjaCBhc1xuICAgICAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBnZXRKU09OKHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5ET05FKSB7XG4gICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gICAgICBgYGBqc1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICAgICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgICAgIF0pLnRoZW4oZnVuY3Rpb24odmFsdWVzKXtcbiAgICAgICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgICAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBjbGFzcyBQcm9taXNlXG4gICAgICBAcGFyYW0ge2Z1bmN0aW9ufSByZXNvbHZlclxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQGNvbnN0cnVjdG9yXG4gICAgKi9cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIHRoaXMuX2lkID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyKys7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgICAgIGlmICgkJCRpbnRlcm5hbCQkbm9vcCAhPT0gcmVzb2x2ZXIpIHtcbiAgICAgICAgaWYgKCEkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgICAgICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSkpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5hbGwgPSAkJHByb21pc2UkYWxsJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yYWNlID0gJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlc29sdmUgPSAkJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVqZWN0ID0gJCRwcm9taXNlJHJlamVjdCQkZGVmYXVsdDtcblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gICAgICBjb25zdHJ1Y3RvcjogJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLFxuXG4gICAgLyoqXG4gICAgICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgICAgIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gICAgICByZWFzb24gd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgIC8vIHVzZXIgaXMgYXZhaWxhYmxlXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyB1c2VyIGlzIHVuYXZhaWxhYmxlLCBhbmQgeW91IGFyZSBnaXZlbiB0aGUgcmVhc29uIHdoeVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQ2hhaW5pbmdcbiAgICAgIC0tLS0tLS0tXG5cbiAgICAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gICAgICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gICAgICBvciByZWplY3Rpb24gaGFuZGxlciwgb3IgcmVqZWN0ZWQgaWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gdXNlci5uYW1lO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gJ2RlZmF1bHQgbmFtZSc7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgICAgIC8vIHdpbGwgYmUgYCdkZWZhdWx0IG5hbWUnYFxuICAgICAgfSk7XG5cbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgICAgIH0pO1xuICAgICAgYGBgXG4gICAgICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgUGVkYWdvZ2ljYWxFeGNlcHRpb24oJ1Vwc3RyZWFtIGVycm9yJyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIFRoZSBgUGVkZ2Fnb2NpYWxFeGNlcHRpb25gIGlzIHByb3BhZ2F0ZWQgYWxsIHRoZSB3YXkgZG93biB0byBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBc3NpbWlsYXRpb25cbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICAgICAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICAgICAgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uIGhhbmRsZXIuIFRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCB0aGVuIGJlIHBlbmRpbmdcbiAgICAgIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgU2ltcGxlIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kUmVzdWx0KGZ1bmN0aW9uKHJlc3VsdCwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZFJlc3VsdCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgYXV0aG9yLCBib29rcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgICAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG5cbiAgICAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuXG4gICAgICB9XG5cbiAgICAgIGZpbmRBdXRob3IoZnVuY3Rpb24oYXV0aG9yLCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmluZEJvb29rc0J5QXV0aG9yKGF1dGhvciwgZnVuY3Rpb24oYm9va3MsIGVycikge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZEF1dGhvcigpLlxuICAgICAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihib29rcyl7XG4gICAgICAgICAgLy8gZm91bmQgYm9va3NcbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIHRoZW5cbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGVkXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICB0aGVuOiBmdW5jdGlvbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIHN0YXRlID0gcGFyZW50Ll9zdGF0ZTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQgJiYgIW9uRnVsZmlsbG1lbnQgfHwgc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCAmJiAhb25SZWplY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHBhcmVudC5fcmVzdWx0O1xuXG4gICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tzdGF0ZSAtIDFdO1xuICAgICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHN0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9LFxuXG4gICAgLyoqXG4gICAgICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gICAgICBhcyB0aGUgY2F0Y2ggYmxvY2sgb2YgYSB0cnkvY2F0Y2ggc3RhdGVtZW50LlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgICAgIH1cblxuICAgICAgLy8gc3luY2hyb25vdXNcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbmRBdXRob3IoKTtcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9XG5cbiAgICAgIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgICAgIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCBjYXRjaFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3Rpb25cbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgICdjYXRjaCc6IGZ1bmN0aW9uKG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgICAgdmFyIGxvY2FsO1xuXG4gICAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbG9jYWwgPSBnbG9iYWw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5kb2N1bWVudCkge1xuICAgICAgICBsb2NhbCA9IHdpbmRvdztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICAgIH1cblxuICAgICAgdmFyIGVzNlByb21pc2VTdXBwb3J0ID1cbiAgICAgICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAgICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAgICAgLy8gRmlyZWZveC9DaHJvbWUgZXhwZXJpbWVudGFsIGltcGxlbWVudGF0aW9uc1xuICAgICAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcImFsbFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgICAgICAvLyBhcyB0aGUgYXJnIHJhdGhlciB0aGFuIGEgZnVuY3Rpb25cbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZXNvbHZlO1xuICAgICAgICAgIG5ldyBsb2NhbC5Qcm9taXNlKGZ1bmN0aW9uKHIpIHsgcmVzb2x2ZSA9IHI7IH0pO1xuICAgICAgICAgIHJldHVybiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgICAgICB9KCkpO1xuXG4gICAgICBpZiAoIWVzNlByb21pc2VTdXBwb3J0KSB7XG4gICAgICAgIGxvY2FsLlByb21pc2UgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQ7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2UgPSB7XG4gICAgICAnUHJvbWlzZSc6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCxcbiAgICAgICdwb2x5ZmlsbCc6ICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHRcbiAgICB9O1xuXG4gICAgLyogZ2xvYmFsIGRlZmluZTp0cnVlIG1vZHVsZTp0cnVlIHdpbmRvdzogdHJ1ZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZVsnYW1kJ10pIHtcbiAgICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGVbJ2V4cG9ydHMnXSkge1xuICAgICAgbW9kdWxlWydleHBvcnRzJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbJ0VTNlByb21pc2UnXSA9IGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9XG59KS5jYWxsKHRoaXMpOyIsIi8qIEZpbGVTYXZlci5qc1xuICogQSBzYXZlQXMoKSBGaWxlU2F2ZXIgaW1wbGVtZW50YXRpb24uXG4gKiAyMDE0LTEyLTE3XG4gKlxuICogQnkgRWxpIEdyZXksIGh0dHA6Ly9lbGlncmV5LmNvbVxuICogTGljZW5zZTogWDExL01JVFxuICogICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiAqL1xuXG4vKmdsb2JhbCBzZWxmICovXG4vKmpzbGludCBiaXR3aXNlOiB0cnVlLCBpbmRlbnQ6IDQsIGxheGJyZWFrOiB0cnVlLCBsYXhjb21tYTogdHJ1ZSwgc21hcnR0YWJzOiB0cnVlLCBwbHVzcGx1czogdHJ1ZSAqL1xuXG4vKiEgQHNvdXJjZSBodHRwOi8vcHVybC5lbGlncmV5LmNvbS9naXRodWIvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0ZpbGVTYXZlci5qcyAqL1xuXG52YXIgc2F2ZUFzID0gc2F2ZUFzXG4gIC8vIElFIDEwKyAobmF0aXZlIHNhdmVBcylcbiAgfHwgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iICYmIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iLmJpbmQobmF2aWdhdG9yKSlcbiAgLy8gRXZlcnlvbmUgZWxzZVxuICB8fCAoZnVuY3Rpb24odmlldykge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0Ly8gSUUgPDEwIGlzIGV4cGxpY2l0bHkgdW5zdXBwb3J0ZWRcblx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiZcblx0ICAgIC9NU0lFIFsxLTldXFwuLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhclxuXHRcdCAgZG9jID0gdmlldy5kb2N1bWVudFxuXHRcdCAgLy8gb25seSBnZXQgVVJMIHdoZW4gbmVjZXNzYXJ5IGluIGNhc2UgQmxvYi5qcyBoYXNuJ3Qgb3ZlcnJpZGRlbiBpdCB5ZXRcblx0XHQsIGdldF9VUkwgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2aWV3LlVSTCB8fCB2aWV3LndlYmtpdFVSTCB8fCB2aWV3O1xuXHRcdH1cblx0XHQsIHNhdmVfbGluayA9IGRvYy5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsIFwiYVwiKVxuXHRcdCwgY2FuX3VzZV9zYXZlX2xpbmsgPSBcImRvd25sb2FkXCIgaW4gc2F2ZV9saW5rXG5cdFx0LCBjbGljayA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBldmVudCA9IGRvYy5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO1xuXHRcdFx0ZXZlbnQuaW5pdE1vdXNlRXZlbnQoXG5cdFx0XHRcdFwiY2xpY2tcIiwgdHJ1ZSwgZmFsc2UsIHZpZXcsIDAsIDAsIDAsIDAsIDBcblx0XHRcdFx0LCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMCwgbnVsbFxuXHRcdFx0KTtcblx0XHRcdG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHRcdCwgd2Via2l0X3JlcV9mcyA9IHZpZXcud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW1cblx0XHQsIHJlcV9mcyA9IHZpZXcucmVxdWVzdEZpbGVTeXN0ZW0gfHwgd2Via2l0X3JlcV9mcyB8fCB2aWV3Lm1velJlcXVlc3RGaWxlU3lzdGVtXG5cdFx0LCB0aHJvd19vdXRzaWRlID0gZnVuY3Rpb24oZXgpIHtcblx0XHRcdCh2aWV3LnNldEltbWVkaWF0ZSB8fCB2aWV3LnNldFRpbWVvdXQpKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aHJvdyBleDtcblx0XHRcdH0sIDApO1xuXHRcdH1cblx0XHQsIGZvcmNlX3NhdmVhYmxlX3R5cGUgPSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiXG5cdFx0LCBmc19taW5fc2l6ZSA9IDBcblx0XHQvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTM3NTI5NyNjNyBhbmRcblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvY29tbWl0LzQ4NTkzMGEjY29tbWl0Y29tbWVudC04NzY4MDQ3XG5cdFx0Ly8gZm9yIHRoZSByZWFzb25pbmcgYmVoaW5kIHRoZSB0aW1lb3V0IGFuZCByZXZvY2F0aW9uIGZsb3dcblx0XHQsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCA9IDUwMCAvLyBpbiBtc1xuXHRcdCwgcmV2b2tlID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0dmFyIHJldm9rZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlID09PSBcInN0cmluZ1wiKSB7IC8vIGZpbGUgaXMgYW4gb2JqZWN0IFVSTFxuXHRcdFx0XHRcdGdldF9VUkwoKS5yZXZva2VPYmplY3RVUkwoZmlsZSk7XG5cdFx0XHRcdH0gZWxzZSB7IC8vIGZpbGUgaXMgYSBGaWxlXG5cdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGlmICh2aWV3LmNocm9tZSkge1xuXHRcdFx0XHRyZXZva2VyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZXRUaW1lb3V0KHJldm9rZXIsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCwgZGlzcGF0Y2ggPSBmdW5jdGlvbihmaWxlc2F2ZXIsIGV2ZW50X3R5cGVzLCBldmVudCkge1xuXHRcdFx0ZXZlbnRfdHlwZXMgPSBbXS5jb25jYXQoZXZlbnRfdHlwZXMpO1xuXHRcdFx0dmFyIGkgPSBldmVudF90eXBlcy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdHZhciBsaXN0ZW5lciA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF90eXBlc1tpXV07XG5cdFx0XHRcdGlmICh0eXBlb2YgbGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRsaXN0ZW5lci5jYWxsKGZpbGVzYXZlciwgZXZlbnQgfHwgZmlsZXNhdmVyKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRcdFx0dGhyb3dfb3V0c2lkZShleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCwgRmlsZVNhdmVyID0gZnVuY3Rpb24oYmxvYiwgbmFtZSkge1xuXHRcdFx0Ly8gRmlyc3QgdHJ5IGEuZG93bmxvYWQsIHRoZW4gd2ViIGZpbGVzeXN0ZW0sIHRoZW4gb2JqZWN0IFVSTHNcblx0XHRcdHZhclxuXHRcdFx0XHQgIGZpbGVzYXZlciA9IHRoaXNcblx0XHRcdFx0LCB0eXBlID0gYmxvYi50eXBlXG5cdFx0XHRcdCwgYmxvYl9jaGFuZ2VkID0gZmFsc2Vcblx0XHRcdFx0LCBvYmplY3RfdXJsXG5cdFx0XHRcdCwgdGFyZ2V0X3ZpZXdcblx0XHRcdFx0LCBkaXNwYXRjaF9hbGwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSB3cml0ZWVuZFwiLnNwbGl0KFwiIFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb24gYW55IGZpbGVzeXMgZXJyb3JzIHJldmVydCB0byBzYXZpbmcgd2l0aCBvYmplY3QgVVJMc1xuXHRcdFx0XHQsIGZzX2Vycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gZG9uJ3QgY3JlYXRlIG1vcmUgb2JqZWN0IFVSTHMgdGhhbiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoYmxvYl9jaGFuZ2VkIHx8ICFvYmplY3RfdXJsKSB7XG5cdFx0XHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRhcmdldF92aWV3KSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRfdmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dmFyIG5ld190YWIgPSB2aWV3Lm9wZW4ob2JqZWN0X3VybCwgXCJfYmxhbmtcIik7XG5cdFx0XHRcdFx0XHRpZiAobmV3X3RhYiA9PSB1bmRlZmluZWQgJiYgdHlwZW9mIHNhZmFyaSAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0XHRcdFx0XHQvL0FwcGxlIGRvIG5vdCBhbGxvdyB3aW5kb3cub3Blbiwgc2VlIGh0dHA6Ly9iaXQubHkvMWtaZmZSSVxuXHRcdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCwgYWJvcnRhYmxlID0gZnVuY3Rpb24oZnVuYykge1xuXHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmIChmaWxlc2F2ZXIucmVhZHlTdGF0ZSAhPT0gZmlsZXNhdmVyLkRPTkUpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdCwgY3JlYXRlX2lmX25vdF9mb3VuZCA9IHtjcmVhdGU6IHRydWUsIGV4Y2x1c2l2ZTogZmFsc2V9XG5cdFx0XHRcdCwgc2xpY2Vcblx0XHRcdDtcblx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cdFx0XHRpZiAoIW5hbWUpIHtcblx0XHRcdFx0bmFtZSA9IFwiZG93bmxvYWRcIjtcblx0XHRcdH1cblx0XHRcdGlmIChjYW5fdXNlX3NhdmVfbGluaykge1xuXHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0c2F2ZV9saW5rLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRzYXZlX2xpbmsuZG93bmxvYWQgPSBuYW1lO1xuXHRcdFx0XHRjbGljayhzYXZlX2xpbmspO1xuXHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyBPYmplY3QgYW5kIHdlYiBmaWxlc3lzdGVtIFVSTHMgaGF2ZSBhIHByb2JsZW0gc2F2aW5nIGluIEdvb2dsZSBDaHJvbWUgd2hlblxuXHRcdFx0Ly8gdmlld2VkIGluIGEgdGFiLCBzbyBJIGZvcmNlIHNhdmUgd2l0aCBhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cblx0XHRcdC8vIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTkxMTU4XG5cdFx0XHQvLyBVcGRhdGU6IEdvb2dsZSBlcnJhbnRseSBjbG9zZWQgOTExNTgsIEkgc3VibWl0dGVkIGl0IGFnYWluOlxuXHRcdFx0Ly8gaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTM4OTY0MlxuXHRcdFx0aWYgKHZpZXcuY2hyb21lICYmIHR5cGUgJiYgdHlwZSAhPT0gZm9yY2Vfc2F2ZWFibGVfdHlwZSkge1xuXHRcdFx0XHRzbGljZSA9IGJsb2Iuc2xpY2UgfHwgYmxvYi53ZWJraXRTbGljZTtcblx0XHRcdFx0YmxvYiA9IHNsaWNlLmNhbGwoYmxvYiwgMCwgYmxvYi5zaXplLCBmb3JjZV9zYXZlYWJsZV90eXBlKTtcblx0XHRcdFx0YmxvYl9jaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdC8vIFNpbmNlIEkgY2FuJ3QgYmUgc3VyZSB0aGF0IHRoZSBndWVzc2VkIG1lZGlhIHR5cGUgd2lsbCB0cmlnZ2VyIGEgZG93bmxvYWRcblx0XHRcdC8vIGluIFdlYktpdCwgSSBhcHBlbmQgLmRvd25sb2FkIHRvIHRoZSBmaWxlbmFtZS5cblx0XHRcdC8vIGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD02NTQ0MFxuXHRcdFx0aWYgKHdlYmtpdF9yZXFfZnMgJiYgbmFtZSAhPT0gXCJkb3dubG9hZFwiKSB7XG5cdFx0XHRcdG5hbWUgKz0gXCIuZG93bmxvYWRcIjtcblx0XHRcdH1cblx0XHRcdGlmICh0eXBlID09PSBmb3JjZV9zYXZlYWJsZV90eXBlIHx8IHdlYmtpdF9yZXFfZnMpIHtcblx0XHRcdFx0dGFyZ2V0X3ZpZXcgPSB2aWV3O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCFyZXFfZnMpIHtcblx0XHRcdFx0ZnNfZXJyb3IoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0ZnNfbWluX3NpemUgKz0gYmxvYi5zaXplO1xuXHRcdFx0cmVxX2ZzKHZpZXcuVEVNUE9SQVJZLCBmc19taW5fc2l6ZSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZzKSB7XG5cdFx0XHRcdGZzLnJvb3QuZ2V0RGlyZWN0b3J5KFwic2F2ZWRcIiwgY3JlYXRlX2lmX25vdF9mb3VuZCwgYWJvcnRhYmxlKGZ1bmN0aW9uKGRpcikge1xuXHRcdFx0XHRcdHZhciBzYXZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRkaXIuZ2V0RmlsZShuYW1lLCBjcmVhdGVfaWZfbm90X2ZvdW5kLCBhYm9ydGFibGUoZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0XHRcdFx0XHRmaWxlLmNyZWF0ZVdyaXRlcihhYm9ydGFibGUoZnVuY3Rpb24od3JpdGVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLm9ud3JpdGVlbmQgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0X3ZpZXcubG9jYXRpb24uaHJlZiA9IGZpbGUudG9VUkwoKTtcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVlbmRcIiwgZXZlbnQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV2b2tlKGZpbGUpO1xuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBlcnJvciA9IHdyaXRlci5lcnJvcjtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChlcnJvci5jb2RlICE9PSBlcnJvci5BQk9SVF9FUlIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnNfZXJyb3IoKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSBhYm9ydFwiLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cml0ZXJbXCJvblwiICsgZXZlbnRdID0gZmlsZXNhdmVyW1wib25cIiArIGV2ZW50XTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR3cml0ZXIud3JpdGUoYmxvYik7XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLmFib3J0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cml0ZXIuYWJvcnQoKTtcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5XUklUSU5HO1xuXHRcdFx0XHRcdFx0XHR9KSwgZnNfZXJyb3IpO1xuXHRcdFx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGRpci5nZXRGaWxlKG5hbWUsIHtjcmVhdGU6IGZhbHNlfSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdC8vIGRlbGV0ZSBmaWxlIGlmIGl0IGFscmVhZHkgZXhpc3RzXG5cdFx0XHRcdFx0XHRmaWxlLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0c2F2ZSgpO1xuXHRcdFx0XHRcdH0pLCBhYm9ydGFibGUoZnVuY3Rpb24oZXgpIHtcblx0XHRcdFx0XHRcdGlmIChleC5jb2RlID09PSBleC5OT1RfRk9VTkRfRVJSKSB7XG5cdFx0XHRcdFx0XHRcdHNhdmUoKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSkpO1xuXHRcdFx0XHR9KSwgZnNfZXJyb3IpO1xuXHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHR9XG5cdFx0LCBGU19wcm90byA9IEZpbGVTYXZlci5wcm90b3R5cGVcblx0XHQsIHNhdmVBcyA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUpIHtcblx0XHRcdHJldHVybiBuZXcgRmlsZVNhdmVyKGJsb2IsIG5hbWUpO1xuXHRcdH1cblx0O1xuXHRGU19wcm90by5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmaWxlc2F2ZXIgPSB0aGlzO1xuXHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcImFib3J0XCIpO1xuXHR9O1xuXHRGU19wcm90by5yZWFkeVN0YXRlID0gRlNfcHJvdG8uSU5JVCA9IDA7XG5cdEZTX3Byb3RvLldSSVRJTkcgPSAxO1xuXHRGU19wcm90by5ET05FID0gMjtcblxuXHRGU19wcm90by5lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVzdGFydCA9XG5cdEZTX3Byb3RvLm9ucHJvZ3Jlc3MgPVxuXHRGU19wcm90by5vbndyaXRlID1cblx0RlNfcHJvdG8ub25hYm9ydCA9XG5cdEZTX3Byb3RvLm9uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlZW5kID1cblx0XHRudWxsO1xuXG5cdHJldHVybiBzYXZlQXM7XG59KFxuXHQgICB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZWxmXG5cdHx8IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93XG5cdHx8IHRoaXMuY29udGVudFxuKSk7XG4vLyBgc2VsZmAgaXMgdW5kZWZpbmVkIGluIEZpcmVmb3ggZm9yIEFuZHJvaWQgY29udGVudCBzY3JpcHQgY29udGV4dFxuLy8gd2hpbGUgYHRoaXNgIGlzIG5zSUNvbnRlbnRGcmFtZU1lc3NhZ2VNYW5hZ2VyXG4vLyB3aXRoIGFuIGF0dHJpYnV0ZSBgY29udGVudGAgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgd2luZG93XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gc2F2ZUFzO1xufSBlbHNlIGlmICgodHlwZW9mIGRlZmluZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkZWZpbmUgIT09IG51bGwpICYmIChkZWZpbmUuYW1kICE9IG51bGwpKSB7XG4gIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNhdmVBcztcbiAgfSk7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIHV0bWUgPSByZXF1aXJlKCcuLi91dG1lJyk7XG52YXIgc2F2ZUFzID0gcmVxdWlyZSgnZmlsZXNhdmVyLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gdXRtZS5yZWdpc3RlclNhdmVIYW5kbGVyKGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkoc2NlbmFyaW8sIG51bGwsIFwiIFwiKV0sIHt0eXBlOiBcInRleHQvcGxhaW47Y2hhcnNldD11dGYtOFwifSk7XG4gICBzYXZlQXMoYmxvYiwgc2NlbmFyaW8ubmFtZSArIFwiLmpzb25cIik7XG59KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNCbGNuTnBjM1JsY25NdmRYUnRaUzFtYVd4bExYQmxjbk5wYzNSbGNpNXFjeUlzSW5OdmRYSmpaWE1pT2xzaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNCbGNuTnBjM1JsY25NdmRYUnRaUzFtYVd4bExYQmxjbk5wYzNSbGNpNXFjeUpkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lRVUZCUVN4SlFVRkpMRWxCUVVrc1IwRkJSeXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdRVUZET1VJc1NVRkJTU3hOUVVGTkxFZEJRVWNzVDBGQlR5eERRVUZETEdOQlFXTXNRMEZCUXl4RFFVRkRPenRCUVVWeVF5eE5RVUZOTEVOQlFVTXNUMEZCVHl4SFFVRkhMRWxCUVVrc1EwRkJReXh0UWtGQmJVSXNRMEZCUXl4VlFVRlZMRkZCUVZFc1JVRkJSVHRIUVVNelJDeEpRVUZKTEVsQlFVa3NSMEZCUnl4SlFVRkpMRWxCUVVrc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF5eEZRVUZGTEVOQlFVTXNTVUZCU1N4RlFVRkZMREJDUVVFd1FpeERRVUZETEVOQlFVTXNRMEZCUXp0SFFVTXZSaXhOUVVGTkxFTkJRVU1zU1VGQlNTeEZRVUZGTEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1QwRkJUeXhEUVVGRExFTkJRVU03UTBGRGVFTXNRMEZCUXlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYkluWmhjaUIxZEcxbElEMGdjbVZ4ZFdseVpTZ25MaTR2ZFhSdFpTY3BPMXh1ZG1GeUlITmhkbVZCY3lBOUlISmxjWFZwY21Vb0oyWnBiR1Z6WVhabGNpNXFjeWNwTzF4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlIVjBiV1V1Y21WbmFYTjBaWEpUWVhabFNHRnVaR3hsY2lobWRXNWpkR2x2YmlBb2MyTmxibUZ5YVc4cElIdGNiaUFnSUhaaGNpQmliRzlpSUQwZ2JtVjNJRUpzYjJJb1cwcFRUMDR1YzNSeWFXNW5hV1o1S0hOalpXNWhjbWx2TENCdWRXeHNMQ0JjSWlCY0lpbGRMQ0I3ZEhsd1pUb2dYQ0owWlhoMEwzQnNZV2x1TzJOb1lYSnpaWFE5ZFhSbUxUaGNJbjBwTzF4dUlDQWdjMkYyWlVGektHSnNiMklzSUhOalpXNWhjbWx2TG01aGJXVWdLeUJjSWk1cWMyOXVYQ0lwTzF4dWZTazdJbDE5IiwidmFyIHV0bWUgPSByZXF1aXJlKCcuLi91dG1lLmpzJyk7XG5cbmZ1bmN0aW9uIGdldEJhc2VVUkwgKCkge1xuICByZXR1cm4gdXRtZS5zdGF0ZSAmJiB1dG1lLnN0YXRlLnRlc3RTZXJ2ZXIgPyB1dG1lLnN0YXRlLnRlc3RTZXJ2ZXIgOiBnZXRQYXJhbWV0ZXJCeU5hbWUoXCJ1dG1lX3Rlc3Rfc2VydmVyXCIpIHx8IFwiaHR0cDovLzAuMC4wLjA6OTA0My9cIjtcbn1cblxudmFyIHNlcnZlclJlcG9ydGVyID0ge1xuICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBnZXRCYXNlVVJMKCkgKyBcImVycm9yXCIsXG4gICAgICAgICAgZGF0YTogeyBkYXRhOiBlcnJvciB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHV0bWUuc2V0dGluZ3MuZ2V0KFwiY29uc29sZUxvZ2dpbmdcIikpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc3VjY2VzczogZnVuY3Rpb24gKHN1Y2Nlc3MsIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBnZXRCYXNlVVJMKCkgKyBcInN1Y2Nlc3NcIixcbiAgICAgICAgICBkYXRhOiB7IGRhdGE6IHN1Y2Nlc3MgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh1dG1lLnNldHRpbmdzLmdldChcImNvbnNvbGVMb2dnaW5nXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coc3VjY2Vzcyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGxvZzogZnVuY3Rpb24gKGxvZywgc2NlbmFyaW8sIHV0bWUpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcImxvZ1wiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogbG9nIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodXRtZS5zZXR0aW5ncy5nZXQoXCJjb25zb2xlTG9nZ2luZ1wiKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGxvZyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbG9hZFNjZW5hcmlvOiBmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIGpzb25wOiBcImNhbGxiYWNrXCIsXG5cbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcblxuICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXG5cbiAgICAgICAgICAgIHVybDogIGdldEJhc2VVUkwoKSArIFwic2NlbmFyaW8vXCIgKyBuYW1lLFxuXG4gICAgICAgICAgICAvLyB0ZWxsIGpRdWVyeSB3ZSdyZSBleHBlY3RpbmcgSlNPTlBcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzYXZlU2NlbmFyaW86IGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJzY2VuYXJpb1wiLFxuICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHNjZW5hcmlvLCBudWxsLCBcIiBcIiksXG4gICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWRTZXR0aW5nczogZnVuY3Rpb24gKGNhbGxiYWNrLCBlcnJvcikge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcIlwiLFxuICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXG4gICAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcInNldHRpbmdzXCIsXG4gICAgICAgICAgICAvLyB0ZWxsIGpRdWVyeSB3ZSdyZSBleHBlY3RpbmcgSlNPTlBcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcblxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbnV0bWUucmVnaXN0ZXJSZXBvcnRIYW5kbGVyKHNlcnZlclJlcG9ydGVyKTtcbnV0bWUucmVnaXN0ZXJMb2FkSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5sb2FkU2NlbmFyaW8pO1xudXRtZS5yZWdpc3RlclNhdmVIYW5kbGVyKHNlcnZlclJlcG9ydGVyLnNhdmVTY2VuYXJpbyk7XG51dG1lLnJlZ2lzdGVyU2V0dGluZ3NMb2FkSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5sb2FkU2V0dGluZ3MpO1xuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNKbGNHOXlkR1Z5Y3k5elpYSjJaWEl0Y21Wd2IzSjBaWEl1YW5NaUxDSnpiM1Z5WTJWeklqcGJJaTlvYjIxbEwyUmhkbWxrZEdsMGRITjNiM0owYUM5d2NtOXFaV04wY3k5MWRHMWxMM055WXk5cWN5OXlaWEJ2Y25SbGNuTXZjMlZ5ZG1WeUxYSmxjRzl5ZEdWeUxtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTEVsQlFVa3NTVUZCU1N4SFFVRkhMRTlCUVU4c1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6czdRVUZGYWtNc1UwRkJVeXhWUVVGVkxFbEJRVWs3UlVGRGNrSXNUMEZCVHl4SlFVRkpMRU5CUVVNc1MwRkJTeXhKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNWVUZCVlN4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVlVGQlZTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExHdENRVUZyUWl4RFFVRkRMRWxCUVVrc2MwSkJRWE5DTEVOQlFVTTdRVUZEZUVrc1EwRkJRenM3UVVGRlJDeEpRVUZKTEdOQlFXTXNSMEZCUnp0SlFVTnFRaXhMUVVGTExFVkJRVVVzVlVGQlZTeExRVUZMTEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSVHRSUVVOd1F5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRPMVZCUTB3c1NVRkJTU3hGUVVGRkxFMUJRVTA3VlVGRFdpeEhRVUZITEVWQlFVVXNWVUZCVlN4RlFVRkZMRWRCUVVjc1QwRkJUenRWUVVNelFpeEpRVUZKTEVWQlFVVXNSVUZCUlN4SlFVRkpMRVZCUVVVc1MwRkJTeXhGUVVGRk8xVkJRM0pDTEZGQlFWRXNSVUZCUlN4TlFVRk5PMU5CUTJwQ0xFTkJRVU1zUTBGQlF6dFJRVU5JTEVsQlFVa3NTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1JVRkJSVHRWUVVOMlF5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8xTkJRM1JDTzB0QlEwbzdTVUZEUkN4UFFVRlBMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlR0UlFVTjRReXhEUVVGRExFTkJRVU1zU1VGQlNTeERRVUZETzFWQlEwd3NTVUZCU1N4RlFVRkZMRTFCUVUwN1ZVRkRXaXhIUVVGSExFVkJRVVVzVlVGQlZTeEZRVUZGTEVkQlFVY3NVMEZCVXp0VlFVTTNRaXhKUVVGSkxFVkJRVVVzUlVGQlJTeEpRVUZKTEVWQlFVVXNUMEZCVHl4RlFVRkZPMVZCUTNaQ0xGRkJRVkVzUlVGQlJTeE5RVUZOTzFOQlEycENMRU5CUVVNc1EwRkJRenRSUVVOSUxFbEJRVWtzU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNSVUZCUlR0VlFVTjJReXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMU5CUTNSQ08wdEJRMG83U1VGRFJDeEhRVUZITEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUlVGQlJUdFJRVU5vUXl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRE8xVkJRMHdzU1VGQlNTeEZRVUZGTEUxQlFVMDdWVUZEV2l4SFFVRkhMRWRCUVVjc1ZVRkJWU3hGUVVGRkxFZEJRVWNzUzBGQlN6dFZRVU14UWl4SlFVRkpMRVZCUVVVc1JVRkJSU3hKUVVGSkxFVkJRVVVzUjBGQlJ5eEZRVUZGTzFWQlEyNUNMRkZCUVZFc1JVRkJSU3hOUVVGTk8xTkJRMnBDTEVOQlFVTXNRMEZCUXp0UlFVTklMRWxCUVVrc1NVRkJTU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zUlVGQlJUdFZRVU4yUXl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlEyeENPMEZCUTFRc1MwRkJTenM3U1VGRlJDeFpRVUZaTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVc1VVRkJVU3hGUVVGRk8xRkJRM0JETEVOQlFVTXNRMEZCUXl4SlFVRkpMRU5CUVVNN1FVRkRaaXhaUVVGWkxFdEJRVXNzUlVGQlJTeFZRVUZWT3p0QlFVVTNRaXhaUVVGWkxGZEJRVmNzUlVGQlJTeHBRMEZCYVVNN08wRkJSVEZFTEZsQlFWa3NWMEZCVnl4RlFVRkZMRWxCUVVrN08wRkJSVGRDTEZsQlFWa3NSMEZCUnl4SFFVRkhMRlZCUVZVc1JVRkJSU3hIUVVGSExGZEJRVmNzUjBGQlJ5eEpRVUZKTzBGQlEyNUVPenRCUVVWQkxGbEJRVmtzVVVGQlVTeEZRVUZGTEU5QlFVODdPMWxCUldwQ0xFOUJRVThzUlVGQlJTeFZRVUZWTEVsQlFVa3NSVUZCUlR0blFrRkRja0lzVVVGQlVTeERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRPMkZCUTJ4Q08xTkJRMG9zUTBGQlF5eERRVUZETzBGQlExZ3NTMEZCU3pzN1NVRkZSQ3haUVVGWkxFVkJRVVVzVlVGQlZTeFJRVUZSTEVWQlFVVTdVVUZET1VJc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF6dFZRVU5NTEVsQlFVa3NSVUZCUlN4TlFVRk5PMVZCUTFvc1IwRkJSeXhGUVVGRkxGVkJRVlVzUlVGQlJTeEhRVUZITEZWQlFWVTdWVUZET1VJc1NVRkJTU3hGUVVGRkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSU3hIUVVGSExFTkJRVU03VlVGRGVrTXNVVUZCVVN4RlFVRkZMRTFCUVUwN1ZVRkRhRUlzVjBGQlZ5eEZRVUZGTEd0Q1FVRnJRanRUUVVOb1F5eERRVUZETEVOQlFVTTdRVUZEV0N4TFFVRkxPenRKUVVWRUxGbEJRVmtzUlVGQlJTeFZRVUZWTEZGQlFWRXNSVUZCUlN4TFFVRkxMRVZCUVVVN1VVRkRja01zUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTklMRWxCUVVrc1JVRkJSU3hMUVVGTE8xbEJRMWdzVjBGQlZ5eEZRVUZGTEVWQlFVVTdXVUZEWml4WFFVRlhMRVZCUVVVc1NVRkJTVHRCUVVNM1FpeFpRVUZaTEVkQlFVY3NSMEZCUnl4VlFVRlZMRVZCUVVVc1IwRkJSeXhWUVVGVk96dEJRVVV6UXl4WlFVRlpMRkZCUVZFc1JVRkJSU3hOUVVGTk96dFpRVVZvUWl4UFFVRlBMRVZCUVVVc1ZVRkJWU3hKUVVGSkxFVkJRVVU3WjBKQlEzSkNMRkZCUVZFc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dGhRVU5zUWp0WlFVTkVMRXRCUVVzc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJUdG5Ra0ZEYkVJc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzJGQlEyUTdVMEZEU2l4RFFVRkRMRU5CUVVNN1MwRkRUanRCUVVOTUxFTkJRVU1zUTBGQlF6czdRVUZGUml4SlFVRkpMRU5CUVVNc2NVSkJRWEZDTEVOQlFVTXNZMEZCWXl4RFFVRkRMRU5CUVVNN1FVRkRNME1zU1VGQlNTeERRVUZETEcxQ1FVRnRRaXhEUVVGRExHTkJRV01zUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXp0QlFVTjBSQ3hKUVVGSkxFTkJRVU1zYlVKQlFXMUNMRU5CUVVNc1kwRkJZeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZETzBGQlEzUkVMRWxCUVVrc1EwRkJReXd5UWtGQk1rSXNRMEZCUXl4alFVRmpMRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU03TzBGQlJUbEVMRk5CUVZNc2EwSkJRV3RDTEVOQlFVTXNTVUZCU1N4RlFVRkZPMGxCUXpsQ0xFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRTFCUVUwc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTXNUVUZCVFN4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRE8wbEJRekZFTEVsQlFVa3NTMEZCU3l4SFFVRkhMRWxCUVVrc1RVRkJUU3hEUVVGRExGRkJRVkVzUjBGQlJ5eEpRVUZKTEVkQlFVY3NWMEZCVnl4RFFVRkRPMUZCUTJwRUxFOUJRVThzUjBGQlJ5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dEpRVU14UXl4UFFVRlBMRTlCUVU4c1MwRkJTeXhKUVVGSkxFZEJRVWNzUlVGQlJTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1MwRkJTeXhGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETEVOQlFVTTdRMEZEY2tZaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SjJZWElnZFhSdFpTQTlJSEpsY1hWcGNtVW9KeTR1TDNWMGJXVXVhbk1uS1R0Y2JseHVablZ1WTNScGIyNGdaMlYwUW1GelpWVlNUQ0FvS1NCN1hHNGdJSEpsZEhWeWJpQjFkRzFsTG5OMFlYUmxJQ1ltSUhWMGJXVXVjM1JoZEdVdWRHVnpkRk5sY25abGNpQS9JSFYwYldVdWMzUmhkR1V1ZEdWemRGTmxjblpsY2lBNklHZGxkRkJoY21GdFpYUmxja0o1VG1GdFpTaGNJblYwYldWZmRHVnpkRjl6WlhKMlpYSmNJaWtnZkh3Z1hDSm9kSFJ3T2k4dk1DNHdMakF1TURvNU1EUXpMMXdpTzF4dWZWeHVYRzUyWVhJZ2MyVnlkbVZ5VW1Wd2IzSjBaWElnUFNCN1hHNGdJQ0FnWlhKeWIzSTZJR1oxYm1OMGFXOXVJQ2hsY25KdmNpd2djMk5sYm1GeWFXOHNJSFYwYldVcElIdGNiaUFnSUNBZ0lDQWdKQzVoYW1GNEtIdGNiaUFnSUNBZ0lDQWdJQ0IwZVhCbE9pQmNJbEJQVTFSY0lpeGNiaUFnSUNBZ0lDQWdJQ0IxY213NklHZGxkRUpoYzJWVlVrd29LU0FySUZ3aVpYSnliM0pjSWl4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoT2lCN0lHUmhkR0U2SUdWeWNtOXlJSDBzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVlI1Y0dVNklGd2lhbk52Ymx3aVhHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6WlhSMGFXNW5jeTVuWlhRb1hDSmpiMjV6YjJ4bFRHOW5aMmx1WjF3aUtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUdOdmJuTnZiR1V1WlhKeWIzSW9aWEp5YjNJcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCemRXTmpaWE56T2lCbWRXNWpkR2x2YmlBb2MzVmpZMlZ6Y3l3Z2MyTmxibUZ5YVc4c0lIVjBiV1VwSUh0Y2JpQWdJQ0FnSUNBZ0pDNWhhbUY0S0h0Y2JpQWdJQ0FnSUNBZ0lDQjBlWEJsT2lCY0lsQlBVMVJjSWl4Y2JpQWdJQ0FnSUNBZ0lDQjFjbXc2SUdkbGRFSmhjMlZWVWt3b0tTQXJJRndpYzNWalkyVnpjMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0U2SUhzZ1pHRjBZVG9nYzNWalkyVnpjeUI5TEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0ZVZVhCbE9pQmNJbXB6YjI1Y0lseHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIVjBiV1V1YzJWMGRHbHVaM011WjJWMEtGd2lZMjl1YzI5c1pVeHZaMmRwYm1kY0lpa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG14dlp5aHpkV05qWlhOektUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2JHOW5PaUJtZFc1amRHbHZiaUFvYkc5bkxDQnpZMlZ1WVhKcGJ5d2dkWFJ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQWtMbUZxWVhnb2UxeHVJQ0FnSUNBZ0lDQWdJSFI1Y0dVNklGd2lVRTlUVkZ3aUxGeHVJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0lHZGxkRUpoYzJWVlVrd29LU0FySUZ3aWJHOW5YQ0lzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVG9nZXlCa1lYUmhPaUJzYjJjZ2ZTeGNiaUFnSUNBZ0lDQWdJQ0JrWVhSaFZIbHdaVG9nWENKcWMyOXVYQ0pjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbExuTmxkSFJwYm1kekxtZGxkQ2hjSW1OdmJuTnZiR1ZNYjJkbmFXNW5YQ0lwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdZMjl1YzI5c1pTNXNiMmNvYkc5bktUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnNiMkZrVTJObGJtRnlhVzg2SUdaMWJtTjBhVzl1SUNodVlXMWxMQ0JqWVd4c1ltRmpheWtnZTF4dUlDQWdJQ0FnSUNBa0xtRnFZWGdvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhbk52Ym5BNklGd2lZMkZzYkdKaFkydGNJaXhjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1ZEdWdWRGUjVjR1U2SUZ3aVlYQndiR2xqWVhScGIyNHZhbk52YmpzZ1kyaGhjbk5sZEQxMWRHWXRPRndpTEZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JqY205emMwUnZiV0ZwYmpvZ2RISjFaU3hjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdkWEpzT2lBZ1oyVjBRbUZ6WlZWU1RDZ3BJQ3NnWENKelkyVnVZWEpwYnk5Y0lpQXJJRzVoYldVc1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklIUmxiR3dnYWxGMVpYSjVJSGRsSjNKbElHVjRjR1ZqZEdsdVp5QktVMDlPVUZ4dUlDQWdJQ0FnSUNBZ0lDQWdaR0YwWVZSNWNHVTZJRndpYW5OdmJuQmNJaXhjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjM1ZqWTJWemN6b2dablZ1WTNScGIyNGdLSEpsYzNBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpZV3hzWW1GamF5aHlaWE53S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhOaGRtVlRZMlZ1WVhKcGJ6b2dablZ1WTNScGIyNGdLSE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUNRdVlXcGhlQ2g3WEc0Z0lDQWdJQ0FnSUNBZ2RIbHdaVG9nWENKUVQxTlVYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ2RYSnNPaUJuWlhSQ1lYTmxWVkpNS0NrZ0t5QmNJbk5qWlc1aGNtbHZYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVG9nU2xOUFRpNXpkSEpwYm1kcFpua29jMk5sYm1GeWFXOHNJRzUxYkd3c0lGd2lJRndpS1N4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoVkhsd1pUb2dKMnB6YjI0bkxGeHVJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUlVlWEJsT2lCY0ltRndjR3hwWTJGMGFXOXVMMnB6YjI1Y0lseHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdiRzloWkZObGRIUnBibWR6T2lCbWRXNWpkR2x2YmlBb1kyRnNiR0poWTJzc0lHVnljbTl5S1NCN1hHNGdJQ0FnSUNBZ0lDUXVZV3BoZUNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwZVhCbE9pQmNJa2RGVkZ3aUxGeHVJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWRHVnVkRlI1Y0dVNklGd2lYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmpjbTl6YzBSdmJXRnBiam9nZEhKMVpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUhWeWJEb2dJR2RsZEVKaGMyVlZVa3dvS1NBcklGd2ljMlYwZEdsdVozTmNJaXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJSFJsYkd3Z2FsRjFaWEo1SUhkbEozSmxJR1Y0Y0dWamRHbHVaeUJLVTA5T1VGeHVJQ0FnSUNBZ0lDQWdJQ0FnWkdGMFlWUjVjR1U2SUZ3aWFuTnZibHdpTEZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0J6ZFdOalpYTnpPaUJtZFc1amRHbHZiaUFvY21WemNDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05oYkd4aVlXTnJLSEpsYzNBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR1Z5Y205eU9pQm1kVzVqZEdsdmJpQW9aWEp5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYSnliM0lvWlhKeUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZWeHVmVHRjYmx4dWRYUnRaUzV5WldkcGMzUmxjbEpsY0c5eWRFaGhibVJzWlhJb2MyVnlkbVZ5VW1Wd2IzSjBaWElwTzF4dWRYUnRaUzV5WldkcGMzUmxja3h2WVdSSVlXNWtiR1Z5S0hObGNuWmxjbEpsY0c5eWRHVnlMbXh2WVdSVFkyVnVZWEpwYnlrN1hHNTFkRzFsTG5KbFoybHpkR1Z5VTJGMlpVaGhibVJzWlhJb2MyVnlkbVZ5VW1Wd2IzSjBaWEl1YzJGMlpWTmpaVzVoY21sdktUdGNiblYwYldVdWNtVm5hWE4wWlhKVFpYUjBhVzVuYzB4dllXUklZVzVrYkdWeUtITmxjblpsY2xKbGNHOXlkR1Z5TG14dllXUlRaWFIwYVc1bmN5azdYRzVjYm1aMWJtTjBhVzl1SUdkbGRGQmhjbUZ0WlhSbGNrSjVUbUZ0WlNodVlXMWxLU0I3WEc0Z0lDQWdibUZ0WlNBOUlHNWhiV1V1Y21Wd2JHRmpaU2d2VzF4Y1cxMHZMQ0JjSWx4Y1hGeGJYQ0lwTG5KbGNHeGhZMlVvTDF0Y1hGMWRMeXdnWENKY1hGeGNYVndpS1R0Y2JpQWdJQ0IyWVhJZ2NtVm5aWGdnUFNCdVpYY2dVbVZuUlhod0tGd2lXMXhjWEZ3L0psMWNJaUFySUc1aGJXVWdLeUJjSWowb1cxNG1JMTBxS1Z3aUtTeGNiaUFnSUNBZ0lDQWdjbVZ6ZFd4MGN5QTlJSEpsWjJWNExtVjRaV01vYkc5allYUnBiMjR1YzJWaGNtTm9LVHRjYmlBZ0lDQnlaWFIxY200Z2NtVnpkV3gwY3lBOVBUMGdiblZzYkNBL0lGd2lYQ0lnT2lCa1pXTnZaR1ZWVWtsRGIyMXdiMjVsYm5Rb2NtVnpkV3gwYzFzeFhTNXlaWEJzWVdObEtDOWNYQ3N2Wnl3Z1hDSWdYQ0lwS1R0Y2JuMWNiaUpkZlE9PSIsIlxuXG4vKipcbiogR2VuZXJhdGUgdW5pcXVlIENTUyBzZWxlY3RvciBmb3IgZ2l2ZW4gRE9NIGVsZW1lbnRcbipcbiogQHBhcmFtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtTdHJpbmd9XG4qIEBhcGkgcHJpdmF0ZVxuKi9cblxuZnVuY3Rpb24gdW5pcXVlKGVsLCBkb2MpIHtcbiAgaWYgKCFlbCB8fCAhZWwudGFnTmFtZSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0VsZW1lbnQgZXhwZWN0ZWQnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRTZWxlY3RvckluZGV4KGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gICAgICB2YXIgZXhpc3RpbmdJbmRleCA9IDA7XG4gICAgICB2YXIgaXRlbXMgPSAgZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGl0ZW1zW2ldID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICAgIGV4aXN0aW5nSW5kZXggPSBpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpc3RpbmdJbmRleDtcbiAgfVxuXG4gIHZhciBlbFNlbGVjdG9yID0gZ2V0RWxlbWVudFNlbGVjdG9yKGVsKS5zZWxlY3RvcjtcbiAgdmFyIGlzU2ltcGxlU2VsZWN0b3IgPSBlbFNlbGVjdG9yID09PSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gIHZhciBhbmNlc3RvclNlbGVjdG9yO1xuXG4gIHZhciBjdXJyRWxlbWVudCA9IGVsO1xuICB3aGlsZSAoY3VyckVsZW1lbnQucGFyZW50RWxlbWVudCAhPSBudWxsICYmICFhbmNlc3RvclNlbGVjdG9yKSB7XG4gICAgICBjdXJyRWxlbWVudCA9IGN1cnJFbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBnZXRFbGVtZW50U2VsZWN0b3IoY3VyckVsZW1lbnQpLnNlbGVjdG9yO1xuXG4gICAgICAvLyBUeXBpY2FsbHkgZWxlbWVudHMgdGhhdCBoYXZlIGEgY2xhc3MgbmFtZSBvciB0aXRsZSwgdGhvc2UgYXJlIGxlc3MgbGlrZWx5XG4gICAgICAvLyB0byBjaGFuZ2UsIGFuZCBhbHNvIGJlIHVuaXF1ZS4gIFNvLCB3ZSBhcmUgdHJ5aW5nIHRvIGZpbmQgYW4gYW5jZXN0b3JcbiAgICAgIC8vIHRvIGFuY2hvciAob3Igc2NvcGUpIHRoZSBzZWFyY2ggZm9yIHRoZSBlbGVtZW50LCBhbmQgbWFrZSBpdCBsZXNzIGJyaXR0bGUuXG4gICAgICBpZiAoc2VsZWN0b3IgIT09IGN1cnJFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgIGFuY2VzdG9yU2VsZWN0b3IgPSBzZWxlY3RvciArIChjdXJyRWxlbWVudCA9PT0gZWwucGFyZW50RWxlbWVudCAmJiBpc1NpbXBsZVNlbGVjdG9yID8gXCIgPiBcIiA6IFwiIFwiKSArIGVsU2VsZWN0b3I7XG4gICAgICB9XG4gIH1cblxuICB2YXIgZmluYWxTZWxlY3RvcnMgPSBbXTtcbiAgaWYgKGFuY2VzdG9yU2VsZWN0b3IpIHtcbiAgICBmaW5hbFNlbGVjdG9ycy5wdXNoKFxuICAgICAgYW5jZXN0b3JTZWxlY3RvciArIFwiOmVxKFwiICsgX2dldFNlbGVjdG9ySW5kZXgoZWwsIGFuY2VzdG9yU2VsZWN0b3IpICsgXCIpXCJcbiAgICApO1xuICB9XG5cbiAgZmluYWxTZWxlY3RvcnMucHVzaChlbFNlbGVjdG9yICsgXCI6ZXEoXCIgKyBfZ2V0U2VsZWN0b3JJbmRleChlbCwgZWxTZWxlY3RvcikgKyBcIilcIik7XG4gIHJldHVybiBmaW5hbFNlbGVjdG9ycztcbn07XG5cbi8qKlxuKiBHZXQgY2xhc3MgbmFtZXMgZm9yIGFuIGVsZW1lbnRcbipcbiogQHBhcmFybSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7QXJyYXl9XG4qL1xuXG5mdW5jdGlvbiBnZXRDbGFzc05hbWVzKGVsKSB7XG4gIHZhciBjbGFzc05hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSAmJiBjbGFzc05hbWUucmVwbGFjZSgndXRtZS12ZXJpZnknLCAnJyk7XG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSAmJiBjbGFzc05hbWUucmVwbGFjZSgndXRtZS1yZWFkeScsICcnKTtcblxuICBpZiAoIWNsYXNzTmFtZSB8fCAoIWNsYXNzTmFtZS50cmltKCkubGVuZ3RoKSkgeyByZXR1cm4gW107IH1cblxuICAvLyByZW1vdmUgZHVwbGljYXRlIHdoaXRlc3BhY2VcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnJlcGxhY2UoL1xccysvZywgJyAnKTtcblxuICAvLyB0cmltIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2VcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcblxuICAvLyBzcGxpdCBpbnRvIHNlcGFyYXRlIGNsYXNzbmFtZXNcbiAgcmV0dXJuIGNsYXNzTmFtZS50cmltKCkuc3BsaXQoJyAnKTtcbn1cblxuLyoqXG4qIENTUyBzZWxlY3RvcnMgdG8gZ2VuZXJhdGUgdW5pcXVlIHNlbGVjdG9yIGZvciBET00gZWxlbWVudFxuKlxuKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge0FycmF5fVxuKiBAYXBpIHBydmlhdGVcbiovXG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRTZWxlY3RvcihlbCwgaXNVbmlxdWUpIHtcbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBsYWJlbCA9IG51bGw7XG4gIHZhciB0aXRsZSA9IG51bGw7XG4gIHZhciBhbHQgICA9IG51bGw7XG4gIHZhciBuYW1lICA9IG51bGw7XG4gIHZhciB2YWx1ZSA9IG51bGw7XG4gIHZhciBtZSA9IGVsO1xuXG4gIC8vIGRvIHtcblxuICAvLyBJRHMgYXJlIHVuaXF1ZSBlbm91Z2hcbiAgaWYgKGVsLmlkKSB7XG4gICAgbGFiZWwgPSAnW2lkPVxcJycgKyBlbC5pZCArIFwiXFwnXVwiO1xuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSwgdXNlIHRhZyBuYW1lXG4gICAgbGFiZWwgICAgID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgdmFyIGNsYXNzTmFtZXMgPSBnZXRDbGFzc05hbWVzKGVsKTtcblxuICAgIC8vIFRhZyBuYW1lcyBjb3VsZCB1c2UgY2xhc3NlcyBmb3Igc3BlY2lmaWNpdHlcbiAgICBpZiAoY2xhc3NOYW1lcy5sZW5ndGgpIHtcbiAgICAgIGxhYmVsICs9ICcuJyArIGNsYXNzTmFtZXMuam9pbignLicpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRpdGxlcyAmIEFsdCBhdHRyaWJ1dGVzIGFyZSB2ZXJ5IHVzZWZ1bCBmb3Igc3BlY2lmaWNpdHkgYW5kIHRyYWNraW5nXG4gIGlmICh0aXRsZSA9IGVsLmdldEF0dHJpYnV0ZSgndGl0bGUnKSkge1xuICAgIGxhYmVsICs9ICdbdGl0bGU9XCInICsgdGl0bGUgKyAnXCJdJztcbiAgfSBlbHNlIGlmIChhbHQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2FsdCcpKSB7XG4gICAgbGFiZWwgKz0gJ1thbHQ9XCInICsgYWx0ICsgJ1wiXSc7XG4gIH0gZWxzZSBpZiAobmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpKSB7XG4gICAgbGFiZWwgKz0gJ1tuYW1lPVwiJyArIG5hbWUgKyAnXCJdJztcbiAgfVxuXG4gIGlmICh2YWx1ZSA9IGVsLmdldEF0dHJpYnV0ZSgndmFsdWUnKSkge1xuICAgIGxhYmVsICs9ICdbdmFsdWU9XCInICsgdmFsdWUgKyAnXCJdJztcbiAgfVxuXG4gIC8vIGlmIChlbC5pbm5lclRleHQubGVuZ3RoICE9IDApIHtcbiAgLy8gICBsYWJlbCArPSAnOmNvbnRhaW5zKCcgKyBlbC5pbm5lclRleHQgKyAnKSc7XG4gIC8vIH1cblxuICBwYXJ0cy51bnNoaWZ0KHtcbiAgICBlbGVtZW50OiBlbCxcbiAgICBzZWxlY3RvcjogbGFiZWxcbiAgfSk7XG5cbiAgLy8gaWYgKGlzVW5pcXVlKHBhcnRzKSkge1xuICAvLyAgICAgYnJlYWs7XG4gIC8vIH1cblxuICAvLyB9IHdoaWxlICghZWwuaWQgJiYgKGVsID0gZWwucGFyZW50Tm9kZSkgJiYgZWwudGFnTmFtZSk7XG5cbiAgLy8gU29tZSBzZWxlY3RvcnMgc2hvdWxkIGhhdmUgbWF0Y2hlZCBhdCBsZWFzdFxuICBpZiAoIXBhcnRzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGlkZW50aWZ5IENTUyBzZWxlY3RvcicpO1xuICB9XG4gIHJldHVybiBwYXJ0c1swXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1bmlxdWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNObGJHVmpkRzl5Um1sdVpHVnlMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMyVnNaV04wYjNKR2FXNWtaWEl1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdPMEZCUlVFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVUZGUVN4RlFVRkZPenRCUVVWR0xGTkJRVk1zVFVGQlRTeERRVUZETEVWQlFVVXNSVUZCUlN4SFFVRkhMRVZCUVVVN1JVRkRka0lzU1VGQlNTeERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRVZCUVVVc1EwRkJReXhQUVVGUExFVkJRVVU3U1VGRGRFSXNUVUZCVFN4SlFVRkpMRk5CUVZNc1EwRkJReXhyUWtGQmEwSXNRMEZCUXl4RFFVRkRPMEZCUXpWRExFZEJRVWM3TzBWQlJVUXNVMEZCVXl4cFFrRkJhVUlzUTBGQlF5eFBRVUZQTEVWQlFVVXNVVUZCVVN4RlFVRkZPMDFCUXpGRExFbEJRVWtzWVVGQllTeEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTTFRaXhOUVVGTkxFbEJRVWtzUzBGQlN5eEpRVUZKTEVkQlFVY3NRMEZCUXl4blFrRkJaMElzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXpzN1RVRkZOVU1zUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1ZVRkRia01zU1VGQlNTeExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRMRXRCUVVzc1QwRkJUeXhGUVVGRk8yTkJRM1JDTEdGQlFXRXNSMEZCUnl4RFFVRkRMRU5CUVVNN1kwRkRiRUlzVFVGQlRUdFhRVU5VTzA5QlEwbzdUVUZEUkN4UFFVRlBMR0ZCUVdFc1EwRkJRenRCUVVNelFpeEhRVUZIT3p0RlFVVkVMRWxCUVVrc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkVzUTBGQlF6dEZRVU5xUkN4SlFVRkpMR2RDUVVGblFpeEhRVUZITEZWQlFWVXNTMEZCU3l4RlFVRkZMRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUlVGQlJTeERRVUZETzBGQlEycEZMRVZCUVVVc1NVRkJTU3huUWtGQlowSXNRMEZCUXpzN1JVRkZja0lzU1VGQlNTeFhRVUZYTEVkQlFVY3NSVUZCUlN4RFFVRkRPMFZCUTNKQ0xFOUJRVThzVjBGQlZ5eERRVUZETEdGQlFXRXNTVUZCU1N4SlFVRkpMRWxCUVVrc1EwRkJReXhuUWtGQlowSXNSVUZCUlR0TlFVTXpSQ3hYUVVGWExFZEJRVWNzVjBGQlZ5eERRVUZETEdGQlFXRXNRMEZCUXp0QlFVTTVReXhOUVVGTkxFbEJRVWtzVVVGQlVTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExGZEJRVmNzUTBGQlF5eERRVUZETEZGQlFWRXNRMEZCUXp0QlFVTTVSRHRCUVVOQk8wRkJRMEU3TzAxQlJVMHNTVUZCU1N4UlFVRlJMRXRCUVVzc1YwRkJWeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNSVUZCUlR0VlFVTm9SQ3huUWtGQlowSXNSMEZCUnl4UlFVRlJMRWxCUVVrc1YwRkJWeXhMUVVGTExFVkJRVVVzUTBGQlF5eGhRVUZoTEVsQlFVa3NaMEpCUVdkQ0xFZEJRVWNzUzBGQlN5eEhRVUZITEVkQlFVY3NRMEZCUXl4SFFVRkhMRlZCUVZVc1EwRkJRenRQUVVOdVNEdEJRVU5RTEVkQlFVYzdPMFZCUlVRc1NVRkJTU3hqUVVGakxFZEJRVWNzUlVGQlJTeERRVUZETzBWQlEzaENMRWxCUVVrc1owSkJRV2RDTEVWQlFVVTdTVUZEY0VJc1kwRkJZeXhEUVVGRExFbEJRVWs3VFVGRGFrSXNaMEpCUVdkQ0xFZEJRVWNzVFVGQlRTeEhRVUZITEdsQ1FVRnBRaXhEUVVGRExFVkJRVVVzUlVGQlJTeG5Ra0ZCWjBJc1EwRkJReXhIUVVGSExFZEJRVWM3UzBGRE1VVXNRMEZCUXp0QlFVTk9MRWRCUVVjN08wVkJSVVFzWTBGQll5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMRWRCUVVjc1RVRkJUU3hIUVVGSExHbENRVUZwUWl4RFFVRkRMRVZCUVVVc1JVRkJSU3hWUVVGVkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXp0RlFVTnVSaXhQUVVGUExHTkJRV01zUTBGQlF6dEJRVU40UWl4RFFVRkRMRU5CUVVNN08wRkJSVVk3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1JVRkJSVHM3UVVGRlJpeFRRVUZUTEdGQlFXRXNRMEZCUXl4RlFVRkZMRVZCUVVVN1JVRkRla0lzU1VGQlNTeFRRVUZUTEVkQlFVY3NSVUZCUlN4RFFVRkRMRmxCUVZrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dEZRVU42UXl4VFFVRlRMRWRCUVVjc1UwRkJVeXhKUVVGSkxGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNZVUZCWVN4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8wRkJRMmhGTEVWQlFVVXNVMEZCVXl4SFFVRkhMRk5CUVZNc1NVRkJTU3hUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZsQlFWa3NSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenM3UVVGRkwwUXNSVUZCUlN4SlFVRkpMRU5CUVVNc1UwRkJVeXhMUVVGTExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzVDBGQlR5eEZRVUZGTEVOQlFVTXNSVUZCUlR0QlFVTTVSRHM3UVVGRlFTeEZRVUZGTEZOQlFWTXNSMEZCUnl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTTNRenM3UVVGRlFTeEZRVUZGTEZOQlFWTXNSMEZCUnl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGbEJRVmtzUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXp0QlFVTnNSRHM3UlVGRlJTeFBRVUZQTEZOQlFWTXNRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEY2tNc1EwRkJRenM3UVVGRlJEdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUVVWQkxFVkJRVVU3TzBGQlJVWXNVMEZCVXl4clFrRkJhMElzUTBGQlF5eEZRVUZGTEVWQlFVVXNVVUZCVVN4RlFVRkZPMFZCUTNoRExFbEJRVWtzUzBGQlN5eEhRVUZITEVWQlFVVXNRMEZCUXp0RlFVTm1MRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEZRVU5xUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU03UlVGRGFrSXNTVUZCU1N4SFFVRkhMRXRCUVVzc1NVRkJTU3hEUVVGRE8wVkJRMnBDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRWxCUVVrc1EwRkJRenRGUVVOcVFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRia0lzUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRaRHRCUVVOQk8wRkJRMEU3TzBWQlJVVXNTVUZCU1N4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8wbEJRMVFzUzBGQlN5eEhRVUZITEZGQlFWRXNSMEZCUnl4RlFVRkZMRU5CUVVNc1JVRkJSU3hIUVVGSExFdEJRVXNzUTBGQlF6dEJRVU55UXl4SFFVRkhMRTFCUVUwN08wRkJSVlFzU1VGQlNTeExRVUZMTEU5QlFVOHNSVUZCUlN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzUTBGQlF6czdRVUZGZWtNc1NVRkJTU3hKUVVGSkxGVkJRVlVzUjBGQlJ5eGhRVUZoTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNN1FVRkRka003TzBsQlJVa3NTVUZCU1N4VlFVRlZMRU5CUVVNc1RVRkJUU3hGUVVGRk8wMUJRM0pDTEV0QlFVc3NTVUZCU1N4SFFVRkhMRWRCUVVjc1ZVRkJWU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0TFFVTnlRenRCUVVOTUxFZEJRVWM3UVVGRFNEczdSVUZGUlN4SlFVRkpMRXRCUVVzc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZPMGxCUTNCRExFdEJRVXNzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJRenRIUVVOd1F5eE5RVUZOTEVsQlFVa3NSMEZCUnl4SFFVRkhMRVZCUVVVc1EwRkJReXhaUVVGWkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVTdTVUZEZGtNc1MwRkJTeXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEhRVUZITEVkQlFVY3NTVUZCU1N4RFFVRkRPMGRCUTJoRExFMUJRVTBzU1VGQlNTeEpRVUZKTEVkQlFVY3NSVUZCUlN4RFFVRkRMRmxCUVZrc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJUdEpRVU42UXl4TFFVRkxMRWxCUVVrc1UwRkJVeXhIUVVGSExFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEY2tNc1IwRkJSenM3UlVGRlJDeEpRVUZKTEV0QlFVc3NSMEZCUnl4RlFVRkZMRU5CUVVNc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eEZRVUZGTzBsQlEzQkRMRXRCUVVzc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0QlFVTjJReXhIUVVGSE8wRkJRMGc3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMFZCUlVVc1MwRkJTeXhEUVVGRExFOUJRVThzUTBGQlF6dEpRVU5hTEU5QlFVOHNSVUZCUlN4RlFVRkZPMGxCUTFnc1VVRkJVU3hGUVVGRkxFdEJRVXM3UVVGRGJrSXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRURHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1JVRkZSU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSVUZCUlR0SlFVTnFRaXhOUVVGTkxFbEJRVWtzUzBGQlN5eERRVUZETEdsRFFVRnBReXhEUVVGRExFTkJRVU03UjBGRGNFUTdSVUZEUkN4UFFVRlBMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEJRVU5zUWl4RFFVRkRPenRCUVVWRUxFMUJRVTBzUTBGQlF5eFBRVUZQTEVkQlFVY3NUVUZCVFN4RFFVRkRJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpWEc1Y2JpOHFLbHh1S2lCSFpXNWxjbUYwWlNCMWJtbHhkV1VnUTFOVElITmxiR1ZqZEc5eUlHWnZjaUJuYVhabGJpQkVUMDBnWld4bGJXVnVkRnh1S2x4dUtpQkFjR0Z5WVcwZ2UwVnNaVzFsYm5SOUlHVnNYRzRxSUVCeVpYUjFjbTRnZTFOMGNtbHVaMzFjYmlvZ1FHRndhU0J3Y21sMllYUmxYRzRxTDF4dVhHNW1kVzVqZEdsdmJpQjFibWx4ZFdVb1pXd3NJR1J2WXlrZ2UxeHVJQ0JwWmlBb0lXVnNJSHg4SUNGbGJDNTBZV2RPWVcxbEtTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25SV3hsYldWdWRDQmxlSEJsWTNSbFpDY3BPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWDJkbGRGTmxiR1ZqZEc5eVNXNWtaWGdvWld4bGJXVnVkQ3dnYzJWc1pXTjBiM0lwSUh0Y2JpQWdJQ0FnSUhaaGNpQmxlR2x6ZEdsdVowbHVaR1Y0SUQwZ01EdGNiaUFnSUNBZ0lIWmhjaUJwZEdWdGN5QTlJQ0JrYjJNdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNoelpXeGxZM1J2Y2lrN1hHNWNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dhWFJsYlhNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9hWFJsYlhOYmFWMGdQVDA5SUdWc1pXMWxiblFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhocGMzUnBibWRKYm1SbGVDQTlJR2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSEpsZEhWeWJpQmxlR2x6ZEdsdVowbHVaR1Y0TzF4dUlDQjlYRzVjYmlBZ2RtRnlJR1ZzVTJWc1pXTjBiM0lnUFNCblpYUkZiR1Z0Wlc1MFUyVnNaV04wYjNJb1pXd3BMbk5sYkdWamRHOXlPMXh1SUNCMllYSWdhWE5UYVcxd2JHVlRaV3hsWTNSdmNpQTlJR1ZzVTJWc1pXTjBiM0lnUFQwOUlHVnNMblJoWjA1aGJXVXVkRzlNYjNkbGNrTmhjMlVvS1R0Y2JpQWdkbUZ5SUdGdVkyVnpkRzl5VTJWc1pXTjBiM0k3WEc1Y2JpQWdkbUZ5SUdOMWNuSkZiR1Z0Wlc1MElEMGdaV3c3WEc0Z0lIZG9hV3hsSUNoamRYSnlSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwSUNFOUlHNTFiR3dnSmlZZ0lXRnVZMlZ6ZEc5eVUyVnNaV04wYjNJcElIdGNiaUFnSUNBZ0lHTjFjbkpGYkdWdFpXNTBJRDBnWTNWeWNrVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkRHRjYmlBZ0lDQWdJSFpoY2lCelpXeGxZM1J2Y2lBOUlHZGxkRVZzWlcxbGJuUlRaV3hsWTNSdmNpaGpkWEp5Uld4bGJXVnVkQ2t1YzJWc1pXTjBiM0k3WEc1Y2JpQWdJQ0FnSUM4dklGUjVjR2xqWVd4c2VTQmxiR1Z0Wlc1MGN5QjBhR0YwSUdoaGRtVWdZU0JqYkdGemN5QnVZVzFsSUc5eUlIUnBkR3hsTENCMGFHOXpaU0JoY21VZ2JHVnpjeUJzYVd0bGJIbGNiaUFnSUNBZ0lDOHZJSFJ2SUdOb1lXNW5aU3dnWVc1a0lHRnNjMjhnWW1VZ2RXNXBjWFZsTGlBZ1UyOHNJSGRsSUdGeVpTQjBjbmxwYm1jZ2RHOGdabWx1WkNCaGJpQmhibU5sYzNSdmNseHVJQ0FnSUNBZ0x5OGdkRzhnWVc1amFHOXlJQ2h2Y2lCelkyOXdaU2tnZEdobElITmxZWEpqYUNCbWIzSWdkR2hsSUdWc1pXMWxiblFzSUdGdVpDQnRZV3RsSUdsMElHeGxjM01nWW5KcGRIUnNaUzVjYmlBZ0lDQWdJR2xtSUNoelpXeGxZM1J2Y2lBaFBUMGdZM1Z5Y2tWc1pXMWxiblF1ZEdGblRtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncEtTQjdYRzRnSUNBZ0lDQWdJQ0FnWVc1alpYTjBiM0pUWld4bFkzUnZjaUE5SUhObGJHVmpkRzl5SUNzZ0tHTjFjbkpGYkdWdFpXNTBJRDA5UFNCbGJDNXdZWEpsYm5SRmJHVnRaVzUwSUNZbUlHbHpVMmx0Y0d4bFUyVnNaV04wYjNJZ1B5QmNJaUErSUZ3aUlEb2dYQ0lnWENJcElDc2daV3hUWld4bFkzUnZjanRjYmlBZ0lDQWdJSDFjYmlBZ2ZWeHVYRzRnSUhaaGNpQm1hVzVoYkZObGJHVmpkRzl5Y3lBOUlGdGRPMXh1SUNCcFppQW9ZVzVqWlhOMGIzSlRaV3hsWTNSdmNpa2dlMXh1SUNBZ0lHWnBibUZzVTJWc1pXTjBiM0p6TG5CMWMyZ29YRzRnSUNBZ0lDQmhibU5sYzNSdmNsTmxiR1ZqZEc5eUlDc2dYQ0k2WlhFb1hDSWdLeUJmWjJWMFUyVnNaV04wYjNKSmJtUmxlQ2hsYkN3Z1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2lrZ0t5QmNJaWxjSWx4dUlDQWdJQ2s3WEc0Z0lIMWNibHh1SUNCbWFXNWhiRk5sYkdWamRHOXljeTV3ZFhOb0tHVnNVMlZzWldOMGIzSWdLeUJjSWpwbGNTaGNJaUFySUY5blpYUlRaV3hsWTNSdmNrbHVaR1Y0S0dWc0xDQmxiRk5sYkdWamRHOXlLU0FySUZ3aUtWd2lLVHRjYmlBZ2NtVjBkWEp1SUdacGJtRnNVMlZzWldOMGIzSnpPMXh1ZlR0Y2JseHVMeW9xWEc0cUlFZGxkQ0JqYkdGemN5QnVZVzFsY3lCbWIzSWdZVzRnWld4bGJXVnVkRnh1S2x4dUtpQkFjR0Z5WVhKdElIdEZiR1Z0Wlc1MGZTQmxiRnh1S2lCQWNtVjBkWEp1SUh0QmNuSmhlWDFjYmlvdlhHNWNibVoxYm1OMGFXOXVJR2RsZEVOc1lYTnpUbUZ0WlhNb1pXd3BJSHRjYmlBZ2RtRnlJR05zWVhOelRtRnRaU0E5SUdWc0xtZGxkRUYwZEhKcFluVjBaU2duWTJ4aGMzTW5LVHRjYmlBZ1kyeGhjM05PWVcxbElEMGdZMnhoYzNOT1lXMWxJQ1ltSUdOc1lYTnpUbUZ0WlM1eVpYQnNZV05sS0NkMWRHMWxMWFpsY21sbWVTY3NJQ2NuS1R0Y2JpQWdZMnhoYzNOT1lXMWxJRDBnWTJ4aGMzTk9ZVzFsSUNZbUlHTnNZWE56VG1GdFpTNXlaWEJzWVdObEtDZDFkRzFsTFhKbFlXUjVKeXdnSnljcE8xeHVYRzRnSUdsbUlDZ2hZMnhoYzNOT1lXMWxJSHg4SUNnaFkyeGhjM05PWVcxbExuUnlhVzBvS1M1c1pXNW5kR2dwS1NCN0lISmxkSFZ5YmlCYlhUc2dmVnh1WEc0Z0lDOHZJSEpsYlc5MlpTQmtkWEJzYVdOaGRHVWdkMmhwZEdWemNHRmpaVnh1SUNCamJHRnpjMDVoYldVZ1BTQmpiR0Z6YzA1aGJXVXVjbVZ3YkdGalpTZ3ZYRnh6S3k5bkxDQW5JQ2NwTzF4dVhHNGdJQzh2SUhSeWFXMGdiR1ZoWkdsdVp5QmhibVFnZEhKaGFXeHBibWNnZDJocGRHVnpjR0ZqWlZ4dUlDQmpiR0Z6YzA1aGJXVWdQU0JqYkdGemMwNWhiV1V1Y21Wd2JHRmpaU2d2WGx4Y2N5dDhYRnh6S3lRdlp5d2dKeWNwTzF4dVhHNGdJQzh2SUhOd2JHbDBJR2x1ZEc4Z2MyVndZWEpoZEdVZ1kyeGhjM051WVcxbGMxeHVJQ0J5WlhSMWNtNGdZMnhoYzNOT1lXMWxMblJ5YVcwb0tTNXpjR3hwZENnbklDY3BPMXh1ZlZ4dVhHNHZLaXBjYmlvZ1ExTlRJSE5sYkdWamRHOXljeUIwYnlCblpXNWxjbUYwWlNCMWJtbHhkV1VnYzJWc1pXTjBiM0lnWm05eUlFUlBUU0JsYkdWdFpXNTBYRzRxWEc0cUlFQndZWEpoYlNCN1JXeGxiV1Z1ZEgwZ1pXeGNiaW9nUUhKbGRIVnliaUI3UVhKeVlYbDlYRzRxSUVCaGNHa2djSEoyYVdGMFpWeHVLaTljYmx4dVpuVnVZM1JwYjI0Z1oyVjBSV3hsYldWdWRGTmxiR1ZqZEc5eUtHVnNMQ0JwYzFWdWFYRjFaU2tnZTF4dUlDQjJZWElnY0dGeWRITWdQU0JiWFR0Y2JpQWdkbUZ5SUd4aFltVnNJRDBnYm5Wc2JEdGNiaUFnZG1GeUlIUnBkR3hsSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJR0ZzZENBZ0lEMGdiblZzYkR0Y2JpQWdkbUZ5SUc1aGJXVWdJRDBnYm5Wc2JEdGNiaUFnZG1GeUlIWmhiSFZsSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJRzFsSUQwZ1pXdzdYRzVjYmlBZ0x5OGdaRzhnZTF4dVhHNGdJQzh2SUVsRWN5QmhjbVVnZFc1cGNYVmxJR1Z1YjNWbmFGeHVJQ0JwWmlBb1pXd3VhV1FwSUh0Y2JpQWdJQ0JzWVdKbGJDQTlJQ2RiYVdROVhGd25KeUFySUdWc0xtbGtJQ3NnWENKY1hDZGRYQ0k3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1QzUm9aWEozYVhObExDQjFjMlVnZEdGbklHNWhiV1ZjYmlBZ0lDQnNZV0psYkNBZ0lDQWdQU0JsYkM1MFlXZE9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDazdYRzVjYmlBZ0lDQjJZWElnWTJ4aGMzTk9ZVzFsY3lBOUlHZGxkRU5zWVhOelRtRnRaWE1vWld3cE8xeHVYRzRnSUNBZ0x5OGdWR0ZuSUc1aGJXVnpJR052ZFd4a0lIVnpaU0JqYkdGemMyVnpJR1p2Y2lCemNHVmphV1pwWTJsMGVWeHVJQ0FnSUdsbUlDaGpiR0Z6YzA1aGJXVnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdiR0ZpWld3Z0t6MGdKeTRuSUNzZ1kyeGhjM05PWVcxbGN5NXFiMmx1S0NjdUp5azdYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdMeThnVkdsMGJHVnpJQ1lnUVd4MElHRjBkSEpwWW5WMFpYTWdZWEpsSUhabGNua2dkWE5sWm5Wc0lHWnZjaUJ6Y0dWamFXWnBZMmwwZVNCaGJtUWdkSEpoWTJ0cGJtZGNiaUFnYVdZZ0tIUnBkR3hsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkMGFYUnNaU2NwS1NCN1hHNGdJQ0FnYkdGaVpXd2dLejBnSjF0MGFYUnNaVDFjSWljZ0t5QjBhWFJzWlNBcklDZGNJbDBuTzF4dUlDQjlJR1ZzYzJVZ2FXWWdLR0ZzZENBOUlHVnNMbWRsZEVGMGRISnBZblYwWlNnbllXeDBKeWtwSUh0Y2JpQWdJQ0JzWVdKbGJDQXJQU0FuVzJGc2REMWNJaWNnS3lCaGJIUWdLeUFuWENKZEp6dGNiaUFnZlNCbGJITmxJR2xtSUNodVlXMWxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2R1WVcxbEp5a3BJSHRjYmlBZ0lDQnNZV0psYkNBclBTQW5XMjVoYldVOVhDSW5JQ3NnYm1GdFpTQXJJQ2RjSWwwbk8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0haaGJIVmxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2QyWVd4MVpTY3BLU0I3WEc0Z0lDQWdiR0ZpWld3Z0t6MGdKMXQyWVd4MVpUMWNJaWNnS3lCMllXeDFaU0FySUNkY0lsMG5PMXh1SUNCOVhHNWNiaUFnTHk4Z2FXWWdLR1ZzTG1sdWJtVnlWR1Y0ZEM1c1pXNW5kR2dnSVQwZ01Da2dlMXh1SUNBdkx5QWdJR3hoWW1Wc0lDczlJQ2M2WTI5dWRHRnBibk1vSnlBcklHVnNMbWx1Ym1WeVZHVjRkQ0FySUNjcEp6dGNiaUFnTHk4Z2ZWeHVYRzRnSUhCaGNuUnpMblZ1YzJocFpuUW9lMXh1SUNBZ0lHVnNaVzFsYm5RNklHVnNMRnh1SUNBZ0lITmxiR1ZqZEc5eU9pQnNZV0psYkZ4dUlDQjlLVHRjYmx4dUlDQXZMeUJwWmlBb2FYTlZibWx4ZFdVb2NHRnlkSE1wS1NCN1hHNGdJQzh2SUNBZ0lDQmljbVZoYXp0Y2JpQWdMeThnZlZ4dVhHNGdJQzh2SUgwZ2QyaHBiR1VnS0NGbGJDNXBaQ0FtSmlBb1pXd2dQU0JsYkM1d1lYSmxiblJPYjJSbEtTQW1KaUJsYkM1MFlXZE9ZVzFsS1R0Y2JseHVJQ0F2THlCVGIyMWxJSE5sYkdWamRHOXljeUJ6YUc5MWJHUWdhR0YyWlNCdFlYUmphR1ZrSUdGMElHeGxZWE4wWEc0Z0lHbG1JQ2doY0dGeWRITXViR1Z1WjNSb0tTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkR1lXbHNaV1FnZEc4Z2FXUmxiblJwWm5rZ1ExTlRJSE5sYkdWamRHOXlKeWs3WEc0Z0lIMWNiaUFnY21WMGRYSnVJSEJoY25Seld6QmRPMXh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlIVnVhWEYxWlR0Y2JpSmRmUT09IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgbG9jYWxfc3RvcmFnZV9rZXkgPSAndXRtZS1zZXR0aW5ncyc7XG5cbmZ1bmN0aW9uIFNldHRpbmdzIChkZWZhdWx0U2V0dGluZ3MpIHtcbiAgICB0aGlzLnNldERlZmF1bHRzKGRlZmF1bHRTZXR0aW5ncyB8fCB7fSk7XG59XG5cblNldHRpbmdzLnByb3RvdHlwZSA9IHtcbiAgICByZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZXR0aW5nc1N0cmluZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGxvY2FsX3N0b3JhZ2Vfa2V5KTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge307XG4gICAgICAgIGlmIChzZXR0aW5nc1N0cmluZykge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBKU09OLnBhcnNlKHNldHRpbmdzU3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldERlZmF1bHRzOiBmdW5jdGlvbiAoZGVmYXVsdFNldHRpbmdzKSB7XG4gICAgICAgIHZhciBsb2NhbFNldHRpbmdzID0gdGhpcy5yZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIHZhciBkZWZhdWx0c0NvcHkgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdFNldHRpbmdzIHx8IHt9KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IF8uZXh0ZW5kKHt9LCBfLmV4dGVuZChkZWZhdWx0c0NvcHksIGxvY2FsU2V0dGluZ3MpKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0U2V0dGluZ3MgPSBkZWZhdWx0U2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5nc1trZXldID0gdmFsdWU7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH0sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3Nba2V5XTtcbiAgICB9LFxuXG4gICAgc2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShsb2NhbF9zdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xuICAgIH0sXG5cbiAgICByZXNldERlZmF1bHRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICBpZiAoZGVmYXVsdHMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdHMpO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05sZEhScGJtZHpMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMyVjBkR2x1WjNNdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUVzU1VGQlNTeERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRek5DTEVsQlFVa3NhVUpCUVdsQ0xFZEJRVWNzWlVGQlpTeERRVUZET3p0QlFVVjRReXhUUVVGVExGRkJRVkVzUlVGQlJTeGxRVUZsTEVWQlFVVTdTVUZEYUVNc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eGxRVUZsTEVsQlFVa3NSVUZCUlN4RFFVRkRMRU5CUVVNN1FVRkROVU1zUTBGQlF6czdRVUZGUkN4UlFVRlJMRU5CUVVNc1UwRkJVeXhIUVVGSE8wbEJRMnBDTERSQ1FVRTBRaXhGUVVGRkxGbEJRVms3VVVGRGRFTXNTVUZCU1N4alFVRmpMRWRCUVVjc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eHBRa0ZCYVVJc1EwRkJReXhEUVVGRE8xRkJRemRFTEVsQlFVa3NVVUZCVVN4SFFVRkhMRVZCUVVVc1EwRkJRenRSUVVOc1FpeEpRVUZKTEdOQlFXTXNSVUZCUlR0WlFVTm9RaXhSUVVGUkxFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4alFVRmpMRU5CUVVNc1EwRkJRenRUUVVONlF6dFJRVU5FTEU5QlFVOHNVVUZCVVN4RFFVRkRPMEZCUTNoQ0xFdEJRVXM3TzBsQlJVUXNWMEZCVnl4RlFVRkZMRlZCUVZVc1pVRkJaU3hGUVVGRk8xRkJRM0JETEVsQlFVa3NZVUZCWVN4SFFVRkhMRWxCUVVrc1EwRkJReXcwUWtGQk5FSXNSVUZCUlN4RFFVRkRPMUZCUTNoRUxFbEJRVWtzV1VGQldTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxHVkJRV1VzU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXp0UlFVTjJSQ3hKUVVGSkxFTkJRVU1zVVVGQlVTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNXVUZCV1N4RlFVRkZMR0ZCUVdFc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGNFVXNTVUZCU1N4RFFVRkRMR1ZCUVdVc1IwRkJSeXhsUVVGbExFTkJRVU03UVVGREwwTXNTMEZCU3pzN1NVRkZSQ3hIUVVGSExFVkJRVVVzVlVGQlZTeEhRVUZITEVWQlFVVXNTMEZCU3l4RlFVRkZPMUZCUTNaQ0xFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRE8xRkJRek5DTEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJRenRCUVVOd1FpeExRVUZMT3p0SlFVVkVMRWRCUVVjc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJUdFJRVU5vUWl4UFFVRlBMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEYkVNc1MwRkJTenM3U1VGRlJDeEpRVUZKTEVWQlFVVXNXVUZCV1R0UlFVTmtMRmxCUVZrc1EwRkJReXhQUVVGUExFTkJRVU1zYVVKQlFXbENMRVZCUVVVc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVNdlJTeExRVUZMT3p0SlFVVkVMR0ZCUVdFc1JVRkJSU3haUVVGWk8xRkJRM1pDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRWxCUVVrc1EwRkJReXhsUVVGbExFTkJRVU03VVVGRGNFTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRWaXhKUVVGSkxFTkJRVU1zVVVGQlVTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxGRkJRVkVzUTBGQlF5eERRVUZETzFsQlEzWkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF6dFRRVU5tTzB0QlEwbzdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVFVGQlRTeERRVUZETEU5QlFVOHNSMEZCUnl4UlFVRlJJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpZG1GeUlGOGdQU0J5WlhGMWFYSmxLQ2N1TDNWMGFXeHpKeWs3WEc1MllYSWdiRzlqWVd4ZmMzUnZjbUZuWlY5clpYa2dQU0FuZFhSdFpTMXpaWFIwYVc1bmN5YzdYRzVjYm1aMWJtTjBhVzl1SUZObGRIUnBibWR6SUNoa1pXWmhkV3gwVTJWMGRHbHVaM01wSUh0Y2JpQWdJQ0IwYUdsekxuTmxkRVJsWm1GMWJIUnpLR1JsWm1GMWJIUlRaWFIwYVc1bmN5QjhmQ0I3ZlNrN1hHNTlYRzVjYmxObGRIUnBibWR6TG5CeWIzUnZkSGx3WlNBOUlIdGNiaUFnSUNCeVpXRmtVMlYwZEdsdVozTkdjbTl0VEc5allXeFRkRzl5WVdkbE9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpaWFIwYVc1bmMxTjBjbWx1WnlBOUlHeHZZMkZzVTNSdmNtRm5aUzVuWlhSSmRHVnRLR3h2WTJGc1gzTjBiM0poWjJWZmEyVjVLVHRjYmlBZ0lDQWdJQ0FnZG1GeUlITmxkSFJwYm1keklEMGdlMzA3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpaWFIwYVc1bmMxTjBjbWx1WnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWMGRHbHVaM01nUFNCS1UwOU9MbkJoY25ObEtITmxkSFJwYm1kelUzUnlhVzVuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MyVjBkR2x1WjNNN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhObGRFUmxabUYxYkhSek9pQm1kVzVqZEdsdmJpQW9aR1ZtWVhWc2RGTmxkSFJwYm1kektTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCc2IyTmhiRk5sZEhScGJtZHpJRDBnZEdocGN5NXlaV0ZrVTJWMGRHbHVaM05HY205dFRHOWpZV3hUZEc5eVlXZGxLQ2s3WEc0Z0lDQWdJQ0FnSUhaaGNpQmtaV1poZFd4MGMwTnZjSGtnUFNCZkxtVjRkR1Z1WkNoN2ZTd2daR1ZtWVhWc2RGTmxkSFJwYm1keklIeDhJSHQ5S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSMGFXNW5jeUE5SUY4dVpYaDBaVzVrS0h0OUxDQmZMbVY0ZEdWdVpDaGtaV1poZFd4MGMwTnZjSGtzSUd4dlkyRnNVMlYwZEdsdVozTXBLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWtaV1poZFd4MFUyVjBkR2x1WjNNZ1BTQmtaV1poZFd4MFUyVjBkR2x1WjNNN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhObGREb2dablZ1WTNScGIyNGdLR3RsZVN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSMGFXNW5jMXRyWlhsZElEMGdkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJGMlpTZ3BPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQm5aWFE2SUdaMWJtTjBhVzl1SUNoclpYa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWMyVjBkR2x1WjNOYmEyVjVYVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMkYyWlRvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0JzYjJOaGJGTjBiM0poWjJVdWMyVjBTWFJsYlNoc2IyTmhiRjl6ZEc5eVlXZGxYMnRsZVN3Z1NsTlBUaTV6ZEhKcGJtZHBabmtvZEdocGN5NXpaWFIwYVc1bmN5a3BPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnlaWE5sZEVSbFptRjFiSFJ6T2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCa1pXWmhkV3gwY3lBOUlIUm9hWE11WkdWbVlYVnNkRk5sZEhScGJtZHpPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pHVm1ZWFZzZEhNcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwZEdsdVozTWdQU0JmTG1WNGRHVnVaQ2g3ZlN3Z1pHVm1ZWFZzZEhNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpZWFpsS0NrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlPMXh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZObGRIUnBibWR6T3lKZGZRPT0iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFNpbXVsYXRlID0ge1xuICAgIGV2ZW50OiBmdW5jdGlvbihlbGVtZW50LCBldmVudE5hbWUsIG9wdGlvbnMpe1xuICAgICAgICB2YXIgZXZ0O1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiSFRNTEV2ZW50c1wiKTtcbiAgICAgICAgICAgIGV2dC5pbml0RXZlbnQoZXZlbnROYW1lLCBldmVudE5hbWUgIT0gJ21vdXNlZW50ZXInICYmIGV2ZW50TmFtZSAhPSAnbW91c2VsZWF2ZScsIHRydWUgKTtcbiAgICAgICAgICAgIF8uZXh0ZW5kKGV2dCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudE9iamVjdCgpO1xuICAgICAgICAgICAgZWxlbWVudC5maXJlRXZlbnQoJ29uJyArIGV2ZW50TmFtZSxldnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBrZXlFdmVudDogZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgb3B0aW9ucyl7XG4gICAgICAgIHZhciBldnQsXG4gICAgICAgICAgICBlID0ge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUsIHZpZXc6IHdpbmRvdyxcbiAgICAgICAgICAgICAgICBjdHJsS2V5OiBmYWxzZSwgYWx0S2V5OiBmYWxzZSwgc2hpZnRLZXk6IGZhbHNlLCBtZXRhS2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBrZXlDb2RlOiAwLCBjaGFyQ29kZTogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgXy5leHRlbmQoZSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCl7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0tleUV2ZW50cycpO1xuICAgICAgICAgICAgICAgIGV2dC5pbml0S2V5RXZlbnQoXG4gICAgICAgICAgICAgICAgICAgIHR5cGUsIGUuYnViYmxlcywgZS5jYW5jZWxhYmxlLCBlLnZpZXcsXG4gICAgICAgICAgICBlLmN0cmxLZXksIGUuYWx0S2V5LCBlLnNoaWZ0S2V5LCBlLm1ldGFLZXksXG4gICAgICAgICAgICBlLmtleUNvZGUsIGUuY2hhckNvZGUpO1xuICAgICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiRXZlbnRzXCIpO1xuICAgICAgICBldnQuaW5pdEV2ZW50KHR5cGUsIGUuYnViYmxlcywgZS5jYW5jZWxhYmxlKTtcbiAgICAgICAgXy5leHRlbmQoZXZ0LCB7XG4gICAgICAgICAgICB2aWV3OiBlLnZpZXcsXG4gICAgICAgICAgY3RybEtleTogZS5jdHJsS2V5LCBhbHRLZXk6IGUuYWx0S2V5LFxuICAgICAgICAgIHNoaWZ0S2V5OiBlLnNoaWZ0S2V5LCBtZXRhS2V5OiBlLm1ldGFLZXksXG4gICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlLCBjaGFyQ29kZTogZS5jaGFyQ29kZVxuICAgICAgICB9KTtcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cblNpbXVsYXRlLmtleXByZXNzID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXlwcmVzcycsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxuU2ltdWxhdGUua2V5ZG93biA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5ZG93bicsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxuU2ltdWxhdGUua2V5dXAgPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleXVwJywge1xuICAgICAgICBrZXlDb2RlOiBjaGFyQ29kZSxcbiAgICAgICAgY2hhckNvZGU6IGNoYXJDb2RlXG4gICAgfSk7XG59O1xuXG52YXIgZXZlbnRzID0gW1xuICAgICdjbGljaycsXG4gICAgJ2ZvY3VzJyxcbiAgICAnYmx1cicsXG4gICAgJ2RibGNsaWNrJyxcbiAgICAnaW5wdXQnLFxuICAgICdjaGFuZ2UnLFxuICAgICdtb3VzZWRvd24nLFxuICAgICdtb3VzZW1vdmUnLFxuICAgICdtb3VzZW91dCcsXG4gICAgJ21vdXNlb3ZlcicsXG4gICAgJ21vdXNldXAnLFxuICAgICdtb3VzZWVudGVyJyxcbiAgICAnbW91c2VsZWF2ZScsXG4gICAgJ3Jlc2l6ZScsXG4gICAgJ3Njcm9sbCcsXG4gICAgJ3NlbGVjdCcsXG4gICAgJ3N1Ym1pdCcsXG4gICAgJ2xvYWQnLFxuICAgICd1bmxvYWQnXG5dO1xuXG5mb3IgKHZhciBpID0gZXZlbnRzLmxlbmd0aDsgaS0tOyl7XG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW2ldO1xuICAgIFNpbXVsYXRlW2V2ZW50XSA9IChmdW5jdGlvbihldnQpe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgICAgICAgICB0aGlzLmV2ZW50KGVsZW1lbnQsIGV2dCwgb3B0aW9ucyk7XG4gICAgICAgIH07XG4gICAgfShldmVudCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXVsYXRlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05wYlhWc1lYUmxMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMybHRkV3hoZEdVdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUVzU1VGQlNTeERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE96dEJRVVV6UWl4SlFVRkpMRkZCUVZFc1IwRkJSenRKUVVOWUxFdEJRVXNzUlVGQlJTeFRRVUZUTEU5QlFVOHNSVUZCUlN4VFFVRlRMRVZCUVVVc1QwRkJUeXhEUVVGRE8xRkJRM2hETEVsQlFVa3NSMEZCUnl4RFFVRkRPMUZCUTFJc1NVRkJTU3hSUVVGUkxFTkJRVU1zVjBGQlZ5eEZRVUZGTzFsQlEzUkNMRWRCUVVjc1IwRkJSeXhSUVVGUkxFTkJRVU1zVjBGQlZ5eERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRPMWxCUTNwRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNVMEZCVXl4RlFVRkZMRk5CUVZNc1NVRkJTU3haUVVGWkxFbEJRVWtzVTBGQlV5eEpRVUZKTEZsQlFWa3NSVUZCUlN4SlFVRkpMRVZCUVVVc1EwRkJRenRaUVVONFJpeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dFpRVU4yUWl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlF6bENMRWxCUVVrN1dVRkRSQ3hIUVVGSExFZEJRVWNzVVVGQlVTeERRVUZETEdsQ1FVRnBRaXhGUVVGRkxFTkJRVU03V1VGRGJrTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFZEJRVWNzVTBGQlV5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUXpORE8wdEJRMG83U1VGRFJDeFJRVUZSTEVWQlFVVXNVMEZCVXl4UFFVRlBMRVZCUVVVc1NVRkJTU3hGUVVGRkxFOUJRVThzUTBGQlF6dFJRVU4wUXl4SlFVRkpMRWRCUVVjN1dVRkRTQ3hEUVVGRExFZEJRVWM3WjBKQlEwRXNUMEZCVHl4RlFVRkZMRWxCUVVrc1JVRkJSU3hWUVVGVkxFVkJRVVVzU1VGQlNTeEZRVUZGTEVsQlFVa3NSVUZCUlN4TlFVRk5PMmRDUVVNM1F5eFBRVUZQTEVWQlFVVXNTMEZCU3l4RlFVRkZMRTFCUVUwc1JVRkJSU3hMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEV0QlFVc3NSVUZCUlN4UFFVRlBMRVZCUVVVc1MwRkJTenRuUWtGRE9VUXNUMEZCVHl4RlFVRkZMRU5CUVVNc1JVRkJSU3hSUVVGUkxFVkJRVVVzUTBGQlF6dGhRVU14UWl4RFFVRkRPMUZCUTA0c1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1VVRkRja0lzU1VGQlNTeFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRPMWxCUTNKQ0xFZEJRVWM3WjBKQlEwTXNSMEZCUnl4SFFVRkhMRkZCUVZFc1EwRkJReXhYUVVGWExFTkJRVU1zVjBGQlZ5eERRVUZETEVOQlFVTTdaMEpCUTNoRExFZEJRVWNzUTBGQlF5eFpRVUZaTzI5Q1FVTmFMRWxCUVVrc1JVRkJSU3hEUVVGRExFTkJRVU1zVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4VlFVRlZMRVZCUVVVc1EwRkJReXhEUVVGRExFbEJRVWs3V1VGRE4wTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNRMEZCUXl4UlFVRlJMRVZCUVVVc1EwRkJReXhEUVVGRExFOUJRVTg3V1VGRE1VTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeERRVUZETEVOQlFVTTdWVUZEZWtJc1QwRkJUeXhEUVVGRExHRkJRV0VzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0VFFVTTFRaXhOUVVGTkxFZEJRVWNzUTBGQlF6dFpRVU5RTEVkQlFVY3NSMEZCUnl4UlFVRlJMRU5CUVVNc1YwRkJWeXhEUVVGRExGRkJRVkVzUTBGQlF5eERRVUZETzFGQlEzcERMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBMRVZCUVVVc1EwRkJReXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETzFGQlF6ZERMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUjBGQlJ5eEZRVUZGTzFsQlExWXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJReXhKUVVGSk8xVkJRMlFzVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBMRVZCUVVVc1RVRkJUU3hGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTzFWQlEzQkRMRkZCUVZFc1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeEZRVUZGTEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUenRWUVVONFF5eFBRVUZQTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRTdVMEZEZWtNc1EwRkJReXhEUVVGRE8xRkJRMGdzVDBGQlR5eERRVUZETEdGQlFXRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRUUVVNeFFqdFRRVU5CTzB0QlEwbzdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVVVGQlVTeERRVUZETEZGQlFWRXNSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSU3hIUVVGSExFTkJRVU03U1VGRGRFTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1IwRkJSeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0SlFVTnFReXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFVOHNSVUZCUlN4VlFVRlZMRVZCUVVVN1VVRkRMMElzVDBGQlR5eEZRVUZGTEZGQlFWRTdVVUZEYWtJc1VVRkJVU3hGUVVGRkxGRkJRVkU3UzBGRGNrSXNRMEZCUXl4RFFVRkRPMEZCUTFBc1EwRkJReXhEUVVGRE96dEJRVVZHTEZGQlFWRXNRMEZCUXl4UFFVRlBMRWRCUVVjc1UwRkJVeXhQUVVGUExFVkJRVVVzUjBGQlJ5eERRVUZETzBsQlEzSkRMRWxCUVVrc1VVRkJVU3hIUVVGSExFZEJRVWNzUTBGQlF5eFZRVUZWTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1NVRkRha01zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4UFFVRlBMRVZCUVVVc1UwRkJVeXhGUVVGRk8xRkJRemxDTEU5QlFVOHNSVUZCUlN4UlFVRlJPMUZCUTJwQ0xGRkJRVkVzUlVGQlJTeFJRVUZSTzB0QlEzSkNMRU5CUVVNc1EwRkJRenRCUVVOUUxFTkJRVU1zUTBGQlF6czdRVUZGUml4UlFVRlJMRU5CUVVNc1MwRkJTeXhIUVVGSExGTkJRVk1zVDBGQlR5eEZRVUZGTEVkQlFVY3NRMEZCUXp0SlFVTnVReXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEhRVUZITEVOQlFVTXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8wbEJRMnBETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1QwRkJUeXhGUVVGRkxFOUJRVThzUlVGQlJUdFJRVU0xUWl4UFFVRlBMRVZCUVVVc1VVRkJVVHRSUVVOcVFpeFJRVUZSTEVWQlFVVXNVVUZCVVR0TFFVTnlRaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZETEVOQlFVTTdPMEZCUlVZc1NVRkJTU3hOUVVGTkxFZEJRVWM3U1VGRFZDeFBRVUZQTzBsQlExQXNUMEZCVHp0SlFVTlFMRTFCUVUwN1NVRkRUaXhWUVVGVk8wbEJRMVlzVDBGQlR6dEpRVU5RTEZGQlFWRTdTVUZEVWl4WFFVRlhPMGxCUTFnc1YwRkJWenRKUVVOWUxGVkJRVlU3U1VGRFZpeFhRVUZYTzBsQlExZ3NVMEZCVXp0SlFVTlVMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVVVGQlVUdEpRVU5TTEZGQlFWRTdTVUZEVWl4UlFVRlJPMGxCUTFJc1VVRkJVVHRKUVVOU0xFMUJRVTA3U1VGRFRpeFJRVUZSTzBGQlExb3NRMEZCUXl4RFFVRkRPenRCUVVWR0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdEpRVU0zUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdTVUZEZEVJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRPMUZCUXpWQ0xFOUJRVThzVTBGQlV5eFBRVUZQTEVWQlFVVXNUMEZCVHl4RFFVRkRPMWxCUXpkQ0xFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUMEZCVHl4RlFVRkZMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU55UXl4RFFVRkRPMHRCUTB3c1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEyUXNRMEZCUXpzN1FVRkZSQ3hOUVVGTkxFTkJRVU1zVDBGQlR5eEhRVUZITEZGQlFWRWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUoyWVhJZ1h5QTlJSEpsY1hWcGNtVW9KeTR2ZFhScGJITW5LVHRjYmx4dWRtRnlJRk5wYlhWc1lYUmxJRDBnZTF4dUlDQWdJR1YyWlc1ME9pQm1kVzVqZEdsdmJpaGxiR1Z0Wlc1MExDQmxkbVZ1ZEU1aGJXVXNJRzl3ZEdsdmJuTXBlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pYWjBPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pHOWpkVzFsYm5RdVkzSmxZWFJsUlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVYyWlc1MEtGd2lTRlJOVEVWMlpXNTBjMXdpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZEM1cGJtbDBSWFpsYm5Rb1pYWmxiblJPWVcxbExDQmxkbVZ1ZEU1aGJXVWdJVDBnSjIxdmRYTmxaVzUwWlhJbklDWW1JR1YyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZzWldGMlpTY3NJSFJ5ZFdVZ0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUY4dVpYaDBaVzVrS0dWMmRDd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJQ0FnSUNCbGJHVnRaVzUwTG1ScGMzQmhkR05vUlhabGJuUW9aWFowS1R0Y2JpQWdJQ0FnSUNBZ2ZXVnNjMlY3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmxkblFnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGZG1WdWRFOWlhbVZqZENncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWld4bGJXVnVkQzVtYVhKbFJYWmxiblFvSjI5dUp5QXJJR1YyWlc1MFRtRnRaU3hsZG5RcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCclpYbEZkbVZ1ZERvZ1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z2RIbHdaU3dnYjNCMGFXOXVjeWw3WEc0Z0lDQWdJQ0FnSUhaaGNpQmxkblFzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKMVltSnNaWE02SUhSeWRXVXNJR05oYm1ObGJHRmliR1U2SUhSeWRXVXNJSFpwWlhjNklIZHBibVJ2ZHl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamRISnNTMlY1T2lCbVlXeHpaU3dnWVd4MFMyVjVPaUJtWVd4elpTd2djMmhwWm5STFpYazZJR1poYkhObExDQnRaWFJoUzJWNU9pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCclpYbERiMlJsT2lBd0xDQmphR0Z5UTI5a1pUb2dNRnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdYeTVsZUhSbGJtUW9aU3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUdsbUlDaGtiMk4xYldWdWRDNWpjbVZoZEdWRmRtVnVkQ2w3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBjbmw3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhaMElEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJYWmxiblFvSjB0bGVVVjJaVzUwY3ljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1sMFMyVjVSWFpsYm5Rb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFI1Y0dVc0lHVXVZblZpWW14bGN5d2daUzVqWVc1alpXeGhZbXhsTENCbExuWnBaWGNzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxMbU4wY214TFpYa3NJR1V1WVd4MFMyVjVMQ0JsTG5Ob2FXWjBTMlY1TENCbExtMWxkR0ZMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsTG10bGVVTnZaR1VzSUdVdVkyaGhja052WkdVcE8xeHVJQ0FnSUNBZ0lDQWdJR1ZzWlcxbGJuUXVaR2x6Y0dGMFkyaEZkbVZ1ZENobGRuUXBPMXh1SUNBZ0lDQWdJQ0I5WTJGMFkyZ29aWEp5S1h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZENBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWMlpXNTBLRndpUlhabGJuUnpYQ0lwTzF4dUlDQWdJQ0FnSUNCbGRuUXVhVzVwZEVWMlpXNTBLSFI1Y0dVc0lHVXVZblZpWW14bGN5d2daUzVqWVc1alpXeGhZbXhsS1R0Y2JpQWdJQ0FnSUNBZ1h5NWxlSFJsYm1Rb1pYWjBMQ0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJhV1YzT2lCbExuWnBaWGNzWEc0Z0lDQWdJQ0FnSUNBZ1kzUnliRXRsZVRvZ1pTNWpkSEpzUzJWNUxDQmhiSFJMWlhrNklHVXVZV3gwUzJWNUxGeHVJQ0FnSUNBZ0lDQWdJSE5vYVdaMFMyVjVPaUJsTG5Ob2FXWjBTMlY1TENCdFpYUmhTMlY1T2lCbExtMWxkR0ZMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdhMlY1UTI5a1pUb2daUzVyWlhsRGIyUmxMQ0JqYUdGeVEyOWtaVG9nWlM1amFHRnlRMjlrWlZ4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdaV3hsYldWdWRDNWthWE53WVhSamFFVjJaVzUwS0dWMmRDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4wN1hHNWNibE5wYlhWc1lYUmxMbXRsZVhCeVpYTnpJRDBnWm5WdVkzUnBiMjRvWld4bGJXVnVkQ3dnWTJoeUtYdGNiaUFnSUNCMllYSWdZMmhoY2tOdlpHVWdQU0JqYUhJdVkyaGhja052WkdWQmRDZ3dLVHRjYmlBZ0lDQjBhR2x6TG10bGVVVjJaVzUwS0dWc1pXMWxiblFzSUNkclpYbHdjbVZ6Y3ljc0lIdGNiaUFnSUNBZ0lDQWdhMlY1UTI5a1pUb2dZMmhoY2tOdlpHVXNYRzRnSUNBZ0lDQWdJR05vWVhKRGIyUmxPaUJqYUdGeVEyOWtaVnh1SUNBZ0lIMHBPMXh1ZlR0Y2JseHVVMmx0ZFd4aGRHVXVhMlY1Wkc5M2JpQTlJR1oxYm1OMGFXOXVLR1ZzWlcxbGJuUXNJR05vY2lsN1hHNGdJQ0FnZG1GeUlHTm9ZWEpEYjJSbElEMGdZMmh5TG1Ob1lYSkRiMlJsUVhRb01DazdYRzRnSUNBZ2RHaHBjeTVyWlhsRmRtVnVkQ2hsYkdWdFpXNTBMQ0FuYTJWNVpHOTNiaWNzSUh0Y2JpQWdJQ0FnSUNBZ2EyVjVRMjlrWlRvZ1kyaGhja052WkdVc1hHNGdJQ0FnSUNBZ0lHTm9ZWEpEYjJSbE9pQmphR0Z5UTI5a1pWeHVJQ0FnSUgwcE8xeHVmVHRjYmx4dVUybHRkV3hoZEdVdWEyVjVkWEFnUFNCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCamFISXBlMXh1SUNBZ0lIWmhjaUJqYUdGeVEyOWtaU0E5SUdOb2NpNWphR0Z5UTI5a1pVRjBLREFwTzF4dUlDQWdJSFJvYVhNdWEyVjVSWFpsYm5Rb1pXeGxiV1Z1ZEN3Z0oydGxlWFZ3Snl3Z2UxeHVJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmphR0Z5UTI5a1pTeGNiaUFnSUNBZ0lDQWdZMmhoY2tOdlpHVTZJR05vWVhKRGIyUmxYRzRnSUNBZ2ZTazdYRzU5TzF4dVhHNTJZWElnWlhabGJuUnpJRDBnVzF4dUlDQWdJQ2RqYkdsamF5Y3NYRzRnSUNBZ0oyWnZZM1Z6Snl4Y2JpQWdJQ0FuWW14MWNpY3NYRzRnSUNBZ0oyUmliR05zYVdOckp5eGNiaUFnSUNBbmFXNXdkWFFuTEZ4dUlDQWdJQ2RqYUdGdVoyVW5MRnh1SUNBZ0lDZHRiM1Z6WldSdmQyNG5MRnh1SUNBZ0lDZHRiM1Z6WlcxdmRtVW5MRnh1SUNBZ0lDZHRiM1Z6Wlc5MWRDY3NYRzRnSUNBZ0oyMXZkWE5sYjNabGNpY3NYRzRnSUNBZ0oyMXZkWE5sZFhBbkxGeHVJQ0FnSUNkdGIzVnpaV1Z1ZEdWeUp5eGNiaUFnSUNBbmJXOTFjMlZzWldGMlpTY3NYRzRnSUNBZ0ozSmxjMmw2WlNjc1hHNGdJQ0FnSjNOamNtOXNiQ2NzWEc0Z0lDQWdKM05sYkdWamRDY3NYRzRnSUNBZ0ozTjFZbTFwZENjc1hHNGdJQ0FnSjJ4dllXUW5MRnh1SUNBZ0lDZDFibXh2WVdRblhHNWRPMXh1WEc1bWIzSWdLSFpoY2lCcElEMGdaWFpsYm5SekxteGxibWQwYURzZ2FTMHRPeWw3WEc0Z0lDQWdkbUZ5SUdWMlpXNTBJRDBnWlhabGJuUnpXMmxkTzF4dUlDQWdJRk5wYlhWc1lYUmxXMlYyWlc1MFhTQTlJQ2htZFc1amRHbHZiaWhsZG5RcGUxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z2IzQjBhVzl1Y3lsN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxtVjJaVzUwS0dWc1pXMWxiblFzSUdWMmRDd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmU2hsZG1WdWRDa3BPMXh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlGTnBiWFZzWVhSbE95SmRmUT09IiwiLyoqXG4gKiBQb2x5ZmlsbHNcbiAqL1xuXG4vKipcbiAqIFRoaXMgaXMgY29waWVkIGZyb20gUmVhY0pTJ3Mgb3duIHBvbHlwZmlsbCB0byBydW4gdGVzdHMgd2l0aCBwaGFudG9tanMuXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svcmVhY3QvYmxvYi8zZGMxMDc0OTA4MGE0NjBlNDhiZWU0NmQ3Njk3NjNlYzcxOTFhYzc2L3NyYy90ZXN0L3BoYW50b21qcy1zaGltcy5qc1xuICovXG4oZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgQXAgPSBBcnJheS5wcm90b3R5cGU7XG4gICAgdmFyIHNsaWNlID0gQXAuc2xpY2U7XG4gICAgdmFyIEZwID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gICAgaWYgKCFGcC5iaW5kKSB7XG4gICAgICAvLyBQaGFudG9tSlMgZG9lc24ndCBzdXBwb3J0IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIG5hdGl2ZWx5LCBzb1xuICAgICAgLy8gcG9seWZpbGwgaXQgd2hlbmV2ZXIgdGhpcyBtb2R1bGUgaXMgcmVxdWlyZWQuXG4gICAgICBGcC5iaW5kID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgICB2YXIgZnVuYyA9IHRoaXM7XG4gICAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICAgIHZhciBpbnZva2VkQXNDb25zdHJ1Y3RvciA9IGZ1bmMucHJvdG90eXBlICYmICh0aGlzIGluc3RhbmNlb2YgZnVuYyk7XG4gICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkoXG4gICAgICAgICAgICAvLyBJZ25vcmUgdGhlIGNvbnRleHQgcGFyYW1ldGVyIHdoZW4gaW52b2tpbmcgdGhlIGJvdW5kIGZ1bmN0aW9uXG4gICAgICAgICAgICAvLyBhcyBhIGNvbnN0cnVjdG9yLiBOb3RlIHRoYXQgdGhpcyBpbmNsdWRlcyBub3Qgb25seSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgLy8gaW52b2NhdGlvbnMgdXNpbmcgdGhlIG5ldyBrZXl3b3JkIGJ1dCBhbHNvIGNhbGxzIHRvIGJhc2UgY2xhc3NcbiAgICAgICAgICAgIC8vIGNvbnN0cnVjdG9ycyBzdWNoIGFzIEJhc2VDbGFzcy5jYWxsKHRoaXMsIC4uLikgb3Igc3VwZXIoLi4uKS5cbiAgICAgICAgICAgICFpbnZva2VkQXNDb25zdHJ1Y3RvciAmJiBjb250ZXh0IHx8IHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBib3VuZCBmdW5jdGlvbiBtdXN0IHNoYXJlIHRoZSAucHJvdG90eXBlIG9mIHRoZSB1bmJvdW5kXG4gICAgICAgIC8vIGZ1bmN0aW9uIHNvIHRoYXQgYW55IG9iamVjdCBjcmVhdGVkIGJ5IG9uZSBjb25zdHJ1Y3RvciB3aWxsIGNvdW50XG4gICAgICAgIC8vIGFzIGFuIGluc3RhbmNlIG9mIGJvdGggY29uc3RydWN0b3JzLlxuICAgICAgICBib3VuZC5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcblxuICAgICAgICByZXR1cm4gYm91bmQ7XG4gICAgICB9O1xuICAgIH1cblxufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZChkc3QsIHNyYyl7XG4gICAgICAgIGlmIChzcmMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcmMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3JjLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRzdDtcbiAgICB9LFxuXG4gICAgbWFwOiBmdW5jdGlvbihvYmosIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICAgIHZhciBsZW4gPSBvYmoubGVuZ3RoID4+PiAwO1xuICAgICAgICB2YXIgbmV3QXJyYXkgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgICAgdmFyIGtleSA9IDA7XG4gICAgICAgIGlmICghdGhpc0FyZykge1xuICAgICAgICAgICAgdGhpc0FyZyA9IG9iajtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoa2V5IDwgbGVuKSB7XG4gICAgICAgICAgICBuZXdBcnJheVtrZXldID0gY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBvYmpba2V5XSwga2V5LCBvYmopO1xuICAgICAgICAgICAga2V5Kys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xuICAgIH1cblxufTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM1YwYVd4ekxtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12ZFhScGJITXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFN08wRkJSVUVzUjBGQlJ6czdRVUZGU0R0QlFVTkJPenRIUVVWSE8wRkJRMGdzUTBGQlF5eFhRVUZYT3p0SlFVVlNMRWxCUVVrc1JVRkJSU3hIUVVGSExFdEJRVXNzUTBGQlF5eFRRVUZUTEVOQlFVTTdTVUZEZWtJc1NVRkJTU3hMUVVGTExFZEJRVWNzUlVGQlJTeERRVUZETEV0QlFVc3NRMEZCUXp0QlFVTjZRaXhKUVVGSkxFbEJRVWtzUlVGQlJTeEhRVUZITEZGQlFWRXNRMEZCUXl4VFFVRlRMRU5CUVVNN08wRkJSV2hETEVsQlFVa3NTVUZCU1N4RFFVRkRMRVZCUVVVc1EwRkJReXhKUVVGSkxFVkJRVVU3UVVGRGJFSTdPMDFCUlUwc1JVRkJSU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFRRVUZUTEU5QlFVOHNSVUZCUlR0UlFVTXhRaXhKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEZUVJc1VVRkJVU3hKUVVGSkxFbEJRVWtzUjBGQlJ5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1JVRkJSU3hEUVVGRExFTkJRVU1zUTBGQlF6czdVVUZGY0VNc1UwRkJVeXhMUVVGTExFZEJRVWM3VlVGRFppeEpRVUZKTEc5Q1FVRnZRaXhIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEV0QlFVc3NTVUZCU1N4WlFVRlpMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRemxGTEZWQlFWVXNUMEZCVHl4SlFVRkpMRU5CUVVNc1MwRkJTenRCUVVNelFqdEJRVU5CTzBGQlEwRTdPMWxCUlZrc1EwRkJReXh2UWtGQmIwSXNTVUZCU1N4UFFVRlBMRWxCUVVrc1NVRkJTVHRaUVVONFF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdWMEZEYmtNc1EwRkJRenRCUVVOYUxGTkJRVk03UVVGRFZEdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1VVRkJVU3hMUVVGTExFTkJRVU1zVTBGQlV5eEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNN08xRkJSV3BETEU5QlFVOHNTMEZCU3l4RFFVRkRPMDlCUTJRc1EwRkJRenRCUVVOU0xFdEJRVXM3TzBGQlJVd3NRMEZCUXl4SFFVRkhMRU5CUVVNN08wRkJSVXdzVFVGQlRTeERRVUZETEU5QlFVOHNSMEZCUnpzN1NVRkZZaXhOUVVGTkxFVkJRVVVzVTBGQlV5eE5RVUZOTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJRenRSUVVNM1FpeEpRVUZKTEVkQlFVY3NSVUZCUlR0WlFVTk1MRXRCUVVzc1NVRkJTU3hIUVVGSExFbEJRVWtzUjBGQlJ5eEZRVUZGTzJkQ1FVTnFRaXhKUVVGSkxFZEJRVWNzUTBGQlF5eGpRVUZqTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVN2IwSkJRM3BDTEVkQlFVY3NRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSeXhIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdhVUpCUTNaQ08yRkJRMG83VTBGRFNqdFJRVU5FTEU5QlFVOHNSMEZCUnl4RFFVRkRPMEZCUTI1Q0xFdEJRVXM3TzBsQlJVUXNSMEZCUnl4RlFVRkZMRk5CUVZNc1IwRkJSeXhGUVVGRkxGRkJRVkVzUlVGQlJTeFBRVUZQTEVWQlFVVTdVVUZEYkVNc1NVRkJTU3hIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEUxQlFVMHNTMEZCU3l4RFFVRkRMRU5CUVVNN1VVRkRNMElzU1VGQlNTeFJRVUZSTEVkQlFVY3NTVUZCU1N4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03VVVGRE9VSXNTVUZCU1N4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRE8xRkJRMW9zU1VGQlNTeERRVUZETEU5QlFVOHNSVUZCUlR0WlFVTldMRTlCUVU4c1IwRkJSeXhIUVVGSExFTkJRVU03VTBGRGFrSTdVVUZEUkN4UFFVRlBMRWRCUVVjc1IwRkJSeXhIUVVGSExFVkJRVVU3V1VGRFpDeFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVWQlFVVXNSMEZCUnl4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFZEJRVWNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0WlFVTXpSQ3hIUVVGSExFVkJRVVVzUTBGQlF6dFRRVU5VTzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNN1FVRkRlRUlzUzBGQlN6czdRMEZGU2l4RFFVRkRJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpTHlvcVhHNGdLaUJRYjJ4NVptbHNiSE5jYmlBcUwxeHVYRzR2S2lwY2JpQXFJRlJvYVhNZ2FYTWdZMjl3YVdWa0lHWnliMjBnVW1WaFkwcFRKM01nYjNkdUlIQnZiSGx3Wm1sc2JDQjBieUJ5ZFc0Z2RHVnpkSE1nZDJsMGFDQndhR0Z1ZEc5dGFuTXVYRzRnS2lCb2RIUndjem92TDJkcGRHaDFZaTVqYjIwdlptRmpaV0p2YjJzdmNtVmhZM1F2WW14dllpOHpaR014TURjME9UQTRNR0UwTmpCbE5EaGlaV1UwTm1RM05qazNOak5sWXpjeE9URmhZemMyTDNOeVl5OTBaWE4wTDNCb1lXNTBiMjFxY3kxemFHbHRjeTVxYzF4dUlDb3ZYRzRvWm5WdVkzUnBiMjRvS1NCN1hHNWNiaUFnSUNCMllYSWdRWEFnUFNCQmNuSmhlUzV3Y205MGIzUjVjR1U3WEc0Z0lDQWdkbUZ5SUhOc2FXTmxJRDBnUVhBdWMyeHBZMlU3WEc0Z0lDQWdkbUZ5SUVad0lEMGdSblZ1WTNScGIyNHVjSEp2ZEc5MGVYQmxPMXh1WEc0Z0lDQWdhV1lnS0NGR2NDNWlhVzVrS1NCN1hHNGdJQ0FnSUNBdkx5QlFhR0Z1ZEc5dFNsTWdaRzlsYzI0bmRDQnpkWEJ3YjNKMElFWjFibU4wYVc5dUxuQnliM1J2ZEhsd1pTNWlhVzVrSUc1aGRHbDJaV3g1TENCemIxeHVJQ0FnSUNBZ0x5OGdjRzlzZVdacGJHd2dhWFFnZDJobGJtVjJaWElnZEdocGN5QnRiMlIxYkdVZ2FYTWdjbVZ4ZFdseVpXUXVYRzRnSUNBZ0lDQkdjQzVpYVc1a0lEMGdablZ1WTNScGIyNG9ZMjl1ZEdWNGRDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1puVnVZeUE5SUhSb2FYTTdYRzRnSUNBZ0lDQWdJSFpoY2lCaGNtZHpJRDBnYzJ4cFkyVXVZMkZzYkNoaGNtZDFiV1Z1ZEhNc0lERXBPMXh1WEc0Z0lDQWdJQ0FnSUdaMWJtTjBhVzl1SUdKdmRXNWtLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lIWmhjaUJwYm5admEyVmtRWE5EYjI1emRISjFZM1J2Y2lBOUlHWjFibU11Y0hKdmRHOTBlWEJsSUNZbUlDaDBhR2x6SUdsdWMzUmhibU5sYjJZZ1puVnVZeWs3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaMWJtTXVZWEJ3Ykhrb1hHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCSloyNXZjbVVnZEdobElHTnZiblJsZUhRZ2NHRnlZVzFsZEdWeUlIZG9aVzRnYVc1MmIydHBibWNnZEdobElHSnZkVzVrSUdaMWJtTjBhVzl1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJoY3lCaElHTnZibk4wY25WamRHOXlMaUJPYjNSbElIUm9ZWFFnZEdocGN5QnBibU5zZFdSbGN5QnViM1FnYjI1c2VTQmpiMjV6ZEhKMVkzUnZjbHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdhVzUyYjJOaGRHbHZibk1nZFhOcGJtY2dkR2hsSUc1bGR5QnJaWGwzYjNKa0lHSjFkQ0JoYkhOdklHTmhiR3h6SUhSdklHSmhjMlVnWTJ4aGMzTmNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklHTnZibk4wY25WamRHOXljeUJ6ZFdOb0lHRnpJRUpoYzJWRGJHRnpjeTVqWVd4c0tIUm9hWE1zSUM0dUxpa2diM0lnYzNWd1pYSW9MaTR1S1M1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0ZwYm5admEyVmtRWE5EYjI1emRISjFZM1J2Y2lBbUppQmpiMjUwWlhoMElIeDhJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JoY21kekxtTnZibU5oZENoemJHbGpaUzVqWVd4c0tHRnlaM1Z0Wlc1MGN5a3BYRzRnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQzh2SUZSb1pTQmliM1Z1WkNCbWRXNWpkR2x2YmlCdGRYTjBJSE5vWVhKbElIUm9aU0F1Y0hKdmRHOTBlWEJsSUc5bUlIUm9aU0IxYm1KdmRXNWtYRzRnSUNBZ0lDQWdJQzh2SUdaMWJtTjBhVzl1SUhOdklIUm9ZWFFnWVc1NUlHOWlhbVZqZENCamNtVmhkR1ZrSUdKNUlHOXVaU0JqYjI1emRISjFZM1J2Y2lCM2FXeHNJR052ZFc1MFhHNGdJQ0FnSUNBZ0lDOHZJR0Z6SUdGdUlHbHVjM1JoYm1ObElHOW1JR0p2ZEdnZ1kyOXVjM1J5ZFdOMGIzSnpMbHh1SUNBZ0lDQWdJQ0JpYjNWdVpDNXdjbTkwYjNSNWNHVWdQU0JtZFc1akxuQnliM1J2ZEhsd1pUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZbTkxYm1RN1hHNGdJQ0FnSUNCOU8xeHVJQ0FnSUgxY2JseHVmU2tvS1R0Y2JseHViVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQjdYRzVjYmlBZ0lDQmxlSFJsYm1RNklHWjFibU4wYVc5dUlHVjRkR1Z1WkNoa2MzUXNJSE55WXlsN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6Y21NcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUd0bGVTQnBiaUJ6Y21NcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNKakxtaGhjMDkzYmxCeWIzQmxjblI1S0d0bGVTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pITjBXMnRsZVYwZ1BTQnpjbU5iYTJWNVhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHUnpkRHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdiV0Z3T2lCbWRXNWpkR2x2Ymlodlltb3NJR05oYkd4aVlXTnJMQ0IwYUdselFYSm5LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnNaVzRnUFNCdlltb3ViR1Z1WjNSb0lENCtQaUF3TzF4dUlDQWdJQ0FnSUNCMllYSWdibVYzUVhKeVlYa2dQU0J1WlhjZ1FYSnlZWGtvYkdWdUtUdGNiaUFnSUNBZ0lDQWdkbUZ5SUd0bGVTQTlJREE3WEc0Z0lDQWdJQ0FnSUdsbUlDZ2hkR2hwYzBGeVp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjMEZ5WnlBOUlHOWlhanRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCM2FHbHNaU0FvYTJWNUlEd2diR1Z1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J1WlhkQmNuSmhlVnRyWlhsZElEMGdZMkZzYkdKaFkyc3VZMkZzYkNoMGFHbHpRWEpuTENCdlltcGJhMlY1WFN3Z2EyVjVMQ0J2WW1vcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYTJWNUt5czdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzVsZDBGeWNtRjVPMXh1SUNBZ0lIMWNibHh1ZlR0Y2JpSmRmUT09IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbnZhciBTaW11bGF0ZSA9IHJlcXVpcmUoJy4vc2ltdWxhdGUnKTtcbnZhciBzZWxlY3RvckZpbmRlciA9IHJlcXVpcmUoJy4vc2VsZWN0b3JGaW5kZXInKTtcbnZhciBTZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcblxuLy8gdmFyIG15R2VuZXJhdG9yID0gbmV3IENzc1NlbGVjdG9yR2VuZXJhdG9yKCk7XG52YXIgaW1wb3J0YW50U3RlcExlbmd0aCA9IDUwMDtcbnZhciBzYXZlSGFuZGxlcnMgPSBbXTtcbnZhciByZXBvcnRIYW5kbGVycyA9IFtdO1xudmFyIGxvYWRIYW5kbGVycyA9IFtdO1xudmFyIHNldHRpbmdzTG9hZEhhbmRsZXJzID0gW107XG5cbmZ1bmN0aW9uIGdldFNjZW5hcmlvKG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBpZiAobG9hZEhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIHN0YXRlID0gdXRtZS5zdGF0ZTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGUuc2NlbmFyaW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnNjZW5hcmlvc1tpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3RhdGUuc2NlbmFyaW9zW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2FkSGFuZGxlcnNbMF0obmFtZSwgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3ApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbnZhciB2YWxpZGF0aW5nID0gZmFsc2U7XG5cbnZhciBldmVudHMgPSBbXG4gICAgJ2NsaWNrJyxcbiAgICAnZm9jdXMnLFxuICAgICdibHVyJyxcbiAgICAnZGJsY2xpY2snLFxuICAgIC8vICdkcmFnJyxcbiAgICAvLyAnZHJhZ2VudGVyJyxcbiAgICAvLyAnZHJhZ2xlYXZlJyxcbiAgICAvLyAnZHJhZ292ZXInLFxuICAgIC8vICdkcmFnc3RhcnQnLFxuICAgIC8vICdpbnB1dCcsXG4gICAgJ21vdXNlZG93bicsXG4gICAgLy8gJ21vdXNlbW92ZScsXG4gICAgJ21vdXNlZW50ZXInLFxuICAgICdtb3VzZWxlYXZlJyxcbiAgICAnbW91c2VvdXQnLFxuICAgICdtb3VzZW92ZXInLFxuICAgICdtb3VzZXVwJyxcbiAgICAnY2hhbmdlJyxcbiAgICAvLyAncmVzaXplJyxcbiAgICAvLyAnc2Nyb2xsJ1xuXTtcblxuZnVuY3Rpb24gZ2V0Q29uZGl0aW9ucyhzY2VuYXJpbywgY29uZGl0aW9uVHlwZSkge1xuICB2YXIgc2V0dXAgPSBzY2VuYXJpb1tjb25kaXRpb25UeXBlXTtcbiAgdmFyIHNjZW5hcmlvcyA9IHNldHVwICYmIHNldHVwLnNjZW5hcmlvcztcbiAgLy8gVE9ETzogQnJlYWsgb3V0IGludG8gaGVscGVyXG4gIGlmIChzY2VuYXJpb3MpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXy5tYXAoc2NlbmFyaW9zLCBmdW5jdGlvbiAoc2NlbmFyaW9OYW1lKSB7XG4gICAgICByZXR1cm4gZ2V0U2NlbmFyaW8oc2NlbmFyaW9OYW1lKS50aGVuKGZ1bmN0aW9uIChvdGhlclNjZW5hcmlvKSB7XG4gICAgICAgIG90aGVyU2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG90aGVyU2NlbmFyaW8pKTtcbiAgICAgICAgcmV0dXJuIHNldHVwQ29uZGl0aW9ucyhvdGhlclNjZW5hcmlvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgdG9SZXR1cm4gPSBbXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG90aGVyU2NlbmFyaW8uc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRvUmV0dXJuLnB1c2gob3RoZXJTY2VuYXJpby5zdGVwc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0b1JldHVybjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJlY29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgcmV0dXJuIGdldENvbmRpdGlvbnMoc2NlbmFyaW8sICdzZXR1cCcpO1xufVxuXG5mdW5jdGlvbiBnZXRQb3N0Y29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgcmV0dXJuIGdldENvbmRpdGlvbnMoc2NlbmFyaW8sICdjbGVhbnVwJyk7XG59XG5cbmZ1bmN0aW9uIF9jb25jYXRTY2VuYXJpb1N0ZXBMaXN0cyhzdGVwcykge1xuICAgIHZhciBuZXdTdGVwcyA9IFtdO1xuICAgIHZhciBjdXJyZW50VGltZXN0YW1wOyAvLyBpbml0YWxpemVkIGJ5IGZpcnN0IGxpc3Qgb2Ygc3RlcHMuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBzdGVwcy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgZmxhdFN0ZXBzID0gc3RlcHNbal07XG4gICAgICAgIGlmIChqID4gMCkge1xuICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBzdGVwcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwID0gZmxhdFN0ZXBzW2tdO1xuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gayA+IDAgPyBzdGVwLnRpbWVTdGFtcCAtIGZsYXRTdGVwc1trIC0gMV0udGltZVN0YW1wIDogNTA7XG4gICAgICAgICAgICAgICAgY3VycmVudFRpbWVzdGFtcCArPSBkaWZmO1xuICAgICAgICAgICAgICAgIGZsYXRTdGVwc1trXS50aW1lU3RhbXAgPSBjdXJyZW50VGltZXN0YW1wO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3VycmVudFRpbWVzdGFtcCA9IGZsYXRTdGVwc1tqXS50aW1lU3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgbmV3U3RlcHMgPSBuZXdTdGVwcy5jb25jYXQoZmxhdFN0ZXBzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1N0ZXBzO1xufVxuXG5mdW5jdGlvbiBzZXR1cENvbmRpdGlvbnMgKHNjZW5hcmlvKSB7XG4gICAgdmFyIHByb21pc2VzID0gW107XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0UHJlY29uZGl0aW9ucyhzY2VuYXJpbyksXG4gICAgICAgIGdldFBvc3Rjb25kaXRpb25zKHNjZW5hcmlvKVxuICAgIF0pLnRoZW4oZnVuY3Rpb24gKHN0ZXBBcnJheXMpIHtcbiAgICAgICAgdmFyIHN0ZXBMaXN0cyA9IHN0ZXBBcnJheXNbMF0uY29uY2F0KFtzY2VuYXJpby5zdGVwc10sIHN0ZXBBcnJheXNbMV0pO1xuICAgICAgICBzY2VuYXJpby5zdGVwcyA9IF9jb25jYXRTY2VuYXJpb1N0ZXBMaXN0cyhzdGVwTGlzdHMpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBydW5TdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCkge1xuICAgIHV0bWUuYnJvYWRjYXN0KCdSVU5OSU5HX1NURVAnKTtcbiAgICB0b1NraXAgPSB0b1NraXAgfHwge307XG5cbiAgICB2YXIgc3RlcCA9IHNjZW5hcmlvLnN0ZXBzW2lkeF07XG4gICAgdmFyIHN0YXRlID0gdXRtZS5zdGF0ZTtcbiAgICBpZiAoc3RlcCAmJiBzdGF0ZS5zdGF0dXMgPT0gJ1BMQVlJTkcnKSB7XG4gICAgICAgIHN0YXRlLnJ1bi5zY2VuYXJpbyA9IHNjZW5hcmlvO1xuICAgICAgICBzdGF0ZS5ydW4uc3RlcEluZGV4ID0gaWR4O1xuICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ2xvYWQnKSB7XG4gICAgICAgICAgICB2YXIgbmV3TG9jYXRpb24gPSBzdGVwLmRhdGEudXJsLnByb3RvY29sICsgXCIvL1wiICsgc3RlcC5kYXRhLnVybC5ob3N0O1xuICAgICAgICAgICAgdmFyIHNlYXJjaCA9IHN0ZXAuZGF0YS51cmwuc2VhcmNoO1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBzdGVwLmRhdGEudXJsLmhhc2g7XG5cbiAgICAgICAgICAgIGlmIChzZWFyY2ggJiYgIXNlYXJjaC5jaGFyQXQoXCI/XCIpKSB7XG4gICAgICAgICAgICAgICAgc2VhcmNoID0gXCI/XCIgKyBzZWFyY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaXNTYW1lVVJMID0gKGxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgbG9jYXRpb24uaG9zdCArIGxvY2F0aW9uLnNlYXJjaCkgPT09IChuZXdMb2NhdGlvbiArIHNlYXJjaCk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVwbGFjZShuZXdMb2NhdGlvbiArIGhhc2ggKyBzZWFyY2gpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygobG9jYXRpb24ucHJvdG9jb2wgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24uc2VhcmNoKSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygoc3RlcC5kYXRhLnVybC5wcm90b2NvbCArIHN0ZXAuZGF0YS51cmwuaG9zdCArIHN0ZXAuZGF0YS51cmwuc2VhcmNoKSk7XG5cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgbm90IGNoYW5nZWQgdGhlIGFjdHVhbCBsb2NhdGlvbiwgdGhlbiB0aGUgbG9jYXRpb24ucmVwbGFjZVxuICAgICAgICAgICAgLy8gd2lsbCBub3QgZ28gYW55d2hlcmVcbiAgICAgICAgICAgIGlmIChpc1NhbWVVUkwpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ3RpbWVvdXQnKSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCwgc3RlcC5kYXRhLmFtb3VudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbG9jYXRvciA9IHN0ZXAuZGF0YS5sb2NhdG9yO1xuICAgICAgICAgICAgdmFyIHN0ZXBzID0gc2NlbmFyaW8uc3RlcHM7XG4gICAgICAgICAgICB2YXIgdW5pcXVlSWQgPSBnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApO1xuXG4gICAgICAgICAgICAvLyB0cnkgdG8gZ2V0IHJpZCBvZiB1bm5lY2Vzc2FyeSBzdGVwc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b1NraXBbdW5pcXVlSWRdID09ICd1bmRlZmluZWQnICYmIHV0bWUuc3RhdGUucnVuLnNwZWVkICE9ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgdmFyIGRpZmY7XG4gICAgICAgICAgICAgIHZhciBpZ25vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IHN0ZXBzLmxlbmd0aCAtIDE7IGogPiBpZHg7IGotLSkge1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclN0ZXAgPSBzdGVwc1tqXTtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJVbmlxdWVJZCA9IGdldFVuaXF1ZUlkRnJvbVN0ZXAob3RoZXJTdGVwKTtcbiAgICAgICAgICAgICAgICBpZiAodW5pcXVlSWQgPT09IG90aGVyVW5pcXVlSWQpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghZGlmZikge1xuICAgICAgICAgICAgICAgICAgICAgIGRpZmYgPSAob3RoZXJTdGVwLnRpbWVTdGFtcCAtIHN0ZXAudGltZVN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZ25vcmUgPSAhaXNJbXBvcnRhbnRTdGVwKG90aGVyU3RlcCkgJiYgZGlmZiA8IGltcG9ydGFudFN0ZXBMZW5ndGg7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW50ZXJhY3RpdmVTdGVwKG90aGVyU3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZ25vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB0b1NraXBbdW5pcXVlSWRdID0gaWdub3JlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXZSdyZSBza2lwcGluZyB0aGlzIGVsZW1lbnRcbiAgICAgICAgICAgIGlmICh0b1NraXBbZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKV0pIHtcbiAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnlVbnRpbEZvdW5kKHNjZW5hcmlvLCBzdGVwLCBsb2NhdG9yLCBnZXRUaW1lb3V0KHNjZW5hcmlvLCBpZHgpKS50aGVuKGZ1bmN0aW9uIChlbGVzKSB7XG5cbiAgICAgICAgICAgICAgICAgIHZhciBlbGUgPSBlbGVzWzBdO1xuICAgICAgICAgICAgICAgICAgdmFyIHRhZ05hbWUgPSBlbGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgdmFyIHN1cHBvcnRzSW5wdXRFdmVudCA9IHRhZ05hbWUgPT09ICdpbnB1dCcgfHwgdGFnTmFtZSA9PT0gJ3RleHRhcmVhJyB8fCBlbGUuZ2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnKTtcblxuICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50cy5pbmRleE9mKHN0ZXAuZXZlbnROYW1lKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmRhdGEuYnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy53aGljaCA9IG9wdGlvbnMuYnV0dG9uID0gc3RlcC5kYXRhLmJ1dHRvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdTaW11bGF0aW5nICcgKyBzdGVwLmV2ZW50TmFtZSArICcgb24gZWxlbWVudCAnLCBlbGUsIGxvY2F0b3Iuc2VsZWN0b3JzWzBdLCBcIiBmb3Igc3RlcCBcIiArIGlkeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAnY2xpY2snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJChlbGUpLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKHN0ZXAuZXZlbnROYW1lID09ICdmb2N1cycgfHwgc3RlcC5ldmVudE5hbWUgPT0gJ2JsdXInKSAmJiBlbGVbc3RlcC5ldmVudE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZWxlW3N0ZXAuZXZlbnROYW1lXSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlW3N0ZXAuZXZlbnROYW1lXShlbGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGVwLmRhdGEudmFsdWUgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgIGVsZS52YWx1ZSA9IHN0ZXAuZGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IHRoZSBpbnB1dCBldmVudC5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNJbnB1dEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdjaGFuZ2UnKTsgLy8gVGhpcyBzaG91bGQgYmUgZmlyZWQgYWZ0ZXIgYSBibHVyIGV2ZW50LlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAna2V5cHJlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0ZXAuZGF0YS5rZXlDb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5ZG93bihlbGUsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXByZXNzKGVsZSwga2V5KTtcblxuICAgICAgICAgICAgICAgICAgICBlbGUudmFsdWUgPSBzdGVwLmRhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2NoYW5nZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXVwKGVsZSwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cHBvcnRzSW5wdXRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJykge1xuICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZygnVmFsaWRhdGU6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgICsgXCIgY29udGFpbnMgdGV4dCAnXCIgICsgc3RlcC5kYXRhLnRleHQgKyBcIidcIik7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5hdXRvUnVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJykge1xuICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiVmFsaWRhdGU6IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICB1dG1lLnN0b3BTY2VuYXJpbyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydEVycm9yKFwiRmFpbGVkIG9uIHN0ZXA6IFwiICsgaWR4ICsgXCIgIEV2ZW50OiBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIgUmVhc29uOiBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnN0b3BTY2VuYXJpbyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmdldCgndmVyYm9zZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd2FpdEZvckFuZ3VsYXIocm9vdFNlbGVjdG9yKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihyb290U2VsZWN0b3IpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhbmd1bGFyIGNvdWxkIG5vdCBiZSBmb3VuZCBvbiB0aGUgd2luZG93Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5nZXRUZXN0YWJpbGl0eSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZ2V0VGVzdGFiaWxpdHkoZWwpLndoZW5TdGFibGUocmVzb2x2ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhci5lbGVtZW50KGVsKS5pbmplY3RvcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncm9vdCBlbGVtZW50ICgnICsgcm9vdFNlbGVjdG9yICsgJykgaGFzIG5vIGluamVjdG9yLicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJyB0aGlzIG1heSBtZWFuIGl0IGlzIG5vdCBpbnNpZGUgbmctYXBwLicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZWwpLmluamVjdG9yKCkuZ2V0KCckYnJvd3NlcicpLlxuICAgICAgICAgICAgICAgIG5vdGlmeVdoZW5Ob091dHN0YW5kaW5nUmVxdWVzdHMocmVzb2x2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaXNJbXBvcnRhbnRTdGVwKHN0ZXApIHtcbiAgICByZXR1cm4gc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlbGVhdmUnICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZW91dCcgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlZW50ZXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZW92ZXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdibHVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnZm9jdXMnO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gc3RlcCBpcyBzb21lIHNvcnQgb2YgdXNlciBpbnRlcmFjdGlvblxuICovXG5mdW5jdGlvbiBpc0ludGVyYWN0aXZlU3RlcChzdGVwKSB7XG4gICAgdmFyIGV2dCA9IHN0ZXAuZXZlbnROYW1lO1xuXG4gICAgLypcbiAgICAgICAvLyBJbnRlcmVzdGluZyBub3RlLCBkb2luZyB0aGUgZm9sbG93aW5nIHdhcyBjYXVzaW5nIHRoaXMgZnVuY3Rpb24gdG8gcmV0dXJuIHVuZGVmaW5lZC5cbiAgICAgICByZXR1cm5cbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZVwiKSAhPT0gMCB8fFxuICAgICAgICAgICBldnQuaW5kZXhPZihcIm1vdXNlZG93blwiKSA9PT0gMCB8fFxuICAgICAgICAgICBldnQuaW5kZXhPZihcIm1vdXNldXBcIikgPT09IDA7XG5cbiAgICAgICAvLyBJdHMgYmVjYXVzZSB0aGUgY29uZGl0aW9ucyB3ZXJlIG5vdCBvbiB0aGUgc2FtZSBsaW5lIGFzIHRoZSByZXR1cm4gc3RhdGVtZW50XG4gICAgKi9cbiAgICByZXR1cm4gZXZ0LmluZGV4T2YoXCJtb3VzZVwiKSAhPT0gMCB8fCBldnQuaW5kZXhPZihcIm1vdXNlZG93blwiKSA9PT0gMCB8fCBldnQuaW5kZXhPZihcIm1vdXNldXBcIikgPT09IDA7XG59XG5cbmZ1bmN0aW9uIHRyeVVudGlsRm91bmQoc2NlbmFyaW8sIHN0ZXAsIGxvY2F0b3IsIHRpbWVvdXQsIHRleHRUb0NoZWNrKSB7XG4gICAgdmFyIHN0YXJ0ZWQ7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gdHJ5RmluZCgpIHtcbiAgICAgICAgICAgIGlmICghc3RhcnRlZCkge1xuICAgICAgICAgICAgICAgIHN0YXJ0ZWQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVsZXM7XG4gICAgICAgICAgICB2YXIgZm91bmRUb29NYW55ID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZm91bmRWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGZvdW5kRGlmZmVyZW50VGV4dCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHNlbGVjdG9yc1RvVGVzdCA9IGxvY2F0b3Iuc2VsZWN0b3JzLnNsaWNlKDApO1xuICAgICAgICAgICAgdmFyIHRleHRUb0NoZWNrID0gc3RlcC5kYXRhLnRleHQ7XG4gICAgICAgICAgICB2YXIgY29tcGFyaXNvbiA9IHN0ZXAuZGF0YS5jb21wYXJpc29uIHx8IFwiZXF1YWxzXCI7XG4gICAgICAgICAgICBzZWxlY3RvcnNUb1Rlc3QudW5zaGlmdCgnW2RhdGEtdW5pcXVlLWlkPVwiJyArIGxvY2F0b3IudW5pcXVlSWQgKyAnXCJdJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9yc1RvVGVzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1RvVGVzdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IFwiOnZpc2libGVcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxlcyA9ICQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGV4dFRvQ2hlY2sgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdUZXh0ID0gJChlbGVzWzBdKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGNvbXBhcmlzb24gPT09ICdlcXVhbHMnICYmIG5ld1RleHQgPT09IHRleHRUb0NoZWNrKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjb21wYXJpc29uID09PSAnY29udGFpbnMnICYmIG5ld1RleHQuaW5kZXhPZih0ZXh0VG9DaGVjaykgPj0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmREaWZmZXJlbnRUZXh0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlcy5hdHRyKCdkYXRhLXVuaXF1ZS1pZCcsIGxvY2F0b3IudW5pcXVlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRUb29NYW55ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmb3VuZFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShlbGVzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApICYmIChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0ZWQpIDwgdGltZW91dCAqIDUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIDUwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kVG9vTWFueSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogRm91bmQgVG9vIE1hbnkgRWxlbWVudHNcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZvdW5kRGlmZmVyZW50VGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogVGV4dCBkb2Vzbid0IG1hdGNoLiAgXFxuRXhwZWN0ZWQ6XFxuXCIgKyB0ZXh0VG9DaGVjayArIFwiXFxuYnV0IHdhc1xcblwiICsgZWxlcy50ZXh0KCkgKyBcIlxcblwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBObyBlbGVtZW50cyBmb3VuZFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsaW1pdCA9IGltcG9ydGFudFN0ZXBMZW5ndGggLyAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT0gJ3JlYWx0aW1lJyA/ICcxJyA6IHV0bWUuc3RhdGUucnVuLnNwZWVkKTtcbiAgICAgICAgaWYgKGdsb2JhbC5hbmd1bGFyKSB7XG4gICAgICAgICAgICB3YWl0Rm9yQW5ndWxhcignW25nLWFwcF0nKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgdGltZW91dCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogdXRtZS5zdGF0ZS5ydW4uc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHV0bWUuc3RhdGUucnVuLnNwZWVkID09PSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodXRtZS5zdGF0ZS5ydW4uc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgIHRyeUZpbmQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogdXRtZS5zdGF0ZS5ydW4uc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZW91dChzY2VuYXJpbywgaWR4KSB7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgLy8gSWYgdGhlIHByZXZpb3VzIHN0ZXAgaXMgYSB2YWxpZGF0ZSBzdGVwLCB0aGVuIGp1c3QgbW92ZSBvbiwgYW5kIHByZXRlbmQgaXQgaXNuJ3QgdGhlcmVcbiAgICAgICAgLy8gT3IgaWYgaXQgaXMgYSBzZXJpZXMgb2Yga2V5cywgdGhlbiBnb1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0uZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuYXJpby5zdGVwc1tpZHhdLnRpbWVTdGFtcCAtIHNjZW5hcmlvLnN0ZXBzW2lkeCAtIDFdLnRpbWVTdGFtcDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCwgdGltZW91dCkge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSBhcmVuJ3QgZ29pbmcgdG8gb3ZlcmZsb3cgdGhlIGNhbGwgc3RhY2suXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHNjZW5hcmlvLnN0ZXBzLmxlbmd0aCA+IChpZHggKyAxKSkge1xuICAgICAgICAgICAgcnVuU3RlcChzY2VuYXJpbywgaWR4ICsgMSwgdG9Ta2lwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKHRydWUpO1xuICAgICAgICB9XG4gICAgfSwgdGltZW91dCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZnJhZ21lbnRGcm9tU3RyaW5nKHN0ckhUTUwpIHtcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHJIVE1MO1xuICAgIC8vIGNvbnNvbGUubG9nKHRlbXAuaW5uZXJIVE1MKTtcbiAgICByZXR1cm4gdGVtcC5jb250ZW50ID8gdGVtcC5jb250ZW50IDogdGVtcDtcbn1cblxuZnVuY3Rpb24gZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAgJiYgc3RlcC5kYXRhICYmIHN0ZXAuZGF0YS5sb2NhdG9yICYmIHN0ZXAuZGF0YS5sb2NhdG9yLnVuaXF1ZUlkO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJFeHRyYUxvYWRzKHN0ZXBzKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgdmFyIHNlZW5Mb2FkID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXNMb2FkID0gc3RlcHNbaV0uZXZlbnROYW1lID09PSAnbG9hZCc7XG4gICAgaWYgKCFzZWVuTG9hZCB8fCAhaXNMb2FkKSB7XG4gICAgICByZXN1bHQucHVzaChzdGVwc1tpXSk7XG4gICAgICBzZWVuTG9hZCA9IHNlZW5Mb2FkIHx8IGlzTG9hZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbnZhciBndWlkID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBzNCgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXG4gICAgICAgICAgICAudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgICAgICAgICBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xuICAgIH07XG59KSgpO1xuXG52YXIgbGlzdGVuZXJzID0gW107XG52YXIgc3RhdGU7XG52YXIgc2V0dGluZ3M7XG52YXIgdXRtZSA9IHtcbiAgICBzdGF0ZTogc3RhdGUsXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2NlbmFyaW8gPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3V0bWVfc2NlbmFyaW8nKTtcbiAgICAgICAgcmV0dXJuIHV0bWUubG9hZFNldHRpbmdzKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHV0bWUuc3RhdGUgPSB1dG1lLmxvYWRTdGF0ZUZyb21TdG9yYWdlKCk7XG4gICAgICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0lOSVRJQUxJWkVEJyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnRlc3RTZXJ2ZXIgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoXCJ1dG1lX3Rlc3Rfc2VydmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5hdXRvUnVuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcnVuQ29uZmlnID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3J1bl9jb25maWcnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJ1bkNvbmZpZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuQ29uZmlnID0gSlNPTi5wYXJzZShydW5Db25maWcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJ1bkNvbmZpZyA9IHJ1bkNvbmZpZyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwZWVkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3J1bl9zcGVlZCcpIHx8IHNldHRpbmdzLmdldChcInJ1bm5lci5zcGVlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNwZWVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5Db25maWcuc3BlZWQgPSBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHV0bWUucnVuU2NlbmFyaW8oc2NlbmFyaW8sIHJ1bkNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gdXRtZS5zdGF0ZSA9IHV0bWUubG9hZFN0YXRlRnJvbVN0b3JhZ2UoKTtcbiAgICAgICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnSU5JVElBTElaRUQnKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc3RhdHVzID09PSBcIlBMQVlJTkdcIikge1xuICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzdGF0ZS5ydW4uc2NlbmFyaW8sIHN0YXRlLnJ1bi5zdGVwSW5kZXgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN0YXRlLnN0YXR1cyB8fCBzdGF0ZS5zdGF0dXMgPT09ICdJTklUSUFMSVpJTkcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiTE9BREVEXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGJyb2FkY2FzdDogZnVuY3Rpb24gKGV2dCwgZXZ0RGF0YSkge1xuICAgICAgICBpZiAobGlzdGVuZXJzICYmIGxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzW2ldKGV2dCwgZXZ0RGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN0YXJ0UmVjb3JkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgIT0gJ1JFQ09SRElORycpIHtcbiAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9ICdSRUNPUkRJTkcnO1xuICAgICAgICAgICAgc3RhdGUuc3RlcHMgPSBbXTtcbiAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0YXJ0ZWRcIik7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUQVJURUQnKTtcblxuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcnVuU2NlbmFyaW86IGZ1bmN0aW9uIChuYW1lLCBjb25maWcpIHtcbiAgICAgICAgdmFyIHRvUnVuID0gbmFtZSB8fCBwcm9tcHQoJ1NjZW5hcmlvIHRvIHJ1bicpO1xuICAgICAgICB2YXIgYXV0b1J1biA9ICFuYW1lID8gcHJvbXB0KCdXb3VsZCB5b3UgbGlrZSB0byBzdGVwIHRocm91Z2ggZWFjaCBzdGVwICh5fG4pPycpICE9ICd5JyA6IHRydWU7XG4gICAgICAgIHJldHVybiBnZXRTY2VuYXJpbyh0b1J1bikudGhlbihmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgIHNjZW5hcmlvID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzY2VuYXJpbykpO1xuICAgICAgICAgICAgdXRtZS5zdGF0ZS5ydW4gPSBfLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgc3BlZWQ6IChzZXR0aW5ncyAmJiBzZXR0aW5ncy5nZXQoXCJydW5uZXIuc3BlZWRcIikpIHx8IFwiMTBcIlxuICAgICAgICAgICAgfSwgY29uZmlnKTtcblxuICAgICAgICAgICAgc2V0dXBDb25kaXRpb25zKHNjZW5hcmlvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hdXRvUnVuID0gYXV0b1J1biA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIlBMQVlJTkdcIjtcblxuICAgICAgICAgICAgICAgIHNjZW5hcmlvLnN0ZXBzID0gZmlsdGVyRXh0cmFMb2FkcyhzY2VuYXJpby5zdGVwcyk7XG5cbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0YXJ0aW5nIFNjZW5hcmlvICdcIiArIG5hbWUgKyBcIidcIiwgc2NlbmFyaW8pO1xuICAgICAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdQTEFZQkFDS19TVEFSVEVEJyk7XG5cbiAgICAgICAgICAgICAgICBydW5TdGVwKHNjZW5hcmlvLCAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHJ1bk5leHRTdGVwOiBydW5OZXh0U3RlcCxcbiAgICBzdG9wU2NlbmFyaW86IGZ1bmN0aW9uIChzdWNjZXNzKSB7XG4gICAgICAgIHZhciBzY2VuYXJpbyA9IHN0YXRlLnJ1biAmJiBzdGF0ZS5ydW4uc2NlbmFyaW87XG4gICAgICAgIGRlbGV0ZSBzdGF0ZS5ydW47XG4gICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiTE9BREVEXCI7XG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdQTEFZQkFDS19TVE9QUEVEJyk7XG5cbiAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBTY2VuYXJpb1wiKTtcbiAgICAgICAgaWYgKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0U3VjY2VzcyhcIltTVUNDRVNTXSBTY2VuYXJpbyAnXCIgKyBzY2VuYXJpby5uYW1lICsgXCInIENvbXBsZXRlZCFcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiU3RvcHBpbmcgb24gcGFnZSBcIiArIHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydEVycm9yKFwiW0ZBSUxVUkVdIFNjZW5hcmlvICdcIiArIHNjZW5hcmlvLm5hbWUgKyBcIicgU3RvcHBlZCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHRlbXBvcmFyeSBlbGVtZW50IGxvY2F0b3IsIGZvciB1c2Ugd2l0aCBmaW5hbGl6ZUxvY2F0b3JcbiAgICAgKi9cbiAgICBjcmVhdGVFbGVtZW50TG9jYXRvcjogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHVuaXF1ZUlkID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXVuaXF1ZS1pZFwiKSB8fCBndWlkKCk7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKFwiZGF0YS11bmlxdWUtaWRcIiwgdW5pcXVlSWQpO1xuXG4gICAgICAgIHZhciBlbGVIdG1sID0gZWxlbWVudC5jbG9uZU5vZGUoKS5vdXRlckhUTUw7XG4gICAgICAgIHZhciBlbGVTZWxlY3RvcnMgPSBbXTtcbiAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09ICdCT0RZJyB8fCBlbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PSAnSFRNTCcpIHtcbiAgICAgICAgICAgIGVsZVNlbGVjdG9ycyA9IFtlbGVtZW50LnRhZ05hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlU2VsZWN0b3JzID0gc2VsZWN0b3JGaW5kZXIoZWxlbWVudCwgZG9jdW1lbnQuYm9keSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHVuaXF1ZUlkOiB1bmlxdWVJZCxcbiAgICAgICAgICAgIHNlbGVjdG9yczogZWxlU2VsZWN0b3JzXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIHJlZ2lzdGVyRXZlbnQ6IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEsIGlkeCkge1xuICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpIHx8IHV0bWUuaXNWYWxpZGF0aW5nKCkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaWR4ID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5zdGVwc1tpZHhdID0ge1xuICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogZXZlbnROYW1lLFxuICAgICAgICAgICAgICAgIHRpbWVTdGFtcDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdFVkVOVF9SRUdJU1RFUkVEJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydExvZzogZnVuY3Rpb24gKGxvZywgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLmxvZyhsb2csIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0RXJyb3I6IGZ1bmN0aW9uIChlcnJvciwgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLmVycm9yKGVycm9yLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydFN1Y2Nlc3M6IGZ1bmN0aW9uIChtZXNzYWdlLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0uc3VjY2VzcyhtZXNzYWdlLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlZ2lzdGVyTGlzdGVuZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGxpc3RlbmVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJTYXZlSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgc2F2ZUhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclJlcG9ydEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHJlcG9ydEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlckxvYWRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBsb2FkSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyU2V0dGluZ3NMb2FkSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgc2V0dGluZ3NMb2FkSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIGlzUmVjb3JkaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJSRUNPUkRJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBpc1BsYXlpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlBMQVlJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBpc1ZhbGlkYXRpbmc6IGZ1bmN0aW9uKHZhbGlkYXRpbmcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWxpZGF0aW5nICE9PSAndW5kZWZpbmVkJyAmJiAodXRtZS5pc1JlY29yZGluZygpIHx8IHV0bWUuaXNWYWxpZGF0aW5nKCkpKSB7XG4gICAgICAgICAgICB1dG1lLnN0YXRlLnN0YXR1cyA9IHZhbGlkYXRpbmcgPyBcIlZBTElEQVRJTkdcIiA6IFwiUkVDT1JESU5HXCI7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnVkFMSURBVElPTl9DSEFOR0VEJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJWQUxJREFUSU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgc3RvcFJlY29yZGluZzogZnVuY3Rpb24gKGluZm8pIHtcbiAgICAgICAgaWYgKGluZm8gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB2YXIgbmV3U2NlbmFyaW8gPSB7XG4gICAgICAgICAgICAgICAgc3RlcHM6IHN0YXRlLnN0ZXBzXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBfLmV4dGVuZChuZXdTY2VuYXJpbywgaW5mbyk7XG5cbiAgICAgICAgICAgIGlmICghbmV3U2NlbmFyaW8ubmFtZSkge1xuICAgICAgICAgICAgICAgIG5ld1NjZW5hcmlvLm5hbWUgPSBwcm9tcHQoJ0VudGVyIHNjZW5hcmlvIG5hbWUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG5ld1NjZW5hcmlvLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zY2VuYXJpb3MucHVzaChuZXdTY2VuYXJpbyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc2F2ZUhhbmRsZXJzICYmIHNhdmVIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzYXZlSGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVIYW5kbGVyc1tpXShuZXdTY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5zdGF0dXMgPSAnTE9BREVEJztcblxuICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUT1BQRUQnKTtcblxuICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlJlY29yZGluZyBTdG9wcGVkXCIsIG5ld1NjZW5hcmlvKTtcbiAgICB9LFxuXG4gICAgbG9hZFNldHRpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldHRpbmdzID0gdXRtZS5zZXR0aW5ncyA9IG5ldyBTZXR0aW5ncyh7XG4gICAgICAgICAgXCJydW5uZXIuc3BlZWRcIjogXCJyZWFsdGltZVwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2V0dGluZ3NMb2FkSGFuZGxlcnMubGVuZ3RoID4gMCAmJiAhZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3NjZW5hcmlvJykpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3NMb2FkSGFuZGxlcnNbMF0oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3Muc2V0RGVmYXVsdHMocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxvYWRTdGF0ZUZyb21TdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1dG1lU3RhdGVTdHIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndXRtZScpO1xuICAgICAgICBpZiAodXRtZVN0YXRlU3RyKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEpTT04ucGFyc2UodXRtZVN0YXRlU3RyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlID0ge1xuICAgICAgICAgICAgICAgIHN0YXR1czogXCJJTklUSUFMSVpJTkdcIixcbiAgICAgICAgICAgICAgICBzY2VuYXJpb3M6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9LFxuXG4gICAgc2F2ZVN0YXRlVG9TdG9yYWdlOiBmdW5jdGlvbiAodXRtZVN0YXRlKSB7XG4gICAgICAgIGlmICh1dG1lU3RhdGUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd1dG1lJywgSlNPTi5zdHJpbmdpZnkodXRtZVN0YXRlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgndXRtZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVubG9hZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB1dG1lLnNhdmVTdGF0ZVRvU3RvcmFnZShzdGF0ZSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gdG9nZ2xlSGlnaGxpZ2h0KGVsZSwgdmFsdWUpIHtcbiAgICAkKGVsZSkudG9nZ2xlQ2xhc3MoJ3V0bWUtdmVyaWZ5JywgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiB0b2dnbGVSZWFkeShlbGUsIHZhbHVlKSB7XG4gICAgJChlbGUpLnRvZ2dsZUNsYXNzKCd1dG1lLXJlYWR5JywgdmFsdWUpO1xufVxuXG4vKipcbiAqIElmIHlvdSBjbGljayBvbiBhIHNwYW4gaW4gYSBsYWJlbCwgdGhlIHNwYW4gd2lsbCBjbGljayxcbiAqIHRoZW4gdGhlIGJyb3dzZXIgd2lsbCBmaXJlIHRoZSBjbGljayBldmVudCBmb3IgdGhlIGlucHV0IGNvbnRhaW5lZCB3aXRoaW4gdGhlIHNwYW4sXG4gKiBTbywgd2Ugb25seSB3YW50IHRvIHRyYWNrIHRoZSBpbnB1dCBjbGlja3MuXG4gKi9cbmZ1bmN0aW9uIGlzTm90SW5MYWJlbE9yVmFsaWQoZWxlKSB7XG4gICAgcmV0dXJuICQoZWxlKS5wYXJlbnRzKCdsYWJlbCcpLmxlbmd0aCA9PSAwIHx8XG4gICAgICAgICAgZWxlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ2lucHV0Jztcbn1cblxudmFyIHRpbWVycyA9IFtdO1xuXG5mdW5jdGlvbiBpbml0RXZlbnRIYW5kbGVycygpIHtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRzW2ldLCAoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNldHRpbmcgPSBzZXR0aW5ncy5nZXQoXCJyZWNvcmRlci5ldmVudHMuXCIgKyBldnQpO1xuICAgICAgICAgICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgKHNldHRpbmcgPT09IHRydWUgfHwgc2V0dGluZyA9PT0gJ3RydWUnIHx8IHR5cGVvZiBzZXR0aW5nID09PSAndW5kZWZpbmVkJykgJiZcbiAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuaGFzQXR0cmlidXRlICYmXG4gICAgICAgICAgICAgICAgICAgICFlLnRhcmdldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykgJiZcbiAgICAgICAgICAgICAgICAgICAgJChlLnRhcmdldCkucGFyZW50cyhcIltkYXRhLWlnbm9yZV1cIikubGVuZ3RoID09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgaXNOb3RJbkxhYmVsT3JWYWxpZChlLnRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdGltZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCB8fCBlLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLmJ1dHRvbiA9IGUud2hpY2ggfHwgZS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnbW91c2VvdmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlLnRhcmdldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVyOiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWFkeShlLnRhcmdldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdtb3VzZW91dCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aW1lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lcnNbaV0uZWxlbWVudCA9PSBlLnRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcnNbaV0udGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlYWR5KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnZhbHVlID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KGV2dCwgYXJncywgaWR4KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbZXZ0XSA9IGhhbmRsZXI7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgICAgfSkoZXZlbnRzW2ldKSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgdmFyIF90b19hc2NpaSA9IHtcbiAgICAgICAgJzE4OCc6ICc0NCcsXG4gICAgICAgICcxODknOiAnNDUnLFxuICAgICAgICAnMTkwJzogJzQ2JyxcbiAgICAgICAgJzE5MSc6ICc0NycsXG4gICAgICAgICcxOTInOiAnOTYnLFxuICAgICAgICAnMjIwJzogJzkyJyxcbiAgICAgICAgJzIyMic6ICczOScsXG4gICAgICAgICcyMjEnOiAnOTMnLFxuICAgICAgICAnMjE5JzogJzkxJyxcbiAgICAgICAgJzE3Myc6ICc0NScsXG4gICAgICAgICcxODcnOiAnNjEnLCAvL0lFIEtleSBjb2Rlc1xuICAgICAgICAnMTg2JzogJzU5J1xuICAgIH07XG5cbiAgICB2YXIgc2hpZnRVcHMgPSB7XG4gICAgICAgIFwiOTZcIjogXCJ+XCIsXG4gICAgICAgIFwiNDlcIjogXCIhXCIsXG4gICAgICAgIFwiNTBcIjogXCJAXCIsXG4gICAgICAgIFwiNTFcIjogXCIjXCIsXG4gICAgICAgIFwiNTJcIjogXCIkXCIsXG4gICAgICAgIFwiNTNcIjogXCIlXCIsXG4gICAgICAgIFwiNTRcIjogXCJeXCIsXG4gICAgICAgIFwiNTVcIjogXCImXCIsXG4gICAgICAgIFwiNTZcIjogXCIqXCIsXG4gICAgICAgIFwiNTdcIjogXCIoXCIsXG4gICAgICAgIFwiNDhcIjogXCIpXCIsXG4gICAgICAgIFwiNDVcIjogXCJfXCIsXG4gICAgICAgIFwiNjFcIjogXCIrXCIsXG4gICAgICAgIFwiOTFcIjogXCJ7XCIsXG4gICAgICAgIFwiOTNcIjogXCJ9XCIsXG4gICAgICAgIFwiOTJcIjogXCJ8XCIsXG4gICAgICAgIFwiNTlcIjogXCI6XCIsXG4gICAgICAgIFwiMzlcIjogXCJcXFwiXCIsXG4gICAgICAgIFwiNDRcIjogXCI8XCIsXG4gICAgICAgIFwiNDZcIjogXCI+XCIsXG4gICAgICAgIFwiNDdcIjogXCI/XCJcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24ga2V5UHJlc3NIYW5kbGVyIChlKSB7XG4gICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAodXRtZS5pc1JlY29yZGluZygpICYmIGUudGFyZ2V0Lmhhc0F0dHJpYnV0ZSAmJiAhZS50YXJnZXQuaGFzQXR0cmlidXRlKCdkYXRhLWlnbm9yZScpICYmICQoZS50YXJnZXQpLnBhcmVudHMoXCJbZGF0YS1pZ25vcmVdXCIpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICB2YXIgYyA9IGUud2hpY2g7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IERvZXNuJ3Qgd29yayB3aXRoIGNhcHMgbG9ja1xuICAgICAgICAgICAgLy9ub3JtYWxpemUga2V5Q29kZVxuICAgICAgICAgICAgaWYgKF90b19hc2NpaS5oYXNPd25Qcm9wZXJ0eShjKSkge1xuICAgICAgICAgICAgICAgIGMgPSBfdG9fYXNjaWlbY107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZS5zaGlmdEtleSAmJiAoYyA+PSA2NSAmJiBjIDw9IDkwKSkge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgKyAzMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgc2hpZnRVcHMuaGFzT3duUHJvcGVydHkoYykpIHtcbiAgICAgICAgICAgICAgICAvL2dldCBzaGlmdGVkIGtleUNvZGUgdmFsdWVcbiAgICAgICAgICAgICAgICBjID0gc2hpZnRVcHNbY107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoJ2tleXByZXNzJywge1xuICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpLFxuICAgICAgICAgICAgICAgIGtleTogYyxcbiAgICAgICAgICAgICAgICBwcmV2VmFsdWU6IGUudGFyZ2V0LnZhbHVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlLnRhcmdldC52YWx1ZSArIGMsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywga2V5UHJlc3NIYW5kbGVyLCB0cnVlKTtcblxuICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAodXRtZS5ldmVudExpc3RlbmVycyA9IHV0bWUuZXZlbnRMaXN0ZW5lcnMgfHwge30pWydrZXlwcmVzcyddID0ga2V5UHJlc3NIYW5kbGVyO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG5cbmZ1bmN0aW9uIGJvb3RzdHJhcFV0bWUoKSB7XG4gIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09IFwiY29tcGxldGVcIikge1xuICAgIHV0bWUuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGluaXRFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSkge1xuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5ib290c3RyYXBVdG1lKCk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgYm9vdHN0cmFwVXRtZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdXRtZS51bmxvYWQoKTtcbn0sIHRydWUpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdXRtZS5yZXBvcnRMb2coXCJTY3JpcHQgRXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UgKyBcIjpcIiArIGVyci51cmwgKyBcIixcIiArIGVyci5saW5lICsgXCI6XCIgKyBlcnIuY29sKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNWMGJXVXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOW9iMjFsTDJSaGRtbGtkR2wwZEhOM2IzSjBhQzl3Y205cVpXTjBjeTkxZEcxbEwzTnlZeTlxY3k5MWRHMWxMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzUTBGQlF5eEhRVUZITEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRCUVVNelFpeEpRVUZKTEU5QlFVOHNSMEZCUnl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETzBGQlF6ZERMRWxCUVVrc1VVRkJVU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXp0QlFVTnlReXhKUVVGSkxHTkJRV01zUjBGQlJ5eFBRVUZQTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6dEJRVU5xUkN4SlFVRkpMRkZCUVZFc1IwRkJSeXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdPMEZCUlhKRExHZEVRVUZuUkR0QlFVTm9SQ3hKUVVGSkxHMUNRVUZ0UWl4SFFVRkhMRWRCUVVjc1EwRkJRenRCUVVNNVFpeEpRVUZKTEZsQlFWa3NSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRkRUlzU1VGQlNTeGpRVUZqTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTNoQ0xFbEJRVWtzV1VGQldTeEhRVUZITEVWQlFVVXNRMEZCUXp0QlFVTjBRaXhKUVVGSkxHOUNRVUZ2UWl4SFFVRkhMRVZCUVVVc1EwRkJRenM3UVVGRk9VSXNVMEZCVXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hGUVVGRk8wbEJRM1pDTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrc1dVRkJXU3hEUVVGRExFMUJRVTBzUzBGQlN5eERRVUZETEVWQlFVVTdXVUZETTBJc1NVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRemRETEVsQlFVa3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEV0QlFVc3NTVUZCU1N4RlFVRkZPMjlDUVVOc1F5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJsQ1FVTXZRanRoUVVOS08xTkJRMG9zVFVGQlRUdFpRVU5JTEZsQlFWa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVTdaMEpCUTJ4RExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnFRaXhEUVVGRExFTkJRVU03VTBGRFRqdExRVU5LTEVOQlFVTXNRMEZCUXp0RFFVTk9PMEZCUTBRc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eERRVUZET3p0QlFVVjJRaXhKUVVGSkxFMUJRVTBzUjBGQlJ6dEpRVU5VTEU5QlFVODdTVUZEVUN4UFFVRlBPMGxCUTFBc1RVRkJUVHRCUVVOV0xFbEJRVWtzVlVGQlZUdEJRVU5rTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkJSVUVzU1VGQlNTeFhRVUZYT3p0SlFVVllMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVlVGQlZUdEpRVU5XTEZkQlFWYzdTVUZEV0N4VFFVRlRPMEZCUTJJc1NVRkJTU3hSUVVGUk8wRkJRMW83TzBGQlJVRXNRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWVVGQllTeERRVUZETEZGQlFWRXNSVUZCUlN4aFFVRmhMRVZCUVVVN1JVRkRPVU1zU1VGQlNTeExRVUZMTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhEUVVGRE8wRkJRM1JETEVWQlFVVXNTVUZCU1N4VFFVRlRMRWRCUVVjc1MwRkJTeXhKUVVGSkxFdEJRVXNzUTBGQlF5eFRRVUZUTEVOQlFVTTdPMFZCUlhwRExFbEJRVWtzVTBGQlV5eEZRVUZGTzBsQlEySXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RlFVRkZMRlZCUVZVc1dVRkJXU3hGUVVGRk8wMUJRekZFTEU5QlFVOHNWMEZCVnl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEdGQlFXRXNSVUZCUlR0UlFVTTNSQ3hoUVVGaExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHRkJRV0VzUTBGQlF5eERRVUZETEVOQlFVTTdVVUZETVVRc1QwRkJUeXhsUVVGbExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmxCUVZrN1ZVRkRja1FzU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMVZCUTJ4Q0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhoUVVGaExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRaUVVOdVJDeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMR0ZCUVdFc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0WFFVTjJRenRWUVVORUxFOUJRVThzVVVGQlVTeERRVUZETzFOQlEycENMRU5CUVVNc1EwRkJRenRQUVVOS0xFTkJRVU1zUTBGQlF6dExRVU5LTEVOQlFVTXNRMEZCUXl4RFFVRkRPMGRCUTB3c1RVRkJUVHRKUVVOTUxFOUJRVThzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJRenRIUVVNMVFqdEJRVU5JTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhuUWtGQlowSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRia01zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8wRkJRekZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhwUWtGQmFVSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRjRU1zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRelZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXgzUWtGQmQwSXNRMEZCUXl4TFFVRkxMRVZCUVVVN1NVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMGxCUTJ4Q0xFbEJRVWtzWjBKQlFXZENMRU5CUVVNN1NVRkRja0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRia01zU1VGQlNTeFRRVUZUTEVkQlFVY3NTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xRkJRM3BDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRaUVVOUUxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOdVF5eEpRVUZKTEVsQlFVa3NSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEzaENMRWxCUVVrc1NVRkJTU3hIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU03WjBKQlEzQkZMR2RDUVVGblFpeEpRVUZKTEVsQlFVa3NRMEZCUXp0blFrRkRla0lzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhuUWtGQlowSXNRMEZCUXp0aFFVTTNRenRUUVVOS0xFMUJRVTA3V1VGRFNDeG5Ra0ZCWjBJc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNVMEZCVXl4RFFVRkRPMU5CUXpkRE8xRkJRMFFzVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UzBGRGVrTTdTVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJRenRCUVVOd1FpeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5vUXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU03U1VGRGJFSXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRE8xRkJRMllzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRE8xRkJRekZDTEdsQ1FVRnBRaXhEUVVGRExGRkJRVkVzUTBGQlF6dExRVU01UWl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzVlVGQlZTeEZRVUZGTzFGQlF6RkNMRWxCUVVrc1UwRkJVeXhIUVVGSExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGRFVXNVVUZCVVN4RFFVRkRMRXRCUVVzc1IwRkJSeXgzUWtGQmQwSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRMUVVONFJDeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVDBGQlR5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRk8wbEJRM0JETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU03UVVGRGJrTXNTVUZCU1N4TlFVRk5MRWRCUVVjc1RVRkJUU3hKUVVGSkxFVkJRVVVzUTBGQlF6czdTVUZGZEVJc1NVRkJTU3hKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRKUVVNdlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRE8wbEJRM1pDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVTBGQlV5eEZRVUZGTzFGQlEyNURMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXp0UlFVTTVRaXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNSMEZCUnl4SFFVRkhMRU5CUVVNN1VVRkRNVUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVNeFFpeEpRVUZKTEZkQlFWY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTnlSU3hKUVVGSkxFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhOUVVGTkxFTkJRVU03UVVGRE9VTXNXVUZCV1N4SlFVRkpMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNN08xbEJSVGxDTEVsQlFVa3NUVUZCVFN4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFMUJRVTBzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRMMElzVFVGQlRTeEhRVUZITEVkQlFVY3NSMEZCUnl4TlFVRk5MRU5CUVVNN1lVRkRla0k3V1VGRFJDeEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExFMUJRVTBzVDBGQlR5eFhRVUZYTEVkQlFVY3NUVUZCVFN4RFFVRkRMRU5CUVVNN1FVRkRjRWdzV1VGQldTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFZEJRVWNzU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPenRaUVVWeVJDeFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzVVVGQlVTeERRVUZETEVsQlFVa3NSMEZCUnl4UlFVRlJMRU5CUVVNc1RVRkJUU3hGUVVGRkxFTkJRVU03UVVGREwwVXNXVUZCV1N4UFFVRlBMRU5CUVVNc1IwRkJSeXhGUVVGRkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNN1FVRkRPVVk3UVVGRFFUczdXVUZGV1N4SlFVRkpMRk5CUVZNc1JVRkJSVHRuUWtGRFdDeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTFCUVUwc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dEJRVU0zUXl4aFFVRmhPenRUUVVWS0xFMUJRVTBzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRk5CUVZNc1JVRkJSVHRaUVVOd1F5eEpRVUZKTEV0QlFVc3NRMEZCUXl4UFFVRlBMRVZCUVVVN1owSkJRMllzVjBGQlZ5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1lVRkRlRVE3VTBGRFNpeE5RVUZOTzFsQlEwZ3NTVUZCU1N4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTTdXVUZEYUVNc1NVRkJTU3hMUVVGTExFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXp0QlFVTjJReXhaUVVGWkxFbEJRVWtzVVVGQlVTeEhRVUZITEcxQ1FVRnRRaXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzBGQlEzSkVPenRaUVVWWkxFbEJRVWtzVDBGQlR5eE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrc1YwRkJWeXhKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRXRCUVVzc1NVRkJTU3hWUVVGVkxFVkJRVVU3WTBGRGFFWXNTVUZCU1N4SlFVRkpMRU5CUVVNN1kwRkRWQ3hKUVVGSkxFMUJRVTBzUjBGQlJ5eExRVUZMTEVOQlFVTTdZMEZEYmtJc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eExRVUZMTEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzUjBGQlJ5eEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNelF5eEpRVUZKTEZOQlFWTXNSMEZCUnl4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEzcENMRWxCUVVrc1lVRkJZU3hIUVVGSExHMUNRVUZ0UWl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE8yZENRVU51UkN4SlFVRkpMRkZCUVZFc1MwRkJTeXhoUVVGaExFVkJRVVU3YTBKQlF6bENMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVU3YzBKQlExQXNTVUZCU1N4SlFVRkpMRk5CUVZNc1EwRkJReXhUUVVGVExFZEJRVWNzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4RFFVRkRPM05DUVVNNVF5eE5RVUZOTEVkQlFVY3NRMEZCUXl4bFFVRmxMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVWtzU1VGQlNTeEhRVUZITEcxQ1FVRnRRaXhEUVVGRE8yMUNRVU4wUlN4TlFVRk5MRWxCUVVrc2FVSkJRV2xDTEVOQlFVTXNVMEZCVXl4RFFVRkRMRVZCUVVVN2MwSkJRM0pETEUxQlFVMHNSMEZCUnl4TFFVRkxMRU5CUVVNN2MwSkJRMllzVFVGQlRUdHRRa0ZEVkR0cFFrRkRSanRCUVVOcVFpeGxRVUZsT3p0alFVVkVMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eE5RVUZOTEVOQlFVTTdRVUZEZUVNc1lVRkJZVHRCUVVOaU96dFpRVVZaTEVsQlFVa3NUVUZCVFN4RFFVRkRMRzFDUVVGdFFpeERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRVZCUVVVN1owSkJRMjVETEZkQlFWY3NRMEZCUXl4UlFVRlJMRVZCUVVVc1IwRkJSeXhGUVVGRkxFMUJRVTBzUTBGQlF5eERRVUZETzJGQlEzUkRMRTFCUVUwN1FVRkRia0lzWjBKQlFXZENMR0ZCUVdFc1EwRkJReXhSUVVGUkxFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNSVUZCUlN4VlFVRlZMRU5CUVVNc1VVRkJVU3hGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1NVRkJTU3hGUVVGRk96dHJRa0ZGY2tZc1NVRkJTU3hIUVVGSExFZEJRVWNzU1VGQlNTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMnRDUVVOc1FpeEpRVUZKTEU5QlFVOHNSMEZCUnl4SFFVRkhMRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUlVGQlJTeERRVUZETzBGQlF6RkVMR3RDUVVGclFpeEpRVUZKTEd0Q1FVRnJRaXhIUVVGSExFOUJRVThzUzBGQlN5eFBRVUZQTEVsQlFVa3NUMEZCVHl4TFFVRkxMRlZCUVZVc1NVRkJTU3hIUVVGSExFTkJRVU1zV1VGQldTeERRVUZETEdsQ1FVRnBRaXhEUVVGRExFTkJRVU03TzJ0Q1FVVTVSeXhKUVVGSkxFMUJRVTBzUTBGQlF5eFBRVUZQTEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFTkJRVU1zUlVGQlJUdHZRa0ZEZGtNc1NVRkJTU3hQUVVGUExFZEJRVWNzUlVGQlJTeERRVUZETzI5Q1FVTnFRaXhKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RlFVRkZPM05DUVVOd1FpeFBRVUZQTEVOQlFVTXNTMEZCU3l4SFFVRkhMRTlCUVU4c1EwRkJReXhOUVVGTkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRU5CUVVNN1FVRkRlRVVzY1VKQlFYRkNPMEZCUTNKQ096dHZRa0ZGYjBJc1NVRkJTU3hKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEU5QlFVOHNSVUZCUlR0elFrRkROMElzUTBGQlF5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dHhRa0ZEZWtJc1RVRkJUU3hKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4UFFVRlBMRWxCUVVrc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeE5RVUZOTEV0QlFVc3NSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJUdHpRa0ZEZWtZc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNSVUZCUlN4RFFVRkRPM0ZDUVVOMlFpeE5RVUZOTzNOQ1FVTk1MRkZCUVZFc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8wRkJRemRFTEhGQ1FVRnhRanM3YjBKQlJVUXNTVUZCU1N4UFFVRlBMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUzBGQlN5eEpRVUZKTEZkQlFWY3NSVUZCUlR0QlFVTXZSQ3h6UWtGQmMwSXNSMEZCUnl4RFFVRkRMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXpzN2MwSkJSVFZDTEVsQlFVa3NhMEpCUVd0Q0xFVkJRVVU3ZDBKQlEzUkNMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTEU5QlFVOHNRMEZCUXl4RFFVRkRPM1ZDUVVNNVFqdHpRa0ZEUkN4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUlVGQlJTeFJRVUZSTEVOQlFVTXNRMEZCUXp0eFFrRkRMMEk3UVVGRGNrSXNiVUpCUVcxQ096dHJRa0ZGUkN4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZTeEZRVUZGTzI5Q1FVTm9ReXhKUVVGSkxFZEJRVWNzUjBGQlJ5eE5RVUZOTEVOQlFVTXNXVUZCV1N4RFFVRkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdiMEpCUTJwRUxGRkJRVkVzUTBGQlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJReTlETEc5Q1FVRnZRaXhSUVVGUkxFTkJRVU1zVVVGQlVTeERRVUZETEVkQlFVY3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenM3YjBKQlJUVkNMRWRCUVVjc1EwRkJReXhMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNN1FVRkRhRVFzYjBKQlFXOUNMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4RFFVRkRPenR2UWtGRk9VSXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJReXhIUVVGSExFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTTdiMEpCUTNwQ0xFbEJRVWtzYTBKQlFXdENMRVZCUVVVN2QwSkJRM0JDTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzNGQ1FVTm9RenRCUVVOeVFpeHRRa0ZCYlVJN08ydENRVVZFTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hWUVVGVkxFVkJRVVU3YjBKQlEyaERMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zV1VGQldTeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEd0Q1FVRnJRaXhKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNTVUZCU1N4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRE8wRkJRMjVKTEcxQ1FVRnRRanM3YTBKQlJVUXNTVUZCU1N4TFFVRkxMRU5CUVVNc1QwRkJUeXhGUVVGRk8yOUNRVU5xUWl4WFFVRlhMRU5CUVVNc1VVRkJVU3hGUVVGRkxFZEJRVWNzUlVGQlJTeE5RVUZOTEVOQlFVTXNRMEZCUXp0dFFrRkRjRU03YVVKQlEwWXNSVUZCUlN4VlFVRlZMRTFCUVUwc1JVRkJSVHR2UWtGRGFrSXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlVzUlVGQlJUdHpRa0ZEYUVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eFpRVUZaTEVkQlFVY3NUVUZCVFN4RFFVRkRMRU5CUVVNN2MwSkJRM1JETEVsQlFVa3NRMEZCUXl4WlFVRlpMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03Y1VKQlF6RkNMRTFCUVUwc1NVRkJTU3hsUVVGbExFTkJRVU1zU1VGQlNTeERRVUZETEVWQlFVVTdkMEpCUXpsQ0xFbEJRVWtzUTBGQlF5eFhRVUZYTEVOQlFVTXNhMEpCUVd0Q0xFZEJRVWNzUjBGQlJ5eEhRVUZITEZkQlFWY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhIUVVGSExGZEJRVmNzUjBGQlJ5eE5RVUZOTEVOQlFVTXNRMEZCUXp0M1FrRkRha2NzU1VGQlNTeERRVUZETEZsQlFWa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJRenR4UWtGRE5VSXNUVUZCVFR0elFrRkRUQ3hKUVVGSkxGRkJRVkVzUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RFFVRkRMRVZCUVVVN2QwSkJRek5DTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU03ZFVKQlEzaENPM05DUVVORUxFbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVOHNSVUZCUlR0M1FrRkRha0lzVjBGQlZ5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU03ZFVKQlEzQkRPM0ZDUVVOR08ybENRVU5LTEVOQlFVTXNRMEZCUXp0aFFVTk9PMU5CUTBvN1MwRkRTanRCUVVOTUxFTkJRVU03TzBGQlJVUXNVMEZCVXl4alFVRmpMRU5CUVVNc1dVRkJXU3hGUVVGRk8wbEJRMnhETEVsQlFVa3NSVUZCUlN4SFFVRkhMRkZCUVZFc1EwRkJReXhoUVVGaExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdTVUZET1VNc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFZRVUZWTEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVN1VVRkRNVU1zU1VGQlNUdFpRVU5CTEVsQlFVa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhGUVVGRk8yZENRVU5xUWl4TlFVRk5MRWxCUVVrc1MwRkJTeXhEUVVGRExEQkRRVUV3UXl4RFFVRkRMRU5CUVVNN1lVRkRMMFE3V1VGRFJDeEpRVUZKTEU5QlFVOHNRMEZCUXl4alFVRmpMRVZCUVVVN1owSkJRM2hDTEU5QlFVOHNRMEZCUXl4alFVRmpMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU1zVlVGQlZTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMkZCUTJ4RUxFMUJRVTA3WjBKQlEwZ3NTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RlFVRkZMRVZCUVVVN2IwSkJRMnBETEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc1owSkJRV2RDTEVkQlFVY3NXVUZCV1N4SFFVRkhMRzlDUVVGdlFqdDNRa0ZEYkVVc2VVTkJRWGxETEVOQlFVTXNRMEZCUXp0cFFrRkRiRVE3WjBKQlEwUXNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRkxFTkJRVU1zUTBGQlF5eFJRVUZSTEVWQlFVVXNRMEZCUXl4SFFVRkhMRU5CUVVNc1ZVRkJWU3hEUVVGRE8yZENRVU01UXl3clFrRkJLMElzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXp0aFFVTTFRenRUUVVOS0xFTkJRVU1zVDBGQlR5eEhRVUZITEVWQlFVVTdXVUZEVml4TlFVRk5MRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03VTBGRFpqdExRVU5LTEVOQlFVTXNRMEZCUXp0QlFVTlFMRU5CUVVNN08wRkJSVVFzVTBGQlV5eGxRVUZsTEVOQlFVTXNTVUZCU1N4RlFVRkZPMGxCUXpOQ0xFOUJRVThzU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4WlFVRlpPMWRCUXpsQ0xFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NWVUZCVlR0WFFVTTFRaXhKUVVGSkxFTkJRVU1zVTBGQlV5eEpRVUZKTEZsQlFWazdWMEZET1VJc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFhRVUZYTzFkQlF6ZENMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVFVGQlRUdFhRVU40UWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxFOUJRVThzUTBGQlF6dEJRVU55UXl4RFFVRkRPenRCUVVWRU96dEhRVVZITzBGQlEwZ3NVMEZCVXl4cFFrRkJhVUlzUTBGQlF5eEpRVUZKTEVWQlFVVTdRVUZEYWtNc1NVRkJTU3hKUVVGSkxFZEJRVWNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRPMEZCUXpkQ08wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3U1VGRlNTeFBRVUZQTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzBGQlEzaEhMRU5CUVVNN08wRkJSVVFzVTBGQlV5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSU3hQUVVGUExFVkJRVVVzVDBGQlR5eEZRVUZGTEZkQlFWY3NSVUZCUlR0SlFVTnNSU3hKUVVGSkxFOUJRVThzUTBGQlF6dEpRVU5hTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRk5CUVZNc1QwRkJUeXhIUVVGSE8xbEJRMllzU1VGQlNTeERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRWaXhQUVVGUExFZEJRVWNzU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1EwRkJRenRCUVVNdlF5eGhRVUZoT3p0WlFVVkVMRWxCUVVrc1NVRkJTU3hEUVVGRE8xbEJRMVFzU1VGQlNTeFpRVUZaTEVkQlFVY3NTMEZCU3l4RFFVRkRPMWxCUTNwQ0xFbEJRVWtzVlVGQlZTeEhRVUZITEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhKUVVGSkxHdENRVUZyUWl4SFFVRkhMRXRCUVVzc1EwRkJRenRaUVVNdlFpeEpRVUZKTEdWQlFXVXNSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0WlFVTnFSQ3hKUVVGSkxGZEJRVmNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOcVF5eEpRVUZKTEZWQlFWVXNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzU1VGQlNTeFJRVUZSTEVOQlFVTTdXVUZEYkVRc1pVRkJaU3hEUVVGRExFOUJRVThzUTBGQlF5eHRRa0ZCYlVJc1IwRkJSeXhQUVVGUExFTkJRVU1zVVVGQlVTeEhRVUZITEVsQlFVa3NRMEZCUXl4RFFVRkRPMWxCUTNaRkxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhsUVVGbExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNM1F5eEpRVUZKTEZGQlFWRXNSMEZCUnl4bFFVRmxMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEyeERMRWxCUVVrc1pVRkJaU3hEUVVGRExFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTjJRaXhSUVVGUkxFbEJRVWtzVlVGQlZTeERRVUZETzJsQ1FVTXhRanRuUWtGRFJDeEpRVUZKTEVkQlFVY3NRMEZCUXl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE8yZENRVU51UWl4SlFVRkpMRWxCUVVrc1EwRkJReXhOUVVGTkxFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTnNRaXhKUVVGSkxFOUJRVThzVjBGQlZ5eEpRVUZKTEZkQlFWY3NSVUZCUlR0M1FrRkRia01zU1VGQlNTeFBRVUZQTEVkQlFVY3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRPM2RDUVVOb1F5eEpRVUZKTEVOQlFVTXNWVUZCVlN4TFFVRkxMRkZCUVZFc1NVRkJTU3hQUVVGUExFdEJRVXNzVjBGQlZ6czJRa0ZEYkVRc1ZVRkJWU3hMUVVGTExGVkJRVlVzU1VGQlNTeFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF5eEZRVUZGT3pSQ1FVTnNSU3hWUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZET3pSQ1FVTnNRaXhOUVVGTk8zbENRVU5VTEUxQlFVMDdORUpCUTBnc2EwSkJRV3RDTEVkQlFVY3NTVUZCU1N4RFFVRkRPM2xDUVVNM1FqdHhRa0ZEU2l4TlFVRk5PM2RDUVVOSUxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTTdkMEpCUTJ4Q0xFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNaMEpCUVdkQ0xFVkJRVVVzVDBGQlR5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPM2RDUVVNNVF5eE5RVUZOTzNGQ1FVTlVPMjlDUVVORUxFMUJRVTA3YVVKQlExUXNUVUZCVFN4SlFVRkpMRWxCUVVrc1EwRkJReXhOUVVGTkxFZEJRVWNzUTBGQlF5eEZRVUZGTzI5Q1FVTjRRaXhaUVVGWkxFZEJRVWNzU1VGQlNTeERRVUZETzJsQ1FVTjJRanRCUVVOcVFpeGhRVUZoT3p0WlFVVkVMRWxCUVVrc1ZVRkJWU3hGUVVGRk8yZENRVU5hTEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOcVFpeE5RVUZOTEVsQlFVa3NaVUZCWlN4RFFVRkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1IwRkJSeXhQUVVGUExFbEJRVWtzVDBGQlR5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRhRVlzVlVGQlZTeERRVUZETEU5QlFVOHNSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenRoUVVNelFpeE5RVUZOTzJkQ1FVTklMRWxCUVVrc1RVRkJUU3hIUVVGSExFVkJRVVVzUTBGQlF6dG5Ra0ZEYUVJc1NVRkJTU3haUVVGWkxFVkJRVVU3YjBKQlEyUXNUVUZCVFN4SFFVRkhMRzlFUVVGdlJDeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eEhRVUZITEdGQlFXRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhIUVVGSExHOURRVUZ2UXl4RFFVRkRPMmxDUVVNM1N5eE5RVUZOTEVsQlFVa3NhMEpCUVd0Q0xFVkJRVVU3YjBKQlF6TkNMRTFCUVUwc1IwRkJSeXh2UkVGQmIwUXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNSMEZCUnl4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUjBGQlJ5d3JRMEZCSzBNc1IwRkJSeXhYUVVGWExFZEJRVWNzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1IwRkJSeXhKUVVGSkxFTkJRVU03YVVKQlF6TlBMRTFCUVUwN2IwSkJRMGdzVFVGQlRTeEhRVUZITEc5RVFVRnZSQ3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhIUVVGSExHRkJRV0VzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SFFVRkhMRGhDUVVFNFFpeERRVUZETzJsQ1FVTjJTenRuUWtGRFJDeE5RVUZOTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1lVRkRiRUk3UVVGRFlpeFRRVUZUT3p0UlFVVkVMRWxCUVVrc1MwRkJTeXhIUVVGSExHMUNRVUZ0UWl4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NTVUZCU1N4VlFVRlZMRWRCUVVjc1IwRkJSeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8xRkJRM0JITEVsQlFVa3NUVUZCVFN4RFFVRkRMRTlCUVU4c1JVRkJSVHRaUVVOb1FpeGpRVUZqTEVOQlFVTXNWVUZCVlN4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGZEJRVmM3WTBGRGVrTXNTVUZCU1N4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eExRVUZMTEV0QlFVc3NWVUZCVlN4RlFVRkZPMnRDUVVOeVF5eFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8yVkJRMmhETEUxQlFVMHNTVUZCU1N4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eExRVUZMTEV0QlFVc3NVMEZCVXl4RlFVRkZPMnRDUVVNelF5eFBRVUZQTEVWQlFVVXNRMEZCUXp0bFFVTmlMRTFCUVUwN2EwSkJRMGdzVlVGQlZTeERRVUZETEU5QlFVOHNSVUZCUlN4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhMUVVGTExFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXp0bFFVTjRSVHRoUVVOR0xFTkJRVU1zUTBGQlF6dFRRVU5PTEUxQlFVMDdXVUZEU0N4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NTMEZCU3l4VlFVRlZMRVZCUVVVN1owSkJRM0pETEZWQlFWVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03WVVGRGFFTXNUVUZCVFN4SlFVRkpMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEV0QlFVc3NTMEZCU3l4VFFVRlRMRVZCUVVVN1owSkJRek5ETEU5QlFVOHNSVUZCUlN4RFFVRkRPMkZCUTJJc1RVRkJUVHRuUWtGRFNDeFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFdEJRVXNzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTNoRk8xTkJRMG83UzBGRFNpeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVlVGQlZTeERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVN1FVRkRia01zU1VGQlNTeEpRVUZKTEVkQlFVY3NSMEZCUnl4RFFVRkRMRVZCUVVVN1FVRkRha0k3TzFGQlJWRXNTVUZCU1N4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4VFFVRlRMRWxCUVVrc1ZVRkJWU3hGUVVGRk8xbEJRMnBFTEU5QlFVOHNRMEZCUXl4RFFVRkRPMU5CUTFvN1VVRkRSQ3hQUVVGUExGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1UwRkJVeXhIUVVGSExGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJReXhEUVVGRExGTkJRVk1zUTBGQlF6dExRVU0xUlR0SlFVTkVMRTlCUVU4c1EwRkJReXhEUVVGRE8wRkJRMklzUTBGQlF6czdRVUZGUkN4VFFVRlRMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNSVUZCUlN4UFFVRlBMRVZCUVVVN08wbEJSV3BFTEZWQlFWVXNRMEZCUXl4WFFVRlhPMUZCUTJ4Q0xFbEJRVWtzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRWxCUVVrc1IwRkJSeXhIUVVGSExFTkJRVU1zUTBGQlF5eEZRVUZGTzFsQlEyNURMRTlCUVU4c1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEhRVUZITEVOQlFVTXNSVUZCUlN4TlFVRk5MRU5CUVVNc1EwRkJRenRUUVVOMFF5eE5RVUZOTzFsQlEwZ3NTVUZCU1N4RFFVRkRMRmxCUVZrc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF6dFRRVU16UWp0TFFVTktMRVZCUVVVc1QwRkJUeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEzSkNMRU5CUVVNN08wRkJSVVFzVTBGQlV5eHJRa0ZCYTBJc1EwRkJReXhQUVVGUExFVkJRVVU3U1VGRGFrTXNTVUZCU1N4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExHRkJRV0VzUTBGQlF5eFZRVUZWTEVOQlFVTXNRMEZCUXp0QlFVTnNSQ3hKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVkQlFVY3NUMEZCVHl4RFFVRkRPenRKUVVWNlFpeFBRVUZQTEVsQlFVa3NRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRExFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZET1VNc1EwRkJRenM3UVVGRlJDeFRRVUZUTEcxQ1FVRnRRaXhEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU12UWl4UFFVRlBMRWxCUVVrc1NVRkJTU3hKUVVGSkxFTkJRVU1zU1VGQlNTeEpRVUZKTEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRkZCUVZFc1EwRkJRenRCUVVOb1JpeERRVUZET3p0QlFVVkVMRk5CUVZNc1owSkJRV2RDTEVOQlFVTXNTMEZCU3l4RlFVRkZPMFZCUXk5Q0xFbEJRVWtzVFVGQlRTeEhRVUZITEVWQlFVVXNRMEZCUXp0RlFVTm9RaXhKUVVGSkxGRkJRVkVzUjBGQlJ5eExRVUZMTEVOQlFVTTdSVUZEY2tJc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRXRCUVVzc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdTVUZEY2tNc1NVRkJTU3hOUVVGTkxFZEJRVWNzUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1MwRkJTeXhOUVVGTkxFTkJRVU03U1VGRE0wTXNTVUZCU1N4RFFVRkRMRkZCUVZFc1NVRkJTU3hEUVVGRExFMUJRVTBzUlVGQlJUdE5RVU40UWl4TlFVRk5MRU5CUVVNc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMDFCUTNSQ0xGRkJRVkVzUjBGQlJ5eFJRVUZSTEVsQlFVa3NUVUZCVFN4RFFVRkRPMHRCUXk5Q08wZEJRMFk3UlVGRFJDeFBRVUZQTEUxQlFVMHNRMEZCUXp0QlFVTm9RaXhEUVVGRExFTkJRVU03TzBGQlJVWXNTVUZCU1N4SlFVRkpMRWRCUVVjc1EwRkJReXhaUVVGWk8wbEJRM0JDTEZOQlFWTXNSVUZCUlN4SFFVRkhPMUZCUTFZc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTXNRMEZCUXl4SFFVRkhMRWxCUVVrc1EwRkJReXhOUVVGTkxFVkJRVVVzU1VGQlNTeFBRVUZQTEVOQlFVTTdZVUZETTBNc1VVRkJVU3hEUVVGRExFVkJRVVVzUTBGQlF6dGhRVU5hTEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRMUVVOeVFqdEpRVU5FTEU5QlFVOHNXVUZCV1R0UlFVTm1MRTlCUVU4c1JVRkJSU3hGUVVGRkxFZEJRVWNzUlVGQlJTeEZRVUZGTEVkQlFVY3NSMEZCUnl4SFFVRkhMRVZCUVVVc1JVRkJSU3hIUVVGSExFZEJRVWNzUjBGQlJ5eEZRVUZGTEVWQlFVVXNSMEZCUnl4SFFVRkhPMWxCUXpsRExFVkJRVVVzUlVGQlJTeEhRVUZITEVkQlFVY3NSMEZCUnl4RlFVRkZMRVZCUVVVc1IwRkJSeXhGUVVGRkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEVWQlFVVXNRMEZCUXp0TFFVTjJReXhEUVVGRE8wRkJRMDRzUTBGQlF5eEhRVUZITEVOQlFVTTdPMEZCUlV3c1NVRkJTU3hUUVVGVExFZEJRVWNzUlVGQlJTeERRVUZETzBGQlEyNUNMRWxCUVVrc1MwRkJTeXhEUVVGRE8wRkJRMVlzU1VGQlNTeFJRVUZSTEVOQlFVTTdRVUZEWWl4SlFVRkpMRWxCUVVrc1IwRkJSenRKUVVOUUxFdEJRVXNzUlVGQlJTeExRVUZMTzBsQlExb3NTVUZCU1N4RlFVRkZMRmxCUVZrN1VVRkRaQ3hKUVVGSkxGRkJRVkVzUjBGQlJ5eHJRa0ZCYTBJc1EwRkJReXhsUVVGbExFTkJRVU1zUTBGQlF6dFJRVU51UkN4UFFVRlBMRWxCUVVrc1EwRkJReXhaUVVGWkxFVkJRVVVzUTBGQlF5eEpRVUZKTEVOQlFVTXNXVUZCV1R0WlFVTjRReXhKUVVGSkxGRkJRVkVzUlVGQlJUdG5Ra0ZEVml4WlFVRlpMRU5CUVVNc1MwRkJTeXhGUVVGRkxFTkJRVU03WjBKQlEzSkNMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXl4dlFrRkJiMElzUlVGQlJTeERRVUZETzJkQ1FVTnFSQ3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRPMmRDUVVNNVFpeFZRVUZWTEVOQlFVTXNXVUZCV1R0dlFrRkRia0lzUzBGQlN5eERRVUZETEZWQlFWVXNSMEZCUnl4clFrRkJhMElzUTBGQlF5eHJRa0ZCYTBJc1EwRkJReXhEUVVGRE8wRkJRemxGTEc5Q1FVRnZRaXhMUVVGTExFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXpzN2IwSkJSWEpDTEVsQlFVa3NVMEZCVXl4SFFVRkhMR3RDUVVGclFpeERRVUZETEdsQ1FVRnBRaXhEUVVGRExFTkJRVU03YjBKQlEzUkVMRWxCUVVrc1UwRkJVeXhGUVVGRk8zZENRVU5ZTEZOQlFWTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETzNGQ1FVTnlRenR2UWtGRFJDeFRRVUZUTEVkQlFVY3NVMEZCVXl4SlFVRkpMRVZCUVVVc1EwRkJRenR2UWtGRE5VSXNTVUZCU1N4TFFVRkxMRWRCUVVjc2EwSkJRV3RDTEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zU1VGQlNTeFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMR05CUVdNc1EwRkJReXhEUVVGRE8yOUNRVU5xUml4SlFVRkpMRXRCUVVzc1JVRkJSVHQzUWtGRFVDeFRRVUZUTEVOQlFVTXNTMEZCU3l4SFFVRkhMRXRCUVVzc1EwRkJRenRCUVVOb1JDeHhRa0ZCY1VJN08yOUNRVVZFTEVsQlFVa3NRMEZCUXl4WFFVRlhMRU5CUVVNc1VVRkJVU3hGUVVGRkxGTkJRVk1zUTBGQlF5eERRVUZETzJsQ1FVTjZReXhGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzJGQlExb3NUVUZCVFR0blFrRkRTQ3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc2IwSkJRVzlDTEVWQlFVVXNRMEZCUXp0blFrRkRha1FzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4aFFVRmhMRU5CUVVNc1EwRkJRenRuUWtGRE9VSXNTVUZCU1N4TFFVRkxMRU5CUVVNc1RVRkJUU3hMUVVGTExGTkJRVk1zUlVGQlJUdHZRa0ZETlVJc1YwRkJWeXhEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNVVUZCVVN4RlFVRkZMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdhVUpCUTNoRUxFMUJRVTBzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRWxCUVVrc1MwRkJTeXhEUVVGRExFMUJRVTBzUzBGQlN5eGpRVUZqTEVWQlFVVTdiMEpCUTNwRUxFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPMmxDUVVNelFqdGhRVU5LTzFOQlEwb3NRMEZCUXl4RFFVRkRPMHRCUTA0N1NVRkRSQ3hUUVVGVExFVkJRVVVzVlVGQlZTeEhRVUZITEVWQlFVVXNUMEZCVHl4RlFVRkZPMUZCUXk5Q0xFbEJRVWtzVTBGQlV5eEpRVUZKTEZOQlFWTXNRMEZCUXl4TlFVRk5MRVZCUVVVN1dVRkRMMElzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRM1pETEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhIUVVGSExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdZVUZET1VJN1UwRkRTanRMUVVOS08wbEJRMFFzWTBGQll5eEZRVUZGTEZsQlFWazdVVUZEZUVJc1NVRkJTU3hMUVVGTExFTkJRVU1zVFVGQlRTeEpRVUZKTEZkQlFWY3NSVUZCUlR0WlFVTTNRaXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZkQlFWY3NRMEZCUXp0WlFVTXpRaXhMUVVGTExFTkJRVU1zUzBGQlN5eEhRVUZITEVWQlFVVXNRMEZCUXp0WlFVTnFRaXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhEUVVGRExFTkJRVU03UVVGRGFFUXNXVUZCV1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNN08xbEJSWEJETEVsQlFVa3NRMEZCUXl4aFFVRmhMRU5CUVVNc1RVRkJUU3hGUVVGRk8yZENRVU4yUWl4SFFVRkhMRVZCUVVVN2IwSkJRMFFzVVVGQlVTeEZRVUZGTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1VVRkJVVHR2UWtGRGJFTXNTVUZCU1N4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zU1VGQlNUdHZRa0ZETVVJc1RVRkJUU3hGUVVGRkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNUVUZCVFR0dlFrRkRPVUlzU1VGQlNTeEZRVUZGTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1NVRkJTVHRwUWtGRE4wSTdZVUZEU2l4RFFVRkRMRU5CUVVNN1UwRkRUanRCUVVOVUxFdEJRVXM3TzBsQlJVUXNWMEZCVnl4RlFVRkZMRlZCUVZVc1NVRkJTU3hGUVVGRkxFMUJRVTBzUlVGQlJUdFJRVU5xUXl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFbEJRVWtzVFVGQlRTeERRVUZETEdsQ1FVRnBRaXhEUVVGRExFTkJRVU03VVVGRE9VTXNTVUZCU1N4UFFVRlBMRWRCUVVjc1EwRkJReXhKUVVGSkxFZEJRVWNzVFVGQlRTeERRVUZETEdsRVFVRnBSQ3hEUVVGRExFbEJRVWtzUjBGQlJ5eEhRVUZITEVsQlFVa3NRMEZCUXp0UlFVTTVSaXhQUVVGUExGZEJRVmNzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1ZVRkJWU3hSUVVGUkxFVkJRVVU3V1VGREwwTXNVVUZCVVN4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4UlFVRlJMRU5CUVVNc1EwRkJReXhEUVVGRE8xbEJRMmhFTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhIUVVGSExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTTdaMEpCUTNSQ0xFdEJRVXNzUlVGQlJTeERRVUZETEZGQlFWRXNTVUZCU1N4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExHTkJRV01zUTBGQlF5eExRVUZMTEVsQlFVazdRVUZEZWtVc1lVRkJZU3hGUVVGRkxFMUJRVTBzUTBGQlF5eERRVUZET3p0WlFVVllMR1ZCUVdVc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTXNXVUZCV1R0blFrRkRka01zUzBGQlN5eERRVUZETEU5QlFVOHNSMEZCUnl4UFFVRlBMRXRCUVVzc1NVRkJTU3hEUVVGRE8wRkJRMnBFTEdkQ1FVRm5RaXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZOQlFWTXNRMEZCUXpzN1FVRkZla01zWjBKQlFXZENMRkZCUVZFc1EwRkJReXhMUVVGTExFZEJRVWNzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZET3p0blFrRkZiRVFzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4eFFrRkJjVUlzUjBGQlJ5eEpRVUZKTEVkQlFVY3NSMEZCUnl4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE8wRkJRemRGTEdkQ1FVRm5RaXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03TzJkQ1FVVnVReXhQUVVGUExFTkJRVU1zVVVGQlVTeEZRVUZGTEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTNoQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTEVOQlFVTXNRMEZCUXp0TFFVTk9PMGxCUTBRc1YwRkJWeXhGUVVGRkxGZEJRVmM3U1VGRGVFSXNXVUZCV1N4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRemRDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRXRCUVVzc1EwRkJReXhIUVVGSExFbEJRVWtzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNN1VVRkRMME1zVDBGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRPMUZCUTJwQ0xFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPMEZCUTJoRExGRkJRVkVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZET3p0UlFVVnVReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhEUVVGRExFTkJRVU03VVVGRGNFTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRWaXhKUVVGSkxFOUJRVThzUlVGQlJUdG5Ra0ZEVkN4SlFVRkpMRU5CUVVNc1lVRkJZU3hEUVVGRExITkNRVUZ6UWl4SFFVRkhMRkZCUVZFc1EwRkJReXhKUVVGSkxFZEJRVWNzWTBGQll5eERRVUZETEVOQlFVTTdZVUZETDBVc1RVRkJUVHRuUWtGRFNDeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRzFDUVVGdFFpeEhRVUZITEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03WjBKQlF6TkVMRWxCUVVrc1EwRkJReXhYUVVGWExFTkJRVU1zYzBKQlFYTkNMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFpRVUZaTEVOQlFVTXNRMEZCUXp0aFFVTXpSVHRUUVVOS08wRkJRMVFzUzBGQlN6dEJRVU5NTzBGQlEwRTdRVUZEUVRzN1NVRkZTU3h2UWtGQmIwSXNSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSVHRSUVVOeVF5eEpRVUZKTEZGQlFWRXNSMEZCUnl4UFFVRlBMRU5CUVVNc1dVRkJXU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMRWxCUVVrc1NVRkJTU3hGUVVGRkxFTkJRVU03UVVGRGVFVXNVVUZCVVN4UFFVRlBMRU5CUVVNc1dVRkJXU3hEUVVGRExHZENRVUZuUWl4RlFVRkZMRkZCUVZFc1EwRkJReXhEUVVGRE96dFJRVVZxUkN4SlFVRkpMRTlCUVU4c1IwRkJSeXhQUVVGUExFTkJRVU1zVTBGQlV5eEZRVUZGTEVOQlFVTXNVMEZCVXl4RFFVRkRPMUZCUXpWRExFbEJRVWtzV1VGQldTeEhRVUZITEVWQlFVVXNRMEZCUXp0UlFVTjBRaXhKUVVGSkxFOUJRVThzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1RVRkJUU3hKUVVGSkxFOUJRVThzUTBGQlF5eFBRVUZQTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1RVRkJUU3hGUVVGRk8xbEJRM0JHTEZsQlFWa3NSMEZCUnl4RFFVRkRMRTlCUVU4c1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU53UXl4TlFVRk5PMWxCUTBnc1dVRkJXU3hIUVVGSExHTkJRV01zUTBGQlF5eFBRVUZQTEVWQlFVVXNVVUZCVVN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8xTkJRM3BFTzFGQlEwUXNUMEZCVHp0WlFVTklMRkZCUVZFc1JVRkJSU3hSUVVGUk8xbEJRMnhDTEZOQlFWTXNSVUZCUlN4WlFVRlpPMU5CUXpGQ0xFTkJRVU03UVVGRFZpeExRVUZMT3p0SlFVVkVMR0ZCUVdFc1JVRkJSU3hWUVVGVkxGTkJRVk1zUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RlFVRkZPMUZCUXpORExFbEJRVWtzU1VGQlNTeERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRWxCUVVrc1EwRkJReXhaUVVGWkxFVkJRVVVzUlVGQlJUdFpRVU16UXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhKUVVGSkxGZEJRVmNzUlVGQlJUdG5Ra0ZETTBJc1IwRkJSeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1EwRkJRenRoUVVOcVF6dFpRVU5FTEV0QlFVc3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWM3WjBKQlEyWXNVMEZCVXl4RlFVRkZMRk5CUVZNN1owSkJRM0JDTEZOQlFWTXNSVUZCUlN4SlFVRkpMRWxCUVVrc1JVRkJSU3hEUVVGRExFOUJRVThzUlVGQlJUdG5Ra0ZETDBJc1NVRkJTU3hGUVVGRkxFbEJRVWs3WVVGRFlpeERRVUZETzFsQlEwWXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhyUWtGQmEwSXNRMEZCUXl4RFFVRkRPMU5CUTNSRE8wdEJRMG83U1VGRFJDeFRRVUZUTEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVc1VVRkJVU3hGUVVGRk8xRkJRMmhETEVsQlFVa3NZMEZCWXl4SlFVRkpMR05CUVdNc1EwRkJReXhOUVVGTkxFVkJRVVU3V1VGRGVrTXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEdOQlFXTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3WjBKQlF6VkRMR05CUVdNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNSMEZCUnl4RlFVRkZMRkZCUVZFc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6dGhRVU01UXp0VFFVTktPMHRCUTBvN1NVRkRSQ3hYUVVGWExFVkJRVVVzVlVGQlZTeExRVUZMTEVWQlFVVXNVVUZCVVN4RlFVRkZPMUZCUTNCRExFbEJRVWtzWTBGQll5eEpRVUZKTEdOQlFXTXNRMEZCUXl4TlFVRk5MRVZCUVVVN1dVRkRla01zUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExHTkJRV01zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRelZETEdOQlFXTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhMUVVGTExFTkJRVU1zUzBGQlN5eEZRVUZGTEZGQlFWRXNSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOc1JEdFRRVU5LTzB0QlEwbzdTVUZEUkN4aFFVRmhMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVVzVVVGQlVTeEZRVUZGTzFGQlEzaERMRWxCUVVrc1kwRkJZeXhKUVVGSkxHTkJRV01zUTBGQlF5eE5RVUZOTEVWQlFVVTdXVUZEZWtNc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMR05CUVdNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdaMEpCUXpWRExHTkJRV01zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhGUVVGRkxGRkJRVkVzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTjBSRHRUUVVOS08wdEJRMG83U1VGRFJDeG5Ra0ZCWjBJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU5xUXl4VFFVRlRMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzB0QlF6TkNPMGxCUTBRc2JVSkJRVzFDTEVWQlFVVXNWVUZCVlN4UFFVRlBMRVZCUVVVN1VVRkRjRU1zV1VGQldTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVNNVFqdEpRVU5FTEhGQ1FVRnhRaXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTzFGQlEzUkRMR05CUVdNc1EwRkJReXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTTdTMEZEYUVNN1NVRkRSQ3h0UWtGQmJVSXNSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSVHRSUVVOd1F5eFpRVUZaTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8wdEJRemxDTzBsQlEwUXNNa0pCUVRKQ0xFVkJRVVVzVlVGQlZTeFBRVUZQTEVWQlFVVTdVVUZETlVNc2IwSkJRVzlDTEVOQlFVTXNTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8wdEJRM1JETzBsQlEwUXNWMEZCVnl4RlFVRkZMRmRCUVZjN1VVRkRjRUlzVDBGQlR5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1EwRkJReXhQUVVGUExFTkJRVU1zVjBGQlZ5eERRVUZETEV0QlFVc3NRMEZCUXl4RFFVRkRPMHRCUTNaRU8wbEJRMFFzVTBGQlV5eEZRVUZGTEZkQlFWYzdVVUZEYkVJc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNRMEZCUXl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzB0QlEzSkVPMGxCUTBRc1dVRkJXU3hGUVVGRkxGTkJRVk1zVlVGQlZTeEZRVUZGTzFGQlF5OUNMRWxCUVVrc1QwRkJUeXhWUVVGVkxFdEJRVXNzVjBGQlZ5eExRVUZMTEVsQlFVa3NRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hKUVVGSkxFTkJRVU1zV1VGQldTeEZRVUZGTEVOQlFVTXNSVUZCUlR0WlFVTnNSaXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSMEZCUnl4VlFVRlZMRWRCUVVjc1dVRkJXU3hIUVVGSExGZEJRVmNzUTBGQlF6dFpRVU0xUkN4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHOUNRVUZ2UWl4RFFVRkRMRU5CUVVNN1UwRkRlRU03VVVGRFJDeFBRVUZQTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1RVRkJUU3hEUVVGRExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNTMEZCU3l4RFFVRkRMRU5CUVVNN1MwRkRlRVE3U1VGRFJDeGhRVUZoTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1VVRkRNMElzU1VGQlNTeEpRVUZKTEV0QlFVc3NTMEZCU3l4RlFVRkZPMWxCUTJoQ0xFbEJRVWtzVjBGQlZ5eEhRVUZITzJkQ1FVTmtMRXRCUVVzc1JVRkJSU3hMUVVGTExFTkJRVU1zUzBGQlN6dEJRVU5zUXl4aFFVRmhMRU5CUVVNN08wRkJSV1FzV1VGQldTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRmRCUVZjc1JVRkJSU3hKUVVGSkxFTkJRVU1zUTBGQlF6czdXVUZGTlVJc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eEpRVUZKTEVWQlFVVTdaMEpCUTI1Q0xGZEJRVmNzUTBGQlF5eEpRVUZKTEVkQlFVY3NUVUZCVFN4RFFVRkRMSEZDUVVGeFFpeERRVUZETEVOQlFVTTdRVUZEYWtVc1lVRkJZVHM3V1VGRlJDeEpRVUZKTEZkQlFWY3NRMEZCUXl4SlFVRkpMRVZCUVVVN1FVRkRiRU1zWjBKQlFXZENMRXRCUVVzc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4RFFVRkRPenRuUWtGRmJFTXNTVUZCU1N4WlFVRlpMRWxCUVVrc1dVRkJXU3hEUVVGRExFMUJRVTBzUlVGQlJUdHZRa0ZEY2tNc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRmxCUVZrc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdkMEpCUXpGRExGbEJRVmtzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03Y1VKQlEzUkRPMmxDUVVOS08yRkJRMG83UVVGRFlpeFRRVUZUT3p0QlFVVlVMRkZCUVZFc1MwRkJTeXhEUVVGRExFMUJRVTBzUjBGQlJ5eFJRVUZSTEVOQlFVTTdPMEZCUldoRExGRkJRVkVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eERRVUZET3p0UlFVVndReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhGUVVGRkxGZEJRVmNzUTBGQlF5eERRVUZETzBGQlEzcEVMRXRCUVVzN08wbEJSVVFzV1VGQldTeEZRVUZGTEZsQlFWazdVVUZEZEVJc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4UlFVRlJMRU5CUVVNN1ZVRkRkRU1zWTBGQll5eEZRVUZGTEZWQlFWVTdVMEZETTBJc1EwRkJReXhEUVVGRE8xRkJRMGdzU1VGQlNTeHZRa0ZCYjBJc1EwRkJReXhOUVVGTkxFZEJRVWNzUTBGQlF5eEpRVUZKTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zWlVGQlpTeERRVUZETEVWQlFVVTdXVUZEZWtVc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFZRVUZWTEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVN1owSkJRekZETEc5Q1FVRnZRaXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZWQlFWVXNTVUZCU1N4RlFVRkZPMjlDUVVOd1F5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yOUNRVU16UWl4UFFVRlBMRVZCUVVVc1EwRkJRenRwUWtGRFlpeEZRVUZGTEZsQlFWazdiMEpCUTFnc1QwRkJUeXhGUVVGRkxFTkJRVU03YVVKQlEySXNRMEZCUXl4RFFVRkRPMkZCUTA0c1EwRkJReXhEUVVGRE8xTkJRMDRzVFVGQlRUdFpRVU5JTEU5QlFVOHNUMEZCVHl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRE8xTkJRelZDTzBGQlExUXNTMEZCU3pzN1NVRkZSQ3h2UWtGQmIwSXNSVUZCUlN4WlFVRlpPMUZCUXpsQ0xFbEJRVWtzV1VGQldTeEhRVUZITEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU03VVVGRGFFUXNTVUZCU1N4WlFVRlpMRVZCUVVVN1dVRkRaQ3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJRenRUUVVOd1F5eE5RVUZOTzFsQlEwZ3NTMEZCU3l4SFFVRkhPMmRDUVVOS0xFMUJRVTBzUlVGQlJTeGpRVUZqTzJkQ1FVTjBRaXhUUVVGVExFVkJRVVVzUlVGQlJUdGhRVU5vUWl4RFFVRkRPMU5CUTB3N1VVRkRSQ3hQUVVGUExFdEJRVXNzUTBGQlF6dEJRVU55UWl4TFFVRkxPenRKUVVWRUxHdENRVUZyUWl4RlFVRkZMRlZCUVZVc1UwRkJVeXhGUVVGRk8xRkJRM0pETEVsQlFVa3NVMEZCVXl4RlFVRkZPMWxCUTFnc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eE5RVUZOTEVWQlFVVXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETzFOQlF6TkVMRTFCUVUwN1dVRkRTQ3haUVVGWkxFTkJRVU1zVlVGQlZTeERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPMU5CUTI1RE8wRkJRMVFzUzBGQlN6czdTVUZGUkN4TlFVRk5MRVZCUVVVc1dVRkJXVHRSUVVOb1FpeEpRVUZKTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdTMEZEYkVNN1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNVMEZCVXl4bFFVRmxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFdEJRVXNzUlVGQlJUdEpRVU5xUXl4RFFVRkRMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zVjBGQlZ5eERRVUZETEdGQlFXRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenRCUVVNM1F5eERRVUZET3p0QlFVVkVMRk5CUVZNc1YwRkJWeXhEUVVGRExFZEJRVWNzUlVGQlJTeExRVUZMTEVWQlFVVTdTVUZETjBJc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEZkQlFWY3NRMEZCUXl4WlFVRlpMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03UVVGRE5VTXNRMEZCUXpzN1FVRkZSRHRCUVVOQk8wRkJRMEU3TzBkQlJVYzdRVUZEU0N4VFFVRlRMRzFDUVVGdFFpeERRVUZETEVkQlFVY3NSVUZCUlR0SlFVTTVRaXhQUVVGUExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU1zVFVGQlRTeEpRVUZKTEVOQlFVTTdWVUZEY0VNc1IwRkJSeXhEUVVGRExGRkJRVkVzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4UFFVRlBMRU5CUVVNN1FVRkRhRVFzUTBGQlF6czdRVUZGUkN4SlFVRkpMRTFCUVUwc1IwRkJSeXhGUVVGRkxFTkJRVU03TzBGQlJXaENMRk5CUVZNc2FVSkJRV2xDTEVkQlFVYzdPMGxCUlhwQ0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhOUVVGTkxFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMUZCUTNCRExGRkJRVkVzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVXNRMEZCUXl4VlFVRlZMRWRCUVVjc1JVRkJSVHRaUVVOcVJDeEpRVUZKTEU5QlFVOHNSMEZCUnl4VlFVRlZMRU5CUVVNc1JVRkJSVHRuUWtGRGRrSXNTVUZCU1N4RFFVRkRMRU5CUVVNc1UwRkJVenRCUVVNdlFpeHZRa0ZCYjBJc1QwRkJUenM3WjBKQlJWZ3NTVUZCU1N4UFFVRlBMRWRCUVVjc1VVRkJVU3hEUVVGRExFZEJRVWNzUTBGQlF5eHJRa0ZCYTBJc1IwRkJSeXhIUVVGSExFTkJRVU1zUTBGQlF6dG5Ra0ZEY2tRc1NVRkJTU3hKUVVGSkxFTkJRVU1zVjBGQlZ5eEZRVUZGTzNGQ1FVTnFRaXhQUVVGUExFdEJRVXNzU1VGQlNTeEpRVUZKTEU5QlFVOHNTMEZCU3l4TlFVRk5MRWxCUVVrc1QwRkJUeXhQUVVGUExFdEJRVXNzVjBGQlZ5eERRVUZETzI5Q1FVTXhSU3hEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEZsQlFWazdiMEpCUTNKQ0xFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4WlFVRlpMRU5CUVVNc1lVRkJZU3hEUVVGRE8yOUNRVU55UXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4bFFVRmxMRU5CUVVNc1EwRkJReXhOUVVGTkxFbEJRVWtzUTBGQlF6dHZRa0ZEYUVRc2JVSkJRVzFDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRk8zTkNRVU0zUWl4SlFVRkpMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNN2MwSkJRMnhETEVsQlFVa3NTVUZCU1N4SFFVRkhPekJDUVVOUUxFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNiMEpCUVc5Q0xFTkJRVU1zUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXp0MVFrRkRMME1zUTBGQlF6dEJRVU40UWl4elFrRkJjMElzU1VGQlNTeExRVUZMTEVOQlFVTTdPM05DUVVWV0xFbEJRVWtzUTBGQlF5eERRVUZETEV0QlFVc3NTVUZCU1N4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRk96QkNRVU55UWl4SlFVRkpMRU5CUVVNc1RVRkJUU3hIUVVGSExFTkJRVU1zUTBGQlF5eExRVUZMTEVsQlFVa3NRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJRenRCUVVNMVJDeDFRa0ZCZFVJN08zTkNRVVZFTEVsQlFVa3NSMEZCUnl4SlFVRkpMRmRCUVZjc1JVRkJSVHN3UWtGRGNFSXNaVUZCWlN4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFVkJRVVVzU1VGQlNTeERRVUZETEVOQlFVTTdNRUpCUTJoRExFMUJRVTBzUTBGQlF5eEpRVUZKTEVOQlFVTTdPRUpCUTFJc1QwRkJUeXhGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOT3poQ1FVTnFRaXhMUVVGTExFVkJRVVVzVlVGQlZTeERRVUZETEZsQlFWazdhME5CUXpGQ0xGZEJRVmNzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8ydERRVU0xUWl4bFFVRmxMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXpzclFrRkRjRU1zUlVGQlJTeEhRVUZITEVOQlFVTTdNa0pCUTFZc1EwRkJReXhEUVVGRE8zVkNRVU5PTzNOQ1FVTkVMRWxCUVVrc1IwRkJSeXhKUVVGSkxGVkJRVlVzUlVGQlJUc3dRa0ZEYmtJc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRTFCUVUwc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdPRUpCUTNCRExFbEJRVWtzVFVGQlRTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1NVRkJTU3hEUVVGRExFTkJRVU1zVFVGQlRTeEZRVUZGTzJ0RFFVTXZRaXhaUVVGWkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8ydERRVU01UWl4TlFVRk5MRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU1zUlVGQlJTeERRVUZETEVOQlFVTXNRMEZCUXp0clEwRkRjRUlzVFVGQlRUc3JRa0ZEVkRzeVFrRkRTanN3UWtGRFJDeGxRVUZsTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF6c3dRa0ZEYWtNc1YwRkJWeXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVWQlFVVXNTMEZCU3l4RFFVRkRMRU5CUVVNN1FVRkRka1FzZFVKQlFYVkNPenR6UWtGRlJDeEpRVUZKTEVkQlFVY3NTVUZCU1N4UlFVRlJMRVZCUVVVN01FSkJRMnBDTEVsQlFVa3NRMEZCUXl4TFFVRkxMRWRCUVVjc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eExRVUZMTEVOQlFVTTdRVUZEZEVRc2RVSkJRWFZDT3p0elFrRkZSQ3hKUVVGSkxFTkJRVU1zWVVGQllTeERRVUZETEVkQlFVY3NSVUZCUlN4SlFVRkpMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGVrUXNhVUpCUVdsQ096dEJRVVZxUWl4aFFVRmhMRU5CUVVNN1FVRkRaRHM3V1VGRldTeERRVUZETEVsQlFVa3NRMEZCUXl4alFVRmpMRWRCUVVjc1NVRkJTU3hEUVVGRExHTkJRV01zU1VGQlNTeEZRVUZGTEVWQlFVVXNSMEZCUnl4RFFVRkRMRWRCUVVjc1QwRkJUeXhEUVVGRE8xbEJRMnBGTEU5QlFVOHNUMEZCVHl4RFFVRkRPMU5CUTJ4Q0xFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU03UVVGRE4wSXNTMEZCU3pzN1NVRkZSQ3hKUVVGSkxGTkJRVk1zUjBGQlJ6dFJRVU5hTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0QlFVTnVRaXhMUVVGTExFTkJRVU03TzBsQlJVWXNTVUZCU1N4UlFVRlJMRWRCUVVjN1VVRkRXQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWxCUVVrN1VVRkRWaXhKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3UVVGRGFrSXNTMEZCU3l4RFFVRkRPenRKUVVWR0xGTkJRVk1zWlVGQlpTeEZRVUZGTEVOQlFVTXNSVUZCUlR0UlFVTjZRaXhKUVVGSkxFTkJRVU1zUTBGQlF5eFRRVUZUTzBGQlEzWkNMRmxCUVZrc1QwRkJUenM3VVVGRldDeEpRVUZKTEVsQlFVa3NRMEZCUXl4WFFVRlhMRVZCUVVVc1NVRkJTU3hEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEZsQlFWa3NTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zV1VGQldTeERRVUZETEdGQlFXRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMR1ZCUVdVc1EwRkJReXhEUVVGRExFMUJRVTBzU1VGQlNTeERRVUZETEVWQlFVVTdRVUZEZEVvc1dVRkJXU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUXpWQ08wRkJRMEU3TzFsQlJWa3NTVUZCU1N4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU1zUTBGQlF5eEZRVUZGTzJkQ1FVTTNRaXhEUVVGRExFZEJRVWNzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTJwRExHRkJRV0U3TzFsQlJVUXNTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJReXhSUVVGUkxFdEJRVXNzUTBGQlF5eEpRVUZKTEVWQlFVVXNTVUZCU1N4RFFVRkRMRWxCUVVrc1JVRkJSU3hEUVVGRExFVkJRVVU3WjBKQlEzSkRMRU5CUVVNc1IwRkJSeXhOUVVGTkxFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTXNSMEZCUnl4RlFVRkZMRU5CUVVNc1EwRkJRenRCUVVOb1JDeGhRVUZoTEUxQlFVMHNTVUZCU1N4RFFVRkRMRU5CUVVNc1VVRkJVU3hKUVVGSkxGRkJRVkVzUTBGQlF5eGpRVUZqTEVOQlFVTXNRMEZCUXl4RFFVRkRMRVZCUVVVN08yZENRVVZxUkN4RFFVRkRMRWRCUVVjc1VVRkJVU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJGQlEyNUNMRTFCUVUwN1owSkJRMGdzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXl4WlFVRlpMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03UVVGRE0wTXNZVUZCWVRzN1dVRkZSQ3hKUVVGSkxFTkJRVU1zWVVGQllTeERRVUZETEZWQlFWVXNSVUZCUlR0blFrRkRNMElzVDBGQlR5eEZRVUZGTEVsQlFVa3NRMEZCUXl4dlFrRkJiMElzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRPMmRDUVVNMVF5eEhRVUZITEVWQlFVVXNRMEZCUXp0blFrRkRUaXhUUVVGVExFVkJRVVVzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4TFFVRkxPMmRDUVVONlFpeExRVUZMTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhMUVVGTExFZEJRVWNzUTBGQlF6dG5Ra0ZEZWtJc1QwRkJUeXhGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTzJGQlEzSkNMRU5CUVVNc1EwRkJRenRUUVVOT08wRkJRMVFzUzBGQlN6czdRVUZGVEN4SlFVRkpMRkZCUVZFc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4VlFVRlZMRVZCUVVVc1pVRkJaU3hGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzBGQlEycEZPenRKUVVWSkxFTkJRVU1zU1VGQlNTeERRVUZETEdOQlFXTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1kwRkJZeXhKUVVGSkxFVkJRVVVzUlVGQlJTeFZRVUZWTEVOQlFVTXNSMEZCUnl4bFFVRmxMRU5CUVVNN1FVRkRjRVlzUTBGQlF6czdRVUZGUkN4VFFVRlRMR3RDUVVGclFpeERRVUZETEVsQlFVa3NSVUZCUlR0SlFVTTVRaXhKUVVGSkxFZEJRVWNzU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJRenRKUVVNeFJDeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRTFCUVUwc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZkQlFWY3NRMEZCUXp0UlFVTnFSQ3hQUVVGUExFZEJRVWNzUzBGQlN5eERRVUZETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1RVRkJUU3hEUVVGRExFTkJRVU03U1VGRE1VTXNUMEZCVHl4UFFVRlBMRXRCUVVzc1NVRkJTU3hIUVVGSExFVkJRVVVzUjBGQlJ5eHJRa0ZCYTBJc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEzUkdMRU5CUVVNN08wRkJSVVFzVTBGQlV5eGhRVUZoTEVkQlFVYzdSVUZEZGtJc1NVRkJTU3hSUVVGUkxFTkJRVU1zVlVGQlZTeEpRVUZKTEZWQlFWVXNSVUZCUlR0QlFVTjZReXhKUVVGSkxFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXl4SlFVRkpMRU5CUVVNc1dVRkJXVHM3UVVGRmFrTXNVVUZCVVN4cFFrRkJhVUlzUlVGQlJTeERRVUZET3p0UlFVVndRaXhKUVVGSkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNSVUZCUlR0WlFVTndRaXhKUVVGSkxFTkJRVU1zWVVGQllTeERRVUZETEUxQlFVMHNSVUZCUlR0blFrRkRka0lzUjBGQlJ5eEZRVUZGTzI5Q1FVTkVMRkZCUVZFc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEZGQlFWRTdiMEpCUTJ4RExFbEJRVWtzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrN2IwSkJRekZDTEUxQlFVMHNSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFMUJRVTA3YjBKQlF6bENMRWxCUVVrc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEVsQlFVazdhVUpCUXpkQ08yRkJRMG9zUTBGQlF5eERRVUZETzFOQlEwNDdTMEZEU2l4RFFVRkRMRU5CUVVNN1IwRkRTanRCUVVOSUxFTkJRVU03TzBGQlJVUXNZVUZCWVN4RlFVRkZMRU5CUVVNN1FVRkRhRUlzVVVGQlVTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExHdENRVUZyUWl4RlFVRkZMR0ZCUVdFc1EwRkJReXhEUVVGRE96dEJRVVUzUkN4TlFVRk5MRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNVVUZCVVN4RlFVRkZMRmxCUVZrN1NVRkRNVU1zU1VGQlNTeERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRPMEZCUTJ4Q0xFTkJRVU1zUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXpzN1FVRkZWQ3hOUVVGTkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1QwRkJUeXhGUVVGRkxGVkJRVlVzUjBGQlJ5eEZRVUZGTzBsQlF6VkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zWjBKQlFXZENMRWRCUVVjc1IwRkJSeXhEUVVGRExFOUJRVThzUjBGQlJ5eEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRWRCUVVjc1IwRkJSeXhIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEVsQlFVa3NSMEZCUnl4SFFVRkhMRWRCUVVjc1IwRkJSeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzBGQlEzQkhMRU5CUVVNc1EwRkJReXhEUVVGRE96dEJRVVZJTEUxQlFVMHNRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lkbUZ5SUY4Z1BTQnlaWEYxYVhKbEtDY3VMM1YwYVd4ekp5azdYRzUyWVhJZ1VISnZiV2x6WlNBOUlISmxjWFZwY21Vb0oyVnpOaTF3Y205dGFYTmxKeWt1VUhKdmJXbHpaVHRjYm5aaGNpQlRhVzExYkdGMFpTQTlJSEpsY1hWcGNtVW9KeTR2YzJsdGRXeGhkR1VuS1R0Y2JuWmhjaUJ6Wld4bFkzUnZja1pwYm1SbGNpQTlJSEpsY1hWcGNtVW9KeTR2YzJWc1pXTjBiM0pHYVc1a1pYSW5LVHRjYm5aaGNpQlRaWFIwYVc1bmN5QTlJSEpsY1hWcGNtVW9KeTR2YzJWMGRHbHVaM01uS1R0Y2JseHVMeThnZG1GeUlHMTVSMlZ1WlhKaGRHOXlJRDBnYm1WM0lFTnpjMU5sYkdWamRHOXlSMlZ1WlhKaGRHOXlLQ2s3WEc1MllYSWdhVzF3YjNKMFlXNTBVM1JsY0V4bGJtZDBhQ0E5SURVd01EdGNiblpoY2lCellYWmxTR0Z1Wkd4bGNuTWdQU0JiWFR0Y2JuWmhjaUJ5WlhCdmNuUklZVzVrYkdWeWN5QTlJRnRkTzF4dWRtRnlJR3h2WVdSSVlXNWtiR1Z5Y3lBOUlGdGRPMXh1ZG1GeUlITmxkSFJwYm1kelRHOWhaRWhoYm1Sc1pYSnpJRDBnVzEwN1hHNWNibVoxYm1OMGFXOXVJR2RsZEZOalpXNWhjbWx2S0c1aGJXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2JHOWhaRWhoYm1Sc1pYSnpMbXhsYm1kMGFDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITjBZWFJsSUQwZ2RYUnRaUzV6ZEdGMFpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2MzUmhkR1V1YzJObGJtRnlhVzl6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFlYUmxMbk5qWlc1aGNtbHZjMXRwWFM1dVlXMWxJRDA5UFNCdVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjMjlzZG1Vb2MzUmhkR1V1YzJObGJtRnlhVzl6VzJsZEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JzYjJGa1NHRnVaR3hsY25OYk1GMG9ibUZ0WlN3Z1puVnVZM1JwYjI0Z0tISmxjM0FwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYTnZiSFpsS0hKbGMzQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlLVHRjYm4xY2JuWmhjaUIyWVd4cFpHRjBhVzVuSUQwZ1ptRnNjMlU3WEc1Y2JuWmhjaUJsZG1WdWRITWdQU0JiWEc0Z0lDQWdKMk5zYVdOckp5eGNiaUFnSUNBblptOWpkWE1uTEZ4dUlDQWdJQ2RpYkhWeUp5eGNiaUFnSUNBblpHSnNZMnhwWTJzbkxGeHVJQ0FnSUM4dklDZGtjbUZuSnl4Y2JpQWdJQ0F2THlBblpISmhaMlZ1ZEdWeUp5eGNiaUFnSUNBdkx5QW5aSEpoWjJ4bFlYWmxKeXhjYmlBZ0lDQXZMeUFuWkhKaFoyOTJaWEluTEZ4dUlDQWdJQzh2SUNka2NtRm5jM1JoY25RbkxGeHVJQ0FnSUM4dklDZHBibkIxZENjc1hHNGdJQ0FnSjIxdmRYTmxaRzkzYmljc1hHNGdJQ0FnTHk4Z0oyMXZkWE5sYlc5MlpTY3NYRzRnSUNBZ0oyMXZkWE5sWlc1MFpYSW5MRnh1SUNBZ0lDZHRiM1Z6Wld4bFlYWmxKeXhjYmlBZ0lDQW5iVzkxYzJWdmRYUW5MRnh1SUNBZ0lDZHRiM1Z6Wlc5MlpYSW5MRnh1SUNBZ0lDZHRiM1Z6WlhWd0p5eGNiaUFnSUNBblkyaGhibWRsSnl4Y2JpQWdJQ0F2THlBbmNtVnphWHBsSnl4Y2JpQWdJQ0F2THlBbmMyTnliMnhzSjF4dVhUdGNibHh1Wm5WdVkzUnBiMjRnWjJWMFEyOXVaR2wwYVc5dWN5aHpZMlZ1WVhKcGJ5d2dZMjl1WkdsMGFXOXVWSGx3WlNrZ2UxeHVJQ0IyWVhJZ2MyVjBkWEFnUFNCelkyVnVZWEpwYjF0amIyNWthWFJwYjI1VWVYQmxYVHRjYmlBZ2RtRnlJSE5qWlc1aGNtbHZjeUE5SUhObGRIVndJQ1ltSUhObGRIVndMbk5qWlc1aGNtbHZjenRjYmlBZ0x5OGdWRTlFVHpvZ1FuSmxZV3NnYjNWMElHbHVkRzhnYUdWc2NHVnlYRzRnSUdsbUlDaHpZMlZ1WVhKcGIzTXBJSHRjYmlBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1aGJHd29YeTV0WVhBb2MyTmxibUZ5YVc5ekxDQm1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOU9ZVzFsS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWjJWMFUyTmxibUZ5YVc4b2MyTmxibUZ5YVc5T1lXMWxLUzUwYUdWdUtHWjFibU4wYVc5dUlDaHZkR2hsY2xOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lHOTBhR1Z5VTJObGJtRnlhVzhnUFNCS1UwOU9MbkJoY25ObEtFcFRUMDR1YzNSeWFXNW5hV1o1S0c5MGFHVnlVMk5sYm1GeWFXOHBLVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE5sZEhWd1EyOXVaR2wwYVc5dWN5aHZkR2hsY2xOalpXNWhjbWx2S1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjJZWElnZEc5U1pYUjFjbTRnUFNCYlhUdGNiaUFnSUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUc5MGFHVnlVMk5sYm1GeWFXOHVjM1JsY0hNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnZVbVYwZFhKdUxuQjFjMmdvYjNSb1pYSlRZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFhTazdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGIxSmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlLU2s3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTaGJYU2s3WEc0Z0lIMWNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVSEpsWTI5dVpHbDBhVzl1Y3lBb2MyTmxibUZ5YVc4cElIdGNiaUFnY21WMGRYSnVJR2RsZEVOdmJtUnBkR2x2Ym5Nb2MyTmxibUZ5YVc4c0lDZHpaWFIxY0NjcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCblpYUlFiM04wWTI5dVpHbDBhVzl1Y3lBb2MyTmxibUZ5YVc4cElIdGNiaUFnY21WMGRYSnVJR2RsZEVOdmJtUnBkR2x2Ym5Nb2MyTmxibUZ5YVc4c0lDZGpiR1ZoYm5Wd0p5azdYRzU5WEc1Y2JtWjFibU4wYVc5dUlGOWpiMjVqWVhSVFkyVnVZWEpwYjFOMFpYQk1hWE4wY3loemRHVndjeWtnZTF4dUlDQWdJSFpoY2lCdVpYZFRkR1Z3Y3lBOUlGdGRPMXh1SUNBZ0lIWmhjaUJqZFhKeVpXNTBWR2x0WlhOMFlXMXdPeUF2THlCcGJtbDBZV3hwZW1Wa0lHSjVJR1pwY25OMElHeHBjM1FnYjJZZ2MzUmxjSE11WEc0Z0lDQWdabTl5SUNoMllYSWdhaUE5SURBN0lHb2dQQ0J6ZEdWd2N5NXNaVzVuZEdnN0lHb3JLeWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdabXhoZEZOMFpYQnpJRDBnYzNSbGNITmJhbDA3WEc0Z0lDQWdJQ0FnSUdsbUlDaHFJRDRnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYXlBOUlEQTdJR3NnUENCemRHVndjeTVzWlc1bmRHZzdJR3NyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ6ZEdWd0lEMGdabXhoZEZOMFpYQnpXMnRkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQmthV1ptSUQwZ2F5QStJREFnUHlCemRHVndMblJwYldWVGRHRnRjQ0F0SUdac1lYUlRkR1Z3YzF0cklDMGdNVjB1ZEdsdFpWTjBZVzF3SURvZ05UQTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZM1Z5Y21WdWRGUnBiV1Z6ZEdGdGNDQXJQU0JrYVdabU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnNZWFJUZEdWd2MxdHJYUzUwYVcxbFUzUmhiWEFnUFNCamRYSnlaVzUwVkdsdFpYTjBZVzF3TzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kzVnljbVZ1ZEZScGJXVnpkR0Z0Y0NBOUlHWnNZWFJUZEdWd2MxdHFYUzUwYVcxbFUzUmhiWEE3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2JtVjNVM1JsY0hNZ1BTQnVaWGRUZEdWd2N5NWpiMjVqWVhRb1pteGhkRk4wWlhCektUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJRzVsZDFOMFpYQnpPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnpaWFIxY0VOdmJtUnBkR2x2Ym5NZ0tITmpaVzVoY21sdktTQjdYRzRnSUNBZ2RtRnlJSEJ5YjIxcGMyVnpJRDBnVzEwN1hHNGdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVZV3hzS0Z0Y2JpQWdJQ0FnSUNBZ1oyVjBVSEpsWTI5dVpHbDBhVzl1Y3loelkyVnVZWEpwYnlrc1hHNGdJQ0FnSUNBZ0lHZGxkRkJ2YzNSamIyNWthWFJwYjI1ektITmpaVzVoY21sdktWeHVJQ0FnSUYwcExuUm9aVzRvWm5WdVkzUnBiMjRnS0hOMFpYQkJjbkpoZVhNcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhOMFpYQk1hWE4wY3lBOUlITjBaWEJCY25KaGVYTmJNRjB1WTI5dVkyRjBLRnR6WTJWdVlYSnBieTV6ZEdWd2MxMHNJSE4wWlhCQmNuSmhlWE5iTVYwcE8xeHVJQ0FnSUNBZ0lDQnpZMlZ1WVhKcGJ5NXpkR1Z3Y3lBOUlGOWpiMjVqWVhSVFkyVnVZWEpwYjFOMFpYQk1hWE4wY3loemRHVndUR2x6ZEhNcE8xeHVJQ0FnSUgwcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCeWRXNVRkR1Z3S0hOalpXNWhjbWx2TENCcFpIZ3NJSFJ2VTJ0cGNDa2dlMXh1SUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkU1ZVNU9TVTVIWDFOVVJWQW5LVHRjYmlBZ0lDQjBiMU5yYVhBZ1BTQjBiMU5yYVhBZ2ZId2dlMzA3WEc1Y2JpQWdJQ0IyWVhJZ2MzUmxjQ0E5SUhOalpXNWhjbWx2TG5OMFpYQnpXMmxrZUYwN1hHNGdJQ0FnZG1GeUlITjBZWFJsSUQwZ2RYUnRaUzV6ZEdGMFpUdGNiaUFnSUNCcFppQW9jM1JsY0NBbUppQnpkR0YwWlM1emRHRjBkWE1nUFQwZ0oxQk1RVmxKVGtjbktTQjdYRzRnSUNBZ0lDQWdJSE4wWVhSbExuSjFiaTV6WTJWdVlYSnBieUE5SUhOalpXNWhjbWx2TzF4dUlDQWdJQ0FnSUNCemRHRjBaUzV5ZFc0dWMzUmxjRWx1WkdWNElEMGdhV1I0TzF4dUlDQWdJQ0FnSUNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKMnh2WVdRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdibVYzVEc5allYUnBiMjRnUFNCemRHVndMbVJoZEdFdWRYSnNMbkJ5YjNSdlkyOXNJQ3NnWENJdkwxd2lJQ3NnYzNSbGNDNWtZWFJoTG5WeWJDNW9iM04wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhObFlYSmphQ0E5SUhOMFpYQXVaR0YwWVM1MWNtd3VjMlZoY21Ob08xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHaGhjMmdnUFNCemRHVndMbVJoZEdFdWRYSnNMbWhoYzJnN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpaV0Z5WTJnZ0ppWWdJWE5sWVhKamFDNWphR0Z5UVhRb1hDSS9YQ0lwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVmhjbU5vSUQwZ1hDSS9YQ0lnS3lCelpXRnlZMmc3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhWE5UWVcxbFZWSk1JRDBnS0d4dlkyRjBhVzl1TG5CeWIzUnZZMjlzSUNzZ1hDSXZMMXdpSUNzZ2JHOWpZWFJwYjI0dWFHOXpkQ0FySUd4dlkyRjBhVzl1TG5ObFlYSmphQ2tnUFQwOUlDaHVaWGRNYjJOaGRHbHZiaUFySUhObFlYSmphQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWNtVndiR0ZqWlNodVpYZE1iMk5oZEdsdmJpQXJJR2hoYzJnZ0t5QnpaV0Z5WTJncE8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG14dlp5Z29iRzlqWVhScGIyNHVjSEp2ZEc5amIyd2dLeUJzYjJOaGRHbHZiaTVvYjNOMElDc2diRzlqWVhScGIyNHVjMlZoY21Ob0tTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG14dlp5Z29jM1JsY0M1a1lYUmhMblZ5YkM1d2NtOTBiMk52YkNBcklITjBaWEF1WkdGMFlTNTFjbXd1YUc5emRDQXJJSE4wWlhBdVpHRjBZUzUxY213dWMyVmhjbU5vS1NrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklFbG1JSGRsSUdoaGRtVWdibTkwSUdOb1lXNW5aV1FnZEdobElHRmpkSFZoYkNCc2IyTmhkR2x2Yml3Z2RHaGxiaUIwYUdVZ2JHOWpZWFJwYjI0dWNtVndiR0ZqWlZ4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnZDJsc2JDQnViM1FnWjI4Z1lXNTVkMmhsY21WY2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNocGMxTmhiV1ZWVWt3cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWNtVnNiMkZrS0hSeWRXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzNSbGNDNWxkbVZ1ZEU1aGJXVWdQVDBnSjNScGJXVnZkWFFuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmhkR1V1WVhWMGIxSjFiaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKMWJrNWxlSFJUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdzSUhSdlUydHBjQ3dnYzNSbGNDNWtZWFJoTG1GdGIzVnVkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdiRzlqWVhSdmNpQTlJSE4wWlhBdVpHRjBZUzVzYjJOaGRHOXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE4wWlhCeklEMGdjMk5sYm1GeWFXOHVjM1JsY0hNN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2RXNXBjWFZsU1dRZ1BTQm5aWFJWYm1seGRXVkpaRVp5YjIxVGRHVndLSE4wWlhBcE8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QjBjbmtnZEc4Z1oyVjBJSEpwWkNCdlppQjFibTVsWTJWemMyRnllU0J6ZEdWd2MxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCMGIxTnJhWEJiZFc1cGNYVmxTV1JkSUQwOUlDZDFibVJsWm1sdVpXUW5JQ1ltSUhWMGJXVXVjM1JoZEdVdWNuVnVMbk53WldWa0lDRTlJQ2R5WldGc2RHbHRaU2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHUnBabVk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCcFoyNXZjbVVnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhaUE5SUhOMFpYQnpMbXhsYm1kMGFDQXRJREU3SUdvZ1BpQnBaSGc3SUdvdExTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCdmRHaGxjbE4wWlhBZ1BTQnpkR1Z3YzF0cVhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYjNSb1pYSlZibWx4ZFdWSlpDQTlJR2RsZEZWdWFYRjFaVWxrUm5KdmJWTjBaWEFvYjNSb1pYSlRkR1Z3S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kVzVwY1hWbFNXUWdQVDA5SUc5MGFHVnlWVzVwY1hWbFNXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDZ2haR2xtWmlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdScFptWWdQU0FvYjNSb1pYSlRkR1Z3TG5ScGJXVlRkR0Z0Y0NBdElITjBaWEF1ZEdsdFpWTjBZVzF3S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWjI1dmNtVWdQU0FoYVhOSmJYQnZjblJoYm5SVGRHVndLRzkwYUdWeVUzUmxjQ2tnSmlZZ1pHbG1aaUE4SUdsdGNHOXlkR0Z1ZEZOMFpYQk1aVzVuZEdnN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2x6U1c1MFpYSmhZM1JwZG1WVGRHVndLRzkwYUdWeVUzUmxjQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWjI1dmNtVWdQU0JtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGIxTnJhWEJiZFc1cGNYVmxTV1JkSUQwZ2FXZHViM0psTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJYWlNkeVpTQnphMmx3Y0dsdVp5QjBhR2x6SUdWc1pXMWxiblJjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwYjFOcmFYQmJaMlYwVlc1cGNYVmxTV1JHY205dFUzUmxjQ2h6ZEdWd0tWMHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5ZFc1T1pYaDBVM1JsY0NoelkyVnVZWEpwYnl3Z2FXUjRMQ0IwYjFOcmFYQXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGNubFZiblJwYkVadmRXNWtLSE5qWlc1aGNtbHZMQ0J6ZEdWd0xDQnNiMk5oZEc5eUxDQm5aWFJVYVcxbGIzVjBLSE5qWlc1aGNtbHZMQ0JwWkhncEtTNTBhR1Z1S0daMWJtTjBhVzl1SUNobGJHVnpLU0I3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJsYkdVZ1BTQmxiR1Z6V3pCZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhSaFowNWhiV1VnUFNCbGJHVXVkR0ZuVG1GdFpTNTBiMHh2ZDJWeVEyRnpaU2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE4xY0hCdmNuUnpTVzV3ZFhSRmRtVnVkQ0E5SUhSaFowNWhiV1VnUFQwOUlDZHBibkIxZENjZ2ZId2dkR0ZuVG1GdFpTQTlQVDBnSjNSbGVIUmhjbVZoSnlCOGZDQmxiR1V1WjJWMFFYUjBjbWxpZFhSbEtDZGpiMjUwWlc1MFpXUnBkR0ZpYkdVbktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHVjJaVzUwY3k1cGJtUmxlRTltS0hOMFpYQXVaWFpsYm5ST1lXMWxLU0ErUFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnZjSFJwYjI1eklEMGdlMzA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdWd0xtUmhkR0V1WW5WMGRHOXVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiM0IwYVc5dWN5NTNhR2xqYUNBOUlHOXdkR2x2Ym5NdVluVjBkRzl1SUQwZ2MzUmxjQzVrWVhSaExtSjFkSFJ2Ymp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDOHZJR052Ym5OdmJHVXViRzluS0NkVGFXMTFiR0YwYVc1bklDY2dLeUJ6ZEdWd0xtVjJaVzUwVG1GdFpTQXJJQ2NnYjI0Z1pXeGxiV1Z1ZENBbkxDQmxiR1VzSUd4dlkyRjBiM0l1YzJWc1pXTjBiM0p6V3pCZExDQmNJaUJtYjNJZ2MzUmxjQ0JjSWlBcklHbGtlQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuWTJ4cFkyc25LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdKQ2hsYkdVcExuUnlhV2RuWlhJb0oyTnNhV05ySnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkbWIyTjFjeWNnZkh3Z2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oySnNkWEluS1NBbUppQmxiR1ZiYzNSbGNDNWxkbVZ1ZEU1aGJXVmRLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaV3hsVzNOMFpYQXVaWFpsYm5ST1lXMWxYU2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZOcGJYVnNZWFJsVzNOMFpYQXVaWFpsYm5ST1lXMWxYU2hsYkdVc0lHOXdkR2x2Ym5NcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ6ZEdWd0xtUmhkR0V1ZG1Gc2RXVWdJVDBnWENKMWJtUmxabWx1WldSY0lpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnNaUzUyWVd4MVpTQTlJSE4wWlhBdVpHRjBZUzUyWVd4MVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdkx5QkdiM0lnWW5KdmQzTmxjbk1nZEdoaGRDQnpkWEJ3YjNKMElIUm9aU0JwYm5CMWRDQmxkbVZ1ZEM1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzVndjRzl5ZEhOSmJuQjFkRVYyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNWxkbVZ1ZENobGJHVXNJQ2RwYm5CMWRDY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlM1bGRtVnVkQ2hsYkdVc0lDZGphR0Z1WjJVbktUc2dMeThnVkdocGN5QnphRzkxYkdRZ1ltVWdabWx5WldRZ1lXWjBaWElnWVNCaWJIVnlJR1YyWlc1MExseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHVndMbVYyWlc1MFRtRnRaU0E5UFNBbmEyVjVjSEpsYzNNbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnJaWGtnUFNCVGRISnBibWN1Wm5KdmJVTm9ZWEpEYjJSbEtITjBaWEF1WkdGMFlTNXJaWGxEYjJSbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1YTJWNVpHOTNiaWhsYkdVc0lHdGxlU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtdGxlWEJ5WlhOektHVnNaU3dnYTJWNUtUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVXVkbUZzZFdVZ1BTQnpkR1Z3TG1SaGRHRXVkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbVYyWlc1MEtHVnNaU3dnSjJOb1lXNW5aU2NwTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbXRsZVhWd0tHVnNaU3dnYTJWNUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjFjSEJ2Y25SelNXNXdkWFJGZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdVMmx0ZFd4aGRHVXVaWFpsYm5Rb1pXeGxMQ0FuYVc1d2RYUW5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKM1poYkdsa1lYUmxKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnlnblZtRnNhV1JoZEdVNklDY2dLeUJLVTA5T0xuTjBjbWx1WjJsbWVTaHNiMk5oZEc5eUxuTmxiR1ZqZEc5eWN5a2dJQ3NnWENJZ1kyOXVkR0ZwYm5NZ2RHVjRkQ0FuWENJZ0lDc2djM1JsY0M1a1lYUmhMblJsZUhRZ0t5QmNJaWRjSWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR0YwWlM1aGRYUnZVblZ1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYms1bGVIUlRkR1Z3S0hOalpXNWhjbWx2TENCcFpIZ3NJSFJ2VTJ0cGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN3Z1puVnVZM1JwYjI0Z0tISmxjM1ZzZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0ozWmhiR2xrWVhSbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVZtRnNhV1JoZEdVNklGd2lJQ3NnY21WemRXeDBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5OMGIzQlRZMlZ1WVhKcGJ5aG1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYVhOSmJYQnZjblJoYm5SVGRHVndLSE4wWlhBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRVZ5Y205eUtGd2lSbUZwYkdWa0lHOXVJSE4wWlhBNklGd2lJQ3NnYVdSNElDc2dYQ0lnSUVWMlpXNTBPaUJjSWlBcklITjBaWEF1WlhabGJuUk9ZVzFsSUNzZ1hDSWdVbVZoYzI5dU9pQmNJaUFySUhKbGMzVnNkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBiM0JUWTJWdVlYSnBieWhtWVd4elpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hObGRIUnBibWR6TG1kbGRDZ25kbVZ5WW05elpTY3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aHlaWE4xYkhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmhkR1V1WVhWMGIxSjFiaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY25WdVRtVjRkRk4wWlhBb2MyTmxibUZ5YVc4c0lHbGtlQ3dnZEc5VGEybHdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMWNibHh1Wm5WdVkzUnBiMjRnZDJGcGRFWnZja0Z1WjNWc1lYSW9jbTl2ZEZObGJHVmpkRzl5S1NCN1hHNGdJQ0FnZG1GeUlHVnNJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpaHliMjkwVTJWc1pXTjBiM0lwTzF4dUlDQWdJSEpsZEhWeWJpQnVaWGNnVUhKdmJXbHpaU2htZFc1amRHbHZiaUFvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUhSeWVTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9JWGRwYm1SdmR5NWhibWQxYkdGeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZGhibWQxYkdGeUlHTnZkV3hrSUc1dmRDQmlaU0JtYjNWdVpDQnZiaUIwYUdVZ2QybHVaRzkzSnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWVc1bmRXeGhjaTVuWlhSVVpYTjBZV0pwYkdsMGVTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0Z1WjNWc1lYSXVaMlYwVkdWemRHRmlhV3hwZEhrb1pXd3BMbmRvWlc1VGRHRmliR1VvY21WemIyeDJaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doWVc1bmRXeGhjaTVsYkdWdFpXNTBLR1ZzS1M1cGJtcGxZM1J2Y2lncEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduY205dmRDQmxiR1Z0Wlc1MElDZ25JQ3NnY205dmRGTmxiR1ZqZEc5eUlDc2dKeWtnYUdGeklHNXZJR2x1YW1WamRHOXlMaWNnSzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSnlCMGFHbHpJRzFoZVNCdFpXRnVJR2wwSUdseklHNXZkQ0JwYm5OcFpHVWdibWN0WVhCd0xpY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JoYm1kMWJHRnlMbVZzWlcxbGJuUW9aV3dwTG1sdWFtVmpkRzl5S0NrdVoyVjBLQ2NrWW5KdmQzTmxjaWNwTGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc1dmRHbG1lVmRvWlc1T2IwOTFkSE4wWVc1a2FXNW5VbVZ4ZFdWemRITW9jbVZ6YjJ4MlpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMGdZMkYwWTJnZ0tHVnljaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVZxWldOMEtHVnljaWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5S1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnYVhOSmJYQnZjblJoYm5SVGRHVndLSE4wWlhBcElIdGNiaUFnSUNCeVpYUjFjbTRnYzNSbGNDNWxkbVZ1ZEU1aGJXVWdJVDBnSjIxdmRYTmxiR1ZoZG1VbklDWW1YRzRnSUNBZ0lDQWdJQ0FnSUhOMFpYQXVaWFpsYm5ST1lXMWxJQ0U5SUNkdGIzVnpaVzkxZENjZ0ppWmNiaUFnSUNBZ0lDQWdJQ0FnYzNSbGNDNWxkbVZ1ZEU1aGJXVWdJVDBnSjIxdmRYTmxaVzUwWlhJbklDWW1YRzRnSUNBZ0lDQWdJQ0FnSUhOMFpYQXVaWFpsYm5ST1lXMWxJQ0U5SUNkdGIzVnpaVzkyWlhJbklDWW1YRzRnSUNBZ0lDQWdJQ0FnSUhOMFpYQXVaWFpsYm5ST1lXMWxJQ0U5SUNkaWJIVnlKeUFtSmx4dUlDQWdJQ0FnSUNBZ0lDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5abTlqZFhNbk8xeHVmVnh1WEc0dktpcGNiaUFxSUZKbGRIVnlibk1nZEhKMVpTQnBaaUIwYUdVZ1oybDJaVzRnYzNSbGNDQnBjeUJ6YjIxbElITnZjblFnYjJZZ2RYTmxjaUJwYm5SbGNtRmpkR2x2Ymx4dUlDb3ZYRzVtZFc1amRHbHZiaUJwYzBsdWRHVnlZV04wYVhabFUzUmxjQ2h6ZEdWd0tTQjdYRzRnSUNBZ2RtRnlJR1YyZENBOUlITjBaWEF1WlhabGJuUk9ZVzFsTzF4dVhHNGdJQ0FnTHlwY2JpQWdJQ0FnSUNBdkx5QkpiblJsY21WemRHbHVaeUJ1YjNSbExDQmtiMmx1WnlCMGFHVWdabTlzYkc5M2FXNW5JSGRoY3lCallYVnphVzVuSUhSb2FYTWdablZ1WTNScGIyNGdkRzhnY21WMGRYSnVJSFZ1WkdWbWFXNWxaQzVjYmlBZ0lDQWdJQ0J5WlhSMWNtNWNiaUFnSUNBZ0lDQWdJQ0FnWlhaMExtbHVaR1Y0VDJZb1hDSnRiM1Z6WlZ3aUtTQWhQVDBnTUNCOGZGeHVJQ0FnSUNBZ0lDQWdJQ0JsZG5RdWFXNWtaWGhQWmloY0ltMXZkWE5sWkc5M2Jsd2lLU0E5UFQwZ01DQjhmRnh1SUNBZ0lDQWdJQ0FnSUNCbGRuUXVhVzVrWlhoUFppaGNJbTF2ZFhObGRYQmNJaWtnUFQwOUlEQTdYRzVjYmlBZ0lDQWdJQ0F2THlCSmRITWdZbVZqWVhWelpTQjBhR1VnWTI5dVpHbDBhVzl1Y3lCM1pYSmxJRzV2ZENCdmJpQjBhR1VnYzJGdFpTQnNhVzVsSUdGeklIUm9aU0J5WlhSMWNtNGdjM1JoZEdWdFpXNTBYRzRnSUNBZ0tpOWNiaUFnSUNCeVpYUjFjbTRnWlhaMExtbHVaR1Y0VDJZb1hDSnRiM1Z6WlZ3aUtTQWhQVDBnTUNCOGZDQmxkblF1YVc1a1pYaFBaaWhjSW0xdmRYTmxaRzkzYmx3aUtTQTlQVDBnTUNCOGZDQmxkblF1YVc1a1pYaFBaaWhjSW0xdmRYTmxkWEJjSWlrZ1BUMDlJREE3WEc1OVhHNWNibVoxYm1OMGFXOXVJSFJ5ZVZWdWRHbHNSbTkxYm1Rb2MyTmxibUZ5YVc4c0lITjBaWEFzSUd4dlkyRjBiM0lzSUhScGJXVnZkWFFzSUhSbGVIUlViME5vWldOcktTQjdYRzRnSUNBZ2RtRnlJSE4wWVhKMFpXUTdYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUlDaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lDQWdablZ1WTNScGIyNGdkSEo1Um1sdVpDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doYzNSaGNuUmxaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYSjBaV1FnUFNCdVpYY2dSR0YwWlNncExtZGxkRlJwYldVb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHVnNaWE03WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWm05MWJtUlViMjlOWVc1NUlEMGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ1ptOTFibVJXWVd4cFpDQTlJR1poYkhObE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHWnZkVzVrUkdsbVptVnlaVzUwVkdWNGRDQTlJR1poYkhObE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITmxiR1ZqZEc5eWMxUnZWR1Z6ZENBOUlHeHZZMkYwYjNJdWMyVnNaV04wYjNKekxuTnNhV05sS0RBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlIUmxlSFJVYjBOb1pXTnJJRDBnYzNSbGNDNWtZWFJoTG5SbGVIUTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdZMjl0Y0dGeWFYTnZiaUE5SUhOMFpYQXVaR0YwWVM1amIyMXdZWEpwYzI5dUlIeDhJRndpWlhGMVlXeHpYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpaV3hsWTNSdmNuTlViMVJsYzNRdWRXNXphR2xtZENnblcyUmhkR0V0ZFc1cGNYVmxMV2xrUFZ3aUp5QXJJR3h2WTJGMGIzSXVkVzVwY1hWbFNXUWdLeUFuWENKZEp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElITmxiR1ZqZEc5eWMxUnZWR1Z6ZEM1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCelpXeGxZM1J2Y2lBOUlITmxiR1ZqZEc5eWMxUnZWR1Z6ZEZ0cFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYVhOSmJYQnZjblJoYm5SVGRHVndLSE4wWlhBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGJHVmpkRzl5SUNzOUlGd2lPblpwYzJsaWJHVmNJanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWld4bGN5QTlJQ1FvYzJWc1pXTjBiM0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaGxiR1Z6TG14bGJtZDBhQ0E5UFNBeEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2RHVjRkRlJ2UTJobFkyc2dJVDBnSjNWdVpHVm1hVzVsWkNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ1WlhkVVpYaDBJRDBnSkNobGJHVnpXekJkS1M1MFpYaDBLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0tHTnZiWEJoY21semIyNGdQVDA5SUNkbGNYVmhiSE1uSUNZbUlHNWxkMVJsZUhRZ1BUMDlJSFJsZUhSVWIwTm9aV05yS1NCOGZGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ2hqYjIxd1lYSnBjMjl1SUQwOVBTQW5ZMjl1ZEdGcGJuTW5JQ1ltSUc1bGQxUmxlSFF1YVc1a1pYaFBaaWgwWlhoMFZHOURhR1ZqYXlrZ1BqMGdNQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1iM1Z1WkZaaGJHbGtJRDBnZEhKMVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTkxYm1SRWFXWm1aWEpsYm5SVVpYaDBJRDBnZEhKMVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1p2ZFc1a1ZtRnNhV1FnUFNCMGNuVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaV3hsY3k1aGRIUnlLQ2RrWVhSaExYVnVhWEYxWlMxcFpDY3NJR3h2WTJGMGIzSXVkVzVwY1hWbFNXUXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNobGJHVnpMbXhsYm1kMGFDQStJREVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTkxYm1SVWIyOU5ZVzU1SUQwZ2RISjFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2htYjNWdVpGWmhiR2xrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNobGJHVnpLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9hWE5KYlhCdmNuUmhiblJUZEdWd0tITjBaWEFwSUNZbUlDaHVaWGNnUkdGMFpTZ3BMbWRsZEZScGJXVW9LU0F0SUhOMFlYSjBaV1FwSUR3Z2RHbHRaVzkxZENBcUlEVXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WlhSVWFXMWxiM1YwS0hSeWVVWnBibVFzSURVd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlISmxjM1ZzZENBOUlGd2lYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHWnZkVzVrVkc5dlRXRnVlU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE4xYkhRZ1BTQW5RMjkxYkdRZ2JtOTBJR1pwYm1RZ1lYQndjbTl3Y21saGRHVWdaV3hsYldWdWRDQm1iM0lnYzJWc1pXTjBiM0p6T2lBbklDc2dTbE5QVGk1emRISnBibWRwWm5rb2JHOWpZWFJ2Y2k1elpXeGxZM1J2Y25NcElDc2dYQ0lnWm05eUlHVjJaVzUwSUZ3aUlDc2djM1JsY0M1bGRtVnVkRTVoYldVZ0t5QmNJaTRnSUZKbFlYTnZiam9nUm05MWJtUWdWRzl2SUUxaGJua2dSV3hsYldWdWRITmNJanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dadmRXNWtSR2xtWm1WeVpXNTBWR1Y0ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOMWJIUWdQU0FuUTI5MWJHUWdibTkwSUdacGJtUWdZWEJ3Y205d2NtbGhkR1VnWld4bGJXVnVkQ0JtYjNJZ2MyVnNaV04wYjNKek9pQW5JQ3NnU2xOUFRpNXpkSEpwYm1kcFpua29iRzlqWVhSdmNpNXpaV3hsWTNSdmNuTXBJQ3NnWENJZ1ptOXlJR1YyWlc1MElGd2lJQ3NnYzNSbGNDNWxkbVZ1ZEU1aGJXVWdLeUJjSWk0Z0lGSmxZWE52YmpvZ1ZHVjRkQ0JrYjJWemJpZDBJRzFoZEdOb0xpQWdYRnh1Ulhod1pXTjBaV1E2WEZ4dVhDSWdLeUIwWlhoMFZHOURhR1ZqYXlBcklGd2lYRnh1WW5WMElIZGhjMXhjYmx3aUlDc2daV3hsY3k1MFpYaDBLQ2tnS3lCY0lseGNibHdpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjM1ZzZENBOUlDZERiM1ZzWkNCdWIzUWdabWx1WkNCaGNIQnliM0J5YVdGMFpTQmxiR1Z0Wlc1MElHWnZjaUJ6Wld4bFkzUnZjbk02SUNjZ0t5QktVMDlPTG5OMGNtbHVaMmxtZVNoc2IyTmhkRzl5TG5ObGJHVmpkRzl5Y3lrZ0t5QmNJaUJtYjNJZ1pYWmxiblFnWENJZ0t5QnpkR1Z3TG1WMlpXNTBUbUZ0WlNBcklGd2lMaUFnVW1WaGMyOXVPaUJPYnlCbGJHVnRaVzUwY3lCbWIzVnVaRndpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpXcGxZM1FvY21WemRXeDBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUhaaGNpQnNhVzFwZENBOUlHbHRjRzl5ZEdGdWRGTjBaWEJNWlc1bmRHZ2dMeUFvZFhSdFpTNXpkR0YwWlM1eWRXNHVjM0JsWldRZ1BUMGdKM0psWVd4MGFXMWxKeUEvSUNjeEp5QTZJSFYwYldVdWMzUmhkR1V1Y25WdUxuTndaV1ZrS1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2RzYjJKaGJDNWhibWQxYkdGeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCM1lXbDBSbTl5UVc1bmRXeGhjaWduVzI1bkxXRndjRjBuS1M1MGFHVnVLR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6ZEdGMFpTNXlkVzR1YzNCbFpXUWdQVDA5SUNkeVpXRnNkR2x0WlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvZEhKNVJtbHVaQ3dnZEdsdFpXOTFkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvZFhSdFpTNXpkR0YwWlM1eWRXNHVjM0JsWldRZ1BUMDlJQ2RtWVhOMFpYTjBKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RISjVSbWx1WkNncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBWR2x0Wlc5MWRDaDBjbmxHYVc1a0xDQk5ZWFJvTG0xcGJpaDBhVzFsYjNWMElDb2dkWFJ0WlM1emRHRjBaUzV5ZFc0dWMzQmxaV1FzSUd4cGJXbDBLU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWMzUmhkR1V1Y25WdUxuTndaV1ZrSUQwOVBTQW5jbVZoYkhScGJXVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMFZHbHRaVzkxZENoMGNubEdhVzVrTENCMGFXMWxiM1YwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvZFhSdFpTNXpkR0YwWlM1eWRXNHVjM0JsWldRZ1BUMDlJQ2RtWVhOMFpYTjBKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSeWVVWnBibVFvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlYwVkdsdFpXOTFkQ2gwY25sR2FXNWtMQ0JOWVhSb0xtMXBiaWgwYVcxbGIzVjBJQ29nZFhSdFpTNXpkR0YwWlM1eWRXNHVjM0JsWldRc0lHeHBiV2wwS1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5S1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWjJWMFZHbHRaVzkxZENoelkyVnVZWEpwYnl3Z2FXUjRLU0I3WEc0Z0lDQWdhV1lnS0dsa2VDQStJREFwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdTV1lnZEdobElIQnlaWFpwYjNWeklITjBaWEFnYVhNZ1lTQjJZV3hwWkdGMFpTQnpkR1Z3TENCMGFHVnVJR3AxYzNRZ2JXOTJaU0J2Yml3Z1lXNWtJSEJ5WlhSbGJtUWdhWFFnYVhOdUozUWdkR2hsY21WY2JpQWdJQ0FnSUNBZ0x5OGdUM0lnYVdZZ2FYUWdhWE1nWVNCelpYSnBaWE1nYjJZZ2EyVjVjeXdnZEdobGJpQm5iMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyTmxibUZ5YVc4dWMzUmxjSE5iYVdSNElDMGdNVjB1WlhabGJuUk9ZVzFsSUQwOUlDZDJZV3hwWkdGMFpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBd08xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIaGRMblJwYldWVGRHRnRjQ0F0SUhOalpXNWhjbWx2TG5OMFpYQnpXMmxrZUNBdElERmRMblJwYldWVGRHRnRjRHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SURBN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUhKMWJrNWxlSFJUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdzSUhSdlUydHBjQ3dnZEdsdFpXOTFkQ2tnZTF4dUlDQWdJQzh2SUUxaGEyVWdjM1Z5WlNCM1pTQmhjbVZ1SjNRZ1oyOXBibWNnZEc4Z2IzWmxjbVpzYjNjZ2RHaGxJR05oYkd3Z2MzUmhZMnN1WEc0Z0lDQWdjMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZMbk4wWlhCekxteGxibWQwYUNBK0lDaHBaSGdnS3lBeEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NuVnVVM1JsY0NoelkyVnVZWEpwYnl3Z2FXUjRJQ3NnTVN3Z2RHOVRhMmx3S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWMzUnZjRk5qWlc1aGNtbHZLSFJ5ZFdVcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTd2dkR2x0Wlc5MWRDQjhmQ0F3S1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWm5KaFoyMWxiblJHY205dFUzUnlhVzVuS0hOMGNraFVUVXdwSUh0Y2JpQWdJQ0IyWVhJZ2RHVnRjQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KM1JsYlhCc1lYUmxKeWs3WEc0Z0lDQWdkR1Z0Y0M1cGJtNWxja2hVVFV3Z1BTQnpkSEpJVkUxTU8xeHVJQ0FnSUM4dklHTnZibk52YkdVdWJHOW5LSFJsYlhBdWFXNXVaWEpJVkUxTUtUdGNiaUFnSUNCeVpYUjFjbTRnZEdWdGNDNWpiMjUwWlc1MElEOGdkR1Z0Y0M1amIyNTBaVzUwSURvZ2RHVnRjRHRjYm4xY2JseHVablZ1WTNScGIyNGdaMlYwVlc1cGNYVmxTV1JHY205dFUzUmxjQ2h6ZEdWd0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUhOMFpYQWdKaVlnYzNSbGNDNWtZWFJoSUNZbUlITjBaWEF1WkdGMFlTNXNiMk5oZEc5eUlDWW1JSE4wWlhBdVpHRjBZUzVzYjJOaGRHOXlMblZ1YVhGMVpVbGtPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQm1hV3gwWlhKRmVIUnlZVXh2WVdSektITjBaWEJ6S1NCN1hHNGdJSFpoY2lCeVpYTjFiSFFnUFNCYlhUdGNiaUFnZG1GeUlITmxaVzVNYjJGa0lEMGdabUZzYzJVN1hHNGdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzNSbGNITXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0IyWVhJZ2FYTk1iMkZrSUQwZ2MzUmxjSE5iYVYwdVpYWmxiblJPWVcxbElEMDlQU0FuYkc5aFpDYzdYRzRnSUNBZ2FXWWdLQ0Z6WldWdVRHOWhaQ0I4ZkNBaGFYTk1iMkZrS1NCN1hHNGdJQ0FnSUNCeVpYTjFiSFF1Y0hWemFDaHpkR1Z3YzF0cFhTazdYRzRnSUNBZ0lDQnpaV1Z1VEc5aFpDQTlJSE5sWlc1TWIyRmtJSHg4SUdselRHOWhaRHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdjbVYwZFhKdUlISmxjM1ZzZER0Y2JuMDdYRzVjYm5aaGNpQm5kV2xrSUQwZ0tHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQm1kVzVqZEdsdmJpQnpOQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUUxaGRHZ3VabXh2YjNJb0tERWdLeUJOWVhSb0xuSmhibVJ2YlNncEtTQXFJREI0TVRBd01EQXBYRzRnSUNBZ0lDQWdJQ0FnSUNBdWRHOVRkSEpwYm1jb01UWXBYRzRnSUNBZ0lDQWdJQ0FnSUNBdWMzVmljM1J5YVc1bktERXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2N6UW9LU0FySUhNMEtDa2dLeUFuTFNjZ0t5QnpOQ2dwSUNzZ0p5MG5JQ3NnY3pRb0tTQXJJQ2N0SnlBclhHNGdJQ0FnSUNBZ0lDQWdJQ0J6TkNncElDc2dKeTBuSUNzZ2N6UW9LU0FySUhNMEtDa2dLeUJ6TkNncE8xeHVJQ0FnSUgwN1hHNTlLU2dwTzF4dVhHNTJZWElnYkdsemRHVnVaWEp6SUQwZ1cxMDdYRzUyWVhJZ2MzUmhkR1U3WEc1MllYSWdjMlYwZEdsdVozTTdYRzUyWVhJZ2RYUnRaU0E5SUh0Y2JpQWdJQ0J6ZEdGMFpUb2djM1JoZEdVc1hHNGdJQ0FnYVc1cGREb2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdjMk5sYm1GeWFXOGdQU0JuWlhSUVlYSmhiV1YwWlhKQ2VVNWhiV1VvSjNWMGJXVmZjMk5sYm1GeWFXOG5LVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFYwYldVdWJHOWhaRk5sZEhScGJtZHpLQ2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCc2IyTmhiRk4wYjNKaFoyVXVZMnhsWVhJb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlNBOUlIVjBiV1V1YzNSaGRHVWdQU0IxZEcxbExteHZZV1JUZEdGMFpVWnliMjFUZEc5eVlXZGxLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNWljbTloWkdOaGMzUW9KMGxPU1ZSSlFVeEpXa1ZFSnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBWR2x0Wlc5MWRDaG1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5SbGMzUlRaWEoyWlhJZ1BTQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9YQ0oxZEcxbFgzUmxjM1JmYzJWeWRtVnlYQ0lwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1aGRYUnZVblZ1SUQwZ2RISjFaVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnY25WdVEyOXVabWxuSUQwZ1oyVjBVR0Z5WVcxbGRHVnlRbmxPWVcxbEtDZDFkRzFsWDNKMWJsOWpiMjVtYVdjbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tISjFia052Ym1acFp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjblZ1UTI5dVptbG5JRDBnU2xOUFRpNXdZWEp6WlNoeWRXNURiMjVtYVdjcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISjFia052Ym1acFp5QTlJSEoxYmtOdmJtWnBaeUI4ZkNCN2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITndaV1ZrSUQwZ1oyVjBVR0Z5WVcxbGRHVnlRbmxPWVcxbEtDZDFkRzFsWDNKMWJsOXpjR1ZsWkNjcElIeDhJSE5sZEhScGJtZHpMbWRsZENoY0luSjFibTVsY2k1emNHVmxaRndpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOd1pXVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5ZFc1RGIyNW1hV2N1YzNCbFpXUWdQU0J6Y0dWbFpEdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNuVnVVMk5sYm1GeWFXOG9jMk5sYm1GeWFXOHNJSEoxYmtOdmJtWnBaeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN3Z01qQXdNQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsSUQwZ2RYUnRaUzV6ZEdGMFpTQTlJSFYwYldVdWJHOWhaRk4wWVhSbFJuSnZiVk4wYjNKaFoyVW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25TVTVKVkVsQlRFbGFSVVFuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JoZEdVdWMzUmhkSFZ6SUQwOVBTQmNJbEJNUVZsSlRrZGNJaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6ZEdGMFpTNXlkVzR1YzJObGJtRnlhVzhzSUhOMFlYUmxMbkoxYmk1emRHVndTVzVrWlhncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9JWE4wWVhSbExuTjBZWFIxY3lCOGZDQnpkR0YwWlM1emRHRjBkWE1nUFQwOUlDZEpUa2xVU1VGTVNWcEpUa2NuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSbExuTjBZWFIxY3lBOUlGd2lURTlCUkVWRVhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHSnliMkZrWTJGemREb2dablZ1WTNScGIyNGdLR1YyZEN3Z1pYWjBSR0YwWVNrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYkdsemRHVnVaWEp6SUNZbUlHeHBjM1JsYm1WeWN5NXNaVzVuZEdncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2JHbHpkR1Z1WlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYkdsemRHVnVaWEp6VzJsZEtHVjJkQ3dnWlhaMFJHRjBZU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lITjBZWEowVW1WamIzSmthVzVuT2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoemRHRjBaUzV6ZEdGMGRYTWdJVDBnSjFKRlEwOVNSRWxPUnljcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJQ2RTUlVOUFVrUkpUa2NuTzF4dUlDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdWMzUmxjSE1nUFNCYlhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFRHOW5LRndpVW1WamIzSmthVzVuSUZOMFlYSjBaV1JjSWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25Va1ZEVDFKRVNVNUhYMU5VUVZKVVJVUW5LVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eVpXZHBjM1JsY2tWMlpXNTBLRndpYkc5aFpGd2lMQ0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhKc09pQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhCeWIzUnZZMjlzT2lCM2FXNWtiM2N1Ykc5allYUnBiMjR1Y0hKdmRHOWpiMndzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHaHZjM1E2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTVvYjNOMExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WldGeVkyZzZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNXpaV0Z5WTJnc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2hoYzJnNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b1lYTm9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjblZ1VTJObGJtRnlhVzg2SUdaMWJtTjBhVzl1SUNodVlXMWxMQ0JqYjI1bWFXY3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlIUnZVblZ1SUQwZ2JtRnRaU0I4ZkNCd2NtOXRjSFFvSjFOalpXNWhjbWx2SUhSdklISjFiaWNwTzF4dUlDQWdJQ0FnSUNCMllYSWdZWFYwYjFKMWJpQTlJQ0Z1WVcxbElEOGdjSEp2YlhCMEtDZFhiM1ZzWkNCNWIzVWdiR2xyWlNCMGJ5QnpkR1Z3SUhSb2NtOTFaMmdnWldGamFDQnpkR1Z3SUNoNWZHNHBQeWNwSUNFOUlDZDVKeUE2SUhSeWRXVTdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQm5aWFJUWTJWdVlYSnBieWgwYjFKMWJpa3VkR2hsYmlobWRXNWpkR2x2YmlBb2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhOalpXNWhjbWx2SUQwZ1NsTlBUaTV3WVhKelpTaEtVMDlPTG5OMGNtbHVaMmxtZVNoelkyVnVZWEpwYnlrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXpkR0YwWlM1eWRXNGdQU0JmTG1WNGRHVnVaQ2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNCbFpXUTZJQ2h6WlhSMGFXNW5jeUFtSmlCelpYUjBhVzVuY3k1blpYUW9YQ0p5ZFc1dVpYSXVjM0JsWldSY0lpa3BJSHg4SUZ3aU1UQmNJbHh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTd2dZMjl1Wm1sbktUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2MyVjBkWEJEYjI1a2FYUnBiMjV6S0hOalpXNWhjbWx2S1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzVoZFhSdlVuVnVJRDBnWVhWMGIxSjFiaUE5UFQwZ2RISjFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTNXpkR0YwZFhNZ1BTQmNJbEJNUVZsSlRrZGNJanRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOalpXNWhjbWx2TG5OMFpYQnpJRDBnWm1sc2RHVnlSWGgwY21GTWIyRmtjeWh6WTJWdVlYSnBieTV6ZEdWd2N5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE4wWVhKMGFXNW5JRk5qWlc1aGNtbHZJQ2RjSWlBcklHNWhiV1VnS3lCY0lpZGNJaXdnYzJObGJtRnlhVzhwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RRVEVGWlFrRkRTMTlUVkVGU1ZFVkVKeWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNVRkR1Z3S0hOalpXNWhjbWx2TENBd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISjFiazVsZUhSVGRHVndPaUJ5ZFc1T1pYaDBVM1JsY0N4Y2JpQWdJQ0J6ZEc5d1UyTmxibUZ5YVc4NklHWjFibU4wYVc5dUlDaHpkV05qWlhOektTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCelkyVnVZWEpwYnlBOUlITjBZWFJsTG5KMWJpQW1KaUJ6ZEdGMFpTNXlkVzR1YzJObGJtRnlhVzg3WEc0Z0lDQWdJQ0FnSUdSbGJHVjBaU0J6ZEdGMFpTNXlkVzQ3WEc0Z0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJRndpVEU5QlJFVkVYQ0k3WEc0Z0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RRVEVGWlFrRkRTMTlUVkU5UVVFVkVKeWs3WEc1Y2JpQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvWENKVGRHOXdjR2x1WnlCVFkyVnVZWEpwYjF3aUtUdGNiaUFnSUNBZ0lDQWdhV1lnS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzVmpZMlZ6Y3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBVM1ZqWTJWemN5aGNJbHRUVlVORFJWTlRYU0JUWTJWdVlYSnBieUFuWENJZ0t5QnpZMlZ1WVhKcGJ5NXVZVzFsSUNzZ1hDSW5JRU52YlhCc1pYUmxaQ0ZjSWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lVM1J2Y0hCcGJtY2diMjRnY0dGblpTQmNJaUFySUhkcGJtUnZkeTVzYjJOaGRHbHZiaTVvY21WbUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRVZ5Y205eUtGd2lXMFpCU1V4VlVrVmRJRk5qWlc1aGNtbHZJQ2RjSWlBcklITmpaVzVoY21sdkxtNWhiV1VnS3lCY0lpY2dVM1J2Y0hCbFpDRmNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nUTNKbFlYUmxjeUJoSUhSbGJYQnZjbUZ5ZVNCbGJHVnRaVzUwSUd4dlkyRjBiM0lzSUdadmNpQjFjMlVnZDJsMGFDQm1hVzVoYkdsNlpVeHZZMkYwYjNKY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JqY21WaGRHVkZiR1Z0Wlc1MFRHOWpZWFJ2Y2pvZ1puVnVZM1JwYjI0Z0tHVnNaVzFsYm5RcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhWdWFYRjFaVWxrSUQwZ1pXeGxiV1Z1ZEM1blpYUkJkSFJ5YVdKMWRHVW9YQ0prWVhSaExYVnVhWEYxWlMxcFpGd2lLU0I4ZkNCbmRXbGtLQ2s3WEc0Z0lDQWdJQ0FnSUdWc1pXMWxiblF1YzJWMFFYUjBjbWxpZFhSbEtGd2laR0YwWVMxMWJtbHhkV1V0YVdSY0lpd2dkVzVwY1hWbFNXUXBPMXh1WEc0Z0lDQWdJQ0FnSUhaaGNpQmxiR1ZJZEcxc0lEMGdaV3hsYldWdWRDNWpiRzl1WlU1dlpHVW9LUzV2ZFhSbGNraFVUVXc3WEc0Z0lDQWdJQ0FnSUhaaGNpQmxiR1ZUWld4bFkzUnZjbk1nUFNCYlhUdGNiaUFnSUNBZ0lDQWdhV1lnS0dWc1pXMWxiblF1ZEdGblRtRnRaUzUwYjFWd2NHVnlRMkZ6WlNncElEMDlJQ2RDVDBSWkp5QjhmQ0JsYkdWdFpXNTBMblJoWjA1aGJXVXVkRzlWY0hCbGNrTmhjMlVvS1NBOVBTQW5TRlJOVENjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWc1pWTmxiR1ZqZEc5eWN5QTlJRnRsYkdWdFpXNTBMblJoWjA1aGJXVmRPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pXeGxVMlZzWldOMGIzSnpJRDBnYzJWc1pXTjBiM0pHYVc1a1pYSW9aV3hsYldWdWRDd2daRzlqZFcxbGJuUXVZbTlrZVNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWdWFYRjFaVWxrT2lCMWJtbHhkV1ZKWkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5sYkdWamRHOXljem9nWld4bFUyVnNaV04wYjNKelhHNGdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lISmxaMmx6ZEdWeVJYWmxiblE2SUdaMWJtTjBhVzl1SUNobGRtVnVkRTVoYldVc0lHUmhkR0VzSUdsa2VDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzVwYzFKbFkyOXlaR2x1WnlncElIeDhJSFYwYldVdWFYTldZV3hwWkdGMGFXNW5LQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYVdSNElEMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXUjRJRDBnZFhSdFpTNXpkR0YwWlM1emRHVndjeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTNXpkR1Z3YzF0cFpIaGRJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWMlpXNTBUbUZ0WlRvZ1pYWmxiblJPWVcxbExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBiV1ZUZEdGdGNEb2dibVYzSUVSaGRHVW9LUzVuWlhSVWFXMWxLQ2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkdGMFlUb2daR0YwWVZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkRlZrVk9WRjlTUlVkSlUxUkZVa1ZFSnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhKbGNHOXlkRXh2WnpvZ1puVnVZM1JwYjI0Z0tHeHZaeXdnYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSEpsY0c5eWRFaGhibVJzWlhKeklDWW1JSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCeVpYQnZjblJJWVc1a2JHVnljeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjRzl5ZEVoaGJtUnNaWEp6VzJsZExteHZaeWhzYjJjc0lITmpaVzVoY21sdkxDQjFkRzFsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdjbVZ3YjNKMFJYSnliM0k2SUdaMWJtTjBhVzl1SUNobGNuSnZjaXdnYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSEpsY0c5eWRFaGhibVJzWlhKeklDWW1JSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCeVpYQnZjblJJWVc1a2JHVnljeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjRzl5ZEVoaGJtUnNaWEp6VzJsZExtVnljbTl5S0dWeWNtOXlMQ0J6WTJWdVlYSnBieXdnZFhSdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhKbGNHOXlkRk4xWTJObGMzTTZJR1oxYm1OMGFXOXVJQ2h0WlhOellXZGxMQ0J6WTJWdVlYSnBieWtnZTF4dUlDQWdJQ0FnSUNCcFppQW9jbVZ3YjNKMFNHRnVaR3hsY25NZ0ppWWdjbVZ3YjNKMFNHRnVaR3hsY25NdWJHVnVaM1JvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUhKbGNHOXlkRWhoYm1Sc1pYSnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVndiM0owU0dGdVpHeGxjbk5iYVYwdWMzVmpZMlZ6Y3lodFpYTnpZV2RsTENCelkyVnVZWEpwYnl3Z2RYUnRaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlMRnh1SUNBZ0lISmxaMmx6ZEdWeVRHbHpkR1Z1WlhJNklHWjFibU4wYVc5dUlDaG9ZVzVrYkdWeUtTQjdYRzRnSUNBZ0lDQWdJR3hwYzNSbGJtVnljeTV3ZFhOb0tHaGhibVJzWlhJcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnY21WbmFYTjBaWEpUWVhabFNHRnVaR3hsY2pvZ1puVnVZM1JwYjI0Z0tHaGhibVJzWlhJcElIdGNiaUFnSUNBZ0lDQWdjMkYyWlVoaGJtUnNaWEp6TG5CMWMyZ29hR0Z1Wkd4bGNpazdYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpXZHBjM1JsY2xKbGNHOXlkRWhoYm1Sc1pYSTZJR1oxYm1OMGFXOXVJQ2hvWVc1a2JHVnlLU0I3WEc0Z0lDQWdJQ0FnSUhKbGNHOXlkRWhoYm1Sc1pYSnpMbkIxYzJnb2FHRnVaR3hsY2lrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0J5WldkcGMzUmxja3h2WVdSSVlXNWtiR1Z5T2lCbWRXNWpkR2x2YmlBb2FHRnVaR3hsY2lrZ2UxeHVJQ0FnSUNBZ0lDQnNiMkZrU0dGdVpHeGxjbk11Y0hWemFDaG9ZVzVrYkdWeUtUdGNiaUFnSUNCOUxGeHVJQ0FnSUhKbFoybHpkR1Z5VTJWMGRHbHVaM05NYjJGa1NHRnVaR3hsY2pvZ1puVnVZM1JwYjI0Z0tHaGhibVJzWlhJcElIdGNiaUFnSUNBZ0lDQWdjMlYwZEdsdVozTk1iMkZrU0dGdVpHeGxjbk11Y0hWemFDaG9ZVzVrYkdWeUtUdGNiaUFnSUNCOUxGeHVJQ0FnSUdselVtVmpiM0prYVc1bk9pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFYwYldVdWMzUmhkR1V1YzNSaGRIVnpMbWx1WkdWNFQyWW9YQ0pTUlVOUFVrUkpUa2RjSWlrZ1BUMDlJREE3WEc0Z0lDQWdmU3hjYmlBZ0lDQnBjMUJzWVhscGJtYzZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZFhSdFpTNXpkR0YwWlM1emRHRjBkWE11YVc1a1pYaFBaaWhjSWxCTVFWbEpUa2RjSWlrZ1BUMDlJREE3WEc0Z0lDQWdmU3hjYmlBZ0lDQnBjMVpoYkdsa1lYUnBibWM2SUdaMWJtTjBhVzl1S0haaGJHbGtZWFJwYm1jcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUIyWVd4cFpHRjBhVzVuSUNFOVBTQW5kVzVrWldacGJtVmtKeUFtSmlBb2RYUnRaUzVwYzFKbFkyOXlaR2x1WnlncElIeDhJSFYwYldVdWFYTldZV3hwWkdGMGFXNW5LQ2twS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBZWFJsTG5OMFlYUjFjeUE5SUhaaGJHbGtZWFJwYm1jZ1B5QmNJbFpCVEVsRVFWUkpUa2RjSWlBNklGd2lVa1ZEVDFKRVNVNUhYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblZrRk1TVVJCVkVsUFRsOURTRUZPUjBWRUp5azdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFYwYldVdWMzUmhkR1V1YzNSaGRIVnpMbWx1WkdWNFQyWW9YQ0pXUVV4SlJFRlVTVTVIWENJcElEMDlQU0F3TzF4dUlDQWdJSDBzWEc0Z0lDQWdjM1J2Y0ZKbFkyOXlaR2x1WnpvZ1puVnVZM1JwYjI0Z0tHbHVabThwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2x1Wm04Z0lUMDlJR1poYkhObEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdibVYzVTJObGJtRnlhVzhnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MzUmxjSE02SUhOMFlYUmxMbk4wWlhCelhHNGdJQ0FnSUNBZ0lDQWdJQ0I5TzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JmTG1WNGRHVnVaQ2h1WlhkVFkyVnVZWEpwYnl3Z2FXNW1ieWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNnaGJtVjNVMk5sYm1GeWFXOHVibUZ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHNWxkMU5qWlc1aGNtbHZMbTVoYldVZ1BTQndjbTl0Y0hRb0owVnVkR1Z5SUhOalpXNWhjbWx2SUc1aGJXVW5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLRzVsZDFOalpXNWhjbWx2TG01aGJXVXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTNXpZMlZ1WVhKcGIzTXVjSFZ6YUNodVpYZFRZMlZ1WVhKcGJ5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MyRjJaVWhoYm1Sc1pYSnpJQ1ltSUhOaGRtVklZVzVrYkdWeWN5NXNaVzVuZEdncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCellYWmxTR0Z1Wkd4bGNuTXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOaGRtVklZVzVrYkdWeWMxdHBYU2h1WlhkVFkyVnVZWEpwYnl3Z2RYUnRaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0J6ZEdGMFpTNXpkR0YwZFhNZ1BTQW5URTlCUkVWRUp6dGNibHh1SUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25Va1ZEVDFKRVNVNUhYMU5VVDFCUVJVUW5LVHRjYmx4dUlDQWdJQ0FnSUNCMWRHMWxMbkpsY0c5eWRFeHZaeWhjSWxKbFkyOXlaR2x1WnlCVGRHOXdjR1ZrWENJc0lHNWxkMU5qWlc1aGNtbHZLVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdiRzloWkZObGRIUnBibWR6T2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSE5sZEhScGJtZHpJRDBnZFhSdFpTNXpaWFIwYVc1bmN5QTlJRzVsZHlCVFpYUjBhVzVuY3loN1hHNGdJQ0FnSUNBZ0lDQWdYQ0p5ZFc1dVpYSXVjM0JsWldSY0lqb2dYQ0p5WldGc2RHbHRaVndpWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQnBaaUFvYzJWMGRHbHVaM05NYjJGa1NHRnVaR3hsY25NdWJHVnVaM1JvSUQ0Z01DQW1KaUFoWjJWMFVHRnlZVzFsZEdWeVFubE9ZVzFsS0NkMWRHMWxYM05qWlc1aGNtbHZKeWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQnVaWGNnVUhKdmJXbHpaU2htZFc1amRHbHZiaUFvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMGRHbHVaM05NYjJGa1NHRnVaR3hsY25OYk1GMG9ablZ1WTNScGIyNGdLSEpsYzNBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMGRHbHVaM011YzJWMFJHVm1ZWFZzZEhNb2NtVnpjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjMjlzZG1Vb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdWNtVnpiMngyWlNncE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lHeHZZV1JUZEdGMFpVWnliMjFUZEc5eVlXZGxPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUIxZEcxbFUzUmhkR1ZUZEhJZ1BTQnNiMk5oYkZOMGIzSmhaMlV1WjJWMFNYUmxiU2duZFhSdFpTY3BPMXh1SUNBZ0lDQWdJQ0JwWmlBb2RYUnRaVk4wWVhSbFUzUnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlNBOUlFcFRUMDR1Y0dGeWMyVW9kWFJ0WlZOMFlYUmxVM1J5S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSbElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSMWN6b2dYQ0pKVGtsVVNVRk1TVnBKVGtkY0lpeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpZMlZ1WVhKcGIzTTZJRnRkWEc0Z0lDQWdJQ0FnSUNBZ0lDQjlPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6ZEdGMFpUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2MyRjJaVk4wWVhSbFZHOVRkRzl5WVdkbE9pQm1kVzVqZEdsdmJpQW9kWFJ0WlZOMFlYUmxLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDFkRzFsVTNSaGRHVXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHeHZZMkZzVTNSdmNtRm5aUzV6WlhSSmRHVnRLQ2QxZEcxbEp5d2dTbE5QVGk1emRISnBibWRwWm5rb2RYUnRaVk4wWVhSbEtTazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCc2IyTmhiRk4wYjNKaFoyVXVjbVZ0YjNabFNYUmxiU2duZFhSdFpTY3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmx4dUlDQWdJSFZ1Ykc5aFpEb2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCMWRHMWxMbk5oZG1WVGRHRjBaVlJ2VTNSdmNtRm5aU2h6ZEdGMFpTazdYRzRnSUNBZ2ZWeHVmVHRjYmx4dVpuVnVZM1JwYjI0Z2RHOW5aMnhsU0dsbmFHeHBaMmgwS0dWc1pTd2dkbUZzZFdVcElIdGNiaUFnSUNBa0tHVnNaU2t1ZEc5bloyeGxRMnhoYzNNb0ozVjBiV1V0ZG1WeWFXWjVKeXdnZG1Gc2RXVXBPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQjBiMmRuYkdWU1pXRmtlU2hsYkdVc0lIWmhiSFZsS1NCN1hHNGdJQ0FnSkNobGJHVXBMblJ2WjJkc1pVTnNZWE56S0NkMWRHMWxMWEpsWVdSNUp5d2dkbUZzZFdVcE8xeHVmVnh1WEc0dktpcGNiaUFxSUVsbUlIbHZkU0JqYkdsamF5QnZiaUJoSUhOd1lXNGdhVzRnWVNCc1lXSmxiQ3dnZEdobElITndZVzRnZDJsc2JDQmpiR2xqYXl4Y2JpQXFJSFJvWlc0Z2RHaGxJR0p5YjNkelpYSWdkMmxzYkNCbWFYSmxJSFJvWlNCamJHbGpheUJsZG1WdWRDQm1iM0lnZEdobElHbHVjSFYwSUdOdmJuUmhhVzVsWkNCM2FYUm9hVzRnZEdobElITndZVzRzWEc0Z0tpQlRieXdnZDJVZ2IyNXNlU0IzWVc1MElIUnZJSFJ5WVdOcklIUm9aU0JwYm5CMWRDQmpiR2xqYTNNdVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselRtOTBTVzVNWVdKbGJFOXlWbUZzYVdRb1pXeGxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlDUW9aV3hsS1M1d1lYSmxiblJ6S0Nkc1lXSmxiQ2NwTG14bGJtZDBhQ0E5UFNBd0lIeDhYRzRnSUNBZ0lDQWdJQ0FnWld4bExtNXZaR1ZPWVcxbExuUnZURzkzWlhKRFlYTmxLQ2tnUFQwZ0oybHVjSFYwSnp0Y2JuMWNibHh1ZG1GeUlIUnBiV1Z5Y3lBOUlGdGRPMXh1WEc1bWRXNWpkR2x2YmlCcGJtbDBSWFpsYm5SSVlXNWtiR1Z5Y3lncElIdGNibHh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2daWFpsYm5SekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUdSdlkzVnRaVzUwTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvWlhabGJuUnpXMmxkTENBb1puVnVZM1JwYjI0Z0tHVjJkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdoaGJtUnNaWElnUFNCbWRXNWpkR2x2YmlBb1pTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNobExtbHpWSEpwWjJkbGNpbGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITmxkSFJwYm1jZ1BTQnpaWFIwYVc1bmN5NW5aWFFvWENKeVpXTnZjbVJsY2k1bGRtVnVkSE11WENJZ0t5QmxkblFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG1selVtVmpiM0prYVc1bktDa2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0tITmxkSFJwYm1jZ1BUMDlJSFJ5ZFdVZ2ZId2djMlYwZEdsdVp5QTlQVDBnSjNSeWRXVW5JSHg4SUhSNWNHVnZaaUJ6WlhSMGFXNW5JRDA5UFNBbmRXNWtaV1pwYm1Wa0p5a2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pTNTBZWEpuWlhRdWFHRnpRWFIwY21saWRYUmxJQ1ltWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDRmxMblJoY21kbGRDNW9ZWE5CZEhSeWFXSjFkR1VvSjJSaGRHRXRhV2R1YjNKbEp5a2dKaVpjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0pDaGxMblJoY21kbGRDa3VjR0Z5Wlc1MGN5aGNJbHRrWVhSaExXbG5ibTl5WlYxY0lpa3ViR1Z1WjNSb0lEMDlJREFnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWE5PYjNSSmJreGhZbVZzVDNKV1lXeHBaQ2hsTG5SaGNtZGxkQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2FXUjRJRDBnZFhSdFpTNXpkR0YwWlM1emRHVndjeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR0Z5WjNNZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR3h2WTJGMGIzSTZJSFYwYldVdVkzSmxZWFJsUld4bGJXVnVkRXh2WTJGMGIzSW9aUzUwWVhKblpYUXBYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdkR2x0WlhJN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aUzUzYUdsamFDQjhmQ0JsTG1KMWRIUnZiaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaGNtZHpMbUoxZEhSdmJpQTlJR1V1ZDJocFkyZ2dmSHdnWlM1aWRYUjBiMjQ3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMmRDQTlQU0FuYlc5MWMyVnZkbVZ5SnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWSWFXZG9iR2xuYUhRb1pTNTBZWEpuWlhRc0lIUnlkV1VwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFXMWxjbk11Y0hWemFDaDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVnRaVzUwT2lCbExuUmhjbWRsZEN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwYldWeU9pQnpaWFJVYVcxbGIzVjBLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGIyZG5iR1ZTWldGa2VTaGxMblJoY21kbGRDd2dkSEoxWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHOW5aMnhsU0dsbmFHeHBaMmgwS0dVdWRHRnlaMlYwTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0ExTURBcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFowSUQwOUlDZHRiM1Z6Wlc5MWRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCMGFXMWxjbk11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBhVzFsY25OYmFWMHVaV3hsYldWdWRDQTlQU0JsTG5SaGNtZGxkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOc1pXRnlWR2x0Wlc5MWRDaDBhVzFsY25OYmFWMHVkR2x0WlhJcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBiV1Z5Y3k1emNHeHBZMlVvYVN3Z01TazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHOW5aMnhsU0dsbmFHeHBaMmgwS0dVdWRHRnlaMlYwTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSdloyZHNaVkpsWVdSNUtHVXVkR0Z5WjJWMExDQm1ZV3h6WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHVjJkQ0E5UFNBblkyaGhibWRsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmhjbWR6TG5aaGJIVmxJRDBnWlM1MFlYSm5aWFF1ZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtHVjJkQ3dnWVhKbmN5d2dhV1I0S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUgwN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklFaEJRMHNnWm05eUlIUmxjM1JwYm1kY2JpQWdJQ0FnSUNBZ0lDQWdJQ2gxZEcxbExtVjJaVzUwVEdsemRHVnVaWEp6SUQwZ2RYUnRaUzVsZG1WdWRFeHBjM1JsYm1WeWN5QjhmQ0I3ZlNsYlpYWjBYU0E5SUdoaGJtUnNaWEk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2FHRnVaR3hsY2p0Y2JpQWdJQ0FnSUNBZ2ZTa29aWFpsYm5SelcybGRLU3dnZEhKMVpTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RtRnlJRjkwYjE5aGMyTnBhU0E5SUh0Y2JpQWdJQ0FnSUNBZ0p6RTRPQ2M2SUNjME5DY3NYRzRnSUNBZ0lDQWdJQ2N4T0Rrbk9pQW5ORFVuTEZ4dUlDQWdJQ0FnSUNBbk1Ua3dKem9nSnpRMkp5eGNiaUFnSUNBZ0lDQWdKekU1TVNjNklDYzBOeWNzWEc0Z0lDQWdJQ0FnSUNjeE9USW5PaUFuT1RZbkxGeHVJQ0FnSUNBZ0lDQW5Nakl3SnpvZ0p6a3lKeXhjYmlBZ0lDQWdJQ0FnSnpJeU1pYzZJQ2N6T1Njc1hHNGdJQ0FnSUNBZ0lDY3lNakVuT2lBbk9UTW5MRnh1SUNBZ0lDQWdJQ0FuTWpFNUp6b2dKemt4Snl4Y2JpQWdJQ0FnSUNBZ0p6RTNNeWM2SUNjME5TY3NYRzRnSUNBZ0lDQWdJQ2N4T0Rjbk9pQW5OakVuTENBdkwwbEZJRXRsZVNCamIyUmxjMXh1SUNBZ0lDQWdJQ0FuTVRnMkp6b2dKelU1SjF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0IyWVhJZ2MyaHBablJWY0hNZ1BTQjdYRzRnSUNBZ0lDQWdJRndpT1RaY0lqb2dYQ0orWENJc1hHNGdJQ0FnSUNBZ0lGd2lORGxjSWpvZ1hDSWhYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UQmNJam9nWENKQVhDSXNYRzRnSUNBZ0lDQWdJRndpTlRGY0lqb2dYQ0lqWENJc1hHNGdJQ0FnSUNBZ0lGd2lOVEpjSWpvZ1hDSWtYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UTmNJam9nWENJbFhDSXNYRzRnSUNBZ0lDQWdJRndpTlRSY0lqb2dYQ0plWENJc1hHNGdJQ0FnSUNBZ0lGd2lOVFZjSWpvZ1hDSW1YQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UWmNJam9nWENJcVhDSXNYRzRnSUNBZ0lDQWdJRndpTlRkY0lqb2dYQ0lvWENJc1hHNGdJQ0FnSUNBZ0lGd2lORGhjSWpvZ1hDSXBYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5EVmNJam9nWENKZlhDSXNYRzRnSUNBZ0lDQWdJRndpTmpGY0lqb2dYQ0lyWENJc1hHNGdJQ0FnSUNBZ0lGd2lPVEZjSWpvZ1hDSjdYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU9UTmNJam9nWENKOVhDSXNYRzRnSUNBZ0lDQWdJRndpT1RKY0lqb2dYQ0o4WENJc1hHNGdJQ0FnSUNBZ0lGd2lOVGxjSWpvZ1hDSTZYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU16bGNJam9nWENKY1hGd2lYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5EUmNJam9nWENJOFhDSXNYRzRnSUNBZ0lDQWdJRndpTkRaY0lqb2dYQ0krWENJc1hHNGdJQ0FnSUNBZ0lGd2lORGRjSWpvZ1hDSS9YQ0pjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdablZ1WTNScGIyNGdhMlY1VUhKbGMzTklZVzVrYkdWeUlDaGxLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaGxMbWx6VkhKcFoyZGxjaWxjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JseHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUNZbUlHVXVkR0Z5WjJWMExtaGhjMEYwZEhKcFluVjBaU0FtSmlBaFpTNTBZWEpuWlhRdWFHRnpRWFIwY21saWRYUmxLQ2RrWVhSaExXbG5ibTl5WlNjcElDWW1JQ1FvWlM1MFlYSm5aWFFwTG5CaGNtVnVkSE1vWENKYlpHRjBZUzFwWjI1dmNtVmRYQ0lwTG14bGJtZDBhQ0E5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdZeUE5SUdVdWQyaHBZMmc3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUZSUFJFODZJRVJ2WlhOdUozUWdkMjl5YXlCM2FYUm9JR05oY0hNZ2JHOWphMXh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OXViM0p0WVd4cGVtVWdhMlY1UTI5a1pWeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tGOTBiMTloYzJOcGFTNW9ZWE5QZDI1UWNtOXdaWEowZVNoaktTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR01nUFNCZmRHOWZZWE5qYVdsYlkxMDdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDZ2haUzV6YUdsbWRFdGxlU0FtSmlBb1l5QStQU0EyTlNBbUppQmpJRHc5SURrd0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR01nUFNCVGRISnBibWN1Wm5KdmJVTm9ZWEpEYjJSbEtHTWdLeUF6TWlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dVdWMyaHBablJMWlhrZ0ppWWdjMmhwWm5SVmNITXVhR0Z6VDNkdVVISnZjR1Z5ZEhrb1l5a3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2TDJkbGRDQnphR2xtZEdWa0lHdGxlVU52WkdVZ2RtRnNkV1ZjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqSUQwZ2MyaHBablJWY0hOYlkxMDdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdNZ1BTQlRkSEpwYm1jdVpuSnZiVU5vWVhKRGIyUmxLR01wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbFoybHpkR1Z5UlhabGJuUW9KMnRsZVhCeVpYTnpKeXdnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd4dlkyRjBiM0k2SUhWMGJXVXVZM0psWVhSbFJXeGxiV1Z1ZEV4dlkyRjBiM0lvWlM1MFlYSm5aWFFwTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd0bGVUb2dZeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J3Y21WMlZtRnNkV1U2SUdVdWRHRnlaMlYwTG5aaGJIVmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoYkhWbE9pQmxMblJoY21kbGRDNTJZV3gxWlNBcklHTXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhMlY1UTI5a1pUb2daUzVyWlhsRGIyUmxYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lHUnZZM1Z0Wlc1MExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oydGxlWEJ5WlhOekp5d2dhMlY1VUhKbGMzTklZVzVrYkdWeUxDQjBjblZsS1R0Y2JseHVJQ0FnSUM4dklFaEJRMHNnWm05eUlIUmxjM1JwYm1kY2JpQWdJQ0FvZFhSdFpTNWxkbVZ1ZEV4cGMzUmxibVZ5Y3lBOUlIVjBiV1V1WlhabGJuUk1hWE4wWlc1bGNuTWdmSHdnZTMwcFd5ZHJaWGx3Y21WemN5ZGRJRDBnYTJWNVVISmxjM05JWVc1a2JHVnlPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9ibUZ0WlNrZ2UxeHVJQ0FnSUc1aGJXVWdQU0J1WVcxbExuSmxjR3hoWTJVb0wxdGNYRnRkTHl3Z1hDSmNYRnhjVzF3aUtTNXlaWEJzWVdObEtDOWJYRnhkWFM4c0lGd2lYRnhjWEYxY0lpazdYRzRnSUNBZ2RtRnlJSEpsWjJWNElEMGdibVYzSUZKbFowVjRjQ2hjSWx0Y1hGeGNQeVpkWENJZ0t5QnVZVzFsSUNzZ1hDSTlLRnRlSmlOZEtpbGNJaWtzWEc0Z0lDQWdJQ0FnSUhKbGMzVnNkSE1nUFNCeVpXZGxlQzVsZUdWaktHeHZZMkYwYVc5dUxuTmxZWEpqYUNrN1hHNGdJQ0FnY21WMGRYSnVJSEpsYzNWc2RITWdQVDA5SUc1MWJHd2dQeUJjSWx3aUlEb2daR1ZqYjJSbFZWSkpRMjl0Y0c5dVpXNTBLSEpsYzNWc2RITmJNVjB1Y21Wd2JHRmpaU2d2WEZ3ckwyY3NJRndpSUZ3aUtTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHSnZiM1J6ZEhKaGNGVjBiV1VvS1NCN1hHNGdJR2xtSUNoa2IyTjFiV1Z1ZEM1eVpXRmtlVk4wWVhSbElEMDlJRndpWTI5dGNHeGxkR1ZjSWlrZ2UxeHVJQ0FnSUhWMGJXVXVhVzVwZENncExuUm9aVzRvWm5WdVkzUnBiMjRnS0NrZ2UxeHVYRzRnSUNBZ0lDQWdJR2x1YVhSRmRtVnVkRWhoYm1Sc1pYSnpLQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWFYTlNaV052Y21ScGJtY29LU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eVpXZHBjM1JsY2tWMlpXNTBLRndpYkc5aFpGd2lMQ0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhKc09pQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhCeWIzUnZZMjlzT2lCM2FXNWtiM2N1Ykc5allYUnBiMjR1Y0hKdmRHOWpiMndzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHaHZjM1E2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTVvYjNOMExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WldGeVkyZzZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNXpaV0Z5WTJnc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2hoYzJnNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b1lYTm9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlLVHRjYmlBZ2ZWeHVmVnh1WEc1aWIyOTBjM1J5WVhCVmRHMWxLQ2s3WEc1a2IyTjFiV1Z1ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkeVpXRmtlWE4wWVhSbFkyaGhibWRsSnl3Z1ltOXZkSE4wY21Gd1ZYUnRaU2s3WEc1Y2JuZHBibVJ2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkMWJteHZZV1FuTENCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ2RYUnRaUzUxYm14dllXUW9LVHRjYm4wc0lIUnlkV1VwTzF4dVhHNTNhVzVrYjNjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblpYSnliM0luTENCbWRXNWpkR2x2YmlBb1pYSnlLU0I3WEc0Z0lDQWdkWFJ0WlM1eVpYQnZjblJNYjJjb1hDSlRZM0pwY0hRZ1JYSnliM0k2SUZ3aUlDc2daWEp5TG0xbGMzTmhaMlVnS3lCY0lqcGNJaUFySUdWeWNpNTFjbXdnS3lCY0lpeGNJaUFySUdWeWNpNXNhVzVsSUNzZ1hDSTZYQ0lnS3lCbGNuSXVZMjlzS1R0Y2JuMHBPMXh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUhWMGJXVTdYRzRpWFgwPSJdfQ==
