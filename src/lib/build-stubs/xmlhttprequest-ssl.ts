type XmlHttpRequestConstructor = typeof XMLHttpRequest;

class MissingXmlHttpRequest {
  constructor() {
    throw new Error("XMLHttpRequest is not available in this environment.");
  }
}

const BrowserXmlHttpRequest = (
  typeof XMLHttpRequest === "undefined"
    ? MissingXmlHttpRequest
    : XMLHttpRequest
) as XmlHttpRequestConstructor;

export default BrowserXmlHttpRequest;
export { BrowserXmlHttpRequest as XMLHttpRequest };
