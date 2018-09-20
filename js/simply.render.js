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
