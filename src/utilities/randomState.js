/**
 * Generate a cryptographic random state.
 * @see https://medium.com/@dazcyril/generating-cryptographic-random-state-in-javascript-in-the-browser-c538b3daae50
 * @return {string}
 */
export default function() {
  const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let array = new Uint8Array(40);
  window.crypto.getRandomValues(array);
  array = array.map(x => validChars.charCodeAt(x % validChars.length));
  return String.fromCharCode.apply(null, array);
}