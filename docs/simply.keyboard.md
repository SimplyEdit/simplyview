# simply.keyboard

simply.keyboard is a simple library to add keyboard support to your application:

```javascript
let myKeys = {
  default: {
    ArrowDown: (e) => {
      // handle arrow down
    }
  }
}
simply.keyboard(myApp, myKeys);
```

But generally you won't use this directly, but through simply.app:

```javascript
var myApp = simply.app({
  keyboard: {
    default: {
      ArrowDown: (e) => {

      }
    }
  }
});
```

You can add multiple keyboard definitions:

```javascript
var counterApp = simply.app({
  keyboard: {
    default: {
      ArrowDown: (e) => {

      }
    },
    alternate: {
      ArrowDown: (e) => {

      }
    }
  }
});
```

The default keyboard is 'default', but you can switch the keyboard by setting this attribute:

```html
<div data-simply-keyboard="alternate">
  <input type="text" name="example">
</div>
```

Whenever a keyboard `keydown` is fired, simply.keyboard will look for the closest parent with a `data-simply-keyboard` attribute. If found, it will use that keyboard definition. If not found, it will use `default`.

The `keydown` event is only handled if the activeElement (the element that has focus) is inside the application container. See `simply.app` for more on that.

