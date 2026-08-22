import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type FilterFn,
  type Column,
  type RowSelectionState,
  type HeaderContext,
  type CellContext,
} from '@tanstack/react-table';
import { useI18n } from '../i18n';
import { updateProject, deleteProject } from '../api';
import { formatAmount, formatDate, dateRangeFilter } from '../utils';
import type { ProjectSummary } from '../types';
import Dialog from './Dialog';
import DatePicker from './DatePicker';

const column = createColumnHelper<ProjectSummary>();

const dateRangeFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const date = row.getValue(columnId) as string | null;
  return dateRangeFilter(date, filterValue as { from?: string; to?: string } | undefined);
};

const FILTERABLE_COLUMNS = ['code', 'name', 'client', 'status', 'contract_date'];

const EDITABLE_COLUMNS = ['code', 'name', 'client', 'status', 'contract_date', 'amount', 'amount_paid', 'completion_date'];

function hasActiveFilter(col: Column<any, any>): boolean {
  const val = col.getFilterValue();
  if (val === undefined || val === '') return false;
  if (typeof val === 'object' && val !== null) {
    const range = val as { from?: string; to?: string };
    return !!(range.from || range.to);
  }
  return true;
}

interface CellEdit {
  rowId: string;
  colId: string;
}

interface EditCellProps {
  value: any;
  colId: string;
  rowId: string;
  onSave: (rowId: string, colId: string, value: any) => void;
  onCancel: () => void;
}

