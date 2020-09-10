describe('Unit : socialPluginContent content services', function () {
    describe('Unit: Buildfire Provider', function () {
        var Buildfire;
        var SocialDataStore;
        beforeEach(module('socialPluginContent'));
        beforeEach(inject(function (_Buildfire_,_SocialDataStore_) {
            Buildfire = _Buildfire_;
            SocialDataStore = _SocialDataStore_;

        }));

        it('Buildfire should exist and be an object', function () {
            expect(typeof Buildfire).toEqual('object');
        });
        it('SocialDataStore should exist and be an object', function () {


            console.info(">>>>>>>>>>",SocialDataStore.addApplication);
            expect(typeof SocialDataStore.addApplication).toEqual('function');
        });

        it('SocialDataStor addApplication called', function () {
            console.info("SocialDataStor.addApplication Called ???????????????");
            SocialDataStore.addApplication('123','sas12')

        });

        it('SocialDataStor getThreadByUniqueLink called', function () {
            console.info("SocialDataStor.getThreadByUniqueLink Called ???????????????");
            SocialDataStore.getThreadByUniqueLink('123','sas12')

        });

        it('SocialDataStor getPosts called', function () {
            console.info("SocialDataStor getPosts Called ???????????????");
            SocialDataStore.getPosts({});

        });

        it('SocialDataStor getUsers called', function () {
            console.info("SocialDataStor getUsers Called ???????????????");
            SocialDataStore.getUsers([]);

        });
        it('SocialDataStor deletePost called', function () {
            console.info("SocialDataStor deletePost Called ???????????????");
            SocialDataStore.deletePost('121wasa', '2121saasa','sqw121');

        });

        it('SocialDataStor getCommentsOfAPost called', function () {
            console.info("SocialDataStor getCommentsOfAPost Called ???????????????");
            SocialDataStore.getCommentsOfAPost({});

        });

        it('SocialDataStor banUser called', function () {
            console.info("SocialDataStor banUser Called ???????????????");
            SocialDataStore.banUser('121wasa', '2121saasa','sqw121');

        });
        it('SocialDataStor deleteComment called', function () {
            console.info("SocialDataStor deleteComment Called ???????????????");
            SocialDataStore.deleteComment('121wasa', '2121saasa','sqw121');

        });
        it('SocialDataStor getThreadLikes called', function () {
            console.info("SocialDataStor getThreadLikes Called ???????????????");
            SocialDataStore.getThreadLikes('121wasa', '2121saasa');

        });

    });


});

