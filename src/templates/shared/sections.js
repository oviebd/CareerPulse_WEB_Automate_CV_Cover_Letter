/* eslint-disable no-undef */
(function () {
  function esc(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatYm(ym) {
    if (!ym || typeof ym !== 'string') return '';
    var m = ym.trim().match(/^(\d{4})-(\d{1,2})/);
    if (!m) return esc(ym);
    var months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    var mi = Math.min(12, Math.max(1, parseInt(m[2], 10))) - 1;
    return months[mi] + ' ' + m[1];
  }

  function range(start, end, cur) {
    var a = formatYm(start);
    var b = cur ? 'Present' : formatYm(end);
    return esc(a) + ' – ' + esc(b);
  }

  function isEmpty(key, d) {
    switch (key) {
      case 'personal':
        return !d.personal || !String(d.personal.fullName || '').trim();
      case 'summary':
        return !String(d.summary || '').trim();
      case 'experience':
        return !(d.experience && d.experience.length);
      case 'education':
        return !(d.education && d.education.length);
      case 'skills':
        return !(d.skills && d.skills.some(function (g) { return g.items && g.items.length; }));
      case 'projects':
        return !(d.projects && d.projects.length);
      case 'publications':
        return !(d.publications && d.publications.length);
      case 'research':
        return !(d.research && d.research.length);
      case 'certifications':
        return !(d.certifications && d.certifications.length);
      case 'awards':
        return !(d.awards && d.awards.length);
      case 'volunteer':
        return !(d.volunteer && d.volunteer.length);
      case 'languages':
        return !(d.languages && d.languages.length);
      case 'interests':
        return !(d.interests && d.interests.length);
      case 'references':
        return !(d.references && d.references.length);
      case 'custom':
        return !(d.custom && d.custom.length);
      case 'address':
        return !String(d.postalAddress || '').trim();
      default:
        return false;
    }
  }

  function hideKey(key, cfg, d) {
    return cfg.hideIfEmpty && cfg.hideIfEmpty.indexOf(key) !== -1 && isEmpty(key, d);
  }

  /** User toggles in editor (sectionVisibility); mirrors CVSectionVisibilityKey. */
  function sectionHiddenByUser(key, d) {
    var vis = d.sectionVisibility;
    if (!vis) return false;
    return vis[key] === false;
  }

  /** Hide: user turned section off, template hide-if-empty, or no content (no bare headers). */
  function shouldSkip(key, d, cfg) {
    if (sectionHiddenByUser(key, d)) return true;
    if (hideKey(key, cfg, d)) return true;
    // Header may still show contact links if name is empty — only hide via visibility/hideKey.
    if (key !== 'personal' && isEmpty(key, d)) return true;
    return false;
  }

  function skillBar(level) {
    var pct = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 };
    var p = pct[level] || 60;
    return (
      '<span class="skill-bar"><span class="skill-bar-fill" style="width:' +
      p +
      '%"></span></span>'
    );
  }

  /** Single-column layouts: one comma-separated line per category (saves vertical space). */
  function skillsInlineByCategory(cfg) {
    var id = cfg && cfg.id;
    return (
      id === 'classic' ||
      id === 'academic' ||
      id === 'minimal' ||
      id === 'healthcare' ||
      id === 'entry-level'
    );
  }

  function renderSkillsBlock(d, cfg, filterCat) {
    var groups = d.skills || [];
    var html = '';
    var compact = skillsInlineByCategory(cfg);
    groups.forEach(function (g) {
      var cat = (g.category || '').toLowerCase();
      if (filterCat === 'tools' && cat.indexOf('tool') === -1) return;
      if (filterCat === 'languages' && cat.indexOf('language') === -1) return;
      if (filterCat === 'skills' && (cat === 'languages' || cat === 'tools')) return;
      if (!g.items || !g.items.length) return;
      if (compact) {
        html += '<div class="skill-group skill-group--compact">';
        html += '<div class="skill-cat">' + esc(g.category) + '</div>';
        html += '<div class="skill-inline">';
        var parts = [];
        g.items.forEach(function (it) {
          var name = typeof it === 'string' ? it : it.name;
          var piece = esc(name);
          if (cfg.showSkillBars && it && typeof it === 'object' && it.level) {
            piece += ' <span class="skill-inline-level">(' + esc(it.level) + ')</span>';
          }
          parts.push(piece);
        });
        html += parts.join(', ');
        html += '</div></div>';
        return;
      }
      html += '<div class="skill-group">';
      html += '<div class="skill-cat">' + esc(g.category) + '</div>';
      g.items.forEach(function (it) {
        var name = typeof it === 'string' ? it : it.name;
        html += '<div class="skill-row">';
        html += '<span class="skill-name">' + esc(name) + '</span>';
        if (cfg.showSkillBars && it.level) {
          html += skillBar(it.level);
        }
        html += '</div>';
      });
      html += '</div>';
    });
    return html;
  }

  function renderLanguages(d) {
    var html = '<div class="lang-list">';
    (d.languages || []).forEach(function (l) {
      html +=
        '<div class="lang-row">' +
        esc(l.name) +
        ' · ' +
        esc(l.proficiency) +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderCertSidebar(d) {
    var html = '';
    (d.certifications || []).forEach(function (c) {
      html +=
        '<div class="cert-pill">' +
        esc(c.name) +
        '</div>';
    });
    return html;
  }

  function renderInterests(d) {
    return (
      '<div class="interest-tags">' +
      (d.interests || [])
        .map(function (x) {
          return '<span class="tag">' + esc(x) + '</span>';
        })
        .join(' ') +
      '</div>'
    );
  }

  function sidebarSlot(key, d, cfg) {
    if (key === 'skills' || key === 'tools') {
      if (shouldSkip('skills', d, cfg)) return '';
    } else if (shouldSkip(key, d, cfg)) {
      return '';
    }
    if (key === 'skills') return renderSkillsBlock(d, cfg, 'skills');
    if (key === 'tools') return renderSkillsBlock(d, cfg, 'tools');
    if (key === 'languages') {
      if (!d.languages || !d.languages.length) return '';
      return '<div class="cv-section"><div class="cv-section-title">Languages</div>' +
        renderLanguages(d) +
        '</div>';
    }
    if (key === 'certifications') {
      if (!d.certifications || !d.certifications.length) return '';
      return '<div class="cv-section"><div class="cv-section-title">Certifications</div>' +
        renderCertSidebar(d) +
        '</div>';
    }
    if (key === 'interests') {
      if (!d.interests || !d.interests.length) return '';
      return '<div class="cv-section"><div class="cv-section-title">Interests</div>' +
        renderInterests(d) +
        '</div>';
    }
    return '';
  }

  function headerBlock(d, cfg) {
    var p = d.personal || {};
    var photoAllowed = !d.sectionVisibility || d.sectionVisibility.photo !== false;
    var showPhoto = cfg.showPhoto && d.meta && d.meta.showPhoto && p.photo && photoAllowed;
    var html = '<header class="cv-header">';
    if (showPhoto) {
      html +=
        '<img class="cv-photo" src="' +
        esc(p.photo) +
        '" alt="" />';
    }
    html += '<div class="cv-header-text">';
    html += '<h1>' + esc(p.fullName) + '</h1>';
    if (p.title) html += '<div class="cv-subtitle">' + esc(p.title) + '</div>';
    html += '<div class="cv-contact">';
    var parts = [];
    if (p.email) parts.push(esc(p.email));
    if (p.phone) parts.push(esc(p.phone));
    if (p.location) parts.push(esc(p.location));
    var lk = p.links || {};
    if (lk.linkedin)
      parts.push(
        '<a href="' +
          esc(lk.linkedin) +
          '">LinkedIn</a>'
      );
    if (lk.github)
      parts.push('<a href="' + esc(lk.github) + '">GitHub</a>');
    if (lk.portfolio)
      parts.push('<a href="' + esc(lk.portfolio) + '">Portfolio</a>');
    if (lk.website)
      parts.push('<a href="' + esc(lk.website) + '">Website</a>');
    html += parts.join(' · ');
    html += '</div></div></header>';
    return html;
  }

  function sectionPersonal(d, cfg) {
    if (shouldSkip('personal', d, cfg)) return '';
    return headerBlock(d, cfg);
  }

  function sectionSummary(d, cfg) {
    if (shouldSkip('summary', d, cfg)) return '';
    return (
      '<section class="cv-section"><div class="cv-section-title">Summary</div><div class="cv-summary">' +
      esc(d.summary) +
      '</div></section>'
    );
  }

  function sectionExperience(d, cfg, tpl) {
    if (shouldSkip('experience', d, cfg)) return '';
    var html =
      '<section class="cv-section"><div class="cv-section-title">' +
      (tpl === 'healthcare' ? 'Clinical experience' : 'Experience') +
      '</div>';
    (d.experience || []).forEach(function (e) {
      html += '<div class="cv-card exp-block">';
      html += '<div class="cv-line"><span class="cv-strong">' + esc(e.company) + '</span>';
      html +=
        '<span class="cv-dates">' +
        range(e.startDate, e.endDate, e.current) +
        '</span></div>';
      html += '<div class="cv-role">' + esc(e.role) + '</div>';
      if (e.location)
        html += '<div class="cv-muted">' + esc(e.location) + '</div>';
      if (e.bullets && e.bullets.length) {
        html += '<ul class="cv-bullets">';
        e.bullets.forEach(function (b) {
          html += '<li>' + esc(b) + '</li>';
        });
        html += '</ul>';
      }
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionEducation(d, cfg) {
    if (shouldSkip('education', d, cfg)) return '';
    var html = '<section class="cv-section"><div class="cv-section-title">Education</div>';
    (d.education || []).forEach(function (e) {
      html += '<div class="cv-card edu-block">';
      html += '<div class="cv-line"><span class="cv-strong">' + esc(e.institution) + '</span>';
      html +=
        '<span class="cv-dates">' +
        range(e.startDate, e.endDate, e.current) +
        '</span></div>';
      html +=
        '<div>' +
        esc(e.degree) +
        (e.field ? ' — ' + esc(e.field) : '') +
        '</div>';
      if (e.gpa) html += '<div class="cv-muted">GPA: ' + esc(e.gpa) + '</div>';
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionSkillsMain(d, cfg) {
    if (shouldSkip('skills', d, cfg)) return '';
    var html = '<section class="cv-section"><div class="cv-section-title">Skills</div>';
    html += renderSkillsBlock(d, cfg, 'skills');
    html += renderSkillsBlock(d, cfg, 'tools');
    var langs = d.skills && d.skills.filter(function (g) {
      return (g.category || '').toLowerCase().indexOf('language') !== -1;
    });
    if (langs && langs.length) {
      langs.forEach(function (g) {
        html += '<div class="skill-plain">' + esc(g.category) + ': ';
        html += (g.items || [])
          .map(function (it) {
            return esc(typeof it === 'string' ? it : it.name);
          })
          .join(', ');
        html += '</div>';
      });
    }
    html += '</section>';
    return html;
  }

  function sectionProjects(d, cfg) {
    if (shouldSkip('projects', d, cfg)) return '';
    var html = '<section class="cv-section"><div class="cv-section-title">Projects</div>';
    (d.projects || []).forEach(function (p) {
      html += '<div class="cv-card proj-block">';
      html += '<div class="cv-strong">' + esc(p.name) + '</div>';
      if (p.technologies && p.technologies.length) {
        html +=
          '<div class="cv-tech">' +
          p.technologies.map(function (t) {
            return esc(t);
          }).join(' · ') +
          '</div>';
      }
      if (p.description) html += '<p>' + esc(p.description) + '</p>';
      if (p.links && p.links.length) {
        p.links.forEach(function (l) {
          html +=
            '<div><a href="' +
            esc(l.url) +
            '">' +
            esc(l.label) +
            '</a></div>';
        });
      }
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionPublications(d, cfg, tpl) {
    if (shouldSkip('publications', d, cfg)) return '';
    var html =
      '<section class="cv-section"><div class="cv-section-title">Publications</div><ol class="pub-list">';
    (d.publications || []).forEach(function (p, i) {
      html += '<li class="pub-row">';
      if (tpl === 'academic') {
        html += esc(p.authors && p.authors.length ? p.authors.join(', ') : '') + ' ';
      }
      html += esc(p.title) + '. <em>' + esc(p.journal) + '</em> (' + esc(p.year) + ').';
      if (p.doi) html += ' DOI: ' + esc(p.doi);
      html += '</li>';
    });
    html += '</ol></section>';
    return html;
  }

  function sectionResearch(d, cfg) {
    if (shouldSkip('research', d, cfg)) return '';
    var html = '<section class="cv-section"><div class="cv-section-title">Research</div>';
    (d.research || []).forEach(function (r) {
      html += '<div class="cv-card">';
      html += '<div class="cv-strong">' + esc(r.title) + '</div>';
      html += '<div>' + esc(r.institution) + ' · ' + esc(r.role) + '</div>';
      html += '<p>' + esc(r.description) + '</p>';
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionCertifications(d, cfg, tpl) {
    if (shouldSkip('certifications', d, cfg)) return '';
    var html =
      '<section class="cv-section"><div class="cv-section-title">' +
      (tpl === 'healthcare' ? 'Licenses & certifications' : 'Certifications') +
      '</div>';
    (d.certifications || []).forEach(function (c) {
      html += '<div class="cv-card">';
      if (tpl === 'healthcare') {
        html += '<span class="lic-badge">' + esc(c.name) + '</span> ';
      }
      html += '<span class="cv-strong">' + esc(c.name) + '</span> — ' + esc(c.issuer);
      html += ' · ' + esc(c.date);
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionAwards(d, cfg) {
    if (shouldSkip('awards', d, cfg)) return '';
    var html = '<section class="cv-section"><div class="cv-section-title">Awards</div>';
    (d.awards || []).forEach(function (a) {
      html += '<div class="cv-card">' + esc(a.title) + ' — ' + esc(a.issuer) + ' (' + esc(a.date) + ')</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionVolunteer(d, cfg) {
    if (shouldSkip('volunteer', d, cfg)) return '';
    var html = '<section class="cv-section"><div class="cv-section-title">Volunteer</div>';
    (d.volunteer || []).forEach(function (v) {
      html += '<div class="cv-card">';
      html += '<div class="cv-strong">' + esc(v.organization) + '</div>';
      html += '<div>' + esc(v.role) + '</div>';
      html += '<p>' + esc(v.description) + '</p>';
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionLanguagesMain(d, cfg) {
    if (shouldSkip('languages', d, cfg)) return '';
    return (
      '<section class="cv-section"><div class="cv-section-title">Languages</div>' +
      renderLanguages(d) +
      '</section>'
    );
  }

  function sectionReferences(d, cfg) {
    if (shouldSkip('references', d, cfg)) return '';
    var html = '<section class="cv-section"><div class="cv-section-title">References</div>';
    d.references.forEach(function (r) {
      html += '<div class="cv-card">';
      html += esc(r.name) + ', ' + esc(r.role) + ' — ' + esc(r.company);
      if (r.email) html += '<br/>' + esc(r.email);
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function sectionCustom(d, cfg) {
    if (shouldSkip('custom', d, cfg)) return '';
    var html = '';
    (d.custom || []).forEach(function (cs) {
      html += '<section class="cv-section"><div class="cv-section-title">' + esc(cs.title) + '</div>';
      (cs.items || []).forEach(function (it) {
        html += '<div class="cv-card">';
        html += '<div class="cv-strong">' + esc(it.heading) + '</div>';
        if (it.subheading) html += '<div>' + esc(it.subheading) + '</div>';
        if (it.date) html += '<div class="cv-muted">' + esc(it.date) + '</div>';
        if (it.description) html += '<p>' + esc(it.description) + '</p>';
        if (it.bullets && it.bullets.length) {
          html += '<ul class="cv-bullets">';
          it.bullets.forEach(function (b) {
            html += '<li>' + esc(b) + '</li>';
          });
          html += '</ul>';
        }
        html += '</div>';
      });
      html += '</section>';
    });
    return html;
  }

  /**
   * Keep user's section order when possible; insert any new keys from `catalog`
   * (e.g. `projects` added to Classic) next to their catalog neighbors.
   */
  function mergeSectionOrderWithCatalog(saved, catalog) {
    if (!catalog || !catalog.length) return saved || [];
    if (!saved || !saved.length) return catalog.slice();

    var catSet = {};
    catalog.forEach(function (k) {
      catSet[k] = true;
    });
    var out = saved.filter(function (k) {
      return catSet[k];
    });
    var have = {};
    out.forEach(function (k) {
      have[k] = true;
    });

    catalog.forEach(function (k) {
      if (have[k]) return;
      var idx = catalog.indexOf(k);
      var insertAt = out.length;
      for (var p = idx - 1; p >= 0; p--) {
        var prev = catalog[p];
        var pos = out.indexOf(prev);
        if (pos !== -1) {
          insertAt = pos + 1;
          break;
        }
      }
      if (insertAt === out.length) {
        for (var n = idx + 1; n < catalog.length; n++) {
          var next = catalog[n];
          var pos2 = out.indexOf(next);
          if (pos2 !== -1) {
            insertAt = pos2;
            break;
          }
        }
      }
      out.splice(insertAt, 0, k);
      have[k] = true;
    });
    return out;
  }

  function renderMainSection(key, d, cfg, tpl) {
    switch (key) {
      case 'personal':
        return sectionPersonal(d, cfg);
      case 'summary':
        return sectionSummary(d, cfg);
      case 'experience':
        return sectionExperience(d, cfg, tpl);
      case 'education':
        return sectionEducation(d, cfg);
      case 'skills':
        return sectionSkillsMain(d, cfg);
      case 'projects':
        return sectionProjects(d, cfg);
      case 'publications':
        return sectionPublications(d, cfg, tpl);
      case 'research':
        return sectionResearch(d, cfg);
      case 'certifications':
        return sectionCertifications(d, cfg, tpl);
      case 'awards':
        return sectionAwards(d, cfg);
      case 'volunteer':
        return sectionVolunteer(d, cfg);
      case 'languages':
        return sectionLanguagesMain(d, cfg);
      case 'references':
        return sectionReferences(d, cfg);
      case 'custom':
        return sectionCustom(d, cfg);
      case 'interests':
        if (cfg.layout === 'two-column') return '';
        if (shouldSkip('interests', d, cfg)) return '';
        return (
          '<section class="cv-section"><div class="cv-section-title">Interests</div>' +
          renderInterests(d) +
          '</section>'
        );
      default:
        return '';
    }
  }

  function render() {
    var d = window.__CV_DATA__;
    var cfg = window.__TEMPLATE_CONFIG__;
    var tpl = cfg.id;
    var root = document.getElementById('cv-root');
    if (!root || !d) return;

    document.body.className = 'cv-page tpl-' + tpl;
    if (d.meta && d.meta.colorScheme) {
      document.documentElement.style.setProperty('--cv-accent', d.meta.colorScheme);
    }

    var catalog = cfg.sectionOrder || [];
    var savedRaw =
      d.meta && d.meta.sectionOrder && d.meta.sectionOrder.length
        ? d.meta.sectionOrder
        : [];
    var order = mergeSectionOrderWithCatalog(savedRaw, catalog);

    var html = '';
    if (d.postalAddress && !shouldSkip('address', d, cfg)) {
      html +=
        '<div class="cv-postal">' + esc(d.postalAddress) + '</div>';
    }

    if (cfg.layout === 'two-column') {
      html += '<div class="cv-two-col">';
      html += '<aside class="cv-sidebar">';
      (cfg.sidebarSections || []).forEach(function (sk) {
        html += sidebarSlot(sk, d, cfg);
      });
      html += '</aside><main class="cv-main">';
      order.forEach(function (key) {
        if ((cfg.sidebarSections || []).indexOf(key) !== -1) return;
        html += renderMainSection(key, d, cfg, tpl);
      });
      html += '</main></div>';
    } else {
      order.forEach(function (key) {
        html += renderMainSection(key, d, cfg, tpl);
      });
    }

    if (d.watermark) {
      html +=
        '<div class="watermark">Created with CareerPulse</div>';
    }

    root.innerHTML = html;
  }

  render();
})();
