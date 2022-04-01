if (typeof (buildfire) == "undefined") throw ("please add buildfire.js first to use BuildFire services");
if (!buildfire.social) buildfire.social = {};


class Hashtag{
    constructor(data = {}){
        this.createdOn = new Date(); 
        this.createdBy = data.createdBy || "admin"; 
        this.name = data.name;
        this.usageCount = data.usageCount || 1;
        this._buildfire = {index:{
            // text
            array1 : [
                {string1 : 'name_' + data.name.toLowerCase()},

            ]
        }};
    }
}




class Hashtags{
    static TAG = "$$hashtag$$";

    static search = (options, callback) =>{
        buildfire.publicData.search(options, Hashtags.TAG, (err, r) =>{
            if(err) return callback(new Error(err));
            else{
                return callback(null, r);
            }
        })
    }


    static get = (name, callback) =>{
        buildfire.publicData.getById(name, Hashtags.TAG, (err, r) =>{
            if(err) return callback(new Error(err));
            else{
                return callback(null, r);
            }
        })
    }

    static use = (name, callback) =>{
        var searchThroughArrayOfObjects = {
            filter: {
              "_buildfire.index.array1.string1": `name_${name.toLowerCase()}`,
            },
        };
        buildfire.publicData.search(searchThroughArrayOfObjects , Hashtags.TAG, (err, r ) =>{
            if(err) return callback(err);
            else if(r && r.length > 0) return callback("Hashtag already exists");
            else {
                buildfire.publicData.insert(new Hashtag({name}), Hashtags.TAG, (err, r) =>{
                    if(err) return callback(err);
                    else return callback(null, r);
                })
            }
        });
    }

    static delete = (id, callback) =>{
        buildfire.publicData.getById(id, Hashtags.TAG, (err, r ) =>{
            if(err) return callback(err);
            else if(!r || (r && r.length == 0)) return callback(new Error("Couldn't find Hashtag with this ID"));
            else {
                buildfire.publicData.delete(id, Hashtags.TAG, (err, _) => {
                    if (err) return callback(new Error(err));
                    return callback(null, "Hashtag Deleted.");
                });
            }
        });
    }


}



buildfire.social.Hashtags = Hashtags;