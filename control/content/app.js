'use strict';

(function (angular) {
    angular.module('socialPluginContent', ['ngRoute','ui.bootstrap', 'infinite-scroll', 'socialModals', 'ui.tinymce', 'socialPluginFilters','angular-ladda'])
        //injected ngRoute for routing
        .config(['$routeProvider', '$httpProvider', function ($routeProvider, $httpProvider) {
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'ContentHome',
                    controller: 'ContentHomeCtrl'
                })
                .otherwise('/');

            var interceptor = ['$q', function ($q) {
                var counter = 0;
                return {

                    request: function (config) {
                        buildfire.spinner.show();
                        counter++;
                        return config;
                    },
                    response: function (response) {
                        counter--;
                        if (counter === 0) {
                            buildfire.spinner.hide();
                        }
                        return response;
                    },
                    responseError: function (rejection) {
                        counter--;
                        if (counter === 0) {
                            buildfire.spinner.hide();
                        }

                        return $q.reject(rejection);
                    }
                };
            }];

            $httpProvider.interceptors.push(interceptor);
        }])
        .filter('getUserImage', ['Buildfire', function (Buildfire) {
            return function (usersData, userId) {
                var userImageUrl = '';
                usersData.some(function (userData) {
                    if (userData.userObject._id == userId) {
                        userImageUrl = userData.userObject.imageUrl ? Buildfire.imageLib.cropImage(userData.userObject.imageUrl, {width:40,height:40}) : '';
                        return true;
                    }
                });
                return userImageUrl;
            }
        }])
        .directive("loadImage", [function () {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.attr("src", "../../../../styles/media/holder-" + attrs.loadImage + ".gif");

                    var elem = $("<img>");

                    elem[0].onload = function () {
                        element.attr("src", attrs.finalSrc);
                        elem.remove();
                    };
                    elem.attr("src", attrs.finalSrc);
                }
            };
        }]);
})(window.angular);
