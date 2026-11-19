class CartService {
  static KEY = 'cart';
  static MAX_QTY = 10;

  #storage;
  #products;

  constructor(storage, products) {
    this.#storage = storage;
    this.#products = products;
  }

  static lineKey(productId, talla, color) {
    return [productId, talla, color].join('|');
  }

  #raw() {
    const stored = this.#storage.read(CartService.KEY, []);
    return Array.isArray(stored) ? stored : [];
  }

  // Descarta líneas de productos que ya no existen o con cantidades corruptas.
  lines() {
    return this.#raw()
      .map((l) => ({ ...l, product: this.#products.findById(l.productId) }))
      .filter((l) => l.product && Number.isInteger(l.cantidad) && l.cantidad > 0)
      .map((l) => ({ ...l, key: CartService.lineKey(l.productId, l.talla, l.color), subtotal: l.product.precio * l.cantidad }));
  }

  count() {
    return this.lines().reduce((sum, l) => sum + l.cantidad, 0);
  }

  total() {
    return this.lines().reduce((sum, l) => sum + l.subtotal, 0);
  }

  isEmpty() {
    return this.lines().length === 0;
  }

  add(productId, { talla = '', color = '' } = {}, cantidad = 1) {
    const product = this.#products.findById(productId);
    if (!product) return { ok: false, message: 'Ese producto ya no está disponible.' };
    if (product.tallas.length && !product.tallas.includes(talla)) return { ok: false, message: 'Elige una talla.' };
    if (product.colores.length && !product.colores.includes(color)) return { ok: false, message: 'Elige un color.' };

    const lines = this.#raw();
    const key = CartService.lineKey(product.id, talla, color);
    const existing = lines.find((l) => CartService.lineKey(l.productId, l.talla, l.color) === key);
    const next = (existing?.cantidad ?? 0) + cantidad;
    if (next > CartService.MAX_QTY) {
      return { ok: false, message: `Puedes llevar hasta ${CartService.MAX_QTY} unidades de cada artículo.` };
    }
    if (existing) existing.cantidad = next;
    else lines.push({ productId: product.id, talla, color, cantidad });
    this.#storage.write(CartService.KEY, lines);
    return { ok: true, message: `${product.nombre} se agregó al carrito.` };
  }

  setQuantity(key, cantidad) {
    const qty = Math.min(CartService.MAX_QTY, Math.max(1, Math.trunc(cantidad)));
    const lines = this.#raw();
    const line = lines.find((l) => CartService.lineKey(l.productId, l.talla, l.color) === key);
    if (!line) return;
    line.cantidad = qty;
    this.#storage.write(CartService.KEY, lines);
  }

  // Devuelve lo eliminado para poder deshacer la acción.
  remove(key) {
    const lines = this.#raw();
    const index = lines.findIndex((l) => CartService.lineKey(l.productId, l.talla, l.color) === key);
    if (index === -1) return null;
    const [entry] = lines.splice(index, 1);
    this.#storage.write(CartService.KEY, lines);
    return { entry, index };
  }

  restore({ entry, index }) {
    const lines = this.#raw();
    const key = CartService.lineKey(entry.productId, entry.talla, entry.color);
    const existing = lines.find((l) => CartService.lineKey(l.productId, l.talla, l.color) === key);
    if (existing) existing.cantidad = Math.min(CartService.MAX_QTY, existing.cantidad + entry.cantidad);
    else lines.splice(Math.min(index, lines.length), 0, entry);
    this.#storage.write(CartService.KEY, lines);
  }

  clear() {
    this.#storage.write(CartService.KEY, []);
  }
}

class CompareService {
  static KEY = 'compare';
  static MAX = 4;

  #storage;
  #products;

  constructor(storage, products) {
    this.#storage = storage;
    this.#products = products;
  }

  ids() {
    const stored = this.#storage.read(CompareService.KEY, []);
    const ids = Array.isArray(stored) ? stored : [];
    return ids.filter((id) => this.#products.findById(id));
  }

  products() {
    return this.ids().map((id) => this.#products.findById(id));
  }

  has(id) {
    return this.ids().includes(Number(id));
  }

  count() {
    return this.ids().length;
  }

  toggle(id) {
    const numeric = Number(id);
    const ids = this.ids();
    if (ids.includes(numeric)) {
      this.#storage.write(CompareService.KEY, ids.filter((i) => i !== numeric));
      return { ok: true, added: false, message: 'Producto quitado de la comparación.' };
    }
    if (ids.length >= CompareService.MAX) {
      return { ok: false, added: false, message: `Solo puedes comparar hasta ${CompareService.MAX} productos.` };
    }
    this.#storage.write(CompareService.KEY, [...ids, numeric]);
    return { ok: true, added: true, message: 'Producto agregado a la comparación.' };
  }

  clear() {
    this.#storage.write(CompareService.KEY, []);
  }
}

class ProfileService {
  static KEY = 'profile';
  static FIELDS = ['nombre', 'email', 'telefono', 'direccion', 'ciudad'];

  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  get() {
    const stored = this.#storage.read(ProfileService.KEY, {});
    return Object.fromEntries(
      ProfileService.FIELDS.map((f) => [f, typeof stored?.[f] === 'string' ? stored[f] : ''])
    );
  }

  validate(data) {
    const errors = {};
    const nameError = data.nombre ? Validator.required(data.nombre, 'tu nombre', { min: 3, max: 80 }) : '';
    if (nameError) errors.nombre = nameError;
    const emailError = Validator.email(data.email);
    if (emailError) errors.email = emailError;
    const phoneError = Validator.phone(data.telefono);
    if (phoneError) errors.telefono = phoneError;
    if (Formatter.clean(data.direccion).length > 160) errors.direccion = 'La dirección es demasiado larga.';
    if (Formatter.clean(data.ciudad).length > 60) errors.ciudad = 'La ciudad es demasiado larga.';
    return errors;
  }

  save(data) {
    const errors = this.validate(data);
    if (Object.keys(errors).length) return { ok: false, errors };
    const clean = Object.fromEntries(ProfileService.FIELDS.map((f) => [f, Formatter.clean(data[f])]));
    this.#storage.write(ProfileService.KEY, clean);
    return { ok: true, errors: {} };
  }
}

class OrderService {
  static KEY = 'orders';
  static PAYMENTS = Object.freeze(['Efectivo', 'Mastercard', 'PayPal']);
  static STATUS = Object.freeze({ CAMINO: 'camino', ENTREGADO: 'entregado', CANCELADO: 'cancelado' });

  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  static validateShipping({ nombre, direccion, ciudad }) {
    const errors = {};
    const fields = [
      ['nombre', nombre, 'tu nombre completo', { min: 3, max: 80 }],
      ['direccion', direccion, 'tu dirección', { min: 5, max: 160 }],
      ['ciudad', ciudad, 'tu ciudad', { min: 2, max: 60 }],
    ];
    for (const [field, value, label, rules] of fields) {
      const error = Validator.required(value, label, rules);
      if (error) errors[field] = error;
    }
    return errors;
  }

  list() {
    const stored = this.#storage.read(OrderService.KEY, []);
    const orders = Array.isArray(stored) ? stored : [];
    return orders.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }

  place({ lines, envio, pago }) {
    if (!lines.length) return { ok: false, errors: { general: 'Tu carrito está vacío.' } };
    const errors = OrderService.validateShipping(envio);
    if (!OrderService.PAYMENTS.includes(pago)) errors.pago = 'Elige un método de pago.';
    if (Object.keys(errors).length) return { ok: false, errors };

    const order = {
      id: `CS-${Date.now().toString(36).toUpperCase()}`,
      fecha: new Date().toISOString(),
      estado: OrderService.STATUS.CAMINO,
      pago,
      envio: {
        nombre: Formatter.clean(envio.nombre),
        direccion: Formatter.clean(envio.direccion),
        ciudad: Formatter.clean(envio.ciudad),
      },
      items: lines.map((l) => ({
        productId: l.productId,
        nombre: l.product.nombre,
        talla: l.talla,
        color: l.color,
        cantidad: l.cantidad,
        precio: l.product.precio,
      })),
      total: lines.reduce((sum, l) => sum + l.subtotal, 0),
    };
    this.#storage.write(OrderService.KEY, [order, ...this.list()]);
    return { ok: true, order };
  }

  #updateStatus(id, from, to) {
    const orders = this.list();
    const order = orders.find((o) => o.id === id);
    if (!order || order.estado !== from) return false;
    order.estado = to;
    this.#storage.write(OrderService.KEY, orders);
    return true;
  }

  cancel(id) {
    return this.#updateStatus(id, OrderService.STATUS.CAMINO, OrderService.STATUS.CANCELADO);
  }

  confirmDelivery(id) {
    return this.#updateStatus(id, OrderService.STATUS.CAMINO, OrderService.STATUS.ENTREGADO);
  }
}

class SearchHistory {
  static KEY = 'recent-searches';
  static MAX = 5;

  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  list() {
    const stored = this.#storage.read(SearchHistory.KEY, []);
    return Array.isArray(stored) ? stored.filter((t) => typeof t === 'string').slice(0, SearchHistory.MAX) : [];
  }

  add(term) {
    const clean = Formatter.clean(term).slice(0, 80);
    if (clean.length < 2) return;
    const key = Formatter.normalize(clean);
    const rest = this.list().filter((t) => Formatter.normalize(t) !== key);
    this.#storage.write(SearchHistory.KEY, [clean, ...rest].slice(0, SearchHistory.MAX));
  }

  remove(term) {
    this.#storage.write(SearchHistory.KEY, this.list().filter((t) => t !== term));
  }

  clear() {
    this.#storage.write(SearchHistory.KEY, []);
  }
}

const App = (() => {
  const storage = new StorageService();
  const products = new ProductRepository();
  return Object.freeze({
    storage,
    products,
    cart: new CartService(storage, products),
    compare: new CompareService(storage, products),
    orders: new OrderService(storage),
    profile: new ProfileService(storage),
    searches: new SearchHistory(storage),
  });
})();
