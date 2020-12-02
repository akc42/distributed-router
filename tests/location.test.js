/**
@licence
    Copyright (c) 2020 Alan Chandler, all rights reserved

    This file is part of Distribted Router.

    Distribted Router is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Distribted Router is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Distribted Router.  If not, see <http://www.gnu.org/licenses/>.
*/




import {connectUrl, disconnectUrl} from '../location.js';


let originalLocation, route;

const testFunctions = {
  setLocation: function (url) {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new CustomEvent('location-altered', {bubbles: true, composed: true}));
  },
  routeChanged: function (r) {
    route = r;
  }
};


describe('location module', function() {
  let spy;
  beforeEach(function() {

    originalLocation = window.location.href;
    spy = jest.spyOn(testFunctions, 'routeChanged');
  });
  afterEach(function() {
    spy.mockRestore();
    window.history.replaceState({}, '', originalLocation);
  });
  describe('connectUrl', function() {
    it('adds event listeners for various events', function() {

      const el = jest.spyOn(window, 'addEventListener');
      connectUrl(testFunctions.routeChanged);
      expect(el).toHaveBeenCalledWith('popstate',expect.anything());
      expect(el).toHaveBeenCalledWith('hashchange', expect.anything());
      expect(el).toHaveBeenCalledWith('location-altered', expect.anything());
      expect(el).toHaveBeenCalledWith('route-changed', expect.anything());
      expect(el.mock.calls[1][1]).toEqual(el.mock.calls[0][1]);
      expect(el.mock.calls[2][1]).toEqual(el.mock.calls[0][1]);
      el.mockRestore();
    });
    it('calls the callback function after Promise.resolving', async function() {
      connectUrl(testFunctions.routeChanged);
      expect(spy).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(testFunctions.routeChanged).toHaveBeenCalled();;
    });
  });
  describe('Responding to location-changed events', function(){
    beforeEach(async function() {
      connectUrl(testFunctions.routeChanged);
      await Promise.resolve();
    });

    it('calls the callback function with route with current path ', function(){
      testFunctions.setLocation('/test');
      expect(route.path).toEqual('/test');
      expect(route.active).toBeTruthy();
      expect(route.segment).toEqual(0);
    });
    it('expect search string changes to reflect in route', function() {
      testFunctions.setLocation('/test?date=20160101&staff=2');
      expect(route.query).toEqual({date: 20160101, staff: 2});
    });
    it('reflect changes to route path to url', function() {
      window.dispatchEvent(new CustomEvent('route-changed',{bubbles: true, composed: true, detail:{
        segment: 0,
        path: '/reports/bydate/20161231'
      }}));
      expect(window.location.pathname).toEqual('/reports/bydate/20161231');
    });
    it('reflect query string changes to route.query', function() {
      window.dispatchEvent(new CustomEvent('route-changed',{bubbles: true, composed: true, detail:{
        query:{firstname: 'Joe', lastname: 'Bloggs'}
      }}));
      expect(window.location.search).toEqual('?firstname=Joe&lastname=Bloggs');
    });
    it('setting query to null object in route should clear query string', function() {
      window.dispatchEvent(new CustomEvent('route-changed',{bubbles: true, composed: true, detail:{
        query:{firstname: 'Joe', lastname: 'Bloggs'}
      }}));
      window.dispatchEvent(new CustomEvent('route-changed',{bubbles: true, composed: true, detail:{
        query:{}
      }}));
      expect(window.location.search).toEqual('');
    });

  });
  it('disconnectUrl disconnects from all the events', function() {
    const el = jest.spyOn(window, 'removeEventListener');
    disconnectUrl();
    expect(el).toHaveBeenCalledWith('popstate', expect.anything());
    expect(el).toHaveBeenCalledWith('hashchange', expect.anything());
    expect(el).toHaveBeenCalledWith('location-altered', expect.anything());
    expect(el).toHaveBeenCalledWith('route-changed', expect.anything());
  });

});
