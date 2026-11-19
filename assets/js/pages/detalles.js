class DetailPage extends BasePage {
  render() {
    const id = new URLSearchParams(window.location.search).get('id');
    const product = this.app.products.findById(id);
    const root = Dom.$('#detalle');
    if (!product) {
      root.replaceChildren(
        Dom.el(
          'div',
          { class: 'estado-vacio' },
          Dom.el('h2', { text: 'No encontramos ese producto' }),
          Dom.el('p', { text: 'Puede que el enlace esté mal escrito o que ya no esté disponible.' }),
          Dom.el('a', { class: 'btn', href: 'catalogo.html', text: 'Volver al catálogo' })
        )
      );
      return;
    }
    document.title = `${product.nombre} | CampusShop`;
    this.product = product;
    this.picker = new VariantPicker(product);
    root.replaceChildren(this.#card());
  }

  refresh() {
    if (!this.product) return;
    const button = Dom.$('#btn-comparar');
    if (!button) return;
    const active = this.app.compare.has(this.product.id);
    button.textContent = active ? 'Quitar de la comparación' : 'Comparar';
    button.setAttribute('aria-pressed', String(active));
  }

  #card() {
    const p = this.product;
    const error = Dom.el('p', { class: 'error-campo', id: 'error-variante', role: 'alert' });
    const active = this.app.compare.has(p.id);
    return Dom.el(
      'div',
      { class: 'card' },
      Dom.el('img', { src: p.imagen, alt: p.nombre }),
      Dom.el('h3', { text: p.nombre }),
      Dom.el('p', { class: 'meta', text: `${ProductRepository.categoryLabel(p.categoria)} · Código ${p.codigo}` }),
      Dom.el('p', { class: 'precio-detalle', text: Formatter.money(p.precio) }),
      Dom.el('p', { text: p.descripcion }),
      Dom.el('ul', { class: 'caracteristicas' }, ...p.caracteristicas.map((c) => Dom.el('li', { text: c }))),
      this.picker.render(),
      error,
      Dom.el('button', {
        type: 'button',
        class: 'cart',
        text: 'Agregar al carrito',
        onclick: () => this.#addToCart(error),
      }),
      Dom.el('button', {
        type: 'button',
        id: 'btn-comparar',
        class: 'secundario',
        'aria-pressed': String(active),
        text: active ? 'Quitar de la comparación' : 'Comparar',
        onclick: () => {
          const result = this.app.compare.toggle(p.id);
          Toast.show(result.message, { type: result.ok ? 'ok' : 'error' });
        },
      })
    );
  }

  #addToCart(errorNode) {
    const problem = this.picker.validate();
    errorNode.textContent = problem;
    if (problem) {
      this.picker.flagError();
      return;
    }
    const result = this.app.cart.add(this.product.id, this.picker.selection);
    Toast.show(result.message, {
      type: result.ok ? 'ok' : 'error',
      action: result.ok ? { href: 'carrito.html', label: 'Ver carrito' } : null,
    });
  }
}

BasePage.run(DetailPage);
