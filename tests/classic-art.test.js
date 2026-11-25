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

test('rubí y oceánico conservan el asset aprobado byte por byte',()=>{
 for(const [id,sha] of [['ruby','86e2bc75a07be3a080b8ff954d11bd89ced1d279'],['ocean','c0b8d1b695709499111c232f1e8c5c0ee451cb48']]){
  const source=readFileSync(new URL('../assets/approved/bats/'+id+'.webp',import.meta.url));
  const baked=readFileSync(new URL('../assets/baked/bats/'+id+'.webp',import.meta.url));
  assert.deepEqual(baked,source);assert.equal(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex'),sha);
 }
});

test('fibra de carbono: el archivo aprobado se conserva byte por byte',()=>{
 const source=readFileSync(new URL('../assets/approved/bats/carbono.webp',import.meta.url));
 const baked=readFileSync(new URL('../assets/baked/bats/carbono.webp',import.meta.url));
 assert.deepEqual(baked,source);assert.equal(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex'),'74a270f213b371e38ecdcaaa26b1cfda5204a563');
});

test('neón eléctrico: el archivo aprobado se conserva byte por byte',()=>{
 const source=readFileSync(new URL('../assets/approved/bats/neon.webp',import.meta.url));
 const baked=readFileSync(new URL('../assets/baked/bats/neon.webp',import.meta.url));
 assert.deepEqual(baked,source);assert.equal(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex'),'f60ef1693681a44d94a44a92a6ca1add4814b75c');
});

test('baguette crujiente: se publica el asset aprobado sin cambios de bytes',()=>{
 const source=readFileSync(new URL('../assets/approved/bats/baguette.webp',import.meta.url));
 const baked=readFileSync(new URL('../assets/baked/bats/baguette.webp',import.meta.url));
 assert.deepEqual(baked,source);assert.equal(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex'),'2cba0b5066b5e3781839645ff8453a7e54af924e');
});
