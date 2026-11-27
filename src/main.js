import {BaseballGame} from './game.js?v=0.77.78';
import {installWorldStudio} from './world-studio.js?v=0.77.78';
const game=new BaseballGame();
installWorldStudio(game);
// Exponer diagnóstico en ?debug=1 para pruebas, sin contaminar el modo jugador.
if(new URLSearchParams(location.search).has('debug'))window.hrbDebug={game,shot:()=>game.onAction(),levels:game.save.levels,renderer:game.renderer};
if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(console.warn));}