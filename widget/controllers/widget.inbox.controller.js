'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('InboxCtrl', ['$scope', '$rootScope', '$routeParams', 'Buildfire', 'SubscribedUsersData', 'SocialItems', '$timeout', 'Location',
        function ($scope, $rootScope, $routeParams, Buildfire, SubscribedUsersData, SocialItems, $timeout, Location) {

            const Inbox = this;
            Inbox.threads = [];
            Inbox.showMore = false;
            Inbox.loading = true;
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
                // $scope.searchInput = "";
                Inbox.noResultsText = 'No messages yet!';
                Inbox.searchOptions.page = 0;
                Inbox.threads = [];
            }


            Inbox.searchInboxUsers =  () => {
                Inbox.searchOptions.filter = Inbox.searchOptions.filter? Inbox.searchOptions.filter : {};
                Inbox.searchOptions.filter['_buildfire.index.array1.string1'] = `userId_${Inbox.SocialItems.userDetails.userId}`;
                Inbox.searchOptions.filter['_buildfire.index.string1'] = { $ne: "" };
                Inbox.searchOptions.sort = {
                    "lastMessage.createdAt": -1
                };
                Buildfire.spinner.show();
                Inbox.loading = true;
                SubscribedUsersData.searchForUsers(Inbox.searchOptions, function (err, threads) {
                    if (err) return console.log(err);
                    if (threads.length === Inbox.searchOptions.pageSize) {
                        Inbox.searchOptions.page++;
                        Inbox.showMore = true;
                    } else if (threads.length === 0) {
                        Inbox.noResultsText = 'No messages yet!';
                    }
                    else {
                        Inbox.showMore = false;
                    }
                    const newData = []
                    for (let i = 0; i < threads.length; i++) {
                        const thread = threads[i];
                        let otherUserId = thread.userId === Inbox.SocialItems.userDetails.userId && thread.user2Id? thread.user2Id : thread.userId;

                        buildfire.auth.getUserProfile({ userId: otherUserId }, (err, loadUser) => { 
                            if (err) return console.error('User not found.');
                            
                            if (otherUserId !== Inbox.SocialItems.userDetails.userId) {
                                thread.userDetails = {
                                    firstName: loadUser ? loadUser.firstName : '',
                                    lastName: loadUser ? loadUser.lastName : '',
                                    displayName: loadUser ? loadUser.displayName : '',
                                    imageUrl: loadUser ? loadUser.imageUrl : '',
                                };
                            } else {
                                thread.userDetails = {
                                    firstName: '',
                                    lastName: '',
                                    displayName: '',
                                }
                            }

                            if (i === threads.length - 1) {
                                Inbox.threads = Inbox.threads.concat(threads);
                                Buildfire.spinner.hide();
                                Inbox.loading = false;
                                $scope.$digest();
                            }
                        })
                    }
                    
                })

            }

            let TIMEOUT_ID;
            $scope.onSearchChange = function () {
                // let isEmptySearch = ($scope.searchInput.length === 0);
                // let minSearchLength = 1;
                // if ($scope.searchInput.length === minSearchLength && !isEmptySearch) return;

                Inbox.searchOptions.filter = {
                    $or: [

                        { "$json.userDetails.displayName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.userDetails.firstName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.userDetails.lastName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.userDetails.email": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.user2Details.displayName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.user2Details.firstName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.user2Details.lastName": { $regex: $scope.searchInput, $options: 'i' } },
                        { "$json.user2Details.email": { $regex: $scope.searchInput, $options: 'i' } },
                    ]
                }
                clearTimeout(TIMEOUT_ID);
                TIMEOUT_ID = setTimeout(() => {
                    Inbox.loading = true;
                    $scope.clear();
                    Inbox.searchInboxUsers(Inbox.searchOptions);
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