export function actions(options, optionsCompat) 
{
	if (optionsCompat) {
		let app = options
		options = optionsCompat
		options.app = app
	}

	if (options.app) {
		const waitHandler = {
			apply(target, thisArg, argumentsList)
			{
				try {
					const result = target(...argumentsList)
					if (result instanceof Promise) {
						options.app.hooks.wait(true)
						return result.finally(() => {
							options.app.hooks.wait(false, target)
						})
					}
					return result
				} catch(err) {
				}
			}
		}

		const functionHandler = {
			apply(target, thisArg, argumentsList)
			{
				try {
					const result = target(...argumentsList)
					if (result instanceof Promise) {
						if (options.app.hooks.wait) {
							options.app.hooks.wait(true, target)
							return result.catch(err => {
								return options.app.hooks.error(err, target)
							})
							.finally(() => {
								options.app.hooks.wait(false, target)
							})
						} else {
							return result.catch(err => {
								return options.app.hooks.error(err, target)
							})							
						}
					}
					return result
				} catch(err) {
					return options.app.hooks.error(err, target)
				}
			}
		}

		const actionHandler = {
			get(target, property)
			{
				if (!target[property]) {
					return undefined
				}
				if (options.app.hooks.error) {
					return new Proxy(target[property].bind(options.app), functionHandler)
				} else if (options.app.hooks.wait) {
					return new Proxy(target[property].bind(options.app), waitHandler)
				} else {
					return target[property].bind(options.app)
				}
			}
		}
		return new Proxy(options.actions, actionHandler)
	} else {
		return options
	}
}