class SimplyCommands {
	constructor(options={}) {
		if (!options.app) {
			options.app = {}
		}
		if (!options.app.container) {
			options.app.container = document.body
		}
		this.app = app
		this.handlers = handlers || defaultHandlers
		this.commands = commands || {}

		const commandHandler = (evt) => {
			const command = getCommand(evt, this.handlers)
			if (!command) {
				return
			}
			if (!commands[command.name]) {
                console.error('simply.command: undefined command '+command.name, command.source);
                return
			}
			this.commands[command.name].call(this.app, command.source, command.value)
		}

        function stop(fn) {
            return (evt) => {
                fn(evt)
                evt.preventDefault()
                evt.stopPropagation()
                return false                
            }
        }

        this.app.container.addEventListener('click', stop(commandHandler))
        this.app.container.addEventListener('submit', stop(commandHandler))
        this.app.container.addEventListener('change', commandHandler)
        this.app.container.addEventListener('input', commandHandler)
	}
}

export function command(options={}) {
	return new SimplyCommands(options)
}

function getCommand(evt, handlers) {
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

const defaultHandlers = [
    {
        match: 'input,select,textarea',
        get: function(el) {
            if (el.tagName==='SELECT' && el.multiple) {
                var values = [], opt;
                for (var i=0,l=el.options.length;i<l;i++) {
                    var opt = el.options[i];
                    if (opt.selected) {
                        values.push(opt.value);
                    }
                }
                return values;
            }
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
                if (el.tagName=='INPUT' && (el.type=='checkbox' || el.type=='radio')) {
                    if (!el.checked) {
                        return;
                    }
                }
                if (data[el.name] && !Array.isArray(data[el.name])) {
                    data[el.name] = [data[el.name]];
                }
                if (Array.isArray(data[el.name])) {
                    data[el.name].push(el.value);
                } else {
                    data[el.name] = el.value;
                }
            });
            return data;//new FormData(el);
        },
        check: function(el,evt) {
            return evt.type=='submit';
        }
    },
    {
    	match: '*',
        get: function(el) {
            return el.dataset.simplyValue;
        },
        check: function(el, evt) {
            return evt.type=='click' && evt.ctrlKey==false && evt.button==0;
        }
    }
]