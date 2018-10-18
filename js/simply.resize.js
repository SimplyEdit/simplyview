this.simply = (function(simply, global) {

	simply.resize = function(app, config) {
		if(!config.size) {
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
	};

	return simply;

})(this.simply || {}, this);