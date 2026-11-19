# CampusShop

Tienda en línea de ropa desarrollada con HTML, CSS y JavaScript puro. Permite explorar un catálogo, comparar productos, gestionar un carrito y simular una compra completa, todo en el navegador y sin backend.

## Tabla de contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Arquitectura del código JavaScript](#arquitectura-del-código-javascript)
- [Instalación y uso](#instalación-y-uso)
- [Capturas](#capturas)
- [Aprendizajes](#aprendizajes)
- [Autor](#autor)

## Características

- **Catálogo** con búsqueda (sugerencias, búsquedas recientes y tolerancia a errores de tipeo), categorías y filtros por talla, color y precio.
- **Detalle de producto** con selección de talla y color.
- **Carrito** con cantidades, eliminación con confirmación y opción de deshacer, y total.
- **Comparador** de hasta 4 productos.
- **Checkout** con validación de formulario.
- **Historial de pedidos** y **perfil** editable.
- **Diseño responsivo** para móvil, tablet y escritorio.
- Los datos se guardan en el navegador (`localStorage`); no hay backend.

## Tecnologías

- HTML5
- CSS3
- JavaScript (ES6+, clases, sin librerías ni frameworks)
- Git y GitHub

## Estructura del repositorio

```
campus-shop-online/
├── index.html            # Página de inicio
├── pages/                # Resto de páginas (catálogo, carrito, checkout, etc.)
├── assets/
│   ├── css/              # Hojas de estilo
│   ├── js/               # Lógica de la aplicación
│   │   └── pages/        # Un controlador por página
│   └── img/              # Imágenes de productos
├── docs/
│   └── screenshots/      # Capturas usadas en este README
├── .gitignore
└── README.md
```

## Arquitectura del código JavaScript

| Archivo | Responsabilidad |
| --- | --- |
| `assets/js/core.js` | Almacenamiento, utilidades de DOM, formato y validación |
| `assets/js/catalog.js` | `Product` y `ProductRepository` (fuente única de productos) |
| `assets/js/services.js` | Carrito, comparador, pedidos y perfil |
| `assets/js/ui.js` | Avisos, diálogos, selector de variantes y clase base de páginas |
| `assets/js/pages/` | Un controlador por página |

## Instalación y uso

No requiere dependencias ni compilación.

1. Clona el repositorio:

   ```bash
   git clone https://github.com/lestergarcia711/campus-shop-online.git
   cd campus-shop-online
   ```

2. Abre `index.html` en el navegador, o sirve la carpeta con un servidor local:

   ```bash
   python3 -m http.server 8000
   ```

   y visita <http://localhost:8000>.

## Aprendizajes

- Estructurar y maquetar páginas con HTML5 y CSS3 de forma ordenada y responsiva.
- Organizar una aplicación en JavaScript con clases ES6 y separación de responsabilidades.
- Persistir datos en el navegador con `localStorage`.


