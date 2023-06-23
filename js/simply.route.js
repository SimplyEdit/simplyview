(function(global) {
    'use strict';

    var routeInfo = [];
    var listeners = {
        goto: {},
        match: {},
        call: {},
        finish: {}
    };

    function getRegexpFromRoute(route) {
        return new RegExp('^'+route.replace(/:\w+/g, '([^/]+)').replace(/:\*/, '(.*)'));
    }

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
                match:  getRegexpFromRoute(path),
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
            && link.hostname==global.location.hostname 
            && !link.link
            && !link.dataset.simplyCommand
        ) {
            let path = getPath(link.pathname+link.hash);
            if ( !route.has(path) ) {
                path = getPath(link.pathname);
            }
            if ( route.has(path) ) {
                let params = runListeners('goto', { path: path});
                if (params.path) {
                    route.goto(params.path);
                }
                evt.preventDefault();
                return false;
            }
        }
    };

    var options = {
        root: '/'
    };

    var getPath = function(path) {
        if (path.substring(0,options.root.length)==options.root
            ||
            ( options.root[options.root.length-1]=='/' 
                && path.length==(options.root.length-1)
                && path == options.root.substring(0,path.length)
            )
        ) {
            path = path.substring(options.root.length);
        }
        if (path[0]!='/' && path[0]!='#') {
            path = '/'+path;
        }
        return path;
    };

    var getUrl = function(path) {
        path = getPath(path);
        if (options.root[options.root.length-1]==='/' && path[0]==='/') {
            path = path.substring(1);
        }
        return options.root + path;
    };

    function runListeners(action, params) {
        if (!Object.keys(listeners[action])) {
            return;
        }
        Object.keys(listeners[action]).forEach(function(route) {
            var routeRe = getRegexpFromRoute(route);
            if (routeRe.exec(params.path)) {
                var result;
                listeners[action][route].forEach(function(callback) {
                    result = callback.call(global, params);
                    if (result) {
                        params = result;
                    }
                });
            }
        });
        return params;
    }

    var route = {
        handleEvents: function() {
            global.addEventListener('popstate', function() {
                if (route.match(getPath(document.location.pathname + document.location.hash)) === false) {
					route.match(getPath(document.location.pathname));
				}
            });
            global.document.addEventListener('click', linkHandler);
        },
        load: function(routes) {
            parseRoutes(routes);
        },
        clear: function() {
            routeInfo = [];
            listeners = {
                match: {},
                call: {},
                finish: {}
            };
        },
        match: function(path, options) {
            var args = {
                path: path,
                options: options
            };
            args = runListeners('match',args);
            path = args.path ? args.path : path;

            var matches;
            if (!path) {
                if (route.match(document.location.pathname+document.location.hash)) {
                    return true;
                } else {
                    return route.match(document.location.pathname);
                }
            }
            path = getPath(path);
            for ( var i=0; i<routeInfo.length; i++) {
                matches = routeInfo[i].match.exec(path);
                if (!matches || !matches.length) {
                    if (path && path[path.length-1]!='/') {
                        matches = routeInfo[i].match.exec(path+'/');
                        if (matches) {
                            path+='/';
                            history.replaceState({}, '', getUrl(path));
                        }
                    }
                }
                if (matches && matches.length) {
                    var params = {};
                    routeInfo[i].params.forEach(function(key, i) {
                        if (key=='*') {
                            key = 'remainder';
                        }
                        params[key] = matches[i+1];
                    });
                    Object.assign(params, options);
                    args.route = route;
                    args.params = params;
                    args = runListeners('call', args);
                    params = args.params ? args.params : params;
                    args.result = routeInfo[i].action.call(route, params);
                    runListeners('finish', args);
                    return args.result;
                }
            }
			return false;
        },
        goto: function(path) {
            history.pushState({},'',getUrl(path));
            return route.match(path);
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
        addListener: function(action, route, callback) {
            if (['goto','match','call','finish'].indexOf(action)==-1) {
                throw new Error('Unknown action '+action);
            }
            if (!listeners[action][route]) {
                listeners[action][route] = [];
            }
            listeners[action][route].push(callback);
        },
        removeListener: function(action, route, callback) {
            if (['match','call','finish'].indexOf(action)==-1) {
                throw new Error('Unknown action '+action);
            }
            if (!listeners[action][route]) {
                return;
            }
            listeners[action][route] = listeners[action][route].filter(function(listener) {
                return listener != callback;
            });
		},
        init: function(params) {
            if (params.root) {
                options.root = params.root;
            }
        }
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = route;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.route = route;
    }
})(this);
