this.simply = (function(simply, global) {

    var routeInfo = [];

    function parseRoutes(routes) {
        var paths = Object.keys(routes);
        var matchParams = /:(\w+|\*)/g;
        var matches, params, path;
        for (var i=0; i<paths.length; i++) {
            path    = paths[i];
            matches = [];
            params  = [];
            do {
                matches = matchParams.exec(path);
                if (matches) {
                    params.push(matches[1]);
                }
            } while(matches);
            routeInfo.push({
                match:  new RegExp('^'+path.replace(/:\w+/g, '([^/]+)').replace(/:\*/, '(.*)')),
                params: params,
                action: routes[path]
            });
        }
    }

    var linkHandler = function(evt) {
        if (evt.ctrlKey) {
            return;
        }
        if (evt.which != 1) {
            return; // not a 'left' mouse click
        }
        var link = evt.target;
        while (link && link.tagName!='A') {
            link = link.parentElement;
        }
        if (link 
            && link.pathname 
            && link.hostname==document.location.hostname 
            && !link.link
            && !link.dataset.simplyCommand
        ) {
            if ( simply.route.has(link.pathname+link.hash) ) {
                simply.route.goto(link.pathname+link.hash);
                evt.preventDefault();
                return false;
            } else if (simply.route.has(link.pathname)) {
                simply.route.goto(link.pathname);
                evt.preventDefault();
                return false;
            }
        }
    };

    var options = {
        root: '/'
    };

    var getPath = function(path) {
        if (!path || path[0]!='/') {
            path = '/'+path;
        }
        if (path.substring(0,options.root.length)==options.root
            ||
            ( options.root[options.root.length-1]=='/' 
                && path.length==(options.root.length-1)
                && path == options.root.substring(0,path.length)
            )
        ) {
            path = path.substring(options.root.length-1);
        }
        if (path[0]!='/') {
            path = '/'+path;
        }
        return path;
    };

    var getUrl = function(path) {
        path = getPath(path);
        if (options.root[options.root.length-1]=='/') {
            path = path.substring(1);
        }
        return options.root + path;
    };

    simply.route = {
        handleEvents: function() {
            global.addEventListener('popstate', function() {
                if (!simply.route.match(getPath(document.location.pathname + document.location.hash))) {
					simply.route.match(getPath(document.location.pathname));
				}
            });
            document.addEventListener('click', linkHandler);
        },
        load: function(routes) {
            parseRoutes(routes);
        },
        match: function(path, options) {
            var matches;
            if (!path) {
				if (simply.route.match(document.location.pathname+document.location.hash)) {
					return true;
				} else {
					return simply.route.match(document.location.pathname);
				}
            }
            path = getPath(path);
            for ( var i=0; i<routeInfo.length; i++) {
                if (path[path.length-1]!='/') {
                    matches = routeInfo[i].match.exec(path+'/');
                    if (matches) {
                        path+='/';
                        history.replaceState({}, '', getUrl(path));
                    }
                }
                matches = routeInfo[i].match.exec(path);
                if (matches && matches.length) {
                    var params = {};
                    routeInfo[i].params.forEach(function(key, i) {
                        if (key=='*') {
                            key = 'remainder';
                        }
                        params[key] = matches[i+1];
                    });
                    Object.assign(params, options);
                    return routeInfo[i].action.call(simply.route, params);
                }
            }
			return false;
        },
        goto: function(path) {
            history.pushState({},'',getUrl(path));
            return simply.route.match(path);
        },
        has: function(path) {
            path = getPath(path);
            for ( var i=0; i<routeInfo.length; i++) {
                var matches = routeInfo[i].match.exec(path);
                if (matches && matches.length) {
                    return true;
                }
            }
            return false;
        },
        init: function(params) {
            if (params.root) {
                options.root = params.root;
            }
        }
    };

    return simply;

})(this.simply || {}, this);
