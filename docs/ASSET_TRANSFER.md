# Protocolo de transferencia de assets binarios — CraftRace Studio
1. Preparar el asset definitivo con las dimensiones, transparencia y anclajes del juego.
2. Codificar los bytes en Base64 (por ejemplo Python: base64.b64encode). Guardar en texto, con líneas cortas para facilitar la lectura.
3. Subir el texto temporal a la Biblioteca y leerlo mediante la herramienta de archivos. Concatenar líneas, sin espacios; para archivos grandes usar partes numeradas y comprobar que no se truncan.
4. Crear el blob de GitHub con encoding=base64. Comprobar SHA-1 de Git: hash de b'blob '+str(len(data)).encode()+b'\0'+data.
5. Crear árbol con la ruta y SHA, commit sobre el HEAD vigente y actualizar ref sin force. Los assets aprobados deben quedar en una ruta fuente persistente y el generador debe copiarlos sin sobrescribirlos.
6. Validar compilación, publicación y caché en dispositivo. Un blob sin árbol no es una publicación.
7. Eliminar el texto temporal de la Biblioteca si ya no es necesario.
Primer asset: bate clásico, 320x116 WebP, 5920 bytes, blob 68ea7a9d6e13d8a43dfac671c2e8afc3a7b33680.
