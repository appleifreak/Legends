/**
* promiscuous
* Copyright (c) 2013 Ruben Verborgh <https://github.com/RubenVerborgh/promiscuous> 
* MIT License
* Slightly modified for use in this library
*/

var Promise = (function (func, obj) {
	// Type checking utility function
	function is(type, item) { return (typeof item)[0] == type; }

	// Creates a promise, calling callback(resolve, reject), ignoring other parameters.
	function Promise(callback, handler) {
		// The `handler` variable points to the function that will
		// 1) handle a .then(resolved, rejected) call
		// 2) handle a resolve or reject call (if the first argument === `is`)
		// Before 2), `handler` holds a queue of callbacks.
		// After 2), `handler` is a finalized .then handler.
		handler = function pendingHandler(resolved, rejected, value, queue, then) {
			queue = pendingHandler.q;

			// Case 1) handle a .then(resolved, rejected) call
			if (resolved != is) {
				return Promise(function (resolve, reject) {
					queue.push({ p: this, r: resolve, j: reject, 1: resolved, 0: rejected });
				});
			}

			// Case 2) handle a resolve or reject call
			// (`resolved` === `is` acts as a sentinel)
			// The actual function signature is
			// .re[ject|solve](<is>, success, value)

			// Check if the value is a promise and try to obtain its `then` method
			if (value && (is(func, value) | is(obj, value))) {
				try { then = value.then; }
				catch (reason) { rejected = 0; value = reason; }
			}
			// If the value is a promise, take over its state
			if (is(func, then)) {
				function valueHandler(resolved) {
					return function (value) { then && (then = 0, pendingHandler(is, resolved, value)); };
				}
				try { then.call(value, valueHandler(1), rejected = valueHandler(0)); }
				catch (reason) { rejected(reason); }
			}
			// The value is not a promise; handle resolve/reject
			else {
				// Replace this handler with a finalized resolved/rejected handler
				handler = createFinalizedThen(callback, value, rejected);
				// Resolve/reject pending callbacks
				callback = 0;
				while (callback < queue.length) {
					then = queue[callback++];
					// If no callback, just resolve/reject the promise
					if (!is(func, resolved = then[rejected]))
						(rejected ? then.r : then.j)(value);
					// Otherwise, resolve/reject the promise with the result of the callback
					else
						finalize(then.p, then.r, then.j, value, resolved);
				}
			}
		};
		// The queue of pending callbacks; garbage-collected when handler is resolved/rejected
		handler.q = [];

		// Create and return the promise (reusing the callback variable)
		callback.call(callback = { then: function (resolved, rejected) { return handler(resolved, rejected); } },
									function (value)  { handler(is, 1,  value); },
									function (reason) { handler(is, 0, reason); });
		return callback;
	}

	// Creates a resolved or rejected .then function
	function createFinalizedThen(promise, value, success) {
		return function (resolved, rejected) {
			// If the resolved or rejected parameter is not a function, return the original promise
			if (!is(func, (resolved = success ? resolved : rejected)))
				return promise;
			// Otherwise, return a finalized promise, transforming the value with the function
			return Promise(function (resolve, reject) { finalize(this, resolve, reject, value, resolved); });
		};
	}

	// Finalizes the promise by resolving/rejecting it with the transformed value
	function finalize(promise, resolve, reject, value, transform) {
		setTimeout(function () {
			try {
				// Transform the value through and check whether it's a promise
				value = transform(value);
				transform = value && (is(obj, value) | is(func, value)) && value.then;
				// Return the result if it's not a promise
				if (!is(func, transform))
					resolve(value);
				// If it's a promise, make sure it's not circular
				else if (value == promise)
					reject(new TypeError());
				// Take over the promise's state
				else
					transform.call(value, resolve, reject);
			}
			catch (error) { reject(error); }
		}, 0);
	}

	Promise.resolve = function (value, promise) {
		return (promise = {}).then = createFinalizedThen(promise, value,  1), promise;
	};
	Promise.reject = function (reason, promise) {
		return (promise = {}).then = createFinalizedThen(promise, reason, 0), promise;
	};

	Promise.lift = function(val) {
		return new Promise(function(resolve, reject) {
			if (typeof val === "object" && typeof val.then === "function") {
				val.then(resolve, reject);
			} else if (val instanceof Error) {
				reject(val);
			} else {
				resolve(val);
			}
		});
	};

	return Promise;
})('f', 'o');