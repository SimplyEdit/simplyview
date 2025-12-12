# simply.app

simply.app provides a simple starting point to build web applications:

```javascript
var myApp = simply.app({
  routes: {
    '/:section/': function(params) { ... }
  },

  commands: { ... },

  actions: { ... },

  container: document.getElementById('myApp'),

  hooks: {
    start: function() { ... },
    error: function(error) { ... }
  },

  view: {
    myVariable: 'foo'
  }

});
myApp.start()
```

It combines [simply.route](simply.route.md),
[simply.command](simply.command.md), [simply.action](simply.action.md) and
[simply.view](simply.view.md) into a single application wrapper.

Do not forget to call the `start()` method on your app, this sets up the routing and will run your `hooks.start()` function, if you defined it.