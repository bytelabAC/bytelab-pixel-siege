p = r"C:\Users\pc\Downloads\bytelab-pixel-siege\bytelab-pixel-siege\includes\class-bytelab-ps-settings.php"
src = open(p, encoding='utf-8').read()

# 1) defaults
old = "\t\t\t'custom_strings'  => '',\n\t\t);"
new = "\t\t\t'custom_strings'  => '',\n\t\t\t'custom_levels'   => '',\n\t\t);"
assert old in src, 'defaults'
src = src.replace(old, new, 1)

# 2) field list
old = "\t\t\t'custom_strings' => __( 'Custom copy overrides', 'bytelab-pixel-siege' ),\n\t\t);"
new = "\t\t\t'custom_strings' => __( 'Custom copy overrides', 'bytelab-pixel-siege' ),\n\t\t\t'custom_levels'  => __( 'Custom levels (JSON)', 'bytelab-pixel-siege' ),\n\t\t);"
assert old in src, 'fields'
src = src.replace(old, new, 1)

# 3) textarea control
old = "\t\t\tcase 'custom_strings':"
new = """\t\t\tcase 'custom_levels':
\t\t\t\tprintf(
\t\t\t\t\t'<textarea rows="12" cols="60" class="large-text code" spellcheck="false" name="%1$s" id="bytelab-ps-%2$s">%3$s</textarea><p class="description">%4$s</p>',
\t\t\t\t\tesc_attr( $name ),
\t\t\t\t\tesc_attr( $key ),
\t\t\t\t\tesc_textarea( (string) $value ),
\t\t\t\t\tesc_html__( 'A JSON array of levels. Blocks may be placed by centre (y) or by the surface they stand on (baseY); bugs accept y or surfaceY. Leave empty to use the twenty built-in levels only.', 'bytelab-pixel-siege' )
\t\t\t\t);
\t\t\t\tbreak;
\t\t\tcase 'custom_strings':"""
assert old in src, 'switch'
src = src.replace(old, new, 1)

# 4) sanitize
old = "\t\t$clean['custom_strings'] = sanitize_textarea_field( $strings );\n\n\t\treturn $clean;"
new = """\t\t$clean['custom_strings'] = sanitize_textarea_field( $strings );

\t\t$raw_levels              = isset( $input['custom_levels'] ) ? (string) $input['custom_levels'] : '';
\t\t$clean['custom_levels']  = BYTELAB_PS_Levels::validate_json( $raw_levels );

\t\treturn $clean;"""
assert old in src, 'sanitize'
src = src.replace(old, new, 1)

open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('settings patched')
