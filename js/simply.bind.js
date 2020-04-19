(function(global) {
    'use strict';

    if (!simply.observe) {
        console.error('Error: simply.bind requires simply.observe');
        return;
    }
    if (global && global.editor && global.editor.version && global.editor.toolbars) {
        console.log('SimplyEdit databinding is available, so skipping simply.bind');
        return;
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
                eventId = global.setTimeout( function() {
                    callbackFunction.apply(me, myArguments);
                    eventId = 0;
                }, intervalTime );
            }
        };
    }

    var runWhenIdle = (function() {
        if (global.requestIdleCallback) {
            return function(callback) {
                global.requestIdleCallback(callback, {timeout: 500});
            };
        }
        return global.requestAnimationFrame;
    })();

    function Binding(config, force) {
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
        this.attach(this.config.container.querySelectorAll(this.config.selector), this.config.model, force);
        if (this.config.twoway) {
            var self = this;
            var observer = new MutationObserver(
                throttle(function() {
                    runWhenIdle(function() {
                        self.attach(self.config.container.querySelectorAll(self.config.selector), self.config.model);
                    });
                })
            );
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

    Binding.prototype.attach = function(el, model, force) {
        var illegalNesting = function() {
            return (!force && el.parentElement && el.parentElement.closest(self.config.selector));
        };

        var attachElement = function(jsonPath) {
            el.dataset.simplyBound = true;
            initElement(el);
            setValue(el, getByPath(model, jsonPath), self);
            simply.observe(model, jsonPath, function(value) {
                if (el != focusedElement) {
                    setValue(el, value, self);
                }
            });
        };

        var addMutationObserver = function(jsonPath) {
            if (el.dataset.simplyList) {
                return;
            }
            var update = throttle(function() {
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
            var observer = new MutationObserver(function() {
                if (observersPaused) {
                    return;
                }
                update();
            });
            observer.observe(el, {
                characterData: true,
                subtree: true,
                childList: true,
                attributes: true
            });
            if (!observers.has(el)) {
                observers.set(el, []);
            }
            observers.get(el).push(observer);
            return observer;
        };

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
            if (!force && el.dataset.simplyBound) {
                return;
            }
            var jsonPath = getPath(el, this.config.attribute);
            if (illegalNesting(el)) {
                el.dataset.simplyBound = 'Error: nested binding';
                console.error('Error: found nested data-binding element:',el);
                return;
            }
            attachElement(jsonPath);
            if (this.config.twoway) {
                addMutationObserver(jsonPath);
            }
        } else {
            [].forEach.call(el, function(element) {
                self.attach(element, model, force);
            });
        }
    };

    Binding.prototype.pauseObservers = function() {
        observersPaused++;
    };

    Binding.prototype.resumeObservers = function() {
        observersPaused--;
    };

    var bind = function(config, force) {
        return new Binding(config, force);
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = bind;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.bind = bind;
    }
})(this);