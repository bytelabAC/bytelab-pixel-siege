<?php
/**
 * Unit checks for the custom-level JSON validator.
 * Run with: php tools/test-php-levels.php
 */

define( 'ABSPATH', __DIR__ );

$GLOBALS['bytelab_opts'] = array();
$GLOBALS['bytelab_errors'] = array();

function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function sanitize_key( $s ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $s ) ); }
function _bytelab_test_mb_substr( $s, $start, $len = null ) { return $len === null ? substr( (string) $s, $start ) : substr( (string) $s, $start, $len ); }
function add_settings_error( $code, $id, $message, $type = 'error' ) {
	$GLOBALS['bytelab_errors'][] = array( 'code' => $code, 'id' => $id, 'message' => $message, 'type' => $type );
}
function get_option( $key, $default = '' ) { return array_key_exists( $key, $GLOBALS['bytelab_opts'] ) ? $GLOBALS['bytelab_opts'][ $key ] : $default; }
function wp_json_encode( $value, $flags = 0 ) { return json_encode( $value, $flags ); }
function __( $text, $domain = null ) { return $text; }
function _n( $single, $plural, $number, $domain = null ) { return 1 === (int) $number ? $single : $plural; }

require __DIR__ . '/../bytelab-pixel-siege/includes/class-bytelab-ps-levels.php';

$pass = 0;
$fail = 0;

function check( $label, $condition, $detail = '' ) {
	global $pass, $fail;
	if ( $condition ) {
		$pass++;
		echo "  ok   $label\n";
	} else {
		$fail++;
		echo "  FAIL $label $detail\n";
	}
}

echo "1) valid level with baseY / surfaceY\n";
$json = json_encode(
	array(
		array(
			'name'   => array( 'fa' => 'آزمایش', 'en' => 'Test' ),
			'birds'  => array( 'byte', 'spark' ),
			'blocks' => array(
				array( 'x' => 900, 'baseY' => 570, 'w' => 30, 'h' => 120, 'm' => 'panel' ),
				array( 'x' => 1000, 'baseY' => 570, 'w' => 30, 'h' => 120, 'm' => 'wall' ),
				array( 'x' => 950, 'baseY' => 450, 'w' => 160, 'h' => 24, 'm' => 'glass' ),
			),
			'bugs'   => array(
				array( 'x' => 950, 'surfaceY' => 426, 'r' => 20 ),
			),
		),
	)
);

$stored = BYTELAB_PS_Levels::validate_json( $json );
check( 'stored json is not empty', '' !== $stored );
$GLOBALS['bytelab_opts'][ BYTELAB_PS_Levels::OPTION ] = $stored;

$levels = BYTELAB_PS_Levels::get();
check( 'one level parsed', 1 === count( $levels ) );
check( 'three blocks', 3 === count( $levels[0]['blocks'] ) );
check( 'one bug', 1 === count( $levels[0]['bugs'] ) );
check( 'baseY converted to centre (570 - 60 = 510)', abs( 510 - $levels[0]['blocks'][0]['y'] ) < 0.01, 'got ' . $levels[0]['blocks'][0]['y'] );
check( 'surfaceY converted to centre (426 - 20 = 406)', abs( 406 - $levels[0]['bugs'][0]['y'] ) < 0.01, 'got ' . $levels[0]['bugs'][0]['y'] );
check( 'materials kept', 'wall' === $levels[0]['blocks'][1]['m'] && 'glass' === $levels[0]['blocks'][2]['m'] );
check( 'birds kept', array( 'byte', 'spark' ) === $levels[0]['birds'] );
check( 'name kept', 'آزمایش' === $levels[0]['name']['fa'] );

echo "\n2) clamping and whitelists\n";
$wild = json_encode(
	array(
		array(
			'blocks' => array( array( 'x' => 99999, 'y' => -9999, 'w' => 9999, 'h' => 1, 'm' => 'gold' ) ),
			'bugs'   => array( array( 'x' => -999, 'y' => 9999, 'r' => 999 ) ),
			'birds'  => array( 'dragon', 'BOLT' ),
		),
	)
);
$clean = BYTELAB_PS_Levels::sanitize( json_decode( $wild, true ) );
check( 'level accepted', 1 === count( $clean ) );
check( 'x clamped to 1500', 1500.0 === (float) $clean[0]['blocks'][0]['x'], 'got ' . $clean[0]['blocks'][0]['x'] );
check( 'y clamped to -400', -400.0 === (float) $clean[0]['blocks'][0]['y'] );
check( 'w clamped to 400', 400.0 === (float) $clean[0]['blocks'][0]['w'] );
check( 'h clamped to 8', 8.0 === (float) $clean[0]['blocks'][0]['h'] );
check( 'unknown material -> panel', 'panel' === $clean[0]['blocks'][0]['m'] );
check( 'bird whitelist', array( 'byte', 'bolt' ) === $clean[0]['birds'] );

echo "\n3) rejection paths\n";
$before = $GLOBALS['bytelab_opts'][ BYTELAB_PS_Levels::OPTION ];
$GLOBALS['bytelab_errors'] = array();
$broken = BYTELAB_PS_Levels::validate_json( '{ not json' );
check( 'broken json keeps previous value', $broken === $before );
check( 'error queued', count( $GLOBALS['bytelab_errors'] ) > 0 );

$GLOBALS['bytelab_errors'] = array();
$shape = BYTELAB_PS_Levels::validate_json( '{"a":1}' );
check( 'object (not array) rejected', $shape === $before );
check( 'shape error queued', count( $GLOBALS['bytelab_errors'] ) > 0 );

$empty = BYTELAB_PS_Levels::sanitize( array( array( 'blocks' => array(), 'bugs' => array() ) ) );
check( 'level without blocks dropped', 0 === count( $empty ) );

$no_bugs = BYTELAB_PS_Levels::sanitize( array( array( 'blocks' => array( array( 'x' => 1, 'y' => 1 ) ), 'bugs' => array() ) ) );
check( 'level without bugs dropped', 0 === count( $no_bugs ) );

echo "\n4) limits\n";
$many = array();
for ( $i = 0; $i < 60; $i++ ) {
	$many[] = array(
		'blocks' => array( array( 'x' => 500, 'y' => 500, 'w' => 20, 'h' => 20 ) ),
		'bugs'   => array( array( 'x' => 500, 'y' => 400, 'r' => 20 ) ),
	);
}
$capped = BYTELAB_PS_Levels::sanitize( $many );
check( 'levels capped at 40', 40 === count( $capped ), 'got ' . count( $capped ) );

$lots = array( array( 'blocks' => array(), 'bugs' => array() ) );
for ( $i = 0; $i < 200; $i++ ) {
	$lots[0]['blocks'][] = array( 'x' => 100 + $i, 'y' => 500, 'w' => 20, 'h' => 20 );
	$lots[0]['bugs'][]   = array( 'x' => 100 + $i, 'y' => 400, 'r' => 20 );
}
$lots_clean = BYTELAB_PS_Levels::sanitize( $lots );
check( 'blocks capped at 90', 90 === count( $lots_clean[0]['blocks'] ) );
check( 'bugs capped at 12', 12 === count( $lots_clean[0]['bugs'] ) );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

