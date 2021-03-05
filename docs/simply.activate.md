# simply.activate

simply.activate is a component to automatically initialize HTML elements with 
javascript as they appear in the DOM.

```javascript
simply.activate.addListener('autosize',function() {
  $.autosize(this);
});
```

```html
<textarea data-simply-activate="autosize"></textarea>
```

The `addListener` method takes two arguments, a name and a callback method.
The name is what you use in the html `data-simply-activate` attribute. The
callback method is then called whenever the DOM element with that attribute
is added to the dom. It is also called on load.

The callback method has no arguments, instead it is called on the DOM element
itself. `this` references the DOM element.

Now you can use any 'legacy' component, in this case a jQuery textarea 
resizer, that needs to initialize HTML elements. Simply.activate will
trigger the initialization routine whenever the element is inserted into the
dom, no matter how or when this happens.
