import { activate } from './activate.mjs'
import { actions as action } from './action.mjs'
import { app } from './app.mjs'
import { commands as command } from './command.mjs'
import { include } from './include.mjs'
import { keys as key } from './key.mjs'
import { routes as route } from './route.mjs'
import { view } from './view.mjs'
import { SimplyRender } from './render.mjs'

const simply = {
	activate,
	action,
	app,
	command,
	include,
	key,
	route,
	view
}

function escapeHTML(content) {
	return (''+content)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function escapeCSS(content) {
	// don't allow </style>
	return (''+content)
		.replace(/<\//g, '<')
}

globalThis.simply = simply
globalThis.html = function(strings, ...values) {
  const outputArray = values.map(
    (value, index) =>
      `${strings[index]}${escapeHTML(value)}`,
  );
  return outputArray.join("") + strings[strings.length - 1];
}
globalThis.css = function(strings, ...values) {
  const outputArray = values.map(
    (value, index) =>
      `${strings[index]}${escapeCSS(value)}`,
  );
  return outputArray.join("") + strings[strings.length - 1];
}
export default simply