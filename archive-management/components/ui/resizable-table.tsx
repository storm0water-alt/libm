"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GripVertical } from "lucide-react";

interface Column {
  id: string;
  header: string;
  defaultWidth: number;
  minWidth?: number;
}

interface ResizableTableProps {
  columns: Column[];
  children: React.ReactNode;
}

const STORAGE_KEY = "archive-table-column-widths";

// Load saved column widths from localStorage
function loadSavedWidths(columns: Column[]): Map<string, number> {
  if (typeof window === "undefined") return new Map();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error("Failed to load column widths:", error);
  }
  return new Map();
}

// Save column widths to localStorage
function saveWidths(widths: Map<string, number>) {
  if (typeof window === "undefined") return;

  try {
    const obj = Object.fromEntries(widths);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error("Failed to save column widths:", error);
  }
}

export function ResizableTable({ columns, children }: ResizableTableProps) {
  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(new Map());
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Load saved widths on mount
  useEffect(() => {
    const savedWidths = loadSavedWidths(columns);
    setColumnWidths(savedWidths);
  }, [columns]);

  const getColumnWidth = useCallback((columnId: string): number => {
    return columnWidths.get(columnId) || columns.find(c => c.id === columnId)?.defaultWidth || 150;
  }, [columnWidths, columns]);

  const handleMouseDown = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const width = getColumnWidth(columnId);
    setResizingColumn(columnId);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn || !columnWidths) return;

    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(
      startWidthRef.current + diff,
      columns.find(c => c.id === resizingColumn)?.minWidth || 50
    );

    setColumnWidths(prev => {
      const newWidths = new Map(prev);
      newWidths.set(resizingColumn, newWidth);
      return newWidths;
    });
  }, [resizingColumn, columns, columnWidths]);

  const handleMouseUp = useCallback(() => {
    if (resizingColumn) {
      saveWidths(columnWidths);
      setResizingColumn(null);
    }
  }, [resizingColumn, columnWidths]);

  // Attach/detach mouse move and up listeners
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizingColumn, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = (columnId: string) => {
    // Reset to default width on double click
    const defaultWidth = columns.find(c => c.id === columnId)?.defaultWidth || 150;
    setColumnWidths(prev => {
      const newWidths = new Map(prev);
      newWidths.set(columnId, defaultWidth);
      saveWidths(newWidths);
      return newWidths;
    });
  };

  // Clone children and inject width props
  const renderWithResizableHeaders = () => {
    const table = tableRef.current;
    if (!table) return children;

    const headers = table.querySelectorAll("th[data-resizable-column]");
    headers.forEach((header) => {
      const columnId = header.getAttribute("data-resizable-column");
      if (!columnId) return;

      const width = getColumnWidth(columnId);

      // Set column width
      header.style.width = `${width}px`;
      header.style.minWidth = `${width}px`;
      header.style.maxWidth = `${width}px`;

      // Get or create resize handle
      let handle = header.querySelector(".resize-handle") as HTMLElement;
      if (!handle) {
        handle = document.createElement("div");
        handle.className = "resize-handle";
        handle.style.cssText = `
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
          transition: background 0.2s;
        `;

        // Add hover effect
        handle.addEventListener("mouseenter", () => {
          handle.style.background = "rgba(59, 130, 246, 0.1)";
        });
        handle.addEventListener("mouseleave", () => {
          handle.style.background = "transparent";
        });

        header.style.position = "relative";
        header.appendChild(handle);
      }

      // Update or add mouse event listener
      handle.onmousedown = (e) => handleMouseDown(columnId, e as React.MouseEvent);
      handle.ondblclick = () => handleDoubleClick(columnId);
    });

    // Set cell widths
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      columns.forEach((col) => {
        const cell = row.querySelector(`td[data-column="${col.id}"]`);
        if (cell) {
          const width = getColumnWidth(col.id);
          (cell as HTMLElement).style.width = `${width}px`;
          (cell as HTMLElement).style.maxWidth = `${width}px`;
          (cell as HTMLElement).style.minWidth = `${width}px`;
        }
      });
    });
  };

  useEffect(() => {
    renderWithResizableHeaders();
  }, [columnWidths, columns, getColumnWidth]);

  return (
    <Table ref={tableRef}>
      {children}
    </Table>
  );
}

// Export column definition type
export type { Column };
