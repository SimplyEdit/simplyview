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
            if (e.isComposing || e.keyCode === 229) { /* 229 = compose key */
                return;
            }
            if (e.defaultPrevented) {
                return;
            }
            if (!e.target) {
                return;
            }

            let eventName = [];
            if (e.altKey && e.keyCode!=18) { /* 18 = alt key */
                eventName.push("Alt");
            }
            if (e.ctrlKey && e.keyCode!=17) { /* 17 = ctrl key */
                eventName.push("Control");
            }
            if (e.metaKey && e.keyCode!=224) { /* 224 = meta key */
                eventName.push("Meta");
            }
            if (e.shiftKey && e.keyCode!=16) { /* 16 = shift key */
                eventName.push("Shift");
            }
            eventName.push(e.key.toLowerCase());

            let keyboards = [];
            let keyboardElement = event.target.closest("[data-simply-keyboard]");
            while (keyboardElement) {
              keyboards.push(keyboardElement.getAttribute("data-simply-keyboard"));
              keyboardElement = keyboardElement.parentNode.closest("[data-simply-keyboard]");
            }
            keyboards.push("");

            let keyboard;
            let subkeyboard;
            let separators = ["+", "-"];
            let key;

            for (var i=0; i<keyboards.length; i++) {
                keyboard = keyboards[i];

                if (keyboard === "") {
                    subkeyboard = "default";
                } else {
                    subkeyboard = keyboard;
                    keyboard = keyboard + ".";
                }
                for (var j=0; j<separators.length; j++) {
                    key = eventName.join(separators[j]);

                    if (keys[subkeyboard] && (typeof keys[subkeyboard][key] === "function")) {
                        keys[subkeyboard][key].call(keys[subkeyboard], e);
                        event.preventDefault();
                        return;
                    }

                    if (typeof keys[keyboard + key] === "function") {
                        keys[keyboard + key].call(keys[keyboard], e);
                        event.preventDefault();
                        return;
                    }

                    let selector = "[data-simply-accesskey='" + keyboard + key + "']";
                    let targets = document.querySelectorAll("[data-simply-accesskey='" + keyboard + key + "']");
                    if (targets.length) {
                        targets.forEach(function(target) {
                            target.click();
                        });
                        event.preventDefault();
                        return;
                    }
                }
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
