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
                    console.log(_pluginData)
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
                        if(typeof (result.data.appSettings.showMembers) == 'undefined') {
                            result.data.appSettings.showMembers = true;
                        }
                        if(typeof (result.data.appSettings.allowCommunityFeedFollow) == 'undefined'){
                            result.data.appSettings.allowCommunityFeedFollow = false;
                        }
                        if(typeof (result.data.appSettings.seeProfile) == 'undefined'){
                            result.data.appSettings.seeProfile = false;
                        }
                        if(typeof (result.data.appSettings.allowAutoSubscribe) == 'undefined') {
                            result.data.appSettings.allowAutoSubscribe = true;
                        }
                    } else if(!result.data.appSettings) {
                        result.data.appSettings = {};
                        result.data.appSettings.showMembers = true;
                        result.data.appSettings.allowAutoSubscribe = true;
                    }    
                    $scope.data = result.data.appSettings;
                    $scope.$digest();
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
            }
            else {
                let items = [];
                items.push($scope.data.actionItem);
                editor.loadItems(items)
                buildfire.notifications.alert({
                    title: "Adding Denied"
                    , message: "You can only have one action item"
                    , okButton: { text: 'Ok' }
                }, function (e, data) {
                    if (e) console.error(e);
                    if (data) console.log(data);
                });
            }

        }
    }
    

    $scope.warn = function(){
        let el = document.getElementById("seeProfile");
        if(el.checked) {
            buildfire.dialog.confirm(
                {
                    message: "Are you sure you want to enable this option?",
                    confirmButton:{
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
            }
            else{
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
}]);