import { routes } from './route.mjs'
import { commands } from './command.mjs'
import { actions } from './action.mjs'
import { keys } from './key.mjs'
import { view } from './view.mjs'
import { html, css } from './highlight.mjs'

class SimplyApp
{

	constructor(options={})
	{
		this.container = options.container || document.body
		if (options.components) {
			let tempOptions = {}
			mergeComponents(tempOptions, options.components)
			mergeOptions(tempOptions, options) // make sure options to the app override components options
			options = tempOptions
		}
		for (let key in options) {
			switch(key) {
				case 'html':
					for (const name in options.html) {
						const element = document.createElement('div')
						element.innerHTML = options.html[name]
						let template = this.container.querySelector('template#'+name)
						if (!template) {
							template = document.createElement('template')
							template.id=name
							template.content.append(...element.children)
							this.container.appendChild(template)
						} else {
							template.content.replaceChildren(...element.children)
						}
					}
				break
				case 'css':
					for (const name in options.css) {
						let style = this.container.querySelector('style#'+name)
						if (!style) {
							style = document.createElement('style')
							style.id=name 
							this.container.appendChild(style)
						}
						style.innerHTML = options.css[name]
					}
				break
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
						get: (target, property) => {
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
						apply: (target, thisArg, argumentsList) => {
							// note: must use short function syntax so this is set to the app
							return target.apply(this, argumentsList)
						}
					}
					this[key] = new Proxy(options[key], moduleHandler)
					break
				components:
					this.components = components
					break
				prototype:
				__proto__:
					// ignore this to avoid prototype pollution
					break
				default:
					console.log('simply.app: unknown initialization option "'+key+'", added as-is')
					this[key] = options[key]
					break
			}
		}
	}

	get app()
	{
		return this
	}

	async start()
	{
		if (this.components) {
			for (const name in this.components) {
				if (this.components[name].hooks?.start) {
					await this.components[name].hooks.start.call(this, this.components[name])
				}
			}
		}
		if (this.hooks?.start) {
			await this.hooks.start()
		}
		if (this.routes) {
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

export function app(options={})
{
	return new SimplyApp(options)
}

if (!globalThis.html) {
	globalThis.html = html
}
if (!globalThis.css) {
	globalThis.css = css
}

function mergeOptions(options, otherOptions)
{
	for (const key in otherOptions) {
		switch(typeof otherOptions[key]) {
			case 'object':
				if (!otherOptions[key]) {
					continue // null
				}
				if (!options[key]) {
					options[key] = otherOptions[key]
				} else {
					//FIXME: check that options[key] is also an object
					mergeOptions(options[key], otherOptions[key])
				}
				break
			default:
				options[key] = otherOptions[key]
		}
	}
}

function mergeComponents(options, components) {
	for (const name in components) {
		const component = components[name]
		if (component.components) {
			mergeComponents(options, component.components)
		}
		if (!options.components) {
			options.components = {}
		}
		options.components[name] = component
		for (const key in component) {
			switch(key) {
				case 'hooks':
					// don't merge these, app.hooks.start will trigger each components start hook
				case 'components':
					// already handled
					break
				default:
					if (!options[key]) {
						options[key] = Object.create(null)
					}
					mergeOptions(options[key], component[key])
					break
			}
		}
	}
}
