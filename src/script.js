// Inject premium layout extensions, style overrides, and CSV button styles
if (!document.getElementById('impr-dynamic-styles')) {
  const style = document.createElement('style');
  style.id = 'impr-dynamic-styles';
  style.innerHTML = `
    /* Remove left-sided vertical bar layout */
    .improved-course-card--additional-details::before { display: none !important; }
    /* Structural adjustments for the container cards */
    [class^="enrolled-course-card--container--"] { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .impr__badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;
      border-radius: 6px; border: 1px solid; font-size: 11px; margin: 2px;
      white-space: nowrap; cursor: help;
    }
    .impr__badge:hover::before, .impr__badge:hover::after { display: none !important; content: none !important; }
    .impr__stats { display: flex; flex-wrap: wrap; gap: 4px; }
    
    /* Floating Export CSV Button */
    #impr-export-btn {
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      background: linear-gradient(135deg, #8b5cf6, #6b21a8); color: white;
      border: none; padding: 12px 24px; border-radius: 50px; font-weight: 800;
      cursor: pointer; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
      transition: transform 0.2s; display: flex; align-items: center; gap: 8px;
    }
    #impr-export-btn:hover { transform: translateY(-3px); }
  `;
  document.head.appendChild(style);
}

const i18n = loadTranslations();
const lang = getLang(document.documentElement.lang);

