<?php
/*
 * Mapa Botànic UAB – versió amb sistema de filtres complet idèntic al de la galeria
 * Forma part del plugin «Galeria Botànica UAB»
 */

// Evitar accés directe
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * 1. Carreguem CSS/JS només quan una pàgina inclou el shortcode [mapa_botanica]
 */
function mb_registrar_assets() {
    global $post;

    if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'mapa_botanica' ) ) {
        /* --- Leaflet & MarkerCluster -------------------------------------------------- */
        wp_enqueue_style( 'leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', [], '1.9.4' );
        wp_enqueue_style( 'leaflet-markercluster-css',          'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css',          [ 'leaflet-css' ], '1.4.1' );
        wp_enqueue_style( 'leaflet-markercluster-default-css',  'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css', [ 'leaflet-markercluster-css' ], '1.4.1' );
        wp_enqueue_script( 'leaflet-js',           'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', [], '1.9.4', true );
        wp_enqueue_script( 'leaflet-markercluster','https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster-src.js', [ 'leaflet-js' ], '1.4.1', true );

        /* --- Estils propis (comparteixen paleta amb la galeria) ----------------------- */
        wp_enqueue_style( 'mapa-botanica-css', plugins_url( 'assets/css/mapa-botanica.css', __FILE__ ), [ 'leaflet-css' ], '1.1.1' );

        /* --- JS propi ---------------------------------------------------------------- */
        wp_enqueue_script( 'mapa-botanica-js', plugins_url( 'assets/js/mapa-botanica.js', __FILE__ ), [ 'jquery', 'leaflet-js', 'leaflet-markercluster' ], '1.1.1', true );

        /* --- Dades JSON a JS ---------------------------------------------------------- */
        wp_localize_script( 'mapa-botanica-js', 'mb_vars', [
            'ajaxurl'    => admin_url( 'admin-ajax.php' ),
            'plugin_url' => plugins_url( '', __FILE__ ),
            'dades_plantes' => mb_obtenir_dades_plantes_mapa(),
        ] );
    }
}
add_action( 'wp_enqueue_scripts', 'mb_registrar_assets' );

/**
 * 2. Preparem les dades simplificades que JS necessita (imatge + coordenades)
 * VERSIÓ MILLORADA: Precomputem les dades normalitzades per a filtratges
 */
