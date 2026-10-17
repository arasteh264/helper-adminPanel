"use client";

import { type DragEvent, useEffect, useState } from "react";

import Image from "next/image";

import { cn } from "cn";
import { FileImage, FileUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FileUploadProps = {
  id: string;
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  description?: string;
  maxFiles?: number;
  maxFileSizeBytes?: number;
  disabled?: boolean;
  className?: string;
};

function matchesAccept(file: File, accept: string) {
  const acceptedTypes = accept
    .split(",")
    .map((type) => type.trim().toLocaleLowerCase())
    .filter(Boolean);

  if (!acceptedTypes.length) return true;

  const fileName = file.name.toLocaleLowerCase();
  return acceptedTypes.some((type) => {
    if (type.startsWith(".")) return fileName.endsWith(type);
    if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -1));
    return file.type.toLocaleLowerCase() === type;
  });
}

function formatFileSize(size: number) {
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formattedValue = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  }).format(value);

  return `${formattedValue} ${units[unitIndex]}`;
}

function FilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (!file.type.startsWith("image/")) {
      setPreviewUrl(undefined);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt={`پیش‌نمایش ${file.name}`}
          width={48}
          height={48}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        <FileImage className="size-5" aria-hidden="true" />
      )}
    </div>
  );
}

export function FileUpload({
  id,
  label,
  files,
  onFilesChange,
  accept,
  description,
  maxFiles = 1,
  maxFileSizeBytes,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState("");
  const inputId = `${id}-input`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  function addFiles(selectedFiles: FileList | File[]) {
    setValidationError("");
    if (disabled) return;

    const incomingFiles = Array.from(selectedFiles);
    const currentFiles = maxFiles === 1 ? [] : files;
    const nextFiles = [...currentFiles];
    const errors: string[] = [];

    for (const file of incomingFiles) {
      if (accept && !matchesAccept(file, accept)) {
        errors.push(`نوع فایل «${file.name}» پشتیبانی نمی‌شود.`);
        continue;
      }
      if (maxFileSizeBytes !== undefined && file.size > maxFileSizeBytes) {
        errors.push(`حجم فایل «${file.name}» بیشتر از ${formatFileSize(maxFileSizeBytes)} است.`);
        continue;
      }
      if (
        nextFiles.some(
          (existingFile) =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified,
        )
      ) {
        errors.push(`فایل «${file.name}» قبلاً انتخاب شده است.`);
        continue;
      }
      if (nextFiles.length >= maxFiles) {
        errors.push(`حداکثر ${new Intl.NumberFormat("fa-IR").format(maxFiles)} فایل می‌توانید انتخاب کنید.`);
        continue;
      }

      nextFiles.push(file);
    }

    if (nextFiles.length !== currentFiles.length) onFilesChange(nextFiles);
    if (errors.length) setValidationError(errors.join(" "));
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
    setValidationError("");
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  const acceptedLabel = accept ? `فرمت‌های مجاز: ${accept}` : "همهٔ فرمت‌های فایل";
  const maximumSizeLabel = maxFileSizeBytes ? `حداکثر حجم هر فایل: ${formatFileSize(maxFileSizeBytes)}` : "";

  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={inputId} className="font-medium text-sm">
        {label}
      </label>
      <Input
        id={inputId}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        disabled={disabled}
        aria-describedby={[description ? descriptionId : null, validationError ? errorId : null]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={Boolean(validationError)}
        className="peer sr-only"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
          "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30",
          isDragging ? "border-primary bg-primary/5" : "hover:bg-muted/50",
          disabled && "pointer-events-none opacity-50",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <FileUp className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium text-sm">برای انتخاب کلیک کنید یا فایل را اینجا بکشید</span>
        <span className="text-muted-foreground text-xs">
          {[acceptedLabel, maximumSizeLabel].filter(Boolean).join(" · ")}
        </span>
      </label>
      {description ? (
        <p id={descriptionId} className="text-muted-foreground text-xs">
          {description}
        </p>
      ) : null}
      {validationError ? (
        <p id={errorId} className="text-destructive text-xs" role="alert">
          {validationError}
        </p>
      ) : null}
      {files.length ? (
        <ul className="grid gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-2"
            >
              <FilePreview file={file} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm" title={file.name}>
                  {file.name}
                </p>
                <p className="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled}
                aria-label={`حذف فایل ${file.name}`}
                onClick={() => removeFile(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
