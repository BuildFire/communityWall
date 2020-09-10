describe('socialPluginWidget: App', function () {
    beforeEach(module('socialPluginWidget'));
    var location, route, rootScope;
    var Buildfire;

    beforeEach(module('socialPluginWidget', function ($provide) {
        $provide.service('Buildfire', function () {

            this.datastore = jasmine.createSpyObj('datastore', ['get', 'onUpdate']);
            this.auth = jasmine.createSpyObj('auth', ['getCurrentUser', 'login']);
            this.navigation = jasmine.createSpyObj('navigation', ['onBackButtonClick', 'onUpdate']);
            this.history = jasmine.createSpyObj('history', ['pop', 'push', 'onPop']);


            this.datastore.onUpdate.and.callFake(function (callback) {
                callback('Event');
                return {
                    clear: function () {
                        return true
                    }
                }
            });

           this.navigation.onBackButtonClick.and.callFake(function (callback) {
               callback(null);
            });


        });
    }));

    beforeEach(inject(function (_Buildfire_) {
        Buildfire = _Buildfire_;

    }));

    beforeEach(inject(
        function (_$location_, _$route_, _$rootScope_) {
            location = _$location_;
            route = _$route_;
            rootScope = _$rootScope_;
        }));
    xdescribe('Home route', function () {
        beforeEach(inject(
            function ($httpBackend) {
                $httpBackend.expectGET('templates/wall.html')
                    .respond(200);
                $httpBackend.expectGET('/')
                    .respond(200);
            }));

        it('should load the home page on successful load of /', function () {
            location.path('/');
            rootScope.$digest();
            expect(route.current.controller).toBe('WidgetWallCtrl')
        });
    });
    describe('Thread route', function () {
        beforeEach(inject(
            function ($httpBackend) {
                $httpBackend.expectGET('templates/thread.html')
                    .respond(200);
                $httpBackend.expectGET('/thread/123')
                    .respond(200);
            }));

        it('should load the thread page on successful load of /thread/123', function () {
            location.path('/thread/123');
            rootScope.$digest();
            expect(route.current.controller).toBe('ThreadCtrl')
        });

        it('should allow me to test the run() block', inject(function ($rootScope) {




        }));
    });

});
