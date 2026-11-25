import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('el bate clásico aprobado se publica byte por byte, no se vuelve a dibujar',()=>{
 const source=readFileSync(new URL('../assets/approved/bats/classic.webp',import.meta.url));
 const baked=readFileSync(new URL('../assets/baked/bats/classic.webp',import.meta.url));
 assert.deepEqual(baked,source);
 assert.equal(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex'),'68ea7a9d6e13d8a43dfac671c2e8afc3a7b33680');
 const generator=readFileSync(new URL('../tools/build_cosmetics.py',import.meta.url),'utf8');
 assert.match(generator,/if not nobat:baked=apply_classic_bat/);
});

test('bate dorado: se conserva el archivo aprobado con el mismo tamaño de lienzo',()=>{
 const source=readFileSync(new URL('../assets/approved/bats/gold.webp',import.meta.url));
 const baked=readFileSync(new URL('../assets/baked/bats/gold.webp',import.meta.url));
 assert.deepEqual(baked,source);
 assert.equal(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex'),'71a12aee45fbfcf6ebbbacff5f7ad77f7ff9ee6b');
});
