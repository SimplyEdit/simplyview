export function actions(options, optionsCompat) {
	if (optionsCompat) {
		let app = options
		options = optionsCompat
		options.app = app
	}
	if (options.app) {
		const actionHandler = {
			get(target, property) {
				if (!target[property]) {
					return undefined
				}
				if (target.catch) {
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

const functionHandler = {
	apply(target, thisArg, argumentsList) {
		try {
			const result = target(...argumentsList)
			if (result instanceof Promise) {
				return result.catch(err => {
					return thisArg.catch(err)
				})
			}
			return result
		} catch(err) {
			return thisArg.catch(err)
		}
	}
}