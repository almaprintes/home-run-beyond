import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const iconFiles=[
 [32,'3ebf2f9935ed71f84d8d5bd1a156628d0e4d3bc1ca5242812f047c0132fd2fb1'],
 [180,'740d513631c54da081ed2700abf03e86b27b85b06d7fa6af3fbe58fec8bc48fc'],
 [192,'c493f34764cf8560f333bdc05393912e8f5d7173b018d3d586a0d9b0f781e055'],
 [512,'35e088146cd467a08625587e82dea109ae676dc28ff554f65330bdb346044915']
];
test('icono del impacto aprobado: PNG real y consistente en todos los tamaños',()=>{
 for(const [size,hash] of iconFiles){
  const bytes=readFileSync(new URL(`../icons/icon-${size}.png`,import.meta.url));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),size,'ancho '+size);
  assert.equal(bytes.readUInt32BE(20),size,'alto '+size);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,
   'la imagen no debe sustituirse por el icono antiguo');
 }
});
test('PWA, Safari e iPhone usan los iconos nuevos con caché renovada',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 assert.match(html,/rel="apple-touch-icon" sizes="180x180" href="\.\/icons\/icon-180\.png\?v=0\.76\.0"/);
 assert.match(html,/rel="icon" type="image\/png" sizes="32x32" href="\.\/icons\/icon-32\.png\?v=0\.76\.0"/);
 assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest\?v=0\.76\.0"/);
 assert.deepEqual(manifest.icons.map(icon=>icon.src),[
  './icons/icon-192.png?v=0.76.0','./icons/icon-512.png?v=0.76.0'
 ]);
 assert.match(sw,/hrb-v76-20261125-neon-traffic-total/);
 for(const size of [32,180,192,512]){
  assert.ok(sw.includes(`./icons/icon-${size}.png?v=0.76.0`),
   'pre-caché del icono '+size);
 }
 assert.match(sw,/\.\/manifest\.webmanifest\?v=0\.76\.0/);
});
test('botón VOLVER A BATEAR es CTA principal, no un botón secundario gris',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(html,/id="again" class="rest-again"[^>]*>VOLVER A BATEAR/);
 assert.match(css,/#again\.rest-again\s*\{/);
 assert.match(css,/background:linear-gradient\(115deg,#fff6ad/);
 assert.match(css,/min-height:68px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{#again\.rest-again\{animation:none\}\}/);
 assert.match(html,/id="shots-hud"/);
 assert.match(html,/id="best-hud"/);
});
