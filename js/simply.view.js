(function(global) {
    'use strict';
    var view = function(app, view) {

        app.view = view || {};

        var load = function() {
            var data = app.view;
            var path = global.editor.data.getDataPath(app.container);
            app.view = global.editor.currentData[path];
            Object.keys(data).forEach(function(key) {
                app.view[key] = data[key];
            });
        };

        if (global.editor && global.editor.currentData) {
            load();
        } else {
            global.document.addEventListener('simply-content-loaded', function() {
                load();
            });
        }
        
        return app.view;
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = view;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.view = view;
    }
})(this);
