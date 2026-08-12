export class FakeText {
  constructor(public data: string) {}
}

export class FakeElement {
  readonly tagName: string;
  className = "";
  href = "";
  children: (FakeElement | FakeText)[] = [];
  private text = "";

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  appendChild<T extends FakeElement | FakeText>(node: T): T {
    this.children.push(node);
    return node;
  }

  set textContent(value: string) {
    this.children = [];
    this.text = value;
  }

  get textContent(): string {
    if (this.children.length === 0) return this.text;
    return this.children
      .map((child) => (child instanceof FakeText ? child.data : child.textContent))
      .join("");
  }

  private hasClasses(classes: string[]): boolean {
    const list = this.className.split(" ").filter(Boolean);
    return classes.every((cls) => list.includes(cls));
  }

  querySelector(selector: string): FakeElement | null {
    const [tag, ...classes] = selector.split(".");
    for (const child of this.children) {
      if (child instanceof FakeElement) {
        if ((!tag || child.tagName === tag.toUpperCase()) && child.hasClasses(classes)) {
          return child;
        }
        const found = child.querySelector(selector);
        if (found) return found;
      }
    }
    return null;
  }
}

export function installFakeDocument(): void {
  const fakeDocument = {
    createElement: (tag: string) => new FakeElement(tag),
    createTextNode: (data: string) => new FakeText(data),
  };
  (globalThis as unknown as { document: typeof fakeDocument }).document = fakeDocument;
}
