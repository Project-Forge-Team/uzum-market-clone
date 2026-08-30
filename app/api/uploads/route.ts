import { assertCsrf, requireUser } from "@/lib/server/auth";
import { saveUpload } from "@/lib/server/actions";
import { fail, json } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ detail: "Файл не получен (поле file)" }, { status: 400 });
    }
    const url = await saveUpload(file);
    return json({ url, name: file.name }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
