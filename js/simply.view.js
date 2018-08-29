window.simply = (function(simply) {

	simply.view = function(app, view) {

		app.view = view || {}

		var load = function() {
			var data = app.view;
			var path = editor.data.getDataPath(app.container);
			app.view = editor.currentData[path];
			Object.keys(data).forEach(function(key) {
				app.view[key] = data[key];
			});
		}

		if (window.editor && editor.currentData) {
			load();
		} else {
			document.addEventListener('simply-content-loaded', function() {
				load();
			});
		}
		
		return app.view;
	};

	return simply;
})(window.simply || {});
