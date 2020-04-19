(function(global) {
    'use strict';

    var routeInfo = [];
    var listeners = {
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
            && route.has(link.pathname+link.hash)
        ) {
            route.goto(link.pathname+link.hash);
            evt.preventDefault();
            return false;
        }
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
                route.match(global.location.pathname+global.location.hash);
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
            for ( var i=0; i<routeInfo.length; i++) {
                if (path[path.length-1]!='/') {
                    matches = routeInfo[i].match.exec(path+'/');
                    if (matches) {
                        path+='/';
                        history.replaceState({}, '', path);
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
                    args.route = route;
                    args.params = params;
                    args = runListeners('call', args);
                    params = args.params ? args.params : params;
                    args.result = routeInfo[i].action.call(route, params);
                    runListeners('finish', args);
                    return args.result;
                }
            }
        },
        goto: function(path) {
            history.pushState({},'',path);
            return route.match(path);
        },
        has: function(path) {
            for ( var i=0; i<routeInfo.length; i++) {
                var matches = routeInfo[i].match.exec(path);
                if (matches && matches.length) {
                    return true;
                }
            }
            return false;
        },
        addListener: function(action, route, callback) {
            if (['match','call','finish'].indexOf(action)==-1) {
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
