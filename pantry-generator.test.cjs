const {test} = require('node:test');
const assert = require('node:assert/strict');
require('./data.js');
require('./logic.js');
const KA = globalThis.KA;
const prefs = {persons:2,diets:[],dislikes:[],maxTime:60,maxDiff:3};
test('generates a new editable recipe exclusively from available ingredients without mutating pantry',()=>{
 const pantry={reis:200,zucchini:2,tofu:300}; const before=JSON.stringify(pantry);
 const out=KA.generatePantryRecipe(pantry,prefs).recipe;
 assert.ok(out); assert.equal(out.serv,2); assert.ok(out.steps.length>=3);
 for(const i of out.ings){const ing=KA.findIng(i.name); assert.ok(ing); assert.ok(i.qty<=pantry[ing.id]);}
 assert.equal(JSON.stringify(pantry),before);
});
test('exact quantities reduce portions and do not invent missing food',()=>{
 const r=KA.generatePantryRecipe({reis:80,zucchini:1},prefs).recipe;
 assert.equal(r.serv,1); assert.equal(r.ings.find(i=>i.name==='Reis').qty,80);
});
test('vegan, dislikes and macro filters apply',()=>{
 const pantry={eier:6,reis:200,zucchini:2,tofu:400};
 for(let n=0;n<5;n++){
 const r=KA.generatePantryRecipe(pantry,{...prefs,diets:['vegan'],dislikes:['tofu']},n).recipe;
 assert.ok(r); assert.ok(r.ings.every(i=>!['Eier','Tofu'].includes(i.name)));
 }
 const p={...prefs,diets:['highprotein']};
 const r=KA.generatePantryRecipe({eier:6,zucchini:2,tofu:400},p).recipe;
 assert.ok(r); const ingredients=r.ings.map(i=>[KA.findIng(i.name).id,i.qty]);
 assert.ok(KA.recipeMatches({id:'macro-test',name:r.title,s:r.serv,time:r.time,diff:1,i:ingredients,user:true},p));
});
test('breakfast uses fruit and does not mix vegetables into porridge',()=>{
 const r=KA.generatePantryRecipe({haferflocken:200,bananen:2,karotten:10}, {...prefs,maxTime:15}).recipe;
 assert.equal(r.cat,'Frühstück'); assert.ok(!r.ings.some(i=>i.name==='Karotten'));
});
test('empty, unknown, excluded or insufficient stock produces an actionable error',()=>{
 for(const pantry of [{},{mystery:100},{reis:1,zucchini:0.01},{salz:100}]) assert.ok(KA.generatePantryRecipe(pantry,prefs).error);
 assert.ok(KA.generatePantryRecipe({haferflocken:200,bananen:3},{...prefs,diets:['glutenfrei']}).error);
});
test('alternate suggestions differ and only-own filter permits generated recipes',()=>{
 const pantry={reis:200,zucchini:2,eier:6};
 const a=KA.generatePantryRecipe(pantry,{...prefs,onlyMine:true},0);
 const b=KA.generatePantryRecipe(pantry,prefs,1);
 assert.ok(a.count>1); assert.notEqual(a.recipe.title,b.recipe.title);
});
