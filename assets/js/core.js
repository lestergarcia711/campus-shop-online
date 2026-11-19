class StorageService {
  static EVENT = 'campusshop:storage';

  #prefix;
  #fallback = new Map();

  constructor(prefix = 'campusshop:') {
    this.#prefix = prefix;
  }

  read(key, defaultValue) {
    try {
      const raw = window.localStorage.getItem(this.#prefix + key);
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch {
      return this.#fallback.has(key) ? this.#fallback.get(key) : defaultValue;
    }
  }

  write(key, value) {
    try {
      window.localStorage.setItem(this.#prefix + key, JSON.stringify(value));
    } catch {
      // Navegación privada o almacenamiento lleno: se conserva en memoria durante la sesión.
      this.#fallback.set(key, value);
    }
    this.#notify(key);
  }

  clearAll() {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(this.#prefix))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* sin almacenamiento disponible */
    }
    this.#fallback.clear();
    this.#notify('*');
  }

  #notify(key) {
    window.dispatchEvent(new CustomEvent(StorageService.EVENT, { detail: { key } }));
  }
}

class Dom {
  static el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name === 'dataset') Object.assign(node.dataset, value);
      else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
      else node.setAttribute(name, value === true ? '' : value);
    }
    node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
    return node;
  }

  static $(selector, root = document) {
    return root.querySelector(selector);
  }

  static $$(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }
}

class Formatter {
  static #money = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  static #date = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });

  static money(value) {
    return `Q${Formatter.#money.format(value)}`;
  }

  static date(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : Formatter.#date.format(d);
  }

  static normalize(text) {
    return String(text ?? '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
  }

  static clean(text) {
    return String(text ?? '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

class Validator {
  static required(value, label, { min = 1, max = 120 } = {}) {
    const text = Formatter.clean(value);
    if (!text) return `Escribe ${label}.`;
    if (text.length < min) return `${label[0].toUpperCase()}${label.slice(1)} es demasiado corto.`;
    if (text.length > max) return `${label[0].toUpperCase()}${label.slice(1)} es demasiado largo.`;
    return '';
  }

  static email(value) {
    const text = Formatter.clean(value);
    if (!text) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text) ? '' : 'Revisa el correo, parece incompleto.';
  }

  static phone(value) {
    const text = Formatter.clean(value);
    if (!text) return '';
    const digits = text.replace(/[\s\-()+]/g, '');
    return /^\d{8,15}$/.test(digits) ? '' : 'El teléfono debe tener entre 8 y 15 dígitos.';
  }
}
