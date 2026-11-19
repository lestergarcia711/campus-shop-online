class Product {
  #data;

  constructor(data) {
    this.#data = Object.freeze({
      ...data,
      colores: Object.freeze([...data.colores]),
      tallas: Object.freeze([...data.tallas]),
      caracteristicas: Object.freeze([...data.caracteristicas]),
    });
  }

  get id() { return this.#data.id; }
  get nombre() { return this.#data.nombre; }
  get precio() { return this.#data.precio; }
  get categoria() { return this.#data.categoria; }
  get imagen() { return this.#data.imagen; }
  get colores() { return this.#data.colores; }
  get tallas() { return this.#data.tallas; }
  get descripcion() { return this.#data.descripcion; }
  get caracteristicas() { return this.#data.caracteristicas; }

  get codigo() {
    return `#${String(this.id).padStart(3, '0')}`;
  }

  get needsChoice() {
    return this.tallas.length > 0 || this.colores.length > 1;
  }

  matches({ q = '', categoria = '', tallas = [], colores = [], precioMin = null, precioMax = null }) {
    if (categoria && this.categoria !== categoria) return false;
    if (tallas.length && !tallas.some((t) => this.tallas.includes(t))) return false;
    if (colores.length && !colores.some((c) => this.colores.includes(c))) return false;
    if (precioMin !== null && this.precio < precioMin) return false;
    if (precioMax !== null && this.precio > precioMax) return false;
    const term = Formatter.normalize(q);
    if (!term) return true;
    const haystack = Formatter.normalize(
      [this.nombre, this.descripcion, ProductRepository.categoryLabel(this.categoria), ...this.colores].join(' ')
    );
    return term.split(' ').every((word) => haystack.includes(word));
  }
}

class ProductRepository {
  static CATEGORIES = Object.freeze([
    { id: 'abrigos', label: 'Abrigos' },
    { id: 'camisetas', label: 'Camisetas' },
    { id: 'pantalones', label: 'Pantalones' },
    { id: 'calzado', label: 'Calzados' },
  ]);

  static PRICE_PRESETS = Object.freeze([
    { label: 'Hasta Q50', min: null, max: 50 },
    { label: 'Q50 a Q100', min: 50, max: 100 },
    { label: 'Más de Q100', min: 100, max: null },
  ]);

  static COLOR_HEX = Object.freeze({
    Negro: '#1a1a1a', Azul: '#1f4e9c', Rojo: '#c0392b', Verde: '#4a6b3a', Beige: '#d8c3a0', Crema: '#f3ead0',
  });

  static SORTS = Object.freeze([
    { id: 'relevancia', label: 'Relevancia' },
    { id: 'precio-asc', label: 'Precio: menor a mayor' },
    { id: 'precio-desc', label: 'Precio: mayor a menor' },
    { id: 'nombre', label: 'Nombre (A-Z)' },
  ]);

  static #SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

  #products;

  constructor() {
    this.#products = ProductRepository.#seed().map((d) => new Product(d));
  }

  static categoryLabel(id) {
    return ProductRepository.CATEGORIES.find((c) => c.id === id)?.label ?? id;
  }

  static isCategory(id) {
    return ProductRepository.CATEGORIES.some((c) => c.id === id);
  }

  all() {
    return [...this.#products];
  }

  findById(id) {
    return this.#products.find((p) => p.id === Number(id)) ?? null;
  }

  filter(criteria, orden = 'relevancia') {
    const list = this.#products.filter((p) => p.matches(criteria));
    const by = {
      'precio-asc': (a, b) => a.precio - b.precio,
      'precio-desc': (a, b) => b.precio - a.precio,
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
    }[orden];
    return by ? list.sort(by) : list;
  }

  priceBounds() {
    const prices = this.#products.map((p) => p.precio);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }

  availableSizes() {
    const sizes = new Set(this.#products.flatMap((p) => [...p.tallas]));
    const order = ProductRepository.#SIZE_ORDER;
    const letters = [...sizes].filter((s) => order.includes(s)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const numbers = [...sizes].filter((s) => !order.includes(s)).sort((a, b) => Number(a) - Number(b));
    return [...letters, ...numbers];
  }

  availableColors() {
    return [...new Set(this.#products.flatMap((p) => [...p.colores]))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  static #seed() {
    return [
      {
        id: 1, nombre: 'Camisa Polo', precio: 45, categoria: 'camisetas', imagen: 'img/camisa-polo.jpeg',
        colores: ['Negro'], tallas: ['S', 'M', 'L', 'XL'],
        descripcion: 'Polo negro con mangas blancas, ribetes en cuello y puños y un bordado pequeño en el pecho.',
        caracteristicas: ['Cuello con botones', 'Mangas contrastantes en blanco', 'Corte recto'],
      },
      {
        id: 2, nombre: 'Chaqueta de Cuero', precio: 120, categoria: 'abrigos', imagen: 'img/jacket.jpeg',
        colores: ['Negro'], tallas: ['S', 'M', 'L', 'XL'],
        descripcion: 'Chaqueta negra de cuero con cuello mao, cierre frontal y bolsillos con cremallera.',
        caracteristicas: ['Cuello mao con broche', 'Cuatro bolsillos con cierre', 'Cierre frontal metálico'],
      },
      {
        id: 3, nombre: 'Jeans Clásicos', precio: 80, categoria: 'pantalones', imagen: 'img/jeans.jpeg',
        colores: ['Azul', 'Negro'], tallas: ['26', '28', '30', '32', '34'],
        descripcion: 'Jeans de corte ajustado en tela elástica. Disponibles en azul claro, medio, oscuro y negro.',
        caracteristicas: ['Cinco bolsillos', 'Corte ajustado', 'Parche de cuero en la cintura'],
      },
      {
        id: 4, nombre: 'Polo Básico', precio: 35, categoria: 'camisetas', imagen: 'img/polo.jpeg',
        colores: ['Crema'], tallas: ['S', 'M', 'L'],
        descripcion: 'Polo color crema con cuello de cierre corto y bordado dorado en el pecho y los puños.',
        caracteristicas: ['Cuello con cierre', 'Bordado en pecho y puños', 'Manga corta'],
      },
      {
        id: 5, nombre: 'Shorts Deportivos', precio: 25, categoria: 'pantalones', imagen: 'img/shorts.jpeg',
        colores: ['Beige', 'Azul', 'Rojo', 'Verde', 'Negro'], tallas: ['30', '32', '34'],
        descripcion: 'Bermudas de tela ligera con bolsillos laterales y cierre con botón, en varios colores.',
        caracteristicas: ['Bolsillos laterales', 'Cierre con botón', 'Largo a la rodilla'],
      },
      {
        id: 6, nombre: 'T-shirt Estampada', precio: 30, categoria: 'camisetas', imagen: 'img/t-shirt.jpeg',
        colores: ['Negro'], tallas: ['S', 'M', 'L'],
        descripcion: 'Camiseta negra con estampado dorado al frente, paneles de malla en los hombros y ribetes en el cuello.',
        caracteristicas: ['Estampado dorado', 'Malla en hombros', 'Cuello polo'],
      },
      {
        id: 7, nombre: 'Zapato Clásico', precio: 150, categoria: 'calzado', imagen: 'img/Zapato clasico.jpeg',
        colores: ['Negro'], tallas: ['8', '9', '10', '11', '12'],
        descripcion: 'Zapato negro sin cordones, con laterales elásticos y suela blanca.',
        caracteristicas: ['Sin cordones', 'Laterales elásticos', 'Suela blanca'],
      },
      {
        id: 8, nombre: 'Tennis Deportivos', precio: 90, categoria: 'calzado', imagen: 'img/tennis.jpeg',
        colores: ['Azul'], tallas: ['34', '35', '36', '37', '38', '39', '40'],
        descripcion: 'Tenis de lona azul marino con agujetas color café y suela blanca.',
        caracteristicas: ['Lona azul marino', 'Agujetas con ojales metálicos', 'Suela blanca'],
      },
    ];
  }
}
