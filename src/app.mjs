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
				case 'root': // backwards compatibility
				case 'baseURL':
					this.baseURL = options[key]
					break
				case 'routes':
					this.routes = routes({ app: this, routes: options.routes})
					break
				case 'actions':
					this.actions = actions({app: this, actions: options.actions})
					this.action = function(name) { // backwards compatible wiht SimplyView2
						console.warn('deprecated call to `this.action`')
						let params = Array.from(arguments).slice()
				        params.shift()
				        return this.actions[name](...params)
				    }
					break
				case 'view':
					this.view = view({app: this, view: options.view})
					break
				case 'hooks':
					const moduleHandler = {
						get(target, property) {
							if (!target[property]) {
								return undefined
							}
							if (typeof target[property]=='function') {
								return new Proxy(target[property], functionHandler)
							} else if (target[property] && typeof target[property]=='object') {
								return new Proxy(target[property], moduleHandler)
							} else {
								return target[property]
							}
						}
					}
					const functionHandler = {
						get(target, property) {
							if (!target[property]) {
								return undefined
							}
							return target[property].bind(this)
						}
					}
					this[key] = new Proxy(options[key], moduleHandler)
					break
				default:
					console.log('simply.app: unknown initialization option "'+key+'", added as-is')
					this[key] = options[key]
					break
			}
		}
	}
	get app() {
		return this
	}
	async start() {
		if (this.hooks?.start) {
			await this.hooks.start()
		}
		if (this.route) {
			if (this.baseURL) {
				this.routes.init({ baseURL: this.baseURL })
			}
			this.routes.handleEvents();
			globalThis.setTimeout(() => {
				if (this.routes.has(globalThis.location?.hash)) {
					this.routes.match(globalThis.location.hash)
				} else {
					this.routes.match(globalThis.location?.pathname+globalThis.location?.hash)
				}
			});
		}
	}
}

export function app(options={}) {
	return new SimplyApp(options)
}