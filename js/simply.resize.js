(function(global) {
    'use strict';

    var resize = function(app, config) {
        if (!config) {
            config = {};
        }
        if (!config.sizes) {
            config.sizes     = {
                'simply-tiny'   : 0,
                'simply-xsmall' : 480,
                'simply-small'  : 768,
                'simply-medium' : 992,
                'simply-large'  : 1200
            };
        }

        var lastSize = 0;
        function resizeSniffer() {
            var size = app.container.getBoundingClientRect().width;
            if ( lastSize==size ) {
                return;
            }
            lastSize  = size;
            var sizes = Object.keys(config.sizes);
            var match = sizes.pop();
            while (match) {
                if ( size<config.sizes[match] ) {
                    if ( app.container.classList.contains(match)) {
                        app.container.classList.remove(match);
                    }
                } else {
                    if ( !app.container.classList.contains(match) ) {
                        app.container.classList.add(match);
                        match = sizes.pop(); // skip to next match to remove these
                    }
                    break;
                }
                match = sizes.pop();
            }
            while (match) {
                if ( app.container.classList.contains(match)) {
                    app.container.classList.remove(match);
                }
                match = sizes.pop();
            }
            var toolbars = app.container.querySelectorAll('.simply-toolbar');
            [].forEach.call(toolbars, function(toolbar) {
                toolbar.style.transform = '';
            });
        }

        if ( global.attachEvent ) {
            app.container.attachEvent('onresize', resizeSniffer);
        } else {
            global.setInterval(resizeSniffer, 200);
        }

        if ( simply.toolbar ) {
            var toolbars = app.container.querySelectorAll('.simply-toolbar');
            [].forEach.call(toolbars, function(toolbar) {
                simply.toolbar.init(toolbar);
                if (simply.toolbar.scroll) {
                    simply.toolbar.scroll(toolbar);
                }
            });
        }

        return resizeSniffer;
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = resize;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.resize = resize;
    }
})(this);