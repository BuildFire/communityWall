'use strict';

(function (angular) {
    angular
        .module('socialPluginContent')
        .controller('DesignHomeCtrl', ['$scope','Buildfire','$timeout', function($scope, Buildfire, $timeout) {
            var t = this;
            t.isLoading = true;
            t.onLoad = (callback) =>{
                t.get((err, icons) =>{
                    if(err || (icons && icons.data && Object.keys(icons.data).length == 0 )){
                        t.saveInitial();
                    }
                    else{
                        for(const key1 in icons.data){
                            for(const key2 in icons.data[key1]){
                                t.handleChange(key1, key2, icons.data[key1][key2]);
                            }
                        }
                    }
                })
                Buildfire.datastore.get("SocialIcons",(err, icons) =>{
                    callback(err, icons)
                })
            }
            $scope.debounce = function(func, timeout = 300){
                let timer;
                return (...args) => {
                  clearTimeout(timer);
                  timer = setTimeout(() => { 
                      func.apply(this, args);

                    }, timeout);
                };
            }

            $scope.evaluateChange = $scope.debounce(() => {
                
                    if(t.icons.reactions.threshold === ""){
                        t.handleChange('reactions','threshold', 1, true)
                        t.icons.reactions.threshold = 1;
                        $timeout(function(){
                            $scope.$digest();
                        })
                    }
                    else{
    
                        if(parseInt(t.icons.reactions.threshold) > 0){
                            t.handleChange('reactions','threshold', parseInt(t.icons.reactions.threshold), true)
                        }
                        else{
                            t.handleChange('reactions','threshold', 1, true)                            
                            t.icons.reactions.threshold = 1;
                            $timeout(function(){
                                $scope.$digest();
                            })
                        }
                    }
            } , 1000)


            t.handleChange = (key1, key2, val, shouldSave = false) =>{
                t.icons[key1][key2] = val;
                if(shouldSave) t.save(t.icons);
            }

            t.save = (data) =>{
                Buildfire.datastore.save(data, "SocialIcons", () =>{})
            }

            t.get = (callback) =>{
                Buildfire.datastore.get("SocialIcons", (err, results) =>{
                    return callback(err, results)
                }) 

            }

            t.saveInitial = () =>{
                t.save({
                    bottomNavBar:{
                        home: "glyphicon glyphicon-home",
                        addContent: "glyphicon glyphicon-plus",
                        myProfile: "glyphicon glyphicon-user",
                        notifications: "glyphicon glyphicon-bell",
                        discover: "glyphicon glyphicon-search",
                    },
                    reactions:{
                        icon: "glyphicon glyphicon-flash",
                        color: "rgba(255,0,0,1)",
                        threshold: 50,
                    }
                })
            }

            t.init = function (callback) {
                t.icons = {
                    bottomNavBar:{
                        home: "glyphicon glyphicon-home",
                        addContent: "glyphicon glyphicon-plus",
                        myProfile: "glyphicon glyphicon-user",
                        notifications: "glyphicon glyphicon-bell",
                        discover: "glyphicon glyphicon-search",
                    },
                    reactions:{
                        icon: "glyphicon glyphicon-flash",
                        color: "rgba(255,0,0,1)",
                        threshold: 50,
                    }
                };
                t.onLoad((err, icons) =>{
                    if(icons && Object.keys(icons.data).length > 0){
                        t.icons = icons.data;
                    }
                    t.isLoading = false;
                    return callback(true)
                })
            };

            t.bfColorPicker = function(){
                const color = t.newColor || 'rgba(255, 255, 255,1)';
                const rgb = /rgba?\((\d{1,3},\s?\d{1,3},\s?\d{1,3}).*\)/;
                const match = color.match(rgb);
                const colors = (match && match[1] && match[1].split(/,\s?/)) || [255, 255, 255];
                const hexaCode = colors.reduce((current, next) => {
                const decimal = parseInt(next, 10);
                let hexa = decimal.toString(16);
                if (next < 16) {
                    hexa += hexa;
                }

                return current + hexa;
                }, '#');

                Buildfire.colorLib.showDialog(
                    {
                      colorType: 'solid',
                      solid: {
                        color: hexaCode|| null,
                        opacity: t.solidOpacity || 100,
                      },
                    },
                    {
                      hideGradient: true,
                    },
                    () => {},
                    (err, res) => {
                      if (!err) {
                        const solidColor = res.solid.color;
                        const solidOpacity = parseInt(res.solid.opacity, 10);
                        let el = document.getElementById("color-picker-bg");
                        el.classList.remove("noColor");
                        el.style.background =  res.solid.color;
                        t.handleChange("reactions","color", res.solid.color, true)
                      }
                    },
                );
                
            }

            t.openIconPicker = (key1, key2) =>{
                Buildfire.imageLib.showDialog({multiSelection: false,showIcons: true, showFiles: false}, (err, result) => {
                    if (err) return console.error(err);
                    else{
                        if(result && result.selectedIcons && result.selectedIcons.length > 0){
                            t.icons[key1][key2] = result.selectedIcons[0];
                            t.save(t.icons)
                            $timeout(function(){
                                $scope.$digest();
                            })
                        }
                    }
                  });
            }

    
            t.init(isFinished =>{
                if(isFinished){
                    $timeout(function(){
                        $scope.$digest();
                    })
                }
            });
        }]);
})(window.angular);

