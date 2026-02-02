export function actions(options, optionsCompat) 
{
	if (optionsCompat) {
		let app = options
		options = optionsCompat
		options.app = app
	}

	if (options.app) {
		const functionHandler = {
			apply(target, thisArg, argumentsList)
			{
				try {
					const result = target(...argumentsList)
					if (result instanceof Promise) {
						return result.catch(err => {
							return options.app.hooks.error.call(this, err, target)
						})							
					}
					return result
				} catch(err) {
					return options.app.hooks.error.call(this, err, target)
				}
			}
		}

		const actionHandler = {
			get(target, property)
			{
				if (!target[property]) {
					return undefined
				}
				if (options.app.hooks?.error) {
					return new Proxy(target[property].bind(options.app), functionHandler)
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