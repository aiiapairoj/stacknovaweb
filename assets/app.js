'use strict';
// Verified contact values come from server configuration.
let CONTACT = { line: '', phone: '' };
let state = { csrf: '', user: null };
const apiBase = new URL('api/', new URL('.', window.location.href));
let ready;
async function api(route, data) {
    const headers = { Accept: 'application/json' };
    if (data !== undefined) {
        headers['Content-Type'] = 'application/json';
        headers['X-CSRF-Token'] = state.csrf;
    }
    let response;
    try {
        response = await fetch(new URL(route, apiBase), {
            method: data === undefined ? 'GET' : 'POST',
            credentials: 'same-origin',
            headers,
            body: data === undefined ? undefined : JSON.stringify(data)
        });
    } catch {
        throw new Error('Connection unavailable. Nothing has been confirmed saved. Please retry.');
    }
    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error('Unexpected service response. Please retry later.');
    }
    if (!response.ok) {
        if (response.status === 403) {
            applySession(await api('session'));
            throw new Error('Your session changed or expired. Review your details and try again.');
        }
        throw new Error(result.error || 'The request could not be completed.');
    }
    return result;
}
async function withForm(form, status, work) {
    const buttons = form.querySelectorAll('button');
    buttons.forEach((button) => { button.disabled = true; });
    status.hidden = false;
    status.textContent = 'Working…';
    try {
        await ready;
        await work();
    } catch (error) {
        status.textContent = error.message;
    } finally {
        buttons.forEach((button) => { button.disabled = false; });
    }
}
const $ = (selector) => document.querySelector(selector);
const dialogs = { estimate: $('#estimateDialog'), auth: $('#authDialog'), privacy: $('#privacyDialog') };
function openDialog(dialog) {
    document.querySelectorAll('dialog[open]').forEach((item) => item.close());
    dialog.showModal();
}
document.querySelectorAll('[data-modal]').forEach((button) => {
    button.addEventListener('click', () => openDialog(dialogs[button.dataset.modal]));
});
document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog').close());
});
document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
            dialog.close();
        }
    });
});
const projects = [
    ['Forma Living', 'An editorial website direction for a Bangkok interior studio. Natural materials, generous space, and a focused enquiry journey bring considered interiors into a digital setting. Proposed scope: responsive design, project collection, CMS, and enquiry form.'],
    ['Slow Days Coffee', 'An identity and digital direction for an independent neighbourhood coffee shop. A warm visual language connects the story, menu, and everyday rituals. Proposed scope: brand identity, digital guidelines, and a responsive menu website.']
];
document.querySelectorAll('[data-project]').forEach((button) => {
    button.addEventListener('click', () => {
        const project = projects[Number(button.dataset.project)];
        $('#projectTitle').textContent = project[0];
        $('#projectDescription').textContent = project[1];
        openDialog($('#projectDialog'));
    });
});
document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach((filter) => {
            const active = filter === button;
            filter.classList.toggle('active', active);
            filter.setAttribute('aria-pressed', String(active));
        });
        document.querySelectorAll('[data-category]').forEach((project) => {
            project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter;
        });
    });
});
document.querySelectorAll('[data-service]').forEach((button) => {
    button.addEventListener('click', () => {
        $('#serviceType').value = button.dataset.service;
        $('#serviceType').dispatchEvent(new Event('change'));
        $('#estimateResult').hidden = true;
        openDialog(dialogs.estimate);
    });
});
$('#serviceType').addEventListener('change', () => {
    const isBrand = $('#serviceType').value === 'brand';
    $('#cms').disabled = isBrand;
    if (isBrand) {
        $('#cms').checked = false;
    }
});
const formatMoney = (satang) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(satang / 100);
$('#estimateForm').addEventListener('submit', (event) => {
    event.preventDefault();
    void withForm(event.currentTarget, $('#estimateResult'), async () => {
        const result = await api('estimates', {
            service: $('#serviceType').value,
            scope: $('#scope').value,
            cms: $('#cms').checked && $('#serviceType').value !== 'brand'
        });
        const item = result.estimate;
        $('#estimateResult').textContent = `Saved: ${formatMoney(item.low_satang)}–${formatMoney(item.high_satang)}. Reference ${item.id}. Excludes VAT and third-party fees. ${state.user ? 'Available in your account history.' : 'Sign up or log in during this session to keep it in your account.'}`;
    });
});
let registerMode = false;
function setAuthMode(register) {
    registerMode = register;
    $('#authTitle').textContent = register ? 'A fresh start.' : 'Welcome back.';
    $('#nameField').hidden = !register;
    $('#accountName').required = register;
    $('#loginTab').setAttribute('aria-pressed', String(!register));
    $('#registerTab').setAttribute('aria-pressed', String(register));
    $('#loginTab').style.color = register ? 'var(--ink)' : '#d64221';
    $('#registerTab').style.color = register ? '#d64221' : 'var(--ink)';
    $('#accountPassword').autocomplete = register ? 'new-password' : 'current-password';
    // The API enforces byte length; HTML minlength counts UTF-16 units instead.
    $('#accountPassword').minLength = 1;
    $('#authStatus').hidden = true;
}
$('#loginTab').addEventListener('click', () => setAuthMode(false));
$('#registerTab').addEventListener('click', () => setAuthMode(true));
$('#authForm').addEventListener('submit', (event) => {
    event.preventDefault();
    void withForm(event.currentTarget, $('#authStatus'), async () => {
        const result = await api(registerMode ? 'register' : 'login', {
            name: $('#accountName').value,
            email: $('#accountEmail').value,
            password: $('#accountPassword').value
        });
        $('#accountPassword').value = '';
        applySession(result);
        await loadChat();
        $('#authStatus').textContent = registerMode ? 'Account created. You are securely signed in.' : 'You are signed in.';
    });
});
function setChat(open) {
    $('#chatPanel').hidden = !open;
    $('#chatToggle').setAttribute('aria-expanded', String(open));
    $('#chatToggle').setAttribute('aria-label', open ? 'Close studio assistant' : 'Open studio assistant');
    if (open) {
        $('#chatInput').focus();
    }
}
$('#chatToggle').addEventListener('click', () => setChat($('#chatPanel').hidden));
$('#closeChat').addEventListener('click', () => {
    setChat(false);
    $('#chatToggle').focus();
});
['faqChat', 'contactChat', 'mobileChat'].forEach((id) => {
    document.getElementById(id).addEventListener('click', () => setChat(true));
});
function addMessage(text, user) {
    const item = document.createElement('div');
    item.className = user ? 'message user' : 'message';
    item.textContent = text;
    const messages = $('#messages');
    messages.appendChild(item);
    while (messages.children.length > 80) {
        messages.firstElementChild.remove();
    }
    messages.scrollTop = messages.scrollHeight;
}
let sendingChat = false;
async function sendMessage(value) {
    const message = value.trim().slice(0, 1000);
    if (!message || sendingChat) {
        return;
    }
    sendingChat = true;
    try {
        await ready;
        const result = await api('chat', { message });
        addMessage(message, true);
        addMessage(result.reply, false);
        $('#chatInput').value = '';
    } catch (error) {
        addMessage(error.message, false);
    } finally {
        sendingChat = false;
    }
}
$('#chatForm').addEventListener('submit', (event) => {
    event.preventDefault();
    void sendMessage($('#chatInput').value);
});
document.querySelectorAll('[data-chat]').forEach((button) => {
    button.addEventListener('click', () => { void sendMessage(button.dataset.chat); });
});
$('#chatPanel').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        setChat(false);
        $('#chatToggle').focus();
    }
});
function contact(channel) {
    const value = CONTACT[channel];
    if (channel === 'line' && /^https:\/\/line\.me\//.test(value)) {
        window.open(value, '_blank', 'noopener,noreferrer');
        return;
    }
    if (channel === 'phone' && /^\+?[0-9 -]{7,20}$/.test(value)) {
        window.location.href = 'tel:' + value.replace(/[ -]/g, '');
        return;
    }
    $('#contactMessage').textContent = `The ${channel === 'line' ? 'LINE account' : 'phone number'} has not been configured. No contact request has been sent. Please try another available business contact.`;
    openDialog($('#contactDialog'));
}
document.querySelectorAll('[data-contact]').forEach((button) => {
    button.addEventListener('click', () => contact(button.dataset.contact));
});
$('#contactGuide').addEventListener('click', () => {
    $('#contactDialog').close();
    setChat(true);
});
const reviews = [
    ['“They didn’t just build us a website. They helped us see what our business could become.”', 'Narin K.', 'Founder, Forma Living'],
    ['“A thoughtful process from the first conversation. Every detail finally felt like us.”', 'Pim S.', 'Co-founder, Slow Days Coffee'],
    ['“Clear communication, considered design, and no unnecessary complexity. Exactly what we needed.”', 'Alex T.', 'Independent business owner']
];
let reviewIndex = 0;
function showReview(direction) {
    reviewIndex = (reviewIndex + direction + reviews.length) % reviews.length;
    $('#reviewText').textContent = reviews[reviewIndex][0];
    $('#reviewName').textContent = reviews[reviewIndex][1];
    $('#reviewRole').textContent = reviews[reviewIndex][2] + ' · Example testimonial';
    $('#reviewCount').textContent = `0${reviewIndex + 1} / 03`;
}
$('#prevReview').addEventListener('click', () => showReview(-1));
$('#nextReview').addEventListener('click', () => showReview(1));
const hero = document.querySelector('.hero');
const heroObserver = new IntersectionObserver((entries) => {
    $('#backTop').hidden = entries[0].isIntersecting || window.scrollY < hero.offsetTop;
});
heroObserver.observe(hero);
$('#backTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
$('#year').textContent = new Date().getFullYear();

function applySession(result) {
    const changed = state.csrf !== result.csrf;
    state = { csrf: result.csrf, user: result.user };
    if (result.contact) {
        CONTACT = result.contact;
        $('#privacyController').textContent = result.contact.controller;
        $('#privacyContact').textContent = result.contact.email || 'Contact not configured';
    }
    const signedIn = Boolean(state.user);
    $('#authForm').hidden = signedIn;
    $('#signedInPanel').hidden = !signedIn;
    $('#loginTab').hidden = signedIn;
    $('#registerTab').hidden = signedIn;
    $('.nav-login').textContent = signedIn ? 'My account' : 'Log in';
    $('#accountSummary').textContent = signedIn ? `Signed in as ${state.user.display_name}. Your estimates and chat are private to this account.` : 'Secure account access. Passwords are hashed, never stored as plain text.';
    if (changed) {
        $('#messages').replaceChildren();
        $('#historyList').replaceChildren();
        $('#estimateResult').textContent = '';
        $('#estimateResult').hidden = true;
    }
}
async function loadChat() {
    const result = await api('chat');
    $('#messages').replaceChildren();
    if (result.messages.length === 0) {
        addMessage('Hello! Ask about pricing, timelines or content management. Messages are saved to your private session or account. Please avoid sensitive information.', false);
    }
    result.messages.forEach((message) => addMessage(message.body, message.role === 'user'));
}
$('#historyButton').addEventListener('click', () => {
    void withForm($('#signedInPanel'), $('#historyList'), async () => {
        const result = await api('estimates');
        $('#historyList').replaceChildren();
        if (result.estimates.length === 0) {
            $('#historyList').textContent = 'No estimates yet. Start with the free estimator.';
        }
        result.estimates.forEach((item) => {
            const row = document.createElement('p');
            row.textContent = `${item.service} · ${formatMoney(item.low_satang)}–${formatMoney(item.high_satang)} · ${new Date(item.created_at * 1000).toLocaleDateString('en-GB')}`;
            $('#historyList').appendChild(row);
        });
    });
});
$('#logoutButton').addEventListener('click', () => {
    void withForm($('#signedInPanel'), $('#authStatus'), async () => {
        applySession(await api('logout', {}));
        $('#authStatus').textContent = 'You have been logged out.';
        await loadChat();
    });
});
$('#deleteForm').addEventListener('submit', (event) => {
    event.preventDefault();
    void withForm(event.currentTarget, $('#authStatus'), async () => {
        const result = await api('account/delete', { password: $('#deletePassword').value });
        $('#deletePassword').value = '';
        applySession(result);
        $('#authStatus').textContent = 'Your account and associated data have been permanently deleted.';
        await loadChat();
    });
});
setAuthMode(false);
ready = api('session').then(async (result) => {
    applySession(result);
    await loadChat();
});
ready.catch((error) => {
    $('#accountSummary').textContent = error.message + ' Reload this page to reconnect.';
    addMessage(error.message + ' Reload this page to reconnect.', false);
});
