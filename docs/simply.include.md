# simply.include

simply.include is a component that allows you to include external HTML - with 
CSS and javascript - in the current HTML document. You will need to make sure 
you don't overwrite global variables, the javascript and css get applied to 
the whole document.

This component makes it easy to create microfrontends for microservices, 
without forcing you to use a specific framework or technology.

Start by including the simply.include script, or simply.everything.js:

```html
<script src="js/simply.everything.js"></script>
```

Then add a simply-include link at the exact spot where you want to include a 
widget or application or just a piece of HTML:

```html
<link rel="simply-include" href="/simplyview/widgets/my-widget/index.html"></link>
```

Your widget may contain any HTML, CSS and javascript you like, except it 
shouldn't contain a HEAD. So a widget might look like this:

```html
<script src="/simplyview/js/simply.everything.js"></script>
<link rel="simply-include-once" href="/simplyview/common/head.html">
<link rel="simply-include-once" href="/simplyview/common/menu.html">
<link rel="stylesheet" href="/simplyview/widgets/my-widget/style.css">
<div class="my-widget">
  ....
</div>
```

The widget includes some common HTML, but only if it wasn't included before. 
Assuming your pages all include the common head and menu, the widget will skip 
this if the widget is included in a page. However you can also call the widget 
as a normal page. In that case the common head and menu will be included and 
the widget will decorate itself with the default styling and menu.

simply.include will automatically detect `<link rel="simply-include(-once)">` 
links in the DOM, no matter when and how they appear, and replace them with 
the HTML fetched from the linked href.

## Security

simply.include is meant to include HTML with CSS and javascript into an 
existing document. So you must take care that whatever you include is what you 
meant to include. If you allow user input, you must make sure that it doesn't 
have `<link rel="simply-include(-once)">` tags. Or that if they do, they won't 
get executed.

As a baseline, always clean user input of any offending tags, or even better: 
clean it of all HTML. If that can't be done, make sure you use a whitelist of 
acceptable tags. 

Finally as a catchall, use Content-Security-Policy headers to only allow script 
execution of whitelisted URL's. Don't allow inline scripts or you will still 
be open to Cross Site Scripting attacks (XSS).
