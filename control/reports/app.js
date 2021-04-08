'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('socialPluginSettings', [
    'ngRoute',
]).config(['$locationProvider', '$routeProvider', function ($locationProvider, $routeProvider) {

    $routeProvider.when('/', {
        templateUrl: 'views/reports.html',
        controller: 'ReportsCtrl'
    }).otherwise({redirectTo: '/'});
}]);
