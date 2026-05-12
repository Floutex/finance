"use client"

import * as React from "react"
import { Image as ImageIcon, Paperclip, X } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"

type ReceiptUploadProps = {
  value: File | null
  onChange: (file: File | null) => void
  /** Show a "current attachment" link if no new file is staged. */
  existingUrl?: string | null
  /** Accept hint for the file input. */
  accept?: string
  className?: string
}

/**
 * Compact dropzone-like control for attaching a receipt to a transaction form.
 * Accepts drag-and-drop, click-to-pick, and shows the staged filename. If the
 * transaction already has a saved receipt URL, it's linked below as a fallback
 * preview while no new file is selected.
 */
export function ReceiptUpload({
  value,
  onChange,
  existingUrl,
  accept = "image/*,application/pdf",
  className,
}: ReceiptUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)

  const handlePick = () => inputRef.current?.click()

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onChange(files[0])
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onClick={handlePick}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-background/40 px-3 py-3 text-sm transition-colors hover:bg-accent/40",
          dragOver && "border-primary bg-accent"
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handlePick()
          }
        }}
      >
        <ImageIcon className="size-4 text-muted-foreground" />
        {value ? (
          <span className="flex-1 truncate">{value.name}</span>
        ) : (
          <span className="flex-1 text-muted-foreground">
            Anexar imagem ou PDF — clique ou arraste
          </span>
        )}
        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
            aria-label="Remover anexo"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {!value && existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          <Paperclip className="size-3" />
          Ver comprovante atual
        </a>
      )}
    </div>
  )
}
