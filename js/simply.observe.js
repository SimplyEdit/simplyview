/**
 * simply.observe
 * This component lets you observe changes in a json compatible data structure
 * It doesn't support linking the same object multiple times
 * It doesn't register deletion of properties using the delete keyword, assign
 * null to the property instead.
 * It doesn't register addition of new properties.
 * It doesn't register directly assigning new entries in an array on a previously
 * non-existant index.
 * 
 * usage:
 *
 * (function) simply.observe( (object) model, (string) path, (function) callback) 
 *
 * var model = { foo: { bar: 'baz' } };
 * var removeObserver = simply.observe(model, 'foo.bar', function(value, sourcePath) {
 *   console.log(sourcePath+': '+value);
 * };
 *
 * The function returns a function that removes the observer when called.
 *
 * The component can observe in place changes in arrays, either by changing
 * an item in a specific index, by calling methods on the array that change
 * the array in place or by reassigning the array with a new value.
 *
 * The sourcePath contains the exact entry that was changed, the value is the
 * value for the path passed to simply.observe.
 * If an array method was called that changes the array in place, the sourcePath
 * also contains that method and its arguments JSON serialized.
 *
 * sourcePath parts are always seperated with '.', even for array indexes.
 * so if foo = [ 'bar' ], the path to 'bar' would be 'foo.0'
 */

window.simply = (function(simply) {
	
	var changeListeners = new WeakMap();
	var parentListeners = new WeakMap();
	var childListeners = new WeakMap();
	var changesSignalled = {};
	var observersPaused = 0;

	function signalChange(model, path, value, sourcePath) {
		if (observersPaused) {
			return;
		}

		sourcePath = sourcePath ? sourcePath : path;
		changesSignalled = {};

		var signalRecursion = function(model, path, value, sourcePath) {
			if (changeListeners[model] && changeListeners[model][path]) {
				// changeListeners[model][path] contains callback methods
				changeListeners[model][path].forEach(function(callback) {
					changesSignalled[path] = true;
					callback(value, sourcePath);
				});
				return true;
			}
			return false;
		}

		if (!signalRecursion(model, path, value, sourcePath)) {
			 if (parentListeners[model] && parentListeners[model][path]) {
				// parentListeners[model][path] contains child paths to signal change on
				// if a parent object is changed, this signals the change to the child objects
				parentListeners[model][path].forEach(function(childPath) {
					if (!changesSignalled[childPath]) {
						var value = getByPath(model, childPath);
						if (value) {
							attach(model, childPath);
						}
						signalRecursion(model, childPath, value, sourcePath);
						changesSignalled[childPath] = true;
					}
				});
			}
		}

		if (childListeners[model] && childListeners[model][path]) {
			// childListeners[model][path] contains parent paths to signal change on
			// if a child object is changed, this signals the change to the parent objects
			childListeners[model][path].forEach(function(parentPath) {
				if (!changesSignalled[parentPath]) {
					var value = getByPath(model, parentPath);
					signalRecursion(model, parentPath, value, sourcePath);
					changesSignalled[parentPath] = true;
				}
			});
		}

	}

	function getByPath(model, path) {
		var parts = path.split('.');
		var curr = model;
		do {
			curr = curr[parts.shift()];
		} while (parts.length && curr);
		return curr;
	}

	function parent(path) {
		var parts = path.split('.');
		parts.pop();
		return parts.join('.');
	}
	
	function onParents(model, path, callback) {
		var tail = path;
		var parent = '';
		var parentOb = model;
		var parents = path.split('.');
		do {
			var head = parents.shift();
			if (parentOb && typeof parentOb[head] != 'undefined') {
				callback(parentOb, head, (parent ? parent + '.' + head : head));
				parentOb = parentOb[head];
			}
			parent = (parent ? parent + '.' + head : head );
		} while (parents.length);
	}

	function onChildren(model, path, callback) {
		var onChildObjects = function(object, path, callback) {
			if (typeof object != 'object' || object == null) {
				return;
			}
			Object.keys(object).forEach(function(key) {
				callback(object, key, path+'.'+key);
				onChildObjects(object[key], path+'.'+key, callback);
			});
		};
		var parent = getByPath(model, path);
		onChildObjects(parent, path, callback);
	}

	function addChangeListener(model, path, callback) {
		if (!changeListeners[model]) {
			changeListeners[model] = {};
		}
		if (!changeListeners[model][path]) {
			changeListeners[model][path] = [];
		}
		changeListeners[model][path].push(callback);

		if (!parentListeners[model]) {
			parentListeners[model] = {};
		}
		var parentPath = parent(path);
		onParents(model, parentPath, function(parentOb, key, currPath) {
			if (!parentListeners[model][currPath]) {
				parentListeners[model][currPath] = [];
			}
			parentListeners[model][currPath].push(path);
		});

		if (!childListeners[model]) {
			childListeners[model] = {};
		}
		onChildren(model, path, function(childOb, key, currPath) {
			if (!childListeners[model][currPath]) {
				childListeners[model][currPath] = [];
			}
			childListeners[model][currPath].push(path);
		});
	}

	function removeChangeListener(model, path, callback) {
		if (!changeListeners[model]) {
			return;
		}
		if (changeListeners[model][path]) {
			changeListeners[model][path] = changeListeners[model][path].filter(function(f) {
				return f != callback;
			});
		}
	}

	function pauseObservers() {
		observersPaused++;
	}

	function resumeObservers() {
		observersPaused--;
	}

	function attach(model, path) {

		var attachArray = function(object, path) {
			var desc = Object.getOwnPropertyDescriptor(object, 'push');
			if (!desc || desc.configurable) {
				for (var f of ['push','pop','reverse','shift','sort','splice','unshift','copyWithin']) {
					(function(f) {
						try {
							Object.defineProperty(object, f, {
								value: function() {
									pauseObservers();
									var result = Array.prototype[f].apply(this, arguments);
									attach(model, path);
									var args = [].slice.call(arguments).map(function(arg) {
										return JSON.stringify(arg);
									});
									resumeObservers();
									signalChange(model, path, this, path+'.'+f+'('+args.join(',')+')');
									return result;
								},
								readable: false,
								enumerable: false,
								configurable: false
							});
						} catch(e) {
							console.log('simply.observer: Error: Couldn\'t redefine array method '+f+' on '+path);
							console.log(e);
						}
					}(f));
				}
				for (var i=0, l=object.length; i<l; i++) {
					addSetter(object, i, path+'.'+i);
				}
			}
		};

		var addSetter = function(object, key, currPath) {
			if (Object.getOwnPropertyDescriptor(object, key).configurable) {
				// assume object keys are only unconfigurable if the
				// following code has already been run on this property
				var _value = object[key]
				Object.defineProperty(object, key, {
					set: function(value) {
						_value = value;
						signalChange(model, currPath, value);
						onChildren(model, currPath, addSetter);
					},
					get: function() {
						return _value;
					}
				});
				if (Array.isArray(object[key])) {
					attachArray(object[key], currPath);
				}
			}			
		};

		onParents(model, path, addSetter);
		onChildren(model, path, addSetter);
	}

	simply.observe = function(model, path, callback) {
		if (!path) {
			var keys = Object.keys(model);
			keys.forEach(function(key) {
				attach(model, key);
				addChangeListener(model, key, callback);
			});
			return function() {
				keys.forEach(function(key) {
					removeChangeListener(model, key, callback);
				});
			};
		} else {
			attach(model, path);
			addChangeListener(model, path, callback);
			return function() {
				removeChangeListener(model, path, callback);
			};
		}
	};

	return simply;
})(window.simply || {});