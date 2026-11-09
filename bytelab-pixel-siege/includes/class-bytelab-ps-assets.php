<?php
/**
 * Script and style registration.
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'ABSPATH' ) || exit;

/**
 * Assets.
 */
final class BYTELAB_PS_Assets {

	const HANDLE = 'bytelab-pixel-siege';

	/**
	 * Hook up.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register' ), 5 );
		add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'editor' ) );
		add_action( 'enqueue_block_assets', array( __CLASS__, 'block_assets' ) );
	}

	/**
	 * Register front-end assets.
	 *
	 * @return void
	 */
	public static function register() {
		$js = BYTELAB_PS_URL . 'assets/js/';

		wp_register_style(
			self::HANDLE,
			BYTELAB_PS_URL . 'assets/css/game.css',
			array(),
			BYTELAB_PS_VERSION
		);

		wp_register_script( 'bytelab-ps-physics', $js . 'physics.js', array(), BYTELAB_PS_VERSION, true );
		wp_register_script( 'bytelab-ps-levels', $js . 'levels.js', array(), BYTELAB_PS_VERSION, true );
		wp_register_script( 'bytelab-ps-sim', $js . 'sim.js', array( 'bytelab-ps-physics', 'bytelab-ps-levels' ), BYTELAB_PS_VERSION, true );
		wp_register_script( 'bytelab-ps-render', $js . 'render.js', array( 'bytelab-ps-levels' ), BYTELAB_PS_VERSION, true );
		wp_register_script(
			self::HANDLE,
			$js . 'game.js',
			array( 'bytelab-ps-sim', 'bytelab-ps-render' ),
			BYTELAB_PS_VERSION,
			true
		);
	}

	/**
	 * Load the game assets (called from the shortcode and the block).
	 *
	 * @return void
	 */
	public static function enqueue() {
		if ( ! wp_style_is( self::HANDLE, 'registered' ) ) {
			self::register();
		}
		wp_enqueue_style( self::HANDLE );
		wp_enqueue_script( self::HANDLE );
	}

	/**
	 * Block editor script.
	 *
	 * @return void
	 */
	public static function editor() {
		wp_enqueue_script(
			'bytelab-ps-editor',
			BYTELAB_PS_URL . 'assets/js/editor.js',
			array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n', 'wp-server-side-render' ),
			BYTELAB_PS_VERSION,
			true
		);
		wp_enqueue_style(
			'bytelab-ps-editor',
			BYTELAB_PS_URL . 'assets/css/editor.css',
			array(),
			BYTELAB_PS_VERSION
		);
	}

	/**
	 * Block styles in the editor canvas (so the preview matches the front end).
	 *
	 * @return void
	 */
	public static function block_assets() {
		if ( ! wp_style_is( self::HANDLE, 'registered' ) ) {
			self::register();
		}
		wp_enqueue_style( self::HANDLE );
	}
}
