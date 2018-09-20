window.simply = (function(simply) {
    simply.app = function(options) {
        if (!options) {
            options = {};
        }
        if (!options.container) {
            console.log('No simply.app application container element specified, using document.body.');
        }
        
        function simplyApp(options) {
            if (!options) {
                options = {};
            }
            this.container = options.container  || document.body;
            this.actions   = simply.actions ? simply.actions(this, options.actions) : false;
            this.commands  = simply.commands ? simply.commands(this, options.commands) : false;
            this.sizes     = {
                'simply-tiny'   : 0,
                'simply-xsmall' : 480,
                'simply-small'  : 768,
                'simply-medium' : 992,
                'simply-large'  : 1200
            }
            this.view      = simply.view ? simply.view(this, options.view) : false;
            if (simply.bind) {
                options.bind = simply.render(options.bind || {});
                options.bind.model = this.view;
                options.bind.container = this.container;
                this.bind = options.bindings = simply.bind(options.bind);
            }
        }

        simplyApp.prototype.get = function(id) {
            return this.container.querySelector('[data-simply-id='+id+']') || document.getElementById(id);
        }

        var app = new simplyApp(options);

        if ( simply.toolbar ) {
            var toolbars = app.container.querySelectorAll('.simply-toolbar');
            for ( var i=0,l=toolbars.length; i<l; i++) {
                simply.toolbar.init(toolbars[i]);
            }
            if (simply.toolbar.scroll) {
                for ( var i=0,l=toolbars.length; i<l; i++) {
                    simply.toolbar.scroll(toolbars[i]);
                }
            }
        }

        var lastSize = 0;
        function resizeSniffer() {
            var size = app.container.getBoundingClientRect().width;
            if ( lastSize==size ) {
                return;
            }
            lastSize  = size;
            var sizes = Object.keys(app.sizes);
            var match = null;
            while (match=sizes.pop()) {
                if ( size<app.sizes[match] ) {
                    if ( app.container.classList.contains(match)) {
                        app.container.classList.remove(match);
                    }
                } else {
                    if ( !app.container.classList.contains(match) ) {
                        app.container.classList.add(match);
                    }
                    break;
                }
            }
            while (match=sizes.pop()) {
                if ( app.container.classList.contains(match)) {
                    app.container.classList.remove(match);
                }
            }
            var toolbars = app.container.querySelectorAll('.simply-toolbar');
            for (var i=toolbars.length-1; i>=0; i--) {
                toolbars[i].style.transform = '';
            }
        }

        if ( window.attachEvent ) {
            app.container.attachEvent('onresize', resizeSniffer);
        } else {
            window.setInterval(resizeSniffer, 200);
        }
        
        return app;
    };


    return simply;
})(window.simply || {});
window.simply = (function(simply) {

	/*** utility functions ****/	
	function throttle( callbackFunction, intervalTime ) {
		var eventId = 0;
		return function() {
			var myArguments = arguments;
			var me = this;
			if ( eventId ) {
				return;
			} else {
				eventId = window.setTimeout( function() {
					callbackFunction.apply(me, myArguments);
					eventId = 0;
				}, intervalTime );
			}
		}
	}

	function getElement(node) {
		if (node.nodeType != Node.ELEMENT_NODE) {
			return node.parentElement;
		}
		return node;
	}


	function getFieldType(fieldTypes, el) {
		var setters = Object.keys(fieldTypes);
		for(var i=setters.length-1;i>=0;i--) {
			if (el.matches(setters[i])) {
				return fieldTypes[setters[i]];
			}
		}
		return null;
	}

	function setValue(el, value, binding) {
		if (el!=focusedElement) {
			var fieldType = getFieldType(binding.fieldTypes, el);
			if (fieldType) {
				fieldType.set.call(el, (typeof value != 'undefined' ? value : ''), binding);
				el.dispatchEvent(new Event('simply.bind.resolved', {
					bubbles: true,
					cancelable: false
				}));
			}
		}
	}

	function getValue(el, binding) {
		var setters = Object.keys(binding.fieldTypes);
		for(var i=setters.length-1;i>=0;i--) {
			if (el.matches(setters[i])) {
				return binding.fieldTypes[setters[i]].get.call(el);
			}
		}
	}

	/** FIXME: getPath should be configurable **/
	function getPath(el, attribute) {
		var attributes = attribute.split(',');
		for (var attr of attributes) {
			if (el.hasAttribute(attr)) {
				return el.getAttribute(attr);
			}
		}
		return null;
	}

	/*** shadow values ***/
	var shadows = new WeakMap();
	var focusedElement = null;
	var initialized = new WeakMap();

	/**
	 * Returns an object ment to keep the original value of model[jsonPath]
	 */
	function getShadow(model, jsonPath) {
		if (!shadows.has(model)) {
			shadows.set(model, {});
		}
		var root = shadows.get(model);
		if (typeof root[jsonPath] == 'undefined') {
			root[jsonPath] = {
				value: null,
				elements: [],
				children: {},
				listeners: []
			};
		}
		return root[jsonPath];
	}

	function triggerChildListeners(path, model) {
		var shadow = getShadow(model, path);
		for (var childPath of Object.keys(shadow.children)) {
			var childShadow = getShadow(model, childPath);
			childShadow.listeners.forEach(function(callback) {
				callback.call(null, childShadow.value);
			});
			triggerChildListeners(childPath, model);
		}
	}

	function triggerListeners(path, model) {
		var shadow = getShadow(model, path);
		shadow.listeners.forEach(function(callback) {
			callback.call(null, shadow.value);
		});
		var parent = simply.path.parent(path);
		if (parent) {
			triggerListeners(parent, model);
		}
	}

	/**
	 * Returns true if a shadow for this path and rootModel exist
	 * This means that there is already a setter/getter pair for it.
	 **/
	function hasShadow(model, jsonPath) {
		if (!shadows.has(model)) {
			shadows.set(model, {});
		}
		var root = shadows.get(model);
		return typeof root[jsonPath] != 'undefined';
	}

	function Binding(config) {
		this.config = config;
		if (!this.config) {
			this.config = {};
		}
		if (!this.config.model) {
			this.config.model = {};
		}
		if (!this.config.attribute) {
			this.config.attribute = 'data-bind';
		}
		if (!this.config.selector) {
			this.config.selector = '[data-bind]';
		}
		if (!this.config.container) {
			this.config.container = document;
		}
		this.fieldTypes = {
			'*': {
				set: function(value) {
					this.innerHTML = value;
				},
				get: function() {
					return this.innerHTML;
				}
			}
		};
		if (this.config.fieldTypes) {
			Object.assign(this.fieldTypes, this.config.fieldTypes);
		}
		this.attach(this.config.container.querySelectorAll(this.config.selector), this.config.container);
	};

	Binding.prototype.attach = function(elements, root) {
		var self = this;


		/**
		 * returns a selector matching any element bound to the given path
		 * using any of the possible attributes
		 **/
		var getSelector = function(attribute, path) {
			var attributes = attribute.split(',');
			var selector = [];
			for (var attr of attributes) {
				selector.push('['+attr+'="'+path+'"]');
			}
			return selector.join(',');
		};

		/**
		 * Attaches a binding to a specific html element.
		 **/
		var attachElement = function(jsonPath, el) {
			if (!root.contains(el)) {
				// element is no longer part of the document
				// so don't bother changing the model or updating the element for it
				return;
			}

			var nested = el.parentElement.closest(getSelector(self.config.attribute, getPath(el, self.config.attribute)));
			if (nested && !fieldAllowsNesting(nested)) {
				console.log('Error: illegal nested data-binding found for '+el.dataset.bind);
				console.log(el);
				return;
			}
			var keys       = jsonPath.split('.'),
			    parentPath = '',
			    path       = '',
			    shadow,
			    model      = self.config.model;

			do {
				key    = keys.shift();
				path   = simply.path.push(path, key);
				shadow = getShadow(self.config.model, path);
				if (keys.length) {
					shadow.children[ simply.path.push(path,keys[0]) ] = true;
				}
				if (model && typeof model == 'object') {
					if (!Array.isArray(model)) {
						shadow.value = model[key];
						Object.defineProperty(model, key, {
							set: (function(shadow, path) {
								return function(value) {
									shadow.value = value;
									setHandlers(shadow, path)
								};
							})(shadow, path),
							get: (function(shadow) {
								return function() {
									return shadow.value;
								}
							})(shadow),
							configurable: true,
							enumerable: true
						});
					}
					model = model[key];
				}
				parentPath = path;
			} while(keys.length);
			if (shadow.elements.indexOf(el)==-1) {
				shadow.elements.push(el);
			}
			initElement(el);
			updateElements([el], model);
			if (Array.isArray(shadow.value)) {
				attachArray(shadow, path);
			}
			monitorProperties(model, path);
		};

		var fieldAllowsNesting = function(el) {
			var fieldType = getFieldType(self.fieldTypes, el);
			return fieldType && fieldType.allowNesting;
		};

		/**
		 * This will call updateElements on all parents of jsonPath that are
		 * bound to some elements.
		 **/
		var updateParents = function(jsonPath) {
			var parents = simply.path.parents(jsonPath);
			parents.pop();
			parents.reverse().forEach(function(parent) {
				shadow = getShadow(self.config.model, parent);
				if (shadow && shadow.elements.length) {
					updateElements(shadow.elements, shadow.value);
				}
			});
		};

		/**
		 * This defines setters/getters for properties that aren't bound
		 * to elements directly, but who have a parent object that is.
		 **/
		var monitorProperties = function(model, path) {
			if (!model || typeof model != 'object') {
				return;
			}

			var _shadow = {};
			Object.keys(model).forEach(function(property) {
				if (!hasShadow(self.config.model, simply.path.push(path,property))) {
					// If the property has a shadow, then it is already bound
					// and has a setter that will call updateParents
					_shadow[property] = model[property];
					Object.defineProperty(model, property, {
						set: function(value) {
							_shadow[property] = value;
							updateParents(path);
						},
						get: function() {
							return _shadow[property];
						},
						configurable: true,
						enumerable: true
					});
				}
				if (model[property] && typeof model[property] == 'object') {
					monitorProperties(model[property], simply.path.push(path,property));
				}
			});
		}
		
		/**
		 * Runs the init() method of the fieldType, if it is defined.
		 **/
		var initElement = function(el) {
			if (initialized.has(el)) {
				return;
			}
			initialized.set(el, true);
			var selectors = Object.keys(self.fieldTypes);
			for (var i=selectors.length-1; i>=0; i--) {
				if (self.fieldTypes[selectors[i]].init && el.matches(selectors[i])) {
					self.fieldTypes[selectors[i]].init.call(el, self);
					return;
				}
			}
		};

		/**
		 * Updates the given elements with the new value, if the element is still
		 * in the document.body. Otherwiste it will remove the element from the
		 * elements list. During the update the observer is paused.
		 **/
		var updateElements = function(elements, value) {
			var reconnectObserver;
			if (self.observing) {
				self.observer.disconnect();
				reconnectObserver = self.observing;
				self.observing = false;
			}
			elements.forEach(function(el, index) {
				if (root.contains(el)) {
					setValue(el, value, self);
					var children = el.querySelectorAll(self.config.selector);
					if (children.length) {
						self.attach(children);
					}
//				} else {
//					elements.splice(index,1);
				}
			});
			if (reconnectObserver) {
		        self.observing = reconnectObserver;
				self.observer.observe(reconnectObserver, {
		        	subtree: true,
		        	childList: true,
		        	characterData: true,
		        	attributes: true
		        });
		    }
		};

		var setHandlers = function(shadow, path) {
			updateElements(shadow.elements, shadow.value);
			if (Array.isArray(shadow.value)) {
				attachArray(shadow, path);
			} else {
				attachChildren(shadow);
				addSetTriggers(shadow);
				updateParents(path);
			}
			monitorProperties(shadow.value, path);
			triggerChildListeners(path, self.config.model);
			triggerListeners(path, self.config.model);
		}

		var attachArray = function(shadow, path) {
			var listPath = path;
			var desc = Object.getOwnPropertyDescriptor(shadow.value, 'push');
			if (!desc || desc.configurable) {
				for (var f of ['push','pop','reverse','shift','sort','splice','unshift']) {
					(function(f) {
						//FIXME: change prototype? at least make sure that push/pop/etc
						//aren't listen in the console / debugger as properties
						Object.defineProperty(shadow.value, f, {
							value: function() {
								var result = Array.prototype[f].apply(this, arguments);
								//FIXME: the shadows staan nog verkeerd
								//na een unshift() moeten de paden van alle shadows
								//opnieuw gezet worden
								//of eigenlijk moeten alle child shadows weggegooid
								//en opnieuw gezet
								shadow.elements.forEach(function(el, index) {
									setValue(el, shadow.value, self);
								});
								return result;
							},
							readable: false,
							enumerable: false
						});
					}(f));
				}
			}
		}

		/**
		 * Loops over registered children of the shadow, that means a sub property
		 * is bound to an element, and reattaches those to their elements with the
		 * new values.
		 **/
		var attachChildren = function( shadow) {
			Object.keys(shadow.children).forEach(function(child) {
				var value = simply.path.get(self.config.model, child);
				var childShadow = getShadow(self.config.model, child);
				childShadow.value = value;
				childShadow.elements.forEach(function(el) {
					attachElement(child, el);
				});
			});
		};

		/**
		 * Adds a setter for all bound child properties that restores the bindings
		 * when a new value is set for them. This is to restore bindings after a
		 * parent value is changed so the original property is no longer set.
		 * It is not enumerable, so it won't show up in Object.keys or JSON.stringify
		 **/
		var addSetTriggers = function(shadow){
			Object.keys(shadow.children).forEach(function(childPath) {
				var name = simply.path.pop(childPath);
				if (shadow.value && typeof shadow.value[name] == 'undefined') {
					Object.defineProperty(shadow.value, name, {
						set: function(value) {
							restoreBinding(childPath);
							shadow.value[name] = value;
						},
						configurable: true,
						enumerable: false
					});
				}
			});
		}

		/**
		 * Restores the binding for all registered bound elements.
		 * Run when the set trigger is called.
		 **/
		var restoreBinding = function(path) {
			var shadow = getShadow(self.config.model, path);
			[].forEach.call(shadow.elements, function(element) {
            	attachElement(path, element);
        	});
		}

		if (!root) {
			root = document.body;
		}
		if ( elements instanceof HTMLElement ) {
			elements = [ elements ];
		}
		[].forEach.call(elements, function(element) {
            var key = getPath(element, self.config.attribute);
            attachElement(key, element);
        });
        document.body.addEventListener('simply.bind.update', function(evt) {
			focusedElement = evt.target;
			simply.path.set(self.config.model, getPath(evt.target, self.config.attribute), getValue(evt.target, self));
			focusedElement = null;
        }, true);
	};

	var runWhenIdle = (function() {
		if (window.requestIdleCallback) {
			return function(callback) {
				window.requestIdleCallback(callback, {timeout: 500});
			};
		}
		return window.requestAnimationFrame;
	})();

	Binding.prototype.observe = function(root) {
		var changes = [];
		var self    = this;

		var handleChanges = throttle(function() {
			runWhenIdle(function() {
				changes = changes.concat(self.observer.takeRecords());
				self.stopObserver();
				var change,el,children;
				var handledKeys = {}; // list of keys already handled
				var handledElements = new WeakMap();
				for (var i=changes.length-1; i>=0; i--) {
					// handle last change first, so programmatic changes are predictable
					// last change overrides earlier changes
					change = changes[i];
					el = getElement(change.target);
					if (!el) {
						continue;
					}
					if (handledElements.has(el)) {
						continue;
					}
					handledElements.set(el, true);
					children = el.querySelectorAll(self.config.selector);
					if (children.length) {
						self.attach(children);
					}
					if (!el.matches(self.config.selector)) {
						el = el.closest(self.config.selector);
					}
					if (el) {
						var key = getPath(el, self.config.attribute);
						if (handledKeys[key]) {
							// we already handled this key, the model is uptodate
							continue;
						}
						handledKeys[key] = true;
						focusedElement = el;
						var newValue = getValue(el, self);
						var oldValue = simply.path.get(self.config.model, key);
						if (newValue!=oldValue) {
							simply.path.set(self.config.model, key, getValue(el, self));
						}
						focusedElement = null;
					}
				}
				changes = [];
				self.resumeObserver();
			});
		},100);
        this.observer = new MutationObserver(function(changeList) {
        	changes = changes.concat(changeList);
        	handleChanges();
        });
        this.wasObserving = root;
        this.resumeObserver();
        return this;
	};

	Binding.prototype.stopObserver = function() {
		this.observer.disconnect();
		this.wasObserving = this.observing;
		this.observing = false;
	};

	Binding.prototype.resumeObserver = function() {
		if (this.wasObserving) {
			this.observing = this.wasObserving;
			this.observer.observe(this.observing, {
				subtree: true,
				childList: true,
				characterData: true,
				attributes: true
			});
			this.wasObserving = false;
		}
	}

	Binding.prototype.addListener = function(jsonPath, callback) {
		var shadow = getShadow(this.config.model, jsonPath);
		shadow.listeners.push(callback);
	};

	Binding.prototype.removeListener = function(jsonPath, callback) {
		var shadow = getShadow(this.config.model, jsonPath);
		shadow.listeners = shadow.listeners.filter(function(listener) {
			if (listener==callback) {
				return false;
			}
			return true;
		});
	};

	simply.bind = function(config) {
		return new Binding(config);
	};

    return simply;
})(window.simply || {});
window.simply = (function(simply) {

    var templates = new WeakMap();

    simply.render = function(options) {
        if (!options) {
            options = {};
        }
        options = Object.assign({
            attribute: 'data-simply-field,data-simply-list',
            selector: '[data-simply-field],[data-simply-list]',
            observe: true,
            model: {}
        }, options);

        options.fieldTypes = Object.assign({
            '*': {
                set: function(value) {
                    this.innerHTML = value;
                },
                get: function() {
                    return this.innerHTML;
                }
            },
            'input,textarea,select': {
                init: function(binding) {
                    this.addEventListener('input', function(evt) {
                        if (binding.observing) {
                            this.dispatchEvent(new Event('simply.bind.update', {
                                bubbles: true,
                                cancelable: true
                            }));
                        }
                    });
                },
                set: function(value) {
                    this.value = value;
                },
                get: function() {
                    return this.value;
                }
            },
            'input[type=radio]': {
                init: function(binding) {
                    this.addEventListener('change', function(evt) {
                        if (binding.observing) {
                            this.dispatchEvent(new Event('simply.bind.update', {
                                bubbles: true,
                                cancelable: true
                            }));
                        }
                    });
                },
                set: function(value) {
                    this.checked = (value==this.value);
                },
                get: function() {
                    var checked;
                    if (this.form) {
                        return this.form[this.name].value;
                    } else if (checked=document.body.querySelector('input[name="'+this.name+'"][checked]')) { 
                        return checked.value;
                    } else {
                        return null;
                    }
                }
            },
            'input[type=checkbox]': {
                init: function(binding) {
                    this.addEventListener('change', function(evt) {
                        if (binding.observing) {
                            this.dispatchEvent(new Event('simply.bind.update', {
                                bubbles: true,
                                cancelable: true
                            }));
                        }
                    });
                },
                set: function(value) {
                    this.checked = (value.checked);
                    this.value = value.value;
                },
                get: function() {
                    return {
                        checked: this.checked,
                        value: this.value
                    };
                }
            },
            'select[multiple]': {
                init: function(binding) {
                    this.addEventListener('change', function(evt) {
                        if (binding.observing) {
                            this.dispatchEvent(new Event('simply.bind.update', {
                                bubbles: true,
                                cancelable: true
                            }));
                        }
                    });
                },
                set: function(value) {
                    for (i=0,l=this.options.length;i<l;i++) {
                        this.options[i].selected = (value.indexOf(this.options[i].value)>=0);
                    }
                },
                get: function() {
                    return this.value;
                }
            },
//            '[data-simply-content="template"]': {
//                 allowNesting: true
//            },
            '[data-simply-list]': {
                init: function(binding) {
                    // parse templates
//                    parseTemplates(this);
                    templates.set(this, this.querySelector('template'));
                },
                set: function(value, binding) {
                    // first version: rerender entire array using templates
                    var content = document.createDocumentFragment();
                    if (value && value.length) {
                        var template = templates.get(this);
                        var listPath = this.dataset.simplyList;
                        for (var i=0,l=value.length; i<l; i++) {
                            var instance = document.importNode(template.content, true);
                            instance.firstElementChild.dataset.simplyListItem = i;
                            //FIXME: voeg extra binding call toe voor elke template instantie
                            // dan hoef je de paden niet aan te passen, je past de root aan
                            simply.bind(Object.assign(binding.config, {
                                container: instance.firstElementChild,
                                model: value[i]
                            }));
                            content.appendChild(instance);
                        }
                        binding.attach(content.querySelectorAll('[data-simply-field]'), binding.config.model);
                    }
                    var self = this;
                    window.requestAnimationFrame(function() {
                        binding.pauseObservers();
                        self.innerHTML = '';
                        self.appendChild(content);
                        binding.resumeObservers();
                    });
                },
                get: function() {
                    var items = this.querySelectorAll('[data-simply-list-item]');
                    var result = [];
                    var self = this;
                    [].forEach.call(items, function(item) {
                        result.push(simply.path.get(options.model, self.dataset.simplyList+'.'+item.dataset.simplyListItem));
                    });
                    return result;
                },
                allowNesting: true
            }
        }, options.fieldTypes);

        return options;
    }

    return simply;
})(window.simply || {});
window.simply = (function(simply) {

	var routeInfo = [];

	function parseRoutes(routes) {
		var paths = Object.keys(routes);
		var matchParams = /\:(\w+)/;
		for (var i=0; i<paths.length; i++) {
			var path        = paths[i];
			var matches     = matchParams.exec(path);
			var params      = matches ? matches.slice(1) : [];
			routeInfo.push({
				match:  new RegExp(path.replace(/\:\w+/, '([^/]+)').replace(/\:\*/, '(.*)')),
				params: params,
				action: routes[path]
			});
		}
	}

	simply.route = {
		load: function(routes) {
			parseRoutes(routes);
		},
		match: function(path) {
			for ( var i=0; i<routeInfo.length; i++) {
				var matches = routeInfo[i].match.exec(path);
				if (matches && matches.length) {
					var params = {};
					routeInfo[i].params.forEach(function(key, i) {
						if (key=='*') {
							key = 'remainder';
						}
						params[key] = matches[i+1];
					});
					return routeInfo[i].action.call(simply.route, params);
				}
			}
		},
		goto: function(path) {
			history.pushState({},'',path);
			return simply.route.match(path);
		},
		has: function(path) {
			for ( var i=0; i<routeInfo.length; i++) {
				var matches = routeInfo[i].match.exec(path);
				if (matches && matches.length) {
					return true;
				}
			}
			return false;
		}
	};

	window.addEventListener('popstate', function() {
		simply.route.match(document.location.pathname);
	});

	var linkHandler = function(evt) {
		if (evt.ctrlKey) {
			return;
		}
		var link = evt.target;
		while (link && link.tagName!='A') {
			link = link.parentElement;
		}
		if (link 
			&& link.pathname 
			&& link.hostname==document.location.hostname 
			&& !link.link
			&& !link.dataset.simplyCommand
			&& simply.route.has(link.pathname)
		) {
			simply.route.goto(link.pathname);
			evt.preventDefault();
			return false;
		}
	};

	document.addEventListener('click', linkHandler);

	return simply;

})(window.simply || {});
window.simply = (function(simply) {

    var throttle = function( callbackFunction, intervalTime ) {
        var eventId = 0;
        return function() {
            var myArguments = arguments;
            var me = this;
            if ( eventId ) {
                return;
            } else {
                eventId = window.setTimeout( function() {
                    callbackFunction.apply(me, myArguments);
                    eventId = 0;
                }, intervalTime );
            }
        }
    };

    var runWhenIdle = (function() {
        if (window.requestIdleCallback) {
            return function(callback) {
                window.requestIdleCallback(callback, {timeout: 500});
            };
        }
        return window.requestAnimationFrame;
    })();

    var rebaseHref = function(relative, base) {
        if (/^[a-z-]*:?\//.test(relative)) {
            return relative; // absolute href, no need to rebase
        }

        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); // remove current file name (or empty string)
                     // (omit if "base" is the current folder without trailing slash)
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }

    var observer, loaded = {};
    var head = document.documentElement.querySelector('head')
	var currentScript = document.currentScript;

    var waitForPreviousScripts = function() {
        // because of the async=false attribute, this script will run after
        // the previous scripts have been loaded and run
        // simply.include.signal.js only fires the simply-next-script event
        // that triggers the Promise.resolve method
        return new Promise(function(resolve, reject) {
            var next = document.createElement('script');
			var cachebuster = Date.now();
            next.src = rebaseHref('simply.include.next.js?'+cachebuster, currentScript.src);
            next.setAttribute('async', false);
            document.addEventListener('simply-include-next', function() {
                head.removeChild(next);
                resolve();
            }, { once: true, passive: true});
            head.appendChild(next);
        });
    };

	var scriptLocations = [];

    simply.include = {
        scripts: function(scripts, base) {
            var arr = [];
            for(var i = scripts.length; i--; arr.unshift(scripts[i]));
            var importScript = function() {
                var script = arr.shift();
				if (!script) {
					return;
				}
                var attrs  = [].map.call(script.attributes, function(attr) {
					return attr.name;
				});
                var clone  = document.createElement('script');
                attrs.forEach(function(attr) {
                    clone.setAttribute(attr, script[attr]);
                });
				clone.removeAttribute('data-simply-location');
                if (!clone.src) {
                    // this is an inline script, so copy the content and wait for previous scripts to run
                    clone.innerHTML = script.innerHTML;
                    waitForPreviousScripts()
                    .then(function() {
						var node = scriptLocations[script.dataset.simplyLocation];
						node.parentNode.insertBefore(clone, node);
						node.parentNode.removeChild(node);
						window.setTimeout(importScript, 10);
					});
                } else {
                    clone.src = rebaseHref(clone.src, base);
                    // FIXME: remove loaded check? browser loads/runs same script multiple times...
                    // should we do that also?
                    if (!loaded[clone.src] || clone.dataset.simplyIncludeMultiple) {
                        if (!clone.hasAttribute('async') && !clone.hasAttribute('defer')) {
                            clone.setAttribute('async', false);
                        }
						var node = scriptLocations[script.dataset.simplyLocation];
						node.parentNode.insertBefore(clone, node);
						node.parentNode.removeChild(node);
                   	    loaded[clone.src]=true;
                    }
                    importScript();
                }
            }
			if (arr.length) {
				importScript();
			}
        },
        html: function(html, link) {
    		var fragment = document.createRange().createContextualFragment(html);
            var stylesheets = fragment.querySelectorAll('link[rel="stylesheet"],style');
            // add all stylesheets to head
            [].forEach.call(stylesheets, function(stylesheet) {
                if (stylesheet.href) {
                    stylesheet.href = rebaseHref(stylesheet.href, link.href);
                }
                head.appendChild(sylesheet);
            });
			// remove the scripts from the fragment, as they will not run in the
			// order in which they are defined
			var scriptsFragment = document.createDocumentFragment();
			// FIXME: this loses the original position of the script
			// should add a placeholder so we can reinsert the clone
			var scripts = fragment.querySelectorAll('script');
			[].forEach.call(scripts, function(script) {
				var placeholder = document.createComment(script.src || 'inline script');
				script.parentNode.insertBefore(placeholder, script);
				script.dataset.simplyLocation = scriptLocations.length;
				scriptLocations.push(placeholder);
				scriptsFragment.appendChild(script);
			});
            // add the remainder before the include link
            link.parentNode.insertBefore(fragment, link ? link : null);
			window.setTimeout(function() {
	            simply.include.scripts(scriptsFragment.childNodes, link ? link.href : window.location.href );
			}, 10);
        }
    }

    var includeLinks = function(links) {
        // mark them as in progress, so handleChanges doesn't find them again
        [].forEach.call(links, function(link) {
            link.rel = 'simply-include-loading';
        });
        [].forEach.call(links, function(link) {
            // fetch the html
            fetch(link.href)
            .then(function(response) {
                if (response.ok) {
                    console.log('simply-include: loaded '+link.href);
                    return response.text();
                } else {
                    console.log('simply-include: failed to load '+link.href);
                }
            })
            .then(function(html) {
                // if succesfull import the html
                simply.include.html(html, link);
                // remove the include link
                link.parentNode.removeChild(link);
            });
        });
    };

    var handleChanges = throttle(function() {
        runWhenIdle(function() {
            var links = document.querySelectorAll('link[rel="simply-include"]');
            if (links.length) {
                includeLinks(links);
            }
        });
    });

    var observe = function() {
        observer = new MutationObserver(handleChanges);
        observer.observe(document, {
            subtree: true,
            childList: true,
        });
    };

    observe();

    return simply;

})(window.simply || {});
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
})(window.simply || {});window.simply = (function(simply) {
    var defaultActions = {
        'simply-hide': function(el) {
            el.classList.remove('simply-visible');
            return Promise.resolve();
        },
        'simply-show': function(el) {
            el.classList.add('simply-visible');
            return Promise.resolve();
        },
        'simply-select': function(el,group,target,targetGroup) {
            if (group) {
                this.call('simply-deselect', this.app.container.querySelectorAll('[data-simply-group='+group+']'));
            }
            el.classList.add('simply-selected');
            if (target) {
                this.call('simply-select',target,targetGroup)
            }
            return Promise.resolve();
        },
        'simply-toggle-select': function(el,group,target,targetGroup) {
            if (!el.classList.contains('simply-selected')) {
                this.call('simply-select',el,group,target,targetGroup);
            } else {
                this.call('simply-deselect',el,target);
            }
            return Promise.resolve();
        },
        'simply-toggle-class': function(el,className,target) {
            if (!target) {
                target = el;
            }
            return Promise.resolve(target.classList.toggle(className));
        },
        'simply-deselect': function(el,target) {
            if ( typeof el.length=='number' && typeof el.item=='function') {
                el = Array.prototype.slice.call(el);
            }
            if ( Array.isArray(el) ) {
                for (var i=0,l=el.length; i<l; i++) {
                    this.call('simply-deselect',el[i],target);
                    target = null;
                }
            } else {
                el.classList.remove('simply-selected');
                if (target) {
                    this.call('simply-deselect',target);
                }
            }
            return Promise.resolve();
        },
        'simply-fullscreen': function(target) {
            var methods = {
                'requestFullscreen':{exit:'exitFullscreen',event:'fullscreenchange',el:'fullscreenElement'},
                'webkitRequestFullScreen':{exit:'webkitCancelFullScreen',event:'webkitfullscreenchange',el:'webkitFullscreenElement'},
                'msRequestFullscreen':{exit:'msExitFullscreen',event:'MSFullscreenChange',el:'msFullscreenElement'},
                'mozRequestFullScreen':{exit:'mozCancelFullScreen',event:'mozfullscreenchange',el:'mozFullScreenElement'}
            };
            for ( var i in methods ) {
                if ( typeof document.documentElement[i] != 'undefined' ) {
                    var requestMethod = i;
                    var cancelMethod = methods[i].exit;
                    var event = methods[i].event;
                    var element = methods[i].el;
                    break;
                }
            }
            if ( !requestMethod ) {
                return;
            }
            if (!target.classList.contains('simply-fullscreen')) {
                target.classList.add('simply-fullscreen');
                target[requestMethod]();
                var self = this;
                var exit = function() {
                    if ( !document[element] ) {
                        target.classList.remove('simply-fullscreen');
                        document.removeEventListener(event,exit);
                    }
                }
                document.addEventListener(event,exit);
            } else {
                target.classList.remove('simply-fullscreen');
                document[cancelMethod]();
            }
            return Promise.resolve();
        }
    };

    simply.actions = function(app, inActions) {
        actions = Object.create(defaultActions);
		for ( var i in inActions ) {
			actions[i] = inActions[i];
		}

        actions.app = app;
        actions.call = function(name) {
            var params = Array.prototype.slice.call(arguments);
            params.shift();
            return this[name].apply(this, params);
        }
        return actions;
    }

    return simply;
    
})(window.simply || {});
window.simply = (function(simply) {

    var knownCollections = {};
    
    simply.collections = {
        addListener: function(name, callback) {
            if (!knownCollections[name]) {
                knownCollections[name] = [];
            }
            if (knownCollections[name].indexOf(callback) == -1) {
                knownCollections[name].push(callback);
            }
        },
        removeListener: function(name, callback) {
            if (knowCollections[name]) {
                var index = knownCollections[name].indexOf(callback);
                if (index>=0) {
                    knownCollections[name].splice(index, 1);
                }
            }
        },
        update: function(element, value) {
            element.value = value;
            editor.fireEvent('change', element);
        }
    };

    function findCollection(el) {
        while (el && !el.dataset.simplyCollection) {
            el = el.parentElement;
        }
        return el;
    }
    
    document.addEventListener('change', function(evt) {
        var root = null;
        var name = '';
        if (evt.target.dataset.simplyElement) {
            root = findCollection(evt.target);
            if (root && root.dataset) {
                name = root.dataset.simplyCollection;
            }
        }
        if (name && knownCollections[name]) {
            var inputs = root.querySelectorAll('[data-simply-element]');
            var elements = [].reduce.call(inputs, function(elements, input) {
                elements[input.dataset.simplyElement] = input;
                return elements;
            }, {});
            for (var i=knownCollections[name].length-1; i>=0; i--) {
                var result = knownCollections[name][i].call(evt.target.form, elements);
                if (result === false) {
                    break;
                }
            }
        }
    }, true);

    return simply;

})(window.simply || {});
var simply = (function(simply) {

	simply.path = {
		get: function(model, path) {
			if (!path) {
				return model;
			}
			return path.split('.').reduce(function(acc, name) {
				return (acc && acc[name] ? acc[name] : null);
			}, model);
		},
		set: function(model, path, value) {
			var lastName   = simply.path.pop(path);
			var parentPath = simply.path.parent(path);
			var parentOb   = simply.path.get(model, parentPath);
			parentOb[lastName] = value;
		},
		pop: function(path) {
			return path.split('.').pop();
		},
		push: function(path, name) {
			return (path ? path + '.' : '') + name;
		},
		parent: function(path) {
			var p = path.split('.');
			p.pop();
			return p.join('.');
		},
		parents: function(path) {
			var result = [];
			path.split('.').reduce(function(acc, name) {
				acc.push( (acc.length ? acc[acc.length-1] + '.' : '') + name );
				return acc;
			},result);
			return result;
		}
	};

	return simply;
})(window.simply || {});
window.simply = (function(simply) {

	simply.view = function(app, view) {

		app.view = view || {}

		var load = function() {
			var data = app.view;
			var path = editor.data.getDataPath(app.container);
			app.view = editor.currentData[path];
			Object.keys(data).forEach(function(key) {
				app.view[key] = data[key];
			});
		}

		if (window.editor && editor.currentData) {
			load();
		} else {
			document.addEventListener('simply-content-loaded', function() {
				load();
			});
		}
		
		return app.view;
	};

	return simply;
})(window.simply || {});
window.simply = (function(simply) {
	if (!simply.observe) {
		console.log('Error: simply.bind requires simply.observe');
		return simply;
	}

	function getByPath(model, path) {
		var parts = path.split('.');
		var curr = model;
		do {
			curr = curr[parts.shift()];
		} while (parts.length && curr);
		return curr;
	}

	function setByPath(model, path, value) {
		var parts = path.split('.');
		var curr = model;
		while (parts.length>1 && curr) {
			var key = parts.shift();
			if (typeof curr[key] == 'undefined' || curr[key]==null) {
				curr[key] = {};
			}
			curr = curr[key];
		}
		curr[parts.shift()] = value;
	}

	function setValue(el, value, binding) {
		if (el!=focusedElement) {
			var fieldType = getFieldType(binding.fieldTypes, el);
			if (fieldType) {
				fieldType.set.call(el, (typeof value != 'undefined' ? value : ''), binding);
				el.dispatchEvent(new Event('simply.bind.resolved', {
					bubbles: true,
					cancelable: false
				}));
			}
		}
	}

	function getValue(el, binding) {
		var setters = Object.keys(binding.fieldTypes);
		for(var i=setters.length-1;i>=0;i--) {
			if (el.matches(setters[i])) {
				return binding.fieldTypes[setters[i]].get.call(el);
			}
		}
	}

	function getFieldType(fieldTypes, el) {
		var setters = Object.keys(fieldTypes);
		for(var i=setters.length-1;i>=0;i--) {
			if (el.matches(setters[i])) {
				return fieldTypes[setters[i]];
			}
		}
		return null;
	}

	function getPath(el, attribute) {
		var attributes = attribute.split(',');
		for (var attr of attributes) {
			if (el.hasAttribute(attr)) {
				return el.getAttribute(attr);
			}
		}
		return null;
	}

	function throttle( callbackFunction, intervalTime ) {
		var eventId = 0;
		return function() {
			var myArguments = arguments;
			var me = this;
			if ( eventId ) {
				return;
			} else {
				eventId = window.setTimeout( function() {
					callbackFunction.apply(me, myArguments);
					eventId = 0;
				}, intervalTime );
			}
		}
	}

	var runWhenIdle = (function() {
		if (window.requestIdleCallback) {
			return function(callback) {
				window.requestIdleCallback(callback, {timeout: 500});
			};
		}
		return window.requestAnimationFrame;
	})();

	function Binding(config) {
		this.config = config;
		if (!this.config) {
			this.config = {};
		}
		if (!this.config.model) {
			this.config.model = {};
		}
		if (!this.config.attribute) {
			this.config.attribute = 'data-simply-bind';
		}
		if (!this.config.selector) {
			this.config.selector = '[data-simply-bind]';
		}
		if (!this.config.container) {
			this.config.container = document;
		}
		if (typeof this.config.twoway == 'undefined') {
			this.config.twoway = true;
		}
		this.fieldTypes = {
			'*': {
				set: function(value) {
					this.innerHTML = value;
				},
				get: function() {
					return this.innerHTML;
				}
			}
		};
		if (this.config.fieldTypes) {
			Object.assign(this.fieldTypes, this.config.fieldTypes);
		}
		this.attach(this.config.container.querySelectorAll(this.config.selector), this.config.model);
		if (this.config.twoway) {
			var self = this;
			var observer = new MutationObserver(throttle, function() {
				runWhenIdle(function() {
					self.attach(self.config.container.querySelectorAll(self.config.selector), self.config.model);
				});
			});
			observer.observe(this.config.container, {
				subtree: true,
				childList: true
			});
		}
	}

	var focusedElement = null;
	var initialized = new WeakMap();
	var observers = new WeakMap();
	var observersPaused = 0;

	Binding.prototype.attach = function(el, model) {
		var attachElement = function(jsonPath) {
			if (el.dataset.simplyBound) {
				return;
			}
			el.dataset.simplyBound = true;
			initElement(el);
			setValue(el, getByPath(model, jsonPath), self);
			simply.observe(model, jsonPath, function(value) {
				if (el != focusedElement) {
					setValue(el, value, self);
				}
			});
		}

		var addMutationObserver = function(jsonPath) {
			var observer = new MutationObserver(function() {
				if (observersPaused) {
					return;
				}
				throttle(function() {
					runWhenIdle(function() {
		            	var v = getValue(el, self);
		            	var s = getByPath(model, jsonPath);
		            	if (v != s) {
		            		focusedElement = el;
		            		setByPath(model, jsonPath, v);
		            		focusedElement = null;
		            	}
					});
				}, 250);
			});
			observer.observe(el, {
				characterData: true,
				subtree: true,
				childList: true,
				attributes: true
			});
			if (!observers[el]) {
				observers[el] = [];
			}
			observers[el].push(observer);
			return observer;
		}

		/**
		 * Runs the init() method of the fieldType, if it is defined.
		 **/
		var initElement = function(el) {
			if (initialized.has(el)) {
				return;
			}
			initialized.set(el, true);
			var selectors = Object.keys(self.fieldTypes);
			for (var i=selectors.length-1; i>=0; i--) {
				if (self.fieldTypes[selectors[i]].init && el.matches(selectors[i])) {
					self.fieldTypes[selectors[i]].init.call(el, self);
					return;
				}
			}
		};

		var self = this;
		if (el instanceof HTMLElement) {
			var jsonPath = getPath(el, this.config.attribute);
			attachElement(jsonPath);
			if (this.config.twoway) {
				addMutationObserver(jsonPath);
			}
		} else {
			[].forEach.call(el, function(element) {
                self.attach(element, model);
            });
		}
	};

	Binding.prototype.pauseObservers = function() {
		observersPaused++;
	}

	Binding.prototype.resumeObservers = function() {
		observersPaused--;
	}

	simply.bind = function(config) {
		return new Binding(config);
	};

	return simply;
})(window.simply || {});window.simply = (function(simply) {

    var defaultCommands = {
        'simply-hide': function(el, value) {
            var target = this.app.get(value);
            if (target) {
                this.action('simply-hide',target);
            }
        },
        'simply-show': function(el, value) {
            var target = this.app.get(value);
            if (target) {
                this.action('simply-show',target);
            }
        },
        'simply-select': function(value,el) {
            var group = el.dataset.simplyGroup;
            var target = this.app.get(value);
            var targetGroup = (target ? target.dataset.simplyGroup : null);
            this.action('simply-select', el, group, target, targetGroup);
        },
        'simply-toggle-select': function(el, value) {
            var group = el.dataset.simplyGroup;
            var target = this.app.get(value);
            var targetGroup = (target ? target.dataset.simplyTarget : null);
            this.action('simply-toggle-select',el,group,target,targetGroup);
        },
        'simply-toggle-class': function(el, value) {
            var target = this.app.get(el.dataset.simplyTarget);
            this.action('simply-toggle-class',el,value,target);
        },
        'simply-deselect': function(el, value) {
            var target = this.app.get(value);
            this.action('simply-deselect',el,target);
        },
        'simply-fullscreen': function(el, value) {
            var target = this.app.get(value);
            this.action('simply-fullscreen',target);
        }
    };


    var handlers = [
        {
            match: 'input,select,textarea',
            get: function(el) {
                return el.dataset.simplyValue || el.value;
            },
            check: function(el, evt) {
                return evt.type=='change' || (el.dataset.simplyImmediate && evt.type=='input');
            }
        },
        {
            match: 'a,button',
            get: function(el) {
                return el.dataset.simplyValue || el.href || el.value;
            },
            check: function(el,evt) {
                return evt.type=='click' && evt.ctrlKey==false && evt.button==0;
            }
        },
        {
            match: 'form',
            get: function(el) {
				var data = {};
				[].forEach.call(el.elements, function(el) {
					data[el.name] = el.value;
				});
                return data;//new FormData(el);
            },
            check: function(el,evt) {
                return evt.type=='submit';
            }
        }
    ];

    function getCommand(evt) {
        var el = evt.target;
        while ( el && !el.dataset.simplyCommand ) {
            el = el.parentElement;
        }
        if (el) {
            for (var i=handlers.length-1; i>=0; i--) {
                if (el.matches(handlers[i].match) && handlers[i].check(el, evt)) {
                    return {
                        name:   el.dataset.simplyCommand,
                        source: el,
                        value:  handlers[i].get(el)
                    };
                }
            }
        }
        return null;
    }

    simply.commands = function(app, inCommands) {

        var commands = Object.create(defaultCommands);
        for (var i in inCommands) {
            commands[i] = inCommands[i];
        }

        commands.app = app;

        commands.action = function(name) {
            var params = Array.prototype.slice.call(arguments);
            params.shift();
            return app.actions[name].apply(app.actions,params);
        }

        commands.call = function(name) {
            var params = Array.prototype.slice.call(arguments);
            params.shift();
            return this[name].apply(this,params);            
        }

        commands.addHandler = function(handler) {
            handlers.push(handler);
        }

        var commandHandler = function(evt) {
            var command = getCommand(evt);
            if ( command ) {
                commands.call(command.name, command.source, command.value);
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            }
        };

        app.container.addEventListener('click', commandHandler);
        app.container.addEventListener('submit', commandHandler);
        app.container.addEventListener('change', commandHandler);
        app.container.addEventListener('input', commandHandler);

        return commands;
    };

    return simply;
    
})(window.simply || {});
