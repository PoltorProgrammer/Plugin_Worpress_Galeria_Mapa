<?php
/*
Plugin Name: Galeria Botànica UAB
Description: Galeria interactiva de plantes del campus de la UAB
Version: 1.0
Author: Tomas
Fitxer: galeria-botanica-uab.php
Versió amb tots els filtres inclòs filtre d'usos
*/

// Evitar accés directe
if (!defined('ABSPATH')) {
    exit;
}

// Registrar i carregar els estils i scripts
function gb_registrar_assets() {
    // Registrar i carregar estils
    wp_enqueue_style('gb-estils', plugins_url('assets/css/galeria-botanica.css', __FILE__), array(), '1.0.1');
    // Registrar i carregar scripts amb dependència en jQuery
    wp_enqueue_script('gb-scripts', plugins_url('assets/js/galeria-botanica.js', __FILE__), array('jquery'), '1.0.1', true);
    
    // Passar dades d'ajaxurl al script
    wp_localize_script('gb-scripts', 'gb_vars', array(
        'ajaxurl' => admin_url('admin-ajax.php')
    ));
}
add_action('wp_enqueue_scripts', 'gb_registrar_assets');

// Funció per carregar el diccionari de plantes
function gb_carregar_diccionari() {
    $json_path = plugin_dir_path(__FILE__) . 'dades/plantes.json';
    
    if (file_exists($json_path)) {
        $json_contingut = file_get_contents($json_path);
        return json_decode($json_contingut, true);
    } else {
        error_log('Galeria Botànica UAB: No s\'ha trobat el fitxer plantes.json a ' . $json_path);
        return array('plantes' => array());
    }
}

// Funció per trobar les imatges d'una planta
function gb_obtenir_imatges_planta($nom_cientific) {
    $imatges = array(
        'principal' => '',
        'principal_tipus' => 'general',
        'detalls' => array(),
        'detalls_tipus' => array()
    );
    $imatge_dir = plugin_dir_path(__FILE__) . 'assets/imatges/';
    
    // Comprovar si el directori existeix
    if (!is_dir($imatge_dir)) {
        error_log('Galeria Botànica UAB: No s\'ha trobat el directori d\'imatges a ' . $imatge_dir);
        $imatges['principal'] = 'default_planta.jpg';
        $imatges['detalls'] = array();
        return $imatges;
    }
    
    // Normalitzar el nom científic (substituir espais per underscore)
    $nom_base = str_replace(' ', '_', $nom_cientific);
    $nom_base_min = strtolower($nom_base);
    
    // Extreure només el gènere i l'espècie (les dues primeres parts del nom)
    $parts = explode('_', $nom_base_min);
    if (count($parts) >= 2) {
        $nom_base_curt = $parts[0] . '_' . $parts[1]; // Només agafem gènere i espècie
    } else {
        $nom_base_curt = $nom_base_min; // Si no hi ha parts suficients, usem el nom complet
    }
    
    // Array per emmagatzemar les imatges amb els seus tipus
    $imatges_trobades = array();
    
    // Comprovar els arxius existents al directori
    if (is_dir($imatge_dir)) {
        $arxius = scandir($imatge_dir);
        
        foreach ($arxius as $arxiu) {
            // Saltar directoris . i ..
            if ($arxiu == '.' || $arxiu == '..') {
                continue;
            }
            
            // Convertir a minúscules per fer la comparació insensible a majúscules
            $arxiu_min = strtolower($arxiu);
            
            // Comprovar si l'arxiu comença amb el nom científic curt (gènere_espècie)
            if (strpos($arxiu_min, $nom_base_curt . '_') === 0) {
                // Extreure el tipus d'imatge del nom de l'arxiu
                $tipus_imatge = 'general'; // Per defecte
                
                // Normalitzar noms amb accents per facilitar la comparació
                $arxiu_normalitzat = str_replace(
                    array('á', 'é', 'í', 'ó', 'ú'),
                    array('a', 'e', 'i', 'o', 'u'),
                    $arxiu_min
                );
                
                // Utilitzar el nom normalitzat per al patró
                if (preg_match('/^' . preg_quote($nom_base_curt, '/') . '_[0-9]+_([a-z]+)\./', $arxiu_normalitzat, $coincidencies)) {
                    if (!empty($coincidencies[1])) {
                        $tipus_imatge = $coincidencies[1];
                        
                        // Però primer, mirem si el nom original tenia accent
                        if (preg_match('/^' . preg_quote($nom_base_curt, '/') . '_[0-9]+_([a-záéíóúàèìòùñ]+)\./', $arxiu_min, $coincidencies_originals)) {
                            $tipus_original = $coincidencies_originals[1];
                            
                            // Mapeig de tipus en castellà/anglès a català
                            $tipus_mapping = array(
                                'flor' => 'flor',
                                'fulla' => 'fulla',
                                'fruit' => 'fruit',
                                'tija' => 'escorça',
                                'habit' => 'hàbit',
                                'altre' => 'altre'
                            );
                            
                            // Usar el tipus original per al mapeig
                            if (isset($tipus_mapping[$tipus_original])) {
                                $tipus_imatge = $tipus_mapping[$tipus_original];
                            } elseif (isset($tipus_mapping[$tipus_imatge])) {
                                $tipus_imatge = $tipus_mapping[$tipus_imatge];
                            }
                        }
                    }
                }
                
                // Guardar la imatge amb el seu tipus
                $imatges_trobades[] = array(
                    'nom' => $arxiu,
                    'tipus' => $tipus_imatge
                );
            }
        }
        
        // Ordenar les imatges trobades per nom
        usort($imatges_trobades, function($a, $b) {
            return strcmp($a['nom'], $b['nom']);
        });
        
        // Si hem trobat imatges, la primera serà la principal i la resta seran detalls
        if (!empty($imatges_trobades)) {
            $imatges['principal'] = $imatges_trobades[0]['nom'];
            $imatges['principal_tipus'] = $imatges_trobades[0]['tipus'];
            
            // La resta d'imatges seran detalls
            $imatges['detalls'] = array();
            $imatges['detalls_tipus'] = array();
            
            if (count($imatges_trobades) > 1) {
                foreach (array_slice($imatges_trobades, 1) as $imatge) {
                    $imatges['detalls'][] = $imatge['nom'];
                    $imatges['detalls_tipus'][] = $imatge['tipus'];
                }
            }
        } else {
            // Si no s'ha trobat cap imatge, utilitzem una per defecte
            if (file_exists($imatge_dir . 'default_planta.jpg')) {
                $imatges['principal'] = 'default_planta.jpg';
                $imatges['principal_tipus'] = 'general';
            }
        }
    }
    
    return $imatges;
}

