import { routes } from './route.mjs'
import { commands } from './command.mjs'
import { actions } from './action.mjs'
import { keys } from './key.mjs'
import { view } from './view.mjs'

class SimplyApp {
	constructor(options={}) {
		this.container = options.container || document.body
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
		if (options.view) {
			this.view = view({app: this, view: options.view})
		}
	}
}

export function app(options={}) {
	return new SimplyApp(options)
}