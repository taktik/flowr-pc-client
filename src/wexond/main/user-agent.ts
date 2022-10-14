import { app } from 'electron';

const REMOVE_CHROME_COMPONENT_PATTERNS = [
  /^https:\/\/accounts\.google\.com(\/|$)/,
];

const CHROME_COMPONENT_PATTERN = / Chrome\\?.([^\s]+)/g;

const COMPONENTS_TO_REMOVE = [
  / Electron\\?.([^\s]+)/g,
  ` ${app.name}/${app.getVersion()}`,
];

const urlMatchesPatterns = (url: string, patterns: RegExp[]) =>
  patterns.some((pattern) => url.match(pattern));

/**
 * Checks if a given url is suitable for removal of Chrome
 * component from the user agent string.
 * @param url
 */
const shouldRemoveChromeString = (url: string) =>
  urlMatchesPatterns(url, REMOVE_CHROME_COMPONENT_PATTERNS)

export const getUserAgentForURL = (userAgent: string, url: string): string => {
  const componentsToRemove = [...COMPONENTS_TO_REMOVE]

  // For accounts.google.com, we remove Chrome/*.* component
  // from the user agent, to fix compatibility issues on Google Sign In.
  // WATCH: https://developers.googleblog.com/2020/08/guidance-for-our-effort-to-block-less-secure-browser-and-apps.html
  if (shouldRemoveChromeString(url)) {
    componentsToRemove.push(CHROME_COMPONENT_PATTERN)
  }

  // Replace the components.
  return componentsToRemove.reduce<string>((agent, component) => agent.replace(component, ''), userAgent)
};