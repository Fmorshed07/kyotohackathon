import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ImageUploadFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  hint?: string;
  aspectClassName?: string;
  disabled?: boolean;
  allowUrlPaste?: boolean;
};

export function ImageUploadField({
  label,
  value,
  onChange,
  onUpload,
  hint = "JPG, PNG, WebP, or GIF · up to 5 MB",
  aspectClassName = "aspect-video",
  disabled = false,
  allowUrlPaste = true,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File | null | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    setError(null);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    void processFile(event.dataTransfer.files?.[0]);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void processFile(event.target.files?.[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="dash-field-label">{label}</label>
        {value.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onChange("")}
            disabled={uploading || disabled}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Remove
          </Button>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed transition",
          aspectClassName,
          dragOver ? "border-primary bg-primary/10" : "border-white/15 bg-black/20",
          (uploading || disabled) && "pointer-events-none opacity-70"
        )}
      >
        {value.trim() ? (
          <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop an image here</p>
            <p className="text-xs text-muted-foreground/80">{hint}</p>
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className="gap-1.5"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {value.trim() ? "Replace image" : "Upload image"}
        </Button>
        {allowUrlPaste ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUrl((v) => !v)}
            disabled={uploading || disabled}
          >
            {showUrl ? "Hide URL" : "Paste URL"}
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled}
      />

      {allowUrlPaste && showUrl ? (
        <Input
          type="url"
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={uploading || disabled}
        />
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type GalleryUploadFieldProps = {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  onUpload: (file: File) => Promise<string>;
  hint?: string;
  disabled?: boolean;
  maxItems?: number;
};

export function GalleryUploadField({
  label,
  value,
  onChange,
  onUpload,
  hint = "Upload multiple photos. Drag & drop or pick files.",
  disabled = false,
  maxItems = 24,
}: GalleryUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = async (files: FileList | File[] | null | undefined) => {
    if (!files || files.length === 0 || disabled) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files");
      return;
    }
    const remaining = Math.max(0, maxItems - value.length);
    if (remaining === 0) {
      setError(`Gallery limit is ${maxItems} images.`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of list.slice(0, remaining)) {
        uploaded.push(await onUpload(file));
      }
      onChange([...value, ...uploaded]);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="dash-field-label">{label}</label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void processFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed p-4 transition",
          dragOver ? "border-primary bg-primary/10" : "border-white/15 bg-black/20"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={uploading || disabled}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload photos
          </Button>
          <span className="text-xs text-muted-foreground">
            {value.length}/{maxItems} images
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => void processFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30"
            >
              <img src={url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                disabled={disabled || uploading}
                aria-label={`Remove gallery image ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
