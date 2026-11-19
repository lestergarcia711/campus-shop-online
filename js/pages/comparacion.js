class ComparePage extends BasePage {
  render() {
    const products = this.app.compare.products();
    const grid = Dom.$('#comparacion');
    const empty = Dom.$('#sin-comparacion');
    const hint = Dom.$('#pista');
    const clear = Dom.$('#vaciar');

    empty.hidden = products.length > 0;
    grid.hidden = products.length === 0;
    clear.hidden = products.length === 0;
    hint.hidden = products.length !== 1;
    clear.onclick = () => this.#confirmClear();

    const cheapest = products.length > 1 ? Math.min(...products.map((p) => p.precio)) : null;
    grid.replaceChildren(...products.map((p) => this.#card(p, p.precio === cheapest)));
  }

  refresh() {
    this.render();
  }

  #card(product, isCheapest) {
    return Dom.el(
      'div',
      { class: 'card' },
      Dom.el('img', { src: product.imagen, alt: product.nombre }),
      Dom.el(
        'div',
        { class: 'card-cuerpo' },
        Dom.el('h3', { text: product.nombre }),
        Dom.el('p', { class: 'precio-comp', text: Formatter.money(product.precio) }),
        isCheapest ? Dom.el('span', { class: 'etiqueta', text: 'Más económico' }) : null,
        Dom.el('p', { text: product.descripcion }),
        Dom.el('dl', { class: 'ficha' },
          Dom.el('dt', { text: 'Categoría' }), Dom.el('dd', { text: ProductRepository.categoryLabel(product.categoria) }),
          Dom.el('dt', { text: 'Tallas' }), Dom.el('dd', { text: product.tallas.join(', ') }),
          Dom.el('dt', { text: 'Colores' }), Dom.el('dd', { text: product.colores.join(', ') })
        ),
        Dom.el('ul', {}, ...product.caracteristicas.map((c) => Dom.el('li', { text: c }))),
        Dom.el(
          'div',
          { class: 'card-acciones' },
          Dom.el('a', { class: 'revisar', href: `detalles.html?id=${product.id}`, text: 'Ver detalles' }),
          Dom.el('button', {
            type: 'button',
            class: 'secundario',
            text: 'Quitar',
            onclick: () => this.app.compare.toggle(product.id),
          })
        )
      )
    );
  }

  async #confirmClear() {
    const ok = await ConfirmDialog.ask({
      title: '¿Vaciar la comparación?',
      message: 'Se quitarán todos los productos de la lista.',
      confirmText: 'Vaciar',
      danger: true,
    });
    if (ok) this.app.compare.clear();
  }
}

BasePage.run(ComparePage);
