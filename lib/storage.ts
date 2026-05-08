import { getSupabaseClient } from "@/lib/supabase"

const BUCKET = "receipts"

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
}

/**
 * Upload a receipt file to the public `receipts` bucket and return its public URL.
 * Path scheme: `<transactionId>/<timestamp>-<filename>` so receipts cluster per transaction.
 */
export async function uploadReceipt(file: File, transactionId: string): Promise<string> {
  const supabase = getSupabaseClient()
  const ts = Date.now()
  const path = `${transactionId}/${ts}-${sanitizeName(file.name || "receipt")}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
