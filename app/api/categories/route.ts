import { listCategories } from "@/lib/server/catalog";
import { fail, json } from "@/lib/server/http";

export async function GET() {
  try {
    const results = listCategories();
    return json({
      count: results.length,
      page: 1,
      page_size: results.length,
      total_pages: 1,
      next: false,
      previous: false,
      results,
    });
  } catch (err) {
    return fail(err);
  }
}
