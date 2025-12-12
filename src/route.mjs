export function routes(options, optionsCompat)
{
    if (optionsCompat) {
        let app = options
        options = optionsCompat
        options.app = options
    }
    return new SimplyRoute(options)
}

class SimplyRoute
{
    constructor(options={})
    {
        this.baseURL = options.baseURL || '/'
        this.app = options.app || {}
        this.addMissingSlash = !!options.addMissingSlash
        this.matchExact = !!options.matchExact
        this.clear()
        if (options.routes) {
            this.load(options.routes)
        }
    }

    load(routes)
    {
        parseRoutes(routes, this.routeInfo, this.matchExact)
    }

    clear()
    {
        this.routeInfo = []
        this.listeners = {
            match: {},
            call: {},
            goto: {},
            finish: {}
        }
    }

    match(path, options)
    {
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
            if (this.addMissingSlash && !matches?.length) {
                if (path && path[path.length-1]!='/') {
                    matches = route.match.exec(path+'/')
                    if (matches) {
                        path+='/'
                        history.replaceState({}, '', getURL(path, this.baseURL))
                    }
                }
            }
            if (matches && matches.length) {
                let params = {};
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
                const searchParams = new URLSearchParams(document.location.search)
                args.result = route.action.call(this.app, params, searchParams)
                this.runListeners('finish', args)
                return args.result
            }
        }
        return false
    }

    runListeners(action, params)
    {
        if (!this.listeners[action] || !Object.keys(this.listeners[action])) {
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

    handleEvents()
    {
        globalThis.addEventListener('popstate', () => {
            if (this.match(getPath(document.location.pathname + document.location.hash, this.baseURL)) === false) {
                this.match(getPath(document.location.pathname, this.baseURL))
            }
        })
        this.app.container.addEventListener('click', (evt) => {
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
                && link.hostname==globalThis.location.hostname 
                && !link.link
                && !link.dataset.simplyCommand
            ) {
                let check = [link.hash, link.pathname+link.hash, link.pathname]
                let path
                do {
                    path = getPath(check.shift(), this.baseURL);
                } while(check.length && !this.has(path))
                if ( this.has(path) ) {
                    let params = this.runListeners('goto', { path: path});
                    if (params.path) {
                        if (this.goto(params.path)) {
                            // now cancel the browser navigation, since a route handler was found
                            evt.preventDefault();
                            return false;
                        }
                    }
                }
            }
        })
    }

    goto(path)
    {
        history.pushState({},'',getURL(path, this.baseURL))
        return this.match(path)
    }

    has(path)
    {
        path = getPath(path, this.baseURL)
        for (let route of this.routeInfo) {
            var matches = route.match.exec(path)
            if (matches && matches.length) {
                return true
            }
        }
        return false
    }

    addListener(action, route, callback)
    {
        if (['goto','match','call','finish'].indexOf(action)==-1) {
            throw new Error('Unknown action '+action)
        }
        if (!this.listeners[action][route]) {
            this.listeners[action][route] = []
        }
        this.listeners[action][route].push(callback)
    }

    removeListener(action, route, callback)
    {
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

    init(options)
    {
        if (options.baseURL) {
            this.baseURL = options.baseURL
        }
    }
}

function getPath(path, baseURL='/')
{
    if (path.substring(0,baseURL.length)==baseURL
        ||
        ( baseURL[baseURL.length-1]=='/' 
            && path.length==(baseURL.length-1)
            && path == baseURL.substring(0,path.length)
        )
    ) {
        path = path.substring(baseURL.length)
    }
    if (path[0]!='/' && path[0]!='#') {
        path = '/'+path
    }
    return path
}

function getURL(path, baseURL)
{
    path = getPath(path, baseURL)
    if (baseURL[baseURL.length-1]==='/' && path[0]==='/') {
        path = path.substring(1)
    }
    if (path[0]=='#') {
        return path
    }
    return baseURL + path
}

function getRegexpFromRoute(route, exact=false)
{
    if (exact) {
        return new RegExp('^'+route.replace(/:\w+/g, '([^/]+)').replace(/:\*/, '(.*)')+'(\\?|$)')
    }
    return new RegExp('^'+route.replace(/:\w+/g, '([^/]+)').replace(/:\*/, '(.*)'))
}

function parseRoutes(routes, routeInfo, exact=false)
{
    const paths = Object.keys(routes)
    const matchParams = /:(\w+|\*)/g
    for (let path of paths) {
        let matches = []
        let params  = []
        do {
            matches = matchParams.exec(path)
            if (matches) {
                params.push(matches[1])
            }
        } while(matches)
        routeInfo.push({
            match:  getRegexpFromRoute(path, exact),
            params: params,
            action: routes[path]
        })
    }
    return routeInfo
}