<?php
/**
 * Score storage and REST endpoints.
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'ABSPATH' ) || exit;

/**
 * Scores.
 */
final class BYTELAB_PS_Scores {

	const DB_VERSION = '1.0.0';
	const TABLE      = 'bytelab_ps_scores';
	const REST_NS    = 'bytelab-pixel-siege/v1';

	/**
	 * Hook up.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	/**
	 * Full table name.
	 *
	 * @return string
	 */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * Create or update the table.
	 *
	 * @return void
	 */
	public static function install_table() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table   = self::table();
		$charset = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			level smallint(5) unsigned NOT NULL DEFAULT 1,
			score int(10) unsigned NOT NULL DEFAULT 0,
			stars tinyint(3) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY level_score (level, score),
			KEY user_id (user_id)
		) {$charset};";

		dbDelta( $sql );
		update_option( 'bytelab_ps_db_version', self::DB_VERSION, false );
	}

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function routes() {
		register_rest_route(
			self::REST_NS,
			'/score',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_score' ),
				'permission_callback' => array( __CLASS__, 'can_submit' ),
				'args'                => array(
					'level' => array(
						'type'     => 'integer',
						'required' => true,
						'minimum'  => 1,
						'maximum'  => 12,
					),
					'score' => array(
						'type'     => 'integer',
						'required' => true,
						'minimum'  => 0,
						'maximum'  => 1000000,
					),
					'stars' => array(
						'type'     => 'integer',
						'required' => false,
						'minimum'  => 0,
						'maximum'  => 3,
						'default'  => 0,
					),
				),
			)
		);

		register_rest_route(
			self::REST_NS,
			'/leaderboard',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_leaderboard' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'level' => array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 12,
						'default' => 1,
					),
					'limit' => array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 50,
						'default' => 10,
					),
				),
			)
		);
	}

	/**
	 * Whether the current visitor may post a score.
	 *
	 * @return bool
	 */
	public static function can_submit() {
		if ( ! BYTELAB_PS_Settings::get( 'leaderboard', true ) ) {
			return false;
		}
		if ( is_user_logged_in() ) {
			return true;
		}
		return (bool) BYTELAB_PS_Settings::get( 'allow_guests', true );
	}

	/**
	 * POST /score
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function handle_score( $request ) {
		global $wpdb;

		$level = (int) $request->get_param( 'level' );
		$score = (int) $request->get_param( 'score' );
		$stars = (int) $request->get_param( 'stars' );

		$level = max( 1, min( 12, $level ) );
		$score = max( 0, min( 1000000, $score ) );
		$stars = max( 0, min( 3, $stars ) );

		$throttle_key = 'bytelab_ps_rl_' . md5( (string) get_current_user_id() . '|' . self::ip_hash() );
		$hits         = (int) get_transient( $throttle_key );
		if ( $hits > 60 ) {
			return new WP_Error(
				'bytelab_ps_rate_limited',
				__( 'Too many scores submitted. Please try again later.', 'bytelab-pixel-siege' ),
				array( 'status' => 429 )
			);
		}
		set_transient( $throttle_key, $hits + 1, HOUR_IN_SECONDS );

		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->insert(
			$table,
			array(
				'user_id'    => get_current_user_id(),
				'level'      => $level,
				'score'      => $score,
				'stars'      => $stars,
				'created_at' => current_time( 'mysql' ),
			),
			array( '%d', '%d', '%d', '%d', '%s' )
		);

		$id = (int) $wpdb->insert_id;

		return new WP_REST_Response(
			array(
				'ok'    => $id > 0,
				'id'    => $id,
				'level' => $level,
				'score' => $score,
				'stars' => $stars,
			),
			201
		);
	}

	/**
	 * GET /leaderboard
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function handle_leaderboard( $request ) {
		global $wpdb;

		$level = max( 1, min( 12, (int) $request->get_param( 'level' ) ) );
		$limit = max( 1, min( 50, (int) $request->get_param( 'limit' ) ) );
		$table = self::table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT user_id, MAX(score) AS score, MAX(stars) AS stars FROM {$table} WHERE level = %d GROUP BY user_id ORDER BY score DESC LIMIT %d",
				$level,
				$limit
			)
		);

		$out = array();
		foreach ( $rows as $row ) {
			$user_id = (int) $row->user_id;
			$name    = $user_id ? get_the_author_meta( 'display_name', $user_id ) : __( 'Guest', 'bytelab-pixel-siege' );
			$out[]   = array(
				'name'  => $name ? $name : __( 'Guest', 'bytelab-pixel-siege' ),
				'score' => (int) $row->score,
				'stars' => (int) $row->stars,
			);
		}

		return new WP_REST_Response(
			array(
				'level'   => $level,
				'entries' => $out,
			),
			200
		);
	}

	/**
	 * Hash the visitor IP without storing it.
	 *
	 * @return string
	 */
	private static function ip_hash() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		return wp_hash( $ip );
	}
}
