'use strict';

(function (angular, buildfire) {
    angular.module('socialPluginWidget', ['ngRoute', 'ngAnimate', 'socialPluginFilters'])
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
                .when('/blocked-users', {
                    templateUrl: 'templates/blocked-users.html',
                    controllerAs: 'Blocked',
                    controller: 'BlockedUsersCtrl'
                })
                .when('/report', {
                    templateUrl: 'templates/report.html',
                    controllerAs: 'Report',
                    controller: 'ReportCtrl'
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
                    }
                    else {
                        $rootScope.showThread = true;
                        $location.path('/');
                        $rootScope.$digest();
                        buildfire.history.pop();
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
        }])
        .directive('stickyNavbar', function() {
            return {
                restrict: 'A',
                scope: {
                    scrollContainer: '@' // Bind the scroll container attribute
                },
                link: function(scope, element) {
                    const navbar = element[0];
                    let lastScrollTop = 0;
        
                    const throttle = function(func, limit) {
                        let lastFunc;
                        let lastRan;
                        return function() {
                            const context = this;
                            const args = arguments;
                            if (!lastRan) {
                                func.apply(context, args);
                                lastRan = Date.now();
                            } else {
                                clearTimeout(lastFunc);
                                lastFunc = setTimeout(function() {
                                    if ((Date.now() - lastRan) >= limit) {
                                        func.apply(context, args);
                                        lastRan = Date.now();
                                    }
                                }, limit - (Date.now() - lastRan));
                            }
                        };
                    };
        
                    const handleScroll = function() {
                        const scrollContainer = document.querySelector(scope.scrollContainer);
                        if (!scrollContainer) return;
                        
                        const scrollTop = scrollContainer.scrollTop;
                        if (scrollTop > lastScrollTop) {
                            const safeAreaTopValue = getComputedStyle(document.documentElement).getPropertyValue('--bf-safe-area-inset-top').trim();
                            if (parseFloat(safeAreaTopValue)) {
                                navbar.style.transform = 'translateY(calc(-150% - var(--bf-safe-area-inset-top)))';
                            }
                            else {
                                navbar.style.transform = 'translateY(-100%)';
                            }
                        } else {
                            // User is scrolling up
                            navbar.style.transform = 'translateY(0)';
                        }
                        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
                    };
        
                    const throttledHandleScroll = throttle(handleScroll, 200);
        
                    angular.element(document).ready(function () {
                        const scrollContainer = document.querySelector(scope.scrollContainer);
                        if (scrollContainer) {
                            scrollContainer.addEventListener('scroll', throttledHandleScroll);
                        }
        
                        // Clean up
                        scope.$on('$destroy', function() {
                            if (scrollContainer) {
                                scrollContainer.removeEventListener('scroll', throttledHandleScroll);
                            }
                        });
                    });
                }
            };
        });
        
        
        
        
        
})(window.angular, window.buildfire);