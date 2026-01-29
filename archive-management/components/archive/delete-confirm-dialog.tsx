"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  title?: string;
  description?: string;
  itemName?: string;
  isBatch?: boolean;
  itemCount?: number;
}

const CONFIRMATION_TEXT = "确认删除";

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  isBatch = false,
  itemCount = 1,
}: DeleteConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setInputValue("");
      setDeleting(false);
      setError("");
      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const isValid = inputValue.trim() === CONFIRMATION_TEXT;

  const handleConfirm = async () => {
    if (!isValid) return;

    setDeleting(true);
    setError("");
    try {
      const result = await onConfirm();
      if (result.success) {
        onOpenChange(false);
      } else {
        setError(result.error || "删除失败，请重试");
        setDeleting(false);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "删除失败，请重试");
      setDeleting(false);
    }
  };

  const getDefaultTitle = () => {
    if (isBatch) {
      return `批量删除 ${itemCount} 个档案`;
    }
    return "删除档案";
  };

  const getDefaultDescription = () => {
    if (isBatch) {
      return `您即将删除 ${itemCount} 个档案。删除后数据将无法恢复，请谨慎操作。`;
    }
    return itemName
      ? `您即将删除档案"${itemName}"。删除后数据将无法恢复，请谨慎操作。`
      : "您即将删除此档案。删除后数据将无法恢复，请谨慎操作。";
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open || !deleting) {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title || getDefaultTitle()}
          </DialogTitle>
          <DialogDescription>
            {description || getDefaultDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              警告：此操作不可撤销！删除后的档案数据将永久丢失。
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label htmlFor="confirm-input" className="text-sm font-medium">
              为了确认删除操作，请输入 <span className="font-bold">"{CONFIRMATION_TEXT}"</span>
            </label>
            <Input
              ref={inputRef}
              id="confirm-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError("");
              }}
              placeholder={`请输入: ${CONFIRMATION_TEXT}`}
              disabled={deleting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid && !deleting) {
                  handleConfirm();
                }
              }}
              className={isValid ? "border-green-500 focus-visible:ring-green-500" : ""}
            />
            {!isValid && inputValue.length > 0 && (
              <p className="text-xs text-destructive">
                请输入正确的确认文本
              </p>
            )}
            {error && (
              <p className="text-xs text-destructive font-medium">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                删除中...
              </>
            ) : (
              "确认删除"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
