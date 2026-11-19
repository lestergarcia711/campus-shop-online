class CartPage extends BasePage {
  render() {
    const { cart } = this.app;
    if (cart.isEmpty()) {
      window.location.replace('vacio.html');
      return;
    }
    const lines = cart.lines();
    Dom.$('#lineas').replaceChildren(...lines.map((line) => this.#line(line)));
    Dom.$('#total').textContent = Formatter.money(cart.total());
    Dom.$('#resumen-carrito').textContent =
      cart.count() === 1 ? '1 artículo' : `${cart.count()} artículos`;
  }

  refresh() {
    this.render();
  }

  #line(line) {
    const { product } = line;
    const details = [line.talla && `Talla ${line.talla}`, line.color].filter(Boolean).join(' · ');
    return Dom.el(
      'div',
      { class: 'card' },
      Dom.el('img', { src: product.imagen, alt: product.nombre }),
      Dom.el(
        'div',
        {},
        Dom.el('h3', { text: product.nombre }),
        Dom.el('p', { text: `Cód. ${product.codigo}${details ? ` · ${details}` : ''}` }),
        Dom.el('p', { class: 'precio', text: Formatter.money(line.subtotal) }),
        Dom.el(
          'div',
          { class: 'add' },
          Dom.el('button', {
            type: 'button',
            'aria-label': 'Quitar una unidad',
            text: '-',
            disabled: line.cantidad <= 1,
            onclick: () => this.app.cart.setQuantity(line.key, line.cantidad - 1),
          }),
          Dom.el('span', { class: 'cantidad', 'aria-live': 'polite', text: String(line.cantidad) }),
          Dom.el('button', {
            type: 'button',
            'aria-label': 'Agregar una unidad',
            text: '+',
            disabled: line.cantidad >= CartService.MAX_QTY,
            onclick: () => this.app.cart.setQuantity(line.key, line.cantidad + 1),
          })
        )
      ),
      Dom.el('button', {
        type: 'button',
        class: 'eliminar',
        'aria-label': `Eliminar ${product.nombre}`,
        text: '🗑️',
        onclick: () => this.#confirmRemove(line),
      })
    );
  }

  async #confirmRemove(line) {
    const ok = await ConfirmDialog.ask({
      title: '¿Quitar del carrito?',
      message: `${line.product.nombre} saldrá de tu carrito.`,
      confirmText: 'Quitar',
      danger: true,
    });
    if (ok) this.app.cart.remove(line.key);
  }
}

BasePage.run(CartPage);
