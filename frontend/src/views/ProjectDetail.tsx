import { useCallback, useEffect, useState } from "react";
import {
  addFile,
  deleteProject,
  openFileLocation,
  pickFiles,
  removeFile,
  scanProject,
} from "../api";
import FileList from "../components/FileList";
import { useI18n } from "../i18n";
import type { FileEntry, Project } from "../types";
import ProjectDialog from "./ProjectDialog";

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetail({
  projectId,
  onBack,
}: ProjectDetailProps) {
  const { t } = useI18n();
  const [project, setProject] = useState<Project | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>("contratto");
  const [showEditDialog, setShowEditDialog] = useState(false);

  const loadProject = useCallback(async () => {
    const p = await scanProject(projectId);
    setProject(p);
    const phase = p.phases.find((ph) => ph.id === currentPhase) || p.phases[0];
    if (phase) setCurrentPhase(phase.id);
  }, [projectId, currentPhase]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleSync = async () => {
    await loadProject();
  };

  const handleAddFile = async () => {
    try {
      const filePaths = await pickFiles();
      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          await addFile(projectId, currentPhase, filePath);
        }
        await loadProject();
      }
    } catch (e) {
      console.error("Failed to pick files:", e);
    }
  };

  const handleRemoveFile = async (filePath: string) => {
    try {
      await removeFile(projectId, currentPhase, filePath);
      await loadProject();
    } catch (err) {
      console.error("Delete failed:", err);
      alert(t("error_delete") + err);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    await openFileLocation(projectId, filePath);
  };

  const handleDelete = async () => {
    if (confirm(t("confirm_delete_project"))) {
      await deleteProject(projectId);
      onBack();
    }
  };

  if (!project) return null;

  const phase =
    project.phases.find((p) => p.id === currentPhase) || project.phases[0];
  const files: FileEntry[] = phase?.files || [];

  function formatAmount(amount: number | null): string {
    if (amount === null) return "-";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }

  function formatDate(date: string | null): string {
    if (!date) return "-";
    return new Date(date + "T00:00:00").toLocaleDateString("it-IT");
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      bozza: t("status_bozza"),
      in_corso: t("status_in_corso"),
      sospeso: t("status_sospeso"),
      completato: t("status_completato"),
      archiviato: t("status_archiviato"),
    };
    return map[status] || status;
  };

  return (
    <div className="project-detail">
      <header>
        <button className="btn" onClick={onBack}>
          {t("back")}
        </button>
        <h1>
          {project.code} {project.name}
        </h1>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowEditDialog(true)}>
            {t("edit")}
          </button>
          <button className="btn danger" onClick={handleDelete}>
            {t("delete")}
          </button>
        </div>
      </header>

      <div className="project-info">
        <div className="info-row">
          <span className="info-label">{t("client")}</span>
          <span>{project.client}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t("contract_date")}</span>
          <span>{formatDate(project.contract_date)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t("completion_date")}</span>
          <span>{formatDate(project.completion_date)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t("amount")}</span>
          <span>{formatAmount(project.amount)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t("status")}</span>
          <span className={`status status-${project.status}`}>
            {statusLabel(project.status)}
          </span>
        </div>
        {project.description && (
          <div className="info-row">
            <span className="info-label">{t("description")}</span>
            <span>{project.description}</span>
          </div>
        )}
        {project.notes && (
          <div className="info-row">
            <span className="info-label">{t("notes")}</span>
            <span>{project.notes}</span>
          </div>
        )}
        {project.tags.length > 0 && (
          <div className="info-row">
            <span className="info-label">{t("tags")}</span>
            <span>
              {project.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>

      <div className="tabs">
        {project.phases.map((p) => (
          <button
            key={p.id}
            className={`tab ${p.id === currentPhase ? "active" : ""}`}
            onClick={() => setCurrentPhase(p.id)}
          >
            {p.label} ({p.files.length})
          </button>
        ))}
      </div>

      <div className="phase-content">
        <div className="phase-toolbar">
          <button className="btn" onClick={handleSync}>
            {t("sync_folder")}
          </button>
          <button className="btn primary" onClick={handleAddFile}>
            {t("add_file")}
          </button>
        </div>
        <FileList
          files={files}
          projectId={projectId}
          phaseId={currentPhase}
          onRemoveFile={handleRemoveFile}
          onOpenFile={handleOpenFile}
        />
      </div>

      {showEditDialog && (
        <ProjectDialog
          mode="edit"
          project={project}
          onClose={() => {
            setShowEditDialog(false);
            loadProject();
          }}
        />
      )}
    </div>
  );
}
