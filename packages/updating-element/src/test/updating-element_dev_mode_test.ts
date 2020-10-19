/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {UpdatingElement} from '../updating-element.js';
import {generateElementName} from './test-helpers.js';
import {assert} from '@esm-bundle/chai';

const DEV_MODE = true;

if (DEV_MODE) {
  suite('Developer mode warnings', () => {
    let container: HTMLElement;
    let warnings: string[] = [];

    const missingPlatformSupport =
      window.ShadyDOM?.inUse &&
      !(globalThis as any)['updatingElementPlatformSupport'];

    const consoleWarn = console.warn;

    suiteSetup(() => {
      console.warn = (message: string) => warnings.push(message);
    });

    suiteTeardown(() => {
      console.warn = consoleWarn;
    });

    setup(() => {
      warnings = [];
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    teardown(() => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    // Note, this warning is issued once only so it must be the first test
    // in this module.
    (missingPlatformSupport ? test : test.skip)(
      'warning for platform-support',
      async () => {
        class A extends UpdatingElement {}
        customElements.define(generateElementName(), A);
        const a = new A();
        container.appendChild(a);
        await a.updateComplete;
        assert.equal(warnings.length, 1);
        assert.include(warnings[0], 'platform-support');
        // should be generated once only
        class B extends UpdatingElement {}
        customElements.define(generateElementName(), B);
        const b = new B();
        container.appendChild(b);
        await b.updateComplete;
        assert.equal(warnings.length, 1);
        assert.include(warnings[0], 'platform-support');
      }
    );

    test('warns when `static render` is implemented', () => {
      class A extends UpdatingElement {
        static render() {}
      }
      customElements.define(generateElementName(), A);
      new A();
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'render');
    });

    test('warns on first instance only', () => {
      class A extends UpdatingElement {
        static render() {}
      }
      customElements.define(generateElementName(), A);
      new A();
      new A();
      new A();
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'render');
    });

    test('warns when `static getStyles` is implemented', () => {
      class A extends UpdatingElement {
        static getStyles() {}
      }
      customElements.define(generateElementName(), A);
      new A();
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'getStyles');
    });

    test('warns when `adoptStyles` is implemented', () => {
      class A extends UpdatingElement {
        adoptStyles() {}
      }
      customElements.define(generateElementName(), A);
      new A();
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'adoptStyles');
    });

    test('warns when `initialize` is implemented', () => {
      class A extends UpdatingElement {
        initialize() {}
      }
      customElements.define(generateElementName(), A);
      new A();
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'initialize');
    });

    test('warns when `requestUpdateInternal` is implemented', () => {
      class A extends UpdatingElement {
        requestUpdateInternal() {}
      }
      customElements.define(generateElementName(), A);
      new A();
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'requestUpdateInternal');
    });

    test('warns when `toAttribute` returns undefined', async () => {
      class A extends UpdatingElement {
        static properties = {
          foo: {converter: {toAttribute: () => undefined}, reflect: true},
        };

        foo = 'hi';
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'undefined');
    });

    test('warns when updating properties are shadowed', async () => {
      class A extends UpdatingElement {
        static properties = {
          fooProp: {},
        };

        constructor() {
          super();
          // Simulates a class field.
          Object.defineProperty(this, 'fooProp', {
            value: 'foo',
            writable: false,
            enumerable: false,
            configurable: true,
          });
        }
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'fooProp');
      assert.include(warnings[0], 'class field');
    });

    test('warns when awaiting `requestUpdate`', async () => {
      class A extends UpdatingElement {}
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.requestUpdate();
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'requestUpdate');
      assert.include(warnings[0], 'Promise');
    });

    test('warns when update triggers another update if `strictWarnings` is set', async () => {
      class A extends UpdatingElement {
        static strictWarnings = true;
        shouldUpdateAgain = false;
        updated() {
          if (this.shouldUpdateAgain) {
            this.shouldUpdateAgain = false;
            this.requestUpdate();
          }
        }
      }
      customElements.define(generateElementName(), A);
      const a = new A();
      container.appendChild(a);
      await a.updateComplete;
      assert.equal(warnings.length, 0);
      a.shouldUpdateAgain = true;
      a.requestUpdate();
      await a.updateComplete;
      assert.equal(warnings.length, 1);
      assert.include(warnings[0], 'update');
      assert.include(warnings[0], 'pending');
      warnings = [];
      a.requestUpdate();
      await a.updateComplete;
      assert.equal(warnings.length, 0);
      a.shouldUpdateAgain = true;
      (a.constructor as typeof A).strictWarnings = false;
      a.requestUpdate();
      await a.updateComplete;
      assert.equal(warnings.length, 0);
    });
  });
}