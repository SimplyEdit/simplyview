export function actions(options) {
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