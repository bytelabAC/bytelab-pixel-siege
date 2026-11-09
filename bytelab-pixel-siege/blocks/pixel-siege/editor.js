/* global wp */
/**
 * BYTELAB Pixel Siege — block editor registration (no build step).
 */
( function ( blocks, element, blockEditor, components, i18n, serverSideRender ) {
	'use strict';

	var el = element.createElement;
	var __ = i18n.__;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var RangeControl = components.RangeControl;
	var ToggleControl = components.ToggleControl;

	var ServerSideRender = serverSideRender && ( serverSideRender.default || serverSideRender );

	function Edit( props ) {
		var attributes = props.attributes;
		var blockProps = useBlockProps ? useBlockProps( { className: 'blps-editor' } ) : { className: 'blps-editor' };

		return el(
			'div',
			blockProps,
			el(
				InspectorControls,
				{},
				el(
					PanelBody,
					{
						title: __( 'Game', 'bytelab-pixel-siege' ),
						initialOpen: true
					},
					el( RangeControl, {
						label: __( 'Starting level', 'bytelab-pixel-siege' ),
						value: attributes.level,
						min: 1,
						max: 12,
						step: 1,
						onChange: function ( value ) {
							props.setAttributes( { level: value } );
						}
					} ),
					el( RangeControl, {
						label: __( 'Maximum height (px)', 'bytelab-pixel-siege' ),
						value: attributes.height,
						min: 320,
						max: 900,
						step: 20,
						onChange: function ( value ) {
							props.setAttributes( { height: value } );
						}
					} ),
					el( ToggleControl, {
						label: __( 'Start with sound on', 'bytelab-pixel-siege' ),
						checked: !! attributes.sound,
						onChange: function ( value ) {
							props.setAttributes( { sound: !! value } );
						}
					} )
				)
			),
			ServerSideRender
				? el( ServerSideRender, {
						block: 'bytelab/pixel-siege',
						attributes: attributes
				  } )
				: el( 'div', { className: 'blps-editor__placeholder' }, __( 'Pixel Siege', 'bytelab-pixel-siege' ) )
		);
	}

	blocks.registerBlockType( 'bytelab/pixel-siege', {
		edit: Edit,
		save: function () {
			return null;
		}
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.i18n,
	window.wp.serverSideRender
);
