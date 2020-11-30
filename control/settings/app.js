'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('socialPluginSettings', [
    'ngRoute',
    'ngTagsInput'
]);
app.config(['$locationProvider', '$routeProvider', 'tagsInputConfigProvider', function ($locationProvider, $routeProvider, tagsInputConfigProvider) {
    //config for tag-input plugin
    tagsInputConfigProvider.setActiveInterpolation('tagsInput', { minTags: true });

    $routeProvider.when('/', {
        templateUrl: 'views/mainSettings.html',
        controller: 'MainSettingsCtrl'
    }).otherwise({redirectTo: '/'});
}]);


