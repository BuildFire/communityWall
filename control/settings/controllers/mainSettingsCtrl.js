/**
 * Created by ahmadfhamed on 2/5/2017.
 */
app.controller('MainSettingsCtrl', ['$scope', function ($scope) {
    var _pluginData = {
        data: {}
    };

    //init tags = [] to avoid on-tag-added bug https://github.com/mbenford/ngTagsInput/issues/622
    $scope.data = {
        mainThreadUserTags: [],
        sideThreadUserTags: []
    };

    var load = function () {
        var editor = new buildfire.components.actionItems.sortableList("#actions");
        buildfire.datastore.get('Social', function (err, result) {
            if (err) {
                console.error('App settings -- ', err);
            } else {
                if (result && result.data) {
                    _pluginData = result;
                    if (result.data.appSettings) {
                        if (!result.data.appSettings.mainThreadUserTags) {
                            result.data.appSettings.mainThreadUserTags = [];
                        }
                        if (!result.data.appSettings.sideThreadUserTags) {
                            result.data.appSettings.sideThreadUserTags = [];
                        }
                        if (result.data.appSettings.actionItem) {
                            let items = [];
                            items.push(result.data.appSettings.actionItem);
                            editor.loadItems(items);
                        }
                        if (typeof (result.data.appSettings.showMembers) == 'undefined') {
                            result.data.appSettings.showMembers = true;
                        }
                        if (typeof (result.data.appSettings.allowCommunityFeedFollow) == 'undefined') {
                            result.data.appSettings.allowCommunityFeedFollow = false;
                        }
                        if (typeof (result.data.appSettings.seeProfile) == 'undefined') {
                            result.data.appSettings.seeProfile = false;
                        }
                        if (typeof (result.data.appSettings.allowAutoSubscribe) == 'undefined') {
                            result.data.appSettings.allowAutoSubscribe = true;
                        }
                        if (typeof (result.data.appSettings.allowChat) == 'undefined') {
                            if (result.data.appSettings.disablePrivateChat && result.data.appSettings.disablePrivateChat == true) {
                                result.data.appSettings.allowChat = "noUsers";
                            } else
                                result.data.appSettings.allowChat = "allUsers";
                        }
                    } else if (!result.data.appSettings) {
                        result.data.appSettings = {};
                        result.data.appSettings.showMembers = true;
                        result.data.appSettings.allowAutoSubscribe = true;
                        result.data.appSettings.allowChat = "allUsers";
                    }
                    $scope.data = result.data.appSettings;

                    $scope.fillUsers();
                    $scope.$digest();


                    document.getElementById('noUsers').addEventListener('change', () => {
                        $scope.save();
                    })

                    document.getElementById('AllUsers').addEventListener('change', () => {
                        $scope.save();
                    })

                    document.getElementById('selectedUsers').addEventListener('change', () => {
                        $scope.save();
                    })
                }
            }
        });


        editor.onDeleteItem = function (event) {
            delete $scope.data.actionItem;
            $scope.save();
        }

        editor.onItemChange = function (event) {
            $scope.data.actionItem = editor.items[0];
            $scope.save();
        }

        editor.onAddItems = function (items) {
            if (!$scope.data.actionItem) {
                $scope.data.actionItem = editor.items[0];
                $scope.save();
            } else {
                let items = [];
                items.push($scope.data.actionItem);
                editor.loadItems(items)
                buildfire.notifications.alert({
                    title: "Adding Denied",
                    message: "You can only have one action item",
                    okButton: {
                        text: 'Ok'
                    }
                }, function (e, data) {
                    if (e) console.error(e);
                    if (data) console.log(data);
                });
            }

        }
    }


    $scope.warn = function () {
        let el = document.getElementById("seeProfile");
        if (el.checked) {
            buildfire.dialog.confirm({
                    message: "Are you sure you want to enable this option?",
                    confirmButton: {
                        text: "Confirm",
                        type: "success"
                    }
                },
                (err, isConfirmed) => {
                    if (err) el.checked = false;

                    if (isConfirmed) {
                        el.checked = true;
                        $scope.save()
                    } else {
                        el.checked = false;
                    }
                }
            );
        } else {
            el.checked = false;
            $scope.save();
        }
    }

    $scope.save = function () {
        buildfire.spinner.show();
        _pluginData.data.appSettings = $scope.data;
        buildfire.datastore.save(_pluginData.data, 'Social', function (err, data) {
            if (err) {
                console.error('App settings -- ', err);
            } else {
                console.log('Data saved using datastore-------------', data);
            }
            buildfire.spinner.hide();
            $scope.$digest();
        });
    };

    $scope.init = function () {
        load()
    }

    $scope.fillUsers = function () {
        $scope.searchTableHelper = new SearchTableHelper(
            "searchResults",
            searchTableConfig,
            "loading",
            "headTable"
        );
        $scope.searchTableHelper.search();
    }

    $scope.selectUsers = function () {
        buildfire.auth.showUsersSearchDialog(null, (err, result) => {
            if (err) return console.log(err);

            if (result) {
                verifyUsers(result);
            }
        });
    }

    var verifyUsers = function (result) {
        result.userIds.forEach((userId, index) => {
            $scope.getById(userId, (err, res) => {
                console.log(res)
                if (res) {
                    res.data.userDetails.hasAllowChat = true;
                    $scope.update(res.id, res.data, (err, res2) => {
                        console.log(res2)
                        if (index == result.userIds.length - 1)
                            $scope.searchTableHelper.search();
                    });
                } else {
                    if (index == result.userIds.length - 1)
                        $scope.searchTableHelper.search();
                }
            })
        });
    }

    $scope.update = function (id, obj, callback) {
        window.buildfire.publicData.update(id, obj, 'subscribedUsersData', function (err, data) {
            if (err) callback ? callback(err) : console.error(err);
            else
                callback && callback(null, data);
        });
    }

    $scope.getById = function (userId, callback) {

        window.buildfire.publicData.search({
            filter: {
                $and: [{
                    "_buildfire.index.array1.string1": `${userId}-`
                }, {
                    "_buildfire.index.string1": ""
                }]
            }
        }, 'subscribedUsersData', function (err, data) {
            if (err) callback ? callback(err) : console.error(err);
            else if (data && data.length > 0) {
                callback && callback(null, data[0]);
            } else {
                callback && callback(null, null);
            }
        })
    }
}]);