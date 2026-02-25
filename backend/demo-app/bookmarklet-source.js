(function() {
  // Get user email
  const userEmail = prompt('Enter your email (e.g., you@pursuit.org):');
  if (!userEmail || !userEmail.includes('@')) {
    return alert('Please enter a valid email');
  }

  const jobUrl = window.location.href;
  const pageTitle = document.title;

  let companyName, positionTitle, jobDescription, location, salary;

  // Try multiple selectors for different job sites
  function extractText(selectors) {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.innerText && el.innerText.trim()) {
          return el.innerText.trim();
        }
      } catch (e) {}
    }
    return null;
  }

  // LinkedIn-specific selectors (updated for 2024+ LinkedIn structure)
  const linkedInSelectors = {
    position: [
      '.top-card-layout__title',
      'h1.topcard__title',
      'h2.topcard__title',
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h1',
      'h1',
    ],
    company: [
      '.topcard__org-name-link',
      '.top-card-layout__card a.ember-view',
      '.jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name a',
      'a.topcard__flavor-row',
    ],
    location: [
      '.topcard__flavor--bullet',
      '.top-card-layout__second-subline',
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__primary-description-without-tagline',
    ],
    description: [
      '.show-more-less-html__markup',
      '.jobs-description__content',
      '.description__text',
    ]
  };

  // Indeed selectors
  const indeedSelectors = {
    position: [
      '.jobsearch-JobInfoHeader-title',
      'h1.jobsearch-JobInfoHeader-title',
    ],
    company: [
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader',
    ],
    location: [
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle',
    ],
    description: [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
    ]
  };

  // Generic selectors (fallback)
  const genericSelectors = {
    position: [
      'h1',
      '[class*="job-title"]',
      '[class*="title"]',
      '[id*="job-title"]',
    ],
    company: [
      '[class*="company"]',
      '[class*="employer"]',
      '[class*="organization"]',
    ],
    location: [
      '[class*="location"]',
      '[class*="city"]',
    ],
    description: [
      '[class*="description"]',
      '[class*="details"]',
      'article',
    ]
  };

  // Detect site and use appropriate selectors
  const hostname = window.location.hostname.toLowerCase();
  let selectors;

  if (hostname.includes('linkedin.com')) {
    selectors = linkedInSelectors;
  } else if (hostname.includes('indeed.com')) {
    selectors = indeedSelectors;
  } else {
    selectors = genericSelectors;
  }

  // Extract job information
  positionTitle = extractText(selectors.position);
  companyName = extractText(selectors.company);
  location = extractText(selectors.location);

  const descEl = extractText(selectors.description);
  jobDescription = descEl ? descEl.substring(0, 2000) : '';

  // Fallback: try to extract from page title
  if (!positionTitle || !companyName) {
    // LinkedIn format: "Position at Company | LinkedIn"
    // Indeed format: "Position - Company - Location"
    const titleParts = pageTitle.split(/[-|]/);
    if (!positionTitle && titleParts[0]) {
      positionTitle = titleParts[0].trim();
    }
    if (!companyName && titleParts[1]) {
      companyName = titleParts[1].replace(/\s*(LinkedIn|Indeed|Glassdoor)\s*/gi, '').trim();
    }
  }

  // Final validation
  if (!positionTitle) positionTitle = 'Position from ' + hostname;
  if (!companyName) companyName = 'Company from ' + hostname;

  // Prepare data
  const jobData = {
    user_email: userEmail,
    job_url: jobUrl,
    company_name: companyName,
    position_title: positionTitle,
    job_description: jobDescription,
    location: location || '',
    salary_range: salary || '',
    captured_at: new Date().toISOString()
  };

  // Send to API
  fetch('http://localhost:3001/api/capture-job', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(jobData)
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success' || data.status === 'duplicate') {
      alert('✅ Job saved to Pathfinder!\n\nCompany: ' + companyName + '\nPosition: ' + positionTitle + '\n\nYou can now apply for this job.\nThe application will be automatically tracked when the confirmation email arrives.');
    } else {
      alert('❌ Error saving job: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error('Pathfinder error:', err);
    alert('❌ Connection error. Make sure Pathfinder backend is running on localhost:3001');
  });
})();
