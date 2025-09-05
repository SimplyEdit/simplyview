export function view(options) {
	if (options.app) {
		options.app.view = options.view || {}

		const load = () => {
			const data = options.app.view
			const path = globalThis.editor.data.getDataPath(options.app.container || document.body)
			options.app.view = globalThis.editor.currentData[path]
			Object.assign(options.app.view, data)
		}
		if (globalThis.editor && globalThis.editor.currentData) {
			load()
		} else {
			document.addEventListener('simply-content-loaded', load)
		}
		return options.app.view
	} else {
		return options.view
	}
}