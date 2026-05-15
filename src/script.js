// Inject premium layout extensions and style overrides
if (!document.getElementById('impr-dynamic-styles')) {
  const style = document.createElement('style');
  style.id = 'impr-dynamic-styles';
  style.innerHTML = `
    /* Remove left-sided vertical bar layout */
    .improved-course-card--additional-details::before {
      display: none !important;
    }
    /* Structural adjustments for the container cards */
    [class^="enrolled-course-card--container--"] {
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .impr__badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid;
      font-size: 11px;
      margin: 2px;
      white-space: nowrap;
      cursor: help; /* Changes cursor to a help pointer to indicate hovering provides information */
    }
    /* Explicitly kill any pseudo-element layout elements creating black arrows or speech artifacts on hover */
    .impr__badge:hover::before,
    .impr__badge:hover::after {
      display: none !important;
      content: none !important;
    }
    .impr__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  `;
  document.head.appendChild(style);
}

const i18n = loadTranslations();
const lang = getLang(document.documentElement.lang);

const mutationObserver = new MutationObserver(fetchCourses);
const observerConfig = { childList: true, subtree: true };

mutationObserver.observe(document, observerConfig);
fetchCourses();

function fetchCourses() {
  listenForArchiveToggle();

  const courseContainers = document.querySelectorAll(
    '[class^="enrolled-course-card--container--"]:not(.details-done)'
  );

  if (courseContainers.length === 0) return;

  [...courseContainers].forEach((courseContainer) => {
    const titleAnchor = courseContainer.querySelector(
      'h3[data-purpose="course-title-url"]>a'
    );

    if (!titleAnchor) return;

    const courseId = titleAnchor.href.replace(
      'https://www.udemy.com/course-dashboard-redirect/?course_id=',
      ''
    );

    const courseCustomDiv = document.createElement('div');
    courseCustomDiv.classList.add(
      'improved-course-card--additional-details',
      'js-removepartial'
    );

    const innerContainer = courseContainer.querySelector('div[data-purpose="container"]');
    if (!innerContainer) return;

    innerContainer.classList.add('improved-course-card--shell');
    innerContainer.appendChild(courseCustomDiv);

    courseContainer.classList.add(
      'details-done',
      'improved-course-card--container'
    );

    // =====================================================
    // COURSE OVERVIEW LINK
    // =====================================================
    const courseLinkLi = document.createElement('li');
    courseLinkLi.innerHTML = `
      <a class="udlite-btn udlite-btn-large udlite-btn-ghost udlite-text-sm udlite-block-list-item udlite-block-list-item-small udlite-block-list-item-neutral"
         role="menuitem"
         tabindex="-1"
         href="https://www.udemy.com/course/${courseId}/"
         target="_blank"
         rel="noopener">
        <span class="udi-small udi udi-explore udlite-block-list-item-icon"></span>
        <div class="udlite-block-list-item-content card__course-link">
          ${i18n[lang].overview}
          <svg fill="#686f7a" width="12" height="16" viewBox="0 0 24 24" style="vertical-align: bottom; margin-left: 5px;" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7z"></path>
          </svg>
        </div>
      </a>
    `;
    courseLinkLi.classList.add('js-removepartial');

    const allDropdowns = courseContainer.parentElement?.querySelectorAll('.udlite-block-list');
    if (allDropdowns && allDropdowns[1]) {
      allDropdowns[1].appendChild(courseLinkLi);
    }

    const imageWrapper = courseContainer.querySelector(
      'div[class^="course-card-module--image-container--"]'
    );
    imageWrapper?.classList.add('improved-course-card--image-container');

    // =====================================================
    // API FETCH DATA EXTRACTION
    // =====================================================
    const fetchUrl =
      'https://www.udemy.com/api-2.0/courses/' +
      courseId +
      '?fields[course]=' +
      [
        'title',
        'url',
        'rating',
        'num_reviews',
        'num_subscribers',
        'content_length_video',
        'last_update_date',
        'created',
        'locale',
        'visible_instructors',
        'num_published_lectures',
        'is_paid',
        'price',
        'badge_family',
        'badge_info'
      ].join(',');

    fetch(fetchUrl)
      .then(response => {
        if (response.ok) return response.json();
        throw new Error(response.status);
      })
      .then(json => {
        if (!json) return;

        // Extract metrics
        const rating = Number(json.rating || 0).toFixed(1);
        const reviews = json.num_reviews || 0;
        const enrolled = json.num_subscribers || 0;
        const runtime = json.content_length_video || 0;
        const lectures = json.num_published_lectures || 0;
        const locale = json.locale?.title || 'Unknown';
        const localeCode = json.locale?.locale || 'en-us';
        const instructors = json.visible_instructors?.map(i => i.display_name).join(', ') || 'Unknown';
        const createdDate = parseDate(json.created);
        const updatedDate = parseDate(json.last_update_date || json.created);
        const isExam = runtime === 0;

        const ageInDays = updatedDate ? Math.floor((Date.now() - updatedDate.getTime()) / 86400000) : 9999;

        // =====================================================
        // REVISED HEURISTIC AI SCORE ENGINE (RE-BUILT PERFECTION)
        // =====================================================
        let ratingWeight = 0;
        if (rating >= 4.7) ratingWeight = 40;
        else if (rating >= 4.5) ratingWeight = 35;
        else if (rating >= 4.3) ratingWeight = 28;
        else if (rating >= 4.0) ratingWeight = 20;
        else if (rating >= 3.5) ratingWeight = 8;

        let freshnessWeight = 0;
        if (ageInDays <= 90) freshnessWeight = 25;       // Ultra Fresh (0-3 Months)
        else if (ageInDays <= 180) freshnessWeight = 20;  // High Context (3-6 Months)
        else if (ageInDays <= 365) freshnessWeight = 15;  // Current Year Ecosystem
        else if (ageInDays <= 730) freshnessWeight = 5;   // Legacy Baseline

        let socialWeight = 0;
        if (reviews >= 20000 || enrolled >= 150000) socialWeight = 20;
        else if (reviews >= 5000 || enrolled >= 40000) socialWeight = 15;
        else if (reviews >= 1000 || enrolled >= 10000) socialWeight = 10;
        else if (reviews >= 100) socialWeight = 5;

        let efficiencyWeight = 0;
        const runtimeHours = runtime / 3600;
        if (runtimeHours >= 4 && runtimeHours <= 25) efficiencyWeight = 15; // Optimal Learning Sweetspot
        else if (runtimeHours > 25 && runtimeHours <= 50) efficiencyWeight = 10; // Complete Track
        else if (runtimeHours > 0 && runtimeHours < 4) efficiencyWeight = 8;    // Target Skill Upskill
        else if (runtimeHours > 50) efficiencyWeight = 4;                       // Bloat/Attrition Risk

        let score = ratingWeight + freshnessWeight + socialWeight + efficiencyWeight;
        if (isExam) {
          score = Math.round((ratingWeight / 40 * 60) + (freshnessWeight / 25 * 40));
        }
        score = Math.min(100, Math.max(0, Math.round(score)));

        let scoreColor = '#ef4444';
        if (score >= 80) scoreColor = '#10b981';
        else if (score >= 60) scoreColor = '#f59e0b';
        else if (score >= 40) scoreColor = '#f97316';

        // =====================================================
        // BACKGROUND CONTAINER COLOR GENERATION
        // =====================================================
        let cardBg = 'linear-gradient(135deg, #ffffff, #f8fafc)';
        let cardBorder = '1px solid #e2e8f0';
        let cardShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';

        if (isExam) {
          // Boosted layout saturation and contrast parameters for exam layouts
          cardBg = 'linear-gradient(135deg, #ffedd5, #fed7aa)';
          cardBorder = '2px solid #f97316';
          cardShadow = '0 8px 20px rgba(249,115,22,0.3)';
        } else {
          if (score >= 80) {
            cardBg = 'linear-gradient(135deg, #f0fdf4, #e6fcf5)'; 
            cardBorder = '1px solid #bbf7d0';
            cardShadow = '0 6px 16px rgba(16,185,129,0.12)';
          } else if (score >= 60) {
            cardBg = 'linear-gradient(135deg, #fefce8, #fffdf0)'; 
            cardBorder = '1px solid #fef08a';
            cardShadow = '0 6px 16px rgba(245,158,11,0.08)';
          } else if (score >= 40) {
            cardBg = 'linear-gradient(135deg, #fff7ed, #fffaf5)'; 
            cardBorder = '1px solid #fed7aa';
          }
        }

        courseContainer.style.background = cardBg;
        courseContainer.style.border = cardBorder;
        courseContainer.style.borderRadius = '14px';
        courseContainer.style.boxShadow = cardShadow;
        courseContainer.style.padding = '5px';

        // =====================================================
        // PREMIUM TRUST TIERS (BETTER RATING VISUALIZATION)
        // =====================================================
        let trustTier = 'Standard Track';
        let trustColor = '#64748b';
        if (rating >= 4.7) { trustTier = 'Elite Rank Class'; trustColor = '#b45309'; }
        else if (rating >= 4.4) { trustTier = 'Highly Acclaimed'; trustColor = '#c2410c'; }
        else if (rating >= 4.0) { trustTier = 'Good Standing'; trustColor = '#475569'; }

        const ratingDashboardHtml = `
          <div title="Course Rating Metrics" style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.75); padding:8px 12px; border-radius:10px; margin-bottom:10px; border:1px solid rgba(0,0,0,0.05); cursor:help;">
            <div>
              <div style="font-size:17px; font-weight:800; color:#ea580c; display:flex; align-items:center; gap:4px; line-height:1;">
                ⭐ ${rating} <span style="font-size:11px; font-weight:500; color:#64748b;">/ 5.0</span>
              </div>
              <div style="font-size:11px; color:#64748b; font-weight:600; margin-top:2px;">
                ${setSeparator(reviews, lang)} reviews
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; font-weight:800; color:${trustColor}; text-transform:uppercase; letter-spacing:0.3px;">
                ${trustTier}
              </div>
              <div style="font-size:10px; color:#94a3b8; font-weight:500;">
                Community Validated
              </div>
            </div>
          </div>
        `;

        // =====================================================
        // COGNITIVE STUDY COMMITMENT TIMELINE GENERATOR
        // =====================================================
        let commitmentBadge = '';
        if (runtime > 0) {
          if (runtimeHours <= 5) {
            commitmentBadge = `<div class="impr__badge" title="Estimated Course Completion Timeline" style="background:#f0fdfa; color:#0d9488; border-color:#99f6e4; font-weight:600;">🕒 Sprint Study (1-2 Days)</div>`;
          } else if (runtimeHours <= 20) {
            commitmentBadge = `<div class="impr__badge" title="Estimated Course Completion Timeline" style="background:#eff6ff; color:#2563eb; border-color:#bfdbfe; font-weight:600;">🕒 Balanced Pace (1-2 Weeks)</div>`;
          } else {
            commitmentBadge = `<div class="impr__badge" title="Estimated Course Completion Timeline" style="background:#faf5ff; color:#7c3aed; border-color:#e9d5ff; font-weight:600;">🕒 Deep Commitment (3-6 Weeks)</div>`;
          }
        }

        // Freshness Badge Rendering Setup
        const freshness = getFreshnessStatus(updatedDate);
        let freshnessLabel = 'Legacy System';
        let freshnessBg = '#fef2f2'; let freshnessColor = '#991b1b'; let freshnessBorder = '#fee2e2';

        if (ageInDays <= 90) {
          freshnessLabel = 'Current Ecosystem'; freshnessBg = '#f0fdf4'; freshnessColor = '#166534'; freshnessBorder = '#bbf7d0';
        } else if (ageInDays <= 365) {
          freshnessLabel = 'Recent Lifecycle'; freshnessBg = '#fefce8'; freshnessColor = '#854d0e'; freshnessBorder = '#fef08a';
        }
        const freshnessBadge = `<div class="impr__badge" title="Content Maintenance Lifecycle Status" style="background:${freshnessBg}; color:${freshnessColor}; border-color:${freshnessBorder}; font-weight:700;">🔄 ${freshnessLabel}</div>`;

        // Delivery pace evaluation setup
        let lectureStyleBadge = '';
        if (runtime > 0 && lectures > 0) {
          const avgMinutesPerLecture = Math.round((runtime / 60) / lectures);
          if (avgMinutesPerLecture <= 5) {
            lectureStyleBadge = `<div class="impr__badge" title="Average Structure of Lessons" style="background:#ccfbf1; color:#0f766e; border-color:#99f6e4; font-weight:600;">⚡ Bite-Sized Lectures (~${avgMinutesPerLecture}m)</div>`;
          } else if (avgMinutesPerLecture <= 13) {
            lectureStyleBadge = `<div class="impr__badge" title="Average Structure of Lessons" style="background:#e0e7ff; color:#4338ca; border-color:#c7d2fe; font-weight:600;">📈 Balanced Lectures (~${avgMinutesPerLecture}m)</div>`;
          } else {
            lectureStyleBadge = `<div class="impr__badge" title="Average Structure of Lessons" style="background:#f0f9ff; color:#0369a1; border-color:#bae6fd; font-weight:600;">📚 Theoretical Deep Dive (~${avgMinutesPerLecture}m)</div>`;
          }
        }

        // Platform Tag Handling
        let udemyRibbon = '';
        const rawBadge = (json.badge_family || json.badge_info?.badge_family || '').toLowerCase();
        if (rawBadge) {
          let badgeBg = '#f3e8ff'; let badgeColor = '#6b21a8'; let badgeBorder = '#d8b4fe';
          let badgeLabel = json.badge_info?.badge_text || json.badge_family;
          if (rawBadge.includes('bestseller') || rawBadge.includes('best_seller')) {
            badgeBg = '#fff7ed'; badgeColor = '#c2410c'; badgeBorder = '#fdba74'; badgeLabel = '🔥 Bestseller';
          } else if (rawBadge.includes('highest_rated') || rawBadge.includes('highest-rated')) {
            badgeBg = '#fefce8'; badgeColor = '#a16207'; badgeBorder = '#fde047'; badgeLabel = '⭐ Highest Rated';
          } else if (rawBadge.includes('new')) {
            badgeBg = '#ecfeff'; badgeColor = '#155e75'; badgeBorder = '#67e8f9'; badgeLabel = '⚡ Hot & New';
          }
          udemyRibbon = `<div class="impr__badge" title="Official Udemy Market Label" style="background:${badgeBg}; color:${badgeColor}; border-color:${badgeBorder}; font-weight:700;">${badgeLabel}</div>`;
        }

        let tacticalDecisionTag = '';
        if (score >= 85 && (freshness === 'green' || freshness === 'yellow')) {
          tacticalDecisionTag = `<div class="impr__badge" title="AI Recommendation Category" style="background:linear-gradient(135deg, #f59e0b, #ef4444); color:white; border:none; font-weight:800; font-size:10px;">🚀 Top Pick: Premium Investment</div>`;
        } else if (score >= 72 && runtimeHours < 8 && !isExam) {
          tacticalDecisionTag = `<div class="impr__badge" title="AI Recommendation Category" style="background:linear-gradient(135deg, #06b6d4, #3b82f6); color:white; border:none; font-weight:800; font-size:10px;">⚡ High Velocity Quick Win</div>`;
        } else if (score < 45 && freshness === 'red') {
          tacticalDecisionTag = `<div class="impr__badge" title="AI Recommendation Category" style="background:#e2e8f0; color:#475569; border-color:#cbd5e1; font-weight:700; font-size:10px;">🛑 Deprioritized (Outdated Archive)</div>`;
        }

        let runtimeBg = '#f0f9ff'; let runtimeColor = '#0369a1'; let runtimeBorder = '#bae6fd';
        if (runtimeHours >= 40) { runtimeBg = '#fdf2f8'; runtimeColor = '#9d174d'; runtimeBorder = '#fbcfe8'; }

        // =====================================================
        // INTEGRATED RENDERING INTERFACE LAYER
        // =====================================================
        courseCustomDiv.innerHTML = `
          <div class="impr__recommendation-bar" style="height:6px; width:${score}%; background:${scoreColor}; border-radius:999px; margin-bottom:8px; transition:0.3s;"></div>
          <div style="font-size:12px; font-weight:800; color:${scoreColor}; margin-bottom:8px; letter-spacing:0.3px;">
            AI Efficiency Score: ${score}/100
          </div>

          ${ratingDashboardHtml}

          <div title="Assigned Instructors" style="margin:4px 0 8px 0; font-size:11px; font-weight:700; color:#475569; cursor:help;">
            👨‍🏫 ${instructors}
          </div>

          <div class="impr__stats">
            <div class="impr__badge" title="Total Enrolled Students" style="background:#f8fafc; color:#334155; border-color:#e2e8f0; font-weight:600;">👥 ${setSeparator(enrolled, lang)} enrolled</div>
            ${runtime > 0 ? `<div class="impr__badge" title="Total Video Course Runtime" style="background:${runtimeBg}; color:${runtimeColor}; border-color:${runtimeBorder}; font-weight:600;">⏱ ${parseRuntime(runtime, lang)}</div>` : ''}
            ${runtime > 0 && lectures > 0 ? `<div class="impr__badge" title="Total Published Lessons" style="background:#fff5f5; color:#991b1b; border-color:#fee2e2; font-weight:600;">🎥 ${lectures} lessons</div>` : ''}
            <div class="impr__badge" title="Course Audio Language" style="background:#f8fafc; color:#1e293b; border-color:#e2e8f0; font-weight:600;">🌍 ${locale}</div>
            ${createdDate ? `<div class="impr__badge" title="Original Course Creation Date" style="background:#faf5ff; color:#6b21a8; border-color:#f3e8ff; font-weight:600;">📅 Org: ${formatDateCustom(createdDate)}</div>` : ''}
            ${updatedDate ? `<div class="impr__badge" title="Last Revised Date" style="background:#f0f9ff; color:#1d4ed8; border-color:#e0f2fe; font-weight:700;">🔄 Rev: ${formatDateCustom(updatedDate)}</div>` : ''}
            
            ${freshnessBadge}
            ${lectureStyleBadge}
            ${commitmentBadge}
            ${udemyRibbon}
            ${tacticalDecisionTag}

            ${isExam ? `<div class="impr__badge" title="Evaluation Layout Model" style="background:#ea580c; color:white; border-color:#c2410c; font-weight:800;">📝 Practice Test Engine</div>` : ''}
          </div>
        `;

        // Graphic Overlays setup onto thumbnail container wrappers
        if (imageWrapper && runtime > 0) {
          const runtimeSpan = document.createElement('span');
          runtimeSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-hide', 'js-removepartial');
          runtimeSpan.style.background = 'rgba(15,23,42,0.9)';
          runtimeSpan.style.color = 'white';
          runtimeSpan.style.fontSize = '12px';
          runtimeSpan.style.fontWeight = '700';
          runtimeSpan.style.padding = '3px 6px';
          runtimeSpan.style.borderRadius = '4px';
          runtimeSpan.title = "Runtime Length Overlay";
          runtimeSpan.innerHTML = `⏱ ${parseRuntime(runtime, lang)}`;
          imageWrapper.appendChild(runtimeSpan);
        }

        if (imageWrapper && localeCode.slice(0, 2) !== 'en') {
          const localeSpan = document.createElement('span');
          localeSpan.classList.add('card__thumb-overlay', 'card__course-locale', 'hover-hide', 'js-removepartial');
          localeSpan.title = "Language Context Overlay";
          localeSpan.innerHTML = `<span style="margin-right:3px;">${getFlagEmoji(localeCode.slice(-2))}</span>${locale}`;
          imageWrapper.appendChild(localeSpan);
        }
      })
      .catch(error => {
        courseCustomDiv.classList.add('card__nodata');
        courseCustomDiv.innerHTML += `<div><b>${error}</b><br>${i18n[lang].notavailable}</div>`;
      });
  });
}

