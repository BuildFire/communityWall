describe('Unit : Controller - WidgetWallCtrl', function () {

// load the controller's module
    var WidgetWallCtrl, scope, Modals, SocialDataStore, $timeout,$q,Buildfire,rootScope;

    beforeEach(module('socialPluginWidget'));

    beforeEach(module('socialPluginWidget', function ($provide) {
        $provide.service('Buildfire', function () {
            this.datastore = jasmine.createSpyObj('datastore', ['get', 'onUpdate','onRefresh']);
            this.imageLib = jasmine.createSpyObj('imageLib', ['cropImage']);
            this.imageLib.cropImage.and.callFake(function (url,options) {
               return 'abc.png';
            });
            this.auth = jasmine.createSpyObj('auth', ['getCurrentUser', 'login','onLogin','onLogout']);
            this.navigation = jasmine.createSpyObj('navigation', ['get', 'onUpdate']);
            this.messaging = jasmine.createSpyObj('messaging', ['get', 'onUpdate','sendMessageToControl']);
            this.history =  jasmine.createSpyObj('history', ['pop', 'push', 'onPop']);
            this.getContext=function(){};

        });
    }));


   /* beforeEach(inject(function ($controller, _$rootScope_, _Modals_, _SocialDataStore_, _$timeout_,_$q_,Buildfire) {
            scope = _$rootScope_.$new();
            Modals = _Modals_;
            SocialDataStore = _SocialDataStore_;
            $timeout = _$timeout_;
            $q = _$q_;
            WidgetWallCtrl = $controller('WidgetWallCtrl', {
                $scope: scope,
                Modals: Modals,
                SocialDataStore: SocialDataStore,
                Buildfire :_Buildfire_
            });
        })
    );*/

    beforeEach(inject(function ($controller, _$rootScope_, Location,SocialItems,_Modals_, _SocialDataStore_, _$timeout_,_$q_,_Buildfire_) {
        Buildfire = _Buildfire_;
        SocialDataStore = jasmine.createSpyObj('SocialDataStore', ['deletePost', 'onUpdate','getUserSettings','saveUserSettings']);;
        Location1 = Location;
        SocialItem =SocialItems;
        scope = _$rootScope_.$new();
        rootScope= _$rootScope_;
        Modals = _Modals_;
        $timeout = _$timeout_;
        $q = _$q_;

        WidgetWallCtrl = $controller('WidgetWallCtrl', {
            $scope: scope,
            Modals: Modals,
            SocialDataStore: SocialDataStore,
            Buildfire :_Buildfire_
        });


    }));

    describe('Units: units should be Defined', function () {
        it('it should pass if WidgetWallCtrl is defined', function () {
            expect(WidgetWallCtrl).not.toBeUndefined();
        });
        it('it should pass if Modals is defined', function () {
            expect(Modals).not.toBeUndefined();
        });
    });


    describe('WidgetWall.getFollowingStatus', function () {

        it('it should pass if getFollowingStatus is called', function () {

            WidgetWallCtrl.getFollowingStatus();

        });
    });


    describe('WidgetWall.createPost', function () {

        var spy1;
       beforeEach((function () {

           WidgetWallCtrl.SocialItems.userDetails.userToken='';
           WidgetWallCtrl.SocialItems.parentThreadId='sasas';
           WidgetWallCtrl.SocialItems.userDetails.userId='sasas';
           WidgetWallCtrl.SocialItems.socialAppId='sasas';
           WidgetWallCtrl.waitAPICompletion = true;
           WidgetWallCtrl.picFile={};

            Buildfire.auth.getCurrentUser.and.callFake(function (callback) {

             callback(null,null);
                Buildfire.auth.login.and.callFake(function (callback) {


                    callback(null, {});
                });

            });
        }));

        it('it should pass if it calls SocialDataStore.createPost if WidgetWall.picFile is truthy', function () {
            WidgetWallCtrl.SocialItems.userDetails.userToken='';
            WidgetWallCtrl.SocialItems.parentThreadId='sasas';
            WidgetWallCtrl.SocialItems.userDetails.userId='sasas';
            WidgetWallCtrl.SocialItems.socialAppId='sasas';
            WidgetWallCtrl.waitAPICompletion = true;
            WidgetWallCtrl.picFile={};
            WidgetWallCtrl.createPost();

        });

    });

    describe('WidgetWall.likeThread', function () {

        var spy1;
        beforeEach(inject(function () {
            spy1 = spyOn(SocialDataStore,'addThreadLike').and.callFake(function () {

                var deferred = $q.defer();
                deferred.resolve({});
                console.log('abc');
                return deferred.promise;
            });

        }));

        xit('it should pass', function () {
            var a = {likesCount:9};
            WidgetWallCtrl.likeThread(a,{});
            expect(a.likesCount).toEqual(10);
            //expect(spy1).not.toHaveBeenCalled();
        });
    });

    describe('WidgetWall.seeMore', function () {

        it('it should pass if it sets seeMore to true for the post', function () {
            var a = {seeMore:false};
            WidgetWallCtrl.seeMore(a,{});
            expect(a.seeMore).toBeTruthy();
        });
    });

    describe('WidgetWall.getPosts', function () {

        it('it should pass if it sets seeMore to true for the post', function () {
            var a = {seeMore:false};
            WidgetWallCtrl.seeMore(a,{});
            expect(a.seeMore).toBeTruthy();
        });
    });


    describe('WidgetWall.getUserName', function () {


        it('it should pass if it calls SocialDataStore.getUserName is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.getUserName();

        });


    });

    describe('WidgetWall.getUserImage', function () {


        it('it should pass if it calls SocialDataStore.getUserImage is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.getUserImage();

        });


    });

    describe('WidgetWall.showMoreOptions', function () {


        it('it should pass if it calls SocialDataStore.showMoreOptions is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.showMoreOptions('asasasa');

        });


    });

    describe('WidgetWall.likeThread', function () {
        it('it should pass if it calls SocialDataStore.likeThread is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.likeThread('asasasa','user');

        });
    });

    describe('WidgetWall.goInToThread', function () {
        it('it should pass if it calls SocialDataStore.likeThread is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.goInToThread('asasasa');

        });
    });

    describe('WidgetWall.isLikedByLoggedInUser', function () {
        it('it should pass if it calls SocialDataStore.likeThread is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.isUserLikeActive('asasasa');

        });
    });

    describe('WidgetWall.uploadImage', function () {
        it('it should pass if it calls WidgetWall.uploadImage is called', function () {
          //  WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.uploadImage({});

        });
    });

    describe('WidgetWall.cancelImageSelect ', function () {
        it('it should pass if it calls WidgetWall.cancelImageSelect is called', function () {
            //  WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.cancelImageSelect();
            $timeout.flush();
        });
    });

    describe('WidgetWall.updateLikesData', function () {
        it('it should pass if it calls SocialDataStore.likeThread is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.updateLikesData('asasasa','online');

        });
    });

    describe('WidgetWall.getDuration', function () {
        it('it should pass if it calls WidgetWall.getDuration is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.getDuration('1212121212');

        });
    });


    describe('WidgetWall.deletePost', function () {
        beforeEach(function(){

            var response={
                data:{
                    result:{

                    }
                }
            };

            SocialDataStore.deletePost.and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve(response);
                return deferred.promise;
            });

            Buildfire.messaging.sendMessageToControl.and.callFake(function () {

            });
        })
        it('it should pass if it calls SocialDataStore.deletePost is called', function () {
            WidgetWallCtrl.picFile = 'a';
            WidgetWallCtrl.deletePost('asasasa');
            scope.$digest();

        });
    });

    describe('scope.emit COMMENT_ADDED', function () {
        beforeEach(function(){


            SocialDataStore.saveUserSettings.and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve({});
                return deferred.promise;
            });

        })
        it('it should pass if it calls scope.emit is called', function () {
            rootScope.$emit('COMMENT_ADDED');

        });
    });

    describe('scope.emit COMMENT_LIKED', function () {
        beforeEach(function(){


            SocialDataStore.saveUserSettings.and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve({});
                return deferred.promise;
            });

        })
        it('it should pass if it calls scope.emit is called', function () {
            rootScope.$emit('COMMENT_LIKED');

        });
    });

    describe('scope.emit COMMENT_UNLIKED', function () {
        beforeEach(function(){


            SocialDataStore.saveUserSettings.and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve({});
                return deferred.promise;
            });

        })
        it('it should pass if it calls scope.emit is called', function () {
            rootScope.$emit('COMMENT_UNLIKED');

        });
    });

    describe('scope.emit POST_LIKED', function () {
        beforeEach(function(){


            SocialDataStore.saveUserSettings.and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve({});
                return deferred.promise;
            });

        })
        it('it should pass if it calls scope.emit is called', function () {
            rootScope.$emit('POST_LIKED',{_id:'12313'});

        });
    });

    describe('scope.emit POST_UNLIKED', function () {
        beforeEach(function(){


            SocialDataStore.saveUserSettings.and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve({});
                return deferred.promise;
            });

        })
        it('it should pass if it calls scope.emit is called', function () {
            rootScope.$emit('POST_UNLIKED',{_id:'12313'});

        });
    });



});