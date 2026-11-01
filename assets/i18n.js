'use strict';

(() => {
    const supported = new Set(['en', 'th']);
    const dictionary = new Map(Object.entries(window.StackNovaTranslations || {}));
    const bindings = new Map();
    const storageKey = 'stacknova.language';
    let language = 'en';
    try {
        const saved = localStorage.getItem(storageKey);
        if (supported.has(saved)) {
            language = saved;
        }
    } catch {
        // A blocked storage API must not prevent switching languages.
    }

    function t(source, values = {}) {
        const template = language === 'th' ? (dictionary.get(source) ?? source) : source;
        return template.replace(/\{([a-zA-Z]+)\}/g, (match, key) => {
            if (!Object.hasOwn(values, key)) {
                return match;
            }
            const value = typeof values[key] === 'function' ? values[key]() : values[key];
            return String(value);
        });
    }

    function render(binding) {
        const value = t(binding.source, binding.values);
        if (binding.attribute) {
            binding.node.setAttribute(binding.attribute, value);
        } else if (binding.node.nodeType === Node.TEXT_NODE) {
            binding.node.nodeValue = binding.prefix + value + binding.suffix;
        } else {
            binding.node.textContent = value;
        }
    }

    function bind(node, source, values = {}, attribute = null) {
        if (!node) {
            return;
        }
        let nodeBindings = bindings.get(node);
        if (!nodeBindings) {
            nodeBindings = new Map();
            bindings.set(node, nodeBindings);
        }
        const binding = { node, source, values, attribute, prefix: '', suffix: '' };
        nodeBindings.set(attribute || 'text', binding);
        render(binding);
    }

    function text(node, source, values = {}) {
        bind(node, source, values);
    }

    function attribute(node, name, source) {
        if (!['aria-label', 'title', 'alt', 'placeholder'].includes(name)) {
            throw new Error('Unsupported translation attribute.');
        }
        bind(node, source, {}, name);
    }

    function clear(node) {
        for (const bound of bindings.keys()) {
            if (bound === node || node.contains(bound)) {
                bindings.delete(bound);
            }
        }
        node.replaceChildren();
    }

    function setLanguage(next) {
        if (!supported.has(next)) {
            return false;
        }
        language = next;
        document.documentElement.lang = next;
        for (const [node, nodeBindings] of bindings) {
            if (!node.isConnected) {
                bindings.delete(node);
                continue;
            }
            for (const binding of nodeBindings.values()) {
                render(binding);
            }
        }
        document.querySelectorAll('[data-language]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.language === next));
        });
        try {
            localStorage.setItem(storageKey, next);
        } catch {
            // Preference remains in memory when persistent storage is unavailable.
        }
        return true;
    }

    // Capture only original markup, before the app inserts account data or user messages.
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node.parentElement.closest('script, style, noscript, [data-language-ignore]')) {
                return NodeFilter.FILTER_REJECT;
            }
            return dictionary.has(node.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const original = node.nodeValue;
        const binding = {
            node,
            source: original.trim(),
            values: {},
            attribute: null,
            prefix: original.match(/^\s*/)[0],
            suffix: original.match(/\s*$/)[0]
        };
        bindings.set(node, new Map([['text', binding]]));
    }
    document.querySelectorAll('[aria-label], [alt], [placeholder], [title]').forEach((node) => {
        for (const name of ['aria-label', 'alt', 'placeholder', 'title']) {
            const source = node.getAttribute(name);
            if (source && dictionary.has(source)) {
                const nodeBindings = bindings.get(node) || new Map();
                nodeBindings.set(name, { node, source, values: {}, attribute: name });
                bindings.set(node, nodeBindings);
            }
        }
    });
    document.querySelectorAll('meta[name="description"], meta[name="keywords"]').forEach((node) => {
        bindings.set(node, new Map([['content', {
            node,
            source: node.content,
            values: {},
            attribute: 'content'
        }]]));
    });
    document.querySelectorAll('[data-language]').forEach((button) => {
        button.addEventListener('click', () => setLanguage(button.dataset.language));
    });
    window.StackNovaI18n = Object.freeze({
        t,
        text,
        attribute,
        clear,
        setLanguage,
        get language() {
            return language;
        },
        get locale() {
            return language === 'th' ? 'th-TH' : 'en-GB';
        }
    });
    setLanguage(language);
})();
