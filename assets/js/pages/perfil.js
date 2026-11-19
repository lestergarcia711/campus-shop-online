class ProfilePage extends BasePage {
  static FIELDS = ProfileService.FIELDS;

  render() {
    const profile = this.app.profile.get();
    for (const field of ProfilePage.FIELDS) Dom.$(`#${field}`).value = profile[field];
    this.#paintHeader(profile);

    Dom.$('#form-perfil').addEventListener('submit', (event) => {
      event.preventDefault();
      this.#save();
    });
    Dom.$('#borrar-datos').addEventListener('click', () => this.#wipe());
  }

  #paintHeader(profile) {
    const name = Formatter.clean(profile.nombre);
    Dom.$('#avatar').textContent = name
      ? name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')
      : '?';
    Dom.$('#perfil-nombre').textContent = name || 'Tu perfil';
    Dom.$('#perfil-email').textContent = profile.email || 'Completa tus datos para agilizar tus compras';
  }

  #save() {
    const data = Object.fromEntries(ProfilePage.FIELDS.map((f) => [f, Dom.$(`#${f}`).value]));
    const result = this.app.profile.save(data);
    for (const field of ProfilePage.FIELDS) {
      const message = result.errors[field] ?? '';
      Dom.$(`#error-${field}`).textContent = message;
      Dom.$(`#${field}`).setAttribute('aria-invalid', String(Boolean(message)));
    }
    if (!result.ok) {
      const first = ProfilePage.FIELDS.find((f) => result.errors[f]);
      Dom.$(`#${first}`).focus();
      return;
    }
    this.#paintHeader(this.app.profile.get());
    Toast.show('Tus datos se guardaron.', { type: 'ok' });
  }

  async #wipe() {
    const ok = await ConfirmDialog.ask({
      title: '¿Borrar los datos de la tienda?',
      message: 'Se eliminarán tu perfil, carrito, comparación e historial guardados en este navegador. No se puede deshacer.',
      confirmText: 'Borrar todo',
      danger: true,
    });
    if (!ok) return;
    this.app.storage.clearAll();
    window.location.reload();
  }
}

BasePage.run(ProfilePage);
