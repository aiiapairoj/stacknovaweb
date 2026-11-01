"""Compile the original design markup into the served view and local CSS."""
from pathlib import Path
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
view = re.sub(r'<script>.*?</script>', '<script src="assets/app.js" defer></script>', view, flags=re.S)
(root / 'views' / 'home.html').write_text(view, encoding='utf-8')
print('Built views/home.html and assets/theme.css; application JS is maintained separately.')
