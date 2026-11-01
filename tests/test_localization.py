"""Validate the maintained translation catalog against the original markup."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parent.parent


class SourceStrings(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = []
        self.strings = set()

    def handle_starttag(self, tag, attrs):
        if tag in ('style', 'script'):
            self.ignored.append(tag)
        for name, value in attrs:
            if value and name in ('aria-label', 'alt', 'placeholder', 'title'):
                self.strings.add(value.strip())
        attributes = dict(attrs)
        if tag == 'meta' and attributes.get('name') in ('description', 'keywords'):
            self.strings.add(attributes['content'])

    def handle_endtag(self, tag):
        if self.ignored and self.ignored[-1] == tag:
            self.ignored.pop()

    def handle_data(self, value):
        if not self.ignored and value.strip():
            self.strings.add(value.strip())


class LocalizationTests(unittest.TestCase):
    def test_every_static_english_text_and_accessibility_label_has_thai(self):
        parser = SourceStrings()
        parser.feed((ROOT / 'index.html').read_text(encoding='utf-8').split('<script>')[0])
        catalog = json.loads((ROOT / 'locales/th.json').read_text(encoding='utf-8'))
        untranslated_names = {'stacknova', 'Forma Living', 'Slow Days Coffee', 'Shopify', 'LINE', 'EN', 'you@company.com'}
        missing = sorted(value for value in parser.strings if re.search('[A-Za-z]', value) and value not in untranslated_names and value not in catalog)
        self.assertEqual(missing, [])

    def test_placeholders_and_types_are_preserved(self):
        catalog = json.loads((ROOT / 'locales/th.json').read_text(encoding='utf-8'))
        for key, value in catalog.items():
            with self.subTest(key=key):
                self.assertIsInstance(value, str)
                self.assertTrue(value.strip())
                self.assertEqual(set(re.findall(r'\{[a-zA-Z]+\}', key)), set(re.findall(r'\{[a-zA-Z]+\}', value)))

    def test_built_page_loads_translation_before_app_without_inline_script(self):
        page = (ROOT / 'views/home.html').read_text(encoding='utf-8')
        self.assertLess(page.index('assets/translations.js'), page.index('assets/i18n.js'))
        self.assertLess(page.index('assets/i18n.js'), page.index('assets/app.js'))
        self.assertNotIn('<script>', page)
        self.assertIn('Noto+Sans+Thai', page)


if __name__ == '__main__':
    unittest.main()
