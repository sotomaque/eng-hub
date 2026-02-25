"use client";

import { generateReactHelpers, generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

export const UploadButton: ReturnType<typeof generateUploadButton<OurFileRouter>> =
  generateUploadButton<OurFileRouter>();

export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
