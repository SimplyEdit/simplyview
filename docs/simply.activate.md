# simply.activate

simply.activate is a component to automatically initialize HTML elements with 
javascript as they appear in the DOM.

```javascript
simply.activate.addListener('autosize',function(el) {
  $.autosize(el);
});
```

```html
<textarea data-simply-activate="autosize"></textarea>
```

Now you can use any 'legacy' component, in this case a jQuery textarea 
resizer, that needs to initialize HTML elements. Simply.activate will
trigger the initialization routine whenever the element is inserted into the
dom, no matter how or when this happens.
