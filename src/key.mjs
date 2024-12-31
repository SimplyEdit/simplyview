class SimplyKeys {
	constructor(options = {}) {
		if (!options.app) {
			options.app = {}
		}
		if (!options.app.container) {
			options.app.container = document.body
		}
		Object.assign(this, options.keys)

		const keyHandler = (e) => {
			if (e.isComposing || e.keyCode === 229) {
			    return;
			}
			if (e.defaultPrevented) {
			    return;
			}
			if (!e.target) {
			    return;
			}

			let selectedKeyboard = 'default';
			if (e.target.closest('[data-simply-keyboard]')) {
			    selectedKeyboard = e.target.closest('[data-simply-keyboard]').dataset.simplyKeyboard;
			}
			let key = '';
			if (e.ctrlKey && e.keyCode!=17) {
			    key+='Control+';
			}
			if (e.metaKey && e.keyCode!=224) {
			    key+='Meta+';
			}
			if (e.altKey && e.keyCode!=18) {
			    key+='Alt+';
			}
			if (e.shiftKey && e.keyCode!=16) {
			    key+='Shift+';
			}
			key+=e.key;

			if (this[selectedKeyboard] && this[selectedKeyboard][key]) {
			    let keyboard = this[selectedKeyboard]
			    keyboard[key].call(options.app,e);
			}
		}

		options.app.container.addEventListener('keydown', keyHandler)
	}

}

export function keys(options={}) {
	return new SimplyKeys(options)
}

