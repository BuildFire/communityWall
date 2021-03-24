'use strict';

(function (angular, buildfire) {
    angular.module('socialPluginWidget', ['ngRoute', 'ngAnimate', 'socialModals', 'socialPluginFilters'])
        .config(['$routeProvider', '$compileProvider', '$httpProvider', function ($routeProvider, $compileProvider, $httpProvider) {

            /**
             * To make href urls safe on mobile
             */
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|cdvfile|file):/);


            $routeProvider
                .when('/', {
                    template: '<div></div>'
                })
                .when('/thread/:threadId', {
                    templateUrl: 'templates/thread.html',
                    controllerAs: 'Thread',
                    controller: 'ThreadCtrl'
                })
                .when('/members/:wallId', {
                    templateUrl: 'templates/members.html',
                    controllerAs: 'Members',
                    controller: 'MembersCtrl'
                })
                .otherwise('/');

            var interceptor = ['$q', function ($q) {

                return {

                    request: function (config) {
                        console.log('config-------------------------', config);
                        if (!config.silent && config.url.indexOf('threadLikes') == -1 && config.url.indexOf('thread/add') == -1 && config.url.indexOf('Image/upload') == -1) {
                            //buildfire.spinner.show();
                        }
                        return config;
                    },
                    response: function (response) {
                        buildfire.spinner.hide();
                        return response;
                    },
                    responseError: function (rejection) {
                        buildfire.spinner.hide();
                        return $q.reject(rejection);
                    }
                };
            }];

            $httpProvider.interceptors.push(interceptor);
        }])
        .run(['$location', '$rootScope', 'Location', 'Buildfire', function ($location, $rootScope, Location, Buildfire) {
             var goBack = buildfire.navigation.onBackButtonClick;

            buildfire.navigation.onBackButtonClick = function () {
                buildfire.history.get({
                    pluginBreadcrumbsOnly: true
                }, function (err, result) {
                    console.log("BACK BUTTON CLICK", result)
                    if(!result.length) return goBack();
                    if(result[result.length-1].options.isPrivateChat) {
                        console.log("PRIVATE CHAT BACK BUTTON")
                        result.map(item => buildfire.history.pop());
                        $rootScope.showThread = true;
                        $location.path('/');
                        $rootScope.$broadcast("navigatedBack");
                        //location.reload();
                    }
                    else {
                         if(result[0].label === 'thread' || result[0].label === 'members') {
                            $rootScope.showThread = true;
                            $location.path('/');
                            $rootScope.$digest();
                            buildfire.history.pop();
                        } 
                    }
                });
            }
        }])
        .directive('handlePhoneSubmit', function () {
            return function (scope, element, attr) {
                var textFields = $(element).children('textarea[name="text"]');
                $(element).submit(function () {
                    console.log('form was submitted');
                    textFields.blur();
                });
            };
        })
        .filter('getUserImage', ['Buildfire', function (Buildfire) {
            filter.$stateful = true;
            function filter(usersData, userId) {
                var userImageUrl = '';
                usersData.some(function (userData) {
                    if (userData.userObject._id == userId) {
                        if (userData.userObject.imageUrl) {
                            userImageUrl = userData.userObject.imageUrl;
                        } else {
                            userImageUrl = '';
                        }
                        return true;
                    }
                });
                return userImageUrl;
            }
            return filter;
        }])
        .directive("loadImage", function () {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.attr("src", "../../../styles/media/holder-" + attrs.loadImage + ".gif");

                    if (attrs.imgType && attrs.imgType.toLowerCase() == 'local') {
                        replaceImg(attrs.finalSrc);
                        return;
                    }

                    attrs.$observe('finalSrc', function () {
                        var _img = attrs.finalSrc;

                        if (attrs.cropType == 'resize') {
                            buildfire.imageLib.local.resizeImage(_img, {
                                width: attrs.cropWidth,
                                height: attrs.cropHeight
                            }, function (err, imgUrl) {
                                _img = imgUrl;
                                replaceImg(_img);
                            });
                        } else {
                            buildfire.imageLib.local.cropImage(_img, {
                                width: attrs.cropWidth,
                                height: attrs.cropHeight
                            }, function (err, imgUrl) {
                                _img = imgUrl;
                                replaceImg(_img);
                            });
                        }
                    });

                    function replaceImg(finalSrc) {
                        var elem = $("<img>");
                        elem[0].onload = function () {
                            element.attr("src", finalSrc);
                            elem.remove();
                        };
                        elem.attr("src", finalSrc);
                    }
                }
            };
        })
        .directive('onTouchend', [function () {
            return function (scope, element, attr) {
                element.on('touchend', function (event) {
                    scope.$apply(function () {
                        scope.$eval(attr.onTouchend);
                    });
                });
            };
        }]);
})(window.angular, window.buildfire);