/**
    @licence
    Copyright (c) 2019 Alan Chandler, all rights reserved

    This file is part of PASv5, an implementation of the Patient Administration
    System used to support Accuvision's Laser Eye Clinics.

    PASv5 is licenced to Accuvision (and its successors in interest) free of royality payments
    and in perpetuity in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
    implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Accuvision
    may modify, or employ an outside party to modify, any of the software provided that
    this modified software is only used as part of Accuvision's internal business processes.

    The software may be run on either Accuvision's own computers or on external computing
    facilities provided by a third party, provided that the software remains soley for use
    by Accuvision (or by potential or existing customers in interacting with Accuvision).
*/


import Route from '../route.js';

let router;

describe('route', function() {
  beforeEach(function() {
    router = new Route('/:page');
  });
  afterEach(function() {
  });
  it('instantiates itself', function() {
    expect(router.constructor.name).toEqual('Route');
  });
  it('fails if route path does not start with /', function() {
    expect(router.routeChange.bind(
      router,
      {
        path: 'reports/',
        active: true,
        params: {},
        query: {},
        segment:0
      }
    )).toThrow();
  });
  it('match a simple route', async function() {
    const route = router.routeChange({path: '/reports', active: true, params: {}, query: {}, segment:0});
    expect(route).toStrictEqual(
      {path: '/', active: true, params: {page: 'reports'}, query: {}, segment:1});
  });
  it('match a segment only if ifMatched allows a match', function(){
    const router = new Route('/:page', 'section:management');
    const route  = router.routeChange({
      path: '/reports',
      active: true,
      params: {section: 'management'},
      query: {},
      segment:1
    });
    expect(route).toStrictEqual(
      {path: '/', active: true, params: {page: 'reports'}, query: {}, segment:2});
  });
  it('doesnt match if ifMatched shows wrong match', function() {
    const router = new Route('/:page','section:nonstandard');
    const route = router.routeChange({
      path: '/reports',
      active: true,
      params: {section: 'management'},
      query: {},
      segment:1
    });
    expect(route.active).toBeFalsy();
  });
  it('match home route', function() {
    const route = router.routeChange({path: '/', active: true, params: {}, query: {}, segment:0});
    expect(route).toStrictEqual(
      {path: '', active: true, params: {page: ''}, query: {}, segment:1});
  });
  it('passes remainder of path after match to out-route', function() {
    const route = router.routeChange({path: '/reports/bydate', active: true, params: {}, query: {}, segment:0});
    expect(route.path).toEqual('/bydate');
  });
  it('out route not active unless in-route active', function() {
    const route = router.routeChange({path: '/reports', active: false, params: {}, query: {}, segment:0});
    expect(route.active).toBeFalsy();
  });
  it('out route path has no "/" if match has trailing "/"', function() {
    const router = new Route('/:page/');
    const route = router.routeChange({path: '/reports', active: true, params: {}, query: {}, segment: 0});
    expect(route.path).toEqual('');
  });
  it('in route with empty string for path will not match', function() {
    const route = router.routeChange({path: '', active: true, params: {}, query: {}, segment: 0});
    expect(route.active).toBeFalsy();
  });
  it('if matched parameter is all digits, params provides a number', function() {
    const route = router.routeChange({path: '/20160101/staff', active: true, params: {}, query: {}, segment:0});
    expect(route.params.page).toEqual(20160101);
    expect(route.params.page).not.toEqual('20160101');
  });
  it('if matched parameter is all digits with a leading minus, params provides a number', function() {
    const route = router.routeChange({path: '/-500/staff', active: true, params: {}, query: {}, segment: 0});
    expect(route.params.page).toEqual(-500);
    expect(route.params.page).not.toEqual('-500');
  });
  it('if matched parameter is all digits and non leading minus, params provides a string', function() {
    let route = router.routeChange({path: '/5-01/staff', active: true, params: {}, query: {}, segment: 0});
    expect(route.params.page).not.toEqual(501);
    expect(route.params.page).not.toEqual(-501);
    expect(route.params.page).toEqual('5-01');
    route = router.routeChange({path: '/staff', active: true, params: {}, query: {}, segment: 0});
    expect(route.params.page).toEqual('staff');
  });
  it('query parameters passed downwards', function() {
    const route = router.routeChange({
      path: '/reports',
      active: true,
      params: {},
      query: {date: '20160101'},
      segment:0
    });
    expect(route.query).toEqual({date: '20160101'});
  });
  describe('virtual query param and connection setters generate events', function() {
    let location;
    function routeUpdated(e) {
      location = e.detail;
    }
    beforeEach(function(){
      location = {};
      window.addEventListener('route-changed', routeUpdated);
    });
    afterEach(function() {
      window.removeEventListener('route-changed', routeUpdated);
    });
    it('query parameters passed upwards provided outRoute is active', function() {
      router.routeChange({path: '/reports', active: true, params: {}, query: {}, segment: 0});
      router.query = {date: '20161231'};
      expect(location.query).toEqual({date: '20161231'});
      expect(location.path).not.toBeDefined();
    });
    it('query parameters not passed upwards if outRoute Not Active', function() {
      router.query = {date: '20161231'};
      expect(location.query).not.toBeDefined();
    });
    describe('parameter setter', function() {
      beforeEach(function() {
        router.routeChange({path: '/reports/bydate', active: true, params: {}, query: {}, segment: 0});
      });
      it('changes in parameters effect in-route path', function() {
        router.params = {page: 'query'};
        expect(location.segment).toEqual(0);
        expect(location.path).toEqual('/query/bydate');
      });
      it('changes to a single parameter effect in-route path', function() {
        const router = new Route('/:page/:sub');
        router.routeChange({path: '/reports/bydate', active: true, params: {}, query: {}, segment: 0});
        router.params =  {page:'query'};
        expect(location.path).toEqual('/query/bydate');
      });
      it('first optional parameters to \'\' will result in inRoute path of /', async function() {
        const router = new Route('/:page/:sub');
        router.routeChange({path: '/reports/bydate', active: true, params: {}, query: {}, segment: 0});
        router.params = {page: ''};
        expect(location.path).toEqual('/');
      });
      it('early optional parameters kept in path if latter empty', function() {
        const router = new Route('/:page/:sub');
        router.routeChange({path: '/reports/bydate', active: true, params: {}, query: {}, segment: 0});
        router.params = {sub: ''};
        expect(location.path).toEqual('/reports');
      });
      it('first optional paramters to null will result in inRoute path of /', function() {
        router.params = {page: null};
        expect(location.path).toEqual('/');
      });
      it('not passing a string, number or null as a parameter key, will throw an error', function() {
        expect(() => {
          router.params = {page: {}};
        }).toThrow();
      });
    });
    describe('connections setter', function() {
      beforeEach(function() {
        router = new Route('/full');
      });
      it('if preroute is not active, nothing happens', function() {
        router.routeChange({path: '/reports', active: false, params: {}, query: {}, segment:0});
        router.connection = true;
        expect(location).toEqual({});
        router.connection = false;
        expect(location).toEqual({});
      });
      it('if outroute is active and we request active nothing happens', function() {
        router.routeChange({path: '/full', active: true, params: {}, query: {}, segment:0});
        router.connection = true;
        expect(location).toEqual({});
      });
      it('if outroute is not active and we request active, it generates a new location', function() {
        router.routeChange({path: '/empty', active: true, params: {}, query: {}, segment:0});
        router.connection = true;
        expect(location).toEqual({path:'/full', segment:0});
      });
      it('if outroute is not active and we request not active nothing happens', function() {
        router.routeChange({path: '/empty', active: true, params: {}, query: {}, segment:0});
        router.connection = false;
        expect(location).toEqual({});
      });
      it('if outroute is active and we request it not active it generates a new location', function() {
        router.routeChange({path: '/full', active: true, params: {}, query: {}, segment:0});
        router.connection = false;
        expect(location).toEqual({path:'/', segment:0});

      });
    });
  });

});
