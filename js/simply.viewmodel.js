(function(global) {
    'use strict';

    function etag() {
        let d = '';
        while (d.length < 32) d += Math.random().toString(16).substr(2);
        const vr = ((parseInt(d.substr(16, 1), 16) & 0x3) | 0x8).toString(16);
        return `${d.substr(0, 8)}-${d.substr(8, 4)}-4${d.substr(13, 3)}-${vr}${d.substr(17, 3)}-${d.substr(20, 12)}`;
    }
    
    function ViewModel(name, data, options) {
        this.name = name;
        this.data = data || [];
        this.data.etag = etag();
        this.view = {
            options: {},
            data: [] //Array.from(this.data).slice()
        };
        this.options = options || {};
        this.plugins = {
            start: [],
            select: [],
            order: [],
            render: [],
            finish: []
        };
    }

    ViewModel.prototype.update = function(params) {
        if (!params) {
            params = {};
        }
        if (params.data) {
            // this.data is a reference to the data passed, so that any changes in it will get applied
            // to the original
            this.data = params.data;
            this.data.etag = etag()
        }
        // the view is a shallow copy of the array, so that changes in sort order and filtering
        // won't get applied to the original, but databindings on its children will still work
        this.view.data = Array.from(this.data).slice();
        this.view.data.etag = this.data.etag;
        let data = this.view.data;
        let plugins = this.plugins.start.concat(this.plugins.select, this.plugins.order, this.plugins.render, this.plugins.finish);
        plugins.forEach(plugin => {
            data = plugin.call(this, params, data);
            if (!data) {
                data = this.view.data;
            }
            this.view.data = data
        });

        if (global.editor) {
            global.editor.addDataSource(this.name,{
                load: function(el, callback) {
                    callback(self.view.data);
                }
            });
            updateDataSource(this.name);
        }
    };

    ViewModel.prototype.addPlugin = function(pipe, plugin) {
        if (typeof this.plugins[pipe] == 'undefined') {
            throw new Error('Unknown pipeline '+pipe);
        }
        this.plugins[pipe].push(plugin);
    };

    ViewModel.prototype.removePlugin = function(pipe, plugin) {
        if (typeof this.plugins[pipe] == 'undefined') {
            throw new Error('Unknown pipeline '+pipe);
        }
        this.plugins[pipe] = this.plugins[pipe].filter(function(p) {
            return p != plugin;
        });
    };

    var updateDataSource = function(name) {
        global.document.querySelectorAll('[data-simply-data="'+name+'"]').forEach(function(list) {
            global.editor.list.applyDataSource(list, name);
        });
    };

    var createSort = function(options) {
        var defaultOptions = {
            name: 'sort',
            getSort: function(params) {
                return Array.prototype.sort;
            }
        };
        options = Object.assign(defaultOptions, options || {});

        return function(params) {
            this.options[options.name] = options;
            if (params[options.name]) {
                options = Object.assign(options, params[options.name]);
            }
            this.view.data.sort(options.getSort.call(this, options));
        };
    };

    var createPaging = function(options) {
        var defaultOptions = {
            name: 'paging',
            page: 1,
            pageSize: 100,
            max: 1,
            prev: 0,
            next: 0
        };
        options = Object.assign(defaultOptions, options || {});

        return function(params) {
            this.options[options.name] = options;
            if (this.view.data) {
                options.max = Math.max(1, Math.ceil(Array.from(this.view.data).length / options.pageSize));
            } else {
                options.max = 1;
            }
            if (this.view.changed) {
                options.page = 1; // reset to page 1 when something in the view data has changed
            }
            if (params[options.name]) {
                options = Object.assign(options, params[options.name]);
            }
            options.page = Math.max(1, Math.min(options.max, options.page)); // clamp page nr
            options.prev = options.page - 1; // calculate previous page, 0 is allowed
            if (options.page<options.max) {
                options.next = options.page + 1;
            } else {
                options.next = 0; // no next page
            }

            var start = (options.page - 1) * options.pageSize;
            var end   = start + options.pageSize;

            this.view.data = this.view.data.slice(start, end);
        };
    };

    var createFilter = function(options) {
        var defaultOptions = {
            name: 'filter',
            label: 'A filter',
            getMatch: function(entry) {
                return false;
            }
        };
        options = Object.assign(defaultOptions, options || {});
        if (options.init) {
            options.init.call(this, options);
        }
        return function(params) {
            this.options[options.name] = options;
            if (params[options.name]) {
                options = Object.assign(options, params[options.name]);
            }
            var match = options.getMatch.call(this, options);
            if (match) {
                options.enabled = true;
                this.view.data = this.view.data.filter(match);
            } else if (options.enabled) {
                options.enabled = false;
            }
        }
    }

    var viewmodel = {
        create: function(name, data, options) {
            return new ViewModel(name, data, options);
        },
        createFilter: createFilter,
        createSort: createSort,
        createPaging: createPaging,
        updateDataSource: updateDataSource,
        etag
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = viewmodel;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.viewmodel = viewmodel;
    }

})(this);