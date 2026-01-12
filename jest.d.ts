import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(...classNames: string[]): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveFocus(): R;
      toBeChecked(): R;
      toBeRequired(): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(html: string): R;
      toBeEmpty(): R;
      toBeEmptyDOMElement(): R;
      toHaveFormValues(expectedValues: { [key: string]: any }): R;
      toHaveStyle(css: string | object): R;
      toHaveValue(value: string | string[] | number): R;
    }
  }
} 