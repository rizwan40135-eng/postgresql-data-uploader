import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { presignUpload, saveFile, listFiles, presignDownload, deleteFile } from "./files.server";

const id = z.string().uuid();

export const getUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ customerId: id, fileName: z.string().min(1).max(200), mimeType: z.string().max(100) }).parse(d))
  .handler(({ data }) => presignUpload(data.customerId, data.fileName, data.mimeType || "application/octet-stream"));

export const recordFile = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      customer_id: id,
      file_name: z.string().min(1).max(200),
      s3_key: z.string().min(1).max(500),
      mime_type: z.string().max(100),
      file_size: z.number().int().nonnegative(),
    }).parse(d),
  )
  .handler(({ data }) => saveFile(data));

export const getFiles = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ customerId: id }).parse(d))
  .handler(({ data }) => listFiles(data.customerId));

export const getDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ fileId: id }).parse(d))
  .handler(({ data }) => presignDownload(data.fileId));

export const removeFile = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ fileId: id }).parse(d))
  .handler(({ data }) => deleteFile(data.fileId));
