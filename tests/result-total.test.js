import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialSave,settleShot,sanitizeSave} from '../src/logic.js';
test('distancia acumulada persistente y visible tras golpe y strike',()=>{
 const save=initialSave();settleShot(save,125);settleShot(save,270);
 assert.equal(sanitizeSave(JSON.parse(JSON.stringify(save))).totalMeters,395);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/DISTANCIA ACUMULADA <strong id="result-total-meters"/);
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.equal(game.split("el('result-total-meters').textContent=formatInt(this.save.totalMeters||0)+' m';").length,3);
});
