const KEY = Object.freeze({
	Compose: 229,
	Control: 17,
	Meta:    224,
	Alt:     18,
	Shift:   16
})

class SimplyKey {
	constructor(options = {}) {
		if (!options.app) {
			options.app = {}
		}
		if (!options.app.container) {
			options.app.container = document.body
		}
		Object.assign(this, options.keys)

		const keyHandler = (e) => {
			if (e.isComposing || e.keyCode === KEY.Compose) {
			    return
			}
			if (e.defaultPrevented) {
			    return
			}
			if (!e.target) {
			    return
			}

			let selectedKeyboard = 'default'
			if (e.target.closest('[data-simply-keyboard]')) {
			    selectedKeyboard = e.target.closest('[data-simply-keyboard]')
			    					.dataset.simplyKeyboard
			}
			let keyCombination = []
			if (e.ctrlKey && e.keyCode!=KEY.Control) {
			    keyCombination.push('Control')
			}
			if (e.metaKey && e.keyCode!=KEY.Meta) {
			    keyCombination.push('Meta')
			}
			if (e.altKey && e.keyCode!=KEY.Alt) {
			    keyCombination.push('Alt')
			}
			if (e.shiftKey && e.keyCode!=KEY.Shift) {
			    keyCombination.push('Shift')
			}
			keyCombination.push(e.key.toLowerCase())

			let keyboards = []
			let keyboardElement = event.target.closest('[data-simply-keyboard]')
			while (keyboardElement) {
				keyboards.push(keyboardElement.dataset.simplyKeyboard)
				keyboardElement = keyboardElement.parentNode.closest('[data-simply-keyboard]')
			}
			keyboards.push('')

			let keyboard
			let separators = ['+','-']

			for (let i in keyboards) {
				keyboard = keyboards[i]
				if (keyboard == '') {
					keyboard = 'default'
				}
				for (let separator of separators) {
					let keyString = keyCombination.join(separator)

					if (this[keyboard] && (typeof this[keyboard][keyString]=='function')) {
						let _continue = this[keyboard][keyString].call(options.app, e)
						if (!_continue) {
							e.preventDefault()
							return
						}
					}
					if (typeof this[keyboard + '.' + keyString] == 'function') {
						let _continue = this[keyboard + '.' + keyString].call(options.app, e)
						if (!_continue) {
							e.preventDefault()
							return
						}					
					}

					const qsa = '[data-simply-accesskey="' + keyboard + '.' + keyString + '"]'
					const targets = options.app.container.querySelectorAll(qsa)
					console.log(qsa, targets)
					if (targets.length) {
						targets.forEach(t => t.click())
						e.preventDefault()
					}

				}
			}
		}

		options.app.container.addEventListener('keydown', keyHandler)
	}

}

export function keys(options={}, optionsCompat) {
	if (optionsCompat) {
		let app = options
		options = optionsCompat
		options.app = options
	}
	return new SimplyKey(options)
}

