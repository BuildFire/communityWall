'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('MembersCtrl', ['$scope', '$rootScope', '$routeParams', 'Buildfire', 'SubscribedUsersData', 'SocialItems', function ($scope, $rootScope, $routeParams, Buildfire, SubscribedUsersData, SocialItems) {

            var Members = this;
            Members.userDetails = {};
            Members.users = [];
            Members.wallId = null;
            Members.showMore = false;
            Members.noResultsText = null;
            Members.searchOptions = {
                pageSize: 50,
                page: 0
            }
            Members.context = null;
            Members.languages = null;
            Members.appSettings = null;
            Members.SocialItems = SocialItems.getInstance();
            console.log("EEEEEEEEEEE", Members.SocialItems)
            $scope.getUserName = function (userDetails) {
                let name = null;
                if (userDetails.displayName !== 'Someone'
                    && userDetails.displayName) {
                    name = userDetails.displayName;
                }
                else if (userDetails.firstName !== 'Someone' &&
                    userDetails.firstName && userDetails.lastName)
                    name = userDetails.firstName + ' ' + userDetails.lastName;
                else name = 'Someone';
                return name;
            }
            Members.init = function () {
                $rootScope.showThread = false;
                Buildfire.history.push('Members');

                Buildfire.appearance.getAppTheme((err, obj) => {
                    if (err) return console.log(err);
                    document.getElementsByClassName("glyphicon")[0].style.setProperty("color", obj.colors.icons);
                });

                Members.appSettings = Members.SocialItems.appSettings;
                Members.languages = Members.SocialItems.languages.membersBlankState;
                console.log("REZULT", Members.SocialItems.languages.membersBlankState)
 
                if ($routeParams.wallId === "home") Members.wallId = "";
                else Members.wallId = $routeParams.wallId;
                Members.SocialItems.authenticateUser(null, (err, user) => {
                    if (err) return console.error("Getting user failed.", err);
                    console.log(user);
                    if(user) {
                        SubscribedUsersData.getUsersWhoFollow(user._id, Members.wallId, function (err, users) {
                            if (err) return console.log(err);
                            Members.users = users;
                            console.log("MEMBERS", users)
                            $scope.$digest();
                        });
                    }
                });
                // Buildfire.auth.getCurrentUser(function (err, user) {
                //     if (err) return console.log(err);
                //     Members.userDetails = user;
                //     Buildfire.getContext((err, context) => {
                //         if (err) return console.log(err);
                //         Members.context = context;
                //         SubscribedUsersData.getUsersWhoFollow(user._id, Members.wallId, function (err, users) {
                //             if (err) return console.log(err);
                //             Members.users = users;
                //             console.log("MEMBERS", users)
                //             $scope.$digest();
                //         });
                //     });
                // });
            }

            $scope.clear = function () {
                $scope.searchInput = "";
                Members.noResultsText = Members.languages.membersBlankState;
                Members.searchOptions.page = 0;
                SubscribedUsersData.getUsersWhoFollow(Members.userDetails._id, Members.wallId, function (err, users) {
                    if (err) return console.log(err);
                    Members.users = users;
                    $scope.$digest();
                });
            }

            $scope.onSearchChange = function () {
                let isEmptySearch = ($scope.searchInput.length === 0);
                let minSearchLength = 1;

                if ($scope.searchInput.length === minSearchLength && !isEmptySearch) return;

                Members.searchOptions.filter = {
                    '_buildfire.index.string1': Members.wallId ? Members.wallId : { "$eq": "" },
                    $or: [
                        { "$json.userDetails.displayName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.userDetails.email": { $regex: $scope.searchInput, $options: 'i' } },
                    ]
                }
                Members.searchOptions.page = 0;

                Members.executeSearch(Members.searchOptions);
            };

            Members.executeSearch = function (query) {
                Buildfire.spinner.show();
                SubscribedUsersData.searchForUsers(query, function (err, users) {
                    if (err) return console.log(err);
                    if (users.length === Members.searchOptions.pageSize) {
                        Members.searchOptions.page++;
                        Members.showMore = true;
                    }
                    else if (users.length === 0) {
                        Members.noResultsText = Members.languages.membersNoResults;
                    }
                    else {
                        Members.showMore = false;
                    }
                    Members.users = users;
                    Buildfire.spinner.hide();
                    $scope.$digest();
                })
            }

            Members.loadMore = function () {
                SubscribedUsersData.searchForUsers(Members.searchOptions, function (err, users) {
                    if (err) return console.log(err);
                    users.map(user => {
                        Members.users.push(user)
                    })
                    if (users.length === Members.searchOptions.pageSize) {
                        Members.searchOptions.page++;
                        Members.showMore = true;
                    } else {
                        Members.showMore = false;
                    }
                    $scope.$digest();
                });
            }


            Buildfire.datastore.onUpdate(function (response) {
                if (response.tag === "languages") {
                    let languages = {};
                    Object.keys(response.data.screenOne).forEach(e => {
                        response.data.screenOne[e].value ? languages[e] = response.data.screenOne[e].value : languages[e] = response.data.screenOne[e].defaultValue;
                    });
                    Members.languages = languages;
                    Members.noResultsText = languages.membersBlankState;
                    $scope.$digest();
                }
                else if (response.tag === "Social") {
                    Members.appSettings = response.data.appSettings;
                    $scope.$digest();
                }
            });

            Members.openPrivateChat = function (user) {
                if (Members.appSettings && Members.appSettings.disablePrivateChat) return;
                Members.SocialItems.authenticateUser(null, (err, userData) => {
                    if (err) return console.error("Getting user failed.", err);
                    console.log("AAAAAAAAAAAAAAAAAAAAAAAAA", user, Members.SocialItems.userDetails.userId);
                    if(userData) {
                        let wid = null;

                        if (Members.SocialItems.userDetails.userId && Members.SocialItems.userDetails.userId 
                            != user.userId) {
                            if (Members.SocialItems.userDetails.userId > user.userId)
                                wid = Members.SocialItems.userDetails.userId + user.userId;
                            else
                                wid = user.userId + Members.SocialItems.userDetails.userId;
                            console.log("WALL ID", wid);
                            buildfire.dialog.alert({
                                title: "Access Denied!",
                                subtitle: "Operation not allowed!",
                                message: wid
                            });
                            Buildfire.history.push("Main Social Wall");
                            Buildfire.navigation.navigateTo({
                                pluginId: Members.SocialItems.context.pluginId,
                                instanceId: Members.SocialItems.context.instanceId,
                                title: $scope.getUserName(Members.SocialItems.userDetails) + ' | ' + $scope.getUserName(user.userDetails),
                                queryString: 'wid=' + wid + "&wTitle=" + encodeURIComponent($scope.getUserName(Members.SocialItems.userDetails) + ' | ' + $scope.getUserName(user.userDetails))
                            });
                        }
                    }
                });
            };

            Members.init();
        }])
})(window.angular);