import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, MailWarning, RefreshCw, RotateCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAdminTranslation } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FailedPaymentEmail = {
  id: number;
  orderId: number;
  audience: "admin" | "guest";
  attempts: number;
  diagnostic: "delivery_failed";
};

type FailedPaymentEmailPage = {
  items: FailedPaymentEmail[];
  nextCursor: number | null;
};

const listKey = ["admin", "payment-email-outbox"] as const;

function isConflict(error: unknown) {
  const candidate = error as { code?: string };
  return candidate?.code === "notification_not_failed";
}

export function FailedPaymentEmails({ isRTL }: { isRTL: boolean }) {
  const { t } = useAdminTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<number | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(number | null)[]>([]);

  const pageQuery = useQuery<FailedPaymentEmailPage>({
    queryKey: [...listKey, cursor],
    queryFn: () => apiRequest("GET", `/api/admin/payment-email-outbox${cursor == null ? "" : `?before=${cursor}`}`),
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/payment-email-outbox/${id}/retry`),
    onSuccess: async () => {
      toast({
        title: t("orders.failedPaymentEmails.queuedTitle"),
        description: t("orders.failedPaymentEmails.queuedDescription"),
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: async (error) => {
      toast({
        title: t("orders.failedPaymentEmails.retryErrorTitle"),
        description: isConflict(error)
          ? t("orders.failedPaymentEmails.noLongerFailed")
          : t("orders.failedPaymentEmails.retryErrorDescription"),
        variant: "destructive",
      });
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const rows = pageQuery.data?.items ?? [];
  const goNext = () => {
    if (pageQuery.data?.nextCursor == null) return;
    setCursorHistory((history) => [...history, cursor]);
    setCursor(pageQuery.data.nextCursor);
  };

  const goPrevious = () => {
    if (!cursorHistory.length) return;
    setCursor(cursorHistory[cursorHistory.length - 1]);
    setCursorHistory(cursorHistory.slice(0, -1));
  };

  return (
    <Card dir={isRTL ? "rtl" : "ltr"}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MailWarning className="h-5 w-5" />
            {t("orders.failedPaymentEmails.title")}
          </CardTitle>
          <CardDescription className="mt-1">{t("orders.failedPaymentEmails.description")}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => pageQuery.refetch()}
          disabled={pageQuery.isFetching}
          className="self-start"
        >
          <RefreshCw className={`h-4 w-4 ${pageQuery.isFetching ? "animate-spin" : ""}`} />
          <span className="ms-2">{t("orders.failedPaymentEmails.refresh")}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {pageQuery.isLoading ? (
          <div className="space-y-3" aria-label={t("orders.failedPaymentEmails.loading")}>
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : pageQuery.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{t("orders.failedPaymentEmails.loadError")}</p>
            <Button variant="outline" size="sm" onClick={() => pageQuery.refetch()} disabled={pageQuery.isFetching}>
              <RefreshCw className="me-2 h-4 w-4" />
              {t("orders.failedPaymentEmails.tryAgain")}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-10 text-center">
            <MailWarning className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="font-medium">{t("orders.failedPaymentEmails.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("orders.failedPaymentEmails.emptyDescription")}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orders.failedPaymentEmails.order")}</TableHead>
                    <TableHead>{t("orders.failedPaymentEmails.emailType")}</TableHead>
                    <TableHead>{t("orders.failedPaymentEmails.attempts")}</TableHead>
                    <TableHead>{t("orders.failedPaymentEmails.diagnostic")}</TableHead>
                    <TableHead className="text-end">{t("orders.failedPaymentEmails.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isPending = retryMutation.isPending && retryMutation.variables === row.id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">#{row.orderId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {t(row.audience === "admin"
                              ? "orders.failedPaymentEmails.adminEmail"
                              : "orders.failedPaymentEmails.guestEmail")}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.attempts}</TableCell>
                        <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                          {t("orders.failedPaymentEmails.deliveryFailed")}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMutation.mutate(row.id)}
                            disabled={retryMutation.isPending}
                          >
                            <RotateCw className={`me-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                            {isPending ? t("orders.failedPaymentEmails.retrying") : t("orders.failedPaymentEmails.retry")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {!pageQuery.isLoading && (
            <div className={`mt-4 flex items-center justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <p className="text-xs text-muted-foreground">{t("orders.failedPaymentEmails.pageSize")}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goPrevious} disabled={cursorHistory.length === 0 || pageQuery.isFetching}>
                  <ChevronLeft className="me-1 h-4 w-4" />
                  {t("orders.failedPaymentEmails.previous")}
                </Button>
                <Button variant="outline" size="sm" onClick={goNext} disabled={pageQuery.data?.nextCursor == null || pageQuery.isFetching}>
                  {t("orders.failedPaymentEmails.next")}
                  <ChevronRight className="ms-1 h-4 w-4" />
                </Button>
              </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
