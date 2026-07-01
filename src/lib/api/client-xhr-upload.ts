// XMLHttpRequest-backed upload that returns a standard `Response`, so the API
// client's auth/refresh/error handling (which all operates on the Response) is
// reused verbatim. Unlike `fetch`, XHR exposes `upload.onprogress`, which is the
// only way to report real byte-progress for an upload in the browser.

export type UploadProgressCallback = (fraction: number) => void;

function parseHeaders(raw: string): Headers {
  const headers = new Headers();
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      headers.append(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
    }
  }
  return headers;
}

export function xhrUploadFetch(
  url: string,
  init: { method?: string; headers: Headers; body: BodyInit | null | undefined },
  onUploadProgress: UploadProgressCallback,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "POST", url, true);

    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    init.headers.forEach((value, key) => {
      // The browser must set Content-Type for FormData so the multipart boundary
      // is included; setting it manually would corrupt the request.
      if (isFormData && key.toLowerCase() === "content-type") return;
      xhr.setRequestHeader(key, value);
    });

    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onUploadProgress(Math.min(1, Math.max(0, event.loaded / event.total)));
      }
    };
    xhr.onload = () => {
      // status 0 means the request never completed at the HTTP layer; surface it as
      // a network error rather than constructing an invalid Response.
      if (xhr.status === 0) {
        reject(new TypeError("Network request failed"));
        return;
      }
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders()),
        }),
      );
    };
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"));
    xhr.onabort = () => reject(new DOMException("The upload was aborted", "AbortError"));

    xhr.send((init.body ?? null) as XMLHttpRequestBodyInit | null);
  });
}
