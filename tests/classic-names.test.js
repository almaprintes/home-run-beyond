import test from 'node:test';
import assert from 'node:assert/strict';
import {OUTFIT_CATALOG} from '../src/cosmetic-catalog.js';
test('nombres coherentes de equipaciones básicas con IDs y precios intactos',()=>{
 for(const [id,name,price] of [['red','Clásico rojo',0],['blue','Clásico azul',350],['green','Clásico verde',780],['purple','Clásico violeta',780],['gold','Dorado campeón',2400]]){
 const item=OUTFIT_CATALOG.find(x=>x.id===id);assert.equal(item.name,name);assert.equal(item.price,price);
 }
});
