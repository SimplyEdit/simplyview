import { activate } from './activate.mjs'
import { actions as action } from './action.mjs'
import { app } from './app.mjs'
import { commands as command } from './command.mjs'
import { include } from './include.mjs'
import { keys as key } from './key.mjs'
import path from './path.mjs'
import { routes as route } from './route.mjs'
import { view } from './view.mjs'
import { findAttribute } from './dom.mjs'

const simply = {
	activate,
	action,
	app,
	command,
	include,
	key,
	path,
	route,
	view,
	findAttribute
}

globalThis.simply = simply

export default simply