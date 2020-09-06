module.exports.findAll = async function (client, dbName, collection, query) {
    const result =  await client.db(dbName).collection(collection).find(query);
    const arr    =  await result.toArray();
    return arr;
}

module.exports.findOne = async function(client, dbName, collection, query){
    return await client.db(dbName).collection(collection).findOne(query);
}

module.exports.insertOne = async function(client, dbName, collection, object) {
    const result = await client.db(dbName).collection(collection).insertOne(object);
    return result.insertedId;
}

module.exports.updateOne = async function(client, dbName, collection, query){
    return await client.db(dbName).collection(collection).updateOne(query);
}

module.exports.update = async function(client, dbName, collection, query1, query2){
    return await client.db(dbName).collection(collection).update(query1, query2);
}

module.exports.deleteOne = async function(client, dbName, collection, query){
    return await client.db(dbName).collection(collection).deleteOne(query);
}