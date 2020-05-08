(function(global) {
    'use strict';


    var defaultOptions = {
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
        verbs: {
            get: function(params) {
                return fetchApi('get',this, params);
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

    function fetchApi(method, options, params) {
        var url = new URL(options.baseURL);
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
        var fetchOptions = {
            method: method.toUpperCase()
        };
        if (formData) {
            fetchOptions.body = formData
        }
        if (options.cors) {
            fetchOptions.mode = 'cors';
        }
        if (options.headers) {
            fetchOptions.headers = options.headers;
        } else {
            fetchOptions.headers = [];
        }
        if (options.user) {
            fetchOptions.headers.push('Authorization: Basic '+btoa(options.user+':'+options.password));
        }
        var fetchURL = url.toString()
        return fetch(fetchURL, fetchOptions);
    }

    function getApiHandler(options) {
        options = Object.assign(defaultOptions, options);
        return {
            get: function(cache, prop) {
                if (Object.keys(options.verbs).indexOf(prop)!=-1) {
                    return function(params) {
                        return options.verbs[prop]
                            .apply(options, params)
                            .then(options.resultHandler)
                            .catch(options.errorHandler);
                    }
                }
                return api.create(Object.assign(options, {
                    baseURL: cd(options.baseURL, prop)
                }));
            },
            set: function(cache, prop, value) {

            },
            apply: function(cache, thisArg, params) {
                return options.verbs.get
                    .apply(options, params)
                    .then(options.resultHandler)
                    .catch(options.errorHandler);
            }
        }
    }

    var api = {
        create: function(options) {
            var cache = () => {};
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