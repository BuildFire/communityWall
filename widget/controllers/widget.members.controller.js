'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('MembersCtrl', ['$scope', '$rootScope', '$routeParams', 'Buildfire', 'SubscribedUsersData', function ($scope, $rootScope, $routeParams, Buildfire, SubscribedUsersData) {

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
            
            Members.init = function () {
                $rootScope.showThread = false;
                Buildfire.history.push('Members');

                Buildfire.appearance.getAppTheme((err, obj) => {
                    if (err) return console.log(err);
                    document.getElementsByClassName("glyphicon")[0].style.setProperty("color", obj.colors.icons);
                });
                Buildfire.datastore.get("Social", (err, result) => {
                    if (err) return console.log(err);
                    if (result.data && result.data.appSettings)
                        Members.appSettings = result.data.appSettings;
                    console.log("REZULT", result)
                });
                Buildfire.datastore.get("languages", (err, result) => {
                    if (err) return console.log(err)
                    let strings = {};
                    if (result.data && result.data.screenOne)
                        strings = result.data.screenOne;
                    else
                        strings = stringsConfig.screenOne.labels;

                    let languages = {};
                    Object.keys(strings).forEach(e => {
                        strings[e].value ? languages[e] = strings[e].value : languages[e] = strings[e].defaultValue;
                    });
                    Members.languages = languages;
                    Members.noResultsText = languages.membersBlankState;
                });

                if ($routeParams.wallId === "home") Members.wallId = "";
                else Members.wallId = $routeParams.wallId;
                Buildfire.auth.getCurrentUser(function (err, user) {
                    if (err) return console.log(err);
                    Members.userDetails = user;
                    Buildfire.getContext((err, context) => {
                        if (err) return console.log(err);
                        Members.context = context;
                        SubscribedUsersData.getUsersWhoFollow(user._id, Members.wallId, function (err, users) {
                            if (err) return console.log(err);
                            Members.users = users;
                            console.log("MEMBERS", users)
                            $scope.$digest();
                        });
                    });
                });
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
                    '_buildfire.index.string1': Members.wallId,
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
                console.log("AAAAAAAA")
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
                    console.log("LOAD MORE", users)
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
                let wid = null;

                if (Members.userDetails._id && Members.userDetails._id != user.userId) {
                    if (Members.userDetails._id > user.userId)
                        wid = Members.userDetails._id + user.userId;
                    else
                        wid = user.userId + Members.userDetails._id;

                    Buildfire.history.push("Main Social Wall");
                    Buildfire.navigation.navigateTo({
                        pluginId: Members.context.pluginId,
                        instanceId: Members.context.instanceId,
                        title: Members.userDetails.displayName + ' | ' + user.userDetails.displayName,
                        queryString: 'wid=' + wid + "&wTitle=" + encodeURIComponent(Members.userDetails.displayName + ' | ' + user.userDetails.displayName)
                    });
                }
            };

            Members.init();
        }])
})(window.angular);