// Initialize Floating Export Button
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
    const titleAnchor = courseContainer.querySelector('h3[data-purpose="course-title-url"]>a');
    if (!titleAnchor) return;

    const courseId = titleAnchor.href.replace('https://www.udemy.com/course-dashboard-redirect/?course_id=', '').replace('/', '');

    const courseCustomDiv = document.createElement('div');
    courseCustomDiv.classList.add('improved-course-card--additional-details', 'js-removepartial');

    const innerContainer = courseContainer.querySelector('div[data-purpose="container"]');
    if (!innerContainer) return;

    innerContainer.classList.add('improved-course-card--shell');
    innerContainer.appendChild(courseCustomDiv);
    courseContainer.classList.add('details-done', 'improved-course-card--container');

    // Overview Link Insertion (Unchanged)
    const courseLinkLi = document.createElement('li');
    courseLinkLi.innerHTML = `
      <a class="udlite-btn udlite-btn-large udlite-btn-ghost udlite-text-sm udlite-block-list-item udlite-block-list-item-small udlite-block-list-item-neutral"
         role="menuitem" tabindex="-1" href="https://www.udemy.com/course/${courseId}/" target="_blank" rel="noopener">
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
    if (allDropdowns && allDropdowns[1]) allDropdowns[1].appendChild(courseLinkLi);

    const imageWrapper = courseContainer.querySelector('div[class^="course-card-module--image-container--"]');
    imageWrapper?.classList.add('improved-course-card--image-container');

    // Added primary_category and primary_subcategory to API request
    const fetchUrl = 'https://www.udemy.com/api-2.0/courses/' + courseId + 
      '?fields[course]=title,url,rating,num_reviews,num_subscribers,content_length_video,last_update_date,created,locale,visible_instructors,num_published_lectures,is_paid,price,badge_family,badge_info,primary_category,primary_subcategory';

    fetch(fetchUrl)
      .then(response => {
        if (response.ok) return response.json();
        throw new Error(response.status);
      })
      .then(json => {
        if (!json) return;

        // Metric Extraction
        const courseTitle = json.title || 'Unknown Title';
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
        
        // Category Extraction
        const category = json.primary_category?.title || 'None';
        const subcategory = json.primary_subcategory?.title || 'None';

        const ageInDays = updatedDate ? Math.floor((Date.now() - updatedDate.getTime()) / 86400000) : 9999;

        // Scoring Engine Call (Assuming calculation functions exist in global scope via scoreEngine.js)
        const scoreData = { rating: ratingValue, reviewCount: reviews, enrolledCount: enrolled, runtimeSeconds: runtime, lectureCount: lectures, ageInDays: ageInDays, isExam: isExam };
        const score = typeof calculateOverallScore === 'function' ? calculateOverallScore(scoreData) : 0;
        const scoreColor = typeof getScoreColor === 'function' ? getScoreColor(score) : '#64748b';
        const cardStyling = typeof getCardStyling === 'function' ? getCardStyling(score, isExam) : {background: '#fff', border: '1px solid #ccc', shadow: 'none'};

        courseContainer.style.background = cardStyling.background;
        courseContainer.style.border = cardStyling.border;
        courseContainer.style.borderRadius = '12px';
        courseContainer.style.boxShadow = cardStyling.shadow;
        courseContainer.style.padding = '8px';

        // Badges & String Labels (Separated text from HTML for CSV export)
        let commitmentLabel = 'N/A';
        let commitmentBadge = '';
        if (runtime > 0) {
          if (runtimeHours <= 5) { commitmentLabel = 'Sprint Study (1-2 Days)'; commitmentBadge = `<div class="impr__badge" style="background:#f0fdfa; color:#0d9488; border-color:#99f6e4;">🕒 ${commitmentLabel}</div>`; }
          else if (runtimeHours <= 20) { commitmentLabel = 'Balanced Pace (1-2 Weeks)'; commitmentBadge = `<div class="impr__badge" style="background:#eff6ff; color:#2563eb; border-color:#bfdbfe;">🕒 ${commitmentLabel}</div>`; }
          else { commitmentLabel = 'Deep Commitment (3-6 Weeks)'; commitmentBadge = `<div class="impr__badge" style="background:#faf5ff; color:#7c3aed; border-color:#e9d5ff;">🕒 ${commitmentLabel}</div>`; }
        }

        const freshnessStatus = getFreshnessStatus(updatedDate);
        let freshnessLabel = 'Legacy System';
        let freshnessBg = '#fef2f2'; let freshnessColor = '#991b1b'; let freshnessBorder = '#fee2e2';
        if (ageInDays <= 90) { freshnessLabel = 'Current Ecosystem'; freshnessBg = '#f0fdf4'; freshnessColor = '#166534'; freshnessBorder = '#bbf7d0'; } 
        else if (ageInDays <= 365) { freshnessLabel = 'Recent Lifecycle'; freshnessBg = '#fefce8'; freshnessColor = '#854d0e'; freshnessBorder = '#fef08a'; }
        const freshnessBadge = `<div class="impr__badge" style="background:${freshnessBg}; color:${freshnessColor}; border-color:${freshnessBorder};">🔄 ${freshnessLabel}</div>`;

        let lectureStyleLabel = 'N/A';
        let lectureStyleBadge = '';
        if (runtime > 0 && lectures > 0) {
          const avgMinutes = Math.round((runtime / 60) / lectures);
          if (avgMinutes <= 5) { lectureStyleLabel = `Bite-Sized (~${avgMinutes}m)`; lectureStyleBadge = `<div class="impr__badge" style="background:#ccfbf1; color:#0f766e; border-color:#99f6e4;">⚡ ${lectureStyleLabel}</div>`; }
          else if (avgMinutes <= 13) { lectureStyleLabel = `Balanced (~${avgMinutes}m)`; lectureStyleBadge = `<div class="impr__badge" style="background:#e0e7ff; color:#4338ca; border-color:#c7d2fe;">📈 ${lectureStyleLabel}</div>`; }
          else { lectureStyleLabel = `Theoretical Deep Dive (~${avgMinutes}m)`; lectureStyleBadge = `<div class="impr__badge" style="background:#f0f9ff; color:#0369a1; border-color:#bae6fd;">📚 ${lectureStyleLabel}</div>`; }
        }

        let udemyRibbon = '';
        const rawBadge = (json.badge_family || json.badge_info?.badge_family || '').toLowerCase();
        if (rawBadge) {
          let badgeLabel = json.badge_info?.badge_text || json.badge_family;
          udemyRibbon = `<div class="impr__badge" style="background:#f3e8ff; color:#6b21a8; border-color:#d8b4fe;">${badgeLabel}</div>`;
        }

        // =====================================================
        // CSV DATABASE REGISTRATION (Background Save)
        // =====================================================
        saveToDatabase({
          id: courseId,
          title: courseTitle,
          instructor: instructors,
          score: score,
          rating: ratingValue,
          reviews: reviews,
          enrolled: enrolled,
          durationHours: runtimeHours.toFixed(2),
          lectures: lectures,
          createdDate: createdDate ? formatDateCustom(createdDate) : 'Unknown',
          updatedDate: updatedDate ? formatDateCustom(updatedDate) : 'Unknown',
          freshness: freshnessLabel,
          pace: lectureStyleLabel,
          commitment: commitmentLabel,
          category: category,
          subcategory: subcategory,
          isExam: isExam
        });

        // DOM Rendering...
        let runtimeBg = '#ecfdf5'; let runtimeColor = '#0d7377'; let runtimeBorder = '#a7f3d0';
        if (runtimeHours >= 40) { runtimeBg = '#f3f0ff'; runtimeColor = '#6b21a8'; runtimeBorder = '#d8b4fe'; }

        courseCustomDiv.innerHTML = `
          <div class="impr__recommendation-bar" style="height:6px; width:${score}%; background:${scoreColor}; border-radius:999px; margin-bottom:8px;"></div>
          <div style="font-size:14px; font-weight:800; color:${scoreColor}; margin-bottom:8px;">Score ${score}/100</div>
          
          <div style="margin:4px 0 8px 0; font-size:11px; font-weight:700; color:#475569;">👨‍🏫 ${instructors}</div>
          <div class="impr__stats">
            <div class="impr__badge" style="background:#f8fafc; border-color:#e2e8f0;">👥 ${setSeparator(enrolled, lang)}</div>
            ${runtime > 0 ? `<div class="impr__badge" style="background:${runtimeBg}; color:${runtimeColor}; border-color:${runtimeBorder};">⏱ ${parseRuntime(runtime, lang)}</div>` : ''}
            ${runtime > 0 && lectures > 0 ? `<div class="impr__badge" style="background:#fff5f5; color:#991b1b; border-color:#fee2e2;">🎥 ${lectures}</div>` : ''}
            ${createdDate ? `<div class="impr__badge" style="background:#faf5ff; color:#6b21a8; border-color:#f3e8ff;">📅 Created: ${formatDateCustom(createdDate)}</div>` : ''}
            
            ${freshnessBadge}
            ${lectureStyleBadge}
            ${commitmentBadge}
            ${udemyRibbon}
            ${isExam ? `<div class="impr__badge" style="background:#ea580c; color:white; border-color:#c2410c;">📝 Practice Test</div>` : ''}
          </div>
        `;
      })
      .catch(error => {
        courseCustomDiv.classList.add('card__nodata');
        courseCustomDiv.innerHTML += `<div><b>${error}</b><br>${i18n[lang].notavailable}</div>`;
      });
  });
}

// ======================================================
// CSV EXPORT & DATABASE ENGINES
// ======================================================
function saveToDatabase(courseRecord) {
  // Pull existing DB from LocalStorage (persists across paginated pages)
  let db = JSON.parse(localStorage.getItem('udemyCourseDB') || '{}');
  
  // Insert or Update the record using Course ID as the key
  db[courseRecord.id] = courseRecord;
  
  // Save back to LocalStorage
  localStorage.setItem('udemyCourseDB', JSON.stringify(db));
  
  // Update UI Button counter
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
    alert('No courses have been scraped yet. Please let the page load.');
    return;
  }

  // Define Headers
  const headers = [
    'Course ID', 'Course Name', 'Instructor', 'AI Score', 'Rating', 
    'Reviews', 'Enrolled Students', 'Duration (Hours)', 'Sessions', 
    'Created Date', 'Updated Date', 'Freshness', 'Pacing Style', 
    'Commitment Level', 'Category', 'Subcategory', 'Is Exam'
  ];
  
  // FIX 1: Use actual carriage return/newline \r\n instead of escaped \\n
  let csvContent = headers.join(',') + '\r\n';
  
  // Iterate and properly escape strings containing commas
  courses.forEach(c => {
    const row = [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.instructor.replace(/"/g, '""')}"`,
      c.score,
      c.rating,
      c.reviews,
      c.enrolled,
      c.durationHours,
      c.lectures,
      c.createdDate,
      c.updatedDate,
      `"${c.freshness}"`,
      `"${c.pace}"`,
      `"${c.commitment}"`,
      `"${c.category}"`,
      `"${c.subcategory}"`,
      c.isExam
    ];
    // FIX 2: Apply the carriage return here as well
    csvContent += row.join(',') + '\r\n';
  });

  // FIX 3: Add UTF-8 BOM so Excel automatically formats columns correctly
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'myLearningCourses.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  return int.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, i18n[langCode].separator);
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
    'en-us': { overview: 'Course overview', enrolled: 'students', notavailable: 'Course info missing', separator: ',', hours: 'h', mins: 'm' }
  };
}