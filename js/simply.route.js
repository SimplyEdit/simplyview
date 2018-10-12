window.simply = (function(simply) {

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
                match:  new RegExp(path.replace(/:\w+/, '([^/]+)').replace(/:\*/, '(.*)')),
                params: params,
                action: routes[path]
            });
        }
    }

    simply.route = {
        load: function(routes) {
            parseRoutes(routes);
        },
        match: function(path, options) {
            for ( var i=0; i<routeInfo.length; i++) {
                if (path[path.length-1]!='/') {
                    var matches = routeInfo[i].match.exec(path+'/');
                    if (matches) {
                        path+='/';
                        history.replaceState({}, '', path);
                    }
                }
                var matches = routeInfo[i].match.exec(path);
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
        },
        goto: function(path) {
            history.pushState({},'',path);
            return simply.route.match(path);
        },
        has: function(path) {
            for ( var i=0; i<routeInfo.length; i++) {
                var matches = routeInfo[i].match.exec(path);
                if (matches && matches.length) {
                    return true;
                }
            }
            return false;
        }
    };

    window.addEventListener('popstate', function() {
        simply.route.match(document.location.pathname);
    });

    var linkHandler = function(evt) {
        if (evt.ctrlKey) {
            return;
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
            && simply.route.has(link.pathname)
        ) {
            simply.route.goto(link.pathname);
            evt.preventDefault();
            return false;
        }
    };

    document.addEventListener('click', linkHandler);

    return simply;

})(window.simply || {});
