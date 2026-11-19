class HomePage extends BasePage {
  render() {
    this.#bindSearch();
    this.#renderProducts();
  }

  #bindSearch() {
    const form = Dom.$('#form-busqueda');
    const goTo = (q) => {
      window.location.href = q ? `catalogo.html?q=${encodeURIComponent(q)}` : 'catalogo.html';
    };
    const box = new SearchBox(this.app, Dom.$('#busqueda'), {
      host: form,
      onSubmit: goTo,
      onCategory: (id) => { window.location.href = `catalogo.html?categoria=${id}`; },
    });
    box.mount();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      box.submit(Dom.$('#busqueda').value);
    });
  }

  #renderProducts() {
    const cards = new ProductCard(this.app);
    Dom.$('#novedades').replaceChildren(...this.app.products.all().map((p) => cards.render(p)));
  }
}

BasePage.run(HomePage);
