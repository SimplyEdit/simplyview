this.simply = (function(simply, global) {
    simply.app = function(options) {
        if (!options) {
            options = {};
        }
        if (!options.container) {
            console.warn('No simply.app application container element specified, using document.body.');
        }
        
        function simplyApp(options) {
            if (!options) {
                options = {};
            }
            if ( options.routes ) {
                simply.route.load(options.routes);
                global.setTimeout(function() {
                    simply.route.match(global.location.pathname);
                });
            }
            this.container = options.container  || document.body;
            this.actions   = simply.action ? simply.action(this, options.actions) : false;
            this.commands  = simply.command ? simply.command(this, options.commands) : false;
			this.resize    = simply.resize ? simply.resize(this, options.resize) : false;
            this.view      = simply.view ? simply.view(this, options.view) : false;
            if (!(global.editor && global.editor.field) && simply.bind) {
				// skip simplyview databinding if SimplyEdit is loaded
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

        return app;
    };

    return simply;
})(this.simply || {}, this);
