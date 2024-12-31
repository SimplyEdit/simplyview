class SimplyCommands {
	constructor(options={}) {
		if (!options.app) {
			options.app = {}
		}
		if (!options.app.container) {
			options.app.container = document.body
		}
		this.$handlers = options.handlers || defaultHandlers
        if (options.commands) {
    		Object.assign(this, options.commands)
        }

		const commandHandler = (evt) => {
			const command = getCommand(evt, this.$handlers)
			if (!command) {
				return
			}
			if (!this[command.name]) {
                console.error('simply.command: undefined command '+command.name, command.source);
                return
			}
            const shouldContinue = this[command.name].call(options.app, command.source, command.value)
            if (shouldContinue===false) {
                evt.preventDefault()
                evt.stopPropagation()
                return false
            }
		}

        options.app.container.addEventListener('click', commandHandler)
        options.app.container.addEventListener('submit', commandHandler)
        options.app.container.addEventListener('change', commandHandler)
        options.app.container.addEventListener('input', commandHandler)
	}
}

export function commands(options={}) {
	return new SimplyCommands(options)
}

function getCommand(evt, handlers) {
    var el = evt.target.closest('[data-simply-command]')
    if (el) {
        for (let handler of handlers) {
            if (el.matches(handler.match)) {
                if (handler.check(el, evt)) {
                    return {
                        name:   el.dataset.simplyCommand,
                        source: el,
                        value:  handler.get(el)
                    }
                }
                return null
            }
        }
    }
    return null
}

const defaultHandlers = [
    {
        match: 'input,select,textarea',
        get: function(el) {
            if (el.tagName==='SELECT' && el.multiple) {
                let values = []
                for (let option of el.options) {
                    if (option.selected) {
                        values.push(option.value)
                    }
                }
                return values
            }
            return el.dataset.simplyValue || el.value
        },
        check: function(el, evt) {
            return evt.type=='change' || (el.dataset.simplyImmediate && evt.type=='input')
        }
    },
    {
        match: 'a,button',
        get: function(el) {
            return el.dataset.simplyValue || el.href || el.value
        },
        check: function(el,evt) {
            return evt.type=='click' && evt.ctrlKey==false && evt.button==0
        }
    },
    {
        match: 'form',
        get: function(el) {
            let data = {}
            for (let input of Array.from(el.elements)) {
                if (input.tagName=='INPUT' 
                    && (input.type=='checkbox' || input.type=='radio')
                ) {
                    if (!input.checked) {
                        return;
                    }
                }
                if (data[input.name] && !Array.isArray(data[input.name])) {
                    data[input.name] = [data[input.name]]
                }
                if (Array.isArray(data[input.name])) {
                    data[input.name].push(input.value)
                } else {
                    data[input.name] = input.value
                }
            }
            return data
        },
        check: function(el,evt) {
            return evt.type=='submit'
        }
    },
    {
    	match: '*',
        get: function(el) {
            return el.dataset.simplyValue
        },
        check: function(el, evt) {
            return evt.type=='click' && evt.ctrlKey==false && evt.button==0
        }
    }
]