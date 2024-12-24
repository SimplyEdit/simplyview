import { routes } from './route.mjs'
import { commands } from './command.mjs'
import { actions } from './action.mjs'
import { keys } from './key.mjs'
import { signal } from './state.mjs'
import { bind } from './bind.mjs'

class SimplyApp {
	constructor(options={}) {
		this.container = options.container || document.body
		if (options.state) {
			this.state = signal(options.state)
		}
		if (options.commands) {
			this.commands = commands({ app: this, container: this.container, commands: options.commands})
		}
		if (options.keys) {
			this.keys = keys({ app: this, keys: options.keys })
		}
		if (options.routes) {
			this.routes = routes({ app: this, routes: options.routes})
		}
		if (options.actions) {
			this.actions = actions({app: this, actions: options.actions})
		}
		bind({ container: this.container, state: this.state })
	}
}

export function app(options={}) {
	return new SimplyApp(options)
}