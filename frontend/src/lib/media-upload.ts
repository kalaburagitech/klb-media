import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type UploadResult = {
  mediaId: Id<"media">;
  fileName: string;
  status: "processing" | "ready" | "failed";
};

export function useR2Upload() {
  const initUpload = useMutation(api.media.initUpload);
  const completeUpload = useMutation(api.media.completeUpload);
  const getPresignedUploadUrl = useAction(api.r2Actions.getPresignedUploadUrl);

  const uploadFile = async (file: File, userId?: string): Promise<UploadResult> => {
    const init = await initUpload({
      fileName: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      userId,
    });

    const presigned = await getPresignedUploadUrl({
      key: init.r2Key,
      contentType: file.type || "application/octet-stream",
    });

    // Upload via Next.js proxy to avoid R2 CORS issues from the browser
    const uploadResponse = await fetch("/api/r2-upload", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Upload-Url": presigned.uploadUrl,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.json().catch(() => ({}));
      const message =
        typeof errorBody.error === "string"
          ? errorBody.error
          : `Upload failed: ${uploadResponse.status}`;
      throw new Error(message);
    }

    await completeUpload({
      mediaId: init.mediaId,
      size: file.size,
    });

    return {
      mediaId: init.mediaId,
      fileName: file.name,
      status: "processing",
    };
  };

  return { uploadFile };
}
