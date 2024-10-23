import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('my-view')
export class MyView extends LitElement {
  static styles = css`
    :host {
      display: none;
    }
    :host([active]) {
      display: block;
    }
  `;

  @property({ type: String, reflect: true })
  name = '';

  @property({ type: Boolean, reflect: true })
  active = false;

  render() {
    return html`<slot></slot>`;
  }
}

export default MyView;
