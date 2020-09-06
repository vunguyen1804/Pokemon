async function main(){
    const express = require("express");
    const bodyParser = require("body-parser");
    const mongo = require('mongodb')
    const {MongoClient} = require('mongodb');

    var app = express();
    var addon = require('./build/Release/AddOn');
    var flash = require('connect-flash');

    const POKEMON_COLLECTION = "Pokemon";
    const TRAINERS_COLLECTION = "Trainers";
    const DB_NAME = "assignment";
    const URI = "mongodb+srv://bob:<password>@cluster0.wc2k2.azure.mongodb.net/<dbname>?retryWrites=true&w=majority"
    const CLIENT = new MongoClient(URI, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    });
    
    const methodOverride = require("method-override");
    const {findAll, findOne, insertOne, deleteOne} = require("./public/database");
    const {mapPokemonToID, mapPokemonToOwner} = require("./public/utility");

    app.use(require("express-session")({
        secret: "UCSD is the best!",
        resave: false,
        saveUninitialized: false
    }));

    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.set("view engine", "ejs");
    app.use(methodOverride("_method"));
    app.use(flash());

    // Connect to the MongoDB cluster
    try {
        await CLIENT.connect({
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("DB Connected");
    } catch (e) {
        console.error(e);
    }

    // GET route
    app.get('/index', async (req, res) => {
        try{
            const pokemon    = await findAll(CLIENT, DB_NAME, POKEMON_COLLECTION, "");
            const trainers   = await findAll(CLIENT, DB_NAME, TRAINERS_COLLECTION, "")
            const pokemonMap = await mapPokemonToID(pokemon);
            const owners     = await mapPokemonToOwner(trainers, pokemonMap);
            
            res.render("index", {
                pokemon: pokemon,
                trainers: trainers,
                owners: owners,
                message: req.flash("message")
            });
        }catch(err){
            console.log(err);
        }
    })
    
    // GET: Landing page
    app.get('/', (req, res) => {
        res.redirect("/index");
    });

    // NEW -  pokemon route
    app.get('/:trainerID/new', (req,  res) => {  
        res.render("newpokemon", {
            trainerID : req.params.trainerID,
            message: req.flash("message")
        });
    });

    // NEW -  trainer route
    app.get('/new', (req,  res) => {  
        res.render("newtrainer", {message: req.flash("message")});
    });

    app.put("/fight", async (req, res) => {
        try{
            var _id1 = new mongo.ObjectID(req.body.id1);
            var _id2 = new mongo.ObjectID(req.body.id2);
            var pokemon1 = await findOne(CLIENT, DB_NAME, POKEMON_COLLECTION, {_id:_id1});
            var pokemon2 = await findOne(CLIENT, DB_NAME, POKEMON_COLLECTION, {_id:_id2});
            var result = addon.fight(pokemon1.Type, pokemon2.Type);
            var outcome = "Tie!";
    
            if(result === 1){
                outcome = `${pokemon1.Name} Wins!`;
            }else if (result === -1){
                outcome = `${pokemon2.Name} Wins!`;
            }
    
            res.render("fight", {
                pokemon1: pokemon1, 
                pokemon2: pokemon2, 
                outcome: outcome, 
                message: req.flash("message")
            });

        }catch(err){
            console.log(err);
        }
    });

    // POST: adding new trainer
    app.put("/" , async (req, res) => {
        await insertOne(CLIENT, DB_NAME, TRAINERS_COLLECTION, {
            Name: req.body.Name,
            Img: req.body.Img,
            Pokemon_owned: []
        });

        res.redirect("/");
    });

    app.put("/search", async (req, res) => {
        var query = req.body.query;
        
        // try to search for pokemon whose name is query
        var pokemon = await findAll(CLIENT, DB_NAME, POKEMON_COLLECTION, {Name:query});

        // extracting pokemon id's:
        var ids = Array();

        pokemon.forEach(pet =>{
            ids.push(pet.ID);
        });

        // find trainers whose Pokemon_owned contains ids:
        var trainers1 = await findAll(CLIENT, DB_NAME, TRAINERS_COLLECTION, {
            Pokemon_owned: { $elemMatch: {$in: ids} } 
        });

        // try to search for trainer whose name is query
        var trainers2 = await findAll(CLIENT, DB_NAME, TRAINERS_COLLECTION, {Name:query});

        // combine result:
        var result = new Set();

        trainers1.forEach(trainer => {
            result.add(trainer);
        })

        trainers2.forEach(trainer => {
            result.add(trainer);
        })

        res.render("search", {
            result:result,
            query: query,
            message: req.flash("message")
        });
    });

    // POST: adding new pokemon
    app.put("/:trainerID" , async (req, res) =>{
        var ID = Number(req.body.ID);
        var result = await findOne(CLIENT, DB_NAME, POKEMON_COLLECTION, {ID:ID});
        var trainerID = req.params.trainerID.slice(1);
        var trainerRef = new mongo.ObjectID(trainerID);
            
        // if new pokemon doesn't exist
        if(!result){
            await insertOne(CLIENT, DB_NAME, POKEMON_COLLECTION, {
                ID: ID,
                Name: req.body.Name,
                Img: req.body.Img,
                Type: req.body.Type,
                Move: req.body.Move
            });

            //await updateOne(CLIENT, DB_NAME, TRAINERS_COLLECTION, {_id: trainerRef}, {$push: {"Pokemon_owned": ID}});
            await CLIENT.db(DB_NAME)
                        .collection(TRAINERS_COLLECTION)
                        .updateOne({_id: trainerRef}, {$push: {"Pokemon_owned": ID}}
            );

            res.redirect("/index");
        }else{
            req.flash('message', `Pokemon with ID # ${ID} already exists`);
            res.redirect("/index");
        }
    });
    
    
    // DELETE pokemon route
    app.delete('/:trainerID/:pokemonID', async (req,  res) => {  
        var trainerRef = new mongo.ObjectID(req.params.trainerID);
        var pokemonRef = new mongo.ObjectID(req.params.pokemonID);
        var pokemon = await findOne(CLIENT, DB_NAME, POKEMON_COLLECTION, {_id: pokemonRef} )
        var ID = pokemon.ID;

        // Update trainer: remove pokemon's ID from trainer's Pokemon_owned array
        await update(CLIENT, DB_NAME, TRAINERS_COLLECTION,
            { _id: trainerRef}, { $pull: {Pokemon_owned: ID}},
        );

        // await CLIENT.db(DB_NAME).collection(TRAINERS_COLLECTION).update(
        //     {_id: trainerRef},{ $pull: {Pokemon_owned: ID} },
        // );

        // remove pokemon from pokemon collection

        await deleteOne(CLIENT, DB_NAME, POKEMON_COLLECTION, {_id: pokemonRef});
        // await CLIENT.db(DB_NAME).collection(POKEMON_COLLECTION).deleteOne({_id: pokemonRef});

        // redirect to main page
        res.redirect("/index");
    });

    // DELETE trainer route
    app.delete('/:trainerID', async (req,  res) => {  
        var trainerRef = new mongo.ObjectID(req.params.trainerID);
        var trainer = await findOne(CLIENT, DB_NAME, TRAINERS_COLLECTION, {_id: trainerRef})

        // only delete if trainer doesn't own any pokemon
        if(trainer.Pokemon_owned.length === 0){
            await deleteOne(CLIENT, DB_NAME, TRAINERS_COLLECTION, {_id: trainerRef});
            //await CLIENT.db(DB_NAME).collection(TRAINERS_COLLECTION).deleteOne({_id: trainerRef});
        }else{
            req.flash('message', 'Cannot delete trainer who is owning some pokemon.')
        }

        res.redirect("/");
    });

    app.listen(3000, () => {
        console.log(`Listening to port 3000`)
    })
}

main();