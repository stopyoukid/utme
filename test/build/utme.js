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

},{"_process":4}],2:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":6}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],6:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":5,"_process":4,"inherits":3}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{"./utils":10}],9:[function(require,module,exports){
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
},{"./utils":10}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
  registerLoadHandler: function(handler, order) {
    order = typeof order !== "undefined" ? order : loadHandlers.length;
    if (loadHandlers.length > order) {
      loadHandlers.splice(order, 0, handler);
    } else {
      loadHandlers.push(handler);
    }
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

},{"./selectorFinder":7,"./settings":8,"./simulate":9,"./utils":10,"es6-promise":1}],12:[function(require,module,exports){
module.exports = {
    "checkboxesCheckProperly": {
        "test": "Click a checkbox and replay it properly",
        "html": "<input type='checkbox'/>",
        "events": [{
            "selector": "#testArea input",
            "event": "change",
            "checked": true
        }, {
            "selector": "#testArea input",
            "event": "click",
            "checked": true
        }]
    }
};

},{}],13:[function(require,module,exports){
module.exports = {
    "elementWithClick": {
        "test": "fires click event",
        "scenario": {
            "steps": [{
                "eventName": "click",
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            }]
        },
        "html": "<div></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "click"
        }]
    },
    "elementWithNoImportantEvents": {
        "test": "does not fire events, if no important events are found",
        "scenario": {
            "steps": [{
                "eventName": "mouseenter",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "mouseover",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 20,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 30,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div></div>",
        "expect": []
    },
    "elementWithNoImportantEventsButHighHoverTime":  {
        "test": "fire non important events when the user has interacted with the element for a long time",
        "description": "This is useful for hover behaviors, menus that show up on hover",
        "scenario": {
            "steps": [{
                "eventName": "mouseenter",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "mouseover",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 4000,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 4010,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "mouseenter"
        },{
            "selector": "#testArea div",
            "event": "mouseover"

        },{
            "selector": "#testArea div",
            "event": "mouseout"

        },{
            "selector": "#testArea div",
            "event": "mouseleave"
        }]
    },
    "elementWithPartialClick": {
        "test": "fire click event on element, with a short user interaction period",
        "description": "This happens when clicking on a button goes to another page, but before mouse up is fired, the page is changed, so a mouse up isn't registered",
        "scenario": {
            "steps": [{
                "eventName": "mousedown",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "click",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "blur",
                    "timeStamp": 20,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "click"
        }]
    },
    "nonImportantElementInsideImportantElement": {
        "test": "does not fire events for an element that the user has not really interacted with",
        "description": "This is useful for when the user is just moving their mouse over an element to get to another, but not really interacting with that element",
        "scenario": {
            "steps": [{
                "eventName": "mouseenter",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "mouseover",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseenter",
                    "timeStamp": 20,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseover",
                    "timeStamp": 30,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 40,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 50,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 4000,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 4001,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div><span></span></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "mouseenter"
        },{
            "selector": "#testArea div",
            "event": "mouseover"
        },{
            "selector": "#testArea div",
            "event": "mouseout"
        },{
            "selector": "#testArea div",
            "event": "mouseleave"
        }]
    },
    "scenarioWithPreconditions": {
        "scenario": {
            "steps": [{
                "eventName": "click",
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            }],
            "setup": {
                "scenarios": [
                    "setup-scenario"
                ]
            }
        }
    }
}

},{}],14:[function(require,module,exports){
(function (global){
var assert = require("assert")

describe('Utme Tests', function () {
    var isInBrowser = !!global.window;
    if (!isInBrowser) {
        require('mocha-jsdom')();
        require('better-require')('json');
    }

    var testEle;
    beforeEach(function (done) {
        if (!isInBrowser) {
            $ = require('jquery');
        }

        if (isInBrowser) {
            localStorage.clear();
        }

        testEle = document.getElementById("testArea");
        if (!testEle) {
            testEle = document.createElement("div");
            testEle.id = "testArea";
        }
        testEle.innerHTML = "";
        document.body.appendChild(testEle);

        var localStorageValues = {};
        localStorage = {
            setItem: function (path, value) {
                localStorageValues[path] = value;
            },
            getItem: function (path) {
                return localStorageValues[path];
            },
            removeItem: function (path) {
                delete localStorageValues[path];
            }
        };
        selectorFinder = require("../src/js/selectorFinder").selectorFinder;

        // Clean utme, cause it is a singleton right now
        for (var i in require.cache) {
            if (i.indexOf("utme.js") >= 0) {
                delete require.cache[i];
            }
        }

        utme = require("../src/js/utme");
        utme.init().then(function() {
            done();
        });
    });

    describe('selector finding', function () {
        it('should start of with a status of LOADED', function () {
            assert.equal(utme.state.status, "LOADED");
        })

        it('should calculate the correct selector 1', function () {
            var elements = $("<div></div>");
            elements.appendTo(testEle);

            var locator = utme.createElementLocator(elements[0]);

            assert.equal(locator.selectors[0], "[id='testArea'] > div:eq(0)");
        })

        it('should calculate the correct selector 2', function () {
            var elements = $("<div></div><div></div>");
            elements.appendTo(testEle);

            locator = utme.createElementLocator(elements[1]);

            assert.equal(locator.selectors[0], "[id='testArea'] > div:eq(1)");
        })

        it('should calculate the correct selector 3', function () {
            var elements = $("<div></div><div class='myClass'></div>");
            elements.appendTo(testEle);

            locator = utme.createElementLocator(elements[1]);
            // utme.finalizeLocator(locator);

            assert.equal(locator.selectors[0], "[id='testArea'] div.myClass:eq(0)");
        })

        it('should calculate the correct selector 4', function () {
            var elements = $("<div class='myClass'></div><div class='myClass'></div>");
            elements.appendTo(testEle);

            locator = utme.createElementLocator(elements[0]);

            assert.equal(locator.selectors[0], "[id='testArea'] div.myClass:eq(0)");
        })

        it('should calculate the correct selector 5', function () {
            var elements = $("<div class='myClass'></div><div class='myClass'></div>");
            elements.appendTo(testEle);

            locator = utme.createElementLocator(elements[1]);

            assert.equal(locator.selectors[0], "[id='testArea'] div.myClass:eq(1)");
        })

        it('should calculate the correct selector 6', function () {
            var elements = $("<div class='myClass'><div class='myClass'></div></div>");
            elements.appendTo(testEle);

            locator = utme.createElementLocator(elements[0].childNodes[0]);

            assert.equal(locator.selectors[0], "div.myClass div.myClass:eq(0)");
            assert.equal(locator.selectors[1], "div.myClass:eq(1)");
        })

        it('should calculate the correct selector 7', function () {
            var elements = $("<div title='myTitle'><div class='myClass'></div></div>");
            elements.appendTo(testEle);

            locator = utme.createElementLocator(elements[0]);

            assert.equal(locator.selectors[0], "[id='testArea'] div[title=\"myTitle\"]:eq(0)");
        })

        it('should calculate the correct selector 8', function () {
            var elements = $("<div title='myTitle'></div><span></span><div class='cool'><div><div></div></div></div>");
            elements.appendTo(testEle);

            var innerDiv = $('.cool > div > div', testEle);

            locator = utme.createElementLocator(innerDiv[0]);

            assert.equal(locator.selectors[0], "div.cool div:eq(1)");
            assert.equal(locator.selectors[1], "div:eq(4)");
        })


    });

    describe('step recording', function () {
        beforeEach(function () {
            utme.startRecording();
        });

        it('should set the status to RECORDING after you start recording', function () {
            assert.equal(utme.state.status, "RECORDING");
        });

        it('should record a "load" event when recording starts', function () {
            assert.equal(utme.state.steps.length, 1);
            assert.equal(utme.state.steps[0].eventName, "load");
        });

        it('should set a timestamp when recording an event', function () {
            utme.registerEvent('testEvent', {});

            assert.equal(utme.state.steps[1].eventName, "testEvent");
            assert.notEqual(typeof utme.state.steps[1].timeStamp, "undefined");
        });
    });

    describe('mouse event registering', function () {
        beforeEach(function () {
            utme.startRecording();
        });

        it('should register all events as steps when mouseovering an element', function () {
            var elements = $("<div></div>");
            elements.appendTo(testEle);

            utme.eventListeners['mouseenter']({
                target: elements[0]
            });
            utme.eventListeners['mouseover']({
                target: elements[0]
            });

            assert.equal(utme.state.steps.length, 3);
            assert.equal(utme.state.steps[1].eventName, 'mouseenter');
            assert.equal(utme.state.steps[2].eventName, 'mouseover');
        });

        it('should register which button was down when click is fired', function () {
            var elements = $("<div></div>");
            elements.appendTo(testEle);

            utme.eventListeners['click']({
                target: elements[0],
                which: 49083
            });

            assert.equal(utme.state.steps.length, 2);
            assert.equal(utme.state.steps[1].eventName, 'click');
            assert.equal(utme.state.steps[1].data.button, 49083);
        });

        it('should not register events if not recording', function () {
            utme.stopRecording(false);

            var elements = $("<div></div>");
            elements.appendTo(testEle);

            utme.eventListeners['mouseover']({
                target: elements[0]
            });

            assert.equal(utme.state.steps.length, 1);
            assert.equal(utme.state.steps[0].eventName, 'load');
        });

        it('should not register two events if in a label', function () {
            var elements = $("<label><input/><span></span></label>");
            elements.appendTo(testEle);

            utme.eventListeners['mouseenter']({
                target: elements.find("span")[0]
            });

            utme.eventListeners['mouseenter']({
                target: elements.find("input")[0]
            });

            assert.equal(utme.state.steps.length, 2);
            assert.equal(utme.state.steps[0].eventName, 'load');
            assert.equal(utme.state.steps[1].eventName, 'mouseenter');
        });

        it('should register "m" as the character when the "m" character is pressed', function () {
            var elements = $("<div></div>");
            elements.appendTo(testEle);

            utme.eventListeners['keypress']({
                target: elements[0],
                which: 109
            });

            assert.equal(utme.state.steps.length, 2);
            assert.equal(utme.state.steps[1].eventName, 'keypress');
            assert.equal(utme.state.steps[1].data.key, 'm');
        });

        it('should record the checked property checkboxes, when change is fired', function () {
            var elements = $("<input type='checkbox' checked='true'></div>");
            elements.appendTo(testEle);

            utme.eventListeners['change']({
                target: elements[0]
            });

            assert.equal(utme.state.steps.length, 2);
            assert.equal(utme.state.steps[1].eventName, 'change');
            assert.equal(utme.state.steps[1].data.attributes.checked, true);
        });
    });

    describe('run scenario', function () {

        var eventsTests = require("./events");
        var testScenarios = require("./scenarios");
        it('load a scenario when runScenario is called', function (done) {

            var isDone = false;
            utme.registerLoadHandler(function (name, callback) {
                var test = testScenarios.elementWithClick;
                done();
                isDone = true;
            }, 0);

            utme.runScenario('whatever');

            if (!isDone) {
                done("Load not called!");
            }

        });

        it('successfully complete with a single step', function (done) {
            var elements = $("<div></div>");
            elements.appendTo(testEle);

            utme.registerReportHandler({
                log: function (txt) {
                    if (txt.indexOf("Completed") >= 0) {
                        done();
                    }
                },
                success: function () {
                    done();
                },
                error: function (txt) {
                    console.log(txt);
                }
            });

            utme.registerLoadHandler(function (name, callback) {
                var test = testScenarios.elementWithClick;
                callback(test.scenario);
            }, 0);

            utme.runScenario('whatever');
        });

        it('should load preconditions properly', function (done) {
            var elements = $("<div></div>");
            elements.appendTo(testEle);

            var isDone = false;
            utme.registerLoadHandler(function (name, callback) {
                if (!name) {
                    done("Not loading preconditions properly")
                    isDone = true;
                } else if (name == 'whatever') {
                    var test = testScenarios.scenarioWithPreconditions;
                    callback(test.scenario);
                } else {
                    done();
                    isDone = true;
                }
            }, 0);

            utme.runScenario('whatever');
        });

        function createScenarioTest(test) {

            // It isn't an actual test
            if (test.test) {
                it(test.test, function (done) {
                    var isDone = false;
                    var elements = $(test.html);
                    elements.appendTo(testEle);

                    var expects = (test.expect || []).slice(0);
                    // We expect a set of elements to have events fired upon them
                    if (test.expect && test.expect.length > 0) {
                        var lastExpectedRunIdx = -1;
                        expects.forEach(function (expect, i) {
                            $('body ' + expect.selector).on(expect.event, function () {
                                if (expects[0] != expect) {
                                    isDone = true;
                                    done("Events firing out of order, got " + expect.event + " on " + expect.selector);
                                } else {
                                    expects.splice(0, 1);
                                }
                            });
                        });

                        // We expect NO elements to have any events
                    } else {
                        $('#testArea *').on('click mousedown mouseup mouseout mouseover mouseenter mouseleave', function () {
                            isDone = true;
                            done("No events should be run");
                        });
                    }

                    utme.registerReportHandler({
                        log: function (txt) {
                            console.log(txt);
                        },
                        success: function () {
                            if (!isDone && expects.length == 0) {
                                isDone = true;
                                done();
                            }
                        },
                        error: function (txt) {
                            isDone = true;
                            done(txt);
                        }
                    });

                    utme.registerLoadHandler(function (name, callback) {
                        callback(test.scenario);
                    }, 0);

                    utme.runScenario('whatever');
                });
            }
        }

        // Run all of the test scenarios
        for (var scenarioName in testScenarios) {
            createScenarioTest(testScenarios[scenarioName]);
        }

        it('should not fire events on elements that have no important events, inside of ones that do', function (done) {
            var elements = $("<div><span><span></div>");
            elements.appendTo(testEle);

            var badCount = 0;
            var goodCount = 0;
            $('div').on('mouseenter mouseout mouseover mouseleave', function () {
                goodCount++;
                if (goodCount === 4 && badCount === 0) {
                    done();
                }
            });

            $('span').on('mouseenter mouseout mouseover mouseleave', function () {
                badCount++;
            });

            utme.registerLoadHandler(function (name, callback) {
                var test = testScenarios.nonImportantElementInsideImportantElement;
                callback(test.scenario);
            }, 0);

            utme.runScenario('whatever');
        });

        function createEventsTest(test) {

            // It isn't an actual test
            if (test.test) {
                it(test.test, function (done) {
                    var isDone = false;
                    var elements = $(test.html);
                    elements.appendTo(testEle);
                    var toRun;

                    utme.registerSaveHandler(function(scenario) {
                        toRun = scenario;
                        scenario.steps.splice(0, 1);
                    });

                    utme.startRecording();

                    // TODO: Consolidate with scenario
                    var expects = (test.events || []).slice(0);

                    expects.forEach(function (expect) {
                        var element = $('body ' + expect.selector)[0];
                        element.checked = expect.checked;
                        utme.eventListeners[expect.event]({
                            target: elements[0],
                            which: 49083
                        });
                    });

                    utme.stopRecording({ name: "WHATEVER" });

                    // We expect a set of elements to have events fired upon them
                    if (expects && expects.length > 0) {
                        var lastExpectedRunIdx = -1;
                        expects.forEach(function (expect, i) {
                            $('body ' + expect.selector).on(expect.event, function () {
                                if (expects[0] != expect) {
                                    isDone = true;
                                    done("Events firing out of order, got " + expect.event + " on " + expect.selector);
                                } else {
                                    expects.splice(0, 1);
                                }
                            });
                        });

                        // We expect NO elements to have any events
                    } else {
                        $('#testArea *').on('click mousedown mouseup mouseout mouseover mouseenter mouseleave', function () {
                            isDone = true;
                            done("No events should be run");
                        });
                    }

                    utme.registerReportHandler({
                        log: function (txt) {
                            console.log(txt);
                        },
                        success: function () {
                            if (!isDone && expects.length == 0) {
                                isDone = true;
                                done();
                            }
                        },
                        error: function (txt) {
                            isDone = true;
                            done(txt);
                        }
                    });

                    utme.registerLoadHandler(function (name, callback) {
                        callback(toRun);
                    }, 0);

                    utme.runScenario('whatever');
                });
            }
        }

        // Run all of the test scenarios
        for (var eventName in eventsTests) {
            createEventsTest(eventsTests[eventName]);
        }
    });
})


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../src/js/selectorFinder":7,"../src/js/utme":11,"./events":12,"./scenarios":13,"assert":2,"better-require":"better-require","jquery":"jquery","mocha-jsdom":"mocha-jsdom"}]},{},[14])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9hc3NlcnQvYXNzZXJ0LmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL2hvbWUvZGF2aWR0aXR0c3dvcnRoL3Byb2plY3RzL3V0bWUvc3JjL2pzL3NlbGVjdG9yRmluZGVyLmpzIiwiL2hvbWUvZGF2aWR0aXR0c3dvcnRoL3Byb2plY3RzL3V0bWUvc3JjL2pzL3NldHRpbmdzLmpzIiwiL2hvbWUvZGF2aWR0aXR0c3dvcnRoL3Byb2plY3RzL3V0bWUvc3JjL2pzL3NpbXVsYXRlLmpzIiwiL2hvbWUvZGF2aWR0aXR0c3dvcnRoL3Byb2plY3RzL3V0bWUvc3JjL2pzL3V0aWxzLmpzIiwiL2hvbWUvZGF2aWR0aXR0c3dvcnRoL3Byb2plY3RzL3V0bWUvc3JjL2pzL3V0bWUuanMiLCIvaG9tZS9kYXZpZHRpdHRzd29ydGgvcHJvamVjdHMvdXRtZS90ZXN0L2V2ZW50cy5qcyIsIi9ob21lL2RhdmlkdGl0dHN3b3J0aC9wcm9qZWN0cy91dG1lL3Rlc3Qvc2NlbmFyaW9zLmpzIiwiL2hvbWUvZGF2aWR0aXR0c3dvcnRoL3Byb2plY3RzL3V0bWUvdGVzdC91dG1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy83QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hrQkE7QUFBQSxPQUFTLE9BQUssQ0FBRSxFQUFDLENBQUcsQ0FBQSxHQUFFLENBQUc7QUFDdkIsS0FBSSxDQUFDLEVBQUMsQ0FBQSxFQUFLLEVBQUMsRUFBQyxRQUFRLENBQUc7QUFDdEIsUUFBTSxJQUFJLFVBQVEsQUFBQyxDQUFDLGtCQUFpQixDQUFDLENBQUM7RUFDekM7QUFBQSxBQUVBLFNBQVMsa0JBQWdCLENBQUUsT0FBTSxDQUFHLENBQUEsUUFBTyxDQUFHO0FBQzFDLEFBQUksTUFBQSxDQUFBLGFBQVksRUFBSSxFQUFBLENBQUM7QUFDckIsQUFBSSxNQUFBLENBQUEsS0FBSSxFQUFLLENBQUEsR0FBRSxpQkFBaUIsQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO0FBRTNDLFFBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxLQUFJLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQ25DLFNBQUksS0FBSSxDQUFFLENBQUEsQ0FBQyxJQUFNLFFBQU0sQ0FBRztBQUN0QixvQkFBWSxFQUFJLEVBQUEsQ0FBQztBQUNqQixhQUFLO01BQ1Q7QUFBQSxJQUNKO0FBQUEsQUFDQSxTQUFPLGNBQVksQ0FBQztFQUN4QjtBQUFBLEFBRUksSUFBQSxDQUFBLFVBQVMsRUFBSSxDQUFBLGtCQUFpQixBQUFDLENBQUMsRUFBQyxDQUFDLFNBQVMsQ0FBQztBQUNoRCxBQUFJLElBQUEsQ0FBQSxnQkFBZSxFQUFJLENBQUEsVUFBUyxJQUFNLENBQUEsRUFBQyxRQUFRLFlBQVksQUFBQyxFQUFDLENBQUM7QUFDOUQsQUFBSSxJQUFBLENBQUEsZ0JBQWUsQ0FBQztBQUVwQixBQUFJLElBQUEsQ0FBQSxXQUFVLEVBQUksR0FBQyxDQUFDO0FBQ3BCLFFBQU8sV0FBVSxjQUFjLEdBQUssS0FBRyxDQUFBLEVBQUssRUFBQyxnQkFBZSxDQUFHO0FBQzNELGNBQVUsRUFBSSxDQUFBLFdBQVUsY0FBYyxDQUFDO0FBQ3ZDLEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLGtCQUFpQixBQUFDLENBQUMsV0FBVSxDQUFDLFNBQVMsQ0FBQztBQUt2RCxPQUFJLFFBQU8sSUFBTSxDQUFBLFdBQVUsUUFBUSxZQUFZLEFBQUMsRUFBQyxDQUFHO0FBQ2hELHFCQUFlLEVBQUksQ0FBQSxRQUFPLEVBQUksRUFBQyxXQUFVLElBQU0sQ0FBQSxFQUFDLGNBQWMsQ0FBQSxFQUFLLGlCQUFlLENBQUEsQ0FBSSxNQUFJLEVBQUksSUFBRSxDQUFDLENBQUEsQ0FBSSxXQUFTLENBQUM7SUFDbkg7QUFBQSxFQUNKO0FBQUEsQUFFSSxJQUFBLENBQUEsY0FBYSxFQUFJLEdBQUMsQ0FBQztBQUN2QixLQUFJLGdCQUFlLENBQUc7QUFDcEIsaUJBQWEsS0FBSyxBQUFDLENBQ2pCLGdCQUFlLEVBQUksT0FBSyxDQUFBLENBQUksQ0FBQSxpQkFBZ0IsQUFBQyxDQUFDLEVBQUMsQ0FBRyxpQkFBZSxDQUFDLENBQUEsQ0FBSSxJQUFFLENBQzFFLENBQUM7RUFDSDtBQUFBLEFBRUEsZUFBYSxLQUFLLEFBQUMsQ0FBQyxVQUFTLEVBQUksT0FBSyxDQUFBLENBQUksQ0FBQSxpQkFBZ0IsQUFBQyxDQUFDLEVBQUMsQ0FBRyxXQUFTLENBQUMsQ0FBQSxDQUFJLElBQUUsQ0FBQyxDQUFDO0FBQ2xGLE9BQU8sZUFBYSxDQUFDO0FBQ3ZCO0FBQUEsQUFBQztBQVNELE9BQVMsY0FBWSxDQUFFLEVBQUMsQ0FBRztBQUN6QixBQUFJLElBQUEsQ0FBQSxTQUFRLEVBQUksQ0FBQSxFQUFDLGFBQWEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDO0FBQ3hDLFVBQVEsRUFBSSxDQUFBLFNBQVEsR0FBSyxDQUFBLFNBQVEsUUFBUSxBQUFDLENBQUMsYUFBWSxDQUFHLEdBQUMsQ0FBQyxDQUFDO0FBQzdELFVBQVEsRUFBSSxDQUFBLFNBQVEsR0FBSyxDQUFBLFNBQVEsUUFBUSxBQUFDLENBQUMsWUFBVyxDQUFHLEdBQUMsQ0FBQyxDQUFDO0FBRTVELEtBQUksQ0FBQyxTQUFRLENBQUEsRUFBSyxFQUFDLENBQUMsU0FBUSxLQUFLLEFBQUMsRUFBQyxPQUFPLENBQUMsQ0FBRztBQUFFLFNBQU8sR0FBQyxDQUFDO0VBQUU7QUFBQSxBQUczRCxVQUFRLEVBQUksQ0FBQSxTQUFRLFFBQVEsQUFBQyxDQUFDLE1BQUssQ0FBRyxJQUFFLENBQUMsQ0FBQztBQUcxQyxVQUFRLEVBQUksQ0FBQSxTQUFRLFFBQVEsQUFBQyxDQUFDLFlBQVcsQ0FBRyxHQUFDLENBQUMsQ0FBQztBQUcvQyxPQUFPLENBQUEsU0FBUSxLQUFLLEFBQUMsRUFBQyxNQUFNLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQztBQUNwQztBQUFBLEFBVUEsT0FBUyxtQkFBaUIsQ0FBRSxFQUFDLENBQUcsQ0FBQSxRQUFPLENBQUc7QUFDeEMsQUFBSSxJQUFBLENBQUEsS0FBSSxFQUFJLEdBQUMsQ0FBQztBQUNkLEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxLQUFHLENBQUM7QUFDaEIsQUFBSSxJQUFBLENBQUEsS0FBSSxFQUFJLEtBQUcsQ0FBQztBQUNoQixBQUFJLElBQUEsQ0FBQSxHQUFFLEVBQU0sS0FBRyxDQUFDO0FBQ2hCLEFBQUksSUFBQSxDQUFBLElBQUcsRUFBSyxLQUFHLENBQUM7QUFDaEIsQUFBSSxJQUFBLENBQUEsS0FBSSxFQUFJLEtBQUcsQ0FBQztBQUNoQixBQUFJLElBQUEsQ0FBQSxFQUFDLEVBQUksR0FBQyxDQUFDO0FBS1gsS0FBSSxFQUFDLEdBQUcsQ0FBRztBQUNULFFBQUksRUFBSSxDQUFBLFFBQU8sRUFBSSxDQUFBLEVBQUMsR0FBRyxDQUFBLENBQUksTUFBSSxDQUFDO0VBQ2xDLEtBQU87QUFFTCxRQUFJLEVBQVEsQ0FBQSxFQUFDLFFBQVEsWUFBWSxBQUFDLEVBQUMsQ0FBQztBQUVwQyxBQUFJLE1BQUEsQ0FBQSxVQUFTLEVBQUksQ0FBQSxhQUFZLEFBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUdsQyxPQUFJLFVBQVMsT0FBTyxDQUFHO0FBQ3JCLFVBQUksR0FBSyxDQUFBLEdBQUUsRUFBSSxDQUFBLFVBQVMsS0FBSyxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7SUFDckM7QUFBQSxFQUNGO0FBQUEsQUFHQSxLQUFJLEtBQUksRUFBSSxDQUFBLEVBQUMsYUFBYSxBQUFDLENBQUMsT0FBTSxDQUFDLENBQUc7QUFDcEMsUUFBSSxHQUFLLENBQUEsVUFBUyxFQUFJLE1BQUksQ0FBQSxDQUFJLEtBQUcsQ0FBQztFQUNwQyxLQUFPLEtBQUksR0FBRSxFQUFJLENBQUEsRUFBQyxhQUFhLEFBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBRztBQUN2QyxRQUFJLEdBQUssQ0FBQSxRQUFPLEVBQUksSUFBRSxDQUFBLENBQUksS0FBRyxDQUFDO0VBQ2hDLEtBQU8sS0FBSSxJQUFHLEVBQUksQ0FBQSxFQUFDLGFBQWEsQUFBQyxDQUFDLE1BQUssQ0FBQyxDQUFHO0FBQ3pDLFFBQUksR0FBSyxDQUFBLFNBQVEsRUFBSSxLQUFHLENBQUEsQ0FBSSxLQUFHLENBQUM7RUFDbEM7QUFBQSxBQUVBLEtBQUksS0FBSSxFQUFJLENBQUEsRUFBQyxhQUFhLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBRztBQUNwQyxRQUFJLEdBQUssQ0FBQSxVQUFTLEVBQUksTUFBSSxDQUFBLENBQUksS0FBRyxDQUFDO0VBQ3BDO0FBQUEsQUFNQSxNQUFJLFFBQVEsQUFBQyxDQUFDO0FBQ1osVUFBTSxDQUFHLEdBQUM7QUFDVixXQUFPLENBQUcsTUFBSTtBQUFBLEVBQ2hCLENBQUMsQ0FBQztBQVNGLEtBQUksQ0FBQyxLQUFJLE9BQU8sQ0FBRztBQUNqQixRQUFNLElBQUksTUFBSSxBQUFDLENBQUMsaUNBQWdDLENBQUMsQ0FBQztFQUNwRDtBQUFBLEFBQ0EsT0FBTyxDQUFBLEtBQUksQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUNqQjtBQUFBLEFBRUEsS0FBSyxRQUFRLEVBQUksT0FBSyxDQUFDO0FBRTh3VDs7OztBQ3ZKcnlUO0FBQUEsQUFBSSxFQUFBLENBQUEsQ0FBQSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUM7QUFDMUIsQUFBSSxFQUFBLENBQUEsaUJBQWdCLEVBQUksZ0JBQWMsQ0FBQztBQUV2QyxPQUFTLFNBQU8sQ0FBRyxlQUFjLENBQUc7QUFDaEMsS0FBRyxZQUFZLEFBQUMsQ0FBQyxlQUFjLEdBQUssR0FBQyxDQUFDLENBQUM7QUFDM0M7QUFBQSxBQUVBLE9BQU8sVUFBVSxFQUFJO0FBQ2pCLDZCQUEyQixDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQ3RDLEFBQUksTUFBQSxDQUFBLGNBQWEsRUFBSSxDQUFBLFlBQVcsUUFBUSxBQUFDLENBQUMsaUJBQWdCLENBQUMsQ0FBQztBQUM1RCxBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksR0FBQyxDQUFDO0FBQ2pCLE9BQUksY0FBYSxDQUFHO0FBQ2hCLGFBQU8sRUFBSSxDQUFBLElBQUcsTUFBTSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7SUFDekM7QUFBQSxBQUNBLFNBQU8sU0FBTyxDQUFDO0VBQ25CO0FBRUEsWUFBVSxDQUFHLFVBQVUsZUFBYyxDQUFHO0FBQ3BDLEFBQUksTUFBQSxDQUFBLGFBQVksRUFBSSxDQUFBLElBQUcsNkJBQTZCLEFBQUMsRUFBQyxDQUFDO0FBQ3ZELEFBQUksTUFBQSxDQUFBLFlBQVcsRUFBSSxDQUFBLENBQUEsT0FBTyxBQUFDLENBQUMsRUFBQyxDQUFHLENBQUEsZUFBYyxHQUFLLEdBQUMsQ0FBQyxDQUFDO0FBQ3RELE9BQUcsU0FBUyxFQUFJLENBQUEsQ0FBQSxPQUFPLEFBQUMsQ0FBQyxFQUFDLENBQUcsQ0FBQSxDQUFBLE9BQU8sQUFBQyxDQUFDLFlBQVcsQ0FBRyxjQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ25FLE9BQUcsZ0JBQWdCLEVBQUksZ0JBQWMsQ0FBQztFQUMxQztBQUVBLElBQUUsQ0FBRyxVQUFVLEdBQUUsQ0FBRyxDQUFBLEtBQUksQ0FBRztBQUN2QixPQUFHLFNBQVMsQ0FBRSxHQUFFLENBQUMsRUFBSSxNQUFJLENBQUM7QUFDMUIsT0FBRyxLQUFLLEFBQUMsRUFBQyxDQUFDO0VBQ2Y7QUFFQSxJQUFFLENBQUcsVUFBVSxHQUFFLENBQUc7QUFDaEIsU0FBTyxDQUFBLElBQUcsU0FBUyxDQUFFLEdBQUUsQ0FBQyxDQUFDO0VBQzdCO0FBRUEsS0FBRyxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQ2QsZUFBVyxRQUFRLEFBQUMsQ0FBQyxpQkFBZ0IsQ0FBRyxDQUFBLElBQUcsVUFBVSxBQUFDLENBQUMsSUFBRyxTQUFTLENBQUMsQ0FBQyxDQUFDO0VBQzFFO0FBRUEsY0FBWSxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQ3ZCLEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLElBQUcsZ0JBQWdCLENBQUM7QUFDbkMsT0FBSSxRQUFPLENBQUc7QUFDVixTQUFHLFNBQVMsRUFBSSxDQUFBLENBQUEsT0FBTyxBQUFDLENBQUMsRUFBQyxDQUFHLFNBQU8sQ0FBQyxDQUFDO0FBQ3RDLFNBQUcsS0FBSyxBQUFDLEVBQUMsQ0FBQztJQUNmO0FBQUEsRUFDSjtBQUFBLEFBQ0osQ0FBQztBQUVELEtBQUssUUFBUSxFQUFJLFNBQU8sQ0FBQztBQUVvc0g7Ozs7QUNoRDd0SDtBQUFBLEFBQUksRUFBQSxDQUFBLENBQUEsRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFDO0FBRTFCLEFBQUksRUFBQSxDQUFBLFFBQU8sRUFBSTtBQUNYLE1BQUksQ0FBRyxVQUFTLE9BQU0sQ0FBRyxDQUFBLFNBQVEsQ0FBRyxDQUFBLE9BQU0sQ0FBRTtBQUN4QyxBQUFJLE1BQUEsQ0FBQSxHQUFFLENBQUM7QUFDUCxPQUFJLFFBQU8sWUFBWSxDQUFHO0FBQ3RCLFFBQUUsRUFBSSxDQUFBLFFBQU8sWUFBWSxBQUFDLENBQUMsWUFBVyxDQUFDLENBQUM7QUFDeEMsUUFBRSxVQUFVLEFBQUMsQ0FBQyxTQUFRLENBQUcsQ0FBQSxTQUFRLEdBQUssYUFBVyxDQUFBLEVBQUssQ0FBQSxTQUFRLEdBQUssYUFBVyxDQUFHLEtBQUcsQ0FBRSxDQUFDO0FBQ3ZGLE1BQUEsT0FBTyxBQUFDLENBQUMsR0FBRSxDQUFHLFFBQU0sQ0FBQyxDQUFDO0FBQ3RCLFlBQU0sY0FBYyxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7SUFDOUIsS0FBSztBQUNELFFBQUUsRUFBSSxDQUFBLFFBQU8sa0JBQWtCLEFBQUMsRUFBQyxDQUFDO0FBQ2xDLFlBQU0sVUFBVSxBQUFDLENBQUMsSUFBRyxFQUFJLFVBQVEsQ0FBRSxJQUFFLENBQUMsQ0FBQztJQUMzQztBQUFBLEVBQ0o7QUFDQSxTQUFPLENBQUcsVUFBUyxPQUFNLENBQUcsQ0FBQSxJQUFHLENBQUcsQ0FBQSxPQUFNLENBQUU7QUFDdEMsQUFBSSxNQUFBLENBQUEsR0FBRTtBQUNGLFFBQUEsRUFBSTtBQUNBLGdCQUFNLENBQUcsS0FBRztBQUFHLG1CQUFTLENBQUcsS0FBRztBQUFHLGFBQUcsQ0FBRyxPQUFLO0FBQzVDLGdCQUFNLENBQUcsTUFBSTtBQUFHLGVBQUssQ0FBRyxNQUFJO0FBQUcsaUJBQU8sQ0FBRyxNQUFJO0FBQUcsZ0JBQU0sQ0FBRyxNQUFJO0FBQzdELGdCQUFNLENBQUcsRUFBQTtBQUFHLGlCQUFPLENBQUcsRUFBQTtBQUFBLFFBQzFCLENBQUM7QUFDTCxJQUFBLE9BQU8sQUFBQyxDQUFDLENBQUEsQ0FBRyxRQUFNLENBQUMsQ0FBQztBQUNwQixPQUFJLFFBQU8sWUFBWSxDQUFFO0FBQ3JCLFFBQUc7QUFDQyxVQUFFLEVBQUksQ0FBQSxRQUFPLFlBQVksQUFBQyxDQUFDLFdBQVUsQ0FBQyxDQUFDO0FBQ3ZDLFVBQUUsYUFBYSxBQUFDLENBQ1osSUFBRyxDQUFHLENBQUEsQ0FBQSxRQUFRLENBQUcsQ0FBQSxDQUFBLFdBQVcsQ0FBRyxDQUFBLENBQUEsS0FBSyxDQUM1QyxDQUFBLENBQUEsUUFBUSxDQUFHLENBQUEsQ0FBQSxPQUFPLENBQUcsQ0FBQSxDQUFBLFNBQVMsQ0FBRyxDQUFBLENBQUEsUUFBUSxDQUN6QyxDQUFBLENBQUEsUUFBUSxDQUFHLENBQUEsQ0FBQSxTQUFTLENBQUMsQ0FBQztBQUN4QixjQUFNLGNBQWMsQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO01BQzVCLENBQUMsT0FBTSxHQUFFLENBQUU7QUFDUCxVQUFFLEVBQUksQ0FBQSxRQUFPLFlBQVksQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO0FBQ3hDLFVBQUUsVUFBVSxBQUFDLENBQUMsSUFBRyxDQUFHLENBQUEsQ0FBQSxRQUFRLENBQUcsQ0FBQSxDQUFBLFdBQVcsQ0FBQyxDQUFDO0FBQzVDLFFBQUEsT0FBTyxBQUFDLENBQUMsR0FBRSxDQUFHO0FBQ1YsYUFBRyxDQUFHLENBQUEsQ0FBQSxLQUFLO0FBQ2IsZ0JBQU0sQ0FBRyxDQUFBLENBQUEsUUFBUTtBQUFHLGVBQUssQ0FBRyxDQUFBLENBQUEsT0FBTztBQUNuQyxpQkFBTyxDQUFHLENBQUEsQ0FBQSxTQUFTO0FBQUcsZ0JBQU0sQ0FBRyxDQUFBLENBQUEsUUFBUTtBQUN2QyxnQkFBTSxDQUFHLENBQUEsQ0FBQSxRQUFRO0FBQUcsaUJBQU8sQ0FBRyxDQUFBLENBQUEsU0FBUztBQUFBLFFBQ3pDLENBQUMsQ0FBQztBQUNGLGNBQU0sY0FBYyxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7TUFDMUI7QUFBQSxJQUNBO0FBQUEsRUFDSjtBQUFBLEFBQ0osQ0FBQztBQUVELE9BQU8sU0FBUyxFQUFJLFVBQVMsT0FBTSxDQUFHLENBQUEsR0FBRSxDQUFFO0FBQ3RDLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLEdBQUUsV0FBVyxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDaEMsS0FBRyxTQUFTLEFBQUMsQ0FBQyxPQUFNLENBQUcsV0FBUyxDQUFHO0FBQy9CLFVBQU0sQ0FBRyxTQUFPO0FBQ2hCLFdBQU8sQ0FBRyxTQUFPO0FBQUEsRUFDckIsQ0FBQyxDQUFDO0FBQ04sQ0FBQztBQUVELE9BQU8sUUFBUSxFQUFJLFVBQVMsT0FBTSxDQUFHLENBQUEsR0FBRSxDQUFFO0FBQ3JDLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLEdBQUUsV0FBVyxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDaEMsS0FBRyxTQUFTLEFBQUMsQ0FBQyxPQUFNLENBQUcsVUFBUSxDQUFHO0FBQzlCLFVBQU0sQ0FBRyxTQUFPO0FBQ2hCLFdBQU8sQ0FBRyxTQUFPO0FBQUEsRUFDckIsQ0FBQyxDQUFDO0FBQ04sQ0FBQztBQUVELE9BQU8sTUFBTSxFQUFJLFVBQVMsT0FBTSxDQUFHLENBQUEsR0FBRSxDQUFFO0FBQ25DLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLEdBQUUsV0FBVyxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDaEMsS0FBRyxTQUFTLEFBQUMsQ0FBQyxPQUFNLENBQUcsUUFBTSxDQUFHO0FBQzVCLFVBQU0sQ0FBRyxTQUFPO0FBQ2hCLFdBQU8sQ0FBRyxTQUFPO0FBQUEsRUFDckIsQ0FBQyxDQUFDO0FBQ04sQ0FBQztBQUVELEFBQUksRUFBQSxDQUFBLE1BQUssRUFBSSxFQUNULE9BQU0sQ0FDTixRQUFNLENBQ04sT0FBSyxDQUNMLFdBQVMsQ0FDVCxRQUFNLENBQ04sU0FBTyxDQUNQLFlBQVUsQ0FDVixZQUFVLENBQ1YsV0FBUyxDQUNULFlBQVUsQ0FDVixVQUFRLENBQ1IsYUFBVyxDQUNYLGFBQVcsQ0FDWCxTQUFPLENBQ1AsU0FBTyxDQUNQLFNBQU8sQ0FDUCxTQUFPLENBQ1AsT0FBSyxDQUNMLFNBQU8sQ0FDWCxDQUFDO0FBRUQsSUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLENBQUEsTUFBSyxPQUFPLENBQUcsQ0FBQSxDQUFBLEVBQUUsR0FBRztBQUM3QixBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxNQUFLLENBQUUsQ0FBQSxDQUFDLENBQUM7QUFDckIsU0FBTyxDQUFFLEtBQUksQ0FBQyxFQUFJLEVBQUMsU0FBUyxHQUFFLENBQUU7QUFDNUIsU0FBTyxVQUFTLE9BQU0sQ0FBRyxDQUFBLE9BQU0sQ0FBRTtBQUM3QixTQUFHLE1BQU0sQUFBQyxDQUFDLE9BQU0sQ0FBRyxJQUFFLENBQUcsUUFBTSxDQUFDLENBQUM7SUFDckMsQ0FBQztFQUNMLEFBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2I7QUFBQSxBQUVBLEtBQUssUUFBUSxFQUFJLFNBQU8sQ0FBQztBQUNndFA7Ozs7QUM5Rnp1UDtBQUFBLEFBQUMsU0FBUSxBQUFDLENBQUU7QUFFUixBQUFJLElBQUEsQ0FBQSxFQUFDLEVBQUksQ0FBQSxLQUFJLFVBQVUsQ0FBQztBQUN4QixBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxFQUFDLE1BQU0sQ0FBQztBQUNwQixBQUFJLElBQUEsQ0FBQSxFQUFDLEVBQUksQ0FBQSxRQUFPLFVBQVUsQ0FBQztBQUUzQixLQUFJLENBQUMsRUFBQyxLQUFLLENBQUc7QUFHWixLQUFDLEtBQUssRUFBSSxVQUFTLE9BQU0sQ0FBRztBQUMxQixBQUFJLFFBQUEsQ0FBQSxJQUFHLEVBQUksS0FBRyxDQUFDO0FBQ2YsQUFBSSxRQUFBLENBQUEsSUFBRyxFQUFJLENBQUEsS0FBSSxLQUFLLEFBQUMsQ0FBQyxTQUFRLENBQUcsRUFBQSxDQUFDLENBQUM7QUFFbkMsYUFBUyxNQUFJLENBQUMsQUFBQyxDQUFFO0FBQ2YsQUFBSSxVQUFBLENBQUEsb0JBQW1CLEVBQUksQ0FBQSxJQUFHLFVBQVUsR0FBSyxFQUFDLElBQUcsV0FBYSxLQUFHLENBQUMsQ0FBQztBQUNuRSxhQUFPLENBQUEsSUFBRyxNQUFNLEFBQUMsQ0FLZixDQUFDLG9CQUFtQixDQUFBLEVBQUssUUFBTSxDQUFBLEVBQUssS0FBRyxDQUN2QyxDQUFBLElBQUcsT0FBTyxBQUFDLENBQUMsS0FBSSxLQUFLLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQyxDQUNuQyxDQUFDO01BQ0g7QUFBQSxBQUtBLFVBQUksVUFBVSxFQUFJLENBQUEsSUFBRyxVQUFVLENBQUM7QUFFaEMsV0FBTyxNQUFJLENBQUM7SUFDZCxDQUFDO0VBQ0g7QUFBQSxBQUVKLENBQUMsQUFBQyxFQUFDLENBQUM7QUFFSixLQUFLLFFBQVEsRUFBSTtBQUViLE9BQUssQ0FBRyxTQUFTLE9BQUssQ0FBRSxHQUFFLENBQUcsQ0FBQSxHQUFFLENBQUU7QUFDN0IsT0FBSSxHQUFFLENBQUc7QUFDTCxVQUFTLEdBQUEsQ0FBQSxHQUFFLENBQUEsRUFBSyxJQUFFLENBQUc7QUFDakIsV0FBSSxHQUFFLGVBQWUsQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFHO0FBQ3pCLFlBQUUsQ0FBRSxHQUFFLENBQUMsRUFBSSxDQUFBLEdBQUUsQ0FBRSxHQUFFLENBQUMsQ0FBQztRQUN2QjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsQUFDQSxTQUFPLElBQUUsQ0FBQztFQUNkO0FBRUEsSUFBRSxDQUFHLFVBQVMsR0FBRSxDQUFHLENBQUEsUUFBTyxDQUFHLENBQUEsT0FBTSxDQUFHO0FBQ2xDLEFBQUksTUFBQSxDQUFBLEdBQUUsRUFBSSxDQUFBLEdBQUUsT0FBTyxJQUFNLEVBQUEsQ0FBQztBQUMxQixBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksSUFBSSxNQUFJLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQztBQUM3QixBQUFJLE1BQUEsQ0FBQSxHQUFFLEVBQUksRUFBQSxDQUFDO0FBQ1gsT0FBSSxDQUFDLE9BQU0sQ0FBRztBQUNWLFlBQU0sRUFBSSxJQUFFLENBQUM7SUFDakI7QUFBQSxBQUNBLFVBQU8sR0FBRSxFQUFJLElBQUUsQ0FBRztBQUNkLGFBQU8sQ0FBRSxHQUFFLENBQUMsRUFBSSxDQUFBLFFBQU8sS0FBSyxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsR0FBRSxDQUFFLEdBQUUsQ0FBQyxDQUFHLElBQUUsQ0FBRyxJQUFFLENBQUMsQ0FBQztBQUMxRCxRQUFFLEVBQUUsQ0FBQztJQUNUO0FBQUEsQUFDQSxTQUFPLFNBQU8sQ0FBQztFQUNuQjtBQUFBLEFBRUosQ0FBQztBQUV3Z0s7Ozs7O0FDekV6Z0s7QUFBQSxBQUFJLEVBQUEsQ0FBQSxDQUFBLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztBQUMxQixBQUFJLEVBQUEsQ0FBQSxPQUFNLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxhQUFZLENBQUMsUUFBUSxDQUFDO0FBQzVDLEFBQUksRUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFDO0FBQ3BDLEFBQUksRUFBQSxDQUFBLGNBQWEsRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLGtCQUFpQixDQUFDLENBQUM7QUFDaEQsQUFBSSxFQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsWUFBVyxDQUFDLENBQUM7QUFHcEMsQUFBSSxFQUFBLENBQUEsbUJBQWtCLEVBQUksSUFBRSxDQUFDO0FBQzdCLEFBQUksRUFBQSxDQUFBLFlBQVcsRUFBSSxHQUFDLENBQUM7QUFDckIsQUFBSSxFQUFBLENBQUEsY0FBYSxFQUFJLEdBQUMsQ0FBQztBQUN2QixBQUFJLEVBQUEsQ0FBQSxZQUFXLEVBQUksR0FBQyxDQUFDO0FBQ3JCLEFBQUksRUFBQSxDQUFBLG9CQUFtQixFQUFJLEdBQUMsQ0FBQztBQUU3QixPQUFTLFlBQVUsQ0FBRSxJQUFHLENBQUc7QUFDdkIsT0FBTyxJQUFJLFFBQU0sQUFBQyxDQUFDLFNBQVUsT0FBTSxDQUFHLENBQUEsTUFBSyxDQUFHO0FBQzFDLE9BQUksWUFBVyxPQUFPLElBQU0sRUFBQSxDQUFHO0FBQzNCLEFBQUksUUFBQSxDQUFBLEtBQUksRUFBSSxDQUFBLElBQUcsTUFBTSxDQUFDO0FBQ3RCLFVBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxLQUFJLFVBQVUsT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDN0MsV0FBSSxLQUFJLFVBQVUsQ0FBRSxDQUFBLENBQUMsS0FBSyxJQUFNLEtBQUcsQ0FBRztBQUNsQyxnQkFBTSxBQUFDLENBQUMsS0FBSSxVQUFVLENBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQztRQUMvQjtBQUFBLE1BQ0o7QUFBQSxJQUNKLEtBQU87QUFDSCxpQkFBVyxDQUFFLENBQUEsQ0FBQyxBQUFDLENBQUMsSUFBRyxDQUFHLFVBQVUsSUFBRyxDQUFHO0FBQ2xDLGNBQU0sQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO01BQ2pCLENBQUMsQ0FBQztJQUNOO0FBQUEsRUFDSixDQUFDLENBQUM7QUFDTjtBQUFBLEFBQ0ksRUFBQSxDQUFBLFVBQVMsRUFBSSxNQUFJLENBQUM7QUFFdEIsQUFBSSxFQUFBLENBQUEsTUFBSyxFQUFJLEVBQ1QsT0FBTSxDQUNOLFFBQU0sQ0FDTixPQUFLLENBQ0wsV0FBUyxDQU9ULFlBQVUsQ0FFVixhQUFXLENBQ1gsYUFBVyxDQUNYLFdBQVMsQ0FDVCxZQUFVLENBQ1YsVUFBUSxDQUNSLFNBQU8sQ0FHWCxDQUFDO0FBRUQsT0FBUyxjQUFZLENBQUUsUUFBTyxDQUFHLENBQUEsYUFBWSxDQUFHO0FBQzlDLEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxDQUFBLFFBQU8sQ0FBRSxhQUFZLENBQUMsQ0FBQztBQUNuQyxBQUFJLElBQUEsQ0FBQSxTQUFRLEVBQUksQ0FBQSxLQUFJLEdBQUssQ0FBQSxLQUFJLFVBQVUsQ0FBQztBQUV4QyxLQUFJLFNBQVEsQ0FBRztBQUNiLFNBQU8sQ0FBQSxPQUFNLElBQUksQUFBQyxDQUFDLENBQUEsSUFBSSxBQUFDLENBQUMsU0FBUSxDQUFHLFVBQVUsWUFBVyxDQUFHO0FBQzFELFdBQU8sQ0FBQSxXQUFVLEFBQUMsQ0FBQyxZQUFXLENBQUMsS0FBSyxBQUFDLENBQUMsU0FBVSxhQUFZLENBQUc7QUFDN0Qsb0JBQVksRUFBSSxDQUFBLElBQUcsTUFBTSxBQUFDLENBQUMsSUFBRyxVQUFVLEFBQUMsQ0FBQyxhQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ3pELGFBQU8sQ0FBQSxlQUFjLEFBQUMsQ0FBQyxhQUFZLENBQUMsS0FBSyxBQUFDLENBQUMsU0FBUyxBQUFDLENBQUU7QUFDckQsQUFBSSxZQUFBLENBQUEsUUFBTyxFQUFJLEdBQUMsQ0FBQztBQUNqQixjQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLENBQUEsYUFBWSxNQUFNLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQ25ELG1CQUFPLEtBQUssQUFBQyxDQUFDLGFBQVksTUFBTSxDQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7VUFDdkM7QUFBQSxBQUNBLGVBQU8sU0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FBQztNQUNKLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0VBQ0wsS0FBTztBQUNMLFNBQU8sQ0FBQSxPQUFNLFFBQVEsQUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0VBQzVCO0FBQUEsQUFDRjtBQUFBLEFBRUEsT0FBUyxpQkFBZSxDQUFHLFFBQU8sQ0FBRztBQUNuQyxPQUFPLENBQUEsYUFBWSxBQUFDLENBQUMsUUFBTyxDQUFHLFFBQU0sQ0FBQyxDQUFDO0FBQ3pDO0FBQUEsQUFFQSxPQUFTLGtCQUFnQixDQUFHLFFBQU8sQ0FBRztBQUNwQyxPQUFPLENBQUEsYUFBWSxBQUFDLENBQUMsUUFBTyxDQUFHLFVBQVEsQ0FBQyxDQUFDO0FBQzNDO0FBQUEsQUFFQSxPQUFTLHlCQUF1QixDQUFFLEtBQUksQ0FBRztBQUNyQyxBQUFJLElBQUEsQ0FBQSxRQUFPLEVBQUksR0FBQyxDQUFDO0FBQ2pCLEFBQUksSUFBQSxDQUFBLGdCQUFlLENBQUM7QUFDcEIsTUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLEtBQUksT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDbkMsQUFBSSxNQUFBLENBQUEsU0FBUSxFQUFJLENBQUEsS0FBSSxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ3hCLE9BQUksQ0FBQSxFQUFJLEVBQUEsQ0FBRztBQUNQLFVBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxLQUFJLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQ25DLEFBQUksVUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLFNBQVEsQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUN2QixBQUFJLFVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFBLENBQUksQ0FBQSxJQUFHLFVBQVUsRUFBSSxDQUFBLFNBQVEsQ0FBRSxDQUFBLEVBQUksRUFBQSxDQUFDLFVBQVUsQ0FBQSxDQUFJLEdBQUMsQ0FBQztBQUNuRSx1QkFBZSxHQUFLLEtBQUcsQ0FBQztBQUN4QixnQkFBUSxDQUFFLENBQUEsQ0FBQyxVQUFVLEVBQUksaUJBQWUsQ0FBQztNQUM3QztBQUFBLElBQ0osS0FBTztBQUNILHFCQUFlLEVBQUksQ0FBQSxTQUFRLENBQUUsQ0FBQSxDQUFDLFVBQVUsQ0FBQztJQUM3QztBQUFBLEFBQ0EsV0FBTyxFQUFJLENBQUEsUUFBTyxPQUFPLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQztFQUN6QztBQUFBLEFBQ0EsT0FBTyxTQUFPLENBQUM7QUFDbkI7QUFBQSxBQUVBLE9BQVMsZ0JBQWMsQ0FBRyxRQUFPLENBQUc7QUFDaEMsQUFBSSxJQUFBLENBQUEsUUFBTyxFQUFJLEdBQUMsQ0FBQztBQUNqQixPQUFPLENBQUEsT0FBTSxJQUFJLEFBQUMsQ0FBQyxDQUNmLGdCQUFlLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FDekIsQ0FBQSxpQkFBZ0IsQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUM5QixDQUFDLEtBQUssQUFBQyxDQUFDLFNBQVUsVUFBUyxDQUFHO0FBQzFCLEFBQUksTUFBQSxDQUFBLFNBQVEsRUFBSSxDQUFBLFVBQVMsQ0FBRSxDQUFBLENBQUMsT0FBTyxBQUFDLENBQUMsQ0FBQyxRQUFPLE1BQU0sQ0FBQyxDQUFHLENBQUEsVUFBUyxDQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7QUFDckUsV0FBTyxNQUFNLEVBQUksQ0FBQSx3QkFBdUIsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFDO0VBQ3hELENBQUMsQ0FBQztBQUNOO0FBQUEsQUFFQSxPQUFTLFFBQU0sQ0FBRSxRQUFPLENBQUcsQ0FBQSxHQUFFLENBQUcsQ0FBQSxNQUFLLENBQUc7QUFDcEMsS0FBRyxVQUFVLEFBQUMsQ0FBQyxjQUFhLENBQUMsQ0FBQztBQUM5QixPQUFLLEVBQUksQ0FBQSxNQUFLLEdBQUssR0FBQyxDQUFDO0FBRXJCLEFBQUksSUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLFFBQU8sTUFBTSxDQUFFLEdBQUUsQ0FBQyxDQUFDO0FBQzlCLEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxDQUFBLElBQUcsTUFBTSxDQUFDO0FBQ3RCLEtBQUksSUFBRyxHQUFLLENBQUEsS0FBSSxPQUFPLEdBQUssVUFBUSxDQUFHO0FBQ25DLFFBQUksSUFBSSxTQUFTLEVBQUksU0FBTyxDQUFDO0FBQzdCLFFBQUksSUFBSSxVQUFVLEVBQUksSUFBRSxDQUFDO0FBQ3pCLE9BQUksSUFBRyxVQUFVLEdBQUssT0FBSyxDQUFHO0FBQzFCLEFBQUksUUFBQSxDQUFBLFdBQVUsRUFBSSxDQUFBLElBQUcsS0FBSyxJQUFJLFNBQVMsRUFBSSxLQUFHLENBQUEsQ0FBSSxDQUFBLElBQUcsS0FBSyxJQUFJLEtBQUssQ0FBQztBQUNwRSxBQUFJLFFBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxJQUFHLEtBQUssSUFBSSxPQUFPLENBQUM7QUFDakMsQUFBSSxRQUFBLENBQUEsSUFBRyxFQUFJLENBQUEsSUFBRyxLQUFLLElBQUksS0FBSyxDQUFDO0FBRTdCLFNBQUksTUFBSyxHQUFLLEVBQUMsTUFBSyxPQUFPLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBRztBQUMvQixhQUFLLEVBQUksQ0FBQSxHQUFFLEVBQUksT0FBSyxDQUFDO01BQ3pCO0FBQUEsQUFDSSxRQUFBLENBQUEsU0FBUSxFQUFJLENBQUEsQ0FBQyxRQUFPLFNBQVMsRUFBSSxLQUFHLENBQUEsQ0FBSSxDQUFBLFFBQU8sS0FBSyxDQUFBLENBQUksQ0FBQSxRQUFPLE9BQU8sQ0FBQyxJQUFNLEVBQUMsV0FBVSxFQUFJLE9BQUssQ0FBQyxDQUFDO0FBQ3ZHLFdBQUssU0FBUyxRQUFRLEFBQUMsQ0FBQyxXQUFVLEVBQUksS0FBRyxDQUFBLENBQUksT0FBSyxDQUFDLENBQUM7QUFFcEQsU0FBSSxJQUFHLE1BQU0sU0FBUyxJQUFJLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBRztBQUN0QyxjQUFNLElBQUksQUFBQyxDQUFDLENBQUMsUUFBTyxTQUFTLEVBQUksQ0FBQSxRQUFPLEtBQUssQ0FBQSxDQUFJLENBQUEsUUFBTyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLGNBQU0sSUFBSSxBQUFDLENBQUMsQ0FBQyxJQUFHLEtBQUssSUFBSSxTQUFTLEVBQUksQ0FBQSxJQUFHLEtBQUssSUFBSSxLQUFLLENBQUEsQ0FBSSxDQUFBLElBQUcsS0FBSyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7TUFDbkY7QUFBQSxBQUlBLFNBQUksU0FBUSxDQUFHO0FBQ1gsYUFBSyxTQUFTLE9BQU8sQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO01BQ2hDO0FBQUEsSUFFSixLQUFPLEtBQUksSUFBRyxVQUFVLEdBQUssVUFBUSxDQUFHO0FBQ3BDLFNBQUksS0FBSSxRQUFRLENBQUc7QUFDZixrQkFBVSxBQUFDLENBQUMsUUFBTyxDQUFHLElBQUUsQ0FBRyxPQUFLLENBQUcsQ0FBQSxJQUFHLEtBQUssT0FBTyxDQUFDLENBQUM7TUFDeEQ7QUFBQSxJQUNKLEtBQU87QUFDSCxBQUFJLFFBQUEsQ0FBQSxPQUFNLEVBQUksQ0FBQSxJQUFHLEtBQUssUUFBUSxDQUFDO0FBQy9CLEFBQUksUUFBQSxDQUFBLEtBQUksRUFBSSxDQUFBLFFBQU8sTUFBTSxDQUFDO0FBQzFCLEFBQUksUUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLG1CQUFrQixBQUFDLENBQUMsSUFBRyxDQUFDLENBQUM7QUFHeEMsU0FBSSxNQUFPLE9BQUssQ0FBRSxRQUFPLENBQUMsQ0FBQSxFQUFLLFlBQVUsQ0FBQSxFQUFLLENBQUEsSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUEsRUFBSyxXQUFTLENBQUc7QUFDbkcsQUFBSSxVQUFBLENBQUEsSUFBRyxDQUFDO0FBQ1IsQUFBSSxVQUFBLENBQUEsTUFBSyxFQUFJLE1BQUksQ0FBQztBQUNsQixZQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksQ0FBQSxLQUFJLE9BQU8sRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksSUFBRSxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDM0MsQUFBSSxZQUFBLENBQUEsU0FBUSxFQUFJLENBQUEsS0FBSSxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ3hCLEFBQUksWUFBQSxDQUFBLGFBQVksRUFBSSxDQUFBLG1CQUFrQixBQUFDLENBQUMsU0FBUSxDQUFDLENBQUM7QUFDbEQsYUFBSSxRQUFPLElBQU0sY0FBWSxDQUFHO0FBQzlCLGVBQUksQ0FBQyxJQUFHLENBQUc7QUFDUCxpQkFBRyxFQUFJLEVBQUMsU0FBUSxVQUFVLEVBQUksQ0FBQSxJQUFHLFVBQVUsQ0FBQyxDQUFDO0FBQzdDLG1CQUFLLEVBQUksQ0FBQSxDQUFDLGVBQWMsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFBLEVBQUssQ0FBQSxJQUFHLEVBQUksb0JBQWtCLENBQUM7WUFDdEUsS0FBTyxLQUFJLGlCQUFnQixBQUFDLENBQUMsU0FBUSxDQUFDLENBQUc7QUFDckMsbUJBQUssRUFBSSxNQUFJLENBQUM7QUFDZCxtQkFBSztZQUNUO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxBQUVBLGFBQUssQ0FBRSxRQUFPLENBQUMsRUFBSSxPQUFLLENBQUM7TUFDM0I7QUFBQSxBQUdBLFNBQUksTUFBSyxDQUFFLG1CQUFrQixBQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBRztBQUNuQyxrQkFBVSxBQUFDLENBQUMsUUFBTyxDQUFHLElBQUUsQ0FBRyxPQUFLLENBQUMsQ0FBQztNQUN0QyxLQUFPO0FBQ0gsNkJBQXFCLEFBQUMsQ0FBQyxRQUFPLENBQUcsS0FBRyxDQUFHLFFBQU0sQ0FBRyxDQUFBLFVBQVMsQUFBQyxDQUFDLFFBQU8sQ0FBRyxJQUFFLENBQUMsQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFVLElBQUcsQ0FBRztBQUM5RixBQUFJLFlBQUEsQ0FBQSxHQUFFLEVBQUksQ0FBQSxJQUFHLENBQUUsQ0FBQSxDQUFDLENBQUM7QUFDakIsQUFBSSxZQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsR0FBRSxRQUFRLFlBQVksQUFBQyxFQUFDLENBQUM7QUFDdkMsQUFBSSxZQUFBLENBQUEsa0JBQWlCLEVBQUksQ0FBQSxPQUFNLElBQU0sUUFBTSxDQUFBLEVBQUssQ0FBQSxPQUFNLElBQU0sV0FBUyxDQUFBLEVBQUssQ0FBQSxHQUFFLGFBQWEsQUFBQyxDQUFDLGlCQUFnQixDQUFDLENBQUM7QUFFN0csYUFBSSxNQUFLLFFBQVEsQUFBQyxDQUFDLElBQUcsVUFBVSxDQUFDLENBQUEsRUFBSyxFQUFBLENBQUc7QUFDdkMsQUFBSSxjQUFBLENBQUEsT0FBTSxFQUFJLEdBQUMsQ0FBQztBQUNoQixlQUFJLElBQUcsS0FBSyxPQUFPLENBQUc7QUFDcEIsb0JBQU0sTUFBTSxFQUFJLENBQUEsT0FBTSxPQUFPLEVBQUksQ0FBQSxJQUFHLEtBQUssT0FBTyxDQUFDO1lBQ25EO0FBQUEsQUFHQSxlQUFJLE1BQU8sS0FBRyxLQUFLLE1BQU0sQ0FBQSxFQUFLLFlBQVUsQ0FBQSxFQUFLLENBQUEsTUFBTyxLQUFHLEtBQUssV0FBVyxDQUFBLEVBQUssWUFBVSxDQUFHO0FBQ3ZGLEFBQUksZ0JBQUEsQ0FBQSxPQUFNLEVBQUksQ0FBQSxJQUFHLEtBQUssV0FBVyxFQUFJLENBQUEsSUFBRyxLQUFLLFdBQVcsRUFBSSxFQUFFLE9BQU0sQ0FBRyxDQUFBLElBQUcsS0FBSyxNQUFNLENBQUUsQ0FBQztBQUN4RixjQUFBLE9BQU8sQUFBQyxDQUFDLEdBQUUsQ0FBRyxRQUFNLENBQUMsQ0FBQztZQUN4QjtBQUFBLEFBR0EsZUFBSSxDQUFDLElBQUcsVUFBVSxHQUFLLFFBQU0sQ0FBQSxFQUFLLENBQUEsSUFBRyxVQUFVLEdBQUssT0FBSyxDQUFDLEdBQUssQ0FBQSxHQUFFLENBQUUsSUFBRyxVQUFVLENBQUMsQ0FBRztBQUNsRixnQkFBRSxDQUFFLElBQUcsVUFBVSxDQUFDLEFBQUMsRUFBQyxDQUFDO1lBQ3ZCLEtBQU8sS0FBSSxJQUFHLFVBQVUsSUFBTSxTQUFPLENBQUc7QUFFcEMsaUJBQUksa0JBQWlCLENBQUc7QUFDcEIsdUJBQU8sTUFBTSxBQUFDLENBQUMsR0FBRSxDQUFHLFFBQU0sQ0FBQyxDQUFDO2NBQ2hDO0FBQUEsQUFDQSxxQkFBTyxNQUFNLEFBQUMsQ0FBQyxHQUFFLENBQUcsU0FBTyxDQUFDLENBQUM7WUFDakMsS0FBTztBQUNMLHFCQUFPLENBQUUsSUFBRyxVQUFVLENBQUMsQUFBQyxDQUFDLEdBQUUsQ0FBRyxRQUFNLENBQUMsQ0FBQztZQUN4QztBQUFBLFVBQ0Y7QUFBQSxBQUVBLGFBQUksSUFBRyxVQUFVLEdBQUssV0FBUyxDQUFHO0FBQ2hDLEFBQUksY0FBQSxDQUFBLEdBQUUsRUFBSSxDQUFBLE1BQUssYUFBYSxBQUFDLENBQUMsSUFBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDO0FBQ2hELG1CQUFPLFFBQVEsQUFBQyxDQUFDLEdBQUUsQ0FBRyxJQUFFLENBQUMsQ0FBQztBQUMxQixtQkFBTyxTQUFTLEFBQUMsQ0FBQyxHQUFFLENBQUcsSUFBRSxDQUFDLENBQUM7QUFFM0IsY0FBRSxNQUFNLEVBQUksQ0FBQSxJQUFHLEtBQUssTUFBTSxDQUFDO0FBQzNCLG1CQUFPLE1BQU0sQUFBQyxDQUFDLEdBQUUsQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUU3QixtQkFBTyxNQUFNLEFBQUMsQ0FBQyxHQUFFLENBQUcsSUFBRSxDQUFDLENBQUM7QUFDeEIsZUFBSSxrQkFBaUIsQ0FBRztBQUNwQixxQkFBTyxNQUFNLEFBQUMsQ0FBQyxHQUFFLENBQUcsUUFBTSxDQUFDLENBQUM7WUFDaEM7QUFBQSxVQUNGO0FBQUEsQUFFQSxhQUFJLElBQUcsVUFBVSxHQUFLLFdBQVMsQ0FBQSxFQUFLLENBQUEsSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUc7QUFDdEUsZUFBRyxVQUFVLEFBQUMsQ0FBQyxZQUFXLEVBQUksQ0FBQSxJQUFHLFVBQVUsQUFBQyxDQUFDLE9BQU0sVUFBVSxDQUFDLENBQUEsQ0FBSyxtQkFBaUIsQ0FBQSxDQUFLLENBQUEsSUFBRyxLQUFLLEtBQUssQ0FBQSxDQUFJLElBQUUsQ0FBQyxDQUFDO1VBQ2hIO0FBQUEsQUFFQSxhQUFJLEtBQUksUUFBUSxDQUFHO0FBQ2pCLHNCQUFVLEFBQUMsQ0FBQyxRQUFPLENBQUcsSUFBRSxDQUFHLE9BQUssQ0FBQyxDQUFDO1VBQ3BDO0FBQUEsUUFDRixDQUFHLFVBQVUsTUFBSyxDQUFHO0FBQ2pCLGFBQUksSUFBRyxVQUFVLEdBQUssV0FBUyxDQUFHO0FBQ2hDLGVBQUcsVUFBVSxBQUFDLENBQUMsWUFBVyxFQUFJLE9BQUssQ0FBQyxDQUFDO0FBQ3JDLGVBQUcsYUFBYSxBQUFDLENBQUMsS0FBSSxDQUFDLENBQUM7VUFDMUIsS0FBTyxLQUFJLGVBQWMsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFHO0FBQzlCLGVBQUcsWUFBWSxBQUFDLENBQUMsa0JBQWlCLEVBQUksSUFBRSxDQUFBLENBQUksWUFBVSxDQUFBLENBQUksQ0FBQSxJQUFHLFVBQVUsQ0FBQSxDQUFJLFlBQVUsQ0FBQSxDQUFJLE9BQUssQ0FBQyxDQUFDO0FBQ2hHLGVBQUcsYUFBYSxBQUFDLENBQUMsS0FBSSxDQUFDLENBQUM7VUFDNUIsS0FBTztBQUNMLGVBQUksSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUc7QUFDdEMsaUJBQUcsVUFBVSxBQUFDLENBQUMsTUFBSyxDQUFDLENBQUM7WUFDeEI7QUFBQSxBQUNBLGVBQUksS0FBSSxRQUFRLENBQUc7QUFDakIsd0JBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBRyxJQUFFLENBQUcsT0FBSyxDQUFDLENBQUM7WUFDcEM7QUFBQSxVQUNGO0FBQUEsUUFDSixDQUFDLENBQUM7TUFDTjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsQUFDSjtBQUFBLEFBRUEsT0FBUyxlQUFhLENBQUUsWUFBVyxDQUFHO0FBQ2xDLEFBQUksSUFBQSxDQUFBLEVBQUMsRUFBSSxDQUFBLFFBQU8sY0FBYyxBQUFDLENBQUMsWUFBVyxDQUFDLENBQUM7QUFDN0MsT0FBTyxJQUFJLFFBQU0sQUFBQyxDQUFDLFNBQVUsT0FBTSxDQUFHLENBQUEsTUFBSyxDQUFHO0FBQzFDLE1BQUk7QUFDQSxTQUFJLENBQUMsTUFBSyxRQUFRLENBQUc7QUFDakIsWUFBTSxJQUFJLE1BQUksQUFBQyxDQUFDLDBDQUF5QyxDQUFDLENBQUM7TUFDL0Q7QUFBQSxBQUNBLFNBQUksT0FBTSxlQUFlLENBQUc7QUFDeEIsY0FBTSxlQUFlLEFBQUMsQ0FBQyxFQUFDLENBQUMsV0FBVyxBQUFDLENBQUMsT0FBTSxDQUFDLENBQUM7TUFDbEQsS0FBTztBQUNILFdBQUksQ0FBQyxPQUFNLFFBQVEsQUFBQyxDQUFDLEVBQUMsQ0FBQyxTQUFTLEFBQUMsRUFBQyxDQUFHO0FBQ2pDLGNBQU0sSUFBSSxNQUFJLEFBQUMsQ0FBQyxnQkFBZSxFQUFJLGFBQVcsQ0FBQSxDQUFJLHFCQUFtQixDQUFBLENBQ2pFLDBDQUF3QyxDQUFDLENBQUM7UUFDbEQ7QUFBQSxBQUNBLGNBQU0sUUFBUSxBQUFDLENBQUMsRUFBQyxDQUFDLFNBQVMsQUFBQyxFQUFDLElBQUksQUFBQyxDQUFDLFVBQVMsQ0FBQyxnQ0FDZixBQUFDLENBQUMsT0FBTSxDQUFDLENBQUM7TUFDNUM7QUFBQSxJQUNKLENBQUUsT0FBTyxHQUFFLENBQUc7QUFDVixXQUFLLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQztJQUNmO0FBQUEsRUFDSixDQUFDLENBQUM7QUFDTjtBQUFBLEFBRUEsT0FBUyxnQkFBYyxDQUFFLElBQUcsQ0FBRztBQUMzQixPQUFPLENBQUEsSUFBRyxVQUFVLEdBQUssYUFBVyxDQUFBLEVBQzdCLENBQUEsSUFBRyxVQUFVLEdBQUssV0FBUyxDQUFBLEVBQzNCLENBQUEsSUFBRyxVQUFVLEdBQUssYUFBVyxDQUFBLEVBQzdCLENBQUEsSUFBRyxVQUFVLEdBQUssWUFBVSxDQUFBLEVBQzVCLENBQUEsSUFBRyxVQUFVLEdBQUssT0FBSyxDQUFBLEVBQ3ZCLENBQUEsSUFBRyxVQUFVLEdBQUssUUFBTSxDQUFDO0FBQ3BDO0FBQUEsQUFLQSxPQUFTLGtCQUFnQixDQUFFLElBQUcsQ0FBRztBQUM3QixBQUFJLElBQUEsQ0FBQSxHQUFFLEVBQUksQ0FBQSxJQUFHLFVBQVUsQ0FBQztBQVd4QixPQUFPLENBQUEsR0FBRSxRQUFRLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQSxHQUFNLEVBQUEsQ0FBQSxFQUFLLENBQUEsR0FBRSxRQUFRLEFBQUMsQ0FBQyxXQUFVLENBQUMsQ0FBQSxHQUFNLEVBQUEsQ0FBQSxFQUFLLENBQUEsR0FBRSxRQUFRLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBQSxHQUFNLEVBQUEsQ0FBQztBQUN2RztBQUFBLEFBRUEsT0FBUyx1QkFBcUIsQ0FBRSxRQUFPLENBQUcsQ0FBQSxJQUFHLENBQUcsQ0FBQSxPQUFNLENBQUcsQ0FBQSxPQUFNLENBQUcsQ0FBQSxXQUFVLENBQUc7QUFDM0UsQUFBSSxJQUFBLENBQUEsT0FBTSxDQUFDO0FBQ1gsT0FBTyxJQUFJLFFBQU0sQUFBQyxDQUFDLFNBQVUsT0FBTSxDQUFHLENBQUEsTUFBSyxDQUFHO0FBQzFDLFdBQVMsUUFBTSxDQUFDLEFBQUMsQ0FBRTtBQUNmLFNBQUksQ0FBQyxPQUFNLENBQUc7QUFDVixjQUFNLEVBQUksQ0FBQSxHQUFJLEtBQUcsQUFBQyxFQUFDLFFBQVEsQUFBQyxFQUFDLENBQUM7TUFDbEM7QUFBQSxBQUVJLFFBQUEsQ0FBQSxJQUFHLENBQUM7QUFDUixBQUFJLFFBQUEsQ0FBQSxZQUFXLEVBQUksTUFBSSxDQUFDO0FBQ3hCLEFBQUksUUFBQSxDQUFBLFVBQVMsRUFBSSxNQUFJLENBQUM7QUFDdEIsQUFBSSxRQUFBLENBQUEsa0JBQWlCLEVBQUksTUFBSSxDQUFDO0FBQzlCLEFBQUksUUFBQSxDQUFBLGVBQWMsRUFBSSxDQUFBLE9BQU0sVUFBVSxNQUFNLEFBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNoRCxBQUFJLFFBQUEsQ0FBQSxXQUFVLEVBQUksQ0FBQSxJQUFHLEtBQUssS0FBSyxDQUFDO0FBQ2hDLEFBQUksUUFBQSxDQUFBLFVBQVMsRUFBSSxDQUFBLElBQUcsS0FBSyxXQUFXLEdBQUssU0FBTyxDQUFDO0FBQ2pELG9CQUFjLFFBQVEsQUFBQyxDQUFDLG1CQUFrQixFQUFJLENBQUEsT0FBTSxTQUFTLENBQUEsQ0FBSSxLQUFHLENBQUMsQ0FBQztBQUN0RSxVQUFTLEdBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQSxDQUFHLENBQUEsQ0FBQSxFQUFJLENBQUEsZUFBYyxPQUFPLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUM3QyxBQUFJLFVBQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxlQUFjLENBQUUsQ0FBQSxDQUFDLENBQUM7QUFDakMsV0FBSSxlQUFjLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBRztBQUN2QixpQkFBTyxHQUFLLFdBQVMsQ0FBQztRQUMxQjtBQUFBLEFBQ0EsV0FBRyxFQUFJLENBQUEsQ0FBQSxBQUFDLENBQUMsUUFBTyxDQUFDLENBQUM7QUFDbEIsV0FBSSxJQUFHLE9BQU8sR0FBSyxFQUFBLENBQUc7QUFDbEIsYUFBSSxNQUFPLFlBQVUsQ0FBQSxFQUFLLFlBQVUsQ0FBRztBQUNuQyxBQUFJLGNBQUEsQ0FBQSxPQUFNLEVBQUksQ0FBQSxDQUFBLEFBQUMsQ0FBQyxJQUFHLENBQUUsQ0FBQSxDQUFDLENBQUMsS0FBSyxBQUFDLEVBQUMsQ0FBQztBQUMvQixlQUFJLENBQUMsVUFBUyxJQUFNLFNBQU8sQ0FBQSxFQUFLLENBQUEsT0FBTSxJQUFNLFlBQVUsQ0FBQyxHQUNuRCxFQUFDLFVBQVMsSUFBTSxXQUFTLENBQUEsRUFBSyxDQUFBLE9BQU0sUUFBUSxBQUFDLENBQUMsV0FBVSxDQUFDLENBQUEsRUFBSyxFQUFBLENBQUMsQ0FBRztBQUNsRSx1QkFBUyxFQUFJLEtBQUcsQ0FBQztBQUNqQixtQkFBSztZQUNULEtBQU87QUFDSCwrQkFBaUIsRUFBSSxLQUFHLENBQUM7WUFDN0I7QUFBQSxVQUNKLEtBQU87QUFDSCxxQkFBUyxFQUFJLEtBQUcsQ0FBQztBQUNqQixlQUFHLEtBQUssQUFBQyxDQUFDLGdCQUFlLENBQUcsQ0FBQSxPQUFNLFNBQVMsQ0FBQyxDQUFDO0FBQzdDLGlCQUFLO1VBQ1Q7QUFBQSxBQUNBLGVBQUs7UUFDVCxLQUFPLEtBQUksSUFBRyxPQUFPLEVBQUksRUFBQSxDQUFHO0FBQ3hCLHFCQUFXLEVBQUksS0FBRyxDQUFDO1FBQ3ZCO0FBQUEsTUFDSjtBQUFBLEFBRUEsU0FBSSxVQUFTLENBQUc7QUFDWixjQUFNLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQztNQUNqQixLQUFPLEtBQUksZUFBYyxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUEsRUFBSyxDQUFBLENBQUMsR0FBSSxLQUFHLEFBQUMsRUFBQyxRQUFRLEFBQUMsRUFBQyxDQUFBLENBQUksUUFBTSxDQUFDLEVBQUksQ0FBQSxPQUFNLEVBQUksRUFBQSxDQUFHO0FBQ2hGLGlCQUFTLEFBQUMsQ0FBQyxPQUFNLENBQUcsR0FBQyxDQUFDLENBQUM7TUFDM0IsS0FBTztBQUNILEFBQUksVUFBQSxDQUFBLE1BQUssRUFBSSxHQUFDLENBQUM7QUFDZixXQUFJLFlBQVcsQ0FBRztBQUNkLGVBQUssRUFBSSxDQUFBLG9EQUFtRCxFQUFJLENBQUEsSUFBRyxVQUFVLEFBQUMsQ0FBQyxPQUFNLFVBQVUsQ0FBQyxDQUFBLENBQUksY0FBWSxDQUFBLENBQUksQ0FBQSxJQUFHLFVBQVUsQ0FBQSxDQUFJLHFDQUFtQyxDQUFDO1FBQzdLLEtBQU8sS0FBSSxrQkFBaUIsQ0FBRztBQUMzQixlQUFLLEVBQUksQ0FBQSxvREFBbUQsRUFBSSxDQUFBLElBQUcsVUFBVSxBQUFDLENBQUMsT0FBTSxVQUFVLENBQUMsQ0FBQSxDQUFJLGNBQVksQ0FBQSxDQUFJLENBQUEsSUFBRyxVQUFVLENBQUEsQ0FBSSxnREFBOEMsQ0FBQSxDQUFJLFlBQVUsQ0FBQSxDQUFJLGNBQVksQ0FBQSxDQUFJLENBQUEsSUFBRyxLQUFLLEFBQUMsRUFBQyxDQUFBLENBQUksS0FBRyxDQUFDO1FBQzNPLEtBQU87QUFDSCxlQUFLLEVBQUksQ0FBQSxvREFBbUQsRUFBSSxDQUFBLElBQUcsVUFBVSxBQUFDLENBQUMsT0FBTSxVQUFVLENBQUMsQ0FBQSxDQUFJLGNBQVksQ0FBQSxDQUFJLENBQUEsSUFBRyxVQUFVLENBQUEsQ0FBSSwrQkFBNkIsQ0FBQztRQUN2SztBQUFBLEFBQ0EsYUFBSyxBQUFDLENBQUMsTUFBSyxDQUFDLENBQUM7TUFDbEI7QUFBQSxJQUNKO0FBQUEsQUFFSSxNQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7QUFDbkQsQUFBSSxNQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsbUJBQWtCLEVBQUksRUFBQyxLQUFJLElBQU0sV0FBUyxDQUFBLENBQUksSUFBRSxFQUFJLE1BQUksQ0FBQyxDQUFDO0FBQ3RFLE9BQUksTUFBSyxRQUFRLENBQUc7QUFDaEIsbUJBQWEsQUFBQyxDQUFDLFVBQVMsQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFRLEFBQUMsQ0FBRTtBQUN6QyxXQUFJLEtBQUksSUFBTSxXQUFTLENBQUc7QUFDdEIsbUJBQVMsQUFBQyxDQUFDLE9BQU0sQ0FBRyxRQUFNLENBQUMsQ0FBQztRQUNoQyxLQUFPLEtBQUksS0FBSSxJQUFNLFVBQVEsQ0FBRztBQUM1QixnQkFBTSxBQUFDLEVBQUMsQ0FBQztRQUNiLEtBQU87QUFDSCxtQkFBUyxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsSUFBRyxJQUFJLEFBQUMsQ0FBQyxPQUFNLEVBQUksTUFBSSxDQUFHLE1BQUksQ0FBQyxDQUFDLENBQUM7UUFDekQ7QUFBQSxNQUNGLENBQUMsQ0FBQztJQUNOLEtBQU87QUFDSCxTQUFJLEtBQUksSUFBTSxXQUFTLENBQUc7QUFDdEIsaUJBQVMsQUFBQyxDQUFDLE9BQU0sQ0FBRyxRQUFNLENBQUMsQ0FBQztNQUNoQyxLQUFPLEtBQUksS0FBSSxJQUFNLFVBQVEsQ0FBRztBQUM1QixjQUFNLEFBQUMsRUFBQyxDQUFDO01BQ2IsS0FBTztBQUNILGlCQUFTLEFBQUMsQ0FBQyxPQUFNLENBQUcsQ0FBQSxJQUFHLElBQUksQUFBQyxDQUFDLE9BQU0sRUFBSSxNQUFJLENBQUcsTUFBSSxDQUFDLENBQUMsQ0FBQztNQUN6RDtBQUFBLElBQ0o7QUFBQSxFQUNKLENBQUMsQ0FBQztBQUNOO0FBQUEsQUFFQSxPQUFTLFdBQVMsQ0FBRSxRQUFPLENBQUcsQ0FBQSxHQUFFLENBQUc7QUFDL0IsS0FBSSxHQUFFLEVBQUksRUFBQSxDQUFHO0FBR1QsT0FBSSxRQUFPLE1BQU0sQ0FBRSxHQUFFLEVBQUksRUFBQSxDQUFDLFVBQVUsR0FBSyxXQUFTLENBQUc7QUFDakQsV0FBTyxFQUFBLENBQUM7SUFDWjtBQUFBLEFBQ0EsU0FBTyxDQUFBLFFBQU8sTUFBTSxDQUFFLEdBQUUsQ0FBQyxVQUFVLEVBQUksQ0FBQSxRQUFPLE1BQU0sQ0FBRSxHQUFFLEVBQUksRUFBQSxDQUFDLFVBQVUsQ0FBQztFQUM1RTtBQUFBLEFBQ0EsT0FBTyxFQUFBLENBQUM7QUFDWjtBQUFBLEFBRUEsT0FBUyxZQUFVLENBQUUsUUFBTyxDQUFHLENBQUEsR0FBRSxDQUFHLENBQUEsTUFBSyxDQUFHLENBQUEsT0FBTSxDQUFHO0FBRWpELFdBQVMsQUFBQyxDQUFDLFNBQVEsQUFBQyxDQUFFO0FBQ2xCLE9BQUksUUFBTyxNQUFNLE9BQU8sRUFBSSxFQUFDLEdBQUUsRUFBSSxFQUFBLENBQUMsQ0FBRztBQUNuQyxZQUFNLEFBQUMsQ0FBQyxRQUFPLENBQUcsQ0FBQSxHQUFFLEVBQUksRUFBQSxDQUFHLE9BQUssQ0FBQyxDQUFDO0lBQ3RDLEtBQU87QUFDSCxTQUFHLGFBQWEsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO0lBQzNCO0FBQUEsRUFDSixDQUFHLENBQUEsT0FBTSxHQUFLLEVBQUEsQ0FBQyxDQUFDO0FBQ3BCO0FBQUEsQUFFQSxPQUFTLG1CQUFpQixDQUFFLE9BQU0sQ0FBRztBQUNqQyxBQUFJLElBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxRQUFPLGNBQWMsQUFBQyxDQUFDLFVBQVMsQ0FBQyxDQUFDO0FBQzdDLEtBQUcsVUFBVSxFQUFJLFFBQU0sQ0FBQztBQUV4QixPQUFPLENBQUEsSUFBRyxRQUFRLEVBQUksQ0FBQSxJQUFHLFFBQVEsRUFBSSxLQUFHLENBQUM7QUFDN0M7QUFBQSxBQUVBLE9BQVMsb0JBQWtCLENBQUUsSUFBRyxDQUFHO0FBQy9CLE9BQU8sQ0FBQSxJQUFHLEdBQUssQ0FBQSxJQUFHLEtBQUssQ0FBQSxFQUFLLENBQUEsSUFBRyxLQUFLLFFBQVEsQ0FBQSxFQUFLLENBQUEsSUFBRyxLQUFLLFFBQVEsU0FBUyxDQUFDO0FBQy9FO0FBQUEsQUFFQSxPQUFTLGlCQUFlLENBQUUsS0FBSSxDQUFHO0FBQy9CLEFBQUksSUFBQSxDQUFBLE1BQUssRUFBSSxHQUFDLENBQUM7QUFDZixBQUFJLElBQUEsQ0FBQSxRQUFPLEVBQUksTUFBSSxDQUFDO0FBQ3BCLE1BQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxLQUFJLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQ3JDLEFBQUksTUFBQSxDQUFBLE1BQUssRUFBSSxDQUFBLEtBQUksQ0FBRSxDQUFBLENBQUMsVUFBVSxJQUFNLE9BQUssQ0FBQztBQUMxQyxPQUFJLENBQUMsUUFBTyxDQUFBLEVBQUssRUFBQyxNQUFLLENBQUc7QUFDeEIsV0FBSyxLQUFLLEFBQUMsQ0FBQyxLQUFJLENBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQztBQUNyQixhQUFPLEVBQUksQ0FBQSxRQUFPLEdBQUssT0FBSyxDQUFDO0lBQy9CO0FBQUEsRUFDRjtBQUFBLEFBQ0EsT0FBTyxPQUFLLENBQUM7QUFDZjtBQUFBLEFBQUM7QUFFRCxBQUFJLEVBQUEsQ0FBQSxJQUFHLEVBQUksQ0FBQSxDQUFDLFNBQVMsQUFBQyxDQUFFO0FBQ3BCLFNBQVMsR0FBQyxDQUFDLEFBQUMsQ0FBRTtBQUNWLFNBQU8sQ0FBQSxJQUFHLE1BQU0sQUFBQyxDQUFDLENBQUMsQ0FBQSxFQUFJLENBQUEsSUFBRyxPQUFPLEFBQUMsRUFBQyxDQUFDLEVBQUksUUFBTSxDQUFDLFNBQ25DLEFBQUMsQ0FBQyxFQUFDLENBQUMsVUFDSCxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUM7RUFDckI7QUFBQSxBQUNBLE9BQU8sVUFBUyxBQUFDLENBQUU7QUFDZixTQUFPLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQSxDQUFJLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsRUFBQyxBQUFDLEVBQUMsQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUM3QyxDQUFBLEVBQUMsQUFBQyxFQUFDLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEVBQUMsQUFBQyxFQUFDLENBQUEsQ0FBSSxDQUFBLEVBQUMsQUFBQyxFQUFDLENBQUEsQ0FBSSxDQUFBLEVBQUMsQUFBQyxFQUFDLENBQUM7RUFDdkMsQ0FBQztBQUNMLENBQUMsQUFBQyxFQUFDLENBQUM7QUFFSixBQUFJLEVBQUEsQ0FBQSxTQUFRLEVBQUksR0FBQyxDQUFDO0FBQ2xCLEFBQUksRUFBQSxDQUFBLEtBQUksQ0FBQztBQUNULEFBQUksRUFBQSxDQUFBLElBQUcsRUFBSTtBQUNQLEtBQUcsQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUNkLEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLGtCQUFpQixBQUFDLENBQUMsZUFBYyxDQUFDLENBQUM7QUFDbEQsT0FBSSxRQUFPLENBQUc7QUFDWixpQkFBVyxNQUFNLEFBQUMsRUFBQyxDQUFDO0lBQ3RCO0FBQUEsQUFDQSxRQUFJLEVBQUksQ0FBQSxJQUFHLE1BQU0sRUFBSSxDQUFBLElBQUcscUJBQXFCLEFBQUMsRUFBQyxDQUFDO0FBQ2hELE9BQUcsVUFBVSxBQUFDLENBQUMsYUFBWSxDQUFDLENBQUM7QUFFN0IsU0FBTyxDQUFBLElBQUcsYUFBYSxBQUFDLEVBQUMsS0FBSyxBQUFDLENBQUMsU0FBUyxBQUFDLENBQUU7QUFDMUMsU0FBSSxRQUFPLENBQUc7QUFDWixpQkFBUyxBQUFDLENBQUMsU0FBUyxBQUFDLENBQUU7QUFDckIsY0FBSSxXQUFXLEVBQUksQ0FBQSxrQkFBaUIsQUFBQyxDQUFDLGtCQUFpQixDQUFDLENBQUM7QUFDekQsY0FBSSxRQUFRLEVBQUksS0FBRyxDQUFDO0FBQ3BCLGFBQUcsWUFBWSxBQUFDLENBQUMsUUFBTyxDQUFDLENBQUM7UUFDNUIsQ0FBRyxJQUFFLENBQUMsQ0FBQztNQUNULEtBQU87QUFDTCxXQUFJLEtBQUksT0FBTyxJQUFNLFVBQVEsQ0FBRztBQUM5QixvQkFBVSxBQUFDLENBQUMsS0FBSSxJQUFJLFNBQVMsQ0FBRyxDQUFBLEtBQUksSUFBSSxVQUFVLENBQUMsQ0FBQztRQUN0RCxLQUFPLEtBQUksQ0FBQyxLQUFJLE9BQU8sQ0FBQSxFQUFLLENBQUEsS0FBSSxPQUFPLElBQU0sZUFBYSxDQUFHO0FBQzNELGNBQUksT0FBTyxFQUFJLFNBQU8sQ0FBQztRQUN6QjtBQUFBLE1BQ0Y7QUFBQSxJQUVGLENBQUMsQ0FBQztFQUNOO0FBQ0EsVUFBUSxDQUFHLFVBQVUsR0FBRSxDQUFHLENBQUEsT0FBTSxDQUFHO0FBQy9CLE9BQUksU0FBUSxHQUFLLENBQUEsU0FBUSxPQUFPLENBQUc7QUFDL0IsVUFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLFNBQVEsT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDdkMsZ0JBQVEsQ0FBRSxDQUFBLENBQUMsQUFBQyxDQUFDLEdBQUUsQ0FBRyxRQUFNLENBQUMsQ0FBQztNQUM5QjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0EsZUFBYSxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQ3hCLE9BQUksS0FBSSxPQUFPLEdBQUssWUFBVSxDQUFHO0FBQzdCLFVBQUksT0FBTyxFQUFJLFlBQVUsQ0FBQztBQUMxQixVQUFJLE1BQU0sRUFBSSxHQUFDLENBQUM7QUFDaEIsU0FBRyxVQUFVLEFBQUMsQ0FBQyxtQkFBa0IsQ0FBQyxDQUFDO0FBQ25DLFNBQUcsVUFBVSxBQUFDLENBQUMsbUJBQWtCLENBQUMsQ0FBQztBQUNuQyxTQUFHLGNBQWMsQUFBQyxDQUFDLE1BQUssQ0FBRyxFQUN2QixHQUFFLENBQUc7QUFDRCxpQkFBTyxDQUFHLENBQUEsTUFBSyxTQUFTLFNBQVM7QUFDakMsYUFBRyxDQUFHLENBQUEsTUFBSyxTQUFTLEtBQUs7QUFDekIsZUFBSyxDQUFHLENBQUEsTUFBSyxTQUFTLE9BQU87QUFDN0IsYUFBRyxDQUFHLENBQUEsTUFBSyxTQUFTLEtBQUs7QUFBQSxRQUM3QixDQUNKLENBQUMsQ0FBQztJQUNOO0FBQUEsRUFDSjtBQUVBLFlBQVUsQ0FBRyxVQUFVLElBQUcsQ0FBRyxDQUFBLE1BQUssQ0FBRztBQUNqQyxBQUFJLE1BQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxJQUFHLEdBQUssQ0FBQSxNQUFLLEFBQUMsQ0FBQyxpQkFBZ0IsQ0FBQyxDQUFDO0FBQzdDLEFBQUksTUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLENBQUMsSUFBRyxDQUFBLENBQUksQ0FBQSxNQUFLLEFBQUMsQ0FBQyxpREFBZ0QsQ0FBQyxDQUFBLEVBQUssSUFBRSxDQUFBLENBQUksS0FBRyxDQUFDO0FBQzdGLFNBQU8sQ0FBQSxXQUFVLEFBQUMsQ0FBQyxLQUFJLENBQUMsS0FBSyxBQUFDLENBQUMsU0FBVSxRQUFPLENBQUc7QUFDL0MsYUFBTyxFQUFJLENBQUEsSUFBRyxNQUFNLEFBQUMsQ0FBQyxJQUFHLFVBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUM7QUFDL0Msb0JBQWMsQUFBQyxDQUFDLFFBQU8sQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFTLEFBQUMsQ0FBRTtBQUN2QyxZQUFJLElBQUksRUFBSSxHQUFDLENBQUM7QUFDZCxZQUFJLFFBQVEsRUFBSSxDQUFBLE9BQU0sSUFBTSxLQUFHLENBQUM7QUFDaEMsWUFBSSxPQUFPLEVBQUksVUFBUSxDQUFDO0FBRXhCLGVBQU8sTUFBTSxFQUFJLENBQUEsZ0JBQWUsQUFBQyxDQUFDLFFBQU8sTUFBTSxDQUFDLENBQUM7QUFFakQsV0FBSSxJQUFHLE1BQU0sU0FBUyxJQUFJLEFBQUMsQ0FBQyxTQUFRLENBQUMsQ0FBRztBQUN0QyxhQUFHLFVBQVUsQUFBQyxDQUFDLHFCQUFvQixFQUFJLEtBQUcsQ0FBQSxDQUFJLElBQUUsQ0FBRyxTQUFPLENBQUMsQ0FBQztRQUM5RDtBQUFBLEFBRUEsV0FBRyxVQUFVLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBQyxDQUFDO0FBRWxDLGNBQU0sQUFBQyxDQUFDLFFBQU8sQ0FBRyxFQUFBLENBQUMsQ0FBQztNQUN4QixDQUFDLENBQUM7SUFDTixDQUFDLENBQUM7RUFDTjtBQUNBLFlBQVUsQ0FBRyxZQUFVO0FBQ3ZCLGFBQVcsQ0FBRyxVQUFVLE9BQU0sQ0FBRztBQUM3QixBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxLQUFJLElBQUksR0FBSyxDQUFBLEtBQUksSUFBSSxTQUFTLENBQUM7QUFDOUMsU0FBTyxNQUFJLElBQUksQ0FBQztBQUNoQixRQUFJLE9BQU8sRUFBSSxTQUFPLENBQUM7QUFDdkIsT0FBRyxVQUFVLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBQyxDQUFDO0FBRWxDLE9BQUksSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUc7QUFDdEMsU0FBRyxVQUFVLEFBQUMsQ0FBQyxtQkFBa0IsQ0FBQyxDQUFDO0lBQ3JDO0FBQUEsQUFDQSxPQUFJLFFBQU8sQ0FBRztBQUNWLFNBQUksT0FBTSxDQUFHO0FBQ1QsV0FBRyxjQUFjLEFBQUMsQ0FBQyxzQkFBcUIsRUFBSSxDQUFBLFFBQU8sS0FBSyxDQUFBLENBQUksZUFBYSxDQUFDLENBQUM7TUFDL0UsS0FBTztBQUNILFdBQUcsVUFBVSxBQUFDLENBQUMsbUJBQWtCLEVBQUksQ0FBQSxNQUFLLFNBQVMsS0FBSyxDQUFDLENBQUM7QUFDMUQsV0FBRyxZQUFZLEFBQUMsQ0FBQyxzQkFBcUIsRUFBSSxDQUFBLFFBQU8sS0FBSyxDQUFBLENBQUksYUFBVyxDQUFDLENBQUM7TUFDM0U7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUtBLHFCQUFtQixDQUFHLFVBQVUsT0FBTSxDQUFHO0FBQ3JDLEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLE9BQU0sYUFBYSxBQUFDLENBQUMsZ0JBQWUsQ0FBQyxDQUFBLEVBQUssQ0FBQSxJQUFHLEFBQUMsRUFBQyxDQUFDO0FBQy9ELFVBQU0sYUFBYSxBQUFDLENBQUMsZ0JBQWUsQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUVoRCxBQUFJLE1BQUEsQ0FBQSxPQUFNLEVBQUksQ0FBQSxPQUFNLFVBQVUsQUFBQyxFQUFDLFVBQVUsQ0FBQztBQUMzQyxBQUFJLE1BQUEsQ0FBQSxZQUFXLEVBQUksR0FBQyxDQUFDO0FBQ3JCLE9BQUksT0FBTSxRQUFRLFlBQVksQUFBQyxFQUFDLENBQUEsRUFBSyxPQUFLLENBQUEsRUFBSyxDQUFBLE9BQU0sUUFBUSxZQUFZLEFBQUMsRUFBQyxDQUFBLEVBQUssT0FBSyxDQUFHO0FBQ3BGLGlCQUFXLEVBQUksRUFBQyxPQUFNLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLEtBQU87QUFDSCxpQkFBVyxFQUFJLENBQUEsY0FBYSxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsUUFBTyxLQUFLLENBQUMsQ0FBQztJQUN6RDtBQUFBLEFBQ0EsU0FBTztBQUNILGFBQU8sQ0FBRyxTQUFPO0FBQ2pCLGNBQVEsQ0FBRyxhQUFXO0FBQUEsSUFDMUIsQ0FBQztFQUNMO0FBRUEsY0FBWSxDQUFHLFVBQVUsU0FBUSxDQUFHLENBQUEsSUFBRyxDQUFHLENBQUEsR0FBRSxDQUFHO0FBQzNDLE9BQUksSUFBRyxZQUFZLEFBQUMsRUFBQyxDQUFBLEVBQUssQ0FBQSxJQUFHLGFBQWEsQUFBQyxFQUFDLENBQUc7QUFDM0MsU0FBSSxNQUFPLElBQUUsQ0FBQSxFQUFLLFlBQVUsQ0FBRztBQUMzQixVQUFFLEVBQUksQ0FBQSxJQUFHLE1BQU0sTUFBTSxPQUFPLENBQUM7TUFDakM7QUFBQSxBQUNBLFVBQUksTUFBTSxDQUFFLEdBQUUsQ0FBQyxFQUFJO0FBQ2YsZ0JBQVEsQ0FBRyxVQUFRO0FBQ25CLGdCQUFRLENBQUcsQ0FBQSxHQUFJLEtBQUcsQUFBQyxFQUFDLFFBQVEsQUFBQyxFQUFDO0FBQzlCLFdBQUcsQ0FBRyxLQUFHO0FBQUEsTUFDYixDQUFDO0FBQ0QsU0FBRyxVQUFVLEFBQUMsQ0FBQyxrQkFBaUIsQ0FBQyxDQUFDO0lBQ3RDO0FBQUEsRUFDSjtBQUNBLFVBQVEsQ0FBRyxVQUFVLEdBQUUsQ0FBRyxDQUFBLFFBQU8sQ0FBRztBQUNoQyxPQUFJLGNBQWEsR0FBSyxDQUFBLGNBQWEsT0FBTyxDQUFHO0FBQ3pDLFVBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxjQUFhLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQzVDLHFCQUFhLENBQUUsQ0FBQSxDQUFDLElBQUksQUFBQyxDQUFDLEdBQUUsQ0FBRyxTQUFPLENBQUcsS0FBRyxDQUFDLENBQUM7TUFDOUM7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNBLFlBQVUsQ0FBRyxVQUFVLEtBQUksQ0FBRyxDQUFBLFFBQU8sQ0FBRztBQUNwQyxPQUFJLGNBQWEsR0FBSyxDQUFBLGNBQWEsT0FBTyxDQUFHO0FBQ3pDLFVBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxjQUFhLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQzVDLHFCQUFhLENBQUUsQ0FBQSxDQUFDLE1BQU0sQUFBQyxDQUFDLEtBQUksQ0FBRyxTQUFPLENBQUcsS0FBRyxDQUFDLENBQUM7TUFDbEQ7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNBLGNBQVksQ0FBRyxVQUFVLE9BQU0sQ0FBRyxDQUFBLFFBQU8sQ0FBRztBQUN4QyxPQUFJLGNBQWEsR0FBSyxDQUFBLGNBQWEsT0FBTyxDQUFHO0FBQ3pDLFVBQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxjQUFhLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQzVDLHFCQUFhLENBQUUsQ0FBQSxDQUFDLFFBQVEsQUFBQyxDQUFDLE9BQU0sQ0FBRyxTQUFPLENBQUcsS0FBRyxDQUFDLENBQUM7TUFDdEQ7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNBLGlCQUFlLENBQUcsVUFBVSxPQUFNLENBQUc7QUFDakMsWUFBUSxLQUFLLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztFQUMzQjtBQUNBLG9CQUFrQixDQUFHLFVBQVUsT0FBTSxDQUFHO0FBQ3BDLGVBQVcsS0FBSyxBQUFDLENBQUMsT0FBTSxDQUFDLENBQUM7RUFDOUI7QUFDQSxzQkFBb0IsQ0FBRyxVQUFVLE9BQU0sQ0FBRztBQUN0QyxpQkFBYSxLQUFLLEFBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQztFQUNoQztBQUNBLG9CQUFrQixDQUFHLFVBQVUsT0FBTSxDQUFHLENBQUEsS0FBSSxDQUFHO0FBQzNDLFFBQUksRUFBSSxDQUFBLE1BQU8sTUFBSSxDQUFBLEdBQU0sWUFBVSxDQUFBLENBQUksTUFBSSxFQUFJLENBQUEsWUFBVyxPQUFPLENBQUM7QUFDbEUsT0FBSSxZQUFXLE9BQU8sRUFBSSxNQUFJLENBQUc7QUFDN0IsaUJBQVcsT0FBTyxBQUFDLENBQUMsS0FBSSxDQUFHLEVBQUEsQ0FBRyxRQUFNLENBQUMsQ0FBQztJQUMxQyxLQUFPO0FBQ0gsaUJBQVcsS0FBSyxBQUFDLENBQUMsT0FBTSxDQUFDLENBQUM7SUFDOUI7QUFBQSxFQUNKO0FBQ0EsNEJBQTBCLENBQUcsVUFBVSxPQUFNLENBQUc7QUFDNUMsdUJBQW1CLEtBQUssQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDO0VBQ3RDO0FBQ0EsWUFBVSxDQUFHLFVBQVEsQUFBQyxDQUFFO0FBQ3BCLFNBQU8sQ0FBQSxJQUFHLE1BQU0sT0FBTyxRQUFRLEFBQUMsQ0FBQyxXQUFVLENBQUMsQ0FBQSxHQUFNLEVBQUEsQ0FBQztFQUN2RDtBQUNBLFVBQVEsQ0FBRyxVQUFRLEFBQUMsQ0FBRTtBQUNsQixTQUFPLENBQUEsSUFBRyxNQUFNLE9BQU8sUUFBUSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUEsR0FBTSxFQUFBLENBQUM7RUFDckQ7QUFDQSxhQUFXLENBQUcsVUFBUyxVQUFTLENBQUc7QUFDL0IsT0FBSSxNQUFPLFdBQVMsQ0FBQSxHQUFNLFlBQVUsQ0FBQSxFQUFLLEVBQUMsSUFBRyxZQUFZLEFBQUMsRUFBQyxDQUFBLEVBQUssQ0FBQSxJQUFHLGFBQWEsQUFBQyxFQUFDLENBQUMsQ0FBRztBQUNsRixTQUFHLE1BQU0sT0FBTyxFQUFJLENBQUEsVUFBUyxFQUFJLGFBQVcsRUFBSSxZQUFVLENBQUM7QUFDM0QsU0FBRyxVQUFVLEFBQUMsQ0FBQyxvQkFBbUIsQ0FBQyxDQUFDO0lBQ3hDO0FBQUEsQUFDQSxTQUFPLENBQUEsSUFBRyxNQUFNLE9BQU8sUUFBUSxBQUFDLENBQUMsWUFBVyxDQUFDLENBQUEsR0FBTSxFQUFBLENBQUM7RUFDeEQ7QUFDQSxjQUFZLENBQUcsVUFBVSxJQUFHLENBQUc7QUFDM0IsT0FBSSxJQUFHLElBQU0sTUFBSSxDQUFHO0FBQ2hCLEFBQUksUUFBQSxDQUFBLFdBQVUsRUFBSSxFQUNkLEtBQUksQ0FBRyxDQUFBLEtBQUksTUFBTSxDQUNyQixDQUFDO0FBRUQsTUFBQSxPQUFPLEFBQUMsQ0FBQyxXQUFVLENBQUcsS0FBRyxDQUFDLENBQUM7QUFFM0IsU0FBSSxDQUFDLFdBQVUsS0FBSyxDQUFHO0FBQ25CLGtCQUFVLEtBQUssRUFBSSxDQUFBLE1BQUssQUFBQyxDQUFDLHFCQUFvQixDQUFDLENBQUM7TUFDcEQ7QUFBQSxBQUVBLFNBQUksV0FBVSxLQUFLLENBQUc7QUFDbEIsWUFBSSxVQUFVLEtBQUssQUFBQyxDQUFDLFdBQVUsQ0FBQyxDQUFDO0FBRWpDLFdBQUksWUFBVyxHQUFLLENBQUEsWUFBVyxPQUFPLENBQUc7QUFDckMsY0FBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLFlBQVcsT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDMUMsdUJBQVcsQ0FBRSxDQUFBLENBQUMsQUFBQyxDQUFDLFdBQVUsQ0FBRyxLQUFHLENBQUMsQ0FBQztVQUN0QztBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEFBRUEsUUFBSSxPQUFPLEVBQUksU0FBTyxDQUFDO0FBRXZCLE9BQUcsVUFBVSxBQUFDLENBQUMsbUJBQWtCLENBQUMsQ0FBQztBQUVuQyxPQUFHLFVBQVUsQUFBQyxDQUFDLG1CQUFrQixDQUFHLFlBQVUsQ0FBQyxDQUFDO0VBQ3BEO0FBRUEsYUFBVyxDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQ3RCLEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLElBQUcsTUFBTSxTQUFTLEVBQUksQ0FBQSxJQUFHLE1BQU0sU0FBUyxHQUFLLElBQUksU0FBTyxBQUFDLENBQUMsQ0FDdkUsY0FBYSxDQUFHLEtBQUcsQ0FDckIsQ0FBQyxDQUFDO0FBQ0YsT0FBSSxvQkFBbUIsT0FBTyxFQUFJLEVBQUEsQ0FBQSxFQUFLLEVBQUMsSUFBRyxZQUFZLEFBQUMsRUFBQyxDQUFBLEVBQUssRUFBQyxJQUFHLFVBQVUsQUFBQyxFQUFDLENBQUc7QUFDN0UsV0FBTyxJQUFJLFFBQU0sQUFBQyxDQUFDLFNBQVUsT0FBTSxDQUFHLENBQUEsTUFBSyxDQUFHO0FBQzFDLDJCQUFtQixDQUFFLENBQUEsQ0FBQyxBQUFDLENBQUMsU0FBVSxJQUFHLENBQUc7QUFDcEMsaUJBQU8sWUFBWSxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUM7QUFDMUIsZ0JBQU0sQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO1FBQ3JCLENBQUcsVUFBUyxBQUFDLENBQUU7QUFDWCxnQkFBTSxBQUFDLENBQUMsUUFBTyxDQUFDLENBQUM7UUFDckIsQ0FBQyxDQUFDO01BQ04sQ0FBQyxDQUFDO0lBQ04sS0FBTztBQUNILFdBQU8sQ0FBQSxPQUFNLFFBQVEsQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO0lBQ3BDO0FBQUEsRUFDSjtBQUVBLHFCQUFtQixDQUFHLFVBQVMsQUFBQyxDQUFFO0FBQzlCLEFBQUksTUFBQSxDQUFBLFlBQVcsRUFBSSxDQUFBLFlBQVcsUUFBUSxBQUFDLENBQUMsTUFBSyxDQUFDLENBQUM7QUFDL0MsT0FBSSxZQUFXLENBQUc7QUFDZCxVQUFJLEVBQUksQ0FBQSxJQUFHLE1BQU0sQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFDO0FBRWhDLFNBQUksS0FBSSxTQUFTLENBQUc7QUFDaEIsQUFBSSxVQUFBLENBQUEsV0FBVSxFQUFJLElBQUksU0FBTyxBQUFDLEVBQUMsQ0FBQztBQUNoQyxrQkFBVSxTQUFTLEVBQUksQ0FBQSxLQUFJLFNBQVMsU0FBUyxDQUFDO0FBQzlDLGtCQUFVLFNBQVMsRUFBSSxDQUFBLEtBQUksU0FBUyxnQkFBZ0IsQ0FBQztBQUNyRCxZQUFJLFNBQVMsRUFBSSxZQUFVLENBQUM7TUFDaEM7QUFBQSxJQUNKLEtBQU87QUFDSCxVQUFJLEVBQUk7QUFDSixhQUFLLENBQUcsZUFBYTtBQUNyQixnQkFBUSxDQUFHLEdBQUM7QUFBQSxNQUNoQixDQUFDO0lBQ0w7QUFBQSxBQUNBLFNBQU8sTUFBSSxDQUFDO0VBQ2hCO0FBRUEsbUJBQWlCLENBQUcsVUFBVSxTQUFRLENBQUc7QUFDckMsT0FBSSxTQUFRLENBQUc7QUFDWCxpQkFBVyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxJQUFHLFVBQVUsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFDLENBQUM7SUFDM0QsS0FBTztBQUNILGlCQUFXLFdBQVcsQUFBQyxDQUFDLE1BQUssQ0FBQyxDQUFDO0lBQ25DO0FBQUEsRUFDSjtBQUVBLE9BQUssQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUNoQixPQUFHLG1CQUFtQixBQUFDLENBQUMsS0FBSSxDQUFDLENBQUM7RUFDbEM7QUFBQSxBQUNKLENBQUM7QUFFRCxPQUFTLGdCQUFjLENBQUUsR0FBRSxDQUFHLENBQUEsS0FBSSxDQUFHO0FBQ2pDLEVBQUEsQUFBQyxDQUFDLEdBQUUsQ0FBQyxZQUFZLEFBQUMsQ0FBQyxhQUFZLENBQUcsTUFBSSxDQUFDLENBQUM7QUFDNUM7QUFBQSxBQUVBLE9BQVMsWUFBVSxDQUFFLEdBQUUsQ0FBRyxDQUFBLEtBQUksQ0FBRztBQUM3QixFQUFBLEFBQUMsQ0FBQyxHQUFFLENBQUMsWUFBWSxBQUFDLENBQUMsWUFBVyxDQUFHLE1BQUksQ0FBQyxDQUFDO0FBQzNDO0FBQUEsQUFPQSxPQUFTLG9CQUFrQixDQUFFLEdBQUUsQ0FBRztBQUM5QixPQUFPLENBQUEsQ0FBQSxBQUFDLENBQUMsR0FBRSxDQUFDLFFBQVEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxPQUFPLEdBQUssRUFBQSxDQUFBLEVBQ25DLENBQUEsR0FBRSxTQUFTLFlBQVksQUFBQyxFQUFDLENBQUEsRUFBSyxRQUFNLENBQUM7QUFDL0M7QUFBQSxBQUtBLE9BQVMsaUJBQWUsQ0FBRSxHQUFFLENBQUc7QUFDN0IsT0FBTyxDQUFBLENBQUMsR0FBRSxhQUFhLENBQUEsRUFBSyxDQUFBLEdBQUUsYUFBYSxBQUFDLENBQUMsYUFBWSxDQUFDLENBQUEsRUFBSyxDQUFBLENBQUEsQUFBQyxDQUFDLEdBQUUsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxlQUFjLENBQUMsT0FBTyxFQUFJLEVBQUEsQ0FBQztBQUMzRztBQUFBLEFBS0EsT0FBUyxrQkFBZ0IsQ0FBRSxHQUFFLENBQUcsQ0FBQSxHQUFFLENBQUc7QUFDbkMsQUFBSSxJQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsSUFBRyxNQUFNLFNBQVMsSUFBSSxBQUFDLENBQUMsa0JBQWlCLEVBQUksSUFBRSxDQUFDLENBQUM7QUFDL0QsQUFBSSxJQUFBLENBQUEsYUFBWSxFQUFJLEVBQUMsT0FBTSxJQUFNLEtBQUcsQ0FBQSxFQUFLLENBQUEsT0FBTSxJQUFNLE9BQUssQ0FBQSxFQUFLLENBQUEsTUFBTyxRQUFNLENBQUEsR0FBTSxZQUFVLENBQUMsQ0FBQztBQUM5RixPQUFPLENBQUEsSUFBRyxZQUFZLEFBQUMsRUFBQyxDQUFBLEVBQUssY0FBWSxDQUFBLEVBQUssQ0FBQSxtQkFBa0IsQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0FBQ3hFO0FBQUEsQUFFSSxFQUFBLENBQUEsTUFBSyxFQUFJLEdBQUMsQ0FBQztBQUVmLE9BQVMsa0JBQWdCLENBQUMsQUFBQyxDQUFFO0FBRXpCLE1BQVMsR0FBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUksQ0FBQSxNQUFLLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxDQUFHO0FBQ3BDLFdBQU8saUJBQWlCLEFBQUMsQ0FBQyxNQUFLLENBQUUsQ0FBQSxDQUFDLENBQUcsQ0FBQSxDQUFDLFNBQVUsR0FBRSxDQUFHO0FBQ2pELEFBQUksUUFBQSxDQUFBLE9BQU0sRUFBSSxVQUFVLENBQUEsQ0FBRztBQUN2QixXQUFJLENBQUEsVUFBVTtBQUNWLGdCQUFNO0FBQUEsQUFFVixXQUFJLENBQUMsZ0JBQWUsQUFBQyxDQUFDLENBQUEsT0FBTyxDQUFDLENBQUEsRUFBSyxDQUFBLElBQUcsWUFBWSxBQUFDLEVBQUMsQ0FBRztBQUVqRCxBQUFJLFlBQUEsQ0FBQSxHQUFFLEVBQUksQ0FBQSxJQUFHLE1BQU0sTUFBTSxPQUFPLENBQUM7QUFDakMsQUFBSSxZQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsSUFBRyxNQUFNLE1BQU0sQ0FBRSxHQUFFLEVBQUksRUFBQSxDQUFDLENBQUM7QUFDeEMsQUFBSSxZQUFBLENBQUEsSUFBRyxFQUFJLEVBQ1QsT0FBTSxDQUFHLENBQUEsSUFBRyxxQkFBcUIsQUFBQyxDQUFDLENBQUEsT0FBTyxDQUFDLENBQzdDLENBQUM7QUFDRCxBQUFJLFlBQUEsQ0FBQSxLQUFJLENBQUM7QUFFVCxhQUFJLEdBQUUsR0FBSyxZQUFVLENBQUc7QUFDcEIsMEJBQWMsQUFBQyxDQUFDLENBQUEsT0FBTyxDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBQy9CLGlCQUFLLEtBQUssQUFBQyxDQUFDO0FBQ1Isb0JBQU0sQ0FBRyxDQUFBLENBQUEsT0FBTztBQUNoQixrQkFBSSxDQUFHLENBQUEsVUFBUyxBQUFDLENBQUMsU0FBUyxBQUFDLENBQUU7QUFDMUIsMEJBQVUsQUFBQyxDQUFDLENBQUEsT0FBTyxDQUFHLEtBQUcsQ0FBQyxDQUFDO0FBQzNCLDhCQUFjLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBRyxNQUFJLENBQUMsQ0FBQztjQUNwQyxDQUFHLElBQUUsQ0FBQztBQUFBLFlBQ1YsQ0FBQyxDQUFDO1VBQ047QUFBQSxBQUVBLGFBQUksR0FBRSxHQUFLLFdBQVMsQ0FBRztBQUNuQixnQkFBUyxHQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxDQUFBLE1BQUssT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLENBQUc7QUFDcEMsaUJBQUksTUFBSyxDQUFFLENBQUEsQ0FBQyxRQUFRLEdBQUssQ0FBQSxDQUFBLE9BQU8sQ0FBRztBQUMvQiwyQkFBVyxBQUFDLENBQUMsTUFBSyxDQUFFLENBQUEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixxQkFBSyxPQUFPLEFBQUMsQ0FBQyxDQUFBLENBQUcsRUFBQSxDQUFDLENBQUM7QUFDbkIscUJBQUs7Y0FDVDtBQUFBLFlBQ0o7QUFBQSxBQUNBLDBCQUFjLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBRyxNQUFJLENBQUMsQ0FBQztBQUNoQyxzQkFBVSxBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUcsTUFBSSxDQUFDLENBQUM7VUFDaEM7QUFBQSxBQUVBLGFBQUksaUJBQWdCLEFBQUMsQ0FBQyxDQUFBLE9BQU8sQ0FBRyxJQUFFLENBQUMsQ0FBRztBQUNwQyxlQUFJLENBQUEsTUFBTSxHQUFLLENBQUEsQ0FBQSxPQUFPLENBQUc7QUFDdkIsaUJBQUcsT0FBTyxFQUFJLENBQUEsQ0FBQSxNQUFNLEdBQUssQ0FBQSxDQUFBLE9BQU8sQ0FBQztZQUNuQztBQUFBLEFBR0EsZUFBSSxHQUFFLElBQU0sU0FBTyxDQUFHO0FBQ3BCLGlCQUFHLFdBQVcsRUFBSTtBQUNoQixzQkFBTSxDQUFJLENBQUEsQ0FBQSxPQUFPLE1BQU07QUFDdkIsd0JBQVEsQ0FBRyxDQUFBLENBQUEsT0FBTyxRQUFRO0FBQUEsY0FDNUIsQ0FBQztZQUNIO0FBQUEsQUFFQSxlQUFHLGNBQWMsQUFBQyxDQUFDLEdBQUUsQ0FBRyxLQUFHLENBQUcsSUFBRSxDQUFDLENBQUM7VUFDcEM7QUFBQSxRQUNOO0FBQUEsTUFFSixDQUFDO0FBR0QsTUFBQyxJQUFHLGVBQWUsRUFBSSxDQUFBLElBQUcsZUFBZSxHQUFLLEdBQUMsQ0FBQyxDQUFFLEdBQUUsQ0FBQyxFQUFJLFFBQU0sQ0FBQztBQUNoRSxXQUFPLFFBQU0sQ0FBQztJQUNsQixDQUFDLEFBQUMsQ0FBQyxNQUFLLENBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBRyxLQUFHLENBQUMsQ0FBQztFQUN4QjtBQUFBLEFBRUksSUFBQSxDQUFBLFNBQVEsRUFBSTtBQUNaLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUNWLFFBQUksQ0FBRyxLQUFHO0FBQ1YsUUFBSSxDQUFHLEtBQUc7QUFDVixRQUFJLENBQUcsS0FBRztBQUFBLEVBQ2QsQ0FBQztBQUVELEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSTtBQUNYLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUNSLE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsS0FBRztBQUNULE9BQUcsQ0FBRyxJQUFFO0FBQ1IsT0FBRyxDQUFHLElBQUU7QUFDUixPQUFHLENBQUcsSUFBRTtBQUFBLEVBQ1osQ0FBQztBQUVELFNBQVMsZ0JBQWMsQ0FBRyxDQUFBLENBQUc7QUFDekIsT0FBSSxDQUFBLFVBQVU7QUFDVixZQUFNO0FBQUEsQUFFVixPQUFJLENBQUMsZ0JBQWUsQUFBQyxDQUFDLENBQUEsT0FBTyxDQUFDLENBQUEsRUFBSyxDQUFBLGlCQUFnQixBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUcsV0FBUyxDQUFDLENBQUc7QUFDeEUsQUFBSSxRQUFBLENBQUEsQ0FBQSxFQUFJLENBQUEsQ0FBQSxNQUFNLENBQUM7QUFJZixTQUFJLFNBQVEsZUFBZSxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUc7QUFDN0IsUUFBQSxFQUFJLENBQUEsU0FBUSxDQUFFLENBQUEsQ0FBQyxDQUFDO01BQ3BCO0FBQUEsQUFFQSxTQUFJLENBQUMsQ0FBQSxTQUFTLENBQUEsRUFBSyxFQUFDLENBQUEsR0FBSyxHQUFDLENBQUEsRUFBSyxDQUFBLENBQUEsR0FBSyxHQUFDLENBQUMsQ0FBRztBQUNyQyxRQUFBLEVBQUksQ0FBQSxNQUFLLGFBQWEsQUFBQyxDQUFDLENBQUEsRUFBSSxHQUFDLENBQUMsQ0FBQztNQUNuQyxLQUFPLEtBQUksQ0FBQSxTQUFTLEdBQUssQ0FBQSxRQUFPLGVBQWUsQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFHO0FBRWpELFFBQUEsRUFBSSxDQUFBLFFBQU8sQ0FBRSxDQUFBLENBQUMsQ0FBQztNQUNuQixLQUFPO0FBQ0gsUUFBQSxFQUFJLENBQUEsTUFBSyxhQUFhLEFBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztNQUM5QjtBQUFBLEFBRUEsU0FBRyxjQUFjLEFBQUMsQ0FBQyxVQUFTLENBQUc7QUFDM0IsY0FBTSxDQUFHLENBQUEsSUFBRyxxQkFBcUIsQUFBQyxDQUFDLENBQUEsT0FBTyxDQUFDO0FBQzNDLFVBQUUsQ0FBRyxFQUFBO0FBQ0wsZ0JBQVEsQ0FBRyxDQUFBLENBQUEsT0FBTyxNQUFNO0FBQ3hCLFlBQUksQ0FBRyxDQUFBLENBQUEsT0FBTyxNQUFNLEVBQUksRUFBQTtBQUN4QixjQUFNLENBQUcsQ0FBQSxDQUFBLFFBQVE7QUFBQSxNQUNyQixDQUFDLENBQUM7SUFDTjtBQUFBLEVBQ0o7QUFBQSxBQUVBLFNBQU8saUJBQWlCLEFBQUMsQ0FBQyxVQUFTLENBQUcsZ0JBQWMsQ0FBRyxLQUFHLENBQUMsQ0FBQztBQUc1RCxFQUFDLElBQUcsZUFBZSxFQUFJLENBQUEsSUFBRyxlQUFlLEdBQUssR0FBQyxDQUFDLENBQUUsVUFBUyxDQUFDLEVBQUksZ0JBQWMsQ0FBQztBQUNuRjtBQUFBLEFBRUEsT0FBUyxtQkFBaUIsQ0FBRSxJQUFHLENBQUc7QUFDOUIsS0FBRyxFQUFJLENBQUEsSUFBRyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsTUFBSSxDQUFDLFFBQVEsQUFBQyxDQUFDLE1BQUssQ0FBRyxNQUFJLENBQUMsQ0FBQztBQUN6RCxBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksSUFBSSxPQUFLLEFBQUMsQ0FBQyxRQUFPLEVBQUksS0FBRyxDQUFBLENBQUksWUFBVSxDQUFDO0FBQ2hELFlBQU0sRUFBSSxDQUFBLEtBQUksS0FBSyxBQUFDLENBQUMsUUFBTyxPQUFPLENBQUMsQ0FBQztBQUN6QyxPQUFPLENBQUEsT0FBTSxJQUFNLEtBQUcsQ0FBQSxDQUFJLEdBQUMsRUFBSSxDQUFBLGtCQUFpQixBQUFDLENBQUMsT0FBTSxDQUFFLENBQUEsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsSUFBRSxDQUFDLENBQUMsQ0FBQztBQUNyRjtBQUFBLEFBRUEsT0FBUyxjQUFZLENBQUMsQUFBQyxDQUFFO0FBQ3ZCLEtBQUksUUFBTyxXQUFXLEdBQUssV0FBUyxDQUFHO0FBQ3JDLE9BQUcsS0FBSyxBQUFDLEVBQUMsS0FBSyxBQUFDLENBQUMsU0FBUyxBQUFDLENBQUU7QUFFekIsc0JBQWdCLEFBQUMsRUFBQyxDQUFDO0FBRW5CLFNBQUksSUFBRyxZQUFZLEFBQUMsRUFBQyxDQUFHO0FBQ3BCLFdBQUcsY0FBYyxBQUFDLENBQUMsTUFBSyxDQUFHLEVBQ3ZCLEdBQUUsQ0FBRztBQUNELG1CQUFPLENBQUcsQ0FBQSxNQUFLLFNBQVMsU0FBUztBQUNqQyxlQUFHLENBQUcsQ0FBQSxNQUFLLFNBQVMsS0FBSztBQUN6QixpQkFBSyxDQUFHLENBQUEsTUFBSyxTQUFTLE9BQU87QUFDN0IsZUFBRyxDQUFHLENBQUEsTUFBSyxTQUFTLEtBQUs7QUFBQSxVQUM3QixDQUNKLENBQUMsQ0FBQztNQUNOO0FBQUEsSUFDSixDQUFDLENBQUM7RUFDSjtBQUFBLEFBQ0Y7QUFBQSxBQUVBLFlBQVksQUFBQyxFQUFDLENBQUM7QUFDZixPQUFPLGlCQUFpQixBQUFDLENBQUMsa0JBQWlCLENBQUcsY0FBWSxDQUFDLENBQUM7QUFFNUQsS0FBSyxpQkFBaUIsQUFBQyxDQUFDLFFBQU8sQ0FBRyxVQUFTLEFBQUMsQ0FBRTtBQUMxQyxLQUFHLE9BQU8sQUFBQyxFQUFDLENBQUM7QUFDakIsQ0FBRyxLQUFHLENBQUMsQ0FBQztBQUVSLEtBQUssaUJBQWlCLEFBQUMsQ0FBQyxPQUFNLENBQUcsVUFBVSxHQUFFLENBQUc7QUFDNUMsS0FBRyxVQUFVLEFBQUMsQ0FBQyxnQkFBZSxFQUFJLENBQUEsR0FBRSxRQUFRLENBQUEsQ0FBSSxJQUFFLENBQUEsQ0FBSSxDQUFBLEdBQUUsSUFBSSxDQUFBLENBQUksSUFBRSxDQUFBLENBQUksQ0FBQSxHQUFFLEtBQUssQ0FBQSxDQUFJLElBQUUsQ0FBQSxDQUFJLENBQUEsR0FBRSxJQUFJLENBQUMsQ0FBQztBQUNuRyxDQUFDLENBQUM7QUFFRixLQUFLLFFBQVEsRUFBSSxLQUFHLENBQUM7QUFFd2tnRjs7Ozs7O0FDOTVCN2xnRixNQUFNLENBQUMsT0FBTyxHQUFHO0lBQ2IseUJBQXlCLEVBQUU7UUFDdkIsTUFBTSxFQUFFLHlDQUF5QztRQUNqRCxNQUFNLEVBQUUsMEJBQTBCO1FBQ2xDLFFBQVEsRUFBRSxDQUFDO1lBQ1AsVUFBVSxFQUFFLGlCQUFpQjtZQUM3QixPQUFPLEVBQUUsUUFBUTtZQUNqQixTQUFTLEVBQUUsSUFBSTtTQUNsQixFQUFFO1lBQ0MsVUFBVSxFQUFFLGlCQUFpQjtZQUM3QixPQUFPLEVBQUUsT0FBTztZQUNoQixTQUFTLEVBQUUsSUFBSTtTQUNsQixDQUFDO0tBQ0w7Q0FDSjs7O0FDZEQsTUFBTSxDQUFDLE9BQU8sR0FBRztJQUNiLGtCQUFrQixFQUFFO1FBQ2hCLE1BQU0sRUFBRSxtQkFBbUI7UUFDM0IsVUFBVSxFQUFFO1lBQ1IsT0FBTyxFQUFFLENBQUM7Z0JBQ04sV0FBVyxFQUFFLE9BQU87Z0JBQ3BCLE1BQU0sRUFBRTtvQkFDSixTQUFTLEVBQUU7d0JBQ1AsVUFBVSxFQUFFLEdBQUc7d0JBQ2YsV0FBVyxFQUFFOzRCQUNULGVBQWU7eUJBQ2xCO3FCQUNKO2lCQUNKO2FBQ0osQ0FBQztTQUNMO1FBQ0QsTUFBTSxFQUFFLGFBQWE7UUFDckIsUUFBUSxFQUFFLENBQUM7WUFDUCxVQUFVLEVBQUUsZUFBZTtZQUMzQixPQUFPLEVBQUUsT0FBTztTQUNuQixDQUFDO0tBQ0w7SUFDRCw4QkFBOEIsRUFBRTtRQUM1QixNQUFNLEVBQUUsd0RBQXdEO1FBQ2hFLFVBQVUsRUFBRTtZQUNSLE9BQU8sRUFBRSxDQUFDO2dCQUNOLFdBQVcsRUFBRSxZQUFZO2dCQUN6QixXQUFXLEVBQUUsQ0FBQztnQkFDZCxNQUFNLEVBQUU7b0JBQ0osU0FBUyxFQUFFO3dCQUNQLFVBQVUsRUFBRSxHQUFHO3dCQUNmLFdBQVcsRUFBRTs0QkFDVCxlQUFlO3lCQUNsQjtxQkFDSjtpQkFDSjthQUNKO2dCQUNHO29CQUNJLFdBQVcsRUFBRSxXQUFXO29CQUN4QixXQUFXLEVBQUUsRUFBRTtvQkFDZixNQUFNLEVBQUU7d0JBQ0osU0FBUyxFQUFFOzRCQUNQLFVBQVUsRUFBRSxHQUFHOzRCQUNmLFdBQVcsRUFBRTtnQ0FDVCxlQUFlOzZCQUNsQjt5QkFDSjtxQkFDSjtpQkFDSjtnQkFDRDtvQkFDSSxXQUFXLEVBQUUsVUFBVTtvQkFDdkIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZUFBZTs2QkFDbEI7eUJBQ0o7cUJBQ0o7aUJBQ0o7Z0JBQ0Q7b0JBQ0ksV0FBVyxFQUFFLFlBQVk7b0JBQ3pCLFdBQVcsRUFBRSxFQUFFO29CQUNmLE1BQU0sRUFBRTt3QkFDSixTQUFTLEVBQUU7NEJBQ1AsVUFBVSxFQUFFLEdBQUc7NEJBQ2YsV0FBVyxFQUFFO2dDQUNULGVBQWU7NkJBQ2xCO3lCQUNKO3FCQUNKO2lCQUNKLENBQUM7U0FDVDtRQUNELE1BQU0sRUFBRSxhQUFhO1FBQ3JCLFFBQVEsRUFBRSxFQUFFO0tBQ2Y7SUFDRCw4Q0FBOEMsR0FBRztRQUM3QyxNQUFNLEVBQUUseUZBQXlGO1FBQ2pHLGFBQWEsRUFBRSxpRUFBaUU7UUFDaEYsVUFBVSxFQUFFO1lBQ1IsT0FBTyxFQUFFLENBQUM7Z0JBQ04sV0FBVyxFQUFFLFlBQVk7Z0JBQ3pCLFdBQVcsRUFBRSxDQUFDO2dCQUNkLE1BQU0sRUFBRTtvQkFDSixTQUFTLEVBQUU7d0JBQ1AsVUFBVSxFQUFFLEdBQUc7d0JBQ2YsV0FBVyxFQUFFOzRCQUNULGVBQWU7eUJBQ2xCO3FCQUNKO2lCQUNKO2FBQ0o7Z0JBQ0c7b0JBQ0ksV0FBVyxFQUFFLFdBQVc7b0JBQ3hCLFdBQVcsRUFBRSxFQUFFO29CQUNmLE1BQU0sRUFBRTt3QkFDSixTQUFTLEVBQUU7NEJBQ1AsVUFBVSxFQUFFLEdBQUc7NEJBQ2YsV0FBVyxFQUFFO2dDQUNULGVBQWU7NkJBQ2xCO3lCQUNKO3FCQUNKO2lCQUNKO2dCQUNEO29CQUNJLFdBQVcsRUFBRSxVQUFVO29CQUN2QixXQUFXLEVBQUUsSUFBSTtvQkFDakIsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZUFBZTs2QkFDbEI7eUJBQ0o7cUJBQ0o7aUJBQ0o7Z0JBQ0Q7b0JBQ0ksV0FBVyxFQUFFLFlBQVk7b0JBQ3pCLFdBQVcsRUFBRSxJQUFJO29CQUNqQixNQUFNLEVBQUU7d0JBQ0osU0FBUyxFQUFFOzRCQUNQLFVBQVUsRUFBRSxHQUFHOzRCQUNmLFdBQVcsRUFBRTtnQ0FDVCxlQUFlOzZCQUNsQjt5QkFDSjtxQkFDSjtpQkFDSixDQUFDO1NBQ1Q7UUFDRCxNQUFNLEVBQUUsYUFBYTtRQUNyQixRQUFRLEVBQUUsQ0FBQztZQUNQLFVBQVUsRUFBRSxlQUFlO1lBQzNCLE9BQU8sRUFBRSxZQUFZO1NBQ3hCLENBQUM7WUFDRSxVQUFVLEVBQUUsZUFBZTtBQUN2QyxZQUFZLE9BQU8sRUFBRSxXQUFXOztTQUV2QixDQUFDO1lBQ0UsVUFBVSxFQUFFLGVBQWU7QUFDdkMsWUFBWSxPQUFPLEVBQUUsVUFBVTs7U0FFdEIsQ0FBQztZQUNFLFVBQVUsRUFBRSxlQUFlO1lBQzNCLE9BQU8sRUFBRSxZQUFZO1NBQ3hCLENBQUM7S0FDTDtJQUNELHlCQUF5QixFQUFFO1FBQ3ZCLE1BQU0sRUFBRSxtRUFBbUU7UUFDM0UsYUFBYSxFQUFFLGdKQUFnSjtRQUMvSixVQUFVLEVBQUU7WUFDUixPQUFPLEVBQUUsQ0FBQztnQkFDTixXQUFXLEVBQUUsV0FBVztnQkFDeEIsV0FBVyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxFQUFFO29CQUNKLFNBQVMsRUFBRTt3QkFDUCxVQUFVLEVBQUUsR0FBRzt3QkFDZixXQUFXLEVBQUU7NEJBQ1QsZUFBZTt5QkFDbEI7cUJBQ0o7aUJBQ0o7YUFDSjtnQkFDRztvQkFDSSxXQUFXLEVBQUUsT0FBTztvQkFDcEIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZUFBZTs2QkFDbEI7eUJBQ0o7cUJBQ0o7aUJBQ0o7Z0JBQ0Q7b0JBQ0ksV0FBVyxFQUFFLE1BQU07b0JBQ25CLFdBQVcsRUFBRSxFQUFFO29CQUNmLE1BQU0sRUFBRTt3QkFDSixTQUFTLEVBQUU7NEJBQ1AsVUFBVSxFQUFFLEdBQUc7NEJBQ2YsV0FBVyxFQUFFO2dDQUNULGVBQWU7NkJBQ2xCO3lCQUNKO3FCQUNKO2lCQUNKLENBQUM7U0FDVDtRQUNELE1BQU0sRUFBRSxhQUFhO1FBQ3JCLFFBQVEsRUFBRSxDQUFDO1lBQ1AsVUFBVSxFQUFFLGVBQWU7WUFDM0IsT0FBTyxFQUFFLE9BQU87U0FDbkIsQ0FBQztLQUNMO0lBQ0QsMkNBQTJDLEVBQUU7UUFDekMsTUFBTSxFQUFFLGtGQUFrRjtRQUMxRixhQUFhLEVBQUUsNklBQTZJO1FBQzVKLFVBQVUsRUFBRTtZQUNSLE9BQU8sRUFBRSxDQUFDO2dCQUNOLFdBQVcsRUFBRSxZQUFZO2dCQUN6QixXQUFXLEVBQUUsQ0FBQztnQkFDZCxNQUFNLEVBQUU7b0JBQ0osU0FBUyxFQUFFO3dCQUNQLFVBQVUsRUFBRSxHQUFHO3dCQUNmLFdBQVcsRUFBRTs0QkFDVCxlQUFlO3lCQUNsQjtxQkFDSjtpQkFDSjthQUNKO2dCQUNHO29CQUNJLFdBQVcsRUFBRSxXQUFXO29CQUN4QixXQUFXLEVBQUUsRUFBRTtvQkFDZixNQUFNLEVBQUU7d0JBQ0osU0FBUyxFQUFFOzRCQUNQLFVBQVUsRUFBRSxHQUFHOzRCQUNmLFdBQVcsRUFBRTtnQ0FDVCxlQUFlOzZCQUNsQjt5QkFDSjtxQkFDSjtpQkFDSjtnQkFDRDtvQkFDSSxXQUFXLEVBQUUsWUFBWTtvQkFDekIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZ0JBQWdCOzZCQUNuQjt5QkFDSjtxQkFDSjtpQkFDSjtnQkFDRDtvQkFDSSxXQUFXLEVBQUUsV0FBVztvQkFDeEIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZ0JBQWdCOzZCQUNuQjt5QkFDSjtxQkFDSjtpQkFDSjtnQkFDRDtvQkFDSSxXQUFXLEVBQUUsVUFBVTtvQkFDdkIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZ0JBQWdCOzZCQUNuQjt5QkFDSjtxQkFDSjtpQkFDSjtnQkFDRDtvQkFDSSxXQUFXLEVBQUUsWUFBWTtvQkFDekIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZ0JBQWdCOzZCQUNuQjt5QkFDSjtxQkFDSjtpQkFDSjtnQkFDRDtvQkFDSSxXQUFXLEVBQUUsVUFBVTtvQkFDdkIsV0FBVyxFQUFFLElBQUk7b0JBQ2pCLE1BQU0sRUFBRTt3QkFDSixTQUFTLEVBQUU7NEJBQ1AsVUFBVSxFQUFFLEdBQUc7NEJBQ2YsV0FBVyxFQUFFO2dDQUNULGVBQWU7NkJBQ2xCO3lCQUNKO3FCQUNKO2lCQUNKO2dCQUNEO29CQUNJLFdBQVcsRUFBRSxZQUFZO29CQUN6QixXQUFXLEVBQUUsSUFBSTtvQkFDakIsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRTs0QkFDUCxVQUFVLEVBQUUsR0FBRzs0QkFDZixXQUFXLEVBQUU7Z0NBQ1QsZUFBZTs2QkFDbEI7eUJBQ0o7cUJBQ0o7aUJBQ0osQ0FBQztTQUNUO1FBQ0QsTUFBTSxFQUFFLDBCQUEwQjtRQUNsQyxRQUFRLEVBQUUsQ0FBQztZQUNQLFVBQVUsRUFBRSxlQUFlO1lBQzNCLE9BQU8sRUFBRSxZQUFZO1NBQ3hCLENBQUM7WUFDRSxVQUFVLEVBQUUsZUFBZTtZQUMzQixPQUFPLEVBQUUsV0FBVztTQUN2QixDQUFDO1lBQ0UsVUFBVSxFQUFFLGVBQWU7WUFDM0IsT0FBTyxFQUFFLFVBQVU7U0FDdEIsQ0FBQztZQUNFLFVBQVUsRUFBRSxlQUFlO1lBQzNCLE9BQU8sRUFBRSxZQUFZO1NBQ3hCLENBQUM7S0FDTDtJQUNELDJCQUEyQixFQUFFO1FBQ3pCLFVBQVUsRUFBRTtZQUNSLE9BQU8sRUFBRSxDQUFDO2dCQUNOLFdBQVcsRUFBRSxPQUFPO2dCQUNwQixNQUFNLEVBQUU7b0JBQ0osU0FBUyxFQUFFO3dCQUNQLFVBQVUsRUFBRSxHQUFHO3dCQUNmLFdBQVcsRUFBRTs0QkFDVCxlQUFlO3lCQUNsQjtxQkFDSjtpQkFDSjthQUNKLENBQUM7WUFDRixPQUFPLEVBQUU7Z0JBQ0wsV0FBVyxFQUFFO29CQUNULGdCQUFnQjtpQkFDbkI7YUFDSjtTQUNKO0tBQ0o7Ozs7O0FDelVMLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7O0FBRTlCLFFBQVEsQ0FBQyxZQUFZLEVBQUUsWUFBWTtJQUMvQixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNsQyxJQUFJLENBQUMsV0FBVyxFQUFFO1FBQ2QsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7UUFDekIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUMsS0FBSzs7SUFFRCxJQUFJLE9BQU8sQ0FBQztJQUNaLFVBQVUsQ0FBQyxVQUFVLElBQUksRUFBRTtRQUN2QixJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2QsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNsQyxTQUFTOztRQUVELElBQUksV0FBVyxFQUFFO1lBQ2IsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2pDLFNBQVM7O1FBRUQsT0FBTyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNWLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsVUFBVSxDQUFDO1NBQzNCO1FBQ0QsT0FBTyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDL0IsUUFBUSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7UUFFbkMsSUFBSSxrQkFBa0IsR0FBRyxFQUFFLENBQUM7UUFDNUIsWUFBWSxHQUFHO1lBQ1gsT0FBTyxFQUFFLFVBQVUsSUFBSSxFQUFFLEtBQUssRUFBRTtnQkFDNUIsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFLFVBQVUsSUFBSSxFQUFFO2dCQUNyQixPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBQ0QsVUFBVSxFQUFFLFVBQVUsSUFBSSxFQUFFO2dCQUN4QixPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25DO1NBQ0osQ0FBQztBQUNWLFFBQVEsY0FBYyxHQUFHLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLGNBQWMsQ0FBQztBQUM1RTs7UUFFUSxLQUFLLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7WUFDekIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDM0IsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzNCO0FBQ2IsU0FBUzs7UUFFRCxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXO1lBQ3hCLElBQUksRUFBRSxDQUFDO1NBQ1YsQ0FBQyxDQUFDO0FBQ1gsS0FBSyxDQUFDLENBQUM7O0lBRUgsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFlBQVk7UUFDckMsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLFlBQVk7WUFDdEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN0RCxTQUFTLENBQUM7O1FBRUYsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLFlBQVk7WUFDdEQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzVDLFlBQVksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFdkMsWUFBWSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O1lBRXJELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO0FBQzlFLFNBQVMsQ0FBQzs7UUFFRixFQUFFLENBQUMseUNBQXlDLEVBQUUsWUFBWTtZQUN0RCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUN2RCxZQUFZLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXZDLFlBQVksT0FBTyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7WUFFakQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLDZCQUE2QixDQUFDLENBQUM7QUFDOUUsU0FBUyxDQUFDOztRQUVGLEVBQUUsQ0FBQyx5Q0FBeUMsRUFBRSxZQUFZO1lBQ3RELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBQ3ZFLFlBQVksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFdkMsWUFBWSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdEOztZQUVZLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3BGLFNBQVMsQ0FBQzs7UUFFRixFQUFFLENBQUMseUNBQXlDLEVBQUUsWUFBWTtZQUN0RCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsd0RBQXdELENBQUMsQ0FBQztBQUN2RixZQUFZLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXZDLFlBQVksT0FBTyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7WUFFakQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLG1DQUFtQyxDQUFDLENBQUM7QUFDcEYsU0FBUyxDQUFDOztRQUVGLEVBQUUsQ0FBQyx5Q0FBeUMsRUFBRSxZQUFZO1lBQ3RELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0FBQ3ZGLFlBQVksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFdkMsWUFBWSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztZQUVqRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUNBQW1DLENBQUMsQ0FBQztBQUNwRixTQUFTLENBQUM7O1FBRUYsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLFlBQVk7WUFDdEQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7QUFDdkYsWUFBWSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV2QyxZQUFZLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztZQUUvRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsK0JBQStCLENBQUMsQ0FBQztZQUNwRSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUNwRSxTQUFTLENBQUM7O1FBRUYsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLFlBQVk7WUFDdEQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7QUFDdkYsWUFBWSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV2QyxZQUFZLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O1lBRWpELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO0FBQy9GLFNBQVMsQ0FBQzs7UUFFRixFQUFFLENBQUMseUNBQXlDLEVBQUUsWUFBWTtZQUN0RCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsd0ZBQXdGLENBQUMsQ0FBQztBQUN2SCxZQUFZLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXZDLFlBQVksSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxDQUFDOztBQUUzRCxZQUFZLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O1lBRWpELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUM1RCxTQUFTLENBQUM7QUFDVjs7QUFFQSxLQUFLLENBQUMsQ0FBQzs7SUFFSCxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsWUFBWTtRQUNuQyxVQUFVLENBQUMsWUFBWTtZQUNuQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDbEMsU0FBUyxDQUFDLENBQUM7O1FBRUgsRUFBRSxDQUFDLDhEQUE4RCxFQUFFLFlBQVk7WUFDM0UsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztBQUN6RCxTQUFTLENBQUMsQ0FBQzs7UUFFSCxFQUFFLENBQUMsb0RBQW9ELEVBQUUsWUFBWTtZQUNqRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNoRSxTQUFTLENBQUMsQ0FBQzs7UUFFSCxFQUFFLENBQUMsZ0RBQWdELEVBQUUsWUFBWTtBQUN6RSxZQUFZLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztZQUVwQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN6RCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1NBQ3RFLENBQUMsQ0FBQztBQUNYLEtBQUssQ0FBQyxDQUFDOztJQUVILFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxZQUFZO1FBQzVDLFVBQVUsQ0FBQyxZQUFZO1lBQ25CLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUNsQyxTQUFTLENBQUMsQ0FBQzs7UUFFSCxFQUFFLENBQUMsa0VBQWtFLEVBQUUsWUFBWTtZQUMvRSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDNUMsWUFBWSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztZQUUzQixJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM5QixNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUN0QixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUM3QixNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNuQyxhQUFhLENBQUMsQ0FBQzs7WUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUMxRCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNyRSxTQUFTLENBQUMsQ0FBQzs7UUFFSCxFQUFFLENBQUMsMkRBQTJELEVBQUUsWUFBWTtZQUN4RSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDNUMsWUFBWSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztZQUUzQixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN6QixNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLEtBQUs7QUFDNUIsYUFBYSxDQUFDLENBQUM7O1lBRUgsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckQsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2pFLFNBQVMsQ0FBQyxDQUFDOztRQUVILEVBQUUsQ0FBQyw2Q0FBNkMsRUFBRSxZQUFZO0FBQ3RFLFlBQVksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7WUFFMUIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzVDLFlBQVksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7WUFFM0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDbkMsYUFBYSxDQUFDLENBQUM7O1lBRUgsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDaEUsU0FBUyxDQUFDLENBQUM7O1FBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLFlBQVk7WUFDM0QsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7QUFDckUsWUFBWSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztZQUUzQixJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM5QixNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsYUFBYSxDQUFDLENBQUM7O1lBRUgsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELGFBQWEsQ0FBQyxDQUFDOztZQUVILE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ3RFLFNBQVMsQ0FBQyxDQUFDOztRQUVILEVBQUUsQ0FBQyx3RUFBd0UsRUFBRSxZQUFZO1lBQ3JGLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1QyxZQUFZLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7O1lBRTNCLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixLQUFLLEVBQUUsR0FBRztBQUMxQixhQUFhLENBQUMsQ0FBQzs7WUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN4RCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUQsU0FBUyxDQUFDLENBQUM7O1FBRUgsRUFBRSxDQUFDLHFFQUFxRSxFQUFFLFlBQVk7WUFDbEYsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7QUFDN0UsWUFBWSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztZQUUzQixJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNuQyxhQUFhLENBQUMsQ0FBQzs7WUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN0RCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ25FLENBQUMsQ0FBQztBQUNYLEtBQUssQ0FBQyxDQUFDOztBQUVQLElBQUksUUFBUSxDQUFDLGNBQWMsRUFBRSxZQUFZOztRQUVqQyxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEMsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ25ELFFBQVEsRUFBRSxDQUFDLDRDQUE0QyxFQUFFLFVBQVUsSUFBSSxFQUFFOztZQUU3RCxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDbkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsSUFBSSxFQUFFLFFBQVEsRUFBRTtnQkFDL0MsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFDO2dCQUMxQyxJQUFJLEVBQUUsQ0FBQztnQkFDUCxNQUFNLEdBQUcsSUFBSSxDQUFDO0FBQzlCLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQzs7QUFFbEIsWUFBWSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDOztZQUU3QixJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNULElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3pDLGFBQWE7O0FBRWIsU0FBUyxDQUFDLENBQUM7O1FBRUgsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLFVBQVUsSUFBSSxFQUFFO1lBQzNELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1QyxZQUFZLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7O1lBRTNCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztnQkFDdkIsR0FBRyxFQUFFLFVBQVUsR0FBRyxFQUFFO29CQUNoQixJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUMvQixJQUFJLEVBQUUsQ0FBQztxQkFDVjtpQkFDSjtnQkFDRCxPQUFPLEVBQUUsWUFBWTtvQkFDakIsSUFBSSxFQUFFLENBQUM7aUJBQ1Y7Z0JBQ0QsS0FBSyxFQUFFLFVBQVUsR0FBRyxFQUFFO29CQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNwQjtBQUNqQixhQUFhLENBQUMsQ0FBQzs7WUFFSCxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dCQUMvQyxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7Z0JBQzFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDOztZQUVOLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDekMsU0FBUyxDQUFDLENBQUM7O1FBRUgsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLFVBQVUsSUFBSSxFQUFFO1lBQ3JELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1QyxZQUFZLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7O1lBRTNCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztZQUNuQixJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dCQUMvQyxJQUFJLENBQUMsSUFBSSxFQUFFO29CQUNQLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQztvQkFDMUMsTUFBTSxHQUFHLElBQUksQ0FBQztpQkFDakIsTUFBTSxJQUFJLElBQUksSUFBSSxVQUFVLEVBQUU7b0JBQzNCLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyx5QkFBeUIsQ0FBQztvQkFDbkQsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDM0IsTUFBTTtvQkFDSCxJQUFJLEVBQUUsQ0FBQztvQkFDUCxNQUFNLEdBQUcsSUFBSSxDQUFDO2lCQUNqQjtBQUNqQixhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7O1lBRU4sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN6QyxTQUFTLENBQUMsQ0FBQzs7QUFFWCxRQUFRLFNBQVMsa0JBQWtCLENBQUMsSUFBSSxFQUFFO0FBQzFDOztZQUVZLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDWCxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLElBQUksRUFBRTtvQkFDMUIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO29CQUNuQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hELG9CQUFvQixRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUUvQyxvQkFBb0IsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7O29CQUUzQyxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO3dCQUN2QyxJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUM1QixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsTUFBTSxFQUFFLENBQUMsRUFBRTs0QkFDakMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsWUFBWTtnQ0FDdEQsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFO29DQUN0QixNQUFNLEdBQUcsSUFBSSxDQUFDO29DQUNkLElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7aUNBQ3RGLE1BQU07b0NBQ0gsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUNBQ3hCOzZCQUNKLENBQUMsQ0FBQztBQUMvQix5QkFBeUIsQ0FBQyxDQUFDO0FBQzNCOztxQkFFcUIsTUFBTTt3QkFDSCxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLGtFQUFrRSxFQUFFLFlBQVk7NEJBQ2hHLE1BQU0sR0FBRyxJQUFJLENBQUM7NEJBQ2QsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7eUJBQ25DLENBQUMsQ0FBQztBQUMzQixxQkFBcUI7O29CQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQzt3QkFDdkIsR0FBRyxFQUFFLFVBQVUsR0FBRyxFQUFFOzRCQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUNwQjt3QkFDRCxPQUFPLEVBQUUsWUFBWTs0QkFDakIsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtnQ0FDaEMsTUFBTSxHQUFHLElBQUksQ0FBQztnQ0FDZCxJQUFJLEVBQUUsQ0FBQzs2QkFDVjt5QkFDSjt3QkFDRCxLQUFLLEVBQUUsVUFBVSxHQUFHLEVBQUU7NEJBQ2xCLE1BQU0sR0FBRyxJQUFJLENBQUM7NEJBQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUNiO0FBQ3pCLHFCQUFxQixDQUFDLENBQUM7O29CQUVILElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQy9DLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEQscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7O29CQUVOLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ2hDLENBQUMsQ0FBQzthQUNOO0FBQ2IsU0FBUztBQUNUOztRQUVRLEtBQUssSUFBSSxZQUFZLElBQUksYUFBYSxFQUFFO1lBQ3BDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzVELFNBQVM7O1FBRUQsRUFBRSxDQUFDLDBGQUEwRixFQUFFLFVBQVUsSUFBSSxFQUFFO1lBQzNHLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ3hELFlBQVksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7WUFFM0IsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztZQUNsQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLFlBQVk7Z0JBQ2hFLFNBQVMsRUFBRSxDQUFDO2dCQUNaLElBQUksU0FBUyxLQUFLLENBQUMsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFO29CQUNuQyxJQUFJLEVBQUUsQ0FBQztpQkFDVjtBQUNqQixhQUFhLENBQUMsQ0FBQzs7WUFFSCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLFlBQVk7Z0JBQ2pFLFFBQVEsRUFBRSxDQUFDO0FBQzNCLGFBQWEsQ0FBQyxDQUFDOztZQUVILElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLElBQUksRUFBRSxRQUFRLEVBQUU7Z0JBQy9DLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyx5Q0FBeUMsQ0FBQztnQkFDbkUsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN4QyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7O1lBRU4sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN6QyxTQUFTLENBQUMsQ0FBQzs7QUFFWCxRQUFRLFNBQVMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFO0FBQ3hDOztZQUVZLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDWCxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLElBQUksRUFBRTtvQkFDMUIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO29CQUNuQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM1QixRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9DLG9CQUFvQixJQUFJLEtBQUssQ0FBQzs7b0JBRVYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsUUFBUSxFQUFFO3dCQUN4QyxLQUFLLEdBQUcsUUFBUSxDQUFDO3dCQUNqQixRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEQscUJBQXFCLENBQUMsQ0FBQzs7QUFFdkIsb0JBQW9CLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUMxQzs7QUFFQSxvQkFBb0IsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7O29CQUUzQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsTUFBTSxFQUFFO3dCQUM5QixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO3dCQUNqQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDOUIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7NEJBQ25CLEtBQUssRUFBRSxLQUFLO3lCQUNmLENBQUMsQ0FBQztBQUMzQixxQkFBcUIsQ0FBQyxDQUFDOztBQUV2QixvQkFBb0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQzdEOztvQkFFb0IsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7d0JBQy9CLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxNQUFNLEVBQUUsQ0FBQyxFQUFFOzRCQUNqQyxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxZQUFZO2dDQUN0RCxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLEVBQUU7b0NBQ3RCLE1BQU0sR0FBRyxJQUFJLENBQUM7b0NBQ2QsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztpQ0FDdEYsTUFBTTtvQ0FDSCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQ0FDeEI7NkJBQ0osQ0FBQyxDQUFDO0FBQy9CLHlCQUF5QixDQUFDLENBQUM7QUFDM0I7O3FCQUVxQixNQUFNO3dCQUNILENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsa0VBQWtFLEVBQUUsWUFBWTs0QkFDaEcsTUFBTSxHQUFHLElBQUksQ0FBQzs0QkFDZCxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQzt5QkFDbkMsQ0FBQyxDQUFDO0FBQzNCLHFCQUFxQjs7b0JBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDO3dCQUN2QixHQUFHLEVBQUUsVUFBVSxHQUFHLEVBQUU7NEJBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQ3BCO3dCQUNELE9BQU8sRUFBRSxZQUFZOzRCQUNqQixJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO2dDQUNoQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dDQUNkLElBQUksRUFBRSxDQUFDOzZCQUNWO3lCQUNKO3dCQUNELEtBQUssRUFBRSxVQUFVLEdBQUcsRUFBRTs0QkFDbEIsTUFBTSxHQUFHLElBQUksQ0FBQzs0QkFDZCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQ2I7QUFDekIscUJBQXFCLENBQUMsQ0FBQzs7b0JBRUgsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDL0MsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hDLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFDOztvQkFFTixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDLENBQUM7YUFDTjtBQUNiLFNBQVM7QUFDVDs7UUFFUSxLQUFLLElBQUksU0FBUyxJQUFJLFdBQVcsRUFBRTtZQUMvQixnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztTQUM1QztLQUNKLENBQUMsQ0FBQztDQUNOLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2pha2VhcmNoaWJhbGQvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMi4wLjFcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyB8fCAodHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZSh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJF9pc0FycmF5O1xuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJGlzQXJyYXkgPSAkJHV0aWxzJCRfaXNBcnJheTtcbiAgICB2YXIgJCR1dGlscyQkbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRGKCkgeyB9XG5cbiAgICB2YXIgJCR1dGlscyQkb19jcmVhdGUgPSAoT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vjb25kIGFyZ3VtZW50IG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIH1cbiAgICAgICQkdXRpbHMkJEYucHJvdG90eXBlID0gbztcbiAgICAgIHJldHVybiBuZXcgJCR1dGlscyQkRigpO1xuICAgIH0pO1xuXG4gICAgdmFyICQkYXNhcCQkbGVuID0gMDtcblxuICAgIHZhciAkJGFzYXAkJGRlZmF1bHQgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICAgICQkYXNhcCQkcXVldWVbJCRhc2FwJCRsZW5dID0gY2FsbGJhY2s7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuICsgMV0gPSBhcmc7XG4gICAgICAkJGFzYXAkJGxlbiArPSAyO1xuICAgICAgaWYgKCQkYXNhcCQkbGVuID09PSAyKSB7XG4gICAgICAgIC8vIElmIGxlbiBpcyAxLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAgICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAgICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkYXNhcCQkYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgICB2YXIgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuXG4gICAgLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbiAgICB2YXIgJCRhc2FwJCRpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU5leHRUaWNrKCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCQkYXNhcCQkZmx1c2gpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcigkJGFzYXAkJGZsdXNoKTtcbiAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gd2ViIHdvcmtlclxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSAkJGFzYXAkJGZsdXNoO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VTZXRUaW1lb3V0KCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KCQkYXNhcCQkZmx1c2gsIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkZmx1c2goKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8ICQkYXNhcCQkbGVuOyBpKz0yKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9ICQkYXNhcCQkcXVldWVbaV07XG4gICAgICAgIHZhciBhcmcgPSAkJGFzYXAkJHF1ZXVlW2krMV07XG5cbiAgICAgICAgY2FsbGJhY2soYXJnKTtcblxuICAgICAgICAkJGFzYXAkJHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICAkJGFzYXAkJHF1ZXVlW2krMV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgICQkYXNhcCQkbGVuID0gMDtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRzY2hlZHVsZUZsdXNoO1xuXG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VOZXh0VGljaygpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgfSBlbHNlIGlmICgkJGFzYXAkJGlzV29ya2VyKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlU2V0VGltZW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRub29wKCkge31cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEZVTEZJTExFRCA9IDE7XG4gICAgdmFyICQkJGludGVybmFsJCRSRUpFQ1RFRCAgPSAyO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS4nKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRnZXRUaGVuKHByb21pc2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlLnRoZW47XG4gICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgICAgICByZXR1cm4gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gICAgICAgJCRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICAgICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3IgPSAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB0aGVuYWJsZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICAgICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9LCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgICAgIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2UgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSkge1xuICAgICAgaWYgKG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IgPT09IHByb21pc2UuY29uc3RydWN0b3IpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRoZW4gPSAkJCRpbnRlcm5hbCQkZ2V0VGhlbihtYXliZVRoZW5hYmxlKTtcblxuICAgICAgICBpZiAodGhlbiA9PT0gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9IGVsc2UgaWYgKCQkdXRpbHMkJGlzRnVuY3Rpb24odGhlbikpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkpO1xuICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICAgICAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICAgICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cblxuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRGVUxGSUxMRUQ7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRSRUpFQ1RFRDtcbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIGxlbmd0aCA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgICAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcblxuICAgICAgaWYgKGxlbmd0aCA9PT0gMCAmJiBwYXJlbnQuX3N0YXRlKSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycztcbiAgICAgIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKSB7XG4gICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUiA9IG5ldyAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9ICQkdXRpbHMkJGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgICAgIGlmIChoYXNDYWxsYmFjaykge1xuICAgICAgICB2YWx1ZSA9ICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgICAgICBpZiAodmFsdWUgPT09ICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gZGV0YWlsO1xuICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIC8vIG5vb3BcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZShwcm9taXNlLCByZXNvbHZlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpe1xuICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkbWFrZVNldHRsZWRSZXN1bHQoc3RhdGUsIHBvc2l0aW9uLCB2YWx1ZSkge1xuICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdmdWxmaWxsZWQnLFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdGF0ZTogJ3JlamVjdGVkJyxcbiAgICAgICAgICByZWFzb246IHZhbHVlXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQsIGFib3J0T25SZWplY3QsIGxhYmVsKSB7XG4gICAgICB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgICB0aGlzLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgIHRoaXMuX2Fib3J0T25SZWplY3QgPSBhYm9ydE9uUmVqZWN0O1xuXG4gICAgICBpZiAodGhpcy5fdmFsaWRhdGVJbnB1dChpbnB1dCkpIHtcbiAgICAgICAgdGhpcy5faW5wdXQgICAgID0gaW5wdXQ7XG4gICAgICAgIHRoaXMubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgICAgIHRoaXMuX2luaXQoKTtcblxuICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgICAgIHRoaXMuX2VudW1lcmF0ZSgpO1xuICAgICAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QodGhpcy5wcm9taXNlLCB0aGlzLl92YWxpZGF0aW9uRXJyb3IoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRlSW5wdXQgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuICQkdXRpbHMkJGlzQXJyYXkoaW5wdXQpO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGlvbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG4gICAgfTtcblxuICAgIHZhciAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0ID0gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcjtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsZW5ndGggID0gdGhpcy5sZW5ndGg7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcbiAgICAgIHZhciBpbnB1dCAgID0gdGhpcy5faW5wdXQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbihlbnRyeSwgaSkge1xuICAgICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgICAgaWYgKCQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZShlbnRyeSkpIHtcbiAgICAgICAgaWYgKGVudHJ5LmNvbnN0cnVjdG9yID09PSBjICYmIGVudHJ5Ll9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgICBlbnRyeS5fb25lcnJvciA9IG51bGw7XG4gICAgICAgICAgdGhpcy5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KGMucmVzb2x2ZShlbnRyeSksIGkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcbiAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCBlbnRyeSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICAgIGlmICh0aGlzLl9hYm9ydE9uUmVqZWN0ICYmIHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB0aGlzLl9tYWtlUmVzdWx0KHN0YXRlLCBpLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fbWFrZVJlc3VsdCA9IGZ1bmN0aW9uKHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fd2lsbFNldHRsZUF0ID0gZnVuY3Rpb24ocHJvbWlzZSwgaSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoJCQkaW50ZXJuYWwkJFJFSkVDVEVELCBpLCByZWFzb24pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkYWxsJCRkZWZhdWx0ID0gZnVuY3Rpb24gYWxsKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICByZXR1cm4gbmV3ICQkJGVudW1lcmF0b3IkJGRlZmF1bHQodGhpcywgZW50cmllcywgdHJ1ZSAvKiBhYm9ydCBvbiByZWplY3QgKi8sIGxhYmVsKS5wcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQgPSBmdW5jdGlvbiByYWNlKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcblxuICAgICAgaWYgKCEkJHV0aWxzJCRpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcblxuICAgICAgZnVuY3Rpb24gb25GdWxmaWxsbWVudCh2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uUmVqZWN0aW9uKHJlYXNvbikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUoQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKSwgdW5kZWZpbmVkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQgPSBmdW5jdGlvbiByZXNvbHZlKG9iamVjdCwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQgPSBmdW5jdGlvbiByZWplY3QocmVhc29uLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2U7XG5cbiAgICAvKipcbiAgICAgIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgICAgIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gICAgICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZeKAmXMgZXZlbnR1YWwgdmFsdWUgb3IgdGhlIHJlYXNvblxuICAgICAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIFRlcm1pbm9sb2d5XG4gICAgICAtLS0tLS0tLS0tLVxuXG4gICAgICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAgICAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAgICAgLSBgdmFsdWVgIGlzIGFueSBsZWdhbCBKYXZhU2NyaXB0IHZhbHVlIChpbmNsdWRpbmcgdW5kZWZpbmVkLCBhIHRoZW5hYmxlLCBvciBhIHByb21pc2UpLlxuICAgICAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gICAgICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gICAgICAtIGBzZXR0bGVkYCB0aGUgZmluYWwgcmVzdGluZyBzdGF0ZSBvZiBhIHByb21pc2UsIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cblxuICAgICAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gICAgICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICAgICAgc3RhdGUuICBQcm9taXNlcyB0aGF0IGFyZSByZWplY3RlZCBoYXZlIGEgcmVqZWN0aW9uIHJlYXNvbiBhbmQgYXJlIGluIHRoZVxuICAgICAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgICAgIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICAgICAgcHJvbWlzZSwgdGhlbiB0aGUgb3JpZ2luYWwgcHJvbWlzZSdzIHNldHRsZWQgc3RhdGUgd2lsbCBtYXRjaCB0aGUgdmFsdWUnc1xuICAgICAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gICAgICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gICAgICBpdHNlbGYgZnVsZmlsbC5cblxuXG4gICAgICBCYXNpYyBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBgYGBqc1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gb24gc3VjY2Vzc1xuICAgICAgICByZXNvbHZlKHZhbHVlKTtcblxuICAgICAgICAvLyBvbiBmYWlsdXJlXG4gICAgICAgIHJlamVjdChyZWFzb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS0tLS1cblxuICAgICAgUHJvbWlzZXMgc2hpbmUgd2hlbiBhYnN0cmFjdGluZyBhd2F5IGFzeW5jaHJvbm91cyBpbnRlcmFjdGlvbnMgc3VjaCBhc1xuICAgICAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBnZXRKU09OKHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5ET05FKSB7XG4gICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gICAgICBgYGBqc1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICAgICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgICAgIF0pLnRoZW4oZnVuY3Rpb24odmFsdWVzKXtcbiAgICAgICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgICAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBjbGFzcyBQcm9taXNlXG4gICAgICBAcGFyYW0ge2Z1bmN0aW9ufSByZXNvbHZlclxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQGNvbnN0cnVjdG9yXG4gICAgKi9cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIHRoaXMuX2lkID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyKys7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgICAgIGlmICgkJCRpbnRlcm5hbCQkbm9vcCAhPT0gcmVzb2x2ZXIpIHtcbiAgICAgICAgaWYgKCEkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgICAgICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSkpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5hbGwgPSAkJHByb21pc2UkYWxsJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yYWNlID0gJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlc29sdmUgPSAkJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVqZWN0ID0gJCRwcm9taXNlJHJlamVjdCQkZGVmYXVsdDtcblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gICAgICBjb25zdHJ1Y3RvcjogJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLFxuXG4gICAgLyoqXG4gICAgICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgICAgIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gICAgICByZWFzb24gd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgIC8vIHVzZXIgaXMgYXZhaWxhYmxlXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyB1c2VyIGlzIHVuYXZhaWxhYmxlLCBhbmQgeW91IGFyZSBnaXZlbiB0aGUgcmVhc29uIHdoeVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQ2hhaW5pbmdcbiAgICAgIC0tLS0tLS0tXG5cbiAgICAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gICAgICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gICAgICBvciByZWplY3Rpb24gaGFuZGxlciwgb3IgcmVqZWN0ZWQgaWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gdXNlci5uYW1lO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gJ2RlZmF1bHQgbmFtZSc7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgICAgIC8vIHdpbGwgYmUgYCdkZWZhdWx0IG5hbWUnYFxuICAgICAgfSk7XG5cbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgICAgIH0pO1xuICAgICAgYGBgXG4gICAgICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgUGVkYWdvZ2ljYWxFeGNlcHRpb24oJ1Vwc3RyZWFtIGVycm9yJyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIFRoZSBgUGVkZ2Fnb2NpYWxFeGNlcHRpb25gIGlzIHByb3BhZ2F0ZWQgYWxsIHRoZSB3YXkgZG93biB0byBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBc3NpbWlsYXRpb25cbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICAgICAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICAgICAgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uIGhhbmRsZXIuIFRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCB0aGVuIGJlIHBlbmRpbmdcbiAgICAgIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgU2ltcGxlIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kUmVzdWx0KGZ1bmN0aW9uKHJlc3VsdCwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZFJlc3VsdCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgYXV0aG9yLCBib29rcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgICAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG5cbiAgICAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuXG4gICAgICB9XG5cbiAgICAgIGZpbmRBdXRob3IoZnVuY3Rpb24oYXV0aG9yLCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmluZEJvb29rc0J5QXV0aG9yKGF1dGhvciwgZnVuY3Rpb24oYm9va3MsIGVycikge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZEF1dGhvcigpLlxuICAgICAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihib29rcyl7XG4gICAgICAgICAgLy8gZm91bmQgYm9va3NcbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIHRoZW5cbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGVkXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICB0aGVuOiBmdW5jdGlvbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIHN0YXRlID0gcGFyZW50Ll9zdGF0ZTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQgJiYgIW9uRnVsZmlsbG1lbnQgfHwgc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCAmJiAhb25SZWplY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHBhcmVudC5fcmVzdWx0O1xuXG4gICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tzdGF0ZSAtIDFdO1xuICAgICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHN0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9LFxuXG4gICAgLyoqXG4gICAgICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gICAgICBhcyB0aGUgY2F0Y2ggYmxvY2sgb2YgYSB0cnkvY2F0Y2ggc3RhdGVtZW50LlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgICAgIH1cblxuICAgICAgLy8gc3luY2hyb25vdXNcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbmRBdXRob3IoKTtcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9XG5cbiAgICAgIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgICAgIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCBjYXRjaFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3Rpb25cbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgICdjYXRjaCc6IGZ1bmN0aW9uKG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgICAgdmFyIGxvY2FsO1xuXG4gICAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbG9jYWwgPSBnbG9iYWw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5kb2N1bWVudCkge1xuICAgICAgICBsb2NhbCA9IHdpbmRvdztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICAgIH1cblxuICAgICAgdmFyIGVzNlByb21pc2VTdXBwb3J0ID1cbiAgICAgICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAgICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAgICAgLy8gRmlyZWZveC9DaHJvbWUgZXhwZXJpbWVudGFsIGltcGxlbWVudGF0aW9uc1xuICAgICAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcImFsbFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgICAgICAvLyBhcyB0aGUgYXJnIHJhdGhlciB0aGFuIGEgZnVuY3Rpb25cbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZXNvbHZlO1xuICAgICAgICAgIG5ldyBsb2NhbC5Qcm9taXNlKGZ1bmN0aW9uKHIpIHsgcmVzb2x2ZSA9IHI7IH0pO1xuICAgICAgICAgIHJldHVybiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgICAgICB9KCkpO1xuXG4gICAgICBpZiAoIWVzNlByb21pc2VTdXBwb3J0KSB7XG4gICAgICAgIGxvY2FsLlByb21pc2UgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQ7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2UgPSB7XG4gICAgICAnUHJvbWlzZSc6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCxcbiAgICAgICdwb2x5ZmlsbCc6ICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHRcbiAgICB9O1xuXG4gICAgLyogZ2xvYmFsIGRlZmluZTp0cnVlIG1vZHVsZTp0cnVlIHdpbmRvdzogdHJ1ZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZVsnYW1kJ10pIHtcbiAgICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGVbJ2V4cG9ydHMnXSkge1xuICAgICAgbW9kdWxlWydleHBvcnRzJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbJ0VTNlByb21pc2UnXSA9IGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9XG59KS5jYWxsKHRoaXMpOyIsIi8vIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1VuaXRfVGVzdGluZy8xLjBcbi8vXG4vLyBUSElTIElTIE5PVCBURVNURUQgTk9SIExJS0VMWSBUTyBXT1JLIE9VVFNJREUgVjghXG4vL1xuLy8gT3JpZ2luYWxseSBmcm9tIG5hcndoYWwuanMgKGh0dHA6Ly9uYXJ3aGFsanMub3JnKVxuLy8gQ29weXJpZ2h0IChjKSAyMDA5IFRob21hcyBSb2JpbnNvbiA8Mjgwbm9ydGguY29tPlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlICdTb2Z0d2FyZScpLCB0b1xuLy8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbi8vIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuLy8gc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbi8vIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbi8vIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyB3aGVuIHVzZWQgaW4gbm9kZSwgdGhpcyB3aWxsIGFjdHVhbGx5IGxvYWQgdGhlIHV0aWwgbW9kdWxlIHdlIGRlcGVuZCBvblxuLy8gdmVyc3VzIGxvYWRpbmcgdGhlIGJ1aWx0aW4gdXRpbCBtb2R1bGUgYXMgaGFwcGVucyBvdGhlcndpc2Vcbi8vIHRoaXMgaXMgYSBidWcgaW4gbm9kZSBtb2R1bGUgbG9hZGluZyBhcyBmYXIgYXMgSSBhbSBjb25jZXJuZWRcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbC8nKTtcblxudmFyIHBTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyAxLiBUaGUgYXNzZXJ0IG1vZHVsZSBwcm92aWRlcyBmdW5jdGlvbnMgdGhhdCB0aHJvd1xuLy8gQXNzZXJ0aW9uRXJyb3IncyB3aGVuIHBhcnRpY3VsYXIgY29uZGl0aW9ucyBhcmUgbm90IG1ldC4gVGhlXG4vLyBhc3NlcnQgbW9kdWxlIG11c3QgY29uZm9ybSB0byB0aGUgZm9sbG93aW5nIGludGVyZmFjZS5cblxudmFyIGFzc2VydCA9IG1vZHVsZS5leHBvcnRzID0gb2s7XG5cbi8vIDIuIFRoZSBBc3NlcnRpb25FcnJvciBpcyBkZWZpbmVkIGluIGFzc2VydC5cbi8vIG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiBtZXNzYWdlLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZCB9KVxuXG5hc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiBBc3NlcnRpb25FcnJvcihvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG4gIHRoaXMuYWN0dWFsID0gb3B0aW9ucy5hY3R1YWw7XG4gIHRoaXMuZXhwZWN0ZWQgPSBvcHRpb25zLmV4cGVjdGVkO1xuICB0aGlzLm9wZXJhdG9yID0gb3B0aW9ucy5vcGVyYXRvcjtcbiAgaWYgKG9wdGlvbnMubWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG9wdGlvbnMubWVzc2FnZTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBnZXRNZXNzYWdlKHRoaXMpO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IHRydWU7XG4gIH1cbiAgdmFyIHN0YWNrU3RhcnRGdW5jdGlvbiA9IG9wdGlvbnMuc3RhY2tTdGFydEZ1bmN0aW9uIHx8IGZhaWw7XG5cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBub24gdjggYnJvd3NlcnMgc28gd2UgY2FuIGhhdmUgYSBzdGFja3RyYWNlXG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgIHZhciBvdXQgPSBlcnIuc3RhY2s7XG5cbiAgICAgIC8vIHRyeSB0byBzdHJpcCB1c2VsZXNzIGZyYW1lc1xuICAgICAgdmFyIGZuX25hbWUgPSBzdGFja1N0YXJ0RnVuY3Rpb24ubmFtZTtcbiAgICAgIHZhciBpZHggPSBvdXQuaW5kZXhPZignXFxuJyArIGZuX25hbWUpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIC8vIG9uY2Ugd2UgaGF2ZSBsb2NhdGVkIHRoZSBmdW5jdGlvbiBmcmFtZVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIHN0cmlwIG91dCBldmVyeXRoaW5nIGJlZm9yZSBpdCAoYW5kIGl0cyBsaW5lKVxuICAgICAgICB2YXIgbmV4dF9saW5lID0gb3V0LmluZGV4T2YoJ1xcbicsIGlkeCArIDEpO1xuICAgICAgICBvdXQgPSBvdXQuc3Vic3RyaW5nKG5leHRfbGluZSArIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YWNrID0gb3V0O1xuICAgIH1cbiAgfVxufTtcblxuLy8gYXNzZXJ0LkFzc2VydGlvbkVycm9yIGluc3RhbmNlb2YgRXJyb3JcbnV0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLCBFcnJvcik7XG5cbmZ1bmN0aW9uIHJlcGxhY2VyKGtleSwgdmFsdWUpIHtcbiAgaWYgKHV0aWwuaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgcmV0dXJuICcnICsgdmFsdWU7XG4gIH1cbiAgaWYgKHV0aWwuaXNOdW1iZXIodmFsdWUpICYmICFpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSB8fCB1dGlsLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gdHJ1bmNhdGUocywgbikge1xuICBpZiAodXRpbC5pc1N0cmluZyhzKSkge1xuICAgIHJldHVybiBzLmxlbmd0aCA8IG4gPyBzIDogcy5zbGljZSgwLCBuKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcztcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpIHtcbiAgcmV0dXJuIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuYWN0dWFsLCByZXBsYWNlciksIDEyOCkgKyAnICcgK1xuICAgICAgICAgc2VsZi5vcGVyYXRvciArICcgJyArXG4gICAgICAgICB0cnVuY2F0ZShKU09OLnN0cmluZ2lmeShzZWxmLmV4cGVjdGVkLCByZXBsYWNlciksIDEyOCk7XG59XG5cbi8vIEF0IHByZXNlbnQgb25seSB0aGUgdGhyZWUga2V5cyBtZW50aW9uZWQgYWJvdmUgYXJlIHVzZWQgYW5kXG4vLyB1bmRlcnN0b29kIGJ5IHRoZSBzcGVjLiBJbXBsZW1lbnRhdGlvbnMgb3Igc3ViIG1vZHVsZXMgY2FuIHBhc3Ncbi8vIG90aGVyIGtleXMgdG8gdGhlIEFzc2VydGlvbkVycm9yJ3MgY29uc3RydWN0b3IgLSB0aGV5IHdpbGwgYmVcbi8vIGlnbm9yZWQuXG5cbi8vIDMuIEFsbCBvZiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBtdXN0IHRocm93IGFuIEFzc2VydGlvbkVycm9yXG4vLyB3aGVuIGEgY29ycmVzcG9uZGluZyBjb25kaXRpb24gaXMgbm90IG1ldCwgd2l0aCBhIG1lc3NhZ2UgdGhhdFxuLy8gbWF5IGJlIHVuZGVmaW5lZCBpZiBub3QgcHJvdmlkZWQuICBBbGwgYXNzZXJ0aW9uIG1ldGhvZHMgcHJvdmlkZVxuLy8gYm90aCB0aGUgYWN0dWFsIGFuZCBleHBlY3RlZCB2YWx1ZXMgdG8gdGhlIGFzc2VydGlvbiBlcnJvciBmb3Jcbi8vIGRpc3BsYXkgcHVycG9zZXMuXG5cbmZ1bmN0aW9uIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgb3BlcmF0b3IsIHN0YWNrU3RhcnRGdW5jdGlvbikge1xuICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHtcbiAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgIGFjdHVhbDogYWN0dWFsLFxuICAgIGV4cGVjdGVkOiBleHBlY3RlZCxcbiAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgc3RhY2tTdGFydEZ1bmN0aW9uOiBzdGFja1N0YXJ0RnVuY3Rpb25cbiAgfSk7XG59XG5cbi8vIEVYVEVOU0lPTiEgYWxsb3dzIGZvciB3ZWxsIGJlaGF2ZWQgZXJyb3JzIGRlZmluZWQgZWxzZXdoZXJlLlxuYXNzZXJ0LmZhaWwgPSBmYWlsO1xuXG4vLyA0LiBQdXJlIGFzc2VydGlvbiB0ZXN0cyB3aGV0aGVyIGEgdmFsdWUgaXMgdHJ1dGh5LCBhcyBkZXRlcm1pbmVkXG4vLyBieSAhIWd1YXJkLlxuLy8gYXNzZXJ0Lm9rKGd1YXJkLCBtZXNzYWdlX29wdCk7XG4vLyBUaGlzIHN0YXRlbWVudCBpcyBlcXVpdmFsZW50IHRvIGFzc2VydC5lcXVhbCh0cnVlLCAhIWd1YXJkLFxuLy8gbWVzc2FnZV9vcHQpOy4gVG8gdGVzdCBzdHJpY3RseSBmb3IgdGhlIHZhbHVlIHRydWUsIHVzZVxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKHRydWUsIGd1YXJkLCBtZXNzYWdlX29wdCk7LlxuXG5mdW5jdGlvbiBvayh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAoIXZhbHVlKSBmYWlsKHZhbHVlLCB0cnVlLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQub2spO1xufVxuYXNzZXJ0Lm9rID0gb2s7XG5cbi8vIDUuIFRoZSBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc2hhbGxvdywgY29lcmNpdmUgZXF1YWxpdHkgd2l0aFxuLy8gPT0uXG4vLyBhc3NlcnQuZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZXF1YWwgPSBmdW5jdGlvbiBlcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT0gZXhwZWN0ZWQpIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09JywgYXNzZXJ0LmVxdWFsKTtcbn07XG5cbi8vIDYuIFRoZSBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciB3aGV0aGVyIHR3byBvYmplY3RzIGFyZSBub3QgZXF1YWxcbi8vIHdpdGggIT0gYXNzZXJ0Lm5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdEVxdWFsID0gZnVuY3Rpb24gbm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT0nLCBhc3NlcnQubm90RXF1YWwpO1xuICB9XG59O1xuXG4vLyA3LiBUaGUgZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGEgZGVlcCBlcXVhbGl0eSByZWxhdGlvbi5cbi8vIGFzc2VydC5kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcEVxdWFsJywgYXNzZXJ0LmRlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkge1xuICAvLyA3LjEuIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKHV0aWwuaXNCdWZmZXIoYWN0dWFsKSAmJiB1dGlsLmlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIGlmIChhY3R1YWwubGVuZ3RoICE9IGV4cGVjdGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3R1YWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhY3R1YWxbaV0gIT09IGV4cGVjdGVkW2ldKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgLy8gNy4yLiBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBEYXRlIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBEYXRlIG9iamVjdCB0aGF0IHJlZmVycyB0byB0aGUgc2FtZSB0aW1lLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNEYXRlKGFjdHVhbCkgJiYgdXRpbC5pc0RhdGUoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5nZXRUaW1lKCkgPT09IGV4cGVjdGVkLmdldFRpbWUoKTtcblxuICAvLyA3LjMgSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgUmVnRXhwIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBSZWdFeHAgb2JqZWN0IHdpdGggdGhlIHNhbWUgc291cmNlIGFuZFxuICAvLyBwcm9wZXJ0aWVzIChgZ2xvYmFsYCwgYG11bHRpbGluZWAsIGBsYXN0SW5kZXhgLCBgaWdub3JlQ2FzZWApLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNSZWdFeHAoYWN0dWFsKSAmJiB1dGlsLmlzUmVnRXhwKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuc291cmNlID09PSBleHBlY3RlZC5zb3VyY2UgJiZcbiAgICAgICAgICAgYWN0dWFsLmdsb2JhbCA9PT0gZXhwZWN0ZWQuZ2xvYmFsICYmXG4gICAgICAgICAgIGFjdHVhbC5tdWx0aWxpbmUgPT09IGV4cGVjdGVkLm11bHRpbGluZSAmJlxuICAgICAgICAgICBhY3R1YWwubGFzdEluZGV4ID09PSBleHBlY3RlZC5sYXN0SW5kZXggJiZcbiAgICAgICAgICAgYWN0dWFsLmlnbm9yZUNhc2UgPT09IGV4cGVjdGVkLmlnbm9yZUNhc2U7XG5cbiAgLy8gNy40LiBPdGhlciBwYWlycyB0aGF0IGRvIG5vdCBib3RoIHBhc3MgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnLFxuICAvLyBlcXVpdmFsZW5jZSBpcyBkZXRlcm1pbmVkIGJ5ID09LlxuICB9IGVsc2UgaWYgKCF1dGlsLmlzT2JqZWN0KGFjdHVhbCkgJiYgIXV0aWwuaXNPYmplY3QoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbCA9PSBleHBlY3RlZDtcblxuICAvLyA3LjUgRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAvLyBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgLy8gd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAvLyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gIC8vIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gIC8vIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICB9IGVsc2Uge1xuICAgIHJldHVybiBvYmpFcXVpdihhY3R1YWwsIGV4cGVjdGVkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufVxuXG5mdW5jdGlvbiBvYmpFcXVpdihhLCBiKSB7XG4gIGlmICh1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGEpIHx8IHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYikpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvLyBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuXG4gIGlmIChhLnByb3RvdHlwZSAhPT0gYi5wcm90b3R5cGUpIHJldHVybiBmYWxzZTtcbiAgLy8gaWYgb25lIGlzIGEgcHJpbWl0aXZlLCB0aGUgb3RoZXIgbXVzdCBiZSBzYW1lXG4gIGlmICh1dGlsLmlzUHJpbWl0aXZlKGEpIHx8IHV0aWwuaXNQcmltaXRpdmUoYikpIHtcbiAgICByZXR1cm4gYSA9PT0gYjtcbiAgfVxuICB2YXIgYUlzQXJncyA9IGlzQXJndW1lbnRzKGEpLFxuICAgICAgYklzQXJncyA9IGlzQXJndW1lbnRzKGIpO1xuICBpZiAoKGFJc0FyZ3MgJiYgIWJJc0FyZ3MpIHx8ICghYUlzQXJncyAmJiBiSXNBcmdzKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGlmIChhSXNBcmdzKSB7XG4gICAgYSA9IHBTbGljZS5jYWxsKGEpO1xuICAgIGIgPSBwU2xpY2UuY2FsbChiKTtcbiAgICByZXR1cm4gX2RlZXBFcXVhbChhLCBiKTtcbiAgfVxuICB2YXIga2EgPSBvYmplY3RLZXlzKGEpLFxuICAgICAga2IgPSBvYmplY3RLZXlzKGIpLFxuICAgICAga2V5LCBpO1xuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzXG4gIC8vIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9IGtiLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvL35+fmNoZWFwIGtleSB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGthW2ldICE9IGtiW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5IGNvcnJlc3BvbmRpbmcga2V5LCBhbmRcbiAgLy9+fn5wb3NzaWJseSBleHBlbnNpdmUgZGVlcCB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAga2V5ID0ga2FbaV07XG4gICAgaWYgKCFfZGVlcEVxdWFsKGFba2V5XSwgYltrZXldKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyA4LiBUaGUgbm9uLWVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBmb3IgYW55IGRlZXAgaW5lcXVhbGl0eS5cbi8vIGFzc2VydC5ub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RGVlcEVxdWFsID0gZnVuY3Rpb24gbm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwRXF1YWwnLCBhc3NlcnQubm90RGVlcEVxdWFsKTtcbiAgfVxufTtcblxuLy8gOS4gVGhlIHN0cmljdCBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc3RyaWN0IGVxdWFsaXR5LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbi8vIGFzc2VydC5zdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5zdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PT0nLCBhc3NlcnQuc3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG4vLyAxMC4gVGhlIHN0cmljdCBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciBzdHJpY3QgaW5lcXVhbGl0eSwgYXNcbi8vIGRldGVybWluZWQgYnkgIT09LiAgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdFN0cmljdEVxdWFsID0gZnVuY3Rpb24gbm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9PScsIGFzc2VydC5ub3RTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgaWYgKCFhY3R1YWwgfHwgIWV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChleHBlY3RlZCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWQudGVzdChhY3R1YWwpO1xuICB9IGVsc2UgaWYgKGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoZXhwZWN0ZWQuY2FsbCh7fSwgYWN0dWFsKSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgdmFyIGFjdHVhbDtcblxuICBpZiAodXRpbC5pc1N0cmluZyhleHBlY3RlZCkpIHtcbiAgICBtZXNzYWdlID0gZXhwZWN0ZWQ7XG4gICAgZXhwZWN0ZWQgPSBudWxsO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBibG9jaygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYWN0dWFsID0gZTtcbiAgfVxuXG4gIG1lc3NhZ2UgPSAoZXhwZWN0ZWQgJiYgZXhwZWN0ZWQubmFtZSA/ICcgKCcgKyBleHBlY3RlZC5uYW1lICsgJykuJyA6ICcuJykgK1xuICAgICAgICAgICAgKG1lc3NhZ2UgPyAnICcgKyBtZXNzYWdlIDogJy4nKTtcblxuICBpZiAoc2hvdWxkVGhyb3cgJiYgIWFjdHVhbCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ01pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKCFzaG91bGRUaHJvdyAmJiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ0dvdCB1bndhbnRlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoKHNob3VsZFRocm93ICYmIGFjdHVhbCAmJiBleHBlY3RlZCAmJlxuICAgICAgIWV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fCAoIXNob3VsZFRocm93ICYmIGFjdHVhbCkpIHtcbiAgICB0aHJvdyBhY3R1YWw7XG4gIH1cbn1cblxuLy8gMTEuIEV4cGVjdGVkIHRvIHRocm93IGFuIGVycm9yOlxuLy8gYXNzZXJ0LnRocm93cyhibG9jaywgRXJyb3Jfb3B0LCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC50aHJvd3MgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbdHJ1ZV0uY29uY2F0KHBTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbi8vIEVYVEVOU0lPTiEgVGhpcyBpcyBhbm5veWluZyB0byB3cml0ZSBvdXRzaWRlIHRoaXMgbW9kdWxlLlxuYXNzZXJ0LmRvZXNOb3RUaHJvdyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MuYXBwbHkodGhpcywgW2ZhbHNlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuYXNzZXJ0LmlmRXJyb3IgPSBmdW5jdGlvbihlcnIpIHsgaWYgKGVycikge3Rocm93IGVycjt9fTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4ga2V5cztcbn07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwiXG5cbi8qKlxuKiBHZW5lcmF0ZSB1bmlxdWUgQ1NTIHNlbGVjdG9yIGZvciBnaXZlbiBET00gZWxlbWVudFxuKlxuKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4qIEByZXR1cm4ge1N0cmluZ31cbiogQGFwaSBwcml2YXRlXG4qL1xuXG5mdW5jdGlvbiB1bmlxdWUoZWwsIGRvYykge1xuICBpZiAoIWVsIHx8ICFlbC50YWdOYW1lKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRWxlbWVudCBleHBlY3RlZCcpO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldFNlbGVjdG9ySW5kZXgoZWxlbWVudCwgc2VsZWN0b3IpIHtcbiAgICAgIHZhciBleGlzdGluZ0luZGV4ID0gMDtcbiAgICAgIHZhciBpdGVtcyA9ICBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaXRlbXNbaV0gPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgZXhpc3RpbmdJbmRleCA9IGk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBleGlzdGluZ0luZGV4O1xuICB9XG5cbiAgdmFyIGVsU2VsZWN0b3IgPSBnZXRFbGVtZW50U2VsZWN0b3IoZWwpLnNlbGVjdG9yO1xuICB2YXIgaXNTaW1wbGVTZWxlY3RvciA9IGVsU2VsZWN0b3IgPT09IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGFuY2VzdG9yU2VsZWN0b3I7XG5cbiAgdmFyIGN1cnJFbGVtZW50ID0gZWw7XG4gIHdoaWxlIChjdXJyRWxlbWVudC5wYXJlbnRFbGVtZW50ICE9IG51bGwgJiYgIWFuY2VzdG9yU2VsZWN0b3IpIHtcbiAgICAgIGN1cnJFbGVtZW50ID0gY3VyckVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICAgIHZhciBzZWxlY3RvciA9IGdldEVsZW1lbnRTZWxlY3RvcihjdXJyRWxlbWVudCkuc2VsZWN0b3I7XG5cbiAgICAgIC8vIFR5cGljYWxseSBlbGVtZW50cyB0aGF0IGhhdmUgYSBjbGFzcyBuYW1lIG9yIHRpdGxlLCB0aG9zZSBhcmUgbGVzcyBsaWtlbHlcbiAgICAgIC8vIHRvIGNoYW5nZSwgYW5kIGFsc28gYmUgdW5pcXVlLiAgU28sIHdlIGFyZSB0cnlpbmcgdG8gZmluZCBhbiBhbmNlc3RvclxuICAgICAgLy8gdG8gYW5jaG9yIChvciBzY29wZSkgdGhlIHNlYXJjaCBmb3IgdGhlIGVsZW1lbnQsIGFuZCBtYWtlIGl0IGxlc3MgYnJpdHRsZS5cbiAgICAgIGlmIChzZWxlY3RvciAhPT0gY3VyckVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgYW5jZXN0b3JTZWxlY3RvciA9IHNlbGVjdG9yICsgKGN1cnJFbGVtZW50ID09PSBlbC5wYXJlbnRFbGVtZW50ICYmIGlzU2ltcGxlU2VsZWN0b3IgPyBcIiA+IFwiIDogXCIgXCIpICsgZWxTZWxlY3RvcjtcbiAgICAgIH1cbiAgfVxuXG4gIHZhciBmaW5hbFNlbGVjdG9ycyA9IFtdO1xuICBpZiAoYW5jZXN0b3JTZWxlY3Rvcikge1xuICAgIGZpbmFsU2VsZWN0b3JzLnB1c2goXG4gICAgICBhbmNlc3RvclNlbGVjdG9yICsgXCI6ZXEoXCIgKyBfZ2V0U2VsZWN0b3JJbmRleChlbCwgYW5jZXN0b3JTZWxlY3RvcikgKyBcIilcIlxuICAgICk7XG4gIH1cblxuICBmaW5hbFNlbGVjdG9ycy5wdXNoKGVsU2VsZWN0b3IgKyBcIjplcShcIiArIF9nZXRTZWxlY3RvckluZGV4KGVsLCBlbFNlbGVjdG9yKSArIFwiKVwiKTtcbiAgcmV0dXJuIGZpbmFsU2VsZWN0b3JzO1xufTtcblxuLyoqXG4qIEdldCBjbGFzcyBuYW1lcyBmb3IgYW4gZWxlbWVudFxuKlxuKiBAcGFyYXJtIHtFbGVtZW50fSBlbFxuKiBAcmV0dXJuIHtBcnJheX1cbiovXG5cbmZ1bmN0aW9uIGdldENsYXNzTmFtZXMoZWwpIHtcbiAgdmFyIGNsYXNzTmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnY2xhc3MnKTtcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lICYmIGNsYXNzTmFtZS5yZXBsYWNlKCd1dG1lLXZlcmlmeScsICcnKTtcbiAgY2xhc3NOYW1lID0gY2xhc3NOYW1lICYmIGNsYXNzTmFtZS5yZXBsYWNlKCd1dG1lLXJlYWR5JywgJycpO1xuXG4gIGlmICghY2xhc3NOYW1lIHx8ICghY2xhc3NOYW1lLnRyaW0oKS5sZW5ndGgpKSB7IHJldHVybiBbXTsgfVxuXG4gIC8vIHJlbW92ZSBkdXBsaWNhdGUgd2hpdGVzcGFjZVxuICBjbGFzc05hbWUgPSBjbGFzc05hbWUucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xuXG4gIC8vIHRyaW0gbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZVxuICBjbGFzc05hbWUgPSBjbGFzc05hbWUucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xuXG4gIC8vIHNwbGl0IGludG8gc2VwYXJhdGUgY2xhc3NuYW1lc1xuICByZXR1cm4gY2xhc3NOYW1lLnRyaW0oKS5zcGxpdCgnICcpO1xufVxuXG4vKipcbiogQ1NTIHNlbGVjdG9ycyB0byBnZW5lcmF0ZSB1bmlxdWUgc2VsZWN0b3IgZm9yIERPTSBlbGVtZW50XG4qXG4qIEBwYXJhbSB7RWxlbWVudH0gZWxcbiogQHJldHVybiB7QXJyYXl9XG4qIEBhcGkgcHJ2aWF0ZVxuKi9cblxuZnVuY3Rpb24gZ2V0RWxlbWVudFNlbGVjdG9yKGVsLCBpc1VuaXF1ZSkge1xuICB2YXIgcGFydHMgPSBbXTtcbiAgdmFyIGxhYmVsID0gbnVsbDtcbiAgdmFyIHRpdGxlID0gbnVsbDtcbiAgdmFyIGFsdCAgID0gbnVsbDtcbiAgdmFyIG5hbWUgID0gbnVsbDtcbiAgdmFyIHZhbHVlID0gbnVsbDtcbiAgdmFyIG1lID0gZWw7XG5cbiAgLy8gZG8ge1xuXG4gIC8vIElEcyBhcmUgdW5pcXVlIGVub3VnaFxuICBpZiAoZWwuaWQpIHtcbiAgICBsYWJlbCA9ICdbaWQ9XFwnJyArIGVsLmlkICsgXCJcXCddXCI7XG4gIH0gZWxzZSB7XG4gICAgLy8gT3RoZXJ3aXNlLCB1c2UgdGFnIG5hbWVcbiAgICBsYWJlbCAgICAgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgICB2YXIgY2xhc3NOYW1lcyA9IGdldENsYXNzTmFtZXMoZWwpO1xuXG4gICAgLy8gVGFnIG5hbWVzIGNvdWxkIHVzZSBjbGFzc2VzIGZvciBzcGVjaWZpY2l0eVxuICAgIGlmIChjbGFzc05hbWVzLmxlbmd0aCkge1xuICAgICAgbGFiZWwgKz0gJy4nICsgY2xhc3NOYW1lcy5qb2luKCcuJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gVGl0bGVzICYgQWx0IGF0dHJpYnV0ZXMgYXJlIHZlcnkgdXNlZnVsIGZvciBzcGVjaWZpY2l0eSBhbmQgdHJhY2tpbmdcbiAgaWYgKHRpdGxlID0gZWwuZ2V0QXR0cmlidXRlKCd0aXRsZScpKSB7XG4gICAgbGFiZWwgKz0gJ1t0aXRsZT1cIicgKyB0aXRsZSArICdcIl0nO1xuICB9IGVsc2UgaWYgKGFsdCA9IGVsLmdldEF0dHJpYnV0ZSgnYWx0JykpIHtcbiAgICBsYWJlbCArPSAnW2FsdD1cIicgKyBhbHQgKyAnXCJdJztcbiAgfSBlbHNlIGlmIChuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJykpIHtcbiAgICBsYWJlbCArPSAnW25hbWU9XCInICsgbmFtZSArICdcIl0nO1xuICB9XG5cbiAgaWYgKHZhbHVlID0gZWwuZ2V0QXR0cmlidXRlKCd2YWx1ZScpKSB7XG4gICAgbGFiZWwgKz0gJ1t2YWx1ZT1cIicgKyB2YWx1ZSArICdcIl0nO1xuICB9XG5cbiAgLy8gaWYgKGVsLmlubmVyVGV4dC5sZW5ndGggIT0gMCkge1xuICAvLyAgIGxhYmVsICs9ICc6Y29udGFpbnMoJyArIGVsLmlubmVyVGV4dCArICcpJztcbiAgLy8gfVxuXG4gIHBhcnRzLnVuc2hpZnQoe1xuICAgIGVsZW1lbnQ6IGVsLFxuICAgIHNlbGVjdG9yOiBsYWJlbFxuICB9KTtcblxuICAvLyBpZiAoaXNVbmlxdWUocGFydHMpKSB7XG4gIC8vICAgICBicmVhaztcbiAgLy8gfVxuXG4gIC8vIH0gd2hpbGUgKCFlbC5pZCAmJiAoZWwgPSBlbC5wYXJlbnROb2RlKSAmJiBlbC50YWdOYW1lKTtcblxuICAvLyBTb21lIHNlbGVjdG9ycyBzaG91bGQgaGF2ZSBtYXRjaGVkIGF0IGxlYXN0XG4gIGlmICghcGFydHMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gaWRlbnRpZnkgQ1NTIHNlbGVjdG9yJyk7XG4gIH1cbiAgcmV0dXJuIHBhcnRzWzBdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHVuaXF1ZTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pTDJodmJXVXZaR0YyYVdSMGFYUjBjM2R2Y25Sb0wzQnliMnBsWTNSekwzVjBiV1V2YzNKakwycHpMM05sYkdWamRHOXlSbWx1WkdWeUxtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12YzJWc1pXTjBiM0pHYVc1a1pYSXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFN08wRkJSVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVRkZRU3hGUVVGRk96dEJRVVZHTEZOQlFWTXNUVUZCVFN4RFFVRkRMRVZCUVVVc1JVRkJSU3hIUVVGSExFVkJRVVU3UlVGRGRrSXNTVUZCU1N4RFFVRkRMRVZCUVVVc1NVRkJTU3hEUVVGRExFVkJRVVVzUTBGQlF5eFBRVUZQTEVWQlFVVTdTVUZEZEVJc1RVRkJUU3hKUVVGSkxGTkJRVk1zUTBGQlF5eHJRa0ZCYTBJc1EwRkJReXhEUVVGRE8wRkJRelZETEVkQlFVYzdPMFZCUlVRc1UwRkJVeXhwUWtGQmFVSXNRMEZCUXl4UFFVRlBMRVZCUVVVc1VVRkJVU3hGUVVGRk8wMUJRekZETEVsQlFVa3NZVUZCWVN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNMVFpeE5RVUZOTEVsQlFVa3NTMEZCU3l4SlFVRkpMRWRCUVVjc1EwRkJReXhuUWtGQlowSXNRMEZCUXl4UlFVRlJMRU5CUVVNc1EwRkJRenM3VFVGRk5VTXNTMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJReXhGUVVGRkxFVkJRVVU3VlVGRGJrTXNTVUZCU1N4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRExFdEJRVXNzVDBGQlR5eEZRVUZGTzJOQlEzUkNMR0ZCUVdFc1IwRkJSeXhEUVVGRExFTkJRVU03WTBGRGJFSXNUVUZCVFR0WFFVTlVPMDlCUTBvN1RVRkRSQ3hQUVVGUExHRkJRV0VzUTBGQlF6dEJRVU16UWl4SFFVRkhPenRGUVVWRUxFbEJRVWtzVlVGQlZTeEhRVUZITEd0Q1FVRnJRaXhEUVVGRExFVkJRVVVzUTBGQlF5eERRVUZETEZGQlFWRXNRMEZCUXp0RlFVTnFSQ3hKUVVGSkxHZENRVUZuUWl4SFFVRkhMRlZCUVZVc1MwRkJTeXhGUVVGRkxFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NSVUZCUlN4RFFVRkRPMEZCUTJwRkxFVkJRVVVzU1VGQlNTeG5Ra0ZCWjBJc1EwRkJRenM3UlVGRmNrSXNTVUZCU1N4WFFVRlhMRWRCUVVjc1JVRkJSU3hEUVVGRE8wVkJRM0pDTEU5QlFVOHNWMEZCVnl4RFFVRkRMR0ZCUVdFc1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF5eG5Ra0ZCWjBJc1JVRkJSVHROUVVNelJDeFhRVUZYTEVkQlFVY3NWMEZCVnl4RFFVRkRMR0ZCUVdFc1EwRkJRenRCUVVNNVF5eE5RVUZOTEVsQlFVa3NVVUZCVVN4SFFVRkhMR3RDUVVGclFpeERRVUZETEZkQlFWY3NRMEZCUXl4RFFVRkRMRkZCUVZFc1EwRkJRenRCUVVNNVJEdEJRVU5CTzBGQlEwRTdPMDFCUlUwc1NVRkJTU3hSUVVGUkxFdEJRVXNzVjBGQlZ5eERRVUZETEU5QlFVOHNRMEZCUXl4WFFVRlhMRVZCUVVVc1JVRkJSVHRWUVVOb1JDeG5Ra0ZCWjBJc1IwRkJSeXhSUVVGUkxFbEJRVWtzVjBGQlZ5eExRVUZMTEVWQlFVVXNRMEZCUXl4aFFVRmhMRWxCUVVrc1owSkJRV2RDTEVkQlFVY3NTMEZCU3l4SFFVRkhMRWRCUVVjc1EwRkJReXhIUVVGSExGVkJRVlVzUTBGQlF6dFBRVU51U0R0QlFVTlFMRWRCUVVjN08wVkJSVVFzU1VGQlNTeGpRVUZqTEVkQlFVY3NSVUZCUlN4RFFVRkRPMFZCUTNoQ0xFbEJRVWtzWjBKQlFXZENMRVZCUVVVN1NVRkRjRUlzWTBGQll5eERRVUZETEVsQlFVazdUVUZEYWtJc1owSkJRV2RDTEVkQlFVY3NUVUZCVFN4SFFVRkhMR2xDUVVGcFFpeERRVUZETEVWQlFVVXNSVUZCUlN4blFrRkJaMElzUTBGQlF5eEhRVUZITEVkQlFVYzdTMEZETVVVc1EwRkJRenRCUVVOT0xFZEJRVWM3TzBWQlJVUXNZMEZCWXl4RFFVRkRMRWxCUVVrc1EwRkJReXhWUVVGVkxFZEJRVWNzVFVGQlRTeEhRVUZITEdsQ1FVRnBRaXhEUVVGRExFVkJRVVVzUlVGQlJTeFZRVUZWTEVOQlFVTXNSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJRenRGUVVOdVJpeFBRVUZQTEdOQlFXTXNRMEZCUXp0QlFVTjRRaXhEUVVGRExFTkJRVU03TzBGQlJVWTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkJSVUVzUlVGQlJUczdRVUZGUml4VFFVRlRMR0ZCUVdFc1EwRkJReXhGUVVGRkxFVkJRVVU3UlVGRGVrSXNTVUZCU1N4VFFVRlRMRWRCUVVjc1JVRkJSU3hEUVVGRExGbEJRVmtzUTBGQlF5eFBRVUZQTEVOQlFVTXNRMEZCUXp0RlFVTjZReXhUUVVGVExFZEJRVWNzVTBGQlV5eEpRVUZKTEZOQlFWTXNRMEZCUXl4UFFVRlBMRU5CUVVNc1lVRkJZU3hGUVVGRkxFVkJRVVVzUTBGQlF5eERRVUZETzBGQlEyaEZMRVZCUVVVc1UwRkJVeXhIUVVGSExGTkJRVk1zU1VGQlNTeFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmxCUVZrc1JVRkJSU3hGUVVGRkxFTkJRVU1zUTBGQlF6czdRVUZGTDBRc1JVRkJSU3hKUVVGSkxFTkJRVU1zVTBGQlV5eExRVUZMTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1JVRkJSU3hEUVVGRExFMUJRVTBzUTBGQlF5eEZRVUZGTEVWQlFVVXNUMEZCVHl4RlFVRkZMRU5CUVVNc1JVRkJSVHRCUVVNNVJEczdRVUZGUVN4RlFVRkZMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEUxQlFVMHNSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNM1F6czdRVUZGUVN4RlFVRkZMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zVDBGQlR5eERRVUZETEZsQlFWa3NSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenRCUVVOc1JEczdSVUZGUlN4UFFVRlBMRk5CUVZNc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRja01zUTBGQlF6czdRVUZGUkR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEJRVVZCTEVWQlFVVTdPMEZCUlVZc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4RlFVRkZMRVZCUVVVc1VVRkJVU3hGUVVGRk8wVkJRM2hETEVsQlFVa3NTMEZCU3l4SFFVRkhMRVZCUVVVc1EwRkJRenRGUVVObUxFbEJRVWtzUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXp0RlFVTnFRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTTdSVUZEYWtJc1NVRkJTU3hIUVVGSExFdEJRVXNzU1VGQlNTeERRVUZETzBWQlEycENMRWxCUVVrc1NVRkJTU3hKUVVGSkxFbEJRVWtzUTBGQlF6dEZRVU5xUWl4SlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU03UVVGRGJrSXNSVUZCUlN4SlFVRkpMRVZCUVVVc1IwRkJSeXhGUVVGRkxFTkJRVU03UVVGRFpEdEJRVU5CTzBGQlEwRTdPMFZCUlVVc1NVRkJTU3hGUVVGRkxFTkJRVU1zUlVGQlJTeEZRVUZGTzBsQlExUXNTMEZCU3l4SFFVRkhMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU1zUlVGQlJTeEhRVUZITEV0QlFVc3NRMEZCUXp0QlFVTnlReXhIUVVGSExFMUJRVTA3TzBGQlJWUXNTVUZCU1N4TFFVRkxMRTlCUVU4c1JVRkJSU3hEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNRMEZCUXpzN1FVRkZla01zU1VGQlNTeEpRVUZKTEZWQlFWVXNSMEZCUnl4aFFVRmhMRU5CUVVNc1JVRkJSU3hEUVVGRExFTkJRVU03UVVGRGRrTTdPMGxCUlVrc1NVRkJTU3hWUVVGVkxFTkJRVU1zVFVGQlRTeEZRVUZGTzAxQlEzSkNMRXRCUVVzc1NVRkJTU3hIUVVGSExFZEJRVWNzVlVGQlZTeERRVUZETEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRMUVVOeVF6dEJRVU5NTEVkQlFVYzdRVUZEU0RzN1JVRkZSU3hKUVVGSkxFdEJRVXNzUjBGQlJ5eEZRVUZGTEVOQlFVTXNXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhGUVVGRk8wbEJRM0JETEV0QlFVc3NTVUZCU1N4VlFVRlZMRWRCUVVjc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF6dEhRVU53UXl4TlFVRk5MRWxCUVVrc1IwRkJSeXhIUVVGSExFVkJRVVVzUTBGQlF5eFpRVUZaTEVOQlFVTXNTMEZCU3l4RFFVRkRMRVZCUVVVN1NVRkRka01zUzBGQlN5eEpRVUZKTEZGQlFWRXNSMEZCUnl4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRE8wZEJRMmhETEUxQlFVMHNTVUZCU1N4SlFVRkpMRWRCUVVjc1JVRkJSU3hEUVVGRExGbEJRVmtzUTBGQlF5eE5RVUZOTEVOQlFVTXNSVUZCUlR0SlFVTjZReXhMUVVGTExFbEJRVWtzVTBGQlV5eEhRVUZITEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRja01zUjBGQlJ6czdSVUZGUkN4SlFVRkpMRXRCUVVzc1IwRkJSeXhGUVVGRkxFTkJRVU1zV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZPMGxCUTNCRExFdEJRVXNzU1VGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4SFFVRkhMRWxCUVVrc1EwRkJRenRCUVVOMlF5eEhRVUZITzBGQlEwZzdRVUZEUVR0QlFVTkJPMEZCUTBFN08wVkJSVVVzUzBGQlN5eERRVUZETEU5QlFVOHNRMEZCUXp0SlFVTmFMRTlCUVU4c1JVRkJSU3hGUVVGRk8wbEJRMWdzVVVGQlVTeEZRVUZGTEV0QlFVczdRVUZEYmtJc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRFREdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UlVGRlJTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTFCUVUwc1JVRkJSVHRKUVVOcVFpeE5RVUZOTEVsQlFVa3NTMEZCU3l4RFFVRkRMR2xEUVVGcFF5eERRVUZETEVOQlFVTTdSMEZEY0VRN1JVRkRSQ3hQUVVGUExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0QlFVTnNRaXhEUVVGRE96dEJRVVZFTEUxQlFVMHNRMEZCUXl4UFFVRlBMRWRCUVVjc1RVRkJUU3hEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lYRzVjYmk4cUtseHVLaUJIWlc1bGNtRjBaU0IxYm1seGRXVWdRMU5USUhObGJHVmpkRzl5SUdadmNpQm5hWFpsYmlCRVQwMGdaV3hsYldWdWRGeHVLbHh1S2lCQWNHRnlZVzBnZTBWc1pXMWxiblI5SUdWc1hHNHFJRUJ5WlhSMWNtNGdlMU4wY21sdVozMWNiaW9nUUdGd2FTQndjbWwyWVhSbFhHNHFMMXh1WEc1bWRXNWpkR2x2YmlCMWJtbHhkV1VvWld3c0lHUnZZeWtnZTF4dUlDQnBaaUFvSVdWc0lIeDhJQ0ZsYkM1MFlXZE9ZVzFsS1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblJXeGxiV1Z1ZENCbGVIQmxZM1JsWkNjcE8xeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdYMmRsZEZObGJHVmpkRzl5U1c1a1pYZ29aV3hsYldWdWRDd2djMlZzWldOMGIzSXBJSHRjYmlBZ0lDQWdJSFpoY2lCbGVHbHpkR2x1WjBsdVpHVjRJRDBnTUR0Y2JpQWdJQ0FnSUhaaGNpQnBkR1Z0Y3lBOUlDQmtiMk11Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2h6Wld4bFkzUnZjaWs3WEc1Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2FYUmxiWE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2FYUmxiWE5iYVYwZ1BUMDlJR1ZzWlcxbGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdaWGhwYzNScGJtZEpibVJsZUNBOUlHazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lISmxkSFZ5YmlCbGVHbHpkR2x1WjBsdVpHVjRPMXh1SUNCOVhHNWNiaUFnZG1GeUlHVnNVMlZzWldOMGIzSWdQU0JuWlhSRmJHVnRaVzUwVTJWc1pXTjBiM0lvWld3cExuTmxiR1ZqZEc5eU8xeHVJQ0IyWVhJZ2FYTlRhVzF3YkdWVFpXeGxZM1J2Y2lBOUlHVnNVMlZzWldOMGIzSWdQVDA5SUdWc0xuUmhaMDVoYldVdWRHOU1iM2RsY2tOaGMyVW9LVHRjYmlBZ2RtRnlJR0Z1WTJWemRHOXlVMlZzWldOMGIzSTdYRzVjYmlBZ2RtRnlJR04xY25KRmJHVnRaVzUwSUQwZ1pXdzdYRzRnSUhkb2FXeGxJQ2hqZFhKeVJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBJQ0U5SUc1MWJHd2dKaVlnSVdGdVkyVnpkRzl5VTJWc1pXTjBiM0lwSUh0Y2JpQWdJQ0FnSUdOMWNuSkZiR1Z0Wlc1MElEMGdZM1Z5Y2tWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWREdGNiaUFnSUNBZ0lIWmhjaUJ6Wld4bFkzUnZjaUE5SUdkbGRFVnNaVzFsYm5SVFpXeGxZM1J2Y2loamRYSnlSV3hsYldWdWRDa3VjMlZzWldOMGIzSTdYRzVjYmlBZ0lDQWdJQzh2SUZSNWNHbGpZV3hzZVNCbGJHVnRaVzUwY3lCMGFHRjBJR2hoZG1VZ1lTQmpiR0Z6Y3lCdVlXMWxJRzl5SUhScGRHeGxMQ0IwYUc5elpTQmhjbVVnYkdWemN5QnNhV3RsYkhsY2JpQWdJQ0FnSUM4dklIUnZJR05vWVc1blpTd2dZVzVrSUdGc2MyOGdZbVVnZFc1cGNYVmxMaUFnVTI4c0lIZGxJR0Z5WlNCMGNubHBibWNnZEc4Z1ptbHVaQ0JoYmlCaGJtTmxjM1J2Y2x4dUlDQWdJQ0FnTHk4Z2RHOGdZVzVqYUc5eUlDaHZjaUJ6WTI5d1pTa2dkR2hsSUhObFlYSmphQ0JtYjNJZ2RHaGxJR1ZzWlcxbGJuUXNJR0Z1WkNCdFlXdGxJR2wwSUd4bGMzTWdZbkpwZEhSc1pTNWNiaUFnSUNBZ0lHbG1JQ2h6Wld4bFkzUnZjaUFoUFQwZ1kzVnlja1ZzWlcxbGJuUXVkR0ZuVG1GdFpTNTBiMHh2ZDJWeVEyRnpaU2dwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdZVzVqWlhOMGIzSlRaV3hsWTNSdmNpQTlJSE5sYkdWamRHOXlJQ3NnS0dOMWNuSkZiR1Z0Wlc1MElEMDlQU0JsYkM1d1lYSmxiblJGYkdWdFpXNTBJQ1ltSUdselUybHRjR3hsVTJWc1pXTjBiM0lnUHlCY0lpQStJRndpSURvZ1hDSWdYQ0lwSUNzZ1pXeFRaV3hsWTNSdmNqdGNiaUFnSUNBZ0lIMWNiaUFnZlZ4dVhHNGdJSFpoY2lCbWFXNWhiRk5sYkdWamRHOXljeUE5SUZ0ZE8xeHVJQ0JwWmlBb1lXNWpaWE4wYjNKVFpXeGxZM1J2Y2lrZ2UxeHVJQ0FnSUdacGJtRnNVMlZzWldOMGIzSnpMbkIxYzJnb1hHNGdJQ0FnSUNCaGJtTmxjM1J2Y2xObGJHVmpkRzl5SUNzZ1hDSTZaWEVvWENJZ0t5QmZaMlYwVTJWc1pXTjBiM0pKYm1SbGVDaGxiQ3dnWVc1alpYTjBiM0pUWld4bFkzUnZjaWtnS3lCY0lpbGNJbHh1SUNBZ0lDazdYRzRnSUgxY2JseHVJQ0JtYVc1aGJGTmxiR1ZqZEc5eWN5NXdkWE5vS0dWc1UyVnNaV04wYjNJZ0t5QmNJanBsY1NoY0lpQXJJRjluWlhSVFpXeGxZM1J2Y2tsdVpHVjRLR1ZzTENCbGJGTmxiR1ZqZEc5eUtTQXJJRndpS1Z3aUtUdGNiaUFnY21WMGRYSnVJR1pwYm1Gc1UyVnNaV04wYjNKek8xeHVmVHRjYmx4dUx5b3FYRzRxSUVkbGRDQmpiR0Z6Y3lCdVlXMWxjeUJtYjNJZ1lXNGdaV3hsYldWdWRGeHVLbHh1S2lCQWNHRnlZWEp0SUh0RmJHVnRaVzUwZlNCbGJGeHVLaUJBY21WMGRYSnVJSHRCY25KaGVYMWNiaW92WEc1Y2JtWjFibU4wYVc5dUlHZGxkRU5zWVhOelRtRnRaWE1vWld3cElIdGNiaUFnZG1GeUlHTnNZWE56VG1GdFpTQTlJR1ZzTG1kbGRFRjBkSEpwWW5WMFpTZ25ZMnhoYzNNbktUdGNiaUFnWTJ4aGMzTk9ZVzFsSUQwZ1kyeGhjM05PWVcxbElDWW1JR05zWVhOelRtRnRaUzV5WlhCc1lXTmxLQ2QxZEcxbExYWmxjbWxtZVNjc0lDY25LVHRjYmlBZ1kyeGhjM05PWVcxbElEMGdZMnhoYzNOT1lXMWxJQ1ltSUdOc1lYTnpUbUZ0WlM1eVpYQnNZV05sS0NkMWRHMWxMWEpsWVdSNUp5d2dKeWNwTzF4dVhHNGdJR2xtSUNnaFkyeGhjM05PWVcxbElIeDhJQ2doWTJ4aGMzTk9ZVzFsTG5SeWFXMG9LUzVzWlc1bmRHZ3BLU0I3SUhKbGRIVnliaUJiWFRzZ2ZWeHVYRzRnSUM4dklISmxiVzkyWlNCa2RYQnNhV05oZEdVZ2QyaHBkR1Z6Y0dGalpWeHVJQ0JqYkdGemMwNWhiV1VnUFNCamJHRnpjMDVoYldVdWNtVndiR0ZqWlNndlhGeHpLeTluTENBbklDY3BPMXh1WEc0Z0lDOHZJSFJ5YVcwZ2JHVmhaR2x1WnlCaGJtUWdkSEpoYVd4cGJtY2dkMmhwZEdWemNHRmpaVnh1SUNCamJHRnpjMDVoYldVZ1BTQmpiR0Z6YzA1aGJXVXVjbVZ3YkdGalpTZ3ZYbHhjY3l0OFhGeHpLeVF2Wnl3Z0p5Y3BPMXh1WEc0Z0lDOHZJSE53YkdsMElHbHVkRzhnYzJWd1lYSmhkR1VnWTJ4aGMzTnVZVzFsYzF4dUlDQnlaWFIxY200Z1kyeGhjM05PWVcxbExuUnlhVzBvS1M1emNHeHBkQ2duSUNjcE8xeHVmVnh1WEc0dktpcGNiaW9nUTFOVElITmxiR1ZqZEc5eWN5QjBieUJuWlc1bGNtRjBaU0IxYm1seGRXVWdjMlZzWldOMGIzSWdabTl5SUVSUFRTQmxiR1Z0Wlc1MFhHNHFYRzRxSUVCd1lYSmhiU0I3Uld4bGJXVnVkSDBnWld4Y2Jpb2dRSEpsZEhWeWJpQjdRWEp5WVhsOVhHNHFJRUJoY0drZ2NISjJhV0YwWlZ4dUtpOWNibHh1Wm5WdVkzUnBiMjRnWjJWMFJXeGxiV1Z1ZEZObGJHVmpkRzl5S0dWc0xDQnBjMVZ1YVhGMVpTa2dlMXh1SUNCMllYSWdjR0Z5ZEhNZ1BTQmJYVHRjYmlBZ2RtRnlJR3hoWW1Wc0lEMGdiblZzYkR0Y2JpQWdkbUZ5SUhScGRHeGxJRDBnYm5Wc2JEdGNiaUFnZG1GeUlHRnNkQ0FnSUQwZ2JuVnNiRHRjYmlBZ2RtRnlJRzVoYldVZ0lEMGdiblZzYkR0Y2JpQWdkbUZ5SUhaaGJIVmxJRDBnYm5Wc2JEdGNiaUFnZG1GeUlHMWxJRDBnWld3N1hHNWNiaUFnTHk4Z1pHOGdlMXh1WEc0Z0lDOHZJRWxFY3lCaGNtVWdkVzVwY1hWbElHVnViM1ZuYUZ4dUlDQnBaaUFvWld3dWFXUXBJSHRjYmlBZ0lDQnNZV0psYkNBOUlDZGJhV1E5WEZ3bkp5QXJJR1ZzTG1sa0lDc2dYQ0pjWENkZFhDSTdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdMeThnVDNSb1pYSjNhWE5sTENCMWMyVWdkR0ZuSUc1aGJXVmNiaUFnSUNCc1lXSmxiQ0FnSUNBZ1BTQmxiQzUwWVdkT1lXMWxMblJ2VEc5M1pYSkRZWE5sS0NrN1hHNWNiaUFnSUNCMllYSWdZMnhoYzNOT1lXMWxjeUE5SUdkbGRFTnNZWE56VG1GdFpYTW9aV3dwTzF4dVhHNGdJQ0FnTHk4Z1ZHRm5JRzVoYldWeklHTnZkV3hrSUhWelpTQmpiR0Z6YzJWeklHWnZjaUJ6Y0dWamFXWnBZMmwwZVZ4dUlDQWdJR2xtSUNoamJHRnpjMDVoYldWekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ2JHRmlaV3dnS3owZ0p5NG5JQ3NnWTJ4aGMzTk9ZVzFsY3k1cWIybHVLQ2N1SnlrN1hHNGdJQ0FnZlZ4dUlDQjlYRzVjYmlBZ0x5OGdWR2wwYkdWeklDWWdRV3gwSUdGMGRISnBZblYwWlhNZ1lYSmxJSFpsY25rZ2RYTmxablZzSUdadmNpQnpjR1ZqYVdacFkybDBlU0JoYm1RZ2RISmhZMnRwYm1kY2JpQWdhV1lnS0hScGRHeGxJRDBnWld3dVoyVjBRWFIwY21saWRYUmxLQ2QwYVhSc1pTY3BLU0I3WEc0Z0lDQWdiR0ZpWld3Z0t6MGdKMXQwYVhSc1pUMWNJaWNnS3lCMGFYUnNaU0FySUNkY0lsMG5PMXh1SUNCOUlHVnNjMlVnYVdZZ0tHRnNkQ0E5SUdWc0xtZGxkRUYwZEhKcFluVjBaU2duWVd4MEp5a3BJSHRjYmlBZ0lDQnNZV0psYkNBclBTQW5XMkZzZEQxY0lpY2dLeUJoYkhRZ0t5QW5YQ0pkSnp0Y2JpQWdmU0JsYkhObElHbG1JQ2h1WVcxbElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZHVZVzFsSnlrcElIdGNiaUFnSUNCc1lXSmxiQ0FyUFNBblcyNWhiV1U5WENJbklDc2dibUZ0WlNBcklDZGNJbDBuTzF4dUlDQjlYRzVjYmlBZ2FXWWdLSFpoYkhWbElEMGdaV3d1WjJWMFFYUjBjbWxpZFhSbEtDZDJZV3gxWlNjcEtTQjdYRzRnSUNBZ2JHRmlaV3dnS3owZ0oxdDJZV3gxWlQxY0lpY2dLeUIyWVd4MVpTQXJJQ2RjSWwwbk8xeHVJQ0I5WEc1Y2JpQWdMeThnYVdZZ0tHVnNMbWx1Ym1WeVZHVjRkQzVzWlc1bmRHZ2dJVDBnTUNrZ2UxeHVJQ0F2THlBZ0lHeGhZbVZzSUNzOUlDYzZZMjl1ZEdGcGJuTW9KeUFySUdWc0xtbHVibVZ5VkdWNGRDQXJJQ2NwSnp0Y2JpQWdMeThnZlZ4dVhHNGdJSEJoY25SekxuVnVjMmhwWm5Rb2UxeHVJQ0FnSUdWc1pXMWxiblE2SUdWc0xGeHVJQ0FnSUhObGJHVmpkRzl5T2lCc1lXSmxiRnh1SUNCOUtUdGNibHh1SUNBdkx5QnBaaUFvYVhOVmJtbHhkV1VvY0dGeWRITXBLU0I3WEc0Z0lDOHZJQ0FnSUNCaWNtVmhhenRjYmlBZ0x5OGdmVnh1WEc0Z0lDOHZJSDBnZDJocGJHVWdLQ0ZsYkM1cFpDQW1KaUFvWld3Z1BTQmxiQzV3WVhKbGJuUk9iMlJsS1NBbUppQmxiQzUwWVdkT1lXMWxLVHRjYmx4dUlDQXZMeUJUYjIxbElITmxiR1ZqZEc5eWN5QnphRzkxYkdRZ2FHRjJaU0J0WVhSamFHVmtJR0YwSUd4bFlYTjBYRzRnSUdsbUlDZ2hjR0Z5ZEhNdWJHVnVaM1JvS1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RHWVdsc1pXUWdkRzhnYVdSbGJuUnBabmtnUTFOVElITmxiR1ZqZEc5eUp5azdYRzRnSUgxY2JpQWdjbVYwZFhKdUlIQmhjblJ6V3pCZE8xeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUhWdWFYRjFaVHRjYmlKZGZRPT0iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBsb2NhbF9zdG9yYWdlX2tleSA9ICd1dG1lLXNldHRpbmdzJztcblxuZnVuY3Rpb24gU2V0dGluZ3MgKGRlZmF1bHRTZXR0aW5ncykge1xuICAgIHRoaXMuc2V0RGVmYXVsdHMoZGVmYXVsdFNldHRpbmdzIHx8IHt9KTtcbn1cblxuU2V0dGluZ3MucHJvdG90eXBlID0ge1xuICAgIHJlYWRTZXR0aW5nc0Zyb21Mb2NhbFN0b3JhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNldHRpbmdzU3RyaW5nID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obG9jYWxfc3RvcmFnZV9rZXkpO1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7fTtcbiAgICAgICAgaWYgKHNldHRpbmdzU3RyaW5nKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IEpTT04ucGFyc2Uoc2V0dGluZ3NTdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuXG4gICAgc2V0RGVmYXVsdHM6IGZ1bmN0aW9uIChkZWZhdWx0U2V0dGluZ3MpIHtcbiAgICAgICAgdmFyIGxvY2FsU2V0dGluZ3MgPSB0aGlzLnJlYWRTZXR0aW5nc0Zyb21Mb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgdmFyIGRlZmF1bHRzQ29weSA9IF8uZXh0ZW5kKHt9LCBkZWZhdWx0U2V0dGluZ3MgfHwge30pO1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gXy5leHRlbmQoe30sIF8uZXh0ZW5kKGRlZmF1bHRzQ29weSwgbG9jYWxTZXR0aW5ncykpO1xuICAgICAgICB0aGlzLmRlZmF1bHRTZXR0aW5ncyA9IGRlZmF1bHRTZXR0aW5ncztcbiAgICB9LFxuXG4gICAgc2V0OiBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfSxcblxuICAgIGdldDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5nc1trZXldO1xuICAgIH0sXG5cbiAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGxvY2FsX3N0b3JhZ2Vfa2V5LCBKU09OLnN0cmluZ2lmeSh0aGlzLnNldHRpbmdzKSk7XG4gICAgfSxcbiAgICBcbiAgICByZXNldERlZmF1bHRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHRoaXMuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICBpZiAoZGVmYXVsdHMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MgPSBfLmV4dGVuZCh7fSwgZGVmYXVsdHMpO1xuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzTmxkSFJwYm1kekxtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12YzJWMGRHbHVaM011YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRXNTVUZCU1N4RFFVRkRMRWRCUVVjc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETzBGQlF6TkNMRWxCUVVrc2FVSkJRV2xDTEVkQlFVY3NaVUZCWlN4RFFVRkRPenRCUVVWNFF5eFRRVUZUTEZGQlFWRXNSVUZCUlN4bFFVRmxMRVZCUVVVN1NVRkRhRU1zU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4bFFVRmxMRWxCUVVrc1JVRkJSU3hEUVVGRExFTkJRVU03UVVGRE5VTXNRMEZCUXpzN1FVRkZSQ3hSUVVGUkxFTkJRVU1zVTBGQlV5eEhRVUZITzBsQlEycENMRFJDUVVFMFFpeEZRVUZGTEZsQlFWazdVVUZEZEVNc1NVRkJTU3hqUVVGakxFZEJRVWNzV1VGQldTeERRVUZETEU5QlFVOHNRMEZCUXl4cFFrRkJhVUlzUTBGQlF5eERRVUZETzFGQlF6ZEVMRWxCUVVrc1VVRkJVU3hIUVVGSExFVkJRVVVzUTBGQlF6dFJRVU5zUWl4SlFVRkpMR05CUVdNc1JVRkJSVHRaUVVOb1FpeFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhqUVVGakxFTkJRVU1zUTBGQlF6dFRRVU42UXp0UlFVTkVMRTlCUVU4c1VVRkJVU3hEUVVGRE8wRkJRM2hDTEV0QlFVczdPMGxCUlVRc1YwRkJWeXhGUVVGRkxGVkJRVlVzWlVGQlpTeEZRVUZGTzFGQlEzQkRMRWxCUVVrc1lVRkJZU3hIUVVGSExFbEJRVWtzUTBGQlF5dzBRa0ZCTkVJc1JVRkJSU3hEUVVGRE8xRkJRM2hFTEVsQlFVa3NXVUZCV1N4SFFVRkhMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJTeEZRVUZGTEdWQlFXVXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJRenRSUVVOMlJDeEpRVUZKTEVOQlFVTXNVVUZCVVN4SFFVRkhMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJTeEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1dVRkJXU3hGUVVGRkxHRkJRV0VzUTBGQlF5eERRVUZETEVOQlFVTTdVVUZEY0VVc1NVRkJTU3hEUVVGRExHVkJRV1VzUjBGQlJ5eGxRVUZsTEVOQlFVTTdRVUZETDBNc1MwRkJTenM3U1VGRlJDeEhRVUZITEVWQlFVVXNWVUZCVlN4SFFVRkhMRVZCUVVVc1MwRkJTeXhGUVVGRk8xRkJRM1pDTEVsQlFVa3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzUzBGQlN5eERRVUZETzFGQlF6TkNMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF6dEJRVU53UWl4TFFVRkxPenRKUVVWRUxFZEJRVWNzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlR0UlFVTm9RaXhQUVVGUExFbEJRVWtzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN1FVRkRiRU1zUzBGQlN6czdTVUZGUkN4SlFVRkpMRVZCUVVVc1dVRkJXVHRSUVVOa0xGbEJRVmtzUTBGQlF5eFBRVUZQTEVOQlFVTXNhVUpCUVdsQ0xFVkJRVVVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU1zUTBGQlF6dEJRVU12UlN4TFFVRkxPenRKUVVWRUxHRkJRV0VzUlVGQlJTeFpRVUZaTzFGQlEzWkNMRWxCUVVrc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eGxRVUZsTEVOQlFVTTdVVUZEY0VNc1NVRkJTU3hSUVVGUkxFVkJRVVU3V1VGRFZpeEpRVUZKTEVOQlFVTXNVVUZCVVN4SFFVRkhMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUlVGQlJTeEZRVUZGTEZGQlFWRXNRMEZCUXl4RFFVRkRPMWxCUTNaRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNRMEZCUXp0VFFVTm1PMHRCUTBvN1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSeXhSUVVGUkxFTkJRVU1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lKMllYSWdYeUE5SUhKbGNYVnBjbVVvSnk0dmRYUnBiSE1uS1R0Y2JuWmhjaUJzYjJOaGJGOXpkRzl5WVdkbFgydGxlU0E5SUNkMWRHMWxMWE5sZEhScGJtZHpKenRjYmx4dVpuVnVZM1JwYjI0Z1UyVjBkR2x1WjNNZ0tHUmxabUYxYkhSVFpYUjBhVzVuY3lrZ2UxeHVJQ0FnSUhSb2FYTXVjMlYwUkdWbVlYVnNkSE1vWkdWbVlYVnNkRk5sZEhScGJtZHpJSHg4SUh0OUtUdGNibjFjYmx4dVUyVjBkR2x1WjNNdWNISnZkRzkwZVhCbElEMGdlMXh1SUNBZ0lISmxZV1JUWlhSMGFXNW5jMFp5YjIxTWIyTmhiRk4wYjNKaFoyVTZJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSE5sZEhScGJtZHpVM1J5YVc1bklEMGdiRzlqWVd4VGRHOXlZV2RsTG1kbGRFbDBaVzBvYkc5allXeGZjM1J2Y21GblpWOXJaWGtwTzF4dUlDQWdJQ0FnSUNCMllYSWdjMlYwZEdsdVozTWdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5sZEhScGJtZHpVM1J5YVc1bktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCelpYUjBhVzVuY3lBOUlFcFRUMDR1Y0dGeWMyVW9jMlYwZEdsdVozTlRkSEpwYm1jcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpaWFIwYVc1bmN6dGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2MyVjBSR1ZtWVhWc2RITTZJR1oxYm1OMGFXOXVJQ2hrWldaaGRXeDBVMlYwZEdsdVozTXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHeHZZMkZzVTJWMGRHbHVaM01nUFNCMGFHbHpMbkpsWVdSVFpYUjBhVzVuYzBaeWIyMU1iMk5oYkZOMGIzSmhaMlVvS1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1JsWm1GMWJIUnpRMjl3ZVNBOUlGOHVaWGgwWlc1a0tIdDlMQ0JrWldaaGRXeDBVMlYwZEdsdVozTWdmSHdnZTMwcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRIUnBibWR6SUQwZ1h5NWxlSFJsYm1Rb2UzMHNJRjh1WlhoMFpXNWtLR1JsWm1GMWJIUnpRMjl3ZVN3Z2JHOWpZV3hUWlhSMGFXNW5jeWtwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbVJsWm1GMWJIUlRaWFIwYVc1bmN5QTlJR1JsWm1GMWJIUlRaWFIwYVc1bmN6dGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2MyVjBPaUJtZFc1amRHbHZiaUFvYTJWNUxDQjJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRIUnBibWR6VzJ0bGVWMGdQU0IyWVd4MVpUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ellYWmxLQ2s3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJR2RsZERvZ1puVnVZM1JwYjI0Z0tHdGxlU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NXpaWFIwYVc1bmMxdHJaWGxkTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J6WVhabE9pQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0FnSUd4dlkyRnNVM1J2Y21GblpTNXpaWFJKZEdWdEtHeHZZMkZzWDNOMGIzSmhaMlZmYTJWNUxDQktVMDlPTG5OMGNtbHVaMmxtZVNoMGFHbHpMbk5sZEhScGJtZHpLU2s3WEc0Z0lDQWdmU3hjYmlBZ0lDQmNiaUFnSUNCeVpYTmxkRVJsWm1GMWJIUnpPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJrWldaaGRXeDBjeUE5SUhSb2FYTXVaR1ZtWVhWc2RGTmxkSFJwYm1kek8xeHVJQ0FnSUNBZ0lDQnBaaUFvWkdWbVlYVnNkSE1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdWMyVjBkR2x1WjNNZ1BTQmZMbVY0ZEdWdVpDaDdmU3dnWkdWbVlYVnNkSE1wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1ellYWmxLQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1OU8xeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJRk5sZEhScGJtZHpPMXh1SWwxOSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgU2ltdWxhdGUgPSB7XG4gICAgZXZlbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGV2ZW50TmFtZSwgb3B0aW9ucyl7XG4gICAgICAgIHZhciBldnQ7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCkge1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJIVE1MRXZlbnRzXCIpO1xuICAgICAgICAgICAgZXZ0LmluaXRFdmVudChldmVudE5hbWUsIGV2ZW50TmFtZSAhPSAnbW91c2VlbnRlcicgJiYgZXZlbnROYW1lICE9ICdtb3VzZWxlYXZlJywgdHJ1ZSApO1xuICAgICAgICAgICAgXy5leHRlbmQoZXZ0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gICAgICAgICAgICBlbGVtZW50LmZpcmVFdmVudCgnb24nICsgZXZlbnROYW1lLGV2dCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGtleUV2ZW50OiBmdW5jdGlvbihlbGVtZW50LCB0eXBlLCBvcHRpb25zKXtcbiAgICAgICAgdmFyIGV2dCxcbiAgICAgICAgICAgIGUgPSB7XG4gICAgICAgICAgICAgICAgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSwgdmlldzogd2luZG93LFxuICAgICAgICAgICAgICAgIGN0cmxLZXk6IGZhbHNlLCBhbHRLZXk6IGZhbHNlLCBzaGlmdEtleTogZmFsc2UsIG1ldGFLZXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGtleUNvZGU6IDAsIGNoYXJDb2RlOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICBfLmV4dGVuZChlLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50KXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnS2V5RXZlbnRzJyk7XG4gICAgICAgICAgICAgICAgZXZ0LmluaXRLZXlFdmVudChcbiAgICAgICAgICAgICAgICAgICAgdHlwZSwgZS5idWJibGVzLCBlLmNhbmNlbGFibGUsIGUudmlldyxcbiAgICAgICAgICAgIGUuY3RybEtleSwgZS5hbHRLZXksIGUuc2hpZnRLZXksIGUubWV0YUtleSxcbiAgICAgICAgICAgIGUua2V5Q29kZSwgZS5jaGFyQ29kZSk7XG4gICAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgIH1jYXRjaChlcnIpe1xuICAgICAgICAgICAgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudHNcIik7XG4gICAgICAgIGV2dC5pbml0RXZlbnQodHlwZSwgZS5idWJibGVzLCBlLmNhbmNlbGFibGUpO1xuICAgICAgICBfLmV4dGVuZChldnQsIHtcbiAgICAgICAgICAgIHZpZXc6IGUudmlldyxcbiAgICAgICAgICBjdHJsS2V5OiBlLmN0cmxLZXksIGFsdEtleTogZS5hbHRLZXksXG4gICAgICAgICAgc2hpZnRLZXk6IGUuc2hpZnRLZXksIG1ldGFLZXk6IGUubWV0YUtleSxcbiAgICAgICAgICBrZXlDb2RlOiBlLmtleUNvZGUsIGNoYXJDb2RlOiBlLmNoYXJDb2RlXG4gICAgICAgIH0pO1xuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuU2ltdWxhdGUua2V5cHJlc3MgPSBmdW5jdGlvbihlbGVtZW50LCBjaHIpe1xuICAgIHZhciBjaGFyQ29kZSA9IGNoci5jaGFyQ29kZUF0KDApO1xuICAgIHRoaXMua2V5RXZlbnQoZWxlbWVudCwgJ2tleXByZXNzJywge1xuICAgICAgICBrZXlDb2RlOiBjaGFyQ29kZSxcbiAgICAgICAgY2hhckNvZGU6IGNoYXJDb2RlXG4gICAgfSk7XG59O1xuXG5TaW11bGF0ZS5rZXlkb3duID0gZnVuY3Rpb24oZWxlbWVudCwgY2hyKXtcbiAgICB2YXIgY2hhckNvZGUgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB0aGlzLmtleUV2ZW50KGVsZW1lbnQsICdrZXlkb3duJywge1xuICAgICAgICBrZXlDb2RlOiBjaGFyQ29kZSxcbiAgICAgICAgY2hhckNvZGU6IGNoYXJDb2RlXG4gICAgfSk7XG59O1xuXG5TaW11bGF0ZS5rZXl1cCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNocil7XG4gICAgdmFyIGNoYXJDb2RlID0gY2hyLmNoYXJDb2RlQXQoMCk7XG4gICAgdGhpcy5rZXlFdmVudChlbGVtZW50LCAna2V5dXAnLCB7XG4gICAgICAgIGtleUNvZGU6IGNoYXJDb2RlLFxuICAgICAgICBjaGFyQ29kZTogY2hhckNvZGVcbiAgICB9KTtcbn07XG5cbnZhciBldmVudHMgPSBbXG4gICAgJ2NsaWNrJyxcbiAgICAnZm9jdXMnLFxuICAgICdibHVyJyxcbiAgICAnZGJsY2xpY2snLFxuICAgICdpbnB1dCcsXG4gICAgJ2NoYW5nZScsXG4gICAgJ21vdXNlZG93bicsXG4gICAgJ21vdXNlbW92ZScsXG4gICAgJ21vdXNlb3V0JyxcbiAgICAnbW91c2VvdmVyJyxcbiAgICAnbW91c2V1cCcsXG4gICAgJ21vdXNlZW50ZXInLFxuICAgICdtb3VzZWxlYXZlJyxcbiAgICAncmVzaXplJyxcbiAgICAnc2Nyb2xsJyxcbiAgICAnc2VsZWN0JyxcbiAgICAnc3VibWl0JyxcbiAgICAnbG9hZCcsXG4gICAgJ3VubG9hZCdcbl07XG5cbmZvciAodmFyIGkgPSBldmVudHMubGVuZ3RoOyBpLS07KXtcbiAgICB2YXIgZXZlbnQgPSBldmVudHNbaV07XG4gICAgU2ltdWxhdGVbZXZlbnRdID0gKGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKXtcbiAgICAgICAgICAgIHRoaXMuZXZlbnQoZWxlbWVudCwgZXZ0LCBvcHRpb25zKTtcbiAgICAgICAgfTtcbiAgICB9KGV2ZW50KSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2ltdWxhdGU7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzTnBiWFZzWVhSbExtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlrWVhacFpIUnBkSFJ6ZDI5eWRHZ3ZjSEp2YW1WamRITXZkWFJ0WlM5emNtTXZhbk12YzJsdGRXeGhkR1V1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRXNTVUZCU1N4RFFVRkRMRWRCUVVjc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZET3p0QlFVVXpRaXhKUVVGSkxGRkJRVkVzUjBGQlJ6dEpRVU5ZTEV0QlFVc3NSVUZCUlN4VFFVRlRMRTlCUVU4c1JVRkJSU3hUUVVGVExFVkJRVVVzVDBGQlR5eERRVUZETzFGQlEzaERMRWxCUVVrc1IwRkJSeXhEUVVGRE8xRkJRMUlzU1VGQlNTeFJRVUZSTEVOQlFVTXNWMEZCVnl4RlFVRkZPMWxCUTNSQ0xFZEJRVWNzUjBGQlJ5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8xbEJRM3BETEVkQlFVY3NRMEZCUXl4VFFVRlRMRU5CUVVNc1UwRkJVeXhGUVVGRkxGTkJRVk1zU1VGQlNTeFpRVUZaTEVsQlFVa3NVMEZCVXl4SlFVRkpMRmxCUVZrc1JVRkJSU3hKUVVGSkxFVkJRVVVzUTBGQlF6dFpRVU40Uml4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0WlFVTjJRaXhQUVVGUExFTkJRVU1zWVVGQllTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUXpsQ0xFbEJRVWs3V1VGRFJDeEhRVUZITEVkQlFVY3NVVUZCVVN4RFFVRkRMR2xDUVVGcFFpeEZRVUZGTEVOQlFVTTdXVUZEYmtNc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eEpRVUZKTEVkQlFVY3NVMEZCVXl4RFFVRkRMRWRCUVVjc1EwRkJReXhEUVVGRE8xTkJRek5ETzB0QlEwbzdTVUZEUkN4UlFVRlJMRVZCUVVVc1UwRkJVeXhQUVVGUExFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNRMEZCUXp0UlFVTjBReXhKUVVGSkxFZEJRVWM3V1VGRFNDeERRVUZETEVkQlFVYzdaMEpCUTBFc1QwRkJUeXhGUVVGRkxFbEJRVWtzUlVGQlJTeFZRVUZWTEVWQlFVVXNTVUZCU1N4RlFVRkZMRWxCUVVrc1JVRkJSU3hOUVVGTk8yZENRVU0zUXl4UFFVRlBMRVZCUVVVc1MwRkJTeXhGUVVGRkxFMUJRVTBzUlVGQlJTeExRVUZMTEVWQlFVVXNVVUZCVVN4RlFVRkZMRXRCUVVzc1JVRkJSU3hQUVVGUExFVkJRVVVzUzBGQlN6dG5Ra0ZET1VRc1QwRkJUeXhGUVVGRkxFTkJRVU1zUlVGQlJTeFJRVUZSTEVWQlFVVXNRMEZCUXp0aFFVTXhRaXhEUVVGRE8xRkJRMDRzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03VVVGRGNrSXNTVUZCU1N4UlFVRlJMRU5CUVVNc1YwRkJWeXhEUVVGRE8xbEJRM0pDTEVkQlFVYzdaMEpCUTBNc1IwRkJSeXhIUVVGSExGRkJRVkVzUTBGQlF5eFhRVUZYTEVOQlFVTXNWMEZCVnl4RFFVRkRMRU5CUVVNN1owSkJRM2hETEVkQlFVY3NRMEZCUXl4WlFVRlpPMjlDUVVOYUxFbEJRVWtzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhWUVVGVkxFVkJRVVVzUTBGQlF5eERRVUZETEVsQlFVazdXVUZETjBNc1EwRkJReXhEUVVGRExFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1EwRkJReXhSUVVGUkxFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVODdXVUZETVVNc1EwRkJReXhEUVVGRExFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNN1ZVRkRla0lzVDBGQlR5eERRVUZETEdGQlFXRXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRUUVVNMVFpeE5RVUZOTEVkQlFVY3NRMEZCUXp0WlFVTlFMRWRCUVVjc1IwRkJSeXhSUVVGUkxFTkJRVU1zVjBGQlZ5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPMUZCUTNwRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFVkJRVVVzUTBGQlF5eERRVUZETEZWQlFWVXNRMEZCUXl4RFFVRkRPMUZCUXpkRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNSMEZCUnl4RlFVRkZPMWxCUTFZc1NVRkJTU3hGUVVGRkxFTkJRVU1zUTBGQlF5eEpRVUZKTzFWQlEyUXNUMEZCVHl4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5PMVZCUTNCRExGRkJRVkVzUlVGQlJTeERRVUZETEVOQlFVTXNVVUZCVVN4RlFVRkZMRTlCUVU4c1JVRkJSU3hEUVVGRExFTkJRVU1zVDBGQlR6dFZRVU40UXl4UFFVRlBMRVZCUVVVc1EwRkJReXhEUVVGRExFOUJRVThzUlVGQlJTeFJRVUZSTEVWQlFVVXNRMEZCUXl4RFFVRkRMRkZCUVZFN1UwRkRla01zUTBGQlF5eERRVUZETzFGQlEwZ3NUMEZCVHl4RFFVRkRMR0ZCUVdFc1EwRkJReXhIUVVGSExFTkJRVU1zUTBGQlF6dFRRVU14UWp0VFFVTkJPMHRCUTBvN1FVRkRUQ3hEUVVGRExFTkJRVU03TzBGQlJVWXNVVUZCVVN4RFFVRkRMRkZCUVZFc1IwRkJSeXhUUVVGVExFOUJRVThzUlVGQlJTeEhRVUZITEVOQlFVTTdTVUZEZEVNc1NVRkJTU3hSUVVGUkxFZEJRVWNzUjBGQlJ5eERRVUZETEZWQlFWVXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRKUVVOcVF5eEpRVUZKTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1JVRkJSU3hWUVVGVkxFVkJRVVU3VVVGREwwSXNUMEZCVHl4RlFVRkZMRkZCUVZFN1VVRkRha0lzVVVGQlVTeEZRVUZGTEZGQlFWRTdTMEZEY2tJc1EwRkJReXhEUVVGRE8wRkJRMUFzUTBGQlF5eERRVUZET3p0QlFVVkdMRkZCUVZFc1EwRkJReXhQUVVGUExFZEJRVWNzVTBGQlV5eFBRVUZQTEVWQlFVVXNSMEZCUnl4RFFVRkRPMGxCUTNKRExFbEJRVWtzVVVGQlVTeEhRVUZITEVkQlFVY3NRMEZCUXl4VlFVRlZMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03U1VGRGFrTXNTVUZCU1N4RFFVRkRMRkZCUVZFc1EwRkJReXhQUVVGUExFVkJRVVVzVTBGQlV5eEZRVUZGTzFGQlF6bENMRTlCUVU4c1JVRkJSU3hSUVVGUk8xRkJRMnBDTEZGQlFWRXNSVUZCUlN4UlFVRlJPMHRCUTNKQ0xFTkJRVU1zUTBGQlF6dEJRVU5RTEVOQlFVTXNRMEZCUXpzN1FVRkZSaXhSUVVGUkxFTkJRVU1zUzBGQlN5eEhRVUZITEZOQlFWTXNUMEZCVHl4RlFVRkZMRWRCUVVjc1EwRkJRenRKUVVOdVF5eEpRVUZKTEZGQlFWRXNSMEZCUnl4SFFVRkhMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBsQlEycERMRWxCUVVrc1EwRkJReXhSUVVGUkxFTkJRVU1zVDBGQlR5eEZRVUZGTEU5QlFVOHNSVUZCUlR0UlFVTTFRaXhQUVVGUExFVkJRVVVzVVVGQlVUdFJRVU5xUWl4UlFVRlJMRVZCUVVVc1VVRkJVVHRMUVVOeVFpeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRMRU5CUVVNN08wRkJSVVlzU1VGQlNTeE5RVUZOTEVkQlFVYzdTVUZEVkN4UFFVRlBPMGxCUTFBc1QwRkJUenRKUVVOUUxFMUJRVTA3U1VGRFRpeFZRVUZWTzBsQlExWXNUMEZCVHp0SlFVTlFMRkZCUVZFN1NVRkRVaXhYUVVGWE8wbEJRMWdzVjBGQlZ6dEpRVU5ZTEZWQlFWVTdTVUZEVml4WFFVRlhPMGxCUTFnc1UwRkJVenRKUVVOVUxGbEJRVms3U1VGRFdpeFpRVUZaTzBsQlExb3NVVUZCVVR0SlFVTlNMRkZCUVZFN1NVRkRVaXhSUVVGUk8wbEJRMUlzVVVGQlVUdEpRVU5TTEUxQlFVMDdTVUZEVGl4UlFVRlJPMEZCUTFvc1EwRkJReXhEUVVGRE96dEJRVVZHTEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1RVRkJUU3hEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETEVWQlFVVXNSVUZCUlR0SlFVTTNRaXhKUVVGSkxFdEJRVXNzUjBGQlJ5eE5RVUZOTEVOQlFVTXNRMEZCUXl4RFFVRkRMRU5CUVVNN1NVRkRkRUlzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRk5CUVZNc1IwRkJSeXhEUVVGRE8xRkJRelZDTEU5QlFVOHNVMEZCVXl4UFFVRlBMRVZCUVVVc1QwRkJUeXhEUVVGRE8xbEJRemRDTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1QwRkJUeXhGUVVGRkxFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0VFFVTnlReXhEUVVGRE8wdEJRMHdzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXl4RFFVRkRPMEZCUTJRc1EwRkJRenM3UVVGRlJDeE5RVUZOTEVOQlFVTXNUMEZCVHl4SFFVRkhMRkZCUVZFaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SjJZWElnWHlBOUlISmxjWFZwY21Vb0p5NHZkWFJwYkhNbktUdGNibHh1ZG1GeUlGTnBiWFZzWVhSbElEMGdlMXh1SUNBZ0lHVjJaVzUwT2lCbWRXNWpkR2x2YmlobGJHVnRaVzUwTENCbGRtVnVkRTVoYldVc0lHOXdkR2x2Ym5NcGUxeHVJQ0FnSUNBZ0lDQjJZWElnWlhaME8xeHVJQ0FnSUNBZ0lDQnBaaUFvWkc5amRXMWxiblF1WTNKbFlYUmxSWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdWMmRDQTlJR1J2WTNWdFpXNTBMbU55WldGMFpVVjJaVzUwS0Z3aVNGUk5URVYyWlc1MGMxd2lLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1sMFJYWmxiblFvWlhabGJuUk9ZVzFsTENCbGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObFpXNTBaWEluSUNZbUlHVjJaVzUwVG1GdFpTQWhQU0FuYlc5MWMyVnNaV0YyWlNjc0lIUnlkV1VnS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJRjh1WlhoMFpXNWtLR1YyZEN3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsYkdWdFpXNTBMbVJwYzNCaGRHTm9SWFpsYm5Rb1pYWjBLVHRjYmlBZ0lDQWdJQ0FnZldWc2MyVjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbGRuUWdQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZkbVZ1ZEU5aWFtVmpkQ2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdaV3hsYldWdWRDNW1hWEpsUlhabGJuUW9KMjl1SnlBcklHVjJaVzUwVG1GdFpTeGxkblFwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0JyWlhsRmRtVnVkRG9nWm5WdVkzUnBiMjRvWld4bGJXVnVkQ3dnZEhsd1pTd2diM0IwYVc5dWN5bDdYRzRnSUNBZ0lDQWdJSFpoY2lCbGRuUXNYRzRnSUNBZ0lDQWdJQ0FnSUNCbElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR0oxWW1Kc1pYTTZJSFJ5ZFdVc0lHTmhibU5sYkdGaWJHVTZJSFJ5ZFdVc0lIWnBaWGM2SUhkcGJtUnZkeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqZEhKc1MyVjVPaUJtWVd4elpTd2dZV3gwUzJWNU9pQm1ZV3h6WlN3Z2MyaHBablJMWlhrNklHWmhiSE5sTENCdFpYUmhTMlY1T2lCbVlXeHpaU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JyWlhsRGIyUmxPaUF3TENCamFHRnlRMjlrWlRvZ01GeHVJQ0FnSUNBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0FnSUNBZ1h5NWxlSFJsYm1Rb1pTd2diM0IwYVc5dWN5azdYRzRnSUNBZ0lDQWdJR2xtSUNoa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGZG1WdWRDbDdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGNubDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaWFowSUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUlhabGJuUW9KMHRsZVVWMlpXNTBjeWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWMmRDNXBibWwwUzJWNVJYWmxiblFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUjVjR1VzSUdVdVluVmlZbXhsY3l3Z1pTNWpZVzVqWld4aFlteGxMQ0JsTG5acFpYY3NYRzRnSUNBZ0lDQWdJQ0FnSUNCbExtTjBjbXhMWlhrc0lHVXVZV3gwUzJWNUxDQmxMbk5vYVdaMFMyVjVMQ0JsTG0xbGRHRkxaWGtzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxMbXRsZVVOdlpHVXNJR1V1WTJoaGNrTnZaR1VwTzF4dUlDQWdJQ0FnSUNBZ0lHVnNaVzFsYm5RdVpHbHpjR0YwWTJoRmRtVnVkQ2hsZG5RcE8xeHVJQ0FnSUNBZ0lDQjlZMkYwWTJnb1pYSnlLWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVjJkQ0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVYyWlc1MEtGd2lSWFpsYm5SelhDSXBPMXh1SUNBZ0lDQWdJQ0JsZG5RdWFXNXBkRVYyWlc1MEtIUjVjR1VzSUdVdVluVmlZbXhsY3l3Z1pTNWpZVzVqWld4aFlteGxLVHRjYmlBZ0lDQWdJQ0FnWHk1bGVIUmxibVFvWlhaMExDQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMmFXVjNPaUJsTG5acFpYY3NYRzRnSUNBZ0lDQWdJQ0FnWTNSeWJFdGxlVG9nWlM1amRISnNTMlY1TENCaGJIUkxaWGs2SUdVdVlXeDBTMlY1TEZ4dUlDQWdJQ0FnSUNBZ0lITm9hV1owUzJWNU9pQmxMbk5vYVdaMFMyVjVMQ0J0WlhSaFMyVjVPaUJsTG0xbGRHRkxaWGtzWEc0Z0lDQWdJQ0FnSUNBZ2EyVjVRMjlrWlRvZ1pTNXJaWGxEYjJSbExDQmphR0Z5UTI5a1pUb2daUzVqYUdGeVEyOWtaVnh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ1pXeGxiV1Z1ZEM1a2FYTndZWFJqYUVWMlpXNTBLR1YyZENrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibjA3WEc1Y2JsTnBiWFZzWVhSbExtdGxlWEJ5WlhOeklEMGdablZ1WTNScGIyNG9aV3hsYldWdWRDd2dZMmh5S1h0Y2JpQWdJQ0IyWVhJZ1kyaGhja052WkdVZ1BTQmphSEl1WTJoaGNrTnZaR1ZCZENnd0tUdGNiaUFnSUNCMGFHbHpMbXRsZVVWMlpXNTBLR1ZzWlcxbGJuUXNJQ2RyWlhsd2NtVnpjeWNzSUh0Y2JpQWdJQ0FnSUNBZ2EyVjVRMjlrWlRvZ1kyaGhja052WkdVc1hHNGdJQ0FnSUNBZ0lHTm9ZWEpEYjJSbE9pQmphR0Z5UTI5a1pWeHVJQ0FnSUgwcE8xeHVmVHRjYmx4dVUybHRkV3hoZEdVdWEyVjVaRzkzYmlBOUlHWjFibU4wYVc5dUtHVnNaVzFsYm5Rc0lHTm9jaWw3WEc0Z0lDQWdkbUZ5SUdOb1lYSkRiMlJsSUQwZ1kyaHlMbU5vWVhKRGIyUmxRWFFvTUNrN1hHNGdJQ0FnZEdocGN5NXJaWGxGZG1WdWRDaGxiR1Z0Wlc1MExDQW5hMlY1Wkc5M2JpY3NJSHRjYmlBZ0lDQWdJQ0FnYTJWNVEyOWtaVG9nWTJoaGNrTnZaR1VzWEc0Z0lDQWdJQ0FnSUdOb1lYSkRiMlJsT2lCamFHRnlRMjlrWlZ4dUlDQWdJSDBwTzF4dWZUdGNibHh1VTJsdGRXeGhkR1V1YTJWNWRYQWdQU0JtZFc1amRHbHZiaWhsYkdWdFpXNTBMQ0JqYUhJcGUxeHVJQ0FnSUhaaGNpQmphR0Z5UTI5a1pTQTlJR05vY2k1amFHRnlRMjlrWlVGMEtEQXBPMXh1SUNBZ0lIUm9hWE11YTJWNVJYWmxiblFvWld4bGJXVnVkQ3dnSjJ0bGVYVndKeXdnZTF4dUlDQWdJQ0FnSUNCclpYbERiMlJsT2lCamFHRnlRMjlrWlN4Y2JpQWdJQ0FnSUNBZ1kyaGhja052WkdVNklHTm9ZWEpEYjJSbFhHNGdJQ0FnZlNrN1hHNTlPMXh1WEc1MllYSWdaWFpsYm5SeklEMGdXMXh1SUNBZ0lDZGpiR2xqYXljc1hHNGdJQ0FnSjJadlkzVnpKeXhjYmlBZ0lDQW5ZbXgxY2ljc1hHNGdJQ0FnSjJSaWJHTnNhV05ySnl4Y2JpQWdJQ0FuYVc1d2RYUW5MRnh1SUNBZ0lDZGphR0Z1WjJVbkxGeHVJQ0FnSUNkdGIzVnpaV1J2ZDI0bkxGeHVJQ0FnSUNkdGIzVnpaVzF2ZG1VbkxGeHVJQ0FnSUNkdGIzVnpaVzkxZENjc1hHNGdJQ0FnSjIxdmRYTmxiM1psY2ljc1hHNGdJQ0FnSjIxdmRYTmxkWEFuTEZ4dUlDQWdJQ2R0YjNWelpXVnVkR1Z5Snl4Y2JpQWdJQ0FuYlc5MWMyVnNaV0YyWlNjc1hHNGdJQ0FnSjNKbGMybDZaU2NzWEc0Z0lDQWdKM05qY205c2JDY3NYRzRnSUNBZ0ozTmxiR1ZqZENjc1hHNGdJQ0FnSjNOMVltMXBkQ2NzWEc0Z0lDQWdKMnh2WVdRbkxGeHVJQ0FnSUNkMWJteHZZV1FuWEc1ZE8xeHVYRzVtYjNJZ0tIWmhjaUJwSUQwZ1pYWmxiblJ6TG14bGJtZDBhRHNnYVMwdE95bDdYRzRnSUNBZ2RtRnlJR1YyWlc1MElEMGdaWFpsYm5SelcybGRPMXh1SUNBZ0lGTnBiWFZzWVhSbFcyVjJaVzUwWFNBOUlDaG1kVzVqZEdsdmJpaGxkblFwZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRvWld4bGJXVnVkQ3dnYjNCMGFXOXVjeWw3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG1WMlpXNTBLR1ZzWlcxbGJuUXNJR1YyZEN3Z2IzQjBhVzl1Y3lrN1hHNGdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ2ZTaGxkbVZ1ZENrcE8xeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZOcGJYVnNZWFJsT3lKZGZRPT0iLCIvKipcbiAqIFBvbHlmaWxsc1xuICovXG5cbi8qKlxuICogVGhpcyBpcyBjb3BpZWQgZnJvbSBSZWFjSlMncyBvd24gcG9seXBmaWxsIHRvIHJ1biB0ZXN0cyB3aXRoIHBoYW50b21qcy5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC9ibG9iLzNkYzEwNzQ5MDgwYTQ2MGU0OGJlZTQ2ZDc2OTc2M2VjNzE5MWFjNzYvc3JjL3Rlc3QvcGhhbnRvbWpzLXNoaW1zLmpzXG4gKi9cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBBcCA9IEFycmF5LnByb3RvdHlwZTtcbiAgICB2YXIgc2xpY2UgPSBBcC5zbGljZTtcbiAgICB2YXIgRnAgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgICBpZiAoIUZwLmJpbmQpIHtcbiAgICAgIC8vIFBoYW50b21KUyBkb2Vzbid0IHN1cHBvcnQgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgbmF0aXZlbHksIHNvXG4gICAgICAvLyBwb2x5ZmlsbCBpdCB3aGVuZXZlciB0aGlzIG1vZHVsZSBpcyByZXF1aXJlZC5cbiAgICAgIEZwLmJpbmQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgIHZhciBmdW5jID0gdGhpcztcbiAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICAgICAgZnVuY3Rpb24gYm91bmQoKSB7XG4gICAgICAgICAgdmFyIGludm9rZWRBc0NvbnN0cnVjdG9yID0gZnVuYy5wcm90b3R5cGUgJiYgKHRoaXMgaW5zdGFuY2VvZiBmdW5jKTtcbiAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShcbiAgICAgICAgICAgIC8vIElnbm9yZSB0aGUgY29udGV4dCBwYXJhbWV0ZXIgd2hlbiBpbnZva2luZyB0aGUgYm91bmQgZnVuY3Rpb25cbiAgICAgICAgICAgIC8vIGFzIGEgY29uc3RydWN0b3IuIE5vdGUgdGhhdCB0aGlzIGluY2x1ZGVzIG5vdCBvbmx5IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAvLyBpbnZvY2F0aW9ucyB1c2luZyB0aGUgbmV3IGtleXdvcmQgYnV0IGFsc28gY2FsbHMgdG8gYmFzZSBjbGFzc1xuICAgICAgICAgICAgLy8gY29uc3RydWN0b3JzIHN1Y2ggYXMgQmFzZUNsYXNzLmNhbGwodGhpcywgLi4uKSBvciBzdXBlciguLi4pLlxuICAgICAgICAgICAgIWludm9rZWRBc0NvbnN0cnVjdG9yICYmIGNvbnRleHQgfHwgdGhpcyxcbiAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGJvdW5kIGZ1bmN0aW9uIG11c3Qgc2hhcmUgdGhlIC5wcm90b3R5cGUgb2YgdGhlIHVuYm91bmRcbiAgICAgICAgLy8gZnVuY3Rpb24gc28gdGhhdCBhbnkgb2JqZWN0IGNyZWF0ZWQgYnkgb25lIGNvbnN0cnVjdG9yIHdpbGwgY291bnRcbiAgICAgICAgLy8gYXMgYW4gaW5zdGFuY2Ugb2YgYm90aCBjb25zdHJ1Y3RvcnMuXG4gICAgICAgIGJvdW5kLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuXG4gICAgICAgIHJldHVybiBib3VuZDtcbiAgICAgIH07XG4gICAgfVxuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKGRzdCwgc3JjKXtcbiAgICAgICAgaWYgKHNyYykge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNyYykge1xuICAgICAgICAgICAgICAgIGlmIChzcmMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZHN0O1xuICAgIH0sXG5cbiAgICBtYXA6IGZ1bmN0aW9uKG9iaiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGggPj4+IDA7XG4gICAgICAgIHZhciBuZXdBcnJheSA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgICB2YXIga2V5ID0gMDtcbiAgICAgICAgaWYgKCF0aGlzQXJnKSB7XG4gICAgICAgICAgICB0aGlzQXJnID0gb2JqO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChrZXkgPCBsZW4pIHtcbiAgICAgICAgICAgIG5ld0FycmF5W2tleV0gPSBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIG9ialtrZXldLCBrZXksIG9iaik7XG4gICAgICAgICAgICBrZXkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XG4gICAgfVxuXG59O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lMMmh2YldVdlpHRjJhV1IwYVhSMGMzZHZjblJvTDNCeWIycGxZM1J6TDNWMGJXVXZjM0pqTDJwekwzVjBhV3h6TG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOWtZWFpwWkhScGRIUnpkMjl5ZEdndmNISnZhbVZqZEhNdmRYUnRaUzl6Y21NdmFuTXZkWFJwYkhNdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3TzBGQlJVRXNSMEZCUnpzN1FVRkZTRHRCUVVOQk96dEhRVVZITzBGQlEwZ3NRMEZCUXl4WFFVRlhPenRKUVVWU0xFbEJRVWtzUlVGQlJTeEhRVUZITEV0QlFVc3NRMEZCUXl4VFFVRlRMRU5CUVVNN1NVRkRla0lzU1VGQlNTeExRVUZMTEVkQlFVY3NSVUZCUlN4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVONlFpeEpRVUZKTEVsQlFVa3NSVUZCUlN4SFFVRkhMRkZCUVZFc1EwRkJReXhUUVVGVExFTkJRVU03TzBGQlJXaERMRWxCUVVrc1NVRkJTU3hEUVVGRExFVkJRVVVzUTBGQlF5eEpRVUZKTEVWQlFVVTdRVUZEYkVJN08wMUJSVTBzUlVGQlJTeERRVUZETEVsQlFVa3NSMEZCUnl4VFFVRlRMRTlCUVU4c1JVRkJSVHRSUVVNeFFpeEpRVUZKTEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNN1FVRkRlRUlzVVVGQlVTeEpRVUZKTEVsQlFVa3NSMEZCUnl4TFFVRkxMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zUlVGQlJTeERRVUZETEVOQlFVTXNRMEZCUXpzN1VVRkZjRU1zVTBGQlV5eExRVUZMTEVkQlFVYzdWVUZEWml4SlFVRkpMRzlDUVVGdlFpeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRXRCUVVzc1NVRkJTU3haUVVGWkxFbEJRVWtzUTBGQlF5eERRVUZETzBGQlF6bEZMRlZCUVZVc1QwRkJUeXhKUVVGSkxFTkJRVU1zUzBGQlN6dEJRVU16UWp0QlFVTkJPMEZCUTBFN08xbEJSVmtzUTBGQlF5eHZRa0ZCYjBJc1NVRkJTU3hQUVVGUExFbEJRVWtzU1VGQlNUdFpRVU40UXl4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN1YwRkRia01zUTBGQlF6dEJRVU5hTEZOQlFWTTdRVUZEVkR0QlFVTkJPMEZCUTBFN08wRkJSVUVzVVVGQlVTeExRVUZMTEVOQlFVTXNVMEZCVXl4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU03TzFGQlJXcERMRTlCUVU4c1MwRkJTeXhEUVVGRE8wOUJRMlFzUTBGQlF6dEJRVU5TTEV0QlFVczdPMEZCUlV3c1EwRkJReXhIUVVGSExFTkJRVU03TzBGQlJVd3NUVUZCVFN4RFFVRkRMRTlCUVU4c1IwRkJSenM3U1VGRllpeE5RVUZOTEVWQlFVVXNVMEZCVXl4TlFVRk5MRU5CUVVNc1IwRkJSeXhGUVVGRkxFZEJRVWNzUTBGQlF6dFJRVU0zUWl4SlFVRkpMRWRCUVVjc1JVRkJSVHRaUVVOTUxFdEJRVXNzU1VGQlNTeEhRVUZITEVsQlFVa3NSMEZCUnl4RlFVRkZPMmRDUVVOcVFpeEpRVUZKTEVkQlFVY3NRMEZCUXl4alFVRmpMRU5CUVVNc1IwRkJSeXhEUVVGRExFVkJRVVU3YjBKQlEzcENMRWRCUVVjc1EwRkJReXhIUVVGSExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNSMEZCUnl4RFFVRkRMRU5CUVVNN2FVSkJRM1pDTzJGQlEwbzdVMEZEU2p0UlFVTkVMRTlCUVU4c1IwRkJSeXhEUVVGRE8wRkJRMjVDTEV0QlFVczdPMGxCUlVRc1IwRkJSeXhGUVVGRkxGTkJRVk1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNSVUZCUlN4UFFVRlBMRVZCUVVVN1VVRkRiRU1zU1VGQlNTeEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRTFCUVUwc1MwRkJTeXhEUVVGRExFTkJRVU03VVVGRE0wSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1NVRkJTU3hMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEVOQlFVTTdVVUZET1VJc1NVRkJTU3hIUVVGSExFZEJRVWNzUTBGQlF5eERRVUZETzFGQlExb3NTVUZCU1N4RFFVRkRMRTlCUVU4c1JVRkJSVHRaUVVOV0xFOUJRVThzUjBGQlJ5eEhRVUZITEVOQlFVTTdVMEZEYWtJN1VVRkRSQ3hQUVVGUExFZEJRVWNzUjBGQlJ5eEhRVUZITEVWQlFVVTdXVUZEWkN4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExFZEJRVWNzVVVGQlVTeERRVUZETEVsQlFVa3NRMEZCUXl4UFFVRlBMRVZCUVVVc1IwRkJSeXhEUVVGRExFZEJRVWNzUTBGQlF5eEZRVUZGTEVkQlFVY3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRaUVVNelJDeEhRVUZITEVWQlFVVXNRMEZCUXp0VFFVTlVPMUZCUTBRc1QwRkJUeXhSUVVGUkxFTkJRVU03UVVGRGVFSXNTMEZCU3pzN1EwRkZTaXhEUVVGRElpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lMeW9xWEc0Z0tpQlFiMng1Wm1sc2JITmNiaUFxTDF4dVhHNHZLaXBjYmlBcUlGUm9hWE1nYVhNZ1kyOXdhV1ZrSUdaeWIyMGdVbVZoWTBwVEozTWdiM2R1SUhCdmJIbHdabWxzYkNCMGJ5QnlkVzRnZEdWemRITWdkMmwwYUNCd2FHRnVkRzl0YW5NdVhHNGdLaUJvZEhSd2N6b3ZMMmRwZEdoMVlpNWpiMjB2Wm1GalpXSnZiMnN2Y21WaFkzUXZZbXh2WWk4elpHTXhNRGMwT1RBNE1HRTBOakJsTkRoaVpXVTBObVEzTmprM05qTmxZemN4T1RGaFl6YzJMM055WXk5MFpYTjBMM0JvWVc1MGIyMXFjeTF6YUdsdGN5NXFjMXh1SUNvdlhHNG9ablZ1WTNScGIyNG9LU0I3WEc1Y2JpQWdJQ0IyWVhJZ1FYQWdQU0JCY25KaGVTNXdjbTkwYjNSNWNHVTdYRzRnSUNBZ2RtRnlJSE5zYVdObElEMGdRWEF1YzJ4cFkyVTdYRzRnSUNBZ2RtRnlJRVp3SUQwZ1JuVnVZM1JwYjI0dWNISnZkRzkwZVhCbE8xeHVYRzRnSUNBZ2FXWWdLQ0ZHY0M1aWFXNWtLU0I3WEc0Z0lDQWdJQ0F2THlCUWFHRnVkRzl0U2xNZ1pHOWxjMjRuZENCemRYQndiM0owSUVaMWJtTjBhVzl1TG5CeWIzUnZkSGx3WlM1aWFXNWtJRzVoZEdsMlpXeDVMQ0J6YjF4dUlDQWdJQ0FnTHk4Z2NHOXNlV1pwYkd3Z2FYUWdkMmhsYm1WMlpYSWdkR2hwY3lCdGIyUjFiR1VnYVhNZ2NtVnhkV2x5WldRdVhHNGdJQ0FnSUNCR2NDNWlhVzVrSUQwZ1puVnVZM1JwYjI0b1kyOXVkR1Y0ZENrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnWm5WdVl5QTlJSFJvYVhNN1hHNGdJQ0FnSUNBZ0lIWmhjaUJoY21keklEMGdjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1zSURFcE8xeHVYRzRnSUNBZ0lDQWdJR1oxYm1OMGFXOXVJR0p2ZFc1a0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUE5SUdaMWJtTXVjSEp2ZEc5MGVYQmxJQ1ltSUNoMGFHbHpJR2x1YzNSaGJtTmxiMllnWm5WdVl5azdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYm1NdVlYQndiSGtvWEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJKWjI1dmNtVWdkR2hsSUdOdmJuUmxlSFFnY0dGeVlXMWxkR1Z5SUhkb1pXNGdhVzUyYjJ0cGJtY2dkR2hsSUdKdmRXNWtJR1oxYm1OMGFXOXVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QmhjeUJoSUdOdmJuTjBjblZqZEc5eUxpQk9iM1JsSUhSb1lYUWdkR2hwY3lCcGJtTnNkV1JsY3lCdWIzUWdiMjVzZVNCamIyNXpkSEoxWTNSdmNseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2FXNTJiMk5oZEdsdmJuTWdkWE5wYm1jZ2RHaGxJRzVsZHlCclpYbDNiM0prSUdKMWRDQmhiSE52SUdOaGJHeHpJSFJ2SUdKaGMyVWdZMnhoYzNOY2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUdOdmJuTjBjblZqZEc5eWN5QnpkV05vSUdGeklFSmhjMlZEYkdGemN5NWpZV3hzS0hSb2FYTXNJQzR1TGlrZ2IzSWdjM1Z3WlhJb0xpNHVLUzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDRnBiblp2YTJWa1FYTkRiMjV6ZEhKMVkzUnZjaUFtSmlCamIyNTBaWGgwSUh4OElIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ0lDQmhjbWR6TG1OdmJtTmhkQ2h6YkdsalpTNWpZV3hzS0dGeVozVnRaVzUwY3lrcFhHNGdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDOHZJRlJvWlNCaWIzVnVaQ0JtZFc1amRHbHZiaUJ0ZFhOMElITm9ZWEpsSUhSb1pTQXVjSEp2ZEc5MGVYQmxJRzltSUhSb1pTQjFibUp2ZFc1a1hHNGdJQ0FnSUNBZ0lDOHZJR1oxYm1OMGFXOXVJSE52SUhSb1lYUWdZVzU1SUc5aWFtVmpkQ0JqY21WaGRHVmtJR0o1SUc5dVpTQmpiMjV6ZEhKMVkzUnZjaUIzYVd4c0lHTnZkVzUwWEc0Z0lDQWdJQ0FnSUM4dklHRnpJR0Z1SUdsdWMzUmhibU5sSUc5bUlHSnZkR2dnWTI5dWMzUnlkV04wYjNKekxseHVJQ0FnSUNBZ0lDQmliM1Z1WkM1d2NtOTBiM1I1Y0dVZ1BTQm1kVzVqTG5CeWIzUnZkSGx3WlR0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1ltOTFibVE3WEc0Z0lDQWdJQ0I5TzF4dUlDQWdJSDFjYmx4dWZTa29LVHRjYmx4dWJXOWtkV3hsTG1WNGNHOXlkSE1nUFNCN1hHNWNiaUFnSUNCbGVIUmxibVE2SUdaMWJtTjBhVzl1SUdWNGRHVnVaQ2hrYzNRc0lITnlZeWw3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR3RsZVNCcGJpQnpjbU1wSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM0pqTG1oaGMwOTNibEJ5YjNCbGNuUjVLR3RsZVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkhOMFcydGxlVjBnUFNCemNtTmJhMlY1WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSemREdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JXRndPaUJtZFc1amRHbHZiaWh2WW1vc0lHTmhiR3hpWVdOckxDQjBhR2x6UVhKbktTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCc1pXNGdQU0J2WW1vdWJHVnVaM1JvSUQ0K1BpQXdPMXh1SUNBZ0lDQWdJQ0IyWVhJZ2JtVjNRWEp5WVhrZ1BTQnVaWGNnUVhKeVlYa29iR1Z1S1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3RsZVNBOUlEQTdYRzRnSUNBZ0lDQWdJR2xtSUNnaGRHaHBjMEZ5WnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGMwRnlaeUE5SUc5aWFqdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0IzYUdsc1pTQW9hMlY1SUR3Z2JHVnVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnVaWGRCY25KaGVWdHJaWGxkSUQwZ1kyRnNiR0poWTJzdVkyRnNiQ2gwYUdselFYSm5MQ0J2WW1wYmEyVjVYU3dnYTJWNUxDQnZZbW9wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdhMlY1S3lzN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHNWxkMEZ5Y21GNU8xeHVJQ0FnSUgxY2JseHVmVHRjYmlKZGZRPT0iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBQcm9taXNlID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xudmFyIFNpbXVsYXRlID0gcmVxdWlyZSgnLi9zaW11bGF0ZScpO1xudmFyIHNlbGVjdG9yRmluZGVyID0gcmVxdWlyZSgnLi9zZWxlY3RvckZpbmRlcicpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xuXG4vLyB2YXIgbXlHZW5lcmF0b3IgPSBuZXcgQ3NzU2VsZWN0b3JHZW5lcmF0b3IoKTtcbnZhciBpbXBvcnRhbnRTdGVwTGVuZ3RoID0gNTAwO1xudmFyIHNhdmVIYW5kbGVycyA9IFtdO1xudmFyIHJlcG9ydEhhbmRsZXJzID0gW107XG52YXIgbG9hZEhhbmRsZXJzID0gW107XG52YXIgc2V0dGluZ3NMb2FkSGFuZGxlcnMgPSBbXTtcblxuZnVuY3Rpb24gZ2V0U2NlbmFyaW8obmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGlmIChsb2FkSGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB2YXIgc3RhdGUgPSB1dG1lLnN0YXRlO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZS5zY2VuYXJpb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc2NlbmFyaW9zW2ldLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzdGF0ZS5zY2VuYXJpb3NbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvYWRIYW5kbGVyc1swXShuYW1lLCBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzcCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxudmFyIHZhbGlkYXRpbmcgPSBmYWxzZTtcblxudmFyIGV2ZW50cyA9IFtcbiAgICAnY2xpY2snLFxuICAgICdmb2N1cycsXG4gICAgJ2JsdXInLFxuICAgICdkYmxjbGljaycsXG4gICAgLy8gJ2RyYWcnLFxuICAgIC8vICdkcmFnZW50ZXInLFxuICAgIC8vICdkcmFnbGVhdmUnLFxuICAgIC8vICdkcmFnb3ZlcicsXG4gICAgLy8gJ2RyYWdzdGFydCcsXG4gICAgLy8gJ2lucHV0JyxcbiAgICAnbW91c2Vkb3duJyxcbiAgICAvLyAnbW91c2Vtb3ZlJyxcbiAgICAnbW91c2VlbnRlcicsXG4gICAgJ21vdXNlbGVhdmUnLFxuICAgICdtb3VzZW91dCcsXG4gICAgJ21vdXNlb3ZlcicsXG4gICAgJ21vdXNldXAnLFxuICAgICdjaGFuZ2UnLFxuICAgIC8vICdyZXNpemUnLFxuICAgIC8vICdzY3JvbGwnXG5dO1xuXG5mdW5jdGlvbiBnZXRDb25kaXRpb25zKHNjZW5hcmlvLCBjb25kaXRpb25UeXBlKSB7XG4gIHZhciBzZXR1cCA9IHNjZW5hcmlvW2NvbmRpdGlvblR5cGVdO1xuICB2YXIgc2NlbmFyaW9zID0gc2V0dXAgJiYgc2V0dXAuc2NlbmFyaW9zO1xuICAvLyBUT0RPOiBCcmVhayBvdXQgaW50byBoZWxwZXJcbiAgaWYgKHNjZW5hcmlvcykge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChfLm1hcChzY2VuYXJpb3MsIGZ1bmN0aW9uIChzY2VuYXJpb05hbWUpIHtcbiAgICAgIHJldHVybiBnZXRTY2VuYXJpbyhzY2VuYXJpb05hbWUpLnRoZW4oZnVuY3Rpb24gKG90aGVyU2NlbmFyaW8pIHtcbiAgICAgICAgb3RoZXJTY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3RoZXJTY2VuYXJpbykpO1xuICAgICAgICByZXR1cm4gc2V0dXBDb25kaXRpb25zKG90aGVyU2NlbmFyaW8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciB0b1JldHVybiA9IFtdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3RoZXJTY2VuYXJpby5zdGVwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdG9SZXR1cm4ucHVzaChvdGhlclNjZW5hcmlvLnN0ZXBzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRvUmV0dXJuO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcmVjb25kaXRpb25zIChzY2VuYXJpbykge1xuICByZXR1cm4gZ2V0Q29uZGl0aW9ucyhzY2VuYXJpbywgJ3NldHVwJyk7XG59XG5cbmZ1bmN0aW9uIGdldFBvc3Rjb25kaXRpb25zIChzY2VuYXJpbykge1xuICByZXR1cm4gZ2V0Q29uZGl0aW9ucyhzY2VuYXJpbywgJ2NsZWFudXAnKTtcbn1cblxuZnVuY3Rpb24gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBzKSB7XG4gICAgdmFyIG5ld1N0ZXBzID0gW107XG4gICAgdmFyIGN1cnJlbnRUaW1lc3RhbXA7IC8vIGluaXRhbGl6ZWQgYnkgZmlyc3QgbGlzdCBvZiBzdGVwcy5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBmbGF0U3RlcHMgPSBzdGVwc1tqXTtcbiAgICAgICAgaWYgKGogPiAwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHN0ZXBzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXAgPSBmbGF0U3RlcHNba107XG4gICAgICAgICAgICAgICAgdmFyIGRpZmYgPSBrID4gMCA/IHN0ZXAudGltZVN0YW1wIC0gZmxhdFN0ZXBzW2sgLSAxXS50aW1lU3RhbXAgOiA1MDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wICs9IGRpZmY7XG4gICAgICAgICAgICAgICAgZmxhdFN0ZXBzW2tdLnRpbWVTdGFtcCA9IGN1cnJlbnRUaW1lc3RhbXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZXN0YW1wID0gZmxhdFN0ZXBzW2pdLnRpbWVTdGFtcDtcbiAgICAgICAgfVxuICAgICAgICBuZXdTdGVwcyA9IG5ld1N0ZXBzLmNvbmNhdChmbGF0U3RlcHMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3U3RlcHM7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29uZGl0aW9ucyAoc2NlbmFyaW8pIHtcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRQcmVjb25kaXRpb25zKHNjZW5hcmlvKSxcbiAgICAgICAgZ2V0UG9zdGNvbmRpdGlvbnMoc2NlbmFyaW8pXG4gICAgXSkudGhlbihmdW5jdGlvbiAoc3RlcEFycmF5cykge1xuICAgICAgICB2YXIgc3RlcExpc3RzID0gc3RlcEFycmF5c1swXS5jb25jYXQoW3NjZW5hcmlvLnN0ZXBzXSwgc3RlcEFycmF5c1sxXSk7XG4gICAgICAgIHNjZW5hcmlvLnN0ZXBzID0gX2NvbmNhdFNjZW5hcmlvU3RlcExpc3RzKHN0ZXBMaXN0cyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJ1blN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKSB7XG4gICAgdXRtZS5icm9hZGNhc3QoJ1JVTk5JTkdfU1RFUCcpO1xuICAgIHRvU2tpcCA9IHRvU2tpcCB8fCB7fTtcblxuICAgIHZhciBzdGVwID0gc2NlbmFyaW8uc3RlcHNbaWR4XTtcbiAgICB2YXIgc3RhdGUgPSB1dG1lLnN0YXRlO1xuICAgIGlmIChzdGVwICYmIHN0YXRlLnN0YXR1cyA9PSAnUExBWUlORycpIHtcbiAgICAgICAgc3RhdGUucnVuLnNjZW5hcmlvID0gc2NlbmFyaW87XG4gICAgICAgIHN0YXRlLnJ1bi5zdGVwSW5kZXggPSBpZHg7XG4gICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAnbG9hZCcpIHtcbiAgICAgICAgICAgIHZhciBuZXdMb2NhdGlvbiA9IHN0ZXAuZGF0YS51cmwucHJvdG9jb2wgKyBcIi8vXCIgKyBzdGVwLmRhdGEudXJsLmhvc3Q7XG4gICAgICAgICAgICB2YXIgc2VhcmNoID0gc3RlcC5kYXRhLnVybC5zZWFyY2g7XG4gICAgICAgICAgICB2YXIgaGFzaCA9IHN0ZXAuZGF0YS51cmwuaGFzaDtcblxuICAgICAgICAgICAgaWYgKHNlYXJjaCAmJiAhc2VhcmNoLmNoYXJBdChcIj9cIikpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2ggPSBcIj9cIiArIHNlYXJjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc1NhbWVVUkwgPSAobG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24uc2VhcmNoKSA9PT0gKG5ld0xvY2F0aW9uICsgc2VhcmNoKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKG5ld0xvY2F0aW9uICsgaGFzaCArIHNlYXJjaCk7XG5cbiAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInZlcmJvc2VcIikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coKGxvY2F0aW9uLnByb3RvY29sICsgbG9jYXRpb24uaG9zdCArIGxvY2F0aW9uLnNlYXJjaCkpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygoc3RlcC5kYXRhLnVybC5wcm90b2NvbCArIHN0ZXAuZGF0YS51cmwuaG9zdCArIHN0ZXAuZGF0YS51cmwuc2VhcmNoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgbm90IGNoYW5nZWQgdGhlIGFjdHVhbCBsb2NhdGlvbiwgdGhlbiB0aGUgbG9jYXRpb24ucmVwbGFjZVxuICAgICAgICAgICAgLy8gd2lsbCBub3QgZ28gYW55d2hlcmVcbiAgICAgICAgICAgIGlmIChpc1NhbWVVUkwpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RlcC5ldmVudE5hbWUgPT0gJ3RpbWVvdXQnKSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHNjZW5hcmlvLCBpZHgsIHRvU2tpcCwgc3RlcC5kYXRhLmFtb3VudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbG9jYXRvciA9IHN0ZXAuZGF0YS5sb2NhdG9yO1xuICAgICAgICAgICAgdmFyIHN0ZXBzID0gc2NlbmFyaW8uc3RlcHM7XG4gICAgICAgICAgICB2YXIgdW5pcXVlSWQgPSBnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApO1xuXG4gICAgICAgICAgICAvLyB0cnkgdG8gZ2V0IHJpZCBvZiB1bm5lY2Vzc2FyeSBzdGVwc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b1NraXBbdW5pcXVlSWRdID09ICd1bmRlZmluZWQnICYmIHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwicnVubmVyLnNwZWVkXCIpICE9ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgdmFyIGRpZmY7XG4gICAgICAgICAgICAgIHZhciBpZ25vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IHN0ZXBzLmxlbmd0aCAtIDE7IGogPiBpZHg7IGotLSkge1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclN0ZXAgPSBzdGVwc1tqXTtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJVbmlxdWVJZCA9IGdldFVuaXF1ZUlkRnJvbVN0ZXAob3RoZXJTdGVwKTtcbiAgICAgICAgICAgICAgICBpZiAodW5pcXVlSWQgPT09IG90aGVyVW5pcXVlSWQpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghZGlmZikge1xuICAgICAgICAgICAgICAgICAgICAgIGRpZmYgPSAob3RoZXJTdGVwLnRpbWVTdGFtcCAtIHN0ZXAudGltZVN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZ25vcmUgPSAhaXNJbXBvcnRhbnRTdGVwKG90aGVyU3RlcCkgJiYgZGlmZiA8IGltcG9ydGFudFN0ZXBMZW5ndGg7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW50ZXJhY3RpdmVTdGVwKG90aGVyU3RlcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZ25vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB0b1NraXBbdW5pcXVlSWRdID0gaWdub3JlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXZSdyZSBza2lwcGluZyB0aGlzIGVsZW1lbnRcbiAgICAgICAgICAgIGlmICh0b1NraXBbZ2V0VW5pcXVlSWRGcm9tU3RlcChzdGVwKV0pIHtcbiAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaW5kRWxlbWVudFdpdGhMb2NhdG9yKHNjZW5hcmlvLCBzdGVwLCBsb2NhdG9yLCBnZXRUaW1lb3V0KHNjZW5hcmlvLCBpZHgpKS50aGVuKGZ1bmN0aW9uIChlbGVzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgZWxlID0gZWxlc1swXTtcbiAgICAgICAgICAgICAgICAgIHZhciB0YWdOYW1lID0gZWxlLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdXBwb3J0c0lucHV0RXZlbnQgPSB0YWdOYW1lID09PSAnaW5wdXQnIHx8IHRhZ05hbWUgPT09ICd0ZXh0YXJlYScgfHwgZWxlLmdldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJyk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChldmVudHMuaW5kZXhPZihzdGVwLmV2ZW50TmFtZSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC5kYXRhLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMud2hpY2ggPSBvcHRpb25zLmJ1dHRvbiA9IHN0ZXAuZGF0YS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZWxlbWVudCBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHN0ZXAuZGF0YS52YWx1ZSAhPSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBzdGVwLmRhdGEuYXR0cmlidXRlcyAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHRvQXBwbHkgPSBzdGVwLmRhdGEuYXR0cmlidXRlcyA/IHN0ZXAuZGF0YS5hdHRyaWJ1dGVzIDogeyBcInZhbHVlXCI6IHN0ZXAuZGF0YS52YWx1ZSB9O1xuICAgICAgICAgICAgICAgICAgICAgIF8uZXh0ZW5kKGVsZSwgdG9BcHBseSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnU2ltdWxhdGluZyAnICsgc3RlcC5ldmVudE5hbWUgKyAnIG9uIGVsZW1lbnQgJywgZWxlLCBsb2NhdG9yLnNlbGVjdG9yc1swXSwgXCIgZm9yIHN0ZXAgXCIgKyBpZHgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHN0ZXAuZXZlbnROYW1lID09ICdmb2N1cycgfHwgc3RlcC5ldmVudE5hbWUgPT0gJ2JsdXInKSAmJiBlbGVbc3RlcC5ldmVudE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZWxlW3N0ZXAuZXZlbnROYW1lXSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0ZXAuZXZlbnROYW1lID09PSAnY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0aGUgaW5wdXQgZXZlbnQuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNJbnB1dEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFNpbXVsYXRlLmV2ZW50KGVsZSwgJ2NoYW5nZScpOyAvLyBUaGlzIHNob3VsZCBiZSBmaXJlZCBhZnRlciBhIGJsdXIgZXZlbnQuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGVbc3RlcC5ldmVudE5hbWVdKGVsZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICdrZXlwcmVzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoc3RlcC5kYXRhLmtleUNvZGUpO1xuICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5rZXlkb3duKGVsZSwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5cHJlc3MoZWxlLCBrZXkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGVsZS52YWx1ZSA9IHN0ZXAuZGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUuZXZlbnQoZWxlLCAnY2hhbmdlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgU2ltdWxhdGUua2V5dXAoZWxlLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNJbnB1dEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaW11bGF0ZS5ldmVudChlbGUsICdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwLmV2ZW50TmFtZSA9PSAndmFsaWRhdGUnICYmIHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KCd2ZXJib3NlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coJ1ZhbGlkYXRlOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICArIFwiIGNvbnRhaW5zIHRleHQgJ1wiICArIHN0ZXAuZGF0YS50ZXh0ICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgICAgICBydW5OZXh0U3RlcChzY2VuYXJpbywgaWR4LCB0b1NraXApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAuZXZlbnROYW1lID09ICd2YWxpZGF0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlZhbGlkYXRlOiBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8oZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW1wb3J0YW50U3RlcChzdGVwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRFcnJvcihcIkZhaWxlZCBvbiBzdGVwOiBcIiArIGlkeCArIFwiICBFdmVudDogXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiIFJlYXNvbjogXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8oZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldCgndmVyYm9zZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYXV0b1J1bikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gd2FpdEZvckFuZ3VsYXIocm9vdFNlbGVjdG9yKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihyb290U2VsZWN0b3IpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhbmd1bGFyIGNvdWxkIG5vdCBiZSBmb3VuZCBvbiB0aGUgd2luZG93Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5nZXRUZXN0YWJpbGl0eSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZ2V0VGVzdGFiaWxpdHkoZWwpLndoZW5TdGFibGUocmVzb2x2ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhci5lbGVtZW50KGVsKS5pbmplY3RvcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncm9vdCBlbGVtZW50ICgnICsgcm9vdFNlbGVjdG9yICsgJykgaGFzIG5vIGluamVjdG9yLicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJyB0aGlzIG1heSBtZWFuIGl0IGlzIG5vdCBpbnNpZGUgbmctYXBwLicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZWwpLmluamVjdG9yKCkuZ2V0KCckYnJvd3NlcicpLlxuICAgICAgICAgICAgICAgIG5vdGlmeVdoZW5Ob091dHN0YW5kaW5nUmVxdWVzdHMocmVzb2x2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaXNJbXBvcnRhbnRTdGVwKHN0ZXApIHtcbiAgICByZXR1cm4gc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlbGVhdmUnICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZW91dCcgJiZcbiAgICAgICAgICAgc3RlcC5ldmVudE5hbWUgIT0gJ21vdXNlZW50ZXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdtb3VzZW92ZXInICYmXG4gICAgICAgICAgIHN0ZXAuZXZlbnROYW1lICE9ICdibHVyJyAmJlxuICAgICAgICAgICBzdGVwLmV2ZW50TmFtZSAhPSAnZm9jdXMnO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gc3RlcCBpcyBzb21lIHNvcnQgb2YgdXNlciBpbnRlcmFjdGlvblxuICovXG5mdW5jdGlvbiBpc0ludGVyYWN0aXZlU3RlcChzdGVwKSB7XG4gICAgdmFyIGV2dCA9IHN0ZXAuZXZlbnROYW1lO1xuXG4gICAgLypcbiAgICAgICAvLyBJbnRlcmVzdGluZyBub3RlLCBkb2luZyB0aGUgZm9sbG93aW5nIHdhcyBjYXVzaW5nIHRoaXMgZnVuY3Rpb24gdG8gcmV0dXJuIHVuZGVmaW5lZC5cbiAgICAgICByZXR1cm5cbiAgICAgICAgICAgZXZ0LmluZGV4T2YoXCJtb3VzZVwiKSAhPT0gMCB8fFxuICAgICAgICAgICBldnQuaW5kZXhPZihcIm1vdXNlZG93blwiKSA9PT0gMCB8fFxuICAgICAgICAgICBldnQuaW5kZXhPZihcIm1vdXNldXBcIikgPT09IDA7XG5cbiAgICAgICAvLyBJdHMgYmVjYXVzZSB0aGUgY29uZGl0aW9ucyB3ZXJlIG5vdCBvbiB0aGUgc2FtZSBsaW5lIGFzIHRoZSByZXR1cm4gc3RhdGVtZW50XG4gICAgKi9cbiAgICByZXR1cm4gZXZ0LmluZGV4T2YoXCJtb3VzZVwiKSAhPT0gMCB8fCBldnQuaW5kZXhPZihcIm1vdXNlZG93blwiKSA9PT0gMCB8fCBldnQuaW5kZXhPZihcIm1vdXNldXBcIikgPT09IDA7XG59XG5cbmZ1bmN0aW9uIGZpbmRFbGVtZW50V2l0aExvY2F0b3Ioc2NlbmFyaW8sIHN0ZXAsIGxvY2F0b3IsIHRpbWVvdXQsIHRleHRUb0NoZWNrKSB7XG4gICAgdmFyIHN0YXJ0ZWQ7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gdHJ5RmluZCgpIHtcbiAgICAgICAgICAgIGlmICghc3RhcnRlZCkge1xuICAgICAgICAgICAgICAgIHN0YXJ0ZWQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVsZXM7XG4gICAgICAgICAgICB2YXIgZm91bmRUb29NYW55ID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgZm91bmRWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGZvdW5kRGlmZmVyZW50VGV4dCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHNlbGVjdG9yc1RvVGVzdCA9IGxvY2F0b3Iuc2VsZWN0b3JzLnNsaWNlKDApO1xuICAgICAgICAgICAgdmFyIHRleHRUb0NoZWNrID0gc3RlcC5kYXRhLnRleHQ7XG4gICAgICAgICAgICB2YXIgY29tcGFyaXNvbiA9IHN0ZXAuZGF0YS5jb21wYXJpc29uIHx8IFwiZXF1YWxzXCI7XG4gICAgICAgICAgICBzZWxlY3RvcnNUb1Rlc3QudW5zaGlmdCgnW2RhdGEtdW5pcXVlLWlkPVwiJyArIGxvY2F0b3IudW5pcXVlSWQgKyAnXCJdJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9yc1RvVGVzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1RvVGVzdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IFwiOnZpc2libGVcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxlcyA9ICQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGV4dFRvQ2hlY2sgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdUZXh0ID0gJChlbGVzWzBdKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGNvbXBhcmlzb24gPT09ICdlcXVhbHMnICYmIG5ld1RleHQgPT09IHRleHRUb0NoZWNrKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjb21wYXJpc29uID09PSAnY29udGFpbnMnICYmIG5ld1RleHQuaW5kZXhPZih0ZXh0VG9DaGVjaykgPj0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmREaWZmZXJlbnRUZXh0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlcy5hdHRyKCdkYXRhLXVuaXF1ZS1pZCcsIGxvY2F0b3IudW5pcXVlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRUb29NYW55ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmb3VuZFZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShlbGVzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbXBvcnRhbnRTdGVwKHN0ZXApICYmIChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0ZWQpIDwgdGltZW91dCAqIDUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIDUwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kVG9vTWFueSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogRm91bmQgVG9vIE1hbnkgRWxlbWVudHNcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZvdW5kRGlmZmVyZW50VGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnQ291bGQgbm90IGZpbmQgYXBwcm9wcmlhdGUgZWxlbWVudCBmb3Igc2VsZWN0b3JzOiAnICsgSlNPTi5zdHJpbmdpZnkobG9jYXRvci5zZWxlY3RvcnMpICsgXCIgZm9yIGV2ZW50IFwiICsgc3RlcC5ldmVudE5hbWUgKyBcIi4gIFJlYXNvbjogVGV4dCBkb2Vzbid0IG1hdGNoLiAgXFxuRXhwZWN0ZWQ6XFxuXCIgKyB0ZXh0VG9DaGVjayArIFwiXFxuYnV0IHdhc1xcblwiICsgZWxlcy50ZXh0KCkgKyBcIlxcblwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICdDb3VsZCBub3QgZmluZCBhcHByb3ByaWF0ZSBlbGVtZW50IGZvciBzZWxlY3RvcnM6ICcgKyBKU09OLnN0cmluZ2lmeShsb2NhdG9yLnNlbGVjdG9ycykgKyBcIiBmb3IgZXZlbnQgXCIgKyBzdGVwLmV2ZW50TmFtZSArIFwiLiAgUmVhc29uOiBObyBlbGVtZW50cyBmb3VuZFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcGVlZCA9IHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwicnVubmVyLnNwZWVkXCIpO1xuICAgICAgICB2YXIgbGltaXQgPSBpbXBvcnRhbnRTdGVwTGVuZ3RoIC8gKHNwZWVkID09PSAncmVhbHRpbWUnID8gJzEnIDogc3BlZWQpO1xuICAgICAgICBpZiAoZ2xvYmFsLmFuZ3VsYXIpIHtcbiAgICAgICAgICAgIHdhaXRGb3JBbmd1bGFyKCdbbmctYXBwXScpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGlmIChzcGVlZCA9PT0gJ3JlYWx0aW1lJykge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh0cnlGaW5kLCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgICB0cnlGaW5kKCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiBzcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3BlZWQgPT09ICdyZWFsdGltZScpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIHRpbWVvdXQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzcGVlZCA9PT0gJ2Zhc3Rlc3QnKSB7XG4gICAgICAgICAgICAgICAgdHJ5RmluZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHRyeUZpbmQsIE1hdGgubWluKHRpbWVvdXQgKiBzcGVlZCwgbGltaXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lb3V0KHNjZW5hcmlvLCBpZHgpIHtcbiAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgc3RlcCBpcyBhIHZhbGlkYXRlIHN0ZXAsIHRoZW4ganVzdCBtb3ZlIG9uLCBhbmQgcHJldGVuZCBpdCBpc24ndCB0aGVyZVxuICAgICAgICAvLyBPciBpZiBpdCBpcyBhIHNlcmllcyBvZiBrZXlzLCB0aGVuIGdvXG4gICAgICAgIGlmIChzY2VuYXJpby5zdGVwc1tpZHggLSAxXS5ldmVudE5hbWUgPT0gJ3ZhbGlkYXRlJykge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5hcmlvLnN0ZXBzW2lkeF0udGltZVN0YW1wIC0gc2NlbmFyaW8uc3RlcHNbaWR4IC0gMV0udGltZVN0YW1wO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gcnVuTmV4dFN0ZXAoc2NlbmFyaW8sIGlkeCwgdG9Ta2lwLCB0aW1lb3V0KSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGFyZW4ndCBnb2luZyB0byBvdmVyZmxvdyB0aGUgY2FsbCBzdGFjay5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc2NlbmFyaW8uc3RlcHMubGVuZ3RoID4gKGlkeCArIDEpKSB7XG4gICAgICAgICAgICBydW5TdGVwKHNjZW5hcmlvLCBpZHggKyAxLCB0b1NraXApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXRtZS5zdG9wU2NlbmFyaW8odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9LCB0aW1lb3V0IHx8IDApO1xufVxuXG5mdW5jdGlvbiBmcmFnbWVudEZyb21TdHJpbmcoc3RySFRNTCkge1xuICAgIHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICB0ZW1wLmlubmVySFRNTCA9IHN0ckhUTUw7XG4gICAgLy8gY29uc29sZS5sb2codGVtcC5pbm5lckhUTUwpO1xuICAgIHJldHVybiB0ZW1wLmNvbnRlbnQgPyB0ZW1wLmNvbnRlbnQgOiB0ZW1wO1xufVxuXG5mdW5jdGlvbiBnZXRVbmlxdWVJZEZyb21TdGVwKHN0ZXApIHtcbiAgICByZXR1cm4gc3RlcCAmJiBzdGVwLmRhdGEgJiYgc3RlcC5kYXRhLmxvY2F0b3IgJiYgc3RlcC5kYXRhLmxvY2F0b3IudW5pcXVlSWQ7XG59XG5cbmZ1bmN0aW9uIGZpbHRlckV4dHJhTG9hZHMoc3RlcHMpIHtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICB2YXIgc2VlbkxvYWQgPSBmYWxzZTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGVwcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpc0xvYWQgPSBzdGVwc1tpXS5ldmVudE5hbWUgPT09ICdsb2FkJztcbiAgICBpZiAoIXNlZW5Mb2FkIHx8ICFpc0xvYWQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHN0ZXBzW2ldKTtcbiAgICAgIHNlZW5Mb2FkID0gc2VlbkxvYWQgfHwgaXNMb2FkO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxudmFyIGd1aWQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIHM0KCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAgICAgICAgIC50b1N0cmluZygxNilcbiAgICAgICAgICAgIC5zdWJzdHJpbmcoMSk7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICtcbiAgICAgICAgICAgIHM0KCkgKyAnLScgKyBzNCgpICsgczQoKSArIHM0KCk7XG4gICAgfTtcbn0pKCk7XG5cbnZhciBsaXN0ZW5lcnMgPSBbXTtcbnZhciBzdGF0ZTtcbnZhciB1dG1lID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNjZW5hcmlvID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCd1dG1lX3NjZW5hcmlvJyk7XG4gICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlID0gdXRtZS5zdGF0ZSA9IHV0bWUubG9hZFN0YXRlRnJvbVN0b3JhZ2UoKTtcbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ0lOSVRJQUxJWkVEJyk7XG5cbiAgICAgICAgcmV0dXJuIHV0bWUubG9hZFNldHRpbmdzKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgc3RhdGUudGVzdFNlcnZlciA9IGdldFBhcmFtZXRlckJ5TmFtZShcInV0bWVfdGVzdF9zZXJ2ZXJcIik7XG4gICAgICAgICAgICAgIHN0YXRlLmF1dG9SdW4gPSB0cnVlO1xuICAgICAgICAgICAgICB1dG1lLnJ1blNjZW5hcmlvKHNjZW5hcmlvKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiUExBWUlOR1wiKSB7XG4gICAgICAgICAgICAgIHJ1bk5leHRTdGVwKHN0YXRlLnJ1bi5zY2VuYXJpbywgc3RhdGUucnVuLnN0ZXBJbmRleCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFzdGF0ZS5zdGF0dXMgfHwgc3RhdGUuc3RhdHVzID09PSAnSU5JVElBTElaSU5HJykge1xuICAgICAgICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIkxPQURFRFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGJyb2FkY2FzdDogZnVuY3Rpb24gKGV2dCwgZXZ0RGF0YSkge1xuICAgICAgICBpZiAobGlzdGVuZXJzICYmIGxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzW2ldKGV2dCwgZXZ0RGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHN0YXJ0UmVjb3JkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zdGF0dXMgIT0gJ1JFQ09SRElORycpIHtcbiAgICAgICAgICAgIHN0YXRlLnN0YXR1cyA9ICdSRUNPUkRJTkcnO1xuICAgICAgICAgICAgc3RhdGUuc3RlcHMgPSBbXTtcbiAgICAgICAgICAgIHV0bWUucmVwb3J0TG9nKFwiUmVjb3JkaW5nIFN0YXJ0ZWRcIik7XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUkVDT1JESU5HX1NUQVJURUQnKTtcbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudChcImxvYWRcIiwge1xuICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogd2luZG93LmxvY2F0aW9uLnByb3RvY29sLFxuICAgICAgICAgICAgICAgICAgICBob3N0OiB3aW5kb3cubG9jYXRpb24uaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiB3aW5kb3cubG9jYXRpb24uc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBoYXNoOiB3aW5kb3cubG9jYXRpb24uaGFzaFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJ1blNjZW5hcmlvOiBmdW5jdGlvbiAobmFtZSwgY29uZmlnKSB7XG4gICAgICAgIHZhciB0b1J1biA9IG5hbWUgfHwgcHJvbXB0KCdTY2VuYXJpbyB0byBydW4nKTtcbiAgICAgICAgdmFyIGF1dG9SdW4gPSAhbmFtZSA/IHByb21wdCgnV291bGQgeW91IGxpa2UgdG8gc3RlcCB0aHJvdWdoIGVhY2ggc3RlcCAoeXxuKT8nKSAhPSAneScgOiB0cnVlO1xuICAgICAgICByZXR1cm4gZ2V0U2NlbmFyaW8odG9SdW4pLnRoZW4oZnVuY3Rpb24gKHNjZW5hcmlvKSB7XG4gICAgICAgICAgICBzY2VuYXJpbyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2NlbmFyaW8pKTtcbiAgICAgICAgICAgIHNldHVwQ29uZGl0aW9ucyhzY2VuYXJpbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUucnVuID0ge307XG4gICAgICAgICAgICAgICAgc3RhdGUuYXV0b1J1biA9IGF1dG9SdW4gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgc3RhdGUuc3RhdHVzID0gXCJQTEFZSU5HXCI7XG5cbiAgICAgICAgICAgICAgICBzY2VuYXJpby5zdGVwcyA9IGZpbHRlckV4dHJhTG9hZHMoc2NlbmFyaW8uc3RlcHMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwidmVyYm9zZVwiKSkge1xuICAgICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJTdGFydGluZyBTY2VuYXJpbyAnXCIgKyBuYW1lICsgXCInXCIsIHNjZW5hcmlvKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUExBWUJBQ0tfU1RBUlRFRCcpO1xuXG4gICAgICAgICAgICAgICAgcnVuU3RlcChzY2VuYXJpbywgMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBydW5OZXh0U3RlcDogcnVuTmV4dFN0ZXAsXG4gICAgc3RvcFNjZW5hcmlvOiBmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICB2YXIgc2NlbmFyaW8gPSBzdGF0ZS5ydW4gJiYgc3RhdGUucnVuLnNjZW5hcmlvO1xuICAgICAgICBkZWxldGUgc3RhdGUucnVuO1xuICAgICAgICBzdGF0ZS5zdGF0dXMgPSBcIkxPQURFRFwiO1xuICAgICAgICB1dG1lLmJyb2FkY2FzdCgnUExBWUJBQ0tfU1RPUFBFRCcpO1xuXG4gICAgICAgIGlmICh1dG1lLnN0YXRlLnNldHRpbmdzLmdldChcInZlcmJvc2VcIikpIHtcbiAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0b3BwaW5nIFNjZW5hcmlvXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzY2VuYXJpbykge1xuICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydFN1Y2Nlc3MoXCJbU1VDQ0VTU10gU2NlbmFyaW8gJ1wiICsgc2NlbmFyaW8ubmFtZSArIFwiJyBDb21wbGV0ZWQhXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dG1lLnJlcG9ydExvZyhcIlN0b3BwaW5nIG9uIHBhZ2UgXCIgKyB3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgICAgICAgICAgICAgdXRtZS5yZXBvcnRFcnJvcihcIltGQUlMVVJFXSBTY2VuYXJpbyAnXCIgKyBzY2VuYXJpby5uYW1lICsgXCInIFN0b3BwZWQhXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSB0ZW1wb3JhcnkgZWxlbWVudCBsb2NhdG9yLCBmb3IgdXNlIHdpdGggZmluYWxpemVMb2NhdG9yXG4gICAgICovXG4gICAgY3JlYXRlRWxlbWVudExvY2F0b3I6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciB1bmlxdWVJZCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS11bmlxdWUtaWRcIikgfHwgZ3VpZCgpO1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShcImRhdGEtdW5pcXVlLWlkXCIsIHVuaXF1ZUlkKTtcblxuICAgICAgICB2YXIgZWxlSHRtbCA9IGVsZW1lbnQuY2xvbmVOb2RlKCkub3V0ZXJIVE1MO1xuICAgICAgICB2YXIgZWxlU2VsZWN0b3JzID0gW107XG4gICAgICAgIGlmIChlbGVtZW50LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PSAnQk9EWScgfHwgZWxlbWVudC50YWdOYW1lLnRvVXBwZXJDYXNlKCkgPT0gJ0hUTUwnKSB7XG4gICAgICAgICAgICBlbGVTZWxlY3RvcnMgPSBbZWxlbWVudC50YWdOYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZVNlbGVjdG9ycyA9IHNlbGVjdG9yRmluZGVyKGVsZW1lbnQsIGRvY3VtZW50LmJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1bmlxdWVJZDogdW5pcXVlSWQsXG4gICAgICAgICAgICBzZWxlY3RvcnM6IGVsZVNlbGVjdG9yc1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICByZWdpc3RlckV2ZW50OiBmdW5jdGlvbiAoZXZlbnROYW1lLCBkYXRhLCBpZHgpIHtcbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSB8fCB1dG1lLmlzVmFsaWRhdGluZygpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlkeCA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGlkeCA9IHV0bWUuc3RhdGUuc3RlcHMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGUuc3RlcHNbaWR4XSA9IHtcbiAgICAgICAgICAgICAgICBldmVudE5hbWU6IGV2ZW50TmFtZSxcbiAgICAgICAgICAgICAgICB0aW1lU3RhbXA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB1dG1lLmJyb2FkY2FzdCgnRVZFTlRfUkVHSVNURVJFRCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRMb2c6IGZ1bmN0aW9uIChsb2csIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5sb2cobG9nLCBzY2VuYXJpbywgdXRtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9ydEVycm9yOiBmdW5jdGlvbiAoZXJyb3IsIHNjZW5hcmlvKSB7XG4gICAgICAgIGlmIChyZXBvcnRIYW5kbGVycyAmJiByZXBvcnRIYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwb3J0SGFuZGxlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXBvcnRIYW5kbGVyc1tpXS5lcnJvcihlcnJvciwgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvcnRTdWNjZXNzOiBmdW5jdGlvbiAobWVzc2FnZSwgc2NlbmFyaW8pIHtcbiAgICAgICAgaWYgKHJlcG9ydEhhbmRsZXJzICYmIHJlcG9ydEhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBvcnRIYW5kbGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJlcG9ydEhhbmRsZXJzW2ldLnN1Y2Nlc3MobWVzc2FnZSwgc2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZWdpc3Rlckxpc3RlbmVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBsaXN0ZW5lcnMucHVzaChoYW5kbGVyKTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyU2F2ZUhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHNhdmVIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJSZXBvcnRIYW5kbGVyOiBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICByZXBvcnRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJMb2FkSGFuZGxlcjogZnVuY3Rpb24gKGhhbmRsZXIsIG9yZGVyKSB7XG4gICAgICAgIG9yZGVyID0gdHlwZW9mIG9yZGVyICE9PSBcInVuZGVmaW5lZFwiID8gb3JkZXIgOiBsb2FkSGFuZGxlcnMubGVuZ3RoO1xuICAgICAgICBpZiAobG9hZEhhbmRsZXJzLmxlbmd0aCA+IG9yZGVyKSB7XG4gICAgICAgICAgICBsb2FkSGFuZGxlcnMuc3BsaWNlKG9yZGVyLCAwLCBoYW5kbGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvYWRIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZWdpc3RlclNldHRpbmdzTG9hZEhhbmRsZXI6IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHNldHRpbmdzTG9hZEhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfSxcbiAgICBpc1JlY29yZGluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiUkVDT1JESU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgaXNQbGF5aW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0bWUuc3RhdGUuc3RhdHVzLmluZGV4T2YoXCJQTEFZSU5HXCIpID09PSAwO1xuICAgIH0sXG4gICAgaXNWYWxpZGF0aW5nOiBmdW5jdGlvbih2YWxpZGF0aW5nKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsaWRhdGluZyAhPT0gJ3VuZGVmaW5lZCcgJiYgKHV0bWUuaXNSZWNvcmRpbmcoKSB8fCB1dG1lLmlzVmFsaWRhdGluZygpKSkge1xuICAgICAgICAgICAgdXRtZS5zdGF0ZS5zdGF0dXMgPSB2YWxpZGF0aW5nID8gXCJWQUxJREFUSU5HXCIgOiBcIlJFQ09SRElOR1wiO1xuICAgICAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1ZBTElEQVRJT05fQ0hBTkdFRCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1dG1lLnN0YXRlLnN0YXR1cy5pbmRleE9mKFwiVkFMSURBVElOR1wiKSA9PT0gMDtcbiAgICB9LFxuICAgIHN0b3BSZWNvcmRpbmc6IGZ1bmN0aW9uIChpbmZvKSB7XG4gICAgICAgIGlmIChpbmZvICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdmFyIG5ld1NjZW5hcmlvID0ge1xuICAgICAgICAgICAgICAgIHN0ZXBzOiBzdGF0ZS5zdGVwc1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgXy5leHRlbmQobmV3U2NlbmFyaW8sIGluZm8pO1xuXG4gICAgICAgICAgICBpZiAoIW5ld1NjZW5hcmlvLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBuZXdTY2VuYXJpby5uYW1lID0gcHJvbXB0KCdFbnRlciBzY2VuYXJpbyBuYW1lJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChuZXdTY2VuYXJpby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2NlbmFyaW9zLnB1c2gobmV3U2NlbmFyaW8pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVIYW5kbGVycyAmJiBzYXZlSGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2F2ZUhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlSGFuZGxlcnNbaV0obmV3U2NlbmFyaW8sIHV0bWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuc3RhdHVzID0gJ0xPQURFRCc7XG5cbiAgICAgICAgdXRtZS5icm9hZGNhc3QoJ1JFQ09SRElOR19TVE9QUEVEJyk7XG5cbiAgICAgICAgdXRtZS5yZXBvcnRMb2coXCJSZWNvcmRpbmcgU3RvcHBlZFwiLCBuZXdTY2VuYXJpbyk7XG4gICAgfSxcblxuICAgIGxvYWRTZXR0aW5nczogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSB1dG1lLnN0YXRlLnNldHRpbmdzID0gdXRtZS5zdGF0ZS5zZXR0aW5ncyB8fCBuZXcgU2V0dGluZ3Moe1xuICAgICAgICAgIFwicnVubmVyLnNwZWVkXCI6IFwiMTBcIlxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNldHRpbmdzTG9hZEhhbmRsZXJzLmxlbmd0aCA+IDAgJiYgIXV0bWUuaXNSZWNvcmRpbmcoKSAmJiAhdXRtZS5pc1BsYXlpbmcoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5nc0xvYWRIYW5kbGVyc1swXShmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5zZXREZWZhdWx0cyhyZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShzZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbG9hZFN0YXRlRnJvbVN0b3JhZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHV0bWVTdGF0ZVN0ciA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd1dG1lJyk7XG4gICAgICAgIGlmICh1dG1lU3RhdGVTdHIpIHtcbiAgICAgICAgICAgIHN0YXRlID0gSlNPTi5wYXJzZSh1dG1lU3RhdGVTdHIpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdGUuc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3U2V0dGluZ3MgPSBuZXcgU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICBuZXdTZXR0aW5ncy5zZXR0aW5ncyA9IHN0YXRlLnNldHRpbmdzLnNldHRpbmdzO1xuICAgICAgICAgICAgICAgIG5ld1NldHRpbmdzLnNldHRpbmdzID0gc3RhdGUuc2V0dGluZ3MuZGVmYXVsdFNldHRpbmdzO1xuICAgICAgICAgICAgICAgIHN0YXRlLnNldHRpbmdzID0gbmV3U2V0dGluZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwiSU5JVElBTElaSU5HXCIsXG4gICAgICAgICAgICAgICAgc2NlbmFyaW9zOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSxcblxuICAgIHNhdmVTdGF0ZVRvU3RvcmFnZTogZnVuY3Rpb24gKHV0bWVTdGF0ZSkge1xuICAgICAgICBpZiAodXRtZVN0YXRlKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndXRtZScsIEpTT04uc3RyaW5naWZ5KHV0bWVTdGF0ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3V0bWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB1bmxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXRtZS5zYXZlU3RhdGVUb1N0b3JhZ2Uoc3RhdGUpO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHRvZ2dsZUhpZ2hsaWdodChlbGUsIHZhbHVlKSB7XG4gICAgJChlbGUpLnRvZ2dsZUNsYXNzKCd1dG1lLXZlcmlmeScsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gdG9nZ2xlUmVhZHkoZWxlLCB2YWx1ZSkge1xuICAgICQoZWxlKS50b2dnbGVDbGFzcygndXRtZS1yZWFkeScsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBJZiB5b3UgY2xpY2sgb24gYSBzcGFuIGluIGEgbGFiZWwsIHRoZSBzcGFuIHdpbGwgY2xpY2ssXG4gKiB0aGVuIHRoZSBicm93c2VyIHdpbGwgZmlyZSB0aGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBpbnB1dCBjb250YWluZWQgd2l0aGluIHRoZSBzcGFuLFxuICogU28sIHdlIG9ubHkgd2FudCB0byB0cmFjayB0aGUgaW5wdXQgY2xpY2tzLlxuICovXG5mdW5jdGlvbiBpc05vdEluTGFiZWxPclZhbGlkKGVsZSkge1xuICAgIHJldHVybiAkKGVsZSkucGFyZW50cygnbGFiZWwnKS5sZW5ndGggPT0gMCB8fFxuICAgICAgICAgIGVsZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09ICdpbnB1dCc7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGl0IGlzIGFuIGVsZW1lbnQgdGhhdCBzaG91bGQgYmUgaWdub3JlZFxuICovXG5mdW5jdGlvbiBpc0lnbm9yZWRFbGVtZW50KGVsZSkge1xuICByZXR1cm4gIWVsZS5oYXNBdHRyaWJ1dGUgfHwgZWxlLmhhc0F0dHJpYnV0ZSgnZGF0YS1pZ25vcmUnKSB8fCAkKGVsZSkucGFyZW50cyhcIltkYXRhLWlnbm9yZV1cIikubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIGV2ZW50IHNob3VsZCBiZSByZWNvcmRlZCBvbiB0aGUgZ2l2ZW4gZWxlbWVudFxuICovXG5mdW5jdGlvbiBzaG91bGRSZWNvcmRFdmVudChlbGUsIGV2dCkge1xuICB2YXIgc2V0dGluZyA9IHV0bWUuc3RhdGUuc2V0dGluZ3MuZ2V0KFwicmVjb3JkZXIuZXZlbnRzLlwiICsgZXZ0KTtcbiAgdmFyIGlzU2V0dGluZ1RydWUgPSAoc2V0dGluZyA9PT0gdHJ1ZSB8fCBzZXR0aW5nID09PSAndHJ1ZScgfHwgdHlwZW9mIHNldHRpbmcgPT09ICd1bmRlZmluZWQnKTtcbiAgcmV0dXJuIHV0bWUuaXNSZWNvcmRpbmcoKSAmJiBpc1NldHRpbmdUcnVlICYmIGlzTm90SW5MYWJlbE9yVmFsaWQoZWxlKTtcbn1cblxudmFyIHRpbWVycyA9IFtdO1xuXG5mdW5jdGlvbiBpbml0RXZlbnRIYW5kbGVycygpIHtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRzW2ldLCAoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFpc0lnbm9yZWRFbGVtZW50KGUudGFyZ2V0KSAmJiB1dG1lLmlzUmVjb3JkaW5nKCkpIHtcblxuICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSB1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgbGFzdFN0ZXAgPSB1dG1lLnN0YXRlLnN0ZXBzW2lkeCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRvcjogdXRtZS5jcmVhdGVFbGVtZW50TG9jYXRvcihlLnRhcmdldClcbiAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgIHZhciB0aW1lcjtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChldnQgPT0gJ21vdXNlb3ZlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZS50YXJnZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lcjogc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlUmVhZHkoZS50YXJnZXQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhpZ2hsaWdodChlLnRhcmdldCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgNTAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0ID09ICdtb3VzZW91dCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aW1lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aW1lcnNbaV0uZWxlbWVudCA9PSBlLnRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcnNbaV0udGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSGlnaGxpZ2h0KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlYWR5KGUudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHNob3VsZFJlY29yZEV2ZW50KGUudGFyZ2V0LCBldnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCB8fCBlLmJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLmJ1dHRvbiA9IGUud2hpY2ggfHwgZS5idXR0b247XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsaWNrIGJlY2F1c2UgY2hhbmdlIGZpcmVzIGZpcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldnQgPT09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MuYXR0cmlidXRlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhbHVlXCIgOiBlLnRhcmdldC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImNoZWNrZWRcIjogZS50YXJnZXQuY2hlY2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoZXZ0LCBhcmdzLCBpZHgpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgICh1dG1lLmV2ZW50TGlzdGVuZXJzID0gdXRtZS5ldmVudExpc3RlbmVycyB8fCB7fSlbZXZ0XSA9IGhhbmRsZXI7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgICAgfSkoZXZlbnRzW2ldKSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgdmFyIF90b19hc2NpaSA9IHtcbiAgICAgICAgJzE4OCc6ICc0NCcsXG4gICAgICAgICcxODknOiAnNDUnLFxuICAgICAgICAnMTkwJzogJzQ2JyxcbiAgICAgICAgJzE5MSc6ICc0NycsXG4gICAgICAgICcxOTInOiAnOTYnLFxuICAgICAgICAnMjIwJzogJzkyJyxcbiAgICAgICAgJzIyMic6ICczOScsXG4gICAgICAgICcyMjEnOiAnOTMnLFxuICAgICAgICAnMjE5JzogJzkxJyxcbiAgICAgICAgJzE3Myc6ICc0NScsXG4gICAgICAgICcxODcnOiAnNjEnLCAvL0lFIEtleSBjb2Rlc1xuICAgICAgICAnMTg2JzogJzU5J1xuICAgIH07XG5cbiAgICB2YXIgc2hpZnRVcHMgPSB7XG4gICAgICAgIFwiOTZcIjogXCJ+XCIsXG4gICAgICAgIFwiNDlcIjogXCIhXCIsXG4gICAgICAgIFwiNTBcIjogXCJAXCIsXG4gICAgICAgIFwiNTFcIjogXCIjXCIsXG4gICAgICAgIFwiNTJcIjogXCIkXCIsXG4gICAgICAgIFwiNTNcIjogXCIlXCIsXG4gICAgICAgIFwiNTRcIjogXCJeXCIsXG4gICAgICAgIFwiNTVcIjogXCImXCIsXG4gICAgICAgIFwiNTZcIjogXCIqXCIsXG4gICAgICAgIFwiNTdcIjogXCIoXCIsXG4gICAgICAgIFwiNDhcIjogXCIpXCIsXG4gICAgICAgIFwiNDVcIjogXCJfXCIsXG4gICAgICAgIFwiNjFcIjogXCIrXCIsXG4gICAgICAgIFwiOTFcIjogXCJ7XCIsXG4gICAgICAgIFwiOTNcIjogXCJ9XCIsXG4gICAgICAgIFwiOTJcIjogXCJ8XCIsXG4gICAgICAgIFwiNTlcIjogXCI6XCIsXG4gICAgICAgIFwiMzlcIjogXCJcXFwiXCIsXG4gICAgICAgIFwiNDRcIjogXCI8XCIsXG4gICAgICAgIFwiNDZcIjogXCI+XCIsXG4gICAgICAgIFwiNDdcIjogXCI/XCJcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24ga2V5UHJlc3NIYW5kbGVyIChlKSB7XG4gICAgICAgIGlmIChlLmlzVHJpZ2dlcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoIWlzSWdub3JlZEVsZW1lbnQoZS50YXJnZXQpICYmIHNob3VsZFJlY29yZEV2ZW50KGUudGFyZ2V0LCBcImtleXByZXNzXCIpKSB7XG4gICAgICAgICAgICB2YXIgYyA9IGUud2hpY2g7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IERvZXNuJ3Qgd29yayB3aXRoIGNhcHMgbG9ja1xuICAgICAgICAgICAgLy9ub3JtYWxpemUga2V5Q29kZVxuICAgICAgICAgICAgaWYgKF90b19hc2NpaS5oYXNPd25Qcm9wZXJ0eShjKSkge1xuICAgICAgICAgICAgICAgIGMgPSBfdG9fYXNjaWlbY107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZS5zaGlmdEtleSAmJiAoYyA+PSA2NSAmJiBjIDw9IDkwKSkge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgKyAzMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgc2hpZnRVcHMuaGFzT3duUHJvcGVydHkoYykpIHtcbiAgICAgICAgICAgICAgICAvL2dldCBzaGlmdGVkIGtleUNvZGUgdmFsdWVcbiAgICAgICAgICAgICAgICBjID0gc2hpZnRVcHNbY107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyRXZlbnQoJ2tleXByZXNzJywge1xuICAgICAgICAgICAgICAgIGxvY2F0b3I6IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZS50YXJnZXQpLFxuICAgICAgICAgICAgICAgIGtleTogYyxcbiAgICAgICAgICAgICAgICBwcmV2VmFsdWU6IGUudGFyZ2V0LnZhbHVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlLnRhcmdldC52YWx1ZSArIGMsXG4gICAgICAgICAgICAgICAga2V5Q29kZTogZS5rZXlDb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywga2V5UHJlc3NIYW5kbGVyLCB0cnVlKTtcblxuICAgIC8vIEhBQ0sgZm9yIHRlc3RpbmdcbiAgICAodXRtZS5ldmVudExpc3RlbmVycyA9IHV0bWUuZXZlbnRMaXN0ZW5lcnMgfHwge30pWydrZXlwcmVzcyddID0ga2V5UHJlc3NIYW5kbGVyO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJCeU5hbWUobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59XG5cbmZ1bmN0aW9uIGJvb3RzdHJhcFV0bWUoKSB7XG4gIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09IFwiY29tcGxldGVcIikge1xuICAgIHV0bWUuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGluaXRFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgaWYgKHV0bWUuaXNSZWNvcmRpbmcoKSkge1xuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHdpbmRvdy5sb2NhdGlvbi5ob3N0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gsXG4gICAgICAgICAgICAgICAgICAgIGhhc2g6IHdpbmRvdy5sb2NhdGlvbi5oYXNoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5ib290c3RyYXBVdG1lKCk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgYm9vdHN0cmFwVXRtZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdXRtZS51bmxvYWQoKTtcbn0sIHRydWUpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdXRtZS5yZXBvcnRMb2coXCJTY3JpcHQgRXJyb3I6IFwiICsgZXJyLm1lc3NhZ2UgKyBcIjpcIiArIGVyci51cmwgKyBcIixcIiArIGVyci5saW5lICsgXCI6XCIgKyBlcnIuY29sKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0bWU7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaUwyaHZiV1V2WkdGMmFXUjBhWFIwYzNkdmNuUm9MM0J5YjJwbFkzUnpMM1YwYldVdmMzSmpMMnB6TDNWMGJXVXVhbk1pTENKemIzVnlZMlZ6SWpwYklpOW9iMjFsTDJSaGRtbGtkR2wwZEhOM2IzSjBhQzl3Y205cVpXTjBjeTkxZEcxbEwzTnlZeTlxY3k5MWRHMWxMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQkxFbEJRVWtzUTBGQlF5eEhRVUZITEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRCUVVNelFpeEpRVUZKTEU5QlFVOHNSMEZCUnl4UFFVRlBMRU5CUVVNc1lVRkJZU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETzBGQlF6ZERMRWxCUVVrc1VVRkJVU3hIUVVGSExFOUJRVThzUTBGQlF5eFpRVUZaTEVOQlFVTXNRMEZCUXp0QlFVTnlReXhKUVVGSkxHTkJRV01zUjBGQlJ5eFBRVUZQTEVOQlFVTXNhMEpCUVd0Q0xFTkJRVU1zUTBGQlF6dEJRVU5xUkN4SlFVRkpMRkZCUVZFc1IwRkJSeXhQUVVGUExFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVTTdPMEZCUlhKRExHZEVRVUZuUkR0QlFVTm9SQ3hKUVVGSkxHMUNRVUZ0UWl4SFFVRkhMRWRCUVVjc1EwRkJRenRCUVVNNVFpeEpRVUZKTEZsQlFWa3NSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRkRUlzU1VGQlNTeGpRVUZqTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTNoQ0xFbEJRVWtzV1VGQldTeEhRVUZITEVWQlFVVXNRMEZCUXp0QlFVTjBRaXhKUVVGSkxHOUNRVUZ2UWl4SFFVRkhMRVZCUVVVc1EwRkJRenM3UVVGRk9VSXNVMEZCVXl4WFFVRlhMRU5CUVVNc1NVRkJTU3hGUVVGRk8wbEJRM1pDTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrc1dVRkJXU3hEUVVGRExFMUJRVTBzUzBGQlN5eERRVUZETEVWQlFVVTdXVUZETTBJc1NVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1MwRkJTeXhEUVVGRExGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRemRETEVsQlFVa3NTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEpRVUZKTEV0QlFVc3NTVUZCU1N4RlFVRkZPMjlDUVVOc1F5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzJsQ1FVTXZRanRoUVVOS08xTkJRMG9zVFVGQlRUdFpRVU5JTEZsQlFWa3NRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJReXhKUVVGSkxFVkJRVVVzVlVGQlZTeEpRVUZKTEVWQlFVVTdaMEpCUTJ4RExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0aFFVTnFRaXhEUVVGRExFTkJRVU03VTBGRFRqdExRVU5LTEVOQlFVTXNRMEZCUXp0RFFVTk9PMEZCUTBRc1NVRkJTU3hWUVVGVkxFZEJRVWNzUzBGQlN5eERRVUZET3p0QlFVVjJRaXhKUVVGSkxFMUJRVTBzUjBGQlJ6dEpRVU5VTEU5QlFVODdTVUZEVUN4UFFVRlBPMGxCUTFBc1RVRkJUVHRCUVVOV0xFbEJRVWtzVlVGQlZUdEJRVU5rTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkJSVUVzU1VGQlNTeFhRVUZYT3p0SlFVVllMRmxCUVZrN1NVRkRXaXhaUVVGWk8wbEJRMW9zVlVGQlZUdEpRVU5XTEZkQlFWYzdTVUZEV0N4VFFVRlRPMEZCUTJJc1NVRkJTU3hSUVVGUk8wRkJRMW83TzBGQlJVRXNRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWVVGQllTeERRVUZETEZGQlFWRXNSVUZCUlN4aFFVRmhMRVZCUVVVN1JVRkRPVU1zU1VGQlNTeExRVUZMTEVkQlFVY3NVVUZCVVN4RFFVRkRMR0ZCUVdFc1EwRkJReXhEUVVGRE8wRkJRM1JETEVWQlFVVXNTVUZCU1N4VFFVRlRMRWRCUVVjc1MwRkJTeXhKUVVGSkxFdEJRVXNzUTBGQlF5eFRRVUZUTEVOQlFVTTdPMFZCUlhwRExFbEJRVWtzVTBGQlV5eEZRVUZGTzBsQlEySXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNVMEZCVXl4RlFVRkZMRlZCUVZVc1dVRkJXU3hGUVVGRk8wMUJRekZFTEU5QlFVOHNWMEZCVnl4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEdGQlFXRXNSVUZCUlR0UlFVTTNSQ3hoUVVGaExFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHRkJRV0VzUTBGQlF5eERRVUZETEVOQlFVTTdVVUZETVVRc1QwRkJUeXhsUVVGbExFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRmxCUVZrN1ZVRkRja1FzU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMVZCUTJ4Q0xFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhoUVVGaExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRaUVVOdVJDeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMR0ZCUVdFc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0WFFVTjJRenRWUVVORUxFOUJRVThzVVVGQlVTeERRVUZETzFOQlEycENMRU5CUVVNc1EwRkJRenRQUVVOS0xFTkJRVU1zUTBGQlF6dExRVU5LTEVOQlFVTXNRMEZCUXl4RFFVRkRPMGRCUTB3c1RVRkJUVHRKUVVOTUxFOUJRVThzVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RlFVRkZMRU5CUVVNc1EwRkJRenRIUVVNMVFqdEJRVU5JTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhuUWtGQlowSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRia01zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8wRkJRekZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhwUWtGQmFVSXNSVUZCUlN4UlFVRlJMRVZCUVVVN1JVRkRjRU1zVDBGQlR5eGhRVUZoTEVOQlFVTXNVVUZCVVN4RlFVRkZMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRelZETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXgzUWtGQmQwSXNRMEZCUXl4TFFVRkxMRVZCUVVVN1NVRkRja01zU1VGQlNTeFJRVUZSTEVkQlFVY3NSVUZCUlN4RFFVRkRPMGxCUTJ4Q0xFbEJRVWtzWjBKQlFXZENMRU5CUVVNN1NVRkRja0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1VVRkRia01zU1VGQlNTeFRRVUZUTEVkQlFVY3NTMEZCU3l4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRE8xRkJRM3BDTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSVHRaUVVOUUxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVOdVF5eEpRVUZKTEVsQlFVa3NSMEZCUnl4VFFVRlRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEzaENMRWxCUVVrc1NVRkJTU3hIUVVGSExFTkJRVU1zUjBGQlJ5eERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhGUVVGRkxFTkJRVU03WjBKQlEzQkZMR2RDUVVGblFpeEpRVUZKTEVsQlFVa3NRMEZCUXp0blFrRkRla0lzVTBGQlV5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRk5CUVZNc1IwRkJSeXhuUWtGQlowSXNRMEZCUXp0aFFVTTNRenRUUVVOS0xFMUJRVTA3V1VGRFNDeG5Ra0ZCWjBJc1IwRkJSeXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTXNVMEZCVXl4RFFVRkRPMU5CUXpkRE8xRkJRMFFzVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03UzBGRGVrTTdTVUZEUkN4UFFVRlBMRkZCUVZFc1EwRkJRenRCUVVOd1FpeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hGUVVGRkxGRkJRVkVzUlVGQlJUdEpRVU5vUXl4SlFVRkpMRkZCUVZFc1IwRkJSeXhGUVVGRkxFTkJRVU03U1VGRGJFSXNUMEZCVHl4UFFVRlBMRU5CUVVNc1IwRkJSeXhEUVVGRE8xRkJRMllzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRE8xRkJRekZDTEdsQ1FVRnBRaXhEUVVGRExGRkJRVkVzUTBGQlF6dExRVU01UWl4RFFVRkRMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzVlVGQlZTeEZRVUZGTzFGQlF6RkNMRWxCUVVrc1UwRkJVeXhIUVVGSExGVkJRVlVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETEVWQlFVVXNWVUZCVlN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03VVVGRGRFVXNVVUZCVVN4RFFVRkRMRXRCUVVzc1IwRkJSeXgzUWtGQmQwSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJRenRMUVVONFJDeERRVUZETEVOQlFVTTdRVUZEVUN4RFFVRkRPenRCUVVWRUxGTkJRVk1zVDBGQlR5eERRVUZETEZGQlFWRXNSVUZCUlN4SFFVRkhMRVZCUVVVc1RVRkJUU3hGUVVGRk8wbEJRM0JETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1kwRkJZeXhEUVVGRExFTkJRVU03UVVGRGJrTXNTVUZCU1N4TlFVRk5MRWRCUVVjc1RVRkJUU3hKUVVGSkxFVkJRVVVzUTBGQlF6czdTVUZGZEVJc1NVRkJTU3hKUVVGSkxFZEJRVWNzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJRenRKUVVNdlFpeEpRVUZKTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRE8wbEJRM1pDTEVsQlFVa3NTVUZCU1N4SlFVRkpMRXRCUVVzc1EwRkJReXhOUVVGTkxFbEJRVWtzVTBGQlV5eEZRVUZGTzFGQlEyNURMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVVVGQlVTeEhRVUZITEZGQlFWRXNRMEZCUXp0UlFVTTVRaXhMUVVGTExFTkJRVU1zUjBGQlJ5eERRVUZETEZOQlFWTXNSMEZCUnl4SFFVRkhMRU5CUVVNN1VVRkRNVUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwc1JVRkJSVHRaUVVNeFFpeEpRVUZKTEZkQlFWY3NSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4SFFVRkhMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXp0WlFVTnlSU3hKUVVGSkxFMUJRVTBzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhOUVVGTkxFTkJRVU03UVVGRE9VTXNXVUZCV1N4SlFVRkpMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4SlFVRkpMRU5CUVVNN08xbEJSVGxDTEVsQlFVa3NUVUZCVFN4SlFVRkpMRU5CUVVNc1RVRkJUU3hEUVVGRExFMUJRVTBzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRMMElzVFVGQlRTeEhRVUZITEVkQlFVY3NSMEZCUnl4TlFVRk5MRU5CUVVNN1lVRkRla0k3V1VGRFJDeEpRVUZKTEZOQlFWTXNSMEZCUnl4RFFVRkRMRkZCUVZFc1EwRkJReXhSUVVGUkxFZEJRVWNzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4SlFVRkpMRWRCUVVjc1VVRkJVU3hEUVVGRExFMUJRVTBzVDBGQlR5eFhRVUZYTEVkQlFVY3NUVUZCVFN4RFFVRkRMRU5CUVVNN1FVRkRjRWdzV1VGQldTeE5RVUZOTEVOQlFVTXNVVUZCVVN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFZEJRVWNzU1VGQlNTeEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPenRaUVVWeVJDeEpRVUZKTEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1VVRkJVU3hEUVVGRExFZEJRVWNzUTBGQlF5eFRRVUZUTEVOQlFVTXNSVUZCUlR0alFVTjBReXhQUVVGUExFTkJRVU1zUjBGQlJ5eEZRVUZGTEZGQlFWRXNRMEZCUXl4UlFVRlJMRWRCUVVjc1VVRkJVU3hEUVVGRExFbEJRVWtzUjBGQlJ5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNN1kwRkRia1VzVDBGQlR5eERRVUZETEVkQlFVY3NSVUZCUlN4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zU1VGQlNTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETzBGQlEyaEhMR0ZCUVdFN1FVRkRZanRCUVVOQk96dFpRVVZaTEVsQlFVa3NVMEZCVXl4RlFVRkZPMmRDUVVOWUxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNUVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8wRkJRemRETEdGQlFXRTdPMU5CUlVvc1RVRkJUU3hKUVVGSkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVsQlFVa3NVMEZCVXl4RlFVRkZPMWxCUTNCRExFbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRaaXhYUVVGWExFTkJRVU1zVVVGQlVTeEZRVUZGTEVkQlFVY3NSVUZCUlN4TlFVRk5MRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVOQlFVTXNRMEZCUXp0aFFVTjRSRHRUUVVOS0xFMUJRVTA3V1VGRFNDeEpRVUZKTEU5QlFVOHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF6dFpRVU5vUXl4SlFVRkpMRXRCUVVzc1IwRkJSeXhSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZETzBGQlEzWkRMRmxCUVZrc1NVRkJTU3hSUVVGUkxFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1NVRkJTU3hEUVVGRExFTkJRVU03UVVGRGNrUTdPMWxCUlZrc1NVRkJTU3hQUVVGUExFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1N4WFFVRlhMRWxCUVVrc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eFJRVUZSTEVOQlFVTXNSMEZCUnl4RFFVRkRMR05CUVdNc1EwRkJReXhKUVVGSkxGVkJRVlVzUlVGQlJUdGpRVU51Unl4SlFVRkpMRWxCUVVrc1EwRkJRenRqUVVOVUxFbEJRVWtzVFVGQlRTeEhRVUZITEV0QlFVc3NRMEZCUXp0alFVTnVRaXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEV0QlFVc3NRMEZCUXl4TlFVRk5MRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eEhRVUZITEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN1owSkJRek5ETEVsQlFVa3NVMEZCVXl4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dG5Ra0ZEZWtJc1NVRkJTU3hoUVVGaExFZEJRVWNzYlVKQlFXMUNMRU5CUVVNc1UwRkJVeXhEUVVGRExFTkJRVU03WjBKQlEyNUVMRWxCUVVrc1VVRkJVU3hMUVVGTExHRkJRV0VzUlVGQlJUdHJRa0ZET1VJc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJUdHpRa0ZEVUN4SlFVRkpMRWxCUVVrc1UwRkJVeXhEUVVGRExGTkJRVk1zUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNN2MwSkJRemxETEUxQlFVMHNSMEZCUnl4RFFVRkRMR1ZCUVdVc1EwRkJReXhUUVVGVExFTkJRVU1zU1VGQlNTeEpRVUZKTEVkQlFVY3NiVUpCUVcxQ0xFTkJRVU03YlVKQlEzUkZMRTFCUVUwc1NVRkJTU3hwUWtGQmFVSXNRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGNrTXNUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJRenR6UWtGRFppeE5RVUZOTzIxQ1FVTlVPMmxDUVVOR08wRkJRMnBDTEdWQlFXVTdPMk5CUlVRc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEUxQlFVMHNRMEZCUXp0QlFVTjRReXhoUVVGaE8wRkJRMkk3TzFsQlJWa3NTVUZCU1N4TlFVRk5MRU5CUVVNc2JVSkJRVzFDTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNc1JVRkJSVHRuUWtGRGJrTXNWMEZCVnl4RFFVRkRMRkZCUVZFc1JVRkJSU3hIUVVGSExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdZVUZEZEVNc1RVRkJUVHRuUWtGRFNDeHpRa0ZCYzBJc1EwRkJReXhSUVVGUkxFVkJRVVVzU1VGQlNTeEZRVUZGTEU5QlFVOHNSVUZCUlN4VlFVRlZMRU5CUVVNc1VVRkJVU3hGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1NVRkJTU3hGUVVGRk8ydENRVU01Uml4SlFVRkpMRWRCUVVjc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdhMEpCUTJ4Q0xFbEJRVWtzVDBGQlR5eEhRVUZITEVkQlFVY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1YwRkJWeXhGUVVGRkxFTkJRVU03UVVGRE1VUXNhMEpCUVd0Q0xFbEJRVWtzYTBKQlFXdENMRWRCUVVjc1QwRkJUeXhMUVVGTExFOUJRVThzU1VGQlNTeFBRVUZQTEV0QlFVc3NWVUZCVlN4SlFVRkpMRWRCUVVjc1EwRkJReXhaUVVGWkxFTkJRVU1zYVVKQlFXbENMRU5CUVVNc1EwRkJRenM3YTBKQlJUbEhMRWxCUVVrc1RVRkJUU3hEUVVGRExFOUJRVThzUTBGQlF5eEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMRWxCUVVrc1EwRkJReXhGUVVGRk8yOUNRVU4yUXl4SlFVRkpMRTlCUVU4c1IwRkJSeXhGUVVGRkxFTkJRVU03YjBKQlEycENMRWxCUVVrc1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eE5RVUZOTEVWQlFVVTdjMEpCUTNCQ0xFOUJRVThzUTBGQlF5eExRVUZMTEVkQlFVY3NUMEZCVHl4RFFVRkRMRTFCUVUwc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTjRSU3h4UWtGQmNVSTdRVUZEY2tJN08yOUNRVVZ2UWl4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eExRVUZMTEVsQlFVa3NWMEZCVnl4SlFVRkpMRTlCUVU4c1NVRkJTU3hEUVVGRExFbEJRVWtzUTBGQlF5eFZRVUZWTEVsQlFVa3NWMEZCVnl4RlFVRkZPM05DUVVOMlJpeEpRVUZKTEU5QlFVOHNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRlZCUVZVc1IwRkJSeXhGUVVGRkxFOUJRVThzUlVGQlJTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRXRCUVVzc1JVRkJSU3hEUVVGRE8zTkNRVU42Uml4RFFVRkRMRU5CUVVNc1RVRkJUU3hEUVVGRExFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0QlFVTTNReXh4UWtGQmNVSTdRVUZEY2tJN08yOUNRVVZ2UWl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGTkJRVk1zU1VGQlNTeFBRVUZQTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3hOUVVGTkxFdEJRVXNzUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1JVRkJSVHR6UWtGRGJFWXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJTeERRVUZETzBGQlF6VkRMSEZDUVVGeFFpeE5RVUZOTEVsQlFVa3NTVUZCU1N4RFFVRkRMRk5CUVZNc1MwRkJTeXhSUVVGUkxFVkJRVVU3TzNkQ1FVVndReXhKUVVGSkxHdENRVUZyUWl4RlFVRkZPelJDUVVOd1FpeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dDVRa0ZEYUVNN2QwSkJRMFFzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRVZCUVVVc1VVRkJVU3hEUVVGRExFTkJRVU03Y1VKQlEycERMRTFCUVUwN2MwSkJRMHdzVVVGQlVTeERRVUZETEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1EwRkJReXhIUVVGSExFVkJRVVVzVDBGQlR5eERRVUZETEVOQlFVTTdjVUpCUTNoRE8wRkJRM0pDTEcxQ1FVRnRRanM3YTBKQlJVUXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlVzUlVGQlJUdHZRa0ZEYUVNc1NVRkJTU3hIUVVGSExFZEJRVWNzVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eERRVUZETzI5Q1FVTnFSQ3hSUVVGUkxFTkJRVU1zVDBGQlR5eERRVUZETEVkQlFVY3NSVUZCUlN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNdlF5eHZRa0ZCYjBJc1VVRkJVU3hEUVVGRExGRkJRVkVzUTBGQlF5eEhRVUZITEVWQlFVVXNSMEZCUnl4RFFVRkRMRU5CUVVNN08yOUNRVVUxUWl4SFFVRkhMRU5CUVVNc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRPMEZCUTJoRUxHOUNRVUZ2UWl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUlVGQlJTeFJRVUZSTEVOQlFVTXNRMEZCUXpzN2IwSkJSVGxDTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETzI5Q1FVTjZRaXhKUVVGSkxHdENRVUZyUWl4RlFVRkZPM2RDUVVOd1FpeFJRVUZSTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUTBGQlF6dHhRa0ZEYUVNN1FVRkRja0lzYlVKQlFXMUNPenRyUWtGRlJDeEpRVUZKTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1ZVRkJWU3hKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJUdHZRa0ZEZEVVc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eFpRVUZaTEVkQlFVY3NTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhQUVVGUExFTkJRVU1zVTBGQlV5eERRVUZETEVsQlFVa3NhMEpCUVd0Q0xFbEJRVWtzU1VGQlNTeERRVUZETEVsQlFVa3NRMEZCUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhEUVVGRExFTkJRVU03UVVGRGJra3NiVUpCUVcxQ096dHJRa0ZGUkN4SlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGUExFVkJRVVU3YjBKQlEycENMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRPMjFDUVVOd1F6dHBRa0ZEUml4RlFVRkZMRlZCUVZVc1RVRkJUU3hGUVVGRk8yOUNRVU5xUWl4SlFVRkpMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzVlVGQlZTeEZRVUZGTzNOQ1FVTm9ReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEZsQlFWa3NSMEZCUnl4TlFVRk5MRU5CUVVNc1EwRkJRenR6UWtGRGRFTXNTVUZCU1N4RFFVRkRMRmxCUVZrc1EwRkJReXhMUVVGTExFTkJRVU1zUTBGQlF6dHhRa0ZETVVJc1RVRkJUU3hKUVVGSkxHVkJRV1VzUTBGQlF5eEpRVUZKTEVOQlFVTXNSVUZCUlR0M1FrRkRPVUlzU1VGQlNTeERRVUZETEZkQlFWY3NRMEZCUXl4clFrRkJhMElzUjBGQlJ5eEhRVUZITEVkQlFVY3NWMEZCVnl4SFFVRkhMRWxCUVVrc1EwRkJReXhUUVVGVExFZEJRVWNzVjBGQlZ5eEhRVUZITEUxQlFVMHNRMEZCUXl4RFFVRkRPM2RDUVVOcVJ5eEpRVUZKTEVOQlFVTXNXVUZCV1N4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8zRkNRVU0xUWl4TlFVRk5PM05DUVVOTUxFbEJRVWtzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJSeXhEUVVGRExGTkJRVk1zUTBGQlF5eEZRVUZGTzNkQ1FVTjBReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEUxQlFVMHNRMEZCUXl4RFFVRkRPM1ZDUVVONFFqdHpRa0ZEUkN4SlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGUExFVkJRVVU3ZDBKQlEycENMRmRCUVZjc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTEUxQlFVMHNRMEZCUXl4RFFVRkRPM1ZDUVVOd1F6dHhRa0ZEUmp0cFFrRkRTaXhEUVVGRExFTkJRVU03WVVGRFRqdFRRVU5LTzB0QlEwbzdRVUZEVEN4RFFVRkRPenRCUVVWRUxGTkJRVk1zWTBGQll5eERRVUZETEZsQlFWa3NSVUZCUlR0SlFVTnNReXhKUVVGSkxFVkJRVVVzUjBGQlJ5eFJRVUZSTEVOQlFVTXNZVUZCWVN4RFFVRkRMRmxCUVZrc1EwRkJReXhEUVVGRE8wbEJRemxETEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRWxCUVVrN1dVRkRRU3hKUVVGSkxFTkJRVU1zVFVGQlRTeERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRha0lzVFVGQlRTeEpRVUZKTEV0QlFVc3NRMEZCUXl3d1EwRkJNRU1zUTBGQlF5eERRVUZETzJGQlF5OUVPMWxCUTBRc1NVRkJTU3hQUVVGUExFTkJRVU1zWTBGQll5eEZRVUZGTzJkQ1FVTjRRaXhQUVVGUExFTkJRVU1zWTBGQll5eERRVUZETEVWQlFVVXNRMEZCUXl4RFFVRkRMRlZCUVZVc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dGhRVU5zUkN4TlFVRk5PMmRDUVVOSUxFbEJRVWtzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRVZCUVVVc1EwRkJReXhEUVVGRExGRkJRVkVzUlVGQlJTeEZRVUZGTzI5Q1FVTnFReXhOUVVGTkxFbEJRVWtzUzBGQlN5eERRVUZETEdkQ1FVRm5RaXhIUVVGSExGbEJRVmtzUjBGQlJ5eHZRa0ZCYjBJN2QwSkJRMnhGTEhsRFFVRjVReXhEUVVGRExFTkJRVU03YVVKQlEyeEVPMmRDUVVORUxFOUJRVThzUTBGQlF5eFBRVUZQTEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1VVRkJVU3hGUVVGRkxFTkJRVU1zUjBGQlJ5eERRVUZETEZWQlFWVXNRMEZCUXp0blFrRkRPVU1zSzBKQlFTdENMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03WVVGRE5VTTdVMEZEU2l4RFFVRkRMRTlCUVU4c1IwRkJSeXhGUVVGRk8xbEJRMVlzVFVGQlRTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRPMU5CUTJZN1MwRkRTaXhEUVVGRExFTkJRVU03UVVGRFVDeERRVUZET3p0QlFVVkVMRk5CUVZNc1pVRkJaU3hEUVVGRExFbEJRVWtzUlVGQlJUdEpRVU16UWl4UFFVRlBMRWxCUVVrc1EwRkJReXhUUVVGVExFbEJRVWtzV1VGQldUdFhRVU01UWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhKUVVGSkxGVkJRVlU3VjBGRE5VSXNTVUZCU1N4RFFVRkRMRk5CUVZNc1NVRkJTU3haUVVGWk8xZEJRemxDTEVsQlFVa3NRMEZCUXl4VFFVRlRMRWxCUVVrc1YwRkJWenRYUVVNM1FpeEpRVUZKTEVOQlFVTXNVMEZCVXl4SlFVRkpMRTFCUVUwN1YwRkRlRUlzU1VGQlNTeERRVUZETEZOQlFWTXNTVUZCU1N4UFFVRlBMRU5CUVVNN1FVRkRja01zUTBGQlF6czdRVUZGUkRzN1IwRkZSenRCUVVOSUxGTkJRVk1zYVVKQlFXbENMRU5CUVVNc1NVRkJTU3hGUVVGRk8wRkJRMnBETEVsQlFVa3NTVUZCU1N4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF6dEJRVU0zUWp0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMGxCUlVrc1QwRkJUeXhIUVVGSExFTkJRVU1zVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4TFFVRkxMRU5CUVVNc1NVRkJTU3hIUVVGSExFTkJRVU1zVDBGQlR5eERRVUZETEZkQlFWY3NRMEZCUXl4TFFVRkxMRU5CUVVNc1NVRkJTU3hIUVVGSExFTkJRVU1zVDBGQlR5eERRVUZETEZOQlFWTXNRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJRenRCUVVONFJ5eERRVUZET3p0QlFVVkVMRk5CUVZNc2MwSkJRWE5DTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWxCUVVrc1JVRkJSU3hQUVVGUExFVkJRVVVzVDBGQlR5eEZRVUZGTEZkQlFWY3NSVUZCUlR0SlFVTXpSU3hKUVVGSkxFOUJRVThzUTBGQlF6dEpRVU5hTEU5QlFVOHNTVUZCU1N4UFFVRlBMRU5CUVVNc1ZVRkJWU3hQUVVGUExFVkJRVVVzVFVGQlRTeEZRVUZGTzFGQlF6RkRMRk5CUVZNc1QwRkJUeXhIUVVGSE8xbEJRMllzU1VGQlNTeERRVUZETEU5QlFVOHNSVUZCUlR0blFrRkRWaXhQUVVGUExFZEJRVWNzU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1EwRkJRenRCUVVNdlF5eGhRVUZoT3p0WlFVVkVMRWxCUVVrc1NVRkJTU3hEUVVGRE8xbEJRMVFzU1VGQlNTeFpRVUZaTEVkQlFVY3NTMEZCU3l4RFFVRkRPMWxCUTNwQ0xFbEJRVWtzVlVGQlZTeEhRVUZITEV0QlFVc3NRMEZCUXp0WlFVTjJRaXhKUVVGSkxHdENRVUZyUWl4SFFVRkhMRXRCUVVzc1EwRkJRenRaUVVNdlFpeEpRVUZKTEdWQlFXVXNSMEZCUnl4UFFVRlBMRU5CUVVNc1UwRkJVeXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0WlFVTnFSQ3hKUVVGSkxGZEJRVmNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCU1N4RFFVRkRMRWxCUVVrc1EwRkJRenRaUVVOcVF5eEpRVUZKTEZWQlFWVXNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExGVkJRVlVzU1VGQlNTeFJRVUZSTEVOQlFVTTdXVUZEYkVRc1pVRkJaU3hEUVVGRExFOUJRVThzUTBGQlF5eHRRa0ZCYlVJc1IwRkJSeXhQUVVGUExFTkJRVU1zVVVGQlVTeEhRVUZITEVsQlFVa3NRMEZCUXl4RFFVRkRPMWxCUTNaRkxFdEJRVXNzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RlFVRkZMRU5CUVVNc1IwRkJSeXhsUVVGbExFTkJRVU1zVFVGQlRTeEZRVUZGTEVOQlFVTXNSVUZCUlN4RlFVRkZPMmRDUVVNM1F5eEpRVUZKTEZGQlFWRXNSMEZCUnl4bFFVRmxMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU03WjBKQlEyeERMRWxCUVVrc1pVRkJaU3hEUVVGRExFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTjJRaXhSUVVGUkxFbEJRVWtzVlVGQlZTeERRVUZETzJsQ1FVTXhRanRuUWtGRFJDeEpRVUZKTEVkQlFVY3NRMEZCUXl4RFFVRkRMRkZCUVZFc1EwRkJReXhEUVVGRE8yZENRVU51UWl4SlFVRkpMRWxCUVVrc1EwRkJReXhOUVVGTkxFbEJRVWtzUTBGQlF5eEZRVUZGTzI5Q1FVTnNRaXhKUVVGSkxFOUJRVThzVjBGQlZ5eEpRVUZKTEZkQlFWY3NSVUZCUlR0M1FrRkRia01zU1VGQlNTeFBRVUZQTEVkQlFVY3NRMEZCUXl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEVsQlFVa3NSVUZCUlN4RFFVRkRPM2RDUVVOb1F5eEpRVUZKTEVOQlFVTXNWVUZCVlN4TFFVRkxMRkZCUVZFc1NVRkJTU3hQUVVGUExFdEJRVXNzVjBGQlZ6czJRa0ZEYkVRc1ZVRkJWU3hMUVVGTExGVkJRVlVzU1VGQlNTeFBRVUZQTEVOQlFVTXNUMEZCVHl4RFFVRkRMRmRCUVZjc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF5eEZRVUZGT3pSQ1FVTnNSU3hWUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZET3pSQ1FVTnNRaXhOUVVGTk8zbENRVU5VTEUxQlFVMDdORUpCUTBnc2EwSkJRV3RDTEVkQlFVY3NTVUZCU1N4RFFVRkRPM2xDUVVNM1FqdHhRa0ZEU2l4TlFVRk5PM2RDUVVOSUxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTTdkMEpCUTJ4Q0xFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNaMEpCUVdkQ0xFVkJRVVVzVDBGQlR5eERRVUZETEZGQlFWRXNRMEZCUXl4RFFVRkRPM2RDUVVNNVF5eE5RVUZOTzNGQ1FVTlVPMjlDUVVORUxFMUJRVTA3YVVKQlExUXNUVUZCVFN4SlFVRkpMRWxCUVVrc1EwRkJReXhOUVVGTkxFZEJRVWNzUTBGQlF5eEZRVUZGTzI5Q1FVTjRRaXhaUVVGWkxFZEJRVWNzU1VGQlNTeERRVUZETzJsQ1FVTjJRanRCUVVOcVFpeGhRVUZoT3p0WlFVVkVMRWxCUVVrc1ZVRkJWU3hGUVVGRk8yZENRVU5hTEU5QlFVOHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRoUVVOcVFpeE5RVUZOTEVsQlFVa3NaVUZCWlN4RFFVRkRMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zU1VGQlNTeEpRVUZKTEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1IwRkJSeXhQUVVGUExFbEJRVWtzVDBGQlR5eEhRVUZITEVOQlFVTXNSVUZCUlR0blFrRkRhRVlzVlVGQlZTeERRVUZETEU5QlFVOHNSVUZCUlN4RlFVRkZMRU5CUVVNc1EwRkJRenRoUVVNelFpeE5RVUZOTzJkQ1FVTklMRWxCUVVrc1RVRkJUU3hIUVVGSExFVkJRVVVzUTBGQlF6dG5Ra0ZEYUVJc1NVRkJTU3haUVVGWkxFVkJRVVU3YjBKQlEyUXNUVUZCVFN4SFFVRkhMRzlFUVVGdlJDeEhRVUZITEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc1QwRkJUeXhEUVVGRExGTkJRVk1zUTBGQlF5eEhRVUZITEdGQlFXRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhIUVVGSExHOURRVUZ2UXl4RFFVRkRPMmxDUVVNM1N5eE5RVUZOTEVsQlFVa3NhMEpCUVd0Q0xFVkJRVVU3YjBKQlF6TkNMRTFCUVUwc1IwRkJSeXh2UkVGQmIwUXNSMEZCUnl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExFOUJRVThzUTBGQlF5eFRRVUZUTEVOQlFVTXNSMEZCUnl4aFFVRmhMRWRCUVVjc1NVRkJTU3hEUVVGRExGTkJRVk1zUjBGQlJ5d3JRMEZCSzBNc1IwRkJSeXhYUVVGWExFZEJRVWNzWVVGQllTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRkpMRVZCUVVVc1IwRkJSeXhKUVVGSkxFTkJRVU03YVVKQlF6TlBMRTFCUVUwN2IwSkJRMGdzVFVGQlRTeEhRVUZITEc5RVFVRnZSQ3hIUVVGSExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNUMEZCVHl4RFFVRkRMRk5CUVZNc1EwRkJReXhIUVVGSExHRkJRV0VzUjBGQlJ5eEpRVUZKTEVOQlFVTXNVMEZCVXl4SFFVRkhMRGhDUVVFNFFpeERRVUZETzJsQ1FVTjJTenRuUWtGRFJDeE5RVUZOTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNN1lVRkRiRUk3UVVGRFlpeFRRVUZUT3p0UlFVVkVMRWxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhqUVVGakxFTkJRVU1zUTBGQlF6dFJRVU53UkN4SlFVRkpMRXRCUVVzc1IwRkJSeXh0UWtGQmJVSXNTVUZCU1N4TFFVRkxMRXRCUVVzc1ZVRkJWU3hIUVVGSExFZEJRVWNzUjBGQlJ5eExRVUZMTEVOQlFVTXNRMEZCUXp0UlFVTjJSU3hKUVVGSkxFMUJRVTBzUTBGQlF5eFBRVUZQTEVWQlFVVTdXVUZEYUVJc1kwRkJZeXhEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEVsQlFVa3NRMEZCUXl4WFFVRlhPMk5CUTNwRExFbEJRVWtzUzBGQlN5eExRVUZMTEZWQlFWVXNSVUZCUlR0clFrRkRkRUlzVlVGQlZTeERRVUZETEU5QlFVOHNSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenRsUVVOb1F5eE5RVUZOTEVsQlFVa3NTMEZCU3l4TFFVRkxMRk5CUVZNc1JVRkJSVHRyUWtGRE5VSXNUMEZCVHl4RlFVRkZMRU5CUVVNN1pVRkRZaXhOUVVGTk8ydENRVU5JTEZWQlFWVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1NVRkJTU3hEUVVGRExFZEJRVWNzUTBGQlF5eFBRVUZQTEVkQlFVY3NTMEZCU3l4RlFVRkZMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU03WlVGRGVrUTdZVUZEUml4RFFVRkRMRU5CUVVNN1UwRkRUaXhOUVVGTk8xbEJRMGdzU1VGQlNTeExRVUZMTEV0QlFVc3NWVUZCVlN4RlFVRkZPMmRDUVVOMFFpeFZRVUZWTEVOQlFVTXNUMEZCVHl4RlFVRkZMRTlCUVU4c1EwRkJReXhEUVVGRE8yRkJRMmhETEUxQlFVMHNTVUZCU1N4TFFVRkxMRXRCUVVzc1UwRkJVeXhGUVVGRk8yZENRVU0xUWl4UFFVRlBMRVZCUVVVc1EwRkJRenRoUVVOaUxFMUJRVTA3WjBKQlEwZ3NWVUZCVlN4RFFVRkRMRTlCUVU4c1JVRkJSU3hKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEU5QlFVOHNSMEZCUnl4TFFVRkxMRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU1zUTBGQlF6dGhRVU42UkR0VFFVTktPMHRCUTBvc1EwRkJReXhEUVVGRE8wRkJRMUFzUTBGQlF6czdRVUZGUkN4VFFVRlRMRlZCUVZVc1EwRkJReXhSUVVGUkxFVkJRVVVzUjBGQlJ5eEZRVUZGTzBGQlEyNURMRWxCUVVrc1NVRkJTU3hIUVVGSExFZEJRVWNzUTBGQlF5eEZRVUZGTzBGQlEycENPenRSUVVWUkxFbEJRVWtzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRWRCUVVjc1EwRkJReXhEUVVGRExFTkJRVU1zVTBGQlV5eEpRVUZKTEZWQlFWVXNSVUZCUlR0WlFVTnFSQ3hQUVVGUExFTkJRVU1zUTBGQlF6dFRRVU5hTzFGQlEwUXNUMEZCVHl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETEZOQlFWTXNSMEZCUnl4UlFVRlJMRU5CUVVNc1MwRkJTeXhEUVVGRExFZEJRVWNzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXl4VFFVRlRMRU5CUVVNN1MwRkROVVU3U1VGRFJDeFBRVUZQTEVOQlFVTXNRMEZCUXp0QlFVTmlMRU5CUVVNN08wRkJSVVFzVTBGQlV5eFhRVUZYTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSU3hOUVVGTkxFVkJRVVVzVDBGQlR5eEZRVUZGT3p0SlFVVnFSQ3hWUVVGVkxFTkJRVU1zVjBGQlZ6dFJRVU5zUWl4SlFVRkpMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeEpRVUZKTEVkQlFVY3NSMEZCUnl4RFFVRkRMRU5CUVVNc1JVRkJSVHRaUVVOdVF5eFBRVUZQTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1IwRkJSeXhEUVVGRExFVkJRVVVzVFVGQlRTeERRVUZETEVOQlFVTTdVMEZEZEVNc1RVRkJUVHRaUVVOSUxFbEJRVWtzUTBGQlF5eFpRVUZaTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1UwRkRNMEk3UzBGRFNpeEZRVUZGTEU5QlFVOHNTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOeVFpeERRVUZET3p0QlFVVkVMRk5CUVZNc2EwSkJRV3RDTEVOQlFVTXNUMEZCVHl4RlFVRkZPMGxCUTJwRExFbEJRVWtzU1VGQlNTeEhRVUZITEZGQlFWRXNRMEZCUXl4aFFVRmhMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU03UVVGRGJFUXNTVUZCU1N4SlFVRkpMRU5CUVVNc1UwRkJVeXhIUVVGSExFOUJRVThzUTBGQlF6czdTVUZGZWtJc1QwRkJUeXhKUVVGSkxFTkJRVU1zVDBGQlR5eEhRVUZITEVsQlFVa3NRMEZCUXl4UFFVRlBMRWRCUVVjc1NVRkJTU3hEUVVGRE8wRkJRemxETEVOQlFVTTdPMEZCUlVRc1UwRkJVeXh0UWtGQmJVSXNRMEZCUXl4SlFVRkpMRVZCUVVVN1NVRkRMMElzVDBGQlR5eEpRVUZKTEVsQlFVa3NTVUZCU1N4RFFVRkRMRWxCUVVrc1NVRkJTU3hKUVVGSkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1NVRkJTU3hEUVVGRExFOUJRVThzUTBGQlF5eFJRVUZSTEVOQlFVTTdRVUZEYUVZc1EwRkJRenM3UVVGRlJDeFRRVUZUTEdkQ1FVRm5RaXhEUVVGRExFdEJRVXNzUlVGQlJUdEZRVU12UWl4SlFVRkpMRTFCUVUwc1IwRkJSeXhGUVVGRkxFTkJRVU03UlVGRGFFSXNTVUZCU1N4UlFVRlJMRWRCUVVjc1MwRkJTeXhEUVVGRE8wVkJRM0pDTEV0QlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhGUVVGRkxFTkJRVU1zUjBGQlJ5eExRVUZMTEVOQlFVTXNUVUZCVFN4RlFVRkZMRU5CUVVNc1JVRkJSU3hGUVVGRk8wbEJRM0pETEVsQlFVa3NUVUZCVFN4SFFVRkhMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eFRRVUZUTEV0QlFVc3NUVUZCVFN4RFFVRkRPMGxCUXpORExFbEJRVWtzUTBGQlF5eFJRVUZSTEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVN1RVRkRlRUlzVFVGQlRTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF6dE5RVU4wUWl4UlFVRlJMRWRCUVVjc1VVRkJVU3hKUVVGSkxFMUJRVTBzUTBGQlF6dExRVU12UWp0SFFVTkdPMFZCUTBRc1QwRkJUeXhOUVVGTkxFTkJRVU03UVVGRGFFSXNRMEZCUXl4RFFVRkRPenRCUVVWR0xFbEJRVWtzU1VGQlNTeEhRVUZITEVOQlFVTXNXVUZCV1R0SlFVTndRaXhUUVVGVExFVkJRVVVzUjBGQlJ6dFJRVU5XTEU5QlFVOHNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRExFTkJRVU1zUjBGQlJ5eEpRVUZKTEVOQlFVTXNUVUZCVFN4RlFVRkZMRWxCUVVrc1QwRkJUeXhEUVVGRE8yRkJRek5ETEZGQlFWRXNRMEZCUXl4RlFVRkZMRU5CUVVNN1lVRkRXaXhUUVVGVExFTkJRVU1zUTBGQlF5eERRVUZETEVOQlFVTTdTMEZEY2tJN1NVRkRSQ3hQUVVGUExGbEJRVms3VVVGRFppeFBRVUZQTEVWQlFVVXNSVUZCUlN4SFFVRkhMRVZCUVVVc1JVRkJSU3hIUVVGSExFZEJRVWNzUjBGQlJ5eEZRVUZGTEVWQlFVVXNSMEZCUnl4SFFVRkhMRWRCUVVjc1JVRkJSU3hGUVVGRkxFZEJRVWNzUjBGQlJ6dFpRVU01UXl4RlFVRkZMRVZCUVVVc1IwRkJSeXhIUVVGSExFZEJRVWNzUlVGQlJTeEZRVUZGTEVkQlFVY3NSVUZCUlN4RlFVRkZMRWRCUVVjc1JVRkJSU3hGUVVGRkxFTkJRVU03UzBGRGRrTXNRMEZCUXp0QlFVTk9MRU5CUVVNc1IwRkJSeXhEUVVGRE96dEJRVVZNTEVsQlFVa3NVMEZCVXl4SFFVRkhMRVZCUVVVc1EwRkJRenRCUVVOdVFpeEpRVUZKTEV0QlFVc3NRMEZCUXp0QlFVTldMRWxCUVVrc1NVRkJTU3hIUVVGSE8wbEJRMUFzU1VGQlNTeEZRVUZGTEZsQlFWazdVVUZEWkN4SlFVRkpMRkZCUVZFc1IwRkJSeXhyUWtGQmEwSXNRMEZCUXl4bFFVRmxMRU5CUVVNc1EwRkJRenRSUVVOdVJDeEpRVUZKTEZGQlFWRXNSVUZCUlR0VlFVTmFMRmxCUVZrc1EwRkJReXhMUVVGTExFVkJRVVVzUTBGQlF6dFRRVU4wUWp0UlFVTkVMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEhRVUZITEVsQlFVa3NRMEZCUXl4dlFrRkJiMElzUlVGQlJTeERRVUZETzBGQlEzcEVMRkZCUVZFc1NVRkJTU3hEUVVGRExGTkJRVk1zUTBGQlF5eGhRVUZoTEVOQlFVTXNRMEZCUXpzN1VVRkZPVUlzVDBGQlR5eEpRVUZKTEVOQlFVTXNXVUZCV1N4RlFVRkZMRU5CUVVNc1NVRkJTU3hEUVVGRExGbEJRVms3VlVGRE1VTXNTVUZCU1N4UlFVRlJMRVZCUVVVN1dVRkRXaXhWUVVGVkxFTkJRVU1zV1VGQldUdGpRVU55UWl4TFFVRkxMRU5CUVVNc1ZVRkJWU3hIUVVGSExHdENRVUZyUWl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVOQlFVTTdZMEZETVVRc1MwRkJTeXhEUVVGRExFOUJRVThzUjBGQlJ5eEpRVUZKTEVOQlFVTTdZMEZEY2tJc1NVRkJTU3hEUVVGRExGZEJRVmNzUTBGQlF5eFJRVUZSTEVOQlFVTXNRMEZCUXp0aFFVTTFRaXhGUVVGRkxFZEJRVWNzUTBGQlF5eERRVUZETzFkQlExUXNUVUZCVFR0WlFVTk1MRWxCUVVrc1MwRkJTeXhEUVVGRExFMUJRVTBzUzBGQlN5eFRRVUZUTEVWQlFVVTdZMEZET1VJc1YwRkJWeXhEUVVGRExFdEJRVXNzUTBGQlF5eEhRVUZITEVOQlFVTXNVVUZCVVN4RlFVRkZMRXRCUVVzc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eERRVUZETEVOQlFVTTdZVUZEZEVRc1RVRkJUU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNTVUZCU1N4TFFVRkxMRU5CUVVNc1RVRkJUU3hMUVVGTExHTkJRV01zUlVGQlJUdGpRVU16UkN4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGRkJRVkVzUTBGQlF6dGhRVU42UWp0QlFVTmlMRmRCUVZjN08xTkJSVVlzUTBGQlF5eERRVUZETzB0QlEwNDdTVUZEUkN4VFFVRlRMRVZCUVVVc1ZVRkJWU3hIUVVGSExFVkJRVVVzVDBGQlR5eEZRVUZGTzFGQlF5OUNMRWxCUVVrc1UwRkJVeXhKUVVGSkxGTkJRVk1zUTBGQlF5eE5RVUZOTEVWQlFVVTdXVUZETDBJc1MwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4SFFVRkhMRk5CUVZNc1EwRkJReXhOUVVGTkxFVkJRVVVzUTBGQlF5eEZRVUZGTEVWQlFVVTdaMEpCUTNaRExGTkJRVk1zUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXl4SFFVRkhMRVZCUVVVc1QwRkJUeXhEUVVGRExFTkJRVU03WVVGRE9VSTdVMEZEU2p0TFFVTktPMGxCUTBRc1kwRkJZeXhGUVVGRkxGbEJRVms3VVVGRGVFSXNTVUZCU1N4TFFVRkxMRU5CUVVNc1RVRkJUU3hKUVVGSkxGZEJRVmNzUlVGQlJUdFpRVU0zUWl4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGZEJRVmNzUTBGQlF6dFpRVU16UWl4TFFVRkxMRU5CUVVNc1MwRkJTeXhIUVVGSExFVkJRVVVzUTBGQlF6dFpRVU5xUWl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNN1dVRkRjRU1zU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4dFFrRkJiVUlzUTBGQlF5eERRVUZETzFsQlEzQkRMRWxCUVVrc1EwRkJReXhoUVVGaExFTkJRVU1zVFVGQlRTeEZRVUZGTzJkQ1FVTjJRaXhIUVVGSExFVkJRVVU3YjBKQlEwUXNVVUZCVVN4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zVVVGQlVUdHZRa0ZEYkVNc1NVRkJTU3hGUVVGRkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNTVUZCU1R0dlFrRkRNVUlzVFVGQlRTeEZRVUZGTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1RVRkJUVHR2UWtGRE9VSXNTVUZCU1N4RlFVRkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zU1VGQlNUdHBRa0ZETjBJN1lVRkRTaXhEUVVGRExFTkJRVU03VTBGRFRqdEJRVU5VTEV0QlFVczdPMGxCUlVRc1YwRkJWeXhGUVVGRkxGVkJRVlVzU1VGQlNTeEZRVUZGTEUxQlFVMHNSVUZCUlR0UlFVTnFReXhKUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVsQlFVa3NUVUZCVFN4RFFVRkRMR2xDUVVGcFFpeERRVUZETEVOQlFVTTdVVUZET1VNc1NVRkJTU3hQUVVGUExFZEJRVWNzUTBGQlF5eEpRVUZKTEVkQlFVY3NUVUZCVFN4RFFVRkRMR2xFUVVGcFJDeERRVUZETEVsQlFVa3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJRenRSUVVNNVJpeFBRVUZQTEZkQlFWY3NRMEZCUXl4TFFVRkxMRU5CUVVNc1EwRkJReXhKUVVGSkxFTkJRVU1zVlVGQlZTeFJRVUZSTEVWQlFVVTdXVUZETDBNc1VVRkJVU3hIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNTVUZCU1N4RFFVRkRMRk5CUVZNc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF5eERRVUZETzFsQlEyaEVMR1ZCUVdVc1EwRkJReXhSUVVGUkxFTkJRVU1zUTBGQlF5eEpRVUZKTEVOQlFVTXNXVUZCV1R0blFrRkRka01zUzBGQlN5eERRVUZETEVkQlFVY3NSMEZCUnl4RlFVRkZMRU5CUVVNN1owSkJRMllzUzBGQlN5eERRVUZETEU5QlFVOHNSMEZCUnl4UFFVRlBMRXRCUVVzc1NVRkJTU3hEUVVGRE8wRkJRMnBFTEdkQ1FVRm5RaXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZOQlFWTXNRMEZCUXpzN1FVRkZla01zWjBKQlFXZENMRkZCUVZFc1EwRkJReXhMUVVGTExFZEJRVWNzWjBKQlFXZENMRU5CUVVNc1VVRkJVU3hEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZET3p0blFrRkZiRVFzU1VGQlNTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGSExFTkJRVU1zVTBGQlV5eERRVUZETEVWQlFVVTdhMEpCUTNSRExFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNjVUpCUVhGQ0xFZEJRVWNzU1VGQlNTeEhRVUZITEVkQlFVY3NSVUZCUlN4UlFVRlJMRU5CUVVNc1EwRkJRenRCUVVNdlJTeHBRa0ZCYVVJN08wRkJSV3BDTEdkQ1FVRm5RaXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEd0Q1FVRnJRaXhEUVVGRExFTkJRVU03TzJkQ1FVVnVReXhQUVVGUExFTkJRVU1zVVVGQlVTeEZRVUZGTEVOQlFVTXNRMEZCUXl4RFFVRkRPMkZCUTNoQ0xFTkJRVU1zUTBGQlF6dFRRVU5PTEVOQlFVTXNRMEZCUXp0TFFVTk9PMGxCUTBRc1YwRkJWeXhGUVVGRkxGZEJRVmM3U1VGRGVFSXNXVUZCV1N4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRemRDTEVsQlFVa3NVVUZCVVN4SFFVRkhMRXRCUVVzc1EwRkJReXhIUVVGSExFbEJRVWtzUzBGQlN5eERRVUZETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNN1VVRkRMME1zVDBGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRPMUZCUTJwQ0xFdEJRVXNzUTBGQlF5eE5RVUZOTEVkQlFVY3NVVUZCVVN4RFFVRkRPMEZCUTJoRExGRkJRVkVzU1VGQlNTeERRVUZETEZOQlFWTXNRMEZCUXl4clFrRkJhMElzUTBGQlF5eERRVUZET3p0UlFVVnVReXhKUVVGSkxFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhUUVVGVExFTkJRVU1zUlVGQlJUdFZRVU4wUXl4SlFVRkpMRU5CUVVNc1UwRkJVeXhEUVVGRExHMUNRVUZ0UWl4RFFVRkRMRU5CUVVNN1UwRkRja003VVVGRFJDeEpRVUZKTEZGQlFWRXNSVUZCUlR0WlFVTldMRWxCUVVrc1QwRkJUeXhGUVVGRk8yZENRVU5VTEVsQlFVa3NRMEZCUXl4aFFVRmhMRU5CUVVNc2MwSkJRWE5DTEVkQlFVY3NVVUZCVVN4RFFVRkRMRWxCUVVrc1IwRkJSeXhqUVVGakxFTkJRVU1zUTBGQlF6dGhRVU12UlN4TlFVRk5PMmRDUVVOSUxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNiVUpCUVcxQ0xFZEJRVWNzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRuUWtGRE0wUXNTVUZCU1N4RFFVRkRMRmRCUVZjc1EwRkJReXh6UWtGQmMwSXNSMEZCUnl4UlFVRlJMRU5CUVVNc1NVRkJTU3hIUVVGSExGbEJRVmtzUTBGQlF5eERRVUZETzJGQlF6TkZPMU5CUTBvN1FVRkRWQ3hMUVVGTE8wRkJRMHc3UVVGRFFUdEJRVU5CT3p0SlFVVkpMRzlDUVVGdlFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZPMUZCUTNKRExFbEJRVWtzVVVGQlVTeEhRVUZITEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNTVUZCU1N4SlFVRkpMRVZCUVVVc1EwRkJRenRCUVVONFJTeFJRVUZSTEU5QlFVOHNRMEZCUXl4WlFVRlpMRU5CUVVNc1owSkJRV2RDTEVWQlFVVXNVVUZCVVN4RFFVRkRMRU5CUVVNN08xRkJSV3BFTEVsQlFVa3NUMEZCVHl4SFFVRkhMRTlCUVU4c1EwRkJReXhUUVVGVExFVkJRVVVzUTBGQlF5eFRRVUZUTEVOQlFVTTdVVUZETlVNc1NVRkJTU3haUVVGWkxFZEJRVWNzUlVGQlJTeERRVUZETzFGQlEzUkNMRWxCUVVrc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4TlFVRk5MRWxCUVVrc1QwRkJUeXhEUVVGRExFOUJRVThzUTBGQlF5eFhRVUZYTEVWQlFVVXNTVUZCU1N4TlFVRk5MRVZCUVVVN1dVRkRjRVlzV1VGQldTeEhRVUZITEVOQlFVTXNUMEZCVHl4RFFVRkRMRTlCUVU4c1EwRkJReXhEUVVGRE8xTkJRM0JETEUxQlFVMDdXVUZEU0N4WlFVRlpMRWRCUVVjc1kwRkJZeXhEUVVGRExFOUJRVThzUlVGQlJTeFJRVUZSTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1UwRkRla1E3VVVGRFJDeFBRVUZQTzFsQlEwZ3NVVUZCVVN4RlFVRkZMRkZCUVZFN1dVRkRiRUlzVTBGQlV5eEZRVUZGTEZsQlFWazdVMEZETVVJc1EwRkJRenRCUVVOV0xFdEJRVXM3TzBsQlJVUXNZVUZCWVN4RlFVRkZMRlZCUVZVc1UwRkJVeXhGUVVGRkxFbEJRVWtzUlVGQlJTeEhRVUZITEVWQlFVVTdVVUZETTBNc1NVRkJTU3hKUVVGSkxFTkJRVU1zVjBGQlZ5eEZRVUZGTEVsQlFVa3NTVUZCU1N4RFFVRkRMRmxCUVZrc1JVRkJSU3hGUVVGRk8xbEJRek5ETEVsQlFVa3NUMEZCVHl4SFFVRkhMRWxCUVVrc1YwRkJWeXhGUVVGRk8yZENRVU16UWl4SFFVRkhMRWRCUVVjc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4RFFVRkRPMkZCUTJwRE8xbEJRMFFzUzBGQlN5eERRVUZETEV0QlFVc3NRMEZCUXl4SFFVRkhMRU5CUVVNc1IwRkJSenRuUWtGRFppeFRRVUZUTEVWQlFVVXNVMEZCVXp0blFrRkRjRUlzVTBGQlV5eEZRVUZGTEVsQlFVa3NTVUZCU1N4RlFVRkZMRU5CUVVNc1QwRkJUeXhGUVVGRk8yZENRVU12UWl4SlFVRkpMRVZCUVVVc1NVRkJTVHRoUVVOaUxFTkJRVU03V1VGRFJpeEpRVUZKTEVOQlFVTXNVMEZCVXl4RFFVRkRMR3RDUVVGclFpeERRVUZETEVOQlFVTTdVMEZEZEVNN1MwRkRTanRKUVVORUxGTkJRVk1zUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlN4UlFVRlJMRVZCUVVVN1VVRkRhRU1zU1VGQlNTeGpRVUZqTEVsQlFVa3NZMEZCWXl4RFFVRkRMRTFCUVUwc1JVRkJSVHRaUVVONlF5eExRVUZMTEVsQlFVa3NRMEZCUXl4SFFVRkhMRU5CUVVNc1JVRkJSU3hEUVVGRExFZEJRVWNzWTBGQll5eERRVUZETEUxQlFVMHNSVUZCUlN4RFFVRkRMRVZCUVVVc1JVRkJSVHRuUWtGRE5VTXNZMEZCWXl4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFZEJRVWNzUTBGQlF5eEhRVUZITEVWQlFVVXNVVUZCVVN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE8yRkJRemxETzFOQlEwbzdTMEZEU2p0SlFVTkVMRmRCUVZjc1JVRkJSU3hWUVVGVkxFdEJRVXNzUlVGQlJTeFJRVUZSTEVWQlFVVTdVVUZEY0VNc1NVRkJTU3hqUVVGakxFbEJRVWtzWTBGQll5eERRVUZETEUxQlFVMHNSVUZCUlR0WlFVTjZReXhMUVVGTExFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNSVUZCUlN4RFFVRkRMRWRCUVVjc1kwRkJZeXhEUVVGRExFMUJRVTBzUlVGQlJTeERRVUZETEVWQlFVVXNSVUZCUlR0blFrRkROVU1zWTBGQll5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRXRCUVVzc1EwRkJReXhMUVVGTExFVkJRVVVzVVVGQlVTeEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMkZCUTJ4RU8xTkJRMG83UzBGRFNqdEpRVU5FTEdGQlFXRXNSVUZCUlN4VlFVRlZMRTlCUVU4c1JVRkJSU3hSUVVGUkxFVkJRVVU3VVVGRGVFTXNTVUZCU1N4alFVRmpMRWxCUVVrc1kwRkJZeXhEUVVGRExFMUJRVTBzUlVGQlJUdFpRVU42UXl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NZMEZCWXl4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdG5Ra0ZETlVNc1kwRkJZeXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4UFFVRlBMRVZCUVVVc1VVRkJVU3hGUVVGRkxFbEJRVWtzUTBGQlF5eERRVUZETzJGQlEzUkVPMU5CUTBvN1MwRkRTanRKUVVORUxHZENRVUZuUWl4RlFVRkZMRlZCUVZVc1QwRkJUeXhGUVVGRk8xRkJRMnBETEZOQlFWTXNRMEZCUXl4SlFVRkpMRU5CUVVNc1QwRkJUeXhEUVVGRExFTkJRVU03UzBGRE0wSTdTVUZEUkN4dFFrRkJiVUlzUlVGQlJTeFZRVUZWTEU5QlFVOHNSVUZCUlR0UlFVTndReXhaUVVGWkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMHRCUXpsQ08wbEJRMFFzY1VKQlFYRkNMRVZCUVVVc1ZVRkJWU3hQUVVGUExFVkJRVVU3VVVGRGRFTXNZMEZCWXl4RFFVRkRMRWxCUVVrc1EwRkJReXhQUVVGUExFTkJRVU1zUTBGQlF6dExRVU5vUXp0SlFVTkVMRzFDUVVGdFFpeEZRVUZGTEZWQlFWVXNUMEZCVHl4RlFVRkZMRXRCUVVzc1JVRkJSVHRSUVVNelF5eExRVUZMTEVkQlFVY3NUMEZCVHl4TFFVRkxMRXRCUVVzc1YwRkJWeXhIUVVGSExFdEJRVXNzUjBGQlJ5eFpRVUZaTEVOQlFVTXNUVUZCVFN4RFFVRkRPMUZCUTI1RkxFbEJRVWtzV1VGQldTeERRVUZETEUxQlFVMHNSMEZCUnl4TFFVRkxMRVZCUVVVN1dVRkROMElzV1VGQldTeERRVUZETEUxQlFVMHNRMEZCUXl4TFFVRkxMRVZCUVVVc1EwRkJReXhGUVVGRkxFOUJRVThzUTBGQlF5eERRVUZETzFOQlF6RkRMRTFCUVUwN1dVRkRTQ3haUVVGWkxFTkJRVU1zU1VGQlNTeERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRPMU5CUXpsQ08wdEJRMG83U1VGRFJDd3lRa0ZCTWtJc1JVRkJSU3hWUVVGVkxFOUJRVThzUlVGQlJUdFJRVU0xUXl4dlFrRkJiMElzUTBGQlF5eEpRVUZKTEVOQlFVTXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRkRU03U1VGRFJDeFhRVUZYTEVWQlFVVXNWMEZCVnp0UlFVTndRaXhQUVVGUExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNUVUZCVFN4RFFVRkRMRTlCUVU4c1EwRkJReXhYUVVGWExFTkJRVU1zUzBGQlN5eERRVUZETEVOQlFVTTdTMEZEZGtRN1NVRkRSQ3hUUVVGVExFVkJRVVVzVjBGQlZ6dFJRVU5zUWl4UFFVRlBMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeERRVUZETEU5QlFVOHNRMEZCUXl4VFFVRlRMRU5CUVVNc1MwRkJTeXhEUVVGRExFTkJRVU03UzBGRGNrUTdTVUZEUkN4WlFVRlpMRVZCUVVVc1UwRkJVeXhWUVVGVkxFVkJRVVU3VVVGREwwSXNTVUZCU1N4UFFVRlBMRlZCUVZVc1MwRkJTeXhYUVVGWExFdEJRVXNzU1VGQlNTeERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRWxCUVVrc1EwRkJReXhaUVVGWkxFVkJRVVVzUTBGQlF5eEZRVUZGTzFsQlEyeEdMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVFVGQlRTeEhRVUZITEZWQlFWVXNSMEZCUnl4WlFVRlpMRWRCUVVjc1YwRkJWeXhEUVVGRE8xbEJRelZFTEVsQlFVa3NRMEZCUXl4VFFVRlRMRU5CUVVNc2IwSkJRVzlDTEVOQlFVTXNRMEZCUXp0VFFVTjRRenRSUVVORUxFOUJRVThzU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4TlFVRk5MRU5CUVVNc1QwRkJUeXhEUVVGRExGbEJRVmtzUTBGQlF5eExRVUZMTEVOQlFVTXNRMEZCUXp0TFFVTjRSRHRKUVVORUxHRkJRV0VzUlVGQlJTeFZRVUZWTEVsQlFVa3NSVUZCUlR0UlFVTXpRaXhKUVVGSkxFbEJRVWtzUzBGQlN5eExRVUZMTEVWQlFVVTdXVUZEYUVJc1NVRkJTU3hYUVVGWExFZEJRVWM3WjBKQlEyUXNTMEZCU3l4RlFVRkZMRXRCUVVzc1EwRkJReXhMUVVGTE8wRkJRMnhETEdGQlFXRXNRMEZCUXpzN1FVRkZaQ3haUVVGWkxFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE96dFpRVVUxUWl4SlFVRkpMRU5CUVVNc1YwRkJWeXhEUVVGRExFbEJRVWtzUlVGQlJUdG5Ra0ZEYmtJc1YwRkJWeXhEUVVGRExFbEJRVWtzUjBGQlJ5eE5RVUZOTEVOQlFVTXNjVUpCUVhGQ0xFTkJRVU1zUTBGQlF6dEJRVU5xUlN4aFFVRmhPenRaUVVWRUxFbEJRVWtzVjBGQlZ5eERRVUZETEVsQlFVa3NSVUZCUlR0QlFVTnNReXhuUWtGQlowSXNTMEZCU3l4RFFVRkRMRk5CUVZNc1EwRkJReXhKUVVGSkxFTkJRVU1zVjBGQlZ5eERRVUZETEVOQlFVTTdPMmRDUVVWc1F5eEpRVUZKTEZsQlFWa3NTVUZCU1N4WlFVRlpMRU5CUVVNc1RVRkJUU3hGUVVGRk8yOUNRVU55UXl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NXVUZCV1N4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdDNRa0ZETVVNc1dVRkJXU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZkQlFWY3NSVUZCUlN4SlFVRkpMRU5CUVVNc1EwRkJRenR4UWtGRGRFTTdhVUpCUTBvN1lVRkRTanRCUVVOaUxGTkJRVk03TzBGQlJWUXNVVUZCVVN4TFFVRkxMRU5CUVVNc1RVRkJUU3hIUVVGSExGRkJRVkVzUTBGQlF6czdRVUZGYUVNc1VVRkJVU3hKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEcxQ1FVRnRRaXhEUVVGRExFTkJRVU03TzFGQlJYQkRMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zYlVKQlFXMUNMRVZCUVVVc1YwRkJWeXhEUVVGRExFTkJRVU03UVVGRGVrUXNTMEZCU3pzN1NVRkZSQ3haUVVGWkxFVkJRVVVzV1VGQldUdFJRVU4wUWl4SlFVRkpMRkZCUVZFc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEZGQlFWRXNSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExGRkJRVkVzU1VGQlNTeEpRVUZKTEZGQlFWRXNRMEZCUXp0VlFVTjJSU3hqUVVGakxFVkJRVVVzU1VGQlNUdFRRVU55UWl4RFFVRkRMRU5CUVVNN1VVRkRTQ3hKUVVGSkxHOUNRVUZ2UWl4RFFVRkRMRTFCUVUwc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGSkxFTkJRVU1zVTBGQlV5eEZRVUZGTEVWQlFVVTdXVUZETjBVc1QwRkJUeXhKUVVGSkxFOUJRVThzUTBGQlF5eFZRVUZWTEU5QlFVOHNSVUZCUlN4TlFVRk5MRVZCUVVVN1owSkJRekZETEc5Q1FVRnZRaXhEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZWQlFWVXNTVUZCU1N4RlFVRkZPMjlDUVVOd1F5eFJRVUZSTEVOQlFVTXNWMEZCVnl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRE8yOUNRVU16UWl4UFFVRlBMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03YVVKQlEzSkNMRVZCUVVVc1dVRkJXVHR2UWtGRFdDeFBRVUZQTEVOQlFVTXNVVUZCVVN4RFFVRkRMRU5CUVVNN2FVSkJRM0pDTEVOQlFVTXNRMEZCUXp0aFFVTk9MRU5CUVVNc1EwRkJRenRUUVVOT0xFMUJRVTA3V1VGRFNDeFBRVUZQTEU5QlFVOHNRMEZCUXl4UFFVRlBMRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRVU03VTBGRGNFTTdRVUZEVkN4TFFVRkxPenRKUVVWRUxHOUNRVUZ2UWl4RlFVRkZMRmxCUVZrN1VVRkRPVUlzU1VGQlNTeFpRVUZaTEVkQlFVY3NXVUZCV1N4RFFVRkRMRTlCUVU4c1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dFJRVU5vUkN4SlFVRkpMRmxCUVZrc1JVRkJSVHRCUVVNeFFpeFpRVUZaTEV0QlFVc3NSMEZCUnl4SlFVRkpMRU5CUVVNc1MwRkJTeXhEUVVGRExGbEJRVmtzUTBGQlF5eERRVUZET3p0WlFVVnFReXhKUVVGSkxFdEJRVXNzUTBGQlF5eFJRVUZSTEVWQlFVVTdaMEpCUTJoQ0xFbEJRVWtzVjBGQlZ5eEhRVUZITEVsQlFVa3NVVUZCVVN4RlFVRkZMRU5CUVVNN1owSkJRMnBETEZkQlFWY3NRMEZCUXl4UlFVRlJMRWRCUVVjc1MwRkJTeXhEUVVGRExGRkJRVkVzUTBGQlF5eFJRVUZSTEVOQlFVTTdaMEpCUXk5RExGZEJRVmNzUTBGQlF5eFJRVUZSTEVkQlFVY3NTMEZCU3l4RFFVRkRMRkZCUVZFc1EwRkJReXhsUVVGbExFTkJRVU03WjBKQlEzUkVMRXRCUVVzc1EwRkJReXhSUVVGUkxFZEJRVWNzVjBGQlZ5eERRVUZETzJGQlEyaERPMU5CUTBvc1RVRkJUVHRaUVVOSUxFdEJRVXNzUjBGQlJ6dG5Ra0ZEU2l4TlFVRk5MRVZCUVVVc1kwRkJZenRuUWtGRGRFSXNVMEZCVXl4RlFVRkZMRVZCUVVVN1lVRkRhRUlzUTBGQlF6dFRRVU5NTzFGQlEwUXNUMEZCVHl4TFFVRkxMRU5CUVVNN1FVRkRja0lzUzBGQlN6czdTVUZGUkN4clFrRkJhMElzUlVGQlJTeFZRVUZWTEZOQlFWTXNSVUZCUlR0UlFVTnlReXhKUVVGSkxGTkJRVk1zUlVGQlJUdFpRVU5ZTEZsQlFWa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hGUVVGRkxFbEJRVWtzUTBGQlF5eFRRVUZUTEVOQlFVTXNVMEZCVXl4RFFVRkRMRU5CUVVNc1EwRkJRenRUUVVNelJDeE5RVUZOTzFsQlEwZ3NXVUZCV1N4RFFVRkRMRlZCUVZVc1EwRkJReXhOUVVGTkxFTkJRVU1zUTBGQlF6dFRRVU51UXp0QlFVTlVMRXRCUVVzN08wbEJSVVFzVFVGQlRTeEZRVUZGTEZsQlFWazdVVUZEYUVJc1NVRkJTU3hEUVVGRExHdENRVUZyUWl4RFFVRkRMRXRCUVVzc1EwRkJReXhEUVVGRE8wdEJRMnhETzBGQlEwd3NRMEZCUXl4RFFVRkRPenRCUVVWR0xGTkJRVk1zWlVGQlpTeERRVUZETEVkQlFVY3NSVUZCUlN4TFFVRkxMRVZCUVVVN1NVRkRha01zUTBGQlF5eERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRmRCUVZjc1EwRkJReXhoUVVGaExFVkJRVVVzUzBGQlN5eERRVUZETEVOQlFVTTdRVUZETjBNc1EwRkJRenM3UVVGRlJDeFRRVUZUTEZkQlFWY3NRMEZCUXl4SFFVRkhMRVZCUVVVc1MwRkJTeXhGUVVGRk8wbEJRemRDTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhYUVVGWExFTkJRVU1zV1VGQldTeEZRVUZGTEV0QlFVc3NRMEZCUXl4RFFVRkRPMEZCUXpWRExFTkJRVU03TzBGQlJVUTdRVUZEUVR0QlFVTkJPenRIUVVWSE8wRkJRMGdzVTBGQlV5eHRRa0ZCYlVJc1EwRkJReXhIUVVGSExFVkJRVVU3U1VGRE9VSXNUMEZCVHl4RFFVRkRMRU5CUVVNc1IwRkJSeXhEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETEU5QlFVOHNRMEZCUXl4RFFVRkRMRTFCUVUwc1NVRkJTU3hEUVVGRE8xVkJRM0JETEVkQlFVY3NRMEZCUXl4UlFVRlJMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzVDBGQlR5eERRVUZETzBGQlEyaEVMRU5CUVVNN08wRkJSVVE3TzBkQlJVYzdRVUZEU0N4VFFVRlRMR2RDUVVGblFpeERRVUZETEVkQlFVY3NSVUZCUlR0RlFVTTNRaXhQUVVGUExFTkJRVU1zUjBGQlJ5eERRVUZETEZsQlFWa3NTVUZCU1N4SFFVRkhMRU5CUVVNc1dVRkJXU3hEUVVGRExHRkJRV0VzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4SFFVRkhMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU1zWlVGQlpTeERRVUZETEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1EwRkJRenRCUVVNMVJ5eERRVUZET3p0QlFVVkVPenRIUVVWSE8wRkJRMGdzVTBGQlV5eHBRa0ZCYVVJc1EwRkJReXhIUVVGSExFVkJRVVVzUjBGQlJ5eEZRVUZGTzBWQlEyNURMRWxCUVVrc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZMTEVOQlFVTXNVVUZCVVN4RFFVRkRMRWRCUVVjc1EwRkJReXhyUWtGQmEwSXNSMEZCUnl4SFFVRkhMRU5CUVVNc1EwRkJRenRGUVVOb1JTeEpRVUZKTEdGQlFXRXNTVUZCU1N4UFFVRlBMRXRCUVVzc1NVRkJTU3hKUVVGSkxFOUJRVThzUzBGQlN5eE5RVUZOTEVsQlFVa3NUMEZCVHl4UFFVRlBMRXRCUVVzc1YwRkJWeXhEUVVGRExFTkJRVU03UlVGREwwWXNUMEZCVHl4SlFVRkpMRU5CUVVNc1YwRkJWeXhGUVVGRkxFbEJRVWtzWVVGQllTeEpRVUZKTEcxQ1FVRnRRaXhEUVVGRExFZEJRVWNzUTBGQlF5eERRVUZETzBGQlEzcEZMRU5CUVVNN08wRkJSVVFzU1VGQlNTeE5RVUZOTEVkQlFVY3NSVUZCUlN4RFFVRkRPenRCUVVWb1FpeFRRVUZUTEdsQ1FVRnBRaXhIUVVGSE96dEpRVVY2UWl4TFFVRkxMRWxCUVVrc1EwRkJReXhIUVVGSExFTkJRVU1zUlVGQlJTeERRVUZETEVkQlFVY3NUVUZCVFN4RFFVRkRMRTFCUVUwc1JVRkJSU3hEUVVGRExFVkJRVVVzUlVGQlJUdFJRVU53UXl4UlFVRlJMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRkxFTkJRVU1zVlVGQlZTeEhRVUZITEVWQlFVVTdXVUZEYWtRc1NVRkJTU3hQUVVGUExFZEJRVWNzVlVGQlZTeERRVUZETEVWQlFVVTdaMEpCUTNaQ0xFbEJRVWtzUTBGQlF5eERRVUZETEZOQlFWTTdRVUZETDBJc2IwSkJRVzlDTEU5QlFVODdPMEZCUlROQ0xHZENRVUZuUWl4SlFVRkpMRU5CUVVNc1owSkJRV2RDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJReXhKUVVGSkxFbEJRVWtzUTBGQlF5eFhRVUZYTEVWQlFVVXNSVUZCUlRzN2MwSkJSV3BFTEVsQlFVa3NSMEZCUnl4SFFVRkhMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zUzBGQlN5eERRVUZETEUxQlFVMHNRMEZCUXp0elFrRkRiRU1zU1VGQlNTeFJRVUZSTEVkQlFVY3NTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhMUVVGTExFTkJRVU1zUjBGQlJ5eEhRVUZITEVOQlFVTXNRMEZCUXl4RFFVRkRPM05DUVVONlF5eEpRVUZKTEVsQlFVa3NSMEZCUnp0M1FrRkRWQ3hQUVVGUExFVkJRVVVzU1VGQlNTeERRVUZETEc5Q1FVRnZRaXhEUVVGRExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTTdkVUpCUXpkRExFTkJRVU03UVVGRGVFSXNjMEpCUVhOQ0xFbEJRVWtzUzBGQlN5eERRVUZET3p0elFrRkZWaXhKUVVGSkxFZEJRVWNzU1VGQlNTeFhRVUZYTEVWQlFVVTdNRUpCUTNCQ0xHVkJRV1VzUTBGQlF5eERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZMRWxCUVVrc1EwRkJReXhEUVVGRE96QkNRVU5vUXl4TlFVRk5MRU5CUVVNc1NVRkJTU3hEUVVGRE96aENRVU5TTEU5QlFVOHNSVUZCUlN4RFFVRkRMRU5CUVVNc1RVRkJUVHM0UWtGRGFrSXNTMEZCU3l4RlFVRkZMRlZCUVZVc1EwRkJReXhaUVVGWk8ydERRVU14UWl4WFFVRlhMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0clEwRkROVUlzWlVGQlpTeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03SzBKQlEzQkRMRVZCUVVVc1IwRkJSeXhEUVVGRE96SkNRVU5XTEVOQlFVTXNRMEZCUXp0QlFVTTNRaXgxUWtGQmRVSTdPM05DUVVWRUxFbEJRVWtzUjBGQlJ5eEpRVUZKTEZWQlFWVXNSVUZCUlRzd1FrRkRia0lzUzBGQlN5eEpRVUZKTEVOQlFVTXNSMEZCUnl4RFFVRkRMRVZCUVVVc1EwRkJReXhIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZOTEVWQlFVVXNRMEZCUXl4RlFVRkZMRVZCUVVVN09FSkJRM0JETEVsQlFVa3NUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFOUJRVThzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZPMnREUVVNdlFpeFpRVUZaTEVOQlFVTXNUVUZCVFN4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExFdEJRVXNzUTBGQlF5eERRVUZETzJ0RFFVTTVRaXhOUVVGTkxFTkJRVU1zVFVGQlRTeERRVUZETEVOQlFVTXNSVUZCUlN4RFFVRkRMRU5CUVVNc1EwRkJRenRyUTBGRGNFSXNUVUZCVFRzclFrRkRWRHN5UWtGRFNqc3dRa0ZEUkN4bFFVRmxMRU5CUVVNc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJTeExRVUZMTEVOQlFVTXNRMEZCUXpzd1FrRkRha01zVjBGQlZ5eERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03UVVGRGRrUXNkVUpCUVhWQ096dHpRa0ZGUkN4SlFVRkpMR2xDUVVGcFFpeERRVUZETEVOQlFVTXNRMEZCUXl4TlFVRk5MRVZCUVVVc1IwRkJSeXhEUVVGRExFVkJRVVU3ZDBKQlEzQkRMRWxCUVVrc1EwRkJReXhEUVVGRExFdEJRVXNzU1VGQlNTeERRVUZETEVOQlFVTXNUVUZCVFN4RlFVRkZPekJDUVVOMlFpeEpRVUZKTEVOQlFVTXNUVUZCVFN4SFFVRkhMRU5CUVVNc1EwRkJReXhMUVVGTExFbEJRVWtzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXp0QlFVTTFSQ3g1UWtGQmVVSTdRVUZEZWtJN08zZENRVVYzUWl4SlFVRkpMRWRCUVVjc1MwRkJTeXhSUVVGUkxFVkJRVVU3TUVKQlEzQkNMRWxCUVVrc1EwRkJReXhWUVVGVkxFZEJRVWM3TkVKQlEyaENMRTlCUVU4c1IwRkJSeXhEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEV0QlFVczdORUpCUTNoQ0xGTkJRVk1zUlVGQlJTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRTlCUVU4N01rSkJRelZDTEVOQlFVTTdRVUZETlVJc2VVSkJRWGxDT3p0M1FrRkZSQ3hKUVVGSkxFTkJRVU1zWVVGQllTeERRVUZETEVkQlFVY3NSVUZCUlN4SlFVRkpMRVZCUVVVc1IwRkJSeXhEUVVGRExFTkJRVU03ZFVKQlEzQkRPMEZCUTNaQ0xHbENRVUZwUWpzN1FVRkZha0lzWVVGQllTeERRVUZETzBGQlEyUTdPMWxCUlZrc1EwRkJReXhKUVVGSkxFTkJRVU1zWTBGQll5eEhRVUZITEVsQlFVa3NRMEZCUXl4alFVRmpMRWxCUVVrc1JVRkJSU3hGUVVGRkxFZEJRVWNzUTBGQlF5eEhRVUZITEU5QlFVOHNRMEZCUXp0WlFVTnFSU3hQUVVGUExFOUJRVThzUTBGQlF6dFRRVU5zUWl4RlFVRkZMRTFCUVUwc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eEZRVUZGTEVsQlFVa3NRMEZCUXl4RFFVRkRPMEZCUXpkQ0xFdEJRVXM3TzBsQlJVUXNTVUZCU1N4VFFVRlRMRWRCUVVjN1VVRkRXaXhMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3VVVGRFdDeExRVUZMTEVWQlFVVXNTVUZCU1R0UlFVTllMRXRCUVVzc1JVRkJSU3hKUVVGSk8xRkJRMWdzUzBGQlN5eEZRVUZGTEVsQlFVazdVVUZEV0N4TFFVRkxMRVZCUVVVc1NVRkJTVHRSUVVOWUxFdEJRVXNzUlVGQlJTeEpRVUZKTzFGQlExZ3NTMEZCU3l4RlFVRkZMRWxCUVVrN1VVRkRXQ3hMUVVGTExFVkJRVVVzU1VGQlNUdFJRVU5ZTEV0QlFVc3NSVUZCUlN4SlFVRkpPMUZCUTFnc1MwRkJTeXhGUVVGRkxFbEJRVWs3UVVGRGJrSXNTMEZCU3l4RFFVRkRPenRKUVVWR0xFbEJRVWtzVVVGQlVTeEhRVUZITzFGQlExZ3NTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEhRVUZITzFGQlExUXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMUZCUTFRc1NVRkJTU3hGUVVGRkxFZEJRVWM3VVVGRFZDeEpRVUZKTEVWQlFVVXNSMEZCUnp0UlFVTlVMRWxCUVVrc1JVRkJSU3hIUVVGSE8xRkJRMVFzU1VGQlNTeEZRVUZGTEVkQlFVYzdVVUZEVkN4SlFVRkpMRVZCUVVVc1IwRkJSenRSUVVOVUxFbEJRVWtzUlVGQlJTeEpRVUZKTzFGQlExWXNTVUZCU1N4RlFVRkZMRWRCUVVjN1VVRkRWQ3hKUVVGSkxFVkJRVVVzUjBGQlJ6dFJRVU5VTEVsQlFVa3NSVUZCUlN4SFFVRkhPMEZCUTJwQ0xFdEJRVXNzUTBGQlF6czdTVUZGUml4VFFVRlRMR1ZCUVdVc1JVRkJSU3hEUVVGRExFVkJRVVU3VVVGRGVrSXNTVUZCU1N4RFFVRkRMRU5CUVVNc1UwRkJVenRCUVVOMlFpeFpRVUZaTEU5QlFVODdPMUZCUlZnc1NVRkJTU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zU1VGQlNTeHBRa0ZCYVVJc1EwRkJReXhEUVVGRExFTkJRVU1zVFVGQlRTeEZRVUZGTEZWQlFWVXNRMEZCUXl4RlFVRkZPMEZCUTNCR0xGbEJRVmtzU1VGQlNTeERRVUZETEVkQlFVY3NRMEZCUXl4RFFVRkRMRXRCUVVzc1EwRkJRenRCUVVNMVFqdEJRVU5CT3p0WlFVVlpMRWxCUVVrc1UwRkJVeXhEUVVGRExHTkJRV01zUTBGQlF5eERRVUZETEVOQlFVTXNSVUZCUlR0blFrRkROMElzUTBGQlF5eEhRVUZITEZOQlFWTXNRMEZCUXl4RFFVRkRMRU5CUVVNc1EwRkJRenRCUVVOcVF5eGhRVUZoT3p0WlFVVkVMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zVVVGQlVTeExRVUZMTEVOQlFVTXNTVUZCU1N4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlF5eEZRVUZGTzJkQ1FVTnlReXhEUVVGRExFZEJRVWNzVFVGQlRTeERRVUZETEZsQlFWa3NRMEZCUXl4RFFVRkRMRWRCUVVjc1JVRkJSU3hEUVVGRExFTkJRVU03UVVGRGFFUXNZVUZCWVN4TlFVRk5MRWxCUVVrc1EwRkJReXhEUVVGRExGRkJRVkVzU1VGQlNTeFJRVUZSTEVOQlFVTXNZMEZCWXl4RFFVRkRMRU5CUVVNc1EwRkJReXhGUVVGRk96dG5Ra0ZGYWtRc1EwRkJReXhIUVVGSExGRkJRVkVzUTBGQlF5eERRVUZETEVOQlFVTXNRMEZCUXp0aFFVTnVRaXhOUVVGTk8yZENRVU5JTEVOQlFVTXNSMEZCUnl4TlFVRk5MRU5CUVVNc1dVRkJXU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETzBGQlF6TkRMR0ZCUVdFN08xbEJSVVFzU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4VlFVRlZMRVZCUVVVN1owSkJRek5DTEU5QlFVOHNSVUZCUlN4SlFVRkpMRU5CUVVNc2IwSkJRVzlDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRTFCUVUwc1EwRkJRenRuUWtGRE5VTXNSMEZCUnl4RlFVRkZMRU5CUVVNN1owSkJRMDRzVTBGQlV5eEZRVUZGTEVOQlFVTXNRMEZCUXl4TlFVRk5MRU5CUVVNc1MwRkJTenRuUWtGRGVrSXNTMEZCU3l4RlFVRkZMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zUzBGQlN5eEhRVUZITEVOQlFVTTdaMEpCUTNwQ0xFOUJRVThzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHp0aFFVTnlRaXhEUVVGRExFTkJRVU03VTBGRFRqdEJRVU5VTEV0QlFVczdPMEZCUlV3c1NVRkJTU3hSUVVGUkxFTkJRVU1zWjBKQlFXZENMRU5CUVVNc1ZVRkJWU3hGUVVGRkxHVkJRV1VzUlVGQlJTeEpRVUZKTEVOQlFVTXNRMEZCUXp0QlFVTnFSVHM3U1VGRlNTeERRVUZETEVsQlFVa3NRMEZCUXl4alFVRmpMRWRCUVVjc1NVRkJTU3hEUVVGRExHTkJRV01zU1VGQlNTeEZRVUZGTEVWQlFVVXNWVUZCVlN4RFFVRkRMRWRCUVVjc1pVRkJaU3hEUVVGRE8wRkJRM0JHTEVOQlFVTTdPMEZCUlVRc1UwRkJVeXhyUWtGQmEwSXNRMEZCUXl4SlFVRkpMRVZCUVVVN1NVRkRPVUlzU1VGQlNTeEhRVUZITEVsQlFVa3NRMEZCUXl4UFFVRlBMRU5CUVVNc1RVRkJUU3hGUVVGRkxFdEJRVXNzUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXl4TlFVRk5MRVZCUVVVc1MwRkJTeXhEUVVGRExFTkJRVU03U1VGRE1VUXNTVUZCU1N4TFFVRkxMRWRCUVVjc1NVRkJTU3hOUVVGTkxFTkJRVU1zVVVGQlVTeEhRVUZITEVsQlFVa3NSMEZCUnl4WFFVRlhMRU5CUVVNN1VVRkRha1FzVDBGQlR5eEhRVUZITEV0QlFVc3NRMEZCUXl4SlFVRkpMRU5CUVVNc1VVRkJVU3hEUVVGRExFMUJRVTBzUTBGQlF5eERRVUZETzBsQlF6RkRMRTlCUVU4c1QwRkJUeXhMUVVGTExFbEJRVWtzUjBGQlJ5eEZRVUZGTEVkQlFVY3NhMEpCUVd0Q0xFTkJRVU1zVDBGQlR5eERRVUZETEVOQlFVTXNRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJReXhMUVVGTExFVkJRVVVzUjBGQlJ5eERRVUZETEVOQlFVTXNRMEZCUXp0QlFVTjBSaXhEUVVGRE96dEJRVVZFTEZOQlFWTXNZVUZCWVN4SFFVRkhPMFZCUTNaQ0xFbEJRVWtzVVVGQlVTeERRVUZETEZWQlFWVXNTVUZCU1N4VlFVRlZMRVZCUVVVN1FVRkRla01zU1VGQlNTeEpRVUZKTEVOQlFVTXNTVUZCU1N4RlFVRkZMRU5CUVVNc1NVRkJTU3hEUVVGRExGbEJRVms3TzBGQlJXcERMRkZCUVZFc2FVSkJRV2xDTEVWQlFVVXNRMEZCUXpzN1VVRkZjRUlzU1VGQlNTeEpRVUZKTEVOQlFVTXNWMEZCVnl4RlFVRkZMRVZCUVVVN1dVRkRjRUlzU1VGQlNTeERRVUZETEdGQlFXRXNRMEZCUXl4TlFVRk5MRVZCUVVVN1owSkJRM1pDTEVkQlFVY3NSVUZCUlR0dlFrRkRSQ3hSUVVGUkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4UlFVRlJPMjlDUVVOc1F5eEpRVUZKTEVWQlFVVXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhKUVVGSk8yOUNRVU14UWl4TlFVRk5MRVZCUVVVc1RVRkJUU3hEUVVGRExGRkJRVkVzUTBGQlF5eE5RVUZOTzI5Q1FVTTVRaXhKUVVGSkxFVkJRVVVzVFVGQlRTeERRVUZETEZGQlFWRXNRMEZCUXl4SlFVRkpPMmxDUVVNM1FqdGhRVU5LTEVOQlFVTXNRMEZCUXp0VFFVTk9PMHRCUTBvc1EwRkJReXhEUVVGRE8wZEJRMG83UVVGRFNDeERRVUZET3p0QlFVVkVMR0ZCUVdFc1JVRkJSU3hEUVVGRE8wRkJRMmhDTEZGQlFWRXNRMEZCUXl4blFrRkJaMElzUTBGQlF5eHJRa0ZCYTBJc1JVRkJSU3hoUVVGaExFTkJRVU1zUTBGQlF6czdRVUZGTjBRc1RVRkJUU3hEUVVGRExHZENRVUZuUWl4RFFVRkRMRkZCUVZFc1JVRkJSU3haUVVGWk8wbEJRekZETEVsQlFVa3NRMEZCUXl4TlFVRk5MRVZCUVVVc1EwRkJRenRCUVVOc1FpeERRVUZETEVWQlFVVXNTVUZCU1N4RFFVRkRMRU5CUVVNN08wRkJSVlFzVFVGQlRTeERRVUZETEdkQ1FVRm5RaXhEUVVGRExFOUJRVThzUlVGQlJTeFZRVUZWTEVkQlFVY3NSVUZCUlR0SlFVTTFReXhKUVVGSkxFTkJRVU1zVTBGQlV5eERRVUZETEdkQ1FVRm5RaXhIUVVGSExFZEJRVWNzUTBGQlF5eFBRVUZQTEVkQlFVY3NSMEZCUnl4SFFVRkhMRWRCUVVjc1EwRkJReXhIUVVGSExFZEJRVWNzUjBGQlJ5eEhRVUZITEVkQlFVY3NRMEZCUXl4SlFVRkpMRWRCUVVjc1IwRkJSeXhIUVVGSExFZEJRVWNzUTBGQlF5eEhRVUZITEVOQlFVTXNRMEZCUXp0QlFVTndSeXhEUVVGRExFTkJRVU1zUTBGQlF6czdRVUZGU0N4TlFVRk5MRU5CUVVNc1QwRkJUeXhIUVVGSExFbEJRVWtzUTBGQlF5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJblpoY2lCZklEMGdjbVZ4ZFdseVpTZ25MaTkxZEdsc2N5Y3BPMXh1ZG1GeUlGQnliMjFwYzJVZ1BTQnlaWEYxYVhKbEtDZGxjell0Y0hKdmJXbHpaU2NwTGxCeWIyMXBjMlU3WEc1MllYSWdVMmx0ZFd4aGRHVWdQU0J5WlhGMWFYSmxLQ2N1TDNOcGJYVnNZWFJsSnlrN1hHNTJZWElnYzJWc1pXTjBiM0pHYVc1a1pYSWdQU0J5WlhGMWFYSmxLQ2N1TDNObGJHVmpkRzl5Um1sdVpHVnlKeWs3WEc1MllYSWdVMlYwZEdsdVozTWdQU0J5WlhGMWFYSmxLQ2N1TDNObGRIUnBibWR6SnlrN1hHNWNiaTh2SUhaaGNpQnRlVWRsYm1WeVlYUnZjaUE5SUc1bGR5QkRjM05UWld4bFkzUnZja2RsYm1WeVlYUnZjaWdwTzF4dWRtRnlJR2x0Y0c5eWRHRnVkRk4wWlhCTVpXNW5kR2dnUFNBMU1EQTdYRzUyWVhJZ2MyRjJaVWhoYm1Sc1pYSnpJRDBnVzEwN1hHNTJZWElnY21Wd2IzSjBTR0Z1Wkd4bGNuTWdQU0JiWFR0Y2JuWmhjaUJzYjJGa1NHRnVaR3hsY25NZ1BTQmJYVHRjYm5aaGNpQnpaWFIwYVc1bmMweHZZV1JJWVc1a2JHVnljeUE5SUZ0ZE8xeHVYRzVtZFc1amRHbHZiaUJuWlhSVFkyVnVZWEpwYnlodVlXMWxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVJQ2h5WlhOdmJIWmxMQ0J5WldwbFkzUXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHeHZZV1JJWVc1a2JHVnljeTVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQnpkR0YwWlNBOUlIVjBiV1V1YzNSaGRHVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElITjBZWFJsTG5OalpXNWhjbWx2Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHRjBaUzV6WTJWdVlYSnBiM05iYVYwdWJtRnRaU0E5UFQwZ2JtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtITjBZWFJsTG5OalpXNWhjbWx2YzF0cFhTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYkc5aFpFaGhibVJzWlhKeld6QmRLRzVoYldVc0lHWjFibU4wYVc5dUlDaHlaWE53S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNoeVpYTndLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU2s3WEc1OVhHNTJZWElnZG1Gc2FXUmhkR2x1WnlBOUlHWmhiSE5sTzF4dVhHNTJZWElnWlhabGJuUnpJRDBnVzF4dUlDQWdJQ2RqYkdsamF5Y3NYRzRnSUNBZ0oyWnZZM1Z6Snl4Y2JpQWdJQ0FuWW14MWNpY3NYRzRnSUNBZ0oyUmliR05zYVdOckp5eGNiaUFnSUNBdkx5QW5aSEpoWnljc1hHNGdJQ0FnTHk4Z0oyUnlZV2RsYm5SbGNpY3NYRzRnSUNBZ0x5OGdKMlJ5WVdkc1pXRjJaU2NzWEc0Z0lDQWdMeThnSjJSeVlXZHZkbVZ5Snl4Y2JpQWdJQ0F2THlBblpISmhaM04wWVhKMEp5eGNiaUFnSUNBdkx5QW5hVzV3ZFhRbkxGeHVJQ0FnSUNkdGIzVnpaV1J2ZDI0bkxGeHVJQ0FnSUM4dklDZHRiM1Z6WlcxdmRtVW5MRnh1SUNBZ0lDZHRiM1Z6WldWdWRHVnlKeXhjYmlBZ0lDQW5iVzkxYzJWc1pXRjJaU2NzWEc0Z0lDQWdKMjF2ZFhObGIzVjBKeXhjYmlBZ0lDQW5iVzkxYzJWdmRtVnlKeXhjYmlBZ0lDQW5iVzkxYzJWMWNDY3NYRzRnSUNBZ0oyTm9ZVzVuWlNjc1hHNGdJQ0FnTHk4Z0ozSmxjMmw2WlNjc1hHNGdJQ0FnTHk4Z0ozTmpjbTlzYkNkY2JsMDdYRzVjYm1aMWJtTjBhVzl1SUdkbGRFTnZibVJwZEdsdmJuTW9jMk5sYm1GeWFXOHNJR052Ym1ScGRHbHZibFI1Y0dVcElIdGNiaUFnZG1GeUlITmxkSFZ3SUQwZ2MyTmxibUZ5YVc5YlkyOXVaR2wwYVc5dVZIbHdaVjA3WEc0Z0lIWmhjaUJ6WTJWdVlYSnBiM01nUFNCelpYUjFjQ0FtSmlCelpYUjFjQzV6WTJWdVlYSnBiM003WEc0Z0lDOHZJRlJQUkU4NklFSnlaV0ZySUc5MWRDQnBiblJ2SUdobGJIQmxjbHh1SUNCcFppQW9jMk5sYm1GeWFXOXpLU0I3WEc0Z0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdVlXeHNLRjh1YldGd0tITmpaVzVoY21sdmN5d2dablZ1WTNScGIyNGdLSE5qWlc1aGNtbHZUbUZ0WlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdkbGRGTmpaVzVoY21sdktITmpaVzVoY21sdlRtRnRaU2t1ZEdobGJpaG1kVzVqZEdsdmJpQW9iM1JvWlhKVFkyVnVZWEpwYnlrZ2UxeHVJQ0FnSUNBZ0lDQnZkR2hsY2xOalpXNWhjbWx2SUQwZ1NsTlBUaTV3WVhKelpTaEtVMDlPTG5OMGNtbHVaMmxtZVNodmRHaGxjbE5qWlc1aGNtbHZLU2s3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6WlhSMWNFTnZibVJwZEdsdmJuTW9iM1JvWlhKVFkyVnVZWEpwYnlrdWRHaGxiaWhtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkbUZ5SUhSdlVtVjBkWEp1SUQwZ1cxMDdYRzRnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCdmRHaGxjbE5qWlc1aGNtbHZMbk4wWlhCekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBiMUpsZEhWeWJpNXdkWE5vS0c5MGFHVnlVMk5sYm1GeWFXOHVjM1JsY0hOYmFWMHBPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHOVNaWFIxY200N1hHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmU2twTzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9XMTBwTzF4dUlDQjlYRzU5WEc1Y2JtWjFibU4wYVc5dUlHZGxkRkJ5WldOdmJtUnBkR2x2Ym5NZ0tITmpaVzVoY21sdktTQjdYRzRnSUhKbGRIVnliaUJuWlhSRGIyNWthWFJwYjI1ektITmpaVzVoY21sdkxDQW5jMlYwZFhBbktUdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVRzl6ZEdOdmJtUnBkR2x2Ym5NZ0tITmpaVzVoY21sdktTQjdYRzRnSUhKbGRIVnliaUJuWlhSRGIyNWthWFJwYjI1ektITmpaVzVoY21sdkxDQW5ZMnhsWVc1MWNDY3BPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQmZZMjl1WTJGMFUyTmxibUZ5YVc5VGRHVndUR2x6ZEhNb2MzUmxjSE1wSUh0Y2JpQWdJQ0IyWVhJZ2JtVjNVM1JsY0hNZ1BTQmJYVHRjYmlBZ0lDQjJZWElnWTNWeWNtVnVkRlJwYldWemRHRnRjRHNnTHk4Z2FXNXBkR0ZzYVhwbFpDQmllU0JtYVhKemRDQnNhWE4wSUc5bUlITjBaWEJ6TGx4dUlDQWdJR1p2Y2lBb2RtRnlJR29nUFNBd095QnFJRHdnYzNSbGNITXViR1Z1WjNSb095QnFLeXNwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1pzWVhSVGRHVndjeUE5SUhOMFpYQnpXMnBkTzF4dUlDQWdJQ0FnSUNCcFppQW9haUErSURBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdzZ1BTQXdPeUJySUR3Z2MzUmxjSE11YkdWdVozUm9PeUJyS3lzcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzNSbGNDQTlJR1pzWVhSVGRHVndjMXRyWFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdaR2xtWmlBOUlHc2dQaUF3SUQ4Z2MzUmxjQzUwYVcxbFUzUmhiWEFnTFNCbWJHRjBVM1JsY0hOYmF5QXRJREZkTG5ScGJXVlRkR0Z0Y0NBNklEVXdPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR04xY25KbGJuUlVhVzFsYzNSaGJYQWdLejBnWkdsbVpqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1iR0YwVTNSbGNITmJhMTB1ZEdsdFpWTjBZVzF3SUQwZ1kzVnljbVZ1ZEZScGJXVnpkR0Z0Y0R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTjFjbkpsYm5SVWFXMWxjM1JoYlhBZ1BTQm1iR0YwVTNSbGNITmJhbDB1ZEdsdFpWTjBZVzF3TzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lHNWxkMU4wWlhCeklEMGdibVYzVTNSbGNITXVZMjl1WTJGMEtHWnNZWFJUZEdWd2N5azdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ1WlhkVGRHVndjenRjYm4xY2JseHVablZ1WTNScGIyNGdjMlYwZFhCRGIyNWthWFJwYjI1eklDaHpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lIWmhjaUJ3Y205dGFYTmxjeUE5SUZ0ZE8xeHVJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbUZzYkNoYlhHNGdJQ0FnSUNBZ0lHZGxkRkJ5WldOdmJtUnBkR2x2Ym5Nb2MyTmxibUZ5YVc4cExGeHVJQ0FnSUNBZ0lDQm5aWFJRYjNOMFkyOXVaR2wwYVc5dWN5aHpZMlZ1WVhKcGJ5bGNiaUFnSUNCZEtTNTBhR1Z1S0daMWJtTjBhVzl1SUNoemRHVndRWEp5WVhsektTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCemRHVndUR2x6ZEhNZ1BTQnpkR1Z3UVhKeVlYbHpXekJkTG1OdmJtTmhkQ2hiYzJObGJtRnlhVzh1YzNSbGNITmRMQ0J6ZEdWd1FYSnlZWGx6V3pGZEtUdGNiaUFnSUNBZ0lDQWdjMk5sYm1GeWFXOHVjM1JsY0hNZ1BTQmZZMjl1WTJGMFUyTmxibUZ5YVc5VGRHVndUR2x6ZEhNb2MzUmxjRXhwYzNSektUdGNiaUFnSUNCOUtUdGNibjFjYmx4dVpuVnVZM1JwYjI0Z2NuVnVVM1JsY0NoelkyVnVZWEpwYnl3Z2FXUjRMQ0IwYjFOcmFYQXBJSHRjYmlBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblVsVk9Ua2xPUjE5VFZFVlFKeWs3WEc0Z0lDQWdkRzlUYTJsd0lEMGdkRzlUYTJsd0lIeDhJSHQ5TzF4dVhHNGdJQ0FnZG1GeUlITjBaWEFnUFNCelkyVnVZWEpwYnk1emRHVndjMXRwWkhoZE8xeHVJQ0FnSUhaaGNpQnpkR0YwWlNBOUlIVjBiV1V1YzNSaGRHVTdYRzRnSUNBZ2FXWWdLSE4wWlhBZ0ppWWdjM1JoZEdVdWMzUmhkSFZ6SUQwOUlDZFFURUZaU1U1SEp5a2dlMXh1SUNBZ0lDQWdJQ0J6ZEdGMFpTNXlkVzR1YzJObGJtRnlhVzhnUFNCelkyVnVZWEpwYnp0Y2JpQWdJQ0FnSUNBZ2MzUmhkR1V1Y25WdUxuTjBaWEJKYm1SbGVDQTlJR2xrZUR0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2RzYjJGa0p5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJRzVsZDB4dlkyRjBhVzl1SUQwZ2MzUmxjQzVrWVhSaExuVnliQzV3Y205MGIyTnZiQ0FySUZ3aUx5OWNJaUFySUhOMFpYQXVaR0YwWVM1MWNtd3VhRzl6ZER0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCelpXRnlZMmdnUFNCemRHVndMbVJoZEdFdWRYSnNMbk5sWVhKamFEdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm9ZWE5vSUQwZ2MzUmxjQzVrWVhSaExuVnliQzVvWVhOb08xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jMlZoY21Ob0lDWW1JQ0Z6WldGeVkyZ3VZMmhoY2tGMEtGd2lQMXdpS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxZWEpqYUNBOUlGd2lQMXdpSUNzZ2MyVmhjbU5vTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJR2x6VTJGdFpWVlNUQ0E5SUNoc2IyTmhkR2x2Ymk1d2NtOTBiMk52YkNBcklGd2lMeTljSWlBcklHeHZZMkYwYVc5dUxtaHZjM1FnS3lCc2IyTmhkR2x2Ymk1elpXRnlZMmdwSUQwOVBTQW9ibVYzVEc5allYUnBiMjRnS3lCelpXRnlZMmdwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkMmx1Wkc5M0xteHZZMkYwYVc5dUxuSmxjR3hoWTJVb2JtVjNURzlqWVhScGIyNGdLeUJvWVhOb0lDc2djMlZoY21Ob0tUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFYwYldVdWMzUmhkR1V1YzJWMGRHbHVaM011WjJWMEtGd2lkbVZ5WW05elpWd2lLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emIyeGxMbXh2Wnlnb2JHOWpZWFJwYjI0dWNISnZkRzlqYjJ3Z0t5QnNiMk5oZEdsdmJpNW9iM04wSUNzZ2JHOWpZWFJwYjI0dWMyVmhjbU5vS1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdOdmJuTnZiR1V1Ykc5bktDaHpkR1Z3TG1SaGRHRXVkWEpzTG5CeWIzUnZZMjlzSUNzZ2MzUmxjQzVrWVhSaExuVnliQzVvYjNOMElDc2djM1JsY0M1a1lYUmhMblZ5YkM1elpXRnlZMmdwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnU1dZZ2QyVWdhR0YyWlNCdWIzUWdZMmhoYm1kbFpDQjBhR1VnWVdOMGRXRnNJR3h2WTJGMGFXOXVMQ0IwYUdWdUlIUm9aU0JzYjJOaGRHbHZiaTV5WlhCc1lXTmxYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QjNhV3hzSUc1dmRDQm5ieUJoYm5sM2FHVnlaVnh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR2x6VTJGdFpWVlNUQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhkcGJtUnZkeTVzYjJOaGRHbHZiaTV5Wld4dllXUW9kSEoxWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHpkR1Z3TG1WMlpXNTBUbUZ0WlNBOVBTQW5kR2x0Wlc5MWRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGMFpTNWhkWFJ2VW5WdUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjblZ1VG1WNGRGTjBaWEFvYzJObGJtRnlhVzhzSUdsa2VDd2dkRzlUYTJsd0xDQnpkR1Z3TG1SaGRHRXVZVzF2ZFc1MEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCc2IyTmhkRzl5SUQwZ2MzUmxjQzVrWVhSaExteHZZMkYwYjNJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2MzUmxjSE1nUFNCelkyVnVZWEpwYnk1emRHVndjenRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUIxYm1seGRXVkpaQ0E5SUdkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2s3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhSeWVTQjBieUJuWlhRZ2NtbGtJRzltSUhWdWJtVmpaWE56WVhKNUlITjBaWEJ6WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JSFJ2VTJ0cGNGdDFibWx4ZFdWSlpGMGdQVDBnSjNWdVpHVm1hVzVsWkNjZ0ppWWdkWFJ0WlM1emRHRjBaUzV6WlhSMGFXNW5jeTVuWlhRb1hDSnlkVzV1WlhJdWMzQmxaV1JjSWlrZ0lUMGdKM0psWVd4MGFXMWxKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ1pHbG1aanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdsbmJtOXlaU0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnFJRDBnYzNSbGNITXViR1Z1WjNSb0lDMGdNVHNnYWlBK0lHbGtlRHNnYWkwdEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUc5MGFHVnlVM1JsY0NBOUlITjBaWEJ6VzJwZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ2ZEdobGNsVnVhWEYxWlVsa0lEMGdaMlYwVlc1cGNYVmxTV1JHY205dFUzUmxjQ2h2ZEdobGNsTjBaWEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDFibWx4ZFdWSlpDQTlQVDBnYjNSb1pYSlZibWx4ZFdWSlpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRmthV1ptS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkdsbVppQTlJQ2h2ZEdobGNsTjBaWEF1ZEdsdFpWTjBZVzF3SUMwZ2MzUmxjQzUwYVcxbFUzUmhiWEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xuYm05eVpTQTlJQ0ZwYzBsdGNHOXlkR0Z1ZEZOMFpYQW9iM1JvWlhKVGRHVndLU0FtSmlCa2FXWm1JRHdnYVcxd2IzSjBZVzUwVTNSbGNFeGxibWQwYUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9hWE5KYm5SbGNtRmpkR2wyWlZOMFpYQW9iM1JvWlhKVGRHVndLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xuYm05eVpTQTlJR1poYkhObE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhSdlUydHBjRnQxYm1seGRXVkpaRjBnUFNCcFoyNXZjbVU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJRmRsSjNKbElITnJhWEJ3YVc1bklIUm9hWE1nWld4bGJXVnVkRnh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFJ2VTJ0cGNGdG5aWFJWYm1seGRXVkpaRVp5YjIxVGRHVndLSE4wWlhBcFhTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEoxYms1bGVIUlRkR1Z3S0hOalpXNWhjbWx2TENCcFpIZ3NJSFJ2VTJ0cGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdacGJtUkZiR1Z0Wlc1MFYybDBhRXh2WTJGMGIzSW9jMk5sYm1GeWFXOHNJSE4wWlhBc0lHeHZZMkYwYjNJc0lHZGxkRlJwYldWdmRYUW9jMk5sYm1GeWFXOHNJR2xrZUNrcExuUm9aVzRvWm5WdVkzUnBiMjRnS0dWc1pYTXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQmxiR1VnUFNCbGJHVnpXekJkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSFJoWjA1aGJXVWdQU0JsYkdVdWRHRm5UbUZ0WlM1MGIweHZkMlZ5UTJGelpTZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlITjFjSEJ2Y25SelNXNXdkWFJGZG1WdWRDQTlJSFJoWjA1aGJXVWdQVDA5SUNkcGJuQjFkQ2NnZkh3Z2RHRm5UbUZ0WlNBOVBUMGdKM1JsZUhSaGNtVmhKeUI4ZkNCbGJHVXVaMlYwUVhSMGNtbGlkWFJsS0NkamIyNTBaVzUwWldScGRHRmliR1VuS1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMlpXNTBjeTVwYm1SbGVFOW1LSE4wWlhBdVpYWmxiblJPWVcxbEtTQStQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCdmNIUnBiMjV6SUQwZ2UzMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkR1Z3TG1SaGRHRXVZblYwZEc5dUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IzQjBhVzl1Y3k1M2FHbGphQ0E5SUc5d2RHbHZibk11WW5WMGRHOXVJRDBnYzNSbGNDNWtZWFJoTG1KMWRIUnZianRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUM4dklGTmxkQ0JsYkdWdFpXNTBJSE4wWVhSbFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYzNSbGNDNWtZWFJoTG5aaGJIVmxJQ0U5SUZ3aWRXNWtaV1pwYm1Wa1hDSWdmSHdnZEhsd1pXOW1JSE4wWlhBdVpHRjBZUzVoZEhSeWFXSjFkR1Z6SUNFOUlGd2lkVzVrWldacGJtVmtYQ0lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2RHOUJjSEJzZVNBOUlITjBaWEF1WkdGMFlTNWhkSFJ5YVdKMWRHVnpJRDhnYzNSbGNDNWtZWFJoTG1GMGRISnBZblYwWlhNZ09pQjdJRndpZG1Gc2RXVmNJam9nYzNSbGNDNWtZWFJoTG5aaGJIVmxJSDA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdYeTVsZUhSbGJtUW9aV3hsTENCMGIwRndjR3g1S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDOHZJR052Ym5OdmJHVXViRzluS0NkVGFXMTFiR0YwYVc1bklDY2dLeUJ6ZEdWd0xtVjJaVzUwVG1GdFpTQXJJQ2NnYjI0Z1pXeGxiV1Z1ZENBbkxDQmxiR1VzSUd4dlkyRjBiM0l1YzJWc1pXTjBiM0p6V3pCZExDQmNJaUJtYjNJZ2MzUmxjQ0JjSWlBcklHbGtlQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2dvYzNSbGNDNWxkbVZ1ZEU1aGJXVWdQVDBnSjJadlkzVnpKeUI4ZkNCemRHVndMbVYyWlc1MFRtRnRaU0E5UFNBbllteDFjaWNwSUNZbUlHVnNaVnR6ZEdWd0xtVjJaVzUwVG1GdFpWMHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxiR1ZiYzNSbGNDNWxkbVZ1ZEU1aGJXVmRLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMDlJQ2RqYUdGdVoyVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0F2THlCR2IzSWdZbkp2ZDNObGNuTWdkR2hoZENCemRYQndiM0owSUhSb1pTQnBibkIxZENCbGRtVnVkQzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRYQndiM0owYzBsdWNIVjBSWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaUzVsZG1WdWRDaGxiR1VzSUNkcGJuQjFkQ2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnVTJsdGRXeGhkR1V1WlhabGJuUW9aV3hsTENBblkyaGhibWRsSnlrN0lDOHZJRlJvYVhNZ2MyaHZkV3hrSUdKbElHWnBjbVZrSUdGbWRHVnlJR0VnWW14MWNpQmxkbVZ1ZEM1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCVGFXMTFiR0YwWlZ0emRHVndMbVYyWlc1MFRtRnRaVjBvWld4bExDQnZjSFJwYjI1ektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MzUmxjQzVsZG1WdWRFNWhiV1VnUFQwZ0oydGxlWEJ5WlhOekp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdhMlY1SUQwZ1UzUnlhVzVuTG1aeWIyMURhR0Z5UTI5a1pTaHpkR1Z3TG1SaGRHRXVhMlY1UTI5a1pTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZOcGJYVnNZWFJsTG10bGVXUnZkMjRvWld4bExDQnJaWGtwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQlRhVzExYkdGMFpTNXJaWGx3Y21WemN5aGxiR1VzSUd0bGVTazdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pXeGxMblpoYkhWbElEMGdjM1JsY0M1a1lYUmhMblpoYkhWbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaUzVsZG1WdWRDaGxiR1VzSUNkamFHRnVaMlVuS1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JUYVcxMWJHRjBaUzVyWlhsMWNDaGxiR1VzSUd0bGVTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHpkWEJ3YjNKMGMwbHVjSFYwUlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRk5wYlhWc1lYUmxMbVYyWlc1MEtHVnNaU3dnSjJsdWNIVjBKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWlhBdVpYWmxiblJPWVcxbElEMDlJQ2QyWVd4cFpHRjBaU2NnSmlZZ2RYUnRaUzV6ZEdGMFpTNXpaWFIwYVc1bmN5NW5aWFFvSjNabGNtSnZjMlVuS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5Z25WbUZzYVdSaGRHVTZJQ2NnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hzYjJOaGRHOXlMbk5sYkdWamRHOXljeWtnSUNzZ1hDSWdZMjl1ZEdGcGJuTWdkR1Y0ZENBblhDSWdJQ3NnYzNSbGNDNWtZWFJoTG5SbGVIUWdLeUJjSWlkY0lpazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGMFpTNWhkWFJ2VW5WdUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKMWJrNWxlSFJUZEdWd0tITmpaVzVoY21sdkxDQnBaSGdzSUhSdlUydHBjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTd2dablZ1WTNScGIyNGdLSEpsYzNWc2RDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jM1JsY0M1bGRtVnVkRTVoYldVZ1BUMGdKM1poYkdsa1lYUmxKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lWbUZzYVdSaGRHVTZJRndpSUNzZ2NtVnpkV3gwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuTjBiM0JUWTJWdVlYSnBieWhtWVd4elpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2FYTkpiWEJ2Y25SaGJuUlRkR1Z3S0hOMFpYQXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEVWeWNtOXlLRndpUm1GcGJHVmtJRzl1SUhOMFpYQTZJRndpSUNzZ2FXUjRJQ3NnWENJZ0lFVjJaVzUwT2lCY0lpQXJJSE4wWlhBdVpYWmxiblJPWVcxbElDc2dYQ0lnVW1WaGMyOXVPaUJjSWlBcklISmxjM1ZzZENrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wYjNCVFkyVnVZWEpwYnlobVlXeHpaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIVjBiV1V1YzNSaGRHVXVjMlYwZEdsdVozTXVaMlYwS0NkMlpYSmliM05sSnlrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0hKbGMzVnNkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGMFpTNWhkWFJ2VW5WdUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlZ4dVhHNW1kVzVqZEdsdmJpQjNZV2wwUm05eVFXNW5kV3hoY2loeWIyOTBVMlZzWldOMGIzSXBJSHRjYmlBZ0lDQjJZWElnWld3Z1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0hKdmIzUlRaV3hsWTNSdmNpazdYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUlDaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNnaGQybHVaRzkzTG1GdVozVnNZWElwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjJGdVozVnNZWElnWTI5MWJHUWdibTkwSUdKbElHWnZkVzVrSUc5dUlIUm9aU0IzYVc1a2IzY25LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaGhibWQxYkdGeUxtZGxkRlJsYzNSaFltbHNhWFI1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1lXNW5kV3hoY2k1blpYUlVaWE4wWVdKcGJHbDBlU2hsYkNrdWQyaGxibE4wWVdKc1pTaHlaWE52YkhabEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRmhibWQxYkdGeUxtVnNaVzFsYm5Rb1pXd3BMbWx1YW1WamRHOXlLQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZHliMjkwSUdWc1pXMWxiblFnS0NjZ0t5QnliMjkwVTJWc1pXTjBiM0lnS3lBbktTQm9ZWE1nYm04Z2FXNXFaV04wYjNJdUp5QXJYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQW5JSFJvYVhNZ2JXRjVJRzFsWVc0Z2FYUWdhWE1nYm05MElHbHVjMmxrWlNCdVp5MWhjSEF1SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHRnVaM1ZzWVhJdVpXeGxiV1Z1ZENobGJDa3VhVzVxWldOMGIzSW9LUzVuWlhRb0p5UmljbTkzYzJWeUp5a3VYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdibTkwYVdaNVYyaGxiazV2VDNWMGMzUmhibVJwYm1kU1pYRjFaWE4wY3loeVpYTnZiSFpsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCallYUmphQ0FvWlhKeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpXcGxZM1FvWlhKeUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHBPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnBjMGx0Y0c5eWRHRnVkRk4wWlhBb2MzUmxjQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWc1pXRjJaU2NnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObGIzVjBKeUFtSmx4dUlDQWdJQ0FnSUNBZ0lDQnpkR1Z3TG1WMlpXNTBUbUZ0WlNBaFBTQW5iVzkxYzJWbGJuUmxjaWNnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMjF2ZFhObGIzWmxjaWNnSmlaY2JpQWdJQ0FnSUNBZ0lDQWdjM1JsY0M1bGRtVnVkRTVoYldVZ0lUMGdKMkpzZFhJbklDWW1YRzRnSUNBZ0lDQWdJQ0FnSUhOMFpYQXVaWFpsYm5ST1lXMWxJQ0U5SUNkbWIyTjFjeWM3WEc1OVhHNWNiaThxS2x4dUlDb2dVbVYwZFhKdWN5QjBjblZsSUdsbUlIUm9aU0JuYVhabGJpQnpkR1Z3SUdseklITnZiV1VnYzI5eWRDQnZaaUIxYzJWeUlHbHVkR1Z5WVdOMGFXOXVYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpTVzUwWlhKaFkzUnBkbVZUZEdWd0tITjBaWEFwSUh0Y2JpQWdJQ0IyWVhJZ1pYWjBJRDBnYzNSbGNDNWxkbVZ1ZEU1aGJXVTdYRzVjYmlBZ0lDQXZLbHh1SUNBZ0lDQWdJQzh2SUVsdWRHVnlaWE4wYVc1bklHNXZkR1VzSUdSdmFXNW5JSFJvWlNCbWIyeHNiM2RwYm1jZ2QyRnpJR05oZFhOcGJtY2dkR2hwY3lCbWRXNWpkR2x2YmlCMGJ5QnlaWFIxY200Z2RXNWtaV1pwYm1Wa0xseHVJQ0FnSUNBZ0lISmxkSFZ5Ymx4dUlDQWdJQ0FnSUNBZ0lDQmxkblF1YVc1a1pYaFBaaWhjSW0xdmRYTmxYQ0lwSUNFOVBTQXdJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0lHVjJkQzVwYm1SbGVFOW1LRndpYlc5MWMyVmtiM2R1WENJcElEMDlQU0F3SUh4OFhHNGdJQ0FnSUNBZ0lDQWdJR1YyZEM1cGJtUmxlRTltS0Z3aWJXOTFjMlYxY0Z3aUtTQTlQVDBnTUR0Y2JseHVJQ0FnSUNBZ0lDOHZJRWwwY3lCaVpXTmhkWE5sSUhSb1pTQmpiMjVrYVhScGIyNXpJSGRsY21VZ2JtOTBJRzl1SUhSb1pTQnpZVzFsSUd4cGJtVWdZWE1nZEdobElISmxkSFZ5YmlCemRHRjBaVzFsYm5SY2JpQWdJQ0FxTDF4dUlDQWdJSEpsZEhWeWJpQmxkblF1YVc1a1pYaFBaaWhjSW0xdmRYTmxYQ0lwSUNFOVBTQXdJSHg4SUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWa2IzZHVYQ0lwSUQwOVBTQXdJSHg4SUdWMmRDNXBibVJsZUU5bUtGd2liVzkxYzJWMWNGd2lLU0E5UFQwZ01EdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1ptbHVaRVZzWlcxbGJuUlhhWFJvVEc5allYUnZjaWh6WTJWdVlYSnBieXdnYzNSbGNDd2diRzlqWVhSdmNpd2dkR2x0Wlc5MWRDd2dkR1Y0ZEZSdlEyaGxZMnNwSUh0Y2JpQWdJQ0IyWVhJZ2MzUmhjblJsWkR0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCbWRXNWpkR2x2YmlCMGNubEdhVzVrS0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRnpkR0Z5ZEdWa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjM1JoY25SbFpDQTlJRzVsZHlCRVlYUmxLQ2t1WjJWMFZHbHRaU2dwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWld4bGN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQm1iM1Z1WkZSdmIwMWhibmtnUFNCbVlXeHpaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJtYjNWdVpGWmhiR2xrSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnWm05MWJtUkVhV1ptWlhKbGJuUlVaWGgwSUQwZ1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYzJWc1pXTjBiM0p6Vkc5VVpYTjBJRDBnYkc5allYUnZjaTV6Wld4bFkzUnZjbk11YzJ4cFkyVW9NQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnZEdWNGRGUnZRMmhsWTJzZ1BTQnpkR1Z3TG1SaGRHRXVkR1Y0ZER0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCamIyMXdZWEpwYzI5dUlEMGdjM1JsY0M1a1lYUmhMbU52YlhCaGNtbHpiMjRnZkh3Z1hDSmxjWFZoYkhOY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGJHVmpkRzl5YzFSdlZHVnpkQzUxYm5Ob2FXWjBLQ2RiWkdGMFlTMTFibWx4ZFdVdGFXUTlYQ0luSUNzZ2JHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkNBcklDZGNJbDBuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzJWc1pXTjBiM0p6Vkc5VVpYTjBMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSE5sYkdWamRHOXlJRDBnYzJWc1pXTjBiM0p6Vkc5VVpYTjBXMmxkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaHBjMGx0Y0c5eWRHRnVkRk4wWlhBb2MzUmxjQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlZzWldOMGIzSWdLejBnWENJNmRtbHphV0pzWlZ3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxiR1Z6SUQwZ0pDaHpaV3hsWTNSdmNpazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWc1pYTXViR1Z1WjNSb0lEMDlJREVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUIwWlhoMFZHOURhR1ZqYXlBaFBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHNWxkMVJsZUhRZ1BTQWtLR1ZzWlhOYk1GMHBMblJsZUhRb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2dvWTI5dGNHRnlhWE52YmlBOVBUMGdKMlZ4ZFdGc2N5Y2dKaVlnYm1WM1ZHVjRkQ0E5UFQwZ2RHVjRkRlJ2UTJobFkyc3BJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0tHTnZiWEJoY21semIyNGdQVDA5SUNkamIyNTBZV2x1Y3ljZ0ppWWdibVYzVkdWNGRDNXBibVJsZUU5bUtIUmxlSFJVYjBOb1pXTnJLU0ErUFNBd0tTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtWbUZzYVdRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRVJwWm1abGNtVnVkRlJsZUhRZ1BTQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptOTFibVJXWVd4cFpDQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGJHVnpMbUYwZEhJb0oyUmhkR0V0ZFc1cGNYVmxMV2xrSnl3Z2JHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR1ZzWlhNdWJHVnVaM1JvSUQ0Z01Ta2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWIzVnVaRlJ2YjAxaGJua2dQU0IwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHWnZkVzVrVm1Gc2FXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhOdmJIWmxLR1ZzWlhNcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNocGMwbHRjRzl5ZEdGdWRGTjBaWEFvYzNSbGNDa2dKaVlnS0c1bGR5QkVZWFJsS0NrdVoyVjBWR2x0WlNncElDMGdjM1JoY25SbFpDa2dQQ0IwYVcxbGIzVjBJQ29nTlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dOVEFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnY21WemRXeDBJRDBnWENKY0lqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWm05MWJtUlViMjlOWVc1NUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGMzVnNkQ0E5SUNkRGIzVnNaQ0J1YjNRZ1ptbHVaQ0JoY0hCeWIzQnlhV0YwWlNCbGJHVnRaVzUwSUdadmNpQnpaV3hsWTNSdmNuTTZJQ2NnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hzYjJOaGRHOXlMbk5sYkdWamRHOXljeWtnS3lCY0lpQm1iM0lnWlhabGJuUWdYQ0lnS3lCemRHVndMbVYyWlc1MFRtRnRaU0FySUZ3aUxpQWdVbVZoYzI5dU9pQkdiM1Z1WkNCVWIyOGdUV0Z1ZVNCRmJHVnRaVzUwYzF3aU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9abTkxYm1SRWFXWm1aWEpsYm5SVVpYaDBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxjM1ZzZENBOUlDZERiM1ZzWkNCdWIzUWdabWx1WkNCaGNIQnliM0J5YVdGMFpTQmxiR1Z0Wlc1MElHWnZjaUJ6Wld4bFkzUnZjbk02SUNjZ0t5QktVMDlPTG5OMGNtbHVaMmxtZVNoc2IyTmhkRzl5TG5ObGJHVmpkRzl5Y3lrZ0t5QmNJaUJtYjNJZ1pYWmxiblFnWENJZ0t5QnpkR1Z3TG1WMlpXNTBUbUZ0WlNBcklGd2lMaUFnVW1WaGMyOXVPaUJVWlhoMElHUnZaWE51SjNRZ2JXRjBZMmd1SUNCY1hHNUZlSEJsWTNSbFpEcGNYRzVjSWlBcklIUmxlSFJVYjBOb1pXTnJJQ3NnWENKY1hHNWlkWFFnZDJGelhGeHVYQ0lnS3lCbGJHVnpMblJsZUhRb0tTQXJJRndpWEZ4dVhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemRXeDBJRDBnSjBOdmRXeGtJRzV2ZENCbWFXNWtJR0Z3Y0hKdmNISnBZWFJsSUdWc1pXMWxiblFnWm05eUlITmxiR1ZqZEc5eWN6b2dKeUFySUVwVFQwNHVjM1J5YVc1bmFXWjVLR3h2WTJGMGIzSXVjMlZzWldOMGIzSnpLU0FySUZ3aUlHWnZjaUJsZG1WdWRDQmNJaUFySUhOMFpYQXVaWFpsYm5ST1lXMWxJQ3NnWENJdUlDQlNaV0Z6YjI0NklFNXZJR1ZzWlcxbGJuUnpJR1p2ZFc1a1hDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYW1WamRDaHlaWE4xYkhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdkbUZ5SUhOd1pXVmtJRDBnZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9YQ0p5ZFc1dVpYSXVjM0JsWldSY0lpazdYRzRnSUNBZ0lDQWdJSFpoY2lCc2FXMXBkQ0E5SUdsdGNHOXlkR0Z1ZEZOMFpYQk1aVzVuZEdnZ0x5QW9jM0JsWldRZ1BUMDlJQ2R5WldGc2RHbHRaU2NnUHlBbk1TY2dPaUJ6Y0dWbFpDazdYRzRnSUNBZ0lDQWdJR2xtSUNobmJHOWlZV3d1WVc1bmRXeGhjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkMkZwZEVadmNrRnVaM1ZzWVhJb0oxdHVaeTFoY0hCZEp5a3VkR2hsYmlobWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE53WldWa0lEMDlQU0FuY21WaGJIUnBiV1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFJVYVcxbGIzVjBLSFJ5ZVVacGJtUXNJSFJwYldWdmRYUXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE53WldWa0lEMDlQU0FuWm1GemRHVnpkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnllVVpwYm1Rb0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRlJwYldWdmRYUW9kSEo1Um1sdVpDd2dUV0YwYUM1dGFXNG9kR2x0Wlc5MWRDQXFJSE53WldWa0xDQnNhVzFwZENrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemNHVmxaQ0E5UFQwZ0ozSmxZV3gwYVcxbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvZEhKNVJtbHVaQ3dnZEdsdFpXOTFkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE53WldWa0lEMDlQU0FuWm1GemRHVnpkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGNubEdhVzVrS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEZScGJXVnZkWFFvZEhKNVJtbHVaQ3dnVFdGMGFDNXRhVzRvZEdsdFpXOTFkQ0FxSUhOd1pXVmtMQ0JzYVcxcGRDa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHZGxkRlJwYldWdmRYUW9jMk5sYm1GeWFXOHNJR2xrZUNrZ2UxeHVJQ0FnSUdsbUlDaHBaSGdnUGlBd0tTQjdYRzRnSUNBZ0lDQWdJQzh2SUVsbUlIUm9aU0J3Y21WMmFXOTFjeUJ6ZEdWd0lHbHpJR0VnZG1Gc2FXUmhkR1VnYzNSbGNDd2dkR2hsYmlCcWRYTjBJRzF2ZG1VZ2IyNHNJR0Z1WkNCd2NtVjBaVzVrSUdsMElHbHpiaWQwSUhSb1pYSmxYRzRnSUNBZ0lDQWdJQzh2SUU5eUlHbG1JR2wwSUdseklHRWdjMlZ5YVdWeklHOW1JR3RsZVhNc0lIUm9aVzRnWjI5Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZMbk4wWlhCelcybGtlQ0F0SURGZExtVjJaVzUwVG1GdFpTQTlQU0FuZG1Gc2FXUmhkR1VuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdNRHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJObGJtRnlhVzh1YzNSbGNITmJhV1I0WFM1MGFXMWxVM1JoYlhBZ0xTQnpZMlZ1WVhKcGJ5NXpkR1Z3YzF0cFpIZ2dMU0F4WFM1MGFXMWxVM1JoYlhBN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQXdPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnlkVzVPWlhoMFUzUmxjQ2h6WTJWdVlYSnBieXdnYVdSNExDQjBiMU5yYVhBc0lIUnBiV1Z2ZFhRcElIdGNiaUFnSUNBdkx5Qk5ZV3RsSUhOMWNtVWdkMlVnWVhKbGJpZDBJR2R2YVc1bklIUnZJRzkyWlhKbWJHOTNJSFJvWlNCallXeHNJSE4wWVdOckxseHVJQ0FnSUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoelkyVnVZWEpwYnk1emRHVndjeTVzWlc1bmRHZ2dQaUFvYVdSNElDc2dNU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEoxYmxOMFpYQW9jMk5sYm1GeWFXOHNJR2xrZUNBcklERXNJSFJ2VTJ0cGNDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbk4wYjNCVFkyVnVZWEpwYnloMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDBzSUhScGJXVnZkWFFnZkh3Z01DazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHWnlZV2R0Wlc1MFJuSnZiVk4wY21sdVp5aHpkSEpJVkUxTUtTQjdYRzRnSUNBZ2RtRnlJSFJsYlhBZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkMFpXMXdiR0YwWlNjcE8xeHVJQ0FnSUhSbGJYQXVhVzV1WlhKSVZFMU1JRDBnYzNSeVNGUk5URHRjYmlBZ0lDQXZMeUJqYjI1emIyeGxMbXh2WnloMFpXMXdMbWx1Ym1WeVNGUk5UQ2s3WEc0Z0lDQWdjbVYwZFhKdUlIUmxiWEF1WTI5dWRHVnVkQ0EvSUhSbGJYQXVZMjl1ZEdWdWRDQTZJSFJsYlhBN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRGVnVhWEYxWlVsa1JuSnZiVk4wWlhBb2MzUmxjQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnpkR1Z3SUNZbUlITjBaWEF1WkdGMFlTQW1KaUJ6ZEdWd0xtUmhkR0V1Ykc5allYUnZjaUFtSmlCemRHVndMbVJoZEdFdWJHOWpZWFJ2Y2k1MWJtbHhkV1ZKWkR0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWm1sc2RHVnlSWGgwY21GTWIyRmtjeWh6ZEdWd2N5a2dlMXh1SUNCMllYSWdjbVZ6ZFd4MElEMGdXMTA3WEc0Z0lIWmhjaUJ6WldWdVRHOWhaQ0E5SUdaaGJITmxPMXh1SUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElITjBaWEJ6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ2RtRnlJR2x6VEc5aFpDQTlJSE4wWlhCelcybGRMbVYyWlc1MFRtRnRaU0E5UFQwZ0oyeHZZV1FuTzF4dUlDQWdJR2xtSUNnaGMyVmxia3h2WVdRZ2ZId2dJV2x6VEc5aFpDa2dlMXh1SUNBZ0lDQWdjbVZ6ZFd4MExuQjFjMmdvYzNSbGNITmJhVjBwTzF4dUlDQWdJQ0FnYzJWbGJreHZZV1FnUFNCelpXVnVURzloWkNCOGZDQnBjMHh2WVdRN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUhKbGRIVnliaUJ5WlhOMWJIUTdYRzU5TzF4dVhHNTJZWElnWjNWcFpDQTlJQ2htZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnWm5WdVkzUnBiMjRnY3pRb0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQk5ZWFJvTG1ac2IyOXlLQ2d4SUNzZ1RXRjBhQzV5WVc1a2IyMG9LU2tnS2lBd2VERXdNREF3S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdMblJ2VTNSeWFXNW5LREUyS1Z4dUlDQWdJQ0FnSUNBZ0lDQWdMbk4xWW5OMGNtbHVaeWd4S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE0wS0NrZ0t5QnpOQ2dwSUNzZ0p5MG5JQ3NnY3pRb0tTQXJJQ2N0SnlBcklITTBLQ2tnS3lBbkxTY2dLMXh1SUNBZ0lDQWdJQ0FnSUNBZ2N6UW9LU0FySUNjdEp5QXJJSE0wS0NrZ0t5QnpOQ2dwSUNzZ2N6UW9LVHRjYmlBZ0lDQjlPMXh1ZlNrb0tUdGNibHh1ZG1GeUlHeHBjM1JsYm1WeWN5QTlJRnRkTzF4dWRtRnlJSE4wWVhSbE8xeHVkbUZ5SUhWMGJXVWdQU0I3WEc0Z0lDQWdhVzVwZERvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2MyTmxibUZ5YVc4Z1BTQm5aWFJRWVhKaGJXVjBaWEpDZVU1aGJXVW9KM1YwYldWZmMyTmxibUZ5YVc4bktUdGNiaUFnSUNBZ0lDQWdhV1lnS0hOalpXNWhjbWx2S1NCN1hHNGdJQ0FnSUNBZ0lDQWdiRzlqWVd4VGRHOXlZV2RsTG1Oc1pXRnlLQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCMWRHMWxMbk4wWVhSbElEMGdkWFJ0WlM1c2IyRmtVM1JoZEdWR2NtOXRVM1J2Y21GblpTZ3BPMXh1SUNBZ0lDQWdJQ0IxZEcxbExtSnliMkZrWTJGemRDZ25TVTVKVkVsQlRFbGFSVVFuS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RYUnRaUzVzYjJGa1UyVjBkR2x1WjNNb0tTNTBhR1Z1S0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2MyTmxibUZ5YVc4cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1MFpYTjBVMlZ5ZG1WeUlEMGdaMlYwVUdGeVlXMWxkR1Z5UW5sT1lXMWxLRndpZFhSdFpWOTBaWE4wWDNObGNuWmxjbHdpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVZWFYwYjFKMWJpQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjblZ1VTJObGJtRnlhVzhvYzJObGJtRnlhVzhwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU3dnTVRBd0tUdGNiaUFnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSE4wWVhSbExuTjBZWFIxY3lBOVBUMGdYQ0pRVEVGWlNVNUhYQ0lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY25WdVRtVjRkRk4wWlhBb2MzUmhkR1V1Y25WdUxuTmpaVzVoY21sdkxDQnpkR0YwWlM1eWRXNHVjM1JsY0VsdVpHVjRLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9JWE4wWVhSbExuTjBZWFIxY3lCOGZDQnpkR0YwWlM1emRHRjBkWE1nUFQwOUlDZEpUa2xVU1VGTVNWcEpUa2NuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhOMFlYUmxMbk4wWVhSMWN5QTlJRndpVEU5QlJFVkVYQ0k3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1luSnZZV1JqWVhOME9pQm1kVzVqZEdsdmJpQW9aWFowTENCbGRuUkVZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hzYVhOMFpXNWxjbk1nSmlZZ2JHbHpkR1Z1WlhKekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCc2FYTjBaVzVsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYVhOMFpXNWxjbk5iYVYwb1pYWjBMQ0JsZG5SRVlYUmhLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2MzUmhjblJTWldOdmNtUnBibWM2SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hOMFlYUmxMbk4wWVhSMWN5QWhQU0FuVWtWRFQxSkVTVTVISnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjM1JoZEhWeklEMGdKMUpGUTA5U1JFbE9SeWM3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHVndjeUE5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZFhSdFpTNXlaWEJ2Y25STWIyY29YQ0pTWldOdmNtUnBibWNnVTNSaGNuUmxaRndpS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdVluSnZZV1JqWVhOMEtDZFNSVU5QVWtSSlRrZGZVMVJCVWxSRlJDY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RYUnRaUzV5WldkcGMzUmxja1YyWlc1MEtGd2liRzloWkZ3aUxDQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEpzT2lCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEJ5YjNSdlkyOXNPaUIzYVc1a2IzY3ViRzlqWVhScGIyNHVjSEp2ZEc5amIyd3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdodmMzUTZJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9iM04wTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaV0Z5WTJnNklIZHBibVJ2ZHk1c2IyTmhkR2x2Ymk1elpXRnlZMmdzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHaGhjMmc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTVvWVhOb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ2NuVnVVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h1WVcxbExDQmpiMjVtYVdjcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhSdlVuVnVJRDBnYm1GdFpTQjhmQ0J3Y205dGNIUW9KMU5qWlc1aGNtbHZJSFJ2SUhKMWJpY3BPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1lYVjBiMUoxYmlBOUlDRnVZVzFsSUQ4Z2NISnZiWEIwS0NkWGIzVnNaQ0I1YjNVZ2JHbHJaU0IwYnlCemRHVndJSFJvY205MVoyZ2daV0ZqYUNCemRHVndJQ2g1Zkc0cFB5Y3BJQ0U5SUNkNUp5QTZJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCblpYUlRZMlZ1WVhKcGJ5aDBiMUoxYmlrdWRHaGxiaWhtZFc1amRHbHZiaUFvYzJObGJtRnlhVzhwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSE5qWlc1aGNtbHZJRDBnU2xOUFRpNXdZWEp6WlNoS1UwOU9Mbk4wY21sdVoybG1lU2h6WTJWdVlYSnBieWtwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdjMlYwZFhCRGIyNWthWFJwYjI1ektITmpaVzVoY21sdktTNTBhR1Z1S0daMWJtTjBhVzl1SUNncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1eWRXNGdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemRHRjBaUzVoZFhSdlVuVnVJRDBnWVhWMGIxSjFiaUE5UFQwZ2RISjFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGMFpTNXpkR0YwZFhNZ1BTQmNJbEJNUVZsSlRrZGNJanRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOalpXNWhjbWx2TG5OMFpYQnpJRDBnWm1sc2RHVnlSWGgwY21GTWIyRmtjeWh6WTJWdVlYSnBieTV6ZEdWd2N5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RYUnRaUzV6ZEdGMFpTNXpaWFIwYVc1bmN5NW5aWFFvWENKMlpYSmliM05sWENJcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbE4wWVhKMGFXNW5JRk5qWlc1aGNtbHZJQ2RjSWlBcklHNWhiV1VnS3lCY0lpZGNJaXdnYzJObGJtRnlhVzhwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkUVRFRlpRa0ZEUzE5VFZFRlNWRVZFSnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlkVzVUZEdWd0tITmpaVzVoY21sdkxDQXdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEoxYms1bGVIUlRkR1Z3T2lCeWRXNU9aWGgwVTNSbGNDeGNiaUFnSUNCemRHOXdVMk5sYm1GeWFXODZJR1oxYm1OMGFXOXVJQ2h6ZFdOalpYTnpLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpZMlZ1WVhKcGJ5QTlJSE4wWVhSbExuSjFiaUFtSmlCemRHRjBaUzV5ZFc0dWMyTmxibUZ5YVc4N1hHNGdJQ0FnSUNBZ0lHUmxiR1YwWlNCemRHRjBaUzV5ZFc0N1hHNGdJQ0FnSUNBZ0lITjBZWFJsTG5OMFlYUjFjeUE5SUZ3aVRFOUJSRVZFWENJN1hHNGdJQ0FnSUNBZ0lIVjBiV1V1WW5KdllXUmpZWE4wS0NkUVRFRlpRa0ZEUzE5VFZFOVFVRVZFSnlrN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVXVjM1JoZEdVdWMyVjBkR2x1WjNNdVoyVjBLRndpZG1WeVltOXpaVndpS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVndiM0owVEc5bktGd2lVM1J2Y0hCcGJtY2dVMk5sYm1GeWFXOWNJaWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2FXWWdLSE5qWlc1aGNtbHZLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzNWalkyVnpjeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVjbVZ3YjNKMFUzVmpZMlZ6Y3loY0lsdFRWVU5EUlZOVFhTQlRZMlZ1WVhKcGJ5QW5YQ0lnS3lCelkyVnVZWEpwYnk1dVlXMWxJQ3NnWENJbklFTnZiWEJzWlhSbFpDRmNJaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21Wd2IzSjBURzluS0Z3aVUzUnZjSEJwYm1jZ2IyNGdjR0ZuWlNCY0lpQXJJSGRwYm1SdmR5NXNiMk5oZEdsdmJpNW9jbVZtS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbkpsY0c5eWRFVnljbTl5S0Z3aVcwWkJTVXhWVWtWZElGTmpaVzVoY21sdklDZGNJaUFySUhOalpXNWhjbWx2TG01aGJXVWdLeUJjSWljZ1UzUnZjSEJsWkNGY0lpazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dRM0psWVhSbGN5QmhJSFJsYlhCdmNtRnllU0JsYkdWdFpXNTBJR3h2WTJGMGIzSXNJR1p2Y2lCMWMyVWdkMmwwYUNCbWFXNWhiR2w2WlV4dlkyRjBiM0pjYmlBZ0lDQWdLaTljYmlBZ0lDQmpjbVZoZEdWRmJHVnRaVzUwVEc5allYUnZjam9nWm5WdVkzUnBiMjRnS0dWc1pXMWxiblFwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFZ1YVhGMVpVbGtJRDBnWld4bGJXVnVkQzVuWlhSQmRIUnlhV0oxZEdVb1hDSmtZWFJoTFhWdWFYRjFaUzFwWkZ3aUtTQjhmQ0JuZFdsa0tDazdYRzRnSUNBZ0lDQWdJR1ZzWlcxbGJuUXVjMlYwUVhSMGNtbGlkWFJsS0Z3aVpHRjBZUzExYm1seGRXVXRhV1JjSWl3Z2RXNXBjWFZsU1dRcE8xeHVYRzRnSUNBZ0lDQWdJSFpoY2lCbGJHVklkRzFzSUQwZ1pXeGxiV1Z1ZEM1amJHOXVaVTV2WkdVb0tTNXZkWFJsY2toVVRVdzdYRzRnSUNBZ0lDQWdJSFpoY2lCbGJHVlRaV3hsWTNSdmNuTWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR1ZzWlcxbGJuUXVkR0ZuVG1GdFpTNTBiMVZ3Y0dWeVEyRnpaU2dwSUQwOUlDZENUMFJaSnlCOGZDQmxiR1Z0Wlc1MExuUmhaMDVoYldVdWRHOVZjSEJsY2tOaGMyVW9LU0E5UFNBblNGUk5UQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1ZzWlZObGJHVmpkRzl5Y3lBOUlGdGxiR1Z0Wlc1MExuUmhaMDVoYldWZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWld4bFUyVnNaV04wYjNKeklEMGdjMlZzWldOMGIzSkdhVzVrWlhJb1pXeGxiV1Z1ZEN3Z1pHOWpkVzFsYm5RdVltOWtlU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ1YVhGMVpVbGtPaUIxYm1seGRXVkpaQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lITmxiR1ZqZEc5eWN6b2daV3hsVTJWc1pXTjBiM0p6WEc0Z0lDQWdJQ0FnSUgwN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhKbFoybHpkR1Z5UlhabGJuUTZJR1oxYm1OMGFXOXVJQ2hsZG1WdWRFNWhiV1VzSUdSaGRHRXNJR2xrZUNrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUh4OElIVjBiV1V1YVhOV1lXeHBaR0YwYVc1bktDa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdhV1I0SUQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdSNElEMGdkWFJ0WlM1emRHRjBaUzV6ZEdWd2N5NXNaVzVuZEdnN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHVndjMXRwWkhoZElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1YyWlc1MFRtRnRaVG9nWlhabGJuUk9ZVzFsTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhScGJXVlRkR0Z0Y0RvZ2JtVjNJRVJoZEdVb0tTNW5aWFJVYVcxbEtDa3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaR0YwWVRvZ1pHRjBZVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhWMGJXVXVZbkp2WVdSallYTjBLQ2RGVmtWT1ZGOVNSVWRKVTFSRlVrVkVKeWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSEpsY0c5eWRFeHZaem9nWm5WdVkzUnBiMjRnS0d4dlp5d2djMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tISmxjRzl5ZEVoaGJtUnNaWEp6SUNZbUlISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J5WlhCdmNuUklZVzVrYkdWeWN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGNHOXlkRWhoYm1Sc1pYSnpXMmxkTG14dlp5aHNiMmNzSUhOalpXNWhjbWx2TENCMWRHMWxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ2NtVndiM0owUlhKeWIzSTZJR1oxYm1OMGFXOXVJQ2hsY25KdmNpd2djMk5sYm1GeWFXOHBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tISmxjRzl5ZEVoaGJtUnNaWEp6SUNZbUlISmxjRzl5ZEVoaGJtUnNaWEp6TG14bGJtZDBhQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J5WlhCdmNuUklZVzVrYkdWeWN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGNHOXlkRWhoYm1Sc1pYSnpXMmxkTG1WeWNtOXlLR1Z5Y205eUxDQnpZMlZ1WVhKcGJ5d2dkWFJ0WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSEpsY0c5eWRGTjFZMk5sYzNNNklHWjFibU4wYVc5dUlDaHRaWE56WVdkbExDQnpZMlZ1WVhKcGJ5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2NtVndiM0owU0dGdVpHeGxjbk1nSmlZZ2NtVndiM0owU0dGdVpHeGxjbk11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEpsY0c5eWRFaGhibVJzWlhKekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21Wd2IzSjBTR0Z1Wkd4bGNuTmJhVjB1YzNWalkyVnpjeWh0WlhOellXZGxMQ0J6WTJWdVlYSnBieXdnZFhSdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVJQ0FnSUhKbFoybHpkR1Z5VEdsemRHVnVaWEk2SUdaMWJtTjBhVzl1SUNob1lXNWtiR1Z5S1NCN1hHNGdJQ0FnSUNBZ0lHeHBjM1JsYm1WeWN5NXdkWE5vS0doaGJtUnNaWElwTzF4dUlDQWdJSDBzWEc0Z0lDQWdjbVZuYVhOMFpYSlRZWFpsU0dGdVpHeGxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2MyRjJaVWhoYm1Sc1pYSnpMbkIxYzJnb2FHRnVaR3hsY2lrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0J5WldkcGMzUmxjbEpsY0c5eWRFaGhibVJzWlhJNklHWjFibU4wYVc5dUlDaG9ZVzVrYkdWeUtTQjdYRzRnSUNBZ0lDQWdJSEpsY0c5eWRFaGhibVJzWlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV2RwYzNSbGNreHZZV1JJWVc1a2JHVnlPaUJtZFc1amRHbHZiaUFvYUdGdVpHeGxjaXdnYjNKa1pYSXBJSHRjYmlBZ0lDQWdJQ0FnYjNKa1pYSWdQU0IwZVhCbGIyWWdiM0prWlhJZ0lUMDlJRndpZFc1a1pXWnBibVZrWENJZ1B5QnZjbVJsY2lBNklHeHZZV1JJWVc1a2JHVnljeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQWdJR2xtSUNoc2IyRmtTR0Z1Wkd4bGNuTXViR1Z1WjNSb0lENGdiM0prWlhJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUd4dllXUklZVzVrYkdWeWN5NXpjR3hwWTJVb2IzSmtaWElzSURBc0lHaGhibVJzWlhJcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYkc5aFpFaGhibVJzWlhKekxuQjFjMmdvYUdGdVpHeGxjaWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlVMlYwZEdsdVozTk1iMkZrU0dGdVpHeGxjam9nWm5WdVkzUnBiMjRnS0doaGJtUnNaWElwSUh0Y2JpQWdJQ0FnSUNBZ2MyVjBkR2x1WjNOTWIyRmtTR0Z1Wkd4bGNuTXVjSFZ6YUNob1lXNWtiR1Z5S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2x6VW1WamIzSmthVzVuT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIVjBiV1V1YzNSaGRHVXVjM1JoZEhWekxtbHVaR1Y0VDJZb1hDSlNSVU5QVWtSSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCcGMxQnNZWGxwYm1jNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkWFJ0WlM1emRHRjBaUzV6ZEdGMGRYTXVhVzVrWlhoUFppaGNJbEJNUVZsSlRrZGNJaWtnUFQwOUlEQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCcGMxWmhiR2xrWVhScGJtYzZJR1oxYm1OMGFXOXVLSFpoYkdsa1lYUnBibWNwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQjJZV3hwWkdGMGFXNW5JQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QW1KaUFvZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUh4OElIVjBiV1V1YVhOV1lXeHBaR0YwYVc1bktDa3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5OMFlYUmxMbk4wWVhSMWN5QTlJSFpoYkdsa1lYUnBibWNnUHlCY0lsWkJURWxFUVZSSlRrZGNJaUE2SUZ3aVVrVkRUMUpFU1U1SFhDSTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMWRHMWxMbUp5YjJGa1kyRnpkQ2duVmtGTVNVUkJWRWxQVGw5RFNFRk9SMFZFSnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIVjBiV1V1YzNSaGRHVXVjM1JoZEhWekxtbHVaR1Y0VDJZb1hDSldRVXhKUkVGVVNVNUhYQ0lwSUQwOVBTQXdPMXh1SUNBZ0lIMHNYRzRnSUNBZ2MzUnZjRkpsWTI5eVpHbHVaem9nWm5WdVkzUnBiMjRnS0dsdVptOHBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHVabThnSVQwOUlHWmhiSE5sS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JtVjNVMk5sYm1GeWFXOGdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSbGNITTZJSE4wWVhSbExuTjBaWEJ6WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQmZMbVY0ZEdWdVpDaHVaWGRUWTJWdVlYSnBieXdnYVc1bWJ5azdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2doYm1WM1UyTmxibUZ5YVc4dWJtRnRaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc1bGQxTmpaVzVoY21sdkxtNWhiV1VnUFNCd2NtOXRjSFFvSjBWdWRHVnlJSE5qWlc1aGNtbHZJRzVoYldVbktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHNWxkMU5qWlc1aGNtbHZMbTVoYldVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpkR0YwWlM1elkyVnVZWEpwYjNNdWNIVnphQ2h1WlhkVFkyVnVZWEpwYnlrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYzJGMlpVaGhibVJzWlhKeklDWW1JSE5oZG1WSVlXNWtiR1Z5Y3k1c1pXNW5kR2dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J6WVhabFNHRnVaR3hsY25NdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5oZG1WSVlXNWtiR1Z5YzF0cFhTaHVaWGRUWTJWdVlYSnBieXdnZFhSdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnpkR0YwWlM1emRHRjBkWE1nUFNBblRFOUJSRVZFSnp0Y2JseHVJQ0FnSUNBZ0lDQjFkRzFsTG1KeWIyRmtZMkZ6ZENnblVrVkRUMUpFU1U1SFgxTlVUMUJRUlVRbktUdGNibHh1SUNBZ0lDQWdJQ0IxZEcxbExuSmxjRzl5ZEV4dlp5aGNJbEpsWTI5eVpHbHVaeUJUZEc5d2NHVmtYQ0lzSUc1bGQxTmpaVzVoY21sdktUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2JHOWhaRk5sZEhScGJtZHpPaUJtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6WlhSMGFXNW5jeUE5SUhWMGJXVXVjM1JoZEdVdWMyVjBkR2x1WjNNZ1BTQjFkRzFsTG5OMFlYUmxMbk5sZEhScGJtZHpJSHg4SUc1bGR5QlRaWFIwYVc1bmN5aDdYRzRnSUNBZ0lDQWdJQ0FnWENKeWRXNXVaWEl1YzNCbFpXUmNJam9nWENJeE1Gd2lYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCcFppQW9jMlYwZEdsdVozTk1iMkZrU0dGdVpHeGxjbk11YkdWdVozUm9JRDRnTUNBbUppQWhkWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BJQ1ltSUNGMWRHMWxMbWx6VUd4aGVXbHVaeWdwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRnS0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRIUnBibWR6VEc5aFpFaGhibVJzWlhKeld6QmRLR1oxYm1OMGFXOXVJQ2h5WlhOd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhObGRIUnBibWR6TG5ObGRFUmxabUYxYkhSektISmxjM0FwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtITmxkSFJwYm1kektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0JtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsYzI5c2RtVW9jMlYwZEdsdVozTXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0hObGRIUnBibWR6S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNWNiaUFnSUNCc2IyRmtVM1JoZEdWR2NtOXRVM1J2Y21GblpUb2dablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkWFJ0WlZOMFlYUmxVM1J5SUQwZ2JHOWpZV3hUZEc5eVlXZGxMbWRsZEVsMFpXMG9KM1YwYldVbktUdGNiaUFnSUNBZ0lDQWdhV1lnS0hWMGJXVlRkR0YwWlZOMGNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MzUmhkR1VnUFNCS1UwOU9MbkJoY25ObEtIVjBiV1ZUZEdGMFpWTjBjaWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoemRHRjBaUzV6WlhSMGFXNW5jeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQnVaWGRUWlhSMGFXNW5jeUE5SUc1bGR5QlRaWFIwYVc1bmN5Z3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzVsZDFObGRIUnBibWR6TG5ObGRIUnBibWR6SUQwZ2MzUmhkR1V1YzJWMGRHbHVaM011YzJWMGRHbHVaM003WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYm1WM1UyVjBkR2x1WjNNdWMyVjBkR2x1WjNNZ1BTQnpkR0YwWlM1elpYUjBhVzVuY3k1a1pXWmhkV3gwVTJWMGRHbHVaM003WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzNSaGRHVXVjMlYwZEdsdVozTWdQU0J1WlhkVFpYUjBhVzVuY3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITjBZWFJsSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITjBZWFIxY3pvZ1hDSkpUa2xVU1VGTVNWcEpUa2RjSWl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCelkyVnVZWEpwYjNNNklGdGRYRzRnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpkR0YwWlR0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnYzJGMlpWTjBZWFJsVkc5VGRHOXlZV2RsT2lCbWRXNWpkR2x2YmlBb2RYUnRaVk4wWVhSbEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoMWRHMWxVM1JoZEdVcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUd4dlkyRnNVM1J2Y21GblpTNXpaWFJKZEdWdEtDZDFkRzFsSnl3Z1NsTlBUaTV6ZEhKcGJtZHBabmtvZFhSdFpWTjBZWFJsS1NrN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JzYjJOaGJGTjBiM0poWjJVdWNtVnRiM1psU1hSbGJTZ25kWFJ0WlNjcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lIVnViRzloWkRvZ1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lDQWdJQ0IxZEcxbExuTmhkbVZUZEdGMFpWUnZVM1J2Y21GblpTaHpkR0YwWlNrN1hHNGdJQ0FnZlZ4dWZUdGNibHh1Wm5WdVkzUnBiMjRnZEc5bloyeGxTR2xuYUd4cFoyaDBLR1ZzWlN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0FrS0dWc1pTa3VkRzluWjJ4bFEyeGhjM01vSjNWMGJXVXRkbVZ5YVdaNUp5d2dkbUZzZFdVcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCMGIyZG5iR1ZTWldGa2VTaGxiR1VzSUhaaGJIVmxLU0I3WEc0Z0lDQWdKQ2hsYkdVcExuUnZaMmRzWlVOc1lYTnpLQ2QxZEcxbExYSmxZV1I1Snl3Z2RtRnNkV1VwTzF4dWZWeHVYRzR2S2lwY2JpQXFJRWxtSUhsdmRTQmpiR2xqYXlCdmJpQmhJSE53WVc0Z2FXNGdZU0JzWVdKbGJDd2dkR2hsSUhOd1lXNGdkMmxzYkNCamJHbGpheXhjYmlBcUlIUm9aVzRnZEdobElHSnliM2R6WlhJZ2QybHNiQ0JtYVhKbElIUm9aU0JqYkdsamF5QmxkbVZ1ZENCbWIzSWdkR2hsSUdsdWNIVjBJR052Ym5SaGFXNWxaQ0IzYVhSb2FXNGdkR2hsSUhOd1lXNHNYRzRnS2lCVGJ5d2dkMlVnYjI1c2VTQjNZVzUwSUhSdklIUnlZV05ySUhSb1pTQnBibkIxZENCamJHbGphM011WEc0Z0tpOWNibVoxYm1OMGFXOXVJR2x6VG05MFNXNU1ZV0psYkU5eVZtRnNhV1FvWld4bEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUNRb1pXeGxLUzV3WVhKbGJuUnpLQ2RzWVdKbGJDY3BMbXhsYm1kMGFDQTlQU0F3SUh4OFhHNGdJQ0FnSUNBZ0lDQWdaV3hsTG01dlpHVk9ZVzFsTG5SdlRHOTNaWEpEWVhObEtDa2dQVDBnSjJsdWNIVjBKenRjYm4xY2JseHVMeW9xWEc0Z0tpQlNaWFIxY201eklIUnlkV1VnYVdZZ2FYUWdhWE1nWVc0Z1pXeGxiV1Z1ZENCMGFHRjBJSE5vYjNWc1pDQmlaU0JwWjI1dmNtVmtYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpTV2R1YjNKbFpFVnNaVzFsYm5Rb1pXeGxLU0I3WEc0Z0lISmxkSFZ5YmlBaFpXeGxMbWhoYzBGMGRISnBZblYwWlNCOGZDQmxiR1V1YUdGelFYUjBjbWxpZFhSbEtDZGtZWFJoTFdsbmJtOXlaU2NwSUh4OElDUW9aV3hsS1M1d1lYSmxiblJ6S0Z3aVcyUmhkR0V0YVdkdWIzSmxYVndpS1M1c1pXNW5kR2dnUGlBd08xeHVmVnh1WEc0dktpcGNiaUFxSUZKbGRIVnlibk1nZEhKMVpTQnBaaUIwYUdVZ1oybDJaVzRnWlhabGJuUWdjMmh2ZFd4a0lHSmxJSEpsWTI5eVpHVmtJRzl1SUhSb1pTQm5hWFpsYmlCbGJHVnRaVzUwWEc0Z0tpOWNibVoxYm1OMGFXOXVJSE5vYjNWc1pGSmxZMjl5WkVWMlpXNTBLR1ZzWlN3Z1pYWjBLU0I3WEc0Z0lIWmhjaUJ6WlhSMGFXNW5JRDBnZFhSdFpTNXpkR0YwWlM1elpYUjBhVzVuY3k1blpYUW9YQ0p5WldOdmNtUmxjaTVsZG1WdWRITXVYQ0lnS3lCbGRuUXBPMXh1SUNCMllYSWdhWE5UWlhSMGFXNW5WSEoxWlNBOUlDaHpaWFIwYVc1bklEMDlQU0IwY25WbElIeDhJSE5sZEhScGJtY2dQVDA5SUNkMGNuVmxKeUI4ZkNCMGVYQmxiMllnYzJWMGRHbHVaeUE5UFQwZ0ozVnVaR1ZtYVc1bFpDY3BPMXh1SUNCeVpYUjFjbTRnZFhSdFpTNXBjMUpsWTI5eVpHbHVaeWdwSUNZbUlHbHpVMlYwZEdsdVoxUnlkV1VnSmlZZ2FYTk9iM1JKYmt4aFltVnNUM0pXWVd4cFpDaGxiR1VwTzF4dWZWeHVYRzUyWVhJZ2RHbHRaWEp6SUQwZ1cxMDdYRzVjYm1aMWJtTjBhVzl1SUdsdWFYUkZkbVZ1ZEVoaGJtUnNaWEp6S0NrZ2UxeHVYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQmxkbVZ1ZEhNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnWkc5amRXMWxiblF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWhsZG1WdWRITmJhVjBzSUNobWRXNWpkR2x2YmlBb1pYWjBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnYUdGdVpHeGxjaUE5SUdaMWJtTjBhVzl1SUNobEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dVdWFYTlVjbWxuWjJWeUtWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXbHpTV2R1YjNKbFpFVnNaVzFsYm5Rb1pTNTBZWEpuWlhRcElDWW1JSFYwYldVdWFYTlNaV052Y21ScGJtY29LU2tnZTF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHbGtlQ0E5SUhWMGJXVXVjM1JoZEdVdWMzUmxjSE11YkdWdVozUm9PMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJzWVhOMFUzUmxjQ0E5SUhWMGJXVXVjM1JoZEdVdWMzUmxjSE5iYVdSNElDMGdNVjA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUdGeVozTWdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzYjJOaGRHOXlPaUIxZEcxbExtTnlaV0YwWlVWc1pXMWxiblJNYjJOaGRHOXlLR1V1ZEdGeVoyVjBLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSFJwYldWeU8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR1YyZENBOVBTQW5iVzkxYzJWdmRtVnlKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGIyZG5iR1ZJYVdkb2JHbG5hSFFvWlM1MFlYSm5aWFFzSUhSeWRXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYVcxbGNuTXVjSFZ6YUNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsYkdWdFpXNTBPaUJsTG5SaGNtZGxkQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBiV1Z5T2lCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYjJkbmJHVlNaV0ZrZVNobExuUmhjbWRsZEN3Z2RISjFaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5bloyeGxTR2xuYUd4cFoyaDBLR1V1ZEdGeVoyVjBMQ0JtWVd4elpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUxDQTFNREFwWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaGxkblFnUFQwZ0oyMXZkWE5sYjNWMEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUhScGJXVnljeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIUnBiV1Z5YzF0cFhTNWxiR1Z0Wlc1MElEMDlJR1V1ZEdGeVoyVjBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWTJ4bFlYSlVhVzFsYjNWMEtIUnBiV1Z5YzF0cFhTNTBhVzFsY2lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHbHRaWEp6TG5Od2JHbGpaU2hwTENBeEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGIyZG5iR1ZJYVdkb2JHbG5hSFFvWlM1MFlYSm5aWFFzSUdaaGJITmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEc5bloyeGxVbVZoWkhrb1pTNTBZWEpuWlhRc0lHWmhiSE5sS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2MyaHZkV3hrVW1WamIzSmtSWFpsYm5Rb1pTNTBZWEpuWlhRc0lHVjJkQ2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaGxMbmRvYVdOb0lIeDhJR1V1WW5WMGRHOXVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdGeVozTXVZblYwZEc5dUlEMGdaUzUzYUdsamFDQjhmQ0JsTG1KMWRIUnZianRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1EyeHBZMnNnWW1WallYVnpaU0JqYUdGdVoyVWdabWx5WlhNZ1ptbHljMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dWMmRDQTlQVDBnSjJOb1lXNW5aU2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1lYSm5jeTVoZEhSeWFXSjFkR1Z6SUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRndpZG1Gc2RXVmNJaUE2SUdVdWRHRnlaMlYwTG5aaGJIVmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUZ3aVkyaGxZMnRsWkZ3aU9pQmxMblJoY21kbGRDNWphR1ZqYTJWa1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFYwYldVdWNtVm5hWE4wWlhKRmRtVnVkQ2hsZG5Rc0lHRnlaM01zSUdsa2VDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2ZUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdTRUZEU3lCbWIzSWdkR1Z6ZEdsdVoxeHVJQ0FnSUNBZ0lDQWdJQ0FnS0hWMGJXVXVaWFpsYm5STWFYTjBaVzVsY25NZ1BTQjFkRzFsTG1WMlpXNTBUR2x6ZEdWdVpYSnpJSHg4SUh0OUtWdGxkblJkSUQwZ2FHRnVaR3hsY2p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQm9ZVzVrYkdWeU8xeHVJQ0FnSUNBZ0lDQjlLU2hsZG1WdWRITmJhVjBwTENCMGNuVmxLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQjJZWElnWDNSdlgyRnpZMmxwSUQwZ2UxeHVJQ0FnSUNBZ0lDQW5NVGc0SnpvZ0p6UTBKeXhjYmlBZ0lDQWdJQ0FnSnpFNE9TYzZJQ2MwTlNjc1hHNGdJQ0FnSUNBZ0lDY3hPVEFuT2lBbk5EWW5MRnh1SUNBZ0lDQWdJQ0FuTVRreEp6b2dKelEzSnl4Y2JpQWdJQ0FnSUNBZ0p6RTVNaWM2SUNjNU5pY3NYRzRnSUNBZ0lDQWdJQ2N5TWpBbk9pQW5PVEluTEZ4dUlDQWdJQ0FnSUNBbk1qSXlKem9nSnpNNUp5eGNiaUFnSUNBZ0lDQWdKekl5TVNjNklDYzVNeWNzWEc0Z0lDQWdJQ0FnSUNjeU1Ua25PaUFuT1RFbkxGeHVJQ0FnSUNBZ0lDQW5NVGN6SnpvZ0p6UTFKeXhjYmlBZ0lDQWdJQ0FnSnpFNE55YzZJQ2MyTVNjc0lDOHZTVVVnUzJWNUlHTnZaR1Z6WEc0Z0lDQWdJQ0FnSUNjeE9EWW5PaUFuTlRrblhHNGdJQ0FnZlR0Y2JseHVJQ0FnSUhaaGNpQnphR2xtZEZWd2N5QTlJSHRjYmlBZ0lDQWdJQ0FnWENJNU5sd2lPaUJjSW41Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kwT1Z3aU9pQmNJaUZjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFNRndpT2lCY0lrQmNJaXhjYmlBZ0lDQWdJQ0FnWENJMU1Wd2lPaUJjSWlOY0lpeGNiaUFnSUNBZ0lDQWdYQ0kxTWx3aU9pQmNJaVJjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFNMXdpT2lCY0lpVmNJaXhjYmlBZ0lDQWdJQ0FnWENJMU5Gd2lPaUJjSWw1Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kxTlZ3aU9pQmNJaVpjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTFObHdpT2lCY0lpcGNJaXhjYmlBZ0lDQWdJQ0FnWENJMU4xd2lPaUJjSWloY0lpeGNiaUFnSUNBZ0lDQWdYQ0kwT0Z3aU9pQmNJaWxjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTBOVndpT2lCY0lsOWNJaXhjYmlBZ0lDQWdJQ0FnWENJMk1Wd2lPaUJjSWl0Y0lpeGNiaUFnSUNBZ0lDQWdYQ0k1TVZ3aU9pQmNJbnRjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTVNMXdpT2lCY0luMWNJaXhjYmlBZ0lDQWdJQ0FnWENJNU1sd2lPaUJjSW54Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kxT1Z3aU9pQmNJanBjSWl4Y2JpQWdJQ0FnSUNBZ1hDSXpPVndpT2lCY0lseGNYQ0pjSWl4Y2JpQWdJQ0FnSUNBZ1hDSTBORndpT2lCY0lqeGNJaXhjYmlBZ0lDQWdJQ0FnWENJME5sd2lPaUJjSWo1Y0lpeGNiaUFnSUNBZ0lDQWdYQ0kwTjF3aU9pQmNJajljSWx4dUlDQWdJSDA3WEc1Y2JpQWdJQ0JtZFc1amRHbHZiaUJyWlhsUWNtVnpjMGhoYm1Sc1pYSWdLR1VwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR1V1YVhOVWNtbG5aMlZ5S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdU8xeHVYRzRnSUNBZ0lDQWdJR2xtSUNnaGFYTkpaMjV2Y21Wa1JXeGxiV1Z1ZENobExuUmhjbWRsZENrZ0ppWWdjMmh2ZFd4a1VtVmpiM0prUlhabGJuUW9aUzUwWVhKblpYUXNJRndpYTJWNWNISmxjM05jSWlrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQmpJRDBnWlM1M2FHbGphRHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnVkU5RVR6b2dSRzlsYzI0bmRDQjNiM0pySUhkcGRHZ2dZMkZ3Y3lCc2IyTnJYRzRnSUNBZ0lDQWdJQ0FnSUNBdkwyNXZjbTFoYkdsNlpTQnJaWGxEYjJSbFhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1gzUnZYMkZ6WTJscExtaGhjMDkzYmxCeWIzQmxjblI1S0dNcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZeUE5SUY5MGIxOWhjMk5wYVZ0alhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRmxMbk5vYVdaMFMyVjVJQ1ltSUNoaklENDlJRFkxSUNZbUlHTWdQRDBnT1RBcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZeUE5SUZOMGNtbHVaeTVtY205dFEyaGhja052WkdVb1l5QXJJRE15S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvWlM1emFHbG1kRXRsZVNBbUppQnphR2xtZEZWd2N5NW9ZWE5QZDI1UWNtOXdaWEowZVNoaktTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQzh2WjJWMElITm9hV1owWldRZ2EyVjVRMjlrWlNCMllXeDFaVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR01nUFNCemFHbG1kRlZ3YzF0alhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWXlBOUlGTjBjbWx1Wnk1bWNtOXRRMmhoY2tOdlpHVW9ZeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lIVjBiV1V1Y21WbmFYTjBaWEpGZG1WdWRDZ25hMlY1Y0hKbGMzTW5MQ0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYkc5allYUnZjam9nZFhSdFpTNWpjbVZoZEdWRmJHVnRaVzUwVEc5allYUnZjaWhsTG5SaGNtZGxkQ2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYTJWNU9pQmpMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEJ5WlhaV1lXeDFaVG9nWlM1MFlYSm5aWFF1ZG1Gc2RXVXNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZzZFdVNklHVXVkR0Z5WjJWMExuWmhiSFZsSUNzZ1l5eGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnJaWGxEYjJSbE9pQmxMbXRsZVVOdlpHVmNiaUFnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ1pHOWpkVzFsYm5RdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnbmEyVjVjSEpsYzNNbkxDQnJaWGxRY21WemMwaGhibVJzWlhJc0lIUnlkV1VwTzF4dVhHNGdJQ0FnTHk4Z1NFRkRTeUJtYjNJZ2RHVnpkR2x1WjF4dUlDQWdJQ2gxZEcxbExtVjJaVzUwVEdsemRHVnVaWEp6SUQwZ2RYUnRaUzVsZG1WdWRFeHBjM1JsYm1WeWN5QjhmQ0I3ZlNsYkoydGxlWEJ5WlhOekoxMGdQU0JyWlhsUWNtVnpjMGhoYm1Sc1pYSTdYRzU5WEc1Y2JtWjFibU4wYVc5dUlHZGxkRkJoY21GdFpYUmxja0o1VG1GdFpTaHVZVzFsS1NCN1hHNGdJQ0FnYm1GdFpTQTlJRzVoYldVdWNtVndiR0ZqWlNndlcxeGNXMTB2TENCY0lseGNYRnhiWENJcExuSmxjR3hoWTJVb0wxdGNYRjFkTHl3Z1hDSmNYRnhjWFZ3aUtUdGNiaUFnSUNCMllYSWdjbVZuWlhnZ1BTQnVaWGNnVW1WblJYaHdLRndpVzF4Y1hGdy9KbDFjSWlBcklHNWhiV1VnS3lCY0lqMG9XMTRtSTEwcUtWd2lLU3hjYmlBZ0lDQWdJQ0FnY21WemRXeDBjeUE5SUhKbFoyVjRMbVY0WldNb2JHOWpZWFJwYjI0dWMyVmhjbU5vS1R0Y2JpQWdJQ0J5WlhSMWNtNGdjbVZ6ZFd4MGN5QTlQVDBnYm5Wc2JDQS9JRndpWENJZ09pQmtaV052WkdWVlVrbERiMjF3YjI1bGJuUW9jbVZ6ZFd4MGMxc3hYUzV5WlhCc1lXTmxLQzljWENzdlp5d2dYQ0lnWENJcEtUdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1ltOXZkSE4wY21Gd1ZYUnRaU2dwSUh0Y2JpQWdhV1lnS0dSdlkzVnRaVzUwTG5KbFlXUjVVM1JoZEdVZ1BUMGdYQ0pqYjIxd2JHVjBaVndpS1NCN1hHNGdJQ0FnZFhSdFpTNXBibWwwS0NrdWRHaGxiaWhtZFc1amRHbHZiaUFvS1NCN1hHNWNiaUFnSUNBZ0lDQWdhVzVwZEVWMlpXNTBTR0Z1Wkd4bGNuTW9LVHRjYmx4dUlDQWdJQ0FnSUNCcFppQW9kWFJ0WlM1cGMxSmxZMjl5WkdsdVp5Z3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjFkRzFsTG5KbFoybHpkR1Z5UlhabGJuUW9YQ0pzYjJGa1hDSXNJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213NklIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY0hKdmRHOWpiMnc2SUhkcGJtUnZkeTVzYjJOaGRHbHZiaTV3Y205MGIyTnZiQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FHOXpkRG9nZDJsdVpHOTNMbXh2WTJGMGFXOXVMbWh2YzNRc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sWVhKamFEb2dkMmx1Wkc5M0xteHZZMkYwYVc5dUxuTmxZWEpqYUN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhR0Z6YURvZ2QybHVaRzkzTG14dlkyRjBhVzl1TG1oaGMyaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMHBPMXh1SUNCOVhHNTlYRzVjYm1KdmIzUnpkSEpoY0ZWMGJXVW9LVHRjYm1SdlkzVnRaVzUwTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjNKbFlXUjVjM1JoZEdWamFHRnVaMlVuTENCaWIyOTBjM1J5WVhCVmRHMWxLVHRjYmx4dWQybHVaRzkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjNWdWJHOWhaQ2NzSUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNCMWRHMWxMblZ1Ykc5aFpDZ3BPMXh1ZlN3Z2RISjFaU2s3WEc1Y2JuZHBibVJ2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkbGNuSnZjaWNzSUdaMWJtTjBhVzl1SUNobGNuSXBJSHRjYmlBZ0lDQjFkRzFsTG5KbGNHOXlkRXh2WnloY0lsTmpjbWx3ZENCRmNuSnZjam9nWENJZ0t5Qmxjbkl1YldWemMyRm5aU0FySUZ3aU9sd2lJQ3NnWlhKeUxuVnliQ0FySUZ3aUxGd2lJQ3NnWlhKeUxteHBibVVnS3lCY0lqcGNJaUFySUdWeWNpNWpiMndwTzF4dWZTazdYRzVjYm0xdlpIVnNaUzVsZUhCdmNuUnpJRDBnZFhSdFpUdGNiaUpkZlE9PSIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFwiY2hlY2tib3hlc0NoZWNrUHJvcGVybHlcIjoge1xuICAgICAgICBcInRlc3RcIjogXCJDbGljayBhIGNoZWNrYm94IGFuZCByZXBsYXkgaXQgcHJvcGVybHlcIixcbiAgICAgICAgXCJodG1sXCI6IFwiPGlucHV0IHR5cGU9J2NoZWNrYm94Jy8+XCIsXG4gICAgICAgIFwiZXZlbnRzXCI6IFt7XG4gICAgICAgICAgICBcInNlbGVjdG9yXCI6IFwiI3Rlc3RBcmVhIGlucHV0XCIsXG4gICAgICAgICAgICBcImV2ZW50XCI6IFwiY2hhbmdlXCIsXG4gICAgICAgICAgICBcImNoZWNrZWRcIjogdHJ1ZVxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBcInNlbGVjdG9yXCI6IFwiI3Rlc3RBcmVhIGlucHV0XCIsXG4gICAgICAgICAgICBcImV2ZW50XCI6IFwiY2xpY2tcIixcbiAgICAgICAgICAgIFwiY2hlY2tlZFwiOiB0cnVlXG4gICAgICAgIH1dXG4gICAgfVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBcImVsZW1lbnRXaXRoQ2xpY2tcIjoge1xuICAgICAgICBcInRlc3RcIjogXCJmaXJlcyBjbGljayBldmVudFwiLFxuICAgICAgICBcInNjZW5hcmlvXCI6IHtcbiAgICAgICAgICAgIFwic3RlcHNcIjogW3tcbiAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcImNsaWNrXCIsXG4gICAgICAgICAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJsb2NhdG9yXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInNlbGVjdG9yc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCIjdGVzdEFyZWEgZGl2XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIFwiaHRtbFwiOiBcIjxkaXY+PC9kaXY+XCIsXG4gICAgICAgIFwiZXhwZWN0XCI6IFt7XG4gICAgICAgICAgICBcInNlbGVjdG9yXCI6IFwiI3Rlc3RBcmVhIGRpdlwiLFxuICAgICAgICAgICAgXCJldmVudFwiOiBcImNsaWNrXCJcbiAgICAgICAgfV1cbiAgICB9LFxuICAgIFwiZWxlbWVudFdpdGhOb0ltcG9ydGFudEV2ZW50c1wiOiB7XG4gICAgICAgIFwidGVzdFwiOiBcImRvZXMgbm90IGZpcmUgZXZlbnRzLCBpZiBubyBpbXBvcnRhbnQgZXZlbnRzIGFyZSBmb3VuZFwiLFxuICAgICAgICBcInNjZW5hcmlvXCI6IHtcbiAgICAgICAgICAgIFwic3RlcHNcIjogW3tcbiAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlZW50ZXJcIixcbiAgICAgICAgICAgICAgICBcInRpbWVTdGFtcFwiOiAwLFxuICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibG9jYXRvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUlkXCI6IFwiMVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiI3Rlc3RBcmVhIGRpdlwiXG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZW92ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMTAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlb3V0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwidGltZVN0YW1wXCI6IDIwLFxuICAgICAgICAgICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJsb2NhdG9yXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUlkXCI6IFwiMVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic2VsZWN0b3JzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCIjdGVzdEFyZWEgZGl2XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZWxlYXZlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidGltZVN0YW1wXCI6IDMwLFxuICAgICAgICAgICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJsb2NhdG9yXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUlkXCI6IFwiMVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic2VsZWN0b3JzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCIjdGVzdEFyZWEgZGl2XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICBcImh0bWxcIjogXCI8ZGl2PjwvZGl2PlwiLFxuICAgICAgICBcImV4cGVjdFwiOiBbXVxuICAgIH0sXG4gICAgXCJlbGVtZW50V2l0aE5vSW1wb3J0YW50RXZlbnRzQnV0SGlnaEhvdmVyVGltZVwiOiAge1xuICAgICAgICBcInRlc3RcIjogXCJmaXJlIG5vbiBpbXBvcnRhbnQgZXZlbnRzIHdoZW4gdGhlIHVzZXIgaGFzIGludGVyYWN0ZWQgd2l0aCB0aGUgZWxlbWVudCBmb3IgYSBsb25nIHRpbWVcIixcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoaXMgaXMgdXNlZnVsIGZvciBob3ZlciBiZWhhdmlvcnMsIG1lbnVzIHRoYXQgc2hvdyB1cCBvbiBob3ZlclwiLFxuICAgICAgICBcInNjZW5hcmlvXCI6IHtcbiAgICAgICAgICAgIFwic3RlcHNcIjogW3tcbiAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlZW50ZXJcIixcbiAgICAgICAgICAgICAgICBcInRpbWVTdGFtcFwiOiAwLFxuICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibG9jYXRvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUlkXCI6IFwiMVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiI3Rlc3RBcmVhIGRpdlwiXG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZW92ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMTAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlb3V0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwidGltZVN0YW1wXCI6IDQwMDAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlbGVhdmVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogNDAxMCxcbiAgICAgICAgICAgICAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibG9jYXRvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ1bmlxdWVJZFwiOiBcIjFcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNlbGVjdG9yc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiI3Rlc3RBcmVhIGRpdlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAgXCJodG1sXCI6IFwiPGRpdj48L2Rpdj5cIixcbiAgICAgICAgXCJleHBlY3RcIjogW3tcbiAgICAgICAgICAgIFwic2VsZWN0b3JcIjogXCIjdGVzdEFyZWEgZGl2XCIsXG4gICAgICAgICAgICBcImV2ZW50XCI6IFwibW91c2VlbnRlclwiXG4gICAgICAgIH0se1xuICAgICAgICAgICAgXCJzZWxlY3RvclwiOiBcIiN0ZXN0QXJlYSBkaXZcIixcbiAgICAgICAgICAgIFwiZXZlbnRcIjogXCJtb3VzZW92ZXJcIlxuXG4gICAgICAgIH0se1xuICAgICAgICAgICAgXCJzZWxlY3RvclwiOiBcIiN0ZXN0QXJlYSBkaXZcIixcbiAgICAgICAgICAgIFwiZXZlbnRcIjogXCJtb3VzZW91dFwiXG5cbiAgICAgICAgfSx7XG4gICAgICAgICAgICBcInNlbGVjdG9yXCI6IFwiI3Rlc3RBcmVhIGRpdlwiLFxuICAgICAgICAgICAgXCJldmVudFwiOiBcIm1vdXNlbGVhdmVcIlxuICAgICAgICB9XVxuICAgIH0sXG4gICAgXCJlbGVtZW50V2l0aFBhcnRpYWxDbGlja1wiOiB7XG4gICAgICAgIFwidGVzdFwiOiBcImZpcmUgY2xpY2sgZXZlbnQgb24gZWxlbWVudCwgd2l0aCBhIHNob3J0IHVzZXIgaW50ZXJhY3Rpb24gcGVyaW9kXCIsXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGlzIGhhcHBlbnMgd2hlbiBjbGlja2luZyBvbiBhIGJ1dHRvbiBnb2VzIHRvIGFub3RoZXIgcGFnZSwgYnV0IGJlZm9yZSBtb3VzZSB1cCBpcyBmaXJlZCwgdGhlIHBhZ2UgaXMgY2hhbmdlZCwgc28gYSBtb3VzZSB1cCBpc24ndCByZWdpc3RlcmVkXCIsXG4gICAgICAgIFwic2NlbmFyaW9cIjoge1xuICAgICAgICAgICAgXCJzdGVwc1wiOiBbe1xuICAgICAgICAgICAgICAgIFwiZXZlbnROYW1lXCI6IFwibW91c2Vkb3duXCIsXG4gICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMCxcbiAgICAgICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ1bmlxdWVJZFwiOiBcIjFcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic2VsZWN0b3JzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZXZlbnROYW1lXCI6IFwiY2xpY2tcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMTAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcImJsdXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMjAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIFwiaHRtbFwiOiBcIjxkaXY+PC9kaXY+XCIsXG4gICAgICAgIFwiZXhwZWN0XCI6IFt7XG4gICAgICAgICAgICBcInNlbGVjdG9yXCI6IFwiI3Rlc3RBcmVhIGRpdlwiLFxuICAgICAgICAgICAgXCJldmVudFwiOiBcImNsaWNrXCJcbiAgICAgICAgfV1cbiAgICB9LFxuICAgIFwibm9uSW1wb3J0YW50RWxlbWVudEluc2lkZUltcG9ydGFudEVsZW1lbnRcIjoge1xuICAgICAgICBcInRlc3RcIjogXCJkb2VzIG5vdCBmaXJlIGV2ZW50cyBmb3IgYW4gZWxlbWVudCB0aGF0IHRoZSB1c2VyIGhhcyBub3QgcmVhbGx5IGludGVyYWN0ZWQgd2l0aFwiLFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhpcyBpcyB1c2VmdWwgZm9yIHdoZW4gdGhlIHVzZXIgaXMganVzdCBtb3ZpbmcgdGhlaXIgbW91c2Ugb3ZlciBhbiBlbGVtZW50IHRvIGdldCB0byBhbm90aGVyLCBidXQgbm90IHJlYWxseSBpbnRlcmFjdGluZyB3aXRoIHRoYXQgZWxlbWVudFwiLFxuICAgICAgICBcInNjZW5hcmlvXCI6IHtcbiAgICAgICAgICAgIFwic3RlcHNcIjogW3tcbiAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlZW50ZXJcIixcbiAgICAgICAgICAgICAgICBcInRpbWVTdGFtcFwiOiAwLFxuICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibG9jYXRvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUlkXCI6IFwiMVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiI3Rlc3RBcmVhIGRpdlwiXG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZW92ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMTAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlZW50ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMjAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBzcGFuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZW92ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogMzAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBzcGFuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZW91dFwiLFxuICAgICAgICAgICAgICAgICAgICBcInRpbWVTdGFtcFwiOiA0MCxcbiAgICAgICAgICAgICAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibG9jYXRvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ1bmlxdWVJZFwiOiBcIjJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNlbGVjdG9yc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiI3Rlc3RBcmVhIHNwYW5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImV2ZW50TmFtZVwiOiBcIm1vdXNlbGVhdmVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0aW1lU3RhbXBcIjogNTAsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBzcGFuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZW91dFwiLFxuICAgICAgICAgICAgICAgICAgICBcInRpbWVTdGFtcFwiOiA0MDAwLFxuICAgICAgICAgICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJsb2NhdG9yXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInVuaXF1ZUlkXCI6IFwiMVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic2VsZWN0b3JzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCIjdGVzdEFyZWEgZGl2XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudE5hbWVcIjogXCJtb3VzZWxlYXZlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidGltZVN0YW1wXCI6IDQwMDEsXG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidW5pcXVlSWRcIjogXCIxXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3RvcnNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIFwiaHRtbFwiOiBcIjxkaXY+PHNwYW4+PC9zcGFuPjwvZGl2PlwiLFxuICAgICAgICBcImV4cGVjdFwiOiBbe1xuICAgICAgICAgICAgXCJzZWxlY3RvclwiOiBcIiN0ZXN0QXJlYSBkaXZcIixcbiAgICAgICAgICAgIFwiZXZlbnRcIjogXCJtb3VzZWVudGVyXCJcbiAgICAgICAgfSx7XG4gICAgICAgICAgICBcInNlbGVjdG9yXCI6IFwiI3Rlc3RBcmVhIGRpdlwiLFxuICAgICAgICAgICAgXCJldmVudFwiOiBcIm1vdXNlb3ZlclwiXG4gICAgICAgIH0se1xuICAgICAgICAgICAgXCJzZWxlY3RvclwiOiBcIiN0ZXN0QXJlYSBkaXZcIixcbiAgICAgICAgICAgIFwiZXZlbnRcIjogXCJtb3VzZW91dFwiXG4gICAgICAgIH0se1xuICAgICAgICAgICAgXCJzZWxlY3RvclwiOiBcIiN0ZXN0QXJlYSBkaXZcIixcbiAgICAgICAgICAgIFwiZXZlbnRcIjogXCJtb3VzZWxlYXZlXCJcbiAgICAgICAgfV1cbiAgICB9LFxuICAgIFwic2NlbmFyaW9XaXRoUHJlY29uZGl0aW9uc1wiOiB7XG4gICAgICAgIFwic2NlbmFyaW9cIjoge1xuICAgICAgICAgICAgXCJzdGVwc1wiOiBbe1xuICAgICAgICAgICAgICAgIFwiZXZlbnROYW1lXCI6IFwiY2xpY2tcIixcbiAgICAgICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgICAgICBcImxvY2F0b3JcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ1bmlxdWVJZFwiOiBcIjFcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic2VsZWN0b3JzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN0ZXN0QXJlYSBkaXZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBcInNldHVwXCI6IHtcbiAgICAgICAgICAgICAgICBcInNjZW5hcmlvc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwic2V0dXAtc2NlbmFyaW9cIlxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKVxuXG5kZXNjcmliZSgnVXRtZSBUZXN0cycsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaXNJbkJyb3dzZXIgPSAhIWdsb2JhbC53aW5kb3c7XG4gICAgaWYgKCFpc0luQnJvd3Nlcikge1xuICAgICAgICByZXF1aXJlKCdtb2NoYS1qc2RvbScpKCk7XG4gICAgICAgIHJlcXVpcmUoJ2JldHRlci1yZXF1aXJlJykoJ2pzb24nKTtcbiAgICB9XG5cbiAgICB2YXIgdGVzdEVsZTtcbiAgICBiZWZvcmVFYWNoKGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgIGlmICghaXNJbkJyb3dzZXIpIHtcbiAgICAgICAgICAgICQgPSByZXF1aXJlKCdqcXVlcnknKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0luQnJvd3Nlcikge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZXN0RWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXN0QXJlYVwiKTtcbiAgICAgICAgaWYgKCF0ZXN0RWxlKSB7XG4gICAgICAgICAgICB0ZXN0RWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIHRlc3RFbGUuaWQgPSBcInRlc3RBcmVhXCI7XG4gICAgICAgIH1cbiAgICAgICAgdGVzdEVsZS5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRlc3RFbGUpO1xuXG4gICAgICAgIHZhciBsb2NhbFN0b3JhZ2VWYWx1ZXMgPSB7fTtcbiAgICAgICAgbG9jYWxTdG9yYWdlID0ge1xuICAgICAgICAgICAgc2V0SXRlbTogZnVuY3Rpb24gKHBhdGgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlVmFsdWVzW3BhdGhdID0gdmFsdWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0SXRlbTogZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9jYWxTdG9yYWdlVmFsdWVzW3BhdGhdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlbW92ZUl0ZW06IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVZhbHVlc1twYXRoXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgc2VsZWN0b3JGaW5kZXIgPSByZXF1aXJlKFwiLi4vc3JjL2pzL3NlbGVjdG9yRmluZGVyXCIpLnNlbGVjdG9yRmluZGVyO1xuXG4gICAgICAgIC8vIENsZWFuIHV0bWUsIGNhdXNlIGl0IGlzIGEgc2luZ2xldG9uIHJpZ2h0IG5vd1xuICAgICAgICBmb3IgKHZhciBpIGluIHJlcXVpcmUuY2FjaGUpIHtcbiAgICAgICAgICAgIGlmIChpLmluZGV4T2YoXCJ1dG1lLmpzXCIpID49IDApIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVxdWlyZS5jYWNoZVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHV0bWUgPSByZXF1aXJlKFwiLi4vc3JjL2pzL3V0bWVcIik7XG4gICAgICAgIHV0bWUuaW5pdCgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ3NlbGVjdG9yIGZpbmRpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGl0KCdzaG91bGQgc3RhcnQgb2Ygd2l0aCBhIHN0YXR1cyBvZiBMT0FERUQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGF0dXMsIFwiTE9BREVEXCIpO1xuICAgICAgICB9KVxuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIHRoZSBjb3JyZWN0IHNlbGVjdG9yIDEnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdj48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgdmFyIGxvY2F0b3IgPSB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGVsZW1lbnRzWzBdKTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGxvY2F0b3Iuc2VsZWN0b3JzWzBdLCBcIltpZD0ndGVzdEFyZWEnXSA+IGRpdjplcSgwKVwiKTtcbiAgICAgICAgfSlcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSB0aGUgY29ycmVjdCBzZWxlY3RvciAyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gJChcIjxkaXY+PC9kaXY+PGRpdj48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgbG9jYXRvciA9IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZWxlbWVudHNbMV0pO1xuXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobG9jYXRvci5zZWxlY3RvcnNbMF0sIFwiW2lkPSd0ZXN0QXJlYSddID4gZGl2OmVxKDEpXCIpO1xuICAgICAgICB9KVxuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIHRoZSBjb3JyZWN0IHNlbGVjdG9yIDMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdj48L2Rpdj48ZGl2IGNsYXNzPSdteUNsYXNzJz48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgbG9jYXRvciA9IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZWxlbWVudHNbMV0pO1xuICAgICAgICAgICAgLy8gdXRtZS5maW5hbGl6ZUxvY2F0b3IobG9jYXRvcik7XG5cbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChsb2NhdG9yLnNlbGVjdG9yc1swXSwgXCJbaWQ9J3Rlc3RBcmVhJ10gZGl2Lm15Q2xhc3M6ZXEoMClcIik7XG4gICAgICAgIH0pXG5cbiAgICAgICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgdGhlIGNvcnJlY3Qgc2VsZWN0b3IgNCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICQoXCI8ZGl2IGNsYXNzPSdteUNsYXNzJz48L2Rpdj48ZGl2IGNsYXNzPSdteUNsYXNzJz48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgbG9jYXRvciA9IHV0bWUuY3JlYXRlRWxlbWVudExvY2F0b3IoZWxlbWVudHNbMF0pO1xuXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwobG9jYXRvci5zZWxlY3RvcnNbMF0sIFwiW2lkPSd0ZXN0QXJlYSddIGRpdi5teUNsYXNzOmVxKDApXCIpO1xuICAgICAgICB9KVxuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIHRoZSBjb3JyZWN0IHNlbGVjdG9yIDUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdiBjbGFzcz0nbXlDbGFzcyc+PC9kaXY+PGRpdiBjbGFzcz0nbXlDbGFzcyc+PC9kaXY+XCIpO1xuICAgICAgICAgICAgZWxlbWVudHMuYXBwZW5kVG8odGVzdEVsZSk7XG5cbiAgICAgICAgICAgIGxvY2F0b3IgPSB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGVsZW1lbnRzWzFdKTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGxvY2F0b3Iuc2VsZWN0b3JzWzBdLCBcIltpZD0ndGVzdEFyZWEnXSBkaXYubXlDbGFzczplcSgxKVwiKTtcbiAgICAgICAgfSlcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSB0aGUgY29ycmVjdCBzZWxlY3RvciA2JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gJChcIjxkaXYgY2xhc3M9J215Q2xhc3MnPjxkaXYgY2xhc3M9J215Q2xhc3MnPjwvZGl2PjwvZGl2PlwiKTtcbiAgICAgICAgICAgIGVsZW1lbnRzLmFwcGVuZFRvKHRlc3RFbGUpO1xuXG4gICAgICAgICAgICBsb2NhdG9yID0gdXRtZS5jcmVhdGVFbGVtZW50TG9jYXRvcihlbGVtZW50c1swXS5jaGlsZE5vZGVzWzBdKTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGxvY2F0b3Iuc2VsZWN0b3JzWzBdLCBcImRpdi5teUNsYXNzIGRpdi5teUNsYXNzOmVxKDApXCIpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGxvY2F0b3Iuc2VsZWN0b3JzWzFdLCBcImRpdi5teUNsYXNzOmVxKDEpXCIpO1xuICAgICAgICB9KVxuXG4gICAgICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIHRoZSBjb3JyZWN0IHNlbGVjdG9yIDcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdiB0aXRsZT0nbXlUaXRsZSc+PGRpdiBjbGFzcz0nbXlDbGFzcyc+PC9kaXY+PC9kaXY+XCIpO1xuICAgICAgICAgICAgZWxlbWVudHMuYXBwZW5kVG8odGVzdEVsZSk7XG5cbiAgICAgICAgICAgIGxvY2F0b3IgPSB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGVsZW1lbnRzWzBdKTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGxvY2F0b3Iuc2VsZWN0b3JzWzBdLCBcIltpZD0ndGVzdEFyZWEnXSBkaXZbdGl0bGU9XFxcIm15VGl0bGVcXFwiXTplcSgwKVwiKTtcbiAgICAgICAgfSlcblxuICAgICAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSB0aGUgY29ycmVjdCBzZWxlY3RvciA4JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gJChcIjxkaXYgdGl0bGU9J215VGl0bGUnPjwvZGl2PjxzcGFuPjwvc3Bhbj48ZGl2IGNsYXNzPSdjb29sJz48ZGl2PjxkaXY+PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuICAgICAgICAgICAgZWxlbWVudHMuYXBwZW5kVG8odGVzdEVsZSk7XG5cbiAgICAgICAgICAgIHZhciBpbm5lckRpdiA9ICQoJy5jb29sID4gZGl2ID4gZGl2JywgdGVzdEVsZSk7XG5cbiAgICAgICAgICAgIGxvY2F0b3IgPSB1dG1lLmNyZWF0ZUVsZW1lbnRMb2NhdG9yKGlubmVyRGl2WzBdKTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGxvY2F0b3Iuc2VsZWN0b3JzWzBdLCBcImRpdi5jb29sIGRpdjplcSgxKVwiKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChsb2NhdG9yLnNlbGVjdG9yc1sxXSwgXCJkaXY6ZXEoNClcIik7XG4gICAgICAgIH0pXG5cblxuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ3N0ZXAgcmVjb3JkaW5nJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBiZWZvcmVFYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHV0bWUuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBzZXQgdGhlIHN0YXR1cyB0byBSRUNPUkRJTkcgYWZ0ZXIgeW91IHN0YXJ0IHJlY29yZGluZycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0YXR1cywgXCJSRUNPUkRJTkdcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmVjb3JkIGEgXCJsb2FkXCIgZXZlbnQgd2hlbiByZWNvcmRpbmcgc3RhcnRzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHV0bWUuc3RhdGUuc3RlcHMubGVuZ3RoLCAxKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzWzBdLmV2ZW50TmFtZSwgXCJsb2FkXCIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHNldCBhIHRpbWVzdGFtcCB3aGVuIHJlY29yZGluZyBhbiBldmVudCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJFdmVudCgndGVzdEV2ZW50Jywge30pO1xuXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGVwc1sxXS5ldmVudE5hbWUsIFwidGVzdEV2ZW50XCIpO1xuICAgICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHR5cGVvZiB1dG1lLnN0YXRlLnN0ZXBzWzFdLnRpbWVTdGFtcCwgXCJ1bmRlZmluZWRcIik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ21vdXNlIGV2ZW50IHJlZ2lzdGVyaW5nJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBiZWZvcmVFYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHV0bWUuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZWdpc3RlciBhbGwgZXZlbnRzIGFzIHN0ZXBzIHdoZW4gbW91c2VvdmVyaW5nIGFuIGVsZW1lbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdj48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgdXRtZS5ldmVudExpc3RlbmVyc1snbW91c2VlbnRlciddKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnRzWzBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHV0bWUuZXZlbnRMaXN0ZW5lcnNbJ21vdXNlb3ZlciddKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnRzWzBdXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHV0bWUuc3RhdGUuc3RlcHMubGVuZ3RoLCAzKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzWzFdLmV2ZW50TmFtZSwgJ21vdXNlZW50ZXInKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzWzJdLmV2ZW50TmFtZSwgJ21vdXNlb3ZlcicpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHJlZ2lzdGVyIHdoaWNoIGJ1dHRvbiB3YXMgZG93biB3aGVuIGNsaWNrIGlzIGZpcmVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnRzID0gJChcIjxkaXY+PC9kaXY+XCIpO1xuICAgICAgICAgICAgZWxlbWVudHMuYXBwZW5kVG8odGVzdEVsZSk7XG5cbiAgICAgICAgICAgIHV0bWUuZXZlbnRMaXN0ZW5lcnNbJ2NsaWNrJ10oe1xuICAgICAgICAgICAgICAgIHRhcmdldDogZWxlbWVudHNbMF0sXG4gICAgICAgICAgICAgICAgd2hpY2g6IDQ5MDgzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHV0bWUuc3RhdGUuc3RlcHMubGVuZ3RoLCAyKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzWzFdLmV2ZW50TmFtZSwgJ2NsaWNrJyk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGVwc1sxXS5kYXRhLmJ1dHRvbiwgNDkwODMpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIG5vdCByZWdpc3RlciBldmVudHMgaWYgbm90IHJlY29yZGluZycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHV0bWUuc3RvcFJlY29yZGluZyhmYWxzZSk7XG5cbiAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICQoXCI8ZGl2PjwvZGl2PlwiKTtcbiAgICAgICAgICAgIGVsZW1lbnRzLmFwcGVuZFRvKHRlc3RFbGUpO1xuXG4gICAgICAgICAgICB1dG1lLmV2ZW50TGlzdGVuZXJzWydtb3VzZW92ZXInXSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBlbGVtZW50c1swXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aCwgMSk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGVwc1swXS5ldmVudE5hbWUsICdsb2FkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgbm90IHJlZ2lzdGVyIHR3byBldmVudHMgaWYgaW4gYSBsYWJlbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICQoXCI8bGFiZWw+PGlucHV0Lz48c3Bhbj48L3NwYW4+PC9sYWJlbD5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgdXRtZS5ldmVudExpc3RlbmVyc1snbW91c2VlbnRlciddKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnRzLmZpbmQoXCJzcGFuXCIpWzBdXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdXRtZS5ldmVudExpc3RlbmVyc1snbW91c2VlbnRlciddKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnRzLmZpbmQoXCJpbnB1dFwiKVswXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aCwgMik7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGVwc1swXS5ldmVudE5hbWUsICdsb2FkJyk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGVwc1sxXS5ldmVudE5hbWUsICdtb3VzZWVudGVyJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmVnaXN0ZXIgXCJtXCIgYXMgdGhlIGNoYXJhY3RlciB3aGVuIHRoZSBcIm1cIiBjaGFyYWN0ZXIgaXMgcHJlc3NlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICQoXCI8ZGl2PjwvZGl2PlwiKTtcbiAgICAgICAgICAgIGVsZW1lbnRzLmFwcGVuZFRvKHRlc3RFbGUpO1xuXG4gICAgICAgICAgICB1dG1lLmV2ZW50TGlzdGVuZXJzWydrZXlwcmVzcyddKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnRzWzBdLFxuICAgICAgICAgICAgICAgIHdoaWNoOiAxMDlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGVwcy5sZW5ndGgsIDIpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHV0bWUuc3RhdGUuc3RlcHNbMV0uZXZlbnROYW1lLCAna2V5cHJlc3MnKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzWzFdLmRhdGEua2V5LCAnbScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHJlY29yZCB0aGUgY2hlY2tlZCBwcm9wZXJ0eSBjaGVja2JveGVzLCB3aGVuIGNoYW5nZSBpcyBmaXJlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICQoXCI8aW5wdXQgdHlwZT0nY2hlY2tib3gnIGNoZWNrZWQ9J3RydWUnPjwvZGl2PlwiKTtcbiAgICAgICAgICAgIGVsZW1lbnRzLmFwcGVuZFRvKHRlc3RFbGUpO1xuXG4gICAgICAgICAgICB1dG1lLmV2ZW50TGlzdGVuZXJzWydjaGFuZ2UnXSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBlbGVtZW50c1swXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzLmxlbmd0aCwgMik7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodXRtZS5zdGF0ZS5zdGVwc1sxXS5ldmVudE5hbWUsICdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh1dG1lLnN0YXRlLnN0ZXBzWzFdLmRhdGEuYXR0cmlidXRlcy5jaGVja2VkLCB0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgncnVuIHNjZW5hcmlvJywgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBldmVudHNUZXN0cyA9IHJlcXVpcmUoXCIuL2V2ZW50c1wiKTtcbiAgICAgICAgdmFyIHRlc3RTY2VuYXJpb3MgPSByZXF1aXJlKFwiLi9zY2VuYXJpb3NcIik7XG4gICAgICAgIGl0KCdsb2FkIGEgc2NlbmFyaW8gd2hlbiBydW5TY2VuYXJpbyBpcyBjYWxsZWQnLCBmdW5jdGlvbiAoZG9uZSkge1xuXG4gICAgICAgICAgICB2YXIgaXNEb25lID0gZmFsc2U7XG4gICAgICAgICAgICB1dG1lLnJlZ2lzdGVyTG9hZEhhbmRsZXIoZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlc3QgPSB0ZXN0U2NlbmFyaW9zLmVsZW1lbnRXaXRoQ2xpY2s7XG4gICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIGlzRG9uZSA9IHRydWU7XG4gICAgICAgICAgICB9LCAwKTtcblxuICAgICAgICAgICAgdXRtZS5ydW5TY2VuYXJpbygnd2hhdGV2ZXInKTtcblxuICAgICAgICAgICAgaWYgKCFpc0RvbmUpIHtcbiAgICAgICAgICAgICAgICBkb25lKFwiTG9hZCBub3QgY2FsbGVkIVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc3VjY2Vzc2Z1bGx5IGNvbXBsZXRlIHdpdGggYSBzaW5nbGUgc3RlcCcsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdj48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgdXRtZS5yZWdpc3RlclJlcG9ydEhhbmRsZXIoe1xuICAgICAgICAgICAgICAgIGxvZzogZnVuY3Rpb24gKHR4dCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHh0LmluZGV4T2YoXCJDb21wbGV0ZWRcIikgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAodHh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHR4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJMb2FkSGFuZGxlcihmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgdGVzdCA9IHRlc3RTY2VuYXJpb3MuZWxlbWVudFdpdGhDbGljaztcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0ZXN0LnNjZW5hcmlvKTtcbiAgICAgICAgICAgIH0sIDApO1xuXG4gICAgICAgICAgICB1dG1lLnJ1blNjZW5hcmlvKCd3aGF0ZXZlcicpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGxvYWQgcHJlY29uZGl0aW9ucyBwcm9wZXJseScsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdj48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgdmFyIGlzRG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXRtZS5yZWdpc3RlckxvYWRIYW5kbGVyKGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKFwiTm90IGxvYWRpbmcgcHJlY29uZGl0aW9ucyBwcm9wZXJseVwiKVxuICAgICAgICAgICAgICAgICAgICBpc0RvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobmFtZSA9PSAnd2hhdGV2ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXN0ID0gdGVzdFNjZW5hcmlvcy5zY2VuYXJpb1dpdGhQcmVjb25kaXRpb25zO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh0ZXN0LnNjZW5hcmlvKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgICAgIGlzRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMCk7XG5cbiAgICAgICAgICAgIHV0bWUucnVuU2NlbmFyaW8oJ3doYXRldmVyJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVNjZW5hcmlvVGVzdCh0ZXN0KSB7XG5cbiAgICAgICAgICAgIC8vIEl0IGlzbid0IGFuIGFjdHVhbCB0ZXN0XG4gICAgICAgICAgICBpZiAodGVzdC50ZXN0KSB7XG4gICAgICAgICAgICAgICAgaXQodGVzdC50ZXN0LCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXNEb25lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICQodGVzdC5odG1sKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMuYXBwZW5kVG8odGVzdEVsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGV4cGVjdHMgPSAodGVzdC5leHBlY3QgfHwgW10pLnNsaWNlKDApO1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBleHBlY3QgYSBzZXQgb2YgZWxlbWVudHMgdG8gaGF2ZSBldmVudHMgZmlyZWQgdXBvbiB0aGVtXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZXN0LmV4cGVjdCAmJiB0ZXN0LmV4cGVjdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGFzdEV4cGVjdGVkUnVuSWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RzLmZvckVhY2goZnVuY3Rpb24gKGV4cGVjdCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJ2JvZHkgJyArIGV4cGVjdC5zZWxlY3Rvcikub24oZXhwZWN0LmV2ZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleHBlY3RzWzBdICE9IGV4cGVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNEb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUoXCJFdmVudHMgZmlyaW5nIG91dCBvZiBvcmRlciwgZ290IFwiICsgZXhwZWN0LmV2ZW50ICsgXCIgb24gXCIgKyBleHBlY3Quc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0cy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBleHBlY3QgTk8gZWxlbWVudHMgdG8gaGF2ZSBhbnkgZXZlbnRzXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjdGVzdEFyZWEgKicpLm9uKCdjbGljayBtb3VzZWRvd24gbW91c2V1cCBtb3VzZW91dCBtb3VzZW92ZXIgbW91c2VlbnRlciBtb3VzZWxlYXZlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9uZShcIk5vIGV2ZW50cyBzaG91bGQgYmUgcnVuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB1dG1lLnJlZ2lzdGVyUmVwb3J0SGFuZGxlcih7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2c6IGZ1bmN0aW9uICh0eHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0eHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRG9uZSAmJiBleHBlY3RzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uICh0eHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0RvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUodHh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdXRtZS5yZWdpc3RlckxvYWRIYW5kbGVyKGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodGVzdC5zY2VuYXJpbyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xuXG4gICAgICAgICAgICAgICAgICAgIHV0bWUucnVuU2NlbmFyaW8oJ3doYXRldmVyJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSdW4gYWxsIG9mIHRoZSB0ZXN0IHNjZW5hcmlvc1xuICAgICAgICBmb3IgKHZhciBzY2VuYXJpb05hbWUgaW4gdGVzdFNjZW5hcmlvcykge1xuICAgICAgICAgICAgY3JlYXRlU2NlbmFyaW9UZXN0KHRlc3RTY2VuYXJpb3Nbc2NlbmFyaW9OYW1lXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpdCgnc2hvdWxkIG5vdCBmaXJlIGV2ZW50cyBvbiBlbGVtZW50cyB0aGF0IGhhdmUgbm8gaW1wb3J0YW50IGV2ZW50cywgaW5zaWRlIG9mIG9uZXMgdGhhdCBkbycsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSAkKFwiPGRpdj48c3Bhbj48c3Bhbj48L2Rpdj5cIik7XG4gICAgICAgICAgICBlbGVtZW50cy5hcHBlbmRUbyh0ZXN0RWxlKTtcblxuICAgICAgICAgICAgdmFyIGJhZENvdW50ID0gMDtcbiAgICAgICAgICAgIHZhciBnb29kQ291bnQgPSAwO1xuICAgICAgICAgICAgJCgnZGl2Jykub24oJ21vdXNlZW50ZXIgbW91c2VvdXQgbW91c2VvdmVyIG1vdXNlbGVhdmUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZ29vZENvdW50Kys7XG4gICAgICAgICAgICAgICAgaWYgKGdvb2RDb3VudCA9PT0gNCAmJiBiYWRDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICQoJ3NwYW4nKS5vbignbW91c2VlbnRlciBtb3VzZW91dCBtb3VzZW92ZXIgbW91c2VsZWF2ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBiYWRDb3VudCsrO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHV0bWUucmVnaXN0ZXJMb2FkSGFuZGxlcihmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgdGVzdCA9IHRlc3RTY2VuYXJpb3Mubm9uSW1wb3J0YW50RWxlbWVudEluc2lkZUltcG9ydGFudEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodGVzdC5zY2VuYXJpbyk7XG4gICAgICAgICAgICB9LCAwKTtcblxuICAgICAgICAgICAgdXRtZS5ydW5TY2VuYXJpbygnd2hhdGV2ZXInKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlRXZlbnRzVGVzdCh0ZXN0KSB7XG5cbiAgICAgICAgICAgIC8vIEl0IGlzbid0IGFuIGFjdHVhbCB0ZXN0XG4gICAgICAgICAgICBpZiAodGVzdC50ZXN0KSB7XG4gICAgICAgICAgICAgICAgaXQodGVzdC50ZXN0LCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXNEb25lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50cyA9ICQodGVzdC5odG1sKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMuYXBwZW5kVG8odGVzdEVsZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0b1J1bjtcblxuICAgICAgICAgICAgICAgICAgICB1dG1lLnJlZ2lzdGVyU2F2ZUhhbmRsZXIoZnVuY3Rpb24oc2NlbmFyaW8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvUnVuID0gc2NlbmFyaW87XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuYXJpby5zdGVwcy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHV0bWUuc3RhcnRSZWNvcmRpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBDb25zb2xpZGF0ZSB3aXRoIHNjZW5hcmlvXG4gICAgICAgICAgICAgICAgICAgIHZhciBleHBlY3RzID0gKHRlc3QuZXZlbnRzIHx8IFtdKS5zbGljZSgwKTtcblxuICAgICAgICAgICAgICAgICAgICBleHBlY3RzLmZvckVhY2goZnVuY3Rpb24gKGV4cGVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSAkKCdib2R5ICcgKyBleHBlY3Quc2VsZWN0b3IpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jaGVja2VkID0gZXhwZWN0LmNoZWNrZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dG1lLmV2ZW50TGlzdGVuZXJzW2V4cGVjdC5ldmVudF0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogZWxlbWVudHNbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2g6IDQ5MDgzXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdXRtZS5zdG9wUmVjb3JkaW5nKHsgbmFtZTogXCJXSEFURVZFUlwiIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGV4cGVjdCBhIHNldCBvZiBlbGVtZW50cyB0byBoYXZlIGV2ZW50cyBmaXJlZCB1cG9uIHRoZW1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4cGVjdHMgJiYgZXhwZWN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGFzdEV4cGVjdGVkUnVuSWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RzLmZvckVhY2goZnVuY3Rpb24gKGV4cGVjdCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJ2JvZHkgJyArIGV4cGVjdC5zZWxlY3Rvcikub24oZXhwZWN0LmV2ZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleHBlY3RzWzBdICE9IGV4cGVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNEb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUoXCJFdmVudHMgZmlyaW5nIG91dCBvZiBvcmRlciwgZ290IFwiICsgZXhwZWN0LmV2ZW50ICsgXCIgb24gXCIgKyBleHBlY3Quc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0cy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBleHBlY3QgTk8gZWxlbWVudHMgdG8gaGF2ZSBhbnkgZXZlbnRzXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjdGVzdEFyZWEgKicpLm9uKCdjbGljayBtb3VzZWRvd24gbW91c2V1cCBtb3VzZW91dCBtb3VzZW92ZXIgbW91c2VlbnRlciBtb3VzZWxlYXZlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9uZShcIk5vIGV2ZW50cyBzaG91bGQgYmUgcnVuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB1dG1lLnJlZ2lzdGVyUmVwb3J0SGFuZGxlcih7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2c6IGZ1bmN0aW9uICh0eHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0eHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRG9uZSAmJiBleHBlY3RzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uICh0eHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0RvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUodHh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdXRtZS5yZWdpc3RlckxvYWRIYW5kbGVyKGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodG9SdW4pO1xuICAgICAgICAgICAgICAgICAgICB9LCAwKTtcblxuICAgICAgICAgICAgICAgICAgICB1dG1lLnJ1blNjZW5hcmlvKCd3aGF0ZXZlcicpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUnVuIGFsbCBvZiB0aGUgdGVzdCBzY2VuYXJpb3NcbiAgICAgICAgZm9yICh2YXIgZXZlbnROYW1lIGluIGV2ZW50c1Rlc3RzKSB7XG4gICAgICAgICAgICBjcmVhdGVFdmVudHNUZXN0KGV2ZW50c1Rlc3RzW2V2ZW50TmFtZV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59KVxuIl19
