<?php
/**
 * Plugin Name:       BYTELAB · Pixel Siege
 * Plugin URI:        https://bytelab.example/pixel-siege
 * Description:       A pull-and-fling physics game for WordPress, drawn entirely with the BYTELAB Pixel Flask identity: Byte Navy, Lab Cyan and one Spark Amber accent.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            BYTELAB
 * Author URI:        https://bytelab.example
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       bytelab-pixel-siege
 * Domain Path:       /languages
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'ABSPATH' ) || exit;

define( 'BYTELAB_PS_VERSION', '1.0.0' );
define( 'BYTELAB_PS_FILE', __FILE__ );
define( 'BYTELAB_PS_DIR', plugin_dir_path( __FILE__ ) );
define( 'BYTELAB_PS_URL', plugin_dir_url( __FILE__ ) );
define( 'BYTELAB_PS_BASENAME', plugin_basename( __FILE__ ) );

require_once BYTELAB_PS_DIR . 'includes/class-bytelab-ps-levels.php';
require_once BYTELAB_PS_DIR . 'includes/class-bytelab-ps-settings.php';
require_once BYTELAB_PS_DIR . 'includes/class-bytelab-ps-assets.php';
require_once BYTELAB_PS_DIR . 'includes/class-bytelab-ps-scores.php';
require_once BYTELAB_PS_DIR . 'includes/class-bytelab-ps-game.php';
require_once BYTELAB_PS_DIR . 'includes/class-bytelab-ps-plugin.php';

/**
 * Boot the plugin.
 *
 * @return BYTELAB_PS_Plugin
 */
function bytelab_ps() {
	return BYTELAB_PS_Plugin::instance();
}

add_action( 'plugins_loaded', 'bytelab_ps', 5 );

register_activation_hook( __FILE__, array( 'BYTELAB_PS_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'BYTELAB_PS_Plugin', 'deactivate' ) );

