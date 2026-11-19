class CatalogPage extends BasePage {
  #criteria = CatalogPage.#emptyCriteria();
  #orden = 'relevancia';
  #cards;
  #facets = { tallas: new Map(), colores: new Map() };
  #presets = [];

  static #emptyCriteria() {
    return { q: '', categoria: '', tallas: new Set(), colores: new Set(), precioMin: null, precioMax: null };
  }

  init() {
    this.#cards = new ProductCard(this.app);
    this.#readUrl();
    super.init();
  }

  render() {
    this.#buildCategories();
    this.#buildPanel();
    this.#bindControls();
    this.#update();
  }

  refresh() {
    this.#update();
  }

  #readUrl() {
    const params = new URLSearchParams(window.location.search);
    this.#criteria.q = Formatter.clean(params.get('q') ?? '').slice(0, 80);
    const categoria = params.get('categoria') ?? '';
    this.#criteria.categoria = ProductRepository.isCategory(categoria) ? categoria : '';
  }

  #syncUrl() {
    const params = new URLSearchParams();
    if (this.#criteria.q) params.set('q', this.#criteria.q);
    if (this.#criteria.categoria) params.set('categoria', this.#criteria.categoria);
    const query = params.toString();
    history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }

  #asQuery(overrides = {}) {
    const c = { ...this.#criteria, ...overrides };
    return { ...c, tallas: [...c.tallas], colores: [...c.colores] };
  }

  // ---------- construcción ----------

  #buildCategories() {
    const chip = (id, label) =>
      Dom.el('button', {
        type: 'button',
        class: 'chip',
        dataset: { categoria: id },
        text: label,
        onclick: () => {
          this.#criteria.categoria = id;
          this.#update();
        },
      });
    Dom.$('#categorias').replaceChildren(chip('', 'Todo'), ...ProductRepository.CATEGORIES.map((c) => chip(c.id, c.label)));

    const sort = Dom.$('#orden');
    sort.replaceChildren(...ProductRepository.SORTS.map((o) => Dom.el('option', { value: o.id, text: o.label })));
  }

  #buildPanel() {
    const { products } = this.app;
    this.#facets.tallas.clear();
    this.#facets.colores.clear();

    const sizes = Dom.el('div', { class: 'opciones-chips' });
    for (const size of products.availableSizes()) {
      const count = Dom.el('small');
      const button = Dom.el('button', {
        type: 'button',
        class: 'opcion-filtro',
        'aria-pressed': 'false',
        onclick: () => this.#toggle(this.#criteria.tallas, size),
      }, size, count);
      this.#facets.tallas.set(size, { button, count });
      sizes.append(button);
    }

    const colors = Dom.el('div', { class: 'opciones-colores' });
    for (const color of products.availableColors()) {
      const count = Dom.el('small');
      const swatch = Dom.el('span', { class: 'muestra', style: `background:${ProductRepository.COLOR_HEX[color] ?? '#999'}`, 'aria-hidden': 'true' });
      const button = Dom.el('button', {
        type: 'button',
        class: 'opcion-color',
        'aria-pressed': 'false',
        onclick: () => this.#toggle(this.#criteria.colores, color),
      }, swatch, color, count);
      this.#facets.colores.set(color, { button, count });
      colors.append(button);
    }

    const bounds = products.priceBounds();
    this.#presets = ProductRepository.PRICE_PRESETS.map((preset) =>
      Dom.el('button', {
        type: 'button',
        class: 'opcion-filtro',
        'aria-pressed': 'false',
        text: preset.label,
        onclick: () => this.#setPrice(preset.min, preset.max),
      })
    );
    const priceInput = (id, label, placeholder) =>
      Dom.el('label', { class: 'campo-precio', for: id }, label,
        Dom.el('input', {
          type: 'number', id, inputmode: 'numeric', min: '0', step: '1', placeholder,
          oninput: () => this.#readPriceInputs(),
        }));
    const priceBox = Dom.el('div', {},
      Dom.el('div', { class: 'opciones-chips' }, ...this.#presets),
      Dom.el('div', { class: 'rango-precio' }, priceInput('precio-min', 'Mínimo (Q)', String(bounds.min)), Dom.el('span', { 'aria-hidden': 'true', text: '–' }), priceInput('precio-max', 'Máximo (Q)', String(bounds.max))),
      Dom.el('p', { class: 'error-campo', id: 'error-precio', role: 'alert' })
    );

    const group = (title, content) => Dom.el('fieldset', { class: 'grupo-filtro' }, Dom.el('legend', { text: title }), content);
    Dom.$('#filtros').replaceChildren(group('Talla', sizes), group('Color', colors), group('Precio', priceBox));
  }

  #bindControls() {
    const input = Dom.$('#busqueda');
    input.value = this.#criteria.q;
    input.addEventListener('input', () => {
      this.#criteria.q = Formatter.clean(input.value).slice(0, 80);
      this.#update();
    });
    if (this.#criteria.q) Dom.$('#buscador-desplegable').checked = true;

    Dom.$('#orden').addEventListener('change', (e) => {
      this.#orden = e.target.value;
      this.#update();
    });
    Dom.$$('.js-limpiar').forEach((b) => b.addEventListener('click', () => this.#reset()));

    const open = () => this.#togglePanel(true);
    const close = () => this.#togglePanel(false);
    Dom.$('#abrir-panel').addEventListener('click', open);
    Dom.$('#cerrar-panel').addEventListener('click', close);
    Dom.$('#aplicar').addEventListener('click', close);
    Dom.$('#fondo').addEventListener('click', close);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  }

  #togglePanel(open) {
    Dom.$('#panel').classList.toggle('abierto', open);
    Dom.$('#fondo').classList.toggle('visible', open);
    document.body.classList.toggle('sin-scroll', open);
    Dom.$('#abrir-panel').setAttribute('aria-expanded', String(open));
  }

  // ---------- estado ----------

  #toggle(set, value) {
    if (set.has(value)) set.delete(value);
    else set.add(value);
    this.#update();
  }

  #setPrice(min, max) {
    const same = this.#criteria.precioMin === min && this.#criteria.precioMax === max;
    this.#criteria.precioMin = same ? null : min;
    this.#criteria.precioMax = same ? null : max;
    this.#update();
  }

  #readPriceInputs() {
    const parse = (id) => {
      const raw = Dom.$(id).value.trim();
      const n = Number(raw);
      return raw === '' || !Number.isFinite(n) || n < 0 ? null : n;
    };
    const min = parse('#precio-min');
    const max = parse('#precio-max');
    const invalid = min !== null && max !== null && min > max;
    Dom.$('#error-precio').textContent = invalid ? 'El mínimo no puede ser mayor que el máximo.' : '';
    this.#criteria.precioMin = invalid ? null : min;
    this.#criteria.precioMax = invalid ? null : max;
    this.#update({ keepPriceInputs: true });
  }

  #reset() {
    this.#criteria = CatalogPage.#emptyCriteria();
    this.#orden = 'relevancia';
    Dom.$('#busqueda').value = '';
    Dom.$('#orden').value = this.#orden;
    Dom.$('#error-precio').textContent = '';
    this.#update();
  }

  #activeFilters() {
    const c = this.#criteria;
    const items = [];
    if (c.q) items.push({ label: `«${c.q}»`, remove: () => { c.q = ''; Dom.$('#busqueda').value = ''; } });
    if (c.categoria) items.push({ label: ProductRepository.categoryLabel(c.categoria), remove: () => { c.categoria = ''; } });
    c.tallas.forEach((t) => items.push({ label: `Talla ${t}`, remove: () => c.tallas.delete(t) }));
    c.colores.forEach((col) => items.push({ label: col, remove: () => c.colores.delete(col) }));
    if (c.precioMin !== null || c.precioMax !== null) {
      const text = c.precioMin !== null && c.precioMax !== null
        ? `${Formatter.money(c.precioMin)} – ${Formatter.money(c.precioMax)}`
        : c.precioMin !== null ? `Desde ${Formatter.money(c.precioMin)}` : `Hasta ${Formatter.money(c.precioMax)}`;
      items.push({ label: text, remove: () => { c.precioMin = null; c.precioMax = null; } });
    }
    return items;
  }

  // ---------- pintado ----------

  #update({ keepPriceInputs = false } = {}) {
    const c = this.#criteria;
    const results = this.app.products.filter(this.#asQuery(), this.#orden);

    Dom.$$('#categorias .chip').forEach((chip) => {
      const active = chip.dataset.categoria === c.categoria;
      chip.classList.toggle('activo', active);
      chip.setAttribute('aria-pressed', String(active));
    });

    this.#paintFacets('tallas', c.tallas);
    this.#paintFacets('colores', c.colores);
    ProductRepository.PRICE_PRESETS.forEach((preset, i) => {
      this.#presets[i].setAttribute('aria-pressed', String(c.precioMin === preset.min && c.precioMax === preset.max));
    });
    if (!keepPriceInputs) {
      Dom.$('#precio-min').value = c.precioMin ?? '';
      Dom.$('#precio-max').value = c.precioMax ?? '';
    }

    this.#paintActive();
    this.#paintResults(results);
    this.#syncUrl();
  }

  // El conteo de cada opción respeta el resto de filtros activos.
  #paintFacets(group, selected) {
    for (const [value, { button, count }] of this.#facets[group]) {
      const n = this.app.products.filter(this.#asQuery({ [group]: new Set([value]) })).length;
      const isSelected = selected.has(value);
      button.setAttribute('aria-pressed', String(isSelected));
      button.disabled = n === 0 && !isSelected;
      count.textContent = ` (${n})`;
    }
  }

  #paintActive() {
    const active = this.#activeFilters();
    const bar = Dom.$('#activos');
    bar.hidden = active.length === 0;
    bar.replaceChildren(
      ...active.map((f) =>
        Dom.el('button', {
          type: 'button',
          class: 'pastilla',
          'aria-label': `Quitar filtro ${f.label}`,
          onclick: () => { f.remove(); this.#update(); },
        }, f.label, Dom.el('span', { 'aria-hidden': 'true', text: ' ✕' }))
      )
    );
    const count = active.length;
    const badge = Dom.$('#abrir-panel .contador');
    badge.textContent = String(count);
    badge.hidden = count === 0;
    Dom.$$('.js-limpiar').forEach((b) => { b.hidden = count === 0; });
  }

  #paintResults(results) {
    const grid = Dom.$('#productos');
    grid.replaceChildren(...results.map((p) => this.#cards.render(p, { withActions: true })));
    grid.hidden = results.length === 0;
    Dom.$('#sin-resultados').hidden = results.length > 0;
    const label = results.length === 1 ? '1 producto' : `${results.length} productos`;
    Dom.$('#resumen').textContent = label;
    Dom.$('#aplicar').textContent = results.length ? `Ver ${label}` : 'Sin resultados';
  }
}

BasePage.run(CatalogPage);