// Shortcode per mostrar la galeria
function gb_galeria_shortcode($atts) {
    // Analitzar atributs
    $atts = shortcode_atts(array(
        'tipus' => '',  // per filtrar només un tipus específic
        'limit' => 0,   // 0 = sense límit
    ), $atts);
    
    // Carregar les dades de plantes
    $dades = gb_carregar_diccionari();
    $plantes = $dades['plantes'];
    
    // Verificar si hi ha plantes
    if (empty($plantes)) {
        return '<div class="galeria-botanica-error">No s\'han trobat plantes a mostrar.</div>';
    }
    
    // Filtratge inicial si s'especifica un tipus
    if (!empty($atts['tipus'])) {
        $plantes_filtrades = array();
        foreach ($plantes as $planta) {
            if ($planta['tipus'] === $atts['tipus']) {
                $plantes_filtrades[] = $planta;
            }
        }
        $plantes = $plantes_filtrades;
    }
    
    // Limitar el nombre de plantes si cal
    if ($atts['limit'] > 0 && count($plantes) > $atts['limit']) {
        $plantes = array_slice($plantes, 0, $atts['limit']);
    }
    
    // Començar la sortida HTML
    $output = '<div class="galeria-botanica">';
    
    // Contenidor principal de filtres
    $output .= '<div class="filtres-contenidor">';
    
    // Barra de filtres unificada
    $output .= '<div class="filtres-barra">';
    
    // Filtre per tipus de planta (arbre, arbust, etc.)
    $output .= '<div class="grup-filtre tipus-planta-filtre">';
    $output .= '<span class="etiqueta-filtre">Tipus:</span>';
    $output .= '<div class="botons-filtre">';
    $output .= '<button class="filtre-boto actiu" data-group="tipus" data-filtre="tots">Totes les plantes</button>';
    
    // Recopilar tots els tipus de plantes únics
    $tipus_plantes = array();
    foreach ($plantes as $planta) {
        if (!in_array($planta['tipus'], $tipus_plantes)) {
            $tipus_plantes[] = $planta['tipus'];
        }
    }
    
    // Crear botons de filtre per cada tipus
    foreach ($tipus_plantes as $tipus) {
        $nom_tipus = ucfirst($tipus);
        $output .= '<button class="filtre-boto" data-group="tipus" data-filtre="' . $tipus . '">' . $nom_tipus . '</button>';
    }
    
    $output .= '</div>'; // Fi botons-filtre
    $output .= '</div>'; // Fi grup-filtre tipus-planta
    
    // Recopilar els tipus d'imatges (flor, fulla, escorça, etc.)
    $tipus_imatges = array();
    foreach ($plantes as $planta) {
        $imatges = gb_obtenir_imatges_planta($planta['nom_cientific']);
        
        // Afegir el tipus de la imatge principal si existeix
        if (isset($imatges['principal_tipus']) && !in_array($imatges['principal_tipus'], $tipus_imatges)) {
            $tipus_imatges[] = $imatges['principal_tipus'];
        }
        
        // Afegir els tipus de les imatges de detall
        if (isset($imatges['detalls_tipus'])) {
            foreach ($imatges['detalls_tipus'] as $tipus) {
                if (!in_array($tipus, $tipus_imatges)) {
                    $tipus_imatges[] = $tipus;
                }
            }
        }
    }
    
    // Filtre per tipus d'imatge (flor, fulla, etc.)
    if (!empty($tipus_imatges)) {
        $output .= '<div class="grup-filtre tipus-imatge-filtre">';
        $output .= '<span class="etiqueta-filtre">Imatges:</span>';
        $output .= '<div class="botons-filtre botons-filtre-imatges">';
        $output .= '<button class="filtre-boto filtre-imatge actiu" data-group="imatge" data-filtre="tots">Totes</button>';
        
        // Ordenar els tipus d'imatge
        sort($tipus_imatges);
        
        // Crear botons de filtre per cada tipus d'imatge
        foreach ($tipus_imatges as $tipus) {
            if ($tipus != 'general' && $tipus != 'altre') { // No mostrem tipus 'general' ni 'altre'
                $nom_tipus = ucfirst($tipus);
                $output .= '<button class="filtre-boto filtre-imatge" data-group="imatge" data-filtre="' . $tipus . '">' . $nom_tipus . '</button>';
            }
        }
        
        $output .= '</div>'; // Fi botons-filtre
        $output .= '</div>'; // Fi grup-filtre tipus-imatge
    }
    
    // Recopilar colors de les plantes (si existeixen a la base de dades)
    $colors = array();
    foreach ($plantes as $planta) {
        if (isset($planta['colors'])) {
            $color_planta = $planta['colors'];
            if (is_array($color_planta)) {
                foreach ($color_planta as $c) {
                    // Extreure només la part principal del color (abans del parèntesi)
                    $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $c));
                    $color_normalitzat = strtolower($color_principal);
                    
                    if (!in_array($color_normalitzat, $colors)) {
                        $colors[] = $color_normalitzat;
                    }
                }
            } else {
                // Extreure només la part principal del color (abans del parèntesi)
                $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $color_planta));
                $color_normalitzat = strtolower($color_principal);
                
                if (!in_array($color_normalitzat, $colors)) {
                    $colors[] = $color_normalitzat;
                }
            }
        }
    }
    
    // Filtre per colors (si n'hi ha)
    if (!empty($colors)) {
        $output .= '<div class="grup-filtre colors-filtre">';
        $output .= '<span class="etiqueta-filtre">Colors:</span>';
        $output .= '<div class="botons-filtre">';
        $output .= '<button class="filtre-boto actiu" data-group="color" data-filtre="tots">Tots</button>';
        
        // Ordenar colors
        sort($colors);
        
        // Crear botons de filtre per cada color
        foreach ($colors as $color) {
            $nom_color = ucfirst($color);
            $output .= '<button class="filtre-boto" data-group="color" data-filtre="' . $color . '">' . $nom_color . '</button>';
        }
        
        $output .= '</div>'; // Fi botons-filtre
        $output .= '</div>'; // Fi grup-filtre colors
    }
    
    // Recopilar hàbitats de les plantes
    $habitats = array();
    foreach ($plantes as $planta) {
        if (isset($planta['habitat'])) {
            $habitat_planta = $planta['habitat'];
            if (is_array($habitat_planta)) {
                foreach ($habitat_planta as $h) {
                    // Extreure només la part principal de l'hàbitat (abans del parèntesi)
                    $habitat_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $h));
                    
                    // Normalitzar per al filtre (convertir espais a _)
                    $habitat_normalitzat = str_replace(' ', '_', strtolower($habitat_principal));
                    
                    if (!array_key_exists($habitat_normalitzat, $habitats)) {
                        // Guardar el nom original sense els guions baixos
                        $habitats[$habitat_normalitzat] = $habitat_principal;
                    }
                }
            } else {
                // Processar igual si no és array
                $habitat_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $habitat_planta));
                $habitat_normalitzat = str_replace(' ', '_', strtolower($habitat_principal));
                if (!array_key_exists($habitat_normalitzat, $habitats)) {
                    // Guardar el nom original sense els guions baixos
                    $habitats[$habitat_normalitzat] = $habitat_principal;
                }
            }
        }
    }
    
    // Filtre per hàbitat
    if (!empty($habitats)) {
        $output .= '<div class="grup-filtre habitat-filtre">';
        $output .= '<span class="etiqueta-filtre">Hàbitat:</span>';
        $output .= '<div class="botons-filtre">';
        $output .= '<button class="filtre-boto actiu" data-group="habitat" data-filtre="tots">Tots</button>';
        
        // Ordenar hàbitats per nom visible
        asort($habitats);
        
        // Crear botons de filtre per cada hàbitat principal
        foreach ($habitats as $habitat_normalitzat => $habitat_nom) {
            // Formatem el nom per mostrar correctament (substituir _ per espais i capitalitzar)
            $nom_mostrar = str_replace('_', ' ', $habitat_nom);
            $nom_mostrar = ucwords($nom_mostrar);
            $output .= '<button class="filtre-boto" data-group="habitat" data-filtre="' . $habitat_normalitzat . '">' . $nom_mostrar . '</button>';
        }
        
        $output .= '</div>'; // Fi botons-filtre
        $output .= '</div>'; // Fi grup-filtre habitat
    }
    
    // Recopilar floració de les plantes
    $floraciens = array();
    foreach ($plantes as $planta) {
        if (isset($planta['caracteristiques']['floracio'])) {
            $floracio = $planta['caracteristiques']['floracio'];
            if (is_array($floracio)) {
                foreach ($floracio as $f) {
                    // Processar per eliminar text entre parèntesis
                    $f_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $f));
                    $f_normalitzat = strtolower($f_principal);
                    
                    if (!in_array($f_normalitzat, $floraciens)) {
                        $floraciens[] = $f_normalitzat;
                    }
                }
            }
        }
    }
    
    // Filtre per floració
    if (!empty($floraciens)) {
        $output .= '<div class="grup-filtre floracio-filtre">';
        $output .= '<span class="etiqueta-filtre">Floració:</span>';
        $output .= '<div class="botons-filtre">';
        $output .= '<button class="filtre-boto actiu" data-group="floracio" data-filtre="tots">Totes</button>';
        
        // Ordenar floraciens
        sort($floraciens);
        
        // Crear botons de filtre per cada època de floració
        foreach ($floraciens as $floracio) {
            // Formatem el nom per mostrar correctament
            $nom_floracio = ucfirst($floracio);
            $output .= '<button class="filtre-boto" data-group="floracio" data-filtre="' . $floracio . '">' . $nom_floracio . '</button>';
        }
        
        $output .= '</div>'; // Fi botons-filtre
        $output .= '</div>'; // Fi grup-filtre floracio
    }
    
    // Recopilar fullatge de les plantes
    $fullatges = array();
    foreach ($plantes as $planta) {
        if (isset($planta['caracteristiques']['fullatge'])) {
            $fullatge = $planta['caracteristiques']['fullatge'];
            if (!in_array($fullatge, $fullatges)) {
                $fullatges[] = $fullatge;
            }
        }
    }
    
    // Filtre per fullatge
    if (!empty($fullatges)) {
        $output .= '<div class="grup-filtre fullatge-filtre">';
        $output .= '<span class="etiqueta-filtre">Fullatge:</span>';
        $output .= '<div class="botons-filtre">';
        $output .= '<button class="filtre-boto actiu" data-group="fullatge" data-filtre="tots">Tots</button>';
        
        // Ordenar fullatges
        sort($fullatges);
        
        // Crear botons de filtre per cada tipus de fullatge
        foreach ($fullatges as $fullatge) {
            $nom_fullatge = ucfirst($fullatge);
            $output .= '<button class="filtre-boto" data-group="fullatge" data-filtre="' . $fullatge . '">' . $nom_fullatge . '</button>';
        }
        
        $output .= '</div>'; // Fi botons-filtre
        $output .= '</div>'; // Fi grup-filtre fullatge
    }
    
    // Recopilar usos de les plantes
    $usos = array();
    foreach ($plantes as $planta) {
        if (isset($planta['usos'])) {
            $usos_planta = $planta['usos'];
            if (is_array($usos_planta)) {
                foreach ($usos_planta as $u) {
                    // Extreure només la part principal de l'ús (abans del parèntesi)
                    $us_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $u));
                    
                    // Normalitzar per al filtre
                    $us_normalitzat = str_replace(' ', '_', strtolower($us_principal));
                    
                    if (!array_key_exists($us_normalitzat, $usos)) {
                        $usos[$us_normalitzat] = $us_principal;
                    }
                }
            }
        }
    }
    
    // Filtre per usos
    if (!empty($usos)) {
        $output .= '<div class="grup-filtre usos-filtre">';
        $output .= '<span class="etiqueta-filtre">Usos:</span>';
        $output .= '<div class="botons-filtre">';
        $output .= '<button class="filtre-boto actiu" data-group="usos" data-filtre="tots">Tots</button>';
        
        // Ordenar usos
        asort($usos);
        
        // Crear botons de filtre per cada ús
        foreach ($usos as $us_normalitzat => $us_nom) {
            $output .= '<button class="filtre-boto" data-group="usos" data-filtre="' . $us_normalitzat . '">' . ucfirst($us_nom) . '</button>';
        }
        
        $output .= '</div>'; // Fi botons-filtre
        $output .= '</div>'; // Fi grup-filtre usos
    }
    
    $output .= '</div>'; // Fi filtres-barra
    
    // Afegir secció per mostrar els filtres actius
    $output .= '<div class="filtres-actius-contenidor">';
    $output .= '<span class="etiqueta-filtres-actius">Filtres actius:</span>';
    $output .= '<div class="filtres-actius"></div>';
    $output .= '<button class="netejar-filtres" style="display: none;">Netejar tots els filtres</button>';
    $output .= '</div>';
    
    // Barra de cerca
    $output .= '<div class="cerca-contenidor">';
    $output .= '<input type="text" id="cerca-plantes" placeholder="Cercar per paraules clau..." class="cerca-input" />';
    $output .= '</div>';
    
    $output .= '</div>'; // Fi filtres-contenidor
    
    // Graella de plantes
    $output .= '<div class="plantes-grid">';
    
    foreach ($plantes as $planta) {
        // Obtenir les imatges per aquesta planta
        $imatges = gb_obtenir_imatges_planta($planta['nom_cientific']);
        
        // Crear un ID únic per a la planta (per enllaçar-la)
        $planta_id = sanitize_title($planta['nom_cientific']);
        
        // Determinar el tipus d'imatge principal per a filtres
        $tipus_imatge_principal = isset($imatges['principal_tipus']) ? $imatges['principal_tipus'] : 'general';
        
        // Preparar totes les imatges i els seus tipus com a atributs de dades
        $imatges_json = array();
        
        // Afegir la imatge principal
        if (!empty($imatges['principal'])) {
            $imatges_json[$imatges['principal_tipus']] = $imatges['principal'];
            $imatges_json['principal'] = $imatges['principal'];
        }
        
        // Afegir les imatges de detall
        if (!empty($imatges['detalls'])) {
            foreach ($imatges['detalls'] as $i => $imatge_detall) {
                $tipus = isset($imatges['detalls_tipus'][$i]) ? $imatges['detalls_tipus'][$i] : 'general';
                // Si ja tenim una imatge d'aquest tipus, només guardem la primera
                if (!isset($imatges_json[$tipus])) {
                    $imatges_json[$tipus] = $imatge_detall;
                }
            }
        }
        
        $imatges_data = "data-imatges='" . esc_attr(json_encode($imatges_json)) . "'";
        
        // Preparar dades per a filtres addicionals
        $colors_data = '';
        if (isset($planta['colors'])) {
            $colors_processats = array();
            if (is_array($planta['colors'])) {
                foreach ($planta['colors'] as $color) {
                    // Extreure només la part principal del color (abans del parèntesi)
                    $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $color));
                    $color_normalitzat = strtolower($color_principal);
                    $colors_processats[] = $color_normalitzat;
                }
                $colors_data = 'data-colors="' . implode(' ', $colors_processats) . '"';
            } else {
                // Extreure només la part principal del color (abans del parèntesi)
                $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $planta['colors']));
                $color_normalitzat = strtolower($color_principal);
                $colors_data = 'data-colors="' . $color_normalitzat . '"';
            }
        }
        
        $habitat_data = '';
        if (isset($planta['habitat'])) {
            $habitats_normalitzats = array();
            if (is_array($planta['habitat'])) {
                foreach ($planta['habitat'] as $h) {
                    // Extreure només la part principal abans del parèntesi
                    $habitat_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $h));
                    $habitat_normalitzat = str_replace(' ', '_', strtolower($habitat_principal));
                    $habitats_normalitzats[] = $habitat_normalitzat;
                }
            } else {
                $habitat_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $planta['habitat']));
                $habitat_normalitzat = str_replace(' ', '_', strtolower($habitat_principal));
                $habitats_normalitzats[] = $habitat_normalitzat;
            }
            $habitat_data = 'data-habitats="' . implode(' ', $habitats_normalitzats) . '"';
        }
        
        // Afegir dades de floració
        $floracio_data = '';
        if (isset($planta['caracteristiques']['floracio'])) {
            $floracio = $planta['caracteristiques']['floracio'];
            if (is_array($floracio)) {
                $floracions_normalitzades = array();
                foreach ($floracio as $f) {
                    // Eliminar text entre parèntesis i normalitzar
                    $f_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $f));
                    $f_normalitzat = strtolower($f_principal);
                    $floracions_normalitzades[] = $f_normalitzat;
                }
                $floracio_data = 'data-floracio="' . implode(' ', $floracions_normalitzades) . '"';
            }
        }
        
        // Afegir dades de fullatge
        $fullatge_data = '';
        if (isset($planta['caracteristiques']['fullatge'])) {
            $fullatge_data = 'data-fullatge="' . $planta['caracteristiques']['fullatge'] . '"';
        }
        
        // Afegir dades d'usos
        $usos_data = '';
        if (isset($planta['usos'])) {
            $usos_normalitzats = array();
            if (is_array($planta['usos'])) {
                foreach ($planta['usos'] as $u) {
                    // Extreure només la part principal de l'ús (abans del parèntesi)
                    $us_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $u));
                    $us_normalitzat = str_replace(' ', '_', strtolower($us_principal));
                    $usos_normalitzats[] = $us_normalitzat;
                }
                $usos_data = 'data-usos="' . implode(' ', $usos_normalitzats) . '"';
            }
        }
        
        // Afegir informació completa per a la cerca
        $info_completa = $planta['nom_comu'] . ' ' . $planta['nom_cientific'] . ' ' . $planta['familia'];
        
        // Afegir descripció
        $info_completa .= ' ' . $planta['descripcio'];
        
        // Afegir tipus
        $info_completa .= ' ' . $planta['tipus'];
        
        // Afegir característiques (només els valors, no les claus)
        if (isset($planta['caracteristiques'])) {
            foreach ($planta['caracteristiques'] as $valor) {
                if (is_array($valor)) {
                    $info_completa .= ' ' . implode(' ', $valor);
                } else {
                    $info_completa .= ' ' . $valor;
                }
            }
        }
        
        // Afegir usos (sense parèntesis)
        if (isset($planta['usos'])) {
            $usos_cercables = array();
            foreach ($planta['usos'] as $us) {
                $us_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $us));
                $usos_cercables[] = $us_principal;
            }
            $info_completa .= ' ' . implode(' ', $usos_cercables);
        }
        
        // Afegir colors
        if (isset($planta['colors'])) {
            if (is_array($planta['colors'])) {
                $colors_cercables = array();
                foreach ($planta['colors'] as $color) {
                    // Extreure la part principal del color per a la cerca
                    $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $color));
                    $colors_cercables[] = $color_principal;
                }
                $info_completa .= ' ' . implode(' ', $colors_cercables);
            } else {
                $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $planta['colors']));
                $info_completa .= ' ' . $color_principal;
            }
        }
        
        // Afegir hàbitats (només la part principal)
        if (isset($planta['habitat'])) {
            $habitats_cercables = array();
            if (is_array($planta['habitat'])) {
                foreach ($planta['habitat'] as $h) {
                    $habitat_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $h));
                    $habitats_cercables[] = $habitat_principal;
                }
            } else {
                $habitat_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $planta['habitat']));
                $habitats_cercables[] = $habitat_principal;
            }
            $info_completa .= ' ' . implode(' ', $habitats_cercables);
        }
        
        $info_completa_data = 'data-info-completa="' . esc_attr($info_completa) . '"';
        
        $output .= '<div class="planta-item" data-tipus="' . $planta['tipus'] . '" data-tipus-imatge="' . $tipus_imatge_principal . '" ' . $colors_data . ' ' . $habitat_data . ' ' . $floracio_data . ' ' . $fullatge_data . ' ' . $usos_data . ' ' . $info_completa_data . ' ' . $imatges_data . ' id="planta-' . $planta_id . '">';
        
        // Imatge principal (cliclable per veure més detalls)
        $output .= '<div class="planta-imatge">';
        $imatge_url = plugins_url('assets/imatges/' . $imatges['principal'], __FILE__);
        $output .= '<a href="#" class="planta-obrir-detall" data-planta="' . $planta_id . '">';
        if (!empty($imatges['principal'])) {
            $output .= '<img class="planta-imatge-principal" src="' . $imatge_url . '" alt="' . esc_attr($planta['nom_comu']) . '" data-imatge-principal="' . esc_attr($imatges['principal']) . '">';
            // Afegir indicador de tipus d'imatge si no és "general"
            if ($tipus_imatge_principal != 'general') {
                $output .= '<span class="planta-tipus-imatge">' . ucfirst($tipus_imatge_principal) . '</span>';
            }
        } else {
            $output .= '<div class="planta-sense-imatge">Imatge no disponible</div>';
        }
        $output .= '</a>';
        $output .= '</div>';
        
        // Informació bàsica
        $output .= '<div class="planta-info">';
        $output .= '<h3>' . esc_html($planta['nom_comu']) . '</h3>';
        $output .= '<p class="nom-cientific">' . esc_html($planta['nom_cientific']) . '</p>';
        $output .= '<p class="familia">Família: ' . esc_html($planta['familia']) . '</p>';
        $output .= '</div>';
        
        // Botó per veure més detalls
        $output .= '<div class="planta-boto-detalls">';
        $output .= '<a href="#" class="planta-obrir-detall" data-planta="' . $planta_id . '">Veure detalls</a>';
        $output .= '</div>';
        
        $output .= '</div>'; // Fi de planta-item
    }
    
    $output .= '</div>'; // Fi de plantes-grid
    
    // Modal per a mostrar els detalls de la planta (inicialment ocult)
    $output .= '<div class="planta-modal" style="display: none;">';
    $output .= '<div class="planta-modal-contingut">';
    $output .= '<span class="planta-modal-tancar">&times;</span>';
    $output .= '<div class="planta-modal-cos"></div>'; // Aquí es carregarà el contingut dinàmicament
    $output .= '</div>';
    $output .= '</div>';
    
    // Afegir dades de plantes en format JSON per utilitzar-les amb JavaScript
    $output .= '<script type="text/javascript">';
    $output .= 'var gb_plantes_data = ' . json_encode($plantes) . ';';
    $output .= '</script>';
    
    $output .= '</div>'; // Fi de galeria-botanica
    
    return $output;
}