function mb_obtenir_dades_plantes_mapa() {
    $json_path = plugin_dir_path( __FILE__ ) . 'dades/plantes.json';

    if ( file_exists( $json_path ) ) {
        $dades = json_decode( file_get_contents( $json_path ), true );
        $plantes_mapa = [];

        foreach ( $dades['plantes'] as $planta ) {
            if ( empty( $planta['coordenades'] ) ) {
                continue; // saltem les que no tenen coords
            }

            $imatges  = gb_obtenir_imatges_planta( $planta['nom_cientific'] );
            $img_url  = empty( $imatges['principal'] ) ? '' : plugins_url( 'assets/imatges/' . $imatges['principal'], __FILE__ );

            // Preprocessar i normalitzar habitat
            $habitats_normalitzats = [];
            if (!empty($planta['habitat'])) {
                foreach ((array)$planta['habitat'] as $h) {
                    $h_norm = mb_normalitza($h);
                    $habitats_normalitzats[] = $h_norm;
                }
            }
            
            // Preprocessar i normalitzar floracio
            $floracio_normalitzada = [];
            if (!empty($planta['caracteristiques']['floracio'])) {
                foreach ((array)$planta['caracteristiques']['floracio'] as $f) {
                    $f_norm = mb_normalitza($f);
                    $floracio_normalitzada[] = $f_norm;
                }
            }
            
            // Preprocessar i normalitzar usos
            $usos_normalitzats = [];
            if (!empty($planta['usos'])) {
                foreach ((array)$planta['usos'] as $u) {
                    $u_norm = mb_normalitza($u);
                    $usos_normalitzats[] = $u_norm;
                }
            }
            
            // Obtenir fullatge
            $fullatge = isset($planta['caracteristiques']['fullatge']) ? 
                        $planta['caracteristiques']['fullatge'] : '';

            // Construir text de cerca complet (similar a la galeria)
            $info_completa = $planta['nom_comu'] . ' ' . $planta['nom_cientific'] . ' ' . $planta['familia'];
            
            // Afegir descripció
            if (!empty($planta['descripcio'])) {
                $info_completa .= ' ' . $planta['descripcio'];
            }
            
            // Afegir tipus
            $info_completa .= ' ' . $planta['tipus'];
            
            // Afegir característiques
            if (!empty($planta['caracteristiques'])) {
                foreach ($planta['caracteristiques'] as $key => $valor) {
                    if (is_array($valor)) {
                        $info_completa .= ' ' . implode(' ', $valor);
                    } else {
                        $info_completa .= ' ' . $valor;
                    }
                }
            }
            
            // Afegir usos
            if (!empty($planta['usos'])) {
                $usos_text = [];
                foreach ($planta['usos'] as $us) {
                    $us_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $us));
                    $usos_text[] = $us_principal;
                }
                $info_completa .= ' ' . implode(' ', $usos_text);
            }
            
            // Afegir colors
            if (!empty($planta['colors'])) {
                if (is_array($planta['colors'])) {
                    $colors_text = [];
                    foreach ($planta['colors'] as $color) {
                        $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $color));
                        $colors_text[] = $color_principal;
                    }
                    $info_completa .= ' ' . implode(' ', $colors_text);
                } else {
                    $color_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $planta['colors']));
                    $info_completa .= ' ' . $color_principal;
                }
            }
            
            // Afegir hàbitats
            if (!empty($planta['habitat'])) {
                $habitats_text = [];
                foreach ((array)$planta['habitat'] as $hab) {
                    $habitat_principal = trim(preg_replace('/\s*\(.*?\)\s*/', '', $hab));
                    $habitats_text[] = $habitat_principal;
                }
                $info_completa .= ' ' . implode(' ', $habitats_text);
            }

            $plantes_mapa[] = [
                'id'         => $planta['id'],
                'nom_comu'   => $planta['nom_comu'],
                'nom_cientific' => $planta['nom_cientific'],
                'familia'    => $planta['familia'],
                'tipus'      => $planta['tipus'],
                'coordenades'=> $planta['coordenades'],
                'imatge'     => $img_url,
                'habitat'    => $planta['habitat'] ?? [],
                'habitat_norm' => $habitats_normalitzats,
                'floracio'   => isset($planta['caracteristiques']['floracio']) ? $planta['caracteristiques']['floracio'] : [],
                'floracio_norm' => $floracio_normalitzada,
                'usos'       => $planta['usos'] ?? [],
                'usos_norm'  => $usos_normalitzats,
                'fullatge'   => $fullatge,
                'info_completa' => $info_completa
            ];
        }
        return $plantes_mapa;
    }
    return [];
}

/**
 * Helper de normalització (mateix criteri que la galeria)
 */
function mb_normalitza( $text ) {
    // Eliminar text entre parèntesis
    $text = strtolower( trim( preg_replace( '/\s*\(.*?\)\s*/', '', $text ) ) );
    // Substituir espais per guions baixos
    $text = str_replace( ' ', '_', $text );
    return $text;
}

/**
 * 3. Shortcode [mapa_botanica]
 */
