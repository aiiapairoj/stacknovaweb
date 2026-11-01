"""Compile the original design markup into the served view and local CSS."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parent.parent
source = (root / 'index.html').read_text(encoding='utf-8')
styles = re.search(r'<style>(.*?)</style>', source, re.S).group(1)
(root / 'assets').mkdir(exist_ok=True)
(root / 'views').mkdir(exist_ok=True)
(root / 'assets' / 'theme.css').write_text(styles, encoding='utf-8')
view = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="assets/utilities.css">\n<link rel="stylesheet" href="assets/theme.css">', source, flags=re.S)
view = view.replace('<script src="https://cdn.tailwindcss.com"></script>', '')
view = view.replace('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css', 'assets/icons.css')
scripts = '\n'.join(f'<script src="assets/{name}.js" defer></script>' for name in ['translations', 'i18n', 'app'])
view = re.sub(r'<script>.*?</script>', scripts, view, flags=re.S)
translations = json.loads((root / 'locales' / 'th.json').read_text(encoding='utf-8'))
if not isinstance(translations, dict) or not all(isinstance(key, str) and isinstance(value, str) for key, value in translations.items()):
    raise ValueError('Translations must map strings to strings.')
for key, value in translations.items():
    if set(re.findall(r'\{[a-zA-Z]+\}', key)) != set(re.findall(r'\{[a-zA-Z]+\}', value)):
        raise ValueError(f'Translation placeholders do not match: {key}')
(root / 'assets' / 'translations.js').write_text(
    "'use strict';\nwindow.StackNovaTranslations = Object.freeze(" + json.dumps(translations, ensure_ascii=False) + ');\n',
    encoding='utf-8'
)
(root / 'views' / 'home.html').write_text(view, encoding='utf-8')
print('Built views/home.html and assets/theme.css; application JS is maintained separately.')
