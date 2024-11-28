export function $<T extends string>(selector: T): T extends `#${string}` ? HTMLElement | null : NodeListOf<HTMLElement> {
  if (selector.startsWith('#')) {
    return document.getElementById(selector.slice(1)) as T extends `#${string}` ? HTMLElement | null : never;
  } else {
    return document.querySelectorAll(selector) as T extends `#${string}` ? never : NodeListOf<HTMLElement>;
  }
}
