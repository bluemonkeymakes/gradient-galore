import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("palettes", "routes/palettes.tsx"),
  route("palettes/create", "routes/palette-create.tsx"),
  route("palettes/:id", "routes/palette-editor.tsx"),
  route("gallery", "routes/gallery.tsx"),
  route("gallery/:id", "routes/gallery.$id.tsx"),
  route("about", "routes/about.tsx"),
  route("api/publish", "routes/api.publish.tsx"),
] satisfies RouteConfig;