// Registrar el shortcode
add_shortcode('galeria_botanica', 'gb_galeria_shortcode');

// Funció AJAX per obtenir els detalls d'una planta
function gb_obtenir_detalls_planta_ajax() {
    // Afegir registres de depuració
    error_log('Petició AJAX rebuda per obtenir detalls de planta');
    
    // Comprovar que tenim l'ID de la planta
    if (!isset($_POST['planta_id'])) {
        error_log('No s\'ha especificat la planta_id');
        wp_send_json_error('No s\'ha especificat la planta');
    }
    
    $planta_id = sanitize_text_field($_POST['planta_id']);
    error_log('Buscant planta amb ID: ' . $planta_id);
    
    // Si tenim el nom científic, registrem-lo també per a depuració
    if (isset($_POST['nom_cientific'])) {
        $nom_cientific = sanitize_text_field($_POST['nom_cientific']);
        error_log('Nom científic proporcionat: ' . $nom_cientific);
    }
    
    // Carregar les dades
    $dades = gb_carregar_diccionari();
    $plantes = $dades['plantes'];
    
    // Buscar la planta
    $planta_trobada = null;
    
    // Primer, buscar per ID exacte (prioritat màxima)
    foreach ($plantes as $planta) {
        if (isset($planta['id']) && $planta['id'] === $planta_id) {
            error_log('Planta trobada per ID exacte: ' . $planta_id);
            $planta_trobada = $planta;
            break;
        }
    }
    
    // Si no s'ha trobat per ID, intentar per sanitize_title del nom científic (comportament original)
    if ($planta_trobada === null) {
        foreach ($plantes as $planta) {
            if (sanitize_title($planta['nom_cientific']) === $planta_id) {
                error_log('Planta trobada per sanitize_title del nom científic');
                $planta_trobada = $planta;
                break;
            }
        }
    }
    
    // Si encara no s'ha trobat, provar amb una coincidència directa del nom científic
    if ($planta_trobada === null && isset($_POST['nom_cientific'])) {
        $nom_cientific = sanitize_text_field($_POST['nom_cientific']);
        foreach ($plantes as $planta) {
            if ($planta['nom_cientific'] === $nom_cientific) {
                error_log('Planta trobada per nom científic exacte');
                $planta_trobada = $planta;
                break;
            }
        }
    }
    
    if ($planta_trobada === null) {
        error_log('No s\'ha trobat la planta amb ID: ' . $planta_id);
        if (isset($_POST['nom_cientific'])) {
            error_log('Tampoc s\'ha trobat per nom científic: ' . $_POST['nom_cientific']);
        }
        
        // Registrar totes les plantes disponibles per a depuració
        error_log('Plantes disponibles:');
        foreach ($plantes as $index => $planta) {
            $id_registrat = isset($planta['id']) ? $planta['id'] : 'No definit';
            $nom_cientific_registrat = $planta['nom_cientific'];
            error_log("Planta {$index}: ID={$id_registrat}, Nom={$nom_cientific_registrat}");
        }
        
        wp_send_json_error('No s\'ha trobat la planta');
    }
    
    // Obtenir les imatges
    $imatges = gb_obtenir_imatges_planta($planta_trobada['nom_cientific']);
    
    // Construir l'HTML per al modal
    $output = '<div class="planta-detall-individual">';
    
    // Informació principal
    $output .= '<h2>' . esc_html($planta_trobada['nom_comu']) . '</h2>';
    $output .= '<h3 class="nom-cientific">' . esc_html($planta_trobada['nom_cientific']) . '</h3>';
    
    // Galeria d'imatges
    $output .= '<div class="planta-galeria-completa">';
    
    // Imatge principal
    if (!empty($imatges['principal'])) {
        $imatge_url = plugins_url('assets/imatges/' . $imatges['principal'], __FILE__);
        $output .= '<div class="planta-imatge-principal">';
        $output .= '<img src="' . $imatge_url . '" alt="' . esc_attr($planta_trobada['nom_comu']) . '" data-tipus="' . esc_attr($imatges['principal_tipus']) . '">';
        // Afegir etiqueta de tipus d'imatge si existeix
        if (isset($imatges['principal_tipus']) && $imatges['principal_tipus'] != 'general') {
            $output .= '<span class="planta-tipus-imatge-detall">' . ucfirst($imatges['principal_tipus']) . '</span>';
        }
        $output .= '</div>';
    } else {
        $output .= '<div class="planta-imatge-principal planta-sense-imatge">';
        $output .= '<div>Imatge no disponible</div>';
        $output .= '</div>';
    }
    
    // Imatges de detall
    if (!empty($imatges['detalls'])) {
        $output .= '<div class="planta-imatges-detall-galeria">';
        foreach ($imatges['detalls'] as $i => $imatge_detall) {
            $imatge_detall_url = plugins_url('assets/imatges/' . $imatge_detall, __FILE__);
            $tipus_imatge = isset($imatges['detalls_tipus'][$i]) ? $imatges['detalls_tipus'][$i] : 'general';
            
            $output .= '<div class="planta-imatge-detall" data-tipus="' . esc_attr($tipus_imatge) . '">';
            $output .= '<img src="' . $imatge_detall_url . '" alt="Detall de ' . esc_attr($planta_trobada['nom_comu']) . '" data-tipus="' . esc_attr($tipus_imatge) . '">';
            // Afegir etiqueta de tipus si no és general
            if ($tipus_imatge != 'general') {
                $output .= '<span class="planta-tipus-imatge-detall">' . ucfirst($tipus_imatge) . '</span>';
            }
            $output .= '</div>';
        }
        $output .= '</div>';
    }
    
    $output .= '</div>'; // Fi de la galeria
    
    // Informació completa
    $output .= '<div class="planta-info-completa">';
    
    // Descripció
    $output .= '<div class="planta-seccio">';
    $output .= '<h4>Descripció</h4>';
    $output .= '<p>' . esc_html($planta_trobada['descripcio']) . '</p>';
    $output .= '</div>';
    
    // Família
    $output .= '<div class="planta-seccio">';
    $output .= '<h4>Classificació</h4>';
    $output .= '<p><strong>Família:</strong> ' . esc_html($planta_trobada['familia']) . '</p>';
    $output .= '<p><strong>Tipus:</strong> ' . esc_html(ucfirst($planta_trobada['tipus'])) . '</p>';
    $output .= '</div>';
    
    // Característiques (amb informació completa)
    if (isset($planta_trobada['caracteristiques'])) {
        $output .= '<div class="planta-seccio">';
        $output .= '<h4>Característiques</h4>';
        $output .= '<ul>';
        
        foreach ($planta_trobada['caracteristiques'] as $clau => $valor) {
            // Formatar el text de la clau
            $clau_formatada = ucfirst(str_replace('_', ' ', $clau));
            
            // Formatar el valor (pot ser string o array)
            if (is_array($valor)) {
                $valor_formatat = implode(', ', $valor);
            } else {
                $valor_formatat = $valor;
            }
            
            $output .= '<li><strong>' . esc_html($clau_formatada) . ':</strong> ' . esc_html($valor_formatat) . '</li>';
        }
        
        $output .= '</ul>';
        $output .= '</div>';
    }
    
    // Usos
    if (isset($planta_trobada['usos']) && !empty($planta_trobada['usos'])) {
        $output .= '<div class="planta-seccio">';
        $output .= '<h4>Usos</h4>';
        $output .= '<p>' . esc_html(implode(', ', $planta_trobada['usos'])) . '</p>';
        $output .= '</div>';
    }
    
    // Colors (si existeixen)
    if (isset($planta_trobada['colors']) && !empty($planta_trobada['colors'])) {
        $output .= '<div class="planta-seccio">';
        $output .= '<h4>Colors</h4>';
        
        $colors_formatats = array();
        $colors = $planta_trobada['colors'];
        if (is_array($colors)) {
            foreach ($colors as $color) {
                // Aquí NO eliminem els parèntesis perquè volem mostrar-los al detall
                $colors_formatats[] = ucfirst($color);
            }
        } else {
            $colors_formatats[] = ucfirst($colors);
        }
        
        $output .= '<p>' . esc_html(implode(', ', $colors_formatats)) . '</p>';
        $output .= '</div>';
    }
    
    // Hàbitat al campus
    if (isset($planta_trobada['habitat']) && !empty($planta_trobada['habitat'])) {
        $output .= '<div class="planta-seccio">';
        $output .= '<h4>Hàbitat al campus</h4>';
        
        $habitats_formatats = array();
        foreach ($planta_trobada['habitat'] as $habitat) {
            // Separar el hàbitat principal i els detalls
            $parts = explode('(', $habitat);
            $habitat_principal = trim($parts[0]);
            
            // Substituir guions baixos per espais si n'hi ha
            $habitat_principal = str_replace('_', ' ', $habitat_principal);
            
            $text_habitat = ucfirst($habitat_principal);
            
            // Si hi ha detalls entre parèntesis, afegir-los
            if (count($parts) > 1) {
                $detalls = trim(rtrim($parts[1], ')'));
                // També substituir guions baixos en els detalls
                $detalls = str_replace('_', ' ', $detalls);
                $text_habitat .= ' (' . $detalls . ')';
            }
            
            $habitats_formatats[] = $text_habitat;
        }
        
        $output .= '<ul>';
        foreach ($habitats_formatats as $habitat) {
            $output .= '<li>' . esc_html($habitat) . '</li>';
        }
        $output .= '</ul>';
        $output .= '</div>';
    }
    
    // Coordenades / Mapa (si hi ha coordenades)
    if (isset($planta_trobada['coordenades']) && !empty($planta_trobada['coordenades'])) {
        $output .= '<div class="planta-seccio">';
        $output .= '<h4>Localització al campus</h4>';
        $output .= '<ul>';
        
        foreach ($planta_trobada['coordenades'] as $coord) {
            $output .= '<li><strong>' . esc_html($coord['zona']) . '</strong> ';
            $output .= 'Coordenades: ' . esc_html($coord['lat']) . ', ' . esc_html($coord['lng']);
            $output .= '</li>';
        }
        
        $output .= '</ul>';
        $output .= '</div>';
    }
    
    $output .= '</div>'; // Fi de planta-info-completa
    
    $output .= '</div>'; // Fi de planta-detall-individual
    
    wp_send_json_success($output);
}

add_action('wp_ajax_obtenir_detalls_planta', 'gb_obtenir_detalls_planta_ajax');
add_action('wp_ajax_nopriv_obtenir_detalls_planta', 'gb_obtenir_detalls_planta_ajax');

// Incloure el fitxer del mapa
require_once plugin_dir_path(__FILE__) . 'mapa-botanica-uab.php';

?>