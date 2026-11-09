<?php
/**
 * Shortcode, block and front-end markup.
 *
 * @package BYTELAB_Pixel_Siege
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders the game container.
 */
final class BYTELAB_PS_Game {

	const SHORTCODE = 'bytelab_pixel_siege';
	const BLOCK     = 'bytelab/pixel-siege';
	const LEVELS    = 12;

	/**
	 * Hook up.
	 *
	 * @return void
	 */
	public static function init() {
		add_shortcode( self::SHORTCODE, array( __CLASS__, 'shortcode' ) );
		add_action( 'init', array( __CLASS__, 'register_block' ) );
	}

	/**
	 * Register the Gutenberg block.
	 *
	 * @return void
	 */
	public static function register_block() {
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}
		$path = BYTELAB_PS_DIR . 'blocks/pixel-siege';
		if ( ! file_exists( $path . '/block.json' ) ) {
			return;
		}
		register_block_type_from_metadata(
			$path,
			array(
				'render_callback' => array( __CLASS__, 'render_block' ),
			)
		);
	}

	/**
	 * Shortcode handler.
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string
	 */
	public static function shortcode( $atts ) {
		$defaults = BYTELAB_PS_Settings::defaults();
		$atts     = shortcode_atts(
			array(
				'level'  => (string) BYTELAB_PS_Settings::get( 'default_level', $defaults['default_level'] ),
				'height' => (string) BYTELAB_PS_Settings::get( 'max_height', $defaults['max_height'] ),
				'sound'  => '1',
				'title'  => '',
			),
			$atts,
			self::SHORTCODE
		);

		return self::render(
			array(
				'level'  => (int) $atts['level'],
				'height' => (int) $atts['height'],
				'sound'  => ( '0' !== (string) $atts['sound'] && 'false' !== (string) $atts['sound'] ),
				'title'  => (string) $atts['title'],
			)
		);
	}

	/**
	 * Block render callback.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public static function render_block( $attributes ) {
		$attributes = is_array( $attributes ) ? $attributes : array();
		return self::render(
			array(
				'level'  => isset( $attributes['level'] ) ? (int) $attributes['level'] : 1,
				'height' => isset( $attributes['height'] ) ? (int) $attributes['height'] : 640,
				'sound'  => ! isset( $attributes['sound'] ) || (bool) $attributes['sound'],
				'title'  => isset( $attributes['title'] ) ? (string) $attributes['title'] : '',
			)
		);
	}

	/**
	 * Build the markup and config.
	 *
	 * @param array $args Game arguments.
	 * @return string
	 */
	public static function render( $args ) {
		$defaults = BYTELAB_PS_Settings::defaults();

		$level  = isset( $args['level'] ) ? (int) $args['level'] : 1;
		$level  = max( 1, min( self::LEVELS, $level ) );
		$height = isset( $args['height'] ) ? (int) $args['height'] : (int) BYTELAB_PS_Settings::get( 'max_height', $defaults['max_height'] );
		$height = max( 240, min( 1200, $height ) );

		$sound_default = (bool) BYTELAB_PS_Settings::get( 'sound', true );
		$sound         = array_key_exists( 'sound', $args ) ? (bool) $args['sound'] : $sound_default;

		$can_save = is_user_logged_in() || (bool) BYTELAB_PS_Settings::get( 'allow_guests', true );

		$config = array(
			'level'     => $level,
			'lang'      => self::lang(),
			'dir'       => is_rtl() ? 'rtl' : 'ltr',
			'sound'     => $sound,
			'restUrl'   => esc_url_raw( rest_url( 'bytelab-pixel-siege/v1/score' ) ),
			'nonce'     => wp_create_nonce( 'wp_rest' ),
			'canSave'   => (bool) ( $can_save && BYTELAB_PS_Settings::get( 'leaderboard', true ) ),
			'showBrand' => (bool) BYTELAB_PS_Settings::get( 'show_brand', true ),
			'userName'  => self::current_user_name(),
			'customLevels'    => BYTELAB_PS_Levels::get(),
			'leaderboardUrl'  => esc_url_raw( rest_url( 'bytelab-pixel-siege/v1/leaderboard' ) ),
			'canBoard'        => (bool) BYTELAB_PS_Settings::get( 'leaderboard', true ),
			'strings'   => self::strings(),
		);

		$config = apply_filters( 'bytelab_ps_game_config', $config, $args );

		// The block editor preview asks for this markup over REST; scripts there
		// would never boot, so only the front end loads the game itself.
		if ( ! ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			BYTELAB_PS_Assets::enqueue();
		}

		$id = 'blps-' . wp_unique_id();

		ob_start();
		?>
		<div class="blps"
			id="<?php echo esc_attr( $id ); ?>"
			style="--blps-max-h:<?php echo esc_attr( $height . 'px' ); ?>"
			data-bytelab-game="<?php echo esc_attr( (string) wp_json_encode( $config ) ); ?>">
			<noscript>
				<p class="blps__noscript">
					<?php echo esc_html__( 'BYTELAB Pixel Siege needs JavaScript to run. Please enable it to play.', 'bytelab-pixel-siege' ); ?>
				</p>
			</noscript>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * Current UI language.
	 *
	 * @return string
	 */
	public static function lang() {
		$locale = function_exists( 'determine_locale' ) ? determine_locale() : get_locale();
		return 0 === strpos( $locale, 'fa' ) ? 'fa' : 'en';
	}

	/**
	 * Display name of the visitor, used to highlight their leaderboard row.
	 *
	 * @return string
	 */
	public static function current_user_name() {
		$user = wp_get_current_user();
		return $user && $user->exists() ? (string) $user->display_name : '';
	}

	/**
	 * Every string the UI needs.
	 *
	 * The game ships with built-in English and Persian copy. A translation that
	 * exists for the current locale wins; untranslated entries are omitted so a
	 * Persian site is never handed English copy over its built-in strings.
	 *
	 * @return array
	 */
	public static function strings() {
		$map = array(
			'title'       => 'PIXEL SIEGE',
			'tagline'     => 'A BYTELAB physics experiment',
			'score'       => 'SCORE',
			'level'       => 'LEVEL',
			'birds'       => 'SHOTS',
			'play'        => 'PLAY',
			'resume'      => 'RESUME',
			'restart'     => 'RESTART',
			'levels'      => 'LEVELS',
			'next'        => 'NEXT LEVEL',
			'retry'       => 'TRY AGAIN',
			'best'        => 'BEST',
			'won'         => 'LAB CLEARED',
			'lost'        => 'OUT OF BYTES',
			'paused'      => 'PAUSED',
			'help'        => 'HOW TO PLAY',
			'close'       => 'CLOSE',
			'soundOn'     => 'Sound on',
			'soundOff'    => 'Sound off',
			'pause'       => 'Pause',
			'helpTitle'   => 'HOW TO PLAY',
			'helpAim'     => 'Drag the bird back and let go to launch. A longer pull flies further.',
			'helpAbility' => 'Tap while flying: BOLT dashes forward, SPARK explodes on contact.',
			'helpGoal'    => 'Break every bug. Anything between you and them is fair game.',
			'helpKeys'    => 'Keyboard: arrow keys aim, space fires, P pauses, R restarts.',
			'targets'     => 'BUGS LEFT',
			'stars'       => 'STARS',
			'levelOf'     => 'of',
			'saved'       => 'Score saved',
			'tapToStart'  => 'Tap or press space to start',
			'perfect'     => 'PERFECT',
			'newBest'     => 'NEW BEST',
			'leaderboard' => 'LEADERBOARD',
			'rank'        => 'RANK',
			'player'      => 'PLAYER',
			'loading'     => 'Loading scores…',
			'emptyBoard'  => 'No scores here yet — be the first.',
			'boardError'  => 'Scores are unavailable right now.',
			'you'         => 'YOU',
			'boardOff'    => 'The leaderboard is turned off.',
			'customLevels'=> 'CUSTOM LEVELS',
		);

		$strings = array();
		foreach ( $map as $key => $msgid ) {
			$translated = __( $msgid, 'bytelab-pixel-siege' ); // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
			if ( $translated !== $msgid ) {
				$strings[ $key ] = $translated;
			}
		}

		$overrides = BYTELAB_PS_Settings::custom_strings();
		if ( ! empty( $overrides ) ) {
			$strings = array_merge( $strings, $overrides );
		}

		return $strings;
	}
}



