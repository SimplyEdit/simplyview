# simply.api

Simply.api is a library that makes it easier to connect to online API's,
like REST or JSON-RPC api's. It contains a simplified fetch() method as well
as a proxy that allows you to call remote API's as if they were a local
library. E.g.:

```javascript
const githubApi = simply.api.proxy({
	baseURL: 'https://api.github.com',
	headers: {
		'Accept': 'application/vnd.github.v3+json',
		'User-Agent': 'SimplyApi'
	}
});

githubApi.users.poef()
.then(user => {
	console.log(user);
});
```

The proxy() method returns an object that will create new proxy objects on
the fly for any property you access on it, like the 'users' property above.
When you call such a property as a function, the proxy object will convert
the property path to a URL and fetch it.

In this case the githubApi.users.poef() call is converted to a GET request
with the url: 'https://api.github.com/users/poef'.

You can also pass arguments to the method, by passing an object with key
value pairs:

```javascript
githubApi.users.octocat.hovercard({
	subject_type: 'repository',
	subject_id: 1300192
});
```

Which is converted in a fetch() request like this:

```javascript
GET https://api.github.com/users/octocat/hovercard?subject_type=repository&subject_id=1300192
```

If you want to use a different HTTP Verb, like 'POST', add that as the last entry like
this:

```javascript
githubApi.user.keys.post({
	key: "mykey"
})
.then(result => {
	console.log(result);
});
```

The default verb methods that simply.api understands are GET and POST. If
you need more, declare them in the options object under the 'verbs' key.

You can add any option recognized by the default fetch() api in the proxy
options object, see [the init property
here](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
In addition the proxy recognizes these options:

- responseFormat
- paramsFormat
- verbs
- user and password
- handlers

## responseFormat

This declares the expected result format of the remote API. The valid
options are:

- text
- formData
- blob
- arrayBuffer
- unbuffered
- json

The default is 'json'. Unlike the standard fetch() api, simply.api.fetch
(used by the proxy object) automatically parses and returns the result, as a
Promise. If an error is returned - the response.ok flag is false - then it
will throw an error object with the status, message and full response
object.


## paramsFormat

Available formats are:
- search
- formData
- json

When the fetch method is GET, the format is forced to 'search'. 

### search
This option sets the parameter format for the remote API. When set to search, 
the parameters are send as a url encoded parameters in the URL of the
request.

### formData
Sets the parameter format to the default formdata encoding, add the
parameters to the body of the request.

### json
Encodes the parameters as a json string and adds it to the body of the
request.

## verbs

By default simply.api.proxy understands the GET and POST verbs. You can add
more by setting this option, e.g:

```javascript
const githubApi = simply.api.proxy({
	baseURL: 'https://api.github.com',
	headers: {
		'Accept': 'application/vnd.github.v3+json',
		'User-Agent': 'SimplyApi'
	},
	verbs: [ 'get', 'post', 'put', 'delete' ]
});
```

Now you can call the put() and delete() methods on the proxy as well:

```javascript
githubApi.user.following.octocat.delete();
```

Note: the verb names are automatically uppercased when sent. 

## user and password

If you set a user and password property in the options to simply.api.proxy,
these will be converted to a basic authentication header and added to each
request.

## handlers

Some API's require extra handling for requests or parsing of responses. You
can override or extend the default handlers here. The available handlers are:

- fetch
- result
- error

A minimal definition for these handlers that maintains the default behaviour
is:

```javascript
const githubApi = simply.api.proxy({
	baseURL: 'https://api.github.com',
        headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'SimplyApi'
        },
        verbs: [ 'get', 'post', 'put', 'delete' ],
	handlers: {
		fetch: function(verb, params, options) {
			// prepare stuff here
			return simply.api.fetch(verb, params, options)
			.then(response => {
				// do some more stuff here
				return response;
			});
		},
		result: function(result, options) {
			// ditto
			return simply.api.getResult(result, options)
			.then(result => {
				// more doing
				return result;
			});
		},
		error: function(error, options) {
			// ...
			simply.api.logError(error, options); // no return value here				
		}
	}
});
```

