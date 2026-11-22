import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{
  try{
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/')name='/index.html';
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep))throw Error('Invalid path');
    const info=await stat(file);if(!info.isFile())throw Error('Not file');
    res.writeHead(200,{'Content-Type':mimes[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Cross-Origin-Resource-Policy':'same-origin'});
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found')}
}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Home Run Beyond: http://localhost:'+(process.env.PORT||4173)));