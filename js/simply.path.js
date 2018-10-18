this.simply = (function(simply) {

    simply.path = {
        get: function(model, path) {
            if (!path) {
                return model;
            }
            return path.split('.').reduce(function(acc, name) {
                return (acc && acc[name] ? acc[name] : null);
            }, model);
        },
        set: function(model, path, value) {
            var lastName   = simply.path.pop(path);
            var parentPath = simply.path.parent(path);
            var parentOb   = simply.path.get(model, parentPath);
            parentOb[lastName] = value;
        },
        pop: function(path) {
            return path.split('.').pop();
        },
        push: function(path, name) {
            return (path ? path + '.' : '') + name;
        },
        parent: function(path) {
            var p = path.split('.');
            p.pop();
            return p.join('.');
        },
        parents: function(path) {
            var result = [];
            path.split('.').reduce(function(acc, name) {
                acc.push( (acc.length ? acc[acc.length-1] + '.' : '') + name );
                return acc;
            },result);
            return result;
        }
    };

    return simply;
})(this.simply || {});
