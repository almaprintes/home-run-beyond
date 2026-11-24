import {BaseballGame} from './game.js?v=0.49.0';
const game=new BaseballGame();
// Exponer diagnóstico en ?debug=1 para pruebas, sin contaminar el modo jugador.
if(new URLSearchParams(location.search).has('debug'))window.hrbDebug={game,shot:()=>game.onAction(),levels:game.save.levels,renderer:game.renderer};
if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(console.warn));}