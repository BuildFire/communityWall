'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('InboxCtrl', ['$scope', '$rootScope', '$routeParams', 'Buildfire', 'SubscribedUsersData', 'SocialItems', '$timeout', 'Location',
        function ($scope, $rootScope, $routeParams, Buildfire, SubscribedUsersData, SocialItems, $timeout, Location) {

            const Inbox = this;
            Inbox.userDetails = {};
            Inbox.users = [];
            Inbox.showMore = false;
            Inbox.noResultsText = null;
            Inbox.searchOptions = {
                pageSize: 50,
                page: 0
            }
            Inbox.context = null;
            Inbox.languages = null;
            Inbox.appSettings = null;
            Inbox.SocialItems = SocialItems.getInstance();

            Inbox.init = function () {
                $rootScope.showThread = false;

                Buildfire.appearance.getAppTheme((err, obj) => {
                    if (err) return console.log(err);
                    // document.getElementsByClassName("glyphicon")[0].style.setProperty("color", obj.colors.icons);
                });

                Inbox.appSettings = Inbox.SocialItems.appSettings;
                Inbox.languages = Inbox.SocialItems.languages;

                Inbox.SocialItems.authenticateUser(null, (err, user) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (user) {
                        Inbox.searchInboxUsers();
                    }
                });
            }

            $scope.clear = function () {
                $scope.searchInput = "";
                Inbox.noResultsText = Inbox.languages.membersBlankState;
                Inbox.searchOptions.page = 0;
            }


            Inbox.searchInboxUsers =  () => {
                Inbox.searchOptions.filter = Inbox.searchOptions.filter? Inbox.searchOptions.filter : {}
                Inbox.searchOptions.filter['_buildfire.index.array1.string1'] = `userId_${Inbox.SocialItems.userDetails.userId}`
                Inbox.searchOptions.sort = {
                    "lastMessage.createdAt": -1
                }
                Buildfire.spinner.show();
                SubscribedUsersData.searchForUsers(Inbox.searchOptions, function (err, users) {
                    if (err) return console.log(err);
                    if (users.length === Inbox.searchOptions.pageSize) {
                        Inbox.searchOptions.page++;
                        Inbox.showMore = true;
                    } else if (users.length === 0) {
                        Inbox.noResultsText = Inbox.languages.membersNoResults;
                    }
                    else {
                        Inbox.showMore = false;
                    }
                    for (const user of users) {
                        if (user.userId === Inbox.SocialItems.userDetails.userId) {
                            user.userDetails = user.user2Details? {...user.user2Details} : {
                                firstName: '',
                                lastName: '',
                                displayName: '',
                            }
                        }
                    }
                    Inbox.users = Inbox.users.concat(users);
                    Buildfire.spinner.hide();
                    $scope.$digest();
                })

            }

            let TIMEOUT_ID;
            $scope.onSearchChange = function () {
                let isEmptySearch = ($scope.searchInput.length === 0);
                let minSearchLength = 1;
                if ($scope.searchInput.length === minSearchLength && !isEmptySearch) return;

                Inbox.searchOptions.filter = {
                    $or: [

                        { "$json.userDetails.displayName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.userDetails.firstName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.userDetails.lastName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.userDetails.email": { $regex: $scope.searchInput, $options: 'i' } },
                    ]
                }
                Inbox.searchOptions.page = 0;
                clearTimeout(TIMEOUT_ID);
                setTimeout(() => {
                    $scope.searchInboxUsers(Inbox.searchOptions);
                }, 300)
            };

            Inbox.navigateToPrivateChat = function (user) {
                // buildfire.history.get({
                //     pluginBreadcrumbsOnly: true
                // }, function (err, result) {
                //     result.forEach(e=> buildfire.history.pop());
                // });
                
                Inbox.SocialItems.isPrivateChat = true;
                Inbox.SocialItems.wid = user.wallId;
                Inbox.SocialItems.showMorePosts = true;
                Inbox.SocialItems.pageSize = 20;
                Inbox.SocialItems.page = 0;
                Inbox.SocialItems.pluginTitle = Inbox.SocialItems.getUserName(user.userDetails);

                $timeout(function(){
                    $rootScope.isPrivateChat = true;
                    Location.go("#/PrivateChat",{isPrivateChat: true});
                })
            }


            Inbox.getLocalTime = function (lastMessage) {
                if (!lastMessage) return ''

                const date = new Date(lastMessage.createdAt);
                return date.getHours() + ':' + date.getMinutes();
            }

            Buildfire.datastore.onUpdate(function (response) {
                if (response.tag === "languages") {
                    let languages = {};
                    Object.keys(response.data.screenOne).forEach(e => {
                        response.data.screenOne[e].value ? languages[e] = response.data.screenOne[e].value : languages[e] = response.data.screenOne[e].defaultValue;
                    });
                    Inbox.languages = languages;
                    Inbox.noResultsText = languages.membersBlankState;
                    $scope.$digest();
                }
                else if (response.tag === "Social") {
                    Inbox.appSettings = response.data.appSettings;
                    $scope.$digest();
                }
            });




            Inbox.init();
        }])
})(window.angular);