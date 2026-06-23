import { createClient } from "@/lib/supabase/client";

export const RONYX_STORAGE_BUCKETS = {
  TICKETS: "ronyx-tickets",
  DOCUMENTS: "ronyx-documents",
  DRIVER_FILES: "ronyx-driver-files",
  COMPANY_LOGO: "ronyx-branding",
} as const;

const supabase = createClient();

export async function initializeRonyxStorage() {
  const buckets = Object.values(RONYX_STORAGE_BUCKETS);

  for (const bucket of buckets) {
    try {
      const { error } = await supabase.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 52428800,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "application/pdf",
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
      });

      if (error && error.message !== "Bucket already exists") {
        console.error(`Error creating bucket ${bucket}:`, error);
      } else {
        console.log(`Bucket ${bucket} ready`);
      }
    } catch (error) {
      console.error(`Error with bucket ${bucket}:`, error);
    }
  }
}

export async function uploadTicketImage(file: File, driverId: string) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${driverId}_${Date.now()}.${fileExt}`;
  const filePath = `tickets/${fileName}`;

  const { error } = await supabase.storage.from(RONYX_STORAGE_BUCKETS.TICKETS).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(RONYX_STORAGE_BUCKETS.TICKETS).getPublicUrl(filePath);

  return {
    path: filePath,
    url: data.publicUrl,
    fileName,
  };
}

export async function uploadDriverDocument(file: File, driverId: string, documentType: string) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${driverId}_${documentType}_${Date.now()}.${fileExt}`;
  const filePath = `documents/${documentType}/${fileName}`;

  const { error } = await supabase.storage.from(RONYX_STORAGE_BUCKETS.DRIVER_FILES).upload(filePath, file, {
    cacheControl: "86400",
    upsert: false,
  });

  if (error) throw error;

  return {
    path: filePath,
    fileName,
    documentType,
  };
}
