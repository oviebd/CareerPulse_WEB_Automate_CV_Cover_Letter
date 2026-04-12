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
    if (key !== 'personal' && key !== 'summary' && isEmpty(key, d)) return true;
    return false;
  }

  var RATING_PCT = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
  var RATING_LABEL = {
    1: 'Beginner',
    2: 'Basic',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Professional',
  };

  function clampRating(r) {
    var n = parseInt(r, 10);
    if (!isFinite(n)) return 3;
    if (n < 1) return 1;
    if (n > 5) return 5;
    return n;
  }

  /** Legacy level strings + numeric rating on skill items */
  function skillRatingFromItem(it) {
    if (!it || typeof it !== 'object') return 3;
    if (typeof it.rating === 'number') return clampRating(it.rating);
    var lv = it.level;
    if (lv == null || lv === '') return 3;
    var s = String(lv).toLowerCase();
    if (s === 'beginner') return 1;
    if (s === 'basic') return 2;
    if (s === 'intermediate') return 3;
    if (s === 'advanced') return 4;
    if (s === 'expert' || s === 'professional') return 5;
    return 3;
  }

  function skillBarFromItem(it) {
    var r = skillRatingFromItem(it);
    var pct = RATING_PCT[r] != null ? RATING_PCT[r] : 60;
    return (
      '<span class="skill-bar"><span class="skill-bar-fill" style="width:' +
      pct +
      '%"></span></span>'
    );
  }

  var PREMIUM_IDS = {
    'amber-strike': true,
    'midnight-pro': true,
    'golden-hour': true,
    'ocean-slate': true,
    'violet-edge': true,
  };

  function isPremiumTpl(id) {
    return !!PREMIUM_IDS[id];
  }

  function splitFullName(name) {
    var n = String(name || '').trim();
    if (!n) return { first: '', last: '' };
    var p = n.split(/\s+/);
    if (p.length === 1) return { first: p[0], last: '' };
    return { first: p.slice(0, -1).join(' '), last: p[p.length - 1] };
  }

  function nameInitial(name) {
    var n = String(name || '').trim();
    return n ? n.charAt(0).toUpperCase() : '?';
  }

  function linkDisplayUrl(href) {
    var u = String(href || '').trim();
    if (!u) return '';
    try {
      var url = new URL(u.indexOf('//') === -1 ? 'https://' + u : u);
      var h = url.hostname.replace(/^www\./, '');
      return h.length > 32 ? h.slice(0, 29) + '…' : h;
    } catch (e) {
      return u.length > 36 ? u.slice(0, 33) + '…' : u;
    }
  }

  function langProfLabel(p) {
    var m = {
      basic: 'Basic',
      conversational: 'Conversational',
      professional: 'Proficient',
      native: 'Native',
    };
    var k = String(p || '').toLowerCase();
    return m[k] || esc(p);
  }

  function skillFillPctFromItem(it) {
    var r = skillRatingFromItem(it);
    return RATING_PCT[r] != null ? RATING_PCT[r] : 60;
  }

  function contactBasicsBlock(p, lineClass) {
    var h = '';
    if (p.email)
      h +=
        '<div class="' +
        lineClass +
        '"><span class="plink-icon" aria-hidden="true">✉</span> ' +
        esc(p.email) +
        '</div>';
    if (p.phone)
      h +=
        '<div class="' +
        lineClass +
        '"><span class="plink-icon" aria-hidden="true">✆</span> ' +
        esc(p.phone) +
        '</div>';
    if (p.location)
      h +=
        '<div class="' +
        lineClass +
        '"><span class="plink-icon" aria-hidden="true">⌂</span> ' +
        esc(p.location) +
        '</div>';
    return h;
  }

  function extraPersonalLinksBlock(lk, lineClass) {
    lk = lk || {};
    var pairs = [
      ['linkedin', 'in', 'LinkedIn'],
      ['github', 'GH', 'GitHub'],
      ['portfolio', '◆', 'Portfolio'],
      ['website', '🔗', 'Web'],
      ['behance', 'Bē', 'Behance'],
      ['dribbble', 'Dr', 'Dribbble'],
      ['orcid', 'ID', 'ORCID'],
      ['googleScholar', 'Sch', 'Scholar'],
      ['researchGate', 'RG', 'ResearchGate'],
    ];
    var h = '';
    pairs.forEach(function (pr) {
      var key = pr[0];
      var v = lk[key];
      if (!v || !String(v).trim()) return;
      h +=
        '<div class="' +
        lineClass +
        '"><span class="plink-label">' +
        esc(pr[2]) +
        '</span> <a href="' +
        esc(v) +
        '">' +
        esc(linkDisplayUrl(v)) +
        '</a></div>';
    });
    return h;
  }

  function technologiesRow(tech) {
    if (!tech || !tech.length) return '';
    var h = '<div class="cv-tech-row">';
    tech.forEach(function (t) {
      h += '<span class="cv-tech-chip">' + esc(t) + '</span>';
    });
    h += '</div>';
    return h;
  }

  function premiumMainByOrder(tpl, key, d, cfg) {
    return renderMainSection(key, d, cfg, tpl);
  }

  function buildPremiumHtml(tpl, d, cfg, order) {
    var p = d.personal || {};
    var lk = p.links || {};
    var nm = splitFullName(p.fullName);
    var photoAllowed = !d.sectionVisibility || d.sectionVisibility.photo !== false;
    var showPh = cfg.showPhoto && d.meta && d.meta.showPhoto && photoAllowed;

    function amber() {
      var h = '';
      h += '<div class="cv-two-col cv-premium amber-grid">';
      h += '<aside class="cv-sidebar amber-side">';
      h += '<div class="amber-photo-stage">';
      h += '<span class="amber-shape amber-shape-rect"></span>';
      h += '<span class="amber-shape amber-shape-tri"></span>';
      if (showPh && p.photo) {
        h += '<img class="amber-photo" src="' + esc(p.photo) + '" alt="" />';
      } else if (showPh) {
        h +=
          '<span class="amber-photo amber-photo--initial">' +
          esc(nameInitial(p.fullName)) +
          '</span>';
      }
      h += '</div>';
      h += '<div class="amber-side-hd"><span class="amber-pill"></span>Contact</div>';
      h += '<div class="amber-side-body">' + contactBasicsBlock(p, 'amber-line') + extraPersonalLinksBlock(lk, 'amber-line') + '</div>';
      if (!shouldSkip('education', d, cfg)) {
        h += '<div class="amber-side-hd"><span class="amber-pill"></span>Education</div><div class="amber-side-body">';
        (d.education || []).forEach(function (e) {
          h += '<div class="amber-edu">';
          h += '<div class="amber-edu-inst">' + esc(e.institution) + '</div>';
          h +=
            '<div>' +
            esc(e.degree) +
            (e.field ? ' — ' + esc(e.field) : '') +
            '</div>';
          h +=
            '<div class="amber-muted">' +
            range(e.startDate, e.endDate, e.current) +
            '</div></div>';
        });
        h += '</div>';
      }
      if (!shouldSkip('references', d, cfg)) {
        h += '<div class="amber-side-hd"><span class="amber-pill"></span>References</div><div class="amber-side-body">';
        (d.references || []).forEach(function (r) {
          h += '<div class="amber-ref">';
          h += esc(r.name) + '<br/>' + esc(r.role) + ', ' + esc(r.company);
          if (r.email) h += '<br/>' + esc(r.email);
          h += '</div>';
        });
        h += '</div>';
      }
      h += '</aside><main class="cv-main amber-main">';
      h += '<header class="amber-main-head">';
      h +=
        '<h1 class="amber-name"><span class="amber-name-first">' +
        esc(nm.first) +
        '</span> <span class="amber-name-last">' +
        esc(nm.last) +
        '</span></h1>';
      if (p.title) h += '<div class="amber-jobtitle">' + esc(p.title) + '</div>';
      h += '</header>';
      order.forEach(function (key) {
        if (key === 'personal' || key === 'education' || key === 'references') return;
        if (key === 'experience' && !shouldSkip('experience', d, cfg)) {
          h +=
            '<section class="cv-section amber-main-sec"><div class="amber-sec-title">Experience</div>';
          (d.experience || []).forEach(function (e) {
            h += '<div class="cv-card amber-exp">';
            h += '<div class="amber-exp-line">';
            h += '<span class="amber-exp-co">' + esc(e.company) + '</span>';
            h +=
              '<span class="amber-exp-date">' +
              range(e.startDate, e.endDate, e.current) +
              '</span></div>';
            h += '<div class="amber-exp-role">' + esc(e.role) + '</div>';
            if (e.location) h += '<div class="amber-exp-loc">' + esc(e.location) + '</div>';
            if (e.bullets && e.bullets.length) {
              h += '<ul class="cv-bullets amber-bullets">';
              e.bullets.forEach(function (b) {
                h += '<li>' + esc(b) + '</li>';
              });
              h += '</ul>';
            }
            h += technologiesRow(e.technologies);
            h += '</div>';
          });
          h += '</section>';
          return;
        }
        h += premiumMainByOrder(tpl, key, d, cfg);
      });
      h += '</main></div>';
      return h;
    }

    function midnight() {
      var h = '';
      h += '<div class="cv-two-col cv-premium midnight-grid">';
      h += '<aside class="cv-sidebar midnight-side">';
      h += '<div class="midnight-photo-wrap">';
      if (showPh && p.photo) {
        h += '<img class="midnight-photo" src="' + esc(p.photo) + '" alt="" />';
      } else if (showPh) {
        h +=
          '<span class="midnight-photo midnight-photo--initial">' +
          esc(nameInitial(p.fullName)) +
          '</span>';
      }
      h += '</div>';
      h += '<div class="midnight-side-name">' + esc(p.fullName) + '</div>';
      if (p.title) h += '<div class="midnight-side-title">' + esc(p.title) + '</div>';
      h += '<div class="midnight-divider"></div>';
      h += '<div class="midnight-side-sec">Contact</div>';
      h += '<div class="midnight-side-body">' + contactBasicsBlock(p, 'midnight-line') + extraPersonalLinksBlock(lk, 'midnight-line') + '</div>';
      if (!shouldSkip('skills', d, cfg)) {
        h += '<div class="midnight-divider"></div><div class="midnight-side-sec">Skills</div><div class="midnight-side-body">';
        var cfgList = {
          id: cfg.id,
          showSkillBars: false,
          hideIfEmpty: cfg.hideIfEmpty || [],
        };
        h += renderSkillsBlock(d, cfgList, 'skills');
        h += renderSkillsBlock(d, cfgList, 'tools');
        h += '</div>';
      }
      if (!shouldSkip('languages', d, cfg)) {
        h += '<div class="midnight-divider"></div><div class="midnight-side-sec">Languages</div>';
        h += '<div class="midnight-lang-grid">';
        (d.languages || []).forEach(function (l) {
          h +=
            '<div class="midnight-lang-cell"><span>' +
            esc(l.name) +
            '</span><span>' +
            langProfLabel(l.proficiency) +
            '</span></div>';
        });
        h += '</div>';
      }
      if (!shouldSkip('interests', d, cfg)) {
        h += '<div class="midnight-divider"></div><div class="midnight-side-sec">Hobbies</div>';
        h += renderInterests(d);
      }
      h += '</aside><main class="cv-main midnight-main">';
      order.forEach(function (key) {
        if (
          key === 'personal' ||
          key === 'skills' ||
          key === 'languages' ||
          key === 'interests'
        )
          return;
        h += premiumMainByOrder(tpl, key, d, cfg);
      });
      h += '</main></div>';
      return h;
    }

    function goldenSideHdr(icon, title) {
      return (
        '<div class="golden-side-hd"><span class="golden-side-ico">' +
        esc(icon) +
        '</span><span>' +
        esc(title) +
        '</span></div>'
      );
    }

    function golden() {
      var h = '';
      h += '<div class="cv-two-col cv-premium golden-grid">';
      h += '<aside class="cv-sidebar golden-side">';
      h += '<div class="golden-photo-head">';
      if (showPh && p.photo) {
        h += '<img class="golden-photo" src="' + esc(p.photo) + '" alt="" />';
      } else if (showPh) {
        h +=
          '<span class="golden-photo golden-photo--initial">' +
          esc(nameInitial(p.fullName)) +
          '</span>';
      }
      h += '</div>';
      h += '<div class="golden-side-name">' + esc(p.fullName) + '</div>';
      if (p.title) h += '<div class="golden-side-title">' + esc(p.title) + '</div>';
      h += '<div class="golden-side-block">' + goldenSideHdr('◎', 'Contact') + '<div class="golden-side-txt">';
      h += contactBasicsBlock(p, 'golden-line') + extraPersonalLinksBlock(lk, 'golden-line');
      h += '</div></div>';
      if (!shouldSkip('skills', d, cfg)) {
        h += '<div class="golden-side-block">' + goldenSideHdr('◎', 'Skills') + '<div class="golden-skills">';
        (d.skills || []).forEach(function (g) {
          if (!g.items || !g.items.length) return;
          var cat = (g.category || '').toLowerCase();
          if (cat.indexOf('language') !== -1) return;
          g.items.forEach(function (it) {
            var name = typeof it === 'string' ? it : it.name;
            var pct = skillFillPctFromItem(
              typeof it === 'object' && it ? it : { name: String(name) }
            );
            var rr = skillRatingFromItem(
              typeof it === 'object' && it ? it : { name: String(name) }
            );
            h += '<div class="golden-skill skill-item">';
            h +=
              '<div class="golden-skill-name">' +
              esc(name) +
              '<span class="skill-label"> ' +
              esc(RATING_LABEL[rr] || '') +
              '</span></div>';
            h +=
              '<div class="golden-sbar"><span class="golden-sbar-fill" style="width:' +
              pct +
              '%"></span></div>';
            h += '</div>';
          });
        });
        h += '</div></div>';
      }
      if (!shouldSkip('languages', d, cfg)) {
        h += '<div class="golden-side-block">' + goldenSideHdr('◎', 'Languages') + '<div class="golden-side-txt">';
        (d.languages || []).forEach(function (l) {
          h +=
            '<div>' +
            esc(l.name) +
            ' · ' +
            langProfLabel(l.proficiency) +
            '</div>';
        });
        h += '</div></div>';
      }
      h += '</aside><main class="cv-main golden-main">';
      order.forEach(function (key) {
        if (key === 'personal' || key === 'skills' || key === 'languages') return;
        if (key === 'summary' && !shouldSkip('summary', d, cfg)) {
          h +=
            '<section class="cv-section golden-sec"><div class="golden-main-hd"><span class="golden-ico">◆</span><span>Profile</span></div><div class="golden-summary">' +
            esc(d.summary || '') +
            '</div></section>';
          return;
        }
        if (key === 'experience' && !shouldSkip('experience', d, cfg)) {
          h +=
            '<section class="cv-section golden-sec"><div class="golden-main-hd"><span class="golden-ico">◆</span><span>Experience</span></div><div class="golden-tl">';
          (d.experience || []).forEach(function (e) {
            h += '<div class="golden-tl-item">';
            h += '<span class="golden-tl-dot"></span><div class="golden-tl-body">';
            h += '<div class="golden-exp-title">' + esc(e.role) + '</div>';
            h +=
              '<div class="golden-exp-meta">' +
              esc(e.company) +
              (e.location ? ' | ' + esc(e.location) : '') +
              '</div>';
            h += '<div class="golden-exp-date">' + range(e.startDate, e.endDate, e.current) + '</div>';
            if (e.bullets && e.bullets.length) {
              h += '<ul class="cv-bullets golden-bullets">';
              e.bullets.forEach(function (b) {
                h += '<li>' + esc(b) + '</li>';
              });
              h += '</ul>';
            }
            h += technologiesRow(e.technologies);
            h += '</div></div>';
          });
          h += '</div></section>';
          return;
        }
        if (key === 'education' && !shouldSkip('education', d, cfg)) {
          h +=
            '<section class="cv-section golden-sec"><div class="golden-main-hd"><span class="golden-ico">◆</span><span>Education</span></div>';
          (d.education || []).forEach(function (e) {
            h += '<div class="golden-edu cv-card">';
            h += '<div class="golden-exp-title">' + esc(e.institution) + '</div>';
            h +=
              '<div>' +
              esc(e.degree) +
              (e.field ? ' — ' + esc(e.field) : '') +
              '</div>';
            h += '<div class="golden-exp-date">' + range(e.startDate, e.endDate, e.current) + '</div>';
            h += '</div>';
          });
          h += '</section>';
          return;
        }
        if (key === 'projects' && !shouldSkip('projects', d, cfg)) {
          h +=
            '<section class="cv-section golden-sec"><div class="golden-main-hd"><span class="golden-ico">◆</span><span>Portfolio</span></div>';
          (d.projects || []).forEach(function (pr) {
            h += '<div class="golden-proj cv-card">';
            h += '<div class="golden-proj-name">' + esc(pr.name) + '</div>';
            if (pr.description) h += '<div class="golden-proj-desc"><em>' + esc(pr.description) + '</em></div>';
            if (pr.bullets && pr.bullets.length) {
              h += '<ul class="cv-bullets golden-bullets">';
              pr.bullets.forEach(function (b) {
                h += '<li>' + esc(b) + '</li>';
              });
              h += '</ul>';
            }
            h += '</div>';
          });
          h += '</section>';
          return;
        }
        if (key === 'interests' && !shouldSkip('interests', d, cfg)) {
          h +=
            '<section class="cv-section golden-sec"><div class="golden-main-hd"><span class="golden-ico">◆</span><span>Interests</span></div>';
          h += '<div class="golden-pills">';
          (d.interests || []).forEach(function (x) {
            h += '<span class="golden-pill">' + esc(x) + '</span>';
          });
          h += '</div></section>';
          return;
        }
        h += premiumMainByOrder(tpl, key, d, cfg);
      });
      h += '</main></div>';
      return h;
    }

    function ocean() {
      var h = '';
      h += '<div class="cv-two-col cv-premium ocean-grid">';
      h += '<aside class="cv-sidebar ocean-side">';
      h += '<div class="ocean-photo-wrap">';
      if (showPh && p.photo) {
        h += '<img class="ocean-photo" src="' + esc(p.photo) + '" alt="" />';
      } else if (showPh) {
        h +=
          '<span class="ocean-photo ocean-photo--initial">' +
          esc(nameInitial(p.fullName)) +
          '</span>';
      }
      h += '</div>';
      h += '<div class="ocean-side-name">' + esc(p.fullName) + '</div>';
      if (p.title) h += '<div class="ocean-side-title">' + esc(p.title) + '</div>';
      h += '<div class="ocean-side-sec">Contact</div><div class="ocean-contact">';
      if (p.email)
        h +=
          '<div class="ocean-crow"><span class="ocean-cico">✉</span><span>' +
          esc(p.email) +
          '</span></div>';
      if (p.phone)
        h +=
          '<div class="ocean-crow"><span class="ocean-cico">✆</span><span>' +
          esc(p.phone) +
          '</span></div>';
      if (p.location)
        h +=
          '<div class="ocean-crow"><span class="ocean-cico">⌂</span><span>' +
          esc(p.location) +
          '</span></div>';
      var linkPairs = [
        ['linkedin', '🔗', lk.linkedin],
        ['github', '🔗', lk.github],
        ['portfolio', '🔗', lk.portfolio],
        ['website', '🔗', lk.website],
      ];
      linkPairs.forEach(function (lp) {
        var u = lp[2];
        if (!u || !String(u).trim()) return;
        h +=
          '<div class="ocean-crow"><span class="ocean-cico">' +
          lp[1] +
          '</span><a href="' +
          esc(u) +
          '">' +
          esc(linkDisplayUrl(u)) +
          '</a></div>';
      });
      h += '</div></aside><main class="cv-main ocean-main"><div class="ocean-topbar"></div>';
      order.forEach(function (key) {
        if (key === 'personal') return;
        if (key === 'skills' && !shouldSkip('skills', d, cfg)) {
          h +=
            '<section class="cv-section ocean-sec"><h2 class="ocean-h2">Skills</h2><div class="ocean-skill-bars">';
          (d.skills || []).forEach(function (g) {
            if (!g.items || !g.items.length) return;
            h +=
              '<div class="skill-category-block ocean-skill-cat"><div class="ocean-skill-cat-name">' +
              esc(g.category || '') +
              '</div>';
            g.items.forEach(function (it) {
              var name = typeof it === 'string' ? it : it.name;
              var obj = typeof it === 'object' && it ? it : { name: String(name) };
              var pct = skillFillPctFromItem(obj);
              var rr = skillRatingFromItem(obj);
              h += '<div class="ocean-skill-row skill-item">';
              h += '<div class="ocean-skill-hd"><span>' + esc(name) + '</span>';
              h += '<span class="skill-label">' + esc(RATING_LABEL[rr] || '') + '</span></div>';
              h +=
                '<div class="ocean-sbar"><span class="ocean-sbar-fill" style="width:' +
                pct +
                '%"></span></div>';
              h += '</div>';
            });
            h += '</div>';
          });
          h += '</div></section>';
          return;
        }
        if (key === 'experience' && !shouldSkip('experience', d, cfg)) {
          h += '<section class="cv-section ocean-sec"><h2 class="ocean-h2">Experience</h2>';
          (d.experience || []).forEach(function (e, idx) {
            if (idx) h += '<div class="ocean-exp-rule"></div>';
            h += '<div class="ocean-exp cv-card">';
            h +=
              '<div class="ocean-exp-line"><span class="ocean-role">' +
              esc(e.role) +
              '</span><span class="ocean-exp-date">' +
              range(e.startDate, e.endDate, e.current) +
              '</span></div>';
            h += '<div class="ocean-comp">' + esc(e.company) + '</div>';
            if (e.bullets && e.bullets.length) {
              h += '<ul class="cv-bullets">';
              e.bullets.forEach(function (b) {
                h += '<li>' + esc(b) + '</li>';
              });
              h += '</ul>';
            }
            h += technologiesRow(e.technologies);
            h += '</div>';
          });
          h += '</section>';
          return;
        }
        if (key === 'education' && !shouldSkip('education', d, cfg)) {
          h += '<section class="cv-section ocean-sec"><h2 class="ocean-h2">Education</h2>';
          (d.education || []).forEach(function (e) {
            h += '<div class="ocean-edu cv-card">';
            h += '<div class="ocean-edu-inst">' + esc(e.institution) + '</div>';
            h +=
              '<div class="ocean-edu-deg">' +
              esc(e.degree) +
              (e.field ? ' — ' + esc(e.field) : '') +
              '</div>';
            h += '<div class="ocean-muted">' + range(e.startDate, e.endDate, e.current) + '</div>';
            h += '</div>';
          });
          h += '</section>';
          return;
        }
        if (key === 'certifications' && !shouldSkip('certifications', d, cfg)) {
          h += '<section class="cv-section ocean-sec"><h2 class="ocean-h2">Certifications</h2>';
          (d.certifications || []).forEach(function (c) {
            h += '<div class="ocean-cert cv-card"><span class="ocean-cert-dot"></span>';
            h += esc(c.name) + ' — ' + esc(c.issuer) + ' · ' + esc(c.date);
            h += '</div>';
          });
          h += '</section>';
          return;
        }
        h += premiumMainByOrder(tpl, key, d, cfg);
      });
      h += '</main></div>';
      return h;
    }

    function violet() {
      var h = '';
      h += '<div class="cv-premium violet-wrap">';
      h += '<header class="violet-banner">';
      h += '<div class="violet-banner-text">';
      h +=
        '<div class="violet-banner-name">' +
        esc(p.fullName) +
        '</div>';
      if (p.title) h += '<div class="violet-banner-title">' + esc(p.title) + '</div>';
      h += '</div>';
      h += '<div class="violet-banner-photo">';
      if (showPh && p.photo) {
        h += '<img src="' + esc(p.photo) + '" alt="" class="violet-banner-img" />';
      } else if (showPh) {
        h +=
          '<span class="violet-banner-img violet-banner-initial">' +
          esc(nameInitial(p.fullName)) +
          '</span>';
      }
      h += '</div></header>';
      h += '<div class="violet-body">';
      h += '<main class="violet-main">';
      order.forEach(function (key) {
        if (
          key === 'personal' ||
          key === 'skills' ||
          key === 'languages' ||
          key === 'interests'
        )
          return;
        if (key === 'experience' && !shouldSkip('experience', d, cfg)) {
          h +=
            '<section class="cv-section violet-sec"><h2 class="violet-h2">Experience</h2><div class="violet-tl">';
          (d.experience || []).forEach(function (e) {
            h += '<div class="violet-tl-item"><div class="violet-tl-dot"></div><div class="violet-tl-content">';
            h += '<div class="violet-exp-role">' + esc(e.role) + '</div>';
            h +=
              '<div class="violet-exp-meta">' +
              esc(e.company) +
              ' · ' +
              range(e.startDate, e.endDate, e.current) +
              '</div>';
            if (e.bullets && e.bullets.length) {
              h += '<ul class="cv-bullets">';
              e.bullets.forEach(function (b) {
                h += '<li>' + esc(b) + '</li>';
              });
              h += '</ul>';
            }
            h += technologiesRow(e.technologies);
            h += '</div></div>';
          });
          h += '</div></section>';
          return;
        }
        if (key === 'projects' && !shouldSkip('projects', d, cfg)) {
          h += '<section class="cv-section violet-sec"><h2 class="violet-h2">Projects</h2>';
          (d.projects || []).forEach(function (pr) {
            h += '<div class="violet-proj-card cv-card">';
            h += '<div class="violet-proj-name">' + esc(pr.name) + '</div>';
            if (pr.description) h += '<p>' + esc(pr.description) + '</p>';
            if (pr.technologies && pr.technologies.length) {
              h += '<div class="violet-proj-tech">';
              pr.technologies.forEach(function (t) {
                h += '<span class="violet-tech-chip">' + esc(t) + '</span>';
              });
              h += '</div>';
            }
            h += '</div>';
          });
          h += '</section>';
          return;
        }
        if (key === 'certifications' && !shouldSkip('certifications', d, cfg)) {
          h += '<section class="cv-section violet-sec"><h2 class="violet-h2">Certifications</h2><div class="violet-cert-row">';
          (d.certifications || []).forEach(function (c) {
            h +=
              '<span class="violet-cert-badge">' +
              esc(c.name) +
              '</span>';
          });
          h += '</div></section>';
          return;
        }
        h += premiumMainByOrder(tpl, key, d, cfg);
      });
      h += '</main><aside class="violet-side">';
      h += '<div class="violet-side-sec">Contact</div><div class="violet-side-body">';
      h += contactBasicsBlock(p, 'violet-line') + extraPersonalLinksBlock(lk, 'violet-line');
      h += '</div>';
      if (!shouldSkip('skills', d, cfg)) {
        h += '<div class="violet-side-sec">Skills</div><div class="violet-side-body">';
        (d.skills || []).forEach(function (g) {
          if (!g.items || !g.items.length) return;
          g.items.forEach(function (it) {
            var name = typeof it === 'string' ? it : it.name;
            var obj = typeof it === 'object' && it ? it : { name: String(name) };
            var n = skillRatingFromItem(obj);
            h +=
              '<div class="violet-skill-row skill-item"><span>' +
              esc(name) +
              '</span><span class="violet-dots" aria-label="' +
              n +
              ' of 5">';
            var j;
            for (j = 0; j < 5; j++) {
              h += '<span class="' + (j < n ? 'violet-dot on' : 'violet-dot') + '">●</span>';
            }
            h += '</span></div>';
          });
        });
        h += '</div>';
      }
      if (!shouldSkip('languages', d, cfg)) {
        h += '<div class="violet-side-sec">Languages</div><div class="violet-side-body">';
        (d.languages || []).forEach(function (l) {
          h +=
            '<div>' +
            esc(l.name) +
            ' · ' +
            langProfLabel(l.proficiency) +
            '</div>';
        });
        h += '</div>';
      }
      if (!shouldSkip('interests', d, cfg)) {
        h += '<div class="violet-side-sec">Interests</div><div class="violet-side-body">';
        (d.interests || []).forEach(function (x) {
          h += '<div>· ' + esc(x) + '</div>';
        });
        h += '</div>';
      }
      h += '</aside></div></div>';
      return h;
    }

    if (tpl === 'amber-strike') return amber();
    if (tpl === 'midnight-pro') return midnight();
    if (tpl === 'golden-hour') return golden();
    if (tpl === 'ocean-slate') return ocean();
    if (tpl === 'violet-edge') return violet();
    return '';
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
        html += '<div class="skill-group skill-group--compact skill-category-block">';
        html += '<div class="skill-cat">' + esc(g.category) + '</div>';
        html += '<div class="skill-inline">';
        var parts = [];
        g.items.forEach(function (it) {
          var name = typeof it === 'string' ? it : it.name;
          var piece = esc(name);
          if (cfg.showSkillBars && it && typeof it === 'object') {
            var rc = skillRatingFromItem(it);
            piece +=
              ' <span class="skill-inline-level">(' + esc(RATING_LABEL[rc] || '') + ')</span>';
          } else if (it && typeof it === 'object') {
            var r0 = skillRatingFromItem(it);
            piece +=
              ' <span class="skill-level skill-level-' +
              r0 +
              '">' +
              esc(RATING_LABEL[r0] || '') +
              '</span>';
          }
          parts.push(piece);
        });
        html += parts.join(', ');
        html += '</div></div>';
        return;
      }
      html += '<div class="skill-group skill-category-block">';
      html += '<div class="skill-cat">' + esc(g.category) + '</div>';
      g.items.forEach(function (it) {
        var name = typeof it === 'string' ? it : it.name;
        var rr = skillRatingFromItem(it && typeof it === 'object' ? it : { name: name });
        html += '<div class="skill-row skill-item">';
        html += '<span class="skill-name">' + esc(name) + '</span>';
        if (cfg.showSkillBars) {
          html += '<span class="skill-label">' + esc(RATING_LABEL[rr] || '') + '</span>';
          html += skillBarFromItem(it && typeof it === 'object' ? it : { name: String(name) });
        } else {
          html +=
            '<span class="skill-level skill-level-' +
            rr +
            '">' +
            esc(RATING_LABEL[rr] || '') +
            '</span>';
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
    var wantHeadshot =
      cfg.showPhoto && d.meta && d.meta.showPhoto && photoAllowed;
    var showPhoto = wantHeadshot && p.photo;
    var showInitial = wantHeadshot && !p.photo;
    var html = '<header class="cv-header">';
    if (showPhoto) {
      html +=
        '<img class="cv-photo" src="' +
        esc(p.photo) +
        '" alt="" />';
    } else if (showInitial) {
      html +=
        '<span class="cv-photo cv-photo--initial" aria-hidden="true">' +
        esc(nameInitial(p.fullName)) +
        '</span>';
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
      esc(d.summary || '') +
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
      html += technologiesRow(e.technologies);
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
      if (p.description) html += '<p>' + esc(p.description) + '</p>';
      html += technologiesRow(p.technologies);
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
    if (d.meta && d.meta.colorScheme && !isPremiumTpl(tpl)) {
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

    if (isPremiumTpl(tpl)) {
      html += buildPremiumHtml(tpl, d, cfg, order);
    } else if (cfg.layout === 'two-column') {
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
