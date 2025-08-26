import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminTranslation } from "@/hooks/use-language";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export function TranslationManager() {
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { t } = useAdminTranslation();

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const response = await fetch('/api/translations/export', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `translations_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t("translationManagement.exportSuccess"),
        description: t("translationManagement.translationsExported"),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t("translationManagement.exportError"),
        description: t("translationManagement.exportFailed"),
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: t("translationManagement.invalidFileType"),
          description: t("translationManagement.pleaseSelectExcelFile"),
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: t("translationManagement.noFileSelected"),
        description: t("translationManagement.pleaseSelectFile"),
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/translations/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }
      
      toast({
        title: t("translationManagement.importSuccess"),
        description: t("translationManagement.translationsImported").replace('{count}', result.importedRows),
      });
      
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t("translationManagement.importError"),
        description: error.message || t("translationManagement.importFailed"),
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("translationManagement.translationManagement")}</h2>
        <p className="text-muted-foreground">
          {t("translationManagement.manageAllTranslations")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t("translationManagement.exportTranslations")}
            </CardTitle>
            <CardDescription>
              {t("translationManagement.downloadAllTranslations")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t("translationManagement.exportInfo")}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleExport} 
              disabled={exporting}
              className="w-full"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exporting ? t("translationManagement.exporting") : t("translationManagement.exportToExcel")}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("translationManagement.importTranslations")}
            </CardTitle>
            <CardDescription>
              {t("translationManagement.uploadTranslationsFile")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("translationManagement.importWarning")}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="file-input">{t("translationManagement.selectFile")}</Label>
              <Input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </div>
            
            {selectedFile && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {t("translationManagement.fileSelected")}: {selectedFile.name}
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleImport} 
              disabled={uploading || !selectedFile}
              className="w-full"
              variant={selectedFile ? "default" : "secondary"}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? t("translationManagement.importing") : t("translationManagement.importFile")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("translationManagement.instructions")}</CardTitle>
          <CardDescription>
            {t("translationManagement.howToUseTranslationManager")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t("translationManagement.step1Export")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("translationManagement.step1Description")}
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">{t("translationManagement.step2Edit")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("translationManagement.step2Description")}
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">{t("translationManagement.step3Import")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("translationManagement.step3Description")}
            </p>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t("translationManagement.important")}:</strong> {t("translationManagement.russianFieldsRequired")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}