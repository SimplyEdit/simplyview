(function(global) {
    'use strict';

    var render = function(options) {
        if (!options) {
            options = {};
        }
        options = Object.assign({
            attribute: 'data-simply-field',
            selector: '[data-simply-field]',
            twoway: true,
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
                    this.addEventListener('input', function() {
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
                    this.addEventListener('change', function() {
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
                    this.addEventListener('change', function() {
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
                    this.addEventListener('change', function() {
                        if (binding.observing) {
                            this.dispatchEvent(new Event('simply.bind.update', {
                                bubbles: true,
                                cancelable: true
                            }));
                        }
                    });
                },
                set: function(value) {
                    for (var i=0,l=this.options.length;i<l;i++) {
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
        }, options.fieldTypes);

        return options;
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = render;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.render = render;
    }
})(this);
