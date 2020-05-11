(function(global) {
    'use strict';


    var defaultOptions = {
		/**
         * called with the raw result of fetch. this is set to the options object.
         */
        resultHandler: function(result) {
            if (result.ok) {
                return result.json();
            } else {
                throw {
                    status: result.status,
                    message: result.statusText,
                    response: result
                }
            }
        },
        
        errorHandler: function(error) {
            console.error(error.status, error.message);
        },
        /**
         * called with the http verb to use. must return a function to fetch with that http verb
         * this should by default use the verb method in this.verbs
         * but may also do additional stuff, like refresh a token or login
         * if so, it should return a function that returns a promise that runs the verb method
         */
		callHandler: function(verb) {
			return this.verbs[verb];
		},
        verbs: {
            get: function(params) {
                return fetchApi('get', this, params);
            },
            post: function(params) {
                return fetchApi('post', this, params);
            }
        }
    };

    function cd(path, name) {
        name = name.replace(/\//g,'');
        if (!path[path.length-1]!='/') {
            path+='/';
        }
        return path+name;
    }

	/**
     * Fetches the options.baseURL using the fetch api and returns a promise
     * Extra options in addition to those of global.fetch():
     * - user (and password): if set, a basic authentication header will be added
     * - formData: if true, params are sent as formData in the body
     * - jsonData: if true, params are sent as json in the bodu
     * By default params, if set, will be added to the baseURL as searchParams
     * @param method one of the http verbs, e.g. get, post, etc.
     * @param options the options for fetch(), with some additions
     * @param params the parameters to send with the request, as javascript/json data
     * @return Promise
     */
    function fetchApi(method, options, params) {
        var url = new URL(options.baseURL);
		var fetchOptions = Object.assign({}, options);
        if (params && options.formData) {
            var formData = new FormData();
            for (const name in params) {
                formData.append(name, params[name]);
            }
        } else if (params && options.jsonData) {
            var formData = params;
        } else if (params) {
            var searchParams = url.searchParams; //new URLSearchParams(url.search.slice(1));
            for (const name in params) {
                searchParams.set(name, params[name]);
            }
            url.search = searchParams.toString();
        }
        if (formData) {
            fetchOptions.body = formData
        }
        if (!options.headers) {
            fetchOptions.headers = [];
        }
        if (options.user) {
            fetchOptions.headers.push('Authorization: Basic '+btoa(options.user+':'+options.password));
        }
		fetchOptions.method = method.toUpperCase();
        var fetchURL = url.toString()
        return fetch(fetchURL, fetchOptions);
    }

    function getApiHandler(options) {
        options = Object.assign(defaultOptions, options);
        return {
            get: function(cache, prop) {
				if (cache[prop]) {
					return cache[prop];
				} else if (Object.keys(options.verbs).indexOf(prop)!=-1) { 
					// property matches one of the http verbs: get, post, etc.
                    cache[prop] = function(params) {
                        return options.callHandler
							.call(cache.$options, prop)
                            .apply(cache.$options, params)
                            .then(function(res) {
								return options.resultHandler.call(cache.$options, res);
							})
                            .catch(function(err) {
								return options.errorHandler.call(cache.$options, err);
							});
                    }
					return cache[prop];
                } else {
                    cache[prop] = api.create(Object.assign(options, {
                        baseURL: cd(options.baseURL, prop)
                    }));
					return cache[prop];
                }
            },
            apply: function(cache, thisArg, params) {
                return options.callHandler
					.call(cache.$options, 'get')
                    .apply(cache.$options, params)
                    .then(function(res) {
						return options.resultHandler.call(cache.$options, res);
					})
                    .catch(function(err) {
						return options.errorHandler.call(cache.$options, err);
					});
            }
        }
    }

    var api = {
        create: function(options) {
            var cache = () => {};
            cache.$options = options;
            return new Proxy( cache, getApiHandler(options) );
        }
    }

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = api;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.api = api;
    }

})(this);