# Galeria Botànica App (editor local)

Aplicació HTML/JS autònoma per crear i editar el catàleg (`plantes.json`) i gestionar les imatges sense haver d’entrar al WordPress.

![Pantalla principal](../docs/app-screenshot.png)

## Com executar-la

```bash
# requisit: Node >= 18 o Python 3
cd local-app
# Opció A) amb serve:
npx serve .

# Opció B) amb Python:
python -m http.server 8000
```

A continuació obre `http://localhost:8000/galeria-botanica-app.html` en un navegador **Chrome / Edge 2023+** (necessita File System Access API).

## Funcions clau

| Funció                | Descripció                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| Importar JSON         | Carrega un catàleg existent i el mostra a l’editor.                         |
| Mode File System      | Obre el JSON amb permisos de lectura/escriptura per desar-lo directament.   |
| Editor visual         | Formulari complet (nom, família, característiques, imatges, coordenades).   |
| Drag & Drop d’imatges | Classificació automàtica segons el patró de nom de fitxer.                  |
| Exports               | Descarrega `plantes.json` i scripts de canvi de nom d’imatges.              |

## Desplegament opcional

Pots empaquetar‑la amb **Electron** per obtenir una app d’escriptori offline.