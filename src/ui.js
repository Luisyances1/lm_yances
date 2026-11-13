import { profile, stops, textVersion } from './content.js';

const $ = (s) => document.querySelector(s);

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  if (text) n.textContent = text;
  return n;
}

function buildTextVersion() {
  const body = $('#text-cv-body');
  body.append(el('p', {}, `${profile.title}. ${textVersion.summary}`));
  body.append(el('h3', {}, 'Experiencia'));
  textVersion.jobs.forEach(([role, org, dates, desc]) => {
    const p = el('p', { class: 'job' });
    p.append(el('strong', {}, role), el('span', {}, `${org}, ${dates}`), el('span', {}, desc));
    body.append(p);
  });
  body.append(el('h3', {}, 'Educación'));
  const ul = el('ul');
  textVersion.education.forEach((e) => ul.append(el('li', {}, e)));
  body.append(ul);
  body.append(el('h3', {}, 'Tecnologías'));
  body.append(el('p', {}, textVersion.skills));
  body.append(el('h3', {}, 'Contacto'));
  body.append(el('p', {}, `${profile.email}, ${profile.phone}`));
}

export function mountUI(path, { onSnap } = {}) {
  const intro = $('#intro');
  const card = $('#stop');
  const final = $('#final');
  const list = $('#route ol');
  const dialog = $('#text-cv');

  ['#pdf-top', '#pdf-final'].forEach((s) => $(s).setAttribute('href', profile.cv));
  $('#mail').setAttribute('href', `mailto:${profile.email}`);

  const contact = $('.contact');
  const items = [
    [profile.email, `mailto:${profile.email}`],
    [profile.phone, `tel:${profile.phone.replace(/\s/g, '')}`],
    profile.linkedin && ['LinkedIn', profile.linkedin],
    profile.github && ['GitHub', profile.github]
  ].filter(Boolean);
  items.forEach(([label, href]) => {
    const li = el('li');
    const a = el('a', { href }, label);
    if (href.startsWith('http')) a.setAttribute('rel', 'noopener');
    li.append(a);
    contact.append(li);
  });

  buildTextVersion();
  $('#open-text').addEventListener('click', () => dialog.showModal());
  $('#close-text').addEventListener('click', () => dialog.close());

  const jump = (kf) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: path.keys[kf].p * max, behavior: reduce ? 'auto' : 'smooth' });
  };

  const buttons = stops.map((s) => {
    const li = el('li');
    const b = el('button', { type: 'button', 'aria-label': `Ir a ${s.short}: ${s.role}` });
    b.append(el('span', { class: 'dot' }), el('span', { class: 'label' }, s.short));
    b.addEventListener('click', () => jump(s.kf));
    li.append(b);
    list.append(li);
    return b;
  });

  const veil = $('#veil');
  let restarting = false;
  const restart = () => {
    if (restarting) return;
    restarting = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    veil.classList.add('on');
    setTimeout(() => {
      scrollTo({ top: 0, behavior: 'instant' });
      onSnap?.();
      requestAnimationFrame(() => {
        veil.classList.remove('on');
        $('#brand').focus({ preventScroll: true });
        restarting = false;
      });
    }, reduce ? 0 : 460);
  };
  $('#restart').addEventListener('click', restart);
  $('#brand').addEventListener('click', (e) => {
    e.preventDefault();
    restart();
  });

  let shown = null;
  let swapTimer = 0;

  function fill(s) {
    card.querySelector('.code').textContent = s.code;
    card.querySelector('.place').textContent = s.place;
    card.querySelector('.role').textContent = s.role;
    card.querySelector('.org').textContent = s.org;
    card.querySelector('.elev').textContent = s.elevation ? `Elevación ${s.elevation}` : '';
  }

  function show(s) {
    if (s === shown) return;
    shown = s;
    clearTimeout(swapTimer);
    if (!s) {
      card.classList.add('leaving');
      swapTimer = setTimeout(() => (card.hidden = true), 300);
      return;
    }
    if (card.hidden) {
      fill(s);
      card.hidden = false;
      card.classList.add('leaving');
      requestAnimationFrame(() => card.classList.remove('leaving'));
      return;
    }
    card.classList.add('leaving');
    swapTimer = setTimeout(() => {
      fill(s);
      card.classList.remove('leaving');
    }, 260);
  }

  let nearestIndex = -1;

  return {
    update(u) {
      intro.style.opacity = String(Math.max(0, 1 - u * 1.6));
      intro.style.visibility = u > 0.62 ? 'hidden' : 'visible';
      const isFinal = u > path.n - 1.35;
      final.hidden = !isFinal;

      const active = isFinal
        ? null
        : stops.find((s) => (s.range ? u >= s.range[0] && u <= s.range[1] : Math.abs(u - s.kf) < 0.45));
      show(active || null);

      let best = 0;
      stops.forEach((s, i) => {
        if (u >= s.kf - 1.2) best = i;
      });
      if (best !== nearestIndex) {
        nearestIndex = best;
        buttons.forEach((b, i) => (i === best ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      }
    }
  };
}
