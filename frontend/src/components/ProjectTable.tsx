import { useState, useRef, useEffect, useMemo } from 'react';
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
} from '@tanstack/react-table';
import { useI18n } from '../i18n';
import { getProject, deleteProject } from '../api';
import type { ProjectSummary } from '../types';
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

interface ProjectTableProps {
  projects: ProjectSummary[];
  onProjectClick: (id: string) => void;
  onMutate: () => void;
}

function ColumnFilter({ column }: { column: any }) {
  const { t } = useI18n();
  const filterValue = column.getFilterValue();

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
        {(range.from || range.to) && (
          <button
            className="filter-clear-btn"
            onClick={() => column.setFilterValue(undefined)}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  const textValue = (filterValue as string) ?? '';
  return (
    <div className="filter-text-wrap">
      <input
        type="text"
        value={textValue}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        placeholder={t('search_placeholder')}
      />
      {textValue && (
        <button
          className="filter-clear-btn"
          onClick={() => column.setFilterValue(undefined)}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function ProjectTable({
  projects,
  onProjectClick,
  onMutate,
}: ProjectTableProps) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(
    null
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      column.accessor('file_count', {
        header: () => t('files'),
      }),
      column.accessor('photo_count', {
        header: () => t('photos'),
      }),
      column.display({
        id: 'actions',
        header: () => t('actions'),
        cell: (info) => {
          const project = info.row.original;
          const isOpen = openMenuId === project.id;
          return (
            <div className="actions-cell" ref={isOpen ? menuRef : undefined}>
              <button
                className="actions-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isOpen ? null : project.id);
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {isOpen && (
                <div className="actions-menu">
                  <button
                    className="actions-menu-item"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      try {
                        const full = await getProject(project.id);
                        setEditingProject(full as any);
                      } catch {
                        alert('Error loading project');
                      }
                    }}
                  >
                    {t('edit')}
                  </button>
                  <button
                    className="actions-menu-item actions-menu-danger"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      if (window.confirm(t('confirm_delete_project'))) {
                        try {
                          await deleteProject(project.id);
                          onMutate();
                        } catch (err) {
                          alert(t('error_delete') + err);
                        }
                      }
                    }}
                  >
                    {t('delete')}
                  </button>
                </div>
              )}
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [t, openMenuId, onMutate]
  );

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filterableColumnIds = ['code', 'name', 'client', 'status', 'contract_date'];

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
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={
                        header.column.getCanSort() ? 'sortable-th' : ''
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="th-content">
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
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
              <tr className="filter-row">
                {table.getAllColumns().map((col) => (
                  <td key={col.id}>
                    {filterableColumnIds.includes(col.id) ? (
                      <ColumnFilter column={col} />
                    ) : null}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="table-row"
                  onClick={() => onProjectClick(row.original.id)}
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

      {editingProject && (
        <ProjectDialog
          mode="edit"
          project={editingProject as any}
          onClose={() => {
            setEditingProject(null);
            onMutate();
          }}
        />
      )}
    </>
  );
}