// ======================================================
// CONTEXT ALIGNED HELPER ENGINES
// ======================================================
function formatDateCustom(date) {
  if (!date) return '';
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function listenForArchiveToggle() {
  document.querySelectorAll('[data-purpose="toggle-archived"]').forEach(item => {
    item.addEventListener('click', () => { setTimeout(() => { location.reload(); }, 500); });
  });
}

function setSeparator(int, langCode) {
  return int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, i18n[langCode].separator);
}

function parseDate(dateString) {
  if (!dateString) return null;
  const parsedDate = new Date(dateString);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getFreshnessStatus(updatedDate) {
  if (!updatedDate) return 'red';
  const ageInDays = Math.max(0, Math.floor((Date.now() - updatedDate.getTime()) / 86400000));
  if (ageInDays <= 90) return 'green';
  if (ageInDays <= 365) return 'yellow';
  return 'red';
}

function setFreshnessClass(targetElement, status) {
  if (!targetElement) return;
  targetElement.classList.remove('impr__freshness--green', 'impr__freshness--yellow', 'impr__freshness--red');
  targetElement.classList.add(`impr__freshness--${status}`);
}

function getLang(langCode) {
  return i18n.hasOwnProperty(langCode) ? langCode : 'en-us';
}

function parseRuntime(seconds, langCode) {
  if (seconds % 60 > 29) seconds += 30;
  const hours = Math.floor(seconds / 60 / 60);
  const minutes = Math.floor(seconds / 60) - (hours * 60);
  return (hours > 0 ? hours.toString() + i18n[langCode].hours : '') + (minutes > 0 ? ' ' + minutes.toString() + i18n[langCode].mins : '');
}

function loadTranslations() {
  return {
    'en-us': {
      overview: 'Course overview',
      enrolled: 'students',
      notavailable: 'Course info configuration missing',
      separator: ',',
      hours: 'h',
      mins: 'm'
    }
  };
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}