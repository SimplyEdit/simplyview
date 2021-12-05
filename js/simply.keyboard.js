(function(global) {
    'use strict';

    function keyboard(app, config) {
        var keys = config;

        if (!app) {
            app = {};
        }
        if (!app.container) {
            app.container = document.body;
        }
        app.container.addEventListener('keydown', (e) => {
            if (e.isComposing || e.keyCode === 229) {
                return;
            }
            if (e.defaultPrevented) {
                return;
            }
            if (!e.target) {
                return;
            }

            let selectedKeyboard = 'default';
            if (e.target.closest('[data-simply-keyboard]')) {
                selectedKeyboard = e.target.closest('[data-simply-keyboard]').dataset.simplyKeyboard;
            }
            if (keys[selectedKeyboard] && keys[selectedKeyboard][e.code]) {
                keys[selectedKeyboard][e.code].call(app,e);
            }
        });

        return keys;
    }


    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = keyboard;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.keyboard = keyboard;
    }
})(this);
