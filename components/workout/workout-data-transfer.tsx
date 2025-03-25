"use client"

import { useState, useRef } from "react"
import { useDropzone } from "react-dropzone"
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Table,
  FileCheck,
  AlertCircle,
  X,
  Info,
  Loader2,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

// Mock workout plan data for preview
const mockWorkoutPlan = {
  name: "Upper Body Strength",
  weeks: 4,
  daysPerWeek: 3,
  exercises: [
    { name: "Bench Press", sets: 4, reps: "8-10", weight: "135 lbs" },
    { name: "Pull-ups", sets: 3, reps: "8-12", weight: "Bodyweight" },
    { name: "Overhead Press", sets: 3, reps: "8-10", weight: "95 lbs" },
    { name: "Barbell Rows", sets: 3, reps: "10-12", weight: "115 lbs" },
    { name: "Tricep Dips", sets: 3, reps: "10-15", weight: "Bodyweight" },
  ],
}

// Format options with descriptions
const exportFormats = [
  {
    id: "xlsx",
    name: "Excel (XLSX)",
    icon: FileSpreadsheet,
    description: "Export as Excel spreadsheet. Best for editing and formatting your workout plan.",
  },
  {
    id: "pdf",
    name: "PDF",
    icon: FileText,
    description: "Export as PDF document. Best for printing or sharing a finalized workout plan.",
  },
  {
    id: "csv",
    name: "CSV",
    icon: Table,
    description: "Export as CSV file. Best for importing into other fitness apps or data analysis tools.",
  },
  {
    id: "sheets",
    name: "Google Sheets",
    icon: ExternalLink,
    description: "Export directly to Google Sheets. Best for cloud storage and collaborative editing.",
  },
]

