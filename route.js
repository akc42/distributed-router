/**
@licence
    Copyright (c) 2020 Alan Chandler, all rights reserved

    This file is part of Distributed Router.

    Distributed Router is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Distributed Router is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Distributed Router.  If not, see <http://www.gnu.org/licenses/>.
*/


export default class Route  {
  constructor(match = '', ifmatched = '') {
    //set default values
    this.preroute = {active: false, segment: 0, path: '', params: {}, query: {}};
    if (ifmatched.length > 0) {
      this.matcher = ifmatched.split(':');
      if (this.matcher.length !== 2) throw new Error('pas-route: Invalid ifmatched String');
    } else {
      this.matcher = [];
    }
    this.match = match;
    //this is our output
    this._route = {active: false, segment: 0, path: '', params: {}, query: {}};
    this.sentRouteChanged = false;

  }

  routeChange(preroute) {
    this.preroute = preroute; //remember it
    if (preroute !== undefined && preroute.active && preroute.path.length > 0 &&
      this._ifMatches(preroute.params) ) {
      if (this.match.length > 0) {
        let completed = false;
        if (this.match.slice(-1)  === '/') {
          completed = true;  //Special meaning
          if (this.match.length > 1) {
            this.match = this.match.slice(0,-1);
          }
        }
        const matchedPieces = this.match.split('/');
        if (matchedPieces[0] === '') matchedPieces.shift();  //not interested in blank front

        const urlPieces = preroute.path.split('/');
        if (urlPieces.length < 2 || urlPieces[0] !== '') {
          //something is wrong with path as it should have started with a '/'
          this._route.active = false;
          throw new Error('Route: Invalid path (should start with /) in route');
        }

        urlPieces.shift();
        let j = urlPieces.length;
        const newRoute = {
          segment: preroute.segment + matchedPieces.length,
          params: {},
          active: true,
          query: preroute.query
        };
        for(let i = 0; i < matchedPieces.length; i++) {
          if (j <= 0)  {
            return this._clearOutActive();
          }
          let segment = urlPieces.shift();
          j--;
          if (matchedPieces[i].length !== 0) {
            if (matchedPieces[i].substring(0,1) === ':') {
              const key = matchedPieces[i].substring(1);
              if (key.length > 0) {
                if (/^-?\d+$/.test(segment)) {
                  segment = parseInt(segment,10);
                }
                newRoute.params[key] = segment;
              } else {
                throw new Error('Route: Match pattern missing parameter name');
              }
            } else if (matchedPieces[i] !== segment) {
              return this._clearOutActive();
            }
          } else if (segment.length > 0 ){
            return this._clearOutActive();
          }
        }
        if (completed || preroute.path === '/') {
          newRoute.path = '';
        } else if (j == 0) {
          newRoute.path = '/';
        } else {
          newRoute.path = '/' + urlPieces.join('/');
        }
        if (!this._route.active ||
          JSON.stringify(this._route.params) !== JSON.stringify(newRoute.params) ||
          JSON.stringify(this._route.query) !== JSON.stringify(newRoute.query) ||
          this._route.path !== newRoute.path || this._route.segment !== newRoute.segment) {
          this._route =  newRoute;
          this.sentRouteChanged = true;
        }
      } else {
        throw new Error('Route: Match String Required');
      }
    } else {
      this._clearOutActive();
    }
    return this._route;
  }
  /*
  * set new paramters provided route is active
  */
  set params(value) {
    if (this._route.active) {
      let match = this.match;
      if (match.slice(-1)  === '/' && match.length > 1) match = this.match.slice(0,-1);
      const matchedPieces = match.split('/');
      if (matchedPieces[0] === '') matchedPieces.shift();  //not interested in blank front

      let urlPieces = this.preroute.path.split('/');
      urlPieces.shift();  //loose blank front
      let changeMade = false;
      for (let i = 0; i < matchedPieces.length; i++) {
        if (urlPieces.length < i) urlPieces.push(''); //ensure there is a url segment for this match
        if (matchedPieces[i].length !== 0) {
          if (matchedPieces[i].substring(0,1) === ':') {
            const key = matchedPieces[i].substring(1);
            if (value[key] !== undefined) {
              if (Number.isInteger(value[key])) {
                if (urlPieces[i] !== value[key].toString()) {
                  urlPieces[i] = value[key].toString();
                  changeMade = true;
                }
              } else if (typeof value[key] === 'string') {
                if (value[key].length > 0) {
                  if (urlPieces[i] !== value[key]) {
                    urlPieces[i] = value[key];
                    changeMade = true;
                  }
                } else {
                  //terminate url here
                  urlPieces.length = i;
                  changeMade = true;
                  break;
                }
              } else if (value[key] === null) {
                //terminate url here
                urlPieces.length = i;
                changeMade = true;
                break;
              } else {
                throw new Error('Route: Invalid params.' + key + ' provided (should be a String or an Integer)');
              }
            }
          }
        }
      }
      if (changeMade) {
        window.dispatchEvent(new CustomEvent ('route-changed',{bubbles: true, composed: true, detail:{
          segment: this.preroute.segment,
          path: '/' + urlPieces.join('/')
        }}));
      }
    }
  }
  /*
   *  Set a new query value provided route is active
   */
  set query(value) {
    if (this._route.active && JSON.stringify(this._route.query) !== JSON.stringify(value)) {
      window.dispatchEvent(new CustomEvent('route-changed',{bubbles: true, composed: true, detail:{query: value}}));
    }
  }
  /*
   * We can set or break the connection between a pre-route and its route
   */
  set connection(value) {
    if (this.preroute.active) {
      if (this._route.active) {
        if (value) return; //can't set a matched route active
        //just reset to a url
        window.dispatchEvent(new CustomEvent('route-changed', { bubbles: true, composed: true, detail:{
          segment: this.preroute.segment,
          path: '/'
        }}));
      } else {
        if (value) {
          let match = this.match;
          if (match.slice(-1)  === '/' && match.length > 1) match = this.match.slice(0,-1);
          const matchedPieces = match.split('/');
          if (matchedPieces[0] === '') matchedPieces.shift();  //not interested in blank front
          if (matchedPieces.length < 1) return;
          if (matchedPieces.every(piece => piece.length > 0 && piece.indexOf(':') < 0)) {
            window.dispatchEvent(new CustomEvent('route-changed', {bubbles: true, composed: true, detail:{
              segment: this.preroute.segment,
              path: '/' + matchedPieces.join('/')
            }}));

          }
        }
      }
    }
  }

  _ifMatches (params) {
    if (this.matcher.length === 0) return true;  //Empty String always matches
    return (params[this.matcher[0]] !== undefined && params[this.matcher[0]] === this.matcher[1]);
  }
  _clearOutActive () {
    if (this._route === undefined) return;
    if (this._route.active || !this.sentRouteChanged) {
      this._route = Object.assign({}, this._route, {active:false});
      this.sentRouteChanged = true;
    }
    return this._route;
  }
}

