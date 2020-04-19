(function(global) {
    'use strict';

    var listeners = {};

     var activate = {
        addListener: function(name, callback) {
            if (!listeners[name]) {
                listeners[name] = [];
            }
            listeners[name].push(callback);
            initialCall(name);
        },
        removeListener: function(name, callback) {
            if (!listeners[name]) {
                return false;
            }
            listeners[name] = listeners[name].filter(function(listener) {
                return listener!=callback;
            });
        }
    };

    var initialCall = function(name) {
        var nodes = document.querySelectorAll('[data-simply-activate="'+name+'"]');
        if (nodes) {
            [].forEach.call(nodes, function(node) {
                callListeners(node);
            });
        }
    };

    var callListeners = function(node) {
        if (node && node.dataset.simplyActivate 
            && listeners[node.dataset.simplyActivate]
        ) {
            listeners[node.dataset.simplyActivate].forEach(function(callback) {
                callback.call(node);
            });
        }
    };

    var handleChanges = function(changes) {
        var activateNodes = [];
        for (var change of changes) {
            if (change.type=='childList') {
                [].forEach.call(change.addedNodes, function(node) {
                    if (node.querySelectorAll) {
                        var toActivate = [].slice.call(node.querySelectorAll('[data-simply-activate]'));
                        if (node.matches('[data-simply-activate]')) {
                            toActivate.push(node);
                        }
                        activateNodes = activateNodes.concat(toActivate);
                    }
                });
            }
        }
        if (activateNodes.length) {
            activateNodes.forEach(function(node) {
                callListeners(node);
            });
        }
    };

    var observer = new MutationObserver(handleChanges);
    observer.observe(document, {
        subtree: true,
        childList: true
    });

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = activate;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.activate = activate;
    }
})(this);
