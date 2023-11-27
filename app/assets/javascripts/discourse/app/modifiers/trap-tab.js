import { registerDestructor } from "@ember/destroyable";
import Modifier from "ember-modifier";
import { bind } from "discourse-common/utils/decorators";

const FOCUSABLE_ELEMENTS =
  'details:not(.is-disabled) summary, [autofocus], a, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

export default class TrapTabModifier extends Modifier {
  element = null;

  constructor(owner, args) {
    super(owner, args);
    registerDestructor(this, (instance) => instance.cleanup());
  }

  modify(element, _, { preventScroll, autofocus }) {
    autofocus ??= true;
    this.preventScroll = preventScroll ?? true;
    this.originalElement = element;
    this.element = element.querySelector(".modal-inner-container") || element;
    this.originalElement.addEventListener("keydown", this.trapTab);

    // on first trap we don't allow to focus modal-close
    // and apply manual focus only if we don't have any autofocus element
    const autofocusedElement = this.element.querySelector("[autofocus]");

    if (
      autofocus &&
      (!autofocusedElement || document.activeElement !== autofocusedElement)
    ) {
      // if there's not autofocus, or the activeElement, is not the autofocusable element
      // attempt to focus the first of the focusable elements or just the modal-body
      // to make it possible to scroll with arrow down/up
      (
        autofocusedElement ||
        this.element.querySelector(
          FOCUSABLE_ELEMENTS + ", button:not(.modal-close)"
        ) ||
        this.element.querySelector(".modal-body")
      )?.focus({
        preventScroll: this.preventScroll,
      });
    }
  }

  @bind
  trapTab(event) {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = FOCUSABLE_ELEMENTS + ", button:enabled";
    const firstFocusableElement = this.element.querySelector(focusableElements);
    const focusableContent = this.element.querySelectorAll(focusableElements);

    const lastFocusableElement = focusableContent[focusableContent.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement?.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        event.preventDefault();

        (
          this.element.querySelector(".modal-close") || firstFocusableElement
        )?.focus({ preventScroll: this.preventScroll });
      }
    }
  }

  cleanup() {
    this.originalElement.removeEventListener("keydown", this.trapTab);
  }
}
