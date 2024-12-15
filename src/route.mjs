export function routes(options) {
	return new SimplyRoute(options)
}

class SimplyRoute {
	constructor(options={}) {
		this.root = options.root || '/'
        this.app = options.app
		this.clear()
		if (options.routes) {
			this.load(options.routes)
		}
	}

	load(routes) {
		parseRoutes(routes, this.routeInfo)
	}

	clear() {
		this.routeInfo = []
		this.listeners = {
			match: {},
			call: {},
			finish: {}
		}
	}

	match(path, options) {
		let args = {
            path,
            options
        }
        args = this.runListeners('match',args)
        path = args.path ? args.path : path;

        let matches;
        if (!path) {
            if (this.match(document.location.pathname+document.location.hash)) {
                return true;
            } else {
                return this.match(document.location.pathname);
            }
        }
        path = getPath(path);
        for ( let route of this.routeInfo) {
            matches = route.match.exec(path)
            if (matches && matches.length) {
                var params = {};
                route.params.forEach((key, i) => {
                    if (key=='*') {
                        key = 'remainder'
                    }
                    params[key] = matches[i+1]
                })
                Object.assign(params, options)
                args.route = route
                args.params = params
                args = this.runListeners('call', args)
                params = args.params ? args.params : params
                args.result = routeInfo[i].action.call(route, params)
                this.runListeners('finish', args)
                return args.result
            }
        }
        if (path && path[path.length-1]!='/') {
        	return this.match(path+'/', options)
        }
        return false
	}

	runListeners(action, params) {
        if (!Object.keys(this.listeners[action])) {
            return
        }
        Object.keys(this.listeners[action]).forEach((route) => {
            var routeRe = getRegexpFromRoute(route);
            if (routeRe.exec(params.path)) {
                var result;
                for (let callback of this.listeners[action][route]) {
                    result = callback.call(this.app, params)
                    if (result) {
                        params = result
                    }
                }
            }
        })
        return params
    }

    handleEvents() {
        global.addEventListener('popstate', () => {
            if (this.match(getPath(document.location.pathname + document.location.hash, this.root)) === false) {
                this.match(getPath(document.location.pathname, this.root))
            }
        })
        global.document.addEventListener('click', (evt) => {
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
	            let path = getPath(link.pathname+link.hash, this.root);
	            if ( !this.has(path) ) {
	                path = getPath(link.pathname, this.root);
	            }
	            if ( this.has(path) ) {
	                let params = this.runListeners('goto', { path: path});
	                if (params.path) {
	                    this.goto(params.path);
	                }
	                evt.preventDefault();
	                return false;
	            }
	        }
	    })
    }

    goto(path) {
        history.pushState({},'',getURL(path))
        return this.match(path)
    }

    has(path) {
    	path = getPath(path, this.root)
    	for (let route of this.routeInfo) {
            var matches = route.match.exec(path)
            if (matches && matches.length) {
                return true
            }
        }
        return false
    }

    addListener(action, route, callback) {
        if (['goto','match','call','finish'].indexOf(action)==-1) {
            throw new Error('Unknown action '+action)
        }
        if (!this.listeners[action][route]) {
            this.listeners[action][route] = []
        }
        this.listeners[action][route].push(callback)
    }

    removeListener(action, route, callback) {
        if (['match','call','finish'].indexOf(action)==-1) {
            throw new Error('Unknown action '+action)
        }
        if (!this.listeners[action][route]) {
            return
        }
        this.listeners[action][route] = this.listeners[action][route].filter((listener) => {
            return listener != callback
        })
    }

    init(options) {
    	if (options.root) {
    		this.root = options.root
    	}
    }
}

function getPath(path, root='/') {
    if (path.substring(0,root.length)==root
        ||
        ( root[root.length-1]=='/' 
            && path.length==(root.length-1)
            && path == root.substring(0,path.length)
        )
    ) {
        path = path.substring(root.length)
    }
    if (path[0]!='/' && path[0]!='#') {
        path = '/'+path
    }
    return path
}

function getURL(path, root) {
    path = getPath(path, root)
    if (root[root.length-1]==='/' && path[0]==='/') {
        path = path.substring(1)
    }
    return root + path;
}

function getRegexpFromRoute(route) {
    return new RegExp('^'+route.replace(/:\w+/g, '([^/]+)').replace(/:\*/, '(.*)'));
}

