class SimplyKeys {
	constructor(options = {} ) {
		if (!options.app) {
			options.app = {}
		}
		if (!options.app.container) {
			options.app.container = document.body
		}
		this.app = options.app
		this.app.container.addEventListener('keydown', keyHandler(this.keys))
	}
}

export function keys(options={}) {
	return new SimplyKeys(options)
}

function keyHandler(keys) {
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

		if (keys[selectedKeyboard] && keys[selectedKeyboard][key]) {
		    let keyboard = keys[selectedKeyboard]
		    keyboard.app = keys.app;
		    keyboard[key].call(keys.app,e);
		}
	}
}