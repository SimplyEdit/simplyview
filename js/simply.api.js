(function(global) {
    'use strict';

    var api = {
		/**
         * Returns a Proxy object that translates property access to a URL in the api
         * and method calls to a fetch on that URL.
         * @param options: a list of options for fetch(), 
		 * see the 'init' parameter at https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters 
         * additionally:
         * - baseURL: (required) the endpoint of the API
         * - path: the current path in the API, is appended to the baseURL
         * - verbs: list of http verbs to allow as methods, default ['get','post']
         * - handlers.fetch: alternative fetch method
         * - handlers.result: alternative getResult method
         * - handlers.error: alternative error method
         * - user (and password): if set, a basic authentication header will be added
         * - paramsFormat: either 'formData', 'json' or 'search'. Default is search.
         * - responseFormat: test, formData, blob, json, arrayBuffer or unbuffered. Default is json.
         * @return Proxy
         */
        proxy: function(options) {
            var cache = () => {};
            cache.$options = Object.assign({}, options);
            return new Proxy( cache, getApiHandler(cache.$options) );
        },

        /**
         * Fetches the options.baseURL using the fetch api and returns a promise
         * Extra options in addition to those of global.fetch():
         * - user (and password): if set, a basic authentication header will be added
         * - paramsFormat: either 'formData', 'json' or 'search'
         * By default params, if set, will be added to the baseURL as searchParams
         * @param method one of the http verbs, e.g. get, post, etc.
         * @param options the options for fetch(), with some additions
         * @param params the parameters to send with the request, as javascript/json data
         * @return Promise
         */
        fetch: function(method, params, options) {
            if (!options.url) {
                if (!options.baseURL) {
                    throw new Error('No url or baseURL in options object');
                }
                while (options.baseURL[options.baseURL.length-1]=='/') {
                    options.baseURL = options.baseURL.substr(0, options.baseURL.length-1);
                }
                var url = new URL(options.baseURL+options.path);
            } else {
                var url = options.url;
            }
            var fetchOptions = Object.assign({}, options);
            if (params && options.paramsFormat == 'formData') {
                var formData = new FormData();
                for (const name in params) {
                    formData.append(name, params[name]);
                }
            } else if (params && options.paramsFormat == 'json') {
                var formData = params;
            } else if (params && options.paramsFormat == 'search') {
                var searchParams = url.searchParams; //new URLSearchParams(url.search.slice(1));
                for (const name in params) {
                    searchParams.set(name, params[name]);
                }
                url.search = searchParams.toString();
            } else {
				throw Error('Unknown options.paramsFormat '+options.paramsFormat+'. Select one of formData, json or search.');
			}
            if (formData) {
                fetchOptions.body = formData
            }
            if (!options.headers) {
                fetchOptions.headers = {};
            }
            if (options.user) {
                fetchOptions.headers['Authorization'] = 'Basic '+btoa(options.user+':'+options.password);
            }
            fetchOptions.method = method.toUpperCase();
            var fetchURL = url.toString()
            return fetch(fetchURL, fetchOptions);
        },
        graphqlQuery: function(url, query, options) {
            return function(params) {
                return simply.api.fetch(
                    'POST', 
                    JSON.stringify({
                        query: query,
                        variables: params
                    }), 
                    Object.assign({ paramsFormat: 'json', url: url, responseFormat: 'json' }, options)
                ).then(function(response) {
                    return simply.api.getResult(response, options);
                });
            }  
        },
        /**
         * Handles the response and returns a Promise with the response data as specified
         * @param response Response
         * @param options
         * - responseFormat: one of 'text', 'formData', 'blob', 'arrayBuffer', 'unbuffered' or 'json'.
         * The default is json.
         */
		getResult: function(response, options) {
            if (response.ok) {
				switch(options.responseFormat) {
					case 'text':
						return response.text();
					break;
					case 'formData':
						return response.formData();
					break;
					case 'blob':
						return response.blob();
					break;
					case 'arrayBuffer':
						return response.arrayBuffer();
					break;
					case 'unbuffered':
						return response.body;
					break;
					case 'json':
					default:
		                return response.json();
					break;
				}
            } else {
                throw {
                    status: response.status,
                    message: response.statusText,
                    response: response
                }
            }
		},
		logError: function(error, options) {
            console.error(error.status, error.message);
		}
    }

    var defaultOptions = {
		path: '',
		responseFormat: 'json',
		paramsFormat: 'search',
		verbs: ['get','post'],
		handlers: {
			fetch:  api.fetch,
			result: api.getResult,
			error:  api.logError
		}
    };

    function cd(path, name) {
        name = name.replace(/\//g,'');
        if (!path.length || path[path.length-1]!=='/') {
            path+='/';
        }
        return path+encodeURIComponent(name);
    }

	function fetchChain(prop, params) {
		var options = this;
		return this.handlers.fetch
			.call(this, prop, params, options)
			.then(function(res) {
				return options.handlers.result.call(options, res, options);
			})
			.catch(function(error) {
				return options.handlers.error.call(options, error, options);
			});
	}

    function getApiHandler(options) {
		options.handlers = Object.assign({}, defaultOptions.handlers, options.handlers);
        options = Object.assign({}, defaultOptions, options);

        return {
            get: function(cache, prop) {
                if (cache[prop]) {
                    return cache[prop];
                } else if (options.verbs.indexOf(prop)!=-1) { 
                    // property matches one of the http verbs: get, post, etc.
                    cache[prop] = fetchChain.call(options, prop, params);
                    return cache[prop];
                } else {
                    cache[prop] = api.proxy(Object.assign({}, options, {
                        path: cd(options.path, prop)
                    }));
                    return cache[prop];
                }
            },
            apply: function(cache, thisArg, params) {
                return fetchChain.call(options, 'get', params)
            }
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
