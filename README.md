# Galeria Botànica · WordPress plug‑in & Local App

**Galeria Botànica** és un projecte complet que facilita mostrar i mantenir un catàleg botànic interactiu en qualsevol web WordPress (per exemple, la Universitat Autònoma de Barcelona).  
Consta de dos components independents però complementaris:

| Carpeta | Què és | Funciona a |
|---------|--------|-----------|
| **`wp-plugin/`** | Plug‑in WordPress *Galeria Botànica UAB* | WordPress (frontend i admin) |
| **`local-app/`** | App web “Galeria Botànica App” per editar dades i imatges | Qualsevol navegador modern (servei local) |
| **`dades/`** | Catàleg `plantes.json` + carpeta `imatges/` | Compartida entre l’app i el plug‑in |

---

## Estructura del repositori

```
/
├── README.md               ← aquest fitxer
├── LICENSE                 ← MIT (codi)
├── LICENSE.DATA            ← CC BY 4.0 (dades i fotografies)
├── wp-plugin/              ← plug‑in WP
│   ├── galeria-botanica-uab.php
│   ├── mapa-botanica-uab.php
│   └── assets/…            ← .css .js i imatges
├── local-app/              ← app HTML/JS autònoma
│   └── galeria-botanica-app.html
└── dades/                  ← base de dades
    └── plantes.json

```

---

## Instal·lació ràpida

1. **Clona o descarrega** aquest repositori.
2. **WordPress**  
   * Puja la carpeta **`wp-plugin`** sencera a `wp-content/plugins/`.  
   * Activa **Galeria Botànica UAB** des del panell d’administració.
3. **Dades**  
   * Copia `dades/plantes.json` i la carpeta `dades/imatges/` dins la mateixa carpeta del plug‑in (`wp-plugin/`).  
   * El codi ja apunta automàticament a aquesta ruta.
4. **Local App (opcional, però recomanada)**  
   * Serveix `local-app/` amb un servidor local (p. ex. `npx serve local-app`) i obre `galeria-botanica-app.html`.  
   * Edita el catàleg de manera visual i desa’l; el fitxer JSON es pot pujar al WordPress o obrir-lo amb la File System API.

---

## Ús al WordPress

| Shortcode | Descripció | Atributs principals |
|-----------|------------|---------------------|
| `[galeria_botanica]` | Galeria de targetes amb filtre + modal de detalls | `tipus`, `limit` |
| `[mapa_botanica]`    | Mapa interactiu (Leaflet) amb clústers | `altura`, `filtre_inicial`, `zoom_inicial` |

Exemple mínim:

```wp
[galeria_botanica limit="12"]
[mapa_botanica altura="500px" filtre_inicial="arbre"]
```

---

## Bones pràctiques i fitxers recomanats

* README principal + READMEs de subcarpeta
* Fitxers de llicència MIT (`LICENSE`) i CC BY 4.0 (`LICENSE.DATA`)
* `.gitignore` actualitzat
* (Opcional) `CONTRIBUTING.md` i `CODE_OF_CONDUCT.md`

---

## Enllaços ràpids

* **Plug‑in:** [`wp-plugin/README.md`](./wp-plugin/README.md)  
* **App local:** [`local-app/README.md`](./local-app/README.md)  
* **Dades:** [`dades/README.md`](./dades/README.md)
