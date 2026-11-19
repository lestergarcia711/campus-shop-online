class HistoryPage extends BasePage {
  static LABELS = { camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };

  render() {
    const orders = this.app.orders.list();
    Dom.$('#vacio-historial').hidden = orders.length > 0;
    const list = Dom.$('#pedidos');
    list.hidden = orders.length === 0;
    list.replaceChildren(...orders.map((o) => this.#order(o)));
    this.#announceNew();
  }

  refresh() {
    this.render();
  }

  #announceNew() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('nuevo');
    if (!id || !this.app.orders.list().some((o) => o.id === id)) return;
    Toast.show(`Pedido ${id} confirmado. ¡Gracias por tu compra!`, { type: 'ok' });
    history.replaceState(null, '', window.location.pathname);
  }

  #order(order) {
    const units = order.items.reduce((sum, i) => sum + i.cantidad, 0);
    const detail = Dom.el(
      'ul',
      { class: 'detalle-pedido' },
      ...order.items.map((i) => {
        const extra = [i.talla && `Talla ${i.talla}`, i.color].filter(Boolean).join(' · ');
        return Dom.el('li', { text: `${i.cantidad} × ${i.nombre}${extra ? ` (${extra})` : ''} — ${Formatter.money(i.precio * i.cantidad)}` });
      })
    );

    const actions = [];
    if (order.estado === OrderService.STATUS.CAMINO) {
      actions.push(
        Dom.el('button', { type: 'button', text: 'Recibido', onclick: () => this.app.orders.confirmDelivery(order.id) }),
        Dom.el('button', { type: 'button', class: 'peligro', text: 'Cancelar', onclick: () => this.#confirmCancel(order) })
      );
    }
    actions.push(Dom.el('button', { type: 'button', text: 'Volver a comprar', onclick: () => this.#reorder(order) }));

    return Dom.el(
      'div',
      { class: 'order' },
      Dom.el(
        'div',
        { class: 'order-info' },
        Dom.el('h3', { text: `Pedido ${order.id}` }),
        Dom.el('p', { text: `${Formatter.date(order.fecha)} · ${units === 1 ? '1 artículo' : `${units} artículos`} · ${order.pago}` }),
        Dom.el('span', { class: `status ${order.estado}`, text: HistoryPage.LABELS[order.estado] ?? order.estado }),
        Dom.el('details', {}, Dom.el('summary', { text: 'Ver detalle' }), detail,
          Dom.el('p', { class: 'envio', text: `Envío a ${order.envio.nombre}, ${order.envio.direccion}, ${order.envio.ciudad}` }))
      ),
      Dom.el('div', { class: 'order-right' }, Dom.el('p', { class: 'price', text: Formatter.money(order.total) }), ...actions)
    );
  }

  async #confirmCancel(order) {
    const ok = await ConfirmDialog.ask({
      title: '¿Cancelar este pedido?',
      message: `El pedido ${order.id} quedará como cancelado.`,
      confirmText: 'Cancelar pedido',
      danger: true,
    });
    if (ok) this.app.orders.cancel(order.id);
  }

  #reorder(order) {
    let added = 0;
    for (const item of order.items) {
      const result = this.app.cart.add(item.productId, { talla: item.talla, color: item.color }, item.cantidad);
      if (result.ok) added += 1;
    }
    if (added === 0) {
      Toast.show('No pudimos agregar esos artículos; ya no están disponibles o superan el límite.', { type: 'error' });
      return;
    }
    Toast.show('Artículos agregados a tu carrito.', { type: 'ok', action: { href: 'carrito.html', label: 'Ver carrito' } });
  }
}

BasePage.run(HistoryPage);
