# distributed-router
Distributed Client Side Router for use with a hierarchy of custom components in an Single Page Application

This is a series of javascript modules that you can link together to form a distributed client router system.  It links 
the browsers URL bar into a chained list of `Routee` objects that process a part of the segmented url.  It takes in a `route` object
and passes out a `subRoute` object.  These are chained together, the subRoute at one level being fed into route of the next level down
the hierarchy.  

At the top level is a pair of functions `connectUrl` and `disconnectUrl`.  Which ever element will be your master controller (I generally 
have a `<main-app>` element which has a `<session-manager>` and `<page-manager>`, both of which are controlling pages.  A `<session-manager>` 
page doesn't reflect in the url bar at all as the user navigates the sign in process.  But once authorised, the `<page-manager>` takes over
and controls which page is displayed based on the url.  So it is the `<page-manager>` custom element that calls `connectUrl` in its `connectedCallback`
function, and `disconnectUrl` in its `disconnectedCallback` function.  `connectUrl` uses a callback function as its only parameter and this callback
function gets called on url change, passing the top level `route` object.

The next piece in this arrangement is a router.  This is a class called `Route` and is instanciated with one required parameter and one 
optional parameter. The required parameter is a string containing "/" separated segments, which must either literally match the part of 
the url, or can start with a ":" character followed by a name, in which case we assume that that part of the url should be interpreted 
as a parameter.  We process a new `route` (however we receive it - either via the `connectUrl` callback, or being passed into a custom 
element via a property/attribute) by calling the `routeChange` method, this returns a `route` object which the part of the url segment 
checked against the specification provdied in the `new Route()` call. `route` has an `active` property to determine if it matched and 
a `params` property the value of any of the ":" segments. Any queryString is also decoded and placed in the `query` property of objects.

If the `active` propery of a route is false, the subRoute will also have an `active` value of false.  A `query` property is always passed 
straight through and it is up to the application to decided how and when to use it.

The optional second parameter to the `new Route()` call is a matching string for the previous route up the chain.  It consists of a string
which contains a single ":" character.  The left of the ":" character is a parameter name, and to the right a parameter value.  The incoming
route's `params` property must contain the "name" and it must have the value "value" for the subRoute to be active (as well as matching the url).

This is usually used with something like this
```
 const topLevel = new Route('/:page');
 const firstLevel = new Route('/:id', 'page:appointments');
 connectUrl(route => {
    const subRoute = topLevel.routeChange(route);
    if (subRoute.active) {
      ...

      const subSubRoute = firstLevel.routeChange(subRoute);
      if (subSubRoute.active) {
        readDatabaseRecord(subSubRoute.params.id)
      }
      ...
    }
 });
 
```
(I have simplified what happens - subRoute would probably be passed in as the `route` property to a custom element which might at some point want
read a database record based on id).

In this example we only want to read the (lets say) the appointment record from the database if the `<appointment-manager>` element had been activated
with a url of the form "/appointements/53" and not (say) when the url was "/user/53", when the `<user-manager>` element is in the dom and the `<appointment-manager>` is still in the dom, but not doing anything.  The other obvious question is why not do this:-

```
 const firstLevel = new Route('/appointments/:id');
 connectUrl(route => {
    const subRoute = topLevel.routeChange(route);
    if (subRoute.active) {
      ...

      const subSubRoute = firstLevel.routeChange(subRoute);
      if (subSubRoute.active) {
        readDatabaseRecord(subSubRoute.params.id)
      }
      ...
    }
 });

```
and the answer to that is that I have an element `<route-manager>` which in fact something like `<page-manager>` extends
which then allows me to do (in `lit-element`s `render` function)
```
    ${ {
      home: html`<app-home></app-home>`,
      user: html`<app-user managed-page .route=${this.subRoute}></app-user>
      appointments: html`<app-appointments managed-page .route=${this.subRoute}></app-appointments`
        }[this.page]
     }
```

The route manager users `new Route('/:page')` to translate the incoming `route` to the `page` property.

Internally the `Route` class uses a `route-changed` event which this overall module listens to on the window and this can be used to change the url.
the `Route` class has three properties that can be set and which can change the url.

- `connection` which if set `true` join the input and output of the route managed by this instance provided only that the route doesn't have any ":" segment,
   and change the url accordingly.  If set to `false` it will always make the output disconnected.
- `params` which when set with an object which maps the properties of an active `params` in the `subRoute` will change the url - so for instance in the example
   above calling `firstlevel.params = {id: 20}` will change the url to `/appointments/20`.
-  `query` we can set a query set of parameters and these will then change the url to have those query parameters.

Other modules that wish to change the url can do so, but they need to dispatch a `location-altered` event in the window. A helper 
class `LocationAltered` can generate it for you, so to change the location do:-
```
  history.pushState({}, null, '/user/23');
  window.dispatchEvent(new LocationAltered());
```





    
 


