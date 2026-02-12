import { routes } from './route.mjs'
import { commands } from './command.mjs'
import { actions } from './action.mjs'
import { keys, accesskeys } from './key.mjs'
import { view } from './view.mjs'
import { html, css } from './highlight.mjs'
import { findAttribute } from './dom.mjs'

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
					this.keys = keys({ app: this, keys: options.keys })
					break
				case 'keyboard': // backwards compatible
					this.keys = keys({ app: this, keys: options.keyboard })
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
				case 'components':
					this[key] = options[key]
					break
				case 'prototype':
				case '__proto__':
					// ignore this to avoid prototype pollution
					break
				default:
					console.log('simply.app: unknown initialization option "'+key+'", added as-is')
					this[key] = options[key]
					break
			}
		}
		accesskeys({ app: this }) // adds accesskey handler
	}

	get app() //backwards compatibility, actions/commands used to call this.app instead of this
	{
		return this
	}

	findAttribute(...params) {
		return findAttribute.apply(this, params)
	}
}

function initRoutes(app) {
	if (app.routes) {
		if (app.baseURL) {
			app.routes.init({ baseURL: this.baseURL })
		}
		app.routes.handleEvents();
		globalThis.setTimeout(() => {
			if (app.routes.has(globalThis.location?.hash)) {
				app.routes.match(globalThis.location.hash)
			} else {
				app.routes.match(globalThis.location?.pathname+globalThis.location?.hash)
			}
		});
	}
}

export function app(options={})
{
	const app = new SimplyApp(options)
	if (app.hooks?.start) {
		app.hooks.start.call(app)
		// yagni - for now do this in your own app.hooks.start
		// if (app.components) {
		// 	for (const name in app.components) {
		// 		if (app.components[name].hooks?.start) {
		// 			await app.components[name].hooks.start.call(app, this.components[name])
		// 		}
		// 	}
		// }
		.then(() => initRoutes(app))
	} else {
		initRoutes(app)
	}
	return app
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
