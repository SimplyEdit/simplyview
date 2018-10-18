this.simply = (function(simply, global) {

    var defaultCommands = {
        'simply-hide': function(el, value) {
            var target = this.app.get(value);
            if (target) {
                this.action('simply-hide',target);
            }
        },
        'simply-show': function(el, value) {
            var target = this.app.get(value);
            if (target) {
                this.action('simply-show',target);
            }
        },
        'simply-select': function(value,el) {
            var group = el.dataset.simplyGroup;
            var target = this.app.get(value);
            var targetGroup = (target ? target.dataset.simplyGroup : null);
            this.action('simply-select', el, group, target, targetGroup);
        },
        'simply-toggle-select': function(el, value) {
            var group = el.dataset.simplyGroup;
            var target = this.app.get(value);
            var targetGroup = (target ? target.dataset.simplyTarget : null);
            this.action('simply-toggle-select',el,group,target,targetGroup);
        },
        'simply-toggle-class': function(el, value) {
            var target = this.app.get(el.dataset.simplyTarget);
            this.action('simply-toggle-class',el,value,target);
        },
        'simply-deselect': function(el, value) {
            var target = this.app.get(value);
            this.action('simply-deselect',el,target);
        },
        'simply-fullscreen': function(el, value) {
            var target = this.app.get(value);
            this.action('simply-fullscreen',target);
        }
    };


    var handlers = [
        {
            match: 'input,select,textarea',
            get: function(el) {
                return el.dataset.simplyValue || el.value;
            },
            check: function(el, evt) {
                return evt.type=='change' || (el.dataset.simplyImmediate && evt.type=='input');
            }
        },
        {
            match: 'a,button',
            get: function(el) {
                return el.dataset.simplyValue || el.href || el.value;
            },
            check: function(el,evt) {
                return evt.type=='click' && evt.ctrlKey==false && evt.button==0;
            }
        },
        {
            match: 'form',
            get: function(el) {
                var data = {};
                [].forEach.call(el.elements, function(el) {
                    data[el.name] = el.value;
                });
                return data;//new FormData(el);
            },
            check: function(el,evt) {
                return evt.type=='submit';
            }
        }
    ];

    var fallbackHandler = {
        get: function(el) {
            return el.dataset.simplyValue;
        },
        check: function(el, evt) {
            return evt.type=='click' && evt.ctrlKey==false && evt.button==0;
        }
    };

    function getCommand(evt) {
        var el = evt.target.closest('[data-simply-command]');
        if (el) {
            var matched = false;
            for (var i=handlers.length-1; i>=0; i--) {
                if (el.matches(handlers[i].match)) {
                    matched = true;
                    if (handlers[i].check(el, evt)) {
                        return {
                            name:   el.dataset.simplyCommand,
                            source: el,
                            value:  handlers[i].get(el)
                        };
                    }
                }
            }
            if (!matched && fallbackHandler.check(el,evt)) {
                return {
                    name:   el.dataset.simplyCommand,
                    source: el,
                    value: fallbackHandler.get(el)
                };
            }
        }
        return null;
    }

    simply.command = function(app, inCommands) {

        var commands = Object.create(defaultCommands);
        for (var i in inCommands) {
            commands[i] = inCommands[i];
        }

        commands.app = app;

        commands.action = function(name) {
            var params = Array.prototype.slice.call(arguments);
            params.shift();
            return app.actions[name].apply(app.actions,params);
        };

        commands.call = function(name) {
            var params = Array.prototype.slice.call(arguments);
            params.shift();
            return this[name].apply(this,params);            
        };

        commands.appendHandler = function(handler) {
            handlers.push(handler);
        };

        commands.prependHandler = function(handler) {
            handlers.unshift(handler);
        };

        var commandHandler = function(evt) {
            var command = getCommand(evt);
            if ( command ) {
                if (!commands[command.name]) {
                    console.error('simply.command: undefined command '+command.name, command.source);
                } else {
                    commands.call(command.name, command.source, command.value);
                    evt.preventDefault();
                    evt.stopPropagation();
                    return false;
                }
            }
        };

        app.container.addEventListener('click', commandHandler);
        app.container.addEventListener('submit', commandHandler);
        app.container.addEventListener('change', commandHandler);
        app.container.addEventListener('input', commandHandler);

        return commands;
    };

    return simply;
    
})(this.simply || {}, this);
