import { useCallback, useEffect, useState } from "react";
import {
  addFile,
  deleteProject,
  openFileLocation,
  pickFiles,
  removeFile,
  scanProject,
  updateProject,
} from "../api";
import Dialog from "../components/Dialog";
import EditableField from "../components/EditableField";
import FileList from "../components/FileList";
import { useI18n } from "../i18n";
import type { FileEntry, Project } from "../types";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const p = await scanProject(projectId);
      setProject(p);
      const phase = p.phases.find((ph) => ph.id === currentPhase) || p.phases[0];
      if (phase) setCurrentPhase(phase.id);
    } catch {
      onBack();
    }
  }, [projectId, currentPhase, onBack]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleFieldSave = async (field: string, value: any) => {
    if (!project) return;
    try {
      await updateProject(project.id, { [field]: value });
      setProject({ ...project, [field]: value });
    } catch (err) {
      console.error("Save failed:", err);
      alert(t("error_delete") + err);
    }
  };

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
    try {
      await deleteProject(projectId);
      onBack();
    } catch (err) {
      console.error("Delete project failed:", err);
      alert(t("error_delete") + err);
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

  function formatDateTime(date: string | null): string {
    if (!date) return "-";
    return new Date(date).toLocaleString("it-IT");
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

  const statusOptions = [
    { value: "bozza", label: t("status_bozza") },
    { value: "in_corso", label: t("status_in_corso") },
    { value: "sospeso", label: t("status_sospeso") },
    { value: "completato", label: t("status_completato") },
    { value: "archiviato", label: t("status_archiviato") },
  ];

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
          <button className="btn danger" onClick={() => setShowDeleteConfirm(true)}>
            {t("delete")}
          </button>
        </div>
      </header>

      <div className="project-info">
        <div className="info-row">
          <span className="info-label">{t("client")}</span>
          <EditableField
            value={project.client}
            type="text"
            onSave={(v) => handleFieldSave("client", v)}
          />
        </div>
        <div className="info-row">
          <span className="info-label">{t("contract_date")}</span>
          <EditableField
            value={project.contract_date}
            type="date"
            formatDisplay={formatDate}
            onSave={(v) => handleFieldSave("contract_date", v)}
          />
        </div>
        <div className="info-row">
          <span className="info-label">{t("completion_date")}</span>
          <EditableField
            value={project.completion_date}
            type="date"
            formatDisplay={formatDate}
            onSave={(v) => handleFieldSave("completion_date", v)}
          />
        </div>
        <div className="info-row">
          <span className="info-label">{t("amount")}</span>
          <EditableField
            value={project.amount}
            type="number"
            formatDisplay={formatAmount}
            onSave={(v) => handleFieldSave("amount", v)}
          />
        </div>
        <div className="info-row">
          <span className="info-label">{t("amount_paid")}</span>
          <EditableField
            value={project.amount_paid}
            type="number"
            formatDisplay={formatAmount}
            onSave={(v) => handleFieldSave("amount_paid", v)}
          />
        </div>
        <div className="info-row">
          <span className="info-label">{t("status")}</span>
          <EditableField
            value={project.status}
            type="select"
            onSelectOptions={statusOptions}
            formatDisplay={(v) => statusLabel(v)}
            onSave={(v) => handleFieldSave("status", v)}
          />
        </div>
        <div className="info-row info-row-wide">
          <span className="info-label">{t("description")}</span>
          <EditableField
            value={project.description}
            type="textarea"
            onSave={(v) => handleFieldSave("description", v)}
          />
        </div>
        <div className="info-row info-row-wide">
          <span className="info-label">{t("notes")}</span>
          <EditableField
            value={project.notes}
            type="textarea"
            onSave={(v) => handleFieldSave("notes", v)}
          />
        </div>
        {project.tags.length > 0 && (
          <div className="info-row info-row-wide">
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
        <div className="info-row">
          <span className="info-label">{t("created_at")}</span>
          <span>{formatDateTime(project.created_at)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t("updated_at")}</span>
          <span>{formatDateTime(project.updated_at)}</span>
        </div>
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

      {showDeleteConfirm && (
        <Dialog
          title={t("delete")}
          onClose={() => setShowDeleteConfirm(false)}
        >
          <p>{t("confirm_delete_project")}</p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setShowDeleteConfirm(false)}>
              {t("cancel")}
            </button>
            <button className="btn danger" onClick={handleDelete}>
              {t("delete")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
