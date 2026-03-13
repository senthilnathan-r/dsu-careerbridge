// ATS-friendly professional resume HTML template
export function RESUME_TEMPLATE_HTML(resumeData: any): string {
  const { summary, sections, name, contactLine } = resumeData;
  const studentName = name || 'Student Name';
  const contactStr = contactLine || '';

  const renderSection = (section: any): string => {
    switch (section.type) {
      case 'education':
        return renderEducation(section.content);
      case 'experience':
        return renderExperience(section.content);
      case 'projects':
        return renderProjects(section.content);
      case 'skills':
        return renderSkills(section.content);
      case 'certifications':
        return renderCertifications(section.content);
      case 'achievements':
        return renderAchievements(section.content);
      default:
        return `<p>${JSON.stringify(section.content)}</p>`;
    }
  };

  const sortedSections = [...(sections || [])].sort((a, b) => a.order - b.order);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 10.5pt;
      line-height: 1.4;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px 30px;
    }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #2c3e8c; padding-bottom: 12px; }
    .name { font-size: 22pt; font-weight: 700; color: #1a237e; letter-spacing: 0.5px; }
    .contact { font-size: 9pt; color: #444; margin-top: 6px; }
    .contact a { color: #2c3e8c; text-decoration: none; }
    .section { margin-bottom: 14px; }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1a237e;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #2c3e8c;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .summary { font-size: 10pt; color: #333; text-align: justify; }
    .edu-item, .exp-item, .proj-item { margin-bottom: 10px; }
    .item-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .item-title { font-weight: 700; font-size: 10.5pt; }
    .item-subtitle { font-style: italic; color: #444; }
    .item-date { font-size: 9.5pt; color: #555; white-space: nowrap; }
    .item-cgpa { font-weight: 600; color: #2c3e8c; }
    ul { margin-left: 18px; margin-top: 4px; }
    ul li { margin-bottom: 3px; font-size: 10pt; }
    .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
    .skill-cat { font-weight: 600; }
    .cert-item { display: flex; justify-content: space-between; margin-bottom: 5px; }
    @media print {
      body { padding: 10px 20px; }
      a { text-decoration: none; color: inherit; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${studentName}</div>
    <div class="contact">${contactStr}</div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">${summary}</p>
  </div>` : ''}

  ${sortedSections.map((s) => `
  <div class="section">
    <div class="section-title">${s.title}</div>
    ${renderSection(s)}
  </div>`).join('')}
</body>
</html>`;
}

function renderEducation(content: any): string {
  if (!Array.isArray(content)) return '';
  return content.map((edu) => `
    <div class="edu-item">
      <div class="item-header">
        <span class="item-title">${edu.institution || ''}</span>
        <span class="item-date">${edu.year || ''}</span>
      </div>
      <div class="item-subtitle">${edu.degree || ''}${edu.field ? ` in ${edu.field}` : ''}</div>
      ${edu.cgpa ? `<div class="item-cgpa">CGPA: ${edu.cgpa}</div>` : ''}
    </div>`).join('');
}

function renderExperience(content: any): string {
  if (!Array.isArray(content)) return '';
  return content.map((exp) => `
    <div class="exp-item">
      <div class="item-header">
        <span class="item-title">${exp.role || ''}</span>
        <span class="item-date">${exp.duration || ''}</span>
      </div>
      <div class="item-subtitle">${exp.company || ''}</div>
      ${exp.bullets?.length ? `<ul>${exp.bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul>` : ''}
    </div>`).join('');
}

function renderProjects(content: any): string {
  if (!Array.isArray(content)) return '';
  return content.map((proj) => `
    <div class="proj-item">
      <div class="item-header">
        <span class="item-title">${proj.title || ''}</span>
        ${proj.repoUrl ? `<a href="${proj.repoUrl}" class="item-date">GitHub</a>` : ''}
      </div>
      ${proj.techStack?.length ? `<div class="item-subtitle">Tech: ${proj.techStack.join(', ')}</div>` : ''}
      ${proj.bullets?.length ? `<ul>${proj.bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul>` : ''}
    </div>`).join('');
}

function renderSkills(content: any): string {
  if (typeof content === 'object' && !Array.isArray(content)) {
    return `<div class="skills-grid">${Object.entries(content).map(([cat, skills]) =>
      `<div><span class="skill-cat">${cat}:</span> ${(skills as string[]).join(', ')}</div>`
    ).join('')}</div>`;
  }
  if (Array.isArray(content)) {
    return `<p>${content.join(' • ')}</p>`;
  }
  return '';
}

function renderCertifications(content: any): string {
  if (!Array.isArray(content)) return '';
  return content.map((cert) => `
    <div class="cert-item">
      <span>${cert.name || ''} — <em>${cert.issuer || ''}</em></span>
      <span>${cert.year || ''}</span>
    </div>`).join('');
}

function renderAchievements(content: any): string {
  if (Array.isArray(content)) {
    return `<ul>${content.map((a: string) => `<li>${a}</li>`).join('')}</ul>`;
  }
  return '';
}
