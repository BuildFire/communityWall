'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('socialPluginSettings', [
    'ngRoute',
]);
app.config(['$locationProvider', '$routeProvider', function ($locationProvider, $routeProvider) {
    //config for tag-input plugin

    $routeProvider.when('/', {
        templateUrl: 'views/mainSettings.html',
        controller: 'MainSettingsCtrl'
    }).otherwise({redirectTo: '/'});
}]);


