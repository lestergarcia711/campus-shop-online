class EmptyCartPage extends BasePage {
  render() {
    if (!this.app.cart.isEmpty()) window.location.replace('carrito.html');
  }

  refresh() {
    this.render();
  }
}

BasePage.run(EmptyCartPage);
