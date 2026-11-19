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

class SearchBox {
  #app;
  #input;
  #host;
  #handlers;
  #list;
  #rows = [];
  #active = -1;
  #uid = `sug-${Math.random().toString(36).slice(2, 7)}`;

  constructor(app, input, { host, onSubmit, onCategory }) {
    this.#app = app;
    this.#input = input;
    this.#host = host;
    this.#handlers = { onSubmit, onCategory };
  }

  mount() {
    this.#list = Dom.el('div', { class: 'sugerencias', id: this.#uid, role: 'listbox', hidden: true, 'aria-label': 'Sugerencias de búsqueda' });
    this.#host.append(this.#list);
    this.#input.setAttribute('role', 'combobox');
    this.#input.setAttribute('aria-autocomplete', 'list');
    this.#input.setAttribute('aria-controls', this.#uid);
    this.#input.setAttribute('aria-expanded', 'false');
    this.#input.setAttribute('autocomplete', 'off');

    this.#input.addEventListener('focus', () => this.#open());
    this.#input.addEventListener('input', () => this.#open());
    this.#input.addEventListener('keydown', (e) => this.#onKey(e));
    // mousedown evita que el input pierda el foco antes del clic en una sugerencia.
    this.#list.addEventListener('mousedown', (e) => e.preventDefault());
    document.addEventListener('mousedown', (e) => {
      if (!this.#host.contains(e.target)) this.#close();
    });
    document.addEventListener('keydown', (e) => {
      const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName ?? '');
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.#input.focus();
      }
    });
  }

  submit(term) {
    const q = Formatter.clean(term);
    this.#app.searches.add(q);
    this.#close();
    this.#handlers.onSubmit(q);
  }

  // ---------- teclado ----------

  #onKey(e) {
    const open = !this.#list.hidden;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) this.#open();
      if (!this.#rows.length) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      this.#setActive((this.#active + step + this.#rows.length) % this.#rows.length);
    } else if (e.key === 'Enter') {
      if (open && this.#active >= 0) {
        e.preventDefault();
        this.#rows[this.#active].run();
      } else if (!this.#input.form) {
        e.preventDefault();
        this.submit(this.#input.value);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      this.#close();
    }
  }

  #setActive(index) {
    this.#active = index;
    this.#rows.forEach((row, i) => {
      const on = i === index;
      row.node.setAttribute('aria-selected', String(on));
      row.node.classList.toggle('activa', on);
      if (on) {
        row.node.scrollIntoView({ block: 'nearest' });
        this.#input.setAttribute('aria-activedescendant', row.node.id);
      }
    });
    if (index < 0) this.#input.removeAttribute('aria-activedescendant');
  }

  // ---------- contenido ----------

  #open() {
    this.#render();
    this.#list.hidden = this.#list.childElementCount === 0;
    this.#input.setAttribute('aria-expanded', String(!this.#list.hidden));
  }

  #close() {
    this.#list.hidden = true;
    this.#input.setAttribute('aria-expanded', 'false');
    this.#setActive(-1);
  }

  #render() {
    const q = Formatter.clean(this.#input.value);
    this.#rows = [];
    this.#active = -1;
    const nodes = q ? this.#resultsView(q) : this.#idleView();
    this.#list.replaceChildren(...nodes);
  }

  #row({ children, run, label }) {
    const node = Dom.el('div', {
      class: 'sugerencia',
      role: 'option',
      id: `${this.#uid}-${this.#rows.length}`,
      'aria-selected': 'false',
      'aria-label': label,
      onclick: () => run(),
    }, ...children);
    this.#rows.push({ node, run });
    return node;
  }

  #heading(text, action) {
    return Dom.el('div', { class: 'sugerencias-titulo', role: 'presentation' },
      Dom.el('span', { text }),
      action ? Dom.el('button', { type: 'button', class: 'enlace-limpiar', text: action.label, onclick: action.run }) : null);
  }

  #categoryRow(category) {
    return this.#row({
      label: `Ver ${category.label}`,
      run: () => { this.#close(); this.#handlers.onCategory(category.id); },
      children: [Dom.el('span', { class: 'sug-icono', 'aria-hidden': 'true', text: '▦' }), Dom.el('span', { class: 'sug-texto' }, Dom.el('strong', { text: category.label }), Dom.el('small', { text: 'Ver toda la categoría' }))],
    });
  }

  #idleView() {
    const recent = this.#app.searches.list();
    const nodes = [];
    if (recent.length) {
      nodes.push(this.#heading('Búsquedas recientes', { label: 'Borrar', run: () => { this.#app.searches.clear(); this.#open(); } }));
      for (const term of recent) {
        nodes.push(this.#row({
          label: `Buscar ${term}`,
          run: () => { this.#input.value = term; this.submit(term); },
          children: [Dom.el('span', { class: 'sug-icono', 'aria-hidden': 'true', text: '🕒' }), Dom.el('span', { class: 'sug-texto', text: term })],
        }));
      }
    }
    nodes.push(this.#heading('Categorías'));
    ProductRepository.CATEGORIES.forEach((c) => nodes.push(this.#categoryRow(c)));
    return nodes;
  }

  #resultsView(q) {
    const { products } = this.#app;
    const { items, total, fuzzy } = products.search(q, 5);
    const nodes = [];

    if (items.length) {
      nodes.push(this.#heading(fuzzy ? `Resultados similares a «${q}»` : 'Productos'));
      for (const p of items) {
        nodes.push(this.#row({
          label: `${p.nombre}, ${Formatter.money(p.precio)}`,
          run: () => { this.#app.searches.add(q); window.location.href = `detalles.html?id=${p.id}`; },
          children: [
            Dom.el('img', { src: p.imagen, alt: '', loading: 'lazy' }),
            Dom.el('span', { class: 'sug-texto' }, Dom.el('strong', {}, ...this.#highlight(p.nombre, q)), Dom.el('small', { text: ProductRepository.categoryLabel(p.categoria) })),
            Dom.el('span', { class: 'sug-precio', text: Formatter.money(p.precio) }),
          ],
        }));
      }
    } else {
      nodes.push(Dom.el('p', { class: 'sugerencias-vacio', role: 'presentation', text: `No encontramos «${q}». Prueba con otra palabra o explora una categoría.` }));
    }

    const categories = products.matchingCategories(q);
    if (categories.length) {
      nodes.push(this.#heading('Categorías'));
      categories.forEach((c) => nodes.push(this.#categoryRow(c)));
    } else if (!items.length) {
      nodes.push(this.#heading('Categorías'));
      ProductRepository.CATEGORIES.forEach((c) => nodes.push(this.#categoryRow(c)));
    }

    if (items.length) {
      const all = total === 1 ? 'Ver el resultado' : `Ver los ${total} resultados`;
      nodes.push(this.#row({
        label: `${all} de ${q}`,
        run: () => this.submit(q),
        children: [Dom.el('span', { class: 'sug-icono', 'aria-hidden': 'true', text: '🔍' }), Dom.el('span', { class: 'sug-texto' }, Dom.el('strong', { text: all }), Dom.el('small', { text: `para «${q}»` }))],
      }));
    }
    return nodes;
  }

  // Resalta coincidencias sin distinguir tildes ni mayúsculas.
  #highlight(text, query) {
    const plain = [...text].map((ch) => Formatter.normalize(ch) || ch).join('');
    const words = Formatter.normalize(query).split(' ').filter(Boolean);
    const marked = new Array(text.length).fill(false);
    for (const w of words) {
      let from = 0;
      for (let at = plain.indexOf(w, from); at !== -1; at = plain.indexOf(w, from)) {
        for (let i = at; i < at + w.length; i += 1) marked[i] = true;
        from = at + w.length;
      }
    }
    const parts = [];
    let buffer = '';
    let state = false;
    [...text].forEach((ch, i) => {
      if (marked[i] !== state && buffer) {
        parts.push(state ? Dom.el('mark', { text: buffer }) : buffer);
        buffer = '';
      }
      state = marked[i];
      buffer += ch;
    });
    if (buffer) parts.push(state ? Dom.el('mark', { text: buffer }) : buffer);
    return parts;
  }
}
