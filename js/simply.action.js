(function(global) {
	'use strict';

     var action = function(app, inActions) {
        var actions = Object.create();
        for ( var i in inActions ) {
            actions[i] = inActions[i];
        }

        actions.app = app;
        actions.call = function(name) {
            var params = Array.prototype.slice.call(arguments);
            params.shift();
            return this[name].apply(this, params);
        };
        return actions;
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = action;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.action = action;
    }

})(this);
