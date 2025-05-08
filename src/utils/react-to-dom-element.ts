import type React from 'react';
import { renderToString } from 'react-dom/server';

/**
 * A minimal utility function to convert a React element to a DOM element.
 *
 * This can be used in cases where a React component needs to be rendered to a DOM element,
 * e.g. in the case of the MapLibreRenderer component in the map page.
 *
 * @param reactElement
 * @returns a DOM element representing the React element
 *
 */
export const reactToDomElement = (reactElement: React.ReactElement): HTMLElement => {
  const domElement = document.createElement('div');
  domElement.innerHTML = renderToString(reactElement);
  return domElement;
};
