#include <iostream>
#include <string>
#include <node.h>

const static std::string FIRE = "Fire";
const static std::string WATER = "Water";
const static std::string GRASS = "Grass";

/*
args0: type of first pokemon
args1: type of second pokemon
Return -1, 0, 1 if first pokemon lost, tie, or won the fight.
*/
void Fight(const v8::FunctionCallbackInfo<v8::Value> &args){
    v8::Isolate *isolate = args.GetIsolate();

    v8::String::Utf8Value t1(isolate, args[0]);
    v8::String::Utf8Value t2(isolate, args[1]);
    
    std::string type1(*t1);
    std::string type2(*t2);

    if(type1 == type2){
         args.GetReturnValue().Set(0);
         return;
    }

    //Fire beats grass, water beats fire, grass beats water
    bool type1_win = (type1 == FIRE and type2 == WATER) or 
                        (type1 == WATER and type2 == FIRE) or 
                        (type1 == GRASS and type2 == WATER);

    if(type1_win)
        args.GetReturnValue().Set(1);
    else
        args.GetReturnValue().Set(-1);
}

void init(v8::Local<v8::Object> exports) {
    NODE_SET_METHOD(exports, "fight", Fight);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, init)



