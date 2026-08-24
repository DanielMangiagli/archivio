// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use crate::models::{Project, ProjectStatus};

pub fn generate_index(projects: &[Project]) -> String {
    let mut html = String::with_capacity(32768);

    html.push_str(r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Archivio — Project Index</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 2rem; }
h1 { text-align: center; margin-bottom: 0.5rem; font-size: 1.8rem; color: #1a1a2e; }
.subtitle { text-align: center; color: #666; margin-bottom: 2rem; font-size: 0.9rem; }
.controls { max-width: 1200px; margin: 0 auto 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }
.controls input, .controls select { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
.controls input { flex: 1; min-width: 200px; }
table { width: 100%; max-width: 1200px; margin: 0 auto; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th { background: #1a1a2e; color: #fff; padding: 0.75rem 1rem; text-align: left; font-weight: 500; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
td { padding: 0.75rem 1rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
tr:hover td { background: #f8f9fa; }
.status { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
.status-bozza { background: #e0e0e0; color: #555; }
.status-in_corso { background: #fff3cd; color: #856404; }
.status-sospeso { background: #f8d7da; color: #721c24; }
.status-completato { background: #d4edda; color: #155724; }
.status-archiviato { background: #d1ecf1; color: #0c5460; }
.amount { text-align: right; font-variant-numeric: tabular-nums; }
.phases { display: flex; gap: 0.25rem; }
.phase-badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.75rem; background: #e8e8e8; color: #444; }
.footer { text-align: center; margin-top: 1.5rem; color: #999; font-size: 0.8rem; }
.hidden { display: none; }
</style>
</head>
<body>
<h1>Archivio</h1>
<p class="subtitle">Project document index — Generated on "#);

    html.push_str(&chrono::Local::now().format("%d/%m/%Y alle %H:%M").to_string());

    html.push_str(r#"</p>
<div class="controls">
  <input type="text" id="search" placeholder="Cerca per codice, nome, cliente..." autofocus>
  <select id="statusFilter">
    <option value="">Tutti gli stati</option>
    <option value="bozza">Bozza</option>
    <option value="in_corso">In Corso</option>
    <option value="sospeso">Sospeso</option>
    <option value="completato">Completato</option>
    <option value="archiviato">Archiviato</option>
  </select>
</div>
<table>
<thead>
<tr>
  <th>Codice</th>
  <th>Nome</th>
  <th>Committente</th>
  <th>Data Contratto</th>
  <th>Importo</th>
  <th>Stato</th>
  <th>File</th>
  <th>Foto</th>
</tr>
</thead>
<tbody id="tbody">
"#);

    for project in projects {
        let status_class = format!(
            "status-{}",
            serde_json::to_value(&project.status).unwrap_or_default()
        );
        let status_label = match project.status {
            ProjectStatus::Bozza => "Bozza",
            ProjectStatus::InCorso => "In Corso",
            ProjectStatus::Sospeso => "Sospeso",
            ProjectStatus::Completato => "Completato",
            ProjectStatus::Archiviato => "Archiviato",
        };

        let mut photo_count = 0;
        let mut phase_badges = String::new();
        for phase in &project.phases {
            let count = phase.files.len();
            phase_badges.push_str(&format!(
                r#"<span class="phase-badge">{} ({})</span>"#,
                escape_html(&phase.label),
                count
            ));
            for file in &phase.files {
                if let Some(ref mime) = file.mime_type {
                    if mime.starts_with("image/") {
                        photo_count += 1;
                    }
                }
            }
        }

        let amount_str = project
            .amount
            .map(|a| format!("\u{20ac}{:.2}", a))
            .unwrap_or_default();

        let date_str = project
            .contract_date
            .map(|d| d.format("%d/%m/%Y").to_string())
            .unwrap_or_default();

        let status_val =
            serde_json::to_value(&project.status).unwrap_or_default();

        html.push_str(&format!(
            r#"<tr data-status="{}">
<td><strong>{}</strong></td>
<td>{}</td>
<td>{}</td>
<td>{}</td>
<td class="amount">{}</td>
<td><span class="status {}">{}</span></td>
<td><div class="phases">{}</div></td>
<td>{}</td>
</tr>
"#,
            status_val,
            escape_html(&project.code),
            escape_html(&project.name),
            escape_html(&project.client),
            date_str,
            amount_str,
            status_class,
            status_label,
            phase_badges,
            photo_count
        ));
    }

    let total = projects.len();
    html.push_str(&format!(
        r#"</tbody>
</table>
<p class="footer">{} progetti totali</p>
<script>
var search = document.getElementById("search");
var statusFilter = document.getElementById("statusFilter");
var rows = document.querySelectorAll("tr[data-status]");

function filter() {{
  var q = search.value.toLowerCase();
  var status = statusFilter.value;
  for (var i = 0; i < rows.length; i++) {{
    var r = rows[i];
    var text = r.textContent.toLowerCase();
    var matchStatus = !status || r.dataset.status === status;
    var matchSearch = !q || text.indexOf(q) !== -1;
    if (matchStatus && matchSearch) {{
      r.classList.remove("hidden");
    }} else {{
      r.classList.add("hidden");
    }}
  }}
}}

search.addEventListener("input", filter);
statusFilter.addEventListener("change", filter);
</script>
</body>
</html>"#,
        total
    ));

    html
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{default_phases, Project, ProjectStatus};
    use chrono::Utc;

    fn make_project(code: &str, name: &str, client: &str, status: ProjectStatus) -> Project {
        Project {
            id: "test-id".into(),
            code: code.to_string(),
            name: name.to_string(),
            client: client.to_string(),
            description: String::new(),
            contract_date: None,
            completion_date: None,
            amount: Some(100000.0),
            amount_paid: None,
            status,
            phases: default_phases(),
            tags: vec![],
            category_id: None,
            notes: String::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn escape_html_ampersand() {
        assert_eq!(escape_html("A & B"), "A &amp; B");
    }

    #[test]
    fn escape_html_angle_brackets() {
        assert_eq!(escape_html("<div>"), "&lt;div&gt;");
    }

    #[test]
    fn escape_html_quotes() {
        assert_eq!(escape_html(r#"say "hello""#), "say &quot;hello&quot;");
    }

    #[test]
    fn escape_html_noop() {
        assert_eq!(escape_html("plain text"), "plain text");
    }

    #[test]
    fn generate_index_empty() {
        let html = generate_index(&[]);
        assert!(html.contains("<!DOCTYPE html>"));
        assert!(html.contains("0 progetti totali"));
        assert!(!html.contains("<tr data-status="));
    }

    #[test]
    fn generate_index_with_projects() {
        let projects = vec![
            make_project("C-001", "Bridge", "Client A", ProjectStatus::Bozza),
            make_project("C-002", "Road", "Client B", ProjectStatus::Completato),
        ];
        let html = generate_index(&projects);
        assert!(html.contains("2 progetti totali"));
        assert!(html.contains("C-001"));
        assert!(html.contains("Bridge"));
        assert!(html.contains("C-002"));
        assert!(html.contains("Client A"));
        assert!(html.contains("Client B"));
    }

    #[test]
    fn generate_index_escapes_html_in_data() {
        let projects = vec![make_project(
            "C-001",
            "Bridge <script>alert(1)</script>",
            "Client & Co",
            ProjectStatus::Bozza,
        )];
        let html = generate_index(&projects);
        // The project data should be escaped, but the page itself has a <script> for filtering
        assert!(html.contains("&lt;script&gt;"));
        assert!(html.contains("Client &amp; Co"));
    }

    #[test]
    fn generate_index_contains_search_and_filter() {
        let html = generate_index(&[]);
        assert!(html.contains("id=\"search\""));
        assert!(html.contains("id=\"statusFilter\""));
        assert!(html.contains("id=\"tbody\""));
    }

    #[test]
    fn generate_index_status_classes() {
        let projects = vec![make_project(
            "C-001",
            "Test",
            "Client",
            ProjectStatus::InCorso,
        )];
        let html = generate_index(&projects);
        assert!(html.contains("status-in_corso"));
        assert!(html.contains("In Corso"));
    }

    #[test]
    fn generate_index_amount_formatting() {
        let mut p = make_project("C-001", "Test", "Client", ProjectStatus::Bozza);
        p.amount = Some(123456.78);
        let html = generate_index(&[p]);
        assert!(html.contains("€123456.78"));
    }

    #[test]
    fn generate_index_file_and_photo_counts() {
        let mut p = make_project("C-001", "Test", "Client", ProjectStatus::Bozza);
        p.phases[0].files.push(crate::models::FileEntry {
            name: "doc.pdf".into(),
            path: "doc.pdf".into(),
            size: 1000,
            mime_type: Some("application/pdf".into()),
            created_at: None,
            photo_metadata: None,
        });
        p.phases[1].files.push(crate::models::FileEntry {
            name: "photo.jpg".into(),
            path: "photo.jpg".into(),
            size: 2000,
            mime_type: Some("image/jpeg".into()),
            created_at: None,
            photo_metadata: None,
        });
        let html = generate_index(&[p]);
        assert!(html.contains("1</td>")); // photo count
    }
}
