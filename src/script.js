const i18n = loadTranslations();
const lang = getLang(document.documentElement.lang);

const mutationObserver = new MutationObserver(fetchCourses);
const observerConfig = {
  childList: true,
  subtree: true
};
mutationObserver.observe(document, observerConfig);
fetchCourses();

function fetchCourses() {
  listenForArchiveToggle();
  const courseContainers = document.querySelectorAll('[class^="enrolled-course-card--container--"]:not(.details-done)');
  if (courseContainers.length === 0) return;

  [...courseContainers].forEach((courseContainer) => {
    const isPartialRefresh = courseContainer.classList.contains('partial-refresh');

    const titleAnchor = courseContainer.querySelector('h3[data-purpose="course-title-url"]>a');
    if (!titleAnchor) return;

    const courseId = titleAnchor.href.replace('https://www.udemy.com/course-dashboard-redirect/?course_id=', '');

    const courseCustomDiv = document.createElement('div');
    courseCustomDiv.classList.add('improved-course-card--additional-details', 'js-removepartial');

    const innerContainer = courseContainer.querySelector('div[data-purpose="container"]');
    if (!innerContainer) return;

    innerContainer.classList.add('improved-course-card--shell');
    innerContainer.appendChild(courseCustomDiv);

    courseContainer.classList.add('details-done');
    courseContainer.classList.add('improved-course-card--container');
    courseContainer.classList.remove('partial-refresh');

    // Add Link to course overview to options dropdown
    const courseLinkLi = document.createElement('li');
    courseLinkLi.innerHTML = `
      <a class="udlite-btn udlite-btn-large udlite-btn-ghost udlite-text-sm udlite-block-list-item udlite-block-list-item-small udlite-block-list-item-neutral" role="menuitem" tabindex="-1" href="https://www.udemy.com/course/${courseId}/" target="_blank" rel="noopener">
        <span class="udi-small udi udi-explore udlite-block-list-item-icon"></span>
        <div class="udlite-block-list-item-content card__course-link">${i18n[lang].overview}
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

    // Find existing elements in DOM
    const imageWrapper = courseContainer.querySelector('div[class^="course-card-module--image-container--"]');
    imageWrapper?.classList.add('improved-course-card--image-container');

    const mainContent = courseContainer.querySelector('div[class^="course-card-module--main-content--"]');
    mainContent?.classList.add('improved-course-card--main-content');

    const courseTitle = courseContainer.querySelector('h3[data-purpose="course-title-url"]');
    courseTitle?.classList.add('improved-course-card--course-title');

    const priceTextContainer = courseContainer.querySelector('div[class^="course-card-module--price-text-container--"]');
    if (priceTextContainer) priceTextContainer.parentNode.removeChild(priceTextContainer);

    const courseBadges = courseContainer.querySelector('div[class^="course-card-module--badges-container--"]');
    if (courseBadges) courseBadges.parentNode.removeChild(courseBadges);

    const progressBar = courseContainer.querySelector('div[class^="enrolled-course-card--meter--"]');
    progressBar?.classList.add('improved-course-card--meter');

    const progressAndRating = courseContainer.querySelector('div[class*="enrolled-course-card--progress-and-rating--"]');
    progressAndRating?.classList.add('improved-course-card--progress-and-rating');

    const progressText = progressAndRating?.firstChild;
    const progressMade = !!(progressText && /%/.test(progressText.textContent));

    if (progressAndRating && !progressMade) progressAndRating.parentNode.removeChild(progressAndRating);

    // If progress made
    if (progressMade && imageWrapper && progressBar) {
      // Add progress bar below thumbnail
      const progressBarSpan = document.createElement('span');
      progressBarSpan.classList.add('impr__progress-bar', 'js-removepartial');
      progressBarSpan.innerHTML = progressBar.innerHTML;
      imageWrapper.appendChild(progressBarSpan);
      // Add progress percentage to thumbnail bottom right
      const progressTextSpan = document.createElement('span');
      progressTextSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-show', 'js-removepartial');
      progressTextSpan.textContent = progressText.textContent;
      imageWrapper.appendChild(progressTextSpan);
      // Remove existing progress percentage
      progressText.parentNode.removeChild(progressText);
    }

    // Remove existing progress bar
    if (!isPartialRefresh && progressBar) {
      progressBar.parentNode.removeChild(progressBar);
    }

    // If course page has draft status, do not even fetch its data via API
    if (courseContainer.querySelector('[data-purpose="course-title-url"] a')?.href.includes('/draft/')) {
      const linkEl = courseContainer.querySelector('.card__course-link');
      if (linkEl) linkEl.style.textDecoration = 'line-through';
      courseCustomDiv.classList.add('card__nodata');
      courseCustomDiv.innerHTML += i18n[lang].notavailable;
      return;
    }

    const fetchUrl = 'https://www.udemy.com/api-2.0/courses/' +
      courseId +
      '?fields[course]=title,url,rating,num_reviews,num_subscribers,content_length_video,last_update_date,created,locale,has_closed_caption,caption_languages,num_published_lectures';

    fetch(fetchUrl)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(response.status);
      })
      .then(json => {
        if (typeof json === 'undefined') return;

        // Get everything from JSON and put it in variables
        const rating = json.rating.toFixed(1);
        const reviews = json.num_reviews;
        const enrolled = json.num_subscribers;
        const runtime = json.content_length_video;
        const createdDate = parseDate(json.created);
        const updatedDate = parseDate(json.last_update_date || json.created);
        const locale = json.locale.title;
        const localeCode = json.locale.locale;
        const hasCaptions = json.has_closed_caption;
        const captionsLangs = json.caption_languages;
        // Format creation and update dates for badges/tooltips
        const createdDateShort = formatDateShort(createdDate, lang);
        const createdDateLong = formatDateLong(createdDate, lang);
        const updatedDateShort = formatDateShort(updatedDate, lang);
        const updatedDateLong = formatDateLong(updatedDate, lang);

        setFreshnessClass(courseCustomDiv, getFreshnessStatus(updatedDate));

        // Small helper for rating strip color
        const getColor = v => `hsl(${(Math.round((1 - v) * 120))},100%,45%)`;
        const colorValue = r => Math.min(Math.max((5 - r) / 2, 0), 1);

        // If captions are available, create the tag for it. We'll add it in template string later
        let captionsTag = '';
        if (hasCaptions) {
          const captionsString = captionsLangs.join('&#013;&#010;');
          captionsTag = `
            <div class="impr__badge" data-tooltip="${captionsString}">
              <svg aria-hidden="true" focusable="false" class="ud-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M21 4H3v16h18V4zm-10 7H9.5v-.5h-2v3h2V13H11v2H6V9h5v2zm7 0h-1.5v-.5h-2v3h2V13H18v2h-5V9h5v2z"/>
              </svg>
            </div>
          `;
        }

        // Returns true or false depending if stars are visible
        const reviewButton = courseContainer.querySelector('[data-purpose="review-button"]');

        // Now let's handle own ratings
        let myRatingHtml = '';
        let ratingButton;
        let ratingOwn = 0;

        // If ratings stars ARE visible, proceed to build own rating stars
        if (reviewButton != null) {
          ratingButton = reviewButton;
          ratingOwn = getRatingFromSvg(ratingButton.querySelector('svg')); // between 0 and 5
          ratingButton.removeChild(ratingButton.querySelector('span'));

          myRatingHtml = `
            <div class="impr__rating-row">
              <span class="impr__star-wrapper">
                <span class="ud-sr-only">Rating: ${ratingOwn} out of 5</span>
                ${buildSvgStars(courseId.toString() + '-own', ratingOwn)}
                <span class="ud-heading-sm impr__rating-number">${setDecimal(ratingOwn, lang)}</span>
              </span>
              <span class="ud-text-xs impr__rating-count">(<span class="review-button"></span>)</span>
            </div>
          `;
        }

        const ratingStripColor = ratingOwn > 0 ? ratingOwn : rating;

        let createdDateInfo = '';
        if (createdDateShort !== '' && createdDateLong !== '') {
          createdDateInfo = `
            <div class="impr__badge impr__badge--date impr__badge--created" data-tooltip="${i18n[lang].created}${createdDateLong}">
              <svg aria-hidden="true" focusable="false" class="ud-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M17 3v1H7V3H5v1H3v17h18V4h-2V3h-2zm2 16H5V9h14v10zm0-12H5V6h2v1h2V6h6v1h2V6h2v1z"/>
              </svg><span>${createdDateShort}</span>
            </div>
          `;
        }

        let updatedDateInfo = '';
        if (updatedDateShort !== '' && updatedDateLong !== '') {
          updatedDateInfo = `
            <div class="impr__badge impr__badge--date impr__badge--updated" data-tooltip="${i18n[lang].updated}${updatedDateLong}">
              <svg aria-hidden="true" focusable="false" class="ud-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M11 8v5l4.3 2.5.7-1.3-3.5-2V8H11zm10 2V3l-2.6 2.6A9 9 0 1 0 21 12h-2a7 7 0 1 1-2-5l-3 3h7z"/>
              </svg><span>${updatedDateShort}</span>
            </div>
          `;
        }

        courseCustomDiv.innerHTML = `
            <div class="impr__rating-row">
              <span class="impr__star-wrapper">
                <span class="ud-sr-only">Rating: ${rating} out of 5</span>
                ${buildSvgStars(courseId, rating)}
                <span class="ud-heading-sm impr__rating-number">${setDecimal(rating, lang)}</span>
              </span>
              <span class="ud-text-xs impr__rating-count">(${setSeparator(reviews, lang)})</span>
            </div>
            ${myRatingHtml}
          </div>
          <div class="impr__rating-strip" style="background-color:${getColor(colorValue(ratingStripColor))}"></div>
          <div class="impr__stats">
            <div class="impr__badge" data-tooltip="${setSeparator(enrolled, lang)} ${i18n[lang].enrolled}">
              <svg aria-hidden="true" focusable="false" class="ud-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5c0-2.3-4.7-3.5-7-3.5zm8 0h-1c1.2.9 2 2 2 3.5V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z"/>
              </svg><span>${setSeparator(enrolled, lang)}</span>
            </div>
            ${createdDateInfo}
            ${updatedDateInfo}
            ${captionsTag}
          </div>
        `;

        if (reviewButton != null) {
          const reviewButtonContainer = courseCustomDiv.querySelector('.review-button');
          ratingButton.style.display = 'inline';
          reviewButtonContainer.appendChild(ratingButton);
        }

        // Hide language badge if language is English
        if (imageWrapper && localeCode.slice(0, 2) !== 'en') {
          const localeSpan = document.createElement('span');
          localeSpan.classList.add('card__thumb-overlay', 'card__course-locale', 'hover-hide', 'js-removepartial');
          localeSpan.innerHTML = `<span style="margin-right: 3px;vertical-align: bottom;font-size: 14px;line-height: 13px;">${getFlagEmoji(localeCode.slice(-2))}</span>${locale}`;
          imageWrapper.appendChild(localeSpan);
        }

        // Add course runtime from API to thumbnail bottom right
        if (imageWrapper) {
          const runtimeSpan = document.createElement('span');
          runtimeSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-hide', 'js-removepartial');
          runtimeSpan.innerHTML = parseRuntime(runtime, lang);
          imageWrapper.appendChild(runtimeSpan);
        }

      })
      .catch(error => {
        courseCustomDiv.classList.add('card__nodata');
        courseCustomDiv.innerHTML += `<div><b>${error}</b><br>${i18n[lang].notavailable}</div>`;
      });
  });
}

function listenForArchiveToggle() {
  document.querySelectorAll('[data-purpose="toggle-archived"]').forEach(item => {
    item.addEventListener('click', () => {
      setTimeout(() => {
        location.reload();
      }, 500);
    });
  });
}

function setSeparator(int, langCode) {
  return int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, i18n[langCode].separator);
}

function setDecimal(rating, langCode) {
  return rating.toString().replace('.', i18n[langCode].decimal);
}

function parseDate(dateString) {
  if (!dateString) return null;
  const parsedDate = new Date(dateString);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatDateShort(date, langCode) {
  if (!date) return '';
  return date.toLocaleDateString(langCode, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateLong(date, langCode) {
  if (!date) return '';
  return date.toLocaleDateString(langCode, { year: 'numeric', month: 'long', day: 'numeric' });
}

function getFreshnessStatus(updatedDate) {
  if (!updatedDate) return 'red';
  const diffInMs = Date.now() - updatedDate.getTime();
  const ageInDays = Math.max(0, Math.floor(diffInMs / 86400000));
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

function buildSvgStars(courseId, rating) {
  return (`
<svg aria-hidden="true" viewBox="0 0 70 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="impr__svg-stars">
  <mask id="mask-${courseId}" data-purpose="star-rating-mask">
    <rect x="0" y="0" width="${rating * 20}%" height="100%" fill="white"></rect>
  </mask>
  <g fill="#e59819" mask="url(#mask-${courseId})" data-purpose="star-filled">
    <use xlink:href="#icon-rating-star" width="14" height="14" x="0"></use>
    <use xlink:href="#icon-rating-star" width="14" height="14" x="14"></use>
    <use xlink:href="#icon-rating-star" width="14" height="14" x="28"></use>
    <use xlink:href="#icon-rating-star" width="14" height="14" x="42"></use>
    <use xlink:href="#icon-rating-star" width="14" height="14" x="56"></use>
  </g>
  <g fill="transparent" stroke="#e59819" stroke-width="2" data-purpose="star-bordered">
    <use xlink:href="#icon-rating-star" width="12" height="12" x="1" y="1"></use>
    <use xlink:href="#icon-rating-star" width="12" height="12" x="15" y="1"></use>
    <use xlink:href="#icon-rating-star" width="12" height="12" x="29" y="1"></use>
    <use xlink:href="#icon-rating-star" width="12" height="12" x="43" y="1"></use>
    <use xlink:href="#icon-rating-star" width="12" height="12" x="57" y="1"></use>
  </g>
</svg>
  `);
}

function parseRuntime(seconds, langCode) {
  if (seconds % 60 > 29) { seconds += 30; }
  const hours = Math.floor(seconds / 60 / 60);
  const minutes = Math.floor(seconds / 60) - (hours * 60);
  const hoursFormatted = hours > 0 ? hours.toString() + i18n[langCode].hours : '';
  const minutesFormatted = minutes > 0 ? ' ' + minutes.toString() + i18n[langCode].mins : '';
  return hoursFormatted + minutesFormatted;
}

function getRatingFromSvg(svgElement) {
  const percentage = svgElement.querySelector('mask rect').getAttribute('width');
  return parseFloat(percentage) / 100 * 5;
}

function loadTranslations() {
  return {
    'en-us': {
      'overview': 'Course overview',
      'enrolled': 'students',
      'created': 'Created ',
      'updated': 'Last updated ',
      'notavailable': 'Course info not available',
      'separator': ',',
      'decimal': '.',
      'hours': 'h',
      'mins': 'm'
    },
    'de-de': {
      'overview': 'Kursübersicht',
      'enrolled': 'Teilnehmer',
      'created': 'Erstellt ',
      'updated': 'Zuletzt aktualisiert ',
      'notavailable': 'Kursinfo nicht verfügbar',
      'separator': '.',
      'decimal': ',',
      'hours': ' Std',
      'mins': ' Min'
    },
    'es-es': {
      'overview': 'Descripción del curso',
      'enrolled': 'estudiantes',
      'created': 'Creado ',
      'updated': 'Última actualización ',
      'notavailable': 'La información del curso no está disponible',
      'separator': '.',
      'decimal': ',',
      'hours': ' h',
      'mins': ' m'
    },
    'fr-fr': {
      'overview': 'Aperçu du cours',
      'enrolled': 'participants',
      'created': 'Créé le ',
      'updated': 'Dernière mise à jour : ',
      'notavailable': 'Informations sur les cours non disponibles',
      'separator': ' ',
      'decimal': ',',
      'hours': ' h',
      'mins': ' min'
    },
    'it-it': {
      'overview': 'Panoramica del corso',
      'enrolled': 'studenti',
      'created': 'Creato ',
      'updated': 'Ultimo aggiornamento ',
      'notavailable': 'Informazioni sul corso non disponibili',
      'separator': '.',
      'decimal': ',',
      'hours': ' h',
      'mins': ' min'
    },
    'ja-jp': {
      'overview': 'コースの概要',
      'enrolled': '受講生',
      'created': '作成日 ',
      'updated': '最終更新日 ',
      'notavailable': 'コースの情報はありません。',
      'separator': ',',
      'decimal': '.',
      'hours': '時間',
      'mins': '分'
    }
  };
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