export function WorkoutDataTransfer() {
  const [activeTab, setActiveTab] = useState("export")
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState<"idle" | "processing" | "success" | "error">("idle")

  const [importedFile, setImportedFile] = useState<File | null>(null)
  const [importPreviewData, setImportPreviewData] = useState<any | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<
    "idle" | "processing" | "validating" | "preview" | "success" | "error"
  >("idle")
  const [importError, setImportError] = useState<string | null>(null)

  const { toast } = useToast()
  const cancelRef = useRef<boolean>(false)

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0])
      }
    },
  })

  // Handle file upload
  const handleFileUpload = (file: File) => {
    setImportedFile(file)
    setImportStatus("validating")
    setImportProgress(0)
    setImportError(null)

    // Simulate file validation
    const validationTimer = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(validationTimer)

          // Simulate successful validation
          if (Math.random() > 0.2) {
            // 80% chance of success
            setImportStatus("preview")
            setImportPreviewData(mockWorkoutPlan)
          } else {
            setImportStatus("error")
            setImportError("Invalid file format or corrupted data. Please try another file.")
          }
          return 100
        }
        return prev + 10
      })
    }, 100)
  }

  // Handle export
  const handleExport = (format: string) => {
    if (exportStatus === "processing") return

    setExportFormat(format)
    setExportStatus("processing")
    setExportProgress(0)
    cancelRef.current = false

    // Simulate export process
    const interval = setInterval(() => {
      if (cancelRef.current) {
        clearInterval(interval)
        setExportStatus("idle")
        return
      }

      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setExportStatus("success")

          toast({
            title: "Export Completed",
            description: `Your workout plan has been exported as ${format.toUpperCase()}`,
            variant: "default",
          })

          // Reset after 3 seconds
          setTimeout(() => {
            setExportStatus("idle")
            setExportProgress(0)
          }, 3000)

          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  // Handle import confirmation
  const handleImportConfirm = () => {
    if (importStatus !== "preview") return

    setImportStatus("processing")
    setImportProgress(0)

    // Simulate import process
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setImportStatus("success")

          toast({
            title: "Import Successful",
            description: "Your workout plan has been imported successfully",
            variant: "default",
          })

          // Reset after 3 seconds
          setTimeout(() => {
            setImportStatus("idle")
            setImportProgress(0)
            setImportedFile(null)
            setImportPreviewData(null)
          }, 3000)

          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  // Cancel export
  const handleCancelExport = () => {
    cancelRef.current = true
  }

  // Reset import
  const handleResetImport = () => {
    setImportStatus("idle")
    setImportProgress(0)
    setImportedFile(null)
    setImportPreviewData(null)
    setImportError(null)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-[#121212] border-border/40">
      <CardHeader>
        <CardTitle className="text-2xl">Workout Plan Data Transfer</CardTitle>
        <CardDescription>
          Export your workout plans to different formats or import plans from external sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <TooltipProvider>
                {exportFormats.map((format) => (
                  <Tooltip key={format.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={exportFormat === format.id && exportStatus !== "idle" ? "default" : "outline"}
                        className={`h-auto w-full justify-start gap-3 p-4 ${
                          exportFormat === format.id && exportStatus !== "idle"
                            ? "bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
                            : ""
                        }`}
                        onClick={() => handleExport(format.id)}
                        disabled={exportStatus === "processing"}
                      >
                        <format.icon className="h-5 w-5 shrink-0" />
                        <div className="flex flex-col items-start">
                          <span>{format.name}</span>
                          <span className="text-xs text-muted-foreground">{format.id.toUpperCase()} Format</span>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{format.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            {exportStatus !== "idle" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {exportStatus === "processing"
                        ? "Exporting..."
                        : exportStatus === "success"
                          ? "Export Complete"
                          : "Export Failed"}
                    </span>
                    {exportStatus === "processing" && (
                      <Badge variant="outline" className="text-xs">
                        {exportFormat?.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  {exportStatus === "processing" && (
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={handleCancelExport}>
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  )}
                </div>

                <Progress value={exportProgress} className="h-2" />

                {exportStatus === "success" && (
                  <Alert variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                    <FileCheck className="h-4 w-4" />
                    <AlertTitle>Export Successful</AlertTitle>
                    <AlertDescription>
                      Your workout plan has been exported as {exportFormat?.toUpperCase()}
                    </AlertDescription>
                  </Alert>
                )}

                {exportStatus === "error" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Export Failed</AlertTitle>
                    <AlertDescription>
                      There was an error exporting your workout plan. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            {importStatus === "idle" && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-[#3E9EFF] bg-[#3E9EFF]/5" : "border-border"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-muted/30 p-3">
                    <Upload className="h-6 w-6 text-[#3E9EFF]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">
                      {isDragActive ? "Drop the file here" : "Upload Workout Plan"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Drag and drop your file here, or click to browse</p>
                    <p className="text-xs text-muted-foreground">Supports XLSX, XLS, CSV, and PDF formats</p>
                  </div>
                </div>
              </div>
            )}

            {(importStatus === "validating" || importStatus === "processing") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {importStatus === "validating" ? "Validating file..." : "Importing..."}
                    </span>
                    {importedFile && (
                      <Badge variant="outline" className="text-xs">
                        {importedFile.name}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={handleResetImport}>
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>

                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {importStatus === "error" && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Import Failed</AlertTitle>
                  <AlertDescription>
                    {importError || "There was an error importing your workout plan. Please try again."}
                  </AlertDescription>
                </Alert>

                <Button variant="outline" className="w-full" onClick={handleResetImport}>
                  Try Again
                </Button>
              </div>
            )}

            {importStatus === "preview" && importPreviewData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Preview Import</h3>
                  <Badge variant="outline">{importedFile?.name}</Badge>
                </div>

                <Alert variant="default" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Review Before Importing</AlertTitle>
                  <AlertDescription>Please review the workout plan data before confirming the import.</AlertDescription>
                </Alert>

                <Card className="border border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{importPreviewData.name}</CardTitle>
                    <CardDescription>
                      {importPreviewData.weeks} weeks • {importPreviewData.daysPerWeek} days per week
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                      <UITable>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exercise</TableHead>
                            <TableHead className="text-center">Sets</TableHead>
                            <TableHead className="text-center">Reps</TableHead>
                            <TableHead className="text-right">Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreviewData.exercises.map((exercise: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{exercise.name}</TableCell>
                              <TableCell className="text-center">{exercise.sets}</TableCell>
                              <TableCell className="text-center">{exercise.reps}</TableCell>
                              <TableCell className="text-right">{exercise.weight}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </UITable>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="default"
                    className="flex-1 bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
                    onClick={handleImportConfirm}
                  >
                    Confirm Import
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleResetImport}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {importStatus === "success" && (
              <div className="space-y-4">
                <Alert variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <FileCheck className="h-4 w-4" />
                  <AlertTitle>Import Successful</AlertTitle>
                  <AlertDescription>Your workout plan has been imported successfully.</AlertDescription>
                </Alert>

                <Progress value={importProgress} className="h-2" />

                <Button variant="outline" className="w-full" onClick={handleResetImport}>
                  Import Another Plan
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <p className="text-sm text-muted-foreground">
          {activeTab === "export"
            ? "Export your workout plans to share or backup"
            : "Import workout plans from external sources"}
        </p>
        {activeTab === "export" && exportStatus === "processing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

