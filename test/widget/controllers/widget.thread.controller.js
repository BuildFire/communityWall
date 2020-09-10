describe('Unit : Controller - ThreadCtrl', function () {

// load the controller's module
    var ThreadCtrl, $scope, Modals, SocialDataStore, $timeout,$q,Buildfire,SocialItem,Location1,routeParams, $httpBackend, authRequestHandler;

    beforeEach(module('socialPluginWidget'));

    beforeEach(module('socialPluginWidget', function ($provide) {
        $provide.service('Buildfire', function () {
            this.datastore = jasmine.createSpyObj('datastore', ['get', 'onUpdate','onRefresh']);
            this.auth = jasmine.createSpyObj('auth', ['getCurrentUser', 'login','onLogin','onLogout']);
            this.navigation = jasmine.createSpyObj('navigation', ['get', 'onUpdate']);
            this.messaging = jasmine.createSpyObj('messaging', ['get', 'onUpdate','onReceivedMessage']);
            this.history =  jasmine.createSpyObj('history', ['pop', 'push', 'onPop']);
            this.getContext = function (cb) {
                cb(null, {});
            };
            this.messaging.onReceivedMessage.and.callFake(function(cb){
                cb({});
            });
            this.auth.getCurrentUser.and.callFake(function(cb){
                cb(null,{_id: '434', userToken: 'sfds343433'});
            });
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

    beforeEach(inject(function ($controller, _$rootScope_,_$routeParams_, _$httpBackend_, Location,_SocialItems_,_Modals_, _SocialDataStore_, _$timeout_,_$q_,_Buildfire_) {

        routeParams=_$routeParams_;
        $httpBackend = _$httpBackend_;

        /*Buildfire = jasmine.createSpyObj('Buildfire', ['getContext', 'auth']);
        Buildfire.datastore = jasmine.createSpyObj('datastore', ['get', 'onUpdate']);
        Buildfire.auth = jasmine.createSpyObj('auth', ['getCurrentUser', 'login','onLogin','onLogout']);
        Buildfire.navigation = jasmine.createSpyObj('navigation', ['get', 'onUpdate']);
        Buildfire.messaging = jasmine.createSpyObj('messaging', ['get', 'onUpdate','onReceivedMessage']);
        Buildfire.getContext.and.callFake(function (callback) {
            callback('Error', null);
        });
        Buildfire.auth.getCurrentUser.and.callFake(function (callback) {
            callback('Error', null);
        });
*/


        SocialDataStore = jasmine.createSpyObj('SocialDataStore', ['deletePost', 'onUpdate','getUserSettings','getCommentsOfAPost']);
        Location1 = Location;
        SocialItem =_SocialItems_;
        $scope = _$rootScope_.$new();
        Modals = _Modals_;
        $timeout = _$timeout_;
        $q = _$q_;
        routeParams.threadId= '12121';

        ThreadCtrl = $controller('ThreadCtrl', {
            $scope: $scope,
            $routeParams:routeParams
//            SocialDataStore: SocialDataStore
        });
    }));

    describe('Units: units should be Defined', function () {
        it('it should pass if ThreadCtrl is defined', function () {
            console.log('#############',ThreadCtrl);
            expect(ThreadCtrl).not.toBeUndefined();
        });
        it('it should pass if Modals is defined', function () {
            expect(Modals).not.toBeUndefined();
        });
    });


    describe('ThreadCtrl.getFollowingStatus', function () {

        it('it should pass if getFollowingStatus is called', function () {

            ThreadCtrl.getFollowingStatus();

        });
    });

    describe('ThreadCtrl.getComments', function () {

        beforeEach(function(){


            SocialDataStore.getCommentsOfAPost.and.callFake(function () {
                var deferred = $q.defer();
                deferred.resolve({});
                return deferred.promise;
            });
        })

        it('it should pass if getComments is called', function () {

            ThreadCtrl.getComments('asasa','asasa');

        });
    });

    describe('Thread.addComment', function () {
        var $httpBackend,$rootScope;
        beforeEach (inject (function ($injector,$rootScope) {
            $httpBackend = $injector.get ('$httpBackend');
        }));

        /*beforeEach(function(){
            Buildfire.auth.getCurrentUser.and.callFake(function(cb){
                cb(null,{});
            });

            Buildfire.getContext.and.callFake(function(cb){
                cb(null,{});
                $httpBackend.flush();
            });
        });*/

        it('it should pass if Thread.addComment is called', function () {

            ThreadCtrl.addComment();
           // $rootScope.$digest();

        });
    });


    describe('Thread.loadMoreComments', function () {


        it('it should pass if Thread.loadMoreComments is called', function () {

            ThreadCtrl.loadMoreComments();

        });
    });

    describe('Thread.getUserName', function () {

        it('it should pass if Thread.getUserName is called', function () {
            ThreadCtrl.getUserName();
        });
    });

    describe('Thread.getUserImage', function () {

        it('it should pass if Thread.getUserImage is called', function () {
            ThreadCtrl.getUserImage();
        });
    });

    describe('Thread.showMoreOptions', function () {

        it('it should pass if Thread.showMoreOptions is called', function () {
            ThreadCtrl.showMoreOptions();
        });
    });

    describe('Thread.likeThread', function () {

        it('it should pass if Thread.likeThread is called', function () {
            ThreadCtrl.likeThread({},'comment');
        });
    });

    describe('Thread.followUnfollow', function () {

        it('it should pass if Thread.followUnfollow is called', function () {
            ThreadCtrl.followUnfollow('following');
        });
    });


    describe('Thread.getDuration', function () {

        it('it should pass if Thread.getDuration is called', function () {
            ThreadCtrl.getDuration('1212122121');
        });
    });

    describe('Thread.likeComment', function () {

        it('it should pass if Thread.likeComment is called', function () {
            var comment={};
            comment.waitAPICompletion=false;
            comment.isUserLikeActive=true;
            ThreadCtrl.likeComment(comment,'comment');
        });
    });

    describe('Thread.deleteComment', function () {

        it('it should pass if Thread.deleteComment is called', function () {
            ThreadCtrl.deleteComment('asasasa');
        });
    });

    describe('Thread.uploadImage', function () {

        it('it should pass if Thread.uploadImage is called', function () {
            ThreadCtrl.uploadImage({});
        });
    });

    describe('Thread.cancelImageSelect', function () {

        it('it should pass if Thread.cancelImageSelect is called', function () {
            ThreadCtrl.cancelImageSelect();
        });
    });

    /*describe(' Buildfire.messaging.onReceivedMessage', function () {

        it('it should pass if  Buildfire.messaging.onReceivedMessaget is called', function () {
            console.log('__________________',Buildfire);
            Buildfire.messaging.onReceivedMessage.and.callFake(function(cb){
                cb({});
            });
        });
    });*/
});