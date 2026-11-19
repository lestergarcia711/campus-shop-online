class Toast {
  static #region() {
    let region = Dom.$('.toasts');
    if (!region) {
      region = Dom.el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
      document.body.append(region);
    }
    return region;
  }

  static show(message, { type = 'info', action = null } = {}) {
    const toast = Dom.el(
      'div',
      { class: `toast toast-${type}` },
      Dom.el('span', { text: message }),
      action ? Dom.el('a', { href: action.href, text: action.label }) : null
    );
    Toast.#region().append(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

class ConfirmDialog {
  static ask({ title, message, confirmText = 'Aceptar', danger = false }) {
    return new Promise((resolve) => {
      const dialog = Dom.el(
        'dialog',
        { class: 'dialogo', 'aria-labelledby': 'dlg-title' },
        Dom.el(
          'form',
          { method: 'dialog' },
          Dom.el('h2', { id: 'dlg-title', text: title }),
          Dom.el('p', { text: message }),
          Dom.el(
            'div',
            { class: 'dialogo-acciones' },
            Dom.el('button', { value: 'cancel', class: 'btn btn-sec', text: 'Cancelar' }),
            Dom.el('button', { value: 'ok', class: danger ? 'btn btn-peligro' : 'btn', text: confirmText })
          )
        )
      );
      dialog.addEventListener('close', () => {
        resolve(dialog.returnValue === 'ok');
        dialog.remove();
      });
      document.body.append(dialog);
      dialog.showModal();
    });
  }
}

class VariantPicker {
  #product;
  #talla = '';
  #color = '';
  #root;

  constructor(product) {
    this.#product = product;
    if (product.colores.length === 1) this.#color = product.colores[0];
  }

  get selection() {
    return { talla: this.#talla, color: this.#color };
  }

  validate() {
    if (this.#product.tallas.length && !this.#talla) return 'Elige una talla.';
    if (this.#product.colores.length && !this.#color) return 'Elige un color.';
    return '';
  }

  render() {
    this.#root = Dom.el('div', { class: 'variantes' });
    if (this.#product.tallas.length) this.#root.append(this.#group('Talla', this.#product.tallas, 'talla'));
    if (this.#product.colores.length > 1) this.#root.append(this.#group('Color', this.#product.colores, 'color'));
    else if (this.#product.colores.length === 1) {
      this.#root.append(Dom.el('p', { class: 'variante-unica', text: `Color: ${this.#product.colores[0]}` }));
    }
    return this.#root;
  }

  #group(label, options, field) {
    const group = Dom.el('div', { class: 'grupo-opciones', role: 'group', 'aria-label': label });
    group.append(Dom.el('span', { class: 'grupo-titulo', text: label }));
    const buttons = options.map((opt) =>
      Dom.el('button', {
        type: 'button',
        class: 'opcion',
        'aria-pressed': 'false',
        text: opt,
        onclick: () => {
          if (field === 'talla') this.#talla = opt;
          else this.#color = opt;
          buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === opt)));
          this.#root.classList.remove('con-error');
        },
      })
    );
    group.append(...buttons);
    return group;
  }

  flagError() {
    this.#root?.classList.add('con-error');
  }
}

class OptionsDialog {
  static open(product, cart) {
    const picker = new VariantPicker(product);
    const error = Dom.el('p', { class: 'error-campo', role: 'alert' });
    const dialog = Dom.el(
      'dialog',
      { class: 'dialogo', 'aria-labelledby': 'opt-title' },
      Dom.el('h2', { id: 'opt-title', text: product.nombre }),
      Dom.el('p', { class: 'precio-dialogo', text: Formatter.money(product.precio) }),
      picker.render(),
      error,
      Dom.el(
        'div',
        { class: 'dialogo-acciones' },
        Dom.el('button', { type: 'button', class: 'btn btn-sec', text: 'Cancelar', onclick: () => dialog.close() }),
        Dom.el('button', {
          type: 'button',
          class: 'btn',
          text: 'Agregar al carrito',
          onclick: () => {
            const problem = picker.validate();
            if (problem) {
              error.textContent = problem;
              picker.flagError();
              return;
            }
            const result = cart.add(product.id, picker.selection);
            Toast.show(result.message, { type: result.ok ? 'ok' : 'error', action: result.ok ? { href: 'carrito.html', label: 'Ver carrito' } : null });
            if (result.ok) dialog.close();
            else error.textContent = result.message;
          },
        })
      )
    );
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  }
}

class ProductCard {
  constructor(app) {
    this.app = app;
  }

  render(product, { withActions = false } = {}) {
    const detailUrl = `detalles.html?id=${product.id}`;
    const card = Dom.el(
      'div',
      { class: 'card' },
      Dom.el('a', { href: detailUrl, class: 'card-enlace', 'aria-label': `Ver ${product.nombre}` },
        Dom.el('img', { src: product.imagen, alt: product.nombre, loading: 'lazy' })),
      Dom.el('h3', { text: product.nombre }),
      Dom.el('p', { text: Formatter.money(product.precio) })
    );
    if (!withActions) return card;

    const inCompare = this.app.compare.has(product.id);
    card.append(
      Dom.el(
        'div',
        { class: 'card-acciones' },
        Dom.el('button', {
          class: 'cart',
          type: 'button',
          'aria-label': `Agregar ${product.nombre} al carrito`,
          title: 'Agregar al carrito',
          text: '🛒',
          onclick: () => this.#quickAdd(product),
        }),
        Dom.el('button', {
          class: `comparar${inCompare ? ' activo' : ''}`,
          type: 'button',
          'aria-pressed': String(inCompare),
          text: inCompare ? 'Quitar' : 'Comparar',
          onclick: () => {
            const result = this.app.compare.toggle(product.id);
            Toast.show(result.message, { type: result.ok ? 'ok' : 'error' });
          },
        }),
        Dom.el('a', { href: detailUrl, class: 'revisar', text: 'Detalles' })
      )
    );
    return card;
  }

  #quickAdd(product) {
    if (product.needsChoice) {
      OptionsDialog.open(product, this.app.cart);
      return;
    }
    const color = product.colores[0] ?? '';
    const result = this.app.cart.add(product.id, { color });
    Toast.show(result.message, { type: result.ok ? 'ok' : 'error', action: result.ok ? { href: 'carrito.html', label: 'Ver carrito' } : null });
  }
}

class SiteChrome {
  static mount(app) {
    const refresh = () => {
      SiteChrome.#badge(Dom.$$('a.carrito, a[data-badge="cart"]'), app.cart.count());
      SiteChrome.#badge(Dom.$$('a[data-badge="compare"]'), app.compare.count());
    };
    refresh();
    window.addEventListener(StorageService.EVENT, refresh);
    window.addEventListener('storage', refresh);
  }

  static #badge(links, count) {
    for (const link of links) {
      let badge = Dom.$('.badge', link);
      if (!count) {
        badge?.remove();
        continue;
      }
      if (!badge) {
        badge = Dom.el('span', { class: 'badge', 'aria-hidden': 'true' });
        link.append(badge);
      }
      badge.textContent = String(count);
      link.setAttribute('aria-label', `${link.dataset.label ?? 'Carrito'}: ${count}`);
    }
  }
}

class BasePage {
  constructor(app = App) {
    this.app = app;
  }

  init() {
    SiteChrome.mount(this.app);
    this.render();
    const onChange = () => this.refresh();
    window.addEventListener(StorageService.EVENT, onChange);
    window.addEventListener('storage', onChange);
  }

  render() {}

  refresh() {}

  static run(PageClass) {
    document.addEventListener('DOMContentLoaded', () => new PageClass().init());
  }
}
