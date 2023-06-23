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
            let key = '';
            if (e.ctrlKey && e.keyCode!=17) {
                key+='Control+';
            }
            if (e.metaKey && e.keyCode!=224) {
                key+='Meta+';
            }
            if (e.altKey && e.keyCode!=18) {
                key+='Alt+';
            }
            if (e.shiftKey && e.keyCode!=16) {
                key+='Shift+';
            }
            key+=e.key;

            if (keys[selectedKeyboard] && keys[selectedKeyboard][key]) {
                let keyboard = keys[selectedKeyboard]
                keyboard.app = app;
                keyboard[key].call(keyboard,e);
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
