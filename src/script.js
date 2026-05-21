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
      cursor: help;
    }
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

    /* Floating Export CSV Button Styling */
    #impr-export-btn {
      position: fixed; 
      bottom: 20px; 
      right: 20px; 
      z-index: 9999;
      background: linear-gradient(135deg, #8b5cf6, #6b21a8); 
      color: white;
      border: none; 
      padding: 12px 24px; 
      border-radius: 50px; 
      font-weight: 800;
      font-size: 13px;
      cursor: pointer; 
      box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
      transition: transform 0.2s, box-shadow 0.2s; 
      display: flex; 
      align-items: center; 
      gap: 8px;
    }
    #impr-export-btn:hover { 
      transform: translateY(-3px); 
      box-shadow: 0 12px 28px rgba(139, 92, 246, 0.5);
    }
  `;
  document.head.appendChild(style);
}

const i18n = loadTranslations();
const lang = getLang(document.documentElement.lang);

createExportButton();

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
        'price',
        'image_480x270' // Added image link field request here
      ].join(',');

    fetch(fetchUrl)
      .then(response => {
        if (response.ok) return response.json();
        throw new Error(response.status);
      })
      .then(json => {
        if (!json) return;

        // Extract metrics
        const courseTitle = json.title || 'Unknown Title';
        const courseImage = json.image_480x270 || ''; // Extracted link
        const ratingValue = Number(json.rating || 0);
        const rating = ratingValue.toFixed(1);
        const reviews = json.num_reviews || 0;
        const enrolled = json.num_subscribers || 0;
        const runtime = json.content_length_video || 0;
        const runtimeHours = runtime / 3600;
        const lectures = json.num_published_lectures || 0;
        const locale = json.locale?.title || 'Unknown';
        const localeCode = json.locale?.locale || 'en-us';
        const instructors = json.visible_instructors?.map(i => i.display_name).join(', ') || 'Unknown';
        const createdDate = parseDate(json.created);
        const updatedDate = parseDate(json.last_update_date || json.created);
        const isExam = runtime === 0;
        
        // Price metrics
        const rawPrice = json.price || 'Free';
        // Strip symbols for CSV (leaves only digits, decimals, and commas)
        const numericPriceCsv = rawPrice.toLowerCase() === 'free' ? '0' : rawPrice.replace(/[^\d.,]/g, '');

        const ageInDays = updatedDate ? Math.floor((Date.now() - updatedDate.getTime()) / 86400000) : 9999;

        const scoreData = {
          rating: ratingValue,
          reviewCount: reviews,
          enrolledCount: enrolled,
          runtimeSeconds: runtime,
          lectureCount: lectures,
          ageInDays: ageInDays,
          isExam: isExam
        };
        const score = typeof calculateOverallScore === 'function' ? calculateOverallScore(scoreData) : 0;
        const scoreColor = typeof getScoreColor === 'function' ? getScoreColor(score) : '#94a3b8';
        const cardStyling = typeof getCardStyling === 'function' ? getCardStyling(score, isExam) : { background: '#fff', border: '1px solid #e2e8f0', shadow: 'none' };

        courseContainer.style.background = cardStyling.background;
        courseContainer.style.border = cardStyling.border;
        courseContainer.style.borderRadius = '12px';
        courseContainer.style.boxShadow = cardStyling.shadow;
        courseContainer.style.padding = '8px';

        // =====================================================
        // TRUST TIER CLASSIFICATION
        // =====================================================
        let trustTier = 'Standard Track';
        let trustColor = '#64748b';
        const reviewCredibility = typeof calculateReviewCredibility === 'function' ? calculateReviewCredibility(reviews) : 0.5;
        
        if (ratingValue >= 4.7 && reviewCredibility >= 0.8) { trustTier = 'Elite Rank Class'; trustColor = '#06b6d4'; }
        else if (ratingValue >= 4.4 && reviewCredibility >= 0.6) { trustTier = 'Highly Acclaimed'; trustColor = '#8b5cf6'; }
        else if (ratingValue >= 4.0 && reviewCredibility >= 0.4) { trustTier = 'Good Standing'; trustColor = '#64748b'; }
        else if (ratingValue >= 4.0) { trustTier = 'Emerging Quality'; trustColor = '#f59e0b'; }

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
        // VISUAL LABELS & RIBBONS
        // =====================================================
        let commitmentLabel = 'N/A';
        let commitmentBadge = '';
        if (runtime > 0) {
          if (runtimeHours <= 5) {
            commitmentLabel = 'Sprint Study (1-2 Days)';
            commitmentBadge = `<div class="impr__badge" title="Estimated Course Completion Timeline" style="background:#f0fdfa; color:#0d9488; border-color:#99f6e4; font-weight:600;">🕒 ${commitmentLabel}</div>`;
          } else if (runtimeHours <= 20) {
            commitmentLabel = 'Balanced Pace (1-2 Weeks)';
            commitmentBadge = `<div class="impr__badge" title="Estimated Course Completion Timeline" style="background:#eff6ff; color:#2563eb; border-color:#bfdbfe; font-weight:600;">🕒 ${commitmentLabel}</div>`;
          } else {
            commitmentLabel = 'Deep Commitment (3-6 Weeks)';
            commitmentBadge = `<div class="impr__badge" title="Estimated Course Completion Timeline" style="background:#faf5ff; color:#7c3aed; border-color:#e9d5ff; font-weight:600;">🕒 ${commitmentLabel}</div>`;
          }
        }

        const freshness = getFreshnessStatus(updatedDate);
        let freshnessLabel = 'Legacy System';
        let freshnessBg = '#fef2f2'; let freshnessColor = '#991b1b'; let freshnessBorder = '#fee2e2';

        if (ageInDays <= 90) {
          freshnessLabel = 'Current Ecosystem'; freshnessBg = '#f0fdf4'; freshnessColor = '#166534'; freshnessBorder = '#bbf7d0';
        } else if (ageInDays <= 365) {
          freshnessLabel = 'Recent Lifecycle'; freshnessBg = '#fefce8'; freshnessColor = '#854d0e'; freshnessBorder = '#fef08a';
        }
        const freshnessBadge = `<div class="impr__badge" title="Content Maintenance Lifecycle Status" style="background:${freshnessBg}; color:${freshnessColor}; border-color:${freshnessBorder}; font-weight:700;">🔄 ${freshnessLabel}</div>`;

        let lectureStyleLabel = 'N/A';
        let lectureStyleBadge = '';
        if (runtime > 0 && lectures > 0) {
          const avgMinutesPerLecture = Math.round((runtime / 60) / lectures);
          if (avgMinutesPerLecture <= 5) {
            lectureStyleLabel = `Bite-Sized (~${avgMinutesPerLecture}m)`;
            lectureStyleBadge = `<div class="impr__badge" title="Average Structure of Lessons" style="background:#ccfbf1; color:#0f766e; border-color:#99f6e4; font-weight:600;">⚡ ${lectureStyleLabel}</div>`;
          } else if (avgMinutesPerLecture <= 13) {
            lectureStyleLabel = `Balanced (~${avgMinutesPerLecture}m)`;
            lectureStyleBadge = `<div class="impr__badge" title="Average Structure of Lessons" style="background:#e0e7ff; color:#4338ca; border-color:#c7d2fe; font-weight:600;">📈 ${lectureStyleLabel}</div>`;
          } else {
            lectureStyleLabel = `Theoretical Deep Dive (~${avgMinutesPerLecture}m)`;
            lectureStyleBadge = `<div class="impr__badge" title="Average Structure of Lessons" style="background:#f0f9ff; color:#0369a1; border-color:#bae6fd; font-weight:600;">📚 ${lectureStyleLabel}</div>`;
          }
        }

        let tacticalDecisionLabel = 'Standard Target';
        let tacticalDecisionTag = '';
        if (score >= 85 && (freshness === 'green' || freshness === 'yellow')) {
          tacticalDecisionLabel = 'Top Pick: Premium Investment';
          tacticalDecisionTag = `<div class="impr__badge" title="AI Recommendation Category" style="background:linear-gradient(135deg, #f59e0b, #ef4444); color:white; border:none; font-weight:800; font-size:10px;">🚀 ${tacticalDecisionLabel}</div>`;
        } else if (score >= 72 && runtimeHours < 8 && !isExam) {
          tacticalDecisionLabel = 'High Velocity Quick Win';
          tacticalDecisionTag = `<div class="impr__badge" title="AI Recommendation Category" style="background:linear-gradient(135deg, #06b6d4, #3b82f6); color:white; border:none; font-weight:800; font-size:10px;">⚡ ${tacticalDecisionLabel}</div>`;
        } else if (score < 45 && freshness === 'red') {
          tacticalDecisionLabel = 'Deprioritized (Outdated Archive)';
          tacticalDecisionTag = `<div class="impr__badge" title="AI Recommendation Category" style="background:#e2e8f0; color:#475569; border-color:#cbd5e1; font-weight:700; font-size:10px;">🛑 ${tacticalDecisionLabel}</div>`;
        }

        let runtimeBg = '#ecfdf5'; let runtimeColor = '#0d7377'; let runtimeBorder = '#a7f3d0';
        if (runtimeHours >= 40) { runtimeBg = '#f3f0ff'; runtimeColor = '#6b21a8'; runtimeBorder = '#d8b4fe'; }

        const priceRibbon = `<div class="impr__badge" title="Course Price" style="background:#fef3c7; color:#d97706; border-color:#f59e0b; font-weight:700; font-size:12px; padding:4px 10px; margin-bottom:6px; border-radius:4px; display:inline-block; border:1px solid;">${rawPrice}</div>`;

        // =====================================================
        // SAVE TO LOCAL DATABASE FOR EXPORT ENGINE
        // =====================================================
        saveToDatabase({
          id: courseId,
          title: courseTitle,
          instructor: instructors,
          price: numericPriceCsv, 
          score: score,
          tacticalDecision: tacticalDecisionLabel,
          rating: ratingValue,
          reviews: reviews,
          enrolled: enrolled,
          isExam: isExam ? 'Yes' : 'No',
          durationHours: runtimeHours.toFixed(2),
          lectures: lectures,
          pace: lectureStyleLabel,
          commitment: commitmentLabel,
          language: locale,
          createdDate: createdDate ? formatDateCustom(createdDate) : 'Unknown',
          updatedDate: updatedDate ? formatDateCustom(updatedDate) : 'Unknown',
          freshness: freshnessLabel,
          imageUrl: courseImage, // Saved mapped image string
          link: `https://www.udemy.com/course/${courseId}/`
        });

        // =====================================================
        // INTEGRATED RENDERING INTERFACE LAYER
        // =====================================================
        courseCustomDiv.innerHTML = `
          <div class="impr__recommendation-bar" style="height:6px; width:${score}%; background:${scoreColor}; border-radius:999px; margin-bottom:8px; transition:0.3s;"></div>
          <div style="font-size:14px; font-weight:800; color:${scoreColor}; margin-bottom:8px; letter-spacing:0.3px; font-family:'Fira Code',monospace;">
            Score ${score}/100
          </div>

          ${ratingDashboardHtml}

          <div title="Assigned Instructors" style="margin:4px 0 8px 0; font-size:11px; font-weight:700; color:#475569; cursor:help;">
            👨‍🏫 ${instructors}
          </div>

          <div class="impr__stats">
            ${priceRibbon}
            <div class="impr__badge" title="Total Enrolled Students" style="background:#f8fafc; color:#1e293b; border-color:#e2e8f0; font-weight:600; font-family:'Fira Code',monospace;">👥 ${setSeparator(enrolled, lang)}</div>
            ${runtime > 0 ? `<div class="impr__badge" title="Total Video Course Runtime" style="background:${runtimeBg}; color:${runtimeColor}; border-color:${runtimeBorder}; font-weight:600; font-family:'Fira Code',monospace;">⏱ ${parseRuntime(runtime, lang)}</div>` : ''}
            ${runtime > 0 && lectures > 0 ? `<div class="impr__badge" title="Total Published Lessons" style="background:#fff5f5; color:#991b1b; border-color:#fee2e2; font-weight:600; font-family:'Fira Code',monospace;">🎥 ${lectures}</div>` : ''}
            <div class="impr__badge" title="Course Audio Language" style="background:#f8fafc; color:#1e293b; border-color:#e2e8f0; font-weight:600;">🌍 ${locale}</div>
            ${createdDate ? `<div class="impr__badge" title="Original Course Creation Date" style="background:#faf5ff; color:#6b21a8; border-color:#f3e8ff; font-weight:600; font-family:'Fira Code',monospace;">📅 ${formatDateCustom(createdDate)}</div>` : ''}
            ${updatedDate ? `<div class="impr__badge" title="Last Revised Date" style="background:#f0f9ff; color:#1d4ed8; border-color:#e0f2fe; font-weight:700; font-family:'Fira Code',monospace;">🔄 ${formatDateCustom(updatedDate)}</div>` : ''}
            
            ${freshnessBadge}
            ${lectureStyleBadge}
            ${commitmentBadge}
            ${tacticalDecisionTag}

            ${isExam ? `<div class="impr__badge" title="Evaluation Layout Model" style="background:#ea580c; color:white; border-color:#c2410c; font-weight:800;">📝 Practice Test Engine</div>` : ''}
          </div>
        `;

        if (imageWrapper && runtime > 0) {
          const runtimeSpan = document.createElement('span');
          runtimeSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-hide', 'js-removepartial');
          runtimeSpan.style.background = 'rgba(1, 40, 60, 0.92)';
          runtimeSpan.style.color = '#06b6d4';
          runtimeSpan.style.fontSize = '11px';
          runtimeSpan.style.fontWeight = '700';
          runtimeSpan.style.padding = '4px 8px';
          runtimeSpan.style.borderRadius = '6px';
          runtimeSpan.style.fontFamily = '"Fira Code",monospace';
          runtimeSpan.title = "Runtime Length Overlay";
          runtimeSpan.innerHTML = `⏱ ${parseRuntime(runtime, lang)}`;
          imageWrapper.appendChild(runtimeSpan);
        }

        if (imageWrapper && localeCode.slice(0, 2) !== 'en') {
          const localeSpan = document.createElement('span');
          localeSpan.classList.add('card__thumb-overlay', 'card__course-locale', 'hover-hide', 'js-removepartial');
          localeSpan.style.background = 'rgba(30, 41, 59, 0.92)';
          localeSpan.style.color = '#f1f5f9';
          localeSpan.style.fontSize = '11px';
          localeSpan.style.fontWeight = '600';
          localeSpan.style.padding = '4px 8px';
          localeSpan.style.borderRadius = '6px';
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
function saveToDatabase(courseRecord) {
  let db = JSON.parse(localStorage.getItem('udemyCourseDB') || '{}');
  db[courseRecord.id] = courseRecord;
  localStorage.setItem('udemyCourseDB', JSON.stringify(db));
  updateExportButton(Object.keys(db).length);
}

function createExportButton() {
  if (document.getElementById('impr-export-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'impr-export-btn';
  btn.onclick = generateCSV;
  document.body.appendChild(btn);
  
  const db = JSON.parse(localStorage.getItem('udemyCourseDB') || '{}');
  updateExportButton(Object.keys(db).length);
}

function updateExportButton(count) {
  const btn = document.getElementById('impr-export-btn');
  if (btn) btn.innerHTML = `⬇️ Download CSV (${count} Scraped)`;
}

function generateCSV() {
  const db = JSON.parse(localStorage.getItem('udemyCourseDB') || '{}');
  const courses = Object.values(db);
  
  if (courses.length === 0) {
    alert('No data points have been collected yet. Please let the page load.');
    return;
  }

  // Updated headers containing 'Course Image URL'
  const headers = [
    'Course ID', 'Course Name', 'Instructor', 'Price',
    'AI Efficiency Score', 'AI Recommendation', 'Rating', 'Reviews Count', 'Enrolled Students', 
    'Is Practice Test', 'Duration (Hours)', 'Lectures Count', 'Pacing Model', 'Commitment Level', 'Language', 
    'Created Date', 'Updated Date', 'Freshness Status', 
    'Course Image URL', 'Details URL'
  ];
  
  let csvContent = headers.join(',') + '\r\n';
  
  courses.forEach(c => {
    const row = [
      c.id,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${(c.instructor || '').replace(/"/g, '""')}"`,
      `"${(c.price || '0').replace(/"/g, '""')}"`,
      c.score || 0,
      `"${(c.tacticalDecision || 'Standard Target').replace(/"/g, '""')}"`,
      c.rating || 0,
      c.reviews || 0,
      c.enrolled || 0,
      `"${c.isExam || 'No'}"`,
      c.durationHours || 0,
      c.lectures || 0,
      `"${(c.pace || 'N/A').replace(/"/g, '""')}"`,
      `"${(c.commitment || 'N/A').replace(/"/g, '""')}"`,
      `"${(c.language || 'Unknown').replace(/"/g, '""')}"`,
      `"${c.createdDate || 'Unknown'}"`,
      `"${c.updatedDate || 'Unknown'}"`,
      `"${c.freshness || 'Unknown'}"`,
      `"${(c.imageUrl || '').replace(/"/g, '""')}"`, // Appended values safely escaped
      `"${(c.link || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\r\n';
  });

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'myUdemyCourses.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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