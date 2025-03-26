"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DownloadIcon, ReloadIcon } from "@radix-ui/react-icons"
import { useWorkout } from "@/contexts/workout-context"
import { useToast } from "@/components/ui/use-toast"
import type { WorkoutPlanType, WorkoutProgressType, WorkoutCheckInType } from "@/contexts/workout-context"
import { Dropzone } from "@/components/ui/dropzone"

interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface FileWithPath extends FileData {
  path?: string;
}

interface ImportedWorkoutData {
  workoutPlans: WorkoutPlanType[];
  progress: WorkoutProgressType[];
  checkIns: WorkoutCheckInType[];
}

export function WorkoutDataTransfer() {
  const { workoutPlans, userProgress, userCheckIns, saveWorkoutPlan, logWorkoutProgress, logCheckIn } = useWorkout()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = async (files: FileWithPath[]) => {
    if (files.length === 0) {
      setError("No file selected")
      return
    }

    const file = files[0]
    if (file.type !== "application/json") {
      setError("Please upload a JSON file")
      return
    }

    try {
      setIsImporting(true)
      const fileContent = await readFileContent(file)
      const data = JSON.parse(fileContent) as ImportedWorkoutData

      // Validate the imported data
      if (!validateImportedData(data)) {
        setError("Invalid data format")
        return
      }

      // Import the data
      await importWorkoutData(data)
      
      toast({
        title: "Success",
        description: "Data imported successfully",
      })
    } catch (err) {
      console.error("Error importing data:", err)
      setError("Failed to import data")
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)

      const exportData: ImportedWorkoutData = {
        workoutPlans,
        progress: userProgress,
        checkIns: userCheckIns,
      }

      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `workout-data-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Data exported successfully",
      })
    } catch (err) {
      console.error("Error exporting data:", err)
      setError("Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  const readFileContent = (file: FileWithPath): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string)
        } else {
          reject(new Error("Failed to read file"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file as unknown as Blob)
    })
  }

  const validateImportedData = (data: ImportedWorkoutData): boolean => {
    // Check if the data has the required properties
    if (!data.workoutPlans || !Array.isArray(data.workoutPlans)) {
      return false
    }

    // Validate each workout plan
    for (const plan of data.workoutPlans) {
      if (!plan.title || !plan.description || !plan.exercises || !Array.isArray(plan.exercises)) {
        return false
      }
    }

    return true
  }

  const importWorkoutData = async (data: ImportedWorkoutData) => {
    try {
      // Import workout plans
      for (const plan of data.workoutPlans) {
        await saveWorkoutPlan(plan)
      }

      // Import progress data
      for (const progress of data.progress) {
        await logWorkoutProgress(progress)
      }

      // Import check-in data
      for (const checkIn of data.checkIns) {
        await logCheckIn(checkIn)
      }

      toast({
        title: "Data imported successfully",
        description: `Imported ${data.workoutPlans.length} workout plans`,
      })
    } catch (err) {
      console.error("Error importing data:", err)
      throw err // Re-throw to be caught by the parent try-catch
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download your workout data as a JSON file</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
            <CardDescription>Upload a JSON file to import workout data</CardDescription>
          </CardHeader>
          <CardContent>
            <Dropzone
              onDrop={handleDrop}
              onError={setError}
              accept={{
                "application/json": [".json"],
              }}
              maxSize={10 * 1024 * 1024} // 10MB
            >
              {isImporting && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <ReloadIcon className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </Dropzone>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

