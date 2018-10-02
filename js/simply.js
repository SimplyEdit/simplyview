window.simply = (function(simply) {
    simply.app = function(options) {
        if (!options) {
            options = {};
        }
        if (!options.container) {
            console.log('No simply.app application container element specified, using document.body.');
        }
        
        function simplyApp(options) {
            if (!options) {
                options = {};
            }
            this.container = options.container  || document.body;
            this.actions   = simply.actions ? simply.actions(this, options.actions) : false;
            this.commands  = simply.commands ? simply.commands(this, options.commands) : false;
            this.sizes     = {
                'simply-tiny'   : 0,
                'simply-xsmall' : 480,
                'simply-small'  : 768,
                'simply-medium' : 992,
                'simply-large'  : 1200
            };
            this.view      = simply.view ? simply.view(this, options.view) : false;
            if (simply.bind) {
                options.bind = simply.render(options.bind || {});
                options.bind.model = this.view;
                options.bind.container = this.container;
                this.bind = options.bindings = simply.bind(options.bind);
            }
        }

        simplyApp.prototype.get = function(id) {
            return this.container.querySelector('[data-simply-id='+id+']') || document.getElementById(id);
        };

        var app = new simplyApp(options);

        if ( simply.toolbar ) {
            var toolbars = app.container.querySelectorAll('.simply-toolbar');
            [].forEach.call(toolbars, function(toolbar) {
                simply.toolbar.init(toolbar);
                if (simply.toolbar.scroll) {
                    simply.toolbar.scroll(toolbar);
                }
            });
        }

        var lastSize = 0;
        function resizeSniffer() {
            var size = app.container.getBoundingClientRect().width;
            if ( lastSize==size ) {
                return;
            }
            lastSize  = size;
            var sizes = Object.keys(app.sizes);
            var match = sizes.pop();
            while (match) {
                if ( size<app.sizes[match] ) {
                    if ( app.container.classList.contains(match)) {
                        app.container.classList.remove(match);
                    }
                } else {
                    if ( !app.container.classList.contains(match) ) {
                        app.container.classList.add(match);
                    }
                    break;
                }
                match = sizes.pop();
            }
            while (match) {
                if ( app.container.classList.contains(match)) {
                    app.container.classList.remove(match);
                }
                match=sizes.pop();
            }
            var toolbars = app.container.querySelectorAll('.simply-toolbar');
            [].forEach.call(toolbars, function(toolbar) {
                toolbar.style.transform = '';
            });
        }

        if ( window.attachEvent ) {
            app.container.attachEvent('onresize', resizeSniffer);
        } else {
            window.setInterval(resizeSniffer, 200);
        }
        
        return app;
    };

    return simply;
})(window.simply || {});
