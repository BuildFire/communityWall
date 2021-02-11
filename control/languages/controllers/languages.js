app.controller('LanguagesCtrl', ['$scope', function ($scope) {

    $scope.data = {};

    let strings;
    let screens = {};
    $scope.activeScreen = 1;

    let toInject = null;

    function checkOld(data) {
        if(Object.keys(data.screenOne).length <= 6) {
         
            Object.keys(data.screenOne).forEach((key) => {
                if(data.screenOne[key].value) {
                    stringsConfig.screenOne.labels[key].value = data.screenOne[key].value;
                }
            });
            toInject = stringsConfig.screenOne.labels;
            buildfire.datastore.save({ screenOne: stringsConfig.screenOne.labels }, "languages", (err, data) => { console.log(data) });
        }
    }

    function init() {
        buildfire.datastore.get("languages", (err, result) => {
            if (result.data && result.data.screenOne) {
                toInject = result.data.screenOne;
                checkOld(result.data);
            }
            else { 
                toInject = stringsConfig.screenOne.labels;
            }
            loadLanguage();
        });
    }

    init();
    
    function setupScreens(data) {
        screens = {
            screenOne: {
                labels: {
                }
            }
        }
        if ($scope.activeScreen === 1) {
            screens.screenOne.labels.leaveGroup = data.leaveGroup;
            screens.screenOne.labels.joinGroup = data.joinGroup;
            screens.screenOne.labels.postsNoResults = data.postsNoResults;
        }
        if ($scope.activeScreen === 2) {
            screens.screenOne.labels.followPost = data.followPost;
            screens.screenOne.labels.unfollowPost = data.unfollowPost;
            screens.screenOne.labels.deleteComment = data.deleteComment;
        }
        if ($scope.activeScreen === 3) {
            screens.screenOne.labels.membersBlankState = data.membersBlankState;
            screens.screenOne.labels.membersNoResults = data.membersNoResults;
        }
        if ($scope.activeScreen === 4) {
            screens.screenOne.labels.cancelPost = data.cancelPost;
            screens.screenOne.labels.confirmPost = data.confirmPost;
            screens.screenOne.labels.writePost = data.writePost;
        }
        if ($scope.activeScreen === 5) {
            screens.screenOne.labels.moreOptions = data.moreOptions;
            screens.screenOne.labels.reportPost = data.reportPost;
            screens.screenOne.labels.deletePost = data.deletePost;
        }
        return screens;
    }

    function loadLanguage(lang) {
        let t = setupScreens(toInject);
        strings = new buildfire.services.Strings(lang, t);
        strings.init().then(() => {
            strings._data.screenOne = t.screenOne.labels
            stringsUI.init("stringsContainer", strings, t);
            strings.inject();
        });
    }

    $scope.setScreen = function (screen) {
        if (screen == $scope.activeScreen) return;
        $scope.activeScreen = screen;
        loadLanguage();
    }

    $scope.save = function () {
        let data = strings.getData();
        Object.keys(data).forEach(function (key) {
            toInject[key] = data[key];
        });
        strings.save(toInject);
    }

}]);