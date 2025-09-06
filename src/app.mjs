import { routes } from './route.mjs'
import { commands } from './command.mjs'
import { actions } from './action.mjs'
import { keys } from './key.mjs'
import { view } from './view.mjs'

class SimplyApp {
	constructor(options={}) {
		this.container = options.container || document.body
		for (let key in options) {
			switch(key) {
				case 'commands':
					this.commands = commands({ app: this, container: this.container, commands: options.commands})
					break
				case 'keys':
				case 'keyboard': // backwards compatible
					this.keys = keys({ app: this, keys: options.keys })
					break
				case 'routes':
					this.routes = routes({ app: this, routes: options.routes})
					break
				case 'actions':
					this.actions = actions({app: this, actions: options.actions})
					break
				case 'view':
					this.view = view({app: this, view: options.view})
					break
				default:
					this[key] = options[key] // allows easy additions
					break
			}
		}
	}
}

export function app(options={}) {
	return new SimplyApp(options)
}