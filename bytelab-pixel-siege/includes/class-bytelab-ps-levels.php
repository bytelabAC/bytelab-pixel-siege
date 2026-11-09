<?php
/**
 * Custom levels authored as JSON.
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'ABSPATH' ) || exit;

/**
 * Validates and exposes author-supplied levels.
 *
 * The JSON format mirrors the runtime level shape:
 *
 *     { "name": { "fa": "...", "en": "..." },
 *       "birds": [ "byte", "bolt" ],
 *       "blocks": [ { "x": 880, "baseY": 570, "w": 28, "h": 150, "m": "panel" } ],
 *       "bugs":   [ { "x": 880, "surfaceY": 420 } ] }
 */
final class BYTELAB_PS_Levels {

	const OPTION = 'bytelab_ps_custom_levels';

	const MAX_LEVELS = 40;
	const MAX_BLOCKS = 90;
	const MAX_BUGS   = 12;
	const MAX_BIRDS  = 10;

	/**
	 * Materials and birds the renderer understands.
	 *
	 * @return array
	 */
	private static function materials() {
		return array( 'panel', 'wall', 'glass', 'deep' );
	}

	/**
	 * @return array
	 */
	private static function birds() {
		return array( 'byte', 'bolt', 'spark' );
	}

	/**
	 * Decoded, sanitised custom levels.
	 *
	 * @return array
	 */
	public static function get() {
		$raw = get_option( self::OPTION, '' );
		if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
			return array();
		}
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			return array();
		}
		return self::sanitize( $decoded );
	}

	/**
	 * Validate a JSON document, returning the value to store.
	 *
	 * On failure the previous value is kept and a settings error is queued.
	 *
	 * @param string $raw JSON text.
	 * @return string
	 */
	public static function validate_json( $raw ) {
		$raw = (string) $raw;
		if ( '' === trim( $raw ) ) {
			return '';
		}

		$decoded = json_decode( $raw, true );
		if ( null === $decoded && JSON_ERROR_NONE !== json_last_error() ) {
			add_settings_error(
				'bytelab_ps',
				'bytelab_ps_levels_json',
				sprintf(
					/* translators: %s: JSON parser error */
					__( 'The level JSON could not be parsed (%s). The previous levels were kept.', 'bytelab-pixel-siege' ),
					json_last_error_msg()
				),
				'error'
			);
			return (string) get_option( self::OPTION, '' );
		}

		if ( ! is_array( $decoded ) ) {
			add_settings_error(
				'bytelab_ps',
				'bytelab_ps_levels_shape',
				__( 'The level JSON must be an array of levels.', 'bytelab-pixel-siege' ),
				'error'
			);
			return (string) get_option( self::OPTION, '' );
		}

		$clean = self::sanitize( $decoded );
		if ( ! $clean ) {
			add_settings_error(
				'bytelab_ps',
				'bytelab_ps_levels_empty',
				__( 'No usable level was found. Each level needs at least one block and one bug.', 'bytelab-pixel-siege' ),
				'error'
			);
			return (string) get_option( self::OPTION, '' );
		}

		add_settings_error(
			'bytelab_ps',
			'bytelab_ps_levels_ok',
			sprintf(
				/* translators: %d: number of levels */
				_n( '%d custom level accepted.', '%d custom levels accepted.', count( $clean ), 'bytelab-pixel-siege' ),
				count( $clean )
			),
			'success'
		);

		return (string) wp_json_encode( $clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	}

	/**
	 * Sanitise a decoded list of levels.
	 *
	 * @param array $list Raw levels.
	 * @return array
	 */
	public static function sanitize( $list ) {
		if ( ! is_array( $list ) ) {
			return array();
		}

		$out = array();
		foreach ( $list as $entry ) {
			if ( count( $out ) >= self::MAX_LEVELS ) {
				break;
			}
			$level = self::sanitize_level( $entry );
			if ( $level ) {
				$out[] = $level;
			}
		}
		return $out;
	}

	/**
	 * Sanitise one level.
	 *
	 * @param mixed $entry Raw level.
	 * @return array|null
	 */
	private static function sanitize_level( $entry ) {
		if ( ! is_array( $entry ) ) {
			return null;
		}

		$blocks = array();
		$raw_blocks = isset( $entry['blocks'] ) && is_array( $entry['blocks'] ) ? array_slice( $entry['blocks'], 0, self::MAX_BLOCKS ) : array();
		foreach ( $raw_blocks as $b ) {
			if ( ! is_array( $b ) || ! isset( $b['x'] ) ) {
				continue;
			}
			$w = self::clamp( isset( $b['w'] ) ? $b['w'] : 28, 8, 400, 28 );
			$h = self::clamp( isset( $b['h'] ) ? $b['h'] : 28, 8, 400, 28 );
			if ( isset( $b['y'] ) ) {
				$y = self::clamp( $b['y'], -400, 760, null );
			} elseif ( isset( $b['baseY'] ) ) {
				$y = self::clamp( self::num( $b['baseY'] ) - $h / 2, -400, 760, null );
			} else {
				continue;
			}
			if ( null === $y ) {
				continue;
			}
			$m = isset( $b['m'] ) ? sanitize_key( (string) $b['m'] ) : 'panel';
			$blocks[] = array(
				'x' => self::clamp( $b['x'], -200, 1500, 0 ),
				'y' => $y,
				'w' => $w,
				'h' => $h,
				'm' => in_array( $m, self::materials(), true ) ? $m : 'panel',
			);
		}

		$bugs = array();
		$raw_bugs = isset( $entry['bugs'] ) && is_array( $entry['bugs'] ) ? array_slice( $entry['bugs'], 0, self::MAX_BUGS ) : array();
		foreach ( $raw_bugs as $g ) {
			if ( ! is_array( $g ) || ! isset( $g['x'] ) ) {
				continue;
			}
			$r = self::clamp( isset( $g['r'] ) ? $g['r'] : 20, 8, 40, 20 );
			if ( isset( $g['y'] ) ) {
				$y = self::clamp( $g['y'], -400, 760, null );
			} elseif ( isset( $g['surfaceY'] ) ) {
				$y = self::clamp( self::num( $g['surfaceY'] ) - $r, -400, 760, null );
			} else {
				continue;
			}
			if ( null === $y ) {
				continue;
			}
			$bugs[] = array(
				'x' => self::clamp( $g['x'], -200, 1500, 0 ),
				'y' => $y,
				'r' => $r,
			);
		}

		if ( ! $blocks || ! $bugs ) {
			return null;
		}

		$birds = array();
		$raw_birds = isset( $entry['birds'] ) && is_array( $entry['birds'] ) ? array_slice( $entry['birds'], 0, self::MAX_BIRDS ) : array( 'byte', 'byte', 'byte' );
		foreach ( $raw_birds as $bird ) {
			$bird = sanitize_key( (string) $bird );
			$birds[] = in_array( $bird, self::birds(), true ) ? $bird : 'byte';
		}
		if ( ! $birds ) {
			$birds = array( 'byte', 'byte', 'byte' );
		}

		$name = isset( $entry['name'] ) && is_array( $entry['name'] ) ? $entry['name'] : array();
		$fa   = isset( $name['fa'] ) ? $name['fa'] : ( isset( $entry['fa'] ) ? $entry['fa'] : '' );
		$en   = isset( $name['en'] ) ? $name['en'] : ( isset( $entry['en'] ) ? $entry['en'] : '' );

		return array(
			'name'   => array(
				'fa' => self::text( $fa ),
				'en' => self::text( $en ),
			),
			'birds'  => $birds,
			'blocks' => $blocks,
			'bugs'   => $bugs,
		);
	}

	/**
	 * @param mixed $value Value.
	 * @return float
	 */
	private static function num( $value ) {
		return is_numeric( $value ) ? (float) $value : 0.0;
	}

	/**
	 * Clamp a numeric value, returning null when the input is not numeric.
	 *
	 * @param mixed    $value    Raw value.
	 * @param float    $min      Minimum.
	 * @param float    $max      Maximum.
	 * @param float|null $fallback Fallback for non-numeric input.
	 * @return float|null
	 */
	private static function clamp( $value, $min, $max, $fallback ) {
		if ( ! is_numeric( $value ) ) {
			return $fallback;
		}
		$value = (float) $value;
		if ( $value < $min ) {
			return (float) $min;
		}
		if ( $value > $max ) {
			return (float) $max;
		}
		return $value;
	}

	/**
	 * Trim and cut a label.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private static function text( $value ) {
		$value = sanitize_text_field( (string) $value );
		return mb_substr( $value, 0, 60 );
	}
}
