<?php
/**
 * Settings and the admin screen.
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'ABSPATH' ) || exit;

/**
 * Settings API wrapper.
 */
final class BYTELAB_PS_Settings {

	const OPTION = 'bytelab_ps_options';

	/**
	 * Defaults.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'default_level'   => 1,
			'max_height'      => 640,
			'sound'           => 1,
			'allow_guests'    => 1,
			'leaderboard'     => 1,
			'show_brand'      => 1,
			'custom_strings'  => '',
		);
	}

	/**
	 * Install defaults on activation.
	 *
	 * @return void
	 */
	public static function install_defaults() {
		$existing = get_option( self::OPTION );
		if ( ! is_array( $existing ) ) {
			add_option( self::OPTION, self::defaults() );
		}
	}

	/**
	 * Hook up.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'admin_assets' ) );
	}

	/**
	 * Read all settings merged with defaults.
	 *
	 * @return array
	 */
	public static function all() {
		$stored = get_option( self::OPTION, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		return array_merge( self::defaults(), $stored );
	}

	/**
	 * Read one setting.
	 *
	 * @param string $key     Setting key.
	 * @param mixed  $default Fallback.
	 * @return mixed
	 */
	public static function get( $key, $default = null ) {
		$all = self::all();
		if ( array_key_exists( $key, $all ) ) {
			return $all[ $key ];
		}
		return $default;
	}

	/**
	 * Register the option and its fields.
	 *
	 * @return void
	 */
	public static function register() {
		register_setting(
			'bytelab_ps',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => self::defaults(),
				'show_in_rest'      => false,
			)
		);

		add_settings_section(
			'bytelab_ps_main',
			__( 'Game defaults', 'bytelab-pixel-siege' ),
			array( __CLASS__, 'section_intro' ),
			'bytelab_ps'
		);

		$fields = array(
			'default_level'  => __( 'First level', 'bytelab-pixel-siege' ),
			'max_height'     => __( 'Maximum game height (px)', 'bytelab-pixel-siege' ),
			'sound'          => __( 'Start with sound on', 'bytelab-pixel-siege' ),
			'allow_guests'   => __( 'Save scores for visitors who are not logged in', 'bytelab-pixel-siege' ),
			'leaderboard'    => __( 'Expose the leaderboard endpoint', 'bytelab-pixel-siege' ),
			'show_brand'     => __( 'Show the BYTELAB trademark line', 'bytelab-pixel-siege' ),
			'custom_strings' => __( 'Custom copy overrides', 'bytelab-pixel-siege' ),
		);

		foreach ( $fields as $key => $label ) {
			add_settings_field(
				$key,
				$label,
				array( __CLASS__, 'field' ),
				'bytelab_ps',
				'bytelab_ps_main',
				array( 'key' => $key )
			);
		}
	}

	/**
	 * Section description.
	 *
	 * @return void
	 */
	public static function section_intro() {
		echo '<p>' . esc_html__( 'These values are used whenever a shortcode or block does not set its own.', 'bytelab-pixel-siege' ) . '</p>';
	}

	/**
	 * Render one field.
	 *
	 * @param array $args Field args.
	 * @return void
	 */
	public static function field( $args ) {
		$key   = isset( $args['key'] ) ? $args['key'] : '';
		$all   = self::all();
		$value = isset( $all[ $key ] ) ? $all[ $key ] : '';
		$name  = self::OPTION . '[' . $key . ']';

		switch ( $key ) {
			case 'default_level':
				printf(
					'<input type="number" min="1" max="12" step="1" class="small-text" name="%1$s" id="bytelab-ps-%2$s" value="%3$s" /> <p class="description">%4$s</p>',
					esc_attr( $name ),
					esc_attr( $key ),
					esc_attr( (string) $value ),
					esc_html__( 'Between 1 and 12.', 'bytelab-pixel-siege' )
				);
				break;
			case 'max_height':
				printf(
					'<input type="number" min="240" max="1200" step="10" class="small-text" name="%1$s" id="bytelab-ps-%2$s" value="%3$s" /> <p class="description">%4$s</p>',
					esc_attr( $name ),
					esc_attr( $key ),
					esc_attr( (string) $value ),
					esc_html__( 'The game keeps a 16:9 ratio and is capped to this height.', 'bytelab-pixel-siege' )
				);
				break;
			case 'custom_strings':
				printf(
					'<textarea rows="6" cols="60" class="large-text code" name="%1$s" id="bytelab-ps-%2$s">%3$s</textarea><p class="description">%4$s</p>',
					esc_attr( $name ),
					esc_attr( $key ),
					esc_textarea( (string) $value ),
					esc_html__( 'One key=value pair per line, for example: title=Pixel Siege', 'bytelab-pixel-siege' )
				);
				break;
			default:
				printf(
					'<label><input type="checkbox" name="%1$s" id="bytelab-ps-%2$s" value="1" %3$s /> %4$s</label>',
					esc_attr( $name ),
					esc_attr( $key ),
					checked( ! empty( $value ), true, false ),
					esc_html__( 'Enabled', 'bytelab-pixel-siege' )
				);
				break;
		}
	}

