(function(global) {
    'use strict';

    var knownCollections = {};
    
    var collect = {
        addListener: function(name, callback) {
            if (!knownCollections[name]) {
                knownCollections[name] = [];
            }
            if (knownCollections[name].indexOf(callback) == -1) {
                knownCollections[name].push(callback);
            }
        },
        removeListener: function(name, callback) {
            if (knownCollections[name]) {
                var index = knownCollections[name].indexOf(callback);
                if (index>=0) {
                    knownCollections[name].splice(index, 1);
                }
            }
        },
        update: function(element, value) {
            element.value = value;
            element.dispatchEvent(new Event('change', {
                bubbles: true,
                cancelable: true
            }));
        }
    };

    function findCollection(el) {
        while (el && !el.dataset.simplyCollection) {
            el = el.parentElement;
        }
        return el;
    }
    
    global.addEventListener('change', function(evt) {
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

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = collect;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.collect = collect;
    }

})(this);
