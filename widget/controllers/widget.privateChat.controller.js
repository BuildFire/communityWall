'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('PrivateChatCtrl', ['$scope','$sce', 'SocialDataStore', 'Modals', 'Buildfire', "SocialUserProfile", '$rootScope', 'Location', 'EVENTS', 'GROUP_STATUS', 'MORE_MENU_POPUP', 'FILE_UPLOAD', '$modal', 'SocialItems', '$q', '$anchorScroll', '$location', '$timeout', 'Util', 'SubscribedUsersData', function ($scope, $sce, SocialDataStore, Modals, Buildfire, SocialUserProfile, $rootScope, Location, EVENTS, GROUP_STATUS, MORE_MENU_POPUP, FILE_UPLOAD, $modal, SocialItems, $q, $anchorScroll, $location, $timeout, util, SubscribedUsersData) {
            var t = this;
            t.text = "";
            t.isLoading = true;
            t.SocialItems = SocialItems.getInstance();
            $scope.isScrollbarLoading = true;
            t.isFetchingPosts = false;
            t.timeIntervalId;
            t.init = () =>{
                $rootScope.showThread = false;
                $timeout(function(){
                    $rootScope.$digest();
                    $scope.$digest();
                })
                t.isFetchingPosts = true;
                t.SocialItems.getPrivatePosts(t.SocialItems.wid, (err, posts) =>{
                    if(posts){
                        t.isFetchingPosts = false;
                        console.log(posts);
                        $timeout(function(){
                            $rootScope.$digest();
                            $scope.$digest();
                            t.isLoading = false;
                        });
                    }
                    else{
                        console.log("no posts");
                    }
                })
            }
            

            $scope.isFinishedRendering = function(){
                $timeout(function() {
                    $scope.isScrollbarLoading = false;
                    $scope.$digest();
                    var elem = document.getElementById('message');
                    elem.scrollTop = elem.scrollHeight;
                    elem.addEventListener('scroll', function(){
                        var scrollTop = elem.scrollTop;
                        if (t.SocialItems.showMorePosts && !t.isFetchingPosts && scrollTop <= 0 ) {
                            console.log(elem.scrollTop);
                            t.isFetchingPosts = true;
                            Buildfire.spinner.show();
                            t.SocialItems.getMorePrivatePosts(t.SocialItems.wid, (err, posts) =>{
                                if(posts && posts.length > 0){
                                    t.isFetchingPosts = false;
                                    $timeout(function(){
                                        $rootScope.$digest();
                                        $scope.$digest();
                                        var elem = document.getElementById('message');
                                        elem.scrollTop = elem.children[posts.length].offsetTop - 15;
                                        Buildfire.spinner.hide();

                                    })
                                }
                            });
                        }
                    })
                    
                }, 300);
                
            }


            t.sendMessage = function(){
                if(t.text.length > 0){
                    t.createPost({text: t.text});
                    t.text = "";
                }
            }

            t.chooseMedia = function(){
                if(!Buildfire.isWeb()){
                    let listItems = [
                        {text: "Take a picture"},
                        {text:"Record a video"},
                    ];
                    Buildfire.components.drawer.open({ enableFilters: false, listItems:listItems}, (err, result) =>{
                        if(err) console.error(error);
                        else {
                            buildfire.components.drawer.closeDrawer();
                            if(result.text === 'Take a picture'){
                                Buildfire.spinner.show();
                                Buildfire.services.camera.getPicture({upload: true}, (err, imageData) => {
                                    Buildfire.spinner.hide();
                                    if (err || !imageData) return Buildfire.spinner.hide();
                                    else{
                                        $scope.selectedMedia.src = imageData;
                                        $scope.selectedMedia.type = "image";
                                        $scope.selectedMedia.shown  = Buildfire.imageLib.cropImage($scope.selectedMedia.src, { size: "half_width", aspect: "9:16" });
                                        Buildfire.spinner.hide();
                                        $scope.$digest();
                                    }
                                    
                                });
                            }
                            else{
                                Buildfire.spinner.show();
                                Buildfire.services.camera.getVideo({upload: true, quality: 0,duration: 30}, (err, videoData) => {
                                    Buildfire.spinner.hide();
                                    if (err || !videoData) return Buildfire.spinner.hide();
                                    else{
                                        $scope.selectedMedia.src = videoData.url;
                                        $scope.selectedMedia.type = "video";
                                        $scope.selectedMedia.shown  = videoData.localURI

                                        Buildfire.spinner.hide();
                                        $scope.$digest();
                                    }

                                })
                            }
                        }
                    });

                }
                else{
                    Buildfire.spinner.show();
                    Buildfire.services.publicFiles.showDialog(
                        { filter: ["image/jpeg", "image/png",], allowMultipleFilesUpload: false },
                        (onProgress) => {
                            console.log(onProgress);
                        },
                        (onComplete) => {
                        },
                        (err, file) => {
                            Buildfire.spinner.hide();
                            if (err){ 
                                console.log(err);
                                return Buildfire.spinner.hide();
                            }
                            file = file[0];
                            t.sendImage(file.url);

                            $scope.$digest();
                        }
                      );
                }
            }

            t.sendImage = function(image){
                t.createPost({image});
            }

            t.startPollingMessages = function () {
                clearInterval(t.timeIntervalId);

                t.timeIntervalId = setInterval(() => {
                    t.SocialItems.items = [];
                    t.SocialItems.getPrivatePosts(t.SocialItems.wid, (err, posts) =>{
                        if(posts){
                            // $timeout(function(){
                            //     $rootScope.$digest();
                            //     $scope.$digest();
                            // });
                        }
                        else{
                            console.log("no posts");
                        }
                    })
                }, 10000)
            }


            t.createPost = function(obj){
                let postData = {
                    text: obj.text || "",
                    images: obj.image ? [obj.image] : [],
                    wid: t.SocialItems.wid,
                    userDetails: t.SocialItems.userDetails,
                }
                SocialDataStore.createPrivatePost(postData).then((response) =>{
                    t.SocialItems.items.push(response.data);

                    const lastMessage = {
                        text: postData.text,
                        createdAt: new Date(),
                        sender: t.SocialItems.userDetails.userId,
                        isRead: false
                    }
                    SubscribedUsersData.searchAndUpdate(
                        {"_buildfire.index.string1": t.SocialItems.wid},
                        {$set: { lastMessage } }
                    )
                })
            }

            $scope.$on("$destroy", function () {
                console.log('Destory subscription')
                t.SocialItems.isPrivateChat = false;
                clearInterval(t.timeIntervalId);//we always has to do it
             });

            t.init();
        }])
})(window.angular);