	/**
	 * Sanitize the option.
	 *
	 * @param mixed $input Raw input.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$defaults = self::defaults();
		$input    = is_array( $input ) ? $input : array();
		$clean    = array();

		$clean['default_level'] = isset( $input['default_level'] ) ? max( 1, min( 12, absint( $input['default_level'] ) ) ) : $defaults['default_level'];
		$clean['max_height']    = isset( $input['max_height'] ) ? max( 240, min( 1200, absint( $input['max_height'] ) ) ) : $defaults['max_height'];
		$clean['sound']         = empty( $input['sound'] ) ? 0 : 1;
		$clean['allow_guests']  = empty( $input['allow_guests'] ) ? 0 : 1;
		$clean['leaderboard']   = empty( $input['leaderboard'] ) ? 0 : 1;
		$clean['show_brand']    = empty( $input['show_brand'] ) ? 0 : 1;

		$strings = isset( $input['custom_strings'] ) ? (string) $input['custom_strings'] : '';
		$clean['custom_strings'] = sanitize_textarea_field( $strings );

		return $clean;
	}

	/**
	 * Custom key=value string overrides.
	 *
	 * @return array
	 */
	public static function custom_strings() {
		$raw = (string) self::get( 'custom_strings', '' );
		$out = array();
		if ( '' === trim( $raw ) ) {
			return $out;
		}
		$lines = preg_split( '/\r\n|\r|\n/', $raw );
		foreach ( $lines as $line ) {
			if ( false === strpos( $line, '=' ) ) {
				continue;
			}
			list( $key, $value ) = explode( '=', $line, 2 );
			$key = sanitize_key( trim( $key ) );
			if ( '' !== $key ) {
				$out[ $key ] = sanitize_text_field( trim( $value ) );
			}
		}
		return $out;
	}

	/**
	 * Admin menu.
	 *
	 * @return void
	 */
	public static function add_menu() {
		add_options_page(
			__( 'BYTELAB Pixel Siege', 'bytelab-pixel-siege' ),
			__( 'BYTELAB Pixel Siege', 'bytelab-pixel-siege' ),
			'manage_options',
			'bytelab-pixel-siege',
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Admin styles for the settings screen.
	 *
	 * @param string $hook Current screen hook.
	 * @return void
	 */
	public static function admin_assets( $hook ) {
		if ( 'settings_page_bytelab-pixel-siege' !== $hook ) {
			return;
		}
		wp_enqueue_style(
			'bytelab-ps-admin',
			BYTELAB_PS_URL . 'assets/css/admin.css',
			array(),
			BYTELAB_PS_VERSION
		);
	}

	/**
	 * Settings screen.
	 *
	 * @return void
	 */
	public static function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$level_count = 12;
		?>
		<div class="wrap bytelab-ps-admin">
			<h1><?php echo esc_html__( 'BYTELAB Pixel Siege', 'bytelab-pixel-siege' ); ?></h1>
			<p class="bytelab-ps-admin__lede">
				<?php echo esc_html__( 'Drop the game anywhere with the shortcode or the Gutenberg block.', 'bytelab-pixel-siege' ); ?>
			</p>

			<div class="bytelab-ps-admin__card">
				<h2><?php echo esc_html__( 'Shortcode', 'bytelab-pixel-siege' ); ?></h2>
				<code>[bytelab_pixel_siege level="1" height="640"]</code>
				<p class="description">
					<?php
					printf(
						/* translators: %s: number of levels */
						esc_html__( 'Optional attributes: level (1–%s), height, sound, title.', 'bytelab-pixel-siege' ),
						esc_html( (string) $level_count )
					);
					?>
				</p>
			</div>

			<div class="bytelab-ps-admin__card">
				<h2><?php echo esc_html__( 'Block', 'bytelab-pixel-siege' ); ?></h2>
				<p>
					<?php echo esc_html__( 'Search for “Pixel Siege” in the block inserter, or type /pixel-siege in the editor.', 'bytelab-pixel-siege' ); ?>
				</p>
			</div>

			<form action="options.php" method="post">
				<?php
				settings_fields( 'bytelab_ps' );
				do_settings_sections( 'bytelab_ps' );
				submit_button( __( 'Save settings', 'bytelab-pixel-siege' ) );
				?>
			</form>
		</div>
		<?php
	}
}

