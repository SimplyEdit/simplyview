# simply.collect

simply.collect allows you to create auto updating forms, just by adding a few 
attributes to the form and its elements:

```javascript
function getAddress(elements) {
  if (elements.zipcode.value && elements.housenr.value) {
    zipcodeAPI
    .getAddress(elements.zipcode.value,elements.country.value)
    .then(function(address) {
      elements.street.value = address.street;
      elements.city.value = address.city;
    }
  }
}

simply.collect.addListener('address', getAddress);
```

```html
<form>
  <div data-simply-collect="address">
    <label>
      Zipcode: <input name="zipcode" data-simply-element="zipcode">
    </label>
    <label>
      House NR: <input name="housenumber" data-simply-element="housenr">
    </label>
    <label>
      Street: <input name="street" data-simply-element="street">
    </label>
    <label>
      City: <input name="city" data-simply-element="city">
    </label>
  </div>
</form>
```

The listener will get called whenever any of the elements changes. You can add 
as many forms and as many container elements with data-simply-collect as you want.

## simply.collect.addListener

Add a collect listener. See the code above in the overview.

## simply.collect.removeListener

Removes a previously added listener. You must call removeListener with the 
exact same name and function as used in addListener:

```javascript
simply.collect.removeListener('address', getAddress);
```

## simply.collect.update

simply.collect only listens for the change event. So if you update an input 
elements value through javascript, the collect listeners won't trigger, unless 
you also trigger the change event. simply.collect.update does this for you:

```javascript
simply.collect.update(form.elements.zipcode, newZipcode);
```