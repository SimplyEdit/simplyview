window.simply = (function(simply) {

    var listeners = {};

    simply.activate = {
        addListener: function(name, callback) {
            if (!listeners[name]) {
                listeners[name] = [];
            }
            listeners[name].push(callback);
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

    var callListener = function(node) {
        if (node && node.dataset.simplyActivate 
            && listeners[node.dataset.simplyActivate]
        ) {
            listeners[node.dataset.simplyActivate].call(node);
        }
    };

    var handleChanges = function(changes) {
        var activateNodes = [];
        for (var change of changes) {
            if (change.type=='childList') {
                [].forEach.call(change.addedNodes, function(node) {
                    node.querySelectorAll && [].slice.call(node.querySelectorAll('[data-simply-activate]')).concat(activateNodes);
                });
            }
        }
        if (activateNodes.length) {
            activateNodes.forEach(function(node) {
                callListener(node);
            });
        }
    };

    var observer = new MutationObserver(handleChanges);
    observer.observe(document, {
        subtree: true,
        childList: true
    });

    return simply;
})(window.simply || {});
