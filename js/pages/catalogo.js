class CatalogPage extends BasePage {
  #criteria = CatalogPage.#emptyCriteria();
  #cards;

  static #emptyCriteria() {
    return { q: '', categoria: '', tallas: new Set(), colores: new Set(), rangos: new Set() };
  }

  init() {
    this.#cards = new ProductCard(this.app);
    this.#readUrl();
    super.init();
  }

  render() {
    this.#buildFilters();
    this.#bindSearch();
    this.#renderResults();
  }

  refresh() {
    this.#renderResults();
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

  #bindSearch() {
    const input = Dom.$('#busqueda');
    input.value = this.#criteria.q;
    input.addEventListener('input', () => {
      this.#criteria.q = Formatter.clean(input.value).slice(0, 80);
      this.#renderResults();
    });
    if (this.#criteria.q) Dom.$('#buscador-desplegable').checked = true;
    Dom.$('#limpiar').addEventListener('click', () => this.#reset());
  }

  #buildFilters() {
    const chip = (id, label) =>
      Dom.el('button', {
        type: 'button',
        class: 'chip',
        dataset: { categoria: id },
        text: label,
        onclick: () => {
          this.#criteria.categoria = id;
          this.#renderResults();
        },
      });
    Dom.$('#categorias').replaceChildren(
      chip('', 'Todo'),
      ...ProductRepository.CATEGORIES.map((c) => chip(c.id, c.label))
    );

    const { products } = this.app;
    Dom.$('#filtros').replaceChildren(
      this.#checkGroup('Talla', products.availableSizes().map((s) => [s, s]), this.#criteria.tallas),
      this.#checkGroup('Color', products.availableColors().map((c) => [c, c]), this.#criteria.colores),
      this.#checkGroup('Precio', ProductRepository.PRICE_RANGES.map((r) => [r.id, r.label]), this.#criteria.rangos)
    );
  }

  #checkGroup(title, options, selected) {
    const list = Dom.el('ul', { class: 'opciones-filtro' });
    for (const [value, label] of options) {
      list.append(
        Dom.el(
          'li',
          {},
          Dom.el(
            'label',
            {},
            Dom.el('input', {
              type: 'checkbox',
              value,
              checked: selected.has(value),
              onchange: (event) => {
                if (event.target.checked) selected.add(value);
                else selected.delete(value);
                this.#renderResults();
              },
            }),
            ` ${label}`
          )
        )
      );
    }
    return Dom.el('details', { class: 'lista' }, Dom.el('summary', { text: title }), list);
  }

  #reset() {
    this.#criteria = CatalogPage.#emptyCriteria();
    Dom.$('#busqueda').value = '';
    this.#buildFilters();
    this.#renderResults();
  }

  #activeFilterCount() {
    const c = this.#criteria;
    return Number(Boolean(c.q)) + Number(Boolean(c.categoria)) + c.tallas.size + c.colores.size + c.rangos.size;
  }

  #renderResults() {
    const c = this.#criteria;
    const results = this.app.products.filter({
      q: c.q,
      categoria: c.categoria,
      tallas: [...c.tallas],
      colores: [...c.colores],
      rangos: [...c.rangos],
    });

    Dom.$$('#categorias .chip').forEach((chip) => {
      const active = chip.dataset.categoria === c.categoria;
      chip.classList.toggle('activo', active);
      chip.setAttribute('aria-pressed', String(active));
    });

    const grid = Dom.$('#productos');
    grid.replaceChildren(...results.map((p) => this.#cards.render(p, { withActions: true })));
    grid.hidden = results.length === 0;
    Dom.$('#sin-resultados').hidden = results.length > 0;
    Dom.$('#resumen').textContent = results.length === 1 ? '1 producto' : `${results.length} productos`;
    Dom.$('#limpiar').hidden = this.#activeFilterCount() === 0;
    this.#syncUrl();
  }
}

BasePage.run(CatalogPage);
