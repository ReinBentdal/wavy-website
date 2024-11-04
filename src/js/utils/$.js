export function $(selector) {
    if (selector.startsWith('#')) {
      return document.getElementById(selector.slice(1));
    } else {
      return document.querySelectorAll(selector);
    }
  }