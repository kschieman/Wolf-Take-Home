const { chromium } = require("playwright");

async function sortHackerNewsArticles() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create an Article class with all needed information
  class Article {
    constructor(age, title, link) {
      this.Age = age;
      this.Title = title;
      this.Link = link;
    }
  }

  async function clickNextButton() {
    try {
      const nextButton = page.locator('a.morelink');
      if (await nextButton.isVisible()) {
        console.log("Clicking 'More' button");
        await nextButton.click();
        // Wait for a new set of articles to appear by waiting for the first title in the new list
        await page.waitForSelector('.titleline a');
      } else {
        console.error('Next button not found');
      }
    } catch (error) {
      console.error('Error in clickNextButton:', error);
    }
  }

  await page.goto("https://news.ycombinator.com/newest");
  console.log("Navigated to Hacker News");

  let fetchedArticles = [];

  while (fetchedArticles.length < 100) {
    try {
      // Fetch titles and links
      let titles = await page.locator('.titleline');
      let titleContents = await titles.allTextContents();
      let links = await titles.evaluateAll(anchors => anchors.map(anchor => anchor.querySelector('a').href));
      let ages = await page.locator('.age a').allTextContents();

      for (let j = 0; j < titleContents.length; j++) {
        let article = new Article(
          ages[j],
          titleContents[j],
          links[j]
        );

        fetchedArticles.push(article);
        if (fetchedArticles.length >= 100) {
          break;
        }
      }

      if (fetchedArticles.length < 100) {
        await clickNextButton();
      }

      if (fetchedArticles.length >= 100) {
        console.log("Fetched articles: ", fetchedArticles.length + " - Closing Browser");
        await browser.close();
        break;
      }
    } catch (error) {
      console.error('Error in while loop:', error);
      break;
    }
  }

  fetchedArticles = fetchedArticles.slice(0, 100);
  console.log("Fetched articles:", fetchedArticles);

  // Verify all ages are newest to oldest
  function convertToMinutes(ageString) {
    const [value, unit] = ageString.split(' ');
    const number = parseInt(value, 10);

    if (unit.startsWith('minute')) {
      return number;
    } else if (unit.startsWith('hour')) {
      return number * 60;
    } else {
      return Number.MAX_SAFE_INTEGER;
    }
  }

  for (let i = 0; i < fetchedArticles.length - 1; i++) {
    const currentMinutes = convertToMinutes(fetchedArticles[i].Age);
    const nextMinutes = convertToMinutes(fetchedArticles[i + 1].Age);

    if (currentMinutes > nextMinutes) {
      console.error("Articles are not ordered from newest to oldest");
      return;
    }
  }

  console.log("All " + fetchedArticles.length + " articles from Hacker News are ordered from newest to oldest");
  return fetchedArticles;
}

(async () => {
  try {
    await sortHackerNewsArticles();
  } catch (error) {
    console.error('Error in sortHackerNewsArticles:', error);
  }
})();