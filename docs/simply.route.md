# simply.route

simply.route is a simple url routing component. It will listen to URL changes 
and match them against the routes you provide. If a match is found, it will 
call the matching function and update the address bar without reloading.

simply.route will run the first matching route handler it finds, in the order 
in  which they were registered.

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
