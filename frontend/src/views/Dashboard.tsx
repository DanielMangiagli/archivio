import { useCallback, useEffect, useState } from "react";
import { generateIndex, listProjects, openIndex } from "../api";
import DatePicker from "../components/DatePicker";
import ProjectCard from "../components/ProjectCard";
import { useI18n } from "../i18n";
import type { ProjectSummary } from "../types";
import ProjectDialog from "./ProjectDialog";

interface DashboardProps {
  onProjectClick: (id: string) => void;
  onSettingsClick: () => void;
}

export default function Dashboard({
  onProjectClick,
  onSettingsClick,
}: DashboardProps) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadProjects = useCallback(async () => {
    const list = await listProjects();
    setProjects(list);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filtered = projects.filter((p) => {
    const matchSearch =
      !searchQuery ||
      p.code.toLowerCase().includes(searchQuery) ||
      p.name.toLowerCase().includes(searchQuery) ||
      p.client.toLowerCase().includes(searchQuery);
    const matchStatus = !statusFilter || p.status === statusFilter;
    let matchDate = true;
    if (dateFrom && p.contract_date) {
      matchDate = matchDate && p.contract_date >= dateFrom;
    } else if (dateFrom) {
      matchDate = false;
    }
    if (dateTo && p.contract_date) {
      matchDate = matchDate && p.contract_date <= dateTo;
    } else if (dateTo) {
      matchDate = false;
    }
    return matchSearch && matchStatus && matchDate;
  });

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const handleGenerateIndex = async () => {
    try {
      await generateIndex();
      await openIndex();
    } catch (e) {
      alert("Error: " + e);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>{t("app_title")}</h1>
        <div className="header-actions">
          <input
            type="text"
            placeholder={t("search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t("all_statuses")}</option>
            <option value="bozza">{t("status_bozza")}</option>
            <option value="in_corso">{t("status_in_corso")}</option>
            <option value="sospeso">{t("status_sospeso")}</option>
            <option value="completato">{t("status_completato")}</option>
            <option value="archiviato">{t("status_archiviato")}</option>
          </select>
          <div className="date-range">
            <DatePicker value={dateFrom} onChange={setDateFrom} />
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
          <button className="btn" onClick={handleClearFilters}>
            {t("clear_filters")}
          </button>
          <button
            className="btn primary"
            onClick={() => setShowCreateDialog(true)}
          >
            {t("new_project")}
          </button>
          <button className="btn" onClick={handleGenerateIndex}>
            {t("generate_index")}
          </button>
          <button
            className="btn btn-settings"
            title={t("settings")}
            onClick={onSettingsClick}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>
      <div className="project-grid">
        {filtered.length === 0 ? (
          <p className="empty">{t("no_projects_found")}</p>
        ) : (
          filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => onProjectClick(p.id)}
            />
          ))
        )}
      </div>
      {showCreateDialog && (
        <ProjectDialog
          mode="create"
          onClose={() => {
            setShowCreateDialog(false);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}
