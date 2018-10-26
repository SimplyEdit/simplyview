# simplyview
## Modern reactive web user interfaces the simply way

simplyview is a set of decoupled libraries to help build user interfaces for web applications. Each library is small and focused and can be used standalone. 

simplyview is build to be used in the browser. simplyview requires a modern browser, Chrome, Firefox, Safari, Edge and others, but not Internet Explorer (although some parts do work in IE).

See the [reference](https://reference.simplyedit.io/simplyview/) for more information.

## Usage

For now the simplest way to start is to clone this repository in your project:

`git clone https://github.com/SimplyEdit/simplyview.git`

You'll get the whole repository, which includes the separate javascript files in `simplyview/js/`, as well as the combined set in `simplyview/dist`.

If you use `simply.include.js`, make sure to also include `simply.include.next.js` in the same directory.

## Status

SimplyView is still in Beta, so use at your own risk. That said, most components are ready and have been tested in most browsers and in different applications. Only the simply.observe.js is relatively untested and simply.bind.js and simply.render.js are not finished.

simply.bind.js will probably be combined with simply.render and renamed simply.field.js. This component, in combination with a new simply.list.js, will implement the rendering part of SimplyEdit. For now just use SimplyEdit in combination with SimplyView.
