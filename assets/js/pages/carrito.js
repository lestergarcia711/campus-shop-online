class CartPage extends BasePage {
  #removed = null;

  render() {
    const { cart } = this.app;
    const empty = cart.isEmpty();
    if (empty && !this.#removed) {
      window.location.replace('vacio.html');
      return;
    }
    Dom.$('.compra').hidden = empty;
    Dom.$('#resumen-carrito').hidden = empty;
    if (empty) {
      Dom.$('#lineas').replaceChildren(this.#emptyAfterRemoval());
      return;
    }
    this.#removed = null;
    const lines = cart.lines();
    Dom.$('#lineas').replaceChildren(...lines.map((line) => this.#line(line)));
    Dom.$('#total').textContent = Formatter.money(cart.total());
    Dom.$('#resumen-carrito').textContent = cart.count() === 1 ? '1 artículo' : `${cart.count()} artículos`;
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
        title: 'Eliminar del carrito',
        onclick: () => this.#confirmRemove(line),
      }, Icons.trash(), Dom.el('span', { class: 'texto', text: 'Eliminar' }))
    );
  }

  async #confirmRemove(line) {
    const extra = [line.talla && `talla ${line.talla}`, line.color].filter(Boolean).join(', ');
    const ok = await ConfirmDialog.ask({
      title: '¿Quitar del carrito?',
      message: `${line.cantidad > 1 ? `${line.cantidad} × ` : ''}${line.product.nombre}${extra ? ` (${extra})` : ''} saldrá de tu carrito.`,
      confirmText: 'Quitar',
      danger: true,
    });
    if (!ok) return;
    // Marca previa: el evento de almacenamiento re-renderiza antes de que remove() devuelva.
    this.#removed = { pending: true };
    const removed = this.app.cart.remove(line.key);
    if (!removed) {
      this.#removed = null;
      return;
    }
    this.#removed = removed;
    Toast.show(`${line.product.nombre} se quitó del carrito.`, {
      duration: 7000,
      action: { label: 'Deshacer', onClick: () => this.#undo(removed) },
    });
  }

  // Cada aviso deshace su propia eliminación; `done` evita restaurar dos veces.
  #undo(removed = this.#removed) {
    if (!removed || removed.pending || removed.done) return;
    removed.done = true;
    this.app.cart.restore(removed);
    if (this.#removed === removed) this.#removed = null;
  }

  #emptyAfterRemoval() {
    return Dom.el(
      'div',
      { class: 'estado-vacio' },
      Dom.el('h2', { text: 'Tu carrito quedó vacío' }),
      Dom.el('p', { text: 'Si fue sin querer, puedes recuperar el artículo.' }),
      Dom.el('button', { type: 'button', class: 'btn', text: 'Deshacer', onclick: () => this.#undo() }),
      ' ',
      Dom.el('a', { class: 'btn btn-sec', href: 'catalogo.html', text: 'Ver catálogo' })
    );
  }
}

BasePage.run(CartPage);
