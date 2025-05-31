/* ----------------------------------------------------------------
 * MAPA BOTÀNICA UAB – script completament revisat
 * Versió 2.6 (maig 2025)
 * – Correcció del filtratge real de marcadors –
 * – Afegit modal per als detalls de plantes igual que a la galeria –
 * – Correcció de l'ID de planta per evitar l'error "No s'ha trobat la planta" –
 * – Botó "Veure a la galeria" canviat a "Veure detalls" amb funcionalitat de modal –
 *----------------------------------------------------------------*/

jQuery(document).ready(function($) {
  console.log("Inicialitzant mapa botànica UAB...");

  /* ========================= 1. MAPA ========================== */
  const map = L.map('mapa-botanica').setView([41.50085, 2.09342], 16);

  const baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap | Flora UAB',
    maxZoom: 19,
  }).addTo(map);

  const baseSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles © Esri',
      maxZoom: 19,
    }
  );

  L.control.layers({ Mapa: baseOSM, 'Satèl·lit': baseSat }).addTo(map);

  /* ---------- Clúster de marcadors ---------- */
  const markers = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
  });

  /* ---------- Helpers i Utilitats ---------- */
  // Funció segura per treballar amb strings
  function safeString(str) {
    if (str === undefined || str === null) return '';
    return String(str);
  }

  // Funció per normalitzar text
  function normalitzaText(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, '') // eliminar text entre parèntesis
      .replace(/\s+/g, '_');         // substituir espais per guions baixos
  }
  
  // Funció per convertir l'ID de planta a un format vàlid per al PHP
  function formatPlantaId(id) {
    if (!id) return '';
    
    // Convertir a string si no ho és
    const idStr = String(id);
    
    // Substitució per compatibilitat amb funcions PHP
    return idStr.toLowerCase()
      .replace(/\s+/g, '_')  // Espais a guions baixos
      .replace(/[^a-z0-9_-]/g, '');  // Només lletres, números, guions i guions baixos
  }

  /* ---------- Icones personalitzades ---------- */
  function crearIcona(tipus) {
    let emoji = '🌱', color = '#28a745';
    switch (tipus) {
      case 'arbre':
        emoji = '🌳';
        color = '#228b22';
        break;
      case 'arbust':
        emoji = '🌲';
        color = '#32cd32';
        break;
      case 'herba':
        emoji = '🌾';
        color = '#90ee90';
        break;
      case 'liana':
        emoji = '🌿';
        color = '#32cd32';
        break;
    }
    return L.divIcon({
      html: `<div class="marcador-planta" style="border-color:${color}">${emoji}</div>`,
      iconSize: [35, 35],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20],
      className: '',
    });
  }

  /* ---------- Pop‑up ---------- */
  function crearPopup(p) {
  // Assegurar-nos que l'ID està en el format correcte
  const plantaId = p.id || formatPlantaId(p.nom_cientific);
  
  // Funció per reemplaçar guions baixos amb espais per visualització
  function formatVisual(text) {
    if (!text) return '';
    return String(text).replace(/_/g, ' ');
  }
  
  // DEBUG: Registrar l'ID de la planta per verificar que s'està generant correctament
  console.log("Creant popup per a planta:", {
    id_original: p.id,
    nom_cientific: p.nom_cientific,
    id_formatat: plantaId
  });
  
  // Utilitzar # com a href i afegir data-planta-id per capturar l'event
  return `
    <div class="planta-popup">
      ${p.imatge ? `<img src="${p.imatge}" alt="${safeString(p.nom_comu)}" class="planta-popup-imatge">` : ''}
      <h3>${safeString(p.nom_comu)}</h3>
      <p class="nom-cientific">${safeString(p.nom_cientific)}</p>
      <div class="planta-popup-info">
        <p><strong>Família:</strong> ${safeString(p.familia)}</p>
        ${(p.habitat && p.habitat.length) ? 
          `<p><strong>Hàbitat:</strong> ${Array.isArray(p.habitat) ? 
            formatVisual(safeString(p.habitat[0])) : 
            formatVisual(safeString(p.habitat))}</p>` : ''}
        ${p.floracio?.length ? 
          `<p><strong>Floració:</strong> ${Array.isArray(p.floracio) ? 
            p.floracio.map(f => formatVisual(safeString(f))).join(', ') : 
            formatVisual(safeString(p.floracio))}</p>` : ''}
        ${p.fullatge ? 
          `<p><strong>Fullatge:</strong> ${formatVisual(safeString(p.fullatge))}</p>` : ''}
      </div>
      <a href="#" class="boto-veure-detalls" data-planta-id="${plantaId}" data-planta-nom="${safeString(p.nom_cientific)}">Veure detalls</a>
    </div>`;
}

  /* ---------- Càrrega de marcadors ---------- */
  const totsElsMarcadors = [];

  // DEBUG: Imprimir el primer element de dades per verificar l'estructura
  if (mb_vars && mb_vars.dades_plantes && mb_vars.dades_plantes.length > 0) {
    console.log("Exemple de dades de planta:", mb_vars.dades_plantes[0]);
  }

  if (mb_vars && mb_vars.dades_plantes) {
    console.log("Carregant dades de plantes:", mb_vars.dades_plantes.length, "plantes");
    mb_vars.dades_plantes.forEach((planta) => {
      // Assegurar-se que les dades normalitzades existeixen
      planta.habitat_norm = planta.habitat_norm || [];
      planta.floracio_norm = planta.floracio_norm || [];
      planta.usos_norm = planta.usos_norm || [];
      
      // Assegurar-se que la planta té un ID vàlid
      if (!planta.id) {
        planta.id = formatPlantaId(planta.nom_cientific);
      }
      
      planta.coordenades.forEach((coord) => {
        const m = L.marker([coord.lat, coord.lng], { icon: crearIcona(planta.tipus) });
        m.bindPopup(crearPopup(planta));
        m.plantaData = planta; // info per als filtres
        markers.addLayer(m);
        totsElsMarcadors.push(m);
      });
    });
  } else {
    console.error("Error: No s'han rebut dades de plantes");
  }

  map.addLayer(markers);

  /* ====================== 2. FILTRES ======================= */
  // Estat global (multi‑select com la galeria)
  const filtresActius = {
    tipus: 'tots',
    habitat: 'tots',
    floracio: 'tots',
    usos: 'tots',
    fullatge: 'tots'
  };

  /* ---------- Helpers ---------- */
  // Funció per verificar si s'han seleccionat totes les opcions d'un filtre
  function verificarTotesOpcionsSeleccionades(grupFiltre) {
    // Obtenir tots els botons del grup (excepte el botó "tots")
    const botonsGrup = $(`.filtre-boto[data-group="${grupFiltre}"]:not([data-filtre="tots"])`);
    const botonsActius = $(`.filtre-boto[data-group="${grupFiltre}"].actiu:not([data-filtre="tots"])`);
    
    // Si tots els botons estan actius (excepte "tots")
    if (botonsGrup.length > 0 && botonsGrup.length === botonsActius.length) {
      console.log(`Totes les opcions del grup ${grupFiltre} estan seleccionades`);
      return true;
    }
    
    return false;
  }

  // Funció per activar el botó "Tots" d'un grup específic
  function activarBotoTots(grupFiltre) {
    console.log(`Activant botó "Tots" del grup ${grupFiltre}`);
    // Desactivar tots els botons del grup
    $(`.filtre-boto[data-group="${grupFiltre}"]`).removeClass('actiu');
    
    // Activar només el botó "tots"
    $(`.filtre-boto[data-group="${grupFiltre}"][data-filtre="tots"]`).addClass('actiu');
    
    // Actualitzar l'objecte de filtres actius
    filtresActius[grupFiltre] = 'tots';
  }

  /* ---------- Actualitza objecte filtresActius ---------- */
  function actualitzarFiltresActius() {
    try {
      // Per a cada grup de filtres, recollir els valors actius
      ['tipus', 'habitat', 'floracio', 'usos', 'fullatge'].forEach(grup => {
        // Si el botó "tots" està actiu, guardar 'tots'
        if ($(`.filtre-boto[data-group="${grup}"][data-filtre="tots"]`).hasClass('actiu')) {
          filtresActius[grup] = 'tots';
        } else {
          // Si no, recopilar tots els valors actius
          const filtresGrup = $(`.filtre-boto[data-group="${grup}"].actiu:not([data-filtre="tots"])`);
          
          if (filtresGrup.length === 0) {
            filtresActius[grup] = 'tots';
          } else {
            const valors = [];
            filtresGrup.each(function() {
              const filtre = $(this).data('filtre');
              if (filtre) valors.push(filtre);
            });
            filtresActius[grup] = valors.length > 0 ? valors : 'tots';
          }
        }
      });
      
      console.log("Filtres actius actualitzats:", JSON.stringify(filtresActius, null, 2));
    } catch (error) {
      console.error("Error en actualitzarFiltresActius:", error);
      // Restablir a valors predeterminats en cas d'error
      Object.keys(filtresActius).forEach(key => filtresActius[key] = 'tots');
    }
  }

  /* ---------- Mostrar filtres actius ---------- */
  function mostrarFiltresActius() {
    try {
      const $contenidor = $('.filtres-actius').empty();
      let hiHaFiltresActius = false;
      
      // Mostrar els filtres actius per a cada grup
      Object.entries(filtresActius).forEach(([grup, valors]) => {
        if (valors !== 'tots') {
          hiHaFiltresActius = true;
          
          // Establir text per al grup
          let grupText = '';
          switch (grup) {
            case 'tipus': grupText = 'Tipus'; break;
            case 'habitat': grupText = 'Hàbitat'; break;
            case 'floracio': grupText = 'Floració'; break;
            case 'usos': grupText = 'Usos'; break;
            case 'fullatge': grupText = 'Fullatge'; break;
            default: grupText = grup.charAt(0).toUpperCase() + grup.slice(1);
          }
          
          // Convertir a array si no ho és
          const valorsArray = Array.isArray(valors) ? valors : [valors];
          
          // Afegir cada filtre actiu
          valorsArray.forEach(valor => {
            if (valor) {
              // Formatar text del valor (només majúscula inicial i substituir _ per espais)
              const valorStr = safeString(valor);
              const valorText = valorStr.charAt(0).toUpperCase() + valorStr.slice(1).replace(/_/g, ' ');
              
              // Crear etiqueta de filtre
              const etiquetaHTML = `<span class="filtre-actiu" data-group="${grup}" data-filtre="${valorStr}">
                ${grupText}: ${valorText} <span class="eliminar-filtre">×</span>
              </span>`;
              
              $contenidor.append(etiquetaHTML);
            }
          });
        }
      });
      
      // Mostrar o ocultar el botó de neteja segons si hi ha filtres actius
      if (hiHaFiltresActius) {
        $('.netejar-filtres').show();
      } else {
        $('.netejar-filtres').hide();
      }
    } catch (error) {
      console.error("Error en mostrarFiltresActius:", error);
      // En cas d'error, simplement ocultar el botó
      $('.netejar-filtres').hide();
    }
  }

  /* ---------- Filtra marcadors ---------- */
  function aplicarFiltres() {
    try {
      console.log("Aplicant filtres:", JSON.stringify(filtresActius, null, 2));
      
      // Primer netejar tots els marcadors
      markers.clearLayers();
      
      // Obtenir el text de cerca si existeix
      const textCerca = safeString($('#mapa-cerca').val()).toLowerCase().trim();
      
      // Per cada marcador, aplicar tots els filtres
      let comptadorVisible = 0;
      let comptadorFiltrats = 0;
      
      totsElsMarcadors.forEach(m => {
        if (!m || !m.plantaData) {
          console.warn("Marcador sense dades:", m);
          return; // Saltar aquest marcador
        }
        
        comptadorFiltrats++;
        const planta = m.plantaData;
        let passaFiltres = true;
        
        // DEBUG: Verificar primer marcador per veure com aplicar els filtres
        if (comptadorFiltrats === 1) {
          console.log("Verificant primer marcador:", planta.nom_comu);
          console.log("- Tipus:", planta.tipus);
          console.log("- Habitat_norm:", planta.habitat_norm);
          console.log("- Floracio_norm:", planta.floracio_norm);
          console.log("- Usos_norm:", planta.usos_norm);
          console.log("- Fullatge:", planta.fullatge);
        }
        
        // Filtre de tipus de planta
        if (filtresActius.tipus !== 'tots') {
          const filtresArray = Array.isArray(filtresActius.tipus) ? filtresActius.tipus : [filtresActius.tipus];
          passaFiltres = passaFiltres && filtresArray.includes(planta.tipus);
        }
        
        // Filtre d'hàbitat (INCLUSIU - ha de tenir ALGUN dels hàbitats seleccionats)
        if (passaFiltres && filtresActius.habitat !== 'tots') {
          const filtresArray = Array.isArray(filtresActius.habitat) ? filtresActius.habitat : [filtresActius.habitat];
          
          // Si no té dades d'hàbitat normalitzades, intenta normalitzar-les ara
          const habitats_norm = planta.habitat_norm || [];
          
          if (habitats_norm.length === 0 && Array.isArray(planta.habitat)) {
            // Intentar normalitzar manualment
            planta.habitat.forEach(h => {
              if (h) habitats_norm.push(normalitzaText(h));
            });
          }
          
          // Si encara no hi ha dades, no passa el filtre
          if (habitats_norm.length === 0) {
            passaFiltres = false;
          } else {
            // Comprovar si algun hàbitat de la planta coincideix amb els filtres actius
            let passaHabitat = false;
            for (const hab of habitats_norm) {
              if (filtresArray.includes(hab)) {
                passaHabitat = true;
                break;
              }
            }
            passaFiltres = passaFiltres && passaHabitat;
          }
        }
        
        // Filtre de floració (similar a hàbitat)
        if (passaFiltres && filtresActius.floracio !== 'tots') {
          const filtresArray = Array.isArray(filtresActius.floracio) ? filtresActius.floracio : [filtresActius.floracio];
          
          // Si no té dades de floració normalitzades, intenta normalitzar-les ara
          const floracio_norm = planta.floracio_norm || [];
          
          if (floracio_norm.length === 0 && Array.isArray(planta.floracio)) {
            // Intentar normalitzar manualment
            planta.floracio.forEach(f => {
              if (f) floracio_norm.push(normalitzaText(f));
            });
          }
          
          // Si encara no hi ha dades, no passa el filtre
          if (floracio_norm.length === 0) {
            passaFiltres = false;
          } else {
            // Comprovar si alguna floració de la planta coincideix amb els filtres actius
            let passaFloracio = false;
            for (const fl of floracio_norm) {
              if (filtresArray.includes(fl)) {
                passaFloracio = true;
                break;
              }
            }
            passaFiltres = passaFiltres && passaFloracio;
          }
        }
        
        // Filtre d'usos (similar als anteriors)
        if (passaFiltres && filtresActius.usos !== 'tots') {
          const filtresArray = Array.isArray(filtresActius.usos) ? filtresActius.usos : [filtresActius.usos];
          
          // Si no té dades d'usos normalitzades, intenta normalitzar-les ara
          const usos_norm = planta.usos_norm || [];
          
          if (usos_norm.length === 0 && Array.isArray(planta.usos)) {
            // Intentar normalitzar manualment
            planta.usos.forEach(u => {
              if (u) usos_norm.push(normalitzaText(u));
            });
          }
          
          // Si encara no hi ha dades, no passa el filtre
          if (usos_norm.length === 0) {
            passaFiltres = false;
          } else {
            // Comprovar si algun ús de la planta coincideix amb els filtres actius
            let passaUsos = false;
            for (const us of usos_norm) {
              if (filtresArray.includes(us)) {
                passaUsos = true;
                break;
              }
            }
            passaFiltres = passaFiltres && passaUsos;
          }
        }
        
        // Filtre de fullatge (comportament excloent)
        if (passaFiltres && filtresActius.fullatge !== 'tots') {
          const fullatge = planta.fullatge;
          
          // Si no té fullatge definit, no passa el filtre
          if (!fullatge) {
            passaFiltres = false;
          } else {
            // Comparació directa (comportament excloent)
            const filtresArray = Array.isArray(filtresActius.fullatge) ? 
                filtresActius.fullatge : [filtresActius.fullatge];
            passaFiltres = passaFiltres && filtresArray.includes(fullatge);
          }
        }
        
        // Filtre de cerca per text
        if (passaFiltres && textCerca) {
          try {
            // Obtenir text de manera segura
            let textPlanta = '';
            if (planta.info_completa) {
              textPlanta = safeString(planta.info_completa).toLowerCase();
            } else {
              textPlanta = [
                safeString(planta.nom_comu),
                safeString(planta.nom_cientific),
                safeString(planta.familia),
                safeString(planta.tipus)
              ].join(' ').toLowerCase();
            }
            
            passaFiltres = passaFiltres && textPlanta.includes(textCerca);
          } catch (error) {
            console.error("Error en filtratge per text:", error);
            passaFiltres = false;
          }
        }
        
        // Mostrar el marcador si passa tots els filtres
        if (passaFiltres) {
          markers.addLayer(m);
          comptadorVisible++;
        }
      });
      
      console.log(`Filtres aplicats: ${comptadorVisible} marcadors visibles de ${totsElsMarcadors.length} totals`);
    } catch (error) {
      console.error("Error en aplicarFiltres:", error);
      // En cas d'error, mostrar tots els marcadors
      totsElsMarcadors.forEach(m => markers.addLayer(m));
    }
  }

  /* ---------- Inicialitzar events ---------- */
  function inicialitzarEvents() {
    try {
      console.log("Inicialitzant events...");
      
      // Event clic botó filtre
      $('.filtre-boto').on('click', function() {
        try {
          const $btn = $(this);
          const grup = $btn.data('group');
          const valor = $btn.data('filtre');
          
          if (!grup || !valor) {
            console.warn("Botó sense atributs necessaris:", this);
            return;
          }
          
          console.log(`Botó clicat: grup=${grup}, valor=${valor}, actiu=${$btn.hasClass('actiu')}`);
          
          // Comportament especial per al filtre de fullatge (excloent)
          if (grup === 'fullatge') {
            // Desactivar tots els altres botons de fullatge
            $(`.filtre-boto[data-group="fullatge"]`).removeClass('actiu');
            $btn.addClass('actiu');
            filtresActius.fullatge = valor;
            
            // Aplicar els filtres
            actualitzarFiltresActius();
            aplicarFiltres();
            mostrarFiltresActius();
            
            return; // Sortir aquí per no executar la lògica multi-selecció
          }
          
          // Per a filtres multi-selecció
          if ($btn.hasClass('actiu') && valor !== 'tots') {
            // Si l'usuari fa clic a un filtre ja actiu, el desactivem
            $btn.removeClass('actiu');
            
            // Si no queda cap filtre actiu, activar "tots"
            const botonsActius = $(`.filtre-boto[data-group="${grup}"].actiu`);
            if (botonsActius.length === 0) {
              $(`.filtre-boto[data-group="${grup}"][data-filtre="tots"]`).addClass('actiu');
            }
          } else {
            // Si es fa clic a "tots", desactivar la resta
            if (valor === 'tots') {
              $(`.filtre-boto[data-group="${grup}"]`).removeClass('actiu');
              $btn.addClass('actiu');
            } else {
              // Desactivar el botó "tots" si estava actiu
              $(`.filtre-boto[data-group="${grup}"][data-filtre="tots"]`).removeClass('actiu');
              // Activar el botó clicat
              $btn.addClass('actiu');
              
              // Verificar si ara tenim totes les opcions seleccionades
              if (verificarTotesOpcionsSeleccionades(grup)) {
                activarBotoTots(grup);
              }
            }
          }
          
          // Actualitzar l'objecte de filtres actius
          actualitzarFiltresActius();
          
          // Aplicar els filtres
          aplicarFiltres();
          
          // Mostrar els filtres actius
          mostrarFiltresActius();
        } catch (error) {
          console.error("Error en clic a botó de filtre:", error);
        }
      });
      
      // Event clic botó netejar filtres
      $('.netejar-filtres').on('click', function() {
        try {
          console.log("Netejant tots els filtres");
          $('.filtre-boto').removeClass('actiu');
          $('.filtre-boto[data-filtre="tots"]').addClass('actiu');
          
          // Restablir l'objecte de filtres actius
          Object.keys(filtresActius).forEach(key => {
            filtresActius[key] = 'tots';
          });
          
          // Netejar també el camp de cerca
          $('#mapa-cerca').val('');
          
          // Aplicar els filtres
          aplicarFiltres();
          
          // Actualitzar vista de filtres actius
          mostrarFiltresActius();
          
          // Ocultar el botó
          $(this).hide();
        } catch (error) {
          console.error("Error en netejar filtres:", error);
        }
      });
      
      // Event per eliminar filtres individuals
      $(document).on('click', '.eliminar-filtre', function() {
        try {
          const $etiqueta = $(this).parent();
          const grup = $etiqueta.data('group');
          const valor = $etiqueta.data('filtre');
          
          if (!grup || !valor) {
            console.warn("Etiqueta sense atributs necessaris:", $etiqueta);
            return;
          }
          
          console.log(`Eliminant filtre: grup=${grup}, valor=${valor}`);
          
          // Desactivar el botó corresponent
          $(`.filtre-boto[data-group="${grup}"][data-filtre="${valor}"]`).removeClass('actiu');
          
          // Si no queden filtres actius en aquest grup, activar el "tots"
          if ($(`.filtre-boto[data-group="${grup}"].actiu`).length === 0) {
            $(`.filtre-boto[data-group="${grup}"][data-filtre="tots"]`).addClass('actiu');
          }
          
          // Verificar si ara queden totes les altres opcions actives
          if (verificarTotesOpcionsSeleccionades(grup)) {
            activarBotoTots(grup);
          }
          
          // Actualitzar l'objecte de filtres actius
          actualitzarFiltresActius();
          
          // Aplicar els filtres
          aplicarFiltres();
          
          // Actualitzar vista de filtres actius
          mostrarFiltresActius();
        } catch (error) {
          console.error("Error en eliminar filtre:", error);
        }
      });
      
      // Event per a la cerca per text
      $('#mapa-cerca').on('input', function() {
        console.log("Aplicant filtre de text:", $(this).val());
        aplicarFiltres();
      });
      
      // Event per gestionar el botó "Veure detalls" als pop-ups del mapa
      $(document).on('click', '.boto-veure-detalls', function(e) {
        try {
          // Evitar que el link navegui a una altra pàgina
          e.preventDefault();
          
          // Obtenir l'ID i nom científic de la planta
          const plantaId = $(this).data('planta-id');
          const plantaNom = $(this).data('planta-nom');
          
          // DEBUG: Mostrar tots els atributs de l'element
          console.log("Element clicat:", $(this)[0]);
          console.log("Atributs del botó:", {
            'data-planta-id': $(this).data('planta-id'),
            'data-planta-nom': $(this).data('planta-nom'),
            'html': $(this).html(),
            'class': $(this).attr('class')
          });
          
          // Verificar quin valor podem utilitzar
          let idToUse = plantaId;
          
          // IMPORTANT: Si auro_blanc és l'ID exacte que existeix al JSON, l'usem directament
          if (plantaId === "auro_blanc") {
            idToUse = "auro_blanc";
            console.log("Utilitzant ID hardcoded auro_blanc");
          } else if (!idToUse && plantaNom) {
            idToUse = formatPlantaId(plantaNom);
          }
          
          if (!idToUse) {
            console.error("Error: No s'ha pogut determinar l'ID de la planta");
            return;
          }
          
          // Registrar valors per a depuració
          console.log("Obrint detalls de la planta:", {
            plantaId: plantaId,
            plantaNom: plantaNom,
            idToUse: idToUse
          });
          
          // Verificar si gb_vars.ajaxurl existeix
          if (!window.gb_vars || !window.gb_vars.ajaxurl) {
            console.error("Error: No s'ha trobat gb_vars.ajaxurl. Redirigint a URL per compatibilitat.");
            window.location.href = `${window.location.origin}/galeria-botanica/#planta-${idToUse}`;
            return;
          }
          
          // Utilitzar el mateix codi que la galeria per carregar els detalls
          $.ajax({
            url: gb_vars.ajaxurl,
            type: 'POST',
            data: {
              action: 'obtenir_detalls_planta',
              planta_id: idToUse,
              // Incloure nom_científic com a fallback
              nom_cientific: plantaNom
            },
            beforeSend: function() {
              console.log("Enviant petició AJAX amb:", {
                planta_id: idToUse,
                nom_cientific: plantaNom
              });

              // DEBUG: Mostrar totes les plantes disponibles al JSON per comparar
              if (mb_vars && mb_vars.dades_plantes) {
                console.log("Plantes disponibles al JSON:");
                mb_vars.dades_plantes.forEach(planta => {
                  console.log(`ID: ${planta.id || 'N/A'}, Nom científic: ${planta.nom_cientific || 'N/A'}`);
                });
              }
              
              // Assegurar-se que l'element modal existeix
              if ($('.planta-modal').length === 0) {
                // Crear l'estructura del modal si no existeix
                $('body').append(`
                  <div class="planta-modal" style="display: none;">
                    <div class="planta-modal-contingut">
                      <span class="planta-modal-tancar">&times;</span>
                      <div class="planta-modal-cos"></div>
                    </div>
                  </div>
                `);
              }
              
              // Mostrar indicador de càrrega
              $('.planta-modal-cos').html('<div class="planta-carregant">Carregant informació...</div>');
              
              // Mostrar el modal
              $('.planta-modal').fadeIn(300).addClass('actiu');
              
              // Desactivar el scroll del body
              $('body').css('overflow', 'hidden');
              
              // Tancar el pop-up del mapa
              map.closePopup();
            },
            success: function(response) {
              // Registrar la resposta per a depuració
              console.log("Resposta AJAX:", response);
              
              if (response && response.success) {
                // Actualitzar el contingut del modal
                $('.planta-modal-cos').html(response.data);
                
                // Activar el lightbox per a les imatges de detall
                activarLightbox();
              } else {
                // Intentar una segona crida amb ID normalitzat diferent
                console.log("Intent alternatiu amb identificador normalitzat de manera diferent");
                
                // Provar amb un format alternatiu
                const alternativeId = plantaNom ? plantaNom.toLowerCase().replace(/\s+/g, '_') : null;
                
                if (alternativeId && alternativeId !== idToUse) {
                  console.log("Provant amb ID alternatiu:", alternativeId);
                  
                  $.ajax({
                    url: gb_vars.ajaxurl,
                    type: 'POST',
                    data: {
                      action: 'obtenir_detalls_planta',
                      planta_id: alternativeId
                    },
                    success: function(altResponse) {
                      if (altResponse && altResponse.success) {
                        $('.planta-modal-cos').html(altResponse.data);
                        activarLightbox();
                      } else {
                        // Si encara falla, mostrar l'error
                        showErrorMessage(idToUse, plantaNom);
                      }
                    },
                    error: function() {
                      showErrorMessage(idToUse, plantaNom);
                    }
                  });
                } else {
                  showErrorMessage(idToUse, plantaNom);
                }
              }
            },
            error: function(xhr, status, error) {
              // Mostrar missatge d'error més detallat
              console.error("Error AJAX:", xhr, status, error);
              showErrorMessage(idToUse, plantaNom, status, error);
            }
          });
        } catch (error) {
          console.error("Error en gestionar botó veure detalls:", error);
          
          // Mostrar error al modal si ja existeix
          if ($('.planta-modal').length > 0) {
            $('.planta-modal-cos').html(`
              <div class="planta-error">
                <h3>Error inesperat</h3>
                <p>S'ha produït un error en intentar mostrar els detalls de la planta.</p>
                <p>Detalls: ${error.message || 'Error desconegut'}</p>
              </div>
            `);
          }
        }
      });
      
      // Funció auxiliar per mostrar missatges d'error de manera consistent
      function showErrorMessage(id, nom, status, error) {
        $('.planta-modal-cos').html(`
          <div class="planta-error">
            <h3>Error: No s'ha trobat la planta</h3>
            <p>No s'ha pogut carregar la informació per a la planta amb ID: <strong>${id}</strong></p>
            <p>Nom científic: <strong>${nom || 'No disponible'}</strong></p>
            ${status ? `<p>Status: ${status}</p>` : ''}
            ${error ? `<p>Detalls: ${error}</p>` : ''}
            <p>Si us plau, comprova que la planta existeix a la base de dades.</p>
            <p><strong>Suggeriment per al desenvolupador:</strong> Verifica que l'ID al JSON coincideix exactament amb l'ID que s'està utilitzant.</p>
          </div>
        `);
      }
      
      // Events per tancar el modal
      $(document).on('click', '.planta-modal-tancar, .planta-modal', function(e) {
        if (e.target === this) {
          $('.planta-modal').fadeOut(300).removeClass('actiu');
          $('body').css('overflow', 'auto');
        }
      });
      
      // Event per tancar el modal amb ESC
      $(document).on('keydown', function(e) {
        if (e.key === "Escape" && $('.planta-modal.actiu').length > 0) {
          $('.planta-modal').fadeOut(300).removeClass('actiu');
          $('body').css('overflow', 'auto');
        }
      });
    } catch (error) {
      console.error("Error en inicialitzarEvents:", error);
    }
  }
  
  /* ------------ Funcions pel lightbox dels detalls ---------------- */
  // Funció per activar el lightbox per a les imatges de detall
  function activarLightbox() {
    try {
      $('.planta-imatge-detall img, .planta-imatge-principal img').on('click', function() {
        const imgSrc = $(this).attr('src');
        const tipusImatge = $(this).data('tipus') || 'general';
        
        // Crear el lightbox
        const lightbox = $('<div class="planta-lightbox">');
        const img = $('<img>').attr('src', imgSrc);
        const tancaBtn = $('<span class="planta-lightbox-tancar">&times;</span>');
        
        // Afegir elements al DOM
        lightbox.append(img).append(tancaBtn).appendTo('body');
        
        // Mostrar amb animació
        setTimeout(function() {
          lightbox.addClass('actiu');
        }, 10);
        
        // Afegir etiqueta de tipus si no és general
        if (tipusImatge && tipusImatge !== 'general') {
          const tipusEtiqueta = $('<div class="planta-lightbox-tipus">' + tipusImatge + '</div>');
          lightbox.append(tipusEtiqueta);
        }
        
        // Afegir botons de navegació
        afegirNavegacioLightbox(lightbox, imgSrc);
        
        // Esdeveniments de tancament
        tancaBtn.on('click', function(e) {
          e.stopPropagation();
          tancarLightbox(lightbox);
        });
        
        lightbox.on('click', function() {
          tancarLightbox(lightbox);
        });
        
        // Aturar la propagació del clic a la imatge
        img.on('click', function(e) {
          e.stopPropagation();
        });
        
        // Tancar amb ESC
        $(document).on('keydown.lightbox', function(e) {
          if (e.key === "Escape") {
            tancarLightbox(lightbox);
          }
        });
      });
    } catch (error) {
      console.error("Error en activarLightbox:", error);
    }
  }
  
  // Funció per tancar el lightbox
  function tancarLightbox(lightbox) {
    try {
      lightbox.removeClass('actiu');
      setTimeout(function() {
        lightbox.remove();
        $(document).off('keydown.lightbox');
        $(document).off('keydown.lightboxNav');
      }, 300);
    } catch (error) {
      console.error("Error en tancarLightbox:", error);
      // Intent de neteja si hi ha error
      lightbox.remove();
      $(document).off('keydown.lightbox');
      $(document).off('keydown.lightboxNav');
    }
  }
  
  // Funció per afegir botons de navegació al lightbox
  function afegirNavegacioLightbox(lightbox, imatgeActual) {
    try {
      const imatgesGaleria = [];
      const tipusImatges = [];
      let indexActual = 0;
      
      // Recollir totes les imatges de la galeria i els seus tipus
      $('.planta-imatge-detall img, .planta-imatge-principal img').each(function() {
        const src = $(this).attr('src');
        if (src) {
          imatgesGaleria.push(src);
          tipusImatges.push($(this).data('tipus') || 'general');
        }
      });
      
      // Si només hi ha una imatge, no cal navegació
      if (imatgesGaleria.length <= 1) {
        return;
      }
      
      // Crear els botons de navegació
      const btnAnterior = $('<div class="planta-lightbox-anterior">&lt;</div>');
      const btnSeguent = $('<div class="planta-lightbox-seguent">&gt;</div>');
      
      // Afegir botons al lightbox
      lightbox.append(btnAnterior).append(btnSeguent);
      
      // Trobar l'índex actual
      indexActual = imatgesGaleria.indexOf(imatgeActual);
      if (indexActual === -1) indexActual = 0;
      
      // Navegació anterior
      btnAnterior.on('click', function(e) {
        e.stopPropagation();
        indexActual = (indexActual > 0) ? indexActual - 1 : imatgesGaleria.length - 1;
        canviarImatgeLightbox(lightbox, imatgesGaleria[indexActual], tipusImatges[indexActual]);
      });
      
      // Navegació següent
      btnSeguent.on('click', function(e) {
        e.stopPropagation();
        indexActual = (indexActual < imatgesGaleria.length - 1) ? indexActual + 1 : 0;
        canviarImatgeLightbox(lightbox, imatgesGaleria[indexActual], tipusImatges[indexActual]);
      });
      
      // Navegació amb fletxes del teclat
      $(document).on('keydown.lightboxNav', function(e) {
        if (e.key === "ArrowLeft") {
          btnAnterior.trigger('click');
        } else if (e.key === "ArrowRight") {
          btnSeguent.trigger('click');
        }
      });
    } catch (error) {
      console.error("Error en afegirNavegacioLightbox:", error);
    }
  }
  
  // Funció per canviar la imatge del lightbox amb animació i actualitzar el tipus
  function canviarImatgeLightbox(lightbox, novaSrc, nouTipus) {
    try {
      const imgLightbox = lightbox.find('img');
      imgLightbox.fadeOut(200, function() {
        $(this).attr('src', novaSrc);
        $(this).fadeIn(200);
        
        // Actualitzar l'etiqueta de tipus
        lightbox.find('.planta-lightbox-tipus').remove();
        if (nouTipus && nouTipus !== 'general') {
          const tipusEtiqueta = $('<div class="planta-lightbox-tipus">' + nouTipus + '</div>');
          lightbox.append(tipusEtiqueta);
        }
      });
    } catch (error) {
      console.error("Error en canviarImatgeLightbox:", error);
    }
  }
  
  /* ====================== 3. GEOLocalització opcional ===================== */
  if (typeof L !== 'undefined' && typeof L.control.locate !== 'undefined') {
    try {
      L.control
        .locate({
          position: 'topleft',
          strings: { title: 'Mostra la meva ubicació' },
          locateOptions: { enableHighAccuracy: true },
        })
        .addTo(map);
    } catch (error) {
      console.warn("No s'ha pogut inicialitzar la geolocalització:", error);
    }
  }

  /* ====================== 4. Deep‑link a planta ===================== */
  $(window).on('load', () => {
    try {
      const qp = new URLSearchParams(window.location.search);
      const pid = qp.get('planta');
      if (!pid) return;
      setTimeout(() => {
        let trobat = false;
        totsElsMarcadors.some((m) => {
          if (m.plantaData && m.plantaData.id === pid) {
            map.setView(m.getLatLng(), 18);
            m.openPopup();
            trobat = true;
            return true;
          }
          return false;
        });
        
        if (!trobat) {
          console.warn(`No s'ha trobat cap planta amb ID '${pid}'`);
        }
      }, 500); // Petit retard perquè la pàgina es carregui completament
    } catch (error) {
      console.error("Error en processar deep-link:", error);
    }
  });
  
  // Control d'errors global
  window.onerror = function(message, source, lineno, colno, error) {
    if (source && (source.includes('mapa-botanica.js') || source.includes('leaflet'))) {
      console.error("Error captat globalment:", message, "a", source, "línia", lineno);
    }
    return false; // Permet que l'error es mostri a la consola
  };
  
  /* ========================= POLÍGONS DE ZONES/HÀBITATS ========================== */
  // Definir els polígons per les diferents zones/hàbitats
  function afegirPoligonsHabitats() {
    console.log("Afegint polígons d'hàbitats...");
    
    // Grup per contenir tots els polígons d'hàbitats
    const habitats = L.layerGroup().addTo(map);
    
    // Ruta base cap als geojson del plugin
    const geojsonBase = mb_vars.plugin_url + '/dades/geojson/';


    // Definició dels polígons per cada zona
    const zonesHabitat = [
      /* Camí de Ho Chi Minh → ara el llegim d’un GeoJSON extern */
      {
        nom: 'Camí de Ho Chi Minh',
        id: 'cami_ho_chi_minh',
        descripcio: 'Pas central del campus amb vegetació natural als seus marges.',
        geojson: geojsonBase + 'cami_ho_chi_minh.geojson',
        color: '#8BC34A',     // verd clar (mateix color d’abans)
        fillOpacity: 0.30
      },
      {
        nom: "Torrent de Can Domènech",
        id: "torrent_can_domenech",
        descripcio: "Zona de vegetació de ribera amb espècies adaptades a ambients humits.",
        geojson: geojsonBase + 'torrent_can_domenech.geojson',
        color: "#03A9F4", // blau
        fillOpacity: 0.3
      },
      {
        nom: "Camins del campus",
        id: "camins",
        descripcio: "Xarxa principal de camins que travessen el campus universitari.",
        geojson: geojsonBase + "camins.geojson",
        color: "#795548", // marró
        fillOpacity: 0.3
      },
      {
        nom: "Eix central",
        id: "eix_central",
        descripcio: "Via principal que vertebra el campus i connecta les diferents facultats i edificis.",
        geojson: geojsonBase + "eix_central.geojson",
        color: "#607D8B", // gris blavós
        fillOpacity: 0.3
      },
      {
        nom: "Zones assolellades",
        id: "zones_assolellades",
        descripcio: "Àrees amb exposició directa al sol on creixen espècies adaptades a la llum solar intensa.",
        geojson: geojsonBase + "purament_assolellades.geojson",
        color: "#FFC107", // groc ambre
        fillOpacity: 0.3
      },
      {
        nom: "Vegetació de ribera",
        id: "vegetacio_ribera",
        descripcio: "Vegetació pròpia de les vores d'aigua, típica de zones ripàries.",
        geojson: geojsonBase + "vegetacio_ribera.geojson",
        color: "#4CAF50", // verd
        fillOpacity: 0.3
      },
      {
        nom: "Zones ombrívoles",
        id: "zones_ombrivoles",
        descripcio: "Àrees amb ombra permanent on creixen espècies adaptades a poca llum solar directa.",
        geojson: geojsonBase + "zones_ombrivoles.geojson",
        color: "#673AB7", // lila
        fillOpacity: 0.3
      }
    ];
  
    zonesHabitat.forEach(zona => {
      let capaZona;   // serà L.geoJSON o L.polygon, segons el cas

      /* ------------------ 1. Zones que porten fitxer GeoJSON ------------------ */
      if (zona.geojson) {
        fetch(zona.geojson)
          .then(r => r.json())
          .then(gj => {
            capaZona = L.geoJSON(gj, {
              style: {
                color: zona.color,
                fillColor: zona.color,
                fillOpacity: zona.fillOpacity,
                weight: 2,
                opacity: 0.7
              }
            }).addTo(habitats);

            // CORRECCIÓ: Afegir popup a TOTES les features del GeoJSON
            capaZona.eachLayer(function(layer) {
              layer.bindPopup(`
                <div class="habitat-popup">
                  <h3>${zona.nom}</h3>
                  <p>${zona.descripcio}</p>
                </div>
              `);
            });

            // Guarda-la perquè els filtres la puguin enfosquir/ressaltar
            window.habitatsLayers = window.habitatsLayers || {};
            window.habitatsLayers[zona.id] = capaZona;
            
            console.log(`GeoJSON carregat correctament: ${zona.nom} (${capaZona.getLayers().length} features)`);
          })
          .catch(err => {
            console.error('Error carregant', zona.geojson, err);
            console.warn(`No s'ha pogut carregar el GeoJSON per a: ${zona.nom}`);
          });

        return;   // continua amb la següent zona
      }

      /* ------------------ 2. Zones amb coords en línia (codi antic) ----------- */
      if (zona.coords && zona.coords.length > 0) {
        const latlngs = zona.coords.map(c => L.latLng(c[0], c[1]));
        capaZona = L.polygon(latlngs, {
          color: zona.color,
          fillColor: zona.color,
          fillOpacity: zona.fillOpacity,
          weight: 2,
          opacity: 0.7
        }).addTo(habitats);

        capaZona.bindPopup(`
          <div class="habitat-popup">
            <h3>${zona.nom}</h3>
            <p>${zona.descripcio}</p>
            <p class="habitat-id">ID: ${zona.id}</p>
          </div>
        `);

        window.habitatsLayers = window.habitatsLayers || {};
        window.habitatsLayers[zona.id] = capaZona;
        
        console.log(`Polígon creat correctament: ${zona.nom}`);
      } else {
        console.warn(`No s'han trobat coordenades per a la zona: ${zona.nom}`);
      }
    });

    // Tornar el grup per poder-lo usar en altres funcions
    return habitats;
  }

  // Afegir estils CSS per als popups d'hàbitats
  function afegirEstilsHabitats() {
    const estil = `
      <style>
        .habitat-popup h3 {
          margin: 0 0 8px;
          color: #333;
          font-size: 16px;
        }
        .habitat-popup p {
          margin: 5px 0;
          font-size: 14px;
        }
        .habitat-id {
          color: #666;
          font-size: 12px;
          font-style: italic;
        }
        .habitat-llegenda {
          margin-top: 15px;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        .habitat-llegenda-titol {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .habitat-color {
          display: inline-block;
          width: 12px;
          height: 12px;
          margin-right: 5px;
          border-radius: 2px;
        }
      </style>
    `;
    
    // Afegir estils al document
    $('head').append(estil);
  }

  // Afegir control de capes pels hàbitats
  function afegirControlCapesHabitats(habitats) {
    // Crear objecte amb els hàbitats per afegir-lo al control de capes
    const habitatOverlays = {
      "Hàbitats": habitats
    };
    
    // Actualitzar el control de capes existent
    const baseMaps = {
      "Mapa": baseOSM,
      "Satèl·lit": baseSat
    };
    
    // Eliminar control existent i crear-ne un de nou amb les capes base i els hàbitats
    map.removeControl(map._layersControl);
    L.control.layers(baseMaps, habitatOverlays).addTo(map);
    
    // Actualitzar la llegenda per incloure els hàbitats
    actualitzarLlegenda();
  }

  // Actualitzar la llegenda per mostrar els hàbitats
  function actualitzarLlegenda() {
    // Eliminar llegenda existent
    $('.mapa-llegenda').remove();
    
    // Crear nova llegenda amb hàbitats
    const llegenda = $('<div class="mapa-llegenda">').appendTo('.mapa-botanica-contenidor');
    
    // Afegir títol
    $('<h4>Llegenda</h4>').appendTo(llegenda);
    
    // Afegir tipus de plantes
    $('<div class="llegenda-item"><span class="icona-arbre">🌳</span> Arbre</div>').appendTo(llegenda);
    $('<div class="llegenda-item"><span class="icona-arbust">🌿</span> Arbust</div>').appendTo(llegenda);
    $('<div class="llegenda-item"><span class="icona-herba">🌱</span> Herba</div>').appendTo(llegenda);
    
    // Afegir separador i títol per hàbitats
    $('<div class="habitat-llegenda"></div>').appendTo(llegenda);
    $('<div class="habitat-llegenda-titol">Hàbitats:</div>').appendTo('.habitat-llegenda');
    
    // Afegir hàbitats a la llegenda
    [
      { nom: "Camí de Ho Chi Minh", color: "#8BC34A" },
      { nom: "Torrent de Can Domènech", color: "#03A9F4" },
      { nom: "Zones enjardinades", color: "#FF9800" },
      { nom: "Bosc mediterrani", color: "#795548" },
      { nom: "Zones ombrívoles", color: "#673AB7" },
      { nom: "Vegetació de ribera", color: "#4CAF50" }
    ].forEach(habitat => {
      $(`<div class="llegenda-item">
          <span class="habitat-color" style="background-color:${habitat.color}"></span>
          ${habitat.nom}
        </div>`).appendTo('.habitat-llegenda');
    });
  }

  // Funció per vincular els polígons amb els filtres
  function vincularPoligonsAmbFiltres() {
    // Afegir event de clic als polígons per activar el filtre corresponent
    Object.entries(window.habitatsLayers).forEach(([id, poligon]) => {
      poligon.on('click', function() {
        // Buscar el botó de filtre corresponent i activar-lo
        const $btnFiltre = $(`.filtre-boto[data-group="habitat"][data-filtre="${id}"]`);
        
        if ($btnFiltre.length > 0 && !$btnFiltre.hasClass('actiu')) {
          // Desactivar "tots"
          $(`.filtre-boto[data-group="habitat"][data-filtre="tots"]`).removeClass('actiu');
          
          // Activar aquest filtre
          $btnFiltre.addClass('actiu');
          
          // Actualitzar l'objecte de filtres actius
          actualitzarFiltresActius();
          
          // Aplicar els filtres
          aplicarFiltres();
          
          // Mostrar els filtres actius
          mostrarFiltresActius();
          
          // Resaltar el polígon
          Object.values(window.habitatsLayers).forEach(p => {
            p.setStyle({ weight: 2, opacity: 0.7 });
          });
          
          this.setStyle({ 
            weight: 4, 
            opacity: 1
          });
        }
      });
    });
    
    // Afegir event per destacar el polígon quan el filtre està actiu
    $('.filtre-boto[data-group="habitat"]').on('click', function() {
      const valor = $(this).data('filtre');
      
      // Restablir estil de tots els polígons
      Object.values(window.habitatsLayers).forEach(poligon => {
        poligon.setStyle({ 
          weight: 2, 
          opacity: 0.7
        });
      });
      
      // Si el filtre no és "tots", destacar el polígon corresponent
      if (valor !== 'tots' && window.habitatsLayers[valor]) {
        window.habitatsLayers[valor].setStyle({ 
          weight: 4, 
          opacity: 1
        });
      }
    });
  }

  // Inicialitzar tot
  try {
    inicialitzarEvents();
    actualitzarFiltresActius();
    aplicarFiltres();
    mostrarFiltresActius();
    
    // Afegir polígons d'hàbitats
    afegirEstilsHabitats();
    const habitats = afegirPoligonsHabitats();
    afegirControlCapesHabitats(habitats);
    vincularPoligonsAmbFiltres();
    
    console.log("Inicialització completa del mapa botànic");
  } catch (error) {
    console.error("Error en la inicialització:", error);
  }
});