# simply.view

simply.view provides a simple interface to use the databinding from
[SimplyEdit](https://simplyedit.io/) in a web application:

```javascript
var myView = {
  foo: 'bar'
};

simply.view(myApp, myView);
```

But generally you won't use this directly, but through simply.app:

```javascript
var counterApp = simply.app({
  view: {
    counter: 1
  }
});
```

Any data-simply-field you define in your apps HTML is automatically bound to the corresponding entry in the view.

## Example

A simple example - an app that can count up and down:

```html
<div id="counter">
  <input type="text" data-simply-field="counter">
  <button data-simply-command="add1">+</button>
  <button data-simply-command="sub1">-</button>
</div>
```

```javascript
var counterApp = simply.app({

  container: document.getElementById('counter'),

  commands: {
    add1: function() { this.app.view.counter++; },
    sub1: function() { this.app.view.counter--; }
  },

  view: {
    counter: 0
  }

};
```
