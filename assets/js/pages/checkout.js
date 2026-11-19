class CheckoutPage extends BasePage {
  #payment = '';
  #placing = false;

  render() {
    const { cart } = this.app;
    if (cart.isEmpty()) {
      window.location.replace('vacio.html');
      return;
    }
    this.#renderSummary();
    this.#prefill();
    this.#renderPayments();
    Dom.$('#form-checkout').addEventListener('submit', (event) => {
      event.preventDefault();
      this.#submit();
    });
  }

  // El carrito se vacía al confirmar; sin esta guarda el evento volvería a redirigir.
  refresh() {
    if (this.#placing) return;
    if (this.app.cart.isEmpty()) window.location.replace('vacio.html');
    else this.#renderSummary();
  }

  #renderSummary() {
    const { cart } = this.app;
    const list = Dom.$('#resumen-lineas');
    list.replaceChildren(
      ...cart.lines().map((l) => {
        const extra = [l.talla && `Talla ${l.talla}`, l.color].filter(Boolean).join(' · ');
        return Dom.el(
          'li',
          {},
          Dom.el('span', { text: `${l.cantidad} × ${l.product.nombre}${extra ? ` (${extra})` : ''}` }),
          Dom.el('strong', { text: Formatter.money(l.subtotal) })
        );
      })
    );
    const total = Formatter.money(cart.total());
    Dom.$('#pago-total').textContent = total;
    Dom.$('#btn-pagar').textContent = `Pagar ${total}`;
  }

  #prefill() {
    const profile = this.app.profile.get();
    Dom.$('#nombre').value = profile.nombre;
    Dom.$('#direccion').value = profile.direccion;
    Dom.$('#ciudad').value = profile.ciudad;
  }

  #renderPayments() {
    const box = Dom.$('#metodos');
    const buttons = OrderService.PAYMENTS.map((name) =>
      Dom.el('button', {
        type: 'button',
        class: 'card metodo',
        role: 'radio',
        'aria-checked': 'false',
        text: name,
        onclick: () => {
          this.#payment = name;
          buttons.forEach((b) => b.setAttribute('aria-checked', String(b.textContent === name)));
          this.#showError('pago', '');
        },
      })
    );
    box.replaceChildren(...buttons);
  }

  #showError(field, message) {
    const node = Dom.$(`#error-${field}`);
    node.textContent = message;
    const input = Dom.$(`#${field}`);
    if (input) input.setAttribute('aria-invalid', String(Boolean(message)));
  }

  #submit() {
    const envio = {
      nombre: Dom.$('#nombre').value,
      direccion: Dom.$('#direccion').value,
      ciudad: Dom.$('#ciudad').value,
    };
    const result = this.app.orders.place({ lines: this.app.cart.lines(), envio, pago: this.#payment });

    ['nombre', 'direccion', 'ciudad', 'pago'].forEach((f) => this.#showError(f, result.errors?.[f] ?? ''));
    if (!result.ok) {
      const first = ['nombre', 'direccion', 'ciudad'].find((f) => result.errors?.[f]);
      if (first) Dom.$(`#${first}`).focus();
      else Toast.show(result.errors?.general ?? 'Elige un método de pago para continuar.', { type: 'error' });
      return;
    }

    this.#placing = true;
    this.app.cart.clear();
    window.location.href = `historial.html?nuevo=${encodeURIComponent(result.order.id)}`;
  }
}

BasePage.run(CheckoutPage);
