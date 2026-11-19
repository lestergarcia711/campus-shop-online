class HomePage extends BasePage {
  render() {
    this.#bindSearch();
    this.#renderProducts();
  }

  #bindSearch() {
    Dom.$('#form-busqueda').addEventListener('submit', (event) => {
      event.preventDefault();
      const q = Formatter.clean(Dom.$('#busqueda').value);
      window.location.href = q ? `catalogo.html?q=${encodeURIComponent(q)}` : 'catalogo.html';
    });
  }

  #renderProducts() {
    const cards = new ProductCard(this.app);
    Dom.$('#novedades').replaceChildren(...this.app.products.all().map((p) => cards.render(p)));
  }
}

BasePage.run(HomePage);
