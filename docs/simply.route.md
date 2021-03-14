# simply.route

simply.route is a simple url routing component. It will listen to URL changes 
and match them against the routes you provide. If a match is found, it will 
call the matching function and update the address bar without reloading.

simply.route will run the first matching route handler it finds, in the order 
in  which they were registered.

Each route is a function with a single argument: `params`. Each variable you 
define in the route, like `:section`, is translated into a property of the
params object, e.g. `params.section`. If you add a `:*` at the end of the route
it will be translated to `params.remainder`.

simply.route also supports events that trigger either before route matching,
before route calling or after a route is called. 

If you need more complex behaviour, you should replace simply.route with a
different library. simply.route is explicitly meant to be a simple library
that is sufficient for 90% of javascript applications.

## simply.route.load

```javascript
simply.route.load({

  '/:section/:*': function(params) {
    loadSection(params.section, params.remainder);
  },

  '/': function() {
    loadHome();
  }
});
```

## simply.route.match

```javascript
simply.route.match(path);
```

This allows you to trigger a route. You can also provide extra parameters 
for the route handler:

```javascript
simply.route.match(path, { foo: 'bar' });
```

## simply.route.goto

Updates the browsers address bar and matches the path.

```javascript
simply.route.goto(path);
```

## simply.route.has

Returns true if the route is registered.

```javascript
if (simply.route.has(path)) { ... }
```

## simply.route.init

Allows you to set the root pathname for routing. The root pathname is prepended
on every route you define. So if your application lives in the '/hnpwa/' 
directory in the document root of you website, init simply.route like this:

```javascript
simply.route.init({
	root: '/hnpwa/'
});
````

## simply.route.addListener

In the normal route handling, once a matching route is found, simply.route calls
it and stops. But sometimes you may want to trigger some code for multiple routes.
With route listeners you can do just that. You can setup a function that will be
called either before a route is found (`match`), before it is called (`call`) or after
it is called (`finish`).

In each of these steps you may change the default behaviour of simply.route by altering
parameters passed to your listener function and returning them.

### match

This allows you to add complex behaviour to the route matching step, so you can for
example match multiple different URL's to a single route. The single parameter is the 
path to match on:

```
	simply.route.addListener('match', '/protected/', function(params) {
		// assume user is a variable in scope
		if (!user || !user.isLoggedIn ) {
			return {
				path: '/login/'
			};
		}
	});
```

### call 

This allows you to change parameters before the actual route function is called.

```
	simply.route.addListener('call', '/foo/', function(params) {
		params.foo = 'bar';
		return params;
	});
```

### finish

This allows you to do stuff after a route is called. You can also change the result
of the route, though that is usually not a good idea.

## simply.route.removeListener

This allows you to remove a route listener. You need to exactly match the fase of the
listener (`match`, `call` or `finish`), the route and the function:

```javascript
	simply.route.removeListener('call', '/foo/', fooListener);
```

## simply.route.clear

Removes all routes and listeners globally.