<?php
/**
 * Removes everything the plugin stored, but only when WordPress asks for it.
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

// phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}bytelab_ps_scores" );

delete_option( 'bytelab_ps_options' );
delete_option( 'bytelab_ps_version' );
delete_option( 'bytelab_ps_db_version' );

if ( is_multisite() ) {
	$sites = get_sites( array( 'fields' => 'ids', 'number' => 0 ) );
	foreach ( $sites as $site_id ) {
		switch_to_blog( $site_id );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}bytelab_ps_scores" );
		delete_option( 'bytelab_ps_options' );
		delete_option( 'bytelab_ps_version' );
		delete_option( 'bytelab_ps_db_version' );
		restore_current_blog();
	}
}
