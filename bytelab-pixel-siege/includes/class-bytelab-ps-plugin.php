<?php
/**
 * Plugin wiring.
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'ABSPATH' ) || exit;

/**
 * Main plugin controller.
 */
final class BYTELAB_PS_Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var BYTELAB_PS_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Get the instance.
	 *
	 * @return BYTELAB_PS_Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		BYTELAB_PS_Settings::init();
		BYTELAB_PS_Assets::init();
		BYTELAB_PS_Game::init();
		BYTELAB_PS_Scores::init();

		add_action( 'init', array( $this, 'load_textdomain' ) );
		add_action( 'admin_init', array( $this, 'maybe_upgrade' ) );
		add_filter( 'plugin_action_links_' . BYTELAB_PS_BASENAME, array( $this, 'action_links' ) );
	}

	/**
	 * Load translations.
	 *
	 * @return void
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'bytelab-pixel-siege', false, dirname( BYTELAB_PS_BASENAME ) . '/languages' );
	}

	/**
	 * Create or upgrade the score table when the version changes.
	 *
	 * @return void
	 */
	public function maybe_upgrade() {
		$stored = get_option( 'bytelab_ps_version' );
		if ( BYTELAB_PS_VERSION !== $stored ) {
			BYTELAB_PS_Scores::install_table();
			update_option( 'bytelab_ps_version', BYTELAB_PS_VERSION, false );
		}
	}

	/**
	 * Add a settings link on the plugins screen.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public function action_links( $links ) {
		$url = admin_url( 'options-general.php?page=bytelab-pixel-siege' );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'bytelab-pixel-siege' ) . '</a>' );
		return $links;
	}

	/**
	 * Activation.
	 *
	 * @return void
	 */
	public static function activate() {
		BYTELAB_PS_Scores::install_table();
		BYTELAB_PS_Settings::install_defaults();
		update_option( 'bytelab_ps_version', BYTELAB_PS_VERSION, false );
	}

	/**
	 * Deactivation.
	 *
	 * @return void
	 */
	public static function deactivate() {
		// Scores and settings are kept; uninstall.php removes them for good.
	}
}
