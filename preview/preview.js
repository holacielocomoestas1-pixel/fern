'use strict';

const assets = window.mascotCatalog.assets;
const byId = new Map(assets.map(asset => [asset.id, asset]));
const stateSelect = document.querySelector('#state');
const stage = document.querySelector('#stage');
const sampleImage = document.querySelector('#sample-image');
const sampleCopy = document.querySelector('#sample-copy');
const sampleTitle = document.querySelector('#sample-title');
const sampleBody = document.querySelector('#sample-body');
const sampleAction = document.querySelector('#sample-action');
const stateUse = document.querySelector('#state-use');
const replay = document.querySelector('#replay');
const assetGrid = document.querySelector('#asset-grid');

const themeButtons = Array.from(document.querySelectorAll('button[data-theme]'));
const languageButtons = Array.from(document.querySelectorAll('button[data-lang]'));
const filterButtons = Array.from(document.querySelectorAll('button[data-filter]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let current = byId.get('welcome');
let locale = 'es';
let activeFilter = 'all';

function createArt(asset, stageArt) {
  const art = new Image(384, 384);
  art.src = asset.webp;
  art.alt = '';
  art.decoding = 'async';
  if (stageArt) {
    art.srcset = `${asset.webp} 1x, ${asset.webp2x} 2x`;
    art.className = 'mascot-art mascot-motion';
    art.dataset.motion = asset.motion;
  } else {
    art.loading = 'lazy';
  }
  return art;
}

function showState(id) {
  current = byId.get(id);
  stage.dataset.state = id;
  stateSelect.value = id;
  stateUse.textContent = current.use;
  sampleImage.replaceChildren(createArt(current, true));
  replay.disabled = current.motion === 'none' || reducedMotion.matches;
  const copy = current[locale];
  sampleCopy.lang = locale;
  sampleTitle.textContent = copy.title;
  sampleBody.textContent = copy.body;
  sampleAction.lang = locale;
  sampleAction.textContent = copy.action;
  for (const card of assetGrid.children) {
    card.dataset.selected = String(card.dataset.id === id);
  }
}

function createCard(asset) {
  const item = document.createElement('li');
  item.className = 'asset';
  item.dataset.id = asset.id;
  item.dataset.group = asset.group;
  item.dataset.selected = String(asset.id === current.id);
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `Probar ${asset.name} en pantalla`);
  button.addEventListener('click', () => {
    showState(asset.id);
    document.querySelector('#pantalla').scrollIntoView({ block: 'start' });
    stateSelect.focus({ preventScroll: true });
  });

  const artWrap = document.createElement('span');
  artWrap.className = 'asset-art';
  artWrap.append(createArt(asset, false));

  const label = document.createElement('span');
  label.className = 'asset-label';
  const name = document.createElement('strong');
  name.textContent = asset.name;
  const placement = document.createElement('span');
  placement.textContent = asset.placement;
  label.append(name, placement);
  button.append(artWrap, label);
  item.append(button);

  const downloads = document.createElement('div');
  downloads.className = 'asset-links';
  for (const [format, url] of [['PNG', asset.png], ['WebP', asset.webp]]) {
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.textContent = format;
    link.setAttribute('aria-label', `Descargar ${asset.name} en ${format}`);
    downloads.append(link);
  }
  item.append(downloads);
  return item;
}

function applyFilter(group) {
  activeFilter = group;
  const shown = assets.filter(asset => activeFilter === 'all' || asset.group === activeFilter);
  assetGrid.replaceChildren(...shown.map(createCard));
  for (const button of filterButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === group));
  }
}

for (const asset of assets) {
  stateSelect.add(new Option(asset.name, asset.id));
}
stateSelect.addEventListener('change', () => showState(stateSelect.value));
for (const button of document.querySelectorAll('.shortcuts button')) {
  button.addEventListener('click', () => showState(button.dataset.state));
}
for (const button of themeButtons) {
  button.addEventListener('click', () => {
    stage.dataset.color = button.dataset.theme;
    for (const control of themeButtons) {
      control.setAttribute('aria-pressed', String(control === button));
    }
  });
}
for (const button of languageButtons) {
  button.addEventListener('click', () => {
    locale = button.dataset.lang;
    for (const control of languageButtons) {
      control.setAttribute('aria-pressed', String(control === button));
    }
    showState(current.id);
  });
}
for (const button of filterButtons) {
  button.addEventListener('click', () => applyFilter(button.dataset.filter));
}
sampleAction.addEventListener('click', () => showState(current.next));
replay.addEventListener('click', () => showState(current.id));
reducedMotion.addEventListener('change', () => showState(current.id));
applyFilter(activeFilter);
showState(current.id);
