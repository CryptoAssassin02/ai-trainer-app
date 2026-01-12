/**
 * Conflict Resolution Dialog
 * Phase 2.1.4 - Handle conflicts between local and server data during auto-save
 */

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Clock, User, Server } from 'lucide-react';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localData: any;
  serverData: any;
  onResolve: (choice: 'local' | 'server') => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  localData,
  serverData,
  onResolve,
}: ConflictResolutionDialogProps) {
  
  const handleResolve = (choice: 'local' | 'server') => {
    onResolve(choice);
    onOpenChange(false);
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getDataDifferences = () => {
    const differences: Array<{
      field: string;
      local: any;
      server: any;
      isDifferent: boolean;
    }> = [];

    const allKeys = new Set([
      ...Object.keys(localData || {}),
      ...Object.keys(serverData || {}),
    ]);

    allKeys.forEach(key => {
      const localValue = localData?.[key];
      const serverValue = serverData?.[key];
      const isDifferent = JSON.stringify(localValue) !== JSON.stringify(serverValue);

      if (isDifferent && key !== 'updatedAt' && key !== 'createdAt') {
        differences.push({
          field: key,
          local: localValue,
          server: serverValue,
          isDifferent,
        });
      }
    });

    return differences;
  };

  const differences = getDataDifferences();

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Data Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Your local changes conflict with recent updates from another session. 
            Please choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timestamp comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last modified: {formatTimestamp(new Date())}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Server Version
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last updated: {formatTimestamp(serverData?.updatedAt || serverData?.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Differences breakdown */}
          {differences.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  Field Differences
                  <Badge variant="outline">{differences.length} conflicts</Badge>
                </h4>
                
                <div className="space-y-3">
                  {differences.map((diff) => (
                    <Card key={diff.field} className="border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{formatFieldName(diff.field)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Your Version
                            </div>
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                              {formatValue(diff.local)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Server className="h-3 w-3" />
                              Server Version
                            </div>
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                              {formatValue(diff.server)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Conflict resolution options */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium">Choose Resolution:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-blue-900">Keep Your Changes</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        Overwrite the server with your local changes. This will discard any 
                        updates made in other sessions.
                      </p>
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResolve('local')}
                          className="border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          Use My Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200 bg-amber-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Server className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-amber-900">Use Server Version</h5>
                      <p className="text-sm text-amber-700 mt-1">
                        Discard your changes and use the server version. Your current 
                        changes will be lost.
                      </p>
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResolve('server')}
                          className="border-amber-200 text-amber-700 hover:bg-amber-100"
                        >
                          Use Server Version
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="text-xs text-muted-foreground">
            Tip: You can also manually merge the changes and save again.
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
