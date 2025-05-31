/**
 * Galeria Botànica UAB
 * Fitxer: galeria-botanica.js
 * Script principal per a la galeria interactiva de plantes del campus
 * Versió amb multi-filtres inclòs filtre d'usos
 * Actualitzat: Comportament excloent per al filtre d'imatges i fullatge
 * Actualitzat: Auto-detecció quan s'han seleccionat totes les opcions d'un filtre
 * Actualitzat: Protecció contra conflictes amb mapa-botanica.js
 */

jQuery(document).ready(function($) {
    console.log("Inicialitzant galeria botànica UAB...");
    
    // Verificar que realment estem a la pàgina de la galeria per evitar conflictes
    if ($('.galeria-botanica').length === 0) {
        console.log("No estem a la pàgina de galeria botànica, no s'inicialitzarà el script");
        return;
    }
    
    // Protecció contra execució duplicada
    if (window.galeriaInicialitzada === true) {
        console.log("La galeria ja ha estat inicialitzada anteriorment");
        return;
    }
    window.galeriaInicialitzada = true;
    
    // Variables globals
    let modalObert = false;
    
    // Funcions d'utilitat segures
    function safeString(str) {
        if (str === undefined || str === null) return '';
        return String(str);
    }
    
    // Objecte per emmagatzemar filtres actius
    const filtresActius = {
        tipus: 'tots',
        imatge: 'tots',
        color: 'tots',
        habitat: 'tots',
        floracio: 'tots',
        fullatge: 'tots',
        usos: 'tots'
    };
    
    // Funció per verificar si s'han seleccionat totes les opcions d'un filtre
    function verificarTotesOpcionsSeleccionades(grupFiltre) {
        try {
            // No aplicar aquesta lògica als filtres excloents (imatge i fullatge)
            if (grupFiltre === 'imatge' || grupFiltre === 'fullatge') {
                return false;
            }
            
            // Obtenir tots els botons del grup (excepte el botó "tots")
            const botonsGrup = $('.filtre-boto[data-group="' + grupFiltre + '"]:not([data-filtre="tots"])');
            const botonsActius = $('.filtre-boto[data-group="' + grupFiltre + '"].actiu:not([data-filtre="tots"])');
            
            // Si tots els botons estan actius (excepte "tots")
            if (botonsGrup.length > 0 && botonsGrup.length === botonsActius.length) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.error("Error en verificarTotesOpcionsSeleccionades:", error);
            return false;
        }
    }
    
    // Funció per activar el botó "Tots" d'un grup específic
    function activarBotoTots(grupFiltre) {
        try {
            // Desactivar tots els botons del grup
            $('.filtre-boto[data-group="' + grupFiltre + '"]').removeClass('actiu');
            
            // Activar només el botó "tots"
            $('.filtre-boto[data-group="' + grupFiltre + '"][data-filtre="tots"]').addClass('actiu');
            
            // Actualitzar l'objecte de filtres actius
            filtresActius[grupFiltre] = 'tots';
        } catch (error) {
            console.error("Error en activarBotoTots:", error);
        }
    }
    
    // Gestionar clics als botons de filtre
    $('.galeria-botanica .filtre-boto').on('click', function() {
        try {
            const grupFiltre = $(this).data('group'); // tipus, imatge, color, habitat
            const valorFiltre = $(this).data('filtre');
            
            if (!grupFiltre || !valorFiltre) {
                console.warn("Botó sense atributs necessaris:", this);
                return;
            }
            
            // Comportament especial per al filtre d'imatges (excloent)
            if (grupFiltre === 'imatge') {
                // Desactivar tots els altres botons d'imatge
                $('.filtre-boto[data-group="imatge"]').removeClass('actiu');
                $(this).addClass('actiu');
                filtresActius.imatge = valorFiltre;
                
                // Aplicar el canvi d'imatges
                aplicarCanviImatges(valorFiltre);
                
                // Aplicar els filtres
                aplicarFiltres();
                
                // Mostrar els filtres actius
                mostrarFiltresActius();
                
                return; // Sortir aquí per no executar la lògica multi-selecció
            }
            
            // Comportament especial per al filtre de fullatge (excloent)
            if (grupFiltre === 'fullatge') {
                // Desactivar tots els altres botons de fullatge
                $('.filtre-boto[data-group="fullatge"]').removeClass('actiu');
                $(this).addClass('actiu');
                filtresActius.fullatge = valorFiltre;
                
                // Aplicar els filtres
                aplicarFiltres();
                
                // Mostrar els filtres actius
                mostrarFiltresActius();
                
                return; // Sortir aquí per no executar la lògica multi-selecció
            }
            
            // Per a filtres multi-selecció
            if ($(this).hasClass('actiu') && valorFiltre !== 'tots') {
                // Si l'usuari fa clic a un filtre ja actiu, el desactivem
                $(this).removeClass('actiu');
                
                // Si no queda cap filtre actiu, activar "tots"
                if ($('.filtre-boto[data-group="' + grupFiltre + '"].actiu').length === 0) {
                    $('.filtre-boto[data-group="' + grupFiltre + '"][data-filtre="tots"]').addClass('actiu');
                    filtresActius[grupFiltre] = 'tots';
                }
            } else {
                // Si es fa clic a "tots", desactivar la resta
                if (valorFiltre === 'tots') {
                    $('.filtre-boto[data-group="' + grupFiltre + '"]').removeClass('actiu');
                    $(this).addClass('actiu');
                    filtresActius[grupFiltre] = 'tots';
                } else {
                    // Desactivar el botó "tots" si estava actiu
                    $('.filtre-boto[data-group="' + grupFiltre + '"][data-filtre="tots"]').removeClass('actiu');
                    // Activar el botó clicat
                    $(this).addClass('actiu');
                    
                    // Verificar si ara tenim totes les opcions seleccionades
                    setTimeout(function() {
                        if (verificarTotesOpcionsSeleccionades(grupFiltre)) {
                            activarBotoTots(grupFiltre);
                        }
                    }, 10); // Petit delay per assegurar que els estats s'han actualitzat
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
    
    // Gestionar clic al botó "Netejar tots els filtres"
    $('.galeria-botanica .netejar-filtres').on('click', function() {
        try {
            // Restablir tots els botons a l'estat inicial
            $('.filtre-boto').removeClass('actiu');
            $('.filtre-boto[data-filtre="tots"]').addClass('actiu');
            
            // Restablir l'objecte de filtres actius
            Object.keys(filtresActius).forEach(key => {
                filtresActius[key] = 'tots';
            });
            
            // Netejar també el camp de cerca
            $('#cerca-plantes').val('');
            
            // Restaurar les imatges originals
            aplicarCanviImatges('tots');
            
            // Aplicar els filtres
            aplicarFiltres();
            
            // Ocultar el botó de neteja i buidar els filtres actius
            $(this).hide();
            $('.filtres-actius').empty();
        } catch (error) {
            console.error("Error en netejar filtres:", error);
        }
    });
    
    // Funció per actualitzar l'objecte de filtres actius
    function actualitzarFiltresActius() {
        try {
            // Per a cada grup de filtres, recollir els valors actius
            ['tipus', 'imatge', 'color', 'habitat', 'floracio', 'fullatge', 'usos'].forEach(grup => {
                if (grup === 'imatge' || grup === 'fullatge') {
                    // Per al filtre d'imatges i fullatge, només guardem un valor simple
                    const filtreActiu = $('.filtre-boto[data-group="' + grup + '"].actiu');
                    const valorFiltre = filtreActiu.data('filtre');
                    filtresActius[grup] = valorFiltre !== undefined ? valorFiltre : 'tots';
                } else {
                    // Si el botó "tots" està actiu, guardar 'tots'
                    if ($('.filtre-boto[data-group="' + grup + '"][data-filtre="tots"]').hasClass('actiu')) {
                        filtresActius[grup] = 'tots';
                    } else {
                        // Si no, recopilar tots els valors actius
                        const filtresGrup = $('.filtre-boto[data-group="' + grup + '"].actiu:not([data-filtre="tots"])');
                        
                        if (filtresGrup.length === 0) {
                            filtresActius[grup] = 'tots';
                        } else {
                            const valors = [];
                            filtresGrup.each(function() {
                                const valorFiltre = $(this).data('filtre');
                                if (valorFiltre !== undefined) {
                                    valors.push(valorFiltre);
                                }
                            });
                            filtresActius[grup] = valors.length > 0 ? valors : 'tots';
                        }
                    }
                }
            });
            
            console.log("Filtres actius actualitzats:", filtresActius);
        } catch (error) {
            console.error("Error en actualitzarFiltresActius:", error);
            // Restablir a valors predeterminats en cas d'error
            Object.keys(filtresActius).forEach(key => {
                filtresActius[key] = 'tots';
            });
        }
    }
    
    // Funció per mostrar els filtres actius
    function mostrarFiltresActius() {
        try {
            const contFiltre = $('.filtres-actius');
            contFiltre.empty();
            
            // Variable per saber si hi ha algun filtre actiu diferent de "tots"
            let hiHaFiltresActius = false;
            
            // Mostrar els filtres actius per a cada grup
            Object.entries(filtresActius).forEach(([grup, valors]) => {
                if (valors !== 'tots') {
                    hiHaFiltresActius = true;
                    
                    // Establir text per al grup
                    let grupText = '';
                    switch (grup) {
                        case 'tipus': grupText = 'Tipus'; break;
                        case 'imatge': grupText = 'Imatge'; break;
                        case 'color': grupText = 'Color'; break;
                        case 'habitat': grupText = 'Hàbitat'; break;
                        case 'floracio': grupText = 'Floració'; break;
                        case 'fullatge': grupText = 'Fullatge'; break;
                        case 'usos': grupText = 'Usos'; break;
                        default: grupText = grup.charAt(0).toUpperCase() + grup.slice(1);
                    }
                    
                    // Afegir cada filtre actiu
                    if (grup === 'imatge' || grup === 'fullatge') {
                        // Per al filtre d'imatges i fullatge només hi ha un valor
                        if (valors) { // Assegurar-se que valors no és undefined
                            const valorStr = safeString(valors);
                            const valorText = valorStr.charAt(0).toUpperCase() + valorStr.slice(1).replace(/_/g, ' ');
                            const etiqueta = $('<span class="filtre-actiu" data-group="' + grup + '" data-filtre="' + valorStr + '">' + 
                                grupText + ': ' + valorText + ' <span class="eliminar-filtre">×</span></span>');
                            contFiltre.append(etiqueta);
                        }
                    } else if (Array.isArray(valors)) {
                        valors.forEach(valor => {
                            if (valor) { // Verificar que valor no sigui null/undefined
                                // Formatar text del valor (només majúscula inicial i substituir _ per espais)
                                const valorStr = safeString(valor);
                                const valorText = valorStr.charAt(0).toUpperCase() + valorStr.slice(1).replace(/_/g, ' ');
                                
                                // Crear etiqueta de filtre
                                const etiqueta = $('<span class="filtre-actiu" data-group="' + grup + '" data-filtre="' + valorStr + '">' + 
                                    grupText + ': ' + valorText + ' <span class="eliminar-filtre">×</span></span>');
                                
                                contFiltre.append(etiqueta);
                            }
                        });
                    }
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
            $('.netejar-filtres').hide();
        }
    }
    
    // Gestionar la eliminació de filtres individuals
    $(document).on('click', '.galeria-botanica .eliminar-filtre', function() {
        try {
            const etiqueta = $(this).parent();
            const grup = etiqueta.data('group');
            const valor = etiqueta.data('filtre');
            
            if (!grup || valor === undefined) {
                console.warn("Etiqueta sense atributs necessaris:", etiqueta);
                return;
            }
            
            // Desactivar el botó corresponent
            $('.filtre-boto[data-group="' + grup + '"][data-filtre="' + valor + '"]').removeClass('actiu');
            
            // Si no queden filtres actius en aquest grup, activar el "tots"
            if ($('.filtre-boto[data-group="' + grup + '"].actiu').length === 0) {
                $('.filtre-boto[data-group="' + grup + '"][data-filtre="tots"]').addClass('actiu');
            }
            
            // Comprovar si ara queden totes les altres opcions actives
            setTimeout(function() {
                if (verificarTotesOpcionsSeleccionades(grup)) {
                    activarBotoTots(grup);
                }
            }, 10);
            
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
    
    // Funció per aplicar els filtres combinats
    function aplicarFiltres() {
        try {
            // Primer amagar totes les plantes
            $('.planta-item').fadeOut(300);
            
            // Obtenir el text de cerca si existeix (de manera segura)
            const textCerca = safeString($('#cerca-plantes').val()).toLowerCase().trim();
            
            // Després d'un petit retard, mostrar les que compleixen tots els filtres
            setTimeout(function() {
                let plantesVisibles = 0;
                
                $('.planta-item').each(function() {
                    const planta = $(this);
                    
                    // Comprovar si la planta compleix cada filtre
                    let passaFiltres = true;
                    
                    // Filtre de tipus de planta
                    if (filtresActius.tipus !== 'tots') {
                        const tipusPlanta = planta.data('tipus');
                        if (!tipusPlanta) {
                            passaFiltres = false;
                        } else if (Array.isArray(filtresActius.tipus)) {
                            // Si és un array, comprovar si el tipus està inclòs
                            passaFiltres = passaFiltres && filtresActius.tipus.includes(tipusPlanta);
                        } else {
                            // Si és un string, comparar directament
                            passaFiltres = passaFiltres && (tipusPlanta === filtresActius.tipus);
                        }
                    }
                    
                    // El filtre d'imatge no afecta la visibilitat, només canvia la imatge mostrada
                    // Així que no fem res aquí per al filtre d'imatges
                    
                    // Filtre de color (EXCLOENT - ha de tenir TOTS els colors seleccionats)
                    if (passaFiltres && filtresActius.color !== 'tots') {
                        const colorsPlanta = planta.data('colors');
                        if (colorsPlanta) {
                            const arrColors = colorsPlanta.split(' ');
                            // Comprovem que la planta tingui TOTS els colors seleccionats
                            if (Array.isArray(filtresActius.color)) {
                                for (const colorFiltre of filtresActius.color) {
                                    if (!arrColors.includes(colorFiltre)) {
                                        passaFiltres = false;
                                        break;
                                    }
                                }
                            } else {
                                // Si només hi ha un color al filtre
                                passaFiltres = passaFiltres && arrColors.includes(filtresActius.color);
                            }
                        } else {
                            // Si la planta no té colors definits, no passa el filtre
                            passaFiltres = false;
                        }
                    }
                    
                    // Filtre d'hàbitat
                    if (passaFiltres && filtresActius.habitat !== 'tots') {
                        const habitatsPlanta = planta.data('habitats');
                        if (habitatsPlanta) {
                            const arrHabitats = habitatsPlanta.split(' ');
                            // Comprovem si algun dels hàbitats de la planta està en els filtres actius
                            let passaHabitat = false;
                            if (Array.isArray(filtresActius.habitat)) {
                                for (const habitat of arrHabitats) {
                                    if (filtresActius.habitat.includes(habitat)) {
                                        passaHabitat = true;
                                        break;
                                    }
                                }
                            } else {
                                // Si només hi ha un hàbitat al filtre
                                passaHabitat = arrHabitats.includes(filtresActius.habitat);
                            }
                            passaFiltres = passaFiltres && passaHabitat;
                        } else {
                            // Si la planta no té hàbitats definits, no passa el filtre
                            passaFiltres = false;
                        }
                    }
                    
                    // Filtre de floració
                    if (passaFiltres && filtresActius.floracio !== 'tots') {
                        const floracioPlanta = planta.data('floracio');
                        if (floracioPlanta) {
                            const arrFloracio = floracioPlanta.split(' ');
                            let passaFloracio = false;
                            if (Array.isArray(filtresActius.floracio)) {
                                for (const floracio of arrFloracio) {
                                    if (filtresActius.floracio.includes(floracio)) {
                                        passaFloracio = true;
                                        break;
                                    }
                                }
                            } else {
                                // Si només hi ha una floració al filtre
                                passaFloracio = arrFloracio.includes(filtresActius.floracio);
                            }
                            passaFiltres = passaFiltres && passaFloracio;
                        } else {
                            passaFiltres = false;
                        }
                    }
                    
                    // Filtre de fullatge (actualitzat per comportament excloent)
                    if (passaFiltres && filtresActius.fullatge !== 'tots') {
                        const fullatgePlanta = planta.data('fullatge');
                        // Comparació directa, no com array
                        passaFiltres = passaFiltres && (fullatgePlanta === filtresActius.fullatge);
                    }
                    
                    // Filtre d'usos
                    if (passaFiltres && filtresActius.usos !== 'tots') {
                        const usosPlanta = planta.data('usos');
                        if (usosPlanta) {
                            const arrUsos = usosPlanta.split(' ');
                            let passaUsos = false;
                            if (Array.isArray(filtresActius.usos)) {
                                for (const us of arrUsos) {
                                    if (filtresActius.usos.includes(us)) {
                                        passaUsos = true;
                                        break;
                                    }
                                }
                            } else {
                                // Si només hi ha un ús al filtre
                                passaUsos = arrUsos.includes(filtresActius.usos);
                            }
                            passaFiltres = passaFiltres && passaUsos;
                        } else {
                            passaFiltres = false;
                        }
                    }
                    
                    // Filtre de cerca per text
                    if (passaFiltres && textCerca) {
                        let dadesPlanta = '';
                        try {
                            // Obtenir text de manera segura
                            const infoText = planta.find('.planta-info').text() || '';
                            const infoCompleta = planta.data('info-completa') || '';
                            dadesPlanta = (infoText + ' ' + infoCompleta).toLowerCase();
                        } catch (error) {
                            console.warn("Error al processar text de planta:", error);
                            dadesPlanta = '';
                        }
                        passaFiltres = passaFiltres && dadesPlanta.includes(textCerca);
                    }
                    
                    // Mostrar o amagar la planta segons si passa els filtres
                    if (passaFiltres) {
                        planta.fadeIn(300);
                        plantesVisibles++;
                    }
                });
                
                console.log(`Filtres aplicats: ${plantesVisibles} plantes visibles`);
            }, 300);
        } catch (error) {
            console.error("Error en aplicarFiltres:", error);
            // En cas d'error, mostrar totes les plantes
            $('.planta-item').fadeIn(300);
        }
    }
    
    // Funció per canviar les imatges segons el filtre d'imatges seleccionat
    function aplicarCanviImatges(tipusImatge) {
        try {
            $('.planta-item').each(function() {
                const $planta = $(this);
                const imatgesData = $planta.data('imatges');
                
                if (imatgesData && typeof imatgesData === 'object') {
                    const $img = $planta.find('.planta-imatge-principal');
                    const $indicator = $planta.find('.planta-tipus-imatge');
                    
                    let novaImatge = '';
                    
                    if (tipusImatge === 'tots') {
                        // Restaurar la imatge principal
                        novaImatge = imatgesData.principal;
                    } else {
                        // Canviar a la imatge del tipus seleccionat
                        if (imatgesData[tipusImatge]) {
                            novaImatge = imatgesData[tipusImatge];
                        } else {
                            // Si no hi ha imatge d'aquest tipus, usar la principal
                            novaImatge = imatgesData.principal || '';
                        }
                    }
                    
                    // Actualitzar la imatge
                    if (novaImatge && $img.length) {
                        const src = $img.attr('src');
                        if (src) {
                            const urlBase = src.substring(0, src.lastIndexOf('/') + 1);
                            $img.attr('src', urlBase + novaImatge);
                        }
                    }
                    
                    // Actualitzar l'indicador de tipus
                    if (tipusImatge !== 'tots' && tipusImatge !== 'general') {
                        if ($indicator.length === 0) {
                            $planta.find('.planta-imatge a').append('<span class="planta-tipus-imatge">' + 
                                tipusImatge.charAt(0).toUpperCase() + tipusImatge.slice(1) + '</span>');
                        } else {
                            $indicator.text(tipusImatge.charAt(0).toUpperCase() + tipusImatge.slice(1));
                        }
                    } else {
                        $indicator.remove();
                    }
                }
            });
        } catch (error) {
            console.error("Error en aplicarCanviImatges:", error);
        }
    }
    
    // Obrir modal de detalls quan es fa clic a una planta
    $(document).on('click', '.planta-obrir-detall', function(e) {
        try {
            e.preventDefault();
            
            // Obtenir l'ID de la planta
            const plantaId = $(this).data('planta');
            
            if (!plantaId || !gb_vars || !gb_vars.ajaxurl) {
                console.error("Error: Falten dades necessàries per carregar detalls de planta");
                return;
            }
            
            // Obtenir els detalls de la planta via AJAX
            $.ajax({
                url: gb_vars.ajaxurl, // Utilitzem la variable localitzada des de PHP
                type: 'POST',
                data: {
                    action: 'obtenir_detalls_planta',
                    planta_id: plantaId
                },
                beforeSend: function() {
                    // Mostrar un indicador de càrrega
                    $('.planta-modal-cos').html('<div class="planta-carregant">Carregant informació...</div>');
                    
                    // Mostrar el modal
                    $('.planta-modal').fadeIn(300).addClass('actiu');
                    modalObert = true;
                    
                    // Desactivar el scroll del body
                    $('body').css('overflow', 'hidden');
                },
                success: function(response) {
                    if (response && response.success) {
                        // Actualitzar el contingut del modal
                        $('.planta-modal-cos').html(response.data);
                        
                        // Activar el lightbox per a les imatges de detall
                        activarLightbox();
                    } else {
                        // Mostrar missatge d'error
                        $('.planta-modal-cos').html('<div class="planta-error">Error: ' + 
                            (response && response.data ? response.data : 'Error desconegut') + '</div>');
                    }
                },
                error: function() {
                    // Mostrar missatge d'error genèric
                    $('.planta-modal-cos').html(
                        '<div class="planta-error">' +
                        'Error de connexió amb el servidor. Si us plau, intenta-ho de nou més tard.' +
                        '</div>'
                    );
                }
            });
        } catch (error) {
            console.error("Error en obrir detalls de planta:", error);
        }
    });
    
    // Tancar el modal quan es fa clic a la X o fora del contingut
    $(document).on('click', '.planta-modal-tancar, .planta-modal', function(e) {
        try {
            if (e.target === this) {
                // Tancar el modal
                $('.planta-modal').fadeOut(300).removeClass('actiu');
                modalObert = false;
                
                // Reactivar el scroll del body
                $('body').css('overflow', 'auto');
            }
        } catch (error) {
            console.error("Error en tancar modal:", error);
        }
    });
    
    // Tancar el modal amb la tecla ESC
    $(document).keydown(function(e) {
        try {
            if (e.key === "Escape" && modalObert) {
                $('.planta-modal').fadeOut(300).removeClass('actiu');
                modalObert = false;
                $('body').css('overflow', 'auto');
            }
        } catch (error) {
            console.error("Error en tancar modal amb ESC:", error);
        }
    });
    
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
    
    // Delegació d'esdeveniments per a les miniatures de la galeria
    $(document).on('click', '.planta-imatge-galeria-thumbnail', function() {
        try {
            const novaImatge = $(this).data('imatge');
            const tipusImatge = $(this).data('tipus') || 'general';
            const imgPrincipal = $('.planta-imatge-principal img');
            
            if (!novaImatge || !imgPrincipal.length) {
                console.warn("Falten dades necessàries per canviar la imatge");
                return;
            }
            
            // Canviar la imatge principal
            imgPrincipal.fadeOut(200, function() {
                $(this).attr('src', novaImatge);
                $(this).attr('data-tipus', tipusImatge);
                $(this).fadeIn(200);
                
                // Actualitzar l'etiqueta de tipus
                const contenidorImatge = $(this).parent();
                contenidorImatge.find('.planta-tipus-imatge-detall').remove();
                if (tipusImatge !== 'general') {
                    contenidorImatge.append('<span class="planta-tipus-imatge-detall">' + tipusImatge + '</span>');
                }
            });
        } catch (error) {
            console.error("Error en clic a miniatura:", error);
        }
    });
    
    // Gestionar el camp de cerca
    $('#cerca-plantes').on('input', function() {
        try {
            aplicarFiltres();
        } catch (error) {
            console.error("Error en cerca:", error);
        }
    });
    
    // Inicialitzar funcionalitats inicials
    function inicialitzar() {
        try {
            // Verificar si hi ha un hash a l'URL per obrir directament una planta
            const hash = window.location.hash;
            if (hash && hash.startsWith('#planta-')) {
                const plantaId = hash.substring(8); // Treure '#planta-'
                setTimeout(function() {
                    $('.planta-obrir-detall[data-planta="' + plantaId + '"]').first().trigger('click');
                }, 500); // Petit retard perquè la pàgina es carregui completament
            }
            
            // Implementar lazy loading per a les imatges si hi ha moltes plantes
            if (document.querySelectorAll('.planta-item').length > 8) {
                implementarLazyLoading();
            }
            
            // Inicialitzar el sistema de filtres
            actualitzarFiltresActius();
            aplicarFiltres();
            mostrarFiltresActius();
            
            console.log("Galeria botànica inicialitzada correctament");
        } catch (error) {
            console.error("Error en inicialitzar la galeria:", error);
        }
    }
    
    // Implementar lazy loading d'imatges
    function implementarLazyLoading() {
        try {
            const imatges = document.querySelectorAll('.planta-item img');
            
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            const src = img.getAttribute('data-src');
                            if (src) {
                                img.setAttribute('src', src);
                                img.removeAttribute('data-src');
                            }
                            observer.unobserve(img);
                        }
                    });
                });
                
                imatges.forEach(img => {
                    // Només observar les imatges que tenen data-src
                    if (img.getAttribute('data-src')) {
                        observer.observe(img);
                    }
                });
            } else {
                // Fallback per a navegadors que no suporten IntersectionObserver
                imatges.forEach(img => {
                    const src = img.getAttribute('data-src');
                    if (src) {
                        img.setAttribute('src', src);
                        img.removeAttribute('data-src');
                    }
                });
            }
        } catch (error) {
            console.error("Error en implementarLazyLoading:", error);
        }
    }
    
    // Implementar zoom a la imatge en el lightbox
    function implementarZoom(lightboxImg) {
        try {
            let zoomActiu = false;
            let escalaActual = 1;
            
            lightboxImg.on('dblclick', function(e) {
                e.stopPropagation();
                
                if (!zoomActiu) {
                    // Zoom in
                    escalaActual = 2;
                    $(this).css({
                        'transform': 'scale(2)',
                        'cursor': 'move'
                    });
                    zoomActiu = true;
                } else {
                    // Zoom out
                    escalaActual = 1;
                    $(this).css({
                        'transform': 'scale(1)',
                        'cursor': 'auto'
                    });
                    zoomActiu = false;
                }
            });
            
            // Zoom amb roda del ratolí
            lightboxImg.on('wheel', function(e) {
                e.preventDefault();
                
                if (e.originalEvent.deltaY < 0) {
                    // Zoom in
                    escalaActual = Math.min(escalaActual + 0.2, 3);
                } else {
                    // Zoom out
                    escalaActual = Math.max(escalaActual - 0.2, 1);
                }
                
                $(this).css({
                    'transform': 'scale(' + escalaActual + ')',
                    'cursor': escalaActual > 1 ? 'move' : 'auto'
                });
                
                zoomActiu = escalaActual > 1;
            });
            
            // Moure la imatge quan està ampliada
            let isDragging = false;
            let lastX, lastY;
            let translateX = 0, translateY = 0;
            
            lightboxImg.on('mousedown', function(e) {
                if (zoomActiu) {
                    isDragging = true;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    $(this).css('cursor', 'grabbing');
                    e.preventDefault();
                }
            });
            
            $(document).on('mousemove.zoom', function(e) {
                if (isDragging) {
                    const deltaX = e.clientX - lastX;
                    const deltaY = e.clientY - lastY;
                    
                    translateX += deltaX;
                    translateY += deltaY;
                    
                    lightboxImg.css({
                        'transform': 'scale(' + escalaActual + ') translate(' + translateX/escalaActual + 'px, ' + translateY/escalaActual + 'px)'
                    });
                    
                    lastX = e.clientX;
                    lastY = e.clientY;
                }
            });
            
            $(document).on('mouseup.zoom', function() {
                if (isDragging) {
                    isDragging = false;
                    lightboxImg.css('cursor', 'move');
                }
            });
        } catch (error) {
            console.error("Error en implementarZoom:", error);
        }
    }
    
    // Control d'errors global
    window.onerror = function(message, source, lineno, colno, error) {
        if (source && source.includes('galeria-botanica.js')) {
            console.error("Error captat globalment a la galeria botànica:", message, "a", source, "línia", lineno);
        }
        return false; // Permet que l'error es mostri a la consola
    };
    
    // Inicialitzar tot
    inicialitzar();
});