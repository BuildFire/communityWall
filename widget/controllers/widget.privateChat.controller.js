'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('PrivateChatCtrl', ['$scope','$sce', 'SocialDataStore', 'Buildfire', '$rootScope', 'Location', 'SocialItems', '$timeout','SubscribedUsersData', 'PushNotification',
        function ($scope, $sce, SocialDataStore, Buildfire, $rootScope, Location,  SocialItems, $timeout, SubscribedUsersData, PushNotification) {
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
                markMessageAsRead(t.SocialItems.wid);
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


            const markMessageAsRead = (wallId) => {
                SubscribedUsersData.searchAndUpdate(
                    {"_buildfire.index.string1": t.SocialItems.wid},
                    {$set: { "lastMessage.isRead": true } }
                )
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
                    const post  = { text: t.text }
                    t.SocialItems.postMeta && t.SocialItems.postMeta.image ? post.image = t.SocialItems.postMeta.image  : ''
                    t.SocialItems.postMeta && t.SocialItems.postMeta.video ? post.video = t.SocialItems.postMeta.video : '',
                    t.SocialItems.postMeta && t.SocialItems.postMeta.postId ? post.postId = t.SocialItems.postMeta.postId : '',
                    t.createPost(post);
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
                                        Buildfire.spinner.hide();
                                        t.sendImage(imageData);
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
                                        Buildfire.spinner.hide();
                                        t.sendVideo(videoData.url);
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
                        { filter: ["image/jpeg", "image/png", "video/mp4"], allowMultipleFilesUpload: false },
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
                            if (!file || file.status === 'failed') {
                                Buildfire.dialog.toast({
                                    message: "Unable to upload",
                                });
                                return
                            }
                            let isImage = file.type.split('/')[0] === 'image'; 
                            if (isImage) {
                                t.sendImage(file.url);
                            } else {
                                t.sendVideo(file.url);
                            }

                            $scope.$digest();
                        }
                      );
                }
            }

            t.sendImage = function(image){
                t.createPost({image});
            }

            t.sendVideo = function (video) {
                t.createPost({ video });
            }

            t.createPost = function(obj){
                let postData = {
                    text: obj.text || "",
                    images: obj.image ? [obj.image] : [],
                    videos: obj.video ? [obj.video] : [],
                    wid: t.SocialItems.wid,
                    userDetails: t.SocialItems.userDetails,
                    postId: obj.postId? obj.postId : '',
                }
                SocialDataStore.createPrivatePost(postData).then((response) =>{
                    t.SocialItems.items.push(response.data);
                    sendNotification();
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

            const sendNotification = () => {
                const user1Id = t.SocialItems.wid.slice(0, 24);
                const user2Id = t.SocialItems.wid.slice(24, 48);
                let userToSend = user1Id === t.SocialItems.userDetails.userId
                    ? user2Id : user1Id;
                PushNotification.sendNotification('newMessage', [userToSend], {wallId: t.SocialItems.wid});
            }
            $scope.trustSrc = function(src) {
                return $sce.trustAsResourceUrl(src);
            };

            $scope.openSinglePost = (postId) =>{
                Location.go("#/singlePostView/" + postId);
            }

            $scope.openImage = (post) =>{

                if (post.postId) {
                    $scope.openSinglePost(post.postId);
                    return;
                }

                const src = buildfire.imageLib.cropImage(post.images[0], { size: 'xl', aspect: '1:1' })
                buildfire.imagePreviewer.show(
                    {
                      images: [src],
                    },
                    () => {
                      console.log("Image previewer closed");
                    }
                  );
            }

            $scope.$on("$destroy", function () {
                $rootScope.isPrivateChat = false;
                console.log('Destory subscription')
                t.SocialItems.isPrivateChat = false;
                t.SocialItems.postMedia = null;
             });

            //  const goBack = buildfire.navigation.onBackButtonClick;
            //  buildfire.navigation.onBackButtonClick = () => {
            //     $rootScope.isPrivateChat = true;
            //     console.log('Destory subscription')
            //     t.SocialItems.isPrivateChat = false;
            //     goBack();
            // };

            t.init();
        }])
})(window.angular);

