import os, re, sys, glob, collections

root = sys.argv[1]
out = sys.argv[2]

pairs = collections.OrderedDict()

# functions: name -> msgid arg index handled by regex on quoted string
patterns = [
    r"__\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'bytelab-pixel-siege'\s*\)",
    r"_e\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'bytelab-pixel-siege'\s*\)",
    r"esc_html__\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'bytelab-pixel-siege'\s*\)",
    r"esc_html_e\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'bytelab-pixel-siege'\s*\)",
    r"esc_attr__\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'bytelab-pixel-siege'\s*\)",
]

for path in glob.glob(os.path.join(root, '**', '*.php'), recursive=True):
    src = open(path, encoding='utf-8').read()
    for pat in patterns:
        for m in re.finditer(pat, src):
            msg = m.group(1)
            if msg not in pairs:
                pairs[msg] = os.path.relpath(path, root).replace('\\', '/')

def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')

lines = [
    '# Copyright (C) BYTELAB',
    '# This file is distributed under the GPL-2.0-or-later license.',
    'msgid ""',
    'msgstr ""',
    '"Project-Id-Version: BYTELAB Pixel Siege 1.0.0\\n"',
    '"Report-Msgid-Bugs-To: https://bytelab.example\\n"',
    '"MIME-Version: 1.0\\n"',
    '"Content-Type: text/plain; charset=UTF-8\\n"',
    '"Content-Transfer-Encoding: 8bit\\n"',
    '"PO-Revision-Date: 2026-11-09 00:00+0330\\n"',
    '"Last-Translator: BYTELAB\\n"',
    '"Language-Team: BYTELAB\\n"',
    '"Language: fa_IR\\n"',
    '"Plural-Forms: nplurals=2; plural=(n > 1);\\n"',
    '"X-Domain: bytelab-pixel-siege\\n"',
    '',
]
for msg, ref in pairs.items():
    lines.append('#: %s' % ref)
    lines.append('msgid "%s"' % esc(msg))
    lines.append('msgstr ""')
    lines.append('')

os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
print('strings:', len(pairs))
