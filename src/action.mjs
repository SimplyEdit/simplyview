export function actions(options, optionsCompat) {
	if (optionsCompat) {
		let app = options
		options = optionsCompat
		options.app = options
	}
	if (options.app) {
		const actionHandler = {
			get: (target, property) => {
				return target[property].bind(options.app)
			}
		}
		return new Proxy(options.actions, actionHandler)
	} else {
		return options
	}
}