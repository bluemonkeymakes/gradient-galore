import { db } from "~/db";
import { gradients, palettes } from "~/db/schema";
import { data } from "react-router";
import type { Route } from "./+types/api.publish";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const category = (formData.get("category") as string) || "gradient";

  if (category === "palette") {
    const name = formData.get("name") as string;
    const baseColor = formData.get("baseColor") as string;
    const shades = formData.get("shades") as string;
    const tags = formData.get("tags") as string;

    if (!name || !baseColor || !shades) {
      return data({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    await db.insert(palettes).values({
      name,
      baseColor,
      shades,
      tags: tags || "",
    });

    return data({ ok: true });
  }

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const state = formData.get("state") as string;
  const tags = formData.get("tags") as string;
  const previewCss = formData.get("previewCss") as string;

  if (!name || !type || !state || !previewCss) {
    return data({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  await db.insert(gradients).values({
    name,
    type,
    state,
    tags: tags || "",
    previewCss,
  });

  return data({ ok: true });
}
