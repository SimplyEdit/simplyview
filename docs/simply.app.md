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

  view: {
    myVariable: 'foo'

  }

});
```

It combines [simply.route](simply.route.md),
[simply.command](simply.command.md), [simply.action](simply.action.md) and
[simply.view](simply.view.md) into a single application wrapper.
