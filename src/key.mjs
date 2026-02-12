import { findAttribute } from './dom.mjs'

const KEY = Object.freeze({
	Compose: 229,
	Control: 17,
	Meta:    224,
	Alt:     18,
	Shift:   16
})

class SimplyKey
{
	constructor(options = {})
	{
		if (!options.app) {
			options.app = {}
		}
		if (!options.app.container) {
			options.app.container = document.body
		}
		Object.assign(this, options.keys)

		const keyHandler = (e) => {
			let keyboards = []
			let keyboardElement = event.target.closest('[data-simply-keyboard]')
			while (keyboardElement) {
				keyboards.push(keyboardElement.dataset.simplyKeyboard)
				keyboardElement = keyboardElement.parentNode.closest('[data-simply-keyboard]')
			}
			if (keyboards[keyboards.length-1]!='default') {
				keyboards.push('default')
			}

			let keyboard
			let separators = ['+','-']

			for (let separator of separators) {
				const keyString = getKeyString(e, separator)
				for (let i in keyboards) {
					keyboard = keyboards[i]
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
					if (typeof this[keyString] == 'function') {
						let _continue = this[keyString].call(options.app, e)
						if (!_continue) {
							e.preventDefault()
							return
						}					
					}
				}
			}
		}

		options.app.container.addEventListener('keydown', keyHandler)
	}
}

function getKeyString(e, separator='+')
{
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
	return keyCombination.join(separator)
}

export function keys(options={}, optionsCompat)
{
	if (optionsCompat) {
		let app = options
		options = optionsCompat
		options.app = options
	}
	return new SimplyKey(options)
}

export function accesskeys(app) {
	const container = app.container || document.body
	container.addEventListener('keydown', (e) => {
		const separators = ["+", "-"]
		for (const separator of separators) {
			const keyString = getKeyString(e, separator)
			const selector = "[data-simply-accesskey='" + keyString + "']"
			const targets = container.querySelectorAll(selector)
			if (targets.length) {
				targets.forEach(function(target) {
					target.click()
				})
			}
		}
	})
}