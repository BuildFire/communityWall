'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('reportCtrl', ['$scope', '$routeParams', 'SocialDataStore', 'Modals', 'Buildfire', '$rootScope', 'Location', 'EVENTS', 'GROUP_STATUS', 'MORE_MENU_POPUP', 'FILE_UPLOAD', '$modal', 'SocialItems', '$q', '$anchorScroll', '$location', '$timeout', 'Util', 'SubscribedUsersData', function ($scope, $routeParams, SocialDataStore, Modals, Buildfire, $rootScope, Location, EVENTS, GROUP_STATUS, MORE_MENU_POPUP, FILE_UPLOAD, $modal, SocialItems, $q, $anchorScroll, $location, $timeout, util, SubscribedUsersData) {
            var data = JSON.parse(decodeURIComponent($routeParams.data));
            console.log(data); // {name: 'John Doe', age: 30, occupation: 'Developer'}
        
        }])
})(window.angular);
