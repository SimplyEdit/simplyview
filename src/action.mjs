class SimplyActions {
	constructor(options) {
        this.app = options.app
        
		const actionHandler = {
			get: (target, property, receiver) => {
				return target[property].bind(this.app)
			}
		}

		this.actions = new Proxy({}, actionHandler)
		Object.assign(this.actions, options.actions)
	}
}

export function actions(options) {
	return new SimplyActions(options)
}