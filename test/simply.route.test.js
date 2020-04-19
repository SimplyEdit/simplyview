simplyRoute = require('../js/simply.route.js');

test('match fixed url', () => {
	simplyRoute.load({
		'/foo/': function(params) {
			return 'bar';
		}
	});
	expect(simplyRoute.match('/foo/')).toBe('bar');
});

test('match only from start', () => {
	simplyRoute.load({
		'/foo/': function(params) {
			return 'bar';
		},
		'/oo/': function(params) {
			return 'foobar';
		}
	});
	expect(simplyRoute.match('oo/')).toBe('foobar');
});

test('match parameter', () => {
	simplyRoute.load({
		'/bar/:id' : function(params) {
			return params.id;
		}
	});
	expect(simplyRoute.match('bar/foobar')).toBe('foobar');
});

test('multiple parameters', () => {
	simplyRoute.load({
		'/baz/:id/:page' : function(params) {
			return params.id+':'+params.page;
		}
	});
	expect(simplyRoute.match('baz/foobar/1')).toBe('foobar:1');	
});

test('match listener', () => {
	simplyRoute.addListener('match', 'oo/', function(args) {
		args.path = 'foo/';
		return args;
	});
	simplyRoute.load({
		'/oo/': function(params) {
			return 'foobar';
		},
		'/foo/': function(params) {
			return 'bar';
		}
	});
	expect(simplyRoute.match('oo/')).toBe('bar');
});

test('call listener', () => {
	simplyRoute.clear();
	simplyRoute.addListener('call', 'foo/:id', function(args) {
		args.params.id = 'foo'+args.params.id;
		return args;
	});
	simplyRoute.load({
		'/foo/:id': function(params) {
			return params.id;
		}
	});
	expect(simplyRoute.match('foo/bar')).toBe('foobar');
});

test('remove listener', () => {
	simplyRoute.clear();
	var callback = function(args) {
		args.params.id = 'foo'+args.params.id;
		return args;
	};
	simplyRoute.addListener('call', 'foo/:id', callback);
	simplyRoute.load({
		'/foo/:id': function(params) {
			return params.id;
		}
	});
	simplyRoute.removeListener('call','foo/:id', callback);
	expect(simplyRoute.match('foo/bar')).toBe('bar');
});

test('multiple listeners', () => {
	simplyRoute.clear();
	simplyRoute.addListener('call', 'foo/:id', function(args) {
		args.params.id+='1';
	});
	simplyRoute.addListener('call', 'foo/:id', function(args) {
		args.params.id+='2';
	});
	simplyRoute.load({
		'/foo/:id': function(params) {
			return params.id;
		}
	});
	expect(simplyRoute.match('foo/bar')).toBe('bar12');
});