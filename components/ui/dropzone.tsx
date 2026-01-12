"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"
import { UploadIcon } from "@radix-ui/react-icons"

interface FileData {
  name: string
  size: number
  type: string
  lastModified: number
}

interface FileWithPath extends FileData {
  path?: string
}

interface DropzoneProps {
  onDrop: (files: FileWithPath[]) => void
  onError?: (error: string) => void
  maxSize?: number
  accept?: Record<string, string[]>
  className?: string
  children?: React.ReactNode
}

export function Dropzone({
  onDrop,
  onError,
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = {
    "application/json": [".json"],
  },
  className,
  children,
}: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const files = acceptedFiles as FileWithPath[]
      onDrop(files)
    },
    onDropRejected: (fileRejections) => {
      if (onError) {
        const error = fileRejections[0]?.errors[0]?.message || "File upload failed"
        onError(error)
      }
    },
    maxSize,
    accept,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 px-4 py-8 text-center transition-colors hover:bg-muted/80",
        isDragActive && "border-primary/50 bg-muted/80",
        className
      )}
    >
      <input {...getInputProps()} />
      {children || (
        <>
          <UploadIcon className="mb-4 h-8 w-8 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {isDragActive ? "Drop the file here" : "Drag & drop file here"}
            </p>
            <p className="text-xs text-muted-foreground/75">
              or click to select file
            </p>
          </div>
        </>
      )}
    </div>
  )
} 