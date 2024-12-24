class SimplyKeys {
	constructor(options = {}) {
		if (!options.app) {
			options.app = {}
		}
		if (!options.app.container) {
			options.app.container = document.body
		}
		this.keys = options.keys || {}
		this.app = options.app
		this.app.container.addEventListener('keydown', this.keyHandler())
	}

	keyHandler() {
		return (e) => {
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

			if (this.keys[selectedKeyboard] && this.keys[selectedKeyboard][key]) {
			    let keyboard = this.keys[selectedKeyboard]
			    keyboard[key].call(this.app,e);
			}
		}
	}
}

export function keys(options={}) {
	return new SimplyKeys(options)
}

