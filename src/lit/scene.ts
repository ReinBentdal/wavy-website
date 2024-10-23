import { LitElement, html } from 'lit';
import { customElement, queryAssignedElements } from 'lit/decorators.js';

@customElement('my-scene')
export class MyScene<T extends string> extends LitElement {
  @queryAssignedElements({ slot: '' })
  views;

  callbacks: Record<'show' | 'hide', Record<string, () => void>> = {
    show: {},
    hide: {},
  };

  static get ready() {
    return customElements.whenDefined('my-scene');
  }

  set(name: T) {
    this.views.forEach(view => {
      const viewName = view.getAttribute('name');
      if (!viewName) return;
      if (viewName == name) {
        if (view.hasAttribute('active')) return;
        view.setAttribute('active', '');
        this.callbacks.show[name]?.();
      } else if (view.hasAttribute('active')) {
        view.removeAttribute('active');
        this.callbacks.hide[viewName]?.();
      }
    });
  }

  on(event: 'show' | 'hide', view: T, callback: () => void) {
    this.callbacks[event][view] = callback;
  }

  render() {
    return html`<slot></slot>`;
  }
}

export default MyScene;
