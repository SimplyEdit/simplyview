window.simply = (function(simply) {
	
	var changeListeners = new WeakMap();
	var parentListeners = new WeakMap();
	var childListeners = new WeakMap();
	var changesSignalled = {};
	function signalChange(model, key, value, recursing) {
		if (!recursing) {
			changesSignalled = {};
		}
		if (changeListeners[model] && changeListeners[model][key]) {
			// changeListeners[model][key] contains callback methods
			changeListeners[model][key].forEach(function(callback) {
				changesSignalled[key] = true;
				callback(value);
			});

		} else if (!recursing && parentListeners[model] && parentListeners[model][key]) {
			// parentListeners[model][key] contains child paths to signal change on
			// if a parent object is changed, this signals the change to the child objects
			parentListeners[model][key].forEach(function(path) {
				if (!changesSignalled[path]) {
					var value = getByPath(model, path);
					if (value) {
						attach(model, path);
					}
					signalChange(model, path, value, true);
					changesSignalled[path] = true;
				}
			});
		}
		if (!recursing && childListeners[model] && childListeners[model][key]) {
			// childListeners[model][key] contains parent paths to signal change on
			// if a child object is changed, this signals the change to the parent objects
			childListeners[model][key].forEach(function(path) {
				if (!changesSignalled[path]) {
					var value = getByPath(model, path);
					signalChange(model, path, value, true);
					changesSignalled[path] = true;
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
			callback(parentOb, head, (parent ? parent + '.' + head : head));
			parentOb = parentOb[head];
			parent += head;
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

	function attach(model, path) {
		var addSetter = function(object, key, currPath) {
			if (Object.getOwnPropertyDescriptor(object, key).configurable) {
				// assume object keys are only unconfigurable if the
				// following code has already been run on this property
				var _value = object[key]
				Object.defineProperty(object, key, {
					set: function(value) {
						_value = value;
						signalChange(model, currPath, value);
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
		var attachArray = function(object, path) {
			var desc = Object.getOwnPropertyDescriptor(object, 'push');
			if (!desc || desc.configurable) {
				for (var f of ['push','pop','reverse','shift','sort','splice','unshift']) {
					(function(f) {
						//FIXME: change prototype? at least make sure that push/pop/etc
						//aren't listen in the console / debugger as properties
						Object.defineProperty(object, f, {
							value: function() {
								var result = Array.prototype[f].apply(this, arguments);
								signalChange(model, path, this);
								return result;
							},
							readable: false,
							enumerable: false
						});
					}(f));
				}
			}
		}

		onParents(model, path, addSetter);
		onChildren(model, path, addSetter);
	}

	simply.observe = function(model, path, callback) {
		attach(model, path);
		addChangeListener(model, path, callback);
		return function() {
			removeChangeListener(model, path, callback);
		};
	};

	return simply;
})(window.simply || {});