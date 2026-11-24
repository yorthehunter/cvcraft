// Builds each variant's .docx next to its page: /<variant>/<name>-resume-<variant>.docx
import type { APIRoute, GetStaticPaths } from "astro";
import { loadLibrary, publishedVariants, resolveVariant, type Resume } from "../../lib/resume";
import { renderDocx } from "../../../templates/single-column/docx";

export const getStaticPaths = (() => {
  const lib = loadLibrary();
  return publishedVariants(import.meta.env.DEV).map((variant) => {
    const resume = resolveVariant(lib, variant);
    return { params: { variant: variant.id, docx: resume.files.docx }, props: { resume } };
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const body = await renderDocx((props as { resume: Resume }).resume);
  return new Response(body, {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  });
};
