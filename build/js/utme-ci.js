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
  return utme.state && utme.state.testServer ? utme.state.testServer : getParameterByName("utme_test_server") || "http://192.168.200.136:9043/";
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
            if (typeof step.data.value != "undefined" || typeof step.data.attributes != "undefined") {
              var toApply = step.data.attributes ? step.data.attributes : {"value": step.data.value};
              _.extend(ele, toApply);
            }
            if ((step.eventName == 'focus' || step.eventName == 'blur') && ele[step.eventName]) {
              ele[step.eventName]();
            } else if (step.eventName === 'change') {
              if (supportsInputEvent) {
                Simulate.event(ele, 'input');
              }
              Simulate.event(ele, 'change');
            } else {
              Simulate[step.eventName](ele, options);
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
          var lastStep = utme.state.steps[idx - 1];
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
            if (evt === 'change') {
              args.attributes = {
                "value": e.target.value,
                "checked": e.target.checked
              };
            }
            var isInput = e.target.tagName.toLowerCase() === 'input';
            if (evt === 'click' && isInput && lastStep && lastStep.eventName === 'change') {
              lastStep.eventName = 'click';
              return;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9maWxlc2F2ZXIuanMvRmlsZVNhdmVyLmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9wZXJzaXN0ZXJzL3V0bWUtZmlsZS1wZXJzaXN0ZXIuanMiLCIvaG9tZS9kYXZpZHRpdHRzd29ydGgvcHJvamVjdHMvdXRtZS9zcmMvanMvcmVwb3J0ZXJzL3NlcnZlci1yZXBvcnRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZWxlY3RvckZpbmRlci5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy9zaW11bGF0ZS5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dGlscy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3NyYy9qcy91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFBQSxBQUFJLEVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUM3QixBQUFJLEVBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxPQUFN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QUFLLGlCQUFpQixBQUFDLENBQUMsUUFBTyxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQzFDLEtBQUcsT0FBTyxBQUFDLEVBQUMsQ0FBQztBQUNqQixDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBRVIsS0FBSyxpQkFBaUIsQUFBQyxDQUFDLE9BQU0sQ0FBRyxVQUFVLEdBQUUsQ0FBRztBQUM1QyxLQUFHLFVBQVUsQUFBQyxDQUFDLGdCQUFlLEVBQUksQ0FBQSxHQUFFLFFBQVEsQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxJQUFJLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsS0FBSyxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLElBQUksQ0FBQyxDQUFDO0FBQ25HLENBQUMsQ0FBQztBQUVGLEtBQUssUUFBUSxFQUFJLEtBQUcsQ0FBQztBQUV3dWdGIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4xXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgfHwgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRfaXNBcnJheTtcblxuICAgIGlmICghQXJyYXkuaXNBcnJheSkge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciAkJHV0aWxzJCRpc0FycmF5ID0gJCR1dGlscyQkX2lzQXJyYXk7XG4gICAgdmFyICQkdXRpbHMkJG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG4gICAgZnVuY3Rpb24gJCR1dGlscyQkRigpIHsgfVxuXG4gICAgdmFyICQkdXRpbHMkJG9fY3JlYXRlID0gKE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY29uZCBhcmd1bWVudCBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICAkJHV0aWxzJCRGLnByb3RvdHlwZSA9IG87XG4gICAgICByZXR1cm4gbmV3ICQkdXRpbHMkJEYoKTtcbiAgICB9KTtcblxuICAgIHZhciAkJGFzYXAkJGxlbiA9IDA7XG5cbiAgICB2YXIgJCRhc2FwJCRkZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuXSA9IGNhbGxiYWNrO1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgJCRhc2FwJCRsZW4gKz0gMjtcbiAgICAgIGlmICgkJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gICAgdmFyICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCAkJGFzYXAkJGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyICQkYXNhcCQkaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygkJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3ICQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoJCRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gJCRhc2FwJCRmbHVzaDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dCgkJGFzYXAkJGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAkJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSAkJGFzYXAkJHF1ZXVlW2ldO1xuICAgICAgICB2YXIgYXJnID0gJCRhc2FwJCRxdWV1ZVtpKzFdO1xuXG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgJCRhc2FwJCRxdWV1ZVtpKzFdID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAkJGFzYXAkJGxlbiA9IDA7XG4gICAgfVxuXG4gICAgdmFyICQkYXNhcCQkc2NoZWR1bGVGbHVzaDtcblxuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkbm9vcCgpIHt9XG4gICAgdmFyICQkJGludGVybmFsJCRQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyICQkJGludGVybmFsJCRGVUxGSUxMRUQgPSAxO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVycm9yID0gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gICAgICBpZiAodGhlbmFibGUuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gJCQkaW50ZXJuYWwkJGdldFRoZW4obWF5YmVUaGVuYWJsZSk7XG5cbiAgICAgICAgaWYgKHRoZW4gPT09ICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSAkJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArICQkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2gsIHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSAkJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSAkJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAvLyBub29wXG4gICAgICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJG1ha2VTZXR0bGVkUmVzdWx0KHN0YXRlLCBwb3NpdGlvbiwgdmFsdWUpIHtcbiAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAnZnVsZmlsbGVkJyxcbiAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdyZWplY3RlZCcsXG4gICAgICAgICAgcmVhc29uOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0LCBhYm9ydE9uUmVqZWN0LCBsYWJlbCkge1xuICAgICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICB0aGlzLl9hYm9ydE9uUmVqZWN0ID0gYWJvcnRPblJlamVjdDtcblxuICAgICAgaWYgKHRoaXMuX3ZhbGlkYXRlSW5wdXQoaW5wdXQpKSB7XG4gICAgICAgIHRoaXMuX2lucHV0ICAgICA9IGlucHV0O1xuICAgICAgICB0aGlzLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgICB0aGlzLl9pbml0KCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgICB0aGlzLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHRoaXMucHJvbWlzZSwgdGhpcy5fdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZUlucHV0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiAkJHV0aWxzJCRpc0FycmF5KGlucHV0KTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRpb25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgJCQkZW51bWVyYXRvciQkZGVmYXVsdCA9ICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3I7XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGVuZ3RoICA9IHRoaXMubGVuZ3RoO1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG4gICAgICB2YXIgaW5wdXQgICA9IHRoaXMuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9lYWNoRW50cnkoaW5wdXRbaV0sIGkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICAgIGlmICgkJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgZW50cnkuX29uZXJyb3IgPSBudWxsO1xuICAgICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChjLnJlc29sdmUoZW50cnkpLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgZW50cnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcblxuICAgICAgICBpZiAodGhpcy5fYWJvcnRPblJlamVjdCAmJiBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdChzdGF0ZSwgaSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX21ha2VSZXN1bHQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFsbChlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgcmV0dXJuIG5ldyAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0KHRoaXMsIGVudHJpZXMsIHRydWUgLyogYWJvcnQgb24gcmVqZWN0ICovLCBsYWJlbCkucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmFjZShlbnRyaWVzLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG5cbiAgICAgIGlmICghJCR1dGlscyQkaXNBcnJheShlbnRyaWVzKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG5cbiAgICAgIGZ1bmN0aW9uIG9uRnVsZmlsbG1lbnQodmFsdWUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgcHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVzb2x2ZShvYmplY3QsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gZnVuY3Rpb24gcmVqZWN0KHJlYXNvbiwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyID0gMDtcblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0ID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlO1xuXG4gICAgLyoqXG4gICAgICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gICAgICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICAgICAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2XigJlzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICB0aGlzLl9pZCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlcisrO1xuICAgICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgICBpZiAoJCQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gJCRwcm9taXNlJGFsbCQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9ICQkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZXNvbHZlID0gJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9ICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQ7XG5cbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgICAgIHZhciBzdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQgJiYgIW9uUmVqZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJlbnQuX3Jlc3VsdDtcblxuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbc3RhdGUgLSAxXTtcbiAgICAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSxcblxuICAgIC8qKlxuICAgICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmNocm9ub3VzXG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQXV0aG9yKCk7XG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfVxuXG4gICAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgY2F0Y2hcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQpIHtcbiAgICAgICAgbG9jYWwgPSB3aW5kb3c7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHZhciBlczZQcm9taXNlU3VwcG9ydCA9XG4gICAgICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgICAgIC8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgbWlzc2luZyBmcm9tXG4gICAgICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJlamVjdFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgLy8gT2xkZXIgdmVyc2lvbiBvZiB0aGUgc3BlYyBoYWQgYSByZXNvbHZlciBvYmplY3RcbiAgICAgICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZTtcbiAgICAgICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgICAgICByZXR1cm4gJCR1dGlscyQkaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgICAgICBsb2NhbC5Qcm9taXNlID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0O1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlID0ge1xuICAgICAgJ1Byb21pc2UnOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzWydFUzZQcm9taXNlJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxufSkuY2FsbCh0aGlzKTsiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMjAxNC0xMi0xN1xuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IFgxMS9NSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBc1xuICAvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG4gIHx8ICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYi5iaW5kKG5hdmlnYXRvcikpXG4gIC8vIEV2ZXJ5b25lIGVsc2VcbiAgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG5cdCAgICAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBkb2MuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcblx0XHRcdGV2ZW50LmluaXRNb3VzZUV2ZW50KFxuXHRcdFx0XHRcImNsaWNrXCIsIHRydWUsIGZhbHNlLCB2aWV3LCAwLCAwLCAwLCAwLCAwXG5cdFx0XHRcdCwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIG51bGxcblx0XHRcdCk7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIHdlYmtpdF9yZXFfZnMgPSB2aWV3LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtXG5cdFx0LCByZXFfZnMgPSB2aWV3LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdlYmtpdF9yZXFfZnMgfHwgdmlldy5tb3pSZXF1ZXN0RmlsZVN5c3RlbVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdCwgZnNfbWluX3NpemUgPSAwXG5cdFx0Ly8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zNzUyOTcjYzcgYW5kXG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2NvbW1pdC80ODU5MzBhI2NvbW1pdGNvbW1lbnQtODc2ODA0N1xuXHRcdC8vIGZvciB0aGUgcmVhc29uaW5nIGJlaGluZCB0aGUgdGltZW91dCBhbmQgcmV2b2NhdGlvbiBmbG93XG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSA1MDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRpZiAodmlldy5jaHJvbWUpIHtcblx0XHRcdFx0cmV2b2tlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUpIHtcblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGJsb2JfY2hhbmdlZCA9IGZhbHNlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIHRhcmdldF92aWV3XG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKGJsb2JfY2hhbmdlZCB8fCAhb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0YXJnZXRfdmlldykge1xuXHRcdFx0XHRcdFx0dGFyZ2V0X3ZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBuZXdfdGFiID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKG5ld190YWIgPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBzYWZhcmkgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0XHRcdFx0Ly9BcHBsZSBkbyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwOi8vYml0Lmx5LzFrWmZmUklcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGFib3J0YWJsZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoZmlsZXNhdmVyLnJlYWR5U3RhdGUgIT09IGZpbGVzYXZlci5ET05FKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0XHQsIGNyZWF0ZV9pZl9ub3RfZm91bmQgPSB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfVxuXHRcdFx0XHQsIHNsaWNlXG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0aWYgKCFuYW1lKSB7XG5cdFx0XHRcdG5hbWUgPSBcImRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gT2JqZWN0IGFuZCB3ZWIgZmlsZXN5c3RlbSBVUkxzIGhhdmUgYSBwcm9ibGVtIHNhdmluZyBpbiBHb29nbGUgQ2hyb21lIHdoZW5cblx0XHRcdC8vIHZpZXdlZCBpbiBhIHRhYiwgc28gSSBmb3JjZSBzYXZlIHdpdGggYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXG5cdFx0XHQvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD05MTE1OFxuXHRcdFx0Ly8gVXBkYXRlOiBHb29nbGUgZXJyYW50bHkgY2xvc2VkIDkxMTU4LCBJIHN1Ym1pdHRlZCBpdCBhZ2Fpbjpcblx0XHRcdC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0zODk2NDJcblx0XHRcdGlmICh2aWV3LmNocm9tZSAmJiB0eXBlICYmIHR5cGUgIT09IGZvcmNlX3NhdmVhYmxlX3R5cGUpIHtcblx0XHRcdFx0c2xpY2UgPSBibG9iLnNsaWNlIHx8IGJsb2Iud2Via2l0U2xpY2U7XG5cdFx0XHRcdGJsb2IgPSBzbGljZS5jYWxsKGJsb2IsIDAsIGJsb2Iuc2l6ZSwgZm9yY2Vfc2F2ZWFibGVfdHlwZSk7XG5cdFx0XHRcdGJsb2JfY2hhbmdlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHQvLyBTaW5jZSBJIGNhbid0IGJlIHN1cmUgdGhhdCB0aGUgZ3Vlc3NlZCBtZWRpYSB0eXBlIHdpbGwgdHJpZ2dlciBhIGRvd25sb2FkXG5cdFx0XHQvLyBpbiBXZWJLaXQsIEkgYXBwZW5kIC5kb3dubG9hZCB0byB0aGUgZmlsZW5hbWUuXG5cdFx0XHQvLyBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjU0NDBcblx0XHRcdGlmICh3ZWJraXRfcmVxX2ZzICYmIG5hbWUgIT09IFwiZG93bmxvYWRcIikge1xuXHRcdFx0XHRuYW1lICs9IFwiLmRvd25sb2FkXCI7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZSB8fCB3ZWJraXRfcmVxX2ZzKSB7XG5cdFx0XHRcdHRhcmdldF92aWV3ID0gdmlldztcblx0XHRcdH1cblx0XHRcdGlmICghcmVxX2ZzKSB7XG5cdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGZzX21pbl9zaXplICs9IGJsb2Iuc2l6ZTtcblx0XHRcdHJlcV9mcyh2aWV3LlRFTVBPUkFSWSwgZnNfbWluX3NpemUsIGFib3J0YWJsZShmdW5jdGlvbihmcykge1xuXHRcdFx0XHRmcy5yb290LmdldERpcmVjdG9yeShcInNhdmVkXCIsIGNyZWF0ZV9pZl9ub3RfZm91bmQsIGFib3J0YWJsZShmdW5jdGlvbihkaXIpIHtcblx0XHRcdFx0XHR2YXIgc2F2ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZGlyLmdldEZpbGUobmFtZSwgY3JlYXRlX2lmX25vdF9mb3VuZCwgYWJvcnRhYmxlKGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0ZmlsZS5jcmVhdGVXcml0ZXIoYWJvcnRhYmxlKGZ1bmN0aW9uKHdyaXRlcikge1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldF92aWV3LmxvY2F0aW9uLmhyZWYgPSBmaWxlLnRvVVJMKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlZW5kXCIsIGV2ZW50KTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldm9rZShmaWxlKTtcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdHdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgZXJyb3IgPSB3cml0ZXIuZXJyb3I7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoZXJyb3IuY29kZSAhPT0gZXJyb3IuQUJPUlRfRVJSKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgYWJvcnRcIi5zcGxpdChcIiBcIikuZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyW1wib25cIiArIGV2ZW50XSA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF07XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0d3JpdGVyLndyaXRlKGJsb2IpO1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3JpdGVyLmFib3J0KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuV1JJVElORztcblx0XHRcdFx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdFx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRkaXIuZ2V0RmlsZShuYW1lLCB7Y3JlYXRlOiBmYWxzZX0sIGFib3J0YWJsZShmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRcdFx0XHQvLyBkZWxldGUgZmlsZSBpZiBpdCBhbHJlYWR5IGV4aXN0c1xuXHRcdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdHNhdmUoKTtcblx0XHRcdFx0XHR9KSwgYWJvcnRhYmxlKGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXguY29kZSA9PT0gZXguTk9UX0ZPVU5EX0VSUikge1xuXHRcdFx0XHRcdFx0XHRzYXZlKCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmc19lcnJvcigpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0fSksIGZzX2Vycm9yKTtcblx0XHRcdH0pLCBmc19lcnJvcik7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lKTtcblx0XHR9XG5cdDtcblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgZmlsZXNhdmVyID0gdGhpcztcblx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJhYm9ydFwiKTtcblx0fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPSBudWxsKSkge1xuICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZScpO1xudmFyIHNhdmVBcyA9IHJlcXVpcmUoJ2ZpbGVzYXZlci5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWUucmVnaXN0ZXJTYXZlSGFuZGxlcihmdW5jdGlvbiAoc2NlbmFyaW8pIHtcbiAgIHZhciBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KHNjZW5hcmlvLCBudWxsLCBcIiBcIildLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pO1xuICAgc2F2ZUFzKGJsb2IsIHNjZW5hcmlvLm5hbWUgKyBcIi5qc29uXCIpO1xufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lJc0luTnZkWEpqWlhNaU9sc2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzQmxjbk5wYzNSbGNuTXZkWFJ0WlMxbWFXeGxMWEJsY25OcGMzUmxjaTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFTeEpRVUZKTEVsQlFVa3NSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UVVGRE9VSXNTVUZCU1N4TlFVRk5MRWRCUVVjc1QwRkJUeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZET3p0QlFVVnlReXhOUVVGTkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eFZRVUZWTEZGQlFWRXNSVUZCUlR0SFFVTXpSQ3hKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zU1VGQlNTeEZRVUZGTERCQ1FVRXdRaXhEUVVGRExFTkJRVU1zUTBGQlF6dEhRVU12Uml4TlFVRk5MRU5CUVVNc1NVRkJTU3hGUVVGRkxGRkJRVkVzUTBGQlF5eEpRVUZKTEVkQlFVY3NUMEZCVHl4RFFVRkRMRU5CUVVNN1EwRkRlRU1zUTBGQlF5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCMWRHMWxJRDBnY21WeGRXbHlaU2duTGk0dmRYUnRaU2NwTzF4dWRtRnlJSE5oZG1WQmN5QTlJSEpsY1hWcGNtVW9KMlpwYkdWellYWmxjaTVxY3ljcE8xeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSFYwYldVdWNtVm5hWE4wWlhKVFlYWmxTR0Z1Wkd4bGNpaG1kVzVqZEdsdmJpQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lIWmhjaUJpYkc5aUlEMGdibVYzSUVKc2IySW9XMHBUVDA0dWMzUnlhVzVuYVdaNUtITmpaVzVoY21sdkxDQnVkV3hzTENCY0lpQmNJaWxkTENCN2RIbHdaVG9nWENKMFpYaDBMM0JzWVdsdU8yTm9ZWEp6WlhROWRYUm1MVGhjSW4wcE8xeHVJQ0FnYzJGMlpVRnpLR0pzYjJJc0lITmpaVzVoY21sdkxtNWhiV1VnS3lCY0lpNXFjMjl1WENJcE8xeHVmU2s3SWwxOSIsInZhciB1dG1lID0gcmVxdWlyZSgnLi4vdXRtZS5qcycpO1xuXG5mdW5jdGlvbiBnZXRCYXNlVVJMICgpIHtcbiAgcmV0dXJuIHV0bWUuc3RhdGUgJiYgdXRtZS5zdGF0ZS50ZXN0U2VydmVyID8gdXRtZS5zdGF0ZS50ZXN0U2VydmVyIDogZ2V0UGFyYW1ldGVyQnlOYW1lKFwidXRtZV90ZXN0X3NlcnZlclwiKSB8fCBcImh0dHA6Ly8xOTIuMTY4LjIwMC4xMzY6OTA0My9cIjtcbn1cblxudmFyIHNlcnZlclJlcG9ydGVyID0ge1xuICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBnZXRCYXNlVVJMKCkgKyBcImVycm9yXCIsXG4gICAgICAgICAgZGF0YTogeyBkYXRhOiBlcnJvciB9LFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwiY29uc29sZUxvZ2dpbmdcIikpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc3VjY2VzczogZnVuY3Rpb24gKHN1Y2Nlc3MsIHNjZW5hcmlvLCB1dG1lKSB7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgdXJsOiBnZXRCYXNlVVJMKCkgKyBcInN1Y2Nlc3NcIixcbiAgICAgICAgICBkYXRhOiB7IGRhdGE6IHN1Y2Nlc3MgfSxcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcImNvbnNvbGVMb2dnaW5nXCIpKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coc3VjY2Vzcyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGxvZzogZnVuY3Rpb24gKGxvZywgc2NlbmFyaW8sIHV0bWUpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcImxvZ1wiLFxuICAgICAgICAgIGRhdGE6IHsgZGF0YTogbG9nIH0sXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoXCJjb25zb2xlTG9nZ2luZ1wiKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGxvZyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbG9hZFNjZW5hcmlvOiBmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIGpzb25wOiBcImNhbGxiYWNrXCIsXG5cbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcblxuICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXG5cbiAgICAgICAgICAgIHVybDogIGdldEJhc2VVUkwoKSArIFwic2NlbmFyaW8vXCIgKyBuYW1lLFxuXG4gICAgICAgICAgICAvLyB0ZWxsIGpRdWVyeSB3ZSdyZSBleHBlY3RpbmcgSlNPTlBcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25wXCIsXG5cbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzYXZlU2NlbmFyaW86IGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAgIHVybDogZ2V0QmFzZVVSTCgpICsgXCJzY2VuYXJpb1wiLFxuICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHNjZW5hcmlvLCBudWxsLCBcIiBcIiksXG4gICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWRTZXR0aW5nczogZnVuY3Rpb24gKGNhbGxiYWNrLCBlcnJvcikge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcIlwiLFxuICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXG4gICAgICAgICAgICB1cmw6ICBnZXRCYXNlVVJMKCkgKyBcInNldHRpbmdzXCIsXG4gICAgICAgICAgICAvLyB0ZWxsIGpRdWVyeSB3ZSdyZSBleHBlY3RpbmcgSlNPTlBcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcblxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGVycm9yKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbnV0bWUucmVnaXN0ZXJSZXBvcnRIYW5kbGVyKHNlcnZlclJlcG9ydGVyKTtcbnV0bWUucmVnaXN0ZXJMb2FkSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5sb2FkU2NlbmFyaW8pO1xudXRtZS5yZWdpc3RlclNhdmVIYW5kbGVyKHNlcnZlclJlcG9ydGVyLnNhdmVTY2VuYXJpbyk7XG51dG1lLnJlZ2lzdGVyU2V0dGluZ3NMb2FkSGFuZGxlcihzZXJ2ZXJSZXBvcnRlci5sb2FkU2V0dGluZ3MpO1xuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNKbGNHOXlkR1Z5Y3k5elpYSjJaWEl0Y21Wd2IzSjBaWEl1YW5NaUxDSnpiM1Z5WTJWeklqcGJJaTlvYjIxbEwyUmhkbWxrZEdsMGRITjNiM0owYUM5d2NtOXFaV04wY3k5MWRHMWxMM055WXk5cWN5OXlaWEJ2Y25SbGNuTXZjMlZ5ZG1WeUxYSmxjRzl5ZEdWeUxtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTEVsQlFVa3NTVUZCU1N4SFFVRkhMRTlCUVU4c1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6czdRVUZGYWtNc1UwRkJVeXhWUVVGVkxFbEJRVWs3UlVGRGNrSXNUMEZCVHl4SlFVRkpMRU5CUVVNc1MwRkJTeXhKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNWVUZCVlN4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVlVGQlZTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExHdENRVUZyUWl4RFFVRkRMRWxCUVVrc09FSkJRVGhDTEVOQlFVTTdRVUZEYUVvc1EwRkJRenM3UVVGRlJDeEpRVUZKTEdOQlFXTXNSMEZCUnp0SlFVTnFRaXhMUVVGTExFVkJRVVVzVlVGQlZTeExRVUZMTEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSVHRSUVVOd1F5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRPMVZCUTB3c1NVRkJTU3hGUVVGRkxFMUJRVTA3VlVGRFdpeEhRVUZITEVWQlFVVXNWVUZCVlN4RlFVRkZMRWRCUVVjc1QwRkJUenRWUVVNelFpeEpRVUZKTEVWQlFVVXNSVUZCUlN4SlFVRkpMRVZCUVVVc1MwRkJTeXhGUVVGRk8xVkJRM0pDTEZGQlFWRXNSVUZCUlN4TlFVRk5PMU5CUTJwQ0xFTkJRVU1zUTBGQlF6dFJRVU5JTEVsQlFVa3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEdkQ1FVRm5RaXhEUVVGRExFVkJRVVU3VlVGRE4wTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dFRRVU4wUWp0TFFVTktPMGxCUTBRc1QwRkJUeXhGUVVGRkxGVkJRVlVzVDBGQlR5eEZRVUZGTEZGQlFWRXNSVUZCUlN4SlFVRkpMRVZCUVVVN1VVRkRlRU1zUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXp0VlFVTk1MRWxCUVVrc1JVRkJSU3hOUVVGTk8xVkJRMW9zUjBGQlJ5eEZRVUZGTEZWQlFWVXNSVUZCUlN4SFFVRkhMRk5CUVZNN1ZVRkROMElzU1VGQlNTeEZRVUZGTEVWQlFVVXNTVUZCU1N4RlFVRkZMRTlCUVU4c1JVRkJSVHRWUVVOMlFpeFJRVUZSTEVWQlFVVXNUVUZCVFR0VFFVTnFRaXhEUVVGRExFTkJRVU03VVVGRFNDeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1VVRkJVU3hEUVVGRExFZEJRVWNzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhGUVVGRk8xVkJRemRETEU5QlFVOHNRMEZCUXl4SFFVRkhMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03VTBGRGRFSTdTMEZEU2p0SlFVTkVMRWRCUVVjc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJTeFJRVUZSTEVWQlFVVXNTVUZCU1N4RlFVRkZPMUZCUTJoRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTTdWVUZEVEN4SlFVRkpMRVZCUVVVc1RVRkJUVHRWUVVOYUxFZEJRVWNzUjBGQlJ5eFZRVUZWTEVWQlFVVXNSMEZCUnl4TFFVRkxPMVZCUXpGQ0xFbEJRVWtzUlVGQlJTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRVZCUVVVN1ZVRkRia0lzVVVGQlVTeEZRVUZGTEUxQlFVMDdVMEZEYWtJc1EwRkJReXhEUVVGRE8xRkJRMGdzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1JVRkJSVHRWUVVNM1F5eFBRVUZQTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8xTkJRMnhDTzBGQlExUXNTMEZCU3pzN1NVRkZSQ3haUVVGWkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVXNVVUZCVVN4RlFVRkZPMUZCUTNCRExFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTTdRVUZEWml4WlFVRlpMRXRCUVVzc1JVRkJSU3hWUVVGVk96dEJRVVUzUWl4WlFVRlpMRmRCUVZjc1JVRkJSU3hwUTBGQmFVTTdPMEZCUlRGRUxGbEJRVmtzVjBGQlZ5eEZRVUZGTEVsQlFVazdPMEZCUlRkQ0xGbEJRVmtzUjBGQlJ5eEhRVUZITEZWQlFWVXNSVUZCUlN4SFFVRkhMRmRCUVZjc1IwRkJSeXhKUVVGSk8wRkJRMjVFT3p0QlFVVkJMRmxCUVZrc1VVRkJVU3hGUVVGRkxFOUJRVTg3TzFsQlJXcENMRTlCUVU4c1JVRkJSU3hWUVVGVkxFbEJRVWtzUlVGQlJUdG5Ra0ZEY2tJc1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETzJGQlEyeENPMU5CUTBvc1EwRkJReXhEUVVGRE8wRkJRMWdzUzBGQlN6czdTVUZGUkN4WlFVRlpMRVZCUVVVc1ZVRkJWU3hSUVVGUkxFVkJRVVU3VVVGRE9VSXNRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJRenRWUVVOTUxFbEJRVWtzUlVGQlJTeE5RVUZOTzFWQlExb3NSMEZCUnl4RlFVRkZMRlZCUVZVc1JVRkJSU3hIUVVGSExGVkJRVlU3VlVGRE9VSXNTVUZCU1N4RlFVRkZMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zVVVGQlVTeEZRVUZGTEVsQlFVa3NSVUZCUlN4SFFVRkhMRU5CUVVNN1ZVRkRla01zVVVGQlVTeEZRVUZGTEUxQlFVMDdWVUZEYUVJc1YwRkJWeXhGUVVGRkxHdENRVUZyUWp0VFFVTm9ReXhEUVVGRExFTkJRVU03UVVGRFdDeExRVUZMT3p0SlFVVkVMRmxCUVZrc1JVRkJSU3hWUVVGVkxGRkJRVkVzUlVGQlJTeExRVUZMTEVWQlFVVTdVVUZEY2tNc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF6dFpRVU5JTEVsQlFVa3NSVUZCUlN4TFFVRkxPMWxCUTFnc1YwRkJWeXhGUVVGRkxFVkJRVVU3V1VGRFppeFhRVUZYTEVWQlFVVXNTVUZCU1R0QlFVTTNRaXhaUVVGWkxFZEJRVWNzUjBGQlJ5eFZRVUZWTEVWQlFVVXNSMEZCUnl4VlFVRlZPenRCUVVVelF5eFpRVUZaTEZGQlFWRXNSVUZCUlN4TlFVRk5PenRaUVVWb1FpeFBRVUZQTEVWQlFVVXNWVUZCVlN4SlFVRkpMRVZCUVVVN1owSkJRM0pDTEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOc1FqdFpRVU5FTEV0QlFVc3NSVUZCUlN4VlFVRlZMRWRCUVVjc1JVRkJSVHRuUWtGRGJFSXNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8yRkJRMlE3VTBGRFNpeERRVUZETEVOQlFVTTdTMEZEVGp0QlFVTk1MRU5CUVVNc1EwRkJRenM3UVVGRlJpeEpRVUZKTEVOQlFVTXNjVUpCUVhGQ0xFTkJRVU1zWTBGQll5eERRVUZETEVOQlFVTTdRVUZETTBNc1NVRkJTU3hEUVVGRExHMUNRVUZ0UWl4RFFVRkRMR05CUVdNc1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF6dEJRVU4wUkN4SlFVRkpMRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNZMEZCWXl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8wRkJRM1JFTEVsQlFVa3NRMEZCUXl3eVFrRkJNa0lzUTBGQlF5eGpRVUZqTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNN08wRkJSVGxFTEZOQlFWTXNhMEpCUVd0Q0xFTkJRVU1zU1VGQlNTeEZRVUZGTzBsQlF6bENMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4TFFVRkxMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU1zVFVGQlRTeEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRPMGxCUXpGRUxFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NUVUZCVFN4RFFVRkRMRkZCUVZFc1IwRkJSeXhKUVVGSkxFZEJRVWNzVjBGQlZ5eERRVUZETzFGQlEycEVMRTlCUVU4c1IwRkJSeXhMUVVGTExFTkJRVU1zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJRenRKUVVNeFF5eFBRVUZQTEU5QlFVOHNTMEZCU3l4SlFVRkpMRWRCUVVjc1JVRkJSU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RlFVRkZMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU03UTBGRGNrWWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUoyWVhJZ2RYUnRaU0E5SUhKbGNYVnBjbVVvSnk0dUwzVjBiV1V1YW5NbktUdGNibHh1Wm5WdVkzUnBiMjRnWjJWMFFtRnpaVlZTVENBb0tTQjdYRzRnSUhKbGRIVnliaUIxZEcxbExuTjBZWFJsSUNZbUlIVjBiV1V1YzNSaGRHVXVkR1Z6ZEZObGNuWmxjaUEvSUhWMGJXVXVjM1JoZEdVdWRHVnpkRk5sY25abGNpQTZJR2RsZEZCaGNtRnRaWFJsY2tKNVRtRnRaU2hjSW5WMGJXVmZkR1Z6ZEY5elpYSjJaWEpjSWlrZ2ZId2dYQ0pvZEhSd09pOHZNVGt5TGpFMk9DNHlNREF1TVRNMk9qa3dORE12WENJN1hHNTlYRzVjYm5aaGNpQnpaWEoyWlhKU1pYQnZjblJsY2lBOUlIdGNiaUFnSUNCbGNuSnZjam9nWm5WdVkzUnBiMjRnS0dWeWNtOXlMQ0J6WTJWdVlYSnBieXdnZFhSdFpTa2dlMXh1SUNBZ0lDQWdJQ0FrTG1GcVlYZ29lMXh1SUNBZ0lDQWdJQ0FnSUhSNWNHVTZJRndpVUU5VFZGd2lMRnh1SUNBZ0lDQWdJQ0FnSUhWeWJEb2daMlYwUW1GelpWVlNUQ2dwSUNzZ1hDSmxjbkp2Y2x3aUxGeHVJQ0FnSUNBZ0lDQWdJR1JoZEdFNklIc2daR0YwWVRvZ1pYSnliM0lnZlN4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoVkhsd1pUb2dYQ0pxYzI5dVhDSmNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG5OMFlYUmxMbk5sZEhScGJtZHpMbWRsZENoY0ltTnZibk52YkdWTWIyZG5hVzVuWENJcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnWTI5dWMyOXNaUzVsY25KdmNpaGxjbkp2Y2lrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhOMVkyTmxjM002SUdaMWJtTjBhVzl1SUNoemRXTmpaWE56TENCelkyVnVZWEpwYnl3Z2RYUnRaU2tnZTF4dUlDQWdJQ0FnSUNBa0xtRnFZWGdvZTF4dUlDQWdJQ0FnSUNBZ0lIUjVjR1U2SUZ3aVVFOVRWRndpTEZ4dUlDQWdJQ0FnSUNBZ0lIVnliRG9nWjJWMFFtRnpaVlZTVENncElDc2dYQ0p6ZFdOalpYTnpYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVG9nZXlCa1lYUmhPaUJ6ZFdOalpYTnpJSDBzWEc0Z0lDQWdJQ0FnSUNBZ1pHRjBZVlI1Y0dVNklGd2lhbk52Ymx3aVhHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6ZEdGMFpTNXpaWFIwYVc1bmN5NW5aWFFvWENKamIyNXpiMnhsVEc5bloybHVaMXdpS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJR052Ym5OdmJHVXViRzluS0hOMVkyTmxjM01wTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0JzYjJjNklHWjFibU4wYVc5dUlDaHNiMmNzSUhOalpXNWhjbWx2TENCMWRHMWxLU0I3WEc0Z0lDQWdJQ0FnSUNRdVlXcGhlQ2g3WEc0Z0lDQWdJQ0FnSUNBZ2RIbHdaVG9nWENKUVQxTlVYQ0lzWEc0Z0lDQWdJQ0FnSUNBZ2RYSnNPaUFnWjJWMFFtRnpaVlZTVENncElDc2dYQ0pzYjJkY0lpeGNiaUFnSUNBZ0lDQWdJQ0JrWVhSaE9pQjdJR1JoZEdFNklHeHZaeUI5TEZ4dUlDQWdJQ0FnSUNBZ0lHUmhkR0ZVZVhCbE9pQmNJbXB6YjI1Y0lseHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIVjBiV1V1YzNSaGRHVXVjMlYwZEdsdVozTXVaMlYwS0Z3aVkyOXVjMjlzWlV4dloyZHBibWRjSWlrcElIdGNiaUFnSUNBZ0lDQWdJQ0JqYjI1emIyeGxMbXh2Wnloc2IyY3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmx4dUlDQWdJR3h2WVdSVFkyVnVZWEpwYnpvZ1puVnVZM1JwYjI0Z0tHNWhiV1VzSUdOaGJHeGlZV05yS1NCN1hHNGdJQ0FnSUNBZ0lDUXVZV3BoZUNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JxYzI5dWNEb2dYQ0pqWVd4c1ltRmphMXdpTEZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1MFpXNTBWSGx3WlRvZ1hDSmhjSEJzYVdOaGRHbHZiaTlxYzI5dU95QmphR0Z5YzJWMFBYVjBaaTA0WENJc1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdOeWIzTnpSRzl0WVdsdU9pQjBjblZsTEZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0IxY213NklDQm5aWFJDWVhObFZWSk1LQ2tnS3lCY0luTmpaVzVoY21sdkwxd2lJQ3NnYm1GdFpTeGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdkR1ZzYkNCcVVYVmxjbmtnZDJVbmNtVWdaWGh3WldOMGFXNW5JRXBUVDA1UVhHNGdJQ0FnSUNBZ0lDQWdJQ0JrWVhSaFZIbHdaVG9nWENKcWMyOXVjRndpTEZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0J6ZFdOalpYTnpPaUJtZFc1amRHbHZiaUFvY21WemNDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05oYkd4aVlXTnJLSEpsYzNBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2MyRjJaVk5qWlc1aGNtbHZPaUJtZFc1amRHbHZiaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0pDNWhhbUY0S0h0Y2JpQWdJQ0FnSUNBZ0lDQjBlWEJsT2lCY0lsQlBVMVJjSWl4Y2JpQWdJQ0FnSUNBZ0lDQjFjbXc2SUdkbGRFSmhjMlZWVWt3b0tTQXJJRndpYzJObGJtRnlhVzljSWl4Y2JpQWdJQ0FnSUNBZ0lDQmtZWFJoT2lCS1UwOU9Mbk4wY21sdVoybG1lU2h6WTJWdVlYSnBieXdnYm5Wc2JDd2dYQ0lnWENJcExGeHVJQ0FnSUNBZ0lDQWdJR1JoZEdGVWVYQmxPaUFuYW5OdmJpY3NYRzRnSUNBZ0lDQWdJQ0FnWTI5dWRHVnVkRlI1Y0dVNklGd2lZWEJ3YkdsallYUnBiMjR2YW5OdmJsd2lYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0JzYjJGa1UyVjBkR2x1WjNNNklHWjFibU4wYVc5dUlDaGpZV3hzWW1GamF5d2daWEp5YjNJcElIdGNiaUFnSUNBZ0lDQWdKQzVoYW1GNEtIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSNWNHVTZJRndpUjBWVVhDSXNYRzRnSUNBZ0lDQWdJQ0FnSUNCamIyNTBaVzUwVkhsd1pUb2dYQ0pjSWl4Y2JpQWdJQ0FnSUNBZ0lDQWdJR055YjNOelJHOXRZV2x1T2lCMGNuVmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUFnWjJWMFFtRnpaVlZTVENncElDc2dYQ0p6WlhSMGFXNW5jMXdpTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnZEdWc2JDQnFVWFZsY25rZ2QyVW5jbVVnWlhod1pXTjBhVzVuSUVwVFQwNVFYRzRnSUNBZ0lDQWdJQ0FnSUNCa1lYUmhWSGx3WlRvZ1hDSnFjMjl1WENJc1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhOMVkyTmxjM002SUdaMWJtTjBhVzl1SUNoeVpYTndLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWTJGc2JHSmhZMnNvY21WemNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUxGeHVJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSTZJR1oxYm1OMGFXOXVJQ2hsY25JcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxjbkp2Y2lobGNuSXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlYRzU5TzF4dVhHNTFkRzFsTG5KbFoybHpkR1Z5VW1Wd2IzSjBTR0Z1Wkd4bGNpaHpaWEoyWlhKU1pYQnZjblJsY2lrN1hHNTFkRzFsTG5KbFoybHpkR1Z5VEc5aFpFaGhibVJzWlhJb2MyVnlkbVZ5VW1Wd2IzSjBaWEl1Ykc5aFpGTmpaVzVoY21sdktUdGNiblYwYldVdWNtVm5hWE4wWlhKVFlYWmxTR0Z1Wkd4bGNpaHpaWEoyWlhKU1pYQnZjblJsY2k1ellYWmxVMk5sYm1GeWFXOHBPMXh1ZFhSdFpTNXlaV2RwYzNSbGNsTmxkSFJwYm1kelRHOWhaRWhoYm1Sc1pYSW9jMlZ5ZG1WeVVtVndiM0owWlhJdWJHOWhaRk5sZEhScGJtZHpLVHRjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVR0Z5WVcxbGRHVnlRbmxPWVcxbEtHNWhiV1VwSUh0Y2JpQWdJQ0J1WVcxbElEMGdibUZ0WlM1eVpYQnNZV05sS0M5YlhGeGJYUzhzSUZ3aVhGeGNYRnRjSWlrdWNtVndiR0ZqWlNndlcxeGNYVjB2TENCY0lseGNYRnhkWENJcE8xeHVJQ0FnSUhaaGNpQnlaV2RsZUNBOUlHNWxkeUJTWldkRmVIQW9YQ0piWEZ4Y1hEOG1YVndpSUNzZ2JtRnRaU0FySUZ3aVBTaGJYaVlqWFNvcFhDSXBMRnh1SUNBZ0lDQWdJQ0J5WlhOMWJIUnpJRDBnY21WblpYZ3VaWGhsWXloc2IyTmhkR2x2Ymk1elpXRnlZMmdwTzF4dUlDQWdJSEpsZEhWeWJpQnlaWE4xYkhSeklEMDlQU0J1ZFd4c0lEOGdYQ0pjSWlBNklHUmxZMjlrWlZWU1NVTnZiWEJ2Ym1WdWRDaHlaWE4xYkhSeld6RmRMbkpsY0d4aFkyVW9MMXhjS3k5bkxDQmNJaUJjSWlrcE8xeHVmVnh1SWwxOSIsIlxuXG4vKipcbiogR2VuZXJhdGUgdW5pcXVlIENTUyBzZWxlY3RvciBmb3IgZ2l2ZW4gRE9NIGVsZW1lbnRcbipcbiogQHBhcmFtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtTdHJpbmd9XG4qIEBhcGkgcHJpdmF0ZVxuKi9cblxuZnVuY3Rpb24gdW5pcXVlKGVsLCBkb2MpIHtcbiAgaWYgKCFlbCB8fCAhZWwudGFnTmFtZSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0VsZW1lbnQgZXhwZWN0ZWQnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRTZWxlY3RvckluZGV4KGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gICAgICB2YXIgZXhpc3RpbmdJbmRleCA9IDA7XG4gICAgICB2YXIgaXRlbXMgPSAgZG9jLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGl0ZW1zW2ldID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICAgIGV4aXN0aW5nSW5kZXggPSBpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpc3RpbmdJbmRleDtcbiAgfVxuXG4gIHZhciBlbFNlbGVjdG9yID0gZ2V0RWxlbWVudFNlbGVjdG9yKGVsKS5zZWxlY3RvcjtcbiAgdmFyIGlzU2ltcGxlU2VsZWN0b3IgPSBlbFNlbGVjdG9yID09PSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gIHZhciBhbmNlc3RvclNlbGVjdG9yO1xuXG4gIHZhciBjdXJyRWxlbWVudCA9IGVsO1xuICB3aGlsZSAoY3VyckVsZW1lbnQucGFyZW50RWxlbWVudCAhPSBudWxsICYmICFhbmNlc3RvclNlbGVjdG9yKSB7XG4gICAgICBjdXJyRWxlbWVudCA9IGN1cnJFbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBnZXRFbGVtZW50U2VsZWN0b3IoY3VyckVsZW1lbnQpLnNlbGVjdG9yO1xuXG4gICAgICAvLyBUeXBpY2FsbHkgZWxlbWVudHMgdGhhdCBoYXZlIGEgY2xhc3MgbmFtZSBvciB0aXRsZSwgdGhvc2UgYXJlIGxlc3MgbGlrZWx5XG4gICAgICAvLyB0byBjaGFuZ2UsIGFuZCBhbHNvIGJlIHVuaXF1ZS4gIFNvLCB3ZSBhcmUgdHJ5aW5nIHRvIGZpbmQgYW4gYW5jZXN0b3JcbiAgICAgIC8vIHRvIGFuY2hvciAob3Igc2NvcGUpIHRoZSBzZWFyY2ggZm9yIHRoZSBlbGVtZW50LCBhbmQgbWFrZSBpdCBsZXNzIGJyaXR0bGUuXG4gICAgICBpZiAoc2VsZWN0b3IgIT09IGN1cnJFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgIGFuY2VzdG9yU2VsZWN0b3IgPSBzZWxlY3RvciArIChjdXJyRWxlbWVudCA9PT0gZWwucGFyZW50RWxlbWVudCAmJiBpc1NpbXBsZVNlbGVjdG9yID8gXCIgPiBcIiA6IFwiIFwiKSArIGVsU2VsZWN0b3I7XG4gICAgICB9XG4gIH1cblxuICB2YXIgZmluYWxTZWxlY3RvcnMgPSBbXTtcbiAgaWYgKGFuY2VzdG9yU2VsZWN0b3IpIHtcbiAgICBmaW5hbFNlbGVjdG9ycy5wdXNoKFxuICAgICAgYW5jZXN0b3JTZWxlY3RvciArIFwiOmVxKFwiICsgX2dldFNlbGVjdG9ySW5kZXgoZWwsIGFuY2VzdG9yU2VsZWN0b3IpICsgXCIpXCJcbiAgICApO1xuICB9XG5cbiAgZmluYWxTZWxlY3RvcnMucHVzaChlbFNlbGVjdG9yICsgXCI6ZXEoXCIgKyBfZ2V0U2VsZWN0b3JJbmRleChlbCwgZWxTZWxlY3RvcikgKyBcIilcIik7XG4gIHJldHVybiBmaW5hbFNlbGVjdG9ycztcbn07XG5cbi8qKlxuKiBHZXQgY2xhc3MgbmFtZXMgZm9yIGFuIGVsZW1lbnRcbipcbiogQHBhcmFybSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7QXJyYXl9XG4qL1xuXG5mdW5jdGlvbiBnZXRDbGFzc05hbWVzKGVsKSB7XG4gIHZhciBjbGFzc05hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSAmJiBjbGFzc05hbWUucmVwbGFjZSgndXRtZS12ZXJpZnknLCAnJyk7XG4gIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSAmJiBjbGFzc05hbWUucmVwbGFjZSgndXRtZS1yZWFkeScsICcnKTtcblxuICBpZiAoIWNsYXNzTmFtZSB8fCAoIWNsYXNzTmFtZS50cmltKCkubGVuZ3RoKSkgeyByZXR1cm4gW107IH1cblxuICAvLyByZW1vdmUgZHVwbGljYXRlIHdoaXRlc3BhY2VcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnJlcGxhY2UoL1xccysvZywgJyAnKTtcblxuICAvLyB0cmltIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2VcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcblxuICAvLyBzcGxpdCBpbnRvIHNlcGFyYXRlIGNsYXNzbmFtZXNcbiAgcmV0dXJuIGNsYXNzTmFtZS50cmltKCkuc3BsaXQoJyAnKTtcbn1cblxuLyoqXG4qIENTUyBzZWxlY3RvcnMgdG8gZ2VuZXJhdGUgdW5pcXVlIHNlbGVjdG9yIGZvciBET00gZWxlbWVudFxuKlxuKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge0FycmF5fVxuKiBAYXBpIHBydmlhdGVcbiovXG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRTZWxlY3RvcihlbCwgaXNVbmlxdWUpIHtcbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBsYWJlbCA9IG51bGw7XG4gIHZhciB0aXRsZSA9IG51bGw7XG4gIHZhciBhbHQgICA9IG51bGw7XG4gIHZhciBuYW1lICA9IG51bGw7XG4gIHZhciB2YWx1ZSA9IG51bGw7XG4gIHZhciBtZSA9IGVsO1xuXG4gIC8vIGRvIHtcblxuICAvLyBJRHMgYXJlIHVuaXF1ZSBlbm91Z2hcbiAgaWYgKGVsLmlkKSB7XG4gICAgbGFiZWwgPSAnW2lkPVxcJycgKyBlbC5pZCArIFwiXFwnXVwiO1xuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSwgdXNlIHRhZyBuYW1lXG4gICAgbGFiZWwgICAgID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgdmFyIGNsYXNzTmFtZXMgPSBnZXRDbGFzc05hbWVzKGVsKTtcblxuICAgIC8vIFRhZyBuYW1lcyBjb3VsZCB1c2UgY2xhc3NlcyBmb3Igc3BlY2lmaWNpdHlcbiAgICBpZiAoY2xhc3NOYW1lcy5sZW5ndGgpIHtcbiAgICAgIGxhYmVsICs9ICcuJyArIGNsYXNzTmFtZXMuam9pbignLicpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRpdGxlcyAmIEFsdCBhdHRyaWJ1dGVzIGFyZSB2ZXJ5IHVzZWZ1bCBmb3Igc3BlY2lmaWNpdHkgYW5kIHRyYWNraW5nXG4gIGlmICh0aXRsZSA9IGVsLmdldEF0dHJpYnV0ZSgndGl0bGUnKSkge1xuICAgIGxhYmVsICs9ICdbdGl0bGU9XCInICsgdGl0bGUgKyAnXCJdJztcbiAgfSBlbHNlIGlmIChhbHQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2FsdCcpKSB7XG4gICAgbGFiZWwgKz0gJ1thbHQ9XCInICsgYWx0ICsgJ1wiXSc7XG4gIH0gZWxzZSBpZiAobmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpKSB7XG4gICAgbGFiZWwgKz0gJ1tuYW1lPVwiJyArIG5hbWUgKyAnXCJdJztcbiAgfVxuXG4gIGlmICh2YWx1ZSA9IGVsLmdldEF0dHJpYnV0ZSgndmFsdWUnKSkge1xuICAgIGxhYmVsICs9ICdbdmFsdWU9XCInICsgdmFsdWUgKyAnXCJdJztcbiAgfVxuXG4gIC8vIGlmIChlbC5pbm5lclRleHQubGVuZ3RoICE9IDApIHtcbiAgLy8gICBsYWJlbCArPSAnOmNvbnRhaW5zKCcgKyBlbC5pbm5lclRleHQgKyAnKSc7XG4gIC8vIH1cblxuICBwYXJ0cy51bnNoaWZ0KHtcbiAgICBlbGVtZW50OiBlbCxcbiAgICBzZWxlY3RvcjogbGFiZWxcbiAgfSk7XG5cbiAgLy8gaWYgKGlzVW5pcXVlKHBhcnRzKSkge1xuICAvLyAgICAgYnJlYWs7XG4gIC8vIH1cblxuICAvLyB9IHdoaWxlICghZWwuaWQgJiYgKGVsID0gZWwucGFyZW50Tm9kZSkgJiYgZWwudGFnTmFtZSk7XG5cbiAgLy8gU29tZSBzZWxlY3RvcnMgc2hvdWxkIGhhdmUgbWF0Y2hlZCBhdCBsZWFzdFxuICBpZiAoIXBhcnRzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGlkZW50aWZ5IENTUyBzZWxlY3RvcicpO1xuICB9XG4gIHJldHVybiBwYXJ0c1swXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1bmlxdWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNObGJHVmpkRzl5Um1sdVpHVnlMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMyVnNaV04wYjNKR2FXNWtaWEl1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdPMEZCUlVFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVUZGUVN4RlFVRkZPenRCUVVWR0xGTkJRVk1zVFVGQlRTeERRVUZETEVWQlFVVXNSVUZCUlN4SFFVRkhMRVZCUVVVN1JVRkRka0lzU1VGQlNTeERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRVZCUVVVc1EwRkJReXhQUVVGUExFVkJRVVU3U1VGRGRFSXNUVUZCVFN4SlFVRkpMRk5CUVZNc1EwRkJReXhyUWtGQmEwSXNRMEZCUXl4RFFVRkRPMEZCUXpWRExFZEJRVWM3TzBWQlJVUXNVMEZCVXl4cFFrRkJhVUlzUTBGQlF5eFBRVUZQTEVWQlFVVXNVVUZCVVN4RlFVRkZPMDFCUXpGRExFbEJRVWtzWVVGQllTeEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTTFRaXhOUVVGTkxFbEJRVWtzUzBGQlN5eEpRVUZKTEVkQlFVY3NRMEZCUXl4blFrRkJaMElzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXpzN1RVRkZOVU1zUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1ZVRkRia01zU1VGQlNTeExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRMRXRCUVVzc1QwRkJUeXhGUVVGRk8yTkJRM1JDTEdGQlFXRXNSMEZCUnl4RFFVRkRMRU5CUVVNN1kwRkRiRUlzVFVGQlRUdFhRVU5VTzA5QlEwbzdUVUZEUkN4UFFVRlBMR0ZCUVdFc1EwRkJRenRCUVVNelFpeEhRVUZIT3p0RlFVVkVMRWxCUVVrc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkVzUTBGQlF6dEZRVU5xUkN4SlFVRkpMR2RDUVVGblFpeEhRVUZITEZWQlFWVXNTMEZCU3l4RlFVRkZMRU5CUVVNc1QwRkJUeXhEUVVGRExGZEJRVmNzUlVGQlJTeERRVUZETzBGQlEycEZMRVZCUVVVc1NVRkJTU3huUWtGQlowSXNRMEZCUXpzN1JVRkZja0lzU1VGQlNTeFhRVUZYTEVkQlFVY3NSVUZCUlN4RFFVRkRPMFZCUTNKQ0xFOUJRVThzVjBGQlZ5eERRVUZETEdGQlFXRXNTVUZCU1N4SlFVRkpMRWxCUVVrc1EwRkJReXhuUWtGQlowSXNSVUZCUlR0TlFVTXpSQ3hYUVVGWExFZEJRVWNzVjBGQlZ5eERRVUZETEdGQlFXRXNRMEZCUXp0QlFVTTVReXhOUVVGTkxFbEJRVWtzVVVGQlVTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExGZEJRVmNzUTBGQlF5eERRVUZETEZGQlFWRXNRMEZCUXp0QlFVTTVSRHRCUVVOQk8wRkJRMEU3TzAxQlJVMHNTVUZCU1N4UlFVRlJMRXRCUVVzc1YwRkJWeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNSVUZCUlR0VlFVTm9SQ3huUWtGQlowSXNSMEZCUnl4UlFVRlJMRWxCUVVrc1YwRkJWeXhMUVVGTExFVkJRVVVzUTBGQlF5eGhRVUZoTEVsQlFVa3NaMEpCUVdkQ0xFZEJRVWNzUzBGQlN5eEhRVUZITEVkQlFVY3NRMEZCUXl4SFFVRkhMRlZCUVZVc1EwRkJRenRQUVVOdVNEdEJRVU5RTEVkQlFVYzdPMFZCUlVRc1NVRkJTU3hqUVVGakxFZEJRVWNzUlVGQlJTeERRVUZETzBWQlEzaENMRWxCUVVrc1owSkJRV2RDTEVWQlFVVTdTVUZEY0VJc1kwRkJZeXhEUVVGRExFbEJRVWs3VFVGRGFrSXNaMEpCUVdkQ0xFZEJRVWNzVFVGQlRTeEhRVUZITEdsQ1FVRnBRaXhEUVVGRExFVkJRVVVzUlVGQlJTeG5Ra0ZCWjBJc1EwRkJReXhIUVVGSExFZEJRVWM3UzBGRE1VVXNRMEZCUXp0QlFVTk9MRWRCUVVjN08wVkJSVVFzWTBGQll5eERRVUZETEVsQlFVa3NRMEZCUXl4VlFVRlZMRWRCUVVjc1RVRkJUU3hIUVVGSExHbENRVUZwUWl4RFFVRkRMRVZCUVVVc1JVRkJSU3hWUVVGVkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXp0RlFVTnVSaXhQUVVGUExHTkJRV01zUTBGQlF6dEJRVU40UWl4RFFVRkRMRU5CUVVNN08wRkJSVVk3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1JVRkJSVHM3UVVGRlJpeFRRVUZUTEdGQlFXRXNRMEZCUXl4RlFVRkZMRVZCUVVVN1JVRkRla0lzU1VGQlNTeFRRVUZUTEVkQlFVY3NSVUZCUlN4RFFVRkRMRmxCUVZrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dEZRVU42UXl4VFFVRlRMRWRCUVVjc1UwRkJVeXhKUVVGSkxGTkJRVk1zUTBGQlF5eFBRVUZQTEVOQlFVTXNZVUZCWVN4RlFVRkZMRVZCUVVVc1EwRkJReXhEUVVGRE8wRkJRMmhGTEVWQlFVVXNVMEZCVXl4SFFVRkhMRk5CUVZNc1NVRkJTU3hUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZsQlFWa3NSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenM3UVVGRkwwUXNSVUZCUlN4SlFVRkpMRU5CUVVNc1UwRkJVeXhMUVVGTExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRMRTFCUVUwc1EwRkJReXhGUVVGRkxFVkJRVVVzVDBGQlR5eEZRVUZGTEVOQlFVTXNSVUZCUlR0QlFVTTVSRHM3UVVGRlFTeEZRVUZGTEZOQlFWTXNSMEZCUnl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExFMUJRVTBzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTTNRenM3UVVGRlFTeEZRVUZGTEZOQlFWTXNSMEZCUnl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGbEJRVmtzUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXp0QlFVTnNSRHM3UlVGRlJTeFBRVUZQTEZOQlFWTXNRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEY2tNc1EwRkJRenM3UVVGRlJEdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUVVWQkxFVkJRVVU3TzBGQlJVWXNVMEZCVXl4clFrRkJhMElzUTBGQlF5eEZRVUZGTEVWQlFVVXNVVUZCVVN4RlFVRkZPMFZCUTNoRExFbEJRVWtzUzBGQlN5eEhRVUZITEVWQlFVVXNRMEZCUXp0RlFVTm1MRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEZRVU5xUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU03UlVGRGFrSXNTVUZCU1N4SFFVRkhMRXRCUVVzc1NVRkJTU3hEUVVGRE8wVkJRMnBDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRWxCUVVrc1EwRkJRenRGUVVOcVFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRia0lzUlVGQlJTeEpRVUZKTEVWQlFVVXNSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRaRHRCUVVOQk8wRkJRMEU3TzBWQlJVVXNTVUZCU1N4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8wbEJRMVFzUzBGQlN5eEhRVUZITEZGQlFWRXNSMEZCUnl4RlFVRkZMRU5CUVVNc1JVRkJSU3hIUVVGSExFdEJRVXNzUTBGQlF6dEJRVU55UXl4SFFVRkhMRTFCUVUwN08wRkJSVlFzU1VGQlNTeExRVUZMTEU5QlFVOHNSVUZCUlN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzUTBGQlF6czdRVUZGZWtNc1NVRkJTU3hKUVVGSkxGVkJRVlVzUjBGQlJ5eGhRVUZoTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNN1FVRkRka003TzBsQlJVa3NTVUZCU1N4VlFVRlZMRU5CUVVNc1RVRkJUU3hGUVVGRk8wMUJRM0pDTEV0QlFVc3NTVUZCU1N4SFFVRkhMRWRCUVVjc1ZVRkJWU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0TFFVTnlRenRCUVVOTUxFZEJRVWM3UVVGRFNEczdSVUZGUlN4SlFVRkpMRXRCUVVzc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZPMGxCUTNCRExFdEJRVXNzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJRenRIUVVOd1F5eE5RVUZOTEVsQlFVa3NSMEZCUnl4SFFVRkhMRVZCUVVVc1EwRkJReXhaUVVGWkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVTdTVUZEZGtNc1MwRkJTeXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEhRVUZITEVkQlFVY3NTVUZCU1N4RFFVRkRPMGRCUTJoRExFMUJRVTBzU1VGQlNTeEpRVUZKTEVkQlFVY3NSVUZCUlN4RFFVRkRMRmxCUVZrc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJUdEpRVU42UXl4TFFVRkxMRWxCUVVrc1UwRkJVeXhIUVVGSExFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEY2tNc1IwRkJSenM3UlVGRlJDeEpRVUZKTEV0QlFVc3NSMEZCUnl4RlFVRkZMRU5CUVVNc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eEZRVUZGTzBsQlEzQkRMRXRCUVVzc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0QlFVTjJReXhIUVVGSE8wRkJRMGc3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMFZCUlVVc1MwRkJTeXhEUVVGRExFOUJRVThzUTBGQlF6dEpRVU5hTEU5QlFVOHNSVUZCUlN4RlFVRkZPMGxCUTFnc1VVRkJVU3hGUVVGRkxFdEJRVXM3UVVGRGJrSXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRURHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1JVRkZSU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSVUZCUlR0SlFVTnFRaXhOUVVGTkxFbEJRVWtzUzBGQlN5eERRVUZETEdsRFFVRnBReXhEUVVGRExFTkJRVU03UjBGRGNFUTdSVUZEUkN4UFFVRlBMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dEJRVU5zUWl4RFFVRkRPenRCUVVWRUxFMUJRVTBzUTBGQlF5eFBRVUZQTEVkQlFVY3NUVUZCVFN4RFFVRkRJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpWEc1Y2JpOHFLbHh1S2lCSFpXNWxjbUYwWlNCMWJtbHhkV1VnUTFOVElITmxiR1ZqZEc5eUlHWnZjaUJuYVhabGJpQkVUMDBnWld4bGJXVnVkRnh1S2x4dUtpQkFjR0Z5WVcwZ2UwVnNaVzFsYm5SOUlHVnNYRzRxSUVCeVpYUjFjbTRnZTFOMGNtbHVaMzFjYmlvZ1FHRndhU0J3Y21sMllYUmxYRzRxTDF4dVhHNW1kVzVqZEdsdmJpQjFibWx4ZFdVb1pXd3NJR1J2WXlrZ2UxeHVJQ0JwWmlBb0lXVnNJSHg4SUNGbGJDNTBZV2RPWVcxbEtTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25SV3hsYldWdWRDQmxlSEJsWTNSbFpDY3BPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWDJkbGRGTmxiR1ZqZEc5eVNXNWtaWGdvWld4bGJXVnVkQ3dnYzJWc1pXTjBiM0lwSUh0Y2JpQWdJQ0FnSUhaaGNpQmxlR2x6ZEdsdVowbHVaR1Y0SUQwZ01EdGNiaUFnSUNBZ0lIWmhjaUJwZEdWdGN5QTlJQ0JrYjJNdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNoelpXeGxZM1J2Y2lrN1hHNWNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dhWFJsYlhNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9hWFJsYlhOYmFWMGdQVDA5SUdWc1pXMWxiblFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhocGMzUnBibWRKYm1SbGVDQTlJR2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSEpsZEhWeWJpQmxlR2x6ZEdsdVowbHVaR1Y0TzF4dUlDQjlYRzVjYmlBZ2RtRnlJR1ZzVTJWc1pXTjBiM0lnUFNCblpYUkZiR1Z0Wlc1MFUyVnNaV04wYjNJb1pXd3BMbk5sYkdWamRHOXlPMXh1SUNCMllYSWdhWE5UYVcxd2JHVlRaV3hsWTNSdmNpQTlJR1ZzVTJWc1pXTjBiM0lnUFQwOUlHVnNMblJoWjA1aGJXVXVkRzlNYjNkbGNrTmhjMlVvS1R0Y2JpQWdkbUZ5SUdGdVkyVnpkRzl5VTJWc1pXTjBiM0k3WEc1Y2JpQWdkbUZ5SUdOMWNuSkZiR1Z0Wlc1MElEMGdaV3c3WEc0Z0lIZG9hV3hsSUNoamRYSnlSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwSUNFOUlHNTFiR3dnSmlZZ0lXRnVZMlZ6ZEc5eVUyVnNaV04wYjNJcElIdGNiaUFnSUNBZ0lHTjFjbkpGYkdWdFpXNTBJRDBnWTNWeWNrVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkRHRjYmlBZ0lDQWdJSFpoY2lCelpXeGxZM1J2Y2lBOUlHZGxkRVZzWlcxbGJuUlRaV3hsWTNSdmNpaGpkWEp5Uld4bGJXVnVkQ2t1YzJWc1pXTjBiM0k3WEc1Y2JpQWdJQ0FnSUM4dklGUjVjR2xqWVd4c2VTQmxiR1Z0Wlc1MGN5QjBhR0YwSUdoaGRtVWdZU0JqYkdGemN5QnVZVzFsSUc5eUlIUnBkR3hsTENCMGFHOXpaU0JoY21VZ2JHVnpjeUJzYVd0bGJIbGNiaUFnSUNBZ0lDOHZJSFJ2SUdOb1lXNW5aU3dnWVc1a0lHRnNjMjhnWW1VZ2RXNXBjWFZsTGlBZ1UyOHNJSGRsSUdGeVpTQjBjbmxwYm1jZ2RHOGdabWx1WkNCaGJpQmhibU5sYzNSdmNseHVJQ0FnSUNBZ0x5OGdkRzhnWVc1amFHOXlJQ2h2Y2lCelkyOXdaU2tnZEdobElITmxZWEpqYUNCbWIzSWdkR2hsSUdWc1pXMWxiblFzSUdGdVpDQnRZV3RsSUdsMElHeGxjM01nWW5KcGRIUnNaUzVjYmlBZ0lDQWdJR2xtSUNoelpXeGxZM1J2Y2lBaFBUMGdZM1Z5Y2tWc1pXMWxiblF1ZEdGblRtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncEtTQjdYRzRnSUNBZ0lDQWdJQ0FnWVc1alpYTjBiM0pUWld4bFkzUnZjaUE5SUhObGJHVmpkRzl5SUNzZ0tHTjFjbkpGYkdWdFpXNTBJRDA5UFNCbGJDNXdZWEpsYm5SRmJHVnRaVzUwSUNZbUlHbHpVMmx0Y0d4bFUyVnNaV04wYjNJZ1B5QmNJaUErSUZ3aUlEb2dYQ0lnWENJcElDc2daV3hUWld4bFkzUnZjanRjYmlBZ0lDQWdJSDFjYmlBZ2ZWeHVYRzRnSUhaaGNpQm1hVzVoYkZObGJHVmpkRzl5Y3lBOUlGdGRPMXh1SUNCcFppQW9ZVzVqWlhOMGIzSlRaV3hsWTNSdmNpa2dlMXh1SUNBZ0lHWnBibUZzVTJWc1pXTjBiM0p6TG5CMWMyZ29YRzRnSUNBZ0lDQmhibU5sYzNSdmNsTmxiR1ZqZEc5eUlDc2dYQ0k2WlhFb1hDSWdLeUJmWjJWMFUyVnNaV04wYjNKSmJtUmxlQ2hsYkN3Z1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2lrZ0t5QmNJaWxjSWx4dUlDQWdJQ2s3WEc0Z0lIMWNibHh1SUNCbWFXNWhiRk5sYkdWamRHOXljeTV3ZFhOb0tHVnNVMlZzWldOMGIzSWdLeUJjSWpwbGNTaGNJaUFySUY5blpYUlRaV3hsWTNSdmNrbHVaR1Y0S0dWc0xDQmxiRk5sYkdWamRHOXlLU0FySUZ3aUtWd2lLVHRjYmlBZ2NtVjBkWEp1SUdacGJtRnNVMlZzWldOMGIzSnpPMXh1ZlR0Y2JseHVMeW9xWEc0cUlFZGxkQ0JqYkdGemN5QnVZVzFsY3lCbWIzSWdZVzRnWld4bGJXVnVkRnh1S2x4dUtpQkFjR0Z5WVhKdElIdEZiR1Z0Wlc1MGZTQmxiRnh1S2lCQWNtVjBkWEp1SUh0QmNuSmhlWDFjYmlvdlhHNWNibVoxYm1OMGFXOXVJR2RsZEVOc1lYTnpUbUZ0WlhNb1pXd3BJSHRjYmlBZ2RtRnlJR05zWVhOelRtRnRaU0E5SUdWc0xtZGxkRUYwZEhKcFluVjBaU2duWTJ4aGMzTW5LVHRjYmlBZ1kyeGhjM05PWVcxbElEMGdZMnhoYzNOT1lXMWxJQ1ltSUdOc1lYTnpUbUZ0WlM1eVpYQnNZV05sS0NkMWRHMWxMWFpsY21sbWVTY3NJQ2NuS1R0Y2JpQWdZMnhoYzNOT1lXMWxJRDBnWTJ4aGMzTk9ZVzFsSUNZbUlHTnNZWE56VG1GdFpTNXlaWEJzWVdObEtDZDFkRzFsTFhKbFlXUjVKeXdnSnljcE8xeHVYRzRnSUdsbUlDZ2hZMnhoYzNOT1lXMWxJSHg4SUNnaFkyeGhjM05PWVcxbExuUnlhVzBvS1M1c1pXNW5kR2dwS1NCN0lISmxkSFZ5YmlCYlhUc2dmVnh1WEc0Z0lDOHZJSEpsYlc5MlpTQmtkWEJzYVdOaGRHVWdkMmhwZEdWemNHRmpaVnh1SUNCamJHRnpjMDVoYldVZ1BTQmpiR0Z6YzA1aGJXVXVjbVZ3YkdGalpTZ3ZYRnh6S3k5bkxDQW5JQ2NwTzF4dVhHNGdJQzh2SUhSeWFXMGdiR1ZoWkdsdVp5QmhibVFnZEhKaGFXeHBibWNnZDJocGRHVnpjR0ZqWlZ4dUlDQmpiR0Z6YzA1aGJXVWdQU0JqYkdGemMwNWhiV1V1Y21Wd2JHRmpaU2d2WGx4Y2N5dDhYRnh6S3lRdlp5d2dKeWNwTzF4dVhHNGdJQzh2SUhOd2JHbDBJR2x1ZEc4Z2MyVndZWEpoZEdVZ1kyeGhjM051WVcxbGMxeHVJQ0J5WlhSMWNtNGdZMnhoYzNOT1lXMWxMblJ5YVcwb0tTNXpjR3hwZENnbklDY3BPMXh1ZlZ4dVhHNHZLaXBjYmlvZ1ExTlRJSE5sYkdWamRHOXljeUIwYnlCblpXNWxjbUYwWlNCMWJtbHhkV1VnYzJWc1pXTjBiM0lnWm05eUlFUlBUU0JsYkdWdFpXNTBYRzRxWEc0cUlFQndZWEpoYlNCN1JXeGxiV1Z1ZEgwZ1pXeGNiaW9nUUhKbGRIVnliaUI3UVhKeVlYbDlYRzRxSUVCaGNHa2djSEoyYVdGMFpWeHVLaTljYmx4dVpuVnVZM1JwYjI0Z1oyVjBSV3hsYldWdWRGTmxiR1ZqZEc5eUtHVnNMQ0JwYzFWdWFYRjFaU2tnZTF4dUlDQjJZWElnY0dGeWRITWdQU0JiWFR0Y2JpQWdkbUZ5SUd4aFltVnNJRDBnYm5Wc2JEdGNiaUFnZG1GeUlIUnBkR3hsSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJR0ZzZENBZ0lEMGdiblZzYkR0Y2JpQWdkbUZ5SUc1aGJXVWdJRDBnYm5Wc2JEdGNiaUFnZG1GeUlIWmhiSFZsSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJRzFsSUQwZ1pXdzdYRzVjYmlBZ0x5OGdaRzhnZTF4dVhHNGdJQzh2SUVsRWN5QmhjbVVnZFc1cGNYVmxJR1Z1YjNWbmFGeHVJQ0JwWmlBb1pXd3VhV1FwSUh0Y2JpQWdJQ0JzWVdKbGJDQTlJQ2RiYVdROVhGd25KeUFySUdWc0xtbGtJQ3NnWENKY1hDZGRYQ0k3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1QzUm9aWEozYVhObExDQjFjMlVnZEdGbklHNWhiV1ZjYmlBZ0lDQnNZV0psYkNBZ0lDQWdQU0JsYkM1MFlXZE9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDazdYRzVjYmlBZ0lDQjJZWElnWTJ4aGMzTk9ZVzFsY3lBOUlHZGxkRU5zWVhOelRtRnRaWE1vWld3cE8xeHVYRzRnSUNBZ0x5OGdWR0ZuSUc1aGJXVnpJR052ZFd4a0lIVnpaU0JqYkdGemMyVnpJR1p2Y2lCemNHVmphV1pwWTJsMGVWeHVJQ0FnSUdsbUlDaGpiR0Z6YzA1aGJXVnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdiR0ZpWld3Z0t6MGdKeTRuSUNzZ1kyeGhjM05PWVcxbGN5NXFiMmx1S0NjdUp5azdYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdMeThnVkdsMGJHVnpJQ1lnUVd4MElHRjBkSEpwWW5WMFpYTWdZWEpsSUhabGNua2dkWE5sWm5Wc0lHWnZjaUJ6Y0dWamFXWnBZMmwwZVNCaGJtUWdkSEpoWTJ0cGJtZGNiaUFnYVdZZ0tIUnBkR3hsSUQwZ1pXd3VaMlYwUVhSMGNtbGlkWFJsS0NkMGFYUnNaU2NwS1NCN1hHNGdJQ0FnYkdGaVpXd2dLejBnSjF0MGFYUnNaVDFjSWljZ0t5QjBhWFJzWlNBcklDZGNJbDBuTzF4dUlDQjlJR1ZzYzJVZ2FXWWdLR0ZzZENBOUlHVnNMbWRsZEVGMGRISnBZblYwWlNnbllXeDBKeWtwSUh0Y2JpQWdJQ0JzWVdKbGJDQXJQU0FuVzJGc2REMWNJaWNnS3lCaGJIUWdLeUFuWENKZEp6dGNiaUFnZlNCbGJITmxJR2xtSUNodVlXMWxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2R1WVcxbEp5a3BJSHRjYmlBZ0lDQnNZV0psYkNBclBTQW5XMjVoYldVOVhDSW5JQ3NnYm1GdFpTQXJJQ2RjSWwwbk8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0haaGJIVmxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2QyWVd4MVpTY3BLU0I3WEc0Z0lDQWdiR0ZpWld3Z0t6MGdKMXQyWVd4MVpUMWNJaWNnS3lCMllXeDFaU0FySUNkY0lsMG5PMXh1SUNCOVhHNWNiaUFnTHk4Z2FXWWdLR1ZzTG1sdWJtVnlWR1Y0ZEM1c1pXNW5kR2dnSVQwZ01Da2dlMXh1SUNBdkx5QWdJR3hoWW1Wc0lDczlJQ2M2WTI5dWRHRnBibk1vSnlBcklHVnNMbWx1Ym1WeVZHVjRkQ0FySUNjcEp6dGNiaUFnTHk4Z2ZWeHVYRzRnSUhCaGNuUnpMblZ1YzJocFpuUW9lMXh1SUNBZ0lHVnNaVzFsYm5RNklHVnNMRnh1SUNBZ0lITmxiR1ZqZEc5eU9pQnNZV0psYkZ4dUlDQjlLVHRjYmx4dUlDQXZMeUJwWmlBb2FYTlZibWx4ZFdVb2NHRnlkSE1wS1NCN1hHNGdJQzh2SUNBZ0lDQmljbVZoYXp0Y2JpQWdMeThnZlZ4dVhHNGdJQzh2SUgwZ2QyaHBiR1VnS0NGbGJDNXBaQ0FtSmlBb1pXd2dQU0JsYkM1d1lYSmxiblJPYjJSbEtTQW1KaUJsYkM1MFlXZE9ZVzFsS1R0Y2JseHVJQ0F2THlCVGIyMWxJSE5sYkdWamRHOXljeUJ6YUc5MWJHUWdhR0YyWlNCdFlYUmphR1ZrSUdGMElHeGxZWE4wWEc0Z0lHbG1JQ2doY0dGeWRITXViR1Z1WjNSb0tTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkR1lXbHNaV1FnZEc4Z2FXUmxiblJwWm5rZ1ExTlRJSE5sYkdWamRHOXlKeWs3WEc0Z0lIMWNiaUFnY21WMGRYSnVJSEJoY25Seld6QmRPMXh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlIVnVhWEYxWlR0Y2JpSmRmUT09IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgbG9jYWxfc3RvcmFnZV9rZXkgPSAndXRtZS1zZXR0aW5ncyc7XG5cbmZ1bmN0aW9uIFNldHRpbmdzIChkZWZhdWx0U2V0dGluZ3MpIHtcbiAgICB0aGlzLnNldERlZmF1bHRzKGRlZmF1bHRTZXR0aW5ncyB8fCB7fSk7XG59XG5cblNldHRpbmdzLnByb3RvdHlwZSA9IHtcbiAgICByZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZXR0aW5nc1N0cmluZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGxvY2FsX3N0b3JhZ2Vfa2V5KTtcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge307XG4gICAgICAgIGlmIChzZXR0aW5nc1N0cmluZykge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBKU09OLnBhcnNlKHNldHRpbmdzU3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldERlZmF1bHRzOiBmdW5jdGlvbiAoZGVmYXVsdFNldHRpbmdzKSB7XG4gICAgICAgIHZhciBsb2NhbFNldHRpbmdzID0gdGhpcy5yZWFkU2V0dGluZ3NGcm9tTG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIHZhciBkZWZhdWx0c0NvcHkgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdFNldHRpbmdzIHx8IHt9KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IF8uZXh0ZW5kKHt9LCBfLmV4dGVuZChkZWZhdWx0c0NvcHksIGxvY2FsU2V0dGluZ3MpKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0U2V0dGluZ3MgPSBkZWZhdWx0U2V0dGluZ3M7XG4gICAgfSxcblxuICAgIHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5nc1trZXldID0gdmFsdWU7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH0sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3Nba2V5XTtcbiAgICB9LFxuXG4gICAgc2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShsb2NhbF9zdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkodGhpcy5zZXR0aW5ncykpO1xuICAgIH0sXG4gICAgXG4gICAgcmVzZXREZWZhdWx0czogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmYXVsdHMgPSB0aGlzLmRlZmF1bHRTZXR0aW5ncztcbiAgICAgICAgaWYgKGRlZmF1bHRzKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzID0gXy5leHRlbmQoe30sIGRlZmF1bHRzKTtcbiAgICAgICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5ncztcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05sZEhScGJtZHpMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMyVjBkR2x1WjNNdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUVzU1VGQlNTeERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRek5DTEVsQlFVa3NhVUpCUVdsQ0xFZEJRVWNzWlVGQlpTeERRVUZET3p0QlFVVjRReXhUUVVGVExGRkJRVkVzUlVGQlJTeGxRVUZsTEVWQlFVVTdTVUZEYUVNc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eGxRVUZsTEVsQlFVa3NSVUZCUlN4RFFVRkRMRU5CUVVNN1FVRkROVU1zUTBGQlF6czdRVUZGUkN4UlFVRlJMRU5CUVVNc1UwRkJVeXhIUVVGSE8wbEJRMnBDTERSQ1FVRTBRaXhGUVVGRkxGbEJRVms3VVVGRGRFTXNTVUZCU1N4alFVRmpMRWRCUVVjc1dVRkJXU3hEUVVGRExFOUJRVThzUTBGQlF5eHBRa0ZCYVVJc1EwRkJReXhEUVVGRE8xRkJRemRFTEVsQlFVa3NVVUZCVVN4SFFVRkhMRVZCUVVVc1EwRkJRenRSUVVOc1FpeEpRVUZKTEdOQlFXTXNSVUZCUlR0WlFVTm9RaXhSUVVGUkxFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4alFVRmpMRU5CUVVNc1EwRkJRenRUUVVONlF6dFJRVU5FTEU5QlFVOHNVVUZCVVN4RFFVRkRPMEZCUTNoQ0xFdEJRVXM3TzBsQlJVUXNWMEZCVnl4RlFVRkZMRlZCUVZVc1pVRkJaU3hGUVVGRk8xRkJRM0JETEVsQlFVa3NZVUZCWVN4SFFVRkhMRWxCUVVrc1EwRkJReXcwUWtGQk5FSXNSVUZCUlN4RFFVRkRPMUZCUTNoRUxFbEJRVWtzV1VGQldTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxHVkJRV1VzU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXp0UlFVTjJSQ3hKUVVGSkxFTkJRVU1zVVVGQlVTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNXVUZCV1N4RlFVRkZMR0ZCUVdFc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGNFVXNTVUZCU1N4RFFVRkRMR1ZCUVdVc1IwRkJSeXhsUVVGbExFTkJRVU03UVVGREwwTXNTMEZCU3pzN1NVRkZSQ3hIUVVGSExFVkJRVVVzVlVGQlZTeEhRVUZITEVWQlFVVXNTMEZCU3l4RlFVRkZPMUZCUTNaQ0xFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRE8xRkJRek5DTEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJRenRCUVVOd1FpeExRVUZMT3p0SlFVVkVMRWRCUVVjc1JVRkJSU3hWUVVGVkxFZEJRVWNzUlVGQlJUdFJRVU5vUWl4UFFVRlBMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdRVUZEYkVNc1MwRkJTenM3U1VGRlJDeEpRVUZKTEVWQlFVVXNXVUZCV1R0UlFVTmtMRmxCUVZrc1EwRkJReXhQUVVGUExFTkJRVU1zYVVKQlFXbENMRVZCUVVVc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVNdlJTeExRVUZMT3p0SlFVVkVMR0ZCUVdFc1JVRkJSU3haUVVGWk8xRkJRM1pDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRWxCUVVrc1EwRkJReXhsUVVGbExFTkJRVU03VVVGRGNFTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRWaXhKUVVGSkxFTkJRVU1zVVVGQlVTeEhRVUZITEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1JVRkJSU3hGUVVGRkxGRkJRVkVzUTBGQlF5eERRVUZETzFsQlEzWkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF6dFRRVU5tTzB0QlEwbzdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVFVGQlRTeERRVUZETEU5QlFVOHNSMEZCUnl4UlFVRlJMRU5CUVVNaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SjJZWElnWHlBOUlISmxjWFZwY21Vb0p5NHZkWFJwYkhNbktUdGNiblpoY2lCc2IyTmhiRjl6ZEc5eVlXZGxYMnRsZVNBOUlDZDFkRzFsTFhObGRIUnBibWR6Snp0Y2JseHVablZ1WTNScGIyNGdVMlYwZEdsdVozTWdLR1JsWm1GMWJIUlRaWFIwYVc1bmN5a2dlMXh1SUNBZ0lIUm9hWE11YzJWMFJHVm1ZWFZzZEhNb1pHVm1ZWFZzZEZObGRIUnBibWR6SUh4OElIdDlLVHRjYm4xY2JseHVVMlYwZEdsdVozTXVjSEp2ZEc5MGVYQmxJRDBnZTF4dUlDQWdJSEpsWVdSVFpYUjBhVzVuYzBaeWIyMU1iMk5oYkZOMGIzSmhaMlU2SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhObGRIUnBibWR6VTNSeWFXNW5JRDBnYkc5allXeFRkRzl5WVdkbExtZGxkRWwwWlcwb2JHOWpZV3hmYzNSdmNtRm5aVjlyWlhrcE8xeHVJQ0FnSUNBZ0lDQjJZWElnYzJWMGRHbHVaM01nUFNCN2ZUdGNiaUFnSUNBZ0lDQWdhV1lnS0hObGRIUnBibWR6VTNSeWFXNW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpaWFIwYVc1bmN5QTlJRXBUVDA0dWNHRnljMlVvYzJWMGRHbHVaM05UZEhKcGJtY3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6WlhSMGFXNW5jenRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMlYwUkdWbVlYVnNkSE02SUdaMWJtTjBhVzl1SUNoa1pXWmhkV3gwVTJWMGRHbHVaM01wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3h2WTJGc1UyVjBkR2x1WjNNZ1BTQjBhR2x6TG5KbFlXUlRaWFIwYVc1bmMwWnliMjFNYjJOaGJGTjBiM0poWjJVb0tUdGNiaUFnSUNBZ0lDQWdkbUZ5SUdSbFptRjFiSFJ6UTI5d2VTQTlJRjh1WlhoMFpXNWtLSHQ5TENCa1pXWmhkV3gwVTJWMGRHbHVaM01nZkh3Z2UzMHBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkSFJwYm1keklEMGdYeTVsZUhSbGJtUW9lMzBzSUY4dVpYaDBaVzVrS0dSbFptRjFiSFJ6UTI5d2VTd2diRzlqWVd4VFpYUjBhVzVuY3lrcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG1SbFptRjFiSFJUWlhSMGFXNW5jeUE5SUdSbFptRjFiSFJUWlhSMGFXNW5jenRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjMlYwT2lCbWRXNWpkR2x2YmlBb2EyVjVMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkSFJwYm1kelcydGxlVjBnUFNCMllXeDFaVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpZWFpsS0NrN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUdkbGREb2dablZ1WTNScGIyNGdLR3RsZVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTV6WlhSMGFXNW5jMXRyWlhsZE8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCellYWmxPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lHeHZZMkZzVTNSdmNtRm5aUzV6WlhSSmRHVnRLR3h2WTJGc1gzTjBiM0poWjJWZmEyVjVMQ0JLVTA5T0xuTjBjbWx1WjJsbWVTaDBhR2x6TG5ObGRIUnBibWR6S1NrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JjYmlBZ0lDQnlaWE5sZEVSbFptRjFiSFJ6T2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCa1pXWmhkV3gwY3lBOUlIUm9hWE11WkdWbVlYVnNkRk5sZEhScGJtZHpPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pHVm1ZWFZzZEhNcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwZEdsdVozTWdQU0JmTG1WNGRHVnVaQ2g3ZlN3Z1pHVm1ZWFZzZEhNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpZWFpsS0NrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlPMXh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZObGRIUnBibWR6TzF4dUlsMTkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFNpbXVsYXRlID0ge1xuICAgIGV2ZW50OiBmdW5jdGlvbihlbGVtZW50LCBldmVudE5hbWUsIG9wdGlvbnMpe1xuICAgICAgICB2YXIgZXZ0O1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiSFRNTEV2ZW50c1wiKTtcbiAgICAgICAgICAgIGV2dC5pbml0RXZlbnQoZXZlbnROYW1lLCBldmVudE5hbWUgIT0gJ21vdXNlZW50ZXInICYmIGV2ZW50TmFtZSAhPSAnbW91c2VsZWF2ZScsIHRydWUgKTtcbiAgICAgICAgICAgIF8uZXh0ZW5kKGV2dCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudE9iamVjdCgpO1xuICAgICAgICAgICAgZWxlbWVudC5maXJlRXZlbnQoJ29uJyArIGV2ZW50TmFtZSxldnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBrZXlFdmVudDogZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgb3B0aW9ucyl7XG4gICAgICAgIHZhciBldnQsXG4gICAgICAgICAgICBlID0ge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUsIHZpZXc6IHdpbmRvdyxcbiAgICAgICAgICAgICAgICBjdHJsS2V5OiBmYWxzZSwgYWx0S2V5OiBmYWxzZSwgc2hpZnRLZXk6IGZhbHNlLCBtZXRhS2V5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBrZXlDb2RlOiAwLCBjaGFyQ29kZTogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgXy5leHRlbmQoZSwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCl7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0tleUV2ZW50cycpO1xuICAgICAgICAgICAgICAgIGV2dC5pbml0S2V5RXZlbnQoXG4gICAgICAgICAgICAgICAgICAgIHR5cGUsIGUuYnViYmxlcywgZS5jYW5jZWxhYmxlLCBlLnZpZXcsXG4gICAgICAgICAgICBlLmN0cmxLZXksIGUuYWx0S2V5LCBlLnNoaWZ0S2V5LCBlLm1ldGFLZXksXG4gICAgICAgICAgICBlLmtleUNvZGUsIGUuY2hhckNvZGUpO1xuICAgICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiRXZlbnRzXCIpO1xuICAgICAgICBldnQuaW5pdEV2ZW50KHR5cGUsIGUuYnViYmxlcywgZS5jYW5jZWxhYmxlKTtcbiAgICAgICAgXy5leHRlbmQoZXZ0LCB7XG4gICAgICAgICAgICB2aWV3OiBlLnZpZXcsXG4gICAgICAgICAgY3RybEtleTogZS5jdHJsS2V5LCBhbHRLZXk6IGUuYWx0S2V5LFxuICAgICAgICAgIHNoaWZ0S2V5OiBlLnNoaWZ0S2V5LCBtZXRhS2V5OiBlLm1ldGFLZXksXG4gICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlLCBjaGFyQ29kZTogZS5jaGFyQ29kZVxuICAgICAgICB9KTtcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cblNpbXVsYXRlLmtleXByZXNzID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXlwcmVzcycsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxuU2ltdWxhdGUua2V5ZG93biA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5ZG93bicsIHtcbiAgICAgICAga2V5Q29kZTogY2hhckNvZGUsXG4gICAgICAgIGNoYXJDb2RlOiBjaGFyQ29kZVxuICAgIH0pO1xufTtcblxuU2ltdWxhdGUua2V5dXAgPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleXVwJywge1xuICAgICAgICBrZXlDb2RlOiBjaGFyQ29kZSxcbiAgICAgICAgY2hhckNvZGU6IGNoYXJDb2RlXG4gICAgfSk7XG59O1xuXG52YXIgZXZlbnRzID0gW1xuICAgICdjbGljaycsXG4gICAgJ2ZvY3VzJyxcbiAgICAnYmx1cicsXG4gICAgJ2RibGNsaWNrJyxcbiAgICAnaW5wdXQnLFxuICAgICdjaGFuZ2UnLFxuICAgICdtb3VzZWRvd24nLFxuICAgICdtb3VzZW1vdmUnLFxuICAgICdtb3VzZW91dCcsXG4gICAgJ21vdXNlb3ZlcicsXG4gICAgJ21vdXNldXAnLFxuICAgICdtb3VzZWVudGVyJyxcbiAgICAnbW91c2VsZWF2ZScsXG4gICAgJ3Jlc2l6ZScsXG4gICAgJ3Njcm9sbCcsXG4gICAgJ3NlbGVjdCcsXG4gICAgJ3N1Ym1pdCcsXG4gICAgJ2xvYWQnLFxuICAgICd1bmxvYWQnXG5dO1xuXG5mb3IgKHZhciBpID0gZXZlbnRzLmxlbmd0aDsgaS0tOyl7XG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW2ldO1xuICAgIFNpbXVsYXRlW2V2ZW50XSA9IChmdW5jdGlvbihldnQpe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgICAgICAgICB0aGlzLmV2ZW50KGVsZW1lbnQsIGV2dCwgb3B0aW9ucyk7XG4gICAgICAgIH07XG4gICAgfShldmVudCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXVsYXRlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05wYlhWc1lYUmxMbXB6SWl3aWMyOTFjbU5sY3lJNld5SXZhRzl0WlM5a1lYWnBaSFJwZEhSemQyOXlkR2d2Y0hKdmFtVmpkSE12ZFhSdFpTOXpjbU12YW5NdmMybHRkV3hoZEdVdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUVzU1VGQlNTeERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE96dEJRVVV6UWl4SlFVRkpMRkZCUVZFc1IwRkJSenRKUVVOWUxFdEJRVXNzUlVGQlJTeFRRVUZUTEU5QlFVOHNSVUZCUlN4VFFVRlRMRVZCUVVVc1QwRkJUeXhEUVVGRE8xRkJRM2hETEVsQlFVa3NSMEZCUnl4RFFVRkRPMUZCUTFJc1NVRkJTU3hSUVVGUkxFTkJRVU1zVjBGQlZ5eEZRVUZGTzFsQlEzUkNMRWRCUVVjc1IwRkJSeXhSUVVGUkxFTkJRVU1zVjBGQlZ5eERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRPMWxCUTNwRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNVMEZCVXl4RlFVRkZMRk5CUVZNc1NVRkJTU3haUVVGWkxFbEJRVWtzVTBGQlV5eEpRVUZKTEZsQlFWa3NSVUZCUlN4SlFVRkpMRVZCUVVVc1EwRkJRenRaUVVONFJpeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dFpRVU4yUWl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzFOQlF6bENMRWxCUVVrN1dVRkRSQ3hIUVVGSExFZEJRVWNzVVVGQlVTeERRVUZETEdsQ1FVRnBRaXhGUVVGRkxFTkJRVU03V1VGRGJrTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFZEJRVWNzVTBGQlV5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUXpORE8wdEJRMG83U1VGRFJDeFJRVUZSTEVWQlFVVXNVMEZCVXl4UFFVRlBMRVZCUVVVc1NVRkJTU3hGUVVGRkxFOUJRVThzUTBGQlF6dFJRVU4wUXl4SlFVRkpMRWRCUVVjN1dVRkRTQ3hEUVVGRExFZEJRVWM3WjBKQlEwRXNUMEZCVHl4RlFVRkZMRWxCUVVrc1JVRkJSU3hWUVVGVkxFVkJRVVVzU1VGQlNTeEZRVUZGTEVsQlFVa3NSVUZCUlN4TlFVRk5PMmRDUVVNM1F5eFBRVUZQTEVWQlFVVXNTMEZCU3l4RlFVRkZMRTFCUVUwc1JVRkJSU3hMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEV0QlFVc3NSVUZCUlN4UFFVRlBMRVZCUVVVc1MwRkJTenRuUWtGRE9VUXNUMEZCVHl4RlFVRkZMRU5CUVVNc1JVRkJSU3hSUVVGUkxFVkJRVVVzUTBGQlF6dGhRVU14UWl4RFFVRkRPMUZCUTA0c1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1VVRkRja0lzU1VGQlNTeFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRPMWxCUTNKQ0xFZEJRVWM3WjBKQlEwTXNSMEZCUnl4SFFVRkhMRkZCUVZFc1EwRkJReXhYUVVGWExFTkJRVU1zVjBGQlZ5eERRVUZETEVOQlFVTTdaMEpCUTNoRExFZEJRVWNzUTBGQlF5eFpRVUZaTzI5Q1FVTmFMRWxCUVVrc1JVRkJSU3hEUVVGRExFTkJRVU1zVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4VlFVRlZMRVZCUVVVc1EwRkJReXhEUVVGRExFbEJRVWs3V1VGRE4wTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNRMEZCUXl4UlFVRlJMRVZCUVVVc1EwRkJReXhEUVVGRExFOUJRVTg3V1VGRE1VTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeERRVUZETEVOQlFVTTdWVUZEZWtJc1QwRkJUeXhEUVVGRExHRkJRV0VzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0VFFVTTFRaXhOUVVGTkxFZEJRVWNzUTBGQlF6dFpRVU5RTEVkQlFVY3NSMEZCUnl4UlFVRlJMRU5CUVVNc1YwRkJWeXhEUVVGRExGRkJRVkVzUTBGQlF5eERRVUZETzFGQlEzcERMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBMRVZCUVVVc1EwRkJReXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETzFGQlF6ZERMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUjBGQlJ5eEZRVUZGTzFsQlExWXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJReXhKUVVGSk8xVkJRMlFzVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBMRVZCUVVVc1RVRkJUU3hGUVVGRkxFTkJRVU1zUTBGQlF5eE5RVUZOTzFWQlEzQkRMRkZCUVZFc1JVRkJSU3hEUVVGRExFTkJRVU1zVVVGQlVTeEZRVUZGTEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUenRWUVVONFF5eFBRVUZQTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRTdVMEZEZWtNc1EwRkJReXhEUVVGRE8xRkJRMGdzVDBGQlR5eERRVUZETEdGQlFXRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRUUVVNeFFqdFRRVU5CTzB0QlEwbzdRVUZEVEN4RFFVRkRMRU5CUVVNN08wRkJSVVlzVVVGQlVTeERRVUZETEZGQlFWRXNSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSU3hIUVVGSExFTkJRVU03U1VGRGRFTXNTVUZCU1N4UlFVRlJMRWRCUVVjc1IwRkJSeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0SlFVTnFReXhKUVVGSkxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFVOHNSVUZCUlN4VlFVRlZMRVZCUVVVN1VVRkRMMElzVDBGQlR5eEZRVUZGTEZGQlFWRTdVVUZEYWtJc1VVRkJVU3hGUVVGRkxGRkJRVkU3UzBGRGNrSXNRMEZCUXl4RFFVRkRPMEZCUTFBc1EwRkJReXhEUVVGRE96dEJRVVZHTEZGQlFWRXNRMEZCUXl4UFFVRlBMRWRCUVVjc1UwRkJVeXhQUVVGUExFVkJRVVVzUjBGQlJ5eERRVUZETzBsQlEzSkRMRWxCUVVrc1VVRkJVU3hIUVVGSExFZEJRVWNzUTBGQlF5eFZRVUZWTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1NVRkRha01zU1VGQlNTeERRVUZETEZGQlFWRXNRMEZCUXl4UFFVRlBMRVZCUVVVc1UwRkJVeXhGUVVGRk8xRkJRemxDTEU5QlFVOHNSVUZCUlN4UlFVRlJPMUZCUTJwQ0xGRkJRVkVzUlVGQlJTeFJRVUZSTzB0QlEzSkNMRU5CUVVNc1EwRkJRenRCUVVOUUxFTkJRVU1zUTBGQlF6czdRVUZGUml4UlFVRlJMRU5CUVVNc1MwRkJTeXhIUVVGSExGTkJRVk1zVDBGQlR5eEZRVUZGTEVkQlFVY3NRMEZCUXp0SlFVTnVReXhKUVVGSkxGRkJRVkVzUjBGQlJ5eEhRVUZITEVOQlFVTXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8wbEJRMnBETEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1QwRkJUeXhGUVVGRkxFOUJRVThzUlVGQlJUdFJRVU0xUWl4UFFVRlBMRVZCUVVVc1VVRkJVVHRSUVVOcVFpeFJRVUZSTEVWQlFVVXNVVUZCVVR0TFFVTnlRaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZETEVOQlFVTTdPMEZCUlVZc1NVRkJTU3hOUVVGTkxFZEJRVWM3U1VGRFZDeFBRVUZQTzBsQlExQXNUMEZCVHp0SlFVTlFMRTFCUVUwN1NVRkRUaXhWUVVGVk8wbEJRMVlzVDBGQlR6dEpRVU5RTEZGQlFWRTdTVUZEVWl4WFFVRlhPMGxCUTFnc1YwRkJWenRKUVVOWUxGVkJRVlU3U1VGRFZpeFhRVUZYTzBsQlExZ3NVMEZCVXp0SlFVTlVMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVVVGQlVUdEpRVU5TTEZGQlFWRTdTVUZEVWl4UlFVRlJPMGxCUTFJc1VVRkJVVHRKUVVOU0xFMUJRVTA3U1VGRFRpeFJRVUZSTzBGQlExb3NRMEZCUXl4RFFVRkRPenRCUVVWR0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdEpRVU0zUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhOUVVGTkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdTVUZEZEVJc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRPMUZCUXpWQ0xFOUJRVThzVTBGQlV5eFBRVUZQTEVWQlFVVXNUMEZCVHl4RFFVRkRPMWxCUXpkQ0xFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUMEZCVHl4RlFVRkZMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU55UXl4RFFVRkRPMHRCUTB3c1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlEyUXNRMEZCUXpzN1FVRkZSQ3hOUVVGTkxFTkJRVU1zVDBGQlR5eEhRVUZITEZGQlFWRWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUoyWVhJZ1h5QTlJSEpsY1hWcGNtVW9KeTR2ZFhScGJITW5LVHRjYmx4dWRtRnlJRk5wYlhWc1lYUmxJRDBnZTF4dUlDQWdJR1YyWlc1ME9pQm1kVzVqZEdsdmJpaGxiR1Z0Wlc1MExDQmxkbVZ1ZEU1aGJXVXNJRzl3ZEdsdmJuTXBlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pYWjBPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pHOWpkVzFsYm5RdVkzSmxZWFJsUlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVYyWlc1MEtGd2lTRlJOVEVWMlpXNTBjMXdpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZEM1cGJtbDBSWFpsYm5Rb1pYWmxiblJPWVcxbExDQmxkbVZ1ZEU1aGJXVWdJVDBnSjIxdmRYTmxaVzUwWlhJbklDWW1JR1YyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZzWldGMlpTY3NJSFJ5ZFdVZ0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUY4dVpYaDBaVzVrS0dWMmRDd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJQ0FnSUNCbGJHVnRaVzUwTG1ScGMzQmhkR05vUlhabGJuUW9aWFowS1R0Y2JpQWdJQ0FnSUNBZ2ZXVnNjMlY3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmxkblFnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGZG1WdWRFOWlhbVZqZENncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWld4bGJXVnVkQzVtYVhKbFJYWmxiblFvSjI5dUp5QXJJR1YyWlc1MFRtRnRaU3hsZG5RcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCclpYbEZkbVZ1ZERvZ1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z2RIbHdaU3dnYjNCMGFXOXVjeWw3WEc0Z0lDQWdJQ0FnSUhaaGNpQmxkblFzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKMVltSnNaWE02SUhSeWRXVXNJR05oYm1ObGJHRmliR1U2SUhSeWRXVXNJSFpwWlhjNklIZHBibVJ2ZHl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamRISnNTMlY1T2lCbVlXeHpaU3dnWVd4MFMyVjVPaUJtWVd4elpTd2djMmhwWm5STFpYazZJR1poYkhObExDQnRaWFJoUzJWNU9pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCclpYbERiMlJsT2lBd0xDQmphR0Z5UTI5a1pUb2dNRnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdYeTVsZUhSbGJtUW9aU3dnYjNCMGFXOXVjeWs3WEc0Z0lDQWdJQ0FnSUdsbUlDaGtiMk4xYldWdWRDNWpjbVZoZEdWRmRtVnVkQ2w3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBjbmw3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhaMElEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJYWmxiblFvSjB0bGVVVjJaVzUwY3ljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1sMFMyVjVSWFpsYm5Rb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFI1Y0dVc0lHVXVZblZpWW14bGN5d2daUzVqWVc1alpXeGhZbXhsTENCbExuWnBaWGNzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxMbU4wY214TFpYa3NJR1V1WVd4MFMyVjVMQ0JsTG5Ob2FXWjBTMlY1TENCbExtMWxkR0ZMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsTG10bGVVTnZaR1VzSUdVdVkyaGhja052WkdVcE8xeHVJQ0FnSUNBZ0lDQWdJR1ZzWlcxbGJuUXVaR2x6Y0dGMFkyaEZkbVZ1ZENobGRuUXBPMXh1SUNBZ0lDQWdJQ0I5WTJGMFkyZ29aWEp5S1h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1YyZENBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWMlpXNTBLRndpUlhabGJuUnpYQ0lwTzF4dUlDQWdJQ0FnSUNCbGRuUXVhVzVwZEVWMlpXNTBLSFI1Y0dVc0lHVXVZblZpWW14bGN5d2daUzVqWVc1alpXeGhZbXhsS1R0Y2JpQWdJQ0FnSUNBZ1h5NWxlSFJsYm1Rb1pYWjBMQ0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJhV1YzT2lCbExuWnBaWGNzWEc0Z0lDQWdJQ0FnSUNBZ1kzUnliRXRsZVRvZ1pTNWpkSEpzUzJWNUxDQmhiSFJMWlhrNklHVXVZV3gwUzJWNUxGeHVJQ0FnSUNBZ0lDQWdJSE5vYVdaMFMyVjVPaUJsTG5Ob2FXWjBTMlY1TENCdFpYUmhTMlY1T2lCbExtMWxkR0ZMWlhrc1hHNGdJQ0FnSUNBZ0lDQWdhMlY1UTI5a1pUb2daUzVyWlhsRGIyUmxMQ0JqYUdGeVEyOWtaVG9nWlM1amFHRnlRMjlrWlZ4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdaV3hsYldWdWRDNWthWE53WVhSamFFVjJaVzUwS0dWMmRDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4wN1hHNWNibE5wYlhWc1lYUmxMbXRsZVhCeVpYTnpJRDBnWm5WdVkzUnBiMjRvWld4bGJXVnVkQ3dnWTJoeUtYdGNiaUFnSUNCMllYSWdZMmhoY2tOdlpHVWdQU0JqYUhJdVkyaGhja052WkdWQmRDZ3dLVHRjYmlBZ0lDQjBhR2x6TG10bGVVVjJaVzUwS0dWc1pXMWxiblFzSUNkclpYbHdjbVZ6Y3ljc0lIdGNiaUFnSUNBZ0lDQWdhMlY1UTI5a1pUb2dZMmhoY2tOdlpHVXNYRzRnSUNBZ0lDQWdJR05vWVhKRGIyUmxPaUJqYUdGeVEyOWtaVnh1SUNBZ0lIMHBPMXh1ZlR0Y2JseHVVMmx0ZFd4aGRHVXVhMlY1Wkc5M2JpQTlJR1oxYm1OMGFXOXVLR1ZzWlcxbGJuUXNJR05vY2lsN1hHNGdJQ0FnZG1GeUlHTm9ZWEpEYjJSbElEMGdZMmh5TG1Ob1lYSkRiMlJsUVhRb01DazdYRzRnSUNBZ2RHaHBjeTVyWlhsRmRtVnVkQ2hsYkdWdFpXNTBMQ0FuYTJWNVpHOTNiaWNzSUh0Y2JpQWdJQ0FnSUNBZ2EyVjVRMjlrWlRvZ1kyaGhja052WkdVc1hHNGdJQ0FnSUNBZ0lHTm9ZWEpEYjJSbE9pQmphR0Z5UTI5a1pWeHVJQ0FnSUgwcE8xeHVmVHRjYmx4dVUybHRkV3hoZEdVdWEyVjVkWEFnUFNCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCamFISXBlMXh1SUNBZ0lIWmhjaUJqYUdGeVEyOWtaU0E5SUdOb2NpNWphR0Z5UTI5a1pVRjBLREFwTzF4dUlDQWdJSFJvYVhNdWEyVjVSWFpsYm5Rb1pXeGxiV1Z1ZEN3Z0oydGxlWFZ3Snl3Z2UxeHVJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmphR0Z5UTI5a1pTeGNiaUFnSUNBZ0lDQWdZMmhoY2tOdlpHVTZJR05vWVhKRGIyUmxYRzRnSUNBZ2ZTazdYRzU5TzF4dVhHNTJZWElnWlhabGJuUnpJRDBnVzF4dUlDQWdJQ2RqYkdsamF5Y3NYRzRnSUNBZ0oyWnZZM1Z6Snl4Y2JpQWdJQ0FuWW14MWNpY3NYRzRnSUNBZ0oyUmliR05zYVdOckp5eGNiaUFnSUNBbmFXNXdkWFFuTEZ4dUlDQWdJQ2RqYUdGdVoyVW5MRnh1SUNBZ0lDZHRiM1Z6WldSdmQyNG5MRnh1SUNBZ0lDZHRiM1Z6WlcxdmRtVW5MRnh1SUNBZ0lDZHRiM1Z6Wlc5MWRDY3NYRzRnSUNBZ0oyMXZkWE5sYjNabGNpY3NYRzRnSUNBZ0oyMXZkWE5sZFhBbkxGeHVJQ0FnSUNkdGIzVnpaV1Z1ZEdWeUp5eGNiaUFnSUNBbmJXOTFjMlZzWldGMlpTY3NYRzRnSUNBZ0ozSmxjMmw2WlNjc1hHNGdJQ0FnSjNOamNtOXNiQ2NzWEc0Z0lDQWdKM05sYkdWamRDY3NYRzRnSUNBZ0ozTjFZbTFwZENjc1hHNGdJQ0FnSjJ4dllXUW5MRnh1SUNBZ0lDZDFibXh2WVdRblhHNWRPMXh1WEc1bWIzSWdLSFpoY2lCcElEMGdaWFpsYm5SekxteGxibWQwYURzZ2FTMHRPeWw3WEc0Z0lDQWdkbUZ5SUdWMlpXNTBJRDBnWlhabGJuUnpXMmxkTzF4dUlDQWdJRk5wYlhWc1lYUmxXMlYyWlc1MFhTQTlJQ2htZFc1amRHbHZiaWhsZG5RcGUxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1puVnVZM1JwYjI0b1pXeGxiV1Z1ZEN3Z2IzQjBhVzl1Y3lsN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxtVjJaVzUwS0dWc1pXMWxiblFzSUdWMmRDd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmU2hsZG1WdWRDa3BPMXh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlGTnBiWFZzWVhSbE95SmRmUT09IiwiLyoqXG4gKiBQb2x5ZmlsbHNcbiAqL1xuXG4vKipcbiAqIFRoaXMgaXMgY29waWVkIGZyb20gUmVhY0pTJ3Mgb3duIHBvbHlwZmlsbCB0byBydW4gdGVzdHMgd2l0aCBwaGFudG9tanMuXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svcmVhY3QvYmxvYi8zZGMxMDc0OTA4MGE0NjBlNDhiZWU0NmQ3Njk3NjNlYzcxOTFhYzc2L3NyYy90ZXN0L3BoYW50b21qcy1zaGltcy5qc1xuICovXG4oZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgQXAgPSBBcnJheS5wcm90b3R5cGU7XG4gICAgdmFyIHNsaWNlID0gQXAuc2xpY2U7XG4gICAgdmFyIEZwID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gICAgaWYgKCFGcC5iaW5kKSB7XG4gICAgICAvLyBQaGFudG9tSlMgZG9lc24ndCBzdXBwb3J0IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIG5hdGl2ZWx5LCBzb1xuICAgICAgLy8gcG9seWZpbGwgaXQgd2hlbmV2ZXIgdGhpcyBtb2R1bGUgaXMgcmVxdWlyZWQuXG4gICAgICBGcC5iaW5kID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgICB2YXIgZnVuYyA9IHRoaXM7XG4gICAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICAgIHZhciBpbnZva2VkQXNDb25zdHJ1Y3RvciA9IGZ1bmMucHJvdG90eXBlICYmICh0aGlzIGluc3RhbmNlb2YgZnVuYyk7XG4gICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkoXG4gICAgICAgICAgICAvLyBJZ25vcmUgdGhlIGNvbnRleHQgcGFyYW1ldGVyIHdoZW4gaW52b2tpbmcgdGhlIGJvdW5kIGZ1bmN0aW9uXG4gICAgICAgICAgICAvLyBhcyBhIGNvbnN0cnVjdG9yLiBOb3RlIHRoYXQgdGhpcyBpbmNsdWRlcyBub3Qgb25seSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgLy8gaW52b2NhdGlvbnMgdXNpbmcgdGhlIG5ldyBrZXl3b3JkIGJ1dCBhbHNvIGNhbGxzIHRvIGJhc2UgY2xhc3NcbiAgICAgICAgICAgIC8vIGNvbnN0cnVjdG9ycyBzdWNoIGFzIEJhc2VDbGFzcy5jYWxsKHRoaXMsIC4uLikgb3Igc3VwZXIoLi4uKS5cbiAgICAgICAgICAgICFpbnZva2VkQXNDb25zdHJ1Y3RvciAmJiBjb250ZXh0IHx8IHRoaXMsXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBib3VuZCBmdW5jdGlvbiBtdXN0IHNoYXJlIHRoZSAucHJvdG90eXBlIG9mIHRoZSB1bmJvdW5kXG4gICAgICAgIC8vIGZ1bmN0aW9uIHNvIHRoYXQgYW55IG9iamVjdCBjcmVhdGVkIGJ5IG9uZSBjb25zdHJ1Y3RvciB3aWxsIGNvdW50XG4gICAgICAgIC8vIGFzIGFuIGluc3RhbmNlIG9mIGJvdGggY29uc3RydWN0b3JzLlxuICAgICAgICBib3VuZC5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcblxuICAgICAgICByZXR1cm4gYm91bmQ7XG4gICAgICB9O1xuICAgIH1cblxufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZChkc3QsIHNyYyl7XG4gICAgICAgIGlmIChzcmMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzcmMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3JjLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRzdDtcbiAgICB9LFxuXG4gICAgbWFwOiBmdW5jdGlvbihvYmosIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICAgIHZhciBsZW4gPSBvYmoubGVuZ3RoID4+PiAwO1xuICAgICAgICB2YXIgbmV3QXJyYXkgPSBuZXcgQXJyYXkobGVuKTtcbiAgICAgICAgdmFyIGtleSA9IDA7XG4gICAgICAgIGlmICghdGhpc0FyZykge1xuICAgICAgICAgICAgdGhpc0FyZyA9IG9iajtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoa2V5IDwgbGVuKSB7XG4gICAgICAgICAgICBuZXdBcnJheVtrZXldID0gY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBvYmpba2V5XSwga2V5LCBvYmopO1xuICAgICAgICAgICAga2V5Kys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xuICAgIH1cblxufTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM1YwYVd4ekxtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12ZFhScGJITXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFN08wRkJSVUVzUjBGQlJ6czdRVUZGU0R0QlFVTkJPenRIUVVWSE8wRkJRMGdzUTBGQlF5eFhRVUZYT3p0SlFVVlNMRWxCUVVrc1JVRkJSU3hIUVVGSExFdEJRVXNzUTBGQlF5eFRRVUZUTEVOQlFVTTdTVUZEZWtJc1NVRkJTU3hMUVVGTExFZEJRVWNzUlVGQlJTeERRVUZETEV0QlFVc3NRMEZCUXp0QlFVTjZRaXhKUVVGSkxFbEJRVWtzUlVGQlJTeEhRVUZITEZGQlFWRXNRMEZCUXl4VFFVRlRMRU5CUVVNN08wRkJSV2hETEVsQlFVa3NTVUZCU1N4RFFVRkRMRVZCUVVVc1EwRkJReXhKUVVGSkxFVkJRVVU3UVVGRGJFSTdPMDFCUlUwc1JVRkJSU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFRRVUZUTEU5QlFVOHNSVUZCUlR0UlFVTXhRaXhKUVVGSkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTTdRVUZEZUVJc1VVRkJVU3hKUVVGSkxFbEJRVWtzUjBGQlJ5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1JVRkJSU3hEUVVGRExFTkJRVU1zUTBGQlF6czdVVUZGY0VNc1UwRkJVeXhMUVVGTExFZEJRVWM3VlVGRFppeEpRVUZKTEc5Q1FVRnZRaXhIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEV0QlFVc3NTVUZCU1N4WlFVRlpMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRemxGTEZWQlFWVXNUMEZCVHl4SlFVRkpMRU5CUVVNc1MwRkJTenRCUVVNelFqdEJRVU5CTzBGQlEwRTdPMWxCUlZrc1EwRkJReXh2UWtGQmIwSXNTVUZCU1N4UFFVRlBMRWxCUVVrc1NVRkJTVHRaUVVONFF5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RFFVRkRMRXRCUVVzc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdWMEZEYmtNc1EwRkJRenRCUVVOYUxGTkJRVk03UVVGRFZEdEJRVU5CTzBGQlEwRTdPMEZCUlVFc1VVRkJVU3hMUVVGTExFTkJRVU1zVTBGQlV5eEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNN08xRkJSV3BETEU5QlFVOHNTMEZCU3l4RFFVRkRPMDlCUTJRc1EwRkJRenRCUVVOU0xFdEJRVXM3TzBGQlJVd3NRMEZCUXl4SFFVRkhMRU5CUVVNN08wRkJSVXdzVFVGQlRTeERRVUZETEU5QlFVOHNSMEZCUnpzN1NVRkZZaXhOUVVGTkxFVkJRVVVzVTBGQlV5eE5RVUZOTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWRCUVVjc1EwRkJRenRSUVVNM1FpeEpRVUZKTEVkQlFVY3NSVUZCUlR0WlFVTk1MRXRCUVVzc1NVRkJTU3hIUVVGSExFbEJRVWtzUjBGQlJ5eEZRVUZGTzJkQ1FVTnFRaXhKUVVGSkxFZEJRVWNzUTBGQlF5eGpRVUZqTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVN2IwSkJRM3BDTEVkQlFVY3NRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSeXhIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdhVUpCUTNaQ08yRkJRMG83VTBGRFNqdFJRVU5FTEU5QlFVOHNSMEZCUnl4RFFVRkRPMEZCUTI1Q0xFdEJRVXM3TzBsQlJVUXNSMEZCUnl4RlFVRkZMRk5CUVZNc1IwRkJSeXhGUVVGRkxGRkJRVkVzUlVGQlJTeFBRVUZQTEVWQlFVVTdVVUZEYkVNc1NVRkJTU3hIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEUxQlFVMHNTMEZCU3l4RFFVRkRMRU5CUVVNN1VVRkRNMElzU1VGQlNTeFJRVUZSTEVkQlFVY3NTVUZCU1N4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU03VVVGRE9VSXNTVUZCU1N4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRE8xRkJRMW9zU1VGQlNTeERRVUZETEU5QlFVOHNSVUZCUlR0WlFVTldMRTlCUVU4c1IwRkJSeXhIUVVGSExFTkJRVU03VTBGRGFrSTdVVUZEUkN4UFFVRlBMRWRCUVVjc1IwRkJSeXhIUVVGSExFVkJRVVU3V1VGRFpDeFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUTBGQlF5eFBRVUZQTEVWQlFVVXNSMEZCUnl4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFZEJRVWNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXp0WlFVTXpSQ3hIUVVGSExFVkJRVVVzUTBGQlF6dFRRVU5VTzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNN1FVRkRlRUlzUzBGQlN6czdRMEZGU2l4RFFVRkRJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpTHlvcVhHNGdLaUJRYjJ4NVptbHNiSE5jYmlBcUwxeHVYRzR2S2lwY2JpQXFJRlJvYVhNZ2FYTWdZMjl3YVdWa0lHWnliMjBnVW1WaFkwcFRKM01nYjNkdUlIQnZiSGx3Wm1sc2JDQjBieUJ5ZFc0Z2RHVnpkSE1nZDJsMGFDQndhR0Z1ZEc5dGFuTXVYRzRnS2lCb2RIUndjem92TDJkcGRHaDFZaTVqYjIwdlptRmpaV0p2YjJzdmNtVmhZM1F2WW14dllpOHpaR014TURjME9UQTRNR0UwTmpCbE5EaGlaV1UwTm1RM05qazNOak5sWXpjeE9URmhZemMyTDNOeVl5OTBaWE4wTDNCb1lXNTBiMjFxY3kxemFHbHRjeTVxYzF4dUlDb3ZYRzRvWm5WdVkzUnBiMjRvS1NCN1hHNWNiaUFnSUNCMllYSWdRWEFnUFNCQmNuSmhlUzV3Y205MGIzUjVjR1U3WEc0Z0lDQWdkbUZ5SUhOc2FXTmxJRDBnUVhBdWMyeHBZMlU3WEc0Z0lDQWdkbUZ5SUVad0lEMGdSblZ1WTNScGIyNHVjSEp2ZEc5MGVYQmxPMXh1WEc0Z0lDQWdhV1lnS0NGR2NDNWlhVzVrS1NCN1hHNGdJQ0FnSUNBdkx5QlFhR0Z1ZEc5dFNsTWdaRzlsYzI0bmRDQnpkWEJ3YjNKMElFWjFibU4wYVc5dUxuQnliM1J2ZEhsd1pTNWlhVzVrSUc1aGRHbDJaV3g1TENCemIxeHVJQ0FnSUNBZ0x5OGdjRzlzZVdacGJHd2dhWFFnZDJobGJtVjJaWElnZEdocGN5QnRiMlIxYkdVZ2FYTWdjbVZ4ZFdseVpXUXVYRzRnSUNBZ0lDQkdjQzVpYVc1a0lEMGdablZ1WTNScGIyNG9ZMjl1ZEdWNGRDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1puVnVZeUE5SUhSb2FYTTdYRzRnSUNBZ0lDQWdJSFpoY2lCaGNtZHpJRDBnYzJ4cFkyVXVZMkZzYkNoaGNtZDFiV1Z1ZEhNc0lERXBPMXh1WEc0Z0lDQWdJQ0FnSUdaMWJtTjBhVzl1SUdKdmRXNWtLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lIWmhjaUJwYm5admEyVmtRWE5EYjI1emRISjFZM1J2Y2lBOUlHWjFibU11Y0hKdmRHOTBlWEJsSUNZbUlDaDBhR2x6SUdsdWMzUmhibU5sYjJZZ1puVnVZeWs3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaMWJtTXVZWEJ3Ykhrb1hHNGdJQ0FnSUNBZ0lDQWdJQ0F2THlCSloyNXZjbVVnZEdobElHTnZiblJsZUhRZ2NHRnlZVzFsZEdWeUlIZG9aVzRnYVc1MmIydHBibWNnZEdobElHSnZkVzVrSUdaMWJtTjBhVzl1WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJoY3lCaElHTnZibk4wY25WamRHOXlMaUJPYjNSbElIUm9ZWFFnZEdocGN5QnBibU5zZFdSbGN5QnViM1FnYjI1c2VTQmpiMjV6ZEhKMVkzUnZjbHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdhVzUyYjJOaGRHbHZibk1nZFhOcGJtY2dkR2hsSUc1bGR5QnJaWGwzYjNKa0lHSjFkQ0JoYkhOdklHTmhiR3h6SUhSdklHSmhjMlVnWTJ4aGMzTmNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklHTnZibk4wY25WamRHOXljeUJ6ZFdOb0lHRnpJRUpoYzJWRGJHRnpjeTVqWVd4c0tIUm9hWE1zSUM0dUxpa2diM0lnYzNWd1pYSW9MaTR1S1M1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0ZwYm5admEyVmtRWE5EYjI1emRISjFZM1J2Y2lBbUppQmpiMjUwWlhoMElIeDhJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JoY21kekxtTnZibU5oZENoemJHbGpaUzVqWVd4c0tHRnlaM1Z0Wlc1MGN5a3BYRzRnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQzh2SUZSb1pTQmliM1Z1WkNCbWRXNWpkR2x2YmlCdGRYTjBJSE5vWVhKbElIUm9aU0F1Y0hKdmRHOTBlWEJsSUc5bUlIUm9aU0IxYm1KdmRXNWtYRzRnSUNBZ0lDQWdJQzh2SUdaMWJtTjBhVzl1SUhOdklIUm9ZWFFnWVc1NUlHOWlhbVZqZENCamNtVmhkR1ZrSUdKNUlHOXVaU0JqYjI1emRISjFZM1J2Y2lCM2FXeHNJR052ZFc1MFhHNGdJQ0FnSUNBZ0lDOHZJR0Z6SUdGdUlHbHVjM1JoYm1ObElHOW1JR0p2ZEdnZ1kyOXVjM1J5ZFdOMGIzSnpMbHh1SUNBZ0lDQWdJQ0JpYjNWdVpDNXdjbTkwYjNSNWNHVWdQU0JtZFc1akxuQnliM1J2ZEhsd1pUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZbTkxYm1RN1hHNGdJQ0FnSUNCOU8xeHVJQ0FnSUgxY2JseHVmU2tvS1R0Y2JseHViVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQjdYRzVjYmlBZ0lDQmxlSFJsYm1RNklHWjFibU4wYVc5dUlHVjRkR1Z1WkNoa2MzUXNJSE55WXlsN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6Y21NcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUd0bGVTQnBiaUJ6Y21NcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNKakxtaGhjMDkzYmxCeWIzQmxjblI1S0d0bGVTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pITjBXMnRsZVYwZ1BTQnpjbU5iYTJWNVhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHUnpkRHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdiV0Z3T2lCbWRXNWpkR2x2Ymlodlltb3NJR05oYkd4aVlXTnJMQ0IwYUdselFYSm5LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnNaVzRnUFNCdlltb3ViR1Z1WjNSb0lENCtQaUF3TzF4dUlDQWdJQ0FnSUNCMllYSWdibVYzUVhKeVlYa2dQU0J1WlhjZ1FYSnlZWGtvYkdWdUtUdGNiaUFnSUNBZ0lDQWdkbUZ5SUd0bGVTQTlJREE3WEc0Z0lDQWdJQ0FnSUdsbUlDZ2hkR2hwYzBGeVp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjMEZ5WnlBOUlHOWlhanRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCM2FHbHNaU0FvYTJWNUlEd2diR1Z1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J1WlhkQmNuSmhlVnRyWlhsZElEMGdZMkZzYkdKaFkyc3VZMkZzYkNoMGFHbHpRWEpuTENCdlltcGJhMlY1WFN3Z2EyVjVMQ0J2WW1vcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnYTJWNUt5czdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzVsZDBGeWNtRjVPMXh1SUNBZ0lIMWNibHh1ZlR0Y2JpSmRmUT09IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbnZhciBTaW11bGF0ZSA9IHJlcXVpcmUoJy4vc2ltdWxhdGUnKTtcbnZhciBzZWxlY3RvckZpbmRlciA9IHJlcXVpcmUoJy4vc2VsZWN0b3JGaW5kZXInKTtcbnZhciBTZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcblxuLy8gdmFyIG15R2VuZXJhdG9yID0gbmV3IENzc1NlbGVjdG9yR2VuZXJhdG9yKCk7XG52YXIgaW1wb3J0YW50U3RlcExlbmd0aCA9IDUwMDtcbnZhciBzYXZlSGFuZGxlcnMgPSBbXTtcbnZhciByZXBvcnRIYW5kbGVycyA9IFtdO1xudmFyIGxvYWRIYW5kbGVycyA9IFtdO1xudmFyIHNldHRpbmdzTG9hZEhhbmRsZXJzID0gW107XG5cbmZ1bmN0aW9uIGdldFNjZW5hcmlvKG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBpZiAobG9hZEhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdmFyIHN0YXRlID0gdXRtZS5zdGF0ZTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGUuc2NlbmFyaW9zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnNjZW5hcmlvc1tpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3RhdGUuc2NlbmFyaW9zW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2FkSGFuZGxlcnNbMF0obmFtZSwgZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3ApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbnZhciB2YWxpZGF0aW5nID0gZmFsc2U7XG5cbnZhciBldmVudHMgPSBbXG4gICAgJ2NsaWNrJyxcbiAgICAnZm9jdXMnLFxuICAgICdibHVyJyxcbiAgICAnZGJsY2xpY2snLFxuICAgIC8vICdkcmFnJyxcbiAgICAvLyAnZHJhZ2VudGVyJyxcbiAgICAvLyAnZHJhZ2xlYXZlJyxcbiAgICAvLyAnZHJhZ292ZXInLFxuICAgIC8vICdkcmFnc3RhcnQnLFxuICAgIC8vICdpbnB1dCcsXG4gICAgJ21vdXNlZG93bicsXG4gICAgLy8gJ21vdXNlbW92ZScsXG4gICAgJ21vdXNlZW50ZXInLFxuICAgICdtb3VzZWxlYXZlJyxcbiAgICAnbW91c2VvdXQnLFxuICAgICdtb3VzZW92ZXInLFxuICAgICdtb3VzZXVwJyxcbiAgICAnY2hhbmdlJyxcbiAgICAvLyAncmVzaXplJyxcbiAgICAvLyAnc2Nyb2xsJ1xuXTtcblxuZnVuY3Rpb24gZ2V0Q29uZGl0aW9ucyhzY2VuYXJpbywgY29uZGl0aW9uVHlwZSkge1xuICB2YXIgc2V0dXAgPSBzY2VuYXJpb1tjb25kaXRpb25UeXBlXTtcbiAgdmFyIHNjZW5hcmlvcyA9IHNldHVwICYmIHNldHVwLnNjZW5hcmlvcztcbiAgLy8gVE9ETzogQnJlYWsgb3V0IGludG8gaGVscGVyXG4gIGlmIChzY2VuYXJpb3MpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXy5tYXAoc2NlbmFyaW9zLCBmdW5jdGlvbiAoc2NlbmFyaW9OYW1lKSB7XG4gICAgICByZXR1cm4gZ2V0U2NlbmFyaW8oc2NlbmFyaW9OYW1lKS50aGVuKGZ1bmN0aW9uIChvdGhlclNjZW5hcmlvKSB7XG4gICAgICAgIG90aGVyU2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG90aGVyU2NlbmFyaW8pKTtcbiAgICAgICAgcmV0dXJuIHNldHVwQ29uZGl0aW9ucyhvdGhlclNjZW5hcmlvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgdG9SZXR1cm4gPSBbXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG90aGVyU2NlbmFyaW8uc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRvUmV0dXJuLnB1c2gob3RoZXJTY2VuYXJpby5zdGVwc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0b1JldHVybjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJlY29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgcmV0dXJuIGdldENvbmRpdGlvbnMoc2NlbmFyaW8sICdzZXR1cCcpO1xufVxuXG5mdW5jdGlvbiBnZXRQb3N0Y29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgcmV0dXJuIGdldENvbmRpdGlvbnMoc2NlbmFyaW8sICdjbGVhbnVwJyk7XG59XG5cbmZ1bmN0aW9uIF9jb25jYXRTY2VuYXJpb1N0ZXBMaXN0cyhzdGVwcykge1xuICAgIHZhciBuZXdTdGVwcyA9IFtdO1xuICAgIHZhciBjdXJyZW50VGltZXN0YW1wOyAvLyBpbml0YWxpemVkIGJ5IGZpcnN0IGxpc3Qgb2Ygc3RlcHMuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBzdGVwcy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgZmxhdFN0ZXBzID0gc3RlcHNbal07XG4gICAgICAgIGlmIChqID4gMCkge1xuICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBzdGVwcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwID0gZmxhdFN0ZXBzW2tdO1xuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gayA+IDAgPyBzdGVwLnRpbWVTdGFtcCAtIGZsYXRTdGVwc1trIC0gMV0udGltZVN0YW1wIDogNTA7XG4gICAgICAgICAgICAgICAgY3VycmVudFRpbWVzdGFtcCArPSBkaWZmO1xuICAgICAgICAgICAgICAgIGZsYXRTdGVwc1trXS50aW1lU3RhbXAgPSBjdXJyZW50VGltZXN0YW1wO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3VycmVudFRpbWVzdGFtcCA9IGZsYXRTdGVwc1tqXS50aW1lU3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgbmV3U3RlcHMgPSBuZXdTdGVwcy5jb25jYXQoZmxhdFN0ZXBzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1N0ZXBzO1xufVxuXG5mdW5jdGlvbiBzZXR1cENvbmRpdGlvbnMgKHNjZW5hcmlvKSB7XG4gICAgdmFyIHByb21pc2VzID0gW107XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0UHJlY29uZGl0aW9ucyhzY2VuYXJpbyksXG4gICAgICAgIGdldFBvc3Rjb25kaXRpb25zKHNjZW5hcmlvKVxuICAgIF0pLnRoZW4oZnVuY3Rpb24gKHN0ZXBBcnJheXMpIHtcbiAgICAgICAgdmFyIHN0ZXBMaXN0cyA9IHN0ZXBBcnJheXNbMF0uY29uY2F0KFtzY2VuYXJpby5zdGVwc10sIHN0ZXBBcnJheXNbMV0pO1xuICAgICAgICBzY2VuYXJpby5zdGVwcyA9IF9jb25jYXRTY2VuYXJpb1N0ZXBMaXN0cyhzdGVwTGlzdHMpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBydW5TdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCkge1xuICAgIHV0bWUuYnJvYWRjYXN0KCdSVU5OSU5HX1NURVAnKTtcbiAgICB0b1NraXAgPSB0b1NraXAgfHwge307XG5cbiAgICB2YXIgc3RlcCA9IHNjZW5hcmlvLnN0ZXBzW2lkeF07XG4gICAgdmFyIHN0YXRlID0gdXRtZS5zdGF0ZTtcbiAgICBpZiAoc3RlcCAmJiBzdGF0ZS5zdGF0dXMgPT0gJ1BMQVlJTkcnKSB7XG4gICAgICAgIHN0YXRlLnJ1bi5zY2VuYXJpbyA9IHNjZW5hcmlvO1xuICAgICAgICBzdGF0ZS5ydW4uc3RlcEluZGV4ID0gaWR4O1xuICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ2xvYWQnKSB7XG4gICAgICAgICAgICB2YXIgbmV3TG9jYXRpb24gPSBzdGVwLmRhdGEudXJsLnByb3RvY29sICsgXCIvL1wiICsgc3RlcC5kYXRhLnVybC5ob3N0O1xuICAgICAgICAgICAgdmFyIHNlYXJjaCA9IHN0ZXAuZGF0YS51cmwuc2VhcmNoO1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBzdGVwLmRhdGEudXJsLmhhc2g7XG5cbiAgICAgICAgICAgIGlmIChzZWFyY2ggJiYgIXNlYXJjaC5jaGFyQXQoXCI/XCIpKSB7XG4gICAgICAgICAgICAgICAgc2VhcmNoID0gXCI/XCIgKyBzZWFyY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaXNTYW1lVVJMID0gKGxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgbG9jYXRpb24uaG9zdCArIGxvY2F0aW9uLnNlYXJjaCkgPT09IChuZXdMb2NhdGlvbiArIHNlYXJjaCk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVwbGFjZShuZXdMb2NhdGlvbiArIGhhc2ggKyBzZWFyY2gpO1xuXG4gICAgICAgICAgICBpZiAodXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoXCJ2ZXJib3NlXCIpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKChsb2NhdGlvbi5wcm90b2NvbCArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5zZWFyY2gpKTtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coKHN0ZXAuZGF0YS51cmwucHJvdG9jb2wgKyBzdGVwLmRhdGEudXJsLmhvc3QgKyBzdGVwLmRhdGEudXJsLnNlYXJjaCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIG5vdCBjaGFuZ2VkIHRoZSBhY3R1YWwgbG9jYXRpb24sIHRoZW4gdGhlIGxvY2F0aW9uLnJlcGxhY2VcbiAgICAgICAgICAgIC8vIHdpbGwgbm90IGdvIGFueXdoZXJlXG4gICAgICAgICAgICBpZiAoaXNTYW1lVVJMKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd0aW1lb3V0Jykge1xuICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXAsIHN0ZXAuZGF0YS5hbW91bnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGxvY2F0b3IgPSBzdGVwLmRhdGEubG9jYXRvcjtcbiAgICAgICAgICAgIHZhciBzdGVwcyA9IHNjZW5hcmlvLnN0ZXBzO1xuICAgICAgICAgICAgdmFyIHVuaXF1ZUlkID0gZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKTtcblxuICAgICAgICAgICAgLy8gdHJ5IHRvIGdldCByaWQgb2YgdW5uZWNlc3Nhcnkgc3RlcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdG9Ta2lwW3VuaXF1ZUlkXSA9PSAndW5kZWZpbmVkJyAmJiB1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInJ1bm5lci5zcGVlZFwiKSAhPSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgIHZhciBkaWZmO1xuICAgICAgICAgICAgICB2YXIgaWdub3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgIGZvciAodmFyIGogPSBzdGVwcy5sZW5ndGggLSAxOyBqID4gaWR4OyBqLS0pIHtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJTdGVwID0gc3RlcHNbal07XG4gICAgICAgICAgICAgICAgdmFyIG90aGVyVW5pcXVlSWQgPSBnZXRVbmlxdWVJZEZyb21TdGVwKG90aGVyU3RlcCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuaXF1ZUlkID09PSBvdGhlclVuaXF1ZUlkKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWRpZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gKG90aGVyU3RlcC50aW1lU3RhbXAgLSBzdGVwLnRpbWVTdGFtcCk7XG4gICAgICAgICAgICAgICAgICAgICAgaWdub3JlID0gIWlzSW1wb3J0YW50U3RlcChvdGhlclN0ZXApICYmIGRpZmYgPCBpbXBvcnRhbnRTdGVwTGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ludGVyYWN0aXZlU3RlcChvdGhlclN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWdub3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgdG9Ta2lwW3VuaXF1ZUlkXSA9IGlnbm9yZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UncmUgc2tpcHBpbmcgdGhpcyBlbGVtZW50XG4gICAgICAgICAgICBpZiAodG9Ta2lwW2dldFVuaXF1ZUlkRnJvbVN0ZXAoc3RlcCldKSB7XG4gICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmluZEVsZW1lbnRXaXRoTG9jYXRvcihzY2VuYXJpbywgc3RlcCwgbG9jYXRvciwgZ2V0VGltZW91dChzY2VuYXJpbywgaWR4KSkudGhlbihmdW5jdGlvbiAoZWxlcykge1xuICAgICAgICAgICAgICAgICAgdmFyIGVsZSA9IGVsZXNbMF07XG4gICAgICAgICAgICAgICAgICB2YXIgdGFnTmFtZSA9IGVsZS50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3VwcG9ydHNJbnB1dEV2ZW50ID0gdGFnTmFtZSA9PT0gJ2lucHV0JyB8fCB0YWdOYW1lID09PSAndGV4dGFyZWEnIHx8IGVsZS5nZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoZXZlbnRzLmluZGV4T2Yoc3RlcC5ldmVudE5hbWUpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZGF0YS5idXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLndoaWNoID0gb3B0aW9ucy5idXR0b24gPSBzdGVwLmRhdGEuYnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGVsZW1lbnQgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGVwLmRhdGEudmFsdWUgIT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2Ygc3RlcC5kYXRhLmF0dHJpYnV0ZXMgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciB0b0FwcGx5ID0gc3RlcC5kYXRhLmF0dHJpYnV0ZXMgPyBzdGVwLmRhdGEuYXR0cmlidXRlcyA6IHsgXCJ2YWx1ZVwiOiBzdGVwLmRhdGEudmFsdWUgfTtcbiAgICAgICAgICAgICAgICAgICAgICBfLmV4dGVuZChlbGUsIHRvQXBwbHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1NpbXVsYXRpbmcgJyArIHN0ZXAuZXZlbnROYW1lICsgJyBvbiBlbGVtZW50ICcsIGVsZSwgbG9jYXRvci5zZWxlY3RvcnNbMF0sIFwiIGZvciBzdGVwIFwiICsgaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChzdGVwLmV2ZW50TmFtZSA9PSAnZm9jdXMnIHx8IHN0ZXAuZXZlbnROYW1lID09ICdibHVyJykgJiYgZWxlW3N0ZXAuZXZlbnROYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgIGVsZVtzdGVwLmV2ZW50TmFtZV0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdGVwLmV2ZW50TmFtZSA9PT0gJ2NoYW5nZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgdGhlIGlucHV0IGV2ZW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN1cHBvcnRzSW5wdXRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdjaGFuZ2UnKTsgLy8gVGhpcyBzaG91bGQgYmUgZmlyZWQgYWZ0ZXIgYSBibHVyIGV2ZW50LlxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlW3N0ZXAuZXZlbnROYW1lXShlbGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAna2V5cHJlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0ZXAuZGF0YS5rZXlDb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5ZG93bihlbGUsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXByZXNzKGVsZSwga2V5KTtcblxuICAgICAgICAgICAgICAgICAgICBlbGUudmFsdWUgPSBzdGVwLmRhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2NoYW5nZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmtleXVwKGVsZSwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cHBvcnRzSW5wdXRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJyAmJiB1dG1lLnN0YXRlLnNldHRpbmdzLmdldCgndmVyYm9zZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKCdWYWxpZGF0ZTogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSAgKyBcIiBjb250YWlucyB0ZXh0ICdcIiAgKyBzdGVwLmRhdGEudGV4dCArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJWYWxpZGF0ZTogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0ltcG9ydGFudFN0ZXAoc3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0RXJyb3IoXCJGYWlsZWQgb24gc3RlcDogXCIgKyBpZHggKyBcIiAgRXZlbnQ6IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIiBSZWFzb246IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoJ3ZlcmJvc2UnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLmF1dG9SdW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JBbmd1bGFyKHJvb3RTZWxlY3Rvcikge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iocm9vdFNlbGVjdG9yKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCF3aW5kb3cuYW5ndWxhcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYW5ndWxhciBjb3VsZCBub3QgYmUgZm91bmQgb24gdGhlIHdpbmRvdycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuZ2V0VGVzdGFiaWxpdHkpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmdldFRlc3RhYmlsaXR5KGVsKS53aGVuU3RhYmxlKHJlc29sdmUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZWxlbWVudChlbCkuaW5qZWN0b3IoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Jvb3QgZWxlbWVudCAoJyArIHJvb3RTZWxlY3RvciArICcpIGhhcyBubyBpbmplY3Rvci4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICcgdGhpcyBtYXkgbWVhbiBpdCBpcyBub3QgaW5zaWRlIG5nLWFwcC4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGVsKS5pbmplY3RvcigpLmdldCgnJGJyb3dzZXInKS5cbiAgICAgICAgICAgICAgICBub3RpZnlXaGVuTm9PdXRzdGFuZGluZ1JlcXVlc3RzKHJlc29sdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzSW1wb3J0YW50U3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZWxlYXZlJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VvdXQnICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZWVudGVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnbW91c2VvdmVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnYmx1cicgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ2ZvY3VzJztcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHN0ZXAgaXMgc29tZSBzb3J0IG9mIHVzZXIgaW50ZXJhY3Rpb25cbiAqL1xuZnVuY3Rpb24gaXNJbnRlcmFjdGl2ZVN0ZXAoc3RlcCkge1xuICAgIHZhciBldnQgPSBzdGVwLmV2ZW50TmFtZTtcblxuICAgIC8qXG4gICAgICAgLy8gSW50ZXJlc3Rpbmcgbm90ZSwgZG9pbmcgdGhlIGZvbGxvd2luZyB3YXMgY2F1c2luZyB0aGlzIGZ1bmN0aW9uIHRvIHJldHVybiB1bmRlZmluZWQuXG4gICAgICAgcmV0dXJuXG4gICAgICAgICAgIGV2dC5pbmRleE9mKFwibW91c2VcIikgIT09IDAgfHxcbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZWRvd25cIikgPT09IDAgfHxcbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZXVwXCIpID09PSAwO1xuXG4gICAgICAgLy8gSXRzIGJlY2F1c2UgdGhlIGNvbmRpdGlvbnMgd2VyZSBub3Qgb24gdGhlIHNhbWUgbGluZSBhcyB0aGUgcmV0dXJuIHN0YXRlbWVudFxuICAgICovXG4gICAgcmV0dXJuIGV2dC5pbmRleE9mKFwibW91c2VcIikgIT09IDAgfHwgZXZ0LmluZGV4T2YoXCJtb3VzZWRvd25cIikgPT09IDAgfHwgZXZ0LmluZGV4T2YoXCJtb3VzZXVwXCIpID09PSAwO1xufVxuXG5mdW5jdGlvbiBmaW5kRWxlbWVudFdpdGhMb2NhdG9yKHNjZW5hcmlvLCBzdGVwLCBsb2NhdG9yLCB0aW1lb3V0LCB0ZXh0VG9DaGVjaykge1xuICAgIHZhciBzdGFydGVkO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIHRyeUZpbmQoKSB7XG4gICAgICAgICAgICBpZiAoIXN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICBzdGFydGVkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbGVzO1xuICAgICAgICAgICAgdmFyIGZvdW5kVG9vTWFueSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGZvdW5kVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBmb3VuZERpZmZlcmVudFRleHQgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvcnNUb1Rlc3QgPSBsb2NhdG9yLnNlbGVjdG9ycy5zbGljZSgwKTtcbiAgICAgICAgICAgIHZhciB0ZXh0VG9DaGVjayA9IHN0ZXAuZGF0YS50ZXh0O1xuICAgICAgICAgICAgdmFyIGNvbXBhcmlzb24gPSBzdGVwLmRhdGEuY29tcGFyaXNvbiB8fCBcImVxdWFsc1wiO1xuICAgICAgICAgICAgc2VsZWN0b3JzVG9UZXN0LnVuc2hpZnQoJ1tkYXRhLXVuaXF1ZS1pZD1cIicgKyBsb2NhdG9yLnVuaXF1ZUlkICsgJ1wiXScpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnNUb1Rlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNUb1Rlc3RbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvciArPSBcIjp2aXNpYmxlXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsZXMgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRleHRUb0NoZWNrICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV3VGV4dCA9ICQoZWxlc1swXSkudGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChjb21wYXJpc29uID09PSAnZXF1YWxzJyAmJiBuZXdUZXh0ID09PSB0ZXh0VG9DaGVjaykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY29tcGFyaXNvbiA9PT0gJ2NvbnRhaW5zJyAmJiBuZXdUZXh0LmluZGV4T2YodGV4dFRvQ2hlY2spID49IDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRWYWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kRGlmZmVyZW50VGV4dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZXMuYXR0cignZGF0YS11bmlxdWUtaWQnLCBsb2NhdG9yLnVuaXF1ZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWxlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kVG9vTWFueSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZm91bmRWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZWxlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSAmJiAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydGVkKSA8IHRpbWVvdXQgKiA1KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCA1MCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZFRvb01hbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IEZvdW5kIFRvbyBNYW55IEVsZW1lbnRzXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmb3VuZERpZmZlcmVudFRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJ0NvdWxkIG5vdCBmaW5kIGFwcHJvcHJpYXRlIGVsZW1lbnQgZm9yIHNlbGVjdG9yczogJyArIEpTT04uc3RyaW5naWZ5KGxvY2F0b3Iuc2VsZWN0b3JzKSArIFwiIGZvciBldmVudCBcIiArIHN0ZXAuZXZlbnROYW1lICsgXCIuICBSZWFzb246IFRleHQgZG9lc24ndCBtYXRjaC4gIFxcbkV4cGVjdGVkOlxcblwiICsgdGV4dFRvQ2hlY2sgKyBcIlxcbmJ1dCB3YXNcXG5cIiArIGVsZXMudGV4dCgpICsgXCJcXG5cIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogTm8gZWxlbWVudHMgZm91bmRcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3BlZWQgPSB1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInJ1bm5lci5zcGVlZFwiKTtcbiAgICAgICAgdmFyIGxpbWl0ID0gaW1wb3J0YW50U3RlcExlbmd0aCAvIChzcGVlZCA9PT0gJ3JlYWx0aW1lJyA/ICcxJyA6IHNwZWVkKTtcbiAgICAgICAgaWYgKGdsb2JhbC5hbmd1bGFyKSB7XG4gICAgICAgICAgICB3YWl0Rm9yQW5ndWxhcignW25nLWFwcF0nKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQodHJ5RmluZCwgdGltZW91dCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNwZWVkID09PSAncmVhbHRpbWUnKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3BlZWQgPT09ICdmYXN0ZXN0Jykge1xuICAgICAgICAgICAgICAgIHRyeUZpbmQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCBNYXRoLm1pbih0aW1lb3V0ICogc3BlZWQsIGxpbWl0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZW91dChzY2VuYXJpbywgaWR4KSB7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgLy8gSWYgdGhlIHByZXZpb3VzIHN0ZXAgaXMgYSB2YWxpZGF0ZSBzdGVwLCB0aGVuIGp1c3QgbW92ZSBvbiwgYW5kIHByZXRlbmQgaXQgaXNuJ3QgdGhlcmVcbiAgICAgICAgLy8gT3IgaWYgaXQgaXMgYSBzZXJpZXMgb2Yga2V5cywgdGhlbiBnb1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0uZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuYXJpby5zdGVwc1tpZHhdLnRpbWVTdGFtcCAtIHNjZW5hcmlvLnN0ZXBzW2lkeCAtIDFdLnRpbWVTdGFtcDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCwgdGltZW91dCkge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSBhcmVuJ3QgZ29pbmcgdG8gb3ZlcmZsb3cgdGhlIGNhbGwgc3RhY2suXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHNjZW5hcmlvLnN0ZXBzLmxlbmd0aCA+IChpZHggKyAxKSkge1xuICAgICAgICAgICAgcnVuU3RlcChzY2VuYXJpbywgaWR4ICsgMSwgdG9Ta2lwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHV0bWUuc3RvcFNjZW5hcmlvKHRydWUpO1xuICAgICAgICB9XG4gICAgfSwgdGltZW91dCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZnJhZ21lbnRGcm9tU3RyaW5nKHN0ckhUTUwpIHtcbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHJIVE1MO1xuICAgIC8vIGNvbnNvbGUubG9nKHRlbXAuaW5uZXJIVE1MKTtcbiAgICByZXR1cm4gdGVtcC5jb250ZW50ID8gdGVtcC5jb250ZW50IDogdGVtcDtcbn1cblxuZnVuY3Rpb24gZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKSB7XG4gICAgcmV0dXJuIHN0ZXAgJiYgc3RlcC5kYXRhICYmIHN0ZXAuZGF0YS5sb2NhdG9yICYmIHN0ZXAuZGF0YS5sb2NhdG9yLnVuaXF1ZUlkO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJFeHRyYUxvYWRzKHN0ZXBzKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgdmFyIHNlZW5Mb2FkID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RlcHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXNMb2FkID0gc3RlcHNbaV0uZXZlbnROYW1lID09PSAnbG9hZCc7XG4gICAgaWYgKCFzZWVuTG9hZCB8fCAhaXNMb2FkKSB7XG4gICAgICByZXN1bHQucHVzaChzdGVwc1tpXSk7XG4gICAgICBzZWVuTG9hZCA9IHNlZW5Mb2FkIHx8IGlzTG9hZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbnZhciBndWlkID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBzNCgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXG4gICAgICAgICAgICAudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgICAgICAgICBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xuICAgIH07XG59KSgpO1xuXG52YXIgbGlzdGVuZXJzID0gW107XG52YXIgc3RhdGU7XG52YXIgdXRtZSA9IHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzY2VuYXJpbyA9IGdldFBhcmFtZXRlckJ5TmFtZSgndXRtZV9zY2VuYXJpbycpO1xuICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZSA9IHV0bWUuc3RhdGUgPSB1dG1lLmxvYWRTdGF0ZUZyb21TdG9yYWdlKCk7XG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdJTklUSUFMSVpFRCcpO1xuXG4gICAgICAgIHJldHVybiB1dG1lLmxvYWRTZXR0aW5ncygpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHN0YXRlLnRlc3RTZXJ2ZXIgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoXCJ1dG1lX3Rlc3Rfc2VydmVyXCIpO1xuICAgICAgICAgICAgICBzdGF0ZS5hdXRvUnVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdXRtZS5ydW5TY2VuYXJpbyhzY2VuYXJpbyk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuc3RhdHVzID09PSBcIlBMQVlJTkdcIikge1xuICAgICAgICAgICAgICBydW5OZXh0U3RlcChzdGF0ZS5ydW4uc2NlbmFyaW8sIHN0YXRlLnJ1bi5zdGVwSW5kZXgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghc3RhdGUuc3RhdHVzIHx8IHN0YXRlLnN0YXR1cyA9PT0gJ0lOSVRJQUxJWklORycpIHtcbiAgICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJMT0FERURcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBicm9hZGNhc3Q6IGZ1bmN0aW9uIChldnQsIGV2dERhdGEpIHtcbiAgICAgICAgaWYgKGxpc3RlbmVycyAmJiBsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyc1tpXShldnQsIGV2dERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBzdGFydFJlY29yZGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc3RhdGUuc3RhdHVzICE9ICdSRUNPUkRJTkcnKSB7XG4gICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSAnUkVDT1JESU5HJztcbiAgICAgICAgICAgIHN0YXRlLnN0ZXBzID0gW107XG4gICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlJlY29yZGluZyBTdGFydGVkXCIpO1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1JFQ09SRElOR19TVEFSVEVEJyk7XG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoXCJsb2FkXCIsIHtcbiAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogd2luZG93LmxvY2F0aW9uLmhvc3QsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogd2luZG93LmxvY2F0aW9uLnNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgaGFzaDogd2luZG93LmxvY2F0aW9uLmhhc2hcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBydW5TY2VuYXJpbzogZnVuY3Rpb24gKG5hbWUsIGNvbmZpZykge1xuICAgICAgICB2YXIgdG9SdW4gPSBuYW1lIHx8IHByb21wdCgnU2NlbmFyaW8gdG8gcnVuJyk7XG4gICAgICAgIHZhciBhdXRvUnVuID0gIW5hbWUgPyBwcm9tcHQoJ1dvdWxkIHlvdSBsaWtlIHRvIHN0ZXAgdGhyb3VnaCBlYWNoIHN0ZXAgKHl8bik/JykgIT0gJ3knIDogdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGdldFNjZW5hcmlvKHRvUnVuKS50aGVuKGZ1bmN0aW9uIChzY2VuYXJpbykge1xuICAgICAgICAgICAgc2NlbmFyaW8gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNjZW5hcmlvKSk7XG4gICAgICAgICAgICBzZXR1cENvbmRpdGlvbnMoc2NlbmFyaW8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnJ1biA9IHt9O1xuICAgICAgICAgICAgICAgIHN0YXRlLmF1dG9SdW4gPSBhdXRvUnVuID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9IFwiUExBWUlOR1wiO1xuXG4gICAgICAgICAgICAgICAgc2NlbmFyaW8uc3RlcHMgPSBmaWx0ZXJFeHRyYUxvYWRzKHNjZW5hcmlvLnN0ZXBzKTtcblxuICAgICAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInZlcmJvc2VcIikpIHtcbiAgICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiU3RhcnRpbmcgU2NlbmFyaW8gJ1wiICsgbmFtZSArIFwiJ1wiLCBzY2VuYXJpbyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1BMQVlCQUNLX1NUQVJURUQnKTtcblxuICAgICAgICAgICAgICAgIHJ1blN0ZXAoc2NlbmFyaW8sIDApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgcnVuTmV4dFN0ZXA6IHJ1bk5leHRTdGVwLFxuICAgIHN0b3BTY2VuYXJpbzogZnVuY3Rpb24gKHN1Y2Nlc3MpIHtcbiAgICAgICAgdmFyIHNjZW5hcmlvID0gc3RhdGUucnVuICYmIHN0YXRlLnJ1bi5zY2VuYXJpbztcbiAgICAgICAgZGVsZXRlIHN0YXRlLnJ1bjtcbiAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJMT0FERURcIjtcbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1BMQVlCQUNLX1NUT1BQRUQnKTtcblxuICAgICAgICBpZiAodXRtZS5zdGF0ZS5zZXR0aW5ncy5nZXQoXCJ2ZXJib3NlXCIpKSB7XG4gICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBTY2VuYXJpb1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2NlbmFyaW8pIHtcbiAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRTdWNjZXNzKFwiW1NVQ0NFU1NdIFNjZW5hcmlvICdcIiArIHNjZW5hcmlvLm5hbWUgKyBcIicgQ29tcGxldGVkIVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdG9wcGluZyBvbiBwYWdlIFwiICsgd2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICAgICAgICAgIHV0bWUucmVwb3J0RXJyb3IoXCJbRkFJTFVSRV0gU2NlbmFyaW8gJ1wiICsgc2NlbmFyaW8ubmFtZSArIFwiJyBTdG9wcGVkIVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgdGVtcG9yYXJ5IGVsZW1lbnQgbG9jYXRvciwgZm9yIHVzZSB3aXRoIGZpbmFsaXplTG9jYXRvclxuICAgICAqL1xuICAgIGNyZWF0ZUVsZW1lbnRMb2NhdG9yOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgdW5pcXVlSWQgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtdW5pcXVlLWlkXCIpIHx8IGd1aWQoKTtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXVuaXF1ZS1pZFwiLCB1bmlxdWVJZCk7XG5cbiAgICAgICAgdmFyIGVsZUh0bWwgPSBlbGVtZW50LmNsb25lTm9kZSgpLm91dGVySFRNTDtcbiAgICAgICAgdmFyIGVsZVNlbGVjdG9ycyA9IFtdO1xuICAgICAgICBpZiAoZWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT0gJ0JPRFknIHx8IGVsZW1lbnQudGFnTmFtZS50b1VwcGVyQ2FzZSgpID09ICdIVE1MJykge1xuICAgICAgICAgICAgZWxlU2VsZWN0b3JzID0gW2VsZW1lbnQudGFnTmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVTZWxlY3RvcnMgPSBzZWxlY3RvckZpbmRlcihlbGVtZW50LCBkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdW5pcXVlSWQ6IHVuaXF1ZUlkLFxuICAgICAgICAgICAgc2VsZWN0b3JzOiBlbGVTZWxlY3RvcnNcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgcmVnaXN0ZXJFdmVudDogZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGF0YSwgaWR4KSB7XG4gICAgICAgIGlmICh1dG1lLmlzUmVjb3JkaW5nKCkgfHwgdXRtZS5pc1ZhbGlkYXRpbmcoKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBpZHggPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBpZHggPSB1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlLnN0ZXBzW2lkeF0gPSB7XG4gICAgICAgICAgICAgICAgZXZlbnROYW1lOiBldmVudE5hbWUsXG4gICAgICAgICAgICAgICAgdGltZVN0YW1wOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0VWRU5UX1JFR0lTVEVSRUQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0TG9nOiBmdW5jdGlvbiAobG9nLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0ubG9nKGxvZywgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRFcnJvcjogZnVuY3Rpb24gKGVycm9yLCBzY2VuYXJpbykge1xuICAgICAgICBpZiAocmVwb3J0SGFuZGxlcnMgJiYgcmVwb3J0SGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcG9ydEhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVwb3J0SGFuZGxlcnNbaV0uZXJyb3IoZXJyb3IsIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVwb3J0U3VjY2VzczogZnVuY3Rpb24gKG1lc3NhZ2UsIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5zdWNjZXNzKG1lc3NhZ2UsIHNjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVnaXN0ZXJMaXN0ZW5lcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgbGlzdGVuZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICByZWdpc3RlclNhdmVIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBzYXZlSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyUmVwb3J0SGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgcmVwb3J0SGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyTG9hZEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGxvYWRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJTZXR0aW5nc0xvYWRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBzZXR0aW5nc0xvYWRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgaXNSZWNvcmRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlJFQ09SRElOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIGlzUGxheWluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiUExBWUlOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIGlzVmFsaWRhdGluZzogZnVuY3Rpb24odmFsaWRhdGluZykge1xuICAgICAgICBpZiAodHlwZW9mIHZhbGlkYXRpbmcgIT09ICd1bmRlZmluZWQnICYmICh1dG1lLmlzUmVjb3JkaW5nKCkgfHwgdXRtZS5pc1ZhbGlkYXRpbmcoKSkpIHtcbiAgICAgICAgICAgIHV0bWUuc3RhdGUuc3RhdHVzID0gdmFsaWRhdGluZyA/IFwiVkFMSURBVElOR1wiIDogXCJSRUNPUkRJTkdcIjtcbiAgICAgICAgICAgIHV0bWUuYnJvYWRjYXN0KCdWQUxJREFUSU9OX0NIQU5HRUQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXRtZS5zdGF0ZS5zdGF0dXMuaW5kZXhPZihcIlZBTElEQVRJTkdcIikgPT09IDA7XG4gICAgfSxcbiAgICBzdG9wUmVjb3JkaW5nOiBmdW5jdGlvbiAoaW5mbykge1xuICAgICAgICBpZiAoaW5mbyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHZhciBuZXdTY2VuYXJpbyA9IHtcbiAgICAgICAgICAgICAgICBzdGVwczogc3RhdGUuc3RlcHNcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIF8uZXh0ZW5kKG5ld1NjZW5hcmlvLCBpbmZvKTtcblxuICAgICAgICAgICAgaWYgKCFuZXdTY2VuYXJpby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgbmV3U2NlbmFyaW8ubmFtZSA9IHByb21wdCgnRW50ZXIgc2NlbmFyaW8gbmFtZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobmV3U2NlbmFyaW8ubmFtZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnNjZW5hcmlvcy5wdXNoKG5ld1NjZW5hcmlvKTtcblxuICAgICAgICAgICAgICAgIGlmIChzYXZlSGFuZGxlcnMgJiYgc2F2ZUhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNhdmVIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUhhbmRsZXJzW2ldKG5ld1NjZW5hcmlvLCB1dG1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLnN0YXR1cyA9ICdMT0FERUQnO1xuXG4gICAgICAgIHV0bWUuYnJvYWRjYXN0KCdSRUNPUkRJTkdfU1RPUFBFRCcpO1xuXG4gICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0b3BwZWRcIiwgbmV3U2NlbmFyaW8pO1xuICAgIH0sXG5cbiAgICBsb2FkU2V0dGluZ3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNldHRpbmdzID0gdXRtZS5zdGF0ZS5zZXR0aW5ncyA9IHV0bWUuc3RhdGUuc2V0dGluZ3MgfHwgbmV3IFNldHRpbmdzKHtcbiAgICAgICAgICBcInJ1bm5lci5zcGVlZFwiOiBcIjEwXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzZXR0aW5nc0xvYWRIYW5kbGVycy5sZW5ndGggPiAwICYmICF1dG1lLmlzUmVjb3JkaW5nKCkgJiYgIXV0bWUuaXNQbGF5aW5nKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3NMb2FkSGFuZGxlcnNbMF0oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3Muc2V0RGVmYXVsdHMocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxvYWRTdGF0ZUZyb21TdG9yYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB1dG1lU3RhdGVTdHIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndXRtZScpO1xuICAgICAgICBpZiAodXRtZVN0YXRlU3RyKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEpTT04ucGFyc2UodXRtZVN0YXRlU3RyKTtcblxuICAgICAgICAgICAgaWYgKHN0YXRlLnNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1NldHRpbmdzID0gbmV3IFNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgbmV3U2V0dGluZ3Muc2V0dGluZ3MgPSBzdGF0ZS5zZXR0aW5ncy5zZXR0aW5ncztcbiAgICAgICAgICAgICAgICBuZXdTZXR0aW5ncy5zZXR0aW5ncyA9IHN0YXRlLnNldHRpbmdzLmRlZmF1bHRTZXR0aW5ncztcbiAgICAgICAgICAgICAgICBzdGF0ZS5zZXR0aW5ncyA9IG5ld1NldHRpbmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcIklOSVRJQUxJWklOR1wiLFxuICAgICAgICAgICAgICAgIHNjZW5hcmlvczogW11cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICBzYXZlU3RhdGVUb1N0b3JhZ2U6IGZ1bmN0aW9uICh1dG1lU3RhdGUpIHtcbiAgICAgICAgaWYgKHV0bWVTdGF0ZSkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3V0bWUnLCBKU09OLnN0cmluZ2lmeSh1dG1lU3RhdGUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCd1dG1lJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5sb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHV0bWUuc2F2ZVN0YXRlVG9TdG9yYWdlKHN0YXRlKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiB0b2dnbGVIaWdobGlnaHQoZWxlLCB2YWx1ZSkge1xuICAgICQoZWxlKS50b2dnbGVDbGFzcygndXRtZS12ZXJpZnknLCB2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVJlYWR5KGVsZSwgdmFsdWUpIHtcbiAgICAkKGVsZSkudG9nZ2xlQ2xhc3MoJ3V0bWUtcmVhZHknLCB2YWx1ZSk7XG59XG5cbi8qKlxuICogSWYgeW91IGNsaWNrIG9uIGEgc3BhbiBpbiBhIGxhYmVsLCB0aGUgc3BhbiB3aWxsIGNsaWNrLFxuICogdGhlbiB0aGUgYnJvd3NlciB3aWxsIGZpcmUgdGhlIGNsaWNrIGV2ZW50IGZvciB0aGUgaW5wdXQgY29udGFpbmVkIHdpdGhpbiB0aGUgc3BhbixcbiAqIFNvLCB3ZSBvbmx5IHdhbnQgdG8gdHJhY2sgdGhlIGlucHV0IGNsaWNrcy5cbiAqL1xuZnVuY3Rpb24gaXNOb3RJbkxhYmVsT3JWYWxpZChlbGUpIHtcbiAgICByZXR1cm4gJChlbGUpLnBhcmVudHMoJ2xhYmVsJykubGVuZ3RoID09IDAgfHxcbiAgICAgICAgICBlbGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSAnaW5wdXQnO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBpdCBpcyBhbiBlbGVtZW50IHRoYXQgc2hvdWxkIGJlIGlnbm9yZWRcbiAqL1xuZnVuY3Rpb24gaXNJZ25vcmVkRWxlbWVudChlbGUpIHtcbiAgcmV0dXJuICFlbGUuaGFzQXR0cmlidXRlIHx8IGVsZS5oYXNBdHRyaWJ1dGUoJ2RhdGEtaWdub3JlJykgfHwgJChlbGUpLnBhcmVudHMoXCJbZGF0YS1pZ25vcmVdXCIpLmxlbmd0aCA+IDA7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBldmVudCBzaG91bGQgYmUgcmVjb3JkZWQgb24gdGhlIGdpdmVuIGVsZW1lbnRcbiAqL1xuZnVuY3Rpb24gc2hvdWxkUmVjb3JkRXZlbnQoZWxlLCBldnQpIHtcbiAgdmFyIHNldHRpbmcgPSB1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInJlY29yZGVyLmV2ZW50cy5cIiArIGV2dCk7XG4gIHZhciBpc1NldHRpbmdUcnVlID0gKHNldHRpbmcgPT09IHRydWUgfHwgc2V0dGluZyA9PT0gJ3RydWUnIHx8IHR5cGVvZiBzZXR0aW5nID09PSAndW5kZWZpbmVkJyk7XG4gIHJldHVybiB1dG1lLmlzUmVjb3JkaW5nKCkgJiYgaXNTZXR0aW5nVHJ1ZSAmJiBpc05vdEluTGFiZWxPclZhbGlkKGVsZSk7XG59XG5cbnZhciB0aW1lcnMgPSBbXTtcblxuZnVuY3Rpb24gaW5pdEV2ZW50SGFuZGxlcnMoKSB7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50c1tpXSwgKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5pc1RyaWdnZXIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIGlmICghaXNJZ25vcmVkRWxlbWVudChlLnRhcmdldCkgJiYgdXRtZS5pc1JlY29yZGluZygpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGxhc3RTdGVwID0gdXRtZS5zdGF0ZS5zdGVwc1tpZHggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdGltZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdtb3VzZW92ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGUudGFyZ2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXI6IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlYWR5KGUudGFyZ2V0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIaWdobGlnaHQoZS50YXJnZXQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dCA9PSAnbW91c2VvdXQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGltZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGltZXJzW2ldLmVsZW1lbnQgPT0gZS50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXJzW2ldLnRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWFkeShlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChzaG91bGRSZWNvcmRFdmVudChlLnRhcmdldCwgZXZ0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUud2hpY2ggfHwgZS5idXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5idXR0b24gPSBlLndoaWNoIHx8IGUuYnV0dG9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGljayBiZWNhdXNlIGNoYW5nZSBmaXJlcyBmaXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09PSAnY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLmF0dHJpYnV0ZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiIDogZS50YXJnZXQudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJjaGVja2VkXCI6IGUudGFyZ2V0LmNoZWNrZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzSW5wdXQgPSBlLnRhcmdldC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdpbnB1dCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09PSAnY2xpY2snICYmIGlzSW5wdXQgJiYgbGFzdFN0ZXAgJiYgbGFzdFN0ZXAuZXZlbnROYW1lID09PSAnY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RTdGVwLmV2ZW50TmFtZSA9ICdjbGljayc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoZXZ0LCBhcmdzLCBpZHgpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbZXZ0XSA9IGhhbmRsZXI7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgICAgfSkoZXZlbnRzW2ldKSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgdmFyIF90b19hc2NpaSA9IHtcbiAgICAgICAgJzE4OCc6ICc0NCcsXG4gICAgICAgICcxODknOiAnNDUnLFxuICAgICAgICAnMTkwJzogJzQ2JyxcbiAgICAgICAgJzE5MSc6ICc0NycsXG4gICAgICAgICcxOTInOiAnOTYnLFxuICAgICAgICAnMjIwJzogJzkyJyxcbiAgICAgICAgJzIyMic6ICczOScsXG4gICAgICAgICcyMjEnOiAnOTMnLFxuICAgICAgICAnMjE5JzogJzkxJyxcbiAgICAgICAgJzE3Myc6ICc0NScsXG4gICAgICAgICcxODcnOiAnNjEnLCAvL0lFIEtleSBjb2Rlc1xuICAgICAgICAnMTg2JzogJzU5J1xuICAgIH07XG5cbiAgICB2YXIgc2hpZnRVcHMgPSB7XG4gICAgICAgIFwiOTZcIjogXCJ+XCIsXG4gICAgICAgIFwiNDlcIjogXCIhXCIsXG4gICAgICAgIFwiNTBcIjogXCJAXCIsXG4gICAgICAgIFwiNTFcIjogXCIjXCIsXG4gICAgICAgIFwiNTJcIjogXCIkXCIsXG4gICAgICAgIFwiNTNcIjogXCIlXCIsXG4gICAgICAgIFwiNTRcIjogXCJeXCIsXG4gICAgICAgIFwiNTVcIjogXCImXCIsXG4gICAgICAgIFwiNTZcIjogXCIqXCIsXG4gICAgICAgIFwiNTdcIjogXCIoXCIsXG4gICAgICAgIFwiNDhcIjogXCIpXCIsXG4gICAgICAgIFwiNDVcIjogXCJfXCIsXG4gICAgICAgIFwiNjFcIjogXCIrXCIsXG4gICAgICAgIFwiOTFcIjogXCJ7XCIsXG4gICAgICAgIFwiOTNcIjogXCJ9XCIsXG4gICAgICAgIFwiOTJcIjogXCJ8XCIsXG4gICAgICAgIFwiNTlcIjogXCI6XCIsXG4gICAgICAgIFwiMzlcIjogXCJcXFwiXCIsXG4gICAgICAgIFwiNDRcIjogXCI8XCIsXG4gICAgICAgIFwiNDZcIjogXCI+XCIsXG4gICAgICAgIFwiNDdcIjogXCI/XCJcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24ga2V5UHJlc3NIYW5kbGVyIChlKSB7XG4gICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoIWlzSWdub3JlZEVsZW1lbnQoZS50YXJnZXQpICYmIHNob3VsZFJlY29yZEV2ZW50KGUudGFyZ2V0LCBcImtleXByZXNzXCIpKSB7XG4gICAgICAgICAgICB2YXIgYyA9IGUud2hpY2g7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IERvZXNuJ3Qgd29yayB3aXRoIGNhcHMgbG9ja1xuICAgICAgICAgICAgLy9ub3JtYWxpemUga2V5Q29kZVxuICAgICAgICAgICAgaWYgKF90b19hc2NpaS5oYXNPd25Qcm9wZXJ0eShjKSkge1xuICAgICAgICAgICAgICAgIGMgPSBfdG9fYXNjaWlbY107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZS5zaGlmdEtleSAmJiAoYyA+PSA2NSAmJiBjIDw9IDkwKSkge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgKyAzMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgc2hpZnRVcHMuaGFzT3duUHJvcGVydHkoYykpIHtcbiAgICAgICAgICAgICAgICAvL2dldCBzaGlmdGVkIGtleUNvZGUgdmFsdWVcbiAgICAgICAgICAgICAgICBjID0gc2hpZnRVcHNbY107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoJ2tleXByZXNzJywge1xuICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpLFxuICAgICAgICAgICAgICAgIGtleTogYyxcbiAgICAgICAgICAgICAgICBwcmV2VmFsdWU6IGUudGFyZ2V0LnZhbHVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlLnRhcmdldC52YWx1ZSArIGMsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywga2V5UHJlc3NIYW5kbGVyLCB0cnVlKTtcblxuICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAodXRtZS5ldmVudExpc3RlbmVycyA9IHV0bWUuZXZlbnRMaXN0ZW5lcnMgfHwge30pWydrZXlwcmVzcyddID0ga2V5UHJlc3NIYW5kbGVyO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG5cbmZ1bmN0aW9uIGJvb3RzdHJhcFV0bWUoKSB7XG4gIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09IFwiY29tcGxldGVcIikge1xuICAgIHV0bWUuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGluaXRFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSkge1xuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5ib290c3RyYXBVdG1lKCk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgYm9vdHN0cmFwVXRtZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdXRtZS51bmxvYWQoKTtcbn0sIHRydWUpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdXRtZS5yZXBvcnRMb2coXCJTY3JpcHQgRXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UgKyBcIjpcIiArIGVyci51cmwgKyBcIixcIiArIGVyci5saW5lICsgXCI6XCIgKyBlcnIuY29sKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNWMGJXVXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOW9iMjFsTDJSaGRtbGtkR2wwZEhOM2IzSjBhQzl3Y205cVpXTjBjeTkxZEcxbEwzTnlZeTlxY3k5MWRHMWxMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzUTBGQlF5eEhRVUZITEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRCUVVNelFpeEpRVUZKTEU5QlFVOHNSMEZCUnl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETzBGQlF6ZERMRWxCUVVrc1VVRkJVU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXp0QlFVTnlReXhKUVVGSkxHTkJRV01zUjBGQlJ5eFBRVUZQTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6dEJRVU5xUkN4SlFVRkpMRkZCUVZFc1IwRkJSeXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdPMEZCUlhKRExHZEVRVUZuUkR0QlFVTm9SQ3hKUVVGSkxHMUNRVUZ0UWl4SFFVRkhMRWRCUVVjc1EwRkJRenRCUVVNNVFpeEpRVUZKTEZsQlFWa3NSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRkRUlzU1VGQlNTeGpRVUZqTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTNoQ0xFbEJRVWtzV1VGQldTeEhRVUZITEVWQlFVVXNRMEZCUXp0QlFVTjBRaXhKUVVGSkxHOUNRVUZ2UWl4SFFVRkhMRVZCUVVVc1EwRkJRenM3UVVGRk9VSXNVMEZCVXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hGUVVGRk8wbEJRM1pDTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrc1dVRkJXU3hEUVVGRExFMUJRVTBzUzBGQlN5eERRVUZETEVWQlFVVTdXVUZETTBJc1NVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRemRETEVsQlFVa3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEV0QlFVc3NTVUZCU1N4RlFVRkZPMjlDUVVOc1F5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJsQ1FVTXZRanRoUVVOS08xTkJRMG9zVFVGQlRUdFpRVU5JTEZsQlFWa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVTdaMEpCUTJ4RExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnFRaXhEUVVGRExFTkJRVU03VTBGRFRqdExRVU5LTEVOQlFVTXNRMEZCUXp0RFFVTk9PMEZCUTBRc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eERRVUZET3p0QlFVVjJRaXhKUVVGSkxFMUJRVTBzUjBGQlJ6dEpRVU5VTEU5QlFVODdTVUZEVUN4UFFVRlBPMGxCUTFBc1RVRkJUVHRCUVVOV0xFbEJRVWtzVlVGQlZUdEJRVU5rTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkJSVUVzU1VGQlNTeFhRVUZYT3p0SlFVVllMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVlVGQlZUdEpRVU5XTEZkQlFWYzdTVUZEV0N4VFFVRlRPMEZCUTJJc1NVRkJTU3hSUVVGUk8wRkJRMW83TzBGQlJVRXNRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWVVGQllTeERRVUZETEZGQlFWRXNSVUZCUlN4aFFVRmhMRVZCUVVVN1JVRkRPVU1zU1VGQlNTeExRVUZMTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhEUVVGRE8wRkJRM1JETEVWQlFVVXNTVUZCU1N4VFFVRlRMRWRCUVVjc1MwRkJTeXhKUVVGSkxFdEJRVXNzUTBGQlF5eFRRVUZUTEVOQlFVTTdPMFZCUlhwRExFbEJRVWtzVTBGQlV5eEZRVUZGTzBsQlEySXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RlFVRkZMRlZCUVZVc1dVRkJXU3hGUVVGRk8wMUJRekZFTEU5QlFVOHNWMEZCVnl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEdGQlFXRXNSVUZCUlR0UlFVTTNSQ3hoUVVGaExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHRkJRV0VzUTBGQlF5eERRVUZETEVOQlFVTTdVVUZETVVRc1QwRkJUeXhsUVVGbExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmxCUVZrN1ZVRkRja1FzU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMVZCUTJ4Q0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhoUVVGaExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRaUVVOdVJDeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMR0ZCUVdFc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0WFFVTjJRenRWUVVORUxFOUJRVThzVVVGQlVTeERRVUZETzFOQlEycENMRU5CUVVNc1EwRkJRenRQUVVOS0xFTkJRVU1zUTBGQlF6dExRVU5LTEVOQlFVTXNRMEZCUXl4RFFVRkRPMGRCUTB3c1RVRkJUVHRKUVVOTUxFOUJRVThzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJRenRIUVVNMVFqdEJRVU5JTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhuUWtGQlowSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRia01zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8wRkJRekZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhwUWtGQmFVSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRjRU1zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRelZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXgzUWtGQmQwSXNRMEZCUXl4TFFVRkxMRVZCUVVVN1NVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMGxCUTJ4Q0xFbEJRVWtzWjBKQlFXZENMRU5CUVVNN1NVRkRja0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRia01zU1VGQlNTeFRRVUZUTEVkQlFVY3NTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xRkJRM3BDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRaUVVOUUxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOdVF5eEpRVUZKTEVsQlFVa3NSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEzaENMRWxCUVVrc1NVRkJTU3hIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU03WjBKQlEzQkZMR2RDUVVGblFpeEpRVUZKTEVsQlFVa3NRMEZCUXp0blFrRkRla0lzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhuUWtGQlowSXNRMEZCUXp0aFFVTTNRenRUUVVOS0xFMUJRVTA3V1VGRFNDeG5Ra0ZCWjBJc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNVMEZCVXl4RFFVRkRPMU5CUXpkRE8xRkJRMFFzVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UzBGRGVrTTdTVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJRenRCUVVOd1FpeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5vUXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU03U1VGRGJFSXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRE8xRkJRMllzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRE8xRkJRekZDTEdsQ1FVRnBRaXhEUVVGRExGRkJRVkVzUTBGQlF6dExRVU01UWl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzVlVGQlZTeEZRVUZGTzFGQlF6RkNMRWxCUVVrc1UwRkJVeXhIUVVGSExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGRFVXNVVUZCVVN4RFFVRkRMRXRCUVVzc1IwRkJSeXgzUWtGQmQwSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRMUVVONFJDeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVDBGQlR5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRk8wbEJRM0JETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU03UVVGRGJrTXNTVUZCU1N4TlFVRk5MRWRCUVVjc1RVRkJUU3hKUVVGSkxFVkJRVVVzUTBGQlF6czdTVUZGZEVJc1NVRkJTU3hKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRKUVVNdlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRE8wbEJRM1pDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVTBGQlV5eEZRVUZGTzFGQlEyNURMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXp0UlFVTTVRaXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNSMEZCUnl4SFFVRkhMRU5CUVVNN1VVRkRNVUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVNeFFpeEpRVUZKTEZkQlFWY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTnlSU3hKUVVGSkxFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhOUVVGTkxFTkJRVU03UVVGRE9VTXNXVUZCV1N4SlFVRkpMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNN08xbEJSVGxDTEVsQlFVa3NUVUZCVFN4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFMUJRVTBzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRMMElzVFVGQlRTeEhRVUZITEVkQlFVY3NSMEZCUnl4TlFVRk5MRU5CUVVNN1lVRkRla0k3V1VGRFJDeEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExFMUJRVTBzVDBGQlR5eFhRVUZYTEVkQlFVY3NUVUZCVFN4RFFVRkRMRU5CUVVNN1FVRkRjRWdzV1VGQldTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFZEJRVWNzU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPenRaUVVWeVJDeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1VVRkJVU3hEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNSVUZCUlR0alFVTjBReXhQUVVGUExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4UlFVRlJMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNN1kwRkRia1VzVDBGQlR5eERRVUZETEVkQlFVY3NSVUZCUlN4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zU1VGQlNTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETzBGQlEyaEhMR0ZCUVdFN1FVRkRZanRCUVVOQk96dFpRVVZaTEVsQlFVa3NVMEZCVXl4RlFVRkZPMmRDUVVOWUxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRemRETEdGQlFXRTdPMU5CUlVvc1RVRkJUU3hKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NVMEZCVXl4RlFVRkZPMWxCUTNCRExFbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRaaXhYUVVGWExFTkJRVU1zVVVGQlVTeEZRVUZGTEVkQlFVY3NSVUZCUlN4TlFVRk5MRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXp0aFFVTjRSRHRUUVVOS0xFMUJRVTA3V1VGRFNDeEpRVUZKTEU5QlFVOHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF6dFpRVU5vUXl4SlFVRkpMRXRCUVVzc1IwRkJSeXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETzBGQlEzWkRMRmxCUVZrc1NVRkJTU3hSUVVGUkxFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03UVVGRGNrUTdPMWxCUlZrc1NVRkJTU3hQUVVGUExFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1N4WFFVRlhMRWxCUVVrc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMR05CUVdNc1EwRkJReXhKUVVGSkxGVkJRVlVzUlVGQlJUdGpRVU51Unl4SlFVRkpMRWxCUVVrc1EwRkJRenRqUVVOVUxFbEJRVWtzVFVGQlRTeEhRVUZITEV0QlFVc3NRMEZCUXp0alFVTnVRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRek5ETEVsQlFVa3NVMEZCVXl4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dG5Ra0ZEZWtJc1NVRkJTU3hoUVVGaExFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03WjBKQlEyNUVMRWxCUVVrc1VVRkJVU3hMUVVGTExHRkJRV0VzUlVGQlJUdHJRa0ZET1VJc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJUdHpRa0ZEVUN4SlFVRkpMRWxCUVVrc1UwRkJVeXhEUVVGRExGTkJRVk1zUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN2MwSkJRemxETEUxQlFVMHNSMEZCUnl4RFFVRkRMR1ZCUVdVc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEpRVUZKTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU03YlVKQlEzUkZMRTFCUVUwc1NVRkJTU3hwUWtGQmFVSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGNrTXNUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJRenR6UWtGRFppeE5RVUZOTzIxQ1FVTlVPMmxDUVVOR08wRkJRMnBDTEdWQlFXVTdPMk5CUlVRc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXp0QlFVTjRReXhoUVVGaE8wRkJRMkk3TzFsQlJWa3NTVUZCU1N4TlFVRk5MRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNc1JVRkJSVHRuUWtGRGJrTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1JVRkJSU3hIUVVGSExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEZEVNc1RVRkJUVHRuUWtGRFNDeHpRa0ZCYzBJc1EwRkJReXhSUVVGUkxFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNSVUZCUlN4VlFVRlZMRU5CUVVNc1VVRkJVU3hGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1NVRkJTU3hGUVVGRk8ydENRVU01Uml4SlFVRkpMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdhMEpCUTJ4Q0xFbEJRVWtzVDBGQlR5eEhRVUZITEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhGUVVGRkxFTkJRVU03UVVGRE1VUXNhMEpCUVd0Q0xFbEJRVWtzYTBKQlFXdENMRWRCUVVjc1QwRkJUeXhMUVVGTExFOUJRVThzU1VGQlNTeFBRVUZQTEV0QlFVc3NWVUZCVlN4SlFVRkpMRWRCUVVjc1EwRkJReXhaUVVGWkxFTkJRVU1zYVVKQlFXbENMRU5CUVVNc1EwRkJRenM3YTBKQlJUbEhMRWxCUVVrc1RVRkJUU3hEUVVGRExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU4yUXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhGUVVGRkxFTkJRVU03YjBKQlEycENMRWxCUVVrc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVWQlFVVTdjMEpCUTNCQ0xFOUJRVThzUTBGQlF5eExRVUZMTEVkQlFVY3NUMEZCVHl4RFFVRkRMRTFCUVUwc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTjRSU3h4UWtGQmNVSTdRVUZEY2tJN08yOUNRVVZ2UWl4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eExRVUZMTEVsQlFVa3NWMEZCVnl4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEVsQlFVa3NWMEZCVnl4RlFVRkZPM05DUVVOMlJpeEpRVUZKTEU5QlFVOHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1IwRkJSeXhGUVVGRkxFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRXRCUVVzc1JVRkJSU3hEUVVGRE8zTkNRVU42Uml4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0QlFVTTNReXh4UWtGQmNVSTdRVUZEY2tJN08yOUNRVVZ2UWl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFBRVUZQTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hOUVVGTkxFdEJRVXNzUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGJFWXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJTeERRVUZETzBGQlF6VkRMSEZDUVVGeFFpeE5RVUZOTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1MwRkJTeXhSUVVGUkxFVkJRVVU3TzNkQ1FVVndReXhKUVVGSkxHdENRVUZyUWl4RlFVRkZPelJDUVVOd1FpeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dDVRa0ZEYUVNN2QwSkJRMFFzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRVZCUVVVc1VVRkJVU3hEUVVGRExFTkJRVU03Y1VKQlEycERMRTFCUVUwN2MwSkJRMHdzVVVGQlVTeERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJReXhIUVVGSExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdjVUpCUTNoRE8wRkJRM0pDTEcxQ1FVRnRRanM3YTBKQlJVUXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlVzUlVGQlJUdHZRa0ZEYUVNc1NVRkJTU3hIUVVGSExFZEJRVWNzVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzI5Q1FVTnFSQ3hSUVVGUkxFTkJRVU1zVDBGQlR5eERRVUZETEVkQlFVY3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNdlF5eHZRa0ZCYjBJc1VVRkJVU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVWQlFVVXNSMEZCUnl4RFFVRkRMRU5CUVVNN08yOUNRVVUxUWl4SFFVRkhMRU5CUVVNc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUTJoRUxHOUNRVUZ2UWl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUlVGQlJTeFJRVUZSTEVOQlFVTXNRMEZCUXpzN2IwSkJSVGxDTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETzI5Q1FVTjZRaXhKUVVGSkxHdENRVUZyUWl4RlFVRkZPM2RDUVVOd1FpeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dHhRa0ZEYUVNN1FVRkRja0lzYlVKQlFXMUNPenRyUWtGRlJDeEpRVUZKTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1ZVRkJWU3hKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJUdHZRa0ZEZEVVc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eFpRVUZaTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NhMEpCUVd0Q0xFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGJra3NiVUpCUVcxQ096dHJRa0ZGUkN4SlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGUExFVkJRVVU3YjBKQlEycENMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRPMjFDUVVOd1F6dHBRa0ZEUml4RlFVRkZMRlZCUVZVc1RVRkJUU3hGUVVGRk8yOUNRVU5xUWl4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZTeEZRVUZGTzNOQ1FVTm9ReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEZsQlFWa3NSMEZCUnl4TlFVRk5MRU5CUVVNc1EwRkJRenR6UWtGRGRFTXNTVUZCU1N4RFFVRkRMRmxCUVZrc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dHhRa0ZETVVJc1RVRkJUU3hKUVVGSkxHVkJRV1VzUTBGQlF5eEpRVUZKTEVOQlFVTXNSVUZCUlR0M1FrRkRPVUlzU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4clFrRkJhMElzUjBGQlJ5eEhRVUZITEVkQlFVY3NWMEZCVnl4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzVjBGQlZ5eEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPM2RDUVVOcVJ5eEpRVUZKTEVOQlFVTXNXVUZCV1N4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8zRkNRVU0xUWl4TlFVRk5PM05DUVVOTUxFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTzNkQ1FVTjBReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPM1ZDUVVONFFqdHpRa0ZEUkN4SlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGUExFVkJRVVU3ZDBKQlEycENMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRPM1ZDUVVOd1F6dHhRa0ZEUmp0cFFrRkRTaXhEUVVGRExFTkJRVU03WVVGRFRqdFRRVU5LTzB0QlEwbzdRVUZEVEN4RFFVRkRPenRCUVVWRUxGTkJRVk1zWTBGQll5eERRVUZETEZsQlFWa3NSVUZCUlR0SlFVTnNReXhKUVVGSkxFVkJRVVVzUjBGQlJ5eFJRVUZSTEVOQlFVTXNZVUZCWVN4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8wbEJRemxETEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrN1dVRkRRU3hKUVVGSkxFTkJRVU1zVFVGQlRTeERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRha0lzVFVGQlRTeEpRVUZKTEV0QlFVc3NRMEZCUXl3d1EwRkJNRU1zUTBGQlF5eERRVUZETzJGQlF5OUVPMWxCUTBRc1NVRkJTU3hQUVVGUExFTkJRVU1zWTBGQll5eEZRVUZGTzJkQ1FVTjRRaXhQUVVGUExFTkJRVU1zWTBGQll5eERRVUZETEVWQlFVVXNRMEZCUXl4RFFVRkRMRlZCUVZVc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU5zUkN4TlFVRk5PMmRDUVVOSUxFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkVzUlVGQlJTeEZRVUZGTzI5Q1FVTnFReXhOUVVGTkxFbEJRVWtzUzBGQlN5eERRVUZETEdkQ1FVRm5RaXhIUVVGSExGbEJRVmtzUjBGQlJ5eHZRa0ZCYjBJN2QwSkJRMnhGTEhsRFFVRjVReXhEUVVGRExFTkJRVU03YVVKQlEyeEVPMmRDUVVORUxFOUJRVThzUTBGQlF5eFBRVUZQTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFTkJRVU1zUjBGQlJ5eERRVUZETEZWQlFWVXNRMEZCUXp0blFrRkRPVU1zSzBKQlFTdENMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03WVVGRE5VTTdVMEZEU2l4RFFVRkRMRTlCUVU4c1IwRkJSeXhGUVVGRk8xbEJRMVlzVFVGQlRTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUTJZN1MwRkRTaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU16UWl4UFFVRlBMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzV1VGQldUdFhRVU01UWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlU3VjBGRE5VSXNTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3haUVVGWk8xZEJRemxDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1YwRkJWenRYUVVNM1FpeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwN1YwRkRlRUlzU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4UFFVRlBMRU5CUVVNN1FVRkRja01zUTBGQlF6czdRVUZGUkRzN1IwRkZSenRCUVVOSUxGTkJRVk1zYVVKQlFXbENMRU5CUVVNc1NVRkJTU3hGUVVGRk8wRkJRMnBETEVsQlFVa3NTVUZCU1N4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF6dEJRVU0zUWp0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMGxCUlVrc1QwRkJUeXhIUVVGSExFTkJRVU1zVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4TFFVRkxMRU5CUVVNc1NVRkJTU3hIUVVGSExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NRMEZCUXl4TFFVRkxMRU5CUVVNc1NVRkJTU3hIUVVGSExFTkJRVU1zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJRenRCUVVONFJ5eERRVUZET3p0QlFVVkVMRk5CUVZNc2MwSkJRWE5DTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSU3hQUVVGUExFVkJRVVVzVDBGQlR5eEZRVUZGTEZkQlFWY3NSVUZCUlR0SlFVTXpSU3hKUVVGSkxFOUJRVThzUTBGQlF6dEpRVU5hTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRk5CUVZNc1QwRkJUeXhIUVVGSE8xbEJRMllzU1VGQlNTeERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRWaXhQUVVGUExFZEJRVWNzU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1EwRkJRenRCUVVNdlF5eGhRVUZoT3p0WlFVVkVMRWxCUVVrc1NVRkJTU3hEUVVGRE8xbEJRMVFzU1VGQlNTeFpRVUZaTEVkQlFVY3NTMEZCU3l4RFFVRkRPMWxCUTNwQ0xFbEJRVWtzVlVGQlZTeEhRVUZITEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhKUVVGSkxHdENRVUZyUWl4SFFVRkhMRXRCUVVzc1EwRkJRenRaUVVNdlFpeEpRVUZKTEdWQlFXVXNSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0WlFVTnFSQ3hKUVVGSkxGZEJRVmNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOcVF5eEpRVUZKTEZWQlFWVXNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzU1VGQlNTeFJRVUZSTEVOQlFVTTdXVUZEYkVRc1pVRkJaU3hEUVVGRExFOUJRVThzUTBGQlF5eHRRa0ZCYlVJc1IwRkJSeXhQUVVGUExFTkJRVU1zVVVGQlVTeEhRVUZITEVsQlFVa3NRMEZCUXl4RFFVRkRPMWxCUTNaRkxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhsUVVGbExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNM1F5eEpRVUZKTEZGQlFWRXNSMEZCUnl4bFFVRmxMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEyeERMRWxCUVVrc1pVRkJaU3hEUVVGRExFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTjJRaXhSUVVGUkxFbEJRVWtzVlVGQlZTeERRVUZETzJsQ1FVTXhRanRuUWtGRFJDeEpRVUZKTEVkQlFVY3NRMEZCUXl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE8yZENRVU51UWl4SlFVRkpMRWxCUVVrc1EwRkJReXhOUVVGTkxFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTnNRaXhKUVVGSkxFOUJRVThzVjBGQlZ5eEpRVUZKTEZkQlFWY3NSVUZCUlR0M1FrRkRia01zU1VGQlNTeFBRVUZQTEVkQlFVY3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRPM2RDUVVOb1F5eEpRVUZKTEVOQlFVTXNWVUZCVlN4TFFVRkxMRkZCUVZFc1NVRkJTU3hQUVVGUExFdEJRVXNzVjBGQlZ6czJRa0ZEYkVRc1ZVRkJWU3hMUVVGTExGVkJRVlVzU1VGQlNTeFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF5eEZRVUZGT3pSQ1FVTnNSU3hWUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZET3pSQ1FVTnNRaXhOUVVGTk8zbENRVU5VTEUxQlFVMDdORUpCUTBnc2EwSkJRV3RDTEVkQlFVY3NTVUZCU1N4RFFVRkRPM2xDUVVNM1FqdHhRa0ZEU2l4TlFVRk5PM2RDUVVOSUxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTTdkMEpCUTJ4Q0xFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNaMEpCUVdkQ0xFVkJRVVVzVDBGQlR5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPM2RDUVVNNVF5eE5RVUZOTzNGQ1FVTlVPMjlDUVVORUxFMUJRVTA3YVVKQlExUXNUVUZCVFN4SlFVRkpMRWxCUVVrc1EwRkJReXhOUVVGTkxFZEJRVWNzUTBGQlF5eEZRVUZGTzI5Q1FVTjRRaXhaUVVGWkxFZEJRVWNzU1VGQlNTeERRVUZETzJsQ1FVTjJRanRCUVVOcVFpeGhRVUZoT3p0WlFVVkVMRWxCUVVrc1ZVRkJWU3hGUVVGRk8yZENRVU5hTEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOcVFpeE5RVUZOTEVsQlFVa3NaVUZCWlN4RFFVRkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1IwRkJSeXhQUVVGUExFbEJRVWtzVDBGQlR5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRhRVlzVlVGQlZTeERRVUZETEU5QlFVOHNSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenRoUVVNelFpeE5RVUZOTzJkQ1FVTklMRWxCUVVrc1RVRkJUU3hIUVVGSExFVkJRVVVzUTBGQlF6dG5Ra0ZEYUVJc1NVRkJTU3haUVVGWkxFVkJRVVU3YjBKQlEyUXNUVUZCVFN4SFFVRkhMRzlFUVVGdlJDeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eEhRVUZITEdGQlFXRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhIUVVGSExHOURRVUZ2UXl4RFFVRkRPMmxDUVVNM1N5eE5RVUZOTEVsQlFVa3NhMEpCUVd0Q0xFVkJRVVU3YjBKQlF6TkNMRTFCUVUwc1IwRkJSeXh2UkVGQmIwUXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNSMEZCUnl4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUjBGQlJ5d3JRMEZCSzBNc1IwRkJSeXhYUVVGWExFZEJRVWNzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1IwRkJSeXhKUVVGSkxFTkJRVU03YVVKQlF6TlBMRTFCUVUwN2IwSkJRMGdzVFVGQlRTeEhRVUZITEc5RVFVRnZSQ3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhIUVVGSExHRkJRV0VzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SFFVRkhMRGhDUVVFNFFpeERRVUZETzJsQ1FVTjJTenRuUWtGRFJDeE5RVUZOTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1lVRkRiRUk3UVVGRFlpeFRRVUZUT3p0UlFVVkVMRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhqUVVGakxFTkJRVU1zUTBGQlF6dFJRVU53UkN4SlFVRkpMRXRCUVVzc1IwRkJSeXh0UWtGQmJVSXNTVUZCU1N4TFFVRkxMRXRCUVVzc1ZVRkJWU3hIUVVGSExFZEJRVWNzUjBGQlJ5eExRVUZMTEVOQlFVTXNRMEZCUXp0UlFVTjJSU3hKUVVGSkxFMUJRVTBzUTBGQlF5eFBRVUZQTEVWQlFVVTdXVUZEYUVJc1kwRkJZeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4WFFVRlhPMk5CUTNwRExFbEJRVWtzUzBGQlN5eExRVUZMTEZWQlFWVXNSVUZCUlR0clFrRkRkRUlzVlVGQlZTeERRVUZETEU5QlFVOHNSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenRsUVVOb1F5eE5RVUZOTEVsQlFVa3NTMEZCU3l4TFFVRkxMRk5CUVZNc1JVRkJSVHRyUWtGRE5VSXNUMEZCVHl4RlFVRkZMRU5CUVVNN1pVRkRZaXhOUVVGTk8ydENRVU5JTEZWQlFWVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFBRVUZQTEVkQlFVY3NTMEZCU3l4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU03WlVGRGVrUTdZVUZEUml4RFFVRkRMRU5CUVVNN1UwRkRUaXhOUVVGTk8xbEJRMGdzU1VGQlNTeExRVUZMTEV0QlFVc3NWVUZCVlN4RlFVRkZPMmRDUVVOMFFpeFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8yRkJRMmhETEUxQlFVMHNTVUZCU1N4TFFVRkxMRXRCUVVzc1UwRkJVeXhGUVVGRk8yZENRVU0xUWl4UFFVRlBMRVZCUVVVc1EwRkJRenRoUVVOaUxFMUJRVTA3WjBKQlEwZ3NWVUZCVlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEU5QlFVOHNSMEZCUnl4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF6dGhRVU42UkR0VFFVTktPMHRCUTBvc1EwRkJReXhEUVVGRE8wRkJRMUFzUTBGQlF6czdRVUZGUkN4VFFVRlRMRlZCUVZVc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTzBGQlEyNURMRWxCUVVrc1NVRkJTU3hIUVVGSExFZEJRVWNzUTBGQlF5eEZRVUZGTzBGQlEycENPenRSUVVWUkxFbEJRVWtzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU1zVTBGQlV5eEpRVUZKTEZWQlFWVXNSVUZCUlR0WlFVTnFSQ3hQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU5hTzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEZOQlFWTXNSMEZCUnl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4VFFVRlRMRU5CUVVNN1MwRkROVVU3U1VGRFJDeFBRVUZQTEVOQlFVTXNRMEZCUXp0QlFVTmlMRU5CUVVNN08wRkJSVVFzVTBGQlV5eFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFVkJRVVVzVDBGQlR5eEZRVUZGT3p0SlFVVnFSQ3hWUVVGVkxFTkJRVU1zVjBGQlZ6dFJRVU5zUWl4SlFVRkpMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeEpRVUZKTEVkQlFVY3NSMEZCUnl4RFFVRkRMRU5CUVVNc1JVRkJSVHRaUVVOdVF5eFBRVUZQTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1IwRkJSeXhEUVVGRExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdVMEZEZEVNc1RVRkJUVHRaUVVOSUxFbEJRVWtzUTBGQlF5eFpRVUZaTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1UwRkRNMEk3UzBGRFNpeEZRVUZGTEU5QlFVOHNTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOeVFpeERRVUZET3p0QlFVVkVMRk5CUVZNc2EwSkJRV3RDTEVOQlFVTXNUMEZCVHl4RlFVRkZPMGxCUTJwRExFbEJRVWtzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4aFFVRmhMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU03UVVGRGJFUXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhIUVVGSExFOUJRVThzUTBGQlF6czdTVUZGZWtJc1QwRkJUeXhKUVVGSkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRE8wRkJRemxETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXh0UWtGQmJVSXNRMEZCUXl4SlFVRkpMRVZCUVVVN1NVRkRMMElzVDBGQlR5eEpRVUZKTEVsQlFVa3NTVUZCU1N4RFFVRkRMRWxCUVVrc1NVRkJTU3hKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eFJRVUZSTEVOQlFVTTdRVUZEYUVZc1EwRkJRenM3UVVGRlJDeFRRVUZUTEdkQ1FVRm5RaXhEUVVGRExFdEJRVXNzUlVGQlJUdEZRVU12UWl4SlFVRkpMRTFCUVUwc1IwRkJSeXhGUVVGRkxFTkJRVU03UlVGRGFFSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1MwRkJTeXhEUVVGRE8wVkJRM0pDTEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eExRVUZMTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8wbEJRM0pETEVsQlFVa3NUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eFRRVUZUTEV0QlFVc3NUVUZCVFN4RFFVRkRPMGxCUXpORExFbEJRVWtzUTBGQlF5eFJRVUZSTEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVN1RVRkRlRUlzVFVGQlRTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dE5RVU4wUWl4UlFVRlJMRWRCUVVjc1VVRkJVU3hKUVVGSkxFMUJRVTBzUTBGQlF6dExRVU12UWp0SFFVTkdPMFZCUTBRc1QwRkJUeXhOUVVGTkxFTkJRVU03UVVGRGFFSXNRMEZCUXl4RFFVRkRPenRCUVVWR0xFbEJRVWtzU1VGQlNTeEhRVUZITEVOQlFVTXNXVUZCV1R0SlFVTndRaXhUUVVGVExFVkJRVVVzUjBGQlJ6dFJRVU5XTEU5QlFVOHNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUjBGQlJ5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RlFVRkZMRWxCUVVrc1QwRkJUeXhEUVVGRE8yRkJRek5ETEZGQlFWRXNRMEZCUXl4RlFVRkZMRU5CUVVNN1lVRkRXaXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdTMEZEY2tJN1NVRkRSQ3hQUVVGUExGbEJRVms3VVVGRFppeFBRVUZQTEVWQlFVVXNSVUZCUlN4SFFVRkhMRVZCUVVVc1JVRkJSU3hIUVVGSExFZEJRVWNzUjBGQlJ5eEZRVUZGTEVWQlFVVXNSMEZCUnl4SFFVRkhMRWRCUVVjc1JVRkJSU3hGUVVGRkxFZEJRVWNzUjBGQlJ6dFpRVU01UXl4RlFVRkZMRVZCUVVVc1IwRkJSeXhIUVVGSExFZEJRVWNzUlVGQlJTeEZRVUZGTEVkQlFVY3NSVUZCUlN4RlFVRkZMRWRCUVVjc1JVRkJSU3hGUVVGRkxFTkJRVU03UzBGRGRrTXNRMEZCUXp0QlFVTk9MRU5CUVVNc1IwRkJSeXhEUVVGRE96dEJRVVZNTEVsQlFVa3NVMEZCVXl4SFFVRkhMRVZCUVVVc1EwRkJRenRCUVVOdVFpeEpRVUZKTEV0QlFVc3NRMEZCUXp0QlFVTldMRWxCUVVrc1NVRkJTU3hIUVVGSE8wbEJRMUFzU1VGQlNTeEZRVUZGTEZsQlFWazdVVUZEWkN4SlFVRkpMRkZCUVZFc1IwRkJSeXhyUWtGQmEwSXNRMEZCUXl4bFFVRmxMRU5CUVVNc1EwRkJRenRSUVVOdVJDeEpRVUZKTEZGQlFWRXNSVUZCUlR0VlFVTmFMRmxCUVZrc1EwRkJReXhMUVVGTExFVkJRVVVzUTBGQlF6dFRRVU4wUWp0UlFVTkVMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXl4dlFrRkJiMElzUlVGQlJTeERRVUZETzBGQlEzcEVMRkZCUVZFc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eGhRVUZoTEVOQlFVTXNRMEZCUXpzN1VVRkZPVUlzVDBGQlR5eEpRVUZKTEVOQlFVTXNXVUZCV1N4RlFVRkZMRU5CUVVNc1NVRkJTU3hEUVVGRExGbEJRVms3VlVGRE1VTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRXaXhWUVVGVkxFTkJRVU1zV1VGQldUdGpRVU55UWl4TFFVRkxMRU5CUVVNc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVOQlFVTTdZMEZETVVRc1MwRkJTeXhEUVVGRExFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTTdZMEZEY2tJc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXp0aFFVTTFRaXhGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETzFkQlExUXNUVUZCVFR0WlFVTk1MRWxCUVVrc1MwRkJTeXhEUVVGRExFMUJRVTBzUzBGQlN5eFRRVUZUTEVWQlFVVTdZMEZET1VJc1YwRkJWeXhEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNVVUZCVVN4RlFVRkZMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdZVUZEZEVRc1RVRkJUU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc1RVRkJUU3hMUVVGTExHTkJRV01zUlVGQlJUdGpRVU16UkN4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGRkJRVkVzUTBGQlF6dGhRVU42UWp0QlFVTmlMRmRCUVZjN08xTkJSVVlzUTBGQlF5eERRVUZETzB0QlEwNDdTVUZEUkN4VFFVRlRMRVZCUVVVc1ZVRkJWU3hIUVVGSExFVkJRVVVzVDBGQlR5eEZRVUZGTzFGQlF5OUNMRWxCUVVrc1UwRkJVeXhKUVVGSkxGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVTdXVUZETDBJc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRk5CUVZNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdaMEpCUTNaRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4SFFVRkhMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03WVVGRE9VSTdVMEZEU2p0TFFVTktPMGxCUTBRc1kwRkJZeXhGUVVGRkxGbEJRVms3VVVGRGVFSXNTVUZCU1N4TFFVRkxMRU5CUVVNc1RVRkJUU3hKUVVGSkxGZEJRVmNzUlVGQlJUdFpRVU0zUWl4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGZEJRVmNzUTBGQlF6dFpRVU16UWl4TFFVRkxMRU5CUVVNc1MwRkJTeXhIUVVGSExFVkJRVVVzUTBGQlF6dFpRVU5xUWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNN1dVRkRjRU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eERRVUZETzFsQlEzQkRMRWxCUVVrc1EwRkJReXhoUVVGaExFTkJRVU1zVFVGQlRTeEZRVUZGTzJkQ1FVTjJRaXhIUVVGSExFVkJRVVU3YjBKQlEwUXNVVUZCVVN4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zVVVGQlVUdHZRa0ZEYkVNc1NVRkJTU3hGUVVGRkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1R0dlFrRkRNVUlzVFVGQlRTeEZRVUZGTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1RVRkJUVHR2UWtGRE9VSXNTVUZCU1N4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zU1VGQlNUdHBRa0ZETjBJN1lVRkRTaXhEUVVGRExFTkJRVU03VTBGRFRqdEJRVU5VTEV0QlFVczdPMGxCUlVRc1YwRkJWeXhGUVVGRkxGVkJRVlVzU1VGQlNTeEZRVUZGTEUxQlFVMHNSVUZCUlR0UlFVTnFReXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVsQlFVa3NUVUZCVFN4RFFVRkRMR2xDUVVGcFFpeERRVUZETEVOQlFVTTdVVUZET1VNc1NVRkJTU3hQUVVGUExFZEJRVWNzUTBGQlF5eEpRVUZKTEVkQlFVY3NUVUZCVFN4RFFVRkRMR2xFUVVGcFJDeERRVUZETEVsQlFVa3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJRenRSUVVNNVJpeFBRVUZQTEZkQlFWY3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU1zVlVGQlZTeFJRVUZSTEVWQlFVVTdXVUZETDBNc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF5eERRVUZETzFsQlEyaEVMR1ZCUVdVc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTXNXVUZCV1R0blFrRkRka01zUzBGQlN5eERRVUZETEVkQlFVY3NSMEZCUnl4RlFVRkZMRU5CUVVNN1owSkJRMllzUzBGQlN5eERRVUZETEU5QlFVOHNSMEZCUnl4UFFVRlBMRXRCUVVzc1NVRkJTU3hEUVVGRE8wRkJRMnBFTEdkQ1FVRm5RaXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZOQlFWTXNRMEZCUXpzN1FVRkZla01zWjBKQlFXZENMRkZCUVZFc1EwRkJReXhMUVVGTExFZEJRVWNzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZET3p0blFrRkZiRVFzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eERRVUZETEVWQlFVVTdhMEpCUTNSRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNjVUpCUVhGQ0xFZEJRVWNzU1VGQlNTeEhRVUZITEVkQlFVY3NSVUZCUlN4UlFVRlJMRU5CUVVNc1EwRkJRenRCUVVNdlJTeHBRa0ZCYVVJN08wRkJSV3BDTEdkQ1FVRm5RaXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03TzJkQ1FVVnVReXhQUVVGUExFTkJRVU1zVVVGQlVTeEZRVUZGTEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTNoQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTEVOQlFVTXNRMEZCUXp0TFFVTk9PMGxCUTBRc1YwRkJWeXhGUVVGRkxGZEJRVmM3U1VGRGVFSXNXVUZCV1N4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRemRDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRXRCUVVzc1EwRkJReXhIUVVGSExFbEJRVWtzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNN1VVRkRMME1zVDBGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRPMUZCUTJwQ0xFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPMEZCUTJoRExGRkJRVkVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZET3p0UlFVVnVReXhKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJUdFZRVU4wUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNN1UwRkRja003VVVGRFJDeEpRVUZKTEZGQlFWRXNSVUZCUlR0WlFVTldMRWxCUVVrc1QwRkJUeXhGUVVGRk8yZENRVU5VTEVsQlFVa3NRMEZCUXl4aFFVRmhMRU5CUVVNc2MwSkJRWE5DTEVkQlFVY3NVVUZCVVN4RFFVRkRMRWxCUVVrc1IwRkJSeXhqUVVGakxFTkJRVU1zUTBGQlF6dGhRVU12UlN4TlFVRk5PMmRDUVVOSUxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiVUpCUVcxQ0xFZEJRVWNzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRuUWtGRE0wUXNTVUZCU1N4RFFVRkRMRmRCUVZjc1EwRkJReXh6UWtGQmMwSXNSMEZCUnl4UlFVRlJMRU5CUVVNc1NVRkJTU3hIUVVGSExGbEJRVmtzUTBGQlF5eERRVUZETzJGQlF6TkZPMU5CUTBvN1FVRkRWQ3hMUVVGTE8wRkJRMHc3UVVGRFFUdEJRVU5CT3p0SlFVVkpMRzlDUVVGdlFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUTNKRExFbEJRVWtzVVVGQlVTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNTVUZCU1N4SlFVRkpMRVZCUVVVc1EwRkJRenRCUVVONFJTeFJRVUZSTEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1owSkJRV2RDTEVWQlFVVXNVVUZCVVN4RFFVRkRMRU5CUVVNN08xRkJSV3BFTEVsQlFVa3NUMEZCVHl4SFFVRkhMRTlCUVU4c1EwRkJReXhUUVVGVExFVkJRVVVzUTBGQlF5eFRRVUZUTEVOQlFVTTdVVUZETlVNc1NVRkJTU3haUVVGWkxFZEJRVWNzUlVGQlJTeERRVUZETzFGQlEzUkNMRWxCUVVrc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4TlFVRk5MRWxCUVVrc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4TlFVRk5MRVZCUVVVN1dVRkRjRVlzV1VGQldTeEhRVUZITEVOQlFVTXNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8xTkJRM0JETEUxQlFVMDdXVUZEU0N4WlFVRlpMRWRCUVVjc1kwRkJZeXhEUVVGRExFOUJRVThzUlVGQlJTeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1UwRkRla1E3VVVGRFJDeFBRVUZQTzFsQlEwZ3NVVUZCVVN4RlFVRkZMRkZCUVZFN1dVRkRiRUlzVTBGQlV5eEZRVUZGTEZsQlFWazdVMEZETVVJc1EwRkJRenRCUVVOV0xFdEJRVXM3TzBsQlJVUXNZVUZCWVN4RlFVRkZMRlZCUVZVc1UwRkJVeXhGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVWQlFVVTdVVUZETTBNc1NVRkJTU3hKUVVGSkxFTkJRVU1zVjBGQlZ5eEZRVUZGTEVsQlFVa3NTVUZCU1N4RFFVRkRMRmxCUVZrc1JVRkJSU3hGUVVGRk8xbEJRek5ETEVsQlFVa3NUMEZCVHl4SFFVRkhMRWxCUVVrc1YwRkJWeXhGUVVGRk8yZENRVU16UWl4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4RFFVRkRPMkZCUTJwRE8xbEJRMFFzUzBGQlN5eERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSenRuUWtGRFppeFRRVUZUTEVWQlFVVXNVMEZCVXp0blFrRkRjRUlzVTBGQlV5eEZRVUZGTEVsQlFVa3NTVUZCU1N4RlFVRkZMRU5CUVVNc1QwRkJUeXhGUVVGRk8yZENRVU12UWl4SlFVRkpMRVZCUVVVc1NVRkJTVHRoUVVOaUxFTkJRVU03V1VGRFJpeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVOQlFVTTdVMEZEZEVNN1MwRkRTanRKUVVORUxGTkJRVk1zUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlN4UlFVRlJMRVZCUVVVN1VVRkRhRU1zU1VGQlNTeGpRVUZqTEVsQlFVa3NZMEZCWXl4RFFVRkRMRTFCUVUwc1JVRkJSVHRaUVVONlF5eExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzWTBGQll5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRuUWtGRE5VTXNZMEZCWXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eEhRVUZITEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRemxETzFOQlEwbzdTMEZEU2p0SlFVTkVMRmRCUVZjc1JVRkJSU3hWUVVGVkxFdEJRVXNzUlVGQlJTeFJRVUZSTEVWQlFVVTdVVUZEY0VNc1NVRkJTU3hqUVVGakxFbEJRVWtzWTBGQll5eERRVUZETEUxQlFVMHNSVUZCUlR0WlFVTjZReXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1kwRkJZeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETEVWQlFVVXNSVUZCUlR0blFrRkROVU1zWTBGQll5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRXRCUVVzc1EwRkJReXhMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMkZCUTJ4RU8xTkJRMG83UzBGRFNqdEpRVU5FTEdGQlFXRXNSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVU3VVVGRGVFTXNTVUZCU1N4alFVRmpMRWxCUVVrc1kwRkJZeXhEUVVGRExFMUJRVTBzUlVGQlJUdFpRVU42UXl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NZMEZCWXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdG5Ra0ZETlVNc1kwRkJZeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4UFFVRlBMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzJGQlEzUkVPMU5CUTBvN1MwRkRTanRKUVVORUxHZENRVUZuUWl4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRMnBETEZOQlFWTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03UzBGRE0wSTdTVUZEUkN4dFFrRkJiVUlzUlVGQlJTeFZRVUZWTEU5QlFVOHNSVUZCUlR0UlFVTndReXhaUVVGWkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMHRCUXpsQ08wbEJRMFFzY1VKQlFYRkNMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRGRFTXNZMEZCWXl4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dExRVU5vUXp0SlFVTkVMRzFDUVVGdFFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUTNCRExGbEJRVmtzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRPVUk3U1VGRFJDd3lRa0ZCTWtJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU0xUXl4dlFrRkJiMElzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRkRU03U1VGRFJDeFhRVUZYTEVWQlFVVXNWMEZCVnp0UlFVTndRaXhQUVVGUExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdTMEZEZGtRN1NVRkRSQ3hUUVVGVExFVkJRVVVzVjBGQlZ6dFJRVU5zUWl4UFFVRlBMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeERRVUZETEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03UzBGRGNrUTdTVUZEUkN4WlFVRlpMRVZCUVVVc1UwRkJVeXhWUVVGVkxFVkJRVVU3VVVGREwwSXNTVUZCU1N4UFFVRlBMRlZCUVZVc1MwRkJTeXhYUVVGWExFdEJRVXNzU1VGQlNTeERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRWxCUVVrc1EwRkJReXhaUVVGWkxFVkJRVVVzUTBGQlF5eEZRVUZGTzFsQlEyeEdMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZWQlFWVXNSMEZCUnl4WlFVRlpMRWRCUVVjc1YwRkJWeXhEUVVGRE8xbEJRelZFTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2IwSkJRVzlDTEVOQlFVTXNRMEZCUXp0VFFVTjRRenRSUVVORUxFOUJRVThzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhEUVVGRExGbEJRVmtzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTjRSRHRKUVVORUxHRkJRV0VzUlVGQlJTeFZRVUZWTEVsQlFVa3NSVUZCUlR0UlFVTXpRaXhKUVVGSkxFbEJRVWtzUzBGQlN5eExRVUZMTEVWQlFVVTdXVUZEYUVJc1NVRkJTU3hYUVVGWExFZEJRVWM3WjBKQlEyUXNTMEZCU3l4RlFVRkZMRXRCUVVzc1EwRkJReXhMUVVGTE8wRkJRMnhETEdGQlFXRXNRMEZCUXpzN1FVRkZaQ3haUVVGWkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE96dFpRVVUxUWl4SlFVRkpMRU5CUVVNc1YwRkJWeXhEUVVGRExFbEJRVWtzUlVGQlJUdG5Ra0ZEYmtJc1YwRkJWeXhEUVVGRExFbEJRVWtzUjBGQlJ5eE5RVUZOTEVOQlFVTXNjVUpCUVhGQ0xFTkJRVU1zUTBGQlF6dEJRVU5xUlN4aFFVRmhPenRaUVVWRUxFbEJRVWtzVjBGQlZ5eERRVUZETEVsQlFVa3NSVUZCUlR0QlFVTnNReXhuUWtGQlowSXNTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFTkJRVU1zVjBGQlZ5eERRVUZETEVOQlFVTTdPMmRDUVVWc1F5eEpRVUZKTEZsQlFWa3NTVUZCU1N4WlFVRlpMRU5CUVVNc1RVRkJUU3hGUVVGRk8yOUNRVU55UXl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NXVUZCV1N4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdDNRa0ZETVVNc1dVRkJXU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenR4UWtGRGRFTTdhVUpCUTBvN1lVRkRTanRCUVVOaUxGTkJRVk03TzBGQlJWUXNVVUZCVVN4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGRkJRVkVzUTBGQlF6czdRVUZGYUVNc1VVRkJVU3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhEUVVGRExFTkJRVU03TzFGQlJYQkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zYlVKQlFXMUNMRVZCUVVVc1YwRkJWeXhEUVVGRExFTkJRVU03UVVGRGVrUXNTMEZCU3pzN1NVRkZSQ3haUVVGWkxFVkJRVVVzV1VGQldUdFJRVU4wUWl4SlFVRkpMRkZCUVZFc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEZGQlFWRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExGRkJRVkVzU1VGQlNTeEpRVUZKTEZGQlFWRXNRMEZCUXp0VlFVTjJSU3hqUVVGakxFVkJRVVVzU1VGQlNUdFRRVU55UWl4RFFVRkRMRU5CUVVNN1VVRkRTQ3hKUVVGSkxHOUNRVUZ2UWl4RFFVRkRMRTFCUVUwc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eEZRVUZGTEVWQlFVVTdXVUZETjBVc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFZRVUZWTEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVN1owSkJRekZETEc5Q1FVRnZRaXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZWQlFWVXNTVUZCU1N4RlFVRkZPMjlDUVVOd1F5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yOUNRVU16UWl4UFFVRlBMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03YVVKQlEzSkNMRVZCUVVVc1dVRkJXVHR2UWtGRFdDeFBRVUZQTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNN2FVSkJRM0pDTEVOQlFVTXNRMEZCUXp0aFFVTk9MRU5CUVVNc1EwRkJRenRUUVVOT0xFMUJRVTA3V1VGRFNDeFBRVUZQTEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03VTBGRGNFTTdRVUZEVkN4TFFVRkxPenRKUVVWRUxHOUNRVUZ2UWl4RlFVRkZMRmxCUVZrN1VVRkRPVUlzU1VGQlNTeFpRVUZaTEVkQlFVY3NXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dFJRVU5vUkN4SlFVRkpMRmxCUVZrc1JVRkJSVHRCUVVNeFFpeFpRVUZaTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZET3p0WlFVVnFReXhKUVVGSkxFdEJRVXNzUTBGQlF5eFJRVUZSTEVWQlFVVTdaMEpCUTJoQ0xFbEJRVWtzVjBGQlZ5eEhRVUZITEVsQlFVa3NVVUZCVVN4RlFVRkZMRU5CUVVNN1owSkJRMnBETEZkQlFWY3NRMEZCUXl4UlFVRlJMRWRCUVVjc1MwRkJTeXhEUVVGRExGRkJRVkVzUTBGQlF5eFJRVUZSTEVOQlFVTTdaMEpCUXk5RExGZEJRVmNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTMEZCU3l4RFFVRkRMRkZCUVZFc1EwRkJReXhsUVVGbExFTkJRVU03WjBKQlEzUkVMRXRCUVVzc1EwRkJReXhSUVVGUkxFZEJRVWNzVjBGQlZ5eERRVUZETzJGQlEyaERPMU5CUTBvc1RVRkJUVHRaUVVOSUxFdEJRVXNzUjBGQlJ6dG5Ra0ZEU2l4TlFVRk5MRVZCUVVVc1kwRkJZenRuUWtGRGRFSXNVMEZCVXl4RlFVRkZMRVZCUVVVN1lVRkRhRUlzUTBGQlF6dFRRVU5NTzFGQlEwUXNUMEZCVHl4TFFVRkxMRU5CUVVNN1FVRkRja0lzUzBGQlN6czdTVUZGUkN4clFrRkJhMElzUlVGQlJTeFZRVUZWTEZOQlFWTXNSVUZCUlR0UlFVTnlReXhKUVVGSkxGTkJRVk1zUlVGQlJUdFpRVU5ZTEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hGUVVGRkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJRenRUUVVNelJDeE5RVUZOTzFsQlEwZ3NXVUZCV1N4RFFVRkRMRlZCUVZVc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dFRRVU51UXp0QlFVTlVMRXRCUVVzN08wbEJSVVFzVFVGQlRTeEZRVUZGTEZsQlFWazdVVUZEYUVJc1NVRkJTU3hEUVVGRExHdENRVUZyUWl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8wdEJRMnhETzBGQlEwd3NRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWlVGQlpTeERRVUZETEVkQlFVY3NSVUZCUlN4TFFVRkxMRVZCUVVVN1NVRkRha01zUTBGQlF5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRmRCUVZjc1EwRkJReXhoUVVGaExFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdRVUZETjBNc1EwRkJRenM3UVVGRlJDeFRRVUZUTEZkQlFWY3NRMEZCUXl4SFFVRkhMRVZCUVVVc1MwRkJTeXhGUVVGRk8wbEJRemRDTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhYUVVGWExFTkJRVU1zV1VGQldTeEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRPMEZCUXpWRExFTkJRVU03TzBGQlJVUTdRVUZEUVR0QlFVTkJPenRIUVVWSE8wRkJRMGdzVTBGQlV5eHRRa0ZCYlVJc1EwRkJReXhIUVVGSExFVkJRVVU3U1VGRE9VSXNUMEZCVHl4RFFVRkRMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRMRTFCUVUwc1NVRkJTU3hEUVVGRE8xVkJRM0JETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzVDBGQlR5eERRVUZETzBGQlEyaEVMRU5CUVVNN08wRkJSVVE3TzBkQlJVYzdRVUZEU0N4VFFVRlRMR2RDUVVGblFpeERRVUZETEVkQlFVY3NSVUZCUlR0RlFVTTNRaXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEZsQlFWa3NTVUZCU1N4SFFVRkhMRU5CUVVNc1dVRkJXU3hEUVVGRExHRkJRV0VzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU1zWlVGQlpTeERRVUZETEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNMVJ5eERRVUZET3p0QlFVVkVPenRIUVVWSE8wRkJRMGdzVTBGQlV5eHBRa0ZCYVVJc1EwRkJReXhIUVVGSExFVkJRVVVzUjBGQlJ5eEZRVUZGTzBWQlEyNURMRWxCUVVrc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhyUWtGQmEwSXNSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJRenRGUVVOb1JTeEpRVUZKTEdGQlFXRXNTVUZCU1N4UFFVRlBMRXRCUVVzc1NVRkJTU3hKUVVGSkxFOUJRVThzUzBGQlN5eE5RVUZOTEVsQlFVa3NUMEZCVHl4UFFVRlBMRXRCUVVzc1YwRkJWeXhEUVVGRExFTkJRVU03UlVGREwwWXNUMEZCVHl4SlFVRkpMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzWVVGQllTeEpRVUZKTEcxQ1FVRnRRaXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzBGQlEzcEZMRU5CUVVNN08wRkJSVVFzU1VGQlNTeE5RVUZOTEVkQlFVY3NSVUZCUlN4RFFVRkRPenRCUVVWb1FpeFRRVUZUTEdsQ1FVRnBRaXhIUVVGSE96dEpRVVY2UWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdFJRVU53UXl4UlFVRlJMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zVlVGQlZTeEhRVUZITEVWQlFVVTdXVUZEYWtRc1NVRkJTU3hQUVVGUExFZEJRVWNzVlVGQlZTeERRVUZETEVWQlFVVTdaMEpCUTNaQ0xFbEJRVWtzUTBGQlF5eERRVUZETEZOQlFWTTdRVUZETDBJc2IwSkJRVzlDTEU5QlFVODdPMEZCUlROQ0xHZENRVUZuUWl4SlFVRkpMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhKUVVGSkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNSVUZCUlRzN2MwSkJSV3BFTEVsQlFVa3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNRMEZCUXp0elFrRkRiRU1zU1VGQlNTeFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRPM05DUVVONlF5eEpRVUZKTEVsQlFVa3NSMEZCUnp0M1FrRkRWQ3hQUVVGUExFVkJRVVVzU1VGQlNTeERRVUZETEc5Q1FVRnZRaXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTTdkVUpCUXpkRExFTkJRVU03UVVGRGVFSXNjMEpCUVhOQ0xFbEJRVWtzUzBGQlN5eERRVUZET3p0elFrRkZWaXhKUVVGSkxFZEJRVWNzU1VGQlNTeFhRVUZYTEVWQlFVVTdNRUpCUTNCQ0xHVkJRV1VzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE96QkNRVU5vUXl4TlFVRk5MRU5CUVVNc1NVRkJTU3hEUVVGRE96aENRVU5TTEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1RVRkJUVHM0UWtGRGFrSXNTMEZCU3l4RlFVRkZMRlZCUVZVc1EwRkJReXhaUVVGWk8ydERRVU14UWl4WFFVRlhMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0clEwRkROVUlzWlVGQlpTeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03SzBKQlEzQkRMRVZCUVVVc1IwRkJSeXhEUVVGRE96SkNRVU5XTEVOQlFVTXNRMEZCUXp0QlFVTTNRaXgxUWtGQmRVSTdPM05DUVVWRUxFbEJRVWtzUjBGQlJ5eEpRVUZKTEZWQlFWVXNSVUZCUlRzd1FrRkRia0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN09FSkJRM0JETEVsQlFVa3NUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFOUJRVThzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZPMnREUVVNdlFpeFpRVUZaTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzJ0RFFVTTVRaXhOUVVGTkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1EwRkJRenRyUTBGRGNFSXNUVUZCVFRzclFrRkRWRHN5UWtGRFNqc3dRa0ZEUkN4bFFVRmxMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXpzd1FrRkRha01zVjBGQlZ5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03UVVGRGRrUXNkVUpCUVhWQ096dHpRa0ZGUkN4SlFVRkpMR2xDUVVGcFFpeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1IwRkJSeXhEUVVGRExFVkJRVVU3ZDBKQlEzQkRMRWxCUVVrc1EwRkJReXhEUVVGRExFdEJRVXNzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZPekJDUVVOMlFpeEpRVUZKTEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1EwRkJReXhMUVVGTExFbEJRVWtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTTFSQ3g1UWtGQmVVSTdRVUZEZWtJN08zZENRVVYzUWl4SlFVRkpMRWRCUVVjc1MwRkJTeXhSUVVGUkxFVkJRVVU3TUVKQlEzQkNMRWxCUVVrc1EwRkJReXhWUVVGVkxFZEJRVWM3TkVKQlEyaENMRTlCUVU4c1IwRkJSeXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEV0QlFVczdORUpCUTNoQ0xGTkJRVk1zUlVGQlJTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRTlCUVU4N01rSkJRelZDTEVOQlFVTTdRVUZETlVJc2VVSkJRWGxDT3p0M1FrRkZSQ3hKUVVGSkxFOUJRVThzUjBGQlJ5eERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFVkJRVVVzUzBGQlN5eFBRVUZQTEVOQlFVTTdkMEpCUTNwRUxFbEJRVWtzUjBGQlJ5eExRVUZMTEU5QlFVOHNTVUZCU1N4UFFVRlBMRWxCUVVrc1VVRkJVU3hKUVVGSkxGRkJRVkVzUTBGQlF5eFRRVUZUTEV0QlFVc3NVVUZCVVN4RlFVRkZPelJDUVVNelJTeFJRVUZSTEVOQlFVTXNVMEZCVXl4SFFVRkhMRTlCUVU4c1EwRkJRenMwUWtGRE4wSXNUMEZCVHp0QlFVTnVReXg1UWtGQmVVSTdPM2RDUVVWRUxFbEJRVWtzUTBGQlF5eGhRVUZoTEVOQlFVTXNSMEZCUnl4RlFVRkZMRWxCUVVrc1JVRkJSU3hIUVVGSExFTkJRVU1zUTBGQlF6dDFRa0ZEY0VNN1FVRkRka0lzYVVKQlFXbENPenRCUVVWcVFpeGhRVUZoTEVOQlFVTTdRVUZEWkRzN1dVRkZXU3hEUVVGRExFbEJRVWtzUTBGQlF5eGpRVUZqTEVkQlFVY3NTVUZCU1N4RFFVRkRMR05CUVdNc1NVRkJTU3hGUVVGRkxFVkJRVVVzUjBGQlJ5eERRVUZETEVkQlFVY3NUMEZCVHl4RFFVRkRPMWxCUTJwRkxFOUJRVThzVDBGQlR5eERRVUZETzFOQlEyeENMRVZCUVVVc1RVRkJUU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN1FVRkROMElzUzBGQlN6czdTVUZGUkN4SlFVRkpMRk5CUVZNc1IwRkJSenRSUVVOYUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdEJRVU51UWl4TFFVRkxMRU5CUVVNN08wbEJSVVlzU1VGQlNTeFJRVUZSTEVkQlFVYzdVVUZEV0N4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVsQlFVazdVVUZEVml4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1FVRkRha0lzUzBGQlN5eERRVUZET3p0SlFVVkdMRk5CUVZNc1pVRkJaU3hGUVVGRkxFTkJRVU1zUlVGQlJUdFJRVU42UWl4SlFVRkpMRU5CUVVNc1EwRkJReXhUUVVGVE8wRkJRM1pDTEZsQlFWa3NUMEZCVHpzN1VVRkZXQ3hKUVVGSkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eEpRVUZKTEdsQ1FVRnBRaXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVWQlFVVXNWVUZCVlN4RFFVRkRMRVZCUVVVN1FVRkRjRVlzV1VGQldTeEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNc1MwRkJTeXhEUVVGRE8wRkJRelZDTzBGQlEwRTdPMWxCUlZrc1NVRkJTU3hUUVVGVExFTkJRVU1zWTBGQll5eERRVUZETEVOQlFVTXNRMEZCUXl4RlFVRkZPMmRDUVVNM1FpeERRVUZETEVkQlFVY3NVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8wRkJRMnBETEdGQlFXRTdPMWxCUlVRc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eFJRVUZSTEV0QlFVc3NRMEZCUXl4SlFVRkpMRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJTeERRVUZETEVWQlFVVTdaMEpCUTNKRExFTkJRVU1zUjBGQlJ5eE5RVUZOTEVOQlFVTXNXVUZCV1N4RFFVRkRMRU5CUVVNc1IwRkJSeXhGUVVGRkxFTkJRVU1zUTBGQlF6dEJRVU5vUkN4aFFVRmhMRTFCUVUwc1NVRkJTU3hEUVVGRExFTkJRVU1zVVVGQlVTeEpRVUZKTEZGQlFWRXNRMEZCUXl4alFVRmpMRU5CUVVNc1EwRkJReXhEUVVGRExFVkJRVVU3TzJkQ1FVVnFSQ3hEUVVGRExFZEJRVWNzVVVGQlVTeERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTI1Q0xFMUJRVTA3WjBKQlEwZ3NRMEZCUXl4SFFVRkhMRTFCUVUwc1EwRkJReXhaUVVGWkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdRVUZETTBNc1lVRkJZVHM3V1VGRlJDeEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRlZCUVZVc1JVRkJSVHRuUWtGRE0wSXNUMEZCVHl4RlFVRkZMRWxCUVVrc1EwRkJReXh2UWtGQmIwSXNRMEZCUXl4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRE8yZENRVU0xUXl4SFFVRkhMRVZCUVVVc1EwRkJRenRuUWtGRFRpeFRRVUZUTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhMUVVGTE8yZENRVU42UWl4TFFVRkxMRVZCUVVVc1EwRkJReXhEUVVGRExFMUJRVTBzUTBGQlF5eExRVUZMTEVkQlFVY3NRMEZCUXp0blFrRkRla0lzVDBGQlR5eEZRVUZGTEVOQlFVTXNRMEZCUXl4UFFVRlBPMkZCUTNKQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTzBGQlExUXNTMEZCU3pzN1FVRkZUQ3hKUVVGSkxGRkJRVkVzUTBGQlF5eG5Ra0ZCWjBJc1EwRkJReXhWUVVGVkxFVkJRVVVzWlVGQlpTeEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMEZCUTJwRk96dEpRVVZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMR05CUVdNc1IwRkJSeXhKUVVGSkxFTkJRVU1zWTBGQll5eEpRVUZKTEVWQlFVVXNSVUZCUlN4VlFVRlZMRU5CUVVNc1IwRkJSeXhsUVVGbExFTkJRVU03UVVGRGNFWXNRMEZCUXpzN1FVRkZSQ3hUUVVGVExHdENRVUZyUWl4RFFVRkRMRWxCUVVrc1JVRkJSVHRKUVVNNVFpeEpRVUZKTEVkQlFVY3NTVUZCU1N4RFFVRkRMRTlCUVU4c1EwRkJReXhOUVVGTkxFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRMRTFCUVUwc1JVRkJSU3hMUVVGTExFTkJRVU1zUTBGQlF6dEpRVU14UkN4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRmRCUVZjc1EwRkJRenRSUVVOcVJDeFBRVUZQTEVkQlFVY3NTMEZCU3l4RFFVRkRMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTTdTVUZETVVNc1QwRkJUeXhQUVVGUExFdEJRVXNzU1VGQlNTeEhRVUZITEVWQlFVVXNSMEZCUnl4clFrRkJhMElzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRExFdEJRVXNzUlVGQlJTeEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTNSR0xFTkJRVU03TzBGQlJVUXNVMEZCVXl4aFFVRmhMRWRCUVVjN1JVRkRka0lzU1VGQlNTeFJRVUZSTEVOQlFVTXNWVUZCVlN4SlFVRkpMRlZCUVZVc1JVRkJSVHRCUVVONlF5eEpRVUZKTEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1EwRkJReXhKUVVGSkxFTkJRVU1zV1VGQldUczdRVUZGYWtNc1VVRkJVU3hwUWtGQmFVSXNSVUZCUlN4RFFVRkRPenRSUVVWd1FpeEpRVUZKTEVsQlFVa3NRMEZCUXl4WFFVRlhMRVZCUVVVc1JVRkJSVHRaUVVOd1FpeEpRVUZKTEVOQlFVTXNZVUZCWVN4RFFVRkRMRTFCUVUwc1JVRkJSVHRuUWtGRGRrSXNSMEZCUnl4RlFVRkZPMjlDUVVORUxGRkJRVkVzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRkZCUVZFN2IwSkJRMnhETEVsQlFVa3NSVUZCUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFbEJRVWs3YjBKQlF6RkNMRTFCUVUwc1JVRkJSU3hOUVVGTkxFTkJRVU1zVVVGQlVTeERRVUZETEUxQlFVMDdiMEpCUXpsQ0xFbEJRVWtzUlVGQlJTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWxCUVVrN2FVSkJRemRDTzJGQlEwb3NRMEZCUXl4RFFVRkRPMU5CUTA0N1MwRkRTaXhEUVVGRExFTkJRVU03UjBGRFNqdEJRVU5JTEVOQlFVTTdPMEZCUlVRc1lVRkJZU3hGUVVGRkxFTkJRVU03UVVGRGFFSXNVVUZCVVN4RFFVRkRMR2RDUVVGblFpeERRVUZETEd0Q1FVRnJRaXhGUVVGRkxHRkJRV0VzUTBGQlF5eERRVUZET3p0QlFVVTNSQ3hOUVVGTkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hGUVVGRkxGbEJRVms3U1VGRE1VTXNTVUZCU1N4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRE8wRkJRMnhDTEVOQlFVTXNSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenM3UVVGRlZDeE5RVUZOTEVOQlFVTXNaMEpCUVdkQ0xFTkJRVU1zVDBGQlR5eEZRVUZGTEZWQlFWVXNSMEZCUnl4RlFVRkZPMGxCUXpWRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNaMEpCUVdkQ0xFZEJRVWNzUjBGQlJ5eERRVUZETEU5QlFVOHNSMEZCUnl4SFFVRkhMRWRCUVVjc1IwRkJSeXhEUVVGRExFZEJRVWNzUjBGQlJ5eEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRWxCUVVrc1IwRkJSeXhIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMEZCUTNCSExFTkJRVU1zUTBGQlF5eERRVUZET3p0QlFVVklMRTFCUVUwc1EwRkJReXhQUVVGUExFZEJRVWNzU1VGQlNTeERRVUZESWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaWRtRnlJRjhnUFNCeVpYRjFhWEpsS0NjdUwzVjBhV3h6SnlrN1hHNTJZWElnVUhKdmJXbHpaU0E5SUhKbGNYVnBjbVVvSjJWek5pMXdjbTl0YVhObEp5a3VVSEp2YldselpUdGNiblpoY2lCVGFXMTFiR0YwWlNBOUlISmxjWFZwY21Vb0p5NHZjMmx0ZFd4aGRHVW5LVHRjYm5aaGNpQnpaV3hsWTNSdmNrWnBibVJsY2lBOUlISmxjWFZwY21Vb0p5NHZjMlZzWldOMGIzSkdhVzVrWlhJbktUdGNiblpoY2lCVFpYUjBhVzVuY3lBOUlISmxjWFZwY21Vb0p5NHZjMlYwZEdsdVozTW5LVHRjYmx4dUx5OGdkbUZ5SUcxNVIyVnVaWEpoZEc5eUlEMGdibVYzSUVOemMxTmxiR1ZqZEc5eVIyVnVaWEpoZEc5eUtDazdYRzUyWVhJZ2FXMXdiM0owWVc1MFUzUmxjRXhsYm1kMGFDQTlJRFV3TUR0Y2JuWmhjaUJ6WVhabFNHRnVaR3hsY25NZ1BTQmJYVHRjYm5aaGNpQnlaWEJ2Y25SSVlXNWtiR1Z5Y3lBOUlGdGRPMXh1ZG1GeUlHeHZZV1JJWVc1a2JHVnljeUE5SUZ0ZE8xeHVkbUZ5SUhObGRIUnBibWR6VEc5aFpFaGhibVJzWlhKeklEMGdXMTA3WEc1Y2JtWjFibU4wYVc5dUlHZGxkRk5qWlc1aGNtbHZLRzVoYldVcElIdGNiaUFnSUNCeVpYUjFjbTRnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0Z0tISmxjMjlzZG1Vc0lISmxhbVZqZENrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYkc5aFpFaGhibVJzWlhKekxteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUhOMFlYUmxJRDBnZFhSdFpTNXpkR0YwWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzNSaGRHVXVjMk5sYm1GeWFXOXpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExuTmpaVzVoY21sdmMxdHBYUzV1WVcxbElEMDlQU0J1WVcxbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMyOXNkbVVvYzNSaGRHVXVjMk5sYm1GeWFXOXpXMmxkS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNiMkZrU0dGdVpHeGxjbk5iTUYwb2JtRnRaU3dnWm5WdVkzUnBiMjRnS0hKbGMzQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOdmJIWmxLSEpsYzNBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUtUdGNibjFjYm5aaGNpQjJZV3hwWkdGMGFXNW5JRDBnWm1Gc2MyVTdYRzVjYm5aaGNpQmxkbVZ1ZEhNZ1BTQmJYRzRnSUNBZ0oyTnNhV05ySnl4Y2JpQWdJQ0FuWm05amRYTW5MRnh1SUNBZ0lDZGliSFZ5Snl4Y2JpQWdJQ0FuWkdKc1kyeHBZMnNuTEZ4dUlDQWdJQzh2SUNka2NtRm5KeXhjYmlBZ0lDQXZMeUFuWkhKaFoyVnVkR1Z5Snl4Y2JpQWdJQ0F2THlBblpISmhaMnhsWVhabEp5eGNiaUFnSUNBdkx5QW5aSEpoWjI5MlpYSW5MRnh1SUNBZ0lDOHZJQ2RrY21GbmMzUmhjblFuTEZ4dUlDQWdJQzh2SUNkcGJuQjFkQ2NzWEc0Z0lDQWdKMjF2ZFhObFpHOTNiaWNzWEc0Z0lDQWdMeThnSjIxdmRYTmxiVzkyWlNjc1hHNGdJQ0FnSjIxdmRYTmxaVzUwWlhJbkxGeHVJQ0FnSUNkdGIzVnpaV3hsWVhabEp5eGNiaUFnSUNBbmJXOTFjMlZ2ZFhRbkxGeHVJQ0FnSUNkdGIzVnpaVzkyWlhJbkxGeHVJQ0FnSUNkdGIzVnpaWFZ3Snl4Y2JpQWdJQ0FuWTJoaGJtZGxKeXhjYmlBZ0lDQXZMeUFuY21WemFYcGxKeXhjYmlBZ0lDQXZMeUFuYzJOeWIyeHNKMXh1WFR0Y2JseHVablZ1WTNScGIyNGdaMlYwUTI5dVpHbDBhVzl1Y3loelkyVnVZWEpwYnl3Z1kyOXVaR2wwYVc5dVZIbHdaU2tnZTF4dUlDQjJZWElnYzJWMGRYQWdQU0J6WTJWdVlYSnBiMXRqYjI1a2FYUnBiMjVVZVhCbFhUdGNiaUFnZG1GeUlITmpaVzVoY21sdmN5QTlJSE5sZEhWd0lDWW1JSE5sZEhWd0xuTmpaVzVoY21sdmN6dGNiaUFnTHk4Z1ZFOUVUem9nUW5KbFlXc2diM1YwSUdsdWRHOGdhR1ZzY0dWeVhHNGdJR2xtSUNoelkyVnVZWEpwYjNNcElIdGNiaUFnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzVoYkd3b1h5NXRZWEFvYzJObGJtRnlhVzl6TENCbWRXNWpkR2x2YmlBb2MyTmxibUZ5YVc5T1lXMWxLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaMlYwVTJObGJtRnlhVzhvYzJObGJtRnlhVzlPWVcxbEtTNTBhR1Z1S0daMWJtTjBhVzl1SUNodmRHaGxjbE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUc5MGFHVnlVMk5sYm1GeWFXOGdQU0JLVTA5T0xuQmhjbk5sS0VwVFQwNHVjM1J5YVc1bmFXWjVLRzkwYUdWeVUyTmxibUZ5YVc4cEtUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlITmxkSFZ3UTI5dVpHbDBhVzl1Y3lodmRHaGxjbE5qWlc1aGNtbHZLUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNCMllYSWdkRzlTWlhSMWNtNGdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJRzkwYUdWeVUyTmxibUZ5YVc4dWMzUmxjSE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSdlVtVjBkWEp1TG5CMWMyZ29iM1JvWlhKVFkyVnVZWEpwYnk1emRHVndjMXRwWFNrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIwYjFKbGRIVnlianRjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOUtUdGNiaUFnSUNCOUtTazdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdWNtVnpiMngyWlNoYlhTazdYRzRnSUgxY2JuMWNibHh1Wm5WdVkzUnBiMjRnWjJWMFVISmxZMjl1WkdsMGFXOXVjeUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdjbVYwZFhKdUlHZGxkRU52Ym1ScGRHbHZibk1vYzJObGJtRnlhVzhzSUNkelpYUjFjQ2NwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJuWlhSUWIzTjBZMjl1WkdsMGFXOXVjeUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdjbVYwZFhKdUlHZGxkRU52Ym1ScGRHbHZibk1vYzJObGJtRnlhVzhzSUNkamJHVmhiblZ3SnlrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUY5amIyNWpZWFJUWTJWdVlYSnBiMU4wWlhCTWFYTjBjeWh6ZEdWd2N5a2dlMXh1SUNBZ0lIWmhjaUJ1WlhkVGRHVndjeUE5SUZ0ZE8xeHVJQ0FnSUhaaGNpQmpkWEp5Wlc1MFZHbHRaWE4wWVcxd095QXZMeUJwYm1sMFlXeHBlbVZrSUdKNUlHWnBjbk4wSUd4cGMzUWdiMllnYzNSbGNITXVYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FpQTlJREE3SUdvZ1BDQnpkR1Z3Y3k1c1pXNW5kR2c3SUdvckt5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pteGhkRk4wWlhCeklEMGdjM1JsY0hOYmFsMDdYRzRnSUNBZ0lDQWdJR2xtSUNocUlENGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdheUE5SURBN0lHc2dQQ0J6ZEdWd2N5NXNaVzVuZEdnN0lHc3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkR1Z3SUQwZ1pteGhkRk4wWlhCelcydGRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCa2FXWm1JRDBnYXlBK0lEQWdQeUJ6ZEdWd0xuUnBiV1ZUZEdGdGNDQXRJR1pzWVhSVGRHVndjMXRySUMwZ01WMHVkR2x0WlZOMFlXMXdJRG9nTlRBN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kzVnljbVZ1ZEZScGJXVnpkR0Z0Y0NBclBTQmthV1ptTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdac1lYUlRkR1Z3YzF0clhTNTBhVzFsVTNSaGJYQWdQU0JqZFhKeVpXNTBWR2x0WlhOMFlXMXdPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTNWeWNtVnVkRlJwYldWemRHRnRjQ0E5SUdac1lYUlRkR1Z3YzF0cVhTNTBhVzFsVTNSaGJYQTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnYm1WM1UzUmxjSE1nUFNCdVpYZFRkR1Z3Y3k1amIyNWpZWFFvWm14aGRGTjBaWEJ6S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHNWxkMU4wWlhCek8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCelpYUjFjRU52Ym1ScGRHbHZibk1nS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnZG1GeUlIQnliMjFwYzJWeklEMGdXMTA3WEc0Z0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdVlXeHNLRnRjYmlBZ0lDQWdJQ0FnWjJWMFVISmxZMjl1WkdsMGFXOXVjeWh6WTJWdVlYSnBieWtzWEc0Z0lDQWdJQ0FnSUdkbGRGQnZjM1JqYjI1a2FYUnBiMjV6S0hOalpXNWhjbWx2S1Z4dUlDQWdJRjBwTG5Sb1pXNG9ablZ1WTNScGIyNGdLSE4wWlhCQmNuSmhlWE1wSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE4wWlhCTWFYTjBjeUE5SUhOMFpYQkJjbkpoZVhOYk1GMHVZMjl1WTJGMEtGdHpZMlZ1WVhKcGJ5NXpkR1Z3YzEwc0lITjBaWEJCY25KaGVYTmJNVjBwTzF4dUlDQWdJQ0FnSUNCelkyVnVZWEpwYnk1emRHVndjeUE5SUY5amIyNWpZWFJUWTJWdVlYSnBiMU4wWlhCTWFYTjBjeWh6ZEdWd1RHbHpkSE1wTzF4dUlDQWdJSDBwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJ5ZFc1VGRHVndLSE5qWlc1aGNtbHZMQ0JwWkhnc0lIUnZVMnRwY0NrZ2UxeHVJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RTVlU1T1NVNUhYMU5VUlZBbktUdGNiaUFnSUNCMGIxTnJhWEFnUFNCMGIxTnJhWEFnZkh3Z2UzMDdYRzVjYmlBZ0lDQjJZWElnYzNSbGNDQTlJSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlRjA3WEc0Z0lDQWdkbUZ5SUhOMFlYUmxJRDBnZFhSdFpTNXpkR0YwWlR0Y2JpQWdJQ0JwWmlBb2MzUmxjQ0FtSmlCemRHRjBaUzV6ZEdGMGRYTWdQVDBnSjFCTVFWbEpUa2NuS1NCN1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5KMWJpNXpZMlZ1WVhKcGJ5QTlJSE5qWlc1aGNtbHZPMXh1SUNBZ0lDQWdJQ0J6ZEdGMFpTNXlkVzR1YzNSbGNFbHVaR1Y0SUQwZ2FXUjRPMXh1SUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oyeHZZV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNURzlqWVhScGIyNGdQU0J6ZEdWd0xtUmhkR0V1ZFhKc0xuQnliM1J2WTI5c0lDc2dYQ0l2TDF3aUlDc2djM1JsY0M1a1lYUmhMblZ5YkM1b2IzTjBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE5sWVhKamFDQTlJSE4wWlhBdVpHRjBZUzUxY213dWMyVmhjbU5vTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdoaGMyZ2dQU0J6ZEdWd0xtUmhkR0V1ZFhKc0xtaGhjMmc3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoelpXRnlZMmdnSmlZZ0lYTmxZWEpqYUM1amFHRnlRWFFvWENJL1hDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWaGNtTm9JRDBnWENJL1hDSWdLeUJ6WldGeVkyZzdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2FYTlRZVzFsVlZKTUlEMGdLR3h2WTJGMGFXOXVMbkJ5YjNSdlkyOXNJQ3NnWENJdkwxd2lJQ3NnYkc5allYUnBiMjR1YUc5emRDQXJJR3h2WTJGMGFXOXVMbk5sWVhKamFDa2dQVDA5SUNodVpYZE1iMk5oZEdsdmJpQXJJSE5sWVhKamFDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCM2FXNWtiM2N1Ykc5allYUnBiMjR1Y21Wd2JHRmpaU2h1WlhkTWIyTmhkR2x2YmlBcklHaGhjMmdnS3lCelpXRnlZMmdwTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6ZEdGMFpTNXpaWFIwYVc1bmN5NW5aWFFvWENKMlpYSmliM05sWENJcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHTnZibk52YkdVdWJHOW5LQ2hzYjJOaGRHbHZiaTV3Y205MGIyTnZiQ0FySUd4dlkyRjBhVzl1TG1odmMzUWdLeUJzYjJOaGRHbHZiaTV6WldGeVkyZ3BLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZMjl1YzI5c1pTNXNiMmNvS0hOMFpYQXVaR0YwWVM1MWNtd3VjSEp2ZEc5amIyd2dLeUJ6ZEdWd0xtUmhkR0V1ZFhKc0xtaHZjM1FnS3lCemRHVndMbVJoZEdFdWRYSnNMbk5sWVhKamFDa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QkpaaUIzWlNCb1lYWmxJRzV2ZENCamFHRnVaMlZrSUhSb1pTQmhZM1IxWVd3Z2JHOWpZWFJwYjI0c0lIUm9aVzRnZEdobElHeHZZMkYwYVc5dUxuSmxjR3hoWTJWY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhkcGJHd2dibTkwSUdkdklHRnVlWGRvWlhKbFhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2FYTlRZVzFsVlZKTUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkMmx1Wkc5M0xteHZZMkYwYVc5dUxuSmxiRzloWkNoMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMFpYQXVaWFpsYm5ST1lXMWxJRDA5SUNkMGFXMWxiM1YwSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBZWFJsTG1GMWRHOVNkVzRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeWRXNU9aWGgwVTNSbGNDaHpZMlZ1WVhKcGJ5d2dhV1I0TENCMGIxTnJhWEFzSUhOMFpYQXVaR0YwWVM1aGJXOTFiblFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR3h2WTJGMGIzSWdQU0J6ZEdWd0xtUmhkR0V1Ykc5allYUnZjanRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ6ZEdWd2N5QTlJSE5qWlc1aGNtbHZMbk4wWlhCek8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlIVnVhWEYxWlVsa0lEMGdaMlYwVlc1cGNYVmxTV1JHY205dFUzUmxjQ2h6ZEdWd0tUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdkSEo1SUhSdklHZGxkQ0J5YVdRZ2IyWWdkVzV1WldObGMzTmhjbmtnYzNSbGNITmNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2RHOVRhMmx3VzNWdWFYRjFaVWxrWFNBOVBTQW5kVzVrWldacGJtVmtKeUFtSmlCMWRHMWxMbk4wWVhSbExuTmxkSFJwYm1kekxtZGxkQ2hjSW5KMWJtNWxjaTV6Y0dWbFpGd2lLU0FoUFNBbmNtVmhiSFJwYldVbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJrYVdabU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhV2R1YjNKbElEMGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdvZ1BTQnpkR1Z3Y3k1c1pXNW5kR2dnTFNBeE95QnFJRDRnYVdSNE95QnFMUzBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdiM1JvWlhKVGRHVndJRDBnYzNSbGNITmJhbDA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHOTBhR1Z5Vlc1cGNYVmxTV1FnUFNCblpYUlZibWx4ZFdWSlpFWnliMjFUZEdWd0tHOTBhR1Z5VTNSbGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hWdWFYRjFaVWxrSUQwOVBTQnZkR2hsY2xWdWFYRjFaVWxrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVdScFptWXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmthV1ptSUQwZ0tHOTBhR1Z5VTNSbGNDNTBhVzFsVTNSaGJYQWdMU0J6ZEdWd0xuUnBiV1ZUZEdGdGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXZHViM0psSUQwZ0lXbHpTVzF3YjNKMFlXNTBVM1JsY0NodmRHaGxjbE4wWlhBcElDWW1JR1JwWm1ZZ1BDQnBiWEJ2Y25SaGJuUlRkR1Z3VEdWdVozUm9PMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNocGMwbHVkR1Z5WVdOMGFYWmxVM1JsY0NodmRHaGxjbE4wWlhBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXZHViM0psSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkRzlUYTJsd1czVnVhWEYxWlVsa1hTQTlJR2xuYm05eVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1YyVW5jbVVnYzJ0cGNIQnBibWNnZEdocGN5QmxiR1Z0Wlc1MFhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RHOVRhMmx3VzJkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2xkS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NuVnVUbVY0ZEZOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUN3Z2RHOVRhMmx3S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabWx1WkVWc1pXMWxiblJYYVhSb1RHOWpZWFJ2Y2loelkyVnVZWEpwYnl3Z2MzUmxjQ3dnYkc5allYUnZjaXdnWjJWMFZHbHRaVzkxZENoelkyVnVZWEpwYnl3Z2FXUjRLU2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9aV3hsY3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdWc1pTQTlJR1ZzWlhOYk1GMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2RHRm5UbUZ0WlNBOUlHVnNaUzUwWVdkT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzNWd2NHOXlkSE5KYm5CMWRFVjJaVzUwSUQwZ2RHRm5UbUZ0WlNBOVBUMGdKMmx1Y0hWMEp5QjhmQ0IwWVdkT1lXMWxJRDA5UFNBbmRHVjRkR0Z5WldFbklIeDhJR1ZzWlM1blpYUkJkSFJ5YVdKMWRHVW9KMk52Ym5SbGJuUmxaR2wwWVdKc1pTY3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFpsYm5SekxtbHVaR1Y0VDJZb2MzUmxjQzVsZG1WdWRFNWhiV1VwSUQ0OUlEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJRzl3ZEdsdmJuTWdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMFpYQXVaR0YwWVM1aWRYUjBiMjRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2Y0hScGIyNXpMbmRvYVdOb0lEMGdiM0IwYVc5dWN5NWlkWFIwYjI0Z1BTQnpkR1Z3TG1SaGRHRXVZblYwZEc5dU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdMeThnVTJWMElHVnNaVzFsYm5RZ2MzUmhkR1ZjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnpkR1Z3TG1SaGRHRXVkbUZzZFdVZ0lUMGdYQ0oxYm1SbFptbHVaV1JjSWlCOGZDQjBlWEJsYjJZZ2MzUmxjQzVrWVhSaExtRjBkSEpwWW5WMFpYTWdJVDBnWENKMWJtUmxabWx1WldSY0lpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUIwYjBGd2NHeDVJRDBnYzNSbGNDNWtZWFJoTG1GMGRISnBZblYwWlhNZ1B5QnpkR1Z3TG1SaGRHRXVZWFIwY21saWRYUmxjeUE2SUhzZ1hDSjJZV3gxWlZ3aU9pQnpkR1Z3TG1SaGRHRXVkbUZzZFdVZ2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCZkxtVjRkR1Z1WkNobGJHVXNJSFJ2UVhCd2JIa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1kyOXVjMjlzWlM1c2IyY29KMU5wYlhWc1lYUnBibWNnSnlBcklITjBaWEF1WlhabGJuUk9ZVzFsSUNzZ0p5QnZiaUJsYkdWdFpXNTBJQ2NzSUdWc1pTd2diRzlqWVhSdmNpNXpaV3hsWTNSdmNuTmJNRjBzSUZ3aUlHWnZjaUJ6ZEdWd0lGd2lJQ3NnYVdSNEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDaHpkR1Z3TG1WMlpXNTBUbUZ0WlNBOVBTQW5abTlqZFhNbklIeDhJSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2RpYkhWeUp5a2dKaVlnWld4bFczTjBaWEF1WlhabGJuUk9ZVzFsWFNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWc1pWdHpkR1Z3TG1WMlpXNTBUbUZ0WlYwb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRHVndMbVYyWlc1MFRtRnRaU0E5UFQwZ0oyTm9ZVzVuWlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDOHZJRVp2Y2lCaWNtOTNjMlZ5Y3lCMGFHRjBJSE4xY0hCdmNuUWdkR2hsSUdsdWNIVjBJR1YyWlc1MExseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4xY0hCdmNuUnpTVzV3ZFhSRmRtVnVkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtVjJaVzUwS0dWc1pTd2dKMmx1Y0hWMEp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNWxkbVZ1ZENobGJHVXNJQ2RqYUdGdVoyVW5LVHNnTHk4Z1ZHaHBjeUJ6YUc5MWJHUWdZbVVnWm1seVpXUWdZV1owWlhJZ1lTQmliSFZ5SUdWMlpXNTBMbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxXM04wWlhBdVpYWmxiblJPWVcxbFhTaGxiR1VzSUc5d2RHbHZibk1wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdWd0xtVjJaVzUwVG1GdFpTQTlQU0FuYTJWNWNISmxjM01uS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCclpYa2dQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0hOMFpYQXVaR0YwWVM1clpYbERiMlJsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdVMmx0ZFd4aGRHVXVhMlY1Wkc5M2JpaGxiR1VzSUd0bGVTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZOcGJYVnNZWFJsTG10bGVYQnlaWE56S0dWc1pTd2dhMlY1S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdVdWRtRnNkV1VnUFNCemRHVndMbVJoZEdFdWRtRnNkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtVjJaVzUwS0dWc1pTd2dKMk5vWVc1blpTY3BPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lGTnBiWFZzWVhSbExtdGxlWFZ3S0dWc1pTd2dhMlY1S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hOMWNIQnZjblJ6U1c1d2RYUkZkbVZ1ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1UybHRkV3hoZEdVdVpYWmxiblFvWld4bExDQW5hVzV3ZFhRbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0ozWmhiR2xrWVhSbEp5QW1KaUIxZEcxbExuTjBZWFJsTG5ObGRIUnBibWR6TG1kbGRDZ25kbVZ5WW05elpTY3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0NkV1lXeHBaR0YwWlRvZ0p5QXJJRXBUVDA0dWMzUnlhVzVuYVdaNUtHeHZZMkYwYjNJdWMyVnNaV04wYjNKektTQWdLeUJjSWlCamIyNTBZV2x1Y3lCMFpYaDBJQ2RjSWlBZ0t5QnpkR1Z3TG1SaGRHRXVkR1Y0ZENBcklGd2lKMXdpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBZWFJsTG1GMWRHOVNkVzRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjblZ1VG1WNGRGTjBaWEFvYzJObGJtRnlhVzhzSUdsa2VDd2dkRzlUYTJsd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5TENCbWRXNWpkR2x2YmlBb2NtVnpkV3gwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHVndMbVYyWlc1MFRtRnRaU0E5UFNBbmRtRnNhV1JoZEdVbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvWENKV1lXeHBaR0YwWlRvZ1hDSWdLeUJ5WlhOMWJIUXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1YzNSdmNGTmpaVzVoY21sdktHWmhiSE5sS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzBsdGNHOXlkR0Z1ZEZOMFpYQW9jM1JsY0NrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBSWEp5YjNJb1hDSkdZV2xzWldRZ2IyNGdjM1JsY0RvZ1hDSWdLeUJwWkhnZ0t5QmNJaUFnUlhabGJuUTZJRndpSUNzZ2MzUmxjQzVsZG1WdWRFNWhiV1VnS3lCY0lpQlNaV0Z6YjI0NklGd2lJQ3NnY21WemRXeDBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWMzUnZjRk5qWlc1aGNtbHZLR1poYkhObEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9KM1psY21KdmMyVW5LU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29jbVZ6ZFd4MEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tITjBZWFJsTG1GMWRHOVNkVzRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKMWJrNWxlSFJUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdzSUhSdlUydHBjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlYRzVjYm1aMWJtTjBhVzl1SUhkaGFYUkdiM0pCYm1kMWJHRnlLSEp2YjNSVFpXeGxZM1J2Y2lrZ2UxeHVJQ0FnSUhaaGNpQmxiQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9jbTl2ZEZObGJHVmpkRzl5S1R0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ0YzYVc1a2IzY3VZVzVuZFd4aGNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25ZVzVuZFd4aGNpQmpiM1ZzWkNCdWIzUWdZbVVnWm05MWJtUWdiMjRnZEdobElIZHBibVJ2ZHljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dGdVozVnNZWEl1WjJWMFZHVnpkR0ZpYVd4cGRIa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JoYm1kMWJHRnlMbWRsZEZSbGMzUmhZbWxzYVhSNUtHVnNLUzUzYUdWdVUzUmhZbXhsS0hKbGMyOXNkbVVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVdGdVozVnNZWEl1Wld4bGJXVnVkQ2hsYkNrdWFXNXFaV04wYjNJb0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjNKdmIzUWdaV3hsYldWdWRDQW9KeUFySUhKdmIzUlRaV3hsWTNSdmNpQXJJQ2NwSUdoaGN5QnVieUJwYm1wbFkzUnZjaTRuSUN0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNjZ2RHaHBjeUJ0WVhrZ2JXVmhiaUJwZENCcGN5QnViM1FnYVc1emFXUmxJRzVuTFdGd2NDNG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWVc1bmRXeGhjaTVsYkdWdFpXNTBLR1ZzS1M1cGJtcGxZM1J2Y2lncExtZGxkQ2duSkdKeWIzZHpaWEluS1M1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdWIzUnBabmxYYUdWdVRtOVBkWFJ6ZEdGdVpHbHVaMUpsY1hWbGMzUnpLSEpsYzI5c2RtVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR05oZEdOb0lDaGxjbklwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsYW1WamRDaGxjbklwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlNrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdselNXMXdiM0owWVc1MFUzUmxjQ2h6ZEdWd0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUhOMFpYQXVaWFpsYm5ST1lXMWxJQ0U5SUNkdGIzVnpaV3hsWVhabEp5QW1KbHh1SUNBZ0lDQWdJQ0FnSUNCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZ2ZFhRbklDWW1YRzRnSUNBZ0lDQWdJQ0FnSUhOMFpYQXVaWFpsYm5ST1lXMWxJQ0U5SUNkdGIzVnpaV1Z1ZEdWeUp5QW1KbHh1SUNBZ0lDQWdJQ0FnSUNCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBbmJXOTFjMlZ2ZG1WeUp5QW1KbHh1SUNBZ0lDQWdJQ0FnSUNCemRHVndMbVYyWlc1MFRtRnRaU0FoUFNBbllteDFjaWNnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMlp2WTNWekp6dGNibjFjYmx4dUx5b3FYRzRnS2lCU1pYUjFjbTV6SUhSeWRXVWdhV1lnZEdobElHZHBkbVZ1SUhOMFpYQWdhWE1nYzI5dFpTQnpiM0owSUc5bUlIVnpaWElnYVc1MFpYSmhZM1JwYjI1Y2JpQXFMMXh1Wm5WdVkzUnBiMjRnYVhOSmJuUmxjbUZqZEdsMlpWTjBaWEFvYzNSbGNDa2dlMXh1SUNBZ0lIWmhjaUJsZG5RZ1BTQnpkR1Z3TG1WMlpXNTBUbUZ0WlR0Y2JseHVJQ0FnSUM4cVhHNGdJQ0FnSUNBZ0x5OGdTVzUwWlhKbGMzUnBibWNnYm05MFpTd2daRzlwYm1jZ2RHaGxJR1p2Ykd4dmQybHVaeUIzWVhNZ1kyRjFjMmx1WnlCMGFHbHpJR1oxYm1OMGFXOXVJSFJ2SUhKbGRIVnliaUIxYm1SbFptbHVaV1F1WEc0Z0lDQWdJQ0FnY21WMGRYSnVYRzRnSUNBZ0lDQWdJQ0FnSUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWY0lpa2dJVDA5SURBZ2ZIeGNiaUFnSUNBZ0lDQWdJQ0FnWlhaMExtbHVaR1Y0VDJZb1hDSnRiM1Z6WldSdmQyNWNJaWtnUFQwOUlEQWdmSHhjYmlBZ0lDQWdJQ0FnSUNBZ1pYWjBMbWx1WkdWNFQyWW9YQ0p0YjNWelpYVndYQ0lwSUQwOVBTQXdPMXh1WEc0Z0lDQWdJQ0FnTHk4Z1NYUnpJR0psWTJGMWMyVWdkR2hsSUdOdmJtUnBkR2x2Ym5NZ2QyVnlaU0J1YjNRZ2IyNGdkR2hsSUhOaGJXVWdiR2x1WlNCaGN5QjBhR1VnY21WMGRYSnVJSE4wWVhSbGJXVnVkRnh1SUNBZ0lDb3ZYRzRnSUNBZ2NtVjBkWEp1SUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWY0lpa2dJVDA5SURBZ2ZId2daWFowTG1sdVpHVjRUMllvWENKdGIzVnpaV1J2ZDI1Y0lpa2dQVDA5SURBZ2ZId2daWFowTG1sdVpHVjRUMllvWENKdGIzVnpaWFZ3WENJcElEMDlQU0F3TzF4dWZWeHVYRzVtZFc1amRHbHZiaUJtYVc1a1JXeGxiV1Z1ZEZkcGRHaE1iMk5oZEc5eUtITmpaVzVoY21sdkxDQnpkR1Z3TENCc2IyTmhkRzl5TENCMGFXMWxiM1YwTENCMFpYaDBWRzlEYUdWamF5a2dlMXh1SUNBZ0lIWmhjaUJ6ZEdGeWRHVmtPMXh1SUNBZ0lISmxkSFZ5YmlCdVpYY2dVSEp2YldselpTaG1kVzVqZEdsdmJpQW9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQWdJR1oxYm1OMGFXOXVJSFJ5ZVVacGJtUW9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVhOMFlYSjBaV1FwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRnlkR1ZrSUQwZ2JtVjNJRVJoZEdVb0tTNW5aWFJVYVcxbEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQmxiR1Z6TzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdadmRXNWtWRzl2VFdGdWVTQTlJR1poYkhObE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHWnZkVzVrVm1Gc2FXUWdQU0JtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm1iM1Z1WkVScFptWmxjbVZ1ZEZSbGVIUWdQU0JtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpaV3hsWTNSdmNuTlViMVJsYzNRZ1BTQnNiMk5oZEc5eUxuTmxiR1ZqZEc5eWN5NXpiR2xqWlNnd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQjBaWGgwVkc5RGFHVmpheUE5SUhOMFpYQXVaR0YwWVM1MFpYaDBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR052YlhCaGNtbHpiMjRnUFNCemRHVndMbVJoZEdFdVkyOXRjR0Z5YVhOdmJpQjhmQ0JjSW1WeGRXRnNjMXdpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlZzWldOMGIzSnpWRzlVWlhOMExuVnVjMmhwWm5Rb0oxdGtZWFJoTFhWdWFYRjFaUzFwWkQxY0lpY2dLeUJzYjJOaGRHOXlMblZ1YVhGMVpVbGtJQ3NnSjF3aVhTY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnpaV3hsWTNSdmNuTlViMVJsYzNRdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MyVnNaV04wYjNJZ1BTQnpaV3hsWTNSdmNuTlViMVJsYzNSYmFWMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dselNXMXdiM0owWVc1MFUzUmxjQ2h6ZEdWd0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpXeGxZM1J2Y2lBclBTQmNJanAyYVhOcFlteGxYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWc1pYTWdQU0FrS0hObGJHVmpkRzl5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aV3hsY3k1c1pXNW5kR2dnUFQwZ01Ta2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIUmxlSFJVYjBOb1pXTnJJQ0U5SUNkMWJtUmxabWx1WldRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYm1WM1ZHVjRkQ0E5SUNRb1pXeGxjMXN3WFNrdWRHVjRkQ2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDaGpiMjF3WVhKcGMyOXVJRDA5UFNBblpYRjFZV3h6SnlBbUppQnVaWGRVWlhoMElEMDlQU0IwWlhoMFZHOURhR1ZqYXlrZ2ZIeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FvWTI5dGNHRnlhWE52YmlBOVBUMGdKMk52Ym5SaGFXNXpKeUFtSmlCdVpYZFVaWGgwTG1sdVpHVjRUMllvZEdWNGRGUnZRMmhsWTJzcElENDlJREFwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTkxYm1SV1lXeHBaQ0E5SUhSeWRXVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1p2ZFc1a1JHbG1abVZ5Wlc1MFZHVjRkQ0E5SUhSeWRXVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNWdVpGWmhiR2xrSUQwZ2RISjFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1ZzWlhNdVlYUjBjaWduWkdGMFlTMTFibWx4ZFdVdGFXUW5MQ0JzYjJOaGRHOXlMblZ1YVhGMVpVbGtLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb1pXeGxjeTVzWlc1bmRHZ2dQaUF4S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1p2ZFc1a1ZHOXZUV0Z1ZVNBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWm05MWJtUldZV3hwWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjMjlzZG1Vb1pXeGxjeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2x6U1cxd2IzSjBZVzUwVTNSbGNDaHpkR1Z3S1NBbUppQW9ibVYzSUVSaGRHVW9LUzVuWlhSVWFXMWxLQ2tnTFNCemRHRnlkR1ZrS1NBOElIUnBiV1Z2ZFhRZ0tpQTFLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMFZHbHRaVzkxZENoMGNubEdhVzVrTENBMU1DazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnlaWE4xYkhRZ1BTQmNJbHdpTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaG1iM1Z1WkZSdmIwMWhibmtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ6ZFd4MElEMGdKME52ZFd4a0lHNXZkQ0JtYVc1a0lHRndjSEp2Y0hKcFlYUmxJR1ZzWlcxbGJuUWdabTl5SUhObGJHVmpkRzl5Y3pvZ0p5QXJJRXBUVDA0dWMzUnlhVzVuYVdaNUtHeHZZMkYwYjNJdWMyVnNaV04wYjNKektTQXJJRndpSUdadmNpQmxkbVZ1ZENCY0lpQXJJSE4wWlhBdVpYWmxiblJPWVcxbElDc2dYQ0l1SUNCU1pXRnpiMjQ2SUVadmRXNWtJRlJ2YnlCTllXNTVJRVZzWlcxbGJuUnpYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNobWIzVnVaRVJwWm1abGNtVnVkRlJsZUhRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemRXeDBJRDBnSjBOdmRXeGtJRzV2ZENCbWFXNWtJR0Z3Y0hKdmNISnBZWFJsSUdWc1pXMWxiblFnWm05eUlITmxiR1ZqZEc5eWN6b2dKeUFySUVwVFQwNHVjM1J5YVc1bmFXWjVLR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpLU0FySUZ3aUlHWnZjaUJsZG1WdWRDQmNJaUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnWENJdUlDQlNaV0Z6YjI0NklGUmxlSFFnWkc5bGMyNG5kQ0J0WVhSamFDNGdJRnhjYmtWNGNHVmpkR1ZrT2x4Y2Jsd2lJQ3NnZEdWNGRGUnZRMmhsWTJzZ0t5QmNJbHhjYm1KMWRDQjNZWE5jWEc1Y0lpQXJJR1ZzWlhNdWRHVjRkQ2dwSUNzZ1hDSmNYRzVjSWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE4xYkhRZ1BTQW5RMjkxYkdRZ2JtOTBJR1pwYm1RZ1lYQndjbTl3Y21saGRHVWdaV3hsYldWdWRDQm1iM0lnYzJWc1pXTjBiM0p6T2lBbklDc2dTbE5QVGk1emRISnBibWRwWm5rb2JHOWpZWFJ2Y2k1elpXeGxZM1J2Y25NcElDc2dYQ0lnWm05eUlHVjJaVzUwSUZ3aUlDc2djM1JsY0M1bGRtVnVkRTVoYldVZ0t5QmNJaTRnSUZKbFlYTnZiam9nVG04Z1pXeGxiV1Z1ZEhNZ1ptOTFibVJjSWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnFaV04wS0hKbGMzVnNkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCMllYSWdjM0JsWldRZ1BTQjFkRzFsTG5OMFlYUmxMbk5sZEhScGJtZHpMbWRsZENoY0luSjFibTVsY2k1emNHVmxaRndpS1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3hwYldsMElEMGdhVzF3YjNKMFlXNTBVM1JsY0V4bGJtZDBhQ0F2SUNoemNHVmxaQ0E5UFQwZ0ozSmxZV3gwYVcxbEp5QS9JQ2N4SnlBNklITndaV1ZrS1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2RzYjJKaGJDNWhibWQxYkdGeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCM1lXbDBSbTl5UVc1bmRXeGhjaWduVzI1bkxXRndjRjBuS1M1MGFHVnVLR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzQmxaV1FnUFQwOUlDZHlaV0ZzZEdsdFpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb2RISjVSbWx1WkN3Z2RHbHRaVzkxZENrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzQmxaV1FnUFQwOUlDZG1ZWE4wWlhOMEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEhKNVJtbHVaQ2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMFZHbHRaVzkxZENoMGNubEdhVzVrTENCTllYUm9MbTFwYmloMGFXMWxiM1YwSUNvZ2MzQmxaV1FzSUd4cGJXbDBLU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE53WldWa0lEMDlQU0FuY21WaGJIUnBiV1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBWR2x0Wlc5MWRDaDBjbmxHYVc1a0xDQjBhVzFsYjNWMEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzQmxaV1FnUFQwOUlDZG1ZWE4wWlhOMEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ5ZVVacGJtUW9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBWR2x0Wlc5MWRDaDBjbmxHYVc1a0xDQk5ZWFJvTG0xcGJpaDBhVzFsYjNWMElDb2djM0JsWldRc0lHeHBiV2wwS1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5S1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWjJWMFZHbHRaVzkxZENoelkyVnVZWEpwYnl3Z2FXUjRLU0I3WEc0Z0lDQWdhV1lnS0dsa2VDQStJREFwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdTV1lnZEdobElIQnlaWFpwYjNWeklITjBaWEFnYVhNZ1lTQjJZV3hwWkdGMFpTQnpkR1Z3TENCMGFHVnVJR3AxYzNRZ2JXOTJaU0J2Yml3Z1lXNWtJSEJ5WlhSbGJtUWdhWFFnYVhOdUozUWdkR2hsY21WY2JpQWdJQ0FnSUNBZ0x5OGdUM0lnYVdZZ2FYUWdhWE1nWVNCelpYSnBaWE1nYjJZZ2EyVjVjeXdnZEdobGJpQm5iMXh1SUNBZ0lDQWdJQ0JwWmlBb2MyTmxibUZ5YVc4dWMzUmxjSE5iYVdSNElDMGdNVjB1WlhabGJuUk9ZVzFsSUQwOUlDZDJZV3hwWkdGMFpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBd08xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIaGRMblJwYldWVGRHRnRjQ0F0SUhOalpXNWhjbWx2TG5OMFpYQnpXMmxrZUNBdElERmRMblJwYldWVGRHRnRjRHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SURBN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUhKMWJrNWxlSFJUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdzSUhSdlUydHBjQ3dnZEdsdFpXOTFkQ2tnZTF4dUlDQWdJQzh2SUUxaGEyVWdjM1Z5WlNCM1pTQmhjbVZ1SjNRZ1oyOXBibWNnZEc4Z2IzWmxjbVpzYjNjZ2RHaGxJR05oYkd3Z2MzUmhZMnN1WEc0Z0lDQWdjMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZMbk4wWlhCekxteGxibWQwYUNBK0lDaHBaSGdnS3lBeEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NuVnVVM1JsY0NoelkyVnVZWEpwYnl3Z2FXUjRJQ3NnTVN3Z2RHOVRhMmx3S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWMzUnZjRk5qWlc1aGNtbHZLSFJ5ZFdVcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTd2dkR2x0Wlc5MWRDQjhmQ0F3S1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWm5KaFoyMWxiblJHY205dFUzUnlhVzVuS0hOMGNraFVUVXdwSUh0Y2JpQWdJQ0IyWVhJZ2RHVnRjQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KM1JsYlhCc1lYUmxKeWs3WEc0Z0lDQWdkR1Z0Y0M1cGJtNWxja2hVVFV3Z1BTQnpkSEpJVkUxTU8xeHVJQ0FnSUM4dklHTnZibk52YkdVdWJHOW5LSFJsYlhBdWFXNXVaWEpJVkUxTUtUdGNiaUFnSUNCeVpYUjFjbTRnZEdWdGNDNWpiMjUwWlc1MElEOGdkR1Z0Y0M1amIyNTBaVzUwSURvZ2RHVnRjRHRjYm4xY2JseHVablZ1WTNScGIyNGdaMlYwVlc1cGNYVmxTV1JHY205dFUzUmxjQ2h6ZEdWd0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUhOMFpYQWdKaVlnYzNSbGNDNWtZWFJoSUNZbUlITjBaWEF1WkdGMFlTNXNiMk5oZEc5eUlDWW1JSE4wWlhBdVpHRjBZUzVzYjJOaGRHOXlMblZ1YVhGMVpVbGtPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQm1hV3gwWlhKRmVIUnlZVXh2WVdSektITjBaWEJ6S1NCN1hHNGdJSFpoY2lCeVpYTjFiSFFnUFNCYlhUdGNiaUFnZG1GeUlITmxaVzVNYjJGa0lEMGdabUZzYzJVN1hHNGdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzNSbGNITXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0IyWVhJZ2FYTk1iMkZrSUQwZ2MzUmxjSE5iYVYwdVpYWmxiblJPWVcxbElEMDlQU0FuYkc5aFpDYzdYRzRnSUNBZ2FXWWdLQ0Z6WldWdVRHOWhaQ0I4ZkNBaGFYTk1iMkZrS1NCN1hHNGdJQ0FnSUNCeVpYTjFiSFF1Y0hWemFDaHpkR1Z3YzF0cFhTazdYRzRnSUNBZ0lDQnpaV1Z1VEc5aFpDQTlJSE5sWlc1TWIyRmtJSHg4SUdselRHOWhaRHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdjbVYwZFhKdUlISmxjM1ZzZER0Y2JuMDdYRzVjYm5aaGNpQm5kV2xrSUQwZ0tHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQm1kVzVqZEdsdmJpQnpOQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUUxaGRHZ3VabXh2YjNJb0tERWdLeUJOWVhSb0xuSmhibVJ2YlNncEtTQXFJREI0TVRBd01EQXBYRzRnSUNBZ0lDQWdJQ0FnSUNBdWRHOVRkSEpwYm1jb01UWXBYRzRnSUNBZ0lDQWdJQ0FnSUNBdWMzVmljM1J5YVc1bktERXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2N6UW9LU0FySUhNMEtDa2dLeUFuTFNjZ0t5QnpOQ2dwSUNzZ0p5MG5JQ3NnY3pRb0tTQXJJQ2N0SnlBclhHNGdJQ0FnSUNBZ0lDQWdJQ0J6TkNncElDc2dKeTBuSUNzZ2N6UW9LU0FySUhNMEtDa2dLeUJ6TkNncE8xeHVJQ0FnSUgwN1hHNTlLU2dwTzF4dVhHNTJZWElnYkdsemRHVnVaWEp6SUQwZ1cxMDdYRzUyWVhJZ2MzUmhkR1U3WEc1MllYSWdkWFJ0WlNBOUlIdGNiaUFnSUNCcGJtbDBPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6WTJWdVlYSnBieUE5SUdkbGRGQmhjbUZ0WlhSbGNrSjVUbUZ0WlNnbmRYUnRaVjl6WTJWdVlYSnBieWNwTzF4dUlDQWdJQ0FnSUNCcFppQW9jMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnSUNCc2IyTmhiRk4wYjNKaFoyVXVZMnhsWVhJb0tUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J6ZEdGMFpTQTlJSFYwYldVdWMzUmhkR1VnUFNCMWRHMWxMbXh2WVdSVGRHRjBaVVp5YjIxVGRHOXlZV2RsS0NrN1hHNGdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkSlRrbFVTVUZNU1ZwRlJDY3BPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIxZEcxbExteHZZV1JUWlhSMGFXNW5jeWdwTG5Sb1pXNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2h6WTJWdVlYSnBieWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMblJsYzNSVFpYSjJaWElnUFNCblpYUlFZWEpoYldWMFpYSkNlVTVoYldVb1hDSjFkRzFsWDNSbGMzUmZjMlZ5ZG1WeVhDSXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1aGRYUnZVblZ1SUQwZ2RISjFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eWRXNVRZMlZ1WVhKcGJ5aHpZMlZ1WVhKcGJ5azdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUxDQXhNREFwTzF4dUlDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmhkR1V1YzNSaGRIVnpJRDA5UFNCY0lsQk1RVmxKVGtkY0lpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6ZEdGMFpTNXlkVzR1YzJObGJtRnlhVzhzSUhOMFlYUmxMbkoxYmk1emRHVndTVzVrWlhncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNnaGMzUmhkR1V1YzNSaGRIVnpJSHg4SUhOMFlYUmxMbk4wWVhSMWN5QTlQVDBnSjBsT1NWUkpRVXhKV2tsT1J5Y3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoZEdVdWMzUmhkSFZ6SUQwZ1hDSk1UMEZFUlVSY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JpY205aFpHTmhjM1E2SUdaMWJtTjBhVzl1SUNobGRuUXNJR1YyZEVSaGRHRXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHeHBjM1JsYm1WeWN5QW1KaUJzYVhOMFpXNWxjbk11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR3hwYzNSbGJtVnljeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHeHBjM1JsYm1WeWMxdHBYU2hsZG5Rc0lHVjJkRVJoZEdFcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0J6ZEdGeWRGSmxZMjl5WkdsdVp6b2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9jM1JoZEdVdWMzUmhkSFZ6SUNFOUlDZFNSVU5QVWtSSlRrY25LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHRjBkWE1nUFNBblVrVkRUMUpFU1U1SEp6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbk4wWlhCeklEMGdXMTA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnloY0lsSmxZMjl5WkdsdVp5QlRkR0Z5ZEdWa1hDSXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzVpY205aFpHTmhjM1FvSjFKRlEwOVNSRWxPUjE5VFZFRlNWRVZFSnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxaMmx6ZEdWeVJYWmxiblFvWENKc2IyRmtYQ0lzSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWNtdzZJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NISnZkRzlqYjJ3NklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1d2NtOTBiMk52YkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhRzl6ZERvZ2QybHVaRzkzTG14dlkyRjBhVzl1TG1odmMzUXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObFlYSmphRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbk5sWVhKamFDeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYUdGemFEb2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxtaGhjMmhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J5ZFc1VFkyVnVZWEpwYnpvZ1puVnVZM1JwYjI0Z0tHNWhiV1VzSUdOdmJtWnBaeWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdkRzlTZFc0Z1BTQnVZVzFsSUh4OElIQnliMjF3ZENnblUyTmxibUZ5YVc4Z2RHOGdjblZ1SnlrN1hHNGdJQ0FnSUNBZ0lIWmhjaUJoZFhSdlVuVnVJRDBnSVc1aGJXVWdQeUJ3Y205dGNIUW9KMWR2ZFd4a0lIbHZkU0JzYVd0bElIUnZJSE4wWlhBZ2RHaHliM1ZuYUNCbFlXTm9JSE4wWlhBZ0tIbDhiaWsvSnlrZ0lUMGdKM2tuSURvZ2RISjFaVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR2RsZEZOalpXNWhjbWx2S0hSdlVuVnVLUzUwYUdWdUtHWjFibU4wYVc5dUlDaHpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MyTmxibUZ5YVc4Z1BTQktVMDlPTG5CaGNuTmxLRXBUVDA0dWMzUnlhVzVuYVdaNUtITmpaVzVoY21sdktTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCelpYUjFjRU52Ym1ScGRHbHZibk1vYzJObGJtRnlhVzhwTG5Sb1pXNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbkoxYmlBOUlIdDlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE4wWVhSbExtRjFkRzlTZFc0Z1BTQmhkWFJ2VW5WdUlEMDlQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUZ3aVVFeEJXVWxPUjF3aU8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMk5sYm1GeWFXOHVjM1JsY0hNZ1BTQm1hV3gwWlhKRmVIUnlZVXh2WVdSektITmpaVzVoY21sdkxuTjBaWEJ6S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gxZEcxbExuTjBZWFJsTG5ObGRIUnBibWR6TG1kbGRDaGNJblpsY21KdmMyVmNJaWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUzUmhjblJwYm1jZ1UyTmxibUZ5YVc4Z0oxd2lJQ3NnYm1GdFpTQXJJRndpSjF3aUxDQnpZMlZ1WVhKcGJ5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNWljbTloWkdOaGMzUW9KMUJNUVZsQ1FVTkxYMU5VUVZKVVJVUW5LVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKMWJsTjBaWEFvYzJObGJtRnlhVzhzSURBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lIMHNYRzRnSUNBZ2NuVnVUbVY0ZEZOMFpYQTZJSEoxYms1bGVIUlRkR1Z3TEZ4dUlDQWdJSE4wYjNCVFkyVnVZWEpwYnpvZ1puVnVZM1JwYjI0Z0tITjFZMk5sYzNNcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhOalpXNWhjbWx2SUQwZ2MzUmhkR1V1Y25WdUlDWW1JSE4wWVhSbExuSjFiaTV6WTJWdVlYSnBienRjYmlBZ0lDQWdJQ0FnWkdWc1pYUmxJSE4wWVhSbExuSjFianRjYmlBZ0lDQWdJQ0FnYzNSaGRHVXVjM1JoZEhWeklEMGdYQ0pNVDBGRVJVUmNJanRjYmlBZ0lDQWdJQ0FnZFhSdFpTNWljbTloWkdOaGMzUW9KMUJNUVZsQ1FVTkxYMU5VVDFCUVJVUW5LVHRjYmx4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlM1emRHRjBaUzV6WlhSMGFXNW5jeTVuWlhRb1hDSjJaWEppYjNObFhDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WlhCdmNuUk1iMmNvWENKVGRHOXdjR2x1WnlCVFkyVnVZWEpwYjF3aUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0JwWmlBb2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkV05qWlhOektTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1eVpYQnZjblJUZFdOalpYTnpLRndpVzFOVlEwTkZVMU5kSUZOalpXNWhjbWx2SUNkY0lpQXJJSE5qWlc1aGNtbHZMbTVoYldVZ0t5QmNJaWNnUTI5dGNHeGxkR1ZrSVZ3aUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29YQ0pUZEc5d2NHbHVaeUJ2YmlCd1lXZGxJRndpSUNzZ2QybHVaRzkzTG14dlkyRjBhVzl1TG1oeVpXWXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owUlhKeWIzSW9YQ0piUmtGSlRGVlNSVjBnVTJObGJtRnlhVzhnSjF3aUlDc2djMk5sYm1GeWFXOHVibUZ0WlNBcklGd2lKeUJUZEc5d2NHVmtJVndpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCRGNtVmhkR1Z6SUdFZ2RHVnRjRzl5WVhKNUlHVnNaVzFsYm5RZ2JHOWpZWFJ2Y2l3Z1ptOXlJSFZ6WlNCM2FYUm9JR1pwYm1Gc2FYcGxURzlqWVhSdmNseHVJQ0FnSUNBcUwxeHVJQ0FnSUdOeVpXRjBaVVZzWlcxbGJuUk1iMk5oZEc5eU9pQm1kVzVqZEdsdmJpQW9aV3hsYldWdWRDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2RXNXBjWFZsU1dRZ1BTQmxiR1Z0Wlc1MExtZGxkRUYwZEhKcFluVjBaU2hjSW1SaGRHRXRkVzVwY1hWbExXbGtYQ0lwSUh4OElHZDFhV1FvS1R0Y2JpQWdJQ0FnSUNBZ1pXeGxiV1Z1ZEM1elpYUkJkSFJ5YVdKMWRHVW9YQ0prWVhSaExYVnVhWEYxWlMxcFpGd2lMQ0IxYm1seGRXVkpaQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2RtRnlJR1ZzWlVoMGJXd2dQU0JsYkdWdFpXNTBMbU5zYjI1bFRtOWtaU2dwTG05MWRHVnlTRlJOVER0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1ZzWlZObGJHVmpkRzl5Y3lBOUlGdGRPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pXeGxiV1Z1ZEM1MFlXZE9ZVzFsTG5SdlZYQndaWEpEWVhObEtDa2dQVDBnSjBKUFJGa25JSHg4SUdWc1pXMWxiblF1ZEdGblRtRnRaUzUwYjFWd2NHVnlRMkZ6WlNncElEMDlJQ2RJVkUxTUp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pXeGxVMlZzWldOMGIzSnpJRDBnVzJWc1pXMWxiblF1ZEdGblRtRnRaVjA3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmxiR1ZUWld4bFkzUnZjbk1nUFNCelpXeGxZM1J2Y2tacGJtUmxjaWhsYkdWdFpXNTBMQ0JrYjJOMWJXVnVkQzVpYjJSNUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RXNXBjWFZsU1dRNklIVnVhWEYxWlVsa0xGeHVJQ0FnSUNBZ0lDQWdJQ0FnYzJWc1pXTjBiM0p6T2lCbGJHVlRaV3hsWTNSdmNuTmNiaUFnSUNBZ0lDQWdmVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjbVZuYVhOMFpYSkZkbVZ1ZERvZ1puVnVZM1JwYjI0Z0tHVjJaVzUwVG1GdFpTd2daR0YwWVN3Z2FXUjRLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDFkRzFsTG1selVtVmpiM0prYVc1bktDa2dmSHdnZFhSdFpTNXBjMVpoYkdsa1lYUnBibWNvS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCcFpIZ2dQVDBnSjNWdVpHVm1hVzVsWkNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaSGdnUFNCMWRHMWxMbk4wWVhSbExuTjBaWEJ6TG14bGJtZDBhRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbk4wWlhCelcybGtlRjBnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYWmxiblJPWVcxbE9pQmxkbVZ1ZEU1aGJXVXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2x0WlZOMFlXMXdPaUJ1WlhjZ1JHRjBaU2dwTG1kbGRGUnBiV1VvS1N4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCa1lYUmhPaUJrWVhSaFhHNGdJQ0FnSUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdkWFJ0WlM1aWNtOWhaR05oYzNRb0owVldSVTVVWDFKRlIwbFRWRVZTUlVRbktUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2NtVndiM0owVEc5bk9pQm1kVzVqZEdsdmJpQW9iRzluTENCelkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvY21Wd2IzSjBTR0Z1Wkd4bGNuTWdKaVlnY21Wd2IzSjBTR0Z1Wkd4bGNuTXViR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ3YjNKMFNHRnVaR3hsY25OYmFWMHViRzluS0d4dlp5d2djMk5sYm1GeWFXOHNJSFYwYldVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0J5WlhCdmNuUkZjbkp2Y2pvZ1puVnVZM1JwYjI0Z0tHVnljbTl5TENCelkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvY21Wd2IzSjBTR0Z1Wkd4bGNuTWdKaVlnY21Wd2IzSjBTR0Z1Wkd4bGNuTXViR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ3YjNKMFNHRnVaR3hsY25OYmFWMHVaWEp5YjNJb1pYSnliM0lzSUhOalpXNWhjbWx2TENCMWRHMWxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2NtVndiM0owVTNWalkyVnpjem9nWm5WdVkzUnBiMjRnS0cxbGMzTmhaMlVzSUhOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h5WlhCdmNuUklZVzVrYkdWeWN5QW1KaUJ5WlhCdmNuUklZVzVrYkdWeWN5NXNaVzVuZEdncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2NtVndiM0owU0dGdVpHeGxjbk11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWEJ2Y25SSVlXNWtiR1Z5YzF0cFhTNXpkV05qWlhOektHMWxjM05oWjJVc0lITmpaVzVoY21sdkxDQjFkRzFsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdjbVZuYVhOMFpYSk1hWE4wWlc1bGNqb2dablZ1WTNScGIyNGdLR2hoYm1Sc1pYSXBJSHRjYmlBZ0lDQWdJQ0FnYkdsemRHVnVaWEp6TG5CMWMyZ29hR0Z1Wkd4bGNpazdYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpXZHBjM1JsY2xOaGRtVklZVzVrYkdWeU9pQm1kVzVqZEdsdmJpQW9hR0Z1Wkd4bGNpa2dlMXh1SUNBZ0lDQWdJQ0J6WVhabFNHRnVaR3hsY25NdWNIVnphQ2hvWVc1a2JHVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISmxaMmx6ZEdWeVVtVndiM0owU0dGdVpHeGxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2NtVndiM0owU0dGdVpHeGxjbk11Y0hWemFDaG9ZVzVrYkdWeUtUdGNiaUFnSUNCOUxGeHVJQ0FnSUhKbFoybHpkR1Z5VEc5aFpFaGhibVJzWlhJNklHWjFibU4wYVc5dUlDaG9ZVzVrYkdWeUtTQjdYRzRnSUNBZ0lDQWdJR3h2WVdSSVlXNWtiR1Z5Y3k1d2RYTm9LR2hoYm1Sc1pYSXBPMXh1SUNBZ0lIMHNYRzRnSUNBZ2NtVm5hWE4wWlhKVFpYUjBhVzVuYzB4dllXUklZVzVrYkdWeU9pQm1kVzVqZEdsdmJpQW9hR0Z1Wkd4bGNpa2dlMXh1SUNBZ0lDQWdJQ0J6WlhSMGFXNW5jMHh2WVdSSVlXNWtiR1Z5Y3k1d2RYTm9LR2hoYm1Sc1pYSXBPMXh1SUNBZ0lIMHNYRzRnSUNBZ2FYTlNaV052Y21ScGJtYzZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZFhSdFpTNXpkR0YwWlM1emRHRjBkWE11YVc1a1pYaFBaaWhjSWxKRlEwOVNSRWxPUjF3aUtTQTlQVDBnTUR0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2x6VUd4aGVXbHVaem9nWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMWRHMWxMbk4wWVhSbExuTjBZWFIxY3k1cGJtUmxlRTltS0Z3aVVFeEJXVWxPUjF3aUtTQTlQVDBnTUR0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2x6Vm1Gc2FXUmhkR2x1WnpvZ1puVnVZM1JwYjI0b2RtRnNhV1JoZEdsdVp5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhaaGJHbGtZWFJwYm1jZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUNZbUlDaDFkRzFsTG1selVtVmpiM0prYVc1bktDa2dmSHdnZFhSdFpTNXBjMVpoYkdsa1lYUnBibWNvS1NrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjM1JoZEdVdWMzUmhkSFZ6SUQwZ2RtRnNhV1JoZEdsdVp5QS9JRndpVmtGTVNVUkJWRWxPUjF3aUlEb2dYQ0pTUlVOUFVrUkpUa2RjSWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZFdRVXhKUkVGVVNVOU9YME5JUVU1SFJVUW5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZFhSdFpTNXpkR0YwWlM1emRHRjBkWE11YVc1a1pYaFBaaWhjSWxaQlRFbEVRVlJKVGtkY0lpa2dQVDA5SURBN1hHNGdJQ0FnZlN4Y2JpQWdJQ0J6ZEc5d1VtVmpiM0prYVc1bk9pQm1kVzVqZEdsdmJpQW9hVzVtYnlrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYVc1bWJ5QWhQVDBnWm1Gc2MyVXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ1WlhkVFkyVnVZWEpwYnlBOUlIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR1Z3Y3pvZ2MzUmhkR1V1YzNSbGNITmNiaUFnSUNBZ0lDQWdJQ0FnSUgwN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUY4dVpYaDBaVzVrS0c1bGQxTmpaVzVoY21sdkxDQnBibVp2S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRnVaWGRUWTJWdVlYSnBieTV1WVcxbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdibVYzVTJObGJtRnlhVzh1Ym1GdFpTQTlJSEJ5YjIxd2RDZ25SVzUwWlhJZ2MyTmxibUZ5YVc4Z2JtRnRaU2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYm1WM1UyTmxibUZ5YVc4dWJtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbk5qWlc1aGNtbHZjeTV3ZFhOb0tHNWxkMU5qWlc1aGNtbHZLVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpZWFpsU0dGdVpHeGxjbk1nSmlZZ2MyRjJaVWhoYm1Sc1pYSnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElITmhkbVZJWVc1a2JHVnljeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyRjJaVWhoYm1Sc1pYSnpXMmxkS0c1bGQxTmpaVzVoY21sdkxDQjFkRzFsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJQ2RNVDBGRVJVUW5PMXh1WEc0Z0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RTUlVOUFVrUkpUa2RmVTFSUFVGQkZSQ2NwTzF4dVhHNGdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVVtVmpiM0prYVc1bklGTjBiM0J3WldSY0lpd2dibVYzVTJObGJtRnlhVzhwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0JzYjJGa1UyVjBkR2x1WjNNNklHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlITmxkSFJwYm1keklEMGdkWFJ0WlM1emRHRjBaUzV6WlhSMGFXNW5jeUE5SUhWMGJXVXVjM1JoZEdVdWMyVjBkR2x1WjNNZ2ZId2dibVYzSUZObGRIUnBibWR6S0h0Y2JpQWdJQ0FnSUNBZ0lDQmNJbkoxYm01bGNpNXpjR1ZsWkZ3aU9pQmNJakV3WENKY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJR2xtSUNoelpYUjBhVzVuYzB4dllXUklZVzVrYkdWeWN5NXNaVzVuZEdnZ1BpQXdJQ1ltSUNGMWRHMWxMbWx6VW1WamIzSmthVzVuS0NrZ0ppWWdJWFYwYldVdWFYTlFiR0Y1YVc1bktDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCdVpYY2dVSEp2YldselpTaG1kVzVqZEdsdmJpQW9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlYwZEdsdVozTk1iMkZrU0dGdVpHeGxjbk5iTUYwb1puVnVZM1JwYjI0Z0tISmxjM0FwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlYwZEdsdVozTXVjMlYwUkdWbVlYVnNkSE1vY21WemNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMyOXNkbVVvYzJWMGRHbHVaM01wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwc0lHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNoelpYUjBhVzVuY3lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9jMlYwZEdsdVozTXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmx4dUlDQWdJR3h2WVdSVGRHRjBaVVp5YjIxVGRHOXlZV2RsT2lCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCMWRHMWxVM1JoZEdWVGRISWdQU0JzYjJOaGJGTjBiM0poWjJVdVoyVjBTWFJsYlNnbmRYUnRaU2NwTzF4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlZOMFlYUmxVM1J5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTQTlJRXBUVDA0dWNHRnljMlVvZFhSdFpWTjBZWFJsVTNSeUtUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExuTmxkSFJwYm1kektTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUc1bGQxTmxkSFJwYm1keklEMGdibVYzSUZObGRIUnBibWR6S0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JtVjNVMlYwZEdsdVozTXVjMlYwZEdsdVozTWdQU0J6ZEdGMFpTNXpaWFIwYVc1bmN5NXpaWFIwYVc1bmN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnVaWGRUWlhSMGFXNW5jeTV6WlhSMGFXNW5jeUE5SUhOMFlYUmxMbk5sZEhScGJtZHpMbVJsWm1GMWJIUlRaWFIwYVc1bmN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1elpYUjBhVzVuY3lBOUlHNWxkMU5sZEhScGJtZHpPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVWdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRIVnpPaUJjSWtsT1NWUkpRVXhKV2tsT1Ixd2lMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5qWlc1aGNtbHZjem9nVzExY2JpQWdJQ0FnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhOMFlYUmxPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnpZWFpsVTNSaGRHVlViMU4wYjNKaFoyVTZJR1oxYm1OMGFXOXVJQ2gxZEcxbFUzUmhkR1VwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFYwYldWVGRHRjBaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdiRzlqWVd4VGRHOXlZV2RsTG5ObGRFbDBaVzBvSjNWMGJXVW5MQ0JLVTA5T0xuTjBjbWx1WjJsbWVTaDFkRzFsVTNSaGRHVXBLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHeHZZMkZzVTNSdmNtRm5aUzV5WlcxdmRtVkpkR1Z0S0NkMWRHMWxKeWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnZFc1c2IyRmtPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIVjBiV1V1YzJGMlpWTjBZWFJsVkc5VGRHOXlZV2RsS0hOMFlYUmxLVHRjYmlBZ0lDQjlYRzU5TzF4dVhHNW1kVzVqZEdsdmJpQjBiMmRuYkdWSWFXZG9iR2xuYUhRb1pXeGxMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lDUW9aV3hsS1M1MGIyZG5iR1ZEYkdGemN5Z25kWFJ0WlMxMlpYSnBabmtuTENCMllXeDFaU2s3WEc1OVhHNWNibVoxYm1OMGFXOXVJSFJ2WjJkc1pWSmxZV1I1S0dWc1pTd2dkbUZzZFdVcElIdGNiaUFnSUNBa0tHVnNaU2t1ZEc5bloyeGxRMnhoYzNNb0ozVjBiV1V0Y21WaFpIa25MQ0IyWVd4MVpTazdYRzU5WEc1Y2JpOHFLbHh1SUNvZ1NXWWdlVzkxSUdOc2FXTnJJRzl1SUdFZ2MzQmhiaUJwYmlCaElHeGhZbVZzTENCMGFHVWdjM0JoYmlCM2FXeHNJR05zYVdOckxGeHVJQ29nZEdobGJpQjBhR1VnWW5KdmQzTmxjaUIzYVd4c0lHWnBjbVVnZEdobElHTnNhV05ySUdWMlpXNTBJR1p2Y2lCMGFHVWdhVzV3ZFhRZ1kyOXVkR0ZwYm1Wa0lIZHBkR2hwYmlCMGFHVWdjM0JoYml4Y2JpQXFJRk52TENCM1pTQnZibXg1SUhkaGJuUWdkRzhnZEhKaFkyc2dkR2hsSUdsdWNIVjBJR05zYVdOcmN5NWNiaUFxTDF4dVpuVnVZM1JwYjI0Z2FYTk9iM1JKYmt4aFltVnNUM0pXWVd4cFpDaGxiR1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdKQ2hsYkdVcExuQmhjbVZ1ZEhNb0oyeGhZbVZzSnlrdWJHVnVaM1JvSUQwOUlEQWdmSHhjYmlBZ0lDQWdJQ0FnSUNCbGJHVXVibTlrWlU1aGJXVXVkRzlNYjNkbGNrTmhjMlVvS1NBOVBTQW5hVzV3ZFhRbk8xeHVmVnh1WEc0dktpcGNiaUFxSUZKbGRIVnlibk1nZEhKMVpTQnBaaUJwZENCcGN5QmhiaUJsYkdWdFpXNTBJSFJvWVhRZ2MyaHZkV3hrSUdKbElHbG5ibTl5WldSY2JpQXFMMXh1Wm5WdVkzUnBiMjRnYVhOSloyNXZjbVZrUld4bGJXVnVkQ2hsYkdVcElIdGNiaUFnY21WMGRYSnVJQ0ZsYkdVdWFHRnpRWFIwY21saWRYUmxJSHg4SUdWc1pTNW9ZWE5CZEhSeWFXSjFkR1VvSjJSaGRHRXRhV2R1YjNKbEp5a2dmSHdnSkNobGJHVXBMbkJoY21WdWRITW9YQ0piWkdGMFlTMXBaMjV2Y21WZFhDSXBMbXhsYm1kMGFDQStJREE3WEc1OVhHNWNiaThxS2x4dUlDb2dVbVYwZFhKdWN5QjBjblZsSUdsbUlIUm9aU0JuYVhabGJpQmxkbVZ1ZENCemFHOTFiR1FnWW1VZ2NtVmpiM0prWldRZ2IyNGdkR2hsSUdkcGRtVnVJR1ZzWlcxbGJuUmNiaUFxTDF4dVpuVnVZM1JwYjI0Z2MyaHZkV3hrVW1WamIzSmtSWFpsYm5Rb1pXeGxMQ0JsZG5RcElIdGNiaUFnZG1GeUlITmxkSFJwYm1jZ1BTQjFkRzFsTG5OMFlYUmxMbk5sZEhScGJtZHpMbWRsZENoY0luSmxZMjl5WkdWeUxtVjJaVzUwY3k1Y0lpQXJJR1YyZENrN1hHNGdJSFpoY2lCcGMxTmxkSFJwYm1kVWNuVmxJRDBnS0hObGRIUnBibWNnUFQwOUlIUnlkV1VnZkh3Z2MyVjBkR2x1WnlBOVBUMGdKM1J5ZFdVbklIeDhJSFI1Y0dWdlppQnpaWFIwYVc1bklEMDlQU0FuZFc1a1pXWnBibVZrSnlrN1hHNGdJSEpsZEhWeWJpQjFkRzFsTG1selVtVmpiM0prYVc1bktDa2dKaVlnYVhOVFpYUjBhVzVuVkhKMVpTQW1KaUJwYzA1dmRFbHVUR0ZpWld4UGNsWmhiR2xrS0dWc1pTazdYRzU5WEc1Y2JuWmhjaUIwYVcxbGNuTWdQU0JiWFR0Y2JseHVablZ1WTNScGIyNGdhVzVwZEVWMlpXNTBTR0Z1Wkd4bGNuTW9LU0I3WEc1Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUdWMlpXNTBjeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQmtiMk4xYldWdWRDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtHVjJaVzUwYzF0cFhTd2dLR1oxYm1OMGFXOXVJQ2hsZG5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm9ZVzVrYkdWeUlEMGdablZ1WTNScGIyNGdLR1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aUzVwYzFSeWFXZG5aWElwWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doYVhOSloyNXZjbVZrUld4bGJXVnVkQ2hsTG5SaGNtZGxkQ2tnSmlZZ2RYUnRaUzVwYzFKbFkyOXlaR2x1WnlncEtTQjdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYVdSNElEMGdkWFJ0WlM1emRHRjBaUzV6ZEdWd2N5NXNaVzVuZEdnN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHeGhjM1JUZEdWd0lEMGdkWFJ0WlM1emRHRjBaUzV6ZEdWd2MxdHBaSGdnTFNBeFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdZWEpuY3lBOUlIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHeHZZMkYwYjNJNklIVjBiV1V1WTNKbFlYUmxSV3hsYldWdWRFeHZZMkYwYjNJb1pTNTBZWEpuWlhRcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2RHbHRaWEk3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1pYWjBJRDA5SUNkdGIzVnpaVzkyWlhJbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dkSEoxWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBiV1Z5Y3k1d2RYTm9LSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnNaVzFsYm5RNklHVXVkR0Z5WjJWMExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdsdFpYSTZJSE5sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnZaMmRzWlZKbFlXUjVLR1V1ZEdGeVoyVjBMQ0IwY25WbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWSWFXZG9iR2xuYUhRb1pTNTBZWEpuWlhRc0lHWmhiSE5sS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBzSURVd01DbGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMmRDQTlQU0FuYlc5MWMyVnZkWFFuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkR2x0WlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEdsdFpYSnpXMmxkTG1Wc1pXMWxiblFnUFQwZ1pTNTBZWEpuWlhRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpiR1ZoY2xScGJXVnZkWFFvZEdsdFpYSnpXMmxkTG5ScGJXVnlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYVcxbGNuTXVjM0JzYVdObEtHa3NJREVwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ2WjJkc1pVaHBaMmhzYVdkb2RDaGxMblJoY21kbGRDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBiMmRuYkdWU1pXRmtlU2hsTG5SaGNtZGxkQ3dnWm1Gc2MyVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6YUc5MWJHUlNaV052Y21SRmRtVnVkQ2hsTG5SaGNtZGxkQ3dnWlhaMEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dVdWQyaHBZMmdnZkh3Z1pTNWlkWFIwYjI0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZWEpuY3k1aWRYUjBiMjRnUFNCbExuZG9hV05vSUh4OElHVXVZblYwZEc5dU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQXZMeUJEYkdsamF5QmlaV05oZFhObElHTm9ZVzVuWlNCbWFYSmxjeUJtYVhKelhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFowSUQwOVBTQW5ZMmhoYm1kbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JoY21kekxtRjBkSEpwWW5WMFpYTWdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1hDSjJZV3gxWlZ3aUlEb2daUzUwWVhKblpYUXVkbUZzZFdVc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdYQ0pqYUdWamEyVmtYQ0k2SUdVdWRHRnlaMlYwTG1Ob1pXTnJaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR2x6U1c1d2RYUWdQU0JsTG5SaGNtZGxkQzUwWVdkT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrZ1BUMDlJQ2RwYm5CMWRDYzdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWlhaMElEMDlQU0FuWTJ4cFkyc25JQ1ltSUdselNXNXdkWFFnSmlZZ2JHRnpkRk4wWlhBZ0ppWWdiR0Z6ZEZOMFpYQXVaWFpsYm5ST1lXMWxJRDA5UFNBblkyaGhibWRsSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR3hoYzNSVGRHVndMbVYyWlc1MFRtRnRaU0E5SUNkamJHbGpheWM3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbkpsWjJsemRHVnlSWFpsYm5Rb1pYWjBMQ0JoY21kekxDQnBaSGdwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSDA3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUVoQlEwc2dabTl5SUhSbGMzUnBibWRjYmlBZ0lDQWdJQ0FnSUNBZ0lDaDFkRzFsTG1WMlpXNTBUR2x6ZEdWdVpYSnpJRDBnZFhSdFpTNWxkbVZ1ZEV4cGMzUmxibVZ5Y3lCOGZDQjdmU2xiWlhaMFhTQTlJR2hoYm1Sc1pYSTdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYUdGdVpHeGxjanRjYmlBZ0lDQWdJQ0FnZlNrb1pYWmxiblJ6VzJsZEtTd2dkSEoxWlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnZG1GeUlGOTBiMTloYzJOcGFTQTlJSHRjYmlBZ0lDQWdJQ0FnSnpFNE9DYzZJQ2MwTkNjc1hHNGdJQ0FnSUNBZ0lDY3hPRGtuT2lBbk5EVW5MRnh1SUNBZ0lDQWdJQ0FuTVRrd0p6b2dKelEySnl4Y2JpQWdJQ0FnSUNBZ0p6RTVNU2M2SUNjME55Y3NYRzRnSUNBZ0lDQWdJQ2N4T1RJbk9pQW5PVFluTEZ4dUlDQWdJQ0FnSUNBbk1qSXdKem9nSnpreUp5eGNiaUFnSUNBZ0lDQWdKekl5TWljNklDY3pPU2NzWEc0Z0lDQWdJQ0FnSUNjeU1qRW5PaUFuT1RNbkxGeHVJQ0FnSUNBZ0lDQW5NakU1SnpvZ0p6a3hKeXhjYmlBZ0lDQWdJQ0FnSnpFM015YzZJQ2MwTlNjc1hHNGdJQ0FnSUNBZ0lDY3hPRGNuT2lBbk5qRW5MQ0F2TDBsRklFdGxlU0JqYjJSbGMxeHVJQ0FnSUNBZ0lDQW5NVGcySnpvZ0p6VTVKMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQjJZWElnYzJocFpuUlZjSE1nUFNCN1hHNGdJQ0FnSUNBZ0lGd2lPVFpjSWpvZ1hDSitYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5EbGNJam9nWENJaFhDSXNYRzRnSUNBZ0lDQWdJRndpTlRCY0lqb2dYQ0pBWENJc1hHNGdJQ0FnSUNBZ0lGd2lOVEZjSWpvZ1hDSWpYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5USmNJam9nWENJa1hDSXNYRzRnSUNBZ0lDQWdJRndpTlROY0lqb2dYQ0lsWENJc1hHNGdJQ0FnSUNBZ0lGd2lOVFJjSWpvZ1hDSmVYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UVmNJam9nWENJbVhDSXNYRzRnSUNBZ0lDQWdJRndpTlRaY0lqb2dYQ0lxWENJc1hHNGdJQ0FnSUNBZ0lGd2lOVGRjSWpvZ1hDSW9YQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5EaGNJam9nWENJcFhDSXNYRzRnSUNBZ0lDQWdJRndpTkRWY0lqb2dYQ0pmWENJc1hHNGdJQ0FnSUNBZ0lGd2lOakZjSWpvZ1hDSXJYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU9URmNJam9nWENKN1hDSXNYRzRnSUNBZ0lDQWdJRndpT1ROY0lqb2dYQ0o5WENJc1hHNGdJQ0FnSUNBZ0lGd2lPVEpjSWpvZ1hDSjhYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5UbGNJam9nWENJNlhDSXNYRzRnSUNBZ0lDQWdJRndpTXpsY0lqb2dYQ0pjWEZ3aVhDSXNYRzRnSUNBZ0lDQWdJRndpTkRSY0lqb2dYQ0k4WENJc1hHNGdJQ0FnSUNBZ0lGd2lORFpjSWpvZ1hDSStYQ0lzWEc0Z0lDQWdJQ0FnSUZ3aU5EZGNJam9nWENJL1hDSmNiaUFnSUNCOU8xeHVYRzRnSUNBZ1puVnVZM1JwYjI0Z2EyVjVVSEpsYzNOSVlXNWtiR1Z5SUNobEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNobExtbHpWSEpwWjJkbGNpbGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnlianRjYmx4dUlDQWdJQ0FnSUNCcFppQW9JV2x6U1dkdWIzSmxaRVZzWlcxbGJuUW9aUzUwWVhKblpYUXBJQ1ltSUhOb2IzVnNaRkpsWTI5eVpFVjJaVzUwS0dVdWRHRnlaMlYwTENCY0ltdGxlWEJ5WlhOelhDSXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWXlBOUlHVXVkMmhwWTJnN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklGUlBSRTg2SUVSdlpYTnVKM1FnZDI5eWF5QjNhWFJvSUdOaGNITWdiRzlqYTF4dUlDQWdJQ0FnSUNBZ0lDQWdMeTl1YjNKdFlXeHBlbVVnYTJWNVEyOWtaVnh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLRjkwYjE5aGMyTnBhUzVvWVhOUGQyNVFjbTl3WlhKMGVTaGpLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdNZ1BTQmZkRzlmWVhOamFXbGJZMTA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doWlM1emFHbG1kRXRsZVNBbUppQW9ZeUErUFNBMk5TQW1KaUJqSUR3OUlEa3dLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdNZ1BTQlRkSEpwYm1jdVpuSnZiVU5vWVhKRGIyUmxLR01nS3lBek1pazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHVXVjMmhwWm5STFpYa2dKaVlnYzJocFpuUlZjSE11YUdGelQzZHVVSEp2Y0dWeWRIa29ZeWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdkwyZGxkQ0J6YUdsbWRHVmtJR3RsZVVOdlpHVWdkbUZzZFdWY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaklEMGdjMmhwWm5SVmNITmJZMTA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTWdQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0dNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxaMmx6ZEdWeVJYWmxiblFvSjJ0bGVYQnlaWE56Snl3Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHeHZZMkYwYjNJNklIVjBiV1V1WTNKbFlYUmxSV3hsYldWdWRFeHZZMkYwYjNJb1pTNTBZWEpuWlhRcExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHdGxlVG9nWXl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCd2NtVjJWbUZzZFdVNklHVXVkR0Z5WjJWMExuWmhiSFZsTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGJIVmxPaUJsTG5SaGNtZGxkQzUyWVd4MVpTQXJJR01zWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYTJWNVEyOWtaVG9nWlM1clpYbERiMlJsWEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJR1J2WTNWdFpXNTBMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMnRsZVhCeVpYTnpKeXdnYTJWNVVISmxjM05JWVc1a2JHVnlMQ0IwY25WbEtUdGNibHh1SUNBZ0lDOHZJRWhCUTBzZ1ptOXlJSFJsYzNScGJtZGNiaUFnSUNBb2RYUnRaUzVsZG1WdWRFeHBjM1JsYm1WeWN5QTlJSFYwYldVdVpYWmxiblJNYVhOMFpXNWxjbk1nZkh3Z2UzMHBXeWRyWlhsd2NtVnpjeWRkSUQwZ2EyVjVVSEpsYzNOSVlXNWtiR1Z5TzF4dWZWeHVYRzVtZFc1amRHbHZiaUJuWlhSUVlYSmhiV1YwWlhKQ2VVNWhiV1VvYm1GdFpTa2dlMXh1SUNBZ0lHNWhiV1VnUFNCdVlXMWxMbkpsY0d4aFkyVW9MMXRjWEZ0ZEx5d2dYQ0pjWEZ4Y1cxd2lLUzV5WlhCc1lXTmxLQzliWEZ4ZFhTOHNJRndpWEZ4Y1hGMWNJaWs3WEc0Z0lDQWdkbUZ5SUhKbFoyVjRJRDBnYm1WM0lGSmxaMFY0Y0NoY0lsdGNYRnhjUHlaZFhDSWdLeUJ1WVcxbElDc2dYQ0k5S0Z0ZUppTmRLaWxjSWlrc1hHNGdJQ0FnSUNBZ0lISmxjM1ZzZEhNZ1BTQnlaV2RsZUM1bGVHVmpLR3h2WTJGMGFXOXVMbk5sWVhKamFDazdYRzRnSUNBZ2NtVjBkWEp1SUhKbGMzVnNkSE1nUFQwOUlHNTFiR3dnUHlCY0lsd2lJRG9nWkdWamIyUmxWVkpKUTI5dGNHOXVaVzUwS0hKbGMzVnNkSE5iTVYwdWNtVndiR0ZqWlNndlhGd3JMMmNzSUZ3aUlGd2lLU2s3WEc1OVhHNWNibVoxYm1OMGFXOXVJR0p2YjNSemRISmhjRlYwYldVb0tTQjdYRzRnSUdsbUlDaGtiMk4xYldWdWRDNXlaV0ZrZVZOMFlYUmxJRDA5SUZ3aVkyOXRjR3hsZEdWY0lpa2dlMXh1SUNBZ0lIVjBiV1V1YVc1cGRDZ3BMblJvWlc0b1puVnVZM1JwYjI0Z0tDa2dlMXh1WEc0Z0lDQWdJQ0FnSUdsdWFYUkZkbVZ1ZEVoaGJtUnNaWEp6S0NrN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVXVhWE5TWldOdmNtUnBibWNvS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaV2RwYzNSbGNrVjJaVzUwS0Z3aWJHOWhaRndpTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIQnliM1J2WTI5c09pQjNhVzVrYjNjdWJHOWpZWFJwYjI0dWNISnZkRzlqYjJ3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2h2YzNRNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1b2IzTjBMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelpXRnlZMmc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTV6WldGeVkyZ3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdoaGMyZzZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9ZWE5vWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5S1R0Y2JpQWdmVnh1ZlZ4dVhHNWliMjkwYzNSeVlYQlZkRzFsS0NrN1hHNWtiMk4xYldWdWRDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZHlaV0ZrZVhOMFlYUmxZMmhoYm1kbEp5d2dZbTl2ZEhOMGNtRndWWFJ0WlNrN1hHNWNibmRwYm1SdmR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZDFibXh2WVdRbkxDQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdkWFJ0WlM1MWJteHZZV1FvS1R0Y2JuMHNJSFJ5ZFdVcE8xeHVYRzUzYVc1a2IzY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25aWEp5YjNJbkxDQm1kVzVqZEdsdmJpQW9aWEp5S1NCN1hHNGdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29YQ0pUWTNKcGNIUWdSWEp5YjNJNklGd2lJQ3NnWlhKeUxtMWxjM05oWjJVZ0t5QmNJanBjSWlBcklHVnljaTUxY213Z0t5QmNJaXhjSWlBcklHVnljaTVzYVc1bElDc2dYQ0k2WENJZ0t5Qmxjbkl1WTI5c0tUdGNibjBwTzF4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlIVjBiV1U3WEc0aVhYMD0iXX0=