function EditCell({ value, colId, rowId, onSave, onCancel }: EditCellProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, []);

  const commit = () => {
    if (colId === 'amount' || colId === 'amount_paid') {
      const num = draft === '' || draft === null ? null : parseFloat(draft);
      onSave(rowId, colId, num);
    } else {
      onSave(rowId, colId, draft || null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (colId === 'status') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        className="inline-editor"
        value={draft ?? ''}
        onChange={(e) => {
          setDraft(e.target.value);
          onSave(rowId, colId, e.target.value || null);
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      >
        <option value="bozza">{t('status_bozza')}</option>
        <option value="in_corso">{t('status_in_corso')}</option>
        <option value="sospeso">{t('status_sospeso')}</option>
        <option value="completato">{t('status_completato')}</option>
        <option value="archiviato">{t('status_archiviato')}</option>
      </select>
    );
  }

  if (colId === 'contract_date' || colId === 'completion_date') {
    return (
      <div className="inline-editor-date">
        <DatePicker
          value={draft ?? ''}
          onChange={(val) => {
            onSave(rowId, colId, val || null);
          }}
        />
      </div>
    );
  }

  if (colId === 'amount' || colId === 'amount_paid') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        step="0.01"
        className="inline-editor"
        value={draft ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      className="inline-editor"
      value={draft ?? ''}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

const PencilIcon = () => (
  <svg className="edit-pencil" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

interface ProjectTableProps {
  projects: ProjectSummary[];
  onProjectClick: (id: string) => void;
  onMutate: () => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}

interface FilterPopoverProps {
  column: Column<any, any>;
  onClose: () => void;
}

function ActionsCell({ project, onMutate }: { project: ProjectSummary; onMutate: () => void }) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteProject(project.id);
      setConfirmDelete(false);
      await onMutate();
    } catch (err) {
      alert(t('error_delete') + err);
    }
  };

  return (
    <>
      <button
        className="delete-btn"
        title={t('delete')}
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDelete(true);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
      {confirmDelete && (
        <Dialog title={t('delete')} onClose={() => setConfirmDelete(false)}>
          <p>{t('confirm_delete_project')}</p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </button>
            <button className="btn danger" onClick={handleDelete}>
              {t('delete')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function FilterPopover({ column, onClose }: FilterPopoverProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const th = document.querySelector(`th[data-col-id="${column.id}"]`);
    if (th) {
      const rect = th.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [column]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filterValue = column.getFilterValue();

  const renderFilter = () => {
    if (column.id === 'status') {
      return (
        <select
          value={(filterValue as string) ?? ''}
          onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        >
          <option value="">{t('all_statuses')}</option>
          <option value="bozza">{t('status_bozza')}</option>
          <option value="in_corso">{t('status_in_corso')}</option>
          <option value="sospeso">{t('status_sospeso')}</option>
          <option value="completato">{t('status_completato')}</option>
          <option value="archiviato">{t('status_archiviato')}</option>
        </select>
      );
    }

    if (column.id === 'contract_date') {
      const range = (filterValue as { from?: string; to?: string }) ?? {};
      return (
        <div className="filter-date-range">
          <DatePicker
            value={range.from ?? ''}
            onChange={(val) =>
              column.setFilterValue({
                from: val || undefined,
                to: range.to,
              })
            }
          />
          <span className="filter-date-sep">–</span>
          <DatePicker
            value={range.to ?? ''}
            onChange={(val) =>
              column.setFilterValue({
                from: range.from,
                to: val || undefined,
              })
            }
          />
        </div>
      );
    }

    return (
      <input
        type="text"
        value={(filterValue as string) ?? ''}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        placeholder={t('search_placeholder')}
        autoFocus
      />
    );
  };

  return (
    <div className="filter-popover" ref={ref} style={{ top: pos.top, left: pos.left }}>
      {renderFilter()}
      <div className="filter-popover-footer">
        <button
          className="filter-popover-clear"
          onClick={() => {
            column.setFilterValue(undefined);
            onClose();
          }}
        >
          {t('clear_filters')}
        </button>
      </div>
    </div>
  );
}

export default function ProjectTable({
  projects,
  onProjectClick,
  onMutate,
  rowSelection,
  onRowSelectionChange,
}: ProjectTableProps) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<CellEdit | null>(null);
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColPicker]);

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      bozza: t('status_bozza'),
      in_corso: t('status_in_corso'),
      sospeso: t('status_sospeso'),
      completato: t('status_completato'),
      archiviato: t('status_archiviato'),
    };
    return map[status] || status;
  };

  const handleSave = useCallback(async (rowId: string, colId: string, value: any) => {
    setEditingCell(null);
    const projectId = projects.find((p) => p.id === rowId)?.id;
    if (!projectId) return;
    try {
      await updateProject(projectId, { [colId]: value });
      await onMutate();
    } catch (err) {
      alert('Error saving: ' + err);
    }
  }, [projects, onMutate]);

  const handleCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  const columns = useMemo(
    () => [
      column.display({
        id: 'select',
        header: (info: HeaderContext<ProjectSummary, unknown>) => {
          const ref = useCallback((el: HTMLInputElement | null) => {
            if (el) el.indeterminate = info.table.getIsSomePageRowsSelected();
          }, [info.table]);
          return (
            <input
              type="checkbox"
              className="table-checkbox"
              ref={ref}
              checked={info.table.getIsAllPageRowsSelected()}
              onChange={info.table.getToggleAllPageRowsSelectedHandler()}
            />
          );
        },
        cell: (info: CellContext<ProjectSummary, unknown>) => (
          <input
            type="checkbox"
            className="table-checkbox"
            checked={info.row.getIsSelected()}
            onChange={info.row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
        size: 40,
      }),
      column.accessor('code', {
        header: () => t('code'),
        cell: (info) => {
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'code';
          if (isEditing) {
            return (
              <EditCell
                value={info.getValue()}
                colId="code"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'code' }); }}>
              <span className="table-code">{info.getValue()}</span>
              <PencilIcon />
            </div>
          );
        },
      }),
      column.accessor('name', {
        header: () => t('name'),
        cell: (info) => {
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'name';
          if (isEditing) {
            return (
              <EditCell
                value={info.getValue()}
                colId="name"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'name' }); }}>
              {info.getValue()}
              <PencilIcon />
            </div>
          );
        },
      }),
      column.accessor('client', {
        header: () => t('client'),
        cell: (info) => {
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'client';
          if (isEditing) {
            return (
              <EditCell
                value={info.getValue()}
                colId="client"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'client' }); }}>
              {info.getValue()}
              <PencilIcon />
            </div>
          );
        },
      }),
      column.accessor('status', {
        header: () => t('status'),
        cell: (info) => {
          const val = info.getValue();
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'status';
          if (isEditing) {
            return (
              <EditCell
                value={val}
                colId="status"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'status' }); }}>
              <span className={`status status-${val}`}>{statusLabel(val)}</span>
              <PencilIcon />
            </div>
          );
        },
        filterFn: 'equals',
      }),
      column.accessor('contract_date', {
        header: () => t('contract_date'),
        cell: (info) => {
          const val = info.getValue();
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'contract_date';
          if (isEditing) {
            return (
              <EditCell
                value={val}
                colId="contract_date"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'contract_date' }); }}>
              {formatDate(val)}
              <PencilIcon />
            </div>
          );
        },
        filterFn: dateRangeFilterFn,
      }),
      column.accessor('amount', {
        header: () => t('amount'),
        cell: (info) => {
          const val = info.getValue();
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'amount';
          if (isEditing) {
            return (
              <EditCell
                value={val}
                colId="amount"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'amount' }); }}>
              {formatAmount(val)}
              <PencilIcon />
            </div>
          );
        },
      }),
      column.accessor('amount_paid', {
        header: () => t('amount_paid'),
        cell: (info) => {
          const val = info.getValue();
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'amount_paid';
          if (isEditing) {
            return (
              <EditCell
                value={val}
                colId="amount_paid"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'amount_paid' }); }}>
              {formatAmount(val)}
              <PencilIcon />
            </div>
          );
        },
      }),
      column.accessor('completion_date', {
        header: () => t('completion_date'),
        cell: (info) => {
          const val = info.getValue();
          const isEditing = editingCell?.rowId === info.row.id && editingCell?.colId === 'completion_date';
          if (isEditing) {
            return (
              <EditCell
                value={val}
                colId="completion_date"
                rowId={info.row.id}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            );
          }
          return (
            <div className="editable-cell" onClick={(e) => { e.stopPropagation(); setEditingCell({ rowId: info.row.id, colId: 'completion_date' }); }}>
              {formatDate(val)}
              <PencilIcon />
            </div>
          );
        },
      }),
      column.accessor('file_count', {
        header: () => t('files'),
      }),
      column.accessor('photo_count', {
        header: () => t('photos'),
      }),
      column.display({
        id: 'actions',
        header: () => t('actions'),
        cell: (info) => (
          <ActionsCell project={info.row.original} onMutate={onMutate} />
        ),
        enableSorting: false,
      }),
    ],
    [t, onMutate, editingCell, handleSave, handleCancel]
  );

  const table = useReactTable({
    data: projects,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: onRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const FilterIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );

  return (
    <>
      {table.getRowModel().rows.length === 0 && columnFilters.length === 0 ? (
        <p className="empty">{t('no_projects_found')}</p>
      ) : (
        <>
          <div className="table-toolbar">
            <div className="col-picker-wrap" ref={colPickerRef}>
              <button
                className="btn small"
                onClick={() => setShowColPicker(!showColPicker)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                {t('columns')}
              </button>
              {showColPicker && (
                <div className="col-picker-menu">
                  {table.getAllLeafColumns().filter((col) => col.id !== 'select' && col.id !== 'actions').map((col) => (
                    <label key={col.id} className="col-picker-item">
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                      />
                      {typeof col.columnDef.header === 'function'
                        ? col.columnDef.header({} as any)
                        : col.columnDef.header}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="project-table-wrap">
          <table className="project-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isFilterable = FILTERABLE_COLUMNS.includes(header.column.id);
                    const isActive = hasActiveFilter(header.column);
                    const isFilterOpen = openFilterCol === header.column.id;
                    return (
                      <th
                        key={header.id}
                        data-col-id={header.column.id}
                        className={
                          header.column.getCanSort() ? 'sortable-th' : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="th-label">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="sort-icon">
                              {{
                                asc: ' ▲',
                                desc: ' ▼',
                              }[header.column.getIsSorted() as string] ?? ''}
                            </span>
                          )}
                          {isFilterable && (
                            <button
                              className={`th-filter-btn ${isActive ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenFilterCol(isFilterOpen ? null : header.column.id);
                              }}
                            >
                              <FilterIcon />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`table-row ${editingCell?.rowId === row.id ? 'editing-row' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.table-checkbox')) return;
                    if ((e.target as HTMLElement).closest('.editable-cell')) return;
                    if ((e.target as HTMLElement).closest('.delete-btn')) return;
                    onProjectClick(row.original.id);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {openFilterCol && (
        <FilterPopover
          column={table.getColumn(openFilterCol)!}
          onClose={() => setOpenFilterCol(null)}
        />
      )}
    </>
  );
}
