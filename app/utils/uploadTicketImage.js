import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const uploadTicketImage = async (
  file,
  organization_id,
  ticket_id,
  user_id,
) => {
  if (!file) return { error: "No file provided." };

  const fileExt = file.name.split(".").pop();
  const fileName = `${organization_id}/${ticket_id}.${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from("scale_ticket_images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      metadata: {
        organization_id,
        ticket_id,
        uploaded_by: user_id,
      },
    });

  if (error) {
    console.error("Image upload error:", error);
    return { error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("scale_ticket_images").getPublicUrl(filePath);

  return { url: publicUrl, path: filePath };
};
