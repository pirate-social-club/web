/// <reference types="vite/client" />

declare module "virtual:file-routes" {
  const routes: any;
  export default routes;
  export const pageRoutes: any[];
}

declare module "virtual:solid-manifest" {
  const manifest: any;
  export default manifest;
}

declare module "virtual:solid-ssr-handler" {
  export function handleRequest(request: Request): Promise<any>;
}
