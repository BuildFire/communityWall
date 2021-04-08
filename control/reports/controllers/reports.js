app.controller('ReportsCtrl', ['$scope', function ($scope) {

    $scope.data = {};

    let searchTableHelper = null;
    buildfire.messaging.sendMessageToWidget({
        name: 'ASK_FOR_WALLID'
    });

    buildfire.messaging.onReceivedMessage = function (event) {
        if (event.name === "SEND_WALLID") return loadTable(event);
    }

    function loadTable(event) {
        searchTableHelper = new SearchTableHelper("searchResults", 'reports_' + event.wid, searchTableConfig);
        searchTableHelper.search();
        searchTableHelper.onEditRow = (obj, tr) => {
            console.log(obj);
            banUser(obj.data);
        }
    }

    function banUser(data) {
        buildfire.spinner.show();
        let searchOptions = {
            filter: { "_buildfire.index.string1": data.wid, $and: [{ "$json.userId": data.reportedUserID }] }
        }

        let searchOptions2 = {
            filter: { "_buildfire.index.string1": data.wid, 
                $and: [ { "$json.comments.userId": data.reportedUserID }]
            }
        }
        /** Update reports table **/
        buildfire.publicData.get('reports_' + data.wid, (err, result) => {
            result.data = result.data.filter(el => el.reportedUserID !== data.reportedUserID);
            
            buildfire.publicData.update(result.id, result.data, 'reports_' + data.wid, (err, saved) => {
                console.log('saved', saved)
            });
        });

        buildfire.publicData.search(searchOptions2, 'posts', (error, result1) => {
            if (error) return console.log(error);
            console.log(result1, searchOptions)
            if (result1 && result1.length) {
                result1.map(post => {
                    post.data.comments.map((comment, index) => {
                        if (comment.userId === userId) {
                            post.data.comments.splice(index, 1)
                        }
                    })
                    buildfire.publicData.update(post.id, post.data, 'posts', (error, data) => {
                        if (error) return deferred.reject(error);
                    });
                });
            }
            buildfire.publicData.search(searchOptions, 'posts', (error, result) => {
                if (error) return console.log(error);
                if (result && result.length) {
                    console.log(result)
                    result.map(post => {
                        buildfire.publicData.delete(post.id, 'posts', function (err, status) {
                            if (error) return console.log(error);
                        })
                    })
                }
                buildfire.messaging.sendMessageToWidget({
                    name: 'BAN_USER', reported: data.reportedUserID, wid: data.wid 
                });
              
            });
        });
    }
}]);