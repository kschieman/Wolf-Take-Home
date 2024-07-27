const { chromium } = require("playwright");

async function sortHackerNewsArticles() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // - create an Article class with all needed information
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
        // - wait for a new set of articles to appear by waiting for the first title in the new list
        await page.waitForSelector('.titleline a');
      } else {
        console.error('Next button not found');
      }
    } catch (error) {
      console.error('Error in clickNextButton: ', error);
    }
  }

  const request = await page.goto("https://news.ycombinator.com/newest");

  if (request.status() === 200) {
    console.log("Successfully navigated to Hacker News");
  } else {
    console.log("Unable to navigate to page. Status code:", request.status() + `
    - Please check connection.`);
    return;
  }
  

  let fetchedArticles = [];

  while (fetchedArticles.length < 100) {
    try {
      // - fetch titles and links
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
        // - push article into list
        fetchedArticles.push(article);
        if (fetchedArticles.length >= 100) {
          // - once we have found 100 articles the loop will break
          break;
        }
      }

      if (fetchedArticles.length < 100) {
        // - only go to next page until we have 100 articles 
        await clickNextButton();
      }

      if (fetchedArticles.length >= 100) {
        console.log("Collected ", fetchedArticles.length + " articles - Closing Browser");
        await browser.close();
        break;
      }
    } catch (error) {
      console.error('Error in while loop: ', error);
      break;
    }
  }

  fetchedArticles = fetchedArticles.slice(0, 100);
  console.log("Fetched articles: ", fetchedArticles);

  // - verify all ages are newest to oldest
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
      console.error("Articles are not ordered from newest to oldest, retrying");
      await sortHackerNewsArticles();
      return;
    } else {
        console.log("All " + fetchedArticles.length + " articles from Hacker News are ordered from newest to oldest");
        return fetchedArticles;
    }
  }
}

(async () => {
  try {
    await sortHackerNewsArticles();
  } catch (error) {
    console.error('Error in sortHackerNewsArticles:', error);
  }
})();