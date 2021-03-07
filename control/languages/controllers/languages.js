app.controller('LanguagesCtrl', ['$scope', function ($scope) {

    $scope.data = {};

    let strings;
    const stringsCopy = JSON.parse(JSON.stringify(stringsConfig));
    function loadLanguage(lang) {
        
        buildfire.datastore.get("languages", (err, result) => {
            if (result.data && result.data.screenOne) {
                Object.keys(result.data.screenOne).forEach((oldKey) => {
                    Object.keys(stringsConfig).forEach((defaultKey) => {
                        Object.keys(stringsCopy[defaultKey].labels).forEach((newKey) => {
                            if(stringsCopy[defaultKey].labels[newKey].defaultValue === result.data.screenOne[oldKey].defaultValue && result.data.screenOne[oldKey].value) 
                                stringsCopy[defaultKey].labels[newKey].value = result.data.screenOne[oldKey].value
                        }); 
                    });
                });
                Object.keys(stringsConfig).forEach((defaultKey) => {
                    delete stringsCopy[defaultKey].title;
                    delete stringsCopy[defaultKey].subtitle;
                    Object.keys(stringsCopy[defaultKey].labels).forEach((newKey) => {
                        let defaultValue = stringsCopy[defaultKey].labels[newKey].defaultValue;
                        let value = stringsCopy[defaultKey].labels[newKey].value;
                        stringsCopy[defaultKey][newKey] = {defaultValue };
                        if(value) stringsCopy[defaultKey][newKey].value = value;
                    });
                    delete stringsCopy[defaultKey].labels;
                });

                buildfire.datastore.save(stringsCopy, "languages", (err, res) => {
                    window.location.reload();
                });
            }
            else { 
                strings = new buildfire.services.Strings(lang, stringsConfig);
                strings.init().then(() => {
                    strings.inject();
                });
                stringsUI.init("stringsContainer", strings, stringsConfig);
            }
        });
        
    }

    loadLanguage("en-us");

    $scope.createLanguage = function (language) {
        stringsContainer.disabled = true;
        strings.createLanguage(language, () => {
            stringsContainer.disabled = false;
        });
        return false;
    }

    $scope.save = function() {
        strings.save();
    }

}]);