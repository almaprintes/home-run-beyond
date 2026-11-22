from pathlib import Path
from html import escape
import re,base64
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
css=(root/'style.css').read_text()
js=''
for name in ['engine','world','logic','audio','game']:
 source=(root/'src'/f'{name}.js').read_text()
 source=re.sub(r'^import .*?;\s*$', '', source, flags=re.M)
 source=re.sub(r'\bexport (const|class|function)\b',r'\1',source)
 js+='\n'+source
js+='\nconst game = new BaseballGame();window.hrbDebug={game,renderer:game.renderer};'
# La edición de un solo archivo no registra un SW inexistente ni exige conexión.
html=html.replace('<link rel="manifest" href="./manifest.webmanifest"/>','')
icon=base64.b64encode((root/'icons/icon-192.png').read_bytes()).decode()
html=html.replace('./icons/icon-192.png','data:image/png;base64,'+icon)
html=html.replace('<link rel="stylesheet" href="./style.css"/>','<style>'+css+'</style>')
html=html.replace('<script type="module" src="./src/main.js"></script>','<script>'+js+'</script>')
html=html.replace('<title>Home Run Beyond ⚾</title>','<title>Home Run Beyond ⚾ — Prueba autónoma</title>')
output=Path('/mnt/data/home-run-beyond-play.html');output.write_text(html)
print('standalone file',output,output.stat().st_size,'bytes')