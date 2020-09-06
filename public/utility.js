module.exports.mapPokemonToID = async function(pokemon){
    map = new Map();

    pokemon.forEach(animal => map.set(
        animal.ID, {
            "_id" : animal._id,
            "Name": animal.Name,
            "Move": animal.Move,
            "Type": animal.Type,
            "Img" : animal.Img
        })
    );

    return map;
}

module.exports.mapPokemonToOwner = async function(trainers, pokemonMap){
    var owners = new Map();

    trainers.forEach(trainer => {
        ids = trainer.Pokemon_owned;
        owners[trainer._id] = new Map();
        
        ids.forEach((id) => {      
            const key = Number(id);
            owners[trainer._id].set(key, pokemonMap.get(key));
        }); 
    });

    return owners;
}
