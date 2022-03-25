const ReactionsUI = {
    load: (currentUserId) =>{
        const elements = document.querySelectorAll('a[data-src]');
        elements.forEach(el =>{
            if(el.getAttribute("data-isInjected") === "false"){
                let uniqueID = el.getAttribute("data-id");
                let composedId = `${uniqueID}`;
                let options = {filter:{"_buildfire.index.string1":composedId}};
                ReactionsUI.search(options, (err, res) =>{
                    if(res) el.innerHTML = "LIKED";
                    else el.innerHTML = "LIKE";
                })
                el.onclick = () =>{
                    if(el.innerHTML === "LIKED") el.innerHTML = "LIKE";
                    else el.innerHTML = "LIKED";
                    ReactionsUI.search(options, (err, res) =>{
                        if(res){
                            ReactionsUI.delete(res.id, () =>{});
                            el.innerHTML = "LIKE"
                        }                        
                        else{
                            ReactionsUI.toggle({currentUserId, uniqueID, reactionTypeId: "like"}, false,);
                        }
                    })
                }

            }
        })
    },
    delete: (id, callback) =>{
        buildfire.appData.search({filter:{"_buildfire.index.array1.string1":id}}, "$$reactions$$", (err, results) =>{
            if(results && results.length > 0){

                buildfire.appData.delete(results[0].id,"$$reactions$$",(err, deleted) =>{
                    return callback(err, deleted);
                });
            }            
        })
    },
    search: (options = {}, callback) =>{
        buildfire.appData.search(options,"$$reactions$$",(err, reaction) =>{
            if(err) return callback(err);
            else if(reaction && reaction.length == 0) return callback(null, null)
            else return callback(null, reaction)
        })
    },
    toggle: (ids, displayName, exists) =>{
        if(!exists){
            let newReaction = {
                reactionId: ids.reactionTypeId,
                id: ids.uniqueID,
                user:{
                    userId: ids.currentUserId,
                    displayName: displayName
                },
                _buildfire:{
                    index:{
                        string1: ids.uniqueID,
                        array1:[
                            {string1: `${ids.uniqueID}-${ids.currentUserId}`},
                            {string1: `userId_${ids.currentUserId}`}
                        ]
                    }
                }
            }
            ReactionsUI.insert(newReaction, () =>{})
        }
        
    },
    insert: (reaction, callback) =>{
        buildfire.appData.insert(reaction, "$$reactions$$", (err, result) =>{
            if(err) return callback(err);
            else return callback(null, result)
        })
    },
    getUserReactionsCount: (userId, callback) =>{
        if(!userId) return callback(0)
        buildfire.appData.aggregate(
            {
              pipelineStages: [
                { $match: { 
                  "_buildfire.index.array1.string1":`userId_${userId}`,
                }},
                { $group: { _id: null, totalCount: { $sum: 1 } } }
              ],
            },
            "$$reactions$$",
            (err, result) => {
                if(result && result.length > 0 && result[0].totalCount) return callback(result[0].totalCount);
                else return callback(0);
              }
          );
    },
    getReactions: (currentUserId, postsArray, callback) =>{
        let indexes = [];
        postsArray.forEach(item =>{
            let composedId = `${item.id}-${currentUserId}`
            indexes.push(composedId);
        })
        let options = {filter: {
            "_buildfire.index.array1.string1":{$in:indexes}
        }}
        ReactionsUI.search(options, (err, items) =>{
            return callback(err, items)
        })
    }
}


