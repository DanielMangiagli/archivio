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
  type FilterFn,
  type Column,
  type RowSelectionState,
  type HeaderContext,
  type CellContext,
} from '@tanstack/react-table';
import { useI18n } from '../i18n';
import { getProject, deleteProject } from '../api';
import type { Project, ProjectSummary } from '../types';
import Dialog from './Dialog';
import ProjectDialog from '../views/ProjectDialog';
import DatePicker from './DatePicker';

const column = createColumnHelper<ProjectSummary>();

const dateRangeFilter: FilterFn<any> = (row, columnId, filterValue) => {
  const date = row.getValue(columnId) as string | null;
  if (!date) return false;
  const { from, to } = filterValue as { from?: string; to?: string };
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

function formatAmount(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date + 'T00:00:00').toLocaleDateString('it-IT');
}

const FILTERABLE_COLUMNS = ['code', 'name', 'client', 'status', 'contract_date'];

function hasActiveFilter(col: Column<any, any>): boolean {
  const val = col.getFilterValue();
  if (val === undefined || val === '') return false;
  if (typeof val === 'object' && val !== null) {
    const range = val as { from?: string; to?: string };
    return !!(range.from || range.to);
  }
  return true;
}

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
  const [isOpen, setIsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
      <div className="actions-cell" ref={ref}>
        <button
          className="actions-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {isOpen && (
          <div className="actions-menu">
            <button
              className="actions-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                getProject(project.id).then((full) => {
                  setEditingProject(full);
                }).catch(() => {
                  alert('Error loading project');
                });
              }}
            >
              {t('edit')}
            </button>
            <button
              className="actions-menu-item actions-menu-danger"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setConfirmDelete(true);
              }}
            >
              {t('delete')}
            </button>
          </div>
        )}
      </div>
      {editingProject && (
        <ProjectDialog
          mode="edit"
          project={editingProject}
          onClose={() => {
            setEditingProject(null);
            onMutate();
          }}
        />
      )}
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
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);

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
        cell: (info) => (
          <span className="table-code">{info.getValue()}</span>
        ),
      }),
      column.accessor('name', {
        header: () => t('name'),
      }),
      column.accessor('client', {
        header: () => t('client'),
      }),
      column.accessor('status', {
        header: () => t('status'),
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className={`status status-${val}`}>
              {statusLabel(val)}
            </span>
          );
        },
        filterFn: 'equals',
      }),
      column.accessor('contract_date', {
        header: () => t('contract_date'),
        cell: (info) => formatDate(info.getValue()),
        filterFn: dateRangeFilter,
      }),
      column.accessor('amount', {
        header: () => t('amount'),
        cell: (info) => formatAmount(info.getValue()),
      }),
      column.accessor('amount_paid', {
        header: () => t('amount_paid'),
        cell: (info) => formatAmount(info.getValue()),
      }),
      column.accessor('completion_date', {
        header: () => t('completion_date'),
        cell: (info) => formatDate(info.getValue()),
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
    [t, onMutate]
  );

  const table = useReactTable({
    data: projects,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: onRowSelectionChange,
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
                  className="table-row"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.actions-cell')) return;
                    if ((e.target as HTMLElement).closest('.table-checkbox')) return;
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