function mb_mapa_shortcode( $atts ) {
    $atts = shortcode_atts( [
        'altura'         => '600px',
        'filtre_inicial' => 'tots',
        'zoom_inicial'   => 16,
    ], $atts );

    /* ---------------------------------------------------------------------
       3.1 Recompte de valors únics per crear botons de filtre
    --------------------------------------------------------------------- */
    $tipus_uniques     = [];
    $habitat_uniques   = [];
    $floracio_uniques  = [];
    $usos_uniques      = [];
    $fullatge_uniques  = [];

    foreach ( mb_obtenir_dades_plantes_mapa() as $pl ) {
        /* TIPUS */
        $tipus_uniques[ $pl['tipus'] ] = true;

        /* HÀBITAT (ara usem els valors ja normalitzats) */
        foreach ( (array) ( $pl['habitat_norm'] ?? [] ) as $hab ) {
            $habitat_uniques[ $hab ] = ucfirst( str_replace( '_', ' ', $hab ) );
        }

        /* FLORACIÓ (ara usem els valors ja normalitzats) */
        foreach ( (array) ( $pl['floracio_norm'] ?? [] ) as $fl ) {
            $floracio_uniques[ $fl ] = ucfirst( $fl );
        }

        /* USOS (ara usem els valors ja normalitzats) */
        foreach ( (array) ( $pl['usos_norm'] ?? [] ) as $u ) {
            $usos_uniques[ $u ] = ucfirst( str_replace( '_', ' ', $u ) );
        }

        /* FULLATGE */
        if (!empty($pl['fullatge'])) {
            $fullatge_uniques[$pl['fullatge']] = ucfirst($pl['fullatge']);
        }
    }

    ksort( $tipus_uniques );
    ksort( $habitat_uniques );
    ksort( $floracio_uniques );
    ksort( $usos_uniques );
    ksort( $fullatge_uniques );

    /* ---------------------------------------------------------------------
       3.2 Construcció de la sortida HTML
    --------------------------------------------------------------------- */
    ob_start();
    ?>
    <div class="mapa-botanica-contenidor">
        <!-- BARRA DE FILTRES -->
        <div class="mapa-filtres">
            <div class="filtres-grup">
                <!-- TIPUS -->
                <div class="grup-filtre tipus-planta-filtre">
                    <span class="etiqueta-filtre">Tipus:</span>
                    <div class="botons-filtre">
                        <button class="filtre-boto actiu" data-group="tipus" data-filtre="tots">Totes les plantes</button>
                        <?php foreach ( array_keys( $tipus_uniques ) as $tipus ) : ?>
                            <button class="filtre-boto" data-group="tipus" data-filtre="<?php echo esc_attr( $tipus ); ?>">
                                <?php echo ucfirst( $tipus ); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- HÀBITAT -->
                <div class="grup-filtre habitat-filtre">
                    <span class="etiqueta-filtre">Hàbitat:</span>
                    <div class="botons-filtre">
                        <button class="filtre-boto actiu" data-group="habitat" data-filtre="tots">Tots</button>
                        <?php foreach ( $habitat_uniques as $slug => $nom ) : ?>
                            <button class="filtre-boto" data-group="habitat" data-filtre="<?php echo esc_attr( $slug ); ?>">
                                <?php echo esc_html( $nom ); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- FLORACIÓ -->
                <div class="grup-filtre floracio-filtre">
                    <span class="etiqueta-filtre">Floració:</span>
                    <div class="botons-filtre">
                        <button class="filtre-boto actiu" data-group="floracio" data-filtre="tots">Totes</button>
                        <?php foreach ( $floracio_uniques as $fl => $nom ) : ?>
                            <button class="filtre-boto" data-group="floracio" data-filtre="<?php echo esc_attr( $fl ); ?>">
                                <?php echo esc_html( $nom ); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- USOS -->
                <div class="grup-filtre usos-filtre">
                    <span class="etiqueta-filtre">Usos:</span>
                    <div class="botons-filtre">
                        <button class="filtre-boto actiu" data-group="usos" data-filtre="tots">Tots</button>
                        <?php foreach ( $usos_uniques as $slug => $nom ) : ?>
                            <button class="filtre-boto" data-group="usos" data-filtre="<?php echo esc_attr( $slug ); ?>">
                                <?php echo esc_html( $nom ); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- FULLATGE -->
                <?php if (!empty($fullatge_uniques)) : ?>
                <div class="grup-filtre fullatge-filtre">
                    <span class="etiqueta-filtre">Fullatge:</span>
                    <div class="botons-filtre">
                        <button class="filtre-boto actiu" data-group="fullatge" data-filtre="tots">Tots</button>
                        <?php foreach ( $fullatge_uniques as $slug => $nom ) : ?>
                            <button class="filtre-boto" data-group="fullatge" data-filtre="<?php echo esc_attr( $slug ); ?>">
                                <?php echo esc_html( $nom ); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>

                <!-- CERCADOR -->
                <div class="cerca-contenidor">
                    <input type="text" id="mapa-cerca" placeholder="Cercar per paraules clau..." class="cerca-input" />
                </div>
            </div><!-- /.filtres-grup -->

            <!-- FILTRES ACTIUS + NETEJAR -->
            <div class="filtres-actius-contenidor">
                <span class="etiqueta-filtres-actius">Filtres actius:</span>
                <div class="filtres-actius"></div>
                <button class="netejar-filtres" style="display:none;">Netejar tots els filtres</button>
            </div>
        </div><!-- /.mapa-filtres -->

        <!-- MAPA -->
        <div id="mapa-botanica" style="height: <?php echo esc_attr( $atts['altura'] ); ?>;"></div>
        
    </div><!-- /.mapa-botanica-contenidor -->
    <?php
    return ob_get_clean();
}
add_shortcode( 'mapa_botanica', 'mb_mapa_shortcode' );

?>