(function() {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        var simply = {
            command: require('simply.command.js'),
            action:  require('simply.action.js'),
            route:   require('simply.route.js'),
            view:    require('simply.view.js'),
			viewmodel: require('simply.viewmodel.js'),
            resize:  require('simply.resize.js'),
            activate:require('simply.active.js'),
            include: require('simply.include.js'),
            render:  require('simply.render.js'),
            observe: require('simply.observe.js'),
            bind:    require('simply.bind.js'),
            app:     require('simply.app.js'),
            collect: require('simply.collect.js'),
            path:    require('simply.path.js')
        }

        module.exports = simply;
    }
})